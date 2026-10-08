// Boot: renderer, post-processing, per-level scenes, menus, the run between levels, and the main loop.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Music } from './audio.js';
import { Controls, KEYS_SOLO, KEYS_P1, KEYS_P2, bindTouch, onTouchMode, usingTouch, setCapture } from './input.js';
import { LEVELS, buildLevel } from './level.js';
import { Particles, Embers, popup } from './fx.js';
import { Game, WEAPONS } from './game.js';
import { MAT, HEROES, makeHero } from './models.js';
import { DIFFICULTY, ENCORE, SHOP, save, persist, unlockCharacter, unlockLevel, qualifies, addScore, timeQualifies, addTime, fmtTime } from './config.js';
import { renderComic, renderMap, renderShop } from './screens.js';
import { online, worldTop, worldQualifies, submitWorld } from './online.js';

const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
const SCREENS = ['title', 'controls', 'scores', 'comic', 'map', 'pause', 'over'];
function only(id) { for (const s of SCREENS) show(s, s === id); }

// ---- Quality ----------------------------------------------------------------------
const quality = { low: false };
try { quality.low = localStorage.getItem('rnrz-quality') === 'low'; } catch {}

// ---- Renderer -----------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);

let gpu = '';
try {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
  if (!localStorage.getItem('rnrz-quality') && /intel|basic render|swiftshader|llvmpipe|mali|adreno|powervr|apple gpu/i.test(gpu)) quality.low = true;
} catch {}

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.5, 420);
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: quality.low ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(new THREE.Scene(), camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.55, 0.8);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const music = new Music();

// ---- World (one scene per level) ----------------------------------------------------------
let scene, world, sparks, chunks, embers, hemi, key, rim, levelIndex = 0;
let game = null;
let titleHero = null;

function disposeScene(s) {
  s.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) for (const m of [].concat(o.material)) { if (m.map) m.map.dispose(); m.dispose(); }
  });
  if (s.background && s.background.dispose) s.background.dispose();
}

function makeScene(i) {
  if (game) { game = null; }
  if (scene) disposeScene(scene);
  levelIndex = i;
  scene = new THREE.Scene();
  const pal = LEVELS[i].palette;
  hemi = new THREE.HemisphereLight(pal.hemiSky, pal.hemiGround, 1.15);
  key = new THREE.DirectionalLight(pal.key, 2.1);
  key.castShadow = !quality.low;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -20, right: 20, top: 12, bottom: -6, near: 1, far: 60 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  rim = new THREE.DirectionalLight(pal.rim, 1.6);
  scene.add(hemi, key, key.target, rim, rim.target);
  world = buildLevel(i, scene, quality);
  sparks = new Particles(scene, 600, true);
  chunks = new Particles(scene, 500, false);
  embers = new Embers(scene, 200);
  embers.points.visible = !quality.low;
  renderPass.scene = scene;
  titleHero = null;
}

// ---- Settings + quality -----------------------------------------------------------------------
function applyQuality() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality.low ? 1 : 2));
  composer.setPixelRatio(Math.min(devicePixelRatio, quality.low ? 1 : 2));
  if (key) key.castShadow = !quality.low;
  bloom.strength = quality.low ? 0.7 : 0.85;
  if (embers) embers.points.visible = !quality.low;
  $('quality').textContent = 'Graphics: ' + (quality.low ? 'Low' : 'High');
  try { localStorage.setItem('rnrz-quality', quality.low ? 'low' : 'high'); } catch {}
}
function syncToggles() {
  const S = save.settings;
  $('tg-flash').textContent = $('p-flash').textContent = 'Flashing: ' + (S.flashing ? 'On' : 'Off');
  $('tg-shake').textContent = $('p-shake').textContent = 'Shake: ' + (S.shake ? 'On' : 'Off');
  $('tg-sound').textContent = 'Soundcheck: ' + (S.soundcheck ? 'On' : 'Off');
}

function resize() {
  if (!innerWidth || !innerHeight) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

// ---- UI hooks used by the game -------------------------------------------------------------
let shakeAmt = 0, lightningT = 0;
const ui = {
  beatHit() { const b = $('beatbar'); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 160); },
  banner(title, sub) {
    const el = $('banner');
    el.innerHTML = '';
    el.append(title);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
    el.hidden = false;
    clearTimeout(ui._bt);
    ui._bt = setTimeout(() => (el.hidden = true), 2400);
  },
  shake(a) { if (save.settings.shake) shakeAmt = Math.max(shakeAmt, a); },
  boss(frac) {
    show('bossbar', frac !== null);
    if (frac !== null) $('bossfill').style.width = Math.max(0, frac) * 100 + '%';
  },
  zone(name) {
    const el = $('zone');
    el.hidden = true; void el.offsetWidth;
    el.textContent = name; el.hidden = false;
    clearTimeout(ui._zt);
    ui._zt = setTimeout(() => (el.hidden = true), 2700);
  },
  hint(text) { const el = $('hint'); el.hidden = !text; if (text) el.textContent = text; },
  flash(color = '#ffffff', strength = 0.7) {
    if (!save.settings.flashing) return;
    const el = $('flash');
    el.style.transition = 'none'; el.style.background = color; el.style.opacity = strength;
    void el.offsetWidth;
    el.style.transition = 'opacity .45s ease-out'; el.style.opacity = 0;
  },
  lightning() {
    world.strike(game ? game.camX : 0);
    ui.flash('#dfe6ff', 0.55);
    lightningT = save.settings.flashing ? 0.25 : 0.05;
    setTimeout(() => music.sThunder(), 120 + Math.random() * 300);
  },
  bossIntro(name, tag) {
    show('letterbox', !!name);
    if (name) { $('bosscard').querySelector('.nm').textContent = name; $('bosscard').querySelector('.tg').textContent = tag; }
  },
  gameOver(g) { endLevel(g, false); },
  levelClear(g) { endLevel(g, true); },
};

// ---- Menus ---------------------------------------------------------------------------------
const sel = { diff: save.settings.difficulty, players: 1, char: 'punk', char2: 'drummer', level: 0 };
queueMicrotask(() => { if (challenge && challenge.kind === 'speed' && challenge.level < save.unlocked.levels) { sel.level = challenge.level; renderTitle(); } });
let run = null;
let state = 'title';
let lastBeat = -1, overAt = 0, scoreSavedFor = null;
const menuCtrl = new Controls({ keys: KEYS_SOLO, pad: 'any', touch: false });

function segButtons(el, items, current, onPick) {
  el.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.textContent = it.label;
    b.disabled = !!it.locked;
    if (it.locked) b.title = it.locked;
    b.classList.toggle('on', it.value === current);
    b.addEventListener('click', () => onPick(it.value));
    el.append(b);
  }
}

function renderTitle() {
  const D = DIFFICULTY;
  segButtons($('opt-diff'), Object.keys(D).map((k) => ({ label: D[k].name, value: k })), sel.diff, (v) => {
    sel.diff = v; save.settings.difficulty = v; persist(); renderTitle();
  });
  $('diff-blurb').textContent = D[sel.diff].blurb;
  for (const b of $('opt-players').children) b.classList.toggle('on', +b.dataset.v === sel.players);
  $('players-blurb').textContent = sel.players === 1 ? 'Keyboard, controller or touch.' : 'Two keyboards halves or two controllers. Shared lives.';
  const unlocked = save.unlocked.characters;
  const chars = Object.keys(HEROES).map((k) => ({ label: HEROES[k].name.replace('The ', ''), value: k, locked: unlocked.includes(k) ? null : 'Rescue them to unlock' }));
  segButtons($('opt-char'), chars, sel.char, (v) => { sel.char = v; renderTitle(); placeTitleHero(); });
  $('char-label').textContent = sel.players === 2 ? 'Player 1' : 'Character';
  $('char-blurb').textContent = HEROES[sel.char].blurb + (unlocked.length < 3 ? '  Rescue your bandmates to play as them.' : '');
  show('opt-char2-wrap', sel.players === 2);
  const chars2 = Object.keys(HEROES).map((k) => ({ label: HEROES[k].name.replace('The ', ''), value: k, locked: unlocked.includes(k) || k === 'drummer' ? null : 'Rescue them to unlock' }));
  segButtons($('opt-char2'), chars2, sel.char2, (v) => { sel.char2 = v; renderTitle(); });
  const levels = LEVELS.map((L, i) => ({ label: `${i + 1}. ${L.short}`, value: i, locked: i < save.unlocked.levels ? null : 'Beat the previous gig first' }));
  segButtons($('opt-level'), levels, sel.level, (v) => { sel.level = v; renderTitle(); });
  const recs = (save.records[sel.level] || []).length;
  $('level-blurb').textContent = `${LEVELS[sel.level].name}  ·  Platinum records ${recs}/3`;
  syncToggles();
}
for (const b of $('opt-players').children) b.addEventListener('click', () => { sel.players = +b.dataset.v; renderTitle(); });
$('tg-flash').addEventListener('click', () => { save.settings.flashing = !save.settings.flashing; persist(); syncToggles(); });
$('p-flash').addEventListener('click', () => { save.settings.flashing = !save.settings.flashing; persist(); syncToggles(); });
$('tg-shake').addEventListener('click', () => { save.settings.shake = !save.settings.shake; persist(); syncToggles(); });
$('p-shake').addEventListener('click', () => { save.settings.shake = !save.settings.shake; persist(); syncToggles(); });
$('tg-sound').addEventListener('click', () => { save.settings.soundcheck = !save.settings.soundcheck; persist(); syncToggles(); });
$('btn-controls').addEventListener('click', () => { only('controls'); state = 'menu'; $('controls').querySelector('.back').focus(); });
$('btn-scores').addEventListener('click', () => openScores());
function openScores(attract = false) {
  scoreSrc = online() ? 'world' : 'local';
  renderScores();
  only('scores');
  state = attract ? 'attract' : 'menu';
  if (!attract) $('scores').querySelector('.back').focus();
}
for (const b of $('score-tabs').children) b.addEventListener('click', () => { scoreSrc = b.dataset.t; renderScores(); });
for (const b of document.querySelectorAll('.back')) b.addEventListener('click', toTitle);

// ---- Scoreboards: high score + fastest clear per gig, world or this device ----------------
let scoreSrc = 'world', board = 'score';
let lastSaved = null;   // highlight your own entry
function boardTabs() {
  const el = $('board-tabs');
  const items = [{ v: 'score', label: 'High score' }, ...LEVELS.map((L, i) => ({ v: i + 1, label: `Fastest: ${L.short}` }))];
  el.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.textContent = it.label;
    b.classList.toggle('on', it.v === board);
    b.addEventListener('click', () => { board = it.v; renderScores(); });
    el.append(b);
  }
}
function fillScores(rows) {
  const list = $('score-list');
  list.innerHTML = rows.length ? '' : `<li class="empty">${board === 'score' ? 'No scores yet. Go set one!' : 'No clears yet. Be the first!'}</li>`;
  for (const s of rows) {
    const li = document.createElement('li');
    li.textContent = s.name;
    const sm = document.createElement('small');
    sm.textContent = [DIFFICULTY[s.diff]?.name, board === 'score' ? `gig ${s.level}` : null, s.hero].filter(Boolean).join(' · ');
    const sp = document.createElement('span');
    const t = s.time ?? s.time_s;
    sp.textContent = board === 'score' ? s.score.toLocaleString() : fmtTime(t);
    li.append(sm, sp);
    if (lastSaved && s.name === lastSaved.name && (board === 'score' ? s.score === lastSaved.score : Math.abs(t - lastSaved.time) < 0.005)) li.classList.add('me');
    list.append(li);
  }
}
const localRows = () => (board === 'score' ? save.scores : save.times[board - 1] || []);
async function renderScores() {
  boardTabs();
  for (const b of $('score-tabs').children) b.classList.toggle('on', b.dataset.t === scoreSrc);
  const what = board === 'score' ? 'scores' : 'clear times';
  if (scoreSrc === 'local') { $('score-note').textContent = `Best ${what} on this device.`; fillScores(localRows()); return; }
  if (!online()) { $('score-note').textContent = 'The world scoreboard is not connected yet. Showing this device.'; fillScores(localRows()); return; }
  $('score-note').textContent = 'Loading the world scoreboard…';
  try { fillScores(await worldTop(board, 20, true)); $('score-note').textContent = `Top 20 ${what} from everyone who plays.`; }
  catch { $('score-note').textContent = "Couldn't reach the world scoreboard. Showing this device."; fillScores(localRows()); }
}

// ---- Arcade initials: up/down change a letter, left/right move, Enter saves ---------------
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
const initials = { letters: ['A', 'A', 'A'], cur: 0 };
try { const last = localStorage.getItem('rnrz-initials'); if (last && last.length === 3) initials.letters = last.split(''); } catch {}
function drawInitials() {
  for (const slot of $('initials').children) {
    const i = +slot.dataset.i;
    slot.querySelector('span').textContent = initials.letters[i] === ' ' ? '_' : initials.letters[i];
    slot.classList.toggle('cur', i === initials.cur);
  }
}
function bumpLetter(i, d) {
  const k = ABC.indexOf(initials.letters[i]);
  initials.letters[i] = ABC[(k + d + ABC.length) % ABC.length];
  initials.cur = i; drawInitials(); music.sJump?.();
}
for (const slot of $('initials').children) {
  const i = +slot.dataset.i;
  slot.querySelector('.up').addEventListener('click', () => bumpLetter(i, 1));
  slot.querySelector('.dn').addEventListener('click', () => bumpLetter(i, -1));
  slot.querySelector('span').addEventListener('click', () => { initials.cur = i; drawInitials(); $('initials').focus(); });
}
$('initials').addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === 'ArrowUp') bumpLetter(initials.cur, 1);
  else if (k === 'ArrowDown') bumpLetter(initials.cur, -1);
  else if (k === 'ArrowLeft') { initials.cur = Math.max(0, initials.cur - 1); drawInitials(); }
  else if (k === 'ArrowRight') { initials.cur = Math.min(2, initials.cur + 1); drawInitials(); }
  else if (k === 'Enter') $('hs').requestSubmit();
  else if (k.length === 1 && ABC.includes(k.toUpperCase())) { initials.letters[initials.cur] = k.toUpperCase(); initials.cur = Math.min(2, initials.cur + 1); drawInitials(); }
  else return;
  e.preventDefault();
});
const myName = () => initials.letters.join('').trimEnd() || 'AAA';

// ---- Share + challenge links (?challenge=ABC-12345 for score, ?race=ABC-1-8345 for a gig time in 1/100s) --
const challenge = (() => {
  try {
    const q = new URLSearchParams(location.search);
    const c = q.get('challenge'), r = q.get('race');
    let m;
    if (c && (m = /^([A-Z0-9_]{1,3})-(\d{1,9})$/i.exec(c))) return { kind: 'score', name: m[1].toUpperCase().replace(/_/g, ' '), score: +m[2] };
    if (r && (m = /^([A-Z0-9_]{1,3})-(\d{1,2})-(\d{1,8})$/i.exec(r)) && LEVELS[+m[2] - 1]) return { kind: 'speed', name: m[1].toUpperCase().replace(/_/g, ' '), level: +m[2] - 1, time: +m[3] / 100 };
  } catch {}
  return null;
})();
function showChallenge() {
  const el = $('challenge');
  if (!challenge) { el.hidden = true; return; }
  el.textContent = challenge.kind === 'score'
    ? `${challenge.name} challenges you to beat ${challenge.score.toLocaleString()} points!`
    : `${challenge.name} challenges you to clear ${LEVELS[challenge.level].name} faster than ${fmtTime(challenge.time)}!`;
  el.hidden = false;
}
let shareInfo = null;   // set at the end of a gig
function shareLink() {
  const base = location.protocol.startsWith('http') ? location.origin + location.pathname : 'https://rocknrollzombies.com/';
  const who = myName().replace(/ /g, '_');
  return shareInfo.kind === 'speed'
    ? `${base}?race=${who}-${shareInfo.level + 1}-${Math.round(shareInfo.time * 100)}`
    : `${base}?challenge=${who}-${shareInfo.score}`;
}
async function shareScore() {
  if (!shareInfo) return;
  const L = LEVELS[shareInfo.level];
  const text = shareInfo.kind === 'speed'
    ? `I cleared ${L.name} in ${fmtTime(shareInfo.time)} in Rock 'n' Roll Zombies. Can you go faster?`
    : `I scored ${shareInfo.score.toLocaleString()} in Rock 'n' Roll Zombies. Bet you can't beat it!`;
  const url = shareLink();
  try {
    if (navigator.share) { await navigator.share({ title: "Rock 'n' Roll Zombies", text, url }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    $('share').textContent = 'Copied! Paste it to a friend';
  } catch {
    $('share-text').hidden = false;
    $('share-text').value = `${text} ${url}`;
    $('share-text').select();
    $('share').textContent = 'Copy the message below';
  }
}
$('share').addEventListener('click', shareScore);

function placeTitleHero() {
  if (titleHero) scene.remove(titleHero.root);
  titleHero = makeHero(sel.char);
  titleHero.root.position.set(3, 0, 0);
  titleHero.root.rotation.y = 0.5;
  scene.add(titleHero.root);
}

function toTitle() {
  const dirty = !!game || levelIndex !== 0;
  if (game) game.dispose();
  game = null;
  if (dirty) makeScene(0);
  placeTitleHero();
  only('title');
  show('hud', false); show('touch', false); show('letterbox', false); ui.hint(null);
  state = 'title';
  music.musicVolume?.(0.5);
  renderTitle();
  showChallenge();
  idleAt = performance.now();
  $('start').focus();
}

// ---- Run flow: comic -> level -> clear -> comic -> map/shop -> next level ---------------------------
function newRun(level) {
  const diff = { ...DIFFICULTY[sel.diff] };
  run = { diffKey: sel.diff, diff, encore: false, score: 0, lives: diff.lives, cash: 0, upgrades: { spikes: false, amp: false, flame: false }, level, startScore: 0 };
  scoreSavedFor = null;
}

// Full screen (and landscape on phones). Must be called from a tap/click.
function goFullscreen(on = true) {
  const el = document.documentElement;
  try {
    if (on && !document.fullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      const p = req && req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
        .catch(() => ui.banner('Full screen blocked', 'Tip: browser menu > Add to Home screen'));
    } else if (!on && document.fullscreenElement) document.exitFullscreen?.();
  } catch {}
}
const toggleFull = () => goFullscreen(!document.fullscreenElement);
function syncFull() {
  const label = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  $('tg-full').textContent = label; $('p-full').textContent = label;
}
document.addEventListener('fullscreenchange', syncFull);
$('tg-full').addEventListener('click', toggleFull);
$('p-full').addEventListener('click', toggleFull);
// Installed as an app it's already full screen; in a browser, hide the button if the device can't do it.
if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) { $('tg-full').hidden = true; $('p-full').hidden = true; }

function startFromTitle() {
  if (state !== 'title') return;
  if (usingTouch() || matchMedia('(pointer: coarse)').matches) goFullscreen(true);
  if (!music.ctx) music.start(); else music.resume();
  newRun(sel.level);
  if (sel.level === 0) showComic('intro', () => loadLevel(0));
  else loadLevel(sel.level);
}

function showComic(key, then) {
  state = 'comic';
  renderComic($('panels'), key);
  only('comic');
  show('hud', false); show('touch', false);
  music.musicVolume(0.35);
  comicThen = then;
  $('comic-next').focus();
}
let comicThen = null;
$('comic-next').addEventListener('click', () => { const f = comicThen; comicThen = null; f && f(); });

function playerConfigs() {
  if (sel.players === 1) return [{ char: sel.char, controls: new Controls({ keys: KEYS_SOLO, pad: 'any', touch: true }) }];
  return [
    { char: sel.char, controls: new Controls({ keys: KEYS_P1, pad: 0, touch: true }) },
    { char: sel.char2, controls: new Controls({ keys: KEYS_P2, pad: 1, touch: false }) },
  ];
}

function loadLevel(i) {
  run.level = i;
  run.startScore = run.score;
  makeScene(i);
  game = new Game({ world, scene, camera, music, ui, sparks, chunks, run, players: playerConfigs() });
  window.rnrz.game = game;
  only(null);
  show('hud', true); show('hud-p2', game.coop);
  $('bossname').textContent = LEVELS[i].bossName.toUpperCase();
  ui.boss(null);
  state = 'play';
  music.musicVolume(1);
  music.setSong(LEVELS[i].zones[0].song);
  lastBeat = Math.floor(music.beatFloat());
  showTouch();
  ui.banner(LEVELS[i].name, run.encore ? 'ENCORE!' : `Rescue the ${LEVELS[i].rescue}`);
  camDist = 13.5;
}

function endLevel(g, clear) {
  state = 'over'; overAt = performance.now();
  show('hud', false); show('touch', false); ui.hint(null); show('letterbox', false);
  const r = g.rank(), s = g.stats, L = LEVELS[run.level];
  const mins = Math.floor(s.time / 60), secs = String(Math.floor(s.time % 60)).padStart(2, '0');
  const last = run.level >= LEVELS.length - 1;
  $('over-title').textContent = clear ? 'Gig cleared!' : 'Game Over';
  $('over-text').textContent = clear ? `${L.name} · Score ${run.score.toLocaleString()}` : `Score ${run.score.toLocaleString()}`;
  show('rank', true);
  $('grade').textContent = clear ? r.grade : '–';
  const rows = [
    ['Time', fmtTime(s.time)], ['Zombies down', s.kills], ['On the beat', `${Math.round(r.beatPct * 100)}%`],
    ['Best combo', g.bestCombo], ['Deaths', s.deaths], ['Platinum records', `${g.recordsFound.length}/3 (${(save.records[L.id] || []).length}/3 total)`],
    ['Cash', `$${run.cash}`],
  ];
  $('stats').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  // Unlocks
  let unlockText = '';
  if (clear) {
    music.sClear();
    if (unlockCharacter(L.rescue)) unlockText = `New character: ${HEROES[L.rescue].name}!`;
    unlockLevel(run.level + 2);
  } else music.sOver();
  $('unlock').textContent = unlockText;
  show('unlock', !!unlockText);
  // What can go on a board: a clear time for this gig (speed run), and the score at the end of a run.
  const final = !clear || last;
  const time = s.time;
  pending = { score: final && scoreSavedFor !== run, speed: clear && !run.encore, time, level: run.level };
  shareInfo = clear ? { kind: 'speed', level: run.level, time, score: run.score } : { kind: 'score', level: run.level, score: run.score };
  $('share').textContent = clear ? 'Challenge a friend (time)' : 'Challenge a friend (score)';
  show('share-text', false);
  show('hs', false);
  offerSave(time);
  $('over-next').textContent = clear ? (last ? 'Continue' : 'Next gig') : 'Continue (score resets)';
  show('over-encore', clear && run.diffKey === 'hard' && !run.encore);
  show('over-again', clear);
  $('over-again').textContent = 'Replay gig';
  only('over');
  setTimeout(() => (!$('hs').hidden ? $('initials') : $('over-next')).focus(), 50);
  endLevel.clear = clear;
}

let pending = null;
/** Decide whether to show the initials entry, and say what it will be saved to. */
async function offerSave(time) {
  const P = pending, lvl = P.level;
  const localScore = P.score && qualifies(run.score);
  const localSpeed = P.speed && timeQualifies(lvl, time);
  const [worldScore, worldSpeed] = await Promise.all([
    P.score ? worldQualifies('score', run.score) : false,
    P.speed ? worldQualifies(lvl + 1, time) : false,
  ]);
  P.flags = { localScore, localSpeed, worldScore, worldSpeed };
  if (state !== 'over' || P !== pending || !(localScore || localSpeed || worldScore || worldSpeed)) return;
  const bits = [];
  if (localSpeed || worldSpeed) bits.push(`clear time ${fmtTime(time)}`);
  if (localScore || worldScore) bits.push(`score ${run.score.toLocaleString()}`);
  $('hs-title').textContent = (worldScore || worldSpeed ? 'World top 20! ' : 'New best! ') + 'Enter your initials';
  $('hs-where').textContent = `Saving your ${bits.join(' and ')}${online() ? ' to this device and the world scoreboard' : ' to this device'}.`;
  drawInitials();
  show('hs', true);
  $('initials').focus();
}

$('hs').addEventListener('submit', (e) => {
  e.preventDefault();
  const P = pending;
  if (!P || !P.flags) return;
  const name = myName();
  try { localStorage.setItem('rnrz-initials', initials.letters.join('')); } catch {}
  const hero = HEROES[sel.char].name.replace('The ', '');
  const base = { name, level: P.level + 1, diff: run.diffKey, hero };
  const F = P.flags;
  if (F.localScore) addScore({ ...base, score: run.score, date: Date.now() });
  if (F.localSpeed) addTime(P.level, { ...base, time: P.time });
  lastSaved = { name, score: run.score, time: P.time };
  if (P.score) scoreSavedFor = run;
  show('hs', false);
  music.sTill();
  const sends = [];
  if (F.worldScore) sends.push(submitWorld({ ...base, kind: 'score', score: run.score }));
  if (F.worldSpeed) sends.push(submitWorld({ ...base, kind: 'speed', score: run.score, time: Math.round(P.time * 100) / 100 }));
  if (sends.length) Promise.all(sends).then((r) => ui.banner(r.every(Boolean) ? 'On the world scoreboard!' : "Couldn't reach the scoreboard", ''));
  $('over-next').focus();
});

$('over-next').addEventListener('click', () => {
  if (endLevel.clear) {
    const next = run.level + 1;
    const comicKey = 'after' + run.level;
    if (next < LEVELS.length) showComic(comicKey, () => showMap(next));
    else showComic(comicKey, toTitle);
  } else {
    // Continue after a game over: back to the start of this gig, score wiped
    run.score = 0; run.lives = run.diff.lives;
    loadLevel(run.level);
  }
});
$('over-again').addEventListener('click', () => { run.score = run.startScore; loadLevel(run.level); });
$('over-encore').addEventListener('click', () => {
  run.encore = true;
  run.diff = { ...run.diff, enemySpeed: run.diff.enemySpeed * ENCORE.enemySpeed, spawnMax: run.diff.spawnMax + ENCORE.spawnMax };
  loadLevel(run.level);
});
$('over-title-btn').addEventListener('click', toTitle);

function showMap(next) {
  state = 'map';
  renderMap($('mapsvg'), next, save.unlocked.levels);
  const draw = () => renderShop($('shop'), run, (id) => {
    const it = SHOP.find((s) => s.id === id);
    if (!it || run.cash < it.price) return;
    run.cash -= it.price;
    if (id === 'life') run.lives++;
    else run.upgrades[id] = true;
    music.sTill();
    draw();
  });
  draw();
  only('map');
  mapNext = next;
  $('map-go').focus();
}
let mapNext = 1;
$('map-go').addEventListener('click', () => loadLevel(mapNext));

function pause() {
  state = 'paused'; music.suspend(); only('pause'); showTouch();
  const touch = usingTouch();
  const rows = touch
    ? [['Move', 'thumb down on the left, drag left / right'], ['Jump', 'JUMP'], ['Throw', 'THROW, tap on the beat'],
       ['Climb', 'drag up / down at a ladder'], ['Crouch', 'drag down'], ['Drop off a ledge', 'drag down + JUMP'],
       ['Solo', 'SOLO when the meter is full'], ['Tip', 'slide your thumb between THROW and JUMP']]
    : [['Move', 'Arrows / A D'], ['Jump', 'Space / Z'], ['Throw', 'X / J, on the beat'], ['Climb', 'Up / Down at a ladder'],
       ['Crouch', 'Down / S'], ['Drop off a ledge', 'Down + Jump'], ['Solo', 'C / L'], ['Pad', 'A jump, X throw, Y solo, Start pause']];
  $('pause-help').innerHTML = rows.map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('');
  $('resume').focus();
}
function resume() { state = 'play'; music.resume(); only(null); showTouch(); }
$('pause-btn').addEventListener('click', () => { if (state === 'play') pause(); else if (state === 'paused') resume(); });
$('resume').addEventListener('click', resume);
$('quit').addEventListener('click', () => { music.resume(); toTitle(); });
$('quality').addEventListener('click', () => { quality.low = !quality.low; applyQuality(); });
$('start').addEventListener('click', startFromTitle);
addEventListener('keydown', (e) => {
  if (state === 'title' && e.code === 'Enter' && document.activeElement === document.body) startFromTitle();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(); });

function showTouch() { show('touch', usingTouch() && state === 'play'); }
onTouchMode(showTouch);
bindTouch($('touch'));

// Arcade attract mode: leave the title alone and it shows the scoreboards, cycling through them.
let idleAt = performance.now(), attractAt = 0;
for (const ev of ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart']) addEventListener(ev, () => {
  idleAt = performance.now();
  if (state === 'attract') toTitle();
}, { passive: true });
function attract() {
  const now = performance.now();
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  if (pads.some((p) => p.buttons.some((b) => b.pressed))) { idleAt = now; if (state === 'attract') toTitle(); }
  if (state === 'title' && now - idleAt > 25000) { board = 'score'; openScores(true); attractAt = now; }
  else if (state === 'attract' && now - attractAt > 8000) {
    attractAt = now;
    const boards = ['score', ...LEVELS.map((_, i) => i + 1)];
    board = boards[(boards.indexOf(board) + 1) % boards.length];
    if (board === 'score' && now - idleAt > 60000) { toTitle(); return; }
    renderScores();
  }
}

// Gamepad navigation for menus: D-pad/stick moves focus, A presses.
const padPrev = {};
function navPads() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p) continue;
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const now = { next: b(13) || b(15) || ay > 0.6 || ax > 0.6, prev: b(12) || b(14) || ay < -0.6 || ax < -0.6, ok: b(0) || b(9) };
    const was = padPrev[p.index] || {};
    padPrev[p.index] = now;
    if (document.activeElement === $('initials')) {
      const pw = padPrev['i' + p.index] || {};
      const pn = { up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6, ok: b(0) || b(9) };
      padPrev['i' + p.index] = pn;
      if (pn.up && !pw.up) bumpLetter(initials.cur, 1);
      if (pn.down && !pw.down) bumpLetter(initials.cur, -1);
      if (pn.left && !pw.left) { initials.cur = Math.max(0, initials.cur - 1); drawInitials(); }
      if (pn.right && !pw.right) { initials.cur = Math.min(2, initials.cur + 1); drawInitials(); }
      if (pn.ok && !pw.ok) $('hs').requestSubmit();
      continue;
    }
    const screen = SCREENS.map((s) => $(s)).find((el) => !el.hidden);
    if (!screen) continue;
    const items = [...screen.querySelectorAll('button:not(:disabled), input')].filter((el) => el.offsetParent !== null);
    const i = items.indexOf(document.activeElement);
    if (now.next && !was.next) items[(i + 1) % items.length]?.focus();
    if (now.prev && !was.prev) items[(i - 1 + items.length) % items.length]?.focus();
    if (now.ok && !was.ok && document.activeElement && document.activeElement.click) document.activeElement.click();
  }
}

// ---- Errors -------------------------------------------------------------------------------------
let crashed = false;
function showError(err) {
  console.error(err);
  music.suspend();
  const el = $('error');
  el.querySelector('pre').textContent = String(err && err.stack || err).split('\n').slice(0, 4).join('\n') + '\nGPU: ' + gpu;
  el.hidden = false;
}
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  try { localStorage.setItem('rnrz-quality', 'low'); } catch {}
  crashed = true;
  music.suspend();
  const el = $('error');
  el.querySelector('h2').textContent = 'Graphics overload';
  el.querySelector('p').textContent = 'Your graphics chip ran out of memory. Graphics are now set to Low. Press Reload to carry on.';
  el.querySelector('pre').textContent = '';
  el.hidden = false;
});
$('reload').addEventListener('click', () => location.reload());

// ---- Loop -----------------------------------------------------------------------------------------
const clock = new THREE.Clock();
let t = 0;
let camDist = 13.5;
let camLift = 0;   // camera rises when players climb high
let perfT = 0, perfN = 0, perfChecked = false;
const camLook = new THREE.Vector3();

window.rnrz = { game, music, camera, quality, gpu, loadLevel: (i) => { newRun(i); loadLevel(i); }, get run() { return run; } };
window.rnrz.tick = (d) => tick(d);

function frame() {
  if (crashed) return;
  requestAnimationFrame(frame);
  try { tick(clock.getDelta()); } catch (err) { crashed = true; showError(err); }
}

function tick(raw) {
  if (!innerWidth || !innerHeight) return;
  if (renderer.domElement.width === 0 || Math.abs(camera.aspect - innerWidth / innerHeight) > 0.001) resize();
  const dt = Math.min(raw, 1 / 20);
  t += dt;
  music.update();
  menuCtrl.update();
  setCapture(state === 'play');
  const pb = $('pause-btn'), wantPb = state === 'play';
  if (pb.hidden === wantPb) pb.hidden = !wantPb;
  const frac = music.ctx ? ((music.beatFloat() % 1) + 1) % 1 : 0;
  const pulse = music.ctx && state === 'play' ? Math.exp(-frac * 5) : 0;

  if (state === 'play' && game) {
    for (const p of game.players) p.ctrl.update();
    if (menuCtrl.pressed.pause || game.players.some((p) => p.ctrl.pressed.pause)) pause();
    else {
      const bi = Math.floor(music.beatFloat());
      if (bi > lastBeat) { lastBeat = bi; game.onBeat(bi); }
      const steps = Math.ceil(dt / (1 / 60));
      for (let i = 0; i < steps; i++) if (state === 'play') game.update(dt / steps, t, { pulse, frac });
    }
    if (!perfChecked && !quality.low) {
      perfT += raw; perfN++;
      if (perfN === 180) {
        perfChecked = true;
        if (perfT / perfN > 1 / 38) {
          quality.low = true; applyQuality();
          const p = game.players[0];
          popup('Graphics set to Low for smoother play', 'info', { x: p.x, y: p.y + 3 }, camera);
        }
      }
    }
  } else {
    if (state === 'paused' && menuCtrl.pressed.pause) resume();
    navPads();
    attract();
  }

  // Camera
  const camX = game ? game.camX : 7;
  const wantDist = game && game.lock ? 17.5 : 13.5;
  camDist += (wantDist - camDist) * Math.min(1, dt * 2);
  const halfH = camDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  if (game) game.halfW = halfH * camera.aspect;
  shakeAmt = Math.max(0, shakeAmt - dt * 1.8);
  const sx = (Math.random() - 0.5) * shakeAmt * 0.6, sy = (Math.random() - 0.5) * shakeAmt * 0.6;
  const zoomOut = camDist - 13.5;
  // Rise with the player on high ledges (in co-op, follow the pair's average so nobody drops off the bottom).
  const live = game ? game.players.filter((p) => !p.dead && !p.out) : [];
  const height = !live.length ? 0 : live.length === 1 ? live[0].y : live.reduce((a, p) => a + p.y, 0) / live.length;
  camLift += (Math.max(0, height - 1.2) * 0.9 - camLift) * Math.min(1, dt * 4);
  const touchLift = usingTouch() ? -1.1 : 0;   // touch: show the action higher, above the thumb buttons
  let px = camX + sx, py = 3.8 + zoomOut * 0.3 + sy + camLift + touchLift, pz = camDist;
  camLook.set(camX + sx * 0.5, 3.0 + zoomOut * 0.25 + camLift + touchLift, 0);
  if (game && game.cine) {
    // Boss intro: swing in close on the boss, then back out
    const c = game.cine, k = Math.sin(Math.min(1, c.t / c.dur) * Math.PI);
    px += (c.x - 2.5 - px) * k; py += (c.y - py) * k; pz += (8.5 - pz) * k;
    camLook.lerp(new THREE.Vector3(c.x, c.y - 0.4, 0), k);
  }
  if (state === 'title' && titleHero) {
    titleHero.head.rotation.x = Math.max(0, Math.sin(t * 5.3)) * 0.3;
    titleHero.root.rotation.y = 0.5 + Math.sin(t * 0.5) * 0.15;
  }
  camera.position.set(px, py, pz);
  camera.lookAt(camLook);
  const dbg = window.rnrz.cam;
  if (dbg) { camera.position.set(...dbg.pos); camera.lookAt(...dbg.at); }

  key.position.set(camX - 7, 13, 10); key.target.position.set(camX, 0, 0);
  rim.position.set(camX + 6, 9, -14); rim.target.position.set(camX, 1, 0);

  const storm = world.stormAt(camX);
  world.update(t, dt, camera.position, pulse, storm);
  lightningT = Math.max(0, lightningT - dt);
  hemi.intensity = 1.15 - storm * 0.35 + lightningT * 10;
  MAT.zEye.emissiveIntensity = 2.2 + pulse * 4;   // every zombie's eyes flash on the beat
  sparks.update(dt);
  chunks.update(dt);
  embers.update(dt, t, camX);

  if (game && (state === 'play' || state === 'paused')) updateHud(frac);
  composer.render();
}

const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHud(frac) {
  const p = game.players[0];
  setText('score', run.score.toLocaleString());
  setText('timer', fmtTime(game.stats.time));
  setText('lives', String(run.lives));
  setText('cash', '$' + run.cash);
  setText('weapon', WEAPONS[p.weapon].name);
  setText('combo', String(p.combo));
  const armor = p.armor;
  if (hudCache.armor !== armor) {
    hudCache.armor = armor;
    const a = $('armor');
    a.textContent = armor === 2 ? 'SPIKED JACKET' : armor === 1 ? 'JACKET ON' : 'NO JACKET!';
    a.className = 'armor ' + (armor ? 'on' : 'off');
  }
  if (game.coop) {
    const q = game.players[1];
    setText('hud-p2', `P2 ${HEROES[q.char].name.replace('The ', '').toUpperCase()} · ${q.out ? 'OUT' : q.dead ? 'DOWN' : q.armor ? 'JACKET' : 'NO JACKET'} · ${WEAPONS[q.weapon].name} · SOLO ${Math.round(q.solo)}%`);
  }
  $('solofill').style.width = p.solo + '%';
  if (hudCache.solo !== (p.solo >= 100)) { hudCache.solo = p.solo >= 100; $('solo').classList.toggle('ready', hudCache.solo); }
  for (const el of $('band').children) el.classList.toggle('on', !!music.layerOn[el.dataset.layer]);
  const d = (1 - frac) * 45;
  const mk = $('beatbar').querySelectorAll('.mk');
  mk[0].style.left = `calc(${50 - d}% - 3px)`;
  mk[1].style.left = `calc(${50 + d}% - 3px)`;
}

// Always-fresh files + offline copy (only on the real website, not when opened from a file)
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
// Show which version is loaded, so it's easy to tell whether a phone has the latest
try {
  const d = new Date(document.lastModified);
  if (!isNaN(d)) $('ver').textContent = 'Updated ' + d.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
} catch {}

// ---- Boot ---------------------------------------------------------------------------------------------
makeScene(0);
applyQuality();
toTitle();
show('loading', false);
frame();
