/* TOPDOWN CITY — 24-terrain.js */
/* Uneven ground — relief shading + slope physics (height field from 01-world.js) */

const TERRAIN_SLOPE_WALK = 0.0048;
const TERRAIN_SLOPE_CAR  = 0.0034;
const TERRAIN_SLOPE_HARD = 0.0064;

const TERRAIN_PAL={
  forest:{lo:[28,52,30], mid:[42,78,44], hi:[58,102,58]},
  desert:{lo:[158,128,78], mid:[178,148,92], hi:[198,168,108]},
  sea:   {lo:[168,138,82], mid:[178,148,88], hi:[192,162,98]},
  city:  {lo:[58,86,52], mid:[66,96,58], hi:[74,106,64]},
};

function terrainReliefStep(){ return ZOOM>1.65?16:ZOOM>1.15?20:28; }
function terrainLotSkip(L){ return L.water||L.mountain||L.parking||L.mega||L.salon||L.gunshop||L.motodealer; }

function terrainPalette(biome, elev, shade){
  const pal=TERRAIN_PAL[biome]||TERRAIN_PAL.forest;
  const t=clamp((elev-0.22)/0.58, 0, 1);
  const r=(pal.lo[0]+(pal.hi[0]-pal.lo[0])*t)*shade;
  const g=(pal.lo[1]+(pal.hi[1]-pal.lo[1])*t)*shade;
  const b=(pal.lo[2]+(pal.hi[2]-pal.lo[2])*t)*shade;
  return [r|0, g|0, b|0];
}

function terrainSteepAt(x,y, max){ return !inWater(x,y) && terrainSlope(x,y)>max; }

function terrainSpeedFactor(x,y, vx, vy){
  const g=terrainGrad(x,y), sp=Math.hypot(g[0],g[1]);
  if(sp<0.00025) return 1;
  const spd=Math.hypot(vx,vy);
  if(spd<0.4) return 1;
  const uphill=(vx*g[0]+vy*g[1])/(spd*sp);               // >0 = climbing
  if(uphill>0) return clamp(1-uphill*sp*95, 0.52, 1);
  return clamp(1-uphill*sp*38, 1, 1.14);               // slight downhill run
}

function collideTerrain(e, maxSlope, bounce){
  if(inWater(e.x,e.y)) return;
  const g=terrainGrad(e.x,e.y), sp=Math.hypot(g[0],g[1]);
  if(sp<maxSlope) return;
  const ux=-g[0]/sp, uy=-g[1]/sp;                      // uphill unit
  const into=e.vx*ux+e.vy*uy;
  if(into<=0) return;
  const pen=Math.min(14, (sp-maxSlope)*2800);
  e.x-=ux*pen; e.y-=uy*pen;
  e.vx-=ux*into*(1+bounce);
  e.vy-=uy*into*(1+bounce);
}

function resolveTerrainBlock(e, px, py, maxSlope){
  if(!terrainSteepAt(px,py, maxSlope)) return false;
  e.x=px; e.y=py;
  const g=terrainGrad(e.x,e.y), sp=Math.hypot(g[0],g[1])||1;
  e.vx-=g[0]/sp*Math.max(0, e.vx*g[0]/sp+e.vy*g[1]/sp)*0.85;
  e.vy-=g[1]/sp*Math.max(0, e.vx*g[0]/sp+e.vy*g[1]/sp)*0.85;
  return true;
}

function drawTerrainRelief(ox,oy){
  const step=terrainReliefStep();
  const x0=Math.floor(ox/step)*step-step, y0=Math.floor(oy/step)*step-step;
  const x1=ox+VW+step*2, y1=oy+VH+step*2;
  const Sun=sunShadow(gameHour);
  const lx=Sun?-0.58:-0.46, ly=Sun?-0.72:-0.58;

  ctx.save();
  for(let gy=y0; gy<y1; gy+=step){
    for(let gx=x0; gx<x1; gx+=step){
      const cx=gx+step*0.5, cy=gy+step*0.5;
      if(inWater(cx,cy)) continue;
      const [ci,cj]=cellAt(cx,cy);
      const L=getLot(ci,cj);
      if(terrainLotSkip(L)) continue;

      const v00=terrainScore(gx,gy), v10=terrainScore(gx+step,gy);
      const v11=terrainScore(gx+step,gy+step), v01=terrainScore(gx,gy+step);
      const elev=(v00+v10+v11+v01)*0.25;
      const dzdx=((v10+v11)-(v00+v01))*0.5, dzdy=((v01+v11)-(v00+v10))*0.5;
      const nx=-dzdx/step, ny=-dzdy/step, nz=0.85;
      const nl=Math.hypot(nx,ny,nz)||1;
      const shade=clamp(0.78+0.26*((nx*lx+ny*ly)/nl), 0.62, 1.08);
      const rgb=terrainPalette(L.biome, elev, shade);
      const valley=elev<0.42?(0.42-elev)*0.38:0;
      const ar=Math.max(0,rgb[0]*(1-valley)), ag=Math.max(0,rgb[1]*(1-valley)), ab=Math.max(0,rgb[2]*(1-valley*0.85));
      const alpha=L.biome==="city"?0.22:0.40;
      ctx.fillStyle=`rgba(${ar|0},${ag|0},${ab|0},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(gx,gy); ctx.lineTo(gx+step,gy); ctx.lineTo(gx+step,gy+step); ctx.lineTo(gx,gy+step);
      ctx.closePath(); ctx.fill();
    }
  }

  // ridge highlights + slope creases on steeper ground
  ctx.lineCap="round";
  for(let gy=y0; gy<y1; gy+=step*2){
    for(let gx=x0; gx<x1; gx+=step*2){
      const cx=gx+step, cy=gy+step;
      if(inWater(cx,cy)) continue;
      const sl=terrainSlope(cx,cy);
      if(sl<0.0022) continue;
      const [ci,cj]=cellAt(cx,cy);
      if(terrainLotSkip(getLot(ci,cj))) continue;
      const g=terrainGrad(cx,cy), gl=Math.hypot(g[0],g[1])||1;
      const px=-g[1]/gl, py=g[0]/gl;
      const el=terrainScore(cx,cy);
      if(sl>0.0034){
        ctx.strokeStyle=`rgba(18,22,16,${Math.min(0.22,(sl-0.0028)*48).toFixed(3)})`;
        ctx.lineWidth=1.1;
        ctx.beginPath(); ctx.moveTo(cx-px*step*0.55,cy-py*step*0.55); ctx.lineTo(cx+px*step*0.55,cy+py*step*0.55); ctx.stroke();
      }
      if(el>0.58 && sl<0.003){
        ctx.strokeStyle=`rgba(255,255,240,${(0.08+(el-0.58)*0.22).toFixed(3)})`;
        ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.moveTo(cx-px*8,cy-py*8); ctx.lineTo(cx+px*8,cy+py*8); ctx.stroke();
      }
    }
  }
  ctx.lineCap="butt";
  ctx.restore();
}

function drawMountainRelief(ox,oy){
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  const Sun=sunShadow(gameHour);
  const lx=Sun?-0.55:-0.42, ly=Sun?-0.68:-0.55;
  ctx.save();
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const L=getLot(i,j);
    if(!L.mountain) continue;
    const step=22, x0=L.x, y0=L.y, x1=L.x+L.w, y1=L.y+L.h;
    for(let gy=y0; gy<y1; gy+=step) for(let gx=x0; gx<x1; gx+=step){
      const v00=terrainScore(gx,gy), v10=terrainScore(Math.min(x1,gx+step),gy);
      const v11=terrainScore(Math.min(x1,gx+step),Math.min(y1,gy+step)), v01=terrainScore(gx,Math.min(y1,gy+step));
      const elev=(v00+v10+v11+v01)*0.25;
      const dzdx=((v10+v11)-(v00+v01))*0.5, dzdy=((v01+v11)-(v00+v10))*0.5;
      const nx=-dzdx/step, ny=-dzdy/step, nz=1.1;
      const nl=Math.hypot(nx,ny,nz)||1;
      const shade=clamp(0.72+0.30*((nx*lx+ny*ly)/nl), 0.58, 1.12);
      const r=(92*shade)|0, g=(88*shade)|0, b=(78*shade)|0;
      ctx.fillStyle=`rgba(${r},${g},${b},0.42)`;
      ctx.beginPath();
      ctx.moveTo(gx,gy); ctx.lineTo(Math.min(x1,gx+step),gy);
      ctx.lineTo(Math.min(x1,gx+step),Math.min(y1,gy+step)); ctx.lineTo(gx,Math.min(y1,gy+step));
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
