/** Splash timing — single source of truth */
export const SPLASH_STORAGE_KEY = "vibeup-splash-seen";

/**
 * On-screen logo box. Must stay in px (not rem) so HTML splash, boot CSS,
 * and iOS apple-touch-startup-image all share one size.
 */
export const SPLASH_LOGO_DISPLAY_PX = 112;

/** Stage lift used by HTML splash and generated iOS launch images */
export const SPLASH_STAGE_LIFT_VH = 14;

/** Logo alone, then tagline fades in — no scale/translate on the logo */
export const TAGLINE_DELAY_MS = 800;

export const TAGLINE_FADE_MS = 450;

/** Hold from first paint (logo already visible), then start exit */
export const SPLASH_HOLD_MS = 4000;

/** Soft fade of logo/tagline only — the black plate stays solid until cut */
export const SPLASH_EXIT_MS = 420;
