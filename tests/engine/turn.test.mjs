import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { recruitUnit } from '../../public/js/engine/units.js';
import { endTurn } from '../../public/js/engine/turn.js';

describe('turn', () => {
  test('endTurn zwiększa numer tury o 1', () => {
    const state = createInitialState();
    const next = endTurn(state);
    assert.equal(next.turn, state.turn + 1);
  });

  test('endTurn nalicza dochód złota z miast gracza', () => {
    const state = createInitialState();
    const next = endTurn(state);
    assert.ok(next.player.gold > state.player.gold);
  });

  test('endTurn resetuje punkty ruchu wszystkich armii', () => {
    const state = createInitialState();
    let withArmy = recruitUnit(state, 'krakow', 'cavalry', 'army');
    const armyId = Object.keys(withArmy.armies)[0];
    withArmy = { ...withArmy, armies: { ...withArmy.armies, [armyId]: { ...withArmy.armies[armyId], movementLeft: 0 } } };

    const next = endTurn(withArmy);
    assert.equal(next.armies[armyId].movementLeft, 4);
  });
});
