// All glyph sizes below are screen pixels. Their anchors stay in course metres.
// These are visibility aids only; shot distances, collisions and cup capture are unchanged.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const safeScale=n=>Number.isFinite(n)&&n>0?n:1;
export function aimVisual(ball,cup,angle,distance,scale){
 scale=safeScale(scale);const toCup=Math.hypot(cup.x-ball.x,cup.y-ball.y);
 const length=distance>0?distance:Math.min(toCup,Math.max(6,44/scale));
 const end={x:ball.x+Math.cos(angle)*length,y:ball.y+Math.sin(angle)*length},path=`M${ball.x} ${ball.y}L${end.x} ${end.y}`;
 const arrow=length*scale>42?`<g transform="translate(${ball.x+(end.x-ball.x)*.65} ${ball.y+(end.y-ball.y)*.65}) rotate(${angle*180/Math.PI}) scale(${1/scale})"><path class="aim-chevron-outline" d="M-5 -5L1 0 -5 5"/><path class="aim-chevron" d="M-5 -5L1 0 -5 5"/></g>`:'';
 return `<path class="aim-outline" d="${path}"/><path class="aim-line" d="${path}"/>${arrow}<g class="aim-target" transform="translate(${end.x} ${end.y}) scale(${1/scale})"><circle class="aim-target-outline" r="6"/><circle class="aim-target-ring" r="6"/></g>`;
}
export function ballVisuals(round,{animatedId=null,position=null,scale=1,colors=[]}={}){
 scale=safeScale(scale);const active=animatedId??round.active,cup=round.layout[round.holeIndex].cup;
 // The ball being played is drawn last, including a moving ball after turn advancement.
 return round.players.filter(p=>!p.holed||p.id===animatedId).sort((a,b)=>Number(a.id===active)-Number(b.id===active)).map(p=>{
  const b=p.id===animatedId?position:p.ball,selected=p.id===active,radius=clamp(.65*scale,selected?7:5,selected?9:7);
  const ring=selected&&animatedId===null&&Math.hypot(b.x-cup.x,b.y-cup.y)*scale>26;
  return `<g class="ball-marker ${selected?'current-ball':''} ${p.id===animatedId?'moving-ball':''}" data-player-id="${p.id}" transform="translate(${b.x} ${b.y}) scale(${1/scale})"><ellipse cx="2" cy="3" rx="${radius+2}" ry="${radius*.8}" fill="#17283d66"/>${ring?`<circle class="active-ball-ring-outline" r="${radius+6}"/><circle class="active-ball-ring" r="${radius+6}"/>`:''}<circle class="ball-rim" r="${radius+1}"/><circle class="ball-body" r="${radius}" fill="${colors[p.id]||'#fff'}"/><circle class="ball-shine" cx="${-radius*.27}" cy="${-radius*.3}" r="${radius*.22}" fill="#fff" opacity=".8"/></g>`;
 }).join('');
}
export function trailVisual(points){
 if(points.length<2)return '';const path=points.map(p=>`${p.x},${p.y}`).join(' ');
 return `<polyline class="shot-trail-outline" points="${path}"/><polyline class="shot-trail" points="${path}"/>`;
}
