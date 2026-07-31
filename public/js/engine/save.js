// Zapis/odczyt stanu gry. Storage jest wstrzykiwany (domyślnie
// globalThis.localStorage), dzięki czemu moduł da się przetestować bez
// przeglądarki/DOM. Wersjonowane, bez logiki migracji (MVP: niezgodna wersja
// zapisu = traktujemy jak brak zapisu, zaczynamy nową grę).
export const SAVE_KEY = 'malopolska4x:mission1:save';
export const SAVE_VERSION = 1;

export function saveGame(state, storage = globalThis.localStorage) {
  const payload = JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state });
  storage.setItem(SAVE_KEY, payload);
}

// Zwraca zapisany stan gry albo null, gdy brak zapisu, zapis uszkodzony
// (niepoprawny JSON) lub pochodzi z niezgodnej wersji.
export function loadGame(storage = globalThis.localStorage) {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || parsed.version !== SAVE_VERSION || !parsed.state) return null;
  return parsed.state;
}

export function hasSave(storage = globalThis.localStorage) {
  return storage.getItem(SAVE_KEY) !== null;
}

export function clearSave(storage = globalThis.localStorage) {
  storage.removeItem(SAVE_KEY);
}
