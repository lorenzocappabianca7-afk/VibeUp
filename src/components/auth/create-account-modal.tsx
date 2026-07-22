"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UserPlus, X } from "lucide-react";

interface CreateAccountModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onSubmit: (account: { name: string; email: string }) => void;
}

export function CreateAccountModal({
  open,
  reason = "Per continuare ti chiediamo di creare un account.",
  onClose,
  onSubmit,
}: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      setName("");
      setEmail("");
      setError("");
    });
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Inserisci un’email valida.");
      return;
    }

    onSubmit({
      name: trimmedName || trimmedEmail.split("@")[0] || "Utente VibeUp",
      email: trimmedEmail,
    });
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            autoComplete="name"
            className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
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
            className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
          />
          {error && (
            <p className="text-xs font-medium text-brand-pink">{error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-semibold text-white"
          >
            Crea account
          </button>
        </form>
      </div>
    </div>
  );
}
