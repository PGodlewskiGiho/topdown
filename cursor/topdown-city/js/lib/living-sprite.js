/* living-sprite.js — shared 8-dir facing, walk phase for living entities */
(function(global){
"use strict";

/** Screen coords: atan2(dy,dx) → E=0, S=π/2, W=π, N=−π/2 */
const DIR=["E","SE","S","SW","W","NW","N","NE"];

function snap8Index(a){
  const d=((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  return Math.round(d/(Math.PI/4))%DIR.length;
}

function snap8Angle(a){
  return snap8Index(a)*(Math.PI/4);
}

function dirNameFromAngle(a){
  return DIR[snap8Index(a)];
}

function dirNameFromDelta(dx,dy){
  const mv=Math.hypot(dx,dy);
  if(mv<0.001) return null;
  return dirNameFromAngle(Math.atan2(dy,dx));
}

/** Set facing from movement input or displacement; keeps last dir when idle. */
function setFacingFromDelta(entity,dx,dy){
  const dir=dirNameFromDelta(dx,dy);
  if(dir){
    entity._faceDir=dir;
    entity.a=Math.atan2(dy,dx);
  }
  return entity._faceDir||dirNameFromAngle(entity.a||0);
}

function isMoving(entity, threshold){
  const t=threshold!=null?threshold:0.5;
  return Math.hypot(entity.vx||0,entity.vy||0)>t;
}

function facingAngle(entity){
  const vx=entity.vx||0, vy=entity.vy||0;
  if(Math.hypot(vx,vy)>0.5) return Math.atan2(vy,vx);
  const a=entity.a;
  if(typeof a==="number"&&isFinite(a)) return a;
  return 0;
}

function dirName(entity){
  if(entity._faceDir) return entity._faceDir;
  const vx=entity.vx||0, vy=entity.vy||0;
  const fromVel=dirNameFromDelta(vx,vy);
  if(fromVel) return fromVel;
  return dirNameFromAngle(facingAngle(entity));
}

function walkPhase(entity){
  const mv=Math.hypot(entity.vx||0,entity.vy||0);
  const time=entity.previewT!=null?entity.previewT:performance.now()*0.001;
  return mv>0.5?((Math.sin(time*13)>0)?1:0):0;
}

function walkFrameName(entity, down){
  if(down) return "walk0";
  return "walk"+walkPhase(entity);
}

function syncFacing(entity){
  return setFacingFromDelta(entity, entity.vx||0, entity.vy||0);
}

const LivingSprite={
  DIR,
  snap8Index, snap8Angle, snap8:snap8Angle,
  dirNameFromAngle, dirNameFromDelta, setFacingFromDelta,
  facingAngle, dirName, walkPhase, walkFrameName,
  isMoving, syncFacing,
};
global.LivingSprite=LivingSprite;
})(typeof window!=="undefined"?window:globalThis);
