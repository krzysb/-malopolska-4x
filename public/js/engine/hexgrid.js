// Czysta matematyka siatki heksagonalnej (axial, pointy-top). Bez zależności od DOM ani stanu gry.
// Adaptacja wzorca z Portalu Gierek (public/games/heksownia/logic.js i app.js).

export const NEIGHBOR_OFFSETS = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

export function key(q, r) {
  return `${q},${r}`;
}

export function parseKey(k) {
  const [q, r] = k.split(',').map(Number);
  return { q, r };
}

export function neighborsOf(q, r) {
  return NEIGHBOR_OFFSETS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}

export function hexDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// Konwersja "offset" (kolumna/wiersz, wygodna do ręcznego projektowania prostokątnej
// mapy) na współrzędne osiowe. Layout "odd-r" (nieparzyste wiersze przesunięte).
export function offsetToAxial(col, row) {
  const q = col - (row - (row & 1)) / 2;
  const r = row;
  return { q, r };
}

export function axialToOffset(q, r) {
  const col = q + (r - (r & 1)) / 2;
  const row = r;
  return { col, row };
}

export function axialToPixel(q, r, size = 1) {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * 1.5 * r;
  return { x, y };
}

export function hexPolygonPoints(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
  }
  return pts;
}

// Generuje prostokątny (w sensie offsetu) obszar heksów o wymiarach cols x rows.
export function generateRectangle(cols, rows) {
  const hexes = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { q, r } = offsetToAxial(col, row);
      hexes.push({ q, r, col, row });
    }
  }
  return hexes;
}
