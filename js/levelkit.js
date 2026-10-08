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

  const api = {
    L, solids, ledges, movers, amps, juke, lanterns, B, onGround, lanternMat, ladders,
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
      for (const a of amps) {
        a.ringMat.emissiveIntensity = 0.5 + pulse * 3;
        for (const c of a.cones) c.scale.y = 1 + pulse * 2;
      }
    },
  };
  return api;
}
