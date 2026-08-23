import {
  LOGO_BOUNCE_MS,
  SPLASH_EXIT_MS,
  SPLASH_LOGO_DISPLAY_PX,
  SPLASH_STAGE_LIFT_VH,
  SPLASH_STORAGE_KEY,
} from "@/lib/splash";

/**
 * Blocking first-paint CSS for Home Screen / PWA cold start.
 *
 * Classes (must stay separate — combining them caused a white flash):
 *   vibeup-splash-skip   → hide React splash overlay
 *   vibeup-app-ready     → show #vibeup-app-shell (Explore)
 *   vibeup-paint-demoted → drop black safety net behind the app
 *
 * Reveal order on first launch:
 *   1) splash unmounts (black critical paint still covers at z-index 9990)
 *   2) vibeup-app-ready  (Explore paints UNDER the black plate)
 *   3) vibeup-paint-demoted + demoteCriticalPaint() (uncover Explore)
 */
export const CRITICAL_PAINT_CSS = `
html,body{
  background:#000000!important;
  background-color:#000000!important;
  color-scheme:dark!important;
}
html:not(.vibeup-app-ready) #vibeup-app-shell{
  visibility:hidden!important;
}
html.vibeup-splash-skip .vibeup-splash{
  display:none!important;
  visibility:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
}
html.vibeup-paint-demoted #vibeup-critical-paint{
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
  margin-bottom:${SPLASH_STAGE_LIFT_VH}vh;
  opacity:1;
}
.vibeup-splash__logo{
  display:block!important;
  width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  min-width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  min-height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  max-width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  max-height:${SPLASH_LOGO_DISPLAY_PX}px!important;
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
  margin:1.15rem 0 0;
  min-height:1.5em;
  max-width:calc(100vw - 0.75rem);
  padding:0 0.25rem;
  font-family:var(--font-brand),system-ui,sans-serif;
  font-size:clamp(1.55rem,7.6vw,3.4rem);
  font-weight:700;
  letter-spacing:-0.05em;
  line-height:1.28;
  white-space:nowrap;
  color:#fff;
  text-align:center;
  opacity:0;
  transform:translate3d(0,10px,0);
}
.vibeup-splash__eighteen{
  font-size:1.08em;
  letter-spacing:-0.06em;
}
.vibeup-splash__ordinal{
  font-size:0.38em;
  font-weight:700;
  line-height:1;
  letter-spacing:0;
  vertical-align:super;
  position:relative;
  top:-0.12em;
  margin-left:0.02em;
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
#vibeup-app-shell{
  position:relative;
  z-index:1;
  min-height:100dvh;
  background-color:#000000;
}
`.replace(/\s+/g, " ").trim();

/**
 * Boot script: black canvas + restore completed-splash state for return launches.
 *
 * Session skip sets splash-skip + app-ready only. Critical paint stays on top
 * until React demotes it after Explore has painted — demoting in <head> caused
 * a white Home Screen frame before body existed.
 */
export const CRITICAL_PAINT_SCRIPT = `(function(){try{var d=document.documentElement;d.style.setProperty("background-color","#000000","important");d.style.setProperty("color-scheme","dark","important");d.style.backgroundColor="#000000";d.style.colorScheme="dark";if(sessionStorage.getItem(${JSON.stringify(SPLASH_STORAGE_KEY)})==="1"){d.classList.add("vibeup-splash-skip");d.classList.add("vibeup-app-ready");}var b=document.body;if(b){b.style.setProperty("background-color","#000000","important");b.style.backgroundColor="#000000";}if(!document.getElementById("vibeup-boot-style")){var s=document.createElement("style");s.id="vibeup-boot-style";s.textContent=${JSON.stringify(CRITICAL_PAINT_CSS)};var h=document.head;if(h){h.insertBefore(s,h.firstChild);}else{d.appendChild(s);}}}catch(e){}})();`;

export const CRITICAL_PAINT_ID = "vibeup-critical-paint";

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

export function demoteCriticalPaint() {
  if (typeof document === "undefined") return;
  const el = document.getElementById(CRITICAL_PAINT_ID);
  if (!el) return;
  el.style.setProperty("z-index", "-1", "important");
  el.style.setProperty("pointer-events", "none", "important");
  el.style.setProperty("background-color", "#000000", "important");
  document.documentElement.classList.add("vibeup-paint-demoted");
}

export function revealAppShell() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("vibeup-app-ready");
}

export function markSplashOverlaySkip() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("vibeup-splash-skip");
}
