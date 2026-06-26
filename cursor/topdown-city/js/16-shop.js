/* TOPDOWN CITY — 16-shop.js */
/* ---------- shop (buying cars) ---------- */
let nearPad=null;
const promptEl=document.getElementById("prompt");
// keys that define a car's visual identity (shared by buy/save/load)
const CAR_VIS_KEYS=["kind","type","era","brand","accent","color","power","topSpeed","W","L"];
function buyCar(model, chosenColor){
  if(money<model.price){ showBigMsg("ZA MAŁO KASY"); return; }
  money-=model.price;
  car.kind="car"; car.hp=car.maxHp=420; car.dmgSeed=11; car.dead=false;
  car.parts=null; car.tuning=typeof defaultCarTuning==="function"?defaultCarTuning():null;
  car._wheelGripLoss=0; car._lightsBroken=false;
  car.brand=model.brand||""; car.carName=model.name;
  car.type=model.type||"sedan"; car.era=model.era||"modern";
  car.accent=model.accent||"#ff5b46"; car.power=model.power; car.topSpeed=model.topSpeed||200;
  car.W=model.W; car.L=model.L;
  car.R=vehicleHitRadius(car.W,car.L,"car");
  car.color = chosenColor || model.color || (model.colors&&model.colors[0]) || "#c9c9cf";
  car.x=ped.x+34; car.y=ped.y; car.vx=0; car.vy=0; car.a=0;
  if(typeof normalizeCarPerformance==="function") normalizeCarPerformance(car);
  rebuildGauge();
  showBigMsg("KUPIONO: "+(model.brand?model.brand+" ":"")+model.name);
  saveGame();
}
function tryBuy(){
  if(mode==="foot" && nearPad){
    const m=nearPad.model, ci=nearPad.colorIdx||0;
    const col = (m.colors&&m.colors[ci]) || m.color;
    buyCar(m, col);
  }
}
function cyclePadColor(){
  if(mode==="foot" && nearPad && nearPad.model.colors){
    const n=nearPad.model.colors.length;
    nearPad.colorIdx=((nearPad.colorIdx||0)+1)%n;
  }
}
function updateShop(){
  nearPad=null;
  if(mode==="foot" && salon) for(const p of salon.pads){ if(Math.hypot(ped.x-p.x,ped.y-p.y)<40){ nearPad=p; break; } }
}
function drawSalon(){
  if(!salon) return;
  const cellW=salon.cellW||128, cellH=salon.cellH||195;
  const padW=Math.min(72, cellW*0.54), padH=Math.min(96, cellH*0.46);
  const lbl=typeof drawWorldLabel==="function"?drawWorldLabel:null;
  if(lbl) lbl(salon.cx, salon.y+18, "AUTO-SALON", {font:"700 16px 'DM Mono', monospace", color:"#9fd0ff"});
  else { ctx.save(); ctx.font="700 16px 'DM Mono', monospace"; ctx.textAlign="center"; ctx.fillStyle="#9fd0ff"; ctx.fillText("AUTO-SALON", salon.cx, salon.y+18); ctx.restore(); }
  const drawnBrands=new Set();
  for(const p of salon.pads){
    const m=p.model;
    const accent=m.accent||"#ff5b46";
    const brand=m.brand||"";
    const ci=p.colorIdx||0;
    const col=(m.colors&&m.colors[ci])||m.color;
    const isNear=(p===nearPad);
    const bkey=brand+"|"+(m.era||"");
    if(brand && !drawnBrands.has(bkey)){
      drawnBrands.add(bkey);
      const eraTag=m.era==="classic"?" KLASYKI":"";
      const label="── "+brand.toUpperCase()+eraTag+" ──";
      if(lbl) lbl(p.x, p.y-cellH*0.40, label, {font:"800 13px 'DM Mono', monospace", color:accent});
      else { ctx.save(); ctx.font="800 13px 'DM Mono', monospace"; ctx.fillStyle=accent; ctx.textAlign="center"; ctx.fillText(label, p.x, p.y-cellH*0.40); ctx.restore(); }
    }
    ctx.strokeStyle=isNear?"#ffd23b":"rgba(90,150,225,.40)"; ctx.lineWidth=isNear?3:2;
    ctx.strokeRect(p.x-padW*0.5, p.y-padH*0.5, padW, padH);
    ctx.strokeStyle=accent+"66"; ctx.lineWidth=1;
    ctx.strokeRect(p.x-padW*0.5+1, p.y-padH*0.5+1, padW-2, padH-2);
    const sc=Math.min((cellW*0.62)/(m.W||36), (cellH*0.34)/(m.L||80), 1);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(sc, sc);
    const fakeV=Object.assign({x:0,y:0,a:-Math.PI/2},m,{color:col});
    drawVehicle(fakeV, col);
    ctx.restore();
    if(lbl){
      lbl(p.x, p.y-cellH*0.27, m.name, {font:"700 11px 'DM Mono', monospace", color:accent});
      lbl(p.x, p.y-cellH*0.22, "MAX "+m.topSpeed+" KM/H", {font:"600 9px 'DM Mono', monospace", color:"#8fa0b0"});
      lbl(p.x, p.y+cellH*0.44, "$"+m.price, {font:"700 13px 'DM Mono', monospace", color:"#7fe0a8"});
    } else {
      ctx.save();
      ctx.textAlign="center";
      ctx.font="700 10px 'DM Mono', monospace"; ctx.fillStyle=accent; ctx.fillText(m.name, p.x, p.y-cellH*0.27);
      ctx.font="600 8px 'DM Mono', monospace"; ctx.fillStyle="#8fa0b0"; ctx.fillText("MAX "+m.topSpeed+" KM/H", p.x, p.y-cellH*0.22);
      ctx.font="700 13px 'DM Mono', monospace"; ctx.fillStyle="#7fe0a8"; ctx.fillText("$"+m.price, p.x, p.y+cellH*0.44);
      ctx.restore();
    }
    const bars=Math.round((m.power-1.0)*8);
    for(let b=0;b<Math.min(bars,11);b++){
      ctx.fillStyle=b<bars*0.5?accent:accent+"99";
      ctx.fillRect(p.x-20+b*4, p.y+cellH*0.30, 3, 5);
    }
    if(m.colors){
      const sw=6, total=m.colors.length*(sw+1)-1, sx=p.x-total/2;
      for(let k=0;k<m.colors.length;k++){
        ctx.fillStyle=m.colors[k]; ctx.fillRect(sx+k*(sw+1), p.y+cellH*0.34, sw, sw);
        if(k===ci){ ctx.strokeStyle="#fff"; ctx.lineWidth=1; ctx.strokeRect(sx+k*(sw+1)-0.5, p.y+cellH*0.34-0.5, sw+1, sw+1); }
      }
    }
  }
}
function drawShopHUD(){
  if(nearPad){
    const m=nearPad.model;
    const fullName=(m.brand?m.brand+" ":"")+m.name;
    promptEl.style.opacity="1";
    promptEl.textContent = money>=m.price
      ? `Kup ${fullName} — $${m.price}  [B]   ·   kolor [C]`
      : `Za mało: ${fullName} ($${m.price})`;
  } else promptEl.style.opacity="0";
}
