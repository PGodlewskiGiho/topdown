/* TOPDOWN CITY — 35-map.js */
/* GTA-style minimap/big map, fog of war, GPS navigation */

const MAP_DISC_R = 980;
const MAP_BLIPS = {
  player:"#f0f2f8", mission:"#ffd23b", pickup:"#39d98a", nav:"#b48cff",
  salon:"#5ab0ff", gunshop:"#ffcf6a", super:"#7fe0a8", cop:"#4f8bff",
};

let discovered = new Set();
let navTarget = null;
let navPath = [];
let navRecalcT = 0;
let bigMapOpen = false;
let bigMapPan = null;
let bigMapZoom = 0.42;
let bigMapDrag = null;

const bigMapEl = document.getElementById("bigmap");
const bigMapCv = document.getElementById("bigmap-cv");
const bigMapCtx = bigMapCv ? bigMapCv.getContext("2d") : null;

function mapCellKey(i,j){ return i+","+j; }
function mapIsDiscovered(i,j){ return discovered.has(mapCellKey(i,j)); }
function mapDiscoveredAt(wx,wy){
  const i=Math.floor((wx-ROAD)/GAP), j=Math.floor((wy-ROAD)/GAP);
  return mapIsDiscovered(i,j);
}

function seedMapDiscovery(x,y){
  const ci=Math.floor(x/GAP), cj=Math.floor(y/GAP);
  for(let i=ci-3;i<=ci+3;i++) for(let j=cj-3;j<=cj+3;j++) discovered.add(mapCellKey(i,j));
}

function updateMapDiscovery(){
  if(gamePhase!=="playing") return;
  const a=playerWorldPos();
  const ci=Math.floor(a.x/GAP), cj=Math.floor(a.y/GAP);
  const R=Math.ceil(MAP_DISC_R/GAP)+1;
  for(let i=ci-R;i<=ci+R;i++) for(let j=cj-R;j<=cj+R;j++){
    const cx=nX(i,j), cy=nY(i,j);
    if((cx-a.x)**2+(cy-a.y)**2 <= MAP_DISC_R*MAP_DISC_R) discovered.add(mapCellKey(i,j));
  }
}

function serializeDiscovery(){
  return Array.from(discovered);
}
function deserializeDiscovery(arr){
  discovered=new Set();
  if(Array.isArray(arr)) for(const k of arr) discovered.add(k);
}

function playerWorldPos(){
  if(mode==="car") return {x:car.x,y:car.y,a:car.a};
  if(mode==="foot") return {x:ped.x,y:ped.y,a:ped.a};
  if(mode==="boat"&&pboat) return {x:pboat.x,y:pboat.y,a:pboat.a};
  return {x:focusX,y:focusY,a:0};
}

function playerHeading(){
  const p=playerWorldPos();
  return p.a||0;
}

function nearestNavNode(x,y){
  const ci=Math.round(x/GAP), cj=Math.round(y/GAP);
  let best=null, bd=1e18;
  for(let di=-4;di<=4;di++) for(let dj=-4;dj<=4;dj++){
    const i=ci+di, j=cj+dj;
    if(nodeDegree(i,j)<1) continue;
    const nx=nX(i,j), ny=nY(i,j), d=(nx-x)**2+(ny-y)**2;
    if(d<bd){ bd=d; best=[i,j]; }
  }
  return best;
}

function navHeuristic(a,b){
  return Math.hypot(nX(a[0],a[1])-nX(b[0],b[1]), nY(a[0],a[1])-nY(b[0],b[1]));
}

function findNavRoadPath(sx,sy,tx,ty){
  const start=nearestNavNode(sx,sy), goal=nearestNavNode(tx,ty);
  if(!start||!goal) return [];
  const sk=start[0]+","+start[1], gk=goal[0]+","+goal[1];
  if(sk===gk) return [start];

  const open=new Map([[sk,start]]);
  const gScore=new Map([[sk,0]]);
  const came=new Map();
  const closed=new Set();
  let guard=0;

  while(open.size && guard++<14000){
    let curK=null, curN=null, bestF=1e18;
    for(const [k,n] of open){
      const f=(gScore.get(k)||0)+navHeuristic(n,goal);
      if(f<bestF){ bestF=f; curK=k; curN=n; }
    }
    if(!curN) break;
    open.delete(curK);
    if(curK===gk){
      const path=[curN];
      let k=curK;
      while(came.has(k)){ const p=came.get(k); path.unshift(p); k=p[0]+","+p[1]; }
      return path;
    }
    closed.add(curK);
    const cg=gScore.get(curK)||0;
    for(const nb of neighbors(curN[0],curN[1])){
      const nk=nb[0]+","+nb[1];
      if(closed.has(nk)) continue;
      const tg=cg+navHeuristic(curN,nb);
      if(tg>=(gScore.get(nk)||1e18)) continue;
      came.set(nk,curN);
      gScore.set(nk,tg);
      open.set(nk,nb);
    }
  }
  return [start,goal];
}

function navPathToWorld(nodes){
  if(!nodes||nodes.length<2) return nodes&&nodes.length?[[nX(nodes[0][0],nodes[0][1]),nY(nodes[0][0],nodes[0][1])]]:[];
  const pts=[];
  for(let k=0;k<nodes.length-1;k++){
    const a=nodes[k], b=nodes[k+1];
    const g=edgeGeom(a[0],a[1],b[0]-a[0],b[1]-a[1]);
    const steps=Math.max(4, Math.ceil(g.e.len/42));
    for(let s=0;s<=steps;s++){
      const t=s/steps;
      pts.push(bez(g.p0,g.cp,g.p1,t));
    }
  }
  return pts;
}

function recomputeNavPath(force){
  if(!navTarget) { navPath=[]; return; }
  navRecalcT-=0.016;
  if(!force && navRecalcT>0) return;
  navRecalcT=1.8;
  const p=playerWorldPos();
  const nodes=findNavRoadPath(p.x,p.y,navTarget.x,navTarget.y);
  navPath=navPathToWorld(nodes);
  if(navPath.length) navPath.push([navTarget.x,navTarget.y]);
}

function setNavTarget(x,y, silent){
  if(!mapDiscoveredAt(x,y)) { if(!silent) showBigMsg("NIEODKRYTY TEREN"); return; }
  navTarget={x,y};
  recomputeNavPath(true);
  if(!silent) showBigMsg("NAWIGACJA");
}
function clearNavTarget(){ navTarget=null; navPath=[]; }

function mapLotFill(L){
  if(L.water) return "#163d5c";
  if(L.mountain) return "#3a3834";
  if(L.mega) return "#4a4e56";
  if(L.empty) return L.B.ground;
  return L.B.walk;
}

function mapDrawTerrain(mctx, opts){
  const {tx,ty,i0,i1,j0,j1,scale, fog, rotate, cxw, cyw, w2} = opts;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(fog && !mapIsDiscovered(i,j)) continue;
    const L=getLot(i,j);
    mctx.fillStyle=mapLotFill(L);
    const p=L.poly;
    mctx.beginPath();
    mctx.moveTo(tx(p[0][0]),ty(p[0][1]));
    mctx.lineTo(tx(p[1][0]),ty(p[1][1]));
    mctx.lineTo(tx(p[2][0]),ty(p[2][1]));
    mctx.lineTo(tx(p[3][0]),ty(p[3][1]));
    mctx.closePath();
    mctx.fill();
  }
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(fog && !mapIsDiscovered(i,j)) continue;
    const L=getLot(i,j);
    for(const b of L.buildings){
      mctx.fillStyle=b.type==="tower"?"#5a6674":"#2a2e36";
      mctx.fillRect(tx(b.x),ty(b.y),Math.max(1,b.w*scale),Math.max(1,b.h*scale));
    }
  }
}

function mapDrawRoads(mctx, opts){
  const {tx,ty,i0,i1,j0,j1,scale} = opts;
  mctx.lineCap="round";
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(opts.fog && !mapIsDiscovered(i,j)) continue;
    const A=node(i,j);
    for(const[di,dj]of[[1,0],[0,1]]){
      const jj=j+dj, ii=i+di;
      if(opts.fog && !mapIsDiscovered(ii,jj)) continue;
      const e=getEdge(i,j,di,dj); if(!e.exists) continue;
      const B=node(ii,jj);
      mctx.strokeStyle=e.hwy?"#d8dce6":"#aeb4c0";
      mctx.lineWidth=Math.max(1.1,e.width*scale*(e.hwy?1.05:0.85));
      mctx.beginPath();
      mctx.moveTo(tx(A[0]),ty(A[1]));
      mctx.quadraticCurveTo(tx(e.cp[0]),ty(e.cp[1]),tx(B[0]),ty(B[1]));
      mctx.stroke();
    }
    if(isRoundabout(i,j) && (!opts.fog||mapIsDiscovered(i,j))){
      mctx.fillStyle="#6a6e78";
      mctx.beginPath();
      mctx.arc(tx(A[0]),ty(A[1]),roundaboutR(i,j)*scale,0,7);
      mctx.fill();
    }
  }
}

function mapDrawBlip(mctx,x,y,r,col,shape){
  mctx.fillStyle=col;
  if(shape==="square") mctx.fillRect(x-r,y-r,r*2,r*2);
  else if(shape==="diamond"){ mctx.beginPath(); mctx.moveTo(x,y-r); mctx.lineTo(x+r,y); mctx.lineTo(x,y+r); mctx.lineTo(x-r,y); mctx.closePath(); mctx.fill(); }
  else { mctx.beginPath(); mctx.arc(x,y,r,0,7); mctx.fill(); }
  mctx.strokeStyle="rgba(0,0,0,.55)"; mctx.lineWidth=1;
  if(shape==="square") mctx.strokeRect(x-r,y-r,r*2,r*2);
  else if(shape==="diamond"){ mctx.beginPath(); mctx.moveTo(x,y-r); mctx.lineTo(x+r,y); mctx.lineTo(x,y+r); mctx.lineTo(x-r,y); mctx.closePath(); mctx.stroke(); }
  else { mctx.beginPath(); mctx.arc(x,y,r,0,7); mctx.stroke(); }
}

function mapDrawBlips(mctx, tx, ty, showPlayer){
  const _t = mission ? ((mission.type==="deliver"||mission.type==="taxi")?mission.target:null) : pickup;
  if(_t) mapDrawBlip(mctx,tx(_t.x),ty(_t.y),3.6, mission?MAP_BLIPS.mission:MAP_BLIPS.pickup,"diamond");
  if(navTarget) mapDrawBlip(mctx,tx(navTarget.x),ty(navTarget.y),4.2,MAP_BLIPS.nav,"square");
  if(salon) mapDrawBlip(mctx,tx(salon.cx),ty(salon.cy),2.8,MAP_BLIPS.salon);
  if(gunshop) mapDrawBlip(mctx,tx(gunshop.cx),ty(gunshop.cy),2.8,MAP_BLIPS.gunshop);
  if(typeof supermarkets!=="undefined"){
    for(const s of supermarkets){
      if(!s.b) continue;
      mapDrawBlip(mctx,tx(s.cx),ty(s.cy),2.6,MAP_BLIPS.super);
    }
  }
  if(showPlayer){
    const p=playerWorldPos();
    mctx.save();
    mctx.translate(tx(p.x),ty(p.y));
    if(showPlayer!=="fixed") mctx.rotate(p.a);
    mctx.fillStyle=MAP_BLIPS.player;
    mctx.beginPath();
    mctx.moveTo(0,-7); mctx.lineTo(5,6); mctx.lineTo(0,3); mctx.lineTo(-5,6);
    mctx.closePath();
    mctx.fill();
    mctx.strokeStyle="rgba(0,0,0,.65)"; mctx.lineWidth=1.1; mctx.stroke();
    mctx.restore();
  }
}

function mapDrawRoute(mctx, tx, ty, width){
  if(!navPath||navPath.length<2) return;
  mctx.strokeStyle="rgba(180,140,255,.92)";
  mctx.lineWidth=width||3.2;
  mctx.lineJoin="round";
  mctx.setLineDash([7,5]);
  mctx.beginPath();
  mctx.moveTo(tx(navPath[0][0]),ty(navPath[0][1]));
  for(let k=1;k<navPath.length;k++) mctx.lineTo(tx(navPath[k][0]),ty(navPath[k][1]));
  mctx.stroke();
  mctx.setLineDash([]);
}

function mapDrawFogOverlay(mctx, i0,i1,j0,j1, tx,ty){
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(mapIsDiscovered(i,j)) continue;
    const L=getLot(i,j), p=L.poly;
    mctx.fillStyle="rgba(5,7,11,.94)";
    mctx.beginPath();
    mctx.moveTo(tx(p[0][0]),ty(p[0][1]));
    mctx.lineTo(tx(p[1][0]),ty(p[1][1]));
    mctx.lineTo(tx(p[2][0]),ty(p[2][1]));
    mctx.lineTo(tx(p[3][0]),ty(p[3][1]));
    mctx.closePath();
    mctx.fill();
  }
  mctx.fillStyle="rgba(180,140,255,.08)"; mctx.font="bold 9px monospace"; mctx.textAlign="center";
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(mapIsDiscovered(i,j)) continue;
    const cx=tx(nX(i,j)), cy=ty(nY(i,j));
    if(cx<-40||cy<-40||cx>4000||cy>4000) continue;
    mctx.fillText("?", cx, cy+3);
  }
}

function drawNavRouteWorld(ox,oy){
  if(!navPath||navPath.length<2) return;
  const p=playerWorldPos();
  let startIdx=0, bd=1e18;
  for(let k=0;k<navPath.length;k++){
    const d=(navPath[k][0]-p.x)**2+(navPath[k][1]-p.y)**2;
    if(d<bd){ bd=d; startIdx=k; }
  }
  ctx.save();
  ctx.strokeStyle="rgba(180,140,255,.88)";
  ctx.lineWidth=4.5;
  ctx.lineJoin="round";
  ctx.setLineDash([12,8]);
  ctx.beginPath();
  ctx.moveTo(navPath[startIdx][0],navPath[startIdx][1]);
  for(let k=startIdx+1;k<navPath.length;k++) ctx.lineTo(navPath[k][0],navPath[k][1]);
  ctx.stroke();
  ctx.setLineDash([]);
  if(navTarget){
    ctx.fillStyle="rgba(180,140,255,.25)";
    ctx.beginPath(); ctx.arc(navTarget.x,navTarget.y,28,0,7); ctx.fill();
    ctx.strokeStyle="#b48cff"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(navTarget.x,navTarget.y,10+3*Math.abs(Math.sin(performance.now()/280)),0,7); ctx.stroke();
  }
  ctx.restore();
}

function resizeBigMap(){
  if(!bigMapCv||!bigMapEl) return;
  const r=bigMapEl.getBoundingClientRect();
  bigMapCv.width=Math.ceil(r.width*DPR);
  bigMapCv.height=Math.ceil(r.height*DPR);
  bigMapCv.style.width=r.width+"px";
  bigMapCv.style.height=r.height+"px";
}

function drawBigMap(){
  if(!bigMapOpen||!bigMapCtx||!bigMapCv) return;
  resizeBigMap();
  const W=bigMapCv.width/DPR, H=bigMapCv.height/DPR;
  const bctx=bigMapCtx;
  bctx.setTransform(DPR,0,0,DPR,0,0);
  bctx.clearRect(0,0,W,H);
  bctx.fillStyle="#080a0f";
  bctx.fillRect(0,0,W,H);

  const p=playerWorldPos();
  const cxw=bigMapPan?bigMapPan.x:p.x, cyw=bigMapPan?bigMapPan.y:p.y;
  const MS=bigMapZoom, w2=W/2;
  const tx=wx=>w2+(wx-cxw)*MS, ty=wy=>w2+(wy-cyw)*MS;
  const span=Math.max(W,H)/MS;
  const i0=Math.floor((cxw-span/2-GAP)/GAP)-1, i1=Math.floor((cxw+span/2)/GAP)+1;
  const j0=Math.floor((cyw-span/2-GAP)/GAP)-1, j1=Math.floor((cyw+span/2)/GAP)+1;
  const opts={tx,ty,i0,i1,j0,j1,scale:MS,fog:true,cxw,cyw,w2};

  mapDrawTerrain(bctx,opts);
  mapDrawRoads(bctx,opts);
  mapDrawRoute(bctx,tx,ty,4);
  mapDrawBlips(bctx,tx,ty,"fixed");
  mapDrawFogOverlay(bctx,i0,i1,j0,j1,tx,ty);

  bctx.strokeStyle="rgba(255,255,255,.08)"; bctx.lineWidth=1;
  bctx.strokeRect(0.5,0.5,W-1,H-1);
  bctx.fillStyle="rgba(255,255,255,.75)"; bctx.font="bold 10px monospace"; bctx.textAlign="left";
  bctx.fillText("N", 12, 18);
  if(navTarget){
    const d=Math.hypot(navTarget.x-p.x,navTarget.y-p.y);
    bctx.fillStyle="rgba(180,140,255,.9)"; bctx.textAlign="right";
    bctx.fillText(`CEL · ${(d/100|0)*100} m`, W-14, H-14);
  }
}

function toggleBigMap(force){
  if(typeof gamePhase==="undefined"||gamePhase!=="playing") return;
  if(typeof invOpen!=="undefined"&&invOpen) return;
  bigMapOpen = force===undefined ? !bigMapOpen : !!force;
  if(!bigMapEl) return;
  bigMapEl.classList.toggle("hidden", !bigMapOpen);
  document.body.classList.toggle("map-open", bigMapOpen);
  if(bigMapOpen){ bigMapPan=null; resizeBigMap(); drawBigMap(); }
}

function bigMapEventToWorld(ev){
  const r=bigMapCv.getBoundingClientRect();
  const sx=(ev.clientX-r.left), sy=(ev.clientY-r.top);
  const W=r.width, H=r.height;
  const p=playerWorldPos();
  const cxw=bigMapPan?bigMapPan.x:p.x, cyw=bigMapPan?bigMapPan.y:p.y;
  const MS=bigMapZoom;
  return {x:cxw+(sx-W/2)/MS, y:cyw+(sy-H/2)/MS, sx, sy};
}

function initBigMapEvents(){
  if(!bigMapCv) return;
  bigMapCv.addEventListener("mousedown", ev=>{
    if(!bigMapOpen) return;
    if(ev.button===2){ clearNavTarget(); drawBigMap(); ev.preventDefault(); return; }
    bigMapDrag={x:ev.clientX,y:ev.clientY,panX:bigMapPan?bigMapPan.x:playerWorldPos().x,panY:bigMapPan?bigMapPan.y:playerWorldPos().y};
  });
  window.addEventListener("mousemove", ev=>{
    if(!bigMapDrag||!bigMapOpen) return;
    const dx=ev.clientX-bigMapDrag.x, dy=ev.clientY-bigMapDrag.y;
    if(Math.hypot(dx,dy)<4) return;
    bigMapPan={x:bigMapDrag.panX-dx/bigMapZoom, y:bigMapDrag.panY-dy/bigMapZoom};
    drawBigMap();
  });
  window.addEventListener("mouseup", ev=>{
    if(!bigMapDrag||!bigMapOpen) return;
    const dx=ev.clientX-bigMapDrag.x, dy=ev.clientY-bigMapDrag.y;
    bigMapDrag=null;
    if(Math.hypot(dx,dy)<5 && ev.button===0){
      const w=bigMapEventToWorld(ev);
      if(mapDiscoveredAt(w.x,w.y)) setNavTarget(w.x,w.y);
      else showBigMsg("NIEODKRYTY TEREN");
      drawBigMap();
    }
  });
  bigMapCv.addEventListener("contextmenu", ev=>ev.preventDefault());
  bigMapCv.addEventListener("wheel", ev=>{
    if(!bigMapOpen) return;
    ev.preventDefault();
    bigMapZoom=clamp(bigMapZoom*(ev.deltaY<0?1.12:1/1.12), 0.12, 1.6);
    drawBigMap();
  }, {passive:false});
  const btnCenter=document.getElementById("bigmap-center");
  const btnClear=document.getElementById("bigmap-clear");
  if(btnCenter) btnCenter.addEventListener("click", ()=>{ bigMapPan=null; drawBigMap(); });
  if(btnClear) btnClear.addEventListener("click", ()=>{ clearNavTarget(); drawBigMap(); });
}

function updateMap(dt){
  updateMapDiscovery();
  if(navTarget) recomputeNavPath(false);
  if(bigMapOpen) drawBigMap();
}

initBigMapEvents();
