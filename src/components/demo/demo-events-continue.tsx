"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import {
  DEMO_SERVICE_ADDED_EVENT,
  readDemoAddedService,
} from "@/lib/demo/added-service";
import { demoMissingServiceIds } from "@/lib/demo/missing-services";
import { scrollDemoPageToTop } from "@/lib/demo/scroll-top";
import { isDemoGuideSkipped } from "@/lib/demo/session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DemoEventsContinueBar() {
  const { isDemoMode, session, bookingConfirmed, bookedLocation, selectedLocations } =
    useDemoMode();
  const { criteria } = usePartyCriteria();
  const router = useRouter();
  const [skipped, setSkipped] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!session) return;
    setSkipped(isDemoGuideSkipped(session.id));
    setAdded(Boolean(readDemoAddedService(session.id)));
    const onSkip = () => setSkipped(true);
    const onAdded = () => setAdded(true);
    window.addEventListener("vibeup-demo-guide-skip", onSkip);
    window.addEventListener(DEMO_SERVICE_ADDED_EVENT, onAdded);
    return () => {
      window.removeEventListener("vibeup-demo-guide-skip", onSkip);
      window.removeEventListener(DEMO_SERVICE_ADDED_EVENT, onAdded);
    };
  }, [session]);

  useEffect(() => {
    if (!isDemoMode || !bookingConfirmed) return;
    router.prefetch("/demo/rating");
  }, [bookingConfirmed, isDemoMode, router]);

  const nothingToAdd =
    demoMissingServiceIds({
      locationId: bookedLocation?.id ?? selectedLocations.at(-1)?.id ?? null,
      wizardServices: criteria.partyServices,
    }).length === 0;

  if (!isDemoMode || !session || session.completed || !bookingConfirmed) {
    return null;
  }
  if (!added && !nothingToAdd && !skipped) return null;

  return (
    <div className="sticky bottom-24 z-20 sm:bottom-28">
      <div className="rounded-2xl border border-brand-teal/30 bg-surface/95 px-4 py-3 shadow-[0_10px_30px_-12px_rgba(62,207,207,0.9)] backdrop-blur-md">
        <p className="text-center text-sm font-bold text-primary-black">
          Evento confermato
        </p>
        <p className="mt-1 text-center text-xs text-primary-black/55">
          Dai un&apos;occhiata al riepilogo, poi continua.
        </p>
        <button
          type="button"
          onClick={() => {
            scrollDemoPageToTop();
            router.push("/demo/rating", { scroll: true });
          }}
          className="mt-3 flex w-full items-center justify-center rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink-inverse"
        >
          Continua
        </button>
      </div>
    </div>
  );
}
