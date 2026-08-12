"use client";

import { SoftNavLink } from "@/components/navigation/soft-nav-link";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useAppState } from "@/context/app-state-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function PaymentSuccessInner() {
  const params = useSearchParams();
  const requestId = params.get("request_id") ?? "";
  const { setTab } = useTabNavigation();
  const { addEvent } = useAppState();
  const { requests, cloudSyncEnabled } = useAvailabilityRequests();
  const [message, setMessage] = useState("Verifico il pagamento…");

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (!requestId) {
        setMessage("Pagamento ricevuto. Torna all’app per vedere l’evento.");
        return;
      }

      // Give webhook a moment, then refresh list via existing GET.
      await new Promise((r) => setTimeout(r, 1200));
      if (cancelled) return;

      try {
        if (cloudSyncEnabled) {
          const response = await fetch("/api/bookings/requests", {
            credentials: "same-origin",
          });
          const payload = await response.json().catch(() => null);
          const list = Array.isArray(payload?.requests) ? payload.requests : [];
          const found = list.find(
            (item: { id?: string; status?: string }) => item.id === requestId,
          );
          if (found?.status === "confirmed") {
            setMessage("Pagamento confermato. Evento creato.");
            setTab("events");
            return;
          }
        } else {
          const found = requests.find((item) => item.id === requestId);
          if (found?.status === "confirmed") {
            setMessage("Pagamento confermato.");
            setTab("events");
            return;
          }
        }
      } catch {
        // fall through
      }

      setMessage(
        "Pagamento inviato. Se l’evento non compare subito, aggiorna tra qualche secondo — il webhook sta completando la conferma.",
      );
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [requestId, cloudSyncEnabled, requests, setTab, addEvent]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-primary-black">Pagamento caparra</h1>
      <p className="text-sm text-primary-black/70">{message}</p>
      <SoftNavLink
        href="/?tab=events"
        className="rounded-2xl bg-brand-teal px-5 py-3 text-sm font-bold text-primary-black"
      >
        Vai ai miei eventi
      SoftNavLink>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[70vh] items-center justify-center px-4 text-sm text-primary-black/60">
          Carico…
        </main>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  );
}
