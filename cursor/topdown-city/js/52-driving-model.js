/* TOPDOWN CITY — 52-driving-model.js */
/* Shared vehicle dynamics: bicycle steering + Pacejka-lite lateral grip */

const DRIVE_WHEELBASE = 54;
const DRIVE_ENGINE_BRAKE = 118;
const DRIVE_STEER_MIN_FWD = 12;
const DRIVE_CORNER_STIFF = 9.4;
const DRIVE_MAX_STEER = 0.92;

function driveVelBody(vx, vy, heading){
  const c=Math.cos(heading), s=Math.sin(heading);
  return {f:vx*c+vy*s, l:-vx*s+vy*c};
}
function driveVelFromBody(f, l, heading){
  const c=Math.cos(heading), s=Math.sin(heading);
  return {vx:c*f-s*l, vy:s*f+c*l};
}
function driveNormAng(a){
  while(a>Math.PI)a-=6.283185307;
  while(a<-Math.PI)a+=6.283185307;
  return a;
}
function driveSlipAngle(fwd, lat){
  const sp=Math.hypot(fwd, lat);
  if(sp<3.5) return 0;
  return Math.atan2(lat, Math.abs(fwd)<2?fwd:fwd);
}
function driveYawFromSteer(steerIn, fwdSpeed, turnMul, dt, hb){
  const fwd=Math.abs(fwdSpeed);
  if(fwd<DRIVE_STEER_MIN_FWD && Math.abs(fwdSpeed)<10) return 0;
  const dir=fwdSpeed<-8?-1:1;
  const vFactor=clamp(fwd/(fwd+48), 0.20, 1.05);
  let rate=steerIn*DRIVE_MAX_STEER*turnMul*dir*vFactor*(fwd/DRIVE_WHEELBASE);
  if(hb&&fwd>28) rate*=1.38+clamp(fwd/220,0,0.32);
  return rate*dt;
}
function driveLatForce(fwd, lat, grip, stiffMul, axleMul){
  stiffMul=stiffMul==null?1:stiffMul;
  axleMul=axleMul==null?1:axleMul;
  const beta=driveSlipAngle(fwd, lat);
  const dm=Math.abs(fwd)+22;
  return -DRIVE_CORNER_STIFF*stiffMul*axleMul*grip*beta/dm;
}
function driveApplyLatGrip(lat, fwd, grip, dt, rearShare, rearGrip, frontGrip){
  rearShare=rearShare==null?0.74:rearShare;
  const rs=rearShare, fs=1-rs;
  const rearLat=lat*rs, frontLat=lat*fs;
  const rF=driveLatForce(fwd, rearLat, grip, rearGrip, 0.88);
  const fF=driveLatForce(fwd, frontLat, grip, frontGrip, 1.08);
  const dRear=clamp(rF*dt*Math.abs(fwd+18), -Math.abs(rearLat), Math.abs(rearLat));
  const dFront=clamp(fF*dt*Math.abs(fwd+18)*1.12, -Math.abs(frontLat), Math.abs(frontLat));
  return (rearLat+dRear)+(frontLat+dFront);
}
function driveEngineBrakeDecel(fwd, rate, dt){
  if(Math.abs(fwd)<2.5) return 0;
  return Math.min(Math.abs(fwd), rate*dt)*Math.sign(fwd);
}
function driveAlignVelocity(vx, vy, heading, strength){
  const sp=Math.hypot(vx, vy);
  if(sp<1.2) return {vx, vy};
  const va=Math.atan2(vy, vx);
  const da=driveNormAng(heading-va);
  const na=va+da*strength;
  return {vx:Math.cos(na)*sp, vy:Math.sin(na)*sp};
}
function driveLerpLaneOff(c, targetOff, dt){
  const k=1-Math.exp(-5.2*dt);
  c._laneOff=(c._laneOff||0)+(targetOff-(c._laneOff||0))*k;
}
function driveTrafficSteer(c, desiredA, distToTarget, dt){
  let steer=driveNormAng(desiredA-c.a);
  if(distToTarget>6){
    const pull=clamp(distToTarget/36, 0, 0.42);
    steer*=0.55+pull;
  }
  return clamp(steer/0.48, -1, 1);
}
function driveHeadingFromMotion(c, desiredA, dt){
  const mv=Math.hypot(c.vx, c.vy);
  if(mv>12){
    const va=Math.atan2(c.vy, c.vx);
    let da=driveNormAng(va-c.a);
    if(Math.abs(da)<1.15) c.a+=da*Math.min(1, 11*dt);
    else c.a=desiredA;
  } else c.a=desiredA;
}
