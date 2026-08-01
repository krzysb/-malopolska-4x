import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import {
  buildingLevel, nextBuildingCost, canBuild, buildBuilding,
  cityGoldIncomePerSec, cityGrowthPerSec, tickCityGrowth, tickCityEconomy, maxCityLevel,
} from '../../public/js/engine/cities.js';

describe('cities', () => {
  test('nextBuildingCost zwraca koszt pierwszego poziomu, potem null po max. poziomie', () => {
    const state = createInitialState();
    const city = state.cities.krakow;
    assert.equal(nextBuildingCost(city, 'church'), 45);
    const maxed = { ...city, buildings: { ...city.buildings, church: 1 } };
    assert.equal(nextBuildingCost(maxed, 'church'), null);
  });

  test('canBuild sprawdza dostępność złota', () => {
    const state = createInitialState();
    const city = state.cities.krakow;
    assert.equal(canBuild(city, 'walls', 39), false);
    assert.equal(canBuild(city, 'walls', 40), true);
  });

  test('buildBuilding odejmuje złoto i podnosi poziom budynku', () => {
    const state = createInitialState();
    const goldBefore = state.player.gold;
    const next = buildBuilding(state, 'krakow', 'market');
    assert.equal(buildingLevel(next.cities.krakow, 'market'), 1);
    assert.equal(next.player.gold, goldBefore - 30);
    // stan wejściowy pozostaje niezmieniony (czysta funkcja)
    assert.equal(buildingLevel(state.cities.krakow, 'market'), 0);
  });

  test('buildBuilding nie zmienia stanu, gdy brak złota lub max. poziom', () => {
    const state = createInitialState();
    const poor = { ...state, player: { gold: 0 } };
    assert.equal(buildBuilding(poor, 'krakow', 'walls'), poor);

    let maxed = state;
    for (let i = 0; i < 5; i++) maxed = buildBuilding(maxed, 'krakow', 'church');
    assert.equal(buildingLevel(maxed.cities.krakow, 'church'), 1);
  });

  test('cityGoldIncomePerSec i cityGrowthPerSec rosną z poziomem budynków', () => {
    const state = createInitialState();
    const base = state.cities.krakow;
    const withMarket = { ...base, buildings: { ...base.buildings, market: 2 } };
    assert.ok(cityGoldIncomePerSec(withMarket) > cityGoldIncomePerSec(base));

    const withGranary = { ...base, buildings: { ...base.buildings, granary: 2 } };
    assert.ok(cityGrowthPerSec(withGranary) > cityGrowthPerSec(base));
  });

  test('tickCityGrowth podnosi poziom miasta po przekroczeniu progu, nie przekracza max', () => {
    let city = { level: 1, growth: 0, buildings: { granary: 0, market: 0, walls: 0, barracks: 0, church: 0 } };
    for (let i = 0; i < 1000; i++) city = tickCityGrowth(city, 1);
    assert.equal(city.level, maxCityLevel());
  });

  test('tickCityEconomy nalicza złoto i wzrost (o dtSeconds) tylko dla miast gracza', () => {
    const state = createInitialState();
    const next = tickCityEconomy(state, 10);
    assert.ok(next.player.gold > state.player.gold, 'złoto powinno wzrosnąć');
    assert.ok(next.cities.krakow.growth > 0, 'miasto gracza powinno się rozwijać');
    assert.equal(next.cities.wislica.growth, 0, 'miasto neutralne nie powinno się rozwijać');
  });
});
