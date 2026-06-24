/* TOPDOWN CITY — 22-wildlife.js */
/* Forest wildlife — PNG sprite sheets (4 walk + attack), procedural fallback if assets missing. */
const bears=[];
let bearTimer=0;
const BEAR_VARIANTS=["brown","dark","cinnamon","grizzly"];
const BEAR_ASSET_V=11;
const BEAR_SPRITE={ready:false,meta:null,img:{}};

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
function bearWanderTarget(b){
  for(let t=0;t<14;t++){
    const ang=rng()*6.283, d=rand(140,480);
    const tx=b.x+Math.cos(ang)*d, ty=b.y+Math.sin(ang)*d;
    if(inForestAt(tx,ty) && !inWater(tx,ty) && !inBuilding(tx,ty,18)){ b.tx=tx; b.ty=ty; return; }
  }
  b.tx=b.x+rand(-220,220); b.ty=b.y+rand(-220,220);
}
function spawnBear(){
  const ang=rng()*6.283, dist=rand(180,780), x=focusX+Math.cos(ang)*dist, y=focusY+Math.sin(ang)*dist;
  if(!inForestAt(x,y) || inWater(x,y) || inBuilding(x,y,22)) return null;
  for(const o of bears) if((o.x-x)**2+(o.y-y)**2<130*130) return null;
  const variant=BEAR_VARIANTS[(rng()*BEAR_VARIANTS.length)|0];
  const scale=rand(0.92,1.18);
  return {
    kind:"bear", variant, scale, x, y, a:rng()*6.283, vx:0, vy:0, r:22*scale,
    hp:110, maxHp:110, state:"wander", tx:x, ty:y,
    repick:rand(1.2,3.5), speed:rand(64,92)*scale, run:rand(118,152)*scale,
    attackCd:rand(0.2,0.7), attackT:0, walkT:rng()*0.5, moving:false,
    target:null, targetKind:null, roarCd:0,
  };
}
function bearTargetPos(b){
  if(b.targetKind==="player"){
    if(mode==="car" && !car.dead) return {x:car.x,y:car.y,r:car.R};
    if(mode==="foot") return {x:ped.x,y:ped.y,r:ped.r};
    return null;
  }
  if(b.targetKind==="ped" && b.target && b.target.state!=="down") return {x:b.target.x,y:b.target.y,r:b.target.r};
  return null;
}
function findBearTarget(b){
  let best=null, bestD=1e9, kind=null;
  if(mode==="foot" || (mode==="car" && !car.dead)){
    const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y;
    const ar=mode==="car"?car.R:ped.r, d=Math.hypot(ax-b.x,ay-b.y);
    if(d<250 && d<bestD){ best={x:ax,y:ay,r:ar}; bestD=d; kind="player"; }
  }
  for(const p of peds){
    if(p.state==="down") continue;
    const d=Math.hypot(p.x-b.x,p.y-b.y);
    if(d<210 && d<bestD){ best=p; bestD=d; kind="ped"; }
  }
  return best?{ref:best, kind, d:bestD}:null;
}
function killBear(b){
  const i=bears.indexOf(b);
  if(i>=0) bears.splice(i,1);
  spawnBlood(b.x,b.y,0,0,1.1);
}
function bearHit(b,dmg,kx,ky,bloodAmt){
  if(b.hp<=0) return;
  b.hp-=dmg;
  if(b.hp>0){
    spawnBlood(b.x,b.y,kx,ky,0.35);
    b.state="chase";
    b.targetKind="player";
    b.target=null;
    b.roarCd=0;
    return;
  }
  killBear(b);
}
function bearTryAttack(b,dt){
  b.attackCd-=dt;
  b.attackT=Math.max(0,b.attackT-dt);
  const tp=bearTargetPos(b);
  if(!tp) return;
  const dx=tp.x-b.x, dy=tp.y-b.y, d=Math.hypot(dx,dy)||1;
  const hitR=b.r+tp.r+12;
  if(d>hitR+6) return;
  if(b.attackCd>0) return;
  b.attackCd=0.78;
  b.attackT=0.32;
  const nx=dx/d, ny=dy/d;
  if(b.targetKind==="player"){
    if(mode==="foot") damage(rand(18,30));
    else if(mode==="car" && !car.dead) damageCar(car, rand(16,26), b.x, b.y, "impact");
  } else if(b.targetKind==="ped" && b.target){
    pedHit(b.target, rand(38,58), nx*150, ny*150, 0.95);
  }
}
function updateBear(b,dt){
  if(!inForestAt(b.x,b.y) && b.state==="wander"){
    bearWanderTarget(b);
    b.repick=0.4;
  }
  const tg=findBearTarget(b);
  if(tg){
    if(b.state!=="chase" && b.state!=="attack"){
      b.state="chase";
      b.target=tg.kind==="ped"?tg.ref:null;
      b.targetKind=tg.kind;
      alertPeds(b.x,b.y,240);
      if(b.roarCd<=0){ b.roarCd=2.5; playBoom(0.12); }
    } else {
      b.target=tg.kind==="ped"?tg.ref:null;
      b.targetKind=tg.kind;
    }
  } else if(b.state==="chase"){
    b.state="wander";
    b.target=null;
    b.targetKind=null;
    b.repick=rand(0.8,2);
  }

  let spd=b.speed, destX=b.tx, destY=b.ty;
  if(b.state==="chase" || b.state==="attack"){
    const tp=bearTargetPos(b);
    if(!tp){ b.state="wander"; b.repick=0.5; }
    else {
      destX=tp.x; destY=tp.y;
      spd=b.run;
      const d=Math.hypot(destX-b.x,destY-b.y);
      if(d<b.r+tp.r+14) b.state="attack";
      else b.state="chase";
    }
  } else {
    b.repick-=dt;
    if(b.repick<=0){ bearWanderTarget(b); b.repick=rand(2,5); }
  }

  const dx=destX-b.x, dy=destY-b.y, d=Math.hypot(dx,dy)||1;
  if(d>8){
    b.a=Math.atan2(dy,dx);
    const mv=Math.min(1,d/90);
    b.x+=dx/d*spd*mv*dt;
    b.y+=dy/d*spd*mv*dt;
    b.moving=true;
    // LPC walk: ~100 ms/frame; scale step rate with movement speed
    b.walkT=(b.walkT||0)+dt*(0.55+spd/180);
  } else b.moving=false;
  pushBearFromBuildings(b);
  collideTrees(b);
  if(inWater(b.x,b.y)){
    const px=b.x-Math.cos(b.a)*spd*dt, py=b.y-Math.sin(b.a)*spd*dt;
    if(!inWater(px,b.y)) b.x=px; else if(!inWater(b.x,py)) b.y=py;
    else bearWanderTarget(b);
  }
  b.roarCd-=dt;
  if(b.state==="attack" || b.state==="chase") bearTryAttack(b,dt);

  if(mode==="car" && !car.dead){
    const cd=Math.hypot(car.x-b.x,car.y-b.y);
    if(cd<car.R+b.r){
      const sp=Math.hypot(car.vx,car.vy);
      if(sp>38){
        const nx=(b.x-car.x)/cd, ny=(b.y-car.y)/cd;
        bearHit(b, sp*0.42, nx*120, ny*120, 0.85);
      }
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
  if(!forest) return;
  const cap=Math.min(10, 4+Math.floor(Math.max(VW,VH)/420));
  if(bears.length<cap && bearTimer<=0){
    bearTimer=bears.length<3?0.35:0.75;
    const nb=spawnBear();
    if(nb) bears.push(nb);
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
  const w=(m.frameWidth||128)*sc, h=(m.frameHeight||128)*sc;
  ctx.fillStyle="rgba(0,0,0,.24)";
  ctx.beginPath(); ctx.ellipse(b.x+2,b.y+4,b.r*0.95,b.r*0.46,0,0,7); ctx.fill();
  ctx.save();
  ctx.translate(b.x,b.y);
  const sm=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  ctx.drawImage(img, fr*fw, 0, fw, fh, -ax*sc, -ay*sc, w, h);
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
