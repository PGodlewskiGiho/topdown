/* TOPDOWN CITY — 10-time.js */
/* ---------- day / night ---------- */
const DAY_LENGTH = 210;                 // real seconds per in-game 24h
let clockS = DAY_LENGTH*8/24;           // start at 08:00
let gameHour = 8;
const lerp=(a,b,t)=>a+(b-a)*t;
function updateClock(dt){
  signalClock += dt;
  clockS += dt*(keys["t"]?20:1);        // hold T to fast-forward
  gameHour = ((clockS/DAY_LENGTH)*24) % 24;
  if(gameHour<0) gameHour+=24;
}
function sunShadow(h){
  if(h<6.2 || h>19.3) return null;                            // no sun shadows at night
  const day=(h-6.2)/13.1, elev=Math.sin(Math.PI*day);         // 0 dawn/dusk, 1 midday
  const dirx=(0.5-day)*2.0, diry=0.62, m=Math.hypot(dirx,diry)||1;
  let alpha=0.30*(0.42+0.58*elev) * (1-0.65*weatherI);        // softer when overcast/raining
  return { dx:dirx/m, dy:diry/m, len:2.2-1.75*elev, alpha };  // long shadows at low sun
}
function convexHull(pts){
  pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]); const lo=[],up=[];
  for(const p of pts){ while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop(); lo.push(p); }
  for(let i=pts.length-1;i>=0;i--){ const p=pts[i]; while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}
// ---- block grounds: courtyards, paths, gardens around bloks ----
// A flat tree blob for ground-level greenery (drawn under buildings, no 3D canopy).
function flatTree(cx,cy,s){
  drawTreeCanopy(cx,cy,makeTree(cx,cy,s*1.2,()=>0.4,"deciduous",{city:true}),true);
}
function bushClump(cx,cy,s){
  drawTreeCanopy(cx,cy,makeTree(cx,cy,s*0.8,()=>0.6,"bush",{city:true}),true);
}
function drawBlockGrounds(ox,oy){
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  const seen=new Set(); const bloks=[];
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++) eachMegaNearCell(i,j,m=>{
    if(seen.has(m.id)) return; seen.add(m.id);
    if(m.building.type!=="blok") return;
    bloks.push(m);
  });
  if(!bloks.length) return;

  // ---- per-blok courtyard slab, perimeter path, and front gardens ----
  // Everything must stay within the narrow sidewalk gap (>=26u to the kerb), so the
  // apron is thin and gardens/paths are short stubs that hug the wall.
  for(const m of bloks){
    const b=m.building, x=b.x, y=b.y, w=b.w, h=b.h;
    if(x>ox+VW+120||x+w<ox-120||y>oy+VH+120||y+h<oy-120) continue;
    let rs=(b.gardenSeed*40503)>>>0; const rng=()=>{ rs=(rs*1664525+1013904223)>>>0; return rs/4294967296; };
    const front=b.front;
    // Total ground band around the footprint (stays within the >=26u sidewalk).
    const BAND=24;
    // 1) grass courtyard base filling the whole band
    ctx.fillStyle="#3b5a2a"; ctx.fillRect(x-BAND,y-BAND,w+BAND*2,h+BAND*2);
    ctx.fillStyle="#43662f"; ctx.fillRect(x-BAND+2,y-BAND+2,w+BAND*2-4,h+BAND*2-4);
    const lawnVars=["clump_small","clump_med","clump_wispy"];
    if(typeof drawGrassClumpSprite==="function"&&typeof FOREST_GRASS!=="undefined"&&FOREST_GRASS.ready){
      for(let k=0;k<22;k++){
        const mx=x-BAND+rng()*(w+BAND*2), my=y-BAND+rng()*(h+BAND*2);
        drawGrassClumpSprite(mx,my,5+rng()*4,lawnVars[(rng()*lawnVars.length)|0]);
      }
    } else {
      for(let k=0;k<10;k++){ ctx.fillStyle=rng()<0.5?"#3d5d2b":"#4a7034";
        const mx=x-BAND+rng()*(w+BAND*2), my=y-BAND+rng()*(h+BAND*2);
        ctx.beginPath(); ctx.ellipse(mx,my,8+rng()*10,5+rng()*7,0,0,7); ctx.fill(); }
    }
    // 2) a paved walkway loop hugging the wall (where residents walk), lighter slabs
    const pw0=10;                                                   // walkway width
    ctx.fillStyle="#9a917f";
    ctx.fillRect(x-pw0, y-pw0, w+pw0*2, pw0);                       // top run
    ctx.fillRect(x-pw0, y+h, w+pw0*2, pw0);                         // bottom run
    ctx.fillRect(x-pw0, y, pw0, h);                                 // left run
    ctx.fillRect(x+w, y, pw0, h);                                   // right run
    ctx.fillStyle="#a89e8a";                                        // highlight inner edge
    ctx.fillRect(x-pw0+1, y-pw0+1, w+pw0*2-2, 2);
    // slab seams on the walkway
    ctx.strokeStyle="rgba(0,0,0,.10)"; ctx.lineWidth=1;
    for(let px=x-pw0; px<=x+w+pw0; px+=26){ ctx.beginPath(); ctx.moveTo(px,y-pw0); ctx.lineTo(px,y-pw0+pw0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px,y+h); ctx.lineTo(px,y+h+pw0); ctx.stroke(); }
    // 3) entrance path: a wider paved spur from the front walkway out toward the street
    ctx.fillStyle="#b3a98f";
    if(front===2){ ctx.fillRect(x+w*0.5-15, y+h+pw0, 30, BAND-pw0); }
    else if(front===0){ ctx.fillRect(x+w*0.5-15, y-BAND, 30, BAND-pw0); }
    else if(front===1){ ctx.fillRect(x+w+pw0, y+h*0.5-15, BAND-pw0, 30); }
    else { ctx.fillRect(x-BAND, y+h*0.5-15, BAND-pw0, 30); }
    // 4) planting: trees & shrubs in the grass strip between walkway and kerb,
    // clustered (not evenly spaced) so it looks landscaped
    const outer=BAND-8, inner=pw0+3;                              // greenery centres sit in this ring (leave room for canopy)
    const placeRing=(horiz)=>{
      const along = horiz ? w+BAND*2 : h+BAND*2;
      const n=Math.max(2,(along/70)|0);
      for(let k=0;k<n;k++){
        const t=(k+0.4+rng()*0.3)/n;
        const side=rng()<0.5?-1:1;
        let gx,gy;
        if(horiz){ gx=x-BAND+along*t; gy = side<0 ? y-(inner+rng()*(outer-inner)) : y+h+(inner+rng()*(outer-inner)); }
        else     { gy=y-BAND+along*t; gx = side<0 ? x-(inner+rng()*(outer-inner)) : x+w+(inner+rng()*(outer-inner)); }
        if(front===2 && gy>y+h && Math.abs(gx-(x+w*0.5))<22) continue;
        if(front===0 && gy<y && Math.abs(gx-(x+w*0.5))<22) continue;
        if(front===1 && gx>x+w && Math.abs(gy-(y+h*0.5))<22) continue;
        if(front===3 && gx<x && Math.abs(gy-(y+h*0.5))<22) continue;
        const roll=rng();
        if(roll<0.4) flatTree(gx,gy,9+rng()*3);                   // small canopies only (fit the band)
        else if(roll<0.8) bushClump(gx,gy,5+rng()*3);
        else { const fc=rng()<0.5?"#b56b54":"#c98a5e"; ctx.fillStyle=fc; for(let f=0;f<5;f++){ const a=f*1.3; ctx.beginPath(); ctx.arc(gx+Math.cos(a)*4,gy+Math.sin(a)*3,2.0,0,7); ctx.fill(); } ctx.fillStyle="#5a7a3a"; ctx.beginPath(); ctx.arc(gx,gy,2.4,0,7); ctx.fill(); }  // muted flower bed
      }
    };
    placeRing(b.longHoriz);
  }
}
function drawShadows(ox,oy){
  const S=sunShadow(gameHour); if(!S||S.alpha<0.02) return;
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  ctx.fillStyle=`rgba(10,12,20,${S.alpha.toFixed(3)})`;
  // mega landmark buildings cast long shadows too (they live outside L.buildings)
  { const seenS=new Set();
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++) eachMegaNearCell(i,j,m=>{
      if(seenS.has(m.id)) return; seenS.add(m.id);
      const b=m.building; if(b.x>ox+VW+160||b.x+b.w<ox-160||b.y>oy+VH+220||b.y+b.h<oy-160) return;
      const off=Math.min((b.H||40)*S.len,260); if(off<4) return;
      const dx=S.dx*off, dy=S.dy*off, x=b.x,y=b.y,w=b.w,h=b.h;
      fillPoly(convexHull([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x+dx,y+dy],[x+w+dx,y+dy],[x+w+dx,y+h+dy],[x+dx,y+h+dy]]));
    }); }
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j);
    for(const b of L.buildings){ if(b.x>ox+VW+80||b.x+b.w<ox-80||b.y>oy+VH+120||b.y+b.h<oy-80) continue;
      const off=Math.min((b.H||20)*S.len,210); if(off<4) continue; const dx=S.dx*off, dy=S.dy*off, x=b.x,y=b.y,w=b.w,h=b.h;
      fillPoly(convexHull([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x+dx,y+dy],[x+w+dx,y+dy],[x+w+dx,y+h+dy],[x+dx,y+h+dy]])); }
    for(const p of L.props){ if(p.t!=="tree") continue; if(p.x<ox-160||p.x>ox+VW+160||p.y<oy-220||p.y>oy+VH+80) continue;
      const cr=p.crownR||p.s*0.3, off=cr*S.len*0.6, cx=p.x+S.dx*off, cy=p.y+S.dy*off, w=cr*1.05;
      ctx.beginPath(); ctx.ellipse(cx,cy,w,w*0.5,0,0,7); ctx.fill(); }
    if(L.lamps) for(const lm of L.lamps){ if(lm.fall) continue; if(lm.x<ox-40||lm.x>ox+VW+40||lm.y<oy-40||lm.y>oy+VH+40) continue;
      const off=40*S.len, ex=lm.x+S.dx*off, ey=lm.y+S.dy*off;
      ctx.beginPath(); ctx.moveTo(lm.x-2,lm.y); ctx.lineTo(lm.x+2,lm.y); ctx.lineTo(ex+2,ey); ctx.lineTo(ex-2,ey); ctx.closePath(); ctx.fill(); }
    if(L.signals) for(const s of L.signals){ if(s.fall) continue; if(s.x<ox-40||s.x>ox+VW+40||s.y<oy-40||s.y>oy+VH+40) continue;
      const off=26*S.len, ex=s.x+S.dx*off, ey=s.y+S.dy*off;
      ctx.beginPath(); ctx.moveTo(s.x-1.5,s.y); ctx.lineTo(s.x+1.5,s.y); ctx.lineTo(ex+1.5,ey); ctx.lineTo(ex-1.5,ey); ctx.closePath(); ctx.fill(); }
  }
}
function nightFactor(h){
  if(h>=7 && h<=18) return 0;
  if(h>18 && h<21) return (h-18)/3;     // dusk ramp
  if(h>=21 || h<5) return 1;            // deep night
  return 1-(h-5)/2;                     // dawn ramp 5..7
}
function phaseName(h){ if(h<5)return"NOC"; if(h<7)return"ŚWIT"; if(h<18)return"DZIEŃ"; if(h<20)return"ZMIERZCH"; return"NOC"; }
function lampPool(x,y,r,a){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,`rgba(255,206,140,${a})`); g.addColorStop(1,"rgba(255,206,140,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
}
function carLights(c,N){
  const L=c.L||40, hw=(c.W||16)*0.5, fx=L*0.46, near=fx, far=fx+66;
  ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.a);
  // soft twin headlight beams on the road (additive); longer + brighter on wet asphalt
  const wf=1+0.45*wetness, len=72*(1+0.35*wetness), moto=(c.kind==="moto"||c.kind==="bike");
  ctx.save(); ctx.globalCompositeOperation="lighter";
  for(const sgn of (moto?[0]:[-1,1])){
    const sx=fx, sy=sgn*hw*0.5, spread=hw*1.6+8;
    const gr=ctx.createRadialGradient(sx,sy,2, sx,sy,len);
    gr.addColorStop(0,`rgba(255,246,214,${(0.34*N*wf).toFixed(3)})`);
    gr.addColorStop(0.45,`rgba(255,243,205,${(0.12*N*wf).toFixed(3)})`);
    gr.addColorStop(1,"rgba(255,243,205,0)");
    ctx.fillStyle=gr;
    ctx.beginPath(); ctx.moveTo(sx,sy);
    ctx.lineTo(sx+len, sy-spread); ctx.lineTo(sx+len, sy+spread); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // crisp headlight points
  ctx.fillStyle=`rgba(255,251,228,${Math.min(1,0.95*N)})`;
  ctx.beginPath(); ctx.arc(fx,-hw*0.55,2.1,0,7); ctx.arc(fx,hw*0.55,2.1,0,7); ctx.fill();
  // tail-light points + soft red rear glow
  ctx.fillStyle=`rgba(255,58,40,${Math.min(1,0.9*N)})`;
  ctx.beginPath(); ctx.arc(-L*0.46,-hw*0.55,1.7,0,7); ctx.arc(-L*0.46,hw*0.55,1.7,0,7); ctx.fill();
  const tg=ctx.createRadialGradient(-L*0.52,0,0,-L*0.52,0,13);
  tg.addColorStop(0,`rgba(255,58,40,${0.28*N})`); tg.addColorStop(1,"rgba(255,58,40,0)");
  ctx.fillStyle=tg; ctx.beginPath(); ctx.arc(-L*0.52,0,13,0,7); ctx.fill();
  ctx.restore();
}
function drawLights(ox,oy,N){
  const i0=Math.floor((ox-NODE_VAR)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR)/GAP)+2;
  const tt=performance.now()/1000;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); if(!L.lamps) continue; for(const lm of L.lamps){ if(lm.dead) continue;
    if(lm.hx<ox-80||lm.hx>ox+VW+80||lm.hy<oy-80||lm.hy>oy+VH+80) continue;
    const LH=40, bx=lm.hx, by=lm.hy-LH+6;                                                      // light source = the raised bulb
    const bg=ctx.createRadialGradient(bx,by,0,bx,by,8); bg.addColorStop(0,`rgba(255,238,196,${(0.55*N).toFixed(3)})`); bg.addColorStop(1,"rgba(255,238,196,0)");
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(bx,by,8,0,7); ctx.fill();                       // bulb glow
    const cone=ctx.createLinearGradient(bx,by,bx,lm.hy+8); cone.addColorStop(0,`rgba(255,224,168,${(0.22*N).toFixed(3)})`); cone.addColorStop(1,"rgba(255,214,150,0)");
    ctx.fillStyle=cone; ctx.beginPath(); ctx.moveTo(bx-3,by); ctx.lineTo(bx+3,by); ctx.lineTo(bx+26,lm.hy+8); ctx.lineTo(bx-26,lm.hy+8); ctx.closePath(); ctx.fill();   // beam spreads from the bulb to the ground
    lampPool(lm.hx, lm.hy, 30, 0.26*N);                                                        // pool where the light lands
    if(wetness>0.15){ const len=22+30*wetness, gg=ctx.createLinearGradient(lm.hx,lm.hy-3,lm.hx,lm.hy+len);   // soft reflection on wet road
      gg.addColorStop(0,`rgba(255,210,150,${(0.24*N*wetness).toFixed(3)})`); gg.addColorStop(1,"rgba(255,210,150,0)");
      ctx.fillStyle=gg; ctx.beginPath(); ctx.ellipse(lm.hx, lm.hy+len*0.5, 3.2, len*0.5, 0, 0, 7); ctx.fill(); }
    if(inWater(lm.hx,lm.hy+16)) waterReflect(lm.hx, lm.hy+4, "255,206,140", 30, 0.32*N, tt); } }
  ctx.fillStyle=`rgba(255,224,160,${0.72*N})`;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); for(const b of L.buildings){
    if(b.x>ox+VW+40||b.x+b.w<ox-40||b.y>oy+VH+40||b.y+b.h<oy-40) continue;
    const[vx,vy]=leanVec(b); const base=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]], roof=base.map(p=>[p[0]+vx,p[1]+vy]);
    for(const[ai,ci,nx,ny]of[[0,1,0,-1],[1,2,1,0],[2,3,0,1],[3,0,-1,0]]){ if(nx*vx+ny*vy>=0) continue;
      const a=base[ai],cc=base[ci],ar=roof[ai]; const ux=cc[0]-a[0],uy=cc[1]-a[1],hx=ar[0]-a[0],hy=ar[1]-a[1];
      const L2=Math.hypot(ux,uy),Hh=Math.hypot(hx,hy); if(Hh<6) continue;
      const Pf=(t,u)=>[a[0]+ux*t+hx*u, a[1]+uy*t+hy*u], seed=((Math.round(a[0])*131+Math.round(a[1])*97)>>>0);
      if(b.type==="house"){ if((seed&1)===0){const p=Pf(0.18,0.54); ctx.fillRect(p[0]-2,p[1]-2.4,4,5);} if((seed&2)===0){const p=Pf(0.78,0.54); ctx.fillRect(p[0]-2,p[1]-2.4,4,5);} continue; }
      const glass=b.type==="tower", rows=Math.max(2,Math.round(Hh/(glass?8:10))), cols=Math.max(1,Math.round(L2/(glass?11:13)));
      for(let r=0;r<rows;r++) for(let cn=0;cn<cols;cn++){ if(((r*7+cn*11+seed)>>>0)%5!==0) continue; const p=Pf((cn+0.5)/cols,(r+0.42)/rows); ctx.fillRect(p[0]-1.7,p[1]-1.5,3.4,3); } }
  } }
  carLights(car,N);
  for(const c of traffic){ if(c.x<ox-80||c.x>ox+VW+80||c.y<oy-80||c.y>oy+VH+80) continue; carLights(c,N); }
  for(const c of cops){ if(c.x<ox-80||c.x>ox+VW+80||c.y<oy-80||c.y>oy+VH+80) continue; carLights(c,N); sirenGlow(c,N); }
  for(const h of helis){ if(h.x<ox-120||h.x>ox+VW+120||h.y<oy-120||h.y>oy+VH+120) continue;
    ctx.fillStyle="rgba(255,60,60,.12)"; ctx.beginPath(); ctx.arc(h.x,h.y,18,0,7); ctx.fill(); }
  for(const b of boats){ if(b.x<ox-60||b.x>ox+VW+60||b.y<oy-60||b.y>oy+VH+60) continue; waterReflect(b.x, b.y+5, "230,240,255", 24, 0.34*N, tt); }
}
const clockEl=document.getElementById("clock");
function drawClock(){
  const h=gameHour, hh=Math.floor(h), mm=Math.floor((h-hh)*60);
  clockEl.textContent=`${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")} · ${phaseName(h)} · ${weatherLabel(weatherI)}`;
}

