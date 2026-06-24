/* TOPDOWN CITY — 17-effects.js */
/* ---------- blood decals ---------- */
const blood=[]; const BLOOD_MAX=680;
function stainCharacter(ent, amount){
  if(!ent) return;
  ent.bloodStain=Math.min(1, (ent.bloodStain||0)+amount*0.38);
  ent.bloodPulse=Math.min(1, (ent.bloodPulse||0)+amount*0.55);
}
function spawnBlood(x,y,dx,dy,amount,hitAng){
  const amt=Math.max(0.15, amount||0.3);
  const spd=Math.hypot(dx,dy);
  const base=spd>12?Math.atan2(dy,dx):(hitAng!=null?hitAng:rng()*6.283);

  blood.push({x,y, rx:rand(4.5,10)*amt, ry:rand(3.5,8)*amt, rot:rng()*6.283,
    a:rand(0.62,0.9), kind:"pool", life:rand(55,95)});

  const n=(3+amt*10)|0;
  for(let k=0;k<n;k++){
    const dist=rand(3, 40*amt);
    const ang=base+(rng()-0.5)*(1.15-amt*0.12);
    blood.push({x:x+Math.cos(ang)*dist, y:y+Math.sin(ang)*dist,
      rx:rand(0.9,3.4), ry:rand(0.5,2.1), rot:ang+rng()*0.7,
      a:rand(0.42,0.76), kind:"drop", life:rand(40,70)});
  }
  const sn=(2+amt*6)|0;
  for(let k=0;k<sn;k++){
    const ang=base+(rng()-0.5)*0.5;
    const len=rand(7, 30*amt);
    blood.push({x:x+Math.cos(ang)*rand(0,7), y:y+Math.sin(ang)*rand(0,7),
      rx:len, ry:rand(0.7,2.4), rot:ang,
      a:rand(0.32,0.62), kind:"streak", life:rand(35,58)});
  }
  while(blood.length>BLOOD_MAX) blood.shift();
}
function updateBlood(dt){
  for(let i=blood.length-1;i>=0;i--){
    const b=blood[i];
    if(b.life==null) continue;
    b.life-=dt;
    if(b.life<=0) blood.splice(i,1);
  }
}
function drawBloodBlob(b, fade){
  const a=b.a*fade;
  if(b.kind==="streak"){
    ctx.fillStyle=`rgba(92,6,10,${(a*0.92).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(0,0,b.rx,b.ry,0,0,7); ctx.fill();
    ctx.fillStyle=`rgba(128,12,16,${(a*0.55).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(b.rx*0.22,0,b.rx*0.38,b.ry*0.72,0,0,7); ctx.fill();
    return;
  }
  if(b.kind==="pool"){
    const rad=Math.max(b.rx,b.ry);
    const g=ctx.createRadialGradient(0,0,0,0,0,rad);
    g.addColorStop(0,`rgba(58,4,8,${(a*0.96).toFixed(3)})`);
    g.addColorStop(0.45,`rgba(108,10,14,${(a*0.84).toFixed(3)})`);
    g.addColorStop(0.78,`rgba(128,14,18,${(a*0.42).toFixed(3)})`);
    g.addColorStop(1,"rgba(128,14,18,0)");
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.ellipse(0,0,b.rx,b.ry,0,0,7); ctx.fill();
    return;
  }
  ctx.fillStyle=`rgba(118,10,14,${(a*0.88).toFixed(3)})`;
  ctx.beginPath(); ctx.ellipse(0,0,b.rx||b.r,b.ry||b.r,0,0,7); ctx.fill();
  ctx.fillStyle=`rgba(72,6,10,${(a*0.45).toFixed(3)})`;
  ctx.beginPath(); ctx.ellipse(b.rx*0.15||0.4,b.ry*0.1||0.3,(b.rx||b.r)*0.55,(b.ry||b.r)*0.45,0,0,7); ctx.fill();
}
function drawBlood(ox,oy){
  for(const b of blood){
    if(b.x<ox-36||b.x>ox+VW+36||b.y<oy-36||b.y>oy+VH+36) continue;
    const fade=b.life!=null?clamp(b.life/80,0,1):1;
    ctx.save();
    ctx.translate(b.x,b.y);
    ctx.rotate(b.rot||0);
    drawBloodBlob(b,fade);
    ctx.restore();
  }
}
