import {validateTerrain} from './terrain.js';
import {additionalCourses} from './course-expansion.js';
// Course packs are independently versioned. Geometry uses metres; visuals use the same data.
export const RULESET = 'kpga-2024.02.05-game-1';
export const PHYSICS = 'roll-3-terrain';
const pars = [3,4,3,4,5,3,4,3,4];
const distances = [40,65,45,60,100,35,70,50,65];
const specs = [
  {id:'forest',name:'숲속 산책',english:'FOREST WALK',letter:'A',tag:'처음이라면 추천',level:1,description:'초록빛 나무 사이, 편안한 첫 라운드',color:'#278c47',light:'#d4efae',accent:'#7aba47',width:13},
  {id:'lake',name:'물빛 호수',english:'LAKESIDE BLUE',letter:'B',tag:'정교한 한 수',level:2,description:'잔잔한 물결 따라, 신중하게 한 샷',color:'#218eaa',light:'#caeaf4',accent:'#7fbd76',width:11},
  {id:'sunset',name:'노을 언덕',english:'SUNSET HILLS',letter:'C',tag:'도전하는 재미',level:3,description:'황금빛 언덕에서 만나는 짜릿한 도전',color:'#b88524',light:'#f8e3a7',accent:'#aaca58',width:9},
  {id:'blossom',name:'벚꽃 정원',english:'BLOSSOM GARDEN',letter:'D',tag:'설레는 라운드',level:2,description:'꽃잎이 내려앉은 길, 기분 좋은 플레이',color:'#b96683',light:'#f4dfe6',accent:'#97bf71',width:11}
];
export const courses = specs.map((s,ci)=>({...s,version:3,par:33,holes:pars.map((par,i)=>{
  const length=distances[i];const bend=(i%3-1)*(3+ci*3);const tee={x:36+(i%2)*6,y:length+22};const cup={x:36+(i%2)*6+bend,y:22};
  const middle={x:tee.x+bend+(i%2?1:-1)*(ci+1)*4,y:(tee.y+cup.y)/2};
  const sand=(i>0||ci>0)?[{x:cup.x+(i%2?12:-12),y:cup.y+12,rx:5+ci,ry:7}]:[];
  const strength=[1.1,1.8,3.3,1.7][ci],side=i%2?1:-1;
  const terrain={grade:{x:side*[.012,.025,.045,.022][ci],y:(i%3-1)*.012},features:[
    {x:middle.x-side*3,y:middle.y-3,rx:14+ci,ry:Math.max(13,length*.24),height:strength},
    {x:cup.x+side*7,y:cup.y+9,rx:12,ry:13,height:-strength*.45}
  ]};
  const water=ci===1?[{x:18+(i%2)*38,y:middle.y,rx:9,ry:13}]:[];
  return {id:`${s.id}-${i+1}`,number:i+1,par,length:Math.round(Math.hypot(tee.x-cup.x,tee.y-cup.y)),width:80,height:length+44,tee,cup,terrain,fairway:[tee,middle,cup],fairwayWidth:s.width,roughWidth:1.5,greenRadius:9,sand,water,waterObTee:water.length?{x:tee.x,y:tee.y-4}:null,
    trees:[{x:13,y:20,r:2.4},{x:67,y:37,r:2.5},{x:13,y:tee.y-9,r:2.1},{x:65,y:tee.y-8,r:2.4},...(ci===2?[{x:middle.x+10,y:middle.y-6,r:2.7}]:[])],
    bounds:{left:5,right:75,top:5,bottom:length+39},obTee:{x:tee.x,y:tee.y+1},lesson:i};
})}));
export function validateCourse(c){
  if(!c||typeof c.id!=='string'||!Number.isInteger(c.version)||c.holes?.length!==9)throw Error('코스는 ID, 버전, 9개 홀이 필요합니다.');
  if(c.holes.reduce((n,h)=>n+h.par,0)!==33)throw Error('코스의 기준 타수는 33이어야 합니다.');
  if(new Set(c.holes.map(h=>h.id)).size!==9)throw Error('홀 ID는 고유해야 합니다.');
  for(const h of c.holes){validateTerrain(h.terrain);if(![3,4,5].includes(h.par)||h.width<=0||h.height<=0||!Number.isFinite(h.roughWidth)||h.roughWidth<0||!Number.isFinite(h.fairwayWidth)||h.fairwayWidth<=0)throw Error('홀 규격 오류');for(const p of [h.tee,h.cup,h.obTee,...h.fairway])if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<h.bounds.left||p.x>h.bounds.right||p.y<h.bounds.top||p.y>h.bounds.bottom)throw Error('홀 좌표 오류');}
  return c;
}
courses.push(...additionalCourses);
courses.forEach(validateCourse);
export function createLayout(ids){if(ids.length!==2||new Set(ids).size!==2)throw Error('서로 다른 코스 2개를 선택해 주세요.');return ids.flatMap(id=>{const c=courses.find(c=>c.id===id);if(!c)throw Error('코스를 찾을 수 없습니다.');return c.holes.map(h=>({...h,courseId:c.id,courseName:c.name,courseVersion:c.version}));});}
export function competitionKey(ids){return `${RULESET}:${PHYSICS}:${ids.map(id=>`${id}@${courses.find(c=>c.id===id).version}`).join('+')}`;}

// Call before starting the UI; distribute packs as reviewed local JSON or with the next app release.
export function registerCourse(pack){validateCourse(pack);if(courses.some(c=>c.id===pack.id))throw Error('이미 등록된 코스 ID입니다.');courses.push(structuredClone(pack));}
