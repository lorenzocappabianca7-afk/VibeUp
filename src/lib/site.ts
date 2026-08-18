export const CANONICAL_SITE_URL = "https://vibeupevents.com";

function stripTrailingSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/** Public site origin. Always apex (no www). Leaves localhost / preview hosts intact except www. */
export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    CANONICAL_SITE_URL;
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    if (url.hostname.toLowerCase().startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
    }
    url.hash = "";
    url.search = "";
    return stripTrailingSlash(url.toString());
  } catch {
    return CANONICAL_SITE_URL;
  }
}
