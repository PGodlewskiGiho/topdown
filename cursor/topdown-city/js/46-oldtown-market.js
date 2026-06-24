/* TOPDOWN CITY — 46-oldtown-market.js — Starówka + Rynek (old town market square) */

const MARKET_NODE={i:4,j:3};
const MARKET_NAME="Rynek Vesper";
let _marketStalls=null;

function inSpawnCity(i,j){
  const c=nearestCity(i,j);
  return c.id===0;
}

function isOldTownCell(i,j){
  if(!inSpawnCity(i,j)) return false;
  const c=nearestCity(i,j);
  const di=i-Math.round(c.cx), dj=j-Math.round(c.cy);
  const f=(c.dist+(hsh(i,j,303)-0.5)*1.6)/c.R;
  if(f<0.44||f>0.74) return false;
  if(di<-2||dj<-2) return false;
  return di+dj>=1 && di+dj<=9;
}

function isMarketNode(i,j){
  return inSpawnCity(i,j)&&i===MARKET_NODE.i&&j===MARKET_NODE.j;
}

function rynekR(i,j){
  return (typeof plazaR==="function"?plazaR(i,j):80)*1.12+18;
}

function inRynek(x,y){
  if(!inSpawnCity(Math.round(x/GAP),Math.round(y/GAP))) return false;
  const A=node(MARKET_NODE.i,MARKET_NODE.j), R=rynekR(MARKET_NODE.i,MARKET_NODE.j);
  return (x-A[0])**2+(y-A[1])**2<R*R;
}

function ensureMarketStalls(){
  if(_marketStalls) return _marketStalls;
  const A=node(MARKET_NODE.i,MARKET_NODE.j), R=rynekR(MARKET_NODE.i,MARKET_NODE.j);
  const kinds=[
    {id:"produce",col:"#5a8a38",top:"#e05040",label:"WARZYWA"},
    {id:"fish",col:"#4a6878",top:"#88b8d8",label:"RYBY"},
    {id:"bread",col:"#a87848",top:"#e8c878",label:"PIEKARNIA"},
    {id:"cheese",col:"#c8a858",top:"#f0e0a8",label:"SER"},
    {id:"flowers",col:"#6a8a48",top:"#e87898",label:"KWiaty"},
    {id:"cloth",col:"#7a5a88",top:"#d8a8c8",label:"TKANINY"},
    {id:"pottery",col:"#8a6848",top:"#d8b898",label:"GARNEK"},
    {id:"spices",col:"#8a5038",top:"#e8a040",label:"PRZYPRAWY"},
    {id:"meat",col:"#6a4040",top:"#c86858",label:"MIĘSO"},
    {id:"honey",col:"#a88838",top:"#f0d060",label:"MIÓD"},
    {id:"craft",col:"#5a6858",top:"#c8b888",label:"RĘKODZIEŁO"},
    {id:"cafe",col:"#6a5040",top:"#e8d8c0",label:"KAWA"},
  ];
  _marketStalls=[];
  for(let k=0;k<kinds.length;k++){
    const ang=k/kinds.length*6.283-0.4, rad=R*0.58+((k%3)-1)*6;
    const kind=kinds[k];
    _marketStalls.push({
      x:A[0]+Math.cos(ang)*rad, y:A[1]+Math.sin(ang)*rad,
      a:ang+Math.PI/2, kind:kind.id, col:kind.col, top:kind.top, label:kind.label,
      w:22+(k%3)*4, d:14+(k%2)*3,
    });
  }
  return _marketStalls;
}

function drawCobbleRect(x,y,w,h,seed){
  const step=14;
  ctx.fillStyle="#a89e8c";
  ctx.fillRect(x,y,w,h);
  for(let gy=y; gy<y+h; gy+=step){
    for(let gx=x; gx<x+w; gx+=step){
      const n=((Math.floor(gx/step)*17^Math.floor(gy/step)*23^seed)>>>0)%5;
      const c=["#9a9084","#a89e90","#b0a898","#948a7c","#aca294"][n];
      ctx.fillStyle=c;
      const ox=(gy/step|0)%2?step*0.5:0;
      ctx.fillRect(gx+ox,gy,step-1.5,step-1.5);
    }
  }
}

function drawOldTownLot(L){
  if(!L.oldtown||L.water||L.mountain) return;
  drawCobbleRect(L.x,L.y,L.w,L.h,(L.i*97+L.j*53)>>>0);
  if(L.buildings.length) return;
  ctx.strokeStyle="rgba(90,82,70,.22)"; ctx.lineWidth=1;
  const cx=L.x+L.w*0.5, cy=L.y+L.h*0.5;
  ctx.beginPath(); ctx.arc(cx,cy,Math.min(L.w,L.h)*0.12,0,7); ctx.stroke();
}

function drawMarketStall(s,t){
  ctx.save();
  ctx.translate(s.x,s.y);
  ctx.rotate(s.a);
  ctx.fillStyle="rgba(0,0,0,.18)";
  ctx.beginPath(); ctx.ellipse(0,4,s.w*0.55,s.d*0.35,0,0,7); ctx.fill();
  ctx.fillStyle=s.col;
  ctx.fillRect(-s.w*0.5,-s.d*0.5,s.w,s.d);
  ctx.fillStyle=shade(s.col,-18);
  ctx.fillRect(-s.w*0.5,-s.d*0.5,s.w,s.d*0.22);
  const stripe=ctx.createLinearGradient(0,-s.d*0.5,0,-s.d*0.5-16);
  stripe.addColorStop(0,s.top); stripe.addColorStop(1,shade(s.top,-12));
  ctx.fillStyle=stripe;
  ctx.beginPath();
  ctx.moveTo(-s.w*0.52,-s.d*0.5);
  ctx.lineTo(s.w*0.52,-s.d*0.5);
  ctx.lineTo(s.w*0.38,-s.d*0.5-14-Math.sin(t*2+s.x*0.02)*1.5);
  ctx.lineTo(-s.w*0.38,-s.d*0.5-12-Math.sin(t*2.3+s.y*0.02)*1.5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle=s.top;
  for(let k=-2;k<=2;k++){
    ctx.fillRect(k*5.5-1,-s.d*0.5-11,2,10+Math.sin(t*3+k+s.x*0.01)*0.8);
  }
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="bold 5px monospace";
  ctx.textAlign="center";
  ctx.fillText(s.label,0,s.d*0.15);
  ctx.fillStyle="rgba(0,0,0,.2)";
  ctx.fillRect(-s.w*0.5,s.d*0.5-2,s.w,2);
  ctx.restore();
}

function drawRynekFountain(cx,cy,t){
  ctx.fillStyle="#8a8074";
  ctx.beginPath(); ctx.ellipse(cx,cy,28,22,0,0,7); ctx.fill();
  ctx.fillStyle="#6a7878";
  ctx.beginPath(); ctx.ellipse(cx,cy,22,17,0,0,7); ctx.fill();
  const wave=Math.sin(t*2.2)*1.2;
  ctx.fillStyle="#5a8898";
  ctx.beginPath(); ctx.ellipse(cx,cy+wave,18,12,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(200,230,245,.45)";
  ctx.beginPath(); ctx.ellipse(cx-4,cy-2+wave,8,5,-0.3,0,7); ctx.fill();
  ctx.fillStyle="#a8a094";
  ctx.fillRect(cx-3,cy-18,6,20);
  ctx.fillStyle="#b8b0a4";
  for(let k=0;k<4;k++){
    const a=k/4*6.283+t*0.4;
    ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*10,cy-16+Math.sin(a)*4,4,2,a,0,7); ctx.fill();
  }
  ctx.fillStyle="#d8d0c4";
  ctx.beginPath(); ctx.arc(cx,cy-20,5,0,7); ctx.fill();
}

function drawRynek(ox,oy){
  if(!inSpawnCity(Math.round((ox+VW*0.5)/GAP),Math.round((oy+VH*0.5)/GAP))) return;
  const i=MARKET_NODE.i, j=MARKET_NODE.j;
  const cx=nX(i,j), cy=nY(i,j);
  if(cx<ox-200||cx>ox+VW+200||cy<oy-200||cy>oy+VH+200) return;
  const R=rynekR(i,j), t=performance.now()/1000;
  ctx.save();
  drawCobbleRect(cx-R,cy-R,R*2,R*2,771);
  ctx.strokeStyle="rgba(100,92,80,.55)"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke();
  ctx.strokeStyle="rgba(120,110,96,.35)"; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(cx,cy,R*0.72,0,7); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,R*0.38,0,7); ctx.stroke();
  for(let a=0;a<8;a++){
    const ang=a/8*6.283;
    ctx.strokeStyle="rgba(110,100,88,.28)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(ang)*R,cy+Math.sin(ang)*R); ctx.stroke();
  }
  drawRynekFountain(cx,cy,t);
  const stalls=ensureMarketStalls();
  for(const s of stalls){
    if(s.x<ox-40||s.x>ox+VW+40||s.y<oy-40||s.y>oy+VH+40) continue;
    drawMarketStall(s,t);
  }
  ctx.fillStyle="rgba(40,36,32,.75)";
  ctx.font="bold 11px monospace";
  ctx.textAlign="center";
  ctx.fillText(MARKET_NAME,cx,cy-R+16);
  ctx.restore();
}

function drawHistoricFacade(b,a,cc,ar,P,fillPoly){
  if(!b.historic) return false;
  const cr=[cc[0]+(ar[0]-a[0]), cc[1]+(ar[1]-a[1])];
  const wp=typeof getTex==="function"?getTex("stonetex"):null;
  if(wp){ ctx.save(); ctx.fillStyle=wp; fillPoly([a,cc,cr,ar]); ctx.restore(); }
  ctx.strokeStyle="rgba(72,52,36,.55)"; ctx.lineWidth=1.4;
  for(let t=0.08;t<0.92;t+=0.22){
    fillPoly([P(t,0),P(t+0.04,0),P(t+0.04,1),P(t,1)]);
    ctx.beginPath(); ctx.moveTo(P(t,0)[0],P(t,0)[1]); ctx.lineTo(P(t,1)[0],P(t,1)[1]); ctx.stroke();
  }
  for(let u=0.12;u<0.88;u+=0.28){
    ctx.beginPath(); ctx.moveTo(P(0,u)[0],P(0,u)[1]); ctx.lineTo(P(1,u)[0],P(1,u)[1]); ctx.stroke();
  }
  ctx.fillStyle="rgba(40,28,18,.92)"; fillPoly([P(0.40,0),P(0.58,0),P(0.58,0.68),P(0.40,0.68)]);
  ctx.fillStyle="#b8d0e0";
  fillPoly([P(0.12,0.36),P(0.28,0.36),P(0.28,0.72),P(0.12,0.72)]);
  fillPoly([P(0.72,0.36),P(0.88,0.36),P(0.88,0.72),P(0.72,0.72)]);
  ctx.fillStyle="#5a8a38";
  fillPoly([P(0.10,0.74),P(0.30,0.74),P(0.30,0.82),P(0.10,0.82)]);
  fillPoly([P(0.70,0.74),P(0.90,0.74),P(0.90,0.82),P(0.70,0.82)]);
  return true;
}

function pedEnterRynek(p){
  const A=node(MARKET_NODE.i,MARKET_NODE.j);
  p.plaza={i:MARKET_NODE.i,j:MARKET_NODE.j,cx:A[0],cy:A[1],r:Math.max(36,rynekR(MARKET_NODE.i,MARKET_NODE.j)-22),market:true};
  p.onGraph=false; p.plazaT=rand(8,18); p.repick=0; p._wait=false; p.cross=0;
}

Game.register({
  id:"oldtown-market",
  order:46,
  drawAfterRoads(ox,oy){
    const i0=Math.floor((ox-NODE_VAR*2)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
    const j0=Math.floor((oy-NODE_VAR*2)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
      const L=getLot(i,j);
      if(L.oldtown) drawOldTownLot(L);
    }
    drawRynek(ox,oy);
  },
  drawMap(mctx,opts){
    if(!opts||!opts.world) return;
    const A=node(MARKET_NODE.i,MARKET_NODE.j);
    const ms=opts.mapScale||1, ox=opts.ox||0, oy=opts.oy||0;
    const x=(A[0]-ox)*ms, y=(A[1]-oy)*ms;
    mctx.fillStyle="#c87838";
    mctx.beginPath(); mctx.arc(x,y,5*ms,0,7); mctx.fill();
    mctx.strokeStyle="rgba(255,255,255,.7)"; mctx.lineWidth=1;
    mctx.stroke();
    mctx.fillStyle="#fff";
    mctx.font=`${Math.max(7,8*ms)}px monospace`;
    mctx.textAlign="center";
    mctx.fillText("Rynek",x,y-7*ms);
  },
});
