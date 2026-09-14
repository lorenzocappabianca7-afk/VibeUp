"use client";

import { Button } from "@/components/ui/button";
import { DemoBookingSpeedCard } from "@/components/demo/demo-booking-speed-card";
import { useDemoMode } from "@/context/demo-mode-context";
import { scrollDemoPageToTop } from "@/lib/demo/scroll-top";
import { pushHomeHref } from "@/lib/home-navigation";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

export function DemoRatingPage() {
  const {
    isDemoMode,
    session,
    selectedLocations,
    completeDemoSession,
    landingState,
  } = useDemoMode();
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [wouldUse, setWouldUse] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    scrollDemoPageToTop();
  }, []);

  const canSubmit = rating !== null && wouldUse !== null && !submitting;
  const previewRating = hoverRating ?? rating;

  if (!isDemoMode || landingState === "completed") return null;
  if (!session?.bookingConfirmed) return null;

  async function handleSubmit() {
    if (rating === null || wouldUse === null || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await completeDemoSession({
        selectedLocations,
        rating,
        wouldUseForEighteenth: wouldUse,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Non riesco a inviare il feedback. Riprova.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        APP_SHELL_WIDTH_CLASS,
        "mx-auto min-h-dvh px-6 py-10",
      )}
    >
      <button
        type="button"
        onClick={() => pushHomeHref(router, "/?tab=explore")}
        className="text-xs font-bold text-primary-black/45"
      >
        ← Torna a Esplora
      </button>

      <h1 className="mt-6 text-2xl font-bold text-primary-black">
        Com’è andata?
      </h1>
      <p className="mt-2 text-sm text-primary-black/60">
        Un attimo per dirci cosa ne pensi. Poi la demo è conclusa.
      </p>

      <DemoBookingSpeedCard
        firstName={session.firstName}
        startedAt={session.sessionCreatedAt}
        endedAt={session.bookingConfirmedAt}
      />

      <fieldset className="mt-8">
        <legend className="text-base font-bold leading-snug text-primary-black">
          Valuta la tua esperienza demo di VibeUp da 1 a 5 stelle
        </legend>
        <div
          className="mt-4 flex items-center justify-center gap-1.5 sm:gap-2"
          onPointerLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = previewRating !== null && value <= previewRating;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onPointerEnter={() => setHoverRating(value)}
                className="flex h-12 w-12 items-center justify-center rounded-full touch-feedback"
                style={{ color: filled ? "#f091b2" : "rgba(245, 245, 247, 0.28)" }}
                aria-label={`${value} ${value === 1 ? "stella" : "stelle"}`}
                aria-pressed={rating !== null && value <= rating}
              >
                <Star
                  className="h-9 w-9"
                  fill={filled ? "#f091b2" : "none"}
                  stroke={filled ? "#f091b2" : "currentColor"}
                  strokeWidth={1.6}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-primary-black">
          La useresti per organizzare il tuo diciottesimo?
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setWouldUse(true)}
            className={cn(
              "rounded-2xl py-3 text-sm font-bold transition-colors",
              wouldUse === true
                ? "bg-brand-teal text-ink-inverse"
                : "bg-surface text-primary-black/70 ring-1 ring-primary-black/10",
            )}
            aria-pressed={wouldUse === true}
          >
            Sì
          </button>
          <button
            type="button"
            onClick={() => setWouldUse(false)}
            className={cn(
              "rounded-2xl py-3 text-sm font-bold transition-colors",
              wouldUse === false
                ? "bg-paper text-ink-inverse"
                : "bg-surface text-primary-black/70 ring-1 ring-primary-black/10",
            )}
            aria-pressed={wouldUse === false}
          >
            No
          </button>
        </div>
      </fieldset>

      {error ? (
        <p className="mt-4 text-xs font-medium text-brand-pink">{error}</p>
      ) : null}

      <Button
        type="button"
        className="mt-8 w-full"
        disabled={!canSubmit || !session}
        onClick={handleSubmit}
      >
        {submitting ? "Invio…" : "Invia"}
      </Button>

      {!session ? (
        <p className="mt-4 text-center text-xs text-primary-black/45">
          Sessione demo non trovata.
        </p>
      ) : null}
    </div>
  );
}
