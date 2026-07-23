"use client";

import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { validateNewPassword } from "@/lib/auth/password";
import { useEffect, useState, type FormEvent } from "react";
import { UserPlus, X } from "lucide-react";

export interface CreateAccountFormValues {
  name: string;
  email: string;
  password: string;
}

interface CreateAccountModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onSubmit: (account: CreateAccountFormValues) => void | Promise<void>;
}

export function CreateAccountModal({
  open,
  reason = "Per continuare ti chiediamo di creare un account.",
  onClose,
  onSubmit,
}: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError("");
      setSubmitting(false);
    });
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const passwordError = validateNewPassword(password, confirmPassword);

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Inserisci un’email valida.");
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        name: trimmedName || trimmedEmail.split("@")[0] || "Utente VibeUp",
        email: trimmedEmail,
        password,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Non riesco a creare l’account. Riprova.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[70] flex items-center justify-center p-6"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-primary-black/50"
        onClick={onClose}
        aria-label="Chiudi"
      />

      <div
        className="vibe-sheet-enter relative max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto rounded-3xl bg-background p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-account-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/50"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink">
          <UserPlus className="h-7 w-7" aria-hidden />
        </div>

        <h2
          id="create-account-title"
          className="text-center text-xl font-bold text-primary-black"
        >
          Crea il tuo account
        </h2>
        <p className="mt-2 text-center text-sm text-primary-black/60">
          {reason}
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            autoComplete="name"
            className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="Password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="Conferma password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal"
          />
          <p className="text-[11px] leading-relaxed text-primary-black/45">
            Almeno 8 caratteri, con una lettera e un numero. Ti servirà se non
            usi VibeUp da un po&apos;.
          </p>
          {error && (
            <p className="text-xs font-medium text-brand-pink">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Creo account…" : "Crea account"}
          </button>
        </form>
      </div>
    </div>
  );
}
