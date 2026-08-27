import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { AppCssLoaderGate } from "@/components/app-css-loader-gate";
import { AppChrome } from "@/components/layout/app-chrome";
import { AppProviders } from "@/components/providers/app-providers";
import { CriticalPaint } from "@/components/splash/critical-paint";
import { SplashScreen } from "@/components/splash/splash-screen";
import { APPLE_STARTUP_IMAGES } from "@/lib/apple-startup";
import {
  CRITICAL_PAINT_CSS,
  CRITICAL_PAINT_SCRIPT,
  UNBLOCK_APP_CSS_SCRIPT,
} from "@/lib/critical-paint";
import {
  SPLASH_FONT_SRC,
  SPLASH_LOGO_DISPLAY_PX,
  SPLASH_LOGO_FILE,
  SPLASH_LOGO_HALF_PX,
  SPLASH_LOGO_SRC,
  SPLASH_STAGE_LIFT_VH,
  SPLASH_TAGLINE,
} from "@/lib/splash";
import { getSiteUrl } from "@/lib/site";
/* App CSS is loaded by AppCssLoader after first paint. Do not import
   globals.css here — Next hoists it as a render-blocking <link> and iOS
   Home Screen drops the native launch image onto a blank canvas. */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Self-hosted: next/font/google Montserrat URLs currently 404 on gstatic during Vercel builds. */
const brandDisplay = localFont({
  src: [
    {
      path: "../fonts/montserrat-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/montserrat-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "VibeUp — Organizza feste senza stress",
    template: "%s | VibeUp",
  },
  description:
    "VibeUp (Vibe Up) è la web app per organizzare feste: trova location, DJ, fotografi e servizi per il tuo evento in un unico posto.",
  keywords: [
    "VibeUp",
    "Vibe Up",
    "organizzare feste",
    "organizza feste",
    "location per feste",
    "eventi",
    "party planner",
  ],
  applicationName: "VibeUp",
  appleWebApp: {
    capable: true,
    title: "VibeUp",
    /* Full-screen under the status bar so the native launch image and HTML
       splash share the same coordinate space. App chrome pads safe-area. */
    statusBarStyle: "black-translucent",
  },
  /* Next emits only mobile-web-app-capable; Safari still keys standalone off the apple-prefixed tag. */
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "VibeUp",
    title: "VibeUp — Organizza feste senza stress",
    description:
      "Trova location, servizi e organizza la tua festa con VibeUp.",
    images: [{ url: "/vibeup-mark.png", width: 512, height: 512, alt: "VibeUp" }],
  },
  twitter: {
    card: "summary",
    title: "VibeUp — Organizza feste senza stress",
    description:
      "Trova location, servizi e organizza la tua festa con VibeUp.",
    images: ["/vibeup-mark.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/vibeup-mark-192.png", sizes: "192x192", type: "image/png" },
      { url: "/vibeup-mark-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/favicon-48.png"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/vibeup-apple.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  /* Media-less so iOS applies it before prefers-color-scheme is evaluated.
     `only dark` forces a black WKWebView canvas in iOS Light Mode. */
  themeColor: "#000000",
  /* `only dark` is valid CSS; Next's ColorSchemeEnum lists `only light` but
     not `only dark`. Cast so the emitted meta is the value iOS actually needs. */
  colorScheme: "only dark" as Viewport["colorScheme"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} ${brandDisplay.variable} h-full antialiased`}
      style={{ backgroundColor: "#000000", colorScheme: "only dark" }}
      suppressHydrationWarning
    >
      {/* Runs before <head> CSS links when React preserves this order — unblocks
          Next's ~100KB stylesheet so the HTML splash can paint on Home Screen. */}
      <script
        dangerouslySetInnerHTML={{ __html: UNBLOCK_APP_CSS_SCRIPT }}
      />
      <head>
        {/* Render-blocking black paint — must stay before Next CSS chunks.
            next/no-css-tags is intentional: preinit was too late for Safari FOUC. */}
        {/* eslint-disable-next-line @next/next/no-css-tags -- boot FOUC shield */}
        <meta name="color-scheme" content="only dark" />
        <meta name="theme-color" content="#000000" />
        <link
          rel="preload"
          href={SPLASH_FONT_SRC}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={SPLASH_LOGO_FILE}
          as="image"
          type="image/png"
          fetchPriority="high"
        />
        <link rel="stylesheet" href="/boot-paint.css?v=splash-logo-11" />
        {/* Fallback inline CSS if the link is delayed/relocated */}
        <style
          dangerouslySetInnerHTML={{ __html: CRITICAL_PAINT_CSS }}
        />
        {/* Runs ASAP: black canvas + splash-skip class before first paint */}
        <script
          dangerouslySetInnerHTML={{ __html: CRITICAL_PAINT_SCRIPT }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        {APPLE_STARTUP_IMAGES.map((image) => (
          <link
            key={`${image.url}:${"media" in image ? image.media : "fallback"}`}
            rel="apple-touch-startup-image"
            href={image.url}
            {...("media" in image ? { media: image.media } : {})}
          />
        ))}
      </head>
      <body
        className="min-h-dvh text-primary-black"
        style={{ backgroundColor: "#000000", colorScheme: "only dark" }}
        suppressHydrationWarning
      >
        {/* Black shell with inline styles — demoted behind app after splash.
            Do not put next/script before this: beforeInteractive was queued
            as ~4KB of JS before the splash DIV, delaying first paint. */}
        <CriticalPaint />
        {/* Splash is outside AppProviders on purpose. Do not wrap it, do not
            add Tailwind classes, and do not replace the logo div with <img>. */}
        <div
          id="vibeup-boot-splash"
          className="vibeup-splash vibeup-splash--tagline"
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 10000,
            isolation: "isolate",
            backgroundColor: "#000000",
            display: "block",
          }}
        >
          <div
            className="vibeup-splash__stage"
            style={{
              position: "absolute",
              top: `calc(50% - ${SPLASH_STAGE_LIFT_VH}vh - ${SPLASH_LOGO_HALF_PX}px)`,
              left: `calc(50% - ${SPLASH_LOGO_HALF_PX}px)`,
              width: `${SPLASH_LOGO_DISPLAY_PX}px`,
              height: `${SPLASH_LOGO_DISPLAY_PX}px`,
              margin: 0,
              transform: "none",
            }}
          >
            <div
              className="vibeup-splash__logo vibeup-splash__logo--settled"
              aria-hidden
              style={{
                width: `${SPLASH_LOGO_DISPLAY_PX}px`,
                height: `${SPLASH_LOGO_DISPLAY_PX}px`,
                minWidth: `${SPLASH_LOGO_DISPLAY_PX}px`,
                minHeight: `${SPLASH_LOGO_DISPLAY_PX}px`,
                maxWidth: `${SPLASH_LOGO_DISPLAY_PX}px`,
                maxHeight: `${SPLASH_LOGO_DISPLAY_PX}px`,
                flexShrink: 0,
                backgroundImage: `url("${SPLASH_LOGO_SRC}")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: `${SPLASH_LOGO_DISPLAY_PX}px ${SPLASH_LOGO_DISPLAY_PX}px`,
                transform: "none",
              }}
            />
            <div
              className="vibeup-splash__tagline"
              style={{
                margin: "1.15rem 0 0",
                color: "#ffffff",
                opacity: 1,
              }}
            >
              {SPLASH_TAGLINE}
            </div>
          </div>
        </div>
        <SplashScreen />
        <AppCssLoaderGate />
        <AppProviders>
          <div
            id="vibeup-app-shell"
            className="flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-clip bg-background"
            style={{
              backgroundColor: "#000000",
              position: "relative",
              zIndex: 1,
            }}
          >
            <AppChrome>{children}</AppChrome>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
