// How the player points at things.
//
// Mouse and touch arrive as page pixels and are converted to scene
// coordinates by toScenePoint. The keyboard alternative steers a ring
// cursor around whichever panel it currently sits on: arrows move it
// (Shift moves faster), Tab hops between the two pictures, Enter or Space
// checks the spot under the ring, H buys a hint and R restarts the round.

import { VIEW } from './scene.js';

// Convert a client-space point over a canvas into the 600 x 600 grid the
// scene is drawn on.
export function canvasPoint(canvas, clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const fx = (clientX - box.left) / box.width;
  const fy = (clientY - box.top) / box.height;
  return { x: fx * VIEW, y: fy * VIEW };
}

// Arrow key -> unit step in scene coordinates.
const ARROW_STEPS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const RING_MIN = 8;
const RING_MAX = VIEW - 8;

export class KeyboardCursor {
  constructor(onCheck, onHint, onRestart) {
    this.pos = { x: VIEW / 2, y: VIEW / 2 };
    this.side = 0; // which picture the ring is on: 0 original, 1 altered
    this.shown = false; // stays invisible until the first key press
    this.checkSpot = onCheck;
    this.askHint = onHint;
    this.restartRound = onRestart;
  }

  // The main controller reads these three; keep them as plain accessors
  // over the internal representation.
  get x() { return this.pos.x; }
  get y() { return this.pos.y; }
  get panel() { return this.side; }
  get active() { return this.shown; }

  // Feed one keydown event. Returns true when the game consumed the key.
  handle(event) {
    const key = event.key;
    if (key in ARROW_STEPS) {
      const stride = event.shiftKey ? 42 : 14;
      const [dx, dy] = ARROW_STEPS[key];
      this.pos.x = Math.min(RING_MAX, Math.max(RING_MIN, this.pos.x + dx * stride));
      this.pos.y = Math.min(RING_MAX, Math.max(RING_MIN, this.pos.y + dy * stride));
    } else if (key === 'Tab') {
      this.side = 1 - this.side;
    } else if (key === 'Enter' || key === ' ') {
      this.checkSpot(this.side, this.pos.x, this.pos.y);
    } else if (key === 'h' || key === 'H') {
      this.askHint();
    } else if (key === 'r' || key === 'R') {
      this.restartRound();
    } else {
      return false;
    }
    this.shown = true;
    event.preventDefault();
    return true;
  }

  // Paint the ring: a pale thick circle under a dark thin one, with four
  // dark ticks pointing inward, so it stays legible over sky and grass.
  draw(g) {
    if (!this.shown) return;
    const { x, y } = this.pos;
    g.save();
    const ringPasses = [['rgba(255,255,255,0.95)', 5], ['#173a5e', 2.6]];
    for (const [style, width] of ringPasses) {
      g.strokeStyle = style;
      g.lineWidth = width;
      g.beginPath();
      g.arc(x, y, 15, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = '#173a5e';
    g.lineWidth = 2.6;
    g.beginPath();
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      g.moveTo(x + dx * 22, y + dy * 22);
      g.lineTo(x + dx * 8, y + dy * 8);
    }
    g.stroke();
    g.restore();
  }
}
