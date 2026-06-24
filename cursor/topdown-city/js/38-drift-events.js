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
  return {points:pts, cx, cy};
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
    return;
  }
  for(const ev of items){
    const li=document.createElement("li");
    const left=driftEventTimeLabel(ev);
    const dist=Math.hypot(ev.x-playerWorldPos().x, ev.y-playerWorldPos().y);
    li.innerHTML=`<span class="ev-name">${ev.name}</span><span class="ev-meta">${left} · ${(dist/100|0)*100} m</span>`;
    li.addEventListener("click", ()=>{ navigateToDriftEvent(ev); if(typeof drawBigMap==="function") drawBigMap(); });
    list.appendChild(li);
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
