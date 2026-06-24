/* TOPDOWN CITY — 51-perf-profiler.js — in-game frame profiler (F3) */

let perfShow=false, perfEnabled=false;
const perfCur={}, perfAcc={}, perfPeak={}, perfTicks={};
let perfFrame=0, perfT0=0, perfStack=[];

function perfBegin(name){
  if(!perfEnabled) return;
  perfStack.push({name, t:performance.now()});
}
function perfEnd(name){
  if(!perfEnabled||!perfStack.length) return;
  const top=perfStack[perfStack.length-1];
  if(top.name!==name){ perfStack.pop(); return; }
  perfStack.pop();
  const d=performance.now()-top.t;
  perfCur[name]=(perfCur[name]||0)+d;
  perfPeak[name]=Math.max(perfPeak[name]||0, d);
}
function perfFrameStart(){
  if(!perfEnabled) return;
  perfT0=performance.now();
  perfStack.length=0;
}
function perfFrameEnd(){
  if(!perfEnabled) return;
  perfCur.total=(perfCur.total||0)+(performance.now()-perfT0);
  perfFrame++;
  for(const k in perfCur){
    perfAcc[k]=(perfAcc[k]||0)+perfCur[k];
    perfTicks[k]=(perfTicks[k]||0)+1;
  }
  const snap={};
  for(const k in perfCur) snap[k]=perfCur[k];
  perfCurSnap=snap;
  for(const k in perfCur) delete perfCur[k];
}
let perfCurSnap={};

function perfAvg(name){
  const n=perfTicks[name]||perfFrame||1;
  return (perfAcc[name]||0)/n;
}

function drawPerfOverlay(){
  if(!perfShow) return;
  const ctx2=typeof ctx!=="undefined"?ctx:null;
  if(!ctx2) return;
  ctx2.save();
  ctx2.setTransform(1,0,0,1,0,0);
  const lines=["PERF F3=panel  Shift+F3=sample"];
  const keys=perfEnabled
    ? Object.keys(perfCurSnap).filter(k=>k!=="total").sort((a,b)=>(perfCurSnap[b]||0)-(perfCurSnap[a]||0))
    : Object.keys(perfAcc).filter(k=>k!=="total").sort((a,b)=>perfAvg(b)-perfAvg(a));
  const total=perfEnabled?(perfCurSnap.total||0):perfAvg("total");
  for(const k of keys.slice(0,14)){
    const ms=perfEnabled?(perfCurSnap[k]||0):perfAvg(k);
    const pk=perfPeak[k]||0;
    lines.push(`${k.padEnd(14)} ${ms.toFixed(2)} ms  pk ${pk.toFixed(1)}`);
  }
  lines.push(`total          ${total.toFixed(2)} ms`);
  const lh=13, pad=8, w=210, h=pad*2+lines.length*lh;
  ctx2.fillStyle="rgba(8,12,18,0.82)";
  ctx2.fillRect(8,8,w,h);
  ctx2.strokeStyle="rgba(120,180,255,0.45)"; ctx2.lineWidth=1;
  ctx2.strokeRect(8.5,8.5,w-1,h-1);
  ctx2.font="11px monospace";
  ctx2.fillStyle="#c8e0ff";
  for(let i=0;i<lines.length;i++) ctx2.fillText(lines[i], 14, 22+i*lh);
  ctx2.restore();
}

function togglePerfPanel(){
  perfShow=!perfShow;
}
function resetPerfStats(){
  for(const k in perfAcc) delete perfAcc[k];
  for(const k in perfPeak) delete perfPeak[k];
  for(const k in perfTicks) delete perfTicks[k];
  perfFrame=0;
  perfCurSnap={};
}

window.addEventListener("keydown", e=>{
  if(e.key==="F3"){
    e.preventDefault();
    if(e.shiftKey){ perfEnabled=!perfEnabled; if(!perfEnabled) resetPerfStats(); }
    else togglePerfPanel();
  }
});

Game.register({
  id:"perf-profiler",
  order:99,
  drawWorldOverlay(){ drawPerfOverlay(); },
});
