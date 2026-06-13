import { LIBRARY, SETTINGS } from "./config.js";
import { AudioEngine, VOICES } from "./audio.js";
import {
  noteNameToMidi,
  midiToName,
  randInt,
  clamp,
  weightedChoice,
  randNormal,
  invert,
} from "./music.js";

const INVERSION_LABEL = ["", " (1st inv)", " (2nd inv)", " (3rd inv)"];

const engine = new AudioEngine();

const voiceSelect = document.getElementById("voice");
for (const v of VOICES) {
  const opt = document.createElement("option");
  opt.value = v.id;
  opt.textContent = v.label;
  voiceSelect.appendChild(opt);
}

const questionCountSelect = document.getElementById("question-count");

// ---- Build the question list for a session -------------------------------

// Normal draw kept inside [lo, hi] by re-rolling, so the bell curve isn't
// flattened into a spike at the edges (falls back to clamp after a few tries).
function drawRoot(center, spread, lo, hi) {
  for (let t = 0; t < 20; t++) {
    const r = Math.round(randNormal(center, spread));
    if (r >= lo && r <= hi) return r;
  }
  return clamp(Math.round(randNormal(center, spread)), lo, hi);
}

function pickItems(n) {
  const counts = Object.keys(SETTINGS.countWeights).map(Number);
  for (const c of counts) {
    if (!LIBRARY[c] || LIBRARY[c].length === 0)
      throw new Error(`countWeights includes ${c} but LIBRARY[${c}] is empty.`);
  }

  const center = noteNameToMidi(SETTINGS.rootCenter);
  const lo = noteNameToMidi(SETTINGS.rootLow);
  const hi = noteNameToMidi(SETTINGS.rootHigh);

  const questions = [];
  for (let i = 0; i < n; i++) {
    // Layer 1: how many notes.
    const count = weightedChoice(counts, (c) => SETTINGS.countWeights[c]);
    // Layer 2: which pattern of that size.
    const item = weightedChoice(LIBRARY[count], (it) => it.weight);

    // Optional inversion (voicing only — count is unchanged).
    let inv = 0;
    let offsets = item.offsets;
    if (SETTINGS.randomInversions && count >= 3) {
      inv = randInt(0, count - 1);
      offsets = invert(offsets, inv);
    }

    // Root biased to the middle of the range (rejection-sampled so the tails
    // don't pile up on the boundaries).
    const root = drawRoot(center, SETTINGS.rootSpread, lo, hi);
    const notes = offsets.map((o) => root + o);
    questions.push({ item, notes, count, inv });
  }
  return questions;
}

// ---- Session state -------------------------------------------------------

const state = {
  questions: [],
  index: 0,
  answers: [], // { question, chosen, correct }
};

// ---- DOM refs ------------------------------------------------------------

const screens = {
  start: document.getElementById("screen-start"),
  question: document.getElementById("screen-question"),
  summary: document.getElementById("screen-summary"),
};
const el = {
  progress: document.getElementById("progress"),
  status: document.getElementById("status"),
  choices: document.getElementById("choices"),
  replayChord: document.getElementById("replay-chord"),
  feedback: document.getElementById("feedback"),
  next: document.getElementById("next-btn"),
  summaryBody: document.getElementById("summary-body"),
};

function show(name) {
  for (const key of Object.keys(screens)) {
    screens[key].classList.toggle("hidden", key !== name);
  }
}

// ---- Flow ----------------------------------------------------------------

document.getElementById("start-btn").addEventListener("click", async (e) => {
  const startBtn = e.currentTarget;
  startBtn.disabled = true;
  startBtn.textContent = "Loading sound…";
  await engine.resume(voiceSelect.value);
  startBtn.disabled = false;
  startBtn.textContent = "Start practice";
  const n = parseInt(questionCountSelect.value, 10);
  state.questions = pickItems(n);
  state.index = 0;
  state.answers = [];
  show("question");
  presentQuestion();
});

let answered = false;
let playToken = 0;
let feedbackToken = 0; // hoisted here so stopAll() can see both tokens

// Single choke point: invalidates all in-flight audio loops and disconnects
// the audio engine output so already-scheduled notes play into silence.
function stopAll() {
  answered = true;
  playToken++;
  feedbackToken++;
  engine.stop();
}

async function presentQuestion() {
  stopAll();
  const q = state.questions[state.index];
  answered = false;
  const myToken = ++playToken; // re-arm after stopAll() incremented it
  el.progress.textContent = `Question ${state.index + 1} of ${state.questions.length}`;
  el.feedback.innerHTML = "";
  el.feedback.className = "feedback";
  el.next.classList.add("hidden");
  el.replayChord.classList.add("hidden");
  setChoicesEnabled(false);

  // Start the chord, unlock buttons after buttonsAvailableSeconds, then wait
  // for the full chord to finish before starting the gap + repeat.
  el.status.textContent = listenLabel(1);
  await sleep(SETTINGS.questionPauseSeconds * 1000);
  if (myToken !== playToken) return;
  const chordDone = engine.playChord(q.notes, SETTINGS.noteSeconds);

  await sleep(SETTINGS.buttonsAvailableSeconds * 1000);
  if (!answered && myToken === playToken) setChoicesEnabled(true);

  await chordDone;
  playRemainingRepeats(q, myToken);
}

function listenLabel(n) {
  return SETTINGS.repeats > 1 ? `Listen… (${n}/${SETTINGS.repeats})` : "Listen…";
}

async function playRemainingRepeats(q, myToken) {
  for (let r = 1; r < SETTINGS.repeats; r++) {
    await sleep(SETTINGS.gapSeconds * 1000);
    if (answered || myToken !== playToken) return;
    el.status.textContent = listenLabel(r + 1);
    await engine.playChord(q.notes, SETTINGS.noteSeconds);
  }
  if (!answered && myToken === playToken) {
    el.status.textContent = "How many notes did you hear?";
  }
}

function setChoicesEnabled(on) {
  for (const btn of el.choices.querySelectorAll("button")) btn.disabled = !on;
}

el.replayChord.addEventListener("click", () => {
  startFeedbackPlayback(state.questions[state.index]);
});

async function playFeedbackSequence(q, token) {
  await sleep(SETTINGS.feedbackPauseSeconds * 1000);
  if (token !== feedbackToken) return;
  await engine.playBroken(q.notes, SETTINGS.brokenNoteSeconds);
  if (token !== feedbackToken) return;
  await sleep(SETTINGS.gapSeconds * 1000);
  if (token !== feedbackToken) return;
  await engine.playChord(q.notes, SETTINGS.noteSeconds);
}

function startFeedbackPlayback(q) {
  stopAll();
  const token = ++feedbackToken; // re-arm after stopAll() incremented it
  playFeedbackSequence(q, token);
}

for (const btn of el.choices.querySelectorAll("button")) {
  btn.addEventListener("click", () => onAnswer(parseInt(btn.dataset.count, 10)));
}

function onAnswer(chosen) {
  const q = state.questions[state.index];
  const correct = chosen === q.count;
  state.answers.push({ question: q, chosen, correct });

  stopAll(); // cancel question repeats and cut any ringing note

  setChoicesEnabled(false);
  el.status.textContent = "";

  const names = [...q.notes].sort((a, b) => a - b).map(midiToName).join(" – ");
  el.feedback.className = "feedback " + (correct ? "right" : "wrong");
  el.feedback.innerHTML = `
    <p class="verdict">${correct ? "✓ Correct!" : "✗ Not quite."}</p>
    <p>It had <strong>${q.count}</strong> notes — ${q.item.name}${INVERSION_LABEL[q.inv]}.</p>
    <p class="notes">${names}</p>
    <p class="hint">Listen to each note separately, then together…</p>`;

  el.replayChord.classList.remove("hidden");
  el.replayChord.disabled = false;
  el.next.classList.remove("hidden");
  startFeedbackPlayback(q);
}

el.next.addEventListener("click", () => {
  state.index++;
  if (state.index >= state.questions.length) showSummary();
  else presentQuestion();
});

function showSummary() {
  stopAll();
  const total = state.answers.length;
  const right = state.answers.filter((a) => a.correct).length;
  const pct   = Math.round(100 * right / total);
  const missed = state.answers.filter((a) => !a.correct);

  let html = `<p class="score">${right} / ${total}</p>`;
  html += `<p class="score-pct">${pct}% correct</p>`;

  if (missed.length === 0) {
    html += `<p class="perfect">Perfect score!</p>`;
  } else {
    html += `<h3>Missed</h3><ul>`;
    for (const a of missed) {
      html += `<li>${a.question.item.name} — you said ${a.chosen}, it had ${a.question.count}</li>`;
    }
    html += `</ul>`;
  }
  el.summaryBody.innerHTML = html;
  show("summary");
}

document.getElementById("again-btn").addEventListener("click", () => {
  show("start");
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
