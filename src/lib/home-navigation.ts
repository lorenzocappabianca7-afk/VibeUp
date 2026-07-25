/**
 * Home-shell navigation helpers.
 *
 * Soft App Router navigations (`router.push` / `<Link>`) fetch an RSC payload.
 * On iOS Safari / installed PWAs, after long idle or a flaky network that fetch
 * often fails and the browser replaces the app with
 * “This page couldn’t load”.
 *
 * Same-document tab switches use history.replaceState (see tab context).
 * Leaving /location|/event|/service for home uses a full assign instead.
 */

export function isHomePath(pathname: string) {
  return pathname === "/" || pathname === "";
}

/** Full document load to the home shell — skips the fragile RSC soft-nav path. */
export function assignHomeHref(href: string) {
  if (typeof window === "undefined") return;
  const next = href.startsWith("/") ? href : `/${href}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return;
  if (
    next === "/" &&
    window.location.pathname === "/" &&
    !window.location.search
  ) {
    return;
  }
  window.location.assign(next);
}
