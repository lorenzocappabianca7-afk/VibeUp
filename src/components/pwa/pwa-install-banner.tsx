"use client";

import { Download, Share, X } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Only hides the banner for the current browser tab/session. */
const SESSION_DISMISS_KEY = "vibeup-pwa-install-session-dismissed";
/** Legacy key from the previous forever-dismiss behavior. */
const LEGACY_DISMISS_KEY = "vibeup-pwa-install-dismissed";

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

function readSessionDismissed() {
  try {
    return window.sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistSessionDismissed() {
  try {
    window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

function clearLegacyForeverDismiss() {
  try {
    window.localStorage.removeItem(LEGACY_DISMISS_KEY);
  } catch {
    // ignore
  }
}

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  void navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .then((registration) => {
      void registration.update();
    })
    .catch(() => {
      // iOS Safari still supports Add to Home without a SW
    });
}

function shouldOfferInstall() {
  if (isStandaloneDisplay() || readSessionDismissed()) return false;
  return isIosDevice() || isMobileViewport();
}

export function PwaInstallBanner() {
  // Stay null through SSR + first hydrate so we never paint an empty white strip.
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [forcedShow, setForcedShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [guide, setGuide] = useState<"ios" | "android" | null>(null);
  const [verifyHint, setVerifyHint] = useState(false);
  const claimTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    // Client-only mount gate: must run before paint to avoid a blank flash.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration gate
    setReady(true);
  }, []);

  const isIos = ready ? isIosDevice() : false;
  const visible =
    ready && !hidden && (forcedShow || shouldOfferInstall());

  /** Hide only for this visit unless the app is really on the Home screen. */
  const dismissForSession = useCallback(() => {
    persistSessionDismissed();
    setHidden(true);
    setForcedShow(false);
    setGuide(null);
    setVerifyHint(false);
  }, []);

  /**
   * User claims they're done. We only stop asking for good if the site is
   * already running as an installed Home-screen app.
   */
  const handleClaimInstalled = useCallback(() => {
    if (isStandaloneDisplay()) {
      setHidden(true);
      setForcedShow(false);
      setGuide(null);
      setVerifyHint(false);
      return;
    }

    setVerifyHint(true);
    persistSessionDismissed();
    if (claimTimerRef.current != null) {
      window.clearTimeout(claimTimerRef.current);
    }
    claimTimerRef.current = window.setTimeout(() => {
      claimTimerRef.current = null;
      setHidden(true);
      setForcedShow(false);
      setGuide(null);
      setVerifyHint(false);
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (claimTimerRef.current != null) {
        window.clearTimeout(claimTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    registerServiceWorker();
    clearLegacyForeverDismiss();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (shouldOfferInstall()) {
        setForcedShow(true);
        setHidden(false);
      }
    };

    const onInstalled = () => {
      setHidden(true);
      setForcedShow(false);
      setDeferredPrompt(null);
      setGuide(null);
      setVerifyHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
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
        persistSessionDismissed();
        setHidden(true);
        setForcedShow(false);
        setGuide(null);
      }
      return;
    }

    setGuide(isIos ? "ios" : "android");
  }, [deferredPrompt, isIos]);

  if (!visible) return null;

  return (
    <div
      className="border-b border-white/10 bg-surface-2 text-primary-black"
      role="region"
      aria-label="Installa VibeUp"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-3 py-3.5 sm:gap-4 sm:px-4 sm:py-4">
        <Image
          src="/vibeup-mark-192.png"
          alt="VibeUp"
          width={48}
          height={48}
          className="h-11 w-11 shrink-0 rounded-xl sm:h-12 sm:w-12"
          priority
        />
        <p className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-primary-black sm:text-base">
          Aggiungi VibeUp alla home
        </p>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-teal px-3.5 py-2.5 text-xs font-bold text-ink-inverse transition-colors hover:bg-brand-teal/90 sm:px-4 sm:text-sm"
        >
          <Download className="h-4 w-4" aria-hidden />
          Aggiungi
        </button>
        <button
          type="button"
          onClick={dismissForSession}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-black/55 transition-colors hover:bg-white/10 hover:text-primary-black"
          aria-label="Chiudi per ora"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {verifyHint && (
        <p className="border-t border-white/10 px-3 py-2 text-center text-xs text-brand-teal sm:px-4">
          Non risulta ancora nella Home: se non la aggiungi, questo avviso
          tornerà alla prossima visita
        </p>
      )}

      {guide === "ios" && (
        <InstallGuide
          title="Come aggiungerla su iPhone"
          onCloseGuide={() => setGuide(null)}
          onDone={handleClaimInstalled}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <InstallMethodCard title="Metodo 1">
              <GuideStep index={1}>
                Clicca{" "}
                <Share
                  className="mx-0.5 inline h-3.5 w-3.5 text-brand-teal"
                  aria-hidden
                />{" "}
                <span className="font-semibold text-primary-black">Condividi</span> in
                alto a destra
              </GuideStep>
              <GuideStep index={2}>
                Cerca e seleziona{" "}
                <span className="font-semibold text-primary-black">Altro</span>
              </GuideStep>
              <GuideStep index={3}>
                Premi{" "}
                <span className="font-semibold text-primary-black">Aggiungi a Home</span>
              </GuideStep>
            </InstallMethodCard>

            <InstallMethodCard title="Metodo 2">
              <GuideStep index={1}>
                Clicca i tre puntini{" "}
                <span className="font-semibold text-primary-black">⋯</span> in basso a
                destra dello schermo
              </GuideStep>
              <GuideStep index={2}>
                Scegli{" "}
                <Share
                  className="mx-0.5 inline h-3.5 w-3.5 text-brand-teal"
                  aria-hidden
                />{" "}
                <span className="font-semibold text-primary-black">Condividi</span>
              </GuideStep>
              <GuideStep index={3}>
                Scorri verso il basso fino a trovare e selezionare{" "}
                <span className="font-semibold text-primary-black">Aggiungi a Home</span>
              </GuideStep>
            </InstallMethodCard>
          </div>
        </InstallGuide>
      )}

      {guide === "android" && (
        <InstallGuide
          title="Come aggiungerla su Android"
          onCloseGuide={() => setGuide(null)}
          onDone={handleClaimInstalled}
        >
          <ol className="space-y-2">
            <GuideStep index={1}>
              Tocca i tre puntini{" "}
              <span className="font-semibold text-primary-black">⋮</span> vicino alla
              barra di ricerca
            </GuideStep>
            <GuideStep index={2}>
              Scorri giù e scegli{" "}
              <span className="font-semibold text-primary-black">Installa app</span>{" "}
              oppure{" "}
              <span className="font-semibold text-primary-black">Aggiungi a Home</span>
            </GuideStep>
            <GuideStep index={3}>
              Conferma e trova VibeUp nella Home del telefono
            </GuideStep>
          </ol>
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
      <div className="rounded-2xl bg-surface/8 px-3.5 py-3">
        <p className="text-sm font-semibold text-primary-black">{title}</p>
        <div className="mt-2 text-xs leading-relaxed text-primary-black/70">
          {children}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCloseGuide}
            className="flex-1 rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-primary-black/70"
          >
            Chiudi guida
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-full bg-surface px-3 py-2 text-xs font-bold text-primary-black"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  );
}

function InstallMethodCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-brand-teal">
        {title}
      </p>
      <ol className="mt-2 space-y-2">{children}</ol>
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
