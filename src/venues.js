// Regional game venues, not replicas of real facilities. Stable IDs preserve records.
export const venues=[
 {id:'pyeongchang',name:'평창 솔숲 파크',region:'강원 · 평창',theme:'alpine',description:'짙은 솔숲과 부드러운 산자락을 따라 걷는 고원 구장',features:['고원 숲길','완만한 언덕','솔숲 굽이'],color:'#27634e',light:'#deede4',accent:'#74956c',palette:{fairway:'#b9d786',rough:'#94b577',tree:'#246954',treeLight:'#458570',water:'#82bdcb',sand:'#e8d3ab'},bend:9,rise:1.5,shape:[0,-.8,.6,-.2],courses:[
  {id:'forest',legacy:true},{id:'pyeongchang-birch',name:'자작나무 길',level:2,unlockLevel:1,style:'trees'},
  {id:'pyeongchang-pass',name:'대관령 고개',level:3,unlockLevel:2,style:'ridge'},
  {id:'pyeongchang-summit',name:'고원 정상',level:4,unlockLevel:4,style:'ridge'}]},
 {id:'hangang',name:'한강 물빛 파크',region:'서울 · 한강',theme:'river',description:'강변의 버드나무와 갈대 물길 사이로 펼쳐지는 라운드',features:['강변 물길','넓은 둔치','갈대섬'],color:'#276b8b',light:'#dceef3',accent:'#84ad88',palette:{fairway:'#c4df88',rough:'#9fb978',tree:'#4c8153',treeLight:'#72a65b',water:'#64b4d0',sand:'#eadcb2'},bend:7,rise:.9,shape:[0,.8,.65,-.3],courses:[
  {id:'river',legacy:true},{id:'hangang-willow',name:'버들 둔치',level:1,unlockLevel:1,style:'open'},
  {id:'hangang-reed',name:'갈대 물굽이',level:3,unlockLevel:2,style:'water'},
  {id:'hangang-island',name:'물빛 섬길',level:4,unlockLevel:4,style:'water'}]},
 {id:'chungju',name:'충주 호반 파크',region:'충북 · 충주',theme:'lake',description:'호수의 굽이와 잔잔한 물가를 따라 방향을 읽는 구장',features:['호반 곡선','수변 경사','물가 공략'],color:'#326f96',light:'#dce9f6',accent:'#82a884',palette:{fairway:'#b7dca3',rough:'#8fba8d',tree:'#3b745d',treeLight:'#5d9878',water:'#73add4',sand:'#e7d6ae'},bend:11,rise:1.3,shape:[0,-.9,-.3,.65],courses:[
  {id:'lake',legacy:true},{id:'chungju-promenade',name:'호숫가 산책',level:1,unlockLevel:1,style:'open'},
  {id:'chungju-cove',name:'푸른 만',level:3,unlockLevel:3,style:'water'},
  {id:'chungju-ripple',name:'물결 능선',level:4,unlockLevel:4,style:'water'}]},
 {id:'taean',name:'태안 해솔 파크',region:'충남 · 태안',theme:'coast',description:'해송 숲과 모래 둔덕이 만나는 해안 테마 구장',features:['해송 숲','모래 벙커','해안 굴곡'],color:'#a27c3b',light:'#f2e8cf',accent:'#9daf79',palette:{fairway:'#ccdc93',rough:'#b8c68b',tree:'#526e50',treeLight:'#7b955b',water:'#65b8cd',sand:'#efcf8d'},bend:8,rise:1.4,shape:[0,.8,-.75,.4],courses:[
  {id:'coast',legacy:true},{id:'taean-pinebeach',name:'해송 산책',level:1,unlockLevel:1,style:'trees'},
  {id:'taean-dune',name:'황금 사구',level:3,unlockLevel:2,style:'sand'},
  {id:'taean-cape',name:'해안 끝자락',level:4,unlockLevel:4,style:'sand'}]},
 {id:'gimje',name:'김제 들녘 파크',region:'전북 · 김제',theme:'fields',description:'넓은 들녘과 낮은 언덕에서 편안하게 거리감을 익혀요',features:['넉넉한 페어웨이','낮은 경사','편안한 첫 경기'],color:'#7c812d',light:'#f1edc7',accent:'#a4b868',palette:{fairway:'#d2e497',rough:'#b1c881',tree:'#64854a',treeLight:'#8ca655',water:'#8dbec4',sand:'#ecdb9d'},bend:4,rise:.6,shape:[0,.35,-.25,.1],courses:[
  {id:'meadow',legacy:true},{id:'gimje-golden',name:'황금 들판',level:2,unlockLevel:1,style:'open'}]},
 {id:'yeosu',name:'여수 노을 파크',region:'전남 · 여수',theme:'sunset',description:'남해의 섬 그림자와 노을빛 언덕을 품은 구장',features:['노을 언덕','섬 해안','굽이진 오르막'],color:'#a46946',light:'#f5dfcf',accent:'#aab779',palette:{fairway:'#d9db8c',rough:'#b5be7a',tree:'#737b47',treeLight:'#a4a760',water:'#7fb6c9',sand:'#e8c799'},bend:10,rise:1.7,shape:[0,-.65,.85,.25],courses:[
  {id:'sunset',legacy:true},{id:'yeosu-harbor',name:'고요한 포구',level:1,unlockLevel:1,style:'open'},
  {id:'yeosu-camellia',name:'동백 산책',level:2,unlockLevel:1,style:'trees'},
  {id:'yeosu-islands',name:'다도해 전망',level:5,unlockLevel:5,style:'water'}]},
 {id:'jinju',name:'진주 꽃강 파크',region:'경남 · 진주',theme:'blossom',description:'남강의 물길과 봄꽃 정원을 따라 즐기는 화사한 라운드',features:['벚꽃 정원','강변 곡선','정원 벙커'],color:'#a55978',light:'#f4e0e9',accent:'#95b780',palette:{fairway:'#bfdd9a',rough:'#a2c283',tree:'#d499b2',treeLight:'#f1c9d8',water:'#87bbca',sand:'#ead7b8'},bend:8,rise:1.2,shape:[0,.7,.9,-.3],courses:[
  {id:'blossom',legacy:true},{id:'jinju-flower',name:'꽃비 오솔길',level:1,unlockLevel:1,style:'trees'},
  {id:'jinju-namgang',name:'남강 물길',level:3,unlockLevel:2,style:'water'},
  {id:'jinju-garden',name:'정원의 굽이',level:3,unlockLevel:3,style:'sand'},
  {id:'jinju-moon',name:'달빛 언덕',level:4,unlockLevel:4,style:'ridge'}]},
 {id:'uljin',name:'울진 금강송 파크',region:'경북 · 울진',theme:'pine',description:'키 큰 소나무와 숲길의 굴곡 사이로 조준을 익혀요',features:['금강송 숲','나무 사이 공략','숲속 골짜기'],color:'#3a6556',light:'#d9e8df',accent:'#789978',palette:{fairway:'#b9d79a',rough:'#93b28a',tree:'#235c45',treeLight:'#4c855a',water:'#86bac1',sand:'#dacfad'},bend:12,rise:1.6,shape:[0,-.9,.7,-.4],courses:[
  {id:'pine',legacy:true},{id:'uljin-moss',name:'이끼 숲길',level:1,unlockLevel:1,style:'open'},
  {id:'uljin-geumgang',name:'금강송 굽이',level:4,unlockLevel:4,style:'trees'}]},
 {id:'jeongseon',name:'정선 산울림 파크',region:'강원 · 정선',theme:'valley',description:'산골짜기와 계단형 능선을 읽으며 한 샷씩 오르는 구장',features:['깊은 골짜기','횡경사','능선 공략'],color:'#776150',light:'#e9e1d5',accent:'#8e9f77',palette:{fairway:'#bacc8f',rough:'#9dae7d',tree:'#4d7150',treeLight:'#799253',water:'#8abec2',sand:'#dac69f'},bend:13,rise:1.9,shape:[0,.9,-.85,.5],courses:[
  {id:'valley',legacy:true},{id:'jeongseon-stream',name:'산골 냇가',level:1,unlockLevel:1,style:'open'},
  {id:'jeongseon-foothill',name:'산자락 쉼터',level:2,unlockLevel:1,style:'trees'},
  {id:'jeongseon-terrace',name:'계단 능선',level:4,unlockLevel:4,style:'valley'},
  {id:'jeongseon-gorge',name:'협곡 도전',level:5,unlockLevel:5,style:'valley'},
  {id:'jeongseon-sky',name:'구름 위 길',level:5,unlockLevel:6,style:'ridge'}]},
 {id:'jeju',name:'제주 오름 파크',region:'제주 · 오름',theme:'volcanic',description:'현무암과 억새 들판, 오름의 굴곡이 어우러진 큰 구장',features:['현무암 바위','억새 들판','오름 경사'],color:'#4e6867',light:'#e0ece5',accent:'#8da883',palette:{fairway:'#c4d796',rough:'#9ab386',tree:'#56724c',treeLight:'#899d61',water:'#6dbbbc',sand:'#d7c5a2'},bend:12,rise:1.8,shape:[0,-.8,.85,.35],courses:[
  {id:'ridge',legacy:true},{id:'jeju-silvergrass',name:'억새 들판',level:1,unlockLevel:1,style:'open'},
  {id:'jeju-camellia',name:'동백 돌담길',level:2,unlockLevel:1,style:'rocks'},
  {id:'jeju-basalt',name:'검은돌 언덕',level:3,unlockLevel:3,style:'rocks'},
  {id:'jeju-crater',name:'분화구 굽이',level:4,unlockLevel:4,style:'valley'},
  {id:'jeju-coast',name:'해안 절벽길',level:5,unlockLevel:5,style:'water'},
  {id:'jeju-oreum',name:'오름 마스터',level:5,unlockLevel:6,style:'rocks'},
  {id:'jeju-halla',name:'한라 정상 도전',level:5,unlockLevel:7,style:'ridge'}]}
];
for(const v of venues)v.courseIds=v.courses.map(c=>c.id);
export const venueForCourse=id=>venues.find(v=>v.courseIds.includes(id));
export const venueById=id=>venues.find(v=>v.id===id);
export const difficultyNames=['','편안','보통','도전','고난도','최고난도'];
