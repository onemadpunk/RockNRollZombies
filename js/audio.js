// Music + sound effects, all synthesised with Web Audio (no audio files).
// The music doubles as the game clock: enemies and on-beat bonuses read beat timing from here.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Songs ------------------------------------------------------------------
// Each bar: [root for first half, root for second half] (MIDI), guitar style, lead (8 eighth notes).
// Styles: chug (palm-muted 8ths), open (ringing quarter strums), gallop (x.xx 16ths),
//         drive (16th chug), half (big half-note chords).
const _ = null;
const SONGS = {
  main: [
    // verse
    { r: [40, 40], s: 'chug', l: [64, _, 67, 64, 69, _, 67, 64] },
    { r: [40, 43], s: 'chug', l: [71, _, 69, 67, 64, _, 62, 64] },
    { r: [45, 45], s: 'chug', l: [69, _, 72, 69, 67, _, 64, 67] },
    { r: [48, 47], s: 'chug', l: [72, 71, 69, 67, 66, _, 64, _] },
    // chorus
    { r: [43, 43], s: 'open', l: [67, _, 71, 74, 74, 72, 71, _] },
    { r: [38, 38], s: 'open', l: [66, _, 69, 74, 74, 72, 69, _] },
    { r: [45, 45], s: 'open', l: [69, _, 72, 76, 76, 74, 72, 71] },
    { r: [40, 40], s: 'open', l: [71, _, 67, 64, 64, _, _, _] },
  ],
  storm: [
    { r: [45, 45], s: 'gallop', l: [69, _, 72, _, 76, 74, 72, _] },
    { r: [45, 41], s: 'gallop', l: [69, _, 72, 74, 77, 76, 74, 72] },
    { r: [43, 43], s: 'gallop', l: [67, _, 71, 74, 79, 77, 74, 71] },
    { r: [40, 40], s: 'chug', l: [76, 75, 76, _, 71, _, 68, _] },
  ],
  pit: [
    { r: [40, 40], s: 'drive', l: [76, 79, 76, 74, 76, _, 71, 74] },
    { r: [40, 40], s: 'drive', l: [76, 79, 81, 79, 76, _, 74, 71] },
    { r: [40, 41], s: 'drive', l: [77, 76, 74, 77, 76, 74, 72, 71] },
    { r: [40, 43], s: 'drive', l: [79, _, 76, _, 74, _, 71, _] },
  ],
  // ---- Level 2 ----
  alley: [
    { r: [45, 45], s: 'boogie', l: [69, _, 72, 74, 75, 74, 72, _] },
    { r: [45, 45], s: 'boogie', l: [69, _, 72, _, 76, _, 79, 76] },
    { r: [50, 50], s: 'boogie', l: [74, _, 77, 79, 80, 79, 77, _] },
    { r: [45, 45], s: 'boogie', l: [76, 74, 72, _, 69, _, _, _] },
    { r: [52, 52], s: 'boogie', l: [76, _, 79, _, 81, 79, 76, _] },
    { r: [50, 50], s: 'boogie', l: [74, _, 77, _, 79, 77, 74, _] },
    { r: [45, 45], s: 'boogie', l: [72, 74, 72, 69, 67, _, 69, _] },
    { r: [52, 52], s: 'chug', l: [76, _, 75, _, 74, _, 72, _] },
  ],
  bar: [
    { r: [40, 40], s: 'boogie', l: [64, _, 67, 69, 70, 69, 67, _] },
    { r: [40, 40], s: 'boogie', l: [71, _, 69, 67, 64, _, _, _] },
    { r: [45, 45], s: 'boogie', l: [69, _, 72, 74, 75, 74, 72, _] },
    { r: [47, 45], s: 'boogie', l: [71, 74, 71, 69, 67, _, 64, _] },
  ],
  roof: [
    { r: [50, 50], s: 'drive', l: [74, _, 77, 74, 79, _, 77, 74] },
    { r: [48, 48], s: 'drive', l: [72, _, 76, 72, 79, _, 76, 72] },
    { r: [45, 45], s: 'drive', l: [69, _, 72, 76, 81, 79, 76, 72] },
    { r: [47, 47], s: 'chug', l: [74, 76, 78, _, 79, _, 81, _] },
  ],
  brawl: [
    { r: [45, 45], s: 'drive', l: [81, 79, 76, 79, 81, _, 76, 79] },
    { r: [45, 45], s: 'drive', l: [84, 81, 79, 81, 84, _, 79, 81] },
    { r: [48, 48], s: 'drive', l: [84, _, 81, _, 79, _, 76, _] },
    { r: [50, 52], s: 'drive', l: [86, _, 84, _, 88, _, 86, _] },
  ],
  boss2: [
    { r: [50, 50], s: 'half', l: [74, 75, 74, _, 74, 75, 77, _] },
    { r: [51, 51], s: 'half', l: [75, 74, 75, _, 75, 77, 78, _] },
    { r: [50, 50], s: 'chug', l: [74, _, 81, 80, 79, _, 77, 75] },
    { r: [53, 52], s: 'chug', l: [80, 79, 78, 77, 76, 75, 74, _] },
  ],
  // ---- Level 3 ----
  festival: [
    { r: [43, 43], s: 'skank', l: [67, _, 71, 74, 72, 71, 69, _] },
    { r: [48, 48], s: 'skank', l: [72, _, 76, 79, 76, 74, 72, _] },
    { r: [43, 43], s: 'skank', l: [71, 69, 67, _, 74, _, 71, _] },
    { r: [50, 50], s: 'skank', l: [74, _, 72, 71, 69, _, 67, _] },
    { r: [52, 52], s: 'skank', l: [76, _, 79, 76, 74, _, 72, _] },
    { r: [48, 48], s: 'skank', l: [72, 74, 76, _, 79, _, 76, _] },
    { r: [43, 43], s: 'skank', l: [74, _, 71, _, 67, _, 71, _] },
    { r: [50, 50], s: 'chug', l: [74, 72, 71, 69, 67, _, _, _] },
  ],
  funfair: [
    { r: [50, 50], s: 'boogie', l: [74, _, 77, _, 81, 80, 81, _] },
    { r: [46, 46], s: 'boogie', l: [70, _, 74, _, 77, 76, 77, _] },
    { r: [45, 45], s: 'boogie', l: [76, _, 73, _, 69, _, 73, 76] },
    { r: [50, 49], s: 'chug', l: [74, 73, 74, _, 77, _, 74, _] },
  ],
  surge: [
    { r: [40, 40], s: 'drive', l: [76, 79, 81, 79, 76, _, 74, 76] },
    { r: [43, 43], s: 'drive', l: [79, 81, 83, 81, 79, _, 76, 79] },
    { r: [45, 45], s: 'drive', l: [81, _, 79, _, 76, _, 74, _] },
    { r: [47, 47], s: 'drive', l: [83, _, 81, _, 79, 78, 76, _] },
  ],
  boss3: [
    { r: [49, 49], s: 'half', l: [73, 76, 80, _, 81, 80, 76, _] },
    { r: [45, 45], s: 'half', l: [76, 81, 85, _, 84, 81, 76, _] },
    { r: [42, 42], s: 'chug', l: [78, _, 81, 78, 76, _, 73, _] },
    { r: [44, 44], s: 'chug', l: [80, 78, 76, 75, 73, _, 68, _] },
  ],
  // ---- Level 4 ----
  highway: [
    { r: [45, 45], s: 'chug', l: [69, _, _, 72, _, 69, 74, _] },
    { r: [43, 50], s: 'chug', l: [67, _, 71, _, 74, _, 72, 71] },
    { r: [45, 45], s: 'chug', l: [69, _, _, 72, _, 69, 74, 76] },
    { r: [43, 50], s: 'open', l: [79, _, 76, _, 74, _, 72, _] },
    { r: [50, 50], s: 'drive', l: [74, _, 77, 74, 79, _, 77, 74] },
    { r: [43, 43], s: 'drive', l: [71, _, 74, 71, 79, _, 74, 71] },
    { r: [45, 45], s: 'open', l: [76, _, 74, _, 72, _, 69, _] },
    { r: [52, 52], s: 'chug', l: [76, 74, 72, 71, 69, _, _, _] },
  ],
  route: [
    { r: [45, 45], s: 'drive', l: [81, _, 79, 76, 74, 76, 79, _] },
    { r: [48, 50], s: 'drive', l: [84, _, 81, 79, 81, _, 86, _] },
    { r: [45, 45], s: 'drive', l: [81, 84, 86, 84, 81, _, 79, 76] },
    { r: [43, 43], s: 'gallop', l: [79, _, 83, _, 86, _, 83, 79] },
  ],
  roadblock: [
    { r: [40, 40], s: 'gallop', l: [76, _, 79, 81, 82, 81, 79, _] },
    { r: [40, 40], s: 'gallop', l: [76, _, 79, 81, 84, 82, 81, 79] },
    { r: [43, 43], s: 'drive', l: [79, _, 82, _, 84, _, 86, _] },
    { r: [45, 46], s: 'drive', l: [88, 86, 84, 82, 81, 79, 76, _] },
  ],
  boss4: [
    { r: [45, 45], s: 'disco', l: [69, _, 72, 76, 79, _, 76, _] },
    { r: [50, 50], s: 'disco', l: [74, _, 77, 81, 84, _, 81, _] },
    { r: [43, 43], s: 'disco', l: [79, _, 83, 79, 76, _, 74, _] },
    { r: [52, 52], s: 'disco', l: [76, 77, 79, 80, 81, _, 80, _] },
  ],
  // ---- Level 5 ----
  hellgate: [
    { r: [40, 40], s: 'gallop', l: [64, _, 65, _, 67, 65, 64, _] },
    { r: [40, 41], s: 'gallop', l: [64, _, 67, _, 70, 69, 67, 65] },
    { r: [40, 40], s: 'gallop', l: [76, _, 77, _, 79, 77, 76, _] },
    { r: [43, 41], s: 'chug', l: [79, 77, 76, 74, 72, 71, 69, 65] },
    { r: [45, 45], s: 'drive', l: [69, _, 72, 76, 77, _, 76, 72] },
    { r: [43, 43], s: 'drive', l: [67, _, 71, 74, 76, _, 74, 71] },
    { r: [41, 41], s: 'drive', l: [65, _, 69, 72, 74, _, 72, 69] },
    { r: [40, 40], s: 'half', l: [64, _, _, 65, 64, _, _, _] },
  ],
  stadium: [
    { r: [40, 40], s: 'open', l: [71, _, 74, _, 76, _, 79, 76] },
    { r: [43, 43], s: 'open', l: [74, _, 79, _, 81, _, 79, 74] },
    { r: [45, 45], s: 'open', l: [76, _, 81, _, 83, 81, 79, 76] },
    { r: [47, 47], s: 'chug', l: [78, _, 79, _, 81, _, 83, _] },
    { r: [40, 40], s: 'drive', l: [83, _, 81, 79, 76, _, 79, _] },
    { r: [48, 48], s: 'drive', l: [84, _, 83, 81, 79, _, 76, _] },
    { r: [43, 45], s: 'drive', l: [79, 81, 83, 81, 79, 76, 74, _] },
    { r: [47, 47], s: 'open', l: [78, _, 75, _, 71, _, _, _] },
  ],
  encore5: [
    { r: [40, 40], s: 'drive', l: [76, 77, 79, 77, 76, _, 74, 76] },
    { r: [41, 41], s: 'drive', l: [77, 79, 81, 79, 77, _, 76, 77] },
    { r: [40, 40], s: 'gallop', l: [88, _, 86, _, 84, 83, 81, _] },
    { r: [46, 47], s: 'drive', l: [82, 81, 79, 77, 76, 74, 72, 71] },
  ],
  devil: [
    { r: [40, 40], s: 'half', l: [64, 65, 70, _, 64, 65, 71, _] },
    { r: [41, 41], s: 'gallop', l: [77, _, 76, _, 74, 76, 77, _] },
    { r: [40, 40], s: 'half', l: [76, 77, 82, _, 76, 77, 83, _] },
    { r: [46, 47], s: 'drive', l: [82, 81, 80, 79, 77, 76, 74, 70] },
  ],
  boss: [
    { r: [40, 40], s: 'half', l: [64, 65, 64, _, 64, 65, 67, _] },
    { r: [41, 41], s: 'half', l: [65, 64, 65, _, 65, 67, 68, _] },
    { r: [40, 40], s: 'chug', l: [64, _, 71, 70, 69, _, 67, 65] },
    { r: [46, 45], s: 'chug', l: [70, 69, 68, 67, 66, 65, 64, _] },
  ],
};

const POWER = [[1, -6], [1.4983, 5], [2, 3], [1, 9]];
const BOOGIE5 = [[1, -6], [1.4983, 5], [1, 8]];
const BOOGIE6 = [[1, -6], [1.6818, 5], [1, 8]];

export class Music {
  constructor() {
    this.bpm = 160;
    this.spb = 60 / this.bpm;
    this.ctx = null;
    this.layerOn = { guitar: true, bass: true, beat: false, lead: false };
    this.song = 'main';
    this.nextSong = 'main';
  }

  start() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.lat = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp).connect(ctx.destination);

    const mk = (v, dest = this.master) => { const g = ctx.createGain(); g.gain.value = v; g.connect(dest); return g; };
    // Player volume settings sit after everything else, so the game's own ducking still works
    this.userMusic = mk(this.vol ? this.vol.music : 1);
    this.musicBus = mk(1, this.userMusic);
    const mb = this.musicBus;
    this.layers = { guitar: mk(0.2, mb), bass: mk(0.5, mb), beat: mk(0, mb), lead: mk(0, mb) };
    this.drums = mk(0.9, mb);
    this.sfx = mk(0.7 * (this.vol ? this.vol.sfx : 1));

    // Guitar amp: drive -> shaper -> cab
    this.gIn = ctx.createGain(); this.gIn.gain.value = 7;
    const shaper = ctx.createWaveShaper();
    const n = 2048, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * 3); }
    shaper.curve = curve; shaper.oversample = '2x';
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 4200; cab.Q.value = 0.8;
    const scoop = ctx.createBiquadFilter(); scoop.type = 'peaking'; scoop.frequency.value = 700; scoop.gain.value = -5;
    this.gIn.connect(shaper).connect(hp).connect(scoop).connect(cab).connect(this.layers.guitar);

    // Lead synth with echo; the solo bus bypasses the layer gate.
    const leadChain = (dest) => {
      const inp = ctx.createGain();
      const delay = ctx.createDelay(1); delay.delayTime.value = this.spb * 0.75;
      const fb = ctx.createGain(); fb.gain.value = 0.32;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800;
      inp.connect(lp); lp.connect(dest);
      lp.connect(delay); delay.connect(fb).connect(delay); delay.connect(dest);
      return inp;
    };
    this.leadIn = leadChain(this.layers.lead);
    this.soloIn = leadChain(mk(0.16));

    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;

    this.t0 = ctx.currentTime + 0.15;
    this.nextStep = this.t0;
    this.step = 0;      // global 16th counter (keeps the beat grid)
    this.songStep = 0;  // position inside the current song
  }

  // ---- Clock -------------------------------------------------------------
  now() { return this.ctx ? this.ctx.currentTime - this.lat : 0; }
  beatFloat() { return this.ctx ? (this.now() - this.t0) / this.spb : 0; }
  /** Signed seconds to the nearest beat (negative = early). */
  beatOffset() { const b = this.beatFloat(); return (b - Math.round(b)) * this.spb; }
  onBeat(window = 0.11) { return Math.abs(this.beatOffset()) <= window; }
  currentRoot() { return this.lastRoot || 40; }

  setSong(name) { if (SONGS[name]) this.nextSong = name; }

  setLayer(name, on) {
    if (!this.ctx || this.layerOn[name] === on) return;
    this.layerOn[name] = on;
    const target = { guitar: 0.2, bass: 0.5, beat: 0.75, lead: 0.11 }[name];
    const g = this.layers[name].gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(on ? target : 0, t + 0.4);
  }

  suspend() { this.ctx && this.ctx.suspend(); }
  resume() { this.ctx && this.ctx.resume(); }

  update() {
    if (!this.ctx) return;
    const ahead = this.ctx.currentTime + 0.15;
    while (this.nextStep < ahead) {
      this.schedule(this.nextStep);
      this.nextStep += this.spb / 4;
      this.step++;
    }
  }

  schedule(t) {
    const pos = this.step % 16;
    // Change songs only on a bar line, so the beat never stumbles.
    if (pos === 0 && this.nextSong !== this.song) {
      this.song = this.nextSong; this.songStep = 0;
      this.crash(t, this.drums, 0.5);
    }
    const song = SONGS[this.song];
    const barIdx = Math.floor(this.songStep / 16) % song.length;
    const bar = song[barIdx];
    const phraseEnd = barIdx % 4 === 3;
    this.songStep++;

    // Zombie stomp: four on the floor, always on, so the beat is readable.
    if (pos % 4 === 0) this.kick(t, this.drums, pos === 0 ? 1 : 0.8);
    // Full kit layer
    const D = this.layers.beat;
    if (pos === 0 && barIdx % 4 === 0) this.crash(t, D, 0.6);
    if (bar.s === 'disco') {
      // four on the floor, open hats on the off-beats
      if (pos === 4 || pos === 12) this.snare(t, D, 0.8);
      if (pos % 4 === 2) this.hat(t, D, 0.6);
    } else if (bar.s === 'half') {
      if (pos === 8) this.snare(t, D);
      if (pos % 4 === 0) this.hat(t, D, 0.45);
    } else if (phraseEnd && pos >= 12) {
      // drum fill: rolling toms into the next phrase
      this.tom(t, D, [210, 170, 140, 110][pos - 12]);
      if (pos % 2 === 0) this.snare(t, D, 0.6);
    } else {
      if (pos === 10 || (bar.s === 'drive' && pos === 6)) this.kick(t, D, 0.7);
      if (pos === 4 || pos === 12) this.snare(t, D);
      if (pos % 2 === 0) this.hat(t, D, pos % 4 === 0 ? 0.5 : 0.3);
    }

    // Guitar + bass
    const root = bar.r[pos < 8 ? 0 : 1];
    this.lastRoot = root;
    const f = mtof(root);
    const G = this.gIn;
    switch (bar.s) {
      case 'chug':
        if (pos % 2 === 0) { const open = pos === 0 || pos === 8; this.chord(t, f, open, open ? 0.9 : 0.6, G); }
        break;
      case 'open':
        if (pos % 4 === 0) this.chord(t, f, true, 0.85, G, 0.6);
        break;
      case 'gallop':
        if (pos % 4 !== 1) this.chord(t, f, pos % 4 === 0, pos % 4 === 0 ? 0.85 : 0.55, G);
        break;
      case 'drive':
        this.chord(t, f, pos % 8 === 0, pos % 8 === 0 ? 0.9 : 0.5, G, 0.09);
        break;
      case 'half':
        if (pos === 0 || pos === 8) this.chord(t, f, true, 1, G, 1.0);
        break;
      case 'skank':
        // ska: short bright stabs on the off-beats
        if (pos % 4 === 2) this.chord(t, f * 2, true, 0.7, G, 0.09);
        break;
      case 'disco':
        // chicken-scratch 16ths, accented on the off-beats
        this.chord(t, f * 2, pos % 4 === 2, pos % 4 === 2 ? 0.6 : 0.25, G, 0.05);
        break;
      case 'boogie':
        // Chuck Berry boogie: root+5th, root+6th, alternating on the 8ths
        if (pos % 2 === 0) this.chord(t, f, pos % 4 === 0, pos % 4 === 0 ? 0.85 : 0.6, G, 0.16, pos % 4 === 0 ? BOOGIE5 : BOOGIE6);
        break;
    }
    if (bar.s === 'disco') {
      // octave-jumping disco bass
      if (pos % 2 === 0) this.bass(t, mtof(root - 12) * (pos % 4 === 2 ? 2 : 1));
    } else if (bar.s === 'skank') {
      if (pos % 4 === 0) this.bass(t, mtof(root - 12) * [1, 1.4983, 1.3348, 1.4983][pos / 4]);
    } else if (bar.s === 'boogie') {
      // walking bass: root, 3rd, 5th, 6th on the quarters
      if (pos % 4 === 0) this.bass(t, mtof(root - 12) * [1, 1.2599, 1.4983, 1.6818][pos / 4]);
    } else if (pos % 2 === 0 || bar.s === 'drive') this.bass(t, mtof(root - 12));
    if (pos % 2 === 0) {
      const lead = bar.l[pos / 2];
      if (lead) this.lead(t, mtof(lead), this.spb / 2 * 0.95, this.leadIn);
    }
  }

  // ---- Instruments ---------------------------------------------------------
  chord(t, f, open, vel, dest, lenOverride, voicing = POWER) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const pre = ctx.createBiquadFilter(); pre.type = 'lowpass'; pre.frequency.value = open ? 3800 : 900;
    g.connect(pre).connect(dest);
    const len = lenOverride || (open ? 0.45 : 0.12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel * 0.3, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    for (const [mul, det] of voicing) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = f * mul; o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + len + 0.05);
    }
  }

  bass(t, f) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(lp).connect(g).connect(this.layers.bass);
    o.start(t); o.stop(t + 0.18);
  }

  lead(t, f, len, dest) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const vib = ctx.createOscillator(); vib.frequency.value = 6;
    const vg = ctx.createGain(); vg.gain.value = f * 0.008;
    vib.connect(vg).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.01);
    g.gain.setValueAtTime(0.5, t + len * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(dest);
    o.start(t); vib.start(t); o.stop(t + len + 0.02); vib.stop(t + len + 0.02);
  }

  kick(t, dest, vel = 1) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + 0.36);
  }

  noise(t, len, type, freq, q, vol, dest, freqEnd) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + len + 0.01);
  }

  snare(t, dest, vol = 0.9) {
    this.noise(t, 0.16, 'bandpass', 1900, 0.7, vol, dest);
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.12);
  }
  tom(t, dest, f) {
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.2);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.26);
  }
  hat(t, dest, vol) { this.noise(t, 0.04, 'highpass', 7500, 0.5, vol, dest); }
  crash(t, dest, vol) { this.noise(t, 1.4, 'highpass', 4500, 0.4, vol, dest); }

  tone(type, f0, f1, len, vol, delay = 0) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(this.sfx);
    o.start(t); o.stop(t + len + 0.02);
  }

  // ---- Sound effects ------------------------------------------------------
  get t() { return this.ctx.currentTime; }
  sThrow() { this.ctx && this.noise(this.t, 0.12, 'bandpass', 2400, 2, 0.35, this.sfx, 700); }
  sPower() { this.ctx && this.chord(this.t, mtof(this.currentRoot() + 12), true, 1, this.gIn); }
  sHit() {
    if (!this.ctx) return;
    this.noise(this.t, 0.14, 'lowpass', 900, 1, 0.8, this.sfx);
    this.tone('sine', 120, 50, 0.12, 0.5);
  }
  sGroan() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const base = 75 + Math.random() * 30;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 0.75, t + 0.9);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7;
    const lg = ctx.createGain(); lg.gain.value = 8;
    lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(f).connect(g).connect(this.sfx);
    o.start(t); lfo.start(t); o.stop(t + 0.95); lfo.stop(t + 0.95);
  }
  sGhost() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(820, t + 0.6); o.frequency.linearRampToValueAtTime(600, t + 1.1);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5;
    const lg = ctx.createGain(); lg.gain.value = 18; lfo.connect(lg).connect(o.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.2); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    o.connect(g).connect(this.sfx); o.start(t); lfo.start(t); o.stop(t + 1.15); lfo.stop(t + 1.15);
  }
  sCaw() {
    if (!this.ctx) return;
    for (const d of [0, 0.16]) this.noise(this.t + d, 0.13, 'bandpass', 1100, 6, 0.5, this.sfx, 700);
  }
  sJump() { this.ctx && this.tone('triangle', 260, 520, 0.09, 0.15); }
  sLand() { this.ctx && this.noise(this.t, 0.06, 'lowpass', 500, 1, 0.25, this.sfx); }
  sHurt() { this.ctx && this.tone('square', 420, 110, 0.4, 0.22); }
  sDie() { if (this.ctx) for (const m of [52, 55, 58]) this.tone('sawtooth', mtof(m), mtof(m - 14), 1.2, 0.12); }
  sPickup() { if (this.ctx) [64, 68, 71, 76].forEach((m, i) => this.tone('triangle', mtof(m), mtof(m), 0.12, 0.25, i * 0.06)); }
  sLife() { if (this.ctx) [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.tone('square', mtof(m), mtof(m), 0.1, 0.12, i * 0.05)); }
  sCrate() {
    if (!this.ctx) return;
    this.noise(this.t, 0.2, 'lowpass', 1400, 1, 0.7, this.sfx);
    this.tone('square', 1300, 1250, 0.08, 0.08);
  }
  sStomp() {
    if (!this.ctx) return;
    this.tone('sine', 90, 28, 0.5, 0.9);
    this.noise(this.t, 0.6, 'lowpass', 320, 1, 0.9, this.sfx);
  }
  sDirt() { this.ctx && this.noise(this.t, 0.25, 'lowpass', 700, 1, 0.5, this.sfx, 200); }
  sFire() { this.ctx && this.noise(this.t, 0.5, 'bandpass', 900, 0.6, 0.35, this.sfx, 300); }
  sThunder() {
    if (!this.ctx) return;
    const t = this.t;
    this.noise(t, 0.25, 'highpass', 2000, 0.5, 0.5, this.sfx);
    this.noise(t + 0.05, 2.8, 'lowpass', 260, 1, 1.2, this.sfx, 50);
  }
  sAmp() {
    if (!this.ctx) return;
    this.chord(this.t, mtof(this.currentRoot()), true, 1, this.gIn, 0.6);
    this.tone('square', 300, 1200, 0.3, 0.1);
  }
  sCheckpoint() { if (this.ctx) [60, 64, 67, 72, 76].forEach((m, i) => this.tone('square', mtof(m), mtof(m), 0.14, 0.12, i * 0.07)); }
  /** Shredding pentatonic run across two beats, starting on the next 16th. */
  sSolo() {
    if (!this.ctx) return;
    const sx = this.spb / 4;
    const t0 = this.t + 0.02;
    const run = [64, 67, 69, 71, 74, 76, 79, 81, 83, 86, 88, 86, 88, 91, 88, 93];
    run.forEach((m, i) => this.lead(t0 + i * sx * 0.5, mtof(m), sx * 0.55, this.soloIn));
    this.lead(t0 + run.length * sx * 0.5, mtof(88), this.spb * 1.5, this.soloIn);
    this.chord(t0, mtof(40), true, 1, this.gIn, 1.2);
    this.crash(t0, this.drums, 0.8);
  }
  sBottle() {
    if (!this.ctx) return;
    const t = this.t;
    this.noise(t, 0.25, 'highpass', 3000, 1, 0.6, this.sfx);
    [2400, 3100, 2700].forEach((f, i) => this.tone('sine', f, f * 0.9, 0.12, 0.08, i * 0.03));
  }
  sScream() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [f0, f1, v] of [[600, 1500, 0.12], [610, 1520, 0.1], [1200, 2900, 0.05]]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.5); o.frequency.exponentialRampToValueAtTime(f1 * 0.9, t + 1.2);
      const vib = ctx.createOscillator(); vib.frequency.value = 9; const vg = ctx.createGain(); vg.gain.value = 40; vib.connect(vg).connect(o.frequency);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 1.2;
      o.connect(bp).connect(g).connect(this.sfx); o.start(t); vib.start(t); o.stop(t + 1.25); vib.stop(t + 1.25);
    }
  }
  sHorn() { if (this.ctx) { this.tone('square', 311, 300, 0.5, 0.12); this.tone('square', 392, 380, 0.5, 0.12); this.tone('square', 311, 300, 0.3, 0.12, 0.55); this.tone('square', 392, 380, 0.3, 0.12, 0.55); } }
  sRumble() { this.ctx && this.noise(this.t, 0.5, 'lowpass', 220, 1, 0.6, this.sfx, 80); }
  sEngine() { if (this.ctx) { this.tone('sawtooth', 70, 140, 0.9, 0.18); this.noise(this.t, 0.9, 'lowpass', 600, 1, 0.4, this.sfx, 200); } }
  sDisco() { if (this.ctx) [81, 84, 88, 93].forEach((m, i) => this.tone('square', mtof(m), mtof(m) * 0.98, 0.12, 0.08, i * 0.06)); }
  sBoing() { if (this.ctx) { this.tone('sine', 180, 520, 0.25, 0.4); this.tone('triangle', 90, 260, 0.3, 0.2); } }
  sCreak() { this.ctx && this.noise(this.t, 0.35, 'bandpass', 700, 8, 0.4, this.sfx, 400); }
  sSqueak() { this.ctx && this.tone('square', 1800, 2600, 0.08, 0.05); }
  sScreech() {
    if (!this.ctx) return;
    const t = this.t;
    this.noise(t, 0.8, 'bandpass', 1600, 4, 0.7, this.sfx, 600);
    this.tone('sawtooth', 700, 300, 0.8, 0.15);
  }
  sFireball() { this.ctx && this.noise(this.t, 0.5, 'lowpass', 1200, 1, 0.5, this.sfx, 200); }
  sPlatinum() { if (this.ctx) [72, 76, 79, 84, 88].forEach((m, i) => this.tone('triangle', mtof(m), mtof(m), 0.2, 0.2, i * 0.07)); }
  sThwack() { if (this.ctx) { this.noise(this.t, 0.12, 'lowpass', 1800, 1, 0.7, this.sfx); this.tone('triangle', 300, 120, 0.15, 0.3); } }
  sTill() { if (this.ctx) { this.tone('triangle', 1760, 1760, 0.12, 0.2); this.tone('triangle', 2637, 2637, 0.25, 0.2, 0.08); } }
  sClear() {
    if (!this.ctx) return;
    const t = this.t;
    [40, 43, 45, 47, 52].forEach((m, i) => this.chord(t + i * 0.22, mtof(m), true, 1, this.gIn, i === 4 ? 1.6 : 0.3));
    this.crash(t + 0.88, this.drums, 0.9);
  }
  sOver() {
    if (!this.ctx) return;
    const t = this.t;
    [52, 51, 50, 40].forEach((m, i) => this.chord(t + i * 0.35, mtof(m), true, 0.9, this.gIn, i === 3 ? 1.8 : 0.4));
  }
  /** Fade everything except effects (for menus). */
  /** Player settings: music and sound effects, 0..1 each. Safe to call before the audio starts. */
  setVolumes(music, sfx) {
    this.vol = { music, sfx };
    if (!this.ctx) return;
    this.userMusic.gain.value = music;
    this.sfx.gain.value = 0.7 * sfx;
  }
  musicVolume(v) {
    if (!this.ctx) return;
    const g = this.musicBus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + 0.5);
  }
  sBossDie() {
    if (!this.ctx) return;
    const t = this.t;
    this.chord(t, mtof(40), true, 1, this.gIn);
    this.chord(t + 0.4, mtof(47), true, 1, this.gIn);
    this.chord(t + 0.8, mtof(52), true, 1, this.gIn, 1.5);
    this.noise(t, 1.5, 'lowpass', 600, 1, 1, this.sfx, 80);
  }
}
