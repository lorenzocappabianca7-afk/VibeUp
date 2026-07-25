/**
 * Blocking first-paint CSS — must live in <head> before any stylesheet link.
 *
 * Layering (critical):
 *   critical paint  z-index 9990  → black safety net UNDER the splash
 *   splash overlay  z-index 10000 → logo + tagline visible on top
 * Previously critical was 99998 (> splash) and fully hid the logo.
 *
 * Logo size is also inlined here so a 640×640 <img> cannot paint full-bleed
 * (looks like a white/bright flash) before the splash stylesheet hydrates.
 */
export const CRITICAL_PAINT_CSS = `
html,body{
  background:#000000!important;
  color-scheme:dark!important;
}
#vibeup-critical-paint{
  position:fixed!important;
  inset:0!important;
  z-index:9990!important;
  background:#000000!important;
  pointer-events:none!important;
}
.vibeup-splash{
  position:fixed!important;
  inset:0!important;
  z-index:10000!important;
  background:#000000!important;
  pointer-events:none!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
}
.vibeup-splash__logo{
  display:block!important;
  width:7rem!important;
  max-width:7rem!important;
  height:auto!important;
  aspect-ratio:1/1!important;
  object-fit:contain!important;
  opacity:1!important;
}
@media (max-width:380px){
  .vibeup-splash__logo{width:6.25rem!important;max-width:6.25rem!important}
}
`.replace(/\s+/g, " ").trim();

/**
 * Synchronous head script — runs before first paint (same pattern as next-themes FOUC fix).
 */
export const CRITICAL_PAINT_SCRIPT = `(function(){try{var d=document.documentElement,b=document.body;d.style.backgroundColor="#000000";d.style.colorScheme="dark";if(b){b.style.backgroundColor="#000000";}}catch(e){}})();`;

export const CRITICAL_PAINT_ID = "vibeup-critical-paint";

/** Public boot logo — small enough for preload; avoids 250KB data-URI delaying first paint. */
export const SPLASH_LOGO_SRC = "/vibeup-splash-logo-boot.png";

/** Inline styles for the server black shell — UNDER the splash (z-index 9990). */
export const CRITICAL_PAINT_INLINE_STYLE = {
  position: "fixed" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 9990,
  backgroundColor: "#000000",
  pointerEvents: "none" as const,
};
