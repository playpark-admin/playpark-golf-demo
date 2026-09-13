import {newlyUnlockedCourses} from './course-access.js';
import {GROWTH_RULES,GROWTH_LEVELS,playerGrowth,roundGrowth,growthStandings} from './progression.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>n.toLocaleString('ko-KR');
const badge=level=>`<span class="growth-badge" aria-label="레벨 ${level}"><small>LV</small><b>${level}</b></span>`;
const nextText=g=>g.next?`다음 등급 <b>${g.next.name}</b>까지 <b>${num(g.remaining)} P</b>`:'최고 등급에 도달했어요! 포인트는 계속 쌓여요.';
function meter(g){return `<div class="growth-track" role="progressbar" aria-label="다음 성장 등급까지 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(g.progress)}" aria-valuetext="${g.next?'다음 등급까지 '+num(g.remaining)+'포인트 남음':'최고 등급 달성'}"><span style="width:${g.progress}%"></span></div>`;}
export function growthProfile(records,name){
 const g=playerGrowth(records,name);
 return `<section class="growth-profile" aria-labelledby="growth-title">${badge(g.current.level)}<div class="growth-identity"><p>${name?esc(name)+' 님의 성장':'나의 첫 성장'}</p><h2 id="growth-title">${g.current.name}</h2></div><div class="growth-balance"><span>누적 성장 포인트</span><strong data-growth-total="${g.total}">${num(g.total)} <small>P</small></strong></div><div class="growth-progress">${meter(g)}<p>${nextText(g)}</p><p class="growth-context">전체 코스 · ${num(g.rounds)}라운드 완주</p></div></section>`;
}
export function growthGuide(){return `<div class="growth-guide"><p>18홀을 완주할 때마다 성장 포인트가 쌓이고, 누적 포인트로 게임 등급이 올라가요.</p><dl class="growth-rules"><div><dt>18홀 완주</dt><dd>+${GROWTH_RULES.completion} P</dd></div><div><dt>파 · 홀마다</dt><dd>+${GROWTH_RULES.par} P</dd></div><div><dt>버디 · 홀마다</dt><dd>+${GROWTH_RULES.birdie} P</dd></div><div><dt>이글 이상 · 홀마다</dt><dd>+${GROWTH_RULES.eagle} P</dd></div></dl><p>홀별 보너스는 하나씩 적용돼요. 보기나 OB로 성장 포인트가 깎이지 않아요. 골프 승부는 벌타를 포함한 타수가 낮을수록 좋아요.</p><details class="growth-levels"><summary>7단계 등급 기준 보기</summary><ol>${GROWTH_LEVELS.map(l=>`<li><span>LV ${l.level} · ${l.name}</span><b>${num(l.minimum)} P</b></li>`).join('')}</ol></details><p>이전에 저장한 완주 기록도 포함돼요. 진행 중인 라운드는 18홀 완주 후 반영하며, 같은 기록을 다시 열어도 중복 적립되지 않아요.</p></div>`;}
export function growthBoard(records){
 const rows=growthStandings(records);if(rows.length<2)return '';
 return `<section class="records-panel growth-board" aria-labelledby="growth-board-title"><h2 id="growth-board-title">함께 쌓은 성장 순위</h2><p>이 기기의 플레이어 · 모든 코스의 누적 포인트 · 동점은 공동 순위</p><ol>${rows.map(p=>`<li><b class="growth-place">${p.rank}<small>위</small></b><span class="growth-person"><b>${esc(p.name)}</b><span>LV ${p.current.level} · ${p.current.name} · ${num(p.rounds)}회 완주</span></span><strong>${num(p.total)} <small>P</small></strong></li>`).join('')}</ol></section>`;
}
export function roundGrowthView(record,records,{final=false,stored=true}={}){
 return `<section class="round-growth" aria-labelledby="round-growth-title"><h3 id="round-growth-title">${final?'이번 라운드 성장 포인트':'이 라운드에서 얻은 포인트'}</h3>${!stored?'<p class="growth-save-warning">아직 기기에 저장되지 않았어요. 아래 누적 포인트는 이번 화면에만 반영되어 있어요.</p>':''}${[...new Set(record.players.map(p=>p.name))].map(name=>{
 const a=roundGrowth(record,name),g=playerGrowth(records,name),before=playerGrowth(records.filter(r=>r.id!==record.id),name),opened=final&&stored?newlyUnlockedCourses(before.total,g.total):[];
 const bonus=[a.par?'파 '+a.par+'홀 · '+a.par*GROWTH_RULES.par+' P':'',a.birdie?'버디 '+a.birdie+'홀 · '+a.birdie*GROWTH_RULES.birdie+' P':'',a.eagle?'이글 이상 '+a.eagle+'홀 · '+a.eagle*GROWTH_RULES.eagle+' P':''].filter(Boolean);
 return `<div class="round-growth-player">${badge(g.current.level)}<div class="round-growth-name"><b>${esc(name)}</b><span>현재 LV ${g.current.level} · ${g.current.name}</span></div><strong class="growth-earned">+${num(a.total)} <small>P</small></strong><p class="growth-breakdown">완주 ${a.completion} P${bonus.length?' + '+bonus.join(' + '):''}${a.unrated?' · 기준 타수를 알 수 없는 '+a.unrated+'홀은 보너스 제외':''}</p>${final&&g.current.level>before.current.level?`<p class="growth-level-up">등급 상승! LV ${before.current.level} → LV ${g.current.level} · ${g.current.name}</p>`:''}${opened.length?`<p class="growth-course-unlocked">새 코스가 열렸어요!<br><b>${opened.map(c=>c.name).join(' · ')}</b></p>`:''}<p class="growth-round-total">누적 <b>${num(g.total)} P</b> · ${nextText(g)}</p></div>`;
 }).join('')}</section>`;
}
