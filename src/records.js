import {createLayout} from './courses.js';
const sum=a=>a.reduce((n,v)=>n+v,0);
export const scoreTotal=p=>sum(p.scores);
export function recordHoles(record){
  if(record.holes?.length===18)return record.holes;
  try{return createLayout(record.courseIds).map(({number,par,courseId,courseName,courseVersion,venueId,venueName})=>({number,par,courseId,courseName,courseVersion,venueId,venueName}));}catch{return [];}
}
export function validRecord(r){return !!r&&typeof r.id==='string'&&typeof r.key==='string'&&Array.isArray(r.players)&&r.players.length>0&&r.players.every(p=>typeof p?.name==='string'&&Array.isArray(p.scores)&&p.scores.length===18&&p.scores.every(s=>Number.isInteger(s)&&s>0));}
export function mergeRecords(...lists){return [...new Map(lists.flat().filter(validRecord).map(r=>[r.id,r])).values()].sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)));}
export function makeRecord(r){return {id:r.id,key:r.key,courseIds:[...r.courseIds],ruleset:r.ruleset,physics:r.physics,startedAt:r.startedAt,completedAt:r.completedAt,holes:r.layout.map(({number,par,courseId,courseName,courseVersion,venueId,venueName})=>({number,par,courseId,courseName,courseVersion,venueId,venueName})),players:r.players.map(p=>({id:p.id,name:p.name,scores:[...p.scores],penalties:[...p.penalties]})),log:structuredClone(r.log)};}
export function entriesFor(records,name,key){return mergeRecords(records).filter(r=>!key||r.key===key).flatMap(r=>r.players.filter(p=>!name||p.name===name).map(p=>({record:r,player:p,total:scoreTotal(p),penalties:sum(p.penalties||[])})));}
export function analyzeRecords(records,name,key){
 const entries=entriesFor(records,name,key),n=entries.length,buckets={under:0,par:0,bogey:0,double:0},perPar={},courseMap=new Map();let ob=0,loggedRounds=0;
 for(const {record:r,player:p} of entries){const holes=recordHoles(r);holes.forEach((h,i)=>{const d=p.scores[i]-h.par;buckets[d<0?'under':d===0?'par':d===1?'bogey':'double']++;const group=perPar[h.par]??={holes:0,strokes:0};group.holes++;group.strokes+=p.scores[i];});
  if(Array.isArray(r.log)){loggedRounds++;const id=p.id??r.players.indexOf(p);ob+=r.log.filter(s=>s.player===id&&s.event==='ob').length;}
  for(const offset of [0,9]){const h=holes[offset];if(!h)continue;const k=[h.courseId,h.courseVersion,r.ruleset,r.physics].join(':');const c=courseMap.get(k)||{name:h.courseName,version:h.courseVersion,rounds:0,total:0,best:Infinity};const value=sum(p.scores.slice(offset,offset+9));c.rounds++;c.total+=value;c.best=Math.min(c.best,value);courseMap.set(k,c);}
 }
 const values=entries.map(e=>e.total),penalties=sum(entries.map(e=>e.penalties));
 return {rounds:n,holes:n*18,strokes:sum(values),best:n?Math.min(...values):null,average:n?sum(values)/n:null,penalties,ob:loggedRounds?ob:null,loggedRounds,front:n?sum(entries.map(e=>sum(e.player.scores.slice(0,9))))/n:null,back:n?sum(entries.map(e=>sum(e.player.scores.slice(9))))/n:null,buckets,perPar,courses:[...courseMap.values()].map(c=>({...c,average:c.total/c.rounds})),entries};
}
// Trend always compares one player on the same ordered courses and rule/physics version.
export function scoreTrend(records,name,key){
 const entries=entriesFor(records,name,key).sort((a,b)=>String(a.record.completedAt).localeCompare(String(b.record.completedAt))),recent=entries.slice(-5),previous=entries.slice(-10,-5),average=a=>a.length?sum(a.map(e=>e.total))/a.length:null;
 return {points:entries.slice(-10),recentAverage:average(recent),previousAverage:average(previous),change:previous.length?average(recent)-average(previous):null};
}
