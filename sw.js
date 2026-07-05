// sw.js — بایت‌لب PWA service worker
// دیگه لازم نیست هر بار عدد ورژن رو دستی عوض کنی — فایل‌های استاتیک
// خودشون در پس‌زمینه چک و به‌روز می‌شن (stale-while-revalidate).
const CACHE_VERSION = 'bytelab-v4';
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
    // فایل‌های استاتیک (عکس، فونت، header.js):
    // stale-while-revalidate → نسخه‌ی کش رو فوری نشون بده،
    // ولی همزمان از شبکه یه نسخه‌ی تازه بگیر و کش رو آپدیت کن
    // (این آپدیت برای بار بعدی بازدید اعمال می‌شه، بدون نیاز به تغییر دستی ورژن)
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const networkFetch = fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(req, res.clone());
              }
              return res;
            })
            .catch(() => cached); // آفلاین: از کش برگرد

          return cached || networkFetch;
        })
      )
    );
  }
});

// اجازه بده صفحه از طریق header.js به سرویس‌ورکر بگه که فوراً فعال بشه
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
