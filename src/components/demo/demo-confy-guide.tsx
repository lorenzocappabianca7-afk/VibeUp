"use client";

import { useAppState } from "@/context/app-state-context";
import { useDemoMode } from "@/context/demo-mode-context";
import { useDemoLanguage } from "@/context/demo-language-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { hasVisibleOverlay } from "@/lib/body-scroll-lock";
import { DEMO_NUDGE_EVENT, requestDemoNudge } from "@/lib/demo/nudge";
import { DEMO_SERVICE_ADDED_EVENT, readDemoAddedService } from "@/lib/demo/added-service";
import { demoMissingServiceIds } from "@/lib/demo/missing-services";
import { isDemoGuideSkipped, skipDemoGuide } from "@/lib/demo/session";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const STEPS = [
  {
    title: "Ciao! Sono Confy",
    body: "Iniziamo da qui: tocca «Crea la tua festa» e dimmi data e invitati. Il resto si sblocca dopo!",
  },
  {
    title: "Ottimo!",
    body: "Ora tocca la location che ti piace di più. Puoi anche confrontarne 2-3 con «Confronta».",
  },
  {
    title: "Perfetto!",
    body: "Tocca «Invia richiesta di disponibilità» qui sotto.",
  },
  {
    title: "La tua festa è confermata!",
    body: "Ora prova ad aggiungere un servizio che manca: tocca uno di quelli nel riquadro rosa.",
  },
  {
    title: "Perfetto, ora il tuo 18 è completo!",
    body: "Tocca «Continua» per dirci cosa ne pensi.",
  },
] as const;

function guideStep(input: {
  bookingConfirmed: boolean;
  hasLocation: boolean;
  hasAppliedCriteria: boolean;
  serviceReady: boolean;
}) {
  if (input.bookingConfirmed && input.serviceReady) return 5;
  if (input.bookingConfirmed) return 4;
  if (input.hasLocation) return 3;
  if (input.hasAppliedCriteria) return 2;
  return 1;
}

/** Dims a block until the party exists. A tap asks Confy to remind them. */
export function DemoHomeLockedDim({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { lang } = useDemoLanguage();
  const { isDemoMode, session, bookingConfirmed } = useDemoMode();
  const { hasAppliedCriteria } = usePartyCriteria();
  const locked = isDemoMode && Boolean(session) && !session?.completed && !bookingConfirmed && !hasAppliedCriteria;
  if (!locked) return <div className={className}>{children}</div>;

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none opacity-30 select-none" inert>
        {children}
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 cursor-pointer"
        aria-label={lang === "en" ? "Create your party first" : "Prima crea la tua festa"}
        onClick={() => requestDemoNudge()}
      />
    </div>
  );
}

export function DemoConfyGuide() {
  const pathname = usePathname() || "/";
  const { isDemoMode, session, bookingConfirmed, selectedLocations, bookedLocation } = useDemoMode();
  const { managedListings } = useAppState();
  const { hasAppliedCriteria } = usePartyCriteria();
  const [serviceAdded, setServiceAdded] = useState(false);
  const [skipped, setSkipped] = useState(true);
  const [ready, setReady] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [hop, setHop] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [clearance, setClearance] = useState("");
  const mascotRef = useRef<HTMLImageElement>(null);
  const nudgeUntil = useRef(0);

  useEffect(() => {
    if (!session) return;
    setSkipped(isDemoGuideSkipped(session.id));
    setServiceAdded(Boolean(readDemoAddedService(session.id)));
    setReady(true);
    const onAdded = () => setServiceAdded(true);
    window.addEventListener(DEMO_SERVICE_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(DEMO_SERVICE_ADDED_EVENT, onAdded);
  }, [session]);

  useEffect(() => {
    const onNudge = () => {
      const now = Date.now();
      if (now < nudgeUntil.current) return;
      nudgeUntil.current = now + 420;
      setNudge(true);
      setHop((value) => value + 1);
    };
    window.addEventListener(DEMO_NUDGE_EVENT, onNudge);
    return () => window.removeEventListener(DEMO_NUDGE_EVENT, onNudge);
  }, []);

  useEffect(() => {
    if (!nudge) return;
    const timer = window.setTimeout(() => setNudge(false), 2800);
    return () => window.clearTimeout(timer);
  }, [nudge, hop]);

  useEffect(() => {
    const mascot = mascotRef.current;
    if (!mascot || hop === 0) return;
    mascot.classList.remove("vu-confy-hop");
    void mascot.getBoundingClientRect();
    mascot.classList.add("vu-confy-hop");
  }, [hop]);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let maxHeight = viewport?.height ?? window.innerHeight;
    let last = "";
    const compute = () => {
      if (viewport) maxHeight = Math.max(maxHeight, viewport.height);
      const keyboard = viewport ? maxHeight - viewport.height > 120 : false;
      const onLocation = pathname.startsWith("/location");
      const clearance = root.dataset.confyClearance ?? "";
      const nextBlocked =
        keyboard || onLocation || clearance === "hide" || hasVisibleOverlay();
      const key = `${nextBlocked ? "1" : "0"}|${clearance}`;
      if (key === last) return;
      last = key;
      setClearance(clearance);
      setBlocked(nextBlocked);
    };
    const observer = new MutationObserver(compute);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-confy-clearance"],
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-overlay-open"],
    });
    viewport?.addEventListener("resize", compute);
    compute();
    return () => {
      observer.disconnect();
      viewport?.removeEventListener("resize", compute);
    };
  }, [pathname]);

  if (!ready || !isDemoMode || !session || session.completed || blocked) return null;
  if (skipped && !nudge) return null;

  const locationId = bookedLocation?.id ?? selectedLocations.at(-1)?.id ?? null;
  const nothingToAdd =
    demoMissingServiceIds({
      locationId,
      listings: managedListings,
    }).length === 0;
  const step = guideStep({
    bookingConfirmed,
    hasLocation: selectedLocations.length > 0,
    hasAppliedCriteria,
    serviceReady: serviceAdded || nothingToAdd,
  });
  const message = nudge
    ? { title: "Prima crea la tua festa 👆", body: "" }
    : STEPS[step - 1];
  const raised =
    clearance === "compare"
      ? "13rem"
      : step === 5
        ? "16rem"
        : step === 3
          ? "11.25rem"
          : "5.4rem";
  const bottom = `calc(${raised} + env(safe-area-inset-bottom, 0px))`;

  function hide() {
    if (!session) return;
    skipDemoGuide(session.id);
    setSkipped(true);
    setNudge(false);
  }

  return (
    <div
      className="vu-confy-in pointer-events-none fixed inset-x-0 z-[52] mx-auto flex w-full max-w-full items-end overflow-x-clip px-4 sm:max-w-[430px]"
      style={{ bottom }}
    >
      <img
        ref={mascotRef}
        src="/demo/confy.svg"
        alt=""
        aria-hidden
        width={112}
        height={112}
        className="pointer-events-none h-28 w-28 shrink-0"
        style={{ marginRight: -14 }}
      />
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none relative mb-[18px] min-w-0 flex-1 rounded-[18px] rounded-bl-[6px] bg-[#F5F5F7] py-3.5 pl-4 pr-8 text-[#0F1115] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7)]"
      >
        <button
          type="button"
          onClick={hide}
          className="pointer-events-auto absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-[#6B6E76]"
          aria-label="Chiudi la guida"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <p className="pr-6 font-[family-name:var(--font-brand)] text-[15px] font-extrabold leading-tight">
          {message.title}
        </p>
        {message.body ? (
          <p className="mt-1 text-sm leading-snug text-[#2A2C33]">{message.body}</p>
        ) : null}
        {nudge ? null : (
          <p className="mt-2 flex items-center justify-between gap-3 text-xs text-[#6B6E76]">
            <span>{`Passo ${step} di 5`}</span>
            <button type="button" onClick={hide} className="pointer-events-auto underline">
              Salta la guida
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
