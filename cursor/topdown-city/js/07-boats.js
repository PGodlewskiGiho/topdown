/* TOPDOWN CITY — 07-boats.js */
/* ---------- boats (motorboats wandering the water; moored at docks) ---------- */
const boats=[]; let boatTimer=0;
const wakes=[];
function findWaterNear(fx,fy,minR,maxR){
  const ci=Math.round(fx/GAP), cj=Math.round(fy/GAP);
  for(let tr=0;tr<50;tr++){ const i=ci+randInt(-maxR,maxR), j=cj+randInt(-maxR,maxR);
    if(Math.max(Math.abs(i-ci),Math.abs(j-cj))<minR) continue;
    if(isWaterCell(i,j)) return [(i+0.5)*GAP,(j+0.5)*GAP]; }
  return null;
}
function spawnBoat(){ const w=findWaterNear(focusX,focusY,2,9); if(!w) return null;
  const row=rng()<0.3, b={x:w[0],y:w[1],a:rng()*6.28, v:0, vx:0, vy:0, turn:(rng()<0.5?1:-1),
    kind: row?"row":"motor", color: row?pick(["#9c6b3a","#b58a4a","#7a5a38"]):pick(["#c43a3a","#2f6fae","#d8a030","#3aa56a","#b5523a"]),
    spd: row?rand(26,40):rand(55,95), riderShirt:pick(SHIRT), riderSkin:pick(SKIN), L: row?32:46, W: row?22:28};
  if(!row && rng()<0.5){ b.passenger=true; b.pShirt=pick(SHIRT); b.pSkin=pick(SKIN); }
  return b; }
function enterBoat(b){ b.player=true; b.moored=false; b.v=0; b.vx=0; b.vy=0; pboat=b; mode="boat"; addHeat(0.15); }
function exitBoat(){ if(!pboat){ mode="foot"; return; } const b=pboat; mode="foot"; ped.x=b.x; ped.y=b.y; ped.a=b.a; ped.vx=0; ped.vy=0; b.player=false; b.spd=rand(45,85); b.turn=(rng()<0.5?1:-1); pboat=null; }
function updateBoatDrive(dt){
  const b=pboat; if(!b){ mode="foot"; return; }
  const throttle=(keys["w"]||keys["arrowup"]?1:0)-(keys["s"]||keys["arrowdown"]?1:0);
  const steer=(keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
  const isRow=(b.kind==="row"), acc=isRow?120:200, vmax=isRow?115:240, vmin=isRow?-50:-80;
  b.v=(b.v||0)+throttle*acc*dt; b.v*=(1-Math.min(0.9,0.7*dt)); b.v=clamp(b.v,vmin,vmax);
  if(Math.abs(b.v)>4) b.a += steer*1.7*dt*clamp(Math.abs(b.v)/110,0,1)*(b.v>=0?1:-1);
  const nx=b.x+Math.cos(b.a)*b.v*dt, ny=b.y+Math.sin(b.a)*b.v*dt;
  if(inWater(nx,ny)){ b.x=nx; b.y=ny; } else { if(Math.abs(b.v)>40){ b._spl=(b._spl||0)-dt; if(b._spl<=0){ splashFoam(b.x+Math.cos(b.a)*16,b.y+Math.sin(b.a)*16,7); b._spl=0.22; } } b.v*=-0.25; }   // boats can't go on land
  b.vx=Math.cos(b.a)*b.v; b.vy=Math.sin(b.a)*b.v;
  ped.x=b.x; ped.y=b.y; ped.a=b.a; ped.vx=b.vx; ped.vy=b.vy;       // ride along -> camera & hit-tests follow
}
function updateBoat(b,dt){
  if(b.player||b.moored) return;
  const ax=b.x+Math.cos(b.a)*72, ay=b.y+Math.sin(b.a)*72;
  if(!inWater(ax,ay)) b.a += b.turn*dt*2.4;            // steer away from the shore
  else if(Math.random()<0.012) b.turn=-b.turn;
  const nx=b.x+Math.cos(b.a)*b.spd*dt, ny=b.y+Math.sin(b.a)*b.spd*dt;
  if(inWater(nx,ny)){ b.x=nx; b.y=ny; } else { b.a += 2.2*dt; b._spl=(b._spl||0)-dt; if(b._spl<=0){ splashFoam(b.x+Math.cos(b.a)*16,b.y+Math.sin(b.a)*16,4); b._spl=0.5; } }   // beached -> turn in place
}
const birds=[]; let birdTimer=0;
function birdThreat(x,y,r){
  const px=(mode==="foot")?ped.x:car.x, py=(mode==="foot")?ped.y:car.y; const r2=r*r;
  if((px-x)*(px-x)+(py-y)*(py-y)<r2) return {x:px,y:py};
  for(const c of traffic){ if((c.x-x)*(c.x-x)+(c.y-y)*(c.y-y)<r2) return c; }
  return null;
}
function spawnBird(){
  const ang=rng()*6.283, dist=Math.max(VW,VH)*0.55+rng()*180, x=focusX+Math.cos(ang)*dist, y=focusY+Math.sin(ang)*dist;
  if(inWater(x,y)) return {type:"gull", x,y, z:18+rng()*16, a:rng()*6.283, v:rand(42,72), state:"fly", flap:rng()*6.283, flapSpd:rand(5,8), wander:rand(0.4,1.2), col:"#eef2f6"};
  const k=cellAt(x,y); if(biomeOf(k[0],k[1])!=="city" || inBuilding(x,y,6)) return null;
  return {type:"pigeon", x,y, z:0, a:rng()*6.283, v:0, state:"ground", flap:rng()*6.283, flapSpd:12, peckT:rand(0.5,1.8), col:(rng()<0.5?"#8a8d96":"#6f7480")};
}
function updateBirds(dt){
  birdTimer-=dt;
  for(let k=birds.length-1;k>=0;k--){ const b=birds[k];
    if(b.type==="gull"){
      b.wander-=dt; if(b.wander<=0){ b.a+=(rng()-0.5)*0.8; b.wander=rand(0.6,1.6); }
      const ax=b.x+Math.cos(b.a)*44, ay=b.y+Math.sin(b.a)*44; if(!inWater(ax,ay)) b.a+=1.5*dt;   // stay over water
      b.x+=Math.cos(b.a)*b.v*dt; b.y+=Math.sin(b.a)*b.v*dt; b.flap+=b.flapSpd*dt;
    } else {
      if(b.state==="ground"){ b.flap+=dt*3; b.peckT-=dt; b.x+=Math.cos(b.a)*6*dt; b.y+=Math.sin(b.a)*6*dt;
        if(b.peckT<=0){ b.a+=(rng()-0.5)*1.6; b.peckT=rand(0.8,2.2); }
        const th=birdThreat(b.x,b.y,66); if(th){ b.state="fly"; b.a=Math.atan2(b.y-th.y,b.x-th.x)+(rng()-0.5)*0.6; b.v=rand(70,110); b.flapSpd=15; }
      } else { b.z=Math.min(42,b.z+26*dt); b.v=Math.min(125,b.v+45*dt); b.x+=Math.cos(b.a)*b.v*dt; b.y+=Math.sin(b.a)*b.v*dt; b.flap+=b.flapSpd*dt; }
    }
    if(Math.hypot(b.x-focusX,b.y-focusY)>Math.max(VW,VH)*0.9+320) birds.splice(k,1);
  }
  if(birds.length<12 && birdTimer<=0){ birdTimer=0.5; const nb=spawnBird(); if(nb) birds.push(nb); }
}
function drawBird(b){
  const bx=b.x, by=b.y-b.z;
  if(b.z>3){ ctx.fillStyle=`rgba(0,0,0,${(0.16*Math.max(0,1-b.z/64)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(b.x,b.y,4,2,0,0,7); ctx.fill(); }
  ctx.save(); ctx.translate(bx,by); ctx.rotate(b.a);
  if(b.state==="ground"){
    ctx.fillStyle=b.col; ctx.beginPath(); ctx.ellipse(-1,0,4,2.6,0,0,7); ctx.fill();
    const bob=Math.sin(b.flap)*1.1; ctx.beginPath(); ctx.arc(3.4,bob,1.8,0,7); ctx.fill();
    ctx.fillStyle="#d8a45a"; ctx.fillRect(5+bob*0.1,-0.4,1.8,0.9);
    ctx.fillStyle="rgba(255,255,255,.25)"; ctx.beginPath(); ctx.arc(-2,-0.6,1,0,7); ctx.fill();
  } else {
    const span=6.6*(0.5+0.5*Math.abs(Math.sin(b.flap)));
    ctx.strokeStyle=b.col; ctx.lineWidth=1.7; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(-2.5,-span); ctx.quadraticCurveTo(1.5,-1.6, 2.6,0); ctx.quadraticCurveTo(1.5,1.6, -2.5,span); ctx.stroke();
    ctx.lineCap="butt";
    ctx.fillStyle=b.col; ctx.beginPath(); ctx.ellipse(0.5,0,2.2,1.1,0,0,7); ctx.fill();
  }
  ctx.restore();
}
function drawBirds(ox,oy){ for(const b of birds){ if(b.x<ox-30||b.x>ox+VW+30||b.y-b.z<oy-30||b.y>oy+VH+30) continue; drawBird(b); } }
function updateBoats(dt){
  boatTimer-=dt;
  for(let i=boats.length-1;i>=0;i--){ const b=boats[i]; updateBoat(b,dt); emitWake(b,dt); if(!b.player && Math.hypot(b.x-focusX,b.y-focusY)>3200) boats.splice(i,1); }
  updateWakes(dt);
  if(boats.length<16){ const fi=Math.round(focusX/GAP), fj=Math.round(focusY/GAP);     // moored rowboats at docks (boardable)
    for(let i=fi-3;i<=fi+3;i++)for(let j=fj-3;j<=fj+3;j++){ const L=getLot(i,j); if(!L.dock) continue; const d=L.dock;
      const ex=d.x+Math.cos(d.ang)*d.len, ey=d.y+Math.sin(d.ang)*d.len, pp=d.ang+Math.PI/2, bx=ex+Math.cos(pp)*15, by=ey+Math.sin(pp)*15;
      if(!inWater(bx,by)) continue; let near=false; for(const b of boats){ if((b.x-bx)*(b.x-bx)+(b.y-by)*(b.y-by)<30*30){ near=true; break; } }
      if(!near && boats.length<16) boats.push({x:bx,y:by,a:d.ang+Math.PI, v:0,vx:0,vy:0, kind:"row", color:"#b58a4a", spd:rand(26,40), turn:(rng()<0.5?1:-1), riderShirt:pick(SHIRT), riderSkin:pick(SKIN), L:32, W:22, moored:true});
    } }
  if(boats.length<7 && boatTimer<=0){ boatTimer=0.8; const nb=spawnBoat(); if(nb) boats.push(nb); }
}
function waterReflect(x,y,col,len,alpha,t){
  const segs=8; for(let s=0;s<segs;s++){ const u=s/segs, yy=y+u*len, wob=Math.sin(t*2.5+yy*0.22)*(1+u*1.1), a=alpha*(1-u)*(1-u);   // soft narrow wavering streak
    if(a<=0.01) continue; ctx.fillStyle=`rgba(${col},${a.toFixed(3)})`; ctx.beginPath(); ctx.ellipse(x+wob, yy, 2.4-u*0.8, len/segs*0.7, 0, 0, 7); ctx.fill(); }
}
function splashFoam(x,y,n){ for(let i=0;i<n;i++){ const a=Math.random()*6.283, sp=20+Math.random()*55;
  wakes.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:0,life:0.55+Math.random()*0.5,r0:2+Math.random()*2}); } while(wakes.length>340) wakes.shift(); }
function emitWake(b,dt){
  const sp=Math.abs(b.v!==undefined?b.v:(b.spd||0));
  if(b.player && sp<22) return; if(!b.player && sp<8) return;
  b._wt=(b._wt||0)-dt; if(b._wt>0) return; b._wt=0.05;
  const sx=b.x-Math.cos(b.a)*14, sy=b.y-Math.sin(b.a)*14, px=-Math.sin(b.a), py=Math.cos(b.a), spread=18+sp*0.06;
  for(const side of [-1,1]) wakes.push({x:sx,y:sy, vx:px*side*spread*0.5, vy:py*side*spread*0.5, t:0, life:1.6+Math.random()*0.9, r0:2.4});   // diverging V
  wakes.push({x:sx,y:sy, vx:-Math.cos(b.a)*7, vy:-Math.sin(b.a)*7, t:0, life:1.3, r0:3.4});                                                  // stern churn
  while(wakes.length>320) wakes.shift();
}
function updateWakes(dt){ for(let i=wakes.length-1;i>=0;i--){ const w=wakes[i]; w.t+=dt; w.x+=w.vx*dt; w.y+=w.vy*dt; w.vx*=0.95; w.vy*=0.95; if(w.t>=w.life) wakes.splice(i,1); } }
function drawWakes(ox,oy){ for(const w of wakes){ if(w.x<ox-20||w.x>ox+VW+20||w.y<oy-20||w.y>oy+VH+20) continue;
  const f=w.t/w.life, r=w.r0+f*9; ctx.fillStyle=`rgba(235,248,255,${((1-f)*0.5).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(w.x,w.y,r,r*0.62,0,0,7); ctx.fill(); } }
function drawBoatRider(rx,ry,shirt,skin,oars){
  ctx.fillStyle=shirt; ctx.beginPath(); ctx.ellipse(rx,ry,3.6,3,0,0,7); ctx.fill();
  ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(rx+0.6,ry,2.3,0,7); ctx.fill();
  if(oars){ ctx.strokeStyle="#7a5a33"; ctx.lineWidth=1.4; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(rx-1,ry-2.5); ctx.lineTo(rx+7,ry-9); ctx.moveTo(rx-1,ry+2.5); ctx.lineTo(rx+7,ry+9); ctx.stroke(); ctx.lineCap="butt"; }
}
function drawBoat(x,y,a,kind,color,opts){
  opts=opts||{}; ctx.save(); ctx.translate(x,y); ctx.rotate(a);
  const motor=(kind==="motor"), L=motor?46:32, hw=motor?14:11;                     // realistic size vs player (~18px = 1m)
  ctx.fillStyle="rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(2,3,L*0.5,hw*0.9,0,0,7); ctx.fill();
  ctx.fillStyle=color; ctx.beginPath();
  ctx.moveTo(L*0.5,0); ctx.quadraticCurveTo(L*0.16,-hw,-L*0.40,-hw*0.84); ctx.lineTo(-L*0.46,-hw*0.46); ctx.lineTo(-L*0.46,hw*0.46); ctx.lineTo(-L*0.40,hw*0.84); ctx.quadraticCurveTo(L*0.16,hw,L*0.5,0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.lineWidth=1.6; ctx.stroke();
  ctx.fillStyle=shade(color,-20); ctx.beginPath(); ctx.moveTo(L*0.36,0); ctx.quadraticCurveTo(L*0.05,-hw*0.66,-L*0.34,-hw*0.6); ctx.lineTo(-L*0.34,hw*0.6); ctx.quadraticCurveTo(L*0.05,hw*0.66,L*0.36,0); ctx.closePath(); ctx.fill();   // inner deck
  if(motor){
    ctx.fillStyle=shade(color,-34); rrFill(-L*0.10,-hw*0.7,L*0.22,hw*1.4,3);
    ctx.fillStyle="#9fb6c8"; ctx.fillRect(L*0.10,-hw*0.5,3.5,hw);
    ctx.fillStyle="#16181b"; ctx.fillRect(-L*0.5-5,-3.2,7,6.4);                       // outboard motor
    if(opts.driver!==false) drawBoatRider(-L*0.04,-hw*0.26, opts.dShirt||"#2f5fa0", opts.dSkin||"#e8b888");
    if(opts.passenger) drawBoatRider(-L*0.24, hw*0.30, opts.pShirt||"#b5523a", opts.pSkin||"#d8a070");
  } else {
    ctx.fillStyle=shade(color,-30); ctx.fillRect(-L*0.06,-hw*0.82,3,hw*1.64); ctx.fillRect(L*0.18,-hw*0.82,3,hw*1.64);
    if(opts.driver!==false) drawBoatRider(-L*0.04,0, opts.dShirt||"#3a6e4a", opts.dSkin||"#e8b888", true);
  }
  ctx.restore();
}
function drawBoats(ox,oy){
  drawWakes(ox,oy);
  for(const b of boats){ if(b.x<ox-40||b.x>ox+VW+40||b.y<oy-40||b.y>oy+VH+40) continue;
    const opts = b.player ? {dShirt:ped.shirt||"#2f5fa0", dSkin:ped.skin||"#e8b888"} : {dShirt:b.riderShirt, dSkin:b.riderSkin, passenger:b.passenger, pShirt:b.pShirt, pSkin:b.pSkin};
    drawBoat(b.x,b.y,b.a,b.kind||"motor",b.color||"#c43a3a",opts);
  }
}
function rrFill(x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill(); }
const debris=[];
function popHelmet(v){
  v.riderHelmet=false;
  const a=v.a+(rng()-0.5)*1.4, sp=rand(60,140);
  debris.push({x:v.x+Math.cos(v.a)*v.L*0.4, y:v.y+Math.sin(v.a)*v.L*0.4,
    vx:Math.cos(a)*sp+ (v.vx||0)*0.4, vy:Math.sin(a)*sp+(v.vy||0)*0.4, a:rng()*6.283, va:(rng()-0.5)*16, t:0, life:rand(2.5,3.5)});
}
function updateDebris(dt){
  for(let i=debris.length-1;i>=0;i--){ const d=debris[i]; d.t+=dt; d.x+=d.vx*dt; d.y+=d.vy*dt;
    const f=1-Math.min(0.9,3*dt); d.vx*=f; d.vy*=f; d.a+=d.va*dt; d.va*=0.96;
    if(d.t>d.life) debris.splice(i,1); }
}
function drawDebris(ox,oy){ for(const d of debris){ if(d.x<ox-30||d.x>ox+VW+30||d.y<oy-30||d.y>oy+VH+30) continue;
  const al=d.t>d.life-0.6?Math.max(0,(d.life-d.t)/0.6):1; ctx.globalAlpha=al;
  ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.a);
  ctx.fillStyle="rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0.5,1,5.5,4,0,0,7); ctx.fill();
  if(d.kind==="bumper"||d.kind==="door"){
    ctx.fillStyle=d.col||"#555"; rrFill(-(d.w||14)/2,-(d.h||6)/2,d.w||14,d.h||6,2);
    ctx.fillStyle="rgba(0,0,0,.35)"; ctx.strokeRect(-(d.w||14)/2,-(d.h||6)/2,d.w||14,d.h||6);
  } else if(d.kind==="glass"){
    ctx.fillStyle="rgba(195,220,235,.75)"; rrFill(-4,-3,8,6,1.2);
    ctx.strokeStyle="rgba(255,255,255,.5)"; ctx.lineWidth=0.8; ctx.strokeRect(-4,-3,8,6);
  } else {
    ctx.fillStyle="#22252a"; ctx.beginPath(); ctx.arc(0,0,5,0,7); ctx.fill();
    ctx.fillStyle="#9fd0ec"; rrFill(1,-2.4,4,4.8,1.4);
  }
  ctx.restore(); ctx.globalAlpha=1; } }
function drawBike(v){
  const L=v.L, W=v.W, moto=(v.kind==="moto");
  const rr=(cx,cy,len,wid,rad)=>rrFill(cx-len/2,cy-wid/2,len,wid,rad);
  const showRider = (v===car)? (mode==="car") : (v.rider!==false);
  let dl=v.a-(v._da===undefined?v.a:v._da); while(dl>Math.PI)dl-=6.283; while(dl<-Math.PI)dl+=6.283;   // lean from heading change
  v.lean=(v.lean||0)*0.82 + Math.max(-1,Math.min(1,dl*7))*0.18; v._da=v.a;
  const ln=v.lean;
  ctx.save(); ctx.translate(v.x,v.y); ctx.rotate(v.a);
  ctx.fillStyle="rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(1,2,L*0.5,W*0.62,0,0,7); ctx.fill();   // shadow (stays flat)
  ctx.translate(0, ln*W*0.28); ctx.rotate(ln*0.18);                                                    // body leans into the turn
  ctx.fillStyle="#15171a"; const wl=L*0.26, ww=W*0.5;                                                  // wheels
  rr(-L*0.5+wl*0.5,0,wl,ww,2); rr(L*0.5-wl*0.5,0,wl,ww,2);
  ctx.fillStyle=v.color; rr(-L*0.30,0,L*0.62,W*0.72,2.5);                                              // frame
  if(moto){ ctx.fillStyle="#2a2d31"; rr(-L*0.04,0,L*0.3,W*0.86,2);                                     // engine
    ctx.fillStyle="#cfe0ee"; rr(L*0.45,0,L*0.06,W*0.5,1); ctx.fillStyle="#e7553b"; rr(-L*0.47,0,L*0.05,W*0.42,1); }
  else { ctx.strokeStyle=shade(v.color,-22); ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(-L*0.28,0); ctx.lineTo(L*0.08,-W*0.12); ctx.lineTo(L*0.38,0); ctx.stroke(); }
  ctx.strokeStyle="#33373c"; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(L*0.32,-W*0.55); ctx.lineTo(L*0.32,W*0.55); ctx.stroke();  // handlebars
  if(showRider){ const rs=v.riderShirt||"#3a6ea5", rk=v.riderSkin||"#e8b888";
    ctx.strokeStyle=rs; ctx.lineWidth=2.2; ctx.beginPath(); ctx.moveTo(-L*0.02,-W*0.3); ctx.lineTo(L*0.3,-W*0.45); ctx.moveTo(-L*0.02,W*0.3); ctx.lineTo(L*0.3,W*0.45); ctx.stroke();
    ctx.fillStyle=rs; ctx.beginPath(); ctx.ellipse(-L*0.04,0,L*0.17,W*0.6,0,0,7); ctx.fill();
    if(moto||v.riderHelmet){ ctx.fillStyle="#22252a"; ctx.beginPath(); ctx.arc(L*0.06,0,W*0.46,0,7); ctx.fill(); ctx.fillStyle="#9fd0ec"; rr(L*0.06+W*0.22,0,W*0.16,W*0.5,1); }
    else { ctx.fillStyle=rk; ctx.beginPath(); ctx.arc(L*0.06,0,W*0.42,0,7); ctx.fill();
      if(v.riderHair){ ctx.fillStyle=v.riderHair; ctx.beginPath(); ctx.arc(L*0.02,0,W*0.42,0,7); ctx.fill(); } } }
  ctx.restore();
}
