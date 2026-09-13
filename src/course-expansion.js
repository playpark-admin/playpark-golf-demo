// Additional, independently versioned nine-hole packs. Existing A–D geometry stays unchanged.
const pars=[3,4,3,4,5,3,4,3,4];
const profiles=[
 {id:'meadow',name:'햇살 들판',english:'SUNLIT MEADOW',letter:'E',tag:'넓고 편안한 시작',level:1,description:'넉넉한 페어웨이와 부드러운 언덕',color:'#55862d',light:'#eef3c3',accent:'#91bf57',width:14,bend:5,swing:4,rise:1.1,grade:.01,lengths:[35,60,42,65,100,38,70,48,75],style:'open'},
 {id:'pine',name:'솔바람 숲',english:'PINE TRAIL',letter:'F',tag:'나무 사이 정교한 샷',level:2,description:'굽이진 숲길에서 조준 실력을 키워요',color:'#26765e',light:'#d6eadd',accent:'#77aa69',width:11,bend:10,swing:9,rise:1.8,grade:.02,lengths:[44,72,50,68,112,40,80,55,76],style:'trees'},
 {id:'river',name:'강변 물길',english:'RIVERSIDE',letter:'G',tag:'물가에서 침착하게',level:2,description:'옆으로 흐르는 물길과 완만한 경사',color:'#267f9b',light:'#d2edf2',accent:'#83b573',width:12,bend:9,swing:7,rise:1.4,grade:.018,lengths:[46,70,52,78,115,42,82,48,74],style:'water'},
 {id:'valley',name:'산들 계곡',english:'ROLLING VALLEY',letter:'H',tag:'골짜기를 읽는 재미',level:3,description:'오르내리는 골짜기와 연속 굽이',color:'#756049',light:'#ece4cc',accent:'#a7b866',width:10,bend:12,swing:12,rise:2.8,grade:.03,lengths:[50,78,55,82,120,45,86,52,80],style:'valley'},
 {id:'coast',name:'바다 모래길',english:'SANDY COAST',letter:'I',tag:'벙커 탈출에 도전',level:2,description:'모래 벙커를 피해 힘을 조절해요',color:'#ad7730',light:'#f5e6bf',accent:'#b2c372',width:11.5,bend:8,swing:8,rise:1.7,grade:.022,lengths:[42,68,48,74,108,40,76,54,80],style:'sand'},
 {id:'ridge',name:'하늘 능선',english:'SKY RIDGE',letter:'J',tag:'좁은 능선의 긴장감',level:3,description:'긴 코스와 횡경사, 한 샷씩 신중하게',color:'#606b9b',light:'#e1e5f2',accent:'#91ad63',width:9.5,bend:13,swing:13,rise:3,grade:.04,lengths:[54,85,58,90,125,48,92,56,88],style:'ridge'}
];
const pattern=[-1,.5,1,-.6,.8,-.4,.7,-.8,.3];
function makeHole(s,i){
 const length=s.lengths[i],side=i%2?1:-1,tee={x:46-side*3,y:length+24},cup={x:46+s.bend*pattern[i],y:24};
 const low={x:46+side*s.swing,y:tee.y-length*.34},high={x:46-side*s.swing*.65+s.bend*pattern[i]*.4,y:tee.y-length*.68};
 const sand=[{x:cup.x-side*(s.width+1),y:cup.y+14,rx:s.style==='sand'?7:4.5,ry:s.style==='sand'?8:5.5}];
 if(s.style==='open'&&i%3===0)sand.length=0;
 if(s.style==='sand')sand.push({x:low.x+side*8,y:low.y,rx:6,ry:9});
 const water=s.style==='water'?[{x:low.x+side*(s.width+1),y:low.y+1,rx:7,ry:Math.min(13,length*.16)}]:[];
 const terrain={grade:{x:side*s.grade,y:(i%3-1)*.014},features:[
  {x:low.x-side*3,y:low.y,rx:16,ry:Math.max(15,length*.21),height:s.style==='valley'?-s.rise:s.rise},
  {x:high.x+side*5,y:high.y,rx:14,ry:14,height:s.style==='valley'?s.rise*.6:-s.rise*.5}
 ]};
 const trees=[{x:12,y:24,r:2.2},{x:80,y:34,r:2.5},{x:12,y:tee.y-8,r:2.3},{x:80,y:tee.y-6,r:2.1}];
 if(s.style==='trees')trees.push({x:low.x-side*7,y:low.y+3,r:1.8},{x:high.x+side*8,y:high.y-2,r:1.6});
 return {id:`${s.id}-${i+1}`,number:i+1,par:pars[i],length:Math.round(Math.hypot(tee.x-cup.x,tee.y-cup.y)),width:92,height:length+48,tee,cup,terrain,fairway:[tee,low,high,cup],fairwayWidth:s.width,roughWidth:1.5,greenRadius:9,sand,water,waterObTee:water.length?{x:tee.x,y:tee.y-4}:null,trees,bounds:{left:5,right:87,top:5,bottom:length+43},obTee:{x:tee.x,y:tee.y+1},lesson:i};
}
export const additionalCourses=profiles.map(s=>({id:s.id,name:s.name,english:s.english,letter:s.letter,tag:s.tag,level:s.level,description:s.description,color:s.color,light:s.light,accent:s.accent,version:1,par:33,preview:'map',holes:pars.map((_,i)=>makeHole(s,i))}));
