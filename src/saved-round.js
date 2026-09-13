import {createLayout,competitionKey,RULESET,PHYSICS} from './courses.js';
const PREVIOUS_RULESET='kpga-2024.02.05-game-1';
const CONTINUED_RULESET=RULESET+'-continued-from-game-1';

// Preserve progress across the removal of fixed relief tees, but keep mixed-rule
// rounds out of both old-rule and new-rule competition groups. Completed records
// are never passed through this migration.
export function restoreRound(saved){
  try{
    if(!saved||saved.schema!==1||saved.layout?.length!==18||!['playing','hole-complete'].includes(saved.status)
      ||!Number.isInteger(saved.holeIndex)||saved.holeIndex<0||saved.holeIndex>17
      ||!Array.isArray(saved.players)||!saved.players.length||saved.players.length>4
      ||!saved.players[saved.active]||saved.players.some(p=>!Number.isFinite(p.ball?.x)||!Number.isFinite(p.ball?.y))
      ||saved.physics!==PHYSICS||![RULESET,PREVIOUS_RULESET,CONTINUED_RULESET].includes(saved.ruleset))return null;
    const key=competitionKey(saved.courseIds);
    if(saved.key!==key.replace(RULESET,saved.ruleset))return null;
    const round=structuredClone(saved);
    if(round.ruleset===PREVIOUS_RULESET){round.ruleset=CONTINUED_RULESET;round.key=key.replace(RULESET,CONTINUED_RULESET);}
    round.layout=createLayout(round.courseIds);
    return round;
  }catch{return null;}
}
