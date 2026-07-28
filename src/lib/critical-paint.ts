import {
  LOGO_BOUNCE_MS,
  SPLASH_EXIT_MS,
  SPLASH_STORAGE_KEY,
} from "@/lib/splash";

/**
 * Blocking first-paint CSS — must live in <head> before any stylesheet link.
 *
 * Layering (bookmark / PWA cold start):
 *   critical paint  z-index 9990 → black safety net
 *   splash overlay  z-index 10000 → logo + tagline (solid black, never fades)
 *   app shell       z-index 1     → Explore (hidden until vibeup-splash-skip)
 *
 * Critical paint is demoted to z-index:-1 after splash — never display:none
 * (that exposed the browser white canvas for a frame).
 */
export const CRITICAL_PAINT_CSS = `
html,body{
  background:#000000!important;
  background-color:#000000!important;
  color-scheme:dark!important;
}
html:not(.vibeup-splash-skip) #vibeup-app-shell{
  visibility:hidden!important;
}
html.vibeup-splash-skip .vibeup-splash{
  display:none!important;
  visibility:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
}
html.vibeup-splash-skip #vibeup-critical-paint{
  z-index:-1!important;
  pointer-events:none!important;
}
#vibeup-critical-paint{
  position:fixed!important;
  inset:0!important;
  z-index:9990!important;
  background:#000000!important;
  background-color:#000000!important;
  pointer-events:none!important;
}
.vibeup-splash{
  position:fixed!important;
  inset:0!important;
  z-index:10000!important;
  background:#000000!important;
  background-color:#000000!important;
  pointer-events:auto!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  opacity:1!important;
  transition:none!important;
}
.vibeup-splash--exit{
  /* Keep the black plate solid — only the stage fades (avoids white compositing) */
  opacity:1!important;
  pointer-events:none!important;
  transition:none!important;
}
.vibeup-splash--exit .vibeup-splash__stage{
  opacity:0!important;
  transition:opacity ${SPLASH_EXIT_MS}ms cubic-bezier(0.4,0,0.2,1)!important;
}
.vibeup-splash__stage{
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  align-items:center;
  margin-bottom:14vh;
  opacity:1;
}
.vibeup-splash__logo{
  display:block!important;
  width:7rem!important;
  max-width:7rem!important;
  height:auto!important;
  aspect-ratio:1/1!important;
  object-fit:contain!important;
  object-position:center!important;
  opacity:1!important;
  transform:none;
  transform-origin:center center;
  -webkit-user-drag:none;
  animation:vibeup-splash-bounce ${LOGO_BOUNCE_MS}ms cubic-bezier(0.16,1,0.3,1) both;
}
.vibeup-splash__logo--settled{
  animation:none!important;
  transform:none!important;
  filter:none!important;
  will-change:auto!important;
}
.vibeup-splash__tagline{
  margin:1rem 0 0;
  min-height:1.15em;
  padding:0 0.5rem;
  font-family:var(--font-brand),system-ui,sans-serif;
  font-size:1.75rem;
  font-weight:700;
  letter-spacing:-0.025em;
  line-height:1.15;
  color:#fff;
  text-align:center;
  white-space:nowrap;
  opacity:0;
  transform:translate3d(0,10px,0);
}
.vibeup-splash__tagline--in{
  animation:vibeup-splash-tagline-in 640ms cubic-bezier(0.16,1,0.3,1) both;
}
@keyframes vibeup-splash-bounce{
  0%{transform:translate3d(0,0,0) scale(1)}
  35%{transform:translate3d(0,0,0) scale(1.06)}
  55%{transform:translate3d(0,0,0) scale(0.98)}
  75%{transform:translate3d(0,0,0) scale(1.02)}
  100%{transform:translate3d(0,0,0) scale(1)}
}
@keyframes vibeup-splash-tagline-in{
  from{opacity:0;transform:translate3d(0,10px,0)}
  to{opacity:1;transform:translate3d(0,0,0)}
}
@media (prefers-reduced-motion:reduce){
  .vibeup-splash__logo,.vibeup-splash__tagline--in{
    animation:none!important;
    opacity:1!important;
    transform:none!important;
  }
  .vibeup-splash--exit .vibeup-splash__stage{transition:none!important}
}
@media (max-width:380px){
  .vibeup-splash__logo{width:6.25rem!important;max-width:6.25rem!important}
}
#vibeup-app-shell{
  position:relative;
  z-index:1;
  min-height:100dvh;
  background-color:#0f1115;
}
`.replace(/\s+/g, " ").trim();

/**
 * Synchronous boot script — sets black canvas immediately and injects a
 * blocking <style> at the top of <head> when possible (Next often relocates
 * layout <style> tags after the main CSS chunk, which causes a white flash).
 */
export const CRITICAL_PAINT_SCRIPT = `(function(){try{var d=document.documentElement;d.style.setProperty("background-color","#000000","important");d.style.setProperty("color-scheme","dark","important");d.style.backgroundColor="#000000";d.style.colorScheme="dark";if(sessionStorage.getItem(${JSON.stringify(SPLASH_STORAGE_KEY)})==="1"){d.classList.add("vibeup-splash-skip");}var b=document.body;if(b){b.style.setProperty("background-color","#000000","important");b.style.backgroundColor="#000000";}if(!document.getElementById("vibeup-boot-style")){var s=document.createElement("style");s.id="vibeup-boot-style";s.textContent=${JSON.stringify(CRITICAL_PAINT_CSS)};var h=document.head;if(h){h.insertBefore(s,h.firstChild);}else{d.appendChild(s);}}}catch(e){}})();`;

export const CRITICAL_PAINT_ID = "vibeup-critical-paint";

/** Splash mark (preloaded in layout). Kept as the approved brand asset. */
export const SPLASH_LOGO_SRC = "/vibeup-splash-logo-boot.png";

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

/** Drop the black net behind the app — never remove (avoids white canvas gap). */
export function demoteCriticalPaint() {
  if (typeof document === "undefined") return;
  const el = document.getElementById(CRITICAL_PAINT_ID);
  if (!el) return;
  el.style.setProperty("z-index", "-1", "important");
  el.style.setProperty("pointer-events", "none", "important");
  el.style.setProperty("background-color", "#000000", "important");
}
