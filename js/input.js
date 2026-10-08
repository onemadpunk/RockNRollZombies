// Keyboard, gamepads and touch. One shared keyboard listener; each player gets a Controls object
// with its own key map and gamepad, so two people can play on one keyboard or two pads.
// `held` = currently down; `pressed` = went down this frame.

const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'throw', 'special', 'pause', 'start'];

const down = new Set();
let touchMode = false;
const touchHeld = new Set();
const listeners = [];

let capture = false;
/** While playing, game keys shouldn't scroll the page or press focused buttons. */
export const setCapture = (v) => { capture = v; };
addEventListener('keydown', (e) => {
  down.add(e.code);
  if (capture && ALL_CODES.has(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => down.delete(e.code));
addEventListener('blur', () => { down.clear(); touchHeld.clear(); });
addEventListener('touchstart', () => {
  if (!touchMode) { touchMode = true; listeners.forEach((f) => f()); }
}, { passive: true });

export const onTouchMode = (f) => listeners.push(f);
export const usingTouch = () => touchMode;

/**
 * Touch controls, wired once.
 * Left side: a floating joystick. Put your thumb down anywhere there and drag to move;
 *   no small buttons to hit and no lifting your thumb to change direction.
 * Right side: action buttons you can slide between (whatever button is under a finger is held).
 */
export function bindTouch(container) {
  const stickKeys = new Set();
  const fingers = new Map();          // pointerId -> action key under that finger (action buttons)
  const rebuild = () => {
    touchHeld.clear();
    for (const k of stickKeys) touchHeld.add(k);
    for (const k of fingers.values()) if (k) touchHeld.add(k);
    for (const b of container.querySelectorAll('.pad-r button[data-k]')) b.classList.toggle('down', [...fingers.values()].includes(b.dataset.k));
  };

  // ---- joystick ----
  const zone = container.querySelector('#stick');
  const base = zone.querySelector('.base'), knob = zone.querySelector('.knob');
  let stick = null;   // { id, x, y }
  const R = () => Math.max(34, base.offsetWidth * 0.42);   // sensitivity matches the circle's size
  const homeBase = () => { base.style.left = ''; base.style.top = ''; base.classList.remove('active'); knob.style.transform = ''; };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (stick) return;
    try { zone.setPointerCapture(e.pointerId); } catch {}
    const r = zone.getBoundingClientRect();
    stick = { id: e.pointerId, x: e.clientX, y: e.clientY };
    base.style.left = e.clientX - r.left + 'px'; base.style.top = e.clientY - r.top + 'px';
    base.classList.add('active');
  });
  zone.addEventListener('pointermove', (e) => {
    if (!stick || e.pointerId !== stick.id) return;
    e.preventDefault();
    let dx = e.clientX - stick.x, dy = e.clientY - stick.y;
    const rad = R(), d = Math.hypot(dx, dy);
    // follow the thumb if it drifts far, so you never run out of stick
    if (d > rad * 1.6) { const k = (d - rad * 1.6) / d; stick.x += dx * k; stick.y += dy * k; dx -= dx * k; dy -= dy * k;
      const r = zone.getBoundingClientRect(); base.style.left = stick.x - r.left + 'px'; base.style.top = stick.y - r.top + 'px'; }
    const kx = Math.max(-1, Math.min(1, dx / rad)), ky = Math.max(-1, Math.min(1, dy / rad));
    knob.style.transform = `translate(${kx * rad * 0.6}px, ${ky * rad * 0.6}px)`;
    stickKeys.clear();
    if (dx < -rad * 0.25) stickKeys.add('left');
    if (dx > rad * 0.25) stickKeys.add('right');
    if (dy < -rad * 0.6 && Math.abs(dy) > Math.abs(dx) * 0.8) stickKeys.add('up');      // climb
    if (dy > rad * 0.6 && Math.abs(dy) > Math.abs(dx) * 0.8) stickKeys.add('down');     // crouch / climb down
    rebuild();
  });
  const endStick = (e) => { if (!stick || e.pointerId !== stick.id) return; stick = null; stickKeys.clear(); homeBase(); rebuild(); };
  zone.addEventListener('pointerup', endStick);
  zone.addEventListener('pointercancel', endStick);
  zone.addEventListener('lostpointercapture', endStick);

  // ---- action buttons (slide between them) ----
  const pad = container.querySelector('.pad-r');
  const keyAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('.pad-r button[data-k]')?.dataset.k || null;
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch {} fingers.set(e.pointerId, keyAt(e.clientX, e.clientY)); rebuild(); });
  pad.addEventListener('pointermove', (e) => {
    if (!fingers.has(e.pointerId)) return;
    const k = keyAt(e.clientX, e.clientY);
    if (k !== fingers.get(e.pointerId)) { fingers.set(e.pointerId, k); rebuild(); }
  });
  const lift = (e) => { if (fingers.delete(e.pointerId)) rebuild(); };
  pad.addEventListener('pointerup', lift);
  pad.addEventListener('pointercancel', lift);
  pad.addEventListener('lostpointercapture', lift);
  container.addEventListener('contextmenu', (e) => e.preventDefault());
}

export const KEYS_SOLO = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], down: ['ArrowDown', 'KeyS'],
  up: ['ArrowUp', 'KeyW'],   // climbs ladders; still jumps when there's no ladder (see game.js)
  jump: ['Space', 'KeyZ', 'KeyW', 'ArrowUp'], throw: ['KeyX', 'KeyJ', 'KeyK'],
  special: ['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight'], pause: ['Escape', 'KeyP'], start: ['Enter'],
};
export const KEYS_P1 = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], jump: ['KeyW', 'Space'], throw: ['KeyF'], special: ['KeyG'],
  pause: ['Escape', 'KeyP'], start: ['Enter'],
};
export const KEYS_P2 = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], jump: ['ArrowUp'],
  throw: ['KeyK', 'Numpad0'], special: ['KeyL', 'Numpad1'], pause: [], start: [],
};
const ALL_CODES = new Set(Object.values({ ...KEYS_SOLO }).flat().concat(Object.values(KEYS_P1).flat(), Object.values(KEYS_P2).flat()));

function readPad(p, out) {
  if (!p) return;
  const b = (i) => p.buttons[i] && p.buttons[i].pressed;
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
  if (ax < -0.4 || b(14)) out.add('left');
  if (ax > 0.4 || b(15)) out.add('right');
  if (ay > 0.6 || b(13)) out.add('down');
  if (ay < -0.6 || b(12)) out.add('up');
  if (b(0)) out.add('jump');
  if (b(2) || b(1) || b(5) || b(7)) out.add('throw');
  if (b(3) || b(4) || b(6)) out.add('special');
  if (b(9)) { out.add('pause'); out.add('start'); }
}

export class Controls {
  /** pad: a gamepad index, 'any', or null. touch: whether on-screen buttons drive this player. */
  constructor({ keys = KEYS_SOLO, pad = 'any', touch = true } = {}) {
    this.keys = keys; this.pad = pad; this.touch = touch;
    this.held = {}; this.pressed = {}; this.prev = {};
    this.lastPress = 0;   // for "press start to join" style checks
  }

  update() {
    const all = new Set();
    for (const a of ACTIONS) if ((this.keys[a] || []).some((c) => down.has(c))) all.add(a);
    if (this.touch) for (const a of touchHeld) all.add(a);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.pad === 'any') for (const p of pads) readPad(p, all);
    else if (this.pad !== null && pads[this.pad]) readPad(pads[this.pad], all);
    for (const a of ACTIONS) {
      const h = all.has(a);
      this.pressed[a] = h && !this.prev[a];
      this.held[a] = h;
      this.prev[a] = h;
    }
    // On menus, jump or throw also count as "start".
    this.pressed.start = this.pressed.start || this.pressed.jump || this.pressed.throw;
    this.fullJump = this.touch && touchMode;
  }
}
