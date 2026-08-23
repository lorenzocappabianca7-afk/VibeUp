"use client";

import { AvailabilityRequestDetails } from "@/components/availability/availability-request-details";
import { RequestStatusBadge } from "@/components/availability/request-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  AvailabilityRequest,
  ManagerProposedDate,
} from "@/types/availability-request";
import { Check, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

type Mode = "choose" | "decline" | "propose" | "done" | "error";

interface ManagerResponseFormProps {
  token: string;
  request: AvailabilityRequest;
  initialMode?: Extract<Mode, "choose" | "propose">;
}

export function ManagerResponseForm({
  token,
  request,
  initialMode = "choose",
}: ManagerResponseFormProps) {
  const payload = request.eventPayload;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [note, setNote] = useState("");
  const [proposedPrice, setProposedPrice] = useState(
    payload.totalCost > 0 ? String(payload.totalCost) : "",
  );
  const [slots, setSlots] = useState<ManagerProposedDate[]>([
    {
      date: payload.date || "",
      time: payload.time || "",
      endTime: payload.endTime || "",
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneLabel, setDoneLabel] = useState("Grazie, la tua risposta è stata inviata.");

  const timeLabel = useMemo(() => {
    if (payload.time && payload.endTime) return `${payload.time}–${payload.endTime}`;
    return payload.time || "—";
  }, [payload.endTime, payload.time]);

  async function submit(
    action: "accept" | "decline" | "propose",
    body: Record<string, unknown>,
  ) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/bookings/requests/respond/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...body }),
        },
      );
      const payloadJson = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(
          typeof payloadJson?.error === "string"
            ? payloadJson.error
            : "Invio non riuscito. Riprova.",
        );
        setSubmitting(false);
        return;
      }
      if (action === "accept") {
        setDoneLabel("Grazie! Hai accettato la richiesta. Avviseremo il cliente.");
      } else if (action === "decline") {
        setDoneLabel("Grazie. Abbiamo registrato il rifiuto.");
      } else {
        setDoneLabel(
          "Grazie! La tua proposta è stata inviata al team VibeUp per la validazione.",
        );
      }
      setMode("done");
    } catch {
      setError("Connessione non disponibile. Riprova tra poco.");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "done") {
    return (
      <div className="rounded-2xl border border-brand-teal/30 bg-brand-teal/10 p-6 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/20 text-brand-teal">
          <Check className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="text-lg font-bold text-primary-black">Risposta inviata</h2>
        <p className="mt-2 text-sm text-primary-black/65">{doneLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-white bg-primary-black/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary-black/45">
            Richiesta disponibilità
          </p>
          <RequestStatusBadge
            status={request.status}
            confirmationDeadline={request.confirmationDeadline}
          />
        </div>
        <h1 className="text-xl font-bold text-primary-black">{payload.title}</h1>
        {payload.description ? (
          <p className="text-sm leading-relaxed text-primary-black/65">
            {payload.description}
          </p>
        ) : null}

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-primary-black/60">Cliente</dt>
            <dd className="font-medium text-primary-black">{request.requesterName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-primary-black/60">Location / servizio</dt>
            <dd className="text-right font-medium text-primary-black">
              {request.locationName}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-primary-black/60">Data</dt>
            <dd className="font-medium text-primary-black">
              {payload.date ? formatDate(payload.date) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-primary-black/60">Orario</dt>
            <dd className="font-medium text-primary-black">{timeLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-primary-black/60">Ospiti</dt>
            <dd className="font-medium text-primary-black">{payload.guestCount}</dd>
          </div>
          <div className="border-t border-primary-black/10 pt-3">
            <AvailabilityRequestDetails payload={payload} />
          </div>
          <div className="flex justify-between gap-3 border-t border-primary-black/10 pt-2">
            <dt className="font-semibold text-primary-black">Totale stimato</dt>
            <dd className="text-lg font-bold text-primary-black">
              {formatCurrency(payload.totalCost)}
            </dd>
          </div>
        </dl>
      </section>

      {mode === "choose" && (
        <section className="space-y-3">
          <p className="text-sm text-primary-black/60">
            Come vuoi rispondere? Il link si invalida dopo la prima risposta.
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit("accept", {})}
            className="w-full rounded-2xl bg-brand-teal px-4 py-3.5 text-sm font-bold text-primary-black disabled:opacity-60"
          >
            Accetta
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode("decline")}
            className="w-full rounded-2xl border border-primary-black/15 bg-background px-4 py-3.5 text-sm font-semibold text-primary-black disabled:opacity-60"
          >
            Rifiuta
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode("propose")}
            className="w-full rounded-2xl border border-brand-teal/40 bg-brand-teal/10 px-4 py-3.5 text-sm font-semibold text-primary-black disabled:opacity-60"
          >
            Proponi alternativa
          </button>
        </section>
      )}

      {mode === "decline" && (
        <section className="space-y-3 rounded-2xl border border-primary-black/10 bg-background p-4">
          <h2 className="text-sm font-bold text-primary-black">Rifiuta richiesta</h2>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-primary-black/45">
              Motivazione (opzionale)
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Es. già prenotato in quella data…"
              className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2.5 text-sm text-primary-black outline-none focus:border-brand-teal"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setMode("choose")}
              className="flex-1 rounded-2xl border border-primary-black/12 px-4 py-3 text-sm font-semibold text-primary-black/70"
            >
              Indietro
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit("decline", { managerNote: note })}
              className="flex-1 rounded-2xl bg-brand-pink px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              Conferma rifiuto
            </button>
          </div>
        </section>
      )}

      {mode === "propose" && (
        <section className="space-y-4 rounded-2xl border border-primary-black/10 bg-background p-4">
          <h2 className="text-sm font-bold text-primary-black">
            Proponi alternativa
          </h2>
          <p className="text-xs text-primary-black/55">
            Puoi proporre una o più date/orari e, se vuoi, un prezzo o una
            fascia diversa. La proposta passerà da una valida VibeUp prima del
            cliente.
          </p>

          <div className="space-y-3">
            {slots.map((slot, index) => (
              <div
                key={`slot-${index}`}
                className="space-y-2 rounded-xl border border-primary-black/10 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-black/45">
                    Alternativa {index + 1}
                  </p>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSlots((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="rounded-full p-1 text-primary-black/45 hover:bg-primary-black/5"
                      aria-label="Rimuovi data"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <label className="block space-y-1">
                  <span className="text-xs text-primary-black/50">Data</span>
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSlots((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, date: value } : item,
                        ),
                      );
                    }}
                    className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-teal"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-primary-black/50">Inizio</span>
                    <input
                      type="time"
                      value={slot.time ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSlots((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, time: value } : item,
                          ),
                        );
                      }}
                      className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-primary-black/50">Fine</span>
                    <input
                      type="time"
                      value={slot.endTime ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSlots((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, endTime: value } : item,
                          ),
                        );
                      }}
                      className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-teal"
                    />
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setSlots((prev) => [
                  ...prev,
                  { date: "", time: "", endTime: "" },
                ])
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-black/12 px-3 py-1.5 text-xs font-semibold text-primary-black/70"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Aggiungi altra data
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-primary-black/45">
              Prezzo o fascia diversa (€, opzionale)
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={proposedPrice}
              onChange={(event) => setProposedPrice(event.target.value)}
              placeholder={String(payload.totalCost || "")}
              className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-primary-black/45">
              Nota (opzionale)
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Spiega brevemente la proposta…"
              className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
            />
          </label>

          <div className="flex gap-2">
            {initialMode !== "propose" ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setMode("choose")}
                className="flex-1 rounded-2xl border border-primary-black/12 px-4 py-3 text-sm font-semibold text-primary-black/70"
              >
                Indietro
              </button>
            ) : null}
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                const cleaned = slots.filter((slot) => slot.date.trim());
                const priceRaw = proposedPrice.trim();
                const price =
                  priceRaw === "" ? null : Number(priceRaw.replace(",", "."));
                void submit("propose", {
                  proposedDates: cleaned,
                  proposedPrice:
                    price != null && Number.isFinite(price) ? price : null,
                  managerNote: note,
                });
              }}
              className="flex-1 rounded-2xl bg-brand-teal px-4 py-3 text-sm font-bold text-primary-black disabled:opacity-60"
            >
              Invia proposta
            </button>
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-xl bg-brand-pink/10 px-3 py-2 text-sm font-medium text-brand-pink">
          {error}
        </p>
      )}
    </div>
  );
}
