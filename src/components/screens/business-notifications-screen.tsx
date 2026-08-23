"use client";

import { AvailabilityRequestDetails } from "@/components/availability/availability-request-details";
import { RequestStatusBadge } from "@/components/availability/request-status-badge";
import {
  formatAvailabilityRequestTime,
  useAvailabilityRequests,
} from "@/context/availability-request-context";
import { useAppState } from "@/context/app-state-context";
import { useInboxBadge } from "@/context/inbox-badge-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AvailabilityRequest } from "@/types/availability-request";
import { Bell, CalendarCheck2, Users } from "lucide-react";
import { memo, useEffect, useState } from "react";

function AvailabilityRequestCard({
  request,
  busy,
  error,
  onAccept,
  onDecline,
}: {
  request: AvailabilityRequest;
  busy: boolean;
  error?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const payload = request.eventPayload;
  const isServiceRequest = payload.requestKind === "service";

  return (
    <li className="rounded-2xl border border-brand-teal/25 bg-brand-teal/5 p-4">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
          <CalendarCheck2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-primary-black">
              {isServiceRequest
                ? "Richiesta servizio"
                : "Richiesta di disponibilità"}
            </p>
            <RequestStatusBadge
              status={request.status}
              confirmationDeadline={request.confirmationDeadline}
            />
          </div>
          <p className="mt-0.5 text-sm text-primary-black/70">
            <span className="font-semibold text-primary-black">
              {request.requesterName}
            </span>{" "}
            {isServiceRequest ? (
              <>
                chiede{" "}
                <span className="font-semibold text-primary-black">
                  {request.locationName}
                </span>{" "}
                per un evento.
              </>
            ) : (
              <>
                vuole festeggiare a{" "}
                <span className="font-semibold text-primary-black">
                  {request.locationName}
                </span>
                .
              </>
            )}
          </p>
          <div className="mt-2 space-y-1 rounded-xl bg-background/70 px-3 py-2 text-xs text-primary-black/65">
            <p className="font-medium text-primary-black">{payload.title}</p>
            <p>
              {formatDate(payload.date)} · {payload.time}–{payload.endTime}
            </p>
            <p className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {payload.guestCount} invitati · Totale{" "}
              {formatCurrency(payload.totalCost)}
            </p>
            <AvailabilityRequestDetails payload={payload} compact />
          </div>
          <p className="mt-1.5 text-xs text-primary-black/40">
            {formatAvailabilityRequestTime(request.createdAt)}
          </p>
          {error ? (
            <p className="mt-2 text-xs font-semibold text-brand-pink">{error}</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onDecline}
              className="flex-1 rounded-xl border border-primary-black/12 px-3 py-2.5 text-sm font-semibold text-primary-black/70 disabled:opacity-60"
            >
              Rifiuta
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="flex-1 rounded-xl bg-brand-teal px-3 py-2.5 text-sm font-bold text-ink-inverse disabled:opacity-60"
            >
              Accetta
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export const BusinessNotificationsScreen = memo(
  function BusinessNotificationsScreen() {
    const { businessProfile, currentUser } = useAppState();
    const { markNotificationIdsSeen } = useInboxBadge();
    const {
      pendingManagerRequests,
      managedRequests,
      acceptAvailabilityRequest,
      declineAvailabilityRequest,
    } = useAvailabilityRequests();
    const otherManagedRequests = managedRequests.filter(
      (item) => item.status !== "pending_manager",
    );
    const [actionErrorById, setActionErrorById] = useState<
      Record<string, string>
    >({});
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
      markNotificationIdsSeen(pendingManagerRequests.map((item) => item.id));
    }, [markNotificationIdsSeen, pendingManagerRequests]);

    const locationName =
      businessProfile?.businessName ?? currentUser.name ?? "la tua location";

    async function handleAccept(requestId: string) {
      setBusyId(requestId);
      setActionErrorById((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      const result = await acceptAvailabilityRequest(requestId);
      setBusyId(null);
      if (!result.ok) {
        setActionErrorById((prev) => ({ ...prev, [requestId]: result.error }));
      }
    }

    async function handleDecline(requestId: string) {
      setBusyId(requestId);
      setActionErrorById((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      const result = await declineAvailabilityRequest(requestId);
      setBusyId(null);
      if (!result.ok) {
        setActionErrorById((prev) => ({ ...prev, [requestId]: result.error }));
      }
    }

    return (
      <div className="min-w-0 space-y-6">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary-black">Notifiche</h1>
            <span className="rounded-md bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Pro
            </span>
          </div>
          <p className="mt-1 text-sm text-primary-black/60">
            Richieste e aggiornamenti per{" "}
            <span className="font-medium text-primary-black">{locationName}</span>
          </p>
          {pendingManagerRequests.length > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-pink/15 px-2.5 py-1 text-xs font-medium text-brand-pink">
              <Bell className="h-3.5 w-3.5" aria-hidden />
              {pendingManagerRequests.length} richieste da gestire
            </p>
          )}
        </header>

        {pendingManagerRequests.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-primary-black">
              Richieste da gestire
            </h2>
            <ul className="space-y-2">
              {pendingManagerRequests.map((request) => (
                <AvailabilityRequestCard
                  key={request.id}
                  request={request}
                  busy={busyId === request.id}
                  error={actionErrorById[request.id]}
                  onAccept={() => void handleAccept(request.id)}
                  onDecline={() => void handleDecline(request.id)}
                />
              ))}
            </ul>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-primary-black/12 px-4 py-8 text-center">
            <Bell className="mx-auto h-7 w-7 text-primary-black/30" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-primary-black">
              Nessuna richiesta in attesa
            </p>
            <p className="mt-1 text-xs text-primary-black/55">
              Quando un organizzatore chiede disponibilità, la noti qui e puoi
              accettare o rifiutare.
            </p>
          </section>
        )}

        {otherManagedRequests.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-primary-black">
              Storico richieste
            </h2>
            <ul className="space-y-2">
              {otherManagedRequests.map((request) => (
                <li
                  key={request.id}
                  className="rounded-2xl border border-primary-black/8 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary-black">
                        {request.eventPayload.title}
                      </p>
                      <p className="mt-0.5 text-xs text-primary-black/55">
                        {request.requesterName} · {request.locationName} ·{" "}
                        {formatDate(request.eventPayload.date)}
                      </p>
                    </div>
                    <RequestStatusBadge
                      status={request.status}
                      confirmationDeadline={request.confirmationDeadline}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  },
);
