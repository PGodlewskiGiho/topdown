/* TOPDOWN CITY — 53-ped-gore.js */
/* Flying body parts when pedestrians are killed */

const pedGore=[];
const PED_GORE_MAX=140;

function spawnPedGore(p, kx, ky, severity){
  if(!p) return;
  severity=clamp(severity||0.5, 0, 1.6);
  if(severity<0.18 && rng()>severity*1.4) return;
  if(!p.lostParts) p.lostParts={};
  const baseAng=Math.atan2(ky||0, kx||0);
  const hasDir=Math.hypot(kx||0, ky||0)>0.01;
  const skin=p.skin||"#e8b888";
  const shirt=p.shirt||p.color||"#3a6ea5";
  const pants=p.pants||"#2a3444";
  const hair=p.hair||"#3a2a18";
  const defs=[
    {id:"head", kind:"head", col:skin, hair, w:9, h:9, ch:0.22+severity*0.32},
    {id:"arm_l", kind:"limb", col:skin, w:9, h:4.5, ch:0.28+severity*0.28},
    {id:"arm_r", kind:"limb", col:skin, w:9, h:4.5, ch:0.28+severity*0.28},
    {id:"leg", kind:"leg", col:pants, shoe:p.shoes||"#1a1a20", w:6, h:13, ch:0.30+severity*0.26},
    {id:"torso", kind:"chunk", col:shirt, w:15, h:10, ch:0.18+severity*0.22},
  ];
  if(p.hat) defs.push({id:"hat", kind:"hat", col:p.hatColor||"#444", w:11, h:6, ch:0.55+severity*0.2});
  if(p.prop) defs.push({id:"prop", kind:"prop", col:p.propColor||"#5a5048", w:10, h:8, ch:0.35+severity*0.15});
  let spawned=0;
  for(const d of defs){
    if(p.lostParts[d.id]) continue;
    if(rng()>d.ch*severity) continue;
    p.lostParts[d.id]=true;
    const ang=(hasDir?baseAng:((p.a||0)+Math.PI))+(rng()-0.5)*(1.4+severity*0.5);
    const sp=rand(70, 240)*(0.55+severity*0.65);
    pedGore.push({
      x:p.x+rand(-7,7), y:p.y+rand(-7,7),
      vx:Math.cos(ang)*sp+(kx||0)*0.25, vy:Math.sin(ang)*sp+(ky||0)*0.25,
      a:rng()*6.283, va:(rng()-0.5)*14,
      t:0, life:rand(3.8, 8.5),
      kind:d.kind, col:d.col, hair:d.hair, shoe:d.shoe, w:d.w, h:d.h,
    });
    spawned++;
    spawnBlood(p.x,p.y,Math.cos(ang),Math.sin(ang),0.22+severity*0.18, ang);
  }
  if(spawned>0){
    stainCharacter(p, 0.6+severity*0.5);
    spawnBlood(p.x,p.y,kx||0,ky||0,0.55+severity*0.45, baseAng);
  }
  while(pedGore.length>PED_GORE_MAX) pedGore.shift();
}

function updatePedGore(dt){
  for(let i=pedGore.length-1;i>=0;i--){
    const g=pedGore[i];
    g.t+=dt;
    g.x+=g.vx*dt;
    g.y+=g.vy*dt;
    const f=1-Math.min(0.92, 2.8*dt);
    g.vx*=f; g.vy*=f;
    g.vy+=180*dt;
    g.a+=g.va*dt;
    g.va*=0.96;
    if(g.t>g.life) pedGore.splice(i,1);
  }
}

function drawPedGorePart(g){
  const w=g.w||10, h=g.h||6;
  if(g.kind==="head"){
    ctx.fillStyle=g.col;
    ctx.beginPath(); ctx.arc(0,0,w*0.48,0,7); ctx.fill();
    if(g.hair){
      ctx.fillStyle=g.hair;
      ctx.beginPath(); ctx.arc(0,0,w*0.54,0,7); ctx.fill();
      ctx.fillStyle=g.col;
      ctx.beginPath(); ctx.arc(0,0,w*0.44,0,7); ctx.fill();
    }
    ctx.fillStyle="#6a0808";
    ctx.beginPath(); ctx.arc(w*0.12,0,w*0.22,0,7); ctx.fill();
    ctx.fillStyle="#1a1410";
    ctx.beginPath(); ctx.arc(w*0.2,-h*0.08,w*0.06,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(w*0.2,h*0.08,w*0.06,0,7); ctx.fill();
  } else if(g.kind==="limb"){
    ctx.fillStyle=g.col;
    ctx.beginPath(); ctx.ellipse(0,0,w*0.5,h*0.35,0.2,0,7); ctx.fill();
    ctx.fillStyle="#8a1018";
    ctx.beginPath(); ctx.ellipse(-w*0.38,0,h*0.35,h*0.28,0,0,7); ctx.fill();
  } else if(g.kind==="leg"){
    ctx.fillStyle=g.col;
    ctx.beginPath(); ctx.ellipse(0,-h*0.12,w*0.42,h*0.55,0.1,0,7); ctx.fill();
    ctx.fillStyle=g.shoe||"#1a1a20";
    ctx.beginPath(); ctx.ellipse(0,h*0.34,w*0.44,h*0.22,0,0,7); ctx.fill();
    ctx.fillStyle="#8a1018";
    ctx.beginPath(); ctx.ellipse(0,-h*0.42,w*0.3,h*0.2,0,0,7); ctx.fill();
  } else if(g.kind==="hat"){
    ctx.fillStyle=g.col;
    ctx.beginPath(); ctx.arc(0,0,w*0.5,0,7); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,.2)";
    ctx.fillRect(w*0.2,-h*0.5,w*0.55,h*0.18);
  } else if(g.kind==="prop"){
    ctx.fillStyle=g.col;
    ctx.beginPath(); ctx.roundRect(-w*0.5,-h*0.5,w,h,2); ctx.fill();
  } else {
    ctx.fillStyle=g.col;
    ctx.beginPath(); ctx.ellipse(0,0,w*0.5,h*0.38,0.15,0,7); ctx.fill();
    ctx.fillStyle="#8a1018";
    ctx.beginPath(); ctx.ellipse(-w*0.2,0,w*0.22,h*0.3,0,0,7); ctx.fill();
  }
}

function drawPedGore(ox,oy){
  for(const g of pedGore){
    if(g.x<ox-40||g.x>ox+VW+40||g.y<oy-40||g.y>oy+VH+40) continue;
    const fade=g.t>g.life-0.8?Math.max(0,(g.life-g.t)/0.8):1;
    ctx.save();
    ctx.globalAlpha=fade;
    ctx.translate(g.x,g.y);
    ctx.rotate(g.a);
    ctx.fillStyle="rgba(0,0,0,.22)";
    ctx.beginPath(); ctx.ellipse(1,2,(g.w||10)*0.35,(g.h||6)*0.25,0,0,7); ctx.fill();
    drawPedGorePart(g);
    ctx.restore();
    ctx.globalAlpha=1;
  }
}
