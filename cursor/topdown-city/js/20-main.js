/* TOPDOWN CITY — 20-main.js */
/* ---------- main loop ---------- */
getLot(1,2);  // ensure dealership exists near spawn
getLot(2,1);  // ensure gun shop exists near spawn
let last=performance.now();
function frame(now){
  let dt=(now-last)/1000; last=now;
  if(dt>0.05) dt=0.05;
  if(gamePhase!=="playing"){
    updateClock(dt); updateWeather(dt); updateRain(dt); updateLeaves(dt);
    if((gamePhase==="charcreate"||gamePhase==="respawn") && typeof drawCharacterPreview==="function") drawCharacterPreview();
    if(mode!=="inside"){ cam.x=focusX; cam.y=focusY; }
    draw(); drawClock();
    requestAnimationFrame(frame);
    return;
  }
  updateClock(dt); updateWeather(dt); updateRain(dt); updateLeaves(dt);
  const mapPause=typeof bigMapOpen!=="undefined"&&bigMapOpen;
  if(!mapPause){
  for(let k=0;k<traffic.length;k++) updateTrafficCar(traffic[k],dt);
  maintainTraffic();
  maintainPeds();
  for(let k=0;k<peds.length;k++) updateNpcPed(peds[k],dt);
  updateLeaving(dt); updateDebris(dt); updateFalling(dt); updateSparks(dt);
  updateBoats(dt);
  updateBirds(dt);
  if(mode==="car") updateCar(dt); else if(mode==="boat") updateBoatDrive(dt); else if(mode==="inside") updateInside(dt); else updatePed(dt);
  updateMission(dt);
  updateWanted(dt);
  updateCombat(dt);
  updateShop();
  updateGunShop();
  updateDrops(dt);
  updateBlood(dt);
  if(mode==="foot"&&ped.bloodPulse>0) ped.bloodPulse=Math.max(0,ped.bloodPulse-dt*2.2);
  updateParkedFx(dt);
  updateWreckFires(dt);
  drainBlasts();
  }
  else { maintainTraffic(); maintainPeds(); }
  pruneT+=dt; if(pruneT>3){ pruneT=0; pruneCaches(); }
  updateAudio();
  tickSave(dt);
  Game.update(dt, mapPause);
  if(mode!=="inside"){ updateCam(dt); focusX=cam.x; focusY=cam.y; }
  draw(); updateHUD(); if(typeof drawDriftHud==="function") drawDriftHud(); drawMini(); checkBiome(); drawClock(); drawStars(); drawMissionHUD(); drawMoney(); drawHealth(); drawShopHUD(); drawWeaponHUD(); drawGunShopHUD();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
