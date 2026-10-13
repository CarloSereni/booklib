// 蔵書ライブラリ用 Service Worker v2
// - インストール時に画面本体(index.html等)をあらかじめ保存する(プレキャッシュ)
// - ページ表示: ネットワーク優先(4秒で諦める)→ 失敗したら保存済みの index.html を返す
//   (起動URLが "./" でも "./index.html" でも "?付き" でも、同じ index.html を返す)
// - 表紙画像: キャッシュ優先。保存数が増えすぎたら古いものから削除
// - GASへの通信(script.google.com / googleusercontent)やPOSTは一切横取りしない
const CACHE_NAME = 'booklib-v2';
const IMG_CACHE = 'booklib-img-v1';
const IMG_CACHE_MAX = 2500;   // 表紙画像の保存上限(端末の容量節約)
const NAV_TIMEOUT_MS = 4000;  // 回線が不安定なときに待ちすぎないための時間

// このSWの置かれた場所を基準にしたURL(GitHub Pagesのサブフォルダでも動く)
const SHELL_URL = new URL('./index.html', self.registration.scope).href;
const PRECACHE_URLS = [
  new URL('./', self.registration.scope).href,
  SHELL_URL,
  new URL('./manifest.json', self.registration.scope).href,
  new URL('./icon-192.png', self.registration.scope).href,
  new URL('./icon-512.png', self.registration.scope).href,
  new URL('./icon-maskable-512.png', self.registration.scope).href
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // 1つのファイルが取れなくても全体が失敗しないよう、個別に保存する
      return Promise.all(PRECACHE_URLS.map(function (u) {
        return cache.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME && k !== IMG_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function fetchWithTimeout(req, ms) {
  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      resolve(res);
    }, function (err) {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// 画像キャッシュが上限を超えたら、古い方(先に保存された方)から削除する
function trimImageCache_(cache) {
  return cache.keys().then(function (keys) {
    if (keys.length <= IMG_CACHE_MAX) return;
    const removeCount = keys.length - IMG_CACHE_MAX + 200; // まとめて少し多めに消す
    return Promise.all(keys.slice(0, removeCount).map(function (k) { return cache.delete(k); }));
  });
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // GAS(データ取得・更新)は常にそのままネットワークへ
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('script.googleusercontent.com')) return;

  // ページ(画面)の表示: 起動URLがどんな形でも index.html を返せるようにする
  if (req.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(req, NAV_TIMEOUT_MS).then(function (res) {
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(SHELL_URL, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(SHELL_URL, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match(req, { ignoreSearch: true });
        }).then(function (hit) {
          return hit || new Response('オフラインで、保存済みの画面がありません。一度オンラインで開いてください。', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  // 表紙画像: キャッシュ優先(オフラインでも表示できるように)
  if (req.destination === 'image') {
    event.respondWith(
      caches.open(IMG_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            // cross-originの画像は opaque(status 0)でも保存してよい
            if (res && (res.ok || res.type === 'opaque')) {
              cache.put(req, res.clone()).then(function () { return trimImageCache_(cache); });
            }
            return res;
          }).catch(function () { return hit || Response.error(); });
        });
      })
    );
    return;
  }

  // 同一オリジンのその他のファイル(JS/CSS/manifestなど): ネットワーク優先、失敗したらキャッシュ
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetchWithTimeout(req, NAV_TIMEOUT_MS).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || Response.error();
        });
      })
    );
  }
});
