/* TOPDOWN CITY — 12-weather.js */
/* ---------- weather (rain + puddles) ---------- */
const MAXRAIN=440;
const rain=[];
for(let i=0;i<MAXRAIN;i++) rain.push({x:Math.random()*2000, y:Math.random()*1300, l:8+Math.random()*9, s:720+Math.random()*420});
let weatherI=0, weatherTarget=0, weatherTimer=10, wetness=0, flash=0;
let windT=0, windAmp=0.22, windGust=0;   // tree sway clock + strength (Witcher-style gusts)
const WPRESET=[0,0.5,0.85,1]; let wIdx=0;
function cycleWeather(){ wIdx=(wIdx+1)%WPRESET.length; weatherTarget=WPRESET[wIdx]; weatherTimer=60; }
function updateWeather(dt){
  weatherTimer-=dt;
  if(weatherTimer<=0){
    const r=Math.random();
    weatherTarget = r<0.5?0 : r<0.75?0.5 : r<0.92?0.85 : 1;   // bias toward clear
    weatherTimer = rand(26,56);
  }
  weatherI += (weatherTarget-weatherI)*Math.min(1,0.4*dt);
  // wind: gentle idle sway, stronger in rain/storm; occasional gusts
  windT += dt * (0.75 + weatherI * 1.55);
  if(Math.random() < dt * 0.14) windGust = rand(0.15, 1.0);
  windGust *= Math.pow(0.965, dt * 60);
  windAmp = 0.06 + weatherI * 0.20 + windGust * 0.12;
  if(weatherI>0.15) wetness += (1-wetness)*Math.min(1,0.25*dt);
  else              wetness -= Math.min(wetness,0.06*dt);     // slow dry-out
  wetness=clamp(wetness,0,1);
  if(weatherI>0.8 && Math.random()<0.005){ flash=1; playThunder(); }     // lightning
  flash=Math.max(0,flash-dt*2.2);
}
function updateRain(dt){
  const n=Math.floor(weatherI*MAXRAIN);
  for(let i=0;i<n;i++){
    const d=rain[i]; d.y+=d.s*dt; d.x+=150*dt;
    if(d.y>VH+10){ d.y=-10; d.x=Math.random()*(VW+200)-100; }
    else if(d.x>VW+60){ d.x=-60; }
  }
}
function drawWet(ox,oy){
  if(wetness<0.02) return;
  ctx.fillStyle=`rgba(18,24,32,${(0.22*wetness).toFixed(3)})`; ctx.fillRect(ox,oy,VW,VH);
  const i0=Math.floor((ox-ROAD)/GAP)-1,i1=Math.floor((ox+VW)/GAP)+1,j0=Math.floor((oy-ROAD)/GAP)-1,j1=Math.floor((oy+VH)/GAP)+1;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); for(const p of L.puddles){
    ctx.save(); ctx.translate(p.x,p.y);
    ctx.fillStyle=`rgba(10,14,20,${(0.5*wetness).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(0,0,p.rx,p.ry,0,0,7); ctx.fill();
    ctx.fillStyle=`rgba(120,140,170,${(0.12*wetness).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(-p.rx*0.18,-p.ry*0.18,p.rx*0.6,p.ry*0.5,0,0,7); ctx.fill();
    ctx.restore();
  } }
}
function drawRain(){
  if(weatherI<0.02) return;
  ctx.fillStyle=`rgba(60,70,85,${(weatherI*0.14).toFixed(3)})`; ctx.fillRect(0,0,VW,VH);  // veil
  const n=Math.floor(weatherI*MAXRAIN);
  ctx.strokeStyle=`rgba(175,195,215,${(0.26+0.24*weatherI).toFixed(3)})`; ctx.lineWidth=1.1;
  ctx.beginPath();
  for(let i=0;i<n;i++){ const d=rain[i]; ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-d.l*0.25, d.y-d.l); }
  ctx.stroke();
  if(flash>0){ ctx.fillStyle=`rgba(220,230,255,${(flash*0.5).toFixed(3)})`; ctx.fillRect(0,0,VW,VH); }
}
function weatherLabel(w){ if(w<0.12)return"POGODNIE"; if(w<0.4)return"POCHMURNO"; if(w<0.8)return"DESZCZ"; return"BURZA"; }

/* ---------- wind-blown leaves (forest only) ---------- */
const MAX_LEAVES=42;
const leaves=[];
const LEAF_PAL=[
  {c:"#5a4020",hi:"rgba(255,255,220,.22)"},{c:"#6a5028",hi:"rgba(255,255,220,.18)"},
  {c:"#3a5828",hi:"rgba(255,255,220,.16)"},{c:"#7a6020",hi:"rgba(255,255,220,.20)"},
  {c:"#4a4820",hi:"rgba(255,255,220,.15)"},{c:"#8a5a28",hi:"rgba(255,255,220,.18)"},
  {c:"#9a6838",hi:"rgba(255,255,220,.20)"},{c:"#2f5828",hi:"rgba(255,255,220,.14)"},
];
let leafSpawnT=0;
function leafWindPower(){
  return clamp(windAmp*3.6+windGust*0.72,0,1);
}
function leafWindDir(){
  return Math.PI*0.10+Math.sin(windT*0.65)*0.52+Math.sin(windT*1.25)*0.10;
}
function inForestAt(x,y){
  const k=cellAt(x,y);
  return biomeOf(k[0],k[1])==="forest"&&!isMountain(k[0],k[1]);
}
function spawnLeaf(){
  const p=leafWindPower(); if(p<0.06) return null;
  const wd=leafWindDir(), back=Math.max(VW,VH)*0.52+rand(20,110);
  const x=focusX-Math.cos(wd)*back+(rng()-0.5)*VW*0.95;
  const y=focusY-Math.sin(wd)*back*0.55+(rng()-0.5)*VH*0.95;
  if(!inForestAt(x,y)) return null;
  const pal=LEAF_PAL[(rng()*LEAF_PAL.length)|0];
  const s=0.85+rng()*0.9;
  const nb={
    x,y, z:6+rng()*22,
    vx:Math.cos(wd)*rand(18,42)*p, vy:Math.sin(wd)*rand(8,24)*p+rand(2,10),
    rot:rng()*6.28, rotV:(rng()-0.5)*rand(2.2,5.5)*(0.35+p),
    rx:2.6*s, ry:1.5*s, tilt:rng()*0.9,
    col:pal.c, hi:pal.hi, phase:rng()*6.28,
    life:rand(9,16), maxLife:0,
  };
  nb.maxLife=nb.life;
  return nb;
}
function updateLeaves(dt){
  if(typeof gamePhase!=="undefined"&&gamePhase!=="playing") return;
  const forest=inForestAt(focusX,focusY);
  const p=leafWindPower(), wd=leafWindDir();
  const gust=0.55+0.45*Math.sin(windT*2.1)+windGust*0.35;
  const push=22+p*95*gust;
  for(let i=leaves.length-1;i>=0;i--){
    const lf=leaves[i];
    lf.life-=dt*(forest?1:2.8);
    if(lf.life<=0){ leaves.splice(i,1); continue; }
    const flutter=Math.sin(windT*3.4+lf.phase)*p*14+Math.sin(windT*5.1+lf.phase*1.7)*p*6;
    lf.vx+=Math.cos(wd)*push*dt+flutter*dt;
    lf.vy+=Math.sin(wd)*push*0.38*dt+Math.sin(windT*1.8+lf.phase)*4.2*dt;
    lf.vx*=Math.pow(0.90,dt*60); lf.vy*=Math.pow(0.93,dt*60);
    lf.x+=lf.vx*dt; lf.y+=lf.vy*dt;
    lf.rot+=lf.rotV*dt*(0.6+p*1.4);
    if(Math.hypot(lf.x-focusX,lf.y-focusY)>Math.max(VW,VH)*0.75+220) leaves.splice(i,1);
  }
  if(!forest||VW>1700||p<0.05) return;
  const target=Math.round(2+Math.pow(p,1.12)*36);
  leafSpawnT-=dt;
  if(leaves.length<target&&leafSpawnT<=0){
    leafSpawnT=rand(0.08,0.22)/(0.35+p*1.1);
    const nb=spawnLeaf(); if(nb){ leaves.push(nb); if(leaves.length>MAX_LEAVES) leaves.shift(); }
  }
}
function drawLeafParticle(lf){
  const bob=Math.sin(windT*2.8+lf.phase)*0.6;
  ctx.save(); ctx.translate(lf.x,lf.y-lf.z*0.12+bob); ctx.rotate(lf.rot);
  const fade=clamp(lf.life/lf.maxLife,0,1);
  ctx.globalAlpha=0.55+0.45*fade;
  ctx.fillStyle=lf.col;
  ctx.beginPath(); ctx.ellipse(0,0,lf.rx,lf.ry,lf.tilt,0,7); ctx.fill();
  ctx.fillStyle=lf.hi;
  ctx.beginPath(); ctx.ellipse(-lf.rx*0.18,-lf.ry*0.12,lf.rx*0.34,lf.ry*0.22,lf.tilt,0,7); ctx.fill();
  ctx.globalAlpha=1;
  ctx.restore();
}
function drawWindLeaves(ox,oy){
  if(!leaves.length||VW>1700) return;
  for(const lf of leaves){
    if(lf.x<ox-30||lf.x>ox+VW+30||lf.y<oy-30||lf.y>oy+VH+30) continue;
    drawLeafParticle(lf);
  }
}

