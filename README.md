# Małopolska 4X

Gra strategiczna 4X w czasie rzeczywistym, osadzona w historii Małopolski. Misja 1:
najazdy tatarskie na rozbite dzielnicowo ziemie (XIII w.) — broń i
zjednocz małopolskie grody.

Gra przeglądarkowa (Node.js + Express, statyczny frontend bez frameworka,
podobnie jak siostrzany projekt Portal Gierek). Docelowo część większej,
wieloerowej kampanii — na razie w pełni zbudowana i dopracowana jest
wyłącznie Misja 1.

## Graj online

**https://krzysb.github.io/-malopolska-4x/** — automatycznie wdrażane przez
GitHub Actions po każdym pushu na `main` (patrz `.github/workflows/deploy-pages.yml`).
Gra jest w 100% statyczna (bez backendu), więc nie wymaga instalowania
niczego, żeby ją sprawdzić.

## Uruchomienie lokalne

```bash
npm install
npm start
# http://localhost:3100
```

## Testy

```bash
npm test          # silnik gry (node --test, szybkie testy jednostkowe/fuzz)
npm run test:e2e  # smoke-test w przeglądarce (Playwright, desktop+mobile)
```

## Status

Misja 1 jest kompletna i grywalna od odprawy po ekran końcowy: gra toczy się
w czasie rzeczywistym (pauza/2× w HUD) - mapa z herbami miast, ekonomia,
rekrutacja i ciągły ruch wojsk, walka, trzy fale najazdu tatarskiego,
warunki zwycięstwa/porażki, zapis w localStorage, responsywny UI.

## Dokumentacja

Dokument wymagań (brainstorm) znajduje się w repozytorium siostrzanego
projektu Portal Gierek:
`docs/dev-brainstorms/2026-07-31-malopolska-4x-kampania-requirements.md`.
