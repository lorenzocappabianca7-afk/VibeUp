import type { AvailabilityRequest } from "@/types/availability-request";
import { buildAvailabilityRequestDetailsBlock } from "@/lib/availability-request-details";
import { buildManagerResponseUrl } from "@/lib/availability/manager-response-links";
import { sendTransactionalEmail } from "@/lib/email/mailer";
import { getSiteUrl } from "@/lib/site";
import { formatCurrency, formatDate } from "@/lib/utils";

export type ManagerNotifyChannel = "whatsapp" | "email";

export interface ManagerNotifyTarget {
  channel: ManagerNotifyChannel;
  whatsappNumber?: string | null;
  email?: string | null;
}

export interface NotifyResult {
  ok: boolean;
  error?: string;
  /** Channel actually used after fallbacks. */
  channel?: ManagerNotifyChannel;
}

const PUBLIC_SITE = getSiteUrl();

/**
 * Template testuale IT (plain). Placeholder:
 * {{requesterName}} {{locationName}} {{title}} {{descriptionLine}}
 * {{dateLabel}} {{timeLabel}} {{guests}} {{detailsBlock}} {{total}}
 * {{acceptLink}} {{declineLink}} {{proposeLink}}
 */
export const AVAILABILITY_REQUEST_MESSAGE_TEMPLATE = `Ciao! 👋 Qui è VibeUp.

{{requesterName}} ti ha inviato una richiesta di disponibilità.

📍 {{locationName}}
🎉 {{title}}{{descriptionLine}}
📅 {{dateLabel}} · {{timeLabel}}
👥 {{guests}} invitati
{{detailsBlock}}
💶 Totale stimato (VibeUp): {{total}}

Rispondi con uno di questi link unici (valgono pochi giorni, un solo click):
• Accetta: {{acceptLink}}
• Rifiuta: {{declineLink}}
• Proponi alternativa: {{proposeLink}}

Il primo click su Accetta o Rifiuta aggiorna subito la richiesta. Un secondo click (o un inoltro) non potrà più cambiarla.

I contatti del cliente restano privati finché non viene pagata la caparra.

Grazie,
Il team VibeUp`;

export const AVAILABILITY_REQUEST_EMAIL_SUBJECT_TEMPLATE =
  "Nuova richiesta disponibilità — {{locationName}}";

function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function requestCopyVars(request: AvailabilityRequest) {
  const payload = request.eventPayload;
  const dateLabel = payload.date ? formatDate(payload.date) : "da definire";
  const timeLabel =
    payload.time && payload.endTime
      ? `${payload.time}–${payload.endTime}`
      : payload.time || "orario da definire";
  const guests =
    typeof payload.guestCount === "number" && payload.guestCount > 0
      ? String(payload.guestCount)
      : "n.d.";
  const total =
    typeof payload.totalCost === "number"
      ? formatCurrency(payload.totalCost)
      : "n.d.";
  const description = (payload.description || "").trim();
  const descriptionLine = description ? `\n📝 ${description}` : "";
  const detailsBlock = buildAvailabilityRequestDetailsBlock(payload);
  const token = request.responseToken;
  return {
    requesterName: request.requesterName,
    locationName: request.locationName,
    title: payload.title,
    description,
    descriptionLine,
    dateLabel,
    timeLabel,
    guests,
    detailsBlock,
    total,
    acceptLink: buildManagerResponseUrl(token, "accept", PUBLIC_SITE),
    declineLink: buildManagerResponseUrl(token, "decline", PUBLIC_SITE),
    proposeLink: buildManagerResponseUrl(token, "propose", PUBLIC_SITE),
  };
}

/** Reusable Italian copy for WhatsApp (plain) and email body. */
export function buildAvailabilityRequestMessageBody(
  request: AvailabilityRequest,
): string {
  return fillTemplate(
    AVAILABILITY_REQUEST_MESSAGE_TEMPLATE,
    requestCopyVars(request),
  );
}

export function buildAvailabilityRequestEmailSubject(
  request: AvailabilityRequest,
): string {
  return fillTemplate(AVAILABILITY_REQUEST_EMAIL_SUBJECT_TEMPLATE, {
    locationName: request.locationName,
  });
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(15,15,17,0.45);width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-size:15px;line-height:1.45;color:#0F0F11;">${escapeHtml(value).replaceAll("\n", "<br />")}</td>
  </tr>`;
}

function actionButton(href: string, label: string, background: string, color: string) {
  return `<td style="padding:0 4px 8px 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 16px;border-radius:999px;background:${background};color:${color};font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>
  </td>`;
}

export function buildAvailabilityRequestEmailHtml(
  request: AvailabilityRequest,
): string {
  const vars = requestCopyVars(request);
  const rows = [
    detailRow("Locale", vars.locationName),
    detailRow("Evento", vars.title),
    vars.description ? detailRow("Descrizione", vars.description) : "",
    detailRow("Data", vars.dateLabel),
    detailRow("Orario", vars.timeLabel),
    detailRow("Invitati", vars.guests),
    vars.detailsBlock ? detailRow("Dettagli", vars.detailsBlock) : "",
    detailRow("Totale stimato", vars.total),
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nuova richiesta disponibilità</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F0F11;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(15,15,17,0.08);">
            <tr>
              <td style="padding:28px 28px 12px;background:#0F0F11;color:#ffffff;">
                <p style="margin:0;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.7;">VibeUp</p>
                <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;">Nuova richiesta di disponibilità</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                  Ciao, ${escapeHtml(vars.requesterName)} ha inviato una richiesta per ${escapeHtml(vars.locationName)}.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                  ${rows}
                </table>
                <p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:rgba(15,15,17,0.6);">
                  Accetta e Rifiuta aggiornano subito lo stato. Il primo click vale: un secondo click, o un inoltro, non potrà più cambiare la risposta.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 8px;">
                  <tr>
                    ${actionButton(vars.acceptLink, "Accetta", "#32B4B4", "#0F0F11")}
                    ${actionButton(vars.declineLink, "Rifiuta", "#E85D75", "#ffffff")}
                  </tr>
                </table>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                  <tr>
                    ${actionButton(vars.proposeLink, "Proponi alternativa", "#0F0F11", "#ffffff")}
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(15,15,17,0.45);">
                  “Proponi alternativa” ti porta su VibeUp per inserire date e/o un prezzo diverso.
                  I contatti del cliente restano privati fino al pagamento della caparra.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px;border-top:1px solid rgba(15,15,17,0.08);">
                <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(15,15,17,0.45);">
                  Grazie,<br />
                  Il team VibeUp
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Placeholder WhatsApp Business send — not used for availability requests yet.
 * Env: WHATSAPP_API_KEY, WHATSAPP_SENDER_NUMBER
 */
export async function sendViaWhatsappPlaceholder(input: {
  toE164: string;
  body: string;
}): Promise<NotifyResult> {
  const apiKey = process.env.WHATSAPP_API_KEY?.trim() || "";
  const sender = process.env.WHATSAPP_SENDER_NUMBER?.trim() || "";

  if (!apiKey || !sender) {
    console.info(
      "[manager-availability-notifier] WhatsApp placeholder — missing WHATSAPP_API_KEY / WHATSAPP_SENDER_NUMBER. Would send to",
      input.toE164,
    );
    return {
      ok: false,
      error:
        "WhatsApp non configurato (WHATSAPP_API_KEY / WHATSAPP_SENDER_NUMBER).",
      channel: "whatsapp",
    };
  }

  console.info("[manager-availability-notifier] WhatsApp placeholder ready", {
    from: sender,
    to: input.toE164,
    bodyLength: input.body.length,
    hasApiKey: true,
  });

  return {
    ok: false,
    error:
      "Invio WhatsApp ancora in modalità placeholder: collega il provider reale.",
    channel: "whatsapp",
  };
}

async function sendViaEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<NotifyResult> {
  const result = await sendTransactionalEmail(input);
  if (!result.ok) {
    console.error("[manager-availability-notifier]", result.error);
    return { ok: false, error: result.error, channel: "email" };
  }
  return { ok: true, channel: "email" };
}

/**
 * Notify the listing manager about a new availability request.
 * Live channel is email. WhatsApp Business stays a future option.
 * Never includes client email/phone — contacts stay private until deposit.
 */
export async function sendAvailabilityRequestToManager(
  request: AvailabilityRequest,
  manager: ManagerNotifyTarget,
): Promise<NotifyResult> {
  if (!request.responseToken) {
    return { ok: false, error: "response_token mancante sulla richiesta." };
  }

  const body = buildAvailabilityRequestMessageBody(request);
  const subject = buildAvailabilityRequestEmailSubject(request);
  const html = buildAvailabilityRequestEmailHtml(request);

  const email = manager.email?.trim().toLowerCase() || "";
  if (!email) {
    return {
      ok: false,
      error: "Nessun canale disponibile: manca l’email del gestore.",
      channel: "email",
    };
  }

  if (manager.channel === "whatsapp") {
    console.info(
      "[manager-availability-notifier] Preferenza WhatsApp ignorata per ora: le richieste partono via email.",
      manager.whatsappNumber ? "numero presente" : "numero assente",
    );
  }

  return sendViaEmail({ to: email, subject, text: body, html });
}
