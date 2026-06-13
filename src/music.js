// Pure music-theory helpers: no DOM, no audio. Easy to reason about and reuse.

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
