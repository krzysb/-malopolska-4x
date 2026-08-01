import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { key } from '../../public/js/engine/hexgrid.js';
import { TIME_SCALE_SEC_PER_TURN } from '../../public/js/data/missionConfig.js';
import {
  recruitUnit, armyMovementPoints, armySpeed, setArmyPath, tickArmiesMovement,
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

  test('armySpeed to armyMovementPoints przeliczone na punkty/sekundę', () => {
    assert.equal(armySpeed([{ type: 'cavalry', count: 1 }]), 4 / TIME_SCALE_SEC_PER_TURN);
    assert.equal(armySpeed([{ type: 'infantry', count: 1 }]), 2 / TIME_SCALE_SEC_PER_TURN);
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

  test('recruitUnit(army) tworzy nową, bezczynną armię na heksie miasta', () => {
    const state = createInitialState();
    const next = recruitUnit(state, 'krakow', 'cavalry', 'army');
    const city = next.cities.krakow;
    const armyId = armyIdAt('player', city.q, city.r);
    const army = next.armies[armyId];
    assert.ok(army);
    assert.equal(army.q, city.q);
    assert.equal(army.r, city.r);
    assert.deepEqual(army.units, [{ type: 'cavalry', count: 1 }]);
    assert.equal(army.path, null);
    assert.equal(army.progress, 0);
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
  });

  test('setArmyPath zleca ścieżkę i zeruje progress', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'cavalry', 'army');
    const city = next.cities.krakow;
    const armyId = armyIdAt('player', city.q, city.r);
    next = { ...next, armies: { ...next.armies, [armyId]: { ...next.armies[armyId], progress: 0.7 } } };
    const path = [{ q: city.q + 1, r: city.r }];
    const withPath = setArmyPath(next, armyId, path);
    assert.deepEqual(withPath.armies[armyId].path, path);
    assert.equal(withPath.armies[armyId].progress, 0);
  });

  test('tickArmiesMovement przesuwa armię o pełną ścieżkę, gdy dt daje wystarczający dystans', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'cavalry', 'army'); // 4 pkt/turę = 0.5 pkt/sek
    const city = next.cities.krakow;
    const startId = armyIdAt('player', city.q, city.r);
    const path = [{ q: city.q + 1, r: city.r }, { q: city.q + 2, r: city.r }]; // 2 heksy plains, koszt 1+1=2
    const mapHexes = {
      [key(city.q, city.r)]: { terrain: 'plains' },
      [key(city.q + 1, city.r)]: { terrain: 'plains' },
      [key(city.q + 2, city.r)]: { terrain: 'plains' },
    };
    next = setArmyPath(next, startId, path);

    const moved = tickArmiesMovement(next, 4.5, mapHexes); // 4.5 * 0.5 = 2.25 pkt > koszt 2
    const destId = armyIdAt('player', city.q + 2, city.r);
    assert.ok(!moved.armies[startId]);
    assert.ok(moved.armies[destId]);
    assert.deepEqual(moved.armies[destId].path, []);
    assert.equal(moved.armies[destId].progress, 0); // dotarła - nadmiar postępu odrzucony
  });

  test('tickArmiesMovement zatrzymuje armię w miejscu, gdy dt nie starcza na pierwszy krok', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'infantry', 'army'); // 2 pkt/turę = 0.25 pkt/sek
    const city = next.cities.krakow;
    const startId = armyIdAt('player', city.q, city.r);
    const path = [{ q: city.q + 1, r: city.r }];
    const mapHexes = {
      [key(city.q, city.r)]: { terrain: 'plains' },
      [key(city.q + 1, city.r)]: { terrain: 'plains' }, // koszt 1
    };
    next = setArmyPath(next, startId, path);

    const moved = tickArmiesMovement(next, 3, mapHexes); // 3 * 0.25 = 0.75 pkt < koszt 1
    assert.ok(moved.armies[startId]);
    assert.equal(moved.armies[startId].q, city.q);
    assert.equal(moved.armies[startId].progress, 0.75);
    assert.deepEqual(moved.armies[startId].path, path);
  });

  test('tickArmiesMovement kontynuuje z zachowanym progress w kolejnym ticku', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'infantry', 'army'); // 0.25 pkt/sek
    const city = next.cities.krakow;
    const startId = armyIdAt('player', city.q, city.r);
    const path = [{ q: city.q + 1, r: city.r }, { q: city.q + 2, r: city.r }];
    const mapHexes = {
      [key(city.q, city.r)]: { terrain: 'plains' },
      [key(city.q + 1, city.r)]: { terrain: 'plains' }, // koszt 1
      [key(city.q + 2, city.r)]: { terrain: 'hills' }, // koszt 3
    };
    next = setArmyPath(next, startId, path);
    next = tickArmiesMovement(next, 3, mapHexes); // 0.75 pkt - za mało na pierwszy krok

    const stepId = armyIdAt('player', city.q + 1, city.r);
    next = tickArmiesMovement(next, 2, mapHexes); // +0.5 pkt = 1.25 - starcza na pierwszy krok (koszt 1)
    assert.ok(!next.armies[startId]);
    assert.ok(next.armies[stepId]);
    assert.equal(next.armies[stepId].progress, 0.25);
    assert.deepEqual(next.armies[stepId].path, [{ q: city.q + 2, r: city.r }]);
  });

  test('tickArmiesMovement nie rusza armii bez zleconej ścieżki', () => {
    const state = createInitialState();
    const next = recruitUnit(state, 'krakow', 'cavalry', 'army');
    const city = next.cities.krakow;
    const armyId = armyIdAt('player', city.q, city.r);
    const moved = tickArmiesMovement(next, 10, state.map.hexes);
    assert.equal(moved.armies[armyId].q, city.q);
    assert.equal(moved.armies[armyId].r, city.r);
  });

  test('tickArmiesMovement łączy armię z inną tego samego właściciela na docelowym heksie', () => {
    const state = createInitialState();
    let next = recruitUnit(state, 'krakow', 'infantry', 'army'); // 0.25 pkt/sek
    const city = next.cities.krakow;
    const targetHex = { q: city.q + 1, r: city.r };
    const targetId = armyIdAt('player', targetHex.q, targetHex.r);
    next = {
      ...next,
      armies: {
        ...next.armies,
        [targetId]: { id: targetId, owner: 'player', q: targetHex.q, r: targetHex.r, units: [{ type: 'archers', count: 2 }], path: null, progress: 0 },
      },
    };
    const startId = armyIdAt('player', city.q, city.r);
    const mapHexes = {
      [key(city.q, city.r)]: { terrain: 'plains' },
      [key(targetHex.q, targetHex.r)]: { terrain: 'plains' },
    };
    next = setArmyPath(next, startId, [targetHex]);

    const moved = tickArmiesMovement(next, 10, mapHexes); // z dużym zapasem dt
    assert.equal(Object.keys(moved.armies).length, 1);
    const merged = moved.armies[targetId];
    assert.equal(merged.units.length, 2);
    assert.deepEqual(merged.path, []);
  });
});
