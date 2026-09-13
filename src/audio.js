const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const tone=(frequency,end,duration,gain,at=0,type='sine')=>({type,frequency,end,duration,gain,at});
const noise=(frequency,duration,gain,at=0)=>({type:'noise',frequency,duration,gain,at});
export function soundPlan(kind,{power=40,lie='fairway'}={}){
 const strength=clamp(Number.isFinite(power)?power:0,0,100)/100,volume=.22+.78*Math.sqrt(strength);
 const bell=(f,t,g=.16)=>[tone(f,f,.5,g,t),tone(f*2.76,f*2.76,.22,g*.19,t)];
 if(kind==='aim')return [tone(650+strength*450,400+strength*200,.055,.045),noise(2600,.026,.024)];
 if(kind==='ready')return [tone(680,500,.07,.05),tone(980,800,.09,.04,.07)];
 if(kind==='cancel')return [tone(360,220,.12,.04)];
 if(kind==='hit')return [noise(lie==='sand'?1400:3000,.045+strength*.05,.42*volume),tone(420+strength*300,180,.12,.3*volume,0,'triangle'),tone(1450,800,.047,.12*volume),...(strength>.45?[noise(650,.11,.08*volume,.015)]:[])];
 if(kind==='cup')return [tone(1300,650,.06,.12),...bell(523.25,.07),...bell(659.25,.18),...bell(783.99,.29),...bell(1046.5,.43,.2)];
 if(kind==='complete')return [523.25,659.25,783.99,1046.5,1318.5].flatMap((f,i)=>bell(f,i*.12,.16));
 if(kind==='ob')return [tone(440,350,.2,.13,0,'triangle'),tone(349,275,.22,.12,.16,'triangle'),tone(261,165,.35,.12,.33,'triangle')];
 if(kind==='cup-miss')return [...bell(1174,.0,.09),tone(580,270,.38,.1,.15,'triangle')];
 if(kind==='water')return [noise(1300,.3,.22),noise(500,.38,.14,.1),tone(320,120,.22,.11,.05),tone(240,90,.22,.09,.22)];
 if(kind==='sand')return [noise(900,.25,.15),tone(290,165,.16,.07),tone(392,294,.19,.07,.17,'triangle')];
 if(kind==='fence')return [noise(600,.17,.18*volume),tone(145,65,.2,.18*volume,0,'triangle')];
 if(kind==='rock')return [noise(3500,.035,.3*volume),tone(1050,280,.13,.23*volume,0,'triangle'),tone(1750,700,.08,.08*volume)];
 if(kind==='tree')return [noise(2300,.04,.22),tone(750,320,.09,.18,0,'triangle'),tone(480,260,.12,.1,.105,'triangle')];
 return [];
}
const noiseBuffers=new WeakMap();
function getNoise(ctx){if(noiseBuffers.has(ctx))return noiseBuffers.get(ctx);const b=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),a=b.getChannelData(0);let seed=481;for(let i=0;i<a.length;i++){seed=(1664525*seed+1013904223)>>>0;a[i]=(seed/4294967296)*2-1;}noiseBuffers.set(ctx,b);return b;}
export function scheduleSound(ctx,destination,kind,options={},at=ctx.currentTime){
 const nodes=[];for(const e of soundPlan(kind,options)){
  const start=at+(e.at||0),source=e.type==='noise'?ctx.createBufferSource():ctx.createOscillator(),gain=ctx.createGain();
  if(e.type==='noise'){source.buffer=getNoise(ctx);const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=e.frequency;filter.Q.value=.65;source.connect(filter);filter.connect(gain);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
  else{source.type=e.type;source.frequency.setValueAtTime(e.frequency,start);source.frequency.exponentialRampToValueAtTime(Math.max(20,e.end),start+e.duration);source.connect(gain);source.onended=()=>{source.disconnect();gain.disconnect();};}
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(e.gain,start+.003);gain.gain.exponentialRampToValueAtTime(.0001,start+e.duration);gain.gain.setValueAtTime(0,start+e.duration+.005);gain.connect(destination);source.start(start);source.stop(start+e.duration+.012);nodes.push(source);
 }return nodes;
}
export function createGameAudio(isEnabled){
 let ctx,master,lastAim=-Infinity,lastBucket=-1;const active=new Set();
 function ensure(){if(!isEnabled())return null;if(!ctx){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return null;ctx=new Audio();master=ctx.createGain();master.gain.value=.65;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=6;master.connect(compressor);compressor.connect(ctx.destination);}return ctx;}
 function unlock(){try{const c=ensure();if(c&&c.state==='suspended')c.resume().catch(()=>{});}catch{}}
 function stop(){for(const source of active){try{source.stop();}catch{}}active.clear();lastBucket=-1;}
 function play(kind,options){if(!isEnabled())return;try{const c=ensure();if(!c)return;unlock();for(const source of scheduleSound(c,master,kind,options)){active.add(source);source.addEventListener('ended',()=>active.delete(source),{once:true});}}catch{}}
 return {unlock,play,stop,aim(power){const bucket=Math.floor(power/8),now=performance.now();if(bucket!==lastBucket&&now-lastAim>=130){lastBucket=bucket;lastAim=now;play('aim',{power});}},resetAim(){lastBucket=-1;lastAim=-Infinity;},mute(){stop();if(ctx)master.gain.setTargetAtTime(isEnabled()?.65:0,ctx.currentTime,.01);},pause(){stop();ctx?.suspend().catch(()=>{});}};
}
