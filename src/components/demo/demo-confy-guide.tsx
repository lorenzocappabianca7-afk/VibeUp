"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { DEMO_NUDGE_EVENT, requestDemoNudge } from "@/lib/demo/nudge";
import { isDemoGuideSkipped, skipDemoGuide } from "@/lib/demo/session";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

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
    title: "Ecco la tua festa!",
    body: "Tocca «Continua» per dirci cosa ne pensi.",
  },
] as const;

function guideStep(input: {
  bookingConfirmed: boolean;
  hasLocation: boolean;
  hasAppliedCriteria: boolean;
}) {
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
  const { isDemoMode, session, bookingConfirmed } = useDemoMode();
  const { hasAppliedCriteria } = usePartyCriteria();
  const locked = isDemoMode && Boolean(session) && !session?.completed && !bookingConfirmed && !hasAppliedCriteria;
  if (!locked) return <div className={className}>{children}</div>;

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none opacity-30 select-none">{children}</div>
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Prima crea la tua festa"
        onClick={() => requestDemoNudge()}
      />
    </div>
  );
}

export function DemoConfyGuide() {
  const { isDemoMode, session, bookingConfirmed, selectedLocations } = useDemoMode();
  const { hasAppliedCriteria } = usePartyCriteria();
  const [skipped, setSkipped] = useState(true);
  const [ready, setReady] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [hop, setHop] = useState(0);

  useEffect(() => {
    if (!session) return;
    setSkipped(isDemoGuideSkipped(session.id));
    setReady(true);
  }, [session]);

  useEffect(() => {
    const onNudge = () => {
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

  if (!ready || !isDemoMode || !session || session.completed) return null;
  if (skipped && !nudge) return null;

  const step = guideStep({
    bookingConfirmed,
    hasLocation: selectedLocations.length > 0,
    hasAppliedCriteria,
  });
  const message = nudge
    ? { title: "Prima crea la tua festa 👆", body: "" }
    : STEPS[step - 1];
  const bottom =
    step === 4
      ? "calc(16rem + env(safe-area-inset-bottom, 0px))"
      : step === 3
        ? "calc(11.25rem + env(safe-area-inset-bottom, 0px))"
        : "calc(5.4rem + env(safe-area-inset-bottom, 0px))";

  function hide() {
    if (!session) return;
    skipDemoGuide(session.id);
    setSkipped(true);
    setNudge(false);
  }

  return (
    <div
      className="vu-confy-in pointer-events-none fixed inset-x-0 z-[58] mx-auto flex w-full max-w-[430px] items-end px-4"
      style={{ bottom }}
    >
      <img
        key={hop}
        src="/demo/confy.svg"
        alt=""
        aria-hidden
        width={112}
        height={112}
        className={cn("h-28 w-28 shrink-0", hop > 0 && "vu-confy-hop")}
        style={{ marginRight: -14 }}
      />
      <div className="pointer-events-auto relative mb-[18px] min-w-0 flex-1 rounded-[18px] rounded-bl-[6px] bg-[#F5F5F7] px-4 py-3.5 text-[#0F1115] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7)]">
        <button
          type="button"
          onClick={hide}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-[#6B6E76]"
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
            <span>Passo {step} di 4</span>
            <button type="button" onClick={hide} className="underline">
              Salta la guida
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
