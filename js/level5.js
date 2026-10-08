// Level 5: Hell's Stadium. The final gig.
import * as THREE from 'three';
import { rng, Batch, mat4, GEO, textPanel, sky, baseLevel, surface } from './levelkit.js';
import { makeGate } from './level1.js';

// Zones: 1 Gates of Hell (0-46) · 2 The Bleachers (46-100) · 3 The Mosh Pit (100-150) · 4 Backstage (150-198) · Boss (200-222)
export const LEVEL5 = {
  id: 4,
  song: 'The Number of the Beast',   // each gig is named after a classic rock song
  name: "Hell's Stadium",
  short: 'Stadium',
  rescue: 'soul',
  boss: 'devil',
  bossSong: 'Sympathy for the Devil',
  bossName: 'The Devil', bossTag: 'Wants your soul. Plays a mean guitar.',
  ground: [[-30, 40], [45, 96], [101, 240]],
  // [x1, x2, height, type]: the stand goes up in steps, along the top, and back down
  blocks: [[52, 56, 1.2, 'stand'], [56, 60, 2.4, 'stand'], [60, 64, 3.6, 'stand'], [64, 82, 4.8, 'stand'],
           [82, 86, 3.6, 'stand'], [86, 90, 2.4, 'stand'], [90, 94, 1.2, 'stand']],
  vents: [14, 30, 110, 132, 170],
  hands: [20, 23, 113, 116],
  ledges: [[43.8, 46.8, 3.8], [74.5, 80.5, 9.0], [119.5, 123.5, 6.2], [140.5, 144, 6.0],
           [203.5, 206.5, 2.9], [215.5, 218.5, 2.9]],
  movers: [
    { kind: 'bob', x: 42.5, y: 0, amp: 1.6, w: 2.4 },
    { kind: 'slide', x: 98.5, y: 0, amp: 1.6, w: 2.6 },
  ],
  // Up the floodlight gantry from the top of the stand
  ladders: [{ x: 77.4, y1: 4.8, y2: 9.0 }],
  // On-beat super jumps up to the speaker stacks
  amps: [[118, 0.95], [139, 0.95]],
  crates: [
    { x: 10, loot: 'sticks' }, { x: 34, loot: 'jacket' }, { x: 58, y: 2.4, loot: 'gold' }, { x: 79, y: 9.0, loot: 'life' },
    { x: 106, loot: 'flame' }, { x: 142, y: 6.0, loot: 'gold' }, { x: 147, loot: 'vinyl' }, { x: 193, loot: 'jacket' },
  ],
  records: [{ x: 45.3, y: 5.2 }, { x: 76.5, y: 10.4 }, { x: 121.5, y: 7.6 }],
  birds: [36, 86, 128],
  pigeons: false,
  headbangers: [90, 126],
  throwers: [{ x: 72, y: 4.8, kind: 'barfly' }],
  // Secret areas: shoot the cracked wall (its cracks glow on the beat), then Up at the door
  secrets: [
    { x: 37, theme: 'green', name: 'THE GREEN ROOM', loot: ['gold', 'life', 'gold'] },
    { x: 135, theme: 'vault', name: "THE DEVIL'S VAULT", loot: ['gold', 'gold', 'life'], guards: [['ghost', 2], ['walker', 2]] },
  ],
  checkpoint: 104,
  soundcheck: null,
  ambush: {
    name: "The Devil's warm-up act!", sub: 'Clear the backstage', trigger: 160, x1: 154, x2: 182, song: 'encore5',
    waves: [
      [['walker', 3], ['ghost', 2]],
      [['pogo', 3], ['headbanger', 1], ['crawler', 2]],
      [['headbanger', 2], ['diver', 2], ['ghost', 2]],
    ],
  },
  arena: { gate: 199.5, x1: 200, x2: 222, trigger: 202 },
  start: 3,
  songs: { boss: 'devil', clear: 'main' },
  zones: [
    { x: 0, name: 'The Gates of Hell', song: 'hellgate', spawn: { walker: 0.4, crawler: 0.3, ghost: 0.3 }, max: 3 },
    { x: 46, checkpoint: 48, name: 'The Bleachers', song: 'hellgate', spawn: { walker: 0.5, ghost: 0.3, pogo: 0.2 }, max: 4 },
    { x: 100, checkpoint: 104, name: 'The Mosh Pit', song: 'stadium', spawn: { pogo: 0.5, walker: 0.3, ghost: 0.2 }, max: 5 },
    { x: 150, checkpoint: 152, name: 'Backstage', song: 'stadium', spawn: { walker: 0.4, pogo: 0.3, rat: 0.3 }, max: 4 },
  ],
  palette: { hemiSky: 0xd05a3a, hemiGround: 0x200806, key: 0xffb090, rim: 0xff3a1a,
    grade: { lift: [0.035, 0.0, 0.0], gamma: [1.03, 0.98, 0.98], gain: [1.1, 0.93, 0.9], sat: 1.08 } },   // colour mood: blood red
  build: buildStadium,
};

function makeHellSlab(w) {
  const g = new THREE.Group();
  const rock = new THREE.MeshStandardMaterial({ color: 0x2a2024, roughness: 0.9 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xff3a0a, emissiveIntensity: 1.6 });
  const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 1.5), rock); s.position.y = -0.15; s.castShadow = true; s.receiveShadow = true; g.add(s);
  const u = new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, 0.8, 5), rock); u.rotation.x = Math.PI; u.position.y = -0.7; g.add(u);
  for (const x of [-w / 3, 0, w / 3]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.2), glow); c.position.set(x, 0.01, 0); c.rotation.y = 0.4; g.add(c); }
  return g;
}

function buildStadium(scene, quality) {
  const L = LEVEL5;
  const r = rng(6660);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const basalt = M(0x2a2024), soil = M(0x3a1a14), conc = M(0x4a4048, { roughness: 0.95 }), steel = M(0x8a8a96, { roughness: 0.4, metalness: 0.7 });
  const seat = M(0x8a1414, { roughness: 0.6 }), dark = M(0x0c0a0e);
  const lava = new THREE.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xff3a0a, emissiveIntensity: 2.2, roughness: 0.6 });
  const fire = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff5a10, emissiveIntensity: 2.5 });
  const soulMat = new THREE.MeshStandardMaterial({ color: 0xc8d6ff, emissive: 0x6a7cff, emissiveIntensity: 1.2 });
  const floodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d0, emissiveIntensity: 3 });

  // surface textures: bricks, stone, wood grain, tarmac...
  surface(basalt, 'rock', 3); surface(soil, 'dirt', 3); surface(conc, 'concrete', 3); surface(steel, 'metal', 2, 0.4);
  const world = baseLevel(scene, L, { soil, top: basalt, pitMat: M(0x1a0806), ledgeMat: steel, pillarMat: steel, makeMover: makeHellSlab, lanternColor: 0xff6a2a });
  const { B, onGround } = world;
  const BG = new Batch();

  // cracks of lava in the floor
  for (let x = -28; x < 238; x += 2.5 + r() * 3) if (onGround(x) && !(L.blocks.some(([a, b]) => x > a - 1 && x < b + 1))) B.add(GEO.box, lava, mat4(x, 0.02, (r() - 0.5) * 4, 0, r() * 3, 0, 0.8 + r(), 0.02, 0.05));
  BG.add(GEO.box, basalt, mat4(105, -0.4, -40, 0, 0, 0, 420, 0.5, 73));
  for (let i = 0; i < L.ground.length - 1; i++) {
    const a = L.ground[i][1], b = L.ground[i + 1][0];
    B.add(GEO.box, lava, mat4((a + b) / 2, -0.86, -0.5, 0, 0, 0, b - a, 0.1, 6));
    world.addLantern(new THREE.Vector3((a + b) / 2, -0.3, 1.5));
  }
  for (const x of L.vents) {
    B.add(GEO.box, dark, mat4(x, 0.02, 0, 0, 0, 0, 1.2, 0.04, 1.4));
    for (let k = -2; k <= 2; k++) B.add(GEO.box, lava, mat4(x + k * 0.22, 0.03, 0, 0, 0, 0, 0.06, 0.03, 1.2));
  }

  // The stand you climb: concrete steps with rows of red seats
  for (const [a, b, h] of L.blocks) {
    const w = b - a, cx = (a + b) / 2;
    B.add(GEO.box, conc, mat4(cx, h / 2, -0.5, 0, 0, 0, w, h, 6));
    for (let x = a + 0.5; x < b - 0.3; x += 0.8) B.add(GEO.box, seat, mat4(x, h + 0.2, -2.2, 0, 0, 0, 0.6, 0.4, 0.5));
    B.add(GEO.box, steel, mat4(cx, h + 0.5, 2.4, 0, 0, 0, w, 0.06, 0.06));
  }
  // floodlight gantry over the top of the stand
  for (const x of [74.6, 80.4]) B.add(GEO.box, steel, mat4(x, 6.9, -1.0, 0, 0, 0, 0.25, 4.2, 0.25));
  for (let x = 75; x < 80.5; x += 1.1) { B.add(GEO.box, floodMat, mat4(x, 10.2, -1.2, 0.3, 0, 0, 0.8, 0.6, 0.12)); }
  world.addLantern(new THREE.Vector3(77.5, 9.8, -0.6));

  // The stadium bowl behind: tiers of souls, floodlight towers, big screens
  for (let tier = 0; tier < 5; tier++) {
    const z = -18 - tier * 7, y = tier * 3.4;
    BG.add(GEO.box, conc, mat4(105, y + 1.4, z, 0, 0, 0, 340, 2.8, 6));
    for (let x = -40; x < 260; x += 40) world.addCrowd({ x1: x, x2: x + 40, z: z + 1.6, y: y + 2.8, rows: 1, gap: 1.3, color: 0x141428, glow: 0x4a5acc, scale: 0.95 });
    for (let x = -40; x < 260; x += 6 + r() * 8) BG.add(GEO.box, fire, mat4(x, y + 3.1, z + 1.6, 0, 0, 0, 0.4, 0.8, 0.3));
  }
  for (let x = -20; x < 260; x += 46) {
    BG.add(GEO.box, steel, mat4(x, 14, -48, 0, 0, 0, 0.8, 28, 0.8));
    BG.add(GEO.box, floodMat, mat4(x, 28.5, -47.4, 0, 0, 0, 5, 2.4, 0.3));
  }
  for (const x of [40, 150]) {
    const scr = textPanel('THE DEVIL · LIVE IN HELL', { w: 16, h: 3, color: '#ff4a2a', neon: true, font: 'Bungee' });
    scr.position.set(x, 17, -36); scene.add(scr);
  }
  // pillars of fire around the rim
  for (let x = -20; x < 260; x += 24) BG.add(GEO.coneT, fire, mat4(x, 20, -52, 0, 0, 0, 3, 6 + r() * 4, 3));

  // The gates of hell at the start
  for (const x of [2, 7]) { B.add(GEO.box, basalt, mat4(x, 3, -3, 0, 0, 0, 1.2, 6, 1.2)); B.add(GEO.coneT, basalt, mat4(x, 6.6, -3, 0, 0, 0, 1.4, 1.4, 1.4)); }
  const gates = textPanel("HELL'S STADIUM", { w: 7, h: 1.2, color: '#ff8a3a', neon: true, font: 'Bungee' });
  gates.position.set(4.5, 8.0, -2.6); scene.add(gates);

  // Mosh pit: barriers, speaker stacks you super-jump up to
  for (const x of [116, 137]) for (let y = 0; y < 3; y++) B.add(GEO.box, dark, mat4(x + 5, 0.9 + y * 1.8, -2.4, 0, 0, 0, 3.2, 1.7, 1.4));
  for (let x = 101; x < 150; x += 1.6) B.add(GEO.box, steel, mat4(x, 0.55, -2.8, 0, 0, 0, 1.5, 1.1, 0.08));

  // Backstage: flight cases, a dressing room door
  for (const x of [153, 158, 185, 190]) B.add(GEO.box, M(0x18181c, { roughness: 0.5 }), mat4(x, 0.5, -2.6, 0, r(), 0, 1.1, 1, 0.9));
  B.add(GEO.box, M(0x5a1a1a), mat4(195, 1.3, -3.4, 0, 0, 0, 1.4, 2.6, 0.1));
  const star = textPanel('★ THE DEVIL ★', { w: 1.6, h: 0.4, color: '#ffc94a' });
  star.position.set(195, 2.2, -3.3); scene.add(star);

  // The main stage: amp walls, a horned truss, and his name in lights
  const A = L.arena;
  B.add(GEO.box, M(0x141016), mat4((A.x1 + A.x2) / 2, 6, -4.5, 0, 0, 0, A.x2 - A.x1 + 4, 12, 1));
  for (const x of [A.x1 + 0.2, A.x2 - 0.2]) for (let y = 0; y < 4; y++) for (const dz of [0]) {
    B.add(GEO.box, dark, mat4(x + (x < 211 ? 0.9 : -0.9), 0.9 + y * 1.8, -3.4 + dz, 0, 0, 0, 1.8, 1.7, 1.2));
    B.add(GEO.cyl, M(0x2a2a30), mat4(x + (x < 211 ? 0.9 : -0.9), 0.9 + y * 1.8, -2.78, Math.PI / 2, 0, 0, 1.2, 0.05, 1.2));
  }
  B.add(GEO.box, steel, mat4((A.x1 + A.x2) / 2, 10, -3.5, 0, 0, 0, A.x2 - A.x1 + 1, 0.4, 0.4));
  for (const sx of [-1, 1]) B.add(GEO.coneT, M(0x8a1010, { emissive: 0x400000 }), mat4((A.x1 + A.x2) / 2 + sx * 3.5, 11.4, -3.5, 0, 0, sx * -0.5, 0.8, 3, 0.8));
  B.add(GEO.box, conc, mat4(A.x2 + 1.5, 4, -0.5, 0, 0, 0, 3, 8, 7));
  world.solids.push({ x1: A.x2, x2: 240, y1: 0, y2: 20 });
  for (const z of [-1.8, 1.8]) B.add(GEO.box, steel, mat4(A.gate, 2.2, z, 0, 0, 0, 0.4, 4.4, 0.4));
  world.gate = makeGate(scene, steel, A.gate);
  const banner = textPanel('THE DEVIL', { w: 10, h: 1.8, color: '#ff3a1a', neon: true, font: 'Bungee' });
  banner.position.set((A.x1 + A.x2) / 2, 8.6, -3.9); scene.add(banner);
  // pyro along the front of the stage (lit when the boss fight starts)
  const pyro = [];
  for (let x = A.x1 + 1; x < A.x2; x += 3.5) {
    B.add(GEO.box, dark, mat4(x, 0.1, 2.3, 0, 0, 0, 0.6, 0.2, 0.6));
    const f = new THREE.Mesh(GEO.coneT, fire); f.position.set(x, 0.8, 2.3); f.scale.set(0.5, 1.2, 0.5); scene.add(f); pyro.push(f);
  }

  const sign = (x, text, color) => {
    const board = textPanel(text, { color });
    board.position.set(x, 2.0, -0.85); board.rotation.z = (r() - 0.5) * 0.12;
    scene.add(board);
    B.add(GEO.box, steel, mat4(x, 0.9, -0.9, 0, 0, 0, 0.12, 1.8, 0.12));
  };
  sign(10.5, 'ALL SOULS THIS WAY →');
  sign(49, 'BLEACHERS', '#ffc94a');
  sign(102.8, 'MOSH PIT', '#ff8ac8');
  sign(116.4, 'JUMP OFF THE AMP ON THE BEAT', '#a6ff4d');
  sign(151.5, 'BACKSTAGE', '#9affd8');
  sign(197.5, 'ON STAGE', '#ff3a1a');

  world.addCrowd({ x1: 102, x2: 149, z: -4.2, rows: 2, gap: 0.85, eyes: 0xffc94a });
  world.addBeams({ at: [0, 1, 2, 3].map((i) => [A.x1 + 3 + i * 5.3, 9.6, -3.2]), colors: [0xff3a1a, 0xffa040, 0xff3a1a, 0xffa040], length: 9.5, width: 1.5, sweep: 0.55, opacity: 0.12 });
  B.build(scene);
  BG.build(scene, { cast: false, receive: true });
  for (let x = 6; x < 196; x += 14) if (onGround(x) && !L.blocks.some(([a, b]) => x > a - 1 && x < b + 1)) world.addLantern(new THREE.Vector3(x, 2.8, -3.2));

  const skyUpdate = sky(scene, r, { top: '#1a0204', mid: '#4a0a06', bottom: '#a02a0a', fog: 0x40100a, fogDensity: 0.01, cloudColor: 0x6a1a10, moonColor: 0xff6a3a });
  world.update = (t, dt, cam, pulse) => {
    skyUpdate(t, cam, pulse, 0);
    world.baseUpdate(t, cam, pulse);
    lava.emissiveIntensity = 1.8 + Math.sin(t * 2) * 0.4 + pulse * 0.6;
    fire.emissiveIntensity = 2 + pulse * 2;
    soulMat.emissiveIntensity = 0.8 + pulse * 1.2;
    for (const [i, f] of pyro.entries()) f.scale.y = 0.6 + pulse * 2.2 + Math.sin(t * 9 + i) * 0.2;
  };
  return world;
}
