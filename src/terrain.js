// Metres of elevation. One continuous surface drives both physics and the slope grid.
export function terrainAt(p,h){
  const t=h.terrain;if(!t)return {height:0,dx:0,dy:0};
  let height=(t.grade?.x||0)*(p.x-h.tee.x)+(t.grade?.y||0)*(p.y-h.tee.y),dx=t.grade?.x||0,dy=t.grade?.y||0;
  for(const f of t.features||[]){const x=p.x-f.x,y=p.y-f.y,z=f.height*Math.exp(-.5*((x/f.rx)**2+(y/f.ry)**2));height+=z;dx-=z*x/(f.rx*f.rx);dy-=z*y/(f.ry*f.ry);}
  return {height,dx,dy};
}
export function slopeAcceleration(p,h){
  const {dx,dy}=terrainAt(p,h),factor=(5/7)*9.81/(1+dx*dx+dy*dy);
  return {x:-factor*dx,y:-factor*dy};
}
export function slopeHint(p,h,angle){
  const {dx,dy}=terrainAt(p,h),along=dx*Math.cos(angle)+dy*Math.sin(angle),across=-dx*Math.sin(angle)+dy*Math.cos(angle);
  if(Math.abs(across)>Math.max(.025,Math.abs(along)*1.4))return `${across>0?'왼쪽':'오른쪽'}으로 흐르는 경사예요. 조준을 살짝 바꿔요.`;
  return along>.018?'오르막이에요. 힘을 조금 더 주세요.':along<-.018?'내리막이에요. 힘을 조금 줄여 주세요.':'완만한 곳이에요. 홀컵을 향해 부드럽게 쳐요.';
}
export function validateTerrain(t){
  if(t===undefined)return;
  if(!t||!t.grade||![t.grade.x,t.grade.y].every(Number.isFinite)||Math.hypot(t.grade.x,t.grade.y)>.2||!Array.isArray(t.features)||t.features.length>8)throw Error('경사 데이터 오류');
  let steepness=Math.hypot(t.grade.x,t.grade.y);
  for(const f of t.features){if(![f.x,f.y,f.rx,f.ry,f.height].every(Number.isFinite)||f.rx<3||f.ry<3||Math.abs(f.height)>8)throw Error('언듈레이션 규격 오류');steepness+=Math.abs(f.height)/(Math.min(f.rx,f.ry)*Math.sqrt(Math.E));}
  // All supported surfaces stop reliably under rolling friction.
  if(steepness>.4)throw Error('경사가 너무 가파릅니다.');
}

// The grid stays in map coordinates: shading and flow use the same surface as the ball.
export function terrainArt(h){
  if(!h.terrain)return '';
  const step=2,nx=Math.ceil(h.width/step),ny=Math.ceil(h.height/step),grid=[];
  const corridor=h.fairwayWidth+(h.roughWidth??0);
  const inside=p=>h.fairway.slice(1).some((b,i)=>{
    const a=h.fairway[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<=corridor;
  });
  let low=Infinity,high=-Infinity;
  for(let y=0;y<=ny;y++){grid[y]=[];for(let x=0;x<=nx;x++){
    const p={x:x*step,y:y*step},z=terrainAt(p,h).height;grid[y][x]=z;
    if(inside(p)){low=Math.min(low,z);high=Math.max(high,z);}
  }}
  // Merge equal shade bands to keep the SVG light on mobile devices.
  const shades=Array(16).fill('');
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const z=(grid[y][x]+grid[y][x+1]+grid[y+1][x]+grid[y+1][x+1])/4;
    const band=Math.max(0,Math.min(15,Math.round((z-low)/(high-low||1)*15)));
    shades[band]+='M'+x*step+' '+y*step+'h2.02v2.02h-2.02Z';
  }
  const shade=shades.map((d,i)=>d?'<path d="'+d+'" fill="hsl(82 48% '+(34+i*3.2)+'%)"/>':'').join('');
  const paths=['',''];
  // Six-metre cells, with stronger twelve-metre lines, remain readable at full view.
  for(let x=0;x<=h.width;x+=6)paths[x%12===0?1:0]+='M'+x+' 0V'+h.height;
  for(let y=0;y<=h.height;y+=6)paths[y%12===0?1:0]+='M0 '+y+'H'+h.width;
  const mesh=paths.map((d,i)=>'<g class="terrain-grid '+(i?'terrain-grid-major':'terrain-grid-minor')+'"><path class="terrain-grid-edge" d="'+d+'"/><path class="terrain-grid-line" d="'+d+'"/></g>').join('');
  const flows=[];
  for(let y=6;y<h.height;y+=12)for(let x=6;x<h.width;x+=12){
    if(!inside({x,y}))continue;
    const s=terrainAt({x,y},h),grade=Math.hypot(s.dx,s.dy);if(grade<.012)continue;
    const dx=-s.dx/grade*2.4,dy=-s.dy/grade*2.4;
    const d='M'+(-dx).toFixed(2)+' '+(-dy).toFixed(2)+'L'+dx.toFixed(2)+' '+dy.toFixed(2);
    const duration=Math.max(1.2,4.4-grade*24).toFixed(2),delay=-((x*7+y*13)%31)/10;
    flows.push('<g class="terrain-flow" transform="translate('+x+' '+y+')" style="--flow-x:'+dx.toFixed(3)+'px;--flow-y:'+dy.toFixed(3)+'px;--flow-duration:'+duration+'s;--flow-delay:'+delay+'s"><path class="terrain-flow-track" d="'+d+'"/><circle class="terrain-flow-dot" r=".35"/></g>');
  }
  const poly=h.fairway.map(p=>p.x+','+p.y).join(' ');
  return '<defs><mask id="terrain-clip"><polyline points="'+poly+'" fill="none" stroke="white" stroke-width="'+corridor*2+'" stroke-linecap="round" stroke-linejoin="round"/></mask></defs><g class="terrain-overlay" mask="url(#terrain-clip)" pointer-events="none" aria-hidden="true"><g opacity=".52">'+shade+'</g>'+mesh+flows.join('')+'</g>';
}
