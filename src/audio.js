import { midiToFreq } from "./music.js";

// A small Web Audio synth.  No samples / assets, so the whole app stays
// self-contained and works offline.  Each note is a few detuned partials with a
// percussive (piano-ish) decay envelope.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  // Must be called from a user gesture (Chrome blocks audio otherwise).
  async resume() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  // Schedule a single note starting at `at`, lasting `dur` seconds.
  _scheduleNote(midi, at, dur, velocity) {
    const freq = midiToFreq(midi);
    // Relative amplitudes of the partials -> a slightly bright, struck tone.
    const partials = [
      { mult: 1, gain: 1.0 },
      { mult: 2, gain: 0.45 },
      { mult: 3, gain: 0.22 },
      { mult: 4, gain: 0.12 },
    ];

    const noteGain = this.ctx.createGain();
    noteGain.connect(this.master);

    // Percussive envelope: fast attack, exponential-ish decay, short release.
    const t = at;
    const peak = velocity;
    noteGain.gain.setValueAtTime(0.0001, t);
    noteGain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(peak * 0.3, t + dur * 0.6);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    for (const p of partials) {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq * p.mult;
      const g = this.ctx.createGain();
      g.gain.value = p.gain;
      osc.connect(g).connect(noteGain);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  // Play all notes simultaneously, once. Returns a promise resolving when done.
  playChord(midiNotes, dur) {
    const start = this.ctx.currentTime + 0.05;
    // Keep summed amplitude in check so 4-note chords don't clip.
    const velocity = 0.8 / Math.sqrt(midiNotes.length);
    for (const m of midiNotes) this._scheduleNote(m, start, dur, velocity);
    return this._sleep((dur + 0.1) * 1000);
  }

  // Play notes one after another (broken / arpeggiated), low to high.
  playBroken(midiNotes, noteDur) {
    const sorted = [...midiNotes].sort((a, b) => a - b);
    const start = this.ctx.currentTime + 0.05;
    sorted.forEach((m, i) => {
      this._scheduleNote(m, start + i * noteDur, noteDur, 0.7);
    });
    return this._sleep((sorted.length * noteDur + 0.1) * 1000);
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
