import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { processTatarAI } from '../../public/js/engine/ai.js';
import { armyIdAt } from '../../public/js/engine/units.js';
import { offsetToAxial, neighborsOf, key } from '../../public/js/engine/hexgrid.js';
import { TATAR_SPAWN_OFFSETS } from '../../public/js/data/mapData.js';
import { TATAR_WAVES, WAVE_WITHDRAW_AFTER_TURNS } from '../../public/js/data/missionConfig.js';

function withTatarArmy(state, atHex, units, movementLeft = 99) {
  const armyId = armyIdAt('tatar', atHex.q, atHex.r);
  return {
    ...state,
    armies: { ...state.armies, [armyId]: { id: armyId, owner: 'tatar', q: atHex.q, r: atHex.r, units, movementLeft } },
  };
}

describe('ai (najazdy tatarskie)', () => {
  test('fala 1 pojawia się dokładnie w turze spawnTurn i od razu rusza w głąb lądu', () => {
    const state = { ...createInitialState(), turn: TATAR_WAVES[0].spawnTurn };
    const next = processTatarAI(state, state.map.hexes);

    assert.equal(next.waves.length, 1);
    assert.equal(next.waves[0].id, 1);
    assert.equal(next.waves[0].withdrawn, false);
    // Fala rusza w stronę najbliższego miasta gracza w tej samej turze, w której się
    // pojawia - jeśli spawn wypada blisko granicy, może nawet od razu zdobyć miasto,
    // więc liczy się ślad jej działania (armia w polu albo świeżo zdobyte miasto).
    const roamingTatarArmies = Object.values(next.armies).filter((a) => a.owner === 'tatar').length;
    const capturedCities = Object.values(next.cities).filter((c) => c.owner === 'tatar').length;
    assert.ok(roamingTatarArmies + capturedCities >= 1, 'fala powinna zaznaczyć swoją obecność na mapie');
  });

  test('żadna fala nie pojawia się w turze niepasującej do harmonogramu', () => {
    const state = { ...createInitialState(), turn: 4 };
    const next = processTatarAI(state, state.map.hexes);
    assert.equal(next.waves.length, 0);
    assert.equal(Object.values(next.armies).filter((a) => a.owner === 'tatar').length, 0);
  });

  test('armia tatarska rusza w stronę najbliższego miasta gracza', () => {
    const state = createInitialState();
    const city = state.cities.sandomierz;
    const startHex = neighborsOf(city.q, city.r).find((n) => state.map.hexes[key(n.q, n.r)] && !(n.q === city.q && n.r === city.r));
    const withArmy = withTatarArmy(state, startHex, [{ type: 'tatar-raiders', count: 1 }]);

    const next = processTatarAI(withArmy, withArmy.map.hexes);
    const stillAtStart = armyIdAt('tatar', startHex.q, startHex.r);
    assert.ok(!next.armies[stillAtStart] || next.armies[stillAtStart].q !== startHex.q, 'armia powinna się przesunąć w stronę Sandomierza');
  });

  test('armia tatarska szturmuje miasto natychmiast po dotarciu na jego heks', () => {
    const state = createInitialState();
    const city = state.cities.sandomierz;
    const startHex = neighborsOf(city.q, city.r).find((n) => state.map.hexes[key(n.q, n.r)]);
    const withArmy = withTatarArmy(state, startHex, [{ type: 'tatar-elite', count: 30 }]);

    const next = processTatarAI(withArmy, withArmy.map.hexes);
    assert.equal(next.cities.sandomierz.owner, 'tatar', 'przytłaczająca armia powinna zdobyć miasto tej samej tury, gdy dotrze na heks');
  });

  test('niepokonana fala wycofuje się po WAVE_WITHDRAW_AFTER_TURNS turach od spawnu', () => {
    const spawnedTurn = 3;
    const state = {
      ...createInitialState(),
      turn: spawnedTurn + WAVE_WITHDRAW_AFTER_TURNS,
      waves: [{ id: 1, year: 1241, spawnedTurn, withdrawn: false }],
    };
    const withArmy = withTatarArmy(state, offsetToAxial(11, 3), [{ type: 'tatar-raiders', count: 5 }]);

    const next = processTatarAI(withArmy, withArmy.map.hexes);

    assert.equal(Object.values(next.armies).filter((a) => a.owner === 'tatar').length, 0);
    assert.equal(next.waves[0].withdrawn, true);
    assert.ok(next.log.some((e) => e.type === 'wave-withdraw' && e.waveId === 1));
  });

  test('wycofana fala nie jest ponownie usuwana przy kolejnych wywołaniach (idempotencja flagi)', () => {
    const spawnedTurn = 3;
    let state = {
      ...createInitialState(),
      turn: spawnedTurn + WAVE_WITHDRAW_AFTER_TURNS,
      waves: [{ id: 1, year: 1241, spawnedTurn, withdrawn: true }],
    };
    // movementLeft=1: za mało, by w jednej turze dotrzeć do jakiegokolwiek miasta
    // gracza i sprowokować walkę - test ma sprawdzić samą flagę wycofania, nie ruch.
    state = withTatarArmy(state, offsetToAxial(11, 3), [{ type: 'tatar-raiders', count: 5 }], 1);

    const next = processTatarAI(state, state.map.hexes);
    // Fala już oznaczona jako wycofana - istniejąca (nowo dostawiona w teście) armia
    // tatarska powinna normalnie próbować się poruszyć, a nie zostać usunięta.
    assert.equal(Object.values(next.armies).filter((a) => a.owner === 'tatar').length, 1);
  });
});
