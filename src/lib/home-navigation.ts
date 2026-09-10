/**
 * Home-shell navigation helpers.
 *
 * Tab switches on `/` must not go through Next's patched `history.replaceState`:
 * that dispatches ACTION_RESTORE, can remount the home page, and replays the
 * boot splash. Use the native History API instead.
 *
 * Returning from /location|/event|/service uses a client `router.push` so the
 * document (and splash) stay mounted. `assignHomeHref` is a last-resort full
 * load when no App Router instance is available.
 */

export function isHomePath(pathname: string) {
  return pathname === "/" || pathname === "";
}

function normalizeHomeHref(href: string) {
  return href.startsWith("/") ? href : `/${href}`;
}

export function isCurrentHomeHref(href: string) {
  if (typeof window === "undefined") return false;
  const next = normalizeHomeHref(href);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return true;
  return (
    next === "/" &&
    window.location.pathname === "/" &&
    !window.location.search
  );
}

/**
 * Update the home-shell query without a Next.js navigation.
 * Must call the native prototype — `window.history.replaceState` is patched.
 */
export function replaceHomeHref(href: string) {
  if (typeof window === "undefined") return;
  const next = normalizeHomeHref(href);
  if (isCurrentHomeHref(next)) return;
  History.prototype.replaceState.call(
    window.history,
    window.history.state,
    "",
    next,
  );
}

type AppRouterLike = {
  push: (href: string, options?: { scroll?: boolean }) => void;
};

/** Client-side return to the home shell — no document reload, no splash. */
export function pushHomeHref(router: AppRouterLike, href: string) {
  if (typeof window === "undefined") return;
  const next = normalizeHomeHref(href);
  if (isCurrentHomeHref(next)) return;
  router.push(next, { scroll: false });
}

/** Full document load to the home shell. Prefer `pushHomeHref` for tab returns. */
export function assignHomeHref(href: string) {
  if (typeof window === "undefined") return;
  const next = normalizeHomeHref(href);
  if (isCurrentHomeHref(next)) return;
  window.location.assign(next);
}
