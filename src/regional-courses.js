import {venues,difficultyNames} from './venues.js';
import {addCourseFeatures} from './course-features.js';
import {boundaryMargin,centerAtProgress,distance} from './geometry.js';
const pars=[3,4,3,4,5,3,4,3,4];
const widths=[0,15,13,11.5,10,8.8];
function addRock(h,progress,sign,r){
 const p=centerAtProgress(h,progress),rock={x:p.x+sign*h.fairwayWidth*.55,y:p.y,r};
 if(boundaryMargin(rock,h)<r+1||distance(rock,h.tee)<r+10||distance(rock,h.cup)<r+10||h.trees.some(t=>distance(rock,t)<r+t.r+1)||[...h.water,...h.sand].some(e=>distance(rock,e)<r+Math.max(e.rx,e.ry)+1)||h.rocks.some(t=>distance(rock,t)<r+t.r+2))return;
 h.rocks.push(rock);
}
function makeHole(v,s,ci,i,vi){
 const level=s.level,seed=vi*11+ci*7+i,side=seed%2?1:-1,par=pars[i];
 const length=({3:32,4:56,5:93}[par])+level*4+(seed%5)*3;
 const tee={x:54+side*3,y:length+28};
 const amplitude=v.bend*(.5+level*.14),phase=(i+ci)%4;
 const cup={x:54+amplitude*v.shape[(phase+3)%4]+(ci%3-1)*2,y:28};
 const low={x:54+amplitude*v.shape[(phase+1)%4]+side*(ci%3+1),y:tee.y-length*.33};
 const high={x:54+amplitude*v.shape[(phase+2)%4]-side*(ci%2+1),y:tee.y-length*.67};
 const width=widths[level],isValley=s.style==='valley',rise=.45+level*.36+v.rise*.28;
 const terrain={grade:{x:side*(.006+level*.005),y:((i+ci)%3-1)*(.004+level*.002)},features:[
  {x:low.x-side*4,y:low.y,rx:18,ry:Math.max(16,length*.22),height:(isValley?-1:1)*rise},
  {x:high.x+side*5,y:high.y,rx:16,ry:16,height:(isValley?1:-1)*rise*(.35+(ci%3)*.08)}
 ]};
 const sand=[];
 if(level>1||i%3===1)sand.push({x:cup.x+side*(width+2),y:cup.y+13,rx:s.style==='sand'?6:4,ry:s.style==='sand'?8:5});
 if(s.style==='sand')sand.push({x:low.x-side*(width*.75+2),y:low.y,rx:5.3,ry:7.5});
 const water=[];
 if(s.style==='water'){
  water.push({x:low.x+side*(width+(level===5?3:1)),y:low.y+1,rx:level===5?5:6+level*.3,ry:Math.min(12,length*.15)});
  if(level>=4&&par>=4)water.push({x:high.x-side*(width+2),y:high.y+2,rx:level===5?4:5,ry:7});
 }
 const trees=[{x:12,y:28,r:2.2},{x:98,y:39,r:2.5},{x:14,y:tee.y-10,r:2.4},{x:97,y:tee.y-9,r:2.2}];
 if(s.style==='trees')trees.push({x:low.x-side*width*.75,y:low.y+3,r:1.5},{x:high.x+side*(width*.8+1),y:high.y-3,r:1.6});
 const h=addCourseFeatures({id:s.id+'-'+(i+1),number:i+1,par,length:Math.round(distance(tee,cup)),width:112,height:length+56,tee,cup,terrain,fairway:[tee,low,high,cup],fairwayWidth:width,roughWidth:1.5,greenRadius:8.5,sand,water,trees,bounds:{left:5,right:107,top:5,bottom:length+51},lesson:i},vi*3+ci,i);
 h.boundary.fences=[{side:side>0?'right':'left',from:.22+(ci%2)*.08,to:level>=4?.46:.64}];
 if(level===1)h.boundary.fences.push({side:side>0?'left':'right',from:.3,to:.52});
 if(s.style==='rocks'){addRock(h,.42,side,2.6);if(level>=3)addRock(h,.7,-side,2.8);}
 return h;
}
export const regionalCourses=venues.flatMap((v,vi)=>v.courses.flatMap((s,ci)=>s.legacy?[]:[{
 id:s.id,name:s.name,english:v.id.toUpperCase()+' '+String.fromCharCode(65+ci),letter:String.fromCharCode(65+ci),
 tag:difficultyNames[s.level]+' · '+v.features[0],level:s.level,unlockLevel:s.unlockLevel,
 description:({open:'넓은 길에서 편안하게 거리감을 익혀요',trees:'나무 사이 열린 길을 찾아 정확하게 조준해요',ridge:'좁아지는 길과 옆경사를 한 샷씩 공략해요',water:'물가와 거리를 두고 안전한 길을 찾아요',sand:'모래 구역을 피해 힘과 방향을 조절해요',valley:'골짜기의 오르내림을 읽고 다음 샷을 준비해요',rocks:'현무암 바위 사이로 길을 찾아요'})[s.style],
 color:v.color,light:v.light,accent:v.accent,version:1,par:33,preview:'map',style:s.style,holes:pars.map((_,i)=>makeHole(v,s,ci,i,vi))
}]));
