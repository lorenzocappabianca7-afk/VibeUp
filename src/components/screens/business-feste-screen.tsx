"use client";

import { ManagerVenueCheckupBoard } from "@/components/business/manager-venue-checkup-board";
import { memo } from "react";

export const BusinessFesteScreen = memo(function BusinessFesteScreen() {
  return (
    <div className="min-w-0 space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-primary-black">Feste</h1>
          <span className="rounded-md bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            Pro
          </span>
        </div>
        <p className="mt-1 text-sm text-primary-black/60">
          Recap dei dati ricevuti dagli organizzatori, in ordine di data più
          vicina.
        </p>
      </header>
      <ManagerVenueCheckupBoard />
    </div>
  );
});
