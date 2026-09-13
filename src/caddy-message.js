// Scroll only overflowing guidance. Keep one accessible copy of the full message.
export function bindCaddyMessage(button){
 const window=button.querySelector('.caddy-copy-window'),text=button.querySelector('.caddy-copy-text');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
 let animation=null,destroyed=false,hovered=false,focused=false,lastMeasure='';
 function pause(){if(!animation)return;document.hidden||hovered||focused?animation.pause():animation.play();}
 function measure(){
  if(destroyed)return;
  const overflow=Math.max(0,text.scrollWidth-window.clientWidth),key=overflow+':'+reduced.matches;
  if(key===lastMeasure)return;lastMeasure=key;animation?.cancel();animation=null;
  if(overflow<=1||reduced.matches)return;
  const lead=1600,tail=2200,travel=overflow/32*1000,duration=lead+travel+tail;
  animation=text.animate([{transform:'translateX(0)',offset:0},{transform:'translateX(0)',offset:lead/duration},{transform:'translateX(-'+overflow+'px)',offset:(lead+travel)/duration},{transform:'translateX(-'+overflow+'px)',offset:1}],{duration,iterations:Infinity,easing:'linear'});
  pause();
 }
 const observer=new ResizeObserver(measure);observer.observe(window);observer.observe(text);
 const options={signal:abort.signal};
 button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){hovered=true;pause();}},options);
 button.addEventListener('pointerleave',()=>{hovered=false;pause();},options);
 button.addEventListener('focusin',()=>{focused=true;pause();},options);
 button.addEventListener('focusout',()=>{focused=false;pause();},options);
 document.addEventListener('visibilitychange',pause,options);reduced.addEventListener('change',measure,options);
 document.fonts?.ready.then(()=>{if(!destroyed){lastMeasure='';measure();}});measure();
 return ()=>{destroyed=true;observer.disconnect();abort.abort();animation?.cancel();};
}
