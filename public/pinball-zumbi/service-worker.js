const VERSION='pinball-zumbi-v1';
const SHELL=['./','./index.html','./manifest.webmanifest','./assets/icones/icone-192.png','./assets/icones/icone-512.png','./assets/personagens/felipe.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))),self.clients.claim()]))});
// Rede primeiro: sempre pega a versão nova quando online e cai no cache quando offline.
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(event.request,copy))}
    return response;
  }).catch(()=>caches.match(event.request)));
});
