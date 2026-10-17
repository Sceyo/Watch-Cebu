/**
 * Watch Cebu Service Worker — Offline Resilience & Civic Caching
 *
 * Implements:
 * 1. Cache-first for core application shell and static assets.
 * 2. Stale-while-revalidate / Network-first fallback for civic API snapshots (/api/power, /api/earthquakes).
 * 3. Bounded LRU tile cache for Leaflet map tiles (max 200 tiles to protect device storage).
 * 4. Graceful offline fallback.
 */

const CACHE_VERSION = "watch-cebu-v3";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const TILE_CACHE = `tiles-${CACHE_VERSION}`;

const MAX_CACHED_TILES = 200;

// Essential app shell files
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Helper: Trim cache to max items (LRU eviction)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const itemsToDelete = keys.length - maxItems;
      for (let i = 0; i < itemsToDelete; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    console.warn("[SW] Cache trimming error:", err);
  }
}

// Install Event — Pre-cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event — Clean up stale previous caches
self.addEventListener("activate", (event) => {
  const currentCaches = [STATIC_CACHE, API_CACHE, TILE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Strategy 1: Civic API Endpoints (/api/power, /api/earthquakes)
  // Network-first with automatic update of API_CACHE, falling back to cached snapshot when offline
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return structured offline JSON response
          return new Response(
            JSON.stringify({
              data_source: "offline_cache",
              error: "Device is currently offline and no cached advisory was found.",
              offline: true,
              data: []
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
        })
    );
    return;
  }

  // Strategy 2: Map Tiles (CARTO / OpenStreetMap)
  // Stale-while-revalidate with bounded cache count to protect device storage
  if (
    url.hostname.includes("basemaps.cartocdn.com") ||
    url.hostname.includes("tile.openstreetmap.org")
  ) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cachedTile = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
              trimCache(TILE_CACHE, MAX_CACHED_TILES);
            }
            return networkResponse;
          })
          .catch(() => {
            // Return cached tile if network fails
            return cachedTile;
          });

        return cachedTile || fetchPromise;
      })
    );
    return;
  }

  // Strategy 3: HTML Navigation Requests (Network-First with offline cache fallback)
  // Guarantees all users on Desktop and Mobile immediately receive new application deployments!
  if (request.mode === "navigate" || request.destination === "document" || url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = (await caches.match("/index.html")) || (await caches.match("/"));
          if (cached) return cached;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  // Strategy 4: Static Assets & Bundles (CSS, JS, Fonts, Icons)
  // Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Cache successful responses for scripts, styles, images, and fonts
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith("/assets/") ||
            url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".svg") ||
            url.pathname.endsWith(".png") ||
            url.hostname.includes("fonts.gstatic.com") ||
            url.hostname.includes("fonts.googleapis.com"))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(async () => {
        // Fallback for navigation requests to root index.html
        if (request.mode === "navigate") {
          const rootCached = await caches.match("/index.html") || await caches.match("/");
          if (rootCached) {
            return rootCached;
          }
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      });
    })
  );
});

// Message listener for immediate update
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
