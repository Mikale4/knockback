/* ============================================================================
   trials.js -- COMBO TRIALS: every fighter's combos, one at a time.

   Seven trials per line, on its BASE move list (a mint figure of that line:
   its own string, launcher, KNOCK, Special and Legend Art, never a mixed
   string): the string, the pause combo, the launcher into an air combo, the
   KNOCK//BACK with the rebound, a Special cancel, the line's signature trick,
   and a Legend Art finish. A panel lists the steps in your own keys; each
   one ticks off as it lands, and the trial resets if the combo drops or a
   wrong move comes out. DEMO plays it for you (the same bot proves every
   trial can be done).

   A step is { m: move id, k: the button, t: how } or { e: an event, k }:
     t: '' | 'pause' (let the last move finish, a beat, then press) |
        'toward' (hold the stick at them) | 'hold' (hold it: a wind-up) |
        'beat' (on the music's beat) | 'mash' | 'dash' (Dodge then Light) |
        'nohit' (it only has to come out)
     e: 'jump' | 'bounce' (off the wall) | 'airdash' | 'vault' |
        'super' (the Legend Art starts) | 'art' (it catches them)

     Trials.open() (the fighter select)   Trials.start(line, i)
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const chain = root => { const o = []; let id = root; while (id && o.length < 8) { o.push(id); id = (KB.MOVES[id].nx || {}).l; } return o; };

  /* -------------------------------------------------------- the trials */
  const S0 = line => KB.stats(KB.mintBuild(line, 0));
  const L = id => ({ m: id, k: 'light' });
  function build(line) {
    const S = S0(line), g = chain(S.light), a = chain(S.air), P = KB.MOVES[g[1]].nx && KB.MOVES[g[1]].nx.p;
    const air = a.map(id => ({ m: id, k: 'light', t: 'air' }));
    const sp = KB.MOVES[S.special], spStep = { m: S.special, k: 'special', t: ['buff', 'summon'].includes(sp.type) ? 'nohit' : '' };
    const T = [];
    T.push({ name: 'The string', stars: 1, note: 'Your Light string, start to finish: press again as each hit lands.', steps: g.map(L) });
    if (P) T.push({ name: 'Pause combo', stars: 2, note: 'Two hits, then let the second one finish, wait a beat, and press Light again for the pause branch.', steps: [L(g[0]), L(g[1]), { m: P, k: 'light', t: 'pause', nohit: ['buff', 'summon'].includes(KB.MOVES[P].type) }] });
    T.push({ name: 'Launcher', stars: 2, note: 'Heavy mid-string (stick let go) launches. Jump straight after it and finish in the air.', steps: [L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, ...air] });
    T.push({ name: 'KNOCK//BACK', stars: 3, wall: true, note: 'Toward + Heavy mid-string KNOCKS them into the wall. Catch them on the rebound.', steps: [L(g[0]), L(g[1]), { m: S.heavy, k: 'heavy', t: 'toward' }, { e: 'bounce' }, L(g[0]), L(g[1])] });
    T.push({ name: 'Special cancel', stars: 2, note: 'A Special comes straight out of a hit: cancel the string into ' + sp.name + '.', steps: [L(g[0]), L(g[1]), spStep] });
    const sig = SIG[line] && SIG[line](S, g, a, air);
    if (sig) T.push(Object.assign({ stars: 3 }, sig));
    T.push({ name: 'Legend Art finish', stars: 4, note: 'With full Hype, a Legend Art comes straight out of a hit too.', steps: [L(g[0]), L(g[1]), { e: 'super', k: 'super' }, { e: 'art' }] });
    // per-line changes to the common ones
    if (FIX[line]) FIX[line](T, S, g, a, air);
    return T;
  }
  /* each line's signature trick */
  const SIG = {
    samurai: (S, g, a, air) => ({ name: 'Swallow\'s flight', note: 'The whole string: Rising Cut sends them up. Jump after them for the air string and Tsubame Gaeshi.', steps: [...g.map(L), { e: 'jump', k: 'jump' }, ...air] }),
    knight: (S, g, a, air) => ({ name: 'Judgment day', note: 'Judgment spikes them into the floor; catch the ground bounce and launch with Shield Upper.', steps: [...g.map(L), L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, air[0]] }),
    pirate: (S, g) => ({ name: 'Dirty fighting', note: 'Pause after the Backcut to throw sand: they stand there DIZZY. Then the whole string.', steps: [L(g[0]), L(g[1]), { m: 'cuP', k: 'light', t: 'pause' }, ...g.map(L)] }),
    monk: (S, g, a, air) => ({ name: 'Flow state', note: 'Mash Light through the Flurry, then launch with Rising Palm and follow them up.', steps: [L(g[0]), L(g[1]), { m: g[2], k: 'light', t: 'mash' }, { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, ...air] }),
    viking: (S, g) => ({ name: 'Wind-up', note: 'HOLD Light to wind up the first swing (armour while you hold); a full wind-up crumples them. Then finish the string.', steps: [{ m: g[0], k: 'light', t: 'hold' }, L(g[1]), L(g[2])] }),
    ninja: (S, g, a, air) => ({ name: 'Shadow Dash', note: 'In the air, Dodge after a hit dashes at them: then a fresh air string.', steps: [L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, air[0], { e: 'airdash', k: 'dodge' }, ...air] }),
    summoner: (S, g) => ({ name: 'Sic \'Em', note: 'Call your imps first, then the string: Sic \'Em sends every imp in.', steps: [{ m: S.special, k: 'special', t: 'nohit' }, ...g.map(L)] }),
    paladin: (S, g) => ({ name: 'Hammer and shield', note: 'The pause branch crumples them and heals you. Then the whole string while they fold.', steps: [L(g[0]), L(g[1]), { m: 'paP', k: 'light', t: 'pause' }, ...g.map(L)] }),
    dragoon: (S, g, a, air) => ({ name: 'Skyborne', note: 'In the air, Jump off a hit for a fresh jump and a fresh air string.', steps: [L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, air[0], { e: 'vault', k: 'jump' }, ...air] }),
    bard: (S, g) => ({ name: 'On the beat', note: 'Start the string ON the music\'s beat (the ring under your feet pulses with it) for +30% damage.', steps: [{ m: g[0], k: 'light', t: 'beat' }, ...g.slice(1).map(L)] }),
  };
  /* where a line's own rules change a common trial */
  const FIX = {
    // the Flintlock: the first Heavy of a combo is a Quick Shot, so the launcher comes after one
    pirate: (T, S, g, a, air) => {
      const t = T.find(x => x.name === 'Launcher');
      t.name = 'Smoke and steel'; t.stars = 3; t.note = 'The first Heavy in a combo is a Quick Shot; the string starts again, and the next Heavy launches.';
      t.steps = [L(g[0]), L(g[1]), { m: S.gunCancel, k: 'heavy' }, L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, ...air];
      const s = T.find(x => x.name === 'Special cancel');
      s.name = 'Gunslinger'; s.note = 'Quick Shot mid-string, then the whole string again.'; s.steps = [L(g[0]), L(g[1]), { m: S.gunCancel, k: 'heavy' }, ...g.map(L)];
    },
    // the Chain Hook drags them in rather than out: the Ninja's wall combo starts with the dash attack
    ninja: (T, S, g) => {
      const t = T.find(x => x.name === 'KNOCK//BACK');
      t.note = 'Dodge at them, then Light: Shadow Kick sends them into the wall. Catch them on the rebound.';
      t.steps = [{ m: S.dashAtk, k: 'light', t: 'dash' }, { e: 'bounce' }, L(g[0]), L(g[1])];
    },
  };
  const TRIALS = {}; const all = () => { if (!TRIALS.samurai) for (const l of KB.LINE_ORDER) TRIALS[l] = build(l); return TRIALS; };

  /* ------------------------------------------------- saved progress */
  const done = () => { const S = Auth.S; if (!S) return {}; return S.trials || (S.trials = {}); };
  const cleared = (line, i) => !!(done()[line] || {})[i];
  const clearedCount = line => Object.keys(done()[line] || {}).length;

  /* ----------------------------------------------- the keys a step names */
  const touching = () => U.touch && !Input.usingPad(0);
  const TOUCH = { light: 'LIGHT', heavy: 'HEAVY', guard: 'GUARD', special: 'SPECIAL', snap: 'SNAP', super: 'SUPER', toss: 'TOSS', jump: 'JUMP', dodge: 'DODGE' };
  const K = a => el('kbd', null, touching() ? TOUCH[a] : Input.prompt(0, a) || '?');
  function stepName(s) {
    if (s.e === 'jump') return 'Jump after them';
    if (s.e === 'bounce') return 'Off the wall!';
    if (s.e === 'airdash') return 'Shadow Dash';
    if (s.e === 'vault') return 'Vault';
    if (s.e === 'super') return 'Legend Art';
    if (s.e === 'art') return 'It catches them';
    return KB.MOVES[s.m].name;
  }
  function stepKeys(s) {
    if (s.e === 'bounce' || s.e === 'art') return [el('i', null, s.e === 'bounce' ? 'they hit the wall' : 'the cinematic')];
    if (s.t === 'pause') return [el('i', null, 'pause, '), K(s.k)];
    if (s.t === 'toward') return [el('i', null, '→ '), K(s.k)];
    if (s.t === 'hold') return [el('i', null, 'hold '), K(s.k)];
    if (s.t === 'beat') return [K(s.k), el('i', null, ' on the beat ♪')];
    if (s.t === 'mash') return [K(s.k), el('i', null, ' mash')];
    if (s.t === 'dash') return [K('dodge'), el('i', null, ' › '), K(s.k)];
    if (s.t === 'air') return [el('i', null, 'air '), K(s.k)];
    return [K(s.k)];
  }

  /* ------------------------------------------------------- the runner */
  let R = null;   // { m, line, i, trial, at (next step), combo, state: 'go'|'ok'|'fail', demo, panel, off }
  const me = () => R.m.fighters[0], dummy = () => R.m.fighters[1];
  function reset(why) {
    R.at = 0; R.combo = null; R.state = 'go'; R.started = {};
    const a = me(); a.spReady = 0; a.uses = a.st.uses; a.hype = 100; a.burst = 100;
    R.m.training.spot = R.trial.wall ? 'wall' : 'centre'; R.m.training.lastSpot = R.m.training.spot; R.m.trainReset();
    if (!R.trial.wall) { const [p, d] = R.m.fighters; p.pos.set(-1.3, 0, 0.6); d.pos.set(0, 0, 0.6); p.yaw = Math.PI / 2; d.yaw = -Math.PI / 2; }
    for (const mn of R.m.minions.slice()) { if (mn.obj.parent) mn.obj.parent.remove(mn.obj); } R.m.minions.length = 0;
    R.note = why || ''; draw();
  }
  function advance() {
    R.at++;
    if (R.at >= R.trial.steps.length) return success();
    draw();
  }
  function success() {
    R.state = 'ok'; SFX.play('win'); HUD.banner('TRIAL CLEAR', 'fight', 1.1);
    const first = !cleared(R.line, R.i);
    if (!R.demo) { (done()[R.line] = done()[R.line] || {})[R.i] = Date.now(); Auth.save(); if (first && window.Rewards) Rewards.record({ trials: 1 }); }
    R.note = R.demo ? 'That\'s how it goes. Your turn!' : first ? 'Cleared! On to the next one.' : 'Cleared again.';
    stopDemo(); draw();
    const m = R.m, i = R.i, wasDemo = R.wasDemo;
    setTimeout(() => { if (!R || R.m !== m || R.i !== i) return; if (!wasDemo && R.i + 1 < R.list.length) go(R.i + 1); else reset(); }, 1800);
  }
  function fail(why) {
    if (R.state !== 'go' || R.at === 0) return;
    R.state = 'fail'; SFX.play('back'); stopDemo();
    const m = R.m, i = R.i; R.note = why; draw();
    setTimeout(() => { if (R && R.m === m && R.i === i) reset(why + ' Try again.'); }, 900);
  }
  /* what counts: every event the fight puts out, checked against the next step */
  function hear(k, d) {
    if (!R || R.state !== 'go' || App.view !== R.m) return;
    const a = me(), s = R.trial.steps[R.at]; if (!s) return;
    if (k === 'move' && d.f === a) {
      if (s.m === d.id) { R.started[R.at] = true; if (s.t === 'nohit' || s.nohit) { if (R.at === 0) R.combo = 'free'; advance(); } return; }
      // the moves of the step just done may still be ending; anything else is the wrong move
      const prev = R.trial.steps[R.at - 1];
      if (R.at > 0 && !(prev && prev.m === d.id)) fail('Wrong move: ' + KB.MOVES[d.id].name + '.');
      return;
    }
    if (k === 'hit' && d.att === a && (d.r === 'hit' || d.r === 'ko') && s.m && d.mv && d.mv.id === s.m && s.t !== 'nohit' && !s.nohit) {
      if (s.t === 'hold' && !((d.o.charge || 0) >= 0.45)) { R.note = 'Hold Light longer: a full wind-up (it glows red).'; draw(); return; }
      if (s.t === 'beat' && !a.beatOn) { fail('Not on the beat.'); return; }
      if (!R.combo || R.combo === 'free') R.combo = d.vic.combo;
      else if (d.vic.combo !== R.combo) { fail('The combo dropped.'); return; }
      advance(); return;
    }
    if (k === 'jump' && d.f === a && s.e === 'jump') return advance();
    if (k === 'bounce' && d.by === a && s.e === 'bounce') return advance();
    if (k === 'airdash' && d.f === a && s.e === 'airdash') return advance();
    if (k === 'vault' && d.f === a && s.e === 'vault') return advance();
    if (k === 'super' && d.f === a && s.e === 'super') return advance();
    if (k === 'art' && d.f === a && s.e === 'art') return advance();
  }
  function tick(dt) {
    if (!R || App.view !== R.m) return;
    const a = me(), d = dummy(), s = R.trial.steps[R.at];
    a.hp = a.maxHp; d.hp = Math.max(d.hp, d.maxHp * 0.5); a.hype = R.at === 0 || (s && s.e === 'super') ? 100 : a.hype;
    if (Input.keyDown('KeyR')) { if (!R.rHeld) { R.rHeld = true; stopDemo(); reset(); return; } } else R.rHeld = false;
    if (R.state !== 'go') return;
    // the combo has to keep going (a Legend Art has its own catch)
    const inArt = s && (s.e === 'art') || (a.move && a.move.type === 'super');
    if (R.at > 0 && R.combo && R.combo !== 'free' && !d.comboing && !inArt && !(s && s.e === 'bounce' && d.state === 'tumble')) fail('The combo dropped.');
    if (R.demo) demo(dt);
  }

  /* ------------------------------------------------------------ DEMO
     a bot that plays the next step: walk in, press the step's button the way it
     wants (in time, toward them, held, on the beat...), then the next */
  let fake = null;
  function startDemo() { if (!R) return; reset(); R.demo = true; R.wasDemo = true; R.dk = 0; fake = { held: {}, move: { x: 0, y: 0 } }; Input.players[0].cpu = fake; draw(); }
  function stopDemo() { if (!R || !R.demo) return; R.demo = false; if (Input.players[0].cpu === fake) Input.players[0].cpu = null; fake = null; setTimeout(() => { if (R) R.wasDemo = false; }, 1900); }
  function demo(dt) {
    const a = me(), d = dummy(), s = R.trial.steps[R.at], m = R.m; if (!s || !fake) return;
    for (const k in fake.held) fake.held[k] = false; fake.move.x = 0; fake.move.y = 0;
    R.dk = (R.dk || 0) + 1; const tap = R.dk % 3 === 0;
    const dx = d.pos.x - a.pos.x, dz = d.pos.z - a.pos.z, dist = Math.hypot(dx, dz), dy = d.pos.y - a.pos.y;
    const toward = (k) => { fake.move.x = dx / (dist || 1) * (k || 1); fake.move.y = -dz / (dist || 1) * (k || 1); };
    const busy = a.state === 'attack' && !a.moveHit;
    const press = b => { if (tap) fake.held[b] = true; };
    if (s.e === 'bounce' || s.e === 'art') return;
    if (s.e === 'jump') return press('jump');
    if (s.e === 'airdash') { toward(); if (a.state === 'attack' && a.moveHit) press('dodge'); return; }
    if (s.e === 'vault') { if (a.state === 'attack' && a.moveHit) press('jump'); return; }
    if (s.e === 'super') { if (R.at === 0 || (a.state === 'attack' && a.moveHit)) press('super'); return; }
    // a move step (once its move is out, no more presses: a spare one would be the next move)
    if (R.started[R.at] && a.state === 'attack' && a.move && a.move.id === s.m && s.t !== 'mash' && s.t !== 'hold') return;
    if (s.t === 'air') { if (a.grounded && a.state !== 'attack') return; if (dist > 0.8) toward(0.6); if (a.state === 'air' || (a.state === 'attack' && a.moveHit)) if (Math.abs(dy) < 1.5 && dist < 2.2) press('light'); return; }
    if (s.t === 'pause') { if (a.pauseWin && m.time >= a.pauseWin.from + 0.02) fake.held.light = true; return; }   // (pressed before the window opens, it would start the string over)
    if (s.t === 'dash') { if (a.state === 'dodge') { if (a.stateT > 0.13) press('light'); return; } if (dist > 1.8 && a.state !== 'attack') toward(); else { toward(); press('dodge'); } return; }
    if (s.t === 'hold') { if (a.state === 'attack' && a.move && a.move.id === s.m) { fake.held.light = a.charge < 0.5; return; } if (dist > 1.4) { toward(); return; } fake.held.light = true; return; }
    if (s.t === 'beat') { if (dist > 1.4) { toward(); return; } if (Music.beat(m).near) fake.held.light = true; return; }
    if (s.t === 'mash') { press('light'); return; }
    // walk in for a fresh start, or to catch a rebound; then press when the last hit has landed
    const fresh = a.state !== 'attack';
    if (d.state === 'tumble') {
      // catching a rebound: swing so the hit lands as they come down through hitting height,
      // and until then stand one reach short of where they'll land (never walk mid-move)
      const mv = KB.MOVES[s.m], tH = (mv.su || 0.08) + 0.06, reach = mv.reach || 1.1;
      const yh = d.pos.y + d.vel.y * tH - 15 * tH * tH, xh = d.pos.x + d.vel.x * tH, zh = d.pos.z + d.vel.z * tH, dh = Math.hypot(xh - a.pos.x, zh - a.pos.z);
      const canLink = a.moveHit && a.move && ((a.move.nx || {}).l === s.m || s.k === 'heavy' || s.k === 'special' || s.k === 'super');   // (a press it can't cancel into waits for the move to end)
      if ((fresh || canLink) && yh > 0.15 && yh < 1.5 && dh > 0.2 && dh < reach + 0.6) { if (s.k !== 'heavy' || s.t === 'toward') toward(0.3); press(s.k); return; }   // (a plain Heavy wants the stick let go: tilted, it's the KNOCK)
      if (!fresh) return;
      const g = 30, vy = d.vel.y, y = Math.max(0, d.pos.y), tl = (vy + Math.sqrt(vy * vy + 2 * g * y)) / g;
      const lx = d.pos.x + d.vel.x * tl, lz = d.pos.z + d.vel.z * tl, r0 = reach * 0.85;
      const ox = a.pos.x - lx, oz = a.pos.z - lz, ol = Math.hypot(ox, oz) || 1, sx = lx + ox / ol * r0, sz = lz + oz / ol * r0;
      const mx = sx - a.pos.x, mz = sz - a.pos.z, ml = Math.hypot(mx, mz);
      if (ml > 0.25) { fake.move.x = mx / ml; fake.move.y = -mz / ml; }
      return;
    }
    if (fresh && dist > 1.5 && !(s.k === 'special')) { toward(); return; }
    if (busy) return;
    if (s.t === 'toward') toward();
    press(s.k);
  }

  /* -------------------------------------------------------- the panel */
  function draw() {
    if (!R || !R.panel) return;
    const t = R.trial, P = R.panel; P.innerHTML = '';
    const ok = R.state === 'ok', bad = R.state === 'fail';
    P.className = 'trialp' + (ok ? ' ok' : bad ? ' bad' : '');
    P.append(...[
      el('div', { class: 'th' }, el('span', null, 'COMBO TRIALS · ' + KB.LINES[R.line].name), el('span', { class: 'stars' }, '★'.repeat(t.stars) + '☆'.repeat(5 - t.stars))),
      el('h3', null, (R.i + 1) + ' / ' + R.list.length + '  ' + t.name + (cleared(R.line, R.i) ? '  ✓' : '')),
      el('p', { class: 'tnote' }, t.note),
      el('ol', { class: 'tsteps' }, ...t.steps.map((s, k) => el('li', { class: k < R.at || ok ? 'done' : k === R.at && R.state === 'go' ? 'now' : '' },
        el('b', null, stepName(s)), el('span', null, ...stepKeys(s))))),
      R.note ? el('div', { class: 'tmsg' + (bad ? ' bad' : ok ? ' ok' : '') }, R.note) : null,
      R.demo ? el('div', { class: 'tmsg demo' }, '▶ DEMO: watch, then try it') : null,
      el('div', { class: 'trow' },
        el('button', { disabled: R.i === 0 || null, onclick: () => { SFX.play('ui'); go(R.i - 1); } }, '◂'),
        el('button', { onclick: () => { SFX.play('ui'); if (R.demo) { stopDemo(); reset(); } else startDemo(); } }, R.demo ? 'STOP' : 'DEMO'),
        el('button', { onclick: () => { SFX.play('ui'); stopDemo(); reset(); } }, 'RESET'),
        el('button', { disabled: R.i + 1 >= R.list.length || null, onclick: () => { SFX.play('ui'); go(R.i + 1); } }, '▸'),
        el('button', { class: 'exit', onclick: () => { SFX.play('back'); Trials.quit(); } }, 'EXIT'))].filter(Boolean));   // (an empty row is null: DOM append would print it)
  }
  function go(i) { if (!R) return; stopDemo(); R.i = i; R.trial = R.list[i]; reset(); }

  /* ------------------------------------------------ start, leave, select */
  const Trials = {};
  Trials.list = line => all()[line];
  Trials.start = (line, i) => {
    Trials.stop();
    const list = all()[line];
    App.startMatch({ mode: 'training', trials: true, builds: [KB.mintBuild(line, 0), KB.mintBuild('knight', 0)], cpu: [null, null], arena: 'shelf', wins: 99, time: 999, bonus: true });
    const m = App.view; m.training.meter = true; m.training.dummy = 'stand';
    R = { m, line, list, i: i == null ? Math.max(0, list.findIndex((t, k) => !cleared(line, k))) : i, at: 0, state: 'go', note: '', started: {} };
    if (R.i < 0) R.i = 0;
    R.trial = list[R.i];
    R.panel = el('div', { class: 'trialp' }); U.$('hud').append(R.panel);
    R.off = m.on(hear); m.tick = tick;
    const wait = () => { if (!R || R.m !== m || App.view !== m) return; if (m.phase === 'fight') reset(); else setTimeout(wait, 100); };
    wait();
  };
  Trials.stop = () => { if (!R) return; stopDemo(); if (R.off) R.off(); if (R.panel) R.panel.remove(); R = null; };
  Trials.running = () => !!R;
  Trials.quit = () => { const line = R && R.line; Trials.stop(); App.setView(null); Trials.open(line); };
  /* the select screen: every fighter, and how far you've got */
  Trials.open = focus => {
    const { btn, topbar } = Menu.ui;
    const total = KB.LINE_ORDER.reduce((n, l) => n + all()[l].length, 0), got = KB.LINE_ORDER.reduce((n, l) => n + clearedCount(l), 0);
    App.screen(el('div', { class: 'screen trials' }, topbar('COMBO TRIALS', () => Menu.hub()),
      el('div', { class: 'panel trialsel' },
        el('p', { class: 'note' }, 'Every fighter\'s combos on its own move list, step by step. DEMO shows you any of them. ' + got + ' / ' + total + ' cleared.'),
        el('div', { class: 'tgrid' }, ...KB.LINE_ORDER.map(l => {
          const L = KB.LINES[l], n = all()[l].length, c = clearedCount(l);
          return el('button', { class: 'tcard' + (c >= n ? ' full' : '') + (l === focus ? ' focus' : ''), style: { '--lc': L.css }, onclick: () => { SFX.play('ok'); Trials.start(l); } },
            el('img', { src: Models.figIcon(KB.mintBuild(l, 0)), alt: '' }), el('b', null, L.name), el('small', null, c + ' / ' + n + (c >= n ? ' ✓' : '')),
            el('div', { class: 'tbar' }, el('i', { style: { width: (100 * c / n) + '%' } })));
        })))));
  };
  Trials.all = all; Trials.cleared = cleared;
  window.Trials = Trials;
})();
