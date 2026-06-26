/* TOPDOWN CITY — 00-core.js */
"use strict";
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
const cvLabels = document.getElementById("cv-labels");
const ctxLabels = cvLabels ? cvLabels.getContext("2d") : null;
const PX = 2;                              // chunky pixel size (GTA2 look)
let ZOOM = 2.0;                            // world magnification (Ctrl+scroll: 1..5, higher = closer camera)
let DPR = Math.min(2, window.devicePixelRatio || 1);
let VW = 0, VH = 0;
function resize(){
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  if(typeof perfMaxDpr==="function") dpr=Math.min(dpr, perfMaxDpr());
  DPR = dpr;
  VW = window.innerWidth/ZOOM; VH = window.innerHeight/ZOOM;             // visible world size (smaller = zoomed in)
  cv.width = Math.ceil(window.innerWidth/PX); cv.height = Math.ceil(window.innerHeight/PX);   // backing buffer (screen / PX)
  cv.style.width = window.innerWidth+"px"; cv.style.height = window.innerHeight+"px";
  if(cvLabels){
    cvLabels.width = Math.ceil(window.innerWidth);
    cvLabels.height = Math.ceil(window.innerHeight);
    cvLabels.style.width = window.innerWidth+"px";
    cvLabels.style.height = window.innerHeight+"px";
  }
  ctx.setTransform(ZOOM/PX,0,0,ZOOM/PX,0,0);
  ctx.imageSmoothingEnabled = false;
}
function clearLabelLayer(){
  if(!ctxLabels||!cvLabels) return;
  ctxLabels.setTransform(1,0,0,1,0,0);
  ctxLabels.clearRect(0,0,cvLabels.width,cvLabels.height);
}
function drawWorldLabel(wx, wy, text, opts){
  if(!ctxLabels||text==null||text==="") return;
  opts=opts||{};
  const ox=cam.x-VW/2, oy=cam.y-VH/2;
  const sx=(wx-ox)*ZOOM, sy=(wy-oy)*ZOOM;
  ctxLabels.save();
  ctxLabels.setTransform(1,0,0,1,0,0);
  ctxLabels.imageSmoothingEnabled=true;
  ctxLabels.font=opts.font||"700 13px 'DM Mono', monospace";
  ctxLabels.fillStyle=opts.color||"#fff";
  ctxLabels.textAlign=opts.align||"center";
  ctxLabels.textBaseline=opts.baseline||"alphabetic";
  if(opts.stroke){
    ctxLabels.lineWidth=opts.strokeWidth||3;
    ctxLabels.strokeStyle=opts.stroke;
    ctxLabels.strokeText(text,sx,sy);
  }
  ctxLabels.fillText(text,sx,sy);
  ctxLabels.restore();
}
function drawScreenLabel(sx, sy, text, opts){
  if(!ctxLabels||text==null||text==="") return;
  opts=opts||{};
  ctxLabels.save();
  ctxLabels.setTransform(1,0,0,1,0,0);
  ctxLabels.imageSmoothingEnabled=true;
  ctxLabels.font=opts.font||"700 13px 'DM Mono', monospace";
  ctxLabels.fillStyle=opts.color||"#fff";
  ctxLabels.textAlign=opts.align||"left";
  ctxLabels.textBaseline=opts.baseline||"alphabetic";
  if(opts.stroke){
    ctxLabels.lineWidth=opts.strokeWidth||3;
    ctxLabels.strokeStyle=opts.stroke;
    ctxLabels.strokeText(text,sx,sy);
  }
  ctxLabels.fillText(text,sx,sy);
  ctxLabels.restore();
}
window.drawWorldLabel=drawWorldLabel;
window.drawScreenLabel=drawScreenLabel;
window.clearLabelLayer=clearLabelLayer;
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

/** Load PNG sprites from meta.json; always settles pack.ready (timeout + per-image fallback). */
function bootSpritePack(pack, metaUrl, buildJobs, timeoutMs){
  timeoutMs=timeoutMs!=null?timeoutMs:14000;
  let settled=false;
  const finish=()=>{ if(settled) return; settled=true; pack.ready=true; };
  setTimeout(finish, timeoutMs);
  fetch(metaUrl).then(r=>{
    if(!r.ok) throw new Error("meta:"+r.status);
    return r.json();
  }).then(meta=>{
    pack.meta=meta;
    const jobs=buildJobs(meta)||[];
    let left=jobs.length;
    if(!left){ finish(); return; }
    const imgMs=Math.max(4000, timeoutMs-800);
    for(const job of jobs){
      let done=false;
      const bump=()=>{
        if(done) return;
        done=true;
        if(--left<=0) finish();
      };
      const im=new Image();
      im.onload=im.onerror=bump;
      setTimeout(bump, imgMs);
      im.src=job.src;
      job.apply(pack, im);
    }
  }).catch(finish);
}
window.bootSpritePack=bootSpritePack;

