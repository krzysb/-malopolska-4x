// Renderowanie mapy heksagonalnej w SVG: warstwa terenu budowana raz (buildBoard),
// warstwy miast/armii/podświetlenia aktualizowane przy każdym render(). Wzorzec
// przeniesiony z Portalu Gierek (public/games/heksownia/app.js: axialToPixel +
// hexPoints + buildBoard raz, potem tylko aktualizacja klas/atrybutów), dostosowany
// do danych stanu 4X (teren + miasta + armie zamiast dwugraczowej planszy).
import { axialToPixel, hexPolygonPoints, parseKey } from '../engine/hexgrid.js';
import { UNIT_TYPES } from '../data/unitTypes.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const HEX_SIZE = 10;

// Kafle terenu wycięte z arkusza referencyjnego użytkownika (zob.
// assets-source/) - izometryczne "diamenty", niekoniecznie tego samego
// kształtu co nasz heks. `preserveAspectRatio="xMidYMid slice"` na <image>
// (patrz buildBoard) kadruje je jak CSS `background-size:cover`, więc różne
// proporcje źródeł nie wymagają osobnego strojenia.
const TERRAIN_IMAGES = {
  plains: 'assets/terrain/plains.png',
  forest: 'assets/terrain/forest.png',
  hills: 'assets/terrain/hills.png',
  river: 'assets/terrain/river.png',
  impassable: 'assets/terrain/impassable.png',
};

// Ilustracja miasta: stolica dostaje unikalny Zamek Królewski, pozostałe
// miasta cyklicznie dzielą 3 warianty (arkusz użytkownika miał ich tyle) -
// różnicowane dodatkowo kolorową "podstawą" właściciela (patrz renderCities).
const CAPITAL_CITY_IMAGE = 'assets/cities/zamek-krolewski.png';
const CITY_IMAGES = ['assets/cities/miasto-fortyfikowane.png', 'assets/cities/osada-targowa.png', 'assets/cities/mur-obronny.png'];

// Wariant grafiki zależy od id miasta (nie kolejności renderowania - ta
// zmienia się wraz z sortowaniem po głębi, patrz renderCities), więc
// przypisanie jest stabilne między klatkami.
function cityImageFor(city) {
  if (city.capital) return CAPITAL_CITY_IMAGE;
  const hash = [...city.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return CITY_IMAGES[hash % CITY_IMAGES.length];
}

// Kształt markera armii zależy od dominującego (najliczniejszego) typu jednostek
// w stosie - proste wektorowe rozróżnienie (kwadrat/trójkąt/romb/sześciokąt)
// zamiast jednego trójkąta dla wszystkich, kolor nadal niesie właściciela.
const ARMY_MARKER_SHAPES = {
  infantry: '-3.2,-3.2 3.2,-3.2 3.2,3.2 -3.2,3.2',
  archers: '0,-4 4,3 -4,3',
  cavalry: '0,-4.2 4.2,0 0,4.2 -4.2,0',
  'tatar-raiders': '0,-4 4,3 -4,3',
  'tatar-horsearchers': '0,-4.2 4.2,0 0,4.2 -4.2,0',
  'tatar-elite': '0,-4 3.5,-2 3.5,2 0,4 -3.5,2 -3.5,-2',
};
const DEFAULT_ARMY_MARKER_SHAPE = '0,-4 4,3 -4,3';

function dominantUnitType(units) {
  return units.reduce((best, u) => (!best || u.count > best.count ? u : best), null)?.type;
}

const TERRAIN_LABELS = {
  plains: 'Równiny',
  forest: 'Las',
  hills: 'Wzgórza',
  river: 'Rzeka',
  impassable: 'Góry',
};

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function pointsAttr(x, y) {
  return hexPolygonPoints(x, y, HEX_SIZE).map(([px, py]) => `${px},${py}`).join(' ');
}

// svg - element <svg> w DOM. onHexClick(q, r) - opcjonalny handler kliknięcia w heks.
export function createHexRenderer(svg, { onHexClick } = {}) {
  const defs = svgEl('defs');
  const hexClip = svgEl('clipPath', { id: 'hex-clip' });
  defs.appendChild(hexClip);
  const terrainLayer = svgEl('g', { class: 'layer-terrain' });
  const terrainImageLayer = svgEl('g', { class: 'layer-terrain-images' });
  const highlightLayer = svgEl('g', { class: 'layer-highlight' });
  const pathsLayer = svgEl('g', { class: 'layer-paths' });
  const citiesLayer = svgEl('g', { class: 'layer-cities' });
  const armiesLayer = svgEl('g', { class: 'layer-armies' });
  // Kolejność: obrazy terenu na spodzie, potem terrainLayer (bez wypełnienia,
  // tylko obrys siatki + obsługa kliknięć) na wierzchu, żeby linie heksów
  // zawsze były widoczne NAD grafiką (inaczej nieprzezroczysty kafel
  // całkowicie zakrywałby obrys pod spodem).
  svg.append(defs, terrainImageLayer, terrainLayer, highlightLayer, pathsLayer, citiesLayer, armiesLayer);

  const hexPositions = new Map(); // "q,r" -> {x, y}
  const cityGroups = new Map(); // cityId -> <g>
  const armyGroups = new Map(); // armyId -> <g>
  const pathLines = new Map(); // armyId -> <polyline>

  function buildBoard(state) {
    terrainLayer.innerHTML = '';
    terrainImageLayer.innerHTML = '';
    hexPositions.clear();

    // clipPath ze wspólnym kształtem heksa wyśrodkowanym w (0,0) - każdy kafel
    // terenu to <g transform="translate(x,y)"> z tym samym clip-path, więc nie
    // trzeba liczyć osobnego poligonu przycinającego dla każdego heksu.
    hexClip.innerHTML = '';
    hexClip.appendChild(svgEl('polygon', { points: pointsAttr(0, 0) }));

    const pixels = Object.entries(state.map.hexes).map(([k, hex]) => {
      const { q, r } = parseKey(k);
      const { x, y } = axialToPixel(q, r, HEX_SIZE);
      return { k, hex, q, r, x, y };
    });

    const pad = HEX_SIZE * 1.5;
    const xs = pixels.map((p) => p.x);
    const ys = pixels.map((p) => p.y);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    svg.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);

    // Kafel obrazu jest celowo większy niż sam heks (i wycentrowany na nim) -
    // preserveAspectRatio="xMidYMid slice" kadruje go jak CSS background-size:
    // cover, więc nadmiar i tak zostanie przycięty przez clip-path, ale
    // zapewnia to pełne pokrycie heksa niezależnie od proporcji źródłowego pliku.
    const tileSize = HEX_SIZE * 2.4;
    for (const p of pixels) {
      const tile = svgEl('g', { transform: `translate(${p.x},${p.y})`, 'clip-path': 'url(#hex-clip)' });
      tile.appendChild(
        svgEl('image', {
          href: TERRAIN_IMAGES[p.hex.terrain] ?? TERRAIN_IMAGES.plains,
          x: -tileSize / 2,
          y: -tileSize / 2,
          width: tileSize,
          height: tileSize,
          preserveAspectRatio: 'xMidYMid slice',
        }),
      );
      terrainImageLayer.appendChild(tile);

      const poly = svgEl('polygon', {
        points: pointsAttr(p.x, p.y),
        class: `hex-cell terrain-${p.hex.terrain}`,
        'data-key': p.k,
      });
      if (onHexClick) poly.addEventListener('click', () => onHexClick(p.q, p.r));
      const title = svgEl('title');
      title.textContent = TERRAIN_LABELS[p.hex.terrain] ?? p.hex.terrain;
      poly.appendChild(title);
      terrainLayer.appendChild(poly);
      hexPositions.set(p.k, { x: p.x, y: p.y });
    }
  }

  function renderCities(state) {
    const seen = new Set();
    // Ilustracje budynków są wyższe niż jeden heks i mogą zachodzić na
    // sąsiadów - sortowanie po `r` (wiersz, południe=dalej) zapewnia, że
    // miasto "bliżej widza" rysuje się NAD tym, które stoi za nim, zamiast
    // w nieprzewidywalnej kolejności obiektu stanu.
    const citiesSorted = Object.values(state.cities).sort((a, b) => a.r - b.r);
    for (const city of citiesSorted) {
      seen.add(city.id);
      const pos = hexPositions.get(`${city.q},${city.r}`);
      if (!pos) continue;

      let group = cityGroups.get(city.id);
      if (!group) {
        group = svgEl('g');
        // Kolorowa "podstawa" pod budynkiem niesie właściciela (grafika
        // budynku sama w sobie nie ma koloru frakcji) - elipsa zamiast koła,
        // żeby pasowała do izometrycznej perspektywy kafli terenu.
        const base = svgEl('ellipse', { class: 'city-base', rx: HEX_SIZE * 0.6, ry: HEX_SIZE * 0.32 });
        // Budynek renderowany szerzej/wyżej niż sam heks (jak na ilustracji
        // referencyjnej, gdzie zabudowa wyraźnie "wystaje" ponad kafel) i
        // zakotwiczony u dołu na środku heksa. Celowo nie za duży - sąsiednie
        // miasta na tej mapie potrafią stać na hexach odległych o 1.
        const bw = HEX_SIZE * 1.7;
        const bh = HEX_SIZE * 1.5;
        const img = svgEl('image', {
          class: 'city-building',
          x: -bw / 2,
          y: -bh + HEX_SIZE * 0.4,
          width: bw,
          height: bh,
          preserveAspectRatio: 'xMidYMid meet',
        });
        group.append(base, img, svgEl('text', { class: 'city-label' }));
        cityGroups.set(city.id, group);
      } else {
        group.remove(); // odczep i dołóż na koniec, żeby zachować porządek sortowania po r
      }
      citiesLayer.appendChild(group);
      group.setAttribute('transform', `translate(${pos.x},${pos.y})`);
      group.setAttribute('class', `city-marker owner-${city.owner}${city.capital ? ' capital' : ''}`);
      group.querySelector('.city-building').setAttribute('href', cityImageFor(city));
      group.querySelector('.city-label').textContent = city.name;
    }
    for (const [id, group] of cityGroups) {
      if (!seen.has(id)) {
        group.remove();
        cityGroups.delete(id);
      }
    }
  }

  function renderArmies(state) {
    const seen = new Set();
    for (const army of Object.values(state.armies)) {
      seen.add(army.id);
      const pos = hexPositions.get(`${army.q},${army.r}`);
      if (!pos) continue;

      let group = armyGroups.get(army.id);
      if (!group) {
        group = svgEl('g');
        group.append(
          svgEl('polygon', { points: DEFAULT_ARMY_MARKER_SHAPE }),
          svgEl('text', { class: 'army-count' }),
          svgEl('title'),
        );
        armiesLayer.appendChild(group);
        armyGroups.set(army.id, group);
      }
      group.setAttribute('transform', `translate(${pos.x},${pos.y - HEX_SIZE * 0.15})`);
      group.setAttribute('class', `army-marker owner-${army.owner}`);
      const total = army.units.reduce((sum, u) => sum + u.count, 0);
      group.querySelector('polygon').setAttribute(
        'points',
        ARMY_MARKER_SHAPES[dominantUnitType(army.units)] ?? DEFAULT_ARMY_MARKER_SHAPE,
      );
      group.querySelector('.army-count').textContent = total;
      group.querySelector('title').textContent = army.units
        .map((u) => `${UNIT_TYPES[u.type].name} ×${u.count}`)
        .join(', ');
    }
    for (const [id, group] of armyGroups) {
      if (!seen.has(id)) {
        group.remove();
        armyGroups.delete(id);
      }
    }
  }

  // Rysuje trasę marszu dla każdej armii mającej zleconą (niepustą) ścieżkę -
  // linia od bieżącej pozycji przez kolejne heksy do celu, z kropką na końcu.
  // Widoczne dla obu stron: gracz widzi dokąd wysłał swoje wojska, a dzięki
  // poprawce odległości spawnu (mapData.js) ma też realny czas, by zauważyć
  // nadciągającą trasę najazdu tatarskiego i się przygotować.
  function renderPaths(state) {
    const seen = new Set();
    for (const army of Object.values(state.armies)) {
      if (!army.path || army.path.length === 0) continue;
      const points = [army, ...army.path]
        .map((h) => hexPositions.get(`${h.q},${h.r}`))
        .filter(Boolean);
      if (points.length < 2) continue;
      seen.add(army.id);

      let group = pathLines.get(army.id);
      if (!group) {
        group = svgEl('g');
        group.append(svgEl('polyline', { class: 'army-path-line' }), svgEl('circle', { class: 'army-path-dest', r: HEX_SIZE * 0.2 }));
        pathsLayer.appendChild(group);
        pathLines.set(army.id, group);
      }
      group.setAttribute('class', `army-path owner-${army.owner}`);
      group.querySelector('.army-path-line').setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
      const dest = points[points.length - 1];
      const destCircle = group.querySelector('.army-path-dest');
      destCircle.setAttribute('cx', dest.x);
      destCircle.setAttribute('cy', dest.y);
    }
    for (const [id, group] of pathLines) {
      if (!seen.has(id)) {
        group.remove();
        pathLines.delete(id);
      }
    }
  }

  function setHighlight(hexKeys = []) {
    highlightLayer.innerHTML = '';
    for (const k of hexKeys) {
      const pos = hexPositions.get(k);
      if (!pos) continue;
      highlightLayer.appendChild(svgEl('polygon', { points: pointsAttr(pos.x, pos.y), class: 'hex-highlight' }));
    }
  }

  // Włącza/wyłącza wizualny "tryb rozkazu" (armia zaznaczona, kolejny klik na
  // mapie ją wyśle) - zmienia kursor nad heksami, żeby stan był widoczny na
  // samej mapie, a nie tylko w tekście panelu bocznego (który na mobile jest
  // pod scrollem jako bottom-sheet).
  function setOrderMode(active) {
    svg.classList.toggle('order-mode', Boolean(active));
  }

  // Krótki, samo-znikający czerwony "pulse" na heksie, do którego kliknięcie
  // nie wydało rozkazu (cel nieosiągalny/brak ścieżki) - bez tego klik po
  // prostu "nic nie robił", co sprawiało wrażenie zepsutego sterowania.
  function flashInvalidHex(q, r) {
    const pos = hexPositions.get(`${q},${r}`);
    if (!pos) return;
    const poly = svgEl('polygon', { points: pointsAttr(pos.x, pos.y), class: 'hex-invalid' });
    highlightLayer.appendChild(poly);
    setTimeout(() => poly.remove(), 450);
  }

  function render(state) {
    renderCities(state);
    renderPaths(state);
    renderArmies(state);
  }

  return { buildBoard, render, setHighlight, setOrderMode, flashInvalidHex };
}
