/* TOPDOWN CITY — 04-collisions.js */
/* ---- shared collisions ---- */
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
    const into=e.vx*nx+e.vy*ny; if(into<0){ e.vx-=into*nx*(1+bounce); e.vy-=into*ny*(1+bounce); if(e.hp!==undefined && into<-110) damageCar(e, (-into-110)*0.18, cx, cy, "impact"); }
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
    const into=car.vx*nx+car.vy*ny; if(into<0){ car.vx-=into*nx*1.2; car.vy-=into*ny*1.2; }
    if(c.state==="drive" && psp>120){
      c.state="loose"; c.vx=-nx*(psp*0.6)+car.vx*0.3; c.vy=-ny*(psp*0.6)+car.vy*0.3; c.spin=(rng()-0.5)*6; c.downT=0; addHeat(0.2);
      if(mission&&mission.type==="wreck") mission.progress++;
      playThud(0.25+Math.min(0.35,psp/1400));
    }
    if(psp>55){ damageCar(c, psp*0.14, car.x, car.y, "impact"); damageCar(car, psp*0.06, c.x, c.y, "impact"); }
  }
}
function carVsPeds(){
  const psp=Math.hypot(car.vx,car.vy);
  for(const p of peds){
    if(p.state==="down") continue;
    const R=car.R+p.r, dx=p.x-car.x, dy=p.y-car.y, d=Math.hypot(dx,dy);
    if(d>=R) continue;
    const nx=d>0.001?dx/d:Math.cos(car.a), ny=d>0.001?dy/d:Math.sin(car.a);
    if(psp>40){ p.state="down"; p.vx=nx*(psp*0.7+60)+car.vx*0.4; p.vy=ny*(psp*0.7+60)+car.vy*0.4; p.downT=0; addHeat(0.7); spawnBlood(p.x,p.y,car.vx,car.vy,1.3); if(p.armed&&p.weapon!=null) dropWeapon(p.x,p.y,p.weapon); }
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

