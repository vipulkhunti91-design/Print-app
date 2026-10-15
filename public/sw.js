const CACHE_PREFIX = "phopy-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const appShell = new URL("./", self.registration.scope);

    try {
      const response = await fetch(appShell);
      if (response.ok) {
        await cache.put(appShell, response.clone());
        const html = await response.text();
        const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
          .map((match) => new URL(match[1], appShell))
          .filter((url) => url.origin === self.location.origin);
        await Promise.all(assets.map(async (url) => {
          try {
            const asset = await fetch(url);
            if (asset.ok) await cache.put(url, asset);
          } catch {
            // Keep installation available even if an optional asset is offline.
          }
        }));
      }
    } catch {
      // The app still works online if the shell cannot be cached at install time.
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const oldCaches = await caches.keys();
    await Promise.all(oldCaches
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  const appShell = new URL("./", self.registration.scope);
  if (requestUrl.origin !== self.location.origin || !requestUrl.pathname.startsWith(appShell.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode === "navigate") {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(appShell, response.clone());
        return response;
      } catch {
        return (await cache.match(appShell)) || Response.error();
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
