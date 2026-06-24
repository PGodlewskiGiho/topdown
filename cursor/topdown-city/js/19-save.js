/* TOPDOWN CITY — 19-save.js */
/* ---------- save / load (graceful: no-ops if storage blocked) ---------- */
const SAVE_KEY="topdown_city_save_v6";
const SAVE_KEY_LEGACY="topdown_city_save_v5";
let stats={missionsDone:0, deaths:0};
let saveTimer=4, saveFlash=0;
const statsEl=document.getElementById("stats");
function serializeCarState(){
  const carSave={carName:car.carName, x:car.x, y:car.y, a:car.a, hp:car.hp, maxHp:car.maxHp, dmgSeed:car.dmgSeed};
  for(const k of CAR_VIS_KEYS) carSave[k]=car[k];
  if(car.parts&&car.parts._v===2){
    carSave.parts={_v:2};
    for(const id in car.parts){
      if(id==="_v") continue;
      const pt=car.parts[id];
      if(pt) carSave.parts[id]={hp:pt.hp,maxHp:pt.maxHp,wear:pt.wear,off:pt.off};
    }
  }
  if(car.tuning) carSave.tuning={...car.tuning};
  return carSave;
}
function saveGame(){
  try{
    const carSave=serializeCarState();
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money, missionsDone:stats.missionsDone, deaths:stats.deaths||0,
      worldSeed: typeof getWorldSeed==="function"?getWorldSeed():undefined,
      car:carSave,
      player: typeof characterFromPed==="function"?characterFromPed():null,
      inventory: typeof serializeInventory==="function"?serializeInventory():null,
      discovered: typeof serializeDiscovery==="function"?serializeDiscovery():null,
      navTarget: navTarget?{x:navTarget.x,y:navTarget.y}:null
    }));
    saveFlash=1.3;
  }catch(e){ /* storage unavailable (e.g. preview iframe) — ignore */ }
}
function hasSaveGame(){
  try{ return !!(localStorage.getItem(SAVE_KEY)||localStorage.getItem(SAVE_KEY_LEGACY)); }catch(e){ return false; }
}
function resetRunState(opts={}){
  const keepWorld=!!opts.keepWorld;
  if(!keepWorld){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
  if(typeof clearLivingWorld==="function") clearLivingWorld();
  money=0; stats.missionsDone=0; health=100; heat=0;stars=0; bustTimer=0; prevStars=0;
  mission=null; pickup=null; saveTimer=4;
  if(typeof clearNavTarget==="function") clearNavTarget();
  if(typeof deserializeDiscovery==="function") deserializeDiscovery(null);
  mode="car"; interior=null;
  if(typeof clearAllLaw==="function") clearAllLaw();
  const m=CARS[0];
  car.carName=m.name; car.brand=m.brand; car.model=m; car.type=m.type; car.era=m.era;
  car.accent=m.accent; car.color=m.colors?m.colors[0]:m.color; car.power=m.power; car.topSpeed=m.topSpeed;
  car.W=m.W; car.L=m.L; car.hp=car.maxHp=320; car.dead=false; car.vx=car.vy=0; car.a=0; car.parts=null;
  car.tuning=typeof defaultCarTuning==="function"?defaultCarTuning():null;
  car.R=vehicleHitRadius(car.W, car.L, "car");
  for(let i=0;i<owned.length;i++){ owned[i]=i===0; ammo[i]=WEAPONS[i].kind==="melee"?Infinity:0; }
  curWeapon=0;
  if(typeof initInventory==="function") initInventory();
  rebuildGauge();
}
function resetNewGameState(){ resetRunState({keepWorld:false}); }
function respawnPointNear(x,y){
  const prevFx=focusX, prevFy=focusY;
  focusX=x; focusY=y; cam.x=x; cam.y=y;
  const p=roadPoint();
  focusX=prevFx; focusY=prevFy;
  return p;
}
function teleportPlayer(x,y){
  car.x=x; car.y=y; car.vx=car.vy=0; car.a=0;
  ped.x=x; ped.y=y; ped.vx=ped.vy=0;
  mode="car"; focusX=x; focusY=y; cam.x=x; cam.y=y;
  if(typeof seedMapDiscovery==="function") seedMapDiscovery(x,y);
}
function loadGame(){
  try{
    let raw=localStorage.getItem(SAVE_KEY);
    if(!raw) raw=localStorage.getItem(SAVE_KEY_LEGACY);
    if(!raw) return;
    const d=JSON.parse(raw);
    if(typeof d.worldSeed==="number" && typeof applyWorldSeed==="function") applyWorldSeed(d.worldSeed, true);
    if(typeof d.money==="number") money=d.money;
    if(typeof d.missionsDone==="number") stats.missionsDone=d.missionsDone;
    if(typeof d.deaths==="number") stats.deaths=d.deaths;
    if(d.car){
      car.carName=d.car.carName||"E30";
      for(const k of CAR_VIS_KEYS) if(d.car[k]!==undefined) car[k]=d.car[k];
      if(typeof d.car.x==="number"&&typeof d.car.y==="number"){
        car.x=d.car.x; car.y=d.car.y;
        if(typeof d.car.a==="number") car.a=d.car.a;
      }
      if(!car.type) car.type="sedan";
      if(!car.era) car.era="classic";
      if(typeof d.car.hp==="number") car.hp=d.car.hp;
      if(typeof d.car.maxHp==="number") car.maxHp=d.car.maxHp;
      if(typeof d.car.dmgSeed==="number") car.dmgSeed=d.car.dmgSeed;
      if(d.car.parts&&d.car.parts._v===2) car.parts=d.car.parts;
      else car.parts=null;
      if(d.car.tuning) car.tuning={...defaultCarTuning(),...d.car.tuning};
      else if(typeof defaultCarTuning==="function") car.tuning=defaultCarTuning();
      car.R=vehicleHitRadius(car.W||36,car.L||80,car.kind||"car");
      rebuildGauge();
    }
    if(d.inventory && typeof deserializeInventory==="function") deserializeInventory(d.inventory);
    else if(typeof migrateLegacyWeaponsToInventory==="function") migrateLegacyWeaponsToInventory(d);
    else if(typeof initInventory==="function") initInventory();
    if(d.player && typeof applyCharacterToPed==="function"){
      Object.assign(playerCharacter, defaultCharacter(), d.player);
      applyCharacterToPed(playerCharacter);
    }
    if(typeof deserializeDiscovery==="function") deserializeDiscovery(d.discovered);
    else if(typeof seedMapDiscovery==="function") seedMapDiscovery(car.x,car.y);
    if(d.navTarget && typeof setNavTarget==="function") setNavTarget(d.navTarget.x,d.navTarget.y,true);
    else if(typeof clearNavTarget==="function") clearNavTarget();
  }catch(e){ /* ignore corrupt/blocked */ }
  if(typeof discovered!=="undefined" && discovered.size===0 && typeof seedMapDiscovery==="function") seedMapDiscovery(car.x,car.y);
}
function tickSave(dt){
  saveTimer-=dt; if(saveTimer<=0){ saveGame(); saveTimer=4; }
  if(saveFlash>0){ saveFlash-=dt; statsEl.textContent="✓ zapisano"; statsEl.style.color="#7fe0a8"; }
  else { statsEl.textContent="ukończone misje: "+stats.missionsDone+(stats.deaths?(" · śmierci: "+stats.deaths):""); statsEl.style.color="#9aa1ad"; }
}

