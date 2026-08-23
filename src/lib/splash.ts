/** Splash timing — single source of truth */
export const SPLASH_STORAGE_KEY = "vibeup-splash-seen";

/** Logo bounce — longer = smoother spring */
export const LOGO_BOUNCE_MS = 1400;

/** Tagline appears shortly after the logo starts bouncing */
export const TAGLINE_DELAY_MS = 520;

/** Hold after the tagline is visible, then start exit */
export const HOLD_AFTER_TAGLINE_MS = 3500;

/** Soft fade of logo/tagline only — the black plate stays solid until cut */
export const SPLASH_EXIT_MS = 420;
