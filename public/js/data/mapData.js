// Dane mapy Misji 1: uproszczona, inspirowana geografią Małopolski (nie ścisła rekonstrukcja).
// Układ offsetowy (col 0-11, row 0-6 = północ->południe), konwertowany na axial przez hexgrid.js.

export const COLS = 12;
export const ROWS = 7;

export const TERRAIN = {
  PLAINS: 'plains',
  FOREST: 'forest',
  HILLS: 'hills',
  RIVER: 'river',
  IMPASSABLE: 'impassable',
};

// Ruch: koszt wejścia na heks danego terenu (Infinity = niemożliwe).
export const MOVE_COST = {
  [TERRAIN.PLAINS]: 1,
  [TERRAIN.FOREST]: 2,
  [TERRAIN.HILLS]: 3,
  [TERRAIN.RIVER]: 3,
  [TERRAIN.IMPASSABLE]: Infinity,
};

// Obrona: mnożnik siły obrony jednostki stojącej na tym terenie.
export const DEFENSE_MULT = {
  [TERRAIN.PLAINS]: 1,
  [TERRAIN.FOREST]: 1.3,
  [TERRAIN.HILLS]: 1.5,
  [TERRAIN.RIVER]: 1.2,
  [TERRAIN.IMPASSABLE]: 1,
};

function coordKey(col, row) {
  return `${col},${row}`;
}

// Umowna Wisła: pas heksów wijący się z północy na południe przez centrum mapy.
const RIVER_OFFSETS = [
  [6, 0], [6, 1], [5, 1], [5, 2], [6, 2], [6, 3], [5, 3], [5, 4], [6, 4], [7, 5], [7, 6],
];

// Umowne Beskidy/Tatry: pas wzgórz wzdłuż południowej krawędzi mapy.
const HILLS_OFFSETS = [
  [2, 5], [3, 5], [4, 5], [8, 5], [9, 5],
  [2, 6], [3, 6], [8, 6], [9, 6], [10, 6],
];

// Najwyższe partie gór: nieprzejezdne.
const IMPASSABLE_OFFSETS = [
  [4, 6], [5, 6], [6, 6],
];

export const CITIES = [
  { id: 'krakow', name: 'Kraków', col: 5, row: 2, owner: 'player', capital: true },
  { id: 'sandomierz', name: 'Sandomierz', col: 10, row: 1, owner: 'player', capital: false },
  { id: 'wislica', name: 'Wiślica', col: 4, row: 4, owner: 'neutral', capital: false },
  { id: 'nowy-sacz', name: 'Nowy Sącz', col: 6, row: 5, owner: 'neutral', capital: false },
  { id: 'biecz', name: 'Biecz', col: 8, row: 4, owner: 'neutral', capital: false },
  { id: 'oswiecim', name: 'Oświęcim', col: 1, row: 3, owner: 'neutral', capital: false },
  { id: 'zawichost', name: 'Zawichost', col: 11, row: 2, owner: 'neutral', capital: false },
];

// Wschodnia krawędź mapy, skąd wkraczają najazdy tatarskie (patrz engine/ai.js).
// Celowo pominięte pola bezpośrednio przy Sandomierzu (np. [11,0]/[11,1]/[11,2],
// odległość 1 heksa) - w czasie rzeczywistym armia stamtąd docierałaby do miasta
// w kilka sekund od spawnu, nie dając graczowi żadnej szansy na reakcję. Kolejne
// wpisy rosną odległością od miast gracza (2/3/4 heksów od Sandomierza), więc
// każda kolejna, silniejsza fala daje proporcjonalnie więcej czasu na przygotowanie.
export const TATAR_SPAWN_OFFSETS = [
  [11, 3], [11, 4], [11, 5], [10, 5],
];

function terrainAt(col, row, cityCoordSet) {
  const k = coordKey(col, row);
  if (cityCoordSet.has(k)) return TERRAIN.PLAINS;
  if (IMPASSABLE_OFFSETS.some(([c, r]) => c === col && r === row)) return TERRAIN.IMPASSABLE;
  if (HILLS_OFFSETS.some(([c, r]) => c === col && r === row)) return TERRAIN.HILLS;
  if (RIVER_OFFSETS.some(([c, r]) => c === col && r === row)) return TERRAIN.RIVER;
  // Deterministyczny, "naturalnie wyglądający" rozrzut lasów (bez losowości przy starcie gry).
  if ((col * 3 + row * 7) % 5 === 0) return TERRAIN.FOREST;
  return TERRAIN.PLAINS;
}

export function buildTerrainGrid() {
  const cityCoordSet = new Set(CITIES.map((c) => coordKey(c.col, c.row)));
  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      grid.push({ col, row, terrain: terrainAt(col, row, cityCoordSet) });
    }
  }
  return grid;
}
