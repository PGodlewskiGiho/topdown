/* people-sprites.js — GTA2 modular PNG pedestrians (baked composites, path-aware) */
(function(global){
"use strict";

const GO=global.Gta2Outfit;
const LS=global.LivingSprite;
const imgs={};
const pending=new Set();
const failed=new Set();
const baked={};
const lastHold={}; // ped uid -> {wf, dir, canvas}
const loadQueue=[];
let inflight=0;
let maxInflight=12;
const bootPaths=new Set();
let bootPrefetching=false;
let meta=null, loadP=null, ready=false;
let resolvedRoot=null;
let warmStarted=false;

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

function pumpLoadQueue(){
  while(inflight<maxInflight&&loadQueue.length){
    const item=loadQueue.shift();
    if(!item||!item.path) continue;
    if(failed.has(item.path)) continue;
    const cur=imgs[item.path];
    if(cur&&cur.complete&&cur.naturalWidth>0){
      for(const cb of item.callbacks) try{ cb(); }catch(e){}
      continue;
    }
    if(pending.has(item.path)){
      for(const cb of item.callbacks){
        if(imgs[item.path]) imgs[item.path].addEventListener("load",cb,{once:true});
      }
      continue;
    }
    pending.add(item.path);
    inflight++;
    const im=new Image();
    im.onload=()=>{
      pending.delete(item.path);
      inflight--;
      for(const cb of item.callbacks) try{ cb(); }catch(e){}
      pumpLoadQueue();
    };
    im.onerror=()=>{
      pending.delete(item.path);
      inflight--;
      if(!failed.has(item.path)){
        failed.add(item.path);
        console.warn("PeopleSprites missing layer:", item.path);
      }
      pumpLoadQueue();
    };
    im.src=item.path;
    imgs[item.path]=im;
  }
}

function queueImg(path, onload, priority){
  if(!path) return;
  const pri=priority!=null?priority:0;
  const cur=imgs[path];
  if(cur&&cur.complete&&cur.naturalWidth>0){ if(onload) onload(); return; }
  if(failed.has(path)) return;
  if(pending.has(path)){
    if(onload&&imgs[path]) imgs[path].addEventListener("load",onload,{once:true});
    return;
  }
  let item=null;
  for(let i=0;i<loadQueue.length;i++){
    if(loadQueue[i].path===path){ item=loadQueue[i]; break; }
  }
  if(item){
    if(pri>item.priority) item.priority=pri;
    if(onload) item.callbacks.push(onload);
  }else{
    loadQueue.push({path, priority:pri, callbacks:onload?[onload]:[]});
  }
  loadQueue.sort((a,b)=>b.priority-a.priority);
  pumpLoadQueue();
}

function tickLoadQueue(){ pumpLoadQueue(); }

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
        warmDefault();
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

function clipSpec(clipId){
  return (meta&&meta.clips&&meta.clips[clipId])||(LS&&LS.DEFAULT_CLIPS&&LS.DEFAULT_CLIPS[clipId])||{count:2,step_sec:0.11};
}

function pedUid(p){
  if(p._psUid==null) p._psUid=((Math.random()*0x7fffffff)|0)>>>0;
  return p._psUid;
}

function prefetchOutfit(o, wf, direction, altWalk, priority){
  const pri=priority!=null?priority:2;
  for(const path of layerPaths(o, wf, direction)) queueImg(path, ()=>tryBake(o, wf, direction), pri);
  if(altWalk!==false){
    const alt=wf.startsWith("walk")?(wf==="walk0"?"walk1":"walk0"):null;
    if(alt) for(const path of layerPaths(o, alt, direction)) queueImg(path, ()=>tryBake(o, alt, direction), pri);
  }
}

function prefetchClipDir(o, clipId, direction, priority){
  const spec=clipSpec(clipId);
  const n=spec.count!=null?spec.count:2;
  const pri=priority!=null?priority:8;
  for(let i=0;i<n;i++) prefetchOutfit(o, clipId+i, direction, false, pri);
}

function isCombatClip(clipId){
  return clipId==="punch"||clipId==="shoot";
}

function trySyncBakeCombat(o, clipId, moveDir){
  const dir=gta2SpriteDir(moveDir);
  const spec=clipSpec(clipId);
  const n=spec.count||1;
  for(let fi=0; fi<n; fi++){
    const wf=clipId+fi;
    for(const path of layerPaths(o, wf, dir)) getImg(path);
    tryBake(o, wf, dir);
  }
}

/** Prefetch punch/shoot and reset borrow cache when an attack clip starts. */
function beginPedCombat(p, clipId, forcedDir){
  if(!p||!meta||!clipId) return;
  p._psLayerCache={};
  p._psCombatSig=null;
  p._psClipReq=null;
  const o=resolveOutfit(p, true);
  if(o){
    const moveDir=moveFacingDir(p, forcedDir);
    const dir=gta2SpriteDir(moveDir);
    const pri=24;
    prefetchClipDir(o, clipId, dir, pri);
    const dirs=LS&&LS.DIR?LS.DIR:["E","SE","S","SW","W","NW","N","NE"];
    for(const d of dirs){
      const spec=clipSpec(clipId);
      const n=spec.count||1;
      for(let fi=0; fi<n; fi++){
        prefetchOutfit(o, clipId+fi, d, false, pri-1);
      }
    }
    trySyncBakeCombat(o, clipId, moveDir);
    tickLoadQueue();
    tickLoadQueue();
  }
  ensureClipForPed(p, clipId, forcedDir);
}

/** Lazy: one facing only — avoids 8× frame storm per clip. */
function ensureClipForPed(p, clipId, forcedDir){
  const o=resolveOutfit(p, true);
  if(!o) return;
  const moveDir=moveFacingDir(p, forcedDir);
  const dir=gta2SpriteDir(moveDir);
  const key=clipId+"|"+dir;
  if(p._psClipReq===key) return;
  p._psClipReq=key;
  const pri=isCombatClip(clipId)?18:14;
  prefetchClipDir(o, clipId, dir, pri);
  const opp=LS&&LS.DIR?LS.DIR[(LS.DIR.indexOf(dir)+4)%8]:null;
  if(opp) prefetchClipDir(o, clipId, opp, pri-2);
}

function warmPed(p, priority){
  if(!meta) return;
  const pri=priority!=null?priority:5;
  const o=resolveOutfit(p, true);
  if(!o) return;
  const moveDir=p._faceDir||"S";
  const dir=gta2SpriteDir(moveDir);
  const sig=outfitKey(o)+"|"+dir;
  if(p._psWarmSig===sig) return;
  p._psWarmSig=sig;
  prefetchOutfit(o, "walk0", dir, true, pri);
  prefetchOutfit(o, "walk1", dir, false, pri);
  prefetchOutfit(o, "run0", dir, false, pri);
  prefetchOutfit(o, "run1", dir, false, pri);
  prefetchOutfit(o, "idle0", dir, false, pri);
  if(p===global.ped){
    prefetchOutfit(o, "punch0", dir, false, pri+2);
    prefetchOutfit(o, "punch1", dir, false, pri+1);
    const pn=clipSpec("punch").count||8;
    for(let fi=2; fi<pn; fi++) prefetchOutfit(o, "punch"+fi, dir, false, pri);
  }
}

/** Prefetch run cycle when a civilian panics — avoids frozen walk hold while fleeing. */
function beginPedPanic(p){
  if(!p||!meta) return;
  p._psWalkReq=null;
  const o=resolveOutfit(p, true);
  if(!o) return;
  const moveDir=p._faceDir||"S";
  const dir=gta2SpriteDir(moveDir);
  prefetchClipDir(o, "run", dir, 18);
  const opp=LS&&LS.DIR?LS.DIR[(LS.DIR.indexOf(dir)+4)%8]:null;
  if(opp) prefetchClipDir(o, "run", opp, 16);
  ensureClipForPed(p, "run", moveDir);
}

function warmVisiblePeds(){
  if(!meta) return;
  const tier=typeof global.perfTier==="function"?global.perfTier():3;
  const budget=tier===1?3:tier===2?5:8;
  const list=[];
  const camX=global.cam?global.cam.x:0;
  const camY=global.cam?global.cam.y:0;
  const all=global.peds;
  if(all){
    for(const p of all){
      const d=Math.hypot(p.x-camX, p.y-camY);
      if(d>920) continue;
      list.push({p, d});
    }
  }
  if(global.ped) list.push({p:global.ped, d:0});
  list.sort((a,b)=>a.d-b.d);
  for(let i=0;i<Math.min(budget, list.length); i++){
    warmPed(list[i].p, 10-Math.min(9, (list[i].d/95)|0));
  }
}

function warmDefault(){
  if(!meta||warmStarted) return;
  warmStarted=true;
  const sample={body:"male",shirt:"blue",pants:"jeans",skin:"medium",hair:"brown",build:"average"};
  maxInflight=28;
  bootPrefetchOutfit(sample, 18);
}

function prefetchCombat(o){
  if(!o) return;
  const dirs=LS&&LS.DIR?LS.DIR:["E","SE","S","SW","W","NW","N","NE"];
  for(const clip of ["shoot","punch"])
    for(const d of dirs) prefetchClipDir(o, clip, d, 10);
}

function resolveOutfit(p, skipPrefetch){
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
  if(!skipPrefetch){
    const moveDir=moveFacingDir(p, null);
    const dir=gta2SpriteDir(moveDir);
    prefetchOutfit(o, "walk0", dir, true, 4);
    prefetchOutfit(o, "idle0", dir, false, 3);
    if(p===global.ped){
      if(!p._psCombatWarm){
        p._psCombatWarm=true;
        prefetchCombat(o);
      }
      for(let fi=0; fi<(clipSpec("punch").count||8); fi++){
        prefetchOutfit(o, "punch"+fi, dir, false, 20-fi);
      }
    }
  }
  return o;
}

function singleLayerPath(o, layerKey, wf, direction){
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
  const rel=map[layerKey];
  if(!rel) return null;
  return base+b+"/"+rel+"/"+wf+"/"+direction+".png";
}

function poseCandidates(wf, dir){
  const m=wf.match(/^([a-z]+)(\d+)$/);
  const clipId=m?m[1]:wf.replace(/\d+$/,"");
  const frameIdx=m?parseInt(m[2],10):0;
  const spec=clipSpec(clipId);
  const count=spec.count||1;
  const dirs=facingDirs(dir);
  const out=[];
  const seen=new Set();
  const add=(folder, d)=>{
    const k=folder+"|"+d;
    if(seen.has(k)) return;
    seen.add(k);
    out.push({wf:folder, dir:d});
  };
  for(const d of dirs){
    for(let fi=frameIdx; fi>=0; fi--) add(clipId+fi, d);
    for(let fi=frameIdx+1; fi<count; fi++) add(clipId+fi, d);
  }
  const fallbacks=clipId==="die"?["down","walk","idle"]:clipId==="down"?["walk","idle"]:["walk","idle"];
  for(const fb of fallbacks){
    const fbSpec=clipSpec(fb);
    const fn=Math.min(fbSpec.count||1, fb==="down"?5:3);
    for(const d of dirs){
      for(let fi=0; fi<fn; fi++) add(fb+fi, d);
    }
  }
  for(const fb of ["idle0","walk0","walk1"]){
    for(const d of dirs) add(fb, d);
  }
  return out;
}

/** Combat borrow: same clip only; skip frame 0 when attacking on later frames. */
function combatPoseCandidates(wf, dir){
  const m=wf.match(/^([a-z]+)(\d+)$/);
  if(!m) return [{wf, dir}];
  const clipId=m[1], want=parseInt(m[2],10);
  if(!isCombatClip(clipId)) return [{wf, dir}];
  const spec=clipSpec(clipId);
  const count=spec.count||1;
  const dirs=facingDirs(dir);
  const frames=[want];
  for(let off=1; off<count; off++){
    if(want+off<count) frames.push(want+off);
    const earlier=want-off;
    if(earlier>=0&&(want===0||earlier>0)) frames.push(earlier);
  }
  const out=[], seen=new Set();
  const add=(f,d)=>{
    const k=f+"|"+d;
    if(seen.has(k)) return;
    seen.add(k);
    out.push({wf:f, dir:d});
  };
  for(const d of dirs) for(const fi of frames) add(clipId+fi, d);
  return out;
}

function resolveLayerImg(o, layerKey, wf, dir, cache, priority, candidateFn){
  if(layerKey==="hair"&&!o.hair) return null;
  const pri=priority!=null?priority:1;
  const candidates=candidateFn?candidateFn(wf, dir):poseCandidates(wf, dir);
  for(const {wf:w, dir:d} of candidates){
    const path=singleLayerPath(o, layerKey, w, d);
    if(!path) continue;
    const im=getImg(path);
    if(im){
      if(cache) cache[layerKey]={path, wf:w, dir:d};
      return im;
    }
    queueImg(path, null, pri);
  }
  if(cache&&cache[layerKey]){
    const held=cache[layerKey];
    if(held.wf===wf&&held.dir===dir){
      const im=getImg(held.path);
      if(im) return im;
    }
  }
  return null;
}

/** Each layer borrows nearest loaded frame/dir — no holes in torso/hair. */
function drawLayersSmart(c, o, wf, dir, ax, ay, sx, sy, bm, cache, priority, candidateFn){
  const order=meta.layer_order||["shoes","pants","arms","torso","skin","hair"];
  let drew=0, need=0;
  for(const k of order){
    if(k==="hair"&&!o.hair) continue;
    need++;
    const im=resolveLayerImg(o, k, wf, dir, cache, priority, candidateFn);
    if(!im) continue;
    c.drawImage(im, -ax*bm.sx, -ay*bm.sy, im.width*sx, im.height*sy);
    drew++;
  }
  return {drew, need, complete:need>0&&drew===need};
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

function prefetchClip(o, clipId, direction){
  prefetchClipDir(o, clipId, direction||"S");
}

function layersReadyCount(o, wf, dir){
  let n=0, total=0;
  for(const path of layerPaths(o, wf, dir)){
    total++;
    if(getImg(path)) n++;
  }
  return {n, total};
}

function allLayersReady(o, wf, dir){
  const c=layersReadyCount(o, wf, dir);
  return c.total>0 && c.n===c.total;
}

function facingDirs(dir){
  const dirs=LS&&LS.DIR?LS.DIR:["E","SE","S","SW","W","NW","N","NE"];
  const i=dirs.indexOf(dir);
  if(i<0) return [dir||"S"];
  return [dir, dirs[(i+1)%8], dirs[(i+7)%8], dirs[(i+4)%8]];
}

/** Nearest loaded frame + clip/direction fallback (die→down→walk). Heuristic borrow, no ML. */
function resolveAnimPose(o, wf, dir){
  const m=wf.match(/^([a-z]+)(\d+)$/);
  const clipId=m?m[1]:wf.replace(/\d+$/,"");
  const frameIdx=m?parseInt(m[2],10):0;
  const spec=clipSpec(clipId);
  const count=spec.count||1;
  const dirs=facingDirs(dir);
  const tryFolder=(folder, d)=>allLayersReady(o, folder, d)?{wf:folder, dir:d}:null;
  const scan=(folder)=>{
    for(const d of dirs){
      const hit=tryFolder(folder, d);
      if(hit) return hit;
    }
    return null;
  };

  for(let d=0; d<count; d++){
    const fi=frameIdx-d;
    if(fi<0) break;
    const hit=scan(clipId+fi);
    if(hit) return hit;
  }
  for(let d=1; d<count; d++){
    const fi=frameIdx+d;
    if(fi>=count) break;
    const hit=scan(clipId+fi);
    if(hit) return hit;
  }
  const fallbacks=clipId==="die"?["down","walk","idle"]:clipId==="down"?["walk","idle"]:["walk","idle"];
  for(const fb of fallbacks){
    const fbSpec=clipSpec(fb);
    const fn=Math.min(fbSpec.count||1, 3);
    for(let fi=0; fi<fn; fi++){
      const hit=scan(fb+fi);
      if(hit) return hit;
    }
  }
  for(const fb of ["walk0","idle0"]){
    const hit=scan(fb);
    if(hit) return hit;
  }
  return {wf, dir};
}

/** Combat-only borrow — never idle/walk while an attack clip is active. */
function resolveCombatPose(o, clipId, frameIdx, dir){
  const spec=clipSpec(clipId);
  const count=spec.count||1;
  const dirs=facingDirs(dir);
  const tryFolder=(folder, d)=>allLayersReady(o, folder, d)?{wf:folder, dir:d}:null;
  const scan=(folder)=>{
    for(const d of dirs){
      const hit=tryFolder(folder, d);
      if(hit) return hit;
    }
    return null;
  };
  for(let d=0; d<count; d++){
    const fi=frameIdx-d;
    if(fi<0) break;
    const hit=scan(clipId+fi);
    if(hit) return hit;
  }
  for(let d=1; d<count; d++){
    const fi=frameIdx+d;
    if(fi>=count) break;
    const hit=scan(clipId+fi);
    if(hit) return hit;
  }
  return {wf:clipId+Math.min(frameIdx,count-1), dir};
}

function ensureWalkPrefetch(p, o, wf, dir){
  const key=wf+"|"+dir;
  if(p._psWalkReq===key) return;
  p._psWalkReq=key;
  prefetchOutfit(o, wf, dir, true, 6);
}

function drawLayers(c, o, wf, dir, ax, ay, sx, sy, bm){
  let drew=0, need=0;
  for(const path of layerPaths(o, wf, dir)){
    need++;
    const im=getImg(path);
    if(!im) continue;
    c.drawImage(im, -ax*bm.sx, -ay*bm.sy, im.width*sx, im.height*sy);
    drew++;
  }
  return drew>0 && drew===need;
}

function drawLayersPartial(c, o, wf, dir, ax, ay, sx, sy, bm){
  let drew=0;
  for(const path of layerPaths(o, wf, dir)){
    const im=getImg(path);
    if(!im) continue;
    c.drawImage(im, -ax*bm.sx, -ay*bm.sy, im.width*sx, im.height*sy);
    drew++;
  }
  return drew>0;
}

/** Baked GTA2 dirs are 180° off screen movement (base sprite faces N). */
function gta2SpriteDir(moveDir){
  const dirs=LS&&LS.DIR?LS.DIR:["E","SE","S","SW","W","NW","N","NE"];
  const i=dirs.indexOf(moveDir);
  return i>=0?dirs[(i+4)%dirs.length]:(moveDir||"N");
}

function moveFacingDir(p, forcedDir){
  if(p._attackT>0&&p._attackFaceDir) return p._attackFaceDir;
  if(typeof forcedDir==="string"&&forcedDir) return forcedDir;
  if((p._attackT>0||p.state==="dying")&&typeof p.a==="number"&&isFinite(p.a)&&LS)
    return LS.dirNameFromAngle(p.a);
  if(LS) return LS.spriteDir(p);
  return p._faceDir||p._spriteDir||"S";
}

function resolveSpriteDir(p, forcedDir){
  return gta2SpriteDir(moveFacingDir(p, forcedDir));
}

function spriteSize(){
  const w=meta&&meta.size?meta.size[0]:48;
  const h=meta&&meta.size?meta.size[1]:48;
  return {w, h};
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
  const {w, h}=spriteSize();
  const c=document.createElement("canvas");
  c.width=w; c.height=h;
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

/** Soft contact shadow — radial ellipse blob, not a flat rectangle. */
function drawPedShadowBlob(c, sc, opts){
  opts=opts||{};
  const down=!!opts.down;
  const cx=opts.x!=null?opts.x:sc*0.4;
  const cy=opts.y!=null?opts.y:(down?2.1*sc:3.3*sc);
  const rx=down?9.5*sc:7.8*sc;
  const ry=down?3.4*sc:2.7*sc;
  const a=down?0.19:0.25;
  c.save();
  c.translate(cx, cy);
  const g=c.createRadialGradient(0,0,0, 0,0, Math.max(rx,ry));
  g.addColorStop(0, "rgba(0,0,0,"+a+")");
  g.addColorStop(0.62, "rgba(0,0,0,"+(a*0.42).toFixed(3)+")");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle=g;
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, Math.PI*2);
  c.fill();
  c.fillStyle="rgba(0,0,0,"+(a*0.32).toFixed(3)+")";
  c.beginPath();
  c.ellipse(0, 0, rx*0.48, ry*0.48, 0, 0, Math.PI*2);
  c.fill();
  c.restore();
}

function drawComposite(c, p, down, forcedDir){
  const o=resolveOutfit(p);
  if(!o) return;
  const rad=((p.r||9)/9);
  const bm=buildMul(o, p);
  const sc=rad*2.05;
  const sx=sc*bm.sx, sy=sc*bm.sy;
  const {w:sprW, h:sprH}=spriteSize();
  const ax=(meta.anchor||[24,47])[0]*sc;
  const ay=(meta.anchor||[24,47])[1]*sc;
  c.imageSmoothingEnabled=false;

  const attacking=p._attackT>0&&isCombatClip(p._attackClip);
  const attackClip=attacking?p._attackClip:null;
  let wfRaw;
  if(attackClip&&LS){
    const fi=LS.animFrameIndex(p, attackClip, meta, down);
    wfRaw=attackClip+fi;
  }else{
    wfRaw=(LS&&LS.walkFrameName)?LS.walkFrameName(p,down,meta):"walk0";
  }
  const moveDir=moveFacingDir(p, forcedDir);
  const dir=gta2SpriteDir(moveDir);
  p._faceDir=moveDir;
  p._spriteDir=dir;
  p._animClip=LS&&LS.animClip?LS.animClip(p,down,meta):null;

  if(p._animClip==="die"||p._animClip==="down"||p.state==="dying"||down)
    ensureClipForPed(p, p._animClip|| (p.state==="dying"?"die":"down"), moveDir);
  else if(p._animClip&&p._animClip!=="walk"&&p._animClip!=="idle"&&p._animClip!=="run")
    ensureClipForPed(p, p._animClip, moveDir);
  else ensureWalkPrefetch(p, o, wfRaw, dir);

  const loadPri=attacking?20:(p===global.ped?12:(p.state==="dying"||down?11:7));
  const uid=pedUid(p);
  if(p.swimming){
    const bob=Math.sin(performance.now()*0.0042)*1.6*sc;
    c.translate(0, bob);
    c.globalAlpha=0.94;
  }

  const isDown=down||p.state==="dying";
  drawPedShadowBlob(c, sc, {down:isDown});

  let drew=false;
  if(attacking){
    if(p._psWasCombat!==true) p._psLayerCache={};
    p._psWasCombat=true;
    const wfSig=wfRaw+"|"+dir;
    if(p._psCombatSig!==wfSig){
      p._psCombatSig=wfSig;
      prefetchOutfit(o, wfRaw, dir, false, 24);
    }
    prefetchClipDir(o, attackClip, dir, loadPri);
    tickLoadQueue();
    const bakedAtk=getBaked(o, wfRaw, dir);
    if(bakedAtk){
      c.drawImage(bakedAtk, -ax*bm.sx, -ay*bm.sy, sprW*sx, sprH*sy);
      drew=true;
      lastHold[uid]={wf:wfRaw, dir, canvas:bakedAtk, combat:true};
    }
    if(!drew){
      const smart=drawLayersSmart(c, o, wfRaw, dir, ax, ay, sx, sy, bm, p._psLayerCache, loadPri, combatPoseCandidates);
      if(smart.complete||smart.drew>0){
        drew=true;
        if(smart.complete){
          const bakedIm=tryBake(o, wfRaw, dir);
          if(bakedIm) lastHold[uid]={wf:wfRaw, dir, canvas:bakedIm, combat:true};
        }
      }
    }
    if(!drew){
      const fi=LS&&LS.animFrameIndex?LS.animFrameIndex(p, attackClip, meta, false):0;
      for(let f=fi; f>=0; f--){
        const tryWf=attackClip+f;
        if(drawLayersPartial(c, o, tryWf, dir, ax, ay, sx, sy, bm)){ drew=true; break; }
      }
    }
    if(!drew){
      const hold=lastHold[uid];
      if(hold&&hold.combat&&hold.canvas&&hold.dir===dir){
        c.drawImage(hold.canvas, -ax*bm.sx, -ay*bm.sy, sprW*sx, sprH*sy);
        drew=true;
      }
    }
  }else{
    if(p._psWasCombat){
      p._psLayerCache={};
      p._psCombatSig=null;
      p._psWasCombat=false;
    }
    if(!p._psLayerCache) p._psLayerCache={};
    const walkSig=wfRaw+"|"+dir;
    if(p._psWalkSig!==walkSig){
      p._psWalkSig=walkSig;
      p._psLayerCache={};
    }
    const smart=drawLayersSmart(c, o, wfRaw, dir, ax, ay, sx, sy, bm, p._psLayerCache, loadPri);
    drew=smart.complete||smart.drew>0;
    if(smart.complete){
      const bakedIm=tryBake(o, wfRaw, dir);
      if(bakedIm) lastHold[uid]={wf:wfRaw, dir, canvas:bakedIm, combat:false};
    }
    if(!drew){
      const hold=lastHold[uid];
      if(hold&&hold.canvas&&!hold.combat&&hold.wf===wfRaw&&hold.dir===dir){
        c.drawImage(hold.canvas, -ax*bm.sx, -ay*bm.sy, sprW*sx, sprH*sy);
        drew=true;
      }
    }
    if(!drew){
      const pose=resolveAnimPose(o, wfRaw, dir);
      if(drawLayersSmart(c, o, pose.wf, pose.dir, ax, ay, sx, sy, bm, p._psLayerCache, loadPri).drew>0) drew=true;
    }
  }

  if(p.hostile){
    c.strokeStyle="rgba(255,60,40,.85)"; c.lineWidth=1.5;
    c.strokeRect(-10*sc,-12*sc,20*sc,22*sc);
  }
  c.globalAlpha=1;
}

function draw(c,p,color,down,forcedDir){
  if(!meta) return;
  c.save();
  c.translate(p.x,p.y);
  drawComposite(c,p,down,forcedDir);
  c.restore();
}

function trackBootPath(path){ if(path) bootPaths.add(path); }

function bootQueueLayer(o, wf, dir, pri){
  for(const path of layerPaths(o, wf, dir)){
    trackBootPath(path);
    queueImg(path, ()=>tryBake(o, wf, dir), pri);
  }
}

/** Eager prefetch: walk/run/idle + full punch cycle in all 8 facings. */
function bootPrefetchOutfit(o, priority){
  if(!o||!meta) return;
  const pri=priority!=null?priority:16;
  const dirs=LS&&LS.DIR?LS.DIR:["E","SE","S","SW","W","NW","N","NE"];
  bootPrefetching=true;
  const walkN=clipSpec("walk").count||8;
  const punchN=clipSpec("punch").count||8;
  const shootN=Math.min(clipSpec("shoot").count||8, 4);
  for(const d of dirs){
    for(let fi=0; fi<walkN; fi++) bootQueueLayer(o, "walk"+fi, d, pri);
    bootQueueLayer(o, "run0", d, pri);
    bootQueueLayer(o, "run1", d, pri);
    bootQueueLayer(o, "idle0", d, pri);
    for(let fi=0; fi<punchN; fi++) bootQueueLayer(o, "punch"+fi, d, pri+1);
    for(let fi=0; fi<shootN; fi++) bootQueueLayer(o, "shoot"+fi, d, pri);
  }
  pumpLoadQueue();
}

function bootLayersReady(o, wf, dir){ return allLayersReady(o, wf, dir); }

function bootLoadRatio(){
  if(!bootPaths.size) return ready?1:0;
  let n=0;
  for(const p of bootPaths){
    const im=imgs[p];
    if(im&&im.complete&&im.naturalWidth>0) n++;
  }
  return n/bootPaths.size;
}

/** Boot gate: preload core animation layers (8 dirs) before gameplay. */
function whenBootReady(timeoutMs){
  const timeout=timeoutMs!=null?timeoutMs:32000;
  const sample={body:"male",shirt:"blue",pants:"jeans",skin:"medium",hair:"brown",build:"average"};
  const dirs=LS&&LS.DIR?LS.DIR:["E","SE","S","SW","W","NW","N","NE"];
  const minRatio=0.92;
  return init().then(()=>{
    if(!ready) throw new Error("people meta");
    maxInflight=28;
    bootPrefetchOutfit(sample, 18);
    const t0=performance.now();
    return new Promise(resolve=>{
      const tick=()=>{
        tickLoadQueue();
        const ratio=bootLoadRatio();
        const punchOk=dirs.every(d=>bootLayersReady(sample,"punch0",d)&&bootLayersReady(sample,"punch3",d));
        const walkOk=dirs.every(d=>bootLayersReady(sample,"walk0",d));
        const ok=ratio>=minRatio&&punchOk&&walkOk;
        if(ok||performance.now()-t0>=timeout){
          maxInflight=12;
          bootPrefetching=false;
          resolve(ok);
        }else requestAnimationFrame(tick);
      };
      tick();
    });
  });
}

function getBootLoadRatio(){ return bootLoadRatio(); }

const PeopleSprites={
  draw, drawShadow:drawPedShadowBlob, init, warmDefault, warmPed, warmVisiblePeds, tickLoadQueue, whenBootReady,
  bootPrefetchOutfit, getBootLoadRatio,
  prefetchCombat, beginPedCombat, beginPedPanic, resolveOutfit, ensureClipForPed, prefetchClipDir,
  get DIR(){ return LS?LS.DIR:["E","SE","S","SW","W","NW","N","NE"]; },
  get ready(){ return ready; },
  get meta(){ return meta; },
  dirName(p){ return p._spriteDir||"S"; },
  animClip(p, down){ return LS?LS.animClip(p, down, meta):null; },
  animFrame(p, down){ return LS?LS.animFrameName(p, down, meta):"walk0"; },
  walkFrame(p){ return LS?LS.walkPhase(p):0; },
  facingAngle(p){ return LS?LS.facingAngle(p):0; },
};
global.PeopleSprites=PeopleSprites;
init().catch(()=>{});
})(typeof window!=="undefined"?window:globalThis);
