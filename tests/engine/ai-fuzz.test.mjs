import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { recruitUnit, moveArmyAlongPath } from '../../public/js/engine/units.js';
import { findPath } from '../../public/js/engine/pathfinding.js';
import { resolveBattle } from '../../public/js/engine/combat.js';
import { endTurn } from '../../public/js/engine/turn.js';
import { createRngSequence } from '../../public/js/engine/rng.js';
import { neighborsOf, key } from '../../public/js/engine/hexgrid.js';
import { MAX_TURNS } from '../../public/js/data/missionConfig.js';

// Pełna symulacja rozgrywki (gracz + AI tatarska) przez cały limit tur misji -
// silnik musi przejść przez to bez wyjątków, z niezmiennikami stanu zachowanymi
// przez cały czas, niezależnie od tego, jak "głupio" gra losowy gracz.
const UNIT_CHOICES = ['infantry', 'archers', 'cavalry'];
const GAMES = 5;

function assertValidState(state) {
  assert.ok(state.player.gold >= 0, 'złoto nie może być ujemne');
  assert.ok(Number.isInteger(state.turn));
  for (const city of Object.values(state.cities)) {
    assert.ok(['player', 'neutral', 'tatar'].includes(city.owner), `nieznany właściciel miasta ${city.id}: ${city.owner}`);
    for (const u of city.garrison) {
      assert.ok(Number.isInteger(u.count) && u.count > 0, `garnizon ${city.id} ma niepoprawną liczność ${u.type}`);
    }
  }
  for (const army of Object.values(state.armies)) {
    assert.ok(army.movementLeft >= 0, `armia ${army.id} ma ujemne punkty ruchu`);
    assert.ok(army.units.length > 0, `armia ${army.id} istnieje bez jednostek`);
    for (const u of army.units) {
      assert.ok(Number.isInteger(u.count) && u.count > 0, `armia ${army.id} ma niepoprawną liczność ${u.type}`);
    }
  }
  for (const wave of state.waves) {
    assert.ok(Number.isInteger(wave.spawnedTurn));
    assert.equal(typeof wave.withdrawn, 'boolean');
  }
}

describe('fuzz: pełna misja (gracz + fale tatarskie) przez limit tur', () => {
  for (let game = 1; game <= GAMES; game++) {
    test(`gra #${game}: silnik nie rzuca wyjątków przez ${MAX_TURNS} tur, stan pozostaje spójny`, () => {
      let state = createInitialState({ seed: game * 53 + 11 });
      const seq = createRngSequence(game * 617 + 5);

      for (let t = 0; t < MAX_TURNS; t++) {
        const playerCityIds = Object.keys(state.cities).filter((id) => state.cities[id].owner === 'player');

        if (playerCityIds.length > 0 && seq.next() < 0.6) {
          const cityId = playerCityIds[Math.floor(seq.next() * playerCityIds.length)];
          const unitType = UNIT_CHOICES[Math.floor(seq.next() * UNIT_CHOICES.length)];
          const destination = seq.next() < 0.5 ? 'garrison' : 'army';
          state = recruitUnit(state, cityId, unitType, destination);
          assertValidState(state);
        }

        const playerArmyIds = Object.entries(state.armies)
          .filter(([, a]) => a.owner === 'player')
          .map(([id]) => id);
        if (playerArmyIds.length > 0 && seq.next() < 0.7) {
          const armyId = playerArmyIds[Math.floor(seq.next() * playerArmyIds.length)];
          const army = state.armies[armyId];
          const candidates = neighborsOf(army.q, army.r).filter((n) => state.map.hexes[key(n.q, n.r)]);
          if (candidates.length > 0) {
            const target = candidates[Math.floor(seq.next() * candidates.length)];
            const path = findPath(state.map.hexes, { q: army.q, r: army.r }, target);
            if (path && path.length > 0) {
              state = moveArmyAlongPath(state, armyId, path, state.map.hexes);
              assertValidState(state);
            }
          }
        }

        const attackerIds = Object.entries(state.armies)
          .filter(([, a]) => a.owner === 'player')
          .map(([id]) => id);
        if (attackerIds.length > 0 && seq.next() < 0.4) {
          const armyId = attackerIds[Math.floor(seq.next() * attackerIds.length)];
          const army = state.armies[armyId];
          const cityHere = Object.values(state.cities).find((c) => c.q === army.q && c.r === army.r && c.owner !== 'player');
          if (cityHere) {
            state = resolveBattle(state, armyId, { type: 'city', id: cityHere.id }, state.map.hexes);
            assertValidState(state);
          }
        }

        state = endTurn(state);
        assertValidState(state);
      }

      assert.equal(state.turn, MAX_TURNS + 1);
      // Do końca limitu tur powinny zdążyć się pojawić wszystkie 3 fale (spawnTurn
      // ostatniej to 27, znacznie przed MAX_TURNS=40).
      assert.equal(state.waves.length, 3);
    });
  }
});
