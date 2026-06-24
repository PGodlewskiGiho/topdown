/* TOPDOWN CITY — 05-movement.js */
/* ---------- update: car ---------- */
function surfaceGripAt(x,y){
  const [ci,cj]=cellAt(x,y), b=biomeOf(ci,cj);
  if(b==="city") return 1;
  let nearRoad=false;
  for(const[di,dj]of[[0,0],[1,0],[0,1],[-1,0],[0,-1]]){
    if(getEdge(ci+di,cj+dj,1,0).exists||getEdge(ci+di,cj+dj,0,1).exists){ nearRoad=true; break; }
  }
  if(nearRoad) return b==="forest"?0.84:b==="desert"?0.86:0.88;
  return b==="desert"?0.72:0.66;
}
function recoverCarToLand(){
  if(car._lx!==undefined && !inWater(car._lx,car._ly)){ car.x=car._lx; car.y=car._ly; car.a=car._la; }
  else { const ci=Math.round(car.x/GAP), cj=Math.round(car.y/GAP); outer:
    for(let rad=1;rad<9;rad++) for(let di=-rad;di<=rad;di++) for(let dj=-rad;dj<=rad;dj++){
      if(Math.max(Math.abs(di),Math.abs(dj))!==rad||isWaterCell(ci+di,cj+dj)) continue;
      const sx=(ci+di+0.5)*GAP, sy=(cj+dj+0.5)*GAP;
      if(terrainSteepAt(sx,sy, TERRAIN_SLOPE_CAR)) continue;
      car.x=sx; car.y=sy; break outer; } }
  car.vx=0; car.vy=0; car.sinking=undefined;
}
function carDriftProfile(){
  const tm=CAR_TYPE_HANDLING[car.type]||CAR_TYPE_HANDLING.sedan;
  return tm.drift!=null?tm.drift:1.0;
}
function updateCar(dt){
  normalizeCarPerformance(car);
  if(car.sinking!==undefined){
    car.sinking+=dt; car.vx*=0.86; car.vy*=0.86; car.x+=car.vx*dt; car.y+=car.vy*dt;
    if(car.sinking>1.1){ mode="foot"; ped.x=car.x; ped.y=car.y; ped.vx=0; ped.vy=0; ped.a=car.a; recoverCarToLand(); showBigMsg("PŁYŃ DO BRZEGU"); }
    return;
  }
  if(inDeepWater(car.x,car.y)){ car.sinking=0; playSplash(); showBigMsg("AUTO TONIE!"); return; }
  car._lx=car.x; car._ly=car.y; car._la=car.a;

  const throttle=(keys["w"]||keys["arrowup"]?1:0)-(keys["s"]||keys["arrowdown"]?1:0);
  const steerIn=(keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
  const hb=!!keys[" "];
  const h=carHandling();
  const cap=carSpeedCap()+kmhToPx(h.top||0);
  const surf=surfaceGripAt(car.x,car.y);
  const onRoad=surf>=0.86;
  const driftMul=h.drift||carDriftProfile();
  const ca=Math.cos(car.a), sa=Math.sin(car.a);
  let fwd=car.vx*ca+car.vy*sa;
  let speed=Math.hypot(car.vx,car.vy);

  if(throttle>0){
    const headroom=speed>=cap?0:(speed>cap*0.94?clamp((cap-speed)/(cap*0.06),0,1):1);
    const acc=ENGINE*car.power*h.acc*(h.power||1)*throttle*headroom*surf*dt;
    car.vx+=ca*acc; car.vy+=sa*acc;
  } else if(throttle<0){
    if(fwd>5){
      const dec=Math.min(Math.abs(fwd),(BRAKE*(h.brake||1)+speed*0.35)*dt);
      car.vx-=ca*dec; car.vy-=sa*dec;
    } else {
      car.vx-=ca*REVERSE*throttle*dt; car.vy-=sa*REVERSE*throttle*dt;
    }
  } else if(Math.abs(fwd)>2){
    const eb=driveEngineBrakeDecel(fwd, DRIVE_ENGINE_BRAKE*0.42*(h.drag||1)*surf, dt);
    car.vx-=ca*eb; car.vy-=sa*eb;
  }

  speed=Math.hypot(car.vx,car.vy);
  fwd=car.vx*ca+car.vy*sa;
  const steerMul=h.turn*(0.45+0.50/(1+speed/95));
  if(speed>8||Math.abs(throttle)>0){
    const dir=fwd<-6?-1:1;
    let turnRate=steerIn*TURN*steerMul*dir;
    if(hb&&speed>24) turnRate*=1.3+clamp(speed/280,0,0.28);
    car.a+=turnRate*dt;
  }

  const c2=Math.cos(car.a), s2=Math.sin(car.a);
  fwd=car.vx*c2+car.vy*s2;
  let lat=-car.vx*s2+car.vy*c2;
  speed=Math.hypot(car.vx,car.vy);
  const slipPre=speed>6?Math.abs(lat)/speed:0;

  if(!hb){
    const grip=GRIP*3.2*h.grip*surf*driftMul;
    lat*=Math.max(0,1-Math.min(1,grip*dt));
    if(Math.abs(steerIn)<0.04&&speed>10){
      const snap=1-Math.exp(-20*dt);
      fwd+=(speed-Math.abs(fwd))*snap*Math.sign(fwd||1);
      lat*=1-snap;
    } else if(throttle>0&&speed>8){
      const snap=1-Math.exp(-12*dt);
      fwd+=(speed-Math.abs(fwd))*snap*0.65*Math.sign(fwd||1);
      lat*=1-snap*0.65;
    }
  } else {
    const grip=GRIP_HB*h.grip*surf*driftMul;
    lat*=Math.max(0,1-Math.min(1,grip*dt));
    if(throttle>0&&speed>24&&Math.abs(steerIn)>0.04) fwd+=ENGINE*car.power*throttle*0.10*dt;
  }

  car.vx=c2*fwd-s2*lat;
  car.vy=s2*fwd+c2*lat;
  speed=Math.hypot(car.vx,car.vy);

  if(speed>0){
    let loss=(AIR*h.drag+speed*AIR2)*speed*dt+ROLL*dt;
    if(hb&&slipPre>0.2) loss*=0.75;
    loss=Math.min(speed,loss);
    car.vx-=car.vx/speed*loss;
    car.vy-=car.vy/speed*loss;
  }

  const px=car.x, py=car.y;
  const tf=onRoad?1:terrainSpeedFactor(car.x,car.y,car.vx,car.vy);
  car.x+=car.vx*dt*tf; car.y+=car.vy*dt*tf;
  if(!onRoad&&resolveTerrainBlock(car,px,py,TERRAIN_SLOPE_CAR)){}

  const sc=Math.hypot(car.vx,car.vy);
  if(sc>cap){ car.vx*=cap/sc; car.vy*=cap/sc; }
  const c3=Math.cos(car.a), s3=Math.sin(car.a);
  car._fwd=car.vx*c3+car.vy*s3;
  car._lat=-car.vx*s3+car.vy*c3;
  car._slip=sc>8?Math.abs(car._lat)/sc:0;
  car._driftAngle=Math.atan2(Math.abs(car._lat),Math.max(Math.abs(car._fwd),6))*180/Math.PI;

  const slipPost=car._slip;
  const skidIntensity=Math.max(slipPost, hb&&speed>28?0.35:0);
  if(Math.abs(car._lat)>28||skidIntensity>0.32){
    const rx=-Math.cos(car.a)*car.L*0.32, ry=-Math.sin(car.a)*car.L*0.32;
    const ox=-Math.sin(car.a)*car.W*0.34, oy=Math.cos(car.a)*car.W*0.34;
    if(typeof pushSkidMark==="function"){
      pushSkidMark(car.x+rx+ox,car.y+ry+oy,car.a,skidIntensity);
      pushSkidMark(car.x+rx-ox,car.y+ry-oy,car.a,skidIntensity);
    } else {
      skid.push({x:car.x+rx+ox,y:car.y+ry+oy,a:car.a,w:2.4+skidIntensity*6,a0:0.4,life:1});
      skid.push({x:car.x+rx-ox,y:car.y+ry-oy,a:car.a,w:2.4+skidIntensity*6,a0:0.4,life:1});
      while(skid.length>SKID_MAX) skid.shift();
    }
  }

  collide();
  if(!onRoad) collideTerrain(car,TERRAIN_SLOPE_CAR,0.35);
  collideParked(car); collideLamps(car); collideSignals(car);
  if(typeof collideCrossingGates==="function") collideCrossingGates(car);
  collideTrees(car); collideRoundabouts(car); collideFences(car); collideGraves(car);
  carVsTraffic();
  collideParked(car);
  carVsPeds();
  if(!car.dead&&car.maxHp&&car.hp>0&&car.hp<car.maxHp*0.08) damageCar(car,1.4*dt,car.x,car.y,"burn");
}

function collide(){ collideCircleBuildings(car, 0.25); collideMega(car,0.35); }

/* ---------- update: on foot ---------- */
function updatePed(dt){
  if(typeof invOpen!=="undefined"&&invOpen) return;
  const ix=(keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
  const iy=(keys["s"]||keys["arrowdown"]?1:0)-(keys["w"]||keys["arrowup"]?1:0);
  const len=Math.hypot(ix,iy);
  const swim=inWater(ped.x,ped.y); ped.swimming=swim;
  const spd= swim ? ped.walk*0.55 : (keys["shift"]?ped.run:ped.walk);
  if(len>0){ ped.vx=ix/len*spd; ped.vy=iy/len*spd; ped.a=Math.atan2(iy,ix); }
  else { ped.vx=0; ped.vy=0; }
  const ppx=ped.x, ppy=ped.y;
  const ptf=terrainSpeedFactor(ped.x,ped.y, ped.vx, ped.vy);
  ped.x+=ped.vx*dt*ptf; ped.y+=ped.vy*dt*ptf;
  if(swim&&typeof applyRiverCurrentXY==="function"){
    [ped.x,ped.y]=applyRiverCurrentXY(ped.x,ped.y,dt,0.85);
  }
  if(swim&&typeof applyCanalCurrentXY==="function"){
    [ped.x,ped.y]=applyCanalCurrentXY(ped.x,ped.y,dt,0.9);
  }
  if(typeof collideCanalWalls==="function") collideCanalWalls(ped);
  resolveTerrainBlock(ped, ppx, ppy, TERRAIN_SLOPE_WALK);
  { const ci=Math.floor((ped.x-ROAD)/GAP), cj=Math.floor((ped.y-ROAD)/GAP);
    for(let ii=ci-1;ii<=ci+1;ii++) for(let jj=cj-1;jj<=cj+1;jj++){ const L=getLot(ii,jj); for(const b of L.buildings){
      const cx=Math.max(b.x,Math.min(ped.x,b.x+b.w)), cy=Math.max(b.y,Math.min(ped.y,b.y+b.h));
      const dx=ped.x-cx, dy=ped.y-cy, d=Math.hypot(dx,dy);
      if(d>=ped.r) continue;
      if(d>0.0001){ ped.x+=dx/d*(ped.r-d); ped.y+=dy/d*(ped.r-d); }
      else{ const l=ped.x-b.x, rg=b.x+b.w-ped.x, tp=ped.y-b.y, bt=b.y+b.h-ped.y, mn=Math.min(l,rg,tp,bt);
        if(mn===l)ped.x=b.x-ped.r; else if(mn===rg)ped.x=b.x+b.w+ped.r; else if(mn===tp)ped.y=b.y-ped.r; else ped.y=b.y+b.h+ped.r; }
    } } }
  collideMega(ped,0.18);
  pedVsTraffic();
  pedVsNpcs();
  collideParked(ped); collideTrees(ped); collideRoundabouts(ped); collideFences(ped); collideGraves(ped);
  if(typeof collideCrossingGates==="function") collideCrossingGates(ped);
  collideTerrain(ped, TERRAIN_SLOPE_WALK, 0.22);
}

/* ---------- camera (stable follow) ---------- */
const cam = {x:car.x, y:car.y, roll:0, shake:0, latOff:0};
function updateCam(dt){
  const a=mode==="car"?car:ped;
  const spd=mode==="car"?Math.hypot(car.vx,car.vy):Math.hypot(ped.vx,ped.vy);
  const driving=mode==="car";
  cam.roll=0; cam.shake=0; cam.latOff=0;

  const lead=driving?clamp(spd*0.16, 0, Math.min(VH*0.26, 160)):0;
  const tx=a.x+Math.cos(a.a)*lead;
  const ty=a.y+Math.sin(a.a)*lead;

  const rate=driving?6.5:11;
  const k=1-Math.exp(-rate*dt);
  cam.x+=(tx-cam.x)*k;
  cam.y+=(ty-cam.y)*k;

  const mx=driving?VW*0.18:VW*0.24, my=driving?VH*0.20:VH*0.26;
  const ox=cam.x-VW/2, oy=cam.y-VH/2;
  if(a.x<ox+mx) cam.x=a.x+mx-VW/2;
  else if(a.x>ox+VW-mx) cam.x=a.x-mx+VW/2;
  if(a.y<oy+my) cam.y=a.y+my-VH/2;
  else if(a.y>oy+VH-my) cam.y=a.y-my+VH/2;
}
