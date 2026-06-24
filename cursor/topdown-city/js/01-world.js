/* TOPDOWN CITY — 01-world.js */
/* ---------- world: infinite procedural city + biomes ---------- */
// Scale anchor: avg car ~80u long = ~3.6 m  ->  ~22 units/m, 1 lane ~3.5 m ~= 78u.
// Chunks are bigger now: wider multi-lane roads + larger blocks so real-size
// buildings (towers 20-50 m, bloki 10-200 m) fit inside a block, off the roads.
const ROAD = 200, BLOCK = 1050, GAP = BLOCK+ROAD;
const ROADCOL = "#33363c";
// Each car: type (silhouette) + era (classic boxy / modern) + a palette of
// colour variants. `colors` are the body-paint options; first is the default.
const CARS=[
  // ── BMW classics ─────────────────────────────────────────────────────
  {name:"E30",     brand:"BMW", price:6000,  power:1.10, topSpeed:200, type:"sedan", era:"classic",
   accent:"#1c3a8a", W:36, L:80,
   colors:["#d9d4c8","#2a4a8a","#b5483b","#e8d24a","#1d1d1d","#d6d6d6","#3f7d5a"]},
  {name:"E36",     brand:"BMW", price:8500,  power:1.20, topSpeed:215, type:"sedan", era:"classic",
   accent:"#1c3a8a", W:38, L:84,
   colors:["#2a3a5a","#15181c","#c9c9cf","#5a1f1f","#3f7d5a","#7a6a2a"]},
  {name:"E46 M3",  brand:"BMW", price:16000, power:1.42, topSpeed:250, type:"coupe", era:"classic",
   accent:"#e63312", W:39, L:86,
   colors:["#15181c","#8a9aa8","#2a4a8a","#5a1f1f","#cdd2d8","#1d6a3a"]},
  {name:"E39 M5",  brand:"BMW", price:22000, power:1.55, topSpeed:270, type:"sedan", era:"classic",
   accent:"#e63312", W:40, L:90,
   colors:["#2b2b30","#0e2a55","#7a1f1f","#c9c9cf","#1d1d1d","#3a5a3a"]},

  // ── BMW modern ───────────────────────────────────────────────────────
  {name:"320i",    brand:"BMW", price:12000, power:1.28, topSpeed:220, type:"sedan", era:"modern",
   accent:"#1c3a8a", W:39, L:86,
   colors:["#cfd4da","#15181c","#2a4a8a","#5a1f1f","#3a3f48","#d6d6d6"]},
  {name:"M3",      brand:"BMW", price:28000, power:1.62, topSpeed:290, type:"sedan", era:"modern",
   accent:"#e63312", W:41, L:88,
   colors:["#16181c","#7a8a3a","#2a4a8a","#c9c9cf","#8a1f1f","#6a3a8a"]},
  {name:"M5",      brand:"BMW", price:44000, power:1.80, topSpeed:305, type:"sedan", era:"modern",
   accent:"#e63312", W:42, L:94,
   colors:["#1a2a3a","#15181c","#7a1f1f","#c9c9cf","#3a3f48","#2a5a4a"]},
  {name:"X5 M",    brand:"BMW", price:55000, power:1.72, topSpeed:270, type:"suv", era:"modern",
   accent:"#e63312", W:52, L:92,
   colors:["#2b2b2b","#cdd2d8","#1a2a4a","#5a1f1f","#0e0e0e","#5a5f66"]},
  {name:"i8",      brand:"BMW", price:68000, power:1.90, topSpeed:325, type:"wedge", era:"modern",
   accent:"#00aaff", W:42, L:90,
   colors:["#cfe6ff","#1d1d1d","#d6d6d6","#3a5a7a","#9aa6b2"]},

  // ── Audi ─────────────────────────────────────────────────────────────
  {name:"A4",      brand:"Audi", price:14000, power:1.25, topSpeed:215, type:"sedan", era:"modern",
   accent:"#8a0000", W:40, L:88,
   colors:["#cfd4da","#15181c","#2a3a5a","#5a1f1f","#3a3f48","#7a8a96"]},
  {name:"S4",      brand:"Audi", price:26000, power:1.55, topSpeed:260, type:"sedan", era:"modern",
   accent:"#cc0000", W:41, L:88,
   colors:["#1a1a2e","#15181c","#8a9aa8","#5a1f1f","#2a5a4a","#c9c9cf"]},
  {name:"RS6",     brand:"Audi", price:48000, power:1.85, topSpeed:310, type:"estate", era:"modern",
   accent:"#cc0000", W:46, L:96,
   colors:["#5a0d0d","#15181c","#3a5f7a","#7a8a3a","#c9c9cf","#3a3f48"]},
  {name:"R8 V10",  brand:"Audi", price:72000, power:2.00, topSpeed:330, type:"supercar", era:"modern",
   accent:"#cc0000", W:48, L:88,
   colors:["#101010","#c9c9cf","#1a3a7a","#7a1f1f","#d8a93f","#2a6a4a"]},
  {name:"Q8 RS",   brand:"Audi", price:58000, power:1.78, topSpeed:280, type:"suvcoupe", era:"modern",
   accent:"#cc0000", W:52, L:96,
   colors:["#1a1a1a","#cdd2d8","#2a3a5a","#5a1f1f","#3a3f48","#5a5f66"]},
];
// default colour for each model = first in its palette
for(const m of CARS){ m.color = m.colors ? m.colors[0] : (m.color||"#c9c9cf"); }
// Traffic model pool: mix of BMW/Audi, weighted toward ordinary sedans.
// Each entry repeated by its weight; exotics (R8, i8) appear rarely.
const TRAFFIC_POOL=(()=>{
  const weight={ "E30":5,"E36":6,"E46 M3":3,"E39 M5":2,"320i":7,"M3":3,"M5":2,
                 "X5 M":2,"i8":1,"A4":7,"S4":3,"RS6":2,"R8 V10":1,"Q8 RS":2 };
  const pool=[];
  for(const m of CARS){ const w=weight[m.name]||2; for(let k=0;k<w;k++) pool.push(m); }
  return pool;
})();
function vehicleHitRadius(W,L,kind){
  if(kind==="moto") return Math.max(12, W*0.78, L*0.30);
  if(kind==="bike") return Math.max(10, W*0.72, L*0.28);
  return Math.max(18, W*0.58, L*0.30);   // cars: closer to body envelope than the old tiny circles
}
function pickTrafficModel(){ return TRAFFIC_POOL[(rng()*TRAFFIC_POOL.length)|0]; }
function parkedModelProps(r){   // deterministic (uses lot RNG)
  const m=TRAFFIC_POOL[(r()*TRAFFIC_POOL.length)|0];
  const col=(m.colors&&m.colors[(r()*m.colors.length)|0])||m.color;
  return {model:m, brand:m.brand, carName:m.name, type:m.type, era:m.era,
          accent:m.accent, W:m.W, L:m.L, color:col, cr:vehicleHitRadius(m.W,m.L,"car")};
}
function applyTrafficModel(c){
  const m=pickTrafficModel();
  c.model=m; c.brand=m.brand; c.carName=m.name; c.type=m.type; c.era=m.era;
  c.accent=m.accent; c.W=m.W; c.L=m.L; c.R=vehicleHitRadius(m.W,m.L,"car");
  c.color=(m.colors&&m.colors[(rng()*m.colors.length)|0])||m.color;
}
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  const r=Math.max(0,Math.min(255,(n>>16)+amt)), g=Math.max(0,Math.min(255,((n>>8)&255)+amt)), b=Math.max(0,Math.min(255,(n&255)+amt));
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function hsh(i,j,s){ let h=(Math.imul(i|0,374761393)^Math.imul(j|0,668265263)^Math.imul(s|0,2246822519))|0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }

/* ============ organic road network (single source of truth) ============
   Nodes sit on a jittered lattice; edges between orthogonal neighbours are
   quadratic-bezier road segments. Node jitter + bezier bend give varied
   angles & smooth turns. Road class sets width and how gently it curves
   (design speed -> larger radius). Traffic drives ALONG these curves. */
const NODE_VAR = 200;                                  // ± node offset per axis
function hwCorridorV(i){ return ((i%6)+6)%6===0; }   // vertical highway along this column
function hwCorridorH(j){ return ((j%6)+6)%6===0; }   // horizontal highway along this row
function isInterchange(i,j){ return hwCorridorV(i)&&hwCorridorH(j); }
function nX(i,j){ const d=hwCorridorV(i)?0.34:1; return (i*GAP + (hsh(i,j,53)*2-1)*NODE_VAR*d)|0; }
function nY(i,j){ const d=hwCorridorH(j)?0.34:1; return (j*GAP + (hsh(i,j,59)*2-1)*NODE_VAR*d)|0; }
const node=(i,j)=>[nX(i,j), nY(i,j)];
const EDIRS=[[1,0],[-1,0],[0,1],[0,-1]];               // planar: orthogonal only

// terrain fields (pure hashes -> no lot lookups -> no recursion)
function waterLevel(i,j){ return hsh(Math.floor(i/4),Math.floor(j/4),211)*0.55 + hsh(Math.floor(i/2),Math.floor(j/2),213)*0.30 + hsh(i,j,217)*0.15; }
function isWaterCell(i,j){ return biomeOf(i,j)==="sea" ? waterLevel(i,j)>0.42 : waterLevel(i,j)>0.86; }   // big connected lakes
function cellAt(x,y){ return [Math.floor(x/GAP), Math.floor(y/GAP)]; }
function smoothNoise(x,y){                                       // bilinear value noise (smoothstep)
  const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hsh(xi,yi,7), b=hsh(xi+1,yi,7), cc=hsh(xi,yi+1,7), d=hsh(xi+1,yi+1,7);
  return a+(b-a)*u+(cc-a)*v+(a-b-cc+d)*u*v;
}
const _csCache=new Map();
function cellSigned(i,j){ const k=i+","+j; let v=_csCache.get(k); if(v!==undefined) return v;   // >0 water, <0 land (threshold baked in)
  v=waterLevel(i,j) - (biomeOf(i,j)==="sea" ? 0.42 : 0.86); if(_csCache.size>9000) _csCache.clear(); _csCache.set(k,v); return v; }
function waterScore(x,y){                                        // smooth SIGNED field; zero-crossing = coast (sub-cell, not glued to edges)
  const fx=x/GAP-0.5, fy=y/GAP-0.5, xi=Math.floor(fx), yi=Math.floor(fy), xf=fx-xi, yf=fy-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);   // cell values centred on cell centres
  const a=cellSigned(xi,yi), b=cellSigned(xi+1,yi), cc=cellSigned(xi,yi+1), d=cellSigned(xi+1,yi+1);
  return a+(b-a)*u+(cc-a)*v+(a-b-cc+d)*u*v;   // pure bilinear: water only within 1 cell of a water cell -> render == physics, no stray fragments
}
function coastalLot(i,j){ for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){ if(isWaterCell(i+di,j+dj)) return true; } return false; }
function inWater(x,y){ return waterScore(x,y) > 0; }             // matches the rendered coastline -> correct shore detection
function elevation(i,j){ return hsh(Math.floor(i/3),Math.floor(j/3),101)*0.62 + hsh(i,j,103)*0.38; }
function isMountain(i,j){ return biomeOf(i,j)!=="sea" && elevation(i,j)>0.82; }
const ROADCLR={ hwy:"#3a3d44", art:"#34373d", st:"#33363c", rural:"#4a4438", dirt:"#5a4f3c" };
const edgeCache=new Map();
function getEdge(i,j,di,dj){
  if(di<0||(di===0&&dj<0)) return getEdge(i+di,j+dj,-di,-dj);   // canonical E or S
  const key=i+","+j+","+di+","+dj; let e=edgeCache.get(key); if(e) return e;
  const ii=i+di, jj=j+dj;
  const bA=biomeOf(i,j), bB=biomeOf(ii,jj), city=(bA==="city"&&bB==="city");
  const h1=hsh(i*7+di,j*5+dj,7), h2=hsh(i+dj,j+di,13), h3=hsh(i-dj,j-di,19);
  const isHwy = (di===1&&dj===0&&hwCorridorH(j)) || (di===0&&dj===1&&hwCorridorV(i));
  // terrain: roads avoid water bodies (cross only at rare bridges) and steep mountains (route around)
  const overWater = (di===1&&dj===0) ? (isWaterCell(i,j)||isWaterCell(i,j-1)) : (isWaterCell(i,j)||isWaterCell(i-1,j));
  const overMega = edgeTouchesMega(i,j,di,dj);
  const mtn = isMountain(i,j)||isMountain(ii,jj);
  let exists = isHwy ? true : (city ? h1>0.07 : h1>0.34);
  let bridge=false;
  if(overWater) exists=false;   // roads route around water (lakes are impassable to cars)
  if(overMega) exists=false;    // mega-structures occupy whole chunks: no roads through footprint
  if(mtn && !isHwy && h1<0.78) exists=false;                                  // sparse in mountains
  let klass;
  if(isHwy) klass="hwy";
  else if(city){ const cc=nearestCity(i,j); klass = cc.dist < cc.R*0.3 ? "art" : (h2<0.3?"art":"st"); }   // grand avenues downtown
  else klass = (bA==="forest"||bB==="forest") ? "rural" : (h2<0.5?"rural":"dirt");
  const WR={hwy:[230,290], art:[160,210], st:[120,156], rural:[70,104], dirt:[52,80]}[klass];
  const width=Math.round(WR[0]+h3*(WR[1]-WR[0]));
  const offFrac={hwy:0.015, art:0.022, st:0.04, rural:0.13, dirt:0.19}[klass];   // city near-straight; design-speed radius
  const x1=nX(i,j),y1=nY(i,j),x2=nX(ii,jj),y2=nY(ii,jj);
  const dx=x2-x1,dy=y2-y1, len=Math.hypot(dx,dy)||1;
  let off=(h2*2-1)*len*offFrac; const CAP=60; off=Math.max(-CAP,Math.min(CAP,off));   // cap bulge -> roads stay in corridor
  const cp=[(x1+x2)/2+(-dy/len)*off, (y1+y2)/2+(dx/len)*off];
  const markings=(klass==="hwy"||klass==="art"||klass==="st");
  e={exists,width,klass,cp,col: bridge?"#55585f":ROADCLR[klass], markings,len, bulge:Math.abs(off), bridge, hwy:isHwy};
  edgeCache.set(key,e); return e;
}
function neighbors(i,j){ const r=[]; for(const[di,dj]of EDIRS) if(getEdge(i,j,di,dj).exists) r.push([i+di,j+dj]); return r; }
function nodeDegree(i,j){ let d=0; for(const[di,dj]of EDIRS) if(getEdge(i,j,di,dj).exists) d++; return d; }
function nodeMaxWidth(i,j){ let m=0; for(const[di,dj]of EDIRS){ const e=getEdge(i,j,di,dj); if(e.exists)m=Math.max(m,e.width);} return m; }
function nodeIsCity(i,j){ if(biomeOf(i,j)==="city") return true; for(const[di,dj]of EDIRS){ const e=getEdge(i,j,di,dj); if(e.exists&&(e.klass==="art"||e.klass==="st")) return true; } return false; }

// roundabouts at occasional busy city intersections (spaced out)
function isRoundabout(i,j){
  if(isInterchange(i,j)&&nodeDegree(i,j)>=3) return true;          // highway crossings = roundabout interchange
  if(biomeOf(i,j)!=="city"||nodeDegree(i,j)<3||hsh(i,j,91)>0.17) return false;
  for(const[di,dj]of EDIRS){ const ni=i+di,nj=j+dj;
    if(biomeOf(ni,nj)==="city"&&nodeDegree(ni,nj)>=3&&hsh(ni,nj,91)<=0.17&&(ni<i||(ni===i&&nj<j))) return false; }
  return true;
}
function roundaboutCenter(i,j){
  if(!isRoundabout(i,j)) return "none";
  if(isInterchange(i,j)) return "grass";
  return hsh(i,j,92)<0.36 ? "fountain" : "grass";   // city mini-fountains are decorative/passable
}
function roundaboutR(i,j){ return isInterchange(i,j) ? nodeMaxWidth(i,j)*1.25+44 : nodeMaxWidth(i,j)*0.95+18; }
function roundaboutType(i,j){
  if(!isRoundabout(i,j)) return "none";
  if(isInterchange(i,j)){
    const t=hsh(i,j,92);
    if(t<0.34) return "cobble";
    if(t<0.67) return "meadow";
    return "grass";
  }
  const t=hsh(i,j,92);
  if(t<0.13) return "fountain";
  if(t<0.22) return "statue";
  if(t<0.30) return "planter";
  if(t<0.38) return "tree";
  if(t<0.52) return "flower";
  if(t<0.68) return "meadow";
  return "grass";
}
function roundaboutCenter(i,j){ return roundaboutType(i,j); }
function roundaboutPassable(t){ return t==="grass"||t==="meadow"||t==="flower"||t==="cobble"; }
function roundaboutIslandR(i,j){
  const mw=nodeMaxWidth(i,j), R=roundaboutR(i,j), rw=Math.max(22,mw*0.68);
  return Math.max(6,R-rw*0.48);
}
function roundaboutObstacleR(i,j){
  const t=roundaboutType(i,j);
  if(roundaboutPassable(t)) return 0;
  const Rin=roundaboutIslandR(i,j);
  if(t==="fountain") return Rin*0.62;
  if(t==="statue") return Rin*0.24;
  if(t==="planter") return Rin*0.50;
  if(t==="tree") return Rin*0.22;
  return Rin*0.45;
}
function rbFillGrass(ax,ay,Rin){
  ctx.fillStyle="#3a6534"; ctx.beginPath(); ctx.arc(ax,ay,Rin,0,7); ctx.fill();
  const gt=getTex("grass"); if(gt){ ctx.fillStyle=gt; ctx.beginPath(); ctx.arc(ax,ay,Rin,0,7); ctx.fill(); }
  ctx.fillStyle="rgba(90,150,70,.12)"; ctx.beginPath(); ctx.arc(ax-Rin*0.12,ay-Rin*0.1,Rin*0.72,0,7); ctx.fill();
}
function drawRoundaboutIsland(ax,ay,Rin,i,j,rbType){
  const seed=hsh(i,j,93);
  if(rbType==="grass"||rbType==="meadow"){
    rbFillGrass(ax,ay,Rin);
    const n=rbType==="meadow"?10:6;
    for(let k=0;k<n;k++){
      const ang=seed*6.283+k*2.09, rad=Rin*(0.15+(hsh(i,j,940+k)*0.55));
      const fx=ax+Math.cos(ang)*rad, fy=ay+Math.sin(ang)*rad*0.88, sz=1.2+hsh(i,j,950+k)*2.2;
      ctx.fillStyle=rbType==="meadow"?(k%3?"#c8d858":"#e8b848"):"#8ec868";
      ctx.beginPath(); ctx.arc(fx,fy,sz,0,7); ctx.fill();
    }
    if(rbType==="meadow") for(let k=0;k<5;k++){ const ang=k*1.256+seed, rad=Rin*0.35;
      ctx.fillStyle="#2a5028"; ctx.beginPath(); ctx.arc(ax+Math.cos(ang)*rad,ay+Math.sin(ang)*rad*0.9,2.5,0,7); ctx.fill(); }
    return;
  }
  if(rbType==="flower"){
    rbFillGrass(ax,ay,Rin);
    const petals=8+(seed*5|0);
    for(let k=0;k<petals;k++){
      const ang=(k/petals)*6.283+seed*0.4, rad=Rin*(0.28+(k%3)*0.12);
      ctx.fillStyle=["#e85a72","#f0b830","#c96ad8","#5ab0e8","#ff9060"][k%5];
      ctx.beginPath(); ctx.ellipse(ax+Math.cos(ang)*rad,ay+Math.sin(ang)*rad*0.88, Rin*0.11, Rin*0.07, ang, 0, 7); ctx.fill();
    }
    ctx.fillStyle="#ffd858"; ctx.beginPath(); ctx.arc(ax,ay,Math.max(3,Rin*0.12),0,7); ctx.fill();
    return;
  }
  if(rbType==="cobble"){
    const wedges=12;
    for(let k=0;k<wedges;k++){
      const a0=(k/wedges)*6.283, a1=((k+1)/wedges)*6.283;
      ctx.fillStyle=k%2?"#8a8680":"#6e6a64";
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.arc(ax,ay,Rin,a0,a1); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle="rgba(255,255,255,.08)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(ax,ay,Rin*0.92,0,7); ctx.stroke();
    return;
  }
  if(rbType==="fountain"){
    ctx.fillStyle="#8a9098"; ctx.beginPath(); ctx.arc(ax,ay,Rin,0,7); ctx.fill();
    ctx.fillStyle="#727880"; ctx.beginPath(); ctx.arc(ax,ay,Rin*0.88,0,7); ctx.fill();
    const g=ctx.createRadialGradient(ax,ay,0,ax,ay,Rin*0.72);
    g.addColorStop(0,"#6ab8d8"); g.addColorStop(0.55,"#3a7a9a"); g.addColorStop(1,"#2a5870");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ax,ay,Rin*0.72,0,7); ctx.fill();
    ctx.fillStyle="#9aa4ae"; ctx.beginPath(); ctx.arc(ax,ay,Rin*0.22,0,7); ctx.fill();
    ctx.fillStyle="#b8c0c8"; ctx.fillRect(ax-3,ay-Rin*0.38,6,Rin*0.28);
    const t=performance.now()*0.004;
    for(let k=0;k<5;k++){
      const ang=t+k*1.256, sp=Rin*(0.08+k*0.04);
      ctx.fillStyle=`rgba(220,240,255,${0.35+0.25*Math.sin(t+k)})`;
      ctx.beginPath(); ctx.arc(ax+Math.cos(ang)*sp,ay+Math.sin(ang)*sp-2, 1.8+k*0.3,0,7); ctx.fill();
    }
    ctx.fillStyle="rgba(200,230,255,.45)"; ctx.beginPath(); ctx.arc(ax,ay-Rin*0.05,Math.max(2,Rin*0.08),0,7); ctx.fill();
    return;
  }
  if(rbType==="statue"){
    rbFillGrass(ax,ay,Rin);
    ctx.fillStyle="#7a8088"; ctx.fillRect(ax-Rin*0.14,ay-Rin*0.06, Rin*0.28, Rin*0.14);
    ctx.fillStyle="#9aa0a8"; ctx.fillRect(ax-Rin*0.10,ay-Rin*0.22, Rin*0.20, Rin*0.18);
    ctx.fillStyle="#c8b878"; ctx.beginPath(); ctx.moveTo(ax,ay-Rin*0.38); ctx.lineTo(ax-Rin*0.06,ay-Rin*0.22); ctx.lineTo(ax+Rin*0.06,ay-Rin*0.22); ctx.closePath(); ctx.fill();
    return;
  }
  if(rbType==="planter"){
    ctx.fillStyle="#8a5a44"; ctx.beginPath(); ctx.arc(ax,ay,Rin,0,7); ctx.fill();
    ctx.fillStyle="#6a4030"; ctx.beginPath(); ctx.arc(ax,ay,Rin*0.92,0,7); ctx.fill();
    ctx.fillStyle="#2a5020"; ctx.beginPath(); ctx.arc(ax,ay,Rin*0.62,0,7); ctx.fill();
    ctx.fillStyle="#3a6830"; ctx.beginPath(); ctx.arc(ax,ay,Rin*0.55,0,7); ctx.fill();
    for(let k=0;k<6;k++){ const ang=k*1.047+seed, rad=Rin*0.38;
      ctx.fillStyle="#4a7838"; ctx.beginPath(); ctx.arc(ax+Math.cos(ang)*rad,ay+Math.sin(ang)*rad*0.85, Rin*0.09,0,7); ctx.fill(); }
    return;
  }
  if(rbType==="tree"){
    rbFillGrass(ax,ay,Rin);
    const r=lotRng(i,j), s=Math.min(Rin*0.52, 26);
    drawTreeCanopy(ax, ay-Rin*0.06, makeTree(ax, ay-Rin*0.06, Math.min(Rin*0.9,40), r, "oak", {city:true}), false);
  }
}
function drawRoundabout(i,j,A,mw){
  const R=roundaboutR(i,j), rw=Math.max(22,mw*0.68), Rout=R+rw*0.52, Rin=roundaboutIslandR(i,j);
  const rbType=roundaboutType(i,j);
  const asphalt=nodeIsCity(i,j)?"#33363c":"#4a4438";
  ctx.fillStyle="#8a9099"; ctx.beginPath(); ctx.arc(A[0],A[1],Rout+6,0,7); ctx.fill();
  ctx.fillStyle=asphalt;
  ctx.beginPath(); ctx.arc(A[0],A[1],Rout,0,7); ctx.arc(A[0],A[1],Rin,0,7,true); ctx.fill("evenodd");
  { const at=getTex("asphalt"); if(at){ ctx.fillStyle=at; ctx.beginPath(); ctx.arc(A[0],A[1],Rout,0,7); ctx.arc(A[0],A[1],Rin,0,7,true); ctx.fill("evenodd"); } }
  ctx.strokeStyle="#a0a6ae"; ctx.lineWidth=3.5;
  ctx.beginPath(); ctx.arc(A[0],A[1],Rout-1,0,7); ctx.stroke();
  ctx.strokeStyle="#969ca4"; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.arc(A[0],A[1],Rin+1,0,7); ctx.stroke();
  const Rmid=(Rin+Rout)*0.5;
  ctx.strokeStyle="rgba(225,228,233,.48)"; ctx.lineWidth=1.6; ctx.setLineDash([12,14]);
  ctx.beginPath(); ctx.arc(A[0],A[1],Rmid,0,7); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle="rgba(216,197,74,.58)"; ctx.lineWidth=2.5; ctx.setLineDash([9,11]);
  ctx.beginPath(); ctx.arc(A[0],A[1],R,0,7); ctx.stroke(); ctx.setLineDash([]);
  drawRoundaboutIsland(A[0],A[1],Rin,i,j,rbType);
}

// quadratic bezier (cp is symmetric, so swapping endpoints walks the curve backward)
function bez(p0,cp,p1,t){ const u=1-t; return [u*u*p0[0]+2*u*t*cp[0]+t*t*p1[0], u*u*p0[1]+2*u*t*cp[1]+t*t*p1[1]]; }
function bezTan(p0,cp,p1,t){ const u=1-t; return [2*u*(cp[0]-p0[0])+2*t*(p1[0]-cp[0]), 2*u*(cp[1]-p0[1])+2*t*(p1[1]-cp[1])]; }
function edgeGeom(ai,aj,bi,bj){ const e=getEdge(ai,aj,bi-ai,bj-aj); return {e, p0:node(ai,aj), p1:node(bi,bj), cp:e.cp}; }

function strokeEdge(i,j,di,dj,w,style,dash){
  const e=getEdge(i,j,di,dj); if(!e.exists) return;
  const A=node(i,j), B=node(i+di,j+dj);
  if(dash) ctx.setLineDash(dash);
  ctx.strokeStyle=style||e.col; ctx.lineWidth=w||e.width;
  ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.quadraticCurveTo(e.cp[0],e.cp[1],B[0],B[1]); ctx.stroke();
  if(dash) ctx.setLineDash([]);
}
// stroke a road's centreline shifted sideways by `off` units (for lane dividers)
function strokeEdgeOffset(i,j,di,dj,off,w,style,dash){
  const e=getEdge(i,j,di,dj); if(!e.exists) return;
  const A=node(i,j), B=node(i+di,j+dj), C=e.cp;
  const dx=B[0]-A[0], dy=B[1]-A[1], len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
  if(dash) ctx.setLineDash(dash);
  ctx.strokeStyle=style; ctx.lineWidth=w;
  ctx.beginPath();
  ctx.moveTo(A[0]+nx*off, A[1]+ny*off);
  ctx.quadraticCurveTo(C[0]+nx*off, C[1]+ny*off, B[0]+nx*off, B[1]+ny*off);
  ctx.stroke();
  if(dash) ctx.setLineDash([]);
}
function drawRoads(ox,oy){
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  ctx.lineCap="round"; ctx.lineJoin="round";
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){                                                // curbs (raised edge)
    for(const[di,dj]of[[1,0],[0,1]]){ const e=getEdge(i,j,di,dj); if(!e.exists||e.bridge||e.klass==="dirt"||e.klass==="rural") continue;
      strokeEdge(i,j,di,dj, e.width+7, "#878d96"); } }
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ strokeEdge(i,j,1,0); strokeEdge(i,j,0,1); }   // surfaces
  const _at=getTex("asphalt"), _dt=getTex("dirt");
  if(_at||_dt){ for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ for(const[di,dj]of[[1,0],[0,1]]){ const e=getEdge(i,j,di,dj); if(!e.exists||e.bridge) continue;
    const tp=(e.klass==="dirt"||e.klass==="rural")?_dt:_at; if(tp) strokeEdge(i,j,di,dj,e.width,tp); } } }   // road texture
  // intersections (roundabouts get a ring + island)
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const mw=nodeMaxWidth(i,j); if(!mw) continue; const A=node(i,j);
    if(isRoundabout(i,j)){
      drawRoundabout(i,j,A,mw);
    } else {
      ctx.fillStyle=nodeIsCity(i,j)?"#33363c":"#4a4438";
      ctx.beginPath(); ctx.arc(A[0],A[1],mw*0.52,0,7); ctx.fill();
      { const at=getTex("asphalt"); if(at){ ctx.fillStyle=at; ctx.beginPath(); ctx.arc(A[0],A[1],mw*0.52,0,7); ctx.fill(); } }
    }
  }
  // centre-line markings (yellow) + white dashed lane dividers (one per lane, ~3.5 m)
  const LANE_W=78;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    for(const[di,dj]of[[1,0],[0,1]]){ const e=getEdge(i,j,di,dj); if(!e.exists||!e.markings||e.bridge) continue;
      // white lane dividers between the centre line and each curb
      const halfLanes=Math.max(1,Math.round((e.width*0.5-6)/LANE_W));
      for(let k=1;k<=halfLanes;k++){ const off=k*LANE_W;
        if(off>e.width*0.5-8) break;
        strokeEdgeOffset(i,j,di,dj, off,1.4,"rgba(225,228,233,.55)",[20,24]);
        strokeEdgeOffset(i,j,di,dj,-off,1.4,"rgba(225,228,233,.55)",[20,24]);
      }
      if(e.hwy) strokeEdge(i,j,di,dj,4,"rgba(222,206,96,.9)");
      else strokeEdge(i,j,di,dj,3,"rgba(216,197,74,.75)",[18,28]);
    }
  }
}
function lotRng(i,j){ let s=(Math.imul(i|0,374761393)^Math.imul(j|0,668265263))>>>0; return mulberry32(s||1); }
const BIOMES={
  city:   {name:"MIASTO",   ground:"#43663b", walk:"#6c727b", build:["#8a5a44","#5f6f8a","#7a7d83","#6f8a5f","#8a7d4e","#705a7a"], density:0.84, prop:"tree"},
  desert: {name:"PUSTYNIA", ground:"#caa86a", walk:"#cbb079", build:["#b08a5a","#9a7448","#c4a06a","#8a6a40"],                  density:0.42, prop:"cactus"},
  forest: {name:"LAS",      ground:"#2f5a32", walk:"#4a6b46", build:["#6a5a44","#5a6a4a","#7a6a50","#695a3e"],                  density:0.40, prop:"tree"},
  sea:    {name:"WYBRZEŻE", ground:"#caa86a", walk:"#c8b88a", build:["#7a8a96","#6a7a86","#8a9aa6"],                             density:0.34, prop:"palm"},
};
const FOREST_NAMES={pine:"BÓR SOSNOWY",spruce:"BÓR ŚWIERKOWY",deciduous:"LAS LIŚCIASTY",maple:"Klonowy gaj",birch:"GĄSZCZ BRZOZOWY",willow:"Wierzbowy brzeg",oak:"DĄBROWA"};
const FOREST_GROUND={pine:"#284a2a",spruce:"#243e28",deciduous:"#2f5a32",maple:"#325630",birch:"#345a30",willow:"#2e5230",oak:"#2a4e28"};
function forestType(i,j){
  const t=hsh(Math.floor(i/4),Math.floor(j/4),331);
  if(t<0.18) return "pine";
  if(t<0.32) return "spruce";
  if(t<0.46) return "deciduous";
  if(t<0.58) return "maple";
  if(t<0.70) return "birch";
  if(t<0.82) return "willow";
  return "oak";
}
function pickForestKind(i,j,r){
  const dom=forestType(i,j);
  if(r()<0.68) return dom;
  const alt=["pine","spruce","deciduous","maple","birch","willow","oak"].filter(k=>k!==dom);
  return alt[(r()*alt.length)|0];
}
const CITY_SPACING=48;                                 // cells between city centres
const CITY_NAMES=["Vesper City","Port Royal","Santa Mira","Kessler","Verano","Stalcrest","Ironhaven","Loma Vista","Redhill","Carrow Bay","New Dawn","Marlow","Ashford","Granite Falls","Solano","Westmoor","Eastgate","Brightwater","Kingsmouth","Dunmore","Cordova","Halcyon","Riverton","Northvale","Crestwood","Bayshore","Fairhaven","Silvercreek"];
function cityCenter(sci,scj){
  if(sci===0&&scj===0) return {cx:1, cy:1, R:13, id:0, name:CITY_NAMES[0]};   // spawn city near origin
  const hx=hsh(sci,scj,401), hy=hsh(sci,scj,402), hr=hsh(sci,scj,403), hn=hsh(sci,scj,404);
  return { cx: sci*CITY_SPACING+(hx-0.5)*CITY_SPACING*0.34, cy: scj*CITY_SPACING+(hy-0.5)*CITY_SPACING*0.34,
           R: 8+hr*6, id: sci*10007+scj, name: CITY_NAMES[(hn*CITY_NAMES.length)|0] };
}
const ncCache=new Map();
function nearestCity(i,j){
  const key=i+","+j; let r=ncCache.get(key); if(r) return r;
  const sci=Math.round(i/CITY_SPACING), scj=Math.round(j/CITY_SPACING);
  let best=null, bd=1e9;
  for(let a=sci-1;a<=sci+1;a++) for(let b=scj-1;b<=scj+1;b++){ const ct=cityCenter(a,b); const d=Math.hypot(i-ct.cx,j-ct.cy); if(d<bd){ bd=d; best=ct; } }
  r={cx:best.cx, cy:best.cy, R:best.R, id:best.id, name:best.name, dist:bd};
  ncCache.set(key,r); return r;
}
function biomeOf(i,j){
  const c=nearestCity(i,j), n=hsh(i,j,77);
  if(c.dist + (n-0.5)*2.2 < c.R) return "city";        // inside the nearest city's disk
  const B=5, ci=Math.floor(i/B), cj=Math.floor(j/B), r=hsh(ci,cj,177);   // countryside between cities
  return r<0.5?"forest": r<0.8?"desert":"sea";
}
// Road junction at grid cell (i,j) — used by start menu / spawn picker.
function roadJunctionAtCell(i,j){
  return {x:nX(i,j)+ROAD/2, y:nY(i,j)+ROAD/2, i, j, biome:biomeOf(i,j)};
}
const CITY_SPAWN_PRESETS=[
  {i:0, j:0, label:"Vesper City — skrzyżowanie startowe"},
  {i:1, j:2, label:"Salon samochodowy"},
  {i:2, j:1, label:"Sklep z bronią"},
  {i:8, j:6, label:"Peryferie Vesper City"},
  {i:2, j:2, label:"Dealer motocykli"},
];
function findBiomeSpawn(biome, variant=0){
  if(biome==="city"){
    const p=CITY_SPAWN_PRESETS[((variant%CITY_SPAWN_PRESETS.length)+CITY_SPAWN_PRESETS.length)%CITY_SPAWN_PRESETS.length];
    const pt=roadJunctionAtCell(p.i, p.j);
    return Object.assign(pt, {label:p.label, biome:"city"});
  }
  const found=[];
  for(let ring=4; ring<100; ring++){
    for(let i=-ring;i<=ring;i++) for(let j=-ring;j<=ring;j++){
      if(Math.max(Math.abs(i),Math.abs(j))!==ring) continue;
      if(biomeOf(i,j)!==biome) continue;
      if(isMountain(i,j)) continue;
      const pt=roadJunctionAtCell(i,j);
      if(inWater(pt.x, pt.y)) continue;
      let score=0;
      if(biome==="sea"){
        for(const d of [[90,0],[-90,0],[0,90],[0,-90]]) if(inWater(pt.x+d[0], pt.y+d[1])) score+=1;
      }
      found.push(Object.assign({score, ring}, pt));
    }
    if(found.length>=4) break;
  }
  if(!found.length){
    const fb=roadJunctionAtCell(0,0);
    return Object.assign(fb, {label:"Domyślny start", biome:biomeOf(0,0)});
  }
  found.sort((a,b)=>(b.score-a.score)||(a.ring-b.ring));
  const pick=found[(variant*7+3)%found.length];
  const names={forest:"Las", desert:"Pustynia", sea:"Wybrzeże"};
  return Object.assign({}, pick, {label:(names[biome]||biome)+" · trasa "+(variant+1), biome});
}
function getSpawnPoint(biome, variant){
  const sp=findBiomeSpawn(biome, variant|0);
  const nc=nearestCity(sp.i, sp.j);
  let district=BIOMES[sp.biome]?.name||sp.biome;
  if(sp.biome==="city") district=nc.name;
  else if(sp.biome==="forest") district=FOREST_NAMES[forestType(sp.i, sp.j)]||district;
  return Object.assign({}, sp, {district, cityName:nc.name});
}
const lotCache=new Map();
let pruneT=0;
function pruneCaches(){
  const fi=Math.round(focusX/GAP), fj=Math.round(focusY/GAP), R=11;
  for(const [key,lot] of lotCache){ if(Math.abs(lot.i-fi)>R||Math.abs(lot.j-fj)>R) lotCache.delete(key); }
  if(edgeCache.size>4000) edgeCache.clear();
  if(ncCache.size>4000) ncCache.clear();
}
let salon=null;
let gunshop=null;
function buildSalonLot(lot){
  salon={x:lot.x,y:lot.y,cx:lot.x+lot.w/2,cy:lot.y+lot.h/2,pads:[]};
  // 14 cars across 3 rows: BMW classics, BMW modern, Audi
  const bmwC=CARS.filter(m=>m.brand==="BMW"&&m.era==="classic");
  const bmwM=CARS.filter(m=>m.brand==="BMW"&&m.era==="modern");
  const audi=CARS.filter(m=>m.brand==="Audi");
  const rows=[bmwC,bmwM,audi];
  const rowH=lot.h/rows.length;
  for(let ri=0;ri<rows.length;ri++){
    const row=rows[ri];
    const yRow=lot.y+rowH*(ri+0.5);
    for(let m=0;m<row.length;m++){
      salon.pads.push({x:lot.x+lot.w*(m+0.5)/row.length, y:yRow, model:row[m], colorIdx:0});
    }
  }
}
function buildGunShop(lot){ gunshop={x:lot.x,y:lot.y,w:lot.w,h:lot.h,cx:lot.x+lot.w/2,cy:lot.y+lot.h/2}; }
let motodealer=null;
function buildMotoDealer(lot){
  motodealer={x:lot.x,y:lot.y,w:lot.w,h:lot.h,cx:lot.x+lot.w/2,cy:lot.y+lot.h/2};
  const n=Math.max(3,Math.min(6,(lot.w/95)|0));
  for(let m=0;m<n;m++) lot.parked.push({x:lot.x+lot.w*(m+0.5)/n, y:lot.y+lot.h*0.55, a:-Math.PI/2,
    kind:"moto", W:16, L:42, color:pick(CARCOL), cr:12, hp:55, maxHp:55, dmgSeed:(hsh(lot.i,lot.j,700+m)*1e9)|0, dead:false, rider:false, dealer:true });
}
const HOUSE_WALL=["#d9cdb8","#cbb89a","#c8d0d6","#d6c2b0","#bcc9b4","#e0d3c0","#c9b9c2"];
const HOUSE_ROOF=["#9c4a3a","#7a4030","#5e6670","#8a5a3a","#4f5b66","#6a4a3a"];
const BLOK_WALL=["#b9b2a6","#ad9078","#9aa0a8","#c2b9ad","#9c8f86","#b0a690"];
const TOWER_WALL=["#5d7e9a","#6f8ea8","#52718c","#7d96aa","#586d88","#6a8296"];
const SHOP_WALL=["#cdbb96","#c2a87e","#b6bec4","#d0c4a8","#c8b0a0"];
const SIGN_COL=["#c43a3a","#e0a32e","#2f7ec4","#3f9a52","#a23fa2","#e06a2e"];
function cityZone(i,j){
  const c=nearestCity(i,j), n=hsh(i,j,303), f=(c.dist+(n-0.5)*1.6)/c.R;   // fraction of this city's radius
  if(f<0.40) return "downtown";                                // larger skyscraper core
  if(f<0.78) return n<0.30?"downtown":"midrise";               // wide dense urban belt
  if(f<0.95) return n<0.7 ?"midrise":"suburb";                 // suburban ring pushed farther out
  return "suburb";                                             // outer suburbs (houses)
}
// ===== real-size landmark buildings (towers + bloki), densely packed =====
// Scale: avg car ~80u = ~3.6 m  ->  ~22 units/m. 1 big chunk (GAP) ~= 49 m.
//   Tower : fills one chunk, ~20-45 m, roughly square, many floors.
//   Blok  : long slab spanning a pair of chunks (~50-95 m long, narrow).
// Every downtown/midrise cell carries a building, inset just past the kerb so
// roads, intersections and roundabouts between cells stay clear.
const U_PER_M=22.37;                            // units per metre (from car length)
const PLOT=1;                                   // (kept for callers) one chunk granularity
const plotCache=new Map();
const megaCellCache=new Map();
// is this exact cell eligible to carry a landmark?
function landmarkCell(i,j){
  if(i===1&&j===1) return false; if(i===1&&j===2) return false;          // spawn + salon
  if(i===2&&j===1) return false; if(i===2&&j===2) return false;          // gun shop + moto dealer
  if(biomeOf(i,j)!=="city") return false;
  const z=cityZone(i,j);
  return z==="downtown"||z==="midrise";
}
// deterministic pairing for long bloki: each cell decides if it is the ANCHOR of
// a 1x2 / 2x1 slab, the SECOND half of a neighbour's slab, or a standalone tower.
// All decisions derive ONLY from cellRole2 (symmetric) so anchor/part never disagree.
function cellRole(i,j){
  const me=cellRole2(i,j);
  if(me==="none") return {role:"none"};
  if(me==="tower") return {role:"tower"};
  if(me==="blokH"){
    const even=(((i%2)+2)%2===0);
    const partner = even ? [i+1,j] : [i-1,j];
    const paired = cellRole2(partner[0],partner[1])==="blokH";
    if(paired) return even ? {role:"blokH"} : {role:"part"};
    return {role:"blok1"};                 // partner not compatible -> standalone slab
  }
  // blokV
  const even=(((j%2)+2)%2===0);
  const partner = even ? [i,j+1] : [i,j-1];
  const paired = cellRole2(partner[0],partner[1])==="blokV";
  if(paired) return even ? {role:"blokV"} : {role:"part"};
  return {role:"blok1"};
}
// lightweight orientation probe used during pairing (avoids infinite recursion)
function cellRole2(i,j){
  if(!landmarkCell(i,j)) return "none";
  const z=cityZone(i,j), t=hsh(i,j,904);
  const wantBlok = z==="downtown" ? t<0.34 : t<0.62;
  if(!wantBlok) return "tower";
  return hsh(i,j,955)<0.5 ? "blokH" : "blokV";
}
// build the landmark rectangle whose ANCHOR cell is (i,j); returns null if (i,j)
// is empty or is only the second half of a neighbouring slab.
function plotBuilding(i,j){
  const key=i+","+j;
  if(plotCache.has(key)) return plotCache.get(key);
  const role=cellRole(i,j).role;
  if(role==="none"||role==="part"){ plotCache.set(key,null); return null; }
  // cells the building covers
  let i0=i,j0=j,i1=i,j1=j;
  if(role==="blokH"){ i1=i+1; } else if(role==="blokV"){ j1=j+1; }
  // inner buildable rect, inset just past the kerb so roads/roundabouts stay clear.
  // NOTE: must NOT call getEdge / isRoundabout here (they reach getEdge ->
  // edgeTouchesMega -> plotBuilding and would recurse). Everything below uses only
  // pure hash functions (nX/nY/nearestCity/hsh).
  const SIDEWALK_MIN = 26;                       // narrowest downtown sidewalk (kerb -> wall)
  // A city edge's class (art vs st) depends on a per-edge hash we cannot resolve here
  // without calling getEdge (which would recurse). getEdge widths: art 160-210, st 120-156,
  // hwy 230-290. Reserve for the widest road that could run along each specific edge.
  const CITY_HALF_MAX = 210 * 0.5 + 4;          // widest city road (art) half + small margin
  const HWY_HALF_MAX  = 290 * 0.5 + 4;          // widest highway half + small margin
  // The edge from node (ci,cj) in direction (di,dj) is a highway iff it lies on a
  // highway corridor (mirrors getEdge's isHwy test, which is pure).
  const edgeHalfW = (ci,cj,di,dj) => {
    const isHwy = (di===1&&dj===0&&hwCorridorH(cj)) || (di===0&&dj===1&&hwCorridorV(ci));
    return isHwy ? HWY_HALF_MAX : CITY_HALF_MAX;
  };
  // recursion-safe EXACT inward reach of a road's bezier centerline along the edge from
  // node (ci,cj) in direction (di,dj), but only sampled within a world-space span
  // [s0,s1] along the edge's running axis. This avoids over-reserving where the road
  // swings away outside the building's actual extent. Reconstructs getEdge's control
  // point from pure hashes (no getEdge call).
  const edgeReachSpan = (ci,cj,di,dj,axis,sign,spanLo,spanHi) => {
    const isHwy = (di===1&&dj===0&&hwCorridorH(cj)) || (di===0&&dj===1&&hwCorridorV(ci));
    const offFrac = isHwy ? 0.015 : 0.04;
    const x1=nX(ci,cj), y1=nY(ci,cj), x2=nX(ci+di,cj+dj), y2=nY(ci+di,cj+dj);
    const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1;
    const h2=hsh(ci+dj,cj+di,13);
    let off=(h2*2-1)*len*offFrac; const CAP=60; off=Math.max(-CAP,Math.min(CAP,off));
    const cpx=(x1+x2)/2+(-dy/len)*off, cpy=(y1+y2)/2+(dx/len)*off;
    // running axis is perpendicular to the tracked axis: for vertical edges (dir 0,1)
    // we track x and run along y; for horizontal edges (dir 1,0) we track y, run along x.
    let best = sign>0 ? -Infinity : Infinity, any=false;
    for(let t=0;t<=1.0001;t+=0.04){
      const u=1-t;
      const run = (axis==='x') ? (u*u*y1 + 2*u*t*cpy + t*t*y2)
                               : (u*u*x1 + 2*u*t*cpx + t*t*x2);
      if(run < spanLo || run > spanHi) continue;     // outside the building's extent
      const c = (axis==='x') ? (u*u*x1 + 2*u*t*cpx + t*t*x2)
                             : (u*u*y1 + 2*u*t*cpy + t*t*y2);
      best = sign>0 ? Math.max(best,c) : Math.min(best,c); any=true;
    }
    if(!any){ // span doesn't overlap this edge's sampled arc; fall back to full-arc extreme
      for(let t=0;t<=1.0001;t+=0.04){ const u=1-t;
        const c=(axis==='x')?(u*u*x1+2*u*t*cpx+t*t*x2):(u*u*y1+2*u*t*cpy+t*t*y2);
        best=sign>0?Math.max(best,c):Math.min(best,c); }
    }
    return best;
  };
  // first pass: reserve using the full chunk span (conservative), then refine once using
  // the resulting building extent so roads that bow away outside the footprint don't
  // needlessly widen the sidewalk.
  const computeRect = (spanX0,spanX1,spanY0,spanY1) => {
    let bx0 = i0*GAP + SIDEWALK_MIN, by0 = j0*GAP + SIDEWALK_MIN;
    let bx1 = (i1+1)*GAP - SIDEWALK_MIN, by1 = (j1+1)*GAP - SIDEWALK_MIN;
    for(let jj = j0; jj <= j1; jj++){
      const rL = edgeReachSpan(i0, jj, 0,1, 'x', +1, spanY0, spanY1) + edgeHalfW(i0,jj,0,1) + SIDEWALK_MIN;
      if(rL > bx0) bx0 = rL;
      const rR = edgeReachSpan(i1+1, jj, 0,1, 'x', -1, spanY0, spanY1) - edgeHalfW(i1+1,jj,0,1) - SIDEWALK_MIN;
      if(rR < bx1) bx1 = rR;
    }
    for(let ii = i0; ii <= i1; ii++){
      const rT = edgeReachSpan(ii, j0, 1,0, 'y', +1, spanX0, spanX1) + edgeHalfW(ii,j0,1,0) + SIDEWALK_MIN;
      if(rT > by0) by0 = rT;
      const rB = edgeReachSpan(ii, j1+1, 1,0, 'y', -1, spanX0, spanX1) - edgeHalfW(ii,j1+1,1,0) - SIDEWALK_MIN;
      if(rB < by1) by1 = rB;
    }
    return [bx0,by0,bx1,by1];
  };
  // pass 1: span = whole chunk
  let [bx0,by0,bx1,by1] = computeRect(i0*GAP,(i1+1)*GAP, j0*GAP,(j1+1)*GAP);
  // pass 2: re-reserve using the pass-1 rect as the span (tighter, still safe)
  [bx0,by0,bx1,by1] = computeRect(bx0,bx1, by0,by1);
  // recursion-safe roundabout radius estimate at a NODE (i,j). Mirrors the pure part
  // of isRoundabout's gate; uses a worst-case node width so we never under-reserve.
  const RB_NODE_W = 290;                          // widest possible road (hwy) -> max node width
  const maybeRoundaboutR = (ni,nj) => {
    const inter = isInterchange(ni,nj);
    // pure gate: interchanges are always roundabouts; city nodes only when hash passes
    const cityRB = (biomeOf(ni,nj)==="city" && hsh(ni,nj,91)<=0.17);
    if(!inter && !cityRB) return 0;
    const R = inter ? RB_NODE_W*1.25+44 : RB_NODE_W*0.95+18;
    return R + 16;                                // +16 matches getLot's roundabout setback
  };
  // clamp the rect out of any roundabout circle sitting on one of the 4 corner nodes
  const corners = [[i0,j0],[i1+1,j0],[i0,j1+1],[i1+1,j1+1]];
  for(const [ni,nj] of corners){
    const R = maybeRoundaboutR(ni,nj); if(!R) continue;
    const cx = nX(ni,nj), cy = nY(ni,nj);
    // push whichever near edges of the rect lie inside the circle outward (axis-aligned)
    if(cx <= (bx0+bx1)/2) bx0 = Math.max(bx0, cx + R); else bx1 = Math.min(bx1, cx - R);
    if(cy <= (by0+by1)/2) by0 = Math.max(by0, cy + R); else by1 = Math.min(by1, cy - R);
  }
  const availW=Math.max(ROAD, bx1-bx0), availH=Math.max(ROAD, by1-by0);
  const kind = role==="tower" ? "tower" : "blok";
  let w,h;
  if(kind==="tower"){
    // tower: nearly fills the available square — tiny sidewalk gap each side
    w=availW*(0.94+hsh(i,j,950)*0.05);
    h=availH*(0.94+hsh(i,j,951)*0.05);
  } else {
    // blok: fills the long axis fully, short axis is naturally narrow
    const shortU=Math.min(role==="blok1"?availH:Math.min(availW,availH), (12+hsh(i,j,953)*14)*U_PER_M);
    if(role==="blokV"){ h=availH*(0.96+hsh(i,j,952)*0.03); w=Math.min(availW, shortU); }
    else if(role==="blokH"){ w=availW*(0.96+hsh(i,j,952)*0.03); h=Math.min(availH, shortU); }
    else {
      if(hsh(i,j,954)<0.5){ w=availW*0.96; h=Math.min(availH, shortU); }
      else { h=availH*0.96; w=Math.min(availW, shortU); }
    }
  }
  w=Math.round(Math.min(availW,w)); h=Math.round(Math.min(availH,h));
  const x=Math.round(bx0+(availW-w)/2), y=Math.round(by0+(availH-h)/2);
  // never build on (or overhanging) water — sample a grid across the footprint and its
  // perimeter against the same smooth coastline field the renderer/physics use.
  // (inWater -> waterScore is pure hashes; no getEdge/plotBuilding recursion.)
  {
    const STEP = 80;                              // sample density across the footprint
    for(let sx = x; sx <= x + w; sx += STEP){
      for(let sy = y; sy <= y + h; sy += STEP){
        const px = Math.min(sx, x + w), py = Math.min(sy, y + h);
        if(inWater(px, py)){ plotCache.set(key, null); return null; }
      }
    }
    // explicit corner checks in case STEP skips a thin water tongue at the edge
    if(inWater(x,y)||inWater(x+w,y)||inWater(x,y+h)||inWater(x+w,y+h)){ plotCache.set(key,null); return null; }
  }
  let b;
  if(kind==="tower"){
    const floors=18+((hsh(i,j,914)*47)|0);      // 18..64 floors
    const styles=["glass","gridglass","banded","concrete","darkglass"];
    const style=styles[(hsh(i,j,960)*styles.length)|0];
    const glassTint=["#7fa0bd","#6f93b0","#88b0c8","#5d8aa8","#9ab8cc"][(hsh(i,j,961)*5)|0];
    const trim=["#cdd6dd","#b9c3cb","#9fa9b2","#d8dee3"][(hsh(i,j,962)*4)|0];
    b={x,y,w,h,type:"tower",color:TOWER_WALL[(hsh(i,j,913)*TOWER_WALL.length)|0],roofC:"#333b45",
       H:floors*(30+4*hsh(i,j,930)),floors,feat:[],mega:true,style,glassTint,trim,
       litSeed:(hsh(i,j,963)*1e9)|0,
       antenna:hsh(i,j,940)<0.6, helipad:hsh(i,j,941)<0.22, setback:hsh(i,j,964)<0.34};
  } else {
    const floors=4+((hsh(i,j,916)*9)|0);        // 4..12 floors
    const styles=["panel","brick","plaster","mixed"];
    const style=styles[(hsh(i,j,965)*styles.length)|0];
    const accent=["#8a6f5a","#9c8470","#76808a","#a89478","#6e7a82"][(hsh(i,j,966)*5)|0];
    // "front" = the long facade that carries balconies + entrances (used by grounds).
    // For horizontal blocks the SOUTH face (index 2) is the one that always renders in
    // this 2.5D view, so anchor the front there; vertical blocks use E or W.
    const longHoriz = w>=h;
    const front = longHoriz ? 2 : (hsh(i,j,970)<0.5?1:3);
    // number of stairwell cores along the long facade (more for longer blocks)
    const longLen = longHoriz ? w : h;
    const cores = Math.max(1, Math.min(5, Math.round(longLen/220)));
    // long blocks get a ground-level passage (brama) through to the courtyard
    const hasPassage = longLen>620 && hsh(i,j,971)<0.7;
    const cc=nearestCity(i,j); const isCity = cc.dist < cc.R*0.55;   // central vs outskirts
    b={x,y,w,h,type:"blok",color:BLOK_WALL[(hsh(i,j,915)*BLOK_WALL.length)|0],roofC:"#4b4f56",
       H:floors*(26+4*hsh(i,j,931)),floors,balcony:hsh(i,j,967)<0.7,feat:[],mega:true,style,accent,
       litSeed:(hsh(i,j,968)*1e9)|0, front, cores, hasPassage, longHoriz, isCity,
       gardenSeed:(hsh(i,j,972)*1e9)|0};
  }
  const m={id:key,i0,j0,i1,j1,building:b, x0:x,y0:y,x1:x+w,y1:y+h};
  plotCache.set(key,m); return m;
}
// iterate landmarks whose footprint may touch cells near (ci,cj)
function eachMegaNearCell(ci,cj,fn){
  const seen=new Set();
  for(let i=ci-2;i<=ci+1;i++) for(let j=cj-2;j<=cj+1;j++){
    const m=plotBuilding(i,j); if(!m||seen.has(m.id)) continue; seen.add(m.id); fn(m);
  }
}
// the landmark covering cell (i,j), if any (checks this cell + possible anchors)
function megaAtCell(i,j){
  const key=i+","+j;
  if(megaCellCache.has(key)) return megaCellCache.get(key);
  let hit=null;
  const cx0=i*GAP, cy0=j*GAP, cx1=(i+1)*GAP, cy1=(j+1)*GAP;
  for(const [ai,aj] of [[i,j],[i-1,j],[i,j-1]]){
    const m=plotBuilding(ai,aj);
    if(m && m.x0<cx1 && m.x1>cx0 && m.y0<cy1 && m.y1>cy0){ hit=m; break; }
  }
  if(megaCellCache.size>12000) megaCellCache.clear();
  megaCellCache.set(key,hit); return hit;
}
function megaBlocksCell(i,j){ return !!megaAtCell(i,j); }
// remove a road edge only when its centreline actually runs under a building footprint
function segHitsRect(ax,ay,bx,by,r){
  if(Math.max(ax,bx)<r.x0||Math.min(ax,bx)>r.x1||Math.max(ay,by)<r.y0||Math.min(ay,by)>r.y1) return false;
  for(let t=0;t<=1.0001;t+=0.1){ const x=ax+(bx-ax)*t, y=ay+(by-ay)*t;
    if(x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1) return true; }
  return false;
}
function edgeTouchesMega(i,j,di,dj){
  const A=node(i,j), B=node(i+di,j+dj);
  // an edge borders up to two cells; a slab can be anchored up to one cell away
  const sides = (di===1&&dj===0) ? [[i,j],[i,j-1]] : [[i-1,j],[i,j]];
  for(const [ci,cj] of sides){
    for(const [ai,aj] of [[ci,cj],[ci-1,cj],[ci,cj-1]]){
      const m=plotBuilding(ai,aj);
      if(m && segHitsRect(A[0],A[1],B[0],B[1],m)) return true;
    }
  }
  return false;
}
function collideMega(e,bounce){
  const eR=e.R!==undefined?e.R:e.r, ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  const seen=new Set();
  eachMegaNearCell(ci,cj,m=>{
    if(seen.has(m.id)) return; seen.add(m.id);
    const b=m.building;
    if(e.x+eR<b.x||e.x-eR>b.x+b.w||e.y+eR<b.y||e.y-eR>b.y+b.h) return;
    const cx=clamp(e.x,b.x,b.x+b.w), cy=clamp(e.y,b.y,b.y+b.h);
    let dx=e.x-cx, dy=e.y-cy, d=Math.hypot(dx,dy), nx,ny;
    if(d>=eR) return;
    if(d>0.0001){ nx=dx/d; ny=dy/d; }
    else{ const l=e.x-b.x,r=b.x+b.w-e.x,t=e.y-b.y,bo=b.y+b.h-e.y,mn=Math.min(l,r,t,bo);
      if(mn===l){nx=-1;ny=0;} else if(mn===r){nx=1;ny=0;} else if(mn===t){nx=0;ny=-1;} else {nx=0;ny=1;} d=0; }
    e.x+=nx*(eR-d); e.y+=ny*(eR-d);
    if(e.vx!==undefined){ const into=e.vx*nx+e.vy*ny; if(into<0){ e.vx-=into*nx*(1+bounce); e.vy-=into*ny*(1+bounce);
      if(e.hp!==undefined && into<-110) damageCar(e,(-into-110)*0.14,cx,cy,"impact"); } }
  });
}
function addBuilding(lot,bx,by,bw,bh,r,type){
  bx=Math.round(bx); by=Math.round(by); bw=Math.round(bw); bh=Math.round(bh);
  if(inWater(bx+bw/2,by+bh/2) || inWater(bx,by) || inWater(bx+bw,by+bh)) return null;   // never build on water
  const b={x:bx,y:by,w:bw,h:bh,type,feat:[]};
  if(type==="tower"){ b.color=pick(TOWER_WALL); b.roofC="#3a414a"; b.floors=20+(r()*81|0); b.H=b.floors*(28+r()*8);
    if(r()<0.75) b.feat.push({t:"ac",x:bx+bw*0.28+r()*bw*0.3,y:by+bh*0.28+r()*bh*0.3,w:12,h:10});
    b.antenna=r()<0.6; b.helipad=r()<0.22;
  } else if(type==="blok"){ b.color=pick(BLOK_WALL); b.roofC=shade(b.color,-24); b.floors=5+(r()*16|0); b.H=b.floors*(26+r()*6); b.balcony=true;
    const fn=1+(r()*2|0); for(let k=0;k<fn;k++) b.feat.push({t:["ac","stair","tank"][(r()*3)|0],x:bx+8+r()*Math.max(2,bw-26),y:by+8+r()*Math.max(2,bh-26),w:11+r()*8,h:10+r()*8});
  } else if(type==="shop"||type==="super"){ b.color=pick(SHOP_WALL); b.roofC=shade(b.color,-20); b.floors=type==="super"?(2+(r()*7|0)):(1+(r()*3|0)); b.H=b.floors*(24+r()*8); b.super=type==="super"; b.sign={c:pick(SIGN_COL)};
    const fn=type==="super"?3:1; for(let k=0;k<fn;k++) b.feat.push({t:"ac",x:bx+10+r()*Math.max(2,bw-30),y:by+8+r()*Math.max(2,bh-24),w:12+r()*8,h:10+r()*6});
  } else if(type==="chapel"||type==="church"){ b.type="house"; b.church=true; b.bigChurch=(type==="church");
    b.color=pick(["#bcb6a8","#c4bdae","#aca596"]); b.roofC=pick(["#46505a","#3f4a52","#574b42"]);
    b.floors=type==="church"?(8+(r()*13|0)):(5+(r()*8|0)); b.H=b.floors*(24+r()*6); b.chimney=null;
  } else { b.color=pick(HOUSE_WALL); b.roofC=pick(HOUSE_ROOF); b.H=16+r()*7;
    b.chimney=[bx+(r()<0.5?bw*0.2:bw*0.68), by+bh*0.2+r()*bh*0.4];
  }
  lot.buildings.push(b);
}
function placeBuildings(lot, zone, r, biome){
  const m=zone==="downtown"?2:zone==="midrise"?4:10, x0=lot.x+m, y0=lot.y+m, w=lot.w-2*m, h=lot.h-2*m;
  if(w<22||h<22) return;
  if(zone==="downtown"){
    if(w>360 && r()<0.34){ const g=Math.max(14,w*0.016); addBuilding(lot, x0, y0, (w-g)/2, h, r, "tower"); addBuilding(lot, x0+(w+g)/2, y0, (w-g)/2, h, r, "tower"); }
    else { const bw=w*(0.97+r()*0.03), bh=h*(0.97+r()*0.03); addBuilding(lot, x0+(w-bw)/2, y0+(h-bh)/2, bw, bh, r, "tower"); }
  } else if(zone==="midrise"){
    if(r()<0.22 && w>240){ const g=Math.max(12,w*0.016); addBuilding(lot,x0,y0,(w-g)/2,h,r,"blok"); addBuilding(lot,x0+(w+g)/2,y0,(w-g)/2,h,r,"blok"); }
    else if(r()<0.36){ const bw=w*(0.96+r()*0.04), bh=h*(0.96+r()*0.04); addBuilding(lot,x0+(w-bw)/2,y0+(h-bh)/2,bw,bh,r,"tower"); }
    else { const bw=w*(0.97+r()*0.03), bh=h*(0.97+r()*0.03); addBuilding(lot,x0+(w-bw)/2,y0+(h-bh)/2,bw,bh,r,"blok"); }
  } else {
    const cols=Math.max(1,Math.round(w/300)), rows=Math.max(1,Math.round(h/300)), pw=w/cols, ph=h/rows;
    for(let cI=0;cI<cols;cI++) for(let rI=0;rI<rows;rI++){
      if(r()<0.2) continue;                                   // many empty plots -> sparse, spaced-out housing
      const bw=pw*(0.58+r()*0.12), bh=ph*(0.58+r()*0.12);     // house fills ~58-70% of plot -> wide yards between houses
      if(bw<18||bh<16) continue;
      addBuilding(lot, x0+cI*pw+(pw-bw)/2, y0+rI*ph+(ph-bh)/2, bw, bh, r, "house");
    }
  }
}
function genCemetery(lot, r){
  lot.graves=[];
  const m=18, L0=lot.x+m, T0=lot.y+m, gw=lot.w-2*m, gh=lot.h-2*m;
  const cw=Math.min(gw*0.5,74), ch=Math.min(gh*0.32,52), chx=L0+gw/2-cw/2, chy=T0;   // chapel at the north-centre
  addBuilding(lot, chx, chy, cw, ch, r, "chapel");
  const cl=chx-6, cr=chx+cw+6, ct=chy-4, cb=chy+ch+8;
  const cols=Math.max(2,Math.floor(gw/26)), rows=Math.max(2,Math.floor(gh/34));
  const pathCol = cols>4 ? (cols>>1) : -1;                              // central walking path up to the chapel
  for(let a=0;a<cols;a++){ if(a===pathCol) continue;
    for(let b=0;b<rows;b++){ if(r()<0.12) continue;                     // scattered gaps
      const x=L0+(a+0.5)*(gw/cols), y=T0+(b+0.72)*(gh/rows), ty=r();
      if(x>cl&&x<cr&&y>ct&&y<cb) continue;                             // keep clear around the chapel
      lot.graves.push({x, y, type: ty<0.6?"slab":(ty<0.86?"cross":"obelisk")}); } }
  const nt=2+(r()*3|0); for(let k=0;k<nt;k++){ if(r()<0.5) lot.props.push(makeTree(lot.x+10+r()*(lot.w-20), lot.y+10+r()*(lot.h-20), 38+r()*22, r, null, {city:true})); }
  const fx0=lot.x+6, fx1=lot.x+lot.w-6, fy0=lot.y+6, fy1=lot.y+lot.h-6, gx=(fx0+fx1)/2, gwid=18;   // perimeter fence + south gate
  lot.fences.push({x1:fx0,y1:fy0,x2:fx1,y2:fy0},{x1:fx0,y1:fy0,x2:fx0,y2:fy1},{x1:fx1,y1:fy0,x2:fx1,y2:fy1},
                  {x1:fx0,y1:fy1,x2:gx-gwid,y2:fy1},{x1:gx+gwid,y1:fy1,x2:fx1,y2:fy1});
  lot.cemGate={x:gx,y:fy1,w:gwid};
}
function genParkingLot(lot,r){
  const x=lot.x,y=lot.y,w=lot.w,h=lot.h, cw=46, ch=70;
  const cols=Math.max(1,Math.floor((w-12)/cw)), rows=Math.max(1,Math.floor((h-10)/ch));
  lot.stalls=[];
  for(let cI=0;cI<cols;cI++) for(let rI=0;rI<rows;rI++){
    const sx=x+8+cI*cw+cw/2, sy=y+6+rI*ch+ch/2;
    lot.stalls.push({x:sx,y:sy,w:cw,h:ch});
    if(r()<0.55) lot.parked.push(Object.assign({x:sx, y:sy, a:(rI%2?1:-1)*Math.PI/2, kind:"car", cr:22, hp:190, maxHp:190, dmgSeed:(r()*1e9)|0, dead:false}, parkedModelProps(r)));
  }
}
function addCurbside(lot,i,j,r){
  const A=node(i,j),Bn=node(i+1,j),C=node(i+1,j+1),D=node(i,j+1);
  const edges=[
    {ex:getEdge(i,j,1,0),   P0:A,  P1:Bn, nx:0, ny:1},
    {ex:getEdge(i,j+1,1,0), P0:D,  P1:C,  nx:0, ny:-1},
    {ex:getEdge(i,j,0,1),   P0:A,  P1:D,  nx:1, ny:0},
    {ex:getEdge(i+1,j,0,1), P0:Bn, P1:C,  nx:-1,ny:0},
  ];
  const dens = lot.biome==="city"?0.66 : 0.3;
  if(lot.biome==="city" && r()<0.12){                                   // a bike rack with a few bikes
    const e=edges[(r()*4)|0];
    if(e.ex.exists && !e.ex.bridge){ const dx=e.P1[0]-e.P0[0], dy=e.P1[1]-e.P0[1], ang=Math.atan2(dy,dx), off=e.ex.width/2+15, t=0.35+r()*0.3;
      const cx=e.P0[0]+dx*t+e.nx*off, cy=e.P0[1]+dy*t+e.ny*off;
      if(!inRoundabout(cx,cy)){ const n=2+(r()*2|0); lot.rack={x:cx,y:cy,a:ang,len:n*15+8,n};
        for(let k=0;k<n;k++){ const bx=cx+Math.cos(ang)*((k-(n-1)/2)*15), by=cy+Math.sin(ang)*((k-(n-1)/2)*15);
          lot.parked.push({x:bx,y:by,a:ang+Math.PI/2,kind:"bike",W:14,L:36,color:pick(["#c0392b","#2980b9","#27ae60","#e67e22","#34404a","#d6d6d6"]),cr:11,hp:30,maxHp:30,dmgSeed:(r()*1e9)|0,dead:false,rider:false}); } } }
  }
  for(const e of edges){ if(!e.ex.exists||e.ex.bridge) continue;
    const dx=e.P1[0]-e.P0[0], dy=e.P1[1]-e.P0[1], ang=Math.atan2(dy,dx), off=e.ex.width/2+13;
    for(let t=0.2; t<0.86; t+=0.22){ if(r()>dens) continue;
      const cx=e.P0[0]+dx*t+e.nx*off, cy=e.P0[1]+dy*t+e.ny*off; if(inRoundabout(cx,cy)) continue;
      const rk=r();
      if(rk<0.09) lot.parked.push({x:cx, y:cy, a:ang, kind:"moto", W:16, L:42, color:pick(CARCOL), cr:12, hp:72, maxHp:72, dmgSeed:(r()*1e9)|0, dead:false, rider:false});
      else if(rk<0.19) lot.parked.push({x:cx, y:cy, a:ang, kind:"bike", W:14, L:36, color:pick(["#c0392b","#2980b9","#27ae60","#e67e22","#34404a","#d6d6d6"]), cr:11, hp:44, maxHp:44, dmgSeed:(r()*1e9)|0, dead:false, rider:false});
      else lot.parked.push(Object.assign({x:cx, y:cy, a:ang, kind:"car", cr:22, hp:190, maxHp:190, dmgSeed:(r()*1e9)|0, dead:false}, parkedModelProps(r)));
    }
  }
}
// Street trees along the verge — lines city/suburb streets with greenery. Placed on the top &
// left edges only (each road edge is owned by one lot) so neighbours don't double up. Trunks are
// tiny hitboxes on the sidewalk; canopies overhang the road.
function addStreetTrees(lot,i,j,r){
  const A=node(i,j),Bn=node(i+1,j),D=node(i,j+1);
  const edges=[ {ex:getEdge(i,j,1,0),P0:A,P1:Bn,nx:0,ny:1}, {ex:getEdge(i,j,0,1),P0:A,P1:D,nx:1,ny:0} ];
  const zone=lot.zone||"", dens=(zone==="suburb"||zone==="transition")?0.6:0.4;
  for(const e of edges){ if(!e.ex.exists||e.ex.bridge||e.ex.klass==="hwy") continue;
    const dx=e.P1[0]-e.P0[0], dy=e.P1[1]-e.P0[1], off=e.ex.width/2+15;
    for(let t=0.18;t<0.9;t+=0.24){ if(r()>dens) continue;
      const cx=e.P0[0]+dx*t+e.nx*off, cy=e.P0[1]+dy*t+e.ny*off;
      if(inRoundabout(cx,cy)||inPlaza(cx,cy)) continue;
      let blocked=false; for(const b of lot.buildings){ if(cx>b.x-12&&cx<b.x+b.w+12&&cy>b.y-12&&cy<b.y+b.h+12){ blocked=true; break; } }
      if(blocked) continue;
      const s=118+r()*72, kd=r()<0.70?"deciduous":(r()<0.55?"oak":"bush");
      lot.props.push(makeTree(cx,cy,s,r,kd,{city:true}));
    }
  }
}
function addLamps(lot,i,j,r){
  lot.lamps=[];
  const A=node(i,j),Bn=node(i+1,j),D=node(i,j+1);
  const edges=[ {ex:getEdge(i,j,1,0),P0:A,P1:Bn,nx:0,ny:1}, {ex:getEdge(i,j,0,1),P0:A,P1:D,nx:1,ny:0} ];
  const dens=lot.biome==="city"?0.92:0.4, ts=lot.biome==="city"?[0.22,0.5,0.78]:[0.5];
  for(const e of edges){ if(!e.ex.exists||e.ex.bridge) continue;
    const dx=e.P1[0]-e.P0[0], dy=e.P1[1]-e.P0[1], off=e.ex.width/2+9, arm=20;
    for(const t of ts){ if(r()>dens) continue;
      const bx=e.P0[0]+dx*t+e.nx*off, by=e.P0[1]+dy*t+e.ny*off; if(inRoundabout(bx,by)||inPlaza(bx,by)) continue;
      lot.lamps.push({x:bx, y:by, hx:bx-e.nx*arm, hy:by-e.ny*arm, dead:false, fall:null, fdx:0, fdy:0});
    }
  }
}
const sparks=[];
function spawnSparks(x,y,n,vx0,vy0){
  for(let i=0;i<n;i++){ const a=Math.random()*6.283, sp=rand(40,170);
    sparks.push({x,y, vx:Math.cos(a)*sp+(vx0||0)*0.18, vy:Math.sin(a)*sp+(vy0||0)*0.18-rand(20,90), life:rand(0.3,0.7), t:0,
      c: Math.random()<0.5?"#ffd23a":(Math.random()<0.5?"#ff8a2a":"#fff2c0")}); }
  while(sparks.length>260) sparks.shift();
}
function updateSparks(dt){ for(let i=sparks.length-1;i>=0;i--){ const s=sparks[i]; s.t+=dt; s.vy+=270*dt; s.vx*=(1-1.6*dt); s.x+=s.vx*dt; s.y+=s.vy*dt; if(s.t>=s.life) sparks.splice(i,1); } }
function drawSparks(ox,oy){ if(!sparks.length) return; ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.lineWidth=1.4;
  for(const s of sparks){ if(s.x<ox-20||s.x>ox+VW+20||s.y<oy-20||s.y>oy+VH+20) continue; ctx.globalAlpha=Math.max(0,1-s.t/s.life); ctx.strokeStyle=s.c;
    ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x-s.vx*0.02,s.y-s.vy*0.02); ctx.stroke(); }
  ctx.globalAlpha=1; ctx.restore(); }
const fallingProps=[];                                                // posts currently toppling (lamps + signals)
function topple(o, vx, vy, PL){ if(o.fall) return; const d=Math.hypot(vx,vy)||1;
  o.fdx=vx/d; o.fdy=vy/d; o._pl=PL||28; o.dead=true;
  o.fall={ang:0, av:Math.min(3.6, 1.2+d*0.004), settled:false, rest:0, spkCd:0};
  spawnSparks(o.x+o.fdx*4, o.y-(PL||28)*0.6, 9+(Math.random()*6|0), vx, vy); fallingProps.push(o); }
function updateFalling(dt){
  for(let i=fallingProps.length-1;i>=0;i--){ const o=fallingProps[i], fa=o.fall;
    if(!fa.settled){ fa.av += 8*dt; fa.ang += fa.av*dt;
      if(fa.ang>=Math.PI/2){ fa.ang=Math.PI/2; if(fa.av>2.4){ fa.av=-fa.av*0.30; } else { fa.av=0; fa.settled=true; fa.rest=0; } } }
    else fa.rest+=dt;
    fa.spkCd-=dt;
    if((!fa.settled||fa.rest<1.6) && fa.spkCd<=0){ const PL=o._pl||28, tx=o.x+Math.sin(fa.ang)*o.fdx*PL, ty=o.y+(-Math.cos(fa.ang)+Math.sin(fa.ang)*o.fdy)*PL;
      spawnSparks(tx,ty,2+(Math.random()*2|0)); fa.spkCd=rand(0.05,0.17); }
    if(fa.settled && fa.rest>1.6) fallingProps.splice(i,1);
  }
}
function addSignals(lot,i,j){
  if(!isSignal(i,j)) return;
  lot.signals=[]; lot.si=i; lot.sj=j;
  const cx=nX(i,j), cy=nY(i,j), mw=nodeMaxWidth(i,j);
  for(const[di,dj]of EDIRS){ const e=getEdge(i,j,di,dj); if(!e.exists) continue;
    const axis=(dj===0)?0:1, ang=Math.atan2(nY(i+di,j+dj)-cy, nX(i+di,j+dj)-cx);
    const half=mw*0.52+9, hw=e.width*0.5, bx=cx+Math.cos(ang)*half, by=cy+Math.sin(ang)*half;
    const rx=Math.cos(ang+Math.PI/2), ry=Math.sin(ang+Math.PI/2), px=bx+rx*(hw+6), py=by+ry*(hw+6);
    lot.signals.push({x:px, y:py, axis, dead:false, fall:null, fdx:0, fdy:0});
  }
}
function postHit(e,px,py,pad){                                          // is (px,py) within the entity's oriented body box?
  const c=Math.cos(e.a||0), s=Math.sin(e.a||0), dx=px-e.x, dy=py-e.y;
  const lx=dx*c+dy*s, ly=-dx*s+dy*c;
  const hl=(e.L?e.L*0.5:(e.R||9))+pad, hw=(e.W?e.W*0.5:(e.R||9))+pad;
  return Math.abs(lx)<hl && Math.abs(ly)<hw;
}
function bodyR(v,ax,ay,pad){                                             // support radius of oriented box/circle along axis
  const a=v.a||0, c=Math.cos(a), s=Math.sin(a);
  const hl=(v.L?v.L*0.5:(v.R!==undefined?v.R:(v.r||9))) + (pad||0);
  const hw=(v.W?v.W*0.5:(v.R!==undefined?v.R:(v.r||9))) + (pad||0);
  const along=Math.abs(ax*c+ay*s), side=Math.abs(ax*(-s)+ay*c);
  return hl*along + hw*side;
}
function vehicleOverlap(a,b,padA,padB){                                  // SAT for oriented body envelopes
  const axes=[];
  const ca=Math.cos(a.a||0), sa=Math.sin(a.a||0), cb=Math.cos(b.a||0), sb=Math.sin(b.a||0);
  axes.push([ca,sa],[-sa,ca],[cb,sb],[-sb,cb]);
  const dx=a.x-b.x, dy=a.y-b.y, dd=Math.hypot(dx,dy);
  if(dd>0.0001) axes.push([dx/dd,dy/dd]);
  let bestPen=1e9, bestNx=0, bestNy=0;
  for(const axv of axes){
    const ax=axv[0], ay=axv[1];
    const dist=Math.abs(dx*ax+dy*ay);
    const ra=bodyR(a,ax,ay,padA), rb=bodyR(b,ax,ay,padB);
    const pen=ra+rb-dist;
    if(pen<=0) return null;
    if(pen<bestPen){ bestPen=pen; const sgn=(dx*ax+dy*ay)>=0?1:-1; bestNx=ax*sgn; bestNy=ay*sgn; }
  }
  return {nx:bestNx, ny:bestNy, pen:bestPen};                           // normal points from b to a
}
function collideLamps(e){
  const ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); if(!L.lamps) continue;
    for(const lm of L.lamps){ if(lm.fall) continue;
      if(postHit(e,lm.x,lm.y,3)){ const sp=Math.hypot(e.vx||0,e.vy||0); if(sp>30){ topple(lm, e.vx||0.5, e.vy||0.5, 40); playThud(0.5); } } }
  }
}
function collideSignals(e){
  const ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); if(!L.signals) continue;
    for(const s of L.signals){ if(s.fall) continue;
      if(postHit(e,s.x,s.y,3)){ const sp=Math.hypot(e.vx||0,e.vy||0); if(sp>34){ topple(s, e.vx||0.5, e.vy||0.5, 26); playThud(0.5); } } }
  }
}
function inRoundabout(x,y){
  const ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ if(!isRoundabout(i,j)) continue; const A=node(i,j), R=roundaboutR(i,j)+18; if((x-A[0])**2+(y-A[1])**2 < R*R) return true; }
  return false;
}
function collideRoundabouts(e){
  const eR=e.R!==undefined?e.R:e.r, ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    if(!isRoundabout(i,j)) continue;
    const A=node(i,j);
    const colR=roundaboutObstacleR(i,j);
    if(colR<=0) continue;                                              // grass / meadow / flower / cobble — drive through
    const dx=e.x-A[0], dy=e.y-A[1], rr=colR+eR, d=Math.hypot(dx,dy)||0.001;
    if(d<rr){ const nx=dx/d, ny=dy/d, push=rr-d; e.x+=nx*push; e.y+=ny*push;
      if(e.vx!==undefined){ const into=e.vx*nx+e.vy*ny; if(into<0){ e.vx-=into*nx*1.1; e.vy-=into*ny*1.1;
        if(e.hp!==undefined && into<-90) damageCar(e,(-into-90)*0.10,A[0],A[1],"impact"); } } }
  }
}
function collideTrees(e){
  const eR=e.R!==undefined?e.R:e.r, ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); if(!L.props.length) continue;
    for(const p of L.props){ if(p.t!=="tree") continue;
      const hitR=p.hitR||(p.s*0.22);
      const rr=eR+hitR, dx=e.x-p.x, dy=e.y-p.y, d=Math.hypot(dx,dy)||0.001;
      if(d<rr){ const nx=dx/d, ny=dy/d, push=rr-d; e.x+=nx*push; e.y+=ny*push;
        if(e.vx!==undefined){ const into=e.vx*nx+e.vy*ny; if(into<0){ e.vx-=into*nx*1.1; e.vy-=into*ny*1.1; if(e.hp!==undefined && into<-130) damageCar(e,(-into-130)*0.12,p.x,p.y,"impact"); } } }
    }
  }
}
function collideParked(e){
  const ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); if(!L.parked.length) continue;
    for(let k=L.parked.length-1;k>=0;k--){ const pc=L.parked[k];
      const ov=vehicleOverlap(e,pc,0,0);
      if(!ov) continue;
      e.x+=ov.nx*ov.pen; e.y+=ov.ny*ov.pen;
      let relInto=0;
      if(e.vx!==undefined){ relInto=e.vx*ov.nx+e.vy*ov.ny; if(relInto<0){ const damp=pc.kind==="car"?1.20:0.92; e.vx-=relInto*ov.nx*damp; e.vy-=relInto*ov.ny*damp; } }
      // parked bikes/motos should not feel like stone blocks: they get pushed around a bit
      if(pc.kind!=="car"){
        const slide=clamp(ov.pen*0.45, 0, 9);
        pc.x-=ov.nx*slide; pc.y-=ov.ny*slide;
        pc.a += (e.vx!==undefined?clamp((e.vx*ov.ny-e.vy*ov.nx)*0.0008,-0.08,0.08):0);
      }
      if(e===car){
        const sp=Math.hypot(e.vx,e.vy);
        if(sp>95 && relInto<-26){
          const mul = pc.kind==="car" ? 0.06 : (pc.kind==="moto" ? 0.034 : 0.028);
          const selfMul = pc.kind==="car" ? 0.026 : 0.017;
          damageCar(pc, sp*mul, car.x, car.y, "impact");
          damageCar(car, sp*selfMul, pc.x, pc.y, "impact");
          if(pc.dead){ L.parked.splice(k,1); continue; }
        }
      }
    }
  }
}
function addGardens(lot, r){
  const free=(x,y,pad)=>{ if(x<lot.x+2||x>lot.x+lot.w-2||y<lot.y+2||y>lot.y+lot.h-2) return false;
    for(const o of lot.buildings){ if(x>o.x-pad&&x<o.x+o.w+pad&&y>o.y-pad&&y<o.y+o.h+pad) return false; } return true; };
  for(const b of lot.buildings){
    if(b.type!=="house" || b.church || r()>0.62) continue;              // gardens around most (not all) houses (never churches)
    const cx=b.x+b.w/2, cy=b.y+b.h/2, hr=Math.max(b.w,b.h)*0.5, reach=24+r()*34;
    for(let k=0;k<8+(r()*8|0);k++){ const a=r()*6.283, d=hr+4+r()*reach;   // ring of lush grass clumps
      const x=cx+Math.cos(a)*d, y=cy+Math.sin(a)*d*0.9; if(free(x,y,3)) lot.tufts.push({x,y,s:6+r()*5}); }
    const pc=1+(r()*3|0); for(let q=0;q<pc;q++){ const ca=r()*6.283, cd=hr+10+r()*reach*0.8;   // flower beds
      const fx=cx+Math.cos(ca)*cd, fy=cy+Math.sin(ca)*cd*0.9, col=["#e8d24a","#e07a9a","#c95ad8","#f0f0f0","#e88a3a","#6aa3e0"][(r()*6)|0];
      for(let k=0;k<5+(r()*7|0);k++){ const x=fx+(r()-0.5)*18, y=fy+(r()-0.5)*14; if(free(x,y,2)) lot.flowers.push({x,y,c:col}); } }
    const ntree=1+(r()*2|0); for(let k=0;k<ntree;k++){ for(let tr=0;tr<8;tr++){ const a=r()*6.283, d=hr+14+r()*reach;  // 1-2 proper garden trees
      const x=cx+Math.cos(a)*d, y=cy+Math.sin(a)*d*0.9; if(free(x,y,16)){ const s=98+r()*58, kd=r()<0.5?"deciduous":(r()<0.5?"oak":"bush");
        lot.props.push(makeTree(x,y,s,r,kd,{city:true})); break; } } }
    const nb=(r()*3|0); for(let k=0;k<nb;k++){ for(let tr=0;tr<6;tr++){ const a=r()*6.283, d=hr+10+r()*reach;   // a few low shrubs
      const x=cx+Math.cos(a)*d, y=cy+Math.sin(a)*d*0.9; if(free(x,y,10)){ lot.props.push(makeTree(x,y,28+r()*18,r,"bush",{city:true})); break; } } }
    if(r()<0.55){                                                       // picket fence around the yard, gate on the south side
      const m=10+r()*12;
      const fx0=clamp(b.x-m,lot.x+3,lot.x+lot.w-3), fx1=clamp(b.x+b.w+m,lot.x+3,lot.x+lot.w-3);
      const fy0=clamp(b.y-m,lot.y+3,lot.y+lot.h-3), fy1=clamp(b.y+b.h+m,lot.y+3,lot.y+lot.h-3);
      if(fx1-fx0>40 && fy1-fy0>40){ const gx=(fx0+fx1)/2, gw=15;
        lot.fences.push({x1:fx0,y1:fy0,x2:fx1,y2:fy0},{x1:fx0,y1:fy0,x2:fx0,y2:fy1},{x1:fx1,y1:fy0,x2:fx1,y2:fy1},
                        {x1:fx0,y1:fy1,x2:gx-gw,y2:fy1},{x1:gx+gw,y1:fy1,x2:fx1,y2:fy1}); }
    }
  }
}
// ---- 2.5D trees: built like buildings (footprint on ground + a leaning "roof" canopy) ----
// A tree stores a normalized silhouette outline (radius~1) so the renderer can stack a few
// shaded layers cheaply. The leafy/serrated edge lives in the outline; the 3D look comes from
// the same camera-relative lean vector the buildings use. Geometry only — colors at draw time.
function leafyOutline(r,ry,lobes,jag){
  const seg=64, pts=[], p1=r()*6.283,p2=r()*6.283,p3=r()*6.283, p4=r()*6.283;
  for(let k=0;k<seg;k++){
    const a=(k/seg)*6.283;
    let rad=1 + 0.12*Math.sin(a*3+p1) + 0.07*Math.sin(a*5+p2) + 0.04*Math.sin(a*2+p4); // big irregular lumps
    rad += jag*Math.abs(Math.sin(a*lobes+p3));                                          // small leafy scallops
    pts.push([Math.cos(a)*rad, Math.sin(a)*rad*ry]);
  }
  return pts;
}
function coniferOutline(r){
  const tiers=4, top=-1.30, bottom=0.92, halfB=0.66, eave=(bottom-top)/tiers*0.40, pts=[[0,top]];
  const jit=()=>0.92+r()*0.16;
  for(let n=1;n<=tiers;n++){ const fy=top+(bottom-top)*(n/tiers), w=halfB*(n/tiers)*jit();
    pts.push([w,fy-eave]); pts.push([w*0.5,fy]); }
  pts.push([0,bottom]);
  for(let n=tiers;n>=1;n--){ const fy=top+(bottom-top)*(n/tiers), w=halfB*(n/tiers)*jit();
    pts.push([-w*0.5,fy]); pts.push([-w,fy-eave]); }
  return pts;
}
// Chrono Trigger canopy: 3–4 overlapping sphere-clumps (fixed layout per kind). Each clump is
// cel-shaded at draw time (shadow SE, mid fill, highlight NW) — no dots, no noise.
function canopyLobes(r,kind){
  const j=(v)=>v+(r()-0.5)*0.04;
  if(kind==="bush") return [{ox:j(0),oy:j(0),lr:0.56},{ox:j(-0.22),oy:j(0.12),lr:0.38},{ox:j(0.20),oy:j(0.10),lr:0.34}];
  if(kind==="birch") return [{ox:j(0),oy:j(-0.22),lr:0.42},{ox:j(0),oy:j(0.10),lr:0.36},{ox:j(-0.12),oy:j(-0.04),lr:0.28}];
  if(kind==="oak") return [{ox:j(-0.04),oy:j(-0.06),lr:0.52},{ox:j(0.32),oy:j(0.08),lr:0.44},{ox:j(-0.30),oy:j(0.12),lr:0.40},{ox:j(0.06),oy:j(-0.24),lr:0.36}];
  if(kind==="maple") return [{ox:j(-0.02),oy:j(-0.10),lr:0.54},{ox:j(0.28),oy:j(0.06),lr:0.46},{ox:j(-0.28),oy:j(0.10),lr:0.42},{ox:j(0.04),oy:j(-0.22),lr:0.38}];
  if(kind==="willow") return [{ox:j(0),oy:j(0.14),lr:0.58},{ox:j(-0.32),oy:j(0.18),lr:0.48},{ox:j(0.30),oy:j(0.16),lr:0.44},{ox:j(0),oy:j(-0.08),lr:0.32}];
  if(kind==="pine"||kind==="spruce") return [];
  return [{ox:j(0),oy:j(-0.12),lr:0.50},{ox:j(-0.26),oy:j(0.08),lr:0.42},{ox:j(0.24),oy:j(0.06),lr:0.40}];
}
function makeTree(x,y,s,r,forceKind,opts){
  opts=opts||{};
  const city=!!opts.city;
  const kind=forceKind||(city?(s<24?"bush":"deciduous"):pickForestKind(opts.fi??0,opts.fj??0,r));
  const t={x,y,s,t:"tree",kind,forest:!city,city:city};
  if(kind==="bush"){
    t.H=s*0.34; t.crownR=s*0.30; t.trunk={tw:s*0.10,frac:0.12};
    t.outline=leafyOutline(r,0.74,6+(r()*3|0),0.20);
    t.lobes=canopyLobes(r,"bush"); t.hitR=Math.max(s*0.16,5); return t;
  }
  if(kind==="pine"||kind==="spruce"){
    const spr=kind==="spruce";
    t.H=s*(city?(spr?1.0:0.98):(spr?0.98:0.96));
    t.crownR=s*(city?(spr?0.34:0.40):(spr?0.26:0.30));
    t.trunk={tw:s*(spr?0.07:0.08),frac:0.14};
    t.outline=coniferOutline(r); t.conifer=true; t.lobes=[];
    t.hitR=Math.max(t.trunk.tw*0.55,city?4:9); return t;
  }
  const env={deciduous:{cr:0.40,ry:0.80,lobes:8,h:0.84},
             oak:{cr:0.46,ry:0.74,lobes:7,h:0.80},
             birch:{cr:0.30,ry:1.04,lobes:9,h:0.94},
             maple:{cr:0.44,ry:0.86,lobes:8,h:0.86},
             willow:{cr:0.50,ry:0.62,lobes:7,h:0.88}}[kind]||{cr:0.40,ry:0.80,lobes:8,h:0.84};
  t.H=s*(city?env.h*1.08:env.h*1.05);
  t.crownR=s*(city?env.cr*1.38:env.cr);
  t.trunk={tw:s*(kind==="oak"?0.10:kind==="birch"||kind==="willow"?0.07:0.085),frac:0.62};
  t.outline=leafyOutline(r,env.ry,env.lobes,0.15);
  t.lobes=canopyLobes(r,kind);
  t.hitR=Math.max(t.trunk.tw*0.55+3, city?5:9);
  return t;
}
// Forest tree sizes in metres (car ~3.6 m ≈ 80u). H ≈ s·0.88 → s = m · U_PER_M / 0.88.
function forestTreeS(metres){ return metres*U_PER_M/0.88; }
function pickForestTreeMetres(r){
  const roll=r();
  if(roll<0.30) return 5+r()*3;          // 5–8 m   saplings / young
  if(roll<0.62) return 8+r()*10;         // 8–18 m  common
  if(roll<0.84) return 18+r()*12;        // 18–30 m mature
  if(roll<0.96) return 30+r()*10;        // 30–40 m large
  return 40+r()*10;                      // 40–50 m rare giants
}
function genForestTrees(lot,r,ci,cj){
  const left=lot.x, top=lot.y, lw=lot.w, lh=lot.h, placed=[];
  const pad=14;
  const spacing=(s)=>Math.max(30, s*0.17);
  const fits=(x,y,s)=>{
    if(x<left+pad||x>left+lw-pad||y<top+pad||y>top+lh-pad) return false;
    for(const p of placed){
      const md=spacing(Math.min(s, p.s));
      if((x-p.x)**2+(y-p.y)**2<md*md) return false;
    }
    return true;
  };
  const pushTree=(x,y,s,kind)=>{
    lot.props.push(makeTree(x,y,s,r,kind,{fi:ci,fj:cj}));
    placed.push({x,y,s});
  };
  const target=Math.min(64, Math.max(22, Math.floor(lw*lh/22000)));
  let tries=0, maxTries=target*18;
  while(placed.length<target && tries++<maxTries){
    const x=left+pad+r()*(lw-pad*2), y=top+pad+r()*(lh-pad*2);
    const roll=r();
    if(roll<0.16){
      const s=forestTreeS(5+r()*3);
      if(!fits(x,y,s)) continue;
      pushTree(x,y,s,r()<0.45?"bush":"birch");
      continue;
    }
    const s=forestTreeS(pickForestTreeMetres(r));
    if(!fits(x,y,s)) continue;
    pushTree(x,y,s,null);
    if(r()<0.48){
      const ux=x+(r()-0.5)*spacing(s)*1.5, uy=y+(r()-0.5)*spacing(s)*1.2;
      const us=forestTreeS(5+r()*5);
      if(fits(ux,uy,us)) pushTree(ux,uy,us,r()<0.35?"bush":(r()<0.5?"birch":"willow"));
    }
  }
  for(let k=0;k<1+(r()*2|0);k++){
    const s=forestTreeS(38+r()*12);
    const edge=r()<0.55;
    const x=edge?(left+(r()<0.5?pad:lw-pad)):(left+pad+r()*(lw-pad*2));
    const y=edge?(top+pad+r()*(lh-pad*2)):(top+(r()<0.5?pad:lh-pad));
    if(fits(x,y,s)) pushTree(x,y,s,null);
  }
}
/* ===== plazas (open pedestrian squares) ===== */
function isPlaza(i,j){
  if(biomeOf(i,j)!=="city"||isRoundabout(i,j)) return false;
  if(nodeDegree(i,j)<3) return false;
  const cc=nearestCity(i,j); if(cc.dist>cc.R*0.55) return false;
  return hsh(i,j,321)<0.10;
}
function plazaR(i,j){ return nodeMaxWidth(i,j)*0.85+58; }
function inPlaza(x,y){
  const ci=Math.round(x/GAP), cj=Math.round(y/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ if(!isPlaza(i,j)) continue;
    const A=node(i,j), R=plazaR(i,j); if((x-A[0])**2+(y-A[1])**2<R*R) return true; }
  return false;
}
/* ===== fences (block pedestrians) ===== */
function segPush(e,eR,x1,y1,x2,y2){
  const dx=x2-x1, dy=y2-y1, L2=dx*dx+dy*dy||1;
  let t=((e.x-x1)*dx+(e.y-y1)*dy)/L2; t=t<0?0:t>1?1:t;
  const px=x1+dx*t, py=y1+dy*t, ox=e.x-px, oy=e.y-py, d=Math.hypot(ox,oy)||0.001;
  if(d<eR){ const nx=ox/d, ny=oy/d, push=eR-d; e.x+=nx*push; e.y+=ny*push;
    if(e.vx!==undefined){ const into=e.vx*nx+e.vy*ny; if(into<0){ e.vx-=into*nx*1.1; e.vy-=into*ny*1.1; } } }
}
function collideFences(e){
  const eR=(e.R!==undefined?e.R:e.r)+1, ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){ const L=getLot(i,j); if(!L.fences||!L.fences.length) continue;
    for(const f of L.fences) segPush(e,eR,f.x1,f.y1,f.x2,f.y2); }
}
function collideGraves(e){
  const eR=e.R!==undefined?e.R:e.r, ci=Math.floor((e.x-ROAD)/GAP), cj=Math.floor((e.y-ROAD)/GAP);
  for(let i=ci-1;i<=ci+1;i++) for(let j=cj-1;j<=cj+1;j++){
    const L=getLot(i,j); if(!L.graves||!L.graves.length) continue;
    for(const g of L.graves){
      const gr = g.type==="obelisk" ? 4.6 : (g.type==="cross" ? 4.0 : 5.1);
      const dx=e.x-g.x, dy=e.y-(g.y-6), rr=eR+gr, d=Math.hypot(dx,dy)||0.001;
      if(d<rr){
        const nx=dx/d, ny=dy/d, push=rr-d; e.x+=nx*push; e.y+=ny*push;
        if(e.vx!==undefined){
          const into=e.vx*nx+e.vy*ny;
          if(into<0){ e.vx-=into*nx*1.15; e.vy-=into*ny*1.15; if(e.hp!==undefined && into<-95) damageCar(e,(-into-95)*0.08,g.x,g.y,"impact"); }
        }
      }
    }
  }
}
function pedEnterPlaza(p){ const A=node(p.pb[0],p.pb[1]);
  p.plaza={i:p.pb[0],j:p.pb[1],cx:A[0],cy:A[1],r:Math.max(30,plazaR(p.pb[0],p.pb[1])-16)};
  p.onGraph=false; p.plazaT=rand(5,12); p.repick=0; p._wait=false; p.cross=0; }
const LOT_CACHE_VER=19;
const FOREST_GRASS_VARIANTS=["clump_small","clump_med","clump_large","clump_dense","clump_tall","clump_wispy","clump_pine","clump_shade","clump_mossy","clump_dry","patch_moss","clump_fern","clump_needle"];
function getLot(i,j){
  const key=i+","+j+","+LOT_CACHE_VER; let lot=lotCache.get(key); if(lot) return lot;
  const biome=biomeOf(i,j), B=BIOMES[biome], r=lotRng(i,j), m=16, SW=(biome==="city"?6:28);
  // cell = quad between the 4 corner nodes; buildings sit in an inner rect set back from each bordering road
  const A=node(i,j), Bn=node(i+1,j), C=node(i+1,j+1), D=node(i,j+1);
  const eTop=getEdge(i,j,1,0), eBot=getEdge(i,j+1,1,0), eLeft=getEdge(i,j,0,1), eRight=getEdge(i+1,j,0,1);
  let left =Math.max(A[0],D[0])+eLeft.width/2 +SW+eLeft.bulge, right=Math.min(Bn[0],C[0])-eRight.width/2-SW-eRight.bulge;
  let top  =Math.max(A[1],Bn[1])+eTop.width/2 +SW+eTop.bulge,  bot  =Math.min(D[1],C[1])-eBot.width/2 -SW-eBot.bulge;
  const rbc=(ni,nj)=> isRoundabout(ni,nj)? roundaboutR(ni,nj)+16 : 0;        // push lots out of roundabout circles at their corners
  const cA=rbc(i,j), cB=rbc(i+1,j), cC=rbc(i+1,j+1), cD=rbc(i,j+1);
  if(cA||cD) left =Math.max(left,  A[0]+cA, D[0]+cD);
  if(cB||cC) right=Math.min(right, Bn[0]-cB, C[0]-cC);
  if(cA||cB) top  =Math.max(top,   A[1]+cA, Bn[1]+cB);
  if(cD||cC) bot  =Math.min(bot,   D[1]-cD, C[1]-cC);
  const lw=right-left, lh=bot-top;
  lot={i,j,x:left,y:top,w:lw,h:lh,poly:[A,Bn,C,D],biome,B,buildings:[],props:[],puddles:[],parked:[],stalls:null,water:false,empty:false,fences:[]}; lot._r=r;
  const tiny = lw<100||lh<100;
  const mega=megaAtCell(i,j);
  if(mega){ lot.mega=true; lot.empty=true; lot.zone="mega"; }
  else if(i===1 && j===2){ lot.salon=true; lot.empty=true; if(!tiny) buildSalonLot(lot); }
  else if(i===2 && j===1){ lot.gunshop=true; lot.empty=true; if(!tiny) buildGunShop(lot); }
  else if(i===2 && j===2){ lot.motodealer=true; lot.empty=true; if(!tiny) buildMotoDealer(lot); }
  else if(tiny){ lot.empty=true; }
  else if(isMountain(i,j)){ lot.mountain=true; lot.empty=true; const n=3+(r()*4|0); for(let k=0;k<n;k++) lot.props.push({x:left+18+r()*(lw-36), y:top+18+r()*(lh-36), s:14+r()*22, t:"rock"}); }
  else if(isWaterCell(i,j)){ lot.water=true;
    if(hsh(i,j,141)<0.20){ const nb=[[0,-1],[0,1],[-1,0],[1,0]].find(d=>!isWaterCell(i+d[0],j+d[1]));
      if(nb){ let bx,by;
        if(nb[0]===1){ bx=(Bn[0]+C[0])/2; by=(Bn[1]+C[1])/2; }
        else if(nb[0]===-1){ bx=(A[0]+D[0])/2; by=(A[1]+D[1])/2; }
        else if(nb[1]===1){ bx=(D[0]+C[0])/2; by=(D[1]+C[1])/2; }
        else { bx=(A[0]+Bn[0])/2; by=(A[1]+Bn[1])/2; }
        const into=[-nb[0],-nb[1]];                                      // direction from land toward water
        let wx=bx, wy=by;                                                // walk to the real waterline (rounded coast)
        if(inWater(wx,wy)){ for(let s=0;s<14 && inWater(wx,wy); s++){ wx-=into[0]*9; wy-=into[1]*9; } }
        else { for(let s=0;s<14 && !inWater(wx,wy); s++){ wx+=into[0]*9; wy+=into[1]*9; } }
        const baseX=wx-into[0]*14, baseY=wy-into[1]*14;                  // dock base sits on land
        let len=24; while(len<150 && inWater(baseX+into[0]*len, baseY+into[1]*len)) len+=12;  // extend over the water
        if(len>=44){ const marina=hsh(i,j,77)<0.42;
          lot.dock={x:baseX, y:baseY, ang:Math.atan2(into[1],into[0]), len, w: marina?26:15, kind: marina?"marina":"wood"}; } } }
  }
  else if(biome==="forest"){
    lot.empty=true; lot.zone="forest"; lot.forestType=forestType(i,j);
    lot.B.ground=FOREST_GROUND[lot.forestType]||lot.B.ground;
    genForestTrees(lot,r,i,j);
    lot.props.sort((u,v)=>u.y-v.y);
    if(r()<0.04) placeBuildings(lot,"outer",r,biome);
  }
  else {
    const zone = biome==="city" ? cityZone(i,j) : "outer";
    lot.zone = zone;
    const denseCore = biome==="city" && (zone==="downtown"||zone==="midrise");
    const cemOK = (zone==="suburb"||zone==="transition"||biome!=="city");
    if(cemOK && lw>150 && lh>150 && hsh(i,j,505)<0.06){ lot.cemetery=true; lot.empty=true; lot.zone="cemetery"; genCemetery(lot,r); }
    else if(!denseCore && biome==="city" && (zone==="midrise"||zone==="transition"||zone==="suburb") && lw>160 && lh>160 && hsh(i,j,617)<0.05){
      lot.church=true; const cw=Math.min(lw*0.86,230), ch=Math.min(lh*0.86,180);
      addBuilding(lot, left+lw/2-cw/2, top+lh/2-ch/2, cw, ch, r, "church"); }
    else if(!denseCore && biome==="city" && zone!=="suburb" && r()<0.03){ lot.parking=true; lot.empty=true; genParkingLot(lot,r); }
    else if(denseCore){
      // downtown / midrise core: only the big landmark (mega) buildings exist here.
      // cells not covered by a landmark stay as open plaza/greens (no small towers).
      lot.empty=true; const n=2+(r()*3|0);
      for(let k=0;k<n;k++){ const px=left+24+r()*Math.max(2,lw-48), py=top+24+r()*Math.max(2,lh-48), s=118+r()*68;
        lot.props.push(makeTree(px,py,s,r,r()<0.7?"deciduous":"oak",{city:true})); }
    }
    else {
      const builtChance = biome==="city" ? (zone==="suburb"?0.92:0.96) : B.density;
      if(r() < builtChance) placeBuildings(lot, zone, r, biome);
      if(!lot.buildings.length){ lot.empty=true; const n=2+(r()*4|0); for(let k=0;k<n;k++){ const px=left+20+r()*(lw-40), py=top+20+r()*(lh-40), s=B.prop==="tree"?(88+r()*62):(16+r()*12);
        lot.props.push(B.prop==="tree"?makeTree(px,py,s,r,null,{city:biome==="city"}):{x:px,y:py,s,t:B.prop}); } }
    }
  }
  const pn=(r()*2.2)|0; for(let k=0;k<pn;k++) lot.puddles.push({x:left+r()*lw, y:top+r()*lh, rx:8+r()*22, ry:5+r()*12});
  if(!lot.mega && !lot.water && !lot.mountain && !lot.parking && !lot.salon && !lot.gunshop) addCurbside(lot,i,j,r);
  if(biome==="city" && !lot.mega && !lot.water && !lot.mountain && !lot.parking && !lot.salon && !lot.gunshop && !lot.motodealer && !lot.cemetery) addStreetTrees(lot,i,j,r);
  if(!lot.mega && !lot.water && !lot.mountain) addLamps(lot,i,j,r);
  if(!lot.mega) addSignals(lot,i,j);
  if(lot.buildings.length) lot.buildings=lot.buildings.filter(b=>!inPlaza(b.x+b.w/2,b.y+b.h/2));
  // ---- surface detail (visual only; stable per lot) ----
  lot.tufts=[]; lot.flowers=[]; lot.ripples=[]; lot.pebbles=[];
  if(lot.water){
    for(let k=0;k<6;k++) lot.ripples.push({x:left+r()*lw, y:top+r()*lh, w:18+r()*42, ph:r()*6.28});
  } else if(lot.mountain){
    for(let k=0;k<10;k++) lot.pebbles.push({x:left+r()*lw, y:top+r()*lh, s:1.4+r()*3});
  } else if((lot.empty||lot.zone==="suburb") && !lot.salon && !lot.gunshop && !lot.water){
    if(biome==="desert"||biome==="sea"){
      for(let k=0;k<9;k++) lot.pebbles.push({x:left+r()*lw, y:top+r()*lh, s:1+r()*2.4});
      for(let k=0;k<5;k++) lot.ripples.push({x:left+r()*lw, y:top+r()*lh, w:34+r()*64, a:(r()-0.5)*1.2});
    } else {
      const dense=biome==="forest"; const nt=dense?(72+(r()*48|0)):(5+(r()*5|0));
      for(let k=0;k<nt;k++){
        const x=left+r()*lw, y=top+r()*lh, s=dense?(5+r()*9):(5+r()*4);
        lot.tufts.push(dense?{x,y,s,v:FOREST_GRASS_VARIANTS[(r()*FOREST_GRASS_VARIANTS.length)|0]}:{x,y,s});
      }
      if(dense||lot.zone==="forest"){
        lot.forestFloor=[];
        const nf=68+(r()*52|0);
        const kinds=["leaf","fern","moss","twig","shroom","needle","log","blade"];
        for(let k=0;k<nf;k++) lot.forestFloor.push({x:left+r()*lw,y:top+r()*lh,kind:kinds[(r()*kinds.length)|0],s:3+r()*11,rot:r()*6.28});
      }
      const nf=(r()*6|0); for(let k=0;k<nf;k++) lot.flowers.push({x:left+r()*lw, y:top+r()*lh, c:["#e8d24a","#e07a9a","#c95ad8","#f0f0f0","#e88a3a"][(r()*5)|0]});
    }
  }
  if(lot.zone==="suburb" && lot.buildings.length) addGardens(lot, r);
  lotCache.set(key,lot); return lot;
}
getLot(1,2);  // ensure dealership exists near spawn
getLot(2,1);  // ensure gun shop exists near spawn

