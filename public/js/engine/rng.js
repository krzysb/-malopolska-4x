// Deterministyczny generator liczb pseudolosowych (mulberry32) - potrzebny, żeby
// walka i AI dawały powtarzalne, testowalne wyniki dla danego rngSeed.

export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Losowa liczba zmiennoprzecinkowa w przedziale [min, max).
export function rngRange(rng, min, max) {
  return min + rng() * (max - min);
}

// Losowy wybór elementu z tablicy.
export function rngChoice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
