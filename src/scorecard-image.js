import {recordHoles,scoreTotal} from './records.js';
const sum=a=>a.reduce((n,v)=>n+v,0),diff=n=>n===0?'E':n>0?'+'+n:String(n);
export async function scorecardImage(record){
 if(document.fonts?.ready)await document.fonts.ready;
 const holes=recordHoles(record);if(holes.length!==18)throw Error('코스 정보를 찾을 수 없어요.');
 const players=record.players,canvas=document.createElement('canvas'),w=1200,h=790+players.length*212;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw Error('이미지를 만들 수 없어요.');
 const text=(s,x,y,size=28,color='#203c31',align='left',weight=500)=>{ctx.font=`${weight} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y,align==='left'&&x===64?210:1080);};
 const box=(x,y,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,width,height);};
 box(0,0,w,h,'#f4f8ef');box(0,0,w,206,'#205e3d');
 let logo;try{logo=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=new URL('../assets/brand/playpark-symbol.png',import.meta.url).href;});}catch{}
 if(logo)ctx.drawImage(logo,54,44,110,110);
 text('PLAYPARK',190,75,32,'#f5f9ef','left',700);text('우리의 18홀 스코어카드',190,132,46,'#fff','left',800);
 text(new Date(record.completedAt).toLocaleString('ko-KR'),1148,182,24,'#deedcf','right');
 let y=249;text(`${holes[0].courseName}  →  ${holes[9].courseName}`,54,y,32,'#205e3d','left',700);y+=54;
 const par=sum(holes.map(x=>x.par)),totals=players.map(scoreTotal).sort((a,b)=>a-b);
 for(const p of players){const score=scoreTotal(p),rank=totals.indexOf(score)+1;box(48,y-24,1104,84,'#fff');text(`${rank}위`,68,y+16,28,'#297b47','left',800);text(p.name,155,y+16,30,'#203c31','left',700);text(`${score}타  (${diff(score-par)})`,1118,y+5,37,'#205e3d','right',800);text(`벌타 ${sum(p.penalties||[])} 포함`,1118,y+39,21,'#526654','right');y+=100;}
 for(const offset of [0,9]){y+=24;text(`${offset===0?'전반 OUT':'후반 IN'} · ${holes[offset].courseName}`,54,y,32,'#205e3d','left',800);y+=32;
  const x=48,nameWidth=240,cell=80,totalWidth=144,rowHeight=56;
  const row=(label,values,total,background,parRow=false)=>{box(x,y,1104,rowHeight,background);text(label,x+16,y+28,24,'#203c31','left',700);values.forEach((v,i)=>{const d=typeof v==='number'&&!parRow?v-holes[offset+i].par:0;const cx=x+nameWidth+cell*(i+.5);if(d<0){ctx.strokeStyle='#297b47';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,y+28,22,0,Math.PI*2);ctx.stroke();}text(v,cx,y+28,26,d<0?'#21653c':d>0?'#a34d2b':'#203c31','center',700);});text(total,x+nameWidth+cell*9+totalWidth/2,y+28,26,'#203c31','center',800);y+=rowHeight;};
  row('플레이어 / 홀',holes.slice(offset,offset+9).map(x=>String(x.number)),'합계','#dbead1',true);
  row('기준 타수 (PAR)',holes.slice(offset,offset+9).map(x=>x.par),sum(holes.slice(offset,offset+9).map(x=>x.par)),'#ecf3e5',true);
  players.forEach((p,i)=>row(p.name,p.scores.slice(offset,offset+9),sum(p.scores.slice(offset,offset+9)),i%2?'#f8faf5':'#fff'));y+=10;
 }
 text('모든 타수는 벌타를 포함합니다. 동점은 공동 순위입니다.',54,y+44,25,'#526654');text('PLAYPARK · 플팍과 함께한 오늘의 기록',54,h-40,24,'#205e3d','left',700);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('이미지 저장 실패')),'image/png'));
 return {blob,width:w,height:h,filename:`playpark-scorecard-${record.completedAt.slice(0,10)}-${record.id.slice(0,8)}.png`};
}
