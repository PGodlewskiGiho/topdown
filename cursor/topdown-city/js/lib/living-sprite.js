/* living-sprite.js — shared 8-dir facing, animation state for living entities */
(function(global){
"use strict";

/** Screen coords: atan2(dy,dx) → E=0, S=π/2, W=π, N=−π/2 */
const DIR=["E","SE","S","SW","W","NW","N","NE"];

const DEFAULT_ANIMS={
  walk:{frames:16,fps:12,loop:true},
  run:{frames:16,fps:18,loop:true},
  swim:{frames:16,fps:10,loop:true},
  death:{frames:16,fps:10,loop:false,hold_last:true},
  gun:{frames:16,fps:12,loop:true},
};

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

function speedOf(entity){
  return Math.hypot(entity.vx||0,entity.vy||0);
}

function facingAngle(entity){
  const vx=entity.vx||0, vy=entity.vy||0;
  if(Math.hypot(vx,vy)>0.5) return Math.atan2(vy,vx);
  const a=entity.a;
  if(typeof a==="number"&&isFinite(a)) return a;
  return 0;
}

function resolveDir(entity, opts){
  opts=opts||{};
  if(opts.keys){
    const ix=(opts.keys["d"]||opts.keys["arrowright"]?1:0)-(opts.keys["a"]||opts.keys["arrowleft"]?1:0);
    const iy=(opts.keys["s"]||opts.keys["arrowdown"]?1:0)-(opts.keys["w"]||opts.keys["arrowup"]?1:0);
    const kd=dirNameFromDelta(ix,iy);
    if(kd){ entity._faceDir=kd; entity.a=Math.atan2(iy,ix); return kd; }
  }
  const mdx=entity._moveDx||0, mdy=entity._moveDy||0;
  const fromInput=dirNameFromDelta(mdx,mdy);
  if(fromInput){ entity._faceDir=fromInput; entity.a=Math.atan2(mdy,mdx); return fromInput; }
  const vx=entity.vx||0, vy=entity.vy||0;
  const fromVel=dirNameFromDelta(vx,vy);
  const thresh=opts.threshold!=null?opts.threshold:0.35;
  if(fromVel&&Math.hypot(vx,vy)>thresh){ entity._faceDir=fromVel; entity.a=Math.atan2(vy,vx); return fromVel; }
  if(entity._faceDir) return entity._faceDir;
  const idle=dirNameFromAngle(facingAngle(entity));
  entity._faceDir=idle;
  return idle;
}

function dirName(entity){
  return resolveDir(entity);
}

function animMeta(anim, meta){
  if(meta&&meta.animations&&meta.animations[anim]) return meta.animations[anim];
  return DEFAULT_ANIMS[anim]||DEFAULT_ANIMS.walk;
}

/** walk / run / swim / death / gun */
function animName(entity, opts){
  opts=opts||{};
  if(opts.down||entity.state==="down") return "death";
  if(entity.swimming) return "swim";
  if(entity.hostile||entity.armed||entity.weapon!=null) return "gun";
  const walkSpd=entity.walk||96;
  const spd=speedOf(entity);
  const running=typeof keys!=="undefined"&&keys["shift"]&&entity===ped;
  if(running||spd>walkSpd*1.12) return "run";
  return "walk";
}

function animFrame(entity, anim, meta){
  const cfg=animMeta(anim, meta);
  const frames=cfg.frames||16;
  const fps=cfg.fps||12;
  if(anim==="death"){
    const t=entity.downT!=null?entity.downT:0;
    return Math.min(frames-1, Math.floor(t*fps));
  }
  if(speedOf(entity)<0.35&&anim!=="gun") return 0;
  const time=entity.previewT!=null?entity.previewT:performance.now()*0.001;
  return Math.floor(time*fps)%frames;
}

function walkPhase(entity){
  return animFrame(entity, "walk")%2;
}

function walkFrameName(entity, down){
  const anim=animName(entity,{down});
  return anim+"/"+frameTag(animFrame(entity, anim));
}

function frameTag(fi){ return "f"+String(fi).padStart(2,"0"); }

function syncFacing(entity){
  return setFacingFromDelta(entity, entity.vx||0, entity.vy||0);
}

function spriteDir(entity, opts){
  opts=opts||{};
  if(opts.keys){
    const ix=(opts.keys["d"]||opts.keys["arrowright"]?1:0)-(opts.keys["a"]||opts.keys["arrowleft"]?1:0);
    const iy=(opts.keys["s"]||opts.keys["arrowdown"]?1:0)-(opts.keys["w"]||opts.keys["arrowup"]?1:0);
    const kd=dirNameFromDelta(ix,iy);
    if(kd){ entity._faceDir=kd; entity.a=Math.atan2(iy,ix); return kd; }
  }
  return resolveDir(entity, opts);
}

const LivingSprite={
  DIR,
  snap8Index, snap8Angle, snap8:snap8Angle,
  dirNameFromAngle, dirNameFromDelta, setFacingFromDelta,
  facingAngle, dirName, resolveDir, spriteDir,
  animName, animFrame, animMeta, speedOf,
  walkPhase, walkFrameName, frameTag, isMoving, syncFacing,
  DEFAULT_ANIMS,
};
global.LivingSprite=LivingSprite;
})(typeof window!=="undefined"?window:globalThis);
