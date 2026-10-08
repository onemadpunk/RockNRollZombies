// Keyboard, gamepads and touch. One shared keyboard listener; each player gets a Controls object
// with its own key map and gamepad, so two people can play on one keyboard or two pads.
// `held` = currently down; `pressed` = went down this frame.

const ACTIONS = ['left', 'right', 'down', 'jump', 'throw', 'special', 'pause', 'start'];

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

/** Wire the on-screen buttons once. */
export function bindTouch(container) {
  for (const b of container.querySelectorAll('button[data-k]')) {
    const k = b.dataset.k;
    const press = (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); touchHeld.add(k); b.classList.add('down'); };
    const release = (e) => { e.preventDefault(); touchHeld.delete(k); b.classList.remove('down'); };
    b.addEventListener('pointerdown', press);
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('lostpointercapture', release);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

export const KEYS_SOLO = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ', 'KeyW', 'ArrowUp'], throw: ['KeyX', 'KeyJ', 'KeyK'],
  special: ['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight'], pause: ['Escape', 'KeyP'], start: ['Enter'],
};
export const KEYS_P1 = {
  left: ['KeyA'], right: ['KeyD'], down: ['KeyS'], jump: ['KeyW', 'Space'], throw: ['KeyF'], special: ['KeyG'],
  pause: ['Escape', 'KeyP'], start: ['Enter'],
};
export const KEYS_P2 = {
  left: ['ArrowLeft'], right: ['ArrowRight'], down: ['ArrowDown'], jump: ['ArrowUp'],
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
  }
}
