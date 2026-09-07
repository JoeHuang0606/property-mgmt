self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 簡單的透傳，PWA 安裝要求需要有 fetch handler
  event.respondWith(fetch(event.request));
});
