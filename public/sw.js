/* PWA installability helper — does NOT intercept network traffic.
   Hijacking fetch() caused the UI to freeze after the tab sat idle. */
const SW_VERSION = "vibeup-sw-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any leftover caches from older SW versions.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("vibeup-") && key !== SW_VERSION)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// Keep a fetch listener for installability, but never call respondWith —
// the browser handles every request natively (critical for Next.js).
self.addEventListener("fetch", () => {});
