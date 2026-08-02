// Pomocnik do wstawiania ikon z globalnego sprite'u (<symbol> w index.html) w
// treści budowanych dynamicznie z JS (cityPanel.js, armyPanel.js, hexRenderer.js).
// <svg>/<use> wymagają namespace'u SVG, inaczej DOM traktuje je jak nieznane
// tagi HTML i nic się nie renderuje.
const SVG_NS = 'http://www.w3.org/2000/svg';

export function iconEl(id) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#icon-${id}`);
  svg.appendChild(use);
  return svg;
}

export const BUILDING_ICONS = {
  walls: 'wall',
  barracks: 'barracks',
  market: 'market',
  granary: 'granary',
  church: 'church',
};

export const UNIT_ICONS = {
  infantry: 'infantry',
  archers: 'archers',
  cavalry: 'cavalry',
  'tatar-raiders': 'tatar-raiders',
  'tatar-horsearchers': 'archers',
  'tatar-elite': 'tatar-elite',
};

// Renderuje skład jednostek jako serię "chipów" (ikona typu + nazwa + liczba)
// zamiast płaskiego tekstu - używane w panelu miasta (garnizon) i armii.
export function renderUnitChips(container, units, unitTypeNames) {
  if (units.length === 0) {
    const span = document.createElement('span');
    span.className = 'unit-chip-empty';
    span.textContent = 'brak';
    container.appendChild(span);
    return;
  }
  for (const { type, count } of units) {
    const chip = document.createElement('span');
    chip.className = 'unit-chip';
    chip.appendChild(iconEl(UNIT_ICONS[type] ?? 'infantry'));
    const text = document.createElement('span');
    text.textContent = `${unitTypeNames[type].name} ×${count}`;
    chip.appendChild(text);
    container.appendChild(chip);
  }
}
