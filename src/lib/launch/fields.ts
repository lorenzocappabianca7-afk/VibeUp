/** Shared waitlist field rules. Safe to import from client and server. */

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const VIBEUP_CODE_RE = /^VU-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const E164_RE = /^\+[1-9]\d{7,14}$/;
const NAME_RE = /^[\p{L}][\p{L}'’ \-]{0,39}$/u;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isVibeUpCode(value: string) {
  return VIBEUP_CODE_RE.test(normalizeCode(value));
}

export function joinPhone(prefix: string, national: string) {
  const digits = prefix.replace(/[^\d]/g, "");
  let rest = national.replace(/[^\d]/g, "");
  if (digits === "39" && rest.startsWith("0")) rest = rest.slice(1);
  if (!digits || !rest) return "";
  return `+${digits}${rest}`;
}

export function isPersonName(value: string) {
  const name = value.trim();
  return name.length > 0 && name.length <= 40 && NAME_RE.test(name);
}

export function isEmailAddress(value: string) {
  const email = normalizeEmail(value);
  return email.length <= 120 && EMAIL_RE.test(email);
}

export function isE164(value: string) {
  return E164_RE.test(value);
}

export function ageFromBirthYear(year: number, now = new Date()) {
  return now.getFullYear() - year;
}

export function isAtLeast14(year: number, now = new Date()) {
  return Number.isInteger(year) && ageFromBirthYear(year, now) >= 14;
}

export function birthYearChoices(now = new Date()) {
  const end = now.getFullYear() - 10;
  const start = now.getFullYear() - 40;
  const years: number[] = [];
  for (let year = end; year >= start; year -= 1) years.push(year);
  return years;
}

export function isHighSchool(value: string) {
  const school = value.trim();
  return school.length >= 2 && school.length <= 80;
}

export function cleanVenue(value: string) {
  return value.trim().slice(0, 80);
}

export function shareUrl(code: string) {
  return `https://vibeupevents.com/?ref=${normalizeCode(code)}`;
}

export function fillShareMessage(template: string, code: string) {
  const normalized = normalizeCode(code);
  return template.replaceAll("CODICE", normalized).replaceAll("LINK", shareUrl(normalized));
}
