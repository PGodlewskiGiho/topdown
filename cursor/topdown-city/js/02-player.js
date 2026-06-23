/* TOPDOWN CITY — 02-player.js */
/* ---------- car ---------- */
const car = {
  x: GAP + ROAD/2,
  y: GAP + ROAD/2,
  a: 0,
  vx: 0, vy: 0,
  W: 36, L: 80, R: vehicleHitRadius(36,80,"car"),
  color: "#d9d4c8", power: 1.10,
  brand: "BMW", carName: "E30", topSpeed: 200, accent: "#1c3a8a", type: "sedan", era: "classic",
  kind: "car", rider: true, riderShirt: "#3a6ea5", riderSkin: "#e8b888", riderHelmet: false,
  hp: 260, maxHp: 260, dmgSeed: 11, dead: false
};
let focusX = car.x, focusY = car.y;   // generation/spawn anchor (the camera target)
const skid = [];             // {x,y,a}
const SKID_MAX = 620;

let mode = "car";            // "car" | "foot" | "boat"
let pboat = null;            // the boat the player is piloting
let fHeld = false;           // one-shot guard for enter/exit key
let hHeld = false;           // one-shot guard for horn key
let rHeld = false;           // one-shot guard for weather key
let bHeld = false;           // one-shot guard for buy key
let cHeld = false;           // one-shot guard for colour-cycle key
const ped = { x:car.x, y:car.y, a:0, vx:0, vy:0, r:9, walk:96, run:178 };

/* physics constants (px, seconds) */
const ENGINE = 360, BRAKE = 620, REVERSE = 200;
const AIR = 0.55;                 // drag
const ROLL = 60;                  // rolling resistance
const TURN = 2.7;                 // rad/s at grip
const GRIP = 9.0, GRIP_HB = 1.1;  // lateral friction normal / handbrake
const VK = {                       // per-vehicle-kind handling
  car:  {acc:1.0,  turn:1.0, grip:1.0, cap:0},
  moto: {acc:1.55, turn:1.5, grip:0.92, cap:600},
  bike: {acc:0.85, turn:1.6, grip:1.1, cap:190},
};
const KMH = 0.34;                 // px/s -> km/h display scale

/* ---------- input ---------- */
const keys = Object.create(null);
function setKey(e,down){
  const k = e.key.toLowerCase();
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  if(down && (k==="f"||k==="enter")){ if(!fHeld){ fHeld=true; toggleVehicle(); } }
  if(!down && (k==="f"||k==="enter")) fHeld=false;
  if(down && k==="r"){ if(!rHeld){ rHeld=true; cycleWeather(); } }
  if(!down && k==="r") rHeld=false;
  if(down && k==="b"){ if(!bHeld){ bHeld=true; tryBuy(); } }
  if(!down && k==="b") bHeld=false;
  if(down && k==="c"){ if(!cHeld){ cHeld=true; cyclePadColor(); } }
  if(!down && k==="c") cHeld=false;
  if(down && k==="m"){ if(!mHeld){ mHeld=true; toggleMute(); } }
  if(!down && k==="m") mHeld=false;
  if(down && k==="h"){ if(!hHeld){ hHeld=true; honk(); } }
  if(!down && k==="h") hHeld=false;
  if(down && ((k>="1"&&k<="9")||k==="0")){
    const idx = k==="0" ? 9 : (+k)-1;
    if(inGunShop) buyWeapon(idx); else if(owned[idx]) curWeapon=idx;
  }
  if(down && k==="q"){ if(!qHeld){ qHeld=true; cycleWeapon(-1); } }  if(!down && k==="q") qHeld=false;
  if(down && k==="e"){ if(!eHeld){ eHeld=true; cycleWeapon(1); } }   if(!down && k==="e") eHeld=false;
  keys[k]=down;
  if(down) hideBoot();
}
window.addEventListener("keydown", e=>setKey(e,true));
window.addEventListener("keyup",   e=>setKey(e,false));
let booted=false;
function hideBoot(){ initAudio(); if(actx && actx.state==="suspended") actx.resume(); if(booted) return; booted=true; const b=document.getElementById("boot"); b.style.opacity="0"; setTimeout(()=>b.remove(),420); }
window.addEventListener("pointerdown", hideBoot);

function inBuilding(x,y,r){
  const ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(const b of L.buildings){
    const cx=Math.max(b.x,Math.min(x,b.x+b.w)), cy=Math.max(b.y,Math.min(y,b.y+b.h));
    if((x-cx)**2+(y-cy)**2 < r*r) return true;
  } }
  let hit=false;
  eachMegaNearCell(ci,cj,m=>{ if(hit) return; const b=m.building;
    const cx=Math.max(b.x,Math.min(x,b.x+b.w)), cy=Math.max(b.y,Math.min(y,b.y+b.h));
    if((x-cx)**2+(y-cy)**2 < r*r) hit=true;
  });
  if(hit) return true;
  return false;
}
let interior = null;     // {type,w,h,wt,color,outX,outY,items,player} when inside a building
function nearestBuilding(){
  const ci=Math.floor((ped.x-ROAD)/GAP), cj=Math.floor((ped.y-ROAD)/GAP);
  let best=null, bd=1e9;
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(const b of L.buildings){
    const cx=clamp(ped.x,b.x,b.x+b.w), cy=clamp(ped.y,b.y,b.y+b.h), d=Math.hypot(ped.x-cx,ped.y-cy);
    if(d<bd){ bd=d; best=b; } } }
  return bd<34 ? best : null;
}
function buildHouse(w,h,wt){
  const it=[], rooms=[], walls=[];
  const X0=wt, Y0=wt, X1=w-wt, Y1=h-wt, IW=X1-X0, IH=Y1-Y0;
  const TH=Math.max(3,Math.round(wt*0.7));
  const WOOD="#6b4f34", KIT="#9aa6ad", BATH="#aebac4";
  const add=(x,y,bw,bh,c,kind,solid)=>it.push({x:Math.round(x),y:Math.round(y),w:Math.round(bw),h:Math.round(bh),c,kind,solid:!!solid});
  const wall=(x,y,bw,bh)=>walls.push({x:Math.round(x),y:Math.round(y),w:Math.max(2,Math.round(bw)),h:Math.max(2,Math.round(bh))});
  const hGap=(y,x0,x1,gaps)=>{ gaps=gaps.slice().sort((a,b)=>a[0]-b[0]); let cx=x0;
    for(const[gc,gh]of gaps){ const a=gc-gh; if(a>cx) wall(cx,y-TH/2,a-cx,TH); cx=gc+gh; } if(x1>cx) wall(cx,y-TH/2,x1-cx,TH); };
  const room=(x,y,bw,bh,name,floor)=>rooms.push({x,y,w:bw,h:bh,name,floor});

  if(IW<76 || IH<76){                                              // studio: one room, all-in-one
    room(X0,Y0,IW,IH,"studio",WOOD);
    add(X0+3,Y0+3,IW*0.34,IH*0.18,"#3a5a8a","bed",true);
    add(X1-IW*0.30,Y0+3,IW*0.27,IH*0.14,"#cdd2d6","counter",true);
    add(X1-IW*0.30,Y0+3,IW*0.13,IH*0.13,"#2b2f34","stove",false);
    add(X1-IW*0.16,Y0+IH*0.22,IW*0.13,IH*0.16,"#d2d6da","fridge",true);
    add(X0+IW*0.08,Y1-IH*0.30,IW*0.30,IH*0.14,"#7a5f8a","sofa",true);
    add(X1-IW*0.20,Y1-IH*0.28,IW*0.15,IH*0.05,"#23272c","tv",false);
    add(X0+IW*0.42,Y1-IH*0.18,IW*0.16,IH*0.10,"#8a6a3a","table",true);
    return {items:it,rooms,walls};
  }
  const LH=clamp(IH*0.46,44,IH-48), yMid=Y1-LH, xMid=X0+Math.round(IW*0.5);
  const yR=Y0+Math.round((yMid-Y0)*0.46);
  room(X0,yMid,IW,LH,"living",WOOD);
  room(X0,Y0,xMid-X0,yMid-Y0,"bedroom",WOOD);
  room(xMid,Y0,X1-xMid,yR-Y0,"bath",BATH);
  room(xMid,yR,X1-xMid,yMid-yR,"kitchen",KIT);
  const bedCx=(X0+xMid)/2, kitCx=(xMid+X1)/2, g=11;
  hGap(yMid,X0,X1,[[bedCx,g],[kitCx,g]]);                          // living <-> bedroom & kitchen
  wall(xMid-TH/2,Y0,TH,yMid-Y0);                                   // bedroom | right block
  hGap(yR,xMid,X1,[[(xMid+X1)/2,g]]);                              // bath <-> kitchen

  // ---- living room ----
  const Lx=X0,Ly=yMid,Lw=IW,Lh=LH;
  add(Lx+4,Ly+Lh*0.26,Lw*0.10,Lh*0.40,"#7a5f8a","sofa",true);
  add(Lx+Lw-5-Lw*0.05,Ly+Lh*0.30,Lw*0.05,Lh*0.30,"#23272c","tv",false);
  add(Lx+Lw*0.40,Ly+Lh*0.46,Lw*0.16,Lh*0.18,"#8a6a3a","table",true);
  add(Lx+Lw*0.34,Ly+Lh*0.40,Lw*0.30,Lh*0.32,"#4a6a78","rug",false);
  // ---- bedroom ----
  const Bx=X0,By=Y0,Bw=xMid-X0,Bh=yMid-Y0;
  add(Bx+Bw*0.30,By+4,Bw*0.40,Bh*0.34,"#3a5a8a","bed",true);
  add(Bx+Bw*0.30-Bw*0.13,By+5,Bw*0.11,Bh*0.12,"#6a4a2c","nightstand",true);
  add(Bx+4,By+Bh*0.52,Bw*0.13,Bh*0.34,"#5a3f28","wardrobe",true);
  // ---- bathroom ----
  const Hx=xMid,Hy=Y0,Hw=X1-xMid,Hh=yR-Y0;
  add(Hx+3,Hy+3,Hw*0.52,Hh*0.36,"#dde6ec","tub",true);
  add(Hx+Hw-3-Hw*0.24,Hy+3,Hw*0.24,Hh*0.30,"#eef2f4","toilet",true);
  add(Hx+Hw-3-Hw*0.22,Hy+Hh-3-Hh*0.22,Hw*0.22,Hh*0.22,"#e6ecf0","sink",true);
  // ---- kitchen ----
  const Kx=xMid,Ky=yR,Kw=X1-xMid,Kh=yMid-yR;
  add(Kx+3,Ky+3,Kw-6,Kh*0.16,"#cdd2d6","counter",true);
  add(Kx+Kw*0.18,Ky+4,Kw*0.20,Kh*0.13,"#2b2f34","stove",false);
  add(Kx+Kw*0.50,Ky+4,Kw*0.18,Kh*0.12,"#b9c0c6","sink",false);
  add(Kx+3,Ky+Kh-3-Kh*0.30,Kw*0.18,Kh*0.30,"#d2d6da","fridge",true);
  return {items:it,rooms,walls};
}
function buildInteriorItems(type,w,h){
  const it=[];
  if(type==="church"){
    it.push({x:w*0.43,y:h*0.07,w:w*0.14,h:h*0.76,c:"#7a1f2b",kind:"carpet"});            // central red aisle
    it.push({x:w*0.34,y:h*0.05,w:w*0.32,h:h*0.09,c:"#caa64a",kind:"altar",solid:true});  // altar at the far end
    const rows=Math.max(3,Math.floor(h*0.6/26));
    for(let r=0;r<rows;r++){ const yy=h*0.2+r*(h*0.62/rows);
      it.push({x:w*0.10,y:yy,w:w*0.28,h:h*0.04,c:"#6b4a2c",kind:"pew",solid:true});
      it.push({x:w*0.62,y:yy,w:w*0.28,h:h*0.04,c:"#6b4a2c",kind:"pew",solid:true}); }
    return it;
  }
  if(type==="house"){
    it.push({x:w*0.10,y:h*0.12,w:w*0.30,h:h*0.15,c:"#7a5a8a",kind:"sofa"});
    it.push({x:w*0.56,y:h*0.16,w:w*0.26,h:h*0.18,c:"#8a6a3a",kind:"table"});
    it.push({x:w*0.60,y:h*0.58,w:w*0.30,h:h*0.22,c:"#3a5a8a",kind:"bed"});
    it.push({x:w*0.10,y:h*0.56,w:w*0.16,h:h*0.26,c:"#4a7a4a",kind:"rug"});
  } else if(type==="shop"||type==="super"){
    const rows=type==="super"?4:2; for(let r=0;r<rows;r++) it.push({x:w*0.12,y:h*(0.18+r*0.17),w:w*0.76,h:h*0.055,c:"#6a6f78",kind:"shelf"});
    it.push({x:w*0.12,y:h*0.85,w:w*0.42,h:h*0.07,c:"#3a3d44",kind:"counter"});
  } else if(type==="tower"){
    it.push({x:w*0.30,y:h*0.14,w:w*0.40,h:h*0.10,c:"#2a3340",kind:"desk"});
    it.push({x:w*0.08,y:h*0.40,w:w*0.12,h:h*0.40,c:"#1f2733",kind:"elevator"});
    it.push({x:w*0.80,y:h*0.40,w:w*0.12,h:h*0.40,c:"#1f2733",kind:"elevator"});
    it.push({x:w*0.45,y:h*0.55,w:w*0.10,h:h*0.10,c:"#3a6a4a",kind:"plant"});
  } else {
    for(let r=0;r<3;r++) it.push({x:w*0.10,y:h*(0.20+r*0.12),w:w*0.16,h:h*0.08,c:"#5a5048",kind:"mailbox"});
    it.push({x:w*0.70,y:h*0.40,w:w*0.16,h:h*0.40,c:"#1f2733",kind:"elevator"});
  }
  return it;
}
function enterBuilding(b){
  const fw=Math.round(b.w), fh=Math.round(b.h);                       // interior matches the real footprint 1:1
  const wt=Math.round(clamp(Math.min(fw,fh)*0.06,5,12));
  const dhw=clamp(fw*0.11,12,26);                                     // door half-width
  if(b.church){ try{ playBell(); }catch(e){} }
  const itype=b.church?"church":b.type;
  let items, rooms=null, walls=null;
  if(itype==="house"){ const H=buildHouse(fw,fh,wt); items=H.items; rooms=H.rooms; walls=H.walls; }
  else items=buildInteriorItems(itype,fw,fh);
  interior={ type:itype, w:fw, h:fh, wt, dhw, color:b.color||"#b8b0a4", outX:ped.x, outY:ped.y,
             rooms, walls, items, player:{x:fw/2, y:fh-wt-clamp(fh*0.18,14,30), a:-Math.PI/2, vx:0, vy:0, r:9} };
  mode="inside";
}
function exitBuilding(){ if(interior){ ped.x=interior.outX; ped.y=interior.outY; ped.vx=0; ped.vy=0; } interior=null; mode="foot"; }
function updateInside(dt){
  const it=interior; if(!it){ mode="foot"; return; }
  const p=it.player;
  const ax=(keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
  const ay=(keys["s"]||keys["arrowdown"]?1:0)-(keys["w"]||keys["arrowup"]?1:0);
  const spd=keys["shift"]?ped.run:ped.walk;
  if(ax||ay){ const m=Math.hypot(ax,ay); p.vx=ax/m*spd; p.vy=ay/m*spd; p.a=Math.atan2(ay,ax); }
  else { p.vx*=0.6; p.vy*=0.6; }
  p.x+=p.vx*dt; p.y+=p.vy*dt;
  const wt=it.wt;
  p.x=clamp(p.x, wt+p.r, it.w-wt-p.r); p.y=clamp(p.y, wt+p.r, it.h-wt-p.r);
  if(it.walls) for(const o of it.walls){                                   // internal walls (pass only through doorways)
    const qx=clamp(p.x,o.x,o.x+o.w), qy=clamp(p.y,o.y,o.y+o.h), dx=p.x-qx, dy=p.y-qy, d=Math.hypot(dx,dy);
    if(d<p.r){ if(d>0.001){ p.x+=dx/d*(p.r-d); p.y+=dy/d*(p.r-d); } else p.x=o.x+o.w+p.r; } }
  for(const o of it.items){ if(!o.solid) continue;                        // walk around furniture
    const qx=clamp(p.x,o.x,o.x+o.w), qy=clamp(p.y,o.y,o.y+o.h), dx=p.x-qx, dy=p.y-qy, d=Math.hypot(dx,dy);
    if(d<p.r){ if(d>0.001){ p.x+=dx/d*(p.r-d); p.y+=dy/d*(p.r-d); } else p.y=o.y+o.h+p.r; } }
  if(p.y > it.h-wt-p.r-1 && Math.abs(p.x-it.w/2)<it.dhw) exitBuilding();   // step out through the door
}
function drawInterior(){
  const it=interior; if(!it){ return; }
  const p=it.player;
  const Z=2.8, viewW=window.innerWidth/Z, viewH=window.innerHeight/Z;   // interior zoom (independent of world ZOOM); room is real footprint size
  const cx = it.w<=viewW ? it.w/2 : clamp(p.x, viewW/2, it.w-viewW/2);
  const cy = it.h<=viewH ? it.h/2 : clamp(p.y, viewH/2, it.h-viewH/2);
  const ox=cx-viewW/2, oy=cy-viewH/2;
  ctx.setTransform(Z/PX,0,0,Z/PX,0,0);
  ctx.save(); ctx.translate(-ox,-oy);
  ctx.fillStyle="#070809"; ctx.fillRect(ox,oy,viewW,viewH);            // surroundings hidden = black
  const fl = it.type==="church"?"#8f877a":it.type==="house"?"#6b4f34":(it.type==="shop"||it.type==="super")?"#cdd2d6":it.type==="tower"?"#39434f":"#5a5048";
  if(it.rooms){
    for(const rm of it.rooms){
      ctx.fillStyle=rm.floor; ctx.fillRect(rm.x,rm.y,rm.w,rm.h);
      const tile = rm.floor==="#9aa6ad"||rm.floor==="#aebac4";
      if(tile){ ctx.strokeStyle="rgba(255,255,255,.10)"; ctx.lineWidth=1; const s=16;
        for(let x=rm.x+s;x<rm.x+rm.w;x+=s){ ctx.beginPath(); ctx.moveTo(x,rm.y); ctx.lineTo(x,rm.y+rm.h); ctx.stroke(); }
        for(let y=rm.y+s;y<rm.y+rm.h;y+=s){ ctx.beginPath(); ctx.moveTo(rm.x,y); ctx.lineTo(rm.x+rm.w,y); ctx.stroke(); } }
      else { ctx.strokeStyle="rgba(0,0,0,.10)"; ctx.lineWidth=1;
        for(let y=rm.y+8;y<rm.y+rm.h;y+=8){ ctx.beginPath(); ctx.moveTo(rm.x,y); ctx.lineTo(rm.x+rm.w,y); ctx.stroke(); } }
    }
  } else {
    ctx.fillStyle=fl; ctx.fillRect(0,0,it.w,it.h);
    ctx.strokeStyle="rgba(0,0,0,.12)"; ctx.lineWidth=1;
    for(let x=40;x<it.w;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,it.h); ctx.stroke(); }
    for(let y=40;y<it.h;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(it.w,y); ctx.stroke(); }
  }
  for(const o of it.items){ if(o.kind==="rug") drawInteriorItem(o); }
  for(const o of it.items){ if(o.kind!=="rug") drawInteriorItem(o); }
  if(it.walls){ const wcc=shade(it.color,-22); for(const o of it.walls){ ctx.fillStyle=wcc; ctx.fillRect(o.x,o.y,o.w,o.h); ctx.fillStyle="rgba(255,255,255,.10)"; ctx.fillRect(o.x,o.y,o.w,1.2); } }
  if(it.type==="church"){
    const tt=performance.now()/180;
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const ax=it.w/2, ay=it.h*0.1, gr=ctx.createRadialGradient(ax,ay,2,ax,ay,it.w*0.42);   // warm altar glow
    gr.addColorStop(0,"rgba(255,198,108,.32)"); gr.addColorStop(1,"rgba(255,198,108,0)");
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(ax,ay,it.w*0.42,0,7); ctx.fill();
    const cps=[[it.w*0.36,it.h*0.16],[it.w*0.64,it.h*0.16],[it.w*0.4,it.h*0.5],[it.w*0.6,it.h*0.5],[it.w*0.4,it.h*0.72],[it.w*0.6,it.h*0.72]];
    for(let k=0;k<cps.length;k++){ const cx=cps[k][0], cy=cps[k][1], fl=1+Math.sin(tt+k)*0.25;
      ctx.globalCompositeOperation="lighter";
      const cg=ctx.createRadialGradient(cx,cy-4,0,cx,cy-4,9*fl);
      cg.addColorStop(0,"rgba(255,210,120,.55)"); cg.addColorStop(1,"rgba(255,210,120,0)");
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy-4,9*fl,0,7); ctx.fill();
      ctx.globalCompositeOperation="source-over";
      ctx.fillStyle="#e8e0cf"; ctx.fillRect(cx-1,cy-3,2,5);
      ctx.fillStyle="#ffd27a"; ctx.beginPath(); ctx.ellipse(cx,cy-4.6,1.1,2.1*fl,0,0,7); ctx.fill(); }
    ctx.restore();
  }
  const wt=it.wt, wc=shade(it.color,-12);
  ctx.fillStyle=wc; ctx.fillRect(0,0,it.w,wt); ctx.fillRect(0,it.h-wt,it.w,wt); ctx.fillRect(0,0,wt,it.h); ctx.fillRect(it.w-wt,0,wt,it.h);
  ctx.fillStyle=fl; ctx.fillRect(it.w/2-it.dhw, it.h-wt, it.dhw*2, wt);          // door gap
  ctx.fillStyle="rgba(120,90,50,.85)"; ctx.fillRect(it.w/2-it.dhw, it.h-wt-3, it.dhw*2, 4);
  if(it.type==="church"){ const sg=["#c0392b","#2980b9","#27ae60","#f1c40f","#8e44ad"];
    const n=Math.max(3,Math.floor(it.h/90));
    for(let k=0;k<n;k++){ const yy=it.h*0.14+k*(it.h*0.66/n); ctx.fillStyle=sg[k%5];
      ctx.fillRect(1.2, yy, wt-2, it.h*0.09); ctx.fillRect(it.w-wt+0.8, yy, wt-2, it.h*0.09); }
    ctx.fillStyle="#f1c40f"; ctx.fillRect(it.w*0.4, 1.2, it.w*0.2, wt-2); }                    // altar window
  ctx.fillStyle="rgba(255,255,255,.55)"; ctx.font="bold 11px monospace"; ctx.textAlign="center"; ctx.textBaseline="alphabetic"; ctx.fillText("WYJŚCIE", it.w/2, it.h-wt-9);
  drawPerson(p,"#2f5fa0",false);
  ctx.restore();
  ctx.setTransform(1/PX,0,0,1/PX,0,0);
  const names={house:"MIESZKANIE",blok:"BLOK",tower:"WIEŻOWIEC",shop:"SKLEP",super:"SUPERMARKET",church:"KOŚCIÓŁ"};
  ctx.fillStyle="rgba(0,0,0,.55)"; ctx.fillRect(12,12,176,40);
  ctx.fillStyle="#e9ecf1"; ctx.font="bold 13px monospace"; ctx.textAlign="left"; ctx.fillText(names[it.type]||"BUDYNEK", 20, 30);
  ctx.fillStyle="rgba(233,236,241,.6)"; ctx.font="10px monospace"; ctx.fillText("F lub wyjdź dołem, by wyjść", 20, 45);
}
function drawInteriorItem(o){
  ctx.fillStyle="rgba(0,0,0,.2)"; ctx.fillRect(o.x+2,o.y+o.h,o.w,4);
  ctx.fillStyle=o.c; ctx.fillRect(o.x,o.y,o.w,o.h);
  ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1; ctx.strokeRect(o.x,o.y,o.w,o.h);
  if(o.kind==="elevator"){ ctx.fillStyle="#3a4654"; ctx.fillRect(o.x+o.w*0.3,o.y+o.h*0.1,o.w*0.4,o.h*0.8); ctx.strokeStyle="rgba(255,255,255,.2)"; ctx.strokeRect(o.x+o.w*0.3,o.y+o.h*0.1,o.w*0.4,o.h*0.8); }
  else if(o.kind==="plant"){ ctx.fillStyle="#3a6a4a"; ctx.beginPath(); ctx.arc(o.x+o.w/2,o.y+o.h/2,o.w*0.6,0,7); ctx.fill(); }
  else if(o.kind==="shelf"){ ctx.fillStyle="rgba(255,255,255,.12)"; for(let gx=o.x+4;gx<o.x+o.w-2;gx+=12) ctx.fillRect(gx,o.y+1,6,o.h-2); }
  else if(o.kind==="altar"){ ctx.fillStyle="#ece6d6"; const mx=o.x+o.w/2; ctx.fillRect(mx-0.9,o.y-7,1.8,7); ctx.fillRect(mx-3,o.y-5,6,1.6); ctx.fillStyle="rgba(255,255,255,.4)"; ctx.fillRect(o.x+2,o.y+1,o.w-4,1.4); }
  else if(o.kind==="pew"){ ctx.fillStyle="rgba(0,0,0,.28)"; ctx.fillRect(o.x,o.y-1.6,o.w,1.6); }
  else if(o.kind==="bed"){ ctx.fillStyle="#e8eef4"; ctx.fillRect(o.x+1,o.y+1,o.w-2,o.h*0.4); ctx.fillStyle="#cfd8e0"; ctx.fillRect(o.x+2,o.y+2,o.w*0.42,o.h*0.3); ctx.fillStyle=shade(o.c,-12); ctx.fillRect(o.x+1,o.y+o.h*0.42,o.w-2,o.h*0.56); }
  else if(o.kind==="sofa"){ ctx.fillStyle=shade(o.c,16); ctx.fillRect(o.x,o.y,o.w*0.28,o.h); ctx.fillStyle=shade(o.c,8); for(let k=0;k<2;k++) ctx.fillRect(o.x+o.w*0.3,o.y+2+k*(o.h*0.5),o.w*0.66,o.h*0.46-2); }
  else if(o.kind==="tv"){ ctx.fillStyle="#0c1014"; ctx.fillRect(o.x,o.y,o.w,o.h); ctx.fillStyle="#3aa0d8"; ctx.fillRect(o.x+1,o.y+1,o.w-2,o.h-2); ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.fillStyle="rgba(80,170,230,.25)"; ctx.fillRect(o.x-3,o.y-2,o.w+6,o.h+5); ctx.restore(); }
  else if(o.kind==="table"){ ctx.fillStyle=shade(o.c,-18); ctx.fillRect(o.x+1,o.y+o.h-2,o.w-2,2); ctx.fillStyle="rgba(255,255,255,.08)"; ctx.fillRect(o.x+1,o.y+1,o.w-2,2); }
  else if(o.kind==="counter"){ ctx.fillStyle="rgba(255,255,255,.14)"; ctx.fillRect(o.x+1,o.y+1,o.w-2,1.6); ctx.fillStyle="rgba(0,0,0,.12)"; ctx.fillRect(o.x+1,o.y+o.h-2,o.w-2,1.6); }
  else if(o.kind==="stove"){ ctx.fillStyle="#15181c"; ctx.fillRect(o.x+1,o.y+1,o.w-2,o.h-2); ctx.fillStyle="#3a3f45"; for(let a=0;a<2;a++)for(let b=0;b<2;b++){ ctx.beginPath(); ctx.arc(o.x+o.w*(0.3+a*0.4),o.y+o.h*(0.32+b*0.4),Math.min(o.w,o.h)*0.13,0,7); ctx.fill(); } }
  else if(o.kind==="fridge"){ ctx.fillStyle="rgba(0,0,0,.18)"; ctx.fillRect(o.x+1,o.y+o.h*0.42,o.w-2,1.4); ctx.fillStyle="#9aa0a6"; ctx.fillRect(o.x+o.w-4,o.y+o.h*0.12,1.6,o.h*0.24); ctx.fillRect(o.x+o.w-4,o.y+o.h*0.56,1.6,o.h*0.24); }
  else if(o.kind==="sink"){ ctx.fillStyle="#5a6068"; ctx.beginPath(); ctx.ellipse(o.x+o.w/2,o.y+o.h*0.55,o.w*0.32,o.h*0.3,0,0,7); ctx.fill(); ctx.fillStyle="#cfd6dc"; ctx.fillRect(o.x+o.w*0.46,o.y+2,o.w*0.08,o.h*0.34); }
  else if(o.kind==="toilet"){ ctx.fillStyle="#d4dade"; ctx.fillRect(o.x+o.w*0.2,o.y,o.w*0.6,o.h*0.3); ctx.fillStyle="#eef3f5"; ctx.beginPath(); ctx.ellipse(o.x+o.w/2,o.y+o.h*0.62,o.w*0.34,o.h*0.34,0,0,7); ctx.fill(); }
  else if(o.kind==="tub"){ ctx.fillStyle="#c2ccd4"; ctx.fillRect(o.x,o.y,o.w,o.h); ctx.fillStyle="#eaf2f6"; const m=Math.min(o.w,o.h)*0.16; ctx.fillRect(o.x+m,o.y+m,o.w-2*m,o.h-2*m); }
  else if(o.kind==="wardrobe"){ ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(o.x+o.w/2,o.y+1); ctx.lineTo(o.x+o.w/2,o.y+o.h-1); ctx.stroke(); ctx.fillStyle="#caa64a"; ctx.fillRect(o.x+o.w*0.42,o.y+o.h*0.45,1.6,o.h*0.12); ctx.fillRect(o.x+o.w*0.54,o.y+o.h*0.45,1.6,o.h*0.12); }
  else if(o.kind==="nightstand"){ ctx.fillStyle="rgba(0,0,0,.22)"; ctx.fillRect(o.x+1,o.y+o.h*0.45,o.w-2,1.2); }
  else if(o.kind==="rug"){ }
}
function toggleVehicle(){
  if(mode==="inside"){ exitBuilding(); return; }
  if(mode==="boat"){ exitBoat(); return; }
  if(mode==="car"){
    car.vx=0; car.vy=0;                                   // park on exit
    const c=Math.cos(car.a), s=Math.sin(car.a);
    const sides=[[-s,c],[s,-c],[c,s],[-c,-s]];            // left, right, front, back
    const off=car.W*0.5+ped.r+6;
    ped.x=car.x; ped.y=car.y;
    for(const [dx,dy] of sides){
      const px=car.x+dx*off, py=car.y+dy*off;
      if(!inBuilding(px,py,ped.r)){ ped.x=px; ped.y=py; break; }
    }
    ped.a=car.a; mode="foot";
  } else {
    const R=46;
    let target=null, jackpc=null, jacklot=null, bestD=Infinity, own=false;
    if(!car.dead){ const dOwn=Math.hypot(ped.x-car.x, ped.y-car.y); if(dOwn<R){ bestD=dOwn; own=true; } }
    for(const c of traffic){ if(c.state!=="drive"&&c.state!=="loose") continue; const d=Math.hypot(ped.x-c.x,ped.y-c.y); if(d<R && d<bestD){ bestD=d; target=c; own=false; } }
    const ci=Math.floor(ped.x/GAP), cj=Math.floor(ped.y/GAP);
    for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); for(const pc of L.parked){ const d=Math.hypot(ped.x-pc.x,ped.y-pc.y); if(d<R && d<bestD){ bestD=d; jackpc=pc; jacklot=L; target=null; own=false; } } }
    let boardBoat=null;
    for(const b of boats){ if(b.player) continue; const d=Math.hypot(ped.x-b.x,ped.y-b.y); if(d<R+(b.L?b.L*0.45:14) && d<bestD){ bestD=d; boardBoat=b; target=null; jackpc=null; own=false; } }
    if(boardBoat) enterBoat(boardBoat);
    else if(jackpc) jackParked(jackpc,jacklot);
    else if(target) jackCar(target);
    else if(own) mode="car";
    else { const bld=nearestBuilding(); if(bld) enterBuilding(bld); }
  }
}
function jackCar(c){
  car.x=c.x; car.y=c.y; car.a=c.a; car.vx=c.vx||0; car.vy=c.vy||0;
  car.color=c.color; car.W=c.W; car.L=c.L; car.R=vehicleHitRadius(c.W,c.L,c.kind||"car"); car.kind="car";
  car.hp=c.hp||120; car.maxHp=c.maxHp||120; car.dmgSeed=c.dmgSeed||1; car.dead=false;
  car.parts=c.parts?{...c.parts}:null;
  if(c.model){
    const m=c.model;
    car.brand=m.brand; car.carName=m.name; car.type=m.type; car.era=m.era;
    car.accent=m.accent; car.power=m.power; car.topSpeed=m.topSpeed;
  } else {
    car.brand=c.brand||""; car.carName=c.carName||"Auto"; car.type=c.type||"sedan"; car.era=c.era||"modern";
    car.accent=c.accent||"#ff5b46"; car.power=1.2; car.topSpeed=200;
  }
  const driver={state:"walk", x:c.x-Math.sin(c.a)*22, y:c.y+Math.cos(c.a)*22, a:c.a+Math.PI/2,
                tx:0,ty:0, speed:rand(70,95), r:8, color:pick(PEDCOL), vx:0,vy:0, downT:0, repick:0};
  if(peds.length<40) peds.push(driver); else Object.assign(peds[(Math.random()*peds.length)|0], driver);
  const i=traffic.indexOf(c); if(i>=0) traffic.splice(i,1);
  traffic.push(spawnTrafficCar());
  addHeat(0.4);
  rebuildGauge();
  mode="car";
}
function jackParked(pc, L){
  car.x=pc.x; car.y=pc.y; car.a=pc.a; car.vx=0; car.vy=0;
  car.color=pc.color; car.W=pc.W; car.L=pc.L; car.R=vehicleHitRadius(pc.W,pc.L,pc.kind||"car");
  car.kind=pc.kind||"car"; car.rider=true; car.riderShirt=ped.shirt||"#3a6ea5"; car.riderSkin=ped.skin||"#e8b888"; car.riderHair=ped.hair||null; car.riderHelmet=(car.kind==="moto");
  car.hp=pc.hp; car.maxHp=pc.maxHp; car.dmgSeed=pc.dmgSeed; car.dead=false;
  car.parts=pc.parts?{...pc.parts}:null;
  if(car.kind==="car"){
    if(pc.model){ const m=pc.model;
      car.brand=m.brand; car.carName=m.name; car.type=m.type; car.era=m.era; car.accent=m.accent; car.power=m.power; car.topSpeed=m.topSpeed;
    } else {
      car.brand=pc.brand||""; car.carName=pc.carName||"Auto"; car.type=pc.type||"sedan"; car.era=pc.era||"modern"; car.accent=pc.accent||"#ff5b46"; car.power=1.12; car.topSpeed=190;
    }
    rebuildGauge();
  }
  const k=L.parked.indexOf(pc); if(k>=0) L.parked.splice(k,1);
  addHeat(0.3); mode="car";
}

