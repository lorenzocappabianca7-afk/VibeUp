import { BOOT_SPLASH_ID, SPLASH_STORAGE_KEY } from "@/lib/splash";
import { SPLASH_LOGO_DATA_URI } from "@/lib/splash-logo-data";

/** Critical CSS inlined so the logo paints with the first HTML byte — no CSS file wait. */
export const BOOT_SPLASH_CRITICAL_CSS = `
html,body{background:#000!important}
#${BOOT_SPLASH_ID}{
  position:fixed;inset:0;z-index:10000;
  display:grid;place-items:center;
  background:#000;pointer-events:none;margin:0
}
#${BOOT_SPLASH_ID} .vibeup-boot-stage{
  display:flex;flex-direction:column;align-items:center;
  gap:1.15rem;padding:1.5rem;transform:translateY(-7vh)
}
#${BOOT_SPLASH_ID} .vibeup-boot-logo{
  display:block;width:min(52vw,11.5rem);height:auto;
  aspect-ratio:1;object-fit:contain
}
@keyframes vibeup-splash-tagline-in{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:translateY(0)}
}
html.vibeup-splash-skip #${BOOT_SPLASH_ID}{display:none!important}
`.replace(/\s+/g, " ").trim();

/**
 * Server-rendered splash painted with the first HTML response.
 * Logo is a data-URI so it is part of the document — no separate image request.
 */
export function BootSplash() {
  const hideIfSeenScript = `
(function () {
  try {
    if (sessionStorage.getItem(${JSON.stringify(SPLASH_STORAGE_KEY)}) === "1") {
      document.documentElement.classList.add("vibeup-splash-skip");
    }
  } catch (e) {}
})();`;

  return (
    <>
      <style
        id="vibeup-boot-splash-style"
        dangerouslySetInnerHTML={{ __html: BOOT_SPLASH_CRITICAL_CSS }}
      />
      <div id={BOOT_SPLASH_ID}>
        <div className="vibeup-boot-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SPLASH_LOGO_DATA_URI}
            alt=""
            width={256}
            height={256}
            className="vibeup-boot-logo"
            draggable={false}
            decoding="sync"
            fetchPriority="high"
          />
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: hideIfSeenScript }} />
    </>
  );
}
