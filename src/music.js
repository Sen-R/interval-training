// Pure helpers: no DOM, no audio. Easy to reason about and reuse.

// Resolve after `ms` milliseconds. Shared so the bundle has a single
// definition (duplicate top-level consts would collide once inlined).
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NAME_TO_SEMITONE = {
  C: 0, "C#": 1, DB: 1, D: 2, "D#": 3, EB: 3, E: 4, F: 5,
  "F#": 6, GB: 6, G: 7, "G#": 8, AB: 8, A: 9, "A#": 10, BB: 10, B: 11,
};

// "C4" / "F#3" / "Eb5" -> MIDI number (C4 = 60, middle C).
export function noteNameToMidi(name) {
  const m = /^([A-Ga-g][#b]?)(-?\d+)$/.exec(name.trim());
  if (!m) throw new Error(`Bad note name: ${name}`);
  const letter = m[1].toUpperCase();
  const octave = parseInt(m[2], 10);
  const semitone = NAME_TO_SEMITONE[letter];
  if (semitone === undefined) throw new Error(`Bad note name: ${name}`);
  return semitone + (octave + 1) * 12;
}

// MIDI number -> "C4". Uses sharps only (good enough for display).
export function midiToName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}

// MIDI number -> frequency in Hz (equal temperament, A4 = 440).
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Inclusive random integer in [min, max].
export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

// Pick one item from `items` with probability proportional to weightFn(item).
export function weightedChoice(items, weightFn) {
  const total = items.reduce((sum, it) => sum + weightFn(it), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightFn(it);
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

// A sample from a normal distribution (Box–Muller). Used to bias the root
// pitch toward a centre while occasionally straying higher/lower.
export function randNormal(mean, stdDev) {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Rotate a chord's offsets into its k-th inversion: move the lowest note(s) up
// an octave, then re-base so the new bottom note is 0. Note count is unchanged.
//   [0,4,7] --invert 1--> [3,8,12 -> 0,3,8]   (first inversion)
export function invert(offsets, k) {
  let res = offsets.slice();
  for (let n = 0; n < k; n++) {
    const bottom = res[0];
    res = res.slice(1).concat(bottom + 12);
    const base = res[0];
    res = res.map((o) => o - base);
  }
  return res;
}
