"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { normalizeCustomVenueName } from "@/lib/demo/custom-venue";
import { MapPin } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

export function DemoCustomVenueBox() {
  const { customVenue, selectedLocations, confirmCustomVenue } = useDemoMode();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = selectedLocations.at(-1);
  const active =
    customVenue && selected?.id === "custom-venue" && selected.name === customVenue.name
      ? customVenue
      : null;
  const trimmed = draft.trim();

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const result = normalizeCustomVenueName(draft);
    if (!result.ok) {
      setError(
        result.reason === "long"
          ? "Il nome può avere al massimo 60 caratteri."
          : result.reason === "link"
            ? "Scrivi solo il nome del locale, senza link."
            : "",
      );
      return;
    }
    setError("");
    confirmCustomVenue(result.name);
    setDraft(result.name);
  }

  function beginEdit() {
    if (!active) return;
    setDraft(active.name);
    setError("");
    inputRef.current?.focus();
  }

  return (
    <section className="rounded-[16px] border border-[#2A2C33] bg-[#1A1C21] p-4">
      <h2 className="text-[16px] font-semibold leading-snug text-primary-black">
        Non trovi il posto che cerchi?
      </h2>
      <p className="mt-1 text-[14px] leading-snug text-[#A1A3AB]">
        Scrivi qui il nome: lo aggiungeremo a VibeUp. Intanto puoi continuare la
        demo con questo posto.
      </p>
      <form className="mt-3 flex items-center gap-2" onSubmit={submit}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError("");
          }}
          placeholder="Nome del locale"
          maxLength={80}
          aria-label="Nome del locale"
          className="h-[50px] min-w-0 flex-1 rounded-[14px] border border-[#2A2C33] bg-background px-3 text-primary-black outline-none placeholder:text-primary-black/35 focus:border-brand-teal"
          style={{ fontSize: 17 }}
        />
        <button
          type="submit"
          disabled={trimmed.length < 2}
          className="h-[50px] shrink-0 rounded-[14px] bg-[#F091B2] px-4 text-[15px] font-semibold text-[#0F1115] disabled:opacity-40"
        >
          Conferma
        </button>
      </form>
      {error ? (
        <p className="mt-2 text-sm text-brand-pink" role="alert">
          {error}
        </p>
      ) : null}
      {active ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-brand-teal bg-background p-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-teal/15 text-brand-teal">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary-black">
              <span>Il tuo posto</span>
              {": "}
              {active.name}
            </p>
            <p className="mt-0.5 text-xs font-bold text-brand-teal">Da definire</p>
          </div>
          <button
            type="button"
            onClick={beginEdit}
            className="shrink-0 text-sm font-semibold text-brand-pink underline"
          >
            Cambia
          </button>
        </div>
      ) : null}
    </section>
  );
}
