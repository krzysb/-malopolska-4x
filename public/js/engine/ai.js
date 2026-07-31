// AI najazdów tatarskich: spawn kolejnych fal wg missionConfig.js, marsz w stronę
// najbliższego miasta gracza (Dijkstra z pathfinding.js), szturm po dotarciu,
// wycofanie niepokonanej fali po WAVE_WITHDRAW_AFTER_TURNS turach od spawnu
// (patrz komentarz w missionConfig.js nt. założenia o nienakładających się falach).
import { offsetToAxial, hexDistance } from './hexgrid.js';
import { findPath } from './pathfinding.js';
import { moveArmyAlongPath, armyIdAt, armyMovementPoints, mergeUnitStacks } from './units.js';
import { resolveBattle } from './combat.js';
import { TATAR_SPAWN_OFFSETS } from '../data/mapData.js';
import { TATAR_WAVES, WAVE_WITHDRAW_AFTER_TURNS } from '../data/missionConfig.js';

function spawnWave(state, wave) {
  const [col, row] = TATAR_SPAWN_OFFSETS[(wave.id - 1) % TATAR_SPAWN_OFFSETS.length];
  const spawnHex = offsetToAxial(col, row);
  const armyId = armyIdAt('tatar', spawnHex.q, spawnHex.r);
  const existing = state.armies[armyId];
  const units = existing ? mergeUnitStacks(existing.units, wave.units) : wave.units;

  return {
    ...state,
    armies: {
      ...state.armies,
      [armyId]: { id: armyId, owner: 'tatar', q: spawnHex.q, r: spawnHex.r, units, movementLeft: armyMovementPoints(units) },
    },
    waves: [...state.waves, { id: wave.id, year: wave.year, spawnedTurn: state.turn, withdrawn: false }],
    log: [...state.log, { turn: state.turn, type: 'wave-spawn', waveId: wave.id }],
  };
}

function nearestPlayerCity(state, from) {
  let best = null;
  let bestDist = Infinity;
  for (const city of Object.values(state.cities)) {
    if (city.owner !== 'player') continue;
    const dist = hexDistance(from, city);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }
  return best;
}

// Przesuwa jedną armię tatarską w stronę najbliższego miasta gracza; jeśli po
// ruchu stoi dokładnie na heksie celu, natychmiast szturmuje to miasto.
function moveAndMaybeAssault(state, armyId, mapHexes) {
  const army = state.armies[armyId];
  if (!army) return state;
  const target = nearestPlayerCity(state, army);
  if (!target) return state;

  const path = findPath(mapHexes, { q: army.q, r: army.r }, { q: target.q, r: target.r });
  if (!path || path.length === 0) return state;

  const moved = moveArmyAlongPath(state, armyId, path, mapHexes);
  const arrivedId = armyIdAt('tatar', target.q, target.r);
  const arrived = moved.armies[arrivedId];
  if (arrived && arrived.q === target.q && arrived.r === target.r) {
    return resolveBattle(moved, arrivedId, { type: 'city', id: target.id }, mapHexes);
  }
  return moved;
}

// Wywoływane raz na turę z turn.js. Zwraca nowy stan gry.
export function processTatarAI(state, mapHexes) {
  let next = state;

  for (const wave of TATAR_WAVES) {
    const alreadySpawned = next.waves.some((w) => w.id === wave.id);
    if (!alreadySpawned && next.turn === wave.spawnTurn) {
      next = spawnWave(next, wave);
    }
  }

  const dueForWithdrawal = next.waves.find((w) => !w.withdrawn && next.turn - w.spawnedTurn >= WAVE_WITHDRAW_AFTER_TURNS);
  if (dueForWithdrawal) {
    const armies = { ...next.armies };
    for (const [id, a] of Object.entries(armies)) {
      if (a.owner === 'tatar') delete armies[id];
    }
    next = {
      ...next,
      armies,
      waves: next.waves.map((w) => (w.id === dueForWithdrawal.id ? { ...w, withdrawn: true } : w)),
      log: [...next.log, { turn: next.turn, type: 'wave-withdraw', waveId: dueForWithdrawal.id }],
    };
    return next;
  }

  const tatarArmyIds = Object.entries(next.armies)
    .filter(([, a]) => a.owner === 'tatar')
    .map(([id]) => id);
  for (const armyId of tatarArmyIds) {
    if (!next.armies[armyId]) continue; // mogła zniknąć np. po szturmie w tej samej pętli
    next = moveAndMaybeAssault(next, armyId, mapHexes);
  }

  return next;
}
