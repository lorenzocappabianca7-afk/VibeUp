"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { DEMO_PICK_LIMIT } from "@/lib/demo/session";
import { useState } from "react";

export function DemoExplorePickerBar({ availableCount }: { availableCount: number }) {
  const { isDemoMode, selectedLocations, session, persistDemoSelections } =
    useDemoMode();
  const [confirming, setConfirming] = useState(false);

  if (!isDemoMode || !session || session.completed) return null;

  const target = Math.min(DEMO_PICK_LIMIT, availableCount);
  if (target <= 0) return null;

  const selected = selectedLocations.length;
  const canConfirm = selected >= target;

  async function handleConfirm() {
    if (!canConfirm || confirming) return;
    setConfirming(true);
    try {
      await persistDemoSelections();
    } catch {
      // The 3 picks stay in the local session even if the table write fails.
    }
    window.location.assign("/demo/book");
  }

  return (
    <div className="sticky bottom-24 z-20 sm:bottom-28">
      <div className="rounded-2xl border border-brand-teal/30 bg-surface/95 px-4 py-3 shadow-[0_10px_30px_-12px_rgba(62,207,207,0.9)] backdrop-blur-md">
        <p className="text-center text-sm font-bold text-primary-black">
          {selected}/{target} selezionate
        </p>
        {canConfirm ? (
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={confirming}
            className="mt-3 flex w-full items-center justify-center rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink-inverse disabled:opacity-70"
          >
            {confirming ? "Salvo le scelte…" : "Conferma scelte"}
          </button>
        ) : (
          <p className="mt-1 text-center text-xs text-primary-black/50">
            Scegli {target === 1 ? "la location" : `${target} location`} con il
            cuore
          </p>
        )}
      </div>
    </div>
  );
}
