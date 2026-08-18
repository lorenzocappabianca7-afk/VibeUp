/**
 * Native overflow-x scrollers with overflow-y:hidden (or auto) become 2D
 * scrollports. On iOS, a finger that starts on that element is then stuck:
 * vertical pan is claimed by a box that cannot scroll Y, so the page freezes.
 *
 * Fix: CSS touch-action:pan-y (page scroll stays native) + this helper, which
 * preventDefault's ONLY after the gesture locks to horizontal.
 */

const AXIS_LOCK_PX = 10;

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

  function maxScrollLeft() {
    return element.scrollWidth - element.clientWidth;
  }

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    startScrollLeft = element.scrollLeft;
    axis = null;
    didSwipe = false;
  }

  function onTouchMove(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - startX;
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
    element.scrollLeft = Math.max(0, Math.min(max, startScrollLeft - dx));
  }

  function onTouchEnd() {
    if (axis === "x") {
      element.style.scrollSnapType = snapTypeBeforeDrag;
      if (options.snapToPage) {
        const width = element.clientWidth || 1;
        const next = Math.round(element.scrollLeft / width);
        element.scrollTo({ left: next * width, behavior: "smooth" });
      }
    }
    axis = null;
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
    element.removeEventListener("touchstart", onTouchStart);
    element.removeEventListener("touchmove", onTouchMove);
    element.removeEventListener("touchend", onTouchEnd);
    element.removeEventListener("touchcancel", onTouchEnd);
    element.removeEventListener("click", onClickCapture, true);
    element.style.scrollSnapType = snapTypeBeforeDrag;
  };
}
