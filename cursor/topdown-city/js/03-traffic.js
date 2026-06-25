/* TOPDOWN CITY — 03-traffic.js */
/* ---------- traffic & pedestrians (living city) ---------- */
const LANE = ROAD*0.22;
const traffic = [];           // AI cars: state "drive" (on road graph) or "loose" (free physics)
const peds = [];              // NPC pedestrians: state "walk" or "down"
const leaving = [];           // cars NPCs have boarded and are driving away
function clearLivingWorld(){
  traffic.length=0; peds.length=0; leaving.length=0;
  if(typeof boats!=="undefined") boats.length=0;
  if(typeof bullets!=="undefined") bullets.length=0;
  if(typeof muzzles!=="undefined") muzzles.length=0;
  if(typeof explosions!=="undefined") explosions.length=0;
  if(typeof slashes!=="undefined") slashes.length=0;
  if(typeof wrecks!=="undefined") wrecks.length=0;
  if(typeof scorches!=="undefined") scorches.length=0;
  if(typeof blastQ!=="undefined") blastQ.length=0;
  if(typeof blood!=="undefined") blood.length=0;
  if(typeof debris!=="undefined") debris.length=0;
  if(typeof pedGore!=="undefined") pedGore.length=0;
  if(typeof skid!=="undefined") skid.length=0;
  if(typeof clearAllLaw==="function") clearAllLaw();
}
const CARCOL = ["#c9c9cf","#3f5b86","#b5483b","#d8a93f","#3f7d5a","#6c6f78","#7a4d6b"];
const PEDCOL = ["#3a6ea5","#a4513f","#4f7d4a","#7a5fa0","#b59a3f","#5a5e66","#a85a7a"];
const HATCOL=["#b5483b","#3f5b86","#d8a93f","#3f7d5a","#222222","#e0e0e0","#7a4d6b"];
function assignTrafficLane(c, width){
  if(c.laneSide==null) c.laneSide=rng()<0.5?1:-1;
  if(c.laneIdx==null) c.laneIdx=(rng()*roadLanesPerSide(width))|0;
}
function trafficRoadOffset(c, width, taper){
  taper=taper==null?1:taper;
  assignTrafficLane(c, width);
  return c.laneSide*trafficLaneOffset(width, c.laneIdx)*taper;
}
function placeTrafficOnEdge(c){
  const g=edgeGeom(c.ai,c.aj,c.bi,c.bj), p=bez(g.p0,g.cp,g.p1,c.t), tn=bezTan(g.p0,g.cp,g.p1,c.t), tl=Math.hypot(tn[0],tn[1])||1;
  const off=trafficRoadOffset(c, g.e.width, 1);
  c.x=p[0]-tn[1]/tl*off; c.y=p[1]+tn[0]/tl*off; c.a=Math.atan2(tn[1],tn[0]);
  const sp=kmhToPx(c.speed||80);
  c.vx=tn[0]/tl*sp; c.vy=tn[1]/tl*sp;
}
function spawnTrafficCell(){
  const ci=Math.round(focusX/GAP), cj=Math.round(focusY/GAP);
  const cc=nearestCity(ci,cj), inCity=biomeOf(ci,cj)==="city";
  const zFocus=inCity?cityZone(ci,cj):"outer";
  const downtownFocus=zFocus==="downtown"||zFocus==="midrise";
  for(let t=0;t<36;t++){
    let ai,aj;
    if(inCity && rng()<0.78){
      const bias=downtownFocus?0.28:0.55, maxR=downtownFocus?9:11;
      const ang=rng()*6.283, dist=Math.pow(rng(),bias)*maxR;
      ai=Math.round(cc.cx+Math.cos(ang)*dist);
      aj=Math.round(cc.cy+Math.sin(ang)*dist);
    } else {
      let oi,oj; do{ oi=randInt(-8,8); oj=randInt(-8,8); }while(Math.max(Math.abs(oi),Math.abs(oj))<3);
      ai=ci+oi; aj=cj+oj;
    }
    const ns=neighbors(ai,aj); if(!ns.length) continue;
    if(inCity && rng()<0.62){
      const z=cityZone(ai,aj);
      if(z==="suburb"&&rng()<0.68) continue;
      if(z==="downtown"||z==="midrise") return [ai,aj,ns];
    }
    return [ai,aj,ns];
  }
  let oi,oj; do{ oi=randInt(-7,7); oj=randInt(-7,7); }while(Math.max(Math.abs(oi),Math.abs(oj))<4);
  const ai=ci+oi, aj=cj+oj, ns=neighbors(ai,aj);
  return [ai,aj,ns.length?ns:[[ai+1,aj]]];
}
function spawnTrafficCar(){
  const [ai,aj,ns]=spawnTrafficCell();
  const b=ns[(rng()*ns.length)|0];
  const cc=nearestCity(ai,aj), z=biomeOf(ai,aj)==="city"?cityZone(ai,aj):"outer";
  const urban=z==="downtown"||z==="midrise";
  const c={state:"drive", ai,aj, bi:b[0],bj:b[1], t:rng()*0.7,
           speed:urban?rand(55,105):rand(70,130), cruise:urban?rand(72,118):rand(95,150),
           color:pick(CARCOL), W:32, L:58, R:vehicleHitRadius(32,58,"car"), x:0,y:0,a:0, vx:0,vy:0, spin:0, downT:0, ring:null, hp:255, maxHp:255, dmgSeed:(rng()*1e9)|0, dead:false};
  const vr=rng();
  if(vr<0.12){ c.kind="moto"; c.W=16; c.L=42; c.R=vehicleHitRadius(c.W,c.L,"moto"); c.cruise=rand(110,158); c.speed=rand(80,140); c.rider=true; c.riderShirt=pick(SHIRT); c.riderSkin=pick(SKIN); c.riderHelmet=true; c.hp=c.maxHp=72; }
  else if(vr<0.18){ c.kind="bike"; c.W=14; c.L=36; c.R=vehicleHitRadius(c.W,c.L,"bike"); c.cruise=rand(48,74); c.speed=rand(40,64); c.rider=true; c.riderShirt=pick(SHIRT); c.riderSkin=pick(SKIN); c.riderHair=pick(HAIR); c.hp=c.maxHp=44; }
  else { c.kind="car"; applyTrafficModel(c); }
  placeTrafficOnEdge(c); return c;
}
function spawnPed(){
  const armed=rng()<0.13, wi=armed?pick([2,3,4]):null;
  let fx=focusX+rand(-1100,1100), fy=focusY+rand(-1100,1100);
  const look=rollNpcAppearance(fx,fy,{armed});
  const p={state:"walk", x:fx,y:fy, a:rng()*6.283, tx:fx,ty:fy, speed:look.speed, r:look.r,
          vx:0,vy:0, downT:0, repick:0, _hp: armed?42:12, armed, weapon:wi, hostile:false, fireCd:rand(0.6,1.6),
          onGraph:false, pside: rng()<0.5?1:-1, pt:0, cross:0, crossProg:0, _wait:false, waitT:0, waitAxis:0,
          act:null, actCd:rand(4,12), chatT:0, bubT:0, partner:null, tcar:null, tlot:null, panic:0, threatX:0, threatY:0};
  applyNpcLook(p, look);
  const nd=nearestCityNode(fx,fy);
  if(nd){ const nb=neighbors(nd[0],nd[1]); if(nb.length){
      p.pa=nd; p.pb=nb[(rng()*nb.length)|0]; p.pt=rng()*0.85+0.07; p.onGraph=true;
      const pos=pedPos(p); p.x=pos[0]; p.y=pos[1];
      Object.assign(look, rollNpcAppearance(p.x,p.y,{armed}));
      applyNpcLook(p, look);
      return p; } }
  let x,y,t=0;
  do{ x=fx+rand(-200,200); y=fy+rand(-200,200); t++; }while((inBuilding(x,y,11)||inWater(x,y))&&t<24);
  p.x=x; p.y=y; p.tx=x; p.ty=y;
  Object.assign(look, rollNpcAppearance(x,y,{armed}));
  applyNpcLook(p, look);
  return p;
}
function trafficCap(){
  const ci=Math.round(focusX/GAP), cj=Math.round(focusY/GAP);
  if(biomeOf(ci,cj)!=="city") return 34;
  const z=cityZone(ci,cj);
  if(z==="downtown") return 78;
  if(z==="midrise") return 58;
  return 38;
}
function pedCap(){
  const ci=Math.round(focusX/GAP), cj=Math.round(focusY/GAP);
  if(biomeOf(ci,cj)!=="city") return 42;
  const z=cityZone(ci,cj);
  if(z==="downtown") return 88;
  if(z==="midrise") return 68;
  return 46;
}
function maintainTraffic(){
  const cap=trafficCap();
  while(traffic.length<cap) traffic.push(spawnTrafficCar());
}
function maintainPeds(){
  const cap=pedCap();
  while(peds.length<cap) peds.push(spawnPed());
}
const awayFromCam=(x,y)=>Math.hypot(x-cam.x,y-cam.y) > 720;
function respawnTraffic(c){ let n; for(let k=0;k<24;k++){ n=spawnTrafficCar(); if(awayFromCam(n.x,n.y)) break; } Object.assign(c,n); }
function respawnPed(p){ let n; for(let k=0;k<24;k++){ n=spawnPed(); if(awayFromCam(n.x,n.y)) break; } Object.assign(p,n); delete p._faceDir; delete p._lastSpriteDir; delete p._gta2Outfit; delete p.ring; }

function isAhead(c,dx,dy,ox,oy,dist,lat){
  const rx=ox-c.x, ry=oy-c.y, fwd=rx*dx+ry*dy, side=Math.abs(rx*(-dy)+ry*dx);
  return fwd>0 && fwd<dist && side<lat;
}
function obstacleAhead(c,dx,dy){
  if(isAhead(c,dx,dy,car.x,car.y,72,24)) return true;
  for(const o of traffic){ if(o===c||o.state!=="drive") continue; if(isAhead(c,dx,dy,o.x,o.y,64,22)) return true; }
  return false;
}
function obstacleDistAhead(c,dx,dy){
  let best=1e9;
  const scan=(ox,oy,dist,lat)=>{
    const rx=ox-c.x, ry=oy-c.y, fwd=rx*dx+ry*dy, side=Math.abs(rx*(-dy)+ry*dx);
    if(fwd>0 && fwd<dist && side<lat) best=Math.min(best, fwd);
  };
  scan(car.x,car.y,72,24);
  for(const o of traffic){ if(o===c||o.state!=="drive") continue; scan(o.x,o.y,64,22); }
  return best;
}
function pickAlternateLane(c, width){
  const lanes=roadLanesPerSide(width);
  const side=c.laneSide||1;
  const curIdx=c.laneIdx!=null?c.laneIdx:0;
  const opts=[];
  for(let i=0;i<lanes;i++){
    if(i===curIdx) continue;
    if(Math.abs(i-curIdx)===1) opts.unshift(i);
    else opts.push(i);
  }
  if(opts.length){
    const idx=opts[0];
    c.laneIdx=idx;
    return side*trafficLaneOffset(width, idx);
  }
  const otherSide=-side;
  const idx=(rng()*lanes)|0;
  c.laneSide=otherSide; c.laneIdx=idx;
  return otherSide*trafficLaneOffset(width, idx);
}
function updateTrafficDrivePhysics(c, g, fx, fy, targetX, targetY, targetSpeed, dt){
  const cruisePx=kmhToPx(targetSpeed);
  if(c.vx==null) c.vx=fx*cruisePx*0.4;
  if(c.vy==null) c.vy=fy*cruisePx*0.4;
  const body=driveVelBody(c.vx, c.vy, c.a);
  let fwd=body.f, lat=body.l;
  let desiredA=Math.atan2(fy, fx);
  const dx=targetX-c.x, dy=targetY-c.y, dist=Math.hypot(dx, dy);
  const laneOff=c._laneOff||0;
  const laneWant=c._laneWant!=null?c._laneWant:laneOff;
  const laneDelta=Math.abs(laneOff-laneWant);
  const laneActive=(c._laneChangeT||0)>0.05 || laneDelta>3;
  if(laneActive && dist>2){
    const bearingA=Math.atan2(dy, dx);
    const laneBlend=clamp(laneDelta/24, 0, 0.82)*((c._laneChangeT||0)>0?1:0.55);
    desiredA+=driveNormAng(bearingA-desiredA)*laneBlend;
  }
  const steerIn=driveTrafficSteer(c, desiredA, dist, dt, laneActive);
  const accel=420*dt;
  if(cruisePx>Math.abs(fwd)) fwd+=Math.min(cruisePx-Math.abs(fwd), accel)*Math.sign(cruisePx||1);
  else fwd+=Math.sign(cruisePx-fwd)*Math.min(Math.abs(cruisePx-fwd), 560*dt);
  if(Math.abs(fwd)>DRIVE_STEER_MIN_FWD||Math.abs(fwd)>8) c.a+=driveYawFromSteer(steerIn, fwd, laneActive?0.95:0.82, dt, false);
  lat=driveApplyLatGrip(lat, fwd, 1, dt, 0.78, 10.5, 11.2);
  const out=driveVelFromBody(fwd, lat, c.a);
  c.vx=out.vx; c.vy=out.vy;
  const px=c.x, py=c.y;
  c.x+=c.vx*dt; c.y+=c.vy*dt;
  const along=dx*fx+dy*fy;
  if(along>18){
    const pull=clamp((along-18)*0.05*dt, 0, 0.09);
    c.x+=fx*pull; c.y+=fy*pull;
  }
  driveHeadingFromMotion(c, desiredA, dt, laneActive);
  if(Math.hypot(c.x-px, c.y-py)<0.4 && cruisePx>20){
    c.x+=fx*cruisePx*dt*0.15;
    c.y+=fy*cruisePx*dt*0.15;
  }
}
function rejoinRoad(c){                                       // a stopped loose car returns to the road instead of vanishing
  const ci=Math.round(c.x/GAP), cj=Math.round(c.y/GAP); let best=null, bd=1e9;
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const nb=neighbors(i,j); if(!nb.length) continue; const A=node(i,j), d=(A[0]-c.x)*(A[0]-c.x)+(A[1]-c.y)*(A[1]-c.y); if(d<bd){ bd=d; best=[i,j]; } }
  if(!best || bd>(GAP*0.85)*(GAP*0.85)){ respawnTraffic(c); return; }                  // too far from any road -> recycle off-screen
  const nb=neighbors(best[0],best[1]), ex=nb[(rng()*nb.length)|0];
  c.state="drive"; c.ring=null; c.ai=best[0]; c.aj=best[1]; c.bi=ex[0]; c.bj=ex[1]; c.t=0; c.speed=18; c.spin=0; c.downT=0;
}
function updateLooseCar(c,dt){
  c.x+=c.vx*dt; c.y+=c.vy*dt;
  const f=1-Math.min(0.9,0.85*dt); c.vx*=f; c.vy*=f;
  c.a+=c.spin*dt; c.spin*=(1-Math.min(0.9,1.3*dt));
  collideCircleBuildings(c,0.6); collideParked(c); collideFences(c); collideGraves(c); // loose vehicles should also respect yard/cemetery blockers
  if(Math.hypot(c.x-focusX,c.y-focusY)>2600){ respawnTraffic(c); return; }
  if(Math.hypot(c.vx,c.vy)<18){ c.downT+=dt; if(c.downT>1.0) rejoinRoad(c); } else c.downT=0;
}
function pickExit(ai,aj,bi,bj){                 // next node at B, no U-turn unless dead end
  const ns=neighbors(bi,bj).filter(n=>!(n[0]===ai&&n[1]===aj));
  if(!ns.length) return [ai,aj];
  if(getEdge(ai,aj,bi-ai,bj-aj).hwy){            // stay on the highway through the crossing
    const ci=bi+(bi-ai), cj=bj+(bj-aj);
    for(const n of ns) if(n[0]===ci&&n[1]===cj && getEdge(bi,bj,n[0]-bi,n[1]-bj).hwy) return n;
  }
  return ns[(rng()*ns.length)|0];
}
function enterRoundabout(c, ri, rj, fromAi, fromAj, forceEx){
  ri=ri!=null?ri:c.bi; rj=rj!=null?rj:c.bj;
  fromAi=fromAi!=null?fromAi:c.ai; fromAj=fromAj!=null?fromAj:c.aj;
  const ctr=node(ri,rj), R=roundaboutR(ri,rj);
  const ex=forceEx||pickExit(fromAi,fromAj,ri,rj);
  const g=edgeGeom(ri,rj,ex[0],ex[1]);
  const RR=(R+9)*(R+9); let lo=0, hi=0.55;
  for(let s=0;s<22;s++){ const mt=(lo+hi)*0.5, pp=bez(g.p0,g.cp,g.p1,mt); if((pp[0]-ctr[0])*(pp[0]-ctr[0])+(pp[1]-ctr[1])*(pp[1]-ctr[1])<RR) lo=mt; else hi=mt; }
  const et=(lo+hi)*0.5, cx=bez(g.p0,g.cp,g.p1,et);
  const curAng=Math.atan2(c.y-ctr[1],c.x-ctr[0]);
  c.ring={ ci:ri, cj:rj, R, ang:isFinite(curAng)?curAng:Math.atan2(ctr[1]-node(fromAi,fromAj)[1],ctr[0]-node(fromAi,fromAj)[0]),
           exitAng:Math.atan2(cx[1]-ctr[1],cx[0]-ctr[0]), exT:Math.min(0.5,et), ex, dir:1 };
}
function enterPedRoundabout(p, ri, rj, fromAi, fromAj, forceEx){
  ri=ri!=null?ri:p.pb[0]; rj=rj!=null?rj:p.pb[1];
  fromAi=fromAi!=null?fromAi:p.pa[0]; fromAj=fromAj!=null?fromAj:p.pa[1];
  const ctr=node(ri,rj), R=roundaboutR(ri,rj);
  const ex=forceEx||pickExit(fromAi,fromAj,ri,rj);
  const g=edgeGeom(ri,rj,ex[0],ex[1]);
  const RR=(R+9)*(R+9); let lo=0, hi=0.55;
  for(let s=0;s<22;s++){ const mt=(lo+hi)*0.5, pp=bez(g.p0,g.cp,g.p1,mt); if((pp[0]-ctr[0])*(pp[0]-ctr[0])+(pp[1]-ctr[1])*(pp[1]-ctr[1])<RR) lo=mt; else hi=mt; }
  const et=(lo+hi)*0.5, cx=bez(g.p0,g.cp,g.p1,et);
  const curAng=Math.atan2(p.y-ctr[1],p.x-ctr[0]);
  const sw=nodeMaxWidth(ri,rj)*0.5+12;
  p.ring={ ci:ri, cj:rj, R, sw, ang:isFinite(curAng)?curAng:0,
           exitAng:Math.atan2(cx[1]-ctr[1],cx[0]-ctr[0]), exT:Math.min(0.5,et), ex, dir:p.pside>=0?1:-1 };
  p.cross=0; p._wait=false;
}
function updatePedRoundabout(p,dt){
  const r=p.ring, ctr=node(r.ci,r.cj);
  const step=p.speed*dt/Math.max(20,r.R);
  r.ang+=r.dir*step;
  const rad=r.R+(r.sw||14)*0.35;
  p.x=ctr[0]+Math.cos(r.ang)*rad;
  p.y=ctr[1]+Math.sin(r.ang)*rad;
  if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,-Math.sin(r.ang)*r.dir,Math.cos(r.ang)*r.dir);
  else p.a=Math.atan2(Math.cos(r.ang)*r.dir,-Math.sin(r.ang)*r.dir);
  let d=r.exitAng-r.ang; while(d<0)d+=Math.PI*2; while(d>=Math.PI*2)d-=Math.PI*2;
  if(d<step*1.5){
    p.pa=[r.ci,r.cj]; p.pb=r.ex; p.pt=r.exT!=null?r.exT:0.1;
    p.ring=null; pedPickSide(p); pedSyncPos(p);
  }
}
function updateRoundabout(c,dt){
  const r=c.ring, ctr=node(r.ci,r.cj);
  c.speed += (Math.min(c.cruise,95)-c.speed)*Math.min(1,3*dt);
  const step=c.speed*dt/Math.max(20,r.R);
  r.ang += r.dir*step;
  const rr=r.R+9;
  c.x=ctr[0]+Math.cos(r.ang)*rr; c.y=ctr[1]+Math.sin(r.ang)*rr; c.a=r.ang+r.dir*Math.PI/2;
  let d=r.exitAng-r.ang; while(d<0)d+=Math.PI*2; while(d>=Math.PI*2)d-=Math.PI*2;
  if(d<step*1.5){ c.ai=r.ci; c.aj=r.cj; c.bi=r.ex[0]; c.bj=r.ex[1]; c.t=(r.exT!=null?r.exT:0.1); c.ring=null; }
}
/* ===== traffic signals ===== */
const SIG_CYCLE=11; let signalClock=0;
function isSignal(i,j){
  if(biomeOf(i,j)!=="city"||isRoundabout(i,j)) return false;
  if(nodeDegree(i,j)<3) return false;
  return nodeMaxWidth(i,j)>=42;
}
// axis 0 = E-W roads (horizontal, dj=0); axis 1 = N-S roads (vertical, di=0)
function signalState(i,j,axis){
  let t=(signalClock+hsh(i,j,888)*SIG_CYCLE)%SIG_CYCLE;
  const ewG=t<4.4, ewY=t>=4.4&&t<5.4, nsG=t>=5.4&&t<9.8;
  if(axis===0) return ewG?"green":ewY?"yellow":"red";
  return nsG?"green":(t>=9.8?"yellow":"red");
}
/* ===== pedestrian sidewalk graph ===== */
function nearestCityNode(x,y){
  const ci=Math.round(x/GAP), cj=Math.round(y/GAP); let best=null,bd=1e9;
  for(let a=ci-2;a<=ci+2;a++)for(let b=cj-2;b<=cj+2;b++){
    if(biomeOf(a,b)!=="city"||nodeDegree(a,b)<2) continue;
    const d=Math.hypot(nX(a,b)-x,nY(a,b)-y); if(d<bd){bd=d;best=[a,b];}
  }
  return best;
}
function pedBasis(p){
  const g=edgeGeom(p.pa[0],p.pa[1],p.pb[0],p.pb[1]);
  const pt=bez(g.p0,g.cp,g.p1,p.pt);
  const tn=bezTan(g.p0,g.cp,g.p1,p.pt), tl=Math.hypot(tn[0],tn[1])||1;
  const fx=tn[0]/tl, fy=tn[1]/tl;
  return {g,pt,fx,fy,nx:-fy,ny:fx,off:g.e.width*0.5+12};
}
function pedPos(p,B){ B=B||pedBasis(p);
  const s = p.cross? p.pside*(1-2*p.crossProg) : p.pside;
  return [B.pt[0]+B.nx*B.off*s, B.pt[1]+B.ny*B.off*s];
}
function pedSyncPos(p){ const pos=pedPos(p); p.x=pos[0]; p.y=pos[1]; }
function pedPickSide(p){
  const B=pedBasis(p);
  const d1=Math.hypot(B.pt[0]+B.nx*B.off-p.x, B.pt[1]+B.ny*B.off-p.y);
  const d2=Math.hypot(B.pt[0]-B.nx*B.off-p.x, B.pt[1]-B.ny*B.off-p.y);
  p.pside=d1<=d2?1:-1;
}
function pedPickTurn(p){
  const at=p.pb, from=p.pa;
  let nb=neighbors(at[0],at[1]).filter(n=>!(n[0]===from[0]&&n[1]===from[1]));
  if(!nb.length) nb=neighbors(at[0],at[1]);
  if(!nb.length){ p.onGraph=false; p.tx=p.x; p.ty=p.y; return; }
  const nx=nb[(rng()*nb.length)|0];
  p.pa=[at[0],at[1]]; p.pb=nx; p.pt=0; p._wait=false; p.cross=0;
  pedPickSide(p);
  pedSyncPos(p);
}
function pedClear(p){ const c=node(p.pb[0],p.pb[1]);
  for(const t of traffic){ if((t.state==="drive"||t.state==="loose")&&Math.hypot(t.x-c[0],t.y-c[1])<58) return false; }
  return true;
}
function pedStartCross(p){ const g=edgeGeom(p.pa[0],p.pa[1],p.pb[0],p.pb[1]);
  p._wait=false; p.cross=1; p.crossProg=0; p.crossW=g.e.width+22; }
function pedDecide(p){
  if(typeof isMarketNode==="function"&&isMarketNode(p.pb[0],p.pb[1])&&rng()<0.78){ pedEnterRynek(p); return; }
  if(isPlaza(p.pb[0],p.pb[1]) && rng()<0.7){ pedEnterPlaza(p); return; }
  if(isRoundabout(p.pb[0],p.pb[1])){ enterPedRoundabout(p); return; }
  if(rng()<0.42){                                   // cross to the opposite sidewalk at this crosswalk
    p.waitAxis=(p.pb[1]===p.pa[1])?0:1; p._wait=true; p.waitT=0;
    p.pt=clamp(1-(nodeMaxWidth(p.pb[0],p.pb[1])*0.52+8)/Math.max(40,edgeGeom(p.pa[0],p.pa[1],p.pb[0],p.pb[1]).e.len),0.55,0.96);
    pedSyncPos(p);
    return;
  }
  pedPickTurn(p);
}
function pedWalkGraph(p,dt){
  if(p.ring){ updatePedRoundabout(p,dt); return; }
  if(p.cross){
    p.crossProg += dt*p.speed/Math.max(28,p.crossW);
    if(p.crossProg>=1){ p.pside=-p.pside; p.cross=0; pedSyncPos(p); return; }
    const pos=pedPos(p);
    const cdx=pos[0]-p.x, cdy=pos[1]-p.y;
    if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,cdx,cdy);
    else p.a=Math.atan2(cdy,cdx)||p.a;
    p.x=pos[0]; p.y=pos[1]; return;
  }
  if(p._wait){
    p.waitT+=dt;
    const ok = isSignal(p.pb[0],p.pb[1]) ? signalState(p.pb[0],p.pb[1],p.waitAxis)==="red" : pedClear(p);
    if(ok) pedStartCross(p);
    else if(p.waitT>9) pedPickTurn(p);
    else { const B=pedBasis(p), pos=pedPos(p,B); p.x=pos[0]; p.y=pos[1];
      if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,B.nx*p.pside,B.ny*p.pside);
      else p.a=Math.atan2(B.ny*p.pside,B.nx*p.pside); }
    return;
  }
  const B=pedBasis(p);
  if(isRoundabout(p.pb[0],p.pb[1]) && shouldUseRoundaboutRing(p.x,p.y,p.pb[0],p.pb[1])){
    enterPedRoundabout(p); return;
  }
  p.pt += dt*p.speed/Math.max(24,B.g.e.len);
  if(p.pt>=1){ p.pt=1; pedDecide(p); pedSyncPos(p); return; }
  const pos=pedPos(p,B); p.x=pos[0]; p.y=pos[1];
  if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,B.fx,B.fy);
  else p.a=Math.atan2(B.fy,B.fx);
}
function updateTrafficCar(c,dt){
  if(c.maxHp && !c.dead && c.hp>0 && c.hp<c.maxHp*0.08) damageCar(c, 1.4*dt, c.x, c.y, "burn");   // burning -> burns down
  if(c.state==="loose"){ updateLooseCar(c,dt); return; }
  if(c.ring){ updateRoundabout(c,dt); }
  else {
    if(isRoundabout(c.ai,c.aj) && shouldUseRoundaboutRing(c.x,c.y,c.ai,c.aj)){
      enterRoundabout(c, c.ai, c.aj, c.bi, c.bj, [c.bi,c.bj]); return;
    }
    const g=edgeGeom(c.ai,c.aj,c.bi,c.bj);
    const tn=bezTan(g.p0,g.cp,g.p1,c.t), tl=Math.hypot(tn[0],tn[1])||1, fx=tn[0]/tl, fy=tn[1]/tl;
    const edgeKey=c.ai+","+c.aj+","+c.bi+","+c.bj;
    if(c._edgeKey!==edgeKey){
      c._edgeKey=edgeKey;
      assignTrafficLane(c, g.e.width);
      c._laneOff=trafficRoadOffset(c, g.e.width, 1);
      c._laneWant=c._laneOff;
      c._laneHome=c._laneOff;
      c._laneChangeT=0;
    }
    const blocked=obstacleAhead(c,fx,fy);
    let targetSpeed=blocked?Math.min(c.cruise, 28):c.cruise;
    if(blocked){
      const dist=obstacleDistAhead(c,fx,fy);
      if(dist<48) targetSpeed=Math.min(targetSpeed, dist*1.6);
      if(!c._laneChangeT||c._laneChangeT<=0){
        const alt=pickAlternateLane(c, g.e.width);
        if(alt!=null){ c._laneWant=alt; c._laneChangeT=2.8; }
        else if(dist<34) targetSpeed=0;
      }
    } else {
      c._laneChangeT=Math.max(0,(c._laneChangeT||0)-dt);
      if((c._laneChangeT||0)<=0 && c._laneHome!=null){
        c._laneWant=c._laneHome;
      }
    }
    driveLerpLaneOff(c, c._laneWant!=null?c._laneWant:(c._laneOff||0), dt);
    let stopT=1, redLight=false;
    if(isSignal(c.bi,c.bj)){ const axis=(c.bj===c.aj)?0:1;
      if(signalState(c.bi,c.bj,axis)!=="green"){ redLight=true; stopT=1-(g.e.width*0.5+24)/g.e.len; if(c.t>=stopT-0.05) targetSpeed=0; } }
    if(typeof crossingBlocksRoad==="function"){
      const axis=(c.bj===c.aj)?0:1;
      if(crossingBlocksRoad(c.bi,c.bj,axis)){ redLight=true; stopT=1-(g.e.width*0.5+24)/g.e.len; if(c.t>=stopT-0.05) targetSpeed=0; }
    }
    c.speed += (targetSpeed-c.speed)*Math.min(1,3.2*dt);
    { let budget=c.speed*dt, pp=bez(g.p0,g.cp,g.p1,c.t);
      for(let s=0;s<48 && budget>0 && c.t<1;s++){ const nt=Math.min(1,c.t+0.025), np=bez(g.p0,g.cp,g.p1,nt), seg=Math.hypot(np[0]-pp[0],np[1]-pp[1]);
        if(seg<1e-6){ c.t=nt; continue; } if(seg<=budget){ budget-=seg; c.t=nt; pp=np; } else { c.t+=0.025*(budget/seg); budget=0; } } }
    if(redLight && c.t>stopT){ c.t=stopT; c.speed=0; targetSpeed=0; }
    const rbN=isRoundabout(c.bi,c.bj);
    if(rbN && (c.t>=1 || shouldUseRoundaboutRing(c.x,c.y,c.bi,c.bj))){
      enterRoundabout(c);
    } else if(c.t>=1){
      const nb=pickExit(c.ai,c.aj,c.bi,c.bj); c.ai=c.bi; c.aj=c.bj; c.bi=nb[0]; c.bj=nb[1]; c.t=0;
      c.laneIdx=null; c.laneSide=null; c._edgeKey=null; c._laneWant=null; c._laneHome=null;
      const g2=edgeGeom(c.ai,c.aj,c.bi,c.bj);
      const tn3=bezTan(g2.p0,g2.cp,g2.p1,0), tl3=Math.hypot(tn3[0],tn3[1])||1;
      const newA=Math.atan2(tn3[1],tn3[0]);
      c.a+=driveNormAng(newA-c.a)*0.4;
      const sp=Math.hypot(c.vx,c.vy);
      c.vx=tn3[0]/tl3*sp; c.vy=tn3[1]/tl3*sp;
    } else {
      const tn2=bezTan(g.p0,g.cp,g.p1,c.t), tl2=Math.hypot(tn2[0],tn2[1])||1, fx2=tn2[0]/tl2, fy2=tn2[1]/tl2;
      const nodeBlend=Math.min(c.t/0.10, (1-c.t)/0.10, 1);
      const off=(c._laneOff||0)*nodeBlend;
      const p=bez(g.p0,g.cp,g.p1,c.t);
      const targetX=p[0]-fy2*off, targetY=p[1]+fx2*off;
      updateTrafficDrivePhysics(c, g, fx2, fy2, targetX, targetY, c.speed, dt);
    }
  }
  collideParked(c); collideFences(c); collideGraves(c);
  if(Math.hypot(c.x-focusX,c.y-focusY)>2750) respawnTraffic(c);
}
function alertPeds(x,y,R){
  for(const p of peds){ if(p.state==="down"||p.hostile) continue;
    if((p.x-x)**2+(p.y-y)**2 < R*R){ p.panic=rand(2.4,4.2); p.threatX=x; p.threatY=y; p.act=null; p.onGraph=p.onGraph; } }
}
function startChat(p){
  let q=null, bd=150*150;
  for(const o of peds){ if(o===p||o.state==="down"||o.hostile||o.act||o.panic>0) continue;
    const dd=(o.x-p.x)**2+(o.y-p.y)**2; if(dd<bd){ bd=dd; q=o; } }
  if(!q){ p.actCd=rand(3,6); return; }                    // nobody nearby -> don't talk to yourself
  const T=rand(4,8);
  p.act="chat"; p.partner=q; p.chatT=T; p.talking=false;
  q.act="chat"; q.partner=p; q.chatT=T; q.talking=false; q.cross=0; q._wait=false;
}
function startBoard(p){
  const ci=Math.floor((p.x-ROAD)/GAP), cj=Math.floor((p.y-ROAD)/GAP);
  let best=null,bd=130*130,bl=null;
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j);
    for(const cpc of L.parked){ if(cpc.dead||cpc._claimed||cpc._gone) continue;
      const dd=(cpc.x-p.x)**2+(cpc.y-p.y)**2; if(dd<bd){ bd=dd; best=cpc; bl=L; } } }
  if(best){ best._claimed=true; p.tcar=best; p.tlot=bl; p.act="board"; }
  else p.actCd=rand(3,7);
}
function boardCar(p,cpc){
  if(p.tlot){ const k=p.tlot.parked.indexOf(cpc); if(k>=0) p.tlot.parked.splice(k,1); }
  cpc._gone=true;
  leaving.push({x:cpc.x,y:cpc.y,a:cpc.a,W:cpc.W,L:cpc.L,color:cpc.color,cr:cpc.cr,R:cpc.cr,
                dmgSeed:cpc.dmgSeed,hp:cpc.hp,maxHp:cpc.maxHp,dead:false,
                vx:Math.cos(cpc.a)*12, vy:Math.sin(cpc.a)*12, t:0});
  respawnPed(p);
}
function updateLeaving(dt){
  for(let i=leaving.length-1;i>=0;i--){ const cpc=leaving[i]; cpc.t+=dt;
    const f=Math.min(1,1.1*dt);
    cpc.vx+=(Math.cos(cpc.a)*175-cpc.vx)*f; cpc.vy+=(Math.sin(cpc.a)*175-cpc.vy)*f;
    cpc.x+=cpc.vx*dt; cpc.y+=cpc.vy*dt;
    collideCircleBuildings(cpc,0.1); cpc.a=Math.atan2(cpc.vy,cpc.vx);
    if(cpc.t>4.5 || Math.hypot(cpc.x-focusX,cpc.y-focusY)>1700) leaving.splice(i,1); }
}
function drawLeaving(ox,oy){ for(const cpc of leaving){ if(cpc.x<ox-50||cpc.x>ox+VW+50||cpc.y<oy-50||cpc.y>oy+VH+50) continue; drawVehicle(cpc,cpc.color); } }
function updateNpcPed(p,dt){
  const _wx=p.x, _wy=p.y; try{
  if(typeof LivingSprite!=="undefined") LivingSprite.tickAttackClip(p, dt);
  if(p.state==="dying"){
    p._dieT=(p._dieT||0)+dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    const f=1-Math.min(0.9,2.0*dt); p.vx*=f; p.vy*=f;
    const dieDur=typeof LivingSprite!=="undefined"
      ?LivingSprite.clipDuration("die", typeof PeopleSprites!=="undefined"?PeopleSprites.meta:null)
      :0.7;
    if(p._dieT>=dieDur){
      p.state="down"; p.downT=0;
      if(typeof enterPedRagdoll==="function") enterPedRagdoll(p, p.vx*2, p.vy*2);
    }
    return;
  }
  if(p.state==="down"){
    if(typeof updatePedRagdoll==="function") updatePedRagdoll(p,dt);
    else { p.x+=p.vx*dt; p.y+=p.vy*dt; const f=1-Math.min(0.9,2.2*dt); p.vx*=f; p.vy*=f; }
    p.downT+=dt; if(p.downT>3) respawnPed(p); return;
  }
  if(Math.hypot(p.x-focusX,p.y-focusY)>1900){ respawnPed(p); return; }   // recycle distant peds
  if(p.bloodPulse>0) p.bloodPulse=Math.max(0,p.bloodPulse-dt*2.2);
  if(p.hostile){                                                          // armed & provoked -> shoots back
    if(!p._combatWarm&&typeof PeopleSprites!=="undefined"&&PeopleSprites.resolveOutfit){
      const o=PeopleSprites.resolveOutfit(p);
      if(o&&PeopleSprites.prefetchCombat){ PeopleSprites.prefetchCombat(o); p._combatWarm=true; }
    }
    const tgx=mode==="car"?car.x:ped.x, tgy=mode==="car"?car.y:ped.y;
    const dxp=tgx-p.x, dyp=tgy-p.y, dd=Math.hypot(dxp,dyp)||1;
    if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,dxp,dyp);
    else p.a=Math.atan2(dyp,dxp);
    const mv = dd>170?1 : (dd<95?-0.7:0);
    p.x += dxp/dd*p.speed*1.5*mv*dt; p.y += dyp/dd*p.speed*1.5*mv*dt;
    p.fireCd-=dt;
    if(p.fireCd<=0 && dd<360 && p.weapon!=null){
      const w=WEAPONS[p.weapon], ang=p.a+(Math.random()-0.5)*0.2;
      fireWeapon(w,p.x,p.y,ang,"enemy");
      p.fireCd=w.cd*rand(2.4,3.8);
      if(typeof LivingSprite!=="undefined"){
        const pmeta=typeof PeopleSprites!=="undefined"?PeopleSprites.meta:null;
        LivingSprite.startAttackClip(p, "shoot", pmeta);
      }
    }
    { const ci=Math.floor((p.x-ROAD)/GAP), cj=Math.floor((p.y-ROAD)/GAP);
      for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(const b of L.buildings){
        const cx=clamp(p.x,b.x,b.x+b.w), cy=clamp(p.y,b.y,b.y+b.h), ex=p.x-cx, ey=p.y-cy, dd2=Math.hypot(ex,ey);
        if(dd2<p.r && dd2>0.001){ p.x+=ex/dd2*(p.r-dd2); p.y+=ey/dd2*(p.r-dd2); } } } }
    return;
  }
  if(p.panic>0){
    p.panic-=dt; p.act=null; p.cross=0; p._wait=false;
    const dx=p.x-p.threatX, dy=p.y-p.threatY, d=Math.hypot(dx,dy)||1;
    if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,dx,dy);
    else p.a=Math.atan2(dy,dx);
    const sp=p.speed*2.5; p.x+=dx/d*sp*dt; p.y+=dy/d*sp*dt;
    { const ci=Math.floor((p.x-ROAD)/GAP), cj=Math.floor((p.y-ROAD)/GAP);
      for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(const b of L.buildings){
        const cx=clamp(p.x,b.x,b.x+b.w), cy=clamp(p.y,b.y,b.y+b.h), ex=p.x-cx, ey=p.y-cy, dd=Math.hypot(ex,ey);
        if(dd<p.r && dd>0.001){ p.x+=ex/dd*(p.r-dd); p.y+=ey/dd*(p.r-dd); } } } }
    collideFences(p); return;
  }
  if(p.act==="chat"){
    const q=p.partner;
    if(!q || q.state==="down" || q.act!=="chat" || q.partner!==p){ p.act=null; p.talking=false; p.actCd=rand(7,15); p.partner=null; return; }
    const dx=q.x-p.x, dy=q.y-p.y, d=Math.hypot(dx,dy)||1;
    if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,dx,dy);
    else p.a=Math.atan2(dy,dx);
    if(d>24){ p.talking=false; p.x+=dx/d*p.speed*0.85*dt; p.y+=dy/d*p.speed*0.85*dt; }   // approach partner
    else { p.talking=true; p.chatT-=dt;
      if(p.chatT<=0){ p.act=null; p.talking=false; p.actCd=rand(9,16); p.partner=null;
        if(q.partner===p){ q.act=null; q.talking=false; q.actCd=rand(9,16); q.partner=null; } } }
    return;
  }
  if(p.act==="board"){
    const cpc=p.tcar;
    if(!cpc || cpc.dead || cpc._gone){ p.act=null; p.actCd=rand(7,15); p.tcar=null; p.tlot=null; }
    else { const dx=cpc.x-p.x, dy=cpc.y-p.y, d=Math.hypot(dx,dy)||1;
      if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,dx,dy);
      else p.a=Math.atan2(dy,dx);
      if(d<cpc.cr+p.r+2){ boardCar(p,cpc); return; }
      p.x+=dx/d*p.speed*1.15*dt; p.y+=dy/d*p.speed*1.15*dt; }
    return;
  }
  if(!p.hostile && !p.cross && !p._wait){ p.actCd-=dt;
    if(p.actCd<=0){ p.actCd=rand(7,15); const roll=rng(); if(roll<0.5) startChat(p); else if(roll<0.72) startBoard(p); } }
  if(p.onGraph){ pedWalkGraph(p,dt); }
  else {
    if(p.plaza){                                                        // free roam inside a plaza, then rejoin the graph
      p.plazaT-=dt;
      if(p.plazaT<=0){ const nb=neighbors(p.plaza.i,p.plaza.j);
        if(nb.length){ p.pa=[p.plaza.i,p.plaza.j]; p.pb=nb[(rng()*nb.length)|0]; p.pt=0; p.onGraph=true; p.plaza=null; pedPickSide(p); pedSyncPos(p); }
        else p.plazaT=3; }
    }
    p.repick-=dt;
    if(p.repick<=0 || (Math.abs(p.x-p.tx)<7 && Math.abs(p.y-p.ty)<7)){
      let nx,ny,tr=0;
      if(p.plaza){ const a=rng()*6.283, d=rng()*p.plaza.r; nx=p.plaza.cx+Math.cos(a)*d; ny=p.plaza.cy+Math.sin(a)*d; }
      else { do{ const ang=rng()*6.283, dist=rand(60,210); nx=p.x+Math.cos(ang)*dist; ny=p.y+Math.sin(ang)*dist; tr++; }
             while((inBuilding(nx,ny,p.r)||inWater(nx,ny))&&tr<14); }
      p.tx=nx; p.ty=ny; p.repick=rand(2,5);
    }
    const dx=p.tx-p.x, dy=p.ty-p.y, d=Math.hypot(dx,dy)||1;
    if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,dx,dy);
    else p.a=Math.atan2(dy,dx);
    p.x+=dx/d*p.speed*dt; p.y+=dy/d*p.speed*dt;
  }
  { const ci=Math.floor((p.x-ROAD)/GAP), cj=Math.floor((p.y-ROAD)/GAP);
    for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(const b of L.buildings){
      const cx=clamp(p.x,b.x,b.x+b.w), cy=clamp(p.y,b.y,b.y+b.h), ex=p.x-cx, ey=p.y-cy, dd=Math.hypot(ex,ey);
      if(dd<p.r){ if(dd>0.001){p.x+=ex/dd*(p.r-dd); p.y+=ey/dd*(p.r-dd);} if(!p.onGraph)p.repick=0; }
    } } }
  if(!p.onGraph) collideFences(p);
  const mdx=p.x-_wx, mdy=p.y-_wy;
  p.vx=mdx/Math.max(dt,0.001); p.vy=mdy/Math.max(dt,0.001);
  if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,mdx,mdy);
  } finally { if(inWater(p.x,p.y)){ p.x=_wx; p.y=_wy; p.vx=0; p.vy=0; } }
}

for(let i=0;i<38;i++) traffic.push(spawnTrafficCar());
for(let i=0;i<46;i++) peds.push(spawnPed());

