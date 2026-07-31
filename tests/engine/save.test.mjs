import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../public/js/engine/state.js';
import { saveGame, loadGame, hasSave, clearSave, SAVE_KEY, SAVE_VERSION } from '../../public/js/engine/save.js';

// Prosta implementacja localStorage w pamięci - moduł save.js przyjmuje storage
// jako parametr, więc testy nie zależą od globalnego środowiska (przeglądarki/DOM).
function createFakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe('save', () => {
  test('loadGame zwraca null, gdy nie ma zapisu', () => {
    const storage = createFakeStorage();
    assert.equal(loadGame(storage), null);
    assert.equal(hasSave(storage), false);
  });

  test('saveGame + loadGame odtwarza dokładnie ten sam stan gry', () => {
    const storage = createFakeStorage();
    const state = createInitialState();
    saveGame(state, storage);

    assert.equal(hasSave(storage), true);
    const loaded = loadGame(storage);
    assert.deepEqual(loaded, state);
  });

  test('zapis zawiera wersję i znacznik czasu pod kluczem SAVE_KEY', () => {
    const storage = createFakeStorage();
    saveGame(createInitialState(), storage);
    const raw = JSON.parse(storage.getItem(SAVE_KEY));
    assert.equal(raw.version, SAVE_VERSION);
    assert.ok(Number.isInteger(raw.savedAt));
    assert.ok(raw.state);
  });

  test('loadGame zwraca null dla zapisu z niezgodną wersją (brak migracji w MVP)', () => {
    const storage = createFakeStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 1, savedAt: Date.now(), state: createInitialState() }));
    assert.equal(loadGame(storage), null);
  });

  test('loadGame zwraca null dla uszkodzonego (niepoprawny JSON) zapisu', () => {
    const storage = createFakeStorage();
    storage.setItem(SAVE_KEY, '{niepoprawny json');
    assert.equal(loadGame(storage), null);
  });

  test('clearSave usuwa zapis', () => {
    const storage = createFakeStorage();
    saveGame(createInitialState(), storage);
    clearSave(storage);
    assert.equal(hasSave(storage), false);
    assert.equal(loadGame(storage), null);
  });
});
