"use client";

import { BookingSummary } from "@/components/location/booking-summary";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useDemoMode } from "@/context/demo-mode-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { calculateLocationDeposit } from "@/lib/booking-money";
import { demoFallbackEventDate, resolveDemoCatalogLocation } from "@/lib/demo/book";
import { calculateBookingQuote, calculateHours } from "@/lib/location";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import type { AvailabilityEventPayload } from "@/types/availability-request";
import type { DemoChosenLocation } from "@/types/demo";
import type { BookingQuote, Location } from "@/types/location";
import { EXPLORE_GUEST_MIN } from "@/types/location";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const START_TIME = "18:00";
const END_TIME = "23:00";

function emptyQuote(): BookingQuote {
  return {
    hours: 0,
    locationCost: 0,
    extrasCost: 0,
    drinksCost: 0,
    total: 0,
    depositAmount: 0,
  };
}

function quoteForLocation(
  location: Location | undefined,
  date: string,
  guestCount: number,
): BookingQuote {
  if (!location) {
    const locationCost = 800;
    return {
      hours: calculateHours(START_TIME, END_TIME),
      locationCost,
      extrasCost: 0,
      drinksCost: 0,
      total: locationCost,
      depositAmount: calculateLocationDeposit(locationCost),
    };
  }

  const quote = calculateBookingQuote({
    hourlyPrice: location.hourlyPrice,
    startTime: START_TIME,
    endTime: END_TIME,
    selectedExtras: [],
    guestCount,
    location,
    date,
  });
  if (quote.total > 0) return quote;

  const locationCost = Math.max(location.hourlyPrice * quote.hours, 800);
  return {
    ...quote,
    hours: quote.hours || calculateHours(START_TIME, END_TIME),
    locationCost,
    total: locationCost,
    depositAmount: calculateLocationDeposit(locationCost),
  };
}

export function DemoBookPage() {
  const {
    isDemoMode,
    session,
    selectedLocations,
    bookedLocation,
    bookingConfirmed,
    setDemoBookedLocation,
    markDemoBookingConfirmed,
    landingState,
  } = useDemoMode();
  const { managedListings } = useAppState();
  const { criteria } = usePartyCriteria();
  const { sendAvailabilityRequest } = useAvailabilityRequests();
  const [pickedId, setPickedId] = useState(bookedLocation?.id ?? "");
  const [eventTitle, setEventTitle] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!bookedLocation?.id) return;
    setPickedId((current) => current || bookedLocation.id);
  }, [bookedLocation]);

  const picks = selectedLocations;
  const picked =
    picks.find((item) => item.id === pickedId) ?? bookedLocation ?? null;
  const location = picked
    ? resolveDemoCatalogLocation(picked.id, managedListings)
    : undefined;

  const date = criteria.dates[0] ?? criteria.dateFrom ?? demoFallbackEventDate();
  const guestCount = criteria.guestCount ?? EXPLORE_GUEST_MIN;
  const quote = useMemo(
    () => (picked ? quoteForLocation(location, date, guestCount) : emptyQuote()),
    [date, guestCount, location, picked],
  );
  const defaultTitle = picked ? `Festa da ${picked.name}` : "La mia festa";
  const quoteReady = Boolean(picked) && quote.total > 0 && date.length > 0;

  if (!isDemoMode || landingState === "completed" || !session) return null;

  async function handlePick(locationPick: DemoChosenLocation) {
    setPickedId(locationPick.id);
    setRequestError(null);
    try {
      await setDemoBookedLocation(locationPick);
    } catch {
      // Local session already has the choice; table write can retry on send.
    }
  }

  async function handleSend() {
    if (!picked || sending || bookingConfirmed) return;
    setSending(true);
    setRequestError(null);

    const title = eventTitle.trim() || defaultTitle;
    const eventPayload: AvailabilityEventPayload = {
      title,
      description: "Preventivo richiesto dalla demo.",
      date,
      time: START_TIME,
      endTime: END_TIME,
      locationId: picked.id,
      locationName: picked.name,
      city: location?.city ?? "",
      guestCount,
      services: [
        {
          id: "draft-location",
          category: "location",
          name: "Location",
          providerName: picked.name,
          status: "confirmed",
          amountPaid: quote.locationCost,
        },
      ],
      totalCost: quote.total,
      depositAmount: quote.depositAmount,
    };

    const result = await sendAvailabilityRequest({
      locationId: picked.id,
      locationName: picked.name,
      eventPayload,
    });

    if (!result.ok) {
      setRequestError(result.error);
      setSending(false);
      return;
    }

    try {
      await markDemoBookingConfirmed();
    } catch {
      // Event is already created locally; rating can still proceed.
    }

    window.location.assign("/?tab=events");
  }

  return (
    <div
      className={cn(APP_SHELL_WIDTH_CLASS, "mx-auto min-h-dvh px-6 py-10")}
    >
      <button
        type="button"
        onClick={() => window.location.assign("/?tab=explore")}
        className="text-xs font-bold text-primary-black/45"
      >
        ← Torna a Esplora
      </button>

      <h1 className="mt-6 text-2xl font-bold text-primary-black">
        Quale di queste vorresti provare a prenotare?
      </h1>
      <p className="mt-2 text-sm text-primary-black/60">
        Le tre preferenze restano salvate. Qui ne scegli solo una per simulare
        la richiesta di disponibilità.
      </p>

      <ul className="mt-6 space-y-2">
        {picks.map((item) => {
          const selected = picked?.id === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void handlePick(item)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-brand-teal bg-brand-teal/15"
                    : "border-primary-black/10 bg-surface",
                )}
              >
                <span className="text-sm font-bold text-primary-black">
                  {item.name}
                </span>
                {selected ? (
                  <Check
                    className="h-4 w-4 shrink-0 text-brand-teal"
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {picked ? (
        <div className="mt-8">
          <BookingSummary
            quote={quote}
            hourlyPrice={location?.hourlyPrice ?? 0}
            isReady={quoteReady}
            quoteGenerated={quoteReady}
            quoteNeedsRefresh={false}
            eventTitle={eventTitle}
            eventTitlePlaceholder={defaultTitle}
            onEventTitleChange={setEventTitle}
            onSendRequest={() => {
              if (!sending) void handleSend();
            }}
            requestError={requestError}
          />
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-primary-black/50">
          Seleziona una location per inviare la richiesta.
        </p>
      )}

      {bookingConfirmed ? (
        <Button
          className="mt-6 w-full rounded-2xl py-4 text-base font-semibold"
          onClick={() => window.location.assign("/?tab=events")}
        >
          Vai ai miei eventi
        </Button>
      ) : null}
    </div>
  );
}
