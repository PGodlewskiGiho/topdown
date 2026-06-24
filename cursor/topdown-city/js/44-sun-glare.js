/* TOPDOWN CITY — 44-sun-glare.js — subtle world glints only (no screen flare) */

let _sunGlare=null;

function getSunGlare(){
  if(_sunGlare) return _sunGlare;
  if(typeof SunGlare==="undefined") return null;
  _sunGlare=new SunGlare();
  return _sunGlare;
}

function sunGlareState(){
  const sg=getSunGlare();
  if(!sg) return {active:false,intensity:0};
  const N=typeof nightFactor==="function"?nightFactor(gameHour):0;
  return sg.computeState({
    hour:gameHour,
    weatherI:typeof weatherI!=="undefined"?weatherI:0,
    night:N,
    sunShadow:typeof sunShadow==="function"?sunShadow:null,
  });
}

function drawSunGlintsWorld(ox,oy){
  const sg=getSunGlare();
  if(!sg) return;
  const st=sunGlareState();
  if(!st.active||st.intensity<0.18||(st.weatherI||0)>0.25) return;
  if(typeof lakeScore==="function")
    sg.drawWaterGlints(ctx,ox,oy,VW,VH,lakeScore,st,58);
  if(typeof riverScore==="function")
    sg.drawWaterGlints(ctx,ox,oy,VW,VH,riverScore,st,50);
}

function drawSunFlareScreen(){}

Game.register({
  id:"sun-glare",
  order:44,
  update(dt){
    if(typeof gamePhase!=="undefined"&&gamePhase!=="playing") return;
    getSunGlare()?.update(dt);
  },
  drawWorldOverlay(ox,oy){
    drawSunGlintsWorld(ox,oy);
  },
});
