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

const LoadingScreen={
  done:false,
  failed:false,
  _pulse:0,
  tick(dt){
    this._pulse+=dt;
    const kanji=document.querySelector(".oni-load-kanji");
    if(kanji){
      const a=0.55+Math.sin(this._pulse*2.4)*0.12;
      kanji.style.opacity=String(a);
    }
  },
  async run(){
    const screen=document.getElementById("loading-screen");
    const menu=document.getElementById("menu");
    const hud=document.getElementById("hud");
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
      {w:22, label:"Postacie i animacje", run:async()=>{
        if(typeof PeopleSprites==="undefined"||!PeopleSprites.whenBootReady) return;
        const ok=await PeopleSprites.whenBootReady(16000);
        if(!ok) throw new Error("sprites");
      }},
      {w:14, label:"Roślinność leśna", run:async()=>{
        await waitUntil("forest-grass", ()=>window.FOREST_GRASS&&FOREST_GRASS.ready, 18000);
      }},
      {w:10, label:"Pustynne podłoże", run:async()=>{
        await waitUntil("desert-floor", ()=>window.DESERT_FLOOR&&DESERT_FLOOR.ready, 16000);
      }},
      {w:14, label:"Drzewa i rośliny", run:async()=>{
        await waitUntil("trees", ()=>window.TREE_SPRITE&&TREE_SPRITE.ready, 18000);
      }},
      {w:10, label:"Dzika fauna", run:async()=>{
        await waitUntil("wildlife", ()=>window.WILD_SPRITE&&WILD_SPRITE.ready, 16000);
      }},
      {w:6,  label:"Niedźwiedzie", run:async()=>{
        await waitUntil("bears", ()=>window.BEAR_SPRITE&&BEAR_SPRITE.ready, 14000);
      }},
      {w:6,  label:"Czcionki", run:async()=>{
        if(document.fonts&&document.fonts.ready) await document.fonts.ready;
        await wait(120);
      }},
      {w:8,  label:"Finalizacja", run:async()=>{
        if(typeof PeopleSprites!=="undefined"&&PeopleSprites.tickLoadQueue) PeopleSprites.tickLoadQueue();
        await wait(280);
      }},
    ];

    const totalW=tasks.reduce((s,t)=>s+t.w,0);
    let doneW=0;
    setProgress(0);
    setStatus("Przygotowanie…");

    try{
      for(const task of tasks){
        setStatus(task.label);
        await task.run();
        doneW+=task.w;
        setProgress(doneW/totalW);
      }
      setProgress(1);
      setStatus("Gotowe");
      await wait(420);
      this.finish(true);
    }catch(err){
      console.error("LoadingScreen", err);
      setStatus("Błąd ładowania — ponów (F5)");
      this.failed=true;
      const retry=document.getElementById("load-retry");
      if(retry) retry.classList.remove("hidden");
    }
  },
  finish(ok){
    if(this.done) return;
    this.done=true;
    const screen=document.getElementById("loading-screen");
    const hud=document.getElementById("hud");
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

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", ()=>LoadingScreen.run());
}else{
  LoadingScreen.run();
}
})();
