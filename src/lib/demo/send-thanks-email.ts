import {
  getVibeUpFromEmail,
  isTransactionalEmailConfigured,
  sendTransactionalEmail,
} from "@/lib/email/mailer";
import { isDemoMode } from "@/lib/demo/mode";
import { patchDemoSubmission } from "@/server/repositories/demo";
import type { DemoSubmission, DemoSubmissionPayload } from "@/types/demo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function displayName(payload: DemoSubmissionPayload): string {
  const firstName = asTrimmed(payload.firstName);
  const lastName = asTrimmed(payload.lastName);
  return [firstName, lastName].filter(Boolean).join(" ");
}

function buildHtml(name: string) {
  const from = getVibeUpFromEmail();
  const greeting = name ? `Ciao ${escapeHtml(name)},` : "Ciao,";
  return `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Grazie per aver provato VibeUp</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F0F11;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(15,15,17,0.08);">
            <tr>
              <td style="padding:28px 28px 12px;background:#0F0F11;color:#ffffff;">
                <p style="margin:0;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.7;">VibeUp</p>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;">Grazie per la prova</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.5;">${greeting}</p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(15,15,17,0.72);">
                  Grazie per aver provato la demo di VibeUp. Il tuo feedback ci aiuta a
                  costruire un’app più semplice per organizzare il diciottesimo.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(15,15,17,0.72);">
                  Se vorrai, ci rivediamo al lancio.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px;border-top:1px solid rgba(15,15,17,0.08);">
                <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(15,15,17,0.45);">
                  A presto,<br />
                  Il team VibeUp<br />
                  <a href="mailto:${escapeHtml(from)}" style="color:#1F8F8F;text-decoration:none;">${escapeHtml(from)}</a>
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

function buildText(name: string) {
  const from = getVibeUpFromEmail();
  const greeting = name ? `Ciao ${name},` : "Ciao,";
  return `${greeting}

Grazie per aver provato la demo di VibeUp. Il tuo feedback ci aiuta a costruire un’app più semplice per organizzare il diciottesimo.

Se vorrai, ci rivediamo al lancio.

A presto,
Il team VibeUp
${from}`;
}

/**
 * Demo-only thank-you after the session is marked completed.
 * Never called from real booking/auth email paths.
 */
export async function sendDemoThanksIfCompleted(
  submission: DemoSubmission,
): Promise<void> {
  if (!isDemoMode()) return;

  const payload = submission.payload;
  if (payload.completed !== true) return;
  if (typeof payload.thanksEmailSentAt === "string") return;

  const to = asTrimmed(payload.email).toLowerCase();
  if (!EMAIL_RE.test(to)) return;
  if (!isTransactionalEmailConfigured()) {
    console.error("[demo-thanks] RESEND_API_KEY non configurata.");
    return;
  }

  const name = displayName(payload);
  const result = await sendTransactionalEmail({
    to,
    fromName: "Il team VibeUp",
    subject: "Grazie per aver provato VibeUp",
    text: buildText(name),
    html: buildHtml(name),
  });

  if (!result.ok) {
    console.error("[demo-thanks]", result.error);
    return;
  }

  try {
    await patchDemoSubmission(submission.id, {
      thanksEmailSentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[demo-thanks] mark sent", error);
  }
}
