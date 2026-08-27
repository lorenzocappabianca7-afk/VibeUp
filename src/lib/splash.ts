import { SPLASH_LOGO_DATA_URI } from "@/lib/splash-logo-src";

/** Splash timing — single source of truth */
export const SPLASH_STORAGE_KEY = "vibeup-splash-seen";

/**
 * On-screen logo box. Must stay in px (not rem) so HTML splash, boot CSS,
 * and iOS apple-touch-startup-image all share one size.
 */
export const SPLASH_LOGO_DISPLAY_PX = 128;

/** Half the logo box — used by `top/left: calc(50% - 12vh - Npx)`. */
export const SPLASH_LOGO_HALF_PX = SPLASH_LOGO_DISPLAY_PX / 2;

/**
 * Logo lift from geometric center. HTML and generated iOS launch images MUST
 * use the same formula:
 *   logoTop = 50% - 12vh - 64px
 * Flex + margin-bottom:12vh is NOT equivalent (it only lifts ~6vh) and makes
 * the Home Screen native splash jump when the WebView takes over.
 */
export const SPLASH_STAGE_LIFT_VH = 12;

/** Inlined on the logo box so Home Screen HTML paint does not wait on a fetch. */
export const SPLASH_LOGO_SRC = SPLASH_LOGO_DATA_URI;

/** File fallback if a stylesheet cannot use the data URI. */
export const SPLASH_LOGO_FILE = "/vibeup-splash-logo-inline.png";

export const SPLASH_TAGLINE = "Cool people plan cool party.";

export const SPLASH_FONT_SRC = "/splash/montserrat-700.woff2";

/** Tagline is visible on the first HTML frame — same as the iOS launch PNG. */
export const TAGLINE_DELAY_MS = 0;

export const TAGLINE_FADE_MS = 0;

/** Hold from first paint (logo already visible), then start exit */
export const SPLASH_HOLD_MS = 4000;

/** Soft fade of logo/tagline only — the black plate stays solid until cut */
export const SPLASH_EXIT_MS = 420;

/** Home Screen / installed PWA — iOS always shows a native splash first. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch {
    /* ignore */
  }
  try {
    if (
      "standalone" in window.navigator &&
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      )
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
