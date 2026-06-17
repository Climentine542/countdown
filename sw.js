/**
 * 倒计时 - Service Worker
 * 缓存策略：Cache First（优先缓存，离线可用）
 */

const CACHE_NAME = 'countdown-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/db.js',
  './js/lunar.js',
  './js/app.js',
  './icon.svg',
  './manifest.json',
];

// 安装：预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 缓存关键资源');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和 chrome-extension 等
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // 缓存命中，同时后台更新缓存
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return networkResponse;
        }).catch(() => {
          // 网络失败，使用缓存（已经返回了）
        });

        // 不等待后台更新
        return cachedResponse;
      }

      // 缓存未命中，从网络获取
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 网络也失败，返回离线页面（对于 HTML 请求）
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
        return new Response('离线状态，请连接网络后重试', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    })
  );
});

// 通知点击事件（用户点击通知后打开应用）
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 如果已有打开的应用窗口，聚焦它
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // 否则打开新窗口
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});
