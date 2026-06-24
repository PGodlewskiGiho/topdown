/* TOPDOWN CITY — 21-menu.js */
/* ---------- start menu (new game / load + spawn & biome picker for testing) ---------- */
let gamePhase="menu";                                        // "menu" | "newgame" | "playing"
const menuState={biome:"city", variant:0, preview:null};
const BIOMES_UI=[
  {id:"city", label:"Miasto"},
  {id:"forest", label:"Las"},
  {id:"desert", label:"Pustynia"},
  {id:"sea", label:"Wybrzeże"},
];
function spawnOptionsForBiome(biome){
  if(biome==="city") return CITY_SPAWN_PRESETS.map((p,variant)=>({variant, label:p.label}));
  const n=biome==="forest"?4:3;
  return Array.from({length:n}, (_,variant)=>({variant, label:(BIOMES[biome]?.name||biome)+" · trasa "+(variant+1)}));
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
  document.getElementById("menu-main")?.classList.toggle("hidden", id!=="main");
  document.getElementById("menu-char")?.classList.toggle("hidden", id!=="char");
  document.getElementById("menu-new")?.classList.toggle("hidden", id!=="new");
  gamePhase=id==="new"?"newgame":id==="char"?"charcreate":"menu";
}
function dismissMenu(){
  const m=document.getElementById("menu");
  if(!m) return;
  m.classList.add("hidden");
  document.body.classList.remove("in-menu");
  gamePhase="playing";
  initAudio();
  if(actx && actx.state==="suspended") actx.resume();
}
function startLoadedGame(){
  loadGame();
  if(typeof applyCharacterToPed==="function") applyCharacterToPed();
  if(typeof car.x!=="number"||typeof car.y!=="number"||!isFinite(car.x)||!isFinite(car.y)){
    const sp=getSpawnPoint("city", 0);
    teleportPlayer(sp.x, sp.y);
  } else teleportPlayer(car.x, car.y);
  dismissMenu();
}
function startNewGame(){
  if(typeof applyCharacterToPed==="function") applyCharacterToPed(playerCharacter);
  const sp=getSpawnPoint(menuState.biome, menuState.variant);
  resetNewGameState();
  if(typeof applyCharacterToPed==="function") applyCharacterToPed(playerCharacter);
  teleportPlayer(sp.x, sp.y);
  dismissMenu();
  const who=(playerCharacter&&playerCharacter.name)||"Wędrowiec";
  showBigMsg(who+" · "+sp.district);
  saveGame();
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
  refreshSpawnPreview();
  if(typeof initCharacterCreator==="function") initCharacterCreator();
  if(typeof applyCharacterToPed==="function") applyCharacterToPed(playerCharacter);
}
initStartMenu();
