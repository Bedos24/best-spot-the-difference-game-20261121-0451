// Canvas rendering for one scene variant. Everything is drawn from the item
// list in scene coordinates (600 x 600); the caller scales the context.

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawBackground(ctx, theme, phase = 0) {
  const sky = ctx.createLinearGradient(0, 0, 0, 400);
  theme.sky.forEach((c, i) => sky.addColorStop(i / (theme.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 600, 400);

  // Distant hills.
  ctx.fillStyle = theme.hillFar;
  ctx.beginPath();
  ctx.moveTo(0, 400);
  ctx.quadraticCurveTo(120, 300, 260, 372);
  ctx.quadraticCurveTo(400, 428, 600, 348);
  ctx.lineTo(600, 400);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.hillNear;
  ctx.beginPath();
  ctx.moveTo(0, 400);
  ctx.quadraticCurveTo(180, 348, 340, 392);
  ctx.quadraticCurveTo(480, 424, 600, 386);
  ctx.lineTo(600, 400);
  ctx.closePath();
  ctx.fill();

  // Meadow.
  const grass = ctx.createLinearGradient(0, 392, 0, 600);
  grass.addColorStop(0, theme.grass[0]);
  grass.addColorStop(1, theme.grass[1]);
  ctx.fillStyle = grass;
  ctx.fillRect(0, 392, 600, 208);

  // The pond, bottom right.
  ctx.fillStyle = theme.pondEdge;
  ellipse(ctx, 468, 522, 128, 60);
  ctx.fillStyle = theme.pond;
  ellipse(ctx, 468, 518, 120, 54);
  // Ripples drift with the phase so the pond shimmers while you play; the
  // phase only moves background strokes, never a clickable item.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (const [x, y, rx] of [[420, 506, 22], [505, 534, 28], [452, 544, 14]]) {
    const drift = Math.sin(phase + x) * 5;
    ctx.beginPath();
    ctx.ellipse(x + drift, y, rx + Math.sin(phase * 1.4 + y) * 3, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSun(ctx, it, night) {
  if (it.rays) {
    ctx.strokeStyle = '#ffb52e';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(it.x + Math.cos(a) * 44, it.y + Math.sin(a) * 44);
      ctx.lineTo(it.x + Math.cos(a) * 58, it.y + Math.sin(a) * 58);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#ffd94d';
  circle(ctx, it.x, it.y, 34);
  ctx.fillStyle = '#ffdf7e';
  circle(ctx, it.x - 8, it.y - 8, 24);
  if (it.face) {
    ctx.fillStyle = '#8a5a12';
    circle(ctx, it.x - 11, it.y - 3, 3.4);
    circle(ctx, it.x + 11, it.y - 3, 3.4);
    ctx.strokeStyle = '#8a5a12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(it.x, it.y + 4, 13, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
  void night;
}

function drawMoon(ctx, it) {
  ctx.fillStyle = '#f4f1de';
  circle(ctx, it.x, it.y, 30);
  ctx.fillStyle = '#e6e1c8';
  circle(ctx, it.x - 12, it.y - 10, 20);
  if (it.craters) {
    ctx.fillStyle = '#d8d2b4';
    circle(ctx, it.x + 8, it.y + 6, 6);
    circle(ctx, it.x - 4, it.y + 14, 4.4);
    circle(ctx, it.x + 14, it.y - 12, 4.8);
  }
}

function drawCloud(ctx, it) {
  ctx.fillStyle = it.tint;
  const s = it.s;
  ellipse(ctx, it.x, it.y, 40 * s, 20 * s);
  ellipse(ctx, it.x - 26 * s, it.y + 5 * s, 26 * s, 15 * s);
  ellipse(ctx, it.x + 27 * s, it.y + 5 * s, 28 * s, 16 * s);
  ellipse(ctx, it.x + 2 * s, it.y - 11 * s, 27 * s, 17 * s);
}

function drawBird(ctx, it) {
  ctx.strokeStyle = it.color;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  const s = it.s;
  ctx.beginPath();
  ctx.moveTo(it.x - 13 * s, it.y);
  ctx.quadraticCurveTo(it.x - 5 * s, it.y - 9 * s, it.x, it.y);
  ctx.quadraticCurveTo(it.x + 5 * s, it.y - 9 * s, it.x + 13 * s, it.y);
  ctx.stroke();
}

function drawStar(ctx, it) {
  ctx.fillStyle = '#ffeeb0';
  const s = it.s;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? s : s * 0.45;
    const px = it.x + Math.cos(a) * r;
    const py = it.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawRainbow(ctx, it) {
  const bands = ['#e84f4f', '#ff8c42', '#ffd94d', '#63c96b', '#4f9de8', '#b07fe8'];
  ctx.lineWidth = 11;
  bands.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(it.x, it.y, 196 - i * 11, Math.PI, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function drawKite(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.rotate(0.5);
  ctx.fillStyle = it.color;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,60,70,0.65)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(it.x + 8, it.y + 18);
  ctx.quadraticCurveTo(it.x + 20, it.y + 52, it.x + 6, it.y + 84);
  ctx.stroke();
  if (it.tail) {
    ctx.fillStyle = it.color;
    for (let i = 0; i < 3; i++) {
      const t = i / 3;
      const bx = it.x + 8 + Math.sin(t * 4) * 7 + t * -2;
      const by = it.y + 30 + t * 48;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(0.6);
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
  }
}

function drawHouseBody(ctx, it) {
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ellipse(ctx, it.x0 + it.w / 2, it.y0 + it.h + 8, it.w * 0.58, 10);
  ctx.fillStyle = it.wall;
  roundRect(ctx, it.x0, it.y0, it.w, it.h, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(it.x0, it.y0 + it.h - 12, it.w, 12);
}

function drawRoof(ctx, it) {
  ctx.fillStyle = it.color;
  ctx.beginPath();
  ctx.moveTo(it.x0 - 14, it.y0 + 6);
  ctx.lineTo(it.x0 + it.w / 2, it.y0 - 52);
  ctx.lineTo(it.x0 + it.w + 14, it.y0 + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.moveTo(it.x0 - 14, it.y0 + 6);
  ctx.lineTo(it.x0 + it.w / 2, it.y0 - 52);
  ctx.lineTo(it.x0 + it.w / 2, it.y0 + 6);
  ctx.closePath();
  ctx.fill();
}

function drawChimney(ctx, it, house) {
  const x = house.x0 + house.w - 48;
  const y = house.y0 - 58;
  if (it.smoke) {
    ctx.fillStyle = 'rgba(240,240,245,0.75)';
    circle(ctx, x + 8, y - 16, 8);
    circle(ctx, x + 16, y - 30, 11);
    circle(ctx, x + 27, y - 46, 14);
  }
  ctx.fillStyle = '#9a5a4a';
  ctx.fillRect(x, y, 20, 34);
  ctx.fillStyle = '#7c463a';
  ctx.fillRect(x - 3, y - 5, 26, 8);
}

function drawWindow(ctx, it) {
  ctx.fillStyle = '#6b4a2f';
  roundRect(ctx, it.x - 13, it.y - 15, 26, 30, 4);
  ctx.fillStyle = it.lit ? '#ffd94d' : '#bcd9ea';
  ctx.fillRect(it.x - 10, it.y - 12, 20, 24);
  ctx.strokeStyle = '#6b4a2f';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(it.x, it.y - 12);
  ctx.lineTo(it.x, it.y + 12);
  ctx.moveTo(it.x - 10, it.y);
  ctx.lineTo(it.x + 10, it.y);
  ctx.stroke();
  if (it.lit) {
    ctx.fillStyle = 'rgba(255,217,77,0.25)';
    circle(ctx, it.x, it.y, 24);
  }
}

function drawDoor(ctx, it) {
  ctx.fillStyle = '#5d3d22';
  roundRect(ctx, it.x - 15, it.y - 32, 30, 64, 5);
  ctx.fillStyle = it.open ? '#2e1d10' : it.color;
  roundRect(ctx, it.x - 12, it.y - 29, 24, 58, 4);
  if (!it.open) {
    ctx.fillStyle = '#ffd94d';
    circle(ctx, it.x + 7, it.y + 2, 2.8);
  } else {
    ctx.fillStyle = '#ffd94d';
    circle(ctx, it.x - 8, it.y + 2, 2.8);
  }
}

function drawFlowerBox(ctx, it) {
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(it.x - 14, it.y - 2, 28, 9);
  for (let i = 0; i < 3; i++) {
    const fx = it.x - 9 + i * 9;
    ctx.strokeStyle = '#3f9142';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, it.y - 2);
    ctx.lineTo(fx, it.y - 9);
    ctx.stroke();
    ctx.fillStyle = it.color;
    circle(ctx, fx, it.y - 11, 4);
  }
}

function drawCat(ctx, it) {
  ctx.fillStyle = it.color;
  ellipse(ctx, it.x, it.y - 6, 13, 8); // body
  circle(ctx, it.x + 11, it.y - 13, 7); // head
  ctx.beginPath(); // ears
  ctx.moveTo(it.x + 6, it.y - 17);
  ctx.lineTo(it.x + 8, it.y - 23);
  ctx.lineTo(it.x + 11, it.y - 18);
  ctx.moveTo(it.x + 12, it.y - 18);
  ctx.lineTo(it.x + 15, it.y - 23);
  ctx.lineTo(it.x + 17, it.y - 17);
  ctx.fill();
  ctx.strokeStyle = it.color; // tail
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(it.x - 12, it.y - 8);
  ctx.quadraticCurveTo(it.x - 20, it.y - 14, it.x - 17, it.y - 22);
  ctx.stroke();
}

function drawLaundry(ctx, it) {
  const x0 = it.x - 62, x1 = it.x + 62, y = it.y - 44;
  ctx.strokeStyle = '#7a6a55';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y + 62);
  ctx.lineTo(x0, y);
  ctx.moveTo(x1, y + 62);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(50,40,30,0.7)';
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  const n = it.shirts.length;
  it.shirts.forEach((color, i) => {
    const sx = x0 + ((i + 0.5) / n) * (x1 - x0);
    ctx.fillStyle = color;
    roundRect(ctx, sx - 13, y + 2, 26, 30, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(sx - 13, y + 24, 26, 8);
  });
}

function drawTree(ctx, it) {
  ctx.fillStyle = '#7a4a2b';
  ctx.beginPath();
  ctx.moveTo(it.x - 9, it.y + 66);
  ctx.quadraticCurveTo(it.x - 4, it.y, it.x - 12, it.y - 26);
  ctx.lineTo(it.x + 12, it.y - 26);
  ctx.quadraticCurveTo(it.x + 4, it.y, it.x + 9, it.y + 66);
  ctx.closePath();
  ctx.fill();
  if (it.swing) {
    ctx.strokeStyle = 'rgba(60,40,20,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(it.x - 34, it.y - 18);
    ctx.lineTo(it.x - 34, it.y + 22);
    ctx.moveTo(it.x - 14, it.y - 18);
    ctx.lineTo(it.x - 14, it.y + 22);
    ctx.stroke();
    ctx.fillStyle = '#a5713d';
    ctx.fillRect(it.x - 40, it.y + 22, 32, 6);
  }
  ctx.fillStyle = it.foliage;
  circle(ctx, it.x, it.y - 62, 44);
  circle(ctx, it.x - 36, it.y - 34, 32);
  circle(ctx, it.x + 36, it.y - 34, 32);
  circle(ctx, it.x, it.y - 30, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  circle(ctx, it.x - 14, it.y - 70, 22);
  // Apples sit on fixed offsets so counts look natural.
  const spots = [[-24, -48], [16, -66], [30, -30], [-6, -26], [-34, -22], [8, -84], [38, -52], [-16, -70]];
  ctx.fillStyle = it.appleColor;
  for (let i = 0; i < Math.min(it.apples, spots.length); i++) {
    circle(ctx, it.x + spots[i][0], it.y + spots[i][1], 5.4);
  }
}

function drawFence(ctx, it) {
  const x0 = it.x - 66;
  const gap = 132 / Math.max(it.posts - 1, 1);
  ctx.fillStyle = '#c9a06a';
  for (let i = 0; i < it.posts; i++) {
    const px = x0 + i * gap;
    ctx.fillRect(px - 4, it.y - 20, 8, 38);
    ctx.beginPath();
    ctx.moveTo(px - 4, it.y - 20);
    ctx.lineTo(px, it.y - 27);
    ctx.lineTo(px + 4, it.y - 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(x0 - 6, it.y - 12, 144, 5);
  ctx.fillRect(x0 - 6, it.y + 4, 144, 5);
}

function drawBush(ctx, it) {
  ctx.fillStyle = it.color;
  circle(ctx, it.x, it.y, 20);
  circle(ctx, it.x - 15, it.y + 6, 14);
  circle(ctx, it.x + 15, it.y + 6, 14);
  const spots = [[-9, -6], [7, -10], [12, 4], [-13, 5], [0, 8]];
  ctx.fillStyle = '#e84f6b';
  for (let i = 0; i < Math.min(it.berries, spots.length); i++) {
    circle(ctx, it.x + spots[i][0], it.y + spots[i][1], 3.4);
  }
}

function drawBoat(ctx, it) {
  ctx.strokeStyle = '#6b4a2f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(it.x, it.y - 6);
  ctx.lineTo(it.x, it.y - 46);
  ctx.stroke();
  ctx.fillStyle = it.sail;
  ctx.beginPath();
  ctx.moveTo(it.x + 3, it.y - 44);
  ctx.lineTo(it.x + 3, it.y - 10);
  ctx.lineTo(it.x + 26, it.y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.beginPath();
  ctx.moveTo(it.x - 3, it.y - 40);
  ctx.lineTo(it.x - 3, it.y - 10);
  ctx.lineTo(it.x - 18, it.y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = it.hull;
  ctx.beginPath();
  ctx.moveTo(it.x - 30, it.y - 6);
  ctx.lineTo(it.x + 30, it.y - 6);
  ctx.lineTo(it.x + 22, it.y + 10);
  ctx.lineTo(it.x - 22, it.y + 10);
  ctx.closePath();
  ctx.fill();
}

function drawStones(ctx, it) {
  ctx.fillStyle = 'rgba(90,90,95,0.85)';
  for (let i = 0; i < it.count; i++) {
    ellipse(ctx, it.x - 8 + (i % 2) * 18, it.y - 34 + i * 20, 15, 7);
  }
}

function drawFlowerPatch(ctx, it, rngSpots) {
  for (let i = 0; i < it.count; i++) {
    const [dx, dy] = rngSpots[i % rngSpots.length];
    const fx = it.x + dx, fy = it.y + dy;
    ctx.strokeStyle = '#3f9142';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy - 9);
    ctx.stroke();
    ctx.fillStyle = it.color;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      circle(ctx, fx + Math.cos(a) * 3.6, fy - 11 + Math.sin(a) * 3.6, 2.9);
    }
    ctx.fillStyle = '#ffd94d';
    circle(ctx, fx, fy - 11, 2.2);
  }
}

const FLOWER_SPOTS = [[-16, 0], [4, -8], [18, 2], [-4, 8], [12, 12], [-20, 10]];

const DRAWERS = {
  sun: drawSun,
  moon: drawMoon,
  cloud: drawCloud,
  bird: drawBird,
  star: drawStar,
  rainbow: drawRainbow,
  kite: drawKite,
  houseBody: drawHouseBody,
  roof: drawRoof,
  window: drawWindow,
  door: drawDoor,
  flowerBox: drawFlowerBox,
  cat: drawCat,
  laundry: drawLaundry,
  tree: drawTree,
  fence: drawFence,
  bush: drawBush,
  boat: drawBoat,
  stones: drawStones,
};

// Draw a whole scene variant. `house` items need their body item for the
// chimney position, so it is passed along when present. `now` (ms) drives the
// background's gentle motion only.
export function drawScene(ctx, scene, now = 0) {
  drawBackground(ctx, scene.theme, now / 650);
  const house = scene.items.find((i) => i.kind === 'houseBody');
  for (const it of scene.items) {
    if (it.visible === false) continue;
    if (it.kind === 'chimney') { drawChimney(ctx, it, house); continue; }
    if (it.kind === 'flowerPatch') { drawFlowerPatch(ctx, it, FLOWER_SPOTS); continue; }
    const draw = DRAWERS[it.kind];
    if (draw) draw(ctx, it);
  }
}

// The found-difference marker: a bold ring with a soft pulse halo and a tick.
export function drawMarker(ctx, diff, pulse) {
  const r = Math.max(diff.r, 20) + 6 + pulse * 4;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(diff.x, diff.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#e8323f';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.arc(diff.x, diff.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8323f';
  ctx.beginPath();
  ctx.arc(diff.x + r * 0.72, diff.y - r * 0.72, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  const cx = diff.x + r * 0.72, cy = diff.y - r * 0.72;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx - 1.4, cy + 4);
  ctx.lineTo(cx + 5.4, cy - 4.4);
  ctx.stroke();
  ctx.restore();
}
