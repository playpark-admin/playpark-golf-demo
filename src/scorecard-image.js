import {APP_INFO} from './app-info.js';
import {scoreLabel} from './engine.js';
import {recordHoles,scoreTotal} from './records.js';
const sum=a=>a.reduce((n,v)=>n+v,0),diff=n=>n===0?'E':n>0?'+'+n:String(n);
export async function scorecardImage(record,{theme='classic'}={}){
 if(document.fonts?.ready)await document.fonts.ready;
 const holes=recordHoles(record);if(holes.length!==18)throw Error('코스 정보를 찾을 수 없어요.');
 const players=record.players,canvas=document.createElement('canvas'),w=1200,h=790+players.length*308;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw Error('이미지를 만들 수 없어요.');
 const text=(s,x,y,size=28,color='#203c31',align='left',weight=500,maxWidth=1080)=>{ctx.font=`${weight} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y,maxWidth);};
 const box=(x,y,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,width,height);};
 const gold=theme==='gold';box(0,0,w,h,gold?'#fbf5e7':'#f4f8ef');box(0,0,w,206,gold?'#26354e':'#205e3d');if(gold){box(0,202,w,4,'#c99e48');}
 let logo;try{logo=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=new URL('../assets/brand/playpark-symbol.png',import.meta.url).href;});}catch{}
 if(logo)ctx.drawImage(logo,54,44,110,110);
 text(APP_INFO.name,190,75,32,'#f5f9ef','left',700);const venueNames=[...new Set([holes[0].venueName,holes[9].venueName].filter(Boolean))];if(venueNames.length)text(venueNames.join(' · '),1148,75,25,'#f5f9ef','right',600);text(gold?'PLUS · 18홀 스코어카드':'우리의 18홀 스코어카드',190,132,46,'#fff','left',800);
 text(new Date(record.completedAt).toLocaleString('ko-KR'),1148,182,24,'#deedcf','right');
 let y=249;text(`${holes[0].courseName}  →  ${holes[9].courseName}`,54,y,32,'#205e3d','left',700);y+=54;
 const par=sum(holes.map(x=>x.par)),totals=players.map(scoreTotal).sort((a,b)=>a-b);
 for(const p of players){const score=scoreTotal(p),rank=totals.indexOf(score)+1;box(48,y-24,1104,84,'#fff');text(`${rank}위`,68,y+16,28,'#297b47','left',800);text(p.name,155,y+16,30,'#203c31','left',700);text(`${score}타  (${diff(score-par)})`,1118,y+5,37,'#205e3d','right',800);text(`벌타 ${sum(p.penalties||[])} 포함`,1118,y+39,21,'#526654','right');y+=100;}
 for(const offset of [0,9]){y+=24;text(`${offset===0?'전반 OUT':'후반 IN'} · ${holes[offset].courseName}`,54,y,32,'#205e3d','left',800);y+=32;
  const x=48,nameWidth=180,cell=92,totalWidth=96,headerHeight=56,scoreHeight=104;
  const row=(label,values,total,background,parRow=false)=>{
   const height=parRow?headerHeight:scoreHeight;
   box(x,y,1104,height,background);
   if(parRow)text(label,x+16,y+height/2,24,'#203c31','left',700,nameWidth-32);
   else{
    ctx.font='700 24px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    const lines=[];let line='';
    for(const char of String(label)){if(line&&ctx.measureText(line+char).width>nameWidth-32){lines.push(line);line='';}line+=char;}if(line)lines.push(line);
    const shown=lines.slice(0,3);if(lines.length>3)shown[2]=shown[2].slice(0,-1)+'…';
    shown.forEach((line,j)=>text(line,x+16,y+height/2+(j-(shown.length-1)/2)*28,24,'#203c31','left',700,nameWidth-32));
   }
   values.forEach((v,i)=>{
    const d=parRow?0:v-holes[offset+i].par,cx=x+nameWidth+cell*(i+.5),color=d<0?'#21653c':d>0?'#a34d2b':'#203c31',numberY=y+(parRow?28:25);
    if(!parRow){box(x+nameWidth+cell*i+2,y+3,cell-4,height-6,d<0?'#edf5e4':d>0?'#fff0e8':'#f1f5ef');}
    if(d<0){ctx.strokeStyle='#297b47';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,numberY,20,0,Math.PI*2);ctx.stroke();}
    text(v,cx,numberY,26,color,'center',700,cell-12);
    if(!parRow){const label=scoreLabel(v,holes[offset+i].par),lines=label.split(' ');lines.forEach((line,j)=>text(line,cx,y+(lines.length>1?59+j*25:71),22,color,'center',700,cell-12));}
   });
   text(total,x+nameWidth+cell*9+totalWidth/2,y+height/2,26,'#203c31','center',800,totalWidth-12);y+=height;
  };
  row('플레이어 / 홀',holes.slice(offset,offset+9).map(x=>String(x.number)),'합계','#dbead1',true);
  row('기준 타수 (PAR)',holes.slice(offset,offset+9).map(x=>x.par),sum(holes.slice(offset,offset+9).map(x=>x.par)),'#ecf3e5',true);
  players.forEach((p,i)=>row(p.name,p.scores.slice(offset,offset+9),sum(p.scores.slice(offset,offset+9)),i%2?'#f8faf5':'#fff'));y+=10;
 }
 text('모든 타수는 벌타를 포함합니다. 동점은 공동 순위입니다.',54,y+44,25,'#526654');text(APP_INFO.name+(gold?' PLUS · 오늘의 골드 스코어카드':' · 플팍과 함께한 오늘의 기록'),54,h-40,24,gold?'#876524':'#205e3d','left',700);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('이미지 저장 실패')),'image/png'));
 return {blob,width:w,height:h,filename:`playpark-scorecard-${record.completedAt.slice(0,10)}-${record.id.slice(0,8)}.png`};
}
