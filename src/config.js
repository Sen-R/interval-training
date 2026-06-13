// ============================================================================
//  EDIT THIS FILE to change what is tested.  Nothing else needs to change.
// ============================================================================
//
//  How selection works (two independent layers, so they don't fight):
//
//   1. countWeights  — decides whether a question has 2, 3 or 4 notes.
//                      This is set DIRECTLY, independent of how many patterns
//                      you list below.  (50 / 35 / 15 -> 50% two-note, etc.)
//
//   2. weight (per pattern) — within a chosen note-count, decides WHICH pattern
//                      you hear.  Higher = more common.  Give rare/odd ones a
//                      weight of 1 so they "appear sometimes" without dominating.
//
//  So adding a new rare interval never changes the 2/3/4 balance, and never
//  takes over — you just give it a low weight.
//
//  Offsets are semitones above the lowest note (0 = the bottom note):
//   0=root 1=m2 2=M2 3=m3 4=M3 5=P4 6=tritone 7=P5 8=m6 9=M6 10=m7 11=M7 12=8ve
//  Triads & 7ths are also heard in random inversions (see randomInversions).
// ============================================================================

export const LIBRARY = {
  // --- 2 notes (intervals) --------------------------------------------------
  2: [
    { name: "Perfect fifth",  offsets: [0, 7],  weight: 4 },
    { name: "Major third",    offsets: [0, 4],  weight: 4 },
    { name: "Minor third",    offsets: [0, 3],  weight: 4 },
    { name: "Minor sixth",    offsets: [0, 8],  weight: 3 }, // inversion of M3
    { name: "Major sixth",    offsets: [0, 9],  weight: 3 }, // inversion of m3
    { name: "Perfect fourth", offsets: [0, 5],  weight: 3 }, // inversion of P5
    { name: "Octave",         offsets: [0, 12], weight: 2 },
    { name: "Tritone",        offsets: [0, 6],  weight: 1 }, // dissonant
    { name: "Minor second",   offsets: [0, 1],  weight: 1 }, // semitone, dissonant
    { name: "Major second",   offsets: [0, 2],  weight: 1 }, // dissonant
    { name: "Major seventh",  offsets: [0, 11], weight: 1 }, // dissonant
  ],

  // --- 3 notes (triads + incomplete 7ths) -----------------------------------
  3: [
    { name: "Major triad",      offsets: [0, 4, 7],  weight: 4 },
    { name: "Minor triad",      offsets: [0, 3, 7],  weight: 4 },
    { name: "Sus4 triad",       offsets: [0, 5, 7],  weight: 2 },
    { name: "Diminished triad", offsets: [0, 3, 6],  weight: 2 },
    { name: "Augmented triad",  offsets: [0, 4, 8],  weight: 1 },
    // "7th with a note missing" (shell voicings): root + 3rd + 7th, no 5th.
    { name: "Dom 7th (no 5th)", offsets: [0, 4, 10], weight: 1 },
    { name: "Maj 7th (no 5th)", offsets: [0, 4, 11], weight: 1 },
  ],

  // --- 4 notes (seventh chords) ---------------------------------------------
  4: [
    { name: "Dominant 7th",    offsets: [0, 4, 7, 10], weight: 3 },
    { name: "Major 7th",       offsets: [0, 4, 7, 11], weight: 3 },
    { name: "Minor 7th",       offsets: [0, 3, 7, 10], weight: 3 },
    { name: "Half-dim 7th",    offsets: [0, 3, 6, 10], weight: 1 },
    { name: "Diminished 7th",  offsets: [0, 3, 6, 9],  weight: 1 },
  ],
};

export const SETTINGS = {
  // How often each note-count appears. Only counts listed here are used, and
  // the numbers are relative (these happen to be percentages: 50 / 35 / 15).
  // To drill 2-note only: set this to { 2: 1 }.
  countWeights: { 2: 50, 3: 35, 4: 15 },

  // Play triads / 7ths in a random inversion for voicing variety. The number
  // of notes is unchanged, so it doesn't affect the answer.
  randomInversions: true,

  // Pitch of the lowest note. Drawn around rootCenter with a spread, so most
  // chords sit in the middle octave and occasionally stray higher/lower.
  // Always kept within [rootLow, rootHigh].
  rootCenter: "C4",
  rootSpread: 4, // semitones; larger = more spread away from the centre
  rootLow: "G3",
  rootHigh: "G4",

  // Playback timing.
  questionPauseSeconds: 0.6, // silence before the chord plays at the start of each question
  noteSeconds: 3,        // how long the chord rings each time
  buttonsAvailableSeconds: 2, // answer buttons unlock this many seconds after chord starts
  repeats: 2,            // how many times the chord is played
  gapSeconds: 0.6,       // silence between the repeats
  brokenNoteSeconds: 0.7,// per-note length when played broken (feedback)
  feedbackPauseSeconds: 1.0, // pause before broken playback so the question chord fades
};
