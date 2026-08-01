// Rekrutacja jednostek i ciągły (czas rzeczywisty) ruch armii wzdłuż zleconej
// ścieżki. Silnik pozostaje czysty - każda funkcja zwraca nowy stan, nigdy nie
// mutuje wejścia. Walka NIE jest tu wyzwalana - to zadanie simulation.js, które
// po każdym ticku ruchu skanuje, czy jakaś armia stoi na heksie z wrogiem.
import { key } from './hexgrid.js';
import { MOVE_COST } from '../data/mapData.js';
import { UNIT_TYPES } from '../data/unitTypes.js';
import { BUILDINGS } from '../data/buildings.js';
import { TIME_SCALE_SEC_PER_TURN } from '../data/missionConfig.js';

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

// Punkty ruchu na "turę" (stara jednostka bazowa, wygodna do pokazania w UI
// jako względny rating prędkości) - stos rusza w tempie najwolniejszej jednostki.
export function armyMovementPoints(units) {
  return Math.min(...units.map(({ type }) => UNIT_TYPES[type].movement));
}

// To samo, ale przeliczone na punkty/sekundę - realna prędkość używana w ticku.
export function armySpeed(units) {
  return armyMovementPoints(units) / TIME_SCALE_SEC_PER_TURN;
}

// Koszt rekrutacji z uwzględnieniem zniżki z koszar. Eksportowana, żeby UI (np.
// cityPanel.js) mogło pokazać dokładny koszt i wyszarzyć przycisk bez duplikowania
// tej formuły.
export function recruitCost(city, unitTypeId) {
  const barracksLevel = city.buildings.barracks || 0;
  const discount = Math.min(1, barracksLevel * BUILDINGS.barracks.recruitDiscountPerLevel);
  return Math.round(UNIT_TYPES[unitTypeId].cost * (1 - discount));
}

// Rekrutuje jednostkę w mieście: dodaje do garnizonu albo do armii stojącej na
// heksie miasta (tworząc ją, jeśli jeszcze nie istnieje). Dołączenie do armii
// będącej w trakcie marszu nie przerywa jej zleconej ścieżki. Nie waliduje
// właściciela miasta - jak w cities.js, to decyzja UI/wywołującego, funkcja
// waliduje tylko złoto.
export function recruitUnit(state, cityId, unitTypeId, destination = 'garrison') {
  const city = state.cities[cityId];
  const cost = recruitCost(city, unitTypeId);
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
        path: existing?.path ?? null,
        progress: existing?.progress ?? 0,
      },
    },
  };
}

// Zleca armii nową ścieżkę (z pathfinding.js), którą pokona w kolejnych tickach
// symulacji - zastępuje poprzednią zleconą ścieżkę, jeśli jakaś trwała.
export function setArmyPath(state, armyId, path) {
  const army = state.armies[armyId];
  if (!army || !path || path.length === 0) return state;
  return { ...state, armies: { ...state.armies, [armyId]: { ...army, path, progress: 0 } } };
}

// Przesuwa o dtSeconds wszystkie armie mające zleconą, niepustą ścieżkę,
// krok po kroku po heksach zgodnie z kosztem terenu (MOVE_COST). Armie tego
// samego właściciela łączą się w jedną przy spotkaniu na wspólnym heksie -
// łączony stos kontynuuje ścieżkę tej armii, która akurat weszła na heks.
export function tickArmiesMovement(state, dtSeconds, mapHexes) {
  const armies = { ...state.armies };
  const movingIds = Object.keys(armies).filter((id) => armies[id]?.path?.length > 0);

  for (const armyId of movingIds) {
    let army = armies[armyId];
    if (!army) continue; // mogła zostać wchłonięta przez wcześniejszy krok tej pętli

    let progress = army.progress + dtSeconds * armySpeed(army.units);
    let path = army.path;
    let q = army.q;
    let r = army.r;
    let currentId = armyId;

    while (path.length > 0) {
      const next = path[0];
      const cost = MOVE_COST[mapHexes[key(next.q, next.r)].terrain];
      if (progress < cost) break;
      progress -= cost;
      q = next.q;
      r = next.r;
      path = path.slice(1);

      const destId = armyIdAt(army.owner, q, r);
      if (destId !== currentId) {
        const existing = armies[destId];
        delete armies[currentId];
        const units = existing ? mergeUnitStacks(existing.units, army.units) : army.units;
        army = { ...army, units };
        currentId = destId;
      }
    }

    armies[currentId] = { ...army, q, r, path, progress: path.length > 0 ? progress : 0 };
  }

  return { ...state, armies };
}
