/* ===========================================================================
   sw.js — offline copy of a very small site.

   Network first for everything same-origin, with the cache as the fallback.

   Stale while revalidate is the usual choice here and it is wrong for this
   site. The whole payload is a few KB behind a CDN, so there is nothing to
   win by serving yesterday's copy, and the cost is real: a deploy would ship
   a stylesheet that does not reach anyone until their second visit. Fresh on
   every load, still fully readable with no network.

   Cross-origin requests (the two font hosts) are left entirely alone.
   Caching opaque responses buys nothing and hides failures.
   =========================================================================== */

/* Bump this on every deploy that changes CORE. The activate handler deletes
   every cache that is not this version, so a stale name is what keeps an old
   asset alive. */
var VERSION = "ls-2026-08-03a";
var CORE = [
  "./",
  "./index.html",
  "./404.html",
  "./assets/css/tokens.css",
  "./assets/css/base.css",
  "./assets/css/glass.css",
  "./assets/css/sections.css",
  "./assets/css/depth.css",
  "./assets/css/states.css",
  "./assets/js/liquid-glass.js",
  "./assets/js/instrument.js",
  "./assets/js/field.js",
  "./assets/js/main.js",
  "./assets/icon.svg",
  "./assets/img/bateke-plateau.webp",
  "./manifest.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION)
      .then(function (cache) {
        // addAll fails the whole install if any single entry 404s, which is
        // too brittle for a static host. Add each and tolerate misses.
        return Promise.all(CORE.map(function (url) {
          return cache.add(new Request(url, { cache: "reload" })).catch(function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return key === VERSION ? null : caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          // An unvisited page while offline still gets the one real page.
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        });
      })
  );
});
