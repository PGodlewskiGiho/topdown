/* living-sprite.js — shared 8-dir facing + GTA2-style multi-frame animation clips */
(function(global){
"use strict";

/** Screen coords: atan2(dy,dx) → E=0, S=π/2, W=π, N=−π/2 */
const DIR=["E","SE","S","SW","W","NW","N","NE"];

const DEFAULT_CLIPS={
  walk:{count:8,step_sec:0.11,speed_max:55},
  run:{count:8,step_sec:0.08,speed_min:55},
  idle:{count:6,step_sec:0.2},
  shoot:{count:8,step_sec:0.09},
  punch:{count:4,step_sec:0.1},
  down:{count:10,step_sec:0.12,hold_last:true},
  die:{count:5,step_sec:0.14,hold_last:true},
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

function moveSpeed(entity){
  let mv=Math.hypot(entity.vx||0,entity.vy||0);
  if(mv<=0.5){
    const mx=entity._moveDx||0, my=entity._moveDy||0;
    mv=Math.hypot(mx,my);
  }
  return mv;
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
  const thresh=opts.threshold!=null?opts.threshold:0.15;
  if(fromVel&&Math.hypot(vx,vy)>thresh){ entity._faceDir=fromVel; entity.a=Math.atan2(vy,vx); return fromVel; }
  if(entity._faceDir) return entity._faceDir;
  const idle=dirNameFromAngle(facingAngle(entity));
  entity._faceDir=idle;
  return idle;
}

function dirName(entity){
  return resolveDir(entity);
}

function clipDefs(meta){
  if(meta&&meta.clips) return meta.clips;
  return DEFAULT_CLIPS;
}

function clipSpec(clipId, meta){
  const c=clipDefs(meta)[clipId];
  if(c) return c;
  return DEFAULT_CLIPS[clipId]||{count:2,step_sec:0.11};
}

function clipDuration(clipId, meta){
  const spec=clipSpec(clipId, meta);
  return (spec.count||1)*(spec.step_sec||0.1);
}

function startAttackClip(entity, clipId, meta){
  if(entity._attackT>0.04&&entity._attackClip===clipId) return;
  entity._attackClip=clipId;
  entity._attackT=clipDuration(clipId, meta);
}

function tickAttackClip(entity, dt){
  if(!entity._attackT||entity._attackT<=0) return;
  entity._attackT=Math.max(0, entity._attackT-dt);
  if(entity._attackT<=0) entity._attackClip=null;
}

/** Pick GTA2 animation clip from entity state (matches gta2_re anim groups). */
function animClip(entity, down, meta){
  if(entity.state==="dying") return "die";
  if(down||entity.state==="down") return "down";
  if(entity._attackT>0&&entity._attackClip) return entity._attackClip;
  const clips=clipDefs(meta);
  if(entity.swimming) return clips.idle?"idle":"walk";
  const spd=moveSpeed(entity);
  if(entity.hostile){
    if(spd<36) return "shoot";
    return clips.run?"run":"walk";
  }
  if((entity.panic||0)>0) return clips.run?"run":"walk";
  if(spd<(clips.idle?8:12)) return clips.idle?"idle":"walk";
  const runMin=clips.run&&(clips.run.speed_min!=null?clips.run.speed_min:55);
  if(clips.run&&spd>=runMin) return "run";
  return "walk";
}

function animFrameIndex(entity, clipId, meta, down){
  const spec=clipSpec(clipId, meta);
  const n=spec.count||2;
  const step=spec.step_sec||0.11;
  if(clipId==="die"&&entity.state==="dying"&&entity._dieT!=null){
    return Math.min(n-1, Math.floor(entity._dieT/step));
  }
  if(entity._attackT>0&&clipId===entity._attackClip){
    const total=clipDuration(clipId, meta);
    const elapsed=total-entity._attackT;
    return Math.min(n-1, Math.floor(elapsed/step));
  }
  if(entity.swimming&&(clipId==="idle"||clipId==="walk")){
    const spec=clipSpec("idle", meta);
    const n=spec.count||6;
    const time=entity.previewT!=null?entity.previewT:performance.now()*0.001;
    return Math.floor(time/0.22)%n;
  }
  if((clipId==="down"||down)&&entity.downT!=null){
    const i=Math.floor(entity.downT/step);
    return spec.hold_last?Math.min(n-1,i):i%n;
  }
  const time=entity.previewT!=null?entity.previewT:performance.now()*0.001;
  if(spec.hold_last){
    return Math.min(n-1, Math.floor(time/step)%n);
  }
  return Math.floor(time/step)%n;
}

function animFrameName(entity, down, meta){
  const clip=animClip(entity, down, meta);
  const fi=animFrameIndex(entity, clip, meta, down);
  return clip+fi;
}

function walkPhase(entity){
  const clip=animClip(entity, false, null);
  return animFrameIndex(entity, clip, null, false);
}

function walkFrameName(entity, down, meta){
  return animFrameName(entity, down, meta);
}

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
  DEFAULT_CLIPS,
  snap8Index, snap8Angle, snap8:snap8Angle,
  dirNameFromAngle, dirNameFromDelta, setFacingFromDelta,
  facingAngle, dirName, resolveDir, spriteDir,
  moveSpeed, animClip, animFrameIndex, animFrameName,
  walkPhase, walkFrameName,
  clipSpec, clipDuration, startAttackClip, tickAttackClip,
  isMoving, syncFacing,
};
global.LivingSprite=LivingSprite;
})(typeof window!=="undefined"?window:globalThis);
