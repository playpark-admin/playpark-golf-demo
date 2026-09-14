import {segmentDistance,centerAtProgress,distance} from './geometry.js';

// Decorative scenery only: never add these objects to a hole's collision data.
const VERGE=1.8,EXTENT=128;
const themes={
 alpine:{ground:'#8fa781',wash:'#769571',leaf:'#4e7960',light:'#7d9b71',kind:'fir'},
 river:{ground:'#a6ba8c',wash:'#93ac7b',leaf:'#73936a',light:'#a6bc7d',kind:'willow'},
 lake:{ground:'#9eb598',wash:'#87a58b',leaf:'#608676',light:'#92b093',kind:'willow'},
 coast:{ground:'#bfca9b',wash:'#adb88c',leaf:'#718666',light:'#9dab78',kind:'fir'},
 fields:{ground:'#b9c68b',wash:'#a8bb78',leaf:'#809653',light:'#acbb79',kind:'shrub'},
 sunset:{ground:'#bbc193',wash:'#a9b185',leaf:'#8b9669',light:'#b1b984',kind:'shrub'},
 blossom:{ground:'#a6bc94',wash:'#91ab81',leaf:'#d0a0b0',light:'#f0cbd5',kind:'blossom'},
 pine:{ground:'#87a38a',wash:'#73947b',leaf:'#4b735d',light:'#7e9d76',kind:'fir'},
 valley:{ground:'#a1ad8b',wash:'#8d9c7b',leaf:'#72866b',light:'#9ba981',kind:'rock'},
 volcanic:{ground:'#afbc90',wash:'#98aa7e',leaf:'#73866a',light:'#a0ad83',kind:'basalt'}
};
const n=value=>Number(value.toFixed(2)),xy=p=>n(p.x)+' '+n(p.y);
function randomFor(key){let seed=2166136261;for(const char of key)seed=Math.imul(seed^char.charCodeAt(0),16777619);return()=>{seed+=0x6D2B79F5;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function sceneryClearance(p,h){return Math.min(...h.fairway.slice(1).map((end,i)=>segmentDistance(p,h.fairway[i],end)))-(h.fairwayWidth+(h.roughWidth??3));}
const smooth=points=>'M'+xy(points[0])+points.slice(1,-1).map((p,i)=>' Q'+xy(p)+' '+xy({x:(p.x+points[i+2].x)/2,y:(p.y+points[i+2].y)/2})).join('')+' T'+xy(points.at(-1));
function sideLine(h,side,offset){const points=h.fairway.slice().sort((a,b)=>a.y-b.y).map(p=>({x:p.x+side*(h.fairwayWidth+(h.roughWidth??3)+offset),y:p.y}));return [{x:points[0].x,y:-EXTENT},...points,{x:points.at(-1).x,y:h.height+EXTENT}];}
function outsideWater(p,h,theme,side){const center=centerAtProgress(h,Math.max(0,Math.min(1,(h.tee.y-p.y)/(h.tee.y-h.cup.y)))),offset=(p.x-center.x)*side-h.fairwayWidth-(h.roughWidth??3);return ['lake','coast','sunset'].includes(theme)?offset>5:theme==='river'?offset>3&&offset<20:false;}
export function sceneryPlan(h,course){
 const theme=Object.hasOwn(themes,course.theme)?course.theme:'alpine',random=randomFor(course.id+':'+h.id),side=random()<.5?-1:1,edge=h.fairwayWidth+(h.roughWidth??3);
 const xs=h.fairway.map(p=>p.x),ys=h.fairway.map(p=>p.y),props=[];
 for(let y=Math.min(...ys)-edge-18;y<Math.max(...ys)+edge+18;y+=9){
  for(let x=Math.min(...xs)-edge-21;x<Math.max(...xs)+edge+21;x+=9){
   const p={x:n(x+(random()-.5)*4),y:n(y+(random()-.5)*4),r:n(2.2+random()*1.5)},choice=random();
   if(choice>.87||sceneryClearance(p,h)<p.r*1.5+VERGE||distance(p,h.cup)<h.greenRadius+p.r*1.5+VERGE||outsideWater(p,h,theme,side))continue;
   let kind=themes[theme].kind;
   if(theme==='alpine'&&choice<.22)kind='birch';
   if(['river','lake','coast','sunset'].includes(theme)&&choice<.4)kind='reeds';
   if(theme==='fields')kind=choice<.38?'shrub':'reeds';
   if(theme==='valley')kind=choice<.35?'rock':choice<.65?'fir':'reeds';
   if(theme==='volcanic')kind=choice<.38?'basalt':choice<.73?'reeds':'shrub';
   if(theme==='pine'&&choice<.18)kind='rock';
   if(theme==='blossom'&&choice<.25)kind='flowers';
   props.push({...p,kind,order:random()});
  }
 }
 // A bounded, evenly scattered set keeps both short holes and long doglegs light.
 return {theme,side,props:props.sort((a,b)=>a.order-b.order).slice(0,64).sort((a,b)=>a.y-b.y)};
}
function propArt(p,t){
 const colors=p.kind==='birch'?['#bdcba6','#e1e3c4']:p.kind==='shrub'?['#859970','#b0bd87']:[t.leaf,t.light];
 let art='';
 if(['rock','basalt'].includes(p.kind)){
  const dark=p.kind==='basalt'?'#737e76':'#989e8b',light=p.kind==='basalt'?'#9aa499':'#bcc2a8';
  art='<path d="M-1 .3-.6-.65.3-.9 1-.3.85.65-.2.85Z" fill="'+dark+'"/><path d="m-.6-.65.9-.25.45.6-.85.25Z" fill="'+light+'"/><path d="m-.2.05.15.8M.7-.3.2.45" stroke="#526d5f" opacity=".3" stroke-width=".08"/>';
 }else if(p.kind==='reeds'){
  art='<path d="M-.9.7-.6-.5M-.4.8-.15-.85M.1.9.3-.55M.5.7.85-.2" fill="none" stroke="#89966b" stroke-width=".14" stroke-linecap="round"/><path d="m-.6-.5.12-.45M-.15-.85.14-.4M.3-.55.1-.4M.85-.2.17-.45" stroke="#e3d6ac" stroke-width=".28" stroke-linecap="round"/>';
 }else if(p.kind==='flowers'){
  art='<ellipse rx="1.1" ry=".65" fill="#8ba47b"/><path d="M-.7-.1h.01M-.2.2h.01M.35-.15h.01M.8.25h.01" stroke="#edc1cb" stroke-width=".45" stroke-linecap="round"/><path d="M-.4-.35h.01M.2.45h.01" stroke="#f5e2be" stroke-width=".3" stroke-linecap="round"/>';
 }else{
  const crown=p.kind==='fir'?'M0-1.13.25-.75.7-.87.7-.38 1.1-.1.78.25.9.7.35.74 0 1.02-.32.74-.83.77-.79.26-1.08-.1-.7-.35-.7-.88-.23-.75Z':'M-1-.1Q-1.12-.7-.56-.77-.17-1.25.27-.91.88-1 1-.4 1.29.18.76.53.53 1.07-.04.87-.74 1.05-.87.44-1.19.27-1-.1Z';
  art='<ellipse cx=".24" cy=".32" rx="1.04" ry=".86" fill="#425f52" opacity=".16"/><path d="'+crown+'" fill="'+colors[0]+'"/><path d="'+crown+'" transform="translate(-.18 -.23) scale(.65)" fill="'+colors[1]+'"/>';
  if(p.kind==='blossom')art+='<path d="M-.48-.3h.01M.2-.57h.01M.4.18h.01M-.2.4h.01" stroke="#fae0e0" stroke-width=".2" stroke-linecap="round"/>';
 }
 return '<g data-scenery-prop="'+p.kind+'" transform="translate('+p.x+' '+p.y+') scale('+p.r+')">'+art+'</g>';
}
function landforms(h,plan,t){
 const {theme,side}=plan,edge=h.fairwayWidth+(h.roughWidth??3);let art='';
 if(['alpine','pine','valley','volcanic'].includes(theme)){
  for(const [i,progress] of [.08,.5,.92].entries()){
   const c=centerAtProgress(h,progress),sign=i%2?-side:side,x=n(c.x+sign*(edge+13)),y=n(c.y),rx=theme==='volcanic'?17:23,ry=19;
   art+='<g transform="translate('+x+' '+y+')"><ellipse rx="'+rx+'" ry="'+ry+'" fill="'+t.wash+'"/><ellipse cx="-2" cy="-2" rx="'+(rx-4)+'" ry="'+(ry-4)+'" fill="'+t.ground+'"/><ellipse cx="-3" cy="-3" rx="'+(rx-8)+'" ry="'+(ry-8)+'" fill="'+t.light+'" opacity=".3"/><ellipse cx="-3" cy="-3" rx="'+(rx-5)+'" ry="'+(ry-5)+'" fill="none" stroke="#d6dfb8" opacity=".3" stroke-width=".35"/>'+(theme==='volcanic'?'<ellipse cx="-3" cy="-3" rx="6" ry="4.2" fill="#879b72"/><ellipse cx="-2" cy="-2" rx="4" ry="2.5" fill="#a3b386"/>':'')+'</g>';
  }
 }
 return art;
}
function waterArt(h,plan){
 const {theme,side}=plan;
 if(!['river','lake','coast','sunset','valley','blossom'].includes(theme))return '';
 const line=smooth(sideLine(h,side,theme==='river'?12:theme==='valley'?15:theme==='blossom'?19:9)),sea=['coast','sunset'].includes(theme),stream=['river','valley','blossom'].includes(theme),color=theme==='sunset'?'#93bac4':theme==='lake'?'#8eb7ca':'#89c0c6';
 if(stream){const width=theme==='river'?13:4;return '<g data-scenery-feature="'+(theme==='river'?'river':'stream')+'" fill="none" stroke-linecap="round"><path d="'+line+'" stroke="#c5c6a0" stroke-width="'+(width+2.2)+'"/><path d="'+line+'" stroke="'+color+'" stroke-width="'+width+'"/><path d="'+line+'" stroke="#d5e8df" stroke-width=".32" stroke-dasharray="4 7"/></g>';}
 const outer=side<0?-EXTENT:h.width+EXTENT,area=line+' L'+outer+' '+(h.height+EXTENT)+' V'+(-EXTENT)+'Z';
 return '<g data-scenery-feature="'+(sea?'seashore':'lakeshore')+'"><path d="'+line+'" fill="none" stroke="'+(sea?'#e4d3a5':'#bbc9aa')+'" stroke-width="'+(sea?11:5)+'"/><path d="'+area+'" fill="'+color+'"/><path d="'+line+'" fill="none" stroke="#e1ece0" stroke-width="'+(sea?1.1:.6)+'" opacity=".75"/><path d="'+smooth(sideLine(h,side,12))+'" fill="none" stroke="#dcebdd" opacity=".6" stroke-width=".45" stroke-dasharray="7 5"/>'+ (theme==='sunset'?'<path d="'+smooth(sideLine(h,side,17))+'" fill="none" stroke="#efdcb6" opacity=".55" stroke-width="2" stroke-dasharray="1 3"/>':'')+'</g>';
}
function islandsArt(h,plan){
 if(plan.theme!=='sunset')return '';
 return [.18,.68].map((progress,i)=>{const p=centerAtProgress(h,progress),x=n(p.x+plan.side*(h.fairwayWidth+(h.roughWidth??3)+22+i*5)),y=n(p.y);
 return '<g data-scenery-feature="coastal-island" transform="translate('+x+' '+y+') rotate('+(i?24:-18)+')"><ellipse rx="7" ry="11" fill="#c6d0b0"/><ellipse cy="-.5" rx="5.8" ry="9.5" fill="#99ae8a"/><ellipse cx="-1" cy="-2" rx="3.7" ry="6.2" fill="#b9c29a"/><path d="M-3 0Q-1-6 1-6" stroke="#d8dbb7" fill="none" stroke-width=".4"/></g>';
 }).join('');
}
function fieldsArt(h,pattern){
 let art='<g data-scenery-feature="rice-fields">';
 for(let y=-30,row=0;y<h.height+40;y+=25,row++)for(let x=-30,col=0;x<h.width+40;x+=21,col++)art+='<rect x="'+x+'" y="'+y+'" width="19.5" height="23.5" rx="1" fill="'+(['#c9cf8b','#aabd80','#d3ce93'][(col+row)%3])+'" stroke="#8fa371" stroke-width=".45"/><rect x="'+x+'" y="'+y+'" width="19.5" height="23.5" rx="1" fill="url(#'+pattern+')"/>';
 return art+'</g>';
}
// Unique prefixes allow many course cards and the live map to coexist in one DOM.
export function courseScenery(h,course,prefix='scenery'){
 const plan=sceneryPlan(h,course),t=themes[plan.theme],id=prefix+'-'+h.id.replace(/[^a-zA-Z0-9_-]/g,'-'),poly=h.fairway.map(p=>p.x+','+p.y).join(' '),edge=h.fairwayWidth+(h.roughWidth??3),rect='x="-'+EXTENT+'" y="-'+EXTENT+'" width="'+(h.width+EXTENT*2)+'" height="'+(h.height+EXTENT*2)+'"';
 const path=smooth(sideLine(h,-plan.side,6)),trail=plan.theme==='volcanic'?'#7d8978':plan.theme==='blossom'?'#e1d4bd':'#c9cfb0';
 return '<g class="course-scenery" data-theme="'+plan.theme+'" aria-hidden="true" pointer-events="none"><defs><mask id="'+id+'-outside" maskUnits="userSpaceOnUse" '+rect+' style="mask-type:luminance"><rect '+rect+' fill="white"/><polyline points="'+poly+'" fill="none" stroke="black" stroke-width="'+((edge+VERGE)*2)+'" stroke-linecap="round" stroke-linejoin="round"/><circle cx="'+h.cup.x+'" cy="'+h.cup.y+'" r="'+(h.greenRadius+VERGE)+'" fill="black"/></mask><pattern id="'+id+'-texture" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M1 2h.6m2 2h.6" stroke="#49694d" stroke-width=".25" opacity=".15"/></pattern>'+(plan.theme==='fields'?'<pattern id="'+id+'-crops" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 1h3" stroke="#80945e" stroke-width=".35" opacity=".45"/></pattern>':'')+'</defs><g mask="url(#'+id+'-outside)"><rect '+rect+' fill="'+t.ground+'"/><rect '+rect+' fill="url(#'+id+'-texture)"/>'+landforms(h,plan,t)+(plan.theme==='fields'?fieldsArt(h,id+'-crops'):'')+'<path data-scenery-feature="'+(plan.theme==='volcanic'?'stone-wall':'walking-path')+'" d="'+path+'" fill="none" stroke="'+trail+'" stroke-width="'+(plan.theme==='volcanic'?1.6:2.4)+'" stroke-linecap="round" '+(plan.theme==='volcanic'?'stroke-dasharray="1.2 .3"':'')+'/>'+waterArt(h,plan)+islandsArt(h,plan)+plan.props.map(p=>propArt(p,t)).join('')+'</g></g>';
}
