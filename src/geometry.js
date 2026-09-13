export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return distance(p,{x:a.x+dx*t,y:a.y+dy*t});}
export function inBounds(p,h){const b=h.bounds,inside=p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom;return inside&&(!Number.isFinite(h.roughWidth)||h.fairway.slice(1).some((end,i)=>segmentDistance(p,h.fairway[i],end)<=h.fairwayWidth+h.roughWidth));}

export function boundaryMargin(p,h){const b=h.bounds,plot=Math.min(p.x-b.left,b.right-p.x,p.y-b.top,b.bottom-p.y);return !Number.isFinite(h.roughWidth)?plot:Math.min(plot,h.fairwayWidth+h.roughWidth-Math.min(...h.fairway.slice(1).map((end,i)=>segmentDistance(p,h.fairway[i],end))));}
export function inwardNormal(p,h){const e=.001,x=boundaryMargin({x:p.x+e,y:p.y},h)-boundaryMargin({x:p.x-e,y:p.y},h),y=boundaryMargin({x:p.x,y:p.y+e},h)-boundaryMargin({x:p.x,y:p.y-e},h),d=Math.hypot(x,y);return d?{x:x/d,y:y/d}:{x:0,y:1};}
export function boundaryCrossing(from,to,h){let a={...from},b={...to};const start=inBounds(a,h);for(let i=0;i<22;i++){const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(inBounds(mid,h)===start)a=mid;else b=mid;}return start?a:b;}
export function centerAtProgress(h,t){const y=h.tee.y+(h.cup.y-h.tee.y)*t;for(let i=1;i<h.fairway.length;i++){const a=h.fairway[i-1],b=h.fairway[i];if(y>=Math.min(a.y,b.y)&&y<=Math.max(a.y,b.y)){const f=(y-a.y)/(b.y-a.y||1);return {x:a.x+(b.x-a.x)*f,y};}}return {x:t<0?h.tee.x:h.cup.x,y};}
