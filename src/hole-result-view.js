import {mascot,icon} from './art.js';
import {scoreLabel} from './engine.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>n>0?'+'+n:n<0?String(n):'E';
export const scorePose=(score,par)=>score===1||score<par?'celebrate':score===par?'praise':'encourage';
export function holeResultView(round){
 const h=round.layout[round.holeIndex],completed=round.holeIndex+1,solo=round.players.length===1;
 const parTotal=round.layout.slice(0,completed).reduce((sum,h)=>sum+h.par,0);
 const players=round.players.map(p=>{const score=p.scores[round.holeIndex],sum=p.scores.slice(0,completed).reduce((a,b)=>a+b,0);return {name:p.name,score,sum,delta:score-h.par,totalDelta:sum-parTotal,penalty:p.penalties?.[round.holeIndex]??p.holePenalty??0,label:scoreLabel(score,h.par)};});
 const p=players[0],pose=solo?scorePose(p.score,h.par):players.every(p=>p.score<h.par)?'celebrate':'praise';
 const tone=solo?(p.delta<0?'under':p.delta===0?'even':'over'):'together';
 const message=completed===18?'18홀 완주! 끝까지 함께해 주셔서 고마워요.':completed===9?'전반을 마쳤어요. 후반 코스에서도 함께해요.':!solo?'서로의 멋진 도전을 응원해요!':pose==='celebrate'?'정확한 샷이었어요! 이 기분 그대로 가요.':pose==='praise'?'안정적인 마무리예요. 잘하고 있어요!':'한 홀씩 천천히, 다음 홀도 함께해요.';
 const difference=p.delta===0?'기준 타수에 맞췄어요':p.delta<0?'파보다 '+(-p.delta)+'타 적어요':'파보다 '+p.delta+'타 더 쳤어요';
 const cumulative=p=>`<strong>${p.sum}<small>타</small></strong><span class="result-delta" aria-label="기준 타수 대비 ${p.totalDelta===0?'동타':signed(p.totalDelta)+'타'}">${signed(p.totalDelta)}</span>`;
 return `<div class="hole-result-scroll" tabindex="0" role="region" aria-label="홀 결과와 플레이어 기록"><header class="hole-result-heading"><p>${completed<=9?'전반':'후반'} · ${escape(h.courseName)}</p><div><h2 id="modal-title">${h.number}홀 완료</h2><span class="hole-result-progress">${completed} / 18홀</span></div><p class="hole-result-meta"><span>파 ${h.par}</span><span>${h.length}m</span></p></header>
 <section class="hole-result-hero ${tone}" aria-label="이번 홀 결과"><div class="hole-result-highlight">${solo?`<span class="hole-score-label">${p.label.startsWith('+')?'홀아웃!':p.label}</span><p class="hole-score-value">${p.score}<small>타</small></p><p class="hole-score-context">${difference}</p>`:`<span class="hole-score-label">모두 홀아웃!</span><p class="hole-team-count">${players.length}<small>명과 함께</small></p><p class="hole-score-context">한 홀 더 완성했어요</p>`}</div><div class="hole-result-character">${mascot('mascot-reaction',pose)}</div></section>
 ${solo?`<dl class="hole-result-summary"><div><dt>이번 홀 벌타</dt><dd><strong>${p.penalty}<small>타</small></strong><span class="penalty-included">${p.penalty?'점수에 포함':'벌타 없음'}</span></dd></div><div><dt>누적 · ${completed}홀</dt><dd>${cumulative(p)}</dd></div></dl>`:`<div class="hole-player-heading"><span>플레이어 · 누적 기록</span><span>이번 홀</span></div><ol class="hole-player-results">${players.map((p,i)=>`<li><div class="hole-player-name"><span class="hole-player-number">${i+1}</span><b>${escape(p.name)}</b></div><div class="hole-player-score"><strong>${p.score}<small>타</small></strong><span>${p.label}</span></div><div class="hole-player-total"><span>누적 ${p.sum}타 (${signed(p.totalDelta)})</span><span>벌타 ${p.penalty}타 포함</span></div></li>`).join('')}</ol>`}
 <p class="hole-result-message"><b>플팍</b>${message}</p></div>
 <footer class="hole-result-actions"><button class="primary full" data-action="next-step">${completed===18?'최종 결과 확인':completed===9?'후반 9홀로 출발':'다음 홀로'} ${icon('arrow',20)}</button><button class="text-button full" data-action="scorecard">${icon('book',18)} 전체 스코어카드</button></footer>`;
}
