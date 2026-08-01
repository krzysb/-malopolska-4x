// Proste, wektorowe herby miast (kształt tarczy + jeden symbol/"godło" na
// mieście) zamiast płaskich kółek. Rysowane bezpośrednio jako SVG - bez
// zewnętrznych plików graficznych - stylizowane, nie ściśle heraldycznie
// poprawne, ale nadają mapie tożsamość wizualną.
export const SHIELD_PATH = 'M -5,-5.5 L 5,-5.5 L 5,0.5 Q 5,5.5 0,6.5 Q -5,5.5 -5,0.5 Z';

// Który symbol przypisany jest do którego miasta (kebab-case id z mapData.js).
export const CITY_CHARGES = {
  krakow: 'crown',
  sandomierz: 'tower',
  wislica: 'wave',
  'nowy-sacz': 'mountain',
  biecz: 'gate',
  oswiecim: 'bridge',
  zawichost: 'anchor',
};

// 'crest-mark' = kształt wypełniony (zamknięty polygon/rect), 'crest-line' =
// tylko kontur (otwarta krzywa) - style (fill/stroke) sterowane przez CSS,
// żeby nie mieszać ich z atrybutami inline.
export function chargeShapes(charge) {
  switch (charge) {
    case 'crown':
      return [
        { tag: 'polygon', class: 'crest-mark', attrs: { points: '-3,2 -3,-0.5 -1.5,1 0,-2.5 1.5,1 3,-0.5 3,2' } },
      ];
    case 'tower':
      return [
        { tag: 'rect', class: 'crest-mark', attrs: { x: -2.2, y: -1, width: 4.4, height: 4 } },
        { tag: 'polyline', class: 'crest-line', attrs: { points: '-2.2,-1 -2.2,-2.4 -1.1,-2.4 -1.1,-1.4 0,-1.4 0,-2.4 1.1,-2.4 1.1,-1.4 2.2,-1.4 2.2,-1' } },
      ];
    case 'wave':
      return [
        { tag: 'path', class: 'crest-line', attrs: { d: 'M -3,-0.5 Q -1.5,-2.3 0,-0.5 Q 1.5,1.3 3,-0.5' } },
        { tag: 'path', class: 'crest-line', attrs: { d: 'M -3,2 Q -1.5,0.2 0,2 Q 1.5,3.8 3,2' } },
      ];
    case 'mountain':
      return [
        { tag: 'polygon', class: 'crest-mark', attrs: { points: '-3,2.5 -1,-2 1,1 3,2.5' } },
      ];
    case 'gate':
      return [
        { tag: 'path', class: 'crest-line', attrs: { d: 'M -2.5,2.5 L -2.5,-0.5 Q -2.5,-3 0,-3 Q 2.5,-3 2.5,-0.5 L 2.5,2.5' } },
      ];
    case 'bridge':
      return [
        { tag: 'path', class: 'crest-line', attrs: { d: 'M -3,0.5 Q 0,-2.5 3,0.5' } },
        { tag: 'path', class: 'crest-line', attrs: { d: 'M -3,2.2 Q -1.5,1 0,2.2 Q 1.5,3.4 3,2.2' } },
      ];
    case 'anchor':
      return [
        { tag: 'circle', class: 'crest-line', attrs: { cx: 0, cy: -2.6, r: 0.8 } },
        { tag: 'line', class: 'crest-line', attrs: { x1: 0, y1: -1.9, x2: 0, y2: 2 } },
        { tag: 'line', class: 'crest-line', attrs: { x1: -1.5, y1: -0.5, x2: 1.5, y2: -0.5 } },
        { tag: 'path', class: 'crest-line', attrs: { d: 'M 0,2 Q -2.5,2 -2,0' } },
        { tag: 'path', class: 'crest-line', attrs: { d: 'M 0,2 Q 2.5,2 2,0' } },
      ];
    default:
      return [];
  }
}
