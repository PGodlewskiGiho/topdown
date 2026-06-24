/* TOPDOWN CITY — 12-weather.js */
/* ---------- weather (rain + puddles) ---------- */
const MAXRAIN=520;
const rain=[];
for(let i=0;i<MAXRAIN;i++){
  const layer=Math.random();
  rain.push({
    x:Math.random()*2000, y:Math.random()*1300,
    l:6+layer*14+Math.random()*8,
    s:520+layer*380+Math.random()*280,
    w:0.55+layer*0.95,
    a:0.22+layer*0.48,
    layer
  });
}
let weatherI=0, weatherTarget=0, weatherTimer=10, wetness=0, flash=0;
let windT=0, windAmp=0.22, windGust=0;   // tree sway clock + strength (Witcher-style gusts)
const WPRESET=[0,0.5,0.85,1]; let wIdx=0;
const MAX_RAIN_PUDDLES=140;
const rainPuddles=[];                    // dynamic puddles that grow during rain
let puddleT=0;

function puddleWetScale(p){
  const sz=p.size!=null?p.size:1;
  return (0.22+0.78*wetness)*sz;
}
function puddleDims(p){
  const sc=puddleWetScale(p);
  return {rx:(p.rx0!=null?p.rx0:p.rx)*sc, ry:(p.ry0!=null?p.ry0:p.ry)*sc};
}
function nearPavedSurface(x,y){
  if(inWater(x,y)) return false;
  const [ci,cj]=cellAt(x,y);
  if(isMountain(ci,cj)) return false;
  const L=getLot(ci,cj);
  if(L.water||L.mountain||L.biome==="forest") return false;
  if(L.parking) return true;
  if(L.biome==="city"&&(L.zone==="downtown"||L.zone==="midrise"||L.zone==="mega")) return true;
  if(L.biome==="city"&&!L.empty&&L.zone!=="forest") return true;
  let best=999;
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    for(const[di,dj]of[[1,0],[0,1]]){
      const e=getEdge(i,j,di,dj);
      if(!e.exists||e.bridge) continue;
      const g=edgeGeom(i,j,i+di,j+dj);
      for(let t=0;t<=1.001;t+=0.12){
        const pt=bez(g.p0,g.cp,g.p1,t);
        const d=Math.hypot(pt[0]-x,pt[1]-y);
        if(d<e.width*0.46&&d<best) best=d;
      }
    }
  }
  if(best<95) return true;
  const el=terrainScore(x,y);
  const [ci2,cj2]=cellAt(x+GAP*0.2,y), [ci3,cj3]=cellAt(x-GAP*0.2,y+GAP*0.2);
  return el<(terrainScore(ci2*GAP,cj2*GAP)+terrainScore(ci3*GAP,cj3*GAP))*0.5+0.012;
}
function puddleTooClose(x,y,rx,ry){
  const pad=10+Math.max(rx,ry);
  for(const p of rainPuddles){
    const d=puddleDims(p);
    if(Math.hypot(p.x-x,p.y-y)<pad+d.rx+d.ry) return true;
  }
  return false;
}
function spawnRainPuddle(x,y){
  const rx0=5+Math.random()*14;
  rainPuddles.push({x,y,rx0,ry0:rx0*(0.78+Math.random()*0.18),rx:2,ry:2,a:Math.random()*Math.PI,size:0.04,dyn:true});
}
function updateRainPuddles(dt){
  puddleT+=dt;
  if(rainPuddles.length) rainPuddles.length=0;
}
function puddleParallax(p){
  const px=(p.x-cam.x)*0.045, py=(p.y-cam.y)*0.028;
  return {px, py, rip:Math.sin(puddleT*1.6+(p.x+p.y)*0.01)*0.8};
}
function puddleGroundTint(x,y){
  const [ci,cj]=cellAt(x,y);
  const L=getLot(ci,cj);
  if(L.parking) return [52,56,64];
  if(L.biome==="city"){
    if(L.zone==="downtown"||L.mega) return [42,44,50];
    return [48,50,56];
  }
  if(L.biome==="desert") return [72,66,54];
  return [56,58,52];
}
function puddleAsphaltNear(x,y){
  const [ci,cj]=cellAt(x,y);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    for(const[di,dj]of[[1,0],[0,1]]){
      const e=getEdge(i,j,di,dj);
      if(!e.exists||e.bridge) continue;
      const g=edgeGeom(i,j,i+di,j+dj);
      for(let t=0;t<=1;t+=0.14){
        const pt=bez(g.p0,g.cp,g.p1,t);
        if(Math.hypot(pt[0]-x,pt[1]-y)<e.width*0.55) return true;
      }
    }
  }
  return false;
}
function collectPuddleBuildingRefs(p,rx,ry){
  const out=[], ci=Math.floor(p.x/GAP), cj=Math.floor(p.y/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    const L=getLot(i,j);
    for(const b of L.buildings){
      const bx=b.x+b.w*0.5, by=b.y+b.h, H=b.H||42;
      const dx=bx-p.x, dy=by-p.y;
      if(Math.hypot(dx,dy)>rx*2.4+ry*2+H*0.5) continue;
      out.push({bx,by,bw:b.w,bh:H,wall:b.wall||"#5a6068",roof:b.roof||"#3a3e46"});
    }
  }
  out.sort((a,b)=>a.by-b.by);
  return out;
}
const MAX_PUDDLE_REFL=18, MAX_PUDDLE_ENT_REFL=24;
let _puddleRefsFrame=-1;
const _puddleRefsCache=new Map();
function getPuddleBuildingRefs(p,rx,ry){
  const fid=typeof drawFrameId!=="undefined"?drawFrameId:0;
  if(_puddleRefsFrame!==fid){ _puddleRefsCache.clear(); _puddleRefsFrame=fid; }
  const k=(p.x|0)+","+(p.y|0)+","+(rx*10|0);
  let refs=_puddleRefsCache.get(k);
  if(!refs){ refs=collectPuddleBuildingRefs(p,rx,ry); _puddleRefsCache.set(k,refs); }
  return refs;
}
function puddleReflPriority(p,ox,oy){
  const {rx,ry}=puddleDims(p);
  const sz=(rx+ry)*(p.size!=null?p.size:1);
  const dx=p.x-(ox+VW*0.5), dy=p.y-(oy+VH*0.5);
  return sz*2-Math.hypot(dx,dy)*0.002;
}
function collectPuddlesInView(ox,oy){
  const out=[], pad=50;
  const i0=Math.floor((ox-ROAD)/GAP)-1,i1=Math.floor((ox+VW)/GAP)+1,j0=Math.floor((oy-ROAD)/GAP)-1,j1=Math.floor((oy+VH)/GAP)+1;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const L=getLot(i,j);
    for(const p of L.puddles){
      if(p.x<ox-pad||p.x>ox+VW+pad||p.y<oy-pad||p.y>oy+VH+pad) continue;
      out.push(p);
    }
  }
  for(const p of rainPuddles){
    if(p.x<ox-pad||p.x>ox+VW+pad||p.y<oy-pad||p.y>oy+VH+pad) continue;
    out.push(p);
  }
  return out;
}
function drawPuddleBody(p){}
function drawPuddleReflections(ox,oy){}
function cycleWeather(){ wIdx=(wIdx+1)%WPRESET.length; weatherTarget=WPRESET[wIdx]; weatherTimer=60; }
function updateWeather(dt){
  weatherTimer-=dt;
  if(weatherTimer<=0){
    const r=Math.random();
    weatherTarget = r<0.52?0 : r<0.78?0.45 : r<0.94?0.72 : 0.82;   // bias toward clear; cap storms
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
  updateRainPuddles(dt);
}
function updateRain(dt){
  const n=Math.floor(weatherI*MAXRAIN);
  const wf=typeof windFieldAt==="function"?windFieldAt(typeof focusX!=="undefined"?focusX:VW*0.5, typeof focusY!=="undefined"?focusY:VH*0.5):null;
  const wind=120+weatherI*90+windGust*140+(wf?wf.power*80:0);
  const skew=wf?wf.fx*0.35+0.12:0.22+Math.sin(windT*0.9)*0.08;
  const skewY=wf?wf.fy*0.18:0.04;
  for(let i=0;i<n;i++){
    const d=rain[i];
    d.y+=d.s*dt;
    d.x+=(wind+skew*80)*(0.75+d.layer*0.35)*dt;
    d.y+=skewY*60*d.layer*dt;
    if(d.y>VH+24){ d.y=-d.l-Math.random()*50; d.x=Math.random()*(VW+120)-60; }
    else if(d.x>VW+80){ d.x=-50-Math.random()*40; }
    else if(d.x<-80){ d.x=VW+Math.random()*40; }
  }
}
function drawWet(ox,oy){
  if(wetness<0.02) return;
  const i0=Math.floor((ox-ROAD)/GAP)-1,i1=Math.floor((ox+VW)/GAP)+1,j0=Math.floor((oy-ROAD)/GAP)-1,j1=Math.floor((oy+VH)/GAP)+1;
  ctx.save();
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const L=getLot(i,j);
    if(L.water||L.mountain||L.biome==="forest") continue;
    const cx=L.x+L.w*0.5, cy=L.y+L.h*0.5;
    if(cx<ox-80||cx>ox+VW+80||cy<oy-80||cy>oy+VH+80) continue;
    const paved=L.parking||L.biome==="city"||puddleAsphaltNear(cx,cy);
    if(!paved) continue;
    const a=(0.06+0.10*wetness).toFixed(3);
    ctx.fillStyle=`rgba(38,52,68,${a})`;
    ctx.fillRect(L.x,L.y,L.w,L.h);
  }
  ctx.restore();
  if(typeof drawWetRoadReflections==="function") drawWetRoadReflections(ox,oy);
}
function drawRain(){
  if(weatherI<0.02) return;
  const intens=Math.min(weatherI,0.78);
  const veil=intens*0.048;
  const g=ctx.createLinearGradient(0,0,0,VH);
  g.addColorStop(0,`rgba(72,88,108,${(veil*0.42).toFixed(3)})`);
  g.addColorStop(0.45,`rgba(58,72,90,${(veil*0.85).toFixed(3)})`);
  g.addColorStop(1,`rgba(48,58,72,${(veil*0.95).toFixed(3)})`);
  ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
  const n=Math.floor(intens*MAXRAIN*0.50), base=0.20+intens*0.34;
  ctx.lineCap="round";
  for(let L=0;L<3;L++){
    ctx.beginPath();
    let hits=0;
    for(let i=0;i<n;i++){
      const d=rain[i];
      if(((d.layer*2.99)|0)!==L) continue;
      const sl=2.5+d.layer*5.5;
      ctx.moveTo(d.x,d.y); ctx.lineTo(d.x+sl,d.y+d.l);
      hits++;
    }
    if(!hits) continue;
    const al=(base*(0.50+L*0.24)).toFixed(3);
    ctx.strokeStyle=`rgba(178,198,222,${al})`;
    ctx.lineWidth=0.62+L*0.42;
    ctx.stroke();
  }
  ctx.lineCap="butt";
  if(intens>0.65){
    ctx.fillStyle=`rgba(198,214,232,${(intens*0.014).toFixed(3)})`;
    const t=performance.now()*0.001;
    for(let k=0;k<Math.floor(intens*4);k++){
      const sx=(k*113+t*18)%VW, sy=(k*67+t*42)%VH;
      ctx.fillRect(sx,sy,1,1.2+intens*1.2);
    }
  }
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
function leafWindDir(){
  if(typeof windFieldAt==="function"){
    const w=windFieldAt(typeof focusX!=="undefined"?focusX:0, typeof focusY!=="undefined"?focusY:0);
    return w.angle;
  }
  return Math.PI*0.10+Math.sin(windT*0.65)*0.52+Math.sin(windT*1.25)*0.10;
}
function leafWindPower(){
  if(typeof windFieldPowerAt==="function") return clamp(windFieldPowerAt(typeof focusX!=="undefined"?focusX:0, typeof focusY!=="undefined"?focusY:0)*2.2,0,1);
  return clamp(windAmp*3.6+windGust*0.72,0,1);
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

