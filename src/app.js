import { LIBRARY, SETTINGS } from "./config.js";
import { AudioEngine, VOICES } from "./audio.js";
import { noteNameToMidi, midiToName, randInt } from "./music.js";

const engine = new AudioEngine();

// Populate the sound picker.
const voiceSelect = document.getElementById("voice");
for (const v of VOICES) {
  const opt = document.createElement("option");
  opt.value = v.id;
  opt.textContent = v.label;
  voiceSelect.appendChild(opt);
}

// ---- Build the question list for a session -------------------------------

function pickItems() {
  const pool = LIBRARY.filter((item) =>
    item.tags.some((t) => SETTINGS.includeTags.includes(t))
  );
  if (pool.length === 0) throw new Error("No items match includeTags.");

  const rootLow = noteNameToMidi(SETTINGS.rootLow);
  const rootHigh = noteNameToMidi(SETTINGS.rootHigh);

  const questions = [];
  for (let i = 0; i < SETTINGS.questionsPerSession; i++) {
    const item = pool[randInt(0, pool.length - 1)];
    const root = randInt(rootLow, rootHigh);
    const notes = item.offsets.map((o) => root + o);
    questions.push({ item, notes, count: item.offsets.length });
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
  state.questions = pickItems();
  state.index = 0;
  state.answers = [];
  show("question");
  presentQuestion();
});

async function presentQuestion() {
  const q = state.questions[state.index];
  el.progress.textContent = `Question ${state.index + 1} of ${state.questions.length}`;
  el.feedback.innerHTML = "";
  el.feedback.className = "feedback";
  el.next.classList.add("hidden");
  setChoicesEnabled(false);
  el.replayChord.disabled = true;

  await playPrompt(q);

  el.status.textContent = "How many notes did you hear?";
  setChoicesEnabled(true);
  el.replayChord.disabled = false;
}

async function playPrompt(q) {
  for (let r = 0; r < SETTINGS.repeats; r++) {
    el.status.textContent =
      SETTINGS.repeats > 1 ? `Listen… (${r + 1}/${SETTINGS.repeats})` : "Listen…";
    await engine.playChord(q.notes, SETTINGS.noteSeconds);
    if (r < SETTINGS.repeats - 1) await sleep(SETTINGS.gapSeconds * 1000);
  }
}

function setChoicesEnabled(on) {
  for (const btn of el.choices.querySelectorAll("button")) btn.disabled = !on;
}

el.replayChord.addEventListener("click", async () => {
  const q = state.questions[state.index];
  el.replayChord.disabled = true;
  await engine.playChord(q.notes, SETTINGS.noteSeconds);
  el.replayChord.disabled = false;
});

for (const btn of el.choices.querySelectorAll("button")) {
  btn.addEventListener("click", () => onAnswer(parseInt(btn.dataset.count, 10)));
}

async function onAnswer(chosen) {
  const q = state.questions[state.index];
  const correct = chosen === q.count;
  state.answers.push({ question: q, chosen, correct });

  setChoicesEnabled(false);
  el.replayChord.disabled = true;
  el.status.textContent = "";

  const names = [...q.notes].sort((a, b) => a - b).map(midiToName).join(" – ");
  el.feedback.className = "feedback " + (correct ? "right" : "wrong");
  el.feedback.innerHTML = `
    <p class="verdict">${correct ? "✓ Correct!" : "✗ Not quite."}</p>
    <p>It had <strong>${q.count}</strong> notes — ${q.item.name}.</p>
    <p class="notes">${names}</p>
    <p class="hint">Listen to each note in turn…</p>`;

  await engine.playBroken(q.notes, SETTINGS.brokenNoteSeconds);

  el.replayChord.disabled = false;
  el.next.classList.remove("hidden");
}

el.next.addEventListener("click", () => {
  state.index++;
  if (state.index >= state.questions.length) showSummary();
  else presentQuestion();
});

function showSummary() {
  const total = state.answers.length;
  const right = state.answers.filter((a) => a.correct).length;
  const missed = state.answers.filter((a) => !a.correct);

  let html = `<p class="score">${right} / ${total} correct</p>`;
  if (missed.length) {
    html += `<h3>Worth another listen</h3><ul>`;
    for (const a of missed) {
      html += `<li>${a.question.item.name} — you said ${a.chosen}, it was ${a.question.count}</li>`;
    }
    html += `</ul>`;
  } else {
    html += `<p>Perfect score! 🎉</p>`;
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
