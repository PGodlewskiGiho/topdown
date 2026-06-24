/* TOPDOWN CITY — 38-drift-events.js */
/* Nocne wyścigi driftu w mieście: mapa, nawigacja, tandem tsuiso (2 auta) */

const driftEvents = [];
const DRIFT_EVENT_MAX = 4;
const DRIFT_EVENT_GAME_MIN = 52;
const DRIFT_EVENT_RADIUS = 130;
const DRIFT_JOIN_R = 150;
const DRIFT_BATTLE_SEC = 75;
const DRIFT_MAP_BLIP = "#ff7a38";

const DRIFT_EVENT_NAMES = [
  "Tsuiso · Centrum", "Nocny drift · Bulwar", "Underground · Midtown",
  "Parking drift · Downtown", "2-car battle · Aleja", "Klif nocny · Midrise",
  "Street drift · Vesper", "Klejenie · Nocny tor", "Pro-am · Downtown",
];

let driftBattle = null;
let driftLead = null;
let driftEventSpawnCd = 0;
let jHeld = false;
let driftWasNight = false;
let driftEventPreviewId = null;

function drawCircuitOnCanvas(cctx, W, H, circuit, markers){
  if(!circuit||!circuit.points||!circuit.points.length) return;
  ensureCircuitMeta({circuit});
  const b=circuit.bounds, pad=10;
  const spanX=Math.max(40, b.maxX-b.minX), spanY=Math.max(40, b.maxY-b.minY);
  const scale=Math.min((W-pad*2)/spanX, (H-pad*2)/spanY);
  const cx=(b.minX+b.maxX)/2, cy=(b.minY+b.maxY)/2;
  const tx=wx=>W/2+(wx-cx)*scale, ty=wy=>H/2+(wy-cy)*scale;

  cctx.clearRect(0,0,W,H);
  cctx.fillStyle="#080a10";
  cctx.fillRect(0,0,W,H);
  cctx.strokeStyle="rgba(255,255,255,.06)";
  cctx.strokeRect(0.5,0.5,W-1,H-1);

  cctx.strokeStyle="#3a4048";
  cctx.lineWidth=5;
  cctx.lineJoin="round";
  cctx.lineCap="round";
  cctx.beginPath();
  cctx.moveTo(tx(circuit.points[0].x), ty(circuit.points[0].y));
  for(let i=1;i<circuit.points.length;i++) cctx.lineTo(tx(circuit.points[i].x), ty(circuit.points[i].y));
  cctx.stroke();

  cctx.strokeStyle="#ff7a38";
  cctx.lineWidth=2.2;
  cctx.beginPath();
  cctx.moveTo(tx(circuit.points[0].x), ty(circuit.points[0].y));
  for(let i=1;i<circuit.points.length;i++) cctx.lineTo(tx(circuit.points[i].x), ty(circuit.points[i].y));
  cctx.stroke();

  if(circuit.corners){
    cctx.fillStyle="#ffd23b";
    for(const cr of circuit.corners){
      cctx.beginPath();
      cctx.arc(tx(cr.x), ty(cr.y), 2.2, 0, 7);
      cctx.fill();
    }
  }

  cctx.fillStyle="rgba(255,120,60,.45)";
  cctx.beginPath();
  cctx.arc(tx(circuit.cx), ty(circuit.cy), 3.5, 0, 7);
  cctx.fill();

  if(markers&&markers.lead){
    cctx.fillStyle="#ff5c2e";
    cctx.strokeStyle="rgba(0,0,0,.6)";
    cctx.lineWidth=1;
    cctx.beginPath();
    cctx.arc(tx(markers.lead.x), ty(markers.lead.y), 4.5, 0, 7);
    cctx.fill();
    cctx.stroke();
    cctx.fillStyle="#ffe0cc";
    cctx.font="bold 7px monospace";
    cctx.textAlign="center";
    cctx.fillText("L", tx(markers.lead.x), ty(markers.lead.y)+2.5);
  }
  if(markers&&markers.player){
    cctx.fillStyle="#f0f2f8";
    cctx.strokeStyle="rgba(0,0,0,.65)";
    cctx.lineWidth=1;
    const px=tx(markers.player.x), py=ty(markers.player.y);
    cctx.beginPath();
    cctx.moveTo(px, py-5); cctx.lineTo(px+4.5, py+4); cctx.lineTo(px-4.5, py+4);
    cctx.closePath();
    cctx.fill();
    cctx.stroke();
  }
}

function setDriftEventPreview(ev){
  driftEventPreviewId=ev?ev.id:null;
  const label=document.getElementById("bigmap-event-preview-label");
  const cv=document.getElementById("bigmap-event-preview-cv");
  if(label) label.textContent=ev?`${ev.name} · ${ev.zone}`:"Najedź lub wybierz wyścig";
  if(cv){
    const cctx=cv.getContext("2d");
    if(!ev){ cctx&&cctx.clearRect(0,0,cv.width,cv.height); return; }
    drawCircuitOnCanvas(cctx, cv.width, cv.height, ensureCircuitMeta(ev), null);
  }
  const list=document.getElementById("bigmap-event-list");
  if(list){
    for(const li of list.querySelectorAll("li[data-ev]")){
      li.classList.toggle("selected", li.dataset.ev===driftEventPreviewId);
    }
  }
}

function drawDriftBattleRadar(){
  const cv=document.getElementById("drift-track-preview");
  if(!cv||!driftBattle) return;
  cv.classList.remove("hidden");
  const ev=driftBattle.event;
  const lead=ev&&ev.lead;
  drawCircuitOnCanvas(cv.getContext("2d"), cv.width, cv.height, ensureCircuitMeta(ev), {
    player:{x:car.x,y:car.y},
    lead:lead?{x:lead.x,y:lead.y}:null,
  });
}

function hideDriftBattleRadar(){
  const cv=document.getElementById("drift-track-preview");
  if(cv) cv.classList.add("hidden");
}

function drawNfsChevron(x,y,angle,alpha,scale){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  const bob=Math.sin(performance.now()/110+x*0.02)*2.5;
  ctx.translate(0,bob-6);
  ctx.globalAlpha=alpha;
  const s=scale||1;
  ctx.fillStyle="#ffd23b";
  ctx.strokeStyle="rgba(20,14,0,.85)";
  ctx.lineWidth=1.8;
  ctx.lineJoin="round";
  ctx.beginPath();
  ctx.moveTo(11*s,0);
  ctx.lineTo(-5*s,-8*s);
  ctx.lineTo(-1*s,0);
  ctx.lineTo(-5*s,8*s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawNfsTurnArrows(ox,oy,ev){
  if(!driftBattle||!ev||mode!=="car") return;
  const circuit=ensureCircuitMeta(ev);
  if(!circuit||!circuit.corners||!circuit.corners.length) return;
  const ca=Math.cos(car.a), sa=Math.sin(car.a);
  const t=performance.now()/1000;

  for(const cr of circuit.corners){
    const dx=cr.x-car.x, dy=cr.y-car.y;
    const dist=Math.hypot(dx,dy);
    if(dist>300||dist<14) continue;
    const ahead=dx*ca+dy*sa;
    if(ahead<12) continue;
    const fade=clamp(1-(dist-40)/240, 0.2, 1)*clamp(ahead/80, 0.35, 1);
    if(fade<0.15) continue;

    const stacks=4;
    for(let k=0;k<stacks;k++){
      const back=22+k*20;
      const ax=cr.x-Math.cos(cr.inA)*back;
      const ay=cr.y-Math.sin(cr.inA)*back;
      if(ax<ox-50||ax>ox+VW+50||ay<oy-50||ay>oy+VH+50) continue;
      const pulse=0.55+0.45*Math.sin(t*9-k*0.55-dist*0.015);
      drawNfsChevron(ax, ay, cr.turnA, fade*pulse*(1-k*0.12), 0.95-k*0.06);
    }
  }
}

function isNightDriftHour(h){
  h=h==null?gameHour:h;
  return h>=19.3||h<6.2;
}

function driftEventDurationS(){
  return (DRIFT_EVENT_GAME_MIN/1440)*DAY_LENGTH;
}

function cellGoodForDrift(i,j){
  if(biomeOf(i,j)!=="city") return false;
  const z=cityZone(i,j);
  if(z!=="downtown"&&z!=="midrise") return false;
  if(neighbors(i,j).length<2) return false;
  for(const[di,dj]of[[1,0],[0,1]]){
    const e=getEdge(i,j,di,dj);
    if(e.exists&&(e.klass==="blvd"||e.klass==="art"||e.hwy)) return true;
  }
  return false;
}

function buildDriftCircuit(wx,wy){
  const nd=nearestCityNode(wx,wy);
  if(!nd) return null;
  const pts=[];
  let ai=nd[0], aj=nd[1], prev=null;
  for(let step=0;step<7;step++){
    const nb=neighbors(ai,aj).filter(n=>!(prev&&n[0]===prev[0]&&n[1]===prev[1]));
    if(!nb.length) break;
    const pick=nb.filter(([ni,nj])=>{
      const e=getEdge(ai,aj,ni-ai,nj-aj);
      return e.exists&&(e.klass==="blvd"||e.klass==="art"||e.hwy||e.width>ROAD*0.9);
    });
    const bi=(pick.length?pick:nb)[(rng()*((pick.length?pick:nb).length))|0];
    const g=edgeGeom(ai,aj,bi[0],bi[1]);
    for(let t=0.18;t<0.92;t+=0.28){
      const p=bez(g.p0,g.cp,g.p1,t);
      pts.push({x:p[0],y:p[1]});
    }
    prev=[ai,aj]; ai=bi[0]; aj=bi[1];
  }
  if(pts.length<4) return null;
  const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length;
  const cy=pts.reduce((s,p)=>s+p.y,0)/pts.length;
  return enrichDriftCircuit({points:pts, cx, cy});
}

function enrichDriftCircuit(circuit){
  const pts=circuit.points;
  const corners=[];
  for(let i=1;i<pts.length-1;i++){
    const ax=pts[i-1].x-pts[i].x, ay=pts[i-1].y-pts[i].y;
    const bx=pts[i+1].x-pts[i].x, by=pts[i+1].y-pts[i].y;
    const la=Math.hypot(ax,ay), lb=Math.hypot(bx,by);
    if(la<8||lb<8) continue;
    const dot=(ax*bx+ay*by)/(la*lb);
    const ang=Math.acos(clamp(dot,-1,1));
    if(ang<0.32) continue;
    const cross=ax*by-ay*bx;
    corners.push({
      x:pts[i].x, y:pts[i].y,
      inA:Math.atan2(-ay,-ax), outA:Math.atan2(by,bx),
      turnA:Math.atan2(by,bx)+(cross>0?0.42:-0.42),
      side:cross>0?1:-1, sharp:ang, idx:i,
    });
  }
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  for(const p of pts){
    minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x);
    minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y);
  }
  circuit.corners=corners;
  circuit.bounds={minX,maxX,minY,maxY};
  return circuit;
}

function ensureCircuitMeta(ev){
  if(!ev||!ev.circuit) return null;
  if(!ev.circuit.bounds) enrichDriftCircuit(ev.circuit);
  return ev.circuit;
}

function pickDriftEventSpot(){
  const cc=nearestCity(Math.round(focusX/GAP), Math.round(focusY/GAP));
  for(let t=0;t<80;t++){
    const ang=rng()*6.283;
    const dist=Math.pow(rng(),0.42)*(cc.R*0.55+2);
    const i=Math.round(cc.cx+Math.cos(ang)*dist);
    const j=Math.round(cc.cy+Math.sin(ang)*dist);
    if(!cellGoodForDrift(i,j)) continue;
    const wx=nX(i,j), wy=nY(i,j);
    const circuit=buildDriftCircuit(wx,wy);
    if(!circuit) continue;
    const tooClose=driftEvents.some(ev=>Math.hypot(ev.x-circuit.cx,ev.y-circuit.cy)<420);
    if(tooClose) continue;
    return {i,j, x:circuit.cx, y:circuit.cy, circuit, zone:cityZone(i,j)};
  }
  return null;
}

function createDriftLead(spot){
  const lead={
    x:spot.circuit.points[0].x, y:spot.circuit.points[0].y, a:0,
    vx:0, vy:0, W:34, L:62, R:28, color:"#ff5c2e", kind:"car", type:"coupe",
    state:"driftlead", hp:999, dead:false, route:spot.circuit.points.slice(),
    routeIdx:1, phase:rng()*6.28, driftBurst:0, speed:92,
    brand:"Nissan", carName:"240SX", accent:"#c41e12",
  };
  const p0=spot.circuit.points[0], p1=spot.circuit.points[1]||p0;
  lead.a=Math.atan2(p1.y-p0.y, p1.x-p0.x);
  return lead;
}

function spawnDriftEvent(){
  if(driftEvents.length>=DRIFT_EVENT_MAX) return null;
  const spot=pickDriftEventSpot();
  if(!spot) return null;
  const name=DRIFT_EVENT_NAMES[(rng()*DRIFT_EVENT_NAMES.length)|0];
  const ev={
    id:((rng()*1e9)|0).toString(36),
    name,
    x:spot.x, y:spot.y, i:spot.i, j:spot.j,
    zone:spot.zone,
    circuit:spot.circuit,
    endsAtClock:clockS+driftEventDurationS(),
    lead:createDriftLead(spot),
    crowd:(4+(rng()*9)|0),
  };
  driftEvents.push(ev);
  for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++) discovered.add(mapCellKey(ev.i+di, ev.j+dj));
  return ev;
}

function driftEventTimeLeft(ev){
  return Math.max(0, ev.endsAtClock-clockS);
}

function driftEventTimeLabel(ev){
  const left=driftEventTimeLeft(ev);
  const gm=(left/DAY_LENGTH)*1440;
  const mm=Math.floor(gm), ss=Math.floor((gm-mm)*60);
  if(mm>=60) return `${Math.floor(mm/60)}h ${mm%60}m`;
  if(mm>0) return `${mm} min`;
  return `${ss} s`;
}

function removeDriftEvent(id){
  const i=driftEvents.findIndex(e=>e.id===id);
  if(i<0) return;
  if(driftBattle&&driftBattle.eventId===id) endTandemBattle("event");
  driftEvents.splice(i,1);
}

function readVehicleDriftTelemetry(v){
  if(!v||v.dead) return {slip:0,angle:0,lat:0,fwd:0,speed:0,scoring:false,a:v? v.a:0};
  const speed=Math.hypot(v.vx,v.vy);
  if(speed<16) return {slip:0,angle:0,lat:0,fwd:0,speed,scoring:false,a:v.a};
  const c=Math.cos(v.a), s=Math.sin(v.a);
  const lat=-v.vx*s+v.vy*c;
  const fwd=v.vx*c+v.vy*s;
  const slip=Math.min(1, Math.abs(lat)/Math.max(speed,1));
  const angle=Math.atan2(Math.abs(lat), Math.max(Math.abs(fwd),6))*180/Math.PI;
  const scoring=slip>0.18&&angle>10&&speed>32;
  return {slip,angle,lat,fwd,speed,scoring,a:v.a};
}

function updateDriftLead(lead, dt){
  if(!lead||!lead.route||!lead.route.length) return;
  const wp=lead.route[lead.routeIdx%lead.route.length];
  const dx=wp.x-lead.x, dy=wp.y-lead.y;
  const dist=Math.hypot(dx,dy);
  let targetA=Math.atan2(dy,dx);
  let da=((targetA-lead.a+Math.PI*3)%(Math.PI*2))-Math.PI;
  const turnRate=2.6+Math.min(1.8, Math.abs(da)*2);
  lead.a+=clamp(da,-turnRate*dt, turnRate*dt);

  lead.phase+=dt*1.1;
  const base=88+22*Math.sin(lead.phase*0.7);
  const sharp=Math.abs(da)/Math.max(dt,0.001);
  if(sharp>1.4&&lead.driftBurst<=0) lead.driftBurst=0.35+rng()*0.45;
  if(lead.driftBurst>0) lead.driftBurst-=dt;

  const c=Math.cos(lead.a), s=Math.sin(lead.a);
  const driftSide=lead.driftBurst>0? (lead.driftBurst>0.2?1:-1) : 0;
  const latPush=driftSide*base*(0.22+0.28*(lead.driftBurst>0?1:0));
  lead.vx=c*base-s*latPush;
  lead.vy=s*base+c*latPush;
  lead.x+=lead.vx*dt;
  lead.y+=lead.vy*dt;

  if(dist<52){
    lead.routeIdx=(lead.routeIdx+1)%lead.route.length;
    if(rng()<0.42) lead.driftBurst=0.5+rng()*0.35;
  }
}

function tandemProximityScore(dist, behind){
  const ideal=34, sigma=20;
  const prox=Math.exp(-((dist-ideal)*(dist-ideal))/(2*sigma*sigma));
  const band=dist>12&&dist<72?1:Math.max(0, 1-Math.abs(dist-42)/55);
  return clamp(prox*0.65+band*0.35, 0, 1)*clamp(behind, 0.15, 1);
}

function tandemAngleScore(chaseAng, leadAng){
  const diff=Math.abs(chaseAng-leadAng);
  const match=1-clamp(diff/55, 0, 1);
  const bonus=chaseAng>18&&leadAng>16?0.12:0;
  return clamp(match+bonus, 0, 1);
}

function tandemLineScore(chase, lead){
  const c=Math.cos(chase.a), s=Math.sin(chase.a);
  const lc=Math.cos(lead.a), ls=Math.sin(lead.a);
  const heading=(c*lc+s*ls+1)*0.5;
  const relX=chase.x-lead.x, relY=chase.y-lead.y;
  const relLat=-relX*ls+relY*lc;
  const leadLat=lead.lat||0;
  const latMatch=leadLat!==0? 1-clamp(Math.abs(relLat*0.04-leadLat*0.35)/1.2, 0, 1) : 0.55;
  return clamp(heading*0.62+latMatch*0.38, 0, 1);
}

function startTandemBattle(ev){
  if(driftBattle||mode!=="car"||car.dead) return;
  if(drift.session&&drift.session.mode==="run") endDriftRun(true);
  driftBattle={
    eventId:ev.id,
    event:ev,
    score:0,
    timeLeft:DRIFT_BATTLE_SEC,
    combo:1,
    comboT:0,
    peakCombo:1,
    proxPts:0, anglePts:0, linePts:0, stylePts:0,
    bestProx:0, bestAngle:0,
  };
  driftLead=ev.lead;
  ensureCircuitMeta(ev);
  showBigMsg("TSUISO · KLEJ SIĘ ZA LIDEREM · 75 s");
}

function endTandemBattle(reason){
  if(!driftBattle) return;
  const s=driftBattle;
  const pts=s.score|0;
  let msg=`TSUISO · ${pts.toLocaleString("pl")} pkt`;
  if(reason==="time") msg=`CZAS! · ${pts.toLocaleString("pl")} pkt`;
  else if(reason==="event") msg=`KONIEC IMPREZY · ${pts.toLocaleString("pl")} pkt`;
  else if(reason==="manual") msg=`KONIEC TSUISO · ${pts.toLocaleString("pl")} pkt`;
  showBigMsg(msg);
  driftBattle=null;
  hideDriftBattleRadar();
}

function updateTandemBattle(dt){
  if(!driftBattle||mode!=="car") return;
  const ev=driftBattle.event;
  if(!ev||driftEventTimeLeft(ev)<=0){ endTandemBattle("event"); return; }

  driftBattle.timeLeft-=dt;
  if(driftBattle.timeLeft<=0){ endTandemBattle("time"); return; }

  const lead=ev.lead;
  const chaseTel=readCarDriftTelemetry();
  const leadTel=readVehicleDriftTelemetry(lead);
  lead.lat=leadTel.lat;

  const relX=car.x-lead.x, relY=car.y-lead.y;
  const dist=Math.hypot(relX,relY);
  const lc=Math.cos(lead.a), ls=Math.sin(lead.a);
  const behind=(-relX*lc-relY*ls)/Math.max(dist,1);

  const prox=tandemProximityScore(dist, behind);
  const ang=tandemAngleScore(chaseTel.angle, leadTel.angle);
  const line=tandemLineScore(car, lead);
  const style=chaseTel.scoring? clamp(chaseTel.slip*driftAngleFactor(chaseTel.angle), 0, 1) : 0;

  const active=chaseTel.scoring&&leadTel.scoring&&dist<85&&behind>0.05;
  let framePts=0;
  if(active){
    const wProx=0.40, wAng=0.30, wLine=0.22, wStyle=0.08;
    const quality=wProx*prox+wAng*ang+wLine*line+wStyle*style;
    driftBattle.comboT+=dt;
    if(driftBattle.comboT>0.5){
      driftBattle.combo=Math.min(6, driftBattle.combo+dt*0.45);
      driftBattle.comboT=0;
    }
    framePts=quality*driftBattle.combo*125*dt;
    driftBattle.proxPts+=prox*wProx*125*dt*driftBattle.combo;
    driftBattle.anglePts+=ang*wAng*125*dt*driftBattle.combo;
    driftBattle.linePts+=line*wLine*125*dt*driftBattle.combo;
    driftBattle.stylePts+=style*wStyle*125*dt*driftBattle.combo;
    driftBattle.bestProx=Math.max(driftBattle.bestProx, prox);
    driftBattle.bestAngle=Math.max(driftBattle.bestAngle, ang);
    if(chaseTel.slip>0.3&&Math.random()<dt*10) spawnDriftSmoke(car.x,car.y,car.a,chaseTel.slip*0.8);
  } else {
    driftBattle.comboT=0;
    driftBattle.combo=Math.max(1, driftBattle.combo-dt*1.8);
  }
  driftBattle.score+=framePts;
}

function nearestDriftEvent(x,y){
  let best=null, bd=1e18;
  for(const ev of driftEvents){
    const d=(ev.x-x)**2+(ev.y-y)**2;
    if(d<bd){ bd=d; best=ev; }
  }
  return best;
}

function hitDriftEventAt(wx,wy, screenR){
  screenR=screenR||14;
  const ms=bigMapOpen?bigMapZoom:0.42;
  const r=screenR/ms;
  for(const ev of driftEvents){
    if(Math.hypot(ev.x-wx, ev.y-wy)<Math.max(r, DRIFT_EVENT_RADIUS*0.35)) return ev;
  }
  return null;
}

function navigateToDriftEvent(ev){
  if(!ev) return;
  for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++) discovered.add(mapCellKey(ev.i+di, ev.j+dj));
  setNavTarget(ev.x, ev.y);
}

function filteredDriftEvents(q){
  q=(q||"").trim().toLowerCase();
  return driftEvents
    .slice()
    .sort((a,b)=>driftEventTimeLeft(a)-driftEventTimeLeft(b))
    .filter(ev=>!q||ev.name.toLowerCase().includes(q)||ev.zone.includes(q));
}

function refreshDriftEventList(){
  const list=document.getElementById("bigmap-event-list");
  const search=document.getElementById("bigmap-event-search");
  if(!list) return;
  const q=search?search.value:"";
  const items=filteredDriftEvents(q);
  list.innerHTML="";
  if(!items.length){
    const li=document.createElement("li");
    li.className="bigmap-event-empty";
    li.textContent=isNightDriftHour()?"Brak aktywnych wyścigów":"Wyścigi tylko w nocy (po ~19:30)";
    list.appendChild(li);
    setDriftEventPreview(null);
    return;
  }
  for(const ev of items){
    const li=document.createElement("li");
    li.dataset.ev=ev.id;
    const left=driftEventTimeLabel(ev);
    const dist=Math.hypot(ev.x-playerWorldPos().x, ev.y-playerWorldPos().y);
    li.innerHTML=`<span class="ev-name">${ev.name}</span><span class="ev-meta">${left} · ${(dist/100|0)*100} m</span>`;
    li.addEventListener("mouseenter", ()=>setDriftEventPreview(ev));
    li.addEventListener("click", ()=>{
      setDriftEventPreview(ev);
      navigateToDriftEvent(ev);
      if(typeof drawBigMap==="function") drawBigMap();
    });
    if(ev.id===driftEventPreviewId) li.classList.add("selected");
    list.appendChild(li);
  }
  if(driftEventPreviewId){
    const cur=items.find(e=>e.id===driftEventPreviewId);
    if(cur) setDriftEventPreview(cur);
    else if(items.length) setDriftEventPreview(items[0]);
    else setDriftEventPreview(null);
  }
}

function initDriftEventMapUI(){
  const search=document.getElementById("bigmap-event-search");
  if(search) search.addEventListener("input", refreshDriftEventList);
  const _toggle=typeof toggleBigMap==="function"?toggleBigMap:null;
  if(_toggle){
    window.toggleBigMap=function(force){
      _toggle(force);
      if(bigMapOpen) refreshDriftEventList();
      else setDriftEventPreview(null);
    };
  }
  const _draw=typeof drawBigMap==="function"?drawBigMap:null;
  if(_draw){
    window.drawBigMap=function(){
      _draw();
      refreshDriftEventList();
    };
  }
}

function updateDriftEvents(dt){
  if(typeof gamePhase==="undefined"||gamePhase!=="playing") return;

  for(let i=driftEvents.length-1;i>=0;i--){
    if(driftEventTimeLeft(driftEvents[i])<=0) removeDriftEvent(driftEvents[i].id);
  }

  if(isNightDriftHour()){
    if(!driftWasNight) driftEventSpawnCd=0.5;
    driftWasNight=true;
    driftEventSpawnCd-=dt;
    if(driftEventSpawnCd<=0&&driftEvents.length<DRIFT_EVENT_MAX){
      if(spawnDriftEvent()) driftEventSpawnCd=18+rng()*24;
      else driftEventSpawnCd=8;
    }
  } else if(driftEvents.length){
    driftWasNight=false;
    while(driftEvents.length) removeDriftEvent(driftEvents[0].id);
  } else driftWasNight=false;

  for(const ev of driftEvents) updateDriftLead(ev.lead, dt);
  if(driftBattle) updateTandemBattle(dt);

  const promptEl=document.getElementById("prompt");
  if(promptEl&&mode==="car"&&!driftBattle){
    const p=playerWorldPos();
    const near=driftEvents.find(ev=>Math.hypot(ev.x-p.x,ev.y-p.y)<DRIFT_JOIN_R);
    if(near&&isNightDriftHour()){
      promptEl.style.opacity="1";
      promptEl.textContent=`J — tsuiso · ${near.name}`;
    }
  }

  if(bigMapOpen) refreshDriftEventList();
}

function drawDriftEventWorld(ox,oy){
  if(driftBattle&&driftBattle.event) drawNfsTurnArrows(ox,oy,driftBattle.event);
  const p=playerWorldPos();
  for(const ev of driftEvents){
    if(ev.x<ox-120||ev.x>ox+VW+120||ev.y<oy-120||ev.y>oy+VH+120) continue;
    const pulse=0.5+0.5*Math.sin(performance.now()/320+ev.x*0.01);
    const near=Math.hypot(ev.x-p.x,ev.y-p.y)<DRIFT_JOIN_R*1.4;
    ctx.save();
    ctx.strokeStyle=`rgba(255,120,50,${(0.22+pulse*0.18).toFixed(3)})`;
    ctx.lineWidth=3;
    ctx.setLineDash([10,8]);
    ctx.beginPath();
    ctx.arc(ev.x, ev.y, DRIFT_EVENT_RADIUS*(0.92+pulse*0.06), 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    if(near){
      ctx.fillStyle="rgba(255,90,40,0.12)";
      ctx.beginPath(); ctx.arc(ev.x, ev.y, DRIFT_JOIN_R, 0, 7); ctx.fill();
    }
    ctx.fillStyle="rgba(255,140,70,0.85)";
    ctx.font="bold 11px monospace";
    ctx.textAlign="center";
    ctx.fillText(ev.name.split("·")[0].trim(), ev.x, ev.y-DRIFT_EVENT_RADIUS-8);
    ctx.restore();
  }
  if(driftLead&&driftBattle&&driftLead.x>ox-60&&driftLead.x<ox+VW+60&&driftLead.y>oy-60&&driftLead.y<oy+VH+60){
    ctx.save();
    ctx.translate(driftLead.x, driftLead.y-38);
    ctx.fillStyle="rgba(255,200,160,0.9)";
    ctx.font="bold 10px monospace";
    ctx.textAlign="center";
    ctx.fillText("LEAD", 0, 0);
    ctx.restore();
  }
}

function drawDriftEventMap(mctx, tx, ty){
  for(const ev of driftEvents){
    const left=driftEventTimeLeft(ev);
    if(left<=0) continue;
    const pulse=0.7+0.3*Math.sin(performance.now()/400+ev.id.length);
    mapDrawBlip(mctx, tx(ev.x), ty(ev.y), 3.8+pulse*0.8, DRIFT_MAP_BLIP, "diamond");
    if(ev.id===driftEventPreviewId){
      const circuit=ensureCircuitMeta(ev);
      if(circuit&&circuit.points.length>1){
        mctx.save();
        mctx.strokeStyle="rgba(255,180,80,.75)";
        mctx.lineWidth=2.4;
        mctx.lineJoin="round";
        mctx.setLineDash([5,4]);
        mctx.beginPath();
        mctx.moveTo(tx(circuit.points[0].x), ty(circuit.points[0].y));
        for(let i=1;i<circuit.points.length;i++) mctx.lineTo(tx(circuit.points[i].x), ty(circuit.points[i].y));
        mctx.stroke();
        mctx.setLineDash([]);
        mctx.restore();
      }
    }
  }
}

function drawTandemHud(){
  if(!driftBattle||mode!=="car") return;
  const el=document.getElementById("drift-hud");
  if(!el) return;
  el.classList.remove("hidden");
  const s=driftBattle;
  const chaseTel=readCarDriftTelemetry();
  el.querySelector(".drift-label").textContent="TSUISO";
  el.querySelector(".drift-score").textContent=(s.score|0).toLocaleString("pl");
  el.querySelector(".drift-angle").textContent=`${chaseTel.angle|0}°`;
  el.querySelector(".drift-slip").textContent=`${(chaseTel.slip*100|0)}%`;
  el.querySelector(".drift-combo").textContent=`×${s.combo.toFixed(1)}`;
  const lead=driftBattle.event&&driftBattle.event.lead;
  const dist=lead? Math.hypot(car.x-lead.x, car.y-lead.y)|0 : 0;
  el.querySelector(".drift-sub").textContent=
    `${Math.ceil(s.timeLeft)}s · ${dist} m · bliskość ${(s.bestProx*100|0)}% · kąt ${(s.bestAngle*100|0)}%`;
  const br=el.querySelector(".drift-breakdown");
  if(br){
    br.classList.remove("hidden");
    br.innerHTML=
      `<span>bliskość <b>${(s.proxPts|0)}</b></span>`+
      `<span>kąt <b>${(s.anglePts|0)}</b></span>`+
      `<span>linia <b>${(s.linePts|0)}</b></span>`+
      `<span>styl <b>${(s.stylePts|0)}</b></span>`;
  }
  drawDriftBattleRadar();
}

window.addEventListener("keydown", e=>{
  if(e.key.toLowerCase()==="j"&&typeof gamePhase!=="undefined"&&gamePhase==="playing"){
    if(!jHeld){
      jHeld=true;
      if(driftBattle) endTandemBattle("manual");
      else {
        const p=playerWorldPos();
        const near=driftEvents.find(ev=>Math.hypot(ev.x-p.x,ev.y-p.y)<DRIFT_JOIN_R);
        if(near) startTandemBattle(near);
      }
    }
  }
});
window.addEventListener("keyup", e=>{ if(e.key.toLowerCase()==="j") jHeld=false; });

initDriftEventMapUI();

Game.register({
  id:"drift-events",
  order:38,
  update:updateDriftEvents,
  drawAfterRoads:drawDriftEventWorld,
  actorLayer:"afterTraffic",
  drawActors(ox,oy){
    if(driftLead&&driftBattle&&driftLead.x>ox-50&&driftLead.x<ox+VW+50&&driftLead.y>oy-50&&driftLead.y<oy+VH+50)
      drawVehicle(driftLead, driftLead.color);
  },
  drawMap(mctx, opts){
    drawDriftEventMap(mctx, opts.tx, opts.ty);
  },
});
