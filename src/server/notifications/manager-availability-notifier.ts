import type { AvailabilityRequest } from "@/types/availability-request";
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
 * {{dateLabel}} {{timeLabel}} {{guests}} {{total}} {{responseLink}}
 */
export const AVAILABILITY_REQUEST_MESSAGE_TEMPLATE = `Ciao! 👋 Qui è VibeUp.

{{requesterName}} ti ha inviato una richiesta di disponibilità.

📍 {{locationName}}
🎉 {{title}}{{descriptionLine}}
📅 {{dateLabel}} · {{timeLabel}}
👥 {{guests}} invitati
💶 Totale stimato (VibeUp): {{total}}

Puoi rispondere in tre modi dal tuo link personale:
1) Accettare così com’è
2) Rifiutare (motivazione facoltativa)
3) Proporre una data e/o un prezzo diversi

Apri il link per rispondere (valido pochi giorni):
{{responseLink}}

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

/** Reusable Italian copy for WhatsApp (plain) and email body. */
export function buildAvailabilityRequestMessageBody(
  request: AvailabilityRequest,
): string {
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
  const responseLink = `${PUBLIC_SITE}/r/${encodeURIComponent(request.responseToken)}`;

  return fillTemplate(AVAILABILITY_REQUEST_MESSAGE_TEMPLATE, {
    requesterName: request.requesterName,
    locationName: request.locationName,
    title: payload.title,
    descriptionLine,
    dateLabel,
    timeLabel,
    guests,
    total,
    responseLink,
  });
}

export function buildAvailabilityRequestEmailSubject(
  request: AvailabilityRequest,
): string {
  return fillTemplate(AVAILABILITY_REQUEST_EMAIL_SUBJECT_TEMPLATE, {
    locationName: request.locationName,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildAvailabilityRequestEmailHtml(bodyText: string): string {
  const htmlBody = escapeHtml(bodyText).replaceAll("\n", "<br />");
  return `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nuova richiesta disponibilità</title>
  </head>
  <body style="margin:0;padding:24px;background:#0F1115;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px;border-radius:20px;background:#1a1c21;border:1px solid rgba(245,245,247,0.12);">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.6;">VibeUp</p>
      <div style="font-size:15px;line-height:1.55;">${htmlBody}</div>
    </div>
  </body>
</html>`;
}

/**
 * Placeholder WhatsApp Business send.
 * Wire a provider later (Twilio / 360dialog / Meta Cloud API).
 * Env: WHATSAPP_API_KEY, WHATSAPP_SENDER_NUMBER
 */
async function sendViaWhatsapp(input: {
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

  // TODO: replace with real provider call (Twilio / 360dialog / Meta).
  // Intentionally no network call until credentials are confirmed.
  console.info(
    "[manager-availability-notifier] WhatsApp placeholder ready",
    {
      from: sender,
      to: input.toE164,
      bodyLength: input.body.length,
      hasApiKey: true,
    },
  );

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
  const html = buildAvailabilityRequestEmailHtml(body);

  const whatsappNumber = manager.whatsappNumber?.trim() || "";
  const email = manager.email?.trim().toLowerCase() || "";

  let channel: ManagerNotifyChannel = manager.channel;

  if (channel === "whatsapp" && !whatsappNumber) {
    console.warn(
      "[manager-availability-notifier] channel=whatsapp ma manca whatsappNumber; fallback su email.",
    );
    channel = "email";
  }

  if (channel === "whatsapp") {
    return sendViaWhatsapp({ toE164: whatsappNumber, body });
  }

  if (!email) {
    return {
      ok: false,
      error:
        "Nessun canale disponibile: manca email (e WhatsApp non utilizzabile).",
      channel: "email",
    };
  }

  return sendViaEmail({ to: email, subject, text: body, html });
}
