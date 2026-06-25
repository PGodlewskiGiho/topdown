/* TOPDOWN CITY — 36-railways.js */
/* Rail backbone between cities, stations, routed trains & crossings */

const RAIL_SPACING = 24;
const railEdgeCache = new Map();
const crossingRegistry = new Map();
const trains = [];
let railBackbone = null;
let railStations = null;

function clearRailCaches(){
  railEdgeCache.clear();
  crossingRegistry.clear();
  trains.length = 0;
  railBackbone = null;
  railStations = null;
}

function railCorridorV(i){ return ((i + RAIL_SPACING / 2) % RAIL_SPACING + RAIL_SPACING) % RAIL_SPACING === 0; }
function railCorridorH(j){ return ((j + RAIL_SPACING / 3) % RAIL_SPACING + RAIL_SPACING) % RAIL_SPACING === 0; }
function railOnCorridor(i,j){ return railCorridorV(i) || railCorridorH(j); }

function canonicalRailKey(i,j,di,dj){
  if(di < 0 || (di === 0 && dj < 0)) return canonicalRailKey(i + di, j + dj, -di, -dj);
  return i + "," + j + "," + di + "," + dj;
}

function addBackboneEdge(i,j,ni,nj){
  if(!railBackbone) return;
  const di = ni - i, dj = nj - j;
  if(!di && !dj) return;
  railBackbone.add(canonicalRailKey(i, j, di, dj));
}

function railCellCost(i,j){
  if(biomeOf(i, j) === "sea") return 1e9;
  if(isMountain(i, j)) return 1e9;
  if(cityZone(i, j) === "downtown") return 1e9;
  const x = nX(i, j), y = nY(i, j);
  if(inWater(x, y) || lakeScore(x, y) > 0.02) return 1e9;
  let c = 1;
  const b = biomeOf(i, j);
  if(b === "forest") c += 0.12;
  if(b === "desert") c += 0.22;
  if(b === "city"){
    const z = cityZone(i, j);
    if(z === "suburb") c += 0.08;
    else if(z === "midrise") c += 0.35;
  }
  if(terrainSlope(x, y) > 0.0036) c += 2.2 + terrainSlope(x, y) * 180;
  return c;
}

function railCorridorNeighbors(i,j){
  const n = [], seen = new Set();
  const add = (a,b) => {
    const k = a + "," + b;
    if(seen.has(k)) return;
    seen.add(k);
    n.push([a, b]);
  };
  if(railCorridorV(i)) { add(i, j - 1); add(i, j + 1); }
  if(railCorridorH(j)) { add(i - 1, j); add(i + 1, j); }
  return n;
}

function pathfindRail(from,to){
  const [fi,fj] = from, [ti,tj] = to;
  const startK = fi + "," + fj, goalK = ti + "," + tj;
  const open = [{i: fi, j: fj, f: Math.hypot(ti - fi, tj - fj)}];
  const cameFrom = new Map();
  const gScore = new Map([[startK, 0]]);
  const closed = new Set();
  while(open.length){
    open.sort((a,b) => a.f - b.f);
    const cur = open.shift();
    const ck = cur.i + "," + cur.j;
    if(closed.has(ck)) continue;
    closed.add(ck);
    if(cur.i === ti && cur.j === tj){
      const path = [[ti, tj]];
      let k = goalK;
      while(cameFrom.has(k)){
        const prev = cameFrom.get(k);
        path.push(prev);
        k = prev[0] + "," + prev[1];
      }
      path.reverse();
      return path;
    }
    const g = gScore.get(ck) || 0;
    for(const [ni,nj] of railCorridorNeighbors(cur.i, cur.j)){
      const nk = ni + "," + nj;
      if(closed.has(nk)) continue;
      const step = railCellCost(ni, nj);
      if(step >= 1e8) continue;
      const ng = g + step + Math.hypot(ni - cur.i, nj - cur.j) * 0.05;
      if(ng < (gScore.get(nk) ?? 1e12)){
        gScore.set(nk, ng);
        cameFrom.set(nk, [cur.i, cur.j]);
        open.push({i: ni, j: nj, f: ng + Math.hypot(ti - ni, tj - nj)});
      }
    }
  }
  return null;
}

function findCityStation(sci,scj){
  const ct = cityCenter(sci, scj);
  let best = null, bestScore = 1e9;
  const i0 = Math.round(ct.cx) - 20, i1 = Math.round(ct.cx) + 20;
  const j0 = Math.round(ct.cy) - 20, j1 = Math.round(ct.cy) + 20;
  for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++){
    if(!railOnCorridor(i, j)) continue;
    if(railCellCost(i, j) >= 1e8) continue;
    const z = cityZone(i, j);
    if(z === "downtown") continue;
    const d = Math.hypot(i - ct.cx, j - ct.cy);
    if(d > ct.R * 1.32) continue;
    const score = d + (z === "suburb" ? 0 : z === "midrise" ? 0.45 : 1.2);
    if(score < bestScore){ bestScore = score; best = [i, j]; }
  }
  return best;
}

function ensureRailBackbone(){
  if(railBackbone) return;
  railBackbone = new Set();
  railStations = new Map();
  const CITY_R = 6;
  for(let sci = -CITY_R; sci <= CITY_R; sci++) for(let scj = -CITY_R; scj <= CITY_R; scj++){
    const st = findCityStation(sci, scj);
    if(st) railStations.set(sci + "," + scj, st);
  }
  const connOff = [[1,0],[-1,0],[0,1],[0,-1]];
  for(let sci = -CITY_R; sci <= CITY_R; sci++) for(let scj = -CITY_R; scj <= CITY_R; scj++){
    const from = railStations.get(sci + "," + scj);
    if(!from) continue;
    for(const [dx,dy] of connOff){
      const sci2 = sci + dx, scj2 = scj + dy;
      if(Math.abs(sci2) > CITY_R || Math.abs(scj2) > CITY_R) continue;
      if(hsh(sci, scj, 920 + dx * 5 + dy * 7) > 0.82) continue;
      const to = railStations.get(sci2 + "," + scj2);
      if(!to) continue;
      const path = pathfindRail(from, to);
      if(!path || path.length < 2) continue;
      for(let k = 0; k < path.length - 1; k++){
        addBackboneEdge(path[k][0], path[k][1], path[k + 1][0], path[k + 1][1]);
      }
    }
  }
}

function backboneHasEdge(i,j,di,dj){
  ensureRailBackbone();
  return railBackbone.has(canonicalRailKey(i, j, di, dj));
}

function getRailEdge(i,j,di,dj){
  if(di < 0 || (di === 0 && dj < 0)) return getRailEdge(i + di, j + dj, -di, -dj);
  const key = "r:" + i + "," + j + "," + di + "," + dj;
  let e = railEdgeCache.get(key);
  if(e) return e;

  e = {exists: false, _pending: true, width: 56, cp: [0,0], col: "#4a4038", len: 0, bridge: false, tunnel: false, klass: "rail"};
  railEdgeCache.set(key, e);

  const ii = i + di, jj = j + dj;
  const bA = biomeOf(i, j), bB = biomeOf(ii, jj);
  const vertical = di === 0 && dj !== 0, horizontal = di !== 0 && dj === 0;
  const onLine = (vertical && railCorridorV(i) && railCorridorV(ii)) || (horizontal && railCorridorH(j) && railCorridorH(jj));
  let exists = onLine && backboneHasEdge(i, j, di, dj);
  if(bA === "sea" || bB === "sea") exists = false;
  if(isMountain(i, j) || isMountain(ii, jj)) exists = false;
  if(bA === "city" && cityZone(i, j) === "downtown") exists = false;
  if(bB === "city" && cityZone(ii, jj) === "downtown") exists = false;

  const x1 = nX(i, j), y1 = nY(i, j), x2 = nX(ii, jj), y2 = nY(ii, jj);
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const h2 = hsh(i + dj, j - di, 913);
  let off = (h2 * 2 - 1) * len * 0.022;
  off = Math.max(-42, Math.min(42, off));
  const cp = [(x1 + x2) / 2 + (-dy / len) * off, (y1 + y2) / 2 + (dx / len) * off];

  let bridge = false;
  if(exists){
    for(let t = 0.05; t < 0.95; t += 0.09){
      const p = bez([x1,y1], cp, [x2,y2], t);
      if(lakeScore(p[0], p[1]) > 0.02){ exists = false; break; }
      if(riverScore(p[0], p[1]) > 0.02) bridge = true;
    }
    if(terrainSlope((x1 + x2) / 2, (y1 + y2) / 2) > 0.0044) exists = false;
  }

  e.exists = exists;
  e.cp = cp;
  e.len = len;
  e.bridge = bridge;

  const roadE = getEdge(i, j, di, dj);
  if(exists && roadE.exists){
    const kind = crossingKindAt(i, j, di, dj, e, roadE);
    if(kind === "tunnel") e.tunnel = true;
  }
  delete e._pending;
  return e;
}

function railNeighbors(i,j){
  const r = [];
  for(const[di,dj] of EDIRS){
    const e = getRailEdge(i, j, di, dj);
    if(e.exists) r.push([i + di, j + dj]);
  }
  return r;
}

function hasRailAtNode(i,j){
  for(const[di,dj] of EDIRS) if(getRailEdge(i, j, di, dj).exists) return true;
  return false;
}

function roadAtNode(i,j){
  for(const[di,dj] of EDIRS) if(getEdge(i, j, di, dj).exists) return true;
  return false;
}

function crossingKindAt(i,j,di,dj,reOpt,rdOpt){
  const re = reOpt || getRailEdge(i, j, di, dj);
  const rd = rdOpt || getEdge(i, j, di, dj);
  if(!re.exists || !rd.exists) return null;
  const zone = biomeOf(i, j) === "city" ? cityZone(i, j) : "outer";
  let hwy = rd.hwy;
  for(const[d2i,d2j] of EDIRS){
    const e2 = getEdge(i, j, d2i, d2j);
    if(e2.exists && e2.hwy) hwy = true;
  }
  if(zone === "downtown" || zone === "midrise" || hwy) return hsh(i, j, 903) < 0.62 ? "tunnel" : "level";
  if(rd.klass === "blvd" || rd.klass === "art") return hsh(i, j, 903) < 0.38 ? "tunnel" : "level";
  return "level";
}

function railEdgeGeom(ai,aj,bi,bj){
  const e = getRailEdge(ai, aj, bi - ai, bj - aj);
  return {e, p0: node(ai, aj), p1: node(bi, bj), cp: e.cp};
}

function registerCrossing(i,j,di,dj,kind){
  const ck = i + "," + j;
  if(crossingRegistry.has(ck)) return;
  const cx = nX(i, j), cy = nY(i, j);
  const ang = Math.atan2(nY(i + dj, j + dj) - cy, nX(i + di, j + dj) - cx);
  const perp = ang + Math.PI / 2;
  const rd = getEdge(i, j, di, dj);
  const half = Math.max(42, nodeMaxWidth(i, j) * 0.48);
  const gates = [];
  if(kind === "level"){
    for(const side of [-1,1]){
      const gx = cx + Math.cos(perp) * side * (rd.width * 0.5 + 14);
      const gy = cy + Math.sin(perp) * side * (rd.width * 0.5 + 14);
      gates.push({x: gx, y: gy, side, ang: perp, down: 0, flash: 0});
    }
  }
  crossingRegistry.set(ck, {i,j,kind,axis: dj === 0 ? 0 : 1, cx,cy,ang,perp,half,gates,trainNear: 0, gateDown: false});
}

function addRailCrossings(lot,i,j){
  if(!hasRailAtNode(i, j) || !roadAtNode(i, j)) return;
  lot.railCross = true;
  ensureRailBackbone();
  const stKey = [...railStations.entries()].find(([,st]) => st[0] === i && st[1] === j);
  if(stKey) lot.railStation = stKey[0];
  for(const[di,dj] of [[1,0],[0,1]]){
    const re = getRailEdge(i, j, di, dj), rd = getEdge(i, j, di, dj);
    if(!re.exists || !rd.exists) continue;
    const kind = crossingKindAt(i, j, di, dj, re, rd);
    if(kind) registerCrossing(i, j, di, dj, kind);
  }
}

function updateCrossingGates(dt){
  for(const c of crossingRegistry.values()){
    let near = 0;
    for(const t of trains){
      const d = Math.hypot(t.x - c.cx, t.y - c.cy);
      if(d < 480) near = Math.max(near, 1 - d / 480);
    }
    c.trainNear += (near - c.trainNear) * Math.min(1, 5 * dt);
    c.gateDown = c.kind === "level" && c.trainNear > 0.08;
    const target = c.gateDown ? 1 : 0;
    for(const g of c.gates){
      g.down += (target - g.down) * Math.min(1, 3.5 * dt);
      g.flash += dt * 7;
    }
  }
}

function crossingBlocksRoad(i,j,axis){
  const c = crossingRegistry.get(i + "," + j);
  if(!c || c.kind !== "level" || !c.gateDown) return false;
  return true;
}

function collideCrossingGates(e){
  const ci = Math.floor((e.x - ROAD) / GAP), cj = Math.floor((e.y - ROAD) / GAP);
  for(let i = ci - 1; i <= ci + 1; i++) for(let j = cj - 1; j <= cj + 1; j++){
    const c = crossingRegistry.get(i + "," + j);
    if(!c || c.kind !== "level") continue;
    for(const g of c.gates){
      if(g.down < 0.45) continue;
      const len = 38 * g.down, ux = Math.cos(g.ang + Math.PI / 2), uy = Math.sin(g.ang + Math.PI / 2);
      const bx = g.x + ux * len * 0.5, by = g.y + uy * len * 0.5;
      if(Math.hypot(e.x - bx, e.y - by) < 14 + (e.R || e.r || 12)){
        const nx = (e.x - bx) || 0.01, ny = (e.y - by) || 0.01, d = Math.hypot(nx, ny) || 1;
        e.x += nx / d * 3; e.y += ny / d * 3;
        if(typeof e.vx === "number"){
          if(typeof car !== "undefined" && e === car) collideDampenNormal(e, nx / d, ny / d, 0);
          else { e.vx *= -0.25; e.vy *= -0.25; }
        }
      }
    }
  }
}

function sampleRailCurve(i,j,di,dj,t){
  const g = railEdgeGeom(i, j, i + di, j + dj);
  return bez(g.p0, g.cp, g.p1, t);
}

function railHeadsign(i,j,di,dj){
  let ci = i + di, cj = j + dj, pdi = di, pdj = dj, pi = i, pj = j;
  for(let step = 0; step < 140; step++){
    const nc = nearestCity(ci, cj);
    if(nc.dist < nc.R * 1.1 && cityZone(ci, cj) !== "downtown"){
      const sci = Math.round(nc.cx / CITY_SPACING), scj = Math.round(nc.cy / CITY_SPACING);
      return {sci, scj, name: nc.name};
    }
    const nbs = railCorridorNeighbors(ci, cj).filter(n => !(n[0] === pi && n[1] === pj));
    const onBk = nbs.filter(n => backboneHasEdge(ci, cj, n[0] - ci, n[1] - cj));
    if(!onBk.length) break;
    const straight = onBk.find(n => n[0] - ci === pdi && n[1] - cj === pdj);
    const next = straight || onBk[0];
    pi = ci; pj = cj;
    pdi = next[0] - ci; pdj = next[1] - cj;
    ci = next[0]; cj = next[1];
  }
  return null;
}

function pickTrainNext(t, nb){
  if(!nb.length) return null;
  const prevDi = t.bi - t.ai, prevDj = t.bj - t.aj;
  let best = null, bestScore = -1e9;
  for(const n of nb){
    const ni = n[0], nj = n[1];
    const ndi = ni - t.bi, ndj = nj - t.bj;
    let score = 0;
    if(ndi === prevDi && ndj === prevDj) score += 4;
    if(t.destSci != null){
      const ct = cityCenter(t.destSci, t.destScj);
      score -= Math.hypot(ni - ct.cx, nj - ct.cy) * 0.08;
    }
    score -= hsh(ni, nj, 951) * 0.4;
    if(score > bestScore){ bestScore = score; best = n; }
  }
  return best;
}

function drawRailBed(p0,cp,p1,w){
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "#3a342e"; ctx.lineWidth = w + 10;
  ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(cp[0], cp[1], p1[0], p1[1]); ctx.stroke();
  ctx.strokeStyle = "#5a5048"; ctx.lineWidth = w + 4;
  ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(cp[0], cp[1], p1[0], p1[1]); ctx.stroke();
}

function drawRailTracks(p0,cp,p1){
  const steps = Math.max(8, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 28));
  ctx.strokeStyle = "#8a9098"; ctx.lineWidth = 2.2;
  for(const off of [-5.5, 5.5]){
    ctx.beginPath();
    for(let s = 0; s <= steps; s++){
      const t = s / steps, p = bez(p0, cp, p1, t);
      const tn = bezTan(p0, cp, p1, t), tl = Math.hypot(tn[0], tn[1]) || 1;
      const nx = -tn[1] / tl, ny = tn[0] / tl;
      const x = p[0] + nx * off, y = p[1] + ny * off;
      s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "#6a5040"; ctx.lineWidth = 3.5;
  for(let s = 0; s <= steps; s += 2){
    const t = s / steps, p = bez(p0, cp, p1, t);
    const tn = bezTan(p0, cp, p1, t), tl = Math.hypot(tn[0], tn[1]) || 1;
    const nx = -tn[1] / tl, ny = tn[0] / tl;
    ctx.beginPath(); ctx.moveTo(p[0] - nx * 7, p[1] - ny * 7); ctx.lineTo(p[0] + nx * 7, p[1] + ny * 7); ctx.stroke();
  }
}

function drawRailTunnel(i,j,di,dj){
  const rd = getEdge(i, j, di, dj); if(!rd.exists) return;
  const A = node(i, j), B = node(i + di, j + dj), C = rd.cp;
  const cx = (A[0] + B[0]) * 0.5, cy = (A[1] + B[1]) * 0.5;
  const tn = bezTan(A, C, B, 0.5), tl = Math.hypot(tn[0], tn[1]) || 1;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(Math.atan2(tn[1], tn[0]));
  const hw = rd.width * 0.5 + 6;
  ctx.fillStyle = "rgba(12,14,18,.88)"; ctx.fillRect(-hw - 8, -18, hw * 2 + 16, 36);
  ctx.strokeStyle = "#6a6258"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-hw, 14); ctx.lineTo(-hw, -10); ctx.arc(0, -10, hw, Math.PI, 0); ctx.lineTo(hw, 14); ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(-hw + 4, -8, hw * 2 - 8, 22);
  ctx.restore();
}

function drawRailStation(i,j,name){
  const A = node(i, j);
  const ang = railCorridorV(i) ? Math.PI / 2 : 0;
  ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(ang);
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(-28, 6, 56, 8);
  ctx.fillStyle = "#7a7268"; ctx.fillRect(-26, -6, 52, 12);
  ctx.fillStyle = "#9a9088"; ctx.fillRect(-24, -4, 48, 2); ctx.fillRect(-24, 2, 48, 2);
  ctx.fillStyle = "#c8c2b8"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
  if(name){
    const short = name.length > 11 ? name.slice(0, 10) + "…" : name;
    ctx.fillText(short, 0, -10);
  }
  ctx.restore();
}

function drawLevelCrossingMarkings(c){
  ctx.save(); ctx.translate(c.cx, c.cy); ctx.rotate(c.ang);
  ctx.fillStyle = "rgba(240,230,210,.55)";
  for(let x = -c.half; x < c.half; x += 10) ctx.fillRect(x, -5, 6, 10);
  ctx.restore();
}

function drawCrossingGate(g){
  const down = g.down, len = 38 * down;
  if(down < 0.04) return;
  const ux = Math.cos(g.ang + Math.PI / 2), uy = Math.sin(g.ang + Math.PI / 2);
  const bx = g.x, by = g.y, ex = bx + ux * len, ey = by + uy * len;
  ctx.strokeStyle = "#3a3834"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.lineWidth = 5;
  for(let k = 0; k < 4; k++){
    const t0 = k / 4, t1 = (k + 0.5) / 4;
    ctx.strokeStyle = (k % 2 === 0) ? "#e8e8ec" : "#c83838";
    ctx.beginPath();
    ctx.moveTo(bx + ux * len * t0, by + uy * len * t0);
    ctx.lineTo(bx + ux * len * t1, by + uy * len * t1);
    ctx.stroke();
  }
  const flash = Math.sin(g.flash) > 0;
  ctx.fillStyle = flash ? "#ff4440" : "#5a1010";
  ctx.beginPath(); ctx.arc(bx, by, 3.2, 0, 7); ctx.fill();
}

function drawRails(ox,oy){
  ensureRailBackbone();
  const i0 = Math.floor((ox - NODE_VAR * 2) / GAP) - 1, i1 = Math.floor((ox + VW + NODE_VAR * 2) / GAP) + 2;
  const j0 = Math.floor((oy - NODE_VAR * 2) / GAP) - 1, j1 = Math.floor((oy + VH + NODE_VAR * 2) / GAP) + 2;
  const drawnSt = new Set();
  for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++){
    for(const[di,dj] of [[1,0],[0,1]]){
      const e = getRailEdge(i, j, di, dj); if(!e.exists) continue;
      const A = node(i, j), B = node(i + di, j + dj);
      if(A[0] < ox - 80 && B[0] < ox - 80 || A[0] > ox + VW + 80 && B[0] > ox + VW + 80) continue;
      if(A[1] < oy - 80 && B[1] < oy - 80 || A[1] > oy + VH + 80 && B[1] > oy + VH + 80) continue;
      if(e.tunnel){ drawRailTunnel(i, j, di, dj); continue; }
      if(e.bridge){
        ctx.strokeStyle = "#6a5848"; ctx.lineWidth = e.width + 8; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(e.cp[0], e.cp[1], B[0], B[1]); ctx.stroke();
      }
      drawRailBed(A, e.cp, B, e.width * 0.55);
      drawRailTracks(A, e.cp, B);
    }
  }
  for(const [key, st] of railStations){
    const [i,j] = st;
    if(i < i0 - 1 || i > i1 + 1 || j < j0 - 1 || j > j1 + 1) continue;
    if(!hasRailAtNode(i, j)) continue;
    const sk = i + "," + j;
    if(drawnSt.has(sk)) continue;
    drawnSt.add(sk);
    const parts = key.split(",");
    const ct = cityCenter(+parts[0], +parts[1]);
    drawRailStation(i, j, ct.name);
  }
  for(const c of crossingRegistry.values()){
    if(c.cx < ox - 60 || c.cx > ox + VW + 60 || c.cy < oy - 60 || c.cy > oy + VH + 60) continue;
    if(c.kind === "level"){
      drawLevelCrossingMarkings(c);
      for(const g of c.gates) drawCrossingGate(g);
    }
  }
}

function spawnTrain(){
  ensureRailBackbone();
  const ci = Math.round(focusX / GAP), cj = Math.round(focusY / GAP);
  const tries = [];
  for(let k = 0; k < 72; k++){
    const i = ci + randInt(-24, 24), j = cj + randInt(-24, 24);
    if(!hasRailAtNode(i, j)) continue;
    const nb = railNeighbors(i, j);
    for(const to of nb){
      const di = to[0] - i, dj = to[1] - j;
      const hs = railHeadsign(i, j, di, dj);
      if(!hs) continue;
      tries.push({i,j,to,di,dj,hs});
    }
  }
  if(!tries.length) return null;
  const pick = tries[(rng() * tries.length) | 0];
  const p = sampleRailCurve(pick.i, pick.j, pick.di, pick.dj, rng() * 0.25 + 0.08);
  const freight = biomeOf(pick.i, pick.j) === "forest" || biomeOf(pick.i, pick.j) === "desert";
  const cars = freight ? 4 + (rng() * 5 | 0) : 2 + (rng() * 3 | 0);
  return {
    x: p[0], y: p[1], a: 0, vx: 0, vy: 0,
    ai: pick.i, aj: pick.j, bi: pick.to[0], bj: pick.to[1], t: rng() * 0.2 + 0.05,
    speed: freight ? rand(78, 118) : rand(95, 138),
    cruise: freight ? rand(92, 128) : rand(108, 152),
    W: freight ? 36 : 34, L: 160 + cars * (freight ? 58 : 48), R: 42,
    color: freight ? pick(["#6a5838", "#5a5048", "#7a6848", "#4a4038"]) : pick(["#8a3828", "#3a4858", "#5a5048", "#2a4a68"]),
    cars, hornCd: rand(2, 8), freight,
    destSci: pick.hs.sci, destScj: pick.hs.scj, destName: pick.hs.name,
  };
}

function maintainTrains(){
  const cap = biomeOf(Math.round(focusX / GAP), Math.round(focusY / GAP)) === "city" ? 4 : 2;
  while(trains.length < cap){
    const t = spawnTrain();
    if(t) trains.push(t);
    else break;
  }
}

function updateTrain(t,dt){
  const g = railEdgeGeom(t.ai, t.aj, t.bi, t.bj);
  const spd = t.freight ? t.speed * 0.92 : t.speed;
  t.t += dt * spd / Math.max(36, g.e.len);
  if(t.t >= 1){
    const nb = railNeighbors(t.bi, t.bj).filter(n => !(n[0] === t.ai && n[1] === t.aj));
    const nx = pickTrainNext(t, nb);
    if(!nx){ t.t = 0.98; return; }
    const hs = railHeadsign(t.bi, t.bj, nx[0] - t.bi, nx[1] - t.bj);
    if(hs){ t.destSci = hs.sci; t.destScj = hs.scj; t.destName = hs.name; }
    t.ai = t.bi; t.aj = t.bj; t.bi = nx[0]; t.bj = nx[1]; t.t = 0;
  }
  const p = bez(g.p0, g.cp, g.p1, t.t);
  const tn = bezTan(g.p0, g.cp, g.p1, Math.min(t.t, 0.99)), tl = Math.hypot(tn[0], tn[1]) || 1;
  t.x = p[0]; t.y = p[1]; t.a = Math.atan2(tn[1] / tl, tn[0] / tl);
  t.hornCd -= dt;
  for(const ck of [t.ai + "," + t.aj, t.bi + "," + t.bj]){
    const c = crossingRegistry.get(ck);
    if(c && c.kind === "level" && c.gateDown && t.hornCd <= 0 && Math.hypot(t.x - c.cx, t.y - c.cy) < 200){
      if(typeof honk === "function") honk();
      t.hornCd = rand(3, 7);
    }
  }
  if(Math.hypot(t.x - focusX, t.y - focusY) > 2600){
    const n = spawnTrain();
    if(n) Object.assign(t, n);
  }
}

function trainNearEntity(t,e){
  return Math.hypot(e.x - t.x, e.y - t.y) < t.L * 0.5 + (e.R || e.r || 14);
}

function updateTrains(dt){
  updateCrossingGates(dt);
  maintainTrains();
  for(const t of trains){
    updateTrain(t, dt);
    if(car && !car.dead && trainNearEntity(t, car)){
      if(typeof damageCar === "function") damageCar(car, 120, t.x, t.y, "hit");
      alertPeds(t.x, t.y, 220);
    }
    if(mode === "foot" && trainNearEntity(t, ped)){
      if(typeof damage === "function") damage(999);
    }
    for(const c of traffic){
      if(c.state !== "drive" && c.state !== "loose") continue;
      if(Math.hypot(c.x - t.x, c.y - t.y) < t.L * 0.4 + 40){
        if(typeof damageCar === "function") damageCar(c, 80, t.x, t.y, "hit");
        c.state = "loose"; c.vx = (c.x - t.x) * 0.4; c.vy = (c.y - t.y) * 0.4;
      }
    }
  }
}

function drawTrainBody(t){
  ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
  const hl = t.L * 0.5, hw = t.W * 0.5;
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-hl + 4, hw + 2, t.L - 8, 5);
  ctx.fillStyle = t.color; ctx.fillRect(-hl, -hw, hl * 0.32, hw * 2);
  ctx.fillStyle = shade(t.color, 18); ctx.fillRect(-hl + hl * 0.32, -hw, t.L - hl * 0.32, hw * 2);
  for(let c = 0; c < t.cars; c++){
    const ox = -hl * 0.55 + c * (t.L * 0.78 / t.cars);
    ctx.fillStyle = shade(t.color, -8 + c * 4);
    if(t.freight){
      ctx.fillRect(ox, -hw * 0.92, t.L * 0.72 / t.cars, hw * 1.84);
      ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.strokeRect(ox, -hw * 0.92, t.L * 0.72 / t.cars, hw * 1.84);
    } else {
      ctx.fillRect(ox, -hw * 0.88, t.L * 0.72 / t.cars, hw * 1.76);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.strokeRect(ox, -hw * 0.88, t.L * 0.72 / t.cars, hw * 1.76);
      ctx.fillStyle = "rgba(200,220,235,.45)"; ctx.fillRect(ox + 2, -hw * 0.55, t.L * 0.72 / t.cars - 4, hw * 0.9);
    }
  }
  ctx.fillStyle = "#dde6ec"; ctx.fillRect(hl - hl * 0.28, -hw * 0.55, hl * 0.22, hw * 1.1);
  ctx.fillStyle = "#ffcc44"; ctx.fillRect(hl - hl * 0.12, -hw * 0.35, 6, hw * 0.7);
  ctx.restore();
}

function drawTrains(ox,oy){
  for(const t of trains){
    if(t.x < ox - 120 || t.x > ox + VW + 120 || t.y < oy - 120 || t.y > oy + VH + 120) continue;
    drawTrainBody(t);
  }
}

function mapDrawRails(mctx, tx, ty, i0,i1,j0,j1, scale){
  ensureRailBackbone();
  mctx.lineCap = "round";
  for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++){
    for(const[di,dj] of [[1,0],[0,1]]){
      const e = getRailEdge(i, j, di, dj); if(!e.exists || e.tunnel) continue;
      const A = node(i, j), B = node(i + di, j + dj);
      mctx.strokeStyle = "#7a7268"; mctx.lineWidth = Math.max(1.4, e.width * scale * 0.45);
      mctx.beginPath(); mctx.moveTo(tx(A[0]), ty(A[1]));
      mctx.quadraticCurveTo(tx(e.cp[0]), ty(e.cp[1]), tx(B[0]), ty(B[1])); mctx.stroke();
    }
  }
  for(const [key, st] of railStations){
    const [i,j] = st;
    if(i < i0 || i > i1 || j < j0 || j > j1) continue;
    if(!hasRailAtNode(i, j)) continue;
    const A = node(i, j);
    mctx.fillStyle = "#9a9088";
    mctx.fillRect(tx(A[0]) - 3, ty(A[1]) - 2, 6, 4);
  }
}

Game.register({
  id: "railways",
  order: 36,
  onLot: addRailCrossings,
  update: updateTrains,
  drawAfterRoads: drawRails,
  drawActors: drawTrains,
  actorLayer: "afterTraffic",
  drawMap(mctx, opts){
    mapDrawRails(mctx, opts.tx, opts.ty, opts.i0, opts.i1, opts.j0, opts.j1, opts.scale);
  },
});
