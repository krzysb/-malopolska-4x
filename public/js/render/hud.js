// HUD: tura, złoto, status gry. Prosty moduł renderujący istniejące elementy DOM
// (bez tworzenia ich - te są w index.html) w oparciu o aktualny stan gry.
export function createHud({ turnEl, goldEl, statusEl }) {
  function render(state) {
    turnEl.textContent = `Tura ${state.turn}`;
    goldEl.textContent = `Złoto ${state.player.gold}`;
    statusEl.textContent =
      state.status === 'playing' ? '' : state.status === 'victory' ? 'Zwycięstwo!' : 'Porażka';
    statusEl.className = state.status === 'playing' ? '' : `hud-status-${state.status}`;
  }

  return { render };
}
