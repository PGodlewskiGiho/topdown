/* TOPDOWN CITY — 02-player.js */
/* ---------- car ---------- */
const car = {
  x: GAP + ROAD/2,
  y: GAP + ROAD/2,
  a: 0,
  vx: 0, vy: 0,
  W: 36, L: 80, R: vehicleHitRadius(36,80,"car"),
  color: "#d9d4c8", power: 1.10,
  brand: "BMW", carName: "E30", topSpeed: 200, accent: "#1c3a8a", type: "sedan", era: "classic",
  kind: "car", rider: true, riderShirt: "#3a6ea5", riderSkin: "#e8b888", riderHelmet: false,
  hp: 420, maxHp: 420, dmgSeed: 11, dead: false
};
let focusX = car.x, focusY = car.y;   // generation/spawn anchor (the camera target)
const skid = [];             // {x,y,a}
const SKID_MAX = 620;

let mode = "car";            // "car" | "foot" | "boat"
let pboat = null;            // the boat the player is piloting
let fHeld = false;           // one-shot guard for enter/exit key
let hHeld = false;           // one-shot guard for horn key
let rHeld = false;           // one-shot guard for weather key
let gHeld = false;           // one-shot guard for reload key
let iHeld = false;           // one-shot guard for inventory key
let pHeld = false;           // one-shot guard for map key
let bHeld = false;           // one-shot guard for buy key
let cHeld = false;           // one-shot guard for colour-cycle key
const ped = { x:car.x, y:car.y, a:0, vx:0, vy:0, r:9, walk:96, run:178 };

/* physics constants (px, seconds) */
const ENGINE = 340, BRAKE = 780, REVERSE = 165;
const AIR = 0.48, AIR2 = 0.0016;
const ROLL = 52;
const TURN = 2.85;
const GRIP = 11.5, GRIP_HB = 2.35;
const VK = {
  car:  {acc:1.0,  turn:1.0, grip:1.0, cap:0},
  moto: {acc:1.55, turn:1.55, grip:0.88, cap:600},
  bike: {acc:0.85, turn:1.65, grip:1.05, cap:190},
};
const KMH = 0.34;
function pxToKmh(px){ return px*KMH; }
function kmhToPx(kmh){ return kmh/KMH; }
const CAR_TYPE_HANDLING={
  sedan:   {acc:1.00, turn:1.00, grip:1.00, drag:1.00, drift:1.02},
  coupe:   {acc:1.06, turn:1.12, grip:1.02, drag:0.96, drift:1.22},
  estate:  {acc:0.95, turn:0.90, grip:1.03, drag:1.03, drift:0.88},
  suv:     {acc:0.86, turn:0.76, grip:1.10, drag:1.10, drift:0.72},
  suvcoupe:{acc:0.88, turn:0.80, grip:1.07, drag:1.07, drift:0.78},
  supercar:{acc:1.14, turn:1.06, grip:1.14, drag:0.90, drift:0.95},
  wedge:   {acc:1.12, turn:1.08, grip:1.08, drag:0.88, drift:1.18},
};
function carModelRef(v){
  if(typeof CARS==="undefined"||!CARS.length) return null;
  const name=v&&v.carName;
  return CARS.find(m=>m.name===name)||CARS[0];
}
function normalizeCarPerformance(v){
  if(!v||v.kind!=="car") return;
  const ref=carModelRef(v);
  const ts=Number(v.topSpeed);
  const pw=Number(v.power);
  v.topSpeed=(ts>=80&&isFinite(ts))?ts:(ref?ref.topSpeed:200);
  v.power=(pw>=0.5&&isFinite(pw))?pw:(ref?ref.power:1.1);
  if(ref){
    if(!v.W||v.W<20) v.W=ref.W;
    if(!v.L||v.L<30) v.L=ref.L;
    if(!v.type) v.type=ref.type;
    if(!v.era) v.era=ref.era;
  }
  v.R=vehicleHitRadius(v.W||36,v.L||80,v.kind||"car");
}
function carSpeedCap(){
  normalizeCarPerformance(car);
  const vk=VK[car.kind]||VK.car;
  if(vk.cap) return vk.cap;
  return kmhToPx(car.topSpeed);
}
function carHandling(){
  const vk=VK[car.kind]||VK.car;
  const tm=CAR_TYPE_HANDLING[car.type]||CAR_TYPE_HANDLING.sedan;
  const base={acc:vk.acc*tm.acc, turn:vk.turn*tm.turn, grip:vk.grip*tm.grip, drag:tm.drag, drift:tm.drift||1, brake:1, power:1, top:0};
  if(typeof getTuningHandling==="function"){
    const t=getTuningHandling(car);
    base.acc*=t.acc; base.turn*=t.turn; base.grip*=t.grip; base.drag*=t.drag;
    base.drift=(tm.drift||1)*t.drift; base.brake*=t.brake; base.power*=t.power; base.top+=t.top|0;
  }
  return base;
}

/* ---------- input ---------- */
const keys = Object.create(null);
function setKey(e,down){
  const k = e.key.toLowerCase();
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  if(down && (k==="f"||k==="enter")){ if(!fHeld){ fHeld=true; toggleVehicle(); } }
  if(!down && (k==="f"||k==="enter")) fHeld=false;
  if(down && k==="r"){ if(!rHeld){ rHeld=true; cycleWeather(); } }
  if(!down && k==="r") rHeld=false;
  if(down && k==="g"){ if(!gHeld){ gHeld=true; if(typeof reloadEquippedWeapon==="function") reloadEquippedWeapon(); } }
  if(!down && k==="g") gHeld=false;
  if(down && (k==="i"||k==="tab")){ if(!iHeld){ iHeld=true; if(typeof toggleInventory==="function") toggleInventory(); } e.preventDefault(); }
  if(!down && (k==="i"||k==="tab")) iHeld=false;
  if(down && k==="p"){
    if(!pHeld){
      pHeld=true;
      if(typeof gamePhase!=="undefined"&&gamePhase==="playing"&&typeof openPauseTab==="function") openPauseTab("map");
      else if(typeof toggleBigMap==="function") toggleBigMap();
    }
    e.preventDefault();
  }
  if(!down && k==="p") pHeld=false;
  if(down && k==="escape"){
    if(typeof invOpen!=="undefined"&&invOpen&&typeof toggleInventory==="function"){ toggleInventory(); e.preventDefault(); return; }
    if(typeof tuningOpen!=="undefined"&&tuningOpen&&typeof toggleTuningShop==="function"){ toggleTuningShop(false); e.preventDefault(); return; }
    if(typeof pauseOpen!=="undefined"&&pauseOpen&&typeof togglePauseMenu==="function"){ togglePauseMenu(false); e.preventDefault(); return; }
    if(typeof bigMapOpen!=="undefined"&&bigMapOpen&&typeof toggleBigMap==="function"){ toggleBigMap(false); e.preventDefault(); return; }
    if(typeof gamePhase!=="undefined"&&gamePhase==="playing"&&typeof togglePauseMenu==="function"){ togglePauseMenu(true); e.preventDefault(); return; }
  }
  if(down && k==="b"){ if(!bHeld){ bHeld=true; tryBuy(); } }
  if(!down && k==="b") bHeld=false;
  if(down && k==="c"){ if(!cHeld){ cHeld=true; cyclePadColor(); } }
  if(!down && k==="c") cHeld=false;
  if(down && k==="m"){ if(!mHeld){ mHeld=true; toggleMute(); } }
  if(!down && k==="m") mHeld=false;
  if(down && k==="h"){ if(!hHeld){ hHeld=true; honk(); } }
  if(!down && k==="h") hHeld=false;
  if(typeof gamePhase!=="undefined" && gamePhase!=="playing") return;
  if(typeof pauseOpen!=="undefined"&&pauseOpen) return;
  if(typeof invOpen!=="undefined"&&invOpen){
    if(down && k==="escape") toggleInventory();
    return;
  }
  if(typeof bigMapOpen!=="undefined"&&bigMapOpen){
    if(down && k==="escape"){ toggleBigMap(false); e.preventDefault(); return; }
    if(down && k==="p"){ if(!pHeld){ pHeld=true; toggleBigMap(false); } e.preventDefault(); return; }
    if(!down && k==="p") pHeld=false;
    return;
  }
  if(down && ((k>="1"&&k<="9")||k==="0")){
    const idx = k==="0" ? 9 : (+k)-1;
    if(inGunShop) buyWeapon(idx);
    else if(typeof equipWeaponByIdx==="function") equipWeaponByIdx(idx);
    else if(owned[idx]) curWeapon=idx;
  }
  if(down && k==="q"){ if(typeof tuningOpen!=="undefined"&&tuningOpen) return; if(!qHeld){ qHeld=true; cycleWeapon(-1); } }  if(!down && k==="q") qHeld=false;
  if(down && k==="e"){ if(typeof tuningOpen!=="undefined"&&tuningOpen) return; if(!eHeld){ eHeld=true; cycleWeapon(1); } }   if(!down && k==="e") eHeld=false;
  keys[k]=down;
}
window.addEventListener("keydown", e=>setKey(e,true));
window.addEventListener("keyup",   e=>setKey(e,false));

function inBuilding(x,y,r){
  const ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(const b of L.buildings){
    const cx=Math.max(b.x,Math.min(x,b.x+b.w)), cy=Math.max(b.y,Math.min(y,b.y+b.h));
    if((x-cx)**2+(y-cy)**2 < r*r) return true;
  } }
  let hit=false;
  eachMegaNearCell(ci,cj,m=>{ if(hit) return; const b=m.building;
    const cx=Math.max(b.x,Math.min(x,b.x+b.w)), cy=Math.max(b.y,Math.min(y,b.y+b.h));
    if((x-cx)**2+(y-cy)**2 < r*r) hit=true;
  });
  if(hit) return true;
  return false;
}
function toggleVehicle(){
  if(mode==="inside"){
    if(toggleInteriorVehicle()) return;
    exitBuilding();
    return;
  }
  if(mode==="boat"){ exitBoat(); return; }
  if(mode==="car"){
    const bldIn=findEnterableBuilding(car.x, car.y, {withCar:true});
    if(bldIn){ enterBuilding(bldIn, {withCar:true}); return; }
    car.vx=0; car.vy=0;                                   // park on exit
    const c=Math.cos(car.a), s=Math.sin(car.a);
    const sides=[[-s,c],[s,-c],[c,s],[-c,-s]];            // left, right, front, back
    const off=car.W*0.5+ped.r+6;
    ped.x=car.x; ped.y=car.y;
    for(const [dx,dy] of sides){
      const px=car.x+dx*off, py=car.y+dy*off;
      if(!inBuilding(px,py,ped.r)){ ped.x=px; ped.y=py; break; }
    }
    ped.a=car.a; mode="foot";
  } else {
    const R=46;
    let target=null, jackpc=null, jacklot=null, bestD=Infinity, own=false;
    if(!car.dead){ const dOwn=Math.hypot(ped.x-car.x, ped.y-car.y); if(dOwn<R){ bestD=dOwn; own=true; } }
    for(const c of traffic){ if(c.state!=="drive"&&c.state!=="loose") continue; const d=Math.hypot(ped.x-c.x,ped.y-c.y); if(d<R && d<bestD){ bestD=d; target=c; own=false; } }
    const ci=Math.floor(ped.x/GAP), cj=Math.floor(ped.y/GAP);
    for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(const pc of L.parked){ const d=Math.hypot(ped.x-pc.x,ped.y-pc.y); if(d<R && d<bestD){ bestD=d; jackpc=pc; jacklot=L; target=null; own=false; } } }
    let boardBoat=null;
    for(const b of boats){ if(b.player) continue; const d=Math.hypot(ped.x-b.x,ped.y-b.y); if(d<R+(b.L?b.L*0.45:14) && d<bestD){ bestD=d; boardBoat=b; target=null; jackpc=null; own=false; } }
    if(boardBoat) enterBoat(boardBoat);
    else if(jackpc) jackParked(jackpc,jacklot);
    else if(target) jackCar(target);
    else if(own) mode="car";
    else {
      const shed=typeof nearestCanalShed==="function"?nearestCanalShed(ped.x,ped.y,34):null;
      if(shed){ enterCanalShed(shed); return; }
      const entry=typeof nearestCanalEntry==="function"?nearestCanalEntry(ped.x,ped.y,36):null;
      if(entry&&!inCanalWater(ped.x,ped.y)&&!inWater(ped.x,ped.y)){ descendCanalEntry(entry); return; }
      const bld=findEnterableBuilding(ped.x, ped.y); if(bld) enterBuilding(bld);
    }
  }
}
function jackCar(c){
  car.x=c.x; car.y=c.y; car.a=c.a; car.vx=c.vx||0; car.vy=c.vy||0;
  car.color=c.color; car.W=c.W; car.L=c.L; car.R=vehicleHitRadius(c.W,c.L,c.kind||"car"); car.kind="car";
  car.hp=c.hp||120; car.maxHp=c.maxHp||120; car.dmgSeed=c.dmgSeed||1; car.dead=false;
  car.parts=c.parts?JSON.parse(JSON.stringify(c.parts)):null;
  car.tuning=c.tuning?{...c.tuning}:null;
  if(c.model){
    const m=c.model;
    car.brand=m.brand; car.carName=m.name; car.type=m.type; car.era=m.era;
    car.accent=m.accent; car.power=m.power; car.topSpeed=m.topSpeed;
  } else {
    car.brand=c.brand||""; car.carName=c.carName||"Auto"; car.type=c.type||"sedan"; car.era=c.era||"modern";
    car.accent=c.accent||"#ff5b46"; car.power=1.2; car.topSpeed=200;
  }
  const driverLook=rollNpcAppearance(c.x,c.y,{});
  const driver={state:"walk", x:c.x-Math.sin(c.a)*22, y:c.y+Math.cos(c.a)*22, a:c.a+Math.PI/2,
                tx:0,ty:0, speed:rand(70,95), vx:0,vy:0, downT:0, repick:0, act:null, panic:0};
  applyNpcLook(driver, driverLook);
  if(peds.length<40) peds.push(driver); else Object.assign(peds[(Math.random()*peds.length)|0], driver);
  const i=traffic.indexOf(c); if(i>=0) traffic.splice(i,1);
  traffic.push(spawnTrafficCar());
  addHeat(0.4);
  if(typeof normalizeCarPerformance==="function") normalizeCarPerformance(car);
  rebuildGauge();
  mode="car";
}
function jackParked(pc, L){
  car.x=pc.x; car.y=pc.y; car.a=pc.a; car.vx=0; car.vy=0;
  car.color=pc.color; car.W=pc.W; car.L=pc.L; car.R=vehicleHitRadius(pc.W,pc.L,pc.kind||"car");
  car.kind=pc.kind||"car"; car.rider=true; car.riderShirt=ped.shirt||"#3a6ea5"; car.riderSkin=ped.skin||"#e8b888"; car.riderHair=ped.hair||null; car.riderHelmet=(car.kind==="moto");
  car.hp=pc.hp; car.maxHp=pc.maxHp; car.dmgSeed=pc.dmgSeed; car.dead=false;
  car.parts=pc.parts?JSON.parse(JSON.stringify(pc.parts)):null;
  car.tuning=pc.tuning?{...pc.tuning}:null;
  if(car.kind==="car"){
    if(pc.model){ const m=pc.model;
      car.brand=m.brand; car.carName=m.name; car.type=m.type; car.era=m.era; car.accent=m.accent; car.power=m.power; car.topSpeed=m.topSpeed;
    } else {
      car.brand=pc.brand||""; car.carName=pc.carName||"Auto"; car.type=pc.type||"sedan"; car.era=pc.era||"modern"; car.accent=pc.accent||"#ff5b46"; car.power=1.12; car.topSpeed=190;
    }
    rebuildGauge();
  }
  const k=L.parked.indexOf(pc); if(k>=0) L.parked.splice(k,1);
  addHeat(0.3); mode="car";
}

