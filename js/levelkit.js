// Shared building blocks for levels: merged static geometry, textures, signs, moving platforms,
// amps, lanterns, and the common collision/query API every level returns.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeAmp, makeJukebox, makeGondola } from './models.js';

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Collects static geometry per material and merges it into a few draw calls. */
export class Batch {
  constructor() { this.groups = new Map(); }
  add(geo, mat, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(g);
  }
  build(scene, { cast = true, receive = true } = {}) {
    for (const [mat, list] of this.groups) {
      const m = new THREE.Mesh(mergeGeometries(list), mat);
      m.castShadow = cast; m.receiveShadow = receive;
      scene.add(m);
    }
  }
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)).clone();
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- Surface textures ----------------------------------------------------------------------
// Scenery boxes are merged and have no UVs, so the texture is projected from world position
// (top faces use x/z, side faces x/y or z/y). That keeps bricks the same size on any wall.
// Textures are greyscale detail around 0.74 so they shade the material's own colour.
const SURF_TEX = {};
function surfaceTex(kind) {
  if (SURF_TEX[kind]) return SURF_TEX[kind];
  const r = rng(kind.length * 977 + kind.charCodeAt(0));
  const S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const grey = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
  const speckle = (n, lo, hi, size = 1.5) => { for (let i = 0; i < n; i++) { g.fillStyle = grey(lo + r() * (hi - lo), 0.5); g.fillRect(r() * S, r() * S, size, size); } };
  const blotch = (n, lo, hi, rad) => {
    for (let i = 0; i < n; i++) {
      const x = r() * S, y = r() * S, rr = rad * (0.5 + r());
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, grey(lo + r() * (hi - lo), 0.35)); gr.addColorStop(1, grey(190, 0));
      g.fillStyle = gr;
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); }
    }
  };
  const crack = (n, v) => {
    g.strokeStyle = grey(v, 0.6); g.lineWidth = 1;
    for (let i = 0; i < n; i++) { g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  };
  g.fillStyle = grey(190); g.fillRect(0, 0, S, S);
  if (kind === 'brick' || kind === 'stone') {
    const bw = kind === 'brick' ? 64 : 128, bh = kind === 'brick' ? 32 : 64, mortar = kind === 'brick' ? 4 : 5;
    g.fillStyle = grey(kind === 'brick' ? 105 : 115); g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < S + bw; x += bw) {
        g.fillStyle = grey(165 + r() * 50);
        const jx = kind === 'stone' ? (r() - 0.5) * 6 : 0;
        g.fillRect(x + off + mortar / 2 + jx, y + mortar / 2, bw - mortar, bh - mortar);
      }
    }
    speckle(2500, 120, 230); crack(kind === 'stone' ? 6 : 2, 90);
  } else if (kind === 'wood') {
    for (let y = 0; y < S; y += 32) {
      g.fillStyle = grey(165 + r() * 40); g.fillRect(0, y, S, 30);
      g.fillStyle = grey(80); g.fillRect(0, y + 30, S, 2);
      g.strokeStyle = grey(130, 0.5);
      for (let k = 0; k < 5; k++) { g.beginPath(); const yy = y + 3 + r() * 24; g.moveTo(0, yy); for (let x = 0; x <= S; x += 16) g.lineTo(x, yy + Math.sin(x * 0.05 + k) * 2); g.stroke(); }
      for (let n = 0; n < 2; n++) { g.fillStyle = grey(70, 0.8); g.fillRect(r() * S, y + 12, 2, 2); }   // nail heads
    }
  } else if (kind === 'tarmac' || kind === 'concrete') {
    blotch(40, 150, 225, 40);
    speckle(kind === 'tarmac' ? 9000 : 4000, 110, 250, kind === 'tarmac' ? 1.5 : 1);
    crack(kind === 'tarmac' ? 4 : 3, 100);
    if (kind === 'concrete') { g.fillStyle = grey(120, 0.7); g.fillRect(0, 0, S, 2); g.fillRect(0, 0, 2, S); }
  } else if (kind === 'grass' || kind === 'dirt') {
    blotch(50, 140, 230, 30);
    if (kind === 'grass') {
      for (let i = 0; i < 2500; i++) { g.strokeStyle = grey(120 + r() * 120, 0.5); g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5); g.stroke(); }
    } else { speckle(3000, 110, 240, 2); for (let i = 0; i < 60; i++) { g.fillStyle = grey(200 + r() * 50, 0.8); g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 2.5, 0, 7); g.fill(); } }
  } else if (kind === 'rock') {
    blotch(60, 120, 240, 36); speckle(4000, 100, 240); crack(14, 70);
  } else if (kind === 'fabric') {
    for (let i = 0; i < S; i += 3) { g.fillStyle = grey(165, 0.6); g.fillRect(i, 0, 1, S); g.fillStyle = grey(215, 0.4); g.fillRect(0, i, S, 1); }
    blotch(15, 150, 215, 50);
  } else if (kind === 'metal') {
    for (let x = 0; x < S; x += 2) { g.fillStyle = grey(170 + r() * 40, 0.5); g.fillRect(x, 0, 1, S); }
    blotch(25, 110, 200, 30);   // rust and grime
    for (let x = 0; x < S; x += 64) { g.fillStyle = grey(110); g.fillRect(x, 0, 2, S); for (let y = 8; y < S; y += 32) { g.fillStyle = grey(225); g.fillRect(x + 6, y, 2, 2); } }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  SURF_TEX[kind] = t;
  return t;
}

/** Give a scenery material a world-projected surface texture. scale = world units per tile. */
export function surface(mat, kind, scale = 2, amount = 1) {
  const tex = surfaceTex(kind);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSurf = { value: tex }; sh.uniforms.uSurfScale = { value: scale }; sh.uniforms.uSurfAmt = { value: amount };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSurfP;\nvarying vec3 vSurfN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfP = (modelMatrix * vec4(position, 1.0)).xyz;\nvSurfN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uSurf;\nuniform float uSurfScale, uSurfAmt;\nvarying vec3 vSurfP;\nvarying vec3 vSurfN;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 sAn = abs(vSurfN);
        vec2 sUv = sAn.y > 0.6 ? vSurfP.xz : (sAn.x > sAn.z ? vSurfP.zy : vSurfP.xy);
        vec3 sTex = texture2D(uSurf, sUv / uSurfScale).rgb;
        diffuseColor.rgb *= mix(vec3(1.0), sTex * 1.35, uSurfAmt);`);
  };
  mat.customProgramCacheKey = () => 'surface';
  return mat;
}

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cyl4: new THREE.CylinderGeometry(0.35, 0.5, 1, 4),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  coneT: new THREE.ConeGeometry(0.5, 1, 3),
  sph: new THREE.SphereGeometry(1, 16, 10),
};

/** Text painted on a board (wooden sign) or glowing tube (neon). */
export function textPanel(text, { w = 2.4, h = 0.75, color = '#f3ece0', bg = '#2a1d17', neon = false, font = 'Permanent Marker' } = {}) {
  const tex = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
    if (!neon) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.strokeStyle = '#120c09'; g.lineWidth = 10; g.strokeRect(5, 5, cw - 10, ch - 10); }
    let size = Math.round(ch * 0.55);
    do { g.font = `${size}px "${font}", "Comic Sans MS", cursive`; size -= 4; } while (g.measureText(text).width > cw - 50 && size > 16);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (neon) { g.shadowColor = color; g.shadowBlur = 24; }
    g.fillStyle = color;
    g.fillText(text, cw / 2, ch / 2 + 4);
    if (neon) g.fillText(text, cw / 2, ch / 2 + 4);
  });
  const mat = neon
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

/** Sky gradient, moon with glow, drifting clouds. Returns an update(t, cam, pulse, storm) function. */
export function sky(scene, r, { top = '#06050d', mid = '#191232', bottom = '#3b2a58', moonColor = 0xfff4d6, cloudColor = 0x5a4a80, clouds = 10, fog = 0x2d2348, fogDensity = 0.0105 } = {}) {
  scene.background = canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.FogExp2(fog, fogDensity);
  const fogClear = new THREE.Color(fog), fogStorm = new THREE.Color(0x1d1a2c);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 20), new THREE.MeshBasicMaterial({ color: moonColor, fog: false }));
  scene.add(moon);
  const glowTex = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,240,210,0.9)'); gr.addColorStop(0.25, 'rgba(210,190,255,0.35)'); gr.addColorStop(1, 'rgba(120,90,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  moonGlow.scale.setScalar(80);
  scene.add(moonGlow);
  const cloudTex = canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 40; i++) {
      const x = w * (0.15 + r() * 0.7), y = h * (0.35 + r() * 0.3), rad = 14 + r() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  });
  const cl = [];
  for (let i = 0; i < clouds; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(60, 26),
      new THREE.MeshBasicMaterial({ map: cloudTex, color: cloudColor, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    c.userData = { off: i * 34 - 60, y: 26 + r() * 30, speed: 0.6 + r() * 0.8, storm: i >= 7 };
    c.position.z = -140;
    scene.add(c); cl.push(c);
  }
  return (t, cam, pulse, storm) => {
    moon.position.set(cam.x * 0.93 + 22, 34, -160);
    moonGlow.position.set(moon.position.x, moon.position.y, moon.position.z + 1);
    moonGlow.scale.setScalar(80 + pulse * 6);
    moonGlow.material.opacity = 1 - storm * 0.6;
    for (const c of cl) {
      const u = c.userData, span = 340;
      const x = ((u.off + t * u.speed * (1 + storm * 2)) % span + span) % span - span / 2;
      c.position.set(cam.x * 0.9 + x, u.y, -140);
      c.material.opacity = u.storm ? storm * 0.85 : 0.55 + storm * 0.3;
    }
    scene.fog.color.copy(fogClear).lerp(fogStorm, storm);
  };
}

// ---- Secret areas -------------------------------------------------------------------------
// Each one: a cracked wall in the level (light leaks through the cracks on the beat) that you
// shoot open, a door behind it, and a bonus room built off the left edge of the map.
const SECRET_THEMES = {
  crypt:      { facade: 0x6a6e80, facadeTex: 'stone', wall: 0x4d5163, wallTex: 'stone', floor: 0x3a3a44, floorTex: 'stone', accent: 0x9affd8, prop: 0x2a2228 },
  bonecellar: { facade: 0x55586a, facadeTex: 'stone', wall: 0x3a3038, wallTex: 'rock', floor: 0x2a2420, floorTex: 'dirt', accent: 0xa6ff4d, prop: 0xe8dcc0 },
  cellar:     { facade: 0x4a3a3a, facadeTex: 'brick', wall: 0x5a2e2a, wallTex: 'brick', floor: 0x3a2418, floorTex: 'wood', accent: 0xffb040, prop: 0x5a3a22 },
  staff:      { facade: 0x5a2e2a, facadeTex: 'brick', wall: 0x3a3440, wallTex: 'brick', floor: 0x26262e, floorTex: 'concrete', accent: 0xff2e88, prop: 0x6a6e78 },
  tent:       { facade: 0xd8c8a0, facadeTex: 'fabric', wall: 0xa83a3a, wallTex: 'fabric', floor: 0x5a4030, floorTex: 'wood', accent: 0xffc94a, prop: 0xff5aa8 },
  lost:       { facade: 0x6a8a5a, facadeTex: 'fabric', wall: 0x3a5a8a, wallTex: 'fabric', floor: 0x2a3a1e, floorTex: 'grass', accent: 0xff8ac8, prop: 0x2a5ab0 },
  kitchen:    { facade: 0x8a8a90, facadeTex: 'metal', wall: 0xd8d0c0, wallTex: 'concrete', floor: 0x3a3a40, floorTex: 'concrete', accent: 0xff4a4a, prop: 0xa82a2a },
  tunnel:     { facade: 0x6a6460, facadeTex: 'concrete', wall: 0x6a6460, wallTex: 'concrete', floor: 0x26262a, floorTex: 'tarmac', accent: 0xffc94a, prop: 0x6a3a22 },
  green:      { facade: 0x4a4048, facadeTex: 'concrete', wall: 0x2a5a3a, wallTex: 'concrete', floor: 0x2a2024, floorTex: 'wood', accent: 0xa6ff4d, prop: 0x141016 },
  vault:      { facade: 0x2a2024, facadeTex: 'rock', wall: 0x2a2024, wallTex: 'rock', floor: 0x1a0806, floorTex: 'rock', accent: 0xff3a1a, prop: 0xffc94a },
};
const css = (hex) => '#' + hex.toString(16).padStart(6, '0');

// ---- Gig set pieces --------------------------------------------------------------------------
// A crowd silhouette: body, head, both arms up (horns!). Optional glowing eyes as a second group.
function figureGeometry(eyes) {
  const parts = [];
  const add = (w, h, d, x, y, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); g.translate(x, y, 0); parts.push(g); };
  add(0.5, 0.95, 0.3, 0, 0.48);
  add(0.32, 0.32, 0.3, 0, 1.15);
  add(0.11, 0.62, 0.11, -0.3, 1.28, 0.35);
  add(0.11, 0.62, 0.11, 0.3, 1.28, -0.35);
  const body = mergeGeometries(parts);
  if (!eyes) return body;
  const e1 = new THREE.BoxGeometry(0.07, 0.05, 0.02); e1.translate(-0.07, 1.18, 0.16);
  const e2 = new THREE.BoxGeometry(0.07, 0.05, 0.02); e2.translate(0.07, 1.18, 0.16);
  return mergeGeometries([body, mergeGeometries([e1, e2])], true);
}

const beamFade = () => canvasTex(4, 64, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#555555'); gr.addColorStop(1, '#000000');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

/**
 * Common level plumbing: ground strip with pits, one-way ledges, moving platforms, amps, a checkpoint
 * jukebox, lanterns with 3 roaming point lights. Returns the query API plus a `B` batch for scenery.
 */
export function baseLevel(scene, L, { soil, top, pitMat, ledgeMat, pillarMat, makeMover, lanternColor = 0xff9a40 }) {
  const B = new Batch();
  const solids = [], ledges = [];
  const onGround = (x) => L.ground.some(([a, b]) => x > a + 0.4 && x < b - 0.4);

  for (const [a, b] of L.ground) {
    const w = b - a, cx = (a + b) / 2;
    B.add(GEO.box, soil, mat4(cx, -6, -0.5, 0, 0, 0, w, 12, 6));
    B.add(GEO.box, top, mat4(cx, -0.05, -0.5, 0, 0, 0, w + 0.02, 0.14, 6.04));
    solids.push({ x1: a, x2: b, y1: -12, y2: 0 });
  }
  for (let i = 0; i < L.ground.length - 1; i++) {
    const a = L.ground[i][1], b = L.ground[i + 1][0];
    B.add(GEO.box, pitMat, mat4((a + b) / 2, -6.9, -0.5, 0, 0, 0, b - a, 12, 6));
  }
  for (const [a, b, h, type] of L.blocks || []) solids.push({ x1: a, x2: b, y1: 0, y2: h, bounce: type === 'bounce' });
  // Mud: slows you down (shiny brown strip on the ground)
  const mudMat = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.25, metalness: 0.1 });
  for (const [a, b] of L.mud || []) B.add(GEO.box, mudMat, mat4((a + b) / 2, 0.01, -0.5, 0, 0, 0, b - a, 0.04, 5.8));
  for (const [a, b, y] of L.ledges) {
    const w = b - a, cx = (a + b) / 2;
    B.add(GEO.box, ledgeMat, mat4(cx, y - 0.15, -0.2, 0, 0, 0, w, 0.3, 1.6));
    if (pillarMat) B.add(GEO.cyl4, pillarMat, mat4(cx, (y - 0.3) / 2, -0.9, 0, Math.PI / 4, 0, 0.6, y - 0.3, 0.6));
    ledges.push({ x1: a, x2: b, y, dx: 0, dy: 0 });
  }
  // Ferris wheels: each car is a moving platform that circles once every 16 beats
  const wheels = (L.wheels || []).map((w) => {
    const hub = new THREE.Group();
    hub.position.set(w.x, w.y, -0.9);
    const steel = new THREE.MeshStandardMaterial({ color: 0xc8ccd8, roughness: 0.35, metalness: 0.8 });
    const bulbs = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffb040, emissiveIntensity: 2 });
    hub.add(new THREE.Mesh(new THREE.TorusGeometry(w.r, 0.08, 6, 48), steel));
    hub.add(new THREE.Mesh(new THREE.TorusGeometry(w.r * 0.55, 0.05, 6, 32), steel));
    for (let k = 0; k < w.n * 2; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, w.r, 0.06), steel);
      sp.rotation.z = (k / (w.n * 2)) * Math.PI * 2; sp.position.set(Math.sin(-sp.rotation.z) * w.r / 2, Math.cos(sp.rotation.z) * w.r / 2, 0);
      hub.add(sp);
    }
    for (let k = 0; k < 24; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), bulbs); const a = (k / 24) * Math.PI * 2; b.position.set(Math.cos(a) * w.r, Math.sin(a) * w.r, 0.1); hub.add(b); }
    scene.add(hub);
    // A-frame legs
    for (const sx of [-1, 1]) B.add(GEO.box, steel, mat4(w.x + sx * w.r * 0.35, w.y / 2, -1.6, 0, 0, sx * 0.32, 0.18, w.y * 1.07, 0.18));
    return { ...w, hub };
  });
  const moverDefs = [...(L.movers || [])];
  for (const w of wheels) for (let k = 0; k < w.n; k++) moverDefs.push({ kind: 'wheel', wheel: w, phase: (k / w.n) * Math.PI * 2, w: w.w, x: w.x, y: w.y });
  const movers = moverDefs.map((m) => {
    const mesh = m.kind === 'wheel' ? makeGondola(m.w) : makeMover(m.w);
    scene.add(mesh);
    const ledge = { x1: m.x - m.w / 2, x2: m.x + m.w / 2, y: m.y, dx: 0, dy: 0, mover: true };
    ledges.push(ledge);
    let chain = null;
    if (m.kind === 'bob') {
      chain = new THREE.Mesh(new THREE.BoxGeometry(0.05, 10, 0.05), new THREE.MeshStandardMaterial({ color: 0x15141a, metalness: 0.6, roughness: 0.5 }));
      scene.add(chain);
    }
    return { ...m, mesh, ledge, chain };
  });
  const amps = (L.amps || []).map(([x, h]) => {
    const a = makeAmp();
    a.root.position.set(x, 0, 0);
    a.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(a.root);
    const s = { x1: x - 0.65, x2: x + 0.65, y1: 0, y2: h, amp: true };
    solids.push(s);
    return { ...a, x, solid: s };
  });
  // Crew barricades: solid, with a ladder up the near side. The Roadie barges straight through.
  const barricades = (L.barricades || []).map(([a, b, h]) => {
    const solid = { x1: a, x2: b, y1: 0, y2: h };
    solids.push(solid);
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
    const stripe = new THREE.MeshStandardMaterial({ color: 0xffc94a, roughness: 0.6, emissive: 0x2a1a00 });
    const blk = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.6 });
    const w = b - a, cx = (a + b) / 2;
    for (let y = 0.25; y < h; y += 0.55) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.45, 1.8), wood); plank.position.set(cx, y, -0.4); plank.castShadow = plank.receiveShadow = true; g.add(plank);
    }
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * 0.5, 0.3), i % 2 ? blk : stripe);
      st.position.set(cx - w / 2 - 0.02, h * 0.55, 0.15 - i * 0.3 + 0.6); st.rotation.x = 0.6; g.add(st);
    }
    const sign = textPanel('CREW ONLY', { w: 1.6, h: 0.45, color: '#ffc94a', bg: '#141416' });
    sign.position.set(cx, h * 0.6, 0.52); g.add(sign);
    scene.add(g);
    return { solid, mesh: g, x: cx, broken: false };
  });
  // Ladders: iron rails + rungs, climbable from y1 up to y2
  const ladderMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.7 });
  const ladders = (L.ladders || []).map(({ x, y1 = 0, y2 }) => {
    const h = y2 - y1;
    for (const dx of [-0.32, 0.32]) B.add(GEO.box, ladderMat, mat4(x + dx, y1 + h / 2 + 0.3, -0.35, 0, 0, 0, 0.07, h + 0.6, 0.07));
    for (let y = y1 + 0.3; y < y2 + 0.5; y += 0.38) B.add(GEO.box, ladderMat, mat4(x, y, -0.35, 0, 0, 0, 0.64, 0.05, 0.05));
    return { x, y1, y2 };
  });

  const juke = makeJukebox();
  juke.root.position.set(L.checkpoint, 0, -0.9);
  juke.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(juke.root);

  const lanterns = [];
  const lanternMat = new THREE.MeshStandardMaterial({ color: lanternColor, emissive: lanternColor, emissiveIntensity: 2.5 });
  const lights = [];
  for (let i = 0; i < 3; i++) { const Lt = new THREE.PointLight(lanternColor, 6, 7, 1.6); scene.add(Lt); lights.push(Lt); }
  const crowds = [], beams = [];
  const dummy = new THREE.Object3D();

  const api = {
    L, solids, ledges, movers, amps, juke, lanterns, B, onGround, lanternMat, ladders, barricades,
    /** Height of the top solid surface at x (street, roof, crate...), or null over a pit. */
    surfaceAt(x) {
      let top = null;
      for (const s of solids) if (x > s.x1 + 0.3 && x < s.x2 - 0.3 && s.y2 < 15 && (top === null || s.y2 > top)) top = s.y2;
      return top;
    },
    groundY(x) {
      if (!onGround(x)) return null;
      if ((L.blocks || []).some(([a, b]) => x > a - 0.6 && x < b + 0.6)) return null;
      if ((L.amps || []).some(([ax]) => Math.abs(x - ax) < 1.1)) return null;
      return 0;
    },
    onSolidTop(x) { return (L.blocks || []).some(([a, b]) => x > a && x < b) || (L.amps || []).some(([ax]) => Math.abs(x - ax) < 0.7); },
    stormAt() { return 0; },
    mudAt(x) { return (L.mud || []).some(([a, b]) => x > a && x < b); },
    campfires: L.campfires || [],
    strike() {},
    updateMovers(beat) {
      for (const m of movers) {
        const Lg = m.ledge;
        let x = m.x, y = m.y;
        if (m.kind === 'bob') y = m.y + m.amp * (0.5 - 0.5 * Math.cos((beat / 4) * Math.PI * 2));
        else if (m.kind === 'wheel') {
          const W = m.wheel, a = (beat / 16) * Math.PI * 2 + m.phase;
          x = W.x + W.r * Math.cos(a); y = W.y + W.r * Math.sin(a) - 1.1;   // car floor hangs below its pivot
          W.hub.rotation.z = (beat / 16) * Math.PI * 2;
        }
        else x = m.x + m.amp * Math.sin((beat / 8) * Math.PI * 2);
        const nx1 = x - m.w / 2;
        Lg.dx = nx1 - Lg.x1; Lg.dy = y - Lg.y;
        if (Math.abs(Lg.dx) > 1 || Math.abs(Lg.dy) > 1) { Lg.dx = 0; Lg.dy = 0; }
        Lg.x1 = nx1; Lg.x2 = x + m.w / 2; Lg.y = y;
        m.mesh.position.set(x, y, m.kind === 'wheel' ? -0.3 : 0);
        if (m.chain) m.chain.position.set(x - 0.6, y + 5, -0.1);
      }
    },
    /** A crowd in the background that jumps, headbangs or sways to the beat (one draw call). */
    addCrowd({ x1, x2, z = -8, y = 0, rows = 3, gap = 0.8, color = 0x0b0910, eyes = null, glow = null, scale = 1, step = 0.5, jump = 0.4 }) {
      const per = Math.max(1, Math.floor((x2 - x1) / gap));
      const geo = figureGeometry(eyes);
      const dark = new THREE.MeshStandardMaterial({ color, roughness: 1, ...(glow ? { emissive: glow, emissiveIntensity: 0.9 } : {}) });
      const mat = eyes ? [dark, new THREE.MeshStandardMaterial({ color: eyes, emissive: eyes, emissiveIntensity: 0.9 })] : dark;
      const mesh = new THREE.InstancedMesh(geo, mat, per * rows);
      mesh.frustumCulled = false;
      const people = [];
      for (let row = 0; row < rows; row++) for (let i = 0; i < per; i++) {
        const roll = Math.random();
        people.push({
          x: x1 + (i + 0.2 + Math.random() * 0.6) * gap, y: y + row * step, z: z - row * 1.1 + (Math.random() - 0.5) * 0.3,
          s: scale * (0.85 + Math.random() * 0.3), ry: (Math.random() - 0.5) * 0.7,
          kind: roll < 0.55 ? 0 : roll < 0.8 ? 1 : 2, ph: Math.random() < 0.7 ? 0 : 0.5,
        });
      }
      scene.add(mesh);
      crowds.push({ mesh, people, cx: (x1 + x2) / 2, half: (x2 - x1) / 2, jump, body: dark, glow: !!glow });
      return mesh;
    },
    /** Stage lights: cones of coloured light that sweep in time with the music. */
    addBeams({ at, colors = [0xff2e88, 0xa6ff4d, 0x5ad1ff], length = 11, width = 1.5, sweep = 0.5, opacity = 0.1 }) {
      const fade = beamFade();
      at.forEach(([x, y, z], i) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        const col = colors[i % colors.length];
        const geo = new THREE.ConeGeometry(width, length, 20, 1, true); geo.translate(0, -length / 2, 0);
        const cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity, alphaMap: fade, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: col, emissiveIntensity: 2 }));
        g.add(cone, lamp);
        scene.add(g);
        beams.push({ g, cone, lamp, ph: i * 0.37, dir: i % 2 ? 1 : -1, sweep, opacity });
      });
    },
    secretDoors: [],
    addLantern(p) {
      const l = new THREE.Mesh(GEO.box, lanternMat); l.scale.set(0.16, 0.28, 0.16); l.position.copy(p); scene.add(l);
      lanterns.push(p);
    },
    /** Shared per-frame work: lanterns, amps. Levels call this from their own update. */
    baseUpdate(t, cam, pulse) {
      const near = lanterns.slice().sort((a, b) => Math.abs(a.x - cam.x) - Math.abs(b.x - cam.x));
      lights.forEach((Lt, i) => {
        const p = near[i];
        if (!p) { Lt.visible = false; return; }
        Lt.visible = true;
        Lt.position.set(p.x, p.y + 0.3, p.z + 0.3);
        // flicker, plus a little bump on every beat
        Lt.intensity = 5 + Math.sin(t * 13 + i * 2) * 0.8 + Math.sin(t * 29 + i) * 0.5 + pulse * 2.5;
      });
      lanternMat.emissiveIntensity = 2.2 + pulse * 1.5;
      const beat = api.beat || 0;
      for (const c of crowds) {
        if (Math.abs(c.cx - cam.x) > c.half + 30) continue;
        if (c.glow) c.body.emissiveIntensity = 0.22 + pulse * 0.35;
        c.people.forEach((p, k) => {
          const f = (((beat + p.ph) % 1) + 1) % 1;   // 0 on the beat
          let y = p.y, rx = 0, rz = 0;
          if (p.kind === 0) y += Math.sin(f * Math.PI) * c.jump;                       // jumping
          else if (p.kind === 1) rx = Math.sin(f * Math.PI) * 0.55;                    // headbanging
          else rz = Math.sin(((beat + p.ph) / 2) * Math.PI) * 0.18;                    // swaying
          dummy.position.set(p.x, y, p.z); dummy.rotation.set(rx, p.ry, rz); dummy.scale.setScalar(p.s);
          dummy.updateMatrix(); c.mesh.setMatrixAt(k, dummy.matrix);
        });
        c.mesh.instanceMatrix.needsUpdate = true;
      }
      for (const d of api.secretDoors) {
        if (!d.open) d.crackMat.emissiveIntensity = 0.12 + pulse * 0.9;   // a faint light leaking through the cracks, on the beat
        d.frameMat.emissiveIntensity = 1.5 + pulse * 2;
      }
      for (const b of beams) {
        // one full sweep every 4 beats; every other bar they cross over
        const bar = Math.floor(beat / 4) % 2;
        b.g.rotation.z = Math.sin((beat / 4 + b.ph) * Math.PI * 2) * b.sweep * (bar ? b.dir : 1);
        b.cone.material.opacity = b.opacity * (0.6 + pulse * 1.4);
        b.lamp.material.emissiveIntensity = 1.5 + pulse * 3;
      }
      for (const a of amps) {
        a.ringMat.emissiveIntensity = 0.5 + pulse * 3;
        for (const c of a.cones) c.scale.y = 1 + pulse * 2;
      }
    },
  };
  // ---- Secret areas (built last so they can use addLantern) ----
  const R = new Batch();
  api.secretDoors = (L.secrets || []).map((sd, k) => {
    const T = SECRET_THEMES[sd.theme];
    const y = sd.y || 0;
    const Mt = (c, tex, scale = 2, amt = 1) => surface(new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }), tex, scale, amt);
    const glow = (c, i = 1.5) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i });
    // The cracked wall: looks like scenery, but the cracks glow
    const facade = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 0.5), Mt(T.facade, T.facadeTex, 2, 1.3));
    slab.position.y = 1.5; slab.castShadow = slab.receiveShadow = true; facade.add(slab);
    // a cap and a base so it reads as part of a building, not a slab on its own
    for (const [w, h, yy] of [[2.8, 0.28, 3.12], [2.7, 0.2, 0.1]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.7), slab.material); b.position.y = yy; b.castShadow = b.receiveShadow = true; facade.add(b); }
    const crackMat = glow(T.accent);
    const crack = (pts) => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.04, Math.hypot(bx - ax, by - ay) + 0.03, 0.02), crackMat);
        seg.position.set((ax + bx) / 2, (ay + by) / 2, 0.26); seg.rotation.z = -Math.atan2(bx - ax, by - ay);
        facade.add(seg);
      }
    };
    crack([[-0.15, 2.95], [0.2, 2.5], [-0.25, 2.05], [0.15, 1.55], [-0.1, 1.05], [0.25, 0.55], [0.05, 0.05]]);
    crack([[0.2, 2.5], [0.75, 2.2], [1.05, 2.35]]);
    crack([[-0.1, 1.05], [-0.65, 0.85], [-0.9, 0.45]]);
    facade.position.set(sd.x, y, -1.05);
    scene.add(facade);
    // The door behind it, revealed when the wall breaks
    const frameMat = glow(T.accent, 2);
    const mkDoor = (x, yy, z, label) => {
      const door = new THREE.Group();
      const hole = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.1), new THREE.MeshBasicMaterial({ color: 0x020203 }));
      hole.position.y = 1.15; door.add(hole);
      for (const [w, h, bx, by] of [[0.12, 2.5, -0.71, 1.25], [0.12, 2.5, 0.71, 1.25], [1.54, 0.12, 0, 2.44]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), frameMat); b.position.set(bx, by, 0.02); door.add(b);
      }
      const sign = textPanel(label, { w: 1.4, h: 0.5, color: css(T.accent), neon: true, font: 'Bungee' });
      sign.position.set(0, 2.85, 0.1); door.add(sign);
      door.position.set(x, yy, z); scene.add(door);
      return door;
    };
    const door = mkDoor(sd.x, y, -1.3, 'UP \u25B2');
    door.visible = false;
    // The room, off the left edge of the map
    const x0 = -80 - k * 30, x1 = x0 + 16, cx = x0 + 8;
    solids.push({ x1: x0, x2: x1, y1: -12, y2: 0 }, { x1: x0 - 6, x2: x0, y1: 0, y2: 30 }, { x1, x2: x1 + 6, y1: 0, y2: 30 });
    const wm = Mt(T.wall, T.wallTex, 2.5, 1.2), fm = Mt(T.floor, T.floorTex, 2, 1.1), pm = new THREE.MeshStandardMaterial({ color: T.prop, roughness: 0.6 });
    R.add(GEO.box, fm, mat4(cx, -0.5, -0.5, 0, 0, 0, 30, 1, 7));
    R.add(GEO.box, wm, mat4(cx, 6, -3.3, 0, 0, 0, 30, 16, 0.4));
    R.add(GEO.box, wm, mat4(x0 - 3, 6, -0.5, 0, 0, 0, 6, 16, 7));
    R.add(GEO.box, wm, mat4(x1 + 3, 6, -0.5, 0, 0, 0, 6, 16, 7));
    R.add(GEO.box, wm, mat4(cx, 7.6, -0.5, 0, 0, 0, 30, 0.8, 7));
    for (const px of [x0 + 4.4, x1 - 2.6]) {   // props against the back wall
      R.add(GEO.box, pm, mat4(px, 0.45, -2.6, 0, 0.2, 0, 1.2, 0.9, 0.9));
      R.add(GEO.box, pm, mat4(px + 0.9, 0.35, -2.5, 0, -0.3, 0, 0.8, 0.7, 0.7));
    }
    if (sd.theme === 'vault') for (let i = 0; i < 9; i++) R.add(GEO.box, glow(0xffc94a, 0.8), mat4(x0 + 4 + i * 1.1, 0.12 + (i % 3) * 0.1, -2.2, 0, i, 0, 0.6, 0.25 + (i % 3) * 0.2, 0.6));
    const name = textPanel(sd.name, { w: 6, h: 1, color: css(T.accent), neon: true, font: 'Bungee' });
    name.position.set(cx, 5.4, -3.05); scene.add(name);
    for (const lx of [x0 + 3, cx, x1 - 3]) api.addLantern(new THREE.Vector3(lx, 3.8, -2.9));
    mkDoor(x0 + 1.8, 0, -3.0, 'EXIT \u25B2');
    return {
      i: k, x: sd.x, y, hp: sd.hp || 6, open: false, facade, crackMat, frameMat, door, name: sd.name,
      room: { x0, x1, cx, exitX: x0 + 1.8 }, loot: sd.loot || [], guards: sd.guards || [], visited: false,
    };
  });
  R.build(scene, { cast: false, receive: true });
  return api;
}
