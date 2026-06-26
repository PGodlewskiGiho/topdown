/* TOPDOWN CITY — 48-desert-sand.js — przesypywanie piasku + ślady na pustyni */

const MAX_SAND_GRAINS = 140;
const MAX_SAND_TRACKS = 720;
const sandGrains = [];
const sandTracks = [];
let sandSpawnT = 0;

function sandWindPower(){
  const w=typeof windAmp!=="undefined"?windAmp:0.12;
  const g=typeof windGust!=="undefined"?windGust:0;
  return clamp(0.22+w*2.4+g*0.85,0.15,1);
}
function sandWindDir(){
  const wt=typeof windT!=="undefined"?windT:0;
  return Math.PI*0.08+Math.sin(wt*0.72)*0.48+Math.sin(wt*1.35)*0.12;
}

function nearDesertRoad(x,y,maxD){
  const[ci,cj]=cellAt(x,y);
  let best=999;
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    for(const[di,dj]of[[1,0],[0,1]]){
      const e=getEdge(i,j,di,dj);
      if(!e.exists||e.bridge) continue;
      const g=edgeGeom(i,j,i+di,j+dj);
      for(let t=0;t<=1.001;t+=0.14){
        const pt=bez(g.p0,g.cp,g.p1,t);
        const d=Math.hypot(pt[0]-x,pt[1]-y);
        if(d<best) best=d;
      }
    }
  }
  return best<(maxD!=null?maxD:72);
}

function onDesertSand(x,y){
  const[ci,cj]=cellAt(x,y);
  if(biomeOf(ci,cj)!=="desert"||isMountain(ci,cj)) return false;
  if(inWater(x,y)) return false;
  if(nearDesertRoad(x,y,58)) return false;
  if(typeof terrainSlope==="function"&&terrainSlope(x,y)>0.0046) return false;
  return true;
}

function pushSandTrack(x,y,a,w,h,kind,depth){
  sandTracks.push({
    x,y,a,
    w:w||5, h:h||3.2,
    kind:kind||"foot",
    depth:depth!=null?depth:0.5,
    life:1, a0:kind==="tire"?0.52:0.58,
  });
  while(sandTracks.length>MAX_SAND_TRACKS) sandTracks.shift();
}

function emitFootSandTracks(ent, dt){
  const spd=Math.hypot(ent.vx,ent.vy);
  if(spd<18) return;
  if(!onDesertSand(ent.x,ent.y)) return;
  ent._sandD=(ent._sandD||0)+spd*dt;
  const step=spd>120?22:30;
  if(ent._sandD<step) return;
  ent._sandD=0;
  ent._sandStep=(ent._sandStep|0)+1;
  const a=Math.atan2(ent.vy,ent.vx);
  const nx=-Math.sin(a), ny=Math.cos(a);
  const side=ent._sandStep%2?1:-1;
  const off=ent.r!=null?ent.r*0.55:5;
  pushSandTrack(
    ent.x+nx*off*side, ent.y+ny*off*side,
    a+Math.PI*0.5, 3.2+spd*0.008, 5.5+spd*0.01, "foot", clamp(spd/140,0.35,0.9)
  );
}

function emitTireSandTracks(ent, dt){
  const spd=Math.hypot(ent.vx,ent.vy);
  if(spd<8) return;
  if(!onDesertSand(ent.x,ent.y)) return;
  ent._sandD=(ent._sandD||0)+spd*dt;
  const step=clamp(28-spd*0.04,12,34);
  if(ent._sandD<step) return;
  ent._sandD=0;
  const a=ent.a!=null?ent.a:Math.atan2(ent.vy,ent.vx);
  const c=Math.cos(a), s=Math.sin(a);
  const halfW=(ent.W||36)*0.34;
  const depth=clamp(spd/90,0.3,1);
  const w=3.8+depth*4.2, h=10+depth*14;
  pushSandTrack(ent.x-s*halfW, ent.y+c*halfW, a, w, h, "tire", depth);
  pushSandTrack(ent.x+s*halfW, ent.y-c*halfW, a, w, h, "tire", depth);
}

function spawnSandGrain(){
  const p=sandWindPower(), wd=sandWindDir();
  const back=Math.max(VW,VH)*0.55+rand(30,140);
  const x=focusX-Math.cos(wd)*back+(rng()-0.5)*VW*0.9;
  const y=focusY-Math.sin(wd)*back*0.45+(rng()-0.5)*VH*0.9;
  if(!onDesertSand(x,y)) return null;
  const lift=rng();
  return {
    x,y,
    vx:Math.cos(wd)*rand(36,110)*p,
    vy:Math.sin(wd)*rand(10,38)*p+rand(-6,8),
    s:0.7+rng()*1.6,
    z:lift<0.25?0:rand(2,16)*p,
    life:rand(4,11), maxLife:0,
    phase:rng()*6.28,
    col:["#c8a868","#b89858","#d8b878","#a88848","#e0c890"][(rng()*5)|0],
  };
}

function updateSandGrains(dt){
  const desert=onDesertSand(focusX,focusY);
  const p=sandWindPower(), wd=sandWindDir();
  const gust=0.5+0.5*Math.sin((typeof windT!=="undefined"?windT:0)*2.2)+((typeof windGust!=="undefined"?windGust:0)*0.4);
  const push=18+p*88*gust;
  for(let i=sandGrains.length-1;i>=0;i--){
    const g=sandGrains[i];
    g.life-=dt*(desert?1:2.4);
    if(g.life<=0){ sandGrains.splice(i,1); continue; }
    const flutter=Math.sin((typeof windT!=="undefined"?windT:0)*4.2+g.phase)*p*8;
    g.vx+=Math.cos(wd)*push*dt+flutter*dt;
    g.vy+=Math.sin(wd)*push*0.32*dt+Math.sin(g.phase*2.1)*2.8*dt;
    g.vx*=Math.pow(0.88,dt*60);
    g.vy*=Math.pow(0.91,dt*60);
    g.x+=g.vx*dt;
    g.y+=g.vy*dt;
    if(!onDesertSand(g.x,g.y)||Math.hypot(g.x-focusX,g.y-focusY)>Math.max(VW,VH)*0.8+240){
      sandGrains.splice(i,1);
    }
  }
  if(!desert||perfEffectiveVw()>1700) return;
  const target=Math.round(8+Math.pow(p,1.1)*48);
  sandSpawnT-=dt;
  if(sandGrains.length<target&&sandSpawnT<=0){
    sandSpawnT=rand(0.04,0.14)/(0.4+p*1.2);
    const nb=spawnSandGrain();
    if(nb){ nb.maxLife=nb.life; sandGrains.push(nb); if(sandGrains.length>MAX_SAND_GRAINS) sandGrains.shift(); }
  }
}

function updateSandTracks(dt){
  const cover=0.0022+sandWindPower()*0.0035;
  for(let i=sandTracks.length-1;i>=0;i--){
    const t=sandTracks[i];
    t.life-=dt*cover*(0.35+t.depth*0.25);
    if(t.life<=0) sandTracks.splice(i,1);
  }
}

function updateSandEmitters(dt){
  if(typeof gamePhase!=="undefined"&&gamePhase!=="playing") return;
  if(mode==="foot") emitFootSandTracks(ped,dt);
  else if(mode==="car"&&!car.dead) emitTireSandTracks(car,dt);
  for(const c of traffic){
    if(c.state!=="drive"&&c.state!=="loose") continue;
    if(Math.hypot(c.x-focusX,c.y-focusY)>Math.max(VW,VH)*0.65) continue;
    emitTireSandTracks(c,dt*0.85);
  }
  for(const p of peds){
    if(p.state==="down") continue;
    if(Math.hypot(p.x-focusX,p.y-focusY)>Math.max(VW,VH)*0.55) continue;
    emitFootSandTracks(p,dt*0.9);
  }
}

function drawSandTrack(t){
  const alpha=t.a0*t.life;
  if(alpha<0.02) return;
  ctx.save();
  ctx.translate(t.x,t.y);
  ctx.rotate(t.a);
  if(t.kind==="tire"){
    ctx.fillStyle=`rgba(72,54,34,${(alpha*0.55).toFixed(3)})`;
    ctx.fillRect(-t.h*0.5,-t.w*0.5,t.h,t.w);
    ctx.fillStyle=`rgba(98,76,48,${(alpha*0.28).toFixed(3)})`;
    for(let k=-2;k<=2;k++){
      ctx.fillRect(-t.h*0.46+k*t.h*0.22,-t.w*0.38,1.2,t.w*0.76);
    }
    ctx.fillStyle=`rgba(42,32,22,${(alpha*0.22).toFixed(3)})`;
    ctx.fillRect(-t.h*0.5,-t.w*0.5,t.h,t.w*0.35);
  } else {
    ctx.fillStyle=`rgba(82,62,40,${(alpha*0.5).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(0,0,t.w*0.5,t.h*0.5,0,0,7);
    ctx.fill();
    ctx.fillStyle=`rgba(58,44,30,${(alpha*0.35).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(0,t.h*0.08,t.w*0.35,t.h*0.28,0,0,7);
    ctx.fill();
  }
  ctx.restore();
}

function drawSandTracks(ox,oy){
  if(!sandTracks.length) return;
  for(const t of sandTracks){
    if(t.x<ox-40||t.x>ox+VW+40||t.y<oy-40||t.y>oy+VH+40) continue;
    drawSandTrack(t);
  }
}

function drawSandGrain(g){
  const fade=clamp(g.life/g.maxLife,0,1);
  const bob=Math.sin((typeof windT!=="undefined"?windT:0)*3.6+g.phase)*0.4;
  ctx.save();
  ctx.translate(g.x,g.y-g.z*0.08+bob);
  ctx.globalAlpha=0.35+0.55*fade;
  ctx.fillStyle=g.col;
  ctx.beginPath();
  ctx.ellipse(0,0,g.s,g.s*0.55,0.2,0,7);
  ctx.fill();
  if(g.s>1.1){
    ctx.strokeStyle=`rgba(255,230,190,${(0.25*fade).toFixed(3)})`;
    ctx.lineWidth=0.6;
    ctx.beginPath();
    ctx.moveTo(-g.s*1.8,0);
    ctx.lineTo(g.s*0.6,0);
    ctx.stroke();
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

function drawSandDriftStreaks(ox,oy){
  if(!onDesertSand(focusX,focusY)) return;
  const p=sandWindPower();
  if(p<0.2||perfEffectiveVw()>1700) return;
  const wd=sandWindDir(), t=performance.now()*0.001;
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(biomeOf(i,j)!=="desert") continue;
    const L=getLot(i,j);
    if(L.water||L.mountain) continue;
    const cx=L.x+L.w*0.5, cy=L.y+L.h*0.5;
    if(cx<ox-80||cx>ox+VW+80||cy<oy-80||cy>oy+VH+80) continue;
    const n=3+(p*5|0);
    for(let k=0;k<n;k++){
      const sx=L.x+hsh(i,j,880+k)*L.w, sy=L.y+hsh(i,j,900+k)*L.h;
      if(!onDesertSand(sx,sy)) continue;
      const len=18+p*42+hsh(i,j,920+k)*28;
      const wob=Math.sin(t*2.4+k+i*0.3)*3;
      ctx.strokeStyle=`rgba(220,190,130,${(0.04+p*0.07).toFixed(3)})`;
      ctx.lineWidth=1.2+p*1.8;
      ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo(sx+wob,sy);
      ctx.lineTo(sx+Math.cos(wd)*len+wob,sy+Math.sin(wd)*len*0.35);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation="source-over";
  ctx.lineCap="butt";
  ctx.restore();
}

function drawSandGrains(ox,oy){
  if(!sandGrains.length||perfEffectiveVw()>1700) return;
  for(const g of sandGrains){
    if(g.x<ox-20||g.x>ox+VW+20||g.y<oy-20||g.y>oy+VH+20) continue;
    drawSandGrain(g);
  }
}

Game.register({
  id:"desert-sand",
  order:48,
  update(dt){
    updateSandGrains(dt);
    updateSandTracks(dt);
    updateSandEmitters(dt);
  },
  drawAfterRoads(ox,oy){
    drawSandDriftStreaks(ox,oy);
    drawSandTracks(ox,oy);
  },
  drawWorldOverlay(ox,oy){
    drawSandGrains(ox,oy);
  },
});
