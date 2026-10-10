/* 吃了吗 —— Service Worker：
   - 页面（HTML）始终优先走网络拿最新版（防止升级后加载旧入口）
   - 其他静态资源网络优先 + 缓存回退（离线可用）
   缓存版本升级会自动清掉上一版缓存 */
const CACHE = 'chilema-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 只处理本站资源

  // 页面导航：强制网络优先，永远拿到最新 HTML；离线时才回退缓存
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match('./index.html');
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) {
            try {
              await cache.put('./index.html', fresh.clone());
            } catch {
              /* 忽略写入失败 */
            }
            return fresh;
          }
        } catch {
          /* 网络不可用，走缓存 */
        }
        if (cached) return cached;
        return new Response('离线不可用', { status: 503 });
      })(),
    );
    return;
  }

  // 其他静态资源：网络优先 + 缓存回退
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const hit = await cache.match(req);
        return hit || new Response('', { status: 503 });
      }
    })(),
  );
});