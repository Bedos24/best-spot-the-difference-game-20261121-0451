// Pointer and keyboard input. Pointer clicks are reported in scene
// coordinates; the keyboard drives a crosshair cursor over the focused panel
// (Tab switches panels, Enter/Space checks the spot under the cursor).

import { VIEW } from './scene.js';

export function canvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW,
    y: ((clientY - rect.top) / rect.height) * VIEW,
  };
}

export class KeyboardCursor {
  constructor(onCheck, onHint, onRestart) {
    this.x = VIEW / 2;
    this.y = VIEW / 2;
    this.panel = 0; // 0 = left picture, 1 = right picture
    this.onCheck = onCheck;
    this.onHint = onHint;
    this.onRestart = onRestart;
    this.active = false;
  }

  handle(event) {
    const step = event.shiftKey ? 42 : 14;
    switch (event.key) {
      case 'ArrowLeft':
        this.x = Math.max(8, this.x - step);
        break;
      case 'ArrowRight':
        this.x = Math.min(VIEW - 8, this.x + step);
        break;
      case 'ArrowUp':
        this.y = Math.max(8, this.y - step);
        break;
      case 'ArrowDown':
        this.y = Math.min(VIEW - 8, this.y + step);
        break;
      case 'Tab':
        this.panel = this.panel === 0 ? 1 : 0;
        break;
      case 'Enter':
      case ' ':
        this.onCheck(this.panel, this.x, this.y);
        break;
      case 'h':
      case 'H':
        this.onHint();
        break;
      case 'r':
      case 'R':
        this.onRestart();
        break;
      default:
        return false;
    }
    this.active = true;
    event.preventDefault();
    return true;
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#173a5e';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x - 22, this.y);
    ctx.lineTo(this.x - 8, this.y);
    ctx.moveTo(this.x + 8, this.y);
    ctx.lineTo(this.x + 22, this.y);
    ctx.moveTo(this.x, this.y - 22);
    ctx.lineTo(this.x, this.y - 8);
    ctx.moveTo(this.x, this.y + 8);
    ctx.lineTo(this.x, this.y + 22);
    ctx.stroke();
    ctx.restore();
  }
}
