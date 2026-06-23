/* TOPDOWN CITY — 17-effects.js */
/* ---------- blood decals ---------- */
const blood=[]; const BLOOD_MAX=520;
function spawnBlood(x,y,dx,dy,amount){
  blood.push({x,y,r:rand(5,10)*amount, a:rand(0.55,0.82)});           // pool
  const base=Math.atan2(dy,dx), n=(4+amount*7)|0;
  for(let k=0;k<n;k++){
    const dist=rand(4,42*amount), ang=base+(rng()-0.5)*0.9;
    blood.push({x:x+Math.cos(ang)*dist, y:y+Math.sin(ang)*dist, r:rand(1.4,4.6), a:rand(0.4,0.7)}); // droplets
  }
  while(blood.length>BLOOD_MAX) blood.shift();
}
function drawBlood(ox,oy){
  for(const b of blood){
    if(b.x<ox-20||b.x>ox+VW+20||b.y<oy-20||b.y>oy+VH+20) continue;
    ctx.fillStyle=`rgba(132,9,13,${b.a})`;
    ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill();
  }
}

