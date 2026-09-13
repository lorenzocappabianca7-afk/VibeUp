"use client";

import { useDemoMode } from "@/context/demo-mode-context";
import { scrollDemoPageToTop } from "@/lib/demo/scroll-top";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function DemoEventsContinueBar() {
  const { isDemoMode, session, bookingConfirmed } = useDemoMode();
  const router = useRouter();

  useEffect(() => {
    if (!isDemoMode || !bookingConfirmed) return;
    router.prefetch("/demo/rating");
  }, [bookingConfirmed, isDemoMode, router]);

  if (!isDemoMode || !session || session.completed || !bookingConfirmed) {
    return null;
  }

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
