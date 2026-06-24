/* TOPDOWN CITY — 49-farm-fields.js — pola uprawne, sady, strachy na wróble */

const FARM_NAMES = {
  grain: ["Pole pszenicy", "Łany jęczmienne", "Złote pole", "Uprawa zbożowa"],
  veg: ["Warzywniak", "Pole kapusty", "Ogródek warzywny", "Plantacja marchwi"],
  orchard: ["Sad jabłoni", "Gaj owocowy", "Sad wiśniowy", "Sady pod miastem"],
};

const GRAIN_COL = ["#c8a848", "#b89838", "#d4b050", "#a88830", "#e0c060"];
const VEG_KINDS = [
  {id: "cabbage", col: "#4a7a38", hi: "#6a9a48", label: "kapusta"},
  {id: "carrot", col: "#c87838", hi: "#4a8a30", label: "marchew"},
  {id: "beet", col: "#8a3848", hi: "#5a8a38", label: "burak"},
  {id: "lettuce", col: "#6a9a48", hi: "#8aba58", label: "sałata"},
];

function farmRoll(i, j, salt){
  return hsh(i, j, salt);
}

function farmEligible(lot, i, j){
  if(lot.water || lot.mountain || lot.mega || lot.parking || lot.cemetery) return false;
  if(lot.salon || lot.gunshop || lot.motodealer || lot.oldtown || lot.church) return false;
  if(lot.w < 130 || lot.h < 130) return false;
  if(lot.buildings.length) return false;
  const b = biomeOf(i, j), c = nearestCity(i, j);
  if(b === "forest"){
    if(c.dist < c.R * 1.08 || c.dist > c.R * 3.2) return false;
    if(isRiverAt((i + 0.5) * GAP, (j + 0.5) * GAP)) return false;
    return farmRoll(i, j, 831) < 0.24;
  }
  if(b === "city" && lot.empty){
    if(lot.zone === "suburb" && c.dist < c.R * 1.2) return farmRoll(i, j, 832) < 0.16;
    if((lot.zone === "transition" || lot.zone === "midrise") && c.dist < c.R * 1.05) return farmRoll(i, j, 833) < 0.07;
  }
  return false;
}

function pickFarmType(i, j){
  const r = farmRoll(i, j, 834);
  if(r < 0.62) return "grain";
  if(r < 0.82) return "veg";
  return "orchard";
}

function genFarmLot(lot, i, j){
  const r = lot._r || lotRng(i, j);
  const m = 12;
  const x0 = lot.x + m, y0 = lot.y + m, w = lot.w - 2 * m, h = lot.h - 2 * m;
  const type = pickFarmType(i, j);
  const rows = type === "orchard" ? 4 + (r() * 3 | 0) : 7 + (r() * 6 | 0);
  const cols = type === "orchard" ? 5 + (r() * 4 | 0) : 9 + (r() * 8 | 0);
  const strips = [];
  const cropRowH = h / rows;

  if(type === "grain"){
    const base = GRAIN_COL[(farmRoll(i, j, 835) * GRAIN_COL.length) | 0];
    for(let row = 0; row < rows; row++){
      const ry = y0 + row * cropRowH;
      const ripe = row / rows;
      strips.push({
        x: x0, y: ry + 1, w, h: cropRowH - 2,
        col: shade(base, -8 + ripe * 14),
        hi: shade(base, 12 + ripe * 8),
        kind: "grain",
      });
    }
  } else if(type === "veg"){
    for(let row = 0; row < rows; row++){
      const vk = VEG_KINDS[(farmRoll(i, j, 836 + row) * VEG_KINDS.length) | 0];
      const ry = y0 + row * cropRowH;
      strips.push({
        x: x0, y: ry + 1, w, h: cropRowH - 2,
        col: vk.col, hi: vk.hi, kind: "veg", veg: vk.id,
      });
    }
  } else {
    const trees = [];
    const stepX = w / (cols + 1), stepY = h / (rows + 1);
    for(let row = 0; row < rows; row++){
      for(let col = 0; col < cols; col++){
        if(r() < 0.06) continue;
        const ox = (row % 2) ? stepX * 0.5 : 0;
        trees.push({
          x: x0 + stepX * (col + 1) + ox,
          y: y0 + stepY * (row + 1),
          s: 14 + r() * 10,
          fruit: r() < 0.55 ? "#c83838" : r() < 0.8 ? "#e8a830" : "#6a8a38",
          kind: r() < 0.5 ? "apple" : "cherry",
        });
      }
    }
    lot.farmTrees = trees;
  }

  const scarecrows = [];
  const nSc = 1 + (farmRoll(i, j, 840) * 2.6 | 0);
  for(let k = 0; k < nSc; k++){
    scarecrows.push({
      x: x0 + w * (0.18 + farmRoll(i, j, 841 + k) * 0.64),
      y: y0 + h * (0.15 + farmRoll(i, j, 851 + k) * 0.7),
      a: farmRoll(i, j, 861 + k) * 6.28,
      hat: r() < 0.5 ? "#4a3828" : "#6a5038",
      shirt: pick(["#3a5a8a", "#8a4038", "#6a6848", "#4a6a48"]),
    });
  }

  const props = [];
  const nHay = 2 + (r() * 4 | 0);
  for(let k = 0; k < nHay; k++){
    props.push({
      t: "hay", x: x0 + 16 + r() * (w - 32), y: y0 + 16 + r() * (h - 32),
      s: 10 + r() * 8, a: r() * 6.28,
    });
  }
  if(r() < 0.55){
    props.push({
      t: "wheelbarrow",
      x: x0 + w * (0.08 + r() * 0.2), y: y0 + h * (0.7 + r() * 0.2),
      a: r() * 0.8 - 0.4,
    });
  }

  let barn = null;
  if(r() < 0.72){
    const bw = Math.min(56, w * 0.22), bh = Math.min(44, h * 0.18);
    barn = {
      x: x0 + w - bw - 8, y: y0 + 6, w: bw, h: bh,
      col: pick(["#8a6848", "#7a5840", "#9a7858"]),
      roof: pick(["#6a4030", "#5a3828", "#7a4838"]),
    };
  }

  const fx0 = lot.x + 5, fx1 = lot.x + lot.w - 5, fy0 = lot.y + 5, fy1 = lot.y + lot.h - 5;
  const gx = (fx0 + fx1) / 2, gwid = 22;
  lot.fences = [
    {x1: fx0, y1: fy0, x2: fx1, y2: fy0}, {x1: fx0, y1: fy0, x2: fx0, y2: fy1},
    {x1: fx1, y1: fy0, x2: fx1, y2: fy1},
    {x1: fx0, y1: fy1, x2: gx - gwid, y2: fy1}, {x1: gx + gwid, y1: fy1, x2: fx1, y2: fy1},
  ];
  lot.farmGate = {x: gx, y: fy1, w: gwid};

  lot.farm = true;
  lot.farmType = type;
  lot.farmData = {type, x0, y0, w, h, rows, cols, strips, scarecrows, barn, props};
  lot.zone = "farm";
  lot.empty = true;
  lot.props = props;
  lot.tufts = [];
  lot.forestFloor = [];
  lot.flowers = [];
}

function drawGrainStrip(s, t){
  ctx.fillStyle = s.col;
  ctx.fillRect(s.x, s.y, s.w, s.h);
  const step = 7;
  ctx.strokeStyle = s.hi;
  ctx.lineWidth = 1.1;
  ctx.globalAlpha = 0.55;
  for(let y = s.y + 2; y < s.y + s.h; y += step){
    const wob = Math.sin((y + s.x) * 0.08 + t * 1.6) * 1.2;
    ctx.beginPath();
    ctx.moveTo(s.x + 2, y);
    for(let x = s.x + 2; x < s.x + s.w - 2; x += 10){
      ctx.lineTo(x, y + wob + Math.sin(x * 0.15 + t) * 0.8);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,230,140,.12)";
  for(let k = 0; k < s.w * s.h / 900; k++){
    const px = s.x + ((k * 97 + s.y) % (s.w | 1)), py = s.y + ((k * 53) % (s.h | 1));
    ctx.fillRect(px, py, 1.2, 2.2);
  }
}

function drawVegStrip(s){
  ctx.fillStyle = shade(s.col, -12);
  ctx.fillRect(s.x, s.y, s.w, s.h);
  const n = Math.max(4, (s.w / 18) | 0);
  for(let k = 0; k < n; k++){
    const px = s.x + (k + 0.5) * (s.w / n), py = s.y + s.h * 0.5;
    if(s.veg === "carrot"){
      ctx.fillStyle = "#4a8a30";
      ctx.beginPath(); ctx.ellipse(px, py - 3, 4, 2.2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#d87830";
      ctx.fillRect(px - 1.2, py, 2.4, 5);
    } else if(s.veg === "beet"){
      ctx.fillStyle = "#5a8a38";
      ctx.beginPath(); ctx.ellipse(px, py - 4, 5, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#9a3848";
      ctx.beginPath(); ctx.arc(px, py + 1, 3.2, 0, 7); ctx.fill();
    } else if(s.veg === "lettuce"){
      ctx.fillStyle = s.hi;
      for(let l = 0; l < 5; l++){
        const ang = l / 5 * 6.28;
        ctx.beginPath(); ctx.ellipse(px + Math.cos(ang) * 3, py + Math.sin(ang) * 2, 3.5, 2, ang, 0, 7); ctx.fill();
      }
    } else {
      ctx.fillStyle = s.col;
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, 7); ctx.fill();
      ctx.fillStyle = s.hi;
      ctx.beginPath(); ctx.arc(px - 1.5, py - 2, 2.5, 0, 7); ctx.fill();
    }
  }
}

function drawFarmTree(tr, t){
  const sway = typeof windAmp !== "undefined" ? Math.sin((typeof windT !== "undefined" ? windT : 0) * 1.5 + tr.x * 0.02) * windAmp * 4 : 0;
  ctx.save();
  ctx.translate(tr.x + sway, tr.y);
  ctx.fillStyle = "rgba(40,32,20,.2)";
  ctx.beginPath(); ctx.ellipse(2, 2, tr.s * 0.35, tr.s * 0.12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#6a5038";
  ctx.fillRect(-1.5, -tr.s * 0.35, 3, tr.s * 0.38);
  ctx.fillStyle = tr.kind === "cherry" ? "#3a6a32" : "#4a7a38";
  ctx.beginPath(); ctx.arc(0, -tr.s * 0.42, tr.s * 0.42, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(180,220,140,.2)";
  ctx.beginPath(); ctx.arc(-tr.s * 0.12, -tr.s * 0.52, tr.s * 0.18, 0, 7); ctx.fill();
  const n = 4 + (tr.s / 4 | 0);
  for(let k = 0; k < n; k++){
    const ang = k / n * 6.28 + tr.x * 0.01;
    const fx = Math.cos(ang) * tr.s * 0.28, fy = -tr.s * 0.42 + Math.sin(ang) * tr.s * 0.22;
    ctx.fillStyle = tr.fruit;
    ctx.beginPath(); ctx.arc(fx, fy, 1.8 + (k % 2), 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawScarecrow(sc, t){
  const sway = typeof windAmp !== "undefined" ? Math.sin((typeof windT !== "undefined" ? windT : 0) * 2.1 + sc.x * 0.03) * (6 + windAmp * 18) : 0;
  ctx.save();
  ctx.translate(sc.x, sc.y);
  ctx.rotate(sc.a + sway * 0.012);
  ctx.fillStyle = "rgba(30,24,16,.22)";
  ctx.beginPath(); ctx.ellipse(0, 3, 7, 2.5, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#5a4830"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(11, -14); ctx.stroke();
  ctx.fillStyle = sc.shirt;
  ctx.fillRect(-7, -20, 14, 12);
  ctx.fillStyle = "#d8c8a0";
  ctx.beginPath(); ctx.arc(0, -24, 5, 0, 7); ctx.fill();
  ctx.fillStyle = "#1a1410";
  ctx.beginPath(); ctx.arc(-2, -25, 0.9, 0, 7); ctx.arc(2, -25, 0.9, 0, 7); ctx.fill();
  ctx.fillStyle = "#8a2020";
  ctx.beginPath(); ctx.moveTo(-3, -22); ctx.lineTo(3, -22); ctx.lineTo(0, -20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = sc.hat;
  ctx.fillRect(-6, -30, 12, 4);
  ctx.fillRect(-4, -34, 8, 5);
  ctx.restore();
  if(typeof windAmp !== "undefined" && windAmp > 0.08){
    ctx.save();
    ctx.translate(sc.x + 10, sc.y - 28 + sway * 0.3);
    ctx.fillStyle = "#1a1814";
    ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 1.2, 0.3, 0, 7); ctx.fill();
    ctx.restore();
  }
}

function drawHayBale(p){
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a || 0);
  ctx.fillStyle = "#b89848";
  ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#8a7838"; ctx.lineWidth = 0.8;
  for(let k = -2; k <= 2; k++){
    ctx.beginPath(); ctx.moveTo(k * 3, -p.s * 0.5); ctx.lineTo(k * 3, p.s * 0.5); ctx.stroke();
  }
  ctx.restore();
}

function drawWheelbarrow(p){
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a || 0);
  ctx.fillStyle = "#6a5848";
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, -4); ctx.lineTo(10, 2); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#4a3828"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-12, 8); ctx.stroke();
  ctx.fillStyle = "#3a3430";
  ctx.beginPath(); ctx.arc(-12, 9, 3, 0, 7); ctx.fill();
  ctx.restore();
}

function drawFarmBarn(b){
  ctx.fillStyle = b.col;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = b.roof;
  ctx.beginPath();
  ctx.moveTo(b.x - 3, b.y);
  ctx.lineTo(b.x + b.w * 0.5, b.y - b.h * 0.45);
  ctx.lineTo(b.x + b.w + 3, b.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a3028";
  ctx.fillRect(b.x + b.w * 0.38, b.y + b.h * 0.35, b.w * 0.24, b.h * 0.55);
}

function drawFarmLot(L){
  const F = L.farmData;
  if(!F) return;
  const t = typeof gameTime !== "undefined" ? gameTime : performance.now() * 0.001;
  const base = F.type === "grain" ? "#a89048" : F.type === "veg" ? "#5a7a40" : "#6a8a48";
  ctx.fillStyle = base;
  ctx.fillRect(F.x0, F.y0, F.w, F.h);
  ctx.fillStyle = "rgba(255,240,200,.06)";
  ctx.fillRect(F.x0, F.y0, F.w, F.h);

  if(F.type === "orchard" && L.farmTrees){
    for(const tr of L.farmTrees) drawFarmTree(tr, t);
  } else {
    for(const s of F.strips){
      if(s.kind === "grain") drawGrainStrip(s, t);
      else drawVegStrip(s);
    }
  }
  if(F.barn) drawFarmBarn(F.barn);
  for(const p of F.props || []){
    if(p.t === "hay") drawHayBale(p);
    else if(p.t === "wheelbarrow") drawWheelbarrow(p);
  }
  for(const sc of F.scarecrows || []) drawScarecrow(sc, t);
  if(L.farmGate){
    const G = L.farmGate;
    ctx.fillStyle = "#6a5840";
    ctx.fillRect(G.x - G.w - 2, G.y - 7, 4, 9);
    ctx.fillRect(G.x + G.w - 2, G.y - 7, 4, 9);
  }
}

function farmGroundColor(L){
  if(!L.farm || !L.farmData) return null;
  if(L.farmType === "grain") return "#a89048";
  if(L.farmType === "veg") return "#5a7a40";
  return "#6a8a48";
}

Game.register({
  id: "farm-fields",
  order: 49,
  onLot(lot, i, j){
    if(lot.farm || lot.water || lot.mountain) return;
    if(!farmEligible(lot, i, j)) return;
    genFarmLot(lot, i, j);
  },
  drawAfterRoads(ox, oy){
    const i0 = Math.floor((ox - NODE_VAR * 2) / GAP) - 2, i1 = Math.floor((ox + VW + NODE_VAR * 2) / GAP) + 2;
    const j0 = Math.floor((oy - NODE_VAR * 2) / GAP) - 2, j1 = Math.floor((oy + VH + NODE_VAR * 2) / GAP) + 2;
    for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++){
      const L = getLot(i, j);
      if(!L.farm) continue;
      const cx = L.x + L.w * 0.5, cy = L.y + L.h * 0.5;
      if(cx < ox - 80 || cx > ox + VW + 80 || cy < oy - 80 || cy > oy + VH + 80) continue;
      drawFarmLot(L);
      if(typeof drawFences === "function") drawFences(L);
    }
  },
  drawMap(mctx, opts){
    if(!opts || !opts.world) return;
    const ms = opts.mapScale || 1, ox = opts.ox || 0, oy = opts.oy || 0;
    mctx.fillStyle = "#b89840";
    for(const[key, lot] of lotCache){
      if(!lot.farm) continue;
      const x = (lot.x + lot.w * 0.5 - ox) * ms, y = (lot.y + lot.h * 0.5 - oy) * ms;
      mctx.fillStyle = lot.farmType === "veg" ? "#5a8a38" : lot.farmType === "orchard" ? "#4a7a30" : "#b89840";
      mctx.fillRect(x - 4 * ms, y - 4 * ms, 8 * ms, 8 * ms);
    }
  },
});
