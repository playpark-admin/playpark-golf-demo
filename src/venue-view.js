import {venues,venueById} from './venues.js';
import {coursesAtVenue} from './courses.js';
import {courseAccess} from './course-access.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function venueScenery(v){
 const p=v.palette,water=['river','lake','coast','sunset'].includes(v.theme),mountain=['alpine','valley','volcanic'].includes(v.theme);
 const hills=mountain?'<path d="M0 118 70 52 122 96 222 22 306 105 365 50 420 107V180H0Z" fill="'+v.color+'" opacity=".4"/><path d="m193 47 29-25 32 32-33-10Z" fill="'+v.light+'"/>':'<path d="M0 111Q90 53 175 106T420 87V180H0Z" fill="'+p.rough+'"/>';
 const river=water?'<path d="M-10 122Q105 67 202 127T430 107L430 180H-10Z" fill="'+p.water+'"/><path d="M24 147h75m177 10h89m-177-25h35" stroke="white" stroke-width="3" opacity=".5"/>':'';
 const field=v.theme==='fields'?'<path d="M0 124 420 88M0 149 420 110M40 180 420 135M120 180 420 157" stroke="'+v.color+'" stroke-width="12" opacity=".25"/>':'';
 const tree=(x,y)=>'<g transform="translate('+x+' '+y+')"><path d="M0 0v30" stroke="'+v.color+'" stroke-width="5"/>'+(['pine','alpine','coast'].includes(v.theme)?'<path d="m0-35-22 47h44Zm0-15-17 40h34Z" fill="'+p.tree+'"/>':'<circle cy="-9" r="23" fill="'+p.tree+'"/><circle cx="-9" cy="-17" r="15" fill="'+p.treeLight+'"/>')+'</g>';
 const rocks=v.theme==='volcanic'?'<path d="m59 160 14-21 23-2 14 23Z m218-10 14-27 20 6 16 24Z" fill="#53605f"/><path d="m285 130 8-7 19 6-6 9Z" fill="#82908a"/>':'';
 const reeds=['river','volcanic','fields'].includes(v.theme)?'<path d="m137 170-4-31m4 31 8-24m-8 24-13-16m232 9-4-33m4 33 10-25" fill="none" stroke="'+v.color+'" stroke-width="3"/>':'';
 return '<svg class="venue-scenery" viewBox="0 0 420 180" aria-hidden="true"><rect width="420" height="180" fill="'+v.light+'"/><circle cx="334" cy="35" r="20" fill="'+(v.theme==='sunset'?'#efa370':'#fff3b9')+'"/>'+hills+river+'<path d="M0 169Q113 119 216 163T420 150V180H0Z" fill="'+p.fairway+'"/>'+field+tree(40,127)+tree(385,121)+rocks+reeds+'</svg>';
}
export function venuePicker(selectedId,points){
 return '<section class="venue-picker" aria-labelledby="venue-picker-title"><div class="venue-picker-heading"><h2 id="venue-picker-title">1. 구장 선택</h2><span>전국 테마 구장 '+venues.length+'곳</span></div><label class="field venue-mobile-picker">플레이할 구장<select id="venue-select">'+venues.map(v=>'<option value="'+v.id+'" '+(v.id===selectedId?'selected':'')+'>'+esc(v.region)+' · '+esc(v.name)+' ('+v.courseIds.length+'코스)</option>').join('')+'</select></label><div class="venue-grid">'+venues.map(v=>{
  const count=coursesAtVenue(v.id).filter(c=>courseAccess(c,points).unlocked).length,selected=v.id===selectedId;
  return '<button class="venue-tile '+(selected?'is-selected':'')+'" data-action="venue" data-id="'+v.id+'" aria-pressed="'+selected+'">'+venueScenery(v)+'<span class="venue-check" aria-hidden="true">'+(selected?'✓':'')+'</span><small>'+esc(v.region)+'</small><b>'+esc(v.name)+'</b><span>'+v.courseIds.length+'코스 · '+count+'개 열림</span></button>';
 }).join('')+'</div></section>';
}
export function venueOverview(id,points){
 const v=venueById(id),all=coursesAtVenue(id),open=all.filter(c=>courseAccess(c,points).unlocked).length;
 return '<section class="venue-overview" data-venue-id="'+v.id+'" style="--venue-color:'+v.color+';--venue-light:'+v.light+'">'+venueScenery(v)+'<div><span class="venue-region">'+esc(v.region)+'</span><h2 tabindex="-1" id="active-venue-title">'+esc(v.name)+'</h2><p>'+esc(v.description)+'</p><ul class="venue-traits">'+v.features.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul><p class="venue-counts"><b>'+all.length+'개 코스 · '+all.length*9+'홀</b><span>'+open+'개 열림 · '+(all.length-open)+'개 잠김</span></p></div></section>';
}
export function regionalTree(t,c){
 const p=c.palette||{tree:c.id==='blossom'?'#dba8b4':'#2f8e4a',treeLight:c.id==='blossom'?'#f0c4cd':'#55a651'},r=t.r;
 const crown=['alpine','pine','coast'].includes(c.theme)?'<path d="M'+t.x+' '+(t.y-r*2)+'l'+(-r*1.35)+' '+r*3+'h'+r*2.7+'Z" fill="'+p.tree+'"/><path d="M'+t.x+' '+(t.y-r*2)+'l'+(-r*.7)+' '+r*2+'h'+r*.7+'Z" fill="'+p.treeLight+'"/>':'<circle cx="'+t.x+'" cy="'+(t.y-.5)+'" r="'+r*1.4+'" fill="'+p.tree+'"/><circle cx="'+(t.x-.8)+'" cy="'+(t.y-1.1)+'" r="'+r*.95+'" fill="'+p.treeLight+'"/>';
 return '<g class="regional-tree"><ellipse cx="'+(t.x+1)+'" cy="'+(t.y+2)+'" rx="'+r*1.5+'" ry="'+r+'" fill="#32584130"/><circle cx="'+t.x+'" cy="'+t.y+'" r="'+r+'" fill="#765c3b"/>'+crown+'</g>';
}
