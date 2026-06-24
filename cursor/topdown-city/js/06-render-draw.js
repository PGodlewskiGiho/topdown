/* TOPDOWN CITY — 06-render-draw.js */
/* ---------- rendering ---------- */
let drawFrameId=0;
const css = getComputedStyle(document.documentElement);
const COL = n => css.getPropertyValue(n).trim();
function draw(){
  drawFrameId++;
  if(typeof perfFrameStart==="function") perfFrameStart();
  if(mode==="inside"){
    if(typeof canalInterior!=="undefined"&&canalInterior&&typeof drawCanalInterior==="function"){ drawCanalInterior(); if(typeof perfFrameEnd==="function") perfFrameEnd(); return; }
    if(!interior){ mode="foot"; }
    else { drawInterior(); if(typeof perfFrameEnd==="function") perfFrameEnd(); return; }
  }
  ctx.setTransform(ZOOM/PX,0,0,ZOOM/PX,0,0);
  const ox = cam.x - VW/2, oy = cam.y - VH/2;
  const roll=cam.roll||0, shake=cam.shake||0;
  ctx.save();
  if(mode==="car"&&(roll||shake>0.001)){
    const cx=car.x-ox, cy=car.y-oy;
    const sx=(Math.random()-0.5)*shake*VW*0.28, sy=(Math.random()-0.5)*shake*VH*0.28;
    ctx.translate(cx+sx, cy+sy);
    ctx.rotate(roll);
    ctx.translate(-cx, -cy);
  }
  ctx.translate(-ox,-oy);

  // base ground fill (biome ground per lot, over which roads are layered)
  if(typeof perfBegin==="function") perfBegin("ground");
  const i0=Math.floor((ox-NODE_VAR*2)/GAP)-2, i1=Math.floor((ox+VW+NODE_VAR*2)/GAP)+2;
  const j0=Math.floor((oy-NODE_VAR*2)/GAP)-2, j1=Math.floor((oy+VH+NODE_VAR*2)/GAP)+2;
  // fill entire view with the most common ground first
  ctx.fillStyle=BIOMES.city.ground; ctx.fillRect(ox,oy,VW,VH);
  // lot grounds + props (fill the cell quad so ground meets the roads)
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const L=getLot(i,j);
    if(L.water){ fillCell(L,"#b8a06d"); texFill(L,"sand"); }
    else if(L.mountain){ fillCell(L, "#6e685f"); texFill(L,"dirt"); drawSandDetail(L); drawProps(L); }
    else if(L.parking){ fillCell(L, "#3a3d44"); texFill(L,"asphalt"); drawParkingLot(L); }
    else if(L.cemetery){ fillCell(L, "#47603e"); texFill(L,"grass"); drawGrassDetail(L); drawProps(L); drawGraves(L); drawFences(L); }
    else if(L.mega){ fillCell(L, "#6f7076"); texFill(L,"concrete"); }
    else if(L.farm){
      const fg=typeof farmGroundColor==="function"?farmGroundColor(L):"#a89048";
      fillCell(L, fg); texFill(L,"dirt");
    }
    else if(L.empty){
      if(L.salon||L.gunshop||L.motodealer){ fillCell(L, L.B.walk); texFill(L,"concrete"); if(L.motodealer) drawMotoDealerLot(L); }
      else { fillCell(L, L.B.ground); const sandy=(L.biome==="desert"||L.biome==="sea"); texFill(L, groundTexKey(L,sandy)); if(sandy){ drawSandDetail(L); if(L.biome==="desert") drawDesertFloor(L); } else { if(L.biome==="forest") drawForestFloor(L); drawGrassDetail(L); } drawProps(L); }
    }
    else if(L.zone==="suburb"){ fillCell(L, L.B.ground); texFill(L,"grass"); drawGrassDetail(L); drawProps(L); drawFences(L); }
    else { fillCell(L, L.B.walk); texFill(L,"concrete"); pavingLines(L); }
    if(L.oldtown){ fillCell(L, "#a89e8c"); }
  }
  if(typeof perfEnd==="function") perfEnd("ground");
  if(typeof perfBegin==="function") perfBegin("terrain");
  drawTerrainRelief(ox,oy);   // elevation shading over ground (before water)
  drawMountainRelief(ox,oy);
  if(typeof perfEnd==="function") perfEnd("terrain");
  if(typeof perfBegin==="function") perfBegin("water");
  drawWaterGlobal(ox,oy);   // lakes / sea (forest rivers drawn separately)
  drawForestRivers(ox,oy);
  if(typeof perfEnd==="function") perfEnd("water");
  if(typeof perfBegin==="function") perfBegin("roads");
  // organic bezier roads drawn on top of ground
  drawRoads(ox,oy);
  Game.drawAfterRoads(ox,oy);
  drawPlazas(ox,oy);
  drawCrosswalks(ox,oy);
  if(typeof perfEnd==="function") perfEnd("roads");

  // skid marks
  for(const m of skid){
    const alpha=(m.a0!=null?m.a0:0.5)*(m.life!=null?clamp(m.life,0,1):1);
    if(alpha<0.02) continue;
    const w=m.w||6, h=m.h||w*0.44;
    ctx.save(); ctx.translate(m.x,m.y); ctx.rotate(m.a);
    ctx.fillStyle=`rgba(14,12,10,${alpha.toFixed(3)})`;
    ctx.fillRect(-w*0.5,-h*0.5,w,h);
    if(alpha>0.25){
      ctx.fillStyle=`rgba(40,36,32,${(alpha*0.35).toFixed(3)})`;
      ctx.fillRect(-w*0.35,-h*0.35,w*0.7,h*0.7);
    }
    ctx.restore();
  }

  drawWet(ox,oy);          // wet asphalt + puddles (under traffic)
  drawShadows(ox,oy);      // directional sun shadows on the ground (day)
  drawCanopyShades(ox,oy); // ALTTP forest canopy pools (ambient, under elevated crowns)
  drawBlockGrounds(ox,oy); // courtyards, paths, gardens around bloks

  if(typeof perfBegin==="function") perfBegin("buildings");
  // buildings (second pass so shadows sit over neighbouring ground)
  // Culling must account for the upward "lean": a tall building whose base has already
  // scrolled off the bottom edge can still have its drawn roof/floors well inside the
  // view (the roof is shifted up by ~|vy| ≈ 0.92*H + parallax). So the SOUTH margin is
  // widened by the building's lean height; the other edges only need a small pad.
  { const vb=[];
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const L=getLot(i,j); for(const b of L.buildings){
      const lean=(b.H||40)*1.0 + 120;                       // generous upper bound on |vy|
      if(b.x>ox+VW+60||b.x+b.w<ox-60||b.y>oy+VH+lean||b.y+b.h<oy-60) continue; vb.push(b); } }
    const seenMega=new Set();
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++) eachMegaNearCell(i,j,m=>{
      if(seenMega.has(m.id)) return; seenMega.add(m.id);
      const b=m.building;
      const lean=(b.H||40)*1.0 + 160;                       // towers lean a long way up
      if(b.x>ox+VW+140||b.x+b.w<ox-140||b.y>oy+VH+lean||b.y+b.h<oy-140) return; vb.push(b);
    });
    vb.sort((p,q)=>(p.y+p.h)-(q.y+q.h));
    for(const b of vb){
      // smooth per-building ghost alpha so it fades rather than pops
      const want = buildingOccludesActor(b) ? 0.34 : 1;
      if(b._ga===undefined) b._ga=1;
      b._ga += (want-b._ga)*0.18;
      if(b._ga<0.999){ ctx.globalAlpha=b._ga; drawBuildingWalls(b); ctx.globalAlpha=1; }
      else drawBuildingWalls(b);
    }
    for(const b of vb){
      if(b._ga!==undefined && b._ga<0.999){ ctx.globalAlpha=b._ga; drawBuildingRoof(b); ctx.globalAlpha=1; }
      else drawBuildingRoof(b);
    } }
  if(typeof perfEnd==="function") perfEnd("buildings");
  if(typeof perfBegin==="function") perfBegin("trees");
  drawTrunks(ox,oy);       // tree poles over buildings/ground, under actors (canopies come later)
  drawScorches(ox,oy);
  drawParked(ox,oy);
  drawRacks(ox,oy);
  drawLeaving(ox,oy);
  drawDebris(ox,oy);
  drawWrecks(ox,oy);
  drawBoats(ox,oy);

  drawSalon();
  drawGunShop();
  drawBlood(ox,oy);
  drawPedGore(ox,oy);
  drawDrops(ox,oy);

  if(typeof perfBegin==="function") perfBegin("actors");
  // NPC pedestrians (culled) — drawn under vehicles so run-overs read correctly
  for(const p of peds){ if(p.x<ox-30||p.x>ox+VW+30||p.y<oy-30||p.y>oy+VH+30) continue; drawPerson(p,p.color,p.state==="down"); if(p.act==="chat"&&p.talking&&p.state!=="down") drawSpeech(p); }
  Game.drawActors(ox,oy,"beforeTraffic");
  // traffic (culled)
  for(const c of traffic){ if(c.x<ox-50||c.x>ox+VW+50||c.y<oy-50||c.y>oy+VH+50) continue; drawVehicle(c,c.color); }
  Game.drawActors(ox,oy,"afterTraffic");
  // police (culled)
  for(const c of cops){ if(c.x<ox-50||c.x>ox+VW+50||c.y<oy-50||c.y>oy+VH+50) continue; drawCop(c); }
  for(const h of helis){ if(h.x<ox-80||h.x>ox+VW+80||h.y<oy-80||h.y>oy+VH+80) continue; drawHeli(h); }
  drawFootCops(ox,oy);
  // player on top
  if(!car.dead) drawVehicle(car, car.color);
  if(mode==="foot") drawPerson(ped, ped.shirt||"#2f5fa0", false);
  drawLamps(ox,oy);                                     // 3D lamp posts over vehicles
  drawSignals(ox,oy);                                   // 3D traffic-light posts over vehicles
  if(typeof perfEnd==="function") perfEnd("actors");
  drawCanopies(ox,oy);                                  // tree crowns over everything -> drive/walk under them
  if(typeof perfEnd==="function") perfEnd("trees");
  if(typeof perfBegin==="function") perfBegin("weather");
  drawTreeWildlife(ox,oy);                              // squirrels on branches (above canopy layer)
  drawBirds(ox,oy);                                     // gulls over water + city pigeons
  drawWindLeaves(ox,oy);                                // forest leaves on the wind (scales with gusts)
  drawMissionWorld();
  Game.drawWorldOverlay(ox,oy);
  drawBullets();
  drawSlashes();
  drawExplosions();
  drawSparks(ox,oy);
  if(typeof perfEnd==="function") perfEnd("weather");
  ctx.restore();
  const N = nightFactor(gameHour);
  if(typeof perfBegin==="function") perfBegin("night");
  if(N>0.02){
    const r=lerp(38,9,N)|0, g=lerp(26,15,N)|0, b=lerp(40,44,N)|0;
    ctx.fillStyle=`rgba(${r},${g},${b},${(N*0.6).toFixed(3)})`;
    ctx.fillRect(0,0,VW,VH);
    ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.translate(-ox,-oy);
    drawLights(ox,oy,N);
    ctx.restore();
  }
  if(N<0.55){ const S=sunShadow(gameHour);                                // golden-hour warm sun wash
    if(S){ const warm=1-Math.sin(Math.PI*((gameHour-6.2)/13.1));
      if(warm>0.06){ ctx.fillStyle=`rgba(255,168,86,${(0.08*warm*(1-N)).toFixed(3)})`; ctx.fillRect(0,0,VW,VH); } } }
  if(typeof drawSunFlareScreen==="function") drawSunFlareScreen();
  drawRain();
  if(typeof perfEnd==="function") perfEnd("night");
  vignette();
  drawCrosshair();
  if(typeof perfFrameEnd==="function") perfFrameEnd();
}

