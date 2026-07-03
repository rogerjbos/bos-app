import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { controls, evalScope } from "@strudel/core";
import { webaudioRepl, registerSynthSounds, samples } from "@strudel/webaudio";
import { registerSoundfonts } from "@strudel/soundfonts";
import { transpiler } from "@strudel/transpiler";
import { connectLaunchpad, COLORS } from "../lib/launchpad";

/**
 * MelodyLab — a Strudel "Mode A" melody explorer.
 *
 * We build the engine from Strudel's granular packages rather than the
 * convenience bundle @strudel/web, because @strudel/web inlines its own private
 * sound registry and *omits* the General MIDI soundfonts — so the gm_* sounds
 * can never be registered into it. Wiring the pieces ourselves lets the player
 * and registerSoundfonts() share one registry, so gm_* instruments work:
 *
 *   evalScope(core, mini, tonal, controls) -> exposes the pattern vocabulary
 *       (note, n, s, scale, lpf, …) as globals the evaluated code references.
 *   registerSoundfonts()                   -> registers the gm_* instruments.
 *   webaudioRepl({ audioContext, transpiler }) -> a REPL wired to WebAudio
 *       output; returns { scheduler, evaluate } (see initEngine()).
 *
 * The UI is just a string builder: controls -> Strudel code -> repl.evaluate().
 * While playing, edits re-evaluate live, so turning a knob updates the sound
 * without stopping — that's the fast iteration loop.
 *
 * This runs in a sandboxed iframe (/melody-frame.html) served with a relaxed
 * CSP: 'unsafe-eval' (the transpiler compiles patterns to JS at runtime), data:
 * scripts (the AudioWorklet), and connect-src to felixroos.github.io (gm_*
 * soundfont samples load lazily on first use).
 */

// Strudel's drum-machine sample map: defines sounds named "<Machine>_<drum>"
// (e.g. RolandTR909_bd) so bank("RolandTR909") + s("bd") resolves. The map and
// its .wav files are served from raw.githubusercontent.com (allowed via the
// iframe's connect-src CSP).
const DRUM_MACHINES_URL =
  "https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json";

// One-time engine setup. Registers the vocabulary + soundfonts, then builds a
// WebAudio-backed REPL on the supplied AudioContext (so we control resume()
// inside the Play gesture). Returns { repl, ctx }.
async function initEngine() {
  await evalScope(
    import("@strudel/core"),
    import("@strudel/mini"),
    import("@strudel/tonal"),
    controls
  );
  // registerSynthSounds() registers the basic oscillator waveforms (triangle,
  // sawtooth, square, sine); registerSoundfonts() registers the gm_*
  // instruments. Both write to superdough's shared sound registry — the one the
  // player reads — so both kinds of sound resolve.
  registerSynthSounds();
  // Tidal drum-machine banks (RolandTR909, RolandTR808, …) for code-mode
  // patterns like s("bd sd hh*2").bank("RolandTR909"). Fire-and-forget and
  // non-fatal: a sample-host hiccup must never break synth/GM playback. The
  // JSON registers ~680 sound names; the .wav files load lazily on first use.
  samples(DRUM_MACHINES_URL).catch((e) =>
    console.warn("MelodyLab: drum machines failed to load:", e)
  );
  await registerSoundfonts();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const repl = webaudioRepl({ audioContext: ctx, transpiler });
  return { repl, ctx };
}

// Oscillator synths generate locally (no network); the gm_* General MIDI
// instruments are soundfonts that fetch samples from felixroos.github.io on
// first use. They're grouped into the 16 standard GM instrument families.
const SOUNDS = [
  { group: "Synths (no load)", items: ["triangle", "sawtooth", "square", "sine"] },
  {
    group: "Piano",
    items: [
      "gm_acoustic_piano",
      "gm_bright_acoustic_piano",
      "gm_electric_grand_piano",
      "gm_honky_tonk_piano",
      "gm_epiano1",
      "gm_epiano2",
      "gm_harpsichord",
      "gm_clavinet",
    ],
  },
  {
    group: "Chromatic Percussion",
    items: [
      "gm_celesta",
      "gm_glockenspiel",
      "gm_music_box",
      "gm_vibraphone",
      "gm_marimba",
      "gm_xylophone",
      "gm_tubular_bells",
      "gm_dulcimer",
    ],
  },
  {
    group: "Organ",
    items: [
      "gm_drawbar_organ",
      "gm_percussive_organ",
      "gm_rock_organ",
      "gm_church_organ",
      "gm_reed_organ",
      "gm_accordion",
      "gm_harmonica",
      "gm_bandoneon",
    ],
  },
  {
    group: "Guitar",
    items: [
      "gm_acoustic_guitar_nylon",
      "gm_acoustic_guitar_steel",
      "gm_electric_guitar_jazz",
      "gm_electric_guitar_clean",
      "gm_electric_guitar_muted",
      "gm_overdriven_guitar",
      "gm_distortion_guitar",
      "gm_guitar_harmonics",
    ],
  },
  {
    group: "Bass",
    items: [
      "gm_acoustic_bass",
      "gm_electric_bass_finger",
      "gm_electric_bass_pick",
      "gm_fretless_bass",
      "gm_slap_bass_1",
      "gm_slap_bass_2",
      "gm_synth_bass_1",
      "gm_synth_bass_2",
    ],
  },
  {
    group: "Strings",
    items: [
      "gm_violin",
      "gm_viola",
      "gm_cello",
      "gm_contrabass",
      "gm_tremolo_strings",
      "gm_pizzicato_strings",
      "gm_orchestral_harp",
      "gm_timpani",
    ],
  },
  {
    group: "Ensemble",
    items: [
      "gm_string_ensemble_1",
      "gm_string_ensemble_2",
      "gm_synth_strings_1",
      "gm_synth_strings_2",
      "gm_choir_aahs",
      "gm_voice_oohs",
      "gm_synth_choir",
      "gm_orchestra_hit",
    ],
  },
  {
    group: "Brass",
    items: [
      "gm_trumpet",
      "gm_trombone",
      "gm_tuba",
      "gm_muted_trumpet",
      "gm_french_horn",
      "gm_brass_section",
      "gm_synth_brass_1",
      "gm_synth_brass_2",
    ],
  },
  {
    group: "Reed",
    items: [
      "gm_soprano_sax",
      "gm_alto_sax",
      "gm_tenor_sax",
      "gm_baritone_sax",
      "gm_oboe",
      "gm_english_horn",
      "gm_bassoon",
      "gm_clarinet",
    ],
  },
  {
    group: "Pipe",
    items: [
      "gm_piccolo",
      "gm_flute",
      "gm_recorder",
      "gm_pan_flute",
      "gm_blown_bottle",
      "gm_shakuhachi",
      "gm_whistle",
      "gm_ocarina",
    ],
  },
  {
    group: "Synth Lead",
    items: [
      "gm_lead_1_square",
      "gm_lead_2_sawtooth",
      "gm_lead_3_calliope",
      "gm_lead_4_chiff",
      "gm_lead_5_charang",
      "gm_lead_6_voice",
      "gm_lead_7_fifths",
      "gm_lead_8_bass_lead",
    ],
  },
  {
    group: "Synth Pad",
    items: [
      "gm_pad_new_age",
      "gm_pad_warm",
      "gm_pad_poly",
      "gm_pad_choir",
      "gm_pad_bowed",
      "gm_pad_metallic",
      "gm_pad_halo",
      "gm_pad_sweep",
    ],
  },
  {
    group: "Synth Effects",
    items: [
      "gm_fx_rain",
      "gm_fx_soundtrack",
      "gm_fx_crystal",
      "gm_fx_atmosphere",
      "gm_fx_brightness",
      "gm_fx_goblins",
      "gm_fx_echoes",
      "gm_fx_sci_fi",
    ],
  },
  {
    group: "Ethnic",
    items: [
      "gm_sitar",
      "gm_banjo",
      "gm_shamisen",
      "gm_koto",
      "gm_kalimba",
      "gm_bagpipe",
      "gm_fiddle",
      "gm_shanai",
    ],
  },
  {
    group: "Percussive",
    items: [
      "gm_tinkle_bell",
      "gm_agogo",
      "gm_steel_drums",
      "gm_woodblock",
      "gm_taiko_drum",
      "gm_melodic_tom",
      "gm_synth_drum",
      "gm_reverse_cymbal",
    ],
  },
  {
    group: "Sound Effects",
    items: [
      "gm_guitar_fret_noise",
      "gm_breath_noise",
      "gm_seashore",
      "gm_bird_tweet",
      "gm_telephone",
      "gm_helicopter",
      "gm_applause",
      "gm_gunshot",
    ],
  },
];

const SCALES = [
  "C4:major",
  "C4:minor",
  "C4:dorian",
  "C4:mixolydian",
  "C4:lydian",
  "C4:phrygian",
  "C4:major pentatonic",
  "A3:minor pentatonic",
  "G4:major",
  "D4:dorian",
];

const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// `includeCps`: when stacking/sequencing several melodies we want ONE master
// tempo on the whole combination, not one `.cps()` per layer — so the mix
// builder omits it here and appends a single `.cps()` to the wrapper instead.
function buildCode(s, includeCps = true) {
  // Tempo is set with the chained `.cps()` control, not a top-level
  // `setcps(...)` statement — `setcps` isn't in the evaluated global scope,
  // so evaluating it throws "setcps is not defined".
  let p =
    s.pitchMode === "degrees"
      ? `n("${s.pattern}").scale("${s.scale}")`
      : `note("${s.pattern}")`;
  p += `\n  .s("${s.sound}")`;
  p += `\n  .lpf(${Math.round(s.lpf)})`;
  if (s.room > 0) p += `\n  .room(${round(s.room, 2)})`;
  if (s.delay > 0) p += `\n  .delay(${round(s.delay, 2)})`;
  p += `\n  .gain(${round(s.gain, 2)})`;
  if (s.jux) p += `\n  .jux(rev)`;
  if (includeCps) p += `\n  .cps(${round(s.cps, 2)})`;
  return p;
}

// Combine several melodies into one pattern:
//   stack(...) — all play at once (layered)
//   cat(...)   — one melody per cycle, in sequence
// One master tempo (the first layer's cps) governs the whole thing.
function buildMixCode(states, mode, masterCps) {
  const fn = mode === "cat" ? "cat" : "stack";
  const layers = states
    .map((s) =>
      buildCode(s, false)
        .split("\n")
        .map((line) => "  " + line)
        .join("\n")
    )
    .join(",\n");
  return `${fn}(\n${layers}\n).cps(${round(masterCps, 2)})`;
}

// --- Launchpad step-sequencer mapping -------------------------------------
// The grid edits a degree pattern: column = step, row = degree (degree 0 at the
// bottom, 7 at the top). A token that isn't a bare 0–7 degree (a rest "~", a
// subdivision "[..]", …) lights no pad. The Launchpad has 8 columns, so it
// addresses the first 8 steps of longer (16-step) patterns.
function patternToSteps(pattern, count = 8) {
  const toks = String(pattern).trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < count; i++) out.push(toks[i] ?? "~");
  return out;
}
const stepDegreeRow = (tok) => (/^[0-7]$/.test(tok) ? 7 - Number(tok) : -1);

// Draw one column: its single lit pad (the step's degree), amber when it's the
// step currently playing, green otherwise; a dim marker on the bottom row shows
// the playhead even when that step is a rest. Columns past the step count clear.
function drawColumn(lp, col, steps, isPlayhead) {
  for (let row = 0; row < 8; row++) lp.setPad(row, col, COLORS.off);
  if (col >= steps.length) return;
  const litRow = stepDegreeRow(steps[col]);
  if (litRow >= 0) lp.setPad(litRow, col, isPlayhead ? COLORS.amber : COLORS.green);
  else if (isPlayhead) lp.setPad(7, col, COLORS.redLow);
}
const drawGrid = (lp, steps, playCol = -1) => {
  for (let col = 0; col < 8; col++) drawColumn(lp, col, steps, col === playCol);
};

// --- Drum machine ---------------------------------------------------------
// A drum tab is an 8-step on/off grid, one row per voice, played through a
// Tidal drum-machine bank. It mirrors the melody tab's "controls → code" model:
// the grid + bank + tempo generate a stack(...) the same way the knobs do.
const DRUM_VOICES = [
  { s: "bd", label: "kick" },
  { s: "sd", label: "snare" },
  { s: "hh", label: "hat" },
  { s: "oh", label: "open hat" },
  { s: "cp", label: "clap" },
  { s: "lt", label: "low tom" },
  { s: "mt", label: "mid tom" },
  { s: "ht", label: "hi tom" },
];
// Popular machines from the loaded pack that carry a full kit.
const DRUM_BANKS = [
  "RolandTR909", "RolandTR808", "RolandTR707", "RolandTR606", "RolandTR505",
  "LinnDrum", "AkaiLinn", "AkaiMPC60", "OberheimDMX", "AlesisHR16",
  "CasioRZ1", "KorgKR55", "BossDR110", "EmuSP12", "RhythmAce",
];

const emptyDrumGrid = (steps = 8) =>
  Object.fromEntries(DRUM_VOICES.map((v) => [v.s, Array(steps).fill(false)]));

function normalizeDrumGrid(g, steps = 8) {
  const out = emptyDrumGrid(steps);
  if (g) for (const v of DRUM_VOICES) {
    const row = g[v.s];
    if (Array.isArray(row)) for (let i = 0; i < steps; i++) out[v.s][i] = !!row[i];
  }
  return out;
}

// Roll a beat the way real grooves breathe: build a half-bar groove, tile it
// across the bar, vary the repeats, and drop a fill near the end. `density`
// 0–1 = busyness; `variation` 0–1 = how much the repeats differ + fill weight.
function rollBeat(steps = 8, density = 0.55, variation = 0.4) {
  const g = emptyDrumGrid(steps);
  const r = (p) => Math.random() < p;
  const d = clamp(density, 0, 1);
  const half = steps >= 8 ? Math.floor(steps / 2) : steps;

  // Probability of a hit at position i within the half-bar groove, by voice.
  const hit = (voice, i) => {
    const strong = i % 4 === 0;
    const back = i % 4 === 2;
    switch (voice) {
      case "bd": return strong ? r(0.6 + 0.35 * d) : r(0.12 * d);
      case "sd": return back ? r(0.55 + 0.35 * d) : r(0.05 * d);
      case "hh": return r(0.3 + 0.55 * d);
      case "oh": return i % 2 === 1 ? r(0.12 + 0.18 * d) : r(0.03);
      case "cp": return back ? r(0.14 * d) : false;
      default: return r(0.03 * d); // toms
    }
  };

  const groove = {};
  for (const v of DRUM_VOICES) groove[v.s] = Array.from({ length: half }, (_, i) => hit(v.s, i));
  groove.bd[0] = true; // anchor the downbeat

  // Tile the groove, flipping the odd hat/open-hat on later repeats for life.
  for (const v of DRUM_VOICES) {
    for (let i = 0; i < steps; i++) {
      let on = groove[v.s][i % half];
      if (i >= half && (v.s === "hh" || v.s === "oh") && r(variation * 0.4)) on = !on;
      g[v.s][i] = on;
    }
  }
  // Fill in the final quarter, scaled by variation.
  const fillStart = steps - Math.max(1, Math.round(steps / 4));
  for (let i = fillStart; i < steps; i++) {
    if (r(variation * 0.5)) g.sd[i] = true;
    if (r(variation * 0.4)) g[pick(["mt", "lt", "ht"])][i] = true;
  }
  return g;
}

// Build the stack(...) code for a drum tab. bank() is applied per voice so the
// machine resolves (s("bd") → <Machine>_bd) regardless of control propagation.
function buildDrumCode(s) {
  const grid = s.grid || emptyDrumGrid();
  const bank = s.bank || "RolandTR909";
  const lines = [];
  for (const v of DRUM_VOICES) {
    const row = grid[v.s];
    if (row && row.some(Boolean)) {
      lines.push(`  s("${row.map((on) => (on ? v.s : "~")).join(" ")}").bank("${bank}")`);
    }
  }
  const body = lines.length ? lines.join(",\n") : `  s("~")`;
  return `stack(\n${body}\n)` + `\n  .gain(${round(s.gain ?? 0.9, 2)})` + `\n  .cps(${round(s.cps, 2)})`;
}

const DEFAULT_DRUMS = { bank: "RolandTR909", cps: 0.5, gain: 0.9, steps: 8, density: 0.55, variation: 0.4 };

// Drum grid for the Launchpad: a column can light several voices at once, so we
// can't reuse the single-pad melody drawer.
function drawDrumColumn(lp, col, grid, isPlayhead) {
  for (let row = 0; row < 8; row++) {
    const on = grid[DRUM_VOICES[row].s]?.[col];
    let color = COLORS.off;
    if (on) color = isPlayhead ? COLORS.amber : COLORS.green;
    else if (isPlayhead) color = COLORS.redLow;
    lp.setPad(row, col, color);
  }
}
const drawDrumGrid = (lp, grid, playCol = -1) => {
  for (let col = 0; col < 8; col++) drawDrumColumn(lp, col, grid, col === playCol);
};

// --- Melody generator -----------------------------------------------------
// A short motif: a stepwise walk over ladder INDICES (kept as numbers so we can
// transpose/anchor before turning them into tokens). Rests are "~". `rest` and
// `leap` are probabilities; the walk starts on a chord tone.
function rollMotif(ladder, chordIdx, len, rest, leap) {
  let i = pick(chordIdx);
  const out = [];
  for (let k = 0; k < len; k++) {
    if (k > 0 && Math.random() < rest) {
      out.push("~");
      continue;
    }
    out.push(i);
    const step = Math.random() < leap ? pick([-4, -3, 3, 4]) : pick([-2, -1, 1, 1, 2]);
    i = clamp(i + step, 0, ladder.length - 1);
  }
  return out;
}

const nearestChord = (i, chordIdx) =>
  chordIdx.reduce((a, b) => (Math.abs(b - i) < Math.abs(a - i) ? b : a));

// Variations of a motif: transpose all notes, or nudge one note. Rests kept.
const transposeMotif = (motif, delta, max) =>
  motif.map((x) => (x === "~" ? "~" : clamp(x + delta, 0, max)));
function mutateMotif(motif, max) {
  const spots = motif.map((x, i) => (x === "~" ? -1 : i)).filter((i) => i >= 0);
  if (!spots.length) return motif.slice();
  const out = motif.slice();
  const j = pick(spots);
  out[j] = clamp(out[j] + pick([-2, -1, 1, 2]), 0, max);
  return out;
}

// Build a phrase from a motif + a repetition structure (A = motif, a =
// variation of it, B = contrasting motif), then anchor the strong beats —
// start, midpoint, end — onto chord tones for a tonal, resolved feel.
// `density` 0–1 = how busy (fewer rests); `wildness` 0–1 = how often it leaps.
function rollPhrase(ladder, chordIdx, len = 8, density = 0.7, wildness = 0.35) {
  const rest = (1 - clamp(density, 0, 1)) * 0.45;
  const leap = clamp(wildness, 0, 1) * 0.6;
  const m = len >= 8 ? 4 : 2; // motif length
  const slots = Math.max(1, Math.round(len / m));
  const max = ladder.length - 1;

  const A = rollMotif(ladder, chordIdx, m, rest, leap);
  let B = null;
  const variant = () =>
    Math.random() < 0.5 ? transposeMotif(A, pick([-2, -1, 1, 2]), max) : mutateMotif(A, max);

  const plans = {
    1: [["A"]],
    2: [["A", "a"], ["A", "a"], ["A", "B"]],
    4: [
      ["A", "a", "A", "B"],
      ["A", "A", "a", "B"],
      ["A", "a", "B", "a"],
      ["A", "B", "A", "a"],
    ],
  };
  const plan = pick(plans[slots] || [Array(slots).fill("A")]);

  let phrase = [];
  for (const label of plan) {
    if (label === "A") phrase.push(...A);
    else if (label === "a") phrase.push(...variant());
    else {
      B = B || rollMotif(ladder, chordIdx, m, rest, leap);
      phrase.push(...B);
    }
  }
  phrase = phrase.slice(0, len);
  while (phrase.length < len) phrase.push("~");

  const anchor = (idx) => {
    const cur = phrase[idx];
    phrase[idx] = cur === "~" ? pick(chordIdx) : nearestChord(cur, chordIdx);
  };
  anchor(0);
  if (len >= 8) anchor(Math.floor(len / 2));
  anchor(len - 1);

  return phrase.map((x) => (x === "~" ? "~" : ladder[x])).join(" ");
}

// Scale degrees 0–7 (for `n(...).scale(...)`); chord tones are 0/2/4.
const DEGREE_LADDER = ["0", "1", "2", "3", "4", "5", "6", "7"];
const DEGREE_CHORD = [0, 2, 4];

const rollMelody = (len = 8, density, wildness) =>
  rollPhrase(DEGREE_LADDER, DEGREE_CHORD, len, density, wildness);

// Semitone offsets from the root for each scale the UI offers (one octave).
const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  "major pentatonic": [0, 2, 4, 7, 9],
  "minor pentatonic": [0, 3, 5, 7, 10],
};

const LETTER_PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const PC_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

// "C4" -> MIDI-ish semitone number (C-1 = 0, so C4 = 60).
function noteToSemitone(name) {
  const m = /^([a-g])([#sbf]*)(-?\d+)$/i.exec(name.trim());
  if (!m) return 60;
  let pc = LETTER_PC[m[1].toLowerCase()];
  for (const ch of m[2]) pc += ch === "#" || ch === "s" ? 1 : -1;
  return (parseInt(m[3], 10) + 1) * 12 + pc;
}
const semitoneToNote = (semi) =>
  PC_NAMES[((semi % 12) + 12) % 12] + (Math.floor(semi / 12) - 1);

// Build a note-name ladder following `scaleStr` (e.g. "C4:major") across a
// couple of octaves, plus the indices that are chord tones (scale steps 0/2/4 —
// matching how degrees mode treats 0/2/4 before `.scale()` is applied).
function scaleLadder(scaleStr, octaves = 2) {
  const [root, name = "major"] = scaleStr.split(":");
  const intervals = SCALE_INTERVALS[name] || SCALE_INTERVALS.major;
  const base = noteToSemitone(root);
  const len = intervals.length;
  const ladder = [];
  const chordIdx = [];
  for (let d = 0; d < octaves * len + 1; d++) {
    const i = d % len;
    if (i === 0 || i === 2 || i === 4) chordIdx.push(d);
    ladder.push(semitoneToNote(base + intervals[i] + 12 * Math.floor(d / len)));
  }
  return { ladder, chordIdx };
}

const rollNotes = (scaleStr, len = 8, density, wildness) => {
  const { ladder, chordIdx } = scaleLadder(scaleStr);
  return rollPhrase(ladder, chordIdx, len, density, wildness);
};

function tokenize(code) {
  const re =
    /("[^"]*")|([0-9]+\.?[0-9]*)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([^\sA-Za-z0-9_"]+)/g;
  const out = [];
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1]) out.push(["str", m[1]]);
    else if (m[2]) out.push(["num", m[2]]);
    else if (m[3]) out.push(["id", m[3]]);
    else if (m[4]) out.push(["ws", m[4]]);
    else out.push(["punc", m[5]]);
  }
  return out;
}

const TOKEN_COLOR = {
  str: "var(--amber)",
  num: "var(--cyan)",
  id: "var(--violet)",
  punc: "var(--muted)",
  ws: "inherit",
};

// Each tab is one melody: a name + the full control state below. The active
// tab is what the UI edits and plays; switching tabs swaps the whole state.
const DEFAULT_STATE = {
  pattern: "0 2 4 2 ~ 4 6 4",
  pitchMode: "degrees",
  scale: "C4:major",
  sound: "triangle",
  cps: 0.6,
  lpf: 2400,
  room: 0.35,
  delay: 0,
  gain: 0.8,
  jux: false,
  steps: 8, // phrase length (4 / 8 / 16)
  density: 0.7, // roll: higher = busier (fewer rests)
  wildness: 0.35, // roll: higher = more leaps
};

let _seq = 0;
const uid = () => `t${Date.now().toString(36)}${(_seq++).toString(36)}`;
// A tab is either knob-driven (mode "knobs": controls generate the code) or
// code-driven (mode "code": `code` holds free-form Strudel typed by the user).
const makeTab = (name, state = DEFAULT_STATE) => ({
  id: uid(),
  name,
  state: { ...DEFAULT_STATE, ...state },
  mode: "knobs",
  code: "",
});

// A drum tab starts with a freshly rolled beat so it's playable immediately.
const makeDrumTab = (name) => ({
  id: uid(),
  name,
  mode: "drums",
  code: "",
  state: { ...DEFAULT_DRUMS, grid: rollBeat() },
});

// Tabs persist to localStorage so saved melodies survive a reload.
const STORAGE_KEY = "melodylab.tabs.v1";
function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const p = raw && JSON.parse(raw);
    if (p && Array.isArray(p.tabs) && p.tabs.length) {
      // Backfill any missing keys so older saves stay valid.
      const tabs = p.tabs.map((t) => {
        const mode = t.mode === "code" ? "code" : t.mode === "drums" ? "drums" : "knobs";
        const state =
          mode === "drums"
            ? (() => {
                const ds = { ...DEFAULT_DRUMS, ...t.state };
                return { ...ds, grid: normalizeDrumGrid(t.state?.grid, ds.steps) };
              })()
            : { ...DEFAULT_STATE, ...t.state };
        return {
          id: t.id || uid(),
          name: t.name || "Melody",
          state,
          mode,
          code: typeof t.code === "string" ? t.code : "",
          codeFrom: t.codeFrom === "drums" ? "drums" : "knobs",
        };
      });
      const activeId = tabs.some((t) => t.id === p.activeId) ? p.activeId : tabs[0].id;
      return { tabs, activeId };
    }
  } catch {}
  const first = makeTab("Melody 1");
  return { tabs: [first], activeId: first.id };
}

export default function MelodyLab() {
  const [engine, setEngine] = useState("loading"); // loading | ready | error
  const [initialized, setInitialized] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [runtimeError, setRuntimeError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [midiState, setMidiState] = useState("off"); // off | on | error

  const [persisted] = useState(loadPersisted);
  const [tabs, setTabs] = useState(persisted.tabs);
  const [activeId, setActiveId] = useState(persisted.activeId);
  const [editingId, setEditingId] = useState(null);

  // Mix: combine multiple tabs into one pattern. mixIds holds the included
  // tabs; mixMode is "stack" (together) or "cat" (in sequence).
  const [mix, setMix] = useState(false);
  const [mixMode, setMixMode] = useState("stack");
  const [mixIds, setMixIds] = useState([]);

  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0];
  const state = activeTab.state;

  // Persist on any change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeId }));
    } catch {}
  }, [tabs, activeId]);

  // Mutate the active tab's state (accepts a value or an updater function).
  const updateActive = useCallback(
    (updater) =>
      setTabs((ts) =>
        ts.map((t) =>
          t.id === activeId
            ? { ...t, state: typeof updater === "function" ? updater(t.state) : updater }
            : t
        )
      ),
    [activeId]
  );

  const set = useCallback((k, v) => updateActive((s) => ({ ...s, [k]: v })), [updateActive]);

  // Create the tab in the handler (not inside the setTabs updater) so a
  // StrictMode double-invoke can't mint two tabs with different ids.
  const addTab = useCallback(() => {
    const t = makeTab(`Melody ${tabs.length + 1}`);
    setTabs((ts) => [...ts, t]);
    setActiveId(t.id);
  }, [tabs.length]);

  const duplicateTab = useCallback(() => {
    const src = tabs.find((t) => t.id === activeId) || tabs[0];
    const name = `${src.name} copy`;
    // Clone faithfully (deep-copy the drum grid; carry over code-mode + origin).
    const base =
      src.mode === "drums"
        ? { ...makeDrumTab(name), state: { ...src.state, grid: normalizeDrumGrid(src.state.grid, src.state.steps) } }
        : makeTab(name, src.state);
    const t = { ...base, mode: src.mode, code: src.code, codeFrom: src.codeFrom };
    setTabs((ts) => [...ts, t]);
    setActiveId(t.id);
  }, [tabs, activeId]);

  const closeTab = useCallback(
    (id) => {
      if (tabs.length <= 1) return;
      const idx = tabs.findIndex((t) => t.id === id);
      const next = tabs.filter((t) => t.id !== id);
      setTabs(next);
      if (id === activeId) setActiveId(next[Math.min(idx, next.length - 1)].id);
    },
    [tabs, activeId]
  );

  const renameTab = useCallback((id, name) => {
    const clean = name.trim();
    if (clean) setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, name: clean } : t)));
    setEditingId(null);
  }, []);

  // Entering mix mode selects every current tab by default.
  const toggleMix = useCallback(() => {
    setMix((m) => {
      if (!m) setMixIds(tabs.map((t) => t.id));
      return !m;
    });
  }, [tabs]);

  const toggleMixId = useCallback(
    (id) =>
      setMixIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])),
    []
  );

  const isCode = activeTab.mode === "code";
  const isDrums = activeTab.mode === "drums";

  // New drum tab (starts on a rolled beat), and re-roll the active beat.
  const addDrumTab = useCallback(() => {
    const t = makeDrumTab(`Beat ${tabs.length + 1}`);
    setTabs((ts) => [...ts, t]);
    setActiveId(t.id);
  }, [tabs.length]);

  const rollBeatActive = useCallback(
    () => updateActive((s) => ({ ...s, grid: rollBeat(s.steps || 8, s.density, s.variation) })),
    [updateActive]
  );

  // Toggle one cell of the active drum grid (voice row, step col).
  const toggleCell = useCallback(
    (voice, step) =>
      updateActive((s) => {
        const grid = normalizeDrumGrid(s.grid, s.steps || 8);
        grid[voice][step] = !grid[voice][step];
        return { ...s, grid };
      }),
    [updateActive]
  );

  // Phrase length (4 / 8 / 16). On a drum tab, resize the grid to match.
  const setSteps = useCallback(
    (n) =>
      updateActive((s) =>
        s.grid ? { ...s, steps: n, grid: normalizeDrumGrid(s.grid, n) } : { ...s, steps: n }
      ),
    [updateActive]
  );

  // Edit the active code-mode tab's text.
  const setCode = useCallback(
    (text) =>
      setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, code: text } : t))),
    [activeId]
  );

  // Flip the active tab between visual (knobs/drum grid) and code-driven.
  // Entering code mode seeds the editor with the tab's current generated code
  // and remembers where it came from; leaving restores that origin and drops
  // the typed code (the still-intact knob/grid state drives again).
  const toggleCodeMode = useCallback(() => {
    setTabs((ts) =>
      ts.map((t) => {
        if (t.id !== activeId) return t;
        if (t.mode === "code") return { ...t, mode: t.codeFrom || "knobs" };
        const seed = t.mode === "drums" ? buildDrumCode(t.state) : buildCode(t.state);
        return { ...t, mode: "code", code: seed, codeFrom: t.mode };
      })
    );
  }, [activeId]);

  // The melodies currently included in the mix (preserves tab order, drops any
  // stale ids from closed tabs, and skips code-driven tabs since they aren't
  // knob patterns).
  const mixTabs = useMemo(
    () => (mix ? tabs.filter((t) => mixIds.includes(t.id) && t.mode === "knobs") : []),
    [mix, tabs, mixIds]
  );

  const code = useMemo(() => {
    if (isCode) return activeTab.code;
    if (isDrums) return buildDrumCode(state);
    if (mix && mixTabs.length > 1) {
      return buildMixCode(mixTabs.map((t) => t.state), mixMode, mixTabs[0].state.cps);
    }
    if (mix && mixTabs.length === 1) return buildCode(mixTabs[0].state);
    return buildCode(state);
  }, [isCode, isDrums, activeTab, mix, mixTabs, mixMode, state]);

  // The repl instance + its AudioContext, built lazily on first Play.
  const replRef = useRef(null);
  const ctxRef = useRef(null);

  // Launchpad: the connected controller, latest-state mirror (for the playhead
  // rAF loop), and a stable indirection for the MIDI input callbacks so they
  // always see current handlers without re-binding on every render.
  const lpRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const apiRef = useRef({});

  // The engine is statically imported, so it's available as soon as the
  // component mounts — no <script> load to wait on or fail.
  useEffect(() => {
    setEngine(typeof webaudioRepl === "function" ? "ready" : "error");
  }, []);

  // Live update: while playing, re-evaluate whenever the code changes.
  useEffect(() => {
    if (!playing || !initialized || !replRef.current) return;
    try {
      replRef.current.evaluate(code);
      setRuntimeError(null);
    } catch (e) {
      setRuntimeError(e?.message || String(e));
    }
  }, [code, playing, initialized]);

  const start = useCallback(async () => {
    if (engine !== "ready") return;
    try {
      if (!replRef.current) {
        const { repl, ctx } = await initEngine();
        replRef.current = repl;
        ctxRef.current = ctx;
        setInitialized(true);
      }
      // We're inside the Play click, so resume the AudioContext within the
      // gesture — otherwise the scheduler runs silently.
      if (ctxRef.current && ctxRef.current.state !== "running") {
        await ctxRef.current.resume();
      }
      await replRef.current.evaluate(code);
      setRuntimeError(null);
      setPlaying(true);
    } catch (e) {
      setRuntimeError(e?.message || String(e));
    }
  }, [engine, code]);

  const stop = useCallback(() => {
    try {
      replRef.current?.scheduler?.stop();
    } catch {}
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => (playing ? stop() : start()), [playing, start, stop]);

  // Keyboard: Ctrl/Cmd+Enter play/update, Ctrl/Cmd+. stop (mirrors Strudel).
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        start();
      } else if (mod && e.key === ".") {
        e.preventDefault();
        stop();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [start, stop]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }, [code]);

  const roll = useCallback(() => {
    updateActive((s) => {
      const n = s.steps || 8;
      return s.pitchMode === "notes"
        ? { ...s, pattern: rollNotes(s.scale, n, s.density, s.wildness) }
        : { ...s, pitchMode: "degrees", pattern: rollMelody(n, s.density, s.wildness) };
    });
  }, [updateActive]);

  // --- Launchpad ------------------------------------------------------------
  // Keep the MIDI button handlers fresh without re-binding the input listener:
  // the listener calls through apiRef, which we refresh every render.
  apiRef.current.onPad = (row, col) => {
    if (activeTab.mode === "code") return; // code tabs have no step grid
    if (col >= (state.steps || 8)) return; // beyond this phrase's length
    if (activeTab.mode === "drums") {
      // row = voice, col = step → toggle that cell
      toggleCell(DRUM_VOICES[row].s, col);
      return;
    }
    const degree = 7 - row;
    updateActive((s) => {
      const toks = patternToSteps(s.pattern, s.steps || 8);
      toks[col] = toks[col] === String(degree) ? "~" : String(degree);
      return { ...s, pitchMode: "degrees", pattern: toks.join(" ") };
    });
  };
  apiRef.current.onTop = (cc) => {
    if (cc === 104) toggle(); // play / stop
    else if (cc === 105) (isDrums ? rollBeatActive : roll)(); // roll beat / melody
    else if (cc === 106 || cc === 107) {
      // 106 prev tab, 107 next tab
      const idx = tabs.findIndex((t) => t.id === activeId);
      const n = (idx + (cc === 107 ? 1 : -1) + tabs.length) % tabs.length;
      setActiveId(tabs[n].id);
    }
  };
  // Right-column round buttons select melody tabs directly (top = tab 1).
  apiRef.current.onRight = (row) => {
    if (row < tabs.length) setActiveId(tabs[row].id);
  };

  const connectLP = useCallback(async () => {
    try {
      const lp = await connectLaunchpad({
        onPad: (row, col, pressed) => pressed && apiRef.current.onPad?.(row, col),
        onTop: (cc, pressed) => pressed && apiRef.current.onTop?.(cc),
        onRight: (row, pressed) => pressed && apiRef.current.onRight?.(row),
      });
      lpRef.current = lp;
      setMidiState("on");
      setRuntimeError(null);
    } catch (e) {
      setMidiState("error");
      setRuntimeError(e?.message || String(e));
    }
  }, []);

  const disconnectLP = useCallback(() => {
    lpRef.current?.disconnect();
    lpRef.current = null;
    setMidiState("off");
  }, []);

  // Disconnect on unmount.
  useEffect(() => () => lpRef.current?.disconnect(), []);

  // Reflect the active melody onto the grid (green = a step's note). Only the
  // 8×8 grid (cols 0–7) is touched here — the right column and top row are
  // owned by the effects below, so they stay lit.
  useEffect(() => {
    const lp = lpRef.current;
    if (!lp || midiState !== "on") return;
    if (activeTab.mode === "code") {
      for (let col = 0; col < 8; col++)
        for (let row = 0; row < 8; row++) lp.setPad(row, col, COLORS.off);
    } else if (activeTab.mode === "drums") {
      drawDrumGrid(lp, state.grid);
    } else {
      drawGrid(lp, patternToSteps(state.pattern, state.steps || 8));
    }
  }, [midiState, state.pattern, state.grid, state.steps, activeTab.mode]);

  // Right column = one button per tab; the active tab glows amber.
  useEffect(() => {
    const lp = lpRef.current;
    if (!lp || midiState !== "on") return;
    for (let row = 0; row < 8; row++) {
      const t = tabs[row];
      lp.setPad(row, 8, !t ? COLORS.off : t.id === activeId ? COLORS.amber : COLORS.greenLow);
    }
  }, [midiState, tabs, activeId]);

  // Light the top buttons as transport hints; play button brightens while playing.
  useEffect(() => {
    const lp = lpRef.current;
    if (!lp || midiState !== "on") return;
    lp.setTop(104, playing ? COLORS.green : COLORS.greenLow);
    lp.setTop(105, COLORS.amber);
    lp.setTop(106, COLORS.redLow);
    lp.setTop(107, COLORS.redLow);
  }, [midiState, playing]);

  // Playhead: walk the lit column in sync with Strudel's scheduler (cycles).
  useEffect(() => {
    if (midiState !== "on" || !playing || activeTab.mode === "code") return;
    let raf;
    let last = -1;
    const tick = () => {
      const lp = lpRef.current;
      const sched = replRef.current?.scheduler;
      if (lp && sched?.started) {
        const st = stateRef.current;
        const count = st.steps || 8;
        const step = ((Math.floor(sched.now() * count) % count) + count) % count;
        const col = step % 8; // 8 physical columns; 16-step wraps within them
        if (col !== last) {
          if (activeTab.mode === "drums") {
            if (last >= 0) drawDrumColumn(lp, last, st.grid, false);
            drawDrumColumn(lp, col, st.grid, true);
          } else {
            const steps = patternToSteps(st.pattern, count);
            if (last >= 0) drawColumn(lp, last, steps, false);
            drawColumn(lp, col, steps, true);
          }
          last = col;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (last >= 0 && lpRef.current) {
        const st = stateRef.current;
        if (activeTab.mode === "drums") drawDrumColumn(lpRef.current, last, st.grid, false);
        else drawColumn(lpRef.current, last, patternToSteps(st.pattern, st.steps || 8), false);
      }
    };
  }, [midiState, playing, activeTab.mode]);

  const tokens = useMemo(() => tokenize(code), [code]);
  const degrees = state.pitchMode === "degrees";

  return (
    <div className="mel">
      <style>{CSS}</style>

      <header className="mel-head">
        <div>
          <div className="mel-eyebrow">strudel · melody lab</div>
          <h1 className="mel-title">
            Shape a line.<span className="mel-cursor" aria-hidden="true" />
          </h1>
          <p className="mel-sub">
            Every control rewrites one line of Strudel. Press play, then keep
            turning things — it updates while it loops.
          </p>
        </div>
        <span
          className={`mel-status mel-status--${engine}`}
          title={
            engine === "ready"
              ? "Engine ready"
              : engine === "error"
              ? "Engine unavailable"
              : "Loading engine"
          }
        >
          <i />
          {engine === "ready" ? "engine ready" : engine === "error" ? "no engine" : "loading…"}
        </span>
      </header>

      {/* TABS: each holds an independent melody (double-click to rename) */}
      <nav className="mel-tabs" aria-label="Melodies">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`mel-tab ${t.id === activeId ? "is-active" : ""}`}
            onClick={() => setActiveId(t.id)}
            onDoubleClick={() => setEditingId(t.id)}
            title="Click to switch · double-click to rename"
          >
            {editingId === t.id ? (
              <input
                className="mel-tab-edit"
                autoFocus
                defaultValue={t.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => renameTab(t.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                  else if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <>
                <span className="mel-tab-name">{t.name}</span>
                {tabs.length > 1 && (
                  <button
                    className="mel-tab-x"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(t.id);
                    }}
                    aria-label={`Close ${t.name}`}
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        <button className="mel-tab-add" onClick={addTab} title="New melody">
          +
        </button>
        <button className="mel-tab-add" onClick={duplicateTab} title="Duplicate this melody">
          ⎘
        </button>
        <button className="mel-tab-add" onClick={addDrumTab} title="New drum beat">
          🥁
        </button>
      </nav>

      {/* MIX: combine selected melodies into one pattern (melody tabs only) */}
      {activeTab.mode === "knobs" && (
      <section className="mel-mix">
        <button
          className={`mel-toggle ${mix ? "is-on" : ""}`}
          onClick={toggleMix}
          aria-pressed={mix}
          disabled={tabs.length < 2}
          title={tabs.length < 2 ? "Add another melody to mix" : "Combine melodies"}
        >
          <i />
          mix melodies
        </button>
        {mix && (
          <>
            <div className="mel-seg mel-mix-mode">
              <button
                className={mixMode === "stack" ? "is-active" : ""}
                onClick={() => setMixMode("stack")}
                title="Play all at once (layered)"
              >
                together
              </button>
              <button
                className={mixMode === "cat" ? "is-active" : ""}
                onClick={() => setMixMode("cat")}
                title="One melody per cycle, in sequence"
              >
                in turn
              </button>
            </div>
            <div className="mel-mix-tabs">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={`mel-chip ${mixIds.includes(t.id) ? "is-on" : ""}`}
                  onClick={() => toggleMixId(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      )}

      {/* HERO: the live code readout (editable in code mode) */}
      <section className="mel-code" aria-label="Live Strudel code">
        <div className="mel-code-bar">
          <span className="mel-code-label">
            {isCode ? "edit code" : isDrums ? "live beat" : mix ? "live mix" : "live pattern"}
          </span>
          <div className="mel-code-actions">
            <button
              className={`mel-ghost ${isCode ? "is-on" : ""}`}
              onClick={toggleCodeMode}
              title={
                isCode
                  ? "Discard edits and drive this tab visually again"
                  : "Edit the Strudel code directly (controls step aside)"
              }
            >
              {isCode
                ? activeTab.codeFrom === "drums"
                  ? "use grid"
                  : "use knobs"
                : "edit code"}
            </button>
            <button className="mel-ghost" onClick={copy}>
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>
        {isCode ? (
          // Editor = a transparent textarea (caret + input) layered exactly over
          // a syntax-highlighted <pre>. Both share the .mel-pre typography so
          // characters align; the trailing "\n" keeps the highlight from
          // clipping the textarea's last line.
          <div className="mel-editor">
            <pre className="mel-pre mel-editor-hl" aria-hidden="true">
              {tokens.map((t, i) => (
                <span key={i} style={{ color: TOKEN_COLOR[t[0]] }}>
                  {t[1]}
                </span>
              ))}
              {"\n"}
            </pre>
            <textarea
              className="mel-pre mel-editor-input"
              value={code}
              spellCheck={false}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Strudel code editor"
            />
          </div>
        ) : (
          <pre className="mel-pre">
            {tokens.map((t, i) => (
              <span key={i} style={{ color: TOKEN_COLOR[t[0]] }}>
                {t[1]}
              </span>
            ))}
          </pre>
        )}
        {isCode && (
          <p className="mel-code-tip">
            drum banks loaded — e.g. <code>s("bd sd hh*2").bank("RolandTR909")</code> · also
            RolandTR808, AkaiLinn, LinnDrum, …
          </p>
        )}
        <div className={`mel-playhead ${playing ? "is-on" : ""}`} aria-hidden="true">
          <span />
        </div>
      </section>

      {/* TRANSPORT */}
      <section className="mel-transport">
        <button
          className={`mel-play ${playing ? "is-playing" : ""}`}
          onClick={toggle}
          disabled={engine !== "ready"}
        >
          {playing ? "Stop" : "Play"}
        </button>
        {!isCode && (
          <>
            <label className="mel-knob">
              <span className="mel-knob-top">
                <span>tempo</span>
                <span className="mel-val">{round(state.cps, 2)} cps</span>
              </span>
              <input
                type="range"
                min="0.2"
                max="1.4"
                step="0.05"
                value={state.cps}
                onChange={(e) => set("cps", +e.target.value)}
              />
            </label>
            {isDrums ? (
              <button className="mel-ghost mel-roll" onClick={rollBeatActive}>
                🥁 roll a beat
              </button>
            ) : (
              <button className="mel-ghost mel-roll" onClick={roll}>
                ⤵ roll a melody
              </button>
            )}
          </>
        )}
        {isCode && (
          <span className="mel-code-hint">editing code · knobs paused for this melody</span>
        )}
        <button
          className={`mel-ghost mel-lp mel-lp--${midiState}`}
          onClick={midiState === "on" ? disconnectLP : connectLP}
          title={
            midiState === "on"
              ? "Launchpad connected — grid edits steps, top buttons control transport. Click to disconnect."
              : "Connect a Novation Launchpad over Web MIDI"
          }
        >
          <i />
          {midiState === "on"
            ? "launchpad connected"
            : midiState === "error"
            ? "launchpad not found"
            : "connect launchpad"}
        </button>
      </section>

      {midiState === "on" && (
        <section className="mel-legend" aria-label="Launchpad mapping">
          <span className="mel-legend-title">launchpad</span>
          <span>
            {isDrums ? (
              <>
                <b>grid</b> col = step · row = drum voice; tap to toggle a hit
              </>
            ) : (
              <>
                <b>grid</b> col = step · row = degree (0 bottom → 7 top); tap to set, tap again = rest
              </>
            )}
          </span>
          <span>
            <b>right column</b> jump to melody tab (top = first)
          </span>
          <span>
            <b>top row</b> <i className="mel-sw mel-sw--green" />play/stop ·{" "}
            <i className="mel-sw mel-sw--amber" />roll · <i className="mel-sw mel-sw--red" />‹ prev
            tab · <i className="mel-sw mel-sw--red" />next tab ›
          </span>
        </section>
      )}

      {engine === "error" && (
        <p className="mel-note mel-note--warn">
          The engine couldn’t load in this frame. The controls and code still
          work — copy the pattern into strudel.cc or your own project to hear it.
        </p>
      )}
      {runtimeError && (
        <p className="mel-note mel-note--warn">Strudel: {runtimeError}</p>
      )}

      {/* DRUM MACHINE: bank + step grid */}
      {isDrums && (
        <section className="mel-drum">
          <div className="mel-drum-bar">
            <label className="mel-drum-bank">
              <span>bank</span>
              <select
                className="mel-input"
                value={state.bank}
                onChange={(e) => set("bank", e.target.value)}
              >
                {DRUM_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <Slider
              label="gain"
              min={0}
              max={1}
              step={0.05}
              value={state.gain ?? 0.9}
              fmt={(v) => round(v, 2)}
              onChange={(v) => set("gain", v)}
            />
            <Slider
              label="roll density"
              min={0}
              max={1}
              step={0.05}
              value={state.density ?? 0.55}
              fmt={(v) => round(v, 2)}
              onChange={(v) => set("density", v)}
            />
            <Slider
              label="roll variation"
              min={0}
              max={1}
              step={0.05}
              value={state.variation ?? 0.4}
              fmt={(v) => round(v, 2)}
              onChange={(v) => set("variation", v)}
            />
            <div className="mel-field">
              <label>length</label>
              <div className="mel-seg">
                {[4, 8, 16].map((n) => (
                  <button
                    key={n}
                    className={(state.steps ?? 8) === n ? "is-active" : ""}
                    onClick={() => setSteps(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mel-drum-grid">
            {DRUM_VOICES.map((v) => (
              <div className="mel-drum-row" key={v.s}>
                <span className="mel-drum-label" title={v.s}>
                  {v.label}
                </span>
                <div
                  className="mel-drum-cells"
                  style={{ gridTemplateColumns: `repeat(${state.steps ?? 8}, 1fr)` }}
                >
                  {Array.from({ length: state.steps ?? 8 }, (_, step) => {
                    const on = state.grid?.[v.s]?.[step];
                    return (
                      <button
                        key={step}
                        className={`mel-cell ${on ? "is-on" : ""} ${step % 4 === 0 ? "is-beat" : ""}`}
                        onClick={() => toggleCell(v.s, step)}
                        aria-label={`${v.label} step ${step + 1}`}
                        aria-pressed={!!on}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTROLS */}
      {activeTab.mode === "knobs" && (
      <section className="mel-grid">
        <div className="mel-field mel-span">
          <div className="mel-field-top">
            <label htmlFor="pat">{degrees ? "scale degrees" : "notes"}</label>
            <span className="mel-hint">
              {degrees ? "numbers 0–7, ~ = rest, [a b] = subdivide" : "note names, ~ = rest"}
            </span>
          </div>
          <input
            id="pat"
            className="mel-input mel-mono"
            value={state.pattern}
            spellCheck={false}
            onChange={(e) => set("pattern", e.target.value)}
          />
        </div>

        <div className="mel-field">
          <label>pitch as</label>
          <div className="mel-seg">
            <button
              className={degrees ? "is-active" : ""}
              onClick={() => set("pitchMode", "degrees")}
            >
              degrees
            </button>
            <button
              className={!degrees ? "is-active" : ""}
              onClick={() => set("pitchMode", "notes")}
            >
              notes
            </button>
          </div>
        </div>

        <div className="mel-field">
          <label>length</label>
          <div className="mel-seg">
            {[4, 8, 16].map((n) => (
              <button
                key={n}
                className={(state.steps ?? 8) === n ? "is-active" : ""}
                onClick={() => setSteps(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="mel-field">
          <label htmlFor="scale">scale</label>
          <select
            id="scale"
            className="mel-input"
            value={state.scale}
            onChange={(e) => set("scale", e.target.value)}
          >
            {SCALES.map((sc) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>
        </div>

        <div className="mel-field">
          <label htmlFor="sound">sound</label>
          <select
            id="sound"
            className="mel-input"
            value={state.sound}
            onChange={(e) => set("sound", e.target.value)}
          >
            {SOUNDS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((it) => (
                  <option key={it} value={it}>
                    {it.startsWith("gm_") ? it.slice(3).replace(/_/g, " ") : it}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <Slider label="filter" unit="Hz" min={200} max={6000} step={50} value={state.lpf} fmt={(v) => Math.round(v)} onChange={(v) => set("lpf", v)} />
        <Slider label="reverb" min={0} max={1} step={0.05} value={state.room} fmt={(v) => round(v, 2)} onChange={(v) => set("room", v)} />
        <Slider label="delay" min={0} max={0.9} step={0.05} value={state.delay} fmt={(v) => round(v, 2)} onChange={(v) => set("delay", v)} />
        <Slider label="gain" min={0} max={1} step={0.05} value={state.gain} fmt={(v) => round(v, 2)} onChange={(v) => set("gain", v)} />

        <Slider label="roll density" min={0} max={1} step={0.05} value={state.density ?? 0.7} fmt={(v) => round(v, 2)} onChange={(v) => set("density", v)} />
        <Slider label="roll wildness" min={0} max={1} step={0.05} value={state.wildness ?? 0.35} fmt={(v) => round(v, 2)} onChange={(v) => set("wildness", v)} />

        <div className="mel-field">
          <label>stereo</label>
          <button
            className={`mel-toggle ${state.jux ? "is-on" : ""}`}
            onClick={() => set("jux", !state.jux)}
            aria-pressed={state.jux}
          >
            <i />
            jux(rev)
          </button>
        </div>
      </section>
      )}

      <footer className="mel-foot">
        <span>Ctrl/⌘ + Enter to play · Ctrl/⌘ + . to stop</span>
        <span>
          in your project: <code>webaudioRepl({"{ transpiler }"})</code> + <code>registerSoundfonts()</code>
        </span>
      </footer>
    </div>
  );
}

function Slider({ label, unit, min, max, step, value, fmt, onChange }) {
  return (
    <label className="mel-knob mel-field">
      <span className="mel-knob-top">
        <span>{label}</span>
        <span className="mel-val">
          {fmt(value)}
          {unit ? ` ${unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}

const CSS = `
.mel{
  --ink:#15151c; --ink2:#1b1b25; --ink3:#22222e; --edge:#33333f;
  --text:#e9e7df; --muted:#908ea0;
  --coral:#ff6f59; --coral-dim:#b8452f; --cyan:#5ec8c9; --amber:#f0b86e; --violet:#a99bff;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --sans:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  background:var(--ink); color:var(--text); font-family:var(--sans);
  padding:28px clamp(16px,4vw,40px) 36px; min-height:100%;
  -webkit-font-smoothing:antialiased;
}
.mel *{box-sizing:border-box;}
.mel-head{display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:22px;}
.mel-eyebrow{font-family:var(--mono); font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;}
.mel-title{font-size:clamp(26px,4.5vw,40px); line-height:1; font-weight:560; letter-spacing:-.02em; margin:0; display:flex; align-items:center;}
.mel-cursor{display:inline-block; width:.5ch; height:.92em; margin-left:.12em; background:var(--coral); animation:blink 1.1s steps(1) infinite;}
@keyframes blink{50%{opacity:0;}}
.mel-sub{color:var(--muted); max-width:46ch; margin:14px 0 0; font-size:14px; line-height:1.5;}
.mel-status{font-family:var(--mono); font-size:11px; letter-spacing:.04em; color:var(--muted); display:inline-flex; align-items:center; gap:7px; white-space:nowrap; padding-top:4px;}
.mel-status i{width:7px; height:7px; border-radius:50%; background:var(--muted);}
.mel-status--ready i{background:var(--cyan); box-shadow:0 0 8px var(--cyan);}
.mel-status--error i{background:var(--coral);}
.mel-status--loading i{animation:blink 1s steps(1) infinite;}

.mel-tabs{display:flex; align-items:center; gap:6px; margin-bottom:14px; overflow-x:auto; padding-bottom:4px;}
.mel-tab{display:inline-flex; align-items:center; gap:8px; flex:0 0 auto; font-family:var(--mono); font-size:12px; color:var(--muted); background:var(--ink2); border:1px solid var(--edge); border-radius:9px; padding:8px 10px; cursor:pointer; transition:color .15s,border-color .15s,background .15s; white-space:nowrap; user-select:none;}
.mel-tab:hover{color:var(--text); border-color:var(--muted);}
.mel-tab.is-active{color:var(--text); border-color:var(--coral); background:var(--ink3); box-shadow:inset 0 0 0 1px var(--coral-dim);}
.mel-tab-name{max-width:20ch; overflow:hidden; text-overflow:ellipsis;}
.mel-tab-x{display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border:0; border-radius:50%; background:transparent; color:var(--muted); font-size:15px; line-height:1; cursor:pointer; padding:0;}
.mel-tab-x:hover{background:var(--coral-dim); color:var(--text);}
.mel-tab-edit{font-family:var(--mono); font-size:12px; color:var(--text); background:var(--ink); border:1px solid var(--cyan); border-radius:6px; padding:2px 6px; width:16ch; outline:none;}
.mel-tab-add{flex:0 0 auto; width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; font-size:15px; color:var(--muted); background:transparent; border:1px dashed var(--edge); border-radius:9px; cursor:pointer; transition:color .15s,border-color .15s;}
.mel-tab-add:hover{color:var(--text); border-color:var(--muted);}

.mel-mix{display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:16px 0 0;}
.mel-mix .mel-toggle:disabled{opacity:.4; cursor:not-allowed;}
.mel-mix-mode{width:auto; flex:0 0 auto;}
.mel-mix-mode button{flex:0 0 auto; padding:8px 14px;}
.mel-mix-tabs{display:flex; gap:6px; flex-wrap:wrap;}
.mel-chip{font-family:var(--mono); font-size:12px; color:var(--muted); background:var(--ink2); border:1px solid var(--edge); border-radius:8px; padding:7px 11px; cursor:pointer; transition:color .15s,border-color .15s,background .15s;}
.mel-chip:hover{color:var(--text); border-color:var(--muted);}
.mel-chip.is-on{color:var(--text); border-color:var(--cyan); background:var(--ink3); box-shadow:inset 0 0 0 1px rgba(94,200,201,.4);}

.mel-code{background:var(--ink2); border:1px solid var(--edge); border-radius:14px; overflow:hidden;}
.mel-code-bar{display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid var(--edge);}
.mel-code-label{font-family:var(--mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted);}
.mel-pre{font-family:var(--mono); font-size:clamp(13px,2.4vw,16px); line-height:1.7; margin:0; padding:18px 16px; white-space:pre-wrap; word-break:break-word; tab-size:2;}
.mel-code-actions{display:flex; align-items:center; gap:8px;}
.mel-ghost.is-on{color:var(--text); border-color:var(--cyan);}
.mel-code-hint{font-family:var(--mono); font-size:11px; color:var(--muted); letter-spacing:.04em; margin-right:auto;}
.mel-code-tip{font-family:var(--mono); font-size:11px; color:var(--muted); margin:0; padding:8px 16px; border-top:1px solid var(--edge); line-height:1.5;}
.mel-code-tip code{color:var(--amber);}

.mel-lp{display:inline-flex; align-items:center; gap:8px;}
.mel-lp i{width:7px; height:7px; border-radius:50%; background:var(--muted); transition:background .15s;}
.mel-lp--on{color:var(--text); border-color:var(--cyan);}
.mel-lp--on i{background:var(--cyan); box-shadow:0 0 8px var(--cyan);}
.mel-lp--error{border-color:var(--coral-dim); color:var(--text);}
.mel-lp--error i{background:var(--coral);}

.mel-legend{display:flex; flex-wrap:wrap; gap:6px 18px; align-items:center; margin-top:14px; padding:11px 14px; border:1px solid var(--edge); border-radius:9px; background:var(--ink2); font-family:var(--mono); font-size:11px; color:var(--muted); line-height:1.6;}
.mel-legend-title{letter-spacing:.18em; text-transform:uppercase; color:var(--cyan);}
.mel-legend b{color:var(--text); font-weight:560;}
.mel-sw{display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:4px; vertical-align:baseline;}
.mel-sw--green{background:#5fd06a;}
.mel-sw--amber{background:var(--amber);}
.mel-sw--red{background:var(--coral);}

.mel-drum{margin-top:20px; background:var(--ink2); border:1px solid var(--edge); border-radius:14px; padding:16px;}
.mel-drum-bar{display:flex; gap:18px; align-items:flex-end; flex-wrap:wrap; margin-bottom:16px;}
.mel-drum-bank{display:flex; flex-direction:column; gap:9px; min-width:200px;}
.mel-drum-bank > span{font-family:var(--mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted);}
.mel-drum-bar .mel-knob{min-width:160px;}
.mel-drum-grid{display:flex; flex-direction:column; gap:6px;}
.mel-drum-row{display:flex; align-items:center; gap:10px;}
.mel-drum-label{flex:0 0 64px; font-family:var(--mono); font-size:11px; color:var(--muted); text-align:right;}
.mel-drum-cells{display:grid; grid-template-columns:repeat(8,1fr); gap:6px; flex:1; min-width:0;}
.mel-cell{height:30px; border:1px solid var(--edge); border-radius:6px; background:var(--ink3); cursor:pointer; padding:0; transition:background .1s, border-color .1s, box-shadow .1s;}
.mel-cell.is-beat{border-color:var(--muted);}
.mel-cell:hover{border-color:var(--text);}
.mel-cell.is-on{background:var(--coral); border-color:var(--coral); box-shadow:0 0 10px rgba(255,111,89,.4);}

/* Highlighted editor overlay: the <pre> (in flow) sets the height; the textarea
   is layered exactly on top. Both inherit .mel-pre so metrics match. */
.mel-editor{position:relative; border-top:1px solid var(--edge); background:var(--ink);}
.mel-editor-hl{min-height:160px; pointer-events:none;}
.mel-editor-input{position:absolute; inset:0; width:100%; height:100%; resize:none; overflow:hidden; border:0; outline:none; background:transparent; color:transparent; caret-color:var(--coral);}
.mel-editor-input::selection{background:rgba(94,200,201,.3);}
.mel-editor:focus-within{box-shadow:inset 0 0 0 2px rgba(94,200,201,.25);}
.mel-playhead{height:3px; background:var(--ink3);}
.mel-playhead span{display:block; height:100%; width:0; background:linear-gradient(90deg,var(--coral),var(--amber)); border-radius:0 3px 3px 0;}
.mel-playhead.is-on span{animation:sweep var(--dur,1.6s) linear infinite;}
@keyframes sweep{0%{width:0;opacity:1;}90%{width:100%;opacity:1;}100%{width:100%;opacity:0;}}

.mel-transport{display:flex; align-items:center; gap:14px; margin:18px 0 0; flex-wrap:wrap;}
.mel-play{font-family:var(--sans); font-size:15px; font-weight:560; letter-spacing:.01em; color:#1a0f0c; background:var(--coral); border:0; border-radius:11px; padding:13px 30px; cursor:pointer; transition:transform .08s ease, background .15s ease, box-shadow .15s; box-shadow:0 1px 0 var(--coral-dim);}
.mel-play:hover:not(:disabled){transform:translateY(-1px); box-shadow:0 4px 18px rgba(255,111,89,.32);}
.mel-play:active:not(:disabled){transform:translateY(0);}
.mel-play.is-playing{background:var(--ink3); color:var(--text); box-shadow:inset 0 0 0 1px var(--edge);}
.mel-play:disabled{opacity:.4; cursor:not-allowed;}
.mel-roll{margin-left:auto;}

.mel-ghost{font-family:var(--mono); font-size:12px; color:var(--muted); background:transparent; border:1px solid var(--edge); border-radius:8px; padding:7px 12px; cursor:pointer; transition:color .15s, border-color .15s;}
.mel-ghost:hover{color:var(--text); border-color:var(--muted);}

.mel-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:20px;}
.mel-span{grid-column:1 / -1;}
.mel-field{display:flex; flex-direction:column; gap:9px; min-width:0;}
.mel-field > label{font-family:var(--mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted);}
.mel-field-top{display:flex; justify-content:space-between; align-items:baseline; gap:10px;}
.mel-field-top label{font-family:var(--mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted);}
.mel-hint{font-size:11px; color:var(--muted); opacity:.8;}

.mel-input{background:var(--ink3); color:var(--text); border:1px solid var(--edge); border-radius:9px; padding:11px 12px; font-size:14px; font-family:var(--sans); width:100%; transition:border-color .15s, box-shadow .15s;}
.mel-mono{font-family:var(--mono); letter-spacing:.02em;}
.mel-input:focus-visible{outline:none; border-color:var(--cyan); box-shadow:0 0 0 3px rgba(94,200,201,.18);}
.mel-input:disabled{opacity:.45;}
select.mel-input{appearance:none; cursor:pointer;}

.mel-seg{display:flex; background:var(--ink3); border:1px solid var(--edge); border-radius:9px; padding:3px; gap:3px;}
.mel-seg button{flex:1; font-family:var(--mono); font-size:12px; color:var(--muted); background:transparent; border:0; border-radius:6px; padding:8px 0; cursor:pointer; transition:background .15s,color .15s;}
.mel-seg button.is-active{background:var(--ink); color:var(--text);}

.mel-knob input[type=range]{-webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:3px; background:var(--ink3); border:1px solid var(--edge); cursor:pointer;}
.mel-knob input[type=range]::-webkit-slider-thumb{-webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:var(--text); border:3px solid var(--ink); box-shadow:0 0 0 1px var(--edge); cursor:pointer;}
.mel-knob input[type=range]::-moz-range-thumb{width:14px; height:14px; border-radius:50%; background:var(--text); border:3px solid var(--ink); box-shadow:0 0 0 1px var(--edge); cursor:pointer;}
.mel-knob input[type=range]:focus-visible{outline:none;}
.mel-knob input[type=range]:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px rgba(94,200,201,.3);}
.mel-knob-top{display:flex; justify-content:space-between; align-items:baseline; font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted);}
.mel-val{color:var(--cyan); letter-spacing:.02em; text-transform:none;}

.mel-toggle{display:flex; align-items:center; gap:9px; font-family:var(--mono); font-size:13px; color:var(--muted); background:var(--ink3); border:1px solid var(--edge); border-radius:9px; padding:10px 12px; cursor:pointer; transition:color .15s,border-color .15s;}
.mel-toggle i{width:30px; height:16px; border-radius:9px; background:var(--ink); border:1px solid var(--edge); position:relative; transition:background .15s;}
.mel-toggle i::after{content:""; position:absolute; top:1px; left:1px; width:12px; height:12px; border-radius:50%; background:var(--muted); transition:transform .15s, background .15s;}
.mel-toggle.is-on{color:var(--text); border-color:var(--cyan);}
.mel-toggle.is-on i{background:rgba(94,200,201,.25);}
.mel-toggle.is-on i::after{transform:translateX(14px); background:var(--cyan);}

.mel-note{font-size:13px; line-height:1.5; margin:14px 0 0; padding:11px 14px; border-radius:9px;}
.mel-note--warn{background:rgba(255,111,89,.1); border:1px solid var(--coral-dim); color:var(--text);}

.mel-foot{display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:26px; padding-top:16px; border-top:1px solid var(--edge); font-family:var(--mono); font-size:11px; color:var(--muted);}
.mel-foot code{color:var(--violet);}

@media (max-width:720px){
  .mel-grid{grid-template-columns:repeat(2,1fr);}
  .mel-head{flex-direction:column-reverse; align-items:flex-start; gap:12px;}
}
@media (max-width:440px){
  .mel-grid{grid-template-columns:1fr;}
  .mel-roll{margin-left:0;}
}
@media (prefers-reduced-motion:reduce){
  .mel-cursor,.mel-status--loading i{animation:none;}
  .mel-playhead.is-on span{animation:none; width:100%; opacity:.5;}
}
`;
