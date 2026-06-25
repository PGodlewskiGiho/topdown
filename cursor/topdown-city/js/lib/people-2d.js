/* people-2d.js — GTA2-style top-down pedestrians (MIT, no deps) */
(function(global){
"use strict";

const BUILD=20260707;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const OUT="#141218";

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
function shade(hex, n){
  hex=normHex(hex);
  const v=parseInt(hex.slice(1),16);
  let r=(v>>16)&255, g=(v>>8)&255, b=v&255;
  r=clamp(r+n,0,255); g=clamp(g+n,0,255); b=clamp(b+n,0,255);
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

/* GTA2 remap table — silhouette + default palette slots */
const GTA2_PED=[
  {id:0,  w:1.00,h:1.00, hair:true, cap:false},
  {id:1,  w:0.92,h:0.98, hair:true, cap:false, fem:true},
  {id:2,  w:1.08,h:1.04, hair:true, cap:false, tough:true},
  {id:3,  w:0.96,h:1.02, hair:true, cap:true},
  {id:4,  w:0.88,h:0.92, hair:false,cap:false, elder:true},
  {id:5,  w:0.84,h:0.88, hair:true, cap:false, teen:true},
  {id:6,  w:1.00,h:1.00, hair:false,cap:true, cop:true},
  {id:7,  w:1.02,h:1.06, hair:true, cap:false, pack:true},
  {id:8,  w:0.94,h:1.00, hair:true, cap:false, jacket:true},
  {id:9,  w:1.06,h:1.02, hair:false,cap:false, tough:true, bald:true},
  {id:10, w:0.90,h:0.96, hair:true, cap:true, fem:true},
  {id:11, w:1.04,h:1.08, hair:true, cap:false, vest:true},
  {id:12, w:0.86,h:0.90, hair:true, cap:false, shorts:true},
  {id:13, w:0.98,h:1.00, hair:true, cap:false, mohawk:true},
  {id:14, w:1.00,h:0.94, hair:true, cap:false, runner:true},
  {id:15, w:1.10,h:1.10, hair:false,cap:false, tough:true, bald:true},
];

function pickPedType(p){
  const seed=p._visSeed!=null?p._visSeed:((p.x|0)*928371+(p.y|0)*689287)|0;
  if(p.archetypeId){
    const map={
      city_teen:5, city_punk:13, city_jogger:14, city_elder:4, city_worker:11,
      city_business:8, city_delivery:3, forest_hiker:7, sea_fisher:9,
      armed_thug:15, city_sporty:12, desert_nomad:2, sea_tourist:1,
    };
    if(map[p.archetypeId]!=null) return GTA2_PED[map[p.archetypeId]];
  }
  if(p.body==="female") return GTA2_PED[1];
  if(p.body==="hardy") return GTA2_PED[2];
  if(p.hat==="cap"||p.hat==="helmet") return GTA2_PED[3];
  return GTA2_PED[Math.abs(seed)%GTA2_PED.length];
}

function resolveStyle(p,color){
  const type=pickPedType(p);
  const z=2.35*clamp((p.r||9)/9,0.78,1.22)*clamp(p.height||1,0.86,1.12);
  const shirt=normHex(color||p.shirt||p.color,"#3a6ea5");
  const pants=normHex(p.pants,"#2a3444");
  const skin=normHex(p.skin,"#e8b888");
  const shoe=normHex(p.shoes,shade(pants,-35));
  const hair=p.hair!=null?normHex(p.hair,"#3a2a18"):type.bald?null:"#3a2a18";
  const hatC=normHex(p.hatColor,"#444");
  const sleeve=shade(shirt,-28);
  const swing=type.runner?1.35:type.teen?1.2:type.elder?0.72:1;
  return {type,z,shirt,sleeve,pants,skin,shoe,hair,hatC,swing,
    shorts:!!(type.shorts||p.shorts), hat:p.hat, prop:p.prop, propC:p.propColor,
    armed:!!p.armed, hostile:!!p.hostile};
}

function walkFrame(p,st){
  const mv=Math.hypot(p.vx||0,p.vy||0);
  const t=p.previewT!=null?p.previewT:performance.now()*0.001;
  const ph=mv>4?t*13*st.swing:t*2.2;
  const f=(Math.sin(ph)>0)?1:0;
  const s=Math.sin(ph);
  return {f,s, mv};
}

function pxRect(c,x,y,w,h,col,ol){
  c.fillStyle=col;
  c.fillRect(x|0,y|0,w|0,h|0);
  if(ol!==false){
    c.strokeStyle=OUT; c.lineWidth=1;
    c.strokeRect((x|0)+0.5,(y|0)+0.5,(w|0)-1,(h|0)-1);
  }
}

/* Draw one GTA2-style ped facing +X (game forward). Origin = body center. */
function drawGta2Ped(c,st,frame,down){
  const z=st.z, t=st.type;
  const W=t.w, H=t.h;
  const u=z; /* 1 sprite pixel */
  c.imageSmoothingEnabled=false;

  /* shadow */
  pxRect(c,-5*u*W, 5*u*H, 10*u*W, 2*u, "rgba(0,0,0,.30)", false);

  if(down){
    pxRect(c,-5*u*W, -1*u, 11*u*W, 4*u, st.pants);
    pxRect(c,-4*u*W, 2*u, 9*u*W, 3*u, st.shirt);
    pxRect(c, 2*u*W, 1*u, 4*u, 3*u, st.skin);
    if(st.hair) pxRect(c, 2*u*W, 0, 4*u, 1*u, st.hair);
    return;
  }

  const wf=frame.f;
  const legF=wf?1:-1;
  const armF=-legF;

  /* legs — GTA2 two-frame stride */
  const ly=4*u*H;
  const l1x=-2*u*W+legF*1*u, l2x=1*u*W-legF*1*u;
  const legH=(st.shorts?5:7)*u;
  const legCol=st.shorts?st.skin:st.pants;
  pxRect(c,l1x, ly, 3*u, legH, legCol);
  pxRect(c,l2x, ly, 3*u, legH, legCol);
  if(st.shorts) pxRect(c,l1x, ly, 3*u, 2*u, st.pants), pxRect(c,l2x, ly, 3*u, 2*u, st.pants);
  pxRect(c,l1x, ly+legH, 3*u, 2*u, st.shoe);
  pxRect(c,l2x, ly+legH, 3*u, 2*u, st.shoe);

  /* torso / shirt */
  const tx=-4*u*W, ty=0;
  pxRect(c,tx, ty, 8*u*W, 5*u, st.shirt);
  if(t.jacket){
    pxRect(c,tx-1*u, ty, 2*u, 5*u, shade(st.shirt,-32));
    pxRect(c,tx+7*u*W-1*u, ty, 2*u, 5*u, shade(st.shirt,-32));
  }
  if(t.vest){
    pxRect(c,tx+1*u, ty+1*u, 6*u*W, 3*u, "#d8a820");
    pxRect(c,tx+1*u, ty+2*u, 2*u, 1*u, "#f0e040");
    pxRect(c,tx+5*u*W-2*u, ty+2*u, 2*u, 1*u, "#f0e040");
  }

  /* arms */
  const ax=tx+(armF>0?7*u*W: -2*u);
  pxRect(c,ax, ty+1*u, 2*u, 4*u, st.sleeve);
  pxRect(c,ax+(armF>0?1*u:-1*u), ty+4*u, 2*u, 2*u, st.skin);

  /* head */
  const hx=3*u*W, hy=-2*u;
  pxRect(c,hx, hy, 4*u, 4*u, st.skin);
  if(st.hair){
    if(t.mohawk) pxRect(c,hx+1*u, hy-2*u, 2*u, 2*u, st.hair);
    else pxRect(c,hx, hy-1*u, 4*u, 2*u, st.hair);
  }
  if(t.elder&&st.hair) pxRect(c,hx, hy-1*u, 4*u, 1*u, shade(st.hair,20));

  /* hat / cop cap */
  if(t.cop||st.hat==="cap"||st.hat==="helmet"){
    pxRect(c,hx-1*u, hy-2*u, 6*u, 2*u, st.hatC||"#2a3040");
    pxRect(c,hx+3*u, hy-1*u, 3*u, 1*u, shade(st.hatC||"#2a3040",-18));
  } else if(st.hat==="beanie"||st.hat==="hood"){
    pxRect(c,hx, hy-2*u, 4*u, 2*u, st.hatC);
  }

  /* backpack / props */
  if(t.pack||st.prop==="backpack"){
    pxRect(c,tx-2*u, ty, 2*u, 5*u, normHex(st.propC,"#5a5048"));
  }
  if(st.prop==="briefcase") pxRect(c,tx+2*u, ty+4*u, 3*u, 2*u, normHex(st.propC,"#3a3028"));
  if(st.prop==="bag") pxRect(c,tx+5*u, ty+3*u, 2*u, 3*u, normHex(st.propC,"#8a6838"));

  /* face dot — GTA2 style */
  c.fillStyle="#1a1410";
  c.fillRect(hx+2*u, hy+1*u, u, u);
  c.fillRect(hx+2*u, hy+2*u, u, u);

  if(st.armed&&!st.hostile) pxRect(c,tx+6*u, ty+2*u, 3*u, 1*u, "#2a3038", false);
  if(st.hostile){
    c.strokeStyle="rgba(255,60,40,.85)"; c.lineWidth=1;
    c.strokeRect(tx-2*u, hy-3*u, 12*u*W, 14*u);
  }
}

function drawRagdollGta2(c,st,p){
  const rd=p.ragdoll, u=st.z;
  c.imageSmoothingEnabled=false;
  pxRect(c,-6*u,5*u,12*u,2*u,"rgba(0,0,0,.28)",false);
  if(!rd){
    drawGta2Ped(c,st,{f:0,s:0,mv:0},true);
    return;
  }
  pxRect(c,-5*u,0,4*u,8*u,st.pants);
  pxRect(c,1*u,0,4*u,8*u,st.pants);
  pxRect(c,-4*u,-1*u,9*u,4*u,st.shirt);
  pxRect(c,3*u,-1*u,4*u,3*u,st.skin);
  const hx=5*u+Math.cos(rd.head||0)*2*u, hy=Math.sin(rd.head||0)*2*u;
  pxRect(c,hx,hy,3*u,3*u,st.skin);
}

function paintBlood(c,p,down,u){
  const stain=clamp(p.bloodStain||0,0,1), pulse=clamp(p.bloodPulse||0,0,1);
  if(stain<0.03&&pulse<0.03) return;
  c.save(); c.globalCompositeOperation="multiply"; c.globalAlpha=0.2+stain*0.45+pulse*0.25;
  pxRect(c,down?-2*u:0, down?0:-1*u, down?10*u:7*u, down?4*u:6*u, "#8a1018", false);
  c.restore();
}

function snap8(a){
  const d=((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  return Math.round(d/(Math.PI/4))*(Math.PI/4);
}

function draw(c,p,color,down){
  const st=resolveStyle(p,color);
  const frame=walkFrame(p,st);
  c.save();
  c.translate(p.x,p.y);
  c.rotate(snap8(p.a||0));
  if(down) drawRagdollGta2(c,st,p);
  else if(p.swimming){
    const bob=Math.sin(performance.now()/220)*st.z;
    c.translate(0,bob);
    pxRect(c,-3*st.z,0,7*st.z,4*st.z,st.shirt);
    pxRect(c,2*st.z,-2*st.z,4*st.z,3*st.z,st.skin);
  } else {
    drawGta2Ped(c,st,frame,false);
  }
  paintBlood(c,p,!!down,st.z);
  c.restore();
}

const People2D={
  draw, BUILD, GTA2_PED,
  modelForArchetype(id){ return id||"gta2"; },
  modelForCop(){ return "cop"; },
  resolveModel(p){ return resolveStyle(p); },
};

global.People2D=People2D;
global.Humanoid2D=People2D;
})(typeof window!=="undefined"?window:globalThis);
