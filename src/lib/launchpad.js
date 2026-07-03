// Web MIDI interface for the classic Novation Launchpad (Mini MK1/MK2, and the
// original Launchpad/Launchpad S — all share this layout):
//
//   Grid pads      → Note On 0x90, note = 16*row + col  (row 0 top, col 0 left)
//   Top round row  → Control Change 0xB0, controllers 104–111
//   Right column   → notes 16*row + 8  (ignored here)
//
// LEDs are set by sending the same note/CC back with a velocity that encodes
// color: (green << 4) | red | flags, where red/green are 0–3 and flags 0x0C
// marks the LED for normal (non-double-buffered) display.
const NOTE_ON = 0x90;
const CC = 0xb0;
const LP_NAME = /launchpad/i;

const led = (red, green) => (green << 4) | red | 0x0c;
export const COLORS = {
  off: 0x0c,
  red: led(3, 0),
  redLow: led(1, 0),
  green: led(0, 3),
  greenLow: led(0, 1),
  amber: led(3, 3),
  amberLow: led(1, 1),
  yellow: led(2, 3),
};

// Connect to the first Launchpad found. `onPad(row, col, pressed)` fires for
// the 8×8 grid; `onTop(cc, pressed)` for the top round buttons. Returns a
// controller with setPad/setTop/reset/disconnect, or throws (no Web MIDI, or
// device not found).
export async function connectLaunchpad({ onPad, onTop, onRight } = {}) {
  if (!navigator.requestMIDIAccess) {
    throw new Error("Web MIDI isn't supported in this browser (try Chrome or Edge).");
  }
  const midi = await navigator.requestMIDIAccess({ sysex: false });

  let input, output;
  for (const i of midi.inputs.values()) if (LP_NAME.test(i.name)) { input = i; break; }
  for (const o of midi.outputs.values()) if (LP_NAME.test(o.name)) { output = o; break; }
  if (!input || !output) throw new Error("Launchpad not found — is it plugged in?");

  input.onmidimessage = (e) => {
    const [status, d1, d2] = e.data;
    if (status === CC && d1 >= 104 && d1 <= 111) {
      onTop?.(d1, d2 > 0);
    } else if (status === NOTE_ON) {
      const col = d1 & 0x0f;
      const row = d1 >> 4;
      if (row <= 7) {
        if (col <= 7) onPad?.(row, col, d2 > 0);
        else if (col === 8) onRight?.(row, d2 > 0); // right-column round buttons
      }
    }
  };

  const setPad = (row, col, color) => output.send([NOTE_ON, (row << 4) | col, color]);
  const setTop = (cc, color) => output.send([CC, cc, color]);
  const reset = () => output.send([CC, 0x00, 0x00]); // turn off all LEDs

  reset();
  return {
    name: input.name,
    setPad,
    setTop,
    reset,
    disconnect() {
      try {
        reset();
      } catch {}
      input.onmidimessage = null;
    },
  };
}
