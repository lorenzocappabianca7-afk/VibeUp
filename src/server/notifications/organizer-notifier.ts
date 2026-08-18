import type { AvailabilityRequest } from "@/types/availability-request";
import {
  CONFIRMATION_DEADLINE_DAYS,
  formatConfirmationDeadlineIt,
  confirmationDeadlineCountdownLabel,
} from "@/lib/availability/confirmation-deadline";
import { sendTransactionalEmail } from "@/lib/email/mailer";
import { getSiteUrl } from "@/lib/site";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface NotifyResult {
  ok: boolean;
  error?: string;
  channel?: "email" | "whatsapp";
}

const PUBLIC_SITE = getSiteUrl();

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildEmailHtml(title: string, bodyText: string): string {
  const htmlBody = escapeHtml(bodyText).replaceAll("\n", "<br />");
  return `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#0F1115;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px;border-radius:20px;background:#1a1c21;border:1px solid rgba(245,245,247,0.12);">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.6;">VibeUp</p>
      <div style="font-size:15px;line-height:1.55;">${htmlBody}</div>
    </div>
  </body>
</html>`;
}

async function sendViaEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<NotifyResult> {
  const result = await sendTransactionalEmail(input);
  if (!result.ok) {
    console.error("[organizer-notifier]", result.error);
    return { ok: false, error: result.error, channel: "email" };
  }
  return { ok: true, channel: "email" };
}

function resolveOrganizerEmail(
  request: AvailabilityRequest,
): string | null {
  const email = request.requesterEmail?.trim().toLowerCase() || "";
  return email || null;
}

function deadlineLines(request: AvailabilityRequest): {
  deadlineLabel: string;
  countdown: string;
} {
  const deadlineLabel =
    formatConfirmationDeadlineIt(request.confirmationDeadline) ??
    `${CONFIRMATION_DEADLINE_DAYS} giorni`;
  const countdown =
    confirmationDeadlineCountdownLabel(request.confirmationDeadline) ??
    `${CONFIRMATION_DEADLINE_DAYS} giorni`;
  return { deadlineLabel, countdown };
}

function buildDecisionBody(request: AvailabilityRequest): {
  subject: string;
  text: string;
} {
  const location = request.locationName;
  const title = request.eventPayload.title;
  const note = (request.managerNote || "").trim();
  const decision =
    request.managerDecision === "accept" ||
    request.status === "pending_user_confirm"
      ? "accept"
      : "decline";

  if (decision === "accept") {
    const { deadlineLabel, countdown } = deadlineLines(request);
    const text = `Ciao ${request.requesterName}! 👋

Buone notizie da VibeUp: il gestore di ${location} ha accettato la tua richiesta per “${title}”.

Hai ${CONFIRMATION_DEADLINE_DAYS} giorni per confermare e pagare la caparra, altrimenti lo slot viene liberato.
⏰ Scadenza: ${deadlineLabel} (${countdown})

Apri l’app VibeUp e conferma:
${PUBLIC_SITE}

A presto,
Il team VibeUp`;
    return {
      subject: `Richiesta accettata — conferma entro ${CONFIRMATION_DEADLINE_DAYS} giorni`,
      text,
    };
  }

  const noteLine = note ? `\n\nMotivazione del gestore: ${note}` : "";
  const text = `Ciao ${request.requesterName}! 👋

Purtroppo il gestore di ${location} non può accettare la tua richiesta per “${title}”.${noteLine}

Puoi riprovare con un’altra data o un’altra location dall’app VibeUp.

A presto,
Il team VibeUp`;
  return {
    subject: `Risposta sulla richiesta — ${location}`,
    text,
  };
}

function buildProposalBody(request: AvailabilityRequest): {
  subject: string;
  text: string;
} {
  const location = request.locationName;
  const title = request.eventPayload.title;
  const dates = request.managerProposedDates ?? [];
  const dateLines =
    dates.length > 0
      ? dates
          .map((slot) => {
            const day = slot.date ? formatDate(slot.date) : "data da definire";
            const time =
              slot.time && slot.endTime
                ? ` · ${slot.time}–${slot.endTime}`
                : slot.time
                  ? ` · ${slot.time}`
                  : "";
            return `• ${day}${time}`;
          })
          .join("\n")
      : "• (vedi dettagli in app)";
  const priceLine =
    typeof request.managerProposedPrice === "number"
      ? `\n💶 Prezzo proposto: ${formatCurrency(request.managerProposedPrice)}`
      : "";
  const { deadlineLabel, countdown } = deadlineLines(request);

  const text = `Ciao ${request.requesterName}! 👋

Il gestore di ${location} ha proposto delle alternative per “${title}”.

📅 Opzioni:
${dateLines}${priceLine}

Hai ${CONFIRMATION_DEADLINE_DAYS} giorni per scegliere o rifiutare, altrimenti la proposta scade.
⏰ Scadenza: ${deadlineLabel} (${countdown})

Apri VibeUp:
${PUBLIC_SITE}

A presto,
Il team VibeUp`;

  return {
    subject: `Proposta alternativa — rispondi entro ${CONFIRMATION_DEADLINE_DAYS} giorni`,
    text,
  };
}

/**
 * Notify the organizer that the manager accepted or declined.
 * Recipient is always the logged-in organizer email on the request.
 */
export async function notifyOrganizerOfManagerDecision(
  request: AvailabilityRequest,
): Promise<NotifyResult> {
  const to = resolveOrganizerEmail(request);
  if (!to) {
    console.info(
      "[notifyOrganizerOfManagerDecision] missing requesterEmail",
      { requestId: request.id },
    );
    return { ok: false, error: "Email organizzatore mancante." };
  }

  const { subject, text } = buildDecisionBody(request);
  return sendViaEmail({
    to,
    subject,
    text,
    html: buildEmailHtml(subject, text),
  });
}

/**
 * Notify the organizer that admin forwarded a manager proposal
 * (status → pending_user_review_proposal).
 */
export async function notifyOrganizerOfProposal(
  request: AvailabilityRequest,
): Promise<NotifyResult> {
  const to = resolveOrganizerEmail(request);
  if (!to) {
    console.info("[notifyOrganizerOfProposal] missing requesterEmail", {
      requestId: request.id,
    });
    return { ok: false, error: "Email organizzatore mancante." };
  }

  const { subject, text } = buildProposalBody(request);
  return sendViaEmail({
    to,
    subject,
    text,
    html: buildEmailHtml(subject, text),
  });
}

/** Reminder ~24h before confirmation_deadline. */
export async function notifyOrganizerConfirmationReminder(
  request: AvailabilityRequest,
): Promise<NotifyResult> {
  const to = resolveOrganizerEmail(request);
  if (!to) {
    return { ok: false, error: "Email organizzatore mancante." };
  }

  const { deadlineLabel, countdown } = deadlineLines(request);
  const subject = `Promemoria: conferma entro ${deadlineLabel}`;
  const text = `Ciao ${request.requesterName}! 👋

Ti ricordiamo che la disponibilità per “${request.eventPayload.title}” a ${request.locationName} scade presto.

⏰ Scadenza: ${deadlineLabel} (${countdown})

Se non confermi (e non paghi la caparra) entro quella data, lo slot verrà liberato.

Apri VibeUp e completa la conferma:
${PUBLIC_SITE}

A presto,
Il team VibeUp`;

  return sendViaEmail({
    to,
    subject,
    text,
    html: buildEmailHtml(subject, text),
  });
}

/** Inform organizer that the hold expired. */
export async function notifyOrganizerConfirmationExpired(
  request: AvailabilityRequest,
): Promise<NotifyResult> {
  const to = resolveOrganizerEmail(request);
  if (!to) {
    return { ok: false, error: "Email organizzatore mancante." };
  }

  const subject = `Disponibilità scaduta — ${request.locationName}`;
  const text = `Ciao ${request.requesterName}! 👋

La finestra di conferma per “${request.eventPayload.title}” a ${request.locationName} è scaduta e lo slot è stato liberato.

Puoi inviare una nuova richiesta di disponibilità dall’app VibeUp quando vuoi.

A presto,
Il team VibeUp`;

  return sendViaEmail({
    to,
    subject,
    text,
    html: buildEmailHtml(subject, text),
  });
}
