// Panel armii: pokazuje skład i stan ruchu; dla armii gracza tłumaczy, że
// kolejne kliknięcie na mapie wyda jej rozkaz ruchu/ataku (obsługa kliknięcia
// mapy siedzi w main.js, ten moduł tylko renderuje i udostępnia anulowanie).
import { UNIT_TYPES } from '../data/unitTypes.js';
import { armyMovementPoints } from '../engine/units.js';
import { totalUnitCount } from '../engine/combat.js';

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

    const status = document.createElement('p');
    const marching = army.path && army.path.length > 0;
    status.textContent = marching
      ? `W marszu (${army.path.length} heksów do celu) · prędkość ${armyMovementPoints(army.units)}`
      : `Stoi w miejscu · prędkość ${armyMovementPoints(army.units)}`;
    container.appendChild(status);

    if (army.owner === 'player') {
      const hint = document.createElement('p');
      hint.className = 'panel-hint';
      hint.textContent =
        totalUnitCount(army.units) < 2
          ? 'Kliknij docelowy heks, aby ruszyć/zaatakować. Wskazówka: pojedyncza jednostka wystarczy na słabo bronione, neutralne miasto - do silniejszych celów zbierz kilka.'
          : 'Kliknij docelowy heks na mapie, aby przenieść armię albo zaatakować.';
      container.appendChild(hint);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'panel-close';
      cancelBtn.textContent = 'Zamknij';
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
