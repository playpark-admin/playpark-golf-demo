import {entriesFor,recordHoles} from './records.js';
// Never mix players, course order, rule/physics versions, or unknown PAR values.
export function memberHoleReview(records,player,key){
 const entries=key?entriesFor(records,player,key):[],rows=[];
 for(let i=0;i<18;i++){
  const samples=entries.flatMap(e=>{const h=recordHoles(e.record)[i],score=e.player.scores[i];return h&&Number.isInteger(h.par)&&h.par>=3&&h.par<=5&&Number.isInteger(score)&&score>0?[{h,score,penalties:(e.player.penalties||[])[i]||0}]:[];});
  if(!samples.length)continue;
  rows.push({h:samples[0].h,i,samples:samples.length,delta:samples.reduce((n,s)=>n+s.score-s.h.par,0)/samples.length,rate:Math.round(samples.filter(s=>s.score<=s.h.par).length/samples.length*100),penalties:samples.reduce((n,s)=>n+s.penalties,0)});
 }
 return {rounds:entries.length,rows:rows.sort((a,b)=>b.delta-a.delta||b.penalties-a.penalties||a.i-b.i).slice(0,3)};
}
