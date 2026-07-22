"use client";

import { Download, Share, X } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "vibeup-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;

  const mediaStandalone = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone,
    );

  return mediaStandalone || iosStandalone;
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

function readDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  void navigator.serviceWorker.register("/sw.js").catch(() => {
    // iOS Safari still supports Add to Home without a SW
  });
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [guide, setGuide] = useState<"ios" | "android" | null>(null);
  const [isIos, setIsIos] = useState(false);

  const dismissForever = useCallback(() => {
    persistDismissed();
    setVisible(false);
    setGuide(null);
  }, []);

  useEffect(() => {
    registerServiceWorker();

    if (isStandaloneDisplay() || readDismissed()) {
      return;
    }

    const ios = isIosDevice();
    setIsIos(ios);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (isMobileViewport() || ios) {
        setVisible(true);
      }
    };

    const onInstalled = () => {
      persistDismissed();
      setVisible(false);
      setDeferredPrompt(null);
      setGuide(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setTimeout(() => {
      if (readDismissed() || isStandaloneDisplay()) return;
      if (ios || isMobileViewport()) {
        setVisible(true);
      }
    }, 900);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        persistDismissed();
        setVisible(false);
        setGuide(null);
      }
      return;
    }

    setGuide(isIos ? "ios" : "android");
  }, [deferredPrompt, isIos]);

  if (!visible) return null;

  return (
    <div
      className="border-b border-white/10 bg-primary-black text-white"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      role="region"
      aria-label="Installa VibeUp"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5 sm:px-4">
        <Image
          src="/vibeup-mark-192.png"
          alt="VibeUp"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl"
          priority
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Vuoi VibeUp nella Home?
          </p>
          <p className="mt-0.5 truncate text-xs text-white/65">
            Aprila come un&apos;app dal telefono
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-teal px-3.5 py-2 text-xs font-bold text-primary-black transition-colors hover:bg-brand-teal/90"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Aggiungi
        </button>
        <button
          type="button"
          onClick={dismissForever}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Non mostrare più"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {guide === "ios" && (
        <InstallGuide
          title="Come aggiungerla su iPhone"
          onCloseGuide={() => setGuide(null)}
          onDone={dismissForever}
        >
          <GuideStep index={1}>
            Tocca{" "}
            <Share className="mx-0.5 inline h-3.5 w-3.5 text-brand-teal" aria-hidden />{" "}
            <span className="font-semibold text-white">Condividi</span> in Safari
          </GuideStep>
          <GuideStep index={2}>
            Scorri e scegli{" "}
            <span className="font-semibold text-white">Aggiungi a Home</span>
          </GuideStep>
          <GuideStep index={3}>
            Conferma con{" "}
            <span className="font-semibold text-white">Aggiungi</span>
          </GuideStep>
        </InstallGuide>
      )}

      {guide === "android" && (
        <InstallGuide
          title="Come aggiungerla su Android"
          onCloseGuide={() => setGuide(null)}
          onDone={dismissForever}
        >
          <GuideStep index={1}>
            Apri il menu{" "}
            <span className="font-semibold text-white">⋮</span> del browser
          </GuideStep>
          <GuideStep index={2}>
            Tocca{" "}
            <span className="font-semibold text-white">
              Installa app
            </span>{" "}
            oppure{" "}
            <span className="font-semibold text-white">Aggiungi a Home</span>
          </GuideStep>
          <GuideStep index={3}>
            Conferma e trova VibeUp nella Home del telefono
          </GuideStep>
        </InstallGuide>
      )}
    </div>
  );
}

function InstallGuide({
  title,
  children,
  onCloseGuide,
  onDone,
}: {
  title: string;
  children: ReactNode;
  onCloseGuide: () => void;
  onDone: () => void;
}) {
  return (
    <div className="border-t border-white/10 px-3 pb-3 pt-2 sm:px-4">
      <div className="rounded-2xl bg-white/8 px-3.5 py-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <ol className="mt-2 space-y-2 text-xs leading-relaxed text-white/75">
          {children}
        </ol>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onCloseGuide}
            className="flex-1 rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-white/80"
          >
            Chiudi guida
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-primary-black"
          >
            Fatto, non mostrare più
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideStep({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-teal/20 text-[10px] font-bold text-brand-teal">
        {index}
      </span>
      <span className="min-w-0 pt-0.5">{children}</span>
    </li>
  );
}
