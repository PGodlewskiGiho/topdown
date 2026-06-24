/* TOPDOWN CITY — 15-combat.js */
/* ---------- combat (guns) ---------- */
let health=100;
const bullets=[], muzzles=[];
let firing=false, pointerActive=false, mx=0, my=0, playerFireCd=0;
const healthFill=document.getElementById("healthfill");
window.addEventListener("pointermove", e=>{ mx=e.clientX; my=e.clientY; pointerActive=true; });
window.addEventListener("pointerdown", e=>{ mx=e.clientX; my=e.clientY; pointerActive=true; if(typeof gamePhase!=="undefined"&&gamePhase==="playing"&&!(typeof invOpen!=="undefined"&&invOpen)) firing=true; });
window.addEventListener("pointerup",   ()=>{ firing=false; });
window.addEventListener("blur",         ()=>{ firing=false; });
function spawnBullet(x,y,ang,spd,owner,dmg,type){
  const b={x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:type==="rocket"?2.4:0.9,owner,dmg:dmg||10,type:type||"bullet"};
  bullets.push(b); return b;
}
function muzzle(x,y,a){ muzzles.push({x,y,a,life:0.06}); }

/* ---- weapons (GTA-SA-style arsenal) ---- */
const WEAPONS=[
  {name:"Pięści",        kind:"melee",   dmg:10, cd:0.32, range:30, price:0,     cap:Infinity},
  {name:"Pałka",         kind:"melee",   dmg:24, cd:0.40, range:34, price:150,   cap:Infinity},
  {name:"Pistolet",      kind:"bullet",  dmg:16, cd:0.30, spd:820,  spread:0.02, price:400,   cap:120},
  {name:"Uzi",           kind:"bullet",  dmg:9,  cd:0.08, spd:780,  spread:0.09, price:1200,  cap:250},
  {name:"Strzelba",      kind:"pellets", dmg:9,  cd:0.72, spd:680,  spread:0.34, pellets:7,   price:1600,  cap:60},
  {name:"Karabin",       kind:"bullet",  dmg:18, cd:0.11, spd:900,  spread:0.04, price:3200,  cap:200},
  {name:"Snajperka",     kind:"bullet",  dmg:90, cd:1.15, spd:1500, spread:0.0,  price:5500,  cap:40},
  {name:"Minigun",       kind:"bullet",  dmg:9,  cd:0.035,spd:920,  spread:0.11, price:12000, cap:500},
  {name:"Miotacz ognia", kind:"flame",   dmg:1.5,cd:0.03, spd:250,  spread:0.22, range:0.32,  price:8000,  cap:400},
  {name:"Wyrzutnia",     kind:"rocket",  dmg:140,cd:1.4,  spd:430,  spread:0.0,  price:16000, cap:10},
];
let curWeapon=0, qHeld=false, eHeld=false;
/* ---- weapon ownership (synced from inventory) ---- */
const owned = WEAPONS.map((w,i)=> i===0);
const ammo  = WEAPONS.map(w=> w.kind==="melee" ? Infinity : 0);
function ownedIndices(){ const o=[]; for(let i=0;i<WEAPONS.length;i++) if(owned[i]) o.push(i); return o; }
function pedHit(p,dmg,kx,ky,bloodAmt,noHeat){
  if(p.state==="down") return;
  if(p.armed) p.hostile=true;
  p._hp-=dmg;
  if(p._hp>0){ spawnBlood(p.x,p.y,kx,ky,0.25); return; }
  p.state="down"; p.vx=kx*0.5; p.vy=ky*0.5; p.downT=0;
  if(!noHeat) addHeat(p.armed?0.5:0.8);
  spawnBlood(p.x,p.y,kx,ky,bloodAmt);
  if(p.armed && p.weapon!=null) dropWeapon(p.x,p.y,p.weapon);
}
const drops=[];                                            // weapons dropped on the ground
function dropWeapon(x,y,wi){ drops.push({x,y,wi, ammo:Math.max(8,(WEAPONS[wi].cap*0.3)|0), t:0}); while(drops.length>40) drops.shift(); }
function updateDrops(dt){
  for(let i=drops.length-1;i>=0;i--){ const d=drops[i]; d.t+=dt;
    if(d.t>45){ drops.splice(i,1); continue; }
    if(mode==="foot" && Math.hypot(ped.x-d.x,ped.y-d.y)<18){ giveWeapon(d.wi,d.ammo); showBigMsg("ZDOBYTO: "+WEAPONS[d.wi].name); drops.splice(i,1); }
  }
}
function drawDrops(ox,oy){
  for(const d of drops){ if(d.x<ox-20||d.x>ox+VW+20||d.y<oy-20||d.y>oy+VH+20) continue;
    const bob=Math.sin(d.t*4)*2;
    ctx.fillStyle="rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(d.x,d.y+6,9,4,0,0,7); ctx.fill();
    ctx.save(); ctx.translate(d.x,d.y-2+bob);
    ctx.fillStyle="#23262e"; ctx.fillRect(-9,-3,18,6); ctx.fillStyle="#41454d"; ctx.fillRect(4,-4,6,3);
    ctx.fillStyle="#ffd23b"; ctx.fillRect(-1,-8,3,4); ctx.restore();
  }
}
let inGunShop=false;
function updateGunShop(){ inGunShop = mode==="foot" && gunshop && Math.abs(ped.x-gunshop.cx)<gunshop.w/2+6 && Math.abs(ped.y-gunshop.cy)<gunshop.h/2+6; }
function drawGunShop(){
  if(!gunshop) return;
  ctx.save();
  ctx.fillStyle="#2a2d34"; ctx.fillRect(gunshop.cx-46,gunshop.cy-20,92,40);
  ctx.fillStyle="#3a3e46"; ctx.fillRect(gunshop.cx-46,gunshop.cy-20,92,8);
  ctx.font="700 16px 'DM Mono', monospace"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
  ctx.fillStyle="#ffcf6a"; ctx.fillText("BROŃ", gunshop.cx, gunshop.cy-28);
  ctx.restore();
}
const gunshopEl=document.getElementById("gunshop");
function drawGunShopHUD(){
  if(!inGunShop){ gunshopEl.style.opacity="0"; return; }
  let rows="<b>SKLEP Z BRONIĄ</b><br>";
  for(let i=1;i<WEAPONS.length;i++){
    const w=WEAPONS[i], key=i<9?(i+1):0;
    const shop=typeof WEAPON_SHOP!=="undefined"?WEAPON_SHOP[i]:null;
    const def=shop&&typeof ITEM_DEFS!=="undefined"?ITEM_DEFS[shop.defId]:null;
    const has=typeof hasInvWeapon==="function"&&shop?hasInvWeapon(shop.defId):owned[i];
    let am="∞";
    if(w.kind!=="melee"&&def&&typeof countReserveAmmo==="function"){
      const eq=typeof getEquippedInvItem==="function"?getEquippedInvItem():null;
      const loaded=eq&&eq.defId===shop.defId?(eq.loaded||0):0;
      am=loaded+"+"+countReserveAmmo(def.ammoType);
    } else if(w.kind!=="melee") am=ammo[i];
    const price=shop?shop.price:w.price;
    const tag = !has ? ("$"+price) : (w.kind==="melee"?"✓":("dokup $"+Math.max(40,(price*0.3)|0)));
    const col = has ? "#7fe0a8" : (money>=price ? "#e9ecf1" : "#8a8f99");
    rows += '<span style="color:'+col+'">['+key+'] '+w.name+' — '+tag+(has&&w.kind!=="melee"?' ('+am+')':'')+'</span><br>';
  }
  gunshopEl.innerHTML=rows; gunshopEl.style.opacity="1";
}
const explosions=[], slashes=[];
const wrecks=[], scorches=[], blastQ=[];
function spawnScorch(x,y){ scorches.push({x,y,r:24+Math.random()*12}); while(scorches.length>50) scorches.shift(); }
function spawnWreck(v){
  wrecks.push({x:v.x,y:v.y,a:v.a,W:v.W,L:v.L,burnT:0,burnLife:8+rand(0,5),burnTick:0,burnR:Math.max(22,(v.L||80)*0.40),burnDps:18});
  while(wrecks.length>30) wrecks.shift();
  spawnScorch(v.x,v.y);
}
function carExplode(v){
  if(v.dead) return; v.dead=true; spawnWreck(v);
  if(v===car && mode==="car"){ mode="foot"; ped.x=car.x-Math.cos(car.a)*10; ped.y=car.y-Math.sin(car.a)*10; ped.a=car.a; showBigMsg("AUTO ZNISZCZONE"); }
  blastQ.push({x:v.x, y:v.y});          // queued -> drained iteratively (no recursive chain -> no stack overflow)
}
function drainBlasts(){ let g=0; while(blastQ.length && g++<3000){ const b=blastQ.shift(); explode(b.x,b.y); } if(blastQ.length) blastQ.length=0; }
function initVehicleDamageState(v){
  if(!v) return;
  if(!v.parts) v.parts={front:0,rear:0,left:0,right:0,hood:0,windows:0};
}
function damageZoneFromPoint(v,hx,hy){
  if(hx===undefined || hy===undefined) return null;
  const c=Math.cos(v.a||0), s=Math.sin(v.a||0);
  const dx=hx-v.x, dy=hy-v.y;
  const lx=dx*c+dy*s, ly=-dx*s+dy*c;
  const ax=Math.abs(lx), ay=Math.abs(ly);
  if(ax>ay*1.05) return lx>=0?"front":"rear";
  return ly>=0?"right":"left";
}
function applyPartDamage(v,zone,amt,type){
  initVehicleDamageState(v);
  const p=v.parts;
  const sev=clamp(amt/Math.max(60,v.maxHp||120), 0.01, 0.42);
  const add=(k,x)=>p[k]=clamp(p[k]+x,0,1.35);
  if(zone==="front"){ add("front",sev*1.25); add("hood",sev*1.1); if(type==="explosion") add("windows",sev*0.9); }
  else if(zone==="rear"){ add("rear",sev*1.2); if(type==="explosion") add("windows",sev*0.55); }
  else if(zone==="left"){ add("left",sev*1.15); if(type==="explosion") add("windows",sev*0.45); }
  else if(zone==="right"){ add("right",sev*1.15); if(type==="explosion") add("windows",sev*0.45); }
  else {
    add("front",sev*0.5); add("rear",sev*0.4); add("left",sev*0.45); add("right",sev*0.45);
    add("hood",sev*0.42); if(type==="explosion") add("windows",sev*0.65);
  }
  if(amt>22 || type==="explosion") add("windows",sev*0.28);
}
function damageCar(v, amt, hitX, hitY, hitType){
  if(!v || v.hp===undefined || v.dead) return;
  if(v.kind==="moto" && v.riderHelmet && amt>22) popHelmet(v);
  const durability=(v.kind==="car")?0.58:(v.kind==="moto"?0.78:0.85);
  const eff=amt*durability;
  const zone=damageZoneFromPoint(v,hitX,hitY);
  applyPartDamage(v,zone,eff,hitType||"impact");
  v.hp-=eff;
  if(v.hp<=0){ v.hp=0; carExplode(v); const i=traffic.indexOf(v); if(i>=0){ traffic.splice(i,1); traffic.push(spawnTrafficCar()); } }
}
function damageParkedNear(x,y,R,amt){ const ci=Math.floor(x/GAP),cj=Math.floor(y/GAP);
  for(let i=ci-1;i<=ci+1;i++)for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(let k=L.parked.length-1;k>=0;k--){ const pc=L.parked[k]; const d=Math.hypot(pc.x-x,pc.y-y); if(d<R){ damageCar(pc, amt*(1-d/R), x, y, "explosion"); if(pc.dead) L.parked.splice(k,1); } } } }
function updateParkedFx(dt){ const ci=Math.floor(focusX/GAP),cj=Math.floor(focusY/GAP);
  for(let i=ci-2;i<=ci+2;i++)for(let j=cj-2;j<=cj+2;j++){ const L=getLot(i,j); for(let k=L.parked.length-1;k>=0;k--){ const pc=L.parked[k]; if(pc.maxHp&&!pc.dead&&pc.hp>0&&pc.hp<pc.maxHp*0.08){ damageCar(pc,1.4*dt,pc.x,pc.y,"burn"); if(pc.dead) L.parked.splice(k,1); } } } }
function updateWreckFires(dt){
  for(let i=wrecks.length-1;i>=0;i--){
    const w=wrecks[i];
    w.burnT+=dt;
    if(w.burnT>=w.burnLife) continue;
    w.burnTick+=dt;
    if(w.burnTick<0.2) continue;
    const step=w.burnTick; w.burnTick=0;
    const alive=1-w.burnT/w.burnLife;
    const R=w.burnR*(0.75+0.25*alive), dps=w.burnDps*(0.45+0.55*alive);
    if(mode==="foot" && Math.hypot(ped.x-w.x,ped.y-w.y)<R) damage(dps*step*0.28);
    if(mode==="car" && !car.dead && Math.hypot(car.x-w.x,car.y-w.y)<R) damageCar(car,dps*step*0.9,w.x,w.y,"burn");
    for(const c of traffic){ if(c.dead) continue; if(Math.hypot(c.x-w.x,c.y-w.y)<R) damageCar(c,dps*step*0.9,w.x,w.y,"burn"); }
    const ci=Math.floor(w.x/GAP), cj=Math.floor(w.y/GAP);
    for(let a=ci-1;a<=ci+1;a++) for(let b=cj-1;b<=cj+1;b++){
      const L=getLot(a,b);
      for(let k=L.parked.length-1;k>=0;k--){ const pc=L.parked[k]; if(Math.hypot(pc.x-w.x,pc.y-w.y)<R){ damageCar(pc,dps*step*0.85,w.x,w.y,"burn"); if(pc.dead) L.parked.splice(k,1); } }
    }
  }
}
function drawScorches(ox,oy){ for(const s of scorches){ if(s.x<ox-50||s.x>ox+VW+50||s.y<oy-50||s.y>oy+VH+50) continue; ctx.fillStyle="rgba(8,8,10,.5)"; ctx.beginPath(); ctx.ellipse(s.x,s.y,s.r,s.r*0.7,0,0,7); ctx.fill(); } }
function drawWrecks(ox,oy){ for(const w of wrecks){ if(w.x<ox-50||w.x>ox+VW+50||w.y<oy-50||w.y>oy+VH+50) continue;
  ctx.save(); ctx.translate(w.x,w.y); ctx.rotate(w.a);
  ctx.fillStyle="rgba(0,0,0,.3)"; rrect(-w.L/2+3,-w.W/2+4,w.L,w.W,6); ctx.fill();
  ctx.fillStyle="#1b1b1d"; rrect(-w.L/2,-w.W/2,w.L,w.W,6); ctx.fill();
  ctx.fillStyle="#2c2722"; rrect(-w.L*0.16,-w.W*0.4,w.L*0.5,w.W*0.8,4); ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,.5)"; ctx.lineWidth=2; rrect(-w.L/2,-w.W/2,w.L,w.W,6); ctx.stroke();
  if(w.burnT!==undefined && w.burnT<w.burnLife){
    const t=w.burnT/w.burnLife, al=1-t;
    ctx.globalCompositeOperation="lighter";
    for(let i=0;i<4;i++){ const fx=(Math.random()-0.5)*w.W*0.55, fy=(Math.random()-0.35)*w.L*0.5;
      ctx.fillStyle=`rgba(255,${130+(Math.random()*90|0)},30,${(0.25+0.35*al).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(fx,fy,2+Math.random()*4,0,7); ctx.fill(); }
    ctx.globalCompositeOperation="source-over";
  }
  ctx.restore(); } }
const weaponEl=document.getElementById("weapon");
function cycleWeapon(d){
  if(typeof cycleEquippedWeapon==="function"){ cycleEquippedWeapon(d); return; }
  const o=ownedIndices(); if(!o.length) return;
  let k=o.indexOf(curWeapon); if(k<0)k=0; k=(k+d+o.length)%o.length; curWeapon=o[k];
}
window.addEventListener("wheel", e=>{ if(typeof invOpen!=="undefined"&&invOpen) return; cycleWeapon(e.deltaY>0?1:-1); }, {passive:true});
function fireWeapon(w,x,y,ang,owner){
  const ox=x+Math.cos(ang)*14, oy=y+Math.sin(ang)*14;
  if(typeof alertPeds==="function") alertPeds(x,y,200);
  if(w.kind==="melee"){ meleeHit(x,y,ang,w); slashFx(ox,oy,ang,w.range); playSwoosh(); return; }
  if(w.kind==="pellets"){ for(let i=0;i<w.pellets;i++) spawnBullet(ox,oy,ang+(rng()-0.5)*w.spread,w.spd,owner,w.dmg,"bullet"); muzzle(ox,oy,ang); playShot(); return; }
  if(w.kind==="rocket"){ spawnBullet(ox,oy,ang,w.spd,owner,w.dmg,"rocket"); muzzle(ox,oy,ang); playBoom(0.35); return; }
  if(w.kind==="flame"){ const b=spawnBullet(ox,oy,ang+(rng()-0.5)*w.spread,w.spd,owner,w.dmg,"flame"); b.life=w.range; return; }
  spawnBullet(ox,oy,ang+(rng()-0.5)*(w.spread||0),w.spd,owner,w.dmg,"bullet"); muzzle(ox,oy,ang); playShot();
}
function gunshotScare(x,y){ alertPeds(x,y,200); }
function meleeHit(x,y,ang,w){
  const ca=Math.cos(ang), sa=Math.sin(ang);
  for(const p of peds){ if(p.state==="down") continue; const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy); if(d<w.range && dx*ca+dy*sa>d*0.3){ pedHit(p, w.dmg, ca*120, sa*120, 0.5); } }
  for(const c of cops){ const dx=c.x-x,dy=c.y-y,d=Math.hypot(dx,dy); if(d<w.range+8 && dx*ca+dy*sa>d*0.3){ c.hp-=w.dmg; spawnBlood(c.x,c.y,ca,sa,0.3); if(c.hp<=0) killCop(c); } }
  for(const c of footcops){ const dx=c.x-x,dy=c.y-y,d=Math.hypot(dx,dy); if(d<w.range+6 && dx*ca+dy*sa>d*0.3){ c.hp-=w.dmg; spawnBlood(c.x,c.y,ca,sa,0.3); if(c.hp<=0) killFootCop(c); } }
  for(const m of allForestMammals()){ const dx=m.x-x,dy=m.y-y,d=Math.hypot(dx,dy); if(d<w.range+m.r && dx*ca+dy*sa>d*0.2){ forestMammalHit(m,w.dmg*1.35,ca*130,sa*130,0.55); } }
}
function explode(x,y){
  explosions.push({x,y,r:6,life:0.5}); const R=78; alertPeds(x,y,300);
  for(const p of peds){ if(p.state!=="down" && Math.hypot(p.x-x,p.y-y)<R){ const a=Math.atan2(p.y-y,p.x-x); pedHit(p, 200, Math.cos(a)*210, Math.sin(a)*210, 1.2); } }
  for(const c of cops){ if(Math.hypot(c.x-x,c.y-y)<R){ c.hp-=130; spawnBlood(c.x,c.y,0,0,1.2); if(c.hp<=0) killCop(c); } }
  for(let i=footcops.length-1;i>=0;i--){ const c=footcops[i]; if(Math.hypot(c.x-x,c.y-y)<R){ c.hp-=130; spawnBlood(c.x,c.y,0,0,1.2); if(c.hp<=0) killFootCop(c); } }
  for(const m of allForestMammals().slice()){ if(Math.hypot(m.x-x,m.y-y)<R){ const a=Math.atan2(m.y-y,m.x-x); forestMammalHit(m,95,Math.cos(a)*160,Math.sin(a)*160,1); } }
  for(const c of traffic.slice()){ const d=Math.hypot(c.x-x,c.y-y); if(d<R){ const a=Math.atan2(c.y-y,c.x-x); if(c.state==="drive"){ c.state="loose"; c.vx=Math.cos(a)*260; c.vy=Math.sin(a)*260; c.spin=(rng()-0.5)*8; c.downT=0; } damageCar(c, 130*(1-d/R), x, y, "explosion"); } }
  damageParkedNear(x,y,R,130);
  { const ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP); for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); if(!L.lamps) continue; for(const lm of L.lamps){ if(!lm.fall && Math.hypot(lm.x-x,lm.y-y)<R){ const a=Math.atan2(lm.y-y,lm.x-x); topple(lm,Math.cos(a)*200,Math.sin(a)*200,40); } }
      for(let i2=ci-1;i2<=ci+1;i2++)for(let j2=cj-1;j2<=cj+1;j2++){ const L2=getLot(i2,j2); if(L2.signals) for(const s of L2.signals){ if(!s.fall && Math.hypot(s.x-x,s.y-y)<R){ const a=Math.atan2(s.y-y,s.x-x); topple(s,Math.cos(a)*200,Math.sin(a)*200,26); } } } } }
  if(!car.dead && car.hp!==undefined){ const d=Math.hypot(car.x-x,car.y-y); if(d<R) damageCar(car, (mode==="car"?120:80)*(1-d/R), x, y, "explosion"); }
  const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y;
  if(Math.hypot(ax-x,ay-y)<R*0.72) damage(38);
  playBoom(0.9);
}
function slashFx(x,y,ang,range){ slashes.push({x,y,a:ang,range,life:0.12}); }
function updateExplosions(dt){ for(let i=explosions.length-1;i>=0;i--){ const e=explosions[i]; e.life-=dt; e.r+=180*dt; if(e.life<=0) explosions.splice(i,1); } }
function updateSlashes(dt){ for(let i=slashes.length-1;i>=0;i--){ slashes[i].life-=dt; if(slashes[i].life<=0) slashes.splice(i,1); } }
function drawExplosions(){
  for(const e of explosions){ const t=Math.max(0,e.life/0.5);
    ctx.fillStyle=`rgba(255,${120+100*t|0},40,${0.5*t})`; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,7); ctx.fill();
    ctx.fillStyle=`rgba(255,240,180,${0.7*t})`; ctx.beginPath(); ctx.arc(e.x,e.y,e.r*0.4,0,7); ctx.fill();
  }
}
function drawSlashes(){
  for(const s of slashes){ ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.a);
    ctx.strokeStyle=`rgba(255,255,255,${s.life/0.12*0.8})`; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,s.range*0.8,-0.7,0.7); ctx.stroke(); ctx.restore(); }
}
function playBoom(v){ noiseBurst(0.6,"lowpass",120,0,Math.min(0.85,v)); }
function playSwoosh(){ noiseBurst(0.12,"highpass",500,0,0.25); }
function playerAim(){
  if(pointerActive){ const wx=mx+(cam.x-VW/2), wy=my+(cam.y-VH/2); return Math.atan2(wy-ped.y, wx-ped.x); }
  return ped.a;
}
function damage(x){ health=Math.max(0,health-x); const px=mode==="car"?car.x:ped.x, py=mode==="car"?car.y:ped.y; spawnBlood(px,py,0,0,0.3); if(health<=0) wasted(); }
function killCop(c){ const i=cops.indexOf(c); if(i>=0) cops.splice(i,1); addHeat(0.6); }
function wasted(){
  showBigMsg("WYELIMINOWANY");
  health=100; heat=0; stars=0; cops.length=0; bullets.length=0; firing=false;
  const p=roadPoint(); ped.x=p.x; ped.y=p.y; mode="foot";
}
function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    if(b.type==="flame"){ b.vx*=0.94; b.vy*=0.94; }
    let dead = b.life<=0;
    if(!dead && b.type!=="flame" && inBuilding(b.x,b.y,1)){ if(b.type==="rocket") explode(b.x,b.y); dead=true; }
    if(!dead && b.owner==="player"){
      if(b.type==="rocket"){
        let hit=false;
        for(const c of cops) if(Math.hypot(b.x-c.x,b.y-c.y)<c.R+5){ hit=true; break; }
        if(!hit) for(const c of footcops) if(Math.hypot(b.x-c.x,b.y-c.y)<c.r+5){ hit=true; break; }
        if(!hit) for(const p of peds) if(p.state!=="down"&&Math.hypot(b.x-p.x,b.y-p.y)<p.r+5){ hit=true; break; }
        if(!hit) for(const m of allForestMammals()) if(Math.hypot(b.x-m.x,b.y-m.y)<m.r+6){ hit=true; break; }
        if(!hit) for(const c of traffic) if(Math.hypot(b.x-c.x,b.y-c.y)<c.R+5){ hit=true; break; }
        if(!hit){ const ci=Math.floor(b.x/GAP),cj=Math.floor(b.y/GAP); for(let i=ci-1;i<=ci+1&&!hit;i++)for(let j=cj-1;j<=cj+1&&!hit;j++){ const L=getLot(i,j); for(const pc of L.parked) if(Math.hypot(b.x-pc.x,b.y-pc.y)<pc.cr+5){ hit=true; break; } } }
        if(hit){ explode(b.x,b.y); dead=true; }
      } else if(b.type==="flame"){
        for(const c of cops){ if(Math.hypot(b.x-c.x,b.y-c.y)<c.R+3){ c.hp-=b.dmg; if(c.hp<=0){ spawnBlood(c.x,c.y,0,0,1); killCop(c);} dead=true; break; } }
        if(!dead) for(const p of peds){ if(p.state!=="down"&&Math.hypot(b.x-p.x,b.y-p.y)<p.r+4){ pedHit(p, b.dmg*4, b.vx*0.02, b.vy*0.02, 0.7); dead=true; break; } }
        if(!dead) for(const m of allForestMammals()){ if(Math.hypot(b.x-m.x,b.y-m.y)<m.r+4){ forestMammalHit(m,b.dmg*3,b.vx*0.02,b.vy*0.02,0.6); dead=true; break; } }
        if(!dead) for(const c of traffic){ if(Math.hypot(b.x-c.x,b.y-c.y)<c.R){ damageCar(c, b.dmg*4, b.x, b.y, "fire"); dead=true; break; } }
        if(!dead){ const ci=Math.floor(b.x/GAP),cj=Math.floor(b.y/GAP); for(let i=ci-1;i<=ci+1&&!dead;i++)for(let j=cj-1;j<=cj+1&&!dead;j++){ const L=getLot(i,j); for(let k=0;k<L.parked.length;k++){ const pc=L.parked[k]; if(Math.hypot(b.x-pc.x,b.y-pc.y)<pc.cr+3){ damageCar(pc,b.dmg*4,b.x,b.y,"fire"); if(pc.dead)L.parked.splice(k,1); dead=true; break; } } } }
      } else {
        for(const c of cops){ if(Math.hypot(b.x-c.x,b.y-c.y)<c.R){ c.hp-=b.dmg; spawnBlood(c.x,c.y,b.vx,b.vy,c.hp<=0?1.2:0.3); dead=true; if(c.hp<=0) killCop(c); break; } }
        if(!dead) for(const c of footcops){ if(Math.hypot(b.x-c.x,b.y-c.y)<c.r+2){ c.hp-=b.dmg; spawnBlood(c.x,c.y,b.vx,b.vy,c.hp<=0?1:0.3); dead=true; if(c.hp<=0) killFootCop(c); break; } }
        if(!dead) for(const p of peds){ if(p.state!=="down" && Math.hypot(b.x-p.x,b.y-p.y)<p.r+2){ pedHit(p, b.dmg, b.vx*0.04, b.vy*0.04, 0.8); dead=true; break; } }
        if(!dead) for(const m of allForestMammals()){ if(Math.hypot(b.x-m.x,b.y-m.y)<m.r+3){ forestMammalHit(m,b.dmg,b.vx*0.04,b.vy*0.04,0.75); dead=true; break; } }
        if(!dead) for(const c of traffic){ if(Math.hypot(b.x-c.x,b.y-c.y)<c.R){ damageCar(c, b.dmg, b.x, b.y, "bullet"); dead=true; break; } }
        if(!dead){ const ci=Math.floor(b.x/GAP),cj=Math.floor(b.y/GAP); for(let i=ci-1;i<=ci+1&&!dead;i++)for(let j=cj-1;j<=cj+1&&!dead;j++){ const L=getLot(i,j); for(let k=0;k<L.parked.length;k++){ const pc=L.parked[k]; if(Math.hypot(b.x-pc.x,b.y-pc.y)<pc.cr+3){ damageCar(pc,b.dmg,b.x,b.y,"bullet"); if(pc.dead)L.parked.splice(k,1); dead=true; break; } } } }
      }
    } else if(!dead && b.owner!=="player"){
      const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y, aR=mode==="car"?car.R:ped.r;
      if(Math.hypot(b.x-ax,b.y-ay)<aR){ damage(b.dmg); dead=true; }
    }
    if(dead) bullets.splice(i,1);
  }
  for(let i=muzzles.length-1;i>=0;i--){ muzzles[i].life-=dt; if(muzzles[i].life<=0) muzzles.splice(i,1); }
}
function updateCombat(dt){
  if(typeof invOpen!=="undefined"&&invOpen) return;
  playerFireCd-=dt;
  if(mode==="foot" && (firing||keys[" "]) && playerFireCd<=0){
    const w=WEAPONS[curWeapon];
    const canFire=typeof playerCanFire==="function"?playerCanFire():(w.kind==="melee"||ammo[curWeapon]>0);
    if(canFire){
      const ang=playerAim(); ped.a=ang;
      fireWeapon(w, ped.x, ped.y, ang, "player");
      if(w.kind!=="melee"){
        if(typeof playerConsumeAmmo==="function") playerConsumeAmmo();
        else if(ammo[curWeapon]!==Infinity){ ammo[curWeapon]--; if(ammo[curWeapon]<=0) curWeapon=0; }
      }
      playerFireCd=w.cd;
    } else { if(typeof syncCurWeaponFromEquip==="function") syncCurWeaponFromEquip(); else curWeapon=0; playerFireCd=0.1; }
  }
  for(const c of cops){
    c.fireCd-=dt;
    const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y;
    if(c.fireCd<=0 && stars>=2 && Math.hypot(ax-c.x,ay-c.y)<280){
      const ang=Math.atan2(ay-c.y,ax-c.x)+(Math.random()-0.5)*0.2, ox=c.x+Math.cos(ang)*22, oy=c.y+Math.sin(ang)*22;
      spawnBullet(ox,oy,ang,640,"cop",7,"bullet"); muzzle(ox,oy,ang); playShot(); c.fireCd=rand(0.9,1.8);
    }
  }
  if(cops.length===0 && health<100) health=Math.min(100, health+dt*3);
  updateBullets(dt); updateExplosions(dt); updateSlashes(dt);
}
function drawBullets(){
  for(const b of bullets){
    if(b.type==="rocket"){
      ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(Math.atan2(b.vy,b.vx));
      ctx.fillStyle="#cfd3da"; ctx.fillRect(-7,-3,14,6);
      ctx.fillStyle="#ffb03a"; ctx.fillRect(-12,-2,5,4); ctx.restore();
    } else if(b.type==="flame"){
      ctx.fillStyle=`rgba(255,${140+(Math.random()*80|0)},30,0.8)`;
      ctx.beginPath(); ctx.arc(b.x,b.y,rand(3,6),0,7); ctx.fill();
    }
  }
  ctx.strokeStyle="#ffe08a"; ctx.lineWidth=2.2; ctx.beginPath();
  for(const b of bullets){ if(b.type!=="bullet") continue; ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*0.012,b.y-b.vy*0.012); }
  ctx.stroke();
  for(const m of muzzles){ ctx.save(); ctx.translate(m.x,m.y); ctx.rotate(m.a);
    ctx.fillStyle="rgba(255,224,130,.9)"; ctx.beginPath(); ctx.arc(8,0,5,0,7); ctx.fill(); ctx.restore(); }
}
function drawCrosshair(){
  if(mode!=="foot"||!pointerActive) return;
  ctx.save(); ctx.strokeStyle="rgba(255,255,255,.7)"; ctx.lineWidth=1.5; ctx.beginPath();
  ctx.arc(mx,my,9,0,7);
  ctx.moveTo(mx-14,my); ctx.lineTo(mx-4,my); ctx.moveTo(mx+4,my); ctx.lineTo(mx+14,my);
  ctx.moveTo(mx,my-14); ctx.lineTo(mx,my-4); ctx.moveTo(mx,my+4); ctx.lineTo(mx,my+14);
  ctx.stroke(); ctx.restore();
}
let lastHp=-1;
function drawHealth(){
  const v=Math.round(health); if(v===lastHp) return; lastHp=v;
  healthFill.style.width=v+"%";
  healthFill.style.background = v>50?"#49c46a" : v>25?"#e0b53b" : "#e0503b";
}

