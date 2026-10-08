// Difficulty presets, player settings and the save file (unlocks, collectibles, high scores).
// Everything saved lives in this browser only (localStorage), wrapped so a blocked store never breaks the game.

export const DIFFICULTY = {
  easy: {
    name: 'Easy', beatWindow: 0.16, enemySpeed: 0.8, spawnChance: 0.45, spawnMax: -1, lives: 5,
    bossHp: 0.7, pitSave: 'always', zoneCheckpoints: true, skulls: 0.8,
    blurb: 'Wide beat window, slower zombies, pits never cost a life.',
  },
  normal: {
    name: 'Normal', beatWindow: 0.11, enemySpeed: 1, spawnChance: 0.6, spawnMax: 0, lives: 3,
    bossHp: 1, pitSave: 'jacket', zoneCheckpoints: true, skulls: 1,
    blurb: 'The jacket saves you from one pit fall. Every zone is a checkpoint.',
  },
  hard: {
    name: 'Hard', beatWindow: 0.08, enemySpeed: 1.15, spawnChance: 0.7, spawnMax: 1, lives: 3,
    bossHp: 1.35, pitSave: 'never', zoneCheckpoints: false, skulls: 1.2,
    blurb: 'True Ghosts ’n Goblins: pits kill, one checkpoint per level, then the encore.',
  },
};

// Extra push for the Hard-mode encore loop.
export const ENCORE = { enemySpeed: 1.25, spawnMax: 2, bossHp: 1.3 };

export const SHOP = [
  { id: 'life', name: 'Extra life', price: 150, blurb: 'One more go.' },
  { id: 'spikes', name: 'Spiked jacket', price: 200, blurb: 'Takes two hits before it comes off.' },
  { id: 'amp', name: 'Bigger amp', price: 150, blurb: 'Solo meter fills 50% faster.' },
  { id: 'flame', name: 'Flaming start', price: 100, blurb: 'Start the next gig with the flaming guitar.' },
];

const KEY = 'rnrz-save-v1';
const DEFAULTS = {
  settings: { difficulty: 'normal', flashing: true, shake: true, soundcheck: true },
  unlocked: { levels: 1, characters: ['punk'] },
  records: {},          // level index -> array of collected record ids
  scores: [],           // [{ name, score, level, diff, date }]
  times: {},            // level index -> [{ name, time, diff, hero }] fastest first
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const s = JSON.parse(raw);
    return {
      settings: { ...DEFAULTS.settings, ...s.settings },
      unlocked: { ...DEFAULTS.unlocked, ...s.unlocked },
      records: s.records || {},
      scores: Array.isArray(s.scores) ? s.scores : [],
      times: s.times || {},
    };
  } catch { return structuredClone(DEFAULTS); }
}

export const save = load();

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch {}
}

export function unlockCharacter(id) {
  if (!save.unlocked.characters.includes(id)) { save.unlocked.characters.push(id); persist(); return true; }
  return false;
}
export function unlockLevel(n) {
  if (save.unlocked.levels < n) { save.unlocked.levels = n; persist(); }
}
export function collectRecord(level, id) {
  const list = save.records[level] || (save.records[level] = []);
  if (!list.includes(id)) { list.push(id); persist(); return true; }
  return false;
}
export function qualifies(score) {
  return score > 0 && (save.scores.length < 10 || score > save.scores[save.scores.length - 1].score);
}
export function timeQualifies(level, time) {
  const list = save.times[level] || [];
  return time > 0 && (list.length < 10 || time < list[list.length - 1].time);
}
export function addTime(level, entry) {
  const list = save.times[level] || (save.times[level] = []);
  list.push(entry);
  list.sort((a, b) => a.time - b.time);
  list.length = Math.min(list.length, 10);
  persist();
}
/** 83.456 -> "1:23.45" */
export function fmtTime(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}
export function addScore(entry) {
  save.scores.push(entry);
  save.scores.sort((a, b) => b.score - a.score);
  save.scores.length = Math.min(save.scores.length, 10);
  persist();
}
