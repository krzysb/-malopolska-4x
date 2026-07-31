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
    description: 'Odblokowuje szybszą i tańszą rekrutację jednostek.',
    recruitDiscountPerLevel: 0.15,
  },
  market: {
    id: 'market', name: 'Rynek', maxLevel: 2, cost: [30, 55],
    description: 'Zwiększa dochód złota o 4 za poziom na turę.',
    goldPerTurnPerLevel: 4,
  },
  granary: {
    id: 'granary', name: 'Spichlerz', maxLevel: 2, cost: [30, 55],
    description: 'Przyspiesza rozwój miasta (wzrost poziomu).',
    growthPerTurnPerLevel: 4,
  },
  church: {
    id: 'church', name: 'Kościół', maxLevel: 1, cost: [45],
    description: 'Zwiększa morale (siłę obrony) rekrutowanych jednostek.',
    moraleBonus: 0.1,
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS);

// Punkty rozwoju potrzebne do osiągnięcia danego poziomu miasta (indeks = poziom-1).
export const CITY_GROWTH_THRESHOLDS = [0, 50, 150];
export const BASE_GOLD_PER_TURN = 8;
export const BASE_GROWTH_PER_TURN = 5;
