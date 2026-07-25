/* PWA installability helper — does NOT intercept network traffic.
   Hijacking fetch() caused the UI to freeze after the tab sat idle.
   skipWaiting + clients.claim also killed long-lived iOS sessions
   mid-navigation (Safari “This page couldn’t load”). */
const SW_VERSION = "vibeup-sw-v3";

self.addEventListener("install", () => {
  // Stay waiting until the user closes all app tabs — never yank control
  // from an active session.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("vibeup-") && key !== SW_VERSION)
          .map((key) => caches.delete(key)),
      );
    })(),
  );
});

// Keep a fetch listener for installability, but never call respondWith —
// the browser handles every request natively (critical for Next.js).
self.addEventListener("fetch", () => {});
