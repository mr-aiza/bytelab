// sw.js — بایت‌لب PWA service worker
// نسخه کش رو هر بار که محتوای صفحات رو عوض کردی عوض کن (مثلاً v2, v3, ...)
// این کار باعث می‌شه کاربرها نسخه‌ی جدید رو به‌جای کش قدیمی بگیرن.
const CACHE_VERSION = 'bytelab-v1';
const CACHE_NAME = CACHE_VERSION;

// صفحات و فایل‌های اصلی که از همون اول نصب کش می‌شن (App Shell)
const PRECACHE_URLS = [
  'index.html',
  'tarahi-site.html',
  'tarahi-app.html',
  'khadamat-computer.html',
  'blog.html',
  'hazine-tarahi-site.html',
  'app-ekhtesasi.html',
  'portfolio.html',
  'chat.html',
  'header.js',
  'manifest.json',
  'favicon.ico',
  'favicon-32.png',
  'favicon-192.png',
  'favicon-512.png',
  'favicon-180.png',
  'logo-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // فقط درخواست‌های GET همین سایت رو مدیریت کن (نه API چت و نه دامنه‌های خارجی)
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // صفحات HTML: اول شبکه (تا همیشه محتوای تازه بیاد)، اگه آفلاین بودی از کش
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('index.html')))
    );
  } else {
    // فایل‌های استاتیک (عکس، فونت، header.js): اول کش، بعد شبکه
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        });
      })
    );
  }
});
