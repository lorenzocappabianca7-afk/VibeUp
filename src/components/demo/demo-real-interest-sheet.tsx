"use client";

import { useDemoLanguage } from "@/context/demo-language-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { readDemoSignupId } from "@/lib/demo/signup-gate";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Channel = "whatsapp" | "email";

const CONSENT = {
  whatsapp: "Acconsento a essere contattato da VibeUp su WhatsApp per organizzare questa festa.",
  email: "Acconsento a essere contattato da VibeUp via email per organizzare questa festa.",
} as const;

export function DemoRealInterestSheet({
  locationName,
  locationId,
  dateLabel,
  partyDate,
  guestCount,
  onSeeEvent,
}: {
  locationName: string;
  locationId: string;
  dateLabel: string | null;
  partyDate: string;
  guestCount: number;
  onSeeEvent: () => void;
}) {
  const { lang } = useDemoLanguage();
  const { criteria } = usePartyCriteria();
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [consent, setConsent] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [phase, setPhase] = useState<"form" | "saving" | "saved">("form");
  const [error, setError] = useState("");
  const sending = useRef(false);

  useEffect(() => {
    const signupId = readDemoSignupId();
    if (!signupId) return;
    let cancelled = false;
    void fetch("/api/demo/real-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: true, signupId }),
    })
      .then(async (response) => {
        const body = (await response.json()) as { phoneMasked?: string; emailMasked?: string };
        if (!response.ok || cancelled) return;
        setPhoneMasked(body.phoneMasked ?? "");
        setEmailMasked(body.emailMasked ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const guests = guestCount || criteria.guestCount || 0;
  const when = dateLabel ?? partyDate;
  const interest = lang === "en"
    ? `We'll check ${locationName}'s real availability for your date and get back to you.`
    : `Verifichiamo la disponibilità reale di ${locationName} per la tua data e ti scriviamo noi.`;
  const masked = channel === "whatsapp" ? phoneMasked : emailMasked;

  async function submit() {
    if (!consent || sending.current) return;
    const signupId = readDemoSignupId();
    if (!signupId || !partyDate) {
      setError("Non riesco a salvare la richiesta. Riprova.");
      return;
    }
    sending.current = true;
    setPhase("saving");
    setError("");
    try {
      const response = await fetch("/api/demo/real-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupId,
          locationId,
          locationName,
          partyDate,
          guestCount: guests,
          channel,
          consent: true,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        sending.current = false;
        setPhase("form");
        if (body.error === "already") {
          setError("Hai già chiesto questa location per la stessa data.");
          return;
        }
        if (body.error === "phone_missing") {
          setError("Aggiungi un telefono in iscrizione per WhatsApp, oppure scegli l'email.");
          return;
        }
        if (body.error === "consent_required") {
          setError("Spunta il consenso per continuare.");
          return;
        }
        setError("Non riesco a salvare la richiesta. Riprova.");
        return;
      }
      setPhase("saved");
    } catch {
      sending.current = false;
      setPhase("form");
      setError("Non riesco a salvare la richiesta. Riprova.");
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center" data-overlay-open="true">
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-[#2A2C33] bg-[#1A1C21] px-5 pt-2.5 text-[#F5F5F7]"
        style={{ paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom, 0px))" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-request-accepted-title"
      >
        <div className="mx-auto mb-4 h-[5px] w-9 rounded-full bg-[#3A3C44]" />
        <div className="vu-demo-check-pop mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#3ECFCF] text-[#0F1115]">
          <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
        </div>
        <h2 id="demo-request-accepted-title" className="mt-3 text-center font-[family-name:var(--font-brand)] text-xl font-extrabold">
          Richiesta accettata!
        </h2>
        <p className="mt-1 text-center text-[13px] text-[#A1A3AB]">
          {locationName}{when ? ` · ${when}` : ""}
        </p>
        <p className="mt-2 text-center text-xs text-[#6B6E76]">
          Questa è una demo: nessuna richiesta è stata inviata al locale.
        </p>

        {phase === "saved" ? (
          <div className="mt-6">
            <p className="text-center font-[family-name:var(--font-brand)] text-lg font-extrabold">
              Fatto! Ti scriveremo presto.
            </p>
            <button
              type="button"
              onClick={onSeeEvent}
              className="mt-4 flex h-[50px] w-full items-center justify-center rounded-[14px] bg-[#F091B2] font-[family-name:var(--font-brand)] text-[17px] font-bold text-[#0F1115]"
            >
              Vedi il tuo evento
            </button>
          </div>
        ) : (
          <>
            <div className="my-4 h-px bg-[#2A2C33]" />
            <div className="flex items-start gap-3">
              <img src="/demo/confy.svg" alt="" aria-hidden width={52} height={52} className="h-[52px] w-[52px] shrink-0" />
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-brand)] text-[17px] font-extrabold leading-snug">
                  Vuoi organizzare la tua festa davvero con VibeUp?
                </p>
                <p className="mt-1 text-[13px] leading-snug text-[#A1A3AB]">{interest}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-bold">Dove preferisci essere contattato?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["whatsapp", "email"] as const).map((item) => {
                const selected = channel === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setChannel(item);
                      setConsent(false);
                    }}
                    className={
                      selected
                        ? "flex h-[46px] items-center justify-center rounded-xl border-2 border-[#3ECFCF] bg-[#12262A] text-sm font-semibold"
                        : "flex h-[46px] items-center justify-center rounded-xl border border-[#2A2C33] text-sm font-semibold text-[#C9CAD0]"
                    }
                  >
                    {item === "whatsapp" ? "WhatsApp" : "Email"}
                  </button>
                );
              })}
            </div>
            {masked ? <p className="mt-2 text-center text-xs text-[#A1A3AB]">{masked}</p> : null}
            <label className="mt-4 flex items-start gap-3 text-[13px] leading-snug text-[#C9CAD0]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-[22px] w-[22px] shrink-0 rounded-md accent-[#3ECFCF]"
              />
              <span>{CONSENT[channel]}</span>
            </label>
            {error ? <p className="mt-2 text-center text-xs text-[#F091B2]">{error}</p> : null}
            <button
              type="button"
              disabled={!consent || phase === "saving"}
              onClick={() => void submit()}
              className="mt-4 flex h-[50px] w-full items-center justify-center rounded-[14px] bg-[#F091B2] font-[family-name:var(--font-brand)] text-[17px] font-bold text-[#0F1115] disabled:opacity-40"
            >
              {phase === "saving" ? "Invio in corso…" : "Sì, contattatemi"}
            </button>
            <button type="button" onClick={onSeeEvent} className="mt-3 w-full text-center text-[15px] text-[#A1A3AB] underline">
              No grazie, vedi il tuo evento
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
