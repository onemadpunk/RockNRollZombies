// World scoreboard, shared by everyone who plays. Stored in a free Supabase database.
// Until SCOREBOARD.url and SCOREBOARD.key are filled in (see SETUP-ONLINE.md), the game
// just uses this device's scores. The key here is Supabase's public "anon" key: it is meant
// to be in the page, and the database rules only allow reading scores and adding new ones.

export const SCOREBOARD = {
  url: 'https://vhxnkeldcjtvheroovqy.supabase.co',
  key: 'sb_publishable_7Fjur-zx9JayxhpIYIlFQA_dWKxnrnP',   // the project's publishable key (sb_publishable_...) or legacy anon key (eyJ...)
};

const TABLE = 'scores';
let cache = null, cacheAt = 0;

export const online = () => !!(SCOREBOARD.url && SCOREBOARD.key);

function headers(extra = {}) {
  const h = { apikey: SCOREBOARD.key, 'Content-Type': 'application/json', ...extra };
  // Legacy anon keys are JWTs and also go in Authorization; new publishable keys only use apikey.
  if (SCOREBOARD.key.startsWith('eyJ')) h.Authorization = `Bearer ${SCOREBOARD.key}`;
  return h;
}

async function get(q) {
  const res = await fetch(`${SCOREBOARD.url}/rest/v1/${TABLE}?${q}`, { headers: headers() });
  if (!res.ok) throw new Error('scoreboard ' + res.status);
  return res.json();
}

/**
 * board: 'score' for the high-score table, or a level number (1, 2...) for that gig's fastest clears.
 * Cached for 30 seconds. Throws if offline/unreachable.
 */
export async function worldTop(board = 'score', limit = 20, fresh = false) {
  if (!online()) throw new Error('not connected');
  const key = String(board);
  if (!fresh && cache && cache.key === key && performance.now() - cacheAt < 30000) return cache.rows;
  const cols = 'select=name,score,time_s,level,diff,hero,created_at';
  const rows = board === 'score'
    ? await get(`${cols}&kind=eq.score&order=score.desc,created_at.asc&limit=${limit}`)
    : await get(`${cols}&kind=eq.speed&level=eq.${board}&order=time_s.asc,created_at.asc&limit=${limit}`);
  cache = { key, rows };
  cacheAt = performance.now();
  return rows;
}

/** Would this make the world top 20 on that board? (False if we can't reach it.) */
export async function worldQualifies(board, value) {
  try {
    const top = await worldTop(board);
    if (top.length < 20) return value > 0;
    const last = top[top.length - 1];
    return board === 'score' ? value > last.score : value < last.time_s;
  } catch { return false; }
}

/** kind 'score' (high score) or 'speed' (a gig clear time in seconds). */
export async function submitWorld({ kind, name, score, time, level, diff, hero }) {
  if (!online()) return false;
  const res = await fetch(`${SCOREBOARD.url}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ kind, name, score: Math.round(score || 0), time_s: time ?? null, level, diff, hero }),
  });
  cache = null;
  return res.ok;
}
