const SHELL_CACHE = 'booklib-shell-v2';
const IMAGE_CACHE = 'booklib-images-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== SHELL_CACHE && k !== IMAGE_CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// 画像は「キャッシュ優先、無ければネットワークで取得してキャッシュに保存」(表紙画像は変わらないため)
// アプリ本体(html/js/manifest)は「ネットワーク優先、オフラインの時だけキャッシュにフォールバック」
// これにより、GitHub側を更新すればオンライン時は常に最新版が反映される
self.addEventListener('fetch', function (event) {
  const req = event.request;
  const isImage = req.destination === 'image';

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(function (cache) {
        return cache.match(req).then(function (cached) {
          if (cached) return cached;
          return fetch(req).then(function (res) {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(function () {
            return cached; // undefinedの場合は画像なし表示になる
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        caches.open(SHELL_CACHE).then(function (cache) { cache.put(req, res.clone()); });
      }
      return res;
    }).catch(function () {
      return caches.match(req); // オフライン時のみキャッシュから返す
    })
  );
});
