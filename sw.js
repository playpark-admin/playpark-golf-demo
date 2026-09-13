const CACHE='plpark-ebe94845a518';const FILES=["./","./index.html","./manifest.webmanifest","./src/app.js","./src/art.js","./src/audio.js","./src/brand.css","./src/camera.js","./src/course-expansion.js","./src/courses.js","./src/engine.js","./src/immersive.css","./src/joystick.js","./src/lessons.js","./src/quiz-bank.js","./src/quiz.js","./src/record-store.js","./src/records-view.js","./src/records.css","./src/records.js","./src/responsive.css","./src/scorecard-image.js","./src/senior.css","./src/shot-animation.js","./src/styles.css","./src/terrain.js","./src/viewport.js","./assets/brand/playpark-lockup.png","./assets/brand/playpark-symbol.png","./assets/brand/plpak.png","./assets/brand/plpak.webp","./assets/icon-180.png","./assets/icon-192.png","./assets/icon-512.png"];
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
