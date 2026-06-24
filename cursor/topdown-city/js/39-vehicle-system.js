/* TOPDOWN CITY — 39-vehicle-system.js */
/* Tuning podzespołów + rozbudowany system części nadwozia */

const CAR_PART_DEFS={
  hood:       {label:"Maska",         zone:"front", hp:82,  debris:"hood",     w:22,h:10},
  bumpFront:  {label:"Zderzak przedni",zone:"front",hp:58,  debris:"bumper",   w:20,h:5},
  bumpRear:   {label:"Zderzak tylny", zone:"rear",  hp:52,  debris:"bumper",   w:20,h:5},
  fenderFL:   {label:"Błotnik LP",    zone:"front", hp:64,  debris:"fender",   w:12,h:8},
  fenderFR:   {label:"Błotnik PP",    zone:"front", hp:64,  debris:"fender",   w:12,h:8},
  trunk:      {label:"Bagażnik",      zone:"rear",  hp:72,  debris:"panel",    w:18,h:9},
  doorFL:     {label:"Drzwi LP",      zone:"left",  hp:74,  debris:"door",     w:16,h:8},
  doorFR:     {label:"Drzwi PP",      zone:"right", hp:74,  debris:"door",     w:16,h:8},
  doorRL:     {label:"Drzwi LT",      zone:"left",  hp:68,  debris:"door",     w:16,h:8},
  doorRR:     {label:"Drzwi PT",      zone:"right", hp:68,  debris:"door",     w:16,h:8},
  mirrorL:    {label:"Lusterko L",    zone:"left",  hp:22,  debris:"mirror",   w:6,h:5},
  mirrorR:    {label:"Lusterko P",    zone:"right", hp:22,  debris:"mirror",   w:6,h:5},
  headlightL: {label:"Reflektor L",   zone:"front", hp:28,  debris:"light",    w:7,h:5},
  headlightR: {label:"Reflektor P",   zone:"front", hp:28,  debris:"light",    w:7,h:5},
  taillightL: {label:"Lampy tylne L", zone:"rear",  hp:26,  debris:"light",    w:7,h:4},
  taillightR: {label:"Lampy tylne P", zone:"rear",  hp:26,  debris:"light",    w:7,h:4},
  windshield: {label:"Szyba przednia",zone:"front", hp:48,  debris:"glass",    w:10,h:6, glass:true},
  rearGlass:  {label:"Szyba tylna",   zone:"rear",  hp:42,  debris:"glass",    w:10,h:6, glass:true},
  roof:       {label:"Dach",          zone:"front", hp:88,  debris:"panel",    w:16,h:8},
  wheelFL:    {label:"Koło LP",       zone:"left",  hp:95,  debris:"wheel",    w:10,h:14, wheel:true},
  wheelFR:    {label:"Koło PP",       zone:"right", hp:95,  debris:"wheel",    w:10,h:14, wheel:true},
  wheelRL:    {label:"Koło LT",       zone:"left",  hp:90,  debris:"wheel",    w:10,h:14, wheel:true},
  wheelRR:    {label:"Koło PT",       zone:"right", hp:90,  debris:"wheel",    w:10,h:14, wheel:true},
};

const TUNING_SLOTS={
  engine:      {label:"Silnik",      max:3, prices:[0,4200,9800],   acc:[1,1.08,1.16], power:[1,1.06,1.14], top:[0,8,18]},
  turbo:       {label:"Turbo",       max:2, prices:[0,6500],        acc:[1,1.12], power:[1,1.18], top:[0,12]},
  tires:       {label:"Opony",       max:3, prices:[0,2800,7200],   grip:[1,1.08,1.15], drift:[1,1.05,0.92]},
  suspension:  {label:"Zawieszenie", max:3, prices:[0,3100,6800],   turn:[1,1.06,1.12], grip:[1,1.04,1.08]},
  brakes:      {label:"Hamulce",     max:3, prices:[0,2400,5600],   brake:[1,1.12,1.22]},
  diff:        {label:"Most",        max:3, prices:[0,3800,8400],   drift:[1,1.14,1.28], grip:[1,0.98,0.94]},
  exhaust:     {label:"Wydech",      max:2, prices:[0,1900],        power:[1,1.05], drag:[1,0.96]},
  weight:      {label:"Waga",        max:3, prices:[0,4500,11000], turn:[1,1.04,1.08], acc:[1,1.03,1.06], grip:[1,1.02,1.04]},
};

const PART_LOCAL={
  hood:{lx:0,ly:-0.42}, bumpFront:{lx:0,ly:-0.48}, bumpRear:{lx:0,ly:0.46},
  fenderFL:{lx:-0.42,ly:-0.28}, fenderFR:{lx:0.42,ly:-0.28},
  trunk:{lx:0,ly:0.38}, doorFL:{lx:-0.38,ly:-0.08}, doorFR:{lx:0.38,ly:-0.08},
  doorRL:{lx:-0.38,ly:0.22}, doorRR:{lx:0.38,ly:0.22},
  mirrorL:{lx:-0.48,ly:-0.22}, mirrorR:{lx:0.48,ly:-0.22},
  headlightL:{lx:-0.32,ly:-0.44}, headlightR:{lx:0.32,ly:-0.44},
  taillightL:{lx:-0.30,ly:0.44}, taillightR:{lx:0.30,ly:0.44},
  windshield:{lx:0,ly:-0.18}, rearGlass:{lx:0,ly:0.12}, roof:{lx:0,ly:-0.02},
  wheelFL:{lx:-0.44,ly:-0.30}, wheelFR:{lx:0.44,ly:-0.30},
  wheelRL:{lx:-0.44,ly:0.26}, wheelRR:{lx:0.44,ly:0.26},
};

let tuningOpen=false, tuningSlotIdx=0, uHeld=false;

function defaultCarTuning(){
  return {engine:0,turbo:0,tires:0,suspension:0,brakes:0,diff:0,exhaust:0,weight:0};
}

function ensureCarTuning(v){
  if(!v) return defaultCarTuning();
  if(!v.tuning) v.tuning=defaultCarTuning();
  return v.tuning;
}

function initVehicleParts(v){
  if(!v||v.kind!=="car") return;
  if(v.parts&&v.parts._v===2) return;
  const p={_v:2};
  for(const id of Object.keys(CAR_PART_DEFS)){
    const d=CAR_PART_DEFS[id];
    p[id]={hp:d.hp, maxHp:d.hp, wear:0, off:false};
  }
  if(v.parts){
    const o=v.parts;
    if(o.hoodOff) p.hood.off=true;
    if(o.bumpFront) p.bumpFront.off=true;
    if(o.bumpRear) p.bumpRear.off=true;
    if(o.doorL){ p.doorFL.off=true; p.doorRL.off=true; }
    if(o.doorR){ p.doorFR.off=true; p.doorRR.off=true; }
    const map={front:"hood",rear:"trunk",left:"doorFL",right:"doorFR",hood:"hood",windows:"windshield"};
    for(const[k,wear]of Object.entries(o)){
      if(typeof wear!=="number"||!(k in map)&&!CAR_PART_DEFS[k]) continue;
      const pid=CAR_PART_DEFS[k]?k:map[k];
      if(pid&&p[pid]) p[pid].wear=clamp(wear,0,1);
    }
  }
  v.parts=p;
}

function partIntact(v,id){
  if(!v||!v.parts||!v.parts[id]) return true;
  return !v.parts[id].off;
}

function partWear(v,id){
  if(!v||!v.parts||!v.parts[id]) return 0;
  const pt=v.parts[id];
  if(pt.off) return 1;
  return clamp(pt.wear+(1-pt.hp/pt.maxHp)*0.35,0,1);
}

function pickPartFromHit(v,hx,hy){
  if(!v||v.kind!=="car") return null;
  initVehicleParts(v);
  const c=Math.cos(v.a||0), s=Math.sin(v.a||0);
  const dx=hx-v.x, dy=hy-v.y;
  const lx=dx*c+dy*s, ly=-dx*s+dy*c;
  const L=v.L||80, W=v.W||36;
  const nx=lx/(L*0.5), ny=ly/(W*0.5);
  let best=null, bd=1e18;
  for(const[id,loc]of Object.entries(PART_LOCAL)){
    if(!CAR_PART_DEFS[id]||v.parts[id].off) continue;
    const d=(nx-loc.lx)**2+(ny-loc.ly)**2;
    if(d<bd){ bd=d; best=id; }
  }
  return best;
}

function spawnPartDebris(v, partId, sev){
  if(typeof debris==="undefined"||sev<0.38) return;
  const def=CAR_PART_DEFS[partId];
  if(!def) return;
  const loc=PART_LOCAL[partId]||{lx:0,ly:0};
  const c=Math.cos(v.a||0), s=Math.sin(v.a||0);
  const L=v.L||80, W=v.W||36;
  const lx=loc.lx*L*0.5, ly=loc.ly*W*0.5;
  const wx=v.x+lx*c-ly*s, wy=v.y+lx*s+ly*c;
  const ang=(v.a||0)+(rng()-0.5)*2.8;
  const sp=rand(95,175+sev*260);
  debris.push({
    x:wx,y:wy,
    vx:Math.cos(ang)*sp+(v.vx||0)*0.4, vy:Math.sin(ang)*sp+(v.vy||0)*0.4,
    a:rng()*6.283, va:(rng()-0.5)*22, t:0,
    life:rand(3.2,6.8), kind:def.debris, partId,
    col:v.color||"#666", w:def.w, h:def.h,
  });
  if(typeof spawnSparks==="function") spawnSparks(wx,wy,4+(sev*9|0),v.vx||0,v.vy||0);
}

function detachVehiclePart(v, partId, sev){
  if(!v.parts||!v.parts[partId]||v.parts[partId].off) return;
  v.parts[partId].off=true;
  v.parts[partId].hp=0;
  spawnPartDebris(v, partId, sev||0.9);
  if(partId.startsWith("wheel")&&v===car){
    const gripLoss=0.12;
    if(!v._wheelGripLoss) v._wheelGripLoss=0;
    v._wheelGripLoss=Math.min(0.55, v._wheelGripLoss+gripLoss);
  }
  if((partId==="headlightL"||partId==="headlightR")&&v===car) v._lightsBroken=true;
}

function applyVehiclePartDamage(v, eff, hitX, hitY, hitType){
  if(!v||v.kind!=="car") return;
  initVehicleParts(v);
  const zone=damageZoneFromPoint(v,hitX,hitY);
  const primary=pickPartFromHit(v,hitX,hitY);
  const sev=clamp(eff/Math.max(50,v.maxHp||120),0.02,1.2);
  const scale=hitType==="explosion"?1.35:(hitType==="burn"?0.45:1);

  for(const[id,def]of Object.entries(CAR_PART_DEFS)){
    const pt=v.parts[id];
    if(pt.off) continue;
    let mul=0.18;
    if(def.zone===zone) mul=0.85;
    else if(zone&&def.zone==="front"&&zone==="left"&&id.includes("FL")) mul=0.55;
    else if(zone&&def.zone==="front"&&zone==="right"&&id.includes("FR")) mul=0.55;
    else if(zone&&def.zone==="rear"&&zone==="left"&&id.includes("RL")) mul=0.55;
    else if(zone&&def.zone==="rear"&&zone==="right"&&id.includes("RR")) mul=0.55;
    if(id===primary) mul*=1.65;
    if(def.glass&&hitType==="explosion") mul*=1.4;
    if(def.wheel&&hitType==="impact") mul*=1.25;
    const dmg=eff*mul*scale;
    pt.hp=Math.max(0, pt.hp-dmg);
    pt.wear=clamp(pt.wear+dmg/pt.maxHp*0.55,0,1.35);
    if(pt.hp<=0&&!pt.off) detachVehiclePart(v,id,sev);
    else if(pt.hp<pt.maxHp*0.18&&sev>0.62&&rng()<0.22*(1-pt.hp/pt.maxHp)) detachVehiclePart(v,id,sev);
  }
}

function countWheelsOff(v){
  if(!v.parts) return 0;
  return ["wheelFL","wheelFR","wheelRL","wheelRR"].filter(w=>v.parts[w]&&v.parts[w].off).length;
}

function getTuningHandling(v){
  const t=ensureCarTuning(v);
  const h={acc:1,power:1,top:0,turn:1,grip:1,drift:1,drag:1,brake:1};
  const slot=(name,key,arr)=>{ const lv=t[name]|0; if(arr&&arr[lv]!=null) h[key]*=arr[lv]; };
  slot("engine","acc",TUNING_SLOTS.engine.acc);
  slot("engine","power",TUNING_SLOTS.engine.power);
  slot("turbo","acc",TUNING_SLOTS.turbo.acc);
  slot("turbo","power",TUNING_SLOTS.turbo.power);
  slot("tires","grip",TUNING_SLOTS.tires.grip);
  slot("tires","drift",TUNING_SLOTS.tires.drift);
  slot("suspension","turn",TUNING_SLOTS.suspension.turn);
  slot("suspension","grip",TUNING_SLOTS.suspension.grip);
  slot("brakes","brake",TUNING_SLOTS.brakes.brake);
  slot("diff","drift",TUNING_SLOTS.diff.drift);
  slot("diff","grip",TUNING_SLOTS.diff.grip);
  slot("exhaust","power",TUNING_SLOTS.exhaust.power);
  slot("exhaust","drag",TUNING_SLOTS.exhaust.drag);
  slot("weight","turn",TUNING_SLOTS.weight.turn);
  slot("weight","acc",TUNING_SLOTS.weight.acc);
  slot("weight","grip",TUNING_SLOTS.weight.grip);
  if(t.engine) h.top+=(TUNING_SLOTS.engine.top[t.engine]|0);
  if(t.turbo) h.top+=(TUNING_SLOTS.turbo.top[t.turbo]|0);

  const wheelsOff=countWheelsOff(v);
  if(wheelsOff) h.grip*=Math.max(0.45,1-wheelsOff*0.14);
  if(v.parts){
    if(v.parts.hood&&v.parts.hood.off) h.drag*=1.04;
    if(v.parts.bumpFront&&v.parts.bumpFront.off) h.acc*=0.97;
  }
  if(v._wheelGripLoss) h.grip*=1-v._wheelGripLoss;
  return h;
}

function tuningSlotKeys(){ return Object.keys(TUNING_SLOTS); }

function tuningUpgradePrice(slot, level){
  const s=TUNING_SLOTS[slot];
  if(!s||level>=s.max) return null;
  return s.prices[level+1]||Math.round(1200*(level+1)*1.8);
}

function buyTuningUpgrade(slot){
  const t=ensureCarTuning(car);
  const s=TUNING_SLOTS[slot];
  if(!s) return;
  const next=(t[slot]|0)+1;
  if(next>s.max) return;
  const price=tuningUpgradePrice(slot,t[slot]|0);
  if(price==null||money<price){ showBigMsg("ZA MAŁO KASY"); return; }
  money-=price;
  t[slot]=next;
  showBigMsg(`${s.label} · poziom ${next}`);
  saveGame();
  renderTuningPanel();
}

function repairAllParts(){
  initVehicleParts(car);
  let cost=0;
  for(const[id,def]of Object.entries(CAR_PART_DEFS)){
    const pt=car.parts[id];
    if(pt.off||pt.hp<def.hp||pt.wear>0.05) cost+=Math.round((def.hp*0.08)+(pt.off?def.hp*0.35:0));
  }
  if(cost>0&&money<cost){ showBigMsg("ZA MAŁO KASY NA NAPRAWĘ"); return; }
  if(cost>0) money-=cost;
  for(const[id,def]of Object.entries(CAR_PART_DEFS)){
    const pt=car.parts[id];
    pt.hp=def.hp; pt.maxHp=def.hp; pt.wear=0; pt.off=false;
  }
  car._wheelGripLoss=0; car._lightsBroken=false;
  car.hp=car.maxHp=320;
  showBigMsg(cost?`NAPRAWIONO · $${cost}`:"AUTO JAK NOWE");
  saveGame();
  renderTuningPanel();
}

function toggleTuningShop(force){
  if(typeof gamePhase==="undefined"||gamePhase!=="playing") return;
  if(typeof invOpen!=="undefined"&&invOpen) return;
  if(force===false||(force===undefined&&tuningOpen)){ tuningOpen=false; document.getElementById("tuning-shop")?.classList.add("hidden"); return; }
  if(!nearTuningGarage()) return;
  tuningOpen=true;
  document.getElementById("tuning-shop")?.classList.remove("hidden");
  renderTuningPanel();
}

function nearTuningGarage(){
  if(!salon) return false;
  const p=mode==="car"?{x:car.x,y:car.y}:{x:ped.x,y:ped.y};
  if(Math.hypot(p.x-salon.cx,p.y-salon.cy)>220) return false;
  return true;
}

function renderTuningPanel(){
  const el=document.getElementById("tuning-shop-body");
  if(!el) return;
  ensureCarTuning(car);
  initVehicleParts(car);
  const slots=tuningSlotKeys();
  const slot=slots[tuningSlotIdx%slots.length];
  const s=TUNING_SLOTS[slot];
  const lv=car.tuning[slot]|0;
  const price=tuningUpgradePrice(slot,lv);
  let partsHtml="";
  for(const[id,def]of Object.entries(CAR_PART_DEFS)){
    const pt=car.parts[id];
    const st=pt.off?"odpadła":`${((pt.hp/pt.maxHp)*100|0)}%`;
    const cls=pt.off?"t-part-off":(pt.hp<def.hp*0.35?"t-part-warn":"");
    partsHtml+=`<div class="t-part ${cls}"><span>${def.label}</span><b>${st}</b></div>`;
  }
  el.innerHTML=
    `<div class="tuning-head"><span>TUNING · ${car.brand||""} ${car.carName||""}</span><span class="tuning-money">$${money|0}</span></div>`+
    `<div class="tuning-slot-nav"><button type="button" id="tuning-prev">‹</button><span>${s.label} · ${lv}/${s.max}</span><button type="button" id="tuning-next">›</button></div>`+
    `<div class="tuning-actions">`+
      `<button type="button" id="tuning-buy">${price!=null?`Ulepsz · $${price}`:"MAX"}</button>`+
      `<button type="button" id="tuning-repair">Naprawa części</button>`+
    `</div>`+
    `<div class="tuning-parts-title">Stan nadwozia</div>`+
    `<div class="tuning-parts">${partsHtml}</div>`+
    `<p class="tuning-hint">Q/E slot · U zamknij · w salonie</p>`;
  document.getElementById("tuning-prev")?.addEventListener("click", ()=>{ tuningSlotIdx=(tuningSlotIdx+slots.length-1)%slots.length; renderTuningPanel(); });
  document.getElementById("tuning-next")?.addEventListener("click", ()=>{ tuningSlotIdx=(tuningSlotIdx+1)%slots.length; renderTuningPanel(); });
  document.getElementById("tuning-buy")?.addEventListener("click", ()=>buyTuningUpgrade(slot));
  document.getElementById("tuning-repair")?.addEventListener("click", repairAllParts);
}

function updateTuningShop(){
  if(tuningOpen&&!nearTuningGarage()) toggleTuningShop(false);
  const promptEl=document.getElementById("prompt");
  if(promptEl&&nearTuningGarage()&&!tuningOpen&&typeof nearPad!=="undefined"&&!nearPad){
    promptEl.style.opacity="1";
    promptEl.textContent="U — tuning i naprawa (salon)";
  }
}

function initTuningKeys(){
  window.addEventListener("keydown", e=>{
    if(e.key.toLowerCase()==="u"&&typeof gamePhase!=="undefined"&&gamePhase==="playing"){
      if(!uHeld){ uHeld=true; toggleTuningShop(); }
      e.preventDefault();
    }
    if(tuningOpen){
      if(e.key.toLowerCase()==="q"){ tuningSlotIdx=(tuningSlotIdx+tuningSlotKeys().length-1)%tuningSlotKeys().length; renderTuningPanel(); }
      if(e.key.toLowerCase()==="e"){ tuningSlotIdx=(tuningSlotIdx+1)%tuningSlotKeys().length; renderTuningPanel(); }
    }
  });
  window.addEventListener("keyup", e=>{ if(e.key.toLowerCase()==="u") uHeld=false; });
}

initTuningKeys();

Game.register({
  id:"vehicle-system",
  order:39,
  update:updateTuningShop,
});
