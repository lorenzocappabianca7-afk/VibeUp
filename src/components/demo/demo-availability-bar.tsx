"use client";

import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useDemoLanguage } from "@/context/demo-language-context";
import { useDemoMode } from "@/context/demo-mode-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import {
  DEMO_EVENT_END_TIME,
  DEMO_EVENT_START_TIME,
  quoteForDemoLocation,
  resolveDemoCatalogLocation,
  demoFallbackEventDate,
} from "@/lib/demo/book";
import { scrollDemoPageToTop } from "@/lib/demo/scroll-top";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import type { AvailabilityEventPayload } from "@/types/availability-request";
import type { DemoChosenLocation } from "@/types/demo";
import { EXPLORE_GUEST_MIN } from "@/types/location";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

function formatPartyDate(iso: string, lang: "it" | "en") {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function acceptedSentence(
  name: string,
  dateLabel: string | null,
  lang: "it" | "en",
) {
  if (lang === "en") {
    return dateLabel
      ? `${name} confirmed availability for your party on ${dateLabel}.`
      : `${name} confirmed availability for your party.`;
  }
  return dateLabel
    ? `${name} ha confermato la disponibilità per la tua festa del ${dateLabel}.`
    : `${name} ha confermato la disponibilità per la tua festa.`;
}

export function useDemoAvailabilityTarget(): DemoChosenLocation | null {
  const { isDemoMode, session, selectedLocations, bookingConfirmed } =
    useDemoMode();
  if (!isDemoMode || !session || session.completed || bookingConfirmed) {
    return null;
  }
  return selectedLocations.at(-1) ?? null;
}

export function DemoAvailabilityBar({
  location,
}: {
  location: DemoChosenLocation;
}) {
  const { lang } = useDemoLanguage();
  const { criteria } = usePartyCriteria();
  const { managedListings } = useAppState();
  const { sendAvailabilityRequest } = useAvailabilityRequests();
  const { setDemoBookedLocation, markDemoBookingConfirmed } = useDemoMode();
  const { setTab } = useTabNavigation();
  const [phase, setPhase] = useState<"idle" | "sending" | "accepted">("idle");
  const [error, setError] = useState("");

  useBodyScrollLock(phase === "accepted");

  const chosenDate = criteria.dates[0] ?? criteria.dateFrom ?? "";
  const dateLabel = chosenDate ? formatPartyDate(chosenDate, lang) : null;

  async function handleSend() {
    if (phase !== "idle") return;
    setPhase("sending");
    setError("");
    await new Promise((resolve) => window.setTimeout(resolve, 1200));

    const catalog = resolveDemoCatalogLocation(location.id, managedListings);
    const eventDate = chosenDate || demoFallbackEventDate();
    const guestCount = criteria.guestCount ?? EXPLORE_GUEST_MIN;
    const quote = quoteForDemoLocation(catalog, eventDate, guestCount);
    const eventPayload: AvailabilityEventPayload = {
      title: `Festa da ${location.name}`,
      description: "Preventivo richiesto dalla demo.",
      date: eventDate,
      time: DEMO_EVENT_START_TIME,
      endTime: DEMO_EVENT_END_TIME,
      locationId: location.id,
      locationName: location.name,
      city: catalog?.city ?? "",
      guestCount,
      services: [
        {
          id: "draft-location",
          category: "location",
          name: "Location",
          providerName: location.name,
          status: "confirmed",
          amountPaid: quote.locationCost,
        },
      ],
      totalCost: quote.total,
      depositAmount: quote.depositAmount,
    };

    const result = await sendAvailabilityRequest({
      locationId: location.id,
      locationName: location.name,
      eventPayload,
    });
    if (!result.ok) {
      setError(result.error);
      setPhase("idle");
      return;
    }
    setPhase("accepted");
  }

  async function openEvent() {
    try {
      await setDemoBookedLocation(location);
    } catch {
      // The local event already exists.
    }
    try {
      await markDemoBookingConfirmed();
    } catch {
      // Continua on Eventi still needs the flag when the table write fails.
    }
    scrollDemoPageToTop();
    setTab("events");
  }

  const sheet =
    phase === "accepted" && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center"
            data-overlay-open="true"
          >
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative w-full max-w-md rounded-t-[28px] bg-surface px-5 pt-3 shadow-xl"
              style={{
                paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-request-accepted-title"
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-primary-black/20" />
              <div className="vu-demo-check-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal text-ink-inverse">
                <Check className="h-8 w-8" strokeWidth={2.75} aria-hidden />
              </div>
              <h2
                id="demo-request-accepted-title"
                className="mt-4 text-center font-[family-name:var(--font-brand)] text-[28px] font-bold leading-tight text-primary-black"
              >
                Richiesta accettata!
              </h2>
              <p className="mt-3 text-center text-[17px] leading-snug text-primary-black">
                {acceptedSentence(location.name, dateLabel, lang)}
              </p>
              <p className="mt-3 text-center text-[13px] leading-snug text-primary-black/45">
                Questa è una demo: nessuna richiesta è stata inviata davvero al
                locale.
              </p>
              <button
                type="button"
                onClick={() => void openEvent()}
                className="mt-5 flex h-[50px] w-full items-center justify-center rounded-[14px] bg-brand-pink px-4 text-[17px] font-semibold text-ink-inverse"
              >
                Vedi il tuo evento
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className={cn(
          "vu-demo-request-bar fixed inset-x-0 z-40 mx-auto w-full px-2",
          APP_SHELL_WIDTH_CLASS,
        )}
        style={{
          bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-surface px-3 py-2 shadow-[0_-8px_28px_rgba(0,0,0,0.35)]">
          <p className="min-w-0 flex-1 truncate font-[family-name:var(--font-brand)] text-[17px] font-bold text-primary-black">
            {location.name}
          </p>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={phase !== "idle"}
            className="flex min-h-[50px] min-w-[44px] max-w-[12.5rem] shrink-0 items-center justify-center rounded-[14px] bg-brand-pink px-3 py-2 text-center text-[17px] font-semibold leading-tight text-ink-inverse disabled:opacity-80"
          >
            {phase === "sending" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2
                  className="h-5 w-5 shrink-0 motion-reduce:animate-none animate-spin"
                  aria-hidden
                />
                Invio in corso…
              </span>
            ) : (
              "Invia richiesta di disponibilità"
            )}
          </button>
        </div>
        {error ? (
          <p className="mt-1 px-1 text-center text-xs font-semibold text-brand-pink">
            {error}
          </p>
        ) : null}
      </div>
      {sheet}
    </>
  );
}
