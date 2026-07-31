// Odprawa na start misji: krótkie tło fabularne, cel i podstawowe sterowanie.
// Pokazywana raz na starcie świeżej rozgrywki (tura 1), dismiss przez przycisk.
import { VICTORY_CITY_THRESHOLD, MAX_TURNS } from '../data/missionConfig.js';

export function createBriefing(container, { onStart }) {
  function render() {
    container.hidden = false;
    container.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'end-screen-box briefing-box';

    const title = document.createElement('h2');
    title.textContent = 'Misja 1: Najazdy tatarskie';
    box.appendChild(title);

    const lore = document.createElement('p');
    lore.textContent =
      'Rok 1241. Małopolska jest rozbita na zwaśnione dzielnice. Ze wschodu ' +
      'nadciągają czambuły tatarskie - pierwsze z trzech fal najazdu, które ' +
      'przetoczą się przez ziemię krakowsko-sandomierską w ciągu najbliższych ' +
      'kilkudziesięciu lat.';
    box.appendChild(lore);

    const goal = document.createElement('p');
    goal.innerHTML =
      `<strong>Cel:</strong> po trzeciej fali najazdu utrzymaj co najmniej ` +
      `${VICTORY_CITY_THRESHOLD} z 7 grodów. Nie trać Krakowa - jego upadek ` +
      `oznacza natychmiastową klęskę. Masz na to ${MAX_TURNS} tur.`;
    box.appendChild(goal);

    const controls = document.createElement('p');
    controls.innerHTML =
      '<strong>Sterowanie:</strong> kliknij miasto, by budować i rekrutować; ' +
      'kliknij armię, a potem docelowy heks, by nią ruszyć lub zaatakować.';
    box.appendChild(controls);

    const btn = document.createElement('button');
    btn.textContent = 'Rozpocznij';
    btn.addEventListener('click', () => {
      container.hidden = true;
      container.innerHTML = '';
      onStart();
    });
    box.appendChild(btn);

    container.appendChild(box);
  }

  function hide() {
    container.hidden = true;
    container.innerHTML = '';
  }

  return { render, hide };
}
