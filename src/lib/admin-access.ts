import type { AppRole } from "@/lib/auth/supabase-auth";

export const ADMIN_CATALOG_EMAIL = "vibeup.planner@gmail.com";

/** Email allowlist (bootstrap) + Supabase profiles.role === admin. */
export function canAccessAdminCatalog(
  email: string,
  role?: AppRole | null,
): boolean {
  if (role === "admin") return true;
  return email.trim().toLowerCase() === ADMIN_CATALOG_EMAIL;
}
