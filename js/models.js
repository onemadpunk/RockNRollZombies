// Characters and props built from blocks. All characters face +z; the game rotates them.
// Limbs have two joints (hip/knee, shoulder/elbow) so runs, jumps and throws bend properly.
import * as THREE from 'three';

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });
const glow = (color, i = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.4 });

export const MAT = {
  skin: M(0xe2b192, { roughness: 0.65 }),
  skin2: M(0xb07850, { roughness: 0.65 }),
  leather: M(0x17151c, { roughness: 0.32, metalness: 0.15 }),
  stud: M(0xb8bcc8, { roughness: 0.4, metalness: 0.8 }),
  tee: M(0xe9e3d6),
  jeans: M(0x2c3c62, { roughness: 0.95 }),
  denim: M(0x4a6fa5, { roughness: 0.9 }),
  boot: M(0x3d0e15, { roughness: 0.4 }),
  sole: M(0x111111),
  mohawk: M(0xff2e88, { emissive: 0x5a0030, roughness: 0.5 }),
  blueHair: M(0x2fa8ff, { emissive: 0x08345a, roughness: 0.5 }),
  greenHawk: M(0x7dff3a, { emissive: 0x2a6a00, roughness: 0.5 }),
  dark: M(0x0b0b0e),
  white: M(0xf2f0ea, { roughness: 0.5 }),
  guitar: M(0xb8121f, { roughness: 0.25, metalness: 0.2 }),
  bass: M(0x111114, { roughness: 0.2, metalness: 0.3 }),
  neck: M(0x3b2414),
  chrome: M(0xcfd3da, { roughness: 0.25, metalness: 0.9 }),
  wood: M(0x4a2a1c, { roughness: 0.7 }),
  brass: M(0xc9a24a, { roughness: 0.35, metalness: 0.9 }),
  tartan: M(0x9a1a22, { roughness: 0.9 }),
  flannel: M(0x7a1f1f, { roughness: 0.9 }),
  stone: M(0x7d7f8c, { roughness: 0.95 }),
  stoneDark: M(0x55576a, { roughness: 0.95 }),
  zEye: glow(0xd9ff3a, 3),
  redEye: glow(0xff3020, 3),
  fireEye: glow(0xff8a20, 3.5),
  bone: M(0xeee6d2, { roughness: 0.6 }),
};

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}
function pivot(x, y, z, parent) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** Two-joint leg: hip pivot -> thigh, knee pivot -> shin + foot. Returns { hip, knee }. */
function leg(parent, x, hipY, wide, pants, foot, extra) {
  const hip = pivot(x, hipY, 0, parent);
  box(0.21 * wide, 0.47, 0.23, pants, 0, -0.22, 0, hip);
  const knee = pivot(0, -0.45, 0, hip);
  box(0.2 * wide, 0.44, 0.22, pants, 0, -0.2, 0, knee);
  foot(knee);
  if (extra) extra(hip, knee);
  return { hip, knee };
}
/** Two-joint arm: shoulder -> upper arm, elbow -> forearm + fist. */
function arm(parent, x, y, wide, upperMat, foreMat, fistMat) {
  const sh = pivot(x, y, 0, parent);
  const upper = box(0.13 * wide, 0.34, 0.13 * wide, upperMat, 0, -0.16, 0, sh);
  const el = pivot(0, -0.32, 0, sh);
  const fore = box(0.125 * wide, 0.3, 0.125 * wide, foreMat, 0, -0.14, 0, el);
  const fist = box(0.15 * wide, 0.14, 0.15 * wide, fistMat, 0, -0.34, 0, el);
  return { sh, el, upper, fore, fist };
}

// ---------------------------------------------------------------------------
// Heroes: 'punk' (guitar), 'drummer', 'bassist'. Same skeleton, different look.
export const HEROES = {
  punk: { name: 'The Punk', weapon: 'pick', jump: 15, blurb: 'Guitar picks, the fastest throws. The all-rounder.' },
  drummer: { name: 'The Drummer', weapon: 'sticks', jump: 16, blurb: 'Drumsticks in a spread. DOUBLE JUMP: press Jump again in the air.' },
  bassist: { name: 'The Bassist', weapon: 'vinyl', jump: 14.6, blurb: 'Boomerang vinyl. SLIDE TACKLE: press Down while running.' },
  singer: { name: 'The Singer', weapon: 'notes', jump: 15, blurb: 'Notes that weave up and down. GLIDE: hold Jump while falling.' },
  roadie: { name: 'The Roadie', weapon: 'spanner', jump: 14.6, blurb: 'Heavy spanners, double damage. BARGE: walks straight through crew barricades.' },
};

export function makeHero(kind = 'punk') {
  const root = new THREE.Group();
  const body = pivot(0, 0, 0, root);
  const p = { root, body, kind, jacket: [], spikes: [] };
  const skin = kind === 'bassist' ? MAT.skin2 : MAT.skin;
  const pants = kind === 'drummer' ? M(0x3a3a2a) : kind === 'singer' ? MAT.tartan : kind === 'roadie' ? M(0x5a5440) : MAT.jeans;
  const shoe = kind === 'drummer' ? M(0xe8e8e8) : MAT.boot;

  for (const side of [-1, 1]) {
    const L = leg(body, side * 0.14, 0.95, 1, pants, (knee) => {
      if (kind === 'drummer') {
        box(0.205, 0.2, 0.225, M(0xf0f0f0), 0, -0.32, 0, knee);                // high socks
        box(0.24, 0.16, 0.36, shoe, 0, -0.44, 0.05, knee);                    // sneakers
      } else {
        box(0.25, 0.2, 0.36, shoe, 0, -0.42, 0.05, knee);                      // boots
        box(0.26, 0.03, 0.05, MAT.brass, 0, -0.35, 0.21, knee);
      }
      box(0.27, 0.05, 0.38, MAT.sole, 0, -0.52, 0.05, knee);
    }, (hip, knee) => {
      if (kind === 'punk') box(0.12, 0.1, 0.02, skin, side * 0.02, 0.02, 0.12, knee);   // ripped knee
    });
    if (side < 0) { p.legL = L.hip; p.kneeL = L.knee; } else { p.legR = L.hip; p.kneeR = L.knee; }
  }

  const torso = pivot(0, 1.27, 0, body);
  p.torso = torso;
  const shirt = kind === 'bassist' ? MAT.flannel : kind === 'drummer' ? M(0x1d1d22) : kind === 'singer' || kind === 'roadie' ? M(0x141414) : MAT.tee;
  if (kind === 'singer') for (const sx of [-1, 1]) box(0.04, 0.5, 0.01, MAT.mohawk, sx * 0.08, 0, 0.135, torso);   // braces
  if (kind === 'roadie') { box(0.3, 0.1, 0.01, MAT.white, 0, 0.12, -0.135, torso); box(0.52, 0.1, 0.3, M(0x3a2a1a), 0, -0.26, 0, torso); }   // CREW + tool belt
  box(0.48, 0.62, 0.26, shirt, 0, 0, 0, torso);
  if (kind === 'punk') box(0.2, 0.2, 0.01, MAT.mohawk, 0, 0.05, 0.135, torso);
  if (kind === 'drummer') for (let i = 0; i < 3; i++) box(0.49, 0.04, 0.27, MAT.white, 0, 0.18 - i * 0.16, 0, torso);   // stripes
  if (kind === 'bassist') for (let i = 0; i < 3; i++) box(0.49, 0.03, 0.27, MAT.dark, 0, 0.2 - i * 0.18, 0, torso);
  box(0.5, 0.08, 0.28, MAT.dark, 0, -0.33, 0, torso);
  box(0.1, 0.07, 0.02, MAT.chrome, 0, -0.33, 0.145, torso);

  // Armour layer: leather jacket (punk), denim vest (drummer), biker vest (bassist)
  const coat = kind === 'drummer' ? MAT.denim : kind === 'roadie' ? M(0xd8ff2a, { emissive: 0x3a4a00, roughness: 0.5 }) : MAT.leather;   // roadie: hi-vis vest
  const J = (w, h, d, x, y, z) => { const m = box(w, h, d, coat, x, y, z, torso); p.jacket.push(m); return m; };
  J(0.56, 0.66, 0.05, 0, 0.01, -0.15);
  J(0.05, 0.66, 0.31, -0.28, 0.01, 0);
  J(0.05, 0.66, 0.31, 0.28, 0.01, 0);
  J(0.15, 0.66, 0.05, -0.2, 0.01, 0.15);
  J(0.15, 0.66, 0.05, 0.2, 0.01, 0.15);
  J(0.1, 0.18, 0.06, -0.13, 0.3, 0.17).rotation.z = 0.5;
  J(0.1, 0.18, 0.06, 0.13, 0.3, 0.17).rotation.z = -0.5;
  const patch = box(0.32, 0.26, 0.01, MAT.white, 0, 0.08, -0.18, torso); p.jacket.push(patch);
  p.jacket.push(box(0.18, 0.12, 0.012, kind === 'drummer' ? MAT.blueHair : MAT.mohawk, 0, 0.08, -0.182, torso));
  const studGeo = new THREE.SphereGeometry(0.022, 6, 4);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(studGeo, MAT.stud);
      s.position.set(sx * 0.2, 0.2 - i * 0.12, 0.18);
      torso.add(s); p.jacket.push(s);
    }
    // Spiked-jacket upgrade: shoulder spikes
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 5), MAT.chrome);
      sp.position.set(sx * (0.24 + i * 0.02), 0.34, 0.06 - i * 0.1);
      sp.rotation.z = -sx * 0.5;
      torso.add(sp); p.spikes.push(sp);
    }
  }

  const sleeve = kind === 'punk' ? coat : null;
  for (const side of [-1, 1]) {
    const A = arm(torso, side * 0.33, 0.27, 1, sleeve || skin, skin, skin);
    if (sleeve) { p.jacket.push(A.upper); }
    else p.jacket.push(box(0.15, 0.08, 0.15, coat, 0, -0.02, 0, A.sh));       // vest shoulder
    box(0.14, 0.07, 0.14, MAT.leather, 0, -0.26, 0, A.el);                       // wristband
    if (side < 0) { p.armL = A.sh; p.elbowL = A.el; } else { p.armR = A.sh; p.elbowR = A.el; }
  }

  const head = pivot(0, 1.62, 0, body);
  p.head = head;
  box(0.12, 0.1, 0.12, skin, 0, 0, 0, head);
  box(0.34, 0.38, 0.35, skin, 0, 0.22, 0, head);
  for (const sx of [-1, 1]) {
    if (kind === 'bassist') box(0.14, 0.07, 0.02, MAT.dark, sx * 0.08, 0.26, 0.18, head);   // shades
    else {
      box(0.08, 0.06, 0.02, MAT.white, sx * 0.08, 0.26, 0.18, head);
      box(0.04, 0.05, 0.02, MAT.dark, sx * 0.075, 0.255, 0.188, head);
    }
    box(0.1, 0.03, 0.03, MAT.dark, sx * 0.08, 0.32, 0.18, head).rotation.z = sx * -0.3;
    box(0.05, 0.08, 0.06, skin, sx * 0.18, 0.22, 0, head);
  }
  box(0.05, 0.07, 0.04, skin, 0, 0.2, 0.19, head);
  box(0.12, 0.03, 0.02, MAT.dark, 0.01, 0.12, 0.18, head).rotation.z = 0.15;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), MAT.chrome);
  ring.position.set(0.21, 0.17, 0.02); ring.rotation.y = Math.PI / 2; head.add(ring);
  const spikeGeo = new THREE.ConeGeometry(0.06, 1, 5);
  const hairStart = head.children.length;
  if (kind === 'punk') {
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(spikeGeo, MAT.mohawk);
      const h = 0.26 + Math.sin((i / 6) * Math.PI) * 0.16;
      s.scale.set(1, h, 1); s.position.set(0, 0.41 + h / 2 - 0.02, 0.16 - i * 0.055); s.rotation.x = -0.35 + i * 0.1;
      head.add(s);
    }
  } else if (kind === 'drummer') {
    // Liberty spikes in every direction + headband
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const s = new THREE.Mesh(spikeGeo, MAT.blueHair);
      s.scale.set(0.9, 0.32, 0.9);
      s.position.set(Math.cos(a) * 0.12, 0.47, Math.sin(a) * 0.12);
      s.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
      head.add(s);
    }
    box(0.36, 0.06, 0.37, MAT.mohawk, 0, 0.33, 0, head);
  } else if (kind === 'roadie') {
    // Beanie + big beard
    const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x2a2a30));
    beanie.position.y = 0.38; beanie.scale.set(1, 0.9, 1.05); head.add(beanie);
    box(0.36, 0.06, 0.37, M(0x3a3a44), 0, 0.38, 0, head);
    const beard = M(0x5a3a1e);
    box(0.32, 0.2, 0.08, beard, 0, 0.1, 0.16, head);
    box(0.2, 0.16, 0.08, beard, 0, -0.02, 0.17, head);
  } else if (kind === 'singer') {
    // Bleached quiff
    const blond = M(0xf3e2a0, { roughness: 0.6 });
    box(0.36, 0.12, 0.38, blond, 0, 0.44, 0, head);
    const q = box(0.3, 0.16, 0.22, blond, 0, 0.52, 0.12, head); q.rotation.x = -0.5;
    for (const sx of [-1, 1]) box(0.05, 0.22, 0.24, blond, sx * 0.18, 0.3, -0.02, head);
  } else {
    // Long black hair
    box(0.37, 0.1, 0.38, MAT.dark, 0, 0.42, 0, head);
    box(0.38, 0.6, 0.1, MAT.dark, 0, 0.12, -0.17, head);
    for (const sx of [-1, 1]) box(0.06, 0.5, 0.2, MAT.dark, sx * 0.19, 0.14, -0.06, head);
  }
  // Move the hair onto a pivot at the scalp: the game bounces and sweeps it (not the roadie's beard)
  const hair = pivot(0, 0.38, 0, head);
  if (kind !== 'roadie') for (const o of head.children.slice(hairStart)) { if (o === hair) continue; head.remove(o); o.position.y -= 0.38; hair.add(o); }
  p.hair = hair;

  // Instrument on the back, swung round for a solo
  const gtr = pivot(0, 0, -0.22, torso);
  if (kind === 'roadie') {
    // a giant spanner across the back
    box(0.07, 0.8, 0.04, MAT.chrome, 0, 0.1, 0, gtr);
    box(0.24, 0.16, 0.04, MAT.chrome, 0, 0.52, 0, gtr);
    box(0.08, 0.1, 0.05, MAT.dark, 0, 0.6, 0, gtr);
  } else if (kind === 'singer') {
    // microphone and a loop of cable
    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), MAT.chrome); mic.position.y = 0.32; gtr.add(mic);
    box(0.05, 0.3, 0.05, MAT.dark, 0, 0.12, 0, gtr);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 20), MAT.dark); loop.position.y = -0.12; gtr.add(loop);
  } else if (kind === 'drummer') {
    for (const dx of [-0.05, 0.05]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 6), M(0xe8c690));
      st.position.set(dx, 0.1, 0); gtr.add(st);
    }
  } else {
    const bodyG = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.07, 14), kind === 'bassist' ? MAT.bass : MAT.guitar);
    bodyG.rotation.x = Math.PI / 2; bodyG.scale.set(1, 1, 1.25); bodyG.position.y = -0.2; bodyG.castShadow = true;
    gtr.add(bodyG);
    box(0.06, kind === 'bassist' ? 0.95 : 0.75, 0.04, MAT.neck, 0, kind === 'bassist' ? 0.4 : 0.3, 0, gtr);
    box(0.1, 0.14, 0.04, MAT.dark, 0, kind === 'bassist' ? 0.92 : 0.72, 0, gtr);
    box(0.16, 0.04, 0.02, MAT.chrome, 0, -0.18, 0.045, gtr);
  }
  p.guitar = gtr;
  p.slung = () => { gtr.position.set(0, 0, -0.22); gtr.rotation.set(0, 0, 0.75); };
  p.playing = () => { gtr.position.set(0.05, -0.15, 0.3); gtr.rotation.set(0, 0, -1.2); };
  p.slung();

  /** 0 = no jacket, 1 = jacket, 2 = spiked jacket */
  p.setArmor = (n) => { p.jacket.forEach((m) => (m.visible = n > 0)); p.spikes.forEach((m) => (m.visible = n > 1)); };
  p.setJacket = (on) => p.setArmor(on ? 1 : 0);
  p.setArmor(1);
  return p;
}
export const makePunk = () => makeHero('punk');

// ---------------------------------------------------------------------------
// Zombies: 'walker' | 'headbanger' | 'pogo' | 'digger' | 'barfly' | 'bouncer'
const ZSKIN = [0x7d9a5a, 0x6c8a63, 0x8a9a6a, 0x5f7f58, 0x7a8f78];
const ZCLOTH = [0x4a3b33, 0x3a4250, 0x55402a, 0x40303f, 0x2f3b2f, 0x6a5a40];

export function makeZombie(variant = 'walker') {
  const skin = M(pick(ZSKIN), { roughness: 0.85 });
  const clothCol = { bouncer: 0x0d0d10, pogo: 0x16141a, barfly: 0xd8d2c0 }[variant] ?? pick(ZCLOTH);
  const cloth = M(clothCol);
  const pants = M(variant === 'bouncer' ? 0x1b1b22 : variant === 'pogo' ? 0x9a1a22 : pick([0x2a2622, 0x2b3346, 0x3a3020]));
  const root = new THREE.Group();
  const body = pivot(0, 0, 0, root);
  const z = { root, body, mats: [skin, cloth, pants] };
  const wide = variant === 'bouncer' ? 1.35 : variant === 'barfly' ? 1.15 : 1;
  const look = variant === 'walker' ? pick(['plain', 'plain', 'onearm', 'crew', 'cap', 'suit', 'poncho', 'wellies']) : variant;

  for (const side of [-1, 1]) {
    const L = leg(body, side * 0.14 * wide, 0.92, wide, pants, (knee) => {
      box(0.22 * wide, 0.12, 0.3, MAT.sole, 0, -0.43, 0.04, knee);
    }, (hip, knee) => {
      if (variant === 'pogo') for (let i = 0; i < 2; i++) { box(0.215, 0.025, 0.235, MAT.dark, 0, -0.1 - i * 0.2, 0, hip); box(0.205, 0.025, 0.225, MAT.dark, 0, -0.1 - i * 0.2, 0, knee); }
    });
    if (side < 0) { z.legL = L.hip; z.kneeL = L.knee; } else { z.legR = L.hip; z.kneeR = L.knee; }
  }
  const torso = pivot(0, 1.25, 0, body);
  z.torso = torso;
  box(0.5 * wide, 0.62, 0.27 * wide, look === 'suit' ? M(0x1c1c24) : cloth, 0, 0, 0, torso);
  if (variant === 'barfly') box(0.5, 0.3, 0.12, skin, 0, -0.18, 0.15, torso);           // beer belly
  if (look === 'suit') { box(0.1, 0.5, 0.01, MAT.white, 0, 0.04, 0.14, torso); box(0.05, 0.35, 0.012, MAT.tartan, 0, 0.0, 0.146, torso); }
  if (variant === 'walker' || variant === 'digger') {
    box(0.16, 0.2, 0.01, skin, 0.08, -0.12, 0.14, torso);
    for (let i = 0; i < 3; i++) box(0.14, 0.02, 0.012, MAT.bone, 0.08, -0.06 - i * 0.06, 0.146, torso);
  }
  if (look === 'poncho') {
    const pc = M(pick([0xf2d23a, 0x3a8ad8, 0xd83a6a, 0x8ad83a]), { roughness: 0.4, transparent: true, opacity: 0.85 });
    box(0.66, 0.5, 0.36, pc, 0, 0.06, 0, torso);
    box(0.36, 0.2, 0.36, pc, 0, 0.36, -0.03, torso);            // hood down
  }
  if (look === 'wellies') for (const kn of [z.kneeL, z.kneeR]) box(0.24, 0.4, 0.3, M(0x2a5a2a, { roughness: 0.3 }), 0, -0.3, 0.02, kn);
  if (look === 'crew') { box(0.3, 0.12, 0.01, MAT.white, 0, 0.1, -0.14, torso); box(0.2, 0.08, 0.01, MAT.white, 0, 0.12, 0.14, torso); }
  if (variant === 'headbanger') box(0.22, 0.22, 0.01, M(0xd9d0b8), 0, 0.05, 0.14, torso);
  if (variant === 'pogo') {
    for (let i = 0; i < 6; i++) box(0.04, 0.04, 0.04, MAT.stud, -0.2 + i * 0.08, 0.3, 0.12, torso);
    box(0.16, 0.16, 0.01, MAT.greenHawk, 0, 0.0, 0.14, torso);
  }
  for (const side of [-1, 1]) {
    const bare = variant === 'barfly' || side < 0;
    const A = arm(torso, side * 0.32 * wide, 0.25, wide, bare ? skin : cloth, skin, skin);
    A.sh.rotation.x = -1.35 - Math.random() * 0.2;
    A.el.rotation.x = -0.2;
    if (side < 0) { z.armL = A.sh; z.elbowL = A.el; } else { z.armR = A.sh; z.elbowR = A.el; }
  }
  if (look === 'onearm') {
    z.armR.visible = false;
    box(0.14, 0.1, 0.14, M(0x6a1010), 0.32, 0.22, 0, torso);
  }
  if (variant === 'digger') {
    const sh = pivot(0, -0.34, 0, z.elbowR);
    box(0.05, 1.3, 0.05, MAT.wood, 0, 0.2, 0, sh);
    box(0.28, 0.32, 0.03, MAT.chrome, 0, -0.55, 0.0, sh);
    z.shovel = sh;
  }
  if (variant === 'barfly') {
    const bt = pivot(0, -0.34, 0.05, z.elbowR);
    box(0.08, 0.22, 0.08, M(0x2a6a2a, { roughness: 0.2, transparent: true, opacity: 0.85 }), 0, 0.05, 0, bt);
  }
  const head = pivot(0, 1.6, 0, body);
  z.head = head;
  box(0.32 * wide, 0.36, 0.34, skin, 0, 0.2, 0.02, head);
  const eye = variant === 'bouncer' ? MAT.redEye : MAT.zEye;
  for (const sx of [-1, 1]) box(0.06, 0.05, 0.02, eye, sx * 0.08, 0.24, 0.2, head);
  const jaw = pivot(0, 0.08, 0.05, head);
  box(0.24 * wide, 0.08, 0.26, skin, 0, -0.02, 0, jaw);
  box(0.16, 0.04, 0.02, MAT.dark, 0, 0.03, 0.14, jaw);
  z.jaw = jaw;
  if (variant === 'headbanger') {
    box(0.36, 0.1, 0.38, M(0x1a1410), 0, 0.42, 0.01, head);
    box(0.38, 0.5, 0.1, M(0x1a1410), 0, 0.15, -0.16, head);
  }
  if (variant === 'pogo') {
    const spikeGeo = new THREE.ConeGeometry(0.05, 1, 5);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(spikeGeo, MAT.greenHawk);
      const h = 0.22 + Math.sin((i / 5) * Math.PI) * 0.14;
      s.scale.set(1, h, 1); s.position.set(0, 0.38 + h / 2, 0.14 - i * 0.055); s.rotation.x = -0.3 + i * 0.1;
      head.add(s);
    }
  }
  if (look === 'cap' || variant === 'digger' || variant === 'barfly') {
    const capc = variant === 'barfly' ? M(0x1a3a7a) : M(0x3a3226);
    box(0.36, 0.08, 0.38, capc, 0, 0.42, 0.02, head);
    box(0.36, 0.03, 0.15, capc, 0, 0.39, 0.25, head);
  }
  if (variant === 'bouncer') {
    box(0.36, 0.07, 0.03, MAT.dark, 0, 0.27, 0.2, head);
    box(0.1, 0.12, 0.012, MAT.chrome, 0.16, 0.0, 0.15, torso);
    box(0.42, 0.1, 0.01, MAT.white, 0, 0.15, -0.19, torso);
  }
  head.rotation.z = (Math.random() - 0.5) * 0.4;
  return z;
}

export function makeCrawler() {
  const skin = M(pick(ZSKIN), { roughness: 0.85 });
  const cloth = M(pick(ZCLOTH));
  const root = new THREE.Group();
  const body = pivot(0, 0, 0, root);
  const z = { root, body, mats: [skin, cloth] };
  box(0.48, 0.26, 0.6, cloth, 0, 0.2, -0.05, body);
  for (let i = 0; i < 4; i++) box(0.08, 0.08, 0.08, MAT.bone, 0, 0.12, -0.4 - i * 0.09, body);
  const head = pivot(0, 0.32, 0.35, body);
  box(0.3, 0.3, 0.3, skin, 0, 0.05, 0.05, head);
  for (const sx of [-1, 1]) box(0.06, 0.05, 0.02, MAT.zEye, sx * 0.07, 0.1, 0.21, head);
  box(0.14, 0.06, 0.02, MAT.dark, 0, -0.04, 0.21, head);
  z.head = head;
  for (const side of [-1, 1]) {
    const a = pivot(side * 0.3, 0.3, 0.2, body);
    box(0.12, 0.55, 0.12, side < 0 ? skin : cloth, 0, -0.27, 0, a);
    box(0.14, 0.12, 0.14, skin, 0, -0.55, 0, a);
    side < 0 ? (z.armL = a) : (z.armR = a);
  }
  return z;
}

// Sewer rat: low and fast, comes in packs. Duck to hit it.
export function makeRat() {
  const fur = M(pick([0x4a4038, 0x3a3530, 0x5a4a40]), { roughness: 1 });
  const root = new THREE.Group();
  const body = pivot(0, 0, 0, root);
  const z = { root, body, mats: [fur] };
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), fur);
  b.scale.set(0.9, 0.75, 1.5); b.position.y = 0.2; b.castShadow = true; body.add(b);
  const head = pivot(0, 0.22, 0.32, body);
  const h = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 8), fur);
  h.rotation.x = Math.PI / 2; h.position.z = 0.1; head.add(h);
  for (const sx of [-1, 1]) {
    box(0.04, 0.04, 0.02, MAT.redEye, sx * 0.07, 0.06, 0.07, head);
    const ear = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), M(0xd88a8a));
    ear.position.set(sx * 0.09, 0.12, 0.0); ear.rotation.y = sx * 0.4; head.add(ear);
  }
  z.head = head;
  const tail = pivot(0, 0.18, -0.3, body);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.55, 5), M(0xc88a8a));
  t.rotation.x = Math.PI / 2; t.position.z = -0.27; tail.add(t);
  z.tail = tail;
  z.legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const l = pivot(sx * 0.12, 0.12, sz * 0.15, body);
    box(0.05, 0.12, 0.05, fur, 0, -0.06, 0, l);
    z.legs.push(l);
  }
  return z;
}

export function makeGhost() {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc8d6ff, emissive: 0x6a7cff, emissiveIntensity: 1.1, transparent: true, opacity: 0.8, depthWrite: false, roughness: 0.4,
  });
  const sheet = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.5, 14, 1, true), mat);
  sheet.position.y = 0.75; root.add(sheet);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), mat);
  head.position.y = 1.4; root.add(head);
  const hole = M(0x05040a);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), hole);
    e.scale.set(1, 1.4, 0.4); e.position.set(sx * 0.14, 1.48, 0.37); root.add(e);
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), hole);
  mouth.scale.set(1, 1.6, 0.4); mouth.position.set(0, 1.25, 0.39); root.add(mouth);
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), mat);
    a.position.set(sx * 0.5, 1.0, 0.15); a.rotation.z = sx * 1.2; a.rotation.x = -0.6; root.add(a); arms.push(a);
  }
  return { root, mat, arms };
}

export function makeHand() {
  const skin = M(pick(ZSKIN), { roughness: 0.85 });
  const root = new THREE.Group();
  box(0.16, 0.8, 0.16, skin, 0, 0.4, 0, root);
  box(0.22, 0.2, 0.12, skin, 0, 0.88, 0, root);
  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const f = pivot(-0.08 + i * 0.055, 0.97, 0, root);
    box(0.04, 0.2, 0.05, skin, 0, 0.1, 0, f); fingers.push(f);
  }
  const thumb = pivot(0.12, 0.85, 0, root);
  box(0.04, 0.14, 0.05, skin, 0, 0.07, 0, thumb); thumb.rotation.z = -0.8;
  return { root, mats: [skin], fingers };
}

/** Crow (graveyard) or pigeon (alley). */
export function makeCrow(pigeon = false) {
  const root = new THREE.Group();
  const black = M(pigeon ? 0x6a6e7a : 0x121016, { roughness: 0.5 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), black);
  b.scale.set(0.8, 0.75, 1.3); b.castShadow = true; root.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), pigeon ? M(0x4a6a5a) : black);
  h.position.set(0, 0.12, 0.26); root.add(h);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 6), M(pigeon ? 0xd8a060 : 0x2b2620));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.1, 0.42); root.add(beak);
  for (const sx of [-1, 1]) box(0.035, 0.035, 0.02, MAT.redEye, sx * 0.07, 0.16, 0.37, root);
  box(0.16, 0.03, 0.25, black, 0, 0.02, -0.33, root).rotation.x = -0.3;
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = pivot(sx * 0.12, 0.05, 0, root);
    box(0.5, 0.03, 0.26, black, sx * 0.25, 0, 0, w);
    wings.push(w);
  }
  return { root, wings };
}

// Level 2 boss: a stone gargoyle with a punk mohawk. Big wings, glowing eyes.
export function makeGargoyle() {
  const z = makeZombie('walker');
  const stone = MAT.stone.clone(), dark = MAT.stoneDark.clone();
  z.mats = [stone, dark];
  z.root.traverse((o) => {
    if (o.isMesh && o.material !== MAT.zEye && o.material !== MAT.dark) o.material = Math.random() < 0.8 ? stone : dark;
    if (o.isMesh && o.material === MAT.zEye) o.material = MAT.fireEye;
  });
  z.armR.visible = true;
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = pivot(sx * 0.2, 0.25, -0.18, z.torso);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(sx * 1.3, 0.5); shape.lineTo(sx * 1.5, -0.2); shape.lineTo(sx * 1.1, -0.5);
    shape.lineTo(sx * 0.8, -0.3); shape.lineTo(sx * 0.5, -0.6); shape.lineTo(sx * 0.3, -0.3); shape.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0x5a5c6c, roughness: 0.9, side: THREE.DoubleSide }));
    m.castShadow = true; w.add(m); wings.push(w);
  }
  z.wings = wings;
  // horns + stone mohawk
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 6), dark);
    h.position.set(sx * 0.14, 0.45, 0.05); h.rotation.z = -sx * 0.5; z.head.add(h);
  }
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), MAT.mohawk);
    s.position.set(0, 0.5, 0.14 - i * 0.06); s.rotation.x = -0.3 + i * 0.1; z.head.add(s);
  }
  return z;
}

// Level 3 boss: a floating ghost singer in a long dress.
export function makeBanshee() {
  const root = new THREE.Group();
  const body = pivot(0, 0, 0, root);
  const dress = new THREE.MeshStandardMaterial({ color: 0xd8f0e8, emissive: 0x3ab090, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.5, side: THREE.DoubleSide });
  const pale = new THREE.MeshStandardMaterial({ color: 0xe8f4f0, emissive: 0x2a6a5a, emissiveIntensity: 0.3, roughness: 0.6 });
  const hair = M(0xf4faff, { roughness: 0.7 });
  const z = { root, body, mats: [dress, pale] };
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.3, 14, 1, true), dress);
  skirt.position.y = 1.15; skirt.castShadow = true; body.add(skirt);
  box(0.46, 0.6, 0.28, dress, 0, 2.45, 0, body);
  const head = pivot(0, 2.95, 0, body);
  z.head = head;
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), pale); h.position.y = 0.1; head.add(h);
  for (const sx of [-1, 1]) box(0.09, 0.12, 0.03, MAT.dark, sx * 0.1, 0.15, 0.24, head);
  z.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.03), new THREE.MeshBasicMaterial({ color: 0x9affd8, toneMapped: false }));
  z.mouth.position.set(0, -0.02, 0.25); head.add(z.mouth);
  box(0.6, 0.18, 0.5, hair, 0, 0.32, -0.04, head);
  box(0.62, 1.4, 0.12, hair, 0, -0.45, -0.24, head);                            // long hair down the back
  for (const sx of [-1, 1]) box(0.1, 1.0, 0.2, hair, sx * 0.3, -0.3, -0.06, head);
  for (const side of [-1, 1]) {
    const a = pivot(side * 0.3, 2.65, 0, body);
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1.1, 8), dress);
    arm.position.y = -0.5; arm.rotation.x = Math.PI; a.add(arm);
    side < 0 ? (z.armL = a) : (z.armR = a);
  }
  return z;
}

// Level 4 boss: a mummy in flares with a gold afro. Disco never died.
export function makeMummy() {
  const z = makeZombie('mummy');
  // bandage texture: wrapped strips in a few shades, with dark gaps
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  for (let y = 0; y < 64; y += 8) {
    g.fillStyle = ['#e8dcc0', '#d8c8a0', '#efe4cc', '#c8b890'][(y / 8) % 4];
    g.save(); g.translate(0, y); g.rotate(((y / 8) % 2 ? 1 : -1) * 0.06); g.fillRect(-4, 0, 72, 8); g.restore();
    g.fillStyle = 'rgba(60,45,25,0.55)'; g.fillRect(0, y + 7, 64, 1);
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 2);
  const wrap = M(0xffffff, { map: tex, roughness: 0.95 });
  const flare = M(0xb04aff, { roughness: 0.25, metalness: 0.5, emissive: 0x3a1060 });
  z.mats = [wrap];
  z.root.traverse((o) => { if (o.isMesh && o.material !== MAT.zEye && o.material !== MAT.dark && o.material !== MAT.sole) o.material = wrap; });
  // loose bandage ends
  for (const [x, y, rz] of [[0.2, -0.2, 0.5], [-0.18, 0.1, -0.4]]) box(0.06, 0.34, 0.03, wrap, x, y, 0.15, z.torso).rotation.z = rz;
  // flares
  for (const kn of [z.kneeL, z.kneeR]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 10), flare); f.position.set(0, -0.26, 0.02); kn.add(f); }
  // a glittery shirt collar poking out
  box(0.3, 0.12, 0.3, flare, 0, 0.32, 0, z.torso);
  // gold afro + shades
  const afro = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), M(0xffc94a, { roughness: 0.3, metalness: 0.7, emissive: 0x4a3000 }));
  afro.position.set(0, 0.5, -0.07); afro.scale.set(1.15, 0.85, 1); z.head.add(afro);
  box(0.36, 0.08, 0.03, MAT.dark, 0, 0.25, 0.21, z.head);
  return z;
}

export function makeDiscoBall() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.6, flatShading: true, emissive: 0x7a7a90, emissiveIntensity: 0.8 }));
  g.add(ball);
  // a few mirror tiles that catch the light and flash
  const glint = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 });
  for (let i = 0; i < 18; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), glint);
    const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
    t.position.setFromSphericalCoords(0.72, b, a); t.lookAt(0, 0, 0); ball.add(t);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 6), MAT.chrome); rod.position.y = 3.6; g.add(rod);
  g.userData.ball = ball; g.userData.glint = glint;
  return g;
}

// Ferris wheel car: you stand on its floor (top at y = 0); it hangs from a rod above.
export function makeGondola(w = 1.8) {
  const g = new THREE.Group();
  const paint = M(pick([0xd83a6a, 0x3a8ad8, 0xf2d23a, 0x8a3ad8]), { roughness: 0.4, metalness: 0.3 });
  box(w, 0.12, 1.1, paint, 0, -0.06, 0, g);                                       // floor
  box(w, 0.7, 0.06, paint, 0, -0.4, 0.55, g);                                     // front panel (below the floor line)
  box(w, 1.0, 0.06, paint, 0, 0.0, -0.55, g);                                     // back panel
  for (const x of [-w / 2, w / 2]) box(0.06, 0.9, 1.1, paint, x, -0.4, 0, g);
  box(0.06, 1.0, 0.06, MAT.chrome, 0, 0.6, -0.3, g);                               // hanger rod
  const bulb = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffb040, emissiveIntensity: 2 });
  for (const x of [-w / 2 + 0.15, 0, w / 2 - 0.15]) box(0.08, 0.08, 0.08, bulb, x, -0.5, 0.6, g);
  return g;
}

// ---------------------------------------------------------------------------
// Props
export function makeFlightCase() {
  const g = new THREE.Group();
  box(1.1, 0.8, 0.8, M(0x18181c, { roughness: 0.5 }), 0, 0.4, 0, g);
  const al = M(0xa7adb8, { roughness: 0.3, metalness: 0.9 });
  for (const y of [0.02, 0.78]) for (const z of [-0.39, 0.39]) box(1.12, 0.05, 0.05, al, 0, y, z, g);
  for (const x of [-0.54, 0.54]) for (const z of [-0.39, 0.39]) box(0.05, 0.8, 0.05, al, x, 0.4, z, g);
  box(0.3, 0.12, 0.01, MAT.mohawk, -0.2, 0.55, 0.41, g);
  box(0.14, 0.08, 0.02, al, 0.25, 0.4, 0.41, g);
  return g;
}

export function makeJukebox() {
  const g = new THREE.Group();
  box(1.2, 1.8, 0.7, M(0x3a1424, { roughness: 0.4 }), 0, 0.9, 0, g);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.7, 20, 1, false, Math.PI / 2, Math.PI), M(0x3a1424));
  top.rotation.x = Math.PI / 2; top.position.y = 1.8; g.add(top);
  const gl = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8a20, emissiveIntensity: 0.4 });
  for (const x of [-0.45, 0, 0.45]) box(0.1, 1.5, 0.05, gl, x, 1.0, 0.36, g);
  box(0.7, 0.4, 0.05, M(0x111111, { roughness: 0.2 }), 0, 1.25, 0.37, g);
  return { root: g, glow: gl };
}

export function makeAmp() {
  const g = new THREE.Group();
  box(1.3, 1.0, 0.9, M(0x141416, { roughness: 0.6 }), 0, 0.5, 0, g);
  box(1.18, 0.62, 0.02, M(0x2a2a30, { roughness: 1 }), 0, 0.42, 0.46, g);
  box(1.3, 0.16, 0.92, M(0x1c1c20), 0, 0.92, 0, g);
  box(0.3, 0.06, 0.01, MAT.brass, -0.35, 0.92, 0.47, g);
  const ringMat = glow(0xff2e88, 0.6);
  const cones = [];
  for (const x of [-0.3, 0.3]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20), M(0x0a0a0a, { roughness: 0.9 }));
    c.rotation.x = Math.PI / 2; c.position.set(x, 0.42, 0.47); g.add(c); cones.push(c);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 24), ringMat);
    r.position.set(x, 0.42, 0.48); g.add(r);
  }
  for (const x of [-0.45, -0.3, -0.15]) box(0.05, 0.05, 0.05, MAT.chrome, x + 0.9, 0.92, 0.47, g);
  return { root: g, ringMat, cones };
}

export function makeCoffin(w = 2.4) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const h = w / 2;
  shape.moveTo(-h, -0.18); shape.lineTo(-h * 0.45, -0.42); shape.lineTo(h, -0.3);
  shape.lineTo(h, 0.3); shape.lineTo(-h * 0.45, 0.42); shape.lineTo(-h, 0.18); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, MAT.wood);
  m.castShadow = true; m.receiveShadow = true;
  m.scale.z = 1.6;
  g.add(m);
  box(0.5, 0.03, 0.08, MAT.brass, -0.2, 0.015, 0, g);
  box(0.08, 0.03, 0.36, MAT.brass, -0.33, 0.015, 0, g);
  for (const x of [-h * 0.8, h * 0.8]) for (const z of [-0.5, 0.5]) box(0.08, 0.06, 0.08, MAT.brass, x, -0.2, z * 0.9, g);
  return g;
}

/** Hanging scaffold platform for the alley (top at y = 0). */
export function makeScaffold(w = 2.4) {
  const g = new THREE.Group();
  const metal = M(0x8a6a3a, { roughness: 0.6, metalness: 0.5 });
  box(w, 0.12, 1.4, M(0x5a4a3a, { roughness: 0.9 }), 0, -0.06, 0, g);
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) box(0.06, 0.06, 1.42, metal, x, 0, 0, g);
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) box(0.04, 0.6, 0.04, metal, x, 0.3, -0.68, g);
  box(w, 0.04, 0.04, metal, 0, 0.6, -0.68, g);
  return g;
}

// ---------------------------------------------------------------------------
// Weapons
export function makeWeaponMesh(type, power) {
  const col = power ? 0xff2e88 : 0xffd166;
  const gm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: power ? 2.5 : 0.8, roughness: 0.3 });
  const g = new THREE.Group();
  if (type === 'pick') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 3), gm);
    m.rotation.x = Math.PI / 2; g.add(m);
  } else if (type === 'sticks') {
    const wood = new THREE.MeshStandardMaterial({ color: 0xe8c690, emissive: col, emissiveIntensity: power ? 1.6 : 0.15 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 6), wood);
    m.rotation.z = Math.PI / 2; g.add(m);
  } else if (type === 'vinyl') {
    const rec = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.15, metalness: 0.4, emissive: power ? 0x40001a : 0 }));
    rec.rotation.x = Math.PI / 2; g.add(rec);
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 16), gm);
    lab.rotation.x = Math.PI / 2; g.add(lab);
  } else if (type === 'spanner') {
    const steel = new THREE.MeshStandardMaterial({ color: power ? 0xff8ac8 : 0xc8ccd8, metalness: 0.9, roughness: 0.25, emissive: power ? 0xff2e88 : 0x000000, emissiveIntensity: power ? 1.5 : 0 });
    box(0.1, 0.7, 0.05, steel, 0, 0, 0, g);
    box(0.3, 0.14, 0.05, steel, 0, 0.38, 0, g);
    box(0.1, 0.1, 0.06, MAT.dark, 0, 0.42, 0, g);
  } else if (type === 'notes') {
    const ink = new THREE.MeshStandardMaterial({ color: power ? 0xff2e88 : 0x9affd8, emissive: power ? 0xff2e88 : 0x5affc0, emissiveIntensity: power ? 2.5 : 1.4 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), ink); head.scale.set(1.25, 0.9, 0.6); g.add(head);
    box(0.04, 0.5, 0.04, ink, 0.15, 0.25, 0, g);
    box(0.2, 0.06, 0.04, ink, 0.24, 0.47, 0, g).rotation.z = -0.5;
  } else if (type === 'flame') {
    const fire = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff4a0a, emissiveIntensity: power ? 3 : 1.8 });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.07, 12), fire);
    b.rotation.x = Math.PI / 2; b.scale.z = 1.2; g.add(b);
    box(0.06, 0.6, 0.04, MAT.neck, 0, 0.42, 0, g);
    box(0.1, 0.12, 0.05, MAT.dark, 0, 0.75, 0, g);
  }
  return g;
}

export function makeSkull() {
  const g = new THREE.Group();
  box(0.32, 0.3, 0.3, MAT.bone, 0, 0, 0, g);
  box(0.24, 0.1, 0.26, MAT.bone, 0, -0.18, 0.02, g);
  for (const sx of [-1, 1]) box(0.08, 0.09, 0.02, glow(0xa6ff4d, 2), sx * 0.075, 0.03, 0.155, g);
  return g;
}
export function makeBottle() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.1, metalness: 0.1, emissive: 0x0a3a0a, transparent: true, opacity: 0.9 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 10), glass); g.add(b);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 0.16, 8), glass); n.position.y = 0.22; g.add(n);
  return g;
}
export function makeFireball() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false }));
  g.add(m);
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0b0, toneMapped: false }));
  g.add(c);
  return g;
}

export function makePickup(kind) {
  const g = new THREE.Group();
  if (kind === 'jacket') {
    const j = new THREE.Group();
    box(0.5, 0.55, 0.15, MAT.leather, 0, 0, 0, j);
    box(0.16, 0.45, 0.14, MAT.leather, -0.33, -0.02, 0, j).rotation.z = 0.25;
    box(0.16, 0.45, 0.14, MAT.leather, 0.33, -0.02, 0, j).rotation.z = -0.25;
    box(0.12, 0.5, 0.01, MAT.tee, 0, 0, 0.08, j);
    for (let i = 0; i < 4; i++) box(0.04, 0.04, 0.02, MAT.stud, -0.1, 0.18 - i * 0.12, 0.08, j);
    g.add(j);
  } else if (kind === 'gold' || kind === 'platinum') {
    const plat = kind === 'platinum';
    const rec = new THREE.Mesh(new THREE.CylinderGeometry(plat ? 0.42 : 0.34, plat ? 0.42 : 0.34, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: plat ? 0xe8f0ff : 0xffc94a, emissive: plat ? 0x5a6a8a : 0x6a4500, metalness: 1, roughness: 0.15 }));
    rec.rotation.x = Math.PI / 2; g.add(rec);
    if (plat) {
      const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.045, 16), glow(0xff2e88, 1.5));
      lab.rotation.x = Math.PI / 2; g.add(lab);
    }
  } else if (kind === 'life') {
    box(0.4, 0.42, 0.4, MAT.skin, 0, 0, 0, g);
    for (let i = 0; i < 5; i++) box(0.08, 0.2 + Math.sin(i / 4 * Math.PI) * 0.12, 0.08, MAT.mohawk, 0, 0.3, 0.16 - i * 0.08, g);
    for (const sx of [-1, 1]) box(0.08, 0.06, 0.02, MAT.dark, sx * 0.09, 0.05, 0.21, g);
  } else {
    const w = makeWeaponMesh(kind, false);
    w.scale.setScalar(1.4);
    if (kind === 'sticks') {
      const w2 = makeWeaponMesh('sticks', false);
      w2.scale.setScalar(1.4); w.rotation.z = 0.6; w2.rotation.z = -0.6; g.add(w2);
    }
    g.add(w);
  }
  const ringCol = kind === 'platinum' ? 0xe8f0ff : kind === 'jacket' || kind === 'life' ? 0xffc94a : 0xa6ff4d;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 32), new THREE.MeshBasicMaterial({ color: ringCol }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.55;
  g.add(ring);
  return g;
}

export function makeBones() {
  const parts = [];
  const skull = new THREE.Group();
  box(0.3, 0.28, 0.3, MAT.bone, 0, 0, 0, skull);
  for (const sx of [-1, 1]) box(0.08, 0.08, 0.02, MAT.dark, sx * 0.07, 0.02, 0.15, skull);
  parts.push(skull);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4 + Math.random() * 0.2, 6), MAT.bone);
    b.castShadow = true;
    parts.push(b);
  }
  return parts;
}

// Practice target for the soundcheck: a cardboard zombie cutout on a stand.
export function makeCutout() {
  const g = new THREE.Group();
  const card = M(0xc8a878, { roughness: 1 });
  const ink = M(0x5a7a3a, { roughness: 1 });
  box(0.06, 0.6, 0.06, MAT.wood, 0, 0.3, -0.05, g);
  box(0.7, 1.3, 0.04, card, 0, 1.25, 0, g);
  box(0.55, 0.5, 0.05, ink, 0, 1.6, 0.01, g);              // zombie head drawn on
  for (const sx of [-1, 1]) box(0.1, 0.08, 0.06, M(0x111111), sx * 0.12, 1.65, 0.02, g);
  box(0.3, 0.06, 0.06, M(0x111111), 0, 1.45, 0.02, g);
  const target = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 20), glow(0xff2e88, 1.5));
  target.position.set(0, 1.0, 0.03); g.add(target);
  return g;
}

// Level 4 traffic: a zombie hearse doing a ton down the highway. Faces -x (it drives right to left).
export function makeHearse() {
  const g = new THREE.Group();
  const paint = M(0x141418, { roughness: 0.25, metalness: 0.6 });
  const glass = M(0x1a2a3a, { roughness: 0.1, metalness: 0.4, emissive: 0x0a2a1a });
  box(3.6, 0.55, 1.4, paint, 0, 0.45, 0, g);                       // body
  box(2.5, 0.5, 1.3, paint, 0.45, 0.95, 0, g);                     // cabin
  box(0.7, 0.36, 1.32, glass, -0.55, 0.95, 0, g);                  // windscreen
  box(1.5, 0.3, 1.32, glass, 0.9, 0.98, 0, g);                     // coffin windows
  box(1.2, 0.22, 0.5, M(0x6a4a2a), 0.9, 0.95, 0, g);               // the coffin inside
  const chrome = MAT.chrome;
  box(3.62, 0.05, 1.42, chrome, 0, 0.66, 0, g);                    // chrome trim so it reads at night
  box(0.1, 0.22, 1.44, chrome, -1.82, 0.38, 0, g);                 // bumper
  box(0.1, 0.22, 1.44, chrome, 1.82, 0.38, 0, g);
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff4c0, emissive: 0xffe08a, emissiveIntensity: 4 });
  const tail = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 3 });
  for (const z of [-0.5, 0.5]) { box(0.06, 0.16, 0.26, lamp, -1.85, 0.55, z, g); box(0.06, 0.12, 0.2, tail, 1.85, 0.55, z, g); }
  const tyre = M(0x0a0a0c, { roughness: 0.9 });
  const wheels = [];
  for (const x of [-1.2, 1.2]) for (const z of [-0.66, 0.66]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), tyre);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.32, z); g.add(w); wheels.push(w);
  }
  // flames licking off the back
  const flame = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, toneMapped: false });
  for (const z of [-0.4, 0.4]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), flame); f.rotation.z = -Math.PI / 2; f.position.set(2.3, 0.3, z); g.add(f); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.wheels = wheels;
  return g;
}

// Level 5 boss: the Devil himself, with a flying-V. Wings come out when he's angry.
export function makeDevil() {
  const z = makeZombie('devil');
  const red = M(0xc81a1a, { roughness: 0.5, emissive: 0x200000 });
  const [skin, cloth, pants] = z.mats;
  const shirt = M(0x111114, { roughness: 0.4 }), trousers = M(0x1a1a1e, { roughness: 0.35, metalness: 0.2 });
  z.root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material === skin) o.material = red;
    else if (o.material === cloth) o.material = shirt;
    else if (o.material === pants) o.material = trousers;
  });
  z.mats = [red, shirt];
  // horns, goatee, yellow eyes
  const bone = M(0xe8dcc0, { roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 8), bone);
    h.position.set(sx * 0.13, 0.48, 0.02); h.rotation.z = -sx * 0.4; z.head.add(h);
    box(0.07, 0.05, 0.02, M(0xffd23a, { emissive: 0xffb000, emissiveIntensity: 3 }), sx * 0.08, 0.24, 0.215, z.head);
  }
  box(0.08, 0.16, 0.06, MAT.dark, 0, -0.06, 0.16, z.jaw);
  box(0.36, 0.06, 0.38, MAT.dark, 0, 0.4, 0.0, z.head);           // slicked-back hair
  // tail
  const tail = new THREE.Group(); tail.position.set(0, 0.95, -0.16); z.body.add(tail);
  let seg = tail;
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Group(); s.position.set(0, -0.12, -0.1); s.rotation.x = 0.35; seg.add(s);
    box(0.06, 0.06, 0.18, red, 0, 0, -0.06, s); seg = s;
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), red); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.2; seg.add(tip);
  z.tail = tail;
  // flying-V guitar, slung low across the front
  const gtr = new THREE.Group(); gtr.position.set(0, -0.15, 0.24); gtr.rotation.z = 0.55; z.torso.add(gtr);
  const gm = M(0xd01020, { roughness: 0.25, metalness: 0.3, emissive: 0x300000 });
  box(0.12, 0.62, 0.05, gm, -0.12, -0.22, 0, gtr).rotation.z = 0.35;
  box(0.12, 0.62, 0.05, gm, 0.12, -0.22, 0, gtr).rotation.z = -0.35;
  box(0.05, 0.8, 0.04, MAT.dark, 0, 0.36, 0, gtr);
  box(0.12, 0.14, 0.04, gm, 0, 0.8, 0, gtr);
  for (let i = 0; i < 3; i++) box(0.16, 0.02, 0.06, MAT.chrome, 0, -0.08 - i * 0.06, 0, gtr);
  z.guitar = gtr;
  // bat wings (hidden until he's angry)
  const wingMat = M(0x3a0808, { roughness: 0.6, side: THREE.DoubleSide, emissive: 0x100000 });
  const wings = new THREE.Group(); wings.position.set(0, 0.15, -0.16); z.torso.add(wings);
  z.wingL = null; z.wingR = null;
  for (const sx of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(sx * 1.1, 0.55); shape.lineTo(sx * 1.25, -0.05); shape.lineTo(sx * 0.9, -0.15);
    shape.lineTo(sx * 0.7, -0.5); shape.lineTo(sx * 0.4, -0.3); shape.lineTo(0, -0.35); shape.lineTo(0, 0);
    const w = new THREE.Group(); wings.add(w);
    w.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), wingMat));
    box(0.04, 0.04, 0.04, bone, sx * 1.1, 0.55, 0, w);
    if (sx < 0) z.wingL = w; else z.wingR = w;
  }
  wings.visible = false;
  z.wings = wings;
  return z;
}
