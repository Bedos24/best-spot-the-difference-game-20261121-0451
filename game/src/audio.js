// Tiny WebAudio sound kit: every sound is synthesized, no audio files.

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq, start, dur, type = 'sine', gain = 0.16) {
  if (muted) return;
  try {
    const a = ac();
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    osc.connect(g).connect(a.destination);
    osc.start(a.currentTime + start);
    osc.stop(a.currentTime + start + dur + 0.05);
  } catch {
    // Audio is a garnish; a silent game still plays.
  }
}

export function playFind() {
  tone(660, 0, 0.12);
  tone(880, 0.09, 0.14);
  tone(1320, 0.18, 0.2);
}

export function playMiss() {
  tone(160, 0, 0.16, 'square', 0.07);
  tone(120, 0.08, 0.18, 'square', 0.06);
}

export function playHint() {
  tone(1046, 0, 0.1, 'triangle');
  tone(1046, 0.16, 0.1, 'triangle');
}

export function playWin() {
  [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.15));
}

export function playClick() {
  tone(440, 0, 0.05, 'triangle', 0.06);
}
