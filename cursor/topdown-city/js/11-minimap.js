/* TOPDOWN CITY — 11-minimap.js */
/* ---------- GTA-style rotating minimap + biome banner ---------- */
const MINI = 196;
const mini = document.getElementById("mini");
const mctx = mini.getContext("2d");
const MS = MINI / 1500;

function initMini(){
  mini.width=MINI*DPR; mini.height=MINI*DPR;
  mini.style.width=MINI+"px"; mini.style.height=MINI+"px";
  mini.style.pointerEvents="auto";
  mini.title="Kliknij — mapa (pauza) · P — mapa · Esc — menu";
  mini.addEventListener("click", ()=>{ if(typeof openPauseTab==="function") openPauseTab("map"); else if(typeof toggleBigMap==="function") toggleBigMap(true); });
}

function drawMini(){
  mctx.setTransform(DPR,0,0,DPR,0,0);
  mctx.clearRect(0,0,MINI,MINI);

  mctx.save();
  mctx.beginPath(); mctx.roundRect(0,0,MINI,MINI,6); mctx.clip();

  mctx.fillStyle="#0a0c12";
  mctx.fillRect(0,0,MINI,MINI);

  const cxw=cam.x, cyw=cam.y, w2=MINI/2, span=MINI/MS;
  const heading=playerHeading();
  const tx0=wx=>(wx-cxw)*MS, ty0=wy=>(wy-cyw)*MS;

  mctx.save();
  mctx.translate(w2,w2);
  mctx.rotate(-heading);
  const tx=wx=>tx0(wx), ty=wy=>ty0(wy);

  const i0=Math.floor((cxw-span/2-GAP)/GAP)-1, i1=Math.floor((cxw+span/2)/GAP)+1;
  const j0=Math.floor((cyw-span/2-GAP)/GAP)-1, j1=Math.floor((cyw+span/2)/GAP)+1;
  const opts={tx,ty,i0,i1,j0,j1,scale:MS,fog:false,cxw,cyw,w2,routeWidth:2.8,showPlayer:false};

  Game.drawMap(mctx, opts);

  if(typeof stars!=="undefined" && stars>0 && typeof wantedPhase!=="undefined" && wantedPhase==="search" && lkValid){
    const rad=(typeof searchRadius==="function"?searchRadius():220)*MS;
    const mx=tx0(lkX), my=ty0(lkY);
    mctx.strokeStyle="rgba(255,90,70,0.55)"; mctx.lineWidth=1.6; mctx.setLineDash([4,3]);
    mctx.beginPath(); mctx.arc(mx,my,rad,0,7); mctx.stroke();
    mctx.setLineDash([]);
    mctx.fillStyle="rgba(255,90,70,0.18)"; mctx.beginPath(); mctx.arc(mx,my,3.5,0,7); mctx.fill();
  }

  mctx.restore();

  mctx.save();
  mctx.translate(w2,w2);
  mctx.fillStyle="#f0f2f8";
  mctx.beginPath(); mctx.moveTo(0,-7); mctx.lineTo(5,6); mctx.lineTo(0,3); mctx.lineTo(-5,6); mctx.closePath(); mctx.fill();
  mctx.strokeStyle="rgba(0,0,0,.7)"; mctx.lineWidth=1.2; mctx.stroke();
  mctx.restore();

  mctx.fillStyle="rgba(255,255,255,.82)"; mctx.font="bold 9px monospace"; mctx.textAlign="center";
  mctx.fillText("N", w2, 11);

  mctx.restore();

  mctx.strokeStyle="rgba(255,255,255,.22)"; mctx.lineWidth=2;
  mctx.beginPath(); mctx.roundRect(1,1,MINI-2,MINI-2,6); mctx.stroke();
  mctx.strokeStyle="rgba(0,0,0,.45)"; mctx.lineWidth=1;
  mctx.beginPath(); mctx.roundRect(2.5,2.5,MINI-5,MINI-5,5); mctx.stroke();
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
