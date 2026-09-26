export const PLAYER_COLORS=['#467bb7','#b6751c','#b5527c','#407e59'];
export const AVATARS=[
 {id:'green',name:'플팍이',left:'-30%',top:'-473%',size:'1099%'},
 {id:'blue',name:'파준',left:'-1418%',top:'-986%',size:'1963%'},
 {id:'rose',name:'파순',left:'-1341%',top:'-765%',size:'1616%'},
 {id:'gold',name:'파파',left:'-1205%',top:'-569%',size:'1309%'},
 {id:'plum',name:'파미',left:'-1421%',top:'-782%',size:'1616%'},
 {id:'rashi',name:'래쉬',left:'4%',top:'2%',size:'92%',src:'rashi-3d.png'}
];
export const escapeProfile=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizeProfile(profile,index=0){
 if(profile?.kind==='photo'&&typeof profile.src==='string'&&profile.src.length<=100000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(profile.src))return {kind:'photo',src:profile.src};
 return {kind:'avatar',id:AVATARS.some(a=>a.id===profile?.id)?profile.id:AVATARS[index%AVATARS.length]?.id||'green'};
}
export function avatarImage(profile,index=0){
 const p=normalizeProfile(profile,index);if(p.kind==='photo')return '<img class="player-portrait" src="'+p.src+'" alt="" draggable="false">';
 const a=AVATARS.find(a=>a.id===p.id);
 return '<span class="player-portrait avatar-crop" style="--face-left:'+a.left+';--face-top:'+a.top+';--sprite-size:'+(a.size||'500%')+'"><img class="avatar-sprite" src="./assets/brand/'+(a.src||'plpak-friends-3d.jpg')+'" alt="" draggable="false"></span>';
}
export function profileSetup(names,count,profiles){return '<section class="profile-setup"><h3>공 옆에 표시할 프로필</h3><p>각 플레이어의 사진이나 아바타를 골라요. 사진은 이 기기에만 저장됩니다.</p>'+names.slice(0,count).map((name,i)=>'<div class="profile-editor" data-profile-index="'+i+'"><div class="profile-editor-heading"><span class="setup-portrait" data-profile-preview="'+i+'">'+avatarImage(profiles[i],i)+'</span><b data-profile-name="'+i+'">'+(i+1)+'. '+escapeProfile(name||'플레이어')+'</b></div><div class="avatar-choices">'+AVATARS.map(a=>'<button class="avatar-choice" data-action="choose-avatar" data-index="'+i+'" data-id="'+a.id+'" aria-label="플레이어 '+(i+1)+' '+a.name+'" aria-pressed="'+(profiles[i]?.kind==='avatar'&&profiles[i]?.id===a.id)+'">'+avatarImage({kind:'avatar',id:a.id},i)+'</button>').join('')+'</div><label class="secondary profile-upload">사진 선택<input type="file" accept="image/jpeg,image/png,image/webp" data-profile-file="'+i+'"></label></div>').join('')+'</section>';}
export async function prepareProfilePhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file?.type)||file.size>8*1024*1024)throw Error('8MB 이하의 JPG, PNG, WebP 사진을 선택해 주세요.');
 const url=URL.createObjectURL(file),img=new Image();
 try{img.src=url;await img.decode();if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000)throw Error('사진 크기가 너무 커요. 작은 사진을 선택해 주세요.');const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d');if(!ctx)throw Error('사진을 처리할 수 없어요.');const side=Math.min(img.naturalWidth,img.naturalHeight);ctx.fillStyle='#e9eddf';ctx.fillRect(0,0,160,160);ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,160,160);return {kind:'photo',src:canvas.toDataURL('image/jpeg',.82)};}finally{URL.revokeObjectURL(url);}
}
