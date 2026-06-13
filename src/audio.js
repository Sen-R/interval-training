import { midiToFreq } from "./music.js";

// URL of the soundfont-player library (loaded lazily, only in the browser).
const SOUNDFONT_LIB = "https://esm.sh/soundfont-player@0.16.0";

// Audio engine with two backends:
//   1. A real General-MIDI acoustic-grand-piano soundfont (sampled) — used when
//      it can be loaded over the network (e.g. on the hosted version).
//   2. A built-in Web Audio synth fallback — used offline or if the soundfont
//      fails to load, so the app always works.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.instrument = null; // soundfont instrument, or null when using the synth
  }

  get usingSamples() {
    return this.instrument !== null;
  }

  // Must be called from a user gesture (browsers block audio otherwise).
  // Also lazily loads the piano soundfont; falls back to the synth on failure.
  async resume() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    await this._loadInstrument();
  }

  async _loadInstrument() {
    if (this.instrument) return;
    try {
      const mod = await import(SOUNDFONT_LIB);
      const Soundfont = mod.default || mod;
      this.instrument = await Soundfont.instrument(
        this.ctx,
        "acoustic_grand_piano",
        { soundfont: "MusyngKite", destination: this.master }
      );
    } catch (err) {
      console.warn("Soundfont unavailable, using synth fallback:", err);
      this.instrument = null;
    }
  }

  // ---- Public playback -----------------------------------------------------

  // Play all notes simultaneously, once. Resolves when finished.
  playChord(midiNotes, dur) {
    const when = this.ctx.currentTime + 0.05;
    const gain = 1 / Math.sqrt(midiNotes.length); // keep chords from clipping
    for (const m of midiNotes) this._play(m, when, dur, gain);
    return this._sleep((dur + 0.2) * 1000);
  }

  // Play notes one after another (broken / arpeggiated), low to high.
  playBroken(midiNotes, noteDur) {
    const sorted = [...midiNotes].sort((a, b) => a - b);
    const when = this.ctx.currentTime + 0.05;
    sorted.forEach((m, i) => this._play(m, when + i * noteDur, noteDur, 0.85));
    return this._sleep((sorted.length * noteDur + 0.2) * 1000);
  }

  // ---- Backend dispatch ----------------------------------------------------

  _play(midi, when, dur, gain) {
    if (this.instrument) {
      this.instrument.play(midi, when, { duration: dur, gain });
    } else {
      this._synthNote(midi, when, dur, gain * 0.8);
    }
  }

  // Fallback synth: a few partials with a percussive (piano-ish) envelope.
  _synthNote(midi, at, dur, velocity) {
    const freq = midiToFreq(midi);
    const partials = [
      { mult: 1, gain: 1.0 },
      { mult: 2, gain: 0.45 },
      { mult: 3, gain: 0.22 },
      { mult: 4, gain: 0.12 },
    ];

    const noteGain = this.ctx.createGain();
    noteGain.connect(this.master);

    const peak = velocity;
    noteGain.gain.setValueAtTime(0.0001, at);
    noteGain.gain.exponentialRampToValueAtTime(peak, at + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(peak * 0.3, at + dur * 0.6);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    for (const p of partials) {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq * p.mult;
      const g = this.ctx.createGain();
      g.gain.value = p.gain;
      osc.connect(g).connect(noteGain);
      osc.start(at);
      osc.stop(at + dur + 0.05);
    }
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
