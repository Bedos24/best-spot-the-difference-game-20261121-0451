// Scene model for "Spot the Difference": a scene is a flat list of plain-data
// items drawn in order. The altered twin is a deep copy where a few items have
// exactly one visible change each; every change records where its marker goes
// and a short label naming what changed.

import { Rng } from './random.js';

export const VIEW = 600; // scenes are designed on a 600 x 600 grid

export const THEMES = [
  {
    id: 'day',
    title: 'Meadow Cottage — Morning',
    sky: ['#6db6e8', '#e9f8ff'],
    hillFar: '#a5d29a',
    hillNear: '#77b364',
    grass: ['#84c765', '#5da34c'],
    pond: '#45a3c9',
    pondEdge: '#3b8cae',
  },
  {
    id: 'sunset',
    title: 'Meadow Cottage — Golden Hour',
    sky: ['#58498c', '#e2678c', '#ffc06b'],
    hillFar: '#8a6a9e',
    hillNear: '#5f7d4f',
    grass: ['#7ba155', '#55763c'],
    pond: '#8a6ba8',
    pondEdge: '#6f5590',
  },
  {
    id: 'night',
    title: 'Meadow Cottage — Starlight',
    sky: ['#0d1836', '#2c4a7c'],
    hillFar: '#2c5a44',
    hillNear: '#22473a',
    grass: ['#356b45', '#274f33'],
    pond: '#274b73',
    pondEdge: '#1d3a5c',
  },
];

const ROOF_COLORS = ['#c0453a', '#7a4fa3', '#3f6fb5', '#d97b2f'];
const WALL_COLORS = ['#f7e3b0', '#f3c6c6', '#cfe6f5', '#e4f0c0'];
const SAIL_COLORS = ['#ffffff', '#e84f4f', '#ffd94d', '#4f9de8'];
const SHIRT_COLORS = ['#e84f4f', '#4f9de8', '#ffd94d', '#63c96b', '#b07fe8'];
const FLOWER_COLORS = ['#ff6b9d', '#ffd94d', '#ffffff', '#b07fe8', '#ff8c42'];
const CAT_COLORS = ['#3a3a44', '#e8873a', '#e8e4da', '#8a8a96'];

function item(kind, x, y, r, props) {
  return { kind, x, y, r, visible: true, ...props };
}

// Build one scene. Returns { theme, items } with items in draw order.
export function buildScene(seed, themeIndex) {
  const rng = new Rng(seed);
  const theme = THEMES[themeIndex % THEMES.length];
  const night = theme.id === 'night';
  const items = [];

  if (night) {
    items.push(item('moon', 92 + rng.range(-10, 10), 88 + rng.range(-8, 8), 46, { craters: true }));
    for (let i = 0; i < 7; i++) {
      items.push(item('star', rng.range(30, 570), rng.range(20, 210), 13, { s: rng.range(5, 10) }));
    }
  } else {
    items.push(item('sun', 92 + rng.range(-10, 10), 88 + rng.range(-8, 8), 48, { rays: true, face: true }));
    if (theme.id === 'day') items.push(item('rainbow', 310, 398, 90, {}));
  }

  for (let i = 0; i < 4; i++) {
    items.push(item('cloud', 130 + i * 118 + rng.range(-22, 22), 52 + (i % 2) * 56 + rng.range(-10, 10), 40, {
      s: rng.range(0.8, 1.25),
      tint: night ? '#5a6f96' : '#ffffff',
    }));
  }
  for (let i = 0; i < 3; i++) {
    items.push(item('bird', rng.range(180, 540), rng.range(60, 170), 16, { color: night ? '#cfd8ea' : '#33506e', s: rng.range(0.8, 1.2) }));
  }
  if (!night) {
    items.push(item('kite', rng.range(430, 510), rng.range(120, 180), 26, { color: rng.pick(SAIL_COLORS.slice(1)), tail: true }));
  }

  // The cottage, part by part so several differences can live on it.
  const hx = 78, hy = 268, hw = 168, hh = 128;
  items.push(item('houseBody', hx + hw / 2, hy + hh / 2, 92, { x0: hx, y0: hy, w: hw, h: hh, wall: rng.pick(WALL_COLORS) }));
  items.push(item('roof', hx + hw / 2, hy - 16, 62, { x0: hx, y0: hy, w: hw, color: rng.pick(ROOF_COLORS) }));
  items.push(item('chimney', hx + hw - 34, hy - 38, 20, { smoke: true }));
  items.push(item('window', hx + 38, hy + 46, 17, { lit: night }));
  items.push(item('window', hx + hw - 38, hy + 46, 17, { lit: night }));
  items.push(item('door', hx + hw / 2, hy + hh - 34, 20, { open: false, color: '#7a4a2b' }));
  items.push(item('flowerBox', hx + 38, hy + 68, 17, { color: rng.pick(FLOWER_COLORS) }));
  items.push(item('cat', hx + hw + 16, hy + hh - 8, 16, { color: rng.pick(CAT_COLORS) }));
  const ghostCat = item('cat', hx + 26, hy + hh - 8, 16, { color: rng.pick(CAT_COLORS) });
  ghostCat.visible = false;
  items.push(ghostCat);

  items.push(item('laundry', 330, 322, 52, { shirts: [rng.pick(SHIRT_COLORS), rng.pick(SHIRT_COLORS), rng.pick(SHIRT_COLORS)] }));
  items.push(item('tree', 486, 330, 62, { foliage: night ? '#2c5a3c' : '#3f9142', apples: 5, appleColor: '#e84f4f', swing: true }));
  items.push(item('fence', 330, 442, 62, { posts: 5 }));
  items.push(item('bush', 292, 452, 26, { color: night ? '#2c5a3c' : '#4da34f', berries: 4 }));
  items.push(item('bush', 44, 486, 24, { color: night ? '#2c5a3c' : '#4da34f', berries: 3 }));
  items.push(item('boat', 468, 512, 34, { sail: rng.pick(SAIL_COLORS), hull: '#8a5a33' }));
  items.push(item('stones', 168, 520, 46, { count: 4 }));
  for (let i = 0; i < 3; i++) {
    items.push(item('flowerPatch', rng.range(40, 540), rng.range(470, 566), 24, { count: rng.int(4, 6), color: rng.pick(FLOWER_COLORS) }));
  }
  return { theme, items };
}

// One visible change to one item of the copied scene. Returns the marker
// { x, y, r, label } in scene coordinates, or null if the item cannot change.
export function applyMutation(it, rng) {
  const at = (label, r = it.r) => ({ x: it.x, y: it.y, r, label });
  const otherColor = (list, cur) => rng.pick(list.filter((c) => c !== cur));
  switch (it.kind) {
    case 'sun': {
      const which = rng.pick(['rays', 'face', 'move']);
      if (which === 'rays') { it.rays = !it.rays; return at(it.rays ? 'The sun grew rays' : 'The sun lost its rays'); }
      if (which === 'face') { it.face = !it.face; return at(it.face ? 'The sun is smiling now' : 'The sun lost its smile'); }
      it.x += 34; return at('The sun drifted sideways');
    }
    case 'moon': {
      const which = rng.pick(['craters', 'move']);
      if (which === 'craters') { it.craters = !it.craters; return at(it.craters ? 'The moon grew craters' : 'The moon lost its craters'); }
      it.x += 30; return at('The moon drifted sideways');
    }
    case 'star':
      it.visible = !it.visible;
      return at(it.visible ? 'A new star appeared' : 'A star vanished');
    case 'cloud': {
      const which = rng.pick(['move', 'grow', 'tint']);
      if (which === 'move') { it.x += rng.pick([-46, 46]); return at('A cloud drifted away'); }
      if (which === 'grow') { it.s *= 1.35; return at('A cloud puffed up'); }
      it.tint = it.tint === '#ffffff' ? '#ffd9e8' : '#ffffff';
      return at('A cloud turned pink');
    }
    case 'bird': {
      const which = rng.pick(['vanish', 'move', 'color']);
      if (which === 'vanish') { it.visible = false; return at('A bird flew away'); }
      if (which === 'move') { it.y += 26; return at('A bird swooped lower'); }
      it.color = it.color === '#33506e' ? '#e84f4f' : '#33506e';
      return at('A bird changed colour');
    }
    case 'kite': {
      const which = rng.pick(['color', 'tail', 'vanish']);
      if (which === 'color') { it.color = otherColor(SAIL_COLORS.slice(1), it.color); return at('The kite changed colour'); }
      if (which === 'tail') { it.tail = !it.tail; return at(it.tail ? 'The kite grew a tail' : 'The kite lost its tail'); }
      it.visible = false; return at('The kite flew away');
    }
    case 'rainbow':
      it.visible = false;
      return at('The rainbow faded away', 76);
    case 'roof':
      it.color = otherColor(ROOF_COLORS, it.color);
      return at('The roof changed colour');
    case 'houseBody':
      it.wall = otherColor(WALL_COLORS, it.wall);
      return at('The cottage walls changed colour', 96);
    case 'chimney':
      it.smoke = !it.smoke;
      return at(it.smoke ? 'The chimney started smoking' : 'The chimney smoke stopped');
    case 'window':
      it.lit = !it.lit;
      return at(it.lit ? 'A window lit up' : 'A window went dark');
    case 'door': {
      const which = rng.pick(['open', 'color']);
      if (which === 'open') { it.open = !it.open; return at(it.open ? 'The door swung open' : 'The door closed'); }
      it.color = it.color === '#7a4a2b' ? '#3f6fb5' : '#7a4a2b';
      return at('The door changed colour');
    }
    case 'flowerBox':
      it.color = otherColor(FLOWER_COLORS, it.color);
      return at('The window flowers changed colour');
    case 'cat': {
      if (!it.visible) { it.visible = true; return at('A cat appeared'); }
      const which = rng.pick(['color', 'vanish']);
      if (which === 'color') { it.color = otherColor(CAT_COLORS, it.color); return at('The cat changed colour'); }
      it.visible = false; return at('The cat wandered off');
    }
    case 'laundry': {
      const which = rng.pick(['shirt', 'count']);
      if (which === 'shirt') {
        const i = rng.int(0, it.shirts.length - 1);
        it.shirts[i] = otherColor(SHIRT_COLORS, it.shirts[i]);
        return at('A shirt on the line changed colour');
      }
      if (it.shirts.length > 2) { it.shirts.pop(); return at('A shirt vanished from the line'); }
      it.shirts.push(rng.pick(SHIRT_COLORS));
      return at('An extra shirt appeared on the line');
    }
    case 'tree': {
      const which = rng.pick(['apples', 'appleColor', 'swing', 'foliage']);
      if (which === 'apples') { it.apples += rng.pick([-2, 2]); return at('The apples on the tree changed in number'); }
      if (which === 'appleColor') { it.appleColor = it.appleColor === '#e84f4f' ? '#ffd94d' : '#e84f4f'; return at('The apples changed colour'); }
      if (which === 'swing') { it.swing = !it.swing; return at(it.swing ? 'A swing appeared on the tree' : 'The swing vanished from the tree'); }
      it.foliage = it.foliage === '#3f9142' ? '#e8873a' : '#3f9142';
      return at('The tree changed colour');
    }
    case 'fence':
      it.posts += rng.pick([-1, 1]);
      return at(it.posts > 5 ? 'An extra fence post appeared' : 'A fence post vanished');
    case 'bush': {
      const which = rng.pick(['berries', 'color']);
      if (which === 'berries') { it.berries += rng.pick([-2, 2]); return at('The berries on a bush changed in number'); }
      it.color = it.color === '#4da34f' ? '#7a4fa3' : '#4da34f';
      return at('A bush changed colour');
    }
    case 'boat': {
      const which = rng.pick(['sail', 'move', 'vanish']);
      if (which === 'sail') { it.sail = otherColor(SAIL_COLORS, it.sail); return at("The boat's sail changed colour"); }
      if (which === 'move') { it.x -= 52; return at('The boat drifted across the pond'); }
      it.visible = false; return at('The boat sailed away');
    }
    case 'stones':
      it.count += rng.pick([-1, 1]);
      return at(it.count > 4 ? 'An extra stepping stone appeared' : 'A stepping stone vanished');
    case 'flowerPatch': {
      const which = rng.pick(['count', 'color']);
      if (which === 'count') { it.count += rng.pick([-2, 2]); return at('The flowers changed in number'); }
      it.color = otherColor(FLOWER_COLORS, it.color);
      return at('A patch of flowers changed colour');
    }
    default:
      return null;
  }
}

// Pick `count` distinct items, change each once, and return the altered scene
// plus the list of differences (marker + label + found flag).
export function makeDifferences(scene, count, seed) {
  const rng = new Rng(seed);
  const altered = structuredClone(scene);
  const candidates = rng.shuffle(altered.items.map((_, i) => i));
  const differences = [];
  for (const idx of candidates) {
    if (differences.length >= count) break;
    const before = JSON.stringify(altered.items[idx]);
    const marker = applyMutation(altered.items[idx], rng);
    if (!marker) continue;
    if (JSON.stringify(altered.items[idx]) === before) continue; // no visible change
    differences.push({ ...marker, found: false });
  }
  return { altered, differences };
}
