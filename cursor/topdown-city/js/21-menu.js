/* TOPDOWN CITY — 21-menu.js */
/* ---------- start menu (new game / load + roguelike death respawn) ---------- */
let gamePhase="loading";                                     // loading | menu | newgame | playing | ...
const menuState={biome:"city", variant:0, preview:null, newWorld:true, preparedSeed:null};
let respawnMode=false, respawnAnchor={x:0,y:0}, lastDeathReason="";
const BIOMES_UI=[
  {id:"city", label:"Miasto"},
  {id:"forest", label:"Las"},
  {id:"desert", label:"Pustynia"},
  {id:"sea", label:"Wybrzeże"},
];
const DEATH_COPY={
  wasted:{title:"WYELIMINOWANY", sub:"Run zakończony — świat zostaje, zaczynasz jako ktoś nowy."},
  busted:{title:"ZWINIĘTY", sub:"Policja cię dopadła — nowa tożsamość w tym samym mieście."},
};
function spawnOptionsForBiome(biome){
  if(biome==="city") return CITY_SPAWN_PRESETS.map((p,variant)=>({variant, label:p.label}));
  const n=biome==="forest"?4:3;
  return Array.from({length:n}, (_,variant)=>({variant, label:(BIOMES[biome]?.name||biome)+" · trasa "+(variant+1)}));
}
function hideMenuPanels(){
  for(const id of ["menu-main","menu-char","menu-new","menu-death"])
    document.getElementById(id)?.classList.add("hidden");
}
function setCharPanelMode(respawn){
  const h2=document.querySelector("#menu-char h2");
  const next=document.getElementById("btn-char-next");
  const back=document.getElementById("btn-char-back");
  if(h2) h2.textContent=respawn?"Nowa postać":"Stwórz postać";
  if(next) next.textContent=respawn?"Odrodź się →":"Dalej — wybór świata →";
  if(back) back.textContent=respawn?"← Wróć":"← Wróć";
}
function formatWorldSeed(s){
  return (s>>>0).toString(16).toUpperCase().padStart(8,"0");
}
function wantsNewWorld(){
  const chk=document.getElementById("chk-new-world");
  return chk ? chk.checked : menuState.newWorld;
}
function refreshWorldPreview(){
  const el=document.getElementById("world-seed-preview");
  const btn=document.getElementById("btn-reroll-world");
  const seed=typeof getWorldSeed==="function"?getWorldSeed():null;
  if(el){
    if(seed==null) el.textContent="Seed niedostępny";
    else if(wantsNewWorld()) el.textContent="Nowy świat · seed "+formatWorldSeed(seed);
    else el.textContent="Obecny świat · seed "+formatWorldSeed(seed);
  }
  if(btn) btn.disabled=!wantsNewWorld();
}
function applyNewWorldChoice(force){
  if(!wantsNewWorld() && !force){ refreshWorldPreview(); return; }
  const cur=typeof getWorldSeed==="function"?getWorldSeed():null;
  if(!force && wantsNewWorld() && menuState.preparedSeed!=null && menuState.preparedSeed===cur){
    refreshWorldPreview();
    return;
  }
  if(typeof generateNewWorld==="function"){
    generateNewWorld();
    menuState.preparedSeed=typeof getWorldSeed==="function"?getWorldSeed():null;
    if(typeof clearLivingWorld==="function") clearLivingWorld();
    getLot(1,2); getLot(2,1);
  }
  refreshWorldPreview();
  refreshSpawnPreview();
}
function initNewWorldControls(){
  const chk=document.getElementById("chk-new-world");
  const reroll=document.getElementById("btn-reroll-world");
  if(chk){
    chk.checked=menuState.newWorld!==false;
    chk.addEventListener("change", ()=>{
      menuState.newWorld=chk.checked;
      if(chk.checked) applyNewWorldChoice(true);
    else{ menuState.preparedSeed=null; refreshWorldPreview(); }
    });
  }
  reroll?.addEventListener("click", ()=>{
    if(!wantsNewWorld()) return;
    applyNewWorldChoice(true);
    renderSpawnChoices();
  });
}
function refreshSpawnPreview(){
  try{
    const sp=getSpawnPoint(menuState.biome, menuState.variant);
    menuState.preview=sp;
    focusX=sp.x; focusY=sp.y; cam.x=sp.x; cam.y=sp.y;
    const el=document.getElementById("spawn-preview");
    if(el) el.textContent=sp.label+" · komórka "+sp.i+","+sp.j+" · "+sp.district;
  }catch(e){
    console.error("spawn preview", e);
    const el=document.getElementById("spawn-preview");
    if(el) el.textContent="Podgląd niedostępny — wybierz biom i start";
  }
}
function renderSpawnChoices(){
  const box=document.getElementById("spawn-choices");
  if(!box) return;
  box.innerHTML="";
  const opts=spawnOptionsForBiome(menuState.biome);
  if(menuState.variant>=opts.length) menuState.variant=0;
  for(const o of opts){
    const b=document.createElement("button");
    b.type="button";
    b.className="menu-choice"+(o.variant===menuState.variant?" on":"");
    b.textContent=o.label;
    b.dataset.variant=String(o.variant);
    b.addEventListener("click", ()=>{
      menuState.variant=o.variant|0;
      renderSpawnChoices();
      refreshSpawnPreview();
    });
    box.appendChild(b);
  }
  refreshSpawnPreview();
}
function showMenuPanel(id){
  hideMenuPanels();
  const panelId=id==="main"?"menu-main":id==="char"?"menu-char":id==="new"?"menu-new":"menu-death";
  document.getElementById(panelId)?.classList.remove("hidden");
  if(id==="new" && !respawnMode){
    const chk=document.getElementById("chk-new-world");
    if(chk) chk.checked=menuState.newWorld!==false;
    if(wantsNewWorld()) applyNewWorldChoice(false);
    else refreshWorldPreview();
  }
  if(id==="main"){ gamePhase="menu"; respawnMode=false; }
  else if(id==="char") gamePhase=respawnMode?"respawn":"charcreate";
  else if(id==="new") gamePhase="newgame";
  else if(id==="death") gamePhase="dead";
}
function showDeathPanel(reason){
  respawnMode=false;
  lastDeathReason=reason||"wasted";
  const copy=DEATH_COPY[lastDeathReason]||DEATH_COPY.wasted;
  const titleEl=document.getElementById("death-title");
  const subEl=document.getElementById("death-sub");
  const seedEl=document.getElementById("death-world");
  if(titleEl) titleEl.textContent=copy.title;
  if(subEl) subEl.textContent=copy.sub;
  if(seedEl && typeof getWorldSeed==="function"){
    const s=getWorldSeed();
    seedEl.textContent="Ten sam świat · seed "+s.toString(16).toUpperCase().padStart(8,"0");
  }
  const deathsEl=document.getElementById("death-stats");
  if(deathsEl && typeof stats!=="undefined") deathsEl.textContent="Śmierci w tym świecie: "+(stats.deaths||0);
  document.getElementById("menu")?.classList.remove("hidden");
  document.body.classList.add("in-menu");
  showMenuPanel("death");
}
function dismissMenu(){
  const m=document.getElementById("menu");
  if(!m) return;
  m.classList.add("hidden");
  document.body.classList.remove("in-menu");
  gamePhase="playing";
  respawnMode=false;
  initAudio();
  if(actx && actx.state==="suspended") actx.resume();
}
async function ensurePlayerAnimsReady(){
  if(typeof PeopleSprites==="undefined"||!PeopleSprites.whenPlayerAnimReady) return true;
  const screen=document.getElementById("loading-screen");
  const status=document.getElementById("load-status");
  const cont=document.getElementById("load-continue");
  if(screen){
    screen.classList.remove("hidden","load-done","oni-load-out");
    document.body.classList.add("is-loading");
  }
  if(cont) cont.classList.add("hidden");
  if(status) status.textContent="Animacje postaci…";
  let poll=null;
  try{
    poll=setInterval(()=>{
      if(PeopleSprites.tickLoadQueue) PeopleSprites.tickLoadQueue();
      const orb=document.getElementById("load-orb");
      if(orb&&PeopleSprites.getBootLoadRatio){
        orb.setAttribute("aria-valuenow", String(Math.round(PeopleSprites.getBootLoadRatio()*100)));
      }
    }, 50);
    return await PeopleSprites.whenPlayerAnimReady(90000);
  }finally{
    clearInterval(poll);
    if(screen){
      screen.classList.add("oni-load-out");
      setTimeout(()=>screen.classList.add("hidden"), 350);
    }
    document.body.classList.remove("is-loading");
  }
}
async function finishRespawn(){
  const seed=typeof getWorldSeed==="function"?getWorldSeed():null;
  if(typeof resetRunState==="function") resetRunState({keepWorld:true});
  else if(typeof resetNewGameState==="function") resetNewGameState();
  if(seed!=null && typeof applyWorldSeed==="function") applyWorldSeed(seed, false);
  if(typeof applyCharacterToPed==="function") applyCharacterToPed(playerCharacter);
  const p=typeof respawnPointNear==="function"?respawnPointNear(respawnAnchor.x,respawnAnchor.y):roadPoint();
  teleportPlayer(p.x, p.y);
  await ensurePlayerAnimsReady();
  dismissMenu();
  const who=(playerCharacter&&playerCharacter.name)||"Wędrowiec";
  showBigMsg(who+" · nowe życie");
  saveGame();
}
function openRespawnCreator(randomize){
  respawnMode=true;
  setCharPanelMode(true);
  if(randomize && typeof randomCharacter==="function") Object.assign(playerCharacter, randomCharacter());
  else if(typeof defaultCharacter==="function") Object.assign(playerCharacter, defaultCharacter());
  const nameEl=document.getElementById("char-name");
  if(nameEl) nameEl.value=playerCharacter.name;
  showMenuPanel("char");
  if(typeof renderCharacterUI==="function") renderCharacterUI();
  if(typeof startCharPreviewLoop==="function") startCharPreviewLoop();
}
function playerDeath(reason){
  if(gamePhase==="dead"||gamePhase==="respawn") return;
  respawnAnchor={
    x:(mode==="car"&&typeof car!=="undefined"&&!car.dead)?car.x:ped.x,
    y:(mode==="car"&&typeof car!=="undefined"&&!car.dead)?car.y:ped.y,
  };
  focusX=respawnAnchor.x; focusY=respawnAnchor.y; cam.x=respawnAnchor.x; cam.y=respawnAnchor.y;
  if(typeof stats!=="undefined") stats.deaths=(stats.deaths||0)+1;
  if(typeof firing!=="undefined") firing=false;
  if(typeof invOpen!=="undefined"&&invOpen){
    const el=document.getElementById("inventory");
    if(el) el.classList.add("hidden");
    document.body.classList.remove("inv-open");
    invOpen=false;
  }
  mode="foot"; interior=null;
  showDeathPanel(reason);
}
async function startLoadedGame(){
  loadGame();
  if(typeof applyCharacterToPed==="function") applyCharacterToPed();
  if(typeof car.x!=="number"||typeof car.y!=="number"||!isFinite(car.x)||!isFinite(car.y)){
    const sp=getSpawnPoint("city", 0);
    teleportPlayer(sp.x, sp.y);
  } else teleportPlayer(car.x, car.y);
  await ensurePlayerAnimsReady();
  dismissMenu();
}
async function startNewGame(){
  respawnMode=false;
  setCharPanelMode(false);
  menuState.newWorld=wantsNewWorld();
  if(typeof applyCharacterToPed==="function") applyCharacterToPed(playerCharacter);
  resetNewGameState();
  const sp=getSpawnPoint(menuState.biome, menuState.variant);
  if(typeof applyCharacterToPed==="function") applyCharacterToPed(playerCharacter);
  teleportPlayer(sp.x, sp.y);
  await ensurePlayerAnimsReady();
  dismissMenu();
  const who=(playerCharacter&&playerCharacter.name)||"Wędrowiec";
  showBigMsg(who+" · "+sp.district);
  saveGame();
}
function initDeathRespawn(){
  document.getElementById("btn-death-random")?.addEventListener("click", ()=>{
    if(typeof randomCharacter==="function") Object.assign(playerCharacter, randomCharacter());
    else if(typeof defaultCharacter==="function") Object.assign(playerCharacter, defaultCharacter());
    if(typeof applyCharacterToPed==="function") applyCharacterToPed(playerCharacter);
    finishRespawn();
  });
  document.getElementById("btn-death-create")?.addEventListener("click", ()=>openRespawnCreator(false));
  document.getElementById("btn-death-menu")?.addEventListener("click", ()=>{
    respawnMode=false;
    setCharPanelMode(false);
    showMenuPanel("main");
  });
}
function initStartMenu(){
  const menu=document.getElementById("menu");
  if(!menu){
    console.error("Brak #menu w index.html — zaktualizuj pliki gry (21-menu.js)");
    gamePhase="playing";
    return;
  }
  menu.classList.remove("hidden");
  document.body.classList.add("in-menu");
  gamePhase="menu";
  const btnNew=document.getElementById("btn-new");
  const btnLoad=document.getElementById("btn-load");
  const btnBack=document.getElementById("btn-back");
  const btnStart=document.getElementById("btn-start");
  const biomeBox=document.getElementById("biome-choices");
  const hint=document.getElementById("menu-save-hint");
  const saved=hasSaveGame();
  if(btnLoad){
    btnLoad.disabled=!saved;
    btnLoad.classList.toggle("disabled", !saved);
  }
  if(hint) hint.textContent=saved?"Zapis w przeglądarce (localStorage)":"Brak zapisu — tylko nowa gra";
  btnNew?.addEventListener("click", ()=>{
    respawnMode=false;
    menuState.newWorld=true;
    menuState.preparedSeed=null;
    setCharPanelMode(false);
    if(typeof openCharacterCreator==="function") openCharacterCreator();
    else { showMenuPanel("new"); renderSpawnChoices(); }
  });
  btnBack?.addEventListener("click", ()=>{
    showMenuPanel("char");
    if(typeof renderCharacterUI==="function") renderCharacterUI();
    if(typeof startCharPreviewLoop==="function") startCharPreviewLoop();
  });
  btnStart?.addEventListener("click", startNewGame);
  btnLoad?.addEventListener("click", ()=>{ if(hasSaveGame()) startLoadedGame(); });
  if(biomeBox){
    biomeBox.innerHTML="";
    for(const b of BIOMES_UI){
      const el=document.createElement("button");
      el.type="button";
      el.className="menu-choice"+(b.id===menuState.biome?" on":"");
      el.textContent=b.label;
      el.dataset.biome=b.id;
      el.addEventListener("click", ()=>{
        menuState.biome=b.id;
        menuState.variant=0;
        for(const c of biomeBox.querySelectorAll("[data-biome]")) c.classList.toggle("on", c.dataset.biome===b.id);
        renderSpawnChoices();
      });
      biomeBox.appendChild(el);
    }
  }
  initDeathRespawn();
  initNewWorldControls();
  refreshWorldPreview();
  if(typeof initCharacterCreator==="function") initCharacterCreator();
  if(typeof applyCharacterToPed==="function") applyCharacterToPed(playerCharacter);
}
// Boot menu opens after LoadingScreen finishes (57-loading.js).
