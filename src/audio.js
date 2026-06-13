import { midiToFreq, midiToName } from "./music.js";

// CDN module URLs (loaded lazily, only in the browser, only when chosen).
const SOUNDFONT_LIB = "https://esm.sh/soundfont-player@0.16.0";
const TONE_LIB = "https://esm.sh/tone@14.7.77";
const SALAMANDER_BASE = "https://tonejs.github.io/audio/salamander/";

// Selectable sounds, shown in the UI. First is the default.
export const VOICES = [
  { id: "salamander", label: "Grand piano (recorded)" },
  { id: "soundfont", label: "GM piano (soundfont)" },
  { id: "synth", label: "Synth (works offline)" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
//  Engine: owns the AudioContext and delegates playback to a chosen backend.
// ---------------------------------------------------------------------------
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.voiceId = VOICES[0].id;
    this.backend = null;
    this._cache = {}; // loaded backends, keyed by voice id
  }

  // Call from a user gesture. Loads (and caches) the requested voice, falling
  // back to the synth if it can't be loaded (e.g. offline).
  async resume(voiceId) {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (voiceId) this.voiceId = voiceId;
    this.backend = await this._getBackend(this.voiceId);
    return this.backend.id;
  }

  async _getBackend(id) {
    if (this._cache[id]) return this._cache[id];
    let backend;
    try {
      if (id === "salamander") backend = await SalamanderBackend.create();
      else if (id === "soundfont")
        backend = await SoundfontBackend.create(this.ctx, this.master);
      else backend = new SynthBackend(this.ctx, this.master);
    } catch (err) {
      console.warn(`Voice "${id}" failed to load; using synth:`, err);
      backend = new SynthBackend(this.ctx, this.master);
    }
    this._cache[id] = backend;
    return backend;
  }

  playChord(notes, dur) {
    return this.backend.playChord(notes, dur);
  }
  playBroken(notes, noteDur) {
    return this.backend.playBroken(notes, noteDur);
  }
}

// ---------------------------------------------------------------------------
//  Backend B: recorded Salamander Grand Piano via Tone.js (most realistic).
// ---------------------------------------------------------------------------
class SalamanderBackend {
  static async create() {
    const mod = await import(TONE_LIB);
    const Tone = mod.Sampler ? mod : mod.default || mod;
    await Tone.start(); // resume Tone's context within the user gesture

    // Sampled every minor third; Tone pitch-shifts to fill the gaps.
    const urls = {};
    const roots = ["A", "C", "D#", "F#"];
    for (let oct = 0; oct <= 7; oct++) {
      for (const r of roots) {
        if (oct === 0 && r !== "A") continue; // recordings start at A0
        urls[`${r}${oct}`] = `${r.replace("#", "s")}${oct}.mp3`;
      }
    }
    urls["C8"] = "C8.mp3";

    const sampler = new Tone.Sampler({
      urls,
      baseUrl: SALAMANDER_BASE,
      release: 1.2,
    }).toDestination();
    sampler.volume.value = -6; // headroom so 4-note chords don't clip
    await Tone.loaded();
    return new SalamanderBackend(Tone, sampler);
  }

  constructor(Tone, sampler) {
    this.id = "salamander";
    this.Tone = Tone;
    this.sampler = sampler;
  }

  playChord(notes, dur) {
    const t = this.Tone.now() + 0.05;
    this.sampler.triggerAttackRelease(notes.map(midiToName), dur, t, 0.8);
    return sleep((dur + 1.3) * 1000); // let the natural tail ring
  }

  playBroken(notes, noteDur) {
    const names = [...notes].sort((a, b) => a - b).map(midiToName);
    const t0 = this.Tone.now() + 0.05;
    names.forEach((n, i) =>
      this.sampler.triggerAttackRelease(n, noteDur, t0 + i * noteDur, 0.85)
    );
    return sleep((names.length * noteDur + 1.1) * 1000);
  }
}

// ---------------------------------------------------------------------------
//  Backend A: General-MIDI soundfont, with a tuned envelope / softer cutoff.
// ---------------------------------------------------------------------------
class SoundfontBackend {
  static async create(ctx, master) {
    const mod = await import(SOUNDFONT_LIB);
    const Soundfont = mod.default || mod;
    const instrument = await Soundfont.instrument(ctx, "acoustic_grand_piano", {
      soundfont: "MusyngKite",
      destination: master,
    });
    return new SoundfontBackend(ctx, instrument);
  }

  constructor(ctx, instrument) {
    this.id = "soundfont";
    this.ctx = ctx;
    this.instrument = instrument;
  }

  playChord(notes, dur) {
    const when = this.ctx.currentTime + 0.05;
    const gain = 1 / Math.sqrt(notes.length);
    for (const m of notes) {
      // Near-instant strike, then a longer release so it fades rather than
      // being chopped off at `dur`.
      this.instrument.play(m, when, { duration: dur, gain, attack: 0.005, release: 0.9 });
    }
    return sleep((dur + 1.0) * 1000);
  }

  playBroken(notes, noteDur) {
    const sorted = [...notes].sort((a, b) => a - b);
    const when = this.ctx.currentTime + 0.05;
    sorted.forEach((m, i) =>
      this.instrument.play(m, when + i * noteDur, {
        duration: noteDur,
        gain: 0.85,
        attack: 0.005,
        release: 0.6,
      })
    );
    return sleep((sorted.length * noteDur + 0.8) * 1000);
  }
}

// ---------------------------------------------------------------------------
//  Fallback: built-in Web Audio synth (no network needed).
// ---------------------------------------------------------------------------
class SynthBackend {
  constructor(ctx, master) {
    this.id = "synth";
    this.ctx = ctx;
    this.master = master;
  }

  playChord(notes, dur) {
    const when = this.ctx.currentTime + 0.05;
    const vel = 0.8 / Math.sqrt(notes.length);
    for (const m of notes) this._note(m, when, dur, vel);
    return sleep((dur + 0.2) * 1000);
  }

  playBroken(notes, noteDur) {
    const sorted = [...notes].sort((a, b) => a - b);
    const when = this.ctx.currentTime + 0.05;
    sorted.forEach((m, i) => this._note(m, when + i * noteDur, noteDur, 0.7));
    return sleep((sorted.length * noteDur + 0.2) * 1000);
  }

  _note(midi, at, dur, velocity) {
    const freq = midiToFreq(midi);
    const partials = [
      { mult: 1, gain: 1.0 },
      { mult: 2, gain: 0.45 },
      { mult: 3, gain: 0.22 },
      { mult: 4, gain: 0.12 },
    ];
    const noteGain = this.ctx.createGain();
    noteGain.connect(this.master);
    noteGain.gain.setValueAtTime(0.0001, at);
    noteGain.gain.exponentialRampToValueAtTime(velocity, at + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.3, at + dur * 0.6);
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
}
