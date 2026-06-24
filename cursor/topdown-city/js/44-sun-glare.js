/* TOPDOWN CITY — 44-sun-glare.js — procedural solar reflections (SunGlare lib) */

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

function glassWeight(b){
  if(b.type==="tower"){
    const s=b.style||"";
    if(s==="glass"||s==="darkglass") return 1.0;
    if(s==="gridglass"||s==="banded") return 0.72;
    return 0.35;
  }
  if(b.type==="blok") return 0.28;
  if(b.mega) return 0.55;
  return 0;
}

function drawBuildingSunGlints(ox,oy,st,sg){
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  let budget=10;

  const glintBuilding=(b)=>{
    if(budget<=0) return;
    const gw=glassWeight(b);
    if(gw<0.2) return;
    if(b.x>ox+VW+120||b.x+b.w<ox-120||b.y>oy+VH+180||b.y+b.h<oy-120) return;
    const [vx,vy]=leanVec(b);
    const base=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
    const roof=base.map(p=>[p[0]+vx,p[1]+vy]);
    for(const[ai,ci,nx,ny]of[[0,1,0,-1],[1,2,1,0],[2,3,0,1],[3,0,-1,0]]){
      if(nx*vx+ny*vy>=0) continue;
      const align=sg.faceAlignment(nx,ny,st);
      if(align<0.22) continue;
      const a=base[ai], cc=base[ci], ar=roof[ai], cr=roof[ci];
      sg.drawFacadeGlint(ctx,[a,cc,cr,ar],st,gw*align,nx,ny);
      budget--;
    }
  };

  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const L=getLot(i,j);
    for(const b of L.buildings) glintBuilding(b);
  }
  const seen=new Set();
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++) eachMegaNearCell(i,j,m=>{
    if(seen.has(m.id)) return;
    seen.add(m.id);
    glintBuilding(m.building);
  });
}

function drawSunGlintsWorld(ox,oy){
  const sg=getSunGlare();
  if(!sg) return;
  const st=sunGlareState();
  if(!st.active) return;

  drawBuildingSunGlints(ox,oy,st,sg);

  if(typeof lakeScore==="function"&&st.intensity>0.22)
    sg.drawWaterGlints(ctx,ox,oy,VW,VH,lakeScore,st,52);
  if(typeof riverScore==="function"&&st.intensity>0.22)
    sg.drawWaterGlints(ctx,ox,oy,VW,VH,riverScore,st,44);

  // Wet-road sun streaks removed — they drew visible bands on asphalt.
}

function drawSunFlareScreen(){
  const sg=getSunGlare();
  if(!sg) return;
  const st=sunGlareState();
  if(!st.active||(st.weatherI||0)>0.18) return;
  sg.drawFlare(ctx,VW,VH,st);
}

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
