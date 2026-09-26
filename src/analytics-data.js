// Explicitly allowlisted, non-identifying gameplay statistics.
export const EVENT_TYPES=Object.freeze(['session_start','round_start','round_resume','shot','hole_complete','round_complete','quiz_answer','venue_view','plus_view']);
export const EVENT_FIELDS=Object.freeze(['type','uid','appVersion','roundId','venueId','courseId','holeNumber','playerCount','strokes','par','penalties','obCount','waterCount','bunkerCount','quizId','quizTopic','quizDifficulty','correct','demoPlan','durationSec','power','outcome','lie']);
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const bounded=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&/^[a-zA-Z0-9._:-]+$/.test(value);
export function cleanEvent(raw){
 if(!raw||!EVENT_TYPES.includes(raw.type))throw Error('Unknown analytics event');
 const event={};for(const key of EVENT_FIELDS)if(raw[key]!==undefined)event[key]=raw[key];
 if(!bounded(event.uid,128)||!bounded(event.appVersion,24))throw Error('Invalid analytics identity');
 if(event.roundId!==undefined&&!bounded(event.roundId,80))throw Error('Invalid round id');
 for(const key of ['venueId','courseId','quizId','quizTopic','quizDifficulty','outcome','lie'])if(event[key]!==undefined&&!bounded(event[key],80))throw Error('Invalid analytics label');
 for(const key of ['holeNumber','playerCount','strokes','par','penalties','obCount','waterCount','bunkerCount','durationSec','power'])if(event[key]!==undefined&&!integer(event[key],0,key==='durationSec'?604800:999))throw Error('Invalid analytics count');
 if(event.holeNumber!==undefined&&!integer(event.holeNumber,1,18))throw Error('Invalid hole');
 if(event.playerCount!==undefined&&!integer(event.playerCount,1,4))throw Error('Invalid players');
 if(event.power!==undefined&&!integer(event.power,0,100))throw Error('Invalid power');
 if(event.correct!==undefined&&typeof event.correct!=='boolean')throw Error('Invalid quiz outcome');
 if(event.demoPlan!==undefined&&!['free','plus'].includes(event.demoPlan))throw Error('Invalid demo plan');
 return event;
}
export function holeEvent(round){
 const hole=round.layout[round.holeIndex],logs=round.log.filter(shot=>shot.hole===round.holeIndex),count=kind=>logs.filter(shot=>shot.event===kind).length;
 return {type:'hole_complete',roundId:round.id,venueId:hole.venueId,courseId:hole.courseId,holeNumber:round.holeIndex+1,playerCount:round.players.length,strokes:round.players.reduce((n,p)=>n+p.scores[round.holeIndex],0),par:hole.par*round.players.length,penalties:round.players.reduce((n,p)=>n+p.penalties[round.holeIndex],0),obCount:count('ob'),waterCount:count('water'),bunkerCount:count('sand')};
}
export function summarizeEvents(events){
 const days=new Map(),venues=new Map(),courses=new Map(),quizzes=new Map(),uids=new Set();let starts=0,completions=0,holes=0,shots=0,strokes=0,par=0,penalties=0,ob=0,water=0,bunker=0,plusViews=0;
 for(const e of events){const date=String(e.createdAt||'').slice(0,10);if(date){const d=days.get(date)||{date,starts:0,completions:0,holes:0,shots:0,quizAnswers:0};days.set(date,d);if(e.type==='round_start')d.starts++;if(e.type==='round_complete')d.completions++;if(e.type==='hole_complete')d.holes++;if(e.type==='shot')d.shots++;if(e.type==='quiz_answer')d.quizAnswers++;}
  if(e.uid)uids.add(e.uid);if(e.type==='round_start')starts++;if(e.type==='round_complete')completions++;if(e.type==='shot')shots++;if(e.type==='plus_view')plusViews++;
  if(e.type==='hole_complete'){holes++;strokes+=e.strokes||0;par+=e.par||0;penalties+=e.penalties||0;ob+=e.obCount||0;water+=e.waterCount||0;bunker+=e.bunkerCount||0;for(const [map,key] of [[venues,e.venueId],[courses,e.courseId]])if(key){const item=map.get(key)||{id:key,holes:0,strokes:0,par:0,ob:0};item.holes++;item.strokes+=e.strokes||0;item.par+=e.par||0;item.ob+=e.obCount||0;map.set(key,item);}}
  if(e.type==='quiz_answer'&&e.quizTopic){const q=quizzes.get(e.quizTopic)||{id:e.quizTopic,answers:0,correct:0};q.answers++;q.correct+=Number(e.correct===true);quizzes.set(e.quizTopic,q);}
 }
 return {events:events.length,sessions:uids.size,starts,completions,holes,shots,strokes,par,penalties,ob,water,bunker,plusViews,days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),venues:[...venues.values()].sort((a,b)=>b.holes-a.holes),courses:[...courses.values()].sort((a,b)=>b.holes-a.holes),quizzes:[...quizzes.values()].sort((a,b)=>b.answers-a.answers)};
}
