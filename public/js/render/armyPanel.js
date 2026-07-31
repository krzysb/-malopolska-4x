// Panel armii: pokazuje skład i punkty ruchu; dla armii gracza tłumaczy, że
// kolejne kliknięcie na mapie wyda jej rozkaz ruchu/ataku (obsługa kliknięcia
// mapy siedzi w main.js, ten moduł tylko renderuje i udostępnia anulowanie).
import { UNIT_TYPES } from '../data/unitTypes.js';
import { armyMovementPoints } from '../engine/units.js';

function describeUnits(units) {
  return units.map((u) => `${UNIT_TYPES[u.type].name} ×${u.count}`).join(', ');
}

export function createArmyPanel(container, { onCancel }) {
  function render(army) {
    container.innerHTML = '';
    container.hidden = false;

    const title = document.createElement('h2');
    title.textContent = army.owner === 'player' ? 'Twoja armia' : 'Armia tatarska';
    container.appendChild(title);

    const units = document.createElement('p');
    units.textContent = describeUnits(army.units);
    container.appendChild(units);

    const movement = document.createElement('p');
    movement.textContent = `Punkty ruchu: ${army.movementLeft} / ${armyMovementPoints(army.units)}`;
    container.appendChild(movement);

    if (army.owner === 'player') {
      const hint = document.createElement('p');
      hint.className = 'panel-hint';
      hint.textContent = 'Kliknij docelowy heks na mapie, aby przenieść armię albo zaatakować.';
      container.appendChild(hint);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'panel-close';
      cancelBtn.textContent = 'Anuluj wybór';
      cancelBtn.addEventListener('click', onCancel);
      container.appendChild(cancelBtn);
    }
  }

  function hide() {
    container.hidden = true;
    container.innerHTML = '';
  }

  return { render, hide };
}
