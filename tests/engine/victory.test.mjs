import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { checkVictoryConditions } from '../../public/js/engine/victory.js';
import { tick } from '../../public/js/engine/simulation.js';
import { VICTORY_CITY_THRESHOLD, MAX_TIME_SEC, TATAR_WAVES } from '../../public/js/data/missionConfig.js';

describe('victory', () => {
  test('gra trwa dalej, gdy żaden warunek nie jest spełniony', () => {
    const state = createInitialState();
    assert.equal(checkVictoryConditions(state).status, 'playing');
  });

  test('utrata Krakowa oznacza natychmiastową porażkę', () => {
    const state = createInitialState();
    const lost = { ...state, cities: { ...state.cities, krakow: { ...state.cities.krakow, owner: 'tatar' } } };
    assert.equal(checkVictoryConditions(lost).status, 'defeat');
  });

  test('utrata wszystkich miast oznacza porażkę', () => {
    const state = createInitialState();
    const cities = {};
    for (const [id, city] of Object.entries(state.cities)) cities[id] = { ...city, owner: 'tatar' };
    assert.equal(checkVictoryConditions({ ...state, cities }).status, 'defeat');
  });

  test(`≥${VICTORY_CITY_THRESHOLD} miast po zakończeniu 3. fali oznacza zwycięstwo`, () => {
    const state = createInitialState();
    const cities = { ...state.cities };
    const ids = Object.keys(cities);
    for (let i = 0; i < VICTORY_CITY_THRESHOLD; i++) cities[ids[i]] = { ...cities[ids[i]], owner: 'player' };
    const won = {
      ...state,
      cities,
      waves: [{ id: 3, year: 1287, spawnedTime: 216, withdrawn: true }],
      armies: {}, // brak aktywnych armii tatarskich - fala 3 "zakończona"
    };
    assert.equal(checkVictoryConditions(won).status, 'victory');
  });

  test('fala 3. jeszcze aktywna (armia tatarska na mapie) blokuje zwycięstwo mimo liczby miast', () => {
    const state = createInitialState();
    const cities = { ...state.cities };
    const ids = Object.keys(cities);
    for (let i = 0; i < VICTORY_CITY_THRESHOLD; i++) cities[ids[i]] = { ...cities[ids[i]], owner: 'player' };
    const stillFighting = {
      ...state,
      cities,
      waves: [{ id: 3, year: 1287, spawnedTime: 216, withdrawn: false }],
      armies: { 'tatar@0,0': { id: 'tatar@0,0', owner: 'tatar', q: 0, r: 0, units: [{ type: 'tatar-raiders', count: 1 }], path: null, progress: 0 } },
    };
    assert.equal(checkVictoryConditions(stillFighting).status, 'playing');
  });

  test('przekroczenie limitu czasu bez zwycięstwa oznacza porażkę', () => {
    const state = createInitialState();
    const overLimit = { ...state, time: MAX_TIME_SEC };
    assert.equal(checkVictoryConditions(overLimit).status, 'defeat');
  });

  test('status końcowy jest trwały - kolejne wywołania nie nadpisują wyniku', () => {
    const state = createInitialState();
    const victorious = { ...state, status: 'victory' };
    assert.equal(checkVictoryConditions(victorious).status, 'victory');
    const defeated = { ...state, status: 'defeat' };
    assert.equal(checkVictoryConditions(defeated).status, 'defeat');
  });

  test('tick (symulacja) nie zmienia już zakończonego stanu gry', () => {
    const state = createInitialState();
    const ended = { ...state, status: 'defeat' };
    assert.equal(tick(ended, 1), ended);
  });

  test('harmonogram fal: ostatnia (3.) fala pojawia się przed MAX_TIME_SEC', () => {
    assert.ok(TATAR_WAVES[TATAR_WAVES.length - 1].spawnTimeSec < MAX_TIME_SEC);
  });
});
