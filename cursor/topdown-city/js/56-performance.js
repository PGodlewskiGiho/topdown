/* TOPDOWN CITY — 56-performance.js — quality presets for weaker laptops */

const PERF_STORAGE_KEY = "topdown-perf-quality";
let perfQuality = "auto"; // auto | high | medium | low

function detectWeakDevice(){
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  return cores <= 4 || mem <= 4;
}

function perfTier(){
  if(perfQuality === "low") return 1;
  if(perfQuality === "medium") return 2;
  if(perfQuality === "high") return 3;
  return detectWeakDevice() ? 2 : 3;
}

function perfEffectiveVw(){ return VW + (perfTier() === 1 ? 900 : perfTier() === 2 ? 500 : 0); }
function perfEntityScale(){ return perfTier() === 1 ? 0.36 : perfTier() === 2 ? 0.68 : 1; }
function perfUpdateRadius(){ return perfTier() === 1 ? 780 : perfTier() === 2 ? 1080 : 1500; }
function perfShouldUpdateEntity(x, y){
  if(perfTier() >= 3) return true;
  const r = perfUpdateRadius();
  return Math.hypot(x - focusX, y - focusY) < r || Math.hypot(x - cam.x, y - cam.y) < r;
}
function perfLightOcclusion(){ return perfTier() === 1; }
function perfSkipPedOcclusion(){ return perfTier() <= 2; }
function perfSkipTreeGhost(){ return perfTier() === 1; }
function perfSkipCanopyShades(){ return perfTier() === 1; }
function perfSimpleTrees(){ return perfTier() === 1; }
function perfVehicleLodDist(){ return perfTier() === 1 ? 200 : perfTier() === 2 ? 460 : 1e9; }
function perfPedLodDist(){ return perfTier() === 1 ? 240 : perfTier() === 2 ? 380 : 1e9; }
function perfTrafficScanDist(){ return perfTier() === 1 ? 160 : perfTier() === 2 ? 260 : 1e9; }
function perfRainScale(){ return perfTier() === 1 ? 0.35 : perfTier() === 2 ? 0.62 : 1; }
function perfMinimapEvery(){ return perfTier() === 1 ? 3 : perfTier() === 2 ? 2 : 1; }
function perfMaxDpr(){ return perfTier() === 1 ? 1 : perfTier() === 2 ? 1.5 : 2; }
function perfTerrainStep(){ return perfTier() === 1 ? 44 : perfTier() === 2 ? 28 : null; }
function perfSkipTerrainCreases(){ return perfTier() === 1; }
function perfSkipWetRoads(){ return perfTier() === 1; }
function perfSkipSpeech(){ return perfTier() <= 1; }
function perfSkipVignette(){ return perfTier() === 1; }
function perfWildlifeUpdates(){ return perfTier() >= 2; }
function perfCityAudioHz(){ return perfTier() === 1 ? 8 : perfTier() === 2 ? 12 : 0; }
function perfBuildingGhostLerp(){ return perfTier() >= 2; }

function perfQualityLabel(){
  if(perfQuality === "auto"){
    const t = perfTier();
    return "Auto (" + (t === 1 ? "niska" : t === 2 ? "średnia" : "wysoka") + ")";
  }
  if(perfQuality === "low") return "Niska";
  if(perfQuality === "medium") return "Średnia";
  return "Wysoka";
}

function setPerfQuality(mode){
  perfQuality = mode || "auto";
  try{ localStorage.setItem(PERF_STORAGE_KEY, perfQuality); }catch(e){}
  if(typeof resize === "function") resize();
  if(typeof trimLivingWorldToCaps === "function") trimLivingWorldToCaps();
  if(typeof refreshPerfPauseUi === "function") refreshPerfPauseUi();
}

function loadPerfSettings(){
  try{
    const saved = localStorage.getItem(PERF_STORAGE_KEY);
    if(saved === "auto" || saved === "high" || saved === "medium" || saved === "low") perfQuality = saved;
  }catch(e){}
}

function drawVehicleSimple(v, color){
  const L = v.L || 72, W = v.W || 34;
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.a + Math.PI / 2);
  ctx.fillStyle = color || v.color || "#8a9098";
  ctx.fillRect(-W * 0.5, -L * 0.5, W, L);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(-W * 0.42, -L * 0.38, W * 0.84, L * 0.34);
  ctx.fillStyle = "#1a1c22";
  const wx = W * 0.34, wy = L * 0.28;
  for(const [sx, sy] of [[-wx, -wy], [wx, -wy], [-wx, wy], [wx, wy]]){
    ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawTreeCanopySimple(t){
  if(!t || !t.outline) return;
  const pal = (typeof TREE_PAL !== "undefined" && TREE_PAL[t.kind]) || {m:"#307038", h:"#58a850"};
  const R = t.crownR || t.s * 0.35;
  const lean = typeof treeLean === "function" ? treeLean(t) : [0, 0];
  const ax = t.x + lean[0], ay = t.y + lean[1];
  ctx.fillStyle = pal.m || "#307038";
  ctx.beginPath(); ctx.ellipse(ax, ay - R * 0.12, R * 0.9, R * 0.68, 0, 0, 7); ctx.fill();
  ctx.fillStyle = pal.h || "#58a850";
  ctx.beginPath(); ctx.ellipse(ax - R * 0.14, ay - R * 0.26, R * 0.36, R * 0.24, 0, 0, 7); ctx.fill();
}

function drawTreeTrunkSimple(p){
  const tw = Math.max(3, (p.trunk?.tw || p.s * 0.08) * 1.1);
  ctx.fillStyle = "#5a4030";
  ctx.fillRect(p.x - tw, p.y - tw * 0.35, tw * 2, tw * 1.05);
}

function drawPersonSimple(p, color, down, targetCtx){
  const c = targetCtx || ctx;
  const sc = ((p.r || 9) / 9) * 2.05;
  const shirt = p.shirt || color || "#3a6ea5";
  c.save();
  c.translate(p.x, p.y);
  if(down){ c.rotate(0.4); c.globalAlpha = 0.85; }
  c.fillStyle = "rgba(0,0,0,.22)";
  c.fillRect(-6 * sc, 2 * sc, 12 * sc, 3 * sc);
  c.fillStyle = shirt;
  c.fillRect(-5 * sc, -8 * sc, 10 * sc, 14 * sc);
  c.fillStyle = p.skin || "#e8b888";
  c.beginPath(); c.arc(0, -10 * sc, 4 * sc, 0, Math.PI * 2); c.fill();
  c.restore();
}

function refreshPerfPauseUi(){
  const box = document.getElementById("pause-perf-body");
  if(!box) return;
  for(const btn of box.querySelectorAll("[data-perf]")){
    btn.classList.toggle("on", btn.dataset.perf === perfQuality);
  }
  const hint = document.getElementById("pause-perf-hint");
  if(hint){
    const t = perfTier();
    const tips = {
      1: "Proste korony drzew, mniej NPC, auta jako prostokąty w oddali, bez cieni pod drzewami.",
      2: "Umiarkowane limity AI i LOD — dobry balans na słabszy laptop.",
      3: "Pełna szczegółowość — dla mocniejszego sprzętu.",
    };
    hint.textContent = "Aktywnie: " + perfQualityLabel() + ". " + (tips[t] || "");
  }
}

loadPerfSettings();
