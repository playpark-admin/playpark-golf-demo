import {createLayout,competitionKey,RULESET,PHYSICS} from './courses.js';
const PREVIOUS_PHYSICS='roll-4-collisions';
const OLD_RULES='kpga-2024.02.05-game-2',OLD_PHYSICS='roll-3-terrain';
const PREVIOUS_RULESET='kpga-2024.02.05-game-1',CONTINUED_RULESET=OLD_RULES+'-continued-from-game-1';
const OLD_VERSIONS={forest:3,lake:3,sunset:3,blossom:3,meadow:1,pine:1,river:1,valley:1,coast:1,ridge:1};
// Obstacles must not appear beneath a saved ball. Earlier rounds keep the prior
// geometry and judging; new rounds use the new packs and competition keys.
export function restoreRound(saved){
 try{
  if(!saved||saved.schema!==1||saved.layout?.length!==18||!['playing','hole-complete'].includes(saved.status)||!Number.isInteger(saved.holeIndex)||saved.holeIndex<0||saved.holeIndex>17||!Array.isArray(saved.players)||!saved.players.length||saved.players.length>4||!saved.players[saved.active]||saved.players.some(p=>!Number.isFinite(p.ball?.x)||!Number.isFinite(p.ball?.y)))return null;
  let layout=createLayout(saved.courseIds);const round=structuredClone(saved);
  if([PHYSICS,PREVIOUS_PHYSICS].includes(saved.physics)&&saved.ruleset===RULESET){const expectedKey=competitionKey(saved.courseIds).replace(PHYSICS,saved.physics);if(saved.key!==expectedKey)return null;}
  else{
   if(saved.physics!==OLD_PHYSICS||![OLD_RULES,PREVIOUS_RULESET,CONTINUED_RULESET].includes(saved.ruleset)||saved.courseIds.some(id=>!OLD_VERSIONS[id]))return null;
   const suffix=saved.courseIds.map(id=>id+'@'+OLD_VERSIONS[id]).join('+');if(saved.key!==saved.ruleset+':'+OLD_PHYSICS+':'+suffix)return null;
   // Fairways, terrain, water and trees are identical; only new features are removed.
   layout=layout.map(h=>{const legacy={...h,courseVersion:OLD_VERSIONS[h.courseId]};delete legacy.boundary;delete legacy.rocks;return legacy;});
   if(saved.ruleset===PREVIOUS_RULESET){round.ruleset=CONTINUED_RULESET;round.key=CONTINUED_RULESET+':'+OLD_PHYSICS+':'+suffix;}
  }
  round.layout=layout;return round;
 }catch{return null;}
}
