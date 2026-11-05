const CACHE = "form-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./core.js",
  "./storage.js",
  "./weather.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  ...[
    "t1",
    "t2",
    "t3",
    "t4",
    "t5",
    "t6",
    "b1",
    "b2",
    "b3",
    "b4",
    "s1",
    "s2",
    "s3",
    "s4",
    "l1",
    "l2",
    "l3",
    "l4",
  ].map((id) => `./assets/${id}.svg`),
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("form-shell-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  const path = url.pathname;
  if (!SHELL.some((p) => new URL(p, self.registration.scope).pathname === path))
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && !response.redirected && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
