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

const W=22, H=22;
const HEAL_PARTS=new Set(["arms","torso","skin"]);
const NEIGH8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const NEIGH4=[[1,0],[-1,0],[0,1],[0,-1]];

function partFromPath(path){
  if(path.includes("/arms/")) return "arms";
  if(path.includes("/torsos/")) return "torso";
  if(path.includes("/skins/")) return "skin";
  if(path.includes("/pants/")) return "pants";
  if(path.includes("/shoes/")) return "shoes";
  if(path.includes("/hairs/")) return "hair";
  return null;
}

function bridgeLimbLayers(layerBufs, fullBuf, w, h){
  const fd=fullBuf.data;
  for(const part of HEAL_PARTS){
    const buf=layerBufs[part];
    if(!buf) continue;
    const d=buf.data;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        if(d[i+3]||!fd[i+3]) continue;
        for(const [dx,dy] of NEIGH8){
          const nx=x+dx, ny=y+dy;
          if(nx<0||ny<0||nx>=w||ny>=h) continue;
          const ni=(ny*w+nx)*4;
          if(d[ni+3]){
            d[i]=fd[i]; d[i+1]=fd[i+1]; d[i+2]=fd[i+2]; d[i+3]=fd[i+3];
            fd[i]=d[i]; fd[i+1]=d[i+1]; fd[i+2]=d[i+2]; fd[i+3]=d[i+3];
            break;
          }
        }
      }
    }
  }
}

function healFullComposite(buf, w, h, passes){
  for(let p=0;p<passes;p++){
    const d=buf.data, copy=new Uint8ClampedArray(d);
    for(let y=1;y<h-1;y++){
      for(let x=1;x<w-1;x++){
        const i=(y*w+x)*4;
        if(copy[i+3]) continue;
        let n=0, r=0, g=0, b=0;
        const neigh=p===0?NEIGH4:NEIGH8;
        for(const [dx,dy] of neigh){
          const ni=((y+dy)*w+(x+dx))*4;
          if(copy[ni+3]){ n++; r+=copy[ni]; g+=copy[ni+1]; b+=copy[ni+2]; }
        }
        if(n>=2){ d[i]=r/n|0; d[i+1]=g/n|0; d[i+2]=b/n|0; d[i+3]=255; }
      }
    }
  }
}

function healComposite(ctx, paths, layers){
  const w=W, h=H;
  const full=ctx.createImageData(w, h);
  const layerBufs={};
  for(let li=0;li<layers.length;li++){
    const im=layers[li];
    const part=partFromPath(paths[li]);
    const tmp=document.createElement("canvas");
    tmp.width=w; tmp.height=h;
    const tc=tmp.getContext("2d");
    tc.imageSmoothingEnabled=false;
    tc.drawImage(im,0,0);
    const buf=tc.getImageData(0,0,w,h);
    if(part) layerBufs[part]=buf;
    const sd=buf.data, fd=full.data;
    for(let i=0;i<sd.length;i+=4){
      if(!sd[i+3]) continue;
      fd[i]=sd[i]; fd[i+1]=sd[i+1]; fd[i+2]=sd[i+2]; fd[i+3]=sd[i+3];
    }
  }
  for(let pass=0;pass<2;pass++) bridgeLimbLayers(layerBufs, full, w, h);
  healFullComposite(full, w, h, 3);
  ctx.putImageData(full,0,0);
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
  c.width=W; c.height=H;
  const cx=c.getContext("2d");
  cx.imageSmoothingEnabled=false;
  healComposite(cx, paths, layers);
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

  let bakedIm=allLayersReady(o, wf, dir)?getBaked(o, wf, dir):null;
  if(bakedIm) c.drawImage(bakedIm, -ax*bm.sx, -ay*bm.sy, W*sx, H*sy);
  else return;

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
