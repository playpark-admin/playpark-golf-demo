import {inBounds,inwardNormal} from './geometry.js';
import {boundarySetting} from './course-features.js';

// Trace the same playable predicate used by OB judging, including clipped plot edges.
// Quarter-metre cells retain tight dogleg corners; crossings and results are cached.
const outlines=new WeakMap(),cell=.25;
export function boundaryLoops(h){
 if(outlines.has(h))return outlines.get(h);
 const b=h.bounds,x0=b.left-cell,y0=b.top-cell,nx=Math.ceil((b.right-b.left)/cell)+2,ny=Math.ceil((b.bottom-b.top)/cell)+2;
 const inside=Array.from({length:ny+1},(_,y)=>Array.from({length:nx+1},(_,x)=>inBounds({x:x0+x*cell,y:y0+y*cell},h)));
 const vertices=new Map(),neighbors=new Map();
 function crossing(ax,ay,bx,by){
  const key=ay===by?`h${Math.min(ax,bx)},${ay}`:`v${ax},${Math.min(ay,by)}`;
  if(!vertices.has(key)){
   let lo=0,hi=1;const start=inside[ay][ax];
   for(let i=0;i<18;i++){const t=(lo+hi)/2,p={x:x0+(ax+(bx-ax)*t)*cell,y:y0+(ay+(by-ay)*t)*cell};if(inBounds(p,h)===start)lo=t;else hi=t;}
   const t=(lo+hi)/2;vertices.set(key,{x:x0+(ax+(bx-ax)*t)*cell,y:y0+(ay+(by-ay)*t)*cell});
  }return key;
 }
 function join(a,b){for(const [from,to] of [[a,b],[b,a]]){if(!neighbors.has(from))neighbors.set(from,[]);neighbors.get(from).push(to);}}
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],edges=[];
  for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];if(inside[a[1]][a[0]]!==inside[b[1]][b[0]])edges.push(crossing(...a,...b));}
  if(edges.length===2)join(...edges);
  else if(edges.length===4){const center=inBounds({x:x0+(x+.5)*cell,y:y0+(y+.5)*cell},h);if(center===inside[y][x]){join(edges[0],edges[1]);join(edges[2],edges[3]);}else{join(edges[0],edges[3]);join(edges[1],edges[2]);}}
 }
 const seen=new Set(),loops=[];
 for(const start of neighbors.keys()){
  if(seen.has(start))continue;const loop=[];let previous=null,current=start;
  do{seen.add(current);loop.push(vertices.get(current));const next=neighbors.get(current)?.find(v=>v!==previous);previous=current;current=next;}while(current&&current!==start&&!seen.has(current));
  if(current===start&&loop.length>3){loop.push(loop[0]);const area=Math.abs(loop.slice(1).reduce((sum,p,i)=>sum+loop[i].x*p.y-p.x*loop[i].y,0)/2);if(area>.05)loops.push(loop);}
 }
 outlines.set(h,loops);return loops;
}
export function boundaryStakes(loop,spacing=8){
 const segments=loop.slice(1).map((p,i)=>Math.hypot(p.x-loop[i].x,p.y-loop[i].y)),length=segments.reduce((sum,d)=>sum+d,0),count=Math.max(4,Math.ceil(length/spacing)),stakes=[];
 let segment=0,offset=0;
 for(let i=0;i<count;i++){
  const d=i*length/count;while(segment<segments.length-1&&offset+segments[segment]<d){offset+=segments[segment++];}
  const a=loop[segment],b=loop[segment+1],t=segments[segment]?(d-offset)/segments[segment]:0;stakes.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 }return stakes;
}
const n=value=>Number(value.toFixed(3));
const path=(points,lift=0)=>points.map((p,i)=>`${i?'L':'M'} ${n(p.x)} ${n(p.y-lift)}`).join(' ');
// Split at fine intervals so physical section transitions and visible endpoints agree.
const sectionsCache=new WeakMap();
export function boundarySections(h){
 if(sectionsCache.has(h))return sectionsCache.get(h);
 const parts=[];
 for(const loop of boundaryLoops(h))for(let i=1;i<loop.length;i++){
  const a=loop[i-1],b=loop[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.12));
  for(let j=0;j<steps;j++){const p={x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps},q={x:a.x+(b.x-a.x)*(j+1)/steps,y:a.y+(b.y-a.y)*(j+1)/steps},setting=boundarySetting({x:(p.x+q.x)/2,y:(p.y+q.y)/2},h),last=parts.at(-1);
   if(last&&last.type===setting.type&&last.fence===setting.fence&&Math.hypot(last.points.at(-1).x-p.x,last.points.at(-1).y-p.y)<1e-7)last.points.push(q);else parts.push({...setting,points:[p,q]});
  }
 }
 for(const part of parts){const points=[];for(const p of part.points){if(points.length>1){const a=points.at(-2),b=points.at(-1);if(Math.abs((b.x-a.x)*(p.y-b.y)-(b.y-a.y)*(p.x-b.x))<1e-8)points.pop();}points.push(p);}part.points=points;}
 sectionsCache.set(h,parts);return parts;
}
export function boundaryArt(h,{horizontal=false}={}){
 const sections=boundarySections(h),netId='ob-net-'+h.id.replace(/[^a-zA-Z0-9_-]/g,'-'),lift=2.3;
 const lines=sections.map(s=>'<path class="ob-boundary-line boundary-'+s.type+'" d="'+path(s.points)+'"/>').join('');
 const raised=p=>{const normal=inwardNormal(p,h);return {x:p.x-normal.x*.85-(horizontal?lift:0),y:p.y-normal.y*.85-(horizontal?0:lift)};};
 const fences=sections.filter(s=>s.fence).map(s=>{const top=s.points.map(raised),mesh=path(s.points)+' '+path([...top].reverse()).replace('M','L')+'Z',supports=[s.points[0],s.points.at(-1)].map(p=>'<path class="ob-fence-rail" d="'+path([p,raised(p)])+'"/>').join('');return '<g class="net-section"><path class="ob-fence-shadow" d="'+path(s.points)+'"/><path class="ob-fence-panel" d="'+mesh+'"/><path class="ob-fence-mesh" d="'+mesh+'" fill="url(#'+netId+')"/><path class="ob-fence-rail" d="'+path(top)+'"/>'+supports+'</g>';}).join('');
 const posts=boundaryLoops(h).flatMap(loop=>boundaryStakes(loop,6)).sort((a,b)=>a.y-b.y).map(p=>{const type=boundarySetting(p,h).type;return '<g class="ob-stake stake-'+type+'" transform="'+(horizontal?'rotate(-90 '+n(p.x)+' '+n(p.y)+')':'')+'" data-type="'+type+'" data-x="'+n(p.x)+'" data-y="'+n(p.y)+'"><ellipse cx="'+n(p.x+.55)+'" cy="'+n(p.y+.25)+'" rx="1" ry=".35" fill="#243c3438"/><path class="ob-stake-outline" d="M'+n(p.x)+' '+n(p.y)+'v-2.9"/><path class="ob-stake-body" d="M'+n(p.x)+' '+n(p.y)+'v-2.9"/><path class="ob-stake-cap" d="M'+n(p.x)+' '+n(p.y-2.65)+'v-.25"/></g>';}).join('');
 return '<g class="ob-fence" aria-hidden="true" pointer-events="none"><defs><pattern id="'+netId+'" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><path d="M0 0L1.6 1.6M0 1.6L1.6 0" fill="none" stroke="#244e45" stroke-width=".18"/></pattern></defs>'+fences+lines+posts+'</g>';
}
