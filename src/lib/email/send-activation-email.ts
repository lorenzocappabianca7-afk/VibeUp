import nodemailer from "nodemailer";
import {
  VIBEUP_FROM_EMAIL,
  VIBEUP_FROM_NAME,
} from "@/lib/auth/activation";

export interface ActivationEmailInput {
  to: string;
  name: string;
  activateUrl: string;
}

function getSmtpConfig() {
  const user =
    process.env.SMTP_USER?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    VIBEUP_FROM_EMAIL;
  const pass =
    process.env.SMTP_PASS?.trim() ||
    process.env.GMAIL_APP_PASSWORD?.trim() ||
    "";

  return { user, pass };
}

export function isActivationEmailConfigured() {
  return Boolean(getSmtpConfig().pass);
}

function buildActivationEmailHtml(input: ActivationEmailInput) {
  const displayName = input.name.trim() || "ciao";
  return `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Conferma il tuo account VibeUp</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F0F11;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(15,15,17,0.08);">
            <tr>
              <td style="padding:28px 28px 12px;background:#0F0F11;color:#ffffff;">
                <p style="margin:0;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.7;">VibeUp</p>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;">Grazie per esserti unito a noi</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.5;">Ciao ${escapeHtml(displayName)},</p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(15,15,17,0.72);">
                  Grazie per aver creato il tuo account VibeUp. Prima di iniziare a salvare preferiti,
                  confrontare locali e generare preventivi, conferma il tuo indirizzo email.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:rgba(15,15,17,0.72);">
                  È un passaggio rapido, come su Airbnb: basta un tap sul pulsante qui sotto.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:999px;background:#32B4B4;">
                      <a href="${escapeHtml(input.activateUrl)}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#0F0F11;text-decoration:none;">
                        Conferma la tua email
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:rgba(15,15,17,0.45);">
                  Se il pulsante non funziona, copia e incolla questo link nel browser:
                </p>
                <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;color:#1F8F8F;">
                  ${escapeHtml(input.activateUrl)}
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(15,15,17,0.45);">
                  Il link scade tra 48 ore. Se non hai creato tu questo account, puoi ignorare questa email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px;border-top:1px solid rgba(15,15,17,0.08);">
                <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(15,15,17,0.45);">
                  A presto,<br />
                  Il team VibeUp<br />
                  <a href="mailto:${VIBEUP_FROM_EMAIL}" style="color:#1F8F8F;text-decoration:none;">${VIBEUP_FROM_EMAIL}</a>
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

function buildActivationEmailText(input: ActivationEmailInput) {
  const displayName = input.name.trim() || "ciao";
  return `Ciao ${displayName},

Grazie per aver creato il tuo account VibeUp.

Conferma il tuo indirizzo email per attivare l'account:
${input.activateUrl}

Il link scade tra 48 ore. Se non hai creato tu questo account, ignora questa email.

A presto,
Il team VibeUp
${VIBEUP_FROM_EMAIL}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendAccountActivationEmail(input: ActivationEmailInput) {
  const { user, pass } = getSmtpConfig();

  if (!pass) {
    return {
      ok: false as const,
      error:
        "Invio email non configurato. Imposta GMAIL_APP_PASSWORD (o SMTP_PASS) su Vercel.",
    };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${VIBEUP_FROM_NAME}" <${VIBEUP_FROM_EMAIL}>`,
    to: input.to,
    replyTo: VIBEUP_FROM_EMAIL,
    subject: "Conferma il tuo account VibeUp",
    text: buildActivationEmailText(input),
    html: buildActivationEmailHtml(input),
  });

  return { ok: true as const };
}
