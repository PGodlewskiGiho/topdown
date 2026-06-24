/* TOPDOWN CITY — 40-race-events.js */
/* Wyścigi: drift (tsuiso), okrążenia, sprinty — mapa, nawigacja, HUD */

const raceEvents = [];
const RACE_EVENT_MAX = 6;
const RACE_EVENT_GAME_MIN = 48;
const RACE_JOIN_R = 155;
const RACE_CP_R = 52;
const RACE_BLIP = {drift:"#ff7a38", laps:"#5ae0ff", sprint:"#7fe0a8"};

const RACE_NAMES = {
  drift:["Tsuiso · Centrum","Nocny drift · Bulwar","Klejenie · Downtown"],
  laps:["Grand Prix · 3 okr.","Tor miejski · okrążenia","Circuit · Midtown GP"],
  sprint:["Sprint · Bulwar","Drag · Aleja","Time Attack · Downtown","Sprint · Highway"],
};

let raceSession = null;
let raceEventSpawnCd = 0;
let raceWasNight = false;
let racePreviewId = null;
let jHeld = false;

function raceEventDurationS(){ return (RACE_EVENT_GAME_MIN/1440)*DAY_LENGTH; }
function isNightRaceHour(h){ h=h==null?gameHour:h; return h>=19.3||h<6.2; }

function cellGoodForRace(i,j, preferHwy){
  if(biomeOf(i,j)!=="city") return false;
  const z=cityZone(i,j);
  if(z!=="downtown"&&z!=="midrise"&&z!=="suburb") return false;
  if(neighbors(i,j).length<2) return false;
  for(const[di,dj]of[[1,0],[0,1]]){
    const e=getEdge(i,j,di,dj);
    if(!e.exists) continue;
    if(preferHwy&&e.hwy) return true;
    if(e.klass==="blvd"||e.klass==="art"||e.hwy||e.width>ROAD*0.85) return true;
  }
  return false;
}

function walkRoadPath(wx,wy, steps, preferHwy){
  const nd=nearestCityNode(wx,wy);
  if(!nd) return null;
  const pts=[];
  let ai=nd[0], aj=nd[1], prev=null;
  for(let step=0;step<steps;step++){
    const nb=neighbors(ai,aj).filter(n=>!(prev&&n[0]===prev[0]&&n[1]===prev[1]));
    if(!nb.length) break;
    const pick=nb.filter(([ni,nj])=>{
      const e=getEdge(ai,aj,ni-ai,nj-aj);
      return e.exists&&(!preferHwy||e.hwy||e.klass==="blvd"||e.klass==="art");
    });
    const bi=(pick.length?pick:nb)[(rng()*((pick.length?pick:nb).length))|0];
    const g=edgeGeom(ai,aj,bi[0],bi[1]);
    for(let t=0.15;t<0.92;t+=preferHwy?0.22:0.28){
      const p=bez(g.p0,g.cp,g.p1,t);
      pts.push({x:p[0],y:p[1]});
    }
    prev=[ai,aj]; ai=bi[0]; aj=bi[1];
  }
  if(pts.length<4) return null;
  const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length;
  const cy=pts.reduce((s,p)=>s+p.y,0)/pts.length;
  return enrichRaceCircuit({points:pts, cx, cy});
}

function enrichRaceCircuit(circuit){
  const pts=circuit.points;
  const corners=[];
  for(let i=1;i<pts.length-1;i++){
    const ax=pts[i-1].x-pts[i].x, ay=pts[i-1].y-pts[i].y;
    const bx=pts[i+1].x-pts[i].x, by=pts[i+1].y-pts[i].y;
    const la=Math.hypot(ax,ay), lb=Math.hypot(bx,by);
    if(la<8||lb<8) continue;
    const dot=(ax*bx+ay*by)/(la*lb);
    const ang=Math.acos(clamp(dot,-1,1));
    if(ang<0.3) continue;
    const cross=ax*by-ay*bx;
    corners.push({x:pts[i].x,y:pts[i].y,inA:Math.atan2(-ay,-ax),turnA:Math.atan2(by,bx)+(cross>0?0.4:-0.4),side:cross>0?1:-1});
  }
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const p of pts){ minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); }
  circuit.corners=corners;
  circuit.bounds={minX,maxX,minY,maxY};
  return circuit;
}

function buildCheckpoints(circuit, lapMode){
  const pts=circuit.points;
  const cps=[];
  for(let i=0;i<pts.length;i+=2) cps.push({x:pts[i].x,y:pts[i].y,idx:i});
  if(lapMode&&cps.length>1){
    const p0=cps[0];
    cps.push({x:p0.x,y:p0.y,idx:p0.idx,finish:true});
  }
  return cps;
}

function buildSprintRoute(wx,wy){
  const circuit=walkRoadPath(wx,wy,10,true)||walkRoadPath(wx,wy,9,false);
  if(!circuit||circuit.points.length<6) return null;
  const pts=circuit.points;
  const start=pts[0], finish=pts[pts.length-1];
  const checkpoints=buildCheckpoints(circuit,false);
  return {circuit, start, finish, checkpoints, dist:pathLength(pts)};
}

function pathLength(pts){
  let d=0;
  for(let i=1;i<pts.length;i++) d+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  return d;
}

function pickRaceSpot(type){
  const cc=nearestCity(Math.round(focusX/GAP), Math.round(focusY/GAP));
  for(let t=0;t<90;t++){
    const ang=rng()*6.283;
    const dist=Math.pow(rng(),0.4)*(cc.R*0.6+2);
    const i=Math.round(cc.cx+Math.cos(ang)*dist);
    const j=Math.round(cc.cy+Math.sin(ang)*dist);
    const preferHwy=type==="sprint";
    if(!cellGoodForRace(i,j,preferHwy)) continue;
    const wx=nX(i,j), wy=nY(i,j);
    let route;
    if(type==="sprint") route=buildSprintRoute(wx,wy);
    else route={circuit:walkRoadPath(wx,wy,type==="laps"?8:7,false)};
    if(!route||!route.circuit) continue;
    const cx=type==="sprint"?(route.start.x+route.finish.x)/2:route.circuit.cx;
    const cy=type==="sprint"?(route.start.y+route.finish.y)/2:route.circuit.cy;
    if(raceEvents.some(ev=>Math.hypot(ev.x-cx,ev.y-cy)<380)) continue;
    return {i,j,x:cx,y:cy,zone:cityZone(i,j),...route};
  }
  return null;
}

function createRaceLead(spot){
  const p0=spot.circuit.points[0], p1=spot.circuit.points[1]||p0;
  return {
    x:p0.x,y:p0.y,a:Math.atan2(p1.y-p0.y,p1.x-p0.x),
    vx:0,vy:0,W:34,L:62,R:28,color:"#ff5c2e",kind:"car",type:"coupe",
    hp:999,dead:false,route:spot.circuit.points.slice(),routeIdx:1,
    phase:rng()*6.28,driftBurst:0,brand:"Nissan",carName:"240SX",
  };
}

function createRaceRival(spot, offset){
  const idx=Math.min(spot.circuit.points.length-1,2+offset);
  const p0=spot.circuit.points[idx], p1=spot.circuit.points[idx+1]||p0;
  return {
    x:p0.x+(rng()-0.5)*30,y:p0.y+(rng()-0.5)*30,
    a:Math.atan2(p1.y-p0.y,p1.x-p0.x),
    vx:0,vy:0,W:32,L:58,R:26,color:pick(["#5ab0ff","#7fe0a8","#ffd23b"]),
    kind:"car",type:"coupe",hp:999,dead:false,
    route:spot.circuit.points.slice(),routeIdx:(idx+1)%spot.circuit.points.length,
    speed:78+offset*8,rival:true,
  };
}

function spawnRaceEvent(type){
  if(raceEvents.length>=RACE_EVENT_MAX) return null;
  const spot=pickRaceSpot(type);
  if(!spot) return null;
  const names=RACE_NAMES[type];
  const ev={
    id:((rng()*1e9)|0).toString(36),
    type, name:names[(rng()*names.length)|0],
    x:spot.x,y:spot.y,i:spot.i,j:spot.j,zone:spot.zone,
    circuit:spot.circuit,
    endsAtClock:clockS+raceEventDurationS(),
  };
  if(type==="sprint"){
    ev.start=spot.start; ev.finish=spot.finish;
    ev.checkpoints=spot.checkpoints; ev.sprintDist=spot.dist|0;
  } else if(type==="laps"){
    ev.laps=3;
    ev.checkpoints=buildCheckpoints(spot.circuit,true);
    ev.rivals=[createRaceRival(spot,0),createRaceRival(spot,1)];
  } else {
    ev.lead=createRaceLead(spot);
  }
  raceEvents.push(ev);
  for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++) discovered.add(mapCellKey(ev.i+di,ev.j+dj));
  return ev;
}

function raceEventTimeLeft(ev){ return Math.max(0,ev.endsAtClock-clockS); }
function raceEventTimeLabel(ev){
  const gm=(raceEventTimeLeft(ev)/DAY_LENGTH)*1440;
  const mm=Math.floor(gm);
  if(mm>=60) return `${Math.floor(mm/60)}h ${mm%60}m`;
  if(mm>0) return `${mm} min`;
  return `${Math.floor((gm-mm)*60)} s`;
}

function removeRaceEvent(id){
  const i=raceEvents.findIndex(e=>e.id===id);
  if(i<0) return;
  if(raceSession&&raceSession.eventId===id) endRaceSession("event");
  raceEvents.splice(i,1);
}

function updateRaceAI(v,dt){
  if(!v||!v.route||!v.route.length) return;
  const wp=v.route[v.routeIdx%v.route.length];
  const dx=wp.x-v.x, dy=wp.y-v.y, dist=Math.hypot(dx,dy);
  const targetA=Math.atan2(dy,dx);
  let da=((targetA-v.a+Math.PI*3)%(Math.PI*2))-Math.PI;
  v.a+=clamp(da,-2.8*dt,2.8*dt);
  const base=v.speed||(v.rival?85:92);
  const c=Math.cos(v.a), s=Math.sin(v.a);
  if(v.driftBurst>0) v.driftBurst-=dt;
  const lat=v.driftBurst>0?base*0.25:0;
  v.vx=c*base-s*lat; v.vy=s*base+c*lat;
  v.x+=v.vx*dt; v.y+=v.vy*dt;
  if(dist<50){
    v.routeIdx=(v.routeIdx+1)%v.route.length;
    if(!v.rival&&rng()<0.4) v.driftBurst=0.45;
  }
}

function startRaceSession(ev){
  if(raceSession||mode!=="car"||car.dead) return;
  if(drift.session) endDriftRun(true);
  raceSession={
    eventId:ev.id, event:ev, type:ev.type,
    phase:"countdown", countdown:3.2,
    lap:0, lapTotal:ev.laps||0, cpIdx:0,
    lapStart:0, raceTime:0, bestLap:1e9, lapTimes:[],
    finished:false, position:1,
    driftScore:0, driftCombo:1,
  };
  const msgs={drift:"TSUISO · KLEJ SIĘ ZA LIDEREM",laps:`WYŚCIG · ${ev.laps} OKRĄŻENIA`,sprint:"SPRINT · DO METY!"};
  showBigMsg(msgs[ev.type]||"START");
}

function endRaceSession(reason){
  if(!raceSession) return;
  const s=raceSession;
  if(s.finished){
    const bonus=s.type==="drift"?(s.driftScore/8|0)+80:
      s.type==="sprint"?Math.max(100,480-(s.raceTime|0)*2):
      Math.max(120,520-s.lapTimes.reduce((a,b)=>a+b,0)*3);
    money+=bonus;
    const msg=s.type==="drift"?`TSUISO · ${(s.driftScore|0)} pkt · +$${bonus}`:`META! +$${bonus} · ${formatRaceTime(s.raceTime)}`;
    showBigMsg(msg);
  } else if(s.type==="drift"&&reason==="manual"&&s.driftScore>0){
    const bonus=(s.driftScore/10|0)+50;
    money+=bonus;
    showBigMsg(`TSUISO · ${(s.driftScore|0)} pkt · +$${bonus}`);
  } else if(reason==="manual") showBigMsg("KONIEC WYŚCIGU");
  else if(reason==="event") showBigMsg("KONIEC IMPREZY");
  raceSession=null;
  hideRaceRadar();
}

function passCheckpoint(s){
  if(s._cpCd>0) return;
  const cps=evCheckpoints(s);
  s._cpCd=0.45;
  if(s.type==="sprint"){
    s.cpIdx++;
    if(s.cpIdx>=cps.length){
      s.finished=true;
      s.raceTime=performance.now()/1000-s.raceStart;
      endRaceSession("finish");
    }
    return;
  }
  if(s.type==="laps"){
    s.cpIdx++;
    if(s.cpIdx>=cps.length){
      const lapT=performance.now()/1000-s.lapStart;
      s.lapTimes.push(lapT);
      s.bestLap=Math.min(s.bestLap,lapT);
      s.lap++;
      s.cpIdx=0;
      s.lapStart=performance.now()/1000;
      if(s.lap>=s.lapTotal){
        s.finished=true;
        s.raceTime=performance.now()/1000-s.raceStart;
        endRaceSession("finish");
      } else showBigMsg(`OKRĄŻENIE ${s.lap}/${s.lapTotal} · ${formatRaceTime(lapT)}`);
    }
  }
}

function formatRaceTime(sec){
  const m=Math.floor(sec/60), s=(sec%60).toFixed(2);
  return m>0?`${m}:${s.padStart(5,"0")}`:`${s}s`;
}

function evCheckpoints(s){ return s.event.checkpoints||[]; }

function updateRaceProgress(dt){
  if(!raceSession||mode!=="car") return;
  const s=raceSession, ev=s.event;
  if(raceEventTimeLeft(ev)<=0){ endRaceSession("event"); return; }

  if(s.phase==="countdown"){
    s.countdown-=dt;
    if(s.countdown<=0){
      s.phase="racing";
      s.lapStart=performance.now()/1000;
      s.raceStart=s.lapStart;
      showBigMsg("START!");
    }
    return;
  }
  if(s._cpCd>0) s._cpCd-=dt;

  if(s.type==="drift") updateRaceDrift(dt,s,ev);
  else if(s.type==="laps"||s.type==="sprint"){
    s.raceTime=performance.now()/1000-s.raceStart;
    const cps=evCheckpoints(s);
    if(s.cpIdx<cps.length){
      const cp=cps[s.cpIdx];
      if(cp&&Math.hypot(car.x-cp.x,car.y-cp.y)<RACE_CP_R) passCheckpoint(s);
    }
    if(s.type==="laps"&&ev.rivals){
      let ahead=1;
      for(const r of ev.rivals) if(Math.hypot(r.x-car.x,r.y-car.y)>40&&isRivalAhead(r,s)) ahead++;
      s.position=ahead;
    }
  }
}

function isRivalAhead(rival,s){
  const cps=evCheckpoints(s);
  const ri=rival.routeIdx%rival.route.length;
  return ri>s.cpIdx*2;
}

function updateRaceDrift(dt,s,ev){
  const lead=ev.lead;
  if(!lead) return;
  const chaseTel=readCarDriftTelemetry();
  const dist=Math.hypot(car.x-lead.x,car.y-lead.y);
  const lc=Math.cos(lead.a), ls=Math.sin(lead.a);
  const behind=(-(car.x-lead.x)*lc-(car.y-lead.y)*ls)/Math.max(dist,1);
  const prox=dist>12&&dist<70&&behind>0.05?1-clamp(Math.abs(dist-34)/30,0,1):0;
  const ang=1-clamp(Math.abs(chaseTel.angle-30)/50,0,1);
  if(chaseTel.scoring&&prox>0.2){
    s.driftCombo=Math.min(6,s.driftCombo+dt*0.4);
    s.driftScore+=prox*ang*s.driftCombo*90*dt;
    if(chaseTel.slip>0.3&&Math.random()<dt*8) spawnDriftSmoke(car.x,car.y,car.a,chaseTel.slip*0.7);
  } else s.driftCombo=Math.max(1,s.driftCombo-dt*1.5);
}

function updateRaceEvents(dt){
  if(typeof gamePhase==="undefined"||gamePhase!=="playing") return;

  for(let i=raceEvents.length-1;i>=0;i--)
    if(raceEventTimeLeft(raceEvents[i])<=0) removeRaceEvent(raceEvents[i].id);

  const night=isNightRaceHour();
  raceEventSpawnCd-=dt;
  if(raceEventSpawnCd<=0){
    const counts={drift:0,laps:0,sprint:0};
    for(const e of raceEvents) counts[e.type]++;
    if(night&&counts.drift<2&&spawnRaceEvent("drift")) raceEventSpawnCd=12+rng()*16;
    else if(!night&&counts.laps<2&&spawnRaceEvent("laps")) raceEventSpawnCd=14+rng()*18;
    else if(counts.sprint<2&&spawnRaceEvent("sprint")) raceEventSpawnCd=10+rng()*14;
    else raceEventSpawnCd=6;
  }
  if(night&&!raceWasNight) raceEventSpawnCd=0.5;
  raceWasNight=night;

  for(const ev of raceEvents){
    if(ev.lead) updateRaceAI(ev.lead,dt);
    if(ev.rivals) for(const r of ev.rivals) updateRaceAI(r,dt);
  }
  if(raceSession) updateRaceProgress(dt);

  const promptEl=document.getElementById("prompt");
  if(promptEl&&mode==="car"&&!raceSession){
    const near=raceEvents.find(ev=>Math.hypot(ev.x-car.x,ev.y-car.y)<RACE_JOIN_R);
    if(near){
      promptEl.style.opacity="1";
      const hint=near.type==="drift"?"tsuiso":near.type==="laps"?`${near.laps} okr.`: "sprint";
      promptEl.textContent=`J — ${near.name} (${hint})`;
    }
  }
  if(bigMapOpen) refreshRaceEventList();
}

function drawRaceCheckpoints(ox,oy,ev,active){
  const cps=ev.checkpoints||[];
  const s=raceSession;
  for(let i=0;i<cps.length;i++){
    const cp=cps[i];
    if(cp.x<ox-80||cp.x>ox+VW+80||cp.y<oy-80||cp.y>oy+VH+80) continue;
    const isNext=active&&s&&s.cpIdx===i;
    const hex=ev.type==="sprint"?"7fe0a8":ev.type==="laps"?"5ae0ff":"ff7a38";
    const pulse=isNext?0.75+0.25*Math.sin(performance.now()/120):0.35;
    ctx.save();
    ctx.translate(cp.x,cp.y);
    ctx.strokeStyle=`rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${pulse})`;
    ctx.lineWidth=isNext?4:2.5;
    ctx.beginPath();
    ctx.arc(0,0,RACE_CP_R*(isNext?1.05:0.85),0,7);
    ctx.stroke();
    if(isNext){
      ctx.fillStyle=ctx.strokeStyle;
      ctx.font="bold 11px monospace";
      ctx.textAlign="center";
      ctx.fillText(ev.type==="laps"&&(cp.finish||i===0)&&s.lap>0?"META":`${i+1}`,0,4);
    }
    ctx.restore();
  }
  if(ev.type==="sprint"&&ev.finish){
    const f=ev.finish;
    if(f.x>ox-60&&f.x<ox+VW+60){
      ctx.save();
      ctx.strokeStyle="rgba(127,224,168,.85)"; ctx.lineWidth=3;
      ctx.setLineDash([8,6]);
      ctx.strokeRect(f.x-28,f.y-18,56,36);
      ctx.setLineDash([]);
      ctx.fillStyle="rgba(127,224,168,.9)";
      ctx.font="bold 10px monospace"; ctx.textAlign="center";
      ctx.fillText("META",f.x,f.y+4);
      ctx.restore();
    }
  }
}

function drawRaceNfsArrows(ox,oy,ev){
  if(!raceSession||raceSession.phase!=="racing"||!ev.circuit||!ev.circuit.corners) return;
  for(const cr of ev.circuit.corners){
    const dx=cr.x-car.x, dy=cr.y-car.y, dist=Math.hypot(dx,dy);
    if(dist>280||dist<14) continue;
    const ahead=dx*Math.cos(car.a)+dy*Math.sin(car.a);
    if(ahead<12) continue;
    const fade=clamp(1-(dist-40)/220,0.2,1);
    for(let k=0;k<3;k++){
      const ax=cr.x-Math.cos(cr.inA)*(22+k*18), ay=cr.y-Math.sin(cr.inA)*(22+k*18);
      if(ax<ox-40||ax>ox+VW+40) continue;
      drawRaceChevron(ax,ay,cr.turnA,fade*(0.7-k*0.15));
    }
  }
}

function drawRaceChevron(x,y,a,alpha){
  ctx.save(); ctx.translate(x,y); ctx.rotate(a);
  ctx.globalAlpha=alpha;
  ctx.fillStyle="#ffd23b"; ctx.strokeStyle="rgba(20,14,0,.8)"; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-4,-7); ctx.lineTo(-1,0); ctx.lineTo(-4,7); ctx.closePath();
  ctx.fill(); ctx.stroke(); ctx.restore();
}

function drawRaceEventWorld(ox,oy){
  const p=playerWorldPos();
  for(const ev of raceEvents){
    if(ev.x<ox-120||ev.x>ox+VW+120||ev.y<oy-120||ev.y>oy+VH+120) continue;
    const col=RACE_BLIP[ev.type];
    const near=Math.hypot(ev.x-p.x,ev.y-p.y)<RACE_JOIN_R*1.3;
    const active=raceSession&&raceSession.eventId===ev.id;
    ctx.save();
    ctx.strokeStyle=col+"66";
    ctx.lineWidth=3; ctx.setLineDash([10,8]);
    ctx.beginPath(); ctx.arc(ev.x,ev.y,130,0,7); ctx.stroke(); ctx.setLineDash([]);
    if(near||active){
      ctx.fillStyle=`${col}18`;
      ctx.beginPath(); ctx.arc(ev.x,ev.y,RACE_JOIN_R,0,7); ctx.fill();
    }
    ctx.fillStyle=col; ctx.font="bold 11px monospace"; ctx.textAlign="center";
    const tag=ev.type==="drift"?"DRIFT":ev.type==="laps"?`${ev.laps} OKR.`:"SPRINT";
    ctx.fillText(tag, ev.x, ev.y-142);
    ctx.restore();
    if(active) drawRaceCheckpoints(ox,oy,ev,true);
    else if(near) drawRaceCheckpoints(ox,oy,ev,false);
  }
  if(raceSession&&raceSession.phase==="racing") drawRaceNfsArrows(ox,oy,raceSession.event);
  if(raceSession&&raceSession.event){
    const ev=raceSession.event;
    if(ev.lead&&ev.lead.x>ox-50&&ev.lead.x<ox+VW+50) drawVehicle(ev.lead,ev.lead.color);
    if(ev.rivals) for(const r of ev.rivals) if(r.x>ox-50&&r.x<ox+VW+50) drawVehicle(r,r.color);
  }
}

function drawCircuitOnRaceCanvas(cctx,W,H,circuit,markers){
  if(!circuit||!circuit.points) return;
  const b=circuit.bounds, pad=10;
  const scale=Math.min((W-pad*2)/Math.max(40,b.maxX-b.minX),(H-pad*2)/Math.max(40,b.maxY-b.minY));
  const cx=(b.minX+b.maxX)/2, cy=(b.minY+b.maxY)/2;
  const tx=wx=>W/2+(wx-cx)*scale, ty=wy=>H/2+(wy-cy)*scale;
  cctx.clearRect(0,0,W,H); cctx.fillStyle="#080a10"; cctx.fillRect(0,0,W,H);
  cctx.strokeStyle="#3a4048"; cctx.lineWidth=4; cctx.lineJoin="round";
  cctx.beginPath(); cctx.moveTo(tx(circuit.points[0].x),ty(circuit.points[0].y));
  for(let i=1;i<circuit.points.length;i++) cctx.lineTo(tx(circuit.points[i].x),ty(circuit.points[i].y));
  cctx.stroke();
  cctx.strokeStyle="#ff7a38"; cctx.lineWidth=2;
  cctx.beginPath(); cctx.moveTo(tx(circuit.points[0].x),ty(circuit.points[0].y));
  for(let i=1;i<circuit.points.length;i++) cctx.lineTo(tx(circuit.points[i].x),ty(circuit.points[i].y));
  cctx.stroke();
  if(markers&&markers.player){
    const px=tx(markers.player.x), py=ty(markers.player.y);
    cctx.fillStyle="#f0f2f8"; cctx.beginPath(); cctx.moveTo(px,py-5); cctx.lineTo(px+4,py+4); cctx.lineTo(px-4,py+4); cctx.closePath(); cctx.fill();
  }
}

function setRaceEventPreview(ev){
  racePreviewId=ev?ev.id:null;
  const label=document.getElementById("bigmap-event-preview-label");
  const cv=document.getElementById("bigmap-event-preview-cv");
  if(label) label.textContent=ev?`${ev.name} · ${ev.type}`:"Wybierz wyścig";
  if(cv&&ev&&ev.circuit) drawCircuitOnRaceCanvas(cv.getContext("2d"),cv.width,cv.height,ev.circuit,{player:{x:car.x,y:car.y}});
  else if(cv) cv.getContext("2d").clearRect(0,0,cv.width,cv.height);
}

function navigateToRaceEvent(ev){
  if(!ev) return;
  for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++) discovered.add(mapCellKey(ev.i+di,ev.j+dj));
  setNavTarget(ev.x,ev.y);
}

function filteredRaceEvents(q){
  q=(q||"").trim().toLowerCase();
  return raceEvents.filter(ev=>!q||ev.name.toLowerCase().includes(q)||ev.type.includes(q)||ev.zone.includes(q));
}

function refreshRaceEventList(){
  const list=document.getElementById("bigmap-event-list");
  const search=document.getElementById("bigmap-event-search");
  if(!list) return;
  const items=filteredRaceEvents(search?search.value:"");
  list.innerHTML="";
  if(!items.length){
    const li=document.createElement("li");
    li.className="bigmap-event-empty";
    li.textContent="Brak aktywnych wyścigów — wróć później";
    list.appendChild(li);
    return;
  }
  for(const ev of items){
    const li=document.createElement("li");
    li.dataset.ev=ev.id;
    const meta=ev.type==="laps"?`${ev.laps} okr.`:ev.type==="sprint"?`${(ev.sprintDist/100|0)*100} m`:"tsuiso";
    const dist=Math.hypot(ev.x-playerWorldPos().x,ev.y-playerWorldPos().y);
    li.innerHTML=`<span class="ev-name ev-type-${ev.type}">${ev.name}</span><span class="ev-meta">${meta} · ${raceEventTimeLabel(ev)} · ${(dist/100|0)*100} m</span>`;
    li.addEventListener("mouseenter",()=>setRaceEventPreview(ev));
    li.addEventListener("click",()=>{ setRaceEventPreview(ev); navigateToRaceEvent(ev); drawBigMap(); });
    if(ev.id===racePreviewId) li.classList.add("selected");
    list.appendChild(li);
  }
}

function hitRaceEventAt(wx,wy){
  const ms=bigMapOpen?bigMapZoom:0.42;
  const r=16/ms;
  for(const ev of raceEvents) if(Math.hypot(ev.x-wx,ev.y-wy)<Math.max(r,50)) return ev;
  return null;
}

function hideRaceRadar(){ document.getElementById("race-radar")?.classList.add("hidden"); }

function drawRaceHud(){
  const el=document.getElementById("race-hud");
  if(!el||!raceSession||mode!=="car"){ if(el) el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  const s=raceSession, ev=s.event;
  if(s.phase==="countdown"){
    el.querySelector(".race-main").textContent=Math.ceil(s.countdown);
    el.querySelector(".race-sub").textContent="PRZYGOTUJ SIĘ";
    return;
  }
  if(s.type==="laps"){
    el.querySelector(".race-main").textContent=`${Math.min(s.lap+1,s.lapTotal)}/${s.lapTotal}`;
    el.querySelector(".race-sub").textContent=`OKR. · ${formatRaceTime(s.raceTime)} · P${s.position} · naj ${s.bestLap<1e8?formatRaceTime(s.bestLap):"—"}`;
  } else if(s.type==="sprint"){
    el.querySelector(".race-main").textContent=formatRaceTime(s.raceTime);
    el.querySelector(".race-sub").textContent=`SPRINT · CP ${s.cpIdx+1}/${ev.checkpoints.length} · ${(ev.sprintDist/100|0)*100} m`;
  } else {
    el.querySelector(".race-main").textContent=(s.driftScore|0).toLocaleString("pl");
    el.querySelector(".race-sub").textContent=`TSUISO · ×${s.driftCombo.toFixed(1)} · klej się za liderem`;
  }
  const radar=document.getElementById("race-radar");
  if(radar&&ev.circuit){
    radar.classList.remove("hidden");
    drawCircuitOnRaceCanvas(radar.getContext("2d"),radar.width,radar.height,ev.circuit,{player:{x:car.x,y:car.y}});
  }
}

function drawRaceEventMap(mctx,tx,ty){
  for(const ev of raceEvents){
    const col=RACE_BLIP[ev.type]||"#fff";
    mapDrawBlip(mctx,tx(ev.x),ty(ev.y),3.8,RACE_BLIP[ev.type],"diamond");
    if(ev.id===racePreviewId&&ev.circuit){
      mctx.strokeStyle=col+"bb"; mctx.lineWidth=2.2; mctx.setLineDash([4,4]);
      mctx.beginPath(); mctx.moveTo(tx(ev.circuit.points[0].x),ty(ev.circuit.points[0].y));
      for(let i=1;i<ev.circuit.points.length;i++) mctx.lineTo(tx(ev.circuit.points[i].x),ty(ev.circuit.points[i].y));
      mctx.stroke(); mctx.setLineDash([]);
    }
  }
}

function initRaceMapUI(){
  const search=document.getElementById("bigmap-event-search");
  if(search) search.addEventListener("input", refreshRaceEventList);
  const _toggle=toggleBigMap;
  window.toggleBigMap=function(force){
    _toggle(force);
    if(!bigMapOpen) setRaceEventPreview(null);
    else refreshRaceEventList();
  };
  const _draw=drawBigMap;
  window.drawBigMap=function(){ _draw(); refreshRaceEventList(); };
}

window.addEventListener("keydown",e=>{
  if(e.key.toLowerCase()==="j"&&gamePhase==="playing"){
    if(!jHeld){
      jHeld=true;
      if(raceSession) endRaceSession("manual");
      else {
        const near=raceEvents.find(ev=>Math.hypot(ev.x-car.x,ev.y-car.y)<RACE_JOIN_R);
        if(near) startRaceSession(near);
      }
    }
  }
});
window.addEventListener("keyup",e=>{ if(e.key.toLowerCase()==="j") jHeld=false; });

initRaceMapUI();

Game.register({
  id:"race-events",
  order:40,
  update:updateRaceEvents,
  drawAfterRoads:drawRaceEventWorld,
  actorLayer:"afterTraffic",
  drawActors(ox,oy){
    if(!raceSession||!raceSession.event) return;
    const ev=raceSession.event;
    if(ev.lead&&ev.lead.x>ox-50&&ev.lead.x<ox+VW+50) drawVehicle(ev.lead,ev.lead.color);
    if(ev.rivals) for(const r of ev.rivals) if(r.x>ox-50&&r.x<ox+VW+50) drawVehicle(r,r.color);
  },
  drawMap(mctx,opts){ drawRaceEventMap(mctx,opts.tx,opts.ty); },
});
