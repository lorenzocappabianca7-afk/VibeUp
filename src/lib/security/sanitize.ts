/**
 * Client-side text hardening against XSS / injection payloads stored in app state.
 * React already escapes JSX text; this strips high-risk control sequences before persistence.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_LIKE = /<\/?[a-z][\s\S]*?>/gi;
const DANGEROUS_PROTOCOL = /^\s*(javascript|vbscript)\s*:/i;
const MAX_DATA_URL_LENGTH = 2_500_000;

export function sanitizePlainText(value: string, maxLength = 500): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(HTML_TAG_LIKE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: string): string {
  return sanitizePlainText(value, 254).toLowerCase();
}

export function sanitizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (DANGEROUS_PROTOCOL.test(trimmed)) return null;

  // Avatar crop and local previews use data:/blob: image URLs.
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) {
    if (trimmed.length > MAX_DATA_URL_LENGTH) return null;
    return trimmed;
  }
  if (/^blob:/i.test(trimmed)) {
    return trimmed.slice(0, 2048);
  }

  try {
    const url = new URL(trimmed, "https://vibeup.local");
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return trimmed.slice(0, 2048);
  } catch {
    return null;
  }
}

export function sanitizeHandle(value: string, maxLength = 64): string {
  return sanitizePlainText(value, maxLength).replace(/^@+/, "");
}
