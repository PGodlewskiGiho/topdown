/* TOPDOWN CITY — 25-rivers.js */
/* Forest rivers — clear stream texture + downhill flow animation */

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

function clipWaterPolys(polys){
  ctx.beginPath();
  for(const q of polys){ ctx.moveTo(q[0][0],q[0][1]); for(let k=1;k<q.length;k++) ctx.lineTo(q[k][0],q[k][1]); ctx.closePath(); }
}

function drawRiverFlowTexture(ox,oy,t){
  const step=14, x0=ox-step, y0=oy-step, x1=ox+VW+step, y1=oy+VH+step;
  const spd=38;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let gy=y0; gy<y1; gy+=step){
    for(let gx=x0; gx<x1; gx+=step){
      const cx=gx+step*0.5, cy=gy+step*0.5;
      if(riverScore(cx,cy)<=0) continue;
      const [ci,cj]=cellAt(cx,cy);
      if(biomeOf(ci,cj)!=="forest") continue;
      const [fx,fy]=riverFlowAt(cx,cy);
      const ph=(cx*fx+cy*fy)*0.045 - t*spd;
      const band=0.5+0.5*Math.sin(ph);
      if(band<0.42) continue;
      const al=(0.04+0.14*band).toFixed(3);
      ctx.strokeStyle=`rgba(210,248,255,${al})`;
      ctx.lineWidth=1.1+1.4*band;
      ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo(cx-fx*step*0.55, cy-fy*step*0.55);
      ctx.lineTo(cx+fx*step*0.75, cy+fy*step*0.75);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation="source-over";
  ctx.lineCap="butt";

  // pebble / gravel bed visible through shallow water
  ctx.globalAlpha=0.42;
  const peb=getTex("riverbed");
  if(peb){
    const S=160, dx=-((t*18)%S), dy=-((t*11)%S);
    ctx.save(); ctx.translate(dx,dy); ctx.fillStyle=peb;
    for(let gy=Math.floor(y0/48)*48; gy<y1; gy+=48){
      for(let gx=Math.floor(x0/48)*48; gx<x1; gx+=48){
        if(riverScore(gx+24,gy+24)<=0.05) continue;
        ctx.fillRect(gx,gy,48,48);
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

function drawRiverSparkles(ox,oy,t){
  const sg=34;
  ctx.save(); ctx.globalCompositeOperation="lighter";
  for(let sy=Math.floor(oy/sg)*sg; sy<oy+VH; sy+=sg){
    for(let sx=Math.floor(ox/sg)*sg; sx<ox+VW; sx+=sg){
      const px=sx+hsh(Math.floor(sx/sg),Math.floor(sy/sg),441)*sg*0.7;
      const py=sy+hsh(Math.floor(sx/sg),Math.floor(sy/sg),442)*sg*0.7;
      if(riverScore(px,py)<=0.08) continue;
      const [fx,fy]=riverFlowAt(px,py);
      const drift=(t*42)%sg;
      const qx=px+fx*drift, qy=py+fy*drift;
      const tw=0.5+0.5*Math.sin(t*3.8+px*0.08+py*0.06);
      if(tw<0.55) continue;
      ctx.fillStyle=`rgba(230,255,250,${(0.06+0.18*tw).toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(qx,qy,2.2,1,Math.atan2(fy,fx),0,7); ctx.fill();
    }
  }
  ctx.restore();
}

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
  const step=22, t=performance.now()/1000;
  const {polys,bnd}=collectWaterPolys(riverScore, ox, oy, step);
  if(!polys.length) return;

  clipWaterPolys(polys);
  const wg=ctx.createLinearGradient(0,oy,0,oy+VH);
  wg.addColorStop(0,"#3a8a78"); wg.addColorStop(0.45,"#2e7268"); wg.addColorStop(1,"#255e58");
  ctx.fillStyle=wg; ctx.fill();

  ctx.save(); ctx.clip();
  if(typeof applyWaterPattern==="function") applyWaterPattern("water_river",ox,oy,t,0.68,1.35);
  if(typeof tintWaterDepth==="function") tintWaterDepth(polys,riverScore,[6,30,26],[50,120,100]);
  else for(const q of polys){
    let cx=0,cy=0; for(const p of q){ cx+=p[0]; cy+=p[1]; } cx/=q.length; cy/=q.length;
    const depth=clamp(riverScore(cx,cy)*2.2, 0.15, 1);
    ctx.fillStyle=`rgba(8,32,28,${(0.12+depth*0.18).toFixed(3)})`;
    ctx.beginPath(); ctx.moveTo(q[0][0],q[0][1]); for(let k=1;k<q.length;k++) ctx.lineTo(q[k][0],q[k][1]); ctx.closePath(); ctx.fill();
  }
  drawRiverFlowTexture(ox,oy,t);
  drawRiverSparkles(ox,oy,t);

  ctx.strokeStyle="rgba(14,48,42,0.22)"; ctx.lineWidth=1.4; ctx.lineCap="round";
  const rs=26, x0=ox-rs, y0=oy-rs, x1=ox+VW+rs, y1=oy+VH+rs;
  for(let gy=y0; gy<y1; gy+=rs){
    for(let gx=x0; gx<x1; gx+=rs){
      const cx=gx+rs*0.5, cy=gy+rs*0.5;
      if(riverScore(cx,cy)<=0) continue;
      const [fx,fy]=riverFlowAt(cx,cy), px=-fy, py=fx;
      const wave=Math.sin((cx*fx+cy*fy)*0.06 - t*2.8)*3.2;
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
