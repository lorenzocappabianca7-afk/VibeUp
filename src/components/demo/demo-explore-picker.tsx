"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { Check, GitCompareArrows } from "lucide-react";

export function DemoExploreGuide() {
  const { isDemoMode, session } = useDemoMode();
  if (!isDemoMode || !session || session.completed) return null;

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-brand-teal/25 bg-brand-teal/10 p-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-teal text-ink-inverse shadow-md"
            aria-hidden
          >
            <Check className="h-4 w-4" strokeWidth={2.75} />
          </span>
          <p className="text-xl font-bold tracking-tight text-primary-black">
            Scegli una location
          </p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-primary-black/75">
          Tocca il cerchio in alto a destra sulla foto. Puoi sceglierne una
          sola: se ne tocchi un&apos;altra, la selezione si sposta.
        </p>
      </section>
      <section className="rounded-2xl border border-primary-black/10 bg-surface p-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-teal-strong text-ink-inverse shadow-md"
            aria-hidden
          >
            <GitCompareArrows className="h-4 w-4" strokeWidth={2.75} />
          </span>
          <p className="text-xl font-bold tracking-tight text-primary-black">
            Confronta
          </p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-primary-black/75">
          Puoi anche usare Confronta in alto a destra (o il tasto sotto la
          card). Aggiungi due o tre locali, poi apri la tab{" "}
          <span className="font-semibold">Confronta</span> sopra l’elenco: vedi
          prezzi e servizi uno accanto all’altro, senza entrare in ogni pagina.
        </p>
      </section>
    </div>
  );
}
