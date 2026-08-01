// Warunki zwycięstwa i porażki Misji 1, sprawdzane co tick symulacji.
import { VICTORY_CITY_THRESHOLD, MAX_TIME_SEC } from '../data/missionConfig.js';

// Fala 3. jest "zakończona", gdy się już pojawiła i żadna armia tatarska nie
// pozostaje aktywnie na mapie (pokonana w walce albo wycofana przez ai.js).
function wave3Concluded(state) {
  const wave3 = state.waves.find((w) => w.id === 3);
  if (!wave3) return false;
  return !Object.values(state.armies).some((a) => a.owner === 'tatar');
}

export function checkVictoryConditions(state) {
  if (state.status !== 'playing') return state;

  if (state.cities.krakow.owner !== 'player') {
    return { ...state, status: 'defeat' };
  }

  const playerCityCount = Object.values(state.cities).filter((c) => c.owner === 'player').length;
  if (playerCityCount === 0) {
    return { ...state, status: 'defeat' };
  }

  if (wave3Concluded(state) && playerCityCount >= VICTORY_CITY_THRESHOLD) {
    return { ...state, status: 'victory' };
  }

  if (state.time >= MAX_TIME_SEC) {
    return { ...state, status: 'defeat' };
  }

  return state;
}
