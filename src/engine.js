import {slopeAcceleration} from './terrain.js';
import {createLayout,competitionKey,RULESET,PHYSICS} from './courses.js';
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ellipse=(p,e)=>((p.x-e.x)/e.rx)**2+((p.y-e.y)/e.ry)**2<=1;
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return distance(p,{x:a.x+dx*t,y:a.y+dy*t});}
export function inBounds(p,h){const b=h.bounds,inside=p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom;return inside&&(!Number.isFinite(h.roughWidth)||h.fairway.slice(1).some((end,i)=>segmentDistance(p,h.fairway[i],end)<=h.fairwayWidth+h.roughWidth));}
export function lieAt(p,h){if(!inBounds(p,h))return 'ob';if(h.water.some(e=>ellipse(p,e)))return 'water';if(h.sand.some(e=>ellipse(p,e)))return 'sand';if(distance(p,h.cup)<h.greenRadius)return 'green';if(h.fairway.slice(1).some((b,i)=>segmentDistance(p,h.fairway[i],b)<h.fairwayWidth))return 'fairway';return 'rough';}
export const CUP_RADIUS=.65;
export const CUP_MAX_ENTRY_SPEED=4.8;
export const friction={fairway:4.2,green:3.9,rough:4.65,sand:15,water:25,ob:4.65};
export function expectedDistance(power,lie){return Math.max(.01,power)/100*85*(4.2/friction[lie]);}
export function reliefPoint(origin,h,{allowFallback=false}={}){
  // A park-golf club is modelled as 0.86 m. Search the legal rear half-disc.
  const away=Math.atan2(origin.y-h.cup.y,origin.x-h.cup.x);
  for(let r=.08;r<=1.7201;r+=.08)for(let i=0;i<=120;i++){
    const a=away-Math.PI/2+i*Math.PI/120;const p={x:origin.x+Math.cos(a)*r,y:origin.y+Math.sin(a)*r};
    if(inBounds(p,h)&&lieAt(p,h)!=='water'&&distance(p,h.cup)>=distance(origin,h.cup)-1e-8&&!h.trees.some(t=>distance(p,t)<t.r+.1))return p;
  }
  if(allowFallback)return {...h.obTee};
  return null;
}
export function obReliefPoint(origin,h){
  const legal=reliefPoint(origin,h);if(legal)return legal;
  // A rounded end can have no inward point in the rear half-disc. The crossing
  // itself is on the playable boundary, zero clubs away and no closer to the cup.
  // Keep that position instead of silently sending the player back to the tee.
  if(inBounds(origin,h)&&lieAt(origin,h)!=='water'&&!h.trees.some(t=>distance(origin,t)<t.r+.035))return {...origin};
  throw Error('이 경계에 공을 놓을 수 없어요. 코스의 장애물 배치를 확인해 주세요.');
}
export function simulateShot(h,start,angle,power){
  if(!Number.isFinite(angle)||!Number.isFinite(power)||power<=0||power>100)throw Error('올바른 샷 값을 입력해 주세요.');
  let p={...start},v=Math.sqrt(2*4.2*85*power/100),vx=Math.cos(angle)*v,vy=Math.sin(angle)*v,lastCross={...start},wasInside=inBounds(start,h),event=null;
  const frames=[{...p,t:0}];const dt=1/120;let elapsed=0;
  for(let i=0;i<7200;i++){
    const prev={...p};const speed=Math.hypot(vx,vy);if(speed<.06)break;
    elapsed=(i+1)*dt;const slope=slopeAcceleration(p,h);vx+=slope.x*dt;vy+=slope.y*dt;
    const rollingSpeed=Math.hypot(vx,vy),f=friction[lieAt(p,h)]*dt,ratio=rollingSpeed?Math.max(0,(rollingSpeed-f)/rollingSpeed):0;vx*=ratio;vy*=ratio;p.x+=vx*dt;p.y+=vy*dt;
    for(const t of h.trees){const d=distance(p,t);if(d<t.r+.035){const nx=(p.x-t.x)/(d||1),ny=(p.y-t.y)/(d||1),dot=vx*nx+vy*ny;p={x:t.x+nx*(t.r+.04),y:t.y+ny*(t.r+.04)};if(dot<0){vx=(vx-2*dot*nx)*.5;vy=(vy-2*dot*ny)*.5;}event='tree';}}
    const inside=inBounds(p,h);if(wasInside&&!inside){let a=prev,b=p;for(let j=0;j<18;j++){const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(inBounds(mid,h))a=mid;else b=mid;}lastCross={...a};}wasInside=inside;
    // Continuous capture matches the visible cup. Centre entries tolerate a firm roll; fast or glancing passes remain in play.
    const cupOffset=segmentDistance(h.cup,prev,p),approaching=(h.cup.x-prev.x)*(p.x-prev.x)+(h.cup.y-prev.y)*(p.y-prev.y)>0;
    if(cupOffset<CUP_RADIUS&&approaching){const entrySpeed=Math.hypot(vx,vy),captureSpeed=CUP_MAX_ENTRY_SPEED*(1-.35*(cupOffset/CUP_RADIUS)**2);if(entrySpeed<=captureSpeed){p={...h.cup};frames.push({...p,t:elapsed});return {position:p,frames,holed:true,penalty:0,event:'cup'};}event='cup-miss';}
    if(inside&&h.water.some(e=>ellipse(p,e))){frames.push({...p,t:elapsed});return {position:{...p},frames,holed:false,penalty:0,event:'water',needsRelief:true};}
    if(i%4===0)frames.push({...p,t:elapsed});
  }
  frames.push({...p,t:elapsed});
  if(!inBounds(p,h)){const legal=obReliefPoint(lastCross,h);return {position:legal,frames,holed:false,penalty:2,event:'ob',reliefOrigin:lastCross,usedObTee:false};}
  return {position:p,frames,holed:false,penalty:0,event:event||lieAt(p,h)};
}
export function createRound(ids,names,random=Math.random){
  if(names.length<1||names.length>4)throw Error('1~4명이 플레이할 수 있어요.');
  const players=names.map((name,i)=>({id:i,name:String(name).trim().slice(0,12)||`플레이어 ${i+1}`,scores:[],penalties:[],ball:null,strokes:0,holePenalty:0,holed:false,needsRelief:false}));
  const order=players.map(p=>p.id);for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  const r={id:globalThis.crypto?.randomUUID?.()||`round-${Date.now()}`,schema:1,ruleset:RULESET,physics:PHYSICS,courseIds:[...ids],key:competitionKey(ids),layout:createLayout(ids),players,order,holeIndex:0,active:order[0],status:'playing',startedAt:new Date().toISOString(),log:[]};
  setupHole(r);return r;
}
function setupHole(r){for(const p of r.players)Object.assign(p,{ball:{...r.layout[r.holeIndex].tee},strokes:0,holePenalty:0,holed:false,needsRelief:false});r.active=r.order[0];r.status='playing';}
export function nextPlayer(r){const pending=r.players.filter(p=>!p.holed);if(!pending.length)return null;const tee=r.order.find(id=>r.players[id].strokes===0);if(tee!==undefined)return tee;return [...pending].sort((a,b)=>distance(b.ball,r.layout[r.holeIndex].cup)-distance(a.ball,r.layout[r.holeIndex].cup)||r.order.indexOf(a.id)-r.order.indexOf(b.id))[0].id;}
export function takeShot(r,angle,power){
  if(r.status!=='playing')throw Error('지금은 샷을 할 수 없어요.');const p=r.players[r.active];if(p.needsRelief)throw Error('먼저 워터 해저드 처치를 확인해 주세요.');
  const result=simulateShot(r.layout[r.holeIndex],p.ball,angle,power);const from={...p.ball};p.strokes++;p.holePenalty+=result.penalty;p.ball={...result.position};p.holed=result.holed;p.needsRelief=!!result.needsRelief;
  r.log.push({hole:r.holeIndex,player:p.id,angle,power,from,to:{...p.ball},penalty:result.penalty,event:result.event,...(result.event==='ob'?{reliefOrigin:{...result.reliefOrigin}}:{})});
  settleTurn(r,p);return result;
}
function settleTurn(r,p){if(p.holed){p.scores[r.holeIndex]=p.strokes+p.holePenalty;p.penalties[r.holeIndex]=p.holePenalty;}if(p.needsRelief)return;const next=nextPlayer(r);if(next===null)r.status='hole-complete';else r.active=next;}
export function takeRelief(r){if(r.status!=='playing')throw Error('처치할 수 없는 상태입니다.');const p=r.players[r.active],h=r.layout[r.holeIndex];if(!p.strokes)throw Error('티샷 전에는 처치하지 않습니다.');const from={...p.ball};let relief=reliefPoint(p.ball,h);
  if(!relief&&p.needsRelief){relief={...(h.waterObTee||h.obTee)};}
  if(!relief){
    const previous=[...r.log].reverse().find(s=>s.player===p.id&&s.hole===r.holeIndex&&s.event!=='unplayable')?.from||h.tee;
    const a=Math.atan2(previous.y-p.ball.y,previous.x-p.ball.x);
    for(let d=.2;d<Math.max(h.width,h.height)*2;d+=.2){const candidate={x:p.ball.x+Math.cos(a)*d,y:p.ball.y+Math.sin(a)*d};if(inBounds(candidate,h)&&lieAt(candidate,h)!=='water'&&!h.trees.some(t=>distance(candidate,t)<t.r+.1)&&distance(candidate,h.cup)>=distance(from,h.cup)){relief=candidate;break;}}
  }
  if(!relief)throw Error('처치 가능한 지점을 찾지 못했어요. 현재 위치에서 플레이해 주세요.');
  p.holePenalty+=2;p.ball=relief;p.needsRelief=false;r.log.push({hole:r.holeIndex,player:p.id,event:'unplayable',from,to:{...relief},penalty:2});settleTurn(r,p);return relief;}
export function advanceHole(r){if(r.status!=='hole-complete')throw Error('모두 홀아웃해야 이동할 수 있어요.');if(r.holeIndex===17){r.status='complete';r.completedAt=new Date().toISOString();return;}r.order.sort((a,b)=>r.players[a].scores[r.holeIndex]-r.players[b].scores[r.holeIndex]);r.holeIndex++;setupHole(r);}
export function total(p){return p.scores.reduce((a,b)=>a+b,0);}
export function rankPlayers(players){return [...players].sort((a,b)=>total(a)-total(b)).map((p,i,a)=>({...p,rank:a.findIndex(q=>total(q)===total(p))+1}));}
export function scoreLabel(score,par){const d=score-par;if(score===1)return '홀인원!';return ({'-3':'알바트로스','-2':'이글','-1':'버디',0:'파',1:'보기',2:'더블 보기'})[d]||`${d>0?'+':''}${d}`;}
