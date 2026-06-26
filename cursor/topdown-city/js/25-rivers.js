/* TOPDOWN CITY — 25-rivers.js */
/* Forest rivers — clear stream texture + downhill flow animation + current */

function riverFlowAt(x,y){
  const g=terrainGrad(x,y);
  let fx=-g[0], fy=-g[1], fl=Math.hypot(fx,fy);
  if(fl>0.0004){ fx/=fl; fy/=fl; }
  else {
    const e=10, rsx=riverScore(x+e,y)-riverScore(x-e,y), rsy=riverScore(x,y+e)-riverScore(x,y-e);
    fl=Math.hypot(rsx,rsy)||1; fx=rsx/fl; fy=rsy/fl;
  }
  const wob=Math.sin(x*0.022+y*0.017)*0.12;
  return [fx-wob*fy, fy+wob*fx];
}

function inRiverCurrent(x,y){
  const r=riverScore(x,y);
  if(r<=0.04) return false;
  return r>=lakeScore(x,y)*0.82;
}

function riverCurrentAt(x,y){
  if(!inRiverCurrent(x,y)) return null;
  const r=riverScore(x,y);
  const [fx,fy]=riverFlowAt(x,y);
  const depth=clamp(r*2.8,0.15,1);
  return {fx,fy,speed:34+depth*62,depth};
}

function applyRiverCurrentXY(x,y,dt,mult){
  const c=riverCurrentAt(x,y);
  if(!c) return [x,y];
  const m=mult!=null?mult:1;
  return [x+c.fx*c.speed*m*dt, y+c.fy*c.speed*m*dt];
}

const MAX_RIVER_DRIFT=96;
const riverDrift=[];
let riverDriftT=0;

function spawnRiverDrift(x,y){
  if(riverDrift.length>=MAX_RIVER_DRIFT) return;
  if(!inRiverCurrent(x,y)) return;
  const [fx,fy]=riverFlowAt(x,y);
  const kinds=["foam","foam","leaf","bubble"];
  riverDrift.push({
    x,y, fx,fy,
    kind:kinds[(Math.random()*kinds.length)|0],
    s:0.7+Math.random()*1.1,
    ph:Math.random()*6.28,
    life:6+Math.random()*14,
    maxLife:0,
  });
  riverDrift[riverDrift.length-1].maxLife=riverDrift[riverDrift.length-1].life;
}

function updateRiverDrift(dt){
  riverDriftT+=dt;
  const near=typeof nearForestRiver==="function"?nearForestRiver(focusX,focusY):inRiverCurrent(focusX,focusY);
  if(near&&riverDrift.length<MAX_RIVER_DRIFT){
    let budget=Math.ceil(dt*(10+Math.min(24,riverDrift.length*0.15)));
    while(budget-->0){
      const x=focusX+(Math.random()-0.5)*VW*0.95, y=focusY+(Math.random()-0.5)*VH*0.95;
      if(inRiverCurrent(x,y)) spawnRiverDrift(x,y);
    }
  }
  for(let i=riverDrift.length-1;i>=0;i--){
    const p=riverDrift[i];
    p.life-=dt;
    if(p.life<=0||!inRiverCurrent(p.x,p.y)){ riverDrift.splice(i,1); continue; }
    const c=riverCurrentAt(p.x,p.y);
    if(!c){ riverDrift.splice(i,1); continue; }
    const wob=Math.sin(riverDriftT*2.4+p.ph)*0.18;
    p.x+=(c.fx+wob*c.fy)*c.speed*dt;
    p.y+=(c.fy-wob*c.fx)*c.speed*dt;
    p.fx=c.fx; p.fy=c.fy;
  }
}

function drawRiverDrift(ox,oy,t){
  if(!riverDrift.length) return;
  ctx.save();
  for(const p of riverDrift){
    if(p.x<ox-30||p.x>ox+VW+30||p.y<oy-30||p.y>oy+VH+30) continue;
    const fade=clamp(p.life/p.maxLife,0,1);
    const ang=Math.atan2(p.fy,p.fx);
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(ang);
    ctx.globalAlpha=0.35+0.55*fade;
    if(p.kind==="leaf"){
      ctx.fillStyle="#4a6a32";
      ctx.beginPath(); ctx.ellipse(0,0,2.8*p.s,1.6*p.s,0.3,0,7); ctx.fill();
    } else if(p.kind==="bubble"){
      ctx.strokeStyle=`rgba(220,248,255,${(0.35*fade).toFixed(3)})`;
      ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.arc(0,0,1.4*p.s,0,7); ctx.stroke();
    } else {
      ctx.fillStyle=`rgba(235,252,255,${(0.5*fade).toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(0,0,3.2*p.s,1.3*p.s,0,0,7); ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

function drawRiverCurrentChevrons(ox,oy,t){
  const step=32, spd=48;
  ctx.save();
  ctx.lineCap="round"; ctx.lineJoin="round";
  for(let gy=oy-step; gy<oy+VH+step; gy+=step){
    for(let gx=ox-step; gx<ox+VW+step; gx+=step){
      const cx=gx+step*0.5, cy=gy+step*0.5;
      if(!inRiverCurrent(cx,cy)) continue;
      const [fx,fy]=riverFlowAt(cx,cy);
      const ph=(cx*fx+cy*fy)*0.05-t*spd;
      const band=0.5+0.5*Math.sin(ph);
      if(band<0.5) continue;
      const depth=clamp(riverScore(cx,cy)*2.4,0.2,1);
      const al=(0.06+0.16*band*depth).toFixed(3);
      const len=10+depth*8;
      const px=-fy, py=fx;
      ctx.strokeStyle=`rgba(180,235,255,${al})`;
      ctx.lineWidth=1.2+depth*0.8;
      for(const sgn of [-1,1]){
        const bx=cx+fx*len*0.35+px*sgn*4, by=cy+fy*len*0.35+py*sgn*4;
        ctx.beginPath();
        ctx.moveTo(cx+fx*len*0.1,cy+fy*len*0.1);
        ctx.lineTo(bx,by);
        ctx.lineTo(cx+fx*len*0.55,cy+fy*len*0.55);
        ctx.stroke();
      }
    }
  }
  ctx.lineCap="butt";
  ctx.restore();
}

function collectWaterPolys(scoreFn, ox, oy, step){
  const x0=ox-step, y0=oy-step, x1=ox+VW+step, y1=oy+VH+step;
  const polys=[], bnd=[];
  for(let gy=y0; gy<y1; gy+=step) for(let gx=x0; gx<x1; gx+=step){
    const v0=scoreFn(gx,gy), v1=scoreFn(gx+step,gy), v2=scoreFn(gx+step,gy+step), v3=scoreFn(gx,gy+step);
    if(v0<=0&&v1<=0&&v2<=0&&v3<=0) continue;
    const C=[[gx,gy],[gx+step,gy],[gx+step,gy+step],[gx,gy+step]], V=[v0,v1,v2,v3], poly=[], cr=[];
    for(let e=0;e<4;e++){ const a=C[e],va=V[e],b=C[(e+1)%4],vb=V[(e+1)%4];
      if(va>0) poly.push(a);
      if((va>0)!==(vb>0)){ const tt=va/(va-vb), px=a[0]+(b[0]-a[0])*tt, py=a[1]+(b[1]-a[1])*tt; poly.push([px,py]); cr.push([px,py]); } }
    if(poly.length>=3) polys.push(poly);
    if(cr.length===2) bnd.push(cr);
  }
  return {polys,bnd};
}

function drawRiverFlowTexture(ox,oy,t){
  const step=24, x0=ox-step, y0=oy-step, x1=ox+VW+step, y1=oy+VH+step;
  const spd=52;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let gy=y0; gy<y1; gy+=step){
    for(let gx=x0; gx<x1; gx+=step){
      const cx=gx+step*0.5, cy=gy+step*0.5;
      if(riverScore(cx,cy)<=0) continue;
      const [ci,cj]=cellAt(cx,cy);
      if(biomeOf(ci,cj)!=="forest") continue;
      const [fx,fy]=riverFlowAt(cx,cy);
      const depth=clamp(riverScore(cx,cy)*2.5,0.2,1);
      const ph=(cx*fx+cy*fy)*0.045 - t*spd;
      const band=0.5+0.5*Math.sin(ph);
      if(band<0.42) continue;
      const al=(0.04+0.12*band*depth).toFixed(3);
      ctx.strokeStyle=`rgba(210,248,255,${al})`;
      ctx.lineWidth=1.0+1.2*band*depth;
      ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo(cx-fx*step*0.55, cy-fy*step*0.55);
      ctx.lineTo(cx+fx*step*0.82, cy+fy*step*0.82);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation="source-over";
  ctx.lineCap="butt";
  ctx.restore();
}

function drawRiverSparkles(){}

function drawRiverBanks(bnd,t){
  if(!bnd.length) return;
  ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.strokeStyle="rgba(42,58,32,0.35)"; ctx.lineWidth=9;
  ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
  ctx.strokeStyle="rgba(88,72,48,0.42)"; ctx.lineWidth=5;
  ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
  const fa=0.42+0.16*Math.sin(t*3.2);
  ctx.strokeStyle=`rgba(196,228,210,${fa.toFixed(3)})`; ctx.lineWidth=2;
  ctx.beginPath(); for(const s of bnd){
    const mx=(s[0][0]+s[1][0])/2, my=(s[0][1]+s[1][1])/2;
    const [fx,fy]=riverFlowAt(mx,my), nx=-fy, ny=fx;
    ctx.moveTo(s[0][0]+nx*2,s[0][1]+ny*2); ctx.lineTo(s[1][0]+nx*2,s[1][1]+ny*2);
  } ctx.stroke();
  ctx.lineCap="butt"; ctx.lineJoin="miter";
}

function drawForestRivers(ox,oy){
  const step=30, t=performance.now()/1000;
  const {polys,bnd}=collectWaterPolys((x,y)=>riverDepthAt(x,y), ox, oy, step);
  if(!polys.length) return;

  clipWaterPolys(polys);
  const wg=ctx.createLinearGradient(0,oy,0,oy+VH);
  wg.addColorStop(0,"#3a8a78"); wg.addColorStop(0.45,"#2e7268"); wg.addColorStop(1,"#255e58");
  ctx.fillStyle=wg; ctx.fill();

  ctx.save(); ctx.clip();
  if(typeof applyWaterPattern==="function") applyWaterPattern("water_river_v2",ox,oy,t,0.62,1.2);
  if(typeof applyWaterSimInClip==="function") applyWaterSimInClip("river",0.38,0.008);
  if(typeof tintWaterDepth==="function") tintWaterDepth(polys,riverScore,[6,30,26],[50,120,100]);
  drawRiverFlowTexture(ox,oy,t);
  drawRiverCurrentChevrons(ox,oy,t);
  drawRiverDrift(ox,oy,t);

  ctx.strokeStyle="rgba(14,48,42,0.18)"; ctx.lineWidth=1.2; ctx.lineCap="round";
  const rs=34, x0=ox-rs, y0=oy-rs, x1=ox+VW+rs, y1=oy+VH+rs;
  for(let gy=y0; gy<y1; gy+=rs){
    for(let gx=x0; gx<x1; gx+=rs){
      const cx=gx+rs*0.5, cy=gy+rs*0.5;
      if(riverDepthAt(cx,cy)<=0) continue;
      const [fx,fy]=riverFlowAt(cx,cy), px=-fy, py=fx;
      const wave=Math.sin((cx*fx+cy*fy)*0.06 - t*2.8)*1.4;
      ctx.beginPath();
      ctx.moveTo(cx-px*rs*0.5+fx*wave, cy-py*rs*0.5+fy*wave);
      ctx.lineTo(cx+px*rs*0.5+fx*wave, cy+py*rs*0.5+fy*wave);
      ctx.stroke();
    }
  }
  ctx.lineCap="butt";
  ctx.restore();

  drawRiverBanks(bnd,t);
}

Game.register({
  id:"river-current",
  order:25,
  update(dt){
    if(typeof gamePhase!=="undefined"&&gamePhase!=="playing") return;
    updateRiverDrift(dt);
  },
});

function drawReed(p){
  ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a||0);
  const s=p.s;
  ctx.strokeStyle="#3a5a28"; ctx.lineWidth=1.4; ctx.lineCap="round";
  for(let k=-2;k<=2;k++){
    const ox=k*2.8, h=s*(0.85+Math.abs(k)*0.08);
    ctx.beginPath(); ctx.moveTo(ox,s*0.15); ctx.quadraticCurveTo(ox+k*1.2,-h*0.35, ox+k*0.4,-h); ctx.stroke();
  }
  ctx.fillStyle="#5a7a38";
  ctx.beginPath(); ctx.ellipse(0,s*0.1,s*0.35,s*0.14,0,0,7); ctx.fill();
  ctx.restore();
}
