// ============================================================================
//  EDIT THIS FILE to change what is tested.  Nothing else needs to change.
// ============================================================================

// Each item is defined by semitone OFFSETS from a root note (0 = the root).
// The number of notes is simply offsets.length, so 2-, 3- and 4-note items are
// mixed automatically.  A random root is chosen for every question, so the same
// item is heard at many different pitches.
//
//   Reference: 0=root 1=m2 2=M2 3=m3 4=M3 5=P4 6=tritone 7=P5
//              8=m6 9=M6 10=m7 11=M7 12=octave
export const LIBRARY = [
  // --- 2 notes (intervals) ---
  { name: "Major third",     offsets: [0, 4],         tags: ["interval"] },
  { name: "Perfect fifth",   offsets: [0, 7],         tags: ["interval"] },
  { name: "Octave",          offsets: [0, 12],        tags: ["interval"] },
  { name: "Minor third",     offsets: [0, 3],         tags: ["interval"] },
  { name: "Perfect fourth",  offsets: [0, 5],         tags: ["interval"] },

  // --- 3 notes (triads) ---
  { name: "Major triad",     offsets: [0, 4, 7],      tags: ["triad"] },
  { name: "Minor triad",     offsets: [0, 3, 7],      tags: ["triad"] },
  { name: "Diminished triad",offsets: [0, 3, 6],      tags: ["triad"] },

  // --- 4 notes (seventh chords) ---
  { name: "Dominant 7th",    offsets: [0, 4, 7, 10],  tags: ["seventh"] },
  { name: "Major 7th",       offsets: [0, 4, 7, 11],  tags: ["seventh"] },
  { name: "Minor 7th",       offsets: [0, 3, 7, 10],  tags: ["seventh"] },
];

export const SETTINGS = {
  // Random root is drawn (inclusive) between these two notes, each question.
  rootLow: "C3",
  rootHigh: "C5",

  // Playback of the chord during the question.
  noteSeconds: 2,     // how long the chord rings each time
  repeats: 2,         // how many times the chord is played
  gapSeconds: 0.6,    // silence between the repeats

  // Broken (arpeggiated) playback during feedback.
  brokenNoteSeconds: 0.7,

  questionsPerSession: 20,

  // Only items whose tags intersect this list are used.
  // e.g. ["interval"] to drill 2-note only, or all three to mix.
  includeTags: ["interval", "triad", "seventh"],
};
