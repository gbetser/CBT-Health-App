const CACHE='cbt-health-v5';
const ASSETS=['/manifest.json?v=5','/icon.svg?v=5'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  const u=new URL(req.url);

  if(u.pathname.startsWith('/api/')) return;

  if(req.mode==='navigate'){
    e.respondWith(
      fetch(new Request(req,{cache:'no-store'}))
        .then(resp=>{
          const copy=resp.clone();
          caches.open(CACHE).then(c=>c.put('/index.html',copy));
          return resp;
        })
        .catch(()=>caches.match('/index.html'))
    );
    return;
  }

  if(u.pathname==='/sw.js' || u.pathname==='/index.html') return;

  e.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(resp=>{
      const copy=resp.clone();
      caches.open(CACHE).then(c=>c.put(req,copy));
      return resp;
    }))
  );
});