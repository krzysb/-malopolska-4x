// Orkiestracja fazy końca tury: ekonomia miast gracza -> reset ruchu armii ->
// akcja AI tatarskiej (spawn/marsz/szturm/wycofanie fal) -> +1 tura.
import { processCityEconomy } from './cities.js';
import { resetArmiesMovement } from './units.js';
import { processTatarAI } from './ai.js';

export function endTurn(state) {
  let next = processCityEconomy(state);
  next = resetArmiesMovement(next);
  next = processTatarAI(next, next.map.hexes);
  return { ...next, turn: next.turn + 1 };
}
