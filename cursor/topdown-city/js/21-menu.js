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
  const sp=getSpawnPoint(menuState.biome, menuState.variant);
  menuState.preview=sp;
  focusX=sp.x; focusY=sp.y; cam.x=sp.x; cam.y=sp.y;
  const el=document.getElementById("spawn-preview");
  if(el) el.textContent=sp.label+" · komórka "+sp.i+","+sp.j+" · "+sp.district;
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
  document.getElementById("menu-new")?.classList.toggle("hidden", id!=="new");
  gamePhase=id==="new"?"newgame":"menu";
}
function dismissMenu(){
  const m=document.getElementById("menu");
  if(!m) return;
  m.classList.add("hidden");
  gamePhase="playing";
  initAudio();
  if(actx && actx.state==="suspended") actx.resume();
}
function startLoadedGame(){
  loadGame();
  teleportPlayer(car.x, car.y);
  dismissMenu();
}
function startNewGame(){
  const sp=getSpawnPoint(menuState.biome, menuState.variant);
  resetNewGameState();
  teleportPlayer(sp.x, sp.y);
  dismissMenu();
  showBigMsg(sp.district);
  saveGame();
}
function initStartMenu(){
  const menu=document.getElementById("menu");
  const btnNew=document.getElementById("btn-new");
  const btnLoad=document.getElementById("btn-load");
  const btnBack=document.getElementById("btn-back");
  const btnStart=document.getElementById("btn-start");
  const biomeBox=document.getElementById("biome-choices");
  const hint=document.getElementById("menu-save-hint");
  if(!menu) return;
  const saved=hasSaveGame();
  if(btnLoad){
    btnLoad.disabled=!saved;
    btnLoad.classList.toggle("disabled", !saved);
  }
  if(hint) hint.textContent=saved?"Zapis w przeglądarce (localStorage)":"Brak zapisu — tylko nowa gra";
  btnNew?.addEventListener("click", ()=>{
    showMenuPanel("new");
    renderSpawnChoices();
  });
  btnBack?.addEventListener("click", ()=>showMenuPanel("main"));
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
}
initStartMenu();
