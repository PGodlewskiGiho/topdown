/* TOPDOWN CITY — 54-ragdoll.js */
/* 2D ragdoll physics for downed pedestrians */

function enterPedRagdoll(p, kx, ky){
  if(!p) return;
  const spd=Math.hypot(kx||0, ky||0);
  const impactA=spd>8?Math.atan2(ky,kx):(p.a||0)+Math.PI;
  const bodyA=impactA+(rng()-0.5)*0.55;
  p.a=bodyA;
  const kick=clamp(spd/120, 0.25, 1.4);
  p.ragdoll={
    bodyA,
    bodyVa:(rng()-0.5)*10+kick*6,
    head:(rng()-0.5)*0.6,
    headV:(rng()-0.5)*16-ky*0.04,
    armL:0.75+rng()*1.1,
    armLV:(rng()-0.5)*18-ky*0.06,
    armR:-0.65+rng()*0.9,
    armRV:(rng()-0.5)*18+ky*0.06,
    legL:0.45+rng()*0.85,
    legLV:(rng()-0.5)*14+kx*0.03,
    legR:-0.35+rng()*0.75,
    legRV:(rng()-0.5)*14-kx*0.03,
    tumble:spd>55?1:spd>20?0.45:0,
    settle:0,
  };
}

function _ragJoint(rd, key, vKey, target, stiff, damp, dt){
  const ang=rd[key], va=rd[vKey];
  const acc=(target-ang)*stiff-va*damp;
  rd[vKey]=(va+acc*dt)*(1-Math.min(0.9,5*dt));
  rd[key]=ang+rd[vKey]*dt;
}

function updatePedRagdoll(p, dt){
  const rd=p.ragdoll;
  if(!rd) return;
  p.x+=p.vx*dt; p.y+=p.vy*dt;
  const slide=Math.hypot(p.vx,p.vy);
  const f=1-Math.min(0.9,2.2*dt);
  p.vx*=f; p.vy*=f;
  rd.settle=Math.min(1, rd.settle+dt*(0.28+slide*0.006));
  const s=rd.settle, stiff=6+s*24, damp=5+s*4;
  _ragJoint(rd,"legL","legLV", 0.85+s*0.25, stiff, damp, dt);
  _ragJoint(rd,"legR","legRV",-0.7-s*0.2, stiff, damp, dt);
  _ragJoint(rd,"armL","armLV", 1.05+s*0.35, stiff*0.9, damp, dt);
  _ragJoint(rd,"armR","armRV",-0.95-s*0.25, stiff*0.9, damp, dt);
  _ragJoint(rd,"head","headV", s*0.12, stiff*0.7, damp*0.85, dt);
  if(slide>18||rd.tumble>0.04){
    rd.bodyVa+=(slide*0.028-rd.bodyVa)*dt*4.5;
    rd.bodyA+=rd.bodyVa*dt;
    p.a=rd.bodyA;
    rd.tumble=Math.max(0, rd.tumble-dt*0.75);
  }
}
