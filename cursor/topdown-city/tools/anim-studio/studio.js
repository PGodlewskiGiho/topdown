/* TOPDOWN Anim Studio — browser preview + strip enhance/export */
(function(){
"use strict";

const DIR_NAMES=["E","SE","S","SW","W","NW","N","NE"];
const cv=document.getElementById("cv");
const ctx=cv.getContext("2d");
ctx.imageSmoothingEnabled=false;

const state={
  mode:"strip",
  sheet:null,
  fw:128, fh:128, dirs:8, fpd:5,
  attackStart:4,
  walkFrames:4,
  attackFrames:1,
  step:0.11,
  clip:"walk",
  dir:2,
  playing:false,
  attackT:0,
  walkT:0,
  selFrame:0,
  name:"sprite",
};

function $(id){ return document.getElementById(id); }

function bind(){
  $("mode").onchange=e=>{ state.mode=e.target.value; updateCli(); };
  $("file").onchange=e=>loadFile(e.target.files[0]);
  ["fw","fh","dirs","fpd","attackStart","attackOut","step"].forEach(id=>{
    $(id).oninput=e=>syncNums();
  });
  $("clip").onchange=e=>{ state.clip=e.target.value; draw(); };
  $("dir").oninput=e=>{ state.dir=+e.target.value; $("dirLabel").textContent=DIR_NAMES[state.dir]||state.dir; draw(); };
  $("play").onclick=()=>{ state.playing=!state.playing; };
  $("attack").onclick=()=>{ state.attackT=0.36; state.clip="attack"; };
  $("enhance").onclick=enhanceStrip;
  $("exportStrip").onclick=exportStrip;
  $("exportMeta").onclick=exportMeta;
  $("loadSampleBear").onclick=()=>loadUrl("../../assets/bears/bear-brown.png","bear-brown",{
    fw:128,fh:128,dirs:8,fpd:5,attackStart:4,
  });
  $("loadSamplePunch").onclick=loadPunchPreview;
  syncNums();
  updateCli();
  requestAnimationFrame(tick);
}

function syncNums(){
  state.fw=+$("fw").value||128;
  state.fh=+$("fh").value||128;
  state.dirs=+$("dirs").value||8;
  state.fpd=+$("fpd").value||5;
  state.attackStart=+$("attackStart").value||4;
  state.walkFrames=Math.min(state.attackStart, state.fpd-1);
  state.step=+$("step").value||0.11;
  buildTimeline();
  draw();
}

function loadFile(file){
  if(!file) return;
  const url=URL.createObjectURL(file);
  loadUrl(url, file.name.replace(/\.\w+$/,""), null);
}

function loadUrl(url, name, opts){
  const im=new Image();
  im.onload=()=>{
    state.sheet=im;
    state.name=name||"sprite";
    if(opts){
      Object.assign(state, opts);
      $("fw").value=state.fw;
      $("fh").value=state.fh;
      $("dirs").value=state.dirs;
      $("fpd").value=state.fpd;
      $("attackStart").value=state.attackStart;
    }
    state.attackFrames=Math.max(1, state.fpd-state.attackStart);
    syncNums();
  };
  im.onerror=()=>alert("Nie udało się wczytać obrazu: "+url);
  im.src=url;
}

function frameIndex(dir, local){
  return dir*state.fpd+local;
}

function getFrame(local){
  if(!state.sheet) return null;
  const i=frameIndex(state.dir, local);
  const c=document.createElement("canvas");
  c.width=state.fw; c.height=state.fh;
  const cx=c.getContext("2d");
  cx.imageSmoothingEnabled=false;
  cx.drawImage(state.sheet, i*state.fw, 0, state.fw, state.fh, 0, 0, state.fw, state.fh);
  return c;
}

function currentLocal(){
  if(state.clip==="attack"&&state.attackT>0){
    const n=state.attackFrames;
    const elapsed=0.36-state.attackT;
    const step=state.step;
    return state.attackStart+Math.min(n-1, Math.floor(elapsed/step));
  }
  if(state.clip==="idle") return 0;
  const wf=[0,1,2,3].filter(i=>i<state.walkFrames);
  const fi=wf[Math.floor(state.walkT/state.step)%wf.length]??0;
  return fi;
}

function draw(){
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle="#1a2030";
  ctx.fillRect(0,0,cv.width,cv.height);
  if(!state.sheet) return;
  const local=currentLocal();
  const i=frameIndex(state.dir, local);
  const sc=Math.min(cv.width/state.fw, cv.height/state.fh)*0.85;
  const dx=(cv.width-state.fw*sc)/2;
  const dy=(cv.height-state.fh*sc)/2;
  ctx.drawImage(state.sheet, i*state.fw,0,state.fw,state.fh, dx,dy,state.fw*sc,state.fh*sc);
  ctx.fillStyle="#9aa3b5";
  ctx.font="12px monospace";
  ctx.fillText(`dir ${DIR_NAMES[state.dir]} · frame ${local}/${state.fpd-1}`, 8, 16);
}

function tick(ts){
  if(!tick.t0) tick.t0=ts;
  const dt=Math.min(0.05,(ts-tick.last||ts)/1000||0.016);
  tick.last=ts;
  if(state.playing){
    if(state.attackT>0){
      state.attackT=Math.max(0,state.attackT-dt);
      if(state.attackT<=0) state.clip="walk";
    } else state.walkT+=dt;
    draw();
  }
  requestAnimationFrame(tick);
}

function crossfade(a,b,t){
  const c=document.createElement("canvas");
  c.width=a.width; c.height=a.height;
  const cx=c.getContext("2d");
  cx.globalAlpha=1-t; cx.drawImage(a,0,0);
  cx.globalAlpha=t; cx.drawImage(b,0,0);
  return c;
}

function nudgeCanvas(src, dx, dy){
  const c=document.createElement("canvas");
  c.width=src.width; c.height=src.height;
  const cx=c.getContext("2d");
  cx.drawImage(src, dx, dy);
  return c;
}

function enhanceStrip(){
  if(!state.sheet){ alert("Wczytaj najpierw strip PNG"); return; }
  const outFrames=+$("attackOut").value||4;
  const walk=state.walkFrames;
  const newFpd=walk+outFrames;
  const newSheet=document.createElement("canvas");
  newSheet.width=newFpd*state.fw*state.dirs;
  newSheet.height=state.fh;
  const nx=newSheet.getContext("2d");
  nx.imageSmoothingEnabled=false;

  for(let d=0; d<state.dirs; d++){
    const walkFr=[];
    for(let i=0;i<walk;i++) walkFr.push(getFrameAt(d,i));
    const atk=getFrameAt(d, state.attackStart);
    const seq=[
      crossfade(walkFr[walkFr.length-1], atk, 0.35),
      crossfade(walkFr[walkFr.length-1], atk, 0.70),
      nudgeCanvas(atk, 0, Math.round(state.fh*0.02)),
      crossfade(atk, walkFr[0], 0.45),
    ].slice(0,outFrames);
    for(let i=0;i<walk;i++) nx.drawImage(walkFr[i], (d*newFpd+i)*state.fw, 0);
    for(let j=0;j<outFrames;j++) nx.drawImage(seq[j], (d*newFpd+walk+j)*state.fw, 0);
  }

  const im=new Image();
  im.onload=()=>{
    state.sheet=im;
    state.fpd=newFpd;
    state.attackStart=walk;
    state.attackFrames=outFrames;
    $("fpd").value=newFpd;
    $("attackStart").value=walk;
    syncNums();
    alert(`Ulepszono: ${walk} walk + ${outFrames} attack = ${newFpd} klatek/kierunek`);
  };
  im.src=newSheet.toDataURL("image/png");
}

function getFrameAt(dir, local){
  const c=document.createElement("canvas");
  c.width=state.fw; c.height=state.fh;
  const cx=c.getContext("2d");
  cx.drawImage(state.sheet, (dir*state.fpd+local)*state.fw,0,state.fw,state.fh,0,0,state.fw,state.fh);
  return c;
}

function buildTimeline(){
  const el=$("timeline");
  el.innerHTML="";
  if(!state.sheet) return;
  for(let i=0;i<state.fpd;i++){
    const fr=getFrame(state.dir, i);
    if(!fr) continue;
    const wrap=document.createElement("div");
    wrap.className="thumb"+(i===state.selFrame?" sel":"");
    const tc=document.createElement("canvas");
    const sc=64/Math.max(state.fw,state.fh);
    tc.width=Math.round(state.fw*sc);
    tc.height=Math.round(state.fh*sc);
    tc.getContext("2d").drawImage(fr,0,0,tc.width,tc.height);
    wrap.appendChild(tc);
    const cap=document.createElement("div");
    cap.textContent="#"+i;
    cap.style.fontSize="10px";
    cap.style.textAlign="center";
    wrap.appendChild(cap);
    wrap.onclick=()=>{ state.selFrame=i; state.clip=i>=state.attackStart?"attack":"walk"; $("clip").value=state.clip; buildTimeline(); draw(); };
    el.appendChild(wrap);
  }
}

function exportStrip(){
  if(!state.sheet) return;
  const a=document.createElement("a");
  const c=document.createElement("canvas");
  c.width=state.sheet.naturalWidth; c.height=state.sheet.naturalHeight;
  c.getContext("2d").drawImage(state.sheet,0,0);
  a.href=c.toDataURL("image/png");
  a.download=state.name+"-enhanced.png";
  a.click();
}

function exportMeta(){
  const meta={
    frameWidth:state.fw,
    frameHeight:state.fh,
    directionCount:state.dirs,
    framesPerDirection:state.fpd,
    walkFrames:Array.from({length:state.walkFrames},(_,i)=>i),
    attackFrame:state.attackStart,
    attackFrames:state.attackFrames,
    attackFrameEnd:state.attackStart+state.attackFrames-1,
    attackStep:state.step,
    directions:["east","se","south","sw","west","nw","north","ne"].slice(0,state.dirs),
    anchorX:Math.round(state.fw/2),
    anchorY:state.fh-8,
    walkStep:state.step,
    variants:{custom:{file:state.name+"-enhanced.png"}},
    animStudio:true,
  };
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([JSON.stringify(meta,null,2)],{type:"application/json"}));
  a.download=state.name+"-meta.json";
  a.click();
}

function updateCli(){
  const mode=$("mode").value;
  const lines=mode==="layered"
    ? [
        "# GTA2 punch (warstwy) — po npm run gen:gta2:",
        "npm run gen:punch",
        "",
        "# analiza różnic klatek:",
        "python3 scripts/anim_studio.py analyze-punch male arms blue S",
      ]
    : [
        "# Strip (niedźwiedź / wildlife):",
        "npm run gen:bears",
        "python3 scripts/anim_studio.py enhance-strip assets/bears/bear-brown.png assets/bears/meta.json",
      ];
  $("cli").textContent=lines.join("\n");
}

async function loadPunchPreview(){
  const dir="S";
  const layers=["shoes/jeans","pants/jeans","arms/blue","torsos/blue","skins/medium"];
  const base="../../assets/people/gta2/parts/bodies/male/";
  const clips=["punch0","punch1","punch2","punch3","punch4","punch5","punch6","punch7"];
  const fw=48, fh=48;
  const sheet=document.createElement("canvas");
  sheet.width=fw*clips.length;
  sheet.height=fh;
  const sx=sheet.getContext("2d");
  let loaded=0;
  for(let ci=0; ci<clips.length; ci++){
    const comp=document.createElement("canvas");
    comp.width=fw; comp.height=fh;
    const cx=comp.getContext("2d");
    let layersOk=0;
    for(const layer of layers){
      const path=base+layer+"/"+clips[ci]+"/"+dir+".png";
      await new Promise(res=>{
        const im=new Image();
        im.onload=()=>{ cx.drawImage(im,0,0); layersOk++; res(); };
        im.onerror=()=>res();
        im.src=path;
      });
    }
    if(layersOk) sx.drawImage(comp, ci*fw, 0);
    loaded++;
  }
  if(!loaded){ alert("Brak warstw punch — uruchom: npm run gen:gta2 && npm run gen:punch"); return; }
  const im=new Image();
  im.onload=()=>{
    state.sheet=im;
    state.name="punch-preview";
    state.fw=48; state.fh=48; state.dirs=1; state.fpd=clips.length;
    state.walkFrames=0; state.attackStart=0; state.attackFrames=clips.length;
    $("fw").value=48; $("fh").value=48; $("dirs").value=1;
    $("fpd").value=clips.length; $("attackStart").value=0;
    $("mode").value="layered";
    syncNums();
  };
  im.src=sheet.toDataURL("image/png");
}

bind();
})();
