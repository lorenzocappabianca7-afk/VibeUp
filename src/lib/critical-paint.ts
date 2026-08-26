import {
  SPLASH_EXIT_MS,
  SPLASH_LOGO_DISPLAY_PX,
  SPLASH_LOGO_HALF_PX,
  SPLASH_LOGO_SRC,
  SPLASH_STAGE_LIFT_VH,
  SPLASH_STORAGE_KEY,
  TAGLINE_DELAY_MS,
  TAGLINE_FADE_MS,
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
  display:block!important;
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
  position:absolute;
  top:calc(50% - ${SPLASH_STAGE_LIFT_VH}vh - ${SPLASH_LOGO_HALF_PX}px);
  left:calc(50% - ${SPLASH_LOGO_HALF_PX}px);
  width:${SPLASH_LOGO_DISPLAY_PX}px;
  height:${SPLASH_LOGO_DISPLAY_PX}px;
  margin:0;
  box-sizing:border-box;
  overflow:visible;
  opacity:1;
}
.vibeup-splash__logo{
  display:block!important;
  box-sizing:border-box!important;
  width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  min-width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  min-height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  max-width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  max-height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  flex-shrink:0!important;
  overflow:hidden!important;
  background-image:url(${SPLASH_LOGO_SRC})!important;
  background-repeat:no-repeat!important;
  background-position:center!important;
  background-size:${SPLASH_LOGO_DISPLAY_PX}px ${SPLASH_LOGO_DISPLAY_PX}px!important;
  opacity:1!important;
  transform:none!important;
  animation:none!important;
  transition:none!important;
}
.vibeup-splash__tagline{
  position:absolute;
  top:100%;
  left:50%;
  width:max-content;
  margin:1.15rem 0 0;
  padding:0 0.25rem;
  max-width:calc(100vw - 0.75rem);
  font-family:var(--font-brand),system-ui,sans-serif;
  font-size:clamp(1.2rem,5.8vw,2.55rem);
  font-weight:700;
  letter-spacing:-0.055em;
  line-height:1.28;
  white-space:nowrap;
  color:#fff;
  text-align:center;
  opacity:0;
  transform:translateX(-50%);
  animation:vibeup-splash-tagline-in ${TAGLINE_FADE_MS}ms ease ${TAGLINE_DELAY_MS}ms forwards;
}
.vibeup-splash--tagline .vibeup-splash__tagline{
  opacity:1;
  animation:none;
}
@keyframes vibeup-splash-tagline-in{
  from{opacity:0}
  to{opacity:1}
}
@media (prefers-reduced-motion:reduce){
  .vibeup-splash__tagline{animation:none;opacity:1}
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
export const CRITICAL_PAINT_SCRIPT = `(function(){try{var d=document.documentElement;d.style.setProperty("background-color","#000000","important");d.style.setProperty("color-scheme","dark","important");d.style.backgroundColor="#000000";d.style.colorScheme="dark";var force=false;try{force=/(?:^|[?&])splash=force(?:&|$)/.test(location.search);}catch(e){}var standalone=false;try{standalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;}catch(e){}if(!force&&!standalone&&sessionStorage.getItem(${JSON.stringify(SPLASH_STORAGE_KEY)})==="1"){d.classList.add("vibeup-splash-skip");d.classList.add("vibeup-app-ready");}var b=document.body;if(b){b.style.setProperty("background-color","#000000","important");b.style.backgroundColor="#000000";}if(!document.getElementById("vibeup-boot-style")){var s=document.createElement("style");s.id="vibeup-boot-style";s.textContent=${JSON.stringify(CRITICAL_PAINT_CSS)};var h=document.head;if(h){h.insertBefore(s,h.firstChild);}else{d.appendChild(s);}}}catch(e){}})();`;

export const CRITICAL_PAINT_ID = "vibeup-critical-paint";

export { SPLASH_LOGO_SRC } from "@/lib/splash";

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
