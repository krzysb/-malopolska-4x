import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { recruitUnit, moveArmyAlongPath } from '../../public/js/engine/units.js';
import { findPath } from '../../public/js/engine/pathfinding.js';
import { resolveBattle } from '../../public/js/engine/combat.js';
import { endTurn } from '../../public/js/engine/turn.js';
import { createRngSequence } from '../../public/js/engine/rng.js';
import { neighborsOf, key } from '../../public/js/engine/hexgrid.js';

// AI tatarskie dołączy dopiero w kroku 7 (ai.js) - ten fuzz-test sprawdza samą
// pętlę gracza (rekrutacja, ruch po ścieżce z pathfindingu, atak, koniec tury)
// zanim dojdzie druga strona konfliktu.
const UNIT_CHOICES = ['infantry', 'archers', 'cavalry'];
const TURNS_PER_GAME = 40;
const GAMES = 5;

function assertValidState(state) {
  assert.ok(state.player.gold >= 0, 'złoto nie może być ujemne');
  assert.ok(Number.isInteger(state.turn));
  for (const city of Object.values(state.cities)) {
    for (const u of city.garrison) {
      assert.ok(Number.isInteger(u.count) && u.count > 0, `garnizon ${city.id} ma niepoprawną liczność ${u.type}`);
    }
  }
  for (const army of Object.values(state.armies)) {
    assert.ok(army.movementLeft >= 0, `armia ${army.id} ma ujemne punkty ruchu`);
    for (const u of army.units) {
      assert.ok(Number.isInteger(u.count) && u.count > 0, `armia ${army.id} ma niepoprawną liczność ${u.type}`);
    }
  }
}

describe('fuzz: losowy gracz przez wiele tur', () => {
  for (let game = 1; game <= GAMES; game++) {
    test(`gra #${game}: silnik nie rzuca wyjątków i stan pozostaje spójny przez ${TURNS_PER_GAME} tur`, () => {
      let state = createInitialState({ seed: game * 101 + 7 });
      const seq = createRngSequence(game * 997 + 3);

      for (let t = 0; t < TURNS_PER_GAME; t++) {
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
        if (state.status !== 'playing') break; // gra może zakończyć się wcześniej (zwycięstwo/porażka)
      }

      assert.ok(['playing', 'victory', 'defeat'].includes(state.status));
      assert.ok(state.turn <= TURNS_PER_GAME + 1);
    });
  }
});
