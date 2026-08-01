// Konfiguracja Misji 1: harmonogram fal najazdów tatarskich (umowne daty
// historyczne - 1241, 1259, 1287 - nie ścisła rekonstrukcja liczebności).
// Gra działa w czasie rzeczywistym - wszystkie wielkości czasowe są w
// sekundach gry.

// Ile sekund gry odpowiada dawnej "turze" - wspólna jednostka tempa, z której
// przeliczane są prędkości jednostek (units.js) i dochód miast (cities.js).
export const TIME_SCALE_SEC_PER_TURN = 8;

export const TATAR_WAVES = [
  { id: 1, year: 1241, spawnTimeSec: 24, units: [{ type: 'tatar-raiders', count: 6 }, { type: 'tatar-horsearchers', count: 3 }] },
  { id: 2, year: 1259, spawnTimeSec: 120, units: [{ type: 'tatar-raiders', count: 8 }, { type: 'tatar-horsearchers', count: 5 }] },
  { id: 3, year: 1287, spawnTimeSec: 216, units: [{ type: 'tatar-elite', count: 3 }, { type: 'tatar-horsearchers', count: 5 }, { type: 'tatar-raiders', count: 5 }] },
];

// Odstępy między falami są celowo większe niż czas do wycofania niepokonanej
// fali, więc na mapie zawsze operuje najwyżej jedna fala naraz - upraszcza to
// śledzenie wycofania w ai.js (nie trzeba rozróżniać, do której fali należy
// dana, ewentualnie połączona, armia tatarska).
export const WAVE_WITHDRAW_AFTER_SEC = 64;

export const VICTORY_CITY_THRESHOLD = 4; // z 7 miast, wymagane po 3. fali
export const MAX_TIME_SEC = 320; // limit czasu misji (~5,5 min)
