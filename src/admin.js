import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {initializeAuth,inMemoryPersistence,browserPopupRedirectResolver,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {FIREBASE_CONFIG,ADMIN_EMAIL} from './firebase-config.js';
import {FirebaseClient} from './firebase-rest.js';
import {summarizeEvents} from './analytics-data.js';
import {venues} from './venues.js';
import {courses} from './courses.js';
import {topics} from './quiz.js';
const $=id=>document.getElementById(id),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app=initializeApp({apiKey:FIREBASE_CONFIG.apiKey,authDomain:`${FIREBASE_CONFIG.projectId}.firebaseapp.com`,projectId:FIREBASE_CONFIG.projectId});
const auth=initializeAuth(app,{persistence:inMemoryPersistence,popupRedirectResolver:browserPopupRedirectResolver});
const client=new FirebaseClient(FIREBASE_CONFIG);client.tokenProvider=()=>auth.currentUser?.getIdToken()||Promise.reject(Error('관리자 로그인이 필요합니다.'));
const fmt=n=>Number(n||0).toLocaleString('ko-KR'),percent=(a,b)=>b?`${Math.round(a/b*100)}%`:'—';
const nameFor=(kind,id)=>kind==='venue'?(venues.find(x=>x.id===id)?.name||id):kind==='course'?(courses.find(x=>x.id===id)?.name||id):(topics[id]||id);
function table(headers,rows){return rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p>아직 수집된 기록이 없습니다.</p>';}
function metric(label,value){return `<div class="metric"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;}
function render(events){const s=summarizeEvents(events);$('coverage').textContent=`최근 ${fmt(s.events)}건 분석 · 서버 기록 기준`;$('metrics').innerHTML=[['익명 세션',fmt(s.sessions)],['라운드 시작',fmt(s.starts)],['18홀 완주',fmt(s.completions)],['완주율',percent(s.completions,s.starts)],['완료된 홀',fmt(s.holes)],['샷 결과',fmt(s.shots)],['홀 평균 파 대비',s.holes?((s.strokes-s.par)/s.holes).toFixed(1):'—'],['OB / 100홀',s.holes?(s.ob/s.holes*100).toFixed(1):'—'],['퀴즈 정답률',percent(s.quizzes.reduce((n,q)=>n+q.correct,0),s.quizzes.reduce((n,q)=>n+q.answers,0))],['PLUS 화면 조회',fmt(s.plusViews)]].map(([a,b])=>metric(a,b)).join('');
 $('daily').innerHTML=table(['날짜','시작','완주','완료 홀','샷','퀴즈'],s.days.slice(-30).reverse().map(d=>[d.date,fmt(d.starts),fmt(d.completions),fmt(d.holes),fmt(d.shots),fmt(d.quizAnswers)]));
 $('venues').innerHTML=table(['구장','완료 홀','홀 평균 파 대비','OB'],s.venues.map(v=>[nameFor('venue',v.id),fmt(v.holes),((v.strokes-v.par)/v.holes).toFixed(1),fmt(v.ob)]));
 $('courses').innerHTML=table(['코스','완료 홀','홀 평균 파 대비','OB'],s.courses.map(c=>[nameFor('course',c.id),fmt(c.holes),((c.strokes-c.par)/c.holes).toFixed(1),fmt(c.ob)]));
 $('quizzes').innerHTML=table(['주제','응답','정답률'],s.quizzes.map(q=>[nameFor('topic',q.id),fmt(q.answers),percent(q.correct,q.answers)]));
}
async function refresh(){const button=$('refresh');button.disabled=true;$('coverage').textContent='통계를 불러오는 중입니다…';try{render(await client.listEvents(3000));}catch(error){$('coverage').textContent=`통계를 읽지 못했습니다: ${error.message}`;}finally{button.disabled=false;}}
$('login').addEventListener('click',async()=>{const button=$('login');button.disabled=true;$('auth-status').textContent='Google 로그인을 여는 중입니다…';try{const provider=new GoogleAuthProvider();provider.setCustomParameters({login_hint:ADMIN_EMAIL});await signInWithPopup(auth,provider);}catch(error){$('auth-status').textContent=`로그인하지 못했습니다: ${error.message}`;}finally{button.disabled=false;}});
$('refresh').addEventListener('click',refresh);
$('logout').addEventListener('click',()=>void signOut(auth));
onAuthStateChanged(auth,user=>{if(!user){$('auth-panel').hidden=false;$('dashboard').hidden=true;$('auth-status').textContent='';return;}if(user.email?.toLowerCase()!==ADMIN_EMAIL||!user.emailVerified){$('auth-status').textContent='이 계정에는 관리자 권한이 없습니다.';void signOut(auth);return;}$('auth-panel').hidden=true;$('dashboard').hidden=false;void refresh();});
