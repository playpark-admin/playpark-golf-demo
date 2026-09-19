import {teeWaitingAnchor} from './player-staging.js';
import {plusShowcase} from './plus-view.js';
import {normalizeProfile,profileSetup,prepareProfilePhoto,avatarImage} from './player-profiles.js';
import {createPlayerBadges} from './player-badges.js';
import {SESSION,profileKey,currentMembership,saveMembership,selectProfile} from './session.js';
import {earnedVenues,isPlus,memberBall,BALL_STYLES} from './membership.js';
import {accountStrip,membershipPage,premiumReview} from './membership-view.js';
import {boundaryArt} from './boundary.js';
import {holeResultView,scorePose} from './hole-result-view.js';
import {landscapeCourse,projectCoursePoint,courseFrameBounds,fitCourseFrame} from './course-framing.js';
import {aimVisual,ballVisuals,trailVisual} from './shot-visuals.js';
import {courseAccess as memberCourseAccess,roundAccess} from './course-access.js';
import {coursePlayerView,courseLockNote,courseUnlockGuide,lockIcon} from './course-access-view.js';
import {playerGrowth,growthLevel} from './progression.js';
import {roundGrowthView,growthGuide} from './progression-view.js';
import './viewport.js';
import {APP_INFO} from './app-info.js';
import {bindCaddyMessage} from './caddy-message.js';
import {createGameAudio} from './audio.js';
import {createGameMusic,musicForCourse,musicTheme,MUSIC_THEMES} from './music.js';
import {bindMapCamera} from './camera.js';
import {animationSample} from './shot-animation.js';
import {makeRecord,mergeRecords,entriesFor} from './records.js';
import {loadRecords,saveRecords} from './record-store.js';
import {recordsView} from './records-view.js';
import {scorecardImage} from './scorecard-image.js';
import {terrainAt,slopeHint} from './terrain.js';
import {courses,coursesAtVenue,RULESET,PHYSICS} from './courses.js';
import {venues,venueById,difficultyNames} from './venues.js';
import {venuePicker,venueOverview} from './venue-view.js';
import {restoreRound} from './saved-round.js';
import {createRound,takeShot,takeRelief,advanceHole,total,rankPlayers,scoreLabel,distance,lieAt,expectedDistance} from './engine.js';
import {icon,mascot,scene,holeArt,coursePreview} from './art.js';
import {lessons} from './lessons.js';
import {questions,byId,topics,levels,normalizeProgress,recordAnswer,stats,filterQuestions,shuffledAnswers,pickQuestion,roundQuestion} from './quiz.js';
import {bindJoystick,powerLimit} from './joystick.js';

const $=s=>document.querySelector(s),app=$('#app'),modalRoot=$('#modal-root');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storageProblem=false;
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem(profileKey(key)));return value??fallback;}catch{return fallback;}}
function write(key,value){try{if(value===null)localStorage.removeItem(profileKey(key));else localStorage.setItem(profileKey(key),JSON.stringify(value));return true;}catch{if(!storageProblem){storageProblem=true;toast('기기 저장 공간을 사용할 수 없어요. 이번 스코어카드는 이미지로 저장해 주세요.');}return false;}}
const storedRound=read('round',null),hadSavedRound=!!storedRound,saved=restoreRound(storedRound);
const state={membership:currentMembership(),page:'home',selected:[],mode:1,names:['나','친구 1','친구 2','친구 3'],round:saved,records:read('records',[]),learned:read('learned',[]),sound:read('sound',true),music:read('music',true),help:read('help',true),moving:false,angle:-Math.PI/2,power:40,view:'full',recordKey:null};
if(!Array.isArray(state.records))state.records=[];if(!Array.isArray(state.learned))state.learned=[];
state.quizProgress=normalizeProgress(read('quiz-progress',{}),state.learned);
state.quizFilter={topic:'all',difficulty:'all'};
let activeQuiz=null,practice=null,quizSerial=0;
const savedProfiles=read('player-profiles',[]);state.playerProfiles=Array.isArray(savedProfiles)?savedProfiles.filter(p=>typeof p?.name==='string').slice(-32):[];
const color=['#ffffff','#efb853','#d8809c','#73b8db'];
let cardExport=null,cardSerial=0;
let feedback='',toastTimer,returnFocus=null,eventTimer,eventDone=null,mapCamera=null,unbindJoystick=null,unbindCaddy=null,playerBadges=null;
const gameAudio=createGameAudio(()=>state.sound);
const gameMusic=createGameMusic(()=>state.music);
function syncMusic(){const r=state.round;if(r)gameMusic.setCourse(currentCourse());gameMusic.setFocus(Boolean(r&&distance(r.players[r.active].ball,r.layout[r.holeIndex].cup)<=12));gameMusic.setActive(state.page==='game'&&Boolean(r)&&!document.hidden&&!modalRoot.querySelector('[data-music-pause]'));}
function courseMusicNote(course=currentCourse()){const score=musicTheme(musicForCourse(course).theme);return '<p class="help-note course-music" data-music-theme="'+score.id+'"><strong>이 코스의 음악 · '+score.title+'</strong><br>'+score.description+'</p>';}
function musicButton(){return `<button class="secondary full music-toggle" data-action="music" aria-pressed="${state.music}">배경음악 ${state.music?'켜짐 · 누르면 끄기':'꺼짐 · 누르면 켜기'}</button>`;}
document.addEventListener('pointerdown',gameMusic.unlock,{capture:true,passive:true});
document.addEventListener('keydown',gameMusic.unlock,{capture:true});
document.addEventListener('pointerdown',gameAudio.unlock,{capture:true,passive:true});
document.addEventListener('keydown',gameAudio.unlock,{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){gameAudio.pause();gameMusic.hide();}else syncMusic();});
window.addEventListener('pageshow',syncMusic);
function clearGameControls(){playerBadges?.destroy();playerBadges=null;unbindCaddy?.();unbindCaddy=null;mapCamera?.destroy();mapCamera=null;unbindJoystick?.();unbindJoystick=null;}

function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
function sound(kind='hit',options){if(state.sound&&!['aim','ready','cancel'].includes(kind))gameMusic.duck(kind==='cup'||kind==='complete'?2000:1100);gameAudio.play(kind,options);}
function modal(html,wide=false){returnFocus=document.activeElement;modalRoot.innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-button modal-close" data-action="close" aria-label="닫기">${icon('close')}</button>${html}</section></div>`;syncMusic();requestAnimationFrame(()=>modalRoot.querySelector('button,input')?.focus());}
function closeModal(){cardSerial++;if(cardExport){URL.revokeObjectURL(cardExport.url);cardExport=null;}const refreshQuiz=activeQuiz&&!activeQuiz.inGame&&state.page==='rules'?activeQuiz.id:null;activeQuiz=null;clearTimeout(eventTimer);const done=eventDone;eventDone=null;modalRoot.innerHTML='';returnFocus?.isConnected&&returnFocus.focus();done?.();if(refreshQuiz){rulesPage();((practice?.review&&document.querySelector('[data-action="review-quiz"]:not([disabled])'))||document.querySelector('[data-action="practice"]'))?.focus({preventScroll:true});}syncMusic();}
document.addEventListener('keydown',e=>{if(!modalRoot.firstChild)return;if(e.key==='Escape'){closeModal();return;}if(e.key==='Tab'){const f=[...modalRoot.querySelectorAll('button:not([disabled]),input,select,a[href]')];if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}}});
const navigation=[['home','flag','플레이','플레이'],['courses','map','구장·코스','구장'],['records','trophy','내 기록','기록'],['rules','book','규칙 노트','규칙'],['help','help','도움말','도움말']];
function shell(content){gameMusic.setActive(false);clearGameControls();app.innerHTML=`<div class="app-shell ${isPlus(state.membership)?'plus-member':''}"><aside class="sidebar"><button class="app-brand" data-action="nav" data-page="home" aria-label="Park Player 홈"><img class="app-logo" src="./assets/brand/playpark-symbol.png" alt="플레이파크 로고" width="48" height="48"><strong>${APP_INFO.name}</strong></button><nav aria-label="주 메뉴">${navigation.map(([page,i,label])=>`<button class="nav-item ${state.page===page?'active':''}" data-action="nav" data-page="${page}" ${state.page===page?'aria-current="page"':''}>${icon(i)}<span>${label}</span></button>`).join('')}</nav><div class="side-caddy">${mascot()}<strong>저는 캐디 플팍!</strong><p>첫 샷부터 홀아웃까지<br>플팍이 함께해요.</p><button data-action="guide">게임 조작 알아보기 ${icon('arrow',15)}</button></div></aside><div class="workspace"><main id="main">${accountStrip(state.membership)}${content}</main></div></div><nav class="mobile-nav" aria-label="모바일 메뉴">${navigation.map(([p,i,,t])=>`<button data-action="nav" data-page="${p}" class="${state.page===p?'active':''}" ${state.page===p?'aria-current="page"':''}>${icon(i,20)}<span>${t}</span></button>`).join('')}</nav>`;}

function render(){if(state.coursePlayer)syncMembership();if(state.page==='game'){renderGame();return;}if(state.page==='home')home();if(state.page==='courses')coursePage();if(state.page==='records')recordsPage();if(state.page==='rules')rulesPage();if(state.page==='help')helpPage();if(state.page==='membership'){syncMembership();shell(membershipPage(state.membership,coursePoints()));}}
function coursePoints(name=state.coursePlayer){return state.membership.testPoints??playerGrowth(state.records,name).total;}
function courseAccess(c,points){return memberCourseAccess(c,points,state.membership);}
function syncMembership(){const earned=earnedVenues(coursePoints(),state.membership.earnedVenues);if(JSON.stringify(earned)!==JSON.stringify(state.membership.earnedVenues)){try{state.membership=saveMembership({earnedVenues:earned});}catch{toast('구장 획득 상태를 저장하지 못했어요. 기기 저장 공간을 확인해 주세요.');}}}
function changeMembership(patch){const expanded=$('.test-controls')?.open,focus=document.activeElement?.id;try{state.membership=saveMembership(patch);syncMembership();normalizeCourseSelection();render();if(expanded&&$('.test-controls'))$('.test-controls').open=true;if(focus)document.getElementById(focus)?.focus({preventScroll:true});}catch{toast('테스트 설정을 저장할 수 없어요.');}}
function accessLabel(access){return access.venue&&!access.venue.unlocked?'PLUS 구장 · '+access.venue.requiredPoints.toLocaleString('ko-KR')+' P에 획득':'LV '+access.required.level+'에 열려요';}
function normalizeCourseSelection(){syncMembership();const points=coursePoints();state.selected=state.selected.filter(id=>{const c=courses.find(c=>c.id===id);return c?.venueId===state.venueId&&courseAccess(c,points).unlocked;});}
function chooseCoursePlayer(name){name=name.trim();if(!name){toast('플레이어 이름을 입력해 주세요.');return false;}state.coursePlayer=name;state.names[0]=name;write('course-player',name);state.coursePlayers=[...new Set([...state.coursePlayers,name])];write('course-players',state.coursePlayers);normalizeCourseSelection();return true;}
function chooseVenue(id){if(!venueById(id)||id===state.venueId)return;state.venueId=id;write('venue',id);state.selected=coursesAtVenue(id).filter(c=>courseAccess(c,coursePoints()).unlocked).slice(0,2).map(c=>c.id);render();const select=$('#venue-select');if(select?.getClientRects().length)select.focus({preventScroll:true});else document.querySelector('[data-action="venue"][data-id="'+id+'"]')?.focus({preventScroll:true});}
function venueSection(select=true){const v=venueById(state.venueId);return venuePicker(v.id,coursePoints(),state.membership)+venueOverview(v.id,coursePoints(),state.membership)+'<div class="venue-courses-heading"><div><h2>2. '+v.name+'의 코스</h2><p>'+(select?'열린 코스 2개를 골라 전반·후반 9홀을 즐겨요.':'코스를 눌러 홀 구성과 해제 등급을 살펴보세요.')+'</p></div>'+(select?'<span class="selected-count"><b>'+state.selected.length+'</b> / 2 코스 선택</span>':'')+'</div><div class="course-grid '+(select?'':'atlas')+'">'+coursesAtVenue(v.id).map(c=>card(c,select)).join('')+'</div>';}
function newCoursePlayer(){modal(`<h2 id="modal-title">새 이름으로 시작하기</h2><p>기존 기록을 이어가려면 코스 화면에서 같은 이름을 선택하세요.</p><label class="field">플레이어 이름<input id="new-course-player" maxlength="12" placeholder="닉네임" autocomplete="off"></label><button class="primary full" data-action="use-course-player">이 이름으로 코스 고르기</button>`);}
function updateSetupAccess(){const el=$('#setup-course-access');if(!el)return;const name=state.names[0].trim(),access=roundAccess(state.selected,state.records,name,{venueId:state.venueId,membership:state.membership,points:coursePoints(name)});el.innerHTML=`<p><b>플레이어 1: ${escape(name||'이름을 입력해 주세요')}</b><br>LV ${growthLevel(coursePoints(name)).current.level} · ${coursePoints(name).toLocaleString('ko-KR')} P 기준${state.membership.testPoints!==null?' · 테스트':''}</p>${access.allowed?'<p>선택한 코스에서 함께 플레이할 수 있어요.</p>':`<p class="setup-lock-warning">${access.locked.map(c=>escape(c?.name||'알 수 없는 코스')).join(' · ')} 코스가 잠겨 있어요.</p><button class="secondary full" data-action="reselect-courses">이 이름으로 코스 다시 고르기</button>`}`;el.dataset.allowed=String(access.allowed);$('[data-action="start"]').disabled=!name||!access.allowed;}
function card(c,select=true){const access=courseAccess(c,coursePoints()),locked=!access.unlocked,selected=locked?-1:state.selected.indexOf(c.id);return `<article class="course-card ${locked?'is-locked':''} ${select&&selected>=0?'selected':''}" data-course-id="${c.id}" data-locked="${locked}" style="--course-color:${c.color}"><button class="card-cover" data-action="${select&&!locked?'select':'course-detail'}" data-id="${c.id}" aria-label="${c.name} ${locked?'잠김, '+accessLabel(access)+', 해제 조건 보기':select?(selected>=0?(selected===0?'전반':'후반')+' 9홀 선택됨, 선택 해제':'선택'):'상세 보기'}" ${select&&!locked?`aria-pressed="${selected>=0}"`:''}>${c.preview==='map'?coursePreview(c):scene(c.id,false,c)}<span class="course-letter">${c.letter} COURSE</span>${select&&!locked?`<span class="selection-check" aria-hidden="true">${selected>=0?icon('check',28):''}</span>`:''}${locked?`<span class="course-lock-badge">${lockIcon}<b>${accessLabel(access)}</b></span>`:`<span class="course-tag">${c.tag}</span>`}${select&&selected>=0?`<span class="course-selection-banner"><b>선택됨</b><span>${selected===0?'전반':'후반'} 9홀</span></span>`:''}</button><div class="card-body"><div class="card-venue-label">${c.region}</div><div class="card-title"><button data-action="course-detail" data-id="${c.id}"><h3>${c.name}</h3></button></div><div class="course-difficulty"><span class="difficulty" aria-hidden="true">${[1,2,3,4,5].map(n=>`<i class="${n<=c.level?'filled':''}"></i>`).join('')}</span><span>난이도 ${c.level} · ${difficultyNames[c.level]}</span></div><p>${c.description}</p>${courseLockNote(c,coursePoints(),state.membership)}<div class="card-meta"><span>9 HOLES <i>·</i> PAR 33</span>${select&&selected>=0?`<strong>${selected===0?'전반':'후반'} 9홀</strong>`:`<button data-action="course-detail" data-id="${c.id}" aria-label="${c.name} 둘러보기">${icon('arrow',17)}</button>`}</div></div></article>`;}
function home(){normalizeCourseSelection();const a=state.selected.map(id=>courses.find(c=>c.id===id));shell(`${isPlus(state.membership)?plusShowcase():''}<section class="hero"><div class="hero-text"><span class="eyebrow"><i></i> 플팍과 함께하는 18홀의 즐거움</span><h1>가볍게 한 판,<br>즐겁게 <em>파크골프.</em></h1><p>필드에 나가기 전, 가볍게 연습해 보세요.<br>게임을 즐기다 보면 규칙도 자연스럽게!</p><button class="hero-link" data-action="guide">처음 오셨나요? 플팍이 알려드려요 ${icon('arrow',17)}</button></div><div class="hero-art"><div class="hero-scenery">${scene('forest')}</div><img class="hero-plpak" src="./assets/brand/plpak.webp" alt="초록 유니폼을 입고 손을 흔드는 캐디 플팍" width="240" height="320"><div class="weather">${icon('sun',17)} 라운드하기 좋은 날</div><div class="hero-note">NICE SHOT! <span>✦</span></div></div></section><div class="intro-strip"><span>${icon('flag',18)} <b>18홀 한 라운드</b> <i>전반 9홀 + 후반 9홀</i></span><span>${icon('book',18)} <b>놀면서 배우는 규칙</b></span><span>${icon('users',18)} <b>함께하면 더 즐겁게</b></span></div>${state.round?`<button class="resume-banner" data-action="resume">${icon('play',19)} <span><b>${state.round.physics===PHYSICS?'이어서 라운드할까요?':'이전 코스로 이어하기'}</b> ${state.round.holeIndex+1} / 18홀 · ${escape(state.round.players.map(p=>p.name).join(', '))}</span>${icon('arrow',18)}</button>`:''}<section class="course-section">${coursePlayerView(state.records,state.coursePlayer,state.coursePlayers,state.membership)}${venueSection(true)}</section><section class="round-bar"><div class="round-route"><span class="round-icon">${icon('map',24)}</span><div><small class="round-venue-name">${venueById(state.venueId).name} · 오늘의 라운드</small><div><b>${a[0]?.name||'전반 코스 선택'}</b><button data-action="swap" aria-label="전반 후반 순서 바꾸기" ${a.length!==2?'disabled':''}>${icon('swap',17)}</button><b>${a[1]?.name||'후반 코스 선택'}</b></div></div><span class="route-total">18홀 <i>·</i> PAR 66</span></div><button class="primary start-button" data-action="setup" ${a.length!==2?'disabled':''}>라운드 시작하기 ${icon('arrow',20)}</button></section><div class="home-bottom"><span>${icon('leaf',15)} 작은 한 샷이, 필드 위 자신감으로.</span><button data-action="nav" data-page="courses">새로운 코스도 계속 만나요 ${icon('chevron',14)}</button></div>`);}
function coursePage(){shell(`<div class="page-heading"><span class="eyebrow">EXPLORE THE PARK</span><h1>구장마다 다른 풍경, 새로운 도전</h1><p>지역의 풍경을 담은 ${venues.length}개 테마 구장 · ${courses.length}개 코스 · ${courses.length*9}홀</p></div>${coursePlayerView(state.records,state.coursePlayer,state.coursePlayers,state.membership)}${venueSection(false)}`);}
function courseDetail(id){const c=courses.find(c=>c.id===id);if(!c)return;const access=courseAccess(c,coursePoints());modal(`<div class="detail-cover">${c.preview==='map'?coursePreview(c):scene(id,false,c)}</div><span class="eyebrow">${c.region} · ${c.venueName}</span><h2 id="modal-title">${c.name}</h2><p class="course-difficulty">난이도 ${c.level} / 5 · ${difficultyNames[c.level]}</p><p>${c.description}</p>${courseMusicNote(c)}${courseLockNote(c,coursePoints(),state.membership)}${!access.unlocked?`<p class="course-detail-requirement">${escape(state.coursePlayer)} 님 · ${accessLabel(access)}. 상급 코스는 표시된 성장 등급도 필요해요. 포인트는 차감되지 않아요.</p>`:''}<div class="detail-stats"><span><b>9</b> 홀</span><span><b>33</b> 기준 타수</span><span><b>${c.holes.reduce((n,h)=>n+h.length,0)}</b> m</span></div><div class="mini-holes">${c.holes.map(h=>`<button data-action="hole-preview" data-course="${c.id}" data-hole="${h.number-1}"><small>${String(h.number).padStart(2,'0')}</small><b>PAR ${h.par}</b><span>${h.length}m ${icon('chevron',12)}</span></button>`).join('')}</div><p class="fine-print">흰 말뚝은 밖으로 나갔다 안에 돌아와 멈추면 계속 플레이합니다. 붉은 말뚝은 넘어갔다 돌아와도 OB 2벌타입니다. 그물망과 바위에 맞으면 튕겨요. OB는 벗어난 경계에서, 물에 빠지면 언플레이어블 2벌타 후 칠 수 있는 곳에서 재개합니다. 최종 동점은 공동 순위로 기록합니다.</p><button class="primary full" data-action="select-from-detail" data-id="${id}" ${access.unlocked?'':'disabled'}>${access.unlocked?'이 코스로 플레이하기':'잠김 · '+accessLabel(access)} ${icon('arrow',18)}</button>`,true);}
function holePreview(courseId,index,direction){
 const c=courses.find(c=>c.id===courseId);if(!c||!Number.isInteger(index)||index<0||index>=c.holes.length)return;
 const h=c.holes[index],last=c.holes.length-1;
 modal(`<header class="hole-preview-header"><span class="eyebrow">${c.name} · COURSE ${c.letter}</span><h2 id="modal-title" tabindex="-1">${h.number}번 홀 <small>PAR ${h.par} · ${h.length}m</small></h2></header><div class="hole-preview-body"><div class="preview-map">${holeArt(h,c)}</div></div><footer class="hole-preview-actions"><nav class="hole-preview-navigation" aria-label="홀 안내 이동"><button class="secondary" data-action="hole-preview" data-course="${c.id}" data-hole="${index-1}" data-preview-direction="previous" aria-describedby="preview-position" ${index===0?'disabled':''}>${icon('back',18)} 이전 홀</button><span id="preview-position" class="hole-preview-position" aria-live="polite" aria-atomic="true"><b>${index+1}</b><span> / ${c.holes.length}홀</span></span><button class="primary" data-action="hole-preview" data-course="${c.id}" data-hole="${index+1}" data-preview-direction="next" aria-describedby="preview-position" ${index===last?'disabled':''}>다음 홀 ${icon('chevron',18)}</button></nav><button class="text-button full" data-action="course-detail" data-id="${c.id}">코스 안내로 돌아가기</button></footer>`);
 modalRoot.querySelector('.modal').classList.add('hole-preview-modal');
 if(direction)requestAnimationFrame(()=>{const button=modalRoot.querySelector('[data-preview-direction="'+direction+'"]:not(:disabled)');(button||modalRoot.querySelector('#modal-title'))?.focus({preventScroll:true});});
}
function savedProfile(name,index=0){return normalizeProfile(state.playerProfiles.find(p=>p.name===name)?.profile,index);}
function setPlayerProfile(index,profile){const name=state.names[index]?.trim();if(!name){toast('플레이어 이름을 먼저 입력해 주세요.');return;}const next=[...state.playerProfiles.filter(p=>p.name!==name),{name,profile:normalizeProfile(profile,index)}].slice(-32);if(!write('player-profiles',next))return;state.playerProfiles=next;refreshProfileEditor(index);return true;}
function refreshProfileEditor(index){const name=state.names[index]?.trim(),p=savedProfile(name,index),row=document.querySelector('[data-profile-index="'+index+'"]');if(!row)return;row.querySelector('[data-profile-preview]').innerHTML=avatarImage(p,index);row.querySelector('[data-profile-name]').textContent=(index+1)+'. '+(name||'플레이어');row.querySelectorAll('[data-action="choose-avatar"]').forEach(b=>b.setAttribute('aria-pressed',String(p.kind==='avatar'&&p.id===b.dataset.id)));}
function setup(){if(state.selected.length!==2)return;modal(`<span class="eyebrow">LET’S PLAY TOGETHER</span><h2 id="modal-title">오늘의 라운드 메이트는?</h2><p>혼자 기록에 도전하거나, 한 기기를 돌아가며 함께 즐겨요.</p><div class="mode-options">${[[1,'target','혼자 도전','나의 최고 기록을 향해'],[2,'users','함께 대전','2~4명, 한 기기에서']].map(([n,i,t,d])=>`<button class="mode-card ${((state.mode===1)===(n===1))?'active':''}" data-action="mode" data-mode="${n}">${icon(i,25)}<b>${t}</b><small>${d}</small></button>`).join('')}</div>${state.mode>1?`<label class="field">플레이어 수<select id="player-count">${[2,3,4].map(n=>`<option ${state.mode===n?'selected':''} value="${n}">${n}명</option>`).join('')}</select></label>`:''}<div class="name-grid">${Array.from({length:state.mode},(_,i)=>`<label class="field">플레이어 ${i+1}<input class="name-input" data-index="${i}" maxlength="12" value="${escape(state.names[i])}" placeholder="닉네임"></label>`).join('')}</div>${profileSetup(state.names,state.mode,state.names.slice(0,state.mode).map((name,i)=>savedProfile(name.trim(),i)))}<section id="setup-course-access" class="setup-course-access" aria-live="polite"></section>${musicButton()}<label class="check-field"><input id="learn-toggle" type="checkbox" ${state.help?'checked':''}> 홀 사이에 플팍의 규칙 퀴즈 풀기</label><div class="local-note">${icon('users',17)} 함께 대전은 같은 기기에서 진행해요. 기록도 이 기기에 저장돼요.</div>${state.round?'<p class="warning-text">새 라운드를 시작하면 진행 중인 라운드를 교체합니다.</p>':''}<button class="primary full" data-action="start">${state.mode===1?'나의':'우리의'} 18홀 시작 ${icon('flag',18)}</button>`);updateSetupAccess();}
function start(){const names=state.names.slice(0,state.mode).map(n=>n.trim());if(names.some(n=>!n))return toast('플레이어 이름을 입력해 주세요.');if(new Set(names).size!==names.length)return toast('플레이어 이름을 서로 다르게 입력해 주세요.');const access=roundAccess(state.selected,state.records,names[0],{venueId:state.venueId,membership:state.membership,points:coursePoints(names[0])});if(!access.allowed){updateSetupAccess();return toast('플레이어 1에게 열린 코스 2개를 골라 주세요.');}chooseCoursePlayer(names[0]);state.round=createRound(state.selected,names);state.round.players.forEach(p=>p.profile=savedProfile(p.name,p.id));write('round',state.round);closeModal();feedback='첫 홀의 순서를 뽑았어요. 티 위의 공을 치며 시작해 볼까요?';state.page='game';resetAim();render();window.scrollTo(0,0);}
function shotLimit(){const r=state.round,p=r.players[r.active],h=r.layout[r.holeIndex];return powerLimit(distance(p.ball,h.cup),expectedDistance(100,'fairway'));}
function resetAim(){const r=state.round,p=r.players[r.active],h=r.layout[r.holeIndex];state.angle=Math.atan2(h.cup.y-p.ball.y,h.cup.x-p.ball.x);state.power=0;state.view=distance(p.ball,h.cup)<=12?'ball':'full';}
function currentCourse(){return courses.find(c=>c.id===state.round.layout[state.round.holeIndex].courseId);}
const lies={fairway:'페어웨이',green:'그린',rough:'러프',sand:'벙커',water:'워터 해저드',ob:'OB'};
const defaultCaddyMessage='두 손가락으로 확대하고, 공을 보낼 방향으로 조이스틱을 밀어요.';
const caddyFace=()=>'<span class="caddy-face" aria-hidden="true"><img class="caddy-portrait" src="./assets/brand/plpak.webp" width="768" height="1024" alt="" draggable="false"></span>';
function caddyMessage(){return feedback||defaultCaddyMessage;}
function showCaddyMessage(){modal(`<div class="caddy-detail-heading">${caddyFace()}<h2 id="modal-title">플팍의 안내</h2></div><p class="caddy-full-message">${escape(caddyMessage())}</p><button class="primary full" data-action="close">플레이 계속하기</button>`);}
function renderGame(){
  clearGameControls();
  const r=state.round;if(!r){state.page='home';home();return;}
  const h=r.layout[r.holeIndex],p=r.players[r.active],c=currentCourse(),near=distance(p.ball,h.cup)<=12,ready=r.status==='playing'&&!p.needsRelief;
  app.innerHTML=`<div class="game-shell immersive-game ${r.players.some(p=>!p.holed&&p.strokes===0)?'tee-waiting':''} ${isPlus(state.membership)?'plus-game':''}"><header class="game-header"><button class="icon-button" data-action="pause" aria-label="일시 정지">${icon('back')}</button><div class="hole-heading"><span class="course-title"><span class="course-half">${r.holeIndex<9?'전반':'후반'}</span><b>${c.name}</b></span><h1><strong>${h.number}</strong>홀</h1><span class="hole-par">파 ${h.par}</span><span class="hole-length">${h.length}m</span></div></header>
  <div class="game-progress" aria-label="전체 18홀 중 ${r.holeIndex+1}번 홀">${r.layout.map((_,i)=>`<span class="${i<r.holeIndex?'done':i===r.holeIndex?'current':''}"></span>`).join('')}</div>
  <div class="game-layout"><section class="field-area" style="--course-grass:${c.accent}" aria-label="코스와 샷 조작"><div class="map-wrapper">${holeArt(h,c)}</div>
  <div class="field-toolbar"><button class="terrain-readout" data-action="terrain-guide" aria-label="경사 그리드 읽는 법"><span id="elevation-value"></span><strong id="slope-value"></strong></button><div class="map-tools" aria-label="지도 확대 조절"><button data-action="zoom-out" aria-label="코스 축소">−</button><button data-action="zoom" aria-label="코스 전체 보기"><span id="zoom-value">전체</span></button><button data-action="zoom-in" aria-label="코스 확대">+</button></div></div>
  <button class="caddy-radio stage-note" data-action="caddy-message" aria-label="플팍 안내: ${escape(caddyMessage())}" aria-describedby="caddy-read-hint"><span class="caddy-heading">${caddyFace()}<span class="caddy-name">플팍 ${icon('chevron',16)}</span></span><span class="caddy-copy-window"><span class="caddy-copy-text">${escape(caddyMessage())}</span></span><span class="sr-only" id="caddy-read-hint">누르면 전체 안내를 읽을 수 있어요.</span></button>
  <section class="joystick-dock" aria-label="경기 상태와 샷 조작"><div class="game-status" role="group" aria-label="경기 상태"><div class="turn-summary">${isPlus(state.membership)&&p.id===0?'<span class="game-plus-tag">✦ PLUS</span>':''}<small>${escape(p.name)}님의 차례</small><strong>${p.strokes+p.holePenalty+1}<span>번째 샷</span></strong></div><div><small>홀컵까지</small><strong>${distance(p.ball,h.cup).toFixed(1)}<span>m</span></strong></div><div aria-label="현재 홀 ${p.strokes+p.holePenalty}타${p.holePenalty?', 벌타 '+p.holePenalty+'타 포함':''}"><small>${p.holePenalty?'벌타 +'+p.holePenalty:'현재 홀'}</small><strong>${p.strokes+p.holePenalty}<span>타</span></strong></div></div><div class="stick-instruction sr-only" id="stick-instruction">${ready?'밀어서 조준 · 손을 놓으면 샷!':p.needsRelief?'워터 해저드 처치를 먼저 확인해요':'멋진 홀아웃! 결과를 확인해요'}</div><div class="joystick-console"><div class="stick-readout"><strong id="power-value">0<small>%</small></strong><span>파워</span><span id="expected-value" class="sr-only">0m</span><div class="power-meter sr-only"><i id="power-meter-fill"></i></div></div>
  <div id="joystick" class="joystick ${!ready?'unavailable':''}" tabindex="${ready?'0':'-1'}" role="button" aria-label="샷 조이스틱" aria-disabled="${!ready}" aria-describedby="joystick-help" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space"><span class="stick-axis x"></span><span class="stick-axis y"></span><span class="stick-north">▲</span><span class="stick-thumb">${icon('target',25)}</span></div></div><p id="joystick-help" class="sr-only">보낼 방향으로 밀고 손을 놓으면 샷. 멀리 밀수록 강하게. 가운데로 돌아오면 취소. 지도는 두 손가락으로 확대하고 한 손가락으로 이동해요. 키보드 좌우는 방향, 위아래는 힘, Enter는 샷.</p></section>
  ${p.needsRelief?'<button class="primary dock-action" data-action="relief">워터 해저드 처치하기</button>':r.status==='hole-complete'?'<button class="primary dock-action" data-action="hole-result">홀 결과 확인하기</button>':''}</section></div></div>`;
  syncMusic();
  unbindCaddy=bindCaddyMessage($('.stage-note'));
  playerBadges=createPlayerBadges($('.field-area'),r,{plus:isPlus(state.membership),profileFor:p=>p.profile||savedProfile(p.name,p.id),arrival:state.profileArrival});
  state.profileArrival=null;updateAim();updateBalls();applyZoom();
  const joystick=$('#joystick');
  unbindJoystick=bindJoystick(joystick,{start:()=>{gameAudio.resetAim();sound('ready');},limit:shotLimit,canPlay:()=>!mapCamera?.isInteracting&&!state.moving&&!state.eventOpen&&!modalRoot.firstChild&&state.round?.status==='playing'&&!state.round.players[state.round.active].needsRelief,
    preview:shot=>{state.power=shot?.power||0;if(shot)gameAudio.aim(shot.power);if(shot)state.angle=shot.angle-courseRotation();updateAim();$('#stick-instruction').textContent=shot?'손을 놓으면 샷!':'가운데에서 놓으면 취소돼요';},
    release:shot=>{state.angle=shot.angle-courseRotation();state.power=shot.power;shoot();},cancel:()=>{sound('cancel');state.power=0;updateAim();$('#stick-instruction').textContent='밀어서 조준 · 손을 놓으면 샷!';}});
  joystick.addEventListener('keydown',e=>{if(state.moving||state.eventOpen||modalRoot.firstChild||!ready)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Escape'].includes(e.key))e.preventDefault();else return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight')state.angle+=(e.key==='ArrowLeft'?-1:1)*Math.PI/90;
    if(e.key==='ArrowUp'||e.key==='ArrowDown')state.power=Math.max(0,Math.min(shotLimit(),state.power+(e.key==='ArrowUp'?1:-1)*shotLimit()/40));
    if(e.key==='Escape'){state.power=0;sound('cancel');}if(e.key.startsWith('Arrow'))gameAudio.aim(state.power);if(e.key==='Enter'||e.key===' '){if(!e.repeat)shoot();return;}updateAim();});
}
function courseRotation(){return $('#course-map')?.dataset.viewAxis==='horizontal'?Math.PI/2:0;}
function visualScale(){const matrix=$('#course-map')?.getScreenCTM();return matrix?Math.hypot(matrix.a,matrix.b):1;}
function renderAimVisual(){const r=state.round;if(!r||!$('#aim-layer'))return;const p=r.players[r.active],h=r.layout[r.holeIndex];$('#aim-layer').innerHTML=r.status==='playing'&&!p.needsRelief&&!state.moving?aimVisual(p.ball,h.cup,state.angle,state.power?expectedDistance(state.power,'fairway'):0,visualScale()):'';}
function updateAim(){
  const r=state.round;if(!r||!$('#aim-layer'))return;const p=r.players[r.active],h=r.layout[r.holeIndex],d=state.power?expectedDistance(state.power,'fairway'):0;
  renderAimVisual();playerBadges?.update();
  $('#power-value').innerHTML=`${Math.round(state.power/shotLimit()*100)}<small>%</small>`;
  $('#expected-value').textContent=`${d.toFixed(1)}m`;
  const elevation=terrainAt(h.cup,h).height-terrainAt(p.ball,h).height,local=terrainAt(p.ball,h),grade=Math.hypot(local.dx,local.dy),down=Math.atan2(-local.dy,-local.dx)+courseRotation(),arrows=['→','↘','↓','↙','←','↖','↑','↗'];
  $('#elevation-value').textContent=Math.abs(elevation)<.1?'홀컵과 비슷한 높이':`홀컵까지 ${elevation>0?'오르막':'내리막'} ${Math.abs(elevation).toFixed(1)}m`;
  $('#slope-value').textContent=grade<.01?'발밑은 평탄해요':`${arrows[(Math.round(down/(Math.PI/4))+8)%8]} 낮은 쪽 · 경사 ${Math.round(grade*100)}%`;
  $('#power-meter-fill').style.width=`${state.power/shotLimit()*100}%`;
  $('#joystick').style.setProperty('--charge',`${state.power/shotLimit()*100}%`);
}
function updateBalls(animatedId=null,position=null,trail=[]){
  const r=state.round;if(!$('#balls-layer'))return;
  $('#trail-layer').innerHTML=trailVisual(trail);
  const latest=[...r.log].reverse().find(shot=>shot.hole===r.holeIndex&&shot.player===r.active);
  $('#relief-layer').innerHTML=animatedId===null&&latest?.event==='ob'?`<g class="ob-resume-marker"><circle cx="${latest.to.x}" cy="${latest.to.y}" r="1.45" fill="none" stroke="#a54722" stroke-width=".28"/><text x="${latest.to.x}" y="${latest.to.y-2}" text-anchor="middle" font-size="2" font-weight="800" fill="#793a1b" stroke="#fffbe6" stroke-width=".65" paint-order="stroke">OB 후 재개</text></g>`:'';
  $('#balls-layer').innerHTML=ballVisuals(r,{animatedId,position,scale:visualScale(),colors:color,style:memberBall(state.membership)});
  playerBadges?.update();
}
function applyZoom(){
 const r=state.round,h=r.layout[r.holeIndex],p=r.players[r.active],svg=$('#course-map');
 const obstacles=()=>{const stage=svg.getBoundingClientRect();return [...document.querySelectorAll('.joystick-dock,.stage-note,.terrain-readout,.map-tools')].map(e=>e.getBoundingClientRect()).filter(b=>b.width&&b.height).map(b=>({left:b.left-stage.left,right:b.right-stage.left,top:b.top-stage.top,bottom:b.bottom-stage.top}));};
 const orient=size=>{const horizontal=landscapeCourse(size);if(svg.dataset.viewAxis!==(horizontal?'horizontal':'vertical'))$('#boundary-layer').innerHTML=boundaryArt(h,{horizontal});svg.dataset.viewAxis=horizontal?'horizontal':'vertical';$('#course-world').setAttribute('transform',horizontal?'matrix(0 1 -1 0 '+h.height+' 0)':'');$('.cup-flag')?.setAttribute('transform',horizontal?'rotate(-90 '+h.cup.x+' '+h.cup.y+')':'');return horizontal;};
 const anchors=(horizontal,near=false,lateral=0)=>{const ballPoints=near?[p.ball]:r.players.filter(p=>!p.holed).map(p=>p.ball),cup=projectCoursePoint(h.cup,h,horizontal);return [...ballPoints.map(b=>({...projectCoursePoint(b,h,horizontal),radius:18})),...((!near||p.strokes===0)&&r.players.some(q=>!q.holed&&q.strokes===0)?[teeWaitingAnchor(h,r.players.filter(q=>!q.holed&&q.strokes===0).length,point=>projectCoursePoint(point,h,horizontal),lateral)]:[]),...(!near||distance(p.ball,h.cup)<20?[{...cup,radius:12},{x:cup.x,y:cup.y-9,radius:5}]:[])];};
 const fit=(bounds,size,horizontal,near=false)=>{let best=null;const waiting=r.players.some(q=>!q.holed&&q.strokes===0)&&(!near||p.strokes===0);for(const lateral of waiting?[0,-48,48,-96,96,-144,144]:[0]){const view=fitCourseFrame(bounds,size,obstacles(),anchors(horizontal,near,lateral));if(!best||(view.fitted&&!best.fitted)||(Boolean(view.fitted)===Boolean(best.fitted)&&view.width<best.width)){best={...view,lateral};}}$('.field-area').dataset.teeOffset=String(best.lateral);return best;};
 const home=size=>{const horizontal=orient(size);return fit(courseFrameBounds(h,horizontal,r.players.filter(p=>!p.holed).map(p=>p.ball)),size,horizontal);};
 const focus=size=>{const horizontal=orient(size),ball=projectCoursePoint(p.ball,h,horizontal),cup=projectCoursePoint(h.cup,h,horizontal),d=distance(p.ball,h.cup),sz=Math.min(32,Math.max(12,d+8)),center=d<20?{x:(ball.x+cup.x)/2,y:(ball.y+cup.y)/2}:ball;return fit({x:center.x-sz/2,y:center.y-sz/2,width:sz,height:sz},size,horizontal,true);};
 mapCamera=bindMapCamera(svg,{home,focus,mode:state.view,canInteract:()=>!state.moving&&!state.eventOpen&&!modalRoot.firstChild&&!$('#joystick')?.classList.contains('dragging'),onChange:(view,zoom)=>{const panel=$('.flag-panel');if(panel)panel.setAttribute('transform','translate('+(h.cup.x+.2)+' '+(h.cup.y-9)+') scale('+Math.max(6/visualScale(),Math.min(1,10/visualScale()))+')');$('#zoom-value').textContent=zoom>1.02?zoom.toFixed(1)+'×':'전체';updateAim();if(!state.moving)updateBalls();}});
}
function gameHelp(){const r=state.round,p=r.players[r.active],h=r.layout[r.holeIndex];modal(`<h2 id="modal-title">밀고, 놓으면 샷!</h2><div class="guide-steps"><div><b>1</b><span><strong>조이스틱으로 방향과 힘 조절</strong><small>보낼 방향으로 밀어요. 멀리 밀수록 강해져요. 손을 놓으면 샷, 가운데로 돌아오면 취소예요.</small></span></div><div><b>2</b><span><strong>두 손가락으로 확대하기</strong><small>코스 위에서 두 손가락을 벌리면 확대, 모으면 축소돼요. 한 손가락으로 지도를 이동하고, 위의 배율 버튼을 누르면 전체 코스로 돌아가요.</small></span></div><div><b>3</b><span><strong>경사와 지면 살펴보기</strong><small>경사 그리드의 점은 낮은 쪽으로 흘러요. 빠를수록 가파르고, 밝은 곳이 높아요. 벙커는 잔디보다 짧게 굴러요.</small></span></div><div><b>4</b><span><strong>말뚝과 장애물 구분하기</strong><small>${h.boundary?'흰 말뚝 구간은 밖으로 나갔다 안에 돌아와 멈추면 계속 플레이해요. 밖에 멈추면 OB 2벌타예요. 붉은 말뚝 구간은 넘어갔다 돌아와도 OB 2벌타예요. 그물망과 바위에 맞으면 공이 감속하며 튕겨요.':'이전 코스의 경계는 밖에 멈추면 OB 2벌타예요. 새 라운드부터 붉은 말뚝·그물망 반사·바위가 적용돼요.'}</small></span></div></div><p>지금 공은 ${lies[lieAt(p.ball,h)]}에 있어요. 홀 근처에서는 약한 힘을 더 세밀하게 조절해요.</p>${courseMusicNote()}<div class="help-actions"><button class="secondary full" data-action="aim-cup">홀컵 방향으로 조준하기</button>${musicButton()}<button class="secondary full" data-action="game-sound" aria-pressed="${state.sound}">효과음 ${state.sound?'켜짐 · 누르면 끄기':'꺼짐 · 누르면 켜기'}</button>${p.strokes>0&&r.status==='playing'?'<button class="text-button full" data-action="relief">공을 칠 수 없을 때 · 언플레이어블 +2</button>':''}</div><button class="text-button full" data-action="guide">전체 도움말 보기</button><button class="primary full" data-action="close">플레이 계속하기</button>`);}
async function showShotEvent(result,player,h){
  const kinds={ob:['ob','OB · 2벌타',result.obReason==='red-crossing'?'붉은 말뚝 경계를 넘었어요. 돌아와도 OB예요.':'공이 경계 밖에 멈췄어요.','벗어난 경계 지점에 공을 놓았어요. 여기서 이어 쳐요.'],cup:['cup','컵인!',`${escape(player.name)}님, ${player.strokes+player.holePenalty}타로 홀아웃!`,scoreLabel(player.strokes+player.holePenalty,h.par)],water:['water','워터 해저드','공이 물에 들어갔어요.','처치 방법을 확인하고 계속해요.'],'cup-miss':['near','아깝다!','홀컵을 지날 때 힘이 너무 강했어요.','조이스틱을 조금만 밀어 부드럽게 굴려요.'],fence:['fence','그물망에 맞았어요','공이 그물망에 맞고 튕겼어요.','멈춘 자리에서 다음 샷을 준비해요.'],rock:['rock','바위에 맞았어요','바위에 부딪혀 공의 방향이 바뀌었어요.','다음에는 바위 옆으로 공략해 보세요.'],tree:['tree','나무에 맞았어요','공이 멈춘 자리에서 다시 도전해요.','나무를 피해 방향을 바꿔 보세요.']};
  const info=kinds[result.event];if(!info)return;
  state.eventOpen=true;
  await new Promise(resolve=>{modal(`<div class="shot-event ${info[0]}"><div class="event-mascot">${mascot('mascot-reaction',info[0]==='cup'?scorePose(player.strokes+player.holePenalty,h.par):'encourage')}<span class="event-symbol">${icon(info[0]==='cup'?'flag':info[0]==='ob'?'close':'target',24)}</span></div><h2 id="modal-title">${info[1]}</h2><p>${info[2]}</p><strong>${info[3]}</strong><button class="primary full" data-action="close-event">계속하기 ${icon('arrow',22)}</button><small>잠시 후 자동으로 닫혀요</small></div>`);eventDone=resolve;eventTimer=setTimeout(closeModal,info[0]==='cup'?3600:5200);modalRoot.querySelector('.modal').classList.add('event-modal');});
  state.eventOpen=false;$('#joystick')?.focus({preventScroll:true});
}
async function shoot(){
  if(state.moving||state.eventOpen||state.round.status!=='playing'||state.power<=0)return;
  state.moving=true;const r=state.round,id=r.active,shotPower=state.power,shotAngle=state.angle,startingLie=lieAt(r.players[id].ball,r.layout[r.holeIndex]),from={...r.players[id].ball};let result;
  document.querySelectorAll('.game-shell button').forEach(e=>e.disabled=true);$('#joystick').setAttribute('aria-disabled','true');$('#joystick').classList.add('unavailable');$('#stick-instruction').textContent='스윙!';
  await playerBadges?.swing(id);
  try{result=takeShot(r,shotAngle,shotPower);}catch(e){state.moving=false;playerBadges?.cancelShot();renderGame();toast(e.message);return;}
  playerBadges?.hideForShot();
  write('round',r);$('#stick-instruction').textContent='공이 굴러가요!';$('#aim-layer').innerHTML='';sound('hit',{power:shotPower,lie:startingLie});
  await new Promise(resolve=>{let impactIndex=0;const begin=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function frame(now){const sample=animationSample(result.frames,(now-begin)/1000,{reduced}),i=sample.index;while(impactIndex<result.impacts.length&&result.impacts[impactIndex].t<=sample.time){const hit=result.impacts[impactIndex++];sound(hit.kind,{power:Math.min(100,hit.speed**2/7.14)});}const recent=result.impacts.filter(hit=>sample.time>=hit.t&&sample.time-hit.t<.3);$('#impact-layer').innerHTML=recent.map(hit=>`<circle class="impact-ring" cx="${hit.position.x}" cy="${hit.position.y}" r="${(8+(sample.time-hit.t)*24)/visualScale()}" opacity="${1-(sample.time-hit.t)/.3}"/>`).join('');updateBalls(id,sample.position,[...result.frames.slice(Math.max(0,i-10),i+1),sample.position]);if(!sample.done)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  state.moving=false;state.profileArrival={id,from};const q=r.players[id];feedback=result.holed?`${scoreLabel(q.strokes+q.holePenalty,r.layout[r.holeIndex].par)}! ${q.name}님, 멋진 홀아웃이에요.`:({ob:'OB 2벌타를 더했어요. 벗어난 경계의 표시된 공에서 이어가요.',water:'공이 물에 들어갔어요. 처치를 확인해 주세요.',sand:'벙커에서는 공이 빨리 멈춰요. 힘을 조금 더 주세요.',rough:'경계가 가까워요. 방향을 잘 살펴보고 쳐요.',fence:'그물망에 맞고 튕겼어요. 멈춘 자리에서 이어 쳐요.',rock:'큰 바위에 맞았어요. 옆으로 돌아가는 길을 찾아봐요.',return:'흰 말뚝 밖으로 나갔다 돌아왔어요. 벌타 없이 계속 플레이해요.',tree:'나무에 맞았어요. 다음에는 옆으로 돌아가 볼까요?',green:'홀컵 가까이 왔어요. 짧게 밀어 부드럽게 굴려요.',fairway:slopeHint(q.ball,r.layout[r.holeIndex],Math.atan2(r.layout[r.holeIndex].cup.y-q.ball.y,r.layout[r.holeIndex].cup.x-q.ball.x)),'cup-miss':'홀컵을 지날 때 힘이 강했어요. 다음에는 조금 약하게!'})[result.event];
  if(r.players.length>1&&r.status==='playing'&&!q.needsRelief)feedback+=` 이제 ${r.players[r.active].name}님의 차례예요.`;
  if(result.holed)sound('cup');else if(['ob','water','sand','tree','cup-miss'].includes(result.event))sound(result.event,{power:shotPower});
  resetAim();renderGame();await showShotEvent(result,q,r.layout[r.holeIndex]);
  if(result.needsRelief)showRelief();else if(r.status==='hole-complete')holeResult();
}

function showRelief(){const p=state.round.players[state.round.active];modal(`<span class="eyebrow">PLPARK RULE GUIDE</span><h2 id="modal-title">${p.needsRelief?'워터 해저드에 들어갔어요':'언플레이어블을 선언할까요?'}</h2><div class="rule-mascot">${mascot('mascot-reaction','encourage')}</div><p>${p.needsRelief?'물에 빠진 지점에서 홀컵에 가까워지지 않는 2클럽 이내의 칠 수 있는 곳을 찾아요. 자리가 없으면 이전 샷 방향으로 이동해요. 벌타는 2타예요.':'2벌타를 더하고 홀컵에 가까워지지 않는 2클럽 이내의 칠 수 있는 곳으로 이동해요. 자리가 없으면 이전 샷 방향으로 이동해요.'}</p><button class="primary full" data-action="confirm-relief">2벌타 확인 · 처치하기</button><button class="text-button full" data-action="close">${p.needsRelief?'코스 다시 살펴보기':'현재 위치에서 플레이'}</button>`);}
function holeResult(){modal(holeResultView(state.round));modalRoot.querySelector('.modal').classList.add('hole-result-modal');}
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
 const feedback=$('#quiz-feedback');feedback.innerHTML=`<div class="quiz-explanation"><strong class="${correct?'correct-text':'wrong-text'}">${correct?'정답이에요!':'괜찮아요, 함께 알아봐요.'}</strong><p class="quiz-correct-answer">정답 · ${escape(q.answers[q.correct])}</p><div class="quiz-caddy">${mascot('mascot-reaction',correct?'praise':'encourage')}<p>${escape(q.explanation)}</p></div>${correct?'':'<p class="quiz-review-note">오답 노트에 저장했어요. 나중에 다시 맞히면 복습 목록에서 빠져요.</p>'}</div><button class="primary full" data-action="${current.inGame?'advance':'next-quiz'}">${current.inGame?'라운드 계속하기':practice.used.length>=practice.size?'학습 결과 보기':'다음 문제 풀기'} ${icon('arrow',17)}</button>`;
 modalRoot.querySelector('.quiz-skip')?.remove();feedback.focus({preventScroll:true});feedback.scrollIntoView({block:'nearest',behavior:'smooth'});
 if(correct)sound('cup');
}
function startPractice(review=false){
 const pool=filterQuestions(state.quizFilter),eligible=pool.filter(q=>!review||state.quizProgress[q.id]?.lastResult==='wrong');
 if(!eligible.length){toast(review?'선택한 주제와 난이도에 복습할 오답이 없어요.':'선택한 조건의 문제가 없어요.');return;}
 practice={review,pool,used:[],correct:0,size:Math.min(5,eligible.length)};
 const q=pickQuestion({pool,progress:state.quizProgress,review});if(!q)return;
 practice.used.push(q.id);quiz(q.id);
}
function nextPractice(){
 if(!practice||!activeQuiz?.answered)return;
 const q=practice.used.length<practice.size?pickQuestion({pool:practice.pool,progress:state.quizProgress,used:practice.used,review:practice.review}):null;
 if(q){practice.used.push(q.id);quiz(q.id);return;}
 const answered=practice.used.length,correct=practice.correct,s=stats(state.quizProgress);activeQuiz=null;
 rulesPage();modal(`<span class="eyebrow">오늘도 한 걸음!</span><h2 id="modal-title">${answered}문제를 함께 풀었어요</h2><div class="result-mascot">${mascot('mascot-reaction','celebrate')}</div><div class="quiz-session-result"><b>${correct} / ${answered}</b><span>이번 학습에서 맞힌 문제</span></div><p>지금까지 ${s.seen}문제를 만났어요. ${s.review?'틀린 '+s.review+'문제는 오답 복습에서 다시 만나요.':'배운 규칙을 다음 라운드에서 떠올려 보세요.'}</p><button class="primary full" data-action="finish-quiz">규칙 노트로 돌아가기</button>`);
}
function nextStep(){const r=state.round;if(r.status!=='hole-complete')return;if(state.help&&!r.quizDone?.[r.holeIndex]){const q=roundQuestion(r,state.quizProgress);write('round',r);if(q){quiz(q.id,true);return;}}advance();}

function advance(){const r=state.round;if(r.status!=='hole-complete')return;advanceHole(r);closeModal();if(r.status==='complete'){completeRound();return;}write('round',r);feedback=r.holeIndex===9?'후반 코스에 도착했어요! 새로운 9홀도 함께 즐겨요.':lessons[r.layout[r.holeIndex].lesson].text;resetAim();renderGame();}
async function completeRound(){
 const r=state.round,record=makeRecord(r);state.records=mergeRecords(state.records,[record]);let stored=false;
 try{await saveRecords([record]);stored=true;}catch{stored=write('records',state.records);}
 if(stored){write('round',null);syncMembership();}
 window.dispatchEvent(new CustomEvent('playpark:round-complete',{detail:structuredClone(record)}));
 showFinal(record,stored);
}
function showFinal(record,stored=true){sound('complete');state.page='records';state.recordKey=record.key;state.recordPlayer=record.players[0].name;state.round=null;recordsPage();openRecord(record,true,stored);}
async function openRecord(record,final=false,stored=true){
 closeModal();const serial=++cardSerial;
 modal(`<span class="eyebrow">PARK PLAYER SCORECARD</span><h2 id="modal-title">${final?'18홀 완주! 수고하셨어요':'우리의 18홀 스코어카드'}</h2><p>${stored?'이 기기의 누적 기록에 저장했어요.':'기기에 저장하지 못했어요. 아래 이미지를 꼭 저장해 주세요.'}</p><div class="final-ranks">${rankPlayers(record.players).map(p=>`<div><span class="rank-number">${p.rank}</span><b>${escape(p.name)}</b><strong>${total(p)}<small> 타</small></strong></div>`).join('')}</div>${roundGrowthView(record,state.records,{final,stored,membership:state.membership})}<div id="scorecard-image" aria-live="polite"><p>스코어카드를 만들고 있어요…</p></div><div class="scorecard-actions"><button class="primary" data-action="save-score-image" disabled>이미지 저장</button><button class="secondary" data-action="share-score-image" disabled>이미지 공유</button></div><p class="fine-print image-save-help">PNG 이미지로 저장해요. 휴대폰에서는 이미지 공유 메뉴에서 사진 저장을 선택하거나, 이미지를 길게 눌러 저장할 수 있어요.</p><button class="text-button full" data-action="close">누적 기록과 분석 보기</button>${final?'<button class="text-button full" data-action="finish">다음 라운드 만나러 가기</button>':''}`,true);
 try{const result=await scorecardImage(record,{theme:isPlus(state.membership)?state.membership.cardStyle:'classic'});if(serial!==cardSerial||!$('#scorecard-image'))return;cardExport={...result,url:URL.createObjectURL(result.blob)};cardExport.file=new File([result.blob],result.filename,{type:'image/png'});
 $('#scorecard-image').innerHTML=`<img class="scorecard-preview" src="${cardExport.url}" alt="${escape(record.players.map(p=>p.name+' '+total(p)+'타').join(', '))}. 전후반 18홀 스코어카드" width="${result.width}" height="${result.height}">`;
 $('[data-action="save-score-image"]').disabled=false;const share=$('[data-action="share-score-image"]');share.disabled=false;share.hidden=!navigator.canShare?.({files:[cardExport.file]});
 }catch{if(serial===cardSerial&&$('#scorecard-image'))$('#scorecard-image').innerHTML='<p>이미지를 만들지 못했어요. 카드를 다시 열어 주세요.</p>';}
}
function saveScoreImage(){if(!cardExport)return;const a=document.createElement('a');a.href=cardExport.url;a.download=cardExport.filename;document.body.append(a);a.click();a.remove();toast('스코어카드 이미지 저장을 요청했어요.');}
async function shareScoreImage(){if(!cardExport)return;try{await navigator.share({files:[cardExport.file],title:APP_INFO.name+' 18홀 스코어카드'});}catch(e){if(e.name!=='AbortError')toast('공유할 수 없어요. 이미지 저장을 이용해 주세요.');}}
function formatDiff(n){return n===0?'E':n>0?`+${n}`:String(n);}
function scorecardCell(score,h){
 if(!Number.isInteger(score)||score<=0)return '<td class="scorecard-hole-cell pending" aria-label="'+h.number+'번 홀 미완료">–</td>';
 const label=scoreLabel(score,h.par),tone=score<h.par?'under':score>h.par?'over':'even';
 return `<td class="scorecard-hole-cell ${tone}"><strong class="scorecard-strokes">${score}</strong><span class="scorecard-result">${label}</span></td>`;
}
function scorecard(){
 const r=state.round;if(!r)return;
 modal(`<span class="eyebrow">MY SCORECARD</span><h2 id="modal-title">우리의 18홀 기록</h2><p class="scorecard-scroll-hint">좌우로 밀어 홀별 타수와 결과를 확인하세요.</p><div class="score-tables">${[0,9].map(offset=>`<h3>${offset===0?'전반 OUT':'후반 IN'} · ${r.layout[offset].courseName}</h3><div class="table-scroll" tabindex="0" role="region" aria-label="${offset===0?'전반':'후반'} 홀별 타수와 결과"><table><thead><tr><th scope="col">홀</th>${r.layout.slice(offset,offset+9).map(h=>`<th scope="col">${h.number}</th>`).join('')}<th scope="col">합계</th></tr></thead><tbody><tr class="par-row"><th scope="row">PAR</th>${r.layout.slice(offset,offset+9).map(h=>`<td>${h.par}</td>`).join('')}<td>33</td></tr>${r.players.map(p=>`<tr><th scope="row">${escape(p.name)}</th>${r.layout.slice(offset,offset+9).map((h,j)=>scorecardCell(p.scores[offset+j],h)).join('')}<td class="scorecard-half-total">${p.scores.slice(offset,offset+9).reduce((a,b)=>a+b,0)||'–'}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div><p class="fine-print">모든 타수는 벌타를 포함해요. 홀아웃한 홀만 기록합니다.</p><button class="primary full" data-action="${r.status==='hole-complete'?'hole-result':'close'}">${r.status==='hole-complete'?'홀 결과로 돌아가기':'라운드로 돌아가기'}</button>`,true);
 modalRoot.querySelector('.modal').classList.add('scorecard-modal');
}

function recordsPage(){
 const names=[...new Set(state.records.flatMap(r=>r.players.map(p=>p.name)))];if(!names.includes(state.recordPlayer))state.recordPlayer=names[0];
 const keys=[...new Set(entriesFor(state.records,state.recordPlayer).map(e=>e.record.key))];if(!keys.includes(state.recordKey))state.recordKey=keys[0];
 shell(recordsView(state.records,{player:state.recordPlayer,key:state.recordKey,visible:state.recordsVisible||20})+premiumReview(state.records,state.recordPlayer,state.recordKey,state.membership));
}
function rulesPage(){
 const s=stats(state.quizProgress),pool=filterQuestions(state.quizFilter),missed=pool.filter(q=>state.quizProgress[q.id]?.lastResult==='wrong').length;
 shell(`<div class="page-heading"><span class="eyebrow">LEARN WITH PLPAK</span><h1>알수록 즐거운 파크골프</h1><p>상황별 퀴즈 ${questions.length}문제로, 필드 위 자신감을 쌓아요.</p></div><div class="learning-banner">${mascot()}<div><h3>${s.mastered}문제를 익혔어요!</h3><p>지금까지 ${s.seen}문제를 풀었어요 · 복습할 오답 ${s.review}개</p><div class="learning-progress" role="progressbar" aria-label="최근 풀이에서 맞힌 문제" aria-valuenow="${s.mastered}" aria-valuemin="0" aria-valuemax="${questions.length}"><span style="width:${s.mastered/questions.length*100}%"></span></div></div><b>${s.mastered} <small>/ ${questions.length}</small></b></div><section class="quiz-library" aria-label="퀴즈 학습 설정"><div class="quiz-filters"><label class="field">배울 주제<select id="quiz-topic"><option value="all">모든 주제</option>${Object.entries(topics).map(([id,name])=>`<option value="${id}" ${state.quizFilter.topic===id?'selected':''}>${name}</option>`).join('')}</select></label><label class="field">난이도<select id="quiz-difficulty"><option value="all">모든 난이도</option>${Object.entries(levels).map(([id,name])=>`<option value="${id}" ${state.quizFilter.difficulty===id?'selected':''}>${name}</option>`).join('')}</select></label></div><div class="quiz-practice-actions"><button class="primary" data-action="practice" ${!pool.length?'disabled':''}>${icon('play',20)} 5문제 풀기</button><button class="secondary" data-action="review-quiz" ${!missed?'disabled':''}>${icon('book',20)} 틀린 문제 복습 (${missed})</button></div><p class="quiz-local-note">학습 기록은 이 기기에 저장돼요. 처음 만나는 문제부터 골라 드려요.</p></section>${!pool.length?'<p class="info-panel">이 조건에 맞는 문제가 없어요. 다른 주제나 난이도를 선택해 주세요.</p>':''}`);
}

function guide(){if(state.page!=='help')state.helpReturn=state.page;closeModal();state.page='help';render();window.scrollTo(0,0);$('#help-title')?.focus({preventScroll:true});}
function helpPage(){shell(`<section class="help-page"><div class="page-heading"><span class="eyebrow">HELP</span><h1 id="help-title" tabindex="-1">도움말</h1><p>플팍과 함께, 하나씩 익혀 보세요.</p><button class="secondary help-return" data-action="help-back">${icon('back',20)} ${state.helpReturn==='game'&&state.round?'플레이로 돌아가기':'이전 화면으로'}</button></div><div class="help-grid"><section class="help-card" aria-labelledby="help-play"><h2 id="help-play">플레이 방법</h2><div class="guide-steps"><div><b>1</b><span><strong>코스 2개를 골라요</strong><small>10개 구장마다 2~8개 코스가 있어요. 구장을 고르고 열린 코스 2개를 선택해요. 첫 코스는 전반 9홀, 다음 코스는 후반 9홀이에요. 혼자 도전하거나 한 기기로 최대 4명이 함께해요.</small></span></div><div><b>2</b><span><strong>밀어서 조준하고, 놓으면 샷!</strong><small>조이스틱을 공을 보낼 방향으로 밀어요. 멀리 밀수록 강해져요. 취소하려면 가운데로 돌아와 손을 놓으세요.</small></span></div><div><b>3</b><span><strong>홀컵 가까이에서는 살살</strong><small>홀컵 근처에서는 작은 힘도 세밀하게 조절할 수 있어요. 18홀을 모두 마친 뒤, 벌타를 포함한 최저 타수로 겨뤄요. 동점은 공동 순위예요.</small></span></div></div></section><section class="help-card" aria-labelledby="help-course"><h2 id="help-course">코스 살펴보기</h2><h3>두 손가락으로 확대</h3><p>코스 위에서 두 손가락을 벌리면 확대, 모으면 축소돼요. 한 손가락으로 지도를 옮기고 배율 버튼을 누르면 전체 코스를 볼 수 있어요.</p><h3>그리드로 경사 읽기</h3><p>밝은 곳은 높고 어두운 곳은 낮아요. 격자 위의 점은 낮은 쪽으로 흐르며, 빠를수록 가팔라요. 오르막은 더 강하게, 내리막은 더 약하게 쳐 보세요.</p><h3>내 공과 친구의 공 찾기</h3><p>공 옆에 프로필·플레이어 번호·이름이 함께 표시돼요. 라운드 설정에서 아바타나 사진을 고를 수 있어요. 티샷 전에는 티 패드 뒤에서 기다려요. 짧게 스윙한 뒤 공이 굴러가는 동안에는 프로필이 숨겨지고, 공이 멈추면 그 옆에 다시 나타나요. 표시선은 해당 공을 가리키고, 현재 차례의 프로필 테두리가 강조됩니다.</p><h3>경계와 벙커 주의</h3><p>흰 말뚝 구간은 밖으로 나갔다 안에 돌아와 멈추면 계속 플레이해요. 붉은 말뚝 구간은 넘어갔다 돌아와도 OB 2벌타예요. 흰 구간도 밖에 멈추면 OB예요. OB는 넘어간 경계 부근에서 이어 쳐요. 그물망과 바위에 맞으면 감속하며 튕기고, 벙커에서는 짧게 굴러요.</p></section><section class="help-card" aria-labelledby="help-records"><h2 id="help-records">퀴즈와 나의 기록</h2><p>규칙 메뉴에서 ${questions.length}문항을 주제·난이도별로 5문제씩 풀고, 틀린 문제를 복습해요. 퀴즈 정답 여부는 골프 타수에 영향을 주지 않아요.</p><p>기록 메뉴에서 누적 성적과 코스별 분석을 보고, 완주 스코어카드를 이미지로 저장하거나 공유할 수 있어요.</p><p class="help-note">플레이 기록과 퀴즈 진행 상황은 현재 기기와 브라우저에 저장돼요. 다른 기기로 자동 옮겨지지는 않아요.</p></section><section class="help-card" aria-labelledby="help-growth"><h2 id="help-growth">성장 포인트와 등급</h2>${growthGuide()}<h3>새 코스 열기</h3>${courseUnlockGuide()}</section><section class="help-card"><h2>무료와 PLUS</h2><p>무료는 평창·한강·김제·진주에서 시작해 누적 포인트로 다른 구장을 획득해요. PLUS는 10개 구장을 바로 이용하고 상급 코스가 2단계 일찍 열려요.</p><p>PLUS 전용 공, 골드 스코어카드, 홀별 복기 리포트를 이용할 수 있어요. 테스트 사용자의 기록은 계정마다 따로 저장돼요.</p><button class="secondary" data-action="membership">멤버십과 테스트 사용자 보기</button></section><section class="help-card" aria-labelledby="help-sound"><h2 id="help-sound">음악과 효과음</h2><p>숲길·물가·해안·꽃길·들녘·산악에 맞춘 6가지 음악이 코스를 따라 바뀌어요. 같은 테마에서도 코스마다 반주에 변화를 주며, 홀컵 가까이에서는 리듬이 조금 더해져요.</p><ul>${MUSIC_THEMES.map(s=>`<li>${s.mood} · ${s.title}</li>`).join('')}</ul><p>배경음악과 타격·컵인 효과음을 각각 켜고 끌 수 있어요. 선택은 이 기기에 저장돼요.</p>${musicButton()}<button class="secondary full" data-action="game-sound" aria-pressed="${state.sound}">효과음 ${state.sound?'켜짐 · 누르면 끄기':'꺼짐 · 누르면 켜기'}</button></section></div><footer class="help-about" aria-labelledby="help-about-title"><h2 id="help-about-title">서비스 정보</h2><dl><div><dt>게임 이름</dt><dd>${APP_INFO.name} · ${APP_INFO.koreanName}</dd></div><div><dt>제공 회사</dt><dd>${APP_INFO.provider}</dd></div><div><dt>버전</dt><dd>${APP_INFO.version}</dd></div></dl></footer></section>`);}

function pause(){if(state.moving)return;modal(`<span class="eyebrow">TAKE A LITTLE BREAK</span><h2 id="modal-title" data-music-pause>잠깐, 쉬어가도 괜찮아요</h2><p>현재 위치와 타수는 자동으로 저장되어 있어요.</p><div class="round-player-list">${state.round.players.map(p=>`<div>${avatarImage(p.profile||savedProfile(p.name,p.id),p.id)}<b>${p.id+1}. ${escape(p.name)}</b></div>`).join('')}</div><button class="primary full" data-action="close">라운드 계속하기 ${icon('play',17)}</button><div class="pause-tools"><button class="secondary" data-action="scorecard">${icon('book',20)} 스코어카드</button><button class="secondary" data-action="control-guide">${icon('help',20)} 게임 도움말</button></div>${courseMusicNote()}${musicButton()}<button class="secondary full" data-action="lobby">저장하고 로비로</button>`);}
function download(id){const r=state.records.find(r=>r.id===id);if(r)openRecord(r);}
function toggleSelect(id){const c=courses.find(c=>c.id===id);if(!c)return;if(!courseAccess(c,coursePoints()).unlocked){courseDetail(id);return;}const i=state.selected.indexOf(id);if(i>=0)state.selected.splice(i,1);else if(state.selected.length<2)state.selected.push(id);else{toast('선택한 코스를 하나 해제하면 다른 코스를 고를 수 있어요.');return;}render();}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;const a=btn.dataset.action;if(a==='close-event'){closeModal();return;}if(state.moving||state.eventOpen)return;switch(a){
 case 'choose-avatar':setPlayerProfile(Number(btn.dataset.index),{kind:'avatar',id:btn.dataset.id});break;
 case 'membership':closeModal();state.page='membership';render();window.scrollTo(0,0);break;
 case 'switch-profile':try{if(state.round&&state.round.status!=='complete')write('round',state.round);selectProfile(btn.dataset.id);location.reload();}catch{toast('사용자 전환을 저장하지 못했어요.');}break;
 case 'member-venue':state.page='home';chooseVenue(btn.dataset.id);render();$('#active-venue-title')?.scrollIntoView({block:'start'});break;
 case 'ball-style':if(BALL_STYLES.some(s=>s.id===btn.dataset.id)&&(isPlus(state.membership)||btn.dataset.id==='classic'))changeMembership({ballStyle:btn.dataset.id});break;
 case 'card-style':if(['classic','gold'].includes(btn.dataset.id)&&(isPlus(state.membership)||btn.dataset.id==='classic'))changeMembership({cardStyle:btn.dataset.id});break;
 case 'reset-member-test':if(SESSION.demo)changeMembership({testPoints:0,earnedVenues:[]});break;
  case 'save-score-image':saveScoreImage();break;
  case 'share-score-image':shareScoreImage();break;
  case 'more-records':state.recordsVisible=(state.recordsVisible||20)+20;recordsPage();break;
  case 'nav':if(btn.dataset.page==='help'){guide();break;}closeModal();state.page=btn.dataset.page;render();window.scrollTo(0,0);break;
  case 'help-back':state.page=state.helpReturn==='game'&&!state.round?'home':state.helpReturn||'home';state.helpReturn=null;render();window.scrollTo(0,0);break;
  case 'venue':chooseVenue(btn.dataset.id);break;
  case 'select':toggleSelect(btn.dataset.id);break;
  case 'select-from-detail':if(!courseAccess(courses.find(c=>c.id===btn.dataset.id),coursePoints()).unlocked){toast('등급을 올리면 이 코스를 선택할 수 있어요.');break;}closeModal();state.page='home';const targetCourse=courses.find(c=>c.id===btn.dataset.id);if(targetCourse.venueId!==state.venueId){state.venueId=targetCourse.venueId;write('venue',state.venueId);state.selected=[];}if(!state.selected.includes(btn.dataset.id)){if(state.selected.length===2)state.selected.pop();state.selected.push(btn.dataset.id);}render();break;
  case 'swap':state.selected.reverse();render();break;
  case 'guide':guide();break;
  case 'close':closeModal();break;
  case 'music':state.music=!state.music;write('music',state.music);syncMusic();document.querySelectorAll('[data-action="music"]').forEach(el=>{el.textContent='배경음악 '+(state.music?'켜짐 · 누르면 끄기':'꺼짐 · 누르면 켜기');el.setAttribute('aria-pressed',String(state.music));});break;
  case 'game-sound':state.sound=!state.sound;gameAudio.mute();write('sound',state.sound);btn.textContent='효과음 '+(state.sound?'켜짐 · 누르면 끄기':'꺼짐 · 누르면 켜기');btn.setAttribute('aria-pressed',String(state.sound));if(state.sound)sound('ready');break;
  case 'sound':state.sound=!state.sound;gameAudio.mute();write('sound',state.sound);toast(`효과음을 ${state.sound?'켰어요':'껐어요'}.`);render();break;
  case 'setup':state.names[0]=state.coursePlayer;setup();break;
  case 'new-course-player':newCoursePlayer();break;
  case 'use-course-player':if(chooseCoursePlayer($('#new-course-player')?.value||'')){closeModal();render();$('#course-player')?.focus({preventScroll:true});}break;
  case 'reselect-courses':if(chooseCoursePlayer(state.names[0])){closeModal();state.page='home';render();$('#course-player')?.scrollIntoView({block:'center'});}break;
  case 'mode':state.mode=Number(btn.dataset.mode);setup();break;
  case 'start':start();break;
  case 'resume':write('round',state.round);state.page='game';feedback='다시 만나서 반가워요! 저장한 위치에서 이어갈게요.';resetAim();render();window.scrollTo(0,0);if(state.round.status==='hole-complete')holeResult();break;
  case 'course-detail':courseDetail(btn.dataset.id);break;
  case 'hole-preview':holePreview(btn.dataset.course,Number(btn.dataset.hole),btn.dataset.previewDirection);break;
  case 'shoot':shoot();break;
  case 'terrain-guide':{const h=state.round.layout[state.round.holeIndex],p=state.round.players[state.round.active];modal(`<h2 id="modal-title">경사를 읽으면 더 재미있어요</h2><div class="terrain-key"><span>낮음</span><i aria-hidden="true"></i><span>높음</span></div><div class="quiz-caddy">${mascot()}<p>${slopeHint(p.ball,h,state.angle)}</p></div><div class="guide-steps"><div><b>1</b><span><strong>격자 위의 점은 낮은 쪽으로</strong><small>흐르는 점을 보면 공이 휘어질 방향을 알 수 있어요. 점이 빠르게 흐를수록 가파른 경사예요.</small></span></div><div><b>2</b><span><strong>밝은 곳은 높고, 어두운 곳은 낮아요</strong><small>격자 한 칸은 6m예요. 같은 간격의 격자 안에서 밝기를 비교하세요. 화면 동작 줄이기를 켜면 점은 멈추고, 밝기로 높낮이를 볼 수 있어요.</small></span></div><div><b>3</b><span><strong>오르막은 강하게, 내리막은 약하게</strong><small>조이스틱의 평지 거리는 기준이에요. 실제 거리는 경사와 잔디에 따라 달라져요.</small></span></div></div><button class="primary full" data-action="close">경사를 보며 쳐 볼게요</button>`);break;}
  case 'control-guide':gameHelp();break;
  case 'caddy-message':showCaddyMessage();break;
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
  case 'practice':startPractice(false);break;
  case 'review-quiz':startPractice(true);break;
  case 'next-quiz':nextPractice();break;
  case 'game-rule':{const l=lessons[state.round.layout[state.round.holeIndex].lesson];modal(`<span class="eyebrow">플팍의 규칙 안내</span><h2 id="modal-title">${l.title}</h2><div class="quiz-caddy">${mascot()}<p>${l.text}</p></div><button class="primary full" data-action="close">플레이 계속하기</button>`);break;}
  case 'answer':answer(btn);break;
  case 'finish-quiz':closeModal();render();$('#quiz-topic')?.focus({preventScroll:true});break;
  case 'relief':showRelief();break;
  case 'confirm-relief':try{takeRelief(state.round);write('round',state.round);feedback='언플레이어블 2벌타를 더하고 공을 놓았어요. 다음 샷을 준비해요.';closeModal();resetAim();renderGame();}catch(err){toast(err.message);}break;
  case 'download':download(btn.dataset.id);break;
  case 'finish':closeModal();state.page='home';render();break;
}});
document.addEventListener('input',e=>{if(e.target.matches('.name-input')){state.names[Number(e.target.dataset.index)]=e.target.value;refreshProfileEditor(Number(e.target.dataset.index));if(e.target.dataset.index==='0')updateSetupAccess();}if(state.moving)return;});
document.addEventListener('change',async e=>{if(e.target.matches('[data-profile-file]')){const input=e.target,index=Number(input.dataset.profileFile),name=state.names[index],file=input.files?.[0];if(!file)return;input.disabled=true;try{const profile=await prepareProfilePhoto(file);if(input.isConnected&&state.names[index]===name){if(setPlayerProfile(index,profile))toast('프로필 사진을 적용했어요.');}}catch(error){toast(error.message||'사진을 읽을 수 없어요. 다른 사진을 선택해 주세요.');}finally{input.disabled=false;input.value='';}return;}if(e.target.id==='test-plan'&&SESSION.demo){changeMembership({plan:e.target.value==='plus'?'plus':'free'});return;}if(e.target.id==='test-points'&&SESSION.demo){const value=e.target.value;changeMembership({testPoints:value==='actual'?null:Math.min(8000,Math.max(0,Number(value)||0))});return;}if(e.target.id==='venue-select'){chooseVenue(e.target.value);return;}if(e.target.id==='course-player'&&chooseCoursePlayer(e.target.value)){render();$('#course-player')?.focus({preventScroll:true});}if(e.target.id==='quiz-topic'||e.target.id==='quiz-difficulty'){const id=e.target.id;state.quizFilter[id==='quiz-topic'?'topic':'difficulty']=e.target.value;rulesPage();document.getElementById(id)?.focus();}if(e.target.id==='player-count'){state.mode=Number(e.target.value);setup();}if(e.target.id==='learn-toggle'){state.help=e.target.checked;write('help',state.help);}if(e.target.id==='record-player'){state.recordPlayer=e.target.value;state.recordsVisible=20;state.recordKey=null;recordsPage();}if(e.target.id==='record-filter'){state.recordKey=e.target.value;recordsPage();}});
window.addEventListener('pagehide',()=>{gameMusic.hide();if(state.round&&state.round.status!=='complete')write('round',state.round);});
if('serviceWorker'in navigator&&!['localhost','127.0.0.1'].includes(location.hostname))navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
// Host apps listen to playpark:round-complete and explicitly forward data to their authenticated backend.
// No credentials, fabricated remote rankings, or cross-origin message listeners are embedded here.
window.PlayparkGame=Object.freeze({version:APP_INFO.version,ruleset:RULESET,getLastResult:()=>structuredClone(state.records[0]||null),getMembership:()=>structuredClone(state.membership)});
try{state.records=await loadRecords(state.records);write('records',null);}catch{state.records=mergeRecords(state.records);}
const rememberedPlayer=read('course-player',null);state.coursePlayer=typeof rememberedPlayer==='string'&&rememberedPlayer.trim()?rememberedPlayer.trim():saved?.players[0]?.name||state.records[0]?.players[0]?.name||(SESSION.demo?SESSION.name:'나');state.names[0]=state.coursePlayer;const knownCoursePlayers=read('course-players',[]);state.coursePlayers=[...new Set([state.coursePlayer,...(Array.isArray(knownCoursePlayers)?knownCoursePlayers.filter(n=>typeof n==='string'&&n.trim()):[])])];
state.venueId=venueById(read('venue',null))?.id||venues[0].id;state.selected=coursesAtVenue(state.venueId).filter(c=>courseAccess(c,coursePoints()).unlocked).slice(0,2).map(c=>c.id);
render();

if(hadSavedRound&&!saved)toast('저장된 라운드를 재개할 수 없어요. 새 라운드를 시작해 주세요. 완주 기록은 그대로예요.');
