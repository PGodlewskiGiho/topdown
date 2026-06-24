/* TOPDOWN CITY — 00-core.js */
"use strict";
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
const PX = 2;                              // chunky pixel size (GTA2 look)
let ZOOM = 2.0;                            // world magnification (Ctrl+scroll: 1..5, higher = closer camera)
let DPR = Math.min(2, window.devicePixelRatio || 1);
let VW = 0, VH = 0;
function resize(){
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = window.innerWidth/ZOOM; VH = window.innerHeight/ZOOM;             // visible world size (smaller = zoomed in)
  cv.width = Math.ceil(window.innerWidth/PX); cv.height = Math.ceil(window.innerHeight/PX);   // backing buffer (screen / PX)
  cv.style.width = window.innerWidth+"px"; cv.style.height = window.innerHeight+"px";
  ctx.setTransform(ZOOM/PX,0,0,ZOOM/PX,0,0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", resize); resize();
window.addEventListener("wheel", e=>{ if(!e.ctrlKey) return; e.preventDefault();
  ZOOM = clamp(ZOOM*(e.deltaY<0?1.1:1/1.1), 1, 5); resize(); }, {passive:false});

/* ---------- deterministic RNG (re-seeded per world) ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rng = mulberry32(20260616);
function setGlobalRngSeed(seed){
  const s=(Math.imul(seed>>>0,2246822519)^0xA5B7C9D1)>>>0||1;
  rng=mulberry32(s);
}
const rand=(a,b)=>a+(b-a)*rng();
const pick=arr=>arr[(rng()*arr.length)|0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const randInt=(a,b)=>a+Math.floor(rng()*(b-a+1));

