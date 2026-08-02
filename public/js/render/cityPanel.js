// Panel miasta: pokazuje info o dowolnym mieście (właściciel, poziom, garnizon),
// a dla miast gracza dokłada listę budynków (z przyciskiem "Buduj") i rekrutacji
// (z przyciskami "Garnizon" / "Armia"). Sam moduł nie zna reguł gry - deleguje
// akcje do onBuild/onRecruit, silnik (cities.js/units.js) waliduje je naprawdę.
import { BUILDINGS, BUILDING_IDS } from '../data/buildings.js';
import { UNIT_TYPES } from '../data/unitTypes.js';
import { buildingLevel, nextBuildingCost, canBuild } from '../engine/cities.js';
import { recruitCost } from '../engine/units.js';

const RECRUITABLE_UNIT_IDS = ['infantry', 'archers', 'cavalry'];

function ownerLabel(owner) {
  return owner === 'player' ? 'Ty' : owner === 'tatar' ? 'Tatarzy' : 'Neutralne';
}

function describeUnits(units) {
  if (units.length === 0) return 'brak';
  return units.map((u) => `${UNIT_TYPES[u.type].name} ×${u.count}`).join(', ');
}

export function createCityPanel(container, { onBuild, onRecruit, onClose }) {
  function renderBuildings(city, gold) {
    const section = document.createElement('section');
    section.className = 'panel-section';
    const h = document.createElement('h3');
    h.textContent = 'Budynki';
    section.appendChild(h);

    for (const id of BUILDING_IDS) {
      const def = BUILDINGS[id];
      const level = buildingLevel(city, id);
      const cost = nextBuildingCost(city, id);

      const row = document.createElement('div');
      row.className = 'panel-row';
      const label = document.createElement('span');
      label.textContent = `${def.name} (poz. ${level}/${def.maxLevel})`;
      row.appendChild(label);

      if (cost !== null) {
        const btn = document.createElement('button');
        btn.textContent = `Buduj (${cost}z)`;
        btn.disabled = !canBuild(city, id, gold);
        btn.addEventListener('click', () => onBuild(id));
        row.appendChild(btn);
      } else {
        const max = document.createElement('span');
        max.className = 'panel-max';
        max.textContent = 'maks.';
        row.appendChild(max);
      }
      section.appendChild(row);

      const desc = document.createElement('p');
      desc.className = 'panel-hint panel-building-desc';
      desc.textContent = def.description;
      section.appendChild(desc);
    }
    return section;
  }

  function renderRecruitment(city, gold) {
    const section = document.createElement('section');
    section.className = 'panel-section';
    const h = document.createElement('h3');
    h.textContent = 'Rekrutacja';
    section.appendChild(h);

    for (const id of RECRUITABLE_UNIT_IDS) {
      const def = UNIT_TYPES[id];
      const cost = recruitCost(city, id);
      const affordable = gold >= cost;

      const row = document.createElement('div');
      row.className = 'panel-row';
      const label = document.createElement('span');
      label.textContent = `${def.name} (${cost}z)`;
      row.appendChild(label);

      const garrisonBtn = document.createElement('button');
      garrisonBtn.textContent = 'Garnizon';
      garrisonBtn.disabled = !affordable;
      garrisonBtn.addEventListener('click', () => onRecruit(id, 'garrison'));
      row.appendChild(garrisonBtn);

      const armyBtn = document.createElement('button');
      armyBtn.textContent = 'Armia';
      armyBtn.disabled = !affordable;
      armyBtn.addEventListener('click', () => onRecruit(id, 'army'));
      row.appendChild(armyBtn);

      section.appendChild(row);
    }
    return section;
  }

  function render(city, gold) {
    container.innerHTML = '';
    container.hidden = false;

    const title = document.createElement('h2');
    title.textContent = city.capital ? `${city.name} (stolica)` : city.name;
    container.appendChild(title);

    const info = document.createElement('p');
    info.textContent = `Właściciel: ${ownerLabel(city.owner)} · Poziom ${city.level}`;
    container.appendChild(info);

    const garrison = document.createElement('p');
    garrison.textContent = `Garnizon: ${describeUnits(city.garrison)}`;
    container.appendChild(garrison);

    if (city.owner === 'player') {
      container.appendChild(renderBuildings(city, gold));
      container.appendChild(renderRecruitment(city, gold));
    } else {
      const captureHint = document.createElement('p');
      captureHint.className = 'panel-hint';
      captureHint.textContent =
        city.owner === 'neutral'
          ? 'Zdobycie tego grodu: dodatkowy dochód złota, możliwość budowy i rekrutacji na miejscu, i liczy się do progu zwycięstwa (utrzymaj wymaganą liczbę miast po 3. fali).'
          : 'Odbicie tego grodu z rąk Tatarów: przywraca dochód złota i rekrutację, i ponownie liczy się do progu zwycięstwa.';
      container.appendChild(captureHint);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close';
    closeBtn.textContent = 'Zamknij';
    closeBtn.addEventListener('click', onClose);
    container.appendChild(closeBtn);
  }

  function hide() {
    container.hidden = true;
    container.innerHTML = '';
  }

  return { render, hide };
}
