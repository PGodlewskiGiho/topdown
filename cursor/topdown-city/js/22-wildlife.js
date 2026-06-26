/* TOPDOWN CITY — 22-wildlife.js */
/* Forest wildlife — bears, deer, wolves, boars, small critters, tree squirrels + forest birds. Wildlife kills ≠ wanted. */
const bears=[], bearFamilies=[];
const deer=[], deerHerds=[];
const wolves=[], wolfPacks=[];
const boars=[];
const forestCritters=[], treeSquirrels=[], forestFoxes=[], riverOtters=[];
const forestBirds=[];
let bearTimer=0, deerTimer=0, wolfTimer=0, boarTimer=0, forestBirdTimer=0;
let critterTimer=0, squirrelTimer=0, foxTimer=0, otterTimer=0;
let nextFamilyId=1, nextHerdId=1, nextPackId=1;

const BEAR_VARIANTS=["brown","dark","cinnamon","grizzly"];
const DEER_VARIANTS=["buck_light","doe_light","buck_dark","doe_dark"];
const WOLF_VARIANTS=["gray","dark","timber"];
const BOAR_VARIANTS=["brown","dark","spotted"];

const BEAR_SPRITE={ready:false,meta:null,img:{}};
const WILD_SPRITE={ready:false,meta:null,img:{}};
window.BEAR_SPRITE=BEAR_SPRITE;
window.WILD_SPRITE=WILD_SPRITE;

const MAX_BEAR_FAMILIES=2, MAX_DEER_HERDS=3, MAX_WOLF_PACKS=2, MAX_BOAR_GROUPS=3;
const MAX_FOREST_CRITTERS=26, MAX_TREE_SQUIRRELS=18, MAX_FOXES=5, MAX_OTTERS=8;
const HOME_R=380;

const CRITTER_DEF={
  hedgehog:{r:8, speed:20, run:46, flee:95, nightish:true},
  rabbit:  {r:10, speed:34, run:118, flee:130, nightish:false},
  mouse:   {r:5, speed:28, run:92, flee:78, nightish:false},
};

bootSpritePack(BEAR_SPRITE, "assets/bears/meta.json", meta=>
  Object.keys(meta.variants||{}).map(k=>({
    src:"assets/bears/"+meta.variants[k].file,
    apply(pack, im){ pack.img[k]=im; },
  }))
);

bootSpritePack(WILD_SPRITE, "assets/wildlife/meta.json", meta=>{
  const jobs=[], sp=meta.species||{};
  for(const kind of Object.keys(sp)){
    for(const v of Object.keys(sp[kind].variants||{})){
      jobs.push({
        src:"assets/wildlife/"+sp[kind].variants[v].file,
        apply(pack, im){
          if(!pack.img[kind]) pack.img[kind]={};
          pack.img[kind][v]=im;
        },
      });
    }
  }
  return jobs;
});

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

/* ── day rhythm + dens + anti-loop pathing ── */
function wildHour(){ return typeof gameHour!=="undefined"?gameHour:12; }
function wildDayPhase(h){
  h=h??wildHour();
  if(h<5.2||h>=21.8) return "night";
  if(h<7.2) return "dawn";
  if(h<17.5) return "day";
  if(h<20.2) return "dusk";
  return "night";
}
function wildIsNight(h){ return wildDayPhase(h)==="night"; }
function wildDenOf(m){
  if(m.kind==="bear"&&m.familyId){ const f=getFamily(m.familyId); return f?{x:f.hx,y:f.hy,r:f.denR||38,kind:"bear"}:null; }
  if(m.kind==="deer"&&m.herdId){ const h=getHerd(m.herdId); return h?{x:h.hx,y:h.y,r:h.denR||32,kind:"deer"}:null; }
  if(m.kind==="wolf"&&m.packId){ const p=getPack(m.packId); return p?{x:p.hx,y:p.hy,r:p.denR||34,kind:"wolf"}:null; }
  if(m.kind==="boar") return {x:m.homeX,y:m.homeY,r:m.denR||28,kind:"boar"};
  return null;
}
function wildAtDen(m,d){ if(!d) return false; return Math.hypot(m.x-d.x,m.y-d.y)<d.r+10; }
function wildNearDen(m,d,pad){ if(!d) return false; return Math.hypot(m.x-d.x,m.y-d.y)<d.r+(pad||55); }
function wildSetPath(m,x,y){ m.tx=x; m.ty=y; m._trail=[]; m._stuckT=0; }
function wildFleeTarget(m,fromX,fromY,dist){
  dist=dist||rand(200,320);
  for(let t=0;t<22;t++){
    const dx=m.x-fromX, dy=m.y-fromY, d=Math.hypot(dx,dy)||1;
    const ang=Math.atan2(dy,dx)+(rng()-0.5)*1.4;
    const tx=m.x+Math.cos(ang)*dist, ty=m.y+Math.sin(ang)*dist;
    if(inForestAt(tx,ty)&&!inWater(tx,ty)&&!terrainSteepAt(tx,ty,TERRAIN_SLOPE_WALK)&&!inBuilding(tx,ty,18)){ wildSetPath(m,tx,ty); return true; }
  }
  wildWanderTarget(m,m.homeX,m.homeY); return false;
}
function wildGoDen(m,d){
  if(!d) return;
  wildSetPath(m,d.x+rand(-10,10),d.y+rand(-10,10));
  m.state="return";
}
function wildGoalConflict(m,pp){
  if(!pp) return false;
  if(m.state==="flee"&&(m.targetKind==="player"||m.provokedT>0||m.state==="chase")) return true;
  if((m.state==="chase"||m.state==="charge")&&m.fleeT>0) return true;
  const td=Math.hypot(m.tx-m.x,m.ty-m.y);
  if(m.state==="flee"&&td>16){
    const vx=(m.tx-m.x)/td, vy=(m.ty-m.y)/td;
    const px=pp.x-m.x, py=pp.y-m.y, pd=Math.hypot(px,py)||1;
    if(vx*px/pd+vy*py/pd>0.45) return true;
  }
  return false;
}
function wildTrackStuck(m,dt){
  if(!m.moving){ m._stuckT=0; return false; }
  if(!m._trail) m._trail=[];
  if(!m._trail.length||Math.hypot(m.x-m._trail[m._trail.length-1].x,m.y-m._trail[m._trail.length-1].y)>14)
    m._trail.push({x:m.x,y:m.y});
  while(m._trail.length>18) m._trail.shift();
  if(m._trail.length<10) return false;
  const a=m._trail[0], b=m._trail[m._trail.length-1];
  let path=0;
  for(let i=1;i<m._trail.length;i++) path+=Math.hypot(m._trail[i].x-m._trail[i-1].x,m._trail[i].y-m._trail[i-1].y);
  const net=Math.hypot(b.x-a.x,b.y-a.y);
  if(path>70&&net<32){ m._stuckT=(m._stuckT||0)+dt; if(m._stuckT>0.45) return true; }
  else m._stuckT=Math.max(0,(m._stuckT||0)-dt*0.6);
  return false;
}
function wildBreakLoop(m){
  m._stuckT=0; m._trail=[];
  const pp=playerPos();
  if(pp&&(m.state==="flee"||m.fleeT>0||m.state==="avoid")){
    wildFleeTarget(m,pp.x,pp.y,rand(240,360));
    m.fleeT=Math.max(m.fleeT||0,2.2);
    m.targetKind=null;
    if(m.kind==="deer") m.state="flee";
    else if(m.state==="chase"||m.state==="charge") m.state="wander";
  } else if(pp&&m.provokedT>0){
    m.targetKind="player"; m.state=m.kind==="boar"?"charge":"chase";
    m.fleeT=0;
  } else {
    wildWanderTarget(m,m.homeX,m.homeY);
    m.targetKind=null;
    m.state=m.kind==="deer"?"graze":m.kind==="boar"?"root":m.kind==="wolf"?"patrol":"wander";
  }
  m.repick=rand(1.4,3.2);
}
function wildDisturbed(m,pp){
  if(!pp) return false;
  if(m.provokedT>0||m.state==="chase"||m.state==="attack"||m.state==="charge") return true;
  const d=Math.hypot(pp.x-m.x,pp.y-m.y);
  return d<(m.kind==="deer"?155:m.kind==="wolf"?120:100);
}
function wildApplyDayRhythm(m,dt){
  if(wildDisturbed(m,playerPos())) return false;
  const phase=wildDayPhase(), h=wildHour(), den=wildDenOf(m);
  if(!den) return false;

  if(phase==="night"){
    if(!wildAtDen(m,den)){ wildGoDen(m,den); m.activity="sleep"; return false; }
    m.state="sleep"; m.activity="sleep"; m.moving=false; m.tx=m.x; m.ty=m.y;
    m.eatT=rand(2,5);
    return true;
  }
  if(phase==="dawn"&&h<6.4){
    if(wildAtDen(m,den)){ m.state="sleep"; m.activity="sleep"; m.moving=false; return true; }
    wildGoDen(m,den); m.activity="sleep"; return false;
  }
  if(phase==="dusk"&&h>19.2){
    if(!wildAtDen(m,den)){ wildGoDen(m,den); m.activity="return"; return false; }
    if(rng()<dt*0.04){ m.state="sleep"; m.activity="sleep"; m.moving=false; return true; }
  }
  if(m.state==="sleep"){
    if(phase==="day"||phase==="dusk"){
      m.state=m.kind==="deer"?"graze":m.kind==="boar"?"root":m.kind==="wolf"?"patrol":"wander";
      m.activity="eat";
      wildWanderTarget(m,den.x,den.y,HOME_R*0.45);
      m.repick=rand(2,4);
    } else return true;
  }
  if(phase==="day"&&m.activity!=="eat"&&!m.provokedT){
    m.activity="eat";
    m.eatT=(m.eatT||0)-dt;
    if(m.eatT<=0){
      if(wildNearDen(m,den,90)||rng()<0.35){
        m.state=m.kind==="deer"?"graze":m.kind==="boar"?"root":"wander";
        m.moving=false;
        m.eatT=rand(2.5,6);
        if(rng()<0.45) wildWanderTarget(m,den.x,den.y,HOME_R*0.55);
        return true;
      }
      wildWanderTarget(m,den.x,den.y,HOME_R*0.65);
      m.repick=rand(3,6);
      m.eatT=rand(4,9);
    }
  }
  if(m.activity==="eat"&&m.eatT>0) m.eatT-=dt;
  return false;
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
    if(inForestAt(tx,ty) && !inWater(tx,ty) && !terrainSteepAt(tx,ty, TERRAIN_SLOPE_WALK) && !inBuilding(tx,ty,18)){ m.tx=tx; m.ty=ty; return; }
  }
  m.tx=m.x+rand(-120,120); m.ty=m.y+rand(-120,120);
}
function wildMove(m,dt,destX,destY,spd){
  if(destX!==undefined&&destY!==undefined){ m.tx=destX; m.ty=destY; }
  if(m.state==="sleep"){ m.moving=false; return; }
  if(m.activity==="eat"&&m.eatT>0&&spd<=0){ m.moving=false; return; }
  const pp=playerPos();
  if(wildGoalConflict(m,pp)||wildTrackStuck(m,dt)) wildBreakLoop(m);
  destX=m.tx; destY=m.ty;
  const dx=destX-m.x, dy=destY-m.y, d=Math.hypot(dx,dy)||1;
  if(d>8){
    m.a=Math.atan2(dy,dx);
    const mv=Math.min(1,d/90);
    const wtf=terrainSpeedFactor(m.x,m.y, dx, dy);
    m.x+=dx/d*spd*mv*dt*wtf;
    m.y+=dy/d*spd*mv*dt*wtf;
    m.moving=true;
    m.walkT=(m.walkT||0)+dt*(0.55+spd/180);
  } else m.moving=false;
  if(terrainSteepAt(m.x,m.y, TERRAIN_SLOPE_HARD)) wildWanderTarget(m,m.homeX,m.homeY);
  pushWildFromBuildings(m);
  collideTrees(m);
  if(inWater(m.x,m.y)){
    const px=m.x-Math.cos(m.a)*spd*dt, py=m.y-Math.sin(m.a)*spd*dt;
    if(!inWater(px,m.y)) m.x=px; else if(!inWater(m.x,py)) m.y=py;
    else wildWanderTarget(m,m.homeX,m.homeY);
  }
  if(wildTrackStuck(m,dt)) wildBreakLoop(m);
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
    provokedT:0, fleeT:0, activity:"wander", eatT:rand(2,5),
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
    const fam={id:nextFamilyId++, hx, hy, hunger:rand(0.08,0.35), anger:0, denR:34+rand(0,10)};
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
  if(wildApplyDayRhythm(b,dt) && (b.state==="sleep"||(b.activity==="eat"&&b.eatT>0))) return;
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
    const wantsFight=b.provokedT>0||angry||(hungry&&d<130)||(fam&&fam.hunger>0.65&&d<95);
    const wantsFlee=!wantsFight&&!angry&&(!hungry||d>175)&&d<175&&(!fam||fam.hunger<0.75);
    if(wantsFight){
      b.state="chase"; b.targetKind="player"; b.fleeT=0; b.activity="hunt";
      if(b.roarCd<=0&&d<110){ b.roarCd=3.5; playBoom(0.06); if(typeof playForestBearGrowl==="function") playForestBearGrowl(0.16); }
    } else if(wantsFlee){
      b.state="flee"; b.targetKind=null; b.provokedT=0;
      wildFleeTarget(b,pp.x,pp.y,220); destX=b.tx; destY=b.ty; spd=b.run*1.05;
    } else if(b.state==="chase"||b.state==="attack"){
      b.state="wander"; b.targetKind=null; b.repick=rand(0.6,1.6);
    }
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
    if(fam&&fam.hunger>0.55&&wildDayPhase()==="day"&&rng()<dt*0.05){ b.activity="eat"; b.eatT=rand(2,4); b.moving=false; destX=b.x; destY=b.y; spd=0; }
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
    activity:"graze", eatT:rand(2,5),
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
    const herd={id:nextHerdId++, hx,hy, spooked:0, denR:28+rand(0,8)};
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
  if(typeof playForestDeerSnort==="function"&&rng()<0.45) playForestDeerSnort(0.1+str*0.08);
  for(const d of deer){
    if(d.herdId!==herdId) continue;
    if(d.state==="sleep") d.state="graze";
    d.state="flee"; d.fleeT=Math.max(d.fleeT,2.5); d.alertT=Math.max(d.alertT,4);
    d.targetKind=null; d.provokedT=0;
    wildFleeTarget(d,fromX,fromY,rand(260,340));
  }
}
function updateDeer(d,dt){
  if(wildApplyDayRhythm(d,dt) && (d.state==="sleep"||(d.activity==="eat"&&d.eatT>0))) return;
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
      d.state="flee"; d.targetKind=null;
      if(Math.hypot(d.tx-d.x,d.ty-d.y)<40) wildFleeTarget(d,pp.x,pp.y,rand(280,360));
      destX=d.tx; destY=d.ty; spd=d.run;
    } else if(dist<55&&d.buck){
      d.state="stand"; destX=d.x; destY=d.y; spd=0;
    } else if(d.state==="chase"){ d.state="graze"; d.targetKind=null; }
  } else if(d.state==="flee"&&d.fleeT<=0) d.state="graze";

  if(d.state==="graze"||d.state==="wander"){
    d.repick-=dt;
    if(d.repick<=0){ wildWanderTarget(d,d.homeX,d.homeY,HOME_R*0.9); d.repick=rand(3,7); }
    if(d.activity==="eat"&&d.eatT>0){ destX=d.x; destY=d.y; spd=0; d.moving=false; }
    else if(Math.random()<dt*0.08){ d.state="graze"; d.activity="eat"; d.eatT=rand(1.5,3.5); d.moving=false; destX=d.x; destY=d.y; spd=0; }
    if(d.activity!=="eat"&&herd){
      let cx=0,cy=0,n=0;
      for(const o of deer) if(o.herdId===herd.id){ cx+=o.x; cy+=o.y; n++; }
      if(n>1){ cx/=n; cy/=n; d.tx+=(cx-d.tx)*0.018; d.ty+=(cy-d.ty)*0.018; }
    }
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
    activity:"patrol", eatT:rand(2,5),
    onHurt(w,killed){
      const pk=getPack(w.packId);
      if(pk) pk.aggro=Math.min(1,(pk.aggro||0)+0.45);
      if(!killed&&typeof playForestWolfHowl==="function"&&rng()<0.35) playForestWolfHowl(0.12);
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
    const pack={id:nextPackId++, hx,hy, hunger:rand(0.15,0.45), aggro:0, denR:32+rand(0,10)};
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
  if(wildApplyDayRhythm(w,dt) && (w.state==="sleep"||(w.activity==="eat"&&w.eatT>0))) return;
  const pack=getPack(w.packId);
  if(pack){
    pack.hunger=Math.min(1,pack.hunger+dt*0.000022);
    if(pack.aggro>0) pack.aggro=Math.max(0,pack.aggro-dt*0.02);
  }
  if(w.provokedT>0) w.provokedT=Math.max(0,w.provokedT-dt);
  if(w.stalkT>0) w.stalkT=Math.max(0,w.stalkT-dt);

  const pp=playerPos();
  let destX=w.tx, destY=w.ty, spd=w.speed;
  const night=wildIsNight();
  const hunt=(pack&&pack.aggro>0.35)||w.provokedT>0||(pack&&pack.hunger>0.72)||(night&&pack&&pack.hunger>0.5);

  if(pp){
    const d=Math.hypot(pp.x-w.x,pp.y-w.y);
    if(hunt&&d<155){
      w.state="chase"; w.targetKind="player"; w.stalkT=0; w.fleeT=0; w.activity="hunt";
    } else if(hunt&&d<240){
      w.state="stalk"; w.targetKind=null;
      const flank=Math.atan2(pp.y-w.y,pp.x-w.x)+Math.PI*0.55*(w.alpha?1:-1);
      wildSetPath(w,pp.x+Math.cos(flank)*120,pp.y+Math.sin(flank)*120);
      destX=w.tx; destY=w.ty; spd=w.run*0.72; w.stalkT=Math.max(w.stalkT,1.5);
    } else if(!hunt&&d<130&&!w.provokedT){
      w.state="avoid"; w.targetKind=null;
      wildFleeTarget(w,pp.x,pp.y,180); destX=w.tx; destY=w.ty; spd=w.run*0.85;
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
    if(w.activity==="eat"&&w.eatT>0){ destX=w.x; destY=w.y; spd=0; }
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
    activity:"root", eatT:rand(2,5), denR:24+rand(0,8),
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
  if(wildApplyDayRhythm(b,dt) && (b.state==="sleep"||(b.activity==="eat"&&b.eatT>0))) return;
  if(b.provokedT>0) b.provokedT=Math.max(0,b.provokedT-dt);
  if(b.chargeT>0) b.chargeT=Math.max(0,b.chargeT-dt);

  const pp=playerPos();
  let destX=b.tx, destY=b.ty, spd=b.speed;
  if(pp){
    const d=Math.hypot(pp.x-b.x,pp.y-b.y);
    if(b.provokedT>0||d<105){
      if(b.state!=="charge"&&b.state!=="attack"&&typeof playForestBoarGrunt==="function"&&rng()<0.55) playForestBoarGrunt(0.13);
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
    if(b.activity==="eat"&&b.eatT>0){ destX=b.x; destY=b.y; spd=0; b.moving=false; }
    else if(Math.random()<dt*0.07){ b.state="root"; b.activity="eat"; b.eatT=rand(2,4); b.moving=false; destX=b.x; destY=b.y; spd=0; }
    if(b.hp/b.maxHp<0.28&&pp){
      const d=Math.hypot(pp.x-b.x,pp.y-b.y);
      if(d<160){ wildFleeTarget(b,pp.x,pp.y,140); destX=b.tx; destY=b.ty; spd=b.run; b.state="flee"; }
    }
  }
  wildMove(b,dt,destX,destY,spd);
  if(b.state==="attack"||b.state==="charge") wildTryAttack(b,dt,[16,26],[18,28]);
  if(mode==="car"&&!car.dead){
    const cd=Math.hypot(car.x-b.x,car.y-b.y);
    if(cd<car.R+b.r&&Math.hypot(car.vx,car.vy)>36) wildMammalHit(b,Math.hypot(car.vx,car.vy)*0.36,(b.x-car.x)/cd*105,(b.y-car.y)/cd*105);
  }
}

/* ── small forest critters + tree squirrels ── */
function forEachForestTreeNear(wx,wy,radius,fn){
  const ci=Math.floor((wx-ROAD)/GAP), cj=Math.floor((wy-ROAD)/GAP);
  const cells=Math.ceil(radius/GAP)+1;
  for(let i=ci-cells;i<=ci+cells;i++) for(let j=cj-cells;j<=cj+cells;j++){
    const L=getLot(i,j); if(!L.props.length) continue;
    for(const p of L.props){
      if(p.t!=="tree"||!p.forest||!p.outline) continue;
      if(Math.hypot(p.x-wx,p.y-wy)>radius) continue;
      fn(p);
    }
  }
}
function findForestTreeNear(wx,wy,radius){
  let best=null, bestD=Infinity;
  forEachForestTreeNear(wx,wy,radius,p=>{
    if(p.kind==="bush") return;
    const d=Math.hypot(p.x-wx,p.y-wy);
    if(d<bestD){ best=p; bestD=d; }
  });
  return best;
}
function findForestTreeAt(tx,ty,tol){
  tol=tol||12;
  let best=null, bestD=tol;
  forEachForestTreeNear(tx,ty,tol+40,p=>{
    const d=Math.hypot(p.x-tx,p.y-ty);
    if(d<bestD){ best=p; bestD=d; }
  });
  return best;
}
function squirrelTreePos(sq,tree){
  if(!tree) return {x:sq.x,y:sq.y,z:0};
  const H=tree.H||tree.s*0.6, u=sq.u||0.72;
  const [vx,vy]=typeof treeLean==="function"?treeLean(tree):[0,-H*0.65];
  const R=(tree.crownR||tree.s*0.32)*0.52;
  const ox=Math.cos(sq.orbit||0)*R, oy=Math.sin(sq.orbit||0)*R*0.62;
  return {x:tree.x+vx*u+ox, y:tree.y+vy*u+oy, z:H*u*0.28};
}
function critterAtBurrow(c,d){ return Math.hypot(c.x-d.x,c.y-d.y)<(d.r||14)+6; }
function critterGoBurrow(c){ c.tx=c.homeX+rand(-5,5); c.ty=c.homeY+rand(-5,5); c.state="return"; }
function critterWander(c,hx,hy,hr){
  hr=hr||90;
  for(let t=0;t<14;t++){
    const ang=rng()*6.283, d=rand(18,hr);
    const tx=hx+Math.cos(ang)*d, ty=hy+Math.sin(ang)*d;
    if(inForestAt(tx,ty)&&!inWater(tx,ty)&&!terrainSteepAt(tx,ty,TERRAIN_SLOPE_WALK)&&!inBuilding(tx,ty,10)){
      c.tx=tx; c.ty=ty; return;
    }
  }
  c.tx=c.x+rand(-40,40); c.ty=c.y+rand(-40,40);
}
function critterMove(c,dt,spd){
  if(c.state==="sleep"||c.state==="curl"){ c.moving=false; return; }
  const dx=c.tx-c.x, dy=c.ty-c.y, d=Math.hypot(dx,dy)||1;
  if(d>5){
    c.a=Math.atan2(dy,dx);
    const mv=Math.min(1,d/60);
    c.x+=dx/d*spd*mv*dt;
    c.y+=dy/d*spd*mv*dt;
    c.moving=true;
    c.walkT=(c.walkT||0)+dt;
  } else c.moving=false;
  pushWildFromBuildings(c);
  collideTrees(c);
  if(inWater(c.x,c.y)){ c.x-=Math.cos(c.a)*spd*dt; c.y-=Math.sin(c.a)*spd*dt; critterWander(c,c.homeX,c.homeY); }
}
function critterScared(c,pp,dist){
  if(!pp) return false;
  const d=Math.hypot(pp.x-c.x,pp.y-c.y);
  if(d>dist) return false;
  if(c.kind==="hedgehog"){
    c.state="curl"; c.curlT=rand(2.5,5); c.moving=false; c.fleeT=0;
    return true;
  }
  c.state="flee"; c.fleeT=Math.max(c.fleeT||0,2);
  const ang=Math.atan2(c.y-pp.y,c.x-pp.x)+(rng()-0.5)*0.5;
  c.tx=c.x+Math.cos(ang)*rand(90,170); c.ty=c.y+Math.sin(ang)*rand(90,170);
  if(c.kind==="rabbit"||c.kind==="mouse"){
    c.rustleCd=(c.rustleCd||0)+0.5;
    if(typeof playForestBushRustle==="function"&&c.rustleCd>0.35){ playForestBushRustle(0.06+rng()*0.04); c.rustleCd=0; }
  }
  return true;
}
function critterDayRhythm(c,dt){
  if(c.fleeT>0||c.state==="flee"||c.state==="curl") return false;
  const phase=wildDayPhase(), h=wildHour(), def=CRITTER_DEF[c.kind]||CRITTER_DEF.rabbit;
  const den={x:c.homeX,y:c.homeY,r:c.denR||14};
  if(def.nightish){
    if(phase==="day"&&h>7.8&&h<18.2){
      if(!critterAtBurrow(c,den)){ critterGoBurrow(c); return false; }
      c.state="sleep"; c.moving=false; return true;
    }
    if((phase==="night"||phase==="dawn"||phase==="dusk")&&c.state==="sleep"){
      c.state="forage"; critterWander(c,c.homeX,c.homeY,70); c.repick=rand(1.5,3.5);
    }
  } else {
    if(phase==="night"||h<6||h>21){
      if(!critterAtBurrow(c,den)){ critterGoBurrow(c); return false; }
      c.state="sleep"; c.moving=false; return true;
    }
    if(c.state==="sleep"){ c.state="forage"; critterWander(c,c.homeX,c.homeY,80); c.repick=rand(1.2,2.8); }
  }
  if(c.state==="forage"||c.state==="return"){
    c.repick=(c.repick||0)-dt;
    if(c.repick<=0){ critterWander(c,c.homeX,c.homeY,c.kind==="mouse"?55:95); c.repick=rand(1.5,4); }
    if(c.kind!=="mouse"&&rng()<dt*0.06){ c.state="eat"; c.eatT=rand(1.2,3); c.moving=false; }
    if(c.state==="eat"){ c.eatT=(c.eatT||0)-dt; if(c.eatT<=0){ c.state="forage"; c.repick=0.4; } return true; }
  }
  return false;
}
function spawnForestCritter(type){
  const ang=rng()*6.283, dist=rand(60,480);
  const hx=focusX+Math.cos(ang)*dist, hy=focusY+Math.sin(ang)*dist;
  if(!inForestAt(hx,hy)||inWater(hx,hy)||inBuilding(hx,hy,12)) return null;
  for(const c of forestCritters){
    if(c.kind===type&&Math.hypot(c.homeX-hx,c.homeY-hy)<120) return null;
  }
  const def=CRITTER_DEF[type]; if(!def) return null;
  const x=hx+rand(-16,16), y=hy+rand(-16,16);
  if(!inForestAt(x,y)) return null;
  return {
    kind:type, x,y, a:rng()*6.283, r:def.r,
    homeX:hx, homeY:hy, denR:type==="hedgehog"?12+rand(0,6):10+rand(0,4),
    tx:x, ty:y, state:"forage", repick:rand(1,3), fleeT:0, curlT:0, eatT:rand(1,2),
    walkT:rng()*2, moving:false, tailT:rng()*6.28,
  };
}
function spawnTreeSquirrel(){
  const ang=rng()*6.283, dist=rand(70,520);
  const x=focusX+Math.cos(ang)*dist, y=focusY+Math.sin(ang)*dist;
  const tree=findForestTreeNear(x,y,140);
  if(!tree||tree.kind==="bush") return null;
  for(const s of treeSquirrels) if(Math.hypot(s.treeX-tree.x,s.treeY-tree.y)<36) return null;
  return {
    kind:"squirrel", treeX:tree.x, treeY:tree.y,
    state:"tree", u:rand(0.52,0.9), orbit:rng()*6.283,
    x:tree.x, y:tree.y, a:rng()*6.283, tx:tree.x, ty:tree.y,
    tailT:rng()*6.28, repick:rand(1.2,2.8), fleeT:0, climbT:0,
    activity:"forage", eatT:rand(1.5,3), walkT:0, moving:false,
  };
}
function updateForestCritters(dt){
  const pp=playerPos();
  for(let i=forestCritters.length-1;i>=0;i--){
    const c=forestCritters[i], def=CRITTER_DEF[c.kind]||CRITTER_DEF.rabbit;
    if(c.fleeT>0) c.fleeT=Math.max(0,c.fleeT-dt);
    if(c.curlT>0){
      c.curlT=Math.max(0,c.curlT-dt);
      if(c.curlT<=0&&c.state==="curl") c.state="forage";
    }
    if(Math.hypot(c.x-focusX,c.y-focusY)>Math.max(VW,VH)*0.9+220){ forestCritters.splice(i,1); continue; }
    if(critterScared(c,pp,def.flee)) continue;
    if(critterDayRhythm(c,dt)) continue;
    let spd=def.speed;
    if(c.state==="flee") spd=def.run;
    else if(c.state==="return") spd=def.speed*0.85;
    critterMove(c,dt,spd);
    if(c.moving&&(c.kind==="mouse"||c.kind==="rabbit")&&rng()<dt*0.05&&typeof playForestBushRustle==="function")
      playForestBushRustle(0.025+rng()*0.02);
  }
  if(!inForestAt(focusX,focusY)) return;
  critterTimer-=dt;
  if(forestCritters.length<MAX_FOREST_CRITTERS&&critterTimer<=0){
    critterTimer=rand(0.25,0.75);
    const roll=rng();
    const type=roll<0.28?"hedgehog":roll<0.62?"rabbit":"mouse";
    const nc=spawnForestCritter(type); if(nc) forestCritters.push(nc);
  }
}
function updateTreeSquirrels(dt){
  const pp=playerPos();
  for(let i=treeSquirrels.length-1;i>=0;i--){
    const s=treeSquirrels[i];
    s.tailT=(s.tailT||0)+dt*9;
    s.repick=(s.repick||0)-dt;
    if(s.fleeT>0) s.fleeT=Math.max(0,s.fleeT-dt);
    if(s.climbT>0) s.climbT=Math.max(0,s.climbT-dt);
    const tree=findForestTreeAt(s.treeX,s.treeY,18);
    if(!tree&&s.state==="tree"){ s.state="ground"; s.x=s.treeX; s.y=s.treeY; }

    const phase=wildDayPhase();
    const pos0=s.state==="tree"&&tree?squirrelTreePos(s,tree):{x:s.x,y:s.y};
    const nearPlayer=pp&&Math.hypot(pp.x-pos0.x,pp.y-pos0.y)<130;
    if(!nearPlayer&&s.fleeT<=0&&phase==="night"&&s.state!=="sleep"){
      s.state="sleep"; s.u=Math.max(0.62,s.u||0.7); s.moving=false;
    } else if(phase!=="night"&&s.state==="sleep"&&s.fleeT<=0){
      s.state=tree?"tree":"ground"; s.repick=0.3;
    }

    if(pp){
      const pos=s.state==="tree"&&tree?squirrelTreePos(s,tree):{x:s.x,y:s.y};
      const d=Math.hypot(pp.x-pos.x,pp.y-pos.y);
      if(d<125){
        s.fleeT=Math.max(s.fleeT||0,2.4);
        if(s.state==="tree"&&tree&&rng()<0.55){
          s.state="ground"; s.x=tree.x+rand(-8,8); s.y=tree.y+rand(-4,4); s.climbT=0.5;
        }
        const ang=Math.atan2(pos.y-pp.y,pos.x-pp.x)+(rng()-0.5)*0.7;
        s.tx=pos.x+Math.cos(ang)*rand(120,220); s.ty=pos.y+Math.sin(ang)*rand(120,220);
        s.state="flee";
        if(typeof playForestSquirrelChirp==="function"&&rng()<0.7) playForestSquirrelChirp(0.08+rng()*0.05);
      }
    }

    if(s.state==="sleep"){
      s.moving=false;
      if(tree) s.orbit=(s.orbit||0)+dt*0.15;
      continue;
    }

    if(s.state==="tree"&&tree){
      s.orbit=(s.orbit||0)+dt*(0.55+Math.sin(s.tailT*0.3)*0.12);
      if(s.repick<=0){
        s.u=clamp((s.u||0.7)+rand(-0.12,0.12),0.48,0.94);
        s.orbit+=(rng()-0.5)*1.2;
        s.repick=rand(1.4,3.6);
        if(rng()<0.22){ s.state="ground"; s.x=tree.x+rand(-10,10); s.y=tree.y+rand(-2,6); s.eatT=rand(1.5,3.5); }
      }
      if(s.fleeT<=0&&rng()<dt*0.012){
        const nt=findForestTreeNear(tree.x,tree.y,tree.crownR*2.8);
        if(nt&&Math.hypot(nt.x-tree.x,nt.y-tree.y)>20){
          s.treeX=nt.x; s.treeY=nt.y; s.u=rand(0.55,0.85); s.orbit=rng()*6.28;
        }
      }
      s.moving=true;
      continue;
    }

    if(s.state==="ground"||s.state==="flee"||s.state==="forage"){
      if(s.eatT>0&&s.state!=="flee"){ s.eatT-=dt; s.moving=false; continue; }
      if(s.repick<=0&&s.state!=="flee"){
        critterWander(s,s.x,s.y,55);
        s.repick=rand(1,2.5);
        if(rng()<0.35&&tree){ s.state="tree"; s.climbT=0.8; s.u=Math.max(0.35,(s.u||0.5)-0.25); continue; }
      }
      const spd=s.state==="flee"?108:42;
      critterMove(s,dt,spd);
      if(s.climbT>0&&tree&&Math.hypot(s.x-tree.x,s.y-tree.y)<22){
        s.state="tree"; s.u=clamp((s.u||0.4)+dt*0.9,0.4,0.88); s.climbT=0;
      }
      if(s.fleeT<=0&&s.state==="flee") s.state="ground";
    }

    if(Math.hypot((s.x||s.treeX)-focusX,(s.y||s.treeY)-focusY)>Math.max(VW,VH)*0.95+260) treeSquirrels.splice(i,1);
  }
  if(!inForestAt(focusX,focusY)) return;
  squirrelTimer-=dt;
  if(treeSquirrels.length<MAX_TREE_SQUIRRELS&&squirrelTimer<=0){
    squirrelTimer=rand(0.35,0.95);
    const ns=spawnTreeSquirrel(); if(ns) treeSquirrels.push(ns);
  }
}

/* ── foxes (river-edges, dusk/night hunter) ── */
function nearRiverAt(x,y,pad){
  pad=pad||58;
  if(isRiverAt(x,y)) return true;
  for(let a=0;a<8;a++){ const ang=a/8*6.283; if(isRiverAt(x+Math.cos(ang)*pad,y+Math.sin(ang)*pad)) return true; }
  return false;
}
function findRiverBank(wx,wy,maxDist){
  maxDist=maxDist||48;
  for(let t=0;t<22;t++){
    const ang=rng()*6.283, d=rand(10,maxDist);
    const x=wx+Math.cos(ang)*d, y=wy+Math.sin(ang)*d;
    if(inForestAt(x,y)&&!inWater(x,y)&&nearRiverAt(x,y,42)) return {x,y};
  }
  return null;
}
function riverWanderTarget(o,dist){
  dist=dist||100;
  for(let t=0;t<20;t++){
    const ang=rng()*6.283, d=rand(24,dist);
    const tx=o.x+Math.cos(ang)*d, ty=o.y+Math.sin(ang)*d;
    if(isRiverAt(tx,ty)) { o.tx=tx; o.ty=ty; return true; }
  }
  return false;
}
function foxActiveNow(){
  const phase=wildDayPhase(), h=wildHour();
  return phase==="night"||phase==="dawn"||phase==="dusk"||(phase==="day"&&(h<8.5||h>18.5));
}
function spawnForestFox(){
  for(let t=0;t<22;t++){
    const ang=rng()*6.283, dist=rand(120,620);
    const hx=focusX+Math.cos(ang)*dist, hy=focusY+Math.sin(ang)*dist;
    const byRiver=nearRiverAt(hx,hy,70);
    if(!inForestAt(hx,hy)||inWater(hx,hy)||inBuilding(hx,hy,16)) continue;
    if(!byRiver&&rng()>0.35) continue;
    for(const f of forestFoxes) if(Math.hypot(f.homeX-hx,f.homeY-hy)<280) return null;
    const bank=byRiver?findRiverBank(hx,hy,55):null;
    const x=(bank||{x:hx,y:hy}).x+rand(-12,12), y=(bank||{x:hx,y:hy}).y+rand(-8,8);
    if(!inForestAt(x,y)||inWater(x,y)) continue;
    return {
      kind:"fox", x,y, a:rng()*6.283, r:14,
      homeX:hx, homeY:hy, denR:20+rand(0,10),
      tx:x, ty:y, state:"patrol", repick:rand(2,5), fleeT:0, huntT:0,
      eatT:rand(2,4), walkT:0, moving:false, tailT:rng()*6.28, sfxCd:rand(2,8),
    };
  }
  return null;
}
function foxNearestPrey(f){
  let best=null, bestD=190;
  for(const c of forestCritters){
    if(c.kind!=="rabbit"&&c.kind!=="mouse") continue;
    if(c.state==="sleep"||c.state==="curl") continue;
    const d=Math.hypot(c.x-f.x,c.y-f.y);
    if(d<bestD){ best=c; bestD=d; }
  }
  return best;
}
function updateForestFoxes(dt){
  const pp=playerPos();
  for(let i=forestFoxes.length-1;i>=0;i--){
    const f=forestFoxes[i];
    f.tailT=(f.tailT||0)+dt*7;
    f.sfxCd=(f.sfxCd||0)-dt;
    if(f.fleeT>0) f.fleeT=Math.max(0,f.fleeT-dt);
    if(f.huntT>0) f.huntT=Math.max(0,f.huntT-dt);
    if(Math.hypot(f.x-focusX,f.y-focusY)>Math.max(VW,VH)*0.92+240){ forestFoxes.splice(i,1); continue; }

    const den={x:f.homeX,y:f.homeY,r:f.denR||20};
    if(!foxActiveNow()&&f.fleeT<=0){
      if(!critterAtBurrow(f,den)){ f.tx=f.homeX+rand(-8,8); f.ty=f.homeY+rand(-8,8); f.state="return"; }
      else { f.state="sleep"; f.moving=false; }
      if(f.state!=="sleep"&&f.state!=="return") critterMove(f,dt,34);
      continue;
    }
    if(f.state==="sleep"){ f.state="patrol"; critterWander(f,f.homeX,f.homeY,120); f.repick=rand(2,4); }

    if(pp){
      const d=Math.hypot(pp.x-f.x,pp.y-f.y);
      if(d<155){
        f.state="flee"; f.fleeT=Math.max(f.fleeT||0,2.5); f.huntT=0;
        const ang=Math.atan2(f.y-pp.y,f.x-pp.x)+(rng()-0.5)*0.45;
        f.tx=f.x+Math.cos(ang)*rand(140,240); f.ty=f.y+Math.sin(ang)*rand(140,240);
        if(typeof playForestFoxYip==="function"&&f.sfxCd<=0){ playForestFoxYip(0.1+rng()*0.06); f.sfxCd=rand(2.5,5); }
        critterMove(f,dt,95);
        continue;
      }
    }

    if(f.state==="flee"){
      critterMove(f,dt,95);
      if(f.fleeT<=0) f.state="patrol";
      continue;
    }

    const prey=foxNearestPrey(f);
    if(prey&&f.huntT<=0&&rng()<0.02){
      f.state="hunt"; f.huntT=rand(3,6); f.tx=prey.x; f.ty=prey.y;
      if(typeof playForestFoxYip==="function"&&f.sfxCd<=0){ playForestFoxYip(0.05); f.sfxCd=4; }
    }
    if(f.state==="hunt"&&prey){
      f.tx=prey.x; f.ty=prey.y;
      critterMove(f,dt,72);
      if(Math.hypot(prey.x-f.x,prey.y-f.y)<18){
        f.state="eat"; f.eatT=rand(2,4); f.moving=false;
        if(rng()<0.55){ prey.state="flee"; prey.fleeT=2; prey.tx=prey.x+rand(-80,80); prey.ty=prey.y+rand(-80,80); }
      }
      continue;
    }
    if(f.state==="eat"){
      f.eatT=(f.eatT||0)-dt;
      if(f.eatT<=0){ f.state="patrol"; critterWander(f,f.homeX,f.homeY,130); f.repick=rand(2,5); }
      continue;
    }

    f.repick=(f.repick||0)-dt;
    if(f.repick<=0){
      if(nearRiverAt(f.x,f.y,50)&&rng()<0.55){
        const bank=findRiverBank(f.x,f.y,70);
        if(bank){ f.tx=bank.x+rand(-20,20); f.ty=bank.y+rand(-12,12); }
        else critterWander(f,f.homeX,f.homeY,130);
      } else critterWander(f,f.homeX,f.homeY,130);
      f.repick=rand(2.5,6);
    }
    if(f.sfxCd<=0&&rng()<dt*0.012&&typeof playForestFoxYip==="function"){
      playForestFoxYip(0.04+rng()*0.03); f.sfxCd=rand(6,14);
    }
    critterMove(f,dt,f.state==="return"?30:48);
  }
  if(!inForestAt(focusX,focusY)) return;
  foxTimer-=dt;
  if(forestFoxes.length<MAX_FOXES&&foxTimer<=0){
    foxTimer=rand(1.2,3.5);
    const nf=spawnForestFox(); if(nf) forestFoxes.push(nf);
  }
}

/* ── river otters ── */
function spawnRiverOtter(){
  for(let t=0;t<28;t++){
    const ang=rng()*6.283, dist=rand(80,520);
    const x=focusX+Math.cos(ang)*dist, y=focusY+Math.sin(ang)*dist;
    if(!isRiverAt(x,y)) continue;
    if(!inForestAt(x,y)&&!nearRiverAt(x,y,80)) continue;
    for(const o of riverOtters) if(Math.hypot(o.x-x,o.y-y)<90) return null;
    const bank=findRiverBank(x,y,55)||{x:x+rand(-20,20),y:y+rand(-20,20)};
    return {
      kind:"otter", x,y, a:rng()*6.283, r:11,
      homeX:bank.x, homeY:bank.y,
      tx:x, ty:y, state:rng()<0.65?"swim":"bank",
      repick:rand(1.2,2.8), playT:rand(1,3), eatT:rand(1.5,3),
      tailT:rng()*6.28, walkT:0, moving:false, sfxCd:rand(2,6), splashCd:0,
    };
  }
  return null;
}
function otterMove(o,dt,spd){
  if(o.state==="sleep"){ o.moving=false; return; }
  const dx=o.tx-o.x, dy=o.ty-o.y, d=Math.hypot(dx,dy)||1;
  if(d>6){
    o.a=Math.atan2(dy,dx);
    const mv=Math.min(1,d/70);
    o.x+=dx/d*spd*mv*dt; o.y+=dy/d*spd*mv*dt;
    o.moving=true; o.walkT=(o.walkT||0)+dt;
  } else o.moving=false;
  if(o.state==="swim"&&!isRiverAt(o.x,o.y)){
    if(!riverWanderTarget(o,80)){ o.state="bank"; o.tx=o.homeX; o.ty=o.homeY; }
  }
}
function updateRiverOtters(dt){
  const pp=playerPos();
  for(let i=riverOtters.length-1;i>=0;i--){
    const o=riverOtters[i];
    o.tailT=(o.tailT||0)+dt*8;
    o.sfxCd=(o.sfxCd||0)-dt;
    o.splashCd=Math.max(0,(o.splashCd||0)-dt);
    if(Math.hypot(o.x-focusX,o.y-focusY)>Math.max(VW,VH)*0.92+260){ riverOtters.splice(i,1); continue; }

    const phase=wildDayPhase();
    if(phase==="night"&&o.state!=="sleep"&&(!pp||Math.hypot(pp.x-o.x,pp.y-o.y)>160)){
      if(Math.hypot(o.x-o.homeX,o.y-o.homeY)<28){ o.state="sleep"; o.moving=false; continue; }
      o.tx=o.homeX; o.ty=o.homeY; o.state="bank";
    } else if(phase!=="night"&&o.state==="sleep"){
      o.state=rng()<0.6?"swim":"bank"; o.repick=0.4;
    }

    if(pp&&Math.hypot(pp.x-o.x,pp.y-o.y)<130){
      o.state="swim"; o.fleeT=Math.max(o.fleeT||0,2);
      const ang=Math.atan2(o.y-pp.y,o.x-pp.x);
      o.tx=o.x+Math.cos(ang)*rand(80,150); o.ty=o.y+Math.sin(ang)*rand(80,150);
      if(!isRiverAt(o.tx,o.ty)) riverWanderTarget(o,120);
      if(typeof playForestOtterChirp==="function"&&o.sfxCd<=0){ playForestOtterChirp(0.09); o.sfxCd=2.5; }
    }

    if(o.state==="sleep") continue;

    o.repick=(o.repick||0)-dt;
    o.playT=(o.playT||0)-dt;

    if(o.state==="swim"){
      if(o.repick<=0){
        riverWanderTarget(o,140);
        o.repick=rand(1.2,2.8);
        if(rng()<0.22){ o.state="bank"; o.tx=o.homeX+rand(-16,16); o.ty=o.homeY+rand(-10,10); }
      }
      otterMove(o,dt,56);
      if(o.moving&&o.splashCd<=0&&rng()<dt*0.18&&typeof playForestOtterSplash==="function"){
        playForestOtterSplash(0.05); o.splashCd=0.35;
      }
    } else if(o.state==="bank"||o.state==="play"){
      if(o.playT<=0&&o.state==="bank"){
        o.state="play"; o.playT=rand(1.5,3.5);
        if(typeof playForestOtterChirp==="function"&&o.sfxCd<=0){ playForestOtterChirp(0.07+rng()*0.04); o.sfxCd=rand(3,7); }
      }
      if(o.state==="play"){
        o.a+=Math.sin(o.tailT)*0.02;
        if(o.playT<=0){
          o.state=rng()<0.55?"swim":"bank";
          if(o.state==="swim"){
            riverWanderTarget(o,90);
            if(typeof playForestOtterSplash==="function"&&o.splashCd<=0){ playForestOtterSplash(0.08); o.splashCd=0.5; }
          } else { o.tx=o.homeX; o.ty=o.homeY; }
        }
      }
      if(o.repick<=0){
        o.tx=o.homeX+rand(-24,24); o.ty=o.homeY+rand(-16,16);
        o.repick=rand(1.5,3.5);
        if(rng()<0.35&&isRiverAt(o.x,o.y+20)){ o.state="swim"; riverWanderTarget(o,100); }
      }
      otterMove(o,dt,38);
    }
  }
  if(!nearRiverAt(focusX,focusY,120)&&!isRiverAt(focusX,focusY)) return;
  otterTimer-=dt;
  if(riverOtters.length<MAX_OTTERS&&otterTimer<=0){
    otterTimer=rand(0.8,2.2);
    const no=spawnRiverOtter(); if(no) riverOtters.push(no);
  }
}
function drawForestFox(f){
  const bob=f.moving?Math.sin((f.walkT||0)*12)*0.7:0;
  ctx.fillStyle="rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(f.x+1,f.y+2,f.r*0.9,f.r*0.38,0,0,7); ctx.fill();
  ctx.save(); ctx.translate(f.x,f.y+bob); ctx.rotate(f.a);
  ctx.fillStyle="#c86830"; ctx.beginPath(); ctx.ellipse(0,0,f.r*0.88,f.r*0.58,0,0,7); ctx.fill();
  ctx.fillStyle="#e8d8c8"; ctx.beginPath(); ctx.ellipse(0,f.r*0.12,f.r*0.42,f.r*0.28,0,0,7); ctx.fill();
  ctx.fillStyle="#c86830"; ctx.beginPath(); ctx.arc(f.r*0.72,0,f.r*0.42,0,7); ctx.fill();
  ctx.fillStyle="#1a1410"; ctx.beginPath(); ctx.arc(f.r*0.95,-0.5,0.75,0,7); ctx.fill();
  ctx.fillStyle="#c86830"; ctx.beginPath(); ctx.moveTo(f.r*0.55,-f.r*0.55); ctx.lineTo(f.r*0.72,-f.r*0.95); ctx.lineTo(f.r*0.88,-f.r*0.48); ctx.fill();
  ctx.beginPath(); ctx.moveTo(f.r*0.55,f.r*0.55); ctx.lineTo(f.r*0.72,f.r*0.95); ctx.lineTo(f.r*0.88,f.r*0.48); ctx.fill();
  const wag=Math.sin(f.tailT||0)*0.25;
  ctx.strokeStyle="#c86830"; ctx.lineWidth=2.8; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(-f.r*0.5,0); ctx.quadraticCurveTo(-f.r*1.15+wag,-f.r*0.35,-f.r*1.35,0.2); ctx.stroke();
  ctx.fillStyle="#f0ece8"; ctx.beginPath(); ctx.arc(-f.r*1.32,0.25,f.r*0.22,0,7); ctx.fill();
  ctx.restore();
}
function drawRiverOtter(o){
  const swim=o.state==="swim";
  if(swim){
    ctx.fillStyle="rgba(40,90,110,0.12)"; ctx.beginPath(); ctx.ellipse(o.x,o.y+3,o.r*1.1,o.r*0.45,0,0,7); ctx.fill();
  } else {
    ctx.fillStyle="rgba(0,0,0,0.14)"; ctx.beginPath(); ctx.ellipse(o.x+1,o.y+2,o.r*0.85,o.r*0.32,0,0,7); ctx.fill();
  }
  ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.a);
  ctx.fillStyle="#5a4838"; ctx.beginPath(); ctx.ellipse(0,swim?2:0,o.r*0.92,o.r*(swim?0.42:0.55),0,0,7); ctx.fill();
  ctx.fillStyle="#8a7868"; ctx.beginPath(); ctx.ellipse(0,swim?3:1,o.r*0.55,o.r*0.28,0,0,7); ctx.fill();
  ctx.fillStyle="#5a4838"; ctx.beginPath(); ctx.arc(o.r*0.68,swim?0:-0.5,o.r*0.38,0,7); ctx.fill();
  ctx.fillStyle="#1a1410"; ctx.beginPath(); ctx.arc(o.r*0.88,swim?0:-0.5,0.65,0,7); ctx.fill();
  if(o.state==="play"){
    ctx.fillStyle="#5a4838"; ctx.beginPath(); ctx.ellipse(-o.r*0.15,-o.r*0.75,o.r*0.22,o.r*0.38,Math.sin(o.tailT)*0.3,0,7); ctx.fill();
  }
  const tw=Math.sin(o.tailT||0)*0.3;
  ctx.strokeStyle="#4a3828"; ctx.lineWidth=2.4; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(-o.r*0.45,swim?1:0); ctx.quadraticCurveTo(-o.r*1.05+tw,-o.r*0.2,-o.r*1.2,swim?3:0.5); ctx.stroke();
  ctx.restore();
}

function drawSmallBurrow(d){
  if(!d) return;
  const r=d.r||12;
  ctx.fillStyle="rgba(16,12,8,0.22)"; ctx.beginPath(); ctx.ellipse(d.x+1,d.y+2,r*1.05,r*0.55,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(38,30,22,0.55)"; ctx.beginPath(); ctx.ellipse(d.x,d.y,r,r*0.48,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(22,16,10,0.88)"; ctx.beginPath(); ctx.ellipse(d.x,d.y,r*0.42,r*0.26,0,0,7); ctx.fill();
}
function drawForestCritter(c){
  const bob=c.moving?Math.sin((c.walkT||0)*14)*0.6:0;
  ctx.save(); ctx.translate(c.x,c.y+bob);
  if(c.kind==="hedgehog"){
    if(c.state==="curl"||c.state==="sleep"){
      ctx.fillStyle="#4a4038"; ctx.beginPath(); ctx.arc(0,0,c.r*0.92,0,7); ctx.fill();
      for(let i=0;i<14;i++){
        const a=i/14*6.283;
        ctx.strokeStyle="#2a2820"; ctx.lineWidth=1.1;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*c.r*0.45,Math.sin(a)*c.r*0.45);
        ctx.lineTo(Math.cos(a)*c.r*1.08,Math.sin(a)*c.r*1.08); ctx.stroke();
      }
      ctx.restore(); return;
    }
    ctx.rotate(c.a);
    ctx.fillStyle="#6a5848"; ctx.beginPath(); ctx.ellipse(0,0,c.r*0.9,c.r*0.62,0,0,7); ctx.fill();
    ctx.strokeStyle="#3a3830"; ctx.lineWidth=0.9;
    for(let i=-4;i<=4;i++){ ctx.beginPath(); ctx.moveTo(i*1.4,-c.r*0.35); ctx.lineTo(i*1.4,-c.r*0.92); ctx.stroke(); }
    ctx.fillStyle="#5a4838"; ctx.beginPath(); ctx.arc(c.r*0.75,0,c.r*0.32,0,7); ctx.fill();
    ctx.fillStyle="#1a1814"; ctx.beginPath(); ctx.arc(c.r*0.95,-0.5,0.7,0,7); ctx.fill();
    ctx.restore(); return;
  }
  if(c.kind==="rabbit"){
    ctx.rotate(c.a);
    ctx.fillStyle="#b0a090"; ctx.beginPath(); ctx.ellipse(0,0,c.r*0.85,c.r*0.58,0,0,7); ctx.fill();
    ctx.fillStyle="#d8ccc0"; ctx.beginPath(); ctx.ellipse(0,c.r*0.15,c.r*0.45,c.r*0.28,0,0,7); ctx.fill();
    ctx.fillStyle="#c8b8a8"; ctx.beginPath(); ctx.arc(c.r*0.65,0,c.r*0.38,0,7); ctx.fill();
    ctx.fillStyle="#e8e0d8"; ctx.beginPath(); ctx.ellipse(c.r*0.72,c.r*0.55,c.r*0.14,c.r*0.38,-0.25,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.r*0.72,-c.r*0.55,c.r*0.14,c.r*0.38,0.25,0,7); ctx.fill();
    ctx.fillStyle="#1a1814"; ctx.beginPath(); ctx.arc(c.r*0.92,0,0.8,0,7); ctx.fill();
    ctx.restore(); return;
  }
  /* mouse */
  ctx.rotate(c.a);
  ctx.fillStyle="#6a5a48"; ctx.beginPath(); ctx.ellipse(0,0,c.r*0.95,c.r*0.62,0,0,7); ctx.fill();
  ctx.fillStyle="#8a7868"; ctx.beginPath(); ctx.arc(c.r*0.75,0,c.r*0.42,0,7); ctx.fill();
  ctx.fillStyle="#5a5048"; ctx.beginPath(); ctx.ellipse(-c.r*0.85,0,c.r*0.55,c.r*0.22,0,0,7); ctx.fill();
  ctx.fillStyle="#1a1814"; ctx.beginPath(); ctx.arc(c.r*0.98,-0.4,0.55,0,7); ctx.fill();
  ctx.restore();
}
function drawTreeSquirrel(sq){
  const tree=findForestTreeAt(sq.treeX,sq.treeY,20);
  let sx,sy;
  if((sq.state==="tree"||sq.state==="sleep")&&tree){
    const p=squirrelTreePos(sq,tree);
    sx=p.x; sy=p.y;
  } else { sx=sq.x; sy=sq.y; }
  if(sq.state!=="tree"&&sq.state!=="sleep"){
    ctx.fillStyle="rgba(0,0,0,0.14)"; ctx.beginPath(); ctx.ellipse(sx,sy,4,2,0,0,7); ctx.fill();
  }
  ctx.save(); ctx.translate(sx,sy);
  const flip=Math.cos(sq.a||0)<0?-1:1;
  ctx.scale(flip,1);
  const sc=sq.state==="sleep"?0.92:1;
  ctx.scale(sc,sc);
  if(sq.state==="sleep"){
    ctx.fillStyle="#8a5830"; ctx.beginPath(); ctx.ellipse(0,1,5.5,3.2,0,0,7); ctx.fill();
    ctx.strokeStyle="#a06838"; ctx.lineWidth=2.8; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(-2,1); ctx.quadraticCurveTo(-8,-2,-10,2); ctx.stroke();
    ctx.restore(); return;
  }
  ctx.fillStyle="#8a5830"; ctx.beginPath(); ctx.ellipse(0,0,5.2,3.6,0,0,7); ctx.fill();
  ctx.fillStyle="#c8a078"; ctx.beginPath(); ctx.ellipse(0,1.2,3,1.8,0,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(4.2,-0.8,2.6,0,7); ctx.fillStyle="#8a5830"; ctx.fill();
  ctx.fillStyle="#6a4020"; ctx.beginPath(); ctx.moveTo(3.2,-2.8); ctx.lineTo(4.2,-4.8); ctx.lineTo(5.2,-2.8); ctx.fill();
  ctx.fillStyle="#1a1410"; ctx.beginPath(); ctx.arc(5.8,-0.6,0.55,0,7); ctx.fill();
  const tw=Math.sin(sq.tailT||0)*0.35;
  ctx.strokeStyle="#a06838"; ctx.lineWidth=3.2; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(-3,0.2); ctx.quadraticCurveTo(-9+tw,-8,-12,-1.5); ctx.stroke();
  ctx.restore();
}
function drawSmallBurrows(ox,oy){
  const seen=new Set();
  for(const c of forestCritters){
    if(c.kind!=="hedgehog"&&c.kind!=="rabbit"&&c.kind!=="mouse") continue;
    const k=(c.homeX|0)+","+(c.homeY|0);
    if(seen.has(k)) continue;
    if(c.homeX<ox-40||c.homeX>ox+VW+40||c.homeY<oy-40||c.homeY>oy+VH+40) continue;
    seen.add(k);
    drawSmallBurrow({x:c.homeX,y:c.homeY,r:c.denR});
  }
  for(const f of forestFoxes){
    const k="f"+(f.homeX|0)+","+(f.homeY|0);
    if(seen.has(k)) continue;
    if(f.homeX<ox-40||f.homeX>ox+VW+40||f.homeY<oy-40||f.homeY>oy+VH+40) continue;
    seen.add(k);
    drawSmallBurrow({x:f.homeX,y:f.homeY,r:f.denR||20});
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
  if(m.attackT>0.06){
    const a0=meta.attackFrame??(wf.length);
    const aN=meta.attackFrames??1;
    const aStep=meta.attackStep??meta.walkStep??0.09;
    const total=m.attackCdBase?Math.min(0.45,m.attackCdBase*0.4):0.34;
    const elapsed=total-m.attackT;
    local=a0+Math.min(aN-1, Math.floor(elapsed/aStep));
  } else if(m.moving) local=wf[Math.floor((m.walkT||0)/(meta.walkStep||0.11))%wf.length];
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

function updateWildlifeMammal(arr, updateFn, maxDist, dt){
  for(let i=arr.length-1;i>=0;i--){
    const m=arr[i];
    if(!m) continue;
    updateFn(m,dt);
    const j=arr.indexOf(m);
    if(j<0) continue;
    if(Math.hypot(m.x-focusX,m.y-focusY)>maxDist||m.hp<=0) arr.splice(j,1);
  }
}

function updateWildlife(dt){
  const forest=inForestAt(focusX,focusY);
  if(!forest && typeof perfWildlifeUpdates==="function" && !perfWildlifeUpdates()) return;
  bearTimer-=dt; deerTimer-=dt; wolfTimer-=dt; boarTimer-=dt;
  updateWildlifeMammal(bears, updateBear, 2400, dt);
  updateWildlifeMammal(deer, updateDeer, 2200, dt);
  updateWildlifeMammal(wolves, updateWolf, 2300, dt);
  updateWildlifeMammal(boars, updateBoar, 2100, dt);
  for(let i=bearFamilies.length-1;i>=0;i--) if(!bears.some(b=>b.familyId===bearFamilies[i].id)) bearFamilies.splice(i,1);
  for(let i=deerHerds.length-1;i>=0;i--) if(!deer.some(d=>d.herdId===deerHerds[i].id)) deerHerds.splice(i,1);
  for(let i=wolfPacks.length-1;i>=0;i--) if(!wolves.some(w=>w.packId===wolfPacks[i].id)) wolfPacks.splice(i,1);
  updateForestCritters(dt);
  updateTreeSquirrels(dt);
  updateForestFoxes(dt);
  updateRiverOtters(dt);
  updateForestBirds(dt);
  if(!forest) return;
  if(bearFamilies.length<MAX_BEAR_FAMILIES&&bearTimer<=0){ bearTimer=rand(2.5,5.5); const g=spawnBearFamily(); if(g) bears.push(...g); }
  if(deerHerds.length<MAX_DEER_HERDS&&deerTimer<=0){ deerTimer=rand(1.8,4); const g=spawnDeerHerd(); if(g) deer.push(...g); }
  if(wolfPacks.length<MAX_WOLF_PACKS&&wolfTimer<=0){ wolfTimer=rand(3,6); const g=spawnWolfPack(); if(g) wolves.push(...g); }
  if(boars.length<MAX_BOAR_GROUPS*2&&boarTimer<=0){ boarTimer=rand(2,4.5); const g=spawnBoarGroup(); if(g) boars.push(...g); }
}
function drawWildDen(d,kind){
  if(!d) return;
  const r=d.denR||32;
  ctx.fillStyle="rgba(18,14,10,0.28)"; ctx.beginPath(); ctx.ellipse(d.x+2,d.y+3,r*1.05,r*0.72,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(42,34,26,0.55)"; ctx.beginPath(); ctx.ellipse(d.x,d.y,r,r*0.62,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(28,22,16,0.85)"; ctx.beginPath(); ctx.ellipse(d.x,d.y,r*0.38,r*0.28,0,0,7); ctx.fill();
  if(kind==="wolf"||kind==="bear"){
    ctx.fillStyle="rgba(52,44,36,0.35)"; ctx.beginPath(); ctx.ellipse(d.x-r*0.55,d.y+r*0.08,r*0.22,r*0.16,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(d.x+r*0.55,d.y+r*0.08,r*0.22,r*0.16,0,0,7); ctx.fill();
  }
  ctx.fillStyle="rgba(48,72,38,0.22)"; ctx.beginPath(); ctx.ellipse(d.x-r*0.3,d.y+r*0.35,r*0.35,r*0.18,0,0,7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(d.x+r*0.25,d.y+r*0.32,r*0.3,r*0.16,0,0,7); ctx.fill();
}
function drawWildDens(ox,oy){
  const seen=new Set();
  for(const f of bearFamilies){
    if(seen.has("b"+f.id)) continue;
    if(f.hx<ox-80||f.hx>ox+VW+80||f.hy<oy-80||f.hy>oy+VH+80) continue;
    seen.add("b"+f.id); drawWildDen({x:f.hx,y:f.hy,denR:f.denR},"bear");
  }
  for(const h of deerHerds){
    if(seen.has("d"+h.id)) continue;
    if(h.hx<ox-80||h.hx>ox+VW+80||h.hy<oy-80||h.hy>oy+VH+80) continue;
    seen.add("d"+h.id); drawWildDen({x:h.hx,y:h.hy,denR:h.denR},"deer");
  }
  for(const p of wolfPacks){
    if(seen.has("w"+p.id)) continue;
    if(p.hx<ox-80||p.hx>ox+VW+80||p.hy<oy-80||p.hy>oy+VH+80) continue;
    seen.add("w"+p.id); drawWildDen({x:p.hx,y:p.hy,denR:p.denR},"wolf");
  }
  for(const b of boars){
    const k="o"+b.homeX+","+b.homeY;
    if(seen.has(k)) continue;
    if(b.homeX<ox-80||b.homeX>ox+VW+80||b.homeY<oy-80||b.homeY>oy+VH+80) continue;
    seen.add(k); drawWildDen({x:b.homeX,y:b.homeY,denR:b.denR},"boar");
  }
}

function drawWildlife(ox,oy){
  drawWildDens(ox,oy);
  drawSmallBurrows(ox,oy);
  for(const o of riverOtters) if(o.x>=ox-40&&o.x<=ox+VW+40&&o.y>=oy-40&&o.y<=oy+VH+40) drawRiverOtter(o);
  for(const c of forestCritters) if(c.x>=ox-30&&c.x<=ox+VW+30&&c.y>=oy-30&&c.y<=oy+VH+30) drawForestCritter(c);
  for(const f of forestFoxes) if(f.x>=ox-40&&f.x<=ox+VW+40&&f.y>=oy-40&&f.y<=oy+VH+40) drawForestFox(f);
  for(const d of deer) if(d.x>=ox-60&&d.x<=ox+VW+60&&d.y>=oy-60&&d.y<=oy+VH+60) drawForestMammal(d);
  for(const b of boars) if(b.x>=ox-60&&b.x<=ox+VW+60&&b.y>=oy-60&&b.y<=oy+VH+60) drawForestMammal(b);
  for(const w of wolves) if(w.x>=ox-60&&w.x<=ox+VW+60&&w.y>=oy-60&&w.y<=oy+VH+60) drawForestMammal(w);
  for(const b of bears) if(b.x>=ox-60&&b.x<=ox+VW+60&&b.y>=oy-60&&b.y<=oy+VH+60) drawForestMammal(b);
  for(const fb of forestBirds) if(fb.x>=ox-40&&fb.x<=ox+VW+40&&fb.y-(fb.z||0)>=oy-40&&fb.y<=oy+VH+40) drawForestBird(fb);
}
function drawTreeWildlife(ox,oy){
  for(const s of treeSquirrels){
    const tree=findForestTreeAt(s.treeX,s.treeY,20);
    let sx,sy;
    if((s.state==="tree"||s.state==="sleep")&&tree){ const p=squirrelTreePos(s,tree); sx=p.x; sy=p.y; }
    else { sx=s.x; sy=s.y; }
    if(sx<ox-50||sx>ox+VW+50||sy<oy-80||sy>oy+VH+50) continue;
    drawTreeSquirrel(s);
  }
}

Game.register({
  id:"wildlife",
  order:22,
  update:updateWildlife,
  drawActors:drawWildlife,
  actorLayer:"beforeTraffic",
});
