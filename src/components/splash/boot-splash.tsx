import { BOOT_SPLASH_ID, SPLASH_STORAGE_KEY } from "@/lib/splash";

/**
 * Server-rendered splash painted with the first HTML response —
 * before React hydrates — so a PWA / home-screen launch keeps the
 * logo visible continuously (icon → fullscreen).
 */
export function BootSplash() {
  const hideIfSeenScript = `
(function () {
  try {
    if (sessionStorage.getItem(${JSON.stringify(SPLASH_STORAGE_KEY)}) === "1") {
      var el = document.getElementById(${JSON.stringify(BOOT_SPLASH_ID)});
      if (el) el.style.display = "none";
      document.documentElement.classList.add("vibeup-splash-skip");
    }
  } catch (e) {}
})();`;

  return (
    <>
      <div id={BOOT_SPLASH_ID} className="vibeup-splash vibeup-splash--boot">
        <div className="vibeup-splash__stage">
          {/* Plain <img>: available on first paint, no Next image delay */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vibeup-splash-logo.png"
            alt=""
            width={868}
            height={874}
            className="vibeup-splash__logo vibeup-splash__logo--static"
            draggable={false}
            decoding="async"
            fetchPriority="high"
          />
          {/* Reserve tagline space so React handoff does not jump */}
          <p className="vibeup-splash__tagline vibeup-splash__tagline--slot" />
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: hideIfSeenScript }} />
    </>
  );
}
