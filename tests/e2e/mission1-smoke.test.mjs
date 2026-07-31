import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Smoke-test end-to-end: uruchamia prawdziwy serwer i przeglądarkę (desktop +
// mobile viewport), sprawdza że gra się ładuje bez błędów konsoli i że
// podstawowa interakcja (wybór miasta, koniec tury) działa. Osobny od
// `npm test` (silnik) - wolniejszy, wymaga przeglądarki, uruchamiany ręcznie
// przez `npm run test:e2e`.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const PORT = 3177; // inny niż domyślny 3100, żeby nie kolidować z sesją deweloperską
const BASE_URL = `http://localhost:${PORT}`;
const CHROMIUM_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH
  ? path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium')
  : undefined;

let serverProcess;
let browser;

async function waitForServer(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // serwer jeszcze nie wstał - ponawiamy
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Serwer nie odpowiedział w ciągu ${timeoutMs}ms`);
}

before(async () => {
  serverProcess = spawn('node', ['server/index.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await waitForServer(BASE_URL);
  browser = await chromium.launch(CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {});
});

after(async () => {
  await browser?.close();
  serverProcess?.kill();
});

async function openPage(viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  // Błędy 404 na favicon.ico to domyślne, nieszkodliwe zachowanie przeglądarki
  // (aplikacja nie deklaruje ikony) - odfiltrowujemy po faktycznym URL-u
  // odpowiedzi, bo tekst komunikatu konsoli go nie zawiera.
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
      consoleErrors.push(`HTTP ${res.status()}: ${res.url()}`);
    }
  });
  page.on('console', (msg) => {
    // "Failed to load resource" duplikowałoby to, co już łapiemy dokładniej
    // (z URL-em) w listenerze 'response' powyżej.
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
      consoleErrors.push(msg.text());
    }
  });
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  return { page, consoleErrors };
}

test('desktop: mapa się ładuje bez błędów konsoli, widać HUD i 7 miast', async () => {
  const { page, consoleErrors } = await openPage({ width: 1280, height: 800 });

  const hexCells = await page.locator('.hex-cell').count();
  assert.equal(hexCells, 84, 'mapa 12x7 powinna mieć 84 heksy');

  const cityLabels = await page.locator('.city-marker .city-label').count();
  assert.equal(cityLabels, 7, 'na mapie powinno być 7 miast');

  await page.screenshot({ path: path.join(projectRoot, 'tests', 'screenshots', 'desktop-start.png') });
  assert.deepEqual(consoleErrors, []);
  await page.close();
});

test('mobile: mapa się ładuje bez błędów konsoli, layout jest pionowy (bottom-sheet)', async () => {
  const { page, consoleErrors } = await openPage({ width: 390, height: 844 });

  const flexDirection = await page.locator('#board-wrap').evaluate((el) => getComputedStyle(el).flexDirection);
  assert.equal(flexDirection, 'column', 'na wąskim ekranie panel powinien być pod mapą, nie obok');

  await page.screenshot({ path: path.join(projectRoot, 'tests', 'screenshots', 'mobile-start.png') });
  assert.deepEqual(consoleErrors, []);
  await page.close();
});

test('desktop: kliknięcie miasta gracza otwiera panel z budynkami i rekrutacją', async () => {
  const { page, consoleErrors } = await openPage({ width: 1280, height: 800 });

  const krakowLabel = page.locator('text=Kraków').first();
  const box = await krakowLabel.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + 15);
  await page.waitForTimeout(150);

  const buildingsHeading = await page.locator('#side-panel h3', { hasText: 'Budynki' }).count();
  const recruitHeading = await page.locator('#side-panel h3', { hasText: 'Rekrutacja' }).count();
  assert.ok(buildingsHeading > 0 && recruitHeading > 0);

  await page.screenshot({ path: path.join(projectRoot, 'tests', 'screenshots', 'desktop-city-panel.png') });
  assert.deepEqual(consoleErrors, []);
  await page.close();
});

test('koniec tury zwiększa licznik tur i nie zostawia błędów w konsoli', async () => {
  const { page, consoleErrors } = await openPage({ width: 1280, height: 800 });

  const turnBefore = await page.locator('#hud-turn').textContent();
  await page.click('#end-turn-btn');
  await page.waitForTimeout(150);
  const turnAfter = await page.locator('#hud-turn').textContent();

  assert.notEqual(turnBefore, turnAfter);
  assert.equal(turnAfter, 'Tura 2');
  assert.deepEqual(consoleErrors, []);
  await page.close();
});

test('przyciski mają rozsądny rozmiar celu dotykowego na widoku mobilnym (>=32px wysokości)', async () => {
  const { page, consoleErrors } = await openPage({ width: 390, height: 844 });

  const height = await page.locator('#end-turn-btn').evaluate((el) => el.getBoundingClientRect().height);
  assert.ok(height >= 32, `przycisk końca tury ma ${height}px wysokości - za mały cel dotykowy`);

  assert.deepEqual(consoleErrors, []);
  await page.close();
});
