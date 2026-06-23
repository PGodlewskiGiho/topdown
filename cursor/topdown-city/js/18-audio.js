/* TOPDOWN CITY — 18-audio.js */
/* ---------- audio (synthesized, no files) ---------- */
let actx=null, master=null, audioOn=true, mHeld=false;
let engOsc, engOsc2, engGain, engFilt, sirenOsc, sirenGain, rainGain;
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
  if(cops.length){
    const ax=mode==="car"?car.x:ped.x, ay=mode==="car"?car.y:ped.y; let dmin=1e9;
    for(const c of cops) dmin=Math.min(dmin,Math.hypot(c.x-ax,c.y-ay));
    sirenGain.gain.value=0.12*Math.max(0,1-dmin/700);
    sirenOsc.frequency.value=650+250*(0.5+0.5*Math.sin(performance.now()/180));
  } else sirenGain.gain.value*=0.9;
  rainGain.gain.value=weatherI*0.25;
}

