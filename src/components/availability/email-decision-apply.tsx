"use client";

import {
  AlreadyAnsweredCard,
  ManagerResponseSuccessCard,
} from "@/components/availability/manager-response-result";
import type { AvailabilityRequest } from "@/types/availability-request";
import { useEffect, useState } from "react";

type Decision = "accept" | "decline";
type Phase = "applying" | "done" | "already" | "error";

const inflight = new Map<string, Promise<"done" | "already" | "error">>();
const lastError = new Map<string, string>();

function successCopy(action: Decision) {
  return action === "accept"
    ? "Hai accettato la richiesta. Avviseremo il cliente: ha qualche giorno per confermare e pagare la caparra."
    : "Hai rifiutato la richiesta. Il cliente verrà avvisato.";
}

async function applyDecision(
  token: string,
  action: Decision,
): Promise<"done" | "already" | "error"> {
  try {
    const response = await fetch(
      `/api/bookings/requests/respond/${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (response.ok) return "done";
    const message = typeof payload?.error === "string" ? payload.error : "";
    if (response.status === 410 || /già|utilizzato|gestita/i.test(message)) {
      return "already";
    }
    lastError.set(`${action}:${token}`, message || "Invio non riuscito. Riprova.");
    return "error";
  } catch {
    lastError.set(
      `${action}:${token}`,
      "Connessione non disponibile. Riprova tra poco.",
    );
    return "error";
  }
}

function startApply(token: string, action: Decision) {
  const key = `${action}:${token}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = applyDecision(token, action).then((result) => {
    if (result === "error") inflight.delete(key);
    return result;
  });
  inflight.set(key, promise);
  return promise;
}

export function EmailDecisionApply({
  token,
  action,
  request,
}: {
  token: string;
  action: Decision;
  request: AvailabilityRequest;
}) {
  const [phase, setPhase] = useState<Phase>("applying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void startApply(token, action).then((result) => {
      if (cancelled) return;
      if (result === "error") {
        setError(lastError.get(`${action}:${token}`) ?? "Invio non riuscito.");
      }
      setPhase(result);
    });
    return () => {
      cancelled = true;
    };
  }, [action, token]);

  if (phase === "done") {
    return <ManagerResponseSuccessCard message={successCopy(action)} />;
  }

  if (phase === "already") {
    return <AlreadyAnsweredCard request={request} />;
  }

  if (phase === "error") {
    return (
      <div className="space-y-4 rounded-2xl border border-brand-pink/25 bg-brand-pink/10 p-6 text-center">
        <h1 className="text-lg font-bold text-primary-black">
          Non è stato possibile rispondere
        </h1>
        <p className="text-sm leading-relaxed text-primary-black/65">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setPhase("applying");
            void startApply(token, action).then((result) => {
              if (result === "error") {
                setError(
                  lastError.get(`${action}:${token}`) ?? "Invio non riuscito.",
                );
              }
              setPhase(result);
            });
          }}
          className="inline-flex rounded-2xl bg-paper px-5 py-3 text-sm font-semibold text-ink-inverse"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary-black/10 bg-background p-6 text-center">
      <h1 className="text-lg font-bold text-primary-black">
        {action === "accept" ? "Accettazione in corso…" : "Rifiuto in corso…"}
      </h1>
      <p className="mt-2 text-sm text-primary-black/60">
        Stiamo aggiornando lo stato della richiesta su VibeUp.
      </p>
    </div>
  );
}
