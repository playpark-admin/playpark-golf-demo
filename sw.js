const CACHE='plpark-957222e9a77e';const FILES=["./","./index.html","./manifest.webmanifest","./src/app-info.js","./src/app.js","./src/art.js","./src/audio.js","./src/boundary.js","./src/brand.css","./src/caddy-message.css","./src/caddy-message.js","./src/camera.js","./src/course-access-view.js","./src/course-access.css","./src/course-access.js","./src/course-expansion.js","./src/course-features.js","./src/course-flags.js","./src/course-framing.js","./src/course-layout.css","./src/course-scenery.js","./src/courses.js","./src/engine.js","./src/geometry.js","./src/hole-result-view.js","./src/hole-result.css","./src/identity.css","./src/immersive.css","./src/joystick.js","./src/lessons.js","./src/member-analysis.js","./src/membership-view.js","./src/membership.css","./src/membership.js","./src/music-scores.js","./src/music.js","./src/obstacles.js","./src/player-badges.js","./src/player-profiles.css","./src/player-profiles.js","./src/plus-style.css","./src/plus-view.js","./src/progression-view.js","./src/progression.css","./src/progression.js","./src/quiz-bank.js","./src/quiz-scenarios.js","./src/quiz.js","./src/record-store.js","./src/records-view.js","./src/records.css","./src/records.js","./src/regional-courses.js","./src/responsive.css","./src/saved-round.js","./src/scorecard-image.js","./src/senior.css","./src/session.js","./src/shot-animation.js","./src/shot-visuals.css","./src/shot-visuals.js","./src/styles.css","./src/terrain.js","./src/venue-view.js","./src/venues.css","./src/venues.js","./src/viewport.js","./assets/brand/playpark-lockup.png","./assets/brand/playpark-symbol.png","./assets/brand/plpak-celebrate.webp","./assets/brand/plpak-encourage.webp","./assets/brand/plpak-praise.webp","./assets/brand/plpak.png","./assets/brand/plpak.webp","./assets/brand/plus-crest.svg","./assets/fonts/Belleza-OFL.txt","./assets/fonts/Belleza-Regular.ttf","./assets/icon-180.png","./assets/icon-192.png","./assets/icon-512.png"];
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
