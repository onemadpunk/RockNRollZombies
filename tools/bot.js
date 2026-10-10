// Fair play-test bot: no cheats, real-time speed, sound off. Dev tool only (not in the built game).
// Load in the browser console while a level is running (served by serve.py):
//   const { installBot } = await import('/tools/bot.js'); installBot(); await botRun(30);
// It drives player 1 and logs every hit and death with what caused it, so we can find unfair spots.

export function installBot({ mute = true } = {}) {
  const M = rnrz.music;
  if (mute && M.musicBus) { M.master.gain.value = 0; }
  const held = new Set();
  for (const c of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'Space', 'ArrowDown', 'KeyX', 'KeyC']) dispatchEvent(new KeyboardEvent('keyup', { code: c }));
  const set = (code, on) => {
    if (on && !held.has(code)) { held.add(code); dispatchEvent(new KeyboardEvent('keydown', { code })); }
    else if (!on && held.has(code)) { held.delete(code); dispatchEvent(new KeyboardEvent('keyup', { code })); }
  };
  const g = () => rnrz.game;
  const isGround = (s) => s.y2 === 0 && s.y1 === -12;
  const groundAt = (x) => g().level.solids.some((s) => isGround(s) && x > s.x1 && x < s.x2);
  const nextGroundStart = (x) => Math.min(...g().level.solids.filter((s) => isGround(s) && s.x1 > x).map((s) => s.x1));
  const section = (x) => { const z = g().L.zones; let n = z[0].name; for (const zz of z) if (x >= zz.x) n = zz.name; return x > g().L.arena.gate ? 'Boss' : n; };
  const bot = window.bot = { hits: [], deaths: [], extraLives: 0, frame: 0, jumpHold: 0, lastFire: 0, section };

  const wrap = () => {
    const G = g();
    if (G.__botWrapped) return;
    G.__botWrapped = true;
    const hurt = G.hurt.bind(G), kill = G.kill.bind(G);
    G.hurt = (p, fx) => {
      if (p.id === 0 && !p.dead && p.inv <= 0) {
        bot.hits.push({
          x: +p.x.toFixed(1), where: section(p.x), armor: p.armor,
          near: G.enemies.filter((e) => Math.abs(e.x - p.x) < 2.5).map((e) => e.kind + '/' + e.state).join(','),
          shots: G.foeShots.filter((f) => Math.abs(f.x - p.x) < 2.5).map((f) => f.kind).join(','),
        });
      }
      hurt(p, fx);
    };
    G.kill = (p) => { if (p.id === 0 && !p.dead) bot.deaths.push({ x: +p.x.toFixed(1), where: section(p.x), fell: p.y < -3 }); kill(p); };
  };

  bot.think = () => {
    const G = g(); wrap();
    const p = G.players[0];
    let jump = false, down = false, fire = false, solo = false, move = 1, beatOnly = false;
    if (p.dead || p.out) { ['ArrowRight', 'ArrowLeft', 'Space', 'ArrowDown', 'KeyX', 'KeyC'].forEach((k) => set(k, false)); return; }
    if (G.run.lives <= 1) { G.run.lives += 2; bot.extraLives += 2; }   // keep going so we see the whole level
    const live = G.enemies.filter((e) => !e.dead);
    const range = G.lock ? 40 : 9;   // in an ambush/boss fight, go find whoever is left
    const targets = live.filter((e) => e.hittable() && Math.abs(e.x - p.x) < range && !(e.kind === 'hand' && e.state !== 'up'));
    targets.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    const t = targets[0];
    const boss = live.find((e) => e.boss);
    const dummy = G.dummies && G.soundcheck && G.soundcheck.left > 0 && G.dummies.find((d) => !d.down);

    if (dummy) {
      const dx = dummy.x - p.x;
      move = Math.abs(dx) > 4 ? Math.sign(dx) : 0;
      if (p.face !== Math.sign(dx)) move = Math.sign(dx);
      fire = true; beatOnly = true;
    } else if (t) {
      const dx = t.x - p.x, dist = Math.abs(dx), dir = Math.sign(dx) || 1;
      const b = t.box();
      if ((t.kind === 'crawler' || t.kind === 'rat') && dist < 7) {
        move = 0; down = true; fire = true;
        if (p.face !== dir) { move = dir; down = false; }
      } else {
        if (p.face !== dir) move = dir;
        else if (dist < 2.6 && t.harmful()) move = -dir;
        else if (dist > 5.5) move = dir; else move = 0;
        if (b.y1 > p.y + 1.75 && dist < 8.5 && groundAt(p.x + 1.2) && groundAt(p.x - 1.2)) jump = true;   // not at a pit edge
        fire = true;
      }
    }
    for (const e of live) if (e.kind === 'hand' && (e.state === 'warn' || e.state === 'up') && Math.abs(e.x - p.x) < 1.2) move = p.x < e.x ? -1 : 1;
    for (const f of G.foeShots) {
      if (f.kind === 'rubble' && Math.abs(f.x - p.x) < 1.2) move = p.x < f.x ? -1 : 1;
      else if (f.kind !== 'wave' && f.vy < 0 && Math.abs(f.x - p.x) < 1.8 && f.y > p.y) move = p.x < f.x ? -1 : 1;
      if (f.kind === 'wave' && Math.sign(f.vx) === Math.sign(p.x - f.x) && Math.abs(f.x - p.x) < 2.4) jump = true;
      if (f.kind === 'scream' && (Math.sign(f.vx) === Math.sign(p.x - f.x) || Math.abs(f.x - p.x) < 0.8) && Math.abs(f.x - p.x) < 2.6) {
        if (f.band === 'high') { down = true; move = 0; } else jump = true;
      }
    }
    if (boss && boss.kind === 'bouncer') {
      if (boss.state === 'windup' || boss.state === 'charge') {
        const lx = [205, 217].sort((a, c) => Math.abs(a - p.x) - Math.abs(c - p.x))[0];
        if (p.y < 2) { move = Math.abs(lx - p.x) > 0.6 ? Math.sign(lx - p.x) : 0; if (Math.abs(lx - p.x) < 1.6) jump = true; }
        else move = 0;
      }
      if (boss.state === 'walk' && Math.abs(boss.x - p.x) < 3 && p.y < 1) { move = p.x < boss.x ? -1 : 1; if (p.x < 201.5 || p.x > 220.5) jump = true; }
    }
    if (boss && boss.kind === 'banshee' && boss.state === 'float' && Math.abs(boss.x - p.x) < 2.2) move = p.x < boss.x ? -1 : 1;
    if (boss && boss.kind === 'gargoyle') {
      if (boss.state === 'screech' || boss.state === 'dive') {
        // run away from where it will land
        const away = boss.to ? Math.sign(p.x - boss.to.x) || 1 : Math.sign(p.x - 211) || 1;
        move = away;
      } else if (boss.state === 'ground' && Math.abs(boss.x - p.x) < 2.2) move = p.x < boss.x ? -1 : 1;
    }

    if (boss && boss.kind === 'mummy') {
      const d = boss.x - p.x;
      if (boss.state === 'slide' && Math.sign(boss.vx) === -Math.sign(d) && Math.abs(d) < 3.6 && p.y < 1) jump = true;
      if (boss.state === 'windup' && Math.abs(d) < 3) move = -Math.sign(d) || 1;
    }
    for (const f of G.foeShots) {
      if (f.kind === 'beam' && f.wait > 0 && Math.abs(f.x - p.x) < 1.3) move = p.x < f.x ? -1 : 1;
      // hearses: jump so we're at the top as it passes
      if (f.kind === 'hearse' && p.y < 1.15 && f.x - p.x > 2.2 && f.x - p.x < 5.6 && p.onGround) jump = true;
    }
    // fire vents: wait for the burst to finish, then go
    for (const vx of G.L.vents || []) {
      const ph = ((M.beatFloat() % 4) + 4) % 4, danger = ph > 1.1 && ph < 3.5;
      if (danger && Math.abs(vx - p.x) < 1.1 && p.y < 3) { move = p.x < vx ? -1 : 1; continue; }
      const ahead = (vx - p.x) * move;
      if (move !== 0 && p.onGround && ahead > 0.9 && ahead < 1.9 && !(ph > 3.45 || ph < 0.5)) move = 0;
    }
    // jump over campfires
    for (const fx of G.level.campfires || []) if (p.onGround && move !== 0 && (fx - p.x) * move > 0.4 && Math.abs(fx - p.x) < 1.6) { jump = true; bot.jumpHold = 30; bot.jumpDir = move; }
    if (move > 0 && p.onGround && !(p.standing && p.standing.mover)) {
      if (!groundAt(p.x + 0.45) && p.y < 0.5 && groundAt(p.x - 0.3)) {
        const end = nextGroundStart(p.x);
        const slider = G.level.ledges.find((l) => l.mover && Math.abs(l.dx) > 0.001 && l.x1 < end && l.x2 > p.x);
        if (end - p.x <= 4.9) jump = true;
        else if (slider) { if (slider.x1 - (p.x + 0.3) > 0.4) move = 0; }
        else {
          const ok = G.level.ledges.find((l) => l.mover && l.x2 > p.x && l.x1 < end && l.y <= p.y + 1.6 && l.x1 - (p.x + 0.3) < 2.6);
          if (ok) jump = true; else move = 0;
        }
      }
      if (p.hitWall) jump = true;
    }
    if (move < 0 && p.onGround && !groundAt(p.x - 0.7) && p.y < 0.5) move = 0;
    if (move !== 0 && p.hitWall && p.onGround) { jump = true; bot.jumpDir = move; bot.jumpHold = 30; }
    if (p.standing && p.standing.mover) {
      const L = p.standing, end = nextGroundStart(p.x);
      move = 0;
      if (Math.abs(L.dx) > 0.001) { if (end - L.x2 < 0.4) move = 1; }
      else if (end - p.x <= 3.6) { jump = true; move = 1; }
    }
    // crew barricades: climb the ladder up the near side, then carry on over the top
    let up = false;
    const bar = (G.level.barricades || []).find((b) => !b.broken && b.solid.x1 - p.x < 1.2 && b.solid.x1 - p.x > -0.1 && p.y < b.solid.y2 - 0.1);
    const lad = G.level.ladders.find((l) => Math.abs(l.x - p.x) < 0.6 && p.y < l.y2 - 0.05);
    if (p.climb || (bar && lad)) { up = true; jump = false; move = p.climb ? 0 : move; }
    set('ArrowUp', up);
    if (!p.onGround && bot.jumpHold > 0) move = bot.jumpDir || 1;
    if (jump && p.onGround && move > 0) { bot.jumpHold = 40; bot.jumpDir = 1; }
    bot.jumpHold--;

    bot.frame++;
    const beat = M.onBeat(0.05);
    if (fire && (beat || (!beatOnly && bot.frame - bot.lastFire > 30))) { set('KeyX', true); bot.lastFire = bot.frame; } else set('KeyX', false);
    if (p.solo >= 100 && (live.filter((e) => Math.abs(e.x - p.x) < 8 && e.kind !== 'bird').length >= 3 || (boss && boss.hittable() && boss.y < 3))) solo = true;
    set('ArrowRight', move > 0); set('ArrowLeft', move < 0);
    set('Space', jump || (!p.onGround && p.vy > 0 && held.has('Space')));
    if (down) { set('ArrowRight', false); set('ArrowLeft', false); }
    set('ArrowDown', down); set('KeyC', solo);
  };

  window.botRun = async (secs) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const end = performance.now() + secs * 1000;
    let last = performance.now(), owed = 0;
    while (performance.now() < end) {
      await sleep(16);
      if (!document.getElementById('over').hidden) break;
      // keep game time in step with the music clock even when the page is throttled
      const now = performance.now();
      owed = Math.min(owed + (now - last) / 1000, 0.1); last = now;
      while (owed >= 1 / 60) { bot.think(); rnrz.tick(1 / 60); owed -= 1 / 60; }
    }
    const G = g(), p = G.players[0];
    return {
      level: G.L.id + 1, x: +p.x.toFixed(1), where: section(p.x), time: +G.stats.time.toFixed(0), score: G.run.score, lives: G.run.lives,
      extraLives: bot.extraLives, hits: bot.hits.length, deaths: bot.deaths.length, ambush: G.ambush.state,
      boss: G.boss ? G.boss.state + ' hp' + G.boss.hp : (G.bossDone ? 'beaten' : '-'),
      over: !document.getElementById('over').hidden,
    };
  };
  return 'bot ready';
}
