import {archiveName} from './session.js';
import {mergeRecords} from './records.js';
let connection;
function openArchive(){
 if(connection)return connection;
 connection=new Promise((resolve,reject)=>{const request=indexedDB.open(archiveName(),1);request.onupgradeneeded=()=>request.result.createObjectStore('rounds',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('기록 저장소가 다른 창에서 사용 중이에요.'));});
 return connection;
}
export async function saveRecords(records){
 const db=await openArchive();await new Promise((resolve,reject)=>{const tx=db.transaction('rounds','readwrite');for(const r of mergeRecords(records))tx.objectStore('rounds').put(r);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('기록 저장 실패'));});
}
export async function loadRecords(legacy=[]){
 const db=await openArchive();const saved=await new Promise((resolve,reject)=>{const req=db.transaction('rounds').objectStore('rounds').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 const records=mergeRecords(saved,legacy);if(legacy.length)await saveRecords(records);return records;
}
