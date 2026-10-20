const VERSION='pinball-zumbi-v4';
const SHELL=["./", "./index.html", "./game.js", "./manifest.webmanifest", "./assets/icones/icone-192.png", "./assets/icones/icone-512.png", "./assets/ui/menu.webp", "./assets/ui/personagens.webp", "./assets/ui/thumb-fonte.webp", "./assets/felipe/feliz.webp", "./assets/felipe/triste.webp", "./assets/felipe/assustado.webp", "./assets/felipe/concentrado.webp", "./assets/felipe/vitoria.webp", "./assets/felipe/upiii.webp", "./assets/fase1/fundo.webp", "./assets/fase1/barreira.png", "./assets/fase1/cereja_34.png", "./assets/fase1/cereja_frente.png", "./assets/fase1/flipper.png", "./assets/fase1/gelo_34.png", "./assets/fase1/gelo_e1.png", "./assets/fase1/gelo_e2.png", "./assets/fase1/gelo_e3.png", "./assets/fase1/gelo_frente.png", "./assets/fase1/girassol_34.png", "./assets/fase1/girassol_frente.png", "./assets/fase1/lancador.png", "./assets/fase1/lixeira.png", "./assets/fase1/pneu.png", "./assets/fase1/zumbi_34.png", "./assets/fase1/zumbi_frente.png", "./assets/fase1/zumbi_lado.png", "./assets/fase1/zumbi_tras.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))),self.clients.claim()]))});
// Rede primeiro: com internet sempre pega a versão nova; sem internet usa o cache.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(ca=>ca.put(e.request,c))}return r}).catch(()=>caches.match(e.request)));
});
