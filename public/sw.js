const CACHE='schoolyard-buddies-unified-v14-4-1';
const CORE=['./','./index.html','./game.html','./desktop.html','./manifest.webmanifest','./assets/schoolyard-logo.png','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));return}e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n&&n.ok)caches.open(CACHE).then(c=>c.put(e.request,n.clone()));return n}))) });
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
