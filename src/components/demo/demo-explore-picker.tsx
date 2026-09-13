"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { DEMO_PICK_LIMIT } from "@/lib/demo/session";
import { GitCompareArrows, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DemoExploreGuide() {
  const { isDemoMode, session } = useDemoMode();
  if (!isDemoMode || !session || session.completed) return null;

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-brand-teal/25 bg-brand-teal/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-teal">
          Scegli 3 location
        </p>
        <p className="mt-2 text-sm leading-relaxed text-primary-black/75">
          Tocca il{" "}
          <Heart
            className="inline-block h-3.5 w-3.5 align-[-2px] text-brand-pink"
            strokeWidth={2.75}
            aria-hidden
          />{" "}
          cuore in alto a destra su ogni card. Devi selezionarne tre per
          continuare.
        </p>
      </section>
      <section className="rounded-2xl border border-primary-black/10 bg-surface p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-teal">
          Confronta
        </p>
        <p className="mt-2 text-sm leading-relaxed text-primary-black/75">
          Puoi anche usare{" "}
          <GitCompareArrows
            className="inline-block h-3.5 w-3.5 align-[-2px] text-brand-teal"
            strokeWidth={2.75}
            aria-hidden
          />{" "}
          Confronta in alto a destra (o il tasto sotto la card). Aggiungi due o
          tre locali, poi apri la tab <span className="font-semibold">Confronta</span>{" "}
          sopra l’elenco: vedi prezzi e servizi uno accanto all’altro, senza
          entrare in ogni pagina.
        </p>
      </section>
    </div>
  );
}

export function DemoExplorePickerBar({ availableCount }: { availableCount: number }) {
  const { isDemoMode, selectedLocations, session, persistDemoSelections } =
    useDemoMode();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    router.prefetch("/demo/book");
  }, [router]);

  if (!isDemoMode || !session || session.completed) return null;

  const target = Math.min(DEMO_PICK_LIMIT, availableCount);
  if (target <= 0) return null;

  const selected = selectedLocations.length;
  const canConfirm = selected >= target;

  function handleConfirm() {
    if (!canConfirm || confirming) return;
    setConfirming(true);
    void persistDemoSelections().catch(() => {
      // The 3 picks stay in the local session even if the table write fails.
    });
    router.push("/demo/book");
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
            onClick={handleConfirm}
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
