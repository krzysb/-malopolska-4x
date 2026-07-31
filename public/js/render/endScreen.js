// Pełnoekranowa nakładka pokazywana, gdy state.status !== 'playing' (zwycięstwo
// albo porażka), z krótkim podsumowaniem i przyciskiem nowej gry.
export function createEndScreen(container, { onNewGame }) {
  function render(state) {
    if (state.status === 'playing') {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }

    container.hidden = false;
    container.innerHTML = '';

    const playerCities = Object.values(state.cities).filter((c) => c.owner === 'player').length;
    const lastTurn = Math.max(1, state.turn - 1);

    const box = document.createElement('div');
    box.className = 'end-screen-box';

    const title = document.createElement('h2');
    title.textContent = state.status === 'victory' ? 'Zwycięstwo!' : 'Porażka';
    box.appendChild(title);

    const summary = document.createElement('p');
    summary.textContent =
      state.status === 'victory'
        ? `Obroniłeś i zjednoczyłeś małopolskie grody, utrzymując ${playerCities} z 7 miast po trzeciej fali najazdu (tura ${lastTurn}).`
        : `Władza nad Małopolską upadła w turze ${lastTurn}. Pod twoją kontrolą pozostało ${playerCities} z 7 miast.`;
    box.appendChild(summary);

    const btn = document.createElement('button');
    btn.textContent = 'Nowa gra';
    btn.addEventListener('click', onNewGame);
    box.appendChild(btn);

    container.appendChild(box);
  }

  return { render };
}
