// Tłumaczy wpisy state.log (dane strukturalne z combat.js/ai.js) na czytelną
// polską narrację i renderuje je jako listę (najnowsze na górze). Silnik zapisuje
// tylko fakty (kto/co/wygrana?) - cała warstwa językowa żyje tutaj, żeby dało się
// ją swobodnie dopracować (etap "polish") bez dotykania logiki gry.
import { TATAR_WAVES } from '../data/missionConfig.js';
import { formatTime } from './hud.js';

const MAX_VISIBLE_ENTRIES = 40;

function ownerLabel(owner) {
  return owner === 'player' ? 'Twoje wojska' : owner === 'tatar' ? 'Najeźdźcy' : owner;
}

function describeBattle(entry, state) {
  const attacker = ownerLabel(entry.attackerOwner);

  if (entry.target.type === 'city') {
    const cityName = state.cities[entry.target.id]?.name ?? entry.target.id;
    if (entry.captured) return `${attacker} zdobywają ${cityName}!`;
    return entry.attackerWon
      ? `${attacker} osłabiają obronę miasta ${cityName}, lecz nie przełamują murów.`
      : `Obrona miasta ${cityName} odpiera atak (${attacker}).`;
  }

  return entry.attackerWon
    ? `${attacker} zwyciężają w starciu polowym.`
    : `${attacker} zostają rozbici w starciu polowym.`;
}

function describeWaveSpawn(entry) {
  const wave = TATAR_WAVES.find((w) => w.id === entry.waveId);
  const year = wave ? ` (${wave.year})` : '';
  return `Zwiadowcy donoszą: nadciąga fala najazdu tatarskiego${year}!`;
}

function describeWaveWithdraw() {
  return 'Niepokonana fala tatarska wycofuje się w stepy.';
}

function describeEntry(entry, state) {
  switch (entry.type) {
    case 'battle':
      return describeBattle(entry, state);
    case 'wave-spawn':
      return describeWaveSpawn(entry);
    case 'wave-withdraw':
      return describeWaveWithdraw();
    default:
      return null;
  }
}

export function createEventLog(listEl) {
  function render(state) {
    listEl.innerHTML = '';
    const recent = state.log.slice(-MAX_VISIBLE_ENTRIES).reverse();
    for (const entry of recent) {
      const text = describeEntry(entry, state);
      if (!text) continue;
      const li = document.createElement('li');
      li.textContent = `[${formatTime(entry.time)}] ${text}`;
      listEl.appendChild(li);
    }
  }

  return { render };
}
