import { welcomeCopy } from "@/content/emails/welcome";
import { isLocalTestInbox } from "@/server/launch/code-mail";
import { parseSiteLocale, type DemoLanguage } from "@/lib/demo/language";
import { isTransactionalEmailConfigured, sendTransactionalEmail } from "@/lib/email/mailer";
import { getSiteUrl } from "@/lib/site";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { demoAccessUrl, ensureDemoAccessToken } from "@/server/launch/demo-access";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const WELCOME_ATTEMPTS = 3;
const PREVIEW_PATH = path.join(process.cwd(), ".tmp", "emails", "welcome-preview.html");

export type WelcomeMail = {
  subject: string;
  text: string;
  html: string;
};

function emailOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) return getSiteUrl();
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return getSiteUrl();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildWelcomeEmail(input: {
  firstName: string;
  code: string;
  demoUrl?: string;
  locale?: DemoLanguage;
}): WelcomeMail {
  const locale = parseSiteLocale(input.locale);
  const name = input.firstName.trim() || (locale === "en" ? "there" : "ciao");
  const code = input.code.trim();
  const origin = emailOrigin();
  const shareUrl = `${origin}/?ref=${encodeURIComponent(code)}`;
  const demoUrl = input.demoUrl?.trim() || `${origin}/demo`;
  const privacyUrl = `${origin}/privacy`;
  const rulesUrl = `${origin}/regolamento`;
  const dataUrl = `${origin}/privacy/richiesta`;
  const copy = welcomeCopy(locale);
  const subject = copy.subject.replaceAll("{nome}", name);
  const text = [
    copy.greeting.replaceAll("{nome}", name),
    "",
    copy.thanks,
    "",
    copy.codeLead,
    "",
    code,
    "",
    copy.contest,
    "",
    `${copy.shareButton} → ${shareUrl}`,
    "",
    copy.updates,
    "",
    copy.demoLead,
    `${copy.demoLink} → ${demoUrl}`,
    "",
    copy.signoff,
    copy.team,
    "",
    "---",
    copy.reason,
    `${copy.privacyLabel}: ${privacyUrl} · ${copy.rulesLabel}: ${rulesUrl} · ${copy.dataLabel}: ${dataUrl}`,
    copy.brandLine,
  ].join("\n");

  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const html = `<!DOCTYPE html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F4F6;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F4F4F6;">
      ${escapeHtml(copy.preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F6;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E6E6EA;border-radius:16px;">
            <tr>
              <td style="padding:32px 28px;font-family:${font};color:#1A1C21;">
                <p style="margin:0 0 24px;font-size:28px;line-height:1;font-weight:800;letter-spacing:-0.6px;color:#0F1115;">
                  <span style="color:#3ECFCF;">V</span>ibe<span style="color:#F091B2;">U</span>p
                </p>
                <p style="margin:0 0 14px;font-size:18px;line-height:1.4;font-weight:700;color:#1A1C21;">${copy.greeting.replaceAll("{nome}", safeName)}</p>
                <p style="margin:0 0 22px;font-size:16px;line-height:1.55;color:#1A1C21;">${escapeHtml(copy.thanks)}</p>
                <p style="margin:0 0 10px;font-size:15px;line-height:1.5;color:#6B6E76;">${escapeHtml(copy.codeLead)}</p>
                <p style="margin:0 0 22px;padding:16px 12px;background:#FFF5F8;border:2px dashed #F091B2;border-radius:14px;text-align:center;font-size:32px;line-height:1.2;font-weight:800;letter-spacing:3px;color:#0F1115;">${safeCode}</p>
                <p style="margin:0 0 22px;font-size:16px;line-height:1.55;color:#1A1C21;">${escapeHtml(copy.contest)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                  <tr>
                    <td bgcolor="#F091B2" style="border-radius:12px;">
                      <a href="${escapeHtml(shareUrl)}" style="display:inline-block;padding:14px 22px;font-family:${font};font-size:16px;line-height:1.2;font-weight:700;color:#0F1115;text-decoration:none;">${escapeHtml(copy.shareButton)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1C21;">${escapeHtml(copy.updates)}</p>
                <p style="margin:0 0 8px;font-size:16px;line-height:1.55;color:#1A1C21;">${escapeHtml(copy.demoLead)}</p>
                <p style="margin:0 0 22px;font-size:16px;line-height:1.5;">
                  <a href="${escapeHtml(demoUrl)}" style="color:#1A9E9E;font-weight:700;text-decoration:underline;">${escapeHtml(copy.demoLink)}</a>
                </p>
                <p style="margin:0;font-size:16px;line-height:1.5;color:#1A1C21;">${escapeHtml(copy.signoff)}<br />${escapeHtml(copy.team)}</p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td align="center" style="padding:18px 12px 0;font-family:${font};">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#6B6E76;">${escapeHtml(copy.reason)}</p>
                <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#6B6E76;">
                  <a href="${escapeHtml(privacyUrl)}" style="color:#6B6E76;text-decoration:underline;">${escapeHtml(copy.privacyLabel)}</a>
                  ·
                  <a href="${escapeHtml(rulesUrl)}" style="color:#6B6E76;text-decoration:underline;">${escapeHtml(copy.rulesLabel)}</a>
                  ·
                  <a href="${escapeHtml(dataUrl)}" style="color:#6B6E76;text-decoration:underline;">${escapeHtml(copy.dataLabel)}</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6B6E76;">${escapeHtml(copy.brandLine)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export async function writeWelcomePreview(html: string) {
  await mkdir(path.dirname(PREVIEW_PATH), { recursive: true });
  await writeFile(PREVIEW_PATH, html, "utf8");
  return PREVIEW_PATH;
}

async function markWelcomeSent(signupId: string) {
  const { error } = await getSupabaseAdmin()
    .from("waitlist_signups")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", signupId);
  if (error) console.error("[welcome] codice salvato ma stato invio non aggiornato", error.message);
}

/** Sends after the VibeUpcode is stored. A failed send does not undo the signup. */
export async function deliverWelcomeEmail(input: {
  signupId: string;
  email: string;
  firstName: string;
  code: string;
}) {
  const origin = emailOrigin();
  const token = await ensureDemoAccessToken(input.signupId).catch((error: unknown) => {
    console.error("[demo-access] token non creato", error instanceof Error ? error.message : error);
    return null;
  });
  const { data: localeRow } = await getSupabaseAdmin()
    .from("waitlist_signups")
    .select("locale")
    .eq("id", input.signupId)
    .maybeSingle();
  const mail = buildWelcomeEmail({
    firstName: input.firstName,
    code: input.code,
    locale: parseSiteLocale((localeRow as { locale?: string } | null)?.locale),
    demoUrl: token ? demoAccessUrl(token, origin) : `${origin}/demo`,
  });
  if (!isTransactionalEmailConfigured() || isLocalTestInbox(input.email)) {
    const file = await writeWelcomePreview(mail.html);
    console.info(`[welcome] RESEND_API_KEY assente, anteprima salvata in ${file}`);
    return { ok: false as const, skipped: true as const };
  }

  let lastError = "invio non riuscito";
  for (let attempt = 1; attempt <= WELCOME_ATTEMPTS; attempt += 1) {
    const sent = await sendTransactionalEmail({
      to: input.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      fromName: "VibeUp",
      marketingFooter: false,
      unsubscribeUrl: `${emailOrigin()}/privacy/richiesta`,
    });
    if (sent.ok) {
      await markWelcomeSent(input.signupId);
      return { ok: true as const };
    }
    lastError = sent.error;
    console.error(`[welcome] invio fallito per ${input.email}, tentativo ${attempt}/${WELCOME_ATTEMPTS}: ${sent.error}`);
  }
  console.error(`[welcome] mail non inviata dopo ${WELCOME_ATTEMPTS} tentativi: ${lastError}`);
  return { ok: false as const, skipped: false as const };
}
