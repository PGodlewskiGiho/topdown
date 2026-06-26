/* TOPDOWN CITY — 28-character.js */
/* Skyrim-style 2D character creator — palettes in 00-palettes.js */

const CHAR_PANTS=["#2a3444","#1a2430","#3a3a48","#283828","#4a4038","#222228"];
const CHAR_HATS=["#444","#2a3444","#5a4030","#286848","#8a2828","#686868"];

const playerCharacter=defaultCharacter();

function defaultCharacter(){
  return {
    name:"Wędrowiec",
    body:"male",
    skin:CHAR_SKINS[1],
    hair:CHAR_HAIRS[1],
    hairStyle:"short",
    beard:"none",
    shirt:CHAR_SHIRTS[0],
    shirtStyle:"tee",
    pants:CHAR_PANTS[0],
    hat:null,
    hatColor:CHAR_HATS[0],
  };
}

function bodyRadius(body){
  if(body==="hardy") return 11;
  if(body==="female") return 8.5;
  return 9;
}

function applyCharacterToPed(ch){
  ch=ch||playerCharacter;
  ped.name=ch.name||"Wędrowiec";
  ped.body=ch.body||"male";
  ped.model=ch.model||(ch.body==="female"?"female":ch.body==="hardy"?"hardy":"civilian");
  ped.skin=ch.skin;
  ped.hair=ch.hairStyle==="bald"?null:ch.hair;
  ped.hairStyle=ch.hairStyle;
  ped.beard=ch.beard;
  ped.shirt=ch.shirt;
  ped.shirtStyle=ch.shirtStyle||"tee";
  ped.pants=ch.pants;
  ped.hat=ch.hat;
  ped.hatColor=ch.hatColor;
  ped.height=ch.height||1;
  ped.r=bodyRadius(ped.body);
  delete ped._gta2Outfit;
  delete ped._psLayerCache;
  delete ped._psWarmSig;
  delete ped._psClipReq;
  delete ped._psCombatWarm;
  if(typeof Gta2Outfit!=="undefined") Gta2Outfit.applyGta2Ids(ped);
  if(typeof PeopleSprites!=="undefined"){
    if(PeopleSprites.prefetchPlayerOutfit){
      PeopleSprites.init().then(()=>PeopleSprites.prefetchPlayerOutfit(ch, false));
    }else if(PeopleSprites.warmPed){
      PeopleSprites.warmPed(ped, 16);
    }
  }
  car.riderShirt=ped.shirt;
  car.riderSkin=ped.skin;
  car.riderHair=ped.hair;
}

function characterFromPed(){
  return {
    name:ped.name||"Wędrowiec",
    body:ped.body||"male",
    skin:ped.skin||CHAR_SKINS[1],
    hair:ped.hair||CHAR_HAIRS[1],
    hairStyle:ped.hairStyle||"short",
    beard:ped.beard||"none",
    shirt:ped.shirt||CHAR_SHIRTS[0],
    shirtStyle:ped.shirtStyle||"tee",
    pants:ped.pants||CHAR_PANTS[0],
    hat:ped.hat||null,
    hatColor:ped.hatColor||CHAR_HATS[0],
  };
}

function randomCharacter(){
  const body=pick(["male","female","hardy"]);
  const hairStyle=body==="female"?pick(["short","long","ponytail","bald"]):pick(["short","long","ponytail","bald"]);
  return {
    name:pick(["Arvel","Brynja","Cahir","Dagna","Eirik","Freya","Gunnar","Hilda","Ivor","Jora","Kael","Lyra","Magnus","Nadia","Oskar","Petra","Ragnar","Sigrid","Torben","Ulrika"]),
    body,
    skin:pick(CHAR_SKINS),
    hair:pick(CHAR_HAIRS),
    hairStyle,
    beard:body==="female"?"none":pick(["none","none","stubble","full"]),
    shirt:pick(CHAR_SHIRTS),
    shirtStyle:pick(["tee","tee","jacket","vest"]),
    pants:pick(CHAR_PANTS),
    hat:rng()<0.55?null:pick(["cap","beanie","hood"]),
    hatColor:pick(CHAR_HATS),
  };
}

function syncCharacterFromUI(){
  const nameEl=document.getElementById("char-name");
  if(nameEl) playerCharacter.name=(nameEl.value||"Wędrowiec").trim().slice(0,24)||"Wędrowiec";
}

function renderCharOptionGroup(containerId, key, labels, values, onPick){
  const box=document.getElementById(containerId);
  if(!box) return;
  box.innerHTML="";
  for(let i=0;i<values.length;i++){
    const b=document.createElement("button");
    b.type="button";
    b.className="menu-choice char-swatch"+(playerCharacter[key]===values[i]?" on":"");
    b.title=labels[i];
    if(key==="skin"||key==="hair"||key==="shirt"||key==="pants"||key==="hatColor"){
      b.classList.add("char-color");
      b.style.background=values[i];
      b.style.borderColor=playerCharacter[key]===values[i]?"#7fe0a8":"rgba(255,255,255,.15)";
    } else {
      b.textContent=labels[i];
    }
    b.addEventListener("click", ()=>{
      playerCharacter[key]=values[i];
      if(key==="hairStyle"&&values[i]==="bald") playerCharacter.hair=CHAR_HAIRS[0];
      if(key==="body"&&values[i]==="female"&&playerCharacter.beard!=="none") playerCharacter.beard="none";
      onPick();
    });
    box.appendChild(b);
  }
}

function renderCharacterUI(){
  syncCharacterFromUI();
  renderCharOptionGroup("char-body-choices","body",
    ["Męska","Żeńska","Krzepka"], ["male","female","hardy"], renderCharacterUI);
  renderCharOptionGroup("char-skin-choices","skin",
    CHAR_SKINS.map((_,i)=>"Skóra "+(i+1)), CHAR_SKINS, renderCharacterUI);
  renderCharOptionGroup("char-haircol-choices","hair",
    CHAR_HAIRS.map((_,i)=>"Włosy "+(i+1)), CHAR_HAIRS, renderCharacterUI);
  renderCharOptionGroup("char-hairstyle-choices","hairStyle",
    ["Krótkie","Długie","Kucyk","Łysy"], ["short","long","ponytail","bald"], renderCharacterUI);
  renderCharOptionGroup("char-beard-choices","beard",
    ["Brak","Zarost","Broda"], ["none","stubble","full"], renderCharacterUI);
  renderCharOptionGroup("char-shirt-choices","shirt",
    CHAR_SHIRTS.map((_,i)=>"Ubranie "+(i+1)), CHAR_SHIRTS, renderCharacterUI);
  renderCharOptionGroup("char-shirtstyle-choices","shirtStyle",
    ["Koszulka","Kurtka","Kamizelka"], ["tee","jacket","vest"], renderCharacterUI);
  renderCharOptionGroup("char-pants-choices","pants",
    CHAR_PANTS.map((_,i)=>"Spodnie "+(i+1)), CHAR_PANTS, renderCharacterUI);
  renderCharOptionGroup("char-hat-choices","hat",
    ["Brak","Czapka","Beanie","Kaptur"], [null,"cap","beanie","hood"], renderCharacterUI);
  renderCharOptionGroup("char-hatcol-choices","hatColor",
    CHAR_HATS.map((_,i)=>"Kolor "+(i+1)), CHAR_HATS, renderCharacterUI);
  const beardField=document.getElementById("char-beard-field");
  if(beardField) beardField.style.display=playerCharacter.body==="female"?"none":"block";
  const hatColField=document.getElementById("char-hatcol-field");
  if(hatColField) hatColField.style.display=playerCharacter.hat?"block":"none";
  drawCharacterPreview();
}

function drawCharacterStage(pc, w, h, char, opts){
  opts=opts||{};
  const t=opts.t!=null?opts.t:performance.now()*0.001;
  pc.setTransform(1,0,0,1,0,0);
  pc.clearRect(0,0,w,h);
  const g=pc.createRadialGradient(w/2,h*0.42,8,w/2,h*0.55,w*0.72);
  g.addColorStop(0,"#243040"); g.addColorStop(0.55,"#141c24"); g.addColorStop(1,"#0a0e12");
  pc.fillStyle=g; pc.fillRect(0,0,w,h);
  pc.fillStyle="rgba(48,72,42,0.28)"; pc.beginPath(); pc.ellipse(w/2,h*0.9,w*0.44,h*0.07,0,0,7); pc.fill();
  pc.strokeStyle="rgba(127,224,168,0.12)"; pc.lineWidth=1;
  for(let x=12;x<w;x+=14){ pc.beginPath(); pc.moveTo(x,h*0.72); pc.lineTo(x,h*0.96); pc.stroke(); }
  for(let y=h*0.72;y<h;y+=14){ pc.beginPath(); pc.moveTo(8,y); pc.lineTo(w-8,y); pc.stroke(); }
  const spot=pc.createRadialGradient(w/2,h*0.52,4,w/2,h*0.52,w*0.38);
  spot.addColorStop(0,"rgba(255,220,160,0.14)"); spot.addColorStop(1,"rgba(255,220,160,0)");
  pc.fillStyle=spot; pc.fillRect(0,0,w,h);
  pc.strokeStyle="rgba(127,224,168,0.28)"; pc.lineWidth=1;
  pc.strokeRect(0.5,0.5,w-1,h-1);
  const spin=opts.spin!=null?opts.spin:Math.sin(t*0.55)*0.45;
  const bob=Math.sin(t*5.5)*1.4;
  const sc=opts.scale||2.75;
  pc.save();
  pc.translate(w/2, h*0.54+bob);
  pc.scale(sc, sc);
  const preview={
    x:0, y:0, a:0, r:bodyRadius(char.body),
    skin:char.skin, shirt:char.shirt, pants:char.pants,
    hair:char.hairStyle==="bald"?null:char.hair,
    hairStyle:char.hairStyle, beard:char.beard,
    shirtStyle:char.shirtStyle, hat:char.hat, hatColor:char.hatColor,
    body:char.body, height:1, previewT:t,
    vx:Math.cos(spin)*28, vy:Math.sin(spin)*28,
  };
  if(typeof Gta2Outfit!=="undefined") Gta2Outfit.applyGta2Ids(preview);
  if(typeof LivingSprite!=="undefined") LivingSprite.setFacingFromDelta(preview,preview.vx,preview.vy);
  if(typeof drawPerson==="function") drawPerson(preview, preview.shirt, false, pc);
  pc.restore();
}

function drawCharacterPreview(){
  const cv=document.getElementById("char-preview");
  if(!cv) return;
  const pc=cv.getContext("2d");
  syncCharacterFromUI();
  drawCharacterStage(pc, cv.width, cv.height, playerCharacter, {scale:2.75});
  const nm=document.getElementById("char-preview-name");
  if(nm) nm.textContent=playerCharacter.name;
}

let charPreviewRAF=0;
function startCharPreviewLoop(){
  cancelAnimationFrame(charPreviewRAF);
  const tick=()=>{
    if(gamePhase!=="charcreate"&&gamePhase!=="respawn") return;
    drawCharacterPreview();
    charPreviewRAF=requestAnimationFrame(tick);
  };
  charPreviewRAF=requestAnimationFrame(tick);
}
function stopCharPreviewLoop(){ cancelAnimationFrame(charPreviewRAF); charPreviewRAF=0; }

function initCharacterCreator(){
  const nameEl=document.getElementById("char-name");
  if(nameEl){
    nameEl.value=playerCharacter.name;
    nameEl.addEventListener("input", ()=>{ syncCharacterFromUI(); drawCharacterPreview(); });
  }
  document.getElementById("btn-char-random")?.addEventListener("click", ()=>{
    Object.assign(playerCharacter, randomCharacter());
    if(nameEl) nameEl.value=playerCharacter.name;
    renderCharacterUI();
  });
  document.getElementById("btn-char-back")?.addEventListener("click", ()=>{
    stopCharPreviewLoop();
    if(typeof respawnMode!=="undefined" && respawnMode) showDeathPanel(lastDeathReason);
    else showMenuPanel("main");
  });
  document.getElementById("btn-char-next")?.addEventListener("click", ()=>{
    syncCharacterFromUI();
    applyCharacterToPed(playerCharacter);
    stopCharPreviewLoop();
    if(typeof respawnMode!=="undefined" && respawnMode){ finishRespawn(); return; }
    showMenuPanel("new");
    renderSpawnChoices();
  });
}

function openCharacterCreator(){
  if(typeof respawnMode!=="undefined") respawnMode=false;
  if(typeof setCharPanelMode==="function") setCharPanelMode(false);
  Object.assign(playerCharacter, defaultCharacter());
  const nameEl=document.getElementById("char-name");
  if(nameEl) nameEl.value=playerCharacter.name;
  showMenuPanel("char");
  renderCharacterUI();
  startCharPreviewLoop();
}

window.drawCharacterStage=drawCharacterStage;
window.playerCharacter=playerCharacter;
window.applyCharacterToPed=applyCharacterToPed;
window.characterFromPed=characterFromPed;
window.defaultCharacter=defaultCharacter;
