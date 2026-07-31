import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import {
  resolveBattle, applyCasualties, totalUnitCount, MIN_CASUALTY_RATE, MAX_CASUALTY_RATE,
} from '../../public/js/engine/combat.js';

function withArmy(state, armyId, owner, atHex, units) {
  return {
    ...state,
    armies: { ...state.armies, [armyId]: { id: armyId, owner, q: atHex.q, r: atHex.r, units, movementLeft: 0 } },
  };
}

describe('combat', () => {
  test('applyCasualties zaokrągla straty proporcjonalnie i usuwa wyzerowane typy', () => {
    const result = applyCasualties([{ type: 'infantry', count: 10 }, { type: 'archers', count: 2 }], 0.9);
    assert.deepEqual(result, [{ type: 'infantry', count: 1 }]); // 10*0.1=1, 2*0.1=0.2 -> zaokrąglone do 0, usunięte
  });

  test('przytłaczający atak na słabo broniony neutralny gród: zdobycie miasta', () => {
    const state = createInitialState();
    const city = state.cities.wislica; // neutralne miasto, garnizon [{infantry,2}]
    const stateWithArmy = withArmy(state, 'atk1', 'player', city, [{ type: 'cavalry', count: 50 }]);

    const next = resolveBattle(stateWithArmy, 'atk1', { type: 'city', id: 'wislica' }, state.map.hexes);

    assert.equal(next.cities.wislica.owner, 'player');
    assert.equal(totalUnitCount(next.cities.wislica.garrison), 48); // straty ataku ograniczone przez MIN_CASUALTY_RATE
    assert.ok(!next.armies.atk1, 'armia atakująca wchłonięta jako garnizon zdobytego miasta');
    assert.notEqual(next.rngSeed, state.rngSeed);
  });

  test('słaby atak na silnie broniony gród: odparcie, atakujący zniszczony', () => {
    const state = createInitialState();
    const city = state.cities.wislica;
    const withDefenders = { ...state, cities: { ...state.cities, wislica: { ...city, garrison: [{ type: 'cavalry', count: 50 }] } } };
    const stateWithArmy = withArmy(withDefenders, 'atk1', 'player', city, [{ type: 'infantry', count: 2 }]);

    const next = resolveBattle(stateWithArmy, 'atk1', { type: 'city', id: 'wislica' }, state.map.hexes);

    assert.equal(next.cities.wislica.owner, 'neutral'); // miasto nie zdobyte
    assert.ok(!next.armies.atk1, 'słaba armia atakująca zniszczona');
    assert.equal(totalUnitCount(next.cities.wislica.garrison), 48); // obrońca też ponosi minimalne straty
  });

  test('bitwa polowa: zwycięzca przeżywa osłabiony, pokonana armia znika z mapy', () => {
    const state = createInitialState();
    const hex = { q: state.cities.wislica.q, r: state.cities.wislica.r };
    let withArmies = withArmy(state, 'tatar1', 'tatar', hex, [{ type: 'tatar-elite', count: 2 }]);
    withArmies = withArmy(withArmies, 'atk1', 'player', hex, [{ type: 'cavalry', count: 50 }]);

    const next = resolveBattle(withArmies, 'atk1', { type: 'army', id: 'tatar1' }, state.map.hexes);

    assert.ok(!next.armies.tatar1, 'pokonana armia tatarska usunięta ze stanu');
    assert.ok(next.armies.atk1);
    assert.equal(totalUnitCount(next.armies.atk1.units), 48);
  });

  test('resolveBattle jest deterministyczna dla tego samego stanu wejściowego', () => {
    const state = createInitialState();
    const stateWithArmy = withArmy(state, 'atk1', 'player', state.cities.wislica, [{ type: 'cavalry', count: 5 }]);

    const a = resolveBattle(stateWithArmy, 'atk1', { type: 'city', id: 'wislica' }, state.map.hexes);
    const b = resolveBattle(stateWithArmy, 'atk1', { type: 'city', id: 'wislica' }, state.map.hexes);

    assert.deepEqual(a, b);
  });

  test('resolveBattle nie zmienia stanu, gdy atakująca armia lub cel nie istnieją', () => {
    const state = createInitialState();
    assert.equal(resolveBattle(state, 'brak-armii', { type: 'city', id: 'wislica' }, state.map.hexes), state);
    const stateWithArmy = withArmy(state, 'atk1', 'player', state.cities.wislica, [{ type: 'cavalry', count: 5 }]);
    assert.equal(resolveBattle(stateWithArmy, 'atk1', { type: 'city', id: 'brak-miasta' }, state.map.hexes), stateWithArmy);
  });

  test('MIN/MAX_CASUALTY_RATE ograniczają ekstremalne wyniki po obu stronach', () => {
    assert.equal(MIN_CASUALTY_RATE, 0.05);
    assert.equal(MAX_CASUALTY_RATE, 0.9);
  });

  test('kościół w mieście podnosi obronę garnizonu (moraleBonus), nie tylko mury', () => {
    const state = createInitialState();
    const city = { ...state.cities.wislica, garrison: [{ type: 'infantry', count: 30 }] };
    const withoutChurch = withArmy({ ...state, cities: { ...state.cities, wislica: city } }, 'atk1', 'player', city, [{ type: 'cavalry', count: 20 }]);
    const withChurch = withArmy(
      { ...state, cities: { ...state.cities, wislica: { ...city, buildings: { ...city.buildings, church: 1 } } } },
      'atk1', 'player', city, [{ type: 'cavalry', count: 20 }],
    );

    const resultWithout = resolveBattle(withoutChurch, 'atk1', { type: 'city', id: 'wislica' }, state.map.hexes);
    const resultWith = resolveBattle(withChurch, 'atk1', { type: 'city', id: 'wislica' }, state.map.hexes);

    const survivorsWithout = totalUnitCount(resultWithout.cities.wislica.garrison);
    const survivorsWith = totalUnitCount(resultWith.cities.wislica.garrison);
    assert.ok(survivorsWith > survivorsWithout, 'kościół powinien ograniczyć straty obrońcy w tej samej walce');
  });
});
