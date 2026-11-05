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
