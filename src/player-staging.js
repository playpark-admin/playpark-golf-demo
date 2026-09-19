// Tee art is 6 x 3.6 m. Reserve a waiting area behind its rear edge.
export const PROFILE_WIDTH=68,PROFILE_HEIGHT=62,TEE_GAP=20;
function teeFrame(h,project){
 const next=h.fairway.find(p=>Math.hypot(p.x-h.tee.x,p.y-h.tee.y)>1)||h.cup;
 const dx=next.x-h.tee.x,dy=next.y-h.tee.y,len=Math.hypot(dx,dy)||1,u={x:dx/len,y:dy/len},depth=3*Math.abs(u.x)+1.8*Math.abs(u.y);
 const tee=project(h.tee),front=project({x:h.tee.x+u.x,y:h.tee.y+u.y}),length=Math.hypot(front.x-tee.x,front.y-tee.y)||1;
 return {back:project({x:h.tee.x-u.x*depth,y:h.tee.y-u.y*depth}),direction:{x:(front.x-tee.x)/length,y:(front.y-tee.y)/length}};
}
export function teeScreenGate(h,project){const {back,direction}=teeFrame(h,project);return {direction,limit:back.x*direction.x+back.y*direction.y-TEE_GAP};}
export function behindTee(rect,gate){if(!gate)return true;const d=gate.direction,x=d.x>=0?rect.x+rect.width:rect.x,y=d.y>=0?rect.y+rect.height:rect.y;return x*d.x+y*d.y<=gate.limit+.001;}
export function teeWaitingAnchor(h,count,project,lateral=0){
 const {back,direction:d}=teeFrame(h,project),vertical=Math.abs(d.y)>=Math.abs(d.x),cols=count>2?2:vertical?Math.min(2,count):1,rows=Math.ceil(count/cols);
 const hw=(cols*PROFILE_WIDTH+(cols-1)*2)/2,hh=(rows*PROFILE_HEIGHT+(rows-1)*2)/2,depth=Math.abs(d.x)*hw+Math.abs(d.y)*hh+TEE_GAP+4;
 return {...back,clearance:{left:hw+d.x*depth+d.y*lateral,right:hw-d.x*depth-d.y*lateral,top:hh+d.y*depth-d.x*lateral,bottom:hh-d.y*depth+d.x*lateral}};
}

export function teeWaitingSlots(h,players,project,lateral=0){
 if(!players.length)return new Map();const anchor=teeWaitingAnchor(h,players.length,project,lateral),gate=teeScreenGate(h,project),e=anchor.clearance,slots=[];
 for(let y=anchor.y-e.top;y<anchor.y+e.bottom-1;y+=PROFILE_HEIGHT+2)for(let x=anchor.x-e.left;x<anchor.x+e.right-1;x+=PROFILE_WIDTH+2)slots.push({x:x+PROFILE_WIDTH/2,y:y+PROFILE_HEIGHT/2});
 slots.sort((a,b)=>(b.x-a.x)*gate.direction.x+(b.y-a.y)*gate.direction.y);
 return new Map([...players].sort((a,b)=>Number(b.active)-Number(a.active)||a.id-b.id).map((p,i)=>[p.id,slots[i]]));
}
