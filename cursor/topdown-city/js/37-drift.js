/* TOPDOWN CITY — 37-drift.js */
/* Drift telemetry, scoring, zones & foundation for drift events / races */

const drift = {
  slip: 0,
  angle: 0,
  scoring: false,
  score: 0,
  combo: 1,
  comboT: 0,
  runBest: 0,
  session: null,
  zone: false,
  smoke: [],
};
const DRIFT_SMOKE_MAX = 48;
const DRIFT_RUN_SEC = 90;

function inDriftZone(x,y){
  if(typeof inPlaza==="function"&&inPlaza(x,y)) return true;
  const [ci,cj]=cellAt(x,y);
  const L=getLot(ci,cj);
  if(L.parking) return true;
  if(L.biome==="city"&&(L.zone==="downtown"||L.zone==="midrise")){
    for(const[di,dj]of[[1,0],[0,1]]){
      const e=getEdge(ci,cj,di,dj);
      if(e.exists&&(e.klass==="blvd"||e.klass==="art"||e.hwy)) return true;
    }
  }
  return false;
}

function driftAngleFactor(deg){
  const a=Math.abs(deg);
  if(a<10) return 0;
  if(a<22) return (a-10)/12*0.55;
  if(a<48) return 0.55+((a-22)/26)*0.45;
  if(a<72) return 1.0-((a-48)/24)*0.35;
  return Math.max(0.25, 0.65-(a-72)/40);
}

function readCarDriftTelemetry(){
  if(mode!=="car"||car.dead) return {slip:0,angle:0,lat:0,fwd:0,speed:0,scoring:false};
  const speed=Math.hypot(car.vx,car.vy);
  if(speed<18) return {slip:0,angle:0,lat:0,fwd:0,speed,scoring:false};
  const c=Math.cos(car.a), s=Math.sin(car.a);
  const lat=-car.vx*s+car.vy*c;
  const fwd=car.vx*c+car.vy*s;
  const slip=Math.min(1, Math.abs(lat)/Math.max(speed,1));
  const angle=Math.atan2(Math.abs(lat), Math.max(Math.abs(fwd),6))*180/Math.PI;
  const scoring=slip>0.20&&angle>11&&speed>36;
  return {slip,angle,lat,fwd,speed,scoring};
}

function spawnDriftSmoke(x,y,a,intensity){
  if(drift.smoke.length>=DRIFT_SMOKE_MAX) drift.smoke.shift();
  const off=-Math.sin(a)*14, oy=Math.cos(a)*14;
  drift.smoke.push({
    x:x+off+(Math.random()-0.5)*8, y:y+oy+(Math.random()-0.5)*8,
    vx:(Math.random()-0.5)*18, vy:-12-Math.random()*28,
    life:0.35+intensity*0.55, max:0.9, r:6+intensity*14, a:intensity,
  });
}

function updateDriftSmoke(dt){
  for(let i=drift.smoke.length-1;i>=0;i--){
    const p=drift.smoke[i];
    p.life-=dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vx*=1-2.2*dt; p.vy-=8*dt;
    if(p.life<=0) drift.smoke.splice(i,1);
  }
}

function updateSkidMarks(dt){
  for(let i=skid.length-1;i>=0;i--){
    const m=skid[i];
    if(m.life===undefined) continue;
    m.life-=dt*0.011;
    if(m.life<=0) skid.splice(i,1);
  }
}

function pushSkidMark(x,y,a,intensity){
  const w=2.4+intensity*6.2;
  skid.push({x,y,a,w,h:w*0.42, a0:0.28+intensity*0.52, life:1});
  while(skid.length>SKID_MAX) skid.shift();
}

function toggleDriftRun(){
  if(typeof gamePhase==="undefined"||gamePhase!=="playing"||mode!=="car") return;
  if(drift.session){
    endDriftRun(true);
    return;
  }
  drift.session={
    mode:"run",
    score:0,
    combo:1,
    timeLeft:DRIFT_RUN_SEC,
    peakCombo:1,
    longest:0,
  };
  drift.score=0;
  showBigMsg("RUN DRIFTU · 90 s");
}

function endDriftRun(manual){
  if(!drift.session) return;
  const s=drift.session;
  drift.runBest=Math.max(drift.runBest, s.score|0);
  const msg=manual
    ? `KONIEC RUNU · ${(s.score|0).toLocaleString("pl")} pkt`
    : `CZAS! · ${(s.score|0).toLocaleString("pl")} pkt`;
  showBigMsg(msg);
  drift.session=null;
  drift.combo=1;
}

function updateDrift(dt){
  if(typeof gamePhase==="undefined"||gamePhase!=="playing") return;
  updateSkidMarks(dt);
  updateDriftSmoke(dt);

  const tel=readCarDriftTelemetry();
  drift.slip=tel.slip;
  drift.angle=tel.angle;
  drift.scoring=tel.scoring;
  drift.zone=mode==="car"&&inDriftZone(car.x,car.y);

  if(mode==="car"&&tel.scoring){
    const kmh=tel.speed*KMH;
    const af=driftAngleFactor(tel.angle);
    const zoneMul=drift.zone?1.35:1.0;
    const hbMul=keys[" "]?1.12:1.0;
    let framePts=kmh*tel.slip*af*drift.combo*zoneMul*hbMul*dt*2.8;

    if(tel.slip>0.42&&tel.angle>28) framePts*=1.18;
    drift.comboT+=dt;
    if(drift.comboT>0.45){
      drift.combo=Math.min(8, drift.combo+dt*0.55);
      drift.comboT=0;
    }

    drift.score+=framePts;
    if(drift.session){
      drift.session.score+=framePts;
      drift.session.combo=drift.combo;
      drift.session.peakCombo=Math.max(drift.session.peakCombo, drift.combo);
      if(tel.angle>drift.session.longest) drift.session.longest=tel.angle;
    }

    if(tel.slip>0.32&&Math.random()<dt*14) spawnDriftSmoke(car.x,car.y,car.a,tel.slip);
  } else {
    drift.comboT=0;
    drift.combo=Math.max(1, drift.combo-dt*2.4);
  }

  if(drift.session){
    drift.session.timeLeft-=dt;
    if(drift.session.timeLeft<=0) endDriftRun(false);
  }
}

function drawDriftSmoke(ox,oy){
  if(!drift.smoke.length) return;
  ctx.save();
  for(const p of drift.smoke){
    if(p.x<ox-40||p.x>ox+VW+40||p.y<oy-40||p.y>oy+VH+40) continue;
    const t=clamp(p.life/(p.max||0.9),0,1);
    const r=p.r*(1-t*0.35);
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    g.addColorStop(0,`rgba(210,215,225,${(0.22*p.a*t).toFixed(3)})`);
    g.addColorStop(0.55,`rgba(140,145,155,${(0.12*p.a*t).toFixed(3)})`);
    g.addColorStop(1,"rgba(80,85,95,0)");
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,7); ctx.fill();
  }
  ctx.restore();
}

function drawDriftHud(){
  if(typeof raceSession!=="undefined"&&raceSession){ return; }
  if(typeof gamePhase==="undefined"||gamePhase!=="playing"||mode!=="car") return;
  const el=document.getElementById("drift-hud");
  if(!el) return;
  const show=drift.scoring||drift.session||(drift.score>0&&drift.combo>1.05)||drift.zone;
  el.classList.toggle("hidden", !show);
  if(!show) return;

  const kmh=(readCarDriftTelemetry().speed*KMH)|0;
  const ang=drift.angle|0;
  const combo=drift.combo.toFixed(1);
  const pts=(drift.session?drift.session.score:drift.score)|0;
  const zone=drift.zone?" · STREFA":"";
  const run=drift.session?` · ${Math.ceil(drift.session.timeLeft)}s`:"";

  el.querySelector(".drift-angle").textContent=`${ang}°`;
  el.querySelector(".drift-slip").textContent=`${(drift.slip*100|0)}%`;
  el.querySelector(".drift-combo").textContent=`×${combo}`;
  el.querySelector(".drift-score").textContent=pts.toLocaleString("pl");
  el.querySelector(".drift-sub").textContent=`${kmh} km/h${zone}${run}`;
}

function drawDriftWorld(ox,oy){
  drawDriftSmoke(ox,oy);
  if(!drift.scoring||mode!=="car") return;
  const tel=readCarDriftTelemetry();
  ctx.save();
  ctx.translate(car.x,car.y);
  ctx.rotate(car.a);
  const pulse=0.5+0.5*Math.sin(performance.now()/90);
  ctx.strokeStyle=`rgba(255,120,60,${(0.35+tel.slip*0.35).toFixed(3)})`;
  ctx.lineWidth=2.2;
  ctx.setLineDash([6,5]);
  ctx.beginPath();
  ctx.arc(0,-car.L*0.1, car.L*0.35+pulse*6, -0.5, 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

let vHeld=false;
window.addEventListener("keydown", e=>{
  if(e.key.toLowerCase()==="v"&&typeof gamePhase!=="undefined"&&gamePhase==="playing"){
    if(!vHeld){ vHeld=true; toggleDriftRun(); }
  }
});
window.addEventListener("keyup", e=>{ if(e.key.toLowerCase()==="v") vHeld=false; });

Game.register({
  id:"drift",
  order:37,
  update:updateDrift,
  drawAfterRoads:drawDriftWorld,
});
