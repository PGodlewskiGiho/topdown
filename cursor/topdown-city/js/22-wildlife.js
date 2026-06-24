/* TOPDOWN CITY — 22-wildlife.js */
/* Forest bears — family groups, shy unless hungry / provoked. Wildlife kills ≠ wanted level. */
const bears=[];
const bearFamilies=[];
let bearTimer=0, nextFamilyId=1;
const BEAR_VARIANTS=["brown","dark","cinnamon","grizzly"];
const BEAR_ASSET_V=11;
const BEAR_SPRITE={ready:false,meta:null,img:{}};
const MAX_FAMILIES=2;
const FAMILY_HOME_R=380;
const BEAR_FLEE_R=175;
const BEAR_CURIOUS_R=95;
const BEAR_HUNGRY_R=130;
const BEAR_DEFEND_R=320;

(function loadBearSprites(){
  fetch("assets/bears/meta.json?v="+BEAR_ASSET_V).then(r=>r.json()).then(meta=>{
    BEAR_SPRITE.meta=meta;
    const kinds=Object.keys(meta.variants||{}); let left=kinds.length||0;
    if(!left){ BEAR_SPRITE.ready=true; return; }
    for(const k of kinds){
      const im=new Image();
      im.onload=im.onerror=()=>{ if(--left<=0) BEAR_SPRITE.ready=true; };
      im.src="assets/bears/"+meta.variants[k].file+"?v="+BEAR_ASSET_V;
      BEAR_SPRITE.img[k]=im;
    }
  }).catch(()=>{ BEAR_SPRITE.ready=true; });
})();

function inForestAt(x,y){
  const k=cellAt(x,y);
  return biomeOf(k[0],k[1])==="forest" && !isMountain(k[0],k[1]);
}
function getFamily(id){ return bearFamilies.find(f=>f.id===id); }
function playerPos(){
  if(mode==="car" && !car.dead) return {x:car.x,y:car.y,r:car.R};
  if(mode==="foot") return {x:ped.x,y:ped.y,r:ped.r};
  return null;
}
function pushBearFromBuildings(b){
  const ci=Math.floor((b.x-ROAD)/GAP), cj=Math.floor((b.y-ROAD)/GAP);
  for(let a=ci-1;a<=ci+1;a++) for(let c=cj-1;c<=cj+1;c++){
    const L=getLot(a,c);
    for(const bd of L.buildings){
      const qx=clamp(b.x,bd.x,bd.x+bd.w), qy=clamp(b.y,bd.y,bd.y+bd.h);
      const ex=b.x-qx, ey=b.y-qy, dd=Math.hypot(ex,ey);
      if(dd<b.r && dd>0.001){ b.x+=ex/dd*(b.r-dd); b.y+=ey/dd*(b.r-dd); }
    }
  }
}
function bearWanderTarget(b,fam){
  const hx=fam?fam.hx:b.homeX, hy=fam?fam.hy:b.homeY, hr=FAMILY_HOME_R*0.85;
  for(let t=0;t<16;t++){
    const ang=rng()*6.283, d=rand(80,hr);
    const tx=hx+Math.cos(ang)*d, ty=hy+Math.sin(ang)*d;
    if(inForestAt(tx,ty) && !inWater(tx,ty) && !inBuilding(tx,ty,18)){ b.tx=tx; b.ty=ty; return; }
  }
  b.tx=b.x+rand(-120,120); b.ty=b.y+rand(-120,120);
}
function makeBear(x,y,fam,opts){
  const isCub=opts&&opts.cub;
  const scale=isCub?rand(0.62,0.78):rand(0.92,1.14);
  return {
    kind:"bear", variant:BEAR_VARIANTS[(rng()*BEAR_VARIANTS.length)|0], scale,
    x, y, a:rng()*6.283, r:22*scale*(isCub?0.82:1),
    hp:isCub?55:110, maxHp:isCub?55:110,
    state:"wander", tx:x, ty:y,
    familyId:fam.id, homeX:fam.hx, homeY:fam.hy, cub:!!isCub,
    repick:rand(1.5,4), speed:rand(52,78)*scale, run:rand(95,128)*scale,
    attackCd:rand(0.3,0.9), attackT:0, walkT:rng()*0.5, moving:false,
    target:null, targetKind:null, roarCd:0,
    provokedT:0, fleeT:0,
  };
}
function spawnBearFamily(){
  for(let t=0;t<22;t++){
    const ang=rng()*6.283, dist=rand(280,920);
    const hx=focusX+Math.cos(ang)*dist, hy=focusY+Math.sin(ang)*dist;
    if(!inForestAt(hx,hy) || inWater(hx,hy) || inBuilding(hx,hy,24)) continue;
    let ok=true;
    for(const f of bearFamilies) if(Math.hypot(f.hx-hx,f.hy-hy)<520) ok=false;
    if(!ok) continue;
    const fam={id:nextFamilyId++, hx, hy, hunger:rand(0.08,0.35), anger:0};
    bearFamilies.push(fam);
    const adults=rand(1,2)|0, cubs=rng()<0.55?1:0, n=adults+cubs;
    const spawned=[];
    for(let i=0;i<n;i++){
      const a=ang+i*0.7, d=rand(18,55);
      const x=hx+Math.cos(a)*d, y=hy+Math.sin(a)*d;
      if(!inForestAt(x,y)){ continue; }
      spawned.push(makeBear(x,y,fam,{cub:i>=adults}));
    }
    if(spawned.length>=2) return spawned;
    const i=bearFamilies.indexOf(fam);
    if(i>=0) bearFamilies.splice(i,1);
  }
  return null;
}
function rallyFamily(b,reason){
  const fam=getFamily(b.familyId);
  if(!fam) return;
  fam.anger=Math.min(1,fam.anger+0.35);
  if(reason==="hurt") b.provokedT=Math.max(b.provokedT,18);
  for(const o of bears){
    if(o.familyId!==b.familyId) continue;
    if(Math.hypot(o.x-b.x,o.y-b.y)>BEAR_DEFEND_R) continue;
    o.provokedT=Math.max(o.provokedT,reason==="hurt"?16:10);
    if(o.state==="flee") o.state="wander";
  }
}
function bearShouldAggro(b,fam,pp,d){
  if(b.provokedT>0 || fam.anger>0.55) return true;
  if(fam.hunger>0.82 && d<BEAR_HUNGRY_R) return true;
  return d<BEAR_CURIOUS_R && fam.hunger>0.65;
}
function bearShouldFlee(b,fam,pp,d){
  if(b.provokedT>0 || fam.anger>0.4 || fam.hunger>0.75) return false;
  return d<BEAR_FLEE_R;
}
function bearTargetPos(b){
  if(b.targetKind==="player"){
    const pp=playerPos();
    return pp?{x:pp.x,y:pp.y,r:pp.r}:null;
  }
  if(b.targetKind==="ped" && b.target && b.target.state!=="down") return {x:b.target.x,y:b.target.y,r:b.target.r};
  return null;
}
function killBear(b){
  const i=bears.indexOf(b);
  if(i>=0) bears.splice(i,1);
  spawnBlood(b.x,b.y,0,0,1.1);
}
function bearHit(b,dmg,kx,ky,bloodAmt){
  if(b.hp<=0) return;
  b.hp-=dmg;
  rallyFamily(b,"hurt");
  if(b.hp>0){
    spawnBlood(b.x,b.y,kx,ky,0.35);
    b.state="chase";
    b.targetKind="player";
    b.target=null;
    b.provokedT=Math.max(b.provokedT,22);
    return;
  }
  rallyFamily(b,"hurt");
  killBear(b);
}
function bearTryAttack(b,dt){
  b.attackCd-=dt;
  b.attackT=Math.max(0,b.attackT-dt);
  const tp=bearTargetPos(b);
  if(!tp) return;
  const dx=tp.x-b.x, dy=tp.y-b.y, d=Math.hypot(dx,dy)||1;
  if(d>b.r+tp.r+14) return;
  if(b.attackCd>0) return;
  b.attackCd=0.82;
  b.attackT=0.32;
  const nx=dx/d, ny=dy/d;
  if(b.targetKind==="player"){
    if(mode==="foot") damage(rand(14,24));
    else if(mode==="car" && !car.dead) damageCar(car, rand(14,22), b.x, b.y, "impact");
  } else if(b.targetKind==="ped" && b.target){
    pedHit(b.target, rand(32,48), nx*130, ny*130, 0.85, true);
  }
}
function updateBear(b,dt){
  const fam=getFamily(b.familyId);
  if(!fam){ b.state="wander"; }
  else{
    fam.hunger=Math.min(1,fam.hunger+dt*0.000018);
    if(fam.anger>0) fam.anger=Math.max(0,fam.anger-dt*0.025);
  }
  if(b.provokedT>0) b.provokedT=Math.max(0,b.provokedT-dt);
  if(b.fleeT>0) b.fleeT=Math.max(0,b.fleeT-dt);

  if(!inForestAt(b.x,b.y) && (b.state==="wander"||b.state==="flee")){
    bearWanderTarget(b,fam);
    b.repick=0.5;
  }

  const pp=playerPos();
  let destX=b.tx, destY=b.ty, spd=b.speed;

  if(pp){
    const d=Math.hypot(pp.x-b.x,pp.y-b.y);
    if(bearShouldAggro(b,fam||{hunger:0,anger:0},pp,d)){
      b.state="chase";
      b.targetKind="player";
      b.target=null;
      b.fleeT=0;
      if(b.roarCd<=0 && d<110){ b.roarCd=3.5; playBoom(0.08); }
    } else if(bearShouldFlee(b,fam||{hunger:0,anger:0},pp,d)){
      b.state="flee";
      b.targetKind=null;
      b.target=null;
      b.fleeT=Math.max(b.fleeT,1.2);
      destX=b.x+(b.x-pp.x)/d*220;
      destY=b.y+(b.y-pp.y)/d*220;
      spd=b.run*1.05;
    } else if(b.state==="chase"||b.state==="attack"){
      b.state="wander";
      b.targetKind=null;
      b.repick=rand(0.6,1.6);
    }
  } else if(b.state==="chase"||b.state==="attack"){
    b.state="wander";
    b.targetKind=null;
    b.repick=0.8;
  }

  if(b.state==="chase"||b.state==="attack"){
    const tp=bearTargetPos(b);
    if(!tp){ b.state="wander"; b.repick=0.6; }
    else{
      destX=tp.x; destY=tp.y;
      spd=b.run;
      const d=Math.hypot(destX-b.x,destY-b.y);
      b.state=d<b.r+tp.r+16?"attack":"chase";
    }
  } else if(b.state!=="flee"){
    b.repick-=dt;
    if(b.repick<=0){ bearWanderTarget(b,fam); b.repick=rand(2.5,6); }
    if(fam){
      let cx=0,cy=0,n=0;
      for(const o of bears) if(o.familyId===fam.id){ cx+=o.x; cy+=o.y; n++; }
      if(n>1){
        cx/=n; cy/=n;
        b.tx+=(cx-b.tx)*0.012;
        b.ty+=(cy-b.ty)*0.012;
      }
      if(Math.hypot(b.x-fam.hx,b.y-fam.hy)>FAMILY_HOME_R){
        b.tx=fam.hx+rand(-80,80); b.ty=fam.hy+rand(-80,80);
        b.repick=1.5;
      }
    }
  }

  const dx=destX-b.x, dy=destY-b.y, d=Math.hypot(dx,dy)||1;
  if(d>8){
    b.a=Math.atan2(dy,dx);
    const mv=Math.min(1,d/90);
    b.x+=dx/d*spd*mv*dt;
    b.y+=dy/d*spd*mv*dt;
    b.moving=true;
    b.walkT=(b.walkT||0)+dt*(0.55+spd/180);
  } else b.moving=false;

  pushBearFromBuildings(b);
  collideTrees(b);
  if(inWater(b.x,b.y)){
    const px=b.x-Math.cos(b.a)*spd*dt, py=b.y-Math.sin(b.a)*spd*dt;
    if(!inWater(px,b.y)) b.x=px; else if(!inWater(b.x,py)) b.y=py;
    else bearWanderTarget(b,fam);
  }
  b.roarCd-=dt;
  if(b.state==="attack"||b.state==="chase") bearTryAttack(b,dt);

  if(mode==="car" && !car.dead){
    const cd=Math.hypot(car.x-b.x,car.y-b.y);
    if(cd<car.R+b.r){
      const sp=Math.hypot(car.vx,car.vy);
      if(sp>38) bearHit(b, sp*0.38, (b.x-car.x)/cd*110, (b.y-car.y)/cd*110, 0.75);
    }
  }
}
function updateWildlife(dt){
  const forest=inForestAt(focusX,focusY);
  bearTimer-=dt;
  for(let i=bears.length-1;i>=0;i--){
    const b=bears[i];
    updateBear(b,dt);
    if(Math.hypot(b.x-focusX,b.y-focusY)>2400 || b.hp<=0) bears.splice(i,1);
  }
  for(let i=bearFamilies.length-1;i>=0;i--){
    if(!bears.some(b=>b.familyId===bearFamilies[i].id)) bearFamilies.splice(i,1);
  }
  if(!forest) return;
  if(bearFamilies.length<MAX_FAMILIES && bearTimer<=0){
    bearTimer=rand(2.5,5.5);
    const group=spawnBearFamily();
    if(group) bears.push(...group);
  }
}
function bearDir8(a){
  return Math.floor((a+Math.PI/8)/(Math.PI/4)+8)%8;
}
function bearAnimFrame(b){
  const m=BEAR_SPRITE.meta;
  if(!m) return 0;
  const fpd=m.framesPerDirection||m.frames||5;
  const wf=m.walkFrames||[0,1,2,3];
  let local=0;
  if(b.attackT>0.08) local=m.attackFrame??4;
  else if(b.moving){
    const step=m.walkStep??0.11;
    local=wf[Math.floor((b.walkT||0)/step)%wf.length];
  }
  return bearDir8(b.a)*fpd+local;
}
function bearDrawScale(b,m,dir){
  const scBase=b.r*2.65*(b.scale||1)/(m.frameHeight||128);
  const front=(dir===2)?1.08:(dir===1||dir===3)?1.04:1;
  return scBase*front;
}
function drawBearFallback(b){
  ctx.fillStyle="rgba(0,0,0,.2)";
  ctx.beginPath(); ctx.ellipse(b.x+2,b.y+3,b.r*0.85,b.r*0.4,0,0,7); ctx.fill();
  ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.a);
  ctx.fillStyle="#5a4030"; ctx.beginPath(); ctx.ellipse(0,0,b.r*0.75,b.r*0.55,0,0,7); ctx.fill();
  ctx.restore();
}
function drawBear(b){
  const m=BEAR_SPRITE.meta, img=BEAR_SPRITE.img[b.variant]||BEAR_SPRITE.img.brown;
  if(!BEAR_SPRITE.ready||!m||!img||!img.complete||!img.naturalWidth){ drawBearFallback(b); return; }
  const fw=m.frameWidth||384, fh=m.frameHeight||320;
  const ax=m.anchorX??fw/2, ay=m.anchorY??fh-8;
  const fr=bearAnimFrame(b);
  const dir=bearDir8(b.a);
  const sc=bearDrawScale(b,m,dir);
  ctx.fillStyle="rgba(0,0,0,.24)";
  ctx.beginPath(); ctx.ellipse(b.x+2,b.y+4,b.r*0.95,b.r*0.46,0,0,7); ctx.fill();
  ctx.save();
  ctx.translate(b.x,b.y);
  const sm=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  ctx.drawImage(img, fr*fw, 0, fw, fh, -ax*sc, -ay*sc, fw*sc, fh*sc);
  ctx.imageSmoothingEnabled=sm;
  ctx.restore();
  if(b.hp<b.maxHp){
    const f=clamp(b.hp/b.maxHp,0,1);
    ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(b.x-14,b.y-b.r-10,28,3);
    ctx.fillStyle=f>0.45?"#c04030":"#802018"; ctx.fillRect(b.x-14,b.y-b.r-10,28*f,3);
  }
}
function drawWildlife(ox,oy){
  for(const b of bears){
    if(b.x<ox-60||b.x>ox+VW+60||b.y<oy-60||b.y>oy+VH+60) continue;
    drawBear(b);
  }
}
