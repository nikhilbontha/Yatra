// ==============================================================================
// Yatra — Service Worker
// Offline App Shell Caching with Strict Privacy Protection & Resilient Fallback
// ==============================================================================

const CACHE_NAME = 'yatra-shell-v3';

// Core static assets required for the offline application shell
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/pdf.worker.min.mjs',
  // Sacred UI Branding & Nav
  '/images/sacred-temple-emblem.jpg',
  '/images/sacred-navbar-banner.png',
  '/images/sacred-navbar-trimmed.png',
  '/images/temple-silhouette-clean.png',
  '/images/temple-silhouette-bg.png',
  '/images/mandala-left-wing.png',
  '/images/mandala-right-wing.png',
  // Hero & Landmark Visuals
  '/images/temple-hero.jpg',
  '/images/temple-lake.jpg',
  '/images/temple-gopuram.jpg',
  '/images/charminar-hero.jpg',
  '/images/khammam-fort.jpg',
  '/images/route-map-hyderabad-khammam.jpg',
  // Stays & Accommodations
  '/images/shirdi-dharamshala.jpg',
  '/images/shirdi-room.jpg',
  '/images/shirdi-map.jpg',
  '/images/hotel-receipt.jpg',
  '/images/train-ticket-receipt.jpg',
  '/images/aadhaar-sample.jpg',
  // Sacred Jyotirlinga & Holy Places (Offline Cache)
  '/images/places/bhimashankar-jyotirlinga.jpg',
  '/images/places/dwarka-bet-dwarka.jpg',
  '/images/places/dwarka-dwarkadhish-temple.jpg',
  '/images/places/dwarka-gomti-ghat.jpg',
  '/images/places/dwarka-gopi-talav.jpg',
  '/images/places/dwarka-rukmini-devi.jpg',
  '/images/places/ellora-caves.jpg',
  '/images/places/ellora-kailasa-cave16.jpg',
  '/images/places/grishneshwar-jyotirlinga.jpg',
  '/images/places/mahakaleshwar-jyotirlinga.jpg',
  '/images/places/nageshwar-jyotirlinga.jpg',
  '/images/places/nashik-kalaram-temple.jpg',
  '/images/places/nashik-panchavati.jpg',
  '/images/places/nashik-ramkund.jpg',
  '/images/places/omkareshwar-jyotirlinga.jpg',
  '/images/places/omkareshwar-mamleshwar.jpg',
  '/images/places/omkareshwar-narmada-ghats.jpg',
  '/images/places/shirdi-chavadi.jpg',
  '/images/places/shirdi-dwarkamai.jpg',
  '/images/places/shirdi-gurusthan.jpg',
  '/images/places/shirdi-khandoba.jpg',
  '/images/places/shirdi-lendi-baug.jpg',
  '/images/places/shirdi-sai-samadhi-mandir.jpg',
  '/images/places/somnath-bhalka-tirth.jpg',
  '/images/places/somnath-dehotsarg-tirth.jpg',
  '/images/places/somnath-jyotirlinga.jpg',
  '/images/places/somnath-triveni-sangam.jpg',
  '/images/places/trimbak-kushavarta-kund.jpg',
  '/images/places/trimbakeshwar-jyotirlinga.jpg',
  '/images/places/ujjain-kal-bhairav.jpg',
  '/images/places/ujjain-mahakal-lok.jpg',
  '/images/places/ujjain-ram-ghat.jpg',
];

// Sensitive endpoints that MUST NEVER be cached in the Service Worker
const PRIVACY_EXCLUSIONS = [
  '/auth/',
  '/storage/v1/object/sign/',
  '/rest/v1/',
  'supabase.co',
  '/_next/webpack-hmr',
  '/_next/hmr',
  '/api/',
];

// Helper to determine if a request is for an image
function isImageRequest(request) {
  if (request.destination === 'image') return true;
  const url = request.url.toLowerCase();
  return (
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.png') ||
    url.endsWith('.webp') ||
    url.endsWith('.gif') ||
    url.endsWith('.svg') ||
    url.includes('/images/')
  );
}

// ------------------------------------------------------------------------------
// Installation: Precache critical shell assets with individual error resilience
// ------------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache assets individually so a single network glitch does not abort SW installation
      const results = await Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[SW] Precache warning for ${asset}:`, err.message);
            throw err;
          })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn(`[SW] ${failed.length} static asset(s) could not be precached during install.`);
      }
    })
  );
});

// ------------------------------------------------------------------------------
// Activation: Prune obsolete Yatra shell caches without touching unrelated data
// ------------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('yatra-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ------------------------------------------------------------------------------
// Client Message Handling
// ------------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// ------------------------------------------------------------------------------
// Fetch Handler: Network-First with safe offline cache fallback
// ------------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. Strict Privacy & Mutation Protection:
  // Never cache POST, PUT, DELETE, PATCH or requests matching privacy exclusions
  if (event.request.method !== 'GET') return;
  if (PRIVACY_EXCLUSIONS.some((pattern) => url.includes(pattern))) return;

  // 2. HTML Navigation Requests (Page Visits):
  // Network-First with fallback to cached page or cached root app shell ('/')
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline, serve cached request or fallback to root shell
          return caches.match(event.request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // 3. Next.js Immutable Static Chunks (JS & CSS bundles):
  if (url.includes('/_next/static/')) {
    const isDevUrl =
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('192.168.') ||
      url.includes('10.') ||
      url.includes(':3000');
    if (isDevUrl) {
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }

    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Image Assets (Local & Cross-Origin Place Photos / Vouchers):
  // Stale-While-Revalidate / Cache-First with Network fallback and Sacred Temple Fallback
  if (isImageRequest(event.request)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed (offline). If we had cachedResponse, it was already served.
            // If neither network nor exact cache match exists, fallback to default temple image.
            return (
              cachedResponse ||
              caches.match('/images/temple-hero.jpg') ||
              caches.match('/images/shirdi-dharamshala.jpg')
            );
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Worker and Other Static Assets:
  // Network-First with cache fallback for basic same-origin GET assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
