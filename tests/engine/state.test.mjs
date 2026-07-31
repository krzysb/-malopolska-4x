import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { COLS, ROWS, CITIES } from '../../public/js/data/mapData.js';

describe('state', () => {
  test('tworzy siatkę mapy o rozmiarze COLS*ROWS', () => {
    const state = createInitialState();
    assert.equal(Object.keys(state.map.hexes).length, COLS * ROWS);
    assert.equal(state.map.cols, COLS);
    assert.equal(state.map.rows, ROWS);
  });

  test('tworzy wszystkie miasta z poprawnymi właścicielami', () => {
    const state = createInitialState();
    assert.equal(Object.keys(state.cities).length, CITIES.length);
    assert.equal(state.cities.krakow.owner, 'player');
    assert.equal(state.cities.krakow.capital, true);
    assert.equal(state.cities.sandomierz.owner, 'player');
    assert.equal(state.cities.wislica.owner, 'neutral');
  });

  test('każde miasto ma garnizon i jest powiązane z heksem mapy', () => {
    const state = createInitialState();
    for (const city of Object.values(state.cities)) {
      assert.ok(city.garrison.length > 0, `${city.name} powinno mieć garnizon`);
      const hexAtCity = state.map.hexes[`${city.q},${city.r}`];
      assert.equal(hexAtCity.cityId, city.id);
    }
  });

  test('stan startowy: tura 1, status playing, złoto gracza dodatnie', () => {
    const state = createInitialState();
    assert.equal(state.turn, 1);
    assert.equal(state.status, 'playing');
    assert.ok(state.player.gold > 0);
  });

  test('dwa wywołania createInitialState dają strukturalnie identyczny stan', () => {
    const a = createInitialState({ seed: 42 });
    const b = createInitialState({ seed: 42 });
    assert.deepEqual(a, b);
  });
});
