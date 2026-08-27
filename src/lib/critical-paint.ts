import {
  SPLASH_EXIT_MS,
  SPLASH_FONT_SRC,
  SPLASH_LOGO_DISPLAY_PX,
  SPLASH_LOGO_FILE,
  SPLASH_LOGO_HALF_PX,
  SPLASH_STAGE_LIFT_VH,
  SPLASH_STORAGE_KEY,
} from "@/lib/splash";

/**
 * Blocking first-paint CSS for Home Screen / PWA cold start.
 *
 * color-scheme MUST be `only dark` (not just `dark`). iOS Light Mode treats
 * `dark` as optional and paints a white WKWebView canvas between the native
 * apple-touch-startup-image and the HTML splash.
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
@font-face{
  font-family:VibeUpSplash;
  src:url(${SPLASH_FONT_SRC}) format("woff2");
  font-weight:700;
  font-style:normal;
  font-display:optional;
}
html,body{
  background:#000000!important;
  background-color:#000000!important;
  color-scheme:only dark!important;
}
html:not(.vibeup-app-ready) #vibeup-app-shell{
  visibility:hidden!important;
}
html.vibeup-splash-skip #vibeup-boot-splash{
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
#vibeup-boot-splash{
  position:fixed!important;
  inset:0!important;
  z-index:10000!important;
  isolation:isolate!important;
  background:#000000!important;
  background-color:#000000!important;
  pointer-events:auto!important;
  display:block!important;
  opacity:1!important;
  margin:0!important;
  padding:0!important;
  transform:none!important;
  animation:none!important;
  filter:none!important;
  transition:none!important;
}
#vibeup-boot-splash.vibeup-splash--exit{
  opacity:1!important;
  pointer-events:none!important;
  transition:none!important;
}
#vibeup-boot-splash.vibeup-splash--exit .vibeup-splash__stage{
  opacity:0!important;
  transition:opacity ${SPLASH_EXIT_MS}ms cubic-bezier(0.4,0,0.2,1)!important;
}
#vibeup-boot-splash .vibeup-splash__stage{
  position:absolute!important;
  top:calc(50% - ${SPLASH_STAGE_LIFT_VH}vh - ${SPLASH_LOGO_HALF_PX}px)!important;
  left:calc(50% - ${SPLASH_LOGO_HALF_PX}px)!important;
  width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  margin:0!important;
  padding:0!important;
  box-sizing:border-box!important;
  overflow:visible!important;
  transform:none!important;
  animation:none!important;
}
#vibeup-boot-splash .vibeup-splash__logo{
  display:block!important;
  box-sizing:border-box!important;
  width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  min-width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  min-height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  max-width:${SPLASH_LOGO_DISPLAY_PX}px!important;
  max-height:${SPLASH_LOGO_DISPLAY_PX}px!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  flex-shrink:0!important;
  overflow:hidden!important;
  background-image:url(${SPLASH_LOGO_FILE});
  background-repeat:no-repeat!important;
  background-position:center!important;
  background-size:${SPLASH_LOGO_DISPLAY_PX}px ${SPLASH_LOGO_DISPLAY_PX}px!important;
  opacity:1!important;
  transform:none!important;
  animation:none!important;
  transition:none!important;
}
#vibeup-boot-splash .vibeup-splash__tagline{
  position:absolute;
  top:100%;
  left:50%;
  display:block;
  width:max-content;
  margin:1.15rem 0 0;
  padding:0 0.25rem;
  max-width:calc(100vw - 0.75rem);
  font-family:VibeUpSplash,ui-sans-serif,system-ui,sans-serif;
  font-size:clamp(1.2rem,5.8vw,2.55rem);
  font-weight:700;
  letter-spacing:-0.055em;
  line-height:1.28;
  white-space:nowrap;
  color:#fff;
  text-align:center;
  opacity:1;
  transform:translateX(-50%);
  animation:none;
}
@media (prefers-reduced-motion:reduce){
  #vibeup-boot-splash.vibeup-splash--exit .vibeup-splash__stage{transition:none!important}
}
#vibeup-app-shell{
  position:relative;
  z-index:1;
  min-height:100dvh;
  background-color:#000000;
}
`.replace(/\s+/g, " ").trim();

export const APP_CSS_READY_CLASS = "vibeup-app-css-ready";

/**
 * Tiny IIFE for the earliest HTML slot (first child of `<html>`). Next hoists
 * a ~100KB CSS `<link>` that is render-blocking — iOS then dismisses the native
 * Home Screen launch image onto an empty canvas (logo vanishes) until that file
 * arrives. Switching those sheets to media=print unblocks HTML splash paint.
 *
 * If `link.sheet` is already set, force media=all (CSS is cached / already
 * applied). Never leave a loaded sheet stuck on print.
 */
export const UNBLOCK_APP_CSS_SCRIPT = `(function(){try{var d=document.documentElement;d.style.setProperty("background-color","#000000","important");d.style.setProperty("color-scheme","only dark","important");d.style.backgroundColor="#000000";d.style.colorScheme="only dark";function isStandalone(){try{if(window.matchMedia("(display-mode: standalone)").matches)return true;if(window.matchMedia("(display-mode: fullscreen)").matches)return true;if(window.matchMedia("(display-mode: minimal-ui)").matches)return true;}catch(e){}try{if(window.navigator.standalone===true)return true;}catch(e){}return false;}function unblock(l){if(!l||l.getAttribute("data-vibeup-async")==="1")return;var href=l.getAttribute("href")||"";if(href.indexOf("boot-paint")!==-1)return;l.setAttribute("data-vibeup-async","1");var loaded=false;try{loaded=!!l.sheet;}catch(e){}if(loaded){l.media="all";return;}l.media="print";l.addEventListener("load",function(){l.media="all";},{once:true});}function scan(){var nodes=document.querySelectorAll('link[rel="stylesheet"]');for(var i=0;i<nodes.length;i++)unblock(nodes[i]);}scan();if(!window.__vibeupCssWatch){window.__vibeupCssWatch=1;try{new MutationObserver(scan).observe(d,{childList:true,subtree:true});}catch(e){}}window.__vibeupStandalone=isStandalone();}catch(e){}})();`;

/**
 * Boot script: black canvas + restore completed-splash state for return launches.
 *
 * Session skip sets splash-skip + app-ready only. Critical paint stays on top
 * until React demotes it after Explore has painted — demoting in <head> caused
 * a white Home Screen frame before body existed.
 *
 * Re-runs CSS unblock (idempotent) in case this script is the first to see
 * Next's stylesheet link after a reorder.
 */
export const CRITICAL_PAINT_SCRIPT = `${UNBLOCK_APP_CSS_SCRIPT}(function(){try{var d=document.documentElement;var force=false;try{force=/(?:^|[?&])splash=force(?:&|$)/.test(location.search);}catch(e){}var standalone=window.__vibeupStandalone===true;if(!standalone){try{standalone=window.matchMedia("(display-mode: standalone)").matches||window.matchMedia("(display-mode: fullscreen)").matches||window.matchMedia("(display-mode: minimal-ui)").matches||window.navigator.standalone===true;}catch(e){}}if(!force&&!standalone&&sessionStorage.getItem(${JSON.stringify(SPLASH_STORAGE_KEY)})==="1"){d.classList.add("vibeup-splash-skip");d.classList.add("vibeup-app-ready");}var b=document.body;if(b){b.style.setProperty("background-color","#000000","important");b.style.setProperty("color-scheme","only dark","important");b.style.backgroundColor="#000000";}if(!document.getElementById("vibeup-boot-style")){var s=document.createElement("style");s.id="vibeup-boot-style";s.textContent=${JSON.stringify(CRITICAL_PAINT_CSS)};var h=document.head;if(h){h.insertBefore(s,h.firstChild);}else{d.appendChild(s);}}}catch(e){}})();`;

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

export function markAppCssReady() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add(APP_CSS_READY_CLASS);
}

function isAppCssApplied(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.classList.contains(APP_CSS_READY_CLASS)) {
    return true;
  }
  try {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim() !== ""
    );
  } catch {
    return false;
  }
}

/** Wait until Tailwind/app CSS is applied so we never uncover an unstyled shell. */
export function whenAppCssReady(timeoutMs = 4000): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (isAppCssApplied()) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      observer.disconnect();
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (isAppCssApplied()) finish();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const poll = window.setInterval(() => {
      if (isAppCssApplied()) finish();
    }, 50);
    const timer = window.setTimeout(finish, timeoutMs);
  });
}
