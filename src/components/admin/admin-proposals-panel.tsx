"use client";

import { useAvailabilityRequests } from "@/context/availability-request-context";
import { adminReviewAvailabilityRequestRemote } from "@/lib/bookings/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AvailabilityRequest } from "@/types/availability-request";
import { ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";

function ProposalCard({
  request,
  onUpdated,
}: {
  request: AvailabilityRequest;
  onUpdated: (next: AvailabilityRequest) => void;
}) {
  const payload = request.eventPayload;
  const [adminNote, setAdminNote] = useState(request.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeLabel =
    payload.time && payload.endTime
      ? `${payload.time}–${payload.endTime}`
      : payload.time || "—";

  async function run(action: "forward" | "discard") {
    setBusy(true);
    setError(null);
    const result = await adminReviewAvailabilityRequestRemote({
      requestId: request.id,
      action,
      adminNote,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUpdated(result.request);
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-primary-black/10 bg-background">
      <div className="border-b border-primary-black/8 px-4 py-3">
        <p className="text-sm font-bold text-primary-black">{payload.title}</p>
        <p className="mt-0.5 text-xs text-primary-black/55">
          {request.locationName} · {request.requesterName}
        </p>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        <div className="space-y-2 border-b border-primary-black/8 p-4 md:border-b-0 md:border-r">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-primary-black/40">
            Richiesta utente
          </p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-primary-black/55">Data</dt>
              <dd className="font-medium text-primary-black">
                {payload.date ? formatDate(payload.date) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-primary-black/55">Orario</dt>
              <dd className="font-medium text-primary-black">{timeLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-primary-black/55">Ospiti</dt>
              <dd className="font-medium text-primary-black">
                {payload.guestCount}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-primary-black/55">Totale</dt>
              <dd className="font-bold text-primary-black">
                {formatCurrency(payload.totalCost)}
              </dd>
            </div>
          </dl>
          {payload.description ? (
            <p className="text-xs leading-relaxed text-primary-black/55">
              {payload.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-teal">
            Proposta gestore
          </p>
          {request.managerProposedDates &&
          request.managerProposedDates.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {request.managerProposedDates.map((slot, index) => (
                <li
                  key={`${slot.date}-${index}`}
                  className="rounded-xl bg-brand-teal/10 px-3 py-2 text-primary-black"
                >
                  <span className="font-semibold">
                    {slot.date ? formatDate(slot.date) : "Data n.d."}
                  </span>
                  {(slot.time || slot.endTime) && (
                    <span className="text-primary-black/65">
                      {" "}
                      · {slot.time || "?"}
                      {slot.endTime ? `–${slot.endTime}` : ""}
                    </span>
                  )}
                  {slot.note ? (
                    <p className="mt-1 text-xs text-primary-black/55">
                      {slot.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-primary-black/50">
              Nessuna data alternativa indicata.
            </p>
          )}
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-primary-black/55">Prezzo proposto</span>
            <span className="font-bold text-primary-black">
              {request.managerProposedPrice != null
                ? formatCurrency(request.managerProposedPrice)
                : "Invariato"}
            </span>
          </div>
          {request.managerNote ? (
            <p className="rounded-xl bg-primary-black/[0.03] px-3 py-2 text-xs leading-relaxed text-primary-black/70">
              Nota gestore: {request.managerNote}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-t border-primary-black/8 p-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-primary-black/45">
            Nota admin (opzionale)
          </span>
          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            rows={2}
            placeholder="Correzioni o motivo dello scarto…"
            className="w-full rounded-xl border border-primary-black/12 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
        </label>
        {error && (
          <p className="text-sm font-medium text-brand-pink">{error}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("discard")}
            className="flex-1 rounded-2xl border border-primary-black/12 px-4 py-3 text-sm font-semibold text-primary-black/70 disabled:opacity-60"
          >
            Scarta
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("forward")}
            className="flex-1 rounded-2xl bg-brand-teal px-4 py-3 text-sm font-bold text-primary-black disabled:opacity-60"
          >
            Inoltra all&apos;utente
          </button>
        </div>
      </div>
    </li>
  );
}

export function AdminProposalsPanel() {
  const { requests } = useAvailabilityRequests();
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, AvailabilityRequest>
  >({});

  const proposals = useMemo(() => {
    const merged = requests.map(
      (item) => localOverrides[item.id] ?? item,
    );
    return merged.filter((item) => item.status === "pending_admin_review");
  }, [localOverrides, requests]);

  return (
    <section className="mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-primary-black">
          Proposte da validare
        </h2>
        <p className="mt-1 text-sm text-primary-black/55">
          Il gestore ha proposto date o prezzi diversi. Controlla e inoltra al
          cliente oppure scarta.
        </p>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] px-4 py-10 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-teal/15 text-brand-teal">
            <ClipboardCheck className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-primary-black">
            Nessuna proposta in coda
          </p>
          <p className="mt-1 text-xs text-primary-black/50">
            Quando un gestore usa “Proponi modifica”, compare qui.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {proposals.map((request) => (
            <ProposalCard
              key={request.id}
              request={request}
              onUpdated={(next) =>
                setLocalOverrides((prev) => ({ ...prev, [next.id]: next }))
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
