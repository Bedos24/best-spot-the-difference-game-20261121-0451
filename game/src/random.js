// Deterministic dice for Twin Meadows.
//
// Everything in a round — where the clouds drift, which shirt hangs where,
// which items the twin picture changes — is drawn from one seeded stream,
// so a seed always grows the same scene and the screenshot poses in
// shots.json come out identical every time.

// mulberry32: a compact 32-bit generator with a good spread for its size.
// The arithmetic below is the algorithm; do not "tidy" it, because every
// scene layout in the game depends on this exact sequence of outputs.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let z = a;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// Dice: the friendly face of the raw stream. One instance per job — the
// scene builder takes one, the difference maker takes another — and each
// method below consumes the stream in a fixed, documented way.
export class Rng {
  constructor(seed) {
    this.roll = mulberry32(seed);
  }

  // Next float in [0, 1).
  unit() {
    return this.roll();
  }

  // Float somewhere in [lo, hi).
  span(lo, hi) {
    return lo + this.roll() * (hi - lo);
  }

  // Integer in [lo, hi] with both ends reachable.
  whole(lo, hi) {
    return lo + Math.floor(this.roll() * (hi - lo + 1));
  }

  // One member of a list, chosen uniformly.
  choose(list) {
    return list[Math.floor(this.roll() * list.length)];
  }

  // True with probability p.
  likely(p) {
    return this.roll() < p;
  }

  // A shuffled copy of the list (Fisher–Yates, walking from the tail);
  // the caller's array is never touched.
  scramble(list) {
    const copy = [...list];
    let i = copy.length;
    while (i > 1) {
      i -= 1;
      const j = Math.floor(this.roll() * (i + 1));
      const held = copy[i];
      copy[i] = copy[j];
      copy[j] = held;
    }
    return copy;
  }
}
