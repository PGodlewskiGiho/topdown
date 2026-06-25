/* living-sprite.js — shared 8-dir facing, walk phase for living entities */
(function(global){
"use strict";

/** Screen atan2(vy,vx): 0=E, π/2=S, π=W, −π/2=N */
const DIR=["E","SE","S","SW","W","NW","N","NE"];
const MOVING_THRESHOLD=4;

function snap8Index(a){
  const d=((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  return Math.round(d/(Math.PI/4))%DIR.length;
}

function snap8Angle(a){
  return snap8Index(a)*(Math.PI/4);
}

function isMoving(entity, threshold){
  const t=threshold!=null?threshold:MOVING_THRESHOLD;
  return Math.hypot(entity.vx||0, entity.vy||0)>t;
}

function facingAngle(entity){
  const vx=entity.vx||0, vy=entity.vy||0;
  if(isMoving(entity)) return Math.atan2(vy,vx);
  const a=entity.a;
  if(typeof a==="number"&&isFinite(a)) return a;
  return 0;
}

function dirNameFromAngle(a){
  return DIR[snap8Index(a)];
}

function dirName(entity){
  return dirNameFromAngle(facingAngle(entity));
}

function walkPhase(entity, threshold){
  const t=threshold!=null?threshold:MOVING_THRESHOLD;
  const mv=Math.hypot(entity.vx||0, entity.vy||0);
  const time=entity.previewT!=null?entity.previewT:performance.now()*0.001;
  return mv>t?((Math.sin(time*13)>0)?1:0):0;
}

function walkFrameName(entity, down){
  if(down) return "walk0";
  return "walk"+walkPhase(entity);
}

function syncFacing(entity, threshold){
  if(isMoving(entity, threshold)){
    entity.a=Math.atan2(entity.vy||0, entity.vx||0);
  }
  return entity.a;
}

const LivingSprite={
  DIR, MOVING_THRESHOLD,
  snap8Index, snap8Angle,
  snap8:snap8Angle,
  facingAngle, dirName, dirNameFromAngle,
  walkPhase, walkFrameName,
  isMoving, syncFacing,
};
global.LivingSprite=LivingSprite;
})(typeof window!=="undefined"?window:globalThis);
