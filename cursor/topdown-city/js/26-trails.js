/* TOPDOWN CITY — 26-trails.js */
/* Forest footpaths — worn earth that fades into the forest floor */

function isForestTrailEdge(i,j,di,dj){
  const e=getEdge(i,j,di,dj);
  return e.exists && !e.bridge && e.klass==="trail";
}
function forestTrailNode(i,j){
  if(biomeOf(i,j)!=="forest") return false;
  for(const[di,dj]of[[1,0],[0,1],[-1,0],[0,-1]]){
    const e=getEdge(i,j,di,dj);
    if(e.exists && e.klass==="trail") return true;
  }
  return false;
}

function trailRibbonPoints(p0,cp,p1, baseW, i,j,di,dj){
  const len=Math.hypot(p1[0]-p0[0],p1[1]-p0[1])||1;
  const steps=Math.max(12, Math.ceil(len/14));
  const left=[], right=[], centers=[];
  for(let s=0;s<=steps;s++){
    const t=s/steps;
    const p=bez(p0,cp,p1,t);
    const tan=bezTan(p0,cp,p1,t);
    const tl=Math.hypot(tan[0],tan[1])||1;
    const nx=-tan[1]/tl, ny=tan[0]/tl;
    const n1=hsh(Math.floor(p[0]/20),Math.floor(p[1]/20),521);
    const n2=hsh(Math.floor(p[0]/8),Math.floor(p[1]/8),523);
    const wob=0.78+n1*0.32+n2*0.18;
    const wave=Math.sin(t*13.7+hsh(i,j,525)*6.28)*0.14;
    const hw=baseW*(0.38+wob*0.22+wave);
    const edge=hsh(Math.floor(p[0]/11+di*3),Math.floor(p[1]/11+dj*5),527);
    const lOff=hw*(0.92+edge*0.22);
    const rOff=hw*(0.88+(1-edge)*0.24);
    left.push([p[0]+nx*lOff, p[1]+ny*lOff]);
    right.push([p[0]-nx*rOff, p[1]-ny*rOff]);
    centers.push(p);
  }
  return {left,right,centers,steps};
}

function fillTrailRibbon(left,right,tex){
  if(left.length<2) return;
  ctx.beginPath();
  ctx.moveTo(left[0][0],left[0][1]);
  for(let k=1;k<left.length;k++) ctx.lineTo(left[k][0],left[k][1]);
  for(let k=right.length-1;k>=0;k--) ctx.lineTo(right[k][0],right[k][1]);
  ctx.closePath();
  ctx.fillStyle=tex||"#5a4636"; ctx.fill();
}

function drawTrailSoftHalo(left,right,centers){
  ctx.save();
  for(let k=0;k<centers.length;k+=2){
    const p=centers[k];
    const dl=k>0?Math.hypot(p[0]-centers[k-1][0],p[1]-centers[k-1][1]):28;
    const rad=Math.max(16,dl*0.55);
    const g=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],rad);
    g.addColorStop(0,"rgba(72,58,42,0.38)");
    g.addColorStop(0.45,"rgba(58,50,36,0.16)");
    g.addColorStop(0.72,"rgba(42,58,34,0.07)");
    g.addColorStop(1,"rgba(36,52,30,0)");
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(p[0],p[1],rad,0,7); ctx.fill();
  }
  ctx.restore();
}

function drawTrailEdgeWear(left,right,centers){
  ctx.save(); ctx.globalCompositeOperation="multiply";
  for(let k=1;k<centers.length-1;k+=2){
    const p=centers[k], p0=centers[k-1], p1=centers[k+1];
    const dx=p1[0]-p0[0], dy=p1[1]-p0[1], ln=Math.hypot(dx,dy)||1;
    const ang=Math.atan2(dy,dx);
    ctx.fillStyle="rgba(38,30,22,0.14)";
    ctx.beginPath(); ctx.ellipse(p[0],p[1], ln*0.22, 5.5, ang, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function scatterTrailEdgeBits(left,right,i,j){
  const tex=getTex("forest_trail");
  if(!tex) return;
  ctx.save(); ctx.globalAlpha=0.42;
  for(let pass=0;pass<2;pass++){
    const pts=pass===0?left:right;
    for(let k=2;k<pts.length-2;k+=3){
      if(hsh(i,k+pass*17,531)>0.62) continue;
      const p=pts[k];
      const s=5+hsh(Math.floor(p[0]),Math.floor(p[1]),533)*7;
      ctx.save(); ctx.translate(p[0],p[1]); ctx.rotate(hsh(i,j,k,535)*6.28);
      ctx.fillStyle=tex; ctx.fillRect(-s*0.5,-s*0.35,s,s*0.7);
      ctx.restore();
    }
  }
  ctx.restore();
  // grass / moss bleeding back onto path edges
  ctx.save();
  for(let k=1;k<left.length-1;k+=4){
    if(hsh(i,j,k,537)>0.55) continue;
    const lp=left[k], rp=right[k], mx=(lp[0]+rp[0])/2, my=(lp[1]+rp[1])/2;
    const dx=lp[0]-rp[0], dy=lp[1]-rp[1], ln=Math.hypot(dx,dy)||1;
    const side=hsh(i,j,k,539)<0.5?1:-1;
    const gx=mx+side*(-dy/ln)*8, gy=my+side*(dx/ln)*8;
    ctx.fillStyle=hsh(i,j,k,541)<0.5?"rgba(48,78,42,0.35)":"rgba(38,62,34,0.28)";
    ctx.beginPath(); ctx.ellipse(gx,gy,3.5,2.2,hsh(i,j,k,543)*6.28,0,7); ctx.fill();
  }
  ctx.restore();
}

function drawForestTrailEdge(i,j,di,dj){
  const {e,p0,p1,cp}=edgeGeom(i,j,i+di,j+dj);
  const {left,right,centers}=trailRibbonPoints(p0,cp,p1,e.width,i,j,di,dj);
  const tex=getTex("forest_trail");
  drawTrailSoftHalo(left,right,centers);
  fillTrailRibbon(left,right,tex);
  drawTrailEdgeWear(left,right,centers);
  scatterTrailEdgeBits(left,right,i,j);
}

function drawForestTrailNode(i,j,ax,ay){
  if(!forestTrailNode(i,j)) return;
  const r0=nodeMaxWidth(i,j)*0.34+hsh(i,j,545)*10;
  const tex=getTex("forest_trail");
  ctx.save();
  const g=ctx.createRadialGradient(ax,ay,0,ax,ay,r0*1.6);
  g.addColorStop(0,"rgba(68,54,40,0.32)"); g.addColorStop(0.55,"rgba(52,44,32,0.12)"); g.addColorStop(1,"rgba(40,55,34,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ax,ay,r0*1.55,0,7); ctx.fill();
  ctx.beginPath();
  for(let a=0;a<=14;a++){
    const ang=a/14*6.283;
    const rad=r0*(0.78+0.32*hsh(i,j,a+550));
    const px=ax+Math.cos(ang)*rad, py=ay+Math.sin(ang)*rad*0.92;
    a?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.closePath();
  ctx.fillStyle=tex||"#5a4636"; ctx.fill();
  ctx.fillStyle="rgba(36,28,20,0.12)"; ctx.fill();
  ctx.restore();
}

function drawForestTrails(ox,oy){
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(isForestTrailEdge(i,j,1,0)) drawForestTrailEdge(i,j,1,0);
    if(isForestTrailEdge(i,j,0,1)) drawForestTrailEdge(i,j,0,1);
  }
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(!forestTrailNode(i,j)) continue;
    const A=node(i,j);
    drawForestTrailNode(i,j,A[0],A[1]);
  }
}
