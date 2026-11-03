/** Tester mailboxes. Server only: the client asks for a yes or no, never this list. */
const DEFAULT_TESTER_EMAILS = [
  "federico.bossotti@gmail.com",
  "lorenzo.cappabianca7@gmail.com",
];

function listedTesterEmails() {
  const emails = new Set<string>();
  for (const email of DEFAULT_TESTER_EMAILS) emails.add(email);
  const raw = process.env.TESTER_EMAILS ?? "";
  for (const part of raw.split(",")) {
    const email = part.trim().toLowerCase();
    if (email.includes("@")) emails.add(email);
  }
  return emails;
}

export function isTesterEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized.includes("@")) return false;
  return listedTesterEmails().has(normalized);
}
