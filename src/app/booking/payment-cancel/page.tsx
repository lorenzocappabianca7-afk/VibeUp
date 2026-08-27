"use client";

import { SoftNavLink } from "@/components/navigation/soft-nav-link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PaymentCancelInner() {
  const params = useSearchParams();
  const requestId = params.get("request_id") ?? "";
  const bookingId = params.get("booking_id") ?? "";
  const kind = params.get("kind") ?? "";
  const [message, setMessage] = useState("Annullamento pagamento…");

  useEffect(() => {
    let cancelled = false;
    async function revert() {
      if (kind === "siae" && bookingId) {
        try {
          await fetch(
            `/api/bookings/${encodeURIComponent(bookingId)}/siae-cancel`,
            { method: "POST", credentials: "same-origin" },
          );
        } catch {
          // webhook expired will also revert
        }
        if (!cancelled) {
          setMessage(
            "Pagamento SIAE annullato. Puoi riprovare dal pannello dell’evento.",
          );
        }
        return;
      }
      if (!requestId) {
        setMessage("Pagamento annullato. Puoi riprovare dalla conferma in app.");
        return;
      }
      try {
        await fetch(
          `/api/bookings/requests/${encodeURIComponent(requestId)}/deposit-cancel`,
          { method: "POST", credentials: "same-origin" },
        );
      } catch {
        // webhook expired will also revert
      }
      if (!cancelled) {
        setMessage(
          "Pagamento annullato. La richiesta è di nuovo in attesa di conferma — puoi riprovare quando vuoi.",
        );
      }
    }
    void revert();
    return () => {
      cancelled = true;
    };
  }, [requestId, bookingId, kind]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-primary-black">Pagamento annullato</h1>
      <p className="text-sm text-primary-black/70">{message}</p>
      <SoftNavLink
        href="/"
        className="rounded-2xl bg-brand-teal px-5 py-3 text-sm font-bold text-primary-black"
      >
        Torna a VibeUp
      </SoftNavLink>
    </main>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[70vh] items-center justify-center px-4 text-sm text-primary-black/60">
          Carico…
        </main>
      }
    >
      <PaymentCancelInner />
    </Suspense>
  );
}
