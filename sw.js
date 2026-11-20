const CACHE='should-i-stay-v112';
// the recordings (sound/<name>.m4a?v=<digest>) are kept apart: fetched when a place is first heard, never at install,
// and kept across versions of the game, since a recording's address changes with its content (the page takes out the
// ones its version no longer has: soundPrune() in index.html)
const SOUND='should-i-stay-sound';
const FILES=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
// install fetches past the browser's HTTP cache, so a new version never caches the previous index.html
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(u=>new Request(u,{cache:'reload'})))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&x!==SOUND).map(x=>caches.delete(x)))));self.clients.claim();});
// a copy put into a cache after the answer has gone: the worker is kept alive until it is stored (waitUntil)
function keep(e,p){try{e.waitUntil(p);}catch(err){}}
// a recording: from its cache, else from the network into it, with the same file's older versions taken out
function sound(req,e){
  return caches.open(SOUND).then(c=>c.match(req).then(r=>r||fetch(req).then(resp=>{
    if(resp.status===200){
      const u=new URL(req.url),copy=resp.clone();
      keep(e,c.keys().then(ks=>Promise.all(ks.filter(k=>{const o=new URL(k.url);return o.pathname===u.pathname&&o.search!==u.search;}).map(k=>c.delete(k))))
        .then(()=>c.put(req,copy)).catch(()=>{}));
    }
    return resp;
  })));
}
// cache first. A page opened with a query (?utm=...) is the same game; only good answers from this site are kept;
// offline, a page falls back to the cached game and anything else fails cleanly
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url), nav=req.mode==='navigate', same=url.origin===self.location.origin;
  if(same&&/\/sound\/[^/]+\.m4a$/.test(url.pathname)){e.respondWith(sound(req,e).catch(()=>Response.error()));return;}
  e.respondWith(caches.match(req,{ignoreSearch:nav}).then(r=>r||fetch(req).then(resp=>{
    if(resp.ok&&same&&!nav){const copy=resp.clone();keep(e,caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}));}
    return resp;
  })).catch(()=>nav?caches.match('index.html').then(r=>r||Response.error()):Response.error()));
});
