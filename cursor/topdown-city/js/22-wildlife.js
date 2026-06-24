/* TOPDOWN CITY — 22-wildlife.js */
/* Forest wildlife — bears, deer, wolves, boars + forest birds. Wildlife kills ≠ wanted. */
const bears=[], bearFamilies=[];
const deer=[], deerHerds=[];
const wolves=[], wolfPacks=[];
const boars=[];
const forestBirds=[];
let bearTimer=0, deerTimer=0, wolfTimer=0, boarTimer=0, forestBirdTimer=0;
let nextFamilyId=1, nextHerdId=1, nextPackId=1;

const BEAR_VARIANTS=["brown","dark","cinnamon","grizzly"];
const DEER_VARIANTS=["buck_light","doe_light","buck_dark","doe_dark"];
const WOLF_VARIANTS=["gray","dark","timber"];
const BOAR_VARIANTS=["brown","dark","spotted"];

const BEAR_ASSET_V=11, WILD_ASSET_V=1;
const BEAR_SPRITE={ready:false,meta:null,img:{}};
const WILD_SPRITE={ready:false,meta:null,img:{}};

const MAX_BEAR_FAMILIES=2, MAX_DEER_HERDS=3, MAX_WOLF_PACKS=2, MAX_BOAR_GROUPS=3;
const HOME_R=380;

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

(function loadWildSprites(){
  fetch("assets/wildlife/meta.json?v="+WILD_ASSET_V).then(r=>r.json()).then(meta=>{
    WILD_SPRITE.meta=meta;
    const sp=meta.species||{}; const jobs=[];
    for(const kind of Object.keys(sp)){
      for(const v of Object.keys(sp[kind].variants||{})){
        jobs.push([kind,v,sp[kind].variants[v].file]);
      }
    }
    let left=jobs.length||0;
    if(!left){ WILD_SPRITE.ready=true; return; }
    for(const [kind,v,file] of jobs){
      const im=new Image();
      im.onload=im.onerror=()=>{ if(--left<=0) WILD_SPRITE.ready=true; };
      im.src="assets/wildlife/"+file+"?v="+WILD_ASSET_V;
      if(!WILD_SPRITE.img[kind]) WILD_SPRITE.img[kind]={};
      WILD_SPRITE.img[kind][v]=im;
    }
  }).catch(()=>{ WILD_SPRITE.ready=true; });
})();

function inForestAt(x,y){
  const k=cellAt(x,y);
  return biomeOf(k[0],k[1])==="forest" && !isMountain(k[0],k[1]);
}
function allForestMammals(){ return bears.concat(deer,wolves,boars); }
function playerPos(){
  if(mode==="car" && !car.dead) return {x:car.x,y:car.y,r:car.R};
  if(mode==="foot") return {x:ped.x,y:ped.y,r:ped.r};
  return null;
}
function pushWildFromBuildings(m){
  const ci=Math.floor((m.x-ROAD)/GAP), cj=Math.floor((m.y-ROAD)/GAP);
  for(let a=ci-1;a<=ci+1;a++) for(let c=cj-1;c<=cj+1;c++){
    const L=getLot(a,c);
    for(const bd of L.buildings){
      const qx=clamp(m.x,bd.x,bd.x+bd.w), qy=clamp(m.y,bd.y,bd.y+bd.h);
      const ex=m.x-qx, ey=m.y-qy, dd=Math.hypot(ex,ey);
      if(dd<m.r && dd>0.001){ m.x+=ex/dd*(m.r-dd); m.y+=ey/dd*(m.r-dd); }
    }
  }
}
function wildWanderTarget(m,hx,hy,hr){
  hr=hr||HOME_R*0.85;
  for(let t=0;t<16;t++){
    const ang=rng()*6.283, d=rand(80,hr);
    const tx=hx+Math.cos(ang)*d, ty=hy+Math.sin(ang)*d;
    if(inForestAt(tx,ty) && !inWater(tx,ty) && !inBuilding(tx,ty,18)){ m.tx=tx; m.ty=ty; return; }
  }
  m.tx=m.x+rand(-120,120); m.ty=m.y+rand(-120,120);
}
function wildMove(m,dt,destX,destY,spd){
  const dx=destX-m.x, dy=destY-m.y, d=Math.hypot(dx,dy)||1;
  if(d>8){
    m.a=Math.atan2(dy,dx);
    const mv=Math.min(1,d/90);
    m.x+=dx/d*spd*mv*dt;
    m.y+=dy/d*spd*mv*dt;
    m.moving=true;
    m.walkT=(m.walkT||0)+dt*(0.55+spd/180);
  } else m.moving=false;
  pushWildFromBuildings(m);
  collideTrees(m);
  if(inWater(m.x,m.y)){
    const px=m.x-Math.cos(m.a)*spd*dt, py=m.y-Math.sin(m.a)*spd*dt;
    if(!inWater(px,m.y)) m.x=px; else if(!inWater(m.x,py)) m.y=py;
    else wildWanderTarget(m,m.homeX,m.homeY);
  }
}
function wildTargetPos(m){
  if(m.targetKind==="player"){
    const pp=playerPos();
    return pp?{x:pp.x,y:pp.y,r:pp.r}:null;
  }
  if(m.targetKind==="ped" && m.target && m.target.state!=="down") return {x:m.target.x,y:m.target.y,r:m.target.r};
  return null;
}
function wildTryAttack(m,dt,dmgFoot,dmgCar){
  m.attackCd-=dt;
  m.attackT=Math.max(0,m.attackT-dt);
  const tp=wildTargetPos(m);
  if(!tp) return;
  const dx=tp.x-m.x, dy=tp.y-m.y, d=Math.hypot(dx,dy)||1;
  if(d>m.r+tp.r+14 || m.attackCd>0) return;
  m.attackCd=m.attackCdBase||0.82;
  m.attackT=0.32;
  if(m.targetKind==="player"){
    if(mode==="foot") damage(rand(dmgFoot[0],dmgFoot[1]));
    else if(mode==="car" && !car.dead) damageCar(car, rand(dmgCar[0],dmgCar[1]), m.x, m.y, "impact");
  } else if(m.targetKind==="ped" && m.target){
    pedHit(m.target, rand(28,44), dx/d*130, dy/d*130, 0.85, true);
  }
}
function killWildMammal(m,arr){
  const i=arr.indexOf(m);
  if(i>=0) arr.splice(i,1);
  spawnBlood(m.x,m.y,0,0,1.0);
}
function wildMammalHit(m,dmg,kx,ky){
  if(m.hp<=0) return;
  m.hp-=dmg;
  if(m.onHurt) m.onHurt(m);
  if(m.hp>0){
    spawnBlood(m.x,m.y,kx,ky,0.35);
    m.state="chase";
    m.targetKind="player";
    m.target=null;
    m.provokedT=Math.max(m.provokedT||0,18);
    return;
  }
  if(m.onHurt) m.onHurt(m,true);
  killWildMammal(m, m.kind==="deer"?deer:m.kind==="wolf"?wolves:boars);
}
function forestMammalHit(m,dmg,kx,ky,bloodAmt){
  if(m.kind==="bear") bearHit(m,dmg,kx,ky,bloodAmt);
  else wildMammalHit(m,dmg,kx,ky);
}

/* ── bears (unchanged logic, shared helpers) ── */
function getFamily(id){ return bearFamilies.find(f=>f.id===id); }
function pushBearFromBuildings(b){ pushWildFromBuildings(b); }
function bearWanderTarget(b,fam){ wildWanderTarget(b,fam?fam.hx:b.homeX,fam?fam.hy:b.homeY); }
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
    attackCd:rand(0.3,0.9), attackCdBase:0.82, attackT:0, walkT:rng()*0.5, moving:false,
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
      if(!inForestAt(x,y)) continue;
      spawned.push(makeBear(x,y,fam,{cub:i>=adults}));
    }
    if(spawned.length>=2) return spawned;
    bearFamilies.splice(bearFamilies.indexOf(fam),1);
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
    if(Math.hypot(o.x-b.x,o.y-b.y)>320) continue;
    o.provokedT=Math.max(o.provokedT,reason==="hurt"?16:10);
    if(o.state==="flee") o.state="wander";
  }
}
function bearHit(b,dmg,kx,ky,bloodAmt){
  if(b.hp<=0) return;
  b.hp-=dmg;
  rallyFamily(b,"hurt");
  if(b.hp>0){
    spawnBlood(b.x,b.y,kx,ky,0.35);
    b.state="chase"; b.targetKind="player"; b.target=null;
    b.provokedT=Math.max(b.provokedT,22);
    return;
  }
  rallyFamily(b,"hurt");
  killBear(b);
}
function killBear(b){ killWildMammal(b,bears); }
function updateBear(b,dt){
  const fam=getFamily(b.familyId);
  if(fam){
    fam.hunger=Math.min(1,fam.hunger+dt*0.000018);
    if(fam.anger>0) fam.anger=Math.max(0,fam.anger-dt*0.025);
  }
  if(b.provokedT>0) b.provokedT=Math.max(0,b.provokedT-dt);
  if(b.fleeT>0) b.fleeT=Math.max(0,b.fleeT-dt);
  if(!inForestAt(b.x,b.y) && (b.state==="wander"||b.state==="flee")){ bearWanderTarget(b,fam); b.repick=0.5; }

  const pp=playerPos();
  let destX=b.tx, destY=b.ty, spd=b.speed;
  if(pp){
    const d=Math.hypot(pp.x-b.x,pp.y-b.y);
    const hungry=fam&&fam.hunger>0.82, angry=fam&&fam.anger>0.55;
    if(b.provokedT>0||angry||(hungry&&d<130)||(fam&&fam.hunger>0.65&&d<95)){
      b.state="chase"; b.targetKind="player"; b.fleeT=0;
      if(b.roarCd<=0&&d<110){ b.roarCd=3.5; playBoom(0.08); }
    } else if(!b.provokedT&&!angry&&(!hungry||d>175)&&d<175&&(!fam||fam.hunger<0.75)){
      b.state="flee"; b.targetKind=null;
      destX=b.x+(b.x-pp.x)/d*220; destY=b.y+(b.y-pp.y)/d*220; spd=b.run*1.05;
    } else if(b.state==="chase"||b.state==="attack"){ b.state="wander"; b.targetKind=null; b.repick=rand(0.6,1.6); }
  } else if(b.state==="chase"||b.state==="attack"){ b.state="wander"; b.targetKind=null; b.repick=0.8; }

  if(b.state==="chase"||b.state==="attack"){
    const tp=wildTargetPos(b);
    if(!tp){ b.state="wander"; b.repick=0.6; }
    else{
      destX=tp.x; destY=tp.y; spd=b.run;
      b.state=Math.hypot(destX-b.x,destY-b.y)<b.r+tp.r+16?"attack":"chase";
    }
  } else if(b.state!=="flee"){
    b.repick-=dt;
    if(b.repick<=0){ bearWanderTarget(b,fam); b.repick=rand(2.5,6); }
    if(fam){
      let cx=0,cy=0,n=0;
      for(const o of bears) if(o.familyId===fam.id){ cx+=o.x; cy+=o.y; n++; }
      if(n>1){ cx/=n; cy/=n; b.tx+=(cx-b.tx)*0.012; b.ty+=(cy-b.ty)*0.012; }
      if(Math.hypot(b.x-fam.hx,b.y-fam.hy)>HOME_R){ b.tx=fam.hx+rand(-80,80); b.ty=fam.hy+rand(-80,80); b.repick=1.5; }
    }
  }
  wildMove(b,dt,destX,destY,spd);
  b.roarCd-=dt;
  if(b.state==="attack"||b.state==="chase") wildTryAttack(b,dt,[14,24],[14,22]);
  if(mode==="car"&&!car.dead){
    const cd=Math.hypot(car.x-b.x,car.y-b.y);
    if(cd<car.R+b.r && Math.hypot(car.vx,car.vy)>38) bearHit(b,Math.hypot(car.vx,car.vy)*0.38,(b.x-car.x)/cd*110,(b.y-car.y)/cd*110,0.75);
  }
}

/* ── deer — shy herds, flee fast ── */
function getHerd(id){ return deerHerds.find(h=>h.id===id); }
function makeDeer(x,y,herd,opts){
  const buck=opts&&opts.buck;
  const scale=buck?rand(0.95,1.12):rand(0.82,0.98);
  const variants=buck?["buck_light","buck_dark"]:["doe_light","doe_dark"];
  return {
    kind:"deer", variant:variants[(rng()*variants.length)|0], scale,
    x,y,a:rng()*6.283,r:16*scale,
    hp:buck?42:34,maxHp:buck?42:34,
    state:"graze", tx:x,ty:y, herdId:herd.id, homeX:herd.hx, homeY:herd.hy, buck:!!buck,
    repick:rand(2,5), speed:rand(36,52)*scale, run:rand(118,152)*scale,
    attackCd:9, attackCdBase:9, attackT:0, walkT:rng()*0.5, moving:false,
    target:null,targetKind:null, provokedT:0, fleeT:0, alertT:0,
  };
}
function spawnDeerHerd(){
  for(let t=0;t<20;t++){
    const ang=rng()*6.283, dist=rand(220,880);
    const hx=focusX+Math.cos(ang)*dist, hy=focusY+Math.sin(ang)*dist;
    if(!inForestAt(hx,hy)||inWater(hx,hy)||inBuilding(hx,hy,20)) continue;
    let ok=true;
    for(const h of deerHerds) if(Math.hypot(h.hx-hx,h.hy-hy)<480) ok=false;
    for(const f of bearFamilies) if(Math.hypot(f.hx-hx,f.hy-hy)<380) ok=false;
    if(!ok) continue;
    const herd={id:nextHerdId++, hx,hy, spooked:0};
    deerHerds.push(herd);
    const n=4+(rng()*3|0), bucks=rng()<0.45?1:0;
    const spawned=[];
    for(let i=0;i<n;i++){
      const a=ang+i*0.55, d=rand(22,70);
      const x=hx+Math.cos(a)*d, y=hy+Math.sin(a)*d;
      if(!inForestAt(x,y)) continue;
      spawned.push(makeDeer(x,y,herd,{buck:spawned.length<bucks}));
    }
    if(spawned.length>=3) return spawned;
    deerHerds.splice(deerHerds.indexOf(herd),1);
  }
  return null;
}
function spookDeerHerd(herdId,fromX,fromY,str){
  const herd=getHerd(herdId);
  if(!herd) return;
  herd.spooked=Math.max(herd.spooked,str||0.8);
  for(const d of deer){
    if(d.herdId!==herdId) continue;
    d.state="flee"; d.fleeT=Math.max(d.fleeT,2.5); d.alertT=Math.max(d.alertT,4);
    const dx=d.x-fromX, dy=d.y-fromY, dd=Math.hypot(dx,dy)||1;
    d.tx=d.x+dx/dd*280; d.ty=d.y+dy/dd*280;
  }
}
function updateDeer(d,dt){
  const herd=getHerd(d.herdId);
  if(herd&&herd.spooked>0) herd.spooked=Math.max(0,herd.spooked-dt*0.35);
  if(d.provokedT>0) d.provokedT=Math.max(0,d.provokedT-dt);
  if(d.fleeT>0) d.fleeT=Math.max(0,d.fleeT-dt);
  if(d.alertT>0) d.alertT=Math.max(0,d.alertT-dt);

  const pp=playerPos();
  let destX=d.tx, destY=d.ty, spd=d.speed;
  if(pp){
    const dist=Math.hypot(pp.x-d.x,pp.y-d.y);
    const carNear=mode==="car"&&!car.dead&&Math.hypot(car.vx,car.vy)>55;
    if(dist<210||(carNear&&dist<260)){
      spookDeerHerd(d.herdId,pp.x,pp.y,carNear?1:0.65);
    }
    if(d.state==="flee"||d.fleeT>0||d.alertT>0){
      d.state="flee";
      destX=d.x+(d.x-pp.x)/(dist||1)*320;
      destY=d.y+(d.y-pp.y)/(dist||1)*320;
      spd=d.run;
    } else if(dist<55&&d.buck){
      d.state="stand"; destX=d.x; destY=d.y; spd=0;
    } else if(d.state==="chase"){ d.state="graze"; d.targetKind=null; }
  } else if(d.state==="flee"&&d.fleeT<=0) d.state="graze";

  if(d.state==="graze"||d.state==="wander"){
    d.repick-=dt;
    if(d.repick<=0){ wildWanderTarget(d,d.homeX,d.homeY,HOME_R*0.9); d.repick=rand(3,7); }
    if(herd){
      let cx=0,cy=0,n=0;
      for(const o of deer) if(o.herdId===herd.id){ cx+=o.x; cy+=o.y; n++; }
      if(n>1){ cx/=n; cy/=n; d.tx+=(cx-d.tx)*0.018; d.ty+=(cy-d.ty)*0.018; }
    }
    if(Math.random()<dt*0.08){ d.state="graze"; d.moving=false; }
  }
  wildMove(d,dt,destX,destY,spd);
  if(mode==="car"&&!car.dead){
    const cd=Math.hypot(car.x-d.x,car.y-d.y);
    if(cd<car.R+d.r&&Math.hypot(car.vx,car.vy)>42) wildMammalHit(d,Math.hypot(car.vx,car.vy)*0.32,(d.x-car.x)/cd*90,(d.y-car.y)/cd*90);
  }
}

/* ── wolves — pack stalk / hunt ── */
function getPack(id){ return wolfPacks.find(p=>p.id===id); }
function makeWolf(x,y,pack,opts){
  const alpha=opts&&opts.alpha;
  const scale=alpha?rand(1.02,1.18):rand(0.88,1.02);
  return {
    kind:"wolf", variant:WOLF_VARIANTS[(rng()*WOLF_VARIANTS.length)|0], scale,
    x,y,a:rng()*6.283,r:17*scale,
    hp:alpha?72:58,maxHp:alpha?72:58,
    state:"patrol", tx:x,ty:y, packId:pack.id, homeX:pack.hx, homeY:pack.hy, alpha:!!alpha,
    repick:rand(1.5,4), speed:rand(58,76)*scale, run:rand(102,138)*scale,
    attackCd:rand(0.2,0.7), attackCdBase:0.72, attackT:0, walkT:rng()*0.5, moving:false,
    target:null,targetKind:null, provokedT:0, stalkT:0,
    onHurt(w,killed){
      const pk=getPack(w.packId);
      if(pk) pk.aggro=Math.min(1,(pk.aggro||0)+0.45);
      for(const o of wolves){
        if(o.packId!==w.packId||Math.hypot(o.x-w.x,o.y-w.y)>360) continue;
        o.provokedT=Math.max(o.provokedT,killed?22:14);
        o.state="chase"; o.targetKind="player";
      }
    },
  };
}
function spawnWolfPack(){
  for(let t=0;t<20;t++){
    const ang=rng()*6.283, dist=rand(320,980);
    const hx=focusX+Math.cos(ang)*dist, hy=focusY+Math.sin(ang)*dist;
    if(!inForestAt(hx,hy)||inWater(hx,hy)||inBuilding(hx,hy,22)) continue;
    let ok=true;
    for(const p of wolfPacks) if(Math.hypot(p.hx-hx,p.hy-hy)<540) ok=false;
    if(!ok) continue;
    const pack={id:nextPackId++, hx,hy, hunger:rand(0.15,0.45), aggro:0};
    wolfPacks.push(pack);
    const n=2+(rng()*2|0);
    const spawned=[makeWolf(hx,hy,pack,{alpha:true})];
    for(let i=1;i<n;i++){
      const a=ang+i*0.9, d=rand(24,62);
      const x=hx+Math.cos(a)*d, y=hy+Math.sin(a)*d;
      if(!inForestAt(x,y)) continue;
      spawned.push(makeWolf(x,y,pack,{alpha:false}));
    }
    if(spawned.length>=2) return spawned;
    wolfPacks.splice(wolfPacks.indexOf(pack),1);
  }
  return null;
}
function updateWolf(w,dt){
  const pack=getPack(w.packId);
  if(pack){
    pack.hunger=Math.min(1,pack.hunger+dt*0.000022);
    if(pack.aggro>0) pack.aggro=Math.max(0,pack.aggro-dt*0.02);
  }
  if(w.provokedT>0) w.provokedT=Math.max(0,w.provokedT-dt);
  if(w.stalkT>0) w.stalkT=Math.max(0,w.stalkT-dt);

  const pp=playerPos();
  let destX=w.tx, destY=w.ty, spd=w.speed;
  const night=typeof gameHour!=="undefined"&&(gameHour<6||gameHour>20);
  const hunt=(pack&&pack.aggro>0.35)||w.provokedT>0||(pack&&pack.hunger>0.72)||(night&&pack&&pack.hunger>0.5);

  if(pp){
    const d=Math.hypot(pp.x-w.x,pp.y-w.y);
    if(hunt&&d<155){
      w.state="chase"; w.targetKind="player"; w.stalkT=0;
    } else if(hunt&&d<240){
      w.state="stalk";
      const flank=Math.atan2(pp.y-w.y,pp.x-w.x)+Math.PI*0.55*(w.alpha?1:-1);
      destX=pp.x+Math.cos(flank)*120; destY=pp.y+Math.sin(flank)*120;
      spd=w.run*0.72; w.stalkT=Math.max(w.stalkT,1.5);
    } else if(!hunt&&d<130&&!w.provokedT){
      w.state="avoid";
      destX=w.x+(w.x-pp.x)/d*180; destY=w.y+(w.y-pp.y)/d*180;
      spd=w.run*0.85;
    } else if(w.state==="chase"&&!hunt){ w.state="patrol"; w.targetKind=null; w.repick=0.8; }
  } else if(w.state==="chase"){ w.state="patrol"; w.targetKind=null; }

  if(w.state==="chase"||w.state==="attack"){
    const tp=wildTargetPos(w);
    if(!tp){ w.state="patrol"; w.repick=0.6; }
    else{
      destX=tp.x; destY=tp.y; spd=w.run;
      w.state=Math.hypot(destX-w.x,destY-w.y)<w.r+tp.r+14?"attack":"chase";
    }
  } else if(w.state!=="avoid"){
    w.repick-=dt;
    if(w.repick<=0){ wildWanderTarget(w,w.homeX,w.homeY); w.repick=rand(2,5); }
    if(pack){
      let cx=0,cy=0,n=0;
      for(const o of wolves) if(o.packId===pack.id){ cx+=o.x; cy+=o.y; n++; }
      if(n>1){ cx/=n; cy/=n; w.tx+=(cx-w.tx)*0.015; w.ty+=(cy-w.ty)*0.015; }
      if(Math.hypot(w.x-pack.hx,w.y-pack.hy)>HOME_R*0.95){
        w.tx=pack.hx+rand(-90,90); w.ty=pack.hy+rand(-90,90); w.repick=1.2;
      }
    }
  }
  wildMove(w,dt,destX,destY,spd);
  if(w.state==="attack"||w.state==="chase") wildTryAttack(w,dt,[10,18],[10,16]);
  if(mode==="car"&&!car.dead){
    const cd=Math.hypot(car.x-w.x,car.y-w.y);
    if(cd<car.R+w.r&&Math.hypot(car.vx,car.vy)>40) wildMammalHit(w,Math.hypot(car.vx,car.vy)*0.34,(w.x-car.x)/cd*100,(w.y-car.y)/cd*100);
  }
}

/* ── boars — charge when cornered ── */
function makeBoar(x,y,homeX,homeY){
  const scale=rand(0.92,1.08);
  return {
    kind:"boar", variant:BOAR_VARIANTS[(rng()*BOAR_VARIANTS.length)|0], scale,
    x,y,a:rng()*6.283,r:18*scale,
    hp:68,maxHp:68,
    state:"root", tx:x,ty:y, homeX, homeY,
    repick:rand(2,5), speed:rand(44,58)*scale, run:rand(108,132)*scale, charge:rand(118,148)*scale,
    attackCd:rand(0.15,0.55), attackCdBase:0.68, attackT:0, walkT:rng()*0.5, moving:false,
    target:null,targetKind:null, provokedT:0, chargeT:0,
    onHurt(b,killed){
      b.provokedT=Math.max(b.provokedT,killed?20:16);
      b.state="charge"; b.targetKind="player";
      for(const o of boars){
        if(o===b||Math.hypot(o.x-b.x,o.y-b.y)>280) continue;
        o.provokedT=Math.max(o.provokedT,12);
        o.state="charge"; o.targetKind="player";
      }
    },
  };
}
function spawnBoarGroup(){
  for(let t=0;t<18;t++){
    const ang=rng()*6.283, dist=rand(200,760);
    const hx=focusX+Math.cos(ang)*dist, hy=focusY+Math.sin(ang)*dist;
    if(!inForestAt(hx,hy)||inWater(hx,hy)||inBuilding(hx,hy,18)) continue;
    let ok=true;
    for(const b of boars) if(Math.hypot(b.homeX-hx,b.homeY-hy)<320) ok=false;
    if(!ok) continue;
    const n=rng()<0.55?1:2;
    const spawned=[];
    for(let i=0;i<n;i++){
      const a=ang+i*0.8, d=rand(12,42);
      const x=hx+Math.cos(a)*d, y=hy+Math.sin(a)*d;
      if(!inForestAt(x,y)) continue;
      spawned.push(makeBoar(x,y,hx,hy));
    }
    if(spawned.length) return spawned;
  }
  return null;
}
function updateBoar(b,dt){
  if(b.provokedT>0) b.provokedT=Math.max(0,b.provokedT-dt);
  if(b.chargeT>0) b.chargeT=Math.max(0,b.chargeT-dt);

  const pp=playerPos();
  let destX=b.tx, destY=b.ty, spd=b.speed;
  if(pp){
    const d=Math.hypot(pp.x-b.x,pp.y-b.y);
    if(b.provokedT>0||d<105){
      b.state="charge"; b.targetKind="player"; b.chargeT=Math.max(b.chargeT,1.4);
    } else if(d<170&&Math.hypot(car.vx||0,car.vy||0)>50&&mode==="car"){
      b.state="charge"; b.targetKind="player";
    } else if(b.state==="charge"&&d>240){ b.state="root"; b.targetKind=null; b.repick=0.8; }
  } else if(b.state==="charge"){ b.state="root"; b.targetKind=null; }

  if(b.state==="charge"||b.state==="attack"){
    const tp=wildTargetPos(b);
    if(!tp){ b.state="root"; b.repick=0.5; }
    else{
      destX=tp.x; destY=tp.y;
      spd=b.chargeT>0?b.charge:b.run;
      const dd=Math.hypot(destX-b.x,destY-b.y);
      b.state=dd<b.r+tp.r+12?"attack":"charge";
    }
  } else {
    b.repick-=dt;
    if(b.repick<=0){ wildWanderTarget(b,b.homeX,b.homeY,HOME_R*0.65); b.repick=rand(3,7); }
    if(b.hp/b.maxHp<0.28&&pp){
      const d=Math.hypot(pp.x-b.x,pp.y-b.y);
      if(d<160){ destX=b.x+(b.x-pp.x)/d*140; destY=b.y+(b.y-pp.y)/d*140; spd=b.run; b.state="flee"; }
    }
    if(Math.random()<dt*0.06) b.moving=false;
  }
  wildMove(b,dt,destX,destY,spd);
  if(b.state==="attack"||b.state==="charge") wildTryAttack(b,dt,[16,26],[18,28]);
  if(mode==="car"&&!car.dead){
    const cd=Math.hypot(car.x-b.x,car.y-b.y);
    if(cd<car.R+b.r&&Math.hypot(car.vx,car.vy)>36) wildMammalHit(b,Math.hypot(car.vx,car.vy)*0.36,(b.x-car.x)/cd*105,(b.y-car.y)/cd*105);
  }
}

/* ── forest birds ── */
const FOREST_BIRD_DEF={
  crow:    {col:"#222228",wing:7, v:48, z:16, flap:6.5, behavior:"fly"},
  jay:     {col:"#3a68c0",hi:"#88b0f0",wing:6, v:72, z:14, flap:8.5, behavior:"dart"},
  hawk:    {col:"#6a5040",hi:"#d8d0c8",wing:11, v:58, z:42, flap:4.2, behavior:"soar"},
  sparrow: {col:"#8a7860",hi:"#c8b8a0",wing:4, v:0, z:0, flap:11, behavior:"ground"},
  woodpecker:{col:"#8a2828",hi:"#e04030",wing:5, v:38, z:10, flap:9, behavior:"tree"},
  owl:     {col:"#6a5848",hi:"#b8a890",wing:10, v:34, z:26, flap:3.8, behavior:"glide", nightOnly:true},
};
function spawnForestBird(){
  const ang=rng()*6.283, dist=Math.max(VW,VH)*0.45+rng()*160;
  const x=focusX+Math.cos(ang)*dist, y=focusY+Math.sin(ang)*dist;
  if(!inForestAt(x,y)) return null;
  const night=typeof gameHour!=="undefined"&&(gameHour<6.2||gameHour>19.5);
  const pool=Object.keys(FOREST_BIRD_DEF).filter(k=>!FOREST_BIRD_DEF[k].nightOnly||night);
  const type=pick(pool);
  const def=FOREST_BIRD_DEF[type];
  const b={
    type, x,y, z:def.z*(0.85+rng()*0.3), a:rng()*6.283,
    v:def.v*(0.85+rng()*0.3), state:def.behavior==="ground"?"ground":"fly",
    flap:rng()*6.28, flapSpd:def.flap, wander:rand(0.5,1.4), peckT:rand(0.6,2),
    col:def.col, hi:def.hi, wing:def.wing, behavior:def.behavior,
  };
  if(def.behavior==="soar"){ b.orbit=focusX+rand(-180,180); b.orbitY=focusY+rand(-180,180); b.orbitR=rand(120,280); }
  return b;
}
function updateForestBirds(dt){
  const forest=inForestAt(focusX,focusY);
  for(let i=forestBirds.length-1;i>=0;i--){
    const b=forestBirds[i], def=FOREST_BIRD_DEF[b.type];
    b.flap+=b.flapSpd*dt;
    if(b.behavior==="ground"){
      if(b.state==="ground"){
        b.peckT-=dt; b.x+=Math.cos(b.a)*5*dt; b.y+=Math.sin(b.a)*5*dt;
        if(b.peckT<=0){ b.a+=(rng()-0.5)*1.4; b.peckT=rand(0.7,2.2); }
        const pp=playerPos();
        if(pp&&Math.hypot(pp.x-b.x,pp.y-b.y)<90){ b.state="fly"; b.v=rand(65,95); b.a=Math.atan2(b.y-pp.y,b.x-pp.x); }
      } else {
        b.z=Math.min(36,b.z+30*dt); b.x+=Math.cos(b.a)*b.v*dt; b.y+=Math.sin(b.a)*b.v*dt;
        if(b.z>28&&rng()<dt*0.08) b.state="ground";
      }
    } else if(b.behavior==="soar"){
      b.orbitA=(b.orbitA||0)+dt*0.45;
      b.x=b.orbit+(Math.cos(b.orbitA)*b.orbitR); b.y=b.orbitY+(Math.sin(b.orbitA)*b.orbitR*0.55);
      b.a=b.orbitA+Math.PI/2;
    } else if(b.behavior==="tree"){
      b.peckT-=dt;
      if(b.peckT<=0){ b.a+=(rng()-0.5)*0.8; b.peckT=rand(0.4,1.2); b.v=rand(32,52); }
      b.x+=Math.cos(b.a)*b.v*dt*0.35; b.y+=Math.sin(b.a)*b.v*dt*0.35;
    } else if(b.behavior==="glide"){
      b.wander-=dt;
      if(b.wander<=0){ b.a+=(rng()-0.5)*0.5; b.wander=rand(1.2,2.8); }
      b.x+=Math.cos(b.a)*b.v*dt; b.y+=Math.sin(b.a)*b.v*dt;
    } else {
      b.wander-=dt;
      if(b.wander<=0){ b.a+=(rng()-0.5)*0.9; b.wander=rand(0.5,1.3); }
      b.x+=Math.cos(b.a)*b.v*dt; b.y+=Math.sin(b.a)*b.v*dt;
      if(b.behavior==="dart") b.a+=Math.sin(b.flap*0.7)*0.015;
    }
    if(Math.hypot(b.x-focusX,b.y-focusY)>Math.max(VW,VH)*0.85+300) forestBirds.splice(i,1);
  }
  if(!forest) return;
  forestBirdTimer-=dt;
  const target=10+Math.floor((windAmp||0.1)*18);
  if(forestBirds.length<target&&forestBirdTimer<=0){
    forestBirdTimer=rand(0.35,0.9);
    const nb=spawnForestBird(); if(nb) forestBirds.push(nb);
  }
}
function drawForestBird(b){
  const bx=b.x, by=b.y-(b.z||0);
  if(b.z>2){ ctx.fillStyle=`rgba(0,0,0,${(0.14*Math.max(0,1-b.z/50)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(b.x,b.y,4,2,0,0,7); ctx.fill(); }
  ctx.save(); ctx.translate(bx,by); ctx.rotate(b.a);
  if(b.state==="ground"&&b.behavior==="ground"){
    ctx.fillStyle=b.col; ctx.beginPath(); ctx.ellipse(-1,0,3.5,2.2,0,0,7); ctx.fill();
    const bob=Math.sin(b.flap)*0.9; ctx.beginPath(); ctx.arc(3,bob,1.5,0,7); ctx.fill();
  } else {
    const span=b.wing*(0.45+0.55*Math.abs(Math.sin(b.flap)));
    ctx.strokeStyle=b.col; ctx.lineWidth=1.6; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(-2,-span); ctx.quadraticCurveTo(1,-1,2.5,0); ctx.quadraticCurveTo(1,1,-2,span); ctx.stroke();
    ctx.lineCap="butt";
    ctx.fillStyle=b.col; ctx.beginPath(); ctx.ellipse(0.5,0,2,1,0,0,7); ctx.fill();
    if(b.hi){ ctx.fillStyle=b.hi; ctx.beginPath(); ctx.arc(-0.5,-0.8,0.9,0,7); ctx.fill(); }
    if(b.type==="woodpecker"&&Math.sin(b.flap*2)>0.6){
      ctx.fillStyle="#2a1810"; ctx.fillRect(2.5,-0.5,2,1);
    }
  }
  ctx.restore();
}

/* ── draw / anim ── */
function wildDir8(a){ return Math.floor((a+Math.PI/8)/(Math.PI/4)+8)%8; }
function wildAnimFrame(m,meta){
  if(!meta) return 0;
  const fpd=meta.framesPerDirection||5;
  const wf=meta.walkFrames||[0,1,2,3];
  let local=0;
  if(m.attackT>0.08) local=meta.attackFrame??4;
  else if(m.moving) local=wf[Math.floor((m.walkT||0)/(meta.walkStep||0.11))%wf.length];
  return wildDir8(m.a)*fpd+local;
}
function wildDrawScale(m,meta,dir){
  const scBase=m.r*2.55*(m.scale||1)/(meta.frameHeight||128);
  const front=(dir===2)?1.08:(dir===1||dir===3)?1.04:1;
  return scBase*front;
}
function drawWildFallback(m){
  const cols={deer:"#8a6848",wolf:"#6a6a72",boar:"#5a4030",bear:"#5a4030"};
  ctx.fillStyle="rgba(0,0,0,.2)";
  ctx.beginPath(); ctx.ellipse(m.x+2,m.y+3,m.r*0.85,m.r*0.4,0,0,7); ctx.fill();
  ctx.save(); ctx.translate(m.x,m.y); ctx.rotate(m.a);
  ctx.fillStyle=cols[m.kind]||"#5a5030";
  ctx.beginPath(); ctx.ellipse(0,0,m.r*0.75,m.r*0.55,0,0,7); ctx.fill();
  ctx.restore();
}
function drawForestMammal(m){
  let meta, img;
  if(m.kind==="bear"){
    meta=BEAR_SPRITE.meta; img=BEAR_SPRITE.img[m.variant]||BEAR_SPRITE.img.brown;
    if(!BEAR_SPRITE.ready||!meta||!img||!img.complete||!img.naturalWidth){ drawWildFallback(m); return; }
  } else {
    meta=WILD_SPRITE.meta; img=WILD_SPRITE.img[m.kind]&&WILD_SPRITE.img[m.kind][m.variant];
    if(!WILD_SPRITE.ready||!meta||!img||!img.complete||!img.naturalWidth){ drawWildFallback(m); return; }
  }
  const fw=meta.frameWidth||128, fh=meta.frameHeight||128;
  const ax=meta.anchorX??fw/2, ay=meta.anchorY??fh-8;
  const fr=wildAnimFrame(m,meta), dir=wildDir8(m.a), sc=wildDrawScale(m,meta,dir);
  ctx.fillStyle="rgba(0,0,0,.24)";
  ctx.beginPath(); ctx.ellipse(m.x+2,m.y+4,m.r*0.95,m.r*0.46,0,0,7); ctx.fill();
  ctx.save(); ctx.translate(m.x,m.y);
  const sm=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  ctx.drawImage(img,fr*fw,0,fw,fh,-ax*sc,-ay*sc,fw*sc,fh*sc);
  ctx.imageSmoothingEnabled=sm; ctx.restore();
  if(m.hp<m.maxHp){
    const f=clamp(m.hp/m.maxHp,0,1);
    ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(m.x-14,m.y-m.r-10,28,3);
    ctx.fillStyle=f>0.45?"#c04030":"#802018"; ctx.fillRect(m.x-14,m.y-m.r-10,28*f,3);
  }
}
function drawBear(b){ drawForestMammal(b); }

function updateWildlife(dt){
  const forest=inForestAt(focusX,focusY);
  bearTimer-=dt; deerTimer-=dt; wolfTimer-=dt; boarTimer-=dt;
  for(let i=bears.length-1;i>=0;i--){
    updateBear(bears[i],dt);
    if(Math.hypot(bears[i].x-focusX,bears[i].y-focusY)>2400||bears[i].hp<=0) bears.splice(i,1);
  }
  for(let i=deer.length-1;i>=0;i--){
    updateDeer(deer[i],dt);
    if(Math.hypot(deer[i].x-focusX,deer[i].y-focusY)>2200||deer[i].hp<=0) deer.splice(i,1);
  }
  for(let i=wolves.length-1;i>=0;i--){
    updateWolf(wolves[i],dt);
    if(Math.hypot(wolves[i].x-focusX,wolves[i].y-focusY)>2300||wolves[i].hp<=0) wolves.splice(i,1);
  }
  for(let i=boars.length-1;i>=0;i--){
    updateBoar(boars[i],dt);
    if(Math.hypot(boars[i].x-focusX,boars[i].y-focusY)>2100||boars[i].hp<=0) boars.splice(i,1);
  }
  for(let i=bearFamilies.length-1;i>=0;i--) if(!bears.some(b=>b.familyId===bearFamilies[i].id)) bearFamilies.splice(i,1);
  for(let i=deerHerds.length-1;i>=0;i--) if(!deer.some(d=>d.herdId===deerHerds[i].id)) deerHerds.splice(i,1);
  for(let i=wolfPacks.length-1;i>=0;i--) if(!wolves.some(w=>w.packId===wolfPacks[i].id)) wolfPacks.splice(i,1);
  updateForestBirds(dt);
  if(!forest) return;
  if(bearFamilies.length<MAX_BEAR_FAMILIES&&bearTimer<=0){ bearTimer=rand(2.5,5.5); const g=spawnBearFamily(); if(g) bears.push(...g); }
  if(deerHerds.length<MAX_DEER_HERDS&&deerTimer<=0){ deerTimer=rand(1.8,4); const g=spawnDeerHerd(); if(g) deer.push(...g); }
  if(wolfPacks.length<MAX_WOLF_PACKS&&wolfTimer<=0){ wolfTimer=rand(3,6); const g=spawnWolfPack(); if(g) wolves.push(...g); }
  if(boars.length<MAX_BOAR_GROUPS*2&&boarTimer<=0){ boarTimer=rand(2,4.5); const g=spawnBoarGroup(); if(g) boars.push(...g); }
}
function drawWildlife(ox,oy){
  for(const d of deer) if(d.x>=ox-60&&d.x<=ox+VW+60&&d.y>=oy-60&&d.y<=oy+VH+60) drawForestMammal(d);
  for(const b of boars) if(b.x>=ox-60&&b.x<=ox+VW+60&&b.y>=oy-60&&b.y<=oy+VH+60) drawForestMammal(b);
  for(const w of wolves) if(w.x>=ox-60&&w.x<=ox+VW+60&&w.y>=oy-60&&w.y<=oy+VH+60) drawForestMammal(w);
  for(const b of bears) if(b.x>=ox-60&&b.x<=ox+VW+60&&b.y>=oy-60&&b.y<=oy+VH+60) drawForestMammal(b);
  for(const fb of forestBirds) if(fb.x>=ox-40&&fb.x<=ox+VW+40&&fb.y-(fb.z||0)>=oy-40&&fb.y<=oy+VH+40) drawForestBird(fb);
}
