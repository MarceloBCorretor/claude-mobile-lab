const VERSION='pinball-zumbi-v2';
const SHELL=['./','./index.html','./game.js','./manifest.webmanifest','./assets/icones/icone-192.png','./assets/icones/icone-512.png',
 './assets/ui/menu.webp','./assets/ui/personagens.webp','./assets/ui/cenario-a.webp','./assets/ui/cenario-b.webp','./assets/ui/cenario-c.webp',
 './assets/felipe/feliz.webp','./assets/felipe/triste.webp','./assets/felipe/assustado.webp','./assets/felipe/concentrado.webp','./assets/felipe/vitoria.webp','./assets/felipe/upiii.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))),self.clients.claim()]))});
// Rede primeiro: com internet sempre pega a versão nova; sem internet usa o cache.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(ca=>ca.put(e.request,c))}return r}).catch(()=>caches.match(e.request)));
});
