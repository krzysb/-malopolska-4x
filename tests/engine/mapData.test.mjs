import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, CITIES, TERRAIN, buildTerrainGrid, TATAR_SPAWN_OFFSETS } from '../../public/js/data/mapData.js';

describe('mapData', () => {
  test('buildTerrainGrid zwraca COLS*ROWS pól', () => {
    const grid = buildTerrainGrid();
    assert.equal(grid.length, COLS * ROWS);
  });

  test('każde miasto ma teren PLAINS (nie koliduje z rzeką/wzgórzami/górami)', () => {
    const grid = buildTerrainGrid();
    const terrainAt = new Map(grid.map((t) => [`${t.col},${t.row}`, t.terrain]));
    for (const city of CITIES) {
      assert.equal(terrainAt.get(`${city.col},${city.row}`), TERRAIN.PLAINS, `${city.name} powinno stać na równinie`);
    }
  });

  test('wszystkie miasta mieszczą się w granicach mapy', () => {
    for (const city of CITIES) {
      assert.ok(city.col >= 0 && city.col < COLS, `${city.name} col w granicach`);
      assert.ok(city.row >= 0 && city.row < ROWS, `${city.name} row w granicach`);
    }
  });

  test('dokładnie 7 miast, bez duplikatów współrzędnych', () => {
    assert.equal(CITIES.length, 7);
    const coords = new Set(CITIES.map((c) => `${c.col},${c.row}`));
    assert.equal(coords.size, 7);
  });

  test('dokładnie 2 miasta gracza (w tym jedna stolica) i 5 neutralnych', () => {
    const playerCities = CITIES.filter((c) => c.owner === 'player');
    const neutralCities = CITIES.filter((c) => c.owner === 'neutral');
    assert.equal(playerCities.length, 2);
    assert.equal(neutralCities.length, 5);
    assert.equal(playerCities.filter((c) => c.capital).length, 1);
  });

  test('pola startowe najazdów tatarskich leżą w granicach mapy i nie są nieprzejezdne', () => {
    const grid = buildTerrainGrid();
    const terrainAt = new Map(grid.map((t) => [`${t.col},${t.row}`, t.terrain]));
    for (const [col, row] of TATAR_SPAWN_OFFSETS) {
      assert.ok(col >= 0 && col < COLS && row >= 0 && row < ROWS);
      assert.notEqual(terrainAt.get(`${col},${row}`), TERRAIN.IMPASSABLE);
    }
  });
});
