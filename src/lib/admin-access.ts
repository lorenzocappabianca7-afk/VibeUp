import type { AppRole } from "@/lib/auth/supabase-auth";

export const ADMIN_CATALOG_EMAIL = "info@vibeupevents.com";

const ADMIN_MANAGER_VIEW_KEY = "vibeup-admin-manager-view";

/** Admin catalog: role admin on profiles AND the official info@ mailbox. */
export function canAccessAdminCatalog(
  email: string,
  role?: AppRole | null,
): boolean {
  return (
    role === "admin" &&
    email.trim().toLowerCase() === ADMIN_CATALOG_EMAIL
  );
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
