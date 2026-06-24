/* TOPDOWN CITY — 11-minimap.js */
/* ---------- minimap (pans with player) + biome banner ---------- */
const MINI = 196;
const mini = document.getElementById("mini");
const mctx = mini.getContext("2d");
const MS = MINI / 1700;                 // mini px per world unit (shows ~1700u around you)
function initMini(){
  mini.width=MINI*DPR; mini.height=MINI*DPR; mini.style.width=MINI+"px"; mini.style.height=MINI+"px";
}
function drawMini(){
  mctx.setTransform(DPR,0,0,DPR,0,0);
  mctx.clearRect(0,0,MINI,MINI);
  mctx.save();
  mctx.beginPath(); mctx.roundRect(0,0,MINI,MINI,14); mctx.clip();
  const cxw=cam.x, cyw=cam.y, w2=MINI/2, span=MINI/MS;
  const tx=wx=>w2+(wx-cxw)*MS, ty=wy=>w2+(wy-cyw)*MS;
  mctx.fillStyle=BIOMES.city.ground; mctx.fillRect(0,0,MINI,MINI);
  const i0=Math.floor((cxw-span/2-GAP)/GAP)-1, i1=Math.floor((cxw+span/2)/GAP)+1;
  const j0=Math.floor((cyw-span/2-GAP)/GAP)-1, j1=Math.floor((cyw+span/2)/GAP)+1;
  let hasW=false;
  // ground patches (biome colour) then road lines on top
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j);
    if(L.water) hasW=true;
    mctx.fillStyle = L.water?"#2c6c97" : (L.empty?L.B.ground:L.B.walk);
    const p=L.poly; mctx.beginPath(); mctx.moveTo(tx(p[0][0]),ty(p[0][1])); mctx.lineTo(tx(p[1][0]),ty(p[1][1])); mctx.lineTo(tx(p[2][0]),ty(p[2][1])); mctx.lineTo(tx(p[3][0]),ty(p[3][1])); mctx.closePath(); mctx.fill();
    for(const b of L.buildings){ mctx.fillStyle=b.color; mctx.fillRect(tx(b.x),ty(b.y),Math.max(1,b.w*MS),Math.max(1,b.h*MS)); }
  }
  // precise sub-cell coastline overlay (matches the main map's smooth water field)
  if(hasW){ for(let py=0;py<MINI;py+=2) for(let px=0;px<MINI;px+=2){ const wx=cxw+(px-w2)/MS, wy=cyw+(py-w2)/MS;
    if(!inWater(wx,wy)) continue;
    mctx.fillStyle=isRiverAt(wx,wy)?"#3a8a72":"#2c6c97"; mctx.fillRect(px,py,2,2); } }
  mctx.lineCap="round";
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const A=node(i,j);
    for(const[di,dj]of[[1,0],[0,1]]){ const e=getEdge(i,j,di,dj); if(!e.exists) continue; const B=node(i+di,j+dj);
      mctx.strokeStyle=e.col; mctx.lineWidth=Math.max(1.2,e.width*MS);
      mctx.beginPath(); mctx.moveTo(tx(A[0]),ty(A[1])); mctx.quadraticCurveTo(tx(e.cp[0]),ty(e.cp[1]),tx(B[0]),ty(B[1])); mctx.stroke();
    }
    if(isRoundabout(i,j)){
      const rt=roundaboutType(i,j), Rin=roundaboutIslandR(i,j)*MS;
      mctx.fillStyle="#5a5e66"; mctx.beginPath(); mctx.arc(tx(A[0]),ty(A[1]),roundaboutR(i,j)*MS,0,7); mctx.fill();
      mctx.fillStyle=rt==="fountain"?"#4e88ad":(roundaboutPassable(rt)?"#3f6b39":"#5a7a48");
      mctx.beginPath(); mctx.arc(tx(A[0]),ty(A[1]),Math.max(1.5,Rin),0,7); mctx.fill();
    }
  }
  // big landmark (mega) buildings on top of the road layer
  { const seen=new Set();
    for(let i=i0;i<=i1;i+=PLOT) for(let j=j0;j<=j1;j+=PLOT){ eachMegaNearCell(i,j,m=>{
      if(seen.has(m.id)) return; seen.add(m.id); const b=m.building;
      mctx.fillStyle = b.type==="tower" ? "#7d96aa" : "#b0a690";
      mctx.fillRect(tx(b.x),ty(b.y),Math.max(1.5,b.w*MS),Math.max(1.5,b.h*MS));
    }); }
  }
  mctx.fillStyle="#dadee5"; for(const c of traffic) mctx.fillRect(tx(c.x)-1,ty(c.y)-1,2.2,2.2);
  mctx.fillStyle="#4f8bff"; for(const c of cops) mctx.fillRect(tx(c.x)-1.4,ty(c.y)-1.4,2.8,2.8);
  mctx.fillStyle="#ff5555"; for(const h of helis) mctx.fillRect(tx(h.x)-1.6,ty(h.y)-1.6,3.2,3.2);
  mctx.fillStyle="#8a4"; for(const fc of footcops) if(fc.type==="swat"||fc.type==="soldier") mctx.fillRect(tx(fc.x)-1,ty(fc.y)-1,2,2);
  const _t = mission ? ((mission.type==="deliver"||mission.type==="taxi")?mission.target:null) : pickup;
  if(_t){ mctx.fillStyle = mission?"#ffd23b":"#39d98a"; mctx.beginPath(); mctx.arc(tx(_t.x),ty(_t.y),3.4,0,7); mctx.fill(); }
  if(salon){ mctx.fillStyle="#5ab0ff"; mctx.fillRect(tx(salon.cx)-2.4,ty(salon.cy)-2.4,4.8,4.8); }
  if(gunshop){ mctx.fillStyle="#ffcf6a"; mctx.fillRect(tx(gunshop.cx)-2.4,ty(gunshop.cy)-2.4,4.8,4.8); }
  const a = mode==="car"?car:ped;
  mctx.save(); mctx.translate(w2,w2); mctx.rotate(a.a);
  mctx.fillStyle="#ff5b46"; mctx.beginPath(); mctx.moveTo(6,0); mctx.lineTo(-4,-4); mctx.lineTo(-4,4); mctx.closePath(); mctx.fill();
  mctx.strokeStyle="rgba(0,0,0,.55)"; mctx.lineWidth=1; mctx.stroke(); mctx.restore();
  mctx.restore();
  mctx.strokeStyle="rgba(255,255,255,.16)"; mctx.lineWidth=2; mctx.beginPath(); mctx.roundRect(1,1,MINI-2,MINI-2,14); mctx.stroke();
}
let distTimer = 0;
function showDistrict(name){
  const el=document.getElementById("district");
  el.querySelector(".dn").textContent=name;
  el.style.opacity="1"; clearTimeout(distTimer);
  distTimer=setTimeout(()=>{ el.style.opacity="0"; }, 2600);
}
let curLoc="";
function checkBiome(){
  const a = mode==="car"?car:ped;
  const i=Math.floor((a.x-ROAD)/GAP), j=Math.floor((a.y-ROAD)/GAP);
  const b=biomeOf(i,j);
  if(b==="city"){ const c=nearestCity(i,j), loc="c"+c.id; if(loc!==curLoc){ curLoc=loc; showDistrict(c.name); } }
  else if(b==="forest"){ const ft=forestType(i,j), loc="f"+ft; if(loc!==curLoc){ curLoc=loc; showDistrict(FOREST_NAMES[ft]||BIOMES.forest.name); } }
  else if(b==="desert"){ const dt=desertType(i,j), loc="d"+dt; if(loc!==curLoc){ curLoc=loc; showDistrict(DESERT_NAMES[dt]||BIOMES.desert.name); } }
  else if(b!==curLoc){ curLoc=b; showDistrict(BIOMES[b].name); }
}
initMini();

