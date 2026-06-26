/* TOPDOWN CITY — 57-loading.js — minimal boot gate */
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
  const orb=document.getElementById("load-orb");
  if(orb) orb.setAttribute("aria-valuenow", String(Math.round(clamp(ratio,0,1)*100)));
}

const LoadingScreen={
  done:false,
  failed:false,
  awaitingContinue:false,
  tick(){},
  async run(){
    const screen=document.getElementById("loading-screen");
    const menu=document.getElementById("menu");
    const hud=document.getElementById("hud");
    if(typeof gamePhase!=="undefined") gamePhase="loading";
    document.body.classList.add("is-loading");
    document.body.classList.remove("in-menu");
    if(menu) menu.classList.add("hidden");
    if(hud) hud.style.visibility="hidden";
    if(screen) screen.classList.remove("hidden","load-done");

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
      if(screen) screen.classList.add("load-done");
      setStatus("Gotowe — kliknij Kontynuuj");
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
      setTimeout(()=>screen.classList.add("hidden"), 500);
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
