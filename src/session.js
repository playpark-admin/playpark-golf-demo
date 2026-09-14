// Local test identities only. Keep the session fixed for this page lifetime so
// switching accounts in another tab cannot redirect an in-flight save.
export const TEST_PROFILES=Object.freeze([
 {id:'local',name:'기존 플레이어',plan:'free',demo:false},
 {id:'demo-free',name:'무료 테스트',plan:'free',demo:true},
 {id:'demo-plus',name:'PLUS 테스트',plan:'plus',demo:true}
]);
const storage=()=>globalThis.localStorage;
function read(key,fallback){try{return JSON.parse(storage().getItem(key))??fallback;}catch{return fallback;}}
export function profileFor(id){return TEST_PROFILES.find(p=>p.id===id)||TEST_PROFILES[0];}
export const SESSION=profileFor(read('plpark:active-profile','local'));
export function profileKey(key,session=SESSION){return session.id==='local'?'plpark:'+key:'plpark:'+session.id+':'+key;}
export function archiveName(session=SESSION){return session.id==='local'?'plpark-history':'plpark-history-'+session.id;}
export function currentMembership(){
 const saved=read(profileKey('membership'),{});
 return {id:SESSION.id,name:SESSION.name,demo:SESSION.demo,plan:SESSION.demo&&['free','plus'].includes(saved.plan)?saved.plan:SESSION.plan,earnedVenues:Array.isArray(saved.earnedVenues)?saved.earnedVenues:[],ballStyle:typeof saved.ballStyle==='string'?saved.ballStyle:(SESSION.plan==='plus'?'gold':'classic'),cardStyle:['gold','classic'].includes(saved.cardStyle)?saved.cardStyle:(SESSION.plan==='plus'?'gold':'classic'),testPoints:SESSION.demo&&Number.isInteger(saved.testPoints)&&saved.testPoints>=0&&saved.testPoints<=8000?saved.testPoints:null};
}
export function saveMembership(patch){const next={...currentMembership(),...patch};storage().setItem(profileKey('membership'),JSON.stringify(next));return next;}
export function selectProfile(id){if(!TEST_PROFILES.some(p=>p.id===id))throw Error('알 수 없는 테스트 사용자입니다.');storage().setItem('plpark:active-profile',JSON.stringify(id));}
