/* TOPDOWN CITY — 43-puddle-water.js — bridge: PuddleWaterSim library → rain puddles */

let puddleWaterSim=null;

function ensurePuddleWater(){
  if(puddleWaterSim!==null) return puddleWaterSim.ok?puddleWaterSim:null;
  if(typeof PuddleWaterSim==="undefined"){ puddleWaterSim={ok:false}; return null; }
  puddleWaterSim=new PuddleWaterSim({size:208});
  if(!puddleWaterSim.ok){ puddleWaterSim={ok:false}; return null; }
  return puddleWaterSim;
}

function updatePuddleWaterSim(dt){
  const sim=ensurePuddleWater();
  if(!sim) return;
  const N=typeof nightFactor!=="undefined"?nightFactor(gameHour):0.35;
  sim.setNight(N);
  sim.step(dt);
  if(weatherI>0.10&&Math.random()<dt*7*weatherI) sim.randomRipple();
  if(weatherI>0.28){
    for(const p of rainPuddles){
      if(Math.random()<dt*0.42*weatherI) sim.splashAtWorld(p.x,p.y,0.05+weatherI*0.06);
    }
  }
}

function drawPuddleBodySim(sim,p,rx,ry,a){
  const [gr,gg,gb]=puddleGroundTint(p.x,p.y);
  sim.setTint((gr+40)/255,(gg+55)/255,(gb+75)/255);
  const S=sim.size;
  const uo=((p.x*0.016+puddleT*0.13)%1+1)%1;
  const vo=((p.y*0.013-puddleT*0.09)%1+1)%1;
  const crop=S*0.78;
  const sx=uo*(S-crop), sy=vo*(S-crop);

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
  ctx.drawImage(sim.canvas,sx,sy,crop,crop,-rx,-ry,rx*2,ry*2);

  ctx.globalCompositeOperation="soft-light";
  ctx.fillStyle=`rgba(${gr},${gg},${gb},0.22)`;
  ctx.fillRect(-rx,-ry,rx*2,ry*2);
  ctx.globalCompositeOperation="source-over";

  ctx.globalAlpha=a*0.9;
  ctx.strokeStyle=`rgba(190,225,248,${0.32.toFixed(3)})`;
  ctx.lineWidth=1.0;
  ctx.beginPath(); ctx.ellipse(0,0,rx*0.98,ry*0.98,0,0,7); ctx.stroke();
  ctx.restore();
}

const _drawPuddleBodyOrig=typeof drawPuddleBody==="function"?drawPuddleBody:null;
function drawPuddleBody(p){
  const {rx,ry}=puddleDims(p);
  if(rx<1.2||ry<0.8) return;
  const a=clamp(0.35+0.65*wetness*(p.size!=null?p.size:1),0,1);
  const sim=ensurePuddleWater();
  if(sim) drawPuddleBodySim(sim,p,rx,ry,a);
  else if(_drawPuddleBodyOrig) _drawPuddleBodyOrig(p);
}

Game.register({
  id:"puddle-water",
  order:43,
  update(dt){
    if(typeof gamePhase!=="undefined"&&gamePhase!=="playing") return;
    if(wetness<0.02&&weatherI<0.08) return;
    updatePuddleWaterSim(dt);
  },
});
