/* TOPDOWN CITY — 34-supermarket.js */
/* Supermarket registry, rich exterior props, pedestrian shopping routines */

const SUPER_NAMES=["FRESHMART","MEGA FOOD","CITY MART","GROSZEK","MARKET 24","SUPER BAZAR","FOOD HALL"];
const SHOP_LINES={
  enter:["Zakupy!","Tylko na chwilę...","Lista jest długa.","Sprawdzę promocje."],
  browse:["Mleko!","Chleb się kończy.","Co na obiad?","Promocja na ser!","Brakuje jajek.","Kawa jest tania.","Owoce wyglądają świeżo.","Wezmę dwie paczki."],
  checkout:["Kolejka...","Karta czy gotówka?","Torba płatna, oczywiście.","Paragon proszę.","Szybka kasa!"],
  leave:["Mam wszystko.","Ciężkie torby...","Na tyle na dziś.","Wracam do domu."],
};
let supermarkets=[];

function registerSupermarket(b, lot){
  if(b.type!=="super") return;
  b.shopName=b.shopName||pick(SUPER_NAMES);
  supermarkets.push({b, lot, cx:b.x+b.w/2, cy:b.y+b.h, doorX:b.x+b.w/2, doorY:b.y+b.h+6});
}

function superDoorPoint(b, side){
  side=side||0;
  return {x:b.x+b.w*(0.35+side*0.15), y:b.y+b.h+rand(2,14)};
}

function findNearestSupermarket(x,y,maxR){
  maxR=maxR||480; let best=null, bd=maxR*maxR;
  const ci=Math.floor((x-ROAD)/GAP), cj=Math.floor((y-ROAD)/GAP), R=Math.ceil(maxR/GAP)+1;
  for(let i=ci-R;i<=ci+R;i++) for(let j=cj-R;j<=cj+R;j++){
    const L=getLot(i,j);
    for(const b of L.buildings){
      if(b.type!=="super") continue;
      const dx=b.x+b.w/2-x, dy=b.y+b.h-y, d=dx*dx+dy*dy;
      if(d<bd){ bd=d; best={b, lot:L, cx:b.x+b.w/2, cy:b.y+b.h}; }
    }
  }
  return best;
}

function superBrowsePoint(b, phase){
  const t=phase||0;
  if(t===0) return superDoorPoint(b, 0.5);
  if(t===1) return {x:b.x+b.w*0.22, y:b.y+b.h+rand(4,18)};
  if(t===2) return {x:b.x+b.w*0.78, y:b.y+b.h+rand(4,18)};
  return {x:b.x+b.w/2+rand(-28,28), y:b.y+b.h+rand(8,24)};
}

function pedCanShop(p){
  return p.state==="walk" && !p.hostile && !p.panic && !p.armed && !p.act;
}

function startPedShop(p){
  const sup=findNearestSupermarket(p.x,p.y,520);
  if(!sup){ p.actCd=rand(4,9); return; }
  p.act="shop";
  p.shopB=sup.b;
  p.shopLot=sup.lot;
  p.shopPhase="go";
  p.shopT=rand(14,32);
  p.shopSayT=rand(0.8,2.4);
  p.shopLine=null;
  p.shopStep=0;
  p.onGraph=false;
  p.cross=0; p._wait=false;
  const dt=superDoorPoint(sup.b, rng());
  p.tx=dt.x; p.ty=dt.y;
  p.shopLine=pick(SHOP_LINES.enter);
}

function updatePedShopping(p,dt){
  const b=p.shopB;
  if(!b || b.type!=="super"){
    p.act=null; p.shopB=null; p.actCd=rand(8,16); p.onGraph=true; return;
  }
  p.shopT-=dt;
  p.shopSayT-=dt;
  if(p.shopSayT<=0){
    p.shopSayT=rand(2.2,5.5);
    const lines= p.shopPhase==="checkout"?SHOP_LINES.checkout :
                 p.shopPhase==="leave"?SHOP_LINES.leave : SHOP_LINES.browse;
    p.shopLine=pick(lines);
  }
  if(p.shopPhase==="go"){
    const dx=p.tx-p.x, dy=p.ty-p.y, d=Math.hypot(dx,dy)||1;
    p.a=Math.atan2(dy,dx);
    if(d<16){ p.shopPhase="browse"; p.shopT=rand(10,22); p.shopStep=0; p.shopLine=pick(SHOP_LINES.browse); }
    else { p.x+=dx/d*p.speed*1.05*dt; p.y+=dy/d*p.speed*1.05*dt; }
    return;
  }
  if(p.shopPhase==="browse"){
    const dx=p.tx-p.x, dy=p.ty-p.y, d=Math.hypot(dx,dy)||1;
    p.a=Math.atan2(dy,dx);
    if(d<10 || p.shopT<8){
      p.shopStep=(p.shopStep+1)%4;
      const pt=superBrowsePoint(b, p.shopStep);
      p.tx=pt.x; p.ty=pt.y;
    } else { p.x+=dx/d*p.speed*0.72*dt; p.y+=dy/d*p.speed*0.72*dt; }
    if(p.shopT<=0){ p.shopPhase="checkout"; p.shopT=rand(5,11); p.tx=b.x+b.w*0.5; p.ty=b.y+b.h+8; p.shopLine=pick(SHOP_LINES.checkout); }
    return;
  }
  if(p.shopPhase==="checkout"){
    const dx=p.tx-p.x, dy=p.ty-p.y, d=Math.hypot(dx,dy)||1;
    p.a=Math.atan2(dy,dx);
    if(d>12) { p.x+=dx/d*p.speed*0.55*dt; p.y+=dy/d*p.speed*0.55*dt; }
    if(p.shopT<=0){ p.shopPhase="leave"; p.shopT=rand(4,8); p.shopLine=pick(SHOP_LINES.leave);
      const ang=rng()*6.283, dist=rand(90,180);
      p.tx=b.x+b.w/2+Math.cos(ang)*dist; p.ty=b.y+b.h+Math.sin(ang)*dist*0.4+40; }
    return;
  }
  if(p.shopPhase==="leave"){
    const dx=p.tx-p.x, dy=p.ty-p.y, d=Math.hypot(dx,dy)||1;
    p.a=Math.atan2(dy,dx);
    p.x+=dx/d*p.speed*0.95*dt; p.y+=dy/d*p.speed*0.95*dt;
    if(p.shopT<=0 || d<14){
      p.act=null; p.shopB=null; p.shopLine=null; p.actCd=rand(10,20);
      const nd=nearestCityNode(p.x,p.y);
      if(nd){ const nb=neighbors(nd[0],nd[1]); if(nb.length){ p.pa=nd; p.pb=nb[(rng()*nb.length)|0]; p.pt=rng()*0.5+0.2; p.onGraph=true; } }
    }
  }
}

function maybeStartPedShop(p){
  if(!pedCanShop(p)) return false;
  const ci=Math.floor((p.x-ROAD)/GAP), cj=Math.floor((p.y-ROAD)/GAP);
  if(biomeOf(ci,cj)!=="city") return false;
  const z=cityZone(ci,cj);
  if(z!=="downtown" && z!=="midrise") return false;
  const h=typeof gameHour!=="undefined"?gameHour:12;
  if(h<7.5 || h>=21.5) return false;
  if(!findNearestSupermarket(p.x,p.y,380)) return false;
  if(rng()>0.42) return false;
  startPedShop(p);
  return true;
}

function drawShopSpeech(p){
  if(!p.shopLine) return;
  const txt=p.shopLine, fs=9;
  ctx.font=`bold ${fs}px monospace`;
  const tw=ctx.measureText(txt).width, w=Math.min(120,tw+12), h=14;
  const bx=p.x, by=p.y-22;
  ctx.fillStyle="rgba(255,255,255,.94)";
  ctx.beginPath(); ctx.roundRect(bx-w/2, by-h/2, w, h, 3); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.94)";
  ctx.beginPath(); ctx.moveTo(bx-3,by+h/2); ctx.lineTo(bx-7,by+h/2+5); ctx.lineTo(bx+1,by+h/2); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#333"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(txt.length>18?txt.slice(0,17)+"…":txt, bx, by);
  ctx.textBaseline="alphabetic";
}

function drawShopCart(p){
  const s=p.s||12;
  ctx.strokeStyle="#778899"; ctx.lineWidth=1.3;
  ctx.strokeRect(p.x-s*0.35, p.y-s*0.55, s*0.7, s*0.45);
  ctx.beginPath(); ctx.arc(p.x-s*0.28, p.y-s*0.02, s*0.12, 0, 7); ctx.arc(p.x+s*0.28, p.y-s*0.02, s*0.12, 0, 7); ctx.stroke();
  ctx.fillStyle="rgba(180,200,220,.4)"; ctx.fillRect(p.x-s*0.3, p.y-s*0.52, s*0.6, s*0.22);
}

function drawProduceCrate(p){
  const s=p.s||16;
  ctx.fillStyle="#8a6a3a"; ctx.fillRect(p.x-s*0.4, p.y-s*0.35, s*0.8, s*0.55);
  ctx.strokeStyle="rgba(0,0,0,.25)"; ctx.strokeRect(p.x-s*0.4, p.y-s*0.35, s*0.8, s*0.55);
  const cols=["#e74c3c","#f39c12","#2ecc71","#27ae60"];
  for(let i=0;i<6;i++){
    ctx.fillStyle=cols[i%cols.length];
    ctx.beginPath(); ctx.arc(p.x-s*0.25+(i%3)*s*0.22, p.y-s*0.18+((i/3)|0)*s*0.18, s*0.08, 0, 7); ctx.fill();
  }
}
