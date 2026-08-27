import { formatDate } from "@/lib/utils";
import {
  getVibeUpFromEmail,
  isTransactionalEmailConfigured,
  sendTransactionalEmail,
} from "@/lib/email/mailer";
import {
  SIAE_PERMIT_RECORDED_EUR,
  SIAE_VIBEUP_FEE_EUR,
  SIAE_VIBEUP_TOTAL_EUR,
  formatSiaePrice,
  getSiaeDeadline,
} from "@/lib/siae";

export function getVibeUpOpsEmail() {
  const configured = process.env.VIBEUP_OPS_EMAIL?.trim();
  return configured || "info@vibeupevents.com";
}

export interface SiaeManagedNoticeInput {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  locationName: string;
  city: string;
  guestCount: number;
  bookingId: string;
  organizerId: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function notifyTeamSiaeManaged(
  input: SiaeManagedNoticeInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTransactionalEmailConfigured()) {
    return { ok: false, error: "Email transazionale non configurata." };
  }

  const deadline = getSiaeDeadline(input.eventDate);
  const deadlineLabel = deadline
    ? formatDate(deadline.toISOString().slice(0, 10))
    : "n/d";
  const to = getVibeUpOpsEmail();
  const from = getVibeUpFromEmail();
  const subject = `SIAE da gestire — ${input.eventTitle}`;
  const text = [
    "Nuova pratica SIAE pagata su VibeUp.",
    `Evento: ${input.eventTitle}`,
    `Data: ${input.eventDate} ore ${input.eventTime}`,
    `Location: ${input.locationName}, ${input.city}`,
    `Ospiti: ${input.guestCount}`,
    `Importo: ${formatSiaePrice(SIAE_VIBEUP_TOTAL_EUR)} (permesso ${formatSiaePrice(SIAE_PERMIT_RECORDED_EUR)} + gestione ${formatSiaePrice(SIAE_VIBEUP_FEE_EUR)})`,
    `Scadenza pratica (indicativa): ${deadlineLabel}`,
    `Booking ID: ${input.bookingId}`,
    `Organizer ID: ${input.organizerId}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f6f7;color:#0F0F11;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(15,15,17,0.08);">
      <tr>
        <td style="padding:24px 28px 12px;background:#0F0F11;color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.7;">VibeUp ops</p>
          <h1 style="margin:8px 0 0;font-size:22px;">Documento SIAE da gestire</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Un organizzatore ha pagato la gestione SIAE (${escapeHtml(formatSiaePrice(SIAE_VIBEUP_TOTAL_EUR))}: permesso ${escapeHtml(formatSiaePrice(SIAE_PERMIT_RECORDED_EUR))} + ${escapeHtml(formatSiaePrice(SIAE_VIBEUP_FEE_EUR))} di pratica).</p>
          <p style="margin:0 0 6px;"><strong>Evento:</strong> ${escapeHtml(input.eventTitle)}</p>
          <p style="margin:0 0 6px;"><strong>Quando:</strong> ${escapeHtml(input.eventDate)} · ${escapeHtml(input.eventTime)}</p>
          <p style="margin:0 0 6px;"><strong>Dove:</strong> ${escapeHtml(input.locationName)}, ${escapeHtml(input.city)}</p>
          <p style="margin:0 0 6px;"><strong>Ospiti:</strong> ${escapeHtml(String(input.guestCount))}</p>
          <p style="margin:0 0 6px;"><strong>Scadenza pratica:</strong> ${escapeHtml(deadlineLabel)}</p>
          <p style="margin:16px 0 0;font-size:12px;color:rgba(15,15,17,0.5);">Booking ${escapeHtml(input.bookingId)} · da ${escapeHtml(from)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return sendTransactionalEmail({ to, subject, html, text });
}
