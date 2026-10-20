// Service worker — "Quem sou eu?" offline.
// Pré-cacheia o app shell e serve do cache quando não há rede.
// Para forçar atualização após mudar arquivos: suba o número da versão.

const CACHE = "quem-sou-eu-v6";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20261020c",
  "./app.js?v=20261020",
  "./words.js",
  "./manifest.webmanifest",
  "./assets/favicon.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

// Instala: baixa o app shell de uma vez.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Ativa: limpa caches de versões antigas.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Busca: cache-first para o app (fontes inclusas, são do mesmo domínio).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((emCache) => {
      if (emCache) return emCache;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copia = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copia));
          }
          return res;
        })
        .catch(() => {
          // Offline e sem cache: numa navegação, devolve o index.
          if (req.mode === "navigate") return caches.match("./index.html");
        });
    })
  );
});
