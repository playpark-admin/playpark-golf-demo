// Sample position by elapsed simulation time, independent of terrain or total shot length.
export function animationSample(frames,elapsed,{reduced=false,rate=1.65}={}){
 const end=frames.at(-1).t,target=Math.min(end,reduced?Math.min(1,Math.max(0,elapsed)/.18)*end:Math.max(0,elapsed)*rate);
 let low=0,high=frames.length-1;while(low<high){const mid=Math.ceil((low+high)/2);if(frames[mid].t<=target)low=mid;else high=mid-1;}
 const a=frames[low],b=frames[Math.min(low+1,frames.length-1)],mix=b.t>a.t?(target-a.t)/(b.t-a.t):0;
 return {time:target,position:{x:a.x+(b.x-a.x)*mix,y:a.y+(b.y-a.y)*mix},index:low,done:target>=end};
}
