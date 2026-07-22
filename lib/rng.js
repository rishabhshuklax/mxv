// Mulberry32: a small, fast seeded PRNG. Same seed -> same sequence, which is
// what lets the "Tonight" feature's "deal another" reroll and repeat visits
// with the same seed stay deterministic.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = { mulberry32 };
