/* ============================================================================
   audio.js -- every sound is synthesised (WebAudio), no files.
   SFX.play(name, opts) for effects; Music.play(song) for the looping tracks.
   The hit sounds lean on plastic: short clicks and clacks, because the
   fighters are action figures. The wall bounce is a hollow wooden KNOCK.
   ========================================================================== */
(function () {
  'use strict';
  let ctx = null, master, sfxBus, musBus, noiseBuf;
  const vol = U.read('kb.volume', { sfx: 0.8, music: 0.45 });

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = vol.music; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const unlock = () => { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));

  /* a pitched voice: type, f0 -> f1 over dur, gain envelope */
  function tone(f0, f1, dur, type, g, when, bus) {
    if (!ctx) return; const t = (when || ctx.currentTime);
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g || 0.2, t + 0.005);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  /* filtered noise */
  function noise(dur, g, freq, q, type, when, bus, f1) {
    if (!ctx) return; const t = (when || ctx.currentTime);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq || 2000, t); f.Q.value = q || 1;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const a = ctx.createGain(); a.gain.setValueAtTime(g || 0.3, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(a); a.connect(bus || sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  const S = {
    hit(o) { const p = (o && o.power) || 1; noise(0.06 + 0.03 * p, 0.35, 2600 - p * 500, 1.2); tone(900 - p * 180, 180, 0.05 + 0.03 * p, 'square', 0.12); tone(160, 60, 0.08 + 0.04 * p, 'sine', 0.3 * p); },
    slash() { noise(0.12, 0.18, 5000, 0.8, 'highpass', null, null, 1800); },
    whoosh() { noise(0.16, 0.12, 900, 0.7, 'bandpass', null, null, 2600); },
    heavy() { tone(110, 38, 0.28, 'sine', 0.55); noise(0.18, 0.4, 900, 0.8, 'lowpass'); tone(420, 90, 0.1, 'square', 0.12); },
    // the hollow wooden KNOCK of a wall bounce: two knocks a beat apart
    knock(o) { const n = (o && o.n) || 1, t = ctx && ctx.currentTime; if (!ctx) return;
      for (let i = 0; i < 2; i++) { const w = t + i * 0.085; tone(240 + n * 18, 120, 0.12, 'triangle', 0.5, w); noise(0.05, 0.35, 1400, 3, 'bandpass', w); tone(95, 55, 0.18, 'sine', 0.45, w); } },
    crack() { noise(0.2, 0.4, 3000, 0.5, 'highpass'); tone(300, 70, 0.15, 'sawtooth', 0.1); },
    wallbreak() { if (!ctx) return; const t = ctx.currentTime; tone(70, 25, 0.9, 'sine', 0.8); noise(0.9, 0.6, 1200, 0.4, 'lowpass', t, null, 200);
      for (let i = 0; i < 9; i++) { const w = t + 0.05 + Math.random() * 0.6; tone(U.rnd(300, 900), U.rnd(100, 300), 0.07, 'triangle', 0.18, w); } },
    guard() { tone(1400, 900, 0.07, 'square', 0.12); noise(0.06, 0.2, 4000, 2); },
    jguard() { tone(1800, 1800, 0.25, 'sine', 0.25); tone(2700, 2700, 0.2, 'sine', 0.12); },
    gbreak() { tone(600, 80, 0.4, 'sawtooth', 0.25); noise(0.3, 0.35, 2000, 0.6); },
    burst() { if (!ctx) return; tone(80, 600, 0.35, 'sawtooth', 0.25); noise(0.5, 0.5, 600, 0.5, 'bandpass', null, null, 5000); tone(60, 30, 0.6, 'sine', 0.6); },
    snap() { tone(2200, 300, 0.09, 'square', 0.18); noise(0.05, 0.3, 6000, 2); tone(1200, 1200, 0.12, 'sine', 0.12, ctx && ctx.currentTime + 0.05); },
    partbreak() { noise(0.12, 0.5, 2500, 2); tone(700, 1400, 0.08, 'square', 0.15); tone(200, 90, 0.2, 'triangle', 0.3); },
    snapon() { tone(500, 900, 0.06, 'square', 0.15); tone(1300, 1300, 0.08, 'sine', 0.12, ctx && ctx.currentTime + 0.06); },
    jump() { tone(300, 600, 0.09, 'square', 0.06); },
    land() { tone(140, 60, 0.07, 'sine', 0.2); noise(0.05, 0.15, 800, 1); },
    dodge() { noise(0.14, 0.15, 1500, 0.8, 'bandpass', null, null, 4000); },
    tech() { tone(900, 1800, 0.1, 'square', 0.12); tone(1800, 2400, 0.1, 'sine', 0.1, ctx && ctx.currentTime + 0.07); },
    shot() { noise(0.12, 0.55, 1800, 0.6); tone(220, 50, 0.15, 'square', 0.25); },
    boom() { tone(90, 30, 0.6, 'sine', 0.7); noise(0.6, 0.6, 900, 0.5, 'lowpass', null, null, 150); },
    superStart() { if (!ctx) return; const t = ctx.currentTime; [0, 4, 7, 12].forEach((s, i) => tone(330 * Math.pow(2, s / 12), null, 0.3, 'sawtooth', 0.12, t + i * 0.06)); noise(0.6, 0.3, 300, 0.6, 'bandpass', t, null, 6000); },
    ko() { if (!ctx) return; const t = ctx.currentTime; tone(1046, 1046, 1.2, 'triangle', 0.35, t); tone(523, 523, 1.4, 'sine', 0.35, t); noise(1, 0.3, 500, 0.3, 'lowpass', t); },
    bell() { tone(880, 880, 0.6, 'triangle', 0.3); tone(1760, 1760, 0.4, 'sine', 0.12); },
    tick() { tone(1200, 1200, 0.04, 'square', 0.08); },
    chord() { if (!ctx) return; const t = ctx.currentTime; [0, 4, 7, 12].forEach((s, i) => { tone(262 * Math.pow(2, s / 12), null, 0.5, 'triangle', 0.16, t + i * 0.018); tone(524 * Math.pow(2, s / 12), null, 0.25, 'square', 0.03, t + i * 0.018); }); },
    lullaby() { if (!ctx) return; const t = ctx.currentTime; [12, 7, 4, 0].forEach((s, i) => tone(660 * Math.pow(2, s / 12), null, 0.4, 'sine', 0.14, t + i * 0.11)); },
    ui() { tone(1100, 1100, 0.04, 'square', 0.07); },
    ok() { tone(700, 1400, 0.08, 'square', 0.1); },
    back() { tone(600, 300, 0.08, 'square', 0.08); },
    coin() { if (!ctx) return; const t = ctx.currentTime; tone(988, 988, 0.08, 'square', 0.12, t); tone(1319, 1319, 0.25, 'square', 0.12, t + 0.08); },
    crank() { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 6; i++) { tone(1500, 900, 0.03, 'square', 0.1, t + i * 0.09); noise(0.03, 0.15, 3000, 3, 'bandpass', t + i * 0.09); } },
    roll() { noise(0.5, 0.2, 400, 1, 'bandpass', null, null, 200); },
    pop() { tone(400, 1600, 0.1, 'sine', 0.3); noise(0.08, 0.3, 3500, 1); },
    reveal(o) { if (!ctx) return; const r = (o && o.r) || 0, t = ctx.currentTime;
      const notes = [[0, 7], [0, 4, 7], [0, 4, 7, 12], [0, 4, 7, 11, 14, 19]][r];
      notes.forEach((s, i) => tone(523 * Math.pow(2, s / 12), null, 0.35 + r * 0.1, r >= 2 ? 'sawtooth' : 'square', 0.1, t + i * 0.07));
      if (r >= 3) { noise(1.2, 0.25, 6000, 0.5, 'highpass', t); tone(1046, 1046, 1.5, 'sine', 0.15, t + 0.4); } },
  };

  const SFX = {
    play(name, o) { if (!ctx || !S[name] || vol.sfx <= 0) return; try { S[name](o); } catch (e) { /* ignore */ } },
    setVol(k, v) { vol[k] = v; U.write('kb.volume', vol); if (sfxBus) { sfxBus.gain.value = vol.sfx; musBus.gain.value = vol.music; } },
    get vol() { return vol; }, init, get ctx() { return ctx; },
  };

  /* --------------------------------------------------------------- music --
     A tiny step sequencer: 16 steps a bar, a chord root per bar, drums from
     strings ('x' hit, '.' rest), bass and an arpeggio built off the root. */
  const SONGS = {
    menu: { bpm: 96, roots: [57, 53, 60, 55], minor: [1, 0, 0, 0], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', arp: 'x.x.x.x.x.x.x.x.', bassP: 'x.....x.x.......', lead: 0.035, wave: 'triangle' },
    battle: { bpm: 148, roots: [52, 52, 48, 50, 52, 52, 55, 50], minor: [1, 1, 0, 0, 1, 1, 0, 0], kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', arp: 'x.xxx.xxx.xxx.x.', bassP: 'x.xx.xx.x.xx.xxx', lead: 0.03, wave: 'square' },
    gacha: { bpm: 120, roots: [60, 65, 67, 60], minor: [0, 0, 0, 0], kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...xx', arp: 'xxxxxxxxxxxxxxxx', bassP: 'x...x...x...x...', lead: 0.025, wave: 'square' },
    title: { bpm: 132, roots: [50, 46, 53, 48], minor: [1, 0, 0, 0], kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', arp: 'x..x..x.x..x..x.', bassP: 'x..x..x.x..x..x.', lead: 0.03, wave: 'sawtooth' },
  };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let cur = null, step = 0, nextT = 0, timer = null, songT0 = 0;
  function schedule() {
    if (!ctx || !cur) return;
    const sp = 60 / cur.bpm / 4;
    while (nextT < ctx.currentTime + 0.12) {
      const bar = Math.floor(step / 16) % cur.roots.length, s = step % 16, root = cur.roots[bar];
      const third = cur.minor[bar] ? 3 : 4;
      if (cur.kick[s] === 'x') { tone(150, 40, 0.18, 'sine', 0.5, nextT, musBus); }
      if (cur.snare[s] === 'x') { noise(0.12, 0.22, 1800, 0.7, 'bandpass', nextT, musBus); tone(220, 120, 0.06, 'triangle', 0.12, nextT, musBus); }
      if (cur.hat[s] === 'x') noise(0.03, 0.06, 8000, 1, 'highpass', nextT, musBus);
      if (cur.bassP[s] === 'x') tone(mtof(root - 12), null, sp * 1.6, 'triangle', 0.22, nextT, musBus);
      if (cur.arp[s] === 'x') { const iv = [0, third, 7, 12, 7, third][(s + bar) % 6]; tone(mtof(root + 12 + iv), null, sp * 0.9, cur.wave, cur.lead, nextT, musBus); }
      nextT += sp; step++;
    }
  }
  const Music = {
    play(name) {
      init(); if (!ctx) return;
      if (cur === SONGS[name]) return;
      cur = SONGS[name] || null; step = 0; nextT = ctx.currentTime + 0.08; songT0 = nextT;
      if (!timer) timer = setInterval(schedule, 30);
    },
    stop() { cur = null; },
    get current() { return Object.keys(SONGS).find(k => SONGS[k] === cur) || null; },
    /* the beat of the music that's playing (falls back to the match clock): n counts beats, near = within 85 ms of one */
    beat(m) {
      const per = 60 / ((cur && cur.bpm) || 148), live = ctx && cur && ctx.state === 'running';
      const x = (live ? ctx.currentTime - songT0 : (m ? m.time : 0)) / per;
      return { n: Math.floor(x), near: Math.abs(x - Math.round(x)) * per < 0.085, per };
    },
  };
  window.SFX = SFX; window.Music = Music;
})();
