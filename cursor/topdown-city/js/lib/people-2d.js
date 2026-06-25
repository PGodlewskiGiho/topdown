/* people-2d.js — articulated top-down humans (MIT, no deps) */
(function(global){
"use strict";

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const BUILD=20260706;

function normHex(col, fb){
  fb=fb||"#808080";
  if(col==null||typeof col!=="string") return fb;
  let h=col.trim();
  if(!h) return fb;
  if(!h.startsWith("#")) h="#"+h;
  if(/^#[0-9a-fA-F]{3}$/.test(h)) return "#"+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
  if(/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
  return fb;
}
function shade(hex, amt){
  hex=normHex(hex);
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  if(Math.abs(amt)>1){
    const d=clamp(amt|0,-48,48);
    r=clamp(r+d,0,255); g=clamp(g+d,0,255); b=clamp(b+d,0,255);
  } else {
    const t=clamp(Math.abs(amt),0,1), f=amt>=0?255:0;
    r=clamp((r+(f-r)*t)|0,0,255);
    g=clamp((g+(f-g)*t)|0,0,255);
    b=clamp((b+(f-b)*t)|0,0,255);
  }
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

const BUILD_MOD={
  slim:{sw:0.84,hip:0.88,torso:0.96,leg:0.94,arm:0.92,head:0.94,swing:1.06},
  average:{sw:1.00,hip:1.00,torso:1.00,leg:1.00,arm:1.00,head:1.00,swing:1.00},
  athletic:{sw:1.04,hip:0.96,torso:1.02,leg:1.04,arm:1.06,head:0.98,swing:1.10},
  stocky:{sw:1.10,hip:1.12,torso:1.08,leg:1.02,arm:1.04,head:1.02,swing:0.94},
  hardy:{sw:1.14,hip:1.16,torso:1.12,leg:1.06,arm:1.08,head:1.04,swing:0.90},
};
const AGE_MOD={
  teen:{torso:0.94,leg:0.96,head:0.90,swing:1.16,hunch:0},
  young:{torso:0.98,leg:0.98,head:0.96,swing:1.08,hunch:0},
  adult:{torso:1.00,leg:1.00,head:1.00,swing:1.00,hunch:0},
  middle:{torso:0.98,leg:0.98,head:0.96,swing:0.92,hunch:0.04},
  senior:{torso:0.94,leg:0.94,head:0.92,swing:0.78,hunch:0.10},
};

function resolveDNA(p){
  const base=(p.r||9)/9;
  const hm=p.height||1;
  const bm=BUILD_MOD[p.build]||BUILD_MOD.average;
  const am=AGE_MOD[p.age]||AGE_MOD.adult;
  const fem=p.body==="female", hardy=p.body==="hardy";
  const vs=p._visSeed!=null?((p._visSeed%997)/997-0.5)*0.12:0;
  const s=base*hm*(1+vs);
  return {
    s,
    sw:s*(fem?8.8:hardy?11.2:9.8)*bm.sw,
    hip:s*(fem?7.6:hardy?10.4:8.8)*bm.hip,
    torso:s*10.2*bm.torso*am.torso,
    thigh:s*5.2*bm.leg*am.leg,
    calf:s*4.8*bm.leg*am.leg,
    foot:s*2.6,
    ua:s*4.2*bm.arm,
    fa:s*3.8*bm.arm,
    hand:s*1.8,
    headW:s*(fem?6.6:7.2)*bm.head*am.head,
    headH:s*(fem?7.8:8.4)*bm.head*am.head,
    swing:(bm.swing||1)*(am.swing||1),
    hunch:(am.hunch||0)+(p.archetypeId==="city_elder"?0.06:0),
    fem, hardy, shorts:!!p.shorts,
    skin:normHex(p.skin,"#e8b888"),
    shirt:normHex(p.shirt||p.color,"#3a6ea5"),
    pants:normHex(p.pants,"#2a3444"),
    shoe:normHex(p.shoes,shade(p.pants||"#2a3444",-40)),
    hair:p.hair!=null?normHex(p.hair,"#3a2a18"):null,
    hairStyle:p.hairStyle||(p.hair==null?"bald":"short"),
    beard:p.beard||"none",
    hat:p.hat, hatC:normHex(p.hatColor,"#444"),
    shirtStyle:p.shirtStyle||"tee",
    accessory:p.accessory,
    scarfC:p.scarfColor,
    prop:p.prop, propC:p.propColor,
  };
}

function limb(c,x,y,len,ang,w,col){
  c.save(); c.translate(x,y); c.rotate(ang);
  c.fillStyle=col;
  c.beginPath(); c.roundRect(0,-w*0.5,len,w,w*0.38); c.fill();
  c.restore();
  return {x:x+Math.cos(ang)*len, y:y+Math.sin(ang)*len};
}

function block(c,x,y,w,h,ang,col,rad){
  c.save(); c.translate(x,y); c.rotate(ang);
  c.fillStyle=col;
  c.beginPath(); c.roundRect(-w*0.5,-h*0.5,w,h,rad||h*0.22); c.fill();
  c.restore();
}

function walkPhase(p,dna){
  const mv=Math.hypot(p.vx||0,p.vy||0);
  const t=p.previewT!=null?p.previewT:performance.now()*0.001;
  const ph=mv>5?t*14*dna.swing:t*2.8;
  const s=Math.sin(ph), c=Math.cos(ph);
  return {
    ph, s, c,
    lTh:0.55*s+0.15, lKn:0.45*s+0.55, lAn:0.25*s+0.1,
    rTh:-0.55*s+0.15, rKn:-0.45*s+0.55, rAn:-0.25*s+0.1,
    lUa:-0.35*s-0.45, lEl:-0.2*s-0.25,
    rUa:0.35*s-0.45, rEl:0.2*s-0.25,
  };
}

function paintBlood(c,p,down,dna){
  const stain=clamp(p.bloodStain||0,0,1), pulse=clamp(p.bloodPulse||0,0,1);
  if(stain<0.02&&pulse<0.02) return;
  c.save(); c.globalCompositeOperation="multiply"; c.globalAlpha=0.16+stain*0.4+pulse*0.2;
  c.fillStyle="#8a1018";
  if(down) block(c,dna.torso*0.15,0,dna.torso*1.1,dna.sw*1.1,0.08,"#8a1018",3);
  else block(c,dna.torso*0.2,0,dna.torso*0.7,dna.sw*0.9,0.1,"#8a1018",3);
  c.restore();
}

function drawHair(c,hx,hy,dna){
  const h=dna.hair, st=dna.hairStyle;
  if(!h||st==="bald") return;
  c.fillStyle=h;
  if(st==="mohawk"){
    c.beginPath(); c.moveTo(hx-1,hy-dna.headH*0.45); c.lineTo(hx,hy-dna.headH*0.75); c.lineTo(hx+1,hy-dna.headH*0.45); c.closePath(); c.fill();
    return;
  }
  if(st==="ponytail"){
    block(c,hx-dna.headW*0.55,hy,dna.headW*0.42,dna.headH*0.55,-0.5,h,2);
  }
  if(st==="long"){
    block(c,hx,hy+dna.headH*0.08,dna.headW*0.9,dna.headH*0.75,0,h,3);
  }
  block(c,hx,hy,dna.headW*1.05,dna.headH*0.92,0,h,3);
  if(st==="curly"){
    c.fillStyle=shade(h,-12);
    for(let i=0;i<5;i++){
      const a=i/5*6.28;
      c.beginPath(); c.arc(hx+Math.cos(a)*dna.headW*0.35, hy+Math.sin(a)*dna.headH*0.2, dna.s*1.5, 0, 7); c.fill();
    }
  }
  if(st==="bun"){
    c.fillStyle=h; c.beginPath(); c.arc(hx-dna.headW*0.38, hy-dna.headH*0.12, dna.s*1.8, 0, 7); c.fill();
  }
}

function drawHead(c,hx,hy,ang,dna){
  drawHair(c,hx,hy,dna);
  block(c,hx,hy,dna.headW,dna.headH,ang,dna.skin,2.5);
  c.save(); c.translate(hx,hy); c.rotate(ang);
  c.fillStyle="#1a1410";
  c.fillRect(dna.headW*0.18,-dna.headH*0.14,dna.s*1.1,dna.s*1.1);
  c.fillRect(dna.headW*0.18,dna.headH*0.04,dna.s*1.1,dna.s*1.1);
  if(dna.beard!=="none"&&dna.hair){
    c.fillStyle=dna.hair;
    c.beginPath(); c.roundRect(dna.headW*0.02,dna.headH*0.08,dna.headW*0.62,dna.headH*0.34,dna.s*0.8); c.fill();
  }
  if(dna.accessory==="glasses"){
    c.strokeStyle="rgba(28,32,40,.9)"; c.lineWidth=1;
    c.strokeRect(dna.headW*0.08,-dna.headH*0.2,dna.headW*0.28,dna.headH*0.22);
    c.strokeRect(dna.headW*0.08,dna.headH*0.02,dna.headW*0.28,dna.headH*0.22);
  }
  c.restore();
  if(dna.hat==="cap"){
    block(c,hx,hy-dna.headH*0.18,dna.headW*1.1,dna.headH*0.35,ang,dna.hatC,2);
    block(c,hx+dna.headW*0.35,hy,dna.headW*0.55,dna.headH*0.14,ang,shade(dna.hatC,-18),1);
  } else if(dna.hat==="beanie"||dna.hat==="hood"){
    block(c,hx,hy,dna.headW*1.12,dna.headH*0.95,ang,dna.hatC,3);
  } else if(dna.hat==="helmet"){
    block(c,hx,hy,dna.headW*1.15,dna.headH*1.0,ang,dna.hatC,4);
    c.fillStyle="rgba(255,255,255,.14)"; block(c,hx-dna.headW*0.15,hy-dna.headH*0.15,dna.headW*0.35,dna.headH*0.28,ang,"rgba(255,255,255,.14)",2);
  }
}

function drawTorso(c,dna,shirt,md){
  const col=shirt||dna.shirt;
  block(c,0,0,dna.torso,dna.sw,0,col,3);
  if(dna.shirtStyle==="jacket"||dna.shirtStyle==="coat"){
    c.fillStyle=shade(col,-22);
    block(c,-dna.torso*0.12,dna.sw*0.38,dna.torso*0.35,dna.sw*0.72,0,shade(col,-22),2);
    block(c,-dna.torso*0.12,-dna.sw*0.38,dna.torso*0.35,dna.sw*0.72,0,shade(col,-22),2);
  }
  if(dna.shirtStyle==="hoodie"){
    c.fillStyle=shade(col,10); block(c,dna.torso*0.08,0,dna.torso*0.38,dna.sw*0.55,0,shade(col,10),2);
  }
  if(dna.shirtStyle==="vest"||md){
    c.fillStyle="#d8a820"; block(c,0,0,dna.torso*0.92,dna.sw*0.88,0,"#d8a820",2);
    c.fillStyle="#e8e040"; c.fillRect(-dna.torso*0.35,-dna.sw*0.1,dna.torso*0.18,dna.sw*0.2);
    c.fillRect(dna.torso*0.12,-dna.sw*0.1,dna.torso*0.18,dna.sw*0.2);
  }
  if(dna.accessory==="scarf"||dna.scarfC){
    c.fillStyle=dna.scarfC||shade(col,28);
    block(c,dna.torso*0.32,0,dna.torso*0.22,dna.sw*0.42,0,dna.scarfC||shade(col,28),2);
  }
}

function drawLegChain(c,hx,hy,th,kn,an,dna,side){
  const sg=side;
  const hipY=hy+sg*dna.hip*0.42;
  const p1=limb(c,hx,hipY,dna.thigh,Math.PI*0.5+th*sg,dna.s*2.1,dna.pants);
  const p2=limb(c,p1.x,p1.y,dna.calf,Math.PI*0.5+kn*sg,dna.s*1.8,dna.shorts?dna.skin:dna.pants);
  limb(c,p2.x,p2.y,dna.foot,Math.PI*0.5+an*sg,dna.foot,dna.shoe);
}

function drawArmChain(c,sx,sy,ua,el,dna,side){
  const sg=side;
  const p1=limb(c,sx,sy,dna.ua,ua*sg,dna.s*1.7,shade(dna.shirt,-12));
  const p2=limb(c,p1.x,p1.y,dna.fa,el*sg,dna.s*1.5,dna.skin);
  limb(c,p2.x,p2.y,dna.hand*0.9,el*sg*0.6,dna.hand,dna.skin);
}

function drawWalk(c,p,dna){
  const w=walkPhase(p,dna);
  c.fillStyle="rgba(0,0,0,.32)";
  c.beginPath(); c.ellipse(dna.torso*0.05,dna.sw*0.55,dna.torso*0.72,dna.sw*0.95,0,0,7); c.fill();

  drawLegChain(c,-dna.torso*0.18,0,w.lTh,w.lKn,w.lAn,dna,1);
  drawLegChain(c,-dna.torso*0.18,0,w.rTh,w.rKn,w.rAn,dna,-1);

  if(p.prop==="backpack"){
    block(c,-dna.torso*0.38,0,dna.torso*0.42,dna.sw*0.85,0,normHex(p.propColor,"#5a5048"),3);
  }
  drawTorso(c,dna,null,dna.shirtStyle==="vest");
  drawArmChain(c,dna.torso*0.22,dna.sw*0.38,w.lUa,w.lEl,dna,1);
  drawArmChain(c,dna.torso*0.22,-dna.sw*0.38,w.rUa,w.rEl,dna,-1);

  if(p.prop==="bag") block(c,dna.torso*0.1,dna.sw*0.55,dna.s*2.4,dna.s*3.2,0.2,normHex(p.propColor,"#8a6838"),2);
  if(p.prop==="briefcase") block(c,dna.torso*0.05,dna.sw*0.42,dna.s*3.6,dna.s*2.2,0,normHex(p.propColor,"#3a3028"),1.5);
  if(p.prop==="stick"){ c.strokeStyle=normHex(p.propColor,"#6a5038"); c.lineWidth=2.2; c.beginPath(); c.moveTo(dna.torso*0.1,dna.sw*0.5); c.lineTo(dna.torso*0.1,dna.sw*1.1); c.stroke(); }

  drawHead(c,dna.torso*0.42,0,0,dna);

  if(p.armed&&!p.hostile) block(c,dna.torso*0.05,dna.sw*0.5,dna.s*3,dna.s*1.4,0.2,"#2a3038",1);
  if(p.hostile){ c.strokeStyle="rgba(255,70,46,.9)"; c.lineWidth=1.6; c.beginPath(); c.arc(0,0,dna.torso*0.95,0,7); c.stroke(); }
}

function drawRagdoll(c,p,dna){
  const rd=p.ragdoll;
  c.fillStyle="rgba(0,0,0,.28)";
  c.beginPath(); c.ellipse(0,1,dna.torso*1.1,dna.sw*0.9,0,0,7); c.fill();
  if(!rd){
    block(c,0,0,dna.torso*1.5,dna.sw,0,dna.shirt,3);
    drawHead(c,dna.torso*0.55,0,0,dna);
    return;
  }
  const hipX=-dna.torso*0.35, shX=dna.torso*0.1;
  limb(c,hipX,0,dna.thigh+dna.calf,rd.legL,dna.s*2.1,dna.pants);
  limb(c,hipX,0,dna.thigh+dna.calf,rd.legR,dna.s*2.1,dna.pants);
  block(c,0,0,dna.torso*1.35,dna.sw*0.92,0,dna.shirt,3);
  limb(c,shX,dna.sw*0.3,dna.ua+dna.fa,rd.armL,dna.s*1.6,dna.skin);
  limb(c,shX,-dna.sw*0.3,dna.ua+dna.fa,rd.armR,dna.s*1.6,dna.skin);
  const nx=shX+dna.torso*0.25, ny=0;
  drawHead(c,nx+Math.cos(rd.head)*dna.headW*0.7, ny+Math.sin(rd.head)*dna.headW*0.7, rd.head,dna);
}

function drawSwim(c,p,dna){
  const bob=Math.sin(performance.now()/250)*1.2;
  c.fillStyle="rgba(255,255,255,.12)"; c.beginPath(); c.ellipse(0,bob,dna.torso*0.9,dna.sw*0.8,0,0,7); c.fill();
  block(c,0,bob,dna.torso*0.65,dna.sw*0.7,0,dna.shirt,2);
  drawHead(c,dna.torso*0.28,bob,0,dna);
}

function draw(c,p,color,down){
  const dna=resolveDNA(p);
  if(color) dna.shirt=normHex(color,dna.shirt);
  c.save(); c.translate(p.x,p.y); c.rotate(p.a||0);
  if(dna.hunch) c.translate(-dna.torso*dna.hunch,0);
  if(down) drawRagdoll(c,p,dna);
  else if(p.swimming) drawSwim(c,p,dna);
  else drawWalk(c,p,dna);
  paintBlood(c,p,!!down,dna);
  c.restore();
}

const People2D={
  draw, BUILD, BUILD_MOD, AGE_MOD,
  modelForArchetype(id){ return id||"civilian"; },
  modelForCop(type){ return type==="swat"?"swat":type==="soldier"?"soldier":"officer"; },
  resolveModel(p){ return resolveDNA(p); },
};

global.People2D=People2D;
global.Humanoid2D=People2D;
})(typeof window!=="undefined"?window:globalThis);
