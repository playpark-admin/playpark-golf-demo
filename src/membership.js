// Entitlement policy is independent of storage/authentication. The demo provider
// supplies a context; production must replace it with verified server entitlements.
export const PREMIUM_VENUES=Object.freeze({chungju:800,taean:1600,yeosu:2400,uljin:3000,jeongseon:5000,jeju:8000});
export const BALL_STYLES=Object.freeze([
 {id:'classic',name:'클래식 화이트',fill:'#ffffff',mark:'none'},
 {id:'gold',name:'골드 스타',fill:'#ffe5a0',mark:'star'},
 {id:'pearl',name:'펄 블루',fill:'#d8f0ff',mark:'stripe'},
 {id:'rose',name:'로즈 플라워',fill:'#ffe0e8',mark:'flower'}
]);
export const isPlus=context=>context?.plan==='plus';
export function venueAccess(id,points=0,context={}){
 const requiredPoints=PREMIUM_VENUES[id]||0,owned=Boolean(requiredPoints&&(context.earnedVenues||[]).includes(id)),earned=requiredPoints>0&&points>=requiredPoints;
 return {premium:requiredPoints>0,requiredPoints,owned:owned||earned,unlocked:!requiredPoints||owned||earned||isPlus(context),remaining:Math.max(0,requiredPoints-points),via:!requiredPoints?'free':owned||earned?'earned':isPlus(context)?'plus':'locked'};
}
export function earnedVenues(points,previous=[]){return [...new Set([...previous.filter(id=>Object.hasOwn(PREMIUM_VENUES,id)),...Object.entries(PREMIUM_VENUES).filter(([,p])=>points>=p).map(([id])=>id)])];}
export function courseLevel(course,context){const normal=course.unlockLevel??(course.level>=3?3:1);return isPlus(context)?Math.max(1,normal-2):normal;}
export function memberBall(context){return isPlus(context)?BALL_STYLES.find(s=>s.id===context.ballStyle)||BALL_STYLES[0]:BALL_STYLES[0];}
