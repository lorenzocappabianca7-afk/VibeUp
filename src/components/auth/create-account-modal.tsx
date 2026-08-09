"use client";

import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { validateNewPassword } from "@/lib/auth/password";
import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, LogIn, UserPlus, X } from "lucide-react";

export type AuthModalMode = "register" | "login" | "reset";

export interface CreateAccountFormValues {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  mode: AuthModalMode;
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
  const [mode, setMode] = useState<AuthModalMode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      setMode("register");
      setName("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
      setConfirmPassword("");
      setError("");
      setInfo("");
      setSubmitting(false);
    });
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phoneNumber.trim();
    const phoneDigits = trimmedPhone.replace(/\D/g, "");

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Inserisci un’email valida.");
      return;
    }

    if (mode === "reset") {
      setSubmitting(true);
      setError("");
      setInfo("");
      try {
        await onSubmit({
          name: trimmedName || trimmedEmail.split("@")[0] || "Utente VibeUp",
          email: trimmedEmail,
          phoneNumber: trimmedPhone,
          password: "",
          mode,
        });
        setInfo(
          "Se l’email esiste, ti abbiamo inviato il link per reimpostare la password.",
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Non riesco a inviare il recupero password.",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "register") {
      const passwordError = validateNewPassword(password, confirmPassword);
      if (phoneDigits.length < 8) {
        setError("Inserisci un numero di telefono valido.");
        return;
      }
      if (passwordError) {
        setError(passwordError);
        return;
      }
    } else if (!password) {
      setError("Inserisci la password.");
      return;
    }

    setSubmitting(true);
    setError("");
    setInfo("");
    try {
      await onSubmit({
        name: trimmedName || trimmedEmail.split("@")[0] || "Utente VibeUp",
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
        password,
        mode,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "login"
            ? "Accesso non riuscito. Riprova."
            : "Non riesco a creare l’account. Riprova.",
      );
      setSubmitting(false);
    }
  }

  const title =
    mode === "login"
      ? "Accedi a VibeUp"
      : mode === "reset"
        ? "Recupera password"
        : "Crea il tuo account";

  const Icon = mode === "login" ? LogIn : mode === "reset" ? KeyRound : UserPlus;

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[70] flex items-center justify-center p-6"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Chiudi"
      />

      <div
        className="vibe-sheet-enter relative max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto rounded-3xl bg-surface p-6 shadow-xl"
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
          <Icon className="h-7 w-7" aria-hidden />
        </div>

        <h2
          id="create-account-title"
          className="text-center text-xl font-bold text-primary-black"
        >
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-primary-black/60">
          {mode === "register"
            ? reason
            : mode === "login"
              ? "Entra con email e password del tuo account VibeUp."
              : "Ti inviamo un link per scegliere una nuova password."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-primary-black/[0.04] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
              setInfo("");
            }}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              mode === "register"
                ? "bg-brand-teal text-ink-inverse"
                : "text-primary-black/60"
            }`}
          >
            Registrati
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
              setInfo("");
            }}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              mode === "login"
                ? "bg-brand-teal text-ink-inverse"
                : "text-primary-black/60"
            }`}
          >
            Accedi
          </button>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-5 space-y-3"
        >
          {mode === "register" && (
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome"
              autoComplete="name"
              className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal"
            />
          )}
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
          {mode === "register" && (
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => {
                setPhoneNumber(event.target.value);
                if (error) setError("");
              }}
              placeholder="Numero di telefono"
              autoComplete="tel"
              inputMode="tel"
              required
              className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal"
            />
          )}
          {mode !== "reset" && (
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              placeholder="Password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "register" ? 8 : 1}
              className="w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base outline-none focus:border-brand-teal"
            />
          )}
          {mode === "register" && (
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
          )}
          {mode === "register" && (
            <p className="text-[11px] leading-relaxed text-primary-black/45">
              Almeno 8 caratteri, con una lettera e un numero.
            </p>
          )}
          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("reset");
                setError("");
                setInfo("");
              }}
              className="text-left text-xs font-semibold text-brand-teal underline-offset-2 hover:underline"
            >
              Password dimenticata?
            </button>
          )}
          {mode === "reset" && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
              className="text-left text-xs font-semibold text-primary-black/55 underline-offset-2 hover:underline"
            >
              Torna all’accesso
            </button>
          )}
          {error && (
            <p className="text-xs font-medium text-brand-pink">{error}</p>
          )}
          {info && (
            <p className="text-xs font-medium text-brand-teal">{info}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-paper px-4 py-3 text-sm font-semibold text-ink-inverse disabled:opacity-60"
          >
            {submitting
              ? mode === "login"
                ? "Accesso…"
                : mode === "reset"
                  ? "Invio…"
                  : "Creo account…"
              : mode === "login"
                ? "Accedi"
                : mode === "reset"
                  ? "Invia link di recupero"
                  : "Crea account"}
          </button>
        </form>
      </div>
    </div>
  );
}
