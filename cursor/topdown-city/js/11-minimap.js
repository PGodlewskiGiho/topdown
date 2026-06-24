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
  mini.title="Kliknij — mapa · P — pełna mapa";
  mini.addEventListener("click", ()=>{ if(typeof toggleBigMap==="function") toggleBigMap(true); });
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
  const opts={tx,ty,i0,i1,j0,j1,scale:MS,fog:false,cxw,cyw,w2};

  if(typeof mapDrawTerrain==="function") mapDrawTerrain(mctx,opts);
  else {
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
      const L=getLot(i,j);
      mctx.fillStyle=L.water?"#163d5c":(L.empty?L.B.ground:L.B.walk);
      const p=L.poly;
      mctx.beginPath(); mctx.moveTo(tx(p[0][0]),ty(p[0][1])); mctx.lineTo(tx(p[1][0]),ty(p[1][1]));
      mctx.lineTo(tx(p[2][0]),ty(p[2][1])); mctx.lineTo(tx(p[3][0]),ty(p[3][1])); mctx.closePath(); mctx.fill();
    }
  }

  if(typeof mapDrawRoads==="function") mapDrawRoads(mctx,opts);
  else {
    mctx.lineCap="round";
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
      const A=node(i,j);
      for(const[di,dj]of[[1,0],[0,1]]){
        const e=getEdge(i,j,di,dj); if(!e.exists) continue; const B=node(i+di,j+dj);
        mctx.strokeStyle="#aeb4c0"; mctx.lineWidth=Math.max(1.1,e.width*MS*0.85);
        mctx.beginPath(); mctx.moveTo(tx(A[0]),ty(A[1])); mctx.quadraticCurveTo(tx(e.cp[0]),ty(e.cp[1]),tx(B[0]),ty(B[1])); mctx.stroke();
      }
    }
  }

  if(typeof mapDrawRoute==="function") mapDrawRoute(mctx,tx,ty,2.8);
  if(typeof mapDrawBlips==="function") mapDrawBlips(mctx,tx,ty,false);
  else {
    const _t=mission?((mission.type==="deliver"||mission.type==="taxi")?mission.target:null):pickup;
    if(_t){ mctx.fillStyle=mission?"#ffd23b":"#39d98a"; mctx.beginPath(); mctx.arc(tx(_t.x),ty(_t.y),3.4,0,7); mctx.fill(); }
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
