/* sun-glare.js — procedural solar reflections & lens flare (MIT, no deps) */
(function(global){
"use strict";

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;

function mkCanvas(w,h){
  const c=document.createElement("canvas");
  c.width=w; c.height=h;
  return c;
}

function genHotspot(sz){
  const c=mkCanvas(sz,sz), g=c.getContext("2d");
  const r=sz*0.5, gr=g.createRadialGradient(r,r,0,r,r,r);
  gr.addColorStop(0,"rgba(255,252,235,1)");
  gr.addColorStop(0.18,"rgba(255,228,160,0.92)");
  gr.addColorStop(0.42,"rgba(255,190,90,0.35)");
  gr.addColorStop(1,"rgba(255,160,60,0)");
  g.fillStyle=gr; g.fillRect(0,0,sz,sz);
  return c;
}

function genStreak(w,h){
  const c=mkCanvas(w,h), g=c.getContext("2d");
  const gr=g.createLinearGradient(0,h*0.5,w,h*0.5);
  gr.addColorStop(0,"rgba(255,200,120,0)");
  gr.addColorStop(0.35,"rgba(255,230,180,0.18)");
  gr.addColorStop(0.5,"rgba(255,248,220,0.95)");
  gr.addColorStop(0.65,"rgba(255,230,180,0.18)");
  gr.addColorStop(1,"rgba(255,200,120,0)");
  g.fillStyle=gr; g.fillRect(0,h*0.42,w,h*0.16);
  const gr2=g.createLinearGradient(0,h*0.5,w,h*0.5);
  gr2.addColorStop(0.5,"rgba(255,255,255,0.55)");
  g.fillStyle=gr2; g.fillRect(w*0.2,h*0.47,w*0.6,h*0.06);
  return c;
}

function genRing(d){
  const c=mkCanvas(d,d), g=c.getContext("2d"), r=d*0.5;
  g.strokeStyle="rgba(255,220,170,0.55)"; g.lineWidth=2.2;
  g.beginPath(); g.arc(r,r,r*0.62,0,7); g.stroke();
  g.strokeStyle="rgba(180,210,255,0.28)"; g.lineWidth=1.4;
  g.beginPath(); g.arc(r,r,r*0.48,0,7); g.stroke();
  return c;
}

function genGhost(w,h,rgb,a){
  const c=mkCanvas(w,h), g=c.getContext("2d");
  const gr=g.createRadialGradient(w*0.5,h*0.5,0,w*0.5,h*0.5,Math.max(w,h)*0.5);
  gr.addColorStop(0,`rgba(${rgb},${a})`);
  gr.addColorStop(1,`rgba(${rgb},0)`);
  g.fillStyle=gr; g.fillRect(0,0,w,h);
  return c;
}

/** Classic flare ghost chain offsets (normalized along sun→center line). */
const GHOSTS=[
  {t:-0.42, s:0.22, tex:"warm", a:0.35},
  {t:-0.18, s:0.14, tex:"ring", a:0.5},
  {t:0.08, s:0.28, tex:"cool", a:0.22},
  {t:0.22, s:0.18, tex:"warm", a:0.30},
  {t:0.38, s:0.12, tex:"hot", a:0.40},
  {t:0.55, s:0.20, tex:"cool", a:0.18},
  {t:0.72, s:0.10, tex:"ring", a:0.35},
  {t:0.88, s:0.16, tex:"warm", a:0.15},
];

class SunGlare{
  constructor(){
    this.t=0;
    this.flicker=0;
    this.ok=true;
    this.hot=genHotspot(128);
    this.streak=genStreak(512,64);
    this.ring=genRing(96);
    this.ghostWarm=genGhost(80,80,"255,210,140",0.55);
    this.ghostCool=genGhost(64,64,"160,200,255",0.45);
    this.ghostHot=genGhost(48,48,"255,240,200",0.7);
  }

  update(dt){
    this.t+=dt;
    this.flicker+=(Math.random()-0.5)*dt*2.4;
    this.flicker*=Math.pow(0.92,dt*60);
  }

  /**
   * @param {{hour:number, weatherI?:number, night?:number, sunShadow?:(h:number)=>object|null}} opts
   */
  computeState(opts){
    const h=opts.hour, weatherI=opts.weatherI||0, night=opts.night||0;
    const S=opts.sunShadow?opts.sunShadow(h):null;
    if(!S||night>0.72){
      return {active:false, intensity:0, elev:0, sunDx:0, sunDy:0, warm:0, sx:0, sy:0, cx:0, cy:0};
    }
    const day=(h-6.2)/13.1;
    const elev=Math.sin(Math.PI*clamp(day,0,1));
    const warm=1-Math.sin(Math.PI*clamp(day,0,1));
    const sunDx=-S.dx, sunDy=-S.dy;
    const sm=Math.hypot(sunDx,sunDy)||1;
    const intensity=clamp(elev*(0.35+0.65*warm)*(1-0.75*weatherI)*(1-night*0.85),0,1);
    return {
      active:intensity>0.04,
      intensity,
      elev,
      warm,
      sunDx:sunDx/sm,
      sunDy:sunDy/sm,
      sx:sunDx/sm,
      sy:sunDy/sm,
      weatherI,
      night,
      hour:h,
      flicker:this.flicker,
      time:this.t,
    };
  }

  /** Screen-space sun anchor from view size + sun direction. */
  screenSun(vw,vh,st,margin){
    const m=margin!=null?margin:1.15;
    const cx=vw*0.5, cy=vh*0.5;
    const reach=Math.max(vw,vh)*m;
    return {cx,cy, sx:cx+st.sx*reach, sy:cy+st.sy*reach};
  }

  /** 0..1 how much a world-facing normal catches the sun. */
  faceAlignment(nx,ny,st){
    return clamp(nx*st.sunDx+ny*st.sunDy,0,1);
  }

  drawFlare(ctx,vw,vh,st){
    if(!st.active||st.intensity<0.08) return;
    if((st.weatherI||0)>0.18) return;
    const {sx,sy}=this.screenSun(vw,vh,st);
    const flick=1+st.flicker*0.05;
    const base=st.intensity*flick*0.32;

    ctx.save();
    ctx.globalCompositeOperation="screen";

    // Small hotspot hugging the screen edge — no full-screen god-rays (they band into stripes).
    const pad=72;
    const hx=Math.max(-pad,Math.min(vw+pad,sx));
    const hy=Math.max(-pad,Math.min(vh+pad,sy));
    ctx.globalAlpha=base*0.55;
    ctx.drawImage(this.hot,hx-40,hy-40,80,80);

    ctx.restore();
  }

  /** Bright streak on a glass facade (world coords). */
  drawFacadeGlint(ctx, pts, st, glass, nx, ny){
    if(!st.active||!pts||pts.length<3) return;
    const g=glass!=null?glass:0.7;
    const align=nx!=null&&ny!=null?this.faceAlignment(nx,ny,st):0.5;
    if(align<0.18) return;
    let cx=0,cy=0;
    for(const p of pts){ cx+=p[0]; cy+=p[1]; }
    cx/=pts.length; cy/=pts.length;
    const a=st.intensity*align*g*(0.28+0.32*st.warm);
    if(a<0.03) return;
    const wob=Math.sin(st.time*2.2+cx*0.04+cy*0.03)*0.06;
    const gw=Math.hypot(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]);
    const gh=gw*0.22;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.closePath(); ctx.clip();
    ctx.globalCompositeOperation="screen";
    const ang=Math.atan2(st.sunDy,st.sunDx);
    ctx.translate(cx,cy);
    ctx.rotate(ang);
    const gr=ctx.createRadialGradient(0,0,0,0,0,gw*0.5);
    gr.addColorStop(0,`rgba(255,248,220,${(a*(0.9+wob)).toFixed(3)})`);
    gr.addColorStop(0.45,`rgba(255,210,140,${(a*0.35).toFixed(3)})`);
    gr.addColorStop(1,"rgba(255,200,120,0)");
    ctx.fillStyle=gr;
    ctx.beginPath(); ctx.ellipse(0,0,gw,gh,0,0,7); ctx.fill();
    ctx.fillStyle=`rgba(255,255,255,${(a*0.45).toFixed(3)})`;
    ctx.fillRect(-gw*0.08,-gh*0.12,gw*0.16,gh*0.24);
    ctx.restore();
  }

  /** Specular sparkles on water when the sun grazes the surface. */
  drawWaterGlints(ctx,ox,oy,vw,vh,scoreFn,st,step){
    if(!st.active||st.intensity<0.08) return;
    const sp=step||38, t=st.time;
    const x0=ox-sp, y0=oy-sp, x1=ox+vw+sp, y1=oy+vh+sp;
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    for(let gy=y0; gy<y1; gy+=sp){
      for(let gx=x0; gx<x1; gx+=sp){
        const cx=gx+sp*0.5, cy=gy+sp*0.5;
        const s=scoreFn(cx,cy);
        if(s<=0.05) continue;
        const seed=((Math.floor(cx*0.17)^Math.floor(cy*0.23))>>>0)%997;
        if((seed%7)!==0) continue;
        const tw=0.5+0.5*Math.sin(t*2.8+cx*0.05+cy*0.04+seed);
        if(tw<0.52) continue;
        const a=st.intensity*(0.08+0.22*tw)*s;
        const px=cx+Math.sin(t*1.6+seed)*1.8, py=cy+Math.cos(t*1.4+seed*0.7)*1.2;
        const sl=6+st.warm*10;
        const ang=Math.atan2(st.sunDy,st.sunDx);
        ctx.save();
        ctx.translate(px,py); ctx.rotate(ang);
        ctx.fillStyle=`rgba(255,240,210,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.ellipse(0,0,sl,sl*0.22,0,0,7); ctx.fill();
        ctx.fillStyle=`rgba(255,255,255,${(a*0.7).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(0,0,1.4,0,7); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /** Wet asphalt sun streak along road sample point. */
  drawWetSunStreak(ctx,x,y,ang,width,st,wet){
    if(!st.active||wet<0.12) return;
    const a=st.intensity*wet*0.42;
    if(a<0.03) return;
    ctx.save();
    ctx.translate(x,y); ctx.rotate(ang);
    ctx.globalCompositeOperation="screen";
    const gr=ctx.createLinearGradient(-width*0.5,0,width*0.5,0);
    gr.addColorStop(0,"rgba(255,200,140,0)");
    gr.addColorStop(0.5,`rgba(255,230,190,${a.toFixed(3)})`);
    gr.addColorStop(1,"rgba(255,200,140,0)");
    ctx.fillStyle=gr;
    ctx.fillRect(-width*0.5,-3,width,6);
    ctx.restore();
  }
}

global.SunGlare=SunGlare;
})(typeof window!=="undefined"?window:globalThis);
