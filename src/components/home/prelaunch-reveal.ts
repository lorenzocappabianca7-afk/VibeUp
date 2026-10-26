/** One observer for landing blocks below the first screen. Hidden only after this runs. */
export function startLandingReveal(root: HTMLElement): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  if (typeof IntersectionObserver === "undefined") return () => {};

  const groups = [...root.querySelectorAll<HTMLElement>("[data-vu-reveal]")];
  let observer: IntersectionObserver;
  try {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { root, threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
  } catch {
    return () => {};
  }

  const rootRect = root.getBoundingClientRect();
  const limit = rootRect.bottom - rootRect.height * 0.1;
  for (const group of groups) {
    const rect = group.getBoundingClientRect();
    const visible = Math.min(rect.bottom, limit) - Math.max(rect.top, rootRect.top);
    if (rect.height <= 0 || visible >= rect.height * 0.15) {
      group.classList.add("is-in", "vu-now");
    } else {
      observer.observe(group);
    }
  }

  document.documentElement.classList.add("vu-reveal-on");

  return () => {
    observer.disconnect();
    document.documentElement.classList.remove("vu-reveal-on");
  };
}
