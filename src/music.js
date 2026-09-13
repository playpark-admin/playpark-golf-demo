// Original score for Park Player: an unhurried, lightly syncopated walking theme.
// MIDI pitches, beats, and synthetic instruments are authored here; no recordings required.
export const MUSIC={title:'초록빛 라운드',bpm:94,bars:32,beatsPerBar:4};
const chords=[
 {root:50,notes:[62,66,69,73]}, {root:47,notes:[62,66,69,71]},
 {root:43,notes:[59,62,66,69]}, {root:45,notes:[61,64,69,71]},
 {root:50,notes:[62,66,69,74]}, {root:47,notes:[59,62,66,69]},
 {root:43,notes:[59,62,66,69]}, {root:45,notes:[61,64,67,71]},
];
// Two complementary 8-bar phrases. Rests leave room for shot feedback.
const phrases=[
 [[0,69,1],[1.5,66,.5],[2,64,1],[3,66,.65]],
 [[.5,66,.75],[1.5,69,.5],[2.5,71,1]],
 [[0,71,1],[1.5,69,.5],[2,66,.75],[3,62,.65]],
 [[0,64,1.5],[2,61,.5],[3,64,.7]],
 [[0,66,.75],[1,69,.75],[2,74,1.5]],
 [[.5,73,.75],[1.5,71,.5],[2.5,69,1]],
 [[0,66,1],[1.5,64,.5],[2,62,1]],
 [[.5,64,.75],[1.5,61,.5],[2.5,69,.75]],
 [[0,74,1],[1.5,73,.5],[2,69,1]],
 [[.5,71,.75],[1.5,69,.5],[2.5,66,1]],
 [[0,67,.75],[1,66,.75],[2,62,1.5]],
 [[.5,64,1],[2,66,.5],[3,69,.75]],
 [[0,74,1.5],[2,69,.65],[3,66,.65]],
 [[.5,66,.75],[1.5,69,.5],[2.5,71,1]],
 [[0,69,1],[1.5,66,.5],[2.5,62,.9]],
 [[0,64,1],[1.5,61,.5],[2.5,62,.75]],
];
export function musicBar(index,{focus=false}={}){
 const bar=((index%32)+32)%32,chord=chords[bar%8],events=[];
 const add=(voice,beat,note,beats,gain)=>events.push({voice,beat,note,beats,gain});
 const air=bar>=16,phrase=phrases[bar%16];
 // Warm broken chords and a soft, regular bass keep the round moving.
 for(const [i,beat] of [0, .75, 1.5, 2.5, 3.25].entries())add('pluck',beat,chord.notes[[0,2,1,3,2][i]],.9,air?.11:.13);
 add('bass',0,chord.root,1.65,.25);add('bass',2,chord.root+7,1.5,.19);
 for(const [beat,note,beats] of phrase)add(air?'felt':'piano',beat,note,beats,air?.22:.21);
 if(bar%4===0||air)for(const note of chord.notes.slice(0,3))add('pad',.05,note-12,3.85,.032);
 // Brushed ticks and a rounded low pulse, with no sharp cymbals or heavy kick.
 for(let i=0;i<8;i++)add('brush',i*.5+(i%2?.035:0),0,.16,i%2?.021:.013);
 add('pulse',0,38,.2,.075);add('pulse',2,38,.2,.06);
 if(focus)for(const beat of [.5,1.5,2.5,3.5])add('pluck',beat,chord.notes[2],.35,.045);
 return events.sort((a,b)=>a.beat-b.beat);
}
const cache=new WeakMap(),hz=m=>440*2**((m-69)/12);
function sample(ctx,voice,note,seconds){
 let buffers=cache.get(ctx);if(!buffers){buffers=new Map();cache.set(ctx,buffers);}
 const key=voice+':'+note+':'+seconds.toFixed(3);if(buffers.has(key))return buffers.get(key);
 const duration=seconds+(voice==='pad'?.55:.2),buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0),frequency=hz(note);let seed=8137;
 for(let i=0;i<data.length;i++){
  const t=i/ctx.sampleRate,release=Math.min(1,Math.max(0,(duration-t)/.18));let value=0;
  if(voice==='brush'){
   seed=(1664525*seed+1013904223)>>>0;value=(seed/2147483648-1)*Math.sin(Math.min(1,t/.008)*Math.PI/2)*Math.exp(-t*35);
  }else if(voice==='pulse')value=Math.sin(2*Math.PI*(hz(38)*t+6*(1-Math.exp(-t*20))/20))*Math.min(1,t/.016)*Math.exp(-t*20);
  else if(voice==='pad')value=(Math.sin(2*Math.PI*frequency*t)+.18*Math.sin(2*Math.PI*frequency*1.003*t))*.7*Math.min(1,t/.35)*Math.min(1,(duration-t)/.55);
  else{
   const bass=voice==='bass',felt=voice==='felt',pluck=voice==='pluck',attack=bass?.018:pluck?.012:.026,decay=bass?1.1:pluck?3:felt?1.45:1.7;
   const amplitudes=bass?[1,.18,.04]:pluck?[1,.31,.12,.035]:felt?[1,.15,.035]:[1,.24,.07,.025];
   for(let h=1;h<=amplitudes.length;h++)value+=amplitudes[h-1]*Math.sin(2*Math.PI*frequency*h*(1+(h-1)*.0003)*t)*Math.exp(-t*decay*(.7+h*.3));
   value*=Math.min(1,t/attack)*.68;
  }
  data[i]=value*release;
 }
 // The finite score bounds this cache.
 buffers.set(key,buffer);return buffer;
}
export function createMusicMix(ctx,destination){
 const input=ctx.createGain(),tone=ctx.createBiquadFilter(),master=ctx.createGain();tone.type='lowpass';tone.frequency.value=2600;tone.Q.value=.4;master.gain.value=.42;
 input.connect(tone);tone.connect(master);master.connect(destination);return {input,master};
}
export function scheduleMusicBar(ctx,destination,index,at,{focus=false}={}){
 const beat=60/MUSIC.bpm,nodes=[];
 for(const event of musicBar(index,{focus})){
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=sample(ctx,event.voice,event.note,event.beats*beat);gain.gain.value=event.gain;source.connect(gain);gain.connect(destination);
  source.addEventListener('ended',()=>{source.disconnect();gain.disconnect();},{once:true});source.start(at+event.beat*beat);nodes.push(source);
 }
 return nodes;
}
export function createGameMusic(isEnabled){
 let ctx,mix,desired=false,playing=false,focused=false,timer=null,suspendTimer=null,duckTimer=null,bar=0,next=0,ducked=false;
 const active=new Set(),barLength=60/MUSIC.bpm*4;
 function volume(){if(!mix)return;const param=mix.master.gain;param.cancelScheduledValues(ctx.currentTime);param.setTargetAtTime(playing?(ducked?.14:.42):0,ctx.currentTime,.09);}
 function tick(){
  if(!playing||ctx.state!=='running')return;
  if(next<ctx.currentTime-.1)next=ctx.currentTime+.06;
  while(next<ctx.currentTime+.3){for(const source of scheduleMusicBar(ctx,mix.input,bar,next,{focus:focused})){active.add(source);source.addEventListener('ended',()=>active.delete(source),{once:true});}next+=barLength;bar=(bar+1)%MUSIC.bars;}
 }
 function ensure(){if(ctx)return ctx;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return null;ctx=new Audio();mix=createMusicMix(ctx,ctx.destination);mix.master.gain.value=0;return ctx;}
 function start(){
  if(!desired||!isEnabled())return;
  try{
   const c=ensure();if(!c)return;clearTimeout(suspendTimer);
   if(!playing){playing=true;next=c.currentTime+.06;volume();timer=setInterval(tick,120);}
   // Called synchronously from game entry or a user gesture for iOS autoplay rules.
   if(c.state!=='running')c.resume().then(()=>{if(playing)tick();else c.suspend().catch(()=>{});}).catch(()=>{});else tick();
  }catch{stop();}
 }
 function stop(immediate=false){
  if(!playing&&!immediate)return;
  clearInterval(timer);timer=null;clearTimeout(suspendTimer);clearTimeout(duckTimer);ducked=false;
  if(!ctx){playing=false;return;}const wasPlaying=playing;playing=false;volume();
  for(const source of active){try{source.stop(ctx.currentTime+(immediate?0:.25));}catch{}}active.clear();
  if(immediate){mix.master.gain.cancelScheduledValues(ctx.currentTime);mix.master.gain.value=0;ctx.suspend().catch(()=>{});}
  else if(wasPlaying)suspendTimer=setTimeout(()=>{if(!playing)ctx.suspend().catch(()=>{});},280);
 }
 return {
  setActive(value){desired=Boolean(value);desired&&isEnabled()?start():stop();},
  setFocus(value){focused=Boolean(value);},
  refresh(){desired&&isEnabled()?start():stop();},
  unlock(){if(desired&&isEnabled())start();},
  duck(milliseconds=1000){if(!playing)return;ducked=true;volume();clearTimeout(duckTimer);duckTimer=setTimeout(()=>{ducked=false;volume();},milliseconds);},
  hide(){desired=false;stop(true);},
  destroy(){desired=false;stop(true);ctx?.close().catch(()=>{});},
 };
}
