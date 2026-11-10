/* tools/harness.js -- test helpers, injected into the running game page.
   __step(sec, fn) advances the game at a fixed 60 Hz (fn(i) runs before each frame);
   __calls collects every callout; __train(p1Line, p2Line) starts training with P1 scripted. */
(function () {
  window.__simT = 1000;
  window.__step = (sec, fn) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { window.__simT += 1 / 60; Input.update(window.__simT); if (fn) fn(i); App.view.update(1 / 60); } App.renderer.render(App.view.scene, App.view.camera); };
  window.__calls = [];
  const oc = FX.call; FX.call = function (pos, text) { window.__calls.push(String(text)); return oc.apply(this, arguments); };
  window.__errs = []; const oe = console.error; console.error = (...a) => { window.__errs.push(String(a[0] && a[0].stack || a[0]).slice(0, 300)); oe(...a); };
  window.__login = async () => { localStorage.clear(); await Auth.register('Tester', 'test1234', false); Auth.starter('samurai'); };
  window.__train = (l1, l2, arena) => {
    App.startMatch({ mode: 'training', builds: [KB.mintBuild(l1, 0), KB.mintBuild(l2, 0)], cpu: [null, null], arena: arena || 'shelf', wins: 99, time: 999, bonus: true });
    __step(2);
    const m = App.view; m.training.meter = false;
    const fake = { held: {}, move: { x: 0, y: 0 } }; Input.players[0].cpu = fake; window.__fake = fake;
    return m;
  };
  window.__pad = () => { const f = window.__fake; for (const k in f.held) f.held[k] = false; f.move.x = 0; f.move.y = 0; return f; };
})();
/* a scripted wall combo: string into the E wall, then catch the rebound with Lights and KNOCK it back */
window.__wallTest = (l1, l2, secs, opt) => {
  __calls.length = 0; opt = opt || {};
  const m = __train(l1, l2), [a, b] = m.fighters; a.pos.set(3.5, 0, 0); b.pos.set(5.2, 0, 0); a.yaw = Math.PI / 2; b.yaw = -Math.PI / 2;
  if (opt.dummy) m.training.dummy = opt.dummy; if (opt.meter) m.training.meter = true;
  const log = []; let cool = 0, lights = 0;
  __step(secs || 6, i => {
    const fake = __pad(); cool--;
    const dx = b.pos.x - a.pos.x, d = Math.hypot(dx, b.pos.z - a.pos.z);
    if (i < 40 && i % 8 === 0) fake.held.light = true;
    else if (i >= 40 && b.state === 'tumble') {
      const want = b.pos.x - 1.0; if (a.state !== 'attack') fake.move.x = Math.abs(a.pos.x - want) > 0.25 ? Math.sign(want - a.pos.x) : 0;
      if (b.pos.y < 1.5 && d < 1.6 && dx > 0 && cool <= 0) { if (lights < (opt.lights || 3)) { fake.held.light = true; lights++; cool = 9; } else { fake.held.heavy = true; fake.move.x = 1; lights = 0; cool = 30; } }
    }
    if (i % 6 === 0) log.push(i + ':' + b.state[0] + '@' + b.pos.x.toFixed(1) + ',' + b.pos.y.toFixed(1) + ' c' + b.combo.hits + '/' + b.combo.bounces + ' A' + a.pos.x.toFixed(1) + a.state[0] + (a.move ? a.move.id.slice(0, 5) : ''));
  });
  return { errs: __errs, calls: __calls.slice(), hp: Math.round(b.hp) + '/' + b.maxHp, walls: m.arena.walls.map(w => w.id + ':' + Math.round(w.stress) + (w.broken ? 'B' : '')), rec: a.records, bst: b.state, log: log.slice(9, 60).join(' ') };
};
/* how well a CPU keeps its combos going. mode 'dummy': CPU (level lv) on P1 against a standing training dummy;
   mode 'cvc': CPU vs CPU at levels [lv, lv2]. Every string move that hit with a follow-up available is checked:
   did the CPU continue it (string, cancel, launch, or a timed pause branch) or drop it? Returns the counts, the
   drop reasons, and the length of every combo. Keep secs <= ~40 per call (one browser call). */
window.__comboAudit = (lv, l1, l2, secs, opt) => {
  opt = opt || {}; __errs.length = 0;
  let m;
  if (opt.mode === 'cvc') { App.startMatch({ mode: 'watch', builds: [KB.mintBuild(l1, 0), KB.mintBuild(l2, 0)], cpu: [lv, opt.lv2 == null ? lv : opt.lv2], arena: opt.arena || 'shelf', wins: 9, time: 999, bonus: true }); m = App.view; __step(1.8); }
  else { m = __train(l1, l2, opt.arena); const ai = new AI(m, m.fighters[0], lv); m.ai[0] = ai; Input.players[0].cpu = ai; if (opt.dummy) m.training.dummy = opt.dummy; m.fighters[0].hype = 0; }
  const F = m.fighters, who = opt.mode === 'cvc' ? [0, 1] : [0];
  const st = { strings: 0, cont: 0, pause: 0, drop: 0, why: {}, launch: 0, launchFollow: 0, combos: [], bounces: 0, ex: [], whiff: 0, whiffEx: [], free: 0, freeHit: 0, reb: 0, rebHit: 0 };
  const T = who.map(() => ({ ser: null, mv: null, kind: null, hit: false, pend: null, launchT: null, inCombo: false, freeT: null, rebT: null, bo: 0 }));
  const reason = (f, ai, o) => !o.inHitstun ? 'oppFree:' + o.state : ai.wantPause ? 'wantPause' : f.state === 'attack' ? 'other' : 'ended:' + f.state;
  const seen = new Set(), combos = [];
  __step(secs || 20, () => {
    for (const i of who) {
      const f = F[i], o = f.opp, ai = m.ai[i], t = T[i], now = m.time;
      if (m.cine) continue;
      const cur = f.state === 'attack' && f.move ? f.moveSerial : null;
      // a pending maybe-drop: resolve it once the next move starts or the window passes
      if (t.pend) {
        if (cur != null && cur !== t.ser) { if (t.pend.p && f.move.id === t.pend.p) { st.pause++; } else { st.drop++; st.why[t.pend.r] = (st.why[t.pend.r] || 0) + 1; if (st.ex.length < 12) st.ex.push(t.pend.id + '>' + f.move.id + ' ' + t.pend.r); } t.pend = null; }
        else if (now - t.pend.t > 0.7) { st.drop++; st.why[t.pend.r] = (st.why[t.pend.r] || 0) + 1; if (st.ex.length < 12) st.ex.push(t.pend.id + ' x ' + t.pend.r); t.pend = null; }
      }
      if (t.ser != null && cur !== t.ser) {
        // the tracked move ended or was cancelled
        const mv = t.mv, nx = mv.nx || {};
        if (t.hit && (t.kind === 'light' || t.kind === 'air') && nx.l) {
          st.strings++;
          if (cur != null) st.cont++;                      // cancelled into something
          else if (f.state === 'air' && t.kind === 'air' && f.st.sig === 'pogo' && f.pogos > 0) st.cont++;
          else if (f.state === 'air' && t.kind === 'air' && f.st.sig === 'airdash' && f.airDashes > 0) st.cont++;
          else if (!o.inHitstun && o.state !== 'held') { st.strings--; }   // nothing left to combo (they teched / burst)
          else t.pend = { t: now, id: mv.id, p: nx.p, r: reason(f, ai, o) };
        }
        if (t.kind === 'launch' && t.hit) { st.launch++; t.launchT = now; }
        if (t.inCombo && !t.hit && t.kind !== 'super') { st.whiff++; if (st.whiffEx.length < 10) st.whiffEx.push(mv.id + '/' + t.kind + ' d' + U.dist(f.pos, o.pos).toFixed(1) + ' ' + o.state); }
      }
      if (t.launchT != null) { if (f.state === 'attack' && f.kind === 'air' && f.moveHit) { st.launchFollow++; t.launchT = null; } else if (now - t.launchT > 1.6 || f.grounded && now - t.launchT > 0.4) t.launchT = null; }
      if (cur != null && cur !== t.ser) t.inCombo = o.inHitstun && o.combo.by === f;
      t.ser = cur; if (cur != null) { t.mv = f.move; t.kind = f.kind; t.hit = f.moveHit; }
      // free hits: crumpled, dizzy or asleep in front of us -- did we hit them before it wore off?
      const freeNow = o.state === 'hit' && (o.crumpled || o.dizzy) && o.combo.by === f;
      if (freeNow && t.freeT == null) { t.freeT = now; t.freeHits = o.combo.hits; st.free++; }
      if (t.freeT != null && o.combo.hits > t.freeHits) { st.freeHit++; t.freeT = null; } else if (t.freeT != null && !freeNow) t.freeT = null;
      // wall rebounds: they bounced off a wall in our combo -- did we hit them again before they recovered?
      if (o.combo.by === f && o.combo.bounces > t.bo && o.state === 'tumble') { st.reb++; t.rebT = now; t.rebHits = o.combo.hits; }
      t.bo = o.combo.by === f ? o.combo.bounces : 0;
      if (t.rebT != null && o.combo.hits > t.rebHits) { st.rebHit++; t.rebT = null; } else if (t.rebT != null && !(o.inHitstun)) t.rebT = null;
      // combo lengths, read off the victim
      if (o.combo.by === f && o.combo.hits && !seen.has(o.combo)) { seen.add(o.combo); combos.push(o.combo); }
    }
    if (opt.mode !== 'cvc' && F[1].hp < F[1].maxHp * 0.3) F[1].hp = F[1].maxHp;
  });
  const c = combos.map(x => x.hits), avg = c.length ? c.reduce((a, b) => a + b, 0) / c.length : 0;
  return { lv, lines: l1 + ' v ' + l2, strings: st.strings, cont: st.cont, pause: st.pause, drop: st.drop, dropPct: st.strings ? Math.round(100 * st.drop / st.strings) : 0, why: st.why, launch: st.launch + '/' + st.launchFollow + ' followed', whiff: st.whiff, whiffEx: st.whiffEx, free: st.freeHit + '/' + st.free, rebound: st.rebHit + '/' + st.reb, combos: c.length, avgHits: +avg.toFixed(1), long: c.filter(x => x >= 5).length, ex: st.ex, errs: __errs.slice(0, 3) };
};
/* CPU vs CPU: how often each CPU pushes its stick into a wall it is standing against (percent of fight frames), and in what situation */
window.__wallPush = (l1, l2, lv, secs, arena) => {
  App.startMatch({ mode: 'watch', builds: [KB.mintBuild(l1, 0), KB.mintBuild(l2, 0)], cpu: [lv, lv], arena: arena || 'shelf', wins: 9, time: 999, bonus: true });
  const m = App.view; __step(1.8); const F = m.fighters, A = m.arena;
  const st = [{ push: 0, n: 0, why: {} }, { push: 0, n: 0, why: {} }];
  __step(secs, () => {
    if (m.cine || m.phase !== 'fight') return;
    for (const i of [0, 1]) {
      const f = F[i], o = f.opp, ai = m.ai[i], s = st[i]; s.n++;
      const mx = ai.move.x, mz = -ai.move.y; if (Math.hypot(mx, mz) < 0.3 || f.state === 'attack') continue;
      for (const w of A.walls) {
        const gap = w.lim - w.sign * f.pos[w.axis], into = w.sign * (w.axis === 'x' ? mx : mz) / Math.hypot(mx, mz);
        if (gap < 0.7 && into > 0.5 && !w.broken) { s.push++; const k = f.state + '|o:' + o.state + '|d' + Math.min(4, Math.round(U.dist(f.pos, o.pos))); s.why[k] = (s.why[k] || 0) + 1; }
      }
    }
  });
  return st.map(s => ({ pushPct: +(100 * s.push / s.n).toFixed(1), why: Object.entries(s.why).sort((a, b) => b[1] - a[1]).slice(0, 4) }));
};
/* COMBO TRIALS: play trial i of a line with its DEMO bot; OK and the time, or where it stopped and why */
/* a trial's DEMO, start to finish. hz: the frame rate it runs at (60 by default; the game steps on real frame time, so
   a 144 Hz screen plays it in smaller steps), or 'jitter' (uneven frames, 144 Hz with a slow one every third) */
window.__trialRun = async (line, i, tier, hz) => {
  // (paused while it waits: the page's own loop runs on the real clock meanwhile, and a press buffered on the test
  // clock would go off there)
  Trials.start(line, i, tier); __step(2.0); App.view.paused = true; await new Promise(r => setTimeout(r, 160));
  const pd = document.querySelector('#pause'); if (pd) pd.remove(); App.view.paused = false;
  const demo = [...document.querySelectorAll('.trow button')].find(b => b.textContent === 'DEMO'); if (!demo) return { ok: false, err: 'no demo button' };
  demo.click(); let k = 0, t = 0, last = '', now = '';
  const dtOf = k => hz === 'jitter' ? (k % 3 ? 1 / 144 : 1 / 50) : 1 / (hz || 60);
  while (t < 15) {
    const dt = dtOf(k++); t += dt; window.__simT += dt; Input.update(window.__simT); App.view.update(dt);
    const p = document.querySelector('.trialp'); if (!p) break;
    const nb = p.querySelector('.tsteps li.now b'); if (nb) now = nb.textContent;
    if (p.classList.contains('ok')) return { ok: true, t: t.toFixed(1) };
    const msg = (p.querySelector('.tmsg.bad') || {}).textContent; if (msg) { last = msg; break; }
  }
  App.render && App.render();
  const p = document.querySelector('.trialp');
  return { ok: false, at: p ? p.querySelectorAll('.tsteps li.done').length + '/' + p.querySelectorAll('.tsteps li').length : '?', now, last };
};
window.__trialLine = async (line, tier, hz) => { const out = []; const list = Trials.list(line, tier); for (let i = 0; i < list.length; i++) { const r = await __trialRun(line, i, tier, hz); out.push(line + ' ' + i + ' ' + list[i].name + ': ' + (r.ok ? 'OK ' + r.t + 's' : 'FAIL ' + JSON.stringify(r))); } return out; };
window.__load = () => 'harness ok';
/* the wall loop: Light x3, then toward + Heavy (the KNOCK cancel) into the E wall, over and over */
window.__loopTest = (l1, l2, secs, opt) => {
  __calls.length = 0; opt = opt || {};
  const m = __train(l1, l2), [a, b] = m.fighters; a.pos.set(3.5, 0, 0); b.pos.set(5.2, 0, 0); a.yaw = Math.PI / 2; b.yaw = -Math.PI / 2;
  if (opt.dummy) m.training.dummy = opt.dummy; if (opt.meter) m.training.meter = true;
  const log = []; let cool = 0, lights = 0;
  __step(secs || 6, i => {
    const fake = __pad(); cool--;
    const dx = b.pos.x - a.pos.x, d = Math.hypot(dx, b.pos.z - a.pos.z);
    const inCombo = b.state === 'tumble' || b.state === 'hit' || i < 5;
    if (inCombo) {
      const want = b.pos.x - 1.0; if (a.state !== 'attack') fake.move.x = Math.abs(a.pos.x - want) > 0.25 ? Math.sign(want - a.pos.x) : 0;
      if (b.pos.y < 1.5 && d < 1.6 && dx > 0 && cool <= 0) { if (lights < (opt.lights || 3)) { fake.held.light = true; lights++; cool = 9; } else { fake.held.heavy = true; fake.move.x = 1; lights = 0; cool = 30; } }
    } else lights = 0;
    if (i % 6 === 0) log.push(i + ':' + b.state[0] + '@' + b.pos.x.toFixed(1) + ',' + b.pos.y.toFixed(1) + ' c' + b.combo.hits + '/' + b.combo.bounces + ' A' + a.pos.x.toFixed(1) + a.state[0] + (a.move ? a.move.id.slice(0, 5) : ''));
  });
  return { errs: __errs, calls: __calls.slice(), hp: Math.round(b.hp) + '/' + b.maxHp, walls: m.arena.walls.map(w => w.id + ':' + Math.round(w.stress) + (w.broken ? 'B' : '')), rec: a.records, bst: b.state, log: log.slice(0, 70).join(' ') };
};
/* play a scripted input sequence for P1 against a training dummy and report what happened.
   steps: [[frame, action, holdFrames, stickX]] ; returns the moves P1 started, callouts, and the dummy's combo */
window.__seq = (l1, l2, steps, secs, setup) => {
  __calls.length = 0;
  const m = __train(l1, l2), [a, b] = m.fighters; a.pos.set(-1.2, 0, 0); b.pos.set(0, 0, 0); a.yaw = Math.PI / 2; b.yaw = -Math.PI / 2;
  if (setup) setup(m, a, b);
  const moves = [], holds = {};
  let maxHits = 0, maxBounce = 0, lastMove = null;
  __step(secs || 3, i => {
    const f = __pad();
    for (const s of steps) if (s[0] === i) { holds[s[1]] = i + (s[2] || 1); if (s[3] != null) f.move.x = s[3]; }
    for (const k in holds) if (i < holds[k]) f.held[k] = true;
    if (a.move && a.move !== lastMove) { moves.push(a.move.id); lastMove = a.move; } if (!a.move) lastMove = null;
    maxHits = Math.max(maxHits, b.combo.hits); maxBounce = Math.max(maxBounce, b.combo.bounces);
  });
  return { moves: moves.join(' '), calls: __calls.join(', '), hits: maxHits, bounces: maxBounce, dmg: Math.round(b.maxHp - b.hp), errs: __errs.length };
};
/* a Legend Art from a distance: P1 (full Hype) presses Super at range `dist`; reports the catch, the cinematic and the damage */
window.__superTest = (l1, l2, dist, opt) => {
  __calls.length = 0; opt = opt || {};
  const m = __train(l1, l2), [a, b] = m.fighters; a.pos.set(-dist / 2, 0, 0); b.pos.set(dist / 2, 0, 0); a.yaw = Math.PI / 2; b.yaw = -Math.PI / 2;
  if (opt.dummy) m.training.dummy = opt.dummy;
  a.hype = 100; const hp0 = b.hp; let cine = false, cineT = 0, phases = [], maxY = 0;
  __step(opt.secs || 5, i => {
    const f = __pad(); if (i === 2) f.held.super = true;
    if (opt.each) opt.each(i, m, a, b, f);
    if (m.cine) { cine = true; cineT += 1 / 60; }
    if (a.superPhase && phases[phases.length - 1] !== a.superPhase) phases.push(a.superPhase);
    maxY = Math.max(maxY, a.pos.y);
  });
  return { cine, cineT: +cineT.toFixed(2), phases: phases.join('>'), dmg: Math.round(hp0 - b.hp), bst: b.state, calls: __calls.join(', '), errs: __errs.slice(0, 3), maxY: +maxY.toFixed(1), left: !!m.cine };
};
/* ONLINE determinism: an online fight run twice from one seed with one button stream must end identically.
   Runs `frames` fixed steps with both fighters mashing (a seeded stream), returns a fingerprint log. */
window.__detRun = (seed, frames, l1, l2) => {
  const { rng, withRng } = Online._t, PC = Input.players[0].constructor, net = [new PC(0), new PC(1)];
  net.forEach(p => { p.cpu = { held: {}, move: { x: 0, y: 0 }, stick: 1 }; });
  const opts = { mode: 'online', online: true, local: 0, builds: [KB.mintBuild(l1, 0), KB.mintBuild(l2, 0)], cpu: [null, null], arena: 'shelf', wins: 9, time: 99, bonus: false, inputs: net, onEnd: () => {} };
  const m = Match.create(opts); App.setView(m); const R = rng(seed); withRng(R, () => m.restart());
  const IN = rng(seed ^ 0x5bd1e995), A = Input.ACTIONS, log = [];
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < 2; i++) { const p = net[i]; p.cpu.held = {}; for (const a of A) p.cpu.held[a] = IN() < (a === 'light' ? 0.25 : a === 'guard' ? 0.05 : 0.04); p.cpu.move.x = Math.round((IN() * 2 - 1) * 100) / 100; p.cpu.move.y = Math.round((IN() * 2 - 1) * 100) / 100; p.poll(f / 60, [], false); }
    const n0 = Input.now; Input.now = f / 60; withRng(R, () => m.update(1 / 60)); Input.now = n0;
    if (f % 60 === 59) log.push(m.fighters.map(x => x.state[0] + x.pos.x.toFixed(3) + ',' + x.pos.z.toFixed(3) + ':' + Math.round(x.hp)).join('|') + ' r' + R.get());
  }
  App.setView(null);
  return log;
};
/* rollback check: a seeded fight of random buttons where every `every` frames the fight goes back `depth` frames and
   replays them quietly; the whole saved fight must come out exactly the same (and so must the log, vs __detRun) */
window.__rbRun = (seed, frames, l1, l2, every, depth, pre) => {
  const T = Online._t, { rng, withRng } = T, PC = Input.players[0].constructor, net = [new PC(0), new PC(1)];
  net.forEach(p => { p.cpu = { held: {}, move: { x: 0, y: 0 }, stick: 1 }; });
  const opts = Object.assign({ mode: 'online', online: true, local: 0, builds: [KB.mintBuild(l1, 0), KB.mintBuild(l2, 0)], cpu: [null, null], arena: 'shelf', wins: 9, time: 99, bonus: false, inputs: net, onEnd: () => {} }, window.__rbOpts || {});   // (__rbOpts: e.g. { arena: 'trainset', hazards: true })
  const m = Match.create(opts); App.setView(m); const R = rng(seed); withRng(R, () => m.restart());
  T.prepSnap(m, net);
  const IN = rng(seed ^ 0x5bd1e995), A = Input.ACTIONS, log = [], ins = [], saves = {};
  const step = f => {
    for (let i = 0; i < 2; i++) { const p = net[i], x = ins[f][i]; p.cpu.held = {}; A.forEach((a, k) => { p.cpu.held[a] = x.h[k]; }); p.cpu.move.x = x.x; p.cpu.move.y = x.y; p.poll(f / 60, [], false); }
    if (pre) pre(m, f);
    const n0 = Input.now; Input.now = f / 60; withRng(R, () => m.update(1 / 60)); Input.now = n0;
  };
  let rbs = 0, ms = 0, snapMs = 0, nsnap = 0; const bad = [];
  for (let f = 0; f < frames; f++) {
    ins[f] = [0, 1].map(() => { const h = A.map(a => IN() < (a === 'light' ? 0.25 : a === 'guard' ? 0.05 : 0.04)); return { h, x: Math.round((IN() * 2 - 1) * 100) / 100, y: Math.round((IN() * 2 - 1) * 100) / 100 }; });
    const t1 = performance.now(); saves[f] = { R: R.get(), s: T.snapshot() }; snapMs += performance.now() - t1; nsnap++;
    step(f);
    if (every && f % every === every - 1 && f >= depth) {
      const s0 = T.snapshot(), h0 = T.hashSnap(s0), r0 = R.get(), t0 = performance.now();
      const S = saves[f + 1 - depth]; T.restoreSnap(S.s); R.set(S.R);
      U.quiet = true; try { for (let g = f + 1 - depth; g <= f; g++) step(g); } finally { U.quiet = false; }
      ms = Math.max(ms, performance.now() - t0);
      const s1 = T.snapshot(), h1 = T.hashSnap(s1);
      rbs++; if (h0 !== h1 || r0 !== R.get()) { bad.push(f); if (!window.__rbFirst) window.__rbFirst = { f, diff: __snapDiff(s0, s1) }; }
    }
    delete saves[f - 20];
    if (f % 60 === 59) log.push(m.fighters.map(x => x.state[0] + x.pos.x.toFixed(3) + ',' + x.pos.z.toFixed(3) + ':' + Math.round(x.hp)).join('|') + ' r' + R.get());
  }
  const size = T.snapshot().length / 3;
  App.setView(null);
  return { log, rbs, nbad: bad.length, bad: bad.slice(0, 8), replayMs: Math.round(ms * 10) / 10, snapMs: Math.round(snapMs / nsnap * 100) / 100, entries: size };
};
/* the first values that differ between two saves of a fight */
window.__snapDiff = (a, b) => {
  const out = [], name = o => (o && o.constructor && o.constructor.name) + (o && o.name ? ':' + o.name : '') + (o && o.kind ? ':' + o.kind : '');
  if (a.length !== b.length) out.push({ len: [a.length, b.length] });
  for (let i = 0; i < Math.min(a.length, b.length) && out.length < 6; i += 3) {
    const k = a[i], ra = a[i + 2], rb = b[i + 2];
    if (k !== b[i]) { out.push({ i, kinds: [k, b[i]], a: name(a[i + 1]), b: name(b[i + 1]) }); break; }
    const pa = [], pb = [];
    const prim = (r, p) => { for (let j = 0; j < r.length; j++) { const v = r[j]; if (v === undefined) { if (k === 0 && j % 2 === 1) p.pop(); continue; } p.push(v === null || typeof v !== 'object' ? (typeof v === 'function' ? 'fn' : v) : (Array.isArray(v) ? 'a' + v.length : 'o')); } };
    prim(ra, pa); prim(rb, pb);
    if (pa.join('§') !== pb.join('§')) { let j = 0; while (j < pa.length && pa[j] === pb[j]) j++; out.push({ i, kind: k, obj: name(a[i + 1]), at: j, near: pa.slice(Math.max(0, j - 3), j + 3), vs: pb.slice(Math.max(0, j - 3), j + 3) }); }
  }
  return out;
};
/* online rooms on one page: n games in iframes over a fake PeerJS network (lag and jitter in ticks; net.failDirect
   makes direct fighter links fail so fights go through the host). __roomSetup(n, lag, jitter, picks) opens a room in
   game 0 (private, password 'pw') and the rest join it; __roomRun(ticks) steps every game 1/60 s a tick. */
window.__mkNet = (lag, jitter) => {
  const net = { peers: new Map(), q: [], tick: 0, lag: lag || 0, jitter: jitter || 0, rnd: Online._t.rng(4242), failDirect: false, sent: 0, loss: 0, rto: 30, lost: 0 };
  const later = (fn, dt) => net.q.push({ at: net.tick + (dt == null ? 1 : dt), fn });
  net.pump = () => { for (let k = 0; k < 4; k++) { const due = net.q.filter(x => x.at <= net.tick); if (!due.length) return; net.q = net.q.filter(x => x.at > net.tick); due.forEach(x => x.fn()); } };
  class Conn {
    constructor(peer, metadata, ordered) { this.peer = peer; this.metadata = metadata; this.open = false; this.h = {}; this.last = 0; this.other = null; this.closed = false; this.ordered = ordered !== false || !!window.__allOrdered; }   // (__allOrdered: every link ordered, as before)
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
    emit(e, ...a) { (this.h[e] || []).slice().forEach(f => f(...a)); }
    send(o) {
      if (!this.open || !this.other) return; const b = this.other, s = JSON.stringify(o); net.sent++;
      let at = net.tick + net.lag + Math.floor(net.rnd() * (net.jitter + 1));
      if (net.loss && net.rnd() < net.loss) { at += net.rto; net.lost++; }   // lost, then resent
      if (this.ordered) at = Math.max(this.last, at);
      if (net.down && net.tick < net.down) at = Math.max(at, net.down + net.lag);   // an outage: everything sent waits (a stalled ordered channel)
      this.last = Math.max(this.last, at);
      net.q.push({ at, fn: () => { if (b.open) b.emit('data', JSON.parse(s)); } });
    }
    close() { if (this.closed) return; this.closed = true; this.open = false; const b = this.other; later(() => { this.emit('close'); if (b && !b.closed) { b.closed = true; b.open = false; b.emit('close'); } }, net.lag); }
  }
  class FakePeer {
    constructor(id) {
      if (typeof id !== 'string') id = 'fp-' + Math.floor(net.rnd() * 1e9).toString(36);
      this.id = id; this.h = {}; this.destroyed = false; this.conns = [];
      if (net.peers.has(id)) later(() => this.emit('error', { type: 'unavailable-id' })); else { net.peers.set(id, this); later(() => this.emit('open', id)); }
    }
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
    emit(e, ...a) { (this.h[e] || []).slice().forEach(f => f(...a)); }
    connect(id, opts) {
      const meta = opts && opts.metadata, ord = !(opts && opts.reliable === false), a = new Conn(id, meta, ord); this.conns.push(a);
      const t = net.peers.get(id);
      if (!t || t.destroyed || (meta && meta.fid && net.failDirect)) { later(() => this.emit('error', { type: 'peer-unavailable' }), net.lag); return a; }
      const b = new Conn(this.id, meta, ord); t.conns.push(b); a.other = b; b.other = a;
      later(() => { if (t.destroyed) return; t.emit('connection', b); later(() => { a.open = b.open = true; a.emit('open'); b.emit('open'); }, net.lag); }, net.lag);
      return a;
    }
    destroy() { if (this.destroyed) return; this.destroyed = true; net.peers.delete(this.id); this.conns.forEach(c => c.close()); }
    reconnect() {}
  }
  net.FakePeer = FakePeer;
  return net;
};
window.__roomSetup = async (n, lag, jitter, picks, opts) => {
  document.querySelectorAll('iframe.duo').forEach(f => f.remove());
  const mk = () => new Promise(r => { const f = document.createElement('iframe'); f.className = 'duo'; f.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:400px;z-index:99;opacity:0.02;pointer-events:none'; f.src = '/?duo=' + Date.now() + Math.random(); f.onload = () => r(f); document.body.append(f); });
  const fr = []; for (let i = 0; i < n; i++) fr.push(await mk());
  for (let k = 0; k < 100 && !fr.every(f => f.contentWindow.__ready); k++) await new Promise(r => setTimeout(r, 100));
  const W = fr.map(f => f.contentWindow), net = __mkNet(lag, jitter);
  const D = window.__duo = { W, net, get tick() { return net.tick; }, hold: 4, cur: [], auto: true, stalls: W.map(() => 0) };
  W.forEach(w => { w.U.write = () => {}; });   // (test players' accounts stay in memory: the real save on this machine is never touched)
  W.forEach(w => { w.requestAnimationFrame = () => 0; w.performance.now = () => net.tick * 1000 / 60; w.__errs = []; const oe = w.console.error.bind(w.console); w.console.error = (...a) => { w.__errs.push(String(a[0] && a[0].stack || a[0]).slice(0, 300)); oe(...a); }; w.console.warn = (...a) => w.__errs.push('W ' + a.join(' ')); });
  for (let i = 0; i < n; i++) { await W[i].Auth.register('P' + i + '_' + Math.floor(Math.random() * 1e5), 'test1234', false); W[i].Auth.starter(KB.LINE_ORDER[i % 10]); }
  W.forEach(w => { w.Online._t.usePeer(net.FakePeer); w.Online._t.Dir.disabled = true; });
  W.forEach((w, i) => { w.Online.open(); if (picks && picks[i]) w.Online._t.pick(picks[i]); });
  D.step = k => { for (let j = 0; j < k; j++) { net.tick++; net.pump(); W.forEach(w => w.Online._t.later()); if (net.tick % 60 === 0) W.forEach(w => w.Online._t.tick()); } };
  W[0].Online.create(Object.assign({ name: 'Test room', priv: true, pass: 'pw', listed: false, max: 6 }, opts || {}));
  await new Promise(r => setTimeout(r, 0)); D.step(10);
  const code = W[0].Online._t.N().code;
  for (let i = 1; i < n; i++) { W[i].Online.join(code, 'pw'); await new Promise(r => setTimeout(r, 0)); D.step(4 * lag + 10); }
  D.step(20);
  return W.map(w => w.Online._t.info());
};
/* every game, one tick: the network, then each game's frame (a random player each; D.hold: frames between changes) */
window.__roomRun = (ticks, fn) => {
  const D = window.__duo, IN = Online._t.rng(D.net.tick + 7), A = Input.ACTIONS;
  for (let t = 0; t < ticks; t++) {
    D.step(1);
    for (let wi = 0; wi < D.W.length; wi++) {
      const w = D.W[wi];
      if (!D.cur[wi] || IN() < 1 / D.hold) {
        const c = { held: {}, move: { x: Math.round((IN() * 2 - 1) * 100) / 100, y: Math.round((IN() * 2 - 1) * 100) / 100 } };
        for (const a of A) c.held[a] = IN() < (a === 'light' ? 0.3 : a === 'guard' ? 0.05 : 0.05);
        D.cur[wi] = c;
      }
      w.Input.players[0].cpu = D.cur[wi];
      w.Input.update(D.net.tick / 60);
      if (w.App.view && w.App.view.fighters) w.App.view.update(1 / 60);
    }
    if (fn) fn(t);
  }
  return D.W.map(w => w.Online._t.info());
};
/* the old two-game rollback check, now over a room of two: __duoSetup(lag, jitter, picks, seed, debug) then __duoRun(ticks) */
window.__duoSetup = async (lag, jitter, picks, seed, debug) => {
  await __roomSetup(2, lag, jitter, picks);
  const D = window.__duo; D.W.forEach(w => { w.Online._t.debug = debug || 0; });
  const H = D.W[0].Online._t;
  D.W[0].Online._t.N().room.auto = false;
  D.W.forEach(w => w.Online._t.act({ t: 'ready', on: true })); D.step(4 * lag + 10);
  H.H.start(seed); D.step(1);
  return D.W.map(w => w.Online._t.info());
};
window.__duoRun = ticks => __roomRun(ticks);
/* touch screens: anything on the current screen that's off the screen and can't be scrolled to */
window.__scrollAudit = () => {
  const W = innerWidth, H = innerHeight, bad = [], scrollers = new Set();
  const canScroll = e => { const c = getComputedStyle(e); return /(auto|scroll)/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 1; };
  const canScrollX = e => { const c = getComputedStyle(e); return /(auto|scroll)/.test(c.overflowX) && e.scrollWidth > e.clientWidth + 1; };
  const root = document.querySelector('#screens'), extra = [...document.querySelectorAll('body > .overlay')];
  const els = [...root.querySelectorAll('button, input, select, a, h1, h2, h3, p, img, b, small, .olpick, .slotrow, .rwrow, .trow')].concat(...extra.map(o => [...o.querySelectorAll('button, input, h2, p, b')]));
  for (const e of els) {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const outY = r.bottom > H + 1 || r.top < -1, outX = r.right > W + 1 || r.left < -1;
    if (!outY && !outX) continue;
    // reachable if some ancestor scrolls that way and that ancestor is itself on screen
    let a = e.parentElement, ok = false;
    while (a && a !== document.body) {
      if ((outY && canScroll(a)) || (outX && canScrollX(a))) { const ar = a.getBoundingClientRect(); ok = ar.top >= -1 && ar.bottom <= H + 1 && ar.left >= -1 && ar.right <= W + 1; scrollers.add(a.className + (ok ? '' : ' (cut off)')); break; }
      a = a.parentElement;
    }
    if (!ok) bad.push((e.tagName + '.' + (e.className || '')).slice(0, 30) + ' "' + (e.textContent || e.alt || '').trim().slice(0, 24) + '" y' + Math.round(r.top) + '-' + Math.round(r.bottom) + ' x' + Math.round(r.left) + '-' + Math.round(r.right));
  }
  const s = root.lastElementChild;
  return { screen: s ? s.className : '', vw: W + 'x' + H, bad: bad.length, sample: bad.slice(0, 4), scrollers: [...scrollers].slice(0, 3) };
};
/* every menu screen, audited at the current size */
window.__auditAll = async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms)), out = [];
  const go = async (name, fn) => { try { await fn(); await wait(350); const r = __scrollAudit(); if (r.bad) out.push(name + ': ' + r.bad + ' cut off ' + JSON.stringify(r.sample)); else out.push(name + ': ok'); } catch (e) { out.push(name + ': ERR ' + e.message); } document.querySelectorAll('body > .overlay').forEach(o => o.remove()); };
  await go('title', () => Menu.title());
  await go('login', () => Menu.login());
  await go('starter', () => Menu.starter());
  await go('tutoffer', () => Menu.offerTutorial());
  await go('hub', () => Menu.hub());
  await go('workshop', () => Menu.workshop());
  await go('workshop-open', () => Menu.workshop('head'));
  await go('capsules', () => Menu.capsules(0));
  await go('shelf', () => Menu.shelf());
  await go('versus', () => Menu.versus());
  await go('versus-watch', () => Menu.versus(Object.assign({}, Menu._vs, { mode: 'watch' })));
  await go('arcade', () => Menu.arcade());
  await go('howto', () => Menu.howto());
  await go('options', () => Menu.options());
  await go('rewards', () => Rewards.screen());
  for (const t of ['weekly', 'fighters', 'milestones', 'awards']) await go('rewards-' + t, () => Rewards.screen(t));
  Rewards._tab = 'daily';
  await go('trials', () => Trials.open());
  await go('online', () => { Online.open(); });
  await go('results', () => Menu.results({ winner: 0, wins: [2, 1], mode: 'cpu', records: [{ maxCombo: 12, maxBounces: 3, breaks: 1, dmg: 900 }, { maxCombo: 4, maxBounces: 0, breaks: 0, dmg: 400 }], builds: [Auth.S.builds[0], KB.mintBuild('knight', 0)] }, { mode: 'cpu', builds: [Auth.S.builds[0], KB.mintBuild('knight', 0)], cpu: [null, 1] }));
  if (window.Online) Online.leave(true);
  Menu.hub();
  return out;
};
/* SUPER CAMERAS: run a line's Legend Art with the pair placed at (cx, cz), side by side along `axis` ('x' or 'z');
   every frame of the flash and the cinematic, check each shot: is a wall between the camera and either figure,
   is a figure off screen, is the camera inside a figure or under the floor. Returns frame counts by shot. */
window.__camAudit = (line, cx, cz, axis, opt) => {
  opt = opt || {};
  const m = __train(line, opt.vs || 'knight'), [a, b] = m.fighters, A = m.arena, cam = m.camera;
  const dx = axis === 'z' ? 0 : 1, dz = axis === 'z' ? -1 : 0, gap = opt.gap || 2.4;
  a.pos.set(cx - dx * gap / 2, 0, cz - dz * gap / 2); b.pos.set(cx + dx * gap / 2, 0, cz + dz * gap / 2);
  a.yaw = Math.atan2(dx, dz); b.yaw = Math.atan2(-dx, -dz); a.hype = 100;
  if (opt.down) { b.setState('down'); b.stateT = -5; }
  const bad = {}, seen = {}, V = THREE.Vector3, P = new V();
  const note = (k, id) => { bad[k] = bad[k] || {}; bad[k][id] = (bad[k][id] || 0) + 1; };
  const blocked = (from, to) => {
    for (const w of A.walls) {
      if (w.broken) continue; const ax = w.axis, s = w.sign, lim = w.lim, h = w.h * 0.25;
      const fa = s * from[ax], ta = s * to[ax];
      if (fa <= lim - 0.02 || ta >= lim) continue;            // the camera's on the inside of this wall (or both outside)
      const k = (lim - ta) / (fa - ta), y = to.y + (from.y - to.y) * k, o = ax === 'x' ? 'z' : 'x', u = to[o] + (from[o] - to[o]) * k;
      if (y < h + 0.05 && Math.abs(u) < w.len / 2 + 0.6) return w.id;
    }
    return null;
  };
  let caught = false;
  __step(opt.secs || 5.5, i => {
    const f = __pad(); if (i === 2) f.held.super = true;
    if (opt.down && i < 40 && b.state !== 'down' && !m.cine && a.superPhase !== 'seq') { b.setState('down'); b.stateT = -5; }
    if (!(m.frozen && m.freezer) && !m.cine) return;
    if (m.cine) caught = true;
    const id = m.cine ? (m.camShot || '?') : 'freeze'; seen[id] = (seen[id] || 0) + 1;
    cam.updateMatrixWorld(); const cp = cam.position;
    if (cp.y < 0.15) note('floor', id);
    for (const [who, F] of [['att', a], ['vic', b]]) {
      if (!F.obj.visible) continue;
      const c = new V(F.pos.x, F.pos.y + 1, F.pos.z);
      const w = blocked(cp, c); if (w) note('wall:' + who, id + '/' + w);
      P.copy(c).project(cam); if (Math.abs(P.x) > 1 || Math.abs(P.y) > 1 || P.z > 1) note('off:' + who, id);
      if (Math.hypot(cp.x - F.pos.x, cp.z - F.pos.z) < 0.6 && cp.y > F.pos.y - 0.1 && cp.y < F.pos.y + 2) note('inside:' + who, id);
    }
  });
  return { line, at: [cx, cz, axis], caught, shots: seen, bad, errs: __errs.slice(0, 2) };
};
/* ARENAS: a CPU-vs-CPU fight on a stage (hazards follow the Options setting); fighters parked on spots to prove a hazard
   lands (__hazTest('trainset', [[0, -1.6], [3, 3]], 18) -> the hits it made); a still, wide shot of a stage at a moment */
window.__watch = (id, l1, l2, lv) => { App.startMatch({ mode: 'watch', builds: [KB.mintBuild(l1 || 'knight', 0), KB.mintBuild(l2 || 'samurai', 0)], cpu: [lv == null ? 2 : lv, lv == null ? 2 : lv], arena: id, wins: 9, time: 999, bonus: false }); return App.view; };
window.__hazTest = (id, spots, secs) => {
  const m = __watch(id); m.ai = [null, null]; Input.players[0].cpu = { held: {}, move: { x: 0, y: 0 } }; Input.players[1].cpu = { held: {}, move: { x: 0, y: 0 } };
  const ev = []; m.on((k, d) => { if (k === 'hazard') ev.push(d.vic.idx + '@' + m.haz.t.toFixed(1) + ' -' + d.dmg); if (k === 'ko') ev.push('KO ' + d.vic.idx); });
  __step(secs || 20, () => { for (const f of m.fighters) { const s = spots[f.idx]; if (s && f.state === 'idle' && m.phase === 'fight' && Math.hypot(f.pos.x - s[0], f.pos.z - s[1]) > 0.3) { f.pos.x = s[0]; f.pos.z = s[1]; } } });
  return { id, n: ev.length, ev: ev.slice(0, 12), hp: m.fighters.map(f => Math.round(f.hp)), errs: __errs.slice(0, 2) };
};
window.__shotW = (id, t, cam) => {
  const m = __watch(id); __step(1.7 + t); m.update = () => {}; m.arena.draw(m, 1 / 60);
  const c = m.camera, p = cam || [0, 11, 17, 0.5]; c.position.set(p[0], p[1], p[2]); c.lookAt(0, p[3], -1.5);
  const co = document.getElementById('callouts'); if (co) co.innerHTML = ''; return m.haz ? JSON.stringify(m.haz).slice(0, 140) : 'no hazard';
};
/* VISUALS of every Special: each of a line's neutral, side and down Specials thrown at a dummy 3.6 m off; counts the FX and
   the meshes it adds and how far off the fight plane (z) they go. NOVIS: nothing drawn; OFFZ: off the plane; LOW: under the floor */
window.__visAudit = (lines, secs, dist, only) => {
  const out = [], o0 = { b: FX.burst, s: FX.spark, r: FX.ring, t: FX.trail }; let rec = null;
  const hk = fn => function (p) { if (rec) { rec.fx++; if (p && p.z != null) rec.fz = Math.max(rec.fz, Math.abs(p.z)); } return fn.apply(FX, arguments); };
  FX.burst = hk(o0.b); FX.spark = hk(o0.s); FX.ring = hk(o0.r); FX.trail = hk(o0.t);
  try {
    for (const L of lines) {
      const S = __train(L, 'knight').fighters[0].st;
      for (const [k, id] of [['N', S.special], ['S', S.cmd && S.cmd.qcf], ['D', S.cmd && S.cmd.qcb]]) {
        if (!id || !KB.MOVES[id]) { out.push(L + ' ' + k + ' -'); continue; }
        if (only && !only.includes(id)) continue;
        const m = __train(L, 'knight'), [a, b] = m.fighters; const D = (dist || 3.6) / 2; a.pos.set(-D, 0, 0); b.pos.set(D, 0, 0); a.yaw = Math.PI / 2; b.yaw = -Math.PI / 2; a.uses = 9;
        if (KB.MOVES[id].needImp) { a.startSpecial(S.special); __step(1.5); }
        const sc = m.scene, base = new Set(sc.children); __errs.length = 0;
        rec = { fx: 0, fz: 0 }; const neu = new Set(), kinds = new Set(); let mz = 0, pz = 0, lowY = 9;
        a.startSpecial(id); const on = !!a.move;
        __step(secs || 2, i => { if (i % 5) return;
          for (const c of sc.children) if (!base.has(c) && c.visible && !c.isLight) { neu.add(c); mz = Math.max(mz, Math.abs(c.getWorldPosition(new THREE.Vector3()).z)); }
          for (const q of m.projs) if (q.f === a) { kinds.add(q.kind); const p = q.mesh ? q.mesh.position : q.pos; if (p) { pz = Math.max(pz, Math.abs(p.z)); lowY = Math.min(lowY, p.y); } } });
        const r = rec; rec = null;
        const flag = (r.fx + neu.size === 0 ? ' NOVIS' : '') + (mz > 1.2 || pz > 1.2 || r.fz > 1.6 ? ' OFFZ' : '') + (lowY < -0.6 ? ' LOW' : '') + (__errs.length ? ' ERR:' + __errs[0].slice(0, 80) : '') + (on ? '' : ' NOSTART');
        out.push(L + ' ' + k + ' ' + id + ' fx' + r.fx + ' m' + neu.size + (kinds.size ? ' [' + [...kinds].join('/') + ']' : '') + ' z' + Math.max(mz, pz).toFixed(1) + '/' + r.fz.toFixed(1) + flag);
      }
    }
  } finally { Object.assign(FX, { burst: o0.b, spark: o0.s, ring: o0.r, trail: o0.t }); rec = null; }
  return out;
};
/* the TUTORIAL, driven: open it (once), jump to a lesson, and play it with the fake pad. script(i, f, m, a, d, S) runs
   every frame (f: the pad, cleared each frame). Returns how far it got: S.got of the lesson's need, done or not */
window.__tutStart = async () => {
  Tutorial.start({}); for (let k = 0; k < 40 && App.view.phase !== 'fight'; k++) __step(0.25);
  await new Promise(r => setTimeout(r, 250)); const fake = { held: {}, move: { x: 0, y: 0 } }; Input.players[0].cpu = fake; window.__fake = fake; return Tutorial._t.S.i;
};
window.__tutRun = async (id, secs, script) => {
  const T = Tutorial._t; T.jump(id);
  for (let k = 0; k < 40 && App.view.phase !== 'fight'; k++) __step(0.25);   // (a stage built again: its intro)
  await new Promise(r => setTimeout(r, 250));
  const S = T.S, m = S.m, L0 = S.i; Input.players[0].cpu = window.__fake; let done = false, notes = [];
  __step(secs, i => { const f = __pad(); f.cmd = null; if (S.i !== L0) return; if (S.ok) done = true; if (S.note && notes[notes.length - 1] !== S.note) notes.push(S.note.slice(0, 60)); script(i, f, m, m.fighters[0], m.fighters[1], S); });
  return { id, lesson: S.i === L0 ? id : 'moved on', got: S.got, done: done || !!S.ok, walled: S.walled, notes: notes.slice(-3), errs: __errs.slice(0, 2) };
};
