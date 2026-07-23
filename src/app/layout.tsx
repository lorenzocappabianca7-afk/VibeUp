import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppChrome } from "@/components/layout/app-chrome";
import { AppProviders } from "@/components/providers/app-providers";
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
    statusBarStyle: "black-translucent",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F0F11" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F11" },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-background text-primary-black">
        <AppProviders>
          <div className="flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-hidden">
            <AppChrome>{children}</AppChrome>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
