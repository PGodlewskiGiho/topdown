/* people-sprites.js — GTA2 modular PNG pedestrians (8 dirs × 2 walk frames) */
(function(global){
"use strict";

const BUILD=20260625;
const BASE="assets/people/gta2/parts/";
const META_URL="assets/people/gta2/meta.json";
const imgs={};
let meta=null, loadP=null, ready=false;

const DIR=["E","SE","S","SW","W","NW","N","NE"];

function loadImg(path){
  return new Promise((res,rej)=>{
    if(imgs[path]&&imgs[path].complete){ res(imgs[path]); return; }
    const im=new Image();
    im.onload=()=>{ imgs[path]=im; res(im); };
    im.onerror=()=>rej(new Error("sprite:"+path));
    im.src=path+"?v="+BUILD;
  });
}

function partPaths(m){
  const s=new Set();
  const walk=["walk0","walk1"];
  for(const d of m.directions||DIR)
    for(const wf of walk){
      for(const x of m.shirts||[]) s.add(BASE+"torsos/"+x.id+"/"+wf+"/"+d+".png");
      for(const x of m.pants||[]) s.add(BASE+"pants/"+x.id+"/"+wf+"/"+d+".png");
      for(const x of m.shoes||[]) s.add(BASE+"shoes/"+x.id+"/"+wf+"/"+d+".png");
      for(const x of m.arms||[]) s.add(BASE+"arms/"+x.id+"/"+wf+"/"+d+".png");
      for(const x of m.skins||[]) s.add(BASE+"skins/"+x.id+"/"+wf+"/"+d+".png");
      for(const x of m.hairs||[]) s.add(BASE+"hairs/"+x.id+"/"+wf+"/"+d+".png");
    }
  return [...s];
}

function init(){
  if(loadP) return loadP;
  loadP=fetch(META_URL+"?v="+BUILD)
    .then(r=>r.json())
    .then(m=>{ meta=m; return Promise.all(partPaths(m).map(loadImg)); })
    .then(()=>{ ready=true; })
    .catch(e=>{ console.warn("PeopleSprites load failed",e); ready=false; });
  return loadP;
}

function pick(arr, seed){ return arr[Math.abs(seed)%arr.length]; }

function resolveOutfit(p){
  if(p._gta2Outfit) return p._gta2Outfit;
  const seed=p._visSeed!=null?p._visSeed:((p.x|0)*7919+(p.y|0)*6151)|0;
  const shirts=meta.shirts||[];
  const pants=meta.pants||[];
  const skins=meta.skins||[];
  const hairs=meta.hairs||[];
  const o={
    shirt: pick(shirts, seed+31).id,
    pants: pick(pants, seed+17).id,
    skin: pick(skins, seed+5).id,
    hair: pick(hairs, seed+59).id,
  };
  if(p.shirtId) o.shirt=p.shirtId;
  if(p.pantsId) o.pants=p.pantsId;
  if(p.skinId) o.skin=p.skinId;
  if(p.hairId) o.hair=p.hairId;
  if(p.hairStyle==="bald"||p.hair==null) o.hair=null;
  p._gta2Outfit=o;
  return o;
}

function snap8(a){
  const d=((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  return Math.round(d/(Math.PI/4))%(DIR.length);
}

function walkFrame(p){
  const mv=Math.hypot(p.vx||0,p.vy||0);
  const t=p.previewT!=null?p.previewT:performance.now()*0.001;
  return mv>4?((Math.sin(t*13)>0)?1:0):0;
}

function dirName(p){
  return DIR[snap8(p.a||0)];
}

function layerPaths(o, wf, direction){
  const order=meta.layer_order||["shoes","pants","arms","torso","skin","hair"];
  const map={
    shoes:"shoes/"+o.pants,
    pants:"pants/"+o.pants,
    arms:"arms/default",
    torso:"torsos/"+o.shirt,
    skin:"skins/"+o.skin,
    hair:o.hair?"hairs/"+o.hair:null,
  };
  const out=[];
  for(const k of order){
    const rel=map[k];
    if(!rel) continue;
    out.push(BASE+rel+"/"+wf+"/"+direction+".png");
  }
  return out;
}

function drawComposite(c, p, down){
  const o=resolveOutfit(p);
  const sc=((p.r||9)/9)*2.05;
  const ax=(meta.anchor||[8,20])[0]*sc;
  const ay=(meta.anchor||[8,20])[1]*sc;
  c.imageSmoothingEnabled=false;

  c.fillStyle="rgba(0,0,0,.28)";
  c.fillRect(-7*sc, 2*sc, 14*sc, 3*sc);

  if(down){
    const wf="walk0", dir=dirName(p);
    for(const path of layerPaths(o, wf, dir)){
      const im=imgs[path];
      if(!im||!im.complete) continue;
      c.drawImage(im, -ax, -ay, im.width*sc, im.height*sc);
    }
    c.save();
    c.rotate(Math.PI/2);
    c.fillStyle="rgba(0,0,0,.2)";
    c.fillRect(-5*sc, 0, 10*sc, 4*sc);
    c.restore();
    return;
  }

  const wf="walk"+walkFrame(p);
  const dir=dirName(p);
  for(const path of layerPaths(o, wf, dir)){
    const im=imgs[path];
    if(!im||!im.complete) continue;
    c.drawImage(im, -ax, -ay, im.width*sc, im.height*sc);
  }

  if(p.hostile){
    c.strokeStyle="rgba(255,60,40,.85)"; c.lineWidth=1.5;
    c.strokeRect(-10*sc,-12*sc,20*sc,22*sc);
  }
}

function draw(c,p,color,down){
  if(!ready||!meta){ if(global.People2D) global.People2D.draw(c,p,color,down); return; }
  c.save();
  c.translate(p.x,p.y);
  drawComposite(c,p,down);
  c.restore();
}

const PeopleSprites={
  draw, init, BUILD, DIR,
  get ready(){ return ready; },
  get meta(){ return meta; },
  resolveOutfit,
  dirName, walkFrame,
};
global.PeopleSprites=PeopleSprites;
init();
})(typeof window!=="undefined"?window:globalThis);
