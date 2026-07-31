// Orkiestracja fazy końca tury. Na tym etapie (krok 6) AI jest jeszcze nieobecne -
// fale tatarskie dołączą w ai.js (krok 7), rozszerzając tę funkcję o kolejną fazę.
import { processCityEconomy } from './cities.js';
import { resetArmiesMovement } from './units.js';

export function endTurn(state) {
  let next = processCityEconomy(state);
  next = resetArmiesMovement(next);
  return { ...next, turn: next.turn + 1 };
}
