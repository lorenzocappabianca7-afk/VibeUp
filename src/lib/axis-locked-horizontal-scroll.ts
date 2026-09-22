/**
 * Native overflow-x scrollers with overflow-y:hidden (or auto) become 2D
 * scrollports. On iOS, a finger that starts on that element is then stuck:
 * vertical pan is claimed by a box that cannot scroll Y, so the page freezes.
 *
 * Fix: CSS touch-action:pan-y (page scroll stays native) + this helper, which
 * preventDefault's ONLY after the gesture locks to horizontal.
 *
 * preventDefault also kills native momentum, so we replay an iOS-like coast
 * after touchend — same fluid follow-through as vertical page scroll.
 */

const AXIS_LOCK_PX = 10;
const VELOCITY_WINDOW_MS = 100;
const MIN_MOMENTUM_PX_PER_MS = 0.045;
const MAX_MOMENTUM_PX_PER_MS = 2.8;
/** Exponential decay — similar coast length to iOS vertical scroll. */
const MOMENTUM_DECEL = 0.0024;
/**
 * Photo pages commit before the halfway mark. A short drag past this
 * fraction of the slide, or a flick, moves to the next photo.
 */
const PAGE_COMMIT_FRACTION = 0.2;
const PAGE_FLICK_PX_PER_MS = 0.28;

export function nextCarouselPage(params: {
  scrollLeft: number;
  startScrollLeft: number;
  width: number;
  velocity: number;
  maxScrollLeft: number;
}): number {
  const width = params.width || 1;
  const maxPage = Math.max(0, Math.round(params.maxScrollLeft / width));
  const origin = Math.max(
    0,
    Math.min(maxPage, Math.round(params.startScrollLeft / width)),
  );
  const fraction = (params.scrollLeft - origin * width) / width;
  let page = origin;
  if (fraction >= PAGE_COMMIT_FRACTION || params.velocity > PAGE_FLICK_PX_PER_MS) {
    page = origin + 1;
  } else if (
    fraction <= -PAGE_COMMIT_FRACTION ||
    params.velocity < -PAGE_FLICK_PX_PER_MS
  ) {
    page = origin - 1;
  }
  return Math.max(0, Math.min(maxPage, page));
}

export type HorizontalScrollAxisOptions = {
  /** Snap to the scroller viewport width on touchend (photo carousels). */
  snapToPage?: boolean;
};

export function attachAxisLockedHorizontalScroll(
  element: HTMLElement,
  options: HorizontalScrollAxisOptions = {},
) {
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let axis: "x" | "y" | null = null;
  let didSwipe = false;
  let snapTypeBeforeDrag = "";
  let samples: { t: number; x: number }[] = [];
  let momentumRaf = 0;
  let snapRestoreTimer = 0;

  function maxScrollLeft() {
    return element.scrollWidth - element.clientWidth;
  }

  function stopMomentum() {
    if (!momentumRaf) return;
    cancelAnimationFrame(momentumRaf);
    momentumRaf = 0;
  }

  function recordSample(x: number) {
    const t = performance.now();
    samples.push({ t, x });
    const cutoff = t - VELOCITY_WINDOW_MS;
    if (samples.length > 2 && samples[0].t < cutoff) {
      samples = samples.filter((sample) => sample.t >= cutoff);
    }
  }

  function releaseVelocity() {
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = last.t - first.t;
    if (dt < 8) return 0;
    const raw = (first.x - last.x) / dt;
    if (!Number.isFinite(raw)) return 0;
    return Math.max(
      -MAX_MOMENTUM_PX_PER_MS,
      Math.min(MAX_MOMENTUM_PX_PER_MS, raw),
    );
  }

  function startMomentum(velocity: number) {
    if (Math.abs(velocity) < MIN_MOMENTUM_PX_PER_MS) return;

    let v = velocity;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;
      v *= Math.exp(-MOMENTUM_DECEL * dt);

      const max = maxScrollLeft();
      const next = element.scrollLeft + v * dt;

      if (next <= 0) {
        element.scrollLeft = 0;
        momentumRaf = 0;
        return;
      }
      if (next >= max) {
        element.scrollLeft = max;
        momentumRaf = 0;
        return;
      }

      element.scrollLeft = next;

      if (Math.abs(v) > MIN_MOMENTUM_PX_PER_MS) {
        momentumRaf = requestAnimationFrame(frame);
        return;
      }
      momentumRaf = 0;
    };

    momentumRaf = requestAnimationFrame(frame);
  }

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    stopMomentum();
    window.clearTimeout(snapRestoreTimer);
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    startScrollLeft = element.scrollLeft;
    axis = null;
    didSwipe = false;
    samples = [];
    recordSample(startX);
  }

  function onTouchMove(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    const x = event.touches[0].clientX;
    const dx = x - startX;
    const dy = event.touches[0].clientY - startY;

    if (axis === null) {
      if (dx * dx + dy * dy < AXIS_LOCK_PX * AXIS_LOCK_PX) return;
      axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis === "x") {
        snapTypeBeforeDrag = element.style.scrollSnapType;
        element.style.scrollSnapType = "none";
      }
    }

    if (axis !== "x") return;

    const max = maxScrollLeft();
    if (max <= 1) return;

    event.preventDefault();
    event.stopPropagation();
    didSwipe = true;
    recordSample(x);
    element.scrollLeft = Math.max(0, Math.min(max, startScrollLeft - dx));
  }

  function restoreSnap() {
    element.style.scrollSnapType = snapTypeBeforeDrag;
  }

  function onTouchEnd() {
    if (axis === "x") {
      if (options.snapToPage) {
        const width = element.clientWidth || 1;
        const page = nextCarouselPage({
          scrollLeft: element.scrollLeft,
          startScrollLeft,
          width,
          velocity: releaseVelocity(),
          maxScrollLeft: maxScrollLeft(),
        });
        element.scrollTo({ left: page * width, behavior: "smooth" });
        const finish = () => {
          element.removeEventListener("scrollend", finish);
          restoreSnap();
        };
        element.addEventListener("scrollend", finish);
        snapRestoreTimer = window.setTimeout(finish, 480);
      } else {
        restoreSnap();
        startMomentum(releaseVelocity());
      }
    }
    axis = null;
    samples = [];
  }

  function onClickCapture(event: MouseEvent) {
    if (!didSwipe) return;
    event.preventDefault();
    event.stopPropagation();
    didSwipe = false;
  }

  element.addEventListener("touchstart", onTouchStart, { passive: true });
  element.addEventListener("touchmove", onTouchMove, { passive: false });
  element.addEventListener("touchend", onTouchEnd);
  element.addEventListener("touchcancel", onTouchEnd);
  element.addEventListener("click", onClickCapture, true);

  return () => {
    stopMomentum();
    window.clearTimeout(snapRestoreTimer);
    element.removeEventListener("touchstart", onTouchStart);
    element.removeEventListener("touchmove", onTouchMove);
    element.removeEventListener("touchend", onTouchEnd);
    element.removeEventListener("touchcancel", onTouchEnd);
    element.removeEventListener("click", onClickCapture, true);
    element.style.scrollSnapType = snapTypeBeforeDrag;
  };
}
