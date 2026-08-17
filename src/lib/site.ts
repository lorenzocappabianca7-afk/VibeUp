export function getSiteUrl() {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "https://www.vibeupevents.com";

  return url.startsWith("http") ? url : `https://${url}`;
}
