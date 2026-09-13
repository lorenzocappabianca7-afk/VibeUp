"use client";

/** Reset window scroll after a demo route change. iOS often restores it after paint. */
export function scrollDemoPageToTop() {
  if (typeof window === "undefined") return;

  const reset = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.getElementById("vibeup-app-shell")?.scrollTo(0, 0);
  };

  reset();
  requestAnimationFrame(reset);
  window.setTimeout(reset, 0);
  window.setTimeout(reset, 80);
}
