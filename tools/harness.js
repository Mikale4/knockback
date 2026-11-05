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
