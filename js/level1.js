// Level 1: The Graveyard Gig.
import * as THREE from 'three';
import { makeCoffin } from './models.js';
import { rng, Batch, mat4, canvasTex, GEO, textPanel, sky, baseLevel, surface } from './levelkit.js';

// Zones: 1 Cemetery gates (0-40) · 2 Open graves (40-80) · 3 Churchyard (80-121)
//        4 The storm (121-166) · 5 Mosh pit (166-196) · Boss arena (200-222)
export const LEVEL1 = {
  id: 0,
  song: "Don't Fear the Reaper",   // each gig is named after a classic rock song
  name: 'The Graveyard Gig',
  short: 'Graveyard Gig',
  rescue: 'drummer',
  boss: 'bouncer',
  bossName: 'The Bouncer', bossTag: 'Head of security. Name not on the list.',
  ground: [[-30, 38], [41, 50], [57, 66], [73, 121], [124.5, 146], [152, 240]],
  blocks: [[23, 27, 1.8], [61, 64, 1.8], [95, 99, 1.7], [136, 140, 2.0], [158, 161, 1.8]],     // crypts
  ledges: [[30, 34, 2.6], [86, 90, 2.7], [102, 107, 2.7], [114, 117, 2.6], [129, 133, 6.3], [142, 145, 2.8],
           [173, 176, 2.7], [180, 183, 2.7], [203.5, 206.5, 2.9], [215.5, 218.5, 2.9],
           // The high route: up off the crypt or the step at 30, over the open graves on stone walkways,
           // across the churchyard roofs, and along the storm walkway. Flyers up here, zombies down there.
           [28, 31.5, 4.2], [33, 36.5, 4.6], [38, 41.5, 4.4], [43.5, 47, 5.0],
           [49.5, 52.5, 5.2], [54.5, 57.5, 5.6], [59.5, 63, 5.4], [65.5, 69, 5.2], [71, 74.5, 5.0],
           [80.2, 85, 5.2], [86.5, 90, 5.6], [91.5, 94.5, 5.4], [96, 99.5, 5.8], [101, 107, 5.6], [108.5, 112, 5.4],
           [124.9, 128.4, 5.8], [134.5, 138, 6.0], [139.5, 143, 6.4], [144.5, 148, 6.0], [149.5, 153.5, 5.6]],
  movers: [
    { kind: 'bob', x: 53.5, y: 0, amp: 1.6, w: 2.4 },
    { kind: 'slide', x: 69.5, y: 0.0, amp: 2.0, w: 2.9 },
    { kind: 'bob', x: 149, y: 0.1, amp: 1.8, w: 2.4 },
  ],
  amps: [[127.8, 0.95], [168.5, 0.95], [189, 0.95]],
  crates: [
    { x: 16, loot: 'sticks' }, { x: 46, loot: 'gold' }, { x: 88, loot: 'flame' }, { x: 112, loot: 'jacket' },
    { x: 130.2, y: 6.3, loot: 'life' }, { x: 132.2, y: 6.3, loot: 'gold' }, { x: 156, loot: 'vinyl' }, { x: 193, loot: 'jacket' },
  ],
  // Hidden platinum records: high up, off the beaten path.
  records: [{ x: 56, y: 7.0 }, { x: 104, y: 7.0 }, { x: 131.2, y: 7.6 }],
  // Hell Bats (our Red Arremer): one over the churchyard (solid ground on the first gig), one in the storm
  hellbats: [{ x: 98, y: 8 }, { x: 141, y: 8.5 }],
  birds: [19, 84, 118, 142.5],
  pigeons: false,
  headbangers: [100, 160],
  hands: [44.5, 47.5, 76, 78.5],
  throwers: [{ x: 62.5, y: 1.8, kind: 'digger' }, { x: 138, y: 2.0, kind: 'digger' }, { x: 164, y: 0, kind: 'digger' }],
  // Secret areas: shoot the cracked wall (its cracks glow on the beat), then Up at the door
  secrets: [
    { x: 18, theme: 'crypt', name: 'THE CRYPT', loot: ['gold', 'life', 'gold'] },
    { x: 92, theme: 'bonecellar', name: 'THE BONE CELLAR', loot: ['jacket', 'gold', 'vinyl'], guards: [['crawler', 2], ['walker', 1]] },
  ],
  // Crew barricade: the Roadie barges through, everyone else climbs the ladder over it
  barricades: [[82.5, 83.3, 3.4]],
  ladders: [{ x: 82.05, y1: 0, y2: 3.4 }, { x: 80.6, y1: 0, y2: 5.2 }, { x: 125.2, y1: 0, y2: 5.8 }],
  // Demo tape: hidden out on the high route; unlocks this gig's songs in the Jukebox menu
  tape: { x: 67.2, y: 6.6 },
  tracks: [['main', 'Graveyard Shift'], ['storm', 'Riders on the Storm Drain'], ['pit', 'Mosh Pit Mayhem'], ['boss', 'Name Not on the List']],
  checkpoint: 110,
  soundcheck: [9.5, 12, 14.5],
  storm: [121, 135],
  ambush: {
    name: 'Mosh pit!', sub: 'Survive three waves', trigger: 171, x1: 166.5, x2: 191.5, song: 'pit',
    waves: [
      [['pogo', 3], ['walker', 2]],
      [['crawler', 2], ['pogo', 2], ['walker', 2]],
      [['headbanger', 1], ['pogo', 2], ['ghost', 2], ['crawler', 1]],
    ],
  },
  arena: { gate: 199.5, x1: 200, x2: 222, trigger: 202 },
  start: 3,
  songs: { boss: 'boss', clear: 'main' },
  zones: [
    // burst: every few bars that many zombies claw up out of the ground around you
    { x: 0, name: 'Cemetery Gates', song: 'main', spawn: { walker: 1 }, max: 4, burst: 2 },
    { x: 40, checkpoint: 43, name: 'Open Graves', song: 'main', spawn: { walker: 0.6, crawler: 0.4 }, max: 4 },   // no bursts among the pits
    { x: 80, checkpoint: 82, name: 'The Churchyard', song: 'main', spawn: { walker: 0.5, ghost: 0.3, crawler: 0.2 }, max: 5, burst: 3 },
    { x: 121, checkpoint: 125.5, name: 'The Storm', song: 'storm', spawn: { walker: 0.4, pogo: 0.3, crawler: 0.3 }, max: 6, burst: 3 },
    { x: 166, name: 'The Mosh Pit', song: 'storm', spawn: { walker: 0.5, pogo: 0.5 }, max: 4 },
  ],
  palette: { hemiSky: 0x8a7cc8, hemiGround: 0x1a1220, key: 0xc4ccff, rim: 0xd9b8ff,
    grade: { lift: [0.0, 0.01, 0.035], gamma: [1, 1, 1.02], gain: [0.95, 1.0, 1.08], sat: 0.92 } },   // colour mood: cold graveyard blue
  build: buildGraveyard,
};

function buildGraveyard(scene, quality) {
  const L = LEVEL1;
  const r = rng(1977);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  const stoneA = M(0x6a6e80), stoneB = M(0x4d5163, { roughness: 0.95 }), mossy = M(0x4f5e4c, { roughness: 0.95 });
  const cryptMat = M(0x55586a, { roughness: 0.85 }), soil = M(0x33282f, { roughness: 1 }), grass = M(0x24341f, { roughness: 1 });
  const bark = M(0x1c1720, { roughness: 1 }), iron = M(0x15141a, { roughness: 0.5, metalness: 0.6 }), hill = M(0x1b1630, { roughness: 1 });
  const winGlow = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff8a20, emissiveIntensity: 2.2 });
  const hellGlow = new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 3, fog: false });
  const doorDark = M(0x07060a, { roughness: 1 }), planks = M(0x3a2a22);

  // surface textures: bricks, stone, wood grain, tarmac...
  surface(stoneA, 'stone', 2.4, 1.4); surface(stoneB, 'stone', 2.4, 1.4); surface(cryptMat, 'stone', 2.4, 1.4); surface(mossy, 'rock', 3);
  surface(soil, 'dirt', 3); surface(grass, 'grass', 2); surface(bark, 'wood', 1.5, 0.6); surface(planks, 'wood', 2); surface(hill, 'rock', 12, 0.5);
  const world = baseLevel(scene, L, { soil, top: grass, pitMat: doorDark, ledgeMat: stoneA, pillarMat: stoneB, makeMover: makeCoffin });
  const { B, onGround } = world;
  const BG = new Batch();

  for (const [a, b] of L.ground) for (let x = a + 0.5; x < b - 0.5; x += 1.2 + r() * 2) B.add(GEO.box, stoneB, mat4(x, -0.5 - r() * 1.5, 2.5, r(), r(), r(), 0.3 + r() * 0.4, 0.25 + r() * 0.3, 0.3));
  for (let i = 0; i < L.ground.length - 1; i++) {
    const a = L.ground[i][1], b = L.ground[i + 1][0];
    B.add(GEO.box, planks, mat4((a + b) / 2, -0.15, -2.8, 0, 0, (r() - 0.5) * 0.2, b - a + 0.6, 0.12, 0.5));
  }
  BG.add(GEO.box, grass, mat4(105, -0.35, -40, 0, 0, 0, 420, 0.5, 73));
  for (let x = -30; x < 240; x += 0.35) {
    if (!onGround(x)) continue;
    B.add(GEO.coneT, grass, mat4(x + r() * 0.3, 0.12, 2.4 - r() * 0.6, (r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.6, 0.12, 0.3 + r() * 0.25, 0.12));
  }
  // Crypts
  for (const [a, b, h] of L.blocks) {
    const w = b - a, cx = (a + b) / 2;
    B.add(GEO.box, cryptMat, mat4(cx, h / 2, -0.3, 0, 0, 0, w, h, 2.6));
    B.add(GEO.box, stoneB, mat4(cx, h + 0.1, -0.3, 0, 0, 0, w + 0.4, 0.2, 2.9));
    B.add(GEO.box, doorDark, mat4(cx, h * 0.35, 1.0, 0, 0, 0, w * 0.35, h * 0.7, 0.05));
    B.add(GEO.box, stoneB, mat4(cx, h + 0.55, -0.6, 0, 0, 0, 0.12, 0.7, 0.12));
    B.add(GEO.box, stoneB, mat4(cx, h + 0.7, -0.6, 0, 0, 0, 0.45, 0.12, 0.12));
    for (const sx of [-1, 1]) B.add(GEO.box, stoneA, mat4(cx + sx * (w / 2 - 0.15), h / 2, 1.05, 0, 0, 0, 0.3, h, 0.25));
  }
  // Perches for the crows
  for (const x of L.birds) B.add(GEO.box, stoneA, mat4(x, 0.5, -0.45, 0, 0, 0, 0.5, 1.0, 0.2));

  // Gravestones
  function grave(x, z, s, batch) {
    const mat = r() < 0.15 ? mossy : r() < 0.5 ? stoneA : stoneB;
    const tz = (r() - 0.5) * 0.3, tx = (r() - 0.5) * 0.2, t = r();
    if (t < 0.45) {
      const w = 0.7 * s, h = 0.9 * s, d = 0.18 * s;
      batch.add(GEO.box, mat, mat4(x, h / 2, z, tx, 0, tz, w, h, d));
      batch.add(GEO.cyl, mat, mat4(x - Math.sin(tz) * h / 2, h / 2 + Math.cos(tz) * h / 2, z, Math.PI / 2 + tx, 0, tz, w, d, w));
    } else if (t < 0.75) {
      const h = 1.3 * s;
      batch.add(GEO.box, mat, mat4(x, h / 2, z, tx, 0, tz, 0.16 * s, h, 0.16 * s));
      batch.add(GEO.box, mat, mat4(x - Math.sin(tz) * h * 0.22, h * 0.72, z, tx, 0, tz, 0.65 * s, 0.15 * s, 0.15 * s));
    } else if (t < 0.88) {
      const h = 1.9 * s;
      batch.add(GEO.box, mat, mat4(x, 0.15 * s, z, 0, 0, 0, 0.7 * s, 0.3 * s, 0.7 * s));
      batch.add(GEO.cyl4, mat, mat4(x, h / 2 + 0.3 * s, z, 0, Math.PI / 4, 0, 0.55 * s, h, 0.55 * s));
      batch.add(GEO.cone4, mat, mat4(x, h + 0.45 * s, z, 0, Math.PI / 4, 0, 0.4 * s, 0.3 * s, 0.4 * s));
    } else {
      batch.add(GEO.box, mat, mat4(x, 0.12 * s, z, 0, 0, 0, 0.8 * s, 0.24 * s, 1.6 * s));
      batch.add(GEO.box, mat, mat4(x, 0.45 * s, z - 0.8 * s, tx, 0, tz, 0.8 * s, 0.7 * s, 0.14 * s));
    }
  }
  for (let x = -25; x < 236; x += 1.3 + r() * 1.8) {
    const busy = L.blocks.some(([a, b]) => x > a - 0.5 && x < b + 0.5) || L.amps.some(([ax]) => Math.abs(x - ax) < 1);
    if (onGround(x) && !busy && !(x > 166 && x < 192)) grave(x, -1.2 - r() * 1.6, 0.8 + r() * 0.35, B);
    grave(x + r(), -4.5 - r() * 3.5, 0.9 + r() * 0.5, BG);
  }
  for (let x = -20; x < 236; x += 5 + r() * 6) if (onGround(x) && !(x > 166 && x < 192)) grave(x, 2.0 + r() * 0.3, 0.55, B);
  for (let x = 42; x < 80; x += 3 + r() * 2) if (onGround(x)) {
    B.add(GEO.sph, soil, mat4(x, 0, -1.6, 0, 0, 0, 0.9, 0.35, 0.5));
    B.add(GEO.box, doorDark, mat4(x + 1.1, 0.01, -1.6, 0, 0, 0, 1.0, 0.02, 0.6));
  }
  // Iron fence + entrance gate
  for (let x = -40; x < 245; x += 0.4) {
    BG.add(GEO.box, iron, mat4(x, 1.1, -9, 0, 0, 0, 0.06, 2.2, 0.06));
    BG.add(GEO.cone4, iron, mat4(x, 2.3, -9, 0, Math.PI / 4, 0, 0.1, 0.25, 0.1));
  }
  for (const y of [0.4, 1.9]) BG.add(GEO.box, iron, mat4(102, y, -9, 0, 0, 0, 285, 0.06, 0.06));
  for (const x of [-3, 2]) {
    B.add(GEO.box, stoneA, mat4(x, 2, -2.5, 0, 0, 0, 1, 4, 1));
    B.add(GEO.cone4, stoneB, mat4(x, 4.4, -2.5, 0, Math.PI / 4, 0, 1.3, 0.8, 1.3));
  }
  for (let x = -2.3; x < 1.4; x += 0.3) B.add(GEO.box, iron, mat4(x, 2.4, -2.5, 0, 0, 0, 0.07, 3.6 + Math.sin((x + 2.3) / 3.6 * Math.PI) * 0.8, 0.07));

  // Dead trees
  const branchG = new THREE.CylinderGeometry(0.6, 1, 1, 5);
  branchG.translate(0, 0.5, 0);
  function branch(batch, pos, dir, len, rad, depth) {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    batch.add(branchG, bark, new THREE.Matrix4().compose(pos, q, new THREE.Vector3(rad, len, rad)));
    if (depth === 0) return;
    const end = pos.clone().addScaledVector(dir, len);
    const n = 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(new THREE.Vector3((r() - 0.5) * 1.6, (r() - 0.2) * 0.8, (r() - 0.5) * 0.6)).normalize();
      branch(batch, end, d, len * (0.55 + r() * 0.2), rad * 0.6, depth - 1);
    }
  }
  const tree = (batch, x, z, s) => branch(batch, new THREE.Vector3(x, -0.1, z), new THREE.Vector3((r() - 0.5) * 0.3, 1, 0).normalize(), 2.4 * s, 0.28 * s, 4);
  for (let x = -20; x < 240; x += 9 + r() * 8) tree(BG, x, -6 - r() * 16, 0.9 + r() * 0.8);
  const fg = new Batch();
  for (let x = 34; x < 160; x += 38 + r() * 16) tree(fg, x, 7.5 + r() * 1.5, 1.0);
  fg.build(scene, { cast: false, receive: false });

  // Churches, castle, hills
  function church(x, z, s) {
    BG.add(GEO.box, stoneB, mat4(x, 4 * s, z, 0, 0, 0, 10 * s, 8 * s, 7 * s));
    BG.add(GEO.cone4, stoneB, mat4(x, 10 * s, z, 0, Math.PI / 4, 0, 10.5 * s, 4 * s, 9.5 * s));
    BG.add(GEO.box, stoneB, mat4(x - 6.5 * s, 7 * s, z + 1, 0, 0, 0, 3.5 * s, 14 * s, 3.5 * s));
    BG.add(GEO.cone4, stoneB, mat4(x - 6.5 * s, 16.5 * s, z + 1, 0, Math.PI / 4, 0, 3.6 * s, 5 * s, 3.6 * s));
    for (const wx of [-2.5, 0, 2.5]) BG.add(GEO.box, winGlow, mat4(x + wx * s, 4.5 * s, z + 3.55 * s, 0, 0, 0, 0.9 * s, 2.2 * s, 0.05));
    BG.add(GEO.box, winGlow, mat4(x - 6.5 * s, 11 * s, z + 1 + 1.8 * s, 0, 0, 0, 0.7 * s, 1.4 * s, 0.05));
  }
  church(68, -36, 1); church(104, -22, 0.8); church(150, -44, 1.1);
  const castle = new THREE.MeshBasicMaterial({ color: 0x0d0a18, fog: false });
  for (const [dx, h, w] of [[0, 30, 9], [-12, 20, 6], [12, 22, 6], [-22, 12, 5], [22, 14, 5]]) {
    BG.add(GEO.box, castle, mat4(275 + dx, h / 2, -130, 0, 0, 0, w, h, w));
    BG.add(GEO.cone4, castle, mat4(275 + dx, h + w * 0.5, -130, 0, Math.PI / 4, 0, w * 1.1, w * 1.4, w * 1.1));
    BG.add(GEO.box, hellGlow, mat4(275 + dx, h * 0.7, -130 + w / 2 + 0.1, 0, 0, 0, 0.9, 1.6, 0.1));
  }
  for (let x = -60; x < 320; x += 22 + r() * 18) BG.add(GEO.sph, hill, mat4(x, -6, -75 - r() * 30, 0, 0, 0, 22 + r() * 18, 12 + r() * 10, 14));

  // Mosh pit stage
  const P = L.ambush;
  const truss = new THREE.MeshStandardMaterial({ color: 0x8a8f9a, roughness: 0.4, metalness: 0.8 });
  const stackMat = M(0x141416, { roughness: 0.6 });
  for (const x of [P.x1 + 0.5, P.x2 - 0.5]) {
    B.add(GEO.box, truss, mat4(x, 4.5, -3, 0, 0, 0, 0.3, 9, 0.3));
    for (let y = 0; y < 3; y++) B.add(GEO.box, stackMat, mat4(x, 0.75 + y * 1.5, -2.2, 0, 0, 0, 1.6, 1.45, 1.1));
  }
  B.add(GEO.box, truss, mat4((P.x1 + P.x2) / 2, 9, -3, 0, 0, 0, P.x2 - P.x1, 0.3, 0.3));
  world.addBeams({ at: [0, 1, 2, 3].map((i) => [P.x1 + 3 + i * ((P.x2 - P.x1 - 6) / 3), 9, -2.5]), colors: [0xff2e88, 0xa6ff4d, 0x5ad1ff, 0xff2e88], length: 10, width: 1.6, opacity: 0.12 });
  // the undead audience: at the gig where it all started, and packed into the mosh pit
  world.addCrowd({ x1: -6, x2: 30, z: -9, rows: 2, gap: 1.0, eyes: 0x5a9a2a });
  world.addCrowd({ x1: P.x1 + 1.5, x2: P.x2 - 1.5, z: -7, rows: 3, gap: 0.9, eyes: 0x5a9a2a });

  // Boss arena: gate pillars, mausoleum back wall, gate bars that drop behind you
  const A = L.arena;
  for (const z of [-1.8, 1.8]) {
    B.add(GEO.box, stoneA, mat4(A.gate, 2.2, z, 0, 0, 0, 0.9, 4.4, 0.9));
    B.add(GEO.box, stoneB, mat4(A.gate, 4.55, z, 0, 0, 0, 1.2, 0.3, 1.2));
  }
  B.add(GEO.box, stoneB, mat4(A.x2 + 1.5, 4, -0.5, 0, 0, 0, 3, 8, 7));
  B.add(GEO.cone4, stoneB, mat4(A.x2 + 1.5, 9.2, -0.5, 0, Math.PI / 4, 0, 4, 2.4, 9));
  B.add(GEO.box, doorDark, mat4(A.x2 - 0.02, 2, -0.5, 0, 0, 0, 0.05, 4, 2.5));
  world.solids.push({ x1: A.x2, x2: 240, y1: 0, y2: 20 });
  world.gate = makeGate(scene, iron, A.gate);

  // Signs
  const sign = (x, text, color) => {
    const board = textPanel(text, { color });
    board.position.set(x, 2.0, -0.85); board.rotation.z = (r() - 0.5) * 0.12;
    scene.add(board);
    B.add(GEO.box, planks, mat4(x, 0.9, -0.9, 0, 0, 0, 0.12, 1.8, 0.12));
  };
  sign(6.5, 'GRAVEYARD GIG →');
  sign(43.5, 'MIND THE GRAVES', '#ffc94a');
  sign(126.2, 'AMPS: JUMP ON BEAT', '#a6ff4d');
  sign(164.5, 'MOSH PIT', '#ff2e88');
  sign(196.5, 'BACKSTAGE · KEEP OUT', '#ff2e88');

  B.build(scene);
  BG.build(scene, { cast: false, receive: true });

  for (let x = 6; x < 225; x += 11 + r() * 6) if (onGround(x)) world.addLantern(new THREE.Vector3(x, 0.25, -1.0 - r() * 0.8));

  // Sky, fog banks, rain, lightning
  const skyUpdate = sky(scene, r);
  const fogTex = canvasTex(256, 64, (g, w, h) => {
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = h * (0.4 + r() * 0.4), rad = 10 + r() * 22;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  });
  const fogLayers = [];
  for (const [z, y, op] of [[1.6, 0.35, 0.22], [-2.6, 0.5, 0.3], [-7, 0.8, 0.35]]) {
    const t = fogTex.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(14, 1);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(300, 1.6), new THREE.MeshBasicMaterial({ map: t, color: 0xa898d8, transparent: true, opacity: quality.low ? op * 0.7 : op, depthWrite: false }));
    f.position.set(105, y, z); scene.add(f); fogLayers.push(f);
  }
  const rain = makeRain(scene, r);
  const bolt = makeBolt(scene, r);

  world.stormAt = (x) => { const [a, b] = L.storm; return Math.min(1, Math.max(0, (x - a) / (b - a))); };
  world.strike = bolt.strike;
  world.update = (t, dt, cam, pulse, storm) => {
    skyUpdate(t, cam, pulse, storm);
    fogLayers.forEach((f, i) => { f.material.map.offset.x = t * (0.004 + i * 0.002) * (1 + storm * 3); });
    world.baseUpdate(t, cam, pulse);
    rain.update(dt, cam, storm);
    bolt.update(dt);
  };
  return world;
}

export function makeGate(scene, iron, x) {
  const gate = new THREE.Group();
  for (let z = -1.2; z <= 1.21; z += 0.3) {
    const bar = new THREE.Mesh(GEO.box, iron); bar.scale.set(0.09, 4.2, 0.09); bar.position.set(0, 2.1, z); bar.castShadow = true; gate.add(bar);
    const tip = new THREE.Mesh(GEO.cone4, iron); tip.scale.set(0.16, 0.3, 0.16); tip.position.set(0, 4.3, z); gate.add(tip);
  }
  for (const y of [0.6, 3.4]) { const rail = new THREE.Mesh(GEO.box, iron); rail.scale.set(0.08, 0.08, 2.6); rail.position.y = y; gate.add(rail); }
  gate.position.set(x, 6.5, 0);
  scene.add(gate);
  return gate;
}

export function makeRain(scene, r) {
  const N = 700;
  const pos = new Float32Array(N * 6);
  const seed = [];
  for (let i = 0; i < N; i++) seed.push({ x: (r() - 0.5) * 44, y: r() * 16, z: -8 + r() * 14, s: 18 + r() * 8 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xa8b8e8, transparent: true, opacity: 0, depthWrite: false }));
  rain.frustumCulled = false;
  scene.add(rain);
  return {
    update(dt, cam, amount) {
      rain.material.opacity = amount * 0.45;
      if (amount <= 0) return;
      const a = geo.attributes.position;
      for (let i = 0; i < N; i++) {
        const q = seed[i];
        q.y -= q.s * dt;
        if (q.y < -0.5) q.y += 16;
        const sx = cam.x + q.x - q.y * 0.08;
        a.setXYZ(i * 2, sx, q.y, q.z);
        a.setXYZ(i * 2 + 1, sx + 0.06, q.y + 0.55, q.z);
      }
      a.needsUpdate = true;
    },
  };
}

export function makeBolt(scene, r) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
  const bolt = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false, toneMapped: false }));
  bolt.frustumCulled = false;
  scene.add(bolt);
  let t = 0;
  return {
    strike(camX) {
      const a = geo.attributes.position;
      let x = camX + (r() - 0.5) * 30, y = 45;
      for (let i = 0; i < 30; i++) { a.setXYZ(i, x, y, -70); x += (r() - 0.5) * 3; y -= 1.6; }
      a.needsUpdate = true;
      bolt.material.opacity = 1; t = 0.18;
    },
    update(dt) { if (t > 0) { t -= dt; bolt.material.opacity = Math.max(0, t / 0.18); } },
  };
}
