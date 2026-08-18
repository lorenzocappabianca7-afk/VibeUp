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
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Invio email non configurato. Imposta RESEND_API_KEY su Vercel (Resend).",
    };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: `${VIBEUP_FROM_NAME} <${VIBEUP_FROM_EMAIL}>`,
    to: input.to,
    replyTo: VIBEUP_FROM_EMAIL,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
