"use client";

import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/context/demo-mode-context";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
  const [wouldUse, setWouldUse] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = rating !== null && wouldUse !== null && !submitting;

  const locationNames = useMemo(
    () => selectedLocations.map((item) => item.name).join(", "),
    [selectedLocations],
  );

  if (!isDemoMode || landingState === "completed") return null;

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
        onClick={() => router.push("/?tab=explore")}
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

      {locationNames ? (
        <p className="mt-4 rounded-2xl border border-primary-black/10 bg-surface px-4 py-3 text-sm text-primary-black/70">
          Location scelte: {locationNames}
        </p>
      ) : null}

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold text-primary-black">
          Quanto ti è piaciuta l’app?
        </legend>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-2xl text-sm font-bold transition-colors",
                rating === value
                  ? "bg-brand-teal text-ink-inverse"
                  : "bg-surface text-primary-black/70 ring-1 ring-primary-black/10",
              )}
              aria-pressed={rating === value}
            >
              {value}
            </button>
          ))}
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
