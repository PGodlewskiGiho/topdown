/* TOPDOWN CITY — 43-puddle-water.js — PuddleWaterSim: puddles, lakes, rivers, wet roads */

let puddleWaterSim=null;

function waterSimShouldRun(){
  const w=typeof weatherI!=="undefined"?weatherI:0;
  const wet=typeof wetness!=="undefined"?wetness:0;
  return w>=0.22 || wet>=0.32;
}

function getWaterSim(){
  if(puddleWaterSim!==null) return puddleWaterSim.ok?puddleWaterSim:null;
  if(typeof PuddleWaterSim==="undefined"){ puddleWaterSim={ok:false}; return null; }
  puddleWaterSim=new PuddleWaterSim({size:192});
  if(!puddleWaterSim.ok){ puddleWaterSim={ok:false}; return null; }
  return puddleWaterSim;
}

function waterSimCrop(sim,wx,wy,uScale,vScale){
  const S=sim.size, crop=S*0.82;
  const us=uScale!=null?uScale:0.011;
  const vs=vScale!=null?vScale:0.009;
  const uo=((wx*us+sim.t*0.38)%1+1)%1;
  const vo=((wy*vs-sim.t*0.22)%1+1)%1;
  return {sx:uo*(S-crop), sy:vo*(S-crop), crop};
}

function drawWaterSimTiled(ox,oy,ww,hh,preset,alpha,uScale){
  const sim=getWaterSim();
  if(!sim||!waterSimShouldRun()) return;
  sim.setPreset(preset||"lake");
  const a=alpha!=null?alpha:0.7;
  const tile=144, S=sim.size, crop=S*0.82;
  const us=uScale!=null?uScale:0.007;
  ctx.save();
  ctx.globalAlpha=a;
  ctx.globalCompositeOperation="source-over";
  for(let y=Math.floor(oy/tile)*tile; y<oy+hh+tile; y+=tile){
    for(let x=Math.floor(ox/tile)*tile; x<ox+ww+tile; x+=tile){
      const c=waterSimCrop(sim,x,y,us,us*0.88);
      ctx.drawImage(sim.canvas,c.sx,c.sy,c.crop,c.crop,x,y,tile,tile);
    }
  }
  ctx.restore();
}

function applyWaterSimInClip(preset,alpha,uScale,ox,oy,ww,hh){
  if(!waterSimShouldRun()) return;
  const sim=getWaterSim();
  if(!sim) return;
  sim.setPreset(preset||"lake");
  const vx=ox!=null?ox:(typeof cam!=="undefined"?cam.x-VW/2:0);
  const vy=oy!=null?oy:(typeof cam!=="undefined"?cam.y-VH/2:0);
  const vw=ww!=null?ww:(typeof VW!=="undefined"?VW:1280);
  const vh=hh!=null?hh:(typeof VH!=="undefined"?VH:720);
  drawWaterSimTiled(vx-128, vy-128, vw+256, vh+256, preset, alpha!=null?alpha:0.62, uScale);
}

function drawWetRoadReflections(ox,oy){}

function updatePuddleWaterSim(dt){
  const sim=getWaterSim();
  if(!sim||!waterSimShouldRun()) return;
  const N=typeof nightFactor!=="undefined"?nightFactor(gameHour):0.35;
  sim.setNight(N);
  sim.setPreset("puddle");
  sim.step(dt);
  if(weatherI>0.22&&Math.random()<dt*4*weatherI) sim.randomRipple();
}

function drawPuddleBodySim(sim,p,rx,ry,a){
  const [gr,gg,gb]=puddleGroundTint(p.x,p.y);
  sim.setPreset("puddle");
  const c=waterSimCrop(sim,p.x,p.y,0.016,0.013);

  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(p.a||0);

  const bleed=ctx.createRadialGradient(0,0,Math.max(rx,ry)*0.48,0,0,Math.max(rx,ry)*1.14);
  bleed.addColorStop(0,`rgba(${gr+6},${gg+10},${gb+16},${(0.12*a).toFixed(3)})`);
  bleed.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=bleed;
  ctx.beginPath(); ctx.ellipse(0,0,rx*1.08,ry*1.08,0,0,7); ctx.fill();

  ctx.globalAlpha=a;
  ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,7); ctx.clip();
  ctx.drawImage(sim.canvas,c.sx,c.sy,c.crop,c.crop,-rx,-ry,rx*2,ry*2);

  ctx.globalCompositeOperation="soft-light";
  ctx.fillStyle=`rgba(${gr},${gg},${gb},0.18)`;
  ctx.fillRect(-rx,-ry,rx*2,ry*2);
  ctx.globalCompositeOperation="source-over";
  ctx.restore();
}

function drawPuddleBody(p){}

let _waterSimFrame=0;
Game.register({
  id:"puddle-water",
  order:43,
  update(dt){
    if(typeof gamePhase!=="undefined"&&gamePhase!=="playing") return;
    if(!waterSimShouldRun()) return;
    _waterSimFrame++;
    const heavy=(typeof weatherI!=="undefined"&&weatherI>=0.45)||(typeof wetness!=="undefined"&&wetness>=0.5);
    if(!heavy&&_waterSimFrame%4) return;
    const sim=getWaterSim();
    if(sim) sim.step(heavy?dt:dt*2);
  },
});
