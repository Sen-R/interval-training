import { midiToName, sleep } from "./music.js";

const TONE_LIB        = "https://esm.sh/tone@14.7.77";
const SALAMANDER_BASE = "https://tonejs.github.io/audio/salamander/";

// Samples recorded every minor third; Tone.js pitch-shifts the rest.
const SAMPLE_URLS = (() => {
  const urls = {};
  for (let oct = 0; oct <= 7; oct++) {
    for (const r of ["A", "C", "D#", "F#"]) {
      if (oct === 0 && r !== "A") continue;
      urls[`${r}${oct}`] = `${r.replace("#", "s")}${oct}.mp3`;
    }
  }
  urls["C8"] = "C8.mp3";
  return urls;
})();

// ---------------------------------------------------------------------------
//  PianoEngine
//
//  Each question / feedback sequence gets a brand-new Sampler instance via
//  reset().  That guarantees complete audio isolation: notes from a previous
//  question literally cannot bleed into the next one because they belong to a
//  disposed audio graph.
//
//  Tone.js caches AudioBuffer data globally by URL, so reset() is
//  instantaneous after the first init() — it just creates new Web Audio nodes
//  wired to already-decoded PCM data.
// ---------------------------------------------------------------------------
export class PianoEngine {
  constructor() {
    this._Tone    = null;
    this._sampler = null;
    this._out     = null; // Tone.Gain → Tone.Destination
  }

  // Call once from a user-gesture handler (browser audio policy).
  // Loads Tone.js and the piano samples; subsequent calls are no-ops.
  async init() {
    if (this._Tone) {
      if (this._Tone.context.state === "suspended") await this._Tone.start();
      return;
    }
    const mod = await import(TONE_LIB);
    this._Tone = mod.Sampler ? mod : (mod.default || mod);
    await this._Tone.start();
    await this._newSampler();
  }

  // Dispose the current Sampler and create a fresh one.
  // Must be called before each question and each feedback sequence so that
  // notes from a previous context cannot reach the new output.
  // Fast after init() because AudioBuffer data is already cached.
  async reset() {
    this._disposeSampler();
    await this._newSampler();
  }

  // Ramp output to silence immediately.  Called on every transition so the
  // user hears an instant cutoff while reset() sets up the next context.
  stop() {
    if (this._out) this._out.gain.rampTo(0.001, 0.05);
  }

  playChord(notes, dur) {
    const names = notes.map(midiToName);
    const vel   = 0.8 / Math.sqrt(names.length);
    this._sampler.triggerAttackRelease(names, dur, this._Tone.now() + 0.05, vel);
    return sleep((dur + 0.5) * 1000);
  }

  playBroken(notes, noteDur) {
    const names = [...notes].sort((a, b) => a - b).map(midiToName);
    const t0    = this._Tone.now() + 0.05;
    names.forEach((n, i) =>
      this._sampler.triggerAttackRelease(n, noteDur, t0 + i * noteDur, 0.85)
    );
    return sleep((names.length * noteDur + 0.5) * 1000);
  }

  async _newSampler() {
    this._out = new this._Tone.Gain(1).toDestination();
    this._sampler = new this._Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: SALAMANDER_BASE,
      release: 1.2,
    }).connect(this._out);
    this._sampler.volume.value = -6;
    await this._Tone.loaded(); // instant when buffers are already cached
  }

  _disposeSampler() {
    if (this._sampler) { try { this._sampler.dispose(); } catch (_) {} }
    if (this._out)     { try { this._out.dispose();     } catch (_) {} }
    this._sampler = null;
    this._out     = null;
  }
}
