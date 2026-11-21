// All of the game's sound is synthesized in the browser with WebAudio;
// there are no audio files to ship. A single context is created lazily on
// first use, and every effect is a short sequence of bare tones.

let sharedCtx = null;
let silenced = false;

function ctx() {
  if (sharedCtx === null) {
    const AC = window.AudioContext || window.webkitAudioContext;
    sharedCtx = new AC();
  }
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

export function setMuted(value) {
  silenced = value;
}

export function isMuted() {
  return silenced;
}

// Play one tone. `when` is seconds from now, `len` the audible length; the
// envelope swells in fast and decays exponentially so notes never click.
function blip(freq, { when = 0, len = 0.12, wave = 'sine', vol = 0.16 } = {}) {
  if (silenced) return;
  try {
    const ac = ctx();
    const start = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(vol, start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + len);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(start);
    osc.stop(start + len + 0.05);
  } catch {
    // Audio is decoration only; a browser that refuses it changes nothing.
  }
}

// Run a little tune: [frequency, delay, length] triples over one wave/vol.
function tune(notes, wave, vol) {
  for (const [freq, when, len] of notes) blip(freq, { when, len, wave, vol });
}

// Found a difference: a rising three-note chirp.
export function playFind() {
  tune([[660, 0, 0.12], [880, 0.09, 0.14], [1320, 0.18, 0.2]], 'sine', 0.16);
}

// Wrong click: a low, square double-buzz.
export function playMiss() {
  blip(160, { len: 0.16, wave: 'square', vol: 0.07 });
  blip(120, { when: 0.08, len: 0.18, wave: 'square', vol: 0.06 });
}

// Hint: the same bright ping twice.
export function playHint() {
  tune([[1046, 0, 0.1], [1046, 0.16, 0.1]], 'triangle', 0.16);
}

// Round finished: a six-note fanfare that climbs, dips and climbs again.
export function playWin() {
  const melody = [523, 659, 784, 1046, 784, 1046];
  melody.forEach((freq, i) => blip(freq, { when: i * 0.11, len: 0.22, wave: 'triangle', vol: 0.15 }));
}

// Button press: one quiet tick.
export function playClick() {
  blip(440, { len: 0.05, wave: 'triangle', vol: 0.06 });
}
