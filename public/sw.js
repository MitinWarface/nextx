const CACHE_NAME = "nextx-v4";

const OFFLINE_RESPONSE = new Response("Offline", {
  status: 503,
  statusText: "Service Unavailable",
  headers: { "Content-Type": "text/plain" },
});

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || OFFLINE_RESPONSE)
    );
}

const STATIC_ASSETS = ["/", "/manifest.json"];

// Install: pre-cache shell + force activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches + claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Listen for skip-waiting message from page
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch: network-first for API and hashed assets, cache-first for stable assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and socket.io
  if (request.method !== "GET") return;
  if (url.pathname.includes("/socket.io")) return;
  if (url.pathname.includes("/api/livekit")) return;

  // API calls: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Hashed Next.js assets: network-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Stable assets: cache-first
  if (
    (url.pathname.endsWith(".js") && !url.pathname.startsWith("/_next/")) ||
    (url.pathname.endsWith(".css") && !url.pathname.startsWith("/_next/")) ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => OFFLINE_RESPONSE);
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request));
});
