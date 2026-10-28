import type { AppRole } from "@/lib/auth/supabase-auth";

export const ADMIN_CATALOG_EMAIL = "info@vibeupevents.com";

const ADMIN_MANAGER_VIEW_KEY = "vibeup-admin-manager-view";

function listedAdminEmails(): Set<string> {
  const emails = new Set<string>([ADMIN_CATALOG_EMAIL]);
  const raw = process.env.ADMIN_EMAILS ?? "";
  for (const part of raw.split(",")) {
    const email = part.trim().toLowerCase();
    if (email.includes("@")) emails.add(email);
  }
  return emails;
}

/** info@ or a mailbox listed in ADMIN_EMAILS. The client bundle only sees info@. */
export function isListedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return listedAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Logged-in mailbox is info@ or listed in ADMIN_EMAILS.
 * On the client the env list is empty, so only info@ matches there.
 * Admin APIs read the same list on the server.
 */
export function canAccessAdminCatalog(
  email: string,
  _role?: AppRole | null,
): boolean {
  return isListedAdminEmail(email);
}

export function isAdminManagerViewEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ADMIN_MANAGER_VIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminManagerViewEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      sessionStorage.setItem(ADMIN_MANAGER_VIEW_KEY, "1");
      return;
    }
    sessionStorage.removeItem(ADMIN_MANAGER_VIEW_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
