// Orkiestracja fazy końca tury: ekonomia miast gracza -> reset ruchu armii ->
// akcja AI tatarskiej (spawn/marsz/szturm/wycofanie fal) -> +1 tura -> sprawdzenie
// warunków zwycięstwa/porażki.
import { processCityEconomy } from './cities.js';
import { resetArmiesMovement } from './units.js';
import { processTatarAI } from './ai.js';
import { checkVictoryConditions } from './victory.js';

export function endTurn(state) {
  if (state.status !== 'playing') return state;

  let next = processCityEconomy(state);
  next = resetArmiesMovement(next);
  next = processTatarAI(next, next.map.hexes);
  next = { ...next, turn: next.turn + 1 };
  return checkVictoryConditions(next);
}
