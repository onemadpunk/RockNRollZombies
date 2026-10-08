// Level 3: The Haunted Festival.
import * as THREE from 'three';
import { rng, Batch, mat4, GEO, textPanel, sky, baseLevel, surface } from './levelkit.js';
import { makeGate } from './level1.js';

// Zones: 1 Car park field (0-42) · 2 Campsite (42-96) · 3 Funfair (96-148) · 4 Main stage (148-196) · Boss (200-222)
export const LEVEL3 = {
  id: 2,
  song: 'Stairway to Heaven',   // each gig is named after a classic rock song
  name: 'The Haunted Festival',
  short: 'Festival',
  rescue: 'singer',
  boss: 'banshee',
  bossName: 'The Banshee Diva', bossTag: 'Hits notes that kill. Literally.',
  ground: [[-30, 44], [47, 66], [73, 240]],
  // [x1, x2, height, type]
  blocks: [[36, 39, 1.6, 'tent'], [78, 81.5, 1.8, 'tent'], [86, 89, 1.6, 'tent'], [134, 139, 1.2, 'bounce']],
  mud: [[8, 16], [50, 58], [124, 131]],
  campfires: [30, 62, 92],
  loos: [22, 96, 152],
  ledges: [[27.5, 31, 2.6], [60, 63.5, 2.7], [113.5, 118, 8.5], [140, 144, 6.2], [160, 163, 2.7], [168, 171, 2.7],
           [203.5, 206.5, 2.9], [215.5, 218.5, 2.9]],
  movers: [{ kind: 'slide', x: 69.5, y: 0, amp: 2.0, w: 2.9 }],
  // Ride a car up and jump off near the top for the secret ledge
  wheels: [{ x: 108, y: 6.4, r: 4.2, n: 6, w: 1.8 }],
  ladders: [],
  amps: [],
  crates: [
    { x: 14, loot: 'sticks' }, { x: 49, loot: 'gold' }, { x: 84, loot: 'jacket' }, { x: 115, y: 8.5, loot: 'life' },
    { x: 117, y: 8.5, loot: 'gold' }, { x: 142, y: 6.2, loot: 'flame' }, { x: 146, loot: 'vinyl' }, { x: 193, loot: 'jacket' },
  ],
  records: [{ x: 79.8, y: 3.7 }, { x: 115.8, y: 9.9 }, { x: 142, y: 7.6 }],
  birds: [20, 64, 128],
  pigeons: false,
  headbangers: [57, 145],
  hands: [],
  throwers: [{ x: 37.5, y: 1.6, kind: 'barfly' }, { x: 87.5, y: 1.6, kind: 'barfly' }],
  checkpoint: 120,
  soundcheck: null,
  ambush: {
    name: 'Crowd surge!', sub: 'Hold the front row', trigger: 156, x1: 150, x2: 176, song: 'surge',
    waves: [
      [['pogo', 3], ['diver', 2]],
      [['headbanger', 1], ['diver', 3], ['walker', 2]],
      [['ghost', 2], ['pogo', 3], ['diver', 2]],
    ],
  },
  arena: { gate: 199.5, x1: 200, x2: 222, trigger: 202 },
  start: 3,
  songs: { boss: 'boss3', clear: 'festival' },
  zones: [
    { x: 0, name: 'The Car Park Field', song: 'festival', spawn: { walker: 0.7, crawler: 0.3 }, max: 3 },
    { x: 42, checkpoint: 48, name: 'The Campsite', song: 'festival', spawn: { walker: 0.4, crawler: 0.3, ghost: 0.3 }, max: 4 },
    { x: 96, checkpoint: 100, name: 'The Funfair', song: 'funfair', spawn: { walker: 0.4, pogo: 0.3, ghost: 0.3 }, max: 4 },
    { x: 148, name: 'The Main Stage', song: 'funfair', spawn: { pogo: 0.5, walker: 0.5 }, max: 4 },
  ],
  palette: { hemiSky: 0x8a9ad0, hemiGround: 0x1a1a14, key: 0xd8d0ff, rim: 0x7affc8,
    grade: { lift: [0.0, 0.02, 0.025], gamma: [1, 1, 1], gain: [1.05, 1.02, 0.96], sat: 1.1 } },   // colour mood: teal night, warm lights
  build: buildFestival,
};

function makeRaft(w) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.24), wood);
    b.position.set(0, -0.05, -0.6 + i * 0.3); b.castShadow = true; b.receiveShadow = true; g.add(b);
  }
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 1.5), wood); b.position.set(x, -0.17, 0); g.add(b); }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 10), new THREE.MeshStandardMaterial({ color: 0x2a4a8a, roughness: 0.5 }));
  barrel.rotation.x = Math.PI / 2; barrel.position.y = -0.45; g.add(barrel);
  return g;
}

function buildFestival(scene, quality) {
  const L = LEVEL3;
  const r = rng(1969);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const grass = M(0x2a3a1e), soil = M(0x3a2a20), dark = M(0x07060a), planks = M(0x5a4030), steel = M(0x9aa0aa, { roughness: 0.4, metalness: 0.7 });
  const canvasA = M(0xd8c8a0), canvasB = M(0x6a8a5a), canvasC = M(0xa83a3a), canvasD = M(0x3a5a8a);
  const looBlue = M(0x2a5ab0, { roughness: 0.6 }), looWhite = M(0xe8e8e8, { roughness: 0.6 });
  const bulb = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffb040, emissiveIntensity: 2.2 });
  const bulbPink = new THREE.MeshStandardMaterial({ color: 0xff8ac8, emissive: 0xff2e88, emissiveIntensity: 2 });
  const water = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.1, metalness: 0.3, emissive: 0x0a1a3a });

  // surface textures: bricks, stone, wood grain, tarmac...
  surface(grass, 'grass', 2); surface(soil, 'dirt', 3); surface(planks, 'wood', 2);
  for (const c of [canvasA, canvasB, canvasC, canvasD]) surface(c, 'fabric', 1.5, 0.6);
  const world = baseLevel(scene, L, { soil, top: grass, pitMat: dark, ledgeMat: planks, pillarMat: steel, makeMover: makeRaft, lanternColor: 0xffb040 });
  const { B, onGround } = world;
  const BG = new Batch();

  // stream under the raft
  B.add(GEO.box, water, mat4(69.5, -0.7, -0.5, 0, 0, 0, 7, 0.1, 6));
  BG.add(GEO.box, grass, mat4(105, -0.35, -40, 0, 0, 0, 420, 0.5, 73));
  for (let x = -30; x < 240; x += 0.4) if (onGround(x)) B.add(GEO.coneT, grass, mat4(x + r() * 0.3, 0.12, 2.4 - r() * 0.6, (r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.6, 0.12, 0.3 + r() * 0.2, 0.12));

  // Tents you can stand on, and the bouncy castle
  for (const [a, b, h, type] of L.blocks) {
    const w = b - a, cx = (a + b) / 2;
    if (type === 'tent') {
      const c = [canvasA, canvasB, canvasC, canvasD][Math.floor(r() * 4)];
      for (const sx of [-1, 1]) B.add(GEO.box, c, mat4(cx + sx * w * 0.25, h / 2, -0.4, 0, 0, sx * -0.75, 0.08, h * 1.45, 2.2));
      B.add(GEO.box, c, mat4(cx, h - 0.04, -0.4, 0, 0, 0, w * 0.2, 0.08, 2.2));        // ridge you stand on
      B.add(GEO.box, dark, mat4(cx, h * 0.3, 0.72, 0, 0, 0, w * 0.25, h * 0.6, 0.04));   // doorway
    } else {
      const pink = M(0xff5aa8, { roughness: 0.5 }), yellow = M(0xffd23a, { roughness: 0.5 });
      B.add(GEO.box, pink, mat4(cx, h / 2, -0.4, 0, 0, 0, w, h, 2.4));
      B.add(GEO.box, yellow, mat4(cx, h + 0.15, -1.4, 0, 0, 0, w, 1.6, 0.3));            // back wall
      for (const x of [a + 0.3, b - 0.3]) {
        B.add(GEO.cyl, yellow, mat4(x, h + 0.6, -1.4, 0, 0, 0, 0.6, 2.4, 0.6));
        B.add(GEO.sph, pink, mat4(x, h + 1.85, -1.4, 0, 0, 0, 0.35, 0.35, 0.35));
      }
    }
  }
  // Porta-loos (zombies burst out of these)
  for (const x of L.loos) {
    B.add(GEO.box, looBlue, mat4(x, 1.1, -1.5, 0, 0, 0, 1.1, 2.2, 1.1));
    B.add(GEO.box, looWhite, mat4(x, 2.28, -1.5, 0, 0, 0, 1.2, 0.16, 1.2));
    B.add(GEO.box, M(0x1a3a80), mat4(x, 1.05, -0.94, 0, 0, 0, 0.8, 1.9, 0.04));
    B.add(GEO.box, looWhite, mat4(x + 0.25, 1.1, -0.9, 0, 0, 0, 0.12, 0.06, 0.04));
  }
  // Campfires: logs + stones (the flames are particles from the game, plus a lantern light)
  const log = M(0x3a2414), stone = M(0x5a5a62);
  for (const x of L.campfires) {
    for (const ry of [0.4, -0.4, 1.4]) B.add(GEO.cyl, log, mat4(x, 0.12, 0, Math.PI / 2, ry, 0, 0.18, 1.1, 0.18));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; B.add(GEO.sph, stone, mat4(x + Math.cos(a) * 0.7, 0.08, Math.sin(a) * 0.5, 0, 0, 0, 0.16, 0.12, 0.16)); }
    world.addLantern(new THREE.Vector3(x, 0.4, 0.2));
  }

  // Big tops, flags, festoon lights, distant stages
  for (let x = -20; x < 250; x += 24 + r() * 16) {
    const z = -18 - r() * 18, s = 4 + r() * 3;
    BG.add(GEO.cyl, r() < 0.5 ? canvasC : canvasD, mat4(x, s * 0.4, z, 0, 0, 0, s * 2, s * 0.8, s * 2));
    BG.add(GEO.cone4, canvasA, mat4(x, s * 0.8 + s * 0.45, z, 0, Math.PI / 8, 0, s * 2.2, s * 0.9, s * 2.2));
    BG.add(GEO.box, steel, mat4(x, s * 1.6, z, 0, 0, 0, 0.1, s * 0.8, 0.1));
  }
  const flagCols = [canvasC, canvasD, M(0xffd23a), canvasB];
  for (let x = -20; x < 230; x += 14) {
    BG.add(GEO.box, steel, mat4(x, 2.5, -4, 0, 0, 0, 0.1, 5, 0.1));
    for (let k = 0; k < 14; k++) {
      const fx = x + k, sag = Math.sin((k / 14) * Math.PI) * 0.8;
      BG.add(GEO.coneT, flagCols[k % 4], mat4(fx + 0.5, 4.7 - sag, -4, Math.PI, 0, 0, 0.35, 0.45, 0.05));
      if (k % 2 === 0) BG.add(GEO.sph, k % 4 ? bulb : bulbPink, mat4(fx + 0.5, 5.05 - sag, -4.1, 0, 0, 0, 0.07, 0.07, 0.07));
    }
  }
  for (let x = 30; x < 260; x += 70) {
    BG.add(GEO.box, M(0x15142a), mat4(x, 4, -55, 0, 0, 0, 14, 8, 6));
    for (let k = 0; k < 6; k++) BG.add(GEO.box, k % 2 ? bulbPink : bulb, mat4(x - 6 + k * 2.4, 8.3, -51.9, 0, 0, 0, 0.6, 0.3, 0.1));
  }
  for (let x = -60; x < 320; x += 22 + r() * 18) BG.add(GEO.sph, M(0x1a2418), mat4(x, -6, -75 - r() * 30, 0, 0, 0, 22 + r() * 18, 12 + r() * 10, 14));

  // Main stage for the boss
  const A = L.arena;
  B.add(GEO.box, planks, mat4((A.x1 + A.x2) / 2, 0.05, -3.2, 0, 0, 0, A.x2 - A.x1 + 4, 0.6, 3));
  for (const x of [A.x1 - 0.5, A.x2 + 0.5]) {
    B.add(GEO.box, steel, mat4(x, 5, -3.5, 0, 0, 0, 0.35, 10, 0.35));
    for (let y = 0; y < 3; y++) B.add(GEO.box, M(0x141416), mat4(x + (x < 210 ? 1 : -1), 0.9 + y * 1.6, -2.6, 0, 0, 0, 1.8, 1.55, 1.2));
  }
  B.add(GEO.box, steel, mat4((A.x1 + A.x2) / 2, 10, -3.5, 0, 0, 0, A.x2 - A.x1 + 1, 0.4, 0.4));
  for (let x = A.x1 + 2; x < A.x2; x += 3) B.add(GEO.box, bulbPink, mat4(x, 9.6, -3.3, 0, 0, 0, 0.5, 0.4, 0.4));
  B.add(GEO.box, planks, mat4(A.x2 + 1.5, 4, -0.5, 0, 0, 0, 3, 8, 7));
  world.solids.push({ x1: A.x2, x2: 240, y1: 0, y2: 20 });
  for (const z of [-1.8, 1.8]) B.add(GEO.box, steel, mat4(A.gate, 2.2, z, 0, 0, 0, 0.4, 4.4, 0.4));
  world.gate = makeGate(scene, steel, A.gate);

  const banner = textPanel('HAUNTED FESTIVAL', { w: 12, h: 1.6, color: '#9affd8', neon: true, font: 'Bungee' });
  banner.position.set((A.x1 + A.x2) / 2, 8.4, -3.2); scene.add(banner);

  const sign = (x, text, color) => {
    const board = textPanel(text, { color });
    board.position.set(x, 2.0, -0.85); board.rotation.z = (r() - 0.5) * 0.12;
    scene.add(board);
    B.add(GEO.box, planks, mat4(x, 0.9, -0.9, 0, 0, 0, 0.12, 1.8, 0.12));
  };
  sign(6.5, 'HAUNTED FESTIVAL →');
  sign(42.8, 'CAMPSITE', '#ffc94a');
  sign(100.5, 'FUNFAIR', '#ff8ac8');
  sign(132.6, 'BOUNCE ON THE BEAT', '#a6ff4d');
  sign(148.5, 'MAIN STAGE', '#9affd8');
  sign(196.5, 'ARTISTS ONLY', '#ff2e88');

  world.addCrowd({ x1: 149, x2: 197, z: -6, rows: 3, gap: 0.8, color: 0x34303c, eyes: 0x5a9a2a });
  world.addCrowd({ x1: 20, x2: 140, z: -12, rows: 2, gap: 2.4, scale: 0.9, color: 0x34303c, eyes: 0x5a9a2a });
  world.addBeams({ at: [0, 1, 2, 3, 4].map((i) => [A.x1 + 2 + i * 4.5, 9.6, -3.3]), colors: [0xff2e88, 0x9affd8, 0xffc94a, 0x9affd8, 0xff2e88], length: 9.5, width: 1.4 });
  B.build(scene);
  BG.build(scene, { cast: false, receive: true });
  for (let x = 6; x < 225; x += 14) if (onGround(x) && !L.campfires.some((c) => Math.abs(c - x) < 3)) world.addLantern(new THREE.Vector3(x, 2.8, -3.9));

  const skyUpdate = sky(scene, r, { top: '#040810', mid: '#122030', bottom: '#2a3a48', fog: 0x1a2630, fogDensity: 0.01, cloudColor: 0x3a4a5a, moonColor: 0xe8fff4 });
  world.update = (t, dt, cam, pulse) => {
    skyUpdate(t, cam, pulse, 0);
    world.baseUpdate(t, cam, pulse);
    bulbPink.emissiveIntensity = 1.6 + pulse * 2;
  };
  return world;
}
