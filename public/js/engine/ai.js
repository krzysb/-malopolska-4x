// AI najazdów tatarskich: spawn kolejnych fal wg missionConfig.js, marsz w stronę
// najbliższego miasta gracza (Dijkstra z pathfinding.js), wycofanie niepokonanej
// fali po WAVE_WITHDRAW_AFTER_SEC sekundach od spawnu (patrz komentarz w
// missionConfig.js nt. założenia o nienakładających się falach). Gra działa w
// czasie rzeczywistym - armie tylko ZLECAJĄ marsz (setArmyPath); faktyczny ruch
// i wykrycie starcia dzieje się w simulation.js (tickArmiesMovement +
// resolvePendingBattles), wywoływanych co tick.
import { offsetToAxial, hexDistance } from './hexgrid.js';
import { findPath } from './pathfinding.js';
import { setArmyPath, armyIdAt, mergeUnitStacks } from './units.js';
import { TATAR_SPAWN_OFFSETS } from '../data/mapData.js';
import { TATAR_WAVES, WAVE_WITHDRAW_AFTER_SEC } from '../data/missionConfig.js';

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
      [armyId]: { id: armyId, owner: 'tatar', q: spawnHex.q, r: spawnHex.r, units, path: existing?.path ?? null, progress: existing?.progress ?? 0 },
    },
    waves: [...state.waves, { id: wave.id, year: wave.year, spawnedTime: state.time, withdrawn: false }],
    log: [...state.log, { time: state.time, type: 'wave-spawn', waveId: wave.id }],
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

// Jeśli armia jest bezczynna (brak zleconej ścieżki) i nie stoi już na celu,
// zleca jej marsz do najbliższego miasta gracza. Nie przerywa marszu w toku -
// ponowne zlecenie zresetowałoby postęp (progress) w bieżącym ticku.
function ensureHeadingToTarget(state, armyId, mapHexes) {
  const army = state.armies[armyId];
  if (!army) return state;
  if (army.path && army.path.length > 0) return state;

  const target = nearestPlayerCity(state, army);
  if (!target || (army.q === target.q && army.r === target.r)) return state;

  const path = findPath(mapHexes, { q: army.q, r: army.r }, { q: target.q, r: target.r });
  if (!path || path.length === 0) return state;
  return setArmyPath(state, armyId, path);
}

// Wywoływane co tick symulacji (patrz simulation.js). Zwraca nowy stan gry.
export function tickTatarAI(state, mapHexes) {
  let next = state;

  for (const wave of TATAR_WAVES) {
    const alreadySpawned = next.waves.some((w) => w.id === wave.id);
    if (!alreadySpawned && next.time >= wave.spawnTimeSec) {
      next = spawnWave(next, wave);
    }
  }

  const dueForWithdrawal = next.waves.find((w) => !w.withdrawn && next.time - w.spawnedTime >= WAVE_WITHDRAW_AFTER_SEC);
  if (dueForWithdrawal) {
    const armies = { ...next.armies };
    for (const [id, a] of Object.entries(armies)) {
      if (a.owner === 'tatar') delete armies[id];
    }
    return {
      ...next,
      armies,
      waves: next.waves.map((w) => (w.id === dueForWithdrawal.id ? { ...w, withdrawn: true } : w)),
      log: [...next.log, { time: next.time, type: 'wave-withdraw', waveId: dueForWithdrawal.id }],
    };
  }

  const tatarArmyIds = Object.entries(next.armies)
    .filter(([, a]) => a.owner === 'tatar')
    .map(([id]) => id);
  for (const armyId of tatarArmyIds) {
    next = ensureHeadingToTarget(next, armyId, mapHexes);
  }

  return next;
}

