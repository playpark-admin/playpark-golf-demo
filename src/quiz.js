import {lessons} from './lessons.js';
import {importedQuestions,quizSource} from './quiz-bank.js';
export {quizSource};
export const topics={basics:'기본·용구',tee:'티샷·순서',stroke:'타격·스윙',green:'그린·마크',score:'점수 계산',relief:'OB·처치',manners:'안전·매너'};
export const levels={1:'쉬움',2:'보통',3:'도전'};
const coreTopics=['tee','score','relief','tee','basics','stroke','green','manners','tee'];
export const questions=[...lessons.map((l,i)=>({...l,id:`core-${i}`,topic:coreTopics[i],category:l.tag,difficulty:1})),...importedQuestions];
export const byId=new Map(questions.map(q=>[q.id,q]));
export function normalizeProgress(raw,legacy=[]){
 const progress={};
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [id,p] of Object.entries(raw)){
  if(!byId.has(id)||!p||typeof p!=='object')continue;
  const count=n=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
  progress[id]={attempts:count(p.attempts),correct:count(p.correct),wrong:count(p.wrong),lastResult:p.lastResult==='correct'?'correct':'wrong'};
 }
 for(const i of Array.isArray(legacy)?legacy:[]){const id=Number.isInteger(i)?`core-${i}`:i;if(byId.has(id)&&!progress[id])progress[id]={attempts:1,correct:1,wrong:0,lastResult:'correct'};}
 return progress;
}
export function recordAnswer(progress,id,correct){
 if(!byId.has(id))throw Error('Unknown quiz');
 const old=progress[id]||{attempts:0,correct:0,wrong:0};
 return {...progress,[id]:{attempts:old.attempts+1,correct:old.correct+Number(correct),wrong:old.wrong+Number(!correct),lastResult:correct?'correct':'wrong'}};
}
export function stats(progress){const entries=Object.values(progress);return {seen:entries.length,mastered:entries.filter(p=>p.lastResult==='correct').length,review:entries.filter(p=>p.lastResult==='wrong').length};}
export function filterQuestions({topic='all',difficulty='all'}={}){return questions.filter(q=>(topic==='all'||q.topic===topic)&&(difficulty==='all'||q.difficulty===Number(difficulty)));}
export function shuffledAnswers(q,random=Math.random){const result=q.answers.map((text,index)=>({text,correct:index===q.correct}));for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function pickQuestion({pool=questions,progress={},used=[],review=false,preferredTopic=null,random=Math.random}={}){
 let candidates=pool.filter(q=>!used.includes(q.id)&&(!review||progress[q.id]?.lastResult==='wrong'));
 if(!candidates.length)return null;
 const relevant=candidates.filter(q=>q.topic===preferredTopic);if(relevant.length)candidates=relevant;
 const unseen=candidates.filter(q=>!progress[q.id]);if(!review&&unseen.length)candidates=unseen;
 return candidates[Math.floor(random()*candidates.length)];
}
export function roundQuestion(round,progress={},random=Math.random){
 round.quizAssignments??={};const existing=round.quizAssignments[round.holeIndex];if(byId.has(existing))return byId.get(existing);
 const used=Object.values(round.quizAssignments),logs=(round.log||[]).filter(l=>l.holeIndex===round.holeIndex||l.hole===round.holeIndex);
 const hadOb=logs.some(l=>l.type==='ob'||l.ob||l.event==='ob'||l.penalty>0);
 const rotation=['tee','basics','stroke','green','manners','relief','score'];
 const preferredTopic=hadOb?'relief':rotation[round.holeIndex%rotation.length];
 const pool=round.holeIndex<9?questions.filter(q=>q.difficulty<=2):questions;
 const q=pickQuestion({pool,progress,used,preferredTopic,random})||pickQuestion({progress,used,random});
 if(q)round.quizAssignments[round.holeIndex]=q.id;return q;
}
