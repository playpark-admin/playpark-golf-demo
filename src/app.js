import './viewport.js';
import {APP_INFO} from './app-info.js';
import {createGameAudio} from './audio.js';
import {bindMapCamera,fitCamera} from './camera.js';
import {animationSample} from './shot-animation.js';
import {makeRecord,mergeRecords,entriesFor} from './records.js';
import {loadRecords,saveRecords} from './record-store.js';
import {recordsView} from './records-view.js';
import {scorecardImage} from './scorecard-image.js';
import {terrainAt,slopeHint} from './terrain.js';
import {courses,createLayout,competitionKey,RULESET} from './courses.js';
import {createRound,takeShot,takeRelief,advanceHole,total,rankPlayers,scoreLabel,distance,lieAt,expectedDistance} from './engine.js';
import {icon,mascot,scene,holeArt,coursePreview} from './art.js';
import {lessons} from './lessons.js';
import {questions,byId,topics,levels,normalizeProgress,recordAnswer,stats,filterQuestions,shuffledAnswers,pickQuestion,roundQuestion} from './quiz.js';
import {bindJoystick,powerLimit} from './joystick.js';

const $=s=>document.querySelector(s),app=$('#app'),modalRoot=$('#modal-root');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storageProblem=false;
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem('plpark:'+key));return value??fallback;}catch{return fallback;}}
function write(key,value){try{if(value===null)localStorage.removeItem('plpark:'+key);else localStorage.setItem('plpark:'+key,JSON.stringify(value));return true;}catch{if(!storageProblem){storageProblem=true;toast('기기 저장 공간을 사용할 수 없어요. 이번 스코어카드는 이미지로 저장해 주세요.');}return false;}}
let saved=read('round',null);const hadSavedRound=!!saved;
try{if(saved&&(saved.schema!==1||saved.key!==competitionKey(saved.courseIds)||saved.layout?.length!==18||saved.players.some(p=>!p.ball)||!['playing','hole-complete'].includes(saved.status)))saved=null;}catch{saved=null;}
if(saved)saved.layout=createLayout(saved.courseIds);
const state={page:'home',selected:['forest','lake'],mode:1,names:['나','친구 1','친구 2','친구 3'],round:saved,records:read('records',[]),learned:read('learned',[]),sound:read('sound',true),help:read('help',true),moving:false,angle:-Math.PI/2,power:40,view:'full',recordKey:null};
if(!Array.isArray(state.records))state.records=[];if(!Array.isArray(state.learned))state.learned=[];
state.quizProgress=normalizeProgress(read('quiz-progress',{}),state.learned);
state.quizFilter={topic:'all',difficulty:'all'};state.quizVisible=12;
let activeQuiz=null,practice=null,quizSerial=0;
const color=['#ffffff','#efb853','#d8809c','#73b8db'];
let cardExport=null,cardSerial=0;
let feedback='',toastTimer,returnFocus=null,eventTimer,eventDone=null,mapCamera=null,unbindJoystick=null;
const gameAudio=createGameAudio(()=>state.sound);
document.addEventListener('pointerdown',gameAudio.unlock,{capture:true,passive:true});
document.addEventListener('keydown',gameAudio.unlock,{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)gameAudio.pause();});
function clearGameControls(){mapCamera?.destroy();mapCamera=null;unbindJoystick?.();unbindJoystick=null;}

function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
function sound(kind='hit',options){gameAudio.play(kind,options);}
function modal(html,wide=false){returnFocus=document.activeElement;modalRoot.innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-button modal-close" data-action="close" aria-label="닫기">${icon('close')}</button>${html}</section></div>`;requestAnimationFrame(()=>modalRoot.querySelector('button,input')?.focus());}
function closeModal(){cardSerial++;if(cardExport){URL.revokeObjectURL(cardExport.url);cardExport=null;}const refreshQuiz=activeQuiz&&!activeQuiz.inGame&&state.page==='rules'?activeQuiz.id:null;activeQuiz=null;clearTimeout(eventTimer);const done=eventDone;eventDone=null;modalRoot.innerHTML='';returnFocus?.isConnected&&returnFocus.focus();done?.();if(refreshQuiz){rulesPage();(document.querySelector(`[data-action="quiz"][data-id="${refreshQuiz}"]`)||document.querySelector('[data-action="practice"]'))?.focus({preventScroll:true});}}
document.addEventListener('keydown',e=>{if(!modalRoot.firstChild)return;if(e.key==='Escape'){closeModal();return;}if(e.key==='Tab'){const f=[...modalRoot.querySelectorAll('button:not([disabled]),input,select,a[href]')];if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}}});
const navigation=[['home','flag','플레이','플레이'],['courses','map','코스 도감','코스'],['records','trophy','내 기록','기록'],['rules','book','규칙 노트','규칙'],['help','help','도움말','도움말']];
function shell(content){clearGameControls();app.innerHTML=`<header class="topbar app-header"><button class="app-brand" data-action="nav" data-page="home" aria-label="Park Player 홈"><img class="app-logo" src="./assets/brand/playpark-symbol.png" alt="플레이파크 로고" width="48" height="48"><strong>${APP_INFO.name}</strong></button></header><aside class="sidebar"><nav aria-label="주 메뉴">${navigation.map(([page,i,label])=>`<button class="nav-item ${state.page===page?'active':''}" data-action="nav" data-page="${page}" ${state.page===page?'aria-current="page"':''}>${icon(i)}<span>${label}</span></button>`).join('')}</nav><div class="side-caddy">${mascot()}<strong>저는 캐디 플팍!</strong><p>첫 샷부터 홀아웃까지<br>플팍이 함께해요.</p><button data-action="guide">게임 조작 알아보기 ${icon('arrow',15)}</button></div></aside><div class="workspace"><main id="main">${content}</main></div><nav class="mobile-nav" aria-label="모바일 메뉴">${navigation.map(([p,i,,t])=>`<button data-action="nav" data-page="${p}" class="${state.page===p?'active':''}" ${state.page===p?'aria-current="page"':''}>${icon(i,20)}<span>${t}</span></button>`).join('')}</nav>`;}

function render(){if(state.page==='game'){renderGame();return;}if(state.page==='home')home();if(state.page==='courses')coursePage();if(state.page==='records')recordsPage();if(state.page==='rules')rulesPage();if(state.page==='help')helpPage();}
function card(c,select=true){const selected=state.selected.indexOf(c.id);return `<article class="course-card ${select&&selected>=0?'selected':''}" style="--course-color:${c.color}"><button class="card-cover" data-action="${select?'select':'course-detail'}" data-id="${c.id}" aria-label="${c.name} ${select?(selected>=0?'선택 해제':'선택'):'상세 보기'}" ${select?`aria-pressed="${selected>=0}"`:''}>${c.preview==='map'?coursePreview(c):scene(c.id)}<span class="course-letter">${c.letter} COURSE</span>${select?`<span class="selection-check">${selected>=0?icon('check',15):''}</span>`:''}<span class="course-tag">${c.tag}</span></button><div class="card-body"><div class="card-title"><button data-action="course-detail" data-id="${c.id}"><h3>${c.name}</h3></button><span class="difficulty" aria-label="난이도 ${c.level} / 3">${[1,2,3].map(n=>`<i class="${n<=c.level?'filled':''}"></i>`).join('')}</span></div><p>${c.description}</p><div class="card-meta"><span>9 HOLES <i>·</i> PAR 33</span>${select&&selected>=0?`<strong>${selected===0?'전반':'후반'} 9홀</strong>`:`<button data-action="course-detail" data-id="${c.id}" aria-label="${c.name} 둘러보기">${icon('arrow',17)}</button>`}</div></div></article>`;}
function home(){const a=state.selected.map(id=>courses.find(c=>c.id===id));shell(`<section class="hero"><div class="hero-text"><span class="eyebrow"><i></i> 플팍과 함께하는 18홀의 즐거움</span><h1>가볍게 한 판,<br>즐겁게 <em>파크골프.</em></h1><p>필드에 나가기 전, 가볍게 연습해 보세요.<br>게임을 즐기다 보면 규칙도 자연스럽게!</p><button class="hero-link" data-action="guide">처음 오셨나요? 플팍이 알려드려요 ${icon('arrow',17)}</button></div><div class="hero-art"><div class="hero-scenery">${scene('forest')}</div><img class="hero-plpak" src="./assets/brand/plpak.webp" alt="초록 유니폼을 입고 손을 흔드는 캐디 플팍" width="240" height="320"><div class="weather">${icon('sun',17)} 라운드하기 좋은 날</div><div class="hero-note">NICE SHOT! <span>✦</span></div></div></section><div class="intro-strip"><span>${icon('flag',18)} <b>18홀 한 라운드</b> <i>전반 9홀 + 후반 9홀</i></span><span>${icon('book',18)} <b>놀면서 배우는 규칙</b></span><span>${icon('users',18)} <b>함께하면 더 즐겁게</b></span></div>${state.round?`<button class="resume-banner" data-action="resume">${icon('play',19)} <span><b>이어서 라운드할까요?</b> ${state.round.holeIndex+1} / 18홀 · ${escape(state.round.players.map(p=>p.name).join(', '))}</span>${icon('arrow',18)}</button>`:''}<section class="course-section"><div class="section-heading"><div><span class="eyebrow small">CHOOSE YOUR GREENS</span><h2>오늘은 어떤 코스를 걸어볼까요?</h2><p>${courses.length}개 코스 중 2개를 순서대로 골라주세요.</p></div><span class="selected-count"><b>${state.selected.length}</b> / 2 코스 선택</span></div><div class="course-grid">${courses.map(c=>card(c)).join('')}</div></section><section class="round-bar"><div class="round-route"><span class="round-icon">${icon('map',24)}</span><div><small>오늘의 라운드</small><div><b>${a[0]?.name||'전반 코스 선택'}</b><button data-action="swap" aria-label="전반 후반 순서 바꾸기" ${a.length!==2?'disabled':''}>${icon('swap',17)}</button><b>${a[1]?.name||'후반 코스 선택'}</b></div></div><span class="route-total">18홀 <i>·</i> PAR 66</span></div><button class="primary start-button" data-action="setup" ${a.length!==2?'disabled':''}>라운드 시작하기 ${icon('arrow',20)}</button></section><div class="home-bottom"><span>${icon('leaf',15)} 작은 한 샷이, 필드 위 자신감으로.</span><button data-action="nav" data-page="courses">새로운 코스도 계속 만나요 ${icon('chevron',14)}</button></div>`);}
function coursePage(){shell(`<div class="page-heading"><span class="eyebrow">EXPLORE THE PARK</span><h1>코스마다 다른 풍경, 새로운 도전</h1><p>각기 다른 9홀을 둘러보고 나만의 라운드를 완성하세요.</p></div><div class="course-grid atlas">${courses.map(c=>card(c,false)).join('')}</div><section class="info-panel">${icon('map',35)}<div><h3>우리의 파크는 계속 넓어져요</h3><p>새 코스가 업데이트되면 이곳에서 만날 수 있어요. 지금은 ${courses.length}개 코스, 총 ${courses.length*9}개 홀을 준비했어요.</p></div></section>`);}
function courseDetail(id){const c=courses.find(c=>c.id===id);modal(`<div class="detail-cover">${c.preview==='map'?coursePreview(c):scene(id)}</div><span class="eyebrow">${c.english}</span><h2 id="modal-title">${c.name}</h2><p>${c.description}</p><div class="detail-stats"><span><b>9</b> 홀</span><span><b>33</b> 기준 타수</span><span><b>${c.holes.reduce((n,h)=>n+h.length,0)}</b> m</span></div><div class="mini-holes">${c.holes.map(h=>`<button data-action="hole-preview" data-course="${c.id}" data-hole="${h.number-1}"><small>${String(h.number).padStart(2,'0')}</small><b>PAR ${h.par}</b><span>${h.length}m ${icon('chevron',12)}</span></button>`).join('')}</div><p class="fine-print">코스에 표시된 물은 워터 해저드입니다. 플레이 불가 시 언플레이어블 2벌타 후 지정 OB 티에서 재개합니다. 최종 동점은 공동 순위로 기록합니다.</p><button class="primary full" data-action="select-from-detail" data-id="${id}">이 코스로 플레이하기 ${icon('arrow',18)}</button>`,true);}
function setup(){if(state.selected.length!==2)return;modal(`<span class="eyebrow">LET’S PLAY TOGETHER</span><h2 id="modal-title">오늘의 라운드 메이트는?</h2><p>혼자 기록에 도전하거나, 한 기기를 돌아가며 함께 즐겨요.</p><div class="mode-options">${[[1,'target','혼자 도전','나의 최고 기록을 향해'],[2,'users','함께 대전','2~4명, 한 기기에서']].map(([n,i,t,d])=>`<button class="mode-card ${((state.mode===1)===(n===1))?'active':''}" data-action="mode" data-mode="${n}">${icon(i,25)}<b>${t}</b><small>${d}</small></button>`).join('')}</div>${state.mode>1?`<label class="field">플레이어 수<select id="player-count">${[2,3,4].map(n=>`<option ${state.mode===n?'selected':''} value="${n}">${n}명</option>`).join('')}</select></label>`:''}<div class="name-grid">${Array.from({length:state.mode},(_,i)=>`<label class="field">플레이어 ${i+1}<input class="name-input" data-index="${i}" maxlength="12" value="${escape(state.names[i])}" placeholder="닉네임"></label>`).join('')}</div><label class="check-field"><input id="learn-toggle" type="checkbox" ${state.help?'checked':''}> 홀 사이에 플팍의 규칙 퀴즈 풀기</label><div class="local-note">${icon('users',17)} 함께 대전은 같은 기기에서 진행해요. 기록도 이 기기에 저장돼요.</div>${state.round?'<p class="warning-text">새 라운드를 시작하면 진행 중인 라운드를 교체합니다.</p>':''}<button class="primary full" data-action="start">${state.mode===1?'나의':'우리의'} 18홀 시작 ${icon('flag',18)}</button>`);}
function start(){const names=state.names.slice(0,state.mode).map(n=>n.trim());if(names.some(n=>!n))return toast('플레이어 이름을 입력해 주세요.');if(new Set(names).size!==names.length)return toast('플레이어 이름을 서로 다르게 입력해 주세요.');state.round=createRound(state.selected,names);write('round',state.round);closeModal();feedback='첫 홀의 순서를 뽑았어요. 티 위의 공을 치며 시작해 볼까요?';state.page='game';resetAim();render();window.scrollTo(0,0);}
function shotLimit(){const r=state.round,p=r.players[r.active],h=r.layout[r.holeIndex];return powerLimit(distance(p.ball,h.cup),expectedDistance(100,'fairway'));}
function resetAim(){const r=state.round,p=r.players[r.active],h=r.layout[r.holeIndex];state.angle=Math.atan2(h.cup.y-p.ball.y,h.cup.x-p.ball.x);state.power=0;state.view=distance(p.ball,h.cup)<=12?'ball':'full';}
function currentCourse(){return courses.find(c=>c.id===state.round.layout[state.round.holeIndex].courseId);}
const lies={fairway:'페어웨이',green:'그린',rough:'러프',sand:'벙커',water:'워터 해저드',ob:'OB'};
function renderGame(){
  clearGameControls();
  const r=state.round;if(!r){state.page='home';home();return;}
  const h=r.layout[r.holeIndex],p=r.players[r.active],c=currentCourse(),near=distance(p.ball,h.cup)<=12,ready=r.status==='playing'&&!p.needsRelief;
  app.innerHTML=`<div class="game-shell immersive-game"><header class="game-header"><button class="icon-button" data-action="pause" aria-label="일시 정지">${icon('back')}</button><div><small>${r.holeIndex<9?'전반':'후반'} · ${c.name}</small><h1><strong>${h.number}</strong>번 홀 <span>파 ${h.par} · ${h.length}m</span></h1></div><div class="game-header-right"><button class="icon-button" data-action="scorecard" aria-label="스코어카드">${icon('book')}</button><button class="icon-button" data-action="control-guide" aria-label="게임 도움말">${icon('help')}</button></div></header>
  <div class="game-progress" aria-label="전체 18홀 중 ${r.holeIndex+1}번 홀">${r.layout.map((_,i)=>`<span class="${i<r.holeIndex?'done':i===r.holeIndex?'current':''}"></span>`).join('')}</div>
  <div class="game-status"><div class="turn-summary"><small>${escape(p.name)}님의 차례</small><strong>${p.strokes+p.holePenalty+1}<span>번째 샷</span></strong></div><div><small>홀컵까지</small><strong>${distance(p.ball,h.cup).toFixed(1)}<span>m</span></strong></div><div><small>현재 홀</small><strong>${p.strokes+p.holePenalty}<span>타</span></strong>${p.holePenalty?`<em>벌타 ${p.holePenalty} 포함</em>`:''}</div></div>
  <div class="game-layout"><section class="field-area" style="--course-grass:${c.accent}" aria-label="코스와 샷 조작"><div class="map-wrapper">${holeArt(h,c)}</div>
  <div class="field-toolbar"><button class="terrain-readout" data-action="terrain-guide" aria-label="경사 그리드 읽는 법"><span id="elevation-value"></span><strong id="slope-value"></strong></button><div class="map-tools" aria-label="지도 확대 조절"><button data-action="zoom-out" aria-label="코스 축소">−</button><button data-action="zoom" aria-label="코스 전체 보기"><span id="zoom-value">전체</span></button><button data-action="zoom-in" aria-label="코스 확대">+</button></div></div>
  <button class="caddy-radio stage-note" data-action="caddy-message" aria-label="플팍 안내 자세히 보기">${mascot()}<span><b>플팍</b><span>${escape(feedback||'두 손가락으로 확대하고, 공을 보낼 방향으로 조이스틱을 밀어요.')}</span></span></button>
  <section class="joystick-dock" aria-label="샷 조작"><div class="stick-instruction sr-only" id="stick-instruction">${ready?'밀어서 조준 · 손을 놓으면 샷!':p.needsRelief?'워터 해저드 처치를 먼저 확인해요':'멋진 홀아웃! 결과를 확인해요'}</div><div class="joystick-console"><div class="stick-readout"><strong id="power-value">0<small>%</small></strong><span>파워</span><span id="expected-value" class="sr-only">0m</span><div class="power-meter sr-only"><i id="power-meter-fill"></i></div></div>
  <div id="joystick" class="joystick ${!ready?'unavailable':''}" tabindex="${ready?'0':'-1'}" role="button" aria-label="샷 조이스틱" aria-disabled="${!ready}" aria-describedby="joystick-help" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space"><span class="stick-axis x"></span><span class="stick-axis y"></span><span class="stick-north">▲</span><span class="stick-thumb">${icon('target',25)}</span></div></div><p id="joystick-help" class="sr-only">보낼 방향으로 밀고 손을 놓으면 샷. 멀리 밀수록 강하게. 가운데로 돌아오면 취소. 지도는 두 손가락으로 확대하고 한 손가락으로 이동해요. 키보드 좌우는 방향, 위아래는 힘, Enter는 샷.</p></section>
  ${p.needsRelief?'<button class="primary dock-action" data-action="relief">워터 해저드 처치하기</button>':r.status==='hole-complete'?'<button class="primary dock-action" data-action="hole-result">홀 결과 확인하기</button>':''}</section></div></div>`;
  updateAim();updateBalls();applyZoom();
  const joystick=$('#joystick');
  unbindJoystick=bindJoystick(joystick,{start:()=>{gameAudio.resetAim();sound('ready');},limit:shotLimit,canPlay:()=>!mapCamera?.isInteracting&&!state.moving&&!state.eventOpen&&!modalRoot.firstChild&&state.round?.status==='playing'&&!state.round.players[state.round.active].needsRelief,
    preview:shot=>{state.power=shot?.power||0;if(shot)gameAudio.aim(shot.power);if(shot)state.angle=shot.angle;updateAim();$('#stick-instruction').textContent=shot?'손을 놓으면 샷!':'가운데에서 놓으면 취소돼요';},
    release:shot=>{state.angle=shot.angle;state.power=shot.power;shoot();},cancel:()=>{sound('cancel');state.power=0;updateAim();$('#stick-instruction').textContent='밀어서 조준 · 손을 놓으면 샷!';}});
  joystick.addEventListener('keydown',e=>{if(state.moving||state.eventOpen||modalRoot.firstChild||!ready)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Escape'].includes(e.key))e.preventDefault();else return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight')state.angle+=(e.key==='ArrowLeft'?-1:1)*Math.PI/90;
    if(e.key==='ArrowUp'||e.key==='ArrowDown')state.power=Math.max(0,Math.min(shotLimit(),state.power+(e.key==='ArrowUp'?1:-1)*shotLimit()/40));
    if(e.key==='Escape'){state.power=0;sound('cancel');}if(e.key.startsWith('Arrow'))gameAudio.aim(state.power);if(e.key==='Enter'||e.key===' '){if(!e.repeat)shoot();return;}updateAim();});
}
function updateAim(){
  const r=state.round;if(!r||!$('#aim-layer'))return;const p=r.players[r.active],h=r.layout[r.holeIndex],d=state.power?expectedDistance(state.power,'fairway'):0,guide=d||Math.min(6,distance(p.ball,h.cup));
  const end={x:p.ball.x+Math.cos(state.angle)*guide,y:p.ball.y+Math.sin(state.angle)*guide};
  $('#aim-layer').innerHTML=r.status==='playing'&&!p.needsRelief?`<path class="aim-line" d="M${p.ball.x} ${p.ball.y}L${end.x} ${end.y}" stroke="${state.power?'#fffbe3':'#ffffff90'}" stroke-width=".38" stroke-dasharray=".8 .8"/><circle cx="${end.x}" cy="${end.y}" r="${state.power?.8:.5}" fill="none" stroke="#fffbe3" stroke-width=".23"/>`:'';
  $('#power-value').innerHTML=`${Math.round(state.power/shotLimit()*100)}<small>%</small>`;
  $('#expected-value').textContent=`${d.toFixed(1)}m`;
  const elevation=terrainAt(h.cup,h).height-terrainAt(p.ball,h).height,local=terrainAt(p.ball,h),grade=Math.hypot(local.dx,local.dy),down=Math.atan2(-local.dy,-local.dx),arrows=['→','↘','↓','↙','←','↖','↑','↗'];
  $('#elevation-value').textContent=Math.abs(elevation)<.1?'홀컵과 비슷한 높이':`홀컵까지 ${elevation>0?'오르막':'내리막'} ${Math.abs(elevation).toFixed(1)}m`;
  $('#slope-value').textContent=grade<.01?'발밑은 평탄해요':`${arrows[(Math.round(down/(Math.PI/4))+8)%8]} 낮은 쪽 · 경사 ${Math.round(grade*100)}%`;
  $('#power-meter-fill').style.width=`${state.power/shotLimit()*100}%`;
  $('#joystick').style.setProperty('--charge',`${state.power/shotLimit()*100}%`);
}
function updateBalls(animatedId=null,position=null,trail=[]){
  const r=state.round;if(!$('#balls-layer'))return;
  $('#trail-layer').innerHTML=trail.length>1?`<polyline points="${trail.map(v=>`${v.x},${v.y}`).join(' ')}" fill="none" stroke="#fffdeba0" stroke-width=".36" stroke-linecap="round"/>`:'';
  const latest=[...r.log].reverse().find(shot=>shot.hole===r.holeIndex&&shot.player===r.active);
  $('#relief-layer').innerHTML=animatedId===null&&latest?.event==='ob'?`<g class="ob-resume-marker"><circle cx="${latest.to.x}" cy="${latest.to.y}" r="1.45" fill="none" stroke="#a54722" stroke-width=".28"/><text x="${latest.to.x}" y="${latest.to.y-2}" text-anchor="middle" font-size="2" font-weight="800" fill="#793a1b" stroke="#fffbe6" stroke-width=".65" paint-order="stroke">OB 후 재개</text></g>`:'';
  $('#balls-layer').innerHTML=r.players.filter(p=>!p.holed||p.id===animatedId).map(p=>{const b=p.id===animatedId?position:p.ball;return `<g><ellipse cx="${b.x+.16}" cy="${b.y+.2}" rx=".55" ry=".35" fill="#244b4040"/><circle cx="${b.x}" cy="${b.y}" r=".48" fill="${color[p.id]}" stroke="#314e35" stroke-width=".1"/>${p.id===r.active&&animatedId===null?`<circle class="active-ball-ring" cx="${b.x}" cy="${b.y}" r="1.05" fill="none" stroke="white" stroke-width=".18"/>`:''}</g>`;}).join('');
}
function cameraPadding(size){const landscape=size.width>size.height*1.4,dock=$('.joystick-dock')?.getBoundingClientRect(),toolbar=$('.field-toolbar')?.getBoundingClientRect();return landscape?{left:14,right:(dock?.width||160)+30,top:(toolbar?.height||48)+16,bottom:16}:{left:14,right:14,top:(toolbar?.height||48)+16,bottom:(dock?.height||190)+28};}
function applyZoom(){
 const h=state.round.layout[state.round.holeIndex],p=state.round.players[state.round.active];
 const home=size=>{const pad=h.fairwayWidth+(h.roughWidth??3)+4,xs=h.fairway.map(v=>v.x),ys=h.fairway.map(v=>v.y),x=Math.min(...xs)-pad,y=Math.min(...ys)-pad;return fitCamera({x,y,width:Math.max(...xs)-x+pad,height:Math.max(...ys)-y+pad},size,cameraPadding(size));};
 const focus=size=>{const d=distance(p.ball,h.cup),sz=Math.min(32,Math.max(12,d+8)),center=d<20?{x:(p.ball.x+h.cup.x)/2,y:(p.ball.y+h.cup.y)/2}:p.ball;return fitCamera({x:center.x-sz/2,y:center.y-sz/2,width:sz,height:sz},size,cameraPadding(size));};
 mapCamera=bindMapCamera($('#course-map'),{home,focus,mode:state.view,canInteract:()=>!state.moving&&!state.eventOpen&&!modalRoot.firstChild&&!$('#joystick')?.classList.contains('dragging'),onChange:(view,zoom)=>{$('#zoom-value').textContent=zoom>1.02?zoom.toFixed(1)+'×':'전체';}});
}
function gameHelp(){const r=state.round,p=r.players[r.active],h=r.layout[r.holeIndex];modal(`<h2 id="modal-title">밀고, 놓으면 샷!</h2><div class="guide-steps"><div><b>1</b><span><strong>조이스틱으로 방향과 힘 조절</strong><small>보낼 방향으로 밀어요. 멀리 밀수록 강해져요. 손을 놓으면 샷, 가운데로 돌아오면 취소예요.</small></span></div><div><b>2</b><span><strong>두 손가락으로 확대하기</strong><small>코스 위에서 두 손가락을 벌리면 확대, 모으면 축소돼요. 한 손가락으로 지도를 이동하고, 위의 배율 버튼을 누르면 전체 코스로 돌아가요.</small></span></div><div><b>3</b><span><strong>경사와 지면 살펴보기</strong><small>경사 그리드의 점은 낮은 쪽으로 흘러요. 빠를수록 가파르고, 밝은 곳이 높아요. 흰 경계를 벗어나 멈추면 OB 2벌타. 벙커는 잔디보다 짧게 굴러요.</small></span></div></div><p>지금 공은 ${lies[lieAt(p.ball,h)]}에 있어요. 홀 근처에서는 약한 힘을 더 세밀하게 조절해요.</p><div class="help-actions"><button class="secondary full" data-action="aim-cup">홀컵 방향으로 조준하기</button><button class="secondary full" data-action="game-sound" aria-pressed="${state.sound}">효과음 ${state.sound?'켜짐 · 누르면 끄기':'꺼짐 · 누르면 켜기'}</button>${p.strokes>0&&r.status==='playing'?'<button class="text-button full" data-action="relief">공을 칠 수 없을 때 · 언플레이어블 +2</button>':''}</div><button class="text-button full" data-action="guide">전체 도움말 보기</button><button class="primary full" data-action="close">플레이 계속하기</button>`);}
async function showShotEvent(result,player,h){
  const kinds={ob:['ob','OB · 2벌타','공이 경계 밖에 멈췄어요.','벗어난 경계 지점에 공을 놓았어요. 여기서 이어 쳐요.'],cup:['cup','컵인!',`${escape(player.name)}님, ${player.strokes+player.holePenalty}타로 홀아웃!`,scoreLabel(player.strokes+player.holePenalty,h.par)],water:['water','워터 해저드','공이 물에 들어갔어요.','처치 방법을 확인하고 계속해요.'],'cup-miss':['near','아깝다!','홀컵을 지날 때 힘이 너무 강했어요.','조이스틱을 조금만 밀어 부드럽게 굴려요.'],tree:['tree','나무에 맞았어요','공이 멈춘 자리에서 다시 도전해요.','나무를 피해 방향을 바꿔 보세요.']};
  const info=kinds[result.event];if(!info)return;
  state.eventOpen=true;
  await new Promise(resolve=>{modal(`<div class="shot-event ${info[0]}"><span class="event-symbol">${icon(info[0]==='cup'?'flag':info[0]==='ob'?'close':'target',48)}</span><h2 id="modal-title">${info[1]}</h2><p>${info[2]}</p><strong>${info[3]}</strong><button class="primary full" data-action="close-event">계속하기 ${icon('arrow',22)}</button><small>잠시 후 자동으로 닫혀요</small></div>`);eventDone=resolve;eventTimer=setTimeout(closeModal,info[0]==='cup'?3600:5200);modalRoot.querySelector('.modal').classList.add('event-modal');});
  state.eventOpen=false;$('#joystick')?.focus({preventScroll:true});
}
async function shoot(){
  if(state.moving||state.eventOpen||state.round.status!=='playing'||state.power<=0)return;
  state.moving=true;const r=state.round,id=r.active,shotPower=state.power,startingLie=lieAt(r.players[id].ball,r.layout[r.holeIndex]);let result;
  try{result=takeShot(r,state.angle,state.power);}catch(e){state.moving=false;toast(e.message);return;}
  write('round',r);document.querySelectorAll('.game-shell button').forEach(e=>e.disabled=true);$('#joystick').setAttribute('aria-disabled','true');$('#joystick').classList.add('unavailable');$('#stick-instruction').textContent='공이 굴러가요!';$('#aim-layer').innerHTML='';sound('hit',{power:shotPower,lie:startingLie});
  await new Promise(resolve=>{const begin=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function frame(now){const sample=animationSample(result.frames,(now-begin)/1000,{reduced}),i=sample.index;updateBalls(id,sample.position,[...result.frames.slice(Math.max(0,i-10),i+1),sample.position]);if(!sample.done)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  state.moving=false;const q=r.players[id];feedback=result.holed?`${scoreLabel(q.strokes+q.holePenalty,r.layout[r.holeIndex].par)}! ${q.name}님, 멋진 홀아웃이에요.`:({ob:'OB 2벌타를 더했어요. 벗어난 경계의 표시된 공에서 이어가요.',water:'공이 물에 들어갔어요. 처치를 확인해 주세요.',sand:'벙커에서는 공이 빨리 멈춰요. 힘을 조금 더 주세요.',rough:'경계가 가까워요. 방향을 잘 살펴보고 쳐요.',tree:'나무에 맞았어요. 다음에는 옆으로 돌아가 볼까요?',green:'홀컵 가까이 왔어요. 짧게 밀어 부드럽게 굴려요.',fairway:slopeHint(q.ball,r.layout[r.holeIndex],Math.atan2(r.layout[r.holeIndex].cup.y-q.ball.y,r.layout[r.holeIndex].cup.x-q.ball.x)),'cup-miss':'홀컵을 지날 때 힘이 강했어요. 다음에는 조금 약하게!'})[result.event];
  if(r.players.length>1&&r.status==='playing'&&!q.needsRelief)feedback+=` 이제 ${r.players[r.active].name}님의 차례예요.`;
  if(result.holed)sound('cup');else if(['ob','water','sand','tree','cup-miss'].includes(result.event))sound(result.event,{power:shotPower});
  resetAim();renderGame();await showShotEvent(result,q,r.layout[r.holeIndex]);
  if(result.needsRelief)showRelief();else if(r.status==='hole-complete')holeResult();
}

function showRelief(){const p=state.round.players[state.round.active];modal(`<span class="eyebrow">PLPARK RULE GUIDE</span><h2 id="modal-title">${p.needsRelief?'워터 해저드에 들어갔어요':'언플레이어블을 선언할까요?'}</h2><div class="rule-mascot">${mascot()}</div><p>${p.needsRelief?'이 코스의 물에서는 샷을 할 수 없어요. 언플레이어블 2벌타를 더하고, 공을 놓을 자리가 없으면 공지된 OB 티로 이동해요.':'2벌타를 더하고 홀컵에 가까워지지 않는 2클럽 이내의 칠 수 있는 곳으로 이동해요.'}</p><button class="primary full" data-action="confirm-relief">2벌타 확인 · 처치하기</button><button class="text-button full" data-action="close">${p.needsRelief?'코스 다시 살펴보기':'현재 위치에서 플레이'}</button>`);}
function holeResult(){const r=state.round,h=r.layout[r.holeIndex];modal(`<span class="eyebrow">HOLE ${String(r.holeIndex+1).padStart(2,'0')} COMPLETE</span><h2 id="modal-title">${r.players.length===1?scoreLabel(r.players[0].scores[r.holeIndex],h.par):'모두 멋지게 홀아웃!'}</h2><div class="result-mascot">${mascot()}</div><p>${r.holeIndex===8?'전반 9홀을 마쳤어요. 후반 코스에서 새로운 풍경을 만나봐요.':'이번 홀의 타수를 함께 확인해 주세요.'}</p><div class="hole-results">${r.players.map(p=>`<div><b>${escape(p.name)}</b><span>${scoreLabel(p.scores[r.holeIndex],h.par)}</span><strong>${p.scores[r.holeIndex]}<small> 타</small></strong></div>`).join('')}</div><button class="primary full" data-action="next-step">${r.holeIndex===17?'최종 결과 확인':r.holeIndex===8?'후반 9홀로 출발':'다음 홀로'} ${icon('arrow',18)}</button><button class="text-button full" data-action="scorecard">전체 스코어카드</button>`);}
function quiz(id,inGame=false){
 const q=byId.get(id);if(!q)return;
 const choices=shuffledAnswers(q),serial=++quizSerial;
 const label=inGame?`라운드 퀴즈 · ${state.round.holeIndex+1} / 18홀`:`${practice?.review?'오답 복습':`플팍과 ${practice?.size||1}문제`} · ${(practice?.used.length)||1} / ${practice?.size||1}`;
 modal(`<div class="quiz-meta"><span class="eyebrow">${label}</span><span class="pill">${topics[q.topic]} · ${levels[q.difficulty]}</span></div><h2 id="modal-title" class="quiz-question">${escape(q.question)}</h2><p class="quiz-reassurance">천천히 골라 보세요. 퀴즈는 경기 타수에 영향을 주지 않아요.</p><div class="quiz-answers">${choices.map((a,i)=>`<button data-action="answer" data-serial="${serial}" data-answer="${i}"><span>${i+1}</span><b>${escape(a.text)}</b></button>`).join('')}</div><div id="quiz-feedback" aria-live="polite" tabindex="-1"></div><button class="text-button full quiz-skip" data-action="${inGame?'advance':'finish-quiz'}">${inGame?'이번에는 건너뛰기':'규칙 노트로 돌아가기'}</button>`);
 modalRoot.querySelector('.modal').classList.add('quiz-panel');
 activeQuiz={id,inGame,choices,serial,answered:false};
}
function answer(btn){
 const current=activeQuiz;if(!current||current.answered||Number(btn.dataset.serial)!==current.serial)return;
 const choice=current.choices[Number(btn.dataset.answer)];if(!choice)return;
 current.answered=true;const q=byId.get(current.id),correct=choice.correct;
 state.quizProgress=recordAnswer(state.quizProgress,q.id,correct);write('quiz-progress',state.quizProgress);
 if(current.inGame){state.round.quizDone??={};state.round.quizDone[state.round.holeIndex]=true;write('round',state.round);}else if(practice){practice.correct+=Number(correct);}
 modalRoot.querySelectorAll('[data-action="answer"]').forEach((b,i)=>{b.disabled=true;if(current.choices[i].correct)b.classList.add('correct');else if(b===btn)b.classList.add('wrong');});
 const feedback=$('#quiz-feedback');feedback.innerHTML=`<div class="quiz-explanation"><strong class="${correct?'correct-text':'wrong-text'}">${correct?'정답이에요!':'괜찮아요, 함께 알아봐요.'}</strong><p class="quiz-correct-answer">정답 · ${escape(q.answers[q.correct])}</p><div class="quiz-caddy">${mascot()}<p>${escape(q.explanation)}</p></div>${correct?'':'<p class="quiz-review-note">오답 노트에 저장했어요. 나중에 다시 맞히면 복습 목록에서 빠져요.</p>'}</div><button class="primary full" data-action="${current.inGame?'advance':'next-quiz'}">${current.inGame?'라운드 계속하기':practice.used.length>=practice.size?'학습 결과 보기':'다음 문제 풀기'} ${icon('arrow',17)}</button>`;
 modalRoot.querySelector('.quiz-skip')?.remove();feedback.focus({preventScroll:true});feedback.scrollIntoView({block:'nearest',behavior:'smooth'});
 if(correct)sound('cup');
}
function startPractice(review=false,firstId=null){
 const pool=filterQuestions(state.quizFilter),eligible=pool.filter(q=>!review||state.quizProgress[q.id]?.lastResult==='wrong');
 if(!eligible.length){toast(review?'선택한 주제와 난이도에 복습할 오답이 없어요.':'선택한 조건의 문제가 없어요.');return;}
 practice={review,pool,used:[],correct:0,size:Math.min(5,eligible.length)};
 const q=byId.get(firstId)||pickQuestion({pool,progress:state.quizProgress,review});if(!q)return;
 practice.used.push(q.id);quiz(q.id);
}
function nextPractice(){
 if(!practice||!activeQuiz?.answered)return;
 const q=practice.used.length<practice.size?pickQuestion({pool:practice.pool,progress:state.quizProgress,used:practice.used,review:practice.review}):null;
 if(q){practice.used.push(q.id);quiz(q.id);return;}
 const answered=practice.used.length,correct=practice.correct,s=stats(state.quizProgress);activeQuiz=null;
 rulesPage();modal(`<span class="eyebrow">오늘도 한 걸음!</span><h2 id="modal-title">${answered}문제를 함께 풀었어요</h2><div class="result-mascot">${mascot()}</div><div class="quiz-session-result"><b>${correct} / ${answered}</b><span>이번 학습에서 맞힌 문제</span></div><p>지금까지 ${s.seen}문제를 만났어요. ${s.review?'틀린 '+s.review+'문제는 오답 복습에서 다시 만나요.':'배운 규칙을 다음 라운드에서 떠올려 보세요.'}</p><button class="primary full" data-action="finish-quiz">규칙 노트로 돌아가기</button>`);
}
function nextStep(){const r=state.round;if(r.status!=='hole-complete')return;if(state.help&&!r.quizDone?.[r.holeIndex]){const q=roundQuestion(r,state.quizProgress);write('round',r);if(q){quiz(q.id,true);return;}}advance();}

function advance(){const r=state.round;if(r.status!=='hole-complete')return;advanceHole(r);closeModal();if(r.status==='complete'){completeRound();return;}write('round',r);feedback=r.holeIndex===9?'후반 코스에 도착했어요! 새로운 9홀도 함께 즐겨요.':lessons[r.layout[r.holeIndex].lesson].text;resetAim();renderGame();}
async function completeRound(){
 const r=state.round,record=makeRecord(r);state.records=mergeRecords(state.records,[record]);let stored=false;
 try{await saveRecords([record]);stored=true;}catch{stored=write('records',state.records);}
 if(stored)write('round',null);
 window.dispatchEvent(new CustomEvent('playpark:round-complete',{detail:structuredClone(record)}));
 showFinal(record,stored);
}
function showFinal(record,stored=true){sound('complete');state.page='records';state.recordKey=record.key;state.recordPlayer=record.players[0].name;state.round=null;recordsPage();openRecord(record,true,stored);}
async function openRecord(record,final=false,stored=true){
 closeModal();const serial=++cardSerial;
 modal(`<span class="eyebrow">PARK PLAYER SCORECARD</span><h2 id="modal-title">${final?'18홀 완주! 수고하셨어요':'우리의 18홀 스코어카드'}</h2><p>${stored?'이 기기의 누적 기록에 저장했어요.':'기기에 저장하지 못했어요. 아래 이미지를 꼭 저장해 주세요.'}</p><div class="final-ranks">${rankPlayers(record.players).map(p=>`<div><span class="rank-number">${p.rank}</span><b>${escape(p.name)}</b><strong>${total(p)}<small> 타</small></strong></div>`).join('')}</div><div id="scorecard-image" aria-live="polite"><p>스코어카드를 만들고 있어요…</p></div><div class="scorecard-actions"><button class="primary" data-action="save-score-image" disabled>이미지 저장</button><button class="secondary" data-action="share-score-image" disabled>이미지 공유</button></div><p class="fine-print image-save-help">PNG 이미지로 저장해요. 휴대폰에서는 이미지 공유 메뉴에서 사진 저장을 선택하거나, 이미지를 길게 눌러 저장할 수 있어요.</p><button class="text-button full" data-action="close">누적 기록과 분석 보기</button>${final?'<button class="text-button full" data-action="finish">다음 라운드 만나러 가기</button>':''}`,true);
 try{const result=await scorecardImage(record);if(serial!==cardSerial||!$('#scorecard-image'))return;cardExport={...result,url:URL.createObjectURL(result.blob)};cardExport.file=new File([result.blob],result.filename,{type:'image/png'});
 $('#scorecard-image').innerHTML=`<img class="scorecard-preview" src="${cardExport.url}" alt="${escape(record.players.map(p=>p.name+' '+total(p)+'타').join(', '))}. 전후반 18홀 스코어카드" width="${result.width}" height="${result.height}">`;
 $('[data-action="save-score-image"]').disabled=false;const share=$('[data-action="share-score-image"]');share.disabled=false;share.hidden=!navigator.canShare?.({files:[cardExport.file]});
 }catch{if(serial===cardSerial&&$('#scorecard-image'))$('#scorecard-image').innerHTML='<p>이미지를 만들지 못했어요. 카드를 다시 열어 주세요.</p>';}
}
function saveScoreImage(){if(!cardExport)return;const a=document.createElement('a');a.href=cardExport.url;a.download=cardExport.filename;document.body.append(a);a.click();a.remove();toast('스코어카드 이미지 저장을 요청했어요.');}
async function shareScoreImage(){if(!cardExport)return;try{await navigator.share({files:[cardExport.file],title:APP_INFO.name+' 18홀 스코어카드'});}catch(e){if(e.name!=='AbortError')toast('공유할 수 없어요. 이미지 저장을 이용해 주세요.');}}
function formatDiff(n){return n===0?'E':n>0?`+${n}`:String(n);}
function scorecard(){const r=state.round;if(!r)return;modal(`<span class="eyebrow">MY SCORECARD</span><h2 id="modal-title">우리의 18홀 기록</h2><div class="score-tables">${[0,9].map(offset=>`<h3>${offset===0?'전반 OUT':'후반 IN'} · ${r.layout[offset].courseName}</h3><div class="table-scroll"><table><thead><tr><th>홀</th>${r.layout.slice(offset,offset+9).map(h=>`<th>${h.number}</th>`).join('')}<th>합계</th></tr></thead><tbody><tr class="par-row"><th>PAR</th>${r.layout.slice(offset,offset+9).map(h=>`<td>${h.par}</td>`).join('')}<td>33</td></tr>${r.players.map(p=>`<tr><th>${escape(p.name)}</th>${r.layout.slice(offset,offset+9).map((h,j)=>`<td class="${p.scores[offset+j]<h.par?'under':''}">${p.scores[offset+j]??'–'}</td>`).join('')}<td>${p.scores.slice(offset,offset+9).reduce((a,b)=>a+b,0)||'–'}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div><p class="fine-print">모든 타수는 벌타를 포함해요. 홀아웃한 홀만 기록합니다.</p><button class="primary full" data-action="${r.status==='hole-complete'?'hole-result':'close'}">${r.status==='hole-complete'?'홀 결과로 돌아가기':'라운드로 돌아가기'}</button>`,true);}
function recordsPage(){
 const names=[...new Set(state.records.flatMap(r=>r.players.map(p=>p.name)))];if(!names.includes(state.recordPlayer))state.recordPlayer=names[0];
 const keys=[...new Set(entriesFor(state.records,state.recordPlayer).map(e=>e.record.key))];if(!keys.includes(state.recordKey))state.recordKey=keys[0];
 shell(recordsView(state.records,{player:state.recordPlayer,key:state.recordKey,visible:state.recordsVisible||20}));
}
function rulesPage(){
 const s=stats(state.quizProgress),pool=filterQuestions(state.quizFilter),missed=pool.filter(q=>state.quizProgress[q.id]?.lastResult==='wrong').length;
 shell(`<div class="page-heading"><span class="eyebrow">LEARN WITH PLPAK</span><h1>알수록 즐거운 파크골프</h1><p>상황별 퀴즈 ${questions.length}문제로, 필드 위 자신감을 쌓아요.</p></div><div class="learning-banner">${mascot()}<div><h3>${s.mastered}문제를 익혔어요!</h3><p>지금까지 ${s.seen}문제를 풀었어요 · 복습할 오답 ${s.review}개</p><div class="learning-progress" role="progressbar" aria-label="최근 풀이에서 맞힌 문제" aria-valuenow="${s.mastered}" aria-valuemin="0" aria-valuemax="${questions.length}"><span style="width:${s.mastered/questions.length*100}%"></span></div></div><b>${s.mastered} <small>/ ${questions.length}</small></b></div><section class="quiz-library" aria-label="퀴즈 선택"><div class="quiz-filters"><label class="field">배울 주제<select id="quiz-topic"><option value="all">모든 주제</option>${Object.entries(topics).map(([id,name])=>`<option value="${id}" ${state.quizFilter.topic===id?'selected':''}>${name}</option>`).join('')}</select></label><label class="field">난이도<select id="quiz-difficulty"><option value="all">모든 난이도</option>${Object.entries(levels).map(([id,name])=>`<option value="${id}" ${state.quizFilter.difficulty===id?'selected':''}>${name}</option>`).join('')}</select></label></div><div class="quiz-practice-actions"><button class="primary" data-action="practice" ${!pool.length?'disabled':''}>${icon('play',20)} 5문제 풀기</button><button class="secondary" data-action="review-quiz" ${!missed?'disabled':''}>${icon('book',20)} 틀린 문제 복습 (${missed})</button></div><p class="quiz-local-note">학습 기록은 이 기기에 저장돼요. 처음 만나는 문제부터 골라 드려요.</p></section><div class="section-heading"><h2>문제를 골라 풀어도 좋아요</h2><span class="pill">${pool.length}문제</span></div><div class="rules-grid">${pool.slice(0,state.quizVisible).map(q=>{const p=state.quizProgress[q.id];return `<button class="rule-card" data-action="quiz" data-id="${q.id}"><span class="pill ${p?.lastResult==='correct'?'learned':''}">${p?.lastResult==='correct'?'익혔어요 ✓':p?.lastResult==='wrong'?'다시 배워요':topics[q.topic]}</span><span class="quiz-level">${levels[q.difficulty]}</span><h3>${escape(q.question)}</h3><span class="rule-link">${p?'다시 풀어보기':'퀴즈로 배워보기'} ${icon('arrow',16)}</span></button>`;}).join('')}</div>${pool.length>state.quizVisible?`<button class="secondary full quiz-more" data-action="more-quizzes">문제 더 보기 · ${Math.min(state.quizVisible,pool.length)} / ${pool.length}</button>`:''}${!pool.length?'<p class="info-panel">이 조건에 맞는 문제가 없어요. 다른 주제나 난이도를 선택해 주세요.</p>':''}`);
}

function guide(){if(state.page!=='help')state.helpReturn=state.page;closeModal();state.page='help';render();window.scrollTo(0,0);$('#help-title')?.focus({preventScroll:true});}
function helpPage(){shell(`<section class="help-page"><div class="page-heading"><span class="eyebrow">HELP</span><h1 id="help-title" tabindex="-1">도움말</h1><p>플팍과 함께, 하나씩 익혀 보세요.</p><button class="secondary help-return" data-action="help-back">${icon('back',20)} ${state.helpReturn==='game'&&state.round?'플레이로 돌아가기':'이전 화면으로'}</button></div><div class="help-grid"><section class="help-card" aria-labelledby="help-play"><h2 id="help-play">플레이 방법</h2><div class="guide-steps"><div><b>1</b><span><strong>코스 2개를 골라요</strong><small>10개 코스 중 첫 번째가 전반 9홀, 두 번째가 후반 9홀이에요. 혼자 도전하거나 한 기기로 최대 4명이 함께해요.</small></span></div><div><b>2</b><span><strong>밀어서 조준하고, 놓으면 샷!</strong><small>조이스틱을 공을 보낼 방향으로 밀어요. 멀리 밀수록 강해져요. 취소하려면 가운데로 돌아와 손을 놓으세요.</small></span></div><div><b>3</b><span><strong>홀컵 가까이에서는 살살</strong><small>홀컵 근처에서는 작은 힘도 세밀하게 조절할 수 있어요. 18홀을 모두 마친 뒤, 벌타를 포함한 최저 타수로 겨뤄요. 동점은 공동 순위예요.</small></span></div></div></section><section class="help-card" aria-labelledby="help-course"><h2 id="help-course">코스 살펴보기</h2><h3>두 손가락으로 확대</h3><p>코스 위에서 두 손가락을 벌리면 확대, 모으면 축소돼요. 한 손가락으로 지도를 옮기고 배율 버튼을 누르면 전체 코스를 볼 수 있어요.</p><h3>그리드로 경사 읽기</h3><p>밝은 곳은 높고 어두운 곳은 낮아요. 격자 위의 점은 낮은 쪽으로 흐르며, 빠를수록 가팔라요. 오르막은 더 강하게, 내리막은 더 약하게 쳐 보세요.</p><h3>경계와 벙커 주의</h3><p>흰 경계 밖에서 멈추면 OB 2벌타를 더하고 경계를 넘은 지점 부근에서 다시 쳐요. 벙커에서는 공이 잔디보다 짧게 굴러요.</p></section><section class="help-card" aria-labelledby="help-records"><h2 id="help-records">퀴즈와 나의 기록</h2><p>규칙 메뉴에서 퀴즈를 풀고 해설을 확인해요. 퀴즈 정답 여부는 골프 타수에 영향을 주지 않아요.</p><p>기록 메뉴에서 누적 성적과 코스별 분석을 보고, 완주 스코어카드를 이미지로 저장하거나 공유할 수 있어요.</p><p class="help-note">플레이 기록과 퀴즈 진행 상황은 현재 기기와 브라우저에 저장돼요. 다른 기기로 자동 옮겨지지는 않아요.</p></section><section class="help-card" aria-labelledby="help-sound"><h2 id="help-sound">효과음 설정</h2><p>조준과 샷, 컵인 등 상황에 맞는 효과음을 켜거나 끌 수 있어요.</p><button class="secondary full" data-action="game-sound" aria-pressed="${state.sound}">효과음 ${state.sound?'켜짐 · 누르면 끄기':'꺼짐 · 누르면 켜기'}</button></section></div><footer class="help-about" aria-labelledby="help-about-title"><h2 id="help-about-title">서비스 정보</h2><dl><div><dt>게임 이름</dt><dd>${APP_INFO.name} · ${APP_INFO.koreanName}</dd></div><div><dt>제공 회사</dt><dd>${APP_INFO.provider}</dd></div><div><dt>버전</dt><dd>${APP_INFO.version}</dd></div></dl></footer></section>`);}

function pause(){if(state.moving)return;modal(`<span class="eyebrow">TAKE A LITTLE BREAK</span><h2 id="modal-title">잠깐, 쉬어가도 괜찮아요</h2><p>현재 위치와 타수는 자동으로 저장되어 있어요.</p><button class="primary full" data-action="close">라운드 계속하기 ${icon('play',17)}</button><button class="secondary full" data-action="lobby">저장하고 로비로</button>`);}
function download(id){const r=state.records.find(r=>r.id===id);if(r)openRecord(r);}
function toggleSelect(id){const i=state.selected.indexOf(id);if(i>=0)state.selected.splice(i,1);else if(state.selected.length<2)state.selected.push(id);else{toast('선택한 코스를 하나 해제하면 다른 코스를 고를 수 있어요.');return;}render();}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;const a=btn.dataset.action;if(a==='close-event'){closeModal();return;}if(state.moving||state.eventOpen)return;switch(a){
  case 'save-score-image':saveScoreImage();break;
  case 'share-score-image':shareScoreImage();break;
  case 'more-records':state.recordsVisible=(state.recordsVisible||20)+20;recordsPage();break;
  case 'nav':if(btn.dataset.page==='help'){guide();break;}closeModal();state.page=btn.dataset.page;render();window.scrollTo(0,0);break;
  case 'help-back':state.page=state.helpReturn==='game'&&!state.round?'home':state.helpReturn||'home';state.helpReturn=null;render();window.scrollTo(0,0);break;
  case 'select':toggleSelect(btn.dataset.id);break;
  case 'select-from-detail':closeModal();state.page='home';if(!state.selected.includes(btn.dataset.id)){if(state.selected.length===2)state.selected.pop();state.selected.push(btn.dataset.id);}render();break;
  case 'swap':state.selected.reverse();render();break;
  case 'guide':guide();break;
  case 'close':closeModal();break;
  case 'game-sound':state.sound=!state.sound;gameAudio.mute();write('sound',state.sound);btn.textContent='효과음 '+(state.sound?'켜짐 · 누르면 끄기':'꺼짐 · 누르면 켜기');btn.setAttribute('aria-pressed',String(state.sound));if(state.sound)sound('ready');break;
  case 'sound':state.sound=!state.sound;gameAudio.mute();write('sound',state.sound);toast(`효과음을 ${state.sound?'켰어요':'껐어요'}.`);render();break;
  case 'setup':setup();break;
  case 'mode':state.mode=Number(btn.dataset.mode);setup();break;
  case 'start':start();break;
  case 'resume':state.page='game';feedback='다시 만나서 반가워요! 저장한 위치에서 이어갈게요.';resetAim();render();window.scrollTo(0,0);if(state.round.status==='hole-complete')holeResult();break;
  case 'course-detail':courseDetail(btn.dataset.id);break;
  case 'hole-preview':{const c=courses.find(c=>c.id===btn.dataset.course),h=c.holes[Number(btn.dataset.hole)];modal(`<span class="eyebrow">${c.name} · COURSE ${c.letter}</span><h2 id="modal-title">${h.number}번 홀 <small>PAR ${h.par} · ${h.length}m</small></h2><div class="preview-map">${holeArt(h,c)}</div><button class="primary full" data-action="course-detail" data-id="${c.id}">코스 안내로 돌아가기</button>`);break;}
  case 'shoot':shoot();break;
  case 'terrain-guide':{const h=state.round.layout[state.round.holeIndex],p=state.round.players[state.round.active];modal(`<h2 id="modal-title">경사를 읽으면 더 재미있어요</h2><div class="terrain-key"><span>낮음</span><i aria-hidden="true"></i><span>높음</span></div><div class="quiz-caddy">${mascot()}<p>${slopeHint(p.ball,h,state.angle)}</p></div><div class="guide-steps"><div><b>1</b><span><strong>격자 위의 점은 낮은 쪽으로</strong><small>흐르는 점을 보면 공이 휘어질 방향을 알 수 있어요. 점이 빠르게 흐를수록 가파른 경사예요.</small></span></div><div><b>2</b><span><strong>밝은 곳은 높고, 어두운 곳은 낮아요</strong><small>격자 한 칸은 6m예요. 같은 간격의 격자 안에서 밝기를 비교하세요. 화면 동작 줄이기를 켜면 점은 멈추고, 밝기로 높낮이를 볼 수 있어요.</small></span></div><div><b>3</b><span><strong>오르막은 강하게, 내리막은 약하게</strong><small>조이스틱의 평지 거리는 기준이에요. 실제 거리는 경사와 잔디에 따라 달라져요.</small></span></div></div><button class="primary full" data-action="close">경사를 보며 쳐 볼게요</button>`);break;}
  case 'control-guide':gameHelp();break;
  case 'aim-cup':{const p=state.round.players[state.round.active],h=state.round.layout[state.round.holeIndex];state.angle=Math.atan2(h.cup.y-p.ball.y,h.cup.x-p.ball.x);closeModal();mapCamera?.reset('ball');updateAim();break;}
  case 'zoom':state.view='full';mapCamera?.reset('full');break;
  case 'zoom-in':mapCamera?.zoom(1.35);break;
  case 'zoom-out':mapCamera?.zoom(1/1.35);break;
  case 'pause':pause();break;
  case 'lobby':closeModal();state.page='home';render();break;
  case 'scorecard':scorecard();break;
  case 'hole-result':holeResult();break;
  case 'next-step':nextStep();break;
  case 'advance':advance();break;
  case 'quiz':startPractice(false,btn.dataset.id);break;
  case 'practice':startPractice(false);break;
  case 'review-quiz':startPractice(true);break;
  case 'next-quiz':nextPractice();break;
  case 'more-quizzes':state.quizVisible+=12;rulesPage();break;
  case 'game-rule':{const l=lessons[state.round.layout[state.round.holeIndex].lesson];modal(`<span class="eyebrow">플팍의 규칙 안내</span><h2 id="modal-title">${l.title}</h2><div class="quiz-caddy">${mascot()}<p>${l.text}</p></div><button class="primary full" data-action="close">플레이 계속하기</button>`);break;}
  case 'answer':answer(btn);break;
  case 'finish-quiz':closeModal();render();$('#quiz-topic')?.focus({preventScroll:true});break;
  case 'relief':showRelief();break;
  case 'confirm-relief':try{takeRelief(state.round);write('round',state.round);feedback='언플레이어블 2벌타를 더하고 공을 놓았어요. 다음 샷을 준비해요.';closeModal();resetAim();renderGame();}catch(err){toast(err.message);}break;
  case 'download':download(btn.dataset.id);break;
  case 'finish':closeModal();state.page='home';render();break;
}});
document.addEventListener('input',e=>{if(e.target.matches('.name-input'))state.names[Number(e.target.dataset.index)]=e.target.value;if(state.moving)return;});
document.addEventListener('change',e=>{if(e.target.id==='quiz-topic'||e.target.id==='quiz-difficulty'){const id=e.target.id;state.quizFilter[id==='quiz-topic'?'topic':'difficulty']=e.target.value;state.quizVisible=12;rulesPage();document.getElementById(id)?.focus();}if(e.target.id==='player-count'){state.mode=Number(e.target.value);setup();}if(e.target.id==='learn-toggle'){state.help=e.target.checked;write('help',state.help);}if(e.target.id==='record-player'){state.recordPlayer=e.target.value;state.recordsVisible=20;state.recordKey=null;recordsPage();}if(e.target.id==='record-filter'){state.recordKey=e.target.value;recordsPage();}});
window.addEventListener('pagehide',()=>{if(state.round&&state.round.status!=='complete')write('round',state.round);});
if('serviceWorker'in navigator&&!['localhost','127.0.0.1'].includes(location.hostname))navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
// Host apps listen to playpark:round-complete and explicitly forward data to their authenticated backend.
// No credentials, fabricated remote rankings, or cross-origin message listeners are embedded here.
window.PlayparkGame=Object.freeze({version:APP_INFO.version,ruleset:RULESET,getLastResult:()=>structuredClone(state.records[0]||null)});
try{state.records=await loadRecords(state.records);write('records',null);}catch{state.records=mergeRecords(state.records);}
render();

if(hadSavedRound&&!saved)toast('코스에 높낮이가 생겼어요. 새 라운드를 시작해 주세요. 완주 기록은 그대로예요.');
