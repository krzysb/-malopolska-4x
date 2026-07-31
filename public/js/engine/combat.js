// Rozstrzyganie walk: siła stron (jednostki x teren x losowa wariancja),
// proporcjonalne straty po obu stronach, próg zdobycia miasta. Jedna, zamknięta
// funkcja wejściowa - resolveBattle() - obsługuje zarówno starcie polowe
// (armia vs armia), jak i szturm na miasto (armia vs garnizon).
import { key } from './hexgrid.js';
import { DEFENSE_MULT } from '../data/mapData.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNIT_TYPES, unitTerrainAttackMod, unitTerrainDefenseMod } from '../data/unitTypes.js';
import { createRngSequence } from './rng.js';

export const RNG_VARIANCE = 0.15; // +/-15% losowej wariancji siły walczącej strony
export const MIN_CASUALTY_RATE = 0.05;
export const MAX_CASUALTY_RATE = 0.9;
export const CAPTURE_STRENGTH_MULTIPLIER = 1.2; // przewaga ataku potrzebna, by przełamać obronę miasta

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function totalUnitCount(units) {
  return units.reduce((sum, { count }) => sum + count, 0);
}

function sideStrength(units, statKey, terrainModFn, terrain) {
  return units.reduce((sum, { type, count }) => {
    const def = UNIT_TYPES[type];
    return sum + count * def[statKey] * terrainModFn(type, terrain);
  }, 0);
}

// Straty rozłożone proporcjonalnie na wszystkie typy jednostek w stosie; typy,
// które spadły do zera, znikają ze składu.
export function applyCasualties(units, lossRate) {
  return units
    .map(({ type, count }) => ({ type, count: Math.max(0, Math.round(count * (1 - lossRate))) }))
    .filter((u) => u.count > 0);
}

// attackerArmyId - id armii z state.armies dokonującej ataku.
// target - { type: 'city', id } albo { type: 'army', id }.
// mapHexes - state.map.hexes, potrzebne do ustalenia terenu pola bitwy.
export function resolveBattle(state, attackerArmyId, target, mapHexes) {
  const attackerArmy = state.armies[attackerArmyId];
  if (!attackerArmy) return state;

  const isCityAssault = target.type === 'city';
  const defenderCity = isCityAssault ? state.cities[target.id] : null;
  const defenderArmy = isCityAssault ? null : state.armies[target.id];
  if (isCityAssault ? !defenderCity : !defenderArmy) return state;

  const battleHex = isCityAssault ? defenderCity : defenderArmy;
  const terrain = mapHexes[key(battleHex.q, battleHex.r)].terrain;
  const defenderUnits = isCityAssault ? defenderCity.garrison : defenderArmy.units;

  const seq = createRngSequence(state.rngSeed);
  const attackerVariance = 1 + seq.range(-RNG_VARIANCE, RNG_VARIANCE);
  const defenderVariance = 1 + seq.range(-RNG_VARIANCE, RNG_VARIANCE);

  const attackerStrength =
    sideStrength(attackerArmy.units, 'attack', unitTerrainAttackMod, terrain) * attackerVariance;
  let defenderStrength =
    sideStrength(defenderUnits, 'defense', unitTerrainDefenseMod, terrain) *
    DEFENSE_MULT[terrain] *
    defenderVariance;
  if (isCityAssault) {
    const wallsLevel = defenderCity.buildings.walls || 0;
    defenderStrength *= 1 + wallsLevel * BUILDINGS.walls.defenseBonusPerLevel;
    const churchLevel = defenderCity.buildings.church || 0;
    defenderStrength *= 1 + churchLevel * BUILDINGS.church.moraleBonus;
  }

  const totalStrength = attackerStrength + defenderStrength;
  const attackerLossRate = clamp(defenderStrength / totalStrength, MIN_CASUALTY_RATE, MAX_CASUALTY_RATE);
  const defenderLossRate = clamp(attackerStrength / totalStrength, MIN_CASUALTY_RATE, MAX_CASUALTY_RATE);

  const attackerUnitsAfter = applyCasualties(attackerArmy.units, attackerLossRate);
  const defenderUnitsAfter = applyCasualties(defenderUnits, defenderLossRate);

  const attackerWon = attackerStrength > defenderStrength;
  const defenderWiped = totalUnitCount(defenderUnitsAfter) === 0;
  const captured =
    isCityAssault && (defenderWiped || (attackerWon && attackerStrength >= defenderStrength * CAPTURE_STRENGTH_MULTIPLIER));

  const armies = { ...state.armies };
  if (totalUnitCount(attackerUnitsAfter) === 0 || captured) {
    delete armies[attackerArmyId];
  } else {
    armies[attackerArmyId] = { ...attackerArmy, units: attackerUnitsAfter };
  }

  let cities = state.cities;
  if (isCityAssault) {
    cities = {
      ...state.cities,
      [target.id]: captured
        ? { ...defenderCity, owner: attackerArmy.owner, garrison: attackerUnitsAfter }
        : { ...defenderCity, garrison: defenderUnitsAfter },
    };
  } else if (defenderWiped) {
    delete armies[target.id];
  } else {
    armies[target.id] = { ...defenderArmy, units: defenderUnitsAfter };
  }

  const logEntry = {
    turn: state.turn,
    type: 'battle',
    attackerId: attackerArmyId,
    attackerOwner: attackerArmy.owner,
    target,
    attackerWon,
    captured,
  };

  return { ...state, armies, cities, log: [...state.log, logEntry], rngSeed: seq.seed() };
}
