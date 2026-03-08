// ============================================================
// Service Worker — BAR//QR Generator
// Versi cache: update angka ini setiap deploy baru
// ============================================================
const CACHE_NAME = 'barqr-v1.0.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable.png',
];

// ── Install: cache semua aset ──────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      // Langsung aktif tanpa menunggu tab lama ditutup
      return self.skipWaiting();
    })
  );
});

// ── Activate: hapus cache lama ─────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating, cleaning old caches...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      // Ambil kontrol semua tab yang terbuka
      return self.clients.claim();
    })
  );
});

// ── Fetch: Cache-first, fallback ke network ────────────────
self.addEventListener('fetch', (event) => {
  // Hanya handle request GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Kembalikan dari cache, tapi update cache di background
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {}); // Abaikan error network saat offline

        return cached;
      }

      // Tidak ada di cache — coba network
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline & tidak ada cache — kembalikan halaman utama sebagai fallback
          return caches.match('./index.html');
        });
    })
  );
});

// ── Message: handle perintah dari halaman ─────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
