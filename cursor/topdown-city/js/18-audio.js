/* TOPDOWN CITY — 18-audio.js */
/* ---------- audio (synthesized, no files) ---------- */
let actx=null, master=null, audioOn=true, mHeld=false;
let engOsc, engOsc2, engGain, engFilt, sirenOsc, sirenGain, rainGain;
let forestAmbGain, forestWindGain, forestWindFilt, forestWindFilt2, forestRustleGain, forestStreamGain;
let forestAudioBirdTimer=0, forestAnimalTimer=0, forestCritterTimer=0, forestWindSmooth=0, forestAudioLast=0;
function playerInForest(){
  if(typeof focusX==="undefined"||typeof cellAt!=="function") return false;
  const k=cellAt(focusX,focusY);
  return biomeOf(k[0],k[1])==="forest"&&!isMountain(k[0],k[1]);
}
function initForestAudio(){
  if(!actx||forestAmbGain) return;
  forestAmbGain=actx.createGain(); forestAmbGain.gain.value=0; forestAmbGain.connect(master);
  const len=actx.sampleRate*3, buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
  let b=0; for(let i=0;i<len;i++){ const w=Math.random()*2-1; b=(b+w*0.02)*0.98; d[i]=b*3+w*0.15; }
  const windSrc=actx.createBufferSource(); windSrc.buffer=buf; windSrc.loop=true;
  forestWindFilt=actx.createBiquadFilter(); forestWindFilt.type="bandpass"; forestWindFilt.frequency.value=420; forestWindFilt.Q.value=0.55;
  forestWindFilt2=actx.createBiquadFilter(); forestWindFilt2.type="highpass"; forestWindFilt2.frequency.value=95;
  forestWindGain=actx.createGain(); forestWindGain.gain.value=0;
  windSrc.connect(forestWindFilt2); forestWindFilt2.connect(forestWindFilt); forestWindFilt.connect(forestWindGain); forestWindGain.connect(forestAmbGain);
  windSrc.start();
  const rlen=actx.sampleRate*2, rbuf=actx.createBuffer(1,rlen,actx.sampleRate), rd=rbuf.getChannelData(0);
  for(let i=0;i<rlen;i++) rd[i]=Math.random()*2-1;
  const rsrc=actx.createBufferSource(); rsrc.buffer=rbuf; rsrc.loop=true;
  const rf=actx.createBiquadFilter(); rf.type="bandpass"; rf.frequency.value=2400; rf.Q.value=0.35;
  const rh=actx.createBiquadFilter(); rh.type="highpass"; rh.frequency.value=900;
  forestRustleGain=actx.createGain(); forestRustleGain.gain.value=0;
  rsrc.connect(rh); rh.connect(rf); rf.connect(forestRustleGain); forestRustleGain.connect(forestAmbGain);
  rsrc.start();
  const slen=actx.sampleRate*4, sbuf=actx.createBuffer(1,slen,actx.sampleRate), sd=sbuf.getChannelData(0);
  let sb=0; for(let i=0;i<slen;i++){ const w=Math.random()*2-1; sb=(sb+w*0.04)*0.985; sd[i]=sb*2.2+w*0.22; }
  const ssrc=actx.createBufferSource(); ssrc.buffer=sbuf; ssrc.loop=true;
  const sf1=actx.createBiquadFilter(); sf1.type="bandpass"; sf1.frequency.value=680; sf1.Q.value=0.42;
  const sf2=actx.createBiquadFilter(); sf2.type="bandpass"; sf2.frequency.value=2100; sf2.Q.value=0.28;
  forestStreamGain=actx.createGain(); forestStreamGain.gain.value=0;
  ssrc.connect(sf1); sf1.connect(sf2); sf2.connect(forestStreamGain); forestStreamGain.connect(forestAmbGain);
  ssrc.start();
}
function nearForestRiver(x,y){
  if(typeof isRiverAt!=="function") return false;
  if(isRiverAt(x,y)) return true;
  for(let a=0;a<8;a++){ const d=62, ang=a/8*6.283; if(isRiverAt(x+Math.cos(ang)*d,y+Math.sin(ang)*d)) return true; }
  return false;
}
function forestSfx(vol){ if(!actx||!audioOn||!forestAmbGain) return null; const g=actx.createGain(); g.gain.value=vol; g.connect(forestAmbGain); return g; }
function playBirdChirp(pitch,vol,dur){
  const out=forestSfx(vol); if(!out) return;
  const t0=actx.currentTime, d=dur||0.09;
  const o=actx.createOscillator(); o.type="sine";
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(1,t0+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t0+d);
  o.frequency.setValueAtTime(pitch*0.88,t0); o.frequency.exponentialRampToValueAtTime(pitch*1.18,t0+d*0.45); o.frequency.exponentialRampToValueAtTime(pitch*0.92,t0+d);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0+d+0.02);
}
function playBirdChorus(){
  const n=2+(Math.random()*2|0);
  for(let i=0;i<n;i++){
    const p=2200+Math.random()*1800, v=0.04+Math.random()*0.05, delay=i*0.07+Math.random()*0.05;
    setTimeout(()=>playBirdChirp(p,v,0.07+Math.random()*0.05), delay*1000);
  }
}
function playCrowCaw(vol){
  const out=forestSfx(vol||0.11); if(!out) return;
  const t0=actx.currentTime, dur=0.28;
  const len=Math.max(1,(actx.sampleRate*dur)|0), buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
  const n=actx.createBufferSource(); n.buffer=buf;
  const nf=actx.createBiquadFilter(); nf.type="bandpass"; nf.frequency.value=720; nf.Q.value=1.1;
  const ng=actx.createGain(); ng.gain.setValueAtTime(0.5,t0); ng.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t0);
  const o=actx.createOscillator(); o.type="square";
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.35,t0+0.02); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.frequency.setValueAtTime(210,t0); o.frequency.exponentialRampToValueAtTime(145,t0+dur*0.85);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0+dur+0.02);
}
function playHawkCry(vol){
  const out=forestSfx(vol||0.08); if(!out) return;
  const t0=actx.currentTime, dur=0.55;
  const o=actx.createOscillator(); o.type="sine";
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(1,t0+0.04); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.frequency.setValueAtTime(1380,t0); o.frequency.exponentialRampToValueAtTime(920,t0+dur*0.7); o.frequency.linearRampToValueAtTime(780,t0+dur);
  const vib=actx.createOscillator(); vib.frequency.value=6; const vg=actx.createGain(); vg.gain.value=35;
  vib.connect(vg); vg.connect(o.frequency); vib.start(t0); vib.stop(t0+dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0+dur+0.02);
}
function playOwlHoot(vol){
  const out=forestSfx(vol||0.09); if(!out) return;
  const t0=actx.currentTime;
  for(let i=0;i<2;i++){
    const tt=t0+i*0.38, o=actx.createOscillator(); o.type="sine"; o.frequency.value=280-i*18;
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,tt); g.gain.linearRampToValueAtTime(0.9,tt+0.04); g.gain.exponentialRampToValueAtTime(0.0001,tt+0.32);
    o.connect(g); g.connect(out); o.start(tt); o.stop(tt+0.35);
  }
}
function playWoodpecker(vol){
  const out=forestSfx(vol||0.07); if(!out) return;
  const t0=actx.currentTime, taps=4+(Math.random()*3|0);
  for(let i=0;i<taps;i++){
    const tt=t0+i*0.055, len=Math.max(1,(actx.sampleRate*0.018)|0), buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
    for(let j=0;j<len;j++) d[j]=(Math.random()*2-1)*(1-j/len);
    const src=actx.createBufferSource(); src.buffer=buf;
    const f=actx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=1800; f.Q.value=2.2;
    const g=actx.createGain(); g.gain.setValueAtTime(0.55,tt); g.gain.exponentialRampToValueAtTime(0.001,tt+0.018);
    src.connect(f); f.connect(g); g.connect(out); src.start(tt);
  }
}
function playJayCall(vol){
  const out=forestSfx(vol||0.07); if(!out) return;
  const t0=actx.currentTime;
  for(let i=0;i<3;i++){
    const tt=t0+i*0.11, o=actx.createOscillator(); o.type="triangle";
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,tt); g.gain.linearRampToValueAtTime(0.8,tt+0.015); g.gain.exponentialRampToValueAtTime(0.001,tt+0.09);
    o.frequency.setValueAtTime(900+i*80,tt); o.frequency.exponentialRampToValueAtTime(620+i*60,tt+0.08);
    o.connect(g); g.connect(out); o.start(tt); o.stop(tt+0.1);
  }
}
function playForestBirdRandom(){
  initAudio();
  const night=typeof gameHour!=="undefined"&&(gameHour<6||gameHour>20);
  const r=Math.random();
  if(night){
    if(r<0.55) playOwlHoot(0.07+Math.random()*0.04);
    else if(r<0.78) playCrowCaw(0.05);
    else playBirdChirp(1600+Math.random()*400,0.03,0.06);
  } else if(r<0.38) playBirdChorus();
  else if(r<0.52) playCrowCaw(0.06+Math.random()*0.05);
  else if(r<0.64) playJayCall(0.06);
  else if(r<0.74) playWoodpecker(0.05+Math.random()*0.03);
  else if(r<0.84) playHawkCry(0.05+Math.random()*0.04);
  else playBirdChirp(2600+Math.random()*1200,0.045+Math.random()*0.03,0.08);
}
function playForestDeerSnort(vol){
  const out=forestSfx(vol||0.12); if(!out) return;
  const t0=actx.currentTime, dur=0.16;
  const len=Math.max(1,(actx.sampleRate*dur)|0), buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
  const src=actx.createBufferSource(); src.buffer=buf;
  const f=actx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=520; f.Q.value=1.4;
  const g=actx.createGain(); g.gain.setValueAtTime(0.7,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  src.connect(f); f.connect(g); g.connect(out); src.start(t0);
  const o=actx.createOscillator(); o.type="sine"; o.frequency.value=180;
  const og=actx.createGain(); og.gain.setValueAtTime(0.0001,t0); og.gain.linearRampToValueAtTime(0.25,t0+0.02); og.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.connect(og); og.connect(out); o.start(t0); o.stop(t0+dur);
}
function playForestWolfHowl(vol){
  const out=forestSfx(vol||0.1); if(!out) return;
  const t0=actx.currentTime, dur=1.35+Math.random()*0.5;
  const o=actx.createOscillator(); o.type="sine";
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.85,t0+0.25); g.gain.setValueAtTime(0.75,t0+dur*0.55); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.frequency.setValueAtTime(320,t0); o.frequency.linearRampToValueAtTime(780,t0+dur*0.42); o.frequency.exponentialRampToValueAtTime(290,t0+dur);
  const vib=actx.createOscillator(); vib.frequency.value=5.5; const vg=actx.createGain(); vg.gain.value=22;
  vib.connect(vg); vg.connect(o.frequency); vib.start(t0); vib.stop(t0+dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0+dur+0.05);
}
function playForestBoarGrunt(vol){
  const out=forestSfx(vol||0.11); if(!out) return;
  const t0=actx.currentTime, dur=0.22;
  const o=actx.createOscillator(); o.type="sawtooth";
  const f=actx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=280;
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.55,t0+0.025); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.frequency.setValueAtTime(95,t0); o.frequency.exponentialRampToValueAtTime(68,t0+dur);
  o.connect(f); f.connect(g); g.connect(out); o.start(t0); o.stop(t0+dur+0.02);
}
function playForestBearGrowl(vol){
  const out=forestSfx(vol||0.14); if(!out) return;
  const t0=actx.currentTime, dur=0.45;
  const o=actx.createOscillator(); o.type="sawtooth";
  const f=actx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=190;
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.65,t0+0.05); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.frequency.setValueAtTime(72,t0); o.frequency.exponentialRampToValueAtTime(48,t0+dur);
  o.connect(f); f.connect(g); g.connect(out); o.start(t0); o.stop(t0+dur+0.02);
  noiseBurst(0.35,"lowpass",120,0,Math.min(0.35,(vol||0.14)*2));
}
function playForestSquirrelChirp(vol){
  const out=forestSfx(vol||0.08); if(!out) return;
  const t0=actx.currentTime;
  for(let i=0;i<3+(Math.random()*2|0);i++){
    const tt=t0+i*0.07+Math.random()*0.03;
    const o=actx.createOscillator(); o.type="sine";
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,tt); g.gain.linearRampToValueAtTime(0.85,tt+0.008); g.gain.exponentialRampToValueAtTime(0.001,tt+0.07);
    o.frequency.setValueAtTime(2800+Math.random()*900,tt); o.frequency.exponentialRampToValueAtTime(2200+Math.random()*600,tt+0.06);
    o.connect(g); g.connect(out); o.start(tt); o.stop(tt+0.08);
  }
}
function playForestBushRustle(vol){
  const out=forestSfx(vol||0.06); if(!out) return;
  const t0=actx.currentTime, dur=0.14+Math.random()*0.08;
  const len=Math.max(1,(actx.sampleRate*dur)|0), buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
  const src=actx.createBufferSource(); src.buffer=buf;
  const f=actx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=1800+Math.random()*1200; f.Q.value=0.65;
  const g=actx.createGain(); g.gain.setValueAtTime(vol||0.06,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  src.connect(f); f.connect(g); g.connect(out); src.start(t0);
}
function playForestFoxYip(vol){
  const out=forestSfx(vol||0.09); if(!out) return;
  const t0=actx.currentTime, dur=0.18;
  const o=actx.createOscillator(); o.type="triangle";
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.75,t0+0.015); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.frequency.setValueAtTime(520,t0); o.frequency.exponentialRampToValueAtTime(920,t0+dur*0.55); o.frequency.exponentialRampToValueAtTime(680,t0+dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0+dur+0.02);
}
function playForestOtterChirp(vol){
  const out=forestSfx(vol||0.08); if(!out) return;
  const t0=actx.currentTime;
  for(let i=0;i<2;i++){
    const tt=t0+i*0.16, o=actx.createOscillator(); o.type="sine";
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,tt); g.gain.linearRampToValueAtTime(0.9,tt+0.02); g.gain.exponentialRampToValueAtTime(0.001,tt+0.22);
    o.frequency.setValueAtTime(1100-i*80,tt); o.frequency.linearRampToValueAtTime(1680-i*60,tt+0.12); o.frequency.exponentialRampToValueAtTime(980,tt+0.22);
    o.connect(g); g.connect(out); o.start(tt); o.stop(tt+0.24);
  }
}
function playForestOtterSplash(vol){
  const out=forestSfx(vol||0.07); if(!out) return;
  const t0=actx.currentTime, dur=0.22;
  const len=Math.max(1,(actx.sampleRate*dur)|0), buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
  const src=actx.createBufferSource(); src.buffer=buf;
  const f=actx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=420; f.Q.value=0.55;
  const g=actx.createGain(); g.gain.setValueAtTime(vol||0.07,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  src.connect(f); f.connect(g); g.connect(out); src.start(t0);
  const o=actx.createOscillator(); o.type="sine"; o.frequency.value=180;
  const og=actx.createGain(); og.gain.setValueAtTime(0.0001,t0); og.gain.linearRampToValueAtTime(0.2,t0+0.02); og.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.connect(og); og.connect(out); o.start(t0); o.stop(t0+dur);
}
function playForestCritterAmbient(){
  initAudio();
  const r=Math.random();
  if(r<0.28) playForestSquirrelChirp(0.035+Math.random()*0.03);
  else if(r<0.48) playForestBushRustle(0.03+Math.random()*0.025);
  else if(r<0.68) playForestFoxYip(0.03+Math.random()*0.025);
  else if(r<0.86) playForestOtterChirp(0.03+Math.random()*0.025);
  else playForestOtterSplash(0.025+Math.random()*0.02);
}
function playForestAnimalAmbient(){
  initAudio();
  const r=Math.random();
  if(r<0.34) playForestWolfHowl(0.04+Math.random()*0.04);
  else if(r<0.58) playForestDeerSnort(0.035+Math.random()*0.03);
  else if(r<0.78) playForestBoarGrunt(0.04+Math.random()*0.03);
  else playForestBearGrowl(0.03+Math.random()*0.025);
}
function updateForestAudio(){
  if(!actx) return;
  if(!forestAmbGain) initForestAudio();
  if(!forestAmbGain) return;
  const now=performance.now();
  const dt=Math.min(0.05,(now-forestAudioLast)/1000||0.016);
  forestAudioLast=now;
  const forest=playerInForest()&&(typeof gamePhase==="undefined"||gamePhase==="playing");
  const rainDuck=1-(typeof weatherI!=="undefined"?weatherI:0)*0.55;
  const wPow=typeof windAmp!=="undefined"?windAmp:0.08;
  const gust=typeof windGust!=="undefined"?windGust:0;
  const wt=typeof windT!=="undefined"?windT:0;
  const targetAmb=forest?rainDuck:0;
  forestAmbGain.gain.value+=(targetAmb-forestAmbGain.gain.value)*Math.min(1,2.8*dt);
  if(!forest){ forestWindSmooth=0; if(forestWindGain) forestWindGain.gain.value=0; if(forestRustleGain) forestRustleGain.gain.value=0; return; }
  const targetWind=(0.025+wPow*0.14+gust*0.06)*rainDuck*(0.85+0.15*Math.sin(wt*0.9));
  forestWindSmooth+=(targetWind-forestWindSmooth)*Math.min(1,1.8*dt);
  forestWindGain.gain.value=forestWindSmooth;
  forestWindFilt.frequency.value=260+wPow*520+gust*180+Math.sin(wt*0.65)*90;
  forestWindFilt.Q.value=0.45+wPow*0.35;
  forestRustleGain.gain.value=(0.012+wPow*0.028+gust*0.012)*rainDuck*(0.7+0.3*Math.sin(wt*1.4+1.2));
  if(forestStreamGain){
    const px=typeof focusX!=="undefined"?focusX:(mode==="car"?car.x:ped.x);
    const py=typeof focusY!=="undefined"?focusY:(mode==="car"?car.y:ped.y);
    const stream=nearForestRiver(px,py)?0.11:0;
    forestStreamGain.gain.value+=(stream-forestStreamGain.gain.value)*Math.min(1,2.2*dt);
  }
  forestAudioBirdTimer-=dt;
  if(forestAudioBirdTimer<=0){
    forestAudioBirdTimer=rand(1.4,5.2)/(0.55+wPow*0.35);
    if(Math.random()<0.88) playForestBirdRandom();
  }
  forestAnimalTimer-=dt;
  if(forestAnimalTimer<=0){
    forestAnimalTimer=rand(8,22);
    if(Math.random()<0.72) playForestAnimalAmbient();
  }
  forestCritterTimer-=dt;
  if(forestCritterTimer<=0){
    forestCritterTimer=rand(3.5,9);
    const nearStream=nearForestRiver(typeof focusX!=="undefined"?focusX:(mode==="car"?car.x:ped.x), typeof focusY!=="undefined"?focusY:(mode==="car"?car.y:ped.y));
    if(Math.random()<(nearStream?0.82:0.62)) playForestCritterAmbient();
  }
}
window.playForestDeerSnort=playForestDeerSnort;
window.playForestWolfHowl=playForestWolfHowl;
window.playForestBoarGrunt=playForestBoarGrunt;
window.playForestBearGrowl=playForestBearGrowl;
window.playForestSquirrelChirp=playForestSquirrelChirp;
window.playForestBushRustle=playForestBushRustle;
window.playForestFoxYip=playForestFoxYip;
window.playForestOtterChirp=playForestOtterChirp;
window.playForestOtterSplash=playForestOtterSplash;
function initAudio(){
  if(actx) return;
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  actx=new AC();
  master=actx.createGain(); master.gain.value=audioOn?0.9:0; master.connect(actx.destination);
  // engine: two detuned saws through a lowpass
  engGain=actx.createGain(); engGain.gain.value=0;
  engFilt=actx.createBiquadFilter(); engFilt.type="lowpass"; engFilt.frequency.value=600;
  engOsc=actx.createOscillator();  engOsc.type="sawtooth";  engOsc.frequency.value=55;
  engOsc2=actx.createOscillator(); engOsc2.type="sawtooth"; engOsc2.frequency.value=55; engOsc2.detune.value=10;
  engOsc.connect(engFilt); engOsc2.connect(engFilt); engFilt.connect(engGain); engGain.connect(master);
  engOsc.start(); engOsc2.start();
  // siren: square through bandpass
  sirenGain=actx.createGain(); sirenGain.gain.value=0;
  const sf=actx.createBiquadFilter(); sf.type="bandpass"; sf.frequency.value=900; sf.Q.value=3;
  sirenOsc=actx.createOscillator(); sirenOsc.type="square"; sirenOsc.frequency.value=700;
  sirenOsc.connect(sf); sf.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
  // rain: looped noise through lowpass
  const len=actx.sampleRate*2, buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  const rs=actx.createBufferSource(); rs.buffer=buf; rs.loop=true;
  const rf=actx.createBiquadFilter(); rf.type="lowpass"; rf.frequency.value=2600;
  rainGain=actx.createGain(); rainGain.gain.value=0;
  rs.connect(rf); rf.connect(rainGain); rainGain.connect(master); rs.start();
  initForestAudio();
}
function toggleMute(){ audioOn=!audioOn; if(master) master.gain.value=audioOn?0.9:0; showBigMsg(audioOn?"DŹWIĘK WŁ":"DŹWIĘK WYŁ"); }
function noiseBurst(dur,type,freq,Q,vol){
  if(!actx||!audioOn) return;
  const len=Math.max(1,(actx.sampleRate*dur)|0), buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
  const src=actx.createBufferSource(); src.buffer=buf;
  const f=actx.createBiquadFilter(); f.type=type; f.frequency.value=freq; if(Q) f.Q.value=Q;
  const g=actx.createGain(); g.gain.setValueAtTime(vol,actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+dur);
  src.connect(f); f.connect(g); g.connect(master); src.start();
}
function playShot(){ noiseBurst(0.12,"bandpass",1200,1.2,0.45); }
function playSplash(){ noiseBurst(0.45,"lowpass",420,0,0.4); }
function playThud(v){ noiseBurst(0.18,"lowpass",220,0,Math.min(0.6,v)); }
function bellStrike(f0,vol,when){
  if(!actx||!audioOn) return; const t0=actx.currentTime+when;
  for(const [ratio,amp] of [[1,1],[2.0,0.6],[2.76,0.42],[5.4,0.18]]){    // inharmonic bell partials
    const o=actx.createOscillator(); o.type="sine"; o.frequency.value=f0*ratio;
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(vol*amp,t0+0.008); g.gain.exponentialRampToValueAtTime(0.0008,t0+2.6);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0+2.8); }
}
function playBell(){ initAudio(); bellStrike(330,0.5,0); bellStrike(330,0.42,1.15); }
function playThunder(){ noiseBurst(0.9,"lowpass",150,0,0.5); }
function playHorn(){ if(!actx||!audioOn) return; const t0=actx.currentTime, moto=car.kind==="moto";
  const f=actx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=1700;
  const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(0.13,t0+0.02); g.gain.setValueAtTime(0.13,t0+0.3); g.gain.exponentialRampToValueAtTime(0.001,t0+0.46);
  f.connect(g); g.connect(master);
  for(const fr of (moto?[470,590]:[300,380])){ const o=actx.createOscillator(); o.type="square"; o.frequency.value=fr; o.connect(f); o.start(t0); o.stop(t0+0.5); }
}
function playBicycleBell(){ if(!actx||!audioOn) return; const t0=actx.currentTime;
  for(let n=0;n<2;n++){ const tt=t0+n*0.16, o=actx.createOscillator(); o.type="sine"; o.frequency.value=2150;
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,tt); g.gain.exponentialRampToValueAtTime(0.2,tt+0.005); g.gain.exponentialRampToValueAtTime(0.001,tt+0.45);
    o.connect(g); g.connect(master); o.start(tt); o.stop(tt+0.5); }
}
function honk(){ initAudio(); if(mode!=="car") return; if(car.kind==="bike") playBicycleBell(); else playHorn(); }
function updateAudio(){
  if(!actx) return;
  const sp=Math.hypot(car.vx,car.vy);
  if(mode==="car" && car.kind!=="bike"){
    const moto=car.kind==="moto", f=(moto?80:50)+sp*(moto?0.26:0.16); engOsc.frequency.value=f; engOsc2.frequency.value=f*1.01;
    engGain.gain.value=(moto?0.04:0.05)+Math.min(0.12,sp*0.0004); engFilt.frequency.value=(moto?900:500)+sp*0.8;
  } else engGain.gain.value*=0.85;
  if(lawActive()){
    const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y; let dmin=1e9;
    for(const c of cops) dmin=Math.min(dmin,Math.hypot(c.x-ax,c.y-ay));
    for(const h of helis) dmin=Math.min(dmin,Math.hypot(h.x-ax,h.y-ay));
    sirenGain.gain.value=0.12*Math.max(0,1-dmin/700)+helis.length*0.03;
    sirenOsc.frequency.value=650+250*(0.5+0.5*Math.sin(performance.now()/180));
  } else sirenGain.gain.value*=0.9;
  rainGain.gain.value=weatherI*0.25;
  updateForestAudio();
}

