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
 const extents=p=>p.clearance||{left:p.radius??17,right:p.radius??17,top:p.radius??17,bottom:p.radius??17};
 const clear=(scale,tx,ty)=>anchors.every(p=>{const x=p.x*scale+tx,y=p.y*scale+ty,e=extents(p),left=x-e.left,right=x+e.right,top=y-e.top,bottom=y+e.bottom,gap=p.clearance?6:3;return left>=3&&top>=3&&right<=size.width-3&&bottom<=size.height-3&&obstacles.every(o=>right<=o.left-gap||left>=o.right+gap||bottom<=o.top-gap||top>=o.bottom+gap);});
 for(let step=0;step<65;step++){
  const scale=maxScale*Math.pow(.97,step),minX=margin-bounds.x*scale,maxX=size.width-margin-(bounds.x+bounds.width)*scale,minY=margin-bounds.y*scale,maxY=size.height-margin-(bounds.y+bounds.height)*scale;
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,xs=[cx,minX,maxX],ys=[cy,minY,maxY];
  for(const p of anchors){const e=extents(p),gap=p.clearance?7:4;xs.push(e.left+3-p.x*scale,size.width-e.right-3-p.x*scale);ys.push(e.top+3-p.y*scale,size.height-e.bottom-3-p.y*scale);for(const o of obstacles){xs.push(o.left-e.right-gap-p.x*scale,o.right+e.left+gap-p.x*scale);ys.push(o.top-e.bottom-gap-p.y*scale,o.bottom+e.top+gap-p.y*scale);}}
  const candidates=(values,min,max,center)=>[...new Set(values.filter(v=>v>=min-1e-6&&v<=max+1e-6))].sort((a,b)=>Math.abs(a-center)-Math.abs(b-center));
  for(const tx of candidates(xs,minX,maxX,cx))for(const ty of candidates(ys,minY,maxY,cy))if(clear(scale,tx,ty))return {x:-tx/scale,y:-ty/scale,width:size.width/scale,height:size.height/scale,fitted:true};
 }
 return fitCamera(bounds,size,{left:20,right:20,top:64,bottom:180});
}

// SVG child matrices can lag a newly rendered 90-degree course by one paint.
// Use the viewBox and explicit orientation for HTML overlays instead.
export function screenCourseProjection(h,view,size,horizontal,offset={x:0,y:0}){
 const scale=Math.min(size.width/view.width,size.height/view.height),left=offset.x+(size.width-view.width*scale)/2,top=offset.y+(size.height-view.height*scale)/2;
 const project=p=>{const q=projectCoursePoint(p,h,horizontal);return {x:left+(q.x-view.x)*scale,y:top+(q.y-view.y)*scale};};
 project.scale=scale;return project;
}
