/* people-sprites.js — composited PNG pedestrian renderer */
(function(global){
"use strict";

const BUILD=20260710;
const BASE="assets/people/parts/";
const imgs={};
let meta=null, loadP=null, ready=false;

function loadImg(path){
  return new Promise((res,rej)=>{
    if(imgs[path]&&imgs[path].complete){ res(imgs[path]); return; }
    const im=new Image();
    im.onload=()=>{ imgs[path]=im; res(im); };
    im.onerror=()=>rej(new Error("sprite:"+path));
    im.src=path+"?v="+BUILD;
  });
}

function collectPaths(m){
  const s=new Set();
  for(const cat of ["heads","shirts","pants","shoes","hair"])
    for(const p of m[cat]||[]) s.add(BASE+p.file);
  s.add(BASE+m.poses.walk[0]); s.add(BASE+m.poses.walk[1]);
  s.add(BASE+m.poses.down);
  return [...s];
}

function init(){
  if(loadP) return loadP;
  loadP=fetch("assets/people/meta.json?v="+BUILD)
    .then(r=>r.json())
    .then(m=>{ meta=m; return Promise.all(collectPaths(m).map(loadImg)); })
    .then(()=>{ ready=true; })
    .catch(e=>{ console.warn("PeopleSprites load failed",e); ready=false; });
  return loadP;
}

function pick(arr, seed){ return arr[Math.abs(seed)%arr.length]; }
function genderOf(p){ return p.body==="female"?"female":"male"; }

function resolveOutfit(p){
  if(p._spriteOutfit) return p._spriteOutfit;
  const g=genderOf(p);
  const seed=p._visSeed!=null?p._visSeed:((p.x|0)*7919+(p.y|0)*6151)|0;
  let head=pick(meta.heads.filter(h=>h.gender===g), seed);
  if(p.archetypeId==="city_elder"||p.age==="senior") head=meta.heads.find(h=>h.id==="elder")||head;
  if(g==="female") head=meta.heads.find(h=>h.id==="female")||head;
  if(g==="male"&&(head.id==="female")) head=meta.heads.find(h=>h.id==="male")||head;
  let pantsPool=meta.pants.filter(x=>x.gender==="unisex"||x.gender===g);
  if(meta.rules){
    if(g==="male") pantsPool=pantsPool.filter(x=>!meta.rules.female_only_pants.includes(x.id));
    if(g==="female") pantsPool=pantsPool.filter(x=>!meta.rules.male_only_pants.includes(x.id));
  }
  const o={
    head, shirt:pick(meta.shirts, seed+31), pants:pick(pantsPool, seed+17),
    shoes:pick(meta.shoes, seed+47), hair:null,
  };
  if(p.hair!=null&&p.hairStyle!=="bald"&&head.id!=="elder"){
    let hp=meta.hair.filter(h=>h.gender==="unisex"||h.gender===g);
    if(g==="male") hp=hp.filter(h=>!h.id.includes("long"));
    o.hair=pick(hp, seed+59);
  }
  p._spriteOutfit=o;
  return o;
}

function snap8(a){
  const d=((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  return Math.round(d/(Math.PI/4))*(Math.PI/4);
}

function walkFrame(p){
  const mv=Math.hypot(p.vx||0,p.vy||0);
  const t=p.previewT!=null?p.previewT:performance.now()*0.001;
  return mv>4?((Math.sin(t*13)>0)?1:0):0;
}

function blit(c, path, sc){
  const im=imgs[path];
  if(!im||!im.complete) return;
  const w=im.width*sc, h=im.height*sc;
  c.drawImage(im, -w*0.5, -h*0.55, w, h);
}

function drawComposite(c, p, down){
  const o=resolveOutfit(p);
  const sc=2.1*((p.r||9)/9);
  c.imageSmoothingEnabled=false;
  c.fillStyle="rgba(0,0,0,.28)";
  c.fillRect(-8*sc, 6*sc, 16*sc, 4*sc);
  if(down){
    blit(c, BASE+meta.poses.down, sc);
    blit(c, BASE+o.head.file, sc);
    return;
  }
  blit(c, BASE+o.shoes.file, sc);
  blit(c, BASE+o.pants.file, sc);
  blit(c, BASE+meta.poses.walk[walkFrame(p)], sc);
  blit(c, BASE+o.shirt.file, sc);
  if(o.hair) blit(c, BASE+o.hair.file, sc);
  blit(c, BASE+o.head.file, sc);
  if(p.hostile){
    c.strokeStyle="rgba(255,60,40,.85)"; c.lineWidth=1.5;
    c.strokeRect(-14*sc,-16*sc,28*sc,30*sc);
  }
}

function draw(c,p,color,down){
  if(!ready||!meta){ if(global.People2D) global.People2D.draw(c,p,color,down); return; }
  c.save();
  c.translate(p.x,p.y);
  c.rotate(snap8(p.a||0));
  drawComposite(c,p,down);
  c.restore();
}

const PeopleSprites={draw, init, BUILD, get ready(){return ready;}};
global.PeopleSprites=PeopleSprites;
init();
})(typeof window!=="undefined"?window:globalThis);
