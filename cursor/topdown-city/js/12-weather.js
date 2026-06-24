/* TOPDOWN CITY — 12-weather.js */
/* ---------- weather (rain + puddles) ---------- */
const MAXRAIN=440;
const rain=[];
for(let i=0;i<MAXRAIN;i++) rain.push({x:Math.random()*2000, y:Math.random()*1300, l:8+Math.random()*9, s:720+Math.random()*420});
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
  const rx0=7+Math.random()*26, ry0=rx0*(0.42+Math.random()*0.32);
  rainPuddles.push({x,y,rx0,ry0,rx:2,ry:1,a:Math.random()*Math.PI,size:0.04,ripple:Math.random()*6.28,dyn:true});
}
function updateRainPuddles(dt){
  puddleT+=dt;
  const drying=weatherI<0.14;
  for(let i=rainPuddles.length-1;i>=0;i--){
    const p=rainPuddles[i];
    if(drying) p.size-=dt*(0.10+0.18*(1-weatherI));
    else if(weatherI>0.18) p.size=Math.min(1, p.size+dt*(0.12+weatherI*0.42));
    const d=puddleDims(p);
    p.rx=d.rx; p.ry=d.ry;
    if(p.size<=0.03){ rainPuddles.splice(i,1); continue; }
    if(weatherI>0.35) p.ripple=(p.ripple||0)+dt*(2.4+weatherI*3.2);
  }
  if(weatherI<0.22||rainPuddles.length>=MAX_RAIN_PUDDLES) return;
  let budget=Math.ceil(dt*(6+weatherI*28)*wetness);
  while(budget-->0){
    const x=focusX+(Math.random()-0.5)*VW*0.92, y=focusY+(Math.random()-0.5)*VH*0.92;
    if(!nearPavedSurface(x,y)) continue;
    const rx0=7+Math.random()*22, ry0=rx0*0.55;
    if(puddleTooClose(x,y,rx0,ry0)) continue;
    spawnRainPuddle(x,y);
    if(rainPuddles.length>=MAX_RAIN_PUDDLES) break;
  }
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
function drawPuddleBody(p){
  const {rx,ry}=puddleDims(p);
  if(rx<1.2||ry<0.8) return;
  const a=clamp(0.35+0.65*wetness*(p.size!=null?p.size:1),0,1);
  const [gr,gg,gb]=puddleGroundTint(p.x,p.y);
  const {px,py,rip}=puddleParallax(p);
  ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a||0);
  // wet asphalt bleed — puddle edge melts into ground colour
  const bleed=ctx.createRadialGradient(0,0,Math.max(rx,ry)*0.35, 0,0, Math.max(rx,ry)*1.18);
  bleed.addColorStop(0,`rgba(${gr},${gg},${gb},${(0.42*a).toFixed(3)})`);
  bleed.addColorStop(0.7,`rgba(${gr-8},${gg-8},${gb-6},${(0.18*a).toFixed(3)})`);
  bleed.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=bleed; ctx.beginPath(); ctx.ellipse(0,0,rx*1.12,ry*1.12,0,0,7); ctx.fill();
  const depth=ctx.createRadialGradient(px*0.3,py*0.2,Math.min(rx,ry)*0.08, px*0.1,py*0.15, Math.max(rx,ry));
  depth.addColorStop(0,`rgba(${gr+18},${gg+22},${gb+32},${(0.55*a).toFixed(3)})`);
  depth.addColorStop(0.45,`rgba(12,20,32,${(0.72*a).toFixed(3)})`);
  depth.addColorStop(1,`rgba(6,10,16,${(0.28*a).toFixed(3)})`);
  ctx.fillStyle=depth; ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,7); ctx.fill();
  ctx.strokeStyle=`rgba(${gr+70},${gg+80},${gb+95},${(0.22*a).toFixed(3)})`; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.ellipse(0,0,rx*0.97,ry*0.97,0,0,7); ctx.stroke();
  if(weatherI>0.2&&p.ripple!=null){
    const ripPh=(p.ripple+puddleT*2.4)%6.28;
    for(let k=0;k<3;k++){
      const ph=ripPh+k*1.7, r=0.28+((ph%6.28)/6.28)*0.72;
      ctx.strokeStyle=`rgba(200,220,245,${(0.09*a*(1-r)).toFixed(3)})`; ctx.lineWidth=0.9;
      ctx.beginPath(); ctx.ellipse(rip*r*0.4,0,rx*r*0.94,ry*r*0.94,0,0,7); ctx.stroke();
    }
  }
  const N=typeof nightFactor!=="undefined"?nightFactor(gameHour):0.35;
  const spec=lerp(210,120,N)|0;
  ctx.fillStyle=`rgba(${spec},${spec+10},${spec+24},${(0.14*a*(1-N*0.5)).toFixed(3)})`;
  ctx.beginPath(); ctx.ellipse(-rx*0.12+px*0.2,-ry*0.18+py*0.15,rx*0.38,ry*0.26,0,0,7); ctx.fill();
  ctx.restore();
}
function drawPuddleReflections(ox,oy){
  if(wetness<0.06) return;
  const puddles=collectPuddlesInView(ox,oy);
  if(!puddles.length) return;
  const N=typeof nightFactor!=="undefined"?nightFactor(gameHour):0.35;
  const skyTop=lerp(150,40,N)|0, skyMid=lerp(190,70,N)|0;
  const sun=typeof sunShadow!=="undefined"?sunShadow(gameHour):null;
  for(const p of puddles){
    const {rx,ry}=puddleDims(p);
    if(rx<2) continue;
    const str=clamp(0.2+0.85*wetness*(p.size!=null?p.size:1),0,1);
    const {px,py,rip}=puddleParallax(p);
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a||0);
    ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,7); ctx.clip();
    const sky=ctx.createLinearGradient(px*0.5,-ry+py*0.3, px*0.3,ry*0.4);
    sky.addColorStop(0,`rgba(${skyTop},${skyMid+20},${skyMid+40},${(0.32*str).toFixed(3)})`);
    sky.addColorStop(0.5,`rgba(${skyMid},${skyMid+10},${skyMid+30},${(0.12*str).toFixed(3)})`);
    sky.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=sky; ctx.beginPath(); ctx.ellipse(px*0.25,-ry*0.06+py*0.2,rx*0.94,ry*0.64,0,0,7); ctx.fill();
    if(sun&&N<0.72){
      const warm=`rgba(255,${200-(N*40|0)},${120-(N*30|0)},${(0.18*str*sun).toFixed(3)})`;
      ctx.fillStyle=warm;
      ctx.beginPath(); ctx.ellipse(px*0.4+rx*0.1,-ry*0.22,rx*0.28,ry*0.14,0,0,7); ctx.fill();
    }
    if(flash>0.02){
      ctx.fillStyle=`rgba(220,235,255,${(flash*0.38*str).toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(0,0,rx*0.7,ry*0.7,0,0,7); ctx.fill();
    }
    for(const b of collectPuddleBuildingRefs(p,rx,ry)){
      const dx=b.bx-p.x, dy=b.by-p.y;
      const fall=1-Math.hypot(dx,dy)/(rx*2.2+ry*1.8+b.bh);
      if(fall<=0) continue;
      const fa=0.22*str*fall*fall;
      const mx=dx*0.08+px*0.35, my=Math.abs(dy)*0.42+py*0.25+rip;
      const rw=Math.min(rx*0.9,b.bw*0.22), rh=Math.min(ry*0.85,b.bh*0.14);
      ctx.save(); ctx.translate(mx,my); ctx.globalAlpha=fa;
      ctx.fillStyle=b.roof; ctx.fillRect(-rw*0.5,-rh*0.35,rw,rh*0.4);
      ctx.fillStyle=b.wall; ctx.fillRect(-rw*0.5,rh*0.05,rw,rh*0.55);
      ctx.restore();
    }
    const reflectors=[];
    const pushRef=(x,y,w,h,ang,col,kind)=>{
      if(x<ox-120||x>ox+VW+120||y<oy-120||y>oy+VH+120) return;
      const dx=x-p.x, dy=y-p.y;
      if(Math.hypot(dx,dy)>rx*2.8+ry*2.2+50) return;
      reflectors.push({x,y,w,h,ang,col,kind,dx,dy});
    };
    if(typeof car!=="undefined"&&!car.dead) pushRef(car.x,car.y,car.W||36,car.L||80,car.a,car.color,"veh");
    for(const c of traffic){ if(!c.dead) pushRef(c.x,c.y,c.W||32,c.L||58,c.a,c.color,"veh"); }
    for(const c of cops){ if(!c.dead) pushRef(c.x,c.y,c.W||40,c.L||88,c.a,c.color,"veh"); }
    for(const ped of peds){ if(ped.state!=="down") pushRef(ped.x,ped.y,10,10,ped.a,ped.shirt||"#888","ped"); }
    const li0=Math.floor((ox-ROAD)/GAP)-1,li1=Math.floor((ox+VW)/GAP)+1,lj0=Math.floor((oy-ROAD)/GAP)-1,lj1=Math.floor((oy+VH)/GAP)+1;
    for(let i=li0;i<=li1;i++) for(let j=lj0;j<=lj1;j++){
      const L=getLot(i,j); if(!L.lamps) continue;
      for(const lm of L.lamps){ if(!lm.dead) pushRef(lm.hx,lm.hy,6,6,0,"#ffd898","lamp"); }
    }
    reflectors.sort((a,b)=>a.y-b.y);
    for(const r of reflectors){
      const dist=Math.hypot(r.dx,r.dy), fall=1-dist/(rx*2.6+ry*2+48);
      if(fall<=0) continue;
      const fa=0.20*str*fall*fall;
      const mx=r.dx*0.10+px*0.2, my=Math.abs(r.dy)*0.48+py*0.18+Math.sin(puddleT*3+r.dx*0.02)*0.6;
      ctx.save();
      ctx.translate(mx,my);
      ctx.globalAlpha=fa;
      if(r.kind==="lamp"){
        const g=ctx.createLinearGradient(0,-ry*0.4,0,ry*0.5);
        g.addColorStop(0,`rgba(255,220,160,${(0.9).toFixed(3)})`); g.addColorStop(1,"rgba(255,220,160,0)");
        ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,2.8,ry*0.45,0,0,7); ctx.fill();
      }else if(r.kind==="ped"){
        ctx.fillStyle=r.col;
        ctx.beginPath(); ctx.ellipse(0,0,3.2,2.2,r.ang,0,7); ctx.fill();
      }else{
        ctx.rotate(r.ang);
        ctx.fillStyle=r.col;
        ctx.beginPath(); ctx.ellipse(0,0,Math.max(4,r.w*0.34),Math.max(3,r.h*0.16),0,0,7); ctx.fill();
        ctx.fillStyle="rgba(255,240,210,0.55)";
        ctx.beginPath(); ctx.ellipse(r.h*0.08,0,2,1.2,0,0,7); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
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
  updateRainPuddles(dt);
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
  const i0=Math.floor((ox-ROAD)/GAP)-1,i1=Math.floor((ox+VW)/GAP)+1,j0=Math.floor((oy-ROAD)/GAP)-1,j1=Math.floor((oy+VH)/GAP)+1;
  ctx.save();
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const L=getLot(i,j);
    if(L.water||L.mountain||L.biome==="forest") continue;
    const cx=L.x+L.w*0.5, cy=L.y+L.h*0.5;
    if(cx<ox-80||cx>ox+VW+80||cy<oy-80||cy>oy+VH+80) continue;
    const paved=L.parking||L.biome==="city"||puddleAsphaltNear(cx,cy);
    if(!paved) continue;
    const a=(0.10+0.14*wetness).toFixed(3);
    ctx.fillStyle=`rgba(14,18,26,${a})`;
    ctx.fillRect(L.x,L.y,L.w,L.h);
  }
  ctx.restore();
  const puddles=collectPuddlesInView(ox,oy);
  for(const p of puddles) drawPuddleBody(p);
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

