/* TOPDOWN CITY — 06-render-draw.js */
/* ---------- rendering ---------- */
const css = getComputedStyle(document.documentElement);
const COL = n => css.getPropertyValue(n).trim();
function draw(){
  if(mode==="inside"){ drawInterior(); return; }
  ctx.setTransform(ZOOM/PX,0,0,ZOOM/PX,0,0);
  const ox = cam.x - VW/2, oy = cam.y - VH/2; // top-left of view in world
  ctx.save();
  ctx.translate(-ox,-oy);

  // base ground fill (biome ground per lot, over which roads are layered)
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
    else if(L.empty){
      if(L.salon||L.gunshop||L.motodealer){ fillCell(L, L.B.walk); texFill(L,"concrete"); if(L.motodealer) drawMotoDealerLot(L); }
      else { fillCell(L, L.B.ground); const sandy=(L.biome==="desert"||L.biome==="sea"); texFill(L, sandy?"sand":"grass"); if(sandy) drawSandDetail(L); else { if(L.biome==="forest") drawForestFloor(L); drawGrassDetail(L); } drawProps(L); }
    }
    else if(L.zone==="suburb"){ fillCell(L, L.B.ground); texFill(L,"grass"); drawGrassDetail(L); drawProps(L); drawFences(L); }
    else { fillCell(L, L.B.walk); texFill(L,"concrete"); pavingLines(L); }
  }
  drawWaterGlobal(ox,oy);   // one seamless water layer over all ground
  // organic bezier roads drawn on top of ground
  drawRoads(ox,oy);
  drawPlazas(ox,oy);
  drawCrosswalks(ox,oy);

  // skid marks
  ctx.fillStyle="rgba(20,20,24,.5)";
  for(const m of skid){ ctx.save(); ctx.translate(m.x,m.y); ctx.rotate(m.a); ctx.fillRect(-3,-2.2,6,4.4); ctx.restore(); }

  drawWet(ox,oy);          // wet asphalt + puddles (under traffic)
  drawShadows(ox,oy);      // directional sun shadows on the ground (day)
  drawCanopyShades(ox,oy); // ALTTP forest canopy pools (ambient, under elevated crowns)
  drawBlockGrounds(ox,oy); // courtyards, paths, gardens & estate parks around bloks

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
  drawDrops(ox,oy);

  // NPC pedestrians (culled) — drawn under vehicles so run-overs read correctly
  for(const p of peds){ if(p.x<ox-30||p.x>ox+VW+30||p.y<oy-30||p.y>oy+VH+30) continue; drawPerson(p,p.color,p.state==="down"); if(p.act==="chat"&&p.talking&&p.state!=="down") drawSpeech(p); }
  // traffic (culled)
  for(const c of traffic){ if(c.x<ox-50||c.x>ox+VW+50||c.y<oy-50||c.y>oy+VH+50) continue; drawVehicle(c,c.color); }
  // police (culled)
  for(const c of cops){ if(c.x<ox-50||c.x>ox+VW+50||c.y<oy-50||c.y>oy+VH+50) continue; drawCop(c); }
  drawFootCops(ox,oy);
  // player on top
  if(!car.dead) drawVehicle(car, car.color);
  if(mode==="foot") drawPerson(ped, "#2f5fa0", false);
  drawLamps(ox,oy);                                     // 3D lamp posts over vehicles
  drawSignals(ox,oy);                                   // 3D traffic-light posts over vehicles
  drawCanopies(ox,oy);                                  // tree crowns over everything -> drive/walk under them
  drawBirds(ox,oy);                                     // gulls over water + city pigeons
  drawMissionWorld();
  drawBullets();
  drawSlashes();
  drawExplosions();
  drawSparks(ox,oy);
  ctx.restore();
  const N = nightFactor(gameHour);
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
  drawRain();
  vignette();
  drawCrosshair();
}

