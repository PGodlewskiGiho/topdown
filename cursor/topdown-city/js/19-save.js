/* TOPDOWN CITY — 19-save.js */
/* ---------- save / load (graceful: no-ops if storage blocked) ---------- */
const SAVE_KEY="topdown_city_save_v2";
let stats={missionsDone:0};
let saveTimer=4, saveFlash=0;
const statsEl=document.getElementById("stats");
function saveGame(){
  try{
    const carSave={carName:car.carName};
    for(const k of CAR_VIS_KEYS) carSave[k]=car[k];
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money, missionsDone:stats.missionsDone,
      car:carSave,
      owned, ammo: ammo.map(a=>a===Infinity?-1:a), curWeapon
    }));
    saveFlash=1.3;
  }catch(e){ /* storage unavailable (e.g. preview iframe) — ignore */ }
}
function hasSaveGame(){
  try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; }
}
function resetNewGameState(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  money=0; stats.missionsDone=0; health=100; heat=0;stars=0; bustTimer=0; prevStars=0;
  mission=null; pickup=null; saveTimer=4;
  const m=CARS[0];
  car.carName=m.name; car.brand=m.brand; car.model=m; car.type=m.type; car.era=m.era;
  car.accent=m.accent; car.color=m.colors?m.colors[0]:m.color; car.power=m.power; car.topSpeed=m.topSpeed;
  car.W=m.W; car.L=m.L; car.hp=car.maxHp=280; car.dead=false; car.vx=car.vy=0; car.a=0; car.parts=null;
  car.R=vehicleHitRadius(car.W, car.L, "car");
  for(let i=0;i<owned.length;i++){ owned[i]=i===0; ammo[i]=WEAPONS[i].kind==="melee"?Infinity:0; }
  curWeapon=0; rebuildGauge();
}
function teleportPlayer(x,y){
  car.x=x; car.y=y; car.vx=car.vy=0; car.a=0;
  ped.x=x; ped.y=y; ped.vx=ped.vy=0;
  mode="car"; focusX=x; focusY=y; cam.x=x; cam.y=y;
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY); if(!raw) return;
    const d=JSON.parse(raw);
    if(typeof d.money==="number") money=d.money;
    if(typeof d.missionsDone==="number") stats.missionsDone=d.missionsDone;
    if(d.car){
      car.carName=d.car.carName||"E30";
      for(const k of CAR_VIS_KEYS) if(d.car[k]!==undefined) car[k]=d.car[k];
      if(!car.type) car.type="sedan";
      if(!car.era) car.era="classic";
      car.parts=null;
      car.R=vehicleHitRadius(car.W||36,car.L||80,car.kind||"car");
      rebuildGauge();
    }
    if(Array.isArray(d.owned)) for(let i=0;i<owned.length&&i<d.owned.length;i++) owned[i]=!!d.owned[i];
    if(Array.isArray(d.ammo)) for(let i=0;i<ammo.length&&i<d.ammo.length;i++) ammo[i]=d.ammo[i]<0?Infinity:d.ammo[i];
    owned[0]=true; if(typeof d.curWeapon==="number"&&owned[d.curWeapon]) curWeapon=d.curWeapon;
  }catch(e){ /* ignore corrupt/blocked */ }
}
function tickSave(dt){
  saveTimer-=dt; if(saveTimer<=0){ saveGame(); saveTimer=4; }
  if(saveFlash>0){ saveFlash-=dt; statsEl.textContent="✓ zapisano"; statsEl.style.color="#7fe0a8"; }
  else { statsEl.textContent="ukończone misje: "+stats.missionsDone; statsEl.style.color="#9aa1ad"; }
}

