// Gameplay for one level: players (1 or 2), weapons, enemies, the ambush, the boss, pickups and the beat rules.
// Anything that carries between levels (score, lives, cash, upgrades, difficulty) lives in `run`.
import * as THREE from 'three';
import {
  makeHero, HEROES, makeZombie, makeCrawler, makeRat, makeGhost, makeHand, makeCrow, makeGargoyle, makeBanshee, makeMummy, makeHearse, makeDevil, makeFlightCase,
  makeWeaponMesh, makeSkull, makeBottle, makeFireball, makePickup, makeBones, makeCutout, MAT,
} from './models.js';
import { popup } from './fx.js';
import { save, collectRecord, findSecret } from './config.js';

const G = 38;               // gravity
const RUN = 6.2;
const SUPER_JUMP = 21.5;    // off an amp, on the beat
const FACE_Y = Math.PI / 2 - 0.35;  // 3/4 view toward camera
export const WEAPONS = {
  pick:   { name: 'PICKS',          max: 3, cd: 0.16 },
  sticks: { name: 'DRUMSTICKS',     max: 6, cd: 0.3 },
  vinyl:  { name: 'VINYL',          max: 1, cd: 0.2 },
  flame:  { name: 'FLAMING GUITAR', max: 2, cd: 0.3 },
  notes:  { name: 'NOTES',          max: 4, cd: 0.18 },
  spanner: { name: 'SPANNER',       max: 2, cd: 0.38 },
};
const PLAYER_COLORS = [0xff2e88, 0x2fa8ff];

const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
const faceRot = (f) => (f > 0 ? FACE_Y : -FACE_Y);
const rand = (a, b) => a + Math.random() * (b - a);

function disposeTree(o) { o.traverse((m) => { if (m.isMesh && m.geometry) m.geometry.dispose(); }); }

export class Game {
  /**
   * world: the built level (solids, ledges, L layout...). run: carries between levels.
   * players: [{ char, controls }] (1 or 2 entries).
   */
  constructor({ world, scene, camera, music, ui, sparks, chunks, run, players, resume = null }) {
    Object.assign(this, { level: world, L: world.L, scene, camera, music, ui, sparks, chunks, run });
    this.D = run.diff;
    this.halfW = 9;
    this.hitStop = 0;
    this.cine = null;
    this.t = 0;
    this.beat = { pulse: 0, frac: 0 };
    this.players = players.map((cfg, i) => this.makePlayer(i, cfg));
    this.coop = this.players.length > 1;
    this.stats = { kills: 0, throws: 0, onBeat: 0, deaths: 0, time: 0 };
    this.startScore = run.score;
    this.bestCombo = 0;
    this.recordsFound = [];
    this.zoneIdx = -1;
    this.checkpointX = this.L.start;
    this.jukeOn = false;
    this.secretFound = false;
    this.ambush = { state: 'idle', wave: 0, queue: [], wait: 0 };
    this.soundcheck = this.L.soundcheck && save.settings.soundcheck && !run.encore && resume === null ? { left: this.L.soundcheck.length } : null;
    this.enemies = []; this.shots = []; this.foeShots = []; this.pickups = []; this.debris = []; this.fires = []; this.rings = [];
    const mkCrate = (c) => {
      const mesh = makeFlightCase();
      const y = c.y || 0;
      mesh.position.set(c.x, y, -0.5);
      mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(mesh);
      return { x: c.x, y, hp: 2, mesh, loot: c.loot, flash: 0 };
    };
    this.crates = this.L.crates.map(mkCrate);
    // Secret areas: their loot waits in flight cases inside each room
    this.doors = this.level.secretDoors || [];
    this.room = null;
    this.secretsFound = [];
    for (const d of this.doors) d.loot.forEach((loot, i) => this.crates.push(mkCrate({ x: d.room.x0 + 6 + i * 2.6, loot })));
    this.L.records.forEach((r, i) => {
      const old = (save.records[this.L.id] || []).includes(i);
      const mesh = makePickup('platinum');
      mesh.position.set(r.x, r.y, 0);
      if (old) mesh.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; } });
      scene.add(mesh);
      this.pickups.push({ kind: 'platinum', id: i, old, x: r.x, y: r.y, mesh, t: 0, forever: true });
    });
    if (this.soundcheck) {
      this.dummies = this.L.soundcheck.map((x) => {
        const mesh = makeCutout();
        mesh.position.set(x, 0, -0.1);
        mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(mesh);
        return { x, mesh, down: false, fall: 0 };
      });
      ui.hint('SOUNDCHECK: throw when the ring flashes. Knock down the 3 cut-outs ON THE BEAT.');
    }
    // Continuing after a game over: pick up from the last checkpoint, not the start of the gig
    this.resumed = resume !== null;
    if (this.resumed) {
      this.checkpointX = resume;
      this.zoneIdx = this.zoneAt(resume);
      if (resume >= this.L.checkpoint) { this.jukeOn = true; this.level.juke.glow.emissiveIntensity = 3; }
      if (resume >= this.L.ambush.x2 - 1) this.ambush.state = 'done';
    }
    this.respawnAll(this.resumed ? resume : this.L.start, true);
    // Upgrades bought at the merch stand
    if (run.upgrades.flame) { this.players.forEach((p) => (p.weapon = 'flame')); run.upgrades.flame = false; }
  }

  // ---------------------------------------------------------------------------
  makePlayer(i, { char, controls }) {
    const hero = makeHero(char);
    this.scene.add(hero.root);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 32),
      new THREE.MeshBasicMaterial({ color: PLAYER_COLORS[i], transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    return {
      id: i, char, hero, ring, ctrl: controls, color: PLAYER_COLORS[i],
      weapon: HEROES[char].weapon, jumpV: HEROES[char].jump, solo: 0, combo: 0,
      x: 0, y: 0, vx: 0, vy: 0, w: 0.3, h: 1.8, face: 1, landGrace: 0.22,
    };
  }

  resetPlayer(p, x, y = 0) {
    Object.assign(p, {
      x, y, vx: 0, vy: 0, h: 1.8, face: 1, onGround: true, crouch: false,
      armor: this.run.upgrades.spikes ? 2 : 1, inv: 1.5, stun: 0, cd: 0, throwT: 0, dead: false, deadT: 0, out: false,
      coyote: 0, buffer: 0, phase: 0, jumpCut: false, drop: 0, wasGround: true, soloT: 0, standing: null,
      safeX: undefined, safeY: undefined, combo: 0, climb: null,
    });
    p.hero.root.visible = true;
    p.hero.setArmor(p.armor);
    p.hero.slung();
    p.hero.root.position.set(x, y, 0);
  }

  get alive() { return this.players.filter((p) => !p.dead && !p.out); }
  /** Nearest living player to x (enemies aim at this one). Falls back to player 1 so AI always has a target. */
  target(x) {
    let best = null, d = Infinity;
    for (const p of this.players) if (!p.dead && !p.out && Math.abs(p.x - x) < d) { d = Math.abs(p.x - x); best = p; }
    return best || this.players[0];
  }
  get lead() { return this.alive.reduce((a, b) => (b.x > a.x ? b : a), this.alive[0] || this.players[0]); }

  /** Back to a checkpoint: clears enemies and resets the level's set pieces past that point. */
  respawnAll(x, first = false) {
    for (const list of [this.enemies, this.shots, this.foeShots, this.debris, this.fires, this.rings]) {
      for (const e of list) { const o = e.mesh || e.model?.root; if (o) { this.scene.remove(o); } }
    }
    this.enemies = []; this.shots = []; this.foeShots = []; this.debris = []; this.fires = []; this.rings = [];
    this.boss = null;
    this.headbangersLeft = [...this.L.headbangers];
    this.throwersLeft = this.L.throwers.map((d) => ({ ...d }));
    for (const bx of this.L.birds) typeof bx === 'number' ? this.spawnBird(bx) : this.spawnBird(bx.x, bx.y);
    for (const hx of this.L.hands) this.spawnHand(hx);
    this.players.forEach((p, i) => { if (!p.out || first) this.resetPlayer(p, x - i * 1.2); });
    this.camX = x + 4;
    this.lock = null;
    this.room = null;
    this.cine = null;
    this.bossStarted = false;
    this.bossDone = false;
    this.bossAngry = false;
    if (this.ambush.state === 'active') this.ambush = { state: 'idle', wave: 0, queue: [], wait: 0 };
    this.level.gate.position.y = 6.5;
    const gs = this.level.solids;
    if (this.gateSolid) { gs.splice(gs.indexOf(this.gateSolid), 1); this.gateSolid = null; }
    this.ui.boss(null);
    if (!first) this.ui.bossIntro(null);
  }

  // ---------------------------------------------------------------------------
  // Physics: move an actor box {x,y,w,h,vx,vy} against solids and one-way ledges.
  move(a, dt, ledges = true) {
    const S = this.level.solids;
    a.hitWall = false;
    a.x += a.vx * dt;
    for (const s of S) {
      if (a.y < s.y2 - 0.001 && a.y + a.h > s.y1 + 0.001 && a.x + a.w > s.x1 && a.x - a.w < s.x2) {
        if (a.vx > 0 || (a.vx === 0 && a.x < (s.x1 + s.x2) / 2)) a.x = s.x1 - a.w; else a.x = s.x2 + a.w;
        a.hitWall = true;
      }
    }
    const prevY = a.y;
    a.vy -= G * dt;
    a.y += a.vy * dt;
    a.onGround = false;
    a.standing = null;
    const lw = a.w + (a.landGrace || 0);   // players can land on the very edge with their toes
    for (const s of S) {
      if (!(a.y < s.y2 && a.y + a.h > s.y1)) continue;
      const landX = a.x + lw > s.x1 + 0.001 && a.x - lw < s.x2 - 0.001;
      const bodyX = a.x + a.w > s.x1 + 0.001 && a.x - a.w < s.x2 - 0.001;
      if (landX && a.vy <= 0 && prevY >= s.y2 - 0.08) { a.y = s.y2; a.vy = 0; a.onGround = true; a.standing = s; }
      else if (bodyX && a.vy > 0) { a.y = s.y1 - a.h; a.vy = 0; }
    }
    if (ledges && !(a.drop > 0)) {
      for (const l of this.level.ledges) {
        const tol = l.mover ? 0.25 : 0.02;
        if (a.vy <= 0 && prevY >= l.y - tol && a.y <= l.y && a.x > l.x1 - a.w * 0.6 && a.x < l.x2 + a.w * 0.6) {
          a.y = l.y; a.vy = 0; a.onGround = true; a.standing = l;
        } else if (a.landGrace && a.vy > -1 && a.vy < 3.5 && a.y < l.y && a.y > l.y - 0.4 && a.x > l.x1 && a.x < l.x2) {
          // Players only: at the top of a jump and just short of a ledge, pull yourself up onto it
          a.y = l.y; a.vy = 0; a.onGround = true; a.standing = l;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  update(dt, t, beat) {
    this.t = t;
    this.beat = beat;
    if (!this.bossDone) this.stats.time += dt;   // speed-run clock: everything counts, deaths included
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    if (this.cine) {
      this.cine.t += dt;
      if (this.cine.t > this.cine.dur) { this.cine = null; this.ui.bossIntro(null); }
    }
    this.level.updateMovers(this.music.beatFloat());
    for (const p of this.players) this.updatePlayer(p, dt);
    this.updateShots(dt);
    this.updateFires(dt);
    this.updateEnemies(dt);
    this.updateFoeShots(dt);
    this.updateCrates(dt);
    this.updateDummies(dt);
    for (const fx of this.level.campfires) if (Math.abs(fx - this.camX) < this.halfW + 2) {
      this.sparks.emit({ x: fx + rand(-0.3, 0.3), y: 0.25 }, { n: 2, color: [0xff6a1a, 0xffc94a, 0xff2e10], speed: 0.6, up: 2.8, life: 0.5, size: 0.12, gravity: -3, intensity: 1.8, spread: 0.4 });
    }
    this.updateVents();
    this.updatePickups(dt);
    this.updateDebris(dt);
    this.updateAmbush(dt);
    this.updateCamera(dt);
    this.updateBand();
  }

  zoneAt(x) {
    let z = 0;
    this.L.zones.forEach((zone, i) => { if (x >= zone.x) z = i; });
    return z;
  }

  /** Called once per beat by the main loop. */
  onBeat(i) {
    if (!this.alive.length) return;
    const lead = this.lead;
    const zone = this.L.zones[this.zoneAt(lead.x)];
    // The director: something new crawls out every other beat.
    const quiet = this.bossStarted || this.ambush.state === 'active' || (this.soundcheck && this.soundcheck.left > 0) || this.cine;
    if (!quiet && i % 2 === 0 && lead.x > 8 && lead.x < this.L.arena.gate - 4) {
      const ambient = this.enemies.filter((e) => e.ambient && !e.dead).length;
      const max = zone.max + this.D.spawnMax + (this.coop ? 1 : 0);
      if (ambient < max && Math.random() < this.D.spawnChance) this.spawnAmbient(zone, lead);
    }
    this.headbangersLeft = this.headbangersLeft.filter((x) => {
      if (Math.abs(lead.x - x) < 10 && x > lead.x - 2) { this.spawnZombie('headbanger', x, this.level.surfaceAt(x) ?? 0); return false; }
      return true;
    });
    this.throwersLeft = this.throwersLeft.filter((d) => {
      if (Math.abs(lead.x - d.x) < 15 && d.x > lead.x - 3) { this.spawnThrower(d); return false; }
      return true;
    });
    if (this.ambush.state === 'active' && this.ambush.queue.length) this.spawnAmbushMember(this.ambush.queue.shift());
    for (const e of this.enemies) e.onBeat && !e.dead && e.onBeat(i);
    if (i % 4 === 0 && this.level.stormAt(this.camX) > 0.6 && Math.random() < 0.3) this.ui.lightning();
    // Fire vents: they rumble on one beat and blow on the next
    const vents = (this.L.vents || []).filter((vx) => Math.abs(vx - this.camX) < this.halfW + 4);
    if (vents.length && i % 4 === 1) {
      if (vents.some((vx) => Math.abs(vx - lead.x) < 12)) this.music.sRumble();
      for (const vx of vents) this.sparks.emit({ x: vx, y: 0.1 }, { n: 6, color: [0xff6a1a, 0xffc94a], speed: 1, up: 2, life: 0.4, size: 0.08, gravity: -1, intensity: 1.6, spread: 0.4 });
    }
    if (vents.length && i % 4 === 2 && vents.some((vx) => Math.abs(vx - lead.x) < 12)) this.music.sFireball();
    // Route 666: a hearse comes screaming down the road every two bars
    const T = this.L.traffic;
    if (T && !this.bossStarted && lead.x > T.x1 - 4 && lead.x < T.x2) {
      if (i % 8 === 5) {
        this.music.sHorn();
        popup('HEARSE! Jump it or get up high', 'beat', { x: lead.x, y: lead.y + 2.6 }, this.camera);
      }
      // 12 units out at 16 u/s: it reaches you two beats later, right on the downbeat
      if (i % 8 === 6) this.spawnHearse(lead.x + 12);
    }
    // Porta-loos: every couple of bars a zombie bursts out of a nearby one
    // a beat of warning first: the door rattles
    if (!quiet && i % 8 === 3) for (const lx of this.L.loos || []) if (Math.abs(lead.x - lx) < 11 && Math.abs(lead.x - lx) > 3) {
      this.music.sCreak();
      this.chunks.emit({ x: lx, y: 1.2 }, { n: 6, color: [0x2a5ab0, 0xe8e8e8], speed: 2, up: 1, life: 0.4, size: 0.07 });
    }
    if (!quiet && i % 8 === 4) for (const lx of this.L.loos || []) {
      if (Math.abs(lead.x - lx) < 11 && Math.abs(lead.x - lx) > 3 && this.enemies.filter((e) => e.ambient && !e.dead).length < zone.max + 1) {
        const z = this.spawnZombie('walker', lx);
        z.state = 'walk'; z.ambient = true; z.model.root.position.y = 0;
        this.music.sCreak();
        this.chunks.emit({ x: lx, y: 1 }, { n: 8, color: [0x2a5ab0, 0xe8e8e8], speed: 3, up: 2, life: 0.5, size: 0.08 });
      }
    }
  }

  updateVents() {
    // locked to the music clock: they blow from beat 2 to beat 3.5 of every bar
    if (!this.L.vents || !this.music.ctx) return;
    const ph = ((this.music.beatFloat() % 4) + 4) % 4;
    if (ph < 2 || ph >= 3.5) return;
    for (const vx of this.L.vents || []) {
      if (Math.abs(vx - this.camX) > this.halfW + 4) continue;
      this.sparks.emit({ x: vx + rand(-0.3, 0.3), y: 0.1 }, { n: 4, color: [0xff6a1a, 0xffc94a, 0xff2e10], speed: 1, up: 9, life: 0.35, size: 0.16, gravity: -2, intensity: 2, spread: 0.3 });
      for (const p of this.players) if (!p.dead && !p.out && Math.abs(p.x - vx) < 0.6 && p.y < 3) this.hurt(p, vx);
      for (const e of this.enemies) if (!e.dead && !e.boss && e.kind !== 'ghost' && e.kind !== 'bird' && Math.abs(e.x - vx) < 0.5 && e.y < 2) this.killEnemy(e, false);
    }
  }

  spawnHearse(x) {
    const mesh = makeHearse();
    mesh.position.set(x, 0, 1.0);
    this.scene.add(mesh);
    this.music.sEngine();
    this.foeShots.push({ kind: 'hearse', x, y: 0, vx: -16, vy: 0, life: 4, mesh, w: 1.8, h: 1.15 });
  }

  spawnAmbient(zone, lead) {
    let roll = Math.random(), kind = 'walker';
    for (const [k, w] of Object.entries(zone.spawn)) { if ((roll -= w) <= 0) { kind = k; break; } }
    const dir = Math.random() < 0.7 ? 1 : -1;
    for (let tries = 0; tries < 6; tries++) {
      const x = lead.x + dir * rand(4, 11);
      if (x < this.camX - this.halfW + 1 || x > this.L.arena.gate - 3) continue;
      if (this.enemies.some((e) => e.kind !== 'bird' && Math.abs(e.x - x) < 1.5)) continue;
      if (kind === 'ghost') { this.spawnGhost(x, lead.y + 1.5 + Math.random()).ambient = true; return; }
      // Appear on the surface the player is on (street or rooftop), never right at an edge.
      const sy = this.level.surfaceAt(x);
      if (sy === null || Math.abs(sy - lead.y) > 2.5 || this.level.ladders.some((l) => Math.abs(l.x - x) < 1)) continue;
      if (this.level.surfaceAt(x - 2.5) !== sy || this.level.surfaceAt(x + 2.5) !== sy) continue;
      if ((this.L.amps || []).some(([ax]) => Math.abs(x - ax) < 1.1)) continue;
      if (kind === 'rat') {
        // rats come in packs out of the drains
        for (let k = 0; k < 2; k++) if (this.level.surfaceAt(x + k * 0.9 * dir) === sy) this.spawnRat(x + k * 0.9 * dir, sy).ambient = true;
        return;
      }
      const e = kind === 'crawler' ? this.spawnCrawler(x, sy) : this.spawnZombie(kind, x, sy);
      e.ambient = true;
      return;
    }
  }

  // ---------------------------------------------------------------------------
  updatePlayer(p, dt) {
    const inp = p.ctrl, M = this.music;
    if (p.out) { p.hero.root.visible = false; p.ring.visible = false; return; }
    if (p.dead) {
      p.deadT -= dt;
      p.ring.visible = false;
      if (p.deadT <= 0) this.afterDeath(p);
      return;
    }
    p.inv -= dt; p.stun -= dt; p.cd -= dt; p.throwT -= dt; p.drop -= dt; p.soloT -= dt;

    if (p.onGround && p.standing && p.standing.mover) { p.x += p.standing.dx; p.y += p.standing.dy; }

    const ctrl = p.stun <= 0 && p.soloT <= 0 && !this.cine;
    // Ladders: Up grabs one you're standing at, Down at the top climbs down onto it.
    if (!p.climb && ctrl) {
      const l = this.level.ladders.find((d) => Math.abs(p.x - d.x) < 0.65 && p.y >= d.y1 - 0.1 && p.y <= d.y2 + 0.05);
      if (l && inp.held.up && p.y < l.y2 - 0.05) { p.climb = l; p.buffer = 0; }
      else if (l && inp.held.down && p.onGround && Math.abs(p.y - l.y2) < 0.15) { p.climb = l; p.y = l.y2 - 0.4; }
    }
    if (p.climb) { this.climbStep(p, dt); return; }
    p.doorCd = (p.doorCd || 0) - dt;
    if (ctrl && p.onGround && p.doorCd <= 0) this.doorCheck(p, inp);
    if (p.doorCd > 0.3) p.buffer = 0;   // up doubles as jump on some layouts: no hop after a door
    const left = ctrl && inp.held.left, right = ctrl && inp.held.right;
    p.crouch = ctrl && inp.held.down && p.onGround;
    p.h = p.crouch ? 1.1 : 1.8;

    let target = 0;
    if (!p.crouch) target = (right ? 1 : 0) - (left ? 1 : 0);
    if (target) p.face = target;
    const accel = p.onGround ? 70 : 42;
    if (p.soloT > 0 || this.cine) p.vx *= 0.8;
    else if (ctrl) {
      const inMud = p.onGround && this.level.mudAt(p.x);
      const goal = target * RUN * (inMud ? 0.5 : 1);
      if (inMud && Math.abs(p.vx) > 1 && Math.random() < 0.2) this.chunks.emit({ x: p.x, y: 0.05 }, { n: 1, color: 0x3a2618, speed: 1.5, up: 1.5, life: 0.4, size: 0.08 });
      p.vx += Math.sign(goal - p.vx) * Math.min(Math.abs(goal - p.vx), accel * dt);
    }

    p.coyote = p.onGround ? 0.09 : p.coyote - dt;
    p.buffer = ctrl && inp.pressed.jump ? 0.12 : p.buffer - dt;
    const onLedge = p.standing && !('y2' in p.standing);
    if (p.buffer > 0 && inp.held.down && onLedge && p.onGround) {
      p.drop = 0.25; p.buffer = 0; p.onGround = false;
    } else if (p.buffer > 0 && p.coyote > 0) {
      p.buffer = 0; p.coyote = 0; p.jumpCut = false;
      if (p.standing && p.standing.amp && M.onBeat(this.D.beatWindow + 0.02)) {
        p.vy = SUPER_JUMP; p.jumpCut = true;
        M.sAmp();
        this.addSolo(p, 6);
        this.sparks.emit({ x: p.x, y: p.y }, { n: 30, color: [0xff2e88, 0xa6ff4d, 0xffffff], speed: 7, up: 3, life: 0.6, size: 0.08, gravity: 6, intensity: 2 });
        popup('AMPED!', 'beat', { x: p.x, y: p.y + 2.4 }, this.camera);
        this.ui.shake(0.25);
      } else {
        p.vy = p.jumpV * (this.level.mudAt(p.x) ? 0.85 : 1);
        M.sJump();
        if (p.standing && p.standing.amp) popup('Jump on the beat!', 'info', { x: p.x, y: p.y + 2.4 }, this.camera);
      }
    }
    if (!inp.held.jump && p.vy > 4 && !p.jumpCut && !inp.fullJump) { p.vy *= 0.5; p.jumpCut = true; }

    // ---- Character moves ----
    if (p.onGround) p.airJump = true;
    // Drummer: double jump
    if (p.char === 'drummer' && ctrl && !p.onGround && p.buffer > 0 && p.coyote <= 0 && p.airJump) {
      p.airJump = false; p.buffer = 0; p.vy = 13; p.jumpCut = false;
      M.sJump();
      this.sparks.emit({ x: p.x, y: p.y + 0.1 }, { n: 16, color: [0x2fa8ff, 0xffffff], speed: 4, up: -1, life: 0.35, size: 0.07, gravity: 2, intensity: 2 });
    }
    // Singer: hold Jump while falling to glide
    p.gliding = p.char === 'singer' && ctrl && !p.onGround && inp.held.jump && p.vy < -2.2;
    if (p.gliding) {
      p.vy = -2.2;
      if (Math.random() < 0.25) this.sparks.emit({ x: p.x - p.face * 0.3, y: p.y + 1.4 }, { n: 1, color: [0xff8ac8, 0x9affd8], speed: 0.6, up: -0.5, life: 0.6, size: 0.09, gravity: 0, intensity: 2 });
    }
    // Bassist: Down while running = slide tackle (low, fast, bowls zombies over, can't be hurt)
    p.slideCd = (p.slideCd || 0) - dt;
    if (p.char === 'bassist' && ctrl && p.onGround && inp.pressed.down && Math.abs(p.vx) > 3 && p.slideCd <= 0 && !(p.slideT > 0)) {
      p.slideT = 0.38; p.slideDir = Math.sign(p.vx); p.slideCd = 0.8; p.slideHits = new Set();
      M.sThrow();
    }
    if (p.slideT > 0) {
      p.slideT -= dt;
      p.vx = p.slideDir * 13; p.face = p.slideDir; p.h = 0.8; p.crouch = true;
      if (Math.random() < 0.7) this.chunks.emit({ x: p.x - p.slideDir * 0.4, y: p.y + 0.05 }, { n: 1, color: [0x6a5a50, 0x8a7a70], speed: 2, up: 1.5, life: 0.35, size: 0.08 });
      const me = { x1: p.x - 0.5, x2: p.x + 0.5, y1: p.y, y2: p.y + 0.9 };
      for (const e of this.enemies) {
        if (e.dead || p.slideHits.has(e) || !e.hittable() || !overlap(e.box(), me)) continue;
        p.slideHits.add(e);
        this.damage(e, { dmg: 2, x: e.x, y: p.y + 0.4, vx: p.slideDir, power: false, owner: p, r: 0.3 });
        this.ui.shake(0.15);
      }
    }

    const W = WEAPONS[p.weapon];
    const mine = this.shots.filter((s) => s.owner === p).length;
    if (ctrl && inp.pressed.throw && p.cd <= 0 && mine < W.max) this.throwWeapon(p);
    if (inp.pressed.special && !this.cine && p.soloT <= 0) {
      if (p.solo >= 100) this.guitarSolo(p);
      else popup('Solo not ready', 'info', { x: p.x, y: p.y + 2.4 }, this.camera);
    }

    this.move(p, dt);
    if (p.hitWall) {
      const b = (this.level.barricades || []).find((q) => !q.broken && p.y < q.solid.y2 - 0.1 && Math.abs(p.x - (p.face > 0 ? q.solid.x1 - p.w : q.solid.x2 + p.w)) < 0.1);
      if (b && p.char === 'roadie') this.smashBarricade(b);
      else if (b && !b.hinted) { b.hinted = true; popup('Climb the ladder: UP (the Roadie barges through!)', 'info', { x: b.x, y: b.solid.y2 + 1 }, this.camera); }
    }
    const minX = this.camX - this.halfW + 0.4;
    if (p.x < minX && !this.room) { p.x = minX; p.vx = Math.max(0, p.vx); }   // in a room, its walls are the limit
    if (this.coop && !this.room) { const maxX = this.camX + this.halfW - 0.4; if (p.x > maxX) { p.x = maxX; p.vx = Math.min(0, p.vx); } }
    if (this.lock) p.x = Math.min(Math.max(p.x, this.lock.x1 + p.w), this.lock.x2 - p.w);
    if (p.onGround && !p.wasGround) {
      M.sLand();
      const hard = Math.min(1, Math.max(0, -(p.lastVy || 0) - 4) / 16);
      p.squash = 0.3 + hard * 0.7;
      this.chunks.emit({ x: p.x, y: p.y + 0.05 }, { n: 4 + Math.round(hard * 10), color: [0x6a5a50, 0x8a7a70], speed: 2 + hard * 3, up: 1 + hard, life: 0.35 + hard * 0.2, size: 0.07 + hard * 0.04 });
    }
    p.wasGround = p.onGround;
    if (p.onGround && Math.abs(p.vx) > 3 && Math.random() < 0.15) this.chunks.emit({ x: p.x - p.face * 0.2, y: p.y + 0.05 }, { n: 1, color: 0x3b2f2a, speed: 1, up: 0.8, life: 0.3, size: 0.06 });
    if (p.onGround && p.standing && 'y2' in p.standing && !p.standing.amp &&
        (this.level.onGround(p.x - 0.8) || p.y > 0.5) && (this.level.onGround(p.x + 0.8) || p.y > 0.5)) { p.safeX = p.x; p.safeY = p.y; }
    if (p.y < -5) this.fellInPit(p);
    // Haunted bouncy castle: always bounces you; land on the beat for a sky-high one
    if (p.onGround && p.standing && p.standing.bounce) {
      const big = this.music.onBeat(this.D.beatWindow + 0.03);
      p.vy = big ? 20.5 : 13.5; p.onGround = false; p.jumpCut = true;
      this.music.sBoing();
      if (big) { popup('BOING!', 'beat', { x: p.x, y: p.y + 2.4 }, this.camera); this.addSolo(p, 4); }
    }
    for (const fx of this.level.campfires) if (Math.abs(p.x - fx) < 0.55 && p.y < 0.7) this.hurt(p, fx);

    if (!this.secretFound && p.y > 5.5 && p.onGround && !this.bossStarted) {
      this.secretFound = true; this.run.score += 500;
      this.music.sLife();
      popup('SECRET FOUND! +500', 'pts', { x: p.x, y: p.y + 2.4 }, this.camera);
    }
    const zi = this.zoneAt(p.x);
    if (zi > this.zoneIdx) {
      this.zoneIdx = zi;
      if (zi > 0) {
        this.ui.zone(this.L.zones[zi].name);
        const cp = this.L.zones[zi].checkpoint;
        if (this.D.zoneCheckpoints && cp && cp > this.checkpointX) this.checkpointX = cp;
      }
    }
    if (!this.jukeOn && p.x > this.L.checkpoint) {
      this.jukeOn = true; this.checkpointX = Math.max(this.checkpointX, this.L.checkpoint);
      this.level.juke.glow.emissiveIntensity = 3;
      M.sCheckpoint();
      this.ui.banner('Checkpoint', 'The jukebox saved your spot');
      this.sparks.emit({ x: this.L.checkpoint, y: 1.6 }, { n: 40, color: [0xffb347, 0xff2e88], speed: 6, up: 4, life: 1 });
    }
    if (this.ambush.state === 'idle' && p.x > this.L.ambush.trigger) this.startAmbush();
    if (!this.bossStarted && !this.bossDone && p.x > this.L.arena.trigger) this.startBoss();

    this.animateHero(p, dt);
  }

  climbStep(p, dt) {
    const L = p.climb, inp = p.ctrl;
    p.x += (L.x - p.x) * Math.min(1, dt * 15);
    p.vx = 0; p.vy = 0;
    p.crouch = false; p.h = 1.8; p.onGround = false; p.standing = null;
    const dir = (inp.held.up ? 1 : 0) - (inp.held.down ? 1 : 0);
    p.y += dir * 4.4 * dt;
    p.climbPhase = (p.climbPhase || 0) + Math.abs(dir) * dt * 9;
    if (inp.held.left) p.face = -1;
    if (inp.held.right) p.face = 1;
    const W = WEAPONS[p.weapon];
    if (inp.pressed.throw && p.cd <= 0 && this.shots.filter((s) => s.owner === p).length < W.max) this.throwWeapon(p);
    if (p.y >= L.y2) { p.y = L.y2 + 0.02; p.climb = null; this.music.sLand(); }          // step off at the top
    else if (p.y <= L.y1) { p.y = L.y1; p.climb = null; }                                 // reached the bottom
    else if (inp.pressed.jump && !inp.held.up) { p.climb = null; p.vy = 8; p.jumpCut = true; }   // hop off sideways
    this.animateHero(p, dt);
  }

  fellInPit(p) {
    const saved = this.D.pitSave === 'always' || (this.D.pitSave === 'jacket' && p.armor > 0);
    if (saved && p.safeX !== undefined) {
      if (p.armor > 0) { p.armor--; p.hero.setArmor(p.armor); }
      p.x = p.safeX; p.y = p.safeY + 0.5; p.vx = 0; p.vy = 6; p.inv = 2;
      p.combo = 0;
      this.music.sHurt(); this.ui.shake(0.4);
      popup(this.D.pitSave === 'always' && p.armor === 0 ? 'Back you go!' : 'Saved by the jacket!', 'beat', { x: p.x, y: p.y + 2.4 }, this.camera);
    } else this.kill(p);
  }

  afterDeath(p) {
    const partner = this.players.find((q) => q !== p && !q.dead && !q.out);
    const nearBoss = this.bossStarted || p.x > this.L.arena.gate - 4;
    this.continueX = nearBoss ? this.L.arena.gate - 6 : this.checkpointX;   // where Continue picks up after a game over
    this.run.lives--;
    if (this.run.lives <= 0) {
      this.run.lives = 0;
      if (partner) { p.out = true; p.hero.root.visible = false; return; }
      this.ui.gameOver(this); return;
    }
    if (partner) {
      // co-op: drop back in next to your partner
      if (!partner.onGround) { this.run.lives++; p.deadT = 0.2; return; }
      const x = partner.x - partner.face * 1.2;
      this.resetPlayer(p, this.level.groundY(x) === null && !this.level.onSolidTop(x) ? partner.x : x, partner.y + 0.3);
      p.inv = 2.5;
      popup('BACK IN!', 'beat', { x: p.x, y: p.y + 2.4 }, this.camera);
      return;
    }
    if (this.players.some((q) => q !== p && q.dead && !q.out)) return;   // wait for the other player's timer
    this.respawnAll(this.continueX);
  }

  animateHero(p, dt) {
    const P = p.hero;
    P.root.position.set(p.x, p.y, 0);
    P.root.rotation.y += ((p.climb ? Math.PI : faceRot(p.face)) - P.root.rotation.y) * Math.min(1, dt * 18);
    P.root.visible = p.inv > 0 && p.soloT <= 0 ? Math.floor(p.inv * 16) % 2 === 0 : true;

    // Beat ring at the feet: a little metronome you can see
    const f = this.beat.frac ?? 0;
    p.ring.visible = true;
    p.ring.position.set(p.x, p.y + 0.03, 0);
    p.ring.scale.setScalar(0.7 + f * 1.4);
    p.ring.material.opacity = this.music.ctx ? (1 - f) * 0.55 : 0;

    const speed = Math.abs(p.vx);
    p.phase += speed * dt * 2.1;
    const run = Math.min(1, speed / RUN);
    let legL, legR, kneeL = 0, kneeR = 0, armL, armR, elL = -0.2, elR = -0.2, bodyY = 0, lean = 0;
    const near = p.face > 0 ? 'L' : 'R';
    if (p.climb) {
      const c = Math.sin(p.climbPhase || 0);
      armL = -2.7 + c * 0.45; armR = -2.7 - c * 0.45; elL = elR = -0.5;
      legL = -0.7 - c * 0.5; legR = -0.7 + c * 0.5; kneeL = 1.1 + c * 0.4; kneeR = 1.1 - c * 0.4;
    } else if (p.soloT > 0) {
      legL = -0.35; legR = 0.35; kneeL = 0.3; kneeR = 0.2; lean = -0.25;
      if (p.char === 'drummer') {
        // drum roll: both arms hammering
        armL = -1.3 + Math.sin(this.t * 40) * 0.5; armR = -1.3 - Math.sin(this.t * 40) * 0.5; elL = elR = -1.2;
      } else {
        const spin = -(1.4 - p.soloT) * 22;
        armL = near === 'L' ? spin : -1.2; armR = near === 'R' ? spin : -1.2; elL = elR = 0;
      }
      P.head.rotation.x = Math.sin(this.t * 25) * 0.3;
    } else if (p.slideT > 0) {
      legL = -1.4; legR = -1.2; kneeL = 0.2; kneeR = 0.4; armL = armR = -1.0; elL = elR = -0.3; bodyY = -0.55; lean = -0.7;
    } else if (p.gliding) {
      legL = -0.3; legR = 0.2; kneeL = 0.4; kneeR = 0.3; armL = armR = -1.57; elL = elR = 0; lean = 0.15;
    } else if (p.crouch) {
      legL = legR = -1.25; kneeL = kneeR = 1.7; armL = armR = -0.7; elL = elR = -0.8; bodyY = -0.35; lean = 0.25;
    } else if (!p.onGround) {
      legL = -0.9; legR = 0.3; kneeL = 1.3; kneeR = 0.5; armL = -2.4; armR = 0.5; elL = -0.3; elR = -0.6; lean = -0.05;
    } else {
      const s = Math.sin(p.phase);
      legL = s * 0.8 * run; legR = -s * 0.8 * run;
      kneeL = Math.max(0, Math.sin(p.phase + 1.4)) * 1.2 * run + 0.05;
      kneeR = Math.max(0, Math.sin(p.phase + 1.4 + Math.PI)) * 1.2 * run + 0.05;
      armL = -s * 0.7 * run; armR = s * 0.7 * run;
      elL = elR = -0.2 - 0.9 * run;
      bodyY = Math.abs(Math.cos(p.phase)) * 0.07 * run;
      lean = 0.12 * run;
      if (run < 0.1) P.head.rotation.x = Math.max(0, Math.sin(this.music.beatFloat() * Math.PI * 2)) * 0.25;
    }
    if (p.stun > 0) { lean = -0.4; armL = -2.6; armR = -2.6; elL = elR = -0.3; }
    if (p.throwT > 0 && p.soloT <= 0) {
      const k = p.throwT / 0.2;
      const v = -1.5 - k * 1.3;
      if (near === 'L') { armL = v; elL = -k * 1.4; } else { armR = v; elR = -k * 1.4; }
    }
    const ease = p.soloT > 0 ? 1 : Math.min(1, dt * 20);
    const go = (o, v) => { o.rotation.x += (v - o.rotation.x) * ease; };
    go(P.legL, legL); go(P.legR, legR); go(P.kneeL, kneeL); go(P.kneeR, kneeR);
    go(P.armL, armL); go(P.armR, armR); go(P.elbowL, elL); go(P.elbowR, elR);
    P.body.position.y += (bodyY - P.body.position.y) * Math.min(1, dt * 20);
    P.body.rotation.x += (lean - P.body.rotation.x) * Math.min(1, dt * 20);
    if (p.onGround && run >= 0.1 && p.soloT <= 0) P.head.rotation.x *= 0.9;

    // Squash and stretch: stretch on the way up, squash when you land
    p.squash = Math.max(0, (p.squash || 0) - dt * 5);
    const stretch = !p.onGround && !p.climb && p.vy > 0 ? Math.min(1, p.vy / 16) * 0.1 : 0;
    const sy = 1 - p.squash * 0.24 + stretch, sxz = 1 + p.squash * 0.16 - stretch * 0.5;
    P.root.scale.set(sxz, sy, sxz);
    if (!p.onGround) p.lastVy = p.vy;
    // Hair: swept back when running or jumping, flies up when falling, squashes and springs on landing
    if (P.hair) {
      const H = P.hair;
      let tilt = -0.35 * run;
      if (!p.onGround && !p.climb) tilt = p.vy > 0 ? -0.5 : 0.35;
      H.rotation.x += (tilt - H.rotation.x) * Math.min(1, dt * 10);
      const beat = this.beat.pulse || 0;
      const hs = 1 - p.squash * 0.45 + beat * 0.06;
      H.scale.y += (hs - H.scale.y) * Math.min(1, dt * 18);
    }
  }

  addSolo(p, n) {
    const was = p.solo;
    p.solo = Math.min(100, p.solo + n * (this.run.upgrades.amp ? 1.5 : 1));
    if (was < 100 && p.solo >= 100) {
      popup(this.coop ? `P${p.id + 1} SOLO READY!` : 'SOLO READY!', 'beat', { x: p.x, y: p.y + 3 }, this.camera);
      this.music.sPickup();
    }
  }

  throwWeapon(p) {
    const M = this.music;
    const W = WEAPONS[p.weapon];
    const power = M.onBeat(this.D.beatWindow);
    p.cd = W.cd; p.throwT = 0.2;
    this.stats.throws++;
    const y = p.y + (p.crouch ? 0.6 : 1.35);
    const x = p.x + p.face * 0.5;
    const mk = (vx, vy) => {
      const mesh = makeWeaponMesh(p.weapon, power);
      if (power) mesh.scale.setScalar(1.5);
      mesh.position.set(x, y, 0.3);
      this.scene.add(mesh);
      const life = p.weapon === 'vinyl' ? 3 : 1.4;
      this.shots.push({ type: p.weapon, owner: p, x, y, vx, vy, power, dmg: power ? 2 : 1, life, mesh, hits: new Set(), r: power ? 0.45 : 0.3, out: true });
    };
    if (p.weapon === 'pick') mk(p.face * 19, 0);
    else if (p.weapon === 'sticks') {
      if (p.char === 'drummer') { mk(p.face * 11, 9); mk(p.face * 12.5, 6); mk(p.face * 14, 3); }   // the drummer fans three
      else { mk(p.face * 11, 8); mk(p.face * 12.5, 5); }
    } else if (p.weapon === 'flame') { mk(p.face * 13, 4.5); this.shots[this.shots.length - 1].dmg *= 2; }   // flatter and faster, hits twice as hard
    else if (p.weapon === 'notes') { mk(p.face * 13, 0); const s = this.shots[this.shots.length - 1]; s.baseY = s.y; s.t = 0; s.life = 1.1; }
    else if (p.weapon === 'spanner') { mk(p.face * 12, 6.5); this.shots[this.shots.length - 1].dmg *= 2; }   // heavy: double damage
    else mk(p.face * 15, 0);

    if (power) {
      M.sPower();
      p.combo++;
      this.stats.onBeat++;
      this.bestCombo = Math.max(this.bestCombo, p.combo);
      this.addSolo(p, 8);
      popup(p.combo > 1 ? `ON BEAT x${p.combo}` : 'ON BEAT!', 'beat', { x: p.x, y: p.y + 2.4 }, this.camera);
      this.sparks.emit({ x, y }, { n: 12, color: [0xff2e88, 0xffc94a], speed: 5, up: 1, life: 0.35, size: 0.08, gravity: 0 });
      this.ui.beatHit();
    } else {
      M.sThrow();
      // Tell the player which way they missed, so they can learn the timing.
      const off = M.beatOffset();
      const msg = Math.abs(off) > 0.25 ? 'Off beat' : off < 0 ? 'Early!' : 'Late!';
      popup(msg, 'info', { x: p.x, y: p.y + 2.4 }, this.camera);
      p.combo = 0;
    }
  }

  guitarSolo(p) {
    p.solo = 0;
    p.soloT = 1.4; p.inv = Math.max(p.inv, 1.6);
    p.hero.playing();
    this.music.sSolo();
    this.ui.banner({ punk: 'Guitar solo!', drummer: 'Drum solo!', bassist: 'Bass drop!' }[p.char], '');
    const bossDmg = p.char === 'bassist' ? 9 : 6;
    setTimeout(() => {
      if (p.dead || !this.players.includes(p)) return;
      this.ui.flash('#ff2e88');
      this.ui.shake(0.9);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 8, 48),
        new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 1, toneMapped: false }));
      ring.position.set(p.x, p.y + 1.2, 0);
      this.scene.add(ring);
      this.rings.push({ mesh: ring, t: 0 });
      this.sparks.emit({ x: p.x, y: p.y + 1.2 }, { n: 80, color: [0xff2e88, 0xa6ff4d, 0xffc94a, 0xffffff], speed: 16, up: 2, life: 0.9, size: 0.1, gravity: 2, intensity: 2 });
      for (const e of this.enemies) {
        if (e.dead || Math.abs(e.x - this.camX) > this.halfW + 1) continue;
        if (e.boss) { if (e.hittable()) this.damage(e, { x: e.x, y: e.y + 2, dmg: bossDmg, power: true, owner: p }); }
        else if (e.kind !== 'dummy') this.killEnemy(e, true, p);
      }
      for (const f of this.foeShots) f.life = 0;
    }, 350);
    setTimeout(() => { if (!p.dead) p.hero.slung(); }, 1400);
  }

  hurt(p, fromX) {
    if (p.dead || p.out || p.inv > 0 || this.bossDone || p.slideT > 0) return;
    p.combo = 0;
    p.climb = null;
    if (p.armor > 0) {
      p.armor--;
      p.hero.setArmor(p.armor);
      p.inv = 2; p.stun = 0.45;
      const dir = p.x < fromX ? -1 : 1;
      const pitBehind = p.y < 0.5 && !this.level.onGround(p.x + dir * 2.6) && !this.level.onSolidTop(p.x + dir * 2.6);
      p.vx = pitBehind ? 0 : dir * 6; p.vy = 9; p.face = -dir;
      this.music.sHurt();
      this.ui.shake(0.35);
      if (p.armor === 0) {
        const j = makePickup('jacket');
        j.children[j.children.length - 1].visible = false;
        j.position.set(p.x, p.y + 1.3, 0.2);
        this.scene.add(j);
        this.debris.push({ mesh: j, x: p.x, y: p.y + 1.3, vx: -dir * 4, vy: 10, spin: 8, life: 2 });
        popup('JACKET LOST!', 'beat', { x: p.x, y: p.y + 2.5 }, this.camera);
      } else popup('SPIKES GONE!', 'beat', { x: p.x, y: p.y + 2.5 }, this.camera);
    } else this.kill(p);
  }

  kill(p) {
    if (p.dead) return;
    p.climb = null;
    p.dead = true; p.deadT = 2.6;
    p.combo = 0;
    this.stats.deaths++;
    p.hero.root.visible = false;
    this.music.sDie();
    this.ui.shake(0.5);
    if (p.y > -3) {
      for (const b of makeBones()) {
        b.position.set(p.x, p.y + 1 + Math.random(), 0);
        this.scene.add(b);
        this.debris.push({ mesh: b, x: p.x, y: p.y + 1 + Math.random(), vx: rand(-3.5, 3.5), vy: rand(5, 11), spin: rand(-8, 8), life: 2.6, bounce: p.y });
      }
      this.chunks.emit({ x: p.x, y: p.y + 1 }, { n: 16, color: [0x17151c, 0x2c3c62, p.color], speed: 6, up: 5, life: 1.2, size: 0.14 });
    }
  }

  // ---------------------------------------------------------------------------
  updateShots(dt) {
    for (const s of this.shots) {
      const p = s.owner;
      s.life -= dt;
      if (s.type === 'pick') s.mesh.rotation.z += dt * 20;
      else if (s.type === 'notes') { s.t += dt; s.vy = 0; s.y = s.baseY + Math.sin(s.t * 11) * 0.55; s.mesh.rotation.z = Math.sin(s.t * 11) * 0.3; }
      else if (s.type === 'sticks' || s.type === 'flame' || s.type === 'spanner') {
        s.vy -= 24 * dt;
        s.mesh.rotation.z -= dt * 14 * Math.sign(s.vx);
        if (s.type === 'flame') this.sparks.emit({ x: s.x, y: s.y }, { n: 2, color: [0xff6a1a, 0xffc94a], speed: 1, up: 1.5, life: 0.35, size: 0.09, gravity: -2, intensity: 1.6 });
      } else if (s.type === 'vinyl') {
        s.mesh.rotation.y += dt * 30;
        if (s.out) {
          s.vx -= Math.sign(s.vx) * 22 * dt;
          if (Math.abs(s.vx) < 1) { s.out = false; s.hits.clear(); }
        } else {
          const dx = p.x - s.x, dy = p.y + 1.3 - s.y, d = Math.hypot(dx, dy) || 1;
          s.vx = (dx / d) * 16; s.vy = (dy / d) * 16;
          if (d < 0.7 || p.dead) s.life = 0;
        }
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.mesh.position.set(s.x, s.y, 0.3);
      if (s.power && Math.random() < 0.6) this.sparks.emit({ x: s.x, y: s.y }, { n: 1, color: 0xff2e88, speed: 0.5, up: 0, life: 0.25, size: 0.06, gravity: 0, intensity: 2 });

      for (const so of this.level.solids) {
        if (s.x > so.x1 && s.x < so.x2 && s.y > so.y1 && s.y < so.y2) {
          if (s.type === 'vinyl') { s.out = false; s.vx = 0; }
          else {
            s.life = 0;
            if (s.type === 'flame') this.spawnFire(s.x, so.y2, s.power);
            else this.sparks.emit({ x: s.x, y: s.y }, { n: 6, color: 0xffd166, speed: 3, life: 0.25, size: 0.05 });
          }
          break;
        }
      }
      if (Math.abs(s.x - this.camX) > this.halfW + 3 || s.y < -4) s.life = 0;

      for (const e of this.enemies) {
        if (e.dead || s.hits.has(e) || !e.hittable()) continue;
        const b = e.box();
        if (s.x > b.x1 - s.r && s.x < b.x2 + s.r && s.y > b.y1 - s.r && s.y < b.y2 + s.r) {
          s.hits.add(e);
          this.damage(e, s);
          if (s.type === 'flame') { s.life = 0; this.spawnFire(e.x, Math.max(0, e.y), s.power); break; }
          if (s.type !== 'vinyl' && s.type !== 'notes' && !(s.power && s.type === 'pick')) { s.life = 0; break; }
        }
      }
      if (this.dummies) for (const d of this.dummies) {
        if (d.down || s.hits.has(d)) continue;
        if (Math.abs(s.x - d.x) < 0.45 + s.r && s.y > 0.5 && s.y < 2.0) {
          s.hits.add(d);
          this.music.sThwack();
          if (s.power) this.knockDummy(d);
          else popup('Hit it ON the beat!', 'info', { x: d.x, y: 2.4 }, this.camera);
          if (s.type !== 'vinyl') s.life = 0;
        }
      }
      for (const d of this.doors) {
        if (d.open || s.hits.has(d) || s.life <= 0) continue;
        if (Math.abs(s.x - d.x) < 1.2 + s.r && s.y > d.y && s.y < d.y + 3) {
          s.hits.add(d);
          d.hp -= s.dmg;
          this.music.sCrate();
          d.facade.position.x = d.x + (Math.random() - 0.5) * 0.12;
          this.chunks.emit({ x: s.x, y: s.y }, { n: 6, color: [0x6a6e80, 0x3a3a44], speed: 3, up: 2, life: 0.4, size: 0.08 });
          if (d.hp <= 0) this.breakWall(d);
          if (s.type !== 'vinyl') s.life = 0;
        }
      }
      for (const c of this.crates) {
        if (c.hp <= 0 || s.hits.has(c)) continue;
        if (Math.abs(s.x - c.x) < 0.55 + s.r && s.y < c.y + 0.8 + s.r && s.y > c.y - 0.2) {
          s.hits.add(c);
          c.hp -= s.dmg; c.flash = 0.1;
          this.music.sCrate();
          if (c.hp <= 0) this.breakCrate(c);
          if (s.type !== 'vinyl') s.life = 0;
        }
      }
    }
    this.shots = this.shots.filter((s) => { if (s.life > 0) return true; this.scene.remove(s.mesh); return false; });
  }

  smashBarricade(b) {
    b.broken = true;
    const S = this.level.solids;
    S.splice(S.indexOf(b.solid), 1);
    this.scene.remove(b.mesh);
    this.music.sStomp(); this.music.sCrate();
    this.ui.shake(0.6);
    this.chunks.emit({ x: b.x, y: b.solid.y2 / 2 }, { n: 50, color: [0x6a4a2a, 0xffc94a, 0x141416], speed: 8, up: 5, life: 1.1, size: 0.16 });
    popup('BARGED THROUGH!', 'beat', { x: b.x, y: b.solid.y2 + 1 }, this.camera);
  }

  // ---- Secret areas -------------------------------------------------------------------------
  breakWall(d) {
    d.open = true;
    this.scene.remove(d.facade);
    d.door.visible = true;
    this.music.sStomp(); this.music.sPlatinum();
    this.ui.shake(0.4);
    this.chunks.emit({ x: d.x, y: d.y + 1.5 }, { n: 40, color: [0x6a6e80, 0x3a3a44, 0x8a8a96], speed: 6, up: 4, life: 1, size: 0.16 });
    popup('A SECRET DOOR!', 'beat', { x: d.x, y: d.y + 3.4 }, this.camera);
  }

  doorCheck(p, inp) {
    if (this.lock || this.bossStarted) return;
    if (this.room) {
      const R = this.room.room;
      const near = p.x < R.exitX + 0.9;   // anywhere from the exit door to the wall beside it
      if (near && !p.exitHint) { p.exitHint = true; popup('UP to go back', 'info', { x: R.exitX, y: 3.4 }, this.camera); }
      if (near && inp.pressed.up) this.leaveRoom();
      return;
    }
    const d = this.doors.find((q) => q.open && Math.abs(p.x - q.x) < 0.8 && Math.abs(p.y - q.y) < 0.3);
    if (!d) return;
    if (!d.hinted) { d.hinted = true; popup('UP to go in', 'info', { x: d.x, y: d.y + 3.4 }, this.camera); }
    if (inp.pressed.up) this.enterRoom(d);
  }

  /** Everyone still standing goes through together; stray shots are cleared. */
  movePlayers(x, y) {
    this.alive.forEach((q, i) => { Object.assign(q, { x: x + i * 1.1, y, vx: 0, vy: 0, climb: null, doorCd: 0.5, standing: null }); });
    for (const list of [this.shots, this.foeShots]) for (const s of list) this.scene.remove(s.mesh);
    this.shots = []; this.foeShots = [];
    this.ui.flash('#000000', 0.85);
    this.music.sCreak();
  }

  enterRoom(d) {
    this.room = d;
    const R = d.room;
    this.movePlayers(R.x0 + 2.6, 0);
    this.camX = R.cx;
    for (const p of this.players) p.exitHint = false;
    if (d.visited) return;
    d.visited = true;
    this.secretsFound.push(d.i);
    findSecret(this.L.id, d.i);
    this.run.score += 1000;
    this.music.sPlatinum();
    this.ui.banner('Secret area!', `${d.name} · +1000`);
    for (const [kind, n] of d.guards) for (let k = 0; k < n; k++) {
      const x = R.x0 + 8 + k * 1.8 + Math.random();
      if (kind === 'ghost') this.spawnGhost(x, 1.2);
      else if (kind === 'crawler') this.spawnCrawler(x);
      else if (kind === 'rat') this.spawnRat(x);
      else this.spawnZombie(kind, x);
    }
  }

  leaveRoom() {
    const d = this.room;
    this.room = null;
    this.movePlayers(d.x + 0.2, d.y);
    this.camX = d.x + 1;
    for (const e of this.enemies) if (!e.dead && e.x < d.room.x1 + 1) { e.dead = true; this.scene.remove(e.model.root); }   // guards stay behind (no free points)
  }

  knockDummy(d) {
    d.down = true;
    this.soundcheck.left--;
    this.sparks.emit({ x: d.x, y: 1.4 }, { n: 25, color: [0xff2e88, 0xffc94a, 0xa6ff4d], speed: 6, up: 2, life: 0.6, size: 0.08, gravity: 3, intensity: 2 });
    if (this.soundcheck.left > 0) popup(`${this.soundcheck.left} to go!`, 'beat', { x: d.x, y: 2.6 }, this.camera);
    else {
      this.ui.hint(null);
      this.ui.banner('Soundcheck done!', "Now let's rock");
      this.music.sCheckpoint();
    }
  }

  updateDummies(dt) {
    if (!this.dummies) return;
    for (const d of this.dummies) if (d.down && d.fall < 1) {
      d.fall = Math.min(1, d.fall + dt * 4);
      d.mesh.rotation.x = -d.fall * Math.PI / 2;
    }
  }

  spawnFire(x, y, power) {
    this.music.sFire();
    this.fires.push({ x, y, life: power ? 3.4 : 2.4, tick: 0, w: power ? 1.6 : 1.2 });
  }

  updateFires(dt) {
    for (const f of this.fires) {
      f.life -= dt; f.tick -= dt;
      this.sparks.emit({ x: f.x + (Math.random() - 0.5) * f.w * 1.6, y: f.y + 0.1 }, { n: 3, color: [0xff6a1a, 0xffc94a, 0xff2e10], speed: 0.8, up: 2.5, life: 0.5, size: 0.12, gravity: -3, intensity: 1.8, spread: 0.5 });
      if (f.tick <= 0) {
        f.tick = 0.35;
        for (const e of this.enemies) {
          if (e.dead || !e.hittable() || e.kind === 'bird' || e.kind === 'ghost') continue;
          const b = e.box();
          if (b.x1 < f.x + f.w && b.x2 > f.x - f.w && b.y1 < f.y + 1 && b.y2 > f.y) this.damage(e, { x: e.x, y: f.y + 0.5, dmg: 1, power: false, fire: true });
        }
      }
    }
    this.fires = this.fires.filter((f) => f.life > 0);
    for (const r of this.rings) {
      r.t += dt;
      r.mesh.scale.setScalar(1 + r.t * 30);
      r.mesh.material.opacity = Math.max(0, 1 - r.t * 2);
    }
    this.rings = this.rings.filter((r) => { if (r.t < 0.5) return true; this.scene.remove(r.mesh); return false; });
  }

  damage(e, s) {
    let dmg = s.dmg;
    if (e.dizzy > 0) dmg *= 2;
    else if (e.kind === 'banshee') dmg *= 0.5;   // her ghostly aura soaks hits until she's out of breath
    else if (e.kind === 'devil') {
      // The guitar duel: when it's your turn, only hits ON the beat really count
      if (e.state === 'answer' && s.power) {
        dmg *= 2; e.ans++;
        popup(e.ans >= 3 ? 'NAILED IT!' : `ON THE BEAT ${e.ans}/3`, 'beat', { x: e.x, y: e.y + e.h + 0.6 }, this.camera);
      } else dmg *= 0.5;
    }
    e.hp -= dmg;
    e.flash = 0.08;
    if (!e.boss) e.hitTilt = 0.4 * (Math.sign(s.vx || 1) === e.face ? 1 : -1);   // knocked back (or forward if hit from behind)
    this.music.sHit();
    if (!s.fire) this.sparks.emit({ x: s.x, y: s.y }, { n: s.power ? 14 : 6, color: s.power ? [0xff2e88, 0xffffff] : [0xa6ff4d, 0xffffff], speed: 5, life: 0.35, size: 0.07, gravity: 4 });
    if (e.boss) {
      this.hitStop = Math.max(this.hitStop, 0.03);
      if (e.hp <= 0) { this.killEnemy(e, s.power, s.owner); return; }
      this.ui.boss(e.hp / e.maxHp);
      if (!this.bossAngry && e.hp <= e.maxHp / 2) this.enrage(e);
      return;
    }
    if (e.hp <= 0) this.killEnemy(e, s.power, s.owner);
  }

  killEnemy(e, power, owner) {
    if (e.dead) return;
    e.dead = true;
    this.stats.kills++;
    const combo = owner ? owner.combo : 0;
    const mult = 1 + Math.min(3, Math.floor(combo / 5));
    // Bosses are a flat reward: one lucky on-beat combo hit shouldn't outweigh the whole gig
    const pts = e.boss ? e.points : e.points * (power ? 2 : 1) * mult;
    this.run.score += pts;
    this.run.cash += e.boss ? 100 : 1;
    if (owner) this.addSolo(owner, power ? 6 : 2);
    this.hitStop = Math.max(this.hitStop, power ? 0.07 : 0.04);
    const c = e.center();
    popup(mult > 1 && !e.boss ? `+${pts} x${mult}` : `+${pts}`, 'pts', { x: c.x, y: c.y + 0.8 }, this.camera);
    if (e.boss) { this.bossDefeated(e); return; }
    if (e.kind === 'ghost') {
      this.scene.remove(e.model.root);
      this.sparks.emit(c, { n: 30, color: [0xc8d6ff, 0x6a7cff, 0xffffff], speed: 5, up: 1, life: 0.8, size: 0.09, gravity: -1, intensity: 1.5 });
      return;
    }
    const dir = owner ? Math.sign(e.x - owner.x) || 1 : 1;
    this.shatter(e.model.root, dir, power);
    this.sparks.emit(c, { n: 10, color: 0xa6ff4d, speed: 4, up: 1, life: 0.4, size: 0.06, gravity: 0, intensity: 1.5 });
  }

  /** Zombies fall apart into their actual body parts. */
  shatter(root, dir, power) {
    root.updateMatrixWorld(true);
    const parts = [];
    root.traverse((o) => { if (o.isMesh) parts.push(o); });
    const floor = this.level.onGround(root.position.x) || this.level.onSolidTop(root.position.x) ? Math.max(0, root.position.y) : undefined;
    for (const m of parts.slice(0, 32)) {
      this.scene.attach(m);
      const k = power ? 1.6 : 1;
      this.debris.push({
        mesh: m, x: m.position.x, y: m.position.y, z: m.position.z,
        vx: dir * rand(1, 4) * k + rand(-1.5, 1.5), vy: rand(2, 7) * k, spin: rand(-12, 12), life: rand(1.0, 1.7),
        bounce: floor, shrink: true, dispose: true,
      });
    }
    this.scene.remove(root);
  }

  // ---------------------------------------------------------------------------
  // Enemy factories. Every enemy has: box(), center(), hittable(), harmful(), and optional onBeat(i).
  base(kind, model, x, y, extra) {
    const t = this.target(x);
    const e = {
      kind, model, x, y, vx: 0, vy: 0, w: 0.34, h: 1.8, hp: 1, points: 100, face: t.x < x ? -1 : 1,
      state: 'rise', t: 0, phase: Math.random() * 6, flash: 0, pulse: 0, dizzy: 0,
      colors: model.mats ? model.mats.slice(0, 2).map((m) => m.color.getHex()) : [0x7d9a5a, 0x4a3b33],
      ...extra,
    };
    e.box ||= () => ({ x1: e.x - e.w, x2: e.x + e.w, y1: e.y, y2: e.y + e.h });
    e.center ||= () => ({ x: e.x, y: e.y + e.h * 0.55 });
    e.hittable ||= () => e.state !== 'rise' || e.t > 0.35;
    e.harmful ||= () => e.state !== 'rise' && e.state !== 'sink';
    e.onBeat ||= () => { e.pulse = 1; };
    model.root.rotation.y = faceRot(e.face);
    this.scene.add(model.root);
    this.enemies.push(e);
    return e;
  }

  spawnZombie(kind, x, y = 0) {
    const model = makeZombie(kind);
    const scale = kind === 'headbanger' ? 1.22 : 1;
    model.root.scale.setScalar(scale);
    model.root.position.set(x, y - 2 * scale, 0);
    const e = this.base(kind, model, x, y, {
      w: 0.34 * scale, h: 1.8 * scale,
      hp: { headbanger: 4, pogo: 2 }[kind] || 1,
      points: { headbanger: 500, pogo: 300 }[kind] || 100,
      speed: (kind === 'headbanger' ? 1.1 : rand(1.3, 1.9)) * this.D.enemySpeed, life: 14,
    });
    if (kind === 'pogo') {
      e.onBeat = () => {
        e.pulse = 1;
        if (e.state === 'walk' && e.onGround) {
          e.face = this.target(e.x).x < e.x ? -1 : 1;
          e.vy = rand(9, 10.5); e.vx = e.face * rand(2.6, 3.6) * this.D.enemySpeed;
        }
      };
    }
    this.music.sGroan();
    return e;
  }

  spawnCrawler(x, y = 0) {
    const model = makeCrawler();
    model.root.position.set(x, y - 0.8, 0);
    this.music.sGroan();
    return this.base('crawler', model, x, y, { w: 0.45, h: 0.6, hp: 1, points: 150, speed: 2.0 * this.D.enemySpeed, life: 14 });
  }

  spawnRat(x, y = 0) {
    const model = makeRat();
    model.root.position.set(x, y - 0.5, 0);
    this.music.sSqueak();
    return this.base('rat', model, x, y, { w: 0.3, h: 0.45, hp: 1, points: 120, speed: rand(2.2, 2.9) * this.D.enemySpeed, life: 12, colors: [0x4a4038, 0xc88a8a] });
  }

  spawnGhost(x, y) {
    const model = makeGhost();
    model.root.position.set(x, y, 0);
    model.mat.opacity = 0;
    this.music.sGhost();
    const e = this.base('ghost', model, x, y, { w: 0.5, h: 1.8, hp: 2, points: 400, state: 'float', baseY: y, vis: true, op: 0, life: 18 });
    e.box = () => ({ x1: e.x - e.w, x2: e.x + e.w, y1: e.y + 0.2, y2: e.y + 1.8 });
    e.hittable = () => e.op > 0.5;
    e.harmful = () => e.op > 0.72;
    e.onBeat = (i) => { e.vis = i % 4 < 2; };
    return e;
  }

  /** Grave digger (skulls) or bar-fly (bottles): stands still, one telegraphed throw per bar. */
  spawnThrower({ x, y, kind }) {
    const model = makeZombie(kind);
    model.root.position.set(x, y, 0);
    const e = this.base('thrower', model, x, y, { variant: kind, hp: 2, points: 600, state: 'idle', throwT: 0, wind: false });
    e.box = () => ({ x1: e.x - e.w, x2: e.x + e.w, y1: e.y - 0.9, y2: e.y + e.h });
    e.onBeat = (i) => {
      e.pulse = 1;
      const p = this.target(e.x);
      const inRange = !p.dead && Math.abs(p.x - e.x) < 10 && Math.abs(p.x - e.x) > 1.2;
      if (i % 4 === 3 && inRange && Math.random() < this.D.skulls) {
        e.wind = true;
        this.sparks.emit({ x: e.x, y: e.y + 2.4 }, { n: 8, color: 0xa6ff4d, speed: 2, up: 1, life: 0.4, size: 0.07, gravity: 0, intensity: 2 });
      } else if (i % 4 === 0 && e.wind) {
        e.wind = false;
        e.throwT = 0.3;
        if (inRange) this.lob(e, p);
      }
    };
    return e;
  }

  spawnHand(x) {
    const model = makeHand();
    model.root.position.set(x, -1.3, -0.1);
    const e = this.base('hand', model, x, 0, { w: 0.2, h: 1.05, hp: 1, points: 50, state: 'hidden', face: 1 });
    e.hittable = () => e.state === 'up';
    e.harmful = () => e.state === 'up' && e.model.root.position.y > -0.5;
    e.onBeat = (i) => {
      if (Math.abs(this.target(e.x).x - e.x) > 9) { e.state = 'hidden'; return; }
      const k = (i + Math.round(e.x)) % 4;
      if (k === 1) { e.state = 'warn'; this.chunks.emit({ x: e.x, y: 0.05 }, { n: 8, color: [0x2b2229, 0x3b2f2a], speed: 2, up: 3, life: 0.5, size: 0.08 }); }
      else if (k === 2) { e.state = 'up'; this.music.sDirt(); this.chunks.emit({ x: e.x, y: 0.05 }, { n: 12, color: [0x2b2229, 0x3b2f2a], speed: 4, up: 5, life: 0.7, size: 0.1 }); }
      else if (k === 0) e.state = 'hidden';
    };
    return e;
  }

  spawnBird(x, y = 1.15) {
    const model = makeCrow(this.L.pigeons);
    model.root.scale.setScalar(1.3);
    model.root.position.set(x, y, -0.45);
    const e = this.base('bird', model, x, y, { w: 0.35, h: 0.45, hp: 1, points: 200, state: 'perch', colors: this.L.pigeons ? [0x6a6e7a, 0x4a6a5a] : [0x121016, 0x2b2620] });
    e.box = () => ({ x1: e.x - e.w, x2: e.x + e.w, y1: e.y - 0.1, y2: e.y + e.h });
    e.center = () => ({ x: e.x, y: e.y + 0.15 });
    e.hittable = () => true;
    e.harmful = () => e.state === 'fly';
    // Caws and flaps for a beat (warning), then launches on the next one, only at someone in front of it.
    e.onBeat = () => {
      const p = this.target(e.x), dx = e.x - p.x;
      if (e.state === 'perch' && !p.dead && dx > 2 && dx < 9) { e.state = 'alert'; e.t = 0; this.music.sCaw(); }
      else if (e.state === 'alert') { e.state = 'fly'; e.t = 0; e.baseY = p.y + 1.3; e.face = p.x < e.x ? -1 : 1; e.prey = p; }
    };
    return e;
  }

  // ---------------------------------------------------------------------------
  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt;
      e.flash -= dt;
      e.dizzy -= dt;
      e.pulse = Math.max(0, e.pulse - dt * 4);
      switch (e.kind) {
        case 'walker': case 'headbanger': case 'pogo': this.updateZombie(e, dt); break;
        case 'crawler': this.updateCrawler(e, dt); break;
        case 'rat': this.updateRat(e, dt); break;
        case 'ghost': this.updateGhost(e, dt); break;
        case 'thrower': this.updateThrower(e, dt); break;
        case 'hand': this.updateHand(e, dt); break;
        case 'bird': this.updateBird(e, dt); break;
        case 'bouncer': this.updateBouncer(e, dt); break;
        case 'gargoyle': this.updateGargoyle(e, dt); break;
        case 'banshee': this.updateBanshee(e, dt); break;
        case 'mummy': this.updateMummy(e, dt); break;
        case 'devil': this.updateDevil(e, dt); break;
      }
      if (e.dead) continue;
      if (e.hitTilt) { e.hitTilt *= Math.exp(-dt * 9); if (Math.abs(e.hitTilt) < 0.01) e.hitTilt = 0; e.model.root.rotation.x = e.hitTilt; }
      if (e.model.mats) for (const m of e.model.mats) m.emissive.setHex(e.flash > 0 ? 0xffffff : e.angry ? 0x400000 : 0x000000);
      if (e.kind === 'ghost') e.model.mat.emissiveIntensity = e.flash > 0 ? 4 : 1.1;

      if (e.harmful()) {
        const b = e.box();
        for (const p of this.players) {
          if (p.dead || p.out) continue;
          if (overlap(b, { x1: p.x - p.w, x2: p.x + p.w, y1: p.y, y2: p.y + p.h })) this.hurt(p, e.x);
        }
      }
      const behind = e.x < this.camX - this.halfW - 6;
      const ahead = e.ambient && e.x > this.camX + this.halfW + 14;
      if (!e.boss && (behind || ahead || e.y < -6)) { e.dead = true; this.scene.remove(e.model.root); disposeTree(e.model.root); }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  rise(e, dt, dur, depth) {
    const R = e.model.root;
    const k = Math.min(1, e.t / dur);
    R.position.set(e.x, e.y - depth * (1 - k), 0);
    R.rotation.z = Math.sin(e.t * 20) * 0.06 * (1 - k);
    if (Math.random() < 0.5) this.chunks.emit({ x: e.x, y: e.y + 0.05 }, { n: 1, color: [0x2b2229, 0x3b2f2a], speed: 3, up: 4, life: 0.6, size: 0.1 });
    if (k >= 1) { e.state = 'walk'; e.t = 0; R.rotation.z = 0; return false; }
    return true;
  }

  sinkOrTurn(e) {
    const ahead = this.level.surfaceAt(e.x + e.face * 0.6);
    if (e.onGround && (ahead === null || ahead < e.y - 0.5) && Math.random() < 0.02) e.face *= -1;
    if (e.life && e.t > e.life && e.ambient) e.state = 'sink';
  }

  updateZombie(e, dt) {
    const R = e.model.root, Z = e.model;
    const s = R.scale.x;
    if (e.state === 'rise') { this.rise(e, dt, 1.1, 2 * s); return; }
    if (e.state === 'sink') {
      R.position.y -= dt * 1.5;
      if (R.position.y < e.y - 2.2 * s) { e.dead = true; this.scene.remove(R); disposeTree(R); }
      return;
    }
    if (e.kind === 'pogo') { if (e.onGround) e.vx *= 0.8; }
    else e.vx = e.face * e.speed * (0.35 + e.pulse * 1.6);   // lurch on the beat
    this.move(e, dt, false);
    if (e.hitWall) e.face *= -1;
    this.sinkOrTurn(e);
    R.position.set(e.x, e.y, 0);
    R.rotation.y += (faceRot(e.face) - R.rotation.y) * Math.min(1, dt * 6);
    e.phase += Math.abs(e.vx) * dt * 2.4;
    const sw = Math.sin(e.phase);
    if (e.kind === 'pogo') {
      const air = !e.onGround;
      Z.legL.rotation.x = air ? -0.7 : 0; Z.legR.rotation.x = air ? 0.2 : 0;
      Z.kneeL.rotation.x = air ? 1.2 : 0; Z.kneeR.rotation.x = air ? 0.9 : 0;
      Z.armL.rotation.x = air ? -2.9 : -0.3; Z.armR.rotation.x = air ? -2.7 : -0.2;
      Z.head.rotation.x = air ? -0.3 : 0.4;
      Z.jaw.rotation.x = air ? 0.4 : 0;
      return;
    }
    Z.legL.rotation.x = sw * 0.5; Z.legR.rotation.x = -sw * 0.5;
    Z.kneeL.rotation.x = Math.max(0, Math.sin(e.phase + 1.4)) * 0.8;
    Z.kneeR.rotation.x = Math.max(0, Math.sin(e.phase + 1.4 + Math.PI)) * 0.8;
    Z.body.rotation.x = 0.18 + e.pulse * 0.12;
    Z.jaw.rotation.x = 0.2 + Math.max(0, Math.sin(e.t * 3)) * 0.3;
    if (e.kind === 'headbanger') {
      Z.head.rotation.x = e.pulse * 0.9 - 0.1;
      Z.armL.rotation.x = -1.2 - e.pulse * 0.6; Z.armR.rotation.x = -2.8 + e.pulse * 0.5;
      Z.elbowL.rotation.x = -0.6; Z.elbowR.rotation.x = -0.2;
    } else {
      Z.head.rotation.x = Math.sin(e.t * 2) * 0.1;
      Z.armL.rotation.x = -1.4 + Math.sin(e.phase * 0.5) * 0.15;
      Z.armR.rotation.x = -1.35 - Math.sin(e.phase * 0.5) * 0.15;
      Z.elbowL.rotation.x = 0.25 + Math.sin(e.t * 2) * 0.15;   // limp wrists
      Z.elbowR.rotation.x = 0.3 - Math.sin(e.t * 2) * 0.15;
    }
  }

  updateCrawler(e, dt) {
    const R = e.model.root, Z = e.model;
    if (e.state === 'rise') { this.rise(e, dt, 0.6, 0.8); return; }
    if (e.state === 'sink') { R.position.y -= dt; if (R.position.y < -1) { e.dead = true; this.scene.remove(R); disposeTree(R); } return; }
    e.vx = e.face * e.speed * (0.5 + e.pulse * 1.5);
    this.move(e, dt, false);
    if (e.hitWall) e.face *= -1;
    this.sinkOrTurn(e);
    R.position.set(e.x, e.y, 0);
    R.rotation.y += (faceRot(e.face) - R.rotation.y) * Math.min(1, dt * 6);
    e.phase += dt * 8;
    Z.armL.rotation.x = -1.6 + Math.sin(e.phase) * 0.6;
    Z.armR.rotation.x = -1.6 - Math.sin(e.phase) * 0.6;
    Z.head.rotation.x = -0.3 + Math.sin(e.phase * 0.5) * 0.1;
    Z.body.position.y = Math.abs(Math.sin(e.phase)) * 0.04;
  }

  updateRat(e, dt) {
    const R = e.model.root, Z = e.model;
    if (e.state === 'rise') { this.rise(e, dt, 0.3, 0.5); return; }
    if (e.state === 'sink') { R.position.y -= dt; if (R.position.y < -0.8) { e.dead = true; this.scene.remove(R); disposeTree(R); } return; }
    // scurry at you, darting faster on the beat
    e.face = this.target(e.x).x < e.x ? -1 : 1;
    e.vx = e.face * e.speed * (0.6 + e.pulse * 1.0);
    this.move(e, dt, false);
    this.sinkOrTurn(e);
    R.position.set(e.x, e.y, 0);
    R.rotation.y = e.face > 0 ? Math.PI / 2 : -Math.PI / 2;
    e.phase += dt * 22;
    Z.legs.forEach((l, i) => { l.rotation.x = Math.sin(e.phase + i * Math.PI / 2) * 0.8; });
    Z.tail.rotation.y = Math.sin(e.phase * 0.3) * 0.5;
    Z.body.position.y = Math.abs(Math.sin(e.phase)) * 0.03;
  }

  updateGhost(e, dt) {
    const R = e.model.root, p = this.target(e.x);
    const want = e.t > e.life ? 0 : e.vis ? 0.8 : 0.12;
    e.op += (want - e.op) * Math.min(1, dt * 6);
    e.model.mat.opacity = e.op;
    if (e.t > e.life && e.op < 0.05) { e.dead = true; this.scene.remove(R); return; }
    e.face = p.x < e.x ? -1 : 1;
    const gap = Math.abs(p.x - e.x);
    const sp = (e.vis ? 2.4 : gap < 3.5 ? -1.6 : 0.6) * this.D.enemySpeed;
    e.x += e.face * sp * dt;
    e.baseY += ((p.y + 0.6) - e.baseY) * dt * 0.6;
    e.y = e.baseY + Math.sin(e.t * 2.5) * 0.4;
    R.position.set(e.x, e.y, 0);
    R.rotation.y = e.face > 0 ? 0.5 : -0.5;
    e.model.arms.forEach((a, i) => { a.rotation.x = -0.6 + Math.sin(e.t * 6 + i) * 0.4; });
  }

  updateThrower(e, dt) {
    const R = e.model.root, Z = e.model, p = this.target(e.x);
    e.vx = 0;
    this.move(e, dt, true);
    e.face = p.x < e.x ? -1 : 1;
    e.throwT -= dt;
    R.position.set(e.x, e.y, 0);
    R.rotation.y += (faceRot(e.face) - R.rotation.y) * Math.min(1, dt * 8);
    Z.armR.rotation.x = e.wind ? -3.0 + Math.sin(e.t * 20) * 0.1 : e.throwT > 0 ? -1.2 : -0.5 + Math.sin(e.t * 2) * 0.1;
    Z.elbowR.rotation.x = e.wind ? -0.8 : -0.2;
    Z.armL.rotation.x = -0.6;
    Z.legL.rotation.x = 0; Z.legR.rotation.x = 0;
    Z.head.rotation.x = e.pulse * 0.2;
    Z.jaw.rotation.x = e.throwT > 0 ? 0.5 : 0.1;
  }

  updateHand(e, dt) {
    const R = e.model.root;
    const y = e.state === 'up' ? 0 : e.state === 'warn' ? -1.0 : -1.3;
    R.position.y += (y - R.position.y) * Math.min(1, dt * (e.state === 'up' ? 18 : 6));
    e.model.fingers.forEach((f, i) => { f.rotation.x = Math.sin(this.t * 14 + i) * 0.5; });
    R.rotation.z = Math.sin(this.t * 5) * 0.15;
  }

  updateBird(e, dt) {
    const R = e.model.root;
    const flap = e.state === 'fly' ? Math.sin(e.t * 22) * 0.9 : Math.sin(e.t * 2) * 0.05 - 0.1;
    e.model.wings[0].rotation.z = flap; e.model.wings[1].rotation.z = -flap;
    if (e.state === 'perch' || e.state === 'alert') {
      const p = this.target(e.x);
      e.face = p.x < e.x ? -1 : 1;
      R.rotation.y = e.face > 0 ? Math.PI / 2 - 0.4 : -Math.PI / 2 + 0.4;
      const hop = e.state === 'alert' ? Math.abs(Math.sin(e.t * 18)) * 0.25 : Math.abs(Math.sin(e.t * 3)) * 0.03;
      if (e.state === 'alert') { e.model.wings[0].rotation.z = Math.sin(e.t * 30) * 0.9; e.model.wings[1].rotation.z = -e.model.wings[0].rotation.z; }
      R.position.set(e.x, e.y + hop, -0.45);
      return;
    }
    const p = e.prey || this.target(e.x);
    e.x += e.face * 3.6 * this.D.enemySpeed * dt;
    if ((p.x - e.x) * e.face > 0) e.baseY += ((p.y + 1.3) - e.baseY) * dt * 0.8;
    else e.baseY += dt * 2.5;
    e.y = e.baseY + Math.sin(e.t * 4) * 0.6;
    R.position.set(e.x, e.y, Math.max(0, R.position.z + dt));
    R.rotation.y = e.face > 0 ? Math.PI / 2 : -Math.PI / 2;
    R.rotation.z = Math.cos(e.t * 4) * 0.3 * e.face;
  }

  /** Skull (digger) or bottle (bar-fly): a slow lob aimed where you are now. */
  lob(e, p) {
    const x0 = e.x + e.face * 0.5, y0 = e.y + 2.0;
    const g = 20, T = 1.3;
    const vx = (p.x - x0) / T;
    const vy = (p.y + 0.8 - y0 + 0.5 * g * T * T) / T;
    const bottle = e.variant === 'barfly';
    const mesh = bottle ? makeBottle() : makeSkull();
    mesh.position.set(x0, y0, 0);
    this.scene.add(mesh);
    this.music.sThrow();
    this.foeShots.push({ kind: bottle ? 'bottle' : 'skull', x: x0, y: y0, vx, vy, g, life: 3, mesh, w: 0.2, h: 0.3, spin: e.face * 9 });
  }

  // ---------------------------------------------------------------------------
  // Ambush (mosh pit / bar brawl)
  startAmbush() {
    const A = this.L.ambush;
    this.ambush = { state: 'active', wave: 0, queue: [], wait: 1.2 };
    this.lock = { x1: A.x1, x2: A.x2 };
    this.checkpointX = Math.max(this.checkpointX, A.x1 + 1);
    for (const e of this.enemies) if (e.ambient) e.state = 'sink';
    this.ui.banner(A.name, A.sub);
  }

  spawnAmbushMember(kind) {
    const A = this.L.ambush;
    for (let tries = 0; tries < 8; tries++) {
      const x = A.x1 + 1.5 + Math.random() * (A.x2 - A.x1 - 3);
      if (this.players.some((p) => !p.dead && Math.abs(x - p.x) < 3.5) || this.level.groundY(x) === null) continue;
      let e;
      if (kind === 'ghost') e = this.spawnGhost(x, 1.5);
      else if (kind === 'crawler') e = this.spawnCrawler(x);
      else if (kind === 'rat') e = this.spawnRat(x);
      else if (kind === 'diver') { e = this.spawnZombie('pogo', x); e.state = 'walk'; e.y = 8; e.model.root.position.y = 8; e.vy = -2; }
      else e = this.spawnZombie(kind, x);
      e.pit = true; e.life = 0;
      return;
    }
  }

  updateAmbush(dt) {
    const am = this.ambush, A = this.L.ambush;
    if (am.state !== 'active') return;
    if (am.queue.length || this.enemies.some((e) => e.pit && !e.dead)) return;
    am.wait -= dt;
    if (am.wait > 0) return;
    if (am.wave < A.waves.length) {
      am.queue = A.waves[am.wave].flatMap(([k, n]) => Array(n + (this.coop ? 1 : 0)).fill(k)).sort(() => Math.random() - 0.5);
      am.wave++;
      am.wait = 1.5;
      this.ui.zone(`Wave ${am.wave} of ${A.waves.length}`);
    } else {
      am.state = 'done';
      this.lock = null;
      this.run.score += 3000;
      this.run.cash += 25;
      this.checkpointX = Math.max(this.checkpointX, A.x2 - 1);
      this.music.sCheckpoint();
      this.ui.banner('Cleared!', '+3000');
    }
  }

  // ---------------------------------------------------------------------------
  // Bosses
  startBoss() {
    this.bossStarted = true;
    const A = this.L.arena;
    this.checkpointX = Math.max(this.checkpointX, A.gate - 6);   // reaching the boss counts as a checkpoint
    this.lock = { x1: A.x1, x2: A.x2 };
    for (const e of this.enemies) if (e.ambient) e.state = 'sink';
    this.gateSolid = { x1: A.gate - 0.3, x2: A.gate + 0.3, y1: 0, y2: 12 };
    this.level.solids.push(this.gateSolid);
    // Pull a co-op partner in so nobody is stuck outside the gate
    for (const p of this.players) if (!p.dead && p.x < A.x1 + 0.5) { p.x = A.x1 + 1; p.y = 0.5; }
    setTimeout(() => this.spawnBoss(), 700);
  }

  spawnBoss() {
    if (!this.bossStarted || this.boss || !this.alive.length) return;
    const e = this.L.boss === 'gargoyle' ? this.spawnGargoyle() : this.L.boss === 'banshee' ? this.spawnBanshee() : this.L.boss === 'mummy' ? this.spawnMummy() : this.L.boss === 'devil' ? this.spawnDevil() : this.spawnBouncer();
    e.boss = true;
    e.maxHp = e.hp = Math.round(e.hp * this.D.bossHp * (this.run.encore ? 1.3 : 1) * (this.coop ? 1.4 : 1));
    this.boss = e;
    this.cine = { t: 0, dur: 2.6, x: e.x, y: e.camY };
    this.ui.bossIntro(this.L.bossName, this.L.bossTag, this.L.bossSong);
    this.ui.boss(1);
    this.ui.shake(0.3);
  }

  spawnBouncer() {
    const model = makeZombie('bouncer');
    const s = 2.3;
    model.root.scale.setScalar(s);
    const x = this.L.arena.x2 - 4;
    model.root.position.set(x, -s * 2, 0);
    const e = this.base('bouncer', model, x, 0, {
      w: 0.75, h: 1.8 * s, hp: 60, points: 10000, face: -1, moves: ['stomp', 'throw', 'charge'], mi: 0, act: 0, camY: 3,
      colors: [model.mats[0].color.getHex(), 0x0d0d10],
    });
    e.box = () => {
      const h = e.state === 'charge' || e.state === 'windup' ? e.h * 0.5 : e.h * 0.95;   // head down: low enough to jump over
      return { x1: e.x - e.w, x2: e.x + e.w, y1: e.y, y2: e.y + h };
    };
    e.center = () => ({ x: e.x, y: e.y + e.h * 0.5 });
    e.hittable = () => e.state !== 'rise' || e.t > 1;
    e.harmful = () => e.state !== 'rise' && e.state !== 'dizzy';
    e.onBeat = (i) => {
      e.pulse = 1;
      if (e.state === 'windup' && e.t > 0.85) { e.state = 'charge'; e.t = 0; this.music.sGroan(); }
      if (e.state !== 'walk' || i % 4 !== 0 || e.t < 1 || this.cine) return;
      e.state = e.moves[e.mi++ % e.moves.length]; e.t = 0; e.act = 0;
      if (e.state === 'stomp') e.vy = 12;
      if (e.state === 'charge') {
        e.state = 'windup'; e.face = this.target(e.x).x < e.x ? -1 : 1;
        popup('CHARGE! Get high or jump him', 'beat', { x: e.x, y: e.y + e.h + 0.6 }, this.camera);
      }
    };
    this.music.sGroan();
    return e;
  }

  spawnGargoyle() {
    const model = makeGargoyle();
    const s = 1.7;
    model.root.scale.setScalar(s);
    const perches = this.L.ledges.filter(([a, , y]) => y > 4.5 && a >= this.L.arena.x1).map(([a, b, y]) => ({ x: (a + b) / 2, y }));
    const P = perches[perches.length - 1];
    model.root.position.set(P.x, P.y, 0);
    const e = this.base('gargoyle', model, P.x, P.y, {
      w: 0.6, h: 1.8 * s, hp: 44, points: 15000, face: -1, state: 'perch', perches, perch: P, beats: 0, camY: 5.5,
      colors: [0x7d7f8c, 0x55576a],
    });
    e.center = () => ({ x: e.x, y: e.y + e.h * 0.5 });
    e.hittable = () => true;
    e.harmful = () => (e.state === 'dive' && e.y < 3) || e.state === 'ground';
    e.onBeat = (i) => {
      e.pulse = 1;
      if (this.cine) return;
      const p = this.target(e.x);
      if (e.state === 'perch') {
        e.beats++;
        if (e.beats % 2 === 0) this.fireball(e, p);
        if (e.beats >= (e.angry ? 5 : 7)) {
          e.state = 'screech'; e.t = 0; e.beats = 0;
          this.music.sScreech();
          // Pick the landing spot now and mark it, so players can get clear.
          const A = this.L.arena;
          e.to = { x: Math.min(Math.max(p.x, A.x1 + 2), A.x2 - 2), y: 0 };
          this.marker(e.to.x, 2.2);
          popup('DIVE! Get out of the red circle', 'beat', { x: e.x, y: e.y + e.h + 0.6 }, this.camera);
        }
      } else if (e.state === 'screech' && e.t > 1.1) {
        e.state = 'dive'; e.t = 0;
        e.from = { x: e.x, y: e.y };
      }
    };
    this.music.sScreech();
    return e;
  }

  fireball(e, p) {
    const shots = e.angry ? [-2.6, 0, 2.6] : [0];
    const x0 = e.x + e.face * 0.6, y0 = e.y + e.h * 0.7;
    for (const off of shots) {
      const g = 12, T = 1.25;
      const tx = p.x + off;
      const mesh = makeFireball();
      mesh.position.set(x0, y0, 0);
      this.scene.add(mesh);
      this.foeShots.push({ kind: 'fireball', x: x0, y: y0, vx: (tx - x0) / T, vy: (p.y + 0.6 - y0 + 0.5 * g * T * T) / T, g, life: 3, mesh, w: 0.3, h: 0.3, spin: 3 });
    }
    this.music.sFireball();
  }

  enrage(e) {
    this.bossAngry = true;
    e.angry = true;
    if (e.kind === 'bouncer') {
      e.moves = ['stomp', 'charge', 'throw', 'charge'];
      this.ui.banner("He's angry!", 'Watch for the charge. Get up high.');
    } else if (e.kind === 'mummy') {
      this.ui.banner("He's lost it!", 'Faster slides, backup dancers');
    } else if (e.kind === 'devil') {
      e.moves = ['duel', 'fly', 'hellfire', 'duel', 'fireballs', 'summon'];
      e.model.wings.visible = true;
      this.ui.banner("He's furious!", 'Wings out. Longer riffs.');
    } else this.ui.banner("He's cracking!", 'Faster dives, rubble from the sky');
    this.ui.shake(0.6);
    this.music.sStomp();
  }

  updateBouncer(e, dt) {
    const R = e.model.root, Z = e.model;
    const p = this.target(e.x);
    const s = R.scale.x;
    const A = this.L.arena;
    if (e.state === 'rise') {
      const k = Math.min(1, e.t / 2);
      R.position.set(e.x, -s * 2 * (1 - k), 0);
      if (Math.random() < 0.8) this.chunks.emit({ x: e.x + (Math.random() - 0.5) * 2, y: 0.05 }, { n: 1, color: [0x2b2229, 0x3b2f2a], speed: 4, up: 6, life: 0.8, size: 0.16 });
      if (k >= 1) { e.state = 'walk'; e.t = 0; }
      return;
    }
    const angry = e.angry;
    let bodyLean = 0;
    if (e.state !== 'charge' && e.state !== 'dizzy') e.face = p.x < e.x ? -1 : 1;
    if (e.state === 'walk') {
      const dist = Math.abs(p.x - e.x);
      e.vx = this.cine ? 0 : dist > 1.2 ? e.face * (angry ? 2.3 : 1.5) * (0.4 + e.pulse * 1.5) : 0;
      Z.armL.rotation.x = -1.3 + Math.sin(e.t * 3) * 0.2; Z.armR.rotation.x = -1.3 - Math.sin(e.t * 3) * 0.2;
    } else if (e.state === 'stomp') {
      e.vx = 0;
      Z.armL.rotation.x = Z.armR.rotation.x = -2.9;
      if (e.t > 0.15 && e.onGround && !e.act) {
        e.act = 1;
        this.music.sStomp();
        this.ui.shake(0.6);
        for (const dir of [-1, 1]) this.spawnShockwave(e.x + dir * 1.2, dir, angry ? 11 : 8.5);
        this.chunks.emit({ x: e.x, y: 0.1 }, { n: 30, color: [0x2b2229, 0x6a6e80], speed: 8, up: 5, life: 1, size: 0.18 });
        if (angry) {
          for (const dx of [-6, 6]) {
            const x = Math.min(Math.max(e.x + dx, A.x1 + 1), A.x2 - 1);
            if (Math.abs(x - p.x) > 2 && this.enemies.filter((z) => z.kind === 'walker').length < 3) this.spawnZombie('walker', x);
          }
        }
      }
      if (e.act && e.t > 0.8) { e.state = 'walk'; e.t = 0; }
    } else if (e.state === 'throw') {
      e.vx = 0;
      const near = e.face > 0 ? Z.armL : Z.armR;
      near.rotation.x = e.t < 0.45 ? -3.0 : -1.4;
      if (e.t >= 0.45 && !e.act) {
        e.act = 1;
        this.throwHeadstone(e, p, 1.0);
        if (angry) setTimeout(() => !e.dead && this.throwHeadstone(e, this.target(e.x), 1.5), 250);
      }
      if (e.t > 1.1) { e.state = 'walk'; e.t = 0; }
    } else if (e.state === 'windup') {
      e.vx = -e.face * 0.6;
      bodyLean = 0.7;
      Z.armL.rotation.x = Z.armR.rotation.x = 0.4;
      if (Math.random() < 0.5) this.chunks.emit({ x: e.x - e.face, y: 0.05 }, { n: 1, color: 0x3b2f2a, speed: 3, up: 2, life: 0.4, size: 0.12 });
    } else if (e.state === 'charge') {
      e.vx = e.face * (angry ? 15 : 12.5);
      bodyLean = 0.8;
      Z.armL.rotation.x = Z.armR.rotation.x = 0.6;
      if (Math.random() < 0.7) this.chunks.emit({ x: e.x, y: 0.05 }, { n: 2, color: [0x2b2229, 0x3b2f2a], speed: 3, up: 3, life: 0.5, size: 0.14 });
      if ((e.face > 0 && e.x >= A.x2 - e.w - 0.05) || (e.face < 0 && e.x <= A.x1 + e.w + 0.05)) {
        e.state = 'dizzy'; e.t = 0; e.dizzy = 1.8; e.vx = 0;
        this.music.sStomp(); this.ui.shake(0.8);
        popup('DIZZY! Double damage', 'info', { x: e.x, y: e.y + e.h + 0.5 }, this.camera);
      }
    } else if (e.state === 'dizzy') {
      e.vx = 0;
      Z.head.rotation.z = Math.sin(e.t * 8) * 0.4;
      if (Math.random() < 0.3) this.sparks.emit({ x: e.x + Math.sin(e.t * 9) * 0.8, y: e.y + e.h + 0.2 }, { n: 1, color: 0xffc94a, speed: 0.5, up: 0, life: 0.4, size: 0.1, gravity: 0, intensity: 2 });
      if (e.t > 1.8) { e.state = 'walk'; e.t = 0; Z.head.rotation.z = 0; }
    }
    this.move(e, dt, false);
    e.x = Math.min(Math.max(e.x, A.x1 + e.w), A.x2 - e.w);
    R.position.set(e.x, e.y, 0);
    R.rotation.y += (faceRot(e.face) - R.rotation.y) * Math.min(1, dt * (e.state === 'charge' ? 20 : 5));
    e.phase += Math.abs(e.vx) * dt * 1.6;
    Z.legL.rotation.x = Math.sin(e.phase) * 0.4; Z.legR.rotation.x = -Math.sin(e.phase) * 0.4;
    Z.kneeL.rotation.x = Math.max(0, Math.sin(e.phase + 1.4)) * 0.6; Z.kneeR.rotation.x = Math.max(0, -Math.sin(e.phase + 1.4)) * 0.6;
    Z.body.rotation.x += (bodyLean - Z.body.rotation.x) * Math.min(1, dt * 10);
    if (e.state !== 'dizzy') Z.head.rotation.x = e.pulse * 0.25;
    Z.jaw.rotation.x = e.state === 'charge' || e.state === 'stomp' ? 0.5 : 0.1;
  }

  updateGargoyle(e, dt) {
    const R = e.model.root, Z = e.model, A = this.L.arena;
    const p = this.target(e.x);
    let flap = 0.2, lean = 0;
    if (e.state === 'perch') {
      e.face = p.x < e.x ? -1 : 1;
      e.x = e.perch.x; e.y = e.perch.y + Math.sin(e.t * 2) * 0.05;
      flap = 0.15 + Math.sin(e.t * 2) * 0.1;
      Z.armL.rotation.x = Z.armR.rotation.x = -0.6;
    } else if (e.state === 'screech') {
      flap = Math.sin(e.t * 30) * 0.8;
      Z.jaw.rotation.x = 0.7;
      Z.head.rotation.x = -0.4;
      if (Math.random() < 0.5) this.sparks.emit({ x: e.x, y: e.y + e.h }, { n: 1, color: 0xff8a20, speed: 2, up: 1, life: 0.4, size: 0.08, gravity: 0, intensity: 2 });
    } else if (e.state === 'dive') {
      const k = Math.min(1, e.t / (e.angry ? 0.7 : 0.85));
      const ease = k * k;
      e.x = e.from.x + (e.to.x - e.from.x) * k;
      e.y = e.from.y + (e.to.y - e.from.y) * ease;
      e.face = e.to.x < e.from.x ? -1 : 1;
      flap = -0.9; lean = 0.7;
      Z.armL.rotation.x = Z.armR.rotation.x = -2.6;
      if (k >= 1) {
        e.state = 'ground'; e.t = 0; e.dizzy = e.angry ? 1.6 : 2.2;
        this.music.sStomp(); this.ui.shake(0.7);
        for (const dir of [-1, 1]) this.spawnShockwave(e.x + dir * 1.0, dir, e.angry ? 10 : 8);
        this.chunks.emit({ x: e.x, y: 0.1 }, { n: 30, color: [0x7d7f8c, 0x55576a], speed: 8, up: 5, life: 1, size: 0.16 });
        popup('STUCK! Double damage', 'info', { x: e.x, y: e.h + 0.6 }, this.camera);
        if (e.angry) for (let k2 = 0; k2 < 4; k2++) this.rubble(rand(A.x1 + 1, A.x2 - 1), k2 * 0.25);
      }
    } else if (e.state === 'ground') {
      e.face = p.x < e.x ? -1 : 1;
      e.vx = Math.abs(p.x - e.x) > 1.2 ? e.face * 1.3 : 0;
      this.move(e, dt, false);
      e.x = Math.min(Math.max(e.x, A.x1 + e.w), A.x2 - e.w);
      flap = -0.2;
      Z.armL.rotation.x = -1.4 + Math.sin(e.t * 9) * 0.6; Z.armR.rotation.x = -1.4 - Math.sin(e.t * 9) * 0.6;   // clawing
      if (e.t > (e.angry ? 2.4 : 3.0)) {
        // fly to the perch furthest from the nearest player
        e.perch = e.perches.reduce((a, b) => (Math.abs(b.x - p.x) > Math.abs(a.x - p.x) ? b : a));
        e.state = 'takeoff'; e.t = 0; e.from = { x: e.x, y: e.y };
        this.music.sScreech();
      }
    } else if (e.state === 'takeoff') {
      const k = Math.min(1, e.t / 0.9);
      e.x = e.from.x + (e.perch.x - e.from.x) * k;
      e.y = e.from.y + (e.perch.y - e.from.y) * Math.sin(k * Math.PI / 2) + Math.sin(k * Math.PI) * 2;
      flap = Math.sin(e.t * 26) * 0.9;
      e.face = e.perch.x < e.from.x ? -1 : 1;
      if (k >= 1) { e.state = 'perch'; e.t = 0; e.beats = 0; }
    }
    R.position.set(e.x, e.y, 0);
    R.rotation.y += (faceRot(e.face) - R.rotation.y) * Math.min(1, dt * 8);
    Z.wings[0].rotation.y = flap; Z.wings[1].rotation.y = -flap;
    Z.body.rotation.x += (lean - Z.body.rotation.x) * Math.min(1, dt * 10);
    if (e.dizzy > 0 && Math.random() < 0.3) this.sparks.emit({ x: e.x + Math.sin(e.t * 9) * 0.7, y: e.y + e.h + 0.2 }, { n: 1, color: 0xffc94a, speed: 0.5, up: 0, life: 0.4, size: 0.1, gravity: 0, intensity: 2 });
  }

  /** A red ring on the ground that pulses for `life` seconds (where something is about to land). */
  marker(x, life) {
    const mark = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.4, 32), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.05, 0);
    this.scene.add(mark);
    this.foeShots.push({ kind: 'marker', x, y: 0, vx: 0, vy: 0, life, mesh: mark, w: 0, h: 0 });
  }

  // ---- The Banshee Diva -------------------------------------------------------------------
  spawnBanshee() {
    const model = makeBanshee();
    const A = this.L.arena;
    const x = A.x2 - 4;
    model.root.position.set(x, 0.7, 0);
    const e = this.base('banshee', model, x, 0.7, {
      w: 0.6, h: 3.2, hp: 80, points: 20000, face: -1, state: 'float', moves: ['scream', 'highnote', 'scream', 'summon'], mi: 0, act: 0, camY: 3,
      colors: [0xd8f0e8, 0x9affd8],
    });
    e.center = () => ({ x: e.x, y: e.y + 1.8 });
    e.box = () => ({ x1: e.x - e.w, x2: e.x + e.w, y1: e.y + 0.3, y2: e.y + e.h });
    e.hittable = () => e.state !== 'highnote' || e.y < 2;
    e.harmful = () => e.state === 'float' || e.state === 'inhale';
    e.onBeat = (i) => {
      e.pulse = 1;
      if (this.cine) return;
      if (e.state === 'inhale' && e.t > 0.7) { this.bansheeScream(e); return; }
      if (e.state !== 'float' || i % 4 !== 0 || e.t < 1.5) return;
      const mv = e.moves[e.mi++ % e.moves.length];
      e.t = 0; e.act = 0;
      if (mv === 'scream' || mv === 'scream2') {
        e.state = 'inhale'; e.screamKind = mv;
        e.face = this.target(e.x).x < e.x ? -1 : 1;
        popup(mv === 'scream2' ? 'HIGH THEN LOW! Duck, then jump' : 'SCREAM! DUCK!', 'beat', { x: e.x, y: e.y + e.h + 0.5 }, this.camera);
      } else e.state = mv;
    };
    this.music.sScream();
    return e;
  }

  bansheeScream(e) {
    const send = (band, delay) => setTimeout(() => {
      if (e.dead || !this.boss) return;
      this.music.sScream();
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: band === 'high' ? 0x9affd8 : 0xff8ac8, transparent: true, opacity: 0.75, toneMapped: false, side: THREE.DoubleSide, depthWrite: false });
      for (let k = 0; k < 3; k++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45 + k * 0.12, 0.05, 6, 24, Math.PI), mat);
        ring.rotation.z = e.face > 0 ? -Math.PI / 2 : Math.PI / 2; ring.position.x = -e.face * k * 0.25; g.add(ring);
      }
      const y0 = band === 'high' ? 1.65 : 0.4;
      g.position.set(e.x + e.face * 0.8, y0, 0.2);
      this.scene.add(g);
      // high band: y 1.15-2.2 (duck under it) · low band: y 0-0.8 (jump over it)
      this.foeShots.push({ kind: 'scream', band, x: e.x + e.face * 0.8, y: y0, vx: e.face * 9.5, vy: 0, life: 3, mesh: g, w: 0.4, h: 0 });
      this.ui.shake(0.2);
    }, delay);
    send('high', 0);
    if (e.screamKind === 'scream2') send('low', this.music.spb * 1000 * 1.5);
    e.state = 'scream'; e.t = 0;
  }

  updateBanshee(e, dt) {
    const R = e.model.root, Z = e.model, A = this.L.arena;
    const p = this.target(e.x);
    let wantY = 0.7 + Math.sin(e.t * 2.2) * 0.25, armUp = -0.3, mouth = 1;
    if (e.state === 'float') {
      // hover a few steps away from the nearest player
      const side = e.x > p.x ? 1 : -1;
      const tx = Math.min(Math.max(p.x + side * 4, A.x1 + 1), A.x2 - 1);
      e.x += Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x), (e.angry ? 3 : 2.1) * dt);
      e.face = p.x < e.x ? -1 : 1;
    } else if (e.state === 'inhale') {
      armUp = -2.6; mouth = 1 + e.t * 2;
      if (Math.random() < 0.5) this.sparks.emit({ x: e.x, y: e.y + 3 }, { n: 1, color: 0x9affd8, speed: 2, up: 0, life: 0.4, size: 0.07, gravity: 0, intensity: 2 });
    } else if (e.state === 'scream') {
      armUp = -2.9; mouth = 3;
      if (e.t > (e.screamKind === 'scream2' ? 1.2 : 0.7)) {
        e.state = 'tired'; e.t = 0; e.dizzy = e.angry ? 1.6 : 2.2;
        popup('OUT OF BREATH! Double damage', 'info', { x: e.x, y: e.y + e.h + 0.4 }, this.camera);
      }
    } else if (e.state === 'tired') {
      wantY = 0.15; armUp = 0.2; mouth = 0.6;
      if (e.t > (e.angry ? 1.6 : 2.2)) { e.state = 'float'; e.t = 0; }
    } else if (e.state === 'highnote') {
      wantY = 3.6; armUp = -2.9; mouth = 2.5;
      if (!e.act && e.t > 0.6) {
        e.act = 1;
        this.music.sScream();
        this.ui.banner('High note!', 'Stage lights falling');
        const n = e.angry ? 5 : 3;
        for (let k = 0; k < n; k++) this.rubble(Math.min(Math.max(p.x + rand(-4, 4), A.x1 + 1), A.x2 - 1), k * 0.3);
      }
      if (e.t > 2.6) { e.state = 'float'; e.t = 0; }
    } else if (e.state === 'summon') {
      armUp = -2.2; mouth = 1.5;
      if (!e.act && e.t > 0.4) {
        e.act = 1;
        const ghosts = this.enemies.filter((z) => z.kind === 'ghost' && !z.dead).length;
        for (let k = ghosts; k < 2; k++) this.spawnGhost(A.x1 + 2 + Math.random() * (A.x2 - A.x1 - 4), 1.2);
        this.ui.banner('Backing singers!', '');
      }
      if (e.t > 1.2) { e.state = 'float'; e.t = 0; }
    }
    e.y += (wantY - e.y) * Math.min(1, dt * 3);
    R.position.set(e.x, e.y, 0);
    R.rotation.y += ((e.face > 0 ? 0.6 : -0.6) - R.rotation.y) * Math.min(1, dt * 6);
    Z.armL.rotation.x += (armUp - Z.armL.rotation.x) * Math.min(1, dt * 10);
    Z.armR.rotation.x += (armUp + 0.2 - Z.armR.rotation.x) * Math.min(1, dt * 10);
    Z.mouth.scale.y += (mouth - Z.mouth.scale.y) * Math.min(1, dt * 12);
    Z.body.rotation.z = Math.sin(e.t * 1.7) * 0.05;
    if (e.dizzy > 0 && Math.random() < 0.3) this.sparks.emit({ x: e.x + Math.sin(e.t * 9) * 0.6, y: e.y + e.h }, { n: 1, color: 0xffc94a, speed: 0.5, up: 0, life: 0.4, size: 0.1, gravity: 0, intensity: 2 });
    if (e.angry && e.moves[0] === 'scream') e.moves = ['scream2', 'highnote', 'scream2', 'summon'];
  }

  // ---- The Disco Mummy --------------------------------------------------------------------
  spawnMummy() {
    const model = makeMummy();
    const s = 1.7;
    model.root.scale.setScalar(s);
    const A = this.L.arena;
    const x = A.x2 - 4;
    model.root.position.set(x, 0, 0);
    const e = this.base('mummy', model, x, 0, {
      w: 0.55, h: 1.8 * s, hp: 130, points: 25000, face: -1, state: 'dance', moves: ['slide', 'beams', 'spin', 'whip'], mi: 0, act: 0, camY: 3.5,
      colors: [0xe8dcc0, 0xffc94a],
    });
    // Knee slide: he's low enough to jump over
    e.box = () => (e.state === 'slide' ? { x1: e.x - 0.9, x2: e.x + 0.9, y1: 0, y2: 1.1 } : { x1: e.x - e.w, x2: e.x + e.w, y1: e.y, y2: e.y + e.h });
    e.center = () => ({ x: e.x, y: e.y + (e.state === 'slide' ? 0.6 : e.h * 0.5) });
    e.hittable = () => true;
    e.harmful = () => e.state !== 'pose' && e.state !== 'dizzy';
    e.onBeat = (i) => {
      e.pulse = 1;
      if (this.cine) return;
      if (e.state === 'windup' && e.t > 0.6) { e.state = 'slide'; e.t = 0; this.music.sDisco(); return; }
      if (e.state === 'spin' && e.act < (e.angry ? 3 : 2)) {
        e.act++; e.lastWave = e.t;
        for (const d of [-1, 1]) this.spawnShockwave(e.x + d * 1.1, d, e.angry ? 10 : 8);
        this.music.sDisco(); this.ui.shake(0.25);
        return;
      }
      if (e.state !== 'dance' || i % 4 !== 0 || e.t < 1.5) return;
      const mv = e.moves[e.mi++ % e.moves.length];
      e.t = 0; e.act = 0;
      const at = { x: e.x, y: e.y + e.h + 0.5 };
      if (mv === 'slide') {
        e.state = 'windup'; e.face = this.target(e.x).x < e.x ? -1 : 1;
        popup('KNEE SLIDE! Jump him', 'beat', at, this.camera);
      } else if (mv === 'spin') {
        e.state = 'spin';
        popup('GLITTER SPIN! Jump the waves', 'beat', at, this.camera);
      } else if (mv === 'beams') {
        e.state = 'beams';
        popup('MIRROR BALL! Out of the red circles', 'beat', at, this.camera);
      } else if (mv === 'whip') {
        e.state = 'whip'; e.face = this.target(e.x).x < e.x ? -1 : 1;
        popup(e.angry ? 'WHIP HIGH THEN LOW! Duck, then jump' : 'BANDAGE WHIP! DUCK!', 'beat', at, this.camera);
      } else e.state = mv;
    };
    this.music.sDisco();
    return e;
  }

  bandageWhip(e, band) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, emissive: 0x3a3020 });
    const g = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), mat);
      strip.position.set(-e.face * k * 0.3, Math.sin(k * 1.3) * 0.12, 0); strip.rotation.z = Math.sin(k) * 0.4; g.add(strip);
    }
    const y0 = band === 'high' ? 1.65 : 0.4;
    g.position.set(e.x + e.face * 0.8, y0, 0.2);
    this.scene.add(g);
    this.music.sThrow();
    // same hit bands as the banshee's screams: duck the high one, jump the low one
    this.foeShots.push({ kind: 'scream', band, x: e.x + e.face * 0.8, y: y0, vx: e.face * 10, vy: 0, life: 3, mesh: g, w: 0.4, h: 0 });
  }

  updateMummy(e, dt) {
    const R = e.model.root, Z = e.model, A = this.L.arena;
    const p = this.target(e.x);
    const bf = this.music.beatFloat();
    let lean = 0, rootY = 0, armL = -0.3, armR = -0.3, kneel = false;
    if (e.angry && !e.moves.includes('summon')) e.moves = ['slide', 'beams', 'spin', 'whip', 'summon'];
    if (e.state === 'dance') {
      e.face = p.x < e.x ? -1 : 1;
      const dist = Math.abs(p.x - e.x);
      e.vx = this.cine ? 0 : dist > 3.2 ? e.face * (e.angry ? 2.2 : 1.5) : dist < 2.2 ? -e.face * 1.2 : 0;
      // the Travolta: point up, point down, on the beat
      const up = Math.floor(bf) % 2 === 0;
      armR = up ? -3.0 : -0.5; armL = up ? -0.3 : -1.0;
      rootY = -Math.abs(Math.sin(bf * Math.PI)) * 0.15;
      lean = Math.sin(bf * Math.PI) * 0.12;
    } else if (e.state === 'windup') {
      e.vx = -e.face * 0.8; lean = -0.4; armL = armR = -1.6;
    } else if (e.state === 'slide') {
      e.vx = e.face * (e.angry ? 13 : 11);
      lean = -0.6; kneel = true; armL = armR = -2.8;
      if (Math.random() < 0.8) this.sparks.emit({ x: e.x - e.face * 0.5, y: 0.1 }, { n: 2, color: [0xffc94a, 0xffffff], speed: 3, up: 2, life: 0.3, size: 0.07, gravity: 4, intensity: 2 });
      if ((e.face > 0 && e.x >= A.x2 - 0.95) || (e.face < 0 && e.x <= A.x1 + 0.95)) {
        e.state = 'pose'; e.t = 0; e.vx = 0; e.dizzy = e.angry ? 1.4 : 1.8;
        this.ui.shake(0.4);
        popup('STRIKE A POSE! Double damage', 'info', { x: e.x, y: e.y + e.h + 0.4 }, this.camera);
      }
    } else if (e.state === 'pose') {
      e.vx = 0; armR = -3.1; armL = -0.2; lean = 0.15;
      if (e.t > (e.angry ? 1.4 : 1.8)) { e.state = 'dance'; e.t = 0; }
    } else if (e.state === 'spin') {
      e.vx = 0; armL = armR = -1.57;
      if (Math.random() < 0.6) this.sparks.emit({ x: e.x + rand(-1, 1), y: e.y + rand(1, 3) }, { n: 1, color: [0xff8ac8, 0x9affd8, 0xffc94a], speed: 4, up: 1, life: 0.5, size: 0.07, gravity: 2, intensity: 2 });
      if (e.act >= (e.angry ? 3 : 2) && e.t - e.lastWave > 0.45) {
        e.state = 'dizzy'; e.t = 0; e.dizzy = 1.8;
        R.rotation.y = faceRot(e.face);
        popup('DIZZY! Double damage', 'info', { x: e.x, y: e.y + e.h + 0.4 }, this.camera);
      }
    } else if (e.state === 'dizzy') {
      e.vx = 0; armL = armR = 0.2;
      Z.head.rotation.z = Math.sin(e.t * 8) * 0.4;
      if (Math.random() < 0.3) this.sparks.emit({ x: e.x + Math.sin(e.t * 9) * 0.8, y: e.y + e.h + 0.2 }, { n: 1, color: 0xffc94a, speed: 0.5, up: 0, life: 0.4, size: 0.1, gravity: 0, intensity: 2 });
      if (e.t > 1.8) { e.state = 'dance'; e.t = 0; Z.head.rotation.z = 0; }
    } else if (e.state === 'beams') {
      e.vx = 0; armR = -3.1; armL = -0.4;
      if (!e.act && e.t > 0.4) {
        e.act = 1;
        const n = e.angry ? 5 : 3;
        const xs = [p.x];
        for (let k = 1; k < n; k++) xs.push(A.x1 + 1 + Math.random() * (A.x2 - A.x1 - 2));
        xs.forEach((x, k) => this.mirrorBeam(Math.min(Math.max(x, A.x1 + 0.8), A.x2 - 0.8), k * 0.22));
      }
      if (e.t > 2.2) { e.state = 'dance'; e.t = 0; }
    } else if (e.state === 'whip') {
      e.vx = 0;
      const arm = e.face > 0 ? 'armL' : 'armR';
      if (arm === 'armL') armL = e.t < 0.5 ? 0.9 : -1.6; else armR = e.t < 0.5 ? 0.9 : -1.6;
      if (!e.act && e.t > 0.5) {
        e.act = 1;
        this.bandageWhip(e, 'high');
        if (e.angry) setTimeout(() => !e.dead && this.boss && this.bandageWhip(e, 'low'), this.music.spb * 1000 * 1.5);
      }
      if (e.t > (e.angry ? 1.5 : 1.0)) { e.state = 'dance'; e.t = 0; }
    } else if (e.state === 'summon') {
      e.vx = 0; armL = armR = -2.9;
      if (!e.act && e.t > 0.4) {
        e.act = 1;
        const dancers = this.enemies.filter((z) => z.kind === 'pogo' && !z.dead).length;
        for (let k = dancers; k < 2; k++) {
          const x = Math.min(Math.max(p.x + (k ? 6 : -6), A.x1 + 1), A.x2 - 1);
          if (Math.abs(x - p.x) > 2.5) this.spawnZombie('pogo', x);
        }
        this.ui.banner('Backup dancers!', '');
      }
      if (e.t > 1.2) { e.state = 'dance'; e.t = 0; }
    }
    this.move(e, dt, false);
    e.x = Math.min(Math.max(e.x, A.x1 + e.w), A.x2 - e.w);
    R.position.set(e.x, e.y + (kneel ? -0.75 : rootY), 0);
    if (e.state === 'spin') R.rotation.y += dt * 14;
    else R.rotation.y += (faceRot(e.face) - R.rotation.y) * Math.min(1, dt * 8);
    Z.armL.rotation.x += (armL - Z.armL.rotation.x) * Math.min(1, dt * 12);
    Z.armR.rotation.x += (armR - Z.armR.rotation.x) * Math.min(1, dt * 12);
    Z.body.rotation.x += (lean - Z.body.rotation.x) * Math.min(1, dt * 10);
    if (kneel) {
      Z.legL.rotation.x = Z.legR.rotation.x = -1.3;
      Z.kneeL.rotation.x = Z.kneeR.rotation.x = 1.9;
    } else if (e.state === 'dance') {
      e.phase += Math.abs(e.vx) * dt * 1.6;
      const sway = Math.sin(bf * Math.PI) * 0.35;
      Z.legL.rotation.x = Math.sin(e.phase) * 0.4 + sway; Z.legR.rotation.x = -Math.sin(e.phase) * 0.4 - sway;
      Z.kneeL.rotation.x = Math.max(0, sway) * 0.8; Z.kneeR.rotation.x = Math.max(0, -sway) * 0.8;
    } else {
      Z.legL.rotation.x *= 0.8; Z.legR.rotation.x *= 0.8; Z.kneeL.rotation.x *= 0.8; Z.kneeR.rotation.x *= 0.8;
    }
  }

  mirrorBeam(x, delay, color = 0xff8ac8) {
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 24), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.06, 0);
    this.scene.add(mark);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 7.6, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
    mesh.position.set(x, 3.8, 0);
    mesh.visible = false;
    this.scene.add(mesh);
    this.foeShots.push({ kind: 'beam', x, y: 0, vx: 0, vy: 0, wait: 0.9 + delay, on: 0.35, mark, life: 5, mesh, w: 0.5, h: 8 });
  }

  // ---- The Devil ---------------------------------------------------------------------------
  spawnDevil() {
    const model = makeDevil();
    const s = 1.65;
    model.root.scale.setScalar(s);
    const A = this.L.arena;
    const x = A.x2 - 4;
    model.root.position.set(x, -s * 2, 0);
    const e = this.base('devil', model, x, 0, {
      w: 0.55, h: 1.8 * s, hp: 140, points: 66600, face: -1, state: 'rise',
      moves: ['duel', 'fireballs', 'hellfire', 'duel', 'summon'], mi: 0, act: 0, camY: 3.5,
      colors: [0xc81a1a, 0x111114],
    });
    e.center = () => ({ x: e.x, y: e.y + e.h * 0.55 });
    e.hittable = () => e.state !== 'rise' || e.t > 1.2;
    e.harmful = () => e.state !== 'rise' && e.state !== 'stunned';
    e.onBeat = (i) => {
      e.pulse = 1;
      if (this.cine || e.state === 'rise') return;
      const at = { x: e.x, y: e.y + e.h + 0.6 };
      if (e.state === 'riff') {
        if (e.ri < 0) { e.ri++; return; }   // a beat to get ready
        if (e.ri < e.riff.length) { const band = e.riff[e.ri++]; if (band) this.devilNote(e, band); return; }
        e.state = 'answer'; e.t = 0; e.ans = 0; e.beats = e.angry ? 5 : 6;
        popup('YOUR TURN! Hit him ON the beat', 'beat', at, this.camera);
        return;
      }
      if (e.state === 'answer') {
        if (--e.beats > 0) return;
        if (e.ans >= 3) {
          e.state = 'stunned'; e.t = 0; e.dizzy = 2.4;
          this.ui.banner('The crowd goes wild!', "He's stunned: double damage");
          this.music.sPlatinum();
        } else {
          e.state = 'strut'; e.t = 0;
          popup(e.ans ? 'Not enough! He wins this round' : 'The crowd boos...', 'info', at, this.camera);
        }
        return;
      }
      if (e.state === 'fly' && e.act < 3 && e.t > 0.8) { e.act++; this.fireball(e, this.target(e.x)); return; }
      if (e.state !== 'strut' || i % 4 !== 0 || e.t < 1.5) return;
      const mv = e.moves[e.mi++ % e.moves.length];
      e.t = 0; e.act = 0;
      if (mv === 'duel') {
        // Every low note (jump it) is followed by a rest so you can land: two rests before a high one.
        const _ = null;
        const pats = e.angry
          ? [['high', 'high', 'low', _, _, 'high'], ['high', 'high', _, 'low', _, _], ['low', _, _, 'high', 'high', 'low']]
          : [['high', 'high', 'low', _], ['high', _, 'low', _], ['high', 'high', _, 'low'], ['low', _, _, 'high']];
        e.riff = pats[Math.floor(Math.random() * pats.length)]; e.ri = -1;
        e.state = 'riff'; e.face = this.target(e.x).x < e.x ? -1 : 1;
        this.ui.banner('Guitar duel!', 'Duck the high notes, jump the low ones');
      } else if (mv === 'fireballs') {
        e.state = 'fireballs';
        popup('HELLFIRE! Keep moving', 'beat', at, this.camera);
      } else if (mv === 'hellfire') {
        e.state = 'hellfire';
        popup('FIRE FROM BELOW! Out of the red circles', 'beat', at, this.camera);
      } else if (mv === 'fly') {
        e.state = 'fly';
        popup('HE FLIES! Dodge the fireballs', 'beat', at, this.camera);
      } else e.state = mv;
    };
    this.music.sScreech();
    return e;
  }

  devilNote(e, band) {
    e.face = this.target(e.x).x < e.x ? -1 : 1;
    const g = makeWeaponMesh('notes', true);
    g.scale.setScalar(1.8);
    const y0 = band === 'high' ? 1.65 : 0.4;
    g.position.set(e.x + e.face * 0.9, y0, 0.2);
    this.scene.add(g);
    this.music.sPower();
    this.sparks.emit({ x: e.x + e.face * 0.9, y: y0 }, { n: 8, color: [0xff2e10, 0xffc94a], speed: 3, up: 0, life: 0.3, size: 0.07, gravity: 0, intensity: 2 });
    // same hit bands as the banshee's screams: duck the high one, jump the low one
    this.foeShots.push({ kind: 'scream', band, x: e.x + e.face * 0.9, y: y0, vx: e.face * 9.5, vy: 0, life: 3, mesh: g, w: 0.4, h: 0 });
  }

  updateDevil(e, dt) {
    const R = e.model.root, Z = e.model, A = this.L.arena, s = R.scale.x;
    const p = this.target(e.x);
    const bf = this.music.beatFloat();
    let armL = -1.0, armR = -0.6 + Math.sin(bf * Math.PI * 2) * 0.15, lean = 0, flying = false;
    if (e.state === 'rise') {
      const k = Math.min(1, e.t / 2.2);
      R.position.set(e.x, -s * 2 * (1 - k), 0);
      if (Math.random() < 0.9) this.sparks.emit({ x: e.x + rand(-1.2, 1.2), y: 0.1 }, { n: 2, color: [0xff6a1a, 0xffc94a, 0xff2e10], speed: 1, up: 7, life: 0.6, size: 0.14, gravity: -2, intensity: 2 });
      if (k >= 1) { e.state = 'strut'; e.t = 0; }
      return;
    }
    if (e.state === 'strut') {
      e.face = p.x < e.x ? -1 : 1;
      const dist = Math.abs(p.x - e.x);
      e.vx = this.cine ? 0 : dist > 4 ? e.face * (e.angry ? 2.4 : 1.7) : dist < 2.6 ? -e.face * 1.4 : 0;
    } else if (e.state === 'riff') {
      e.vx = 0; lean = -0.15;
      armR = -0.6 + Math.sin(e.t * 40) * 0.35;   // shredding
      armL = -1.2;
      if (Math.random() < 0.4) this.sparks.emit({ x: e.x + e.face * 0.4, y: e.y + 1.6 }, { n: 1, color: [0xff2e10, 0xffc94a], speed: 2, up: 1, life: 0.3, size: 0.06, gravity: 0, intensity: 2 });
    } else if (e.state === 'answer') {
      e.vx = 0; armR = -0.2; armL = -0.4; lean = 0.1;   // arms folded: "go on then"
    } else if (e.state === 'stunned') {
      e.vx = 0; armL = armR = 0.3;
      Z.head.rotation.z = Math.sin(e.t * 8) * 0.4;
      if (Math.random() < 0.3) this.sparks.emit({ x: e.x + Math.sin(e.t * 9) * 0.8, y: e.y + e.h + 0.2 }, { n: 1, color: 0xffc94a, speed: 0.5, up: 0, life: 0.4, size: 0.1, gravity: 0, intensity: 2 });
      if (e.t > 2.4) { e.state = 'strut'; e.t = 0; Z.head.rotation.z = 0; }
    } else if (e.state === 'fireballs') {
      e.vx = 0; armR = -3.0;
      if (e.act === 0 && e.t > 0.4) { e.act = 1; this.fireball(e, p); }
      if (e.act === 1 && e.t > 1.1) { e.act = 2; this.fireball(e, this.target(e.x)); }
      if (e.t > 1.7) { e.state = 'strut'; e.t = 0; }
    } else if (e.state === 'hellfire') {
      e.vx = 0; armL = armR = -2.9;
      if (!e.act && e.t > 0.4) {
        e.act = 1;
        this.ui.shake(0.4);
        const n = e.angry ? 6 : 4;
        const xs = [p.x];
        for (let k = 1; k < n; k++) xs.push(A.x1 + 1 + Math.random() * (A.x2 - A.x1 - 2));
        xs.forEach((x, k) => this.mirrorBeam(Math.min(Math.max(x, A.x1 + 0.8), A.x2 - 0.8), k * 0.2, 0xff5a1a));
      }
      if (e.t > 2.2) { e.state = 'strut'; e.t = 0; }
    } else if (e.state === 'summon') {
      e.vx = 0; armL = armR = -2.9;
      if (!e.act && e.t > 0.4) {
        e.act = 1;
        const ghosts = this.enemies.filter((z) => z.kind === 'ghost' && !z.dead).length;
        for (let k = ghosts; k < 2; k++) this.spawnGhost(A.x1 + 2 + Math.random() * (A.x2 - A.x1 - 4), 1.2);
        this.ui.banner('Lost souls!', '');
      }
      if (e.t > 1.2) { e.state = 'strut'; e.t = 0; }
    } else if (e.state === 'fly') {
      flying = true;
      e.face = p.x < e.x ? -1 : 1;
      const landing = e.act >= 3 && e.t > 3.2;
      const wantY = landing ? 0 : 4.2;
      const tx = Math.min(Math.max(p.x + (e.x > p.x ? 2 : -2), A.x1 + 1), A.x2 - 1);
      e.x += Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x), 3 * dt);
      e.y += (wantY - e.y) * Math.min(1, dt * 2.5);
      e.vx = 0; e.vy = 0; armL = armR = -0.4;
      if (landing && e.y < 0.08) { e.y = 0; e.state = 'strut'; e.t = 0; this.ui.shake(0.5); this.music.sStomp(); }
    }
    if (!flying) this.move(e, dt, false);
    e.x = Math.min(Math.max(e.x, A.x1 + e.w), A.x2 - e.w);
    R.position.set(e.x, e.y, 0);
    R.rotation.y += (faceRot(e.face) - R.rotation.y) * Math.min(1, dt * 8);
    Z.armL.rotation.x += (armL - Z.armL.rotation.x) * Math.min(1, dt * 12);
    Z.armR.rotation.x += (armR - Z.armR.rotation.x) * Math.min(1, dt * 14);
    Z.body.rotation.x += (lean - Z.body.rotation.x) * Math.min(1, dt * 10);
    e.phase += Math.abs(e.vx) * dt * 1.6;
    Z.legL.rotation.x = flying ? 0.3 : Math.sin(e.phase) * 0.4; Z.legR.rotation.x = flying ? -0.2 : -Math.sin(e.phase) * 0.4;
    Z.kneeL.rotation.x = Math.max(0, Math.sin(e.phase + 1.4)) * 0.6; Z.kneeR.rotation.x = Math.max(0, -Math.sin(e.phase + 1.4)) * 0.6;
    Z.tail.rotation.y = Math.sin(e.t * 3) * 0.5;
    if (Z.wings.visible) { const f = Math.sin(e.t * (flying ? 14 : 3)) * (flying ? 0.7 : 0.2); Z.wingL.rotation.y = 0.4 + f; Z.wingR.rotation.y = -0.4 - f; }
  }

  rubble(x, delay) {
    // warning marker on the ground first, then the chunk drops
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 24), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.04, 0);
    this.scene.add(mark);
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), MAT.stone);
    mesh.position.set(x, 12, 0);
    this.scene.add(mesh);
    this.foeShots.push({ kind: 'rubble', x, y: 12, vx: 0, vy: 0, g: 0, wait: 0.8 + delay, mark, life: 4, mesh, w: 0.35, h: 0.4, spin: 3 });
  }

  spawnShockwave(x, dir, speed) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.8, toneMapped: false }));
    mesh.position.set(x, 0.35, 0);
    this.scene.add(mesh);
    this.foeShots.push({ kind: 'wave', x, y: 0, vx: dir * speed, vy: 0, life: 2.4, mesh, w: 0.3, h: 0.7 });
  }

  throwHeadstone(e, p, T) {
    const x0 = e.x + e.face * 0.8, y0 = e.y + e.h * 0.95;
    const g = 20;
    const vx = (p.x - x0) / T;
    const vy = (p.y + 0.5 - y0 + 0.5 * g * T * T) / T;
    const mesh = new THREE.Group();
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.25), MAT.stone);
    stone.castShadow = true; mesh.add(stone);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 12), MAT.stone);
    top.rotation.x = Math.PI / 2; top.position.y = 0.5; mesh.add(top);
    mesh.position.set(x0, y0, 0);
    this.scene.add(mesh);
    this.foeShots.push({ kind: 'stone', x: x0, y: y0, vx, vy, g, life: 4, mesh, w: 0.4, h: 0.6, spin: e.face * 6 });
  }

  updateFoeShots(dt) {
    const A = this.L.arena;
    for (const f of this.foeShots) {
      f.life -= dt;
      if (f.kind === 'wave') {
        f.x += f.vx * dt;
        f.mesh.position.x = f.x;
        f.mesh.scale.y = 0.8 + Math.sin(f.life * 30) * 0.2;
        f.mesh.material.opacity = Math.min(0.8, f.life);
        if (Math.random() < 0.5) this.chunks.emit({ x: f.x, y: 0.05 }, { n: 1, color: 0x3b2f2a, speed: 2, up: 3, life: 0.5, size: 0.1 });
        if (f.x < A.x1 || f.x > A.x2) f.life = 0;
        for (const p of this.players) if (!p.dead && Math.abs(p.x - f.x) < f.w + p.w && p.y < f.h) this.hurt(p, f.x);
        continue;
      }
      if (f.kind === 'hearse') {
        f.x += f.vx * dt;
        f.mesh.position.x = f.x;
        for (const w of f.mesh.userData.wheels) w.rotation.y += dt * 30;
        if (Math.random() < 0.6) this.sparks.emit({ x: f.x + 2.3, y: 0.3 }, { n: 1, color: [0xff6a1a, 0xffc94a], speed: 1, up: 0.5, life: 0.3, size: 0.12, gravity: -1, intensity: 2 });
        for (const p of this.players) if (!p.dead && !p.out && Math.abs(p.x - f.x) < f.w + p.w && p.y < f.h) this.hurt(p, f.x);
        for (const e of this.enemies) {
          if (e.dead || e.boss || e.kind === 'ghost' || e.kind === 'bird' || e.kind === 'thrower' || e.y > 1 || Math.abs(e.x - f.x) > f.w) continue;
          this.killEnemy(e, false);
          popup('ROADKILL!', 'pts', { x: e.x, y: 2.4 }, this.camera);
        }
        if (f.x < this.camX - this.halfW - 8) f.life = 0;
        continue;
      }
      if (f.kind === 'beam') {
        if (f.wait > 0) {
          f.wait -= dt;
          f.mark.material.opacity = 0.4 + Math.abs(Math.sin(f.wait * 14)) * 0.5;
          if (f.wait <= 0) { f.mesh.visible = true; this.music.sDisco(); this.sparks.emit({ x: f.x, y: 0.2 }, { n: 16, color: [0xff8ac8, 0xffffff, 0x9affd8], speed: 5, up: 3, life: 0.5, size: 0.08, gravity: 3, intensity: 2 }); }
          continue;
        }
        f.on -= dt;
        f.mesh.material.opacity = Math.max(0, f.on / 0.35) * 0.8;
        for (const p of this.players) if (!p.dead && !p.out && Math.abs(p.x - f.x) < 0.6) this.hurt(p, f.x);
        if (f.on <= 0) f.life = 0;
        continue;
      }
      if (f.kind === 'marker') { f.mesh.material.opacity = 0.35 + Math.abs(Math.sin(f.life * 10)) * 0.55; continue; }
      if (f.kind === 'scream') {
        f.x += f.vx * dt;
        f.mesh.position.x = f.x;
        f.mesh.scale.setScalar(1 + Math.sin(f.life * 25) * 0.08);
        if (f.x < A.x1 - 1 || f.x > A.x2 + 1) f.life = 0;
        const [lo, hi] = f.band === 'high' ? [1.15, 2.2] : [0, 0.8];
        for (const p of this.players) if (!p.dead && Math.abs(p.x - f.x) < 0.5 && p.y < hi && p.y + p.h > lo) this.hurt(p, f.x - f.vx);
        continue;
      }
      if (f.kind === 'rubble' && f.wait > 0) {
        f.wait -= dt;
        f.mark.material.opacity = 0.4 + Math.abs(Math.sin(f.wait * 14)) * 0.5;
        if (f.wait <= 0) f.vy = -16;
        continue;
      }
      f.vy -= f.g * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.mesh.position.set(f.x, f.y, 0);
      f.mesh.rotation.z += f.spin * dt;
      if (f.kind === 'fireball' && Math.random() < 0.7) this.sparks.emit({ x: f.x, y: f.y }, { n: 1, color: [0xff8a20, 0xffc94a], speed: 0.5, up: 0.5, life: 0.3, size: 0.1, gravity: -1, intensity: 2 });
      for (const p of this.players) {
        if (!p.dead && Math.abs(p.x - f.x) < f.w + p.w && f.y > p.y - 0.3 && f.y < p.y + p.h) { this.hurt(p, f.x); f.life = 0; }
      }
      // Skulls and bottles can be shot down
      if (f.kind === 'skull' || f.kind === 'bottle') {
        for (const s of this.shots) {
          if (Math.hypot(s.x - f.x, s.y - f.y) < s.r + 0.25) { f.life = 0; this.run.score += 50; if (s.type !== 'vinyl') s.life = 0; break; }
        }
      }
      const groundHit = this.level.solids.some((s) => f.x > s.x1 && f.x < s.x2 && f.y < s.y2 && f.y > s.y1) || f.y < (f.kind === 'rubble' ? 0.3 : -3);
      if (groundHit && f.vy < 0) f.life = 0;
      if (f.life <= 0) {
        const glass = f.kind === 'bottle';
        if (glass) this.music.sBottle(); else this.music.sCrate();
        const cols = f.kind === 'skull' ? [0xeee6d2, 0xa6ff4d] : glass ? [0x3a8a3a, 0xc8ffc8] : f.kind === 'fireball' ? [0xff8a20, 0xffc94a] : [0x6a6e80, 0x4d5163];
        (f.kind === 'fireball' ? this.sparks : this.chunks).emit({ x: f.x, y: Math.max(0.2, f.y + 0.2) }, { n: 14, color: cols, speed: 6, up: 4, life: 0.8, size: 0.1 });
        if (f.mark) this.scene.remove(f.mark);
      }
    }
    this.foeShots = this.foeShots.filter((f) => { if (f.life > 0) return true; this.scene.remove(f.mesh); if (f.mark) this.scene.remove(f.mark); return false; });
  }

  bossDefeated(e) {
    this.ui.boss(null);
    this.bossDone = true;
    this.lock = null;
    this.music.sBossDie();
    this.ui.shake(1);
    this.ui.flash('#ffffff');
    const c = e.center();
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.chunks.emit({ x: c.x + rand(-1, 1), y: c.y + rand(-1, 1) }, { n: 30, color: e.colors, speed: 9, up: 5, life: 1.4, size: 0.22 });
        this.sparks.emit(c, { n: 30, color: [0xff2e88, 0xffc94a, 0xa6ff4d], speed: 10, up: 2, life: 0.8, size: 0.1, gravity: 2, intensity: 2 });
        this.ui.shake(0.5);
      }, i * 200);
    }
    this.shatter(e.model.root, 1, true);
    for (const z of this.enemies) if (z !== e) this.killEnemy(z, false);
    for (const f of this.foeShots) f.life = 0;
    this.rescued = this.L.rescue;
    if (this.stats.deaths === 0) {
      this.run.score += 10000;
      setTimeout(() => popup('FLAWLESS GIG! +10000', 'beat', { x: c.x, y: c.y + 2.2 }, this.camera), 600);
    }
    setTimeout(() => {
      const who = { drummer: 'Drummer', bassist: 'Bassist', singer: 'Singer', roadie: 'Roadie' }[this.L.rescue] || 'Bandmate';
      const sub = { drummer: 'The beat is back for good', bassist: 'The low end is back', singer: 'The band has a voice again', roadie: 'The gear is back on the road' }[this.L.rescue] || '';
      if (this.L.rescue === 'soul') this.ui.banner('Your soul is saved!', 'The contract goes up in flames');
      else this.ui.banner(`${who} rescued!`, sub);
      this.music.setLayer('beat', true);
    }, 1200);
    setTimeout(() => this.ui.levelClear(this), 5600);
  }

  // ---------------------------------------------------------------------------
  updateCrates(dt) {
    for (const c of this.crates) {
      if (c.hp <= 0) continue;
      c.flash -= dt;
      c.mesh.position.x = c.x + (c.flash > 0 ? rand(-0.06, 0.06) : 0);
    }
  }

  breakCrate(c) {
    this.scene.remove(c.mesh);
    this.run.score += 50;
    this.run.cash += 5;
    this.chunks.emit({ x: c.x, y: c.y + 0.4 }, { n: 20, color: [0x18181c, 0xa7adb8], speed: 6, up: 4, life: 1, size: 0.14 });
    let kind = c.loot;
    if (this.players.every((p) => p.weapon === kind)) kind = 'gold';
    const mesh = makePickup(kind);
    mesh.position.set(c.x, c.y + 0.9, 0);
    this.scene.add(mesh);
    this.pickups.push({ kind, x: c.x, y: c.y + 0.9, mesh, t: 0 });
  }

  updatePickups(dt) {
    for (const k of this.pickups) {
      k.t += dt;
      k.mesh.rotation.y += dt * 2.5;
      k.mesh.position.y = k.y + Math.sin(k.t * 3) * 0.12;
      if (!k.forever) {
        k.mesh.visible = k.t < 10 || Math.floor(k.t * 10) % 2 === 0;
        if (k.t > 13) k.gone = true;
      }
      const p = this.players.find((q) => !q.dead && !q.out && Math.abs(q.x - k.x) < 0.8 && Math.abs(q.y + 0.9 - k.y) < 1.3);
      if (!p) continue;
      k.gone = true;
      this.music.sPickup();
      this.sparks.emit({ x: k.x, y: k.y }, { n: 20, color: [0xa6ff4d, 0xffc94a], speed: 5, up: 2, life: 0.6, size: 0.08, gravity: 3 });
      const at = { x: k.x, y: k.y + 1 };
      if (k.kind === 'gold') { this.run.score += 1000; this.run.cash += 25; popup('+1000  +$25', 'pts', at, this.camera); }
      else if (k.kind === 'platinum') {
        this.music.sPlatinum();
        if (!k.old) collectRecord(this.L.id, k.id);
        this.recordsFound.push(k.id);
        this.run.score += 2500; this.run.cash += k.old ? 25 : 100;
        popup(`PLATINUM RECORD ${this.recordsFound.length}/3!`, 'beat', at, this.camera);
      } else if (k.kind === 'life') { this.run.lives++; this.music.sLife(); popup('1UP!', 'beat', at, this.camera); }
      else if (k.kind === 'jacket') {
        if (p.armor > 0) { this.run.score += 1000; popup('+1000', 'pts', at, this.camera); }
        else { p.armor = 1; p.hero.setArmor(1); popup('JACKET ON!', 'info', at, this.camera); }
      } else {
        p.weapon = k.kind;
        popup(WEAPONS[k.kind].name + '!', 'info', at, this.camera);
      }
    }
    this.pickups = this.pickups.filter((k) => { if (!k.gone) return true; this.scene.remove(k.mesh); return false; });
  }

  updateDebris(dt) {
    for (const d of this.debris) {
      d.life -= dt;
      d.vy -= G * 0.7 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      const floor = d.bounce !== undefined ? d.bounce + 0.05 : -100;
      if (d.y < floor) { d.y = floor; d.vy *= -0.35; d.vx *= 0.6; d.spin *= 0.6; }
      d.mesh.position.set(d.x, d.y, d.z ?? 0.2);
      d.mesh.rotation.z += d.spin * dt;
      d.mesh.rotation.x += d.spin * 0.5 * dt;
      if (d.shrink && d.life < 0.4) d.mesh.scale.multiplyScalar(0.9);
    }
    this.debris = this.debris.filter((d) => {
      if (d.life > 0) return true;
      this.scene.remove(d.mesh);
      if (d.dispose && d.mesh.geometry) d.mesh.geometry.dispose();
      return false;
    });
  }

  // ---------------------------------------------------------------------------
  updateCamera(dt) {
    const A = this.L.arena;
    if (this.room) {
      // Inside a secret room: follow the players, but keep the camera within the room's walls.
      // (Pinning it to the middle hid the exit door off the edge on narrow screens, like a phone held upright.)
      const R = this.room.room, w = R.x1 - R.x0;
      const avg = this.alive.length ? this.alive.reduce((sum, p) => sum + p.x, 0) / this.alive.length : R.cx;
      const target = this.halfW * 2 >= w ? R.cx : Math.min(Math.max(avg, R.x0 + this.halfW), R.x1 - this.halfW);
      this.camX += (target - this.camX) * Math.min(1, dt * 6);
      return;
    }
    const live = this.alive;
    const avg = live.length ? live.reduce((s, p) => s + p.x, 0) / live.length : this.camX;
    const face = live.length === 1 ? live[0].face : 0;
    if (this.lock) {
      const L = this.lock;
      const w = L.x2 - L.x1, mid = (L.x1 + L.x2) / 2;
      const target = this.halfW * 2 >= w ? mid : Math.min(Math.max(avg, L.x1 + this.halfW), L.x2 - this.halfW);
      this.camX += (target - this.camX) * Math.min(1, dt * 3);
    } else if (live.length) {
      const limit = this.bossDone ? A.x2 : A.x1 + this.halfW;
      const target = Math.min(avg + face * 1.2 + 1, limit);
      if (target > this.camX) this.camX += (target - this.camX) * Math.min(1, dt * 5);
    }
    if (this.bossStarted) {
      const g = this.level.gate;
      if (g.position.y > 0) {
        g.position.y = Math.max(0, g.position.y - dt * 14);
        if (g.position.y === 0) { this.music.sStomp(); this.ui.shake(0.3); }
      }
    }
  }

  updateBand() {
    const M = this.music;
    const combo = Math.max(...this.players.map((p) => p.combo));
    const drums = this.L.id > 0 || this.bossDone;   // the drummer plays from level 2 on
    M.setLayer('beat', drums || this.bossStarted || combo >= 4 || this.ambush.state === 'active');
    M.setLayer('lead', combo >= 10 || this.bossAngry || this.players.some((p) => p.soloT > 0));
    const lead = this.lead;
    let song = this.L.zones[this.zoneAt(lead.x)].song;
    if (this.ambush.state === 'active') song = this.L.ambush.song;
    if (this.bossStarted && !this.bossDone) song = this.L.songs.boss;
    if (this.bossDone) song = this.L.songs.clear;
    M.setSong(song);
  }

  /** End-of-level grade from score, rhythm and survival. */
  rank() {
    const s = this.stats;
    const beatPct = s.throws ? s.onBeat / s.throws : 0;
    let pts = 0;
    pts += Math.min(40, (this.run.score - this.startScore) / 1000);
    pts += beatPct * 40;
    pts += Math.max(0, 20 - s.deaths * 7);
    const grade = pts >= 85 ? 'S' : pts >= 70 ? 'A' : pts >= 55 ? 'B' : pts >= 40 ? 'C' : 'D';
    return { grade, beatPct };
  }

  /** Remove this level's player models (the world scene is thrown away by main). */
  dispose() {
    for (const p of this.players) { this.scene.remove(p.hero.root); this.scene.remove(p.ring); }
  }
}
