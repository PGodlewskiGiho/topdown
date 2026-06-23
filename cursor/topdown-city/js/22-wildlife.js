/* TOPDOWN CITY — 22-wildlife.js */
/* Forest wildlife — procedural canvas sprites (walk cycle + attack lunge). PNG/sheets later if needed. */
const bears=[];
let bearTimer=0;

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
  return {
    kind:"bear", x, y, a:rng()*6.283, vx:0, vy:0, r:18,
    hp:110, maxHp:110, state:"wander", tx:x, ty:y,
    repick:rand(1.2,3.5), speed:rand(64,92), run:rand(118,152),
    attackCd:rand(0.2,0.7), attackT:0, walkPhase:rng()*6.28,
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
    b.walkPhase+=spd*dt*0.11;
  }
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
function drawBear(b){
  const phase=b.walkPhase;
  const bob=Math.sin(phase)*1.6;
  const lunge=b.attackT>0?1+0.22*(b.attackT/0.32):1;
  ctx.fillStyle="rgba(0,0,0,.22)";
  ctx.beginPath(); ctx.ellipse(b.x+2,b.y+4,b.r*0.92,b.r*0.48,0,0,7); ctx.fill();
  ctx.save();
  ctx.translate(b.x,b.y+bob);
  ctx.rotate(b.a);
  ctx.scale(lunge,lunge);
  const fur="#5a4030", furL="#7a5848", furD="#3a2818", snout="#4a3428";
  // haunches
  ctx.fillStyle=furD;
  ctx.beginPath(); ctx.ellipse(-7,2,9,7,0,0,7); ctx.fill();
  // torso
  ctx.fillStyle=fur;
  ctx.beginPath(); ctx.ellipse(0,0,14,10,0,0,7); ctx.fill();
  ctx.fillStyle=furL;
  ctx.beginPath(); ctx.ellipse(-2,-3,8,5,0,0,7); ctx.fill();
  // legs (4-phase walk)
  const lg=Math.sin(phase)*5, rg=Math.sin(phase+Math.PI)*5;
  ctx.fillStyle=furD;
  for(const [lx,ly,off] of [[-9,7,lg],[9,7,rg],[-5,8,-rg*0.6],[5,8,-lg*0.6]]){
    ctx.fillRect(lx+off*0.15-2,ly,4,5+Math.abs(off)*0.08);
  }
  // head + snout
  ctx.fillStyle=fur;
  ctx.beginPath(); ctx.ellipse(12,-1,7,6.5,0,0,7); ctx.fill();
  ctx.fillStyle=snout;
  ctx.beginPath(); ctx.ellipse(17,1,4.5,3.2,0,0,7); ctx.fill();
  ctx.fillStyle="#1a1410";
  ctx.beginPath(); ctx.arc(18.5,0.6,1.1,0,7); ctx.fill();
  // ears
  ctx.fillStyle=furD;
  ctx.beginPath(); ctx.ellipse(10,-6,2.4,2,0,0,7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14,-6,2.4,2,0,0,7); ctx.fill();
  if(b.state==="chase"||b.state==="attack"){
    ctx.fillStyle="rgba(200,40,30,.75)";
    ctx.beginPath(); ctx.arc(13,-2,1.2,0,7); ctx.fill();
  }
  if(b.attackT>0.18){
    ctx.strokeStyle="#dcc8b0";
    ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(16,2.5); ctx.lineTo(19,4.5); ctx.lineTo(16,5.5); ctx.stroke();
  }
  ctx.restore();
  if(b.hp<b.maxHp){
    const f=clamp(b.hp/b.maxHp,0,1);
    ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(b.x-14,b.y-b.r-8,28,3);
    ctx.fillStyle=f>0.45?"#c04030":"#802018"; ctx.fillRect(b.x-14,b.y-b.r-8,28*f,3);
  }
}
function drawWildlife(ox,oy){
  for(const b of bears){
    if(b.x<ox-50||b.x>ox+VW+50||b.y<oy-50||b.y>oy+VH+50) continue;
    drawBear(b);
  }
}
