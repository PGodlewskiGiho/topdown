/* TOPDOWN CITY — 42-pause-menu.js */
/* Pause menu (Esc): controls, map, missions, stats */

let pauseOpen=false, pauseTab="controls", pauseMapActive=false;

const pauseEl=document.getElementById("pause-menu");
const pauseMapCv=document.getElementById("pause-map-cv");
const pauseMapCtx=pauseMapCv?pauseMapCv.getContext("2d"):null;
const pauseMapWrap=document.getElementById("pause-map-wrap");

function isGamePaused(){
  return pauseOpen || (typeof bigMapOpen!=="undefined"&&bigMapOpen);
}

function setPauseTab(tab){
  pauseTab=tab;
  pauseMapActive=tab==="map";
  for(const btn of document.querySelectorAll(".pause-tab")){
    btn.classList.toggle("on", btn.dataset.tab===tab);
  }
  for(const id of ["controls","map","missions","perf","stats"]){
    document.getElementById("pause-tab-"+id)?.classList.toggle("hidden", id!==tab);
  }
  if(tab==="missions") refreshPauseMissions();
  if(tab==="stats") refreshPauseStats();
  if(tab==="perf" && typeof refreshPerfPauseUi==="function") refreshPerfPauseUi();
  if(pauseMapActive){
    if(typeof resizeActiveMap==="function") resizeActiveMap();
    if(typeof drawPauseMap==="function") drawPauseMap();
  }
}

function refreshPauseMissions(){
  const box=document.getElementById("pause-mission-body");
  if(!box) return;
  if(typeof mission!=="undefined"&&mission){
    const s=Math.max(0,Math.ceil(mission.timeLeft));
    const time=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
    const obj=typeof objectiveText==="function"?objectiveText(mission):"";
    box.innerHTML=`
      <div class="pm-title">${mission.title}</div>
      <div class="pm-objective">${obj}</div>
      <div class="pm-row"><span>Czas</span><b>${time}</b></div>
      <div class="pm-row"><span>Nagroda</span><b>$${mission.reward||0}</b></div>
      ${mission.type==="wreck"?`<div class="pm-row"><span>Postęp</span><b>${mission.progress||0} / ${mission.goal||0}</b></div>`:""}
      ${mission.type==="taxi"?`<div class="pm-row"><span>Etap</span><b>${mission.stageIndex===0?"Odbiór":"Dowóz"}</b></div>`:""}
    `;
    return;
  }
  if(typeof pickup!=="undefined"&&pickup){
    box.innerHTML=`
      <div class="pm-title">Nowa misja</div>
      <div class="pm-objective">Udaj się do zielonego markera na mapie, aby rozpocząć kolejną misję.</div>
      <div class="pm-row"><span>Pozycja</span><b>${(pickup.x/100|0)*100} m · ${(pickup.y/100|0)*100} m</b></div>
    `;
    return;
  }
  box.innerHTML='<p class="pause-empty">Brak aktywnej misji. Szukaj zielonego markera na mapie.</p>';
}

function refreshPauseStats(){
  const box=document.getElementById("pause-stats-body");
  if(!box) return;
  const rows=[
    ["Gotówka", "$"+(typeof money!=="undefined"?money:0)],
    ["Ukończone misje", String(typeof stats!=="undefined"?stats.missionsDone:0)],
    ["Śmierci", String(typeof stats!=="undefined"?stats.deaths||0:0)],
    ["Poziom poszukiwania", typeof stars!=="undefined"?("★".repeat(stars)||"brak"):"—"],
    ["Tryb", typeof mode!=="undefined"?mode:"—"],
    ["Pojazd", typeof car!=="undefined"?(car.brand+" "+car.carName):"—"],
  ];
  if(typeof getWorldSeed==="function"){
    const s=getWorldSeed();
    rows.push(["Świat (seed)", s.toString(16).toUpperCase().padStart(8,"0")]);
  }
  if(typeof perfQualityLabel==="function") rows.push(["Wydajność", perfQualityLabel()]);
  if(typeof navTarget!=="undefined"&&navTarget){
    const p=typeof playerWorldPos==="function"?playerWorldPos():{x:0,y:0};
    const d=Math.hypot(navTarget.x-p.x,navTarget.y-p.y);
    rows.push(["Cel GPS", Math.round(d)+" m"]);
  }
  box.innerHTML=rows.map(([k,v])=>`<div class="pause-stat"><span>${k}</span><b>${v}</b></div>`).join("");
}

function togglePauseMenu(force, tab){
  if(typeof gamePhase==="undefined"||gamePhase!=="playing") return;
  if(typeof invOpen!=="undefined"&&invOpen) return;
  pauseOpen=force===undefined?!pauseOpen:!!force;
  if(!pauseOpen){
    pauseMapActive=false;
    if(pauseEl) pauseEl.classList.add("hidden");
    document.body.classList.remove("pause-open");
    if(typeof firing!=="undefined") firing=false;
    return;
  }
  if(tab) setPauseTab(tab);
  else setPauseTab(pauseTab||"controls");
  if(pauseEl) pauseEl.classList.remove("hidden");
  document.body.classList.add("pause-open");
  if(typeof firing!=="undefined") firing=false;
  refreshPauseMissions();
  refreshPauseStats();
  if(typeof refreshPerfPauseUi==="function") refreshPerfPauseUi();
}

function openPauseTab(tab){
  togglePauseMenu(true, tab||"map");
}

function pauseMapSize(){
  if(!pauseMapCv||!pauseMapWrap) return {W:640,H:360};
  const r=pauseMapWrap.getBoundingClientRect();
  return {W:Math.max(1,r.width), H:Math.max(1,r.height)};
}

function pauseMapCenterWorld(){
  const p=playerWorldPos();
  return {x:bigMapPan?bigMapPan.x:p.x, y:bigMapPan?bigMapPan.y:p.y};
}

function initPauseMenu(){
  document.getElementById("pause-resume")?.addEventListener("click", ()=>togglePauseMenu(false));
  document.getElementById("pause-tabs")?.addEventListener("click", ev=>{
    const btn=ev.target.closest("[data-tab]");
    if(btn) setPauseTab(btn.dataset.tab);
  });
  document.getElementById("pause-map-center")?.addEventListener("click", ()=>{
    if(typeof resetPauseMapView==="function") resetPauseMapView();
    if(typeof drawPauseMap==="function") drawPauseMap();
  });
  document.getElementById("pause-map-clear")?.addEventListener("click", ()=>{
    if(typeof clearNavTarget==="function") clearNavTarget();
    if(typeof drawPauseMap==="function") drawPauseMap();
  });
  if(pauseMapCv) initPauseMapEvents();
  const perfBox=document.getElementById("pause-perf-body");
  perfBox?.addEventListener("click", ev=>{
    const btn=ev.target.closest("[data-perf]");
    if(!btn || typeof setPerfQuality!=="function") return;
    setPerfQuality(btn.dataset.perf);
  });
  if(typeof refreshPerfPauseUi==="function") refreshPerfPauseUi();
}

function initPauseMapEvents(){
  let drag=null;
  pauseMapCv.addEventListener("mousedown", ev=>{
    if(!pauseMapActive) return;
    if(ev.button===2){
      if(typeof clearNavTarget==="function") clearNavTarget();
      if(typeof drawPauseMap==="function") drawPauseMap();
      ev.preventDefault();
      return;
    }
    const cen=pauseMapCenterWorld();
    drag={x:ev.clientX,y:ev.clientY,panX:cen.x,panY:cen.y};
  });
  window.addEventListener("mousemove", ev=>{
    if(!drag||!pauseMapActive) return;
    const dx=ev.clientX-drag.x, dy=ev.clientY-drag.y;
    if(Math.hypot(dx,dy)<4) return;
    const {W,H}=pauseMapSize();
    const span=typeof pauseMapSpan!=="undefined"?pauseMapSpan:4800;
    if(typeof rotatingMapPanByDrag==="function"){
      bigMapPan=rotatingMapPanByDrag(drag.panX,drag.panY,dx,dy,W,H,span);
    } else {
      const MS=Math.min(W,H)/span;
      bigMapPan={x:drag.panX-dx/MS, y:drag.panY-dy/MS};
    }
    if(typeof drawPauseMap==="function") drawPauseMap();
  });
  window.addEventListener("mouseup", ev=>{
    if(!drag||!pauseMapActive) return;
    const dx=ev.clientX-drag.x, dy=ev.clientY-drag.y;
    drag=null;
    if(Math.hypot(dx,dy)<5&&ev.button===0){
      const r=pauseMapCv.getBoundingClientRect();
      const {W,H}=pauseMapSize();
      const span=typeof pauseMapSpan!=="undefined"?pauseMapSpan:4800;
      const cen=pauseMapCenterWorld();
      const w=typeof rotatingMapScreenToWorld==="function"
        ?rotatingMapScreenToWorld(ev.clientX-r.left, ev.clientY-r.top, W, H, cen.x, cen.y, span)
        :{x:cen.x,y:cen.y};
      if(mapDiscoveredAt(w.x,w.y)) setNavTarget(w.x,w.y);
      else showBigMsg("NIEODKRYTY TEREN");
      if(typeof drawPauseMap==="function") drawPauseMap();
    }
  });
  pauseMapCv.addEventListener("contextmenu", ev=>ev.preventDefault());
  pauseMapCv.addEventListener("wheel", ev=>{
    if(!pauseMapActive) return;
    ev.preventDefault();
    const span=typeof pauseMapSpan!=="undefined"?pauseMapSpan:4800;
    pauseMapSpan=clamp(span*(ev.deltaY<0?0.9:1/0.9), typeof PAUSE_MAP_SPAN_MIN!=="undefined"?PAUSE_MAP_SPAN_MIN:2200, typeof PAUSE_MAP_SPAN_MAX!=="undefined"?PAUSE_MAP_SPAN_MAX:9200);
    if(typeof drawPauseMap==="function") drawPauseMap();
  }, {passive:false});
}

function updatePauseHud(){
  if(!pauseOpen) return;
  if(pauseTab==="missions"&&typeof refreshPauseMissions==="function") refreshPauseMissions();
}

Game.register({id:"pause", order:42, updateAlways:true, update(dt){ updatePauseHud(); }});
initPauseMenu();
