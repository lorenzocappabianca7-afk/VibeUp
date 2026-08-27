"use client";

import {
  saveSiaeChoiceRemote,
  startSiaeCheckoutRemote,
} from "@/lib/bookings/client";
import { isAdminPreviewEventId } from "@/lib/admin-preview-event";
import {
  formatSiaePrice,
  getSiaeDeadline,
  isCloudBookingId,
  isSiaeReminderDue,
  SIAE_PERMIT_LIVE_EUR,
  SIAE_PERMIT_RECORDED_EUR,
  SIAE_STATUS_LABELS,
  SIAE_VIBEUP_FEE_EUR,
  SIAE_VIBEUP_TOTAL_EUR,
  type SiaeChoice,
  type SiaeStatus,
} from "@/lib/siae";
import { EventHintLink } from "@/components/events/event-hint-link";
import { formatDate } from "@/lib/utils";
import type { UserEvent } from "@/types/event";
import { Check, ChevronDown, FileText, Landmark, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface SiaeDocumentCardProps {
  event: UserEvent;
  /** `page` drops the post-it section chrome (event dashboard). */
  layout?: "postit" | "page";
  /** Pay/choose actions unlock after the location deposit is paid. */
  unlocked?: boolean;
  onLocalPatch: (
    eventId: string,
    patch: {
      siaeChoice?: SiaeChoice | null;
      siaeStatus?: SiaeStatus;
      siaePaidAt?: string;
    },
  ) => void;
}

function venueFeeLabel(fee: number | null | undefined) {
  if (typeof fee === "number" && Number.isFinite(fee) && fee > 0) {
    return formatSiaePrice(fee);
  }
  return "Di solito più caro";
}

function vibeUpVsVenueCopy(
  venueFee: number | null | undefined,
  vibeUpPrice: number,
): string {
  if (typeof venueFee === "number" && venueFee > vibeUpPrice) {
    return `Se ti serve, con VibeUp paghi ${formatSiaePrice(venueFee - vibeUpPrice)} in meno del locale.`;
  }
  return "Se ti serve il permesso, con VibeUp paghi meno che al locale.";
}

export function SiaeDocumentCard({
  event,
  layout = "postit",
  unlocked = true,
  onLocalPatch,
}: SiaeDocumentCardProps) {
  const [busy, setBusy] = useState<SiaeChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(
    () => event.siaeStatus === "diy" || event.siaeStatus === "venue",
  );
  const status: SiaeStatus = event.siaeStatus ?? "unselected";
  const decided = status !== "unselected";
  const [expanded, setExpanded] = useState(decided);

  const reminder = isSiaeReminderDue(event.date, status);
  const deadline = getSiaeDeadline(event.date);
  const preview = isAdminPreviewEventId(event.id);
  const locked = status === "managed" && !preview;
  const permitPrice = SIAE_PERMIT_RECORDED_EUR;
  const vibeUpPrice = SIAE_VIBEUP_TOTAL_EUR;

  useEffect(() => {
    if (status === "diy" || status === "venue") {
      setShowAlternatives(true);
    }
    if (decided) setExpanded(true);
  }, [decided, status]);

  const applyEvent = useCallback(
    (next: UserEvent) => {
      onLocalPatch(event.id, {
        siaeChoice: next.siaeChoice,
        siaeStatus: next.siaeStatus,
        siaePaidAt: next.siaePaidAt,
      });
    },
    [event.id, onLocalPatch],
  );

  const chooseSelfServe = useCallback(
    async (choice: "diy" | "venue") => {
      const previous = {
        siaeChoice: event.siaeChoice,
        siaeStatus: event.siaeStatus,
      };
      setError(null);
      setBusy(choice);
      onLocalPatch(event.id, {
        siaeChoice: choice,
        siaeStatus: choice,
      });
      if (isCloudBookingId(event.id)) {
        const result = await saveSiaeChoiceRemote({
          eventId: event.id,
          choice,
        });
        if (!result.ok) {
          onLocalPatch(event.id, previous);
          setError(result.error);
          setBusy(null);
          return;
        }
        applyEvent(result.event);
      }
      setBusy(null);
    },
    [applyEvent, event.id, event.siaeChoice, event.siaeStatus, onLocalPatch],
  );

  const chooseVibeUp = useCallback(async () => {
    setError(null);
    setBusy("vibeup");
    if (isAdminPreviewEventId(event.id)) {
      onLocalPatch(event.id, {
        siaeChoice: "vibeup",
        siaeStatus: "managed",
        siaePaidAt: new Date().toISOString(),
      });
      setBusy(null);
      return;
    }
    if (!isCloudBookingId(event.id)) {
      setError(
        "Per far gestire il documento a VibeUp serve l’evento confermato con caparra online.",
      );
      setBusy(null);
      return;
    }
    const result = await startSiaeCheckoutRemote({ eventId: event.id });
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    applyEvent(result.event);
    if ("alreadyPaid" in result && result.alreadyPaid) {
      setBusy(null);
      return;
    }
    if ("checkoutUrl" in result) {
      window.location.assign(result.checkoutUrl);
      return;
    }
    setBusy(null);
  }, [applyEvent, event.id, onLocalPatch]);

  const actionsLocked = locked || !unlocked || Boolean(busy);
  const shellClass =
    layout === "page"
      ? "min-w-0 overflow-hidden rounded-2xl"
      : "event-postit-section min-w-0 overflow-hidden border-t px-3 sm:px-4";
  const savingsCopy = vibeUpVsVenueCopy(event.siaeVenueFee, vibeUpPrice);

  if (!expanded) {
    return (
      <section className={shellClass}>
        <div className="event-postit-dark px-3 py-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <FileText
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-teal"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">Documento SIAE</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-snug text-white/65">
                {savingsCopy}
              </p>
              <p className="mt-1.5 text-[11px] font-bold text-white">
                VibeUp {formatSiaePrice(vibeUpPrice)}
                <span className="font-semibold text-white/50">
                  {" "}
                  · locale {venueFeeLabel(event.siaeVenueFee).toLowerCase()}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-teal"
          >
            Ingrandisci
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={shellClass}>
      <div className="event-postit-dark p-3.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <FileText className="h-4 w-4 text-brand-teal" aria-hidden />
              Documento SIAE
            </p>
            <p className="event-postit-dark-muted mt-0.5 text-xs font-semibold">
              {savingsCopy}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {reminder ? (
              <span className="rounded-full bg-brand-teal px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink-inverse">
                Decidi in tempo
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-0.5 text-[11px] font-bold text-white/55"
            >
              Riduci
              <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden />
            </button>
          </div>
        </div>

        {status === "managed" ? (
          <div className="mt-3 rounded-xl bg-brand-teal/15 px-3 py-2.5">
            <p className="text-sm font-bold text-white">
              Documento SIAE: in gestione da VibeUp
            </p>
            <p className="mt-0.5 text-xs font-semibold text-white/65">
              Ci pensiamo noi.
              {deadline
                ? ` Pratica da chiudere entro il ${formatDate(deadline)}.`
                : null}
              {event.siaePaidAt
                ? ` Pagato ${formatSiaePrice(vibeUpPrice)}.`
                : null}
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm font-bold text-white">
              Fallo gestire a VibeUp
            </p>
            <p className="mt-0.5 text-xs font-semibold text-white/55">
              Zero pensieri, ci pensiamo noi. Include il permesso
              {` + ${formatSiaePrice(SIAE_VIBEUP_FEE_EUR)} di gestione.`}
              {typeof event.siaeVenueFee === "number" &&
              event.siaeVenueFee > vibeUpPrice
                ? " Spesso meno del locale."
                : null}
            </p>
            <button
              type="button"
              disabled={actionsLocked}
              onClick={() => void chooseVibeUp()}
              className={`mt-3 inline-flex w-full items-center justify-center rounded-lg bg-brand-teal px-4 py-2.5 text-xs font-bold text-ink-inverse transition-colors hover:bg-brand-teal/90 disabled:opacity-50 ${
                status === "pending_payment" ? "ring-2 ring-brand-teal/40" : ""
              }`}
            >
              {status === "pending_payment"
                ? `Completa pagamento ${formatSiaePrice(vibeUpPrice)}`
                : unlocked
                  ? `Paga ${formatSiaePrice(vibeUpPrice)}`
                  : `VibeUp ${formatSiaePrice(vibeUpPrice)}`}
            </button>
            {!unlocked ? (
              <p className="mt-1.5 text-[11px] font-semibold text-white/50">
                Potrai sceglierlo e pagarlo dopo la caparra.
              </p>
            ) : null}

            <EventHintLink
              expanded={showAlternatives}
              disabled={Boolean(busy) || locked}
              onClick={() => setShowAlternatives((open) => !open)}
              className="mt-2.5 text-xs font-semibold text-white/70 decoration-white/40 hover:text-white hover:decoration-white"
            >
              Oppure
            </EventHintLink>

            {showAlternatives ? (
              <ul className="mt-2 space-y-2">
                <li>
                  <button
                    type="button"
                    disabled={actionsLocked}
                    onClick={() => void chooseSelfServe("diy")}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      status === "diy"
                        ? "bg-white/12 ring-1 ring-brand-teal/50"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <User
                      className="mt-0.5 h-4 w-4 shrink-0 text-white/80"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white">
                          Fai da te
                        </span>
                        <span className="text-xs font-black text-brand-teal">
                          {formatSiaePrice(permitPrice)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-white/55">
                        Permesso SIAE ufficiale (DJ/playlist). Lo paghi tu sul
                        portale SIAE.
                        {SIAE_PERMIT_LIVE_EUR < permitPrice
                          ? ` Solo dal vivo: ${formatSiaePrice(SIAE_PERMIT_LIVE_EUR)}.`
                          : null}
                      </span>
                    </span>
                    {status === "diy" ? (
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    disabled={actionsLocked}
                    onClick={() => void chooseSelfServe("venue")}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      status === "venue"
                        ? "bg-white/12 ring-1 ring-brand-teal/50"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <Landmark
                      className="mt-0.5 h-4 w-4 shrink-0 text-white/80"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white">
                          Richiedilo al locale
                        </span>
                        <span className="max-w-[9rem] text-right text-xs font-black text-white/80">
                          {venueFeeLabel(event.siaeVenueFee)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-white/55">
                        Il locale prepara la pratica, se lo offre.
                      </span>
                    </span>
                    {status === "venue" ? (
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        )}

        {status !== "managed" && status !== "unselected" && status !== "pending_payment" ? (
          <p className="mt-2 text-[11px] font-semibold text-white/50">
            Scelta salvata: {SIAE_STATUS_LABELS[status]}. Puoi cambiarla finché
            non paghi VibeUp.
          </p>
        ) : null}

        {status === "pending_payment" ? (
          <p className="mt-2 text-[11px] font-semibold text-white/55">
            Pagamento in corso. Completa Stripe o riprova.
          </p>
        ) : null}

        {deadline && status !== "managed" ? (
          <p className="mt-2 text-[11px] font-semibold text-white/45">
            Scadenza indicativa pratica: {formatDate(deadline)}.
          </p>
        ) : null}

        {error ? (
          <p className="mt-2 text-xs font-semibold text-brand-pink">{error}</p>
        ) : null}

        {busy ? (
          <p className="mt-2 text-[11px] font-semibold text-white/50">
            Un attimo…
          </p>
        ) : null}
      </div>
    </section>
  );
}
