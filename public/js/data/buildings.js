// Definicje budynków rozwijanych w miastach gracza. Zamknięta lista na MVP Misji 1.
// cost[i] = koszt w złocie zbudowania poziomu (i+1); efekty rosną liniowo z poziomem.

export const BUILDINGS = {
  walls: {
    id: 'walls', name: 'Mury', maxLevel: 3, cost: [40, 70, 110],
    description: 'Zwiększa obronę garnizonu o 15% za poziom.',
    defenseBonusPerLevel: 0.15,
  },
  barracks: {
    id: 'barracks', name: 'Koszary', maxLevel: 2, cost: [35, 65],
    description: 'Obniża koszt rekrutacji wszystkich jednostek o 15% za poziom.',
    recruitDiscountPerLevel: 0.15,
  },
  market: {
    id: 'market', name: 'Rynek', maxLevel: 2, cost: [30, 55],
    description: 'Zwiększa dochód złota tego miasta o 0,5 na sekundę za poziom.',
    goldPerTurnPerLevel: 4,
  },
  granary: {
    id: 'granary', name: 'Spichlerz', maxLevel: 2, cost: [30, 55],
    description: 'Przyspiesza wzrost poziomu miasta o 0,5 punktu rozwoju na sekundę za poziom.',
    growthPerTurnPerLevel: 4,
  },
  church: {
    id: 'church', name: 'Kościół', maxLevel: 1, cost: [45],
    description: 'Podnosi morale obrońców - siła obrony całego garnizonu miasta w starciu rośnie o 10%.',
    moraleBonus: 0.1,
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS);

// Punkty rozwoju potrzebne do osiągnięcia danego poziomu miasta (indeks = poziom-1).
export const CITY_GROWTH_THRESHOLDS = [0, 50, 150];
export const BASE_GOLD_PER_TURN = 8;
export const BASE_GROWTH_PER_TURN = 5;
