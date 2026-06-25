/* TOPDOWN CITY — 31-interior.js */
/* ---------- building interiors: multi-floor, elevator, stairs, garage ---------- */
let interior = null;

const INT_NAMES = {house:"MIESZKANIE",blok:"BLOK MIESZKALNY",tower:"WIEŻOWIEC",shop:"SKLEP",super:"SUPERMARKET",church:"KOŚCIÓŁ"};

function interiorDims(b){
  const fw=Math.max(80, Math.round(b.w)), fh=Math.max(70, Math.round(b.h));
  const maxW=460, maxH=360, minW=220, minH=170;
  let sc=Math.min(maxW/fw, maxH/fh);
  if(fw*sc<minW) sc=minW/fw;
  if(fh*sc<minH) sc=minH/fh;
  sc=Math.min(sc, 1.15);
  return {w:Math.round(fw*sc), h:Math.round(fh*sc), scale:sc, worldW:fw, worldH:fh};
}

function buildingEntries(x,y,r){
  const out=[], ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    const L=getLot(i,j);
    for(const b of L.buildings) out.push(b);
  }
  eachMegaNearCell(ci,cj,m=>{ if(m&&m.building) out.push(m.building); });
  return out;
}

function nearBuildingDoor(x,y,b,pad){
  pad=pad||36;
  const cx=b.x+b.w*0.5, dy=y-(b.y+b.h), dx=Math.abs(x-cx);
  const doorW=clamp(b.w*0.14, 18, 56);
  return dx<doorW*0.55+8 && dy>-12 && dy<pad;
}

function findEnterableBuilding(x,y, opts){
  opts=opts||{};
  const pad=opts.withCar?58:40;
  let best=null, bd=1e9;
  for(const b of buildingEntries(x,y,pad)){
    if(b.church && opts.withCar) continue;
    if(opts.withCar && !["tower","blok","shop","super"].includes(b.type)&&!b.mega) continue;
    if(!nearBuildingDoor(x,y,b,pad)) continue;
    const d=Math.hypot(x-(b.x+b.w*0.5), y-(b.y+b.h));
    if(d<bd){ bd=d; best=b; }
  }
  return best;
}

function nearestBuilding(){ return findEnterableBuilding(ped.x, ped.y); }

function intRng(seed){ let s=(seed|0)||1; return ()=>{ s=Math.imul(s,1664525)+1013904223|0; return ((s>>>0)&0xffff)/65536; }; }

function addWall(walls,x,y,w,h){ walls.push({x:Math.round(x),y:Math.round(y),w:Math.max(2,Math.round(w)),h:Math.max(2,Math.round(h))}); }
function hWallGap(walls,y,x0,x1,gaps,th){
  th=th||4; gaps=gaps.slice().sort((a,b)=>a[0]-b[0]); let cx=x0;
  for(const[gc,gh] of gaps){ if(gc-gh/2>cx) addWall(walls,y-th/2, cx, gc-gh/2-cx, th); cx=gc+gh/2; }
  if(x1>cx) addWall(walls,y-th/2, cx, x1-cx, th);
}

function buildHousePlan(w,h,wt){
  const it=[], rooms=[], walls=[], zones=[];
  const X0=wt, Y0=wt, X1=w-wt, Y1=h-wt, IW=X1-X0, IH=Y1-Y0;
  const TH=Math.max(3,Math.round(wt*0.65));
  const WOOD="#6b4f34", KIT="#9aa6ad", BATH="#aebac4";
  const add=(x,y,bw,bh,c,kind,solid)=>it.push({x:Math.round(x),y:Math.round(y),w:Math.round(bw),h:Math.round(bh),c,kind,solid:!!solid});
  const room=(x,y,bw,bh,name,floor)=>rooms.push({x,y,w:bw,h:bh,name,floor});
  if(IW<76||IH<76){
    room(X0,Y0,IW,IH,"kawalerka",WOOD);
    add(X0+3,Y0+3,IW*0.34,IH*0.18,"#3a5a8a","bed",true);
    add(X1-IW*0.30,Y0+3,IW*0.27,IH*0.14,"#cdd2d6","counter",true);
    add(X0+IW*0.08,Y1-IH*0.30,IW*0.30,IH*0.14,"#7a5f8a","sofa",true);
    return {items:it,rooms,walls,zones,parking:false,label:"Parter"};
  }
  const LH=clamp(IH*0.46,44,IH-48), yMid=Y1-LH, xMid=X0+Math.round(IW*0.5);
  const yR=Y0+Math.round((yMid-Y0)*0.46);
  room(X0,yMid,IW,LH,"salon",WOOD);
  room(X0,Y0,xMid-X0,yMid-Y0,"sypialnia",WOOD);
  room(xMid,Y0,X1-xMid,yR-Y0,"łazienka",BATH);
  room(xMid,yR,X1-xMid,yMid-yR,"kuchnia",KIT);
  const bedCx=(X0+xMid)/2, kitCx=(xMid+X1)/2, g=11;
  hWallGap(walls,yMid,X0,X1,[[bedCx,g],[kitCx,g]],TH);
  addWall(walls,xMid-TH/2,Y0,TH,yMid-Y0);
  hWallGap(walls,yR,xMid,X1,[[(xMid+X1)/2,g]],TH);
  const Lx=X0,Ly=yMid,Lw=IW,Lh=LH;
  const Bx=X0,By=Y0,Bw=xMid-X0,Bh=yMid-Y0;
  const Hx=xMid,Hy=Y0,Hw=X1-xMid,Hh=yR-Y0;
  const Kx=xMid,Ky=yR,Kw=X1-xMid,Kh=yMid-yR;
  add(Lx+4,Ly+Lh*0.26,Lw*0.10,Lh*0.40,"#7a5f8a","sofa",true);
  add(Lx+Lw*0.40,Ly+Lh*0.46,Lw*0.16,Lh*0.18,"#8a6a3a","table",true);
  add(Bx+Bw*0.30,By+4,Bw*0.40,Bh*0.34,"#3a5a8a","bed",true);
  add(Hx+3,Hy+3,Hw*0.52,Hh*0.36,"#dde6ec","tub",true);
  add(Kx+3,Ky+3,Kw-6,Kh*0.16,"#cdd2d6","counter",true);
  if(IH>130){ zones.push({x:X1-wt*3,y:Y0+8,w:wt*2,h:IH*0.35,kind:"stairs"}); }
  return {items:it,rooms,walls,zones,parking:false,label:"Parter"};
}

function furnishApt(x,y,w,h,r,it,rooms,idx){
  const nm=`m.${idx+1}`;
  rooms.push({x:x+2,y:y+2,w:w-4,h:h-4,name:nm,floor:idx%2?"#7a6848":"#6b4f34"});
  const add=(bx,by,bw,bh,c,k,s)=>it.push({x:bx,y:by,w:bw,h:bh,c,kind:k,solid:!!s});
  if(w<55||h<45){
    add(x+w*0.15,y+h*0.12,w*0.55,h*0.22,"#3a5a8a","bed",true);
    add(x+w*0.12,y+h*0.58,w*0.35,h*0.28,"#cdd2d6","counter",true);
    return;
  }
  add(x+w*0.08,y+h*0.55,w*0.38,h*0.18,"#7a5f8a","sofa",true);
  add(x+w*0.52,y+h*0.10,w*0.38,h*0.22,"#3a5a8a","bed",true);
  add(x+w*0.52,y+h*0.55,w*0.38,h*0.30,"#aebac4","tub",true);
  add(x+w*0.10,y+h*0.12,w*0.30,h*0.14,"#8a6a3a","table",true);
  if(r()<0.5) add(x+w*0.08,y+h*0.08,w*0.14,h*0.20,"#5a3f28","wardrobe",true);
}

function buildMultiFloorPlan(type,w,h,wt,floorIdx,totalFloors,seed){
  const r=intRng(seed+floorIdx*991), it=[], rooms=[], walls=[], zones=[];
  const X0=wt, Y0=wt, X1=w-wt, Y1=h-wt, IW=X1-X0, IH=Y1-Y0;
  const add=(x,y,bw,bh,c,kind,solid)=>it.push({x:Math.round(x),y:Math.round(y),w:Math.round(bw),h:Math.round(bh),c,kind,solid:!!solid});
  const elW=clamp(IW*0.10, 22, 38), stW=clamp(IW*0.09, 18, 32);
  const elX=X0+4, stX=X1-stW-4;
  const isParking=floorIdx===0 && (type==="tower"||type==="blok");
  const label=isParking?"Garaż / parter":(floorIdx===totalFloors-1?"Piętro "+(floorIdx+1)+" (ostatnie)":"Piętro "+(floorIdx+1));

  zones.push({x:elX,y:Y0+6,w:elW,h:IH-12,kind:"elevator",label:"winda"});
  zones.push({x:stX,y:Y0+6,w:stW,h:IH-12,kind:"stairs",label:"klatka"});

  if(type==="church"){
    add(w*0.43,h*0.07,w*0.14,h*0.76,"#7a1f2b","carpet");
    add(w*0.34,h*0.05,w*0.32,h*0.09,"#caa64a","altar",true);
    return {items:it,rooms,walls,zones,parking:false,label:"Nawa"};
  }
  if(type==="shop"||type==="super"){
    const rows=type==="super"?5:3;
    for(let ri=0;ri<rows;ri++) add(X0+elW+10,Y0+14+ri*(IH-24)/rows,IW-elW-stW-20,(IH-24)/rows*0.55,"#6a6f78","shelf",true);
    add(X0+elW+10,Y1-IH*0.14,IW-elW-stW-20,IH*0.08,"#3a3d44","counter",true);
    rooms.push({x:X0+elW+8,y:Y0+8,w:IW-elW-stW-16,h:IH-16,name:type==="super"?"market":"sklep",floor:"#cdd2d6"});
    return {items:it,rooms,walls,zones,parking:false,label:"Parter"};
  }

  if(isParking){
    rooms.push({x:X0+elW+6,y:Y0+6,w:IW-elW-stW-12,h:IH-12,name:"garaż",floor:"#3a3d44"});
    const cols=Math.max(2,Math.floor((IW-elW-stW-20)/72)), rows=Math.max(2,Math.floor((IH-20)/58));
    for(let c=0;c<cols;c++) for(let rw=0;rw<rows;rw++){
      const sx=X0+elW+14+c*72, sy=Y0+14+rw*58;
      add(sx,sy,58,44,"#2e3238","parkingslot");
      zones.push({x:sx+4,y:sy+4,w:50,h:36,kind:"parkingslot"});
    }
    add(elX+elW*0.15,Y0+IH*0.42,elW*0.7,IH*0.16,"#1f2733","elevator",true);
    add(stX+stW*0.1,Y0+6,stW*0.8,IH-12,"#4a4038","stairs",false);
    return {items:it,rooms,walls,zones,parking:true,label,spawnCar:{x:X0+elW+40,y:Y0+IH*0.55,a:-Math.PI/2}};
  }

  if(floorIdx===1 && (type==="tower"||type==="blok")){
    rooms.push({x:X0+elW+8,y:Y0+8,w:IW-elW-stW-16,h:IH*0.38,name:"hol",floor:"#39434f"});
    add(X0+elW+IW*0.12,Y0+IH*0.12,IW*0.22,IH*0.08,"#2a3340","desk",true);
    add(X0+elW+IW*0.55,Y0+IH*0.10,IW*0.18,IH*0.10,"#3a6a4a","plant");
    const aptY=Y0+IH*0.44, aptH=IH*0.52;
    const nApt=type==="blok"?4:3;
    const aptW=(IW-elW-stW-16)/nApt;
    for(let i=0;i<nApt;i++) furnishApt(X0+elW+8+i*aptW, aptY, aptW-4, aptH, r, it, rooms, i);
    add(elX+elW*0.15,Y0+6,elW*0.7,IH*0.35,"#1f2733","elevator",true);
    return {items:it,rooms,walls,zones,parking:false,label:"Parter"};
  }

  // residential floors
  const corH=clamp(IH*0.14, 22, 36), corY=Y0+(IH-corH)*0.5;
  rooms.push({x:X0+elW+4,y:corY,w:IW-elW-stW-8,h:corH,name:"korytarz",floor:"#5a5048"});
  add(elX+elW*0.15,corY-corH*0.05,elW*0.7,corH*1.1,"#1f2733","elevator",true);
  add(stX+stW*0.05,corY-corH*0.05,stW*0.9,corH*1.1,"#4a4038","stairs",false);

  const nApt=type==="blok"?Math.max(4,Math.floor((IW-elW-stW)/78)):Math.max(3,Math.floor((IW-elW-stW)/88));
  const aptW=(IW-elW-stW-12)/nApt;
  const topH=(corY-Y0-8), botH=(Y1-corY-corH-8);
  for(let i=0;i<nApt;i++){
    const ax=X0+elW+6+i*aptW;
    if(topH>38) furnishApt(ax, Y0+6, aptW-4, topH, r, it, rooms, floorIdx*10+i);
    if(botH>38) furnishApt(ax, corY+corH+6, aptW-4, botH, r, it, rooms, floorIdx*10+i+50);
    if(i>0){
      addWall(walls, ax-2, Y0+4, 3, IH-8);
      hWallGap(walls, corY, ax, ax+aptW-4, [[ax+aptW*0.5, 10]], 3);
      hWallGap(walls, corY+corH, ax, ax+aptW-4, [[ax+aptW*0.5, 10]], 3);
    }
  }
  return {items:it,rooms,walls,zones,parking:false,label};
}

function buildInteriorLayout(b){
  const dim=interiorDims(b);
  const wt=Math.round(clamp(Math.min(dim.w,dim.h)*0.055, 6, 14));
  const itype=b.church?"church":(b.type||"house");
  let totalFloors=1;
  if(itype==="tower"||itype==="blok") totalFloors=clamp((b.floors||6)|0, 4, 14);
  else if(itype==="house") totalFloors=b.floors>8?2:1;
  const seed=((Math.round(b.x)*73856093)^(Math.round(b.y)*19349663))>>>0;
  const floorPlans=[];
  for(let f=0;f<totalFloors;f++){
    if(itype==="house"&&f===0) floorPlans.push(buildHousePlan(dim.w,dim.h,wt));
    else if(itype==="house"&&f===1) floorPlans.push(buildMultiFloorPlan("blok",dim.w,dim.h,wt,1,2,seed));
    else floorPlans.push(buildMultiFloorPlan(itype,dim.w,dim.h,wt,f,totalFloors,seed));
  }
  return {dim, wt, itype, totalFloors, floorPlans, seed};
}

function enterBuilding(b, opts){
  opts=opts||{};
  if(b.church){ try{ playBell(); }catch(e){} }
  const lay=buildInteriorLayout(b);
  const dhw=clamp(lay.dim.w*0.11, 14, 28);
  let startFloor=0;
  if(!opts.withCar && (lay.itype==="tower"||lay.itype==="blok") && lay.totalFloors>1) startFloor=1;
  const fp=lay.floorPlans[startFloor];
  const spawn=opts.withCar&&fp.spawnCar?fp.spawnCar:{x:lay.dim.w/2, y:lay.dim.h-lay.wt-20, a:-Math.PI/2};
  interior={
    type:lay.itype, source:b, w:lay.dim.w, h:lay.dim.h, wt:lay.wt, dhw, color:b.color||"#b8b0a4",
    outX:opts.withCar?car.x:ped.x, outY:opts.withCar?car.y:ped.y, outA:opts.withCar?car.a:ped.a,
    floors:lay.totalFloors, floor:startFloor, floorPlans:lay.floorPlans,
    player:{x:spawn.x, y:spawn.y, a:-Math.PI/2, vx:0, vy:0, r:9},
    withCar:!!opts.withCar, drivingCar:!!opts.withCar,
    icar:opts.withCar?{x:spawn.x,y:spawn.y,a:spawn.a||-Math.PI/2,vx:0,vy:0,W:car.W,L:car.L,color:car.color,R:car.R,kind:car.kind||"car",brand:car.brand,carName:car.carName,type:car.type,riderHelmet:car.riderHelmet,riderShirt:car.riderShirt,riderSkin:car.riderSkin,riderHair:car.riderHair}:null,
    _floorCd:0,
  };
  if(opts.withCar){ car.vx=0; car.vy=0; }
  mode="inside";
}

function exitBuilding(){
  if(!interior) return;
  if(interior.drivingCar&&interior.icar){
    car.x=interior.outX; car.y=interior.outY; car.a=interior.outA||0;
    car.vx=0; car.vy=0;
    mode="car";
  } else {
    ped.x=interior.outX; ped.y=interior.outY; ped.vx=0; ped.vy=0;
    mode="foot";
  }
  interior=null;
}

function currentFloorPlan(){ return interior?interior.floorPlans[interior.floor]:null; }

function pointInZone(p,z){ return p.x>z.x&&p.x<z.x+z.w&&p.y>z.y&&p.y<z.y+z.h; }

function changeInteriorFloor(delta){
  const it=interior; if(!it||it.floors<2) return;
  const nf=clamp(it.floor+delta, 0, it.floors-1);
  if(nf===it.floor) return;
  it.floor=nf;
  const fp=it.floorPlans[nf];
  it._floorCd=0.35;
  if(it.drivingCar&&it.icar){
    if(fp.parking&&fp.spawnCar){ it.icar.x=fp.spawnCar.x; it.icar.y=fp.spawnCar.y; it.icar.a=fp.spawnCar.a; it.icar.vx=it.icar.vy=0; }
    else { it.drivingCar=false; it.player.x=fp.zones.find(z=>z.kind==="elevator")?.x+20||it.w/2; it.player.y=it.h*0.5; }
  } else {
    const el=fp.zones.find(z=>z.kind==="elevator"), st=fp.zones.find(z=>z.kind==="stairs");
    const z=el||st;
    if(z){ it.player.x=z.x+z.w*0.5; it.player.y=z.y+z.h*0.5; }
    else { it.player.x=it.w/2; it.player.y=it.h*0.55; }
    it.player.vx=it.player.vy=0;
  }
}

function resolveInteriorEntity(ent, it, fp, r, dt){
  ent.x=clamp(ent.x, it.wt+r, it.w-it.wt-r);
  ent.y=clamp(ent.y, it.wt+r, it.h-it.wt-r);
  if(fp.walls) for(const o of fp.walls){
    const qx=clamp(ent.x,o.x,o.x+o.w), qy=clamp(ent.y,o.y,o.y+o.h), dx=ent.x-qx, dy=ent.y-qy, d=Math.hypot(dx,dy);
    if(d<r){ if(d>0.001){ ent.x+=dx/d*(r-d); ent.y+=dy/d*(r-d); } else ent.x=o.x+o.w+r; }
  }
  for(const o of fp.items){ if(!o.solid) continue;
    const qx=clamp(ent.x,o.x,o.x+o.w), qy=clamp(ent.y,o.y,o.y+o.h), dx=ent.x-qx, dy=ent.y-qy, d=Math.hypot(dx,dy);
    if(d<r){ if(d>0.001){ ent.x+=dx/d*(r-d); ent.y+=dy/d*(r-d); } else ent.y=o.y+o.h+r; }
  }
}

function updateInteriorCar(dt){
  const it=interior, c=it.icar, fp=currentFloorPlan();
  if(!fp||!fp.parking){ it.drivingCar=false; return; }
  const throttle=(keys["w"]||keys["arrowup"]?1:0)-(keys["s"]||keys["arrowdown"]?1:0);
  const steer=(keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
  const ca=Math.cos(c.a), sa=Math.sin(c.a);
  if(throttle){ c.vx+=ca*throttle*220*dt; c.vy+=sa*throttle*220*dt; }
  else { c.vx*=0.86; c.vy*=0.86; }
  if(steer&&Math.hypot(c.vx,c.vy)>4) c.a+=steer*2.2*dt;
  c.x+=c.vx*dt; c.y+=c.vy*dt;
  const sp=Math.hypot(c.vx,c.vy); if(sp>140){ c.vx*=140/sp; c.vy*=140/sp; }
  resolveInteriorEntity(c,it,fp,Math.max(c.W,c.L)*0.28,dt);
  it.player.x=c.x; it.player.y=c.y;
}

function updateInside(dt){
  const it=interior; if(!it){ mode="foot"; return; }
  if(it._floorCd>0) it._floorCd-=dt;
  const fp=currentFloorPlan(); if(!fp){ exitBuilding(); return; }

  if(it.drivingCar&&it.icar&&fp.parking) updateInteriorCar(dt);
  else {
    const p=it.player;
    const ax=(keys["d"]||keys["arrowright"]?1:0)-(keys["a"]||keys["arrowleft"]?1:0);
    const ay=(keys["s"]||keys["arrowdown"]?1:0)-(keys["w"]||keys["arrowup"]?1:0);
    const spd=keys["shift"]?ped.run:ped.walk;
    if(ax||ay){ const m=Math.hypot(ax,ay); p.vx=ax/m*spd; p.vy=ay/m*spd;
      if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(p,ax,ay);
      else p.a=Math.atan2(ay,ax); }
    else { p.vx*=0.6; p.vy*=0.6; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    resolveInteriorEntity(p,it,fp,p.r,dt);

    for(const z of fp.zones){
      if(!pointInZone(p,z)) continue;
      if(z.kind==="elevator"&&it._floorCd<=0){
        if(keys["e"]||keys["arrowup"]||keys["pageup"]) changeInteriorFloor(1);
        else if(keys["q"]||keys["arrowdown"]||keys["pagedown"]) changeInteriorFloor(-1);
      }
      if(z.kind==="stairs"&&it._floorCd<=0){
        if(keys["w"]||keys["arrowup"]) changeInteriorFloor(1);
        else if(keys["s"]||keys["arrowdown"]) changeInteriorFloor(-1);
      }
    }
  }

  if(!it.drivingCar && it.player.y>it.h-it.wt-it.player.r-1 && Math.abs(it.player.x-it.w/2)<it.dhw) exitBuilding();
  if(it.drivingCar&&it.icar&&fp.parking&&it.icar.y>it.h-it.wt-30&&Math.abs(it.icar.x-it.w/2)<it.dhw+20) exitBuilding();
}

function drawInteriorItem(o){
  ctx.fillStyle="rgba(0,0,0,.2)"; ctx.fillRect(o.x+2,o.y+o.h,o.w,4);
  ctx.fillStyle=o.c; ctx.fillRect(o.x,o.y,o.w,o.h);
  ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1; ctx.strokeRect(o.x,o.y,o.w,o.h);
  if(o.kind==="elevator"){
    ctx.fillStyle="#3a4654"; ctx.fillRect(o.x+o.w*0.22,o.y+o.h*0.06,o.w*0.56,o.h*0.88);
    ctx.strokeStyle="rgba(255,255,255,.25)"; ctx.strokeRect(o.x+o.w*0.22,o.y+o.h*0.06,o.w*0.56,o.h*0.88);
    ctx.fillStyle="rgba(255,255,255,.35)"; ctx.font="bold 9px monospace"; ctx.textAlign="center";
    ctx.fillText("W", o.x+o.w/2, o.y+o.h*0.52);
  } else if(o.kind==="stairs"){
    ctx.strokeStyle="rgba(255,255,255,.18)"; ctx.lineWidth=1;
    for(let s=0;s<6;s++){ const yy=o.y+o.h*(0.1+s*0.14); ctx.beginPath(); ctx.moveTo(o.x+2,yy); ctx.lineTo(o.x+o.w-2,yy); ctx.stroke(); }
  } else if(o.kind==="parkingslot"){
    ctx.strokeStyle="rgba(230,230,235,.45)"; ctx.lineWidth=1.5; ctx.strokeRect(o.x+2,o.y+2,o.w-4,o.h-4);
    ctx.fillStyle="rgba(255,255,255,.08)"; ctx.fillRect(o.x+o.w*0.35,o.y+4,2,o.h-8);
  } else if(o.kind==="plant"){ ctx.fillStyle="#3a6a4a"; ctx.beginPath(); ctx.arc(o.x+o.w/2,o.y+o.h/2,o.w*0.6,0,7); ctx.fill(); }
  else if(o.kind==="shelf"){ ctx.fillStyle="rgba(255,255,255,.12)"; for(let gx=o.x+4;gx<o.x+o.w-2;gx+=12) ctx.fillRect(gx,o.y+1,6,o.h-2); }
  else if(o.kind==="bed"){ ctx.fillStyle="#e8eef4"; ctx.fillRect(o.x+1,o.y+1,o.w-2,o.h*0.4); ctx.fillStyle=shade(o.c,-12); ctx.fillRect(o.x+1,o.y+o.h*0.42,o.w-2,o.h*0.56); }
  else if(o.kind==="sofa"){ ctx.fillStyle=shade(o.c,8); ctx.fillRect(o.x,o.y,o.w*0.28,o.h); ctx.fillRect(o.x+o.w*0.3,o.y+2,o.w*0.66,o.h-4); }
  else if(o.kind==="tub"){ ctx.fillStyle="#c2ccd4"; ctx.fillRect(o.x,o.y,o.w,o.h); ctx.fillStyle="#eaf2f6"; ctx.fillRect(o.x+4,o.y+4,o.w-8,o.h-8); }
  else if(o.kind==="counter"){ ctx.fillStyle="rgba(255,255,255,.14)"; ctx.fillRect(o.x+1,o.y+1,o.w-2,1.6); }
  else if(o.kind==="desk"){ ctx.fillStyle="rgba(255,255,255,.1)"; ctx.fillRect(o.x+2,o.y+2,o.w-4,o.h*0.35); }
  else if(o.kind==="altar"){ ctx.fillStyle="#ece6d6"; const mx=o.x+o.w/2; ctx.fillRect(mx-0.9,o.y-7,1.8,7); ctx.fillRect(mx-3,o.y-5,6,1.6); }
  else if(o.kind==="pew"){ ctx.fillStyle="rgba(0,0,0,.28)"; ctx.fillRect(o.x,o.y-1.6,o.w,1.6); }
  else if(o.kind==="carpet"){ ctx.fillStyle=o.c; ctx.globalAlpha=0.85; ctx.fillRect(o.x,o.y,o.w,o.h); ctx.globalAlpha=1; }
}

function drawInterior(){
  const it=interior; if(!it) return;
  const fp=currentFloorPlan(), p=it.drivingCar&&it.icar?it.icar:it.player;
  const Z=2.65, viewW=window.innerWidth/Z, viewH=window.innerHeight/Z;
  const cx=it.w<=viewW?it.w/2:clamp(p.x,viewW/2,it.w-viewW/2);
  const cy=it.h<=viewH?it.h/2:clamp(p.y,viewH/2,it.h-viewH/2);
  const ox=cx-viewW/2, oy=cy-viewH/2;
  ctx.setTransform(Z/PX,0,0,Z/PX,0,0);
  ctx.save(); ctx.translate(-ox,-oy);
  ctx.fillStyle="#070809"; ctx.fillRect(ox,oy,viewW,viewH);
  const fl=it.type==="church"?"#8f877a":fp.parking?"#3a3d44":it.type==="house"?"#6b4f34":(it.type==="shop"||it.type==="super")?"#cdd2d6":it.type==="tower"?"#39434f":"#5a5048";
  if(fp.rooms){
    for(const rm of fp.rooms){
      ctx.fillStyle=rm.floor||fl; ctx.fillRect(rm.x,rm.y,rm.w,rm.h);
      ctx.strokeStyle="rgba(0,0,0,.08)"; ctx.lineWidth=1;
      for(let y=rm.y+10;y<rm.y+rm.h;y+=10){ ctx.beginPath(); ctx.moveTo(rm.x,y); ctx.lineTo(rm.x+rm.w,y); ctx.stroke(); }
    }
  } else { ctx.fillStyle=fl; ctx.fillRect(0,0,it.w,it.h); }
  for(const o of fp.items){ if(o.kind==="rug"||o.kind==="parkingslot") drawInteriorItem(o); }
  for(const o of fp.items){ if(o.kind!=="rug"&&o.kind!=="parkingslot") drawInteriorItem(o); }
  for(const z of fp.zones){
    if(z.kind==="elevator"){ ctx.fillStyle="rgba(80,180,255,.07)"; ctx.fillRect(z.x,z.y,z.w,z.h); ctx.strokeStyle="rgba(120,200,255,.25)"; ctx.strokeRect(z.x,z.y,z.w,z.h); }
    if(z.kind==="stairs"){ ctx.fillStyle="rgba(255,200,120,.06)"; ctx.fillRect(z.x,z.y,z.w,z.h); }
  }
  if(fp.walls){ const wcc=shade(it.color,-22); for(const o of fp.walls){ ctx.fillStyle=wcc; ctx.fillRect(o.x,o.y,o.w,o.h); } }
  const wt=it.wt, wc=shade(it.color,-12);
  ctx.fillStyle=wc; ctx.fillRect(0,0,it.w,it.wt); ctx.fillRect(0,it.h-wt,it.w,it.wt); ctx.fillRect(0,0,wt,it.h); ctx.fillRect(it.w-wt,0,wt,it.h);
  ctx.fillStyle=fl; ctx.fillRect(it.w/2-it.dhw,it.h-wt,it.dhw*2,wt);
  ctx.fillStyle="rgba(120,90,50,.85)"; ctx.fillRect(it.w/2-it.dhw,it.h-wt-3,it.dhw*2,4);
  ctx.fillStyle="rgba(255,255,255,.55)"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
  ctx.fillText(it.drivingCar?"WYJAZD":"WYJŚCIE", it.w/2, it.h-wt-9);

  if(it.drivingCar&&it.icar) drawVehicle(it.icar, it.icar.color);
  else drawPerson(it.player, ped.shirt||"#2f5fa0", false);

  ctx.restore(); ctx.setTransform(1/PX,0,0,1/PX,0,0);
  const inLift=fp.zones.some(z=>z.kind==="elevator"&&pointInZone(it.player,z));
  ctx.fillStyle="rgba(0,0,0,.55)"; ctx.fillRect(12,12,220,it.floors>1?56:40);
  ctx.fillStyle="#e9ecf1"; ctx.font="bold 13px monospace"; ctx.textAlign="left";
  ctx.fillText((INT_NAMES[it.type]||"BUDYNEK")+(it.floors>1?` · ${fp.label||""}`:""), 20, 30);
  ctx.fillStyle="rgba(233,236,241,.65)"; ctx.font="10px monospace";
  ctx.fillText("F — wyjście", 20, 45);
  if(it.floors>1){
    ctx.fillText(inLift?"E/Q lub ↑↓ — piętro · schody: W/S":"Wejdź do windy (E/Q) lub schodów (W/S)", 20, 58);
  }
  if(it.withCar&&fp.parking) ctx.fillText(it.drivingCar?"F — wysiądź z auta":"F — wsiądź / garaż", 20, it.floors>1?71:58);
}

function toggleInteriorVehicle(){
  if(!interior) return false;
  const fp=currentFloorPlan();
  if(!fp||!fp.parking||!interior.icar) return false;
  if(interior.drivingCar){
    interior.drivingCar=false;
    interior.player.x=interior.icar.x+22; interior.player.y=interior.icar.y;
    interior.icar.vx=interior.icar.vy=0;
  } else {
    const d=Math.hypot(interior.player.x-interior.icar.x, interior.player.y-interior.icar.y);
    if(d<42){ interior.drivingCar=true; }
    else return false;
  }
  return true;
}
