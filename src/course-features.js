import {distance,boundaryMargin,centerAtProgress} from './geometry.js';
export function boundarySetting(p,h){
 if(!h.boundary)return {type:'white',fence:false};
 const progress=(h.tee.y-p.y)/(h.tee.y-h.cup.y),center=centerAtProgress(h,progress),side=p.x<center.x?'left':'right';
 const type=p.y>=h.tee.y-h.boundary.whiteTeeDepth?'white':'red';
 return {type,fence:(h.boundary.fences||[]).some(f=>f.side===side&&progress>=f.from&&progress<=f.to)};
}
export function addCourseFeatures(h,theme,index){
 const side=(index+theme)%2?'right':'left';
 h.boundary={whiteTeeDepth:8,fences:[{side,from:.28,to:.56}]};
 h.rocks=[];
 if((index+theme)%3===1){
  const r=2.4+(theme%3)*.35;
  for(const progress of [.48,.64,.36])for(const sign of [1,-1]){
   const center=centerAtProgress(h,progress),rock={x:center.x+sign*h.fairwayWidth*.44,y:center.y,r};
   if(boundaryMargin(rock,h)<r+1||distance(rock,h.tee)<r+10||distance(rock,h.cup)<r+10||h.trees.some(t=>distance(rock,t)<r+t.r+1)||[...h.water,...h.sand].some(e=>distance(rock,e)<r+Math.max(e.rx,e.ry)+.5))continue;
   h.rocks.push(rock);return h;
  }
 }
 return h;
}
export function validateFeatures(h){
 if(h.boundary){const {whiteTeeDepth,fences}=h.boundary;if(!Number.isFinite(whiteTeeDepth)||whiteTeeDepth<0||whiteTeeDepth>=h.tee.y-h.cup.y||!Array.isArray(fences))throw Error('경계 구간 오류');for(const f of fences)if(!['left','right'].includes(f.side)||!Number.isFinite(f.from)||!Number.isFinite(f.to)||f.from<0||f.to>1||f.from>=f.to)throw Error('그물망 구간 오류');}
 if(h.rocks!==undefined&&!Array.isArray(h.rocks))throw Error('바위 데이터 오류');
 for(const r of h.rocks||[])if(![r.x,r.y,r.r].every(Number.isFinite)||r.r<=0||r.r>8||boundaryMargin(r,h)<r.r+.3||distance(r,h.tee)<r.r+4||distance(r,h.cup)<r.r+4||h.trees.some(t=>distance(r,t)<r.r+t.r)||h.water.some(e=>((r.x-e.x)/(e.rx+r.r))**2+((r.y-e.y)/(e.ry+r.r))**2<=1))throw Error('바위 위치 또는 크기 오류');
}
