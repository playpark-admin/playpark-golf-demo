import {courses} from './courses.js';
import {GROWTH_LEVELS,growthLevel,playerGrowth} from './progression.js';

// Access is derived from a named player's saved growth, never a global unlock flag.
export function courseAccess(course,points=0){
 if(!course)return {unlocked:false,required:null,remaining:0};
 const level=course.unlockLevel??(course.level>=3?3:1),required=GROWTH_LEVELS[level-1];
 if(!required)throw Error('유효한 코스 해제 등급이 필요합니다.');
 const growth=growthLevel(points);return {required,unlocked:growth.current.level>=level,remaining:Math.max(0,required.minimum-growth.total)};
}
export function roundAccess(ids,records,name){
 const growth=playerGrowth(records,name),locked=ids.map(id=>courses.find(c=>c.id===id)).filter(c=>!courseAccess(c,growth.total).unlocked);
 return {growth,locked,allowed:ids.length===2&&new Set(ids).size===2&&!locked.length};
}
export function newlyUnlockedCourses(before,after){
 return courses.filter(c=>!courseAccess(c,before).unlocked&&courseAccess(c,after).unlocked);
}
