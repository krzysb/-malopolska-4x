// Pomocnik do wstawiania ikon w treści budowanych dynamicznie z JS
// (cityPanel.js, armyPanel.js, hexRenderer.js). Dwa źródła grafik:
// - sprite SVG (<symbol> w index.html) - kursor/awaryjny fallback dla typów
//   bez własnej grafiki (jednostki tatarskie - patrz UNIT_IMAGES niżej);
//   <svg>/<use> wymagają namespace'u SVG, inaczej DOM traktuje je jak
//   nieznane tagi HTML i nic się nie renderuje.
// - rastrowe PNG (public/assets/...) wygenerowane przez użytkownika (AI),
//   wycięte/przycięte z arkuszy referencyjnych - patrz assets-source/.
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

export function imgIconEl(src, alt = '') {
  const img = document.createElement('img');
  img.className = 'icon-img';
  img.src = src;
  img.alt = alt;
  return img;
}

export const BUILDING_ICONS = {
  walls: 'wall',
  barracks: 'barracks',
  market: 'market',
  granary: 'granary',
  church: 'church',
};

// Pełny (podpisany po polsku) obrazek "karty" budynku - zastępuje ikonę SVG
// tam, gdzie jest miejsce na większą grafikę (panel miasta).
export const BUILDING_CARDS = {
  walls: 'assets/buildings/walls.png',
  barracks: 'assets/buildings/barracks.png',
  market: 'assets/buildings/market.png',
  granary: 'assets/buildings/granary.png',
  church: 'assets/buildings/church.png',
};

export const UNIT_ICONS = {
  infantry: 'infantry',
  archers: 'archers',
  cavalry: 'cavalry',
  'tatar-raiders': 'tatar-raiders',
  'tatar-horsearchers': 'archers',
  'tatar-elite': 'tatar-elite',
};

// Grafika istnieje tylko dla jednostek gracza (wycięta z arkusza referencyjnego
// użytkownika) - jednostki tatarskie nadal używają ikon liniowych z UNIT_ICONS.
export const UNIT_IMAGES = {
  infantry: 'assets/units/infantry.png',
  archers: 'assets/units/archers.png',
  cavalry: 'assets/units/cavalry.png',
};

export function unitIconEl(type) {
  return UNIT_IMAGES[type] ? imgIconEl(UNIT_IMAGES[type]) : iconEl(UNIT_ICONS[type] ?? 'infantry');
}

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
    chip.appendChild(unitIconEl(type));
    const text = document.createElement('span');
    text.textContent = `${unitTypeNames[type].name} ×${count}`;
    chip.appendChild(text);
    container.appendChild(chip);
  }
}
