/* TOPDOWN CITY — 33-lake-fish.js */
/* Lake biome fish — schools, swimming AI, surface jumps */

const lakeFish=[], lakeSplashes=[];
let lakeFishTimer=0, nextSchoolId=1;
const MAX_LAKE_FISH=72, MAX_LAKE_SCHOOLS=10;

const FISH_TYPES={
  carp:  {col:"#c89858", fin:"#a87840", len:11, spd:34, school:0.72},
  perch: {col:"#688848", fin:"#486830", len:9, spd:42, school:0.82},
  pike:  {col:"#789878", fin:"#486850", len:14, spd:48, school:0.55},
  roach: {col:"#b0a080", fin:"#887860", len:8, spd:38, school:0.88},
};

function isLakeBiomeWater(x,y){
  const sc=lakeScore(x,y);
  if(sc<=0.04) return false;
  const k=cellAt(x,y);
  return biomeOf(k[0],k[1])==="lake";
}
function lakeFishDepth(x,y){
  return clamp(lakeScore(x,y)*2.8, 0.12, 1);
}
function lakeFishWanderTarget(f,dist){
  dist=dist||rand(60,140);
  for(let t=0;t<18;t++){
    const ang=rng()*6.283;
    const tx=f.hx+Math.cos(ang)*dist, ty=f.hy+Math.sin(ang)*dist;
    if(isLakeBiomeWater(tx,ty) && !inBuilding(tx,ty,12)){
      f.tx=tx; f.ty=ty; return true;
    }
  }
  f.tx=f.hx; f.ty=f.hy; return false;
}
function spawnLakeFishSchool(){
  for(let t=0;t<32;t++){
    const ang=rng()*6.283, dist=rand(60,480);
    const hx=focusX+Math.cos(ang)*dist, hy=focusY+Math.sin(ang)*dist;
    if(!isLakeBiomeWater(hx,hy)) continue;
    for(const f of lakeFish) if(Math.hypot(f.hx-hx,f.hy-hy)<110) return null;
    const keys=Object.keys(FISH_TYPES);
    const kind=keys[(hsh(hx|0,hy|0,911)*keys.length)|0];
    const def=FISH_TYPES[kind];
    const n=3+(rng()*5|0);
    const sid=nextSchoolId++;
    const out=[];
    for(let i=0;i<n;i++){
      const ox=(rng()-0.5)*36, oy=(rng()-0.5)*36;
      const x=hx+ox, y=hy+oy;
      if(!isLakeBiomeWater(x,y)) continue;
      out.push({
        kind, schoolId:sid, hx, hy,
        x,y, a:rng()*6.283, r:def.len*0.42,
        tx:x, ty:y, repick:rand(0.6,1.8),
        tailT:rng()*6.28, depth:lakeFishDepth(x,y),
        jumpT:0, jumpA:0, jumpSp:0,
      });
    }
    if(out.length>=2) return out;
  }
  return null;
}
function lakeFishTryJump(f){
  if(f.jumpT>0 || rng()>0.0018) return;
  f.jumpT=0.55+rng()*0.35;
  f.jumpA=f.a+Math.PI/2+(rng()-0.5)*0.8;
  f.jumpSp=rand(18,32);
  f.jumpX=f.x; f.jumpY=f.y;
  lakeSplashes.push({x:f.x,y:f.y,t:0,life:0.55,w:8+rng()*10});
}
function updateLakeFish(dt){
  for(let i=lakeSplashes.length-1;i>=0;i--){
    const s=lakeSplashes[i];
    s.t+=dt;
    if(s.t>=s.life) lakeSplashes.splice(i,1);
  }
  const nearLake=isLakeBiomeWater(focusX,focusY)||(()=>{
    for(let a=0;a<8;a++){
      const ang=a/8*6.283, x=focusX+Math.cos(ang)*120, y=focusY+Math.sin(ang)*120;
      if(isLakeBiomeWater(x,y)) return true;
    }
    return false;
  })();
  for(let i=lakeFish.length-1;i>=0;i--){
    const f=lakeFish[i];
    const def=FISH_TYPES[f.kind]||FISH_TYPES.carp;
    f.tailT=(f.tailT||0)+dt*10;
    f.repick=(f.repick||0)-dt;
    if(Math.hypot(f.x-focusX,f.y-focusY)>Math.max(VW,VH)*0.95+300){ lakeFish.splice(i,1); continue; }

    if(f.jumpT>0){
      f.jumpT-=dt;
      const p=1-f.jumpT/(f.jumpT+dt+0.001);
      const h=Math.sin(p*Math.PI)*f.jumpSp;
      f.x=f.jumpX+Math.cos(f.jumpA)*h*0.15;
      f.y=f.jumpY+Math.sin(f.jumpA)*h*0.15-Math.sin(p*Math.PI)*f.jumpSp*0.35;
      if(f.jumpT<=0){ f.x=f.jumpX; f.y=f.jumpY; lakeFishWanderTarget(f,90); }
      continue;
    }

    if(f.repick<=0){
      lakeFishWanderTarget(f,rand(50,130));
      f.repick=rand(1.1,2.6);
      if(rng()<0.08) lakeFishTryJump(f);
    }
    const dx=f.tx-f.x, dy=f.ty-f.y, d=Math.hypot(dx,dy)||1;
    if(d>5){
      f.a=Math.atan2(dy,dx);
      const mv=Math.min(1,d/80);
      const spd=def.spd*(0.85+def.school*0.2);
      f.x+=dx/d*spd*mv*dt;
      f.y+=dy/d*spd*mv*dt;
      f.depth=lakeFishDepth(f.x,f.y);
      if(!isLakeBiomeWater(f.x,f.y)){
        f.x-=dx/d*spd*dt*1.2; f.y-=dy/d*spd*dt*1.2;
        lakeFishWanderTarget(f,70);
      }
    } else if(rng()<dt*0.012) lakeFishTryJump(f);
  }
  if(!nearLake) return;
  lakeFishTimer-=dt;
  const schools=new Set(lakeFish.map(f=>f.schoolId)).size;
  if(schools<MAX_LAKE_SCHOOLS&&lakeFish.length<MAX_LAKE_FISH&&lakeFishTimer<=0){
    lakeFishTimer=rand(0.6,2.2);
    const batch=spawnLakeFishSchool();
    if(batch) lakeFish.push(...batch);
  }
}

function drawOneLakeFish(f){
  const def=FISH_TYPES[f.kind]||FISH_TYPES.carp;
  const jumping=f.jumpT>0;
  const dep=jumping?0.35:(f.depth||0.5);
  const sc=0.72+dep*0.38;
  const len=def.len*sc, tail=Math.sin(f.tailT||0)*len*0.22;
  const alpha=jumping?0.92:(0.38+dep*0.42);
  ctx.save();
  ctx.translate(f.x,f.y);
  ctx.rotate(f.a);
  ctx.globalAlpha=alpha;
  ctx.fillStyle=def.fin;
  ctx.beginPath();
  ctx.moveTo(-len*0.55,0);
  ctx.lineTo(-len*0.92+tail*0.3,tail*0.55);
  ctx.lineTo(-len*0.92-tail*0.3,-tail*0.55);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle=def.col;
  ctx.beginPath();
  ctx.ellipse(0,0,len*0.52,len*0.28,0,0,7);
  ctx.fill();
  ctx.fillStyle=shade(def.col,-22);
  ctx.beginPath(); ctx.arc(len*0.28,0,len*0.14,0,7); ctx.fill();
  ctx.fillStyle="#1a2830";
  ctx.beginPath(); ctx.arc(len*0.34,-len*0.06,len*0.045,0,7); ctx.fill();
  ctx.fillStyle=def.fin;
  ctx.beginPath(); ctx.moveTo(-len*0.05,len*0.22); ctx.lineTo(-len*0.2,len*0.42); ctx.lineTo(len*0.05,len*0.18); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-len*0.05,-len*0.22); ctx.lineTo(-len*0.2,-len*0.42); ctx.lineTo(len*0.05,-len*0.18); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawLakeFish(ox,oy){
  for(const f of lakeFish){
    if(f.x<ox-40||f.x>ox+VW+40||f.y<oy-40||f.y>oy+VH+40) continue;
    drawOneLakeFish(f);
  }
  const t=performance.now()/1000;
  for(const s of lakeSplashes){
    if(s.x<ox-20||s.x>ox+VW+20||s.y<oy-20||s.y>oy+VH+20) continue;
    const p=s.t/s.life, al=(1-p)*0.55;
    ctx.strokeStyle=`rgba(220,240,255,${al.toFixed(3)})`;
    ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.ellipse(s.x,s.y,s.w*(0.5+p*0.9),s.w*(0.18+p*0.12),0,0,7); ctx.stroke();
    if(p<0.35){
      ctx.fillStyle=`rgba(255,255,255,${(0.35*(1-p/0.35)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(s.x,s.y-2-Math.sin(t*18+s.x)*1.2,1.8,0,7); ctx.fill();
    }
  }
}
