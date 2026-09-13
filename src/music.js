import {MUSIC,musicTheme,musicForCourse} from './music-scores.js';
export {MUSIC,MUSIC_THEMES,musicTheme,musicForCourse} from './music-scores.js';
export function musicBar(index,{focus=false,theme=MUSIC.id,variation=0}={}){
 const score=musicTheme(theme),variant=((Math.trunc(variation)||0)%4+4)%4;
 const bar=((index+variant*8)%score.bars+score.bars)%score.bars,chord=score.chords[bar%8],events=[];
 const add=(voice,beat,note,beats,gain)=>events.push({voice,beat,note,beats,gain});
 const air=bar>=16,meter=score.beatsPerBar,phrase=score.phrases[bar%16];
 const order=variant%2?[2,0,3,1,2]:[0,2,1,3,2];
 for(const [i,beat] of score.pattern.entries())add(score.backing,beat,chord.notes[order[i]],.85,air?.1:.12);
 add('bass',0,chord.root,meter===3?1.3:1.65,.23);
 add('bass',meter===3?2:2.5,chord.root+7,meter===3?.7:1.2,.16);
 for(const [beat,note,beats] of phrase)add(air?score.alternate:score.lead,beat,note,beats,.21);
 if(bar%4===0||air||theme==='water'||theme==='highland')for(const note of chord.notes.slice(0,3))add('pad',.05,note-12,meter-.15,.028);
 for(let i=0;i<meter*2;i++)add('brush',i*.5+(i%2?.035:0),0,.16,i%2?.019:.011);
 add('pulse',0,38,.2,.065);if(meter===4)add('pulse',2,38,.2,.05);
 if(focus)for(let beat=.5;beat<meter;beat++)add(score.backing,beat,chord.notes[2],.35,.04);
 return events.sort((a,b)=>a.beat-b.beat);
}
const cache=new WeakMap(),hz=m=>440*2**((m-69)/12);
function sample(ctx,voice,note,seconds){
 let buffers=cache.get(ctx);if(!buffers){buffers=new Map();cache.set(ctx,buffers);}
 const key=voice+':'+note+':'+seconds.toFixed(3);if(buffers.has(key)){const hit=buffers.get(key);buffers.delete(key);buffers.set(key,hit);return hit;}
 const duration=seconds+(voice==='pad'?.55:.2),buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0),frequency=hz(note);let seed=8137;
 for(let i=0;i<data.length;i++){
  const t=i/ctx.sampleRate,release=Math.min(1,Math.max(0,(duration-t)/.18));let value=0;
  if(voice==='brush'){
   seed=(1664525*seed+1013904223)>>>0;value=(seed/2147483648-1)*Math.sin(Math.min(1,t/.008)*Math.PI/2)*Math.exp(-t*35);
  }else if(voice==='pulse')value=Math.sin(2*Math.PI*(hz(38)*t+6*(1-Math.exp(-t*20))/20))*Math.min(1,t/.016)*Math.exp(-t*20);
  else if(voice==='flute')value=(Math.sin(2*Math.PI*frequency*t+.009*Math.sin(2*Math.PI*4*t))+.09*Math.sin(4*Math.PI*frequency*t))*.72*Math.min(1,t/.07)*Math.exp(-t*.5);
  else if(voice==='marimba')value=(Math.sin(2*Math.PI*frequency*t)*Math.exp(-t*2.3)+.22*Math.sin(2*Math.PI*frequency*3.99*t)*Math.exp(-t*8))*.72*Math.min(1,t/.016);
  else if(voice==='pad')value=(Math.sin(2*Math.PI*frequency*t)+.18*Math.sin(2*Math.PI*frequency*1.003*t))*.7*Math.min(1,t/.35)*Math.min(1,(duration-t)/.55);
  else{
   const bass=voice==='bass',felt=voice==='felt',pluck=voice==='pluck',guitar=voice==='guitar',attack=bass?.018:pluck?.012:guitar?.02:.026,decay=bass?1.1:pluck?3:guitar?2.15:felt?1.45:1.7;
   const amplitudes=guitar?[1,.36,.14,.06,.018]:bass?[1,.18,.04]:pluck?[1,.31,.12,.035]:felt?[1,.15,.035]:[1,.24,.07,.025];
   for(let h=1;h<=amplitudes.length;h++)value+=amplitudes[h-1]*Math.sin(2*Math.PI*frequency*h*(1+(h-1)*.0003)*t)*Math.exp(-t*decay*(.7+h*.3));
   value*=Math.min(1,t/attack)*.68;
  }
  data[i]=value*release;
 }
 // Bound memory when visiting many scores on a phone; evicted buffers can be regenerated.
 buffers.set(key,buffer);if(buffers.size>128)buffers.delete(buffers.keys().next().value);return buffer;
}
export function createMusicMix(ctx,destination){
 const input=ctx.createGain(),tone=ctx.createBiquadFilter(),master=ctx.createGain();tone.type='lowpass';tone.frequency.value=2600;tone.Q.value=.4;master.gain.value=.42;
 input.connect(tone);tone.connect(master);master.connect(destination);return {input,master};
}
export function scheduleMusicBar(ctx,destination,index,at,options={}){
 const beat=60/musicTheme(options.theme).bpm,nodes=[];
 for(const event of musicBar(index,options)){
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=sample(ctx,event.voice,event.note,event.beats*beat);gain.gain.value=event.gain;source.connect(gain);gain.connect(destination);
  source.addEventListener('ended',()=>{source.disconnect();gain.disconnect();},{once:true});source.start(at+event.beat*beat);nodes.push(source);
 }
 return nodes;
}
// One context/clock. Per-course buses fade independently, so a pending old bar cannot
// leak into the new course or restart after mute, pause, or backgrounding.
export function createGameMusic(isEnabled){
 let ctx,mix,desired=false,playing=false,focused=false,timer=null,suspendTimer=null,duckTimer=null;
 let bar=0,next=0,ducked=false,part=null,profile=musicForCourse(null),courseKey='';
 const retired=new Set();
 function volume(){if(!mix)return;const param=mix.master.gain;param.cancelScheduledValues(ctx.currentTime);param.setTargetAtTime(playing?(ducked?.14:.42):0,ctx.currentTime,.09);}
 function fade(bus,target,seconds){
  const p=bus.gain,t=ctx.currentTime;
  if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);}
  p.linearRampToValueAtTime(target,t+seconds);
 }
 function cleanPart(old){if(old&&retired.has(old)&&!old.sources.size){old.bus.disconnect();retired.delete(old);}}
 function retire(old,immediate=false){
  if(!old)return;retired.add(old);fade(old.bus,0,immediate?.005:.22);
  for(const source of old.sources){try{source.stop(ctx.currentTime+(immediate?0:.24));}catch{}}
  cleanPart(old);
 }
 function newPart(){const bus=ctx.createGain();bus.gain.value=0;bus.connect(mix.input);fade(bus,1,.45);return {bus,sources:new Set()};}
 function tick(){
  if(!playing||!part||ctx.state!=='running')return;
  if(next<ctx.currentTime-.1)next=ctx.currentTime+.06;
  const score=musicTheme(profile.theme);
  while(next<ctx.currentTime+.3){
   const current=part;
   for(const source of scheduleMusicBar(ctx,current.bus,bar,next,{...profile,focus:focused})){
    current.sources.add(source);source.addEventListener('ended',()=>{current.sources.delete(source);cleanPart(current);},{once:true});
   }
   next+=60/score.bpm*score.beatsPerBar;bar=(bar+1)%score.bars;
  }
 }
 function ensure(){if(ctx)return ctx;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return null;ctx=new Audio();mix=createMusicMix(ctx,ctx.destination);mix.master.gain.value=0;return ctx;}
 function start(){
  if(!desired||!isEnabled())return;
  try{
   const c=ensure();if(!c)return;clearTimeout(suspendTimer);
   if(!playing){playing=true;part=newPart();next=c.currentTime+.06;volume();timer=setInterval(tick,120);}
   // Synchronous resume from game entry / user gesture supports mobile autoplay rules.
   if(c.state!=='running')c.resume().then(()=>{if(playing)tick();else c.suspend().catch(()=>{});}).catch(()=>{});else tick();
  }catch{stop();}
 }
 function stop(immediate=false){
  if(!playing&&!immediate)return;
  clearInterval(timer);timer=null;clearTimeout(suspendTimer);clearTimeout(duckTimer);ducked=false;
  if(!ctx){playing=false;return;}const wasPlaying=playing;playing=false;volume();
  retire(part,immediate);part=null;
  if(immediate){
   for(const old of [...retired])retire(old,true);
   mix.master.gain.cancelScheduledValues(ctx.currentTime);mix.master.gain.value=0;ctx.suspend().catch(()=>{});
  }else if(wasPlaying)suspendTimer=setTimeout(()=>{if(!playing)ctx.suspend().catch(()=>{});},280);
 }
 return {
  setCourse(course){
   const selected=musicForCourse(course),key=(course?.id||'')+':'+selected.theme+':'+selected.variation;
   if(key===courseKey)return;courseKey=key;profile=selected;bar=0;
   if(playing){retire(part);part=newPart();next=ctx.currentTime+.06;tick();}
  },
  setActive(value){desired=Boolean(value);desired&&isEnabled()?start():stop();},
  setFocus(value){focused=Boolean(value);},
  refresh(){desired&&isEnabled()?start():stop();},
  unlock(){if(desired&&isEnabled())start();},
  duck(milliseconds=1000){if(!playing)return;ducked=true;volume();clearTimeout(duckTimer);duckTimer=setTimeout(()=>{ducked=false;volume();},milliseconds);},
  hide(){desired=false;stop(true);},
  destroy(){desired=false;stop(true);ctx?.close().catch(()=>{});},
 };
}
