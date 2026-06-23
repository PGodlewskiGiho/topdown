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

