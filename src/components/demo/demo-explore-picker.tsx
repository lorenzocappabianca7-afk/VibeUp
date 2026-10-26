"use client";

import { useDemoMode } from "@/context/demo-mode-context";

export function DemoExploreGuide() {
  const { isDemoMode, session } = useDemoMode();
  if (!isDemoMode || !session || session.completed) return null;

  return (
    <div>
      <p className="text-xl font-bold tracking-tight text-primary-black">
        Scegli una location
      </p>
      <p className="mt-1 text-[16px] font-semibold leading-snug text-[#F5F5F7]">
        Scegli la location che ti si addice di più cliccandoci sopra
      </p>
      <p className="mt-3 text-[13px] font-medium leading-[1.25] text-primary-black/80">
        Aggiungi 2-3 locali con «Confronta» sotto la card, poi apri la tab Confronta per vederli affiancati.
      </p>
    </div>
  );
}
