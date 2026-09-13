import {boundaryLoops} from './boundary.js';
import {fitCamera} from './camera.js';
export const landscapeCourse=size=>size.width>size.height*1.2;
export const projectCoursePoint=(point,h,horizontal)=>horizontal?{x:h.height-point.y,y:point.x}:{x:point.x,y:point.y};
export function courseFrameBounds(h,horizontal,extra=[]){
 const points=[...boundaryLoops(h).flat(),...extra].map(p=>projectCoursePoint(p,h,horizontal)),pad=1.5;
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs)-pad,y=Math.min(...ys)-(horizontal?pad:3.5);
 return {x,y,width:Math.max(...xs)-x+(horizontal?3.5:pad),height:Math.max(...ys)-y+pad};
}
// Fill the viewport around the actual course, avoiding HUD rectangles only where
// the cup, flag and balls need to be seen instead of reserving full empty bands.
export function fitCourseFrame(bounds,size,obstacles=[],anchors=[]){
 const margin=6,maxScale=Math.min((size.width-margin*2)/bounds.width,(size.height-margin*2)/bounds.height);
 const clear=(scale,tx,ty)=>anchors.every(p=>{const x=p.x*scale+tx,y=p.y*scale+ty,r=p.radius??17;return x>=r+2&&y>=r+2&&x<=size.width-r-2&&y<=size.height-r-2&&obstacles.every(o=>x+r<=o.left-3||x-r>=o.right+3||y+r<=o.top-3||y-r>=o.bottom+3);});
 for(let step=0;step<65;step++){
  const scale=maxScale*Math.pow(.97,step),minX=margin-bounds.x*scale,maxX=size.width-margin-(bounds.x+bounds.width)*scale,minY=margin-bounds.y*scale,maxY=size.height-margin-(bounds.y+bounds.height)*scale;
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,xs=[cx,minX,maxX],ys=[cy,minY,maxY];
  for(const p of anchors){const r=(p.radius??17)+4;for(const o of obstacles){xs.push(o.left-r-p.x*scale,o.right+r-p.x*scale);ys.push(o.top-r-p.y*scale,o.bottom+r-p.y*scale);}}
  const candidates=(values,min,max,center)=>[...new Set(values.filter(v=>v>=min-1e-6&&v<=max+1e-6))].sort((a,b)=>Math.abs(a-center)-Math.abs(b-center));
  for(const tx of candidates(xs,minX,maxX,cx))for(const ty of candidates(ys,minY,maxY,cy))if(clear(scale,tx,ty))return {x:-tx/scale,y:-ty/scale,width:size.width/scale,height:size.height/scale};
 }
 return fitCamera(bounds,size,{left:20,right:20,top:64,bottom:180});
}
