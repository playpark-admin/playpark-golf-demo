import {venueAccess,courseLevel} from './membership.js';
import {courses} from './courses.js';
import {GROWTH_LEVELS,growthLevel,playerGrowth} from './progression.js';

// Access is derived from a named player's saved growth, never a global unlock flag.
export function courseAccess(course,points=0,context){
 if(!course)return {unlocked:false,required:null,remaining:0};
 const level=courseLevel(course,context),required=GROWTH_LEVELS[level-1];
 if(!required)throw Error('유효한 코스 해제 등급이 필요합니다.');
 const growth=growthLevel(points),venue=context?venueAccess(course.venueId,growth.total,context):null;return {required,venue,unlocked:growth.current.level>=level&&(!venue||venue.unlocked),remaining:Math.max(0,required.minimum-growth.total),early:level<(course.unlockLevel??(course.level>=3?3:1))};
}
export function roundAccess(ids,records,name,{venueId,membership,points}={}){
 const growth=playerGrowth(records,name),locked=ids.map(id=>courses.find(c=>c.id===id)).filter(c=>!courseAccess(c,points??growth.total,membership).unlocked);
 const venueValid=!venueId||ids.every(id=>courses.find(c=>c.id===id)?.venueId===venueId);
 return {growth,locked,venueValid,allowed:ids.length===2&&new Set(ids).size===2&&!locked.length&&venueValid};
}
export function newlyUnlockedCourses(before,after,context){
 return courses.filter(c=>!courseAccess(c,before,context).unlocked&&courseAccess(c,after,context).unlocked);
}
