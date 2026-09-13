import {courses} from './courses.js';
import {playerGrowth} from './progression.js';
import {courseAccess} from './course-access.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>n.toLocaleString('ko-KR');
export const lockIcon='<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>';
export function courseLockNote(c,points){
 const a=courseAccess(c,points);if(a.required.level===1)return '';
 return `<div class="course-access-note ${a.unlocked?'available':'locked'}">${a.unlocked?'':lockIcon}<span><b>${a.unlocked?'도전 가능':'잠김'} · LV ${a.required.level} 코스</b>${a.unlocked?'':`<span>${num(a.remaining)} P 더 모으면 열려요</span>`}</span></div>`;
}
export function coursePlayerView(records,player,knownPlayers=[]){
 const growth=playerGrowth(records,player),names=[...new Set([player,...knownPlayers,...records.flatMap(r=>r.players.map(p=>p.name))])];
 const waiting=courses.filter(c=>!courseAccess(c,growth.total).unlocked).sort((a,b)=>courseAccess(a).required.level-courseAccess(b).required.level),next=waiting[0],access=next&&courseAccess(next,growth.total);
 return `<section class="course-player-panel" aria-label="코스 해제 플레이어"><div class="course-player-picker"><label class="field">코스를 고를 플레이어<select id="course-player">${names.map(n=>`<option value="${esc(n)}" ${n===player?'selected':''}>${esc(n)}</option>`).join('')}</select></label><button class="secondary" data-action="new-course-player">새 이름으로 플레이</button></div><div class="course-player-growth"><b>LV ${growth.current.level} · ${growth.current.name}</b><strong data-course-points="${growth.total}">${num(growth.total)} P</strong><span>${courses.length-waiting.length} / ${courses.length} 코스 열림</span></div><p class="course-next-unlock">${next?`다음 코스 <b>${next.name}</b> · LV ${access.required.level} · <b>${num(access.remaining)} P</b> 남았어요`:'모든 코스가 열렸어요. 새로운 최고 기록에 도전하세요!'}</p><p class="course-player-hint">함께 대전은 플레이어 1의 등급으로 코스를 열어요. 기록을 이어가려면 같은 이름을 선택하세요.</p></section>`;
}
export function courseUnlockGuide(){
 const starter=courses.filter(c=>courseAccess(c).required.level===1).length;
 const groups=Array.from({length:6},(_,i)=>{const rank=i+2,list=courses.filter(c=>courseAccess(c).required.level===rank),threshold=list[0]&&courseAccess(list[0]).required.minimum;return list.length?'<details><summary>LV '+rank+' · '+num(threshold)+' P · '+list.length+'개 코스</summary><ul>'+list.map(c=>'<li><b>'+esc(c.name)+'<small>'+esc(c.venueName)+'</small></b><span>난이도 '+c.level+' / 5</span></li>').join('')+'</ul></details>':'';}).join('');
 return '<div class="course-unlock-guide"><p>10개 구장마다 처음부터 고를 수 있는 코스가 2개 이상 있어요. 전체 '+starter+'개 기본 코스를 즐기며 어려운 코스에 도전할 등급을 올려 보세요.</p>'+groups+'<p>코스를 고르기 전에 플레이어 이름을 선택하세요. 함께 대전은 플레이어 1의 등급을 기준으로 하며, 포인트는 차감되지 않아요. 이전 완주 기록도 반영하고 이미 시작한 라운드는 계속할 수 있어요.</p></div>';
}
