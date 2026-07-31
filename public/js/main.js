// Bootstrap gry: wczytuje zapis (jeśli istnieje) albo tworzy nową rozgrywkę,
// buduje mapę i renderuje stan początkowy. Interakcja (koniec tury, rekrutacja,
// ruch, panel miasta/armii) dołącza w kolejnym kroku (render/hud.js i in.).
import { createInitialState } from './engine/state.js';
import { loadGame } from './engine/save.js';
import { createHexRenderer } from './render/hexRenderer.js';

const hudTurn = document.getElementById('hud-turn');
const hudGold = document.getElementById('hud-gold');
const hudStatus = document.getElementById('hud-status');
const svg = document.getElementById('hex-map');

function renderHud(state) {
  hudTurn.textContent = `Tura ${state.turn}`;
  hudGold.textContent = `Złoto ${state.player.gold}`;
  hudStatus.textContent = state.status === 'playing' ? '' : state.status === 'victory' ? 'Zwycięstwo!' : 'Porażka';
}

let state = loadGame() ?? createInitialState();

const renderer = createHexRenderer(svg);
renderer.buildBoard(state);
renderer.render(state);
renderHud(state);
