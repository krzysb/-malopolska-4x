// Bootstrap i kontroler UI gry: wczytuje zapis (jeśli istnieje) albo tworzy nową
// rozgrywkę, buduje mapę, obsługuje kliknięcia (wybór miasta/armii, rozkazy ruchu
// i ataku), pętlę symulacji czasu rzeczywistego oraz autosave. Silnik pozostaje
// czysty - ten moduł jest jedynym miejscem trzymającym "bieżący" stan gry i
// wywołującym efekty uboczne (DOM, localStorage, requestAnimationFrame).
import { createInitialState } from './engine/state.js';
import { loadGame, saveGame, clearSave } from './engine/save.js';
import { recruitUnit, setArmyPath } from './engine/units.js';
import { buildBuilding } from './engine/cities.js';
import { findPath } from './engine/pathfinding.js';
import { tick } from './engine/simulation.js';
import { key as hexKey } from './engine/hexgrid.js';
import { createHexRenderer } from './render/hexRenderer.js';
import { createHud } from './render/hud.js';
import { createCityPanel } from './render/cityPanel.js';
import { createArmyPanel } from './render/armyPanel.js';
import { createEventLog } from './render/eventLog.js';
import { createEndScreen } from './render/endScreen.js';
import { createBriefing } from './render/briefing.js';

const AUTOSAVE_INTERVAL_SEC = 5;
const MAX_DT_SEC = 0.25; // zabezpieczenie przed skokiem czasu po uśpieniu karty
const RENDER_INTERVAL_SEC = 1 / 15; // ograniczenie odświeżania DOM/SVG do ~15fps

const svg = document.getElementById('hex-map');
const sidePanel = document.getElementById('side-panel');
const pauseBtn = document.getElementById('pause-btn');
const speedBtn = document.getElementById('speed-btn');
const newGameBtn = document.getElementById('new-game-btn');
const orderHint = document.getElementById('order-hint');
const orderHintText = document.getElementById('order-hint-text');
const orderCancelBtn = document.getElementById('order-cancel-btn');

const hud = createHud({
  turnEl: document.getElementById('hud-turn'),
  goldEl: document.getElementById('hud-gold'),
  statusEl: document.getElementById('hud-status'),
});
const cityPanel = createCityPanel(sidePanel, { onBuild, onRecruit, onClose: closePanels });
const armyPanel = createArmyPanel(sidePanel, { onCancel: closePanels });
const eventLog = createEventLog(document.getElementById('event-log-list'));
const endScreen = createEndScreen(document.getElementById('end-screen'), { onNewGame: startNewGame });
const briefing = createBriefing(document.getElementById('briefing'), { onStart: () => {} });

let state = loadGame() ?? createInitialState();
let selectedArmyId = null;
let selectedCityId = null;
let paused = false;
let speedMultiplier = 1;

// Panel boczny (miasto/armia) NIE jest przebudowywany przy każdej klatce pętli
// symulacji - robiłby to ~15x/sek i realny, ludzki klik (mousedown->mouseup
// trwa zwykle >50ms) regularnie łapałby moment, w którym przycisk pod
// kursorem właśnie został podmieniony na nowy element (innerHTML=''), więc
// zdarzenie click nigdy by nie dotarło do żywego uchwytu - klik "nic nie robi"
// bez żadnego błędu w konsoli. Panel odświeża się tylko przy zmianie wyboru
// (natychmiast) i rzadko okresowo (PANEL_REFRESH_INTERVAL_SEC), żeby pokazać
// narastające złoto/odblokowane budynki bez ryzykowania przerwania kliknięcia.
const PANEL_REFRESH_INTERVAL_SEC = 1;
let lastPanelSelectionKey = undefined;
let timeSincePanelRefresh = 0;

const renderer = createHexRenderer(svg, { onHexClick: handleHexClick });
renderer.buildBoard(state);
render();
// Odprawa pokazuje się tylko przy zupełnie świeżej rozgrywce (czas 0, zero
// wpisów w kronice - żaden najazd jeszcze nie wystartował).
if (state.time === 0 && state.log.length === 0) {
  briefing.render();
} else {
  briefing.hide();
}

function currentSelectionKey() {
  if (selectedArmyId) return `army:${selectedArmyId}`;
  if (selectedCityId) return `city:${selectedCityId}`;
  return null;
}

function renderPanel({ force = false } = {}) {
  const selectionKey = currentSelectionKey();
  const selectionChanged = selectionKey !== lastPanelSelectionKey;
  if (!force && !selectionChanged && timeSincePanelRefresh < PANEL_REFRESH_INTERVAL_SEC) return;

  lastPanelSelectionKey = selectionKey;
  timeSincePanelRefresh = 0;

  if (selectedArmyId && state.armies[selectedArmyId]) {
    const army = state.armies[selectedArmyId];
    armyPanel.render(army);
    renderer.setHighlight([hexKey(army.q, army.r)]);
  } else if (selectedCityId && state.cities[selectedCityId]) {
    const city = state.cities[selectedCityId];
    cityPanel.render(city, state.player.gold);
    renderer.setHighlight([hexKey(city.q, city.r)]);
  } else {
    closePanels();
  }
}

// Baner nad mapą pokazujący, że armia jest zaznaczona i kolejny klik na mapie
// wyda jej rozkaz - widoczny niezależnie od panelu bocznego (na mobile jest
// on osobnym bottom-sheetem, łatwym do przeoczenia), z zawsze dostępnym
// przyciskiem anulowania.
function renderOrderHint() {
  const army = selectedArmyId ? state.armies[selectedArmyId] : null;
  renderer.setOrderMode(Boolean(army) && army.owner === 'player');
  if (!army || army.owner !== 'player') {
    orderHint.hidden = true;
    return;
  }
  orderHint.hidden = false;
  orderHintText.textContent = 'Armia zaznaczona - kliknij heks docelowy, aby ruszyć/zaatakować.';
}

function render() {
  renderer.render(state);
  hud.render(state);
  eventLog.render(state);
  endScreen.render(state);
  pauseBtn.disabled = state.status !== 'playing';
  speedBtn.disabled = state.status !== 'playing';
  renderPanel();
  renderOrderHint();
}

function closePanels() {
  selectedArmyId = null;
  selectedCityId = null;
  cityPanel.hide();
  armyPanel.hide();
  renderer.setHighlight([]);
}

function cityAt(q, r) {
  return Object.values(state.cities).find((c) => c.q === q && c.r === r) ?? null;
}

function armyAt(q, r, owner) {
  return Object.values(state.armies).find((a) => a.q === q && a.r === r && (!owner || a.owner === owner)) ?? null;
}

// Kliknięcie mapy tylko ZLECA rozkaz (ruch/atak) - faktyczne przemieszczenie i
// ewentualna walka rozstrzygają się w kolejnych tickach pętli symulacji, nie
// natychmiast. Wybrana armia pozostaje zaznaczona, żeby dało się wydać kolejny
// rozkaz bez ponownego klikania w nią.
function handleHexClick(q, r) {
  if (state.status !== 'playing') return;

  if (selectedArmyId) {
    const army = state.armies[selectedArmyId];
    if (!army) {
      closePanels();
      render();
      return;
    }
    // Klik na heks, na którym armia już stoi = anuluj wybór (nie próbuj
    // wydawać rozkazu "ruszu na miejscu" - to było ciche no-op bez feedbacku).
    if (army.q === q && army.r === r) {
      closePanels();
      render();
      return;
    }
    const path = findPath(state.map.hexes, { q: army.q, r: army.r }, { q, r });
    if (path && path.length > 0) {
      state = setArmyPath(state, selectedArmyId, path);
      render();
      renderPanel({ force: true }); // rozkaz to świadome działanie gracza - odśwież panel natychmiast
    } else {
      // Cel nieosiągalny (np. przez nieprzejezdny teren) - armia zostaje
      // zaznaczona, żeby dało się od razu spróbować innego heksu, ale gracz
      // dostaje widoczny sygnał, że TEN klik nic nie zrobił.
      renderer.flashInvalidHex(q, r);
    }
    return;
  }

  const playerArmy = armyAt(q, r, 'player');
  if (playerArmy) {
    selectedArmyId = playerArmy.id;
    selectedCityId = null;
    render();
    return;
  }

  const city = cityAt(q, r);
  if (city) {
    selectedCityId = city.id;
    selectedArmyId = null;
    render();
    return;
  }

  closePanels();
  render();
}

function onBuild(buildingId) {
  if (!selectedCityId) return;
  state = buildBuilding(state, selectedCityId, buildingId);
  render();
  renderPanel({ force: true }); // pokaż nowy poziom budynku/złoto natychmiast, nie za sekundę
}

function onRecruit(unitTypeId, destination) {
  if (!selectedCityId) return;
  state = recruitUnit(state, selectedCityId, unitTypeId, destination);
  render();
  renderPanel({ force: true });
}

function startNewGame() {
  clearSave();
  state = createInitialState();
  closePanels();
  renderer.buildBoard(state);
  render();
  briefing.render();
}

newGameBtn.addEventListener('click', () => {
  if (state.status === 'playing' && !window.confirm('Porzucić bieżącą rozgrywkę i zacząć nową grę?')) return;
  startNewGame();
});

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Wznów' : 'Pauza';
});

speedBtn.addEventListener('click', () => {
  speedMultiplier = speedMultiplier === 1 ? 2 : 1;
  speedBtn.textContent = `${speedMultiplier}×`;
});

orderCancelBtn.addEventListener('click', () => {
  closePanels();
  render();
});

// Pętla symulacji czasu rzeczywistego: dt liczony z realnego upływu czasu
// między klatkami (requestAnimationFrame), przeskalowany przez speedMultiplier
// i ograniczony (MAX_DT_SEC), żeby powrót do uśpionej karty nie "nadrobił"
// naraz wielu minut symulacji jednym gigantycznym tickiem.
let lastTimestamp = null;
let timeSinceAutosave = 0;
let timeSinceRender = 0;

function loop(timestamp) {
  if (lastTimestamp !== null && !paused && state.status === 'playing') {
    const rawDt = (timestamp - lastTimestamp) / 1000;
    const dt = Math.min(rawDt, MAX_DT_SEC) * speedMultiplier;
    if (dt > 0) {
      state = tick(state, dt);
      timeSincePanelRefresh += dt;

      timeSinceAutosave += dt;
      if (timeSinceAutosave >= AUTOSAVE_INTERVAL_SEC) {
        saveGame(state);
        timeSinceAutosave = 0;
      }
      // Ta klatka to JEDYNA okazja na render tuż po zakończeniu gry - warunek
      // pętli (state.status === 'playing') sprawdzany jest na WEJŚCIU, więc na
      // kolejnej klatce, gdy status jest już 'victory'/'defeat', całe ciało
      // pętli (w tym render()) w ogóle się nie wykona. Bez wymuszenia render()
      // tutaj ekran końcowy potrafił nigdy się nie pokazać - throttle
      // (RENDER_INTERVAL_SEC, ~15fps) rzadko trafiał dokładnie w tę klatkę,
      // więc gra "zawieszała się" (przestawała reagować, bez żadnego komunikatu).
      const justEnded = state.status !== 'playing';
      if (justEnded) saveGame(state); // zachowaj końcowy wynik natychmiast

      timeSinceRender += dt;
      if (timeSinceRender >= RENDER_INTERVAL_SEC || justEnded) {
        render();
        timeSinceRender = 0;
      }
    }
  }
  lastTimestamp = timestamp;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
