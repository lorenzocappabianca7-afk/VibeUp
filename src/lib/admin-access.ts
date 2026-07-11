export const ADMIN_CATALOG_EMAIL = "vibeup.planner@gmail.com";

export function canAccessAdminCatalog(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_CATALOG_EMAIL;
}
