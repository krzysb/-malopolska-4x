// Budowa początkowego stanu gry dla Misji 1, łącząc matematykę siatki (hexgrid.js)
// z danymi mapy (data/mapData.js). Silnik nie ma tu nic zaszytego poza tym importem -
// przyszła misja podmieniłaby tylko import danych, nie strukturę tego modułu.
import { generateRectangle, key } from './hexgrid.js';
import { COLS, ROWS, CITIES, buildTerrainGrid } from '../data/mapData.js';

const STARTING_GOLD = 100;

function defaultGarrisonFor(city) {
  if (city.capital) return [{ type: 'infantry', count: 3 }, { type: 'archers', count: 2 }];
  if (city.owner === 'player') return [{ type: 'infantry', count: 2 }];
  return [{ type: 'infantry', count: 2 }];
}

export function createInitialState({ seed = 1, cities = CITIES } = {}) {
  const offsetHexes = generateRectangle(COLS, ROWS);
  const terrainByCoord = new Map(buildTerrainGrid().map((t) => [`${t.col},${t.row}`, t.terrain]));

  const hexes = {};
  for (const h of offsetHexes) {
    const terrain = terrainByCoord.get(`${h.col},${h.row}`);
    hexes[key(h.q, h.r)] = { terrain, cityId: null, col: h.col, row: h.row };
  }

  const citiesState = {};
  for (const c of cities) {
    // Miasta zdefiniowane są przez offset (col,row) w danych mapy; potrzebujemy
    // odpowiadającego heksu axial, żeby powiązać miasto z konkretnym polem siatki.
    const hex = offsetHexes.find((h) => h.col === c.col && h.row === c.row);
    hexes[key(hex.q, hex.r)].cityId = c.id;

    citiesState[c.id] = {
      id: c.id,
      name: c.name,
      q: hex.q,
      r: hex.r,
      owner: c.owner,
      capital: Boolean(c.capital),
      level: 1,
      growth: 0,
      buildings: { walls: 0, barracks: 0, market: 0, granary: 0, church: 0 },
      garrison: defaultGarrisonFor(c),
    };
  }

  return {
    turn: 1,
    status: 'playing',
    map: { cols: COLS, rows: ROWS, hexes },
    cities: citiesState,
    armies: {},
    player: { gold: STARTING_GOLD },
    waves: [],
    log: [],
    rngSeed: seed,
  };
}
