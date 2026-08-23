import { getSiteUrl } from "@/lib/site";

export type ManagerEmailAction = "accept" | "decline" | "propose";

export function buildManagerResponsePath(
  token: string,
  action?: ManagerEmailAction,
): string {
  const encoded = encodeURIComponent(token.trim());
  if (!action) return `/r/${encoded}`;
  return `/r/${encoded}/${action}`;
}

export function buildManagerResponseUrl(
  token: string,
  action?: ManagerEmailAction,
  siteUrl: string = getSiteUrl(),
): string {
  return `${siteUrl}${buildManagerResponsePath(token, action)}`;
}
