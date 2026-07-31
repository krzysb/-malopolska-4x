// Dijkstra po siatce heksagonalnej z kosztem ruchu zależnym od terenu (mapData.js).
// Heksy niedostępne (poza mapą lub o koszcie Infinity) są pomijane w ekspansji.
import { key, parseKey, neighborsOf } from './hexgrid.js';
import { MOVE_COST } from '../data/mapData.js';

// Zwraca tablicę kroków {q,r} od start do target (bez heksu startowego), albo
// null, gdy cel jest nieosiągalny. Pusta tablica, gdy start === target.
export function findPath(mapHexes, start, target) {
  const startKey = key(start.q, start.r);
  const targetKey = key(target.q, target.r);
  if (!mapHexes[startKey] || !mapHexes[targetKey]) return null;
  if (startKey === targetKey) return [];

  const dist = new Map([[startKey, 0]]);
  const prev = new Map();
  const visited = new Set();

  for (;;) {
    let currentKey = null;
    let currentDist = Infinity;
    for (const [k, d] of dist) {
      if (!visited.has(k) && d < currentDist) {
        currentDist = d;
        currentKey = k;
      }
    }
    if (currentKey === null || currentKey === targetKey) break;
    visited.add(currentKey);

    const { q, r } = parseKey(currentKey);
    for (const n of neighborsOf(q, r)) {
      const nKey = key(n.q, n.r);
      const hex = mapHexes[nKey];
      if (!hex) continue;
      const cost = MOVE_COST[hex.terrain];
      if (!Number.isFinite(cost)) continue;
      const nextDist = currentDist + cost;
      if (nextDist < (dist.get(nKey) ?? Infinity)) {
        dist.set(nKey, nextDist);
        prev.set(nKey, currentKey);
      }
    }
  }

  if (!dist.has(targetKey)) return null;

  const path = [];
  let cur = targetKey;
  while (cur !== startKey) {
    path.unshift(parseKey(cur));
    const previous = prev.get(cur);
    if (previous === undefined) return null;
    cur = previous;
  }
  return path;
}
