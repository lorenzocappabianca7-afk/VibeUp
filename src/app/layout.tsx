import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import Script from "next/script";
import { AppChrome } from "@/components/layout/app-chrome";
import { AppProviders } from "@/components/providers/app-providers";
import { CriticalPaint } from "@/components/splash/critical-paint";
import { SplashScreen } from "@/components/splash/splash-screen";
import {
  CRITICAL_PAINT_CSS,
  CRITICAL_PAINT_SCRIPT,
} from "@/lib/critical-paint";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const brandDisplay = Montserrat({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const APPLE_STARTUP_IMAGES = [
  /* Fallback first — unmatched devices otherwise flash a white native splash */
  {
    url: "/splash/apple-startup-1170x2532.png",
  },
  {
    url: "/splash/apple-startup-1320x2868.png",
    media:
      "screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-1206x2622.png",
    media:
      "screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-1290x2796.png",
    media:
      "screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-1179x2556.png",
    media:
      "screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-1284x2778.png",
    media:
      "screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-1170x2532.png",
    media:
      "screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-1125x2436.png",
    media:
      "screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-1242x2688.png",
    media:
      "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-828x1792.png",
    media:
      "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-750x1334.png",
    media:
      "screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-1668x2388.png",
    media:
      "screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-startup-2048x2732.png",
    media:
      "screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
] as const;

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
    /* "black" (not translucent) avoids a light strip/flash under the status bar on iOS */
    statusBarStyle: "black",
    /* Black + logo launch images — continuous icon→splash handoff on Home Screen */
    startupImage: [...APPLE_STARTUP_IMAGES],
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
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/vibeup-mark-192.png", sizes: "192x192", type: "image/png" },
      { url: "/vibeup-mark-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon-48.png",
    apple: [{ url: "/vibeup-apple.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  /* Black matches PWA native launch splash / home-screen icon expand */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "dark",
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
      style={{ backgroundColor: "#000000", colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <head>
        {/* Render-blocking black paint — must stay before Next CSS chunks.
            next/no-css-tags is intentional: preinit was too late for Safari FOUC. */}
        {/* eslint-disable-next-line @next/next/no-css-tags -- boot FOUC shield */}
        <link rel="stylesheet" href="/boot-paint.css" />
        {/* Fallback inline CSS if the link is delayed/relocated */}
        <style
          dangerouslySetInnerHTML={{ __html: CRITICAL_PAINT_CSS }}
        />
        {/* Runs ASAP: black canvas + splash-skip class before first paint */}
        <script
          dangerouslySetInnerHTML={{ __html: CRITICAL_PAINT_SCRIPT }}
        />
        <link
          rel="preload"
          href="/vibeup-splash-logo-boot.png"
          as="image"
          type="image/png"
          fetchPriority="high"
        />
      </head>
      <body
        className="min-h-dvh text-primary-black"
        style={{ backgroundColor: "#000000" }}
        suppressHydrationWarning
      >
        {/* Also via next/script for clients that re-exec on soft recovery */}
        <Script
          id="vibeup-critical-paint"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: CRITICAL_PAINT_SCRIPT }}
        />
        {/* Black shell with inline styles — demoted behind app after splash */}
        <CriticalPaint />
        {/* Static splash in first HTML — must match React splash geometry
            (stage + tagline slot + 14vh lift) or the logo jumps on hydrate. */}
        <div
          id="vibeup-boot-splash"
          className="vibeup-splash"
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 10000,
            backgroundColor: "#000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="vibeup-splash__stage"
            style={{
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "14vh",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vibeup-splash-logo-boot.png"
              alt=""
              width={112}
              height={112}
              className="vibeup-splash__logo vibeup-splash__logo--settled"
              decoding="sync"
              fetchPriority="high"
              style={{
                width: "7rem",
                maxWidth: "7rem",
                height: "auto",
                display: "block",
              }}
            />
            {/* Reserve tagline height so handoff to React does not shift the logo */}
            <p
              className="vibeup-splash__tagline"
              style={{
                margin: "1rem 0 0",
                minHeight: "1.15em",
                opacity: 0,
              }}
            >
              VibeUp your life
            </p>
          </div>
        </div>
        <SplashScreen />
        <AppProviders>
          <div
            id="vibeup-app-shell"
            className="flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-hidden bg-background"
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
