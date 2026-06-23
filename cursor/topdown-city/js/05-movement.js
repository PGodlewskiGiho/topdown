/* TOPDOWN CITY — 05-movement.js */
/* ---------- update: car ---------- */
function recoverCarToLand(){
  if(car._lx!==undefined && !inWater(car._lx,car._ly)){ car.x=car._lx; car.y=car._ly; car.a=car._la; }
  else { const ci=Math.round(car.x/GAP), cj=Math.round(car.y/GAP); outer:
    for(let rad=1;rad<9;rad++) for(let di=-rad;di<=rad;di++) for(let dj=-rad;dj<=rad;dj++){
      if(Math.max(Math.abs(di),Math.abs(dj))!==rad||isWaterCell(ci+di,cj+dj)) continue;
      car.x=(ci+di+0.5)*GAP; car.y=(cj+dj+0.5)*GAP; break outer; } }
  car.vx=0; car.vy=0; car.sinking=undefined;
}
function updateCar(dt){
  if(car.sinking!==undefined){                       // car is going under
    car.sinking+=dt; car.vx*=0.86; car.vy*=0.86; car.x+=car.vx*dt; car.y+=car.vy*dt;
    if(car.sinking>1.1){ mode="foot"; ped.x=car.x; ped.y=car.y; ped.vx=0; ped.vy=0; ped.a=car.a; recoverCarToLand(); showBigMsg("PŁYŃ DO BRZEGU"); }
    return;
  }
  if(inWater(car.x,car.y)){ car.sinking=0; playSplash(); showBigMsg("AUTO TONIE!"); return; }
  car._lx=car.x; car._ly=car.y; car._la=car.a;        // remember last dry spot
  const throttle = (keys["w"]||keys["arrowup"]?1:0) - (keys["s"]||keys["arrowdown"]?1:0);
  const steerIn  = (keys["d"]||keys["arrowright"]?1:0) - (keys["a"]||keys["arrowleft"]?1:0);
  const hb = !!keys[" "];

  const vk = VK[car.kind] || VK.car;
  const c = Math.cos(car.a), s = Math.sin(car.a);
  // forward speed (signed) along heading
  let fwd = car.vx*c + car.vy*s;
  const speed = Math.hypot(car.vx, car.vy);

  // engine / brake / reverse
  if(throttle>0){ car.vx += c*ENGINE*car.power*vk.acc*throttle*dt; car.vy += s*ENGINE*car.power*vk.acc*throttle*dt; }
  else if(throttle<0){
    if(fwd > 4){ // braking
      const dec = Math.min(fwd, BRAKE*dt);
      car.vx -= c*dec; car.vy -= s*dec;
    } else {     // reverse
      car.vx += c*REVERSE*throttle*dt; car.vy += s*REVERSE*throttle*dt;
    }
  }

  // steering (scaled by speed, inverted in reverse)
  const sf = Math.min(1, speed/90);
  const dir = fwd < -2 ? -1 : 1;
  if(speed > 2) car.a += steerIn * TURN * vk.turn * sf * dir * dt;

  // grip: split velocity into forward/lateral and damp lateral
  const c2 = Math.cos(car.a), s2 = Math.sin(car.a);
  let f = car.vx*c2 + car.vy*s2;          // forward comp
  let lat = -car.vx*s2 + car.vy*c2;       // lateral comp
  const g = (hb ? GRIP_HB : GRIP) * vk.grip;
  lat -= lat * Math.min(1, g*dt);
  car.vx = c2*f - s2*lat;
  car.vy = s2*f + c2*lat;

  // drag + rolling resistance
  car.vx *= (1 - Math.min(0.9, AIR*dt));
  car.vy *= (1 - Math.min(0.9, AIR*dt));
  const sp2 = Math.hypot(car.vx,car.vy);
  if(sp2 > 0){ const rr = Math.min(sp2, ROLL*dt); car.vx -= car.vx/sp2*rr; car.vy -= car.vy/sp2*rr; }

  // integrate
  car.x += car.vx*dt; car.y += car.vy*dt;
  if(vk.cap){ const sc=Math.hypot(car.vx,car.vy); if(sc>vk.cap){ car.vx*=vk.cap/sc; car.vy*=vk.cap/sc; } }

  // skid marks when sliding
  if(Math.abs(lat) > 34 || (hb && sp2 > 30)){
    const rx = -Math.cos(car.a)*car.L*0.32, ry = -Math.sin(car.a)*car.L*0.32;
    const ox = -Math.sin(car.a)*car.W*0.34, oy =  Math.cos(car.a)*car.W*0.34;
    skid.push({x:car.x+rx+ox, y:car.y+ry+oy, a:car.a});
    skid.push({x:car.x+rx-ox, y:car.y+ry-oy, a:car.a});
    while(skid.length > SKID_MAX) skid.shift();
  }

  collide();
  collideParked(car); collideLamps(car); collideSignals(car); collideTrees(car); collideRoundabouts(car); collideFences(car); collideGraves(car);
  carVsTraffic();
  carVsPeds();
  if(!car.dead && car.maxHp && car.hp>0 && car.hp<car.maxHp*0.08) damageCar(car, 1.4*dt, car.x, car.y, "burn");
}

function collide(){ collideCircleBuildings(car, 0.25); collideMega(car,0.35); }

/* ---------- update: on foot ---------- */
function updatePed(dt){
  const ix=(keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
  const iy=(keys["s"]||keys["arrowdown"]?1:0)-(keys["w"]||keys["arrowup"]?1:0);
  const len=Math.hypot(ix,iy);
  const swim=inWater(ped.x,ped.y); ped.swimming=swim;
  const spd= swim ? ped.walk*0.55 : (keys["shift"]?ped.run:ped.walk);
  if(len>0){ ped.vx=ix/len*spd; ped.vy=iy/len*spd; ped.a=Math.atan2(iy,ix); }
  else { ped.vx=0; ped.vy=0; }
  ped.x+=ped.vx*dt; ped.y+=ped.vy*dt;
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
}

/* ---------- camera ---------- */
const cam = {x:car.x, y:car.y};
function updateCam(dt){
  const a = mode==="car" ? car : ped;
  const tx = a.x + a.vx*0.18, ty = a.y + a.vy*0.18;     // slight look-ahead
  cam.x += (tx-cam.x)*Math.min(1,8*dt);
  cam.y += (ty-cam.y)*Math.min(1,8*dt);
}

