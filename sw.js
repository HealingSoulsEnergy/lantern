/* Lantern service worker.
   Caches the app shell so the page and the crisis hotlines load even with no
   signal. Category search still needs a connection, but the lifelines do not.
   Bump CACHE if you change the icons or manifest; HTML updates pick up
   automatically because navigations are served network-first. */
const CACHE = "lantern-v1";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  // Only handle our own files. Let Google search, fonts, and the QR image go
  // straight to the network so nothing is cached or blocked by mistake.
  if(url.origin !== location.origin) return;

  const isPage = req.mode === "navigate" || (req.headers.get("accept")||"").includes("text/html");
  if(isPage){
    // Network-first so edits to index.html show up; fall back to cache offline.
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy));
        return res;
      }).catch(()=> caches.match(req).then(r=> r || caches.match("./index.html")))
    );
  } else {
    // Cache-first for icons and the manifest.
    e.respondWith(
      caches.match(req).then(r=> r || fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy));
        return res;
      }))
    );
  }
});
