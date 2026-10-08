// Level 4: The Highway to Hell.
import * as THREE from 'three';
import { rng, Batch, mat4, GEO, textPanel, sky, baseLevel } from './levelkit.js';
import { makeGate } from './level1.js';
import { makeDiscoBall } from './models.js';

// Zones: 1 Truck stop (0-48) · 2 Broken bridge (48-96) · 3 Route 666 (96-158) · 4 Toll gates (158-198) · Boss (200-222)
export const LEVEL4 = {
  id: 3,
  name: 'The Highway to Hell',
  short: 'Highway',
  rescue: 'roadie',
  boss: 'mummy',
  bossName: 'The Disco Mummy', bossTag: 'Three thousand years old. Still dancing.',
  ground: [[-30, 52], [57, 64], [71, 78], [84, 240]],
  // [x1, x2, height, type]
  blocks: [[18, 24, 2.2, 'truck'], [38, 41, 1.3, 'wreck'], [108, 111, 1.3, 'wreck'], [124, 127, 1.3, 'wreck'],
           [132, 138, 2.2, 'bus']],
  // Fire vents: they rumble on one beat and blow on the next
  vents: [60.5, 74.5, 88, 172],
  // Hearses tear through here every couple of bars: jump them, or get up on a wreck
  traffic: { x1: 100, x2: 160 },
  ledges: [[28.6, 34, 6.5], [145, 153, 5.6], [203.5, 206.5, 2.9], [215.5, 218.5, 2.9]],
  movers: [
    { kind: 'bob', x: 54.5, y: 0, amp: 1.6, w: 2.4 },
    { kind: 'slide', x: 67.5, y: 0, amp: 2.0, w: 2.9 },
    { kind: 'bob', x: 81, y: 0.1, amp: 1.8, w: 2.4 },
  ],
  // Up the billboard, and up onto the overhead road sign
  ladders: [{ x: 29.4, y1: 0, y2: 6.5 }, { x: 145.6, y1: 0, y2: 5.6 }],
  amps: [],
  crates: [
    { x: 12, loot: 'sticks' }, { x: 31.2, y: 6.5, loot: 'life' }, { x: 59, loot: 'gold' }, { x: 90, loot: 'jacket' },
    { x: 116, loot: 'vinyl' }, { x: 135, y: 2.2, loot: 'gold' }, { x: 155, loot: 'flame' }, { x: 193, loot: 'jacket' },
  ],
  records: [{ x: 32.6, y: 7.9 }, { x: 67.5, y: 2.6 }, { x: 151.5, y: 7.0 }],
  birds: [36, 92, 140],
  pigeons: false,
  headbangers: [46, 118],
  hands: [],
  throwers: [{ x: 21, y: 2.2, kind: 'barfly' }, { x: 135, y: 2.2, kind: 'barfly' }],
  checkpoint: 100,
  soundcheck: null,
  ambush: {
    name: 'Road block!', sub: 'Nobody gets through', trigger: 166, x1: 160, x2: 186, song: 'roadblock',
    waves: [
      [['walker', 3], ['rat', 3]],
      [['pogo', 3], ['headbanger', 1], ['walker', 2]],
      [['headbanger', 1], ['pogo', 2], ['diver', 2], ['rat', 2]],
    ],
  },
  arena: { gate: 199.5, x1: 200, x2: 222, trigger: 202 },
  start: 3,
  songs: { boss: 'boss4', clear: 'highway' },
  zones: [
    { x: 0, name: 'The Truck Stop', song: 'highway', spawn: { walker: 0.5, crawler: 0.2, rat: 0.3 }, max: 3 },
    { x: 48, checkpoint: 50, name: 'The Broken Bridge', song: 'highway', spawn: { walker: 0.4, ghost: 0.3, crawler: 0.3 }, max: 3 },
    { x: 96, checkpoint: 100, name: 'Route 666', song: 'route', spawn: { walker: 0.4, pogo: 0.3, rat: 0.3 }, max: 4 },
    { x: 158, name: 'The Toll Gates', song: 'route', spawn: { walker: 0.5, pogo: 0.5 }, max: 4 },
  ],
  palette: { hemiSky: 0xc07858, hemiGround: 0x1a0a08, key: 0xffc8a0, rim: 0xff6a3a },
  build: buildHighway,
};

function makeRoadSlab(w) {
  // a chunk of broken carriageway on a chain
  const g = new THREE.Group();
  const tar = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.8 });
  const conc = new THREE.MeshStandardMaterial({ color: 0x6a6460, roughness: 0.95 });
  const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 1.6), tar); s.position.y = -0.06; s.castShadow = true; s.receiveShadow = true; g.add(s);
  const c = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.4, 1.4), conc); c.position.y = -0.32; c.castShadow = true; g.add(c);
  const line = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.02, 0.12), new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0x4a3000 }));
  line.position.set(0, 0.01, 0.4); g.add(line);
  return g;
}

function buildHighway(scene, quality) {
  const L = LEVEL4;
  const r = rng(666);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const sand = M(0x5a3424), tar = M(0x26262a, { roughness: 0.7 }), steel = M(0x9aa0aa, { roughness: 0.4, metalness: 0.7 });
  const rust = M(0x6a3a22), burnt = M(0x1a1412, { roughness: 0.6, metalness: 0.3 }), conc = M(0x6a6460, { roughness: 0.95 });
  const yellow = M(0xffc94a, { emissive: 0x3a2800 }), white = M(0xe8e4dc);
  const lava = new THREE.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xff3a0a, emissiveIntensity: 2.2, roughness: 0.6 });
  const neonRed = new THREE.MeshStandardMaterial({ color: 0xff4a4a, emissive: 0xff1a1a, emissiveIntensity: 2.4 });

  const world = baseLevel(scene, L, { soil: sand, top: tar, pitMat: M(0x1a0806), ledgeMat: steel, pillarMat: null, makeMover: makeRoadSlab, lanternColor: 0xff8a3a });
  const { B, onGround } = world;
  const BG = new Batch();

  // Road markings: dashed centre line, solid edge line
  for (let x = -30; x < 240; x += 3) if (onGround(x) && onGround(x + 1.6)) B.add(GEO.box, yellow, mat4(x + 0.8, 0.025, 0.6, 0, 0, 0, 1.6, 0.02, 0.14));
  for (const [a, b] of L.ground) B.add(GEO.box, white, mat4((a + b) / 2, 0.025, 2.2, 0, 0, 0, b - a - 0.2, 0.02, 0.1));
  // Desert either side
  BG.add(GEO.box, sand, mat4(105, -0.4, -40, 0, 0, 0, 420, 0.5, 73));

  // Lava in the canyon under the broken bridge, and the snapped bridge ends
  for (let i = 0; i < L.ground.length - 1; i++) {
    const a = L.ground[i][1], b = L.ground[i + 1][0];
    B.add(GEO.box, lava, mat4((a + b) / 2, -0.86, -0.5, 0, 0, 0, b - a, 0.1, 6));
    world.addLantern(new THREE.Vector3((a + b) / 2, -0.3, 1.5));
    for (const x of [a, b]) for (let k = 0; k < 4; k++) B.add(GEO.box, conc, mat4(x + (x === a ? -0.3 : 0.3) + (r() - 0.5) * 0.4, -0.5 - k * 0.5, -0.5 + (r() - 0.5) * 3, r(), r(), r(), 0.7, 0.5, 0.8));
  }
  // Fire vents: cracked grates in the tarmac
  for (const x of L.vents) {
    B.add(GEO.box, burnt, mat4(x, 0.02, 0, 0, 0, 0, 1.2, 0.04, 1.4));
    for (let k = -2; k <= 2; k++) B.add(GEO.box, lava, mat4(x + k * 0.22, 0.03, 0, 0, 0, 0, 0.06, 0.03, 1.2));
  }

  // Trucks, wrecks and the tour bus
  for (const [a, b, h, type] of L.blocks) {
    const w = b - a, cx = (a + b) / 2;
    if (type === 'truck') {
      B.add(GEO.box, M(0xc8c4bc, { roughness: 0.5 }), mat4(a + (w - 1.6) / 2, h / 2 + 0.2, -0.4, 0, 0, 0, w - 1.6, h - 0.4, 2.2));
      B.add(GEO.box, M(0xa82a2a, { roughness: 0.4, metalness: 0.3 }), mat4(b - 0.75, h / 2, -0.4, 0, 0, 0, 1.5, h, 2.1));
      B.add(GEO.box, M(0x1a2a3a, { roughness: 0.1 }), mat4(b - 0.05, h * 0.72, -0.4, 0, 0, 0, 0.06, h * 0.32, 1.8));
      for (const x of [a + 0.8, a + 2, b - 2.6, b - 0.8]) B.add(GEO.cyl, burnt, mat4(x, 0.38, 0.75, Math.PI / 2, 0, 0, 0.76, 0.3, 0.76));
      const t = textPanel('HELL FREIGHT', { w: 3.6, h: 0.8, color: '#ff4a4a' });
      t.position.set(a + (w - 1.6) / 2, h * 0.55, 0.72); scene.add(t);
    } else if (type === 'bus') {
      const purple = M(0x5a2a8a, { roughness: 0.35, metalness: 0.3 });
      B.add(GEO.box, purple, mat4(cx, h / 2 + 0.15, -0.4, 0, 0, 0, w, h - 0.3, 2.3));
      B.add(GEO.box, M(0x1a1a2a, { roughness: 0.1, emissive: 0x200a30 }), mat4(cx, h * 0.68, 0.76, 0, 0, 0, w - 0.6, 0.55, 0.04));
      for (const x of [a + 1, b - 1]) B.add(GEO.cyl, burnt, mat4(x, 0.36, 0.78, Math.PI / 2, 0, 0, 0.72, 0.3, 0.72));
      const t = textPanel('RNRZ WORLD TOUR', { w: 4.6, h: 0.6, color: '#ffc94a' });
      t.position.set(cx, h * 0.32, 0.8); scene.add(t);
    } else {
      // burnt-out car, still smouldering
      B.add(GEO.box, burnt, mat4(cx, h * 0.4, -0.6, 0, 0, (r() - 0.5) * 0.12, w, h * 0.8, 1.6));
      B.add(GEO.box, rust, mat4(cx + 0.2, h * 0.9, -0.6, 0, 0, 0, w * 0.6, h * 0.2, 1.4));
      for (const x of [a + 0.6, b - 0.6]) B.add(GEO.cyl, burnt, mat4(x, 0.25, 0.25, Math.PI / 2, 0, 0, 0.5, 0.2, 0.5));
      world.addLantern(new THREE.Vector3(cx, h + 0.1, -0.9));
    }
  }

  // The truck stop: diner, gas pumps, a big EAT sign
  B.add(GEO.box, M(0x8a8a90, { roughness: 0.4, metalness: 0.6 }), mat4(2, 2.2, -10, 0, 0, 0, 14, 4.4, 5));
  B.add(GEO.box, M(0x2a1a1a), mat4(2, 1.6, -7.45, 0, 0, 0, 12, 1.2, 0.1));
  const eat = textPanel('EAT', { w: 3, h: 1.4, color: '#ff4a4a', neon: true, font: 'Bungee' });
  eat.position.set(-1, 5.6, -9); scene.add(eat);
  B.add(GEO.box, steel, mat4(8, 2.6, -3.6, 0, 0, 0, 7, 0.25, 3));             // canopy
  for (const x of [5, 11]) B.add(GEO.box, steel, mat4(x, 1.25, -3.6, 0, 0, 0, 0.2, 2.5, 0.2));
  for (const x of [6.5, 9.5]) { B.add(GEO.box, M(0xa82a2a), mat4(x, 0.7, -3.6, 0, 0, 0, 0.6, 1.4, 0.5)); B.add(GEO.box, neonRed, mat4(x, 1.2, -3.34, 0, 0, 0, 0.4, 0.2, 0.04)); }

  // The billboard (ladder up the left post)
  for (const x of [29.1, 33.6]) B.add(GEO.box, rust, mat4(x, 3.2, -1.1, 0, 0, 0, 0.25, 6.4, 0.25));
  const bill = textPanel('HELL · 666 MILES', { w: 5.6, h: 2.2, color: '#ffc94a', font: 'Bungee' });
  bill.position.set(31.3, 5.1, -1.0); scene.add(bill);
  // Overhead road sign gantry
  for (const x of [145.2, 153]) B.add(GEO.box, steel, mat4(x, 2.8, -1.2, 0, 0, 0, 0.3, 5.6, 0.3));
  const gsign = textPanel('ROUTE 666  ↓  HELL', { w: 7, h: 1.2, color: '#ffffff', bg: '#1a5a2a' });
  gsign.position.set(149, 4.7, -1.3); scene.add(gsign);

  // Crash barrier along the back of the road (broken over the canyon)
  for (let x = -28; x < 198; x += 2) if (onGround(x)) {
    B.add(GEO.box, steel, mat4(x, 0.45, -2.6, 0, 0, 0, 0.12, 0.9, 0.12));
    if (onGround(x + 2)) B.add(GEO.box, steel, mat4(x + 1, 0.75, -2.55, 0, 0, 0, 2, 0.25, 0.05));
  }
  // Telephone poles, cacti, mesas, a burning city on the horizon
  for (let x = -24; x < 240; x += 12) {
    BG.add(GEO.box, rust, mat4(x, 3.5, -7, 0, 0, 0, 0.2, 7, 0.2));
    BG.add(GEO.box, rust, mat4(x, 6.6, -7, 0, 0, 0, 1.6, 0.12, 0.12));
  }
  const cactus = M(0x2a4a2a);
  for (let x = -26; x < 240; x += 7 + r() * 9) {
    const z = -5 - r() * 14, h = 1.4 + r() * 1.6;
    BG.add(GEO.box, cactus, mat4(x, h / 2, z, 0, 0, 0, 0.35, h, 0.35));
    if (r() < 0.7) { BG.add(GEO.box, cactus, mat4(x + 0.35, h * 0.55, z, 0, 0, 0, 0.5, 0.2, 0.2)); BG.add(GEO.box, cactus, mat4(x + 0.55, h * 0.7, z, 0, 0, 0, 0.2, 0.5, 0.2)); }
  }
  const mesa = M(0x4a2218);
  for (let x = -60; x < 320; x += 30 + r() * 30) {
    const h = 8 + r() * 14, w = 14 + r() * 20;
    BG.add(GEO.box, mesa, mat4(x, h / 2 - 1, -70 - r() * 25, 0, 0, 0, w, h, 10));
  }
  for (let x = 120; x < 320; x += 6 + r() * 6) BG.add(GEO.box, neonRed, mat4(x, 1 + r() * 6, -110, 0, 0, 0, 2 + r() * 3, 2 + r() * 12, 2));

  // Toll gates before the club
  for (const x of [161, 170, 181, 190]) {
    B.add(GEO.box, M(0xd8d0c0), mat4(x, 1.3, -3.4, 0, 0, 0, 1.6, 2.6, 1.4));
    B.add(GEO.box, M(0x1a2a3a, { roughness: 0.1 }), mat4(x, 1.6, -2.68, 0, 0, 0, 1.2, 0.8, 0.04));
    B.add(GEO.box, neonRed, mat4(x, 2.75, -3.4, 0, 0, 0, 1.7, 0.15, 1.5));
  }
  B.add(GEO.box, steel, mat4(175.5, 3.6, -3.4, 0, 0, 0, 32, 0.4, 2));

  // The Disco Inferno: the boss arena
  const A = L.arena;
  const tileMats = [0xff2e88, 0x2fa8ff, 0xffc94a, 0xa6ff4d].map((c) => new THREE.MeshStandardMaterial({ color: 0x18141c, emissive: c, emissiveIntensity: 0.25, roughness: 0.2 }));
  for (let x = A.x1; x < A.x2; x += 1.4) for (let k = 0; k < 3; k++) {
    const i = Math.round((x - A.x1) / 1.4) + k;
    B.add(GEO.box, tileMats[i % 4], mat4(x + 0.7, 0.03, -1.4 + k * 1.4, 0, 0, 0, 1.36, 0.04, 1.36));
  }
  B.add(GEO.box, M(0x141016), mat4((A.x1 + A.x2) / 2, 6, -4.5, 0, 0, 0, A.x2 - A.x1 + 4, 12, 1));
  for (const x of [A.x1 - 0.5, A.x2 + 0.5]) B.add(GEO.box, steel, mat4(x, 5, -3.5, 0, 0, 0, 0.35, 10, 0.35));
  B.add(GEO.box, steel, mat4((A.x1 + A.x2) / 2, 10, -3.5, 0, 0, 0, A.x2 - A.x1 + 1, 0.4, 0.4));
  B.add(GEO.box, conc, mat4(A.x2 + 1.5, 4, -0.5, 0, 0, 0, 3, 8, 7));
  world.solids.push({ x1: A.x2, x2: 240, y1: 0, y2: 20 });
  for (const z of [-1.8, 1.8]) B.add(GEO.box, steel, mat4(A.gate, 2.2, z, 0, 0, 0, 0.4, 4.4, 0.4));
  world.gate = makeGate(scene, steel, A.gate);
  const banner = textPanel('DISCO INFERNO', { w: 12, h: 1.6, color: '#ff8ac8', neon: true, font: 'Bungee' });
  banner.position.set((A.x1 + A.x2) / 2, 9.3, -3.9); scene.add(banner);
  const ball = makeDiscoBall();
  ball.position.set((A.x1 + A.x2) / 2, 6.6, -1); scene.add(ball);
  world.discoBall = ball;
  const spot = new THREE.PointLight(0xff8ac8, 0, 18, 1.4); spot.position.set((A.x1 + A.x2) / 2, 6, 1); scene.add(spot);

  const sign = (x, text, color) => {
    const board = textPanel(text, { color });
    board.position.set(x, 2.0, -0.85); board.rotation.z = (r() - 0.5) * 0.12;
    scene.add(board);
    B.add(GEO.box, rust, mat4(x, 0.9, -0.9, 0, 0, 0, 0.12, 1.8, 0.12));
  };
  sign(5.5, 'HIGHWAY TO HELL →');
  sign(46.5, 'BRIDGE OUT', '#ffc94a');
  sign(98, 'NO STOPPING', '#ff4a4a');
  sign(104.5, 'MIND THE HEARSES', '#a6ff4d');
  sign(196.5, 'DISCO INFERNO', '#ff8ac8');

  B.build(scene);
  BG.build(scene, { cast: false, receive: true });
  for (let x = 6; x < 196; x += 16) if (onGround(x)) world.addLantern(new THREE.Vector3(x, 3.2, -2.7));

  const skyUpdate = sky(scene, r, { top: '#120406', mid: '#3a0e0e', bottom: '#8a2a12', fog: 0x3a1410, fogDensity: 0.011, cloudColor: 0x5a2018, moonColor: 0xffb070 });
  world.update = (t, dt, cam, pulse) => {
    skyUpdate(t, cam, pulse, 0);
    world.baseUpdate(t, cam, pulse);
    lava.emissiveIntensity = 1.8 + Math.sin(t * 2) * 0.4 + pulse * 0.6;
    const step = Math.floor(t * 160 / 60) % 4;
    tileMats.forEach((m, i) => { m.emissiveIntensity = i === step ? 1.4 + pulse * 1.5 : 0.2; });
    ball.rotation.y = t * 0.8;
    ball.userData.glint.emissiveIntensity = 2 + pulse * 4;
    spot.intensity = Math.abs(cam.x - (A.x1 + A.x2) / 2) < 20 ? 8 + pulse * 10 : 0;
    spot.color.setHSL((t * 0.1) % 1, 0.9, 0.6);
  };
  return world;
}
