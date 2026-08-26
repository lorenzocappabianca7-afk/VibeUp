import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { AppChrome } from "@/components/layout/app-chrome";
import { AppProviders } from "@/components/providers/app-providers";
import { CriticalPaint } from "@/components/splash/critical-paint";
import { SplashScreen } from "@/components/splash/splash-screen";
import { APPLE_STARTUP_IMAGES } from "@/lib/apple-startup";
import {
  CRITICAL_PAINT_CSS,
  CRITICAL_PAINT_SCRIPT,
} from "@/lib/critical-paint";
import { SPLASH_LOGO_DISPLAY_PX } from "@/lib/splash";
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
    /* "black" (not translucent) avoids a light strip/flash under the status bar on iOS */
    statusBarStyle: "black",
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
        <link rel="stylesheet" href="/boot-paint.css?v=splash-logo-6" />
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
        <link
          rel="preload"
          href="/vibeup-splash-logo-boot.png"
          as="image"
          type="image/png"
          fetchPriority="high"
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
        {/* Sole splash overlay — logo first at final size, tagline fades in after. */}
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
              position: "relative",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "14vh",
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
                backgroundImage: "url(/vibeup-splash-logo-boot.png)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: `${SPLASH_LOGO_DISPLAY_PX}px ${SPLASH_LOGO_DISPLAY_PX}px`,
                transform: "none",
              }}
            />
            <p
              className="vibeup-splash__tagline"
              style={{
                margin: "1.15rem 0 0",
                color: "#ffffff",
              }}
            >
              Cool people plan cool party.
            </p>
          </div>
        </div>
        <SplashScreen />
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
