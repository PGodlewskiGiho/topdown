/* TOPDOWN CITY — 20-main.js */
/* ---------- main loop ---------- */
let last=performance.now();
function frame(now){
  let dt=(now-last)/1000; last=now;
  if(dt>0.05) dt=0.05;
  if(gamePhase!=="playing"){
    updateClock(dt); updateWeather(dt); updateRain(dt); updateLeaves(dt);
    if(gamePhase==="charcreate" && typeof drawCharacterPreview==="function") drawCharacterPreview();
    if(mode!=="inside"){ cam.x=focusX; cam.y=focusY; }
    draw(); drawClock();
    requestAnimationFrame(frame);
    return;
  }
  updateClock(dt); updateWeather(dt); updateRain(dt); updateLeaves(dt);
  for(let k=0;k<traffic.length;k++) updateTrafficCar(traffic[k],dt);
  maintainTraffic();
  for(let k=0;k<peds.length;k++) updateNpcPed(peds[k],dt);
  updateLeaving(dt); updateDebris(dt); updateFalling(dt); updateSparks(dt);
  updateBoats(dt);
  updateBirds(dt);
  updateWildlife(dt);
  if(mode==="car") updateCar(dt); else if(mode==="boat") updateBoatDrive(dt); else if(mode==="inside") updateInside(dt); else updatePed(dt);
  updateMission(dt);
  updateWanted(dt);
  pruneT+=dt; if(pruneT>3){ pruneT=0; pruneCaches(); }
  updateCombat(dt);
  updateShop();
  updateGunShop();
  updateDrops(dt);
  updateParkedFx(dt);
  updateWreckFires(dt);
  drainBlasts();
  updateAudio();
  tickSave(dt);
  if(mode!=="inside"){ updateCam(dt); focusX=cam.x; focusY=cam.y; }
  draw(); updateHUD(); drawMini(); checkBiome(); drawClock(); drawStars(); drawMissionHUD(); drawMoney(); drawHealth(); drawShopHUD(); drawWeaponHUD(); drawGunShopHUD();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
