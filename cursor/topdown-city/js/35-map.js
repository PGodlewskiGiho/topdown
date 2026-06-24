/* TOPDOWN CITY — 35-map.js */
/* GTA-style minimap/big map, fog of war, GPS navigation */

const MAP_DISC_R = 980;
const MAP_BLIPS = {
  player:"#f0f2f8", mission:"#ffd23b", pickup:"#39d98a", nav:"#b48cff",
  salon:"#5ab0ff", gunshop:"#ffcf6a", super:"#7fe0a8", cop:"#4f8bff",
  drift:"#ff7a38", laps:"#5ae0ff", sprint:"#7fe0a8",
};

let discovered = new Set();
let navTarget = null;
let navPath = [];
let navRecalcT = 0;
let bigMapOpen = false;
let bigMapPan = null;
let bigMapZoom = 0.42;
let bigMapDrag = null;
let pauseMapSpan = 4800;
const PAUSE_MAP_SPAN_MIN = 2200;
const PAUSE_MAP_SPAN_MAX = 9200;
const MINI_MAP_SPAN = 1500;

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

function navNodeKey(i,j){ return i+","+j; }

function nearestNavNode(x,y, gx, gy){
  const ci=Math.round(x/GAP), cj=Math.round(y/GAP);
  let best=null, bd=1e18;
  const toGoal=gx!=null?Math.atan2(gy-y,gx-x):null;
  for(let di=-6;di<=6;di++) for(let dj=-6;dj<=6;dj++){
    const i=ci+di, j=cj+dj;
    if(nodeDegree(i,j)<1) continue;
    const nx=nX(i,j), ny=nY(i,j);
    let d=(nx-x)**2+(ny-y)**2;
    if(toGoal!=null){
      const na=Math.atan2(ny-y,nx-x);
      let ad=Math.abs(Math.atan2(Math.sin(na-toGoal),Math.cos(na-toGoal)));
      d*=1+ad*1.6;
    }
    if(d<bd){ bd=d; best=[i,j]; }
  }
  return best;
}

function navNodesAdjacent(a,b){
  const di=b[0]-a[0], dj=b[1]-a[1];
  return Math.abs(di)+Math.abs(dj)===1 && getEdge(a[0],a[1],di,dj).exists;
}

function navEdgeLen(ai,aj,bi,bj){
  const di=bi-ai, dj=bj-aj;
  if(Math.abs(di)+Math.abs(dj)!==1) return 1e18;
  const e=getEdge(ai,aj,di,dj);
  if(!e.exists) return 1e18;
  const g=edgeGeom(ai,aj,bi,bj);
  let len=0, prev=g.p0;
  const steps=Math.max(8, Math.ceil((e.len||GAP)/26));
  for(let s=1;s<=steps;s++){
    const p=bez(g.p0,g.cp,g.p1,s/steps);
    len+=Math.hypot(p[0]-prev[0], p[1]-prev[1]);
    prev=p;
  }
  return len;
}

function navHeuristicToGoal(i,j,gi,gj){
  return Math.hypot(nX(i,j)-nX(gi,gj), nY(i,j)-nY(gj,gj));
}

function navHeuristic(a,b){
  return navHeuristicToGoal(a[0],a[1],b[0],b[1]);
}

function simplifyNavNodes(nodes){
  if(!nodes||nodes.length<=2) return nodes||[];
  const out=[nodes[0]];
  for(let i=1;i<nodes.length-1;i++){
    const a=out[out.length-1], b=nodes[i], c=nodes[i+1];
    const d1x=b[0]-a[0], d1y=b[1]-a[1], d2x=c[0]-b[0], d2y=c[1]-b[1];
    if(d1x===d2x && d1y===d2y) continue;
    out.push(b);
  }
  out.push(nodes[nodes.length-1]);
  return out;
}

function findNavRoadPath(sx,sy,tx,ty){
  const start=nearestNavNode(sx,sy,tx,ty), goal=nearestNavNode(tx,ty,sx,sy);
  if(!start||!goal) return [];
  const sk=navNodeKey(start[0],start[1]), gk=navNodeKey(goal[0],goal[1]);
  if(sk===gk) return [start];

  const open=[], gScore=new Map([[sk,0]]), came=new Map(), closed=new Set();
  const push=(f,g,n,from)=>{
    open.push({f,g,n,from});
    let i=open.length-1;
    while(i>0){
      const p=(i-1)>>1;
      if(open[p].f<=open[i].f) break;
      const t=open[p]; open[p]=open[i]; open[i]=t;
      i=p;
    }
  };
  const pop=()=>{
    if(!open.length) return null;
    const top=open[0], end=open.pop();
    if(open.length){
      open[0]=end;
      let i=0;
      for(;;){
        let s=i, l=i*2+1, r=l+1;
        if(l<open.length && open[l].f<open[s].f) s=l;
        if(r<open.length && open[r].f<open[s].f) s=r;
        if(s===i) break;
        const t=open[i]; open[i]=open[s]; open[s]=t;
        i=s;
      }
    }
    return top;
  };

  push(navHeuristicToGoal(start[0],start[1],goal[0],goal[1]), 0, start, null);
  let guard=0;

  while(open.length && guard++<32000){
    const cur=pop();
    if(!cur) break;
    const ck=navNodeKey(cur.n[0],cur.n[1]);
    if(closed.has(ck)) continue;
    closed.add(ck);
    if(ck===gk){
      const path=[cur.n];
      let k=ck;
      while(came.has(k)){ const p=came.get(k); path.unshift(p); k=navNodeKey(p[0],p[1]); }
      return simplifyNavNodes(path);
    }
    const from=came.get(ck);
    let fromDir=null;
    if(from) fromDir=[cur.n[0]-from[0], cur.n[1]-from[1]];
    const nbs=neighbors(cur.n[0],cur.n[1]);
    nbs.sort((a,b)=>{
      const ha=navHeuristicToGoal(a[0],a[1],goal[0],goal[1]);
      const hb=navHeuristicToGoal(b[0],b[1],goal[0],goal[1]);
      if(Math.abs(ha-hb)>0.5) return ha-hb;
      if(fromDir){
        const sa=(a[0]-cur.n[0]===fromDir[0]&&a[1]-cur.n[1]===fromDir[1])?0:1;
        const sb=(b[0]-cur.n[0]===fromDir[0]&&b[1]-cur.n[1]===fromDir[1])?0:1;
        if(sa!==sb) return sa-sb;
      }
      return 0;
    });
    for(const nb of nbs){
      const nk=navNodeKey(nb[0],nb[1]);
      if(closed.has(nk)) continue;
      const edge=navEdgeLen(cur.n[0],cur.n[1],nb[0],nb[1]);
      if(edge>=1e17) continue;
      const tg=cur.g+edge;
      if(tg>=(gScore.get(nk)||1e18)) continue;
      came.set(nk,cur.n);
      gScore.set(nk,tg);
      push(tg+navHeuristicToGoal(nb[0],nb[1],goal[0],goal[1]), tg, nb, cur.n);
    }
  }
  return [];
}

function navPathToWorld(nodes){
  if(!nodes||!nodes.length) return [];
  if(nodes.length===1) return [[nX(nodes[0][0],nodes[0][1]), nY(nodes[0][0],nodes[0][1])]];
  const pts=[];
  for(let k=0;k<nodes.length-1;k++){
    const a=nodes[k], b=nodes[k+1];
    if(!navNodesAdjacent(a,b)) continue;
    const di=b[0]-a[0], dj=b[1]-a[1];
    const e=getEdge(a[0],a[1],di,dj);
    const g=edgeGeom(a[0],a[1],di,dj);
    const steps=Math.max(5, Math.ceil((e.len||GAP)/34));
    const s0=pts.length?1:0;
    for(let s=s0;s<=steps;s++){
      pts.push(bez(g.p0,g.cp,g.p1,s/steps));
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
  if(!navPath.length){
    if(force && typeof showBigMsg==="function") showBigMsg("BRAK DROGI DO CELU");
    return;
  }
  const first=navPath[0];
  if(Math.hypot(first[0]-p.x,first[1]-p.y)>20) navPath.unshift([p.x,p.y]);
  const last=navPath[navPath.length-1];
  if(Math.hypot(last[0]-navTarget.x,last[1]-navTarget.y)>12) navPath.push([navTarget.x,navTarget.y]);
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
  const idx=navRouteStartIndex();
  const end=Math.min(navPath.length, idx+22);
  mctx.strokeStyle="rgba(180,140,255,.88)";
  mctx.lineWidth=width||3.2;
  mctx.lineJoin="round";
  mctx.setLineDash([6,5]);
  mctx.beginPath();
  mctx.moveTo(tx(navPath[idx][0]),ty(navPath[idx][1]));
  for(let k=idx+1;k<end;k++) mctx.lineTo(tx(navPath[k][0]),ty(navPath[k][1]));
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

function navRouteStartIndex(){
  if(!navPath||navPath.length<2) return 0;
  const p=playerWorldPos();
  const hd=Math.cos(p.a), hs=Math.sin(p.a);
  let best=0, bestScore=-1e18;
  for(let k=0;k<navPath.length;k++){
    const dx=navPath[k][0]-p.x, dy=navPath[k][1]-p.y;
    const ahead=dx*hd+dy*hs;
    const d=Math.hypot(dx,dy);
    const score=ahead*2.2-d*0.04;
    if(score>bestScore){ bestScore=score; best=k; }
  }
  if(best<navPath.length-1){
    const nx=navPath[best+1][0]-p.x, ny=navPath[best+1][1]-p.y;
    if(Math.hypot(nx,ny)<34) best++;
  }
  return best;
}

function drawNavMiniArrow(bctx,W,H){
  if(!navPath||navPath.length<2) return;
  const idx=navRouteStartIndex();
  if(idx>=navPath.length) return;
  const p=playerWorldPos(), wp=navPath[idx];
  const ang=Math.atan2(wp[1]-p.y,wp[0]-p.x)-playerHeading();
  const w2=W/2;
  bctx.save();
  bctx.translate(w2,w2-22);
  bctx.rotate(ang);
  bctx.fillStyle="#b48cff";
  bctx.beginPath();
  bctx.moveTo(0,-9); bctx.lineTo(6.5,7); bctx.lineTo(0,3.5); bctx.lineTo(-6.5,7);
  bctx.closePath(); bctx.fill();
  bctx.strokeStyle="rgba(0,0,0,.55)"; bctx.lineWidth=1; bctx.stroke();
  bctx.restore();
}

function drawNavRouteWorld(ox,oy){
  if(!navPath||navPath.length<2) return;
  const p=playerWorldPos();
  const startIdx=navRouteStartIndex();
  const endIdx=Math.min(navPath.length, startIdx+28);
  ctx.save();
  ctx.strokeStyle="rgba(180,140,255,.82)";
  ctx.lineWidth=3.8;
  ctx.lineJoin="round";
  ctx.setLineDash([10,7]);
  ctx.beginPath();
  ctx.moveTo(p.x,p.y);
  for(let k=startIdx;k<endIdx;k++) ctx.lineTo(navPath[k][0],navPath[k][1]);
  ctx.stroke();
  ctx.setLineDash([]);
  const wp=navPath[Math.min(startIdx,endIdx-1)];
  if(wp){
    const ang=Math.atan2(wp[1]-p.y,wp[0]-p.x);
    ctx.save();
    ctx.translate(wp[0],wp[1]); ctx.rotate(ang);
    ctx.fillStyle="#b48cff";
    ctx.beginPath(); ctx.moveTo(0,-11); ctx.lineTo(8,9); ctx.lineTo(0,5); ctx.lineTo(-8,9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.45)"; ctx.lineWidth=1.2; ctx.stroke();
    ctx.restore();
  }
  if(navTarget){
    ctx.fillStyle="rgba(180,140,255,.18)";
    ctx.beginPath(); ctx.arc(navTarget.x,navTarget.y,22,0,7); ctx.fill();
    ctx.strokeStyle="#b48cff"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(navTarget.x,navTarget.y,8+2*Math.abs(Math.sin(performance.now()/300)),0,7); ctx.stroke();
  }
  ctx.restore();
}

function rotatingMapScale(W,H,span){ return Math.min(W,H)/span; }

function rotatingMapScreenToWorld(sx,sy,W,H,cxw,cyw,span){
  const MS=rotatingMapScale(W,H,span);
  const w2=W/2, h2=H/2;
  const heading=playerHeading();
  const lx=sx-w2, ly=sy-h2;
  const c=Math.cos(heading), s=Math.sin(heading);
  const rx=lx*c-ly*s, ry=lx*s+ly*c;
  return {x:cxw+rx/MS, y:cyw+ry/MS, sx, sy};
}

function rotatingMapPanByDrag(panX,panY,dx,dy,W,H,span){
  const MS=rotatingMapScale(W,H,span);
  const heading=playerHeading();
  const c=Math.cos(heading), s=Math.sin(heading);
  return {
    x:panX-(dx*c+dy*s)/MS,
    y:panY-(dx*s-dy*c)/MS,
  };
}

function renderRotatingMap(bctx,W,H,opts){
  const cxw=opts.cxw!=null?opts.cxw:playerWorldPos().x;
  const cyw=opts.cyw!=null?opts.cyw:playerWorldPos().y;
  const span=opts.span||MINI_MAP_SPAN;
  const MS=rotatingMapScale(W,H,span);
  const w2=W/2, h2=H/2;
  const heading=opts.heading!=null?opts.heading:playerHeading();

  bctx.save();
  if(opts.clipRound!=null){
    bctx.beginPath(); bctx.roundRect(0,0,W,H,opts.clipRound); bctx.clip();
  }

  bctx.fillStyle="#0a0c12";
  bctx.fillRect(0,0,W,H);

  const tx0=wx=>(wx-cxw)*MS, ty0=wy=>(wy-cyw)*MS;

  bctx.save();
  bctx.translate(w2,h2);
  bctx.rotate(-heading);
  const tx=wx=>tx0(wx), ty=wy=>ty0(wy);

  const viewSpan=span;
  const i0=Math.floor((cxw-viewSpan/2-GAP)/GAP)-1, i1=Math.floor((cxw+viewSpan/2)/GAP)+1;
  const j0=Math.floor((cyw-viewSpan/2-GAP)/GAP)-1, j1=Math.floor((cyw+viewSpan/2)/GAP)+1;
  const mapOpts={tx,ty,i0,i1,j0,j1,scale:MS,fog:!!opts.fog,cxw,cyw,w2,routeWidth:opts.routeWidth||2.8,showPlayer:false};
  Game.drawMap(bctx, mapOpts);

  if(opts.wantedSearch && typeof stars!=="undefined" && stars>0 && typeof wantedPhase!=="undefined" && wantedPhase==="search" && typeof lkValid!=="undefined" && lkValid){
    const rad=(typeof searchRadius==="function"?searchRadius():220)*MS;
    const mx=tx0(lkX), my=ty0(lkY);
    bctx.strokeStyle="rgba(255,90,70,0.55)"; bctx.lineWidth=1.6; bctx.setLineDash([4,3]);
    bctx.beginPath(); bctx.arc(mx,my,rad,0,7); bctx.stroke();
    bctx.setLineDash([]);
    bctx.fillStyle="rgba(255,90,70,0.18)"; bctx.beginPath(); bctx.arc(mx,my,3.5,0,7); bctx.fill();
  }

  bctx.restore();

  if(opts.showPlayer!==false){
    bctx.save();
    bctx.translate(w2,h2);
    bctx.fillStyle=MAP_BLIPS.player;
    bctx.beginPath();
    bctx.moveTo(0,-7); bctx.lineTo(5,6); bctx.lineTo(0,3); bctx.lineTo(-5,6);
    bctx.closePath(); bctx.fill();
    bctx.strokeStyle="rgba(0,0,0,.7)"; bctx.lineWidth=1.2; bctx.stroke();
    bctx.restore();
    if(navPath&&navPath.length>1) drawNavMiniArrow(bctx,W,H);
  }

  bctx.fillStyle="rgba(255,255,255,.82)";
  bctx.font=`bold ${opts.nFont||9}px monospace`;
  bctx.textAlign="center";
  bctx.fillText("N", w2, opts.nFont?14:11);

  if(opts.border!==false){
    bctx.strokeStyle="rgba(255,255,255,.22)"; bctx.lineWidth=2;
    bctx.beginPath(); bctx.roundRect(1,1,W-2,H-2,opts.clipRound!=null?Math.max(4,opts.clipRound-1):6); bctx.stroke();
    bctx.strokeStyle="rgba(0,0,0,.45)"; bctx.lineWidth=1;
    bctx.beginPath(); bctx.roundRect(2.5,2.5,W-5,H-5,opts.clipRound!=null?Math.max(3,opts.clipRound-2):5); bctx.stroke();
  }

  bctx.restore();
}

function drawPauseMap(){
  const tgt=mapViewTarget();
  if(!tgt||!tgt.ctx||!tgt.cv) return;
  resizeBigMap();
  const W=tgt.cv.width/DPR, H=tgt.cv.height/DPR;
  const bctx=tgt.ctx;
  bctx.setTransform(DPR,0,0,DPR,0,0);
  bctx.clearRect(0,0,W,H);

  const p=playerWorldPos();
  const cxw=bigMapPan?bigMapPan.x:p.x, cyw=bigMapPan?bigMapPan.y:p.y;
  renderRotatingMap(bctx,W,H,{
    cxw,cyw,
    span:pauseMapSpan,
    fog:true,
    routeWidth:3.2,
    clipRound:12,
    wantedSearch:true,
    nFont:11,
    showPlayer:true,
  });

  if(navTarget){
    const d=Math.hypot(navTarget.x-p.x,navTarget.y-p.y);
    bctx.fillStyle="rgba(180,140,255,.92)";
    bctx.font="bold 11px monospace";
    bctx.textAlign="right";
    bctx.fillText(`CEL · ${(d/100|0)*100} m`, W-14, H-14);
  }
}

function resetPauseMapView(){
  bigMapPan=null;
  pauseMapSpan=4800;
}

function resizeBigMap(){
  const tgt=typeof mapViewTarget==="function"?mapViewTarget():null;
  if(!tgt||!tgt.cv||!tgt.el) return;
  const r=tgt.el.getBoundingClientRect();
  tgt.cv.width=Math.ceil(r.width*DPR);
  tgt.cv.height=Math.ceil(r.height*DPR);
  tgt.cv.style.width=r.width+"px";
  tgt.cv.style.height=r.height+"px";
}
function resizeActiveMap(){ resizeBigMap(); }

function mapViewTarget(){
  if(typeof pauseMapActive!=="undefined"&&pauseMapActive&&pauseMapCv&&pauseMapWrap)
    return {cv:pauseMapCv, ctx:pauseMapCtx, el:pauseMapWrap};
  if(bigMapOpen&&bigMapCv&&bigMapEl) return {cv:bigMapCv, ctx:bigMapCtx, el:bigMapEl};
  return null;
}

function drawBigMap(){
  const tgt=mapViewTarget();
  if(!tgt||!tgt.ctx||!tgt.cv) return;
  resizeBigMap();
  const W=tgt.cv.width/DPR, H=tgt.cv.height/DPR;
  const bctx=tgt.ctx;
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
  const opts={tx,ty,i0,i1,j0,j1,scale:MS,fog:true,cxw,cyw,w2,routeWidth:4,showPlayer:"fixed"};

  Game.drawMap(bctx, opts);

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
      if(typeof hitRaceEventAt==="function"){
        const re=hitRaceEventAt(w.x,w.y);
        if(re){
          if(typeof setRaceEventPreview==="function") setRaceEventPreview(re);
          if(typeof navigateToRaceEvent==="function") navigateToRaceEvent(re);
          drawBigMap();
          return;
        }
      }
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
  if(typeof pauseMapActive!=="undefined"&&pauseMapActive) drawPauseMap();
  else if(bigMapOpen) drawBigMap();
}

initBigMapEvents();

Game.register({
  id:"map",
  order:35,
  update:updateMap,
  updateAlways:true,
  drawWorldOverlay:drawNavRouteWorld,
  drawMap(mctx, opts){
    mapDrawTerrain(mctx, opts);
    mapDrawRoads(mctx, opts);
    mapDrawRoute(mctx, opts.tx, opts.ty, opts.routeWidth||3.2);
    if(opts.showPlayer!==undefined) mapDrawBlips(mctx, opts.tx, opts.ty, opts.showPlayer);
    else mapDrawBlips(mctx, opts.tx, opts.ty, false);
    if(opts.fog) mapDrawFogOverlay(mctx, opts.i0, opts.i1, opts.j0, opts.j1, opts.tx, opts.ty);
  },
});
