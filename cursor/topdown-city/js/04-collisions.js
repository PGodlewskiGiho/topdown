/* TOPDOWN CITY — 04-collisions.js */
/* ---- shared collisions ---- */
function isPlayerVehicle(e){
  return typeof car!=="undefined" && e===car && (typeof mode==="undefined" || mode==="car");
}
function collideDampenNormal(e, nx, ny, restitution){
  if(e.vx===undefined) return 0;
  const into=e.vx*nx+e.vy*ny;
  if(into>=0) return into;
  let rest=restitution;
  if(isPlayerVehicle(e)) rest=Math.min(rest, 0.03);
  const mul=1+rest;
  e.vx-=into*nx*mul;
  e.vy-=into*ny*mul;
  return into;
}
// OBB vs immobile vehicle: separation + impulse with restitution and slide friction.
function resolveVehicleStaticCollision(mover, stat, cfg){
  cfg=cfg||{};
  const skin=cfg.skin||1;
  let rest=cfg.restitution??0.2, friction=cfg.friction??0.65;
  if(isPlayerVehicle(mover)){ rest=0; friction=0.84; }
  const ov=vehicleOverlap(mover,stat,cfg.padM||0,cfg.padS||0);
  if(!ov) return null;
  const push=ov.pen+skin;
  mover.x+=ov.nx*push; mover.y+=ov.ny*push;
  if(mover.vx===undefined) return {nx:ov.nx,ny:ov.ny,pen:ov.pen,push,relInto:0};
  const vn=mover.vx*ov.nx+mover.vy*ov.ny;
  const tvx=mover.vx-vn*ov.nx, tvy=mover.vy-vn*ov.ny;
  if(vn<0){
    const vn2=-vn*rest;
    mover.vx=tvx*(1-friction)+ov.nx*vn2;
    mover.vy=tvy*(1-friction)+ov.ny*vn2;
  }else if(ov.pen>0.25 && !isPlayerVehicle(mover)){
    mover.vx=tvx*(1-friction*0.5)+ov.nx*vn*0.35;
    mover.vy=tvy*(1-friction*0.5)+ov.ny*vn*0.35;
  }else if(isPlayerVehicle(mover) && ov.pen>0.08){
    mover.vx=tvx*0.94;
    mover.vy=tvy*0.94;
  }
  return {nx:ov.nx,ny:ov.ny,pen:ov.pen,push,relInto:vn};
}
function parkedCollisionCfg(e){
  if(typeof car!=="undefined" && e===car) return {skin:1.0,restitution:0,friction:0.84,padS:-2};
  if(e.vx!==undefined && e.W) return {skin:1.0,restitution:0.12,friction:0.62,padS:-2};
  return {skin:0.5,restitution:0,friction:0.88,padS:-3};
}
function collideCircleBuildings(e,bounce){
  const ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let ii=ci-1;ii<=ci+1;ii++) for(let jj=cj-1;jj<=cj+1;jj++){ const L=getLot(ii,jj); for(const b of L.buildings){
    if(e.x+e.R<b.x||e.x-e.R>b.x+b.w||e.y+e.R<b.y||e.y-e.R>b.y+b.h) continue;
    const cx=clamp(e.x,b.x,b.x+b.w), cy=clamp(e.y,b.y,b.y+b.h);
    let dx=e.x-cx, dy=e.y-cy, d=Math.hypot(dx,dy), nx,ny;
    if(d>=e.R) continue;
    if(d>0.0001){ nx=dx/d; ny=dy/d; }
    else{ const l=e.x-b.x,r=b.x+b.w-e.x,t=e.y-b.y,bo=b.y+b.h-e.y,mn=Math.min(l,r,t,bo);
      if(mn===l){nx=-1;ny=0;}else if(mn===r){nx=1;ny=0;}else if(mn===t){nx=0;ny=-1;}else{nx=0;ny=1;} d=0; }
    e.x+=nx*(e.R-d); e.y+=ny*(e.R-d);
    const into=collideDampenNormal(e, nx, ny, bounce);
    if(into<0){
      if(e.hp!==undefined && into<-95){
        const sev=impactSeverity(Math.hypot(e.vx,e.vy), into);
        if(sev>0.22 && (e._impactCd||0)<=0){
          damageCar(e, (-into-95)*0.2*sev, cx, cy, "impact", {severity:sev});
          e._impactCd=0.35+sev*0.15;
        }
      } }
  } }
}
function carVsTraffic(){
  const psp=Math.hypot(car.vx,car.vy);
  for(const c of traffic.slice()){
    if(c.dead) continue;
    const ov=vehicleOverlap(car,c,0,0);
    if(!ov) continue;
    const nx=ov.nx, ny=ov.ny;
    car.x+=nx*ov.pen; car.y+=ny*ov.pen;
    const into=collideDampenNormal(car, nx, ny, 0.02);
    if(c.vx!==undefined){
      const tInto=c.vx*nx+c.vy*ny;
      if(tInto<0){ c.vx-=tInto*nx*0.9; c.vy-=tInto*ny*0.9; }
    }
    const sev=impactSeverity(psp, into);
    if(c.state==="drive" && psp>120 && sev>0.35){
      c.state="loose"; c.vx=-nx*(psp*0.6)+car.vx*0.3; c.vy=-ny*(psp*0.6)+car.vy*0.3; c.spin=(rng()-0.5)*6; c.downT=0; addHeat(0.2);
      if(mission&&mission.type==="wreck") mission.progress++;
      playThud(0.25+Math.min(0.35,psp/1400));
    }
    if(sev>0.2 && (car._impactCd||0)<=0){
      const dmg=sev*sev*52;
      damageCar(c, dmg*0.78, car.x, car.y, "impact", {severity:sev});
      damageCar(car, dmg*0.42, c.x, c.y, "impact", {severity:sev});
      car._impactCd=0.22+sev*0.18;
    }
  }
}
function carVsPeds(){
  const psp=Math.hypot(car.vx,car.vy);
  for(const p of peds){
    if(p.state==="down") continue;
    const R=car.R+p.r, dx=p.x-car.x, dy=p.y-car.y, d=Math.hypot(dx,dy);
    if(d>=R) continue;
    const nx=d>0.001?dx/d:Math.cos(car.a), ny=d>0.001?dy/d:Math.sin(car.a);
    if(psp>40){ p.state="down"; p.vx=nx*(psp*0.7+60)+car.vx*0.4; p.vy=ny*(psp*0.7+60)+car.vy*0.4; p.downT=0;
      if(typeof enterPedRagdoll==="function") enterPedRagdoll(p, p.vx, p.vy);
      addHeat(0.7);
      stainCharacter(p,1.2);
      const kx=nx*(psp*0.7+60)+car.vx*0.4, ky=ny*(psp*0.7+60)+car.vy*0.4;
      spawnBlood(p.x,p.y,car.vx,car.vy,1.35,Math.atan2(ny,nx));
      spawnBlood(p.x,p.y,car.vx*0.1,car.vy*0.1,0.9,Math.atan2(ny,nx));
      if(p.armed&&p.weapon!=null) dropWeapon(p.x,p.y,p.weapon); }
    else { p.x+=nx*(R-d); p.y+=ny*(R-d); }
  }
}
function pedVsTraffic(){           // player on foot pushed out of cars
  for(const c of traffic){
    const R=ped.r+c.R, dx=ped.x-c.x, dy=ped.y-c.y, d=Math.hypot(dx,dy);
    if(d>=R||d<0.0001) continue;
    ped.x+=dx/d*(R-d); ped.y+=dy/d*(R-d);
  }
}
function pedVsNpcs(){              // player gently shoves NPCs aside
  for(const p of peds){
    if(p.state==="down") continue;
    const R=ped.r+p.r, dx=p.x-ped.x, dy=p.y-ped.y, d=Math.hypot(dx,dy);
    if(d>=R||d<0.0001) continue;
    p.x+=dx/d*(R-d); p.y+=dy/d*(R-d);
  }
}

