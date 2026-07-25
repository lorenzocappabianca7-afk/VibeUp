/**
 * Blocking first-paint CSS — must live in <head> before any stylesheet link.
 * Also covers .vibeup-splash so the overlay is black even before its scoped <style> runs.
 */
export const CRITICAL_PAINT_CSS = `
html,body{
  background:#000000!important;
  color-scheme:dark!important;
}
#vibeup-critical-paint{
  position:fixed!important;
  inset:0!important;
  z-index:99998!important;
  background:#000000!important;
  pointer-events:none!important;
}
.vibeup-splash{
  position:fixed!important;
  inset:0!important;
  z-index:10000!important;
  background:#000000!important;
  pointer-events:none!important;
}
`.replace(/\s+/g, " ").trim();

/**
 * Synchronous head script — runs before first paint (same pattern as next-themes FOUC fix).
 * Does not wait for CSS files or React.
 */
export const CRITICAL_PAINT_SCRIPT = `(function(){try{var d=document.documentElement;d.style.backgroundColor="#000000";d.style.colorScheme="dark";}catch(e){}})();`;

export const CRITICAL_PAINT_ID = "vibeup-critical-paint";

/** Inline styles for the server black shell — zero CSS dependency. */
export const CRITICAL_PAINT_INLINE_STYLE = {
  position: "fixed" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 99998,
  backgroundColor: "#000000",
  pointerEvents: "none" as const,
};
