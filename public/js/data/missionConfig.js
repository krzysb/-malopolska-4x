// Konfiguracja Misji 1: harmonogram fal najazdów tatarskich (umowne daty
// historyczne - 1241, 1259, 1287 - nie ścisła rekonstrukcja liczebności).

export const TATAR_WAVES = [
  { id: 1, year: 1241, spawnTurn: 3, units: [{ type: 'tatar-raiders', count: 6 }, { type: 'tatar-horsearchers', count: 3 }] },
  { id: 2, year: 1259, spawnTurn: 15, units: [{ type: 'tatar-raiders', count: 8 }, { type: 'tatar-horsearchers', count: 5 }] },
  { id: 3, year: 1287, spawnTurn: 27, units: [{ type: 'tatar-elite', count: 4 }, { type: 'tatar-horsearchers', count: 6 }, { type: 'tatar-raiders', count: 6 }] },
];

// Odstępy między falami (12 tur) są celowo większe niż czas do wycofania
// niepokonanej fali, więc na mapie zawsze operuje najwyżej jedna fala naraz -
// upraszcza to śledzenie wycofania w ai.js (nie trzeba rozróżniać, do której
// fali należy dana, ewentualnie połączona, armia tatarska).
export const WAVE_WITHDRAW_AFTER_TURNS = 8;

export const VICTORY_CITY_THRESHOLD = 5; // z 7 miast, wymagane po 3. fali
export const MAX_TURNS = 40;
