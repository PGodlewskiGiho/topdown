/* people-sprites.js — GTA2 modular PNG pedestrians (baked composites, path-aware) */
(function(global){
"use strict";

const GO=global.Gta2Outfit;
const LS=global.LivingSprite;
const imgs={};
const pending=new Set();
const failed=new Set();
const baked={};
let meta=null, loadP=null, ready=false;
let resolvedRoot=null;

const BUILD_SCALE={
  slim:{sx:0.88,sy:1.02},
  average:{sx:1.0,sy:1.0},
  athletic:{sx:0.94,sy:1.04},
  stocky:{sx:1.08,sy:1.06},
  hardy:{sx:1.12,sy:1.08},
};

function gameBase(){
  const b=global.__GAME_BASE;
  return (typeof b==="string"&&b.length)?b:"";
}

function candidateRoots(){
  const roots=[];
  const gb=gameBase();
  if(gb) roots.push(gb);
  if(typeof location!=="undefined"){
    const path=location.pathname||"";
    const nested=path.match(/^(.*\/cursor\/topdown-city\/)/);
    if(nested) roots.push(nested[1]);
    const pages=path.match(/^(.*\/topdown\/)/);
    if(pages) roots.push(pages[1]);
  }
  roots.push("");
  const out=[];
  for(const r of roots){
    const n=r.endsWith("/")?r:(r?r+"/":"");
    if(!out.includes(n)) out.push(n);
  }
  return out;
}

function rootPrefix(){ return resolvedRoot!=null?resolvedRoot:gameBase(); }
function metaUrl(){ return rootPrefix()+"assets/people/gta2/meta.json"; }
function assetsBase(){ return rootPrefix()+"assets/people/gta2/parts/bodies/"; }

function outfitKey(o){
  return [o.body,o.shirt,o.pants,o.skin,o.hair||"none"].join("|");
}

function bakeKey(o,wf,dir){ return outfitKey(o)+"|"+wf+"|"+dir; }

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
  im.onerror=()=>{
    pending.delete(path);
    if(!failed.has(path)){
      failed.add(path);
      console.warn("PeopleSprites missing layer:", path);
    }
  };
  im.src=path;
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
  loadP=(async()=>{
    let lastErr=null;
    for(const root of candidateRoots()){
      try{
        const url=root+"assets/people/gta2/meta.json";
        const r=await fetch(url);
        if(!r.ok){ lastErr=new Error("meta:"+r.status+" "+url); continue; }
        const m=await r.json();
        if(resolvedRoot!==root){
          resolvedRoot=root;
          global.__GAME_BASE=root;
        }
        meta=m;
        ready=true;
        setTimeout(warmDefault, 500);
        return m;
      }catch(e){ lastErr=e; }
    }
    console.warn("PeopleSprites meta load failed", lastErr);
    ready=false;
    return null;
  })();
  return loadP;
}

function pick(arr, seed){ return arr[Math.abs(seed)%arr.length]; }

function prefetchAllDirections(o, folder){
  const dirs=LS?LS.DIR:["E","SE","S","SW","W","NW","N","NE"];
  for(const d of dirs){
    prefetchOutfit(o, folder, d);
  }
}

function warmDefault(){
  if(!meta) return;
  const sample={body:"male",shirt:"blue",pants:"jeans",skin:"medium",hair:"brown",build:"average"};
  const warmFolders=["idle0","walk0","walk1","run0","shoot0","down0"];
  for(const f of warmFolders){
    prefetchAllDirections(sample, f);
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
  prefetchAllDirections(o, "walk0");
  prefetchAllDirections(o, "idle0");
  return o;
}

function layerPaths(o, wf, direction){
  const order=meta.layer_order||["shoes","pants","arms","torso","skin","hair"];
  const b=o.body||"male";
  const base=assetsBase();
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
    out.push(base+b+"/"+rel+"/"+wf+"/"+direction+".png");
  }
  return out;
}

function prefetchClip(o, clipId){
  const spec=(meta&&meta.clips&&meta.clips[clipId])||(LS&&LS.DEFAULT_CLIPS&&LS.DEFAULT_CLIPS[clipId]);
  const n=spec&&spec.count!=null?spec.count:8;
  for(let i=0;i<n;i++) prefetchAllDirections(o, clipId+i);
}

function prefetchOutfit(o, wf, direction){
  for(const path of layerPaths(o, wf, direction)) queueImg(path, ()=>tryBake(o, wf, direction));
  const alt=wf==="walk0"?"walk1":"walk0";
  for(const path of layerPaths(o, alt, direction)) queueImg(path, ()=>tryBake(o, alt, direction));
}

function allLayersReady(o, wf, dir){
  for(const path of layerPaths(o, wf, dir)){
    const im=getImg(path);
    if(!im) return false;
  }
  return true;
}

function drawLayers(c, o, wf, dir, ax, ay, sx, sy, bm){
  for(const path of layerPaths(o, wf, dir)){
    const im=getImg(path);
    if(!im) return false;
    c.drawImage(im, -ax*bm.sx, -ay*bm.sy, im.width*sx, im.height*sy);
  }
  return true;
}

function resolveSpriteDir(p, forcedDir){
  if(typeof forcedDir==="string"&&forcedDir) return forcedDir;
  if(LS) return LS.spriteDir(p);
  return p._faceDir||p._spriteDir||"S";
}

function tryBake(o, wf, dir){
  const key=bakeKey(o,wf,dir);
  if(baked[key]) return baked[key];
  const paths=layerPaths(o, wf, dir);
  const layers=[];
  for(const path of paths){
    const im=getImg(path);
    if(!im) return null;
    layers.push(im);
  }
  const c=document.createElement("canvas");
  c.width=22; c.height=22;
  const cx=c.getContext("2d");
  cx.imageSmoothingEnabled=false;
  for(const im of layers) cx.drawImage(im,0,0);
  baked[key]=c;
  return c;
}

function getBaked(o, wf, dir){
  const key=bakeKey(o,wf,dir);
  return baked[key]||tryBake(o,wf,dir);
}

function defaultBuildForBody(body){
  return (meta?.rules?.body_build_default||{})[body]||"average";
}

function buildMul(o, p){
  let b=BUILD_SCALE[o.build]||BUILD_SCALE.average;
  // female/hardy PNG folders are already proportion-scaled at generation time.
  if((o.body==="female"||o.body==="hardy")&&(!o.build||o.build===defaultBuildForBody(o.body))){
    b=BUILD_SCALE.average;
  }
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
  const ax=(meta.anchor||[11,21])[0]*sc;
  const ay=(meta.anchor||[11,21])[1]*sc;
  c.imageSmoothingEnabled=false;

  const wf=(LS&&LS.walkFrameName)?LS.walkFrameName(p,down,meta):"walk0";
  const dir=resolveSpriteDir(p, forcedDir);
  p._spriteDir=dir;
  p._faceDir=dir;
  p._animClip=LS&&LS.animClip?LS.animClip(p,down,meta):null;
  prefetchOutfit(o, wf, dir);
  if(p._animClip) prefetchClip(o, p._animClip);

  const ang=dirAngle(dir);
  c.save();
  c.rotate(ang-Math.PI/2);
  c.fillStyle="rgba(0,0,0,.30)";
  c.fillRect(-8*sc, 3*sc, 16*sc, 4*sc);
  c.restore();

  let drew=drawLayers(c, o, wf, dir, ax, ay, sx, sy, bm);
  if(!drew){
    let bakedIm=getBaked(o, wf, dir);
    if(!bakedIm&&allLayersReady(o, wf, dir)) bakedIm=tryBake(o, wf, dir);
    if(bakedIm) c.drawImage(bakedIm, -ax*bm.sx, -ay*bm.sy, 22*sx, 22*sy);
    else return;
  }

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
  draw, init, warmDefault,
  get DIR(){ return LS?LS.DIR:["E","SE","S","SW","W","NW","N","NE"]; },
  get ready(){ return ready; },
  get meta(){ return meta; },
  resolveOutfit,
  dirName(p){ return p._spriteDir||"S"; },
  animClip(p, down){ return LS?LS.animClip(p, down, meta):null; },
  animFrame(p, down){ return LS?LS.animFrameName(p, down, meta):"walk0"; },
  walkFrame(p){ return LS?LS.walkPhase(p):0; },
  facingAngle(p){ return LS?LS.facingAngle(p):0; },
};
global.PeopleSprites=PeopleSprites;
init().catch(()=>{});
})(typeof window!=="undefined"?window:globalThis);
