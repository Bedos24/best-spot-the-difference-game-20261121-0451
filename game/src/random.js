// Seeded randomness. A whole round grows from a single seed, so the scene
// and its altered twin always come out the same for that seed — and the
// screenshot modes can pose exact, repeatable game states.

// mulberry32: a small, fast 32-bit PRNG with a decent spread.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A friendlier wrapper over the raw generator: floats, ranges, picks.
export class Rng {
  constructor(seed) {
    this.next = mulberry32(seed);
  }

  float() {
    return this.next();
  }

  // Uniform in [min, max).
  range(min, max) {
    return min + this.next() * (max - min);
  }

  // Whole number in [min, max], both ends included.
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  chance(p) {
    return this.next() < p;
  }

  // A shuffled copy; the input list is left alone.
  shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
