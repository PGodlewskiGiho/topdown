/* TOPDOWN CITY — 27-forest-bridges.js */
/* Rustic forest bridges — selective crossings over rivers (not every trail) */

function isForestBridgeEdge(i,j,di,dj){
  if(di<0||(di===0&&dj<0)) return isForestBridgeEdge(i+di,j+dj,-di,-dj);
  const e=getEdge(i,j,di,dj);
  return !!(e&&e.exists&&e.bridge&&(e.klass==="trail"||e.klass==="rural"));
}

function bridgeDeckPoints(p0,cp,p1, deckW, i,j,di,dj){
  const len=Math.hypot(p1[0]-p0[0],p1[1]-p0[1])||1;
  const steps=Math.max(10, Math.ceil(len/16));
  const left=[], right=[], centers=[];
  for(let s=0;s<=steps;s++){
    const t=s/steps;
    const p=bez(p0,cp,p1,t);
    const tan=bezTan(p0,cp,p1,t);
    const tl=Math.hypot(tan[0],tan[1])||1;
    const nx=-tan[1]/tl, ny=tan[0]/tl;
    const hw=deckW*(0.88+0.12*Math.sin(t*9+hsh(i,j,581)*6.28));
    left.push([p[0]+nx*hw, p[1]+ny*hw]);
    right.push([p[0]-nx*hw, p[1]-ny*hw]);
    centers.push(p);
  }
  return {left,right,centers,steps};
}

function distToBridgeEdge(x,y,i,j,di,dj){
  if(di<0||(di===0&&dj<0)) return distToBridgeEdge(x,y,i+di,j+dj,-di,-dj);
  const e=getEdge(i,j,di,dj);
  if(!e||!e.exists||!e.bridge) return Infinity;
  const p0=node(i,j), p1=node(i+di,j+dj), cp=e.cp;
  let best=Infinity;
  for(let t=0;t<=1;t+=0.045){
    const p=bez(p0,cp,p1,t);
    best=Math.min(best, Math.hypot(p[0]-x,p[1]-y));
  }
  return best;
}

function onForestBridgeAt(x,y){
  const ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    for(const[di,dj] of [[1,0],[0,1]]){
      if(!isForestBridgeEdge(i,j,di,dj)) continue;
      const e=getEdge(i,j,di,dj);
      if(distToBridgeEdge(x,y,i,j,di,dj)<e.width*0.58) return true;
    }
  }
  return false;
}
window.onForestBridgeAt=onForestBridgeAt;

function drawBridgePlanks(centers,left,right,wide){
  ctx.save();
  for(let k=1;k<centers.length-1;k+=wide?1:2){
    const p=centers[k], p0=centers[k-1], p1=centers[k+1];
    const dx=p1[0]-p0[0], dy=p1[1]-p0[1], ln=Math.hypot(dx,dy)||1;
    const ang=Math.atan2(dy,dx);
    const lp=left[k], rp=right[k];
    const pw=Math.hypot(lp[0]-rp[0],lp[1]-rp[1]);
    const tone=hsh(Math.floor(p[0]/9),Math.floor(p[1]/9),583);
    ctx.save(); ctx.translate(p[0],p[1]); ctx.rotate(ang);
    ctx.fillStyle=tone<0.33?"#6a5038":tone<0.66?"#7a6044":"#5a4830";
    ctx.fillRect(-ln*0.42,-pw*0.48, ln*0.84, pw*0.96);
    ctx.strokeStyle="rgba(28,20,12,0.22)"; ctx.lineWidth=0.8;
    ctx.strokeRect(-ln*0.42,-pw*0.48, ln*0.84, pw*0.96);
    ctx.restore();
  }
  ctx.restore();
}

function drawBridgeRails(left,right,centers,i,j,wide){
  ctx.save(); ctx.lineCap="round";
  ctx.strokeStyle="rgba(42,32,22,0.75)"; ctx.lineWidth=wide?2.4:1.8;
  ctx.beginPath();
  ctx.moveTo(left[0][0],left[0][1]);
  for(let k=1;k<left.length;k++) ctx.lineTo(left[k][0],left[k][1]);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(right[0][0],right[0][1]);
  for(let k=1;k<right.length;k++) ctx.lineTo(right[k][0],right[k][1]);
  ctx.stroke();
  for(let k=0;k<centers.length;k+=wide?4:5){
    const lp=left[k], rp=right[k];
    ctx.strokeStyle="rgba(52,40,28,0.55)"; ctx.lineWidth=wide?1.6:1.2;
    ctx.beginPath(); ctx.moveTo(lp[0],lp[1]); ctx.lineTo(rp[0],rp[1]); ctx.stroke();
    if(k%2===0){
      ctx.fillStyle="rgba(38,30,20,0.85)";
      ctx.beginPath(); ctx.arc(lp[0],lp[1], wide?2.2:1.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(rp[0],rp[1], wide?2.2:1.6, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
}

function drawBridgeSupports(centers, deckW, i,j){
  ctx.save();
  for(let k=2;k<centers.length-2;k+=4){
    const p=centers[k];
    if(riverScore(p[0],p[1])<=0) continue;
    const h=deckW*0.9+hsh(i,j,k,587)*deckW*0.4;
    ctx.fillStyle="rgba(32,24,16,0.35)"; ctx.beginPath(); ctx.ellipse(p[0]+2,p[1]+4,h*0.35,h*0.18,0,0,7); ctx.fill();
    ctx.strokeStyle="rgba(48,36,24,0.7)"; ctx.lineWidth=2.2; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(p[0],p[1]+h); ctx.stroke();
    ctx.fillStyle="rgba(58,44,30,0.8)"; ctx.beginPath(); ctx.arc(p[0],p[1]+h,2.4,0,7); ctx.fill();
  }
  ctx.restore();
}

function drawBridgeApproach(p0,cp,p1, deckW, atStart){
  const t=atStart?0.08:0.92;
  const p=bez(p0,cp,p1,t);
  const tan=bezTan(p0,cp,p1,t);
  const tl=Math.hypot(tan[0],tan[1])||1;
  const nx=-tan[1]/tl, ny=tan[0]/tl;
  const tex=getTex("forest_trail");
  ctx.save();
  const g=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],deckW*1.4);
  g.addColorStop(0,"rgba(68,54,40,0.28)"); g.addColorStop(1,"rgba(40,55,34,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p[0],p[1],deckW*1.35,0,7); ctx.fill();
  if(tex){
    ctx.globalAlpha=0.5;
    ctx.fillStyle=tex;
    ctx.beginPath();
    ctx.ellipse(p[0],p[1],deckW*0.95,deckW*0.55,Math.atan2(ny,nx),0,7);
    ctx.fill();
  }
  ctx.restore();
}

function drawForestBridgeEdge(i,j,di,dj){
  const {e,p0,p1,cp}=edgeGeom(i,j,i+di,j+dj);
  if(!e.bridge) return;
  const wide=e.klass==="rural";
  const deckW=e.width*(wide?0.42:0.36);
  const {left,right,centers}=bridgeDeckPoints(p0,cp,p1,deckW,i,j,di,dj);

  ctx.save();
  for(let k=0;k<centers.length;k+=2){
    const p=centers[k];
    if(riverScore(p[0],p[1])<=0) continue;
    ctx.fillStyle="rgba(8,18,24,0.12)"; ctx.beginPath(); ctx.ellipse(p[0]+1,p[1]+3,deckW*0.85,deckW*0.32,0,0,7); ctx.fill();
  }
  ctx.restore();

  drawBridgePlanks(centers,left,right,wide);
  drawBridgeSupports(centers,deckW,i,j);
  drawBridgeRails(left,right,centers,i,j,wide);
  drawBridgeApproach(p0,cp,p1,deckW,true);
  drawBridgeApproach(p0,cp,p1,deckW,false);

  if(wide){
    ctx.save(); ctx.setLineDash([10,14]); ctx.lineWidth=1.2; ctx.strokeStyle="rgba(210,200,170,0.35)";
    for(let k=3;k<centers.length-3;k+=6){
      const p=centers[k], tan=bezTan(p0,cp,p1,k/(centers.length-1));
      const tl=Math.hypot(tan[0],tan[1])||1;
      const nx=-tan[1]/tl, ny=tan[0]/tl;
      ctx.beginPath(); ctx.moveTo(p[0]-nx*deckW*0.55,p[1]-ny*deckW*0.55);
      ctx.lineTo(p[0]+nx*deckW*0.55,p[1]+ny*deckW*0.55); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.restore();
  }
}

function drawForestBridges(ox,oy){
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(isForestBridgeEdge(i,j,1,0)) drawForestBridgeEdge(i,j,1,0);
    if(isForestBridgeEdge(i,j,0,1)) drawForestBridgeEdge(i,j,0,1);
  }
}
