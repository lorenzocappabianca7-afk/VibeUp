"use client";

import { DemoLanguageSwitch } from "@/components/demo/demo-language-switch";
import { Button } from "@/components/ui/button";
import { leaveDemoForSite, useDemoMode } from "@/context/demo-mode-context";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";

export function DemoLanding() {
  const { landingState, bootError } = useDemoMode();
  const blocking = landingState === "completed" || landingState === "error";
  useBodyScrollLock(blocking);

  function leaveDemo() {
    leaveDemoForSite();
  }

  if (!blocking) return null;

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-background"
      data-overlay-open="true"
    >
      <div
        className={cn(
          APP_SHELL_WIDTH_CLASS,
          "relative mx-auto flex min-h-dvh flex-col justify-center px-6 py-12",
        )}
      >
        <div
          className="absolute z-[95]"
          style={{
            top: "max(0.75rem, env(safe-area-inset-top, 0px))",
            right: "max(0.75rem, env(safe-area-inset-right, 0px))",
          }}
        >
          <DemoLanguageSwitch />
        </div>
        {landingState === "error" ? (
          <div className="rounded-3xl border border-primary-black/10 bg-surface p-8 text-center shadow-xl">
            <h1 className="text-2xl font-bold text-primary-black">
              Demo non avviata
            </h1>
            <p className="mt-3 text-sm text-primary-black/60">
              {bootError || "Non riesco a salvare i dati della demo. Riprova."}
            </p>
            <Button
              type="button"
              className="mt-6 w-full"
              onClick={() => window.location.reload()}
            >
              Riprova
            </Button>
            <button
              type="button"
              onClick={leaveDemo}
              className="mt-4 text-xs font-medium text-primary-black/45 underline-offset-2 hover:underline"
            >
              Esci dalla demo
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-primary-black/10 bg-surface p-8 text-center shadow-xl">
            <p className="font-[family-name:var(--font-brand)] text-sm font-semibold tracking-[0.2em] text-brand-teal uppercase">
              VibeUp
            </p>
            <h1 className="mt-4 text-2xl font-bold text-primary-black">
              Hai già completato la demo, grazie per il tuo feedback!
            </h1>
            <p className="mt-3 text-sm text-primary-black/60">
              Se vuoi aggiornare il tuo parere, scrivici a{" "}
              <a
                href="mailto:info@vibeupevents.com"
                className="font-semibold text-brand-teal"
              >
                info@vibeupevents.com
              </a>
              .
            </p>
            <Button type="button" className="mt-6 w-full" onClick={leaveDemo}>
              Torna al sito
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
