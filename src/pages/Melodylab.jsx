import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * MelodyLab — a Strudel "Mode A" melody explorer.
 *
 * The whole engine is three calls from @strudel/web:
 *   initStrudel()  -> sets up the audio context + globals (needs a user gesture)
 *   evaluate(code) -> compiles & hot-swaps the playing pattern
 *   hush()         -> stops
 *
 * The UI is just a string builder: controls -> Strudel code -> evaluate().
 * While playing, edits re-evaluate live, so turning a knob updates the sound
 * without stopping — that's the fast iteration loop.
 *
 * Note: when loaded via the CDN <script>, these live on the `window.strudel`
 * namespace (not as bare globals), and initStrudel() registers its vocabulary
 * asynchronously — see whenVocabReady() below.
 *
 * In your own Vite project, replace the CDN <script> dance with:
 *   import { initStrudel, evaluate, hush } from "@strudel/web";
 * and call them directly (no `window.strudel.` prefix). Everything else stays
 * the same.
 */

const STRUDEL_SRC = "https://unpkg.com/@strudel/web@1.0.3";

// The CDN build is an IIFE that exposes a single global namespace object,
// `window.strudel`, holding { initStrudel, evaluate, hush, ... } — they are
// NOT bare globals. (In a bundled project, `import { ... } from "@strudel/web"`
// gives you the same functions directly.)
const strudel = () => (typeof window !== "undefined" ? window.strudel : undefined);

// initStrudel() is synchronous and returns nothing — it kicks off an *async*
// load that registers the pattern vocabulary (note, n, s, …) onto the global
// scope (~50ms later). Calling evaluate() before that lands throws e.g.
// "note is not defined", so after init we poll until the vocabulary is live.
function whenVocabReady(timeout = 8000) {
  return new Promise((resolve, reject) => {
    let waited = 0;
    const step = 50;
    const tick = () => {
      if (typeof window.note === "function" && typeof window.n === "function") {
        resolve();
      } else if ((waited += step) >= timeout) {
        reject(new Error("Strudel vocabulary failed to load (timed out)."));
      } else {
        setTimeout(tick, step);
      }
    };
    tick();
  });
}

const SOUNDS = [
  { group: "Synths (no load)", items: ["triangle", "sawtooth", "square", "sine"] },
  {
    group: "Instruments (load on first use)",
    items: [
      "gm_epiano1",
      "gm_acoustic_guitar_nylon",
      "gm_marimba",
      "gm_steel_drums",
      "gm_lead_6_voice",
      "gm_acoustic_bass",
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

function buildCode(s) {
  // Tempo is set with the chained `.cps()` control, not a top-level
  // `setcps(...)` statement — @strudel/web doesn't expose `setcps` as a global,
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
  p += `\n  .cps(${round(s.cps, 2)})`;
  return p;
}

// Stepwise-biased random walk over `ladder` (an array of note/degree tokens).
// Starts & ends on a chord tone, wanders mostly by step, leaps occasionally,
// rests rarely. `chordIdx` are the ladder indices that count as chord tones.
function rollWalk(ladder, chordIdx, len = 8) {
  let i = pick(chordIdx);
  const out = [];
  for (let k = 0; k < len; k++) {
    if (k > 0 && k < len - 1 && Math.random() < 0.14) {
      out.push("~");
      continue;
    }
    out.push(ladder[i]);
    const leap = Math.random() < 0.22;
    const step = leap ? pick([-4, -3, 3, 4]) : pick([-2, -1, 1, 1, 2]);
    i = clamp(i + step, 0, ladder.length - 1);
  }
  out[out.length - 1] = ladder[pick(chordIdx)];
  return out.join(" ");
}

// Scale degrees 0–7 (for `n(...).scale(...)`); chord tones are 0/2/4.
const DEGREE_LADDER = ["0", "1", "2", "3", "4", "5", "6", "7"];
const DEGREE_CHORD = [0, 2, 4];

const rollMelody = (len = 8) => rollWalk(DEGREE_LADDER, DEGREE_CHORD, len);

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

const rollNotes = (scaleStr, len = 8) => {
  const { ladder, chordIdx } = scaleLadder(scaleStr);
  return rollWalk(ladder, chordIdx, len);
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

export default function MelodyLab() {
  const [engine, setEngine] = useState("loading"); // loading | ready | error
  const [initialized, setInitialized] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [runtimeError, setRuntimeError] = useState(null);
  const [copied, setCopied] = useState(false);

  const [state, setState] = useState({
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
  });

  const set = useCallback(
    (k, v) => setState((s) => ({ ...s, [k]: v })),
    []
  );

  const code = useMemo(() => buildCode(state), [state]);

  // Load the engine script once.
  useEffect(() => {
    if (strudel()?.initStrudel) {
      setEngine("ready");
      return;
    }
    const onload = () => setEngine("ready");
    const onerror = () => setEngine("error");
    let sc = document.querySelector(`script[data-strudel]`);
    if (sc) {
      sc.addEventListener("load", onload);
      sc.addEventListener("error", onerror);
    } else {
      sc = document.createElement("script");
      sc.src = STRUDEL_SRC;
      sc.async = true;
      sc.dataset.strudel = "1";
      sc.addEventListener("load", onload);
      sc.addEventListener("error", onerror);
      document.head.appendChild(sc);
    }
    return () => {
      sc.removeEventListener("load", onload);
      sc.removeEventListener("error", onerror);
    };
  }, []);

  // Live update: while playing, re-evaluate whenever the code changes.
  useEffect(() => {
    if (!playing || !initialized || typeof strudel()?.evaluate !== "function") return;
    try {
      strudel().evaluate(code);
      setRuntimeError(null);
    } catch (e) {
      setRuntimeError(e?.message || String(e));
    }
  }, [code, playing, initialized]);

  const start = useCallback(async () => {
    if (engine !== "ready") return;
    try {
      if (!initialized) {
        strudel().initStrudel();
        await whenVocabReady();
        setInitialized(true);
      }
      // initStrudel only arms audio to resume on the *next* document click, but
      // we're already inside this Play click — so resume the AudioContext here,
      // within the gesture, or the scheduler runs silently.
      const ctx = strudel().getAudioContext?.();
      if (ctx && ctx.state !== "running") await ctx.resume();
      strudel().evaluate(code);
      setRuntimeError(null);
      setPlaying(true);
    } catch (e) {
      setRuntimeError(e?.message || String(e));
    }
  }, [engine, initialized, code]);

  const stop = useCallback(() => {
    try {
      if (typeof strudel()?.hush === "function") strudel().hush();
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
    setState((s) =>
      s.pitchMode === "notes"
        ? { ...s, pattern: rollNotes(s.scale, 8) }
        : { ...s, pitchMode: "degrees", pattern: rollMelody(8) }
    );
  }, []);

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

      {/* HERO: the live code readout */}
      <section className="mel-code" aria-label="Live Strudel code">
        <div className="mel-code-bar">
          <span className="mel-code-label">live pattern</span>
          <button className="mel-ghost" onClick={copy}>
            {copied ? "copied" : "copy"}
          </button>
        </div>
        <pre className="mel-pre">
          {tokens.map((t, i) => (
            <span key={i} style={{ color: TOKEN_COLOR[t[0]] }}>
              {t[1]}
            </span>
          ))}
        </pre>
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
        <button className="mel-ghost mel-roll" onClick={roll}>
          ⤵ roll a melody
        </button>
      </section>

      {engine === "error" && (
        <p className="mel-note mel-note--warn">
          The engine couldn’t load in this frame. The controls and code still
          work — copy the pattern into strudel.cc or your own project to hear it.
        </p>
      )}
      {runtimeError && (
        <p className="mel-note mel-note--warn">Strudel: {runtimeError}</p>
      )}

      {/* CONTROLS */}
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
                    {it}
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

      <footer className="mel-foot">
        <span>Ctrl/⌘ + Enter to play · Ctrl/⌘ + . to stop</span>
        <span>
          in your project: <code>import {"{ initStrudel, evaluate, hush }"} from "@strudel/web"</code>
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

.mel-code{background:var(--ink2); border:1px solid var(--edge); border-radius:14px; overflow:hidden;}
.mel-code-bar{display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid var(--edge);}
.mel-code-label{font-family:var(--mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted);}
.mel-pre{font-family:var(--mono); font-size:clamp(13px,2.4vw,16px); line-height:1.7; margin:0; padding:18px 16px; white-space:pre-wrap; word-break:break-word; tab-size:2;}
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
