// Level 2: The Back Alley Dive Bar.
import * as THREE from 'three';
import { makeScaffold } from './models.js';
import { rng, Batch, mat4, canvasTex, GEO, textPanel, sky, baseLevel } from './levelkit.js';
import { makeGate } from './level1.js';

// Zones: 1 Back alley (0-44) · 2 Fire escapes (44-80) · 3 The dive bar (80-121)
//        4 Rooftops (121-196) · Boss arena (200-222)
export const LEVEL2 = {
  id: 1,
  name: 'The Back Alley Dive Bar',
  short: 'Dive Bar',
  rescue: 'bassist',
  boss: 'gargoyle',
  bossName: 'The Gargoyle Punk', bossTag: 'Carved in 1890. Joined a band in 1977.',
  ground: [[-30, 44], [47, 58], [65, 124], [127, 150], [157, 172], [175, 240]],
  blocks: [[17, 19.2, 1.3], [31, 33.2, 1.3], [88, 90.6, 0.95], [134, 135.2, 1.6], [143, 144.2, 1.6], [184, 185.2, 1.6]],
  ledges: [[8, 12, 2.8], [22, 26, 2.8], [24, 27, 5.4], [49, 53, 2.8], [52, 55, 5.2], [67, 71, 2.8], [72, 76, 2.8],
           [100, 103, 2.6], [110, 113, 2.6], [139, 142, 2.8], [163.5, 167, 6.3], [178, 181, 2.8], [187, 190, 2.8],
           [200.3, 202.8, 4.8], [219.2, 221.7, 4.8], [206, 209, 2.8], [213, 216, 2.8]],
  movers: [
    { kind: 'bob', x: 61.5, y: 0, amp: 1.6, w: 2.4 },
    { kind: 'slide', x: 153.5, y: 0, amp: 2.0, w: 2.9 },
  ],
  amps: [[161.8, 0.95]],
  crates: [
    { x: 14, loot: 'sticks' }, { x: 50.5, y: 2.8, loot: 'gold' }, { x: 84, loot: 'jacket' }, { x: 117, loot: 'flame' },
    { x: 164.5, y: 6.3, loot: 'life' }, { x: 166.2, y: 6.3, loot: 'gold' }, { x: 137, loot: 'vinyl' }, { x: 193, loot: 'jacket' },
  ],
  records: [{ x: 25.5, y: 6.7 }, { x: 111.5, y: 4.9 }, { x: 165.4, y: 7.6 }],
  birds: [30, 70, 132, 182],
  pigeons: true,
  headbangers: [70, 146],
  hands: [],
  throwers: [{ x: 53.5, y: 5.2, kind: 'barfly' }, { x: 74, y: 2.8, kind: 'barfly' }, { x: 140.5, y: 2.8, kind: 'barfly' }, { x: 188.5, y: 2.8, kind: 'barfly' }],
  checkpoint: 92,
  soundcheck: null,
  ambush: {
    name: 'Bar brawl!', sub: 'Clear the bar', trigger: 99, x1: 94.5, x2: 119.5, song: 'brawl',
    waves: [
      [['walker', 3], ['rat', 3]],
      [['pogo', 3], ['headbanger', 1]],
      [['headbanger', 2], ['pogo', 2], ['rat', 3]],
    ],
  },
  arena: { gate: 199.5, x1: 200, x2: 222, trigger: 202 },
  start: 3,
  songs: { boss: 'boss2', clear: 'alley' },
  zones: [
    { x: 0, name: 'The Back Alley', song: 'alley', spawn: { walker: 0.6, rat: 0.4 }, max: 3 },
    { x: 44, checkpoint: 48.5, name: 'Fire Escapes', song: 'alley', spawn: { walker: 0.5, rat: 0.3, pogo: 0.2 }, max: 4 },
    { x: 80, checkpoint: 82, name: 'The Dive Bar', song: 'bar', spawn: { walker: 0.4, pogo: 0.3, rat: 0.3 }, max: 4 },
    { x: 121, checkpoint: 128.5, name: 'The Rooftops', song: 'roof', spawn: { pogo: 0.4, walker: 0.3, rat: 0.3 }, max: 5 },
  ],
  palette: { hemiSky: 0x7a8ad0, hemiGround: 0x201828, key: 0xb8c8ff, rim: 0xff6ab8 },
  build: buildAlley,
};

function buildAlley(scene, quality) {
  const L = LEVEL2;
  const r = rng(2077);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const asphalt = M(0x26262e), concrete = M(0x3a3438), tar = M(0x1d1d24), brick = M(0x5a2e2a), brick2 = M(0x4a3a3a);
  const brick3 = M(0x3a3440), iron = M(0x1a1a20, { roughness: 0.5, metalness: 0.6 }), wood = M(0x3a2418, { roughness: 0.8 });
  const felt = M(0x1e5a3a), dark = M(0x07060a, { roughness: 1 }), metal = M(0x6a6e78, { roughness: 0.4, metalness: 0.7 });
  const dumpster = M(0x2a5a3a, { roughness: 0.6, metalness: 0.3 });
  const winLit = new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xffa040, emissiveIntensity: 0.9 });
  const winBlue = new THREE.MeshStandardMaterial({ color: 0x80b0ff, emissive: 0x4070ff, emissiveIntensity: 0.8 });
  const winDark = M(0x101018, { roughness: 0.3 });
  const bottleCols = [0x3a8a3a, 0x8a5a1a, 0x2a4a8a].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.2 }));

  const world = baseLevel(scene, L, { soil: concrete, top: asphalt, pitMat: dark, ledgeMat: iron, pillarMat: null, makeMover: makeScaffold, lanternColor: 0xffc070 });
  const { B, onGround } = world;
  const BG = new Batch();
  const win = () => (r() < 0.35 ? winLit : r() < 0.15 ? winBlue : winDark);

  // Rooftop zone: ground is building tops; front faces get windows
  for (const [a, b] of L.ground) {
    if (b < 124) continue;
    for (let x = Math.max(a, 121) + 0.8; x < b - 0.6; x += 1.4) for (let y = -1.2; y > -9; y -= 1.8) B.add(GEO.box, win(), mat4(x, y, 2.52, 0, 0, 0, 0.7, 1.0, 0.05));
    B.add(GEO.box, brick3, mat4((a + b) / 2, 0.25, 2.3, 0, 0, 0, b - a, 0.5, 0.3));      // parapet lip
  }

  // ---- Alley + fire escapes (0-80): brick facades with windows and iron stairs -------------
  for (let x = -30; x < 80;) {
    const w = 8 + r() * 6, h = 7 + r() * 7, mat = r() < 0.5 ? brick : brick2;
    B.add(GEO.box, mat, mat4(x + w / 2, h / 2, -7.5, 0, 0, 0, w, h, 1.2));
    for (let wy = 3.4; wy < h - 1; wy += 2.6) for (let wx = x + 1.2; wx < x + w - 1; wx += 2.2) B.add(GEO.box, win(), mat4(wx, wy, -6.88, 0, 0, 0, 0.9, 1.2, 0.05));
    B.add(GEO.box, dark, mat4(x + w * 0.3, 1.2, -6.88, 0, 0, 0, 1.2, 2.4, 0.05));     // back door
    B.add(GEO.box, concrete, mat4(x + w / 2, h + 0.15, -7.5, 0, 0, 0, w + 0.2, 0.3, 1.4));  // roof edge
    x += w;
  }
  // fire-escape railings on the ledges in the alley zone
  for (const [a, b, y] of L.ledges) {
    if (a > 80) continue;
    for (let x = a; x <= b; x += 0.35) B.add(GEO.box, iron, mat4(x, y + 0.45, -0.95, 0, 0, 0, 0.04, 0.9, 0.04));
    B.add(GEO.box, iron, mat4((a + b) / 2, y + 0.9, -0.95, 0, 0, 0, b - a, 0.05, 0.05));
    B.add(GEO.box, iron, mat4(a + 0.2, y / 2, -0.95, 0, 0, 0.5, 0.08, y * 1.15, 0.08));   // stair stringer
  }
  // dumpsters (solid blocks), bins, crates
  for (const [a, b, h] of L.blocks) {
    const w = b - a, cx = (a + b) / 2;
    if (a < 80) {
      B.add(GEO.box, dumpster, mat4(cx, h / 2, -0.2, 0, 0, 0, w, h, 1.6));
      B.add(GEO.box, M(0x1a3a2a), mat4(cx, h + 0.05, -0.2, 0, 0, -0.08, w + 0.1, 0.1, 1.7));
    } else if (a < 121) {
      B.add(GEO.box, wood, mat4(cx, h / 2 - 0.1, -0.2, 0, 0, 0, w, h - 0.2, 1.4));          // pool table
      B.add(GEO.box, felt, mat4(cx, h - 0.05, -0.2, 0, 0, 0, w - 0.2, 0.1, 1.2));
    } else {
      B.add(GEO.box, brick3, mat4(cx, h / 2, -0.3, 0, 0, 0, w, h, 1.2));                       // chimney
      B.add(GEO.box, concrete, mat4(cx, h + 0.08, -0.3, 0, 0, 0, w + 0.2, 0.16, 1.4));
    }
  }
  for (let x = 2; x < 78; x += 6 + r() * 5) if (onGround(x) && !L.blocks.some(([a, b]) => x > a - 1 && x < b + 1)) {
    B.add(GEO.cyl, metal, mat4(x, 0.45, -1.8, 0, 0, 0, 0.6, 0.9, 0.6));
    B.add(GEO.cyl, metal, mat4(x, 0.93, -1.8, 0, 0, 0, 0.66, 0.06, 0.66));
  }
  // pigeon rails
  for (const x of L.birds) B.add(GEO.box, metal, mat4(x, 1.0, -0.45, 0, 0, 0, 0.8, 0.08, 0.08));
  for (const x of L.birds) B.add(GEO.box, metal, mat4(x, 0.5, -0.45, 0, 0, 0, 0.08, 1.0, 0.08));

  // ---- The dive bar interior (80-121) --------------------------------------------------------
  B.add(GEO.box, wood, mat4(100.5, 3.5, -3.6, 0, 0, 0, 41, 7, 0.4));                       // back wall
  B.add(GEO.box, dark, mat4(100.5, 6.8, -0.5, 0, 0, 0, 41, 0.3, 7));                       // ceiling beam
  for (const x of [80, 121]) B.add(GEO.box, brick, mat4(x, 4.4, -2.8, 0, 0, 0, 0.8, 5.0, 2));   // door frames
  B.add(GEO.box, wood, mat4(100.5, 0.55, -2.4, 0, 0, 0, 30, 1.1, 0.8));                    // bar counter
  B.add(GEO.box, M(0x5a3a22, { roughness: 0.4 }), mat4(100.5, 1.12, -2.3, 0, 0, 0, 30.2, 0.06, 1.0));
  for (let x = 86.5; x < 115; x += 1.6) {
    B.add(GEO.cyl, metal, mat4(x, 0.38, -1.6, 0, 0, 0, 0.06, 0.76, 0.06));                // stools
    B.add(GEO.cyl, M(0x8a1a1a), mat4(x, 0.8, -1.6, 0, 0, 0, 0.42, 0.1, 0.42));
  }
  for (let sy = 2.2; sy < 4.6; sy += 0.9) {
    B.add(GEO.box, wood, mat4(100.5, sy - 0.05, -3.25, 0, 0, 0, 26, 0.06, 0.3));
    for (let x = 88; x < 113; x += 0.35) if (r() < 0.75) B.add(GEO.cyl, bottleCols[Math.floor(r() * 3)], mat4(x, sy + 0.18, -3.25, 0, 0, 0, 0.12, 0.36, 0.12));
  }
  // band posters
  const posterTex = canvasTex(128, 180, (g, w, h) => {
    g.fillStyle = '#e9e3d6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff2e88'; g.fillRect(8, 8, w - 16, h * 0.55);
    g.fillStyle = '#111'; g.font = '22px Bungee, Impact, sans-serif'; g.textAlign = 'center';
    g.fillText('LIVE', w / 2, h * 0.75); g.font = '14px Bungee, Impact, sans-serif'; g.fillText('TONIGHT', w / 2, h * 0.88);
  });
  for (const x of [84, 96, 108, 118]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.26), new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.9 }));
    p.position.set(x, 4.8, -3.38); p.rotation.z = (r() - 0.5) * 0.1; scene.add(p);
  }

  // ---- Rooftops (121-240): skyline, water towers, antennas, billboard -----------------------
  for (let x = 110; x < 300; x += 7 + r() * 9) {
    const w = 5 + r() * 8, h = 6 + r() * 22, z = -25 - r() * 40;
    BG.add(GEO.box, M(0x15142a), mat4(x, h / 2 - 8, z, 0, 0, 0, w, h, w));
    for (let wy = -6; wy < h - 9; wy += 1.6) for (let wx = x - w / 2 + 0.8; wx < x + w / 2 - 0.5; wx += 1.3) if (r() < 0.4) BG.add(GEO.box, r() < 0.8 ? winLit : winBlue, mat4(wx, wy, z + w / 2 + 0.05, 0, 0, 0, 0.6, 0.8, 0.05));
  }
  for (const x of [131, 168, 210]) {
    B.add(GEO.cyl, wood, mat4(x, 4.2, -3.2, 0, 0, 0, 2.6, 2.6, 2.6));                     // water tower
    B.add(GEO.cone4, M(0x2a1a12), mat4(x, 6.0, -3.2, 0, Math.PI / 4, 0, 3.2, 1.0, 3.2));
    for (const dx of [-0.9, 0.9]) B.add(GEO.box, iron, mat4(x + dx, 1.45, -3.2, 0, 0, 0, 0.1, 2.9, 0.1));
  }
  for (let x = 125; x < 222; x += 9 + r() * 7) B.add(GEO.box, metal, mat4(x, 2.5, -2.4, 0, 0, 0, 0.05, 5, 0.05));     // antennas
  B.add(GEO.box, brick3, mat4(160, 0.6, -2.6, 0, 0, 0, 80, 1.2, 0.4));                      // back parapet
  // arena: two stone pillars for the gargoyle's perches
  const stone = M(0x7d7f8c, { roughness: 0.95 });
  for (const [a, b, y] of L.ledges.filter(([, , y]) => y > 4.5 && y < 5)) B.add(GEO.box, stone, mat4((a + b) / 2, (y - 0.3) / 2, -0.8, 0, 0, 0, b - a - 0.3, y - 0.3, 1.2));
  for (const [a, b, y] of L.ledges.filter(([a2]) => a2 > 120)) if (y < 4) B.add(GEO.box, iron, mat4((a + b) / 2, y / 2, -0.95, 0, 0, 0, 0.1, y, 0.1));
  world.solids.push({ x1: L.arena.x2, x2: 240, y1: 0, y2: 20 });
  B.add(GEO.box, brick3, mat4(L.arena.x2 + 1.5, 5, -0.5, 0, 0, 0, 3, 10, 7));
  world.gate = makeGate(scene, iron, L.arena.gate);

  // ---- Neon ---------------------------------------------------------------------------------
  const neons = [];
  const neon = (text, x, y, z, color, w = 3.2, h = 0.9) => {
    const n = textPanel(text, { w, h, color, neon: true, font: 'Bungee' });
    n.position.set(x, y, z); scene.add(n); neons.push(n);
  };
  neon('BAR', 20, 5.2, -6.8, '#ff2e88', 2.4, 1.1);
  neon('LIQUOR', 58, 4.6, -6.8, '#5ad1ff');
  neon('LIVE TONIGHT', 100.5, 5.6, -3.35, '#a6ff4d', 5, 1.0);
  neon('THE DIVE', 79, 7.6, -3.0, '#ffc94a', 3.6, 1.0);
  neon("ROCK 'N' ROLL ZOMBIES", 175, 9, -12, '#ff2e88', 14, 2.2);
  neon('OPEN 24/7', 40, 3.2, -6.8, '#ff6a2a', 2.6, 0.7);

  // Signs
  const sign = (x, text, color) => {
    const board = textPanel(text, { color });
    board.position.set(x, 2.0, -0.85); board.rotation.z = (r() - 0.5) * 0.12;
    scene.add(board);
    B.add(GEO.box, wood, mat4(x, 0.9, -0.9, 0, 0, 0, 0.12, 1.8, 0.12));
  };
  sign(6.5, 'THE BACK ALLEY →');
  sign(45.5, 'MIND THE SEWER', '#ffc94a');
  sign(160, 'AMPS: JUMP ON BEAT', '#a6ff4d');
  sign(196.5, 'ROOF · NO ENTRY', '#ff2e88');

  B.build(scene);
  BG.build(scene, { cast: false, receive: true });

  // street lamps in the alley, pendant lights in the bar, bulbs on the roofs
  for (let x = 4; x < 80; x += 12) world.addLantern(new THREE.Vector3(x, 3.2, -2.0));
  for (let x = 84; x < 120; x += 8) world.addLantern(new THREE.Vector3(x, 4.6, -1.4));
  for (let x = 126; x < 222; x += 11) if (onGround(x)) world.addLantern(new THREE.Vector3(x, 0.3, -1.6));
  const extra = new Batch();
  for (let x = 4; x < 80; x += 12) extra.add(GEO.box, iron, mat4(x, 1.6, -2.2, 0, 0, 0, 0.1, 3.2, 0.1));
  extra.build(scene);

  const skyUpdate = sky(scene, r, { top: '#05060d', mid: '#141a33', bottom: '#3a2550', fog: 0x1a1630, fogDensity: 0.011, cloudColor: 0x3a3a60, clouds: 7 });
  world.update = (t, dt, cam, pulse) => {
    skyUpdate(t, cam, pulse, 0);
    world.baseUpdate(t, cam, pulse);
    // neon buzz + beat
    neons.forEach((n, i) => { n.material.opacity = 0.75 + pulse * 0.25 - (Math.sin(t * 37 + i * 3) > 0.97 ? 0.5 : 0); });
  };
  return world;
}
