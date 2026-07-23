"use client";

import { useAppState } from "@/context/app-state-context";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ActivateAccountContent() {
  const { activateAccountWithToken, isStorageHydrated } = useAppState();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const [message, setMessage] = useState("Sto attivando il tuo account…");

  useEffect(() => {
    if (!isStorageHydrated) return;

    if (!token) {
      setStatus("error");
      setMessage("Link di attivazione mancante o incompleto.");
      return;
    }

    const result = activateAccountWithToken(token);
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("ok");
    setMessage("Account attivato. Grazie per aver confermato la tua email.");
  }, [activateAccountWithToken, isStorageHydrated, token]);

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-black/[0.04]">
        {status === "pending" && (
          <LoaderCircle className="h-7 w-7 animate-spin text-brand-teal" />
        )}
        {status === "ok" && (
          <CheckCircle2 className="h-7 w-7 text-brand-teal" />
        )}
        {status === "error" && (
          <XCircle className="h-7 w-7 text-brand-pink" />
        )}
      </span>
      <h1 className="text-2xl font-bold text-primary-black">
        {status === "ok"
          ? "Email confermata"
          : status === "error"
            ? "Attivazione non riuscita"
            : "Attivazione account"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-primary-black/60">
        {message}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-2xl bg-primary-black px-5 py-3 text-sm font-semibold text-white"
      >
        Torna a VibeUp
      </Link>
    </div>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70dvh] items-center justify-center text-sm text-primary-black/50">
          Caricamento…
        </div>
      }
    >
      <ActivateAccountContent />
    </Suspense>
  );
}
