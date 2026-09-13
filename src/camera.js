const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function fitCamera(bounds,viewport,padding={}){
 const left=padding.left||0,right=padding.right||0,top=padding.top||0,bottom=padding.bottom||0,w=Math.max(1,viewport.width-left-right),h=Math.max(1,viewport.height-top-bottom),scale=Math.max(bounds.width/w,bounds.height/h);
 return {x:bounds.x+bounds.width/2-(left+w/2)*scale,y:bounds.y+bounds.height/2-(top+h/2)*scale,width:viewport.width*scale,height:viewport.height*scale};
}
export function zoomCamera(view,factor,anchor){const width=view.width/factor,height=view.height/factor;return {x:anchor.x-(anchor.x-view.x)/factor,y:anchor.y-(anchor.y-view.y)/factor,width,height};}
export function constrainCamera(view,home){const width=clamp(view.width,home.width/8,home.width),height=width*home.height/home.width;return {width,height,x:clamp(view.x,home.x,home.x+home.width-width),y:clamp(view.y,home.y,home.y+home.height-height)};}
export function bindMapCamera(svg,{home,focus,mode='full',canInteract=()=>true,onChange=()=>{}}){
 let view,full,gesture=null,lastSize='',destroyed=false;const pointers=new Map(),abort=new AbortController();
 const viewport=()=>{const r=svg.getBoundingClientRect();return {width:r.width,height:r.height};};
 const world=(x,y,v=view)=>{const r=svg.getBoundingClientRect();return {x:v.x+(x-r.left)/r.width*v.width,y:v.y+(y-r.top)/r.height*v.height};};
 function apply(next,manual=false){view=constrainCamera(next,full);svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);onChange({...view},full.width/view.width,manual);}
 function reset(nextMode='full'){mode=nextMode;full=home(viewport());apply(mode==='ball'?focus(viewport()):full);}
 function snapshot(){const p=[...pointers.values()],a=p[0],b=p[1]||a;return {center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y),view:{...view}};}
 function down(e){if(!canInteract()||(e.pointerType==='mouse'&&e.button!==0)||pointers.size>=2)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});svg.setPointerCapture(e.pointerId);gesture=snapshot();}
 function move(e){if(!pointers.has(e.pointerId)||!canInteract())return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const current=snapshot(),factor=pointers.size===2?clamp(current.distance/Math.max(1,gesture.distance),.1,10):1,anchor=world(gesture.center.x,gesture.center.y,gesture.view),scaled=zoomCamera(gesture.view,factor,anchor),r=svg.getBoundingClientRect();scaled.x-=(current.center.x-gesture.center.x)/r.width*scaled.width;scaled.y-=(current.center.y-gesture.center.y)/r.height*scaled.height;apply(scaled,true);}
 function up(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);gesture=pointers.size?snapshot():null;}
 function zoom(factor,point){if(!canInteract())return;apply(zoomCamera(view,factor,point||{x:view.x+view.width/2,y:view.y+view.height/2}),true);}
 for(const [type,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])svg.addEventListener(type,fn,{signal:abort.signal});
 svg.addEventListener('wheel',e=>{if(!canInteract())return;e.preventDefault();zoom(Math.exp(-clamp(e.deltaY,-100,100)*.004),world(e.clientX,e.clientY));},{passive:false,signal:abort.signal});
 svg.addEventListener('keydown',e=>{if(!canInteract())return;if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();else return;if(e.key==='0')reset();else if(e.key==='-'||e.key==='+'||e.key==='=')zoom(e.key==='-'?1/1.3:1.3);else apply({...view,x:view.x+(e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0)*view.width,y:view.y+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0)*view.height},true);},{signal:abort.signal});
 const observer=new ResizeObserver(()=>{const size=viewport(),key=`${size.width}:${size.height}`;if(!destroyed&&key!==lastSize&&size.width&&size.height){lastSize=key;reset(mode);}});observer.observe(svg);reset(mode);
 return {reset,zoom,get view(){return {...view};},get isInteracting(){return pointers.size>0;},destroy(){destroyed=true;observer.disconnect();abort.abort();pointers.clear();}};
}
