"use client";

import { useAppState } from "@/context/app-state-context";
import { requestActivationEmail } from "@/lib/auth/request-activation-email";
import { Mail } from "lucide-react";
import { useState } from "react";

export function EmailActivationBanner() {
  const { currentUser, isGuest, issueActivationToken } = useAppState();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  if (isGuest || currentUser.emailVerified !== false) return null;

  async function handleResend() {
    setStatus("sending");
    setError("");
    const issued = issueActivationToken(currentUser.id);
    if (!issued.ok || !issued.activationToken || !issued.email) {
      setStatus("error");
      setError(issued.ok ? "Token non disponibile." : issued.error);
      return;
    }

    const result = await requestActivationEmail({
      email: issued.email,
      name: issued.name ?? currentUser.name,
      token: issued.activationToken,
    });

    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="border-b border-brand-teal/20 bg-brand-teal/10 px-3 py-3 text-primary-black sm:px-4">
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal/20 text-brand-teal">
          <Mail className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            Conferma la tua email per attivare l&apos;account
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-primary-black/65">
            Ti abbiamo inviato un messaggio a{" "}
            <span className="font-semibold text-primary-black">
              {currentUser.email}
            </span>{" "}
            da vibeup.planner@gmail.com. Apri il link per completare
            l&apos;attivazione.
          </p>
          {status === "sent" && (
            <p className="mt-1 text-xs font-semibold text-brand-teal">
              Email reinviata. Controlla anche lo spam.
            </p>
          )}
          {status === "error" && error && (
            <p className="mt-1 text-xs font-semibold text-brand-pink">{error}</p>
          )}
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={status === "sending"}
            className="mt-2 text-xs font-bold text-brand-teal-strong underline-offset-2 hover:underline disabled:opacity-60"
          >
            {status === "sending" ? "Invio in corso…" : "Reinvia email"}
          </button>
        </div>
      </div>
    </div>
  );
}
