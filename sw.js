/* Service worker đơn giản: luôn ưu tiên mạng (nội dung mới nhất), chỉ dùng bản lưu khi mất mạng. */
var CACHE = "dealnest-v1";
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin || /admin/.test(u.pathname)) return; // không đụng tới trang admin và API
  e.respondWith(
    fetch(r)
      .then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
        return res;
      })
      .catch(function () { return caches.match(r).then(function (m) { return m || caches.match("index.html"); }); })
  );
});
