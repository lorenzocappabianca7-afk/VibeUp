import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import { sendTransactionalEmail } from "@/lib/email/mailer";
import { getSiteUrl } from "@/lib/site";

const CODE_TTL_MS = 10 * 60 * 1000;
let pepperWarningShown = false;

function waitlistPepper() {
  const value = process.env.WAITLIST_CODE_PEPPER?.trim() ?? "";
  if (value.length >= 32) return value;
  const message =
    "Manca WAITLIST_CODE_PEPPER, oppure è troppo corto. Imposta un segreto di almeno 32 caratteri.";
  if (process.env.NODE_ENV !== "production" && !pepperWarningShown) {
    pepperWarningShown = true;
    console.warn(`[waitlist] ${message}`);
  }
  throw new Error(message);
}
export const CODE_MAX_ATTEMPTS = 5;
export const RESEND_WAIT_MS = 30_000;

export function verificationTtlMs() {
  return CODE_TTL_MS;
}

export function createVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashVerificationCode(code: string) {
  return createHash("sha256").update(`${waitlistPepper()}:${code}`).digest("hex");
}

export function verificationCodesMatch(hash: string, code: string) {
  const left = Buffer.from(hash);
  const right = Buffer.from(hashVerificationCode(code));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashClientIp(ip: string) {
  return createHash("sha256").update(`${waitlistPepper()}:ip:${ip}`).digest("hex");
}

export function marketingUnsubscribeToken(signupId: string) {
  return createHmac("sha256", waitlistPepper()).update(`marketing:${signupId}`).digest("base64url");
}

export function marketingUnsubscribeUrl(signupId: string, origin?: string) {
  const base = (origin || getSiteUrl()).replace(/\/$/, "");
  const token = marketingUnsubscribeToken(signupId);
  return `${base}/privacy/marketing?id=${encodeURIComponent(signupId)}&t=${token}`;
}

export function marketingTokenMatches(signupId: string, token: string) {
  const expected = marketingUnsubscribeToken(signupId);
  const left = Buffer.from(expected);
  const right = Buffer.from(token);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export async function sendVerificationEmail(input: {
  to: string;
  firstName: string;
  code: string;
  signupId: string;
  origin?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.firstName.trim() || "ciao";
  const text = `Ciao ${name},\n\nil tuo codice VibeUp è ${input.code}.\nScade tra 10 minuti.\n\nSe non hai chiesto tu l’iscrizione, ignora questa email.`;
  const html = `<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:24px;background:#0F1115;color:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <p style="margin:0 0 12px;font-size:16px;">Ciao ${escapeHtml(name)},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#C9CAD0;">Il tuo codice VibeUp è</p>
    <p style="margin:0 0 12px;font-size:32px;letter-spacing:6px;font-weight:700;">${escapeHtml(input.code)}</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#A1A3AB;">Scade tra 10 minuti. Se non hai chiesto tu l’iscrizione, ignora questa email.</p>
  </body>
</html>`;

  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY?.trim()) {
    console.info(`[waitlist] codice per ${input.to}: ${input.code}`);
    return { ok: true };
  }

  return sendTransactionalEmail({
    to: input.to,
    subject: "Il tuo codice VibeUp",
    text,
    html,
    fromName: "VibeUp",
    unsubscribeUrl: marketingUnsubscribeUrl(input.signupId, input.origin),
  });
}

export async function sendPrivacyCodeEmail(input: {
  to: string;
  code: string;
  signupId: string;
  origin?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const text = `Il tuo codice per gestire i dati VibeUp è ${input.code}.\nScade tra 10 minuti.\n\nSe non hai chiesto tu questa email, ignorala.`;
  const html = `<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:24px;background:#0F1115;color:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <p style="margin:0 0 12px;font-size:16px;">Gestisci i tuoi dati</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#C9CAD0;">Il codice è</p>
    <p style="margin:0 0 12px;font-size:32px;letter-spacing:6px;font-weight:700;">${escapeHtml(input.code)}</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#A1A3AB;">Scade tra 10 minuti. Se non hai chiesto tu questa email, ignorala.</p>
  </body>
</html>`;

  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY?.trim()) {
    console.info(`[privacy] codice per ${input.to}: ${input.code}`);
    return { ok: true };
  }

  return sendTransactionalEmail({
    to: input.to,
    subject: "Il codice per i tuoi dati VibeUp",
    text,
    html,
    fromName: "VibeUp",
    unsubscribeUrl: marketingUnsubscribeUrl(input.signupId, input.origin),
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
