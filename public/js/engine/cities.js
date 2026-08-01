// Ekonomia i rozbudowa miast: budynki, dochód złota, wzrost poziomu miasta.
// Gra działa w czasie rzeczywistym - dochód/wzrost nalicza się co tick (dtSeconds),
// nie raz na turę.
import { BUILDINGS, CITY_GROWTH_THRESHOLDS, BASE_GOLD_PER_TURN, BASE_GROWTH_PER_TURN } from '../data/buildings.js';
import { TIME_SCALE_SEC_PER_TURN } from '../data/missionConfig.js';

export function buildingLevel(city, buildingId) {
  return city.buildings[buildingId] || 0;
}

// Koszt zbudowania KOLEJNEGO poziomu, albo null jeśli budynek jest już na max. poziomie.
export function nextBuildingCost(city, buildingId) {
  const def = BUILDINGS[buildingId];
  const level = buildingLevel(city, buildingId);
  if (level >= def.maxLevel) return null;
  return def.cost[level];
}

export function canBuild(city, buildingId, gold) {
  const cost = nextBuildingCost(city, buildingId);
  return cost !== null && gold >= cost;
}

// Zwraca nowy stan gry z podniesionym poziomem budynku i odjętym złotem.
// Nie waliduje właściciela miasta (to decyzja UI/wywołującego) - waliduje tylko
// dostępność budynku i złota, żeby funkcja pozostała czystym, przewidywalnym API.
export function buildBuilding(state, cityId, buildingId) {
  const city = state.cities[cityId];
  const cost = nextBuildingCost(city, buildingId);
  if (cost === null || state.player.gold < cost) return state;

  const nextCity = {
    ...city,
    buildings: { ...city.buildings, [buildingId]: buildingLevel(city, buildingId) + 1 },
  };

  return {
    ...state,
    player: { ...state.player, gold: state.player.gold - cost },
    cities: { ...state.cities, [cityId]: nextCity },
  };
}

export function cityGoldIncomePerSec(city) {
  const marketLevel = buildingLevel(city, 'market');
  const perTurn = BASE_GOLD_PER_TURN + marketLevel * BUILDINGS.market.goldPerTurnPerLevel;
  return perTurn / TIME_SCALE_SEC_PER_TURN;
}

export function cityGrowthPerSec(city) {
  const granaryLevel = buildingLevel(city, 'granary');
  const perTurn = BASE_GROWTH_PER_TURN + granaryLevel * BUILDINGS.granary.growthPerTurnPerLevel;
  return perTurn / TIME_SCALE_SEC_PER_TURN;
}

export function maxCityLevel() {
  return CITY_GROWTH_THRESHOLDS.length;
}

// Nalicza wzrost jednego miasta o dtSeconds: dodaje punkty rozwoju i podnosi
// poziom miasta, jeśli przekroczono próg. Zwraca nowy obiekt miasta.
export function tickCityGrowth(city, dtSeconds) {
  const maxLevel = maxCityLevel();
  if (city.level >= maxLevel) return city;

  const growth = city.growth + cityGrowthPerSec(city) * dtSeconds;
  let level = city.level;
  while (level < maxLevel && growth >= CITY_GROWTH_THRESHOLDS[level]) {
    level++;
  }
  return { ...city, growth, level };
}

// Nalicza ekonomię (dochód złota + wzrost) o dtSeconds dla wszystkich miast
// należących do gracza. Wywoływane co tick symulacji, nie raz na turę.
export function tickCityEconomy(state, dtSeconds) {
  let gold = state.player.gold;
  const cities = { ...state.cities };

  for (const [id, city] of Object.entries(state.cities)) {
    if (city.owner !== 'player') continue;
    gold += cityGoldIncomePerSec(city) * dtSeconds;
    cities[id] = tickCityGrowth(city, dtSeconds);
  }

  return { ...state, player: { ...state.player, gold }, cities };
}
