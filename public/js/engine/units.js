// Rekrutacja jednostek, ruch armii i łączenie stosów. Silnik pozostaje czysty -
// każda funkcja zwraca nowy stan, nigdy nie mutuje wejścia.
import { key } from './hexgrid.js';
import { MOVE_COST } from '../data/mapData.js';
import { UNIT_TYPES } from '../data/unitTypes.js';
import { BUILDINGS } from '../data/buildings.js';

// Tożsamość armii = (właściciel, heks). Uproszczenie MVP: przemieszczenie armii
// zmienia jej id, naturalnie łącząc ją z inną armią tego samego właściciela
// stojącą już na docelowym heksie (jeśli taka istnieje).
export function armyIdAt(owner, q, r) {
  return `${owner}@${key(q, r)}`;
}

export function mergeUnitStacks(a = [], b = []) {
  const counts = new Map();
  for (const { type, count } of a) counts.set(type, (counts.get(type) || 0) + count);
  for (const { type, count } of b) counts.set(type, (counts.get(type) || 0) + count);
  return [...counts.entries()].map(([type, count]) => ({ type, count }));
}

// Stos rusza w tempie najwolniejszej jednostki w składzie.
export function armyMovementPoints(units) {
  return Math.min(...units.map(({ type }) => UNIT_TYPES[type].movement));
}

function recruitCost(city, unitDef) {
  const barracksLevel = city.buildings.barracks || 0;
  const discount = Math.min(1, barracksLevel * BUILDINGS.barracks.recruitDiscountPerLevel);
  return Math.round(unitDef.cost * (1 - discount));
}

// Rekrutuje jednostkę w mieście: dodaje do garnizonu albo do armii stojącej na
// heksie miasta (tworząc ją, jeśli jeszcze nie istnieje). Nie waliduje właściciela
// miasta - jak w cities.js, to decyzja UI/wywołującego, funkcja waliduje tylko złoto.
export function recruitUnit(state, cityId, unitTypeId, destination = 'garrison') {
  const city = state.cities[cityId];
  const unitDef = UNIT_TYPES[unitTypeId];
  const cost = recruitCost(city, unitDef);
  if (state.player.gold < cost) return state;

  const nextState = { ...state, player: { ...state.player, gold: state.player.gold - cost } };
  const newUnit = [{ type: unitTypeId, count: 1 }];

  if (destination === 'garrison') {
    return {
      ...nextState,
      cities: {
        ...state.cities,
        [cityId]: { ...city, garrison: mergeUnitStacks(city.garrison, newUnit) },
      },
    };
  }

  const armyId = armyIdAt(city.owner, city.q, city.r);
  const existing = state.armies[armyId];
  const units = mergeUnitStacks(existing?.units, newUnit);
  return {
    ...nextState,
    armies: {
      ...state.armies,
      [armyId]: {
        id: armyId,
        owner: city.owner,
        q: city.q,
        r: city.r,
        units,
        movementLeft: existing
          ? Math.min(existing.movementLeft, unitDef.movement)
          : armyMovementPoints(units),
      },
    },
  };
}

// Resetuje punkty ruchu wszystkich armii na początku tury (wywoływane z turn.js).
export function resetArmiesMovement(state) {
  const armies = {};
  for (const [id, army] of Object.entries(state.armies)) {
    armies[id] = { ...army, movementLeft: armyMovementPoints(army.units) };
  }
  return { ...state, armies };
}

// Przesuwa armię wzdłuż ścieżki (z pathfinding.js), zużywając punkty ruchu wg kosztu
// terenu. Ruch częściowy: armia zatrzymuje się na najdalszym heksie osiągalnym w
// ramach movementLeft, zamiast wymagać pokonania całej ścieżki na raz. Jeśli
// docelowy heks jest już zajęty przez inną armię tego samego właściciela, stosy
// się łączą.
export function moveArmyAlongPath(state, armyId, path, mapHexes) {
  const army = state.armies[armyId];
  if (!army || path.length === 0) return state;

  let movementLeft = army.movementLeft;
  let last = { q: army.q, r: army.r };
  let steps = 0;
  for (const step of path) {
    const cost = MOVE_COST[mapHexes[key(step.q, step.r)].terrain];
    if (cost > movementLeft) break;
    movementLeft -= cost;
    last = step;
    steps++;
  }
  if (steps === 0) return state;

  const armies = { ...state.armies };
  delete armies[armyId];

  const destId = armyIdAt(army.owner, last.q, last.r);
  const existing = destId !== armyId ? state.armies[destId] : null;
  const units = existing ? mergeUnitStacks(existing.units, army.units) : army.units;

  armies[destId] = {
    id: destId,
    owner: army.owner,
    q: last.q,
    r: last.r,
    units,
    movementLeft: existing ? Math.min(existing.movementLeft, movementLeft) : movementLeft,
  };

  return { ...state, armies };
}
