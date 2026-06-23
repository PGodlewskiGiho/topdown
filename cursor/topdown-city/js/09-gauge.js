/* TOPDOWN CITY — 09-gauge.js */
/* ---------- speedometer (SVG gauge) ---------- */
const gauge = document.getElementById("gauge");
function rebuildGauge(){
  const topSpd = car.topSpeed||200;
  const accent = car.accent||"#ff5b46";
  const brand   = car.brand||"";
  const carName = car.carName||"";
  const cx=74,cy=74, parts=[];
  // outer ring
  parts.push(`<circle cx="74" cy="74" r="70" fill="rgba(16,18,22,.82)"/>`);
  parts.push(`<circle cx="74" cy="74" r="70" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="2"/>`);
  // redline arc: last 20% of range (270deg total, start 135deg)
  const redStart = 135 + 0.80*270, redEnd = 135+270;
  const toRad=d=>d*Math.PI/180;
  const arcPt=(deg,r)=>[cx+Math.cos(toRad(deg))*r, cy+Math.sin(toRad(deg))*r];
  const [rx1,ry1]=arcPt(redStart,62); const [rx2,ry2]=arcPt(redEnd,62);
  const [rx3,ry3]=arcPt(redEnd,56); const [rx4,ry4]=arcPt(redStart,56);
  parts.push(`<path d="M${rx1.toFixed(1)},${ry1.toFixed(1)} A62,62,0,0,1,${rx2.toFixed(1)},${ry2.toFixed(1)} L${rx3.toFixed(1)},${ry3.toFixed(1)} A56,56,0,0,0,${rx4.toFixed(1)},${ry4.toFixed(1)} Z" fill="${accent}" opacity="0.22"/>`);
  // tick marks: 11 major, 2 minor between each
  const majorTicks=11, totalMinor=(majorTicks-1)*2+majorTicks;
  for(let k=0;k<=totalMinor;k++){
    const isMajor=(k%3===0);
    const ang=(135 + k*(270/totalMinor))*Math.PI/180;
    const r1=58, r2=isMajor?44:52;
    const majorIdx=Math.floor(k/3);
    const inRed = k/totalMinor > 0.80;
    const col = inRed ? accent : (isMajor?"#c8ced8":"#5a606a");
    const x1=cx+Math.cos(ang)*r1, y1=cy+Math.sin(ang)*r1, x2=cx+Math.cos(ang)*r2, y2=cy+Math.sin(ang)*r2;
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="${isMajor?2.8:1.3}"/>`);
    // speed labels on every other major tick
    if(isMajor && majorIdx%2===0){
      const labelSpd=Math.round((majorIdx/10)*topSpd/10)*10;
      const lr=36, lx=cx+Math.cos(ang)*lr, ly=cy+Math.sin(ang)*lr;
      parts.push(`<text x="${lx.toFixed(1)}" y="${(ly+3).toFixed(1)}" text-anchor="middle" fill="${inRed?accent:'#7f8794'}" font-family="DM Mono,monospace" font-size="7.5">${labelSpd}</text>`);
    }
  }
  // needle
  parts.push(`<line id="needle" x1="74" y1="74" x2="74" y2="22" stroke="${accent}" stroke-width="3.4" stroke-linecap="round"/>`);
  parts.push(`<circle cx="74" cy="74" r="5" fill="#1c1f26" stroke="${accent}" stroke-width="2.2"/>`);
  // brand + name in gauge
  if(brand){
    parts.push(`<text x="74" y="56" text-anchor="middle" fill="${accent}" font-family="DM Mono,monospace" font-size="9" letter-spacing="1" font-weight="700">${brand.toUpperCase()}</text>`);
  }
  // digital speed readout
  parts.push(`<text id="spd" x="74" y="102" text-anchor="middle" fill="#e9ecf1" font-family="DM Mono,monospace" font-size="22" font-weight="600">0</text>`);
  parts.push(`<text x="74" y="116" text-anchor="middle" fill="#7f8794" font-family="DM Mono,monospace" font-size="8" letter-spacing="2">KM/H</text>`);
  // top speed label bottom
  parts.push(`<text x="74" y="132" text-anchor="middle" fill="${accent}" font-family="DM Mono,monospace" font-size="7" opacity="0.7">MAX ${topSpd}</text>`);
  gauge.innerHTML = parts.join("");
  // store current topSpeed for needle calc
  gauge._topSpeed = topSpd;
}
rebuildGauge();
const needle = ()=>document.getElementById("needle");
const spdTxt = ()=>document.getElementById("spd");
const ro = document.getElementById("ro");
let lastHudNeedleX2="", lastHudNeedleY2="", lastHudSpeed=-1, lastHudLabel="";

function updateHUD(){
  let kmh, label;
  if(mode==="car"){
    kmh = Math.round(Math.hypot(car.vx,car.vy)*KMH);
    const fwd = car.vx*Math.cos(car.a)+car.vy*Math.sin(car.a);
    const brandStr = car.brand ? car.brand+" " : "";
    const nameStr  = car.carName||"AUTO";
    label = `${brandStr}${nameStr} · GEAR ${fwd<-6?"R":"D"} · ${kmh} KM/H`;
  } else {
    kmh = 0;
    const R=car.L*0.7;
    let near=Math.hypot(ped.x-car.x,ped.y-car.y)<R, jack=false;
    if(!near) for(const c of traffic){ if(c.state==="drive" && Math.hypot(ped.x-c.x,ped.y-c.y)<R){ near=true; jack=true; break; } }
    label = `PIESZO${near?(jack?" · [F] PORWIJ":" · [F] WSIĄDŹ"):""}`;
  }
  const topSpd = gauge._topSpeed||200;
  const rad = (135 + Math.min(topSpd,kmh)/topSpd*270)*Math.PI/180, r=52, n=needle();
  const x2=(74+Math.cos(rad)*r).toFixed(1), y2=(74+Math.sin(rad)*r).toFixed(1);
  if(x2!==lastHudNeedleX2){ n.setAttribute("x2",x2); lastHudNeedleX2=x2; }
  if(y2!==lastHudNeedleY2){ n.setAttribute("y2",y2); lastHudNeedleY2=y2; }
  if(kmh!==lastHudSpeed){ spdTxt().textContent = kmh; lastHudSpeed=kmh; }
  if(label!==lastHudLabel){ ro.textContent = label; lastHudLabel=label; }
}

