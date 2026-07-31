import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { findPath } from '../../public/js/engine/pathfinding.js';
import { offsetToAxial } from '../../public/js/engine/hexgrid.js';

describe('pathfinding', () => {
  test('findPath zwraca pustą tablicę, gdy start === target', () => {
    const state = createInitialState();
    const start = { q: state.cities.krakow.q, r: state.cities.krakow.r };
    assert.deepEqual(findPath(state.map.hexes, start, start), []);
  });

  test('findPath zwraca null dla celu poza mapą', () => {
    const state = createInitialState();
    const start = { q: state.cities.krakow.q, r: state.cities.krakow.r };
    assert.equal(findPath(state.map.hexes, start, { q: 999, r: 999 }), null);
  });

  test('findPath znajduje najkrótszą trasę po równinach (koszt 1 na krok)', () => {
    const state = createInitialState();
    const start = offsetToAxial(0, 0);
    const target = offsetToAxial(2, 0);
    const path = findPath(state.map.hexes, start, target);
    assert.ok(path);
    assert.equal(path.length, 2);
    assert.deepEqual(path[path.length - 1], target);
  });

  test('findPath omija heksy nieprzejezdne (najwyższe partie gór)', () => {
    const state = createInitialState();
    // [5,6] jest zdefiniowany jako IMPASSABLE_OFFSETS w mapData.js
    const impassable = offsetToAxial(5, 6);
    const neighborStart = offsetToAxial(5, 5);
    const path = findPath(state.map.hexes, neighborStart, impassable);
    assert.equal(path, null);
  });

  test('findPath zwraca trasę zgodną z sumą kosztów terenu (nie samą liczbą kroków)', () => {
    const state = createInitialState();
    // Kraków (5,2) do Wiślicy (4,4): trasa może przechodzić przez las/rzekę, ale
    // zawsze istnieje jakaś droga po tej mapie.
    const start = { q: state.cities.krakow.q, r: state.cities.krakow.r };
    const target = { q: state.cities.wislica.q, r: state.cities.wislica.r };
    const path = findPath(state.map.hexes, start, target);
    assert.ok(path);
    assert.ok(path.length > 0);
    assert.deepEqual(path[path.length - 1], target);
  });
});
