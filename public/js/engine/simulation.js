// Orkiestracja jednego ticku symulacji czasu rzeczywistego (zastępuje dawne
// turn.js): ekonomia miast -> ruch armii -> rozstrzygnięcie starć wynikłych
// z ruchu -> AI tatarskie (spawn/zlecanie marszu/wycofanie fal) -> upływ
// czasu -> sprawdzenie zwycięstwa/porażki. Wywoływane wielokrotnie na sekundę
// z main.js (pętla animacji), nie raz na "koniec tury".
import { tickCityEconomy } from './cities.js';
import { tickArmiesMovement } from './units.js';
import { resolvePendingBattles } from './combat.js';
import { tickTatarAI } from './ai.js';
import { checkVictoryConditions } from './victory.js';

export function tick(state, dtSeconds) {
  if (state.status !== 'playing') return state;

  let next = tickCityEconomy(state, dtSeconds);
  next = tickArmiesMovement(next, dtSeconds, next.map.hexes);
  next = resolvePendingBattles(next, next.map.hexes);
  next = tickTatarAI(next, next.map.hexes);
  next = { ...next, time: next.time + dtSeconds };
  return checkVictoryConditions(next);
}
