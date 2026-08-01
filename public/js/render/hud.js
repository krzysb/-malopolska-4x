// HUD: czas misji, złoto, status gry. Prosty moduł renderujący istniejące
// elementy DOM (bez tworzenia ich - te są w index.html) w oparciu o stan gry.
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createHud({ turnEl, goldEl, statusEl }) {
  function render(state) {
    turnEl.textContent = `Czas ${formatTime(state.time)}`;
    goldEl.textContent = `Złoto ${Math.floor(state.player.gold)}`;
    statusEl.textContent =
      state.status === 'playing' ? '' : state.status === 'victory' ? 'Zwycięstwo!' : 'Porażka';
    statusEl.className = state.status === 'playing' ? '' : `hud-status-${state.status}`;
  }

  return { render };
}
