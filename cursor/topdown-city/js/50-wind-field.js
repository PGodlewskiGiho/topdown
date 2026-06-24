/* TOPDOWN CITY — 50-wind-field.js — przestrzenne pole wiatru + dźwięki pogody */

function windFieldNoise(x, y, t){
  const n1 = smoothNoise(x * 0.0035 + t * 0.11, y * 0.0035);
  const n2 = smoothNoise(x * 0.007 + t * 0.07, y * 0.007 + 41);
  const n3 = smoothNoise(x * 0.0016 - t * 0.04, y * 0.0016 + 17);
  return (n1 * 0.5 + n2 * 0.32 + n3 * 0.18);
}

function windFieldAt(x, y){
  const t = typeof windT !== "undefined" ? windT : 0;
  const e = 14;
  const n = windFieldNoise(x, y, t);
  const nx = windFieldNoise(x + e, y, t) - windFieldNoise(x - e, y, t);
  const ny = windFieldNoise(x, y + e, t) - windFieldNoise(x, y - e, t);
  let fx = nx, fy = ny;
  const fl = Math.hypot(fx, fy) || 1;
  fx /= fl; fy /= fl;
  const base = typeof windAmp !== "undefined" ? windAmp : 0.12;
  const gust = typeof windGust !== "undefined" ? windGust : 0;
  const rain = typeof weatherI !== "undefined" ? weatherI : 0;
  let power = 0.08 + base * 0.55 + gust * 0.35 + rain * 0.18;
  const[ci, cj] = cellAt(x, y);
  const b = biomeOf(ci, cj);
  if(b === "city") power *= 0.72;
  if(b === "forest") power *= 1.12;
  if(b === "desert") power *= 1.18;
  power *= 0.75 + n * 0.5;
  return {fx, fy, power, angle: Math.atan2(fy, fx)};
}

function windFieldPowerAt(x, y){
  return windFieldAt(x, y).power;
}

function applyWindFieldXY(x, y, dt, mult){
  const w = windFieldAt(x, y);
  const m = mult != null ? mult : 1;
  const sp = 12 + w.power * 38;
  return [x + w.fx * sp * m * dt, y + w.fy * sp * m * dt];
}

let weatherWindGain, weatherWindFilt, weatherWindSrc, weatherWindSmooth = 0;
let weatherGustGain, weatherGustSmooth = 0;

function initWeatherWindAudio(){
  if(!actx || weatherWindGain) return;
  const len = actx.sampleRate * 2, buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.85;
  weatherWindSrc = actx.createBufferSource();
  weatherWindSrc.buffer = buf;
  weatherWindSrc.loop = true;
  weatherWindFilt = actx.createBiquadFilter();
  weatherWindFilt.type = "bandpass";
  weatherWindFilt.frequency.value = 380;
  weatherWindFilt.Q.value = 0.5;
  weatherWindGain = actx.createGain();
  weatherWindGain.gain.value = 0;
  weatherGustGain = actx.createGain();
  weatherGustGain.gain.value = 0;
  weatherWindSrc.connect(weatherWindFilt);
  weatherWindFilt.connect(weatherWindGain);
  weatherWindGain.connect(weatherGustGain);
  weatherGustGain.connect(master);
  weatherWindSrc.start();
}

function updateWeatherWindAudio(dt){
  if(!actx) return;
  initWeatherWindAudio();
  if(!weatherWindGain) return;
  const playing = typeof gamePhase === "undefined" || gamePhase === "playing";
  if(!playing){ weatherWindGain.gain.value = 0; return; }
  const px = typeof focusX !== "undefined" ? focusX : ped.x;
  const py = typeof focusY !== "undefined" ? focusY : ped.y;
  const w = windFieldAt(px, py);
  const rain = typeof weatherI !== "undefined" ? weatherI : 0;
  const gust = typeof windGust !== "undefined" ? windGust : 0;
  const target = (0.012 + w.power * 0.09 + rain * 0.04) * (audioOn ? 1 : 0);
  weatherWindSmooth += (target - weatherWindSmooth) * Math.min(1, 2.2 * dt);
  weatherWindGain.gain.value = weatherWindSmooth;
  weatherWindFilt.frequency.value = 220 + w.power * 680 + Math.sin((typeof windT !== "undefined" ? windT : 0) * 0.8) * 90;
  weatherWindFilt.Q.value = 0.38 + w.power * 0.4;
  const gTarget = gust * 0.06 * (0.6 + 0.4 * Math.sin(performance.now() * 0.003));
  weatherGustSmooth += (gTarget - weatherGustSmooth) * Math.min(1, 4 * dt);
  if(weatherGustGain) weatherGustGain.gain.value = 1 + weatherGustSmooth * 8;
}

Game.register({
  id: "wind-field",
  order: 50,
  update(dt){
    updateWeatherWindAudio(dt);
  },
});
