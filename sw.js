const CACHE='should-i-stay-v24';
const FILES=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
// install fetches past the browser's HTTP cache, so a new version never caches the previous index.html
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(u=>new Request(u,{cache:'reload'})))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim();});
// cache first. A page opened with a query (?utm=...) is the same game; only good answers from this site are kept;
// offline, a page falls back to the cached game and anything else fails cleanly
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const nav=req.mode==='navigate', same=new URL(req.url).origin===self.location.origin;
  e.respondWith(caches.match(req,{ignoreSearch:nav}).then(r=>r||fetch(req).then(resp=>{
    if(resp.ok&&same&&!nav){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
    return resp;
  })).catch(()=>nav?caches.match('index.html').then(r=>r||Response.error()):Response.error()));
});
