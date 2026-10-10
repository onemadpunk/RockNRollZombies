// Level 2: The Back Alley Dive Bar.
import * as THREE from 'three';
import { makeScaffold } from './models.js';
import { rng, Batch, mat4, canvasTex, GEO, textPanel, sky, baseLevel, surface } from './levelkit.js';
import { makeGate } from './level1.js';

// Zones: 1 Back alley (0-44) · 2 Fire escapes (44-80) · 3 The dive bar (80-121)
//        4 Rooftops (121-196) · Boss arena (200-222)
export const LEVEL2 = {
  id: 1,
  song: 'Bat Out of Hell',   // each gig is named after a classic rock song
  name: 'The Back Alley Dive Bar',
  short: 'Dive Bar',
  rescue: 'bassist',
  boss: 'gargoyle',
  bossName: 'The Gargoyle Punk', bossTag: 'Carved in 1890. Joined a band in 1977.',
  ground: [[-30, 44], [47, 58], [65, 124], [127, 240]],
  // [x1, x2, height, type]: dumpsters, a pool table, and buildings you climb and cross
  blocks: [[17, 19.2, 1.3, 'dumpster'], [31, 33.2, 1.3, 'dumpster'], [68, 79, 7.0, 'building'], [88, 90.6, 0.95, 'pool'],
           [130, 141, 4.5, 'building'], [144, 152, 6.0, 'building'], [156, 163, 4.5, 'building'],
           [166, 176, 7.0, 'building'], [180, 190, 5.0, 'building']],
  ledges: [[8, 12, 2.8], [22, 26, 2.8], [24, 27, 5.4],
           [48, 55.5, 3.0], [50, 56, 6.0], [56, 67.6, 6.6],          // fire escape landings + plank bridge
           [100, 103, 2.6], [110, 113, 2.6],
           [169.5, 174, 10.3],                                        // water tower catwalk (secret)
           // High route along the alley's fire escapes, joining the plank bridge up to the rooftops
           [12.5, 16.5, 5.2], [18, 21.5, 5.6], [28.5, 32, 5.6], [33.5, 37, 5.2], [38.5, 43, 5.0], [44.5, 47.5, 5.4],
           [200.3, 202.8, 4.8], [219.2, 221.7, 4.8], [206, 209, 2.8], [213, 216, 2.8]],
  // Up/Down at a ladder to climb. One up every building's left wall, so a fall is a setback, not a death.
  ladders: [{ x: 33.75, y1: 0, y2: 3.4 },
    { x: 50.5, y1: 0, y2: 3.0 }, { x: 54.6, y1: 3.0, y2: 6.0 }, { x: 67.6, y1: 0, y2: 7.0 },
    { x: 129.6, y1: 0, y2: 4.5 }, { x: 143.6, y1: 0, y2: 6.0 }, { x: 155.6, y1: 0, y2: 4.5 },
    { x: 165.6, y1: 0, y2: 7.0 }, { x: 179.6, y1: 0, y2: 5.0 }, { x: 170.3, y1: 7.0, y2: 10.3 },
  ],
  movers: [
    { kind: 'bob', x: 61.5, y: 0, amp: 1.6, w: 2.4 },
  ],
  amps: [],
  crates: [
    { x: 14, loot: 'sticks' }, { x: 51.8, y: 3.0, loot: 'gold' }, { x: 84, loot: 'jacket' }, { x: 117, loot: 'flame' },
    { x: 171.6, y: 10.3, loot: 'life' }, { x: 173.3, y: 10.3, loot: 'gold' }, { x: 137, y: 4.5, loot: 'vinyl' }, { x: 193, loot: 'jacket' },
  ],
  records: [{ x: 25.5, y: 6.7 }, { x: 111.5, y: 4.9 }, { x: 172.4, y: 11.7 }],
  hellbats: [{ x: 10, y: 8.5 }, { x: 160, y: 10 }],   // the first one meets you on flat ground at the start of the alley
  birds: [30, { x: 76.5, y: 8.15 }, { x: 150, y: 7.15 }, { x: 186, y: 6.15 }],
  pigeons: true,
  headbangers: [72, 147],
  hands: [],
  throwers: [{ x: 75, y: 7.0, kind: 'barfly' },   // (the one at 53.5 sat right over the Fire Escapes respawn point)
              { x: 139.5, y: 4.5, kind: 'barfly' }, { x: 188.5, y: 5.0, kind: 'barfly' }],
  // Secret areas: shoot the cracked wall (its cracks glow on the beat), then Up at the door
  secrets: [
    { x: 38, theme: 'cellar', name: 'THE CELLAR', loot: ['gold', 'life', 'gold'] },
    { x: 83.5, theme: 'staff', name: 'STAFF ONLY', loot: ['jacket', 'gold', 'flame'], guards: [['walker', 2], ['rat', 2]] },
  ],
  // Crew barricade: the Roadie barges through, everyone else climbs the ladder over it
  barricades: [[34.2, 35, 3.4]],   // well clear of the sewer pit (stepping off the top used to carry you into it)
  // Demo tape: hidden out on the high route; unlocks this gig's songs in the Jukebox menu
  tape: { x: 19.7, y: 7.0 },
  tracks: [['alley', 'Back Alley Boogie'], ['bar', 'Last Orders'], ['roof', 'Rooftop Run'], ['brawl', 'Bar Brawl'], ['boss2', 'Gargoyle Punk']],
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
    { x: 0, name: 'The Back Alley', song: 'alley', spawn: { walker: 0.6, rat: 0.4 }, max: 4, burst: 2 },
    { x: 44, checkpoint: 48.5, name: 'Fire Escapes', song: 'alley', spawn: { walker: 0.5, rat: 0.3, pogo: 0.2 }, max: 4 },
    { x: 80, checkpoint: 82, name: 'The Dive Bar', song: 'bar', spawn: { walker: 0.4, pogo: 0.3, rat: 0.3 }, max: 5, burst: 2 },
    { x: 121, checkpoint: 128.5, name: 'The Rooftops', song: 'roof', spawn: { pogo: 0.4, walker: 0.3, rat: 0.3 }, max: 5 },
  ],
  palette: { hemiSky: 0x7a8ad0, hemiGround: 0x201828, key: 0xb8c8ff, rim: 0xff6ab8,
    grade: { lift: [0.01, 0.015, 0.0], gamma: [1, 1.02, 1], gain: [1.02, 1.04, 0.96], sat: 1.05 } },   // colour mood: sickly neon green
  build: buildAlley,
};

function buildAlley(scene, quality) {
  const L = LEVEL2;
  const r = rng(2077);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const asphalt = M(0x26262e), concrete = M(0x3a3438), tar = M(0x1d1d24), brick = M(0x5a2e2a), brick2 = M(0x4a3a3a);
  const brick3 = M(0x3a3440), iron = M(0x1a1a20, { roughness: 0.5, metalness: 0.6 }), wood = M(0x3a2418, { roughness: 0.8 });
  const felt = surface(M(0x1e5a3a), 'fabric', 0.8, 0.6), dark = M(0x07060a, { roughness: 1 }), metal = M(0x6a6e78, { roughness: 0.4, metalness: 0.7 });
  const dumpster = M(0x2a5a3a, { roughness: 0.6, metalness: 0.3 });
  const winLit = new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xffa040, emissiveIntensity: 0.9 });
  const winBlue = new THREE.MeshStandardMaterial({ color: 0x80b0ff, emissive: 0x4070ff, emissiveIntensity: 0.8 });
  const winDark = M(0x101018, { roughness: 0.3 });
  const bottleCols = [0x3a8a3a, 0x8a5a1a, 0x2a4a8a].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.2 }));

  // surface textures: bricks, stone, wood grain, tarmac...
  surface(asphalt, 'tarmac', 3); surface(concrete, 'concrete', 3); surface(tar, 'tarmac', 2); surface(brick, 'brick', 3, 1.5); surface(brick2, 'brick', 3, 1.5);
  surface(brick3, 'brick', 3, 1.5); surface(wood, 'wood', 2); surface(metal, 'metal', 2, 0.6); surface(dumpster, 'metal', 2, 0.7);
  const world = baseLevel(scene, L, { soil: concrete, top: asphalt, pitMat: dark, ledgeMat: iron, pillarMat: null, makeMover: makeScaffold, lanternColor: 0xffc070 });
  const { B, onGround } = world;
  const BG = new Batch();
  const win = () => (r() < 0.35 ? winLit : r() < 0.15 ? winBlue : winDark);

  // Buildings you climb and run across: brick front with windows, tar roof, parapet lip
  for (const [a, b, h, type] of L.blocks) {
    if (type !== 'building') continue;
    const w = b - a, cx = (a + b) / 2, mat = a < 100 ? brick : r() < 0.5 ? brick3 : brick2;
    B.add(GEO.box, mat, mat4(cx, h / 2, -0.5, 0, 0, 0, w, h, 6));
    B.add(GEO.box, tar, mat4(cx, h + 0.04, -0.5, 0, 0, 0, w + 0.05, 0.08, 6.05));
    B.add(GEO.box, concrete, mat4(cx, h + 0.22, 2.4, 0, 0, 0, w + 0.1, 0.36, 0.3));          // parapet lip
    for (let x = a + 0.9; x < b - 0.6; x += 1.5) for (let y = 1.4; y < h - 0.6; y += 1.9) B.add(GEO.box, win(), mat4(x, y, 2.52, 0, 0, 0, 0.75, 1.1, 0.05));
    B.add(GEO.box, metal, mat4(cx + w * 0.25, h + 0.5, -1.8, 0, 0, 0, 1.0, 1.0, 1.0));       // AC unit
    world.addLantern(new THREE.Vector3(a + 1.6, h + 0.3, -1.6));
  }
  // Secret water tower on the tallest roof (climb its ladder to the catwalk)
  {
    const [a, b, y] = L.ledges.find(([, , yy]) => yy > 10);
    const cx = (a + b) / 2;
    B.add(GEO.cyl, wood, mat4(cx, y + 1.6, -1.6, 0, 0, 0, 3.2, 3.0, 3.2));
    B.add(GEO.cone4, M(0x2a1a12), mat4(cx, y + 3.6, -1.6, 0, Math.PI / 4, 0, 3.8, 1.0, 3.8));
    for (const dx of [-1.2, 1.2]) B.add(GEO.box, iron, mat4(cx + dx, (7 + y) / 2, -1.6, 0, 0, 0, 0.14, y - 7, 0.14));
    B.add(GEO.box, wood, mat4(cx, y - 0.08, -0.2, 0, 0, 0, b - a, 0.16, 1.4));               // catwalk boards
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
  // fire-escape railings on the ledges in the alley zone (the bridge gets planks)
  for (const [a, b, y] of L.ledges) {
    if (a > 80) continue;
    for (let x = a; x <= b; x += 0.35) B.add(GEO.box, iron, mat4(x, y + 0.45, -0.95, 0, 0, 0, 0.04, 0.9, 0.04));
    B.add(GEO.box, iron, mat4((a + b) / 2, y + 0.9, -0.95, 0, 0, 0, b - a, 0.05, 0.05));
    if (b - a > 8) B.add(GEO.box, wood, mat4((a + b) / 2, y - 0.1, -0.2, 0, 0, (r() - 0.5) * 0.02, b - a, 0.14, 1.2));
  }
  // dumpsters (solid blocks), bins, crates
  for (const [a, b, h, type] of L.blocks) {
    const w = b - a, cx = (a + b) / 2;
    if (type === 'building') continue;
    if (type === 'dumpster') {
      B.add(GEO.box, dumpster, mat4(cx, h / 2, -0.2, 0, 0, 0, w, h, 1.6));
      B.add(GEO.box, M(0x1a3a2a), mat4(cx, h + 0.05, -0.2, 0, 0, -0.08, w + 0.1, 0.1, 1.7));
    } else {
      B.add(GEO.box, wood, mat4(cx, h / 2 - 0.1, -0.2, 0, 0, 0, w, h - 0.2, 1.4));          // pool table
      B.add(GEO.box, felt, mat4(cx, h - 0.05, -0.2, 0, 0, 0, w - 0.2, 0.1, 1.2));
    }
  }
  for (let x = 2; x < 66; x += 6 + r() * 5) if (onGround(x) && !L.blocks.some(([a, b]) => x > a - 1 && x < b + 1) && !L.ladders.some((l) => Math.abs(l.x - x) < 1)) {
    B.add(GEO.cyl, metal, mat4(x, 0.45, -1.8, 0, 0, 0, 0.6, 0.9, 0.6));
    B.add(GEO.cyl, metal, mat4(x, 0.93, -1.8, 0, 0, 0, 0.66, 0.06, 0.66));
  }
  // pigeon rails (on the street or up on a roof edge)
  for (const bd of L.birds) {
    const x = bd.x ?? bd, y = (bd.y ?? 1.15) - 0.15;
    B.add(GEO.box, metal, mat4(x, y, -0.45, 0, 0, 0, 0.8, 0.08, 0.08));
    B.add(GEO.box, metal, mat4(x, y - 0.5, -0.45, 0, 0, 0, 0.08, 1.0, 0.08));
  }

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
  for (const x of [118, 210]) {
    B.add(GEO.cyl, wood, mat4(x, 4.2, -3.2, 0, 0, 0, 2.6, 2.6, 2.6));                     // water tower
    B.add(GEO.cone4, M(0x2a1a12), mat4(x, 6.0, -3.2, 0, Math.PI / 4, 0, 3.2, 1.0, 3.2));
    for (const dx of [-0.9, 0.9]) B.add(GEO.box, iron, mat4(x + dx, 1.45, -3.2, 0, 0, 0, 0.1, 2.9, 0.1));
  }
  for (const [a, b, h, type] of L.blocks) if (type === 'building' && a > 120) B.add(GEO.box, metal, mat4(b - 1.2, h + 1.6, -2.4, 0, 0, 0, 0.05, 3.2, 0.05));   // antennas
  // arena: two stone pillars for the gargoyle's perches
  const stone = surface(M(0x7d7f8c, { roughness: 0.95 }), 'stone', 2, 1.3);
  for (const [a, b, y] of L.ledges.filter(([, , y]) => y > 4.5 && y < 5)) B.add(GEO.box, stone, mat4((a + b) / 2, (y - 0.3) / 2, -0.8, 0, 0, 0, b - a - 0.3, y - 0.3, 1.2));
  for (const [a, b, y] of L.ledges.filter(([a2]) => a2 > 195)) if (y < 4) B.add(GEO.box, iron, mat4((a + b) / 2, y / 2, -0.95, 0, 0, 0, 0.1, y, 0.1));
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
  sign(127.9, 'ROOFTOP RUN ↑', '#a6ff4d');
  sign(64.3, 'CLIMB! ↑', '#a6ff4d');
  sign(196.5, 'ROOF · NO ENTRY', '#ff2e88');

  world.addCrowd({ x1: 84, x2: 117, z: -3.05, rows: 1, gap: 1.15, eyes: 0x5a9a2a, jump: 0.25 });
  world.addBeams({ at: [88, 96, 105, 113].map((x) => [x, 6.6, -2.6]), colors: [0xff2e88, 0x5ad1ff, 0xa6ff4d, 0xffc94a], length: 6.6, width: 1.1, sweep: 0.35, opacity: 0.09 });
  B.build(scene);
  BG.build(scene, { cast: false, receive: true });

  // street lamps in the alley, pendant lights in the bar, bulbs on the roofs
  for (let x = 4; x < 80; x += 12) world.addLantern(new THREE.Vector3(x, 3.2, -2.0));
  for (let x = 84; x < 120; x += 8) world.addLantern(new THREE.Vector3(x, 4.6, -1.4));
  for (let x = 192; x < 222; x += 11) world.addLantern(new THREE.Vector3(x, 0.3, -1.6));
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
