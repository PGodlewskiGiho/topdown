/* TOPDOWN CITY — 57-loading.js — Onimusha-style boot gate */
(function(){
"use strict";

const TEX_KEYS=[
  "grass","grass_forest","concrete","asphalt","sand","sand_desert","riverbed",
  "water_lake","water_river","water_shallow","dirt","forest_trail","roof",
  "plaster","plasterB","bricktex","paneltex","glasstex","stonetex",
];

function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

function waitUntil(label, test, timeoutMs){
  const timeout=timeoutMs!=null?timeoutMs:22000;
  return new Promise((resolve, reject)=>{
    const t0=performance.now();
    const tick=()=>{
      let ok=false;
      try{ ok=!!test(); }catch(e){}
      if(ok) return resolve();
      if(performance.now()-t0>=timeout) return reject(new Error("timeout:"+label));
      requestAnimationFrame(tick);
    };
    tick();
  });
}

async function waitUntilOptional(label, test, timeoutMs){
  try{
    await waitUntil(label, test, timeoutMs);
  }catch(err){
    console.warn("LoadingScreen optional:", label, err&&err.message||err);
  }
}

function setStatus(text){
  const el=document.getElementById("load-status");
  if(el) el.textContent=text;
}

function setProgress(ratio){
  const pct=Math.round(clamp(ratio,0,1)*100);
  const fill=document.getElementById("load-fill");
  const pctEl=document.getElementById("load-pct");
  const bar=document.querySelector(".oni-load-bar");
  if(fill) fill.style.width=pct+"%";
  if(pctEl) pctEl.textContent=pct+"%";
  if(bar) bar.setAttribute("aria-valuenow", String(pct));
}

const Sakura={
  cv:null, ctx:null, petals:[], w:0, h:0,
  init(){
    this.cv=document.getElementById("load-sakura");
    if(!this.cv) return;
    this.ctx=this.cv.getContext("2d");
    this.resize();
    window.addEventListener("resize", ()=>this.resize());
    this.petals.length=0;
    const n=Math.min(72, Math.max(28, (this.w*this.h/18000)|0));
    for(let i=0;i<n;i++) this.petals.push(this.spawn(true));
  },
  resize(){
    if(!this.cv) return;
    this.w=window.innerWidth; this.h=window.innerHeight;
    this.cv.width=this.w; this.cv.height=this.h;
  },
  spawn(scatter){
    return {
      x:scatter?Math.random()*this.w:this.w*0.5+(Math.random()-0.5)*40,
      y:scatter?-20-Math.random()*this.h*0.4:-12-Math.random()*30,
      vx:(Math.random()-0.5)*28,
      vy:22+Math.random()*38,
      rot:Math.random()*6.283,
      vr:(Math.random()-0.5)*1.8,
      sx:5+Math.random()*7,
      sy:3+Math.random()*4,
      a:0.35+Math.random()*0.45,
      hue:340+Math.random()*18,
    };
  },
  tick(dt){
    if(!this.ctx) return;
    const c=this.ctx, w=this.w, h=this.h;
    c.clearRect(0,0,w,h);
    for(const p of this.petals){
      p.x+=p.vx*dt+Math.sin(p.y*0.018)*12*dt;
      p.y+=p.vy*dt;
      p.rot+=p.vr*dt;
      if(p.y>h+24||p.x<-30||p.x>w+30) Object.assign(p, this.spawn(false));
      c.save();
      c.translate(p.x,p.y);
      c.rotate(p.rot);
      c.globalAlpha=p.a;
      c.fillStyle="hsl("+p.hue+", 68%, 82%)";
      c.beginPath();
      c.ellipse(0,0,p.sx,p.sy,0,0,Math.PI*2);
      c.fill();
      c.fillStyle="hsl("+p.hue+", 55%, 72%)";
      c.beginPath();
      c.ellipse(p.sx*0.15,0,p.sx*0.55,p.sy*0.7,0.3,0,Math.PI*2);
      c.fill();
      c.restore();
    }
    c.globalAlpha=1;
  },
};

const LoadingScreen={
  done:false,
  failed:false,
  awaitingContinue:false,
  _pulse:0,
  tick(dt){
    this._pulse+=dt;
    Sakura.tick(dt);
    const kanji=document.querySelector(".oni-load-kanji");
    if(kanji){
      const a=0.55+Math.sin(this._pulse*2.4)*0.12;
      kanji.style.opacity=String(a);
    }
    if(this.awaitingContinue){
      const btn=document.getElementById("load-continue");
      if(btn){
        const glow=0.85+Math.sin(this._pulse*3.2)*0.15;
        btn.style.boxShadow="0 0 "+(18+Math.sin(this._pulse*2)*8)+"px rgba(201,162,74,"+glow.toFixed(2)+")";
      }
    }
  },
  async run(){
    const screen=document.getElementById("loading-screen");
    const menu=document.getElementById("menu");
    const hud=document.getElementById("hud");
    Sakura.init();
    if(typeof gamePhase!=="undefined") gamePhase="loading";
    document.body.classList.add("is-loading");
    document.body.classList.remove("in-menu");
    if(menu) menu.classList.add("hidden");
    if(hud) hud.style.visibility="hidden";
    if(screen) screen.classList.remove("hidden");

    const tasks=[
      {w:4,  label:"Inicjalizacja świata", run:async()=>{
        if(typeof getLot==="function"){ getLot(1,2); getLot(2,1); }
        await wait(40);
      }},
      {w:6,  label:"Tekstury terenu", run:async()=>{
        if(typeof getTex!=="function") return;
        for(const k of TEX_KEYS) getTex(k);
        await wait(80);
      }},
      {w:30, label:"Postacie i animacje", run:async(ctx)=>{
        if(typeof PeopleSprites==="undefined"||!PeopleSprites.whenBootReady) return;
        const poll=setInterval(()=>{
          if(ctx&&typeof ctx.onSubProgress==="function"){
            const r=PeopleSprites.getBootLoadRatio?PeopleSprites.getBootLoadRatio():0;
            ctx.onSubProgress(r);
          }
          if(PeopleSprites.tickLoadQueue) PeopleSprites.tickLoadQueue();
        }, 60);
        try{
          const ok=await PeopleSprites.whenBootReady(32000);
          if(!ok) throw new Error("sprites");
        }finally{
          clearInterval(poll);
        }
      }},
      {w:14, label:"Roślinność leśna", run:async()=>{
        await waitUntilOptional("forest-grass", ()=>window.FOREST_GRASS&&FOREST_GRASS.ready, 18000);
      }},
      {w:10, label:"Pustynne podłoże", run:async()=>{
        await waitUntilOptional("desert-floor", ()=>window.DESERT_FLOOR&&DESERT_FLOOR.ready, 16000);
      }},
      {w:14, label:"Drzewa i rośliny", run:async()=>{
        await waitUntilOptional("trees", ()=>window.TREE_SPRITE&&TREE_SPRITE.ready, 18000);
      }},
      {w:10, label:"Dzika fauna", run:async()=>{
        await waitUntilOptional("wildlife", ()=>window.WILD_SPRITE&&WILD_SPRITE.ready, 16000);
      }},
      {w:6,  label:"Niedźwiedzie", run:async()=>{
        await waitUntilOptional("bears", ()=>window.BEAR_SPRITE&&BEAR_SPRITE.ready, 14000);
      }},
      {w:6,  label:"Czcionki", run:async()=>{
        if(document.fonts&&document.fonts.ready) await document.fonts.ready;
        await wait(120);
      }},
      {w:10, label:"Finalizacja", run:async()=>{
        if(typeof PeopleSprites!=="undefined"&&PeopleSprites.tickLoadQueue){
          const t0=performance.now();
          while(performance.now()-t0<5000){
            PeopleSprites.tickLoadQueue();
            const r=PeopleSprites.getBootLoadRatio?PeopleSprites.getBootLoadRatio():1;
            if(r>=0.97) break;
            await wait(80);
          }
        }
        await wait(160);
      }},
    ];

    const totalW=tasks.reduce((s,t)=>s+t.w,0);
    let doneW=0;
    setProgress(0);
    setStatus("Przygotowanie…");

    try{
      for(const task of tasks){
        setStatus(task.label);
        const taskStartW=doneW;
        const ctx={
          onSubProgress(sub){
            setProgress((taskStartW+task.w*clamp(sub,0,1))/totalW);
          },
        };
        await task.run(ctx);
        doneW+=task.w;
        setProgress(doneW/totalW);
      }
      setProgress(1);
      setStatus("準備完了 — kliknij Kontynuuj");
      this.awaitingContinue=true;
      const cont=document.getElementById("load-continue");
      if(cont) cont.classList.remove("hidden");
    }catch(err){
      console.error("LoadingScreen", err);
      setStatus("Błąd ładowania — ponów (F5)");
      this.failed=true;
      const retry=document.getElementById("load-retry");
      if(retry) retry.classList.remove("hidden");
    }
  },
  onContinue(){
    if(this.done||this.failed||!this.awaitingContinue) return;
    this.awaitingContinue=false;
    if(typeof playLoadComplete==="function") playLoadComplete();
    this.finish(true);
  },
  finish(ok){
    if(this.done) return;
    this.done=true;
    const screen=document.getElementById("loading-screen");
    const hud=document.getElementById("hud");
    const cont=document.getElementById("load-continue");
    if(cont) cont.classList.add("hidden");
    if(screen){
      screen.classList.add("oni-load-out");
      setTimeout(()=>screen.classList.add("hidden"), 700);
    }
    document.body.classList.remove("is-loading");
    if(hud) hud.style.visibility="";
    if(ok){
      if(typeof initStartMenu==="function") initStartMenu();
      else if(typeof gamePhase!=="undefined") gamePhase="menu";
    }
  },
};

window.LoadingScreen=LoadingScreen;

document.getElementById("load-retry")?.addEventListener("click", ()=>location.reload());
document.getElementById("load-continue")?.addEventListener("click", ()=>LoadingScreen.onContinue());

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", ()=>LoadingScreen.run());
}else{
  LoadingScreen.run();
}
})();
