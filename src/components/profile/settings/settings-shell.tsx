"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface SettingsShellProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function SettingsShell({
  title,
  subtitle,
  onBack,
  children,
  footer,
}: SettingsShellProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [title]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <div className="flex min-h-[min(70dvh,640px)] min-w-0 flex-col">
      <header className="sticky top-0 z-10 -mx-1 mb-4 border-b border-primary-black/8 bg-background/95 px-1 pb-3 pt-1 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-black/10 bg-background text-primary-black transition-colors hover:bg-primary-black/[0.04]"
            aria-label="Torna indietro"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black text-primary-black">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-primary-black/50">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="min-w-0 flex-1 space-y-5 pb-4">{children}</div>

      {footer && (
        <div className="mt-auto border-t border-primary-black/8 pt-4">{footer}</div>
      )}
    </div>
  );
}
