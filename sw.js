/* ============================================
 * 人生养成系统 v5.0 — Service Worker
 * 离线缓存：应用壳 + 图标
 * ============================================ */
const CACHE_NAME = 'life-system-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './style.css',
  './core.js',
  './state.js',
  './ui.js',
  './boot.js',
  './system.js',
  './skills.js',
  './tasks.js',
  './assets.js',
  './stats.js',
  './premium.js',
  './templates.js',
  './report.js',
  './today.js',
  './app.js',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () { self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    }).then(function () { self.clients.claim(); })
  );
});

// 网络优先（数据永远最新），失败回退缓存（离线可用）
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return res;
    }).catch(function () {
      return caches.match(event.request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
