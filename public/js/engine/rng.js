// Deterministyczny generator liczb pseudolosowych (mulberry32) w wersji czysto
// funkcyjnej: każdy krok przyjmuje aktualny seed i zwraca wylosowaną wartość oraz
// nowy seed. Dzięki temu ciąg losowań (np. w walce) jest w pełni odtwarzalny i
// może być wątkowany przez czysty stan gry, zamiast ukrytego, mutowalnego licznika.

export function nextRandom(seed) {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: a >>> 0 };
}

// Losowa liczba zmiennoprzecinkowa w przedziale [min, max) + nowy seed.
export function nextRange(seed, min, max) {
  const { value, seed: nextSeed } = nextRandom(seed);
  return { value: min + value * (max - min), seed: nextSeed };
}

// Wygodny iterator do wielu losowań w jednym czystym wywołaniu silnika (np.
// resolveBattle) - lokalny, jednorazowy licznik; na końcu udostępnia finalny
// seed do zapisania z powrotem w stanie gry, więc wywołujący pozostaje czysty.
export function createRngSequence(seed) {
  let current = seed;
  return {
    next() {
      const { value, seed: nextSeed } = nextRandom(current);
      current = nextSeed;
      return value;
    },
    range(min, max) {
      const { value, seed: nextSeed } = nextRange(current, min, max);
      current = nextSeed;
      return value;
    },
    seed() {
      return current;
    },
  };
}
