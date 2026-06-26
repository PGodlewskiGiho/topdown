/* TOPDOWN CITY — 11-minimap.js */
/* ---------- GTA-style rotating minimap + biome banner ---------- */
const MINI = 196;
const mini = document.getElementById("mini");
const mctx = mini.getContext("2d");

function initMini(){
  mini.width=MINI*DPR; mini.height=MINI*DPR;
  mini.style.width=MINI+"px"; mini.style.height=MINI+"px";
  mini.style.pointerEvents="auto";
  mini.title="Kliknij — mapa (pauza) · P — mapa · Esc — menu";
  mini.addEventListener("click", ()=>{ if(typeof openPauseTab==="function") openPauseTab("map"); else if(typeof toggleBigMap==="function") toggleBigMap(true); });
}

let miniFrame=0;
function drawMini(){
  miniFrame++;
  const every=typeof perfMinimapEvery==="function"?perfMinimapEvery():1;
  if(every>1 && miniFrame%every!==0) return;
  mctx.setTransform(DPR,0,0,DPR,0,0);
  mctx.clearRect(0,0,MINI,MINI);
  if(typeof renderRotatingMap==="function"){
    renderRotatingMap(mctx, MINI, MINI, {
      cxw:cam.x, cyw:cam.y,
      span:typeof MINI_MAP_SPAN!=="undefined"?MINI_MAP_SPAN:1500,
      fog:false,
      routeWidth:2.8,
      clipRound:6,
      wantedSearch:true,
      showPlayer:true,
    });
    return;
  }
  mctx.save();
  mctx.beginPath(); mctx.roundRect(0,0,MINI,MINI,6); mctx.clip();
  mctx.fillStyle="#0a0c12";
  mctx.fillRect(0,0,MINI,MINI);
  mctx.restore();
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
