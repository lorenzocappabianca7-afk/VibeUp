import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
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
        {/* 1) Sync script before paint — same FOUC pattern as next-themes */}
        <script
          dangerouslySetInnerHTML={{ __html: CRITICAL_PAINT_SCRIPT }}
        />
        {/* 2) Inline CSS before any stylesheet link (black + constrained logo size) */}
        <style
          dangerouslySetInnerHTML={{ __html: CRITICAL_PAINT_CSS }}
        />
        {/* 3) Fetch splash mark in parallel with HTML — avoids blank→logo gap */}
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
        {/* Black shell with inline styles — stays until splash completes */}
        <CriticalPaint />
        <SplashScreen />
        <AppProviders>
          <div className="flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-hidden bg-background">
            <AppChrome>{children}</AppChrome>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
