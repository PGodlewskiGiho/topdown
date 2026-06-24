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
  const cap=carSpeedCap();
  const surf=surfaceGripAt(car.x,car.y);
  const c=Math.cos(car.a), s=Math.sin(car.a);
  let fwd=car.vx*c+car.vy*s;
  const speed=Math.hypot(car.vx,car.vy);

  if(throttle>0){
    const headroom=clamp(1-Math.pow(clamp(speed/cap,0,1),1.55),0.06,1);
    const acc=ENGINE*car.power*h.acc*throttle*headroom*surf*dt;
    car.vx+=c*acc; car.vy+=s*acc;
  } else if(throttle<0){
    if(fwd>5){
      const dec=Math.min(Math.abs(fwd),(BRAKE+speed*0.42)*dt);
      car.vx-=c*dec; car.vy-=s*dec;
    } else {
      car.vx-=c*REVERSE*throttle*dt; car.vy-=s*REVERSE*throttle*dt;
    }
  }

  const steerMul=h.turn*(0.38+0.62/(1+speed/130));
  if(speed>2){
    const dir=fwd<-3?-1:1;
    car.a+=steerIn*TURN*steerMul*dir*dt;
  } else if(Math.abs(steerIn)>0.01&&(throttle||hb)){
    car.a+=steerIn*TURN*h.turn*1.25*dt;
  }

  const c2=Math.cos(car.a), s2=Math.sin(car.a);
  let f=car.vx*c2+car.vy*s2;
  let lat=-car.vx*s2+car.vy*c2;
  const gripBase=hb?GRIP_HB:GRIP;
  const gripSpd=clamp(0.55+speed/105,0.55,1.4);
  const g=gripBase*h.grip*gripSpd*surf;
  lat*=Math.max(0,1-Math.min(1,g*dt));

  if(!hb&&speed>18){
    const align=clamp(1.1*dt*(1-speed/(cap*1.15)),0,0.045);
    const spd=Math.abs(f);
    if(spd>0.1) f+= (speed-spd)*align*Math.sign(f);
  }

  car.vx=c2*f-s2*lat;
  car.vy=s2*f+c2*lat;

  const sp2=Math.hypot(car.vx,car.vy);
  if(sp2>0){
    const drag=(AIR*h.drag+sp2*AIR2)*dt;
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

  if(Math.abs(lat)>38||(hb&&sp2>28)){
    const rx=-Math.cos(car.a)*car.L*0.32, ry=-Math.sin(car.a)*car.L*0.32;
    const ox=-Math.sin(car.a)*car.W*0.34, oy=Math.cos(car.a)*car.W*0.34;
    skid.push({x:car.x+rx+ox,y:car.y+ry+oy,a:car.a});
    skid.push({x:car.x+rx-ox,y:car.y+ry-oy,a:car.a});
    while(skid.length>SKID_MAX) skid.shift();
  }

  collide();
  collideTerrain(car,TERRAIN_SLOPE_CAR,0.35);
  collideParked(car); collideLamps(car); collideSignals(car);
  if(typeof collideCrossingGates==="function") collideCrossingGates(car);
  collideTrees(car); collideRoundabouts(car); collideFences(car); collideGraves(car);
  carVsTraffic();
  collideParked(car);   // traffic impact can push the player into parked rows
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

/* ---------- camera ---------- */
const cam = {x:car.x, y:car.y};
function updateCam(dt){
  const a=mode==="car"?car:ped;
  const spd=mode==="car"?Math.hypot(car.vx,car.vy):Math.hypot(ped.vx,ped.vy);
  const lead=mode==="car"?clamp(spd*0.22,0,120):0;
  const tx=a.x+Math.cos(a.a)*lead, ty=a.y+Math.sin(a.a)*lead;
  const ease=mode==="car"?Math.min(1,6+spd*0.012):8;
  cam.x+=(tx-cam.x)*Math.min(1,ease*dt);
  cam.y+=(ty-cam.y)*Math.min(1,ease*dt);
}

