import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { tickTatarAI } from '../../public/js/engine/ai.js';
import { tick } from '../../public/js/engine/simulation.js';
import { armyIdAt } from '../../public/js/engine/units.js';
import { offsetToAxial, neighborsOf, key } from '../../public/js/engine/hexgrid.js';
import { TATAR_SPAWN_OFFSETS } from '../../public/js/data/mapData.js';
import { TATAR_WAVES, WAVE_WITHDRAW_AFTER_SEC } from '../../public/js/data/missionConfig.js';

function withTatarArmy(state, atHex, units) {
  const armyId = armyIdAt('tatar', atHex.q, atHex.r);
  return {
    ...state,
    armies: { ...state.armies, [armyId]: { id: armyId, owner: 'tatar', q: atHex.q, r: atHex.r, units, path: null, progress: 0 } },
  };
}

describe('ai (najazdy tatarskie)', () => {
  test('fala 1 pojawia się, gdy state.time osiąga jej spawnTimeSec', () => {
    const state = { ...createInitialState(), time: TATAR_WAVES[0].spawnTimeSec };
    const next = tickTatarAI(state, state.map.hexes);

    assert.equal(next.waves.length, 1);
    assert.equal(next.waves[0].id, 1);
    assert.equal(next.waves[0].withdrawn, false);
    assert.equal(Object.values(next.armies).filter((a) => a.owner === 'tatar').length, 1);
  });

  test('żadna fala nie pojawia się przed swoim spawnTimeSec', () => {
    const state = { ...createInitialState(), time: 5 }; // < spawnTimeSec fali 1 (24)
    const next = tickTatarAI(state, state.map.hexes);
    assert.equal(next.waves.length, 0);
    assert.equal(Object.values(next.armies).filter((a) => a.owner === 'tatar').length, 0);
  });

  test('bezczynna armia tatarska dostaje zleconą ścieżkę do najbliższego miasta gracza', () => {
    const state = createInitialState();
    const city = state.cities.sandomierz;
    const startHex = neighborsOf(city.q, city.r).find((n) => state.map.hexes[key(n.q, n.r)] && !(n.q === city.q && n.r === city.r));
    const withArmy = withTatarArmy(state, startHex, [{ type: 'tatar-raiders', count: 1 }]);

    const next = tickTatarAI(withArmy, withArmy.map.hexes);
    const armyId = armyIdAt('tatar', startHex.q, startHex.r);
    assert.ok(next.armies[armyId].path && next.armies[armyId].path.length > 0, 'armia powinna dostać zleconą ścieżkę w stronę Sandomierza');
  });

  test('armia tatarska w marszu nie dostaje nowej ścieżki (progres by się zresetował)', () => {
    const state = createInitialState();
    const city = state.cities.sandomierz;
    const startHex = neighborsOf(city.q, city.r).find((n) => state.map.hexes[key(n.q, n.r)]);
    let withArmy = withTatarArmy(state, startHex, [{ type: 'tatar-raiders', count: 1 }]);
    const armyId = armyIdAt('tatar', startHex.q, startHex.r);
    const existingPath = [{ q: city.q, r: city.r }];
    withArmy = { ...withArmy, armies: { ...withArmy.armies, [armyId]: { ...withArmy.armies[armyId], path: existingPath, progress: 0.5 } } };

    const next = tickTatarAI(withArmy, withArmy.map.hexes);
    assert.deepEqual(next.armies[armyId].path, existingPath);
    assert.equal(next.armies[armyId].progress, 0.5, 'progress nie powinien zostać zresetowany przez ponowne zlecenie tej samej trasy');
  });

  test('armia tatarska szturmuje miasto po dotarciu na jego heks (pełny tick symulacji)', () => {
    const state = createInitialState();
    const city = state.cities.sandomierz;
    const startHex = neighborsOf(city.q, city.r).find((n) => state.map.hexes[key(n.q, n.r)]);
    let withArmy = withTatarArmy(state, startHex, [{ type: 'tatar-elite', count: 30 }]);

    withArmy = tick(withArmy, 0.001); // krok 1: AI zleca ścieżkę
    const armyId = Object.keys(withArmy.armies).find((id) => withArmy.armies[id].owner === 'tatar');
    assert.ok(withArmy.armies[armyId].path && withArmy.armies[armyId].path.length > 0);

    const afterAssault = tick(withArmy, 1000); // krok 2: dt ogromne - dociera i szturmuje w tym samym ticku
    assert.equal(afterAssault.cities.sandomierz.owner, 'tatar', 'przytłaczająca armia powinna zdobyć miasto po dotarciu');
  });

  test('niepokonana fala wycofuje się po WAVE_WITHDRAW_AFTER_SEC sekundach od spawnu', () => {
    const spawnedTime = 24;
    const state = {
      ...createInitialState(),
      time: spawnedTime + WAVE_WITHDRAW_AFTER_SEC,
      waves: [{ id: 1, year: 1241, spawnedTime, withdrawn: false }],
    };
    const withArmy = withTatarArmy(state, offsetToAxial(11, 3), [{ type: 'tatar-raiders', count: 5 }]);

    const next = tickTatarAI(withArmy, withArmy.map.hexes);

    assert.equal(Object.values(next.armies).filter((a) => a.owner === 'tatar').length, 0);
    assert.equal(next.waves[0].withdrawn, true);
    assert.ok(next.log.some((e) => e.type === 'wave-withdraw' && e.waveId === 1));
  });

  test('wycofana fala nie jest ponownie usuwana przy kolejnych wywołaniach (idempotencja flagi)', () => {
    const spawnedTime = 24;
    let state = {
      ...createInitialState(),
      time: spawnedTime + WAVE_WITHDRAW_AFTER_SEC,
      waves: [{ id: 1, year: 1241, spawnedTime, withdrawn: true }],
    };
    state = withTatarArmy(state, offsetToAxial(11, 3), [{ type: 'tatar-raiders', count: 5 }]);

    const next = tickTatarAI(state, state.map.hexes);
    // Fala już oznaczona jako wycofana - istniejąca (nowo dostawiona w teście) armia
    // tatarska powinna dostać zlecenie marszu, a nie zostać usunięta.
    assert.equal(Object.values(next.armies).filter((a) => a.owner === 'tatar').length, 1);
  });
});
