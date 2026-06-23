/* TOPDOWN CITY — 14-missions.js */
/* ---------- missions / goals ---------- */
let money=0, mission=null, pickup=null;
const moneyEl=document.getElementById("money");
const missionEl=document.getElementById("mission");
function roadPoint(){
  let x,y,tries=0;
  const ci=Math.round(focusX/GAP), cj=Math.round(focusY/GAP);
  do{
    if(rng()<0.5){ const i=ci+randInt(-7,7); x=nX(i,cj)+ROAD/2; y=focusY+rand(-1050,1050); }
    else        { const j=cj+randInt(-7,7); y=nY(ci,j)+ROAD/2; x=focusX+rand(-1050,1050); }
    tries++;
  } while(inBuilding(x,y,16) && tries<30);
  return {x,y};
}
function reached(p,r){ const px=mode==="car"?car.x:ped.x, py=mode==="car"?car.y:ped.y; return Math.hypot(px-p.x,py-p.y)<(r||30); }
function startMissionAt(){
  const px=mode==="car"?car.x:ped.x, py=mode==="car"?car.y:ped.y, r=Math.random();
  if(r<0.34){
    const d=roadPoint(), dd=Math.hypot(d.x-px,d.y-py);
    mission={type:"deliver",title:"DOSTAWA",target:d,timeLeft:clamp(dd/110+10,14,60),reward:Math.round(dd/3+60)};
  } else if(r<0.6){
    const a=roadPoint(), b=roadPoint();
    const dd=Math.hypot(a.x-px,a.y-py)+Math.hypot(b.x-a.x,b.y-a.y);
    mission={type:"taxi",title:"TAXI",stages:[a,b],stageIndex:0,target:a,timeLeft:clamp(dd/100+12,18,75),reward:Math.round(dd/3+90)};
  } else if(r<0.8){
    heat=3;
    mission={type:"getaway",title:"UCIECZKA",timeLeft:38,reward:300};
  } else {
    const g=3+(Math.random()*3|0);
    mission={type:"wreck",title:"ROZBÓJ",goal:g,progress:0,timeLeft:18+g*7,reward:120+g*45};
  }
  showBigMsg(mission.title);
}
function completeMission(){ money+=mission.reward; stats.missionsDone++; showBigMsg(`MISJA +$${mission.reward}`); mission=null; saveGame(); }
function updateMission(dt){
  if(mission){
    mission.timeLeft-=dt;
    if(mission.timeLeft<=0){ showBigMsg("MISJA OBLANA"); mission=null; return; }
    if(mission.type==="deliver"){ if(reached(mission.target)) completeMission(); }
    else if(mission.type==="taxi"){
      if(reached(mission.target)){
        if(mission.stageIndex===0){ mission.stageIndex=1; mission.target=mission.stages[1]; showBigMsg("PASAŻER WSIADŁ"); }
        else completeMission();
      }
    }
    else if(mission.type==="getaway"){ if(stars===0) completeMission(); }
    else if(mission.type==="wreck"){ if(mission.progress>=mission.goal) completeMission(); }
  } else {
    if(!pickup) pickup=roadPoint();
    if(reached(pickup,34)){ pickup=null; startMissionAt(); }
  }
}
function marker(x,y,r1,col){
  ctx.save();
  ctx.fillStyle=col+"30"; ctx.beginPath(); ctx.arc(x,y,40,0,7); ctx.fill();
  ctx.strokeStyle=col; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(x,y,r1,0,7); ctx.stroke();
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y,4,0,7); ctx.fill();
  ctx.restore();
}
function drawMissionWorld(){
  const pr=16+6*Math.abs(Math.sin(performance.now()/260));
  if(mission){ if(mission.type==="deliver"||mission.type==="taxi") marker(mission.target.x,mission.target.y,pr,"#ffd23b"); }
  else if(pickup) marker(pickup.x,pickup.y,pr,"#39d98a");
}
function objectiveText(m){
  if(m.type==="deliver") return "Dojedź do celu";
  if(m.type==="taxi")    return m.stageIndex===0?"Odbierz pasażera":"Dowieź pasażera";
  if(m.type==="getaway") return "Zgub policję";
  if(m.type==="wreck")   return `Rozbij auta: ${m.progress}/${m.goal}`;
  return "";
}
function drawMissionHUD(){
  if(!mission){ missionEl.style.opacity="0"; return; }
  missionEl.style.opacity="1";
  missionEl.querySelector(".mt").textContent=mission.title;
  missionEl.querySelector(".mo").textContent=objectiveText(mission);
  const s=Math.max(0,Math.ceil(mission.timeLeft));
  missionEl.querySelector(".mtime").textContent=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
let lastMoney=-1;
function drawMoney(){ if(money!==lastMoney){ lastMoney=money; moneyEl.textContent="$"+money; } }

