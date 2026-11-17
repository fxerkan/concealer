// Original background track for the concealer films, synthesised from scratch (no samples, no licence questions).
// One continuous 125 s piece, longer than every cut, so a film never loops or stacks a second track.
// 100 BPM, A minor: Am – F – C – G. Writes a stereo 16-bit WAV; ffmpeg adds space + limiting → public/music/concealer-bed.mp3
//   npm run music
import { writeFileSync } from "node:fs";

const SR = 44100, LEN = 125, N = SR * LEN;
const BEAT = 60 / 100, BAR = 4 * BEAT;
const L = new Float32Array(N), R = new Float32Array(N);
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan) * 0.5 + v * 0.5; R[i] += v * (1 + pan) * 0.5 + v * 0.5; } };

// chords as MIDI notes, two bars each
const CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]];
const chordAt = (t) => CH[Math.floor(t / (2 * BAR)) % 4];

// arrangement (seconds): drums in after the intro, a breakdown in the middle, a soft tail at the end
const drums = (t) => (t >= 9.6 && t < 67.2) || (t >= 76.8 && t < 117.6);
const bassOn = (t) => t >= 9.6 && t < 117.6;
const arpGain = (t) => (t < 4.8 ? t / 4.8 : t > 117.6 ? Math.max(0, 1 - (t - 117.6) / 4) : 1);

// sidechain envelope from the kick, so the pad breathes with the beat
const duck = (t) => {
  if (!drums(t)) return 1;
  const ph = (t % BEAT) / BEAT;
  return 0.55 + 0.45 * Math.min(1, ph * 3.2);
};

// pad: detuned additive saws, slow swell per chord
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const cpos = (t % (2 * BAR)) / (2 * BAR);
  const env = Math.min(1, cpos * 6) * Math.min(1, (1 - cpos) * 10 + 0.35);
  const master = Math.min(1, t / 3) * (t > 120 ? Math.max(0, 1 - (t - 120) / 5) : 1);
  let l = 0, r = 0;
  for (const m of chordAt(t)) {
    const f = hz(m);
    for (let h = 1; h <= 5; h++) {
      const a = 1 / (h * h * 0.8 + 0.2);
      l += a * Math.sin(2 * Math.PI * f * h * 0.9983 * t);
      r += a * Math.sin(2 * Math.PI * f * h * 1.0017 * t + 0.7);
    }
  }
  const g = 0.028 * env * master * duck(t);
  L[i] += l * g; R[i] += r * g;
}

// arpeggio: 16th-note plucks over two octaves, pattern changes every 16 bars, ping-pong delay
const PATS = [[0, 1, 2, 3, 2, 1, 2, 3], [0, 2, 1, 3, 2, 4, 3, 1], [0, 1, 3, 2, 4, 3, 5, 4]];
const pluck = (start, f, amp, pan) => {
  const n = Math.floor(0.5 * SR), i0 = Math.floor(start * SR);
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const e = Math.exp(-t * 9) * Math.min(1, t * 400);
    const v = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 20)) * e * amp;
    for (const [d, g, p] of [[0, 1, pan], [0.45, 0.32, -pan], [0.9, 0.12, pan]]) add(i0 + k + Math.floor(d * SR), v * g, p);
  }
};
const S16 = BEAT / 4;
for (let s = 0; s * S16 < 122; s++) {
  const t = s * S16;
  const pat = PATS[Math.floor(t / (16 * BAR)) % PATS.length];
  const ch = chordAt(t);
  const idx = pat[s % 8];
  const m = ch[idx % 4] + 12 * (Math.floor(idx / 4) + 1);
  const accent = s % 4 === 0 ? 1 : 0.7;
  pluck(t, hz(m), 0.06 * accent * arpGain(t), s % 2 ? 0.35 : -0.35);
}

// bass: 8th notes on the root, a soft sine with a little grit
for (let s = 0; s * (BEAT / 2) < 122; s++) {
  const t = s * (BEAT / 2);
  if (!bassOn(t)) continue;
  const f = hz(chordAt(t)[0] - 12);
  const i0 = Math.floor(t * SR), n = Math.floor(0.28 * SR);
  for (let k = 0; k < n; k++) {
    const u = k / SR;
    const e = Math.exp(-u * 7) * Math.min(1, u * 300);
    add(i0 + k, (Math.sin(2 * Math.PI * f * u) + 0.25 * Math.sin(4 * Math.PI * f * u)) * e * (s % 2 ? 0.07 : 0.1));
  }
}

// drums: soft kick on every beat, offbeat hats, a clap on 2 and 4
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
for (let b = 0; b * BEAT < 122; b++) {
  const t = b * BEAT;
  if (!drums(t)) continue;
  const i0 = Math.floor(t * SR);
  let ph = 0;
  for (let k = 0; k < 0.3 * SR; k++) {
    const u = k / SR;
    ph += (2 * Math.PI * (45 + 75 * Math.exp(-u * 30))) / SR;
    add(i0 + k, Math.sin(ph) * Math.exp(-u * 11) * 0.22);
  }
  let prev = 0;
  const hat = i0 + Math.floor((BEAT / 2) * SR);
  for (let k = 0; k < 0.06 * SR; k++) {
    const x = rnd(), hp = x - prev; prev = x;
    add(hat + k, hp * Math.exp((-k / SR) * 70) * 0.025, 0.3);
  }
  if (b % 2 === 1) {
    for (let k = 0; k < 0.18 * SR; k++) add(i0 + k, rnd() * Math.exp((-k / SR) * 22) * 0.035, -0.2);
  }
}

// normalise and write
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round((L[i] / peak) * 0.89 * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round((R[i] / peak) * 0.89 * 32767), 46 + i * 4);
}
writeFileSync(process.argv[2] ?? "bed.wav", buf);
