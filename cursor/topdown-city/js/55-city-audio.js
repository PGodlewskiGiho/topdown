/* TOPDOWN CITY — 55-city-audio.js — urban ambience, traffic pass-by, pedestrians */

let cityAmbGain, cityBedGain, cityBedFilt, cityCrowdGain, cityCrowdFilt;
let cityEngineSlots = [];
let cityAmbSmooth = 0, cityHornTimer = 0, cityFootstepTimer = 0, cityChatterTimer = 0;

function cityListenerPos(){
  const px = typeof focusX !== "undefined" ? focusX : (mode === "car" ? car.x : ped.x);
  const py = typeof focusY !== "undefined" ? focusY : (mode === "car" ? car.y : ped.y);
  return {x: px, y: py};
}

function cityDensityAt(x, y){
  if(typeof cellAt !== "function" || typeof biomeOf !== "function") return 0;
  const k = cellAt(x, y);
  if(biomeOf(k[0], k[1]) !== "city") return 0;
  if(typeof cityZone !== "function") return 0.5;
  const z = cityZone(k[0], k[1]);
  if(z === "downtown") return 1;
  if(z === "midrise") return 0.88;
  if(z === "suburb") return 0.5;
  return 0.35;
}

function countNearbyPeds(px, py, r){
  if(typeof peds === "undefined") return 0;
  let n = 0;
  const r2 = r * r;
  for(const p of peds){
    if(p.state === "down" || p.state === "dying") continue;
    const dx = p.x - px, dy = p.y - py;
    if(dx * dx + dy * dy < r2) n++;
  }
  return n;
}

function countNearbyTraffic(px, py, r){
  if(typeof traffic === "undefined") return 0;
  let n = 0;
  const r2 = r * r;
  for(const c of traffic){
    if(c.dead) continue;
    const dx = c.x - px, dy = c.y - py;
    if(dx * dx + dy * dy < r2) n++;
  }
  return n;
}

function initCityAudio(){
  if(!actx || cityAmbGain) return;
  cityAmbGain = actx.createGain();
  cityAmbGain.gain.value = 0;
  cityAmbGain.connect(master);

  const bedLen = actx.sampleRate * 4;
  const bedBuf = actx.createBuffer(1, bedLen, actx.sampleRate);
  const bd = bedBuf.getChannelData(0);
  let pink = 0;
  for(let i = 0; i < bedLen; i++){
    const w = Math.random() * 2 - 1;
    pink = pink * 0.97 + w * 0.03;
    bd[i] = pink * 4 + w * 0.08;
  }
  const bedSrc = actx.createBufferSource();
  bedSrc.buffer = bedBuf;
  bedSrc.loop = true;
  cityBedFilt = actx.createBiquadFilter();
  cityBedFilt.type = "lowpass";
  cityBedFilt.frequency.value = 280;
  cityBedGain = actx.createGain();
  cityBedGain.gain.value = 0;
  bedSrc.connect(cityBedFilt);
  cityBedFilt.connect(cityBedGain);
  cityBedGain.connect(cityAmbGain);
  bedSrc.start();

  const crowdLen = actx.sampleRate * 3;
  const crowdBuf = actx.createBuffer(1, crowdLen, actx.sampleRate);
  const cd = crowdBuf.getChannelData(0);
  for(let i = 0; i < crowdLen; i++) cd[i] = Math.random() * 2 - 1;
  const crowdSrc = actx.createBufferSource();
  crowdSrc.buffer = crowdBuf;
  crowdSrc.loop = true;
  cityCrowdFilt = actx.createBiquadFilter();
  cityCrowdFilt.type = "bandpass";
  cityCrowdFilt.frequency.value = 520;
  cityCrowdFilt.Q.value = 0.45;
  cityCrowdGain = actx.createGain();
  cityCrowdGain.gain.value = 0;
  crowdSrc.connect(cityCrowdFilt);
  cityCrowdFilt.connect(cityCrowdGain);
  cityCrowdGain.connect(cityAmbGain);
  crowdSrc.start();

  for(let i = 0; i < 8; i++){
    const osc = actx.createOscillator();
    osc.type = "sawtooth";
    const osc2 = actx.createOscillator();
    osc2.type = "sawtooth";
    osc2.detune.value = 7 + i * 3;
    const filt = actx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 400;
    const gain = actx.createGain();
    gain.gain.value = 0;
    const pan = actx.createStereoPanner();
    pan.pan.value = 0;
    osc.connect(filt);
    osc2.connect(filt);
    filt.connect(gain);
    gain.connect(pan);
    pan.connect(cityAmbGain);
    osc.start();
    osc2.start();
    cityEngineSlots.push({osc, osc2, filt, gain, pan});
  }
}

function playCityPedFootstep(vol, pan){
  if(!actx || !audioOn || !cityAmbGain) return;
  const t0 = actx.currentTime;
  const dur = 0.04;
  const len = Math.max(1, (actx.sampleRate * dur) | 0);
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = actx.createBufferSource();
  src.buffer = buf;
  const f = actx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 900 + Math.random() * 400;
  f.Q.value = 0.8;
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  const p = actx.createStereoPanner();
  p.pan.value = clamp(pan, -0.9, 0.9);
  src.connect(f);
  f.connect(g);
  g.connect(p);
  p.connect(cityAmbGain);
  src.start(t0);
}

function playCityChatter(vol){
  if(!actx || !audioOn || !cityAmbGain) return;
  const t0 = actx.currentTime;
  const dur = 0.35 + Math.random() * 0.25;
  const len = Math.max(1, (actx.sampleRate * dur) | 0);
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  let env = 0;
  for(let i = 0; i < len; i++){
    env = env * 0.992 + (Math.random() * 2 - 1) * 0.08;
    d[i] = env * (0.7 + 0.3 * Math.sin(i * 0.03));
  }
  const src = actx.createBufferSource();
  src.buffer = buf;
  const f = actx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 400 + Math.random() * 350;
  f.Q.value = 0.5;
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(cityAmbGain);
  src.start(t0);
}

function playDistantHorn(vol, pan){
  if(!actx || !audioOn) return;
  initCityAudio();
  const out = cityAmbGain || master;
  const t0 = actx.currentTime;
  const dur = 0.5 + Math.random() * 0.35;
  const f = actx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900 + Math.random() * 200;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.05);
  g.gain.setValueAtTime(vol * 0.85, t0 + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  const p = actx.createStereoPanner();
  p.pan.value = clamp(pan, -0.85, 0.85);
  f.connect(g);
  g.connect(p);
  p.connect(out);
  const base = [280, 355, 420][(Math.random() * 3) | 0];
  for(const fr of [base, base * 1.22]){
    const o = actx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = fr;
    const og = actx.createGain();
    og.gain.value = 0.35;
    o.connect(og);
    og.connect(f);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
}

function playWorldHorn(x, y){
  initAudio();
  if(!actx || !audioOn) return;
  const ax = mode === "car" ? car.x : ped.x;
  const ay = mode === "car" ? car.y : ped.y;
  const dist = Math.hypot(x - ax, y - ay);
  const vol = Math.max(0.04, 0.2 * Math.max(0, 1 - dist / 900));
  const pan = clamp((x - ax) / 500, -1, 1);
  playDistantHorn(vol, pan);
}

function updateCityTrafficEngines(px, py, density, dt){
  if(!cityEngineSlots.length || typeof traffic === "undefined") return;
  const candidates = [];
  for(const c of traffic){
    if(c.dead || (c.state !== "drive" && c.state !== "loose")) continue;
    const sp = Math.hypot(c.vx, c.vy);
    if(sp < 12) continue;
    const dx = c.x - px;
    const dist = Math.hypot(dx, c.y - py);
    if(dist > 520) continue;
    candidates.push({c, dist, sp, pan: clamp(dx / 420, -1, 1)});
  }
  candidates.sort((a, b) => a.dist - b.dist);

  for(let i = 0; i < cityEngineSlots.length; i++){
    const slot = cityEngineSlots[i];
    const hit = candidates[i];
    if(!hit){
      slot.gain.gain.value += (0 - slot.gain.gain.value) * Math.min(1, 8 * dt);
      continue;
    }
    const moto = hit.c.kind === "moto";
    const bike = hit.c.kind === "bike";
    const base = bike ? 0 : (moto ? 75 : 52);
    const freq = base + hit.sp * (moto ? 0.22 : 0.14);
    const vol = (bike ? 0.008 : 0.018) * density * Math.max(0, 1 - hit.dist / 520) * Math.min(1, hit.sp / 80);
    slot.osc.frequency.value = freq;
    slot.osc2.frequency.value = freq * 1.008;
    slot.filt.frequency.value = 180 + hit.sp * 1.4 + (moto ? 200 : 0);
    slot.pan.pan.value = hit.pan;
    slot.gain.gain.value += (vol - slot.gain.gain.value) * Math.min(1, 6 * dt);
  }
}

function updateCityAudio(dt){
  if(!actx) return;
  initCityAudio();
  if(!cityAmbGain) return;
  const playing = typeof gamePhase === "undefined" || gamePhase === "playing";
  if(!playing || mode === "inside"){
    cityAmbGain.gain.value += (0 - cityAmbGain.gain.value) * Math.min(1, 4 * dt);
    return;
  }

  const {x: px, y: py} = cityListenerPos();
  const density = cityDensityAt(px, py);
  const forest = typeof playerInForest === "function" && playerInForest();
  const targetAmb = forest ? 0 : density;
  cityAmbSmooth += (targetAmb - cityAmbSmooth) * Math.min(1, 2.5 * dt);
  cityAmbGain.gain.value = cityAmbSmooth * (audioOn ? 1 : 0);
  if(cityAmbSmooth < 0.02) return;

  const rainDuck = 1 - (typeof weatherI !== "undefined" ? weatherI : 0) * 0.45;
  const pedNear = countNearbyPeds(px, py, 340);
  const trafficNear = countNearbyTraffic(px, py, 400);

  const bedVol = (0.014 + trafficNear * 0.0025) * cityAmbSmooth * rainDuck;
  cityBedGain.gain.value += (bedVol - cityBedGain.gain.value) * Math.min(1, 3 * dt);
  cityBedFilt.frequency.value = 200 + cityAmbSmooth * 120 + trafficNear * 8;

  const crowdVol = (0.01 + pedNear * 0.0038) * cityAmbSmooth * rainDuck * (0.82 + 0.18 * Math.sin(performance.now() * 0.0012));
  cityCrowdGain.gain.value += (crowdVol - cityCrowdGain.gain.value) * Math.min(1, 2.5 * dt);
  cityCrowdFilt.frequency.value = 380 + pedNear * 18 + Math.sin(performance.now() * 0.0008) * 60;

  updateCityTrafficEngines(px, py, cityAmbSmooth, dt);

  cityHornTimer -= dt;
  if(cityHornTimer <= 0 && cityAmbSmooth > 0.45){
    cityHornTimer = rand(6, 18) / (0.5 + cityAmbSmooth * 0.8);
    if(Math.random() < 0.55 + cityAmbSmooth * 0.25){
      playDistantHorn(0.025 + cityAmbSmooth * 0.02, (Math.random() - 0.5) * 1.6);
    }
  }

  cityFootstepTimer -= dt;
  if(cityFootstepTimer <= 0 && pedNear > 0 && typeof peds !== "undefined"){
    cityFootstepTimer = rand(0.35, 1.1) / Math.sqrt(1 + pedNear * 0.15);
    const p = peds[(Math.random() * peds.length) | 0];
    if(p && p.state !== "down" && p.state !== "dying"){
      const dx = p.x - px;
      const dist = Math.hypot(dx, p.y - py);
      if(dist < 280) playCityPedFootstep(0.02 + Math.random() * 0.015, clamp(dx / 260, -1, 1));
    }
  }

  cityChatterTimer -= dt;
  if(cityChatterTimer <= 0 && pedNear > 2){
    cityChatterTimer = rand(2.5, 7) / (0.6 + pedNear * 0.08);
    if(Math.random() < 0.7) playCityChatter(0.018 + pedNear * 0.002);
  }
}

window.playWorldHorn = playWorldHorn;
window.playDistantHorn = playDistantHorn;

Game.register({
  id: "city-audio",
  order: 55,
  update(dt){
    updateCityAudio(dt);
  },
});
