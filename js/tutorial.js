/* ============================================================================
   tutorial.js -- the TUTORIAL: an interactive one, played for real.

   A fight in the Toy Shelf against a Knight dummy, where nothing happens
   until you do it. A card over the fight gives one lesson at a time, in your
   own keys (or your controller's buttons, or the touch buttons), and the next
   opens once you have done it (or SKIP). The dummy only swings when a lesson
   wants it to, and nobody can lose: you are topped up, and the dummy cannot
   fall before the last lesson, where it finally fights back.

   New collectors get it right after opening their first figure (menu.js);
   it is in the hub (TUTORIAL) and HOW TO PLAY any time after.

     Tutorial.start({ onboard })   Tutorial.done()
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const Tutorial = {};
  let S = null;   // the tutorial running: { m, i, got, note, ok, card, off, onboard, ... }

  /* ---------------------------------------------------- the keys it names */
  const TOUCH = { light: 'LIGHT', heavy: 'HEAVY', guard: 'GUARD', special: 'SPECIAL', snap: 'SNAP', super: 'SUPER', toss: 'TOSS', jump: 'JUMP', dodge: 'DODGE' };
  const touching = () => U.touch && !Input.usingPad(0);
  const K = a => el('kbd', null, touching() ? TOUCH[a] || a : Input.prompt(0, a) || '?');
  const moveKeys = () => {
    if (touching()) return ['the stick (put your left thumb anywhere on the left of the screen)'];
    if (Input.usingPad(0)) return ['the left stick'];
    return ['up', 'left', 'down', 'right'].map(d => el('kbd', null, Input.keyName((Input.binds[0][d] || [])[0]) || '?'));
  };

  /* ---------------------------------------------------------- the world */
  const me = () => S.m.fighters[0];
  const dummy = () => S.m.fighters[1];
  const ai = () => S.m.ai[1];
  const W = () => S.m.arena.W;
  /* put both figures somewhere (x along the arena, the dummy facing you) */
  function place(px, dx) {
    const a = me(), d = dummy();
    for (const [f, x] of [[a, px], [d, dx]]) { f.pos.set(x, 0, 0.6); f.vel.set(0, 0, 0); f.grounded = true; f.move = null; f.held = null; f.setState('idle'); f.trailR.pts.length = 0; f.trailL.pts.length = 0; }
    a.yaw = Math.sign(dx - px) * Math.PI / 2; d.yaw = -a.yaw;
  }
  /* the dummy swings (n presses of a button, gap apart), walking up to you first */
  const cue = (n, btn, gap) => { const A = ai(); if (!A.cue) A.cue = { n: n || 1, btn: btn || 'light', gap: gap || 0.16, next: S.m.time + 0.15 }; };
  const stringLen = () => { let id = me().lightRoot(), n = 0; while (id && n < 9) { n++; id = (KB.MOVES[id].nx || {}).l; } return n; };
  const blocked = r => r === 'blocked' || r === 'jguard' || r === 'gcrush';
  const nm = id => el('b', null, id && KB.MOVES[id] ? KB.MOVES[id].name : '?');
  const autoOf = () => KB.MOVES[me().st.heavy] && KB.MOVES[me().st.heavy].auto;   // (a Heavy auto combo: heavies.js)
  const autoEnd = () => KB.MOVES[autoOf()].auto;

  /* ---------------------------------------------------------- the lessons
     text: what the card says, need: how many to do, on(kind, data): what
     counts (true for one more, or a number for the progress itself),
     tick(dt): each frame while it is open, setup(): as it opens */
  const LESSONS = [
    {
      id: 'move', title: 'MOVE', need: 1,
      text: () => ['Walk with ', ...moveKeys(), '. Walk into the yellow ring.'],
      setup() { place(-3, 3); S.spot = new THREE.Vector3(-1, 0, -2.2); S.ringT = 0; ai().dummy = 'stand'; },
      tick(dt) {
        S.ringT -= dt; if (S.ringT <= 0) { S.ringT = 0.55; FX.ring(S.spot.clone().setY(0.06), { r1: 0.9, life: 0.5, color: 0xffd23c }); }
        if (Math.hypot(me().pos.x - S.spot.x, me().pos.z - S.spot.z) < 0.8) return true;
      },
    },
    {
      id: 'jump', title: 'JUMP', need: 2,
      text: () => ['Press ', K('jump'), ' to jump, then ', K('jump'), ' again in the air for a second jump.'],
      on(k, d) { if (k === 'jump' && d.f === me()) return d.air ? (S.got >= 1 ? 2 : 0) : 1; },
    },
    {
      id: 'string', title: 'YOUR STRING', need: 4,
      setup() { this.need = stringLen(); place(-1.4, 0); },
      text: () => ['Walk up to the dummy and tap ', K('light'), ' again and again. Your R-arm\'s string is ', el('b', null, stringLen() + ' hits'), ': press again as each one lands.'],
      on(k, d) {
        if (k === 'hit' && d.att === me() && d.r === 'hit') return Math.min(this.need, d.vic.combo.hits);
      },
      tick() { const v = dummy(); if (S.got > 0 && !v.comboing && me().state !== 'attack') { S.got = 0; S.note = 'The string dropped. Start it again, and keep pressing as the hits land.'; return 'redraw'; } },
    },
    {
      id: 'launch', title: 'LAUNCHER', need: 3,
      text: () => S.got < 1 ? ['Two ', K('light'), ', then ', K('heavy'), ' with the stick let go: that is the LAUNCHER, it pops them up. (Holding toward them makes it the KNOCK instead: that comes next.)']
        : S.got < 2 ? ['Now ', K('jump'), ' straight away: you leap up after them.']
          : ['And ', K('light'), ' in the air: an air combo.'],
      setup() { place(-1.4, 0); },
      on(k, d) {
        if (k === 'hit' && d.att === me() && d.r === 'hit' && d.o.kind === 'launch') return 1;
        if (k === 'jump' && d.f === me() && d.follow && S.got >= 1) return 2;
        if (k === 'hit' && d.att === me() && d.r === 'hit' && d.o.kind === 'air' && S.got >= 2) return 3;
      },
      tick() { if (S.got > 0 && !dummy().comboing && me().grounded && me().state !== 'attack') { S.got = 0; S.note = 'They landed. Launch them again: two Lights, then Heavy, then Jump straight away.'; return 'redraw'; } },
    },
    {
      id: 'knock', title: 'KNOCK//BACK', need: 2,
      text: () => S.got < 1 ? ['The wall is the whole game. Two ', K('light'), ', then hold the stick TOWARD them and press ', K('heavy'), ': the KNOCK throws them into the wall, and they BOUNCE back.']
        : ['They are bouncing back at you, still helpless. Hit them again: ', K('light'), ' as they come back.'],
      setup() { place(W() - 4.4, W() - 2.8); },
      on(k, d) {
        if (k === 'bounce' && d.by === me()) return Math.max(S.got, 1);
        if (k === 'hit' && d.att === me() && d.r === 'hit' && S.got >= 1 && d.vic.combo.bounces >= 1) return 2;
      },
      tick() { if (S.got === 1 && !dummy().comboing) { S.got = 0; S.note = 'Missed the rebound. Knock them into the wall again, and be ready as they come back.'; place(W() - 4.4, W() - 2.8); return 'redraw'; } },
    },
    {
      id: 'chase', title: 'TECH CHASE', need: 1,
      text: () => ['KNOCK them again (two ', K('light'), ', then toward them + ', K('heavy'), '), and while they fly, hold the stick TOWARD them and press ', K('snap'), ': for half a bar of Hype your dash runs them down, a step short, so the combo goes on. You have the Hype.'],
      setup() { place(-4, -2.6); },
      tick() { const a = me(); if (a.hype < 60 && !a.chasing) a.hype = 100; },
      on(k, d) {
        if (k === 'chase' && d.f === me()) return true;
        if (k === 'snap' && d.f === me()) S.note = 'That was a plain Snap: hold the stick toward them as you press it, while they\'re still flying.';
      },
    },
    {
      id: 'guard', title: 'GUARD', need: 2,
      text: () => ['The dummy is going to swing at you. Hold ', K('guard'), ' to block. (Tap it just before a hit lands for a JUST GUARD.)'],
      setup() { place(-1.6, 0); S.cueAt = S.m.time + 0.8; },
      tick() { if (S.m.time > S.cueAt && dummy().state !== 'attack') { cue(1); S.cueAt = S.m.time + 1.6; } },
      on(k, d) {
        if (k !== 'hit' || d.vic !== me()) return;
        if (blocked(d.r)) return true;
        if (d.r === 'hit') { S.note = 'Hold Guard BEFORE the swing reaches you.'; }
      },
    },
    {
      id: 'dodge', title: 'DODGE', need: 2,
      text: () => ['Press ', K('dodge'), ' as it swings: for a moment nothing can touch you. Dodge through two swings.'],
      setup() { place(-1.6, 0); S.cueAt = S.m.time + 0.8; },
      tick() { if (S.m.time > S.cueAt && dummy().state !== 'attack') { cue(1); S.cueAt = S.m.time + 1.6; } },
      on(k, d) {
        if (k === 'evade' && d.f === me()) return true;
        if (k === 'hit' && d.vic === me() && d.r === 'hit') S.note = 'Dodge a little later, right as the swing comes.';
      },
    },
    {
      id: 'charge', title: 'ARMOURED CHARGE', need: 1,
      text: () => ['Hold ', K('heavy'), ' to charge your Heavy: it hits harder, and while you hold it you take ONE hit without flinching. Hold Heavy now: the dummy will swing at you while you charge.'],
      setup() { place(-1.3, 0); S.swung = false; },
      tick() {
        // the dummy swings the moment you start charging (so a Heavy that's a shot doesn't send it away first)
        const a = me(), v = dummy(), charging = a.state === 'attack' && a.kind === 'heavy' && a.charge > 0.02;
        if (charging && !S.swung && v.state !== 'attack') { cue(1, 'light', 0.1); S.swung = true; }
        if (!charging && a.state !== 'attack') S.swung = false;
        if (!charging && a.state !== 'attack' && v.state !== 'attack' && Math.hypot(v.pos.x - a.pos.x, v.pos.z - a.pos.z) > 3) place(-1.3, 0);   // (back in close)
      },
      on(k, d) {
        if (k === 'hit' && d.vic === me() && d.r === 'armor' && me().kind === 'heavy') return true;
        if (k === 'hit' && d.vic === me() && d.r === 'hit') S.note = 'Start holding Heavy a moment before the swing reaches you, and keep holding it.';
      },
    },
    {
      id: 'auto', title: 'AUTO COMBO', need: 1, skip: () => !autoOf(),
      text: () => ['Your Heavy has an AUTO COMBO: press ', K('heavy'), ', then ', K('heavy'), ' again before the first one lands: ', nm(me().st.heavy), ' \u203a ', nm(autoOf()), ' \u203a ', nm(autoEnd()), ', the last one a KNOCK. (One press on its own is still the KNOCK.)'],
      setup() { place(-1.4, 0); },
      on(k, d) { if (k === 'move' && d.f === me() && d.id === autoEnd()) return true; },
    },
    {
      id: 'grab', title: 'GRAB AND THROW', need: 3,
      text: () => S.got < 1 ? ['The dummy is guarding now. Guard beats your string, but a GRAB beats guard: hold ', K('guard'), ' and press ', K('light'), '.']
        : S.got < 2 ? ['Got them. ', K('light'), ' while you hold them: a pummel.']
          : ['Now throw: tilt the stick any way (behind you is the strongest), or ', K('jump'), ' to throw up, or ', K('heavy'), ' alone to slam them down.'],
      setup() { place(-1.4, 0); ai().dummy = 'guard'; },
      on(k, d) {
        if (k === 'grab' && d.f === me()) return Math.max(S.got, 1);
        if (k === 'hit' && d.att === me() && d.o.pummel && S.got >= 1) return 2;
        if (k === 'throw' && d.f === me() && S.got >= 1) return 3;
      },
      done() { ai().dummy = 'stand'; },
    },
    {
      id: 'special', title: 'SPECIAL', need: 1,
      text: () => ['Your HEAD gives you a Special: ', el('b', null, KB.MOVES[me().st.special].name), '. Press ', K('special'), '. (', el('b', null, me().st.uses + ' uses'), ' a round, shared with the three Specials that come next; used ones come back with time.)'],
      setup() { place(-2.4, 0); },
      tick() { const a = me(); if (a.uses < 1) a.uses = a.st.uses; a.spReady = 0; },
      on(k, d) { if (k === 'move' && d.f === me() && d.kind === 'special') return true; },
    },
    {
      id: 'cmd', title: 'COMMAND SPECIALS', need: 3,
      text: () => { const C = me().st.cmd || {}; return ['Special takes the stick too: at rest it\u2019s your neutral Special, and three more. ',
        el('b', null, '\u2190 / \u2192'), ' + ', K('special'), ': ', nm(C.qcf), ' (the side Special: you face the way you press). ', el('b', null, '\u2191'), ' + ', K('special'), ': ', nm(C.dp), ' (the up Special: your way back to the stage). ', el('b', null, '\u2193'), ' + ', K('special'), ': ', nm(C.qcb), ' (the down Special). Do each one once.']; },
      setup() { place(-2.4, 0); S.motions = new Set(); },
      tick() { const a = me(); a.uses = a.st.uses; a.spReady = 0; },
      on(k, d) { if (k === 'motion' && d.f === me()) { S.motions.add(d.c); return S.motions.size; } },
    },
    {
      id: 'ammo', title: 'AMMO', need: 1, skip: () => !me().st.rounds,
      text: () => { const T = me().st; return ['Your weapon holds ', el('b', null, T.rounds + ' ' + T.ammo.toLowerCase()), ' (counted under SPECIAL). Fire until it\'s empty: it reloads for ', el('b', null, +T.reload.toFixed(1) + ' s'), ', and meanwhile ', K('heavy'), ' is the ', nm(T.dry.heavy), '.']; },
      setup() { place(-4, 0); me().rounds = me().st.rounds; me().reloadT = 0; },
      tick() { if (me().reloadT > 0) return true; },
    },
    {
      id: 'otg', title: 'OTG', need: 1,
      text: () => ['Knock them down (a Launcher, or a throw), and while they are lying on the floor, hit them with ', K('heavy'), ' or a dash attack (', K('dodge'), ' then ', K('light'), '). That picks them back up OFF THE GROUND, once a combo.'],
      setup() { place(-1.4, 0); },
      on(k, d) { if (k === 'otg' && d.att === me()) return true; },
    },
    {
      id: 'toss', title: 'PART TOSS', need: 1,
      text: () => ['Mid-combo, press ', K('toss'), ': you pull off one of your OWN parts and throw it. If it hits, the combo is EXTENDED and you can keep going (twice a combo). Go pick the part back up after!'],
      setup() { place(-1.4, 0); },
      on(k, d) { if (k === 'extend' && d.att === me()) return true; },
    },
    {
      id: 'burst', title: 'SPRING BURST', need: 1,
      text: () => ['Now YOU are the one being comboed. With your Burst gauge full (the blue bar), press ', K('snap'), ' while you are being hit: a Spring Burst blows them away.'],
      setup() { place(-1.4, 0); S.cueAt = S.m.time + 0.8; },
      tick() { const a = me(); a.burst = 100; if (S.m.time > S.cueAt && dummy().state !== 'attack' && !a.comboing) { cue(4, 'light', 0.18); S.cueAt = S.m.time + 2.2; } },
      on(k, d) { if (k === 'burst' && d.f === me()) return true; },
    },
    {
      id: 'super', title: 'LEGEND ART', need: 1,
      text: () => ['Hits build HYPE (the bar along the bottom). Yours is full: press ', K('super'), ' for your Legend Art, ', el('b', null, KB.MOVES[me().st.super].name), '.'],
      setup() { place(-2.4, 0); },
      tick() { const a = me(); if (!a.move || a.move.type !== 'super') a.hype = 100; },
      on(k, d) { if (k === 'super' && d.f === me()) { S.wait = 'super'; } },
      tick2() { if (S.wait === 'super' && !S.m.cine && !S.m.frozen && me().state !== 'attack') { S.wait = null; return true; } },
    },
    {
      id: 'finish', title: 'NOW FOR REAL', need: 1,
      text: () => ['That is everything. The dummy fights back now: knock it into the walls and finish it!'],
      setup() { place(-3, 3); const d = dummy(); d.hp = Math.round(d.maxHp * 0.45); ai().dummy = 'cpu'; ai().lv = 1; },
      tick() { if (dummy().hp <= 1) return true; },
    },
  ];

  /* ------------------------------------------------------------ the card */
  const mine = () => LESSONS.filter(l => !l.skip || !l.skip());   // (the lessons this figure gets)
  function draw(flash) {
    const L = LESSONS[S.i]; if (!S.card || !L) return;
    const c = S.card; c.innerHTML = ''; c.className = 'tut' + (flash ? ' ' + flash : '');
    c.append(...[
      el('div', { class: 'n' }, el('span', null, (S.onboard ? 'NEW COLLECTOR · ' : '') + 'TUTORIAL · LESSON ' + (mine().indexOf(L) + 1) + ' / ' + mine().length), el('i', null, touching() ? '' : 'Esc: pause')),
      el('h3', null, S.ok ? '✓ ' + L.title : L.title),
      el('p', null, ...(S.ok ? [S.ok] : L.text.call(L))),
      L.need > 1 ? el('div', { class: 'tpips' }, ...Array.from({ length: L.need }, (_, k) => el('i', { class: k < S.got ? 'on' : '' }))) : null,
      S.note && !S.ok ? el('div', { class: 'try' }, S.note) : null,
      el('div', { class: 'row' },
        el('button', { onclick: () => { SFX.play('ui'); next(); } }, L.id !== 'finish' ? 'SKIP LESSON ▸' : 'SKIP'),
        el('button', { onclick: () => { SFX.play('back'); leave(); } }, S.onboard ? 'SKIP THE TUTORIAL' : 'LEAVE'))].filter(Boolean));
  }
  const PRAISE = ['Nice!', 'Clean.', 'That\'s it.', 'Sharp.', 'Exactly.', 'Good.'];
  function complete() {
    const L = LESSONS[S.i]; let j = S.i + 1; while (LESSONS[j] && LESSONS[j].skip && LESSONS[j].skip()) j++; const nx = LESSONS[j];
    S.ok = U.pick(PRAISE) + ' ' + (nx ? 'Next: ' + nx.title.toLowerCase().replace(/^./, x => x.toUpperCase()) + '.' : 'Tutorial complete!');
    SFX.play('ok'); HUD.banner(L.title, 'round', 0.9); draw('ok');
    if (L.done) L.done();
    const m = S.m, i = S.i;
    setTimeout(() => { if (S && S.m === m && S.i === i && App.view === m) { if (nx) next(); else finish(); } }, 1300);
  }
  function next() {
    if (!S) return;
    const prev = LESSONS[S.i]; if (prev && prev.done && !S.ok) prev.done();
    S.i++; S.got = 0; S.note = ''; S.ok = null; S.wait = null; ai().cue = null;
    while (LESSONS[S.i] && LESSONS[S.i].skip && LESSONS[S.i].skip()) S.i++;   // (no auto combo, no ammo: not your lesson)
    const L = LESSONS[S.i];
    if (!L) return finish();
    if (L.id !== 'finish') { ai().dummy = 'tut'; }
    if (L.setup) L.setup.call(L);
    draw('new');
  }
  function progress(r) {
    const L = LESSONS[S.i];
    const got = typeof r === 'number' ? r : S.got + 1;
    if (got !== S.got) { S.got = got; S.note = ''; if (S.got < L.need) SFX.play('ui'); }
    if (S.got >= L.need) complete(); else draw();
  }

  /* --------------------------------------------------------- listening in */
  function hear(kind, d) {
    if (!S || App.view !== S.m) return;
    const L = LESSONS[S.i]; if (!L || S.ok || !L.on) return;
    const before = S.note, r = L.on.call(L, kind, d);
    if (r === true || (typeof r === 'number' && r > S.got)) progress(r);
    else if (S.note !== before) draw();
  }
  function frame(dt) {
    if (!S || App.view !== S.m) return;
    const m = S.m, L = LESSONS[S.i], a = me(), d = dummy(), last = L && L.id === 'finish';
    // a gentle world: you are topped up, and the dummy cannot fall before the last lesson
    if (!a.comboing) a.hp = last ? Math.max(a.hp, a.maxHp * 0.35) : a.maxHp;
    if (!last) d.hp = Math.max(d.hp, d.maxHp * 0.4);
    if (!L || S.ok || m.phase !== 'fight' || m.paused) return;
    const before = S.note;
    let r = L.tick ? L.tick.call(L, dt) : null;
    if (!r && L.tick2) r = L.tick2.call(L, dt);
    if (r === true) return progress(true);
    if (r === 'redraw' || S.note !== before) draw();
  }

  /* --------------------------------------------------------- start, end */
  Tutorial.start = o => {
    stop();
    App.startMatch({ mode: 'training', tutorial: true, builds: [Menu.activeBuild(), KB.mintBuild('knight', 0)], cpu: [null, null], arena: 'shelf', wins: 99, time: 999, bonus: true });
    const m = App.view;
    m.training.meter = false; m.training.dummy = 'tut';
    S = { m, i: -1, got: 0, note: '', ok: null, onboard: !!(o && o.onboard), stats: { combo: 0, bounces: 0 } };
    S.card = el('div', { class: 'tut' }); U.$('hud').append(S.card);
    S.off = m.on((k, d) => {
      if (k === 'hit' && d.att === m.fighters[0] && d.r === 'hit') { S.stats.combo = Math.max(S.stats.combo, d.vic.combo.hits); S.stats.bounces = Math.max(S.stats.bounces, d.vic.combo.bounces); }
      hear(k, d);
    });
    m.tick = frame;
    // the intro drops them in; the first lesson opens once the fight starts
    const wait = () => { if (!S || S.m !== m || App.view !== m) return; if (m.phase === 'fight') next(); else setTimeout(wait, 100); };
    wait();
  };
  function stop() { if (!S) return; if (S.off) S.off(); if (S.card) S.card.remove(); S = null; }
  Tutorial.done = () => !!(Auth.S && Auth.S.tutorial && Auth.S.tutorial.done);
  Tutorial.running = () => !!S;
  Tutorial.quit = () => leave();
  function leave() {
    const onboard = S && S.onboard; stop(); App.setView(null);
    if (onboard) Menu.afterTutorial(false); else Menu.hub();
  }
  /* the last lesson is won (or skipped): the tutorial's own last screen */
  function finish() {
    if (!S) return;
    const st = S.stats, onboard = S.onboard, first = !Tutorial.done();
    stop(); App.setView(null); HUD.hide(); Touch.hide();
    let bonus = 0;
    if (Auth.S) { if (first) { bonus = 900; Auth.S.tokens += bonus; } Auth.S.tutorial = { done: true, at: Date.now() }; Auth.save(); if (window.Rewards) Rewards.record({ tutorials: 1 }); }
    SFX.play('win'); Music.play('menu');
    const row = (k, v) => [el('span', null, k), el('b', null, v)];
    const box = el('div', { class: 'panel tutdone' },
      el('div', { class: 'tick' }, '✓'),
      el('h2', null, 'TUTORIAL COMPLETE'),
      el('div', { class: 'stats' }, ...row('Longest combo', st.combo + ' hits'), ...row('Most wall bounces', String(st.bounces)), ...(bonus ? row('Reward', '+' + bonus + ' TOKENS') : [])),
      el('p', null, 'Every figure plays by the same buttons. What each of yours does (its string, its Heavy, all four Specials) is in its MOVE LIST (pause in a fight, or the Workshop), and every key and button can be changed in OPTIONS. TRAINING has a dummy to practise on any time.'),
      el('div', { class: 'row' },
        el('button', { class: 'btn big', onclick: () => { SFX.play('ok'); if (onboard) Menu.afterTutorial(true); else Menu.hub(); } }, onboard ? 'ON TO THE HUB' : 'BACK TO THE HUB'),
        el('button', { class: 'btn ghost', onclick: () => { SFX.play('ok'); Tutorial.start({ onboard }); } }, 'AGAIN')));
    App.screen(el('div', { class: 'screen tutend' }, box));
  }
  window.Tutorial = Tutorial;
})();
