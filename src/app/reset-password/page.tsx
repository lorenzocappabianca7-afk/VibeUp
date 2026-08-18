"use client";

import { Button } from "@/components/ui/button";
import { validateNewPassword } from "@/lib/auth/password";
import {
  supabaseSignOut,
  supabaseUpdatePassword,
} from "@/lib/auth/supabase-auth";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase/browser";
import { CheckCircle2, KeyRound, LoaderCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
  type FormEvent,
} from "react";

type PageStatus = "checking" | "ready" | "saving" | "success" | "error";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error");
  const [status, setStatus] = useState<PageStatus>("checking");
  const [message, setMessage] = useState("Verifico il link di recupero…");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (linkError) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "Link scaduto o non valido. Richiedi un nuovo reset password dalla schermata Accedi.",
          );
        }
        return;
      }

      if (!isSupabaseBrowserConfigured()) {
        if (!cancelled) {
          setStatus("error");
          setMessage("Autenticazione non configurata.");
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowser();

        // Recovery links may land with hash tokens before the callback route runs.
        if (
          typeof window !== "undefined" &&
          window.location.hash.includes("access_token")
        ) {
          const params = new URLSearchParams(
            window.location.hash.replace(/^#/, ""),
          );
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            window.history.replaceState(null, "", window.location.pathname);
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error || !data.session) {
          setStatus("error");
          setMessage(
            "Link scaduto o non valido. Richiedi un nuovo reset password dalla schermata Accedi.",
          );
          return;
        }

        setStatus("ready");
        setMessage("Scegli una nuova password per il tuo account.");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "Non riesco a validare il link. Richiedi un nuovo reset password.",
          );
        }
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [linkError]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status !== "ready") return;

    const validation = validateNewPassword(password, confirm);
    if (validation) {
      setFormError(validation);
      return;
    }

    setFormError(null);
    setStatus("saving");

    const updated = await supabaseUpdatePassword(password);
    if (!updated.ok) {
      setStatus("ready");
      setFormError(
        updated.error.includes("expired") || updated.error.includes("session")
          ? "Sessione di recupero scaduta. Richiedi un nuovo link."
          : updated.error,
      );
      return;
    }

    await supabaseSignOut();
    setStatus("success");
    setMessage(
      "Password aggiornata. Ora puoi accedere con la nuova password.",
    );
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center px-4 py-12">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
        {status === "checking" || status === "saving" ? (
          <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden />
        ) : status === "success" ? (
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        ) : status === "error" ? (
          <XCircle className="h-7 w-7 text-brand-pink" aria-hidden />
        ) : (
          <KeyRound className="h-7 w-7" aria-hidden />
        )}
      </span>

      <h1 className="text-center text-2xl font-bold text-primary-black">
        {status === "success"
          ? "Password aggiornata"
          : status === "error"
            ? "Link non valido"
            : "Nuova password"}
      </h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-primary-black/60">
        {message}
      </p>

      {(status === "ready" || status === "saving") && (
        <form onSubmit={handleSubmit} className="mt-6 w-full space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-primary-black/55">
              Nuova password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === "saving"}
              className="w-full rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black outline-none focus:border-brand-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-primary-black/55">
              Conferma password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={status === "saving"}
              className="w-full rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black outline-none focus:border-brand-teal"
            />
          </label>
          {formError ? (
            <p className="text-sm font-semibold text-brand-pink">{formError}</p>
          ) : (
            <p className="text-xs text-primary-black/45">
              Minimo 8 caratteri, con almeno una lettera e un numero.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={status === "saving"}>
            {status === "saving" ? "Salvataggio…" : "Salva nuova password"}
          </Button>
        </form>
      )}

      <Link
        href="/"
        className="mt-6 inline-flex rounded-2xl border border-primary-black/12 bg-surface px-5 py-3 text-sm font-semibold text-primary-black"
      >
        {status === "success" ? "Torna a VibeUp e accedi" : "Torna a VibeUp"}
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70dvh] items-center justify-center text-sm text-primary-black/50">
          Caricamento…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
