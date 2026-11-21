// Sound, synthesized live with WebAudio — the game ships no audio files.
// One lazy AudioContext, a mute flag, and a handful of little tunes built
// from single tones.

let context = null;
let muted = false;

function audioContext() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  if (context.state === 'suspended') context.resume();
  return context;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

// One soft blip: frequency, delay from now, length, wave shape, loudness.
function tone(freq, delay, dur, type = 'sine', gain = 0.16) {
  if (muted) return;
  try {
    const ac = audioContext();
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    const t0 = ac.currentTime + delay;
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Sound is a garnish. If the browser refuses it, the game plays on.
  }
}

// A rising three-note chirp when a difference is found.
export function playFind() {
  tone(660, 0, 0.12);
  tone(880, 0.09, 0.14);
  tone(1320, 0.18, 0.2);
}

// A low double buzz for a wrong click.
export function playMiss() {
  tone(160, 0, 0.16, 'square', 0.07);
  tone(120, 0.08, 0.18, 'square', 0.06);
}

// Two bright pings when a hint glimmers.
export function playHint() {
  tone(1046, 0, 0.1, 'triangle');
  tone(1046, 0.16, 0.1, 'triangle');
}

// A short fanfare arpeggio for finishing a round.
export function playWin() {
  [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.15));
}

// A quiet tick for button presses.
export function playClick() {
  tone(440, 0, 0.05, 'triangle', 0.06);
}
