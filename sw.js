// Expo Hub · service worker minimo: serve a "Installa app" di Chrome/Edge. Tiene in memoria SOLO i file della pagina
// (mai le risposte del motore né i file caricati), così l'app si apre subito; i dati arrivano sempre dal motore.
const VERSIONE = "expohub-21";
const FILE = ["./", "index.html", "config.js", "kit/colori_ares_glass.css", "kit/ares_glass.css", "kit/ares_glass.js",
  "stile.css", "tema_scuro.css", "icone.js", "lingue.js", "app.js", "icona.svg", "icona_192.png", "icona_512.png", "manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== VERSIONE).map((n) => caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;     // motore e Drive: sempre dalla rete
  // prima la rete (pagina sempre aggiornata), la copia solo se la rete non c'è. `no-cache`: GitHub Pages dice al browser
  // di tenere i file 10 minuti, e l'app installata mostrava la versione vecchia; così chiede sempre al server se è
  // cambiato qualcosa (risposta minima, 304, se non è cambiato) (utente 2026-11-26)
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((r) => {
    const copia = r.clone();
    caches.open(VERSIONE).then((c) => c.put(e.request, copia));
    return r;
  }).catch(() => caches.match(e.request)));
});
