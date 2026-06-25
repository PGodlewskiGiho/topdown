/* people-sprites.js — top-down pedestrian sprites (RGS CC0, clear 8-dir PNG names) */
(function(global){
"use strict";

const BUILD=2026062702;

const META_URL="assets/people/topdown/meta.json";
const ASSETS_BASE="assets/people/topdown/sprites/";

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

function outfitKey(o){
  return [o.body,o.shirt,o.pants,o.skin,o.hair||"none"].join("|");
}

function spriteId(o){
  return (o.body||"male")+"_"+(o.shirt||"blue");
}

function spritePath(o, wf, direction){
  return ASSETS_BASE+spriteId(o)+"/"+wf+"/"+direction+".png";
}

function queueImg(path, onload){
  if(!path) return;
  const cur=imgs[path];
  if(cur&&cur.complete&&cur.naturalWidth>0){ if(onload) onload(); return; }
  if(pending.has(path)){
    if(onload&&imgs[path]) imgs[path].addEventListener("load",onload,{once:true});
    return;
  }
  pending.add(path);
  const im=new Image();
  im.onload=()=>{ pending.delete(path); if(onload) onload(); };
  im.onerror=()=>{ pending.delete(path); };
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
      if(!r.ok) throw new Error("meta:"+r.status+" "+META_URL);
      return r.json();
    })
    .then(m=>{
      meta=m;
      ready=true;
      warmDefault();
      return m;
    })
    .catch(e=>{
      console.warn("PeopleSprites meta load failed",e,META_URL);
      ready=false;
      throw e;
    });
  return loadP;
}

function pick(arr, seed){ return arr[Math.abs(seed)%arr.length]; }

function warmDefault(){
  if(!meta) return;
  const dirs=meta.directions||(LS?LS.DIR:["E","SE","S","SW","W","NW","N","NE"]);
  const sample={body:"male",shirt:"blue",pants:"jeans",skin:"medium",hair:"brown",build:"average"};
  for(const d of dirs){
    prefetchOutfit(sample,"walk0",d);
    prefetchOutfit(sample,"walk1",d);
  }
}

function prefetchAllDirections(o){
  const dirs=meta.directions||(LS?LS.DIR:["E","SE","S","SW","W","NW","N","NE"]);
  for(const d of dirs){
    prefetchOutfit(o,"walk0",d);
    prefetchOutfit(o,"walk1",d);
  }
}

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
  prefetchAllDirections(o);
  return o;
}

function resolveSpriteDir(p, forcedDir){
  if(typeof forcedDir==="string"&&forcedDir) return forcedDir;
  if(LS) return LS.spriteDir(p);
  return p._faceDir||p._spriteDir||"S";
}

function prefetchOutfit(o, wf, direction){
  queueImg(spritePath(o, wf, direction));
  const alt=wf==="walk0"?"walk1":"walk0";
  queueImg(spritePath(o, alt, direction));
}

function buildMul(o, p){
  const b=BUILD_SCALE[o.build]||BUILD_SCALE.average;
  const h=clamp(p.height!=null?p.height:1, 0.86, 1.14);
  return {sx:b.sx*h, sy:b.sy*h};
}

function clamp(v,a,b){ return v<a?a:v>b?b:v; }

function dirAngle(dir){
  if(!LS||!LS.DIR) return Math.PI/2;
  const i=LS.DIR.indexOf(dir);
  return (i>=0?i:2)*(Math.PI/4);
}

function drawComposite(c, p, down, forcedDir){
  const o=resolveOutfit(p);
  if(!o) return;
  const rad=((p.r||9)/9);
  const bm=buildMul(o, p);
  const sc=rad*2.05;
  const sx=sc*bm.sx, sy=sc*bm.sy;
  const cw=(meta.size&&meta.size[0])||32;
  const ch=(meta.size&&meta.size[1])||32;
  const ax=(meta.anchor||[16,28])[0]*sc;
  const ay=(meta.anchor||[16,28])[1]*sc;
  c.imageSmoothingEnabled=false;

  const wf=(LS&&LS.walkFrameName)?LS.walkFrameName(p,down):"walk0";
  const dir=resolveSpriteDir(p, forcedDir);
  p._spriteDir=dir;
  p._faceDir=dir;
  prefetchOutfit(o, wf, dir);

  const ang=dirAngle(dir);
  c.save();
  c.rotate(ang-Math.PI/2);
  c.fillStyle="rgba(0,0,0,.30)";
  c.fillRect(-8*sc, 3*sc, 16*sc, 4*sc);
  c.restore();

  const path=spritePath(o, wf, dir);
  const im=getImg(path);
  if(!im) return;
  c.drawImage(im, -ax*bm.sx, -ay*bm.sy, cw*sx, ch*sy);

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

function draw(c,p,color,down,forcedDir){
  if(!meta) return;
  c.save();
  c.translate(p.x,p.y);
  drawComposite(c,p,down,forcedDir);
  c.restore();
}

const PeopleSprites={
  draw, init, BUILD, warmDefault,
  get DIR(){ return LS?LS.DIR:["E","SE","S","SW","W","NW","N","NE"]; },
  get ready(){ return ready; },
  get meta(){ return meta; },
  resolveOutfit,
  dirName(p){ return p._spriteDir||"S"; },
  walkFrame(p){ return LS?LS.walkPhase(p):0; },
  facingAngle(p){ return LS?LS.facingAngle(p):0; },
};
global.PeopleSprites=PeopleSprites;
init();
})(typeof window!=="undefined"?window:globalThis);
