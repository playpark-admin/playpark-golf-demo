import {FirebaseClient} from './firebase-rest.js';
import {FIREBASE_CONFIG} from './firebase-config.js';
import {APP_INFO} from './app-info.js';
const CONSENT_KEY='plpark:analytics-consent:v1',QUEUE_KEY='plpark:analytics-queue:v1';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
export class GameTelemetry{
 constructor(config=FIREBASE_CONFIG){this.client=new FirebaseClient(config);this.consent=read(CONSENT_KEY,false)===true;this.queue=read(QUEUE_KEY,[]);this.flushing=null;this.connecting=null;this.active=true;}
 get needsConsent(){return this.client.configured&&!this.consent;}
 accept(){this.active=true;this.consent=true;save(CONSENT_KEY,true);void this.connect();}
 revoke(){this.consent=false;this.active=false;this.queue=[];try{localStorage.removeItem(CONSENT_KEY);localStorage.removeItem(QUEUE_KEY);}catch{}this.client.signOut();}
 async connect(){if(!this.client.configured||!this.consent||!this.active)return;if(this.connecting)return this.connecting;this.connecting=(async()=>{try{if(!this.client.session)await this.client.signInAnonymously();await this.flush();}catch{this.client.signOut();}})();try{await this.connecting;}finally{this.connecting=null;}}
 emit(event){if(!this.client.configured||!this.consent||!this.active)return;const entry={id:crypto.randomUUID(),event:{...event,appVersion:APP_INFO.version}};this.queue.push(entry);if(this.queue.length>300)this.queue.splice(0,this.queue.length-300);save(QUEUE_KEY,this.queue);void this.connect();}
 async flush(){if(this.flushing)return this.flushing;this.flushing=(async()=>{while(this.active&&this.consent&&this.queue.length){const next=this.queue[0];try{await this.client.writeEvent(next.event,next.id);this.queue.shift();save(QUEUE_KEY,this.queue);}catch(error){if(String(error.message).includes('ALREADY_EXISTS')){this.queue.shift();save(QUEUE_KEY,this.queue);continue;}break;}}})();try{await this.flushing;}finally{this.flushing=null;}}
}
export const telemetry=new GameTelemetry();
if(typeof window!=='undefined')window.addEventListener('online',()=>void telemetry.connect());
