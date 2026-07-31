// Definicje typów jednostek. Zamknięta lista na MVP Misji 1: 3 typy gracza, 3 typy tatarskie.
// terrainAttackMod/terrainDefenseMod to opcjonalne mnożniki nadające jednostkom charakter
// (np. kawaleria słabsza w lesie, łucznicy silniejsi w lesie) - domyślnie 1 (brak modyfikatora).

export const UNIT_TYPES = {
  infantry: {
    id: 'infantry', name: 'Piechota', side: 'player', cost: 20,
    attack: 4, defense: 5, movement: 2,
  },
  archers: {
    id: 'archers', name: 'Łucznicy', side: 'player', cost: 25,
    attack: 5, defense: 3, movement: 2,
    terrainAttackMod: { forest: 1.25 },
  },
  cavalry: {
    id: 'cavalry', name: 'Rycerstwo', side: 'player', cost: 40,
    attack: 7, defense: 4, movement: 4,
    terrainAttackMod: { forest: 0.6, hills: 0.7 },
    terrainDefenseMod: { forest: 0.8, hills: 0.8 },
  },
  'tatar-raiders': {
    id: 'tatar-raiders', name: 'Czambuł tatarski', side: 'tatar',
    attack: 6, defense: 3, movement: 4,
  },
  'tatar-horsearchers': {
    id: 'tatar-horsearchers', name: 'Łucznicy konni', side: 'tatar',
    attack: 5, defense: 4, movement: 4,
    terrainAttackMod: { forest: 1.1 },
  },
  'tatar-elite': {
    id: 'tatar-elite', name: 'Gwardia chana', side: 'tatar',
    attack: 8, defense: 6, movement: 4,
  },
};

export function unitTerrainAttackMod(unitTypeId, terrain) {
  return UNIT_TYPES[unitTypeId]?.terrainAttackMod?.[terrain] ?? 1;
}

export function unitTerrainDefenseMod(unitTypeId, terrain) {
  return UNIT_TYPES[unitTypeId]?.terrainDefenseMod?.[terrain] ?? 1;
}
