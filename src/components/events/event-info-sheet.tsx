"use client";

import { MODAL_SAFE_BOTTOM_STYLE } from "@/lib/utils";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function EventInfoSheet({
  open,
  title,
  intro,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  intro?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[70] flex items-end justify-center lg:items-center"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Chiudi pannello"
      />
      <div
        className="vibe-sheet-enter smooth-scroll relative max-h-[min(90dvh,calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px)))] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-surface p-5 shadow-xl lg:rounded-[2rem]"
        style={MODAL_SAFE_BOTTOM_STYLE}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-info-sheet-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="event-info-sheet-title"
              className="text-xl font-black text-primary-black"
            >
              {title}
            </h2>
            {intro ? (
              <p className="mt-1 text-sm text-primary-black/60">{intro}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary-black/5 p-2 text-primary-black/60 transition-colors hover:bg-primary-black/10"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
