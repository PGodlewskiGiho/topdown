/* TOPDOWN CITY — 29-inventory.js */
/* Resident Evil-style grid inventory + weapon equip */

const INV_COLS=8, INV_ROWS=6;
const ITEM_DEFS={
  bat:       {id:"bat",       name:"Pałka",          type:"weapon", w:1,h:2, weaponIdx:1, color:"#6a5848" },
  handgun:   {id:"handgun",   name:"Pistolet SG-09", type:"weapon", w:2,h:1, weaponIdx:2, magSize:15, ammoType:"ammo_9mm",  color:"#3a4048" },
  smg:       {id:"smg",       name:"Pistolet masz.", type:"weapon", w:2,h:2, weaponIdx:3, magSize:30, ammoType:"ammo_9mm",  color:"#404850" },
  shotgun:   {id:"shotgun",   name:"Strzelba",       type:"weapon", w:3,h:1, weaponIdx:4, magSize:6,  ammoType:"ammo_shell", color:"#504838" },
  rifle:     {id:"rifle",     name:"Karabin",        type:"weapon", w:3,h:2, weaponIdx:5, magSize:24, ammoType:"ammo_rifle", color:"#485040" },
  sniper:    {id:"sniper",    name:"Snajperka",      type:"weapon", w:2,h:3, weaponIdx:6, magSize:5,  ammoType:"ammo_rifle", color:"#3a4840" },
  minigun:   {id:"minigun",   name:"Minigun",        type:"weapon", w:4,h:2, weaponIdx:7, magSize:80, ammoType:"ammo_rifle", color:"#505058" },
  flamer:    {id:"flamer",    name:"Miotacz ognia",  type:"weapon", w:3,h:2, weaponIdx:8, magSize:100,ammoType:"ammo_fuel",  color:"#684838" },
  launcher:  {id:"launcher",  name:"Wyrzutnia",      type:"weapon", w:4,h:2, weaponIdx:9, magSize:1,  ammoType:"ammo_rocket",color:"#585850" },
  ammo_9mm:  {id:"ammo_9mm",  name:"Amunicja 9mm",   type:"ammo",   w:1,h:1, stack:30, maxStack:150, color:"#c8a838" },
  ammo_shell:{id:"ammo_shell",name:"Amunicja 12g",   type:"ammo",   w:1,h:1, stack:12, maxStack:48,  color:"#b89848" },
  ammo_rifle:{id:"ammo_rifle",name:"Amunicja 5.56",  type:"ammo",   w:1,h:1, stack:20, maxStack:120, color:"#a89040" },
  ammo_fuel: {id:"ammo_fuel", name:"Paliwo",         type:"ammo",   w:1,h:1, stack:40, maxStack:200, color:"#c87838" },
  ammo_rocket:{id:"ammo_rocket",name:"Rakieta",       type:"ammo",   w:1,h:1, stack:1,  maxStack:6,   color:"#888890" },
  herb:      {id:"herb",      name:"Zielone zioło",  type:"heal",   w:1,h:1, heal:35, color:"#48a848" },
  spray:     {id:"spray",     name:"Spray med.",     type:"heal",   w:1,h:1, heal:85, singleUse:true, color:"#58a8c8" },
};
const WEAPON_SHOP=[
  null,
  {defId:"bat",      price:150},
  {defId:"handgun",  price:400,  ammoDef:"ammo_9mm",   ammoQty:30},
  {defId:"smg",      price:1200, ammoDef:"ammo_9mm",   ammoQty:60},
  {defId:"shotgun",  price:1600, ammoDef:"ammo_shell", ammoQty:18},
  {defId:"rifle",    price:3200, ammoDef:"ammo_rifle", ammoQty:40},
  {defId:"sniper",   price:5500, ammoDef:"ammo_rifle", ammoQty:15},
  {defId:"minigun",  price:12000,ammoDef:"ammo_rifle", ammoQty:80},
  {defId:"flamer",   price:8000, ammoDef:"ammo_fuel",  ammoQty:80},
  {defId:"launcher", price:16000,ammoDef:"ammo_rocket",ammoQty:2},
];
const WEAPON_TO_ITEM=["", "bat","handgun","smg","shotgun","rifle","sniper","minigun","flamer","launcher"];

let invOpen=false, invSelectedUid=null, nextInvUid=1;
const inventory={items:[], equippedUid:null};

function itemSize(def,rot){ return rot?{w:def.h,h:def.w}:{w:def.w,h:def.h}; }
function getInvItem(uid){ return inventory.items.find(it=>it.uid===uid); }
function invOccupied(x,y,w,h,ignoreUid){
  for(const it of inventory.items){
    if(it.uid===ignoreUid) continue;
    const d=ITEM_DEFS[it.defId]; if(!d) continue;
    const s=itemSize(d,it.rot||0);
    if(x+s.w<=it.x||it.x+s.w<=x||y+s.h<=it.y||it.y+s.h<=y) continue;
    return true;
  }
  return false;
}
function invFindSpot(defId, rot){
  const def=ITEM_DEFS[defId]; if(!def) return null;
  const s=itemSize(def,rot||0);
  for(let y=0;y<=INV_ROWS-s.h;y++) for(let x=0;x<=INV_COLS-s.w;x++){
    if(!invOccupied(x,y,s.w,s.h,null)) return {x,y,rot:rot||0};
  }
  return null;
}
function addInvItem(defId, opts){
  opts=opts||{};
  const def=ITEM_DEFS[defId]; if(!def) return null;
  if(def.type==="ammo"){
    const ex=inventory.items.find(it=>it.defId===defId && (it.qty||1)<def.maxStack);
    if(ex){
      const add=Math.min(opts.qty||def.stack, def.maxStack-(ex.qty||1));
      ex.qty=(ex.qty||1)+add;
      let left=(opts.qty||def.stack)-add;
      while(left>0){ const spot=invFindSpot(defId,0); if(!spot) break;
        const chunk=Math.min(left, def.maxStack); left-=chunk;
        inventory.items.push({uid:nextInvUid++, defId, x:spot.x, y:spot.y, rot:0, qty:chunk});
      }
      return ex;
    }
  }
  const spot=invFindSpot(defId, opts.rot||0);
  if(!spot){ showBigMsg("PEŁNY EKWIPUNEK"); return null; }
  const it={uid:nextInvUid++, defId, x:spot.x, y:spot.y, rot:spot.rot, qty:opts.qty||1};
  if(def.type==="weapon"){
    const w=WEAPONS[def.weaponIdx];
    it.loaded=opts.loaded!==undefined?opts.loaded:(w.kind==="melee"?Infinity:Math.min(def.magSize||0, opts.loaded||def.magSize||0));
  }
  inventory.items.push(it);
  return it;
}
function removeInvItem(uid){
  const i=inventory.items.findIndex(it=>it.uid===uid);
  if(i<0) return;
  if(inventory.equippedUid===uid) inventory.equippedUid=null;
  inventory.items.splice(i,1);
  if(invSelectedUid===uid) invSelectedUid=null;
}
function countReserveAmmo(ammoType){
  let n=0;
  for(const it of inventory.items){
    const d=ITEM_DEFS[it.defId];
    if(d&&d.type==="ammo"&&d.id===ammoType) n+=it.qty||1;
  }
  return n;
}
function takeAmmoFromInv(ammoType, amount){
  let need=amount;
  for(const it of inventory.items){
    if(need<=0) break;
    const d=ITEM_DEFS[it.defId];
    if(!d||d.type!=="ammo"||d.id!==ammoType) continue;
    const have=it.qty||1;
    const take=Math.min(have, need);
    need-=take;
    if(have-take<=0) removeInvItem(it.uid);
    else it.qty=have-take;
  }
  return amount-need;
}
function getEquippedInvItem(){
  if(!inventory.equippedUid) return null;
  return getInvItem(inventory.equippedUid);
}
function getEquippedWeaponIdx(){
  const it=getEquippedInvItem();
  if(!it) return 0;
  const d=ITEM_DEFS[it.defId];
  return d&&d.type==="weapon"?d.weaponIdx:0;
}
function syncCurWeaponFromEquip(){
  curWeapon=getEquippedWeaponIdx();
}
function equipInvItem(uid){
  const it=getInvItem(uid); if(!it) return;
  const d=ITEM_DEFS[it.defId];
  if(d.type==="weapon"){
    inventory.equippedUid=uid;
    syncCurWeaponFromEquip();
    syncLegacyOwnedFromInv();
    showBigMsg("WYBRANO: "+d.name);
  }
}
function useInvItem(uid){
  const it=getInvItem(uid); if(!it) return;
  const d=ITEM_DEFS[it.defId];
  if(d.type==="weapon"){ equipInvItem(uid); return; }
  if(d.type==="heal"){
    if(health>=100){ showBigMsg("PEŁNE ZDROWIE"); return; }
    health=Math.min(100, health+(d.heal||30));
    if(d.singleUse|| (it.qty||1)<=1) removeInvItem(uid);
    else it.qty=(it.qty||1)-1;
    showBigMsg("+"+(d.heal||30)+" HP");
    renderInventoryUI();
    saveGame();
    return;
  }
}
function reloadEquippedWeapon(){
  const it=getEquippedInvItem(); if(!it) return;
  const d=ITEM_DEFS[it.defId]; if(!d||d.type!=="weapon"||!d.ammoType) return;
  const w=WEAPONS[d.weaponIdx];
  if(w.kind==="melee") return;
  const mag=d.magSize||w.cap||30;
  const loaded=it.loaded||0;
  if(loaded>=mag){ showBigMsg("MAG PEŁNY"); return; }
  const need=mag-loaded;
  const reserve=countReserveAmmo(d.ammoType);
  if(reserve<=0){ showBigMsg("BRAK AMUNICJI"); return; }
  const got=takeAmmoFromInv(d.ammoType, need);
  it.loaded=loaded+got;
  syncLegacyOwnedFromInv();
  showBigMsg("PRZEŁADOWANO +"+got);
  saveGame();
}
function playerCanFire(){
  const idx=getEquippedWeaponIdx();
  const w=WEAPONS[idx];
  if(w.kind==="melee") return true;
  const it=getEquippedInvItem();
  if(!it) return false;
  return (it.loaded||0)>0;
}
function playerConsumeAmmo(){
  const it=getEquippedInvItem();
  if(!it) return true;
  const d=ITEM_DEFS[it.defId];
  if(!d||d.type!=="weapon") return true;
  const w=WEAPONS[d.weaponIdx];
  if(w.kind==="melee") return true;
  if((it.loaded||0)<=0) return false;
  it.loaded--;
  syncLegacyOwnedFromInv();
  if(it.loaded<=0){
    syncCurWeaponFromEquip();
    if(inventory.equippedUid) showBigMsg("PUSTY MAGAZYNEK — G");
  }
  return true;
}
function initInventory(){
  inventory.items=[]; inventory.equippedUid=null; invSelectedUid=null; nextInvUid=1;
  syncCurWeaponFromEquip();
}
function giveWeapon(wi,amt){
  const defId=WEAPON_TO_ITEM[wi]; if(!defId) return;
  const def=ITEM_DEFS[defId];
  const w=WEAPONS[wi];
  const it=addInvItem(defId, {loaded:w.kind==="melee"?Infinity:Math.min(def.magSize||8, amt||def.magSize||8)});
  if(w.kind!=="melee"&&def.ammoType&&amt>0){
    addInvItem(def.ammoType, {qty:amt});
  }
  if(it) equipInvItem(it.uid);
  syncLegacyOwnedFromInv();
}
function hasInvWeapon(defId){
  return inventory.items.some(it=>it.defId===defId);
}
function buyWeapon(idx){
  if(idx<=0) return;
  const shop=WEAPON_SHOP[idx]; if(!shop) return;
  const def=ITEM_DEFS[shop.defId];
  if(!hasInvWeapon(shop.defId)){
    if(money<shop.price){ showBigMsg("ZA MAŁO KASY"); return; }
    money-=shop.price;
    const it=addInvItem(shop.defId, {loaded:def.magSize||WEAPONS[def.weaponIdx].cap});
    if(shop.ammoDef) addInvItem(shop.ammoDef, {qty:shop.ammoQty||def.stack});
    if(it) equipInvItem(it.uid);
    showBigMsg("KUPIONO: "+def.name);
    saveGame(); return;
  }
  if(def.type==="weapon"&&WEAPONS[def.weaponIdx].kind!=="melee"&&shop.ammoDef){
    const rc=Math.max(40,(shop.price*0.3)|0);
    if(money<rc){ showBigMsg("ZA MAŁO KASY"); return; }
    money-=rc;
    addInvItem(shop.ammoDef, {qty:shop.ammoQty||ITEM_DEFS[shop.ammoDef].stack});
    showBigMsg("AMUNICJA");
    saveGame();
  } else showBigMsg("JUŻ MASZ");
}
function syncLegacyOwnedFromInv(){
  for(let i=0;i<owned.length;i++) owned[i]=false;
  owned[0]=true;
  for(const it of inventory.items){
    const d=ITEM_DEFS[it.defId];
    if(d&&d.type==="weapon"&&d.weaponIdx!=null) owned[d.weaponIdx]=true;
  }
  for(let i=0;i<ammo.length;i++){
    const defId=WEAPON_TO_ITEM[i];
    if(!defId){ ammo[i]=WEAPONS[i].kind==="melee"?Infinity:0; continue; }
    const d=ITEM_DEFS[defId];
    if(!d||d.type!=="weapon"){ ammo[i]=0; continue; }
    if(WEAPONS[i].kind==="melee") ammo[i]=Infinity;
    else ammo[i]=countReserveAmmo(d.ammoType)+(getEquippedInvItem()?.defId===defId?(getEquippedInvItem().loaded||0):0);
  }
  syncCurWeaponFromEquip();
}
function serializeInventory(){
  return {equippedUid:inventory.equippedUid, nextUid:nextInvUid, items:inventory.items.map(it=>({...it}))};
}
function deserializeInventory(data){
  initInventory();
  if(!data) return;
  nextInvUid=data.nextUid||1;
  inventory.equippedUid=data.equippedUid||null;
  inventory.items=(data.items||[]).filter(it=>ITEM_DEFS[it.defId]);
  syncLegacyOwnedFromInv();
}
function toggleInventory(){
  if(typeof gamePhase!=="undefined"&&gamePhase!=="playing") return;
  if(mode!=="foot") return;
  invOpen=!invOpen;
  const el=document.getElementById("inventory");
  if(el) el.classList.toggle("hidden", !invOpen);
  document.body.classList.toggle("inv-open", invOpen);
  if(invOpen){ renderInventoryUI(); firing=false; }
  else invSelectedUid=null;
}
function cycleEquippedWeapon(d){
  const weapons=inventory.items.filter(it=>{ const def=ITEM_DEFS[it.defId]; return def&&def.type==="weapon"; });
  if(!weapons.length){ inventory.equippedUid=null; syncCurWeaponFromEquip(); return; }
  let i=weapons.findIndex(w=>w.uid===inventory.equippedUid);
  if(i<0) i=0;
  i=(i+d+weapons.length)%weapons.length;
  equipInvItem(weapons[i].uid);
}
function equipWeaponByIdx(idx){
  if(idx===0){ inventory.equippedUid=null; syncCurWeaponFromEquip(); showBigMsg("Pięści"); return; }
  for(const it of inventory.items){
    const d=ITEM_DEFS[it.defId];
    if(d&&d.type==="weapon"&&d.weaponIdx===idx){ equipInvItem(it.uid); return; }
  }
  showBigMsg("NIE MASZ");
}
function migrateLegacyWeaponsToInventory(d){
  if(d.inventory) return;
  initInventory();
  for(let i=1;i<WEAPONS.length;i++){
    if(!d.owned||!d.owned[i]) continue;
    const defId=WEAPON_TO_ITEM[i]; if(!defId) continue;
    const def=ITEM_DEFS[defId];
    let am=0;
    if(Array.isArray(d.ammo)&&d.ammo[i]!=null) am=d.ammo[i]<0?999:d.ammo[i]|0;
    const loaded=WEAPONS[i].kind==="melee"?Infinity:Math.min(def.magSize||am, Math.max(0,am));
    const reserve=WEAPONS[i].kind==="melee"?0:Math.max(0, am-loaded);
    addInvItem(defId, {loaded});
    if(reserve>0&&def.ammoType) addInvItem(def.ammoType, {qty:reserve});
  }
  if(typeof d.curWeapon==="number"&&d.curWeapon>0){
    const defId=WEAPON_TO_ITEM[d.curWeapon];
    const it=inventory.items.find(x=>x.defId===defId);
    if(it) inventory.equippedUid=it.uid;
  }
  syncLegacyOwnedFromInv();
}
function moveInvItem(uid,x,y,rot){
  const it=getInvItem(uid); if(!it) return false;
  const d=ITEM_DEFS[it.defId]; if(!d) return false;
  const s=itemSize(d,rot||0);
  if(x<0||y<0||x+s.w>INV_COLS||y+s.h>INV_ROWS) return false;
  if(invOccupied(x,y,s.w,s.h,uid)) return false;
  it.x=x; it.y=y; it.rot=rot||0;
  return true;
}
function renderInventoryUI(){
  const grid=document.getElementById("inv-grid");
  const detail=document.getElementById("inv-detail");
  const equip=document.getElementById("inv-equip-weapon");
  if(!grid) return;
  grid.innerHTML="";
  grid.style.gridTemplateColumns=`repeat(${INV_COLS}, 44px)`;
  grid.style.gridTemplateRows=`repeat(${INV_ROWS}, 44px)`;
  for(let i=0;i<INV_COLS*INV_ROWS;i++){
    const cell=document.createElement("div");
    cell.className="inv-cell";
    grid.appendChild(cell);
  }
  for(const it of inventory.items){
    const d=ITEM_DEFS[it.defId]; if(!d) continue;
    const s=itemSize(d,it.rot||0);
    const el=document.createElement("button");
    el.type="button";
    el.className="inv-item"+(invSelectedUid===it.uid?" sel":"")+(inventory.equippedUid===it.uid?" eq":"");
    el.style.gridColumn=`${it.x+1} / span ${s.w}`;
    el.style.gridRow=`${it.y+1} / span ${s.h}`;
    el.style.background=d.color||"#444";
    let label=d.name.split(" ")[0];
    if(d.type==="ammo") label=(it.qty||1)+"×";
    if(d.type==="weapon"&&WEAPONS[d.weaponIdx]?.kind!=="melee") label+="\n"+(it.loaded||0);
    el.textContent=label;
    el.title=d.name;
    el.addEventListener("click", e=>{
      e.stopPropagation();
      if(invSelectedUid===it.uid){ useInvItem(it.uid); }
      else invSelectedUid=it.uid;
      renderInventoryUI();
    });
    el.addEventListener("contextmenu", e=>{
      e.preventDefault();
      if(d.type==="weapon") it.rot=(it.rot?0:1);
      else if(invSelectedUid){
        const sel=getInvItem(invSelectedUid);
        if(sel&&sel.uid!==it.uid) invSelectedUid=it.uid;
      }
      renderInventoryUI();
    });
    el.addEventListener("dblclick", e=>{ e.preventDefault(); useInvItem(it.uid); });
    grid.appendChild(el);
  }
  if(equip){
    const eq=getEquippedInvItem();
    if(eq){
      const d=ITEM_DEFS[eq.defId];
      equip.textContent=d.name+(d.type==="weapon"&&WEAPONS[d.weaponIdx]?.kind!=="melee"?" · "+(eq.loaded||0)+"/"+countReserveAmmo(d.ammoType):"");
    } else equip.textContent="Pięści";
  }
  if(detail){
    if(!invSelectedUid){ detail.innerHTML="<em>Wybierz przedmiot</em>"; return; }
    const it=getInvItem(invSelectedUid); const d=ITEM_DEFS[it.defId];
    let html="<b>"+d.name+"</b><br><span class='inv-type'>"+({weapon:"Broń",ammo:"Amunicja",heal:"Medycyna"}[d.type]||d.type)+"</span>";
    if(d.type==="weapon"){
      const w=WEAPONS[d.weaponIdx];
      html+="<br>"+(w.kind==="melee"?"Walka wręcz":"Mag: "+(it.loaded||0)+" · Zapas: "+countReserveAmmo(d.ammoType));
      html+="<br><button type='button' class='inv-action' data-act='equip'>Wyposaż</button>";
      if(w.kind!=="melee") html+=" <button type='button' class='inv-action' data-act='reload'>Przeładuj (G)</button>";
    }
    if(d.type==="heal") html+="<br>Leczy "+d.heal+" HP<br><button type='button' class='inv-action' data-act='use'>Użyj</button>";
    if(d.type==="ammo") html+="<br>Stos: "+(it.qty||1);
    html+="<br><button type='button' class='inv-action inv-danger' data-act='drop'>Upuść</button>";
    detail.innerHTML=html;
    detail.querySelectorAll(".inv-action").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const act=btn.dataset.act;
        if(act==="equip"||act==="use") useInvItem(it.uid);
        if(act==="reload") reloadEquippedWeapon();
        if(act==="drop"){ removeInvItem(it.uid); renderInventoryUI(); saveGame(); }
        renderInventoryUI();
      });
    });
  }
  drawInvCharPreview();
}
function drawInvCharPreview(){
  const cv=document.getElementById("inv-char-preview");
  if(!cv||typeof drawPerson!=="function") return;
  const pc=cv.getContext("2d");
  pc.clearRect(0,0,cv.width,cv.height);
  pc.fillStyle="#121820"; pc.fillRect(0,0,cv.width,cv.height);
  const preview={x:cv.width/2,y:cv.height*0.58,a:Math.PI/2,r:ped.r||9,
    skin:ped.skin, shirt:ped.shirt, pants:ped.pants, hair:ped.hair, hairStyle:ped.hairStyle,
    beard:ped.beard, shirtStyle:ped.shirtStyle, hat:ped.hat, hatColor:ped.hatColor, body:ped.body};
  pc.save(); pc.scale(2.2,2.2);
  drawPerson(preview, preview.shirt, false, pc);
  pc.restore();
}
function updateInventoryHUD(){
  const wEl=document.getElementById("weapon");
  if(!wEl) return;
  const idx=getEquippedWeaponIdx();
  const w=WEAPONS[idx];
  const it=getEquippedInvItem();
  if(!it||idx===0){ wEl.textContent="Pięści"; return; }
  const d=ITEM_DEFS[it.defId];
  if(w.kind==="melee"){ wEl.textContent=d.name; return; }
  wEl.textContent=d.name+"  "+(it.loaded||0)+" / "+countReserveAmmo(d.ammoType);
}
function drawWeaponHUD(){ updateInventoryHUD(); }
