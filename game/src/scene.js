// Scene data for Twin Meadows.
//
// A scene is nothing but a list of plain item objects; render.js walks the
// list front to back and paints each one. The "altered" picture is a deep
// copy of the same list where a handful of items carry exactly one change
// apiece, and every change remembers where its found-ring goes and what to
// call itself in the found log.

import { Rng } from './random.js';

// Scenes are composed on a square grid of this size; all coordinates in
// this file (and in the markers) live in that space.
export const VIEW = 600;

// --- The three times of day ------------------------------------------------

function theme(id, title, sky, hillFar, hillNear, grass, pond, pondEdge) {
  return { id, title, sky, hillFar, hillNear, grass, pond, pondEdge };
}

export const THEMES = [
  theme('day', 'Meadow Cottage — Morning',
    ['#6db6e8', '#e9f8ff'], '#a5d29a', '#77b364',
    ['#84c765', '#5da34c'], '#45a3c9', '#3b8cae'),
  theme('sunset', 'Meadow Cottage — Golden Hour',
    ['#58498c', '#e2678c', '#ffc06b'], '#8a6a9e', '#5f7d4f',
    ['#7ba155', '#55763c'], '#8a6ba8', '#6f5590'),
  theme('night', 'Meadow Cottage — Starlight',
    ['#0d1836', '#2c4a7c'], '#2c5a44', '#22473a',
    ['#356b45', '#274f33'], '#274b73', '#1d3a5c'),
];

// --- Paint pots the builder and the mutator pick from ----------------------
// A colour mutation always excludes the colour already worn, so a "changed
// colour" difference can never come out invisible.

const ROOF_PAINTS = ['#c0453a', '#7a4fa3', '#3f6fb5', '#d97b2f'];
const WALL_PAINTS = ['#f7e3b0', '#f3c6c6', '#cfe6f5', '#e4f0c0'];
const SAIL_PAINTS = ['#ffffff', '#e84f4f', '#ffd94d', '#4f9de8'];
const SHIRT_PAINTS = ['#e84f4f', '#4f9de8', '#ffd94d', '#63c96b', '#b07fe8'];
const FLOWER_PAINTS = ['#ff6b9d', '#ffd94d', '#ffffff', '#b07fe8', '#ff8c42'];
const CAT_PAINTS = ['#3a3a44', '#e8873a', '#e8e4da', '#8a8a96'];

// --- Items ------------------------------------------------------------------

// One drawable thing. `r` is a rough radius: it sizes the found-ring and
// forgives clicks that land near the item rather than dead on it.
function spawn(kind, x, y, r, extra = {}) {
  return Object.assign({ kind, x, y, r, visible: true }, extra);
}

// Sky furniture first: sun or moon, then clouds and birds, then the kite.
// The order in which `dice` is consulted here is part of the game's
// definition — it fixes every position for a given seed.
function populateSky(dice, items, th) {
  const night = th.id === 'night';

  if (night) {
    items.push(spawn('moon', 92 + dice.span(-10, 10), 88 + dice.span(-8, 8), 46, { craters: true }));
    for (let n = 0; n < 7; n += 1) {
      const sx = dice.span(30, 570);
      const sy = dice.span(20, 210);
      items.push(spawn('star', sx, sy, 13, { s: dice.span(5, 10) }));
    }
  } else {
    items.push(spawn('sun', 92 + dice.span(-10, 10), 88 + dice.span(-8, 8), 48, { rays: true, face: true }));
    if (th.id === 'day') items.push(spawn('rainbow', 310, 398, 90));
  }

  for (let n = 0; n < 4; n += 1) {
    const cx = 130 + n * 118 + dice.span(-22, 22);
    const cy = 52 + (n % 2) * 56 + dice.span(-10, 10);
    items.push(spawn('cloud', cx, cy, 40, { s: dice.span(0.8, 1.25), tint: night ? '#5a6f96' : '#ffffff' }));
  }
  for (let n = 0; n < 3; n += 1) {
    const bx = dice.span(180, 540);
    const by = dice.span(60, 170);
    items.push(spawn('bird', bx, by, 16, { color: night ? '#cfd8ea' : '#33506e', s: dice.span(0.8, 1.2) }));
  }
  if (!night) {
    const kx = dice.span(430, 510);
    const ky = dice.span(120, 180);
    items.push(spawn('kite', kx, ky, 26, { color: dice.choose(SAIL_PAINTS.slice(1)), tail: true }));
  }
}

// The cottage is assembled piece by piece — walls, roof, chimney, windows,
// door, flower box, cats — precisely so several differences can live on
// the one building at the same time.
function buildCottage(dice, items, th) {
  const night = th.id === 'night';
  const hx = 78;
  const hy = 268;
  const hw = 168;
  const hh = 128;

  items.push(spawn('houseBody', hx + hw / 2, hy + hh / 2, 92,
    { x0: hx, y0: hy, w: hw, h: hh, wall: dice.choose(WALL_PAINTS) }));
  items.push(spawn('roof', hx + hw / 2, hy - 16, 62,
    { x0: hx, y0: hy, w: hw, color: dice.choose(ROOF_PAINTS) }));
  items.push(spawn('chimney', hx + hw - 34, hy - 38, 20, { smoke: true }));
  items.push(spawn('window', hx + 38, hy + 46, 17, { lit: night }));
  items.push(spawn('window', hx + hw - 38, hy + 46, 17, { lit: night }));
  items.push(spawn('door', hx + hw / 2, hy + hh - 34, 20, { open: false, color: '#7a4a2b' }));
  items.push(spawn('flowerBox', hx + 38, hy + 68, 17, { color: dice.choose(FLOWER_PAINTS) }));
  items.push(spawn('cat', hx + hw + 16, hy + hh - 8, 16, { color: dice.choose(CAT_PAINTS) }));

  // The second cat starts out invisible; one mutation is "a cat appeared".
  const shyCat = spawn('cat', hx + 26, hy + hh - 8, 16, { color: dice.choose(CAT_PAINTS) });
  shyCat.visible = false;
  items.push(shyCat);
}

// Everything that is not sky or cottage: laundry, tree, fence, bushes,
// boat, stepping stones, flower patches.
function fillMeadow(dice, items, th) {
  const night = th.id === 'night';
  const greens = night ? '#2c5a3c' : '#4da34f';

  items.push(spawn('laundry', 330, 322, 52,
    { shirts: [dice.choose(SHIRT_PAINTS), dice.choose(SHIRT_PAINTS), dice.choose(SHIRT_PAINTS)] }));
  items.push(spawn('tree', 486, 330, 62,
    { foliage: night ? '#2c5a3c' : '#3f9142', apples: 5, appleColor: '#e84f4f', swing: true }));
  items.push(spawn('fence', 330, 442, 62, { posts: 5 }));
  items.push(spawn('bush', 292, 452, 26, { color: greens, berries: 4 }));
  items.push(spawn('bush', 44, 486, 24, { color: greens, berries: 3 }));
  items.push(spawn('boat', 468, 512, 34, { sail: dice.choose(SAIL_PAINTS), hull: '#8a5a33' }));
  items.push(spawn('stones', 168, 520, 46, { count: 4 }));
  for (let n = 0; n < 3; n += 1) {
    const fx = dice.span(40, 540);
    const fy = dice.span(470, 566);
    items.push(spawn('flowerPatch', fx, fy, 24,
      { count: dice.whole(4, 6), color: dice.choose(FLOWER_PAINTS) }));
  }
}

// Compose one scene: { theme, items } with items in paint order.
export function buildScene(seed, themeIndex) {
  const dice = new Rng(seed);
  const th = THEMES[themeIndex % THEMES.length];
  const items = [];
  populateSky(dice, items, th);
  buildCottage(dice, items, th);
  fillMeadow(dice, items, th);
  return { theme: th, items };
}

// --- Mutations ---------------------------------------------------------------
// Each handler changes its item exactly once, in a way a player can see,
// and returns the marker for the change. `mark(label, r?)` builds the
// marker at the item's centre. Handlers that cannot change their item are
// simply absent from the table.

function repaint(dice, paints, current) {
  return dice.choose(paints.filter((p) => p !== current));
}

const MUTATORS = {
  sun(dice, it, mark) {
    const what = dice.choose(['rays', 'face', 'move']);
    if (what === 'rays') {
      it.rays = !it.rays;
      return mark(it.rays ? 'The sun grew rays' : 'The sun lost its rays');
    }
    if (what === 'face') {
      it.face = !it.face;
      return mark(it.face ? 'The sun is smiling now' : 'The sun lost its smile');
    }
    it.x += 34;
    return mark('The sun drifted sideways');
  },

  moon(dice, it, mark) {
    if (dice.choose(['craters', 'move']) === 'craters') {
      it.craters = !it.craters;
      return mark(it.craters ? 'The moon grew craters' : 'The moon lost its craters');
    }
    it.x += 30;
    return mark('The moon drifted sideways');
  },

  star(dice, it, mark) {
    it.visible = !it.visible;
    return mark(it.visible ? 'A new star appeared' : 'A star vanished');
  },

  cloud(dice, it, mark) {
    const what = dice.choose(['move', 'grow', 'tint']);
    if (what === 'move') {
      it.x += dice.choose([-46, 46]);
      return mark('A cloud drifted away');
    }
    if (what === 'grow') {
      it.s *= 1.35;
      return mark('A cloud puffed up');
    }
    it.tint = it.tint === '#ffffff' ? '#ffd9e8' : '#ffffff';
    return mark('A cloud turned pink');
  },

  bird(dice, it, mark) {
    const what = dice.choose(['vanish', 'move', 'color']);
    if (what === 'vanish') {
      it.visible = false;
      return mark('A bird flew away');
    }
    if (what === 'move') {
      it.y += 26;
      return mark('A bird swooped lower');
    }
    it.color = it.color === '#33506e' ? '#e84f4f' : '#33506e';
    return mark('A bird changed colour');
  },

  kite(dice, it, mark) {
    const what = dice.choose(['color', 'tail', 'vanish']);
    if (what === 'color') {
      it.color = repaint(dice, SAIL_PAINTS.slice(1), it.color);
      return mark('The kite changed colour');
    }
    if (what === 'tail') {
      it.tail = !it.tail;
      return mark(it.tail ? 'The kite grew a tail' : 'The kite lost its tail');
    }
    it.visible = false;
    return mark('The kite flew away');
  },

  rainbow(dice, it, mark) {
    it.visible = false;
    return mark('The rainbow faded away', 76);
  },

  roof(dice, it, mark) {
    it.color = repaint(dice, ROOF_PAINTS, it.color);
    return mark('The roof changed colour');
  },

  houseBody(dice, it, mark) {
    it.wall = repaint(dice, WALL_PAINTS, it.wall);
    return mark('The cottage walls changed colour', 96);
  },

  chimney(dice, it, mark) {
    it.smoke = !it.smoke;
    return mark(it.smoke ? 'The chimney started smoking' : 'The chimney smoke stopped');
  },

  window(dice, it, mark) {
    it.lit = !it.lit;
    return mark(it.lit ? 'A window lit up' : 'A window went dark');
  },

  door(dice, it, mark) {
    if (dice.choose(['open', 'color']) === 'open') {
      it.open = !it.open;
      return mark(it.open ? 'The door swung open' : 'The door closed');
    }
    it.color = it.color === '#7a4a2b' ? '#3f6fb5' : '#7a4a2b';
    return mark('The door changed colour');
  },

  flowerBox(dice, it, mark) {
    it.color = repaint(dice, FLOWER_PAINTS, it.color);
    return mark('The window flowers changed colour');
  },

  cat(dice, it, mark) {
    if (!it.visible) {
      it.visible = true;
      return mark('A cat appeared');
    }
    if (dice.choose(['color', 'vanish']) === 'color') {
      it.color = repaint(dice, CAT_PAINTS, it.color);
      return mark('The cat changed colour');
    }
    it.visible = false;
    return mark('The cat wandered off');
  },

  laundry(dice, it, mark) {
    if (dice.choose(['shirt', 'count']) === 'shirt') {
      const i = dice.whole(0, it.shirts.length - 1);
      it.shirts[i] = repaint(dice, SHIRT_PAINTS, it.shirts[i]);
      return mark('A shirt on the line changed colour');
    }
    if (it.shirts.length > 2) {
      it.shirts.pop();
      return mark('A shirt vanished from the line');
    }
    it.shirts.push(dice.choose(SHIRT_PAINTS));
    return mark('An extra shirt appeared on the line');
  },

  tree(dice, it, mark) {
    const what = dice.choose(['apples', 'appleColor', 'swing', 'foliage']);
    if (what === 'apples') {
      it.apples += dice.choose([-2, 2]);
      return mark('The apples on the tree changed in number');
    }
    if (what === 'appleColor') {
      it.appleColor = it.appleColor === '#e84f4f' ? '#ffd94d' : '#e84f4f';
      return mark('The apples changed colour');
    }
    if (what === 'swing') {
      it.swing = !it.swing;
      return mark(it.swing ? 'A swing appeared on the tree' : 'The swing vanished from the tree');
    }
    it.foliage = it.foliage === '#3f9142' ? '#e8873a' : '#3f9142';
    return mark('The tree changed colour');
  },

  fence(dice, it, mark) {
    it.posts += dice.choose([-1, 1]);
    return mark(it.posts > 5 ? 'An extra fence post appeared' : 'A fence post vanished');
  },

  bush(dice, it, mark) {
    if (dice.choose(['berries', 'color']) === 'berries') {
      it.berries += dice.choose([-2, 2]);
      return mark('The berries on a bush changed in number');
    }
    it.color = it.color === '#4da34f' ? '#7a4fa3' : '#4da34f';
    return mark('A bush changed colour');
  },

  boat(dice, it, mark) {
    const what = dice.choose(['sail', 'move', 'vanish']);
    if (what === 'sail') {
      it.sail = repaint(dice, SAIL_PAINTS, it.sail);
      return mark("The boat's sail changed colour");
    }
    if (what === 'move') {
      it.x -= 52;
      return mark('The boat drifted across the pond');
    }
    it.visible = false;
    return mark('The boat sailed away');
  },

  stones(dice, it, mark) {
    it.count += dice.choose([-1, 1]);
    return mark(it.count > 4 ? 'An extra stepping stone appeared' : 'A stepping stone vanished');
  },

  flowerPatch(dice, it, mark) {
    if (dice.choose(['count', 'color']) === 'count') {
      it.count += dice.choose([-2, 2]);
      return mark('The flowers changed in number');
    }
    it.color = repaint(dice, FLOWER_PAINTS, it.color);
    return mark('A patch of flowers changed colour');
  },
};

// Change one item of a copied scene. Returns the change's marker, or null
// for kinds that have no mutation.
export function applyMutation(it, rng) {
  const handler = MUTATORS[it.kind];
  if (!handler) return null;
  const mark = (label, r = it.r) => ({ x: it.x, y: it.y, r, label });
  return handler(rng, it, mark);
}

// Produce the altered twin of a scene: deep-copy it, walk the copy in a
// shuffled order, and mutate each visited item at most once until `count`
// differences exist. A mutation whose result serializes identically to
// the original is thrown away, so every reported difference is real.
export function makeDifferences(scene, count, seed) {
  const dice = new Rng(seed);
  const altered = structuredClone(scene);
  const order = dice.scramble(altered.items.map((_, idx) => idx));
  const differences = [];
  for (const idx of order) {
    if (differences.length >= count) break;
    const target = altered.items[idx];
    const snapshot = JSON.stringify(target);
    const marker = applyMutation(target, dice);
    if (marker === null) continue;
    if (JSON.stringify(target) === snapshot) continue;
    differences.push({ ...marker, found: false });
  }
  return { altered, differences };
}
