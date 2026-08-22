// Service worker "kill-switch" pro subdomínio antigo qse.nikolasleme.com.br.
//
// Quem instalou o PWA no endereço antigo tem um SW cache-first registrado lá:
// sem isto, ele serviria a versão em cache pra sempre e o usuário nunca veria
// o redirect pro endereço novo. Este SW substitui o antigo (mesma URL sw.js),
// limpa os caches, se desregistra e recarrega as janelas abertas — que então
// caem no 301 e chegam em /games/quem-sou-eu/.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) {
        clients.forEach(function (c) { c.navigate(c.url); });
      })
  );
});
