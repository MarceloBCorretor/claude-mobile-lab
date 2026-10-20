"""Gera service-worker.js com a lista de arquivos para funcionar offline. Uso: python3 build_sw.py <pasta_do_jogo> <versao>"""
import os, sys
G = sys.argv[1]; ver = sys.argv[2]
files = ['./', './index.html', './game.js', './manifest.webmanifest']
for root, _, fs in os.walk(os.path.join(G, 'assets')):
    for f in sorted(fs):
        files.append('./' + os.path.relpath(os.path.join(root, f), G).replace(os.sep, '/'))
js = "const VERSION='pinball-zumbi-%s';\nconst SHELL=%s;\n" % (ver, str(files).replace("'", '"'))
js += """self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))),self.clients.claim()]))});
// Rede primeiro: com internet sempre pega a versão nova; sem internet usa o cache.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(ca=>ca.put(e.request,c))}return r}).catch(()=>caches.match(e.request)));
});
"""
open(os.path.join(G, 'service-worker.js'), 'w').write(js); print(len(files), 'arquivos no cache', ver)
