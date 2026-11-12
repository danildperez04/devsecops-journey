// Synthesizes the trailer soundtrack (music + SFX) into assets/soundtrack.wav.
// Pure Node, no dependencies, fully deterministic. 120 BPM: one beat = 0.5 s.
// Cue times mirror the scene timeline in ../index.html.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const DUR = 32;
const N = SR * DUR;
const TAU = Math.PI * 2;

const bus = () => [new Float32Array(N), new Float32Array(N)];
const dry = bus(); // straight to master
const wet = bus(); // sent through reverb
const dly = bus(); // sent through ping-pong delay

let seed = 0x9e3779b9;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;

// Render `len` seconds starting at `t0`; fn(t, i) returns a mono sample.
function put(target, t0, len, fn, gain = 1, pan = 0) {
  const start = Math.round(t0 * SR);
  const count = Math.round(len * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < count; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= N) continue;
    const s = fn(i / SR, i);
    target[0][idx] += s * gl;
    target[1][idx] += s * gr;
  }
}

const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const sq = (ph) => (ph - Math.floor(ph) < 0.5 ? 1 : -1);
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Chamberlin state-variable filter; returns { lp, bp, hp } per sample.
function svf() {
  let low = 0;
  let band = 0;
  return (x, fc, q = 0.5) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6.5)) / SR);
    low += f * band;
    const high = x - low - q * band;
    band += f * high;
    return { lp: low, bp: band, hp: high };
  };
}

/* ---------- instruments ---------- */

function kick(t0, gain = 1) {
  let ph = 0;
  put(dry, t0, 0.45, (t) => {
    const f = 42 + 130 * Math.exp(-t * 32);
    ph += f / SR;
    const body = Math.sin(TAU * ph) * Math.exp(-t * 7.5);
    const click = noise() * Math.exp(-t * 400) * 0.35;
    return Math.tanh((body + click) * 1.8);
  }, gain * 0.95);
}

function clap(t0, gain = 1) {
  const f = svf();
  const fn = (t) => {
    let env = 0;
    for (const o of [0, 0.011, 0.023]) if (t >= o) env += Math.exp(-(t - o) * 130);
    env = env * 0.5 + Math.exp(-t * 16) * 0.6;
    return f(noise(), 1700, 0.9).bp * env;
  };
  put(dry, t0, 0.35, fn, gain * 0.55);
  put(wet, t0, 0.35, fn, gain * 0.25);
}

function hat(t0, gain = 1, open = false, pan = 0.25) {
  const f = svf();
  put(dry, t0, open ? 0.2 : 0.06, (t) => f(noise(), 8500, 0.7).hp * Math.exp(-t * (open ? 22 : 90)), gain * 0.22, pan);
}

function bassNote(t0, len, freq, gain = 1) {
  const f = svf();
  let ph = 0;
  put(dry, t0, len, (t) => {
    ph += freq / SR;
    const osc = saw(ph) * 0.6 + sq(ph * 0.5) * 0.35 + Math.sin(TAU * ph * 0.5) * 0.5;
    const env = Math.min(1, t * 400) * Math.exp(-t * 5) * Math.min(1, (len - t) * 200);
    return f(osc, 180 + 1500 * Math.exp(-t * 16), 0.45).lp * env;
  }, gain * 0.5);
}

function pluck(t0, freq, gain = 1, pan = 0) {
  const f = svf();
  let ph = 0;
  const fn = (t) => {
    ph += freq / SR;
    const osc = saw(ph) * 0.5 + saw(ph * 1.007) * 0.5;
    return f(osc, 500 + 5200 * Math.exp(-t * 20), 0.5).lp * Math.min(1, t * 900) * Math.exp(-t * 11);
  };
  put(dry, t0, 0.4, fn, gain * 0.2, pan);
  put(dly, t0, 0.4, fn, gain * 0.16, pan);
}

function lead(t0, len, freq, gain = 1) {
  const f = svf();
  let ph = 0;
  const fn = (t) => {
    const vib = 1 + 0.004 * Math.sin(TAU * 5.5 * t);
    ph += (freq * vib) / SR;
    const osc = saw(ph) * 0.45 + saw(ph * 1.006) * 0.35 + sq(ph * 2) * 0.12;
    const env = Math.min(1, t * 120) * Math.min(1, (len - t) * 30);
    return f(osc, 1400 + 2600 * Math.exp(-t * 6), 0.6).lp * env;
  };
  put(dry, t0, len, fn, gain * 0.17);
  put(dly, t0, len, fn, gain * 0.12);
  put(wet, t0, len, fn, gain * 0.1);
}

function pad(t0, len, notes, gain = 1, attack = 0.8, release = 1.2) {
  notes.forEach((n, k) => {
    const f = svf();
    const fr = midi(n);
    let p1 = rnd();
    let p2 = rnd();
    let p3 = rnd();
    const fn = (t) => {
      p1 += fr / SR;
      p2 += (fr * 1.0058) / SR;
      p3 += (fr * 0.9945) / SR;
      const env = Math.min(1, t / attack) * Math.min(1, (len - t) / release);
      const cut = 500 + 900 * (0.5 + 0.5 * Math.sin(TAU * 0.11 * t + k));
      return f((saw(p1) + saw(p2) + saw(p3)) / 3, cut, 0.7).lp * env;
    };
    const pan = (k / Math.max(1, notes.length - 1)) * 1.2 - 0.6;
    put(dry, t0, len, fn, gain * 0.1, pan);
    put(wet, t0, len, fn, gain * 0.12, pan);
  });
}

function impact(t0, gain = 1, dirt = 0) {
  let ph = 0;
  const f = svf();
  const boom = (t) => {
    ph += (30 + 75 * Math.exp(-t * 9)) / SR;
    const s = Math.sin(TAU * ph) * Math.exp(-t * 2.4);
    return Math.tanh(s * (2.2 + dirt * 6));
  };
  const crash = (t) => f(noise(), 300 + 6000 * Math.exp(-t * 5), 0.8).lp * Math.exp(-t * 4.5);
  put(dry, t0, 2.2, boom, gain * 0.85);
  put(dry, t0, 1.6, crash, gain * 0.4);
  put(wet, t0, 1.6, crash, gain * 0.5);
}

function riser(t0, len, gain = 1) {
  const f = svf();
  let ph = 0;
  const fn = (t) => {
    const k = t / len;
    ph += (110 * Math.pow(2, k * k * 3)) / SR;
    const tone = saw(ph) * 0.25 * k;
    const trem = 1 - 0.35 * (0.5 + 0.5 * Math.sin(TAU * (4 + 20 * k * k) * t));
    return (f(noise(), 400 + 9000 * k * k, 0.35).bp * 0.9 + tone) * k * k * trem;
  };
  put(dry, t0, len, fn, gain * 0.5);
  put(wet, t0, len, fn, gain * 0.35);
}

// Noise sweep peaking at t0 (the cut), then tailing off.
function whoosh(t0, gain = 1, pan = 0) {
  const f = svf();
  const pre = 0.28;
  put(dry, t0 - pre, 0.5, (t) => {
    const x = t - pre;
    const env = x < 0 ? Math.exp(x * 16) : Math.exp(-x * 20);
    return f(noise(), 700 + 5200 * Math.exp(-Math.abs(x) * 9), 0.4).bp * env;
  }, gain * 0.5, pan);
}

function blip(t0, freq, gain = 1) {
  const fn = (t) => (Math.sin(TAU * freq * t) + 0.4 * Math.sin(TAU * freq * 2 * t)) * Math.exp(-t * 26);
  put(dry, t0, 0.25, fn, gain * 0.16);
  put(dly, t0, 0.25, fn, gain * 0.12);
}

function keyClick(t0) {
  const f = svf();
  const tone = 1700 + rnd() * 1500;
  put(dry, t0, 0.04, (t) => f(noise(), tone, 0.5).bp * Math.exp(-t * 190) + Math.sin(TAU * 190 * t) * Math.exp(-t * 110) * 0.5,
    0.34 + rnd() * 0.12, rnd() * 0.5 - 0.25);
}

function errorBuzz(t0) {
  let ph = 0;
  put(dry, t0, 0.42, (t) => {
    ph += 98 / SR;
    const gate = t < 0.15 || (t > 0.2 && t < 0.42) ? 1 : 0;
    return Math.tanh((sq(ph) + sq(ph * 1.5) * 0.6) * 1.5) * gate;
  }, 0.24);
}

function glitch(t0, len, gain = 1) {
  let held = 0;
  let step = 1;
  let c = 0;
  put(dry, t0, len, (t, i) => {
    if (c-- <= 0) {
      step = 3 + Math.floor(rnd() * 50);
      c = 300 + Math.floor(rnd() * 1600);
    }
    if (i % step === 0) held = noise();
    const gate = Math.floor(t * 24) % 3 === 1 ? 0 : 1;
    return held * gate;
  }, gain * 0.24);
}

function subDrop(t0, len, gain = 1) {
  let ph = 0;
  put(dry, t0, len, (t) => {
    ph += (72 * Math.exp(-t * 0.9) + 26) / SR;
    return Math.sin(TAU * ph) * Math.exp(-t * 1.1);
  }, gain * 0.7);
}

function drone(t0, len, gain = 1) {
  const f = svf();
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  const fn = (t) => {
    p1 += 55 / SR;
    p2 += 55.4 / SR;
    p3 += 82.41 / SR;
    const env = Math.min(1, t / 1.5) * Math.min(1, (len - t) / 0.3);
    const cut = 160 + 500 * (t / len) ** 2 + 60 * Math.sin(TAU * 0.3 * t);
    return f(saw(p1) + saw(p2) + saw(p3) * 0.5, cut, 0.5).lp * env + Math.sin(TAU * p1 * 0.5) * env * 0.5;
  };
  put(dry, t0, len, fn, gain * 0.3);
  put(wet, t0, len, fn, gain * 0.2);
}

/* ---------- arrangement ---------- */

const BEAT = 0.5;
// One chord per 2 s bar: Am, F, C, G.
const CHORDS = [
  { root: 33, tones: [57, 60, 64, 69, 72] },
  { root: 29, tones: [53, 57, 60, 65, 69] },
  { root: 36, tones: [55, 60, 64, 67, 72] },
  { root: 31, tones: [55, 59, 62, 67, 71] },
];
const chordAt = (t) => CHORDS[Math.floor((t - 8) / 2) % 4];

function groove(from, to, { arp = true, energy = 1 } = {}) {
  for (let t = from; t < to - 1e-6; t += BEAT / 4) {
    const step = Math.round((t - from) / (BEAT / 4));
    const s16 = step % 4;
    const beat = Math.floor(step / 4);
    const ch = chordAt(t);
    if (s16 === 0) kick(t);
    if (s16 === 0 && beat % 2 === 1) clap(t);
    if (s16 === 2) hat(t, 1, true);
    else if (s16 !== 0) hat(t, 0.55);
    // Bass ducks out of the kick's way: off-beat sixteenths only.
    if (s16 !== 0) bassNote(t, BEAT / 4, midi(ch.root + (s16 === 3 ? 12 : 0)), s16 === 2 ? 1 : 0.8);
    if (arp) {
      const order = [0, 2, 1, 3, 2, 4, 3, 1];
      pluck(t, midi(ch.tones[order[step % 8]] + 12), 0.9 * energy, step % 2 ? 0.45 : -0.45);
    }
  }
}

// 0–4  terminal cold open
drone(0, 8.05);
const typed = [];
for (let i = 0; i < 8; i++) typed.push(0.4 + i * 0.07); // "$ whoami"
for (let i = 0; i < 22; i++) typed.push(1.5 + i * 0.05); // "$ sudo proteger --todo"
typed.forEach(keyClick);
blip(1.1, 880, 0.9);
errorBuzz(2.8);
glitch(3.3, 0.7, 1);

// 4–8  the three questions
impact(4, 0.8);
impact(5, 0.85);
impact(6, 1, 0.5);
glitch(6, 0.25, 0.8);
riser(6.4, 1.6, 1);
for (let i = 0; i < 8; i++) clap(7 + i * 0.125, 0.3 + i * 0.07);

// 8–10 title drop, 10–19 phase montage
impact(8, 1.1);
groove(8, 19);
pad(8, 11, [57, 64, 69, 72], 0.55, 0.3, 0.6);
const scale = [69, 71, 72, 74, 76, 77, 79, 81, 84];
for (let k = 0; k < 9; k++) {
  whoosh(10 + k, 0.9, k % 2 ? 0.5 : -0.5);
  blip(10 + k, midi(scale[k] + 12), 1);
}
riser(18, 1, 0.6);

// 19–23 build / protect / attack
impact(19, 1);
impact(20, 1);
impact(21, 1.15, 1);
glitch(21, 0.45, 1);
pad(19, 4, [45, 52, 57, 60], 0.9, 0.05, 0.4);
riser(21.6, 1.4, 1);
for (let i = 0; i < 16; i++) clap(22 + i * 0.0625, 0.2 + i * 0.045);

// 23–27 stats: full drop with lead
impact(23, 1);
groove(23, 27, { energy: 1.1 });
const melody = [76, 79, 81, 79, 77, 81, 84, 81, 79, 76, 79, 84, 83, 79, 86, 83];
melody.forEach((n, i) => lead(23 + i * 0.25, 0.24, midi(n), 1));
for (let k = 0; k < 4; k++) whoosh(23 + k, 0.8, k % 2 ? -0.5 : 0.5);
riser(26.2, 0.8, 0.7);

// 27–32 decision and end card
impact(27, 1.1);
pad(27, 2.2, [45, 57, 60, 64, 69], 1.1, 0.05, 0.4);
riser(28, 1, 1);
impact(29, 1.25, 0.3);
subDrop(29, 3, 1);
pad(29, 3, [45, 57, 64, 69, 72, 76], 1.2, 0.02, 2.2);
[0, 1, 2, 3, 4].forEach((k) => blip(29.25 + k * 0.125, midi([69, 72, 76, 81, 88][k]), 0.9));

/* ---------- effects + master ---------- */

function reverb(src) {
  const out = bus();
  const combs = [[1557, 1617, 1491, 1422], [1583, 1643, 1513, 1447]];
  const aps = [[225, 556], [248, 579]];
  for (let c = 0; c < 2; c++) {
    const acc = new Float32Array(N);
    for (const d of combs[c]) {
      const buf = new Float32Array(d);
      let lpf = 0;
      for (let i = 0, p = 0; i < N; i++, p = (p + 1) % d) {
        const y = buf[p];
        lpf += 0.35 * (y - lpf);
        buf[p] = src[c][i] + lpf * 0.84;
        acc[i] += y * 0.25;
      }
    }
    for (const d of aps[c]) {
      const buf = new Float32Array(d);
      for (let i = 0, p = 0; i < N; i++, p = (p + 1) % d) {
        const b = buf[p];
        const y = -acc[i] + b;
        buf[p] = acc[i] + b * 0.5;
        acc[i] = y;
      }
    }
    out[c] = acc;
  }
  return out;
}

function pingPong(src) {
  const out = bus();
  const d = Math.round(SR * 0.375); // dotted eighth at 120 BPM
  for (let i = d; i < N; i++) {
    const inp = (src[0][i - d] + src[1][i - d]) * 0.5;
    out[0][i] = inp + out[1][i - d] * 0.45;
    out[1][i] = out[0][i - d] * 0.45;
  }
  return out;
}

const rv = reverb(wet);
const pp = pingPong(dly);
const master = bus();
let peak = 0;
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.05) * Math.min(1, Math.max(0, (DUR - 0.05 - t) / 1.6));
    const s = Math.tanh((dry[c][i] + rv[c][i] * 0.9 + pp[c][i] * 0.8) * 1.25) * fade;
    master[c][i] = s;
    peak = Math.max(peak, Math.abs(s));
  }
}

const norm = 0.6 / peak; // ≈ -13 LUFS integrated, social-friendly headroom
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(master[0][i] * norm * 32767), i * 4);
  data.writeInt16LE(Math.round(master[1][i] * norm * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "soundtrack.wav");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.concat([header, data]));
console.log(`wrote ${outPath} (${DUR}s, peak ${peak.toFixed(3)})`);
