# Chord Counting Practice

A small web app for practising **how many notes are in a chord** (2, 3, or 4) by
ear. It plays a chord twice on a piano, you choose the count, and it gives
feedback — revealing the answer, playing the chord broken (one note at a time),
and showing the note names.

No installation needed: it runs in any modern browser, including a Chromebook.

### Sound

The piano is the Salamander Grand Piano — real multi-velocity recordings played
via Tone.js, with natural decay. The samples download from a CDN the first time
you press *Start* (hence the brief "Loading piano…" pause), then they're cached,
so an internet connection is needed on first use.

## Use it

- **Online:** open the deployed URL (see *Deploy* below).
- **Offline:** open `dist/interval-training.html` by double-clicking it. That one
  file is fully self-contained — no internet required.

## Change what's tested

Everything you'd want to tweak lives in **`src/config.js`** — you don't need to
touch any other file. Selection happens in two independent layers:

- **`SETTINGS.countWeights`** decides how often a question has **2 / 3 / 4
  notes** — set directly, e.g. `{ 2: 50, 3: 35, 4: 15 }` for 50% / 35% / 15%.
  This is independent of how many patterns you list, so it never drifts.
- **`LIBRARY`** lists the patterns, grouped by note-count. Each has a `name`,
  semitone `offsets` (above the lowest note, `0` = bottom), and a **`weight`**
  controlling how common it is *within its group*. Give rare/odd ones `weight:
  1` so they show up sometimes without taking over; give staples a higher weight.

Other `SETTINGS`:

- **`randomInversions`** — when `true`, triads/7ths are voiced in a random
  inversion (the note count is unchanged, so the answer isn't affected).
- **`rootCenter` / `rootSpread` / `rootLow` / `rootHigh`** — the lowest note is
  drawn around `rootCenter` with a bell-curve `rootSpread` (in semitones), kept
  within `[rootLow, rootHigh]`. So most chords sit in the middle and occasionally
  stray higher/lower.
- **`noteSeconds` / `repeats` / `gapSeconds` / `brokenNoteSeconds`** — timing.

Handy recipes:

- **Add a new interval:** add a line to `LIBRARY[2]`, e.g.
  `{ name: "Minor seventh", offsets: [0, 10], weight: 1 }`.
- **Make a pattern rarer/commoner:** change its `weight`.
- **Drill only 2-note intervals:** set `countWeights: { 2: 1 }`.
- **Shift the 3/4-note balance:** edit the `countWeights` numbers.
- **Make it slower/easier:** raise `noteSeconds`, or set `repeats: 3`.
- **Keep it tighter to the middle octave:** lower `rootSpread`.

## Run locally (development)

Edit `src/` and the markup in `dev.html`. ES modules need to be served over
http, so use any static server and open **`dev.html`** (unbundled — refresh to
see changes, no build step):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/dev.html
```

## Build

`index.html` (the deployed homepage) and `dist/interval-training.html` (the
offline copy) are both **generated** — single self-contained files with the CSS
and JS inlined. After editing `dev.html` or anything in `src/`, regenerate them:

```bash
node build.js      # writes index.html + dist/interval-training.html
```

Inlining is deliberate: serving the app as separate ES modules lets the browser
cache each file independently, so a deploy can leave fresh HTML running against
a stale, cached `app.js`. One self-contained file has nothing to cache out of
sync, so the live site can't get into that mixed-version state.

## Deploy (GitHub Pages)

1. Run `node build.js`, then commit and push.
2. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/`.
3. Share the resulting `https://<you>.github.io/interval-training/` URL.

Updating content later = edit `src/config.js`, run `node build.js`, commit, push.

## Layout

| File | Role |
| --- | --- |
| `src/config.js` | **The content** — chords + settings. Edit this. |
| `src/music.js` | Note ↔ MIDI ↔ frequency helpers. |
| `src/audio.js` | Piano playback: chord / broken chord (Tone.js). |
| `src/app.js` | Question flow + UI. |
| `src/styles.css` | Styling. |
| `dev.html` | **Source** page markup. Edit this. |
| `index.html` | Generated, self-contained homepage. *Don't edit — run `build.js`.* |
| `build.js` | Inlines everything into `index.html` + `dist/interval-training.html`. |
