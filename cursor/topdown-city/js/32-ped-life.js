/* TOPDOWN CITY — 32-ped-life.js */
/* Civilian routines, environmental awareness, destinations, witness reactions */

const PED_LINES={
  chat:["Hej, co słychać?","Piękna pogoda.","Spieszę się do pracy.","Widziałeś to?","Czekam na autobus.","Dziś tłoczno w centrum."],
  phone:["Tak, jestem w drodze.","O której?","Do zobaczenia!","Jeszcze chwilę...","Poczekaj, zaraz będę.","Nie mogę teraz rozmawiać."],
  honk:["Hej!","Uważaj!","Co jest?!","Spokojnie z klaksonem!"],
  police:["Co się dzieje?","Znowu syrena...","Lepiej odejdę stąd.","Coś się dzieje na ulicy."],
  gun:["O mój Boże!","Uciekaj!","Pomocy!","Strzelają!"],
  witness:["Dzwonię na policję!","Tu jest napad!","Szybko, tu coś się dzieje!","Policja!"],
  idle:["Hmm...","Chyba posiedzę chwilę.","* rozgląda się *","Ciekawe, co tu słychać."],
  rain:["Deszcz nie ustaje...","Gdzie mój parasol?","Przemoknę cały."],
  night:["Późno już...","Cicho tu nocą.","Chyba pójdę do domu."],
  weapon:["Co on planuje?!","Broń?!","Lepiej się odsunąć."],
  shop:["Ciekawa witryna.","Może coś kupię.","Ładne to wygląda."],
  plaza:["Miło tu usiąść.","Fajna fontanna.","Dobra przerwa."],
  group:["Idziemy?","Czekajcie na mnie!","Tu jesteśmy."],
};

const PED_SCHEDULES={
  city_business:{
    blocks:[
      {h0:7,h1:10, preferred:["work","transit"], speed:1.18, dwell:[18,32], searchR:16},
      {h0:11,h1:14, preferred:["plaza","shop"], speed:0.82, dwell:[22,40], searchR:12},
      {h0:16,h1:19, preferred:["transit","shop"], speed:1.12, dwell:[16,28], searchR:14},
    ],
    default:{preferred:["work","shop","plaza"], speed:1, dwell:[14,26], searchR:10},
  },
  city_worker:{
    blocks:[
      {h0:6,h1:9, preferred:["work","transit"], speed:1.08, dwell:[20,34], searchR:14},
      {h0:12,h1:13, preferred:["plaza","shop"], speed:0.9, dwell:[16,24], searchR:10},
      {h0:17,h1:20, preferred:["transit","shop"], speed:1.05, dwell:[18,30], searchR:12},
    ],
    default:{preferred:["work","transit","shop"], speed:0.96, dwell:[12,22], searchR:10},
  },
  city_elder:{
    blocks:[
      {h0:8,h1:11, preferred:["plaza","park","church"], speed:0.72, dwell:[28,50], searchR:12},
      {h0:14,h1:17, preferred:["park","plaza","cemetery"], speed:0.68, dwell:[30,55], searchR:14},
    ],
    default:{preferred:["plaza","park","church"], speed:0.7, dwell:[24,42], searchR:12},
  },
  city_teen:{
    blocks:[
      {h0:14,h1:18, preferred:["plaza","shop","transit"], speed:1.15, dwell:[10,18], searchR:12},
      {h0:19,h1:22, preferred:["plaza","shop"], speed:1.05, dwell:[12,22], searchR:10},
    ],
    default:{preferred:["plaza","shop","transit"], speed:1.08, dwell:[8,16], searchR:10},
  },
  city_punk:{
    default:{preferred:["plaza","shop","transit"], speed:1.02, dwell:[10,20], searchR:10},
  },
  city_casual:{
    default:{preferred:["shop","plaza","park","transit"], speed:1, dwell:[14,28], searchR:11},
  },
  forest_hiker:{
    default:{preferred:["trail","park"], speed:0.92, dwell:[20,38], searchR:18},
  },
  forest_local:{
    default:{preferred:["trail","park"], speed:0.88, dwell:[18,34], searchR:16},
  },
  desert_nomad:{
    default:{preferred:["shop","park"], speed:0.94, dwell:[16,30], searchR:14},
  },
  desert_worker:{
    default:{preferred:["work","shop"], speed:0.9, dwell:[14,24], searchR:12},
  },
  sea_tourist:{
    default:{preferred:["coast","plaza","shop"], speed:0.9, dwell:[20,36], searchR:16},
  },
  sea_fisher:{
    default:{preferred:["coast","work"], speed:0.82, dwell:[22,40], searchR:14},
  },
  armed_thug:{
    default:{preferred:["shop","transit"], speed:1.05, dwell:[10,18], searchR:10},
  },
};

function pedArchKey(p){ return p.archId||"city_casual"; }

function pedSchedulePhase(p){
  const arch=PED_SCHEDULES[pedArchKey(p)]||PED_SCHEDULES.city_casual;
  const h=typeof gameHour!=="undefined"?gameHour:12;
  for(const b of arch.blocks||[]){
    if(h>=b.h0 && h<b.h1) return b;
  }
  return arch.default;
}

function pedFindPOI(x,y,kind,searchR){
  const ci=Math.floor(x/GAP), cj=Math.floor(y/GAP), R=searchR||12;
  let best=null, bd=1e18;
  for(let i=ci-R;i<=ci+R;i++) for(let j=cj-R;j<=cj+R;j++){
    let ok=false, px=0, py=0;
    const L=getLot(i,j);
    if(kind==="plaza" && isPlaza(i,j)){ ok=true; px=nX(i,j); py=nY(i,j); }
    else if(kind==="salon" && salon){ ok=true; px=salon.cx; py=salon.cy; }
    else if(kind==="gunshop" && gunshop){ ok=true; px=gunshop.cx; py=gunshop.cy; }
    else if(kind==="church" && L.church){ ok=true; px=L.x+L.w/2; py=L.y+L.h/2; }
    else if(kind==="cemetery" && L.cemetery){ ok=true; px=L.x+L.w/2; py=L.y+L.h/2; }
    else if(kind==="work" && biomeOf(i,j)==="city"){
      const z=cityZone(i,j);
      if((z==="downtown"||z==="midrise") && nodeDegree(i,j)>=2){ ok=true; px=nX(i,j); py=nY(i,j); }
    }
    else if(kind==="shop" && L.buildings.length && biomeOf(i,j)==="city" && cityZone(i,j)!=="downtown"){
      ok=true; px=L.x+L.w/2; py=L.y+L.h/2;
    }
    else if(kind==="transit" && biomeOf(i,j)==="city" && nodeDegree(i,j)>=3){ ok=true; px=nX(i,j); py=nY(i,j); }
    else if(kind==="coast" && biomeOf(i,j)==="sea" && coastalLot(i,j)){
      ok=true; px=(nX(i,j)+nX(i+1,j+1))*0.25+(nX(i+1,j)+nX(i,j+1))*0.25;
      py=(nY(i,j)+nY(i+1,j+1))*0.25+(nY(i+1,j)+nY(i,j+1))*0.25;
    }
    else if(kind==="trail" && typeof forestTrailNode==="function" && forestTrailNode(i,j)){ ok=true; px=nX(i,j); py=nY(i,j); }
    else if(kind==="park"){
      if(isPlaza(i,j)){ ok=true; px=nX(i,j); py=nY(i,j); }
      else if(L.empty && L.zone==="suburb" && L.w>120){ ok=true; px=L.x+L.w/2; py=L.y+L.h/2; }
    }
    if(!ok) continue;
    const d=(px-x)**2+(py-y)**2;
    if(d<bd){ bd=d; best={x:px,y:py,kind,i,j}; }
  }
  return best;
}

function assignPedDestination(p, force){
  if(!force && p.dest && p.destT>0) return;
  const phase=pedSchedulePhase(p);
  const ci=Math.floor((p.x-ROAD)/GAP), cj=Math.floor((p.y-ROAD)/GAP);
  const biome=biomeOf(ci,cj), zone=biome==="city"?cityZone(ci,cj):"outer";
  for(const kind of phase.preferred){
    const pt=pedFindPOI(p.x,p.y,kind,phase.searchR);
    if(pt){ p.dest=pt; p.destT=rand(phase.dwell[0],phase.dwell[1]); p._sched=phase; return; }
  }
  let tries=0, nx, ny;
  do{
    const ang=rng()*6.283, dist=rand(80,240);
    nx=p.x+Math.cos(ang)*dist; ny=p.y+Math.sin(ang)*dist;
    tries++;
  }while((inBuilding(nx,ny,p.r)||inWater(nx,ny))&&tries<12);
  p.dest={x:nx,y:ny,kind:"wander",i:ci,j:cj};
  p.destT=rand(phase.dwell[0]*0.6, phase.dwell[1]*0.8);
  p._sched=phase;
}

function initPedLife(p){
  p._life=true;
  p.mood=rand(0.45,0.82);
  p.awareness=0;
  p.lookA=p.a;
  p.lookT=0;
  p.speech=null;
  p.speechT=0;
  p.dest=null;
  p.destT=rand(8,20);
  p.groupId=null;
  p.groupLead=false;
  p.groupMate=null;
  p.phone=rng()<0.24;
  p.witnessCd=0;
  p.shelterSeek=0;
  p.idleAct=null;
  p.idleT=0;
  p.baseSpeed=p.speed;
  p._speedMul=1;
  assignPedDestination(p,true);
  maybeFormPedGroup(p);
}

function maybeFormPedGroup(p){
  if(p.groupId||rng()>0.14) return;
  for(const o of peds){
    if(o===p||o.groupId||o.state==="down"||o.hostile||o.panic>0) continue;
    const dd=(o.x-p.x)**2+(o.y-p.y)**2;
    if(dd>75*75||dd<8*8) continue;
    const gid=((Math.floor(p.x/40)*73856093)^(Math.floor(p.y/40)*19349663))>>>0;
    p.groupId=gid; p.groupLead=true; p.groupMate=o;
    o.groupId=gid; o.groupLead=false; o.groupMate=p;
    if(!o._life) initPedLife(o);
    o.dest=p.dest; o.destT=p.destT;
    p.speech=pick(PED_LINES.group); p.speechT=1.8;
    o.speech=pick(PED_LINES.group); o.speechT=1.8;
    return;
  }
}

function pedSay(p, lines, dur){
  p.speech=pick(lines); p.speechT=dur||rand(1.4,2.6);
}

function pedFaceInterest(p,x,y,dur){
  p.lookA=Math.atan2(y-p.y,x-p.x);
  p.lookT=Math.max(p.lookT,dur||0.7);
}

function pedPickTurnLife(p){
  if(!p.dest) return false;
  const at=p.pb, from=p.pa;
  let nb=neighbors(at[0],at[1]).filter(n=>!(n[0]===from[0]&&n[1]===from[1]));
  if(!nb.length) return false;
  const tx=p.dest.x, ty=p.dest.y;
  let best=nb[0], bs=-1e9;
  for(const n of nb){
    const nx=nX(n[0],n[1]), ny=nY(n[0],n[1]);
    const toward=1/(1+Math.hypot(nx-tx,ny-ty));
    const noise=(hsh(n[0],n[1],p.groupId||77)-0.5)*0.08;
    const sc=toward+noise;
    if(sc>bs){ bs=sc; best=n; }
  }
  p.pa=[at[0],at[1]]; p.pb=best; p.pt=0; p._wait=false; p.cross=0;
  return true;
}

function pedDecideLife(p){
  if(p.dest && p.dest.kind==="plaza" && isPlaza(p.pb[0],p.pb[1]) && rng()<0.55){
    pedEnterPlaza(p); p.destT=rand(8,16); return true;
  }
  if(p.dest && p.dest.kind!=="wander" && p.pb){
    const nd=node(p.pb[0],p.pb[1]);
    if(Math.hypot(nd[0]-p.dest.x,nd[1]-p.dest.y)<nodeMaxWidth(p.pb[0],p.pb[1])+40){
      if(rng()<0.45){
        p.idleAct=p.dest.kind==="shop"?"window_shop":(p.dest.kind==="plaza"?"plaza_rest":"idle_look");
        p.idleT=rand(3,8);
        if(p.idleAct==="window_shop") pedSay(p,PED_LINES.shop);
        else if(p.idleAct==="plaza_rest") pedSay(p,PED_LINES.plaza);
        p.destT=0;
        return true;
      }
    }
  }
  return false;
}

function pedLifeSpeedMul(p){
  const phase=p._sched||pedSchedulePhase(p);
  let mul=phase.speed||1;
  const h=typeof gameHour!=="undefined"?gameHour:12;
  if(h<6||h>22) mul*=0.82;
  else if(h<7||h>21) mul*=0.92;
  if(typeof weatherI!=="undefined" && weatherI>0.35) mul*=0.78+0.22*(1-weatherI);
  if(p.shelterSeek>0) mul*=0.65;
  if(p.mood<0.35) mul*=1.08;
  return mul;
}

function pedLifeAwareness(p,dt){
  p.witnessCd=Math.max(0,p.witnessCd-dt);
  p.speechT=Math.max(0,p.speechT-dt);
  if(!p.speechT) p.speech=null;
  p.lookT=Math.max(0,p.lookT-dt);
  p.destT-=dt;
  if(p.destT<=0) assignPedDestination(p,true);

  const px=mode==="car"?car.x:ped.x, py=mode==="car"?car.y:ped.y;
  const pd=Math.hypot(px-p.x,py-p.y);

  if(mode==="foot" && ped.weapon!=null && ped.weapon>=0 && pd<130){
    p.awareness=Math.min(1,p.awareness+dt*0.9);
    pedFaceInterest(p,px,py,0.5);
    if(pd<70 && !p.hostile && !p.armed && rng()<0.02){
      pedSay(p,PED_LINES.weapon,1.6);
      if(ped.weapon>=2 && pd<55) p.panic=Math.max(p.panic,1.8);
    }
  }

  if(typeof stars!=="undefined" && stars>=1 && typeof lawActive==="function" && lawActive()){
    p.awareness=Math.min(1,p.awareness+dt*0.35);
    if(stars>=2 && pd<220) pedFaceInterest(p,px,py,0.4);
    if(stars>=3 && pd<160 && !p.hostile && rng()<0.015){
      p.panic=Math.max(p.panic,2.2); p.threatX=px; p.threatY=py;
      pedSay(p,PED_LINES.police,1.5);
    }
  }

  if(typeof weatherI!=="undefined" && weatherI>0.45){
    p.shelterSeek=Math.min(1,p.shelterSeek+dt*0.5);
    if(p.shelterSeek>0.6 && rng()<0.004) pedSay(p,PED_LINES.rain,1.4);
  } else p.shelterSeek=Math.max(0,p.shelterSeek-dt*0.4);

  const h=typeof gameHour!=="undefined"?gameHour:12;
  if((h<5.5||h>22.5) && rng()<0.0015) pedSay(p,PED_LINES.night,1.6);

  for(const c of traffic){
    if(c.state!=="drive"&&c.state!=="loose") continue;
    const d=Math.hypot(c.x-p.x,c.y-p.y);
    if(d<38 && Math.hypot(c.vx,c.vy)>55){
      pedFaceInterest(p,c.x,c.y,0.35);
      if(d<22 && rng()<0.08) p.panic=Math.max(p.panic,0.5);
    }
  }

  p._speedMul=pedLifeSpeedMul(p);
  p.speed=(p.baseSpeed||p.speed)*p._speedMul;
}

function pedLifeSeparate(p,dt){
  for(const o of peds){
    if(o===p||o.state==="down") continue;
    const dx=p.x-o.x, dy=p.y-o.y, d=Math.hypot(dx,dy)||1;
    const min=(p.r||9)+(o.r||9)+6;
    if(d<min && d>0.001){
      const push=(min-d)*0.45;
      p.x+=dx/d*push; p.y+=dy/d*push;
    }
  }
}

function pedLifeGroupFollow(p,dt){
  if(!p.groupMate||p.groupLead||p.groupMate.state==="down") return false;
  const lead=p.groupMate;
  if(!lead.groupLead) return false;
  const dx=lead.x-p.x, dy=lead.y-p.y, d=Math.hypot(dx,dy)||1;
  p.a=Math.atan2(dy,dx);
  if(d>34){
    p.x+=dx/d*p.speed*0.95*dt; p.y+=dy/d*p.speed*0.95*dt;
    return true;
  }
  if(lead.dest) p.dest=lead.dest;
  return false;
}

function pedLifeIdle(p,dt){
  if(!p.idleAct||p.idleT<=0) return false;
  p.idleT-=dt;
  p.vx=0; p.vy=0;
  if(p.lookT<=0) p.a+=(rng()-0.5)*0.4*dt;
  if(p.idleAct==="phone"){
    p.holdingPhone=true;
    if(rng()<0.003) pedSay(p,PED_LINES.phone,1.5);
  } else {
    p.holdingPhone=false;
  }
  if(p.idleT<=0){
    p.idleAct=null;
    p.holdingPhone=false;
    assignPedDestination(p,true);
  }
  return true;
}

function pedLifeWitnessAct(p,dt){
  if(p.act!=="witness") return false;
  p.witnessT=(p.witnessT||0)-dt;
  p.vx=0; p.vy=0;
  p.holdingPhone=true;
  pedFaceInterest(p,p.witnessX||p.x,p.witnessY||p.y,0.3);
  if(p.witnessT<=1.1 && !p._called911){
    p._called911=true;
    if(typeof addHeat==="function") addHeat(0.28);
  }
  if(p.witnessT<=0){
    p.act=null; p.holdingPhone=false; p._called911=false;
    p.panic=Math.max(p.panic,1.6);
    p.threatX=p.witnessX; p.threatY=p.witnessY;
    p.witnessCd=rand(8,18);
  }
  return true;
}

function updatePedLife(p,dt){
  if(!p._life) initPedLife(p);
  if(p.state==="down"||p.hostile) return false;

  pedLifeAwareness(p,dt);

  if(pedLifeWitnessAct(p,dt)) return true;
  if(p.panic>0) return false;
  if(p.act==="chat"||p.act==="board") return false;

  if(pedLifeIdle(p,dt)) return true;

  if(!p.groupLead && pedLifeGroupFollow(p,dt)) return true;

  if(!p.onGraph && !p.plaza && !p.cross && !p._wait && !p.idleAct && rng()<(p.phone?0.002:0.001)){
    p.idleAct=p.phone?"phone":"idle_look";
    p.idleT=rand(2.5,6);
    if(p.phone) pedSay(p,PED_LINES.phone,2);
    else pedSay(p,PED_LINES.idle,1.8);
    return true;
  }

  if(p.dest && !p.onGraph && !p.plaza){
    p.tx=p.dest.x; p.ty=p.dest.y;
  }

  return false;
}

function alertPedsHonk(x,y){
  for(const p of peds){
    if(p.state==="down"||p.hostile) continue;
    const d=Math.hypot(p.x-x,p.y-y);
    if(d>150) continue;
    pedFaceInterest(p,x,y,0.75);
    if(d<95 && rng()<0.38) pedSay(p,PED_LINES.honk,1.1);
    if(d<52 && rng()<0.32){
      p.panic=Math.max(p.panic,0.45);
      p.threatX=x; p.threatY=y;
    }
  }
}

function pedLifeCrimeWitness(x,y,severity){
  severity=severity||0.5;
  for(const p of peds){
    if(p.state==="down"||p.hostile||p.panic>0||p.act||p.witnessCd>0) continue;
    const d=Math.hypot(p.x-x,p.y-y);
    if(d>240||d<8) continue;
    if(rng()>0.28+severity*0.35) continue;
    p.act="witness";
    p.witnessT=rand(1.6,2.8);
    p.witnessX=x; p.witnessY=y;
    p.onGraph=false; p.cross=0; p._wait=false; p.idleAct=null;
    pedSay(p,PED_LINES.witness,2.4);
    pedFaceInterest(p,x,y,1.2);
    p.witnessCd=rand(12,24);
    break;
  }
}

function drawPedBubble(p){
  if(!p.speech||p.speechT<=0) return;
  const txt=p.speech, maxW=92;
  ctx.font="11px system-ui,sans-serif";
  const tw=Math.min(maxW, ctx.measureText(txt).width+10);
  const th=16, bx=p.x+8, by=p.y-22;
  ctx.fillStyle="rgba(255,255,255,.93)";
  ctx.strokeStyle="rgba(0,0,0,.18)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(bx-tw/2,by-th/2,tw,th,5); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x+2,by+2); ctx.lineTo(p.x-4,by+10); ctx.lineTo(p.x+4,by+4); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#333"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(txt.length>18?txt.slice(0,17)+"…":txt, bx, by);
  ctx.textAlign="left";
}

function pedLifeAfterMove(p,dt){
  if(p.state==="down"||p.hostile||p.panic>0) return;
  pedLifeSeparate(p,dt);
  if(p.lookT>0) p.a=lerpAngle(p.a,p.lookA,Math.min(1,8*dt));
}

function lerpAngle(a,b,t){
  let d=b-a; while(d>Math.PI)d-=6.283185307; while(d<-Math.PI)d+=6.283185307;
  return a+d*t;
}
