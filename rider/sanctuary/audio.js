/* ── OPEN SOURCE ORCHESTRA · VIRTUAL SANCTUARY · audio engine ──────────────
   Every instrument on the approved Devcon 8 backline, synthesised from
   scratch in the Web Audio API. No samples, no CDN, no trackers.
   CC0 — fork it like crazy. 🍴
   ------------------------------------------------------------------------- */

let AC = null, master = null, verb = null, verbGain = null, comp = null;
export const state = { ready: false, muted: false, loops: {}, drones: {} };

export function ctx() { return AC; }

export function init() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return AC; }
  AC = new (window.AudioContext || window.webkitAudioContext)();
  comp = AC.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 3.2;
  comp.attack.value = 0.004; comp.release.value = 0.22;
  master = AC.createGain(); master.gain.value = 0.85;
  const limiter = AC.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
  limiter.attack.value = 0.001; limiter.release.value = 0.12;
  // convolution-free plate: noise impulse response
  verb = AC.createConvolver();
  verb.buffer = makeIR(2.6, 2.4);
  verbGain = AC.createGain(); verbGain.gain.value = 0.3;
  verb.connect(verbGain); verbGain.connect(comp);
  master.connect(comp); comp.connect(limiter); limiter.connect(AC.destination);
  state.ready = true;
  return AC;
}

function makeIR(seconds, decay) {
  const rate = AC.sampleRate, len = Math.floor(rate * seconds);
  const buf = AC.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - t * 0.2);
    }
  }
  return buf;
}

/* a per-instrument bus: dry gain + reverb send + optional spatial position */
export function bus(sendAmt = 0.25, pos = null, trim = 1) {
  const g = AC.createGain(); g.gain.value = trim;
  const send = AC.createGain(); send.gain.value = sendAmt;
  if (pos) {
    const p = AC.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = 2.4; p.maxDistance = 48; p.rolloffFactor = 1.1;
    p.positionX ? (p.positionX.value = pos[0], p.positionY.value = pos[1], p.positionZ.value = pos[2])
                : p.setPosition(pos[0], pos[1], pos[2]);
    g.connect(p); p.connect(master); g.connect(send);
  } else {
    g.connect(master); g.connect(send);
  }
  send.connect(verb);
  return g;
}

export function setMuted(m) {
  state.muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, AC.currentTime, 0.03);
}

export function listener(pos, fwd) {
  if (!AC) return;
  const L = AC.listener;
  if (L.positionX) {
    L.positionX.value = pos[0]; L.positionY.value = pos[1]; L.positionZ.value = pos[2];
    L.forwardX.value = fwd[0]; L.forwardY.value = fwd[1]; L.forwardZ.value = fwd[2];
    L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
  } else {
    L.setPosition(pos[0], pos[1], pos[2]);
    L.setOrientation(fwd[0], fwd[1], fwd[2], 0, 1, 0);
  }
}

/* ── primitives ────────────────────────────────────────────────────────── */
const noiseCache = {};
function noiseBuf(sec = 1) {
  const k = sec.toFixed(2);
  if (noiseCache[k]) return noiseCache[k];
  const len = Math.floor(AC.sampleRate * sec);
  const b = AC.createBuffer(1, len, AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return (noiseCache[k] = b);
}

function noise(dest, { dur = 0.2, gain = 0.4, type = 'bandpass', f = 2000, q = 1, fEnd = null, t0 = 0 }) {
  const t = AC.currentTime + t0;
  const src = AC.createBufferSource(); src.buffer = noiseBuf(Math.max(0.3, dur + 0.1));
  const flt = AC.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
  if (fEnd) flt.frequency.exponentialRampToValueAtTime(Math.max(40, fEnd), t + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt); flt.connect(g); g.connect(dest);
  src.start(t); src.stop(t + dur + 0.05);
}

function tone(dest, { f = 220, f2 = null, dur = 0.4, gain = 0.3, type = 'sine', t0 = 0, atk = 0.005, curve = 2 }) {
  const t = AC.currentTime + t0;
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur * 0.9);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}

/* Karplus–Strong plucked string.
   SCAR (2026-10-06): the live-graph version (DelayNode → BiquadFilter → feedback
   gain) DIVERGED — measured ×50 growth every 200 ms until it hit Infinity and
   killed the whole audio graph. A biquad inside a Web Audio feedback cycle does
   not behave like its steady-state magnitude response, so "loop gain 0.93" was
   a lie. Fixed by rendering the string offline with a one-zero averaging filter,
   whose gain is provably ≤ 1 at every frequency. Stable by construction. */
const ksCache = new Map();
function ksBuffer(f, dur, bright) {
  const key = Math.round(f * 2) + '|' + dur.toFixed(1) + '|' + bright.toFixed(2);
  if (ksCache.has(key)) return ksCache.get(key);
  const sr = AC.sampleRate;
  const N = Math.max(2, Math.round(sr / f));
  const len = Math.floor(sr * dur);
  const buf = AC.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  // pre-dull the excitation for darker strings
  const pre = 1 - bright;
  for (let p = 0; p < 2; p++)
    for (let i = 0; i < N; i++) ring[i] = ring[i] * (1 - pre * 0.5) + ring[(i + 1) % N] * pre * 0.5;
  const s = 0.5 - bright * 0.28;                    // one-zero mix: lower = brighter
  const loss = Math.pow(0.001, 1 / Math.max(1, dur * f));  // −60 dB across dur
  let idx = 0;
  for (let n = 0; n < len; n++) {
    const cur = ring[idx], nxt = ring[(idx + 1) % N];
    d[n] = cur;
    ring[idx] = (cur * (1 - s) + nxt * s) * loss;
    idx = (idx + 1) % N;
  }
  ksCache.set(key, buf);
  return buf;
}
function pluck(dest, { f = 196, dur = 2.4, gain = 0.5, damp = 3200, bright = 0.5, t0 = 0 }) {
  const t = AC.currentTime + t0;
  const src = AC.createBufferSource();
  src.buffer = ksBuffer(f, dur, Math.max(0.05, Math.min(0.95, bright)));
  const body = AC.createBiquadFilter();            // static, outside any loop
  body.type = 'lowpass'; body.frequency.value = damp; body.Q.value = 0.7;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.82, dur * 0.09);
  src.connect(body); body.connect(g); g.connect(dest);
  src.start(t); src.stop(t + dur + 0.1);
}

/* a single scheduled reed note — sample-accurate, offline-renderable */
function reedNote(dest, { f, gain = 0.12, t0 = 0, dur = 0.45, detune = 0.012 }) {
  const t = AC.currentTime + t0;
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), o3 = AC.createOscillator();
  o1.type = o2.type = 'sawtooth'; o3.type = 'triangle';
  o1.frequency.value = f; o2.frequency.value = f * (1 + detune); o3.frequency.value = f * 2.003;
  const body = AC.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 1700; body.Q.value = 0.8;
  const peak = AC.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 900; peak.gain.value = 5;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.05);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.09);
  o1.connect(body); o2.connect(body); o3.connect(body);
  body.connect(peak); peak.connect(g); g.connect(dest);
  [o1, o2, o3].forEach(o => { o.start(t); o.stop(t + dur + 0.5); });
}

/* a breath-and-vibrato flute note */
function fluteNote(dest, { f, gain = 0.3, t0 = 0, dur = 0.45 }) {
  const t = AC.currentTime + t0;
  const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const h = AC.createOscillator(); h.type = 'sine'; h.frequency.value = f * 2;
  const lfo = AC.createOscillator(), lg = AC.createGain();
  lfo.frequency.value = 5.2; lg.gain.value = f * 0.009; lfo.connect(lg); lg.connect(o.frequency);
  const g = AC.createGain(), hg = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.09);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.12);
  hg.gain.value = 0.05;
  o.connect(g); h.connect(hg); hg.connect(g); g.connect(dest);
  noise(dest, { dur: dur + 0.1, gain: gain * 0.12, type: 'bandpass', f: f * 3, q: 1.5, t0 });
  [o, h, lfo].forEach(x => { x.start(t); x.stop(t + dur + 0.5); });
}

function reedVoice(dest, f, gain, detune) {
  // harmonium / shruti: stacked sawtooth reeds, slow beating, body filter
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), o3 = AC.createOscillator();
  o1.type = o2.type = 'sawtooth'; o3.type = 'triangle';
  o1.frequency.value = f; o2.frequency.value = f * (1 + detune); o3.frequency.value = f * 2.003;
  const lfo = AC.createOscillator(), lfoG = AC.createGain();
  lfo.frequency.value = 4.6 + Math.random(); lfoG.gain.value = f * 0.004;
  lfo.connect(lfoG); lfoG.connect(o1.frequency); lfoG.connect(o2.frequency);
  const body = AC.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 1700; body.Q.value = 0.8;
  const peak = AC.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 900; peak.gain.value = 5;
  const g = AC.createGain(); g.gain.value = 0.0001;
  o1.connect(body); o2.connect(body); o3.connect(body);
  body.connect(peak); peak.connect(g); g.connect(dest);
  [o1, o2, o3, lfo].forEach(o => o.start());
  g.gain.setTargetAtTime(gain, AC.currentTime, 0.25);
  return { stop() { g.gain.setTargetAtTime(0.0001, AC.currentTime, 0.4); setTimeout(() => [o1, o2, o3, lfo].forEach(o => { try { o.stop(); } catch (e) {} }), 1600); } };
}

/* ── the backline ──────────────────────────────────────────────────────── */
const SC = { minor: [0, 2, 3, 5, 7, 8, 10, 12], kafi: [0, 2, 3, 5, 7, 9, 10, 12], pent: [0, 3, 5, 7, 10, 12] };
const n2f = (n) => 440 * Math.pow(2, (n - 69) / 12);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
/* voices are called both as fn(bus) and fn(bus, index) — and the test harness
   hands them a string key. Never let that leak into arithmetic. */
const idx = (i, n) => (Number.isFinite(i) ? Math.abs(Math.floor(i)) % n : Math.floor(Math.random() * n));

/* measured offline, then balanced by ear-equivalent peak targets */
export const TRIM = {
  pa: 3.2, drumkit: 3.6, strat: 1.0, twin: 3.5, taylor: 1.0, bass: 2.0,
  clp785: 0.7, montage: 0.85, impulse: 0.95, drummachine: 1.8,
  djembe: 2.1, cajon: 2.0, congas: 2.5, tambourine: 3.6, kartal: 4.5,
  manjira: 2.1, shruti: 0.5, harmonium: 0.5, tabla: 3.0, bansuri: 0.65,
  dhol: 1.7, kanjira: 3.6, dholak: 2.2, cdj: 1.6, ledtable: 5.0, cables: 2.6,
};

export const TOGGLES = new Set(['drumloop','tablaTheka','bhangra','deckA','deckB','shruti','harmoniumDrone']);

export const voices = {
  /* 1 · Electric drum kit — BOSS/Roland-style pads */
  drumkit(b, i = 0) {
    const seq = [() => { tone(b, { f: 150, f2: 48, dur: 0.34, gain: 0.95, type: 'sine' }); noise(b, { dur: 0.05, gain: 0.25, f: 1200 }); },
                 () => { noise(b, { dur: 0.17, gain: 0.5, f: 1900, q: 0.8 }); tone(b, { f: 210, f2: 170, dur: 0.12, gain: 0.4, type: 'triangle' }); },
                 () => { tone(b, { f: 240, f2: 120, dur: 0.3, gain: 0.55, type: 'sine' }); },
                 () => { noise(b, { dur: 0.06, gain: 0.3, type: 'highpass', f: 7800 }); }];
    seq[idx(i, seq.length)]();
  },
  /* 2 · Fender American Ultra II HSS Strat */
  strat(b) {
    const root = pick([52, 57, 59, 64]);
    [0, 4, 7, 11].forEach((iv, k) => pluck(b, { f: n2f(root + iv), dur: 2.6, gain: 0.34, damp: 4200, bright: 0.75, t0: k * 0.055 }));
  },
  /* 3 · Fender Twin Reverb '65 — the amp's own voice: spring + hum */
  twinreverb(b) {
    noise(b, { dur: 1.9, gain: 0.1, type: 'bandpass', f: 1500, q: 0.6, fEnd: 420 });
    tone(b, { f: 60, dur: 1.6, gain: 0.08, type: 'sine' });
    for (let i = 0; i < 7; i++) noise(b, { dur: 0.22, gain: 0.07, type: 'bandpass', f: 2200 + i * 180, q: 6, t0: 0.03 * i });
  },
  /* 4 · Taylor 214ce Deluxe — dreadnought strum */
  taylor(b) {
    const ch = pick([[50, 57, 62, 66, 69], [55, 62, 67, 71, 74], [48, 55, 60, 64, 67]]);
    ch.forEach((n, k) => pluck(b, { f: n2f(n), dur: 3.4, gain: 0.3, damp: 3000, bright: 0.42, t0: k * 0.028 }));
  },
  /* 5 · Markbass 800 + 104 cab */
  bass(b) {
    const n = pick([31, 33, 36, 38, 40]);
    pluck(b, { f: n2f(n), dur: 1.5, gain: 0.5, damp: 900, bright: 0.2 });
    tone(b, { f: n2f(n) / 2, dur: 0.7, gain: 0.3, type: 'sine' });
  },
  /* 6 · Yamaha CLP-785 — hammered strings, 6 partials */
  clp785(b) {
    const root = pick([48, 53, 55, 60]);
    [0, 7, 12, 16].forEach((iv, v) => {
      const f = n2f(root + iv);
      [1, 2, 3, 4.02, 5.4, 6.8].forEach((h, k) => tone(b, {
        f: f * h, dur: 3.6 / (1 + k * 0.8), gain: 0.22 / (1 + k * 1.5),
        type: k === 0 ? 'triangle' : 'sine', t0: v * 0.045, atk: 0.003,
      }));
      noise(b, { dur: 0.03, gain: 0.05, type: 'highpass', f: 4000, t0: v * 0.045 });
    });
  },
  /* 7 · Yamaha Montage M6 — supersaw + filter sweep */
  montage(b) {
    const root = pick([45, 48, 50]);
    const t = AC.currentTime;
    const flt = AC.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 7;
    flt.frequency.setValueAtTime(260, t);
    flt.frequency.exponentialRampToValueAtTime(5200, t + 0.5);
    flt.frequency.exponentialRampToValueAtTime(400, t + 2.4);
    flt.connect(b);
    [0, 0.07, -0.07, 12, 12.1, 7].forEach((d) => tone(flt, {
      f: n2f(root + d), dur: 2.6, gain: 0.16, type: 'sawtooth', atk: 0.04,
    }));
    tone(b, { f: n2f(root - 12), dur: 2.6, gain: 0.18, type: 'sine', atk: 0.05 });
  },
  /* 8 · Novation Impulse — a controller, so it PLAYS the Montage: arp */
  impulse(b) {
    const root = pick([48, 50, 55]);
    SC.minor.forEach((iv, k) => {
      const flt = AC.createBiquadFilter(); flt.type = 'lowpass';
      flt.frequency.value = 900 + k * 420; flt.Q.value = 5; flt.connect(b);
      tone(flt, { f: n2f(root + iv), dur: 0.26, gain: 0.26, type: 'square', atk: 0.004, t0: k * 0.11 });
    });
  },
  /* 9 · BOSS drum machine — 16-step loop (toggle) */
  drumloop: loopFactory(130, (b, step) => {
    if (step % 4 === 0) voices.drumkit(b, 0);
    if (step === 4 || step === 12) voices.drumkit(b, 1);
    if (step % 2 === 1) noise(b, { dur: 0.04, gain: 0.14, type: 'highpass', f: 8200 });
    if (step === 14) voices.drumkit(b, 2);
  }),
  /* 10 · Remo 12" djembe */
  djembe(b) {
    const slap = Math.random() > 0.5;
    tone(b, { f: slap ? 190 : 96, f2: slap ? 120 : 62, dur: slap ? 0.2 : 0.42, gain: 0.8, type: 'sine' });
    noise(b, { dur: slap ? 0.14 : 0.07, gain: slap ? 0.3 : 0.12, type: 'bandpass', f: slap ? 2600 : 900, q: 1.2 });
  },
  /* 11 · Pearl cajon */
  cajon(b) {
    const bassTone = Math.random() > 0.45;
    tone(b, { f: bassTone ? 86 : 240, f2: bassTone ? 54 : 180, dur: bassTone ? 0.3 : 0.1, gain: 0.7, type: 'sine' });
    noise(b, { dur: bassTone ? 0.05 : 0.11, gain: bassTone ? 0.1 : 0.34, type: 'bandpass', f: bassTone ? 700 : 3300, q: 0.9 });
  },
  /* 12 · LP Matador congas — quinto/conga/tumba */
  congas(b, i) {
    const f = [230, 175, 128][idx(i, 3)];
    tone(b, { f, f2: f * 0.72, dur: 0.33, gain: 0.7, type: 'sine' });
    noise(b, { dur: 0.09, gain: 0.16, type: 'bandpass', f: f * 9, q: 1.6 });
  },
  /* 13 · Meinl tambourine / shakers */
  tambourine(b) {
    for (let i = 0; i < 9; i++) noise(b, {
      dur: 0.12, gain: 0.26, type: 'bandpass', f: 5200 + Math.random() * 4200, q: 4.5, t0: Math.random() * 0.035,
    });
    noise(b, { dur: 0.2, gain: 0.18, type: 'highpass', f: 6500 });
  },
  /* 14 · Kartal — wooden clappers with jingles */
  kartal(b) {
    noise(b, { dur: 0.05, gain: 0.6, type: 'bandpass', f: 1500, q: 1.4 });
    for (let i = 0; i < 4; i++) noise(b, { dur: 0.16, gain: 0.34, type: 'bandpass', f: 4200 + i * 900, q: 5, t0: 0.012 * i });
  },
  /* 15 · Manjira — small bronze cymbals */
  manjira(b) {
    [2630, 3940, 5210, 7300].forEach((f, k) => tone(b, { f, dur: 1.5 - k * 0.2, gain: 0.1, type: 'sine', atk: 0.002 }));
    noise(b, { dur: 0.1, gain: 0.12, type: 'highpass', f: 6000 });
  },
  /* 16 · Shruti box — drone (toggle) */
  shruti: droneFactory([57, 64], 0.004, 0.14),
  /* 17 · Harmonium (Dutta & Co) — drone + hand melody */
  harmonium(b) {
    const root = 57, mel = [0, 2, 3, 5, 7, 5, 3, 2];
    reedNote(b, { f: n2f(root), gain: 0.07, t0: 0, dur: 2.4, detune: 0.008 });   // the hand that never leaves the drone
    mel.forEach((iv, k) => reedNote(b, { f: n2f(root + 12 + iv), gain: 0.13, t0: k * 0.29, dur: 0.3 }));
  },
  harmoniumDrone: droneFactory([45, 52, 57], 0.012, 0.1),
  /* 18 · Tabla — dayan/bayan bols */
  tabla(b, i) {
    const bol = idx(i, 4);
    if (bol === 0) { // na
      tone(b, { f: 640, f2: 620, dur: 0.22, gain: 0.62, type: 'sine', atk: 0.002 });
      noise(b, { dur: 0.05, gain: 0.34, type: 'bandpass', f: 3000, q: 1.6 });
    } else if (bol === 1) { // tin
      [620, 940, 1270].forEach((f, k) => tone(b, { f, dur: 0.7 - k * 0.15, gain: 0.3, type: 'sine' }));
    } else if (bol === 2) { // ghe (bayan, pitch bend)
      tone(b, { f: 150, f2: 92, dur: 0.5, gain: 0.95, type: 'sine' });
    } else { // ta/te
      noise(b, { dur: 0.07, gain: 0.46, type: 'bandpass', f: 2400, q: 1.1 });
      tone(b, { f: 700, dur: 0.1, gain: 0.3, type: 'sine' });
    }
  },
  tablaTheka: loopFactory(104, (b, step) => {
    const t = [0, 3, 0, 1, 2, 3, 0, 1][step % 8];
    if (step % 2 === 0 || Math.random() > 0.6) voices.tabla(b, t);
  }, 8),
  /* 19 · Bansuri — F bass scale, breath + vibrato */
  bansuri(b) {
    const root = 53, phrase = pick([[0, 2, 4, 7, 9], [12, 10, 9, 7, 4], [0, 4, 7, 12, 14]]);
    phrase.forEach((iv, k) => fluteNote(b, { f: n2f(root + 12 + iv), gain: 0.3, t0: k * 0.33, dur: 0.42 }));
  },
  /* 20 · Punjabi bhangra dhol — mango wood, two heads */
  dhol(b, i) {
    const treble = idx(i, 2);
    if (treble) {
      tone(b, { f: 420, f2: 360, dur: 0.14, gain: 0.5, type: 'triangle' });
      noise(b, { dur: 0.07, gain: 0.3, type: 'bandpass', f: 2900, q: 1.1 });
    } else {
      tone(b, { f: 98, f2: 62, dur: 0.44, gain: 1.0, type: 'sine' });
      noise(b, { dur: 0.06, gain: 0.12, type: 'lowpass', f: 400 });
    }
  },
  bhangra: loopFactory(144, (b, step) => {
    const pat = [0, 1, 1, 0, 1, 0, 1, 1];
    if (pat[step % 8] !== undefined) voices.dhol(b, pat[step % 8]);
  }, 8),
  /* 21 · Kanjira — frame drum with one jingle */
  kanjira(b) {
    tone(b, { f: 330, f2: 250, dur: 0.18, gain: 0.45, type: 'sine' });
    for (let i = 0; i < 3; i++) noise(b, { dur: 0.2, gain: 0.1, type: 'bandpass', f: 5000 + i * 1100, q: 9, t0: 0.01 * i });
  },
  /* 22 · Dholak — folk two-headed barrel */
  dholak(b, i) {
    const treble = idx(i, 2);
    if (treble) { tone(b, { f: 520, f2: 480, dur: 0.12, gain: 0.4, type: 'sine' }); noise(b, { dur: 0.05, gain: 0.2, f: 2200, q: 1.5 }); }
    else { tone(b, { f: 120, f2: 80, dur: 0.36, gain: 0.8, type: 'sine' }); }
  },
  /* 23 · CDJ-3000 ×2 + DJM-A9 — a four-on-the-floor loop per deck */
  deckA: loopFactory(126, (b, step) => {
    if (step % 4 === 0) { tone(b, { f: 130, f2: 44, dur: 0.3, gain: 0.95, type: 'sine' }); }
    if (step % 4 === 2) noise(b, { dur: 0.05, gain: 0.2, type: 'highpass', f: 9000 });
    if (step === 6 || step === 14) noise(b, { dur: 0.12, gain: 0.22, type: 'bandpass', f: 1800, q: 0.7 });
    if (step % 2 === 0) tone(b, { f: n2f([33, 33, 36, 40][Math.floor(step / 4) % 4]), dur: 0.22, gain: 0.3, type: 'square' });
  }),
  deckB: loopFactory(126, (b, step) => {
    const sc = [0, 3, 7, 10, 12];
    if (step % 2 === 1) tone(b, { f: n2f(69 + pick(sc)), dur: 0.3, gain: 0.3, type: 'triangle', atk: 0.01 });
    if (step % 8 === 0) noise(b, { dur: 0.9, gain: 0.26, type: 'bandpass', f: 600, q: 0.5, fEnd: 5000 });
  }),
  /* 24 · DJ LED console table — it's furniture: a warm hum + a click */
  console(b) {
    noise(b, { dur: 0.04, gain: 0.18, type: 'bandpass', f: 1100, q: 3 });
    tone(b, { f: 50, dur: 1.2, gain: 0.06, type: 'sine' });
  },
  /* 25 · Cables, signals & accessories — the unglamorous hero */
  cables(b) {
    noise(b, { dur: 0.03, gain: 0.3, type: 'bandpass', f: 2600, q: 4 });
    noise(b, { dur: 0.012, gain: 0.2, type: 'highpass', f: 5000, t0: 0.08 });
    tone(b, { f: 1000, dur: 0.06, gain: 0.07, type: 'sine', t0: 0.14 });
  },
  /* the PA itself — a quick sine sweep soundcheck */
  pa(b) {
    tone(b, { f: 60, f2: 6000, dur: 2.2, gain: 0.12, type: 'sine', atk: 0.2 });
  },
};

/* loop + drone helpers ----------------------------------------------------*/
function loopFactory(bpm, fn, steps = 16) {
  return function (b, key) {
    const id = key || fn.name || String(bpm);
    if (state.loops[id]) { clearInterval(state.loops[id]); delete state.loops[id]; return false; }
    let step = 0;
    const iv = setInterval(() => { fn(b, step % steps); step++; }, (60000 / bpm) / 4);
    fn(b, 0); step = 1;
    state.loops[id] = iv;
    return true;
  };
}
function droneFactory(notes, detune, gain) {
  return function (b, key) {
    const id = key || 'drone' + notes.join('-');
    if (state.drones[id]) { state.drones[id].forEach(v => v.stop()); delete state.drones[id]; return false; }
    state.drones[id] = notes.map(n => reedVoice(b, n2f(n), gain, detune));
    return true;
  };
}
export function stopAll() {
  Object.keys(state.loops).forEach(k => { clearInterval(state.loops[k]); delete state.loops[k]; });
  Object.keys(state.drones).forEach(k => { state.drones[k].forEach(v => v.stop()); delete state.drones[k]; });
}
export function anyRunning() {
  return Object.keys(state.loops).length + Object.keys(state.drones).length;
}


/* ── test harness: render one voice in an OfflineAudioContext ─────────────
   The live-context analyser lies on a slow machine (the main thread stalls and
   short transients fall between polls). Offline rendering is exact. */
export async function renderVoice(name, seconds = 2.2, key) {
  const saved = { AC, master, verb, verbGain, comp, loops: state.loops, drones: state.drones };
  const savedNoise = Object.keys(noiseCache); savedNoise.forEach(k => delete noiseCache[k]);
  ksCache.clear();
  AC = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
  comp = AC.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 3.2;
  master = AC.createGain(); master.gain.value = 0.85;
  verb = AC.createConvolver(); verb.buffer = makeIR(1.6, 2.4);
  verbGain = AC.createGain(); verbGain.gain.value = 0.3;
  verb.connect(verbGain); verbGain.connect(comp);
  master.connect(comp); comp.connect(AC.destination);
  state.loops = {}; state.drones = {};
  let err = null;
  try { const b = bus(0.2); (voices[name] || (() => {}))(b, key || name); }
  catch (e) { err = e.message; }
  const buf = await AC.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0, sum = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
  Object.keys(state.loops).forEach(k => clearInterval(state.loops[k]));
  AC = saved.AC; master = saved.master; verb = saved.verb; verbGain = saved.verbGain; comp = saved.comp;
  state.loops = saved.loops; state.drones = saved.drones;
  Object.keys(noiseCache).forEach(k => delete noiseCache[k]);
  ksCache.clear();
  return { peak: +peak.toFixed(4), rms: +Math.sqrt(sum / d.length).toFixed(4), err };
}
