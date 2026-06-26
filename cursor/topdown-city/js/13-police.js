/* TOPDOWN CITY — 13-police.js */
/* ---------- wanted level + police / SWAT / air / military (GTA IV-style pursuit) ---------- */
const cops=[], footcops=[], helis=[];
let heat=0, stars=0, bustTimer=0, prevStars=0, respawnCd=0, dispatchBoost=0, gunfireCd=0;

const POLICE_FLEET={
  patrol:[
    {brand:"Skoda",carName:"Octavia",type:"sedan",era:"modern",W:40,L:88,color:"#e8ecf2",accent:"#1e4f9c",marking:"patrol"},
    {brand:"Volkswagen",carName:"Passat",type:"sedan",era:"modern",W:41,L:90,color:"#dfe4ea",accent:"#244a8a",marking:"patrol"},
    {brand:"Toyota",carName:"Corolla",type:"sedan",era:"modern",W:39,L:87,color:"#eef1f6",accent:"#1a3d7a",marking:"patrol"},
  ],
  moto:[
    {brand:"Yamaha",carName:"FJR Patrol",kind:"moto",W:17,L:44,color:"#f0f2f6",accent:"#1e4f9c",marking:"patrol"},
    {brand:"BMW",carName:"R1250 RT",kind:"moto",W:17,L:45,color:"#e4e8ee",accent:"#244a8a",marking:"patrol"},
  ],
  swat:[
    {brand:"Mercedes",carName:"Sprinter SWAT",type:"estate",era:"modern",W:50,L:104,color:"#1c2430",accent:"#c0392b",marking:"swat"},
    {brand:"Ford",carName:"Transit SWAT",type:"suv",era:"modern",W:52,L:100,color:"#222830",accent:"#a82820",marking:"swat"},
  ],
  apc:[
    {brand:"Wojsko",carName:"Rosomak",type:"suv",era:"modern",W:56,L:114,color:"#4a5538",accent:"#7a8a50",marking:"apc"},
  ],
};

function applyPoliceModel(c, unit){
  let pool;
  if(unit==="apc") pool=POLICE_FLEET.apc;
  else if(unit==="swat") pool=POLICE_FLEET.swat;
  else if(c.kind==="moto") pool=POLICE_FLEET.moto;
  else pool=POLICE_FLEET.patrol;
  const m=pool[(rng()*pool.length)|0];
  c.brand=m.brand; c.carName=m.carName; c.type=m.type||"sedan"; c.era=m.era||"modern";
  c.accent=m.accent; c.W=m.W; c.L=m.L; c.color=m.color; c.marking=m.marking||unit;
  if(m.kind) c.kind=m.kind;
  c.R=vehicleHitRadius(c.W,c.L,c.kind||"car");
  c.police=true;
}

/* pursuit / search — stars drop only after hiding out of sight */
let lkX=0, lkY=0, lkAge=0, escapeProg=0, playerSpotted=false, wantedPhase="clear", lkValid=false;
const ESCAPE_SEC=[0, 7, 11, 16, 21, 28];
const SEARCH_BASE=[0, 150, 190, 250, 310, 380];

function addHeat(x){
  const was=Math.floor(heat);
  heat=Math.min(5.99, heat+x);
  if(Math.floor(heat)>was){
    escapeProg=0;
    const p=actualPlayerPos();
    if(p){ lkX=p.x; lkY=p.y; lkAge=0; wantedPhase="pursuit"; lkValid=true; }
  }
  dispatchBoost=Math.max(dispatchBoost, 0.8);
}
function notifyGunfire(x,y){
  if(gunfireCd>0) return;
  gunfireCd=0.35;
  addHeat(0.12);
  lkX=x; lkY=y; lkAge=0; escapeProg=0; lkValid=true;
  wantedPhase="search";
  dispatchBoost=Math.max(dispatchBoost, 2.4);
}
function lawActive(){ return cops.length+footcops.length+helis.length; }
function resetPursuitState(){
  lkX=lkY=lkAge=escapeProg=0; playerSpotted=false; wantedPhase="clear"; lkValid=false;
}
function clearAllLaw(){
  cops.length=0; footcops.length=0; helis.length=0;
  bustTimer=0; respawnCd=0; dispatchBoost=0;
  resetPursuitState();
}

function wantedTarget(){
  if(mode==="car") return {x:car.x,y:car.y,vx:car.vx||0,vy:car.vy||0,r:car.R, arrestable:true};
  if(mode==="boat"){
    const sp=Math.hypot(ped.vx||0,ped.vy||0);
    return {x:ped.x,y:ped.y,vx:ped.vx||0,vy:ped.vy||0,r:ped.r+10, arrestable:sp<75};
  }
  if(mode==="inside") return {x:interior?interior.outX:ped.x,y:interior?interior.outY:ped.y,vx:0,vy:0,r:ped.r, arrestable:false};
  return {x:ped.x,y:ped.y,vx:ped.vx||0,vy:ped.vy||0,r:ped.r, arrestable:true};
}
function predictTarget(t, lead){
  const p=wantedTarget();
  return {x:p.x+p.vx*lead, y:p.y+p.vy*lead, vx:p.vx, vy:p.vy, r:p.r, arrestable:p.arrestable};
}

function copSightClear(x0,y0,x1,y1){
  const n=7, dx=x1-x0, dy=y1-y0;
  for(let i=1;i<n;i++){ const t=i/n, px=x0+dx*t, py=y0+dy*t; if(inBuilding(px,py,10)) return false; }
  return true;
}

function actualPlayerPos(){
  if(mode==="inside") return null;
  if(mode==="car") return {x:car.x,y:car.y,r:car.R};
  if(mode==="boat") return {x:ped.x,y:ped.y,r:ped.r+10};
  return {x:ped.x,y:ped.y,r:ped.r};
}

function unitSightRange(u){
  if(u.unit==="heli") return 500;
  if(u.unit==="apc") return 340;
  if(u.unit==="swat") return 400;
  if(u.kind==="moto") return 360;
  if(u.type==="swat"||u.type==="soldier") return 300;
  if(u.type==="police") return 270;
  return 390;
}

function canUnitSee(ux,uy,u){
  const p=actualPlayerPos();
  if(!p) return false;
  const d=Math.hypot(p.x-ux,p.y-uy);
  const rng=unitSightRange(u);
  if(d>rng) return false;
  return copSightClear(ux,uy,p.x,p.y);
}

function searchRadius(){
  const s=Math.max(1,Math.min(5,stars));
  return SEARCH_BASE[s]+lkAge*24;
}

function refreshSpotted(){
  const p=actualPlayerPos();
  if(!p){ playerSpotted=false; return false; }
  for(const c of cops){ if(canUnitSee(c.x,c.y,c)){ playerSpotted=true; lkX=p.x; lkY=p.y; lkAge=0; escapeProg=0; wantedPhase="pursuit"; lkValid=true; return true; } }
  for(const h of helis){ if(canUnitSee(h.x,h.y,h)){ playerSpotted=true; lkX=p.x; lkY=p.y; lkAge=0; escapeProg=0; wantedPhase="pursuit"; lkValid=true; return true; } }
  for(const fc of footcops){ if(canUnitSee(fc.x,fc.y,fc)){ playerSpotted=true; lkX=p.x; lkY=p.y; lkAge=0; escapeProg=0; wantedPhase="pursuit"; lkValid=true; return true; } }
  playerSpotted=false;
  if(stars>0) wantedPhase="search";
  return false;
}

function searchPatrolPoint(seed,rad){
  const t=performance.now()*0.001;
  const a=seed+t*0.55;
  return {x:lkX+Math.cos(a)*rad*0.62, y:lkY+Math.sin(a*0.87)*rad*0.5};
}

function copDriveTarget(c){
  const rad=searchRadius();
  const seed=(c.x*0.017+c.y*0.013)%6.283;
  const dLk=Math.hypot(lkX-c.x,lkY-c.y);
  if(dLk>rad*1.35) return {x:lkX,y:lkY,vx:0,vy:0,r:0,arrestable:false};
  const p=searchPatrolPoint(seed,rad);
  return {x:p.x,y:p.y,vx:0,vy:0,r:0,arrestable:false};
}

function dropOneStar(){
  const s=Math.floor(heat);
  if(s<=0){ heat=0; resetPursuitState(); return; }
  heat=s-1;
  escapeProg=0; lkAge=0;
  if(s<=1){ showBigMsg("ZGUBIONO POLICJĘ"); resetPursuitState(); }
  else showBigMsg("POZIOM −1");
}

function updateSightAndEscape(dt){
  if(stars<=0){ resetPursuitState(); return; }
  if(!lkValid){
    const p=actualPlayerPos();
    if(p){ lkX=p.x; lkY=p.y; lkValid=true; }
    else if(mode==="inside"&&interior){ lkX=interior.outX; lkY=interior.outY; lkValid=true; wantedPhase="search"; }
  }
  refreshSpotted();
  if(playerSpotted) return;
  lkAge+=dt;
  const escNeed=ESCAPE_SEC[Math.min(5,stars)]*(mission&&mission.type==="getaway"?0.75:1);
  if(escNeed<=0) return;
  const p=actualPlayerPos();
  const hideMul=(mode==="inside")?1.45:(p&&inBuilding(p.x,p.y,8)?1.2:1);
  escapeProg+=dt*hideMul;
  if(escapeProg>=escNeed) dropOneStar();
}

function spawnOffscreen(){
  let x,y,tries=0;
  const ci=Math.round(focusX/GAP), cj=Math.round(focusY/GAP);
  do{
    if(rng()<0.5){ const i=ci+randInt(-10,10); x=nX(i,cj)+ROAD/2; y=focusY+rand(-1100,1100); }
    else { const j=cj+randInt(-10,10); y=nY(ci,j)+ROAD/2; x=focusX+rand(-1100,1100); }
    tries++;
  } while((Math.hypot(x-cam.x,y-cam.y)<Math.max(VW,VH)*0.72 || inWater(x,y)||inBuilding(x,y,14)) && tries<45);
  return {x,y};
}

function spawnCop(unit){
  unit=unit||"patrol";
  const p=spawnOffscreen();
  const c={x:p.x,y:p.y,a:0,vx:0,vy:0,flash:0,hp:180,fireCd:rand(0.5,1.4),deployed:0,unit,
           police:true,kind:"car",W:40,L:88,R:vehicleHitRadius(40,88,"car")};
  if(unit==="patrol" && rng()<0.35){
    c.kind="moto"; c.hp=84; c.rider=true;
    c.riderShirt="#26324c"; c.riderSkin=pick(SKIN); c.riderHelmet=true;
    applyPoliceModel(c, "patrol");
  } else if(unit==="swat"){
    c.hp=260;
    applyPoliceModel(c, "swat");
  } else if(unit==="apc"){
    c.hp=420; c.unit="apc";
    applyPoliceModel(c, "apc");
  } else {
    applyPoliceModel(c, "patrol");
  }
  return c;
}

function spawnHeli(){
  const p=spawnOffscreen();
  return {x:p.x,y:p.y,a:0,hp:130,fireCd:rand(0.4,1.2),flash:0,orbit:rng()*6.283,unit:"heli"};
}

function targetCounts(){
  const s=stars;
  return {
    patrol: s>=5?2:s>=4?2:s>=3?2:Math.max(1,s),
    swat: s>=3?1:0,
    apc: s>=5?1:0,
    heli: s>=5?2:s>=4?1:0,
    footMax: s>=5?8:s>=4?6:s>=3?5:s>=2?3:0,
  };
}
function countCops(unit){
  if(unit==="patrol") return cops.filter(c=>c.unit==="patrol"||c.unit==="moto"||(!c.unit&&c.kind!=="moto")).length;
  return cops.filter(c=>c.unit===unit).length;
}
function countFoot(type){ return footcops.filter(f=>f.type===type).length; }

function manageResponse(dt){
  if(stars===0){ clearAllLaw(); return; }
  respawnCd-=dt;
  const delay=Math.max(0.6, 2.8-dispatchBoost*0.35);
  if(respawnCd>0) return;
  const t=targetCounts();
  let spawned=false;
  while(countCops("patrol")<t.patrol){ cops.push(spawnCop("patrol")); spawned=true; }
  while(countCops("swat")<t.swat){ cops.push(spawnCop("swat")); spawned=true; }
  while(countCops("apc")<t.apc){ cops.push(spawnCop("apc")); spawned=true; }
  while(helis.length<t.heli){ helis.push(spawnHeli()); spawned=true; }
  if(spawned) respawnCd=delay;
  while(countCops("patrol")>t.patrol){ const i=cops.findIndex(c=>c.unit==="patrol"||(!c.unit&&c.kind!=="moto")); if(i<0) break; cops.splice(i,1); }
  while(countCops("swat")>t.swat){ const i=cops.findIndex(c=>c.unit==="swat"); if(i<0) break; cops.splice(i,1); }
  while(countCops("apc")>t.apc){ const i=cops.findIndex(c=>c.unit==="apc"); if(i<0) break; cops.splice(i,1); }
  while(helis.length>t.heli) helis.pop();
}

const COP_ACCEL=290;
function copMaxSpeed(c){
  const ref=typeof kmhToPx==="function"?kmhToPx(200):588;
  const s=Math.min(typeof stars!=="undefined"?stars:1,5);
  if(c.unit==="apc") return ref*0.78;
  if(c.unit==="swat") return ref*(0.94+s*0.028);
  if(c.kind==="moto") return ref*(1.0+s*0.022);
  return ref*(0.86+s*0.032);
}

function roadBiasAngle(x,y,ang){
  const ci=Math.floor(x/GAP), cj=Math.floor(y/GAP);
  let bx=x, by=y, bd=1e9;
  for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++){
    const nx=nX(ci+di,cj+dj)+ROAD/2, ny=nY(ci+di,cj+dj)+ROAD/2, d=Math.hypot(nx-x,ny-y);
    if(d<bd){ bd=d; bx=nx; by=ny; }
  }
  if(bd>140) return ang;
  const ra=Math.atan2(by-y,bx-x);
  let da=ra-ang; while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI;
  return ang+da*0.28;
}

function updateCop(c,dt){
  if(c._block){ c.flash=(c.flash+dt*7)%2; return; }
  const sees=canUnitSee(c.x,c.y,c);
  const lead=c.unit==="apc"?0.35:c.kind==="moto"?0.55:0.45;
  const tgt=sees?predictTarget(0,lead):copDriveTarget(c);
  const dx=tgt.x-c.x, dy=tgt.y-c.y, dist=Math.hypot(dx,dy);
  let aim=Math.atan2(dy,dx);
  aim=roadBiasAngle(c.x,c.y,aim);
  let da=aim-c.a; while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI;
  const speed=Math.hypot(c.vx,c.vy);
  c.a+=clamp(da,-1,1)*Math.min(1,speed/55+0.35)*3.2*dt;
  let thr=sees?(dist>90?1:(dist>45?0.35:0.12)):(dist>70?0.72:(dist>28?0.38:0.15));
  if(c.unit==="apc" && dist<120) thr=Math.max(thr,0.55);
  if(!sees && dist<40) thr*=0.55;
  const ahead=(ang)=>{ const px=c.x+Math.cos(ang)*56, py=c.y+Math.sin(ang)*56; return inWater(px,py)||inBuilding(px,py,12); };
  if(ahead(c.a)){ const lOk=!ahead(c.a-0.85), rOk=!ahead(c.a+0.85); c._av=(lOk&&!rOk)?-1:(rOk&&!lOk)?1:(c._av||1); c.a+=c._av*3.0*dt; thr*=0.22; }
  const acc=COP_ACCEL*(c.unit==="apc"?0.85:1);
  c.vx+=Math.cos(c.a)*acc*thr*dt; c.vy+=Math.sin(c.a)*acc*thr*dt;
  const cc=Math.cos(c.a), ss=Math.sin(c.a);
  let f=c.vx*cc+c.vy*ss, lat=-c.vx*ss+c.vy*cc; lat-=lat*Math.min(1,8*dt);
  c.vx=cc*f-ss*lat; c.vy=ss*f+cc*lat;
  c.vx*=(1-Math.min(0.9,0.5*dt)); c.vy*=(1-Math.min(0.9,0.5*dt));
  const maxSp=copMaxSpeed(c), sp=Math.hypot(c.vx,c.vy);
  if(sp>maxSp){ c.vx*=maxSp/sp; c.vy*=maxSp/sp; }
  const px=c.x, py=c.y; c.x+=c.vx*dt; c.y+=c.vy*dt;
  if(inWater(c.x,c.y)){ c.x=px; c.y=py; c.vx*=0.08; c.vy*=0.08; c.a+=1.8*dt; }
  collideCircleBuildings(c,0.45);
  if(Math.hypot(c.x-focusX,c.y-focusY)>3400) Object.assign(c, spawnCop(c.unit==="apc"?"apc":c.unit==="swat"?"swat":"patrol"));
  c.flash=(c.flash+dt*7)%2;
}

function updateHeli(h,dt){
  h.orbit+=dt*0.7;
  const sees=canUnitSee(h.x,h.y,h);
  const lead=sees?0.65:0;
  const tgt=sees?predictTarget(0,lead):{x:lkX,y:lkY,vx:0,vy:0,r:0,arrestable:false};
  const ox=Math.cos(h.orbit)*(sees?170:240), oy=Math.sin(h.orbit)*(sees?110:180);
  const tx=tgt.x+ox, ty=tgt.y+oy;
  const dx=tx-h.x, dy=ty-h.y, dist=Math.hypot(dx,dy)||1;
  h.a=Math.atan2(dy,dx);
  const sp=Math.min(340, sees?(80+dist*0.9):(55+dist*0.65));
  h.x+=dx/dist*sp*dt; h.y+=dy/dist*sp*dt;
  if(inWater(h.x,h.y)) h.y-=80*dt;
  h.flash=(h.flash+dt*9)%2;
  if(Math.hypot(h.x-focusX,h.y-focusY)>3600) Object.assign(h, spawnHeli());
}

function lawShot(sh,x,y,tx,ty,range,dmg,minStars,spread,dt){
  if(stars<minStars) return;
  sh.fireCd-=dt;
  if(sh.fireCd>0) return;
  const d=Math.hypot(tx-x,ty-y);
  if(d>range) return;
  if(!copSightClear(x,y,tx,ty)) return;
  const ang=Math.atan2(ty-y,tx-x)+(rng()-0.5)*(spread||0.16);
  const ox=x+Math.cos(ang)*18, oy=y+Math.sin(ang)*18;
  spawnBullet(ox,oy,ang,640,"cop",dmg,"bullet"); muzzle(ox,oy,ang); playShot();
  sh.fireCd=sh.unit==="heli"?rand(0.55,1.1):sh.unit==="swat"?rand(0.65,1.3):rand(0.85,1.7);
}

function updateLawFire(dt){
  const live=actualPlayerPos();
  if(!live) return;
  for(const c of cops){
    if(!canUnitSee(c.x,c.y,c)) continue;
    const minS=c.unit==="swat"||c.unit==="apc"?2:2;
    const dmg=c.unit==="apc"?10:c.unit==="swat"?9:7;
    const rng=c.unit==="apc"?300:290;
    lawShot(c,c.x,c.y,live.x,live.y,rng,dmg,minS,0.18,dt);
  }
  for(const h of helis){
    if(!canUnitSee(h.x,h.y,h)) continue;
    lawShot(h,h.x,h.y,live.x,live.y,430,8,3,0.12,dt);
  }
}

function copInteractions(dt){
  const tgt=wantedTarget();
  let busting=false;
  for(const c of cops){
    const dx=tgt.x-c.x, dy=tgt.y-c.y, d=Math.hypot(dx,dy), R=tgt.r+c.R;
    if(d<R && d>0.001){
      const nx=dx/d, ny=dy/d, pen=R-d;
      if(mode==="car"){
        car.x+=nx*pen*0.6; car.y+=ny*pen*0.6; c.x-=nx*pen*0.4; c.y-=ny*pen*0.4;
        const cvi=c.vx*nx+c.vy*ny, pvi=car.vx*nx+car.vy*ny;
        car.vx+=(cvi-pvi)*nx*0.5; car.vy+=(cvi-pvi)*ny*0.5;
        c.vx+=(pvi-cvi)*nx*0.5; c.vy+=(pvi-cvi)*ny*0.5;
      } else if(tgt.arrestable){ ped.x+=nx*pen; ped.y+=ny*pen; busting=true; }
    } else if(tgt.arrestable && mode==="foot" && d<R+18){ busting=true; }
  }
  for(const fc of footcops){
    const d=Math.hypot(tgt.x-fc.x,tgt.y-fc.y);
    if(tgt.arrestable && d<fc.r+14) busting=true;
  }
  if(busting){ bustTimer+=dt; if(bustTimer>1.15) busted(); }
  else bustTimer=Math.max(0,bustTimer-dt*2.2);
}

function busted(){ playerDeath("busted"); }

function spawnFootCop(x,y,type){
  type=type||"police";
  const base={x,y,a:rng()*6.283,r:8.5,speed:rand(84,112),fireCd:rand(0.3,0.9),type,
    skin:pick(SKIN),hair:pick(HAIR),hairStyle:"short",pantsId:"jeans_dark"};
  if(type==="swat"){
    Object.assign(base,{hp:44,speed:rand(92,118),shirt:"#2a3540",pants:"#151c28",shirtId:"grey",
      body:"hardy",build:"hardy",hat:"helmet",hatColor:"#2a3340",dmg:9,range:340});
  } else if(type==="soldier"){
    Object.assign(base,{hp:36,speed:rand(88,104),shirt:"#4a5a38",pants:"#3a4530",shirtId:"brown",
      body:"hardy",build:"hardy",hat:"helmet",hatColor:"#4a5538",dmg:11,range:360});
  } else {
    Object.assign(base,{hp:22,shirt:"#26324c",pants:"#1a2430",shirtId:"blue",
      body:"male",hat:"cap",hatColor:"#1a2236",dmg:6,range:320});
  }
  footcops.push(base);
}

function killFootCop(fc){ const i=footcops.indexOf(fc); if(i>=0) footcops.splice(i,1); spawnBlood(fc.x,fc.y,0,0,1); addHeat(0.35); }
function killCop(c){ const i=cops.indexOf(c); if(i>=0) cops.splice(i,1); spawnBlood(c.x,c.y,0,0,0.8); addHeat(0.45); respawnCd=Math.min(respawnCd,1.2); }
function killHeli(h){ const i=helis.indexOf(h); if(i>=0) helis.splice(i,1); spawnBlood(h.x,h.y,0,0,1); addHeat(0.55); respawnCd=Math.min(respawnCd,1.5); }

function updateFootCops(dt){
  if(stars===0){ footcops.length=0; return; }
  const t=targetCounts(), tgt=wantedTarget();
  for(const c of cops){
    if(c.deployed>=2) continue;
    const near=Math.hypot(tgt.x-c.x,tgt.y-c.y)<260;
    if(c.unit==="swat" && stars>=3 && near && countFoot("swat")<2 && footcops.length<t.footMax){
      spawnFootCop(c.x-Math.sin(c.a)*20,c.y+Math.cos(c.a)*20,"swat"); c.deployed++; continue;
    }
    if(c.unit==="apc" && stars>=5 && near && countFoot("soldier")<4 && footcops.length<t.footMax){
      spawnFootCop(c.x-Math.sin(c.a)*24,c.y+Math.cos(c.a)*24,"soldier"); c.deployed++; continue;
    }
    if((!c.unit||c.unit==="patrol") && c.kind!=="moto" && stars>=2 && near && countFoot("police")<Math.min(2,stars) && footcops.length<t.footMax){
      spawnFootCop(c.x-Math.sin(c.a)*18,c.y+Math.cos(c.a)*18,"police"); c.deployed++;
    }
  }
  for(let i=footcops.length-1;i>=0;i--){
    const fc=footcops[i], ox=fc.x, oy=fc.y;
    const sees=canUnitSee(fc.x,fc.y,fc);
    const live=actualPlayerPos();
    let tx, ty;
    if(sees&&live){ tx=live.x; ty=live.y; }
    else {
      const seed=(fc.x*0.03+fc.y*0.02)%6.283;
      const p=searchPatrolPoint(seed,searchRadius()*0.75);
      tx=p.x; ty=p.y;
    }
    const dx=tx-fc.x, dy=ty-fc.y, d=Math.hypot(dx,dy)||1;
    fc.a=Math.atan2(dy,dx);
    const keep=sees?(d>155?1:(d<88?-0.55:0)):(d>55?1:(d<22?-0.35:0.2));
    const nx=fc.x+dx/d*fc.speed*keep*dt, ny=fc.y+dy/d*fc.speed*keep*dt;
    if(!inWater(nx,ny)){ fc.x=nx; fc.y=ny; }
    const ci=Math.floor((fc.x-ROAD)/GAP), cj=Math.floor((fc.y-ROAD)/GAP);
    for(let a=ci-1;a<=ci+1;a++) for(let b=cj-1;b<=cj+1;b++){ const L=getLot(a,b); for(const bd of L.buildings){
      const qx=clamp(fc.x,bd.x,bd.x+bd.w), qy=clamp(fc.y,bd.y,bd.y+bd.h), ex=fc.x-qx, ey=fc.y-qy, dd=Math.hypot(ex,ey);
      if(dd<fc.r && dd>0.001){ fc.x+=ex/dd*(fc.r-dd); fc.y+=ey/dd*(fc.r-dd); } } }
    if(sees&&live) lawShot(fc,fc.x,fc.y,live.x,live.y,fc.range||320,fc.dmg||6,2,0.14,dt);
    if(fc.hp<=0 || stars===0 || Math.hypot(fc.x-focusX,fc.y-focusY)>2800) footcops.splice(i,1);
  }
}

function updateHelis(dt){
  for(let i=helis.length-1;i>=0;i--){
    const h=helis[i];
    updateHeli(h,dt);
    if(h.hp<=0) helis.splice(i,1);
  }
}

function tierMessage(){
  if(stars>=5 && prevStars<5) showBigMsg("WOJSKO");
  else if(stars>=4 && prevStars<4) showBigMsg("HELICOPTER SWAT");
  else if(stars>=3 && prevStars<3) showBigMsg("SWAT");
  else if(prevStars===0 && stars>0) showBigMsg("POSZUKIWANY");
}

let blockCd=0;
function updateRoadblocks(dt){
  if(stars<4||!playerSpotted){ blockCd-=dt; return; }
  blockCd-=dt;
  if(blockCd>0||cops.length>10) return;
  const p=actualPlayerPos();
  if(!p) return;
  const spd=mode==="car"?Math.hypot(car.vx||0,car.vy||0):Math.hypot(ped.vx||0,ped.vy||0);
  if(spd<50) return;
  const ang=mode==="car"?car.a:(ped.vx||ped.vy?Math.atan2(ped.vy,ped.vx):0);
  const bx=p.x+Math.cos(ang)*340, by=p.y+Math.sin(ang)*340;
  if(inWater(bx,by)||inBuilding(bx,by,22)) return;
  const c=spawnCop("patrol");
  c.x=bx; c.y=by; c.a=ang+Math.PI/2; c.vx=0; c.vy=0; c._block=true;
  cops.push(c);
  blockCd=11;
}

function updateWanted(dt){
  gunfireCd=Math.max(0,gunfireCd-dt);
  dispatchBoost=Math.max(0,dispatchBoost-dt*0.45);
  stars=clamp(Math.floor(heat),0,5);
  updateSightAndEscape(dt);
  stars=clamp(Math.floor(heat),0,5);
  tierMessage();
  prevStars=stars;
  manageResponse(dt);
  updateRoadblocks(dt);
  for(const c of cops) updateCop(c,dt);
  updateHelis(dt);
  updateFootCops(dt);
  updateLawFire(dt);
  copInteractions(dt);
}

let bigTimer=0;
function showBigMsg(t){ const el=document.getElementById("bigmsg"); el.textContent=t; el.style.opacity="1"; clearTimeout(bigTimer); bigTimer=setTimeout(()=>el.style.opacity="0",1800); }

function drawCop(c){
  if(c.kind==="moto"||c.kind==="bike") drawBike(c); else drawVehicle(c, c.color);
  if(c.kind==="moto"){
    ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.a);
    const on=c.flash<1;
    ctx.fillStyle="#1a2030"; ctx.fillRect(-c.L*0.48,-4,5,3.2);
    ctx.fillStyle=on?"#ff3b3b":"#3b6bff"; ctx.fillRect(-c.L*0.47,-3.6,2.2,2.4);
    ctx.fillStyle=on?"#3b6bff":"#ff3b3b"; ctx.fillRect(-c.L*0.47,-0.8,2.2,2.4);
    ctx.restore();
  }
}

function drawHeli(h){
  const rt=performance.now()/35, tr=performance.now()/22;
  ctx.fillStyle="rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(h.x+8,h.y+18,42,14,0,0,7); ctx.fill();
  ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(h.a);
  ctx.fillStyle="#2a3548"; ctx.fillRect(-34,-8,68,16);
  ctx.fillStyle="#3a4658"; ctx.fillRect(28,-6,14,12);
  ctx.fillStyle="#1e2838"; ctx.fillRect(-38,-5,8,10);
  ctx.fillStyle="#3a4658"; ctx.fillRect(-12,-30,24,24);
  ctx.fillStyle="#c0392b"; ctx.fillRect(-16,-5,32,10);
  ctx.fillStyle="#e8ecf2"; ctx.font="bold 6px monospace"; ctx.textAlign="center";
  ctx.fillText("POLICJA",0,-1);
  ctx.strokeStyle="#1a2030"; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.moveTo(-18,8); ctx.lineTo(-24,16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18,8); ctx.lineTo(24,16); ctx.stroke();
  ctx.strokeStyle="rgba(230,240,255,.55)"; ctx.lineWidth=2.4;
  ctx.beginPath(); ctx.moveTo(Math.cos(rt)*44,Math.sin(rt)*44); ctx.lineTo(-Math.cos(rt)*44,-Math.sin(rt)*44); ctx.stroke();
  ctx.strokeStyle="rgba(200,210,220,.45)"; ctx.lineWidth=1.4;
  const tx=34+Math.cos(tr)*8, ty=Math.sin(tr)*8;
  ctx.beginPath(); ctx.moveTo(34,0); ctx.lineTo(tx,ty); ctx.stroke();
  if(h.flash<1){
    ctx.fillStyle="rgba(255,60,60,0.75)"; ctx.beginPath(); ctx.arc(-10,-28,2.2,0,7); ctx.fill();
    ctx.fillStyle="rgba(70,110,255,0.75)"; ctx.beginPath(); ctx.arc(10,-28,2.2,0,7); ctx.fill();
  }
  ctx.restore();
  if(gameHour<6.2||gameHour>19.3) return;
  const g=ctx.createRadialGradient(h.x,h.y,0,h.x,h.y+40,130);
  g.addColorStop(0,"rgba(255,240,180,.09)"); g.addColorStop(1,"rgba(255,240,180,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(h.x-60,h.y+100); ctx.lineTo(h.x+60,h.y+100); ctx.closePath(); ctx.fill();
}

function drawFootCopGear(fc){
  ctx.save(); ctx.translate(fc.x,fc.y);
  if(fc.type==="police"){
    ctx.fillStyle=fc.hatColor||"#1a2236";
    ctx.fillRect(-5.5,-14.5,11,3.2);
    ctx.fillStyle="#d4af37";
    ctx.beginPath(); ctx.arc(3.5,-10,1.6,0,7); ctx.fill();
  } else if(fc.type==="swat"||fc.type==="soldier"){
    ctx.fillStyle=fc.hatColor||"#2a3340";
    ctx.beginPath(); ctx.arc(0,-11.5,6,Math.PI,0); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.fillRect(-6,-11.5,12,2);
    if(fc.type==="swat"){
      ctx.fillStyle="#c0392b"; ctx.font="bold 4px monospace"; ctx.textAlign="center";
      ctx.fillText("S",0,-9);
    }
  }
  ctx.restore();
}

function drawFootCops(ox,oy){
  for(const fc of footcops){
    if(fc.x<ox-30||fc.x>ox+VW+30||fc.y<oy-30||fc.y>oy+VH+30) continue;
    drawPerson(fc, fc.shirt, false);
    drawFootCopGear(fc);
  }
}

function sirenGlow(c,N){
  const on=c.flash<1, col=on?"255,60,60":"70,110,255", a=0.5*Math.max(N,0.35);
  const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,46);
  g.addColorStop(0,`rgba(${col},${a})`); g.addColorStop(1,`rgba(${col},0)`);
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(c.x,c.y,46,0,7); ctx.fill();
}

let lastStars=-1;
function drawStars(){
  const el=document.getElementById("wanted");
  if(stars===0){
    if(lastStars!==0){ el.innerHTML=""; el.style.opacity="0"; lastStars=0; }
    return;
  }
  lastStars=stars;
  let s=""; for(let i=0;i<5;i++) s+=`<span class="${i<stars?'on':''}">★</span>`;
  const escNeed=ESCAPE_SEC[Math.min(5,stars)]||7;
  const pct=clamp(escapeProg/escNeed,0,1);
  const status=playerSpotted?"WIDZĄ CIĘ":(wantedPhase==="search"?"UKRYJ SIĘ":"POŚCIG");
  const barCls=playerSpotted?"spotted":"hiding";
  s+=`<div class="wanted-status ${barCls}">${status}</div>`;
  if(!playerSpotted){
    s+=`<div class="escape-bar"><i style="width:${(pct*100).toFixed(1)}%"></i></div>`;
  }
  el.innerHTML=s;
  el.style.opacity="1";
}

function drawLawSearchZone(ox,oy){
  if(stars<=0||wantedPhase!=="search"||!lkValid) return;
  const rad=searchRadius();
  const pulse=0.55+0.12*Math.sin(performance.now()*0.004);
  const sx=lkX-ox, sy=lkY-oy;
  if(sx<-rad-80||sx>VW+rad+80||sy<-rad-80||sy>VH+rad+80) return;
  ctx.save();
  ctx.strokeStyle=`rgba(255,80,60,${(0.22*pulse).toFixed(3)})`;
  ctx.lineWidth=2.5;
  ctx.setLineDash([14,10]);
  ctx.beginPath(); ctx.arc(sx,sy,rad,0,7); ctx.stroke();
  ctx.setLineDash([]);
  const g=ctx.createRadialGradient(sx,sy,0,sx,sy,rad);
  g.addColorStop(0,"rgba(255,90,70,0.07)"); g.addColorStop(1,"rgba(255,90,70,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,rad,0,7); ctx.fill();
  ctx.fillStyle="rgba(255,210,80,0.85)";
  ctx.beginPath(); ctx.arc(sx,sy,5,0,7); ctx.fill();
  ctx.restore();
}

if(typeof Game!=="undefined") Game.register({ id:"law-search-zone", drawWorldOverlay:drawLawSearchZone });
