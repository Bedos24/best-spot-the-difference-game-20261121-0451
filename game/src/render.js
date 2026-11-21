// Painting scenes onto canvas.
//
// drawScene receives a 2d context already transformed into scene space
// (600 x 600) and walks the scene's item list, handing each item to the
// painter registered for its kind in ART below. Two kinds break the
// one-argument pattern — the chimney is placed relative to the cottage
// body, and flower patches loop over their own offsets — so drawScene
// special-cases them.

// -- Tiny filled-shape shortcuts ---------------------------------------------
// Each one opens a path, traces the shape and fills it with whatever
// fillStyle is current; callers set the style first.

function dot(g, cx, cy, r) {
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
}

function egg(g, cx, cy, rx, ry) {
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function panel(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

function tri(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fill();
}

// -- The backdrop --------------------------------------------------------------
// Sky, two hill silhouettes, meadow, pond. The only motion in the whole
// game lives here: `phase` nudges the pond ripples, and ripples are never
// something a difference can hide in.

function hill(g, colour, c1, e1, c2, e2) {
  g.fillStyle = colour;
  g.beginPath();
  g.moveTo(0, 400);
  g.quadraticCurveTo(c1[0], c1[1], e1[0], e1[1]);
  g.quadraticCurveTo(c2[0], c2[1], e2[0], e2[1]);
  g.lineTo(600, 400);
  g.closePath();
  g.fill();
}

function paintBackdrop(g, th, phase) {
  const skyGrad = g.createLinearGradient(0, 0, 0, 400);
  th.sky.forEach((colour, i) => skyGrad.addColorStop(i / (th.sky.length - 1), colour));
  g.fillStyle = skyGrad;
  g.fillRect(0, 0, 600, 400);

  hill(g, th.hillFar, [120, 300], [260, 372], [400, 428], [600, 348]);
  hill(g, th.hillNear, [180, 348], [340, 392], [480, 424], [600, 386]);

  const grassGrad = g.createLinearGradient(0, 392, 0, 600);
  grassGrad.addColorStop(0, th.grass[0]);
  grassGrad.addColorStop(1, th.grass[1]);
  g.fillStyle = grassGrad;
  g.fillRect(0, 392, 600, 208);

  g.fillStyle = th.pondEdge;
  egg(g, 468, 522, 128, 60);
  g.fillStyle = th.pond;
  egg(g, 468, 518, 120, 54);

  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2;
  const ripples = [[420, 506, 22], [505, 534, 28], [452, 544, 14]];
  for (const [rx, ry, rw] of ripples) {
    const wobble = Math.sin(phase * 1.4 + ry) * 3;
    g.beginPath();
    g.ellipse(rx + Math.sin(phase + rx) * 5, ry, rw + wobble, 5, 0, 0, Math.PI * 2);
    g.stroke();
  }
}

// -- Painters, one per item kind ------------------------------------------------

const ART = {
  sun(g, it) {
    if (it.rays) {
      g.strokeStyle = '#ffb52e';
      g.lineWidth = 6;
      g.lineCap = 'round';
      for (let k = 0; k < 8; k += 1) {
        const ang = (k / 8) * Math.PI * 2 + 0.4;
        g.beginPath();
        g.moveTo(it.x + Math.cos(ang) * 44, it.y + Math.sin(ang) * 44);
        g.lineTo(it.x + Math.cos(ang) * 58, it.y + Math.sin(ang) * 58);
        g.stroke();
      }
    }
    g.fillStyle = '#ffd94d';
    dot(g, it.x, it.y, 34);
    g.fillStyle = '#ffdf7e';
    dot(g, it.x - 8, it.y - 8, 24);
    if (it.face) {
      g.fillStyle = '#8a5a12';
      dot(g, it.x - 11, it.y - 3, 3.4);
      dot(g, it.x + 11, it.y - 3, 3.4);
      g.strokeStyle = '#8a5a12';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(it.x, it.y + 4, 13, 0.25, Math.PI - 0.25);
      g.stroke();
    }
  },

  moon(g, it) {
    g.fillStyle = '#f4f1de';
    dot(g, it.x, it.y, 30);
    g.fillStyle = '#e6e1c8';
    dot(g, it.x - 12, it.y - 10, 20);
    if (it.craters) {
      g.fillStyle = '#d8d2b4';
      dot(g, it.x + 8, it.y + 6, 6);
      dot(g, it.x - 4, it.y + 14, 4.4);
      dot(g, it.x + 14, it.y - 12, 4.8);
    }
  },

  star(g, it) {
    g.fillStyle = '#ffeeb0';
    g.beginPath();
    for (let k = 0; k < 10; k += 1) {
      const ang = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const rad = k % 2 === 0 ? it.s : it.s * 0.45;
      const px = it.x + Math.cos(ang) * rad;
      const py = it.y + Math.sin(ang) * rad;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  },

  cloud(g, it) {
    const s = it.s;
    g.fillStyle = it.tint;
    egg(g, it.x, it.y, 40 * s, 20 * s);
    egg(g, it.x - 26 * s, it.y + 5 * s, 26 * s, 15 * s);
    egg(g, it.x + 27 * s, it.y + 5 * s, 28 * s, 16 * s);
    egg(g, it.x + 2 * s, it.y - 11 * s, 27 * s, 17 * s);
  },

  bird(g, it) {
    const s = it.s;
    g.strokeStyle = it.color;
    g.lineWidth = 3.4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(it.x - 13 * s, it.y);
    g.quadraticCurveTo(it.x - 5 * s, it.y - 9 * s, it.x, it.y);
    g.quadraticCurveTo(it.x + 5 * s, it.y - 9 * s, it.x + 13 * s, it.y);
    g.stroke();
  },

  rainbow(g, it) {
    const bands = ['#e84f4f', '#ff8c42', '#ffd94d', '#63c96b', '#4f9de8', '#b07fe8'];
    g.lineWidth = 11;
    bands.forEach((colour, i) => {
      g.strokeStyle = colour;
      g.globalAlpha = 0.75;
      g.beginPath();
      g.arc(it.x, it.y, 196 - i * 11, Math.PI, Math.PI * 2);
      g.stroke();
    });
    g.globalAlpha = 1;
  },

  kite(g, it) {
    g.save();
    g.translate(it.x, it.y);
    g.rotate(0.5);
    g.fillStyle = it.color;
    tri(g, [[0, -22], [16, 0], [0, 22], [-16, 0]]);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    tri(g, [[0, -22], [16, 0], [0, 0]]);
    g.restore();

    g.strokeStyle = 'rgba(60,60,70,0.65)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(it.x + 8, it.y + 18);
    g.quadraticCurveTo(it.x + 20, it.y + 52, it.x + 6, it.y + 84);
    g.stroke();

    if (it.tail) {
      g.fillStyle = it.color;
      for (let k = 0; k < 3; k += 1) {
        const t = k / 3;
        g.save();
        g.translate(it.x + 8 + Math.sin(t * 4) * 7 + t * -2, it.y + 30 + t * 48);
        g.rotate(0.6);
        g.fillRect(-5, -3, 10, 6);
        g.restore();
      }
    }
  },

  houseBody(g, it) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    egg(g, it.x0 + it.w / 2, it.y0 + it.h + 8, it.w * 0.58, 10);
    g.fillStyle = it.wall;
    panel(g, it.x0, it.y0, it.w, it.h, 6);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(it.x0, it.y0 + it.h - 12, it.w, 12);
  },

  roof(g, it) {
    const apex = [it.x0 + it.w / 2, it.y0 - 52];
    g.fillStyle = it.color;
    tri(g, [[it.x0 - 14, it.y0 + 6], apex, [it.x0 + it.w + 14, it.y0 + 6]]);
    g.fillStyle = 'rgba(255,255,255,0.16)';
    tri(g, [[it.x0 - 14, it.y0 + 6], apex, [it.x0 + it.w / 2, it.y0 + 6]]);
  },

  window(g, it) {
    g.fillStyle = '#6b4a2f';
    panel(g, it.x - 13, it.y - 15, 26, 30, 4);
    g.fillStyle = it.lit ? '#ffd94d' : '#bcd9ea';
    g.fillRect(it.x - 10, it.y - 12, 20, 24);
    g.strokeStyle = '#6b4a2f';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(it.x, it.y - 12);
    g.lineTo(it.x, it.y + 12);
    g.moveTo(it.x - 10, it.y);
    g.lineTo(it.x + 10, it.y);
    g.stroke();
    if (it.lit) {
      g.fillStyle = 'rgba(255,217,77,0.25)';
      dot(g, it.x, it.y, 24);
    }
  },

  door(g, it) {
    g.fillStyle = '#5d3d22';
    panel(g, it.x - 15, it.y - 32, 30, 64, 5);
    g.fillStyle = it.open ? '#2e1d10' : it.color;
    panel(g, it.x - 12, it.y - 29, 24, 58, 4);
    g.fillStyle = '#ffd94d';
    dot(g, it.open ? it.x - 8 : it.x + 7, it.y + 2, 2.8);
  },

  flowerBox(g, it) {
    g.fillStyle = '#8a5a33';
    g.fillRect(it.x - 14, it.y - 2, 28, 9);
    for (let k = 0; k < 3; k += 1) {
      const fx = it.x - 9 + k * 9;
      g.strokeStyle = '#3f9142';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(fx, it.y - 2);
      g.lineTo(fx, it.y - 9);
      g.stroke();
      g.fillStyle = it.color;
      dot(g, fx, it.y - 11, 4);
    }
  },

  cat(g, it) {
    g.fillStyle = it.color;
    egg(g, it.x, it.y - 6, 13, 8);
    dot(g, it.x + 11, it.y - 13, 7);
    g.beginPath();
    g.moveTo(it.x + 6, it.y - 17);
    g.lineTo(it.x + 8, it.y - 23);
    g.lineTo(it.x + 11, it.y - 18);
    g.moveTo(it.x + 12, it.y - 18);
    g.lineTo(it.x + 15, it.y - 23);
    g.lineTo(it.x + 17, it.y - 17);
    g.fill();
    g.strokeStyle = it.color;
    g.lineWidth = 3.4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(it.x - 12, it.y - 8);
    g.quadraticCurveTo(it.x - 20, it.y - 14, it.x - 17, it.y - 22);
    g.stroke();
  },

  laundry(g, it) {
    const left = it.x - 62;
    const right = it.x + 62;
    const lineY = it.y - 44;
    g.strokeStyle = '#7a6a55';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(left, lineY + 62);
    g.lineTo(left, lineY);
    g.moveTo(right, lineY + 62);
    g.lineTo(right, lineY);
    g.stroke();
    g.strokeStyle = 'rgba(50,40,30,0.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(left, lineY);
    g.lineTo(right, lineY);
    g.stroke();

    const n = it.shirts.length;
    it.shirts.forEach((colour, i) => {
      const sx = left + ((i + 0.5) / n) * (right - left);
      g.fillStyle = colour;
      panel(g, sx - 13, lineY + 2, 26, 30, 4);
      g.fillStyle = 'rgba(0,0,0,0.10)';
      g.fillRect(sx - 13, lineY + 24, 26, 8);
    });
  },

  tree(g, it) {
    // Trunk first, then the swing that hangs off it, then the canopy.
    g.fillStyle = '#7a4a2b';
    g.beginPath();
    g.moveTo(it.x - 9, it.y + 66);
    g.quadraticCurveTo(it.x - 4, it.y, it.x - 12, it.y - 26);
    g.lineTo(it.x + 12, it.y - 26);
    g.quadraticCurveTo(it.x + 4, it.y, it.x + 9, it.y + 66);
    g.closePath();
    g.fill();

    if (it.swing) {
      g.strokeStyle = 'rgba(60,40,20,0.8)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(it.x - 34, it.y - 18);
      g.lineTo(it.x - 34, it.y + 22);
      g.moveTo(it.x - 14, it.y - 18);
      g.lineTo(it.x - 14, it.y + 22);
      g.stroke();
      g.fillStyle = '#a5713d';
      g.fillRect(it.x - 40, it.y + 22, 32, 6);
    }

    g.fillStyle = it.foliage;
    dot(g, it.x, it.y - 62, 44);
    dot(g, it.x - 36, it.y - 34, 32);
    dot(g, it.x + 36, it.y - 34, 32);
    dot(g, it.x, it.y - 30, 36);
    g.fillStyle = 'rgba(255,255,255,0.10)';
    dot(g, it.x - 14, it.y - 70, 22);

    // Apples sit on fixed hooks in the canopy, so a changed count never
    // looks like the remaining apples moved house.
    const hooks = [[-24, -48], [16, -66], [30, -30], [-6, -26], [-34, -22], [8, -84], [38, -52], [-16, -70]];
    g.fillStyle = it.appleColor;
    const shown = Math.min(it.apples, hooks.length);
    for (let k = 0; k < shown; k += 1) dot(g, it.x + hooks[k][0], it.y + hooks[k][1], 5.4);
  },

  fence(g, it) {
    const startX = it.x - 66;
    const spacing = 132 / Math.max(it.posts - 1, 1);
    g.fillStyle = '#c9a06a';
    for (let k = 0; k < it.posts; k += 1) {
      const px = startX + k * spacing;
      g.fillRect(px - 4, it.y - 20, 8, 38);
      tri(g, [[px - 4, it.y - 20], [px, it.y - 27], [px + 4, it.y - 20]]);
    }
    g.fillRect(startX - 6, it.y - 12, 144, 5);
    g.fillRect(startX - 6, it.y + 4, 144, 5);
  },

  bush(g, it) {
    g.fillStyle = it.color;
    dot(g, it.x, it.y, 20);
    dot(g, it.x - 15, it.y + 6, 14);
    dot(g, it.x + 15, it.y + 6, 14);
    const berrySpots = [[-9, -6], [7, -10], [12, 4], [-13, 5], [0, 8]];
    g.fillStyle = '#e84f6b';
    const shown = Math.min(it.berries, berrySpots.length);
    for (let k = 0; k < shown; k += 1) dot(g, it.x + berrySpots[k][0], it.y + berrySpots[k][1], 3.4);
  },

  boat(g, it) {
    g.strokeStyle = '#6b4a2f';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(it.x, it.y - 6);
    g.lineTo(it.x, it.y - 46);
    g.stroke();

    g.fillStyle = it.sail;
    tri(g, [[it.x + 3, it.y - 44], [it.x + 3, it.y - 10], [it.x + 26, it.y - 10]]);
    g.fillStyle = 'rgba(0,0,0,0.10)';
    tri(g, [[it.x - 3, it.y - 40], [it.x - 3, it.y - 10], [it.x - 18, it.y - 10]]);
    g.fillStyle = it.hull;
    tri(g, [[it.x - 30, it.y - 6], [it.x + 30, it.y - 6], [it.x + 22, it.y + 10], [it.x - 22, it.y + 10]]);
  },

  stones(g, it) {
    g.fillStyle = 'rgba(90,90,95,0.85)';
    for (let k = 0; k < it.count; k += 1) {
      egg(g, it.x - 8 + (k % 2) * 18, it.y - 34 + k * 20, 15, 7);
    }
  },
};

// The chimney's position is derived from the cottage body rather than its
// own item coordinates, so it cannot use the one-argument ART pattern.
function paintChimney(g, it, house) {
  const x = house.x0 + house.w - 48;
  const y = house.y0 - 58;
  if (it.smoke) {
    g.fillStyle = 'rgba(240,240,245,0.75)';
    dot(g, x + 8, y - 16, 8);
    dot(g, x + 16, y - 30, 11);
    dot(g, x + 27, y - 46, 14);
  }
  g.fillStyle = '#9a5a4a';
  g.fillRect(x, y, 20, 34);
  g.fillStyle = '#7c463a';
  g.fillRect(x - 3, y - 5, 26, 8);
}

// Flower patches bloom on a fixed ring of offsets, again so a changed
// count reads as flowers gained or lost, not flowers rearranged.
const PATCH_SPOTS = [[-16, 0], [4, -8], [18, 2], [-4, 8], [12, 12], [-20, 10]];

function paintFlowerPatch(g, it) {
  for (let k = 0; k < it.count; k += 1) {
    const [dx, dy] = PATCH_SPOTS[k % PATCH_SPOTS.length];
    const fx = it.x + dx;
    const fy = it.y + dy;
    g.strokeStyle = '#3f9142';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(fx, fy);
    g.lineTo(fx, fy - 9);
    g.stroke();
    g.fillStyle = it.color;
    for (let p = 0; p < 5; p += 1) {
      const ang = (p / 5) * Math.PI * 2;
      dot(g, fx + Math.cos(ang) * 3.6, fy - 11 + Math.sin(ang) * 3.6, 2.9);
    }
    g.fillStyle = '#ffd94d';
    dot(g, fx, fy - 11, 2.2);
  }
}

// Paint one whole picture. `nowMs` feeds only the backdrop's ripple phase.
export function drawScene(g, scene, nowMs = 0) {
  paintBackdrop(g, scene.theme, nowMs / 650);
  const house = scene.items.find((entry) => entry.kind === 'houseBody');
  for (const it of scene.items) {
    if (it.visible === false) continue;
    if (it.kind === 'chimney') paintChimney(g, it, house);
    else if (it.kind === 'flowerPatch') paintFlowerPatch(g, it);
    else if (ART[it.kind]) ART[it.kind](g, it);
  }
}

// The ring laid over a difference once it has been found: a white halo, a
// red ring inside it, and a little tick badge up at the ring's top-right.
// `pulse` (0..1) breathes the ring's radius.
export function drawMarker(g, diff, pulse) {
  const radius = Math.max(diff.r, 20) + 6 + pulse * 4;
  g.save();

  const ringPasses = [['rgba(255,255,255,0.9)', 7], ['#e8323f', 4.4]];
  for (const [style, width] of ringPasses) {
    g.strokeStyle = style;
    g.lineWidth = width;
    g.beginPath();
    g.arc(diff.x, diff.y, radius, 0, Math.PI * 2);
    g.stroke();
  }

  const bx = diff.x + radius * 0.72;
  const by = diff.y - radius * 0.72;
  g.fillStyle = '#e8323f';
  dot(g, bx, by, 11);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(bx - 5, by);
  g.lineTo(bx - 1.4, by + 4);
  g.lineTo(bx + 5.4, by - 4.4);
  g.stroke();

  g.restore();
}
