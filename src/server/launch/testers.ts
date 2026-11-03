import { isUnlimitedDemoTesterEmail } from "@/lib/demo/testers";

/** Extra tester mailboxes, comma-separated. Read on the server only. */
function listedTesterEmails() {
  const emails = new Set<string>();
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
  if (isUnlimitedDemoTesterEmail(normalized)) return true;
  return listedTesterEmails().has(normalized);
}
