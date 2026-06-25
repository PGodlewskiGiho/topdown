/* TOPDOWN CITY — 08-render-assets.js */
// ── per-model car renderer (canvas port of the approved SVG style) ──────
// Car local space: nose points +x (east). We rotate so "up" in the SVG
// design maps to forward. In SVG the car pointed UP (-y = front); here we
// build everything with front = -y then rotate by v.a + PI/2 so forward=+x.
function drawVehicle(v,color){
  if(v.kind==="moto"||v.kind==="bike"){ drawBike(v); return; }
  ctx.save();
  ctx.translate(v.x, v.y);
  if(v.sinking!==undefined){
    const k=Math.max(0,1-v.sinking/1.2);
    ctx.fillStyle="rgba(255,255,255,.35)";
    for(let bI=0;bI<5;bI++){ const a=bI*1.4+v.sinking*4; ctx.beginPath(); ctx.arc(Math.cos(a)*11,Math.sin(a)*11,1.5,0,7); ctx.fill(); }
    ctx.globalAlpha=0.45+0.55*k; ctx.scale(0.55+0.45*k,0.55+0.45*k);
  }
  // design space has front = up (-y); car heading a has front = +x, so add PI/2
  ctx.rotate(v.a + Math.PI/2);
  carBodyDesign(v, color);
  ctx.restore();
}

// helper: build the body silhouette path (front = -y / up)
function _bodyPathC(P, L, W, era){
  const hl=L/2, hw=W/2, ss=P.sideStraight;
  ctx.beginPath();
  if(era==="classic"){
    ctx.moveTo(-hw*P.noseW, -hl);
    ctx.lineTo(hw*P.noseW, -hl);
    ctx.bezierCurveTo(hw*0.9,-hl, hw,-hl*(1-P.frontRound), hw,-hl*ss);
    ctx.lineTo(hw, hl*ss);
    ctx.bezierCurveTo(hw,hl*(1-P.rearRound), hw*0.9,hl, hw*P.tailW,hl);
    ctx.lineTo(-hw*P.tailW, hl);
    ctx.bezierCurveTo(-hw*0.9,hl, -hw,hl*(1-P.rearRound), -hw,hl*ss);
    ctx.lineTo(-hw, -hl*ss);
    ctx.bezierCurveTo(-hw,-hl*(1-P.frontRound), -hw*0.9,-hl, -hw*P.noseW,-hl);
  } else {
    ctx.moveTo(0,-hl);
    ctx.bezierCurveTo(-hw*P.noseW,-hl, -hw,-hl*(1-P.frontRound), -hw,-hl*ss);
    ctx.lineTo(-hw, hl*ss);
    ctx.bezierCurveTo(-hw,hl*(1-P.rearRound), -hw*P.tailW,hl, 0,hl);
    ctx.bezierCurveTo(hw*P.tailW,hl, hw,hl*(1-P.rearRound), hw,hl*ss);
    ctx.lineTo(hw, -hl*ss);
    ctx.bezierCurveTo(hw,-hl*(1-P.frontRound), hw*P.noseW,-hl, 0,-hl);
  }
  ctx.closePath();
}

function carBodyDesign(v, color){
  const L=v.L, W=v.W, hl=L/2, hw=W/2;
  const type=v.type||"sedan", era=v.era||"modern", brand=v.brand||"";
  const accent=v.accent||"#ff5b46";
  const dark=shade(color,-60), mid=shade(color,-28), roofLight=shade(color,18);
  const pOk=(id)=>typeof partIntact!=="function"||partIntact(v,id);
  const pW=(id)=>typeof partWear==="function"?partWear(v,id):0;
  if(typeof initVehicleParts==="function") initVehicleParts(v);

  // silhouette params
  let P;
  switch(type){
    case "supercar": P={noseW:0.42,tailW:0.74,sideStraight:0.62,frontRound:0.26,rearRound:0.30}; break;
    case "wedge":    P={noseW:0.40,tailW:0.66,sideStraight:0.66,frontRound:0.30,rearRound:0.34}; break;
    case "suv":      P={noseW:0.82,tailW:0.88,sideStraight:0.82,frontRound:0.12,rearRound:0.10}; break;
    case "suvcoupe": P={noseW:0.80,tailW:0.78,sideStraight:0.80,frontRound:0.14,rearRound:0.22}; break;
    case "estate":   P={noseW:0.62,tailW:0.90,sideStraight:0.78,frontRound:0.22,rearRound:0.06}; break;
    case "coupe":    P={noseW:0.50,tailW:0.62,sideStraight:0.64,frontRound:0.26,rearRound:0.34}; break;
    default:         P={noseW:0.56,tailW:0.68,sideStraight:0.70,frontRound:0.22,rearRound:0.22};
  }
  if(era==="classic"){ P.sideStraight=Math.min(0.86,P.sideStraight+0.14); P.frontRound*=0.55; P.rearRound*=0.5; P.noseW=Math.min(0.78,P.noseW+0.14); P.tailW=Math.min(0.82,P.tailW+0.12); }
  const ss=P.sideStraight;

  // ── wheels ──
  const ww=W*0.13, wl=L*0.16;
  const wheelSpots=[
    {id:"wheelFL",x:-hw-1,y:-hl*0.58},{id:"wheelFR",x:hw-ww+1,y:-hl*0.58},
    {id:"wheelRL",x:-hw-1,y:hl*0.52},{id:"wheelRR",x:hw-ww+1,y:hl*0.52},
  ];
  for(const w of wheelSpots){
    if(!pOk(w.id)){
      ctx.fillStyle="#2a2a2a"; rrect(w.x,w.y-wl*0.35,ww,wl*0.7,2); ctx.fill();
      ctx.fillStyle="#444"; ctx.beginPath(); ctx.arc(w.x+ww*0.5,w.y,ww*0.35,0,7); ctx.fill();
      continue;
    }
    const wear=pW(w.id);
    ctx.fillStyle=wear>0.55?"#1a1a1a":"#0c0c0c";
    rrect(w.x,w.y-wl/2,ww,wl,2.5); ctx.fill();
    if(wear>0.35){ ctx.strokeStyle="rgba(80,80,80,.6)"; ctx.lineWidth=1; ctx.strokeRect(w.x,w.y-wl/2,ww,wl); }
  }

  // ── body shadow ──
  ctx.save(); ctx.translate(3,4); _bodyPathC(P,L,W,era); ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.fill(); ctx.restore();
  // ── body paint ──
  _bodyPathC(P,L,W,era); ctx.fillStyle=color; ctx.fill();
  // ── lengthwise cylindrical shading (dark edges, light centre) ──
  const grad=ctx.createLinearGradient(-hw,0,hw,0);
  grad.addColorStop(0,"rgba(0,0,0,0.40)"); grad.addColorStop(0.12,"rgba(0,0,0,0.05)");
  grad.addColorStop(0.5,"rgba(255,255,255,0.20)"); grad.addColorStop(0.88,"rgba(0,0,0,0.05)");
  grad.addColorStop(1,"rgba(0,0,0,0.40)");
  _bodyPathC(P,L,W,era); ctx.fillStyle=grad; ctx.fill();
  // outline
  _bodyPathC(P,L,W,era); ctx.strokeStyle="rgba(0,0,0,0.45)"; ctx.lineWidth=1.2; ctx.stroke();

  // character lines
  ctx.strokeStyle=dark; ctx.globalAlpha=0.4; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(-hw*0.92,-hl*ss*0.8); ctx.lineTo(-hw*0.92,hl*ss*0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hw*0.92,-hl*ss*0.8); ctx.lineTo(hw*0.92,hl*ss*0.8); ctx.stroke();
  ctx.globalAlpha=1;

  // ── greenhouse / glass ──
  if(type==="wedge"){
    const ghTop=-hl*0.46, ghBot=hl*0.46, ghHW=hw*0.60;
    _canopyPath(ghTop,ghBot,ghHW,L,0.16,0.14); ctx.fillStyle="#101216"; ctx.fill();
    _canopyPath(ghTop+3,ghBot-2,ghHW*0.85,L,0.17,0.15); ctx.fillStyle="#2a3744"; ctx.fill();
    ctx.fillStyle="#0a0a0a"; ctx.fillRect(-2.5,ghTop+L*0.05,5,(ghBot-ghTop)-L*0.1);
    ctx.strokeStyle=accent; ctx.globalAlpha=0.8; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(-hw*0.96,-hl*0.1); ctx.lineTo(-hw*0.96,hl*0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hw*0.96,-hl*0.1); ctx.lineTo(hw*0.96,hl*0.3); ctx.stroke();
    ctx.globalAlpha=1;
  } else if(type==="supercar"){
    const ghTop=-hl*0.34, ghBot=hl*0.08, ghHW=hw*0.62;
    _canopyPath(ghTop,ghBot+2,ghHW,L,0.11,0.04); ctx.fillStyle="#15171a"; ctx.fill();
    ctx.fillStyle=roofLight; rrect(-ghHW*0.78,ghTop+L*0.1,ghHW*1.56,(ghBot-ghTop)*0.4,3); ctx.fill();
    // windshield
    ctx.fillStyle="#9ec8dc"; ctx.beginPath();
    ctx.moveTo(-ghHW*0.78,ghTop+L*0.1); ctx.lineTo(ghHW*0.78,ghTop+L*0.1);
    ctx.lineTo(ghHW*0.6,ghTop+2); ctx.bezierCurveTo(ghHW*0.3,ghTop, -ghHW*0.3,ghTop, -ghHW*0.6,ghTop+2);
    ctx.closePath(); ctx.fill();
    // glass engine cover + V10
    const eTop=hl*0.16, eBot=hl*0.66, eHW=hw*0.6;
    ctx.fillStyle="#0d0f12"; rrect(-eHW,eTop,eHW*2,eBot-eTop,4); ctx.fill();
    ctx.fillStyle="#2a2d33"; rrect(-eHW*0.7,eTop+4,eHW*1.4,eBot-eTop-8,2); ctx.fill();
    ctx.fillStyle="#454a52";
    for(let k=0;k<5;k++){ const yy=eTop+8+k*(eBot-eTop-16)/4;
      ctx.beginPath(); ctx.arc(-eHW*0.32,yy,3,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(eHW*0.32,yy,3,0,7); ctx.fill(); }
    ctx.fillStyle=accent; ctx.globalAlpha=0.5; ctx.fillRect(-2,eTop+4,4,eBot-eTop-8); ctx.globalAlpha=1;
    // side blades
    ctx.fillStyle=dark;
    ctx.beginPath(); ctx.moveTo(-hw*0.97,-hl*0.05); ctx.lineTo(-hw*0.97,hl*0.22); ctx.lineTo(-hw*0.7,hl*0.16); ctx.lineTo(-hw*0.7,-hl*0.02); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hw*0.97,-hl*0.05); ctx.lineTo(hw*0.97,hl*0.22); ctx.lineTo(hw*0.7,hl*0.16); ctx.lineTo(hw*0.7,-hl*0.02); ctx.closePath(); ctx.fill();
  } else {
    let ghTop, ghBot, ghHW;
    switch(type){
      case "suv":     ghTop=-hl*0.38; ghBot=hl*0.52; ghHW=hw*0.80; break;
      case "suvcoupe":ghTop=-hl*0.36; ghBot=hl*0.46; ghHW=hw*0.78; break;
      case "estate":  ghTop=-hl*0.30; ghBot=hl*0.70; ghHW=hw*0.78; break;
      case "coupe":   ghTop=-hl*0.26; ghBot=hl*0.42; ghHW=hw*0.70; break;
      default:        ghTop=-hl*0.30; ghBot=hl*0.52; ghHW=hw*0.74;
    }
    if(era==="classic") ghHW*=1.04;
    _canopyPath(ghTop,ghBot,ghHW,L,0.11,0.10); ctx.fillStyle="#15171a"; ctx.fill();
    const roofTop=ghTop+L*0.12, roofBot=ghBot-L*0.12, roofHW=ghHW*0.84;
    ctx.fillStyle=roofLight; rrect(-roofHW,roofTop,roofHW*2,roofBot-roofTop,3); ctx.fill();
    // roof sheen
    const rg=ctx.createLinearGradient(0,roofTop,0,roofBot);
    rg.addColorStop(0,"rgba(255,255,255,0.28)"); rg.addColorStop(0.5,"rgba(255,255,255,0)"); rg.addColorStop(1,"rgba(255,255,255,0.12)");
    rrect(-roofHW,roofTop,roofHW*2,roofBot-roofTop,3); ctx.fillStyle=rg; ctx.fill();
    // windshield
    ctx.fillStyle="#9ec8dc"; ctx.beginPath();
    ctx.moveTo(-roofHW,roofTop); ctx.lineTo(roofHW,roofTop); ctx.lineTo(roofHW*0.9,ghTop+L*0.045);
    ctx.bezierCurveTo(roofHW*0.4,ghTop+1, -roofHW*0.4,ghTop+1, -roofHW*0.9,ghTop+L*0.045); ctx.closePath(); ctx.fill();
    // rear glass
    ctx.fillStyle="#6a9aac"; ctx.beginPath();
    ctx.moveTo(-roofHW,roofBot); ctx.lineTo(roofHW,roofBot); ctx.lineTo(roofHW*0.9,ghBot-L*0.035);
    ctx.bezierCurveTo(roofHW*0.4,ghBot-1, -roofHW*0.4,ghBot-1, -roofHW*0.9,ghBot-L*0.035); ctx.closePath(); ctx.fill();
    // roof rails for SUVs
    if(type==="suv"||type==="suvcoupe"){
      ctx.fillStyle=dark;
      ctx.fillRect(-roofHW-2,roofTop+2,2.5,roofBot-roofTop-4);
      ctx.fillRect(roofHW-0.5,roofTop+2,2.5,roofBot-roofTop-4);
    }
  }

  // hood creases
  if(type!=="supercar" && pOk("hood")){
    ctx.strokeStyle=dark; ctx.globalAlpha=0.45; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(-hw*0.28,-hl*0.88); ctx.lineTo(-hw*0.18,-hl*0.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hw*0.28,-hl*0.88); ctx.lineTo(hw*0.18,-hl*0.42); ctx.stroke();
    ctx.globalAlpha=1;
  }

  // mirrors
  const mY = (type==="supercar")? -hl*0.30 : (type==="wedge"? -hl*0.40 : -hl*0.27);
  ctx.fillStyle=mid;
  if(pOk("mirrorL")){
    ctx.beginPath(); ctx.moveTo(-hw,mY); ctx.lineTo(-hw-4,mY-1); ctx.lineTo(-hw-4,mY+5); ctx.lineTo(-hw,mY+4); ctx.closePath(); ctx.fill();
  }
  if(pOk("mirrorR")){
    ctx.beginPath(); ctx.moveTo(hw,mY); ctx.lineTo(hw+4,mY-1); ctx.lineTo(hw+4,mY+5); ctx.lineTo(hw,mY+4); ctx.closePath(); ctx.fill();
  }

  // grille
  if(pOk("bumpFront") && brand==="BMW"){
    const gy=-hl*0.94, gh=L*(era==="classic"?0.035:0.045), gw=W*0.11, gap=W*0.022;
    ctx.fillStyle="#0a0a0a"; ctx.strokeStyle=accent; ctx.lineWidth=0.6;
    rrect(-gw-gap/2,gy,gw,gh,1.5); ctx.fill(); ctx.stroke();
    rrect(gap/2,gy,gw,gh,1.5); ctx.fill(); ctx.stroke();
  } else if(pOk("bumpFront") && brand==="Audi"){
    const gy=-hl*0.95, gh=L*0.05, gw=W*0.46;
    ctx.fillStyle="#0a0a0a"; ctx.strokeStyle=accent; ctx.lineWidth=0.6;
    ctx.beginPath(); ctx.moveTo(-gw/2,gy); ctx.lineTo(gw/2,gy); ctx.lineTo(gw/2*0.82,gy+gh); ctx.lineTo(-gw/2*0.82,gy+gh); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  // headlights
  if(pOk("headlightL")||pOk("headlightR")){
    ctx.fillStyle="#eef4ff";
    if(era==="classic"){
      if(pOk("headlightL")){ ctx.beginPath(); ctx.arc(-hw*0.5,-hl*0.87,W*0.07,0,7); ctx.fill(); }
      if(pOk("headlightR")){ ctx.beginPath(); ctx.arc(hw*0.5,-hl*0.87,W*0.07,0,7); ctx.fill(); }
    } else {
      if(pOk("headlightL")){ ctx.beginPath(); ctx.moveTo(-hw*0.68,-hl*0.90); ctx.lineTo(-hw*0.32,-hl*0.87); ctx.lineTo(-hw*0.35,-hl*0.815); ctx.lineTo(-hw*0.65,-hl*0.84); ctx.closePath(); ctx.fill(); }
      if(pOk("headlightR")){ ctx.beginPath(); ctx.moveTo(hw*0.68,-hl*0.90); ctx.lineTo(hw*0.32,-hl*0.87); ctx.lineTo(hw*0.35,-hl*0.815); ctx.lineTo(hw*0.65,-hl*0.84); ctx.closePath(); ctx.fill(); }
    }
    if(!pOk("headlightL")||!pOk("headlightR")){ ctx.fillStyle="rgba(20,20,24,.7)"; ctx.fillRect(-hw*0.7,-hl*0.9,hw*1.4,L*0.06); }
  }

  // taillights
  if(pOk("taillightL")||pOk("taillightR")){
    ctx.fillStyle="#c11";
    if(brand==="Audi" && pOk("taillightL") && pOk("taillightR")){
      ctx.beginPath(); ctx.moveTo(-hw*0.72,hl*0.90); ctx.lineTo(hw*0.72,hl*0.90); ctx.lineTo(hw*0.68,hl*0.95); ctx.lineTo(-hw*0.68,hl*0.95); ctx.closePath(); ctx.fill();
    } else {
      if(pOk("taillightL")){ ctx.beginPath(); ctx.moveTo(-hw*0.68,hl*0.88); ctx.lineTo(-hw*0.34,hl*0.86); ctx.lineTo(-hw*0.36,hl*0.93); ctx.lineTo(-hw*0.66,hl*0.95); ctx.closePath(); ctx.fill(); }
      if(pOk("taillightR")){ ctx.beginPath(); ctx.moveTo(hw*0.68,hl*0.88); ctx.lineTo(hw*0.34,hl*0.86); ctx.lineTo(hw*0.36,hl*0.93); ctx.lineTo(hw*0.66,hl*0.95); ctx.closePath(); ctx.fill(); }
    }
  }

  // ── damage overlays ──
  const dg = v.maxHp ? clamp(1-v.hp/v.maxHp,0,1) : 0;
  const pts=v.parts&&v.parts._v===2?v.parts:null;
  const dFront=pts?Math.max(pW("hood"),pW("bumpFront"),pW("fenderFL"),pW("fenderFR")):dg*0.55;
  const dRear=pts?Math.max(pW("trunk"),pW("bumpRear")):dg*0.45;
  const dLeft=pts?Math.max(pW("doorFL"),pW("doorRL"),pW("mirrorL")):dg*0.45;
  const dRight=pts?Math.max(pW("doorFR"),pW("doorRR"),pW("mirrorR")):dg*0.45;
  const dHood=pts?pW("hood"):dg*0.5;
  const dGlass=pts?Math.max(pW("windshield"),pW("rearGlass")):dg*0.35;
  const dZone=Math.max(dg,dFront,dRear,dLeft,dRight,dHood,dGlass);
  if(dZone>0.04){
    let sd=(v.dmgSeed||1)>>>0;
    const rr=()=>{ sd=(Math.imul(sd,1103515245)+12345)>>>0; return sd/4294967296; };
    const n=1+Math.floor(dZone*9);
    for(let i=0;i<n;i++){ const bx=(rr()-0.5)*W*0.85, by=(rr()-0.5)*L*0.85, br=2+rr()*4.5*dg;
      ctx.fillStyle="rgba(12,12,16,"+(0.5+dg*0.3).toFixed(2)+")"; ctx.beginPath(); ctx.arc(bx,by,br,0,7); ctx.fill(); }
    if(dFront>0.08){ ctx.fillStyle="rgba(20,20,24,"+(0.35+0.4*dFront).toFixed(2)+")"; ctx.beginPath(); ctx.ellipse(0,-hl*0.82,hw*(0.30+0.38*dFront),L*(0.06+0.08*dFront),0,0,7); ctx.fill(); }
    if(dRear>0.08){ ctx.fillStyle="rgba(20,20,24,"+(0.30+0.35*dRear).toFixed(2)+")"; ctx.beginPath(); ctx.ellipse(0,hl*0.84,hw*(0.28+0.36*dRear),L*(0.05+0.07*dRear),0,0,7); ctx.fill(); }
    if(dLeft>0.1){ ctx.fillStyle="rgba(16,16,20,"+(0.28+0.38*dLeft).toFixed(2)+")"; ctx.beginPath(); ctx.ellipse(-hw*0.9,0,hw*(0.10+0.12*dLeft),L*(0.16+0.18*dLeft),0,0,7); ctx.fill(); }
    if(dRight>0.1){ ctx.fillStyle="rgba(16,16,20,"+(0.28+0.38*dRight).toFixed(2)+")"; ctx.beginPath(); ctx.ellipse(hw*0.9,0,hw*(0.10+0.12*dRight),L*(0.16+0.18*dRight),0,0,7); ctx.fill(); }
    if(dHood>0.1 && pOk("hood")){ ctx.strokeStyle="rgba(0,0,0,"+(0.32+0.42*dHood).toFixed(2)+")"; ctx.lineWidth=1.2+dHood*1.4;
      ctx.beginPath(); ctx.moveTo(-hw*0.26,-hl*0.72); ctx.lineTo(hw*0.2,-hl*0.62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw*0.22,-hl*0.78); ctx.lineTo(-hw*0.2,-hl*0.66); ctx.stroke(); }
    if(!pOk("hood")){
      ctx.fillStyle="#1c1a18"; ctx.beginPath(); ctx.ellipse(0,-hl*0.62,hw*0.42,L*0.09,0,0,7); ctx.fill();
      ctx.fillStyle="#3a3834"; ctx.fillRect(-hw*0.14,-hl*0.66,hw*0.28,L*0.07);
      ctx.fillStyle="#555"; ctx.fillRect(-hw*0.08,-hl*0.64,hw*0.16,L*0.04);
    }
    if(!pOk("bumpFront") && dFront>0.05){ ctx.fillStyle="rgba(8,8,10,.55)"; ctx.beginPath(); ctx.ellipse(0,-hl*0.92,hw*(0.22+0.2*dFront),L*0.04,0,0,7); ctx.fill(); }
    if(!pOk("bumpRear") && dRear>0.05){ ctx.fillStyle="rgba(8,8,10,.5)"; ctx.beginPath(); ctx.ellipse(0,hl*0.92,hw*(0.2+0.18*dRear),L*0.04,0,0,7); ctx.fill(); }
    if(dg>0.2){ const ns=1+Math.floor((dg-0.2)*5); ctx.strokeStyle="rgba(200,210,220,"+(0.5*dg).toFixed(2)+")"; ctx.lineWidth=1;
      for(let i=0;i<ns;i++){ const sx=(rr()-0.5)*W*0.7, sy=(rr()-0.5)*L*0.7, sl=4+rr()*12, sa=(rr()-0.5)*0.6;
        ctx.save(); ctx.translate(sx,sy); ctx.rotate(sa); ctx.beginPath(); ctx.moveTo(-sl/2,0); ctx.lineTo(sl/2,0); ctx.stroke(); ctx.restore(); } }
    if(dGlass>0.18 && pOk("windshield")){ ctx.strokeStyle="rgba(195,220,235,"+(0.25+0.45*dGlass).toFixed(2)+")"; ctx.lineWidth=1;
      const gy=-hl*0.08, gh=L*0.38, gw=hw*0.56;
      for(let i=0;i<3+Math.floor(dGlass*5);i++){ const sx=(rr()-0.5)*gw*1.2, sy=gy+(rr()-0.5)*gh*1.1;
        const ex=sx+(rr()-0.5)*gw*0.9, ey=sy+(rr()-0.5)*gh*0.9; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke(); }
    }
    if(dg>0.6){ ctx.strokeStyle="rgba(0,0,0,0.35)"; ctx.lineWidth=2.5; ctx.setLineDash([3,3]); _bodyPathC(P,L,W,era); ctx.stroke(); ctx.setLineDash([]); }
  }
  // smoke / fire (unrotate so it rises straight up on screen)
  if(v.maxHp && dZone>0.55){
    ctx.rotate(-(v.a+Math.PI/2));
    const t=performance.now()/160, smokeN=dZone>0.8?5:3;
    for(let i=0;i<smokeN;i++){ const ph=(i*0.85+t)%3, yy=-8-ph*10, xx=Math.sin(i*2.1+t)*5, alpha=dZone>0.8?0.45-ph*0.13:0.30-ph*0.09;
      ctx.fillStyle="rgba(38,36,40,"+Math.max(0,alpha).toFixed(2)+")"; ctx.beginPath(); ctx.arc(xx,yy,3.5+ph*2.8,0,7); ctx.fill(); }
    if(dZone>0.80){ for(let i=0;i<6;i++){ const fx=(Math.random()-0.5)*W*0.45, fy=(Math.random()-0.5)*L*0.4;
      ctx.fillStyle=Math.random()<0.55?"#ff6a18":"#ffd23b"; ctx.beginPath(); ctx.arc(fx,fy,1.4+Math.random()*3.2,0,7); ctx.fill(); } }
  }
}

// continuous greenhouse canopy path (front=up). topInset/botInset are
// fractions of L controlling how far the rounded corners come in.
function _canopyPath(ghTop,ghBot,ghHW,L,topInset,botInset){
  ctx.beginPath();
  ctx.moveTo(0,ghTop);
  ctx.bezierCurveTo(-ghHW*0.6,ghTop, -ghHW,ghTop+L*0.05, -ghHW,ghTop+L*topInset*0.69);
  ctx.lineTo(-ghHW,ghBot-L*botInset);
  ctx.bezierCurveTo(-ghHW,ghBot-L*0.03, -ghHW*0.6,ghBot, 0,ghBot);
  ctx.bezierCurveTo(ghHW*0.6,ghBot, ghHW,ghBot-L*0.03, ghHW,ghBot-L*botInset);
  ctx.lineTo(ghHW,ghTop+L*topInset*0.69);
  ctx.bezierCurveTo(ghHW,ghTop+L*0.05, ghHW*0.6,ghTop, 0,ghTop);
  ctx.closePath();
}
function rrect(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); }

function drawSpeech(p){
  const bx=p.x+7, by=p.y-17, w=14, h=8;
  ctx.fillStyle="rgba(255,255,255,.92)";
  ctx.beginPath(); ctx.moveTo(bx-2,by+h*0.5); ctx.lineTo(bx-6,by+h*0.5+4); ctx.lineTo(bx,by+h*0.5); ctx.closePath(); ctx.fill();   // tail
  ctx.fillRect(bx-w/2,by-h/2,w,h);
  const n=((performance.now()/300|0)%3)+1;
  ctx.fillStyle="#555"; for(let k=0;k<3;k++){ ctx.globalAlpha=k<n?1:0.3; ctx.beginPath(); ctx.arc(bx-4+k*4,by,1.1,0,7); ctx.fill(); }
  ctx.globalAlpha=1;
}
function drawPerson(p,color,down,targetCtx){
  if(typeof PeopleSprites!=="undefined"&&PeopleSprites.meta){
    let dirOpts=null;
    if(typeof LivingSprite!=="undefined"){
      const isPlayer=typeof ped!=="undefined"&&p===ped&&typeof mode!=="undefined"&&mode==="foot";
      dirOpts={keys:isPlayer&&typeof keys!=="undefined"?keys:null};
      p._spriteDir=LivingSprite.spriteDir(p,dirOpts);
    }
    PeopleSprites.draw(targetCtx||ctx,p,color,down,p._spriteDir);
    return;
  }
}

function vignette(){
  const g = ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.42, VW/2,VH/2,Math.max(VW,VH)*0.75);
  g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,.34)");
  ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
}
function fillPoly(p){ ctx.beginPath(); ctx.moveTo(p[0][0],p[0][1]); for(let k=1;k<p.length;k++) ctx.lineTo(p[k][0],p[k][1]); ctx.closePath(); ctx.fill(); }
function strokePoly(p){ ctx.beginPath(); ctx.moveTo(p[0][0],p[0][1]); for(let k=1;k<p.length;k++) ctx.lineTo(p[k][0],p[k][1]); ctx.closePath(); ctx.stroke(); }
// point-in-convex-polygon (poly given CCW or CW, consistent winding)
function ptInPoly(px,py,poly){
  let sign=0;
  for(let k=0;k<poly.length;k++){ const a=poly[k], b=poly[(k+1)%poly.length];
    const cr=(b[0]-a[0])*(py-a[1])-(b[1]-a[1])*(px-a[0]);
    if(cr!==0){ const s=cr>0?1:-1; if(sign===0)sign=s; else if(s!==sign) return false; } }
  return true;
}
// The extruded silhouette of a building = convex hull of base+roof quads. If an actor
// (player / traffic / pedestrians) sits inside that silhouette AND below the roof (so it
// would visually appear to drive "on the wall"), we ghost the building to keep the actor
// readable. Pure-ish: reads global actor lists already used by the renderer.
function buildingOccludesActor(b){
  const x=b.x,y=b.y,w=b.w,h=b.h, [vx,vy]=leanVec(b);
  // only tall-enough leans actually overhang the street meaningfully
  if(vy>-60) return false;
  const sil=convexHull([[x,y],[x+w,y],[x+w,y+h],[x,y+h],
                        [x+vx,y+vy],[x+w+vx,y+vy],[x+w+vx,y+h+vy],[x+vx,y+h+vy]]);
  // an actor is "covered" if it's inside the silhouette but NOT inside the solid base
  // (standing in front of / beside the building on the street, under the overhang)
  const base=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const test=(ax,ay)=> ptInPoly(ax,ay,sil) && !ptInPoly(ax,ay,base);
  // player first (most important)
  if(mode==="foot"){ if(test(ped.x,ped.y)) return true; }
  else if(!car.dead){ if(test(car.x,car.y)) return true; }
  // traffic & cops near this building
  for(const c of traffic){ if(Math.abs(c.x-x)>w+260||Math.abs(c.y-y)>h+260) continue; if(test(c.x,c.y)) return true; }
  for(const c of cops){ if(Math.abs(c.x-x)>w+260||Math.abs(c.y-y)>h+260) continue; if(test(c.x,c.y)) return true; }
  for(const p of peds){ if(Math.abs(p.x-x)>w+260||Math.abs(p.y-y)>h+260) continue; if(test(p.x,p.y)) return true; }
  return false;
}
// Same ghost logic as buildings: if an actor sits under the leaning crown silhouette
// (inside the extruded hull but not at the trunk footprint), fade the tree canopy.
function treeOccludesActor(t){
  const [vx,vy]=treeLean(t);
  if(vy>-38) return false;
  const R=(t.crownR||t.s*0.35)*1.06;
  const tw=(t.trunk||{}).tw||t.s*0.08;
  const bw=Math.max(tw*1.5, R*0.13, 7);
  const x=t.x, y=t.y, cx=t.x+vx, cy=t.y+vy;
  const base=[[x-bw,y],[x+bw,y],[x+bw,y+bw*0.42],[x-bw,y+bw*0.42]];
  const roof=[];
  for(let k=0;k<12;k++){
    const a=-0.35+k/12*Math.PI*1.55;
    roof.push([cx+Math.cos(a)*R, cy+Math.sin(a)*R*0.80]);
  }
  const sil=convexHull(base.concat(roof));
  const covered=(ax,ay)=>ptInPoly(ax,ay,sil)&&!ptInPoly(ax,ay,base);
  const mx=Math.max(R, bw)+120;
  if(mode==="foot"){ if(Math.abs(ped.x-x)<mx&&Math.abs(ped.y-y)<mx&&covered(ped.x, ped.y)) return true; }
  else if(!car.dead){ if(Math.abs(car.x-x)<mx&&Math.abs(car.y-y)<mx&&covered(car.x, car.y)) return true; }
  for(const c of traffic){ if(Math.abs(c.x-x)>mx||Math.abs(c.y-y)>mx) continue; if(covered(c.x,c.y)) return true; }
  for(const c of cops){ if(Math.abs(c.x-x)>mx||Math.abs(c.y-y)>mx) continue; if(covered(c.x,c.y)) return true; }
  for(const p of peds){ if(Math.abs(p.x-x)>mx||Math.abs(p.y-y)>mx) continue; if(covered(p.x, p.y)) return true; }
  return false;
}

function leanVec(b){ const H=b.H, cx=b.x+b.w/2, cy=b.y+b.h/2;
  // Stable 2.5D tilt: the vertical component is constant (independent of the camera) so
  // the front wall is ALWAYS exposed and floors never collapse as you drive past. A small
  // horizontal parallax adds depth but is heavily damped and hard-clamped so buildings
  // don't "flip" left/right or swing wildly during fast movement.
  const vyBase = -H*0.92;                                  // constant upward tilt -> consistent height
  const offx = (cx-cam.x);
  const par  = Math.tanh(offx/900) * H * 0.22;             // smooth, bounded; ~0 near centre, saturates at edges
  let vx = par, vy = vyBase - H*0.06*Math.tanh((cy-cam.y)/1100);
  const vl=Math.hypot(vx,vy), vm=H*1.9; if(vl>vm){ vx*=vm/vl; vy*=vm/vl; } return [vx,vy]; }
function drawBuilding(b){ drawBuildingWalls(b); drawBuildingRoof(b); }
function drawBuildingWalls(b){
  const x=b.x,y=b.y,w=b.w,h=b.h, [vx,vy]=leanVec(b);                  // roof leans away from screen centre = perceived height
  const base=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const roof=[[x+vx,y+vy],[x+w+vx,y+vy],[x+w+vx,y+h+vy],[x+vx,y+h+vy]];
  ctx.fillStyle="rgba(0,0,0,.15)"; fillPoly([[x+2,y+3],[x+w+2,y+3],[x+w+2,y+h+3],[x+2,y+h+3]]);   // soft contact shadow
  const shd=[-24,-6,6,-15];                                          // N,E,S,W face shading
  for(const[ai,ci,nx,ny,si]of[[0,1,0,-1,0],[1,2,1,0,1],[2,3,0,1,2],[3,0,-1,0,3]]){
    if(nx*vx+ny*vy>=0) continue;                                     // back face (hidden under roof)
    const a=base[ai],cc=base[ci],cr=roof[ci],ar=roof[ai];
    ctx.fillStyle=shade(b.color,shd[si]); fillPoly([a,cc,cr,ar]);    // side wall
    drawWallWindows(b,a,cc,ar,si);
    ctx.strokeStyle="rgba(0,0,0,.32)"; ctx.lineWidth=1; strokePoly([a,cc,cr,ar]);
  }
}
function drawBuildingRoof(b){
  const x=b.x,y=b.y,w=b.w,h=b.h, [vx,vy]=leanVec(b);
  const roof=[[x+vx,y+vy],[x+w+vx,y+vy],[x+w+vx,y+h+vy],[x+vx,y+h+vy]];
  ctx.fillStyle=b.roofC; fillPoly(roof);
  texFillPoly(roof, "roof");
  drawRoofTop(b, x+vx, y+vy, w, h);
  ctx.strokeStyle="rgba(0,0,0,.45)"; ctx.lineWidth=1.5; strokePoly(roof);
}
// A nice glazed entrance door (for blok stairwell entries) drawn in wall-space.
// P: wall->world map, sc: centre t (0..1), hw: half width, top: u-height of the door.
// One realistic glass pane in wall-space. P:wall->world map; cx,cy:centre (0..1);
// hw,hh:half width/height; tint:base glass colour; lit:interior light on.
function drawGlassPane(P, fillPoly, cx, cy, hw, hh, tint, lit){
  const x0=cx-hw, x1=cx+hw, y0=cy-hh, y1=cy+hh;
  // recessed reveal (frame shadow)
  ctx.fillStyle="rgba(0,0,0,.34)";
  fillPoly([P(x0-hw*0.12,y0-hh*0.14),P(x1+hw*0.12,y0-hh*0.14),P(x1+hw*0.12,y1+hh*0.14),P(x0-hw*0.12,y1+hh*0.14)]);
  if(lit){
    ctx.fillStyle="#f4e6bc"; fillPoly([P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)]);                          // warm interior
    ctx.fillStyle="rgba(255,250,225,.55)"; fillPoly([P(x0,y0),P(x1,y0),P(x1,(y0+y1)/2),P(x0,(y0+y1)/2)]);
    ctx.fillStyle="rgba(255,236,186,.32)"; fillPoly([P(x0+hw*0.2,(y0+y1)/2),P(x1-hw*0.2,(y0+y1)/2),P(x1-hw*0.2,y1),P(x0+hw*0.2,y1)]);
  } else {
    ctx.fillStyle=shade(tint,-26); fillPoly([P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)]);                    // dark glass top
    ctx.fillStyle=shade(tint,-2);  fillPoly([P(x0,y0+hh*0.7),P(x1,y0+hh*0.7),P(x1,y1),P(x0,y1)]);      // bright lower sky band
    ctx.fillStyle=shade(tint,20);  fillPoly([P(x0,y1-hh*0.35),P(x1,y1-hh*0.35),P(x1,y1),P(x0,y1)]);    // brightest at sill
    ctx.fillStyle="rgba(225,238,247,.30)";                                                            // diagonal glare
    fillPoly([P(x0+hw*0.25,y0),P(x0+hw*0.85,y0),P(x0+hw*0.25,y1),P(x0-hw*0.20,y1)]);
  }
  ctx.strokeStyle="rgba(18,26,32,.5)"; ctx.lineWidth=0.7;                                              // centre mullion
  const g0=P(cx,y0),g1=P(cx,y1); ctx.beginPath(); ctx.moveTo(g0[0],g0[1]); ctx.lineTo(g1[0],g1[1]); ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,.12)"; fillPoly([P(x0,y1),P(x1,y1),P(x1,y1+hh*0.12),P(x0,y1+hh*0.12)]); // sill highlight
}
function drawGlazedDoor(P, fillPoly, sc, hw, top, wallCol){
  // recessed frame (darker surround)
  ctx.fillStyle=shade(wallCol,-26); fillPoly([P(sc-hw*1.25,0),P(sc+hw*1.25,0),P(sc+hw*1.25,top*1.08),P(sc-hw*1.25,top*1.08)]);
  // glass panel — cool blue-green with a soft vertical gradient feel (two bands)
  ctx.fillStyle="#3c5663"; fillPoly([P(sc-hw,0),P(sc+hw,0),P(sc+hw,top),P(sc-hw,top)]);
  ctx.fillStyle="#4a6b78"; fillPoly([P(sc-hw,top*0.45),P(sc+hw,top*0.45),P(sc+hw,top),P(sc-hw,top)]);   // brighter upper glass
  // bright reflection streak
  ctx.fillStyle="rgba(210,228,235,.30)"; fillPoly([P(sc-hw*0.55,top*0.12),P(sc-hw*0.2,top*0.12),P(sc-hw*0.05,top),P(sc-hw*0.45,top)]);
  // central mullion + door split
  ctx.strokeStyle="rgba(15,20,24,.7)"; ctx.lineWidth=1;
  let m0=P(sc,0),m1=P(sc,top); ctx.beginPath(); ctx.moveTo(m0[0],m0[1]); ctx.lineTo(m1[0],m1[1]); ctx.stroke();
  // horizontal kick-rail near the bottom
  m0=P(sc-hw,top*0.22); m1=P(sc+hw,top*0.22); ctx.beginPath(); ctx.moveTo(m0[0],m0[1]); ctx.lineTo(m1[0],m1[1]); ctx.stroke();
  // frame outline + bright lintel/canopy above
  ctx.strokeStyle="rgba(10,12,14,.8)"; ctx.lineWidth=1.2; strokePoly([P(sc-hw,0),P(sc+hw,0),P(sc+hw,top),P(sc-hw,top)]);
  ctx.fillStyle=shade(wallCol,16); fillPoly([P(sc-hw*1.3,top*1.02),P(sc+hw*1.3,top*1.02),P(sc+hw*1.3,top*1.14),P(sc-hw*1.3,top*1.14)]);
}
// Subtle procedural wall texture: faint mottled patches + a soft top->bottom light gradient,
// so flat fills don't read as plain cardboard. Drawn over the base fill, under windows.
function drawWallTexture(P, fillPoly, seed, rows, cols){
  let rs=(seed*2654435761)>>>0; const rng=()=>{ rs=(rs*1664525+1013904223)>>>0; return rs/4294967296; };
  // light gradient: top (near roof) slightly brighter, base slightly shaded
  ctx.fillStyle="rgba(255,255,255,.05)"; fillPoly([P(0,0),P(1,0),P(1,0.34),P(0,0.34)]);
  ctx.fillStyle="rgba(0,0,0,.07)";       fillPoly([P(0,0.7),P(1,0.7),P(1,1),P(0,1)]);
  // scattered faint patches (weathering/dirt)
  const n=Math.min(46, Math.max(14, (rows*cols/6)|0));
  for(let k=0;k<n;k++){
    const t=rng(), u=rng(), wA=0.02+rng()*0.05, hA=0.015+rng()*0.04;
    ctx.fillStyle = rng()<0.5 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.04)";
    fillPoly([P(t,u),P(t+wA,u),P(t+wA,u+hA),P(t,u+hA)]);
  }
  // faint vertical streaks under sills (rain staining)
  ctx.strokeStyle="rgba(0,0,0,.045)"; ctx.lineWidth=0.8;
  for(let k=0;k<Math.min(cols,18);k++){ const tt=(k+0.5)/Math.min(cols,18);
    const s0=P(tt,0.2+rng()*0.2), s1=P(tt,0.85);
    ctx.beginPath(); ctx.moveTo(s0[0],s0[1]); ctx.lineTo(s1[0],s1[1]); ctx.stroke(); }
}
// Facade LOD: 0 = flat glass/tint, 1 = coarse bands, 2 = full window grid.
function wallFacadeLod(b,Hh){
  const cx=b.x+b.w*0.5, cy=b.y+b.h*0.5;
  const dist=Math.hypot(cx-cam.x, cy-cam.y);
  if(Hh<22||dist>VW*2.4) return 0;
  if(Hh<50||dist>VW*1.3) return 1;
  return 2;
}
function drawTowerFacadeLod(b,a,cc,ar,P,fillPoly,Hh,hx,hy,lod){
  const ux=cc[0]-a[0],uy=cc[1]-a[1], L=Math.hypot(ux,uy);
  const rows=Math.min(lod===0?3:9, Math.max(2, Math.round(Hh/(lod===0?42:26))));
  const tint=b.glassTint||"#7fa0bd", dark=(b.style||"")==="darkglass";
  for(let r=0;r<rows;r++){
    const u0=r/rows, u1=(r+1)/rows, sky=1-u0;
    const p0=P(0,u0),p1=P(1,u0),p2=P(1,u1),p3=P(0,u1);
    ctx.fillStyle=dark?shade(tint,-38+sky*18):shade(tint,-6+sky*20);
    fillPoly([p0,p1,p2,p3]);
    if(lod===1&&r%2===0){
      ctx.fillStyle=dark?"rgba(220,200,150,.14)":"rgba(232,240,248,.22)";
      fillPoly([p0,p1,P(1,u0+0.55/rows),P(0,u0+0.55/rows)]);
    }
  }
  const cr=[cc[0]+hx, cc[1]+hy];
  const wp=getTex((b.style||"")==="concrete"?"paneltex":"glasstex");
  if(wp){ ctx.save(); ctx.fillStyle=wp; fillPoly([a,cc,cr,ar]); ctx.restore(); }
  ctx.fillStyle="rgba(0,0,0,.14)"; fillPoly([P(0,0),P(0.05,0),P(0.05,1),P(0,1)]);
  ctx.fillStyle="rgba(20,28,36,.45)"; fillPoly([P(0,1-1/Math.max(rows,2)),P(1,1-1/Math.max(rows,2)),P(1,1),P(0,1)]);
}
function drawBlokFacadeLod(b,a,cc,ar,P,fillPoly,Hh,hx,hy,lod){
  const rows=Math.min(lod===0?4:10, Math.max(2, Math.round(Hh/34)));
  const cols=Math.max(2, Math.min(lod===0?3:6, Math.round(Math.hypot(cc[0]-a[0],cc[1]-a[1])/34)));
  const lit=b.litSeed||((Math.round(a[0])*131+Math.round(a[1])*97)>>>0);
  const accent=b.accent||"#8a6f5a";
  for(let r=0;r<rows;r++){ const u0=r/rows,u1=(r+1)/rows;
    ctx.fillStyle=shade(b.color,(r%2?-5:4)); fillPoly([P(0,u0),P(1,u0),P(1,u1),P(0,u1)]); }
  const cr=[cc[0]+hx, cc[1]+hy], wp=getTex("plaster");
  if(wp){ ctx.save(); ctx.fillStyle=wp; fillPoly([a,cc,cr,ar]); ctx.restore(); }
  if(lod===0) return;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const cx=(c+0.5)/cols, cy=(r+0.46)/rows, pw=0.42/cols, ph=0.38/rows;
    const isLit=(((r*7+c*11+lit)>>>0)%5)===0;
    ctx.fillStyle=isLit?"#e8dcc0":shade(accent,-18);
    fillPoly([P(cx-pw,cy-ph),P(cx+pw,cy-ph),P(cx+pw,cy+ph),P(cx-pw,cy+ph)]);
  }
}
function drawWallWindows(b,a,cc,ar,face){
  const ux=cc[0]-a[0],uy=cc[1]-a[1], hx=ar[0]-a[0],hy=ar[1]-a[1];
  const L=Math.hypot(ux,uy), Hh=Math.hypot(hx,hy); if(Hh<6||L<6) return;
  const P=(t,u)=>[a[0]+ux*t+hx*u, a[1]+uy*t+hy*u];                    // wall-space (along t, up u) -> world
  const t=b.type;
  const lod=wallFacadeLod(b,Hh);
  if(t==="house"){
    if(b.historic&&typeof drawHistoricFacade==="function"&&drawHistoricFacade(b,a,cc,ar,P,fillPoly)) return;
    if(b.church){
      // ashlar stone texture over the church facade
      { const cr=[cc[0]+hx, cc[1]+hy]; const wp=getTex("stonetex");
        if(wp){ ctx.save(); ctx.fillStyle=wp; fillPoly([a,cc,cr,ar]); ctx.restore(); }
        ctx.fillStyle="rgba(255,255,255,.05)"; fillPoly([P(0,0),P(1,0),P(1,0.3),P(0,0.3)]);
        ctx.fillStyle="rgba(0,0,0,.08)";       fillPoly([P(0,0.74),P(1,0.74),P(1,1),P(0,1)]); }
      const n=b.bigChurch?4:3, gc=["#c0392b","#2980b9","#27ae60","#f1c40f","#8e44ad"];      // tall pointed stained-glass windows
      for(let k=0;k<n;k++){ const c0=(k+0.5)/n;
        ctx.fillStyle="#241d1a"; fillPoly([P(c0-0.075,0.14),P(c0+0.075,0.14),P(c0+0.075,0.56),P(c0,0.7),P(c0-0.075,0.56)]);
        ctx.fillStyle=gc[k%gc.length]; fillPoly([P(c0-0.05,0.16),P(c0+0.05,0.16),P(c0+0.05,0.55),P(c0,0.66),P(c0-0.05,0.55)]);
        ctx.strokeStyle="rgba(20,16,12,.5)"; ctx.lineWidth=0.8; const mm=P(c0,0.16),mm2=P(c0,0.62); ctx.beginPath(); ctx.moveTo(mm[0],mm[1]); ctx.lineTo(mm2[0],mm2[1]); ctx.stroke();
        ctx.fillStyle="rgba(255,255,255,.16)"; fillPoly([P(c0-0.05,0.5),P(c0+0.05,0.5),P(c0+0.05,0.55),P(c0-0.05,0.55)]); }
      ctx.fillStyle="rgba(38,26,18,.96)"; fillPoly([P(0.42,0),P(0.58,0),P(0.58,0.30),P(0.5,0.4),P(0.42,0.30)]);   // arched doorway
      ctx.strokeStyle="#5a4632"; ctx.lineWidth=1; const d0=P(0.5,0),d1=P(0.5,0.36); ctx.beginPath(); ctx.moveTo(d0[0],d0[1]); ctx.lineTo(d1[0],d1[1]); ctx.stroke();
      const rcx=0.5,rcy=0.82,rr=0.075, rc=["#c0392b","#2980b9","#27ae60","#f1c40f","#8e44ad","#e67e22"];          // segmented rose window
      const ring=[]; for(let s=0;s<=14;s++){ const a=s/14*6.283; ring.push(P(rcx+Math.cos(a)*rr*1.15, rcy+Math.sin(a)*rr*1.7)); }
      ctx.fillStyle="#241d1a"; fillPoly(ring);
      for(let q=0;q<8;q++){ const a0=q/8*6.283, a1=(q+1)/8*6.283; ctx.fillStyle=rc[q%rc.length];
        fillPoly([P(rcx,rcy), P(rcx+Math.cos(a0)*rr, rcy+Math.sin(a0)*rr*1.5), P(rcx+Math.cos(a1)*rr, rcy+Math.sin(a1)*rr*1.5)]); }
      ctx.fillStyle="#f0e6c4"; const rcc=P(rcx,rcy); ctx.beginPath(); ctx.arc(rcc[0],rcc[1],2.2,0,7); ctx.fill();
      return;
    }
    // plaster texture over the house facade
    { const cr=[cc[0]+hx, cc[1]+hy]; const wp=getTex("plaster");
      if(wp){ ctx.save(); ctx.fillStyle=wp; fillPoly([a,cc,cr,ar]); ctx.restore(); }
      ctx.fillStyle="rgba(255,255,255,.05)"; fillPoly([P(0,0),P(1,0),P(1,0.32),P(0,0.32)]);
      ctx.fillStyle="rgba(0,0,0,.07)";       fillPoly([P(0,0.74),P(1,0.74),P(1,1),P(0,1)]); }
    ctx.fillStyle="rgba(40,28,18,.92)"; fillPoly([P(0.38,0),P(0.56,0),P(0.56,0.72),P(0.38,0.72)]);   // door
    ctx.fillStyle="#cfe3f0"; fillPoly([P(0.10,0.34),P(0.26,0.34),P(0.26,0.74),P(0.10,0.74)]);        // windows
    fillPoly([P(0.70,0.34),P(0.86,0.34),P(0.86,0.74),P(0.70,0.74)]);
    return;
  }
  const isTower=t==="tower", isBlok=t==="blok";
  const style=b.style||"";
  if(isTower&&lod<2){ drawTowerFacadeLod(b,a,cc,ar,P,fillPoly,Hh,hx,hy,lod); return; }
  if(isBlok&&lod<2){ drawBlokFacadeLod(b,a,cc,ar,P,fillPoly,Hh,hx,hy,lod); return; }
  // ---- TOWER styles: glass / gridglass / banded / concrete / darkglass ----
  if(isTower){
    const rows=Math.min(120,Math.max(3,Math.round(Hh/22)));
    const cols=Math.max(2,Math.round(L/22));
    const seed=((Math.round(a[0])*131+Math.round(a[1])*97)>>>0);
    const tint=b.glassTint||"#7fa0bd";
    const lit=b.litSeed||seed;
    const litRow=(r)=>(((r*7+seed*3)>>>0)%4)===0;   // a few fully-lit floors
    if(style==="glass"||style==="darkglass"){
      // continuous glass curtain wall: vertical mullions + horizontal spandrels, sky-tinted
      const dark=style==="darkglass";
      // base glass field with a soft top-to-bottom gradient (sky reflection up high)
      for(let r=0;r<rows;r++){
        const u0=r/rows, u1=(r+1)/rows;
        const p0=P(0,u0),p1=P(1,u0),p2=P(1,u1),p3=P(0,u1);
        const sky=1-u0;                                  // brighter near the top
        const base = dark ? shade(tint,-46+sky*22) : shade(tint,-8+sky*26);
        ctx.fillStyle=base; fillPoly([p0,p1,p2,p3]);
        // spandrel band (darker horizontal strip between floors)
        const sp0=P(0,u0+0.62/rows),sp1=P(1,u0+0.62/rows),sp2=P(1,u1),sp3=P(0,u1);
        ctx.fillStyle=dark?"rgba(12,18,26,.55)":"rgba(40,58,74,.34)";
        fillPoly([sp0,sp1,sp2,sp3]);
        if(litRow(r)){ ctx.fillStyle=dark?"rgba(220,200,150,.20)":"rgba(232,240,248,.30)";
          fillPoly([p0,p1,P(1,u0+0.6/rows),P(0,u0+0.6/rows)]); }
      }
      // vertical mullions
      ctx.strokeStyle=dark?"rgba(8,12,18,.55)":"rgba(255,255,255,.16)"; ctx.lineWidth=1;
      for(let c=0;c<=cols;c++){ const p0=P(c/cols,0),p1=P(c/cols,1); ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke(); }
      // bright reflection sweep across the upper-left of the face
      ctx.fillStyle="rgba(255,255,255,.10)";
      fillPoly([P(0,0),P(0.5,0),P(0.18,0.5),P(0,0.5)]);
    } else if(style==="gridglass"){
      // window grid set into a light frame — each pane realistic glass
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const cx=(c+0.5)/cols, cy=(r+0.5)/rows, pw=0.74/cols, ph=0.66/rows;
        const isLit=(((r*13+c*7+lit)>>>0)%5)===0;
        drawGlassPane(P, fillPoly, cx, cy, pw/2, ph/2, tint, isLit);
      }
      ctx.strokeStyle="rgba(0,0,0,.16)"; ctx.lineWidth=1;            // light spandrel grid
      for(let r=1;r<rows;r++){ const p0=P(0,r/rows),p1=P(1,r/rows); ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke(); }
    } else if(style==="banded"){
      // alternating glass ribbon + solid spandrel bands (horizontal emphasis)
      for(let r=0;r<rows;r++){
        const u0=r/rows,u1=(r+1)/rows,mid=u0+0.5/rows;
        ctx.fillStyle=shade(b.color, r%2?-10:4); fillPoly([P(0,u0),P(1,u0),P(1,mid),P(0,mid)]);  // solid band
        // glass ribbon — realistic panes
        for(let c=0;c<cols;c++){ const cx=(c+0.5)/cols, pw=0.82/cols;
          const isLit=(((r*11+c*5+lit)>>>0)%4)===0;
          drawGlassPane(P, fillPoly, cx, (mid+u1)/2, pw/2, (u1-mid)/2*0.86, tint, isLit);
        }
      }
    } else { // concrete: solid wall with punched window holes — realistic glass
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        const cx=(c+0.5)/cols, cy=(r+0.42)/rows, pw=0.46/cols, ph=0.5/rows;
        const isLit=(((r*9+c*11+lit)>>>0)%6)===0;
        drawGlassPane(P, fillPoly, cx, cy, pw/2, ph/2, tint, isLit);
      }
      ctx.strokeStyle="rgba(0,0,0,.14)"; ctx.lineWidth=1;            // panel seams
      for(let r=1;r<rows;r++){ const p0=P(0,r/rows),p1=P(1,r/rows); ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke(); }
    }
    // texture overlay across the whole face: glass smudge/reflection for glazed styles,
    // precast-panel grain for the concrete style.
    { const cr=[cc[0]+hx, cc[1]+hy];
      const wp=getTex(style==="concrete" ? "paneltex" : "glasstex");
      if(wp){ ctx.save(); ctx.fillStyle=wp; fillPoly([a,cc,cr,ar]); ctx.restore(); }
    }
    // corner pilaster shading: darken the far vertical edge for roundness
    ctx.fillStyle="rgba(0,0,0,.16)"; fillPoly([P(0,0),P(0.06,0),P(0.06,1),P(0,1)]);
    ctx.fillStyle="rgba(255,255,255,.07)"; fillPoly([P(0.94,0),P(1,0),P(1,1),P(0.94,1)]);
    // ground-floor lobby band
    ctx.fillStyle="rgba(20,28,36,.55)"; fillPoly([P(0,1-1/rows),P(1,1-1/rows),P(1,1),P(0,1)]);
    return;
  }
  // ---- BLOK styles: panel / brick / plaster / mixed ----
  if(isBlok){
    const rows=Math.min(40,Math.max(2,Math.round(Hh/30)));
    const cols=Math.max(2,Math.round(L/30));
    const seed=((Math.round(a[0])*131+Math.round(a[1])*97)>>>0);
    const lit=b.litSeed||seed;
    const accent=b.accent||"#8a6f5a";
    // wall base
    if(style==="brick"){
      // brick texture via offset rows of slightly-varied tone
      for(let r=0;r<rows*2;r++){ const u0=r/(rows*2),u1=(r+1)/(rows*2);
        ctx.fillStyle=shade(accent, (r%2?-6:4)+((r*37)%5-2)); fillPoly([P(0,u0),P(1,u0),P(1,u1),P(0,u1)]);
        ctx.strokeStyle="rgba(0,0,0,.14)"; ctx.lineWidth=0.8; const p0=P(0,u1),p1=P(1,u1); ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke(); }
    } else if(style==="plaster"){
      // flat plaster with subtle vertical stains
      for(let c=0;c<cols;c++){ const u0=c/cols,u1=(c+1)/cols;
        ctx.fillStyle=shade(b.color,(c%2?-4:3)); fillPoly([P(u0,0),P(u1,0),P(u1,1),P(u0,1)]); }
    } else if(style==="mixed"){
      // two-tone: lower courses in accent, upper in wall colour
      ctx.fillStyle=shade(accent,-4); fillPoly([P(0,0.5),P(1,0.5),P(1,1),P(0,1)]);
    }
    // panel seams for "panel" + grid windows for all blok styles
    if(style==="panel"){
      ctx.strokeStyle="rgba(0,0,0,.18)"; ctx.lineWidth=1;
      for(let c=1;c<cols;c++){ const p0=P(c/cols,0),p1=P(c/cols,1); ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke(); }
      for(let r=1;r<rows;r++){ const p0=P(0,r/rows),p1=P(1,r/rows); ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke(); }
    }
    // procedural texture so the wall reads as a real surface, not a flat fill.
    // Overlay the matching repeating pattern across the actual (lean-warped) wall quad.
    { const cr=[cc[0]+hx, cc[1]+hy];                              // 4th corner of the wall quad
      const texKey = style==="brick" ? "bricktex" : style==="panel" ? "paneltex"
                   : style==="mixed" ? "plasterB" : "plaster";
      const wp=getTex(texKey);
      if(wp){ ctx.save(); ctx.fillStyle=wp; fillPoly([a,cc,cr,ar]); ctx.restore(); }
      // soft directional light gradient over the facade (top brighter, base shaded)
      ctx.fillStyle="rgba(255,255,255,.06)"; fillPoly([P(0,0),P(1,0),P(1,0.30),P(0,0.30)]);
      ctx.fillStyle="rgba(0,0,0,.10)";       fillPoly([P(0,0.72),P(1,0.72),P(1,1),P(0,1)]);
    }
    // windows + balconies + stairwells. Long facade gets the full treatment; the visible
    // gable (short) face still gets ONE glazed entrance so no block looks featureless.
    const longFace = b.longHoriz ? (face===0||face===2) : (face===1||face===3);
    const gableFace = !longFace;                                  // short end currently being drawn
    const isFront = longFace;
    const hasBalc = b.balcony && isFront;
    const flrH = 1/rows;                                          // one floor in wall-space
    // stairwell core columns (evenly spaced) — regular windows skip these columns
    const coreCols=new Set();
    if(isFront && b.cores){ for(let k=0;k<b.cores;k++){ coreCols.add(Math.min(cols-1, Math.max(0, Math.round(((k+0.5)/b.cores)*cols-0.5)))); } }
    const lastRow = rows-1;                                       // ground floor row index
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      if(coreCols.has(c)) continue;
      // skip the ground-floor window directly where the gable door sits (avoid overlap)
      if(gableFace && r===lastRow && Math.abs((c+0.5)/cols - 0.5) < 0.12) continue;
      const isTop = r===0;
      const vOff = isTop ? 0.60 : 0.42;
      const cx=(c+0.5)/cols, cy=(r+vOff)/rows, pw=0.5/cols, ph=0.46/rows;
      const x0=cx-pw/2, x1=cx+pw/2, y0=cy-ph/2, y1=cy+ph/2;
      const isLit=(((r*7+c*11+lit)>>>0)%5)===0;
      // 1) recessed reveal (frame shadow) slightly larger than the glass
      ctx.fillStyle="rgba(0,0,0,.28)";
      fillPoly([P(x0-0.004,y0-0.004),P(x1+0.004,y0-0.004),P(x1+0.004,y1+0.004),P(x0-0.004,y1+0.004)]);
      // 2) window frame (light render/concrete surround)
      ctx.fillStyle=shade(b.color,18);
      fillPoly([P(x0-0.002,y0-0.002),P(x1+0.002,y0-0.002),P(x1+0.002,y1+0.002),P(x0-0.002,y1+0.002)]);
      // 3) glass — vertical sky-reflection gradient (darker top, brighter bottom) or warm lit
      if(isLit){
        ctx.fillStyle="#f1e3b8"; fillPoly([P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)]);            // warm interior light
        ctx.fillStyle="rgba(255,250,225,.5)"; fillPoly([P(x0,y0),P(x1,y0),P(x1,(y0+y1)/2),P(x0,(y0+y1)/2)]);
      } else {
        ctx.fillStyle="#41525e"; fillPoly([P(x0,y0),P(x1,y0),P(x1,y1),P(x0,y1)]);            // dark glass base
        ctx.fillStyle="#5d7585"; fillPoly([P(x0,(y0*0.35+y1*0.65)),P(x1,(y0*0.35+y1*0.65)),P(x1,y1),P(x0,y1)]); // brighter lower sky reflection
        ctx.fillStyle="rgba(200,222,235,.22)";                                              // diagonal glare streak
        fillPoly([P(x0+pw*0.12,y0),P(x0+pw*0.42,y0),P(x0+pw*0.18,y1),P(x0-pw*0.06,y1)]);
      }
      // 4) thin glazing bars (cross) + sill
      ctx.strokeStyle="rgba(20,24,28,.45)"; ctx.lineWidth=0.7;
      let g0=P(cx,y0),g1=P(cx,y1); ctx.beginPath(); ctx.moveTo(g0[0],g0[1]); ctx.lineTo(g1[0],g1[1]); ctx.stroke();
      g0=P(x0,cy); g1=P(x1,cy); ctx.beginPath(); ctx.moveTo(g0[0],g0[1]); ctx.lineTo(g1[0],g1[1]); ctx.stroke();
      ctx.fillStyle=shade(b.color,24); fillPoly([P(x0-0.003,y1+0.002),P(x1+0.003,y1+0.002),P(x1+0.003,y1+0.012),P(x0-0.003,y1+0.012)]); // sill highlight
      if(hasBalc && r>0){                                         // balcony slab just under each upper-floor window
        const bw=pw*1.15, bb0=y1+0.014, bb1=bb0+flrH*0.34;       // shallow slab, ~1/3 floor tall
        ctx.fillStyle=shade(b.color,-20); fillPoly([P(cx-bw,bb0),P(cx+bw,bb0),P(cx+bw,bb1),P(cx-bw,bb1)]);  // slab body
        ctx.fillStyle=shade(b.color,16);  fillPoly([P(cx-bw,bb0),P(cx+bw,bb0),P(cx+bw,bb0+flrH*0.07),P(cx-bw,bb0+flrH*0.07)]); // bright top edge
        ctx.strokeStyle="rgba(20,22,28,.65)"; ctx.lineWidth=0.8;  // vertical balusters
        for(let bk=0;bk<=4;bk++){ const bx=cx-bw+(bw*2)*(bk/4); const q0=P(bx,bb0+flrH*0.05),q1=P(bx,bb1-flrH*0.02);
          ctx.beginPath(); ctx.moveTo(q0[0],q0[1]); ctx.lineTo(q1[0],q1[1]); ctx.stroke(); }
      }
    }
    // stairwell cores: a narrow pilaster (same wall tone, faint seams) with small landing
    // windows aligned to the floor grid, and a glazed ground-floor entrance.
    if(isFront && b.cores){
      for(let k=0;k<b.cores;k++){
        const sc=(k+0.5)/b.cores;
        const sw=Math.max(0.30/cols, 0.012);                     // narrow strip (~ one window column)
        // faint seam lines marking the stair tower (no colour break -> no bright pillar)
        ctx.strokeStyle="rgba(0,0,0,.14)"; ctx.lineWidth=0.8;
        let s0=P(sc-sw,0), s1=P(sc-sw,1); ctx.beginPath(); ctx.moveTo(s0[0],s0[1]); ctx.lineTo(s1[0],s1[1]); ctx.stroke();
        s0=P(sc+sw,0); s1=P(sc+sw,1); ctx.beginPath(); ctx.moveTo(s0[0],s0[1]); ctx.lineTo(s1[0],s1[1]); ctx.stroke();
        // small stair-landing windows, one per floor, SAME size as ordinary windows
        const ww=0.5/cols*0.5, wh=0.46/rows*0.5;
        for(let r=0;r<rows;r++){ const cy=(r+0.42)*flrH;
          ctx.fillStyle="rgba(0,0,0,.18)"; fillPoly([P(sc-ww-0.002,cy-wh-0.002),P(sc+ww+0.002,cy-wh-0.002),P(sc+ww+0.002,cy+wh+0.002),P(sc-ww-0.002,cy+wh+0.002)]);
          ctx.fillStyle=(((r*5+k*9+lit)>>>0)%4===0)?"#cfd9e0":"#6f818d";
          fillPoly([P(sc-ww,cy-wh),P(sc+ww,cy-wh),P(sc+ww,cy+wh),P(sc-ww,cy+wh)]); }
        // glazed ground-floor entrance door
        drawGlazedDoor(P, fillPoly, sc, sw*0.85, flrH*0.66, b.color);
      }
    }
    // gable (short) face: give it a single glazed entrance centred at the base so vertical
    // blocks viewed end-on still read as inhabited, not blank.
    if(gableFace && b.cores){
      const dw=Math.min(0.16, 0.5/cols*1.4);
      drawGlazedDoor(P, fillPoly, 0.5, dw, flrH*0.7, b.color);
    }
    // ground-level passage (brama) through long blocks — dark archway at the BASE (u≈0)
    if(b.hasPassage && longFace){
      const pc=0.5, pw2=Math.min(0.045, 0.5/cols*1.5), aBot=flrH*0.92;
      ctx.fillStyle="rgba(8,8,10,.96)"; fillPoly([P(pc-pw2,0),P(pc+pw2,0),P(pc+pw2,aBot),P(pc-pw2,aBot)]);
      ctx.fillStyle=shade(b.color,10); fillPoly([P(pc-pw2*1.12,aBot),P(pc+pw2*1.12,aBot),P(pc+pw2*1.12,aBot+flrH*0.06),P(pc-pw2*1.12,aBot+flrH*0.06)]); // lintel
      ctx.strokeStyle="rgba(0,0,0,.45)"; ctx.lineWidth=0.8; strokePoly([P(pc-pw2,0),P(pc+pw2,0),P(pc+pw2,aBot),P(pc-pw2,aBot)]);
    }
    // edge shading for solidity
    ctx.fillStyle="rgba(0,0,0,.14)"; fillPoly([P(0,0),P(0.05,0),P(0.05,1),P(0,1)]);
    ctx.fillStyle="rgba(255,255,255,.06)"; fillPoly([P(0.95,0),P(1,0),P(1,1),P(0.95,1)]);
    // ground floor band (at the base, u≈0)
    ctx.fillStyle="rgba(30,28,26,.40)"; fillPoly([P(0,0),P(1,0),P(1,1/rows),P(0,1/rows)]);
    return;
  }
  // ---- fallback (shop/super/other non-house): original simple windows ----
  const glass=false;
  const rows=Math.min(90,Math.max(2,Math.round(Hh/20))), cols=Math.max(1,Math.round(L/15));
  const seed=((Math.round(a[0])*131+Math.round(a[1])*97)>>>0);
  // wall texture overlay (precast panel / concrete) + soft light gradient
  { const cr=[cc[0]+hx, cc[1]+hy]; const wp=getTex("paneltex");
    if(wp){ ctx.save(); ctx.fillStyle=wp; fillPoly([a,cc,cr,ar]); ctx.restore(); }
    ctx.fillStyle="rgba(255,255,255,.05)"; fillPoly([P(0,0),P(1,0),P(1,0.3),P(0,0.3)]);
    ctx.fillStyle="rgba(0,0,0,.07)";       fillPoly([P(0,0.74),P(1,0.74),P(1,1),P(0,1)]); }
  ctx.strokeStyle="rgba(0,0,0,.2)"; ctx.lineWidth=1;
  for(let r=1;r<rows;r++){ const u=r/rows,p0=P(0,u),p1=P(1,u); ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(p1[0],p1[1]); ctx.stroke(); }
  if(t==="shop"||t==="super"){ ctx.fillStyle=b.sign.c; fillPoly([P(0.03,0.74),P(0.97,0.74),P(0.97,0.95),P(0.03,0.95)]); }
  for(let r=0;r<rows;r++) for(let cn=0;cn<cols;cn++){
    const cx=(cn+0.5)/cols, cy=(r+0.42)/rows, pw=0.62/cols, ph=0.56/rows;
    const litw=((r*7+cn*11+seed)>>>0)%5===0;
    drawGlassPane(P, fillPoly, cx, cy, pw/2, ph/2, "#7f97ab", litw);
  }
}
function drawFacade(b,x,fy,w,H){
  const t=b.type;
  if(t==="house"){
    ctx.fillStyle="rgba(58,40,28,.9)"; ctx.fillRect(x+w*0.42, fy+H*0.18, Math.max(3,w*0.16), H*0.82);
    ctx.fillStyle="#cfe3f0"; const ww=Math.max(2.5,w*0.15);
    ctx.fillRect(x+w*0.12, fy+H*0.25, ww, H*0.5); ctx.fillRect(x+w*0.73-ww, fy+H*0.25, ww, H*0.5);
    return;
  }
  if(t==="shop"||t==="super"){
    ctx.fillStyle=b.sign.c; ctx.fillRect(x+2, fy+1, w-4, Math.max(3,H*0.36));
    ctx.fillStyle="rgba(255,255,255,.85)"; const n=Math.max(3,(w/16)|0), step=(w-12)/n;
    for(let k=0;k<n;k++) ctx.fillRect(x+6+k*step, fy+2.5, Math.max(2,step*0.45), Math.max(2,H*0.2));
    ctx.fillStyle="#bfe0ee"; ctx.fillRect(x+3, fy+H*0.52, w-6, H*0.44);
    ctx.strokeStyle="rgba(0,0,0,.25)"; ctx.lineWidth=0.8; for(let gx=x+9; gx<x+w-3; gx+=11){ ctx.beginPath(); ctx.moveTo(gx, fy+H*0.52); ctx.lineTo(gx, fy+H*0.95); ctx.stroke(); }
    return;
  }
  const isTower=t==="tower", isBlok=t==="blok", glass=isTower;
  // bigger, house-scale windows with wider spacing -> fewer windows
  const cg=isTower?26:isBlok?34:14, rg=isTower?28:isBlok?26:10;
  for(let wy=fy+4; wy<fy+H-2; wy+=rg) for(let wx=x+4; wx<x+w-3; wx+=cg){
    const lit=((wx*13+wy*7)>>>0)%5===0;
    ctx.fillStyle = glass ? (lit?"#dfeaf2":"#7fa0b8") : (lit?"#cfe0ee":"#586a78");
    ctx.fillRect(wx, wy, isTower?12:isBlok?17:7.4, isTower?14:isBlok?12:5.8);
  }
  if(t==="blok"){ ctx.strokeStyle="rgba(0,0,0,.22)"; ctx.lineWidth=1; for(let wy=fy+rg-1; wy<fy+H-2; wy+=rg){ ctx.beginPath(); ctx.moveTo(x+2,wy); ctx.lineTo(x+w-2,wy); ctx.stroke(); } }
}
function drawChurchRoof(b,x,ry,w,h){
  const long=w>=h, wall=b.color||"#bcb6a8";
  if(long){ const my=ry+h/2;
    ctx.fillStyle=shade(b.roofC,16); ctx.fillRect(x,ry,w,h/2); ctx.fillStyle=shade(b.roofC,-16); ctx.fillRect(x,my,w,h-h/2);
    ctx.strokeStyle="rgba(255,255,255,.25)"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(x+2,my); ctx.lineTo(x+w-2,my); ctx.stroke();
    ctx.strokeStyle="rgba(0,0,0,.16)"; ctx.lineWidth=1; for(let gx=x+10;gx<x+w-4;gx+=13){ ctx.beginPath(); ctx.moveTo(gx,ry+2); ctx.lineTo(gx,ry+h-2); ctx.stroke(); }
  } else { const mx=x+w/2;
    ctx.fillStyle=shade(b.roofC,16); ctx.fillRect(x,ry,w/2,h); ctx.fillStyle=shade(b.roofC,-16); ctx.fillRect(mx,ry,w-w/2,h);
    ctx.strokeStyle="rgba(255,255,255,.25)"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(mx,ry+2); ctx.lineTo(mx,ry+h-2); ctx.stroke();
    ctx.strokeStyle="rgba(0,0,0,.16)"; ctx.lineWidth=1; for(let gy=ry+10;gy<ry+h-4;gy+=13){ ctx.beginPath(); ctx.moveTo(x+2,gy); ctx.lineTo(x+w-2,gy); ctx.stroke(); }
  }
  ctx.fillStyle=shade(b.roofC,-30); for(const pc of [[x+1,ry+1],[x+w-3,ry+1],[x+1,ry+h-3],[x+w-3,ry+h-3]]) ctx.fillRect(pc[0],pc[1],2.6,2.6);   // pinnacles
  // ---- bell tower at the front-centre ----
  const cx=x+w/2, tw=Math.max(11,Math.min(18,w*0.34)), tEdge=ry+h+2, tTop=ry+h*0.06, th=tEdge-tTop;
  const tx=cx-tw/2;
  ctx.fillStyle=shade(wall,8); ctx.fillRect(tx,tTop,tw,th);
  ctx.fillStyle=shade(wall,-16); ctx.fillRect(tx,tTop,tw*0.30,th);
  ctx.strokeStyle="rgba(0,0,0,.4)"; ctx.lineWidth=1; ctx.strokeRect(tx,tTop,tw,th);
  const cly=tTop+th*0.34;                                                            // clock face
  ctx.fillStyle="#efe7d2"; ctx.beginPath(); ctx.arc(cx,cly,tw*0.27,0,7); ctx.fill();
  ctx.strokeStyle="#3a3024"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx,cly,tw*0.27,0,7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cly); ctx.lineTo(cx,cly-tw*0.18); ctx.moveTo(cx,cly); ctx.lineTo(cx+tw*0.13,cly+tw*0.04); ctx.stroke();
  const lw=tw*0.5, lx=cx-lw/2, ly=tEdge-13;                                          // belfry louver + bell
  ctx.fillStyle="#15181c"; ctx.beginPath(); ctx.moveTo(lx,ly+7); ctx.lineTo(lx,ly); ctx.arc(cx,ly,lw/2,Math.PI,0); ctx.lineTo(lx+lw,ly+7); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#c8a544"; ctx.fillRect(cx-1.4,ly+0.5,2.8,5);
  ctx.fillStyle=shade(b.roofC,-20); ctx.beginPath(); ctx.moveTo(tx-1.5,tTop); ctx.lineTo(cx,tTop-tw*1.15); ctx.lineTo(tx+tw+1.5,tTop); ctx.closePath(); ctx.fill();   // spire
  ctx.fillStyle=shade(b.roofC,-40); ctx.beginPath(); ctx.moveTo(tx-1.5,tTop); ctx.lineTo(cx,tTop-tw*1.15); ctx.lineTo(cx,tTop); ctx.closePath(); ctx.fill();
  const sp=tTop-tw*1.15;
  ctx.fillStyle="#ece6d6"; ctx.fillRect(cx-0.9,sp-9,1.8,9); ctx.fillRect(cx-3,sp-6,6,1.8);                       // cross
}
function drawRoofTop(b,x,ry,w,h){
  const dx=x-b.x, dy=ry-b.y;
  if(b.church){ drawChurchRoof(b,x,ry,w,h); return; }
  if(b.type==="house"){
    if(w>=h){ const my=ry+h/2; ctx.fillStyle=shade(b.roofC,14); ctx.fillRect(x,ry,w,h/2); ctx.fillStyle=shade(b.roofC,-14); ctx.fillRect(x,my,w,h-h/2);
      ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(x+2,my); ctx.lineTo(x+w-2,my); ctx.stroke(); }
    else { const mx=x+w/2; ctx.fillStyle=shade(b.roofC,14); ctx.fillRect(x,ry,w/2,h); ctx.fillStyle=shade(b.roofC,-14); ctx.fillRect(mx,ry,w-w/2,h);
      ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(mx,ry+2); ctx.lineTo(mx,ry+h-2); ctx.stroke(); }
    if(b.chimney){ ctx.fillStyle="#5a4a40"; ctx.fillRect(b.chimney[0]+dx, b.chimney[1]+dy, 5, 5); }
    return;
  }
  ctx.strokeStyle="rgba(255,255,255,.1)"; ctx.lineWidth=1.2; ctx.strokeRect(x+1.5,ry+1.5,w-3,h-3);
  ctx.fillStyle="rgba(0,0,0,.1)"; for(let k=0;k<5;k++){ const a=k*1.7; ctx.fillRect(x+w*0.3+Math.cos(a)*w*0.2, ry+h*0.3+Math.sin(a)*h*0.2,1.4,1.4); }
  for(const f of b.feat) drawRoofObj({t:f.t, x:f.x+dx, y:f.y+dy, w:f.w, h:f.h});
  if(b.type==="super"){ ctx.fillStyle=b.sign.c; ctx.fillRect(x+w*0.2, ry+h*0.4, w*0.6, Math.max(4,h*0.2)); }
  if(b.type==="tower"){
    if(b.helipad){ const cx=x+w/2,cy=ry+h/2,rr=Math.min(w,h)*0.28; ctx.strokeStyle="rgba(255,255,255,.5)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,rr,0,7); ctx.stroke(); ctx.fillStyle="rgba(255,255,255,.5)"; ctx.font="bold 11px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("H",cx,cy); ctx.textBaseline="alphabetic"; }
    if(b.antenna){ ctx.strokeStyle="#888"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x+w*0.5,ry+h*0.5); ctx.lineTo(x+w*0.5,ry-8); ctx.stroke(); ctx.fillStyle="#e0433a"; ctx.beginPath(); ctx.arc(x+w*0.5,ry-8,1.8,0,7); ctx.fill(); }
  }
}
function drawRoofObj(f){
  if(f.t==="tank"){ const r=Math.min(f.w,f.h)/2, cx=f.x+r, cy=f.y+r;
    ctx.fillStyle="#7a6750"; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.12)"; ctx.beginPath(); ctx.arc(cx-r*0.3,cy-r*0.3,r*0.42,0,7); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.stroke();
  } else if(f.t==="sky"){ ctx.fillStyle="#a7bccd"; ctx.fillRect(f.x,f.y,f.w,f.h);
    ctx.strokeStyle="rgba(0,0,0,.35)"; ctx.lineWidth=1; ctx.strokeRect(f.x,f.y,f.w,f.h);
    ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.x+f.w,f.y+f.h); ctx.moveTo(f.x+f.w,f.y); ctx.lineTo(f.x,f.y+f.h); ctx.stroke();
  } else if(f.t==="solar"){ ctx.fillStyle="#1d3450"; ctx.fillRect(f.x,f.y,f.w,f.h);
    ctx.strokeStyle="rgba(120,150,190,.55)"; ctx.lineWidth=0.8;
    for(let gx=f.x+3; gx<f.x+f.w; gx+=4){ ctx.beginPath(); ctx.moveTo(gx,f.y); ctx.lineTo(gx,f.y+f.h); ctx.stroke(); }
    for(let gy=f.y+3; gy<f.y+f.h; gy+=4){ ctx.beginPath(); ctx.moveTo(f.x,gy); ctx.lineTo(f.x+f.w,gy); ctx.stroke(); }
  } else if(f.t==="stair"){ ctx.fillStyle="#4a4d54"; ctx.fillRect(f.x,f.y,f.w,f.h);
    ctx.fillStyle="rgba(0,0,0,.28)"; ctx.fillRect(f.x,f.y,f.w,Math.max(2,f.h*0.4));
  } else { ctx.fillStyle="#53565e"; ctx.fillRect(f.x,f.y,f.w,f.h);
    ctx.fillStyle="rgba(0,0,0,.32)"; for(let gy=f.y+2; gy<f.y+f.h-1; gy+=3) ctx.fillRect(f.x+1,gy,f.w-2,1.1);
  }
}
function pavingLines(L){
  const s=26; ctx.strokeStyle="rgba(0,0,0,.14)"; ctx.lineWidth=1; ctx.beginPath();
  for(let gx=Math.ceil(L.x/s)*s; gx<L.x+L.w; gx+=s){ ctx.moveTo(gx,L.y); ctx.lineTo(gx,L.y+L.h); }
  for(let gy=Math.ceil(L.y/s)*s; gy<L.y+L.h; gy+=s){ ctx.moveTo(L.x,gy); ctx.lineTo(L.x+L.w,gy); }
  ctx.stroke();
}
const _tex={};
function getTex(key){
  if(key in _tex) return _tex[key];
  let pat=null;
  try{
    const S=160, cv=document.createElement("canvas"); cv.width=cv.height=S; const t=cv.getContext("2d");
    if(!t){ _tex[key]=null; return null; }
    let seed=0; for(let i=0;i<key.length;i++) seed+=key.charCodeAt(i)*131; seed=(seed*2654435761)>>>0;
    const rr=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
    const grain=(n,dark,light,sz)=>{ for(let i=0;i<n;i++){ const x=rr()*S,y=rr()*S; t.fillStyle = rr()<0.5?`rgba(${dark},${(0.04+rr()*0.08).toFixed(3)})`:`rgba(${light},${(0.03+rr()*0.06).toFixed(3)})`; t.fillRect(x,y,1+rr()*sz,1+rr()*sz); } };
    const bladeStrokes=(n,dark,light)=>{
      for(let i=0;i<n;i++){
        const x=rr()*S,y=rr()*S, len=1.5+rr()*5.5, ang=rr()*6.283;
        t.strokeStyle=rr()<0.52?`rgba(${dark},${(0.10+rr()*0.20).toFixed(3)})`:`rgba(${light},${(0.08+rr()*0.18).toFixed(3)})`;
        t.lineWidth=0.45+rr()*0.85; t.lineCap="round";
        t.beginPath(); t.moveTo(x,y); t.lineTo(x+Math.cos(ang)*len,y+Math.sin(ang)*len*0.75); t.stroke();
      }
    };
    const crack=(n,al)=>{ for(let i=0;i<n;i++){ t.strokeStyle=`rgba(0,0,0,${al})`; t.lineWidth=1; t.beginPath(); let x=rr()*S,y=rr()*S; t.moveTo(x,y); for(let k=0;k<5;k++){ x+=(rr()-0.5)*34; y+=(rr()-0.5)*34; t.lineTo(x,y);} t.stroke(); } };
    if(key==="grass"){
      for(let i=0;i<90;i++){ const x=rr()*S,y=rr()*S,w=6+rr()*20,h=5+rr()*16;
        t.fillStyle=rr()<0.5?`rgba(18,44,14,${(0.05+rr()*0.09).toFixed(3)})`:`rgba(92,138,56,${(0.04+rr()*0.08).toFixed(3)})`;
        t.fillRect(x,y,w,h); }
      grain(3400,"16,38,12","128,172,74",0.95); grain(1600,"10,28,8","148,192,86",0.55);
      bladeStrokes(480,"20,48,16","108,158,68");
      for(let i=0;i<120;i++){ const x=rr()*S,y=rr()*S; t.fillStyle=`rgba(${rr()<0.5?"24,56,20":"72,118,48"},${(0.06+rr()*0.10).toFixed(3)})`; t.fillRect(x,y,0.8+rr()*1.4,0.8+rr()*1.4); }
    }
    else if(key==="grass_forest"){
      for(let i=0;i<110;i++){ const x=rr()*S,y=rr()*S,w=8+rr()*26,h=6+rr()*18;
        t.fillStyle=rr()<0.58?`rgba(10,28,8,${(0.07+rr()*0.11).toFixed(3)})`:`rgba(34,68,28,${(0.05+rr()*0.09).toFixed(3)})`;
        t.fillRect(x,y,w,h); }
      grain(4000,"8,24,6","88,132,48",1.05); grain(2400,"6,18,5","68,108,38",0.62);
      for(let i=0;i<320;i++){ const x=rr()*S,y=rr()*S;
        t.fillStyle=rr()<0.45?`rgba(30,52,24,${(0.07+rr()*0.13).toFixed(3)})`:`rgba(48,82,36,${(0.06+rr()*0.11).toFixed(3)})`;
        t.fillRect(x,y,0.9+rr()*1.8,0.9+rr()*1.8); }
      bladeStrokes(360,"14,36,12","78,124,52");
      bladeStrokes(220,"58,40,22","42,68,30");
      for(let i=0;i<55;i++){ const x=rr()*S,y=rr()*S, rx=1+rr()*2.4, ry=0.6+rr()*1.6, rot=rr()*6.283;
        t.fillStyle=rr()<0.55?"rgba(62,44,24,0.14)":"rgba(36,58,26,0.12)";
        t.save(); t.translate(x,y); t.rotate(rot); t.beginPath(); t.ellipse(0,0,rx,ry,0,0,7); t.fill(); t.restore(); }
    }
    else if(key==="concrete"){ grain(1200,"0,0,0","255,255,255",1.3);
      t.strokeStyle="rgba(0,0,0,0.10)"; t.lineWidth=1.5; t.strokeRect(0.5,0.5,S-1,S-1); t.beginPath(); t.moveTo(S/2,0); t.lineTo(S/2,S); t.moveTo(0,S/2); t.lineTo(S,S/2); t.stroke(); crack(3,0.07); }
    else if(key==="asphalt"){ grain(1400,"0,0,0","205,210,215",1.4); crack(2,0.10); }
    else if(key==="sand"){ grain(1300,"120,95,55","255,240,200",1.2);
      t.strokeStyle="rgba(150,120,75,0.07)"; t.lineWidth=2; for(let i=0;i<7;i++){ t.beginPath(); const y=rr()*S; t.moveTo(0,y); for(let x=0;x<=S;x+=12) t.lineTo(x, y+Math.sin(x*0.09+i*1.7)*3); t.stroke(); } }
    else if(key==="sand_desert"){
      for(let i=0;i<70;i++){ const x=rr()*S,y=rr()*S,w=10+rr()*28,h=7+rr()*20;
        t.fillStyle=rr()<0.55?`rgba(148,112,68,${(0.06+rr()*0.10).toFixed(3)})`:`rgba(210,178,118,${(0.05+rr()*0.09).toFixed(3)})`;
        t.fillRect(x,y,w,h); }
      grain(1800,"108,82,48","228,204,152",1.15); grain(1200,"92,68,38","244,220,176",0.65);
      t.strokeStyle="rgba(130,98,58,0.08)"; t.lineWidth=2;
      for(let i=0;i<9;i++){ t.beginPath(); const y=rr()*S; t.moveTo(0,y); for(let x=0;x<=S;x+=10) t.lineTo(x,y+Math.sin(x*0.11+i*1.4)*3.2+Math.sin(x*0.04+i)*1.4); t.stroke(); }
      for(let i=0;i<40;i++){ const x=rr()*S,y=rr()*S,r=0.8+rr()*2.2;
        t.fillStyle=rr()<0.5?"rgba(118,92,58,0.22)":"rgba(168,138,88,0.18)"; t.beginPath(); t.arc(x,y,r,0,7); t.fill(); }
    }
    else if(key==="riverbed"){ t.fillStyle="#3a4a38"; t.fillRect(0,0,S,S);
      grain(900,"20,28,18","90,110,78",1.1);
      for(let i=0;i<48;i++){ const x=rr()*S,y=rr()*S,r=1.2+rr()*3.5;
        t.fillStyle=rr()<0.55?"rgba(52,48,40,0.35)":"rgba(78,88,62,0.28)"; t.beginPath(); t.arc(x,y,r,0,7); t.fill(); }
      for(let i=0;i<24;i++){ t.strokeStyle="rgba(30,38,26,0.18)"; t.lineWidth=0.8+rr()*1.2; t.lineCap="round";
        const x=rr()*S,y=rr()*S; t.beginPath(); t.moveTo(x,y); t.lineTo(x+(rr()-0.5)*12,y+(rr()-0.5)*8); t.stroke(); } t.lineCap="butt"; }
    else if(key==="water_lake"||key==="water_lake_v2"){
      const bg=t.createLinearGradient(0,0,0,S); bg.addColorStop(0,"#2a6a90"); bg.addColorStop(0.55,"#256080"); bg.addColorStop(1,"#1c5270");
      t.fillStyle=bg; t.fillRect(0,0,S,S);
      grain(2400,"6,18,32","120,190,230",0.75);
      t.strokeStyle="rgba(8,28,48,0.12)"; t.lineWidth=1.0; t.lineCap="round";
      for(let i=0;i<12;i++){ t.beginPath(); const y=rr()*S; t.moveTo(0,y);
        for(let x=0;x<=S;x+=12) t.lineTo(x, y+Math.sin(x*0.09+i*1.2)*2.4+Math.sin(x*0.035+i)*1.2); t.stroke(); }
      t.strokeStyle="rgba(210,240,255,0.08)"; t.lineWidth=0.7;
      for(let i=0;i<8;i++){ t.beginPath(); const y=rr()*S; t.moveTo(0,y);
        for(let x=0;x<=S;x+=14) t.lineTo(x, y+Math.sin(x*0.07+i*1.5)*1.8); t.stroke(); }
      t.lineCap="butt";
    }
    else if(key==="water_river"||key==="water_river_v2"){
      const bg=t.createLinearGradient(0,0,S,0); bg.addColorStop(0,"#2e8270"); bg.addColorStop(0.5,"#287060"); bg.addColorStop(1,"#2e8270");
      t.fillStyle=bg; t.fillRect(0,0,S,S);
      grain(2000,"8,28,24","130,210,190",0.7);
      t.strokeStyle="rgba(180,240,230,0.11)"; t.lineWidth=1.0; t.lineCap="round";
      for(let i=0;i<18;i++){ const y=8+rr()*(S-16); t.beginPath(); t.moveTo(0,y);
        for(let x=0;x<=S;x+=9) t.lineTo(x, y+Math.sin(x*0.07+i*0.85)*1.2+(rr()-0.5)*0.4); t.stroke(); }
      t.lineCap="butt";
    }
    else if(key==="water_shallow"){
      const bg=t.createLinearGradient(0,0,0,S); bg.addColorStop(0,"#58b0a8"); bg.addColorStop(1,"#489898");
      t.fillStyle=bg; t.fillRect(0,0,S,S);
      grain(1400,"40,90,88","180,240,235",0.9);
      t.strokeStyle="rgba(220,235,210,0.14)"; t.lineWidth=1.4; t.lineCap="round";
      for(let i=0;i<9;i++){ t.beginPath(); const y=rr()*S; t.moveTo(0,y);
        for(let x=0;x<=S;x+=11) t.lineTo(x, y+Math.sin(x*0.07+i*1.4)*2.5); t.stroke(); }
      t.lineCap="butt";
    }
    else if(key==="dirt"){ grain(1000,"0,0,0","150,120,80",1.7);
      for(let i=0;i<16;i++){ const x=rr()*S,y=rr()*S,r=2+rr()*4; t.fillStyle="rgba(90,82,70,0.18)"; t.beginPath(); t.arc(x,y,r,0,7); t.fill(); } }
    else if(key==="forest_trail"){
      t.fillStyle="#463628"; t.fillRect(0,0,S,S);
      grain(2400,"14,10,8","108,88,62",1.35); grain(1600,"22,18,12","138,118,86",0.95);
      for(let i=0;i<52;i++){ const x=rr()*S,y=rr()*S,r=1.2+rr()*4.2;
        t.fillStyle=rr()<0.55?"rgba(52,42,32,0.38)":"rgba(88,74,54,0.30)"; t.beginPath(); t.arc(x,y,r,0,7); t.fill(); }
      for(let i=0;i<38;i++){ t.fillStyle=rr()<0.58?"rgba(36,58,30,0.24)":"rgba(48,72,38,0.18)";
        t.fillRect(rr()*S,rr()*S,1+rr()*2.8,1+rr()*2); }
      for(let i=0;i<18;i++){ t.strokeStyle="rgba(28,40,22,0.16)"; t.lineWidth=0.6+rr()*1.1; t.lineCap="round";
        const x=rr()*S,y=rr()*S; t.beginPath(); t.moveTo(x,y); t.lineTo(x+(rr()-0.5)*14,y+(rr()-0.5)*9); t.stroke(); }
      t.lineCap="butt";
      t.fillStyle="rgba(128,108,82,0.10)"; t.beginPath(); t.ellipse(S*0.5,S*0.52,S*0.28,S*0.11,0.08,0,7); t.fill();
      t.fillStyle="rgba(32,48,26,0.06)"; for(let i=0;i<22;i++){ t.fillRect(rr()*S,rr()*S,2+rr()*4,1.2+rr()*2); } }
    else if(key==="roof"){ for(let y=0;y<S;y+=7){ t.strokeStyle="rgba(0,0,0,0.07)"; t.lineWidth=1; t.beginPath(); t.moveTo(0,y); t.lineTo(S,y); t.stroke(); }
      for(let y=0;y<S;y+=7){ for(let x=(((y/7)|0)%2)*9;x<S;x+=18){ t.strokeStyle="rgba(0,0,0,0.06)"; t.beginPath(); t.moveTo(x,y); t.lineTo(x,y+7); t.stroke(); } }
      grain(420,"0,0,0","255,255,255",1.1); }
    else if(key==="plaster"){ // fine stucco grain + faint mottling + subtle streaks
      grain(2600,"0,0,0","255,255,255",1.15);
      for(let i=0;i<40;i++){ const x=rr()*S,y=rr()*S,r=8+rr()*26; t.fillStyle=rr()<0.5?"rgba(0,0,0,0.030)":"rgba(255,255,255,0.030)"; t.beginPath(); t.arc(x,y,r,0,7); t.fill(); }
      for(let i=0;i<10;i++){ t.strokeStyle="rgba(0,0,0,0.035)"; t.lineWidth=1+rr()*2; t.beginPath(); const x=rr()*S; t.moveTo(x,0); for(let y=0;y<=S;y+=10) t.lineTo(x+(rr()-0.5)*4, y); t.stroke(); } }
    else if(key==="plasterB"){ // warmer/dirtier plaster variant
      grain(2400,"30,20,10","255,250,235",1.2);
      for(let i=0;i<46;i++){ const x=rr()*S,y=rr()*S,r=6+rr()*30; t.fillStyle=rr()<0.5?"rgba(40,28,16,0.045)":"rgba(255,248,232,0.035)"; t.beginPath(); t.arc(x,y,r,0,7); t.fill(); } }
    else if(key==="bricktex"){ // brick courses with mortar + per-brick tone variation
      const bh=8, bw=18;
      for(let y=0,row=0;y<S;y+=bh,row++){ const off=(row%2)*(bw/2);
        for(let x=-bw;x<S+bw;x+=bw){ const bx=x+off;
          const v=(rr()*22-11)|0; t.fillStyle=`rgba(${150+v},${88+(v*0.6|0)},${70+(v*0.5|0)},0.16)`;
          t.fillRect(bx+1,y+1,bw-2,bh-2);
          t.strokeStyle="rgba(40,28,22,0.18)"; t.lineWidth=1; t.strokeRect(bx+0.5,y+0.5,bw,bh); } }
      grain(900,"0,0,0","255,235,215",1.0); }
    else if(key==="paneltex"){ // precast panel: faint aggregate speckle + hairline joints
      grain(2200,"0,0,0","255,255,255",1.0);
      for(let i=0;i<260;i++){ const x=rr()*S,y=rr()*S; t.fillStyle=rr()<0.5?"rgba(0,0,0,0.05)":"rgba(255,255,255,0.05)"; t.fillRect(x,y,1.4,1.4); }
      for(let i=0;i<5;i++){ t.strokeStyle="rgba(0,0,0,0.05)"; t.lineWidth=1; const y=rr()*S; t.beginPath(); t.moveTo(0,y); t.lineTo(S,y); t.stroke(); } }
    else if(key==="glasstex"){ // faint cloudy reflections + smudges for curtain-wall glass
      for(let i=0;i<26;i++){ const x=rr()*S,y=rr()*S,r=14+rr()*40; const g=t.createRadialGradient(x,y,0,x,y,r);
        const a=(0.02+rr()*0.05).toFixed(3); g.addColorStop(0,`rgba(255,255,255,${a})`); g.addColorStop(1,"rgba(255,255,255,0)");
        t.fillStyle=g; t.beginPath(); t.arc(x,y,r,0,7); t.fill(); }
      for(let i=0;i<18;i++){ const x=rr()*S,y=rr()*S,r=10+rr()*30; const g=t.createRadialGradient(x,y,0,x,y,r);
        const a=(0.02+rr()*0.04).toFixed(3); g.addColorStop(0,`rgba(0,0,0,${a})`); g.addColorStop(1,"rgba(0,0,0,0)");
        t.fillStyle=g; t.beginPath(); t.arc(x,y,r,0,7); t.fill(); }
      grain(700,"0,0,0","255,255,255",0.9); }
    else if(key==="stonetex"){ // church ashlar stone: large blocks + weathering grain
      const bh=16, bw=26;
      for(let y=0,row=0;y<S;y+=bh,row++){ const off=(row%2)*(bw/2);
        for(let x=-bw;x<S+bw;x+=bw){ const bx=x+off; const v=(rr()*26-13)|0;
          t.fillStyle=`rgba(${188+v},${176+v},${158+v},0.20)`; t.fillRect(bx+1,y+1,bw-2,bh-2);
          t.strokeStyle="rgba(70,60,46,0.32)"; t.lineWidth=1.3; t.strokeRect(bx+0.5,y+0.5,bw,bh);
          t.fillStyle="rgba(255,250,235,0.10)"; t.fillRect(bx+1,y+1,bw-2,2); } }      // top-edge highlight per block
      grain(1400,"0,0,0","255,248,230",1.2); }
    pat=ctx.createPattern(cv,"repeat");
  }catch(e){ pat=null; }
  _tex[key]=pat; return pat;
}
function texFillPoly(poly,key){ const p=getTex(key); if(!p) return; ctx.fillStyle=p; ctx.beginPath(); ctx.moveTo(poly[0][0],poly[0][1]); for(let k=1;k<poly.length;k++) ctx.lineTo(poly[k][0],poly[k][1]); ctx.closePath(); ctx.fill(); }
function groundTexKey(L,sandy){
  if(sandy) return L.biome==="desert"?"sand_desert":"sand";
  return L.biome==="forest"?"grass_forest":"grass";
}
function texFill(L,key){ texFillPoly(L.poly,key); }
function fillCell(L,color){ const p=L.poly; ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(p[0][0],p[0][1]); ctx.lineTo(p[1][0],p[1][1]); ctx.lineTo(p[2][0],p[2][1]); ctx.lineTo(p[3][0],p[3][1]); ctx.closePath(); ctx.fill(); }
function drawParkingLot(L){ if(!L.stalls) return; ctx.strokeStyle="rgba(230,230,235,.5)"; ctx.lineWidth=1.5; for(const s of L.stalls) ctx.strokeRect(s.x-s.w/2+2,s.y-s.h/2+2,s.w-4,s.h-4); }

function drawLamps(ox,oy){
  const i0=Math.floor((ox-NODE_VAR)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR)/GAP)+1;
  const j0=Math.floor((oy-NODE_VAR)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR)/GAP)+1;
  const PL=40;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); if(!L.lamps) continue; for(const lm of L.lamps){
    if(lm.x<ox-40||lm.x>ox+VW+40||lm.y<oy-PL-40||lm.y>oy+VH+40) continue;
    ctx.fillStyle="rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(lm.x,lm.y,4,2,0,0,7); ctx.fill();           // base shadow
    if(lm.fall){ const ang=lm.fall.ang, ux=Math.sin(ang)*lm.fdx, uy=-Math.cos(ang)+Math.sin(ang)*lm.fdy, tx=lm.x+ux*PL, ty=lm.y+uy*PL;
      ctx.strokeStyle="rgba(40,42,46,.95)"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(lm.x,lm.y); ctx.lineTo(tx,ty); ctx.stroke(); ctx.lineCap="butt";
      ctx.fillStyle="#3a3d42"; ctx.beginPath(); ctx.arc(tx,ty,3.2,0,7); ctx.fill();
      ctx.fillStyle="rgba(150,160,170,.4)"; ctx.beginPath(); ctx.arc(tx,ty,1.5,0,7); ctx.fill(); continue; }
    const topx=lm.x, topy=lm.y-PL, hx=lm.hx, hy=lm.hy-PL;                                                    // upright 3D street lamp
    ctx.fillStyle="#2a2d31"; ctx.beginPath(); ctx.ellipse(lm.x,lm.y,3.4,2,0,0,7); ctx.fill();                  // base
    ctx.strokeStyle="#34373c"; ctx.lineWidth=3; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(lm.x,lm.y); ctx.lineTo(topx,topy); ctx.stroke();   // pole
    ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(topx,topy); ctx.lineTo(hx,hy); ctx.stroke();                // arm over the road
    ctx.lineCap="butt";
    ctx.save(); ctx.translate(hx,hy); ctx.rotate(Math.atan2(hy-topy,hx-topx));                                 // cobra fixture head
    ctx.fillStyle=lm.dead?"#26282c":"#3a3d42"; rrFill(-2.5,-3.2,10,6.4,2.6);
    if(!lm.dead){ ctx.fillStyle="#fff3cf"; rrFill(-1.5,-1.5,7,3,1.4); ctx.fillStyle="rgba(255,243,200,.55)"; rrFill(-1.5,1.2,7,1.8,1); }
    ctx.restore();
  } }
}
function drawMotoDealerLot(L){
  ctx.fillStyle="rgba(255,255,255,.06)"; for(let gx=L.x+20;gx<L.x+L.w-10;gx+=Math.max(40,L.w/5)){ ctx.fillRect(gx,L.y+L.h*0.42,2,L.h*0.3); }
  ctx.fillStyle="#1a1d22"; ctx.fillRect(L.x+L.w*0.5-52, L.y+6, 104, 18);
  ctx.fillStyle="#e0a32e"; ctx.fillRect(L.x+L.w*0.5-52, L.y+6, 104, 3);
  ctx.fillStyle="#ffd566"; ctx.font="bold 12px monospace"; ctx.textAlign="center"; ctx.textBaseline="alphabetic"; ctx.fillText("MOTO SALON ▸ F", L.x+L.w*0.5, L.y+19);
}
function drawRacks(ox,oy){
  const i0=Math.floor((ox-GAP)/GAP)-1,i1=Math.floor((ox+VW)/GAP)+1,j0=Math.floor((oy-GAP)/GAP)-1,j1=Math.floor((oy+VH)/GAP)+1;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); if(!L.rack) continue; const rk=L.rack;
    if(rk.x<ox-30||rk.x>ox+VW+30||rk.y<oy-30||rk.y>oy+VH+30) continue;
    ctx.save(); ctx.translate(rk.x,rk.y); ctx.rotate(rk.a);
    ctx.strokeStyle="#6a7078"; ctx.lineWidth=2.4; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(-rk.len/2,0); ctx.lineTo(rk.len/2,0); ctx.stroke();
    for(let k=0;k<=rk.n;k++){ const x=-rk.len/2+rk.len*k/rk.n; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,-5); ctx.stroke(); }
    ctx.lineCap="butt"; ctx.restore();
  }
}
function drawParked(ox,oy){
  const i0=Math.floor((ox-GAP)/GAP)-1,i1=Math.floor((ox+VW)/GAP)+1,j0=Math.floor((oy-GAP)/GAP)-1,j1=Math.floor((oy+VH)/GAP)+1;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); for(const pc of L.parked){ if(pc.x<ox-40||pc.x>ox+VW+40||pc.y<oy-40||pc.y>oy+VH+40) continue; drawVehicle(pc,pc.color); } }
}
function drawBeach(a,b,ccx,ccy,t){
  let nx=-(b[1]-a[1]), ny=(b[0]-a[0]); const nl=Math.hypot(nx,ny)||1; nx/=nl; ny/=nl;
  const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2; if((ccx-mx)*nx+(ccy-my)*ny<0){ nx=-nx; ny=-ny; }   // point into the water cell
  const N=12, inner=[], foam=[];
  const noise=(px,py)=>0.5+0.30*Math.sin(px*0.055+py*0.045)+0.20*Math.sin(px*0.12-py*0.085+1.7);  // world-seeded -> continuous coast
  for(let s=0;s<=N;s++){ const ex=a[0]+(b[0]-a[0])*s/N, ey=a[1]+(b[1]-a[1])*s/N, D=11+19*noise(ex,ey);
    inner.push([ex+nx*D, ey+ny*D]);
    const Ff=D*0.82 + Math.sin(ex*0.18+ey*0.18 - t*2)*1.6; foam.push([ex+nx*Ff, ey+ny*Ff]); }
  ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); for(let s=N;s>=0;s--) ctx.lineTo(inner[s][0],inner[s][1]); ctx.closePath();
  const sg=ctx.createLinearGradient(mx,my, mx+nx*30, my+ny*30);
  sg.addColorStop(0,"rgba(224,208,162,0.92)"); sg.addColorStop(0.45,"rgba(118,168,166,0.55)"); sg.addColorStop(1,"rgba(60,120,150,0)");
  ctx.fillStyle=sg; ctx.fill();
  ctx.strokeStyle="rgba(244,252,255,.6)"; ctx.lineWidth=2.2; ctx.lineCap="round"; ctx.beginPath();   // animated foam at the waterline
  for(let s=0;s<=N;s++){ if(s===0)ctx.moveTo(foam[s][0],foam[s][1]); else ctx.lineTo(foam[s][0],foam[s][1]); } ctx.stroke();
  for(let w=0;w<2;w++){ const ph=(t*0.30 + w*0.5)%1, al=0.42*Math.sin(ph*Math.PI);                  // rolling surf breaking toward the beach
    if(al<0.03) continue; ctx.strokeStyle=`rgba(236,248,255,${al.toFixed(3)})`; ctx.lineWidth=1.5; ctx.beginPath();
    for(let s=0;s<=N;s++){ const ex=a[0]+(b[0]-a[0])*s/N, ey=a[1]+(b[1]-a[1])*s/N, D=11+19*noise(ex,ey), off=D*0.85+34*(1-ph);
      if(s===0) ctx.moveTo(ex+nx*off,ey+ny*off); else ctx.lineTo(ex+nx*off,ey+ny*off); } ctx.stroke(); }
  ctx.lineCap="butt";
}
function clipWaterPolys(polys){
  ctx.beginPath();
  for(const q of polys){ ctx.moveTo(q[0][0],q[0][1]); for(let k=1;k<q.length;k++) ctx.lineTo(q[k][0],q[k][1]); ctx.closePath(); }
}
function applyWaterPattern(texKey,ox,oy,t,alpha,speed){
  const pat=getTex(texKey); if(!pat) return;
  const S=160, sp=speed||1;
  ctx.save();
  if(alpha!=null) ctx.globalAlpha=alpha;
  const dx=-((t*14*sp)%S), dy=-((t*9*sp)%S);
  ctx.translate(dx,dy);
  ctx.fillStyle=pat;
  ctx.fillRect(ox-S*2,oy-S*2,VW+S*4,VH+S*4);
  ctx.restore();
}
function tintWaterDepth(polys,scoreFn,deep,shallow){
  for(const q of polys){
    let cx=0,cy=0; for(const p of q){ cx+=p[0]; cy+=p[1]; } cx/=q.length; cy/=q.length;
    const depth=clamp(scoreFn(cx,cy)*1.75,0,1);
    const r=deep[0]+(shallow[0]-deep[0])*(1-depth), g=deep[1]+(shallow[1]-deep[1])*(1-depth), b=deep[2]+(shallow[2]-deep[2])*(1-depth);
    ctx.fillStyle=`rgba(${r|0},${g|0},${b|0},${(0.10+depth*0.20).toFixed(3)})`;
    ctx.beginPath(); ctx.moveTo(q[0][0],q[0][1]); for(let k=1;k<q.length;k++) ctx.lineTo(q[k][0],q[k][1]); ctx.closePath(); ctx.fill();
  }
}
function drawShallowWater(){}
function drawWaterGlobal(ox,oy){
  const step=34, x0=ox-step, y0=oy-step, x1=ox+VW+step, y1=oy+VH+step, t=performance.now()/1000;
  const polys=[], bnd=[];                                                       // ONE marching-squares pass over the whole view -> seamless across lots
  for(let gy=y0; gy<y1; gy+=step) for(let gx=x0; gx<x1; gx+=step){
    const v0=lakeScore(gx,gy), v1=lakeScore(gx+step,gy), v2=lakeScore(gx+step,gy+step), v3=lakeScore(gx,gy+step);
    if(v0<=0&&v1<=0&&v2<=0&&v3<=0) continue;
    const C=[[gx,gy],[gx+step,gy],[gx+step,gy+step],[gx,gy+step]], V=[v0,v1,v2,v3], poly=[], cr=[];
    for(let e=0;e<4;e++){ const a=C[e],va=V[e],b=C[(e+1)%4],vb=V[(e+1)%4];
      if(va>0) poly.push(a);
      if((va>0)!==(vb>0)){ const tt=va/(va-vb), px=a[0]+(b[0]-a[0])*tt, py=a[1]+(b[1]-a[1])*tt; poly.push([px,py]); cr.push([px,py]); } }
    if(poly.length>=3) polys.push(poly);
    if(cr.length===2) bnd.push(cr);
  }
  if(polys.length){
    clipWaterPolys(polys);
    const wg=ctx.createLinearGradient(0,oy,0,oy+VH); wg.addColorStop(0,"#2c6c97"); wg.addColorStop(0.55,"#286888"); wg.addColorStop(1,"#1f5278"); ctx.fillStyle=wg; ctx.fill();
    ctx.save(); ctx.clip();
    applyWaterPattern("water_lake_v2",ox,oy,t,0.58);
    if(typeof applyWaterSimInClip==="function") applyWaterSimInClip("lake",0.42,0.006);
    tintWaterDepth(polys,lakeScore,[8,28,48],[40,100,130]);
    const wy=(x,ry)=> ry + Math.sin(x*0.10 - t*1.4 + ry*0.05)*2.6 + Math.sin(x*0.045 + ry*0.09 + t*0.8)*2.0;
    const ry0=Math.floor(oy/24)*24, x0w=Math.floor(ox/22)*22;
    ctx.strokeStyle="rgba(13,40,66,.22)"; ctx.lineWidth=1.5; ctx.beginPath();
    for(let ry=ry0;ry<oy+VH+24;ry+=24){ let f=true; for(let x=x0w;x<=ox+VW+22;x+=22){ const yy=wy(x,ry)+1.6; if(f){ctx.moveTo(x,yy);f=false;}else ctx.lineTo(x,yy);} } ctx.stroke();
    ctx.strokeStyle="rgba(206,234,255,.10)"; ctx.lineWidth=0.9; ctx.beginPath();
    for(let ry=ry0;ry<oy+VH+24;ry+=24){ let f=true; for(let x=x0w;x<=ox+VW+22;x+=22){ const yy=wy(x,ry); if(f){ctx.moveTo(x,yy);f=false;}else ctx.lineTo(x,yy);} } ctx.stroke();
    const Sun=sunShadow(gameHour), warm=Sun?(1-Math.sin(Math.PI*((gameHour-6.2)/13.1))):0;
    if(Sun&&warm>0.08){ ctx.fillStyle=`rgba(255,168,86,${(0.12*warm).toFixed(3)})`; ctx.fillRect(ox,oy,VW,VH); }
    ctx.restore();
    if(bnd.length){
      ctx.save(); ctx.globalCompositeOperation="source-over";
      const shallowPat=getTex("water_shallow");
      if(shallowPat){
        ctx.lineCap="round"; ctx.lineJoin="round"; ctx.strokeStyle=shallowPat; ctx.lineWidth=16;
        ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
      }
      ctx.restore();
      ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.strokeStyle="rgba(224,208,162,.50)"; ctx.lineWidth=11; ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
      ctx.strokeStyle="rgba(150,196,196,.48)"; ctx.lineWidth=6; ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
      const fa=0.5+0.18*Math.sin(t*2.5); ctx.strokeStyle=`rgba(244,252,255,${fa.toFixed(3)})`; ctx.lineWidth=2.4; ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
      ctx.lineCap="butt"; ctx.lineJoin="miter";
    }
  }
  const i0=Math.floor((ox-NODE_VAR)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR)/GAP)+1, j0=Math.floor((oy-NODE_VAR)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR)/GAP)+1;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); if(!L.dock) continue; const d=L.dock;   // docks
    ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.ang); const w=d.w;
    ctx.fillStyle="rgba(0,0,0,.22)"; ctx.fillRect(1,-w/2+2,d.len+ (d.kind==="marina"?w:0),w);
    if(d.kind==="marina"){
      ctx.fillStyle="#9a9a93"; ctx.fillRect(0,-w/2,d.len,w);                               // concrete deck
      ctx.fillStyle="#86867e"; ctx.fillRect(0,-w/2,d.len,2.5); ctx.fillStyle="#74746c"; ctx.fillRect(0,w/2-2.5,d.len,2.5);
      ctx.fillStyle="#9a9a93"; ctx.fillRect(d.len-w, -w*1.7, w, w*1.7);                     // L-arm at the tip
      ctx.fillStyle="#86867e"; ctx.fillRect(d.len-w,-w*1.7,w,2.5);
      ctx.fillStyle="#2b2b2b"; for(let px=14;px<d.len-4;px+=24){ ctx.beginPath(); ctx.arc(px,-w/2+3,2.4,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(px,w/2-3,2.4,0,7); ctx.fill(); }   // bollards
      ctx.fillStyle="#caa24a"; ctx.fillRect(d.len-6,-w*1.7,2.5,w*1.7);                      // edge stripe
    } else {
      ctx.fillStyle="#7a5a38"; ctx.fillRect(0,-w/2,d.len,w);
      ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1; for(let px=6;px<d.len;px+=8){ ctx.beginPath(); ctx.moveTo(px,-w/2); ctx.lineTo(px,w/2); ctx.stroke(); }
      ctx.fillStyle="#5a4128"; ctx.fillRect(d.len-3,-w/2-1,3,w+2);
    }
    ctx.restore();
  }
}
function drawWater(L){
  const x0=L.x, y0=L.y, ww=L.w, hh=L.h, step=30, t=performance.now()/1000;
  const polys=[], bnd=[];                                                      // marching squares over the smooth field
  for(let gy=y0; gy<y0+hh; gy+=step) for(let gx=x0; gx<x0+ww; gx+=step){
    const sx=Math.min(step,x0+ww-gx), sy=Math.min(step,y0+hh-gy);
    const C=[[gx,gy],[gx+sx,gy],[gx+sx,gy+sy],[gx,gy+sy]];
    const V=[waterScore(C[0][0],C[0][1]),waterScore(C[1][0],C[1][1]),waterScore(C[2][0],C[2][1]),waterScore(C[3][0],C[3][1])];
    const poly=[], cr=[];
    for(let e=0;e<4;e++){ const a=C[e],va=V[e],b=C[(e+1)%4],vb=V[(e+1)%4];
      if(va>0) poly.push(a);
      if((va>0)!==(vb>0)){ const tt=va/(va-vb), px=a[0]+(b[0]-a[0])*tt, py=a[1]+(b[1]-a[1])*tt; poly.push([px,py]); cr.push([px,py]); } }
    if(poly.length>=3) polys.push(poly);
    if(cr.length===2) bnd.push(cr);
  }
  if(!polys.length) return;
  ctx.beginPath();
  for(const q of polys){ ctx.moveTo(q[0][0],q[0][1]); for(let k=1;k<q.length;k++) ctx.lineTo(q[k][0],q[k][1]); ctx.closePath(); }
  const wg=ctx.createLinearGradient(x0,y0,x0,y0+hh); wg.addColorStop(0,"#2c6c97"); wg.addColorStop(1,"#235c87");
  ctx.fillStyle=wg; ctx.fill();
  ctx.save(); ctx.clip();                                                      // surface detail clipped to the water shape
  if(typeof applyWaterSimInClip==="function") applyWaterSimInClip("lake",0.55,0.007);
  ctx.fillStyle="rgba(15,46,74,.30)"; for(const r of L.ripples){ ctx.beginPath(); ctx.ellipse(r.x,r.y,r.w*0.62,r.w*0.32,0,0,7); ctx.fill(); }
  const wy=(x,ry)=> ry + Math.sin(x*0.10 - t*1.4 + ry*0.05)*2.6 + Math.sin(x*0.045 + ry*0.09 + t*0.8)*2.0;
  ctx.strokeStyle="rgba(13,40,66,.42)"; ctx.lineWidth=2.2; ctx.beginPath();
  for(let ry=y0+6;ry<y0+hh;ry+=20){ let f=true; for(let x=x0;x<=x0+ww;x+=18){ const yy=wy(x,ry)+1.9; if(f){ctx.moveTo(x,yy);f=false;}else ctx.lineTo(x,yy);} } ctx.stroke();
  ctx.strokeStyle="rgba(206,234,255,.20)"; ctx.lineWidth=1.4; ctx.beginPath();
  for(let ry=y0+6;ry<y0+hh;ry+=20){ let f=true; for(let x=x0;x<=x0+ww;x+=18){ const yy=wy(x,ry); if(f){ctx.moveTo(x,yy);f=false;}else ctx.lineTo(x,yy);} } ctx.stroke();
  const Sun=sunShadow(gameHour), warm=Sun?(1-Math.sin(Math.PI*((gameHour-6.2)/13.1))):0;
  if(Sun&&warm>0.08){ ctx.fillStyle=`rgba(255,168,86,${(0.17*warm).toFixed(3)})`; ctx.fillRect(x0,y0,ww,hh); }
  const gl=warm>0.3?"255,206,150":"255,255,255";
  ctx.globalCompositeOperation="lighter";
  for(const r of L.ripples){ const tw=0.5+0.5*Math.sin(t*2.4+r.x*0.3+r.y*0.2); if(tw>0.52){ const gy=wy(r.x,r.y); ctx.fillStyle=`rgba(${gl},${(0.08+0.18*tw).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(r.x,gy,2.6,1,0,0,7); ctx.fill(); } }
  ctx.restore();
  if(bnd.length){                                                              // organic coastline: sand band + animated foam
    ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.strokeStyle="rgba(224,208,162,.45)"; ctx.lineWidth=11; ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
    ctx.strokeStyle="rgba(150,196,196,.45)"; ctx.lineWidth=6; ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
    const fa=0.5+0.18*Math.sin(t*2.5); ctx.strokeStyle=`rgba(244,252,255,${fa.toFixed(3)})`; ctx.lineWidth=2.4; ctx.beginPath(); for(const s of bnd){ ctx.moveTo(s[0][0],s[0][1]); ctx.lineTo(s[1][0],s[1][1]); } ctx.stroke();
    ctx.lineCap="butt"; ctx.lineJoin="miter";
  }
  if(L.dock){ const d=L.dock; ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.ang);
    ctx.fillStyle="rgba(0,0,0,.2)"; ctx.fillRect(1,-d.w/2+2,d.len,d.w);
    ctx.fillStyle="#7a5a38"; ctx.fillRect(0,-d.w/2,d.len,d.w);
    ctx.strokeStyle="rgba(0,0,0,.3)"; ctx.lineWidth=1; for(let px=6;px<d.len;px+=8){ ctx.beginPath(); ctx.moveTo(px,-d.w/2); ctx.lineTo(px,d.w/2); ctx.stroke(); }
    ctx.fillStyle="#5a4128"; ctx.fillRect(d.len-3,-d.w/2-1,3,d.w+2); ctx.restore();
    const ex=d.x+Math.cos(d.ang)*d.len, ey=d.y+Math.sin(d.ang)*d.len, pp=d.ang+Math.PI/2;
    drawBoat(ex+Math.cos(pp)*13, ey+Math.sin(pp)*13, d.ang, "row", "#b58a4a");
  }
}
// ── PNG forest grass (Pillow-generated, assets/grass-forest/*.png) ───────
const FOREST_GRASS={ready:false,meta:null,img:{}};
window.FOREST_GRASS=FOREST_GRASS;
(function loadForestGrassSprites(){
  fetch("assets/grass-forest/meta.json").then(r=>r.json()).then(meta=>{
    FOREST_GRASS.meta=meta;
    const keys=Object.keys(meta.variants||{}); let left=keys.length||0;
    if(!left){ FOREST_GRASS.ready=true; return; }
    for(const k of keys){
      const im=new Image();
      im.onload=im.onerror=()=>{ if(--left<=0) FOREST_GRASS.ready=true; };
      im.src="assets/grass-forest/"+meta.variants[k].file;
      FOREST_GRASS.img[k]=im;
    }
  }).catch(()=>{});
})();
function forestGrassMeta(key){
  const v=FOREST_GRASS.meta?.variants?.[key];
  if(v) return v;
  return FOREST_GRASS.meta?.variants?.clump_med||{width:52,height:56,anchorX:26,anchorY:55};
}
function drawForestGrassClump(x,y,s,v){
  const m=forestGrassMeta(v), img=FOREST_GRASS.img[v]||FOREST_GRASS.img.clump_med;
  if(!img||!img.complete||!img.naturalWidth) return false;
  const sc=s*2.05/(m.height||56), W=(m.width||52)*sc, H=(m.height||56)*sc;
  const ax=(m.anchorX??((m.width||52)*0.5))*sc, ay=(m.anchorY??((m.height||56)-1))*sc;
  const sm=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  ctx.drawImage(img,x-ax,y-ay,W,H);
  ctx.imageSmoothingEnabled=sm;
  return true;
}
const GRASS_TONE=["rgba(26,56,20,.96)","rgba(46,92,36,.96)","rgba(80,146,58,.95)","rgba(120,184,86,.95)"];
function drawClump(x,y,s){
  const h=(n)=>{ const v=Math.sin(x*12.9898+y*78.233+n*37.17)*43758.5453; return v-(v|0); };
  const n=5+((h(0)*3)|0);                                            // 5-7 blades per clump
  ctx.fillStyle="rgba(18,38,14,.38)"; ctx.fillRect(x-s*0.5, y-1.6, s, 2.6);   // grounded base
  for(let k=0;k<n;k++){
    const dx=(h(k+1)-0.5)*s*1.15, bl=s*(0.72+h(k+9)*0.7), lean=(h(k+5)-0.5)*s*0.75;
    const wd=0.9+h(k+3)*0.7, bx=x+dx;
    ctx.fillStyle=GRASS_TONE[Math.min(3,(h(k+7)*4)|0)];
    ctx.beginPath(); ctx.moveTo(bx-wd,y); ctx.lineTo(bx+wd,y); ctx.lineTo(bx+lean,y-bl); ctx.closePath(); ctx.fill();
  }
}
function drawGrassDetail(L){
  if(VW>2200) return;                                            // grass invisible when far out: skip entirely
  const cl=cam.x-VW/2-20, cr=cam.x+VW/2+20, ct=cam.y-VH/2-20, cb=cam.y+VH/2+20;
  const useForest=L.biome==="forest"&&FOREST_GRASS.ready;
  const fKeys=useForest?(FOREST_GRASS._keys||(FOREST_GRASS._keys=Object.keys(FOREST_GRASS.meta?.variants||{}))):null;
  for(const t of L.tufts){
    if(t.x<cl||t.x>cr||t.y<ct||t.y>cb) continue;
    if(useForest){
      const vk=t.v||fKeys[(((t.x*73856093)^(t.y*19349663))>>>0)%fKeys.length];
      if(!drawForestGrassClump(t.x,t.y,t.s,vk)) drawClump(t.x,t.y,t.s);
    } else drawClump(t.x,t.y,t.s);
  }
  for(const f of L.flowers){ ctx.fillStyle=f.c; ctx.beginPath(); ctx.arc(f.x,f.y,1.7,0,7); ctx.fill(); ctx.fillStyle="rgba(255,255,255,.5)"; ctx.fillRect(f.x-0.4,f.y-0.4,0.9,0.9); }
}
function drawForestFloor(L){
  if(!L.forestFloor||!L.forestFloor.length||VW>1700) return;
  const cl=cam.x-VW/2-24, cr=cam.x+VW/2+24, ct=cam.y-VH/2-24, cb=cam.y+VH/2+24;
  for(const d of L.forestFloor){
    if(d.x<cl||d.x>cr||d.y<ct||d.y>cb) continue;
    drawForestFloraItem(d);
  }
}

// ── PNG desert floor (assets/sand-desert/*.png) ───────────────────────────
const DESERT_FLOOR={ready:false,meta:null,img:{}};
(function loadDesertFloorSprites(){
  fetch("assets/sand-desert/meta.json").then(r=>r.json()).then(meta=>{
    DESERT_FLOOR.meta=meta;
    const keys=Object.keys(meta.variants||{}); let left=keys.length||0;
    if(!left){ DESERT_FLOOR.ready=true; return; }
    for(const k of keys){
      const im=new Image();
      im.onload=im.onerror=()=>{ if(--left<=0) DESERT_FLOOR.ready=true; };
      im.src="assets/sand-desert/"+meta.variants[k].file;
      DESERT_FLOOR.img[k]=im;
    }
  }).catch(()=>{});
})();
function desertFloorMeta(key){
  const v=DESERT_FLOOR.meta?.variants?.[key];
  if(v) return v;
  return DESERT_FLOOR.meta?.variants?.ripple_light||{width:56,height:40,anchorX:28,anchorY:38};
}
function drawDesertFloorClump(x,y,s,v){
  const m=desertFloorMeta(v), img=DESERT_FLOOR.img[v]||DESERT_FLOOR.img.ripple_light;
  if(!img||!img.complete||!img.naturalWidth) return false;
  const sc=s*2.1/(m.height||40), W=(m.width||56)*sc, H=(m.height||40)*sc;
  const ax=(m.anchorX??((m.width||56)*0.5))*sc, ay=(m.anchorY??((m.height||40)-1))*sc;
  const sm=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  ctx.drawImage(img,x-ax,y-ay,W,H);
  ctx.imageSmoothingEnabled=sm;
  return true;
}
function drawDesertFloraCanvas(d){
  const s=d.s, r=d.rot||0, x=d.x, y=d.y;
  ctx.save(); ctx.translate(x,y); ctx.rotate(r);
  switch(d.kind){
    case "sage": case "dry_twigs": {
      ctx.strokeStyle="#6a6840"; ctx.lineWidth=1.4;
      for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(k*s*0.2,-s*0.5,k*s*0.35,-s*0.85); ctx.stroke(); }
      ctx.fillStyle="rgba(90,98,52,.55)"; ctx.beginPath(); ctx.ellipse(0,-s*0.35,s*0.55,s*0.32,0,0,7); ctx.fill();
      break;
    }
    case "pebble": case "pebble_cluster": {
      for(let k=0;k<4;k++){ const px=(k-1.5)*s*0.22, py=(k%2)*s*0.08;
        ctx.fillStyle=k%2?"#8a7458":"#6a5840"; ctx.beginPath(); ctx.arc(px,py,s*0.14,0,7); ctx.fill(); }
      break;
    }
    case "crack": case "cracked_earth": {
      ctx.strokeStyle="rgba(92,68,42,.55)"; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(-s*0.4,0); ctx.lineTo(s*0.35,-s*0.2); ctx.moveTo(0,-s*0.15); ctx.lineTo(s*0.2,s*0.25); ctx.stroke();
      break;
    }
    case "salt_crust": {
      ctx.fillStyle="rgba(228,220,198,.45)"; ctx.beginPath(); ctx.ellipse(0,0,s*0.7,s*0.45,0,0,7); ctx.fill();
      break;
    }
    default: return false;
  }
  ctx.restore(); return true;
}
function drawDesertFloraItem(d){
  const vk=d.v||d.kind;
  if(vk && DESERT_FLOOR.ready && drawDesertFloorClump(d.x,d.y,d.s,vk)) return;
  drawDesertFloraCanvas(d);
}
function drawDesertFloor(L){
  if(!L.desertFloor||!L.desertFloor.length||VW>1700) return;
  const cl=cam.x-VW/2-24, cr=cam.x+VW/2+24, ct=cam.y-VH/2-24, cb=cam.y+VH/2+24;
  for(const d of L.desertFloor){
    if(d.x<cl||d.x>cr||d.y<ct||d.y>cb) continue;
    drawDesertFloraItem(d);
  }
}

function drawForestRock(x,y,s,v,moss){
  ctx.save(); ctx.translate(x,y);
  const sc=Math.max(0.55,s/14);
  ctx.scale(sc,sc);
  ctx.fillStyle="rgba(16,14,10,0.2)"; ctx.beginPath(); ctx.ellipse(2,4,9,3.2,0,0,7); ctx.fill();
  const shapes=[
    [[-7,5],[-3,-6],[4,-3],[8,4]],
    [[-8,4],[-4,-5],[2,-7],[7,-1],[6,5]],
    [[-6,6],[0,-8],[6,2],[3,6]],
    [[-5,5],[-6,-2],[0,-7],[5,-4],[7,3]],
  ];
  const sh=shapes[(v||0)%shapes.length];
  ctx.fillStyle=moss?"#5a5848":"#6e6860";
  ctx.beginPath(); ctx.moveTo(sh[0][0],sh[0][1]);
  for(let i=1;i<sh.length;i++) ctx.lineTo(sh[i][0],sh[i][1]);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle=moss?"#4a4840":"#565048";
  ctx.beginPath(); ctx.moveTo(sh[1][0],sh[1][1]);
  for(let i=2;i<sh.length;i++) ctx.lineTo(sh[i][0],sh[i][1]);
  ctx.lineTo(sh[0][0]*0.35,sh[0][1]*0.55); ctx.closePath(); ctx.fill();
  if(moss){
    ctx.fillStyle="rgba(48,72,42,0.48)"; ctx.beginPath(); ctx.ellipse(-2,-3,4.2,2.4,-0.3,0,7); ctx.fill();
    ctx.fillStyle="rgba(58,88,48,0.34)"; ctx.beginPath(); ctx.ellipse(3,-1,3.2,1.9,0.2,0,7); ctx.fill();
  }
  ctx.fillStyle="rgba(255,248,230,0.14)"; ctx.beginPath(); ctx.ellipse(-2,-4,2.2,1.3,-0.4,0,7); ctx.fill();
  ctx.restore();
}

function drawForestFloraItem(d){
  const s=d.s, r=d.rot||0, x=d.x, y=d.y;
  ctx.save(); ctx.translate(x,y); ctx.rotate(r);
  switch(d.kind){
    case "leaf": {
      const c=["#5a4020","#6a5028","#3a5828","#7a6020","#4a4820"][(s*3|0)%5];
      ctx.fillStyle=c; ctx.beginPath(); ctx.ellipse(0,0,s*0.9,s*0.55,s*0.4,0,7); ctx.fill();
      ctx.fillStyle="rgba(255,255,220,.18)"; ctx.beginPath(); ctx.ellipse(-s*0.15,-s*0.1,s*0.35,s*0.2,s*0.3,0,7); ctx.fill();
      break;
    }
    case "fern": {
      ctx.lineWidth=1.4; ctx.strokeStyle="#286830";
      for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(k*s*0.22,-s*0.55,k*s*0.38,-s*0.95); ctx.stroke(); }
      ctx.strokeStyle="#347838"; ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(s*0.12,-s*0.5,s*0.22,-s*0.88); ctx.stroke();
      break;
    }
    case "bracken": {
      ctx.strokeStyle="#1e4a20"; ctx.lineWidth=1.6;
      for(let k=-3;k<=3;k++){ ctx.beginPath(); ctx.moveTo(k*1.5,s*0.1); ctx.quadraticCurveTo(k*s*0.18,-s*0.45,k*s*0.32,-s*1.05); ctx.stroke(); }
      ctx.fillStyle="rgba(40,72,36,0.35)"; ctx.beginPath(); ctx.ellipse(0,s*0.05,s*0.55,s*0.22,0,0,7); ctx.fill();
      break;
    }
    case "moss": {
      ctx.fillStyle="rgba(28,58,28,.55)"; ctx.beginPath(); ctx.ellipse(0,0,s*1.1,s*0.72,0,0,7); ctx.fill();
      ctx.fillStyle="rgba(52,88,48,.42)"; ctx.beginPath(); ctx.ellipse(-s*0.2,-s*0.15,s*0.55,s*0.38,0,0,7); ctx.fill();
      ctx.fillStyle="rgba(68,102,58,.28)"; ctx.beginPath(); ctx.ellipse(s*0.18,s*0.08,s*0.42,s*0.28,0,0,7); ctx.fill();
      break;
    }
    case "lichen": {
      ctx.fillStyle="rgba(148,138,108,0.42)"; ctx.beginPath(); ctx.ellipse(0,0,s,s*0.62,0.2,0,7); ctx.fill();
      ctx.fillStyle="rgba(178,188,148,0.35)"; ctx.beginPath(); ctx.ellipse(-s*0.15,0,s*0.55,s*0.38,0,0,7); ctx.fill();
      ctx.fillStyle="rgba(108,128,88,0.28)"; ctx.beginPath(); ctx.ellipse(s*0.2,-s*0.08,s*0.45,s*0.32,0,0,7); ctx.fill();
      for(let k=0;k<5;k++){ ctx.fillStyle="rgba(92,82,62,0.22)"; ctx.beginPath(); ctx.arc((k-2)*s*0.18,(k%2)*s*0.12,s*0.12,0,7); ctx.fill(); }
      break;
    }
    case "ivy": {
      ctx.fillStyle="#2a5a28";
      for(let k=0;k<6;k++){ const ang=k*1.05, lx=Math.cos(ang)*s*0.35, ly=Math.sin(ang)*s*0.28;
        ctx.beginPath(); ctx.ellipse(lx,ly,s*0.22,s*0.16,ang,0,7); ctx.fill(); }
      ctx.strokeStyle="#1a4018"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-s*0.4,s*0.2); ctx.quadraticCurveTo(0,-s*0.2,s*0.5,s*0.15); ctx.stroke();
      break;
    }
    case "clover": {
      ctx.fillStyle="#347838";
      for(let k=0;k<3;k++){ const a=k*2.094; ctx.beginPath(); ctx.ellipse(Math.cos(a)*s*0.22,Math.sin(a)*s*0.18,s*0.18,s*0.14,a,0,7); ctx.fill(); }
      ctx.strokeStyle="#286830"; ctx.lineWidth=0.9; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,s*0.35); ctx.stroke();
      break;
    }
    case "berry": {
      ctx.fillStyle="#2a5028"; ctx.beginPath(); ctx.ellipse(0,s*0.05,s*0.35,s*0.55,0,0,7); ctx.fill();
      const bc=((s*7|0)%2)===0?"#a82838":"#3848a8";
      for(let k=0;k<5+(s|0);k++){ const bx=(k%3-1)*s*0.18, by=-s*0.15+(k/5)*s*0.35;
        ctx.fillStyle=bc; ctx.beginPath(); ctx.arc(bx,by,1.1+s*0.05,0,7); ctx.fill();
        ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(bx-0.3,by-0.3,0.45,0,7); ctx.fill(); }
      break;
    }
    case "violet": {
      ctx.fillStyle="#3a6838"; ctx.beginPath(); ctx.ellipse(0,s*0.12,s*0.28,s*0.42,0,0,7); ctx.fill();
      for(let k=0;k<3;k++){ const a=k*2.09; ctx.fillStyle=k===0?"#7a48a8":"#9868c0";
        ctx.beginPath(); ctx.ellipse(Math.cos(a)*s*0.2,Math.sin(a)*s*0.15-s*0.05,s*0.16,s*0.12,a,0,7); ctx.fill(); }
      ctx.fillStyle="#c8a838"; ctx.beginPath(); ctx.arc(0,-s*0.02,1.2,0,7); ctx.fill();
      break;
    }
    case "heather": {
      ctx.strokeStyle="#4a3868"; ctx.lineWidth=1.1; ctx.beginPath(); ctx.moveTo(0,s*0.2); ctx.lineTo(0,-s*0.55); ctx.stroke();
      for(let k=0;k<6;k++){ const py=-s*0.08-k*s*0.08;
        ctx.fillStyle=k%2?"#9868b0":"#b888c8"; ctx.beginPath(); ctx.arc((k%3-1)*2.5,py,1.4,0,7); ctx.fill(); }
      break;
    }
    case "sprout": {
      ctx.fillStyle="#4a7838"; ctx.beginPath(); ctx.ellipse(0,s*0.08,s*0.14,s*0.38,0,0,7); ctx.fill();
      ctx.fillStyle="#68a048"; ctx.beginPath(); ctx.ellipse(-s*0.12,-s*0.18,s*0.22,s*0.12,-0.5,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s*0.12,-s*0.22,s*0.22,s*0.12,0.5,0,7); ctx.fill();
      break;
    }
    case "twig": {
      ctx.strokeStyle="#4a3828"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(-s*0.4,s*0.2); ctx.lineTo(s*0.5,-s*0.35); ctx.stroke();
      ctx.strokeStyle="#6a5038"; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(s*0.1,-s*0.05); ctx.lineTo(s*0.35,-s*0.28); ctx.stroke();
      break;
    }
    case "deadwood": {
      ctx.strokeStyle="#3a2818"; ctx.lineWidth=1.8; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(-s*0.45,s*0.15); ctx.lineTo(s*0.42,-s*0.12); ctx.stroke();
      ctx.fillStyle="rgba(48,38,28,0.45)"; ctx.beginPath(); ctx.ellipse(s*0.42,-s*0.12,s*0.14,s*0.1,0,0,7); ctx.fill();
      break;
    }
    case "needle": {
      ctx.strokeStyle="#2a5828"; ctx.lineWidth=1; for(let k=0;k<4;k++){ const a=k*1.2-0.6; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*s*0.5,-Math.sin(a)*s*0.5-0.2); ctx.stroke(); }
      break;
    }
    case "log": {
      ctx.fillStyle="#3a2818"; ctx.beginPath(); ctx.ellipse(0,s*0.08,s*1.05,s*0.38,0,0,7); ctx.fill();
      ctx.fillStyle="#5a4030"; ctx.beginPath(); ctx.ellipse(-s*0.15,0,s*0.75,s*0.28,0,0,7); ctx.fill();
      ctx.fillStyle="#2a1810"; ctx.beginPath(); ctx.ellipse(s*0.95,0,s*0.12,s*0.22,0,0,7); ctx.fill();
      break;
    }
    case "shroom":
    case "shroom_brown": drawFloraMushroomBrown(s); break;
    case "shroom_red": drawFloraMushroomRed(s); break;
    case "shroom_tan": drawFloraMushroomTan(s); break;
    case "shroom_puff": drawFloraMushroomPuff(s); break;
    case "shroom_lilac": drawFloraMushroomLilac(s); break;
    case "shroom_shelf": drawFloraMushroomShelf(s); break;
    case "rock_pebble": {
      const c=["#6a6458","#5a5448","#726a5e"][(d.v||0)%3];
      ctx.fillStyle="rgba(14,12,10,0.16)"; ctx.beginPath(); ctx.ellipse(0.8,1.2,s*0.55,s*0.22,0,0,7); ctx.fill();
      ctx.fillStyle=c; ctx.beginPath(); ctx.ellipse(0,0,s*0.72,s*0.48,r*0.2,0,7); ctx.fill();
      ctx.fillStyle="rgba(255,245,220,0.18)"; ctx.beginPath(); ctx.ellipse(-s*0.15,-s*0.12,s*0.22,s*0.14,r*0.1,0,7); ctx.fill();
      break;
    }
    case "rock_flat": {
      ctx.fillStyle="rgba(14,12,10,0.14)"; ctx.beginPath(); ctx.ellipse(1,1.5,s*0.85,s*0.28,r*0.15,0,7); ctx.fill();
      ctx.fillStyle="#5e5850"; ctx.beginPath();
      ctx.moveTo(-s*0.9,s*0.15); ctx.lineTo(-s*0.35,-s*0.35); ctx.lineTo(s*0.45,-s*0.22); ctx.lineTo(s*0.95,s*0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#4a4640"; ctx.beginPath();
      ctx.moveTo(-s*0.35,-s*0.35); ctx.lineTo(s*0.45,-s*0.22); ctx.lineTo(s*0.2,s*0.18); ctx.closePath(); ctx.fill();
      ctx.fillStyle="rgba(52,78,44,0.28)"; ctx.beginPath(); ctx.ellipse(-s*0.1,-s*0.08,s*0.35,s*0.18,r*0.2,0,7); ctx.fill();
      break;
    }
    default: { // blade
      ctx.strokeStyle="#2a5828"; ctx.lineWidth=1.1; for(let k=-1;k<=1;k++){ ctx.beginPath(); ctx.moveTo(k*2,s*0.15); ctx.quadraticCurveTo(k*2.5,-s*0.35,k*1.2,-s*0.75); ctx.stroke(); }
    }
  }
  ctx.restore();
}

function drawFloraMushroomStem(s, w){
  ctx.fillStyle="#e8e4d8"; ctx.fillRect(-w,s*0.02,w*2,s*0.38);
  ctx.fillStyle="rgba(0,0,0,0.06)"; ctx.fillRect(w*0.3,s*0.05,w*0.5,s*0.32);
}

function drawFloraMushroomRed(s){
  drawFloraMushroomStem(s,0.85);
  ctx.fillStyle="#b82828"; ctx.beginPath(); ctx.ellipse(0,-s*0.1,s*0.58,s*0.42,0,0,7); ctx.fill();
  ctx.fillStyle="#d04040"; ctx.beginPath(); ctx.ellipse(-s*0.08,-s*0.16,s*0.32,s*0.22,-0.2,0,7); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.88)";
  for(let k=0;k<5;k++){ const px=(k%3-1)*s*0.16, py=-s*0.08-(k>2?0.12:0);
    ctx.beginPath(); ctx.ellipse(px,py,s*0.09,s*0.07,0,0,7); ctx.fill(); }
}

function drawFloraMushroomBrown(s){
  drawFloraMushroomStem(s,0.75);
  ctx.fillStyle="#6a4828"; ctx.beginPath(); ctx.ellipse(0,-s*0.08,s*0.62,s*0.4,0,0,7); ctx.fill();
  ctx.fillStyle="#8a6038"; ctx.beginPath(); ctx.ellipse(-s*0.1,-s*0.14,s*0.28,s*0.18,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(40,28,16,0.25)"; ctx.beginPath(); ctx.ellipse(0,-s*0.02,s*0.38,s*0.12,0,0,7); ctx.fill();
}

function drawFloraMushroomTan(s){
  drawFloraMushroomStem(s,0.65);
  ctx.fillStyle="#c8a038"; ctx.beginPath();
  ctx.moveTo(-s*0.45,-s*0.05); ctx.quadraticCurveTo(-s*0.2,-s*0.45,s*0.05,-s*0.35);
  ctx.quadraticCurveTo(s*0.35,-s*0.55,s*0.48,-s*0.08); ctx.quadraticCurveTo(s*0.15,s*0.05,-s*0.45,-s*0.05); ctx.fill();
  ctx.fillStyle="#e8c858"; ctx.beginPath(); ctx.ellipse(-s*0.08,-s*0.22,s*0.18,s*0.12,-0.3,0,7); ctx.fill();
}

function drawFloraMushroomPuff(s){
  ctx.fillStyle="#d8d4c8"; ctx.beginPath(); ctx.ellipse(0,-s*0.05,s*0.52,s*0.48,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(-s*0.12,-s*0.14,s*0.22,s*0.16,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(180,176,168,0.35)"; ctx.beginPath(); ctx.ellipse(0,s*0.08,s*0.38,s*0.12,0,0,7); ctx.fill();
}

function drawFloraMushroomLilac(s){
  drawFloraMushroomStem(s,0.55);
  ctx.fillStyle="#8868a8"; ctx.beginPath(); ctx.ellipse(0,-s*0.06,s*0.48,s*0.34,0,0,7); ctx.fill();
  ctx.fillStyle="#a888c8"; ctx.beginPath(); ctx.ellipse(-s*0.08,-s*0.12,s*0.22,s*0.14,0,0,7); ctx.fill();
}

function drawFloraMushroomShelf(s){
  ctx.fillStyle="#5a4028"; ctx.fillRect(-s*0.55,0,s*1.1,s*0.18);
  ctx.fillStyle="#8a6038"; ctx.beginPath(); ctx.ellipse(0,-s*0.02,s*0.75,s*0.22,0,0,7); ctx.fill();
  ctx.fillStyle="#a87848"; ctx.beginPath(); ctx.ellipse(-s*0.15,-s*0.06,s*0.35,s*0.12,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.ellipse(s*0.12,-s*0.04,s*0.18,s*0.08,0,0,7); ctx.fill();
}
function drawSandDetail(L){
  const isDesert=L.biome==="desert";
  if(L.biome==="desert"||L.biome==="sea"){
    const nd=isDesert?6:4;
    for(let k=0;k<nd;k++){
      const dx=L.x+hsh(L.i,L.j,500+k)*L.w, dy=L.y+hsh(L.i,L.j,520+k)*L.h;
      const rw=L.w*(0.22+hsh(L.i,L.j,540+k)*0.28);
      ctx.fillStyle=(k%2?"rgba(255,238,200,.13)":"rgba(120,92,56,.12)");
      ctx.beginPath(); ctx.ellipse(dx,dy,rw,rw*0.5,0.5,0,7); ctx.fill();
    }
    if(isDesert && L.hill){
      ctx.fillStyle="rgba(90,68,38,.08)"; ctx.beginPath();
      ctx.ellipse(L.x+L.w*0.55,L.y+L.h*0.45,L.w*0.28,L.h*0.14,0.3,0,7); ctx.fill();
    }
    if(isDesert && typeof gameHour!=="undefined" && gameHour>7 && gameHour<19){
      const tt=performance.now()*0.001, sh=0.04+0.02*Math.sin(tt*0.7+L.i*0.3);
      ctx.fillStyle=`rgba(255,220,160,${sh.toFixed(3)})`;
      ctx.fillRect(L.x,L.y,L.w,L.h);
    }
  }
  ctx.strokeStyle="rgba(255,240,205,.13)"; ctx.lineWidth=1.5;
  for(const r of L.ripples){ ctx.save(); ctx.translate(r.x,r.y); ctx.rotate(r.a||0); ctx.beginPath(); ctx.moveTo(-r.w/2,0); ctx.quadraticCurveTo(0,-5,r.w/2,0); ctx.stroke(); ctx.restore(); }
  ctx.strokeStyle="rgba(108,80,48,.14)"; ctx.lineWidth=1.5;
  for(const r of L.ripples){ ctx.save(); ctx.translate(r.x,r.y+2.2); ctx.rotate(r.a||0); ctx.beginPath(); ctx.moveTo(-r.w/2,0); ctx.quadraticCurveTo(0,-5,r.w/2,0); ctx.stroke(); ctx.restore(); }
  for(const p of L.pebbles){ ctx.fillStyle=p.s>1.8?"rgba(116,96,68,.65)":"rgba(150,128,92,.55)"; ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,7); ctx.fill();
    ctx.fillStyle="rgba(255,246,216,.32)"; ctx.beginPath(); ctx.arc(p.x-p.s*0.3,p.y-p.s*0.3,p.s*0.42,0,7); ctx.fill(); }
}
function drawCactus(p){
  const x=p.x, y=p.y, s=Math.max(11,p.s*1.25);
  const h=(n)=>{ const v=Math.sin(x*12.9898+y*78.233+n*37.17)*43758.5453; return v-(v|0); };
  const kind=h(0), DARK="#1f4a1e", BODY="#3f7a3a", LIGHT="#5fa84e", FLOW=["#e7553b","#f0c33a","#e87ab0"];
  ctx.fillStyle="rgba(60,46,26,.28)"; ctx.beginPath(); ctx.ellipse(x+s*0.12,y+2,s*0.5,s*0.17,0,0,7); ctx.fill();   // shadow
  if(kind<0.18){                                                      // prickly pear (opuntia)
    const pads=[[0,0,1],[-0.5,-0.35,0.8],[0.5,-0.4,0.78],[0,-0.95,0.7],[-0.4,-1.0,0.5]];
    for(const pd of pads){ const px=x+pd[0]*s*0.5, py=y-s*0.32+pd[1]*s*0.5, pw=s*0.34*pd[2], ph=s*0.42*pd[2];
      ctx.fillStyle=DARK; ctx.beginPath(); ctx.ellipse(px,py,pw+1.4,ph+1.4,0.2,0,7); ctx.fill();
      ctx.fillStyle=BODY; ctx.beginPath(); ctx.ellipse(px,py,pw,ph,0.2,0,7); ctx.fill();
      ctx.fillStyle="rgba(235,240,205,.5)"; for(let k=0;k<5;k++){ ctx.beginPath(); ctx.arc(px+(h(10+k+pd[0]*7)-0.5)*pw*1.4, py+(h(20+k)-0.5)*ph*1.4, 0.7,0,7); ctx.fill(); } }
    if(h(2)<0.6){ ctx.fillStyle=FLOW[(h(3)*3)|0]; ctx.beginPath(); ctx.arc(x,y-s*0.9,2.2,0,7); ctx.fill(); }
    ctx.lineJoin="miter"; ctx.lineCap="butt"; return;
  }
  if(kind<0.36){                                                      // barrel cactus
    const bw=s*0.4, bh=s*0.52, cy=y-bh;
    ctx.fillStyle=DARK; ctx.beginPath(); ctx.ellipse(x,cy,bw+1.5,bh+1.5,0,0,7); ctx.fill();
    ctx.fillStyle=BODY; ctx.beginPath(); ctx.ellipse(x,cy,bw,bh,0,0,7); ctx.fill();
    ctx.strokeStyle="rgba(20,52,18,.45)"; ctx.lineWidth=1; for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(x+k*bw*0.34,cy-bh*0.84); ctx.lineTo(x+k*bw*0.34,cy+bh*0.84); ctx.stroke(); }
    ctx.fillStyle=LIGHT; ctx.beginPath(); ctx.ellipse(x-bw*0.32,cy-bh*0.15,bw*0.28,bh*0.55,0,0,7); ctx.fill();
    for(let k=0;k<6;k++){ const a=k/6*6.283; ctx.fillStyle=FLOW[(h(4)*3)|0]; ctx.beginPath(); ctx.arc(x+Math.cos(a)*bw*0.55,cy-bh*0.85+Math.sin(a)*2.2,1.4,0,7); ctx.fill(); }
    ctx.lineJoin="miter"; ctx.lineCap="butt"; return;
  }
  // saguaro
  const bw=Math.max(4,s*0.3), paths=[[[x,y],[x,y-s]]];
  const nArms=(h(5)<0.3?0:(h(6)<0.62?1:2));
  for(let a=0;a<nArms;a++){ const side=(a===0?(h(7)<0.5?-1:1):(h(7)<0.5?1:-1));
    const ah=y-s*(0.42+h(8+a)*0.2), out=side*s*(0.28+h(10+a)*0.12), up=s*(0.32+h(12+a)*0.22);
    paths.push([[x,ah],[x+out,ah],[x+out,ah-up]]); }
  ctx.lineJoin="round"; ctx.lineCap="round";
  ctx.strokeStyle=DARK; ctx.lineWidth=bw+2.4;
  for(const pa of paths){ ctx.beginPath(); ctx.moveTo(pa[0][0],pa[0][1]); for(let k=1;k<pa.length;k++) ctx.lineTo(pa[k][0],pa[k][1]); ctx.stroke(); }
  ctx.strokeStyle=BODY; ctx.lineWidth=bw;
  for(const pa of paths){ ctx.beginPath(); ctx.moveTo(pa[0][0],pa[0][1]); for(let k=1;k<pa.length;k++) ctx.lineTo(pa[k][0],pa[k][1]); ctx.stroke(); }
  ctx.strokeStyle="rgba(120,190,95,.6)"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x-bw*0.22,y-2); ctx.lineTo(x-bw*0.22,y-s+2); ctx.stroke();
  ctx.fillStyle="rgba(232,236,205,.55)"; for(let k=0;k<5;k++){ const yy=y-3-k*(s/5); ctx.fillRect(x-bw*0.42,yy,1,1); ctx.fillRect(x+bw*0.42-1,yy,1,1); }
  if(h(9)<0.4){ ctx.fillStyle=FLOW[(h(11)*3)|0]; ctx.beginPath(); ctx.arc(x,y-s,2.1,0,7); ctx.fill(); ctx.fillStyle="#fff6d8"; ctx.beginPath(); ctx.arc(x,y-s,0.9,0,7); ctx.fill(); }
  for(let i=1;i<paths.length;i++){ if(h(20+i)<0.4){ const tip=paths[i][paths[i].length-1]; ctx.fillStyle=FLOW[(h(21+i)*3)|0]; ctx.beginPath(); ctx.arc(tip[0],tip[1],1.8,0,7); ctx.fill(); } }
  ctx.lineJoin="miter"; ctx.lineCap="butt";
}
function treeSortKey(p){
  const [vx,vy]=treeLean(p);
  return p.y + vy * 0.05 + p.x * 0.0001;
}
let _visTreesFrame=-1, _visTreesOx=0, _visTreesOy=0, _visTrees=[];
function getVisibleTrees(ox,oy){
  const fid=typeof drawFrameId!=="undefined"?drawFrameId:0;
  if(_visTreesFrame===fid&&_visTreesOx===ox&&_visTreesOy===oy) return _visTrees;
  const cl=cam.x-VW/2-96, cr=cam.x+VW/2+96, ct=cam.y-VH/2-96, cb=cam.y+VH/2+96;
  const i0=Math.floor((ox-NODE_VAR)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR)/GAP)+2;
  const trees=[];
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); if(!L.props.length) continue;
    for(const p of L.props){ if(p.t!=="tree"||!p.outline) continue; if(!treeVisible(p,cl,cr,ct,cb)) continue; trees.push(p); } }
  trees.sort((a,b)=>treeSortKey(a)-treeSortKey(b));
  _visTreesFrame=fid; _visTreesOx=ox; _visTreesOy=oy; _visTrees=trees;
  return trees;
}
function forEachVisibleTree(ox,oy,fn){
  const trees=getVisibleTrees(ox,oy);
  for(const p of trees) fn(p);
}
function updateTreeGhostAlpha(p){
  const want=treeOccludesActor(p) ? 0.34 : 1;
  if(p._tga===undefined) p._tga=1;
  p._tga+=(want-p._tga)*0.18;
  return p._tga;
}
function drawTreeGhosted(p, fn){
  const ga=p._tga!==undefined ? p._tga : 1;
  if(ga<0.999){ ctx.globalAlpha=ga; fn(p); ctx.globalAlpha=1; }
  else fn(p);
}
function drawCanopies(ox,oy){
  const lod=VW>1500;
  forEachVisibleTree(ox,oy, p=>drawTreeGhosted(p, tp=>drawTreeCanopy(tp.x,tp.y,tp,lod)));
}
// ALTTP-style forest canopy shade: dark pool on the ground under the elevated crown mass.
function drawTreeCanopyShade(t){
  if(!t.forest||t.kind==="bush") return;
  const R=t.crownR||t.s*0.35, [vx,vy]=treeLean(t);
  const u=0.80;
  const sx=t.x+vx*u, sy=t.y+vy*u*0.10+R*0.05;
  ctx.fillStyle="rgba(4,14,6,0.20)"; ctx.beginPath(); ctx.ellipse(sx,sy,R*1.32,R*0.66,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(6,20,8,0.34)"; ctx.beginPath(); ctx.ellipse(sx,sy,R*1.06,R*0.54,0,0,7); ctx.fill();
  ctx.fillStyle="rgba(8,26,10,0.48)"; ctx.beginPath(); ctx.ellipse(sx,sy,R*0.86,R*0.44,0,0,7); ctx.fill();
}
function drawCanopyShades(ox,oy){
  forEachVisibleTree(ox,oy, drawTreeCanopyShade);
}
const TREE_PAL={
  deciduous:{d:"#0c2810",m:"#287830",l:"#409848",h:"#60b050",hi:"#88d068",rim:"#061808"},
  oak:      {d:"#0a2010",m:"#245828",l:"#387038",h:"#509048",hi:"#70b058",rim:"#040c06"},
  pine:     {d:"#0a2410",m:"#205828",l:"#307038",h:"#489048",hi:"#68a858",rim:"#041008"},
  spruce:   {d:"#081810",m:"#183028",l:"#244838",h:"#306048",hi:"#487868",rim:"#040810"},
  birch:    {d:"#143820",m:"#306830",l:"#488840",h:"#68a858",hi:"#90c870",rim:"#081810"},
  maple:    {d:"#201810",m:"#385028",l:"#507038",h:"#789048",hi:"#b07838",rim:"#0c0806"},
  willow:   {d:"#182818",m:"#305830",l:"#487848",h:"#689858",hi:"#88b868",rim:"#0c1810"},
  bush:     {d:"#0c2810",m:"#287830",l:"#409848",h:"#58a850",hi:"#78c868",rim:"#061808"},
};
const TRUNK_PAL={
  deciduous:{m:"#6a5030",d:"#46331f",l:"#8a6848"},
  oak:      {m:"#5a4030",d:"#382616",l:"#7c6248"},
  pine:     {m:"#4a3424",d:"#332113",l:"#6a5038"},
  spruce:   {m:"#443028",d:"#2e2018",l:"#624838"},
  birch:    {m:"#e9e9d4",d:"#c9c3b6",l:"#f6f3ec"},
  maple:    {m:"#5a4030",d:"#382616",l:"#7a5840"},
  willow:   {m:"#5a4830",d:"#3a2818",l:"#786040"},
  bush:     {m:"#5a4030",d:"#382616",l:"#6a5038"},
};
const TREE_LEAN_DEPTH=0.80;
function treeDepthK(t){ return t.city?1.72:1.0; }
// Trees lean with the EXACT same camera-relative math as buildings (leanVec): a constant upward
// tilt (perceived height) plus a small, bounded horizontal parallax. This is what makes the
// canopy sit on top of the trunk and "behave like a block" as you drive past.
function treeLean(t){
  const H=t.H||t.s*0.6, offx=t.x-cam.x, dk=treeDepthK(t);
  const vyBase=-H*TREE_LEAN_DEPTH*dk;
  const par=Math.tanh(offx/900)*H*0.22*dk;
  let vx=par, vy=vyBase-H*0.06*Math.tanh((t.y-cam.y)/1100);
  const vl=Math.hypot(vx,vy), vm=H*1.95; if(vl>vm){ vx*=vm/vl; vy*=vm/vl; }
  return [vx,vy];
}
// Screen AABB including the leaning canopy — culling on base (x,y) alone makes crowns vanish
// while the trunk footprint is still near the viewport edge (canopy sits ~H px above base).
// Wind sway (Witcher 3–style): slow primary oscillation + faster harmonic; amplitude ∝ height².
function treeWindAt(t,u){
  const H=t.H||t.s*0.6, ph=((t.x*0.019+t.y*0.013)%6.283), ph2=ph*1.618+t.s*0.011;
  const h=u*u, kind=t.kind||"deciduous";
  const k=kind==="pine"||kind==="spruce"?0.86:kind==="bush"?0.68:kind==="birch"?1.08:kind==="willow"?0.96:kind==="maple"?1.02:1.0;
  const local=typeof windFieldAt==="function"?windFieldAt(t.x,t.y):null;
  const amp=H*(local?local.power*1.35:(typeof windAmp!=="undefined"?windAmp:0.12))*h*k*0.55;
  const wt=typeof windT!=="undefined"?windT:0;
  const wa=local?local.angle:wt*0.72+ph*0.1;
  const wx=Math.cos(wa+Math.sin(wt*1.42+ph)*0.35)*amp+Math.sin(wt*2.38+ph2)*amp*0.22;
  const wy=Math.sin(wa+Math.sin(wt*1.05+ph)*0.2)*amp*0.35+Math.sin(wt*1.05+ph*0.65)*amp*0.06;
  return [wx,wy];
}
function treeScreenBox(t){
  const [vx,vy]=treeLean(t), [ww,wh]=treeWindAt(t,1), R=t.crownR||t.s*0.35;
  if(t.conifer){
    const hw=R*0.82+Math.abs(vx+ww)*0.45, topY=t.y+vy*1.06+wh-R*0.12;
    return {minX:t.x-hw, maxX:t.x+hw, minY:topY, maxY:t.y+28};
  }
  const cx=t.x+vx+ww, cy=t.y+vy+wh, r=R*1.12;
  return {minX:Math.min(t.x,t.x+vx+ww)-r-10, maxX:Math.max(t.x,t.x+vx+ww)+r+10, minY:cy-r-58, maxY:t.y+36};
}
function treeVisible(p,cl,cr,ct,cb){ const b=treeScreenBox(p); return b.maxX>=cl&&b.minX<=cr&&b.maxY>=ct&&b.minY<=cb; }
// ── PNG tree sprites (Pillow-generated, assets/trees/*.png) ──────────────
const TREE_ASSET_V=2;
const TREE_SPRITE={ready:false,meta:null,img:{}};
window.TREE_SPRITE=TREE_SPRITE;
(function loadTreeSprites(){
  fetch("assets/trees/meta.json?v="+TREE_ASSET_V).then(r=>r.json()).then(meta=>{
    TREE_SPRITE.meta=meta;
    const kinds=Object.keys(meta.kinds); let left=kinds.length||0;
    if(!left){ TREE_SPRITE.ready=true; return; }
    for(const k of kinds){
      const im=new Image();
      im.onload=im.onerror=()=>{ if(--left<=0) TREE_SPRITE.ready=true; };
      im.src="assets/trees/"+meta.kinds[k].file+"?v="+TREE_ASSET_V;
      TREE_SPRITE.img[k]=im;
    }
  }).catch(()=>{});
})();
function treeKindMeta(kind){
  const g=TREE_SPRITE.meta||{};
  const k=g.kinds&&g.kinds[kind];
  const bw=g.width||96, bh=g.height||128, bs=g.splitY??86;
  if(k&&k.width&&k.height) return {
    width:k.width, height:k.height,
    splitY:k.splitY??Math.round(k.height*bs/bh),
    anchorX:k.anchorX??Math.round(k.width/2),
    anchorY:k.anchorY??k.height-1,
    hd:!!k.hd,
  };
  return {width:bw,height:bh,splitY:bs,anchorX:g.anchorX??48,anchorY:g.anchorY??127,hd:false};
}
function treeSpriteScale(t){
  const m=treeKindMeta(t.kind||"deciduous");
  const H=t.H||t.s*0.6;
  let sc=(H*TREE_LEAN_DEPTH*treeDepthK(t))/(m.height||128);
  if(t.kind==="bush") sc*=1.18;
  sc=Math.round(sc*4)/4;
  return Math.max(0.35, sc);
}
const TREE_SPRITE_PAD=4;                                       // bleed so split strips / wind never clip PNG
const TREE_SOFT=1.10;                                          // slight upscale + smoothing = softer pixels
const TREE_SOFT_HD=1.02;                                       // hi-res PNG needs less upscale blur
function drawLeaningTreeStrip(p,sy0,sy1){
  const m=treeKindMeta(p.kind||"deciduous"), img=TREE_SPRITE.img[p.kind]||TREE_SPRITE.img.deciduous;
  if(!img||!img.complete||!img.naturalWidth) return false;
  const sc=treeSpriteScale(p), [vx,vy]=treeLean(p);
  const pad=Math.max(TREE_SPRITE_PAD, Math.round(m.height/128));
  const sy0p=Math.max(0, sy0-pad), sy1p=Math.min(m.height, sy1+pad);
  const sh=sy1p-sy0p, shDraw=sy1-sy0;
  const soft=m.hd?TREE_SOFT_HD:TREE_SOFT;
  const W=m.width*sc*soft, hw=W*0.5;
  const ub=(m.height-sy1)/m.height, ut=(m.height-sy0)/m.height;
  const [wxt,wyt]=treeWindAt(p,ut), [wxb,wyb]=treeWindAt(p,ub);
  const tlx=p.x-hw+vx*ut+wxt, tly=p.y+vy*ut+wyt, trx=p.x+hw+vx*ut+wxt;
  const blx=p.x-hw+vx*ub+wxb, bly=p.y+vy*ub+wyb, brx=p.x+hw+vx*ub+wxb;
  const bry=bly;
  ctx.save();
  const sm=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  // full quad (uses br corner) — avoids wind-shear clipping on the wide side
  ctx.transform((trx-tlx)/m.width,(tly-tly)/m.width,(blx-tlx)/shDraw,(bly-tly)/shDraw,tlx,tly);
  ctx.drawImage(img,0,sy0p,m.width,sh,0,0,m.width,shDraw);
  ctx.imageSmoothingEnabled=sm;
  ctx.restore();
  return true;
}
function drawTreeTrunkSprite(p){
  if(p.city) return false;
  const tr=p.trunk||{tw:p.s*0.1,frac:0.5};
  if(tr.frac<0.18) return true;
  const hw=tr.tw*0.72, bx=p.x, by=p.y;
  ctx.fillStyle="rgba(0,0,0,.24)"; ctx.beginPath(); ctx.ellipse(bx+2,by+3,Math.max(hw*1.8,(p.crownR||hw)*0.34),Math.max(hw*0.62,(p.crownR||hw)*0.12),0,0,7); ctx.fill();
  const m=treeKindMeta(p.kind||"deciduous");
  return drawLeaningTreeStrip(p, Math.max(0, m.splitY-Math.max(2, Math.round(m.height/64))), m.height);
}
function drawTreeCanopySprite(p){
  if(p.city) return false;
  const m=treeKindMeta(p.kind||"deciduous"), split=Math.min(m.height-1, m.splitY+Math.max(14, Math.round(m.height/36)));
  return drawLeaningTreeStrip(p, 0, split);
}
// Deterministic per-tree RNG (stable across frames) so leaf/bark detail never shimmers.
function treeRand(t){
  let s=((t.x*73856093)^(t.y*19349663))>>>0;
  return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
}
// Chrono Trigger sphere-clump: shadow blob (SE offset) → mid fill → NW highlight cap.
function drawCTLobe(map,R,pal,ox,oy,lr,round){
  const q=map(ox,oy,1,0,0), rr=lr*R;
  const lit=-ox*0.68-oy*0.52;
  const sy=round?0.88:0.62, my=round?0.92:0.70, hy=round?0.36:0.24;
  ctx.fillStyle=pal.m;
  ctx.beginPath(); ctx.ellipse(q[0]+rr*0.08,q[1]+rr*0.10,rr*0.92,rr*sy,0,0,7); ctx.fill();
  ctx.fillStyle=lit>0.10?pal.l:pal.m;
  ctx.beginPath(); ctx.ellipse(q[0],q[1],rr,rr*my,0,0,7); ctx.fill();
  ctx.fillStyle=lit>0.05?pal.h:pal.l;
  ctx.beginPath(); ctx.ellipse(q[0]-rr*0.24,q[1]-rr*0.22,rr*0.34,rr*hy,0,0,7); ctx.fill();
}
// Chrono Trigger foliage: a dense stipple of small flat-toned leaf specks across the crown. Tone is
// picked by NW light + a per-speck roll, so lit areas read bright and shaded areas dark WITHOUT the
// "shiny bubble" look of capped spheres. Many overlapping specks = a leafy thicket, not balloons.
function drawFoliageStipple(map,R,pal,t){
  const rnd=treeRand(t);
  const dk=mixHex(pal.m,pal.d,0.55);                                 // dark green (shaded leaves, not black holes)
  const n=Math.max(60,Math.min(200,Math.round(R*4.0)));
  for(let i=0;i<n;i++){
    const a=rnd()*6.283, rr=Math.sqrt(rnd())*0.94;
    const ox=Math.cos(a)*rr, oy=Math.sin(a)*rr*0.82-0.05;
    const q=map(ox,oy,1,0,0);
    const lit=-ox*0.50-oy*0.70+(rnd()-0.5)*0.26;                     // NW light + jitter
    const roll=rnd();
    let tone;
    if(lit>0.34)      tone = roll<0.45?pal.hi : roll<0.80?pal.h : pal.l;
    else if(lit>0.10) tone = roll<0.40?pal.h  : roll<0.80?pal.l : pal.m;
    else if(lit>-0.18)tone = roll<0.42?pal.l  : roll<0.82?pal.m : dk;
    else              tone = roll<0.60?pal.m  : (roll<0.92?dk : pal.d);
    const bl=R*(0.035+rnd()*0.038);                                  // fine specks → texture, not blobs
    ctx.fillStyle=tone;
    ctx.beginPath(); ctx.ellipse(q[0],q[1],bl,bl*0.84,0,0,7); ctx.fill();
  }
  // sparse sun-glint specks on the lit shoulder (tiny, not domes)
  const g=Math.max(4,(R*0.4)|0);
  for(let i=0;i<g;i++){
    const a=(-0.4-rnd()*1.5), rr=0.30+rnd()*0.55;
    const ox=Math.cos(a)*rr, oy=Math.sin(a)*rr*0.82-0.10, q=map(ox,oy,1,0,0);
    ctx.fillStyle=pal.hi; const bl=R*(0.03+rnd()*0.03);
    ctx.beginPath(); ctx.ellipse(q[0],q[1],bl,bl*0.8,0,0,7); ctx.fill();
  }
}
// Mix two #rrggbb colours (t=0 → a, t=1 → b) for extra bark tones between the 3 palette steps.
function mixHex(a,b,t){
  const ar=parseInt(a.slice(1,3),16),ag=parseInt(a.slice(3,5),16),ab=parseInt(a.slice(5,7),16);
  const br=parseInt(b.slice(1,3),16),bg=parseInt(b.slice(3,5),16),bb=parseInt(b.slice(5,7),16);
  const h=v=>('0'+Math.max(0,Math.min(255,v|0)).toString(16)).slice(-2);
  return "#"+h(ar+(br-ar)*t)+h(ag+(bg-ag)*t)+h(ab+(bb-ab)*t);
}
// Bark texture: vertical ridges & grooves running the full (leaning) trunk axis, alternating
// light ridges / dark grooves, plus a knot — so the pole reads as carved wood, not a flat strip.
function drawBark(bx,by,tx,ty,hw,thw,tp,rnd){
  const groove=mixHex(tp.d,"#000000",0.25), ridge=mixHex(tp.l,"#ffffff",0.12);
  const lines=Math.max(4,Math.round(hw*1.4));
  for(let k=0;k<lines;k++){
    const f=(k+0.5)/lines*2-1;                                       // -1..1 across the width
    const wob=(rnd()-0.5)*0.10;                                      // slight sideways wobble
    const x0=bx+f*hw*0.92, x1=tx+(f+wob)*thw*0.92;
    const lit=f*0.5+0.15;                                            // right side lighter
    ctx.strokeStyle = (k%2===0)?groove : (lit>0?ridge:tp.m);
    ctx.lineWidth=hw*(k%2===0?0.30:0.24); ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(x0,by-1); ctx.lineTo(x1,ty); ctx.stroke();
  }
  ctx.lineCap="butt";
  if(rnd()<0.55){                                                    // a knot / scar on the bark
    const u=0.35+rnd()*0.35, kx=bx+(tx-bx)*u+(rnd()-0.5)*hw*0.6, ky=by+(ty-by)*u, kr=hw*(0.34+rnd()*0.18);
    ctx.fillStyle=groove; ctx.beginPath(); ctx.ellipse(kx,ky,kr,kr*1.3,0,0,7); ctx.fill();
    ctx.fillStyle=ridge;  ctx.beginPath(); ctx.ellipse(kx-kr*0.2,ky-kr*0.2,kr*0.45,kr*0.6,0,0,7); ctx.fill();
  }
}
// Ground layer (drawn under the player): contact shadow + a chunky, textured trunk with a root
// flare at the base and carved bark — reads as solid wood instead of a flat 3-band strip.
function drawTreeTrunk(p){
  if(TREE_SPRITE.ready&&drawTreeTrunkSprite(p)) return;
  const tr=p.trunk||{tw:p.s*0.1,frac:0.5}, [vx,vy]=treeLean(p), [ww,wh]=treeWindAt(p,tr.frac);
  const hw=tr.tw*0.72, thw=hw*0.78, bx=p.x, by=p.y, tx=p.x+vx*tr.frac+ww, ty=p.y+vy*tr.frac+wh;  // chunkier visual trunk
  ctx.fillStyle="rgba(0,0,0,.24)"; ctx.beginPath(); ctx.ellipse(bx+2,by+3,Math.max(hw*1.8,(p.crownR||hw)*0.34),Math.max(hw*0.62,(p.crownR||hw)*0.12),0,0,7); ctx.fill();
  if(tr.frac<0.18) return;                                            // bush / conifer: no visible pole
  const tp=TRUNK_PAL[p.kind]||TRUNK_PAL.deciduous, rnd=treeRand(p);
  // root flare — buttress wedges spreading from the base, drawn under the trunk body
  const rw=hw*2.0, rh=hw*1.6;
  ctx.fillStyle=tp.d;
  fillPoly([[bx-rw,by+2],[bx-hw*0.55,by-rh*0.45],[bx-hw*0.15,by+1.5]]);
  fillPoly([[bx+rw,by+2],[bx+hw*0.55,by-rh*0.45],[bx+hw*0.15,by+1.5]]);
  fillPoly([[bx-hw*1.4,by+2],[bx,by-rh*0.55],[bx+hw*0.35,by+1.5]]);
  ctx.fillStyle=tp.m; fillPoly([[bx-rw,by+2],[bx-hw*0.7,by-1],[bx-hw*0.5,by+1]]);   // lit cap on left root
  // trunk body
  ctx.fillStyle=tp.m; fillPoly([[bx-hw,by],[bx+hw,by],[tx+thw,ty],[tx-thw,ty]]);
  if(p.kind==="birch"){
    ctx.fillStyle=tp.d; fillPoly([[bx-hw,by],[tx-thw,ty],[tx-thw+tr.tw*0.3,ty],[bx-hw+tr.tw*0.32,by]]);
    ctx.fillStyle="#34302a"; for(let k=0;k<6;k++){ const u=0.10+k*0.15, mx=bx+(tx-bx)*u, w=hw*(0.4+rnd()*0.5);
      ctx.fillRect(mx-w*0.5,by+(ty-by)*u,w,1.6); }
  } else {
    // cylinder shading (dark left, light right) then carved bark over it
    ctx.fillStyle=tp.d; fillPoly([[bx-hw,by],[tx-thw,ty],[tx-thw+tr.tw*0.34,ty],[bx-hw+tr.tw*0.36,by]]);
    ctx.fillStyle=tp.l; fillPoly([[bx+hw,by],[tx+thw,ty],[tx+thw-tr.tw*0.30,ty],[bx+hw-tr.tw*0.32,by]]);
    drawBark(bx,by,tx,ty,hw,thw,tp,rnd);
  }
}
// Crown: Chrono Trigger cel-shading — overlapping sphere-clumps + hard-edged silhouette bands.
function drawTreeCanopy(cx,cy,t,lod){
  if(!t||!t.outline) return;
  if(TREE_SPRITE.ready&&drawTreeCanopySprite(t)) return;
  const pal=TREE_PAL[t.kind]||TREE_PAL.deciduous, out=t.outline, R=t.crownR;
  const [vx,vy]=treeLean(t);
  let map;
  if(t.conifer){
    // Layered fir: overlapping drooping boughs, each with a sawtooth (needle) bottom edge. Drawn
    // bottom-up; a dark serrated pass shows as a prickly needle fringe beneath each lit bough.
    const top=-1.30, bottom=0.92, span=bottom-top, halfB=0.66, tiers=5;
    map=(ox,oy)=>{ const hf=(0.92-oy)/span, [ww,wh]=treeWindAt(t,hf); return [t.x+ox*R+vx*hf+ww, t.y+vy*hf+wh]; };
    const T=[];
    for(let ti=0;ti<tiers;ti++){ const uT=(ti/tiers)*0.92, uB=((ti+1)/tiers)*0.92+0.08, hwB=halfB*(0.18+0.90*((ti+1)/tiers)); T.push({uT,uB,hwB}); }
    const bough=(uT,uB,hwB,dip)=>{
      const yT=top+span*uT, yB=top+span*uB;
      const teeth=Math.max(5,Math.min(18,Math.round(hwB*R*0.55)));
      ctx.beginPath();
      let q=map(0,yT); ctx.moveTo(q[0],q[1]);
      q=map(hwB,yB); ctx.lineTo(q[0],q[1]);
      for(let k=teeth;k>=0;k--){ const x=((k/teeth)*2-1)*hwB, dn=(k%2===0)?dip:0; q=map(x,yB+dn); ctx.lineTo(q[0],q[1]); }
      ctx.closePath();
    };
    ctx.fillStyle=pal.d;                                              // dark serrated silhouette = needle tips
    for(let ti=tiers-1;ti>=0;ti--){ const b=T[ti]; bough(b.uT,b.uB,b.hwB,span*0.05); ctx.fill(); }
    for(let ti=tiers-1;ti>=0;ti--){ const b=T[ti];                    // mid body, flat bottom → dark needle fringe peeks below
      ctx.fillStyle=ti<=1?pal.l:pal.m; bough(b.uT,b.uB-0.05,b.hwB*0.84,0); ctx.fill(); }
    for(let ti=tiers-1;ti>=0;ti--){ const b=T[ti];                    // sunlit upper cap of each bough (top-lit cel band)
      const uMid=b.uT+(b.uB-b.uT)*0.55;
      ctx.fillStyle=ti<=1?pal.hi:pal.h; bough(b.uT,uMid,b.hwB*0.58,0); ctx.fill(); }
    return;
  }
  const [ww,wh]=treeWindAt(t,1), ax=t.x+vx+ww, ay=t.y+vy+wh;
  map=(ox,oy,sx,ddx,ddy)=>[ax+ox*R*sx+(ddx||0), ay+oy*R*sx+(ddy||0)];
  const path=(sx,ddx,ddy)=>{ ctx.beginPath();
    for(let k=0;k<out.length;k++){ const p=out[k], q=map(p[0],p[1],sx,ddx,ddy); k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]); }
    ctx.closePath(); };
  ctx.fillStyle=pal.d; path(1.05,R*0.02,R*0.10); ctx.fill();          // shaded underside (expanded, sits behind = soft edge, no hard outline)
  ctx.fillStyle=pal.m; path(1.0,0,0); ctx.fill();                     // mid body
  if(t.lobes){ const lb=t.lobes.slice().sort((a,b)=>b.oy-a.oy); const round=t.kind==="bush"; for(const L of lb) drawCTLobe(map,R,pal,L.ox,L.oy,L.lr,round); }
  if(!lod) drawFoliageStipple(map,R,pal,t);
  if(t.city&&!lod) drawCityTreeFinish(t,ax,ay,R,pal);
}
function drawCityTreeFinish(t,ax,ay,R,pal){
  const N=typeof nightFactor!=="undefined"?nightFactor(gameHour):0.3;
  ctx.fillStyle="rgba(0,0,0,.20)";
  ctx.beginPath(); ctx.ellipse(t.x+4,t.y+6,R*0.52,R*0.20,0,0,7); ctx.fill();
  const warmA=(0.20*(1-N)).toFixed(3);
  ctx.strokeStyle=`rgba(255,${220-(N*70|0)},${150-(N*50|0)},${warmA})`;
  ctx.lineWidth=2.4;
  ctx.beginPath(); ctx.ellipse(ax,ay-R*0.10,R*0.94,R*0.72,0,0,7); ctx.stroke();
  ctx.fillStyle=`rgba(255,255,240,${(0.06*(1-N)).toFixed(3)})`;
  ctx.beginPath(); ctx.ellipse(ax-R*0.22,ay-R*0.28,R*0.22,R*0.14,0,0,7); ctx.fill();
}
function drawProps(L){
  const cl=cam.x-VW/2-34, cr=cam.x+VW/2+34, ct=cam.y-VH/2-34, cb=cam.y+VH/2+34, lod=VW>1500;
  for(const p of L.props){
    if(p.x<cl||p.x>cr||p.y<ct||p.y>cb) continue;                 // off-screen prop: skip
    if(p.t==="cactus"){ drawCactus(p);
    } else if(p.t==="palm"){
      ctx.fillStyle="#8a6a3a"; ctx.fillRect(p.x-2,p.y-p.s,4,p.s);
      ctx.fillStyle="#2f8a5a"; for(let a=0;a<6;a++){ const ang=a/6*6.283; ctx.save(); ctx.translate(p.x,p.y-p.s); ctx.rotate(ang); ctx.fillRect(0,-2,p.s*0.95,4); ctx.restore(); }
    } else if(p.t==="rock"){
      drawForestRock(p.x,p.y,p.s,p.v,p.moss);
    } else if(p.t==="reed"){ drawReed(p);
    } else if(p.t==="tree"){ /* trunks drawn in drawTrunks() pass, over buildings */ }
    else {
      ctx.fillStyle="#39612f"; ctx.beginPath(); ctx.arc(p.x,p.y-p.s*0.2,p.s,0,7); ctx.fill();
    }
  }
}
// Tree trunks get their own pass (drawn after buildings) so curb/garden trees in BUILT city lots
// — whose ground pass never calls drawProps — still render their pole, and trunks never hide
// behind a neighbouring building. Canopies are drawn later still, over actors.
function drawTrunks(ox,oy){
  forEachVisibleTree(ox,oy, p=>{
    updateTreeGhostAlpha(p);
    drawTreeGhosted(p, drawTreeTrunk);
  });
}
function drawPlazas(ox,oy){
  const i0=Math.floor((ox-NODE_VAR)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR)/GAP)+1;
  const j0=Math.floor((oy-NODE_VAR)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR)/GAP)+1;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ if(!isPlaza(i,j)) continue;
    const cx=nX(i,j), cy=nY(i,j), R=plazaR(i,j);
    ctx.fillStyle="#b8b2a4"; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fill();
    ctx.fillStyle="#aca695"; ctx.beginPath(); ctx.arc(cx,cy,R*0.72,0,7); ctx.fill();
    ctx.strokeStyle="rgba(120,114,100,.7)"; ctx.lineWidth=1.5;
    for(let k=1;k<=2;k++){ ctx.beginPath(); ctx.arc(cx,cy,R*0.72*k/2.2,0,7); ctx.stroke(); }
    ctx.fillStyle="#928c80"; ctx.beginPath(); ctx.arc(cx,cy,16,0,7); ctx.fill();
    ctx.fillStyle="#3f6f8f"; ctx.beginPath(); ctx.arc(cx,cy,12,0,7); ctx.fill();
    ctx.fillStyle="#cfe0ea"; ctx.beginPath(); ctx.arc(cx,cy,4,0,7); ctx.fill();
  }
}
function drawGraves(L){
  for(const g of L.graves){
    ctx.fillStyle="rgba(0,0,0,.16)"; ctx.fillRect(g.x-4, g.y-1, 8, 2.4);                 // ground shadow
    if(g.type==="cross"){
      ctx.fillStyle="#9a958c"; ctx.fillRect(g.x-1.3, g.y-15, 2.6, 15); ctx.fillRect(g.x-5, g.y-11, 10, 2.6);
      ctx.fillStyle="rgba(255,255,255,.18)"; ctx.fillRect(g.x-1.3, g.y-15, 1.1, 15);
    } else if(g.type==="obelisk"){
      ctx.fillStyle="#8f8a80"; ctx.beginPath(); ctx.moveTo(g.x-3,g.y); ctx.lineTo(g.x-2.1,g.y-16); ctx.lineTo(g.x,g.y-21); ctx.lineTo(g.x+2.1,g.y-16); ctx.lineTo(g.x+3,g.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.16)"; ctx.fillRect(g.x-2.3, g.y-16, 1, 16);
    } else {
      ctx.fillStyle="#a7a299"; ctx.beginPath(); ctx.moveTo(g.x-5,g.y); ctx.lineTo(g.x-5,g.y-8); ctx.arc(g.x,g.y-8,5,Math.PI,0,false); ctx.lineTo(g.x+5,g.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle="rgba(0,0,0,.22)"; ctx.fillRect(g.x-2.6, g.y-9, 5.2, 1);
      ctx.fillStyle="rgba(255,255,255,.2)"; ctx.fillRect(g.x-5, g.y-8, 1.2, 8);
    }
  }
  if(L.cemGate){ const G=L.cemGate; ctx.fillStyle="#6c675d"; ctx.fillRect(G.x-G.w-2, G.y-8, 4, 10); ctx.fillRect(G.x+G.w-2, G.y-8, 4, 10); }
}
function drawFences(L){
  if(!L.fences||!L.fences.length) return;
  for(const f of L.fences){
    const dx=f.x2-f.x1, dy=f.y2-f.y1, len=Math.hypot(dx,dy)||1, ux=dx/len, uy=dy/len;
    ctx.strokeStyle="#8c8268"; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(f.x1,f.y1-3); ctx.lineTo(f.x2,f.y2-3); ctx.stroke();
    ctx.fillStyle="#a59a7e";
    for(let d=0; d<=len; d+=6){ ctx.fillRect(f.x1+ux*d-0.7, f.y1+uy*d-6, 1.5, 6); }
  }
}
function drawSignalHead(hx,hy,st,fallen){
  ctx.fillStyle=fallen?"#0e0f12":"#15171b"; ctx.fillRect(hx-2.4,hy-7,4.8,11);
  ctx.strokeStyle="#0c0d10"; ctx.lineWidth=0.6; ctx.strokeRect(hx-2.4,hy-7,4.8,11);
  const lit=["#3a0f0c","#3a3210","#0f2a14"];
  if(!fallen){ if(st==="red")lit[0]="#ff4438"; else if(st==="yellow")lit[1]="#ffd23a"; else lit[2]="#3ad24a"; }
  for(let k=0;k<3;k++){ ctx.fillStyle=lit[k]; ctx.beginPath(); ctx.arc(hx,hy-4.4+k*3.2,1.35,0,7); ctx.fill(); }
}
function drawSignals(ox,oy){
  const i0=Math.floor((ox-NODE_VAR)/GAP)-1, i1=Math.floor((ox+VW+NODE_VAR)/GAP)+1;
  const j0=Math.floor((oy-NODE_VAR)/GAP)-1, j1=Math.floor((oy+VH+NODE_VAR)/GAP)+1, PL=22;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); if(!L.signals) continue;
    for(const s of L.signals){ if(s.x<ox-30||s.x>ox+VW+30||s.y<oy-PL-30||s.y>oy+VH+30) continue;
      const st=signalState(L.si,L.sj,s.axis);
      ctx.fillStyle="rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(s.x,s.y,3,1.6,0,0,7); ctx.fill();
      if(s.fall){ const ang=s.fall.ang, ux=Math.sin(ang)*s.fdx, uy=-Math.cos(ang)+Math.sin(ang)*s.fdy, tx=s.x+ux*PL, ty=s.y+uy*PL;
        ctx.strokeStyle="rgba(34,36,40,.95)"; ctx.lineWidth=2.2; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(tx,ty); ctx.stroke(); ctx.lineCap="butt";
        drawSignalHead(tx,ty,st,true); continue; }
      ctx.strokeStyle="rgba(22,24,28,.95)"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.x,s.y-PL); ctx.stroke();
      drawSignalHead(s.x,s.y-PL,st,false);
    }
  }
}
function drawCrosswalks(ox,oy){
  const CW=12;
  ctx.fillStyle="rgba(228,230,233,.48)";
  const i0=Math.floor((ox-NODE_VAR)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR)/GAP)+2;
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    if(biomeOf(i,j)!=="city"||isRoundabout(i,j)) continue;
    const mw=nodeMaxWidth(i,j); if(mw<40) continue;
    const cx=nX(i,j), cy=nY(i,j), half=mw*0.52;
    for(const[di,dj]of[[1,0],[0,1]]){
      const e=getEdge(i,j,di,dj); if(!e.exists||!e.markings) continue;
      const ang=Math.atan2(nY(i+di,j+dj)-cy, nX(i+di,j+dj)-cx);
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang);
      const hw=e.width*0.5;
      for(let x=half; x<half+CW+1; x+=9){ ctx.fillRect(x,-hw,5,hw*2); }
      ctx.restore();
    }
  }
}

