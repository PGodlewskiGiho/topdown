/* people-sprites.js — GTA2 modular PNG pedestrians (lazy-loaded layers) */
(function(global){
"use strict";

const BUILD=2026062315;
const BASE="assets/people/gta2/parts/bodies/";
const META_URL="assets/people/gta2/meta.json";
const GO=global.Gta2Outfit;
const LS=global.LivingSprite;
const imgs={};
const pending=new Set();
let meta=null, loadP=null, ready=false;

const BUILD_SCALE={
  slim:{sx:0.88,sy:1.02},
  average:{sx:1.0,sy:1.0},
  athletic:{sx:0.94,sy:1.04},
  stocky:{sx:1.08,sy:1.06},
  hardy:{sx:1.12,sy:1.08},
};

function queueImg(path){
  if(!path||pending.has(path)||(imgs[path]&&imgs[path].complete)) return;
  pending.add(path);
  const im=new Image();
  im.onload=im.onerror=()=>{ pending.delete(path); };
  im.src=path+"?v="+BUILD;
  imgs[path]=im;
}

function getImg(path){
  const im=imgs[path];
  if(im&&im.complete&&im.naturalWidth>0) return im;
  queueImg(path);
  return null;
}

function init(){
  if(loadP) return loadP;
  loadP=fetch(META_URL+"?v="+BUILD)
    .then(r=>{
      if(!r.ok) throw new Error("meta:"+r.status);
      return r.json();
    })
    .then(m=>{
      meta=m;
      ready=true;
    })
    .catch(e=>{
      console.warn("PeopleSprites meta load failed",e);
      ready=false;
    });
  return loadP;
}

function pick(arr, seed){ return arr[Math.abs(seed)%arr.length]; }

function resolveOutfit(p){
  if(p._gta2Outfit) return p._gta2Outfit;
  if(!meta) return null;
  if(GO) GO.applyGta2Ids(p);
  const seed=p._visSeed!=null?p._visSeed:((p.x|0)*7919+(p.y|0)*6151)|0;
  const body=GO?GO.bodyType(p):(p.body||"male");
  const shirts=meta.shirts||[];
  let pants=meta.pants||[];
  if(GO) pants=GO.filterPantsForGender(pants, body, meta.rules, seed);
  const skins=meta.skins||[];
  const hairs=meta.hairs||[];
  const defs=meta.rules&&meta.rules.body_build_default||{};
  const o={
    body,
    build:p.build||(defs[body]||"average"),
    shirt:p.shirtId||pick(shirts, seed+31).id,
    pants:p.pantsId||(body==="female"&&GO&&GO.pickFemalePants?GO.pickFemalePants(pants, seed):pick(pants, seed+17).id),
    skin:p.skinId||pick(skins, seed+5).id,
    hair:p.hairId!=null?p.hairId:pick(hairs, seed+59).id,
  };
  if(p.shirtId) o.shirt=p.shirtId;
  if(p.pantsId) o.pants=p.pantsId;
  if(p.skinId) o.skin=p.skinId;
  if(p.hairId) o.hair=p.hairId;
  if(p.hairStyle==="bald"||p.hair==null) o.hair=null;
  p._gta2Outfit=o;
  return o;
}

function layerPaths(o, wf, direction){
  const order=meta.layer_order||["shoes","pants","arms","torso","skin","hair"];
  const b=o.body||"male";
  const map={
    shoes:"shoes/"+o.pants,
    pants:"pants/"+o.pants,
    arms:"arms/"+o.shirt,
    torso:"torsos/"+o.shirt,
    skin:"skins/"+o.skin,
    hair:o.hair?"hairs/"+o.hair:null,
  };
  const out=[];
  for(const k of order){
    const rel=map[k];
    if(!rel) continue;
    out.push(BASE+b+"/"+rel+"/"+wf+"/"+direction+".png");
  }
  return out;
}

function prefetchOutfit(o, wf, direction){
  for(const path of layerPaths(o, wf, direction)) queueImg(path);
  const alt=wf==="walk0"?"walk1":"walk0";
  for(const path of layerPaths(o, alt, direction)) queueImg(path);
}

function buildMul(o, p){
  const b=BUILD_SCALE[o.build]||BUILD_SCALE.average;
  const h=clamp(p.height!=null?p.height:1, 0.86, 1.14);
  return {sx:b.sx*h, sy:b.sy*h};
}

function clamp(v,a,b){ return v<a?a:v>b?b:v; }

function drawComposite(c, p, down){
  const o=resolveOutfit(p);
  if(!o) return;
  const rad=((p.r||9)/9);
  const bm=buildMul(o, p);
  const sc=rad*2.05;
  const sx=sc*bm.sx, sy=sc*bm.sy;
  const ax=(meta.anchor||[11,21])[0]*sc;
  const ay=(meta.anchor||[11,21])[1]*sc;
  c.imageSmoothingEnabled=false;

  c.fillStyle="rgba(0,0,0,.28)";
  c.fillRect(-7*sc, 2*sc, 14*sc, 3*sc);

  const wf=LS.walkFrameName(p, down);
  const dir=LS.dirName(p);
  prefetchOutfit(o, wf, dir);
  let drew=false;
  for(const path of layerPaths(o, wf, dir)){
    const im=getImg(path);
    if(!im) continue;
    drew=true;
    c.drawImage(im, -ax*bm.sx, -ay*bm.sy, im.width*sx, im.height*sy);
  }

  if(!drew) return;

  if(down){
    c.save();
    c.rotate(Math.PI/2);
    c.fillStyle="rgba(0,0,0,.2)";
    c.fillRect(-5*sc, 0, 10*sc, 4*sc);
    c.restore();
  }

  if(p.hostile){
    c.strokeStyle="rgba(255,60,40,.85)"; c.lineWidth=1.5;
    c.strokeRect(-10*sc,-12*sc,20*sc,22*sc);
  }
}

function draw(c,p,color,down){
  if(!meta) return;
  c.save();
  c.translate(p.x,p.y);
  drawComposite(c,p,down);
  c.restore();
}

const PeopleSprites={
  draw, init, BUILD,
  get DIR(){ return LS.DIR; },
  get ready(){ return ready; },
  get meta(){ return meta; },
  resolveOutfit,
  dirName(p){ return LS.dirName(p); },
  walkFrame(p){ return LS.walkPhase(p); },
  facingAngle(p){ return LS.facingAngle(p); },
};
global.PeopleSprites=PeopleSprites;
init();
})(typeof window!=="undefined"?window:globalThis);
