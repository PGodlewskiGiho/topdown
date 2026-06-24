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
  if(car.sinking!==undefined){
    car.sinking+=dt; car.vx*=0.86; car.vy*=0.86; car.x+=car.vx*dt; car.y+=car.vy*dt;
    if(car.sinking>1.1){ mode="foot"; ped.x=car.x; ped.y=car.y; ped.vx=0; ped.vy=0; ped.a=car.a; recoverCarToLand(); showBigMsg("PŁYŃ DO BRZEGU"); }
    return;
  }
  if(inWater(car.x,car.y)){ car.sinking=0; playSplash(); showBigMsg("AUTO TONIE!"); return; }
  car._lx=car.x; car._ly=car.y; car._la=car.a;

  const throttle=(keys["w"]||keys["arrowup"]?1:0)-(keys["s"]||keys["arrowdown"]?1:0);
  const steerIn=(keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
  const hb=!!keys[" "];
  const h=carHandling();
  const cap=carSpeedCap()+kmhToPx(h.top||0);
  const surf=surfaceGripAt(car.x,car.y);
  const driftMul=h.drift||carDriftProfile();
  const c=Math.cos(car.a), s=Math.sin(car.a);
  let fwd=car.vx*c+car.vy*s;
  const speed=Math.hypot(car.vx,car.vy);

  if(throttle>0){
    const headroom=clamp(1-Math.pow(clamp(speed/cap,0,1),1.45),0.08,1);
    let acc=ENGINE*car.power*h.acc*(h.power||1)*throttle*headroom*surf*dt;
    if(hb&&speed>30) acc*=1.08;
    car.vx+=c*acc; car.vy+=s*acc;
  } else if(throttle<0){
    if(fwd>5){
      const dec=Math.min(Math.abs(fwd),(BRAKE*(h.brake||1)+speed*0.42)*dt);
      car.vx-=c*dec; car.vy-=s*dec;
    } else {
      car.vx-=c*REVERSE*throttle*dt; car.vy-=s*REVERSE*throttle*dt;
    }
  }

  const steerMul=h.turn*(0.42+0.58/(1+speed/118));
  if(speed>2){
    const dir=fwd<-3?-1:1;
    let turnRate=steerIn*TURN*steerMul*dir;
    if(hb&&speed>28) turnRate*=1.55+clamp(speed/220,0,0.45);
    car.a+=turnRate*dt;
  } else if(Math.abs(steerIn)>0.01&&(throttle||hb)){
    car.a+=steerIn*TURN*h.turn*1.25*dt;
  }

  const c2=Math.cos(car.a), s2=Math.sin(car.a);
  let f=car.vx*c2+car.vy*s2;
  let lat=-car.vx*s2+car.vy*c2;
  const slipPre=speed>6?Math.abs(lat)/speed:0;

  const gripSpd=clamp(0.48+speed/95,0.48,1.55);
  let rearGrip=(hb?GRIP_HB:GRIP)*h.grip*surf*gripSpd*driftMul;
  let frontGrip=GRIP*h.grip*surf*gripSpd*1.04*driftMul;
  if(hb){
    rearGrip*=0.42;
    frontGrip*=0.88;
  }
  if(throttle>0&&speed>40) rearGrip*=0.82;
  if(throttle<0&&fwd>12) frontGrip*=1.12;

  const rearShare=0.74, frontShare=0.26;
  const rearLat=lat*rearShare, frontLat=lat*frontShare;
  const newRear=rearLat*Math.max(0,1-Math.min(1,rearGrip*dt));
  const newFront=frontLat*Math.max(0,1-Math.min(1,frontGrip*dt*1.15));
  lat=newRear+newFront;

  if(hb&&throttle>0&&speed>32&&Math.abs(steerIn)>0.05){
    f+=ENGINE*car.power*throttle*0.14*dt*(0.6+slipPre);
  }

  if(!hb&&speed>18&&slipPre<0.22){
    const align=clamp(1.15*dt*(1-speed/(cap*1.12)),0,0.048);
    const spd=Math.abs(f);
    if(spd>0.1) f+=(speed-spd)*align*Math.sign(f);
  }

  car.vx=c2*f-s2*lat;
  car.vy=s2*f+c2*lat;

  const sp2=Math.hypot(car.vx,car.vy);
  if(sp2>0){
    let drag=(AIR*h.drag+sp2*AIR2)*dt;
    if(hb&&slipPre>0.25) drag*=0.72;
    const rr=Math.min(sp2,ROLL*dt);
    const loss=Math.min(sp2,drag+rr);
    car.vx-=car.vx/sp2*loss;
    car.vy-=car.vy/sp2*loss;
  }

  const px=car.x, py=car.y;
  const tf=terrainSpeedFactor(car.x,car.y,car.vx,car.vy);
  car.x+=car.vx*dt*tf; car.y+=car.vy*dt*tf;
  if(resolveTerrainBlock(car,px,py,TERRAIN_SLOPE_CAR)){}

  const sc=Math.hypot(car.vx,car.vy);
  const capEff=cap*(0.82+0.18*surf);
  if(sc>capEff){ car.vx*=capEff/sc; car.vy*=capEff/sc; }

  car._fwd=f; car._lat=lat; car._slip=sc>8?Math.abs(lat)/sc:0;
  car._driftAngle=Math.atan2(Math.abs(lat),Math.max(Math.abs(f),6))*180/Math.PI;

  const skidIntensity=Math.max(slipPre, hb&&sp2>28?0.35:0);
  if(Math.abs(lat)>28||skidIntensity>0.32){
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
  collideTerrain(car,TERRAIN_SLOPE_CAR,0.35);
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

/* ---------- camera (drift-aware) ---------- */
const cam = {x:car.x, y:car.y, roll:0, shake:0, latOff:0};
function updateCam(dt){
  const a=mode==="car"?car:ped;
  const spd=mode==="car"?Math.hypot(car.vx,car.vy):Math.hypot(ped.vx,ped.vy);
  const driving=mode==="car";
  const slip=driving?(car._slip||0):0;
  const velA=driving&&spd>8?Math.atan2(car.vy,car.vx):a.a;

  const leadMax=driving?Math.min(VH*0.36, VW*0.24, 240):0;
  let lead=clamp(spd*(driving?0.26:0), 0, leadMax);
  if(driving&&slip>0.38) lead=clamp(spd*0.30, lead, leadMax*1.05);

  let tx, ty;
  if(driving&&slip>0.34&&spd>42){
    tx=a.x+Math.cos(velA)*lead;
    ty=a.y+Math.sin(velA)*lead;
    const latSign=Math.sign(car._lat||0)||Math.sign(steerFromKeys());
    const targetLat=latSign*clamp(spd*0.04+slip*42, 0, VW*0.08);
    cam.latOff+=(targetLat-cam.latOff)*(1-Math.exp(-6*dt));
    tx+=-Math.sin(velA)*cam.latOff;
    ty+= Math.cos(velA)*cam.latOff;
    const targetRoll=clamp(-(car._lat||0)/Math.max(spd,55), -0.06, 0.06)*slip*1.1;
    cam.roll+=(targetRoll-cam.roll)*(1-Math.exp(-5*dt));
    cam.shake=Math.max(cam.shake, slip*0.004);
  } else {
    tx=a.x+Math.cos(a.a)*lead;
    ty=a.y+Math.sin(a.a)*lead;
    if(driving&&spd>28){ tx+=car.vx*0.08; ty+=car.vy*0.08; }
    cam.latOff*=1-Math.exp(-12*dt);
    cam.roll+=(0-cam.roll)*(1-Math.exp(-10*dt));
  }
  cam.shake*=Math.pow(0.82, dt*60);

  const rate=driving?(10+spd*0.028+slip*2.2):12;
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
function steerFromKeys(){
  return (keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
}
