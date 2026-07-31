// Ekonomia i rozbudowa miast: budynki, dochód złota, wzrost poziomu miasta.
import { BUILDINGS, CITY_GROWTH_THRESHOLDS, BASE_GOLD_PER_TURN, BASE_GROWTH_PER_TURN } from '../data/buildings.js';

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

export function cityGoldIncome(city) {
  const marketLevel = buildingLevel(city, 'market');
  return BASE_GOLD_PER_TURN + marketLevel * BUILDINGS.market.goldPerTurnPerLevel;
}

export function cityGrowthPerTurn(city) {
  const granaryLevel = buildingLevel(city, 'granary');
  return BASE_GROWTH_PER_TURN + granaryLevel * BUILDINGS.granary.growthPerTurnPerLevel;
}

export function maxCityLevel() {
  return CITY_GROWTH_THRESHOLDS.length;
}

// Nalicza wzrost jednego miasta o jedną turę: dodaje punkty rozwoju i podnosi
// poziom miasta, jeśli przekroczono próg. Zwraca nowy obiekt miasta.
export function applyCityGrowth(city) {
  const maxLevel = maxCityLevel();
  if (city.level >= maxLevel) return city;

  const growth = city.growth + cityGrowthPerTurn(city);
  let level = city.level;
  while (level < maxLevel && growth >= CITY_GROWTH_THRESHOLDS[level]) {
    level++;
  }
  return { ...city, growth, level };
}

// Nalicza ekonomię tury (dochód złota + wzrost) dla wszystkich miast należących do gracza.
export function processCityEconomy(state) {
  let gold = state.player.gold;
  const cities = { ...state.cities };

  for (const [id, city] of Object.entries(state.cities)) {
    if (city.owner !== 'player') continue;
    gold += cityGoldIncome(city);
    cities[id] = applyCityGrowth(city);
  }

  return { ...state, player: { ...state.player, gold }, cities };
}
