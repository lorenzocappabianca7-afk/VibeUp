"use client";

import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useDemoLanguage } from "@/context/demo-language-context";
import { useDemoMode } from "@/context/demo-mode-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { DemoRealInterestSheet } from "@/components/demo/demo-real-interest-sheet";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import {
  DEMO_EVENT_END_TIME,
  DEMO_EVENT_START_TIME,
  quoteForDemoLocation,
  resolveDemoCatalogLocation,
  demoFallbackEventDate,
} from "@/lib/demo/book";
import { scrollDemoPageToTop } from "@/lib/demo/scroll-top";
import { markDemoStep } from "@/lib/demo/steps";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import type { AvailabilityEventPayload } from "@/types/availability-request";
import type { DemoChosenLocation } from "@/types/demo";
import { EXPLORE_GUEST_MIN } from "@/types/location";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { formatLongDate } from "@/lib/locale/format";

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
  const { lang, t } = useDemoLanguage();
  const { criteria } = usePartyCriteria();
  const { managedListings } = useAppState();
  const { sendAvailabilityRequest } = useAvailabilityRequests();
  const { setDemoBookedLocation, markDemoBookingConfirmed } = useDemoMode();
  const { setTab } = useTabNavigation();
  const [phase, setPhase] = useState<"idle" | "sending" | "accepted">("idle");
  const [error, setError] = useState("");

  useBodyScrollLock(phase === "accepted");

  const chosenDate = criteria.dates[0] ?? criteria.dateFrom ?? "";
  const dateLabel = chosenDate ? formatLongDate(lang, chosenDate) : null;

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
    markDemoStep("request");
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
    phase === "accepted" ? (
      <DemoRealInterestSheet
        locationName={location.name}
        locationId={location.id}
        dateLabel={dateLabel}
        partyDate={chosenDate || demoFallbackEventDate()}
        guestCount={criteria.guestCount ?? EXPLORE_GUEST_MIN}
        onSeeEvent={() => void openEvent()}
      />
    ) : null;

  return (
    <>
      <div
        className={cn(
          "vu-demo-request-bar fixed inset-x-0 z-[55] mx-auto w-full px-2",
          APP_SHELL_WIDTH_CLASS,
        )}
        style={{
          bottom: "calc(5.15rem + env(safe-area-inset-bottom, 0px))",
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
                {t("Invio in corso…")}
              </span>
            ) : (
              t("Invia richiesta di disponibilità")
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
