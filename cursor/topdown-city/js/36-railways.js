/* TOPDOWN CITY — 36-railways.js */
/* Sparse rail network, level crossings (barriers) & road underpass tunnels */

const railEdgeCache = new Map();
const crossingRegistry = new Map();
const trains = [];

function railCorridorV(i){ return ((i+7)%14+14)%14===0; }
function railCorridorH(j){ return ((j+4)%14+14)%14===0; }
function railJunction(i,j){ return railCorridorV(i) && railCorridorH(j); }

function getRailEdge(i,j,di,dj){
  if(di<0||(di===0&&dj<0)) return getRailEdge(i+di,j+dj,-di,-dj);
  const key="r:"+i+","+j+","+di+","+dj;
  let e=railEdgeCache.get(key);
  if(e) return e;

  const ii=i+di, jj=j+dj;
  const bA=biomeOf(i,j), bB=biomeOf(ii,jj);
  const vertical=di===0&&dj!==0, horizontal=di!==0&&dj===0;
  let onLine=(vertical&&railCorridorV(i)&&railCorridorV(ii))||(horizontal&&railCorridorH(j)&&railCorridorH(jj));
  if(!onLine && railJunction(i,j) && railJunction(ii,jj)) onLine=hsh(i,j,905)>0.22;
  let exists=onLine && hsh(i*3+di,j*5+dj,901)>0.06;
  if(bA==="sea"||bB==="sea") exists=false;
  if(isMountain(i,j)||isMountain(ii,jj)) exists=false;
  if(bA==="city"&&cityZone(i,j)==="downtown") exists=false;
  if(bB==="city"&&cityZone(ii,jj)==="downtown") exists=false;

  const x1=nX(i,j),y1=nY(i,j),x2=nX(ii,jj),y2=nY(ii,jj);
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
  const h2=hsh(i+dj,j-di,913);
  let off=(h2*2-1)*len*0.028;
  off=Math.max(-48,Math.min(48,off));
  const cp=[(x1+x2)/2+(-dy/len)*off,(y1+y2)/2+(dx/len)*off];

  let bridge=false;
  if(exists){
    for(let t=0.05;t<0.95;t+=0.09){
      const p=bez([x1,y1],cp,[x2,y2],t);
      if(lakeScore(p[0],p[1])>0.02){ exists=false; break; }
      if(riverScore(p[0],p[1])>0.02) bridge=true;
    }
    if(terrainSlope((x1+x2)/2,(y1+y2)/2)>0.0042 && hsh(i,j,914)<0.55) exists=false;
  }

  e={exists,width:56,cp,col:"#4a4038",len,bridge,tunnel:false,klass:"rail"};
  railEdgeCache.set(key,e);   // cache before crossingKindAt (it calls getRailEdge again)

  const roadE=getEdge(i,j,di,dj);
  if(exists && roadE.exists){
    const kind=crossingKindAt(i,j,di,dj);
    if(kind==="tunnel") e.tunnel=true;
  }
  return e;
}

function railNeighbors(i,j){
  const r=[];
  for(const[di,dj]of EDIRS){
    const e=getRailEdge(i,j,di,dj);
    if(e.exists) r.push([i+di,j+dj]);
  }
  return r;
}

function hasRailAtNode(i,j){
  for(const[di,dj]of EDIRS) if(getRailEdge(i,j,di,dj).exists) return true;
  return false;
}

function roadAtNode(i,j){
  for(const[di,dj]of EDIRS) if(getEdge(i,j,di,dj).exists) return true;
  return false;
}

function crossingKindAt(i,j,di,dj){
  const re=getRailEdge(i,j,di,dj), rd=getEdge(i,j,di,dj);
  if(!re.exists||!rd.exists) return null;
  const zone=biomeOf(i,j)==="city"?cityZone(i,j):"outer";
  let hwy=rd.hwy;
  for(const[d2i,d2j]of EDIRS){
    const e2=getEdge(i,j,d2i,d2j);
    if(e2.exists&&e2.hwy) hwy=true;
  }
  if(zone==="downtown"||zone==="midrise"||hwy) return hsh(i,j,903)<0.62?"tunnel":"level";
  if(rd.klass==="blvd"||rd.klass==="art") return hsh(i,j,903)<0.38?"tunnel":"level";
  return "level";
}

function railEdgeGeom(ai,aj,bi,bj){
  const e=getRailEdge(ai,aj,bi-ai,bj-aj);
  return {e,p0:node(ai,aj),p1:node(bi,bj),cp:e.cp};
}

function registerCrossing(i,j,di,dj,kind){
  const ck=i+","+j;
  if(crossingRegistry.has(ck)) return;
  const cx=nX(i,j), cy=nY(i,j);
  const ang=Math.atan2(nY(i+dj,j+dj)-cy, nX(i+di,j+dj)-cx);
  const perp=ang+Math.PI/2;
  const rd=getEdge(i,j,di,dj);
  const half=Math.max(42,nodeMaxWidth(i,j)*0.48);
  const gates=[];
  if(kind==="level"){
    for(const side of [-1,1]){
      const gx=cx+Math.cos(perp)*side*(rd.width*0.5+14);
      const gy=cy+Math.sin(perp)*side*(rd.width*0.5+14);
      gates.push({x:gx,y:gy,side,ang:perp,down:0,flash:0});
    }
  }
  crossingRegistry.set(ck,{i,j,kind,axis:(dj===0?0:1),cx,cy,ang,perp,half,gates,trainNear:0,gateDown:false});
}

function addRailCrossings(lot,i,j){
  if(!hasRailAtNode(i,j)||!roadAtNode(i,j)) return;
  lot.railCross=true;
  for(const[di,dj]of[[1,0],[0,1]]){
    const re=getRailEdge(i,j,di,dj), rd=getEdge(i,j,di,dj);
    if(!re.exists||!rd.exists) continue;
    const kind=crossingKindAt(i,j,di,dj);
    if(kind) registerCrossing(i,j,di,dj,kind);
  }
}

function updateCrossingGates(dt){
  for(const c of crossingRegistry.values()){
    let near=0;
    for(const t of trains){
      const d=Math.hypot(t.x-c.cx,t.y-c.cy);
      if(d<480) near=Math.max(near,1-d/480);
    }
    c.trainNear+=(near-c.trainNear)*Math.min(1,5*dt);
    c.gateDown=c.kind==="level" && c.trainNear>0.08;
    const target=c.gateDown?1:0;
    for(const g of c.gates){
      g.down+=(target-g.down)*Math.min(1,3.5*dt);
      g.flash+=dt*7;
    }
  }
}

function crossingBlocksRoad(i,j,axis){
  const c=crossingRegistry.get(i+","+j);
  if(!c||c.kind!=="level"||!c.gateDown) return false;
  return true;
}

function collideCrossingGates(e){
  const ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    const c=crossingRegistry.get(i+","+j);
    if(!c||c.kind!=="level") continue;
    for(const g of c.gates){
      if(g.down<0.45) continue;
      const len=38*g.down, ux=Math.cos(g.ang+Math.PI/2), uy=Math.sin(g.ang+Math.PI/2);
      const bx=g.x+ux*len*0.5, by=g.y+uy*len*0.5;
      if(Math.hypot(e.x-bx,e.y-by)<14+(e.R||e.r||12)){
        const nx=(e.x-bx)||0.01, ny=(e.y-by)||0.01, d=Math.hypot(nx,ny)||1;
        e.x+=nx/d*3; e.y+=ny/d*3;
        if(typeof e.vx==="number"){ e.vx*=-0.25; e.vy*=-0.25; }
      }
    }
  }
}

function sampleRailCurve(i,j,di,dj,t){
  const g=railEdgeGeom(i,j,i+di,j+dj);
  return bez(g.p0,g.cp,g.p1,t);
}

function drawRailBed(p0,cp,p1,w){
  ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.strokeStyle="#3a342e"; ctx.lineWidth=w+10;
  ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.quadraticCurveTo(cp[0],cp[1],p1[0],p1[1]); ctx.stroke();
  ctx.strokeStyle="#5a5048"; ctx.lineWidth=w+4;
  ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.quadraticCurveTo(cp[0],cp[1],p1[0],p1[1]); ctx.stroke();
}

function drawRailTracks(p0,cp,p1){
  const steps=Math.max(8,Math.ceil(Math.hypot(p1[0]-p0[0],p1[1]-p0[1])/28));
  ctx.strokeStyle="#8a9098"; ctx.lineWidth=2.2;
  for(const off of [-5.5,5.5]){
    ctx.beginPath();
    for(let s=0;s<=steps;s++){
      const t=s/steps, p=bez(p0,cp,p1,t);
      const tn=bezTan(p0,cp,p1,t), tl=Math.hypot(tn[0],tn[1])||1;
      const nx=-tn[1]/tl, ny=tn[0]/tl;
      const x=p[0]+nx*off, y=p[1]+ny*off;
      s?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle="#6a5040"; ctx.lineWidth=3.5;
  for(let s=0;s<=steps;s+=2){
    const t=s/steps, p=bez(p0,cp,p1,t);
    const tn=bezTan(p0,cp,p1,t), tl=Math.hypot(tn[0],tn[1])||1;
    const nx=-tn[1]/tl, ny=tn[0]/tl;
    ctx.beginPath(); ctx.moveTo(p[0]-nx*7,p[1]-ny*7); ctx.lineTo(p[0]+nx*7,p[1]+ny*7); ctx.stroke();
  }
}

function drawRailTunnel(i,j,di,dj){
  const rd=getEdge(i,j,di,dj); if(!rd.exists) return;
  const A=node(i,j), B=node(i+di,j+dj), C=rd.cp;
  const cx=(A[0]+B[0])*0.5, cy=(A[1]+B[1])*0.5;
  const tn=bezTan(A,C,B,0.5), tl=Math.hypot(tn[0],tn[1])||1;
  ctx.save();
  ctx.translate(cx,cy); ctx.rotate(Math.atan2(tn[1],tn[0]));
  const hw=rd.width*0.5+6;
  ctx.fillStyle="rgba(12,14,18,.88)"; ctx.fillRect(-hw-8,-18,hw*2+16,36);
  ctx.strokeStyle="#6a6258"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-hw,14); ctx.lineTo(-hw,-10); ctx.arc(0,-10,hw,Math.PI,0); ctx.lineTo(hw,14); ctx.stroke();
  ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(-hw+4,-8,hw*2-8,22);
  ctx.restore();
}

function drawLevelCrossingMarkings(c){
  ctx.save(); ctx.translate(c.cx,c.cy); ctx.rotate(c.ang);
  ctx.fillStyle="rgba(240,230,210,.55)";
  for(let x=-c.half;x<c.half;x+=10) ctx.fillRect(x,-5,6,10);
  ctx.restore();
}

function drawCrossingGate(g){
  const down=g.down, len=38*down;
  if(down<0.04) return;
  const ux=Math.cos(g.ang+Math.PI/2), uy=Math.sin(g.ang+Math.PI/2);
  const bx=g.x, by=g.y, ex=bx+ux*len, ey=by+uy*len;
  ctx.strokeStyle="#3a3834"; ctx.lineWidth=3; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(ex,ey); ctx.stroke();
  ctx.lineWidth=5;
  for(let k=0;k<4;k++){
    const t0=k/4, t1=(k+0.5)/4;
    ctx.strokeStyle=(k%2===0)?"#e8e8ec":"#c83838";
    ctx.beginPath();
    ctx.moveTo(bx+ux*len*t0,by+uy*len*t0);
    ctx.lineTo(bx+ux*len*t1,by+uy*len*t1);
    ctx.stroke();
  }
  const flash=Math.sin(g.flash)>0;
  ctx.fillStyle=flash?"#ff4440":"#5a1010";
  ctx.beginPath(); ctx.arc(bx,by,3.2,0,7); ctx.fill();
}

function drawRails(ox,oy){
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    for(const[di,dj]of[[1,0],[0,1]]){
      const e=getRailEdge(i,j,di,dj); if(!e.exists) continue;
      const A=node(i,j), B=node(i+di,j+dj);
      if(A[0]<ox-80&&B[0]<ox-80||A[0]>ox+VW+80&&B[0]>ox+VW+80) continue;
      if(A[1]<oy-80&&B[1]<oy-80||A[1]>oy+VH+80&&B[1]>oy+VH+80) continue;
      if(e.tunnel){ drawRailTunnel(i,j,di,dj); continue; }
      if(e.bridge){
        ctx.strokeStyle="#6a5848"; ctx.lineWidth=e.width+8; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.quadraticCurveTo(e.cp[0],e.cp[1],B[0],B[1]); ctx.stroke();
      }
      drawRailBed(A,e.cp,B,e.width*0.55);
      drawRailTracks(A,e.cp,B);
    }
  }
  for(const c of crossingRegistry.values()){
    if(c.cx<ox-60||c.cx>ox+VW+60||c.cy<oy-60||c.cy>oy+VH+60) continue;
    if(c.kind==="level"){
      drawLevelCrossingMarkings(c);
      for(const g of c.gates) drawCrossingGate(g);
    }
  }
}

function spawnTrain(){
  const ci=Math.round(focusX/GAP), cj=Math.round(focusY/GAP);
  for(let k=0;k<48;k++){
    const i=ci+randInt(-18,18), j=cj+randInt(-18,18);
    if(!hasRailAtNode(i,j)) continue;
    const nb=railNeighbors(i,j); if(!nb.length) continue;
    const to=nb[(rng()*nb.length)|0];
    const di=to[0]-i, dj=to[1]-j;
    const p=sampleRailCurve(i,j,di,dj,rng()*0.3+0.05);
    const cars=3+(rng()*4|0);
    return {
      x:p[0],y:p[1],a:0,vx:0,vy:0,
      ai:i,aj:j,bi:to[0],bj:to[1],t:rng()*0.2+0.05,
      speed:rand(95,145), cruise:rand(110,160),
      W:34,L:180+cars*52,R:42,
      color:pick(["#8a3828","#3a4858","#5a5048","#6a5838"]),
      cars, hornCd:rand(2,8),
    };
  }
  return null;
}

function maintainTrains(){
  const cap=biomeOf(Math.round(focusX/GAP),Math.round(focusY/GAP))==="city"?5:3;
  while(trains.length<cap){
    const t=spawnTrain();
    if(t) trains.push(t);
    else break;
  }
}

function updateTrain(t,dt){
  const g=railEdgeGeom(t.ai,t.aj,t.bi,t.bj);
  t.t+=dt*t.speed/Math.max(36,g.e.len);
  if(t.t>=1){
    const nb=railNeighbors(t.bi,t.bj).filter(n=>!(n[0]===t.ai&&n[1]===t.aj));
    if(!nb.length){ t.t=0.98; return; }
    const nx=nb[(rng()*nb.length)|0];
    t.ai=t.bi; t.aj=t.bj; t.bi=nx[0]; t.bj=nx[1]; t.t=0;
  }
  const p=bez(g.p0,g.cp,g.p1,t.t);
  const tn=bezTan(g.p0,g.cp,g.p1,Math.min(t.t,0.99)), tl=Math.hypot(tn[0],tn[1])||1;
  t.x=p[0]; t.y=p[1]; t.a=Math.atan2(tn[1]/tl,tn[0]/tl);
  t.hornCd-=dt;
  for(const ck of [t.ai+","+t.aj,t.bi+","+t.bj]){
    const c=crossingRegistry.get(ck);
    if(c&&c.kind==="level"&&c.gateDown&&t.hornCd<=0&&Math.hypot(t.x-c.cx,t.y-c.cy)<200){
      if(typeof honk==="function") honk();
      t.hornCd=rand(3,7);
    }
  }
  if(Math.hypot(t.x-focusX,t.y-focusY)>2400){
    const n=spawnTrain();
    if(n) Object.assign(t,n);
  }
}

function trainNearEntity(t,e){
  return Math.hypot(e.x-t.x,e.y-t.y)<t.L*0.5+(e.R||e.r||14);
}

function updateTrains(dt){
  updateCrossingGates(dt);
  maintainTrains();
  for(const t of trains){
    updateTrain(t,dt);
    if(car&&!car.dead&&trainNearEntity(t,car)){
      if(typeof damageCar==="function") damageCar(car,120,t.x,t.y,"hit");
      alertPeds(t.x,t.y,220);
    }
    if(mode==="foot"&&trainNearEntity(t,ped)){
      if(typeof damage==="function") damage(999);
    }
    for(const c of traffic){
      if(c.state!=="drive"&&c.state!=="loose") continue;
      if(Math.hypot(c.x-t.x,c.y-t.y)<t.L*0.4+40){
        if(typeof damageCar==="function") damageCar(c,80,t.x,t.y,"hit");
        c.state="loose"; c.vx=(c.x-t.x)*0.4; c.vy=(c.y-t.y)*0.4;
      }
    }
  }
}

function drawTrainBody(t){
  ctx.save(); ctx.translate(t.x,t.y); ctx.rotate(t.a);
  const hl=t.L*0.5, hw=t.W*0.5;
  ctx.fillStyle="rgba(0,0,0,.25)"; ctx.fillRect(-hl+4,hw+2,t.L-8,5);
  ctx.fillStyle=t.color; ctx.fillRect(-hl,-hw,hl*0.32,hw*2);
  ctx.fillStyle=shade(t.color,18); ctx.fillRect(-hl+hl*0.32,-hw,t.L-hl*0.32,hw*2);
  for(let c=0;c<t.cars;c++){
    const ox=-hl*0.55+c*(t.L*0.78/t.cars);
    ctx.fillStyle=shade(t.color,-8+c*4); ctx.fillRect(ox,-hw*0.88,t.L*0.72/t.cars,hw*1.76);
    ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.strokeRect(ox,-hw*0.88,t.L*0.72/t.cars,hw*1.76);
  }
  ctx.fillStyle="#dde6ec"; ctx.fillRect(hl-hl*0.28,-hw*0.55,hl*0.22,hw*1.1);
  ctx.fillStyle="#ffcc44"; ctx.fillRect(hl-hl*0.12,-hw*0.35,6,hw*0.7);
  ctx.restore();
}

function drawTrains(ox,oy){
  for(const t of trains){
    if(t.x<ox-120||t.x>ox+VW+120||t.y<oy-120||t.y>oy+VH+120) continue;
    drawTrainBody(t);
  }
}

function mapDrawRails(mctx, tx, ty, i0,i1,j0,j1, scale){
  mctx.lineCap="round";
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    for(const[di,dj]of[[1,0],[0,1]]){
      const e=getRailEdge(i,j,di,dj); if(!e.exists||e.tunnel) continue;
      const A=node(i,j), B=node(i+di,j+dj);
      mctx.strokeStyle="#7a7268"; mctx.lineWidth=Math.max(1.4,e.width*scale*0.45);
      mctx.beginPath(); mctx.moveTo(tx(A[0]),ty(A[1]));
      mctx.quadraticCurveTo(tx(e.cp[0]),ty(e.cp[1]),tx(B[0]),ty(B[1])); mctx.stroke();
    }
  }
}

Game.register({
  id:"railways",
  order:36,
  onLot:addRailCrossings,
  update:updateTrains,
  drawAfterRoads:drawRails,
  drawActors:drawTrains,
  actorLayer:"afterTraffic",
  drawMap(mctx, opts){
    mapDrawRails(mctx, opts.tx, opts.ty, opts.i0, opts.i1, opts.j0, opts.j1, opts.scale);
  },
});
