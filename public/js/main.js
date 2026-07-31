// Bootstrap i kontroler UI gry: wczytuje zapis (jeśli istnieje) albo tworzy nową
// rozgrywkę, buduje mapę, obsługuje kliknięcia (wybór miasta/armii, rozkazy ruchu
// i ataku), przycisk końca tury oraz autosave. Silnik pozostaje czysty - ten
// moduł jest jedynym miejscem trzymającym "bieżący" stan gry i wywołującym efekty
// uboczne (DOM, localStorage).
import { createInitialState } from './engine/state.js';
import { loadGame, saveGame, clearSave } from './engine/save.js';
import { recruitUnit, moveArmyAlongPath, armyIdAt } from './engine/units.js';
import { buildBuilding } from './engine/cities.js';
import { findPath } from './engine/pathfinding.js';
import { resolveBattle } from './engine/combat.js';
import { endTurn } from './engine/turn.js';
import { key as hexKey } from './engine/hexgrid.js';
import { createHexRenderer } from './render/hexRenderer.js';
import { createHud } from './render/hud.js';
import { createCityPanel } from './render/cityPanel.js';
import { createArmyPanel } from './render/armyPanel.js';
import { createEventLog } from './render/eventLog.js';
import { createEndScreen } from './render/endScreen.js';

const svg = document.getElementById('hex-map');
const sidePanel = document.getElementById('side-panel');
const endTurnBtn = document.getElementById('end-turn-btn');
const newGameBtn = document.getElementById('new-game-btn');

const hud = createHud({
  turnEl: document.getElementById('hud-turn'),
  goldEl: document.getElementById('hud-gold'),
  statusEl: document.getElementById('hud-status'),
});
const cityPanel = createCityPanel(sidePanel, { onBuild, onRecruit, onClose: closePanels });
const armyPanel = createArmyPanel(sidePanel, { onCancel: closePanels });
const eventLog = createEventLog(document.getElementById('event-log-list'));
const endScreen = createEndScreen(document.getElementById('end-screen'), { onNewGame: startNewGame });

let state = loadGame() ?? createInitialState();
let selectedArmyId = null;
let selectedCityId = null;

const renderer = createHexRenderer(svg, { onHexClick: handleHexClick });
renderer.buildBoard(state);
render();

function render() {
  renderer.render(state);
  hud.render(state);
  eventLog.render(state);
  endScreen.render(state);
  endTurnBtn.disabled = state.status !== 'playing';

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

function handleHexClick(q, r) {
  if (state.status !== 'playing') return;

  if (selectedArmyId) {
    state = orderArmyTo(state, selectedArmyId, { q, r });
    selectedArmyId = null;
    selectedCityId = null;
    render();
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

// Przesuwa armię po ścieżce z pathfinding.js; jeśli w tej turze dotrze dokładnie
// na docelowy heks zajęty przez wrogie miasto lub wrogą armię, natychmiast
// rozstrzyga walkę. Odpowiednik ai.js:moveAndMaybeAssault dla rozkazów gracza.
function orderArmyTo(currentState, armyId, target) {
  const army = currentState.armies[armyId];
  if (!army) return currentState;

  const mapHexes = currentState.map.hexes;
  const path = findPath(mapHexes, { q: army.q, r: army.r }, target);
  if (!path || path.length === 0) return currentState;

  const moved = moveArmyAlongPath(currentState, armyId, path, mapHexes);
  const arrivedId = armyIdAt(army.owner, target.q, target.r);
  const arrived = moved.armies[arrivedId];
  if (!arrived || arrived.q !== target.q || arrived.r !== target.r) return moved; // nie dotarła w tej turze

  const targetCity = Object.values(moved.cities).find((c) => c.q === target.q && c.r === target.r);
  if (targetCity && targetCity.owner !== army.owner) {
    return resolveBattle(moved, arrivedId, { type: 'city', id: targetCity.id }, mapHexes);
  }

  const enemyArmy = Object.values(moved.armies).find(
    (a) => a.id !== arrivedId && a.q === target.q && a.r === target.r && a.owner !== army.owner,
  );
  if (enemyArmy) {
    return resolveBattle(moved, arrivedId, { type: 'army', id: enemyArmy.id }, mapHexes);
  }

  return moved;
}

function onBuild(buildingId) {
  if (!selectedCityId) return;
  state = buildBuilding(state, selectedCityId, buildingId);
  render();
}

function onRecruit(unitTypeId, destination) {
  if (!selectedCityId) return;
  state = recruitUnit(state, selectedCityId, unitTypeId, destination);
  render();
}

function startNewGame() {
  clearSave();
  state = createInitialState();
  closePanels();
  renderer.buildBoard(state);
  render();
}

endTurnBtn.addEventListener('click', () => {
  if (state.status !== 'playing') return;
  state = endTurn(state);
  closePanels();
  saveGame(state);
  render();
});

newGameBtn.addEventListener('click', () => {
  if (state.status === 'playing' && !window.confirm('Porzucić bieżącą rozgrywkę i zacząć nową grę?')) return;
  startNewGame();
});
