/* TOPDOWN CITY — 13-police.js */
/* ---------- wanted level + police ---------- */
const cops=[];
let heat=0, stars=0, bustTimer=0, prevStars=0;
function addHeat(x){ heat=Math.min(5.99, heat+x); }
function spawnCop(){
  let x,y,tries=0;
  const ci=Math.round(focusX/GAP), cj=Math.round(focusY/GAP);
  do{
    if(rng()<0.5){ const i=ci+randInt(-9,9); x=nX(i,cj)+ROAD/2; y=focusY+rand(-1050,1050); }
    else        { const j=cj+randInt(-9,9); y=nY(ci,j)+ROAD/2; x=focusX+rand(-1050,1050); }
    tries++;
  } while((Math.hypot(x-cam.x,y-cam.y) < Math.max(VW,VH)*0.7 || inWater(x,y) || inBuilding(x,y,14)) && tries<40);  // arrive from off-screen, on land
  const c={x,y,a:0,vx:0,vy:0,W:40,L:88,R:vehicleHitRadius(40,88,"car"),color:"#26324c",police:true,flash:0,hp:180,fireCd:rand(0.6,1.6),kind:"car",deployed:false,
           brand:"BMW",carName:"Policja",type:"sedan",era:"modern",accent:"#3a6ea5"};
  if(rng()<0.35){ c.kind="moto"; c.W=17; c.L=44; c.R=vehicleHitRadius(c.W,c.L,"moto"); c.hp=84; c.rider=true; c.riderShirt="#26324c"; c.riderSkin=pick(SKIN); c.riderHelmet=true; }
  return c;
}
function manageCops(){
  while(cops.length<stars) cops.push(spawnCop());
  while(cops.length>stars) cops.pop();
}
const COP_ACCEL=400, COP_MAX=520;
function updateCop(c,dt){
  const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y;
  const dx=ax-c.x, dy=ay-c.y, dist=Math.hypot(dx,dy);
  let da=Math.atan2(dy,dx)-c.a; while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI;
  const speed=Math.hypot(c.vx,c.vy);
  c.a += clamp(da,-1,1)*Math.min(1,speed/55+0.35)*3.0*dt;     // steer toward target
  let thr = dist>70?1:0.15;
  const ahead=(ang)=>{ const px=c.x+Math.cos(ang)*52, py=c.y+Math.sin(ang)*52; return inWater(px,py)||inBuilding(px,py,10); };
  if(ahead(c.a)){ const lOk=!ahead(c.a-0.8), rOk=!ahead(c.a+0.8); c._av=(lOk&&!rOk)?-1:(rOk&&!lOk)?1:(c._av||1); c.a+=c._av*2.8*dt; thr*=0.25; }
  c.vx+=Math.cos(c.a)*COP_ACCEL*thr*dt; c.vy+=Math.sin(c.a)*COP_ACCEL*thr*dt;
  const cc=Math.cos(c.a), ss=Math.sin(c.a);
  let f=c.vx*cc+c.vy*ss, lat=-c.vx*ss+c.vy*cc; lat-=lat*Math.min(1,8*dt);  // grip
  c.vx=cc*f-ss*lat; c.vy=ss*f+cc*lat;
  c.vx*=(1-Math.min(0.9,0.5*dt)); c.vy*=(1-Math.min(0.9,0.5*dt));
  const sp=Math.hypot(c.vx,c.vy); if(sp>COP_MAX){ c.vx*=COP_MAX/sp; c.vy*=COP_MAX/sp; }
  const px=c.x, py=c.y; c.x+=c.vx*dt; c.y+=c.vy*dt;
  if(inWater(c.x,c.y)){ c.x=px; c.y=py; c.vx*=0.1; c.vy*=0.1; c.a+=1.5*dt; }   // never drive onto water
  collideCircleBuildings(c,0.45);
  if(Math.hypot(c.x-focusX,c.y-focusY)>3200) Object.assign(c, spawnCop());
  c.flash=(c.flash+dt*7)%2;
}
function copInteractions(dt){
  let busting=false;
  for(const c of cops){
    const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y, aR=mode==="car"?car.R:ped.r;
    const dx=ax-c.x, dy=ay-c.y, d=Math.hypot(dx,dy), R=aR+c.R;
    if(d<R && d>0.001){
      const nx=dx/d, ny=dy/d, pen=R-d;
      if(mode==="car"){
        car.x+=nx*pen*0.6; car.y+=ny*pen*0.6; c.x-=nx*pen*0.4; c.y-=ny*pen*0.4;
        const cvi=c.vx*nx+c.vy*ny, pvi=car.vx*nx+car.vy*ny;     // trade momentum
        car.vx+=(cvi-pvi)*nx*0.5; car.vy+=(cvi-pvi)*ny*0.5;
        c.vx+=(pvi-cvi)*nx*0.5; c.vy+=(pvi-cvi)*ny*0.5;
      } else { ped.x+=nx*pen; ped.y+=ny*pen; busting=true; }
    } else if(mode==="foot" && d<R+16){ busting=true; }
  }
  if(busting){ bustTimer+=dt; if(bustTimer>1.2) busted(); }
  else bustTimer=Math.max(0,bustTimer-dt*2);
}
function busted(){ heat=0; stars=0; cops.length=0; footcops.length=0; bustTimer=0; showBigMsg("ZWINIĘTY"); }
const footcops=[];
function spawnFootCop(x,y){ footcops.push({x,y,a:rng()*6.283,r:8,speed:rand(82,112),hp:22,fireCd:rand(0.4,1.1),
  skin:pick(SKIN),shirt:"#26324c",hair:pick(HAIR),hat:"cap",hatColor:"#1a2236"}); }
function killFootCop(fc){ const i=footcops.indexOf(fc); if(i>=0) footcops.splice(i,1); spawnBlood(fc.x,fc.y,0,0,1); addHeat(0.4); }
function updateFootCops(dt){
  if(stars===0){ footcops.length=0; return; }
  const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y;
  for(const c of cops){ if(c.deployed||c.kind==="moto") continue;
    if(stars>=2 && footcops.length<Math.min(4,stars) && Math.hypot(ax-c.x,ay-c.y)<240){
      spawnFootCop(c.x-Math.sin(c.a)*18, c.y+Math.cos(c.a)*18); c.deployed=true; } }
  for(let i=footcops.length-1;i>=0;i--){ const fc=footcops[i];
    const dx=ax-fc.x, dy=ay-fc.y, d=Math.hypot(dx,dy)||1; fc.a=Math.atan2(dy,dx);
    const mv=d>150?1:(d<95?-0.6:0), nx=fc.x+dx/d*fc.speed*mv*dt, ny=fc.y+dy/d*fc.speed*mv*dt;
    if(!inWater(nx,ny)){ fc.x=nx; fc.y=ny; }
    { const ci=Math.floor((fc.x-ROAD)/GAP), cj=Math.floor((fc.y-ROAD)/GAP);
      for(let a=ci-1;a<=ci+1;a++) for(let b=cj-1;b<=cj+1;b++){ const L=getLot(a,b); for(const bd of L.buildings){
        const qx=clamp(fc.x,bd.x,bd.x+bd.w), qy=clamp(fc.y,bd.y,bd.y+bd.h), ex=fc.x-qx, ey=fc.y-qy, dd=Math.hypot(ex,ey);
        if(dd<fc.r && dd>0.001){ fc.x+=ex/dd*(fc.r-dd); fc.y+=ey/dd*(fc.r-dd); } } } }
    fc.fireCd-=dt;
    if(fc.fireCd<=0 && d<320){ const ang=fc.a+(rng()-0.5)*0.16, ox=fc.x+Math.cos(ang)*12, oy=fc.y+Math.sin(ang)*12;
      spawnBullet(ox,oy,ang,620,"cop",6,"bullet"); muzzle(ox,oy,ang); playShot(); fc.fireCd=rand(0.8,1.7); }
    if(fc.hp<=0 || heat<=0 || Math.hypot(fc.x-focusX,fc.y-focusY)>2600) footcops.splice(i,1);
  }
}
function drawFootCops(ox,oy){ for(const fc of footcops){ if(fc.x<ox-30||fc.x>ox+VW+30||fc.y<oy-30||fc.y>oy+VH+30) continue; drawPerson(fc, fc.shirt, false); } }
function updateWanted(dt){
  const decay=(mission&&mission.type==="getaway")?0.13:0.05;
  heat=Math.max(0, heat-decay*dt);              // slow cool-off → you can lose them
  stars=clamp(Math.floor(heat),0,5);
  if(prevStars===0 && stars>0) showBigMsg("POSZUKIWANY");
  prevStars=stars;
  manageCops();
  for(const c of cops) updateCop(c,dt);
  updateFootCops(dt);
  copInteractions(dt);
}
let bigTimer=0;
function showBigMsg(t){ const el=document.getElementById("bigmsg"); el.textContent=t; el.style.opacity="1"; clearTimeout(bigTimer); bigTimer=setTimeout(()=>el.style.opacity="0",1800); }
function drawCop(c){
  if(c.kind==="moto"||c.kind==="bike") drawBike(c); else drawVehicle(c, c.color);
  ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.a);
  const on=c.flash<1;
  if(c.kind==="moto"){ ctx.fillStyle=on?"#ff3b3b":"#3b6bff"; ctx.fillRect(-c.L*0.5,-3,3,2.6); ctx.fillStyle=on?"#3b6bff":"#ff3b3b"; ctx.fillRect(-c.L*0.5,0.4,3,2.6); }
  else { ctx.fillStyle=on?"#ff3b3b":"#3b6bff"; ctx.fillRect(-4,-8,8,5); ctx.fillStyle=on?"#3b6bff":"#ff3b3b"; ctx.fillRect(-4,3,8,5); }
  ctx.restore();
}
function sirenGlow(c,N){
  const on=c.flash<1, col=on?"255,60,60":"70,110,255", a=0.5*Math.max(N,0.35);
  const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,46);
  g.addColorStop(0,`rgba(${col},${a})`); g.addColorStop(1,`rgba(${col},0)`);
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(c.x,c.y,46,0,7); ctx.fill();
}
let lastStars=-1;
function drawStars(){
  if(stars===lastStars) return; lastStars=stars;
  const el=document.getElementById("wanted");
  let s=""; for(let i=0;i<5;i++) s+=`<span class="${i<stars?'on':''}">★</span>`;
  el.innerHTML=s; el.style.opacity=stars>0?"1":"0";
}

