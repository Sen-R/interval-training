# Chord Counting Practice

A small web app for practising **how many notes are in a chord** (2, 3, or 4) by
ear. It plays a chord twice on a piano, you choose the count, and it gives
feedback — revealing the answer, playing the chord broken (one note at a time),
and showing the note names.

No installation needed: it runs in any modern browser, including a Chromebook.

### Sound

Pick the sound from the **Sound** dropdown on the start screen:

- **Grand piano (recorded)** — the Salamander Grand Piano (real multi-velocity
  recordings, via Tone.js). Most realistic, including natural decay. Default.
- **GM piano (soundfont)** — a General-MIDI acoustic-grand soundfont. Lighter,
  loads faster, a touch more synthetic.
- **Synth (works offline)** — the built-in Web Audio tone. No network needed.

Samples download from a CDN the first time you press *Start* (hence the brief
"Loading sound…" pause), then they're cached. If a sampled voice can't load —
the **offline single file**, or no network — the app automatically falls back
to the synth, so it always works.

## Use it

- **Online:** open the deployed URL (see *Deploy* below).
- **Offline:** open `dist/interval-training.html` by double-clicking it. That one
  file is fully self-contained — no internet required.

## Change what's tested

Everything you'd want to tweak lives in **`src/config.js`** — you don't need to
touch any other file.

- **`LIBRARY`** — the chords/intervals. Each is a list of semitone *offsets* from
  a root (`0` = root). The note count is just how many offsets there are, so
  2-, 3- and 4-note items mix automatically. Add a line to add an item.
- **`SETTINGS`** — timing (`noteSeconds`, `repeats`, `gapSeconds`), how many
  questions per session, the random root range, and `includeTags`.

Handy recipes:

- **Drill only 2-note intervals:** set `includeTags: ["interval"]`.
- **Make it slower/easier:** raise `noteSeconds`, or set `repeats: 3`.
- **Narrow the pitch range:** set `rootLow`/`rootHigh` closer together.

> Note: questions are drawn uniformly across items, so if `LIBRARY` has more
> 2-note items than 3- or 4-note ones, she'll hear more 2-note chords. Keep the
> counts of each roughly even if you want an even mix.

## Run locally (development)

ES modules need to be served over http, so use any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Build the offline single file

After editing anything, regenerate the standalone file:

```bash
node build.js      # writes dist/interval-training.html
```

## Deploy (GitHub Pages)

1. Push this repo to GitHub.
2. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/`.
3. Share the resulting `https://<you>.github.io/interval-training/` URL.

Updating content later = edit `src/config.js`, commit, push. (Re-run
`node build.js` too if you also share the offline file.)

## Layout

| File | Role |
| --- | --- |
| `src/config.js` | **The content** — chords + settings. Edit this. |
| `src/music.js` | Note ↔ MIDI ↔ frequency helpers. |
| `src/audio.js` | Web Audio synth: play chord / broken chord. |
| `src/app.js` | Question flow + UI. |
| `src/styles.css` | Styling. |
| `index.html` | Page markup. |
| `build.js` | Bundles everything into `dist/interval-training.html`. |
