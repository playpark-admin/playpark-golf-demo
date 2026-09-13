import {mergeRecords,recordHoles,validRecord} from './records.js';

// Growth is derived from archived rounds, never incremented when a screen opens.
// Keep these v1 rewards stable so historical growth does not change on updates.
export const GROWTH_RULES=Object.freeze({version:1,completion:100,par:5,birdie:10,eagle:20});
export const GROWTH_LEVELS=Object.freeze([
 [0,'새싹 골퍼'],[300,'파크 친구'],[800,'꾸준한 골퍼'],[1600,'실력 골퍼'],
 [3000,'베테랑'],[5000,'마스터'],[8000,'파크 명인']
 ].map(([minimum,name],i)=>Object.freeze({level:i+1,minimum,name})));
const completed=r=>validRecord(r)&&typeof r.completedAt==='string'&&Number.isFinite(Date.parse(r.completedAt));
export function roundGrowth(record,name){
 const zero={total:0,completion:0,bonus:0,par:0,birdie:0,eagle:0,unrated:0};
 if(!completed(record))return zero;
 const player=record.players.find(p=>p.name===name);if(!player)return zero;
 const holes=recordHoles(record),award={...zero,completion:GROWTH_RULES.completion};
 player.scores.forEach((score,i)=>{const par=holes[i]?.par;
  if(!Number.isInteger(par)||par<3||par>5){award.unrated++;return;}
  const difference=score-par;if(difference===0)award.par++;else if(difference===-1)award.birdie++;else if(difference<=-2)award.eagle++;
 });
 award.bonus=award.par*GROWTH_RULES.par+award.birdie*GROWTH_RULES.birdie+award.eagle*GROWTH_RULES.eagle;
 award.total=award.completion+award.bonus;return award;
}
export function growthLevel(points){
 const total=Number.isFinite(points)?Math.max(0,Math.floor(points)):0;
 const current=GROWTH_LEVELS.findLast(l=>total>=l.minimum),next=GROWTH_LEVELS[current.level]||null;
 return {total,current,next,remaining:next?next.minimum-total:0,
  progress:next?(total-current.minimum)/(next.minimum-current.minimum)*100:100};
}
export function playerGrowth(records,name){
 const entries=mergeRecords(records).filter(completed).flatMap(record=>{
  const award=roundGrowth(record,name);return award.total?[{record,award}]:[];
 });
 return {...growthLevel(entries.reduce((sum,e)=>sum+e.award.total,0)),rounds:entries.length,entries};
}
export function growthStandings(records){
 const rounds=mergeRecords(records).filter(completed),names=[...new Set(rounds.flatMap(r=>r.players.map(p=>p.name)))];
 const rows=names.map(name=>({name,...playerGrowth(rounds,name)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'ko'));
 let rank=0;return rows.map((row,i)=>{if(!i||row.total!==rows[i-1].total)rank=i+1;return {...row,rank};});
}
