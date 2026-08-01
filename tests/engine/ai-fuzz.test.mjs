import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { recruitUnit, setArmyPath } from '../../public/js/engine/units.js';
import { findPath } from '../../public/js/engine/pathfinding.js';
import { tick } from '../../public/js/engine/simulation.js';
import { createRngSequence } from '../../public/js/engine/rng.js';
import { neighborsOf, key } from '../../public/js/engine/hexgrid.js';
import { MAX_TIME_SEC } from '../../public/js/data/missionConfig.js';

// Pełna symulacja rozgrywki (gracz + AI tatarska) przez cały limit czasu misji -
// silnik musi przejść przez to bez wyjątków, z niezmiennikami stanu zachowanymi
// przez cały czas, niezależnie od tego, jak "głupio" gra losowy gracz.
const UNIT_CHOICES = ['infantry', 'archers', 'cavalry'];
const DT = 1; // sekunda symulacji na iterację
const ITERATIONS = MAX_TIME_SEC + 5;
const GAMES = 5;

function assertValidState(state) {
  assert.ok(state.player.gold >= 0, 'złoto nie może być ujemne');
  assert.ok(typeof state.time === 'number' && state.time >= 0);
  for (const city of Object.values(state.cities)) {
    assert.ok(['player', 'neutral', 'tatar'].includes(city.owner), `nieznany właściciel miasta ${city.id}: ${city.owner}`);
    for (const u of city.garrison) {
      assert.ok(Number.isInteger(u.count) && u.count > 0, `garnizon ${city.id} ma niepoprawną liczność ${u.type}`);
    }
  }
  for (const army of Object.values(state.armies)) {
    assert.ok(army.progress >= 0, `armia ${army.id} ma ujemny progress`);
    assert.ok(army.units.length > 0, `armia ${army.id} istnieje bez jednostek`);
    for (const u of army.units) {
      assert.ok(Number.isInteger(u.count) && u.count > 0, `armia ${army.id} ma niepoprawną liczność ${u.type}`);
    }
  }
  for (const wave of state.waves) {
    assert.ok(typeof wave.spawnedTime === 'number');
    assert.equal(typeof wave.withdrawn, 'boolean');
  }
}

describe('fuzz: pełna misja (gracz + fale tatarskie) przez limit czasu', () => {
  for (let game = 1; game <= GAMES; game++) {
    test(`gra #${game}: silnik nie rzuca wyjątków przez ${MAX_TIME_SEC}s, stan pozostaje spójny`, () => {
      let state = createInitialState({ seed: game * 53 + 11 });
      const seq = createRngSequence(game * 617 + 5);

      for (let i = 0; i < ITERATIONS; i++) {
        const playerCityIds = Object.keys(state.cities).filter((id) => state.cities[id].owner === 'player');

        if (playerCityIds.length > 0 && seq.next() < 0.1) {
          const cityId = playerCityIds[Math.floor(seq.next() * playerCityIds.length)];
          const unitType = UNIT_CHOICES[Math.floor(seq.next() * UNIT_CHOICES.length)];
          const destination = seq.next() < 0.5 ? 'garrison' : 'army';
          state = recruitUnit(state, cityId, unitType, destination);
          assertValidState(state);
        }

        const playerArmyIds = Object.entries(state.armies)
          .filter(([, a]) => a.owner === 'player')
          .map(([id]) => id);
        if (playerArmyIds.length > 0 && seq.next() < 0.15) {
          const armyId = playerArmyIds[Math.floor(seq.next() * playerArmyIds.length)];
          const army = state.armies[armyId];
          const candidates = neighborsOf(army.q, army.r).filter((n) => state.map.hexes[key(n.q, n.r)]);
          if (candidates.length > 0) {
            const target = candidates[Math.floor(seq.next() * candidates.length)];
            const path = findPath(state.map.hexes, { q: army.q, r: army.r }, target);
            if (path && path.length > 0) {
              state = setArmyPath(state, armyId, path);
              assertValidState(state);
            }
          }
        }

        state = tick(state, DT);
        assertValidState(state);
        if (state.status !== 'playing') break; // gra może zakończyć się wcześniej (zwycięstwo/porażka)
      }

      assert.ok(['playing', 'victory', 'defeat'].includes(state.status));
      assert.ok(state.time <= ITERATIONS * DT + 1);
      // Jeśli gra dotrwała do końca limitu czasu, wszystkie 3 fale zdążyły się pojawić
      // (spawnTimeSec ostatniej to 216, znacznie przed MAX_TIME_SEC=320).
      if (state.time >= MAX_TIME_SEC) {
        assert.equal(state.waves.length, 3);
      }
    });
  }
});
