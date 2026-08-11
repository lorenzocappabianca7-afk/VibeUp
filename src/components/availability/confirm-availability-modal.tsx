"use client";

import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useProfileCommunications } from "@/context/profile-communications-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarCheck2, MapPin, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function ConfirmAvailabilityModal() {
  const { setTab } = useTabNavigation();
  const {
    pendingUserConfirms,
    confirmAvailabilityRequest,
    confirmProposedAvailability,
    rejectProposedAvailability,
    snoozeAvailabilityConfirm,
  } = useAvailabilityRequests();
  const { addDepositReminder } = useProfileCommunications();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const request = pendingUserConfirms[0] ?? null;

  const isProposal =
    request?.status === "pending_user_review_proposal";

  const proposedSlots = useMemo(() => {
    if (!request) return [];
    const slots = request.managerProposedDates ?? [];
    if (slots.length > 0) return slots;
    return [
      {
        date: request.eventPayload.date,
        time: request.eventPayload.time,
        endTime: request.eventPayload.endTime,
      },
    ];
  }, [request]);

  const hasProposedPrice =
    typeof request?.managerProposedPrice === "number";

  const [selectedSlotKey, setSelectedSlotKey] = useState<string>("");
  const [acceptProposedPrice, setAcceptProposedPrice] = useState(true);

  useEffect(() => {
    if (!request || !isProposal) return;
    const first = proposedSlots[0];
    if (!first) return;
    setSelectedSlotKey(slotKey(first.date, first.time, first.endTime, 0));
    setAcceptProposedPrice(hasProposedPrice);
  }, [request?.id, isProposal, proposedSlots, hasProposedPrice, request]);

  useBodyScrollLock(Boolean(request));

  if (!request) return null;

  const payload = request.eventPayload;
  const isServiceRequest = payload.requestKind === "service";
  const busy = submittingId === request.id;

  function handleConfirmDirect() {
    if (busy) return;
    setSubmittingId(request.id);
    void confirmAvailabilityRequest(request.id).then((result) => {
      if (!result.ok) {
        setSubmittingId(null);
        return;
      }
      if (!isServiceRequest) {
        addDepositReminder({
          eventId: result.eventId,
          eventTitle: payload.title,
          locationName: payload.locationName,
          date: formatDate(payload.date),
        });
      }
      setTab("events");
    });
  }

  function handleConfirmProposal() {
    if (busy) return;
    const index = proposedSlots.findIndex((slot, i) =>
      slotKey(slot.date, slot.time, slot.endTime, i) === selectedSlotKey,
    );
    const slot = proposedSlots[index] ?? proposedSlots[0];
    if (!slot?.date) return;

    const selectedPrice =
      hasProposedPrice && acceptProposedPrice
        ? request.managerProposedPrice
        : hasProposedPrice
          ? payload.totalCost
          : null;

    setSubmittingId(request.id);
    void confirmProposedAvailability(request.id, {
      selectedDate: slot.date,
      selectedPrice,
    }).then((result) => {
      if (!result.ok) {
        setSubmittingId(null);
        return;
      }
      if (!isServiceRequest) {
        addDepositReminder({
          eventId: result.eventId,
          eventTitle: payload.title,
          locationName: payload.locationName,
          date: formatDate(slot.date),
        });
      }
      setTab("events");
    });
  }

  function handleRejectProposal() {
    if (busy) return;
    setSubmittingId(request.id);
    void rejectProposedAvailability(request.id).then((result) => {
      if (!result.ok) {
        setSubmittingId(null);
      }
    });
  }

  if (isProposal) {
    const chosenIndex = Math.max(
      0,
      proposedSlots.findIndex(
        (slot, i) =>
          slotKey(slot.date, slot.time, slot.endTime, i) === selectedSlotKey,
      ),
    );
    const chosen = proposedSlots[chosenIndex] ?? proposedSlots[0];
    const displayTotal =
      hasProposedPrice && acceptProposedPrice
        ? request.managerProposedPrice!
        : payload.totalCost;

    return (
      <div
        className="vibe-overlay-enter fixed inset-0 z-[85] flex items-end justify-center p-4 sm:items-center"
        data-overlay-open="true"
      >
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div
          className="vibe-sheet-enter relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-surface p-5 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-proposal-title"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
            <CalendarCheck2 className="h-6 w-6" aria-hidden />
          </div>
          <h2
            id="confirm-proposal-title"
            className="text-center text-lg font-bold text-primary-black"
          >
            Proposta del gestore
          </h2>
          <p className="mt-2 text-center text-sm text-primary-black/60">
            Il gestore di{" "}
            <span className="font-semibold text-primary-black">
              {request.locationName}
            </span>{" "}
            ha proposto alternative. Scegli un&apos;opzione o rifiuta.
          </p>

          <div className="mt-4 space-y-2 rounded-2xl border border-primary-black/8 bg-primary-black/[0.02] p-3 text-sm">
            <p className="font-semibold text-primary-black">{payload.title}</p>
            <p className="flex items-center gap-1.5 text-primary-black/60">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {payload.locationName}
            </p>
            <p className="flex items-center gap-1.5 text-primary-black/60">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {payload.guestCount} invitati · Totale{" "}
              {formatCurrency(displayTotal)}
            </p>
          </div>

          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-semibold text-primary-black">
              Date proposte
            </legend>
            {proposedSlots.map((slot, index) => {
              const key = slotKey(slot.date, slot.time, slot.endTime, index);
              const timeLabel =
                slot.time && slot.endTime
                  ? `${slot.time}–${slot.endTime}`
                  : slot.time || payload.time;
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm ${
                    selectedSlotKey === key
                      ? "border-brand-teal bg-brand-teal/10"
                      : "border-primary-black/10 bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="proposed-slot"
                    className="mt-1"
                    checked={selectedSlotKey === key}
                    onChange={() => setSelectedSlotKey(key)}
                  />
                  <span>
                    <span className="font-semibold text-primary-black">
                      {formatDate(slot.date)}
                    </span>
                    <span className="mt-0.5 block text-primary-black/60">
                      {timeLabel}
                      {slot.note ? ` · ${slot.note}` : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {hasProposedPrice ? (
            <fieldset className="mt-4 space-y-2">
              <legend className="text-sm font-semibold text-primary-black">
                Prezzo
              </legend>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm ${
                  acceptProposedPrice
                    ? "border-brand-teal bg-brand-teal/10"
                    : "border-primary-black/10"
                }`}
              >
                <input
                  type="radio"
                  name="proposed-price"
                  className="mt-1"
                  checked={acceptProposedPrice}
                  onChange={() => setAcceptProposedPrice(true)}
                />
                <span>
                  <span className="font-semibold text-primary-black">
                    Accetta prezzo proposto
                  </span>
                  <span className="mt-0.5 block text-primary-black/60">
                    {formatCurrency(request.managerProposedPrice!)}
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm ${
                  !acceptProposedPrice
                    ? "border-brand-teal bg-brand-teal/10"
                    : "border-primary-black/10"
                }`}
              >
                <input
                  type="radio"
                  name="proposed-price"
                  className="mt-1"
                  checked={!acceptProposedPrice}
                  onChange={() => setAcceptProposedPrice(false)}
                />
                <span>
                  <span className="font-semibold text-primary-black">
                    Mantieni prezzo originale
                  </span>
                  <span className="mt-0.5 block text-primary-black/60">
                    {formatCurrency(payload.totalCost)}
                  </span>
                </span>
              </label>
            </fieldset>
          ) : null}

          {chosen ? (
            <p className="mt-3 text-center text-xs text-primary-black/50">
              Opzione selezionata: {formatDate(chosen.date)}
              {hasProposedPrice
                ? ` · ${formatCurrency(displayTotal)}`
                : ""}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={handleRejectProposal}
              className="flex-1 rounded-2xl border border-primary-black/12 px-4 py-3 text-sm font-semibold text-primary-black/70 disabled:opacity-60"
            >
              Rifiuta la proposta
            </button>
            <button
              type="button"
              disabled={busy || !chosen?.date}
              onClick={handleConfirmProposal}
              className="flex-1 rounded-2xl bg-brand-teal px-4 py-3 text-sm font-bold text-primary-black disabled:opacity-60"
            >
              Conferma questa opzione
            </button>
          </div>
          <button
            type="button"
            onClick={() => snoozeAvailabilityConfirm(request.id)}
            className="mt-2 w-full py-2 text-center text-sm font-medium text-primary-black/45"
          >
            Non ora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="vibe-overlay-enter fixed inset-0 z-[85] flex items-end justify-center p-4 sm:items-center"
      data-overlay-open="true"
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div
        className="vibe-sheet-enter relative w-full max-w-md rounded-3xl bg-surface p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-availability-title"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal">
          <CalendarCheck2 className="h-6 w-6" aria-hidden />
        </div>
        <h2
          id="confirm-availability-title"
          className="text-center text-lg font-bold text-primary-black"
        >
          {isServiceRequest
            ? "Conferma servizio"
            : "Conferma creazione evento"}
        </h2>
        <p className="mt-2 text-center text-sm text-primary-black/60">
          {isServiceRequest ? (
            <>
              <span className="font-semibold text-primary-black">
                {request.locationName}
              </span>{" "}
              ha accettato. Confermi di aggiungere il servizio all&apos;evento?
            </>
          ) : (
            <>
              Il gestore di{" "}
              <span className="font-semibold text-primary-black">
                {request.locationName}
              </span>{" "}
              ha accettato la tua richiesta. Confermi di voler creare
              l&apos;evento nei tuoi eventi?
            </>
          )}
        </p>

        <div className="mt-4 space-y-2 rounded-2xl border border-primary-black/8 bg-primary-black/[0.02] p-3 text-sm">
          <p className="font-semibold text-primary-black">{payload.title}</p>
          <p className="flex items-center gap-1.5 text-primary-black/60">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {payload.locationName} · {formatDate(payload.date)} · {payload.time}
            –{payload.endTime}
          </p>
          <p className="flex items-center gap-1.5 text-primary-black/60">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {payload.guestCount} invitati · Totale{" "}
            {formatCurrency(payload.totalCost)}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => snoozeAvailabilityConfirm(request.id)}
            className="flex-1 rounded-2xl border border-primary-black/12 px-4 py-3 text-sm font-semibold text-primary-black/70"
          >
            Non ora
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirmDirect}
            className="flex-1 rounded-2xl bg-brand-teal px-4 py-3 text-sm font-bold text-primary-black disabled:opacity-60"
          >
            {isServiceRequest
              ? "Conferma servizio"
              : "Conferma e crea evento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function slotKey(
  date: string,
  time?: string,
  endTime?: string,
  index = 0,
) {
  return `${date}|${time ?? ""}|${endTime ?? ""}|${index}`;
}
