// Continuous ball-circle contacts prevent a fast shot from passing through rocks.
export const BALL_RADIUS=.035;
export function firstRockHit(from,to,rocks=[]){
 if(!rocks.length)return null;
 let first=null;const dx=to.x-from.x,dy=to.y-from.y,a=dx*dx+dy*dy;if(a<1e-16)return null;
 for(const rock of rocks){const x=from.x-rock.x,y=from.y-rock.y,r=rock.r+BALL_RADIUS,b=2*(x*dx+y*dy),c=x*x+y*y-r*r,disc=b*b-4*a*c;if(disc<0)continue;
  const t=(-b-Math.sqrt(disc))/(2*a);if(t<0||t>1||(first&&t>=first.t))continue;
  const point={x:from.x+dx*t,y:from.y+dy*t},n={x:(point.x-rock.x)/r,y:(point.y-rock.y)/r};first={t,point,normal:n};
 }return first;
}
export function clearOfObstacles(p,h,padding=.1){return h.trees.every(t=>Math.hypot(p.x-t.x,p.y-t.y)>=t.r+padding)&&(h.rocks||[]).every(r=>Math.hypot(p.x-r.x,p.y-r.y)>=r.r+padding);}
export function rocksArt(h){return (h.rocks||[]).map((r,i)=>{const {x,y}=r,size=r.r;return '<g class="course-rock" data-rock="'+i+'" role="img" aria-label="큰 바위 · 공이 맞으면 튕겨요"><ellipse cx="'+(x+.4)+'" cy="'+(y+.6)+'" rx="'+(size+.5)+'" ry="'+(size*.85)+'" fill="#253b3945"/><circle cx="'+x+'" cy="'+y+'" r="'+size+'" fill="#667680" stroke="#364a53" stroke-width=".24"/><path d="M'+(x-size*.88)+' '+(y-size*.32)+' L'+(x-size*.28)+' '+(y-size*.92)+' L'+(x+size*.62)+' '+(y-size*.69)+' L'+(x+size*.84)+' '+(y+size*.22)+' L'+(x-size*.1)+' '+(y+size*.45)+'Z" fill="#a9b5b5"/><path d="M'+(x-size*.28)+' '+(y-size*.92)+' L'+(x-size*.12)+' '+(y+size*.1)+' L'+(x+size*.84)+' '+(y+size*.22)+' M'+(x-size*.12)+' '+(y+size*.1)+' L'+(x-size*.1)+' '+(y+size*.75)+'" fill="none" stroke="#667a80" stroke-width=".22"/><ellipse cx="'+(x-size*.65)+'" cy="'+(y+size*.4)+'" rx="'+(size*.35)+'" ry="'+(size*.18)+'" fill="#6a845e"/></g>';}).join('');}
