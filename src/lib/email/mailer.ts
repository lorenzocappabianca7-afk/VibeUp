import { getSiteUrl } from "@/lib/site";
import { Resend } from "resend";

export const VIBEUP_FROM_EMAIL = "info@vibeupevents.com";
export const VIBEUP_FROM_NAME = "VibeUp";

export function getVibeUpFromEmail() {
  return VIBEUP_FROM_EMAIL;
}

export function getVibeUpFromName() {
  return VIBEUP_FROM_NAME;
}

export function isTransactionalEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  /** One-click marketing opt-out. Defaults to the data-rights page. */
  unsubscribeUrl?: string;
  /** Service mail keeps its own footer. Marketing mail adds the offers opt-out. */
  marketingFooter?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Invio email non configurato. Imposta RESEND_API_KEY su Vercel (Resend).",
    };
  }

  const fromName = input.fromName?.trim() || VIBEUP_FROM_NAME;
  const unsubscribeUrl = input.unsubscribeUrl?.trim() || `${getSiteUrl()}/privacy/richiesta`;
  const marketingFooter = input.marketingFooter !== false;
  const text = marketingFooter ? appendUnsubscribeText(input.text, unsubscribeUrl) : input.text;
  const html = marketingFooter ? appendUnsubscribeHtml(input.html, unsubscribeUrl) : input.html;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: `${fromName} <${VIBEUP_FROM_EMAIL}>`,
    to: input.to,
    replyTo: VIBEUP_FROM_EMAIL,
    subject: input.subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

function appendUnsubscribeText(text: string, url: string) {
  if (text.includes(url)) return text;
  return `${text}\n\nNon vuoi più ricevere novità e offerte da VibeUp?\nDisiscriviti: ${url}`;
}

function appendUnsubscribeHtml(html: string, url: string) {
  if (html.includes(url)) return html;
  const safe = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const block = `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#6b6b70;">Non vuoi più ricevere novità e offerte da VibeUp? <a href="${safe}" style="color:#1F8F8F;">Disiscriviti</a></p>`;
  if (html.includes("</body>")) return html.replace("</body>", `${block}</body>`);
  return `${html}${block}`;
}
