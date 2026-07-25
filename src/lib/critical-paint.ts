/**
 * Blocking first-paint CSS — must live in <head> before any stylesheet.
 * Prevents the browser's default white canvas from flashing on cold start / PWA launch.
 */
export const CRITICAL_PAINT_CSS = `
html,body{
  background:#000000!important;
  color-scheme:dark;
}
#vibeup-critical-paint{
  position:fixed;
  inset:0;
  z-index:99998;
  background:#000000;
  pointer-events:none;
}
`.replace(/\s+/g, " ").trim();

export const CRITICAL_PAINT_ID = "vibeup-critical-paint";
