/* humanoid-2d.js — procedural 2.5D top-down humanoid renderer (MIT, no deps) */
(function(global){
"use strict";

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const shade=typeof global.shade==="function"?global.shade:(hex,amt)=>{
  const n=parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  const f=amt>=0?255:0, t=Math.abs(amt);
  const R=clamp((r+(f-r)*t)|0,0,255), G=clamp((g+(f-g)*t)|0,0,255), B=clamp((b+(f-b)*t)|0,0,255);
  return "#"+((1<<24)+(R<<16)+(G<<8)+B).toString(16).slice(1);
};

/** Silhouette + pose modifiers per archetype. */
const MODELS={
  civilian:{tw:0.90,th:1.14,head:1.00,shoulder:1.00,leg:1.00,swing:1.00,hunch:0},
  female:{tw:0.74,th:1.02,head:0.96,shoulder:0.88,leg:0.94,swing:1.02,hunch:0},
  hardy:{tw:1.05,th:1.22,head:1.04,shoulder:1.16,leg:1.08,swing:0.92,hunch:0},
  worker:{tw:0.94,th:1.12,head:1.00,shoulder:1.08,leg:1.02,swing:0.95,hunch:0,hardhat:true,reflectVest:true},
  business:{tw:0.86,th:1.18,head:0.98,shoulder:1.02,leg:0.96,swing:0.88,hunch:0,suit:true,tie:true},
  elder:{tw:0.88,th:1.08,head:0.94,shoulder:0.96,leg:0.92,swing:0.72,hunch:0.14,cane:true},
  teen:{tw:0.80,th:1.06,head:0.94,shoulder:0.90,leg:0.98,swing:1.18,hunch:0,hoodie:true,shorts:true},
  punk:{tw:0.86,th:1.10,head:1.00,shoulder:1.04,leg:1.00,swing:1.08,hunch:0.04,mohawk:true},
  hiker:{tw:0.92,th:1.16,head:1.00,shoulder:1.06,leg:1.06,swing:0.98,hunch:0,bigPack:true,boots:true},
  fisher:{tw:0.94,th:1.14,head:1.00,shoulder:1.02,leg:1.00,swing:0.90,hunch:0,raincoat:true,bucketHat:true},
  tourist:{tw:0.88,th:1.10,head:1.00,shoulder:0.98,leg:0.96,swing:1.04,hunch:0,camera:true},
  nomad:{tw:0.92,th:1.12,head:1.00,shoulder:1.00,leg:1.02,swing:0.94,hunch:0,layered:true},
  thug:{tw:1.02,th:1.16,head:1.02,shoulder:1.12,leg:1.04,swing:1.02,hunch:0.05},
  runner:{tw:0.78,th:1.04,head:0.92,shoulder:0.86,leg:0.90,swing:1.42,hunch:0.08,shorts:true},
  officer:{tw:0.92,th:1.16,head:1.00,shoulder:1.04,leg:1.00,swing:0.96,hunch:0,uniform:true,badge:true,belt:true},
  swat:{tw:1.02,th:1.20,head:1.02,shoulder:1.14,leg:1.06,swing:0.90,hunch:0,helmet:true,vest:true},
  soldier:{tw:1.00,th:1.18,head:1.00,shoulder:1.10,leg:1.04,swing:0.92,hunch:0,helmet:true,pouches:true},
};

const ARCH_MODEL={
  city_casual:"civilian", city_worker:"worker", city_business:"business", city_elder:"elder",
  city_teen:"teen", city_punk:"punk", forest_hiker:"hiker", forest_local:"hardy",
  desert_nomad:"nomad", desert_worker:"worker", sea_tourist:"tourist", sea_fisher:"fisher",
  armed_thug:"thug",
};

function resolveModel(p){
  if(p.model&&MODELS[p.model]) return MODELS[p.model];
  if(p.archetypeId&&ARCH_MODEL[p.archetypeId]) return MODELS[ARCH_MODEL[p.archetypeId]];
  if(p.body==="female") return MODELS.female;
  if(p.body==="hardy") return MODELS.hardy;
  return MODELS.civilian;
}

function sunLit(){
  if(typeof sunGlareState!=="function") return 0.5;
  const st=sunGlareState();
  return st.active?0.5+st.intensity*0.35:0.5;
}

function paintBlood(c,p,down,r,tw,th){
  const stain=clamp(p.bloodStain||0,0,1), pulse=clamp(p.bloodPulse||0,0,1);
  if(stain<0.02&&pulse<0.02) return;
  c.save(); c.globalCompositeOperation="multiply"; c.globalAlpha=0.16+stain*0.4+pulse*0.2;
  c.fillStyle="#8a1018";
  if(down){
    c.beginPath(); c.ellipse(r*0.5,0,r*0.5,r*0.36,0.08,0,7); c.fill();
    c.beginPath(); c.ellipse(-r*0.15,r*0.06,r*0.58,r*0.4,0,0,7); c.fill();
  } else {
    c.beginPath(); c.ellipse(r*0.06,r*0.1,(tw||r*0.9)*0.44,(th||r)*0.36,0.15,0,7); c.fill();
    c.beginPath(); c.ellipse(-r*0.18,-r*0.04,r*0.2,r*0.26,0.2,0,7); c.fill();
  }
  c.restore();
}

function drawHelmet(c,hx,r,col){
  c.fillStyle=col; c.beginPath(); c.arc(hx,-r*0.06,r*0.62,0,7); c.fill();
  c.fillStyle=shade(col,-22); c.beginPath(); c.arc(hx+r*0.04,r*0.04,r*0.5,2.0,5.4); c.fill();
  c.fillStyle="rgba(255,255,255,.12)"; c.beginPath(); c.arc(hx-r*0.12,-r*0.18,r*0.22,0,7); c.fill();
  c.strokeStyle="rgba(0,0,0,.28)"; c.lineWidth=1; c.beginPath(); c.arc(hx,0,r*0.58,0,7); c.stroke();
}

function drawHardhat(c,hx,r){
  c.fillStyle="#e8c838"; c.beginPath(); c.arc(hx,-r*0.08,r*0.58,-3.4,0.2); c.fill();
  c.fillStyle="#c8a820"; c.fillRect(hx-r*0.62,r*0.22,r*1.24,r*0.12);
  c.fillStyle="#f0d848"; c.beginPath(); c.arc(hx,-r*0.1,r*0.52,-3.2,0.1); c.fill();
}

function drawBucketHat(c,hx,r,col){
  c.fillStyle=col; c.beginPath(); c.ellipse(hx,r*0.08,r*0.62,r*0.18,0,0,7); c.fill();
  c.fillStyle=shade(col,-12); c.beginPath(); c.arc(hx,-r*0.02,r*0.48,0,7); c.fill();
}

function drawMohawk(c,hx,r,hair){
  c.fillStyle=hair; c.beginPath();
  c.moveTo(hx-r*0.04,-r*0.52); c.lineTo(hx+r*0.02,-r*0.88); c.lineTo(hx+r*0.08,-r*0.48); c.closePath(); c.fill();
}

function drawTorso(c,tw,th,shirt,md,lit){
  const g=c.createRadialGradient(-tw*0.12,-th*0.08,th*0.08, 0,0, Math.max(tw,th));
  g.addColorStop(0,shade(shirt,lit*18)); g.addColorStop(0.55,shirt); g.addColorStop(1,shade(shirt,-22));
  c.fillStyle=g; c.beginPath(); c.ellipse(0,0,tw,th,0,0,7); c.fill();
  if(md.suit){
    c.fillStyle=shade(shirt,-28); c.beginPath(); c.ellipse(-tw*0.38,0,tw*0.3,th*0.9,0,0,7); c.fill();
    c.beginPath(); c.ellipse(tw*0.38,0,tw*0.3,th*0.9,0,0,7); c.fill();
    c.fillStyle=shirt; c.beginPath(); c.ellipse(0,-th*0.02,tw*0.48,th*0.62,0,0,7); c.fill();
  }
  if(md.uniform){
    c.fillStyle="rgba(255,255,255,.14)"; c.fillRect(-tw*0.08,-th*0.42,tw*0.16,th*0.84);
    c.strokeStyle="rgba(255,220,120,.35)"; c.lineWidth=0.9;
    c.beginPath(); c.moveTo(-tw*0.5,-th*0.1); c.lineTo(tw*0.5,-th*0.1); c.stroke();
    c.beginPath(); c.moveTo(-tw*0.5,th*0.1); c.lineTo(tw*0.5,th*0.1); c.stroke();
  }
  if(md.reflectVest||md.vest){
    const vc=md.vest?"#3a4038":"#d8a820";
    c.fillStyle=vc; c.beginPath(); c.ellipse(0,0,tw*0.92,th*0.88,0,0,7); c.fill();
    if(md.reflectVest){
      c.fillStyle="#e8e040"; c.fillRect(-tw*0.42,-th*0.06,tw*0.2,th*0.12); c.fillRect(tw*0.22,-th*0.06,tw*0.2,th*0.12);
    }
  }
  if(md.raincoat){
    c.fillStyle=shade(shirt,-8); c.beginPath(); c.ellipse(0,th*0.04,tw*1.08,th*1.2,0,0,7); c.fill();
    c.strokeStyle="rgba(0,0,0,.18)"; c.lineWidth=1; c.beginPath(); c.moveTo(0,-th*0.5); c.lineTo(0,th*0.55); c.stroke();
  }
}

function draw(c,p,color,down){
  const skin=p.skin||"#e8b888", shirt=p.shirt||color, pants=p.pants||"#2a3444";
  const hair=("hair"in p)?p.hair:"#3a2a18", hat=p.hat||null, hatC=p.hatColor||"#444";
  const body=p.body||"male", hairStyle=p.hairStyle||(hair===null?"bald":"short"), beard=p.beard||null;
  const md=resolveModel(p);
  const br=body==="hardy"?1.14:body==="female"?0.9:1;
  const r=(p.r||9)*br;
  const lit=sunLit();
  const roundRect=(x,y,w,h,rad)=>{ c.beginPath(); c.roundRect(x,y,w,h,rad); };

  c.save(); c.translate(p.x,p.y); c.rotate(p.a);
  if(md.hunch) c.translate(-r*md.hunch,0);

  if(down){
    c.fillStyle="rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(0,1,r*1.75,r*0.78,0,0,7); c.fill();
    c.fillStyle=shirt; roundRect(-r*1.55,-r*0.5,r*3.1,r*1.05,r*0.5); c.fill();
    c.fillStyle=skin; c.beginPath(); c.arc(r*1.22,0,r*0.48,0,7); c.fill();
    paintBlood(c,p,true,r); c.restore(); return;
  }

  if(p.swimming){
    const bob=Math.sin(performance.now()/250)*1.2;
    c.fillStyle="rgba(255,255,255,.14)"; c.beginPath(); c.ellipse(0,bob,r*1.55,r*0.95,0,0,7); c.fill();
    c.fillStyle=shirt; c.beginPath(); c.ellipse(-1,bob,r*0.72,r*0.82,0,0,7); c.fill();
    c.fillStyle=skin; c.beginPath(); c.arc(r*0.42,bob,r*0.52,0,7); c.fill();
    c.restore(); return;
  }

  const mv=Math.hypot(p.vx||0,p.vy||0);
  const t=p.previewT!=null?p.previewT:performance.now()*0.001;
  const walk=mv>6?Math.sin(t*14*md.swing):Math.sin(t*3)*0.32;
  const limb=walk*r*0.38;
  const hx=r*0.54, tw=r*md.tw, th=r*md.th;
  const shoe=p.shoes||shade(pants,-42);
  const frontLeg=Math.sin(t*14*md.swing)>=0;

  c.fillStyle="rgba(0,0,0,.34)"; c.beginPath(); c.ellipse(0,r*0.38,r*1.08,r*0.84,0,0,7); c.fill();

  const drawLeg=(side,back)=>{
    const s=side, sc=back?0.82:1;
    c.globalAlpha=sc;
    c.fillStyle=shoe;
    c.beginPath(); c.ellipse(r*0.24+s*limb*0.14,s*r*0.56,r*0.3*(md.boots?1.08:1),r*0.2,0.15*s,0,7); c.fill();
    const ph=md.shorts?0.28:0.42;
    c.fillStyle=pants;
    c.beginPath(); c.ellipse(r*0.1+s*limb*0.1,s*r*ph,r*0.28,r*(md.shorts?0.26:0.4),0.08*s,0,7); c.fill();
    c.globalAlpha=1;
  };
  drawLeg(frontLeg?1:-1,true);
  drawLeg(frontLeg?-1:1,false);

  const sleeve=shade(shirt,-14);
  c.fillStyle=sleeve;
  c.beginPath(); c.ellipse(-r*0.04-limb*0.18,r*0.6,r*0.22*md.shoulder,r*0.36,0.2,0,7); c.fill();
  c.beginPath(); c.ellipse(-r*0.04+limb*0.18,-r*0.6,r*0.22*md.shoulder,r*0.36,-0.2,0,7); c.fill();
  c.fillStyle=skin;
  c.beginPath(); c.arc(-r*0.02-limb*0.26,r*0.74,r*0.13,0,7); c.fill();
  c.beginPath(); c.arc(-r*0.02+limb*0.26,-r*0.74,r*0.13,0,7); c.fill();

  if(p.prop==="backpack"||md.bigPack){
    const pc=p.propColor||"#5a5048";
    c.fillStyle=pc; c.beginPath(); c.ellipse(-tw*0.44,0,r*(md.bigPack?0.44:0.36),r*(md.bigPack?0.58:0.52),0,0,7); c.fill();
    c.fillStyle=shade(pc,-18); c.beginPath(); c.ellipse(-tw*0.5,0,r*0.12,r*0.38,0,0,7); c.fill();
  }

  if(p.shirtStyle==="coat"){
    drawTorso(c,tw*1.04,th*1.12,shirt,md,lit);
  } else if(p.shirtStyle==="jacket"){
    drawTorso(c,tw,th,shirt,md,lit);
    c.fillStyle=shade(shirt,-22); c.beginPath(); c.ellipse(-tw*0.38,0,tw*0.34,th*0.88,0,0,7); c.fill();
    c.beginPath(); c.ellipse(tw*0.38,0,tw*0.34,th*0.88,0,0,7); c.fill();
  } else if(p.shirtStyle==="vest"){
    drawTorso(c,tw,th,shirt,{...md,reflectVest:true},lit);
  } else {
    drawTorso(c,tw,th,shirt,md,lit);
    if(p.shirtStyle==="hoodie"||md.hoodie){
      c.fillStyle=shade(shirt,8); c.beginPath(); c.ellipse(r*0.04,0,tw*0.38,th*0.55,0,0,7); c.fill();
    }
  }

  if(md.tie){
    c.fillStyle="#8a2828"; c.fillRect(hx-r*0.04,-r*0.08,r*0.08,r*0.34);
    c.fillStyle="#a83838"; c.beginPath(); c.moveTo(hx-r*0.04,-r*0.08); c.lineTo(hx+r*0.04,-r*0.08); c.lineTo(hx,-r*0.02); c.closePath(); c.fill();
  }
  if(md.badge){
    c.fillStyle="#d8b040"; c.beginPath(); c.arc(-tw*0.22,-th*0.08,r*0.08,0,7); c.fill();
  }
  if(md.belt){
    c.fillStyle="#1a1c22"; c.fillRect(-tw*0.42,th*0.08,tw*0.84,r*0.1);
    c.fillStyle="#888"; c.fillRect(-tw*0.06,th*0.08,r*0.12,r*0.1);
  }
  if(md.pouches){
    c.fillStyle=shade(shirt,-30); c.fillRect(-tw*0.3,th*0.02,tw*0.18,th*0.2); c.fillRect(tw*0.12,th*0.02,tw*0.18,th*0.2);
  }
  if(p.accessory==="scarf"||md.layered){
    c.fillStyle=p.scarfColor||shade(shirt,30);
    c.beginPath(); c.ellipse(hx-r*0.12,0,r*0.28,r*0.14,0,0,7); c.fill();
    c.fillRect(hx-r*0.08,r*0.02,r*0.12,r*0.22);
  }

  const headR=r*0.47*md.head;
  if(md.mohawk&&hair&&!hat) drawMohawk(c,hx,r,hair);
  else if(hairStyle!=="bald"&&hair&&!hat){
    c.fillStyle=hair; c.beginPath(); c.arc(hx,0,r*0.58*md.head,0,7); c.fill();
    c.fillStyle=shade(hair,-16); c.beginPath(); c.arc(hx-r*0.04,0,r*0.48*md.head,2.4,5.5); c.fill();
  }
  if(hairStyle==="ponytail"&&hair&&!hat){
    c.fillStyle=hair; c.beginPath(); c.ellipse(-r*0.62,-r*0.06,r*0.24,r*0.46,-0.55,0,7); c.fill();
  }
  if(hairStyle==="long"&&hair&&!hat){
    c.fillStyle=hair; c.beginPath(); c.ellipse(hx-r*0.04,r*0.1,r*0.46,r*0.62,0.12,0,7); c.fill();
  }

  c.fillStyle=skin; c.beginPath(); c.arc(hx,0,headR,0,7); c.fill();
  c.fillStyle=shade(skin,lit*14); c.beginPath(); c.arc(hx+r*0.1,-r*0.1,r*0.15,0,7); c.fill();
  c.fillStyle="#1a1410";
  c.beginPath(); c.arc(hx+r*0.16,-r*0.11,r*0.055,0,7); c.fill();
  c.beginPath(); c.arc(hx+r*0.16,r*0.11,r*0.055,0,7); c.fill();

  if(p.accessory==="glasses"){
    c.strokeStyle="rgba(28,32,40,.88)"; c.lineWidth=1.1;
    c.beginPath(); c.arc(hx+r*0.13,-r*0.11,r*0.1,0,7); c.stroke();
    c.beginPath(); c.arc(hx+r*0.13,r*0.11,r*0.1,0,7); c.stroke();
  }
  if(beard&&beard!=="none"&&hair){
    c.fillStyle=hair;
    c.beginPath(); c.ellipse(hx+r*0.04,r*0.14,r*0.34,r*0.28,0,0,7); c.fill();
  }

  if(md.helmet||hat==="helmet") drawHelmet(c,hx,r,hatC);
  else if(md.hardhat) drawHardhat(c,hx,r);
  else if(md.bucketHat) drawBucketHat(c,hx,r,hatC);
  else if(hat==="cap"){
    c.fillStyle=hatC; c.beginPath(); c.arc(hx,-r*0.04,r*0.56,-2.1,2.1); c.fill();
    c.fillStyle=shade(hatC,-18); c.fillRect(hx+r*0.38,-r*0.4,r*0.58,r*0.12);
  } else if(hat==="beanie"){
    c.fillStyle=hatC; c.beginPath(); c.arc(hx,0,r*0.58,0,7); c.fill();
  } else if(hat==="hood"){
    c.fillStyle=hatC; c.beginPath(); c.arc(hx,0,r*0.64,0,7); c.fill();
    c.fillStyle=skin; c.beginPath(); c.arc(hx+r*0.4,0,r*0.22,0,7); c.fill();
  }

  if(md.camera){
    c.fillStyle="#2a2a30"; roundRect(hx+r*0.08,-r*0.22,r*0.22,r*0.16,2); c.fill();
    c.fillStyle="#6a8090"; c.beginPath(); c.arc(hx+r*0.19,-r*0.14,r*0.05,0,7); c.fill();
  }
  if(p.prop==="bag"){ c.fillStyle=p.propColor||"#8a6838"; roundRect(-r*0.02+limb*0.08,r*0.62,r*0.24,r*0.3,2); c.fill(); }
  else if(p.prop==="briefcase"||md.business){
    c.fillStyle=p.propColor||"#3a3028"; roundRect(-r*0.04-limb*0.12,r*0.58,r*0.34,r*0.2,1); c.fill();
  } else if(p.prop==="stick"||md.cane){
    c.strokeStyle=p.propColor||"#6a5038"; c.lineWidth=md.cane?2.6:2.2;
    c.beginPath(); c.moveTo(-r*0.02-limb*0.1,r*0.5); c.lineTo(-r*0.02-limb*0.1,r*(md.cane?1.05:0.95)); c.stroke();
  } else if(p.prop==="bucket"){
    c.fillStyle=p.propColor||"#586878"; c.beginPath(); c.ellipse(-r*0.02+limb*0.12,r*0.72,r*0.16,r*0.12,0,0,7); c.fill();
  }

  if(p.armed&&!p.hostile){ c.fillStyle="#2a3038"; roundRect(-tw*0.08,r*0.32,r*0.3,r*0.14,1); c.fill(); }
  if(p.hostile){ c.strokeStyle="rgba(255,70,46,.9)"; c.lineWidth=1.6; c.beginPath(); c.arc(0,0,r*1.65,0,7); c.stroke(); }
  paintBlood(c,p,false,r,tw,th);
  c.restore();
}

const Humanoid2D={draw,MODELS,ARCH_MODEL,resolveModel,
  modelForArchetype(id){ return ARCH_MODEL[id]||"civilian"; },
  modelForCop(type){ return type==="swat"?"swat":type==="soldier"?"soldier":"officer"; },
};
global.Humanoid2D=Humanoid2D;
})(typeof window!=="undefined"?window:globalThis);
