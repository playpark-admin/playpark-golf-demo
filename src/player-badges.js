import {avatarImage,escapeProfile,PLAYER_COLORS} from './player-profiles.js';
import {segmentDistance} from './geometry.js';
const W=68,H=62;
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
export function layoutProfileBadges(players,size,obstacles=[],aim=null,previous=new Map()){
 const placed=[],balls=players.map(p=>({x:p.x-17,y:p.y-17,width:34,height:34}));
 for(const p of [...players].sort((a,b)=>Number(b.active)-Number(a.active)||a.id-b.id)){
  if(p.x<-16||p.y<-16||p.x>size.width+16||p.y>size.height+16)continue;
  const candidates=[];const old=previous.get(p.id);if(old)candidates.push({dx:old.dx,dy:old.dy});
  for(const radius of [52,80,112,150])for(let i=0;i<12;i++){const angle=(-Math.PI/2)+(i+(p.id%2?.5:0))*Math.PI/6;candidates.push({dx:Math.cos(angle)*radius,dy:Math.sin(angle)*radius});}
  for(let y=H/2+3;y<size.height-H/2;y+=28)for(let x=W/2+3;x<size.width-W/2;x+=28)candidates.push({dx:x-p.x,dy:y-p.y});
  let best=null;
  for(const [i,c] of candidates.entries()){
   const x=Math.max(3,Math.min(size.width-W-3,p.x+c.dx-W/2)),y=Math.max(3,Math.min(size.height-H-3,p.y+c.dy-H/2)),rect={x,y,width:W,height:H};
   const collision=[...obstacles,...balls,...placed].reduce((n,o)=>n+overlap(rect,o),0),center={x:x+W/2,y:y+H/2};
   const aimHit=aim?[center,{x,y},{x:x+W,y},{x,y:y+H},{x:x+W,y:y+H}].some(q=>segmentDistance(q,aim.a,aim.b)<25):false;
   const score=collision*10000+(aimHit?10000:0)+Math.hypot(center.x-p.x,center.y-p.y)+(old&&i===0?-20:0);
   if(!best||score<best.score)best={id:p.id,...rect,dx:center.x-p.x,dy:center.y-p.y,score,collision};
  }
  // Fallback prioritizes visible ball/cup/HUD over a portrait on tiny screens.
  if(best&&best.collision===0){placed.push(best);previous.set(p.id,best);}
 }
 return placed;
}
export function createPlayerBadges(stage,round,{profileFor,plus=false}={}){
 const overlay=document.createElement('div');overlay.className='player-badges';overlay.setAttribute('aria-label','플레이어별 공 위치');
 overlay.innerHTML='<svg class="profile-leaders" aria-hidden="true"></svg>'+round.players.map(p=>'<div class="ball-profile '+(plus&&p.id===0?'plus-profile':'')+'" data-profile-player="'+p.id+'" style="--player-color:'+PLAYER_COLORS[p.id%4]+'"><span class="profile-face">'+avatarImage(profileFor(p),p.id)+'<b class="profile-number">'+(p.id+1)+'</b></span><span class="profile-name">'+escapeProfile(p.name)+'</span></div>').join('');stage.append(overlay);
 const nodes=new Map([...overlay.querySelectorAll('.ball-profile')].map(e=>[Number(e.dataset.profilePlayer),e])),last=new Map();
 let sample={},frame=0,destroyed=false;
 function draw(){
  const {animatedId=null,position=null}=sample;
  const world=stage.querySelector('#course-world'),matrix=world?.getScreenCTM();if(!matrix)return;
  const box=stage.getBoundingClientRect(),project=p=>{const q=new DOMPoint(p.x,p.y).matrixTransform(matrix);return {x:q.x-box.left,y:q.y-box.top};};
  const active=animatedId??round.active,players=round.players.filter(p=>!p.holed||p.id===animatedId).map(p=>({...project(p.id===animatedId&&position?position:p.ball),id:p.id,active:p.id===active}));
  const obstacles=[...stage.querySelectorAll('.joystick-dock,.stage-note,.terrain-readout,.map-tools,.dock-action,.cup-flag,.cup-rim')].filter(e=>e.getClientRects().length).map(e=>{const b=e.getBoundingClientRect();return{x:b.x-box.x-5,y:b.y-box.y-5,width:b.width+10,height:b.height+10};});
  const line=stage.querySelector('.aim-line');let aim=null;if(line){const path=line.getAttribute('d')?.match(/M([-\d.e+]+) ([-\d.e+]+)L([-\d.e+]+) ([-\d.e+]+)/);if(path)aim={a:project({x:+path[1],y:+path[2]}),b:project({x:+path[3],y:+path[4]})};}
  const layout=layoutProfileBadges(players,box,obstacles,aim,last);
  for(const [id,e] of nodes){const pos=layout.find(p=>p.id===id);e.hidden=!pos;if(!pos)continue;e.style.transform='translate('+pos.x+'px,'+pos.y+'px)';e.classList.toggle('is-active',id===active);e.setAttribute('aria-label',(id+1)+'번 '+round.players.find(p=>p.id===id).name+(id===active?' · 현재 플레이':' · 공 위치'));}
  overlay.querySelector('svg').innerHTML=layout.map(p=>{const ball=players.find(b=>b.id===p.id),x=Math.max(p.x,Math.min(p.x+W,ball.x)),y=Math.max(p.y,Math.min(p.y+H,ball.y)),len=Math.hypot(x-ball.x,y-ball.y)||1;return '<path d="M'+x+' '+y+'L'+(ball.x+(x-ball.x)/len*17)+' '+(ball.y+(y-ball.y)/len*17)+'" fill="none" stroke="'+PLAYER_COLORS[p.id%4]+'" stroke-width="1.5" stroke-dasharray="3 3"/>';}).join('');
 }
 // Camera orientation and HUD text settle together before placing screen-sized labels.
 const schedule=()=>{if(!frame&&!destroyed)frame=requestAnimationFrame(()=>{frame=0;if(!destroyed)draw();});};
 const observer=new ResizeObserver(schedule);
 for(const e of [stage,...stage.querySelectorAll('.joystick-dock,.stage-note,.terrain-readout,.map-tools,.cup-flag,.cup-rim')])observer.observe(e);
 return {update(next={}){sample=next;if(next.animatedId!=null){cancelAnimationFrame(frame);frame=0;draw();}else schedule();},destroy(){destroyed=true;cancelAnimationFrame(frame);observer.disconnect();overlay.remove();}};
}
