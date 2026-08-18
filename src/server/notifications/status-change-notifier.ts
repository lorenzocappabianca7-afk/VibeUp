import { getRequestStatusShortLabel } from "@/lib/availability/request-status-display";
import { sendTransactionalEmail } from "@/lib/email/mailer";
import { getSiteUrl } from "@/lib/site";
import { resolveManagerNotifyTarget } from "@/server/notifications/availability-request-notify";
import type {
  AvailabilityRequest,
  AvailabilityRequestStatus,
} from "@/types/availability-request";

export interface StatusNotifyResult {
  ok: boolean;
  organizer?: { ok: boolean; error?: string };
  manager?: { ok: boolean; error?: string };
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
}): Promise<{ ok: boolean; error?: string }> {
  const result = await sendTransactionalEmail(input);
  if (!result.ok) {
    console.error("[status-change-notifier]", result.error);
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

function audienceCopy(audience: "organizer" | "manager"): string {
  return audience === "organizer"
    ? "Come organizzatore vedrai questo stato aggiornato in app."
    : "Come gestore vedrai questo stato aggiornato nelle tue notifiche.";
}

function buildStatusChangeBody(params: {
  request: AvailabilityRequest;
  nextStatus: AvailabilityRequestStatus;
  audience: "organizer" | "manager";
}): { subject: string; text: string } {
  const label = getRequestStatusShortLabel(
    params.nextStatus,
    params.request.confirmationDeadline,
  );
  const title = params.request.eventPayload.title;
  const location = params.request.locationName;
  const subject = `Stato aggiornato: ${label} — ${location}`;
  const greeting =
    params.audience === "organizer"
      ? `Ciao ${params.request.requesterName}!`
      : `Ciao!`;

  const text = `${greeting}

Lo stato della richiesta “${title}” a ${location} è ora:

→ ${label}

${audienceCopy(params.audience)}

Apri VibeUp:
${PUBLIC_SITE}

Il team VibeUp`;

  return { subject, text };
}

/**
 * Email both organizer and manager whenever an availability request status changes.
 * Never throws.
 */
export async function notifyAvailabilityStatusChange(params: {
  request: AvailabilityRequest;
  previousStatus: AvailabilityRequestStatus | null;
  nextStatus: AvailabilityRequestStatus;
  listingId?: string | null;
  /** Skip a party when a more specific email already covers them. */
  skipOrganizer?: boolean;
  skipManager?: boolean;
}): Promise<StatusNotifyResult> {
  if (
    params.previousStatus &&
    params.previousStatus === params.nextStatus
  ) {
    return { ok: true };
  }

  let organizerResult: { ok: boolean; error?: string } | undefined;
  if (!params.skipOrganizer) {
    const organizerEmail = params.request.requesterEmail?.trim().toLowerCase();
    if (organizerEmail) {
      const body = buildStatusChangeBody({
        request: params.request,
        nextStatus: params.nextStatus,
        audience: "organizer",
      });
      organizerResult = await sendViaEmail({
        to: organizerEmail,
        subject: body.subject,
        text: body.text,
        html: buildEmailHtml(body.subject, body.text),
      });
    } else {
      organizerResult = { ok: false, error: "Email organizzatore mancante." };
      console.info("[status-change-notifier] missing organizer email", {
        requestId: params.request.id,
      });
    }
  }

  let managerResult: { ok: boolean; error?: string } | undefined;
  if (!params.skipManager) {
    const manager = await resolveManagerNotifyTarget({
      locationId: params.request.locationId,
      listingId: params.listingId ?? null,
    });
    if (manager?.email) {
      const body = buildStatusChangeBody({
        request: params.request,
        nextStatus: params.nextStatus,
        audience: "manager",
      });
      managerResult = await sendViaEmail({
        to: manager.email,
        subject: body.subject,
        text: body.text,
        html: buildEmailHtml(body.subject, body.text),
      });
    } else {
      managerResult = { ok: false, error: "Gestore non trovato." };
      console.info("[status-change-notifier] missing manager email", {
        requestId: params.request.id,
      });
    }
  }

  return {
    ok: Boolean(organizerResult?.ok || managerResult?.ok),
    organizer: organizerResult,
    manager: managerResult,
  };
}
