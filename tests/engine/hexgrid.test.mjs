import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  key, parseKey, neighborsOf, hexDistance, offsetToAxial, axialToOffset,
  axialToPixel, hexPolygonPoints, generateRectangle, NEIGHBOR_OFFSETS,
} from '../../public/js/engine/hexgrid.js';

describe('hexgrid', () => {
  test('key/parseKey są odwrotnościami', () => {
    assert.equal(key(3, -2), '3,-2');
    assert.deepEqual(parseKey('3,-2'), { q: 3, r: -2 });
  });

  test('neighborsOf zwraca 6 sąsiadów zgodnych z NEIGHBOR_OFFSETS', () => {
    const n = neighborsOf(0, 0);
    assert.equal(n.length, 6);
    assert.deepEqual(n, NEIGHBOR_OFFSETS.map(([dq, dr]) => ({ q: dq, r: dr })));
  });

  test('hexDistance liczy poprawny dystans axial', () => {
    assert.equal(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 }), 0);
    assert.equal(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 }), 3);
    assert.equal(hexDistance({ q: 0, r: 0 }, { q: 0, r: 3 }), 3);
    // każdy sąsiad jest w odległości 1
    for (const n of neighborsOf(2, -1)) {
      assert.equal(hexDistance({ q: 2, r: -1 }, n), 1);
    }
  });

  test('offsetToAxial i axialToOffset są odwrotnościami dla siatki 12x7', () => {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 12; col++) {
        const { q, r } = offsetToAxial(col, row);
        const back = axialToOffset(q, r);
        assert.deepEqual(back, { col, row }, `col=${col} row=${row}`);
      }
    }
  });

  test('generateRectangle tworzy cols*rows unikalnych heksów', () => {
    const hexes = generateRectangle(12, 7);
    assert.equal(hexes.length, 84);
    const keys = new Set(hexes.map((h) => key(h.q, h.r)));
    assert.equal(keys.size, 84, 'wszystkie klucze axial powinny być unikalne');
  });

  test('axialToPixel daje różne piksele dla różnych heksów (brak nakładania)', () => {
    const hexes = generateRectangle(12, 7);
    const pixelKeys = new Set(hexes.map((h) => {
      const { x, y } = axialToPixel(h.q, h.r, 10);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }));
    assert.equal(pixelKeys.size, 84);
  });

  test('hexPolygonPoints zwraca 6 wierzchołków', () => {
    const pts = hexPolygonPoints(0, 0, 10);
    assert.equal(pts.length, 6);
    for (const [x, y] of pts) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
    }
  });
});
