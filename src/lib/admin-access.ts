import type { AppRole } from "@/lib/auth/supabase-auth";

export const ADMIN_CATALOG_EMAIL = "info@vibeupevents.com";

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
