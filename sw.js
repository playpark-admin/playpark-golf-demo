const CACHE='plpark-fd96885492d9';const FILES=["./","./index.html","./manifest.webmanifest","./src/courses.js","./src/engine.js","./src/lessons.js","./src/art.js","./src/app.js","./src/styles.css","./src/brand.css","./src/joystick.js","./src/senior.css","./src/terrain.js","./src/responsive.css","./src/viewport.js","./src/quiz-bank.js","./src/quiz.js","./src/records.js","./src/record-store.js","./src/shot-animation.js","./src/scorecard-image.js","./src/records-view.js","./src/records.css","./src/audio.js","./src/camera.js","./src/immersive.css","./src/course-expansion.js","./assets/icon-180.png","./assets/icon-192.png","./assets/icon-512.png","./assets/brand/plpak.png","./assets/brand/plpak.webp","./assets/brand/playpark-symbol.png","./assets/brand/playpark-lockup.png"];
// CACHE and FILES are inserted by the build. Activation upgrades existing v1 cache-first clients.
self.addEventListener('install',event=>event.waitUntil((async()=>{
  await (await caches.open(CACHE)).addAll(FILES);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const old=(await caches.keys()).filter(key=>key.startsWith('plpark-')&&key!==CACHE);
  await Promise.all(old.map(key=>caches.delete(key)));
  await self.clients.claim();
  if(old.length){
    const windows=await self.clients.matchAll({type:'window'});
    // Do not await navigation during activation: navigation itself waits for activation.
    for(const client of windows)if(client.url.startsWith(self.registration.scope))void client.navigate(client.url).catch(()=>null);
  }
})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(request.mode==='navigate'){
      try{return await fetch(request);}catch{return (await cache.match('./index.html'))||Response.error();}
    }
    return (await cache.match(request))||fetch(request);
  })());
});
