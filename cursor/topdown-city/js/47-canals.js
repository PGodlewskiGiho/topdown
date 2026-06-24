/* TOPDOWN CITY — 47-canals.js — miejskie kanały (GTA2 Renegade) + wejścia */

const CANAL_HW = 22;
const CANAL_WALL = 10;
const CANAL_SEGMENTS = [];
const CANAL_ENTRIES = [];
const CANAL_BRIDGES = [];
let _canalsBuilt = false;
let _canalBuilding = false;

function cellBlockRect(i, j){
  const A = node(i, j), Bn = node(i + 1, j), C = node(i + 1, j + 1), D = node(i, j + 1);
  const eTop = getEdge(i, j, 1, 0), eBot = getEdge(i, j + 1, 1, 0);
  const eLeft = getEdge(i, j, 0, 1), eRight = getEdge(i + 1, j, 0, 1);
  const SW = 6;
  let left = Math.max(A[0], D[0]) + eLeft.width / 2 + SW + eLeft.bulge;
  let right = Math.min(Bn[0], C[0]) - eRight.width / 2 - SW - eRight.bulge;
  let top = Math.max(A[1], Bn[1]) + eTop.width / 2 + SW + eTop.bulge;
  let bot = Math.min(D[1], C[1]) - eBot.width / 2 - SW - eBot.bulge;
  return {x: left, y: top, w: right - left, h: bot - top, i, j};
}

function inCanalCity(i, j){
  const c = nearestCity(i, j);
  return c.id === 0;
}

function distToSeg(px, py, x1, y1, x2, y2){
  const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
  if(len2 < 1) return {d: Math.hypot(px - x1, py - y1), t: 0, qx: x1, qy: y1};
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const qx = x1 + t * dx, qy = y1 + t * dy;
  return {d: Math.hypot(px - qx, py - qy), t, qx, qy, dx, dy, len: Math.sqrt(len2)};
}

function segNormal(s){
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1;
  return [-dy / len, dx / len];
}

function addCanalSeg(x1, y1, x2, y2, hw, meta){
  CANAL_SEGMENTS.push({x1, y1, x2, y2, hw: hw || CANAL_HW, meta: meta || null});
}

function addCanalStrip(lot, vertical){
  const m = ROAD * 0.52 + 36;
  const off = 0.32 + hsh(lot.i, lot.j, 848) * 0.36;
  if(vertical){
    const x = lot.x + lot.w * off;
    addCanalSeg(x, lot.y + m, x, lot.y + lot.h - m, CANAL_HW, {i: lot.i, j: lot.j});
  } else {
    const y = lot.y + lot.h * off;
    addCanalSeg(lot.x + m, y, lot.x + lot.w - m, y, CANAL_HW, {i: lot.i, j: lot.j});
  }
}

function addCanalEntry(x, y, a, label){
  CANAL_ENTRIES.push({x, y, a, len: 30, w: 20, label: label || "Kanał"});
}

function roadNearPoint(x, y, i, j){
  let best = 1e9, ang = 0;
  for(const[di, dj]of EDIRS){
    const e = getEdge(i, j, di, dj);
    if(!e.exists) continue;
    const A = node(i, j), B = node(i + di, j + dj), C = e.cp;
    for(let t = 0.05; t <= 0.95; t += 0.09){
      const p = bez(A, C, B, t);
      const d = Math.hypot(x - p[0], y - p[1]);
      if(d < best){ best = d; ang = Math.atan2(p[1] - y, p[0] - x) + Math.PI; }
    }
  }
  return {d: best, a: ang};
}

function buildCanalEntries(){
  for(const s of CANAL_SEGMENTS){
    for(const end of [[s.x1, s.y1, 0], [s.x2, s.y2, 1]]){
      const[ex, ey] = end;
      const[ci, cj] = cellAt(ex, ey);
      if(!inCanalCity(ci, cj)) continue;
      const rd = roadNearPoint(ex, ey, ci, cj);
      if(rd.d < ROAD * 0.72 + 48){
        const[nx, ny] = segNormal(s);
        addCanalEntry(ex + nx * (s.hw + 14), ey + ny * (s.hw + 14), rd.a, "Kanał");
      }
    }
  }
  const mkt = node(4, 3);
  addCanalEntry(mkt[0] - 90, mkt[1] + 55, Math.PI * 0.5, "Kanał przy Rynku");
  addCanalEntry(mkt[0] + 110, mkt[1] - 40, -Math.PI * 0.25, "Kanał przy Rynku");
}

function canalCrossesRoad(i, j, di, dj, s){
  const e = getEdge(i, j, di, dj);
  if(!e.exists) return null;
  const A = node(i, j), B = node(i + di, j + dj), C = e.cp;
  for(let t = 0.08; t <= 0.92; t += 0.06){
    const p = bez(A, C, B, t);
    const ds = distToSeg(p[0], p[1], s.x1, s.y1, s.x2, s.y2);
    if(ds.d < s.hw + 8){
      const tan = bezTan(A, C, B, t);
      const ang = Math.atan2(tan[1], tan[0]);
      return {x: ds.qx, y: ds.qy, a: ang, w: e.width * 0.55 + 18, road: e};
    }
  }
  return null;
}

function buildCanalBridges(){
  const seen = new Set();
  for(const s of CANAL_SEGMENTS){
    const mx = (s.x1 + s.x2) * 0.5, my = (s.y1 + s.y2) * 0.5;
    const[ci, cj] = cellAt(mx, my);
    for(let di = -1; di <= 1; di++) for(let dj = -1; dj <= 1; dj++){
      if(!di && !dj) continue;
      const hit = canalCrossesRoad(ci + di, cj + dj, Math.abs(di) ? Math.sign(di) : 0, Math.abs(dj) ? Math.sign(dj) : 0, s);
      if(!hit) continue;
      const key = (hit.x | 0) + "," + (hit.y | 0);
      if(seen.has(key)) continue;
      seen.add(key);
      CANAL_BRIDGES.push(hit);
    }
  }
}

function buildCanalNetwork(){
  for(let i = 2; i <= 8; i++) for(let j = 2; j <= 8; j++){
    if(typeof isOldTownCell === "function" && isOldTownCell(i, j)){
      const lot = cellBlockRect(i, j);
      addCanalStrip(lot, (i + j) % 2 === 0);
    }
  }
  const spine = [
    [3, 2, 5, 2], [5, 2, 5, 5], [5, 5, 3, 5], [3, 5, 3, 3], [3, 3, 4, 3],
  ];
  for(const[i0, j0, i1, j1] of spine){
    if(!inCanalCity(i0, j0)) continue;
    const L0 = cellBlockRect(i0, j0), L1 = cellBlockRect(i1, j1);
    const p0 = [L0.x + L0.w * 0.62, L0.y + L0.h * 0.38];
    const p1 = [L1.x + L1.w * 0.38, L1.y + L1.h * 0.62];
    addCanalSeg(p0[0], p0[1], p1[0], p1[1], CANAL_HW + 2, {spine: true});
  }
  buildCanalBridges();
  buildCanalEntries();
}

function ensureCanals(){
  if(_canalsBuilt || _canalBuilding) return;
  _canalBuilding = true;
  try { buildCanalNetwork(); _canalsBuilt = true; }
  finally { _canalBuilding = false; }
}

function canalScore(x, y){
  if(typeof isOldTownCell !== "function") return 0;
  if(_canalBuilding) return 0;
  ensureCanals();
  const[ci, cj] = cellAt(x, y);
  if(!inCanalCity(ci, cj)) return 0;
  if(typeof isOldTownCell === "function" && !isOldTownCell(ci, cj)){
    let near = false;
    for(let di = -1; di <= 1; di++) for(let dj = -1; dj <= 1; dj++){
      if(isOldTownCell(ci + di, cj + dj)){ near = true; break; }
    }
    if(!near) return 0;
  }
  let best = 0;
  for(const s of CANAL_SEGMENTS){
    const ds = distToSeg(x, y, s.x1, s.y1, s.x2, s.y2);
    if(ds.d < s.hw){
      const depth = 1 - ds.d / s.hw;
      best = Math.max(best, depth * 0.92);
    }
  }
  for(const e of CANAL_ENTRIES){
    const lx = x - e.x, ly = y - e.y;
    const ca = Math.cos(e.a), sa = Math.sin(e.a);
    const along = lx * ca + ly * sa, across = -lx * sa + ly * ca;
    if(along > -6 && along < e.len + 8 && Math.abs(across) < e.w * 0.5){
      const ramp = clamp(1 - along / (e.len + 8), 0, 1);
      best = Math.max(best, ramp * 0.55);
    }
  }
  return best;
}

function inCanalWater(x, y){
  return canalScore(x, y) > 0.08;
}

function inCanalZone(x, y){
  ensureCanals();
  for(const s of CANAL_SEGMENTS){
    const ds = distToSeg(x, y, s.x1, s.y1, s.x2, s.y2);
    if(ds.d < s.hw + CANAL_WALL + 6) return true;
  }
  return false;
}

function canalFlowAt(x, y){
  ensureCanals();
  let bestD = 1e9, fx = 0, fy = 0;
  for(const s of CANAL_SEGMENTS){
    const ds = distToSeg(x, y, s.x1, s.y1, s.x2, s.y2);
    if(ds.d < bestD){
      bestD = ds.d;
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1;
      fx = dx / len; fy = dy / len;
    }
  }
  return [fx, fy];
}

function canalCurrentAt(x, y){
  const c = canalScore(x, y);
  if(c < 0.1) return null;
  const[fx, fy] = canalFlowAt(x, y);
  return {fx, fy, speed: 16 + c * 22, depth: c};
}

function applyCanalCurrentXY(x, y, dt, mult){
  const c = canalCurrentAt(x, y);
  if(!c) return [x, y];
  const m = mult != null ? mult : 1;
  return [x + c.fx * c.speed * m * dt, y + c.fy * c.speed * m * dt];
}

function onCanalBridgeAt(x, y){
  ensureCanals();
  for(const b of CANAL_BRIDGES){
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    const lx = x - b.x, ly = y - b.y;
    const along = lx * ca + ly * sa, across = -lx * sa + ly * ca;
    if(Math.abs(along) < b.w * 0.55 && Math.abs(across) < 16) return true;
  }
  return false;
}

function nearestCanalEntry(x, y, maxR){
  ensureCanals();
  const R = maxR != null ? maxR : 42;
  let best = null, bd = R;
  for(const e of CANAL_ENTRIES){
    const d = Math.hypot(x - e.x, y - e.y);
    if(d < bd){ bd = d; best = e; }
  }
  return best;
}

function descendCanalEntry(e){
  const ca = Math.cos(e.a), sa = Math.sin(e.a);
  ped.x = e.x + ca * (e.len - 6);
  ped.y = e.y + sa * (e.len - 6);
  ped.vx = ca * 28; ped.vy = sa * 28;
  ped.swimming = true;
  if(typeof playSplash === "function") playSplash();
  if(typeof showBigMsg === "function") showBigMsg("KANAŁ");
}

function collideCanalWalls(ent, r){
  if(!inCanalZone(ent.x, ent.y)) return;
  if(onCanalBridgeAt(ent.x, ent.y)) return;
  const rad = r != null ? r : (ent.r || 9);
  ensureCanals();
  for(const s of CANAL_SEGMENTS){
    const ds = distToSeg(ent.x, ent.y, s.x1, s.y1, s.x2, s.y2);
    const limit = s.hw - rad - 1;
    if(ds.d > limit && ds.d < s.hw + CANAL_WALL){
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1;
      const nx = -(dy / len), ny = dx / len;
      const side = (ent.x - ds.qx) * nx + (ent.y - ds.qy) * ny >= 0 ? 1 : -1;
      ent.x = ds.qx + nx * side * Math.max(limit, 4);
      ent.y = ds.qy + ny * side * Math.max(limit, 4);
    }
  }
}

function drawBrickWall(x1, y1, x2, y2, inset, col){
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * inset, ny = dx / len * inset;
  const ax = x1 + nx, ay = y1 + ny, bx = x2 + nx, by = y2 + ny;
  ctx.strokeStyle = "rgba(40,32,28,.35)"; ctx.lineWidth = inset * 2 + 2;
  ctx.lineCap = "butt";
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  const step = 11;
  for(let t = 0; t <= len; t += step){
    const u = t / len;
    const px = x1 + dx * u + nx, py = y1 + dy * u + ny;
    const n = ((Math.floor(t / step) * 17 ^ (inset > 0 ? 1 : 0)) >>> 0) % 4;
    ctx.fillStyle = col || ["#8a7060", "#7a6454", "#9a8070", "#6a5848"][n];
    ctx.fillRect(px - 5, py - 5, 10, 10);
  }
}

function drawCanalWaterSeg(s, ox, oy, t){
  const ds = distToSeg;
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const hw = s.hw;
  const p0 = [s.x1 + nx * hw, s.y1 + ny * hw];
  const p1 = [s.x2 + nx * hw, s.y2 + ny * hw];
  const p2 = [s.x2 - nx * hw, s.y2 - ny * hw];
  const p3 = [s.x1 - nx * hw, s.y1 - ny * hw];
  if(p0[0] > ox + VW + 60 && p1[0] > ox + VW + 60) return;
  if(p0[0] < ox - 60 && p3[0] < ox - 60) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]);
  ctx.closePath();
  ctx.fillStyle = "#3a4a42";
  ctx.fill();
  if(typeof applyWaterSimInClip === "function"){
    ctx.save(); ctx.clip();
    applyWaterSimInClip("river", 0.48, 0.018);
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(50,80,70,.35)";
    ctx.fill();
  }
  const[fx, fy] = canalFlowAt((s.x1 + s.x2) * 0.5, (s.y1 + s.y2) * 0.5);
  ctx.strokeStyle = "rgba(120,150,130,.12)"; ctx.lineWidth = 1.2;
  for(let u = 0; u < 1; u += 0.14){
    const px = s.x1 + dx * u, py = s.y1 + dy * u;
    const wob = Math.sin(t * 1.8 + u * 12) * 2;
    ctx.beginPath();
    ctx.moveTo(px + nx * wob, py + ny * wob);
    ctx.lineTo(px + fx * 16 + nx * wob, py + fy * 16 + ny * wob);
    ctx.stroke();
  }
  ctx.restore();
  drawBrickWall(s.x1, s.y1, s.x2, s.y2, hw + 5, "#7a6454");
  drawBrickWall(s.x1, s.y1, s.x2, s.y2, -(hw + 5), "#6a5848");
}

function drawCanalBridge(b, t){
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.a);
  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.fillRect(-b.w * 0.5, -8, b.w, 16);
  ctx.fillStyle = "#6a6058";
  ctx.fillRect(-b.w * 0.5, -7, b.w, 5);
  ctx.fillStyle = "#5a5048";
  ctx.fillRect(-b.w * 0.5, 2, b.w, 5);
  ctx.strokeStyle = "#8a8078"; ctx.lineWidth = 1.2;
  for(let k = -3; k <= 3; k++){
    ctx.beginPath(); ctx.moveTo(k * 14, -9); ctx.lineTo(k * 14, 9); ctx.stroke();
  }
  ctx.fillStyle = "rgba(70,90,80,.25)";
  ctx.fillRect(-b.w * 0.42, 8, b.w * 0.84, 10);
  ctx.restore();
}

function drawCanalEntry(e, t){
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.a);
  const steps = 5;
  for(let s = 0; s < steps; s++){
    const yy = s * 5.5;
    const ww = e.w - s * 2.2;
    ctx.fillStyle = s % 2 ? "#8a7868" : "#7a6858";
    ctx.fillRect(-ww * 0.5, yy, ww, 5);
  }
  ctx.fillStyle = "#4a5a50";
  ctx.fillRect(-e.w * 0.22, e.len - 2, e.w * 0.44, 8);
  ctx.fillStyle = "rgba(200,220,210,.85)";
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("▼", 0, -6 + Math.sin(t * 3) * 1.5);
  ctx.restore();
}

function drawCanals(ox, oy){
  ensureCanals();
  const t = typeof gameTime !== "undefined" ? gameTime : 0;
  for(const s of CANAL_SEGMENTS){
    const mx = (s.x1 + s.x2) * 0.5, my = (s.y1 + s.y2) * 0.5;
    if(mx < ox - 80 || mx > ox + VW + 80 || my < oy - 80 || my > oy + VH + 80) continue;
    drawCanalWaterSeg(s, ox, oy, t);
  }
  for(const b of CANAL_BRIDGES){
    if(b.x < ox - 60 || b.x > ox + VW + 60 || b.y < oy - 60 || b.y > oy + VH + 60) continue;
    drawCanalBridge(b, t);
  }
  for(const e of CANAL_ENTRIES){
    if(e.x < ox - 40 || e.x > ox + VW + 40 || e.y < oy - 40 || e.y > oy + VH + 40) continue;
    drawCanalEntry(e, t);
  }
}

function spawnCanalBoats(){
  if(boats.length >= 18) return;
  ensureCanals();
  for(const s of CANAL_SEGMENTS){
    if(Math.hypot((s.x1 + s.x2) * 0.5 - focusX, (s.y1 + s.y2) * 0.5 - focusY) > 900) continue;
    if(hsh((s.x1 | 0), (s.y1 | 0), 951) > 0.42) continue;
    const mx = (s.x1 + s.x2) * 0.5, my = (s.y1 + s.y2) * 0.5;
    if(canalScore(mx, my) < 0.3) continue;
    let near = false;
    for(const b of boats){ if((b.x - mx) ** 2 + (b.y - my) ** 2 < 50 * 50){ near = true; break; } }
    if(near) continue;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    boats.push({
      x: mx, y: my, a: Math.atan2(dy, dx),
      v: 0, vx: 0, vy: 0, turn: (rng() < 0.5 ? 1 : -1),
      kind: "row", color: pick(["#5a4838", "#6a5848", "#4a3828"]),
      spd: rand(18, 30), riderShirt: pick(SHIRT), riderSkin: pick(SKIN),
      L: 30, W: 20, moored: true, canal: true,
    });
    if(boats.length >= 18) break;
  }
}

function canalSpawnPoint(){
  ensureCanals();
  if(!CANAL_ENTRIES.length) return null;
  const e = CANAL_ENTRIES[0];
  const ca = Math.cos(e.a), sa = Math.sin(e.a);
  return {
    x: e.x + ca * (e.len - 4), y: e.y + sa * (e.len - 4),
    i: Math.round(e.x / GAP), j: Math.round(e.y / GAP),
    label: "Kanały — Starówka Vesper City", biome: "city",
  };
}

Game.register({
  id: "canals",
  order: 47,
  drawAfterRoads(ox, oy){ drawCanals(ox, oy); },
  update(dt){
    if(typeof gamePhase !== "undefined" && gamePhase !== "playing") return;
    spawnCanalBoats();
    const promptEl = document.getElementById("prompt");
    if(!promptEl || mode !== "foot") return;
    if(typeof invOpen !== "undefined" && invOpen) return;
    const entry = nearestCanalEntry(ped.x, ped.y, 36);
    if(entry && !inCanalWater(ped.x, ped.y) && !inWater(ped.x, ped.y)){
      promptEl.style.opacity = "1";
      promptEl.textContent = "F — zejdź do kanału";
    }
  },
  drawMap(mctx, opts){
    if(!opts || !opts.world) return;
    ensureCanals();
    const ms = opts.mapScale || 1, ox = opts.ox || 0, oy = opts.oy || 0;
    mctx.strokeStyle = "rgba(60,100,90,.75)"; mctx.lineWidth = Math.max(2, 3 * ms);
    mctx.lineCap = "round";
    for(const s of CANAL_SEGMENTS){
      mctx.beginPath();
      mctx.moveTo((s.x1 - ox) * ms, (s.y1 - oy) * ms);
      mctx.lineTo((s.x2 - ox) * ms, (s.y2 - oy) * ms);
      mctx.stroke();
    }
    for(const e of CANAL_ENTRIES){
      const x = (e.x - ox) * ms, y = (e.y - oy) * ms;
      mctx.fillStyle = "#3a6a58";
      mctx.beginPath(); mctx.arc(x, y, 4 * ms, 0, 7); mctx.fill();
    }
  },
});
