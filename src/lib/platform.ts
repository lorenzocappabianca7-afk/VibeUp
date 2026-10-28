/** Public launch switch. Unset or anything other than true/1 keeps the pre-launch gate. */
export function isPlatformLive(): boolean {
  const raw = process.env.NEXT_PUBLIC_PLATFORM_LIVE?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}
