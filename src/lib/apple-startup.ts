/** iOS `apple-touch-startup-image` list — keep in the first HTML `<head>`.
 *  Every entry MUST have a media query. A match-all fallback makes iOS
 *  reject the set and zoom the small Home Screen icon instead.
 *
 *  Dark-mode duplicates are required: in Dark Mode, iOS ignores images that
 *  do not mention `prefers-color-scheme` and falls back to a zoomed icon.
 *  Landscape duplicates stop a portrait-only set from being rejected.
 */
const APPLE_STARTUP_VERSION = "v8";

const APPLE_STARTUP_DEVICES = [
  { cssW: 440, cssH: 956, dpr: 3 },
  { cssW: 420, cssH: 912, dpr: 3 },
  { cssW: 402, cssH: 874, dpr: 3 },
  { cssW: 430, cssH: 932, dpr: 3 },
  { cssW: 393, cssH: 852, dpr: 3 },
  { cssW: 428, cssH: 926, dpr: 3 },
  { cssW: 390, cssH: 844, dpr: 3 },
  { cssW: 375, cssH: 812, dpr: 3 },
  { cssW: 360, cssH: 780, dpr: 3 },
  { cssW: 414, cssH: 896, dpr: 3 },
  { cssW: 414, cssH: 736, dpr: 3 },
  { cssW: 414, cssH: 896, dpr: 2 },
  { cssW: 375, cssH: 667, dpr: 2 },
  { cssW: 834, cssH: 1194, dpr: 2 },
  { cssW: 1024, cssH: 1366, dpr: 2 },
] as const;

function startupFile(pixelW: number, pixelH: number) {
  return `/splash/apple-startup-${pixelW}x${pixelH}-${APPLE_STARTUP_VERSION}.png`;
}

function startupMedia(
  cssW: number,
  cssH: number,
  dpr: number,
  orientation: "portrait" | "landscape",
  scheme?: "dark",
) {
  const device = `(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orientation})`;
  if (scheme === "dark") {
    return `screen and (prefers-color-scheme: dark) and ${device}`;
  }
  return `screen and ${device}`;
}

export const APPLE_STARTUP_IMAGES = APPLE_STARTUP_DEVICES.flatMap((d) => {
  const portraitPxW = d.cssW * d.dpr;
  const portraitPxH = d.cssH * d.dpr;
  const portrait = startupFile(portraitPxW, portraitPxH);
  const landscape = startupFile(portraitPxH, portraitPxW);
  return [
    {
      url: portrait,
      media: startupMedia(d.cssW, d.cssH, d.dpr, "portrait"),
    },
    {
      url: portrait,
      media: startupMedia(d.cssW, d.cssH, d.dpr, "portrait", "dark"),
    },
    {
      url: landscape,
      media: startupMedia(d.cssW, d.cssH, d.dpr, "landscape"),
    },
    {
      url: landscape,
      media: startupMedia(d.cssW, d.cssH, d.dpr, "landscape", "dark"),
    },
  ];
});
