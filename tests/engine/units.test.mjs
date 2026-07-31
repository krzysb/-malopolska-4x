import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { key } from '../../public/js/engine/hexgrid.js';
import {
  recruitUnit, armyMovementPoints, resetArmiesMovement, moveArmyAlongPath,
  mergeUnitStacks, armyIdAt,
} from '../../public/js/engine/units.js';

describe('units', () => {
  test('mergeUnitStacks sumuje liczności wg typu', () => {
    const merged = mergeUnitStacks([{ type: 'infantry', count: 2 }], [{ type: 'infantry', count: 1 }, { type: 'archers', count: 1 }]);
    assert.deepEqual(merged.sort((a, b) => a.type.localeCompare(b.type)), [
      { type: 'archers', count: 1 },
      { type: 'infantry', count: 3 },
    ]);
  });

  test('armyMovementPoints to ruch najwolniejszej jednostki w stosie', () => {
    assert.equal(armyMovementPoints([{ type: 'infantry', count: 1 }, { type: 'cavalry', count: 1 }]), 2);
    assert.equal(armyMovementPoints([{ type: 'cavalry', count: 3 }]), 4);
  });

  test('recruitUnit(garrison) dodaje do garnizonu i odejmuje pełny koszt bez koszar', () => {
    const state = createInitialState();
    const goldBefore = state.player.gold;
    const next = recruitUnit(state, 'krakow', 'infantry', 'garrison');
    assert.equal(next.player.gold, goldBefore - 20);
    const infantry = next.cities.krakow.garrison.find((u) => u.type === 'infantry');
    assert.equal(infantry.count, 4); // Kraków startuje z 3 piechurami w garnizonie
  });

  test('koszary obniżają koszt rekrutacji', () => {
    const state = createInitialState();
    const withBarracks = {
      ...state,
      cities: { ...state.cities, krakow: { ...state.cities.krakow, buildings: { ...state.cities.krakow.buildings, barracks: 1 } } },
    };
    const goldBefore = withBarracks.player.gold;
    const next = recruitUnit(withBarracks, 'krakow', 'infantry', 'garrison');
    assert.equal(next.player.gold, goldBefore - 17); // round(20 * 0.85)
  });

  test('recruitUnit nie zmienia stanu, gdy brak złota', () => {
    const state = createInitialState();
    const poor = { ...state, player: { gold: 0 } };
    assert.equal(recruitUnit(poor, 'krakow', 'infantry', 'garrison'), poor);
  });

  test('recruitUnit(army) tworzy nową armię na heksie miasta', () => {
    const state = createInitialState();
    const next = recruitUnit(state, 'krakow', 'cavalry', 'army');
    const city = next.cities.krakow;
    const armyId = armyIdAt('player', city.q, city.r);
    const army = next.armies[armyId];
    assert.ok(army);
    assert.equal(army.q, city.q);
    assert.equal(army.r, city.r);
    assert.deepEqual(army.units, [{ type: 'cavalry', count: 1 }]);
    assert.equal(army.movementLeft, 4);
  });

  test('recruitUnit(army) łączy się z istniejącą armią na tym samym heksie', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'cavalry', 'army');
    next = recruitUnit(next, 'krakow', 'infantry', 'army');
    const city = next.cities.krakow;
    const armyId = armyIdAt('player', city.q, city.r);
    const army = next.armies[armyId];
    assert.equal(Object.keys(next.armies).length, 1);
    assert.equal(army.units.length, 2);
    // ruch mieszanego stosu ograniczony przez wolniejszą piechotę
    assert.equal(army.movementLeft, 2);
  });

  test('resetArmiesMovement przywraca punkty ruchu wg składu armii', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'cavalry', 'army');
    const city = next.cities.krakow;
    const armyId = armyIdAt('player', city.q, city.r);
    next = { ...next, armies: { ...next.armies, [armyId]: { ...next.armies[armyId], movementLeft: 0 } } };
    const reset = resetArmiesMovement(next);
    assert.equal(reset.armies[armyId].movementLeft, 4);
  });

  test('moveArmyAlongPath przesuwa armię o pełną ścieżkę, gdy starcza punktów ruchu', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'cavalry', 'army'); // movement 4
    const city = next.cities.krakow;
    const startId = armyIdAt('player', city.q, city.r);
    const path = [{ q: city.q + 1, r: city.r }, { q: city.q + 2, r: city.r }];
    const mapHexes = {
      [key(city.q, city.r)]: { terrain: 'plains' },
      [key(city.q + 1, city.r)]: { terrain: 'plains' },
      [key(city.q + 2, city.r)]: { terrain: 'plains' },
    };
    const moved = moveArmyAlongPath(next, startId, path, mapHexes);
    const destId = armyIdAt('player', city.q + 2, city.r);
    assert.ok(!moved.armies[startId]);
    assert.ok(moved.armies[destId]);
    assert.equal(moved.armies[destId].movementLeft, 2); // 4 - 1 - 1
  });

  test('moveArmyAlongPath zatrzymuje armię częściowo, gdy nie starcza punktów na cały dystans', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'infantry', 'army'); // movement 2
    const city = next.cities.krakow;
    const startId = armyIdAt('player', city.q, city.r);
    const path = [{ q: city.q + 1, r: city.r }, { q: city.q + 2, r: city.r }];
    const mapHexes = {
      [key(city.q, city.r)]: { terrain: 'plains' },
      [key(city.q + 1, city.r)]: { terrain: 'plains' }, // koszt 1, osiągalny
      [key(city.q + 2, city.r)]: { terrain: 'hills' }, // koszt 3, niedostępny z 1 pozostałym punktem
    };
    const moved = moveArmyAlongPath(next, startId, path, mapHexes);
    assert.ok(!moved.armies[startId]);
    const stoppedId = armyIdAt('player', city.q + 1, city.r);
    assert.ok(moved.armies[stoppedId]);
    assert.equal(moved.armies[stoppedId].movementLeft, 1);
  });

  test('moveArmyAlongPath nie zmienia stanu, gdy nie stać armii nawet na pierwszy krok', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'infantry', 'army'); // movement 2
    const city = next.cities.krakow;
    const startId = armyIdAt('player', city.q, city.r);
    const path = [{ q: city.q + 1, r: city.r }];
    const mapHexes = {
      [key(city.q, city.r)]: { terrain: 'plains' },
      [key(city.q + 1, city.r)]: { terrain: 'hills' }, // koszt 3 > 2 dostępnych punktów
    };
    const moved = moveArmyAlongPath(next, startId, path, mapHexes);
    assert.equal(moved, next);
    assert.equal(moved.armies[startId].movementLeft, 2);
  });

  test('moveArmyAlongPath łączy armię z inną tego samego właściciela na docelowym heksie', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'infantry', 'army');
    const city = next.cities.krakow;
    const targetHex = { q: city.q + 1, r: city.r };
    const targetId = armyIdAt('player', targetHex.q, targetHex.r);
    next = {
      ...next,
      armies: {
        ...next.armies,
        [targetId]: { id: targetId, owner: 'player', q: targetHex.q, r: targetHex.r, units: [{ type: 'archers', count: 2 }], movementLeft: 2 },
      },
    };
    const startId = armyIdAt('player', city.q, city.r);
    const mapHexes = {
      [key(city.q, city.r)]: { terrain: 'plains' },
      [key(targetHex.q, targetHex.r)]: { terrain: 'plains' },
    };
    const moved = moveArmyAlongPath(next, startId, [targetHex], mapHexes);
    assert.equal(Object.keys(moved.armies).length, 1);
    const merged = moved.armies[targetId];
    assert.equal(merged.units.length, 2);
  });
});
