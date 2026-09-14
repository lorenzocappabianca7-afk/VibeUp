"use client";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/form-fields";
import { useDemoMode } from "@/context/demo-mode-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { isValidDemoPhone, normalizeDemoPhone } from "@/lib/demo/phone";
import { DEMO_PRIVACY_NOTICE } from "@/lib/demo/privacy";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClassName =
  "w-full rounded-xl border border-primary-black/10 bg-background px-4 py-3 text-base text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20";

function goToHome(
  setTab: (tab: "home") => void,
  router: {
    push: (href: string, options?: { scroll?: boolean }) => void;
    replace: (href: string) => void;
  },
) {
  setTab("home");
  router.replace("/");
}

export function DemoLanding() {
  const { landingState, startDemoSession, restartDemoSession } = useDemoMode();
  const { setTab } = useTabNavigation();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const blocking = landingState === "form" || landingState === "completed";
  useBodyScrollLock(blocking);

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      EMAIL_RE.test(email.trim().toLowerCase()) &&
      isValidDemoPhone(phone) &&
      privacyAccepted
    );
  }, [email, firstName, lastName, phone, privacyAccepted]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await startDemoSession({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizeDemoPhone(phone),
        privacyConsentAt: new Date().toISOString(),
      });
      goToHome(setTab, router);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Non riesco a salvare i dati della demo. Riprova.",
      );
      setSubmitting(false);
    }
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
          "mx-auto flex min-h-dvh flex-col justify-center px-6 py-12",
        )}
      >
        {landingState === "completed" ? (
          <CompletedMessage
            onRestart={() => {
              restartDemoSession();
              router.replace("/");
            }}
          />
        ) : (
          <>
            <header className="mb-8 text-center">
              <p className="font-[family-name:var(--font-brand)] text-sm font-semibold tracking-[0.2em] text-brand-teal uppercase">
                VibeUp
              </p>
              <h1 className="mt-3 text-2xl font-bold text-primary-black">
                Prova l’app in anteprima
              </h1>
              <p className="mt-2 text-sm text-primary-black/60">
                Lascia i tuoi dati per entrare nella demo. L’app che vedi dopo è
                quella vera.
              </p>
            </header>

            <form
              className="rounded-3xl border border-primary-black/10 bg-surface p-6 shadow-xl"
              onSubmit={handleSubmit}
            >
              <div className="space-y-4">
                <div>
                  <FieldLabel htmlFor="demo-first-name">Nome</FieldLabel>
                  <input
                    id="demo-first-name"
                    name="given-name"
                    autoComplete="given-name"
                    autoCapitalize="words"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Es. Giulia"
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="demo-last-name">Cognome</FieldLabel>
                  <input
                    id="demo-last-name"
                    name="family-name"
                    autoComplete="family-name"
                    autoCapitalize="words"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Es. Rossi"
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="demo-email">Email</FieldLabel>
                  <input
                    id="demo-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="es. giulia@email.com"
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="demo-phone">Telefono</FieldLabel>
                  <input
                    id="demo-phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Es. 333 123 4567"
                    required
                    className={inputClassName}
                  />
                </div>
              </div>

              <label className="mt-5 flex items-start gap-3 text-sm text-primary-black/80">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-primary-black/30 accent-brand-teal"
                />
                <span>
                  Acconsento al trattamento dei miei dati per la demo VibeUp.{" "}
                  <button
                    type="button"
                    onClick={() => setPrivacyOpen(true)}
                    className="font-semibold text-brand-teal underline underline-offset-2"
                  >
                    Leggi l’informativa
                  </button>
                </span>
              </label>

              {error ? (
                <p className="mt-4 text-xs font-medium text-brand-pink">{error}</p>
              ) : null}

              <Button
                type="submit"
                className="mt-6 w-full"
                disabled={!canSubmit || submitting}
              >
                {submitting ? "Salvataggio…" : "Continua"}
              </Button>
            </form>
          </>
        )}
      </div>

      {privacyOpen ? (
        <PrivacyNotice onClose={() => setPrivacyOpen(false)} />
      ) : null}
    </div>
  );
}

function CompletedMessage({ onRestart }: { onRestart: () => void }) {
  return (
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
      <Button type="button" className="mt-6 w-full" onClick={onRestart}>
        Ricomincia la demo
      </Button>
    </div>
  );
}

function PrivacyNotice({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-6 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Chiudi informativa"
      />
      <div
        className="vibe-sheet-enter relative max-h-[min(80dvh,32rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-surface p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-privacy-title"
      >
        <h2
          id="demo-privacy-title"
          className="text-lg font-bold text-primary-black"
        >
          {DEMO_PRIVACY_NOTICE.title}
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-primary-black/70">
          {DEMO_PRIVACY_NOTICE.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <Button type="button" className="mt-6 w-full" onClick={onClose}>
          Ho capito
        </Button>
      </div>
    </div>
  );
}
