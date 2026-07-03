/**
 * Route wrapper for MelodyLab.
 *
 * The actual MelodyLab UI + Strudel engine live in a standalone document
 * (/melody-frame.html) that is served with a relaxed CSP allowing 'unsafe-eval'
 * and data: scripts — both of which Strudel requires (it compiles patterns to
 * JS at runtime and loads its AudioWorklet from a data: URL). Isolating it in an
 * iframe keeps the main app under a strict `script-src 'self'`.
 */
export default function MelodyLabFrame() {
  return (
    <iframe
      title="MelodyLab"
      src="/melody-frame.html"
      style={{ display: "block", width: "100%", height: "calc(100vh - 4rem)", border: 0 }}
      allow="autoplay; midi"
    />
  );
}
