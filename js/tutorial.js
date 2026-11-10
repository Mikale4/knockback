/* ============================================================================
   tutorial.js -- the TUTORIAL: an interactive one, played for real.

   A fight on the Playroom Shelf against a Knight dummy, where nothing happens
   until you do it. A card over the fight gives one lesson at a time, in your
   own keys (or your controller's buttons, or the touch buttons), and the next
   opens once you have done it (or SKIP). The dummy only swings when a lesson
   wants it to, and nobody loses anything: your damage stays at 0%, and the
   dummy's stays low until the lessons that want it high.

   The rules it teaches are the platform fighter's: damage %, KOs past the
   blast zone, recovering to the ledge, the shield bubble, teching a knockdown
   (QUICK RISE) and tech chasing one. Most lessons play on the open stage; the
   WALL BOUNCE lesson rebuilds the Shelf with its walls up, as some stages have.

   New collectors get it right after opening their first figure (menu.js);
   it is in the hub (TUTORIAL) and HOW TO PLAY any time after.

     Tutorial.start({ onboard })   Tutorial.done()
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const Tutorial = {};
  let S = null;   // the tutorial running: { m, i, got, note, ok, card, off, onboard, walled, ... }

  /* ---------------------------------------------------- the keys it names */
  const TOUCH = { light: 'LIGHT', heavy: 'HEAVY', guard: 'GUARD', special: 'SPECIAL', snap: 'SNAP', super: 'SUPER', toss: 'TOSS', jump: 'JUMP', dodge: 'DODGE' };
  const touching = () => U.touch && !Input.usingPad(0);
  const K = a => el('kbd', null, touching() ? TOUCH[a] || a : Input.prompt(0, a) || '?');
  const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
  /* a direction: an arrow on a stick (pad, touch), the key it's bound to on a keyboard */
  const D = d => touching() || Input.usingPad(0) ? el('b', null, ARROW[d]) : el('kbd', null, Input.keyName((Input.binds[0][d] || [])[0]) || ARROW[d]);
  const sideKeys = () => {
    if (touching()) return ['the stick (put your left thumb anywhere on the left of the screen)'];
    if (Input.usingPad(0)) return ['the left stick'];
    return [D('left'), ' ', D('right')];
  };
  const TO = () => el('b', null, '→');   // (toward them: the side of the screen they're on)

  /* ---------------------------------------------------------- the world */
  const me = () => S.m.fighters[0];
  const dummy = () => S.m.fighters[1];
  const ai = () => S.m.ai[1];
  const mode = k => { S.m.training.dummy = k; };   // (what the dummy does: training.js hands it to the dummy every frame)
  const St = () => S.m.arena.stage;
  /* put both figures on the stage (x along it, the dummy facing you); one that's been KNOCKED OUT is left to drop back in */
  function place(px, dx) {
    const a = me(), d = dummy(), top = St().top;
    for (const [f, x] of [[a, px], [d, dx]]) {
      if (f.gone || f.state === 'ko') continue;
      f.pos.set(x, top, 0); f.vel.set(0, 0, 0); f.grounded = true; f.plat = null; f.move = null; f.held = null; f.setState('idle'); f.trailR.pts.length = 0; f.trailL.pts.length = 0;
    }
    a.yaw = Math.sign(dx - px) * Math.PI / 2; d.yaw = -a.yaw;
  }
  /* the dummy swings (n presses of a button, gap apart; toward: with the stick toward you), walking up to you first */
  const cue = (n, btn, gap, toward) => { const A = ai(); if (!A.cue) A.cue = { n: n || 1, btn: btn || 'light', gap: gap || 0.16, next: S.m.time + 0.15, toward: !!toward }; };
  const stringLen = () => { let id = me().lightRoot(), n = 0; while (id && n < 9) { n++; id = (KB.MOVES[id].nx || {}).l; } return n; };
  const blocked = r => r === 'blocked' || r === 'jguard' || r === 'gcrush';
  const nm = id => el('b', null, id && KB.MOVES[id] ? KB.MOVES[id].name : '?');
  const autoOf = () => KB.MOVES[me().st.heavy] && KB.MOVES[me().st.heavy].auto;   // (a Heavy auto combo: heavies.js)
  const autoEnd = () => KB.MOVES[autoOf()].auto;
  const hits = (d, r) => d.att === me() && d.vic === dummy() && d.r === (r || 'hit');
  const ring = (x, y, col) => FX.ring(new THREE.Vector3(x, y + 0.06, 0), { r1: 0.9, life: 0.5, color: col || 0xffd23c });

  /* ---------------------------------------------------------- the lessons
     text: what the card says, need: how many to do, on(kind, data): what
     counts (true for one more, or a number for the progress itself),
     tick(dt): each frame while it is open (true or a number: progress),
     setup(): as it opens; walled: it wants the walls up; dpct: the dummy's
     damage % is held at least this high */
  const LESSONS = [
    {
      id: 'move', title: 'MOVE', need: 1,
      text: () => ['Walk with ', ...sideKeys(), '. Walk into the yellow ring.'],
      setup() { place(-3, 3); S.spot = 1.2; S.ringT = 0; mode('stand'); },
      tick(dt) {
        S.ringT -= dt; if (S.ringT <= 0) { S.ringT = 0.55; ring(S.spot, St().top); }
        if (Math.abs(me().pos.x - S.spot) < 0.7 && me().grounded) return true;
      },
    },
    {
      id: 'jump', title: 'JUMP', need: 2,
      text: () => ['Press ', K('jump'), ' to jump, then ', K('jump'), ' again in the air for a second jump.'],
      on(k, d) { if (k === 'jump' && d.f === me()) return d.air ? (S.got >= 1 ? 2 : 0) : 1; },
    },
    {
      id: 'hop', title: 'SHORT HOP, FAST FALL', need: 2,
      text: () => S.got < 1 ? ['Tap ', K('jump'), ' and let go at once: a SHORT HOP, a low jump to hit them on the way up. (Hold it for the full jump.)']
        : ['Now jump, and as you start to come down hold ', D('down'), ': a FAST FALL, you drop like a stone. Back on the ground sooner, safer.'],
      on(k, d) {
        if (k === 'shorthop' && d.f === me()) return Math.max(S.got, 1);
        if (k === 'fastfall' && d.f === me() && S.got >= 1) return 2;
      },
    },
    {
      id: 'plat', title: 'PLATFORMS', need: 2,
      text: () => S.got < 1 ? ['Jump up onto one of the floating platforms (', K('jump'), ', then ', K('jump'), ' again in the air): you go up through it and land on top.']
        : ['Now hold ', D('down'), ' on it: you drop back down through it.'],
      setup() { place(-1.5, 3.5); },
      tick() { const a = me(); if (S.got < 1 && a.grounded && a.plat) return 1; },
      on(k, d) { if (k === 'drop' && d.f === me() && S.got >= 1) return 2; },
    },
    {
      id: 'string', title: 'YOUR STRING', need: 4,
      setup() { this.need = stringLen(); place(-1.4, 0); },
      text: () => ['Walk up to the dummy and tap ', K('light'), ' again and again. Your R-arm\'s string is ', el('b', null, stringLen() + ' hits'), ': press again as each one lands. (With the stick held, Light is a TILT instead: one blow each way.)'],
      on(k, d) { if (k === 'hit' && hits(d)) return Math.min(this.need, d.vic.combo.hits); },
      tick() { const v = dummy(); if (S.got > 0 && !v.comboing && me().state !== 'attack') { S.got = 0; S.note = 'The string dropped. Start it again, and keep pressing as the hits land.'; return 'redraw'; } },
    },
    {
      id: 'knocks', title: 'THE FOUR KNOCKS', need: 4,
      text: () => ['Heavy is a KNOCK, and the stick picks which one. ', K('heavy'), ' on its own: a slam that drives them into the floor. ', TO(), ' + ', K('heavy'), ': the side KNOCK, sends them flying. ', D('up'), ' + ', K('heavy'), ': the LAUNCHER, pops them up. ', D('down'), ' + ', K('heavy'), ': a low blow all round. Do all four. (Hold Heavy to charge any of them.)'],
      setup() { place(-1.4, 0); const a = me(); this.ids = [...new Set(['n', 'f', 'u', 'd'].map(k => a.knock(k)))]; this.need = this.ids.length; S.kset = new Set(); },
      on(k, d) { if (k === 'move' && d.f === me() && this.ids.includes(d.id)) { S.kset.add(d.id); return S.kset.size; } },
    },
    {
      id: 'launch', title: 'AIR COMBO', need: 3,
      text: () => S.got < 1 ? ['Two ', K('light'), ', then ', D('up'), ' + ', K('heavy'), ': the LAUNCHER pops them up.']
        : S.got < 2 ? ['Now ', K('jump'), ' straight away: you leap up after them.']
          : ['And ', K('light'), ' in the air: an air combo.'],
      setup() { place(-1.4, 0); },
      on(k, d) {
        if (k === 'hit' && hits(d) && d.o.kind === 'launch') return 1;
        if (k === 'jump' && d.f === me() && d.follow && S.got >= 1) return 2;
        if (k === 'hit' && hits(d) && d.o.kind === 'air' && S.got >= 2) return 3;
      },
      tick() { if (S.got > 0 && !dummy().comboing && me().grounded && me().state !== 'attack') { S.got = 0; S.note = 'They landed. Launch them again: two Lights, then Up + Heavy, then Jump straight away.'; return 'redraw'; } },
    },
    {
      id: 'spike', title: 'SPIKE', need: 1,
      text: () => ['In the air, ', K('heavy'), ' is your SPIKE: it drives them down into the floor (they bounce back up for more), and off the stage that’s a KO. Launch the dummy, jump after it and spike it.'],
      setup() { place(-1.4, 0); },
      on(k, d) { if (k === 'hit' && hits(d) && d.mv && d.mv.spike && !d.att.grounded) return true; },
    },
    {
      id: 'ko', title: 'DAMAGE % AND KO', need: 1, dpct: 120,
      text: () => ['Every hit adds to their DAMAGE % (by their portrait). The higher it is, the further they fly, and past the edge of the screen they’re KNOCKED OUT. This dummy is at 120%: ', TO(), ' + ', K('heavy'), ' to send it off the stage.'],
      setup() { const W = St().W; place(W - 4.6, W - 3.1); },
      on(k, d) { if (k === 'ko' && d.vic === dummy()) return true; },
      tick() { const W = St().W, v = dummy(); if (v.grounded && !v.comboing && v.state === 'idle' && me().state === 'idle' && Math.abs(v.pos.x) < W - 5) place(W - 4.6, W - 3.1); },
    },
    {
      // RECOVERY: back from off the stage, any way that works (some recoveries reach the ledge, some the stage itself)
      id: 'recover', title: 'RECOVERY', need: 1,
      text: () => !S.ledge ? ['Knocked off the stage? Get back. Jump in the air, then ', D('up'), ' + ', K('special'), ': your RECOVERY, ', nm((me().st.cmd || {}).dp), '. Come in low and you catch the LEDGE (just reach the side of the stage).']
        : ['On the ledge, and for a moment nothing can touch you. Press ', TO(), ' (toward the stage) to climb up. (', K('jump'), ' jumps up from it, ', K('light'), ' climbs with an attack, ', K('dodge'), ' rolls in.)'],
      setup() { place(-4, -5.5); this.off(); },
      off() { const a = me(), W = St().W; a.gone = false; a.obj.visible = true; a.spawnFloat = 0; a.respawnInv = false; a.pos.set(W + 3.2, St().top + 1.2, 0); a.vel.set(0, 0, 0); a.grounded = false; a.plat = null; a.move = null; a.setState('air'); a.airJumps = a.st.airJumps; a.airDodges = a.st.airDodges; a.upUsed = false; a.yaw = -Math.PI / 2; S.reput = 0; S.ledge = false; S.offAt = S.m.time; },
      on(k, d) {
        if (k === 'ledge' && d.f === me()) { S.ledge = true; return 'redraw'; }
        if (k === 'ko' && d.vic === me()) S.note = 'Down you went. Again: Jump in the air, then Up + Special toward the stage.';
        if (k === 'respawn' && d.f === me()) S.reput = S.m.time + 0.3;
      },
      tick() {
        const a = me();
        if (S.reput && S.m.time > S.reput) { this.off(); return 'redraw'; }
        if (a.grounded && Math.abs(a.pos.x) < St().W && S.m.time - S.offAt > 0.3 && a.state !== 'ko' && !a.gone) return true;   // (back on it)
      },
    },
    {
      id: 'shield', title: 'SHIELD', need: 2,
      text: () => ['The dummy is going to swing at you. Hold ', K('guard'), ': a SHIELD bubble, and nothing gets through. It shrinks while you hold it and faster when it’s hit; let it pop and you’re dazed, wide open. Let go and it grows back. Block two swings. (Shield just as a hit lands: a JUST GUARD.)'],
      setup() { place(-1.6, 0); S.cueAt = S.m.time + 0.8; },
      tick() { if (S.m.time > S.cueAt && dummy().state !== 'attack') { cue(1); S.cueAt = S.m.time + 1.6; } },
      on(k, d) {
        if (k === 'shieldbreak' && d.f === me()) S.note = 'Your shield broke: you held it too long. Let go between swings so it grows back.';
        if (k !== 'hit' || d.vic !== me()) return;
        if (blocked(d.r)) return true;
        if (d.r === 'hit') { S.note = 'Hold Guard BEFORE the swing reaches you.'; }
      },
    },
    {
      id: 'dodge', title: 'DODGE', need: 2,
      text: () => ['Press ', K('dodge'), ' as it swings: for a moment nothing can touch you. With the stick it’s a roll that way, without it a sidestep on the spot, and in the air an air dodge. Dodge through two swings.'],
      setup() { place(-1.6, 0); S.cueAt = S.m.time + 0.8; },
      tick() { if (S.m.time > S.cueAt && dummy().state !== 'attack') { cue(1); S.cueAt = S.m.time + 1.6; } },
      on(k, d) {
        if (k === 'evade' && d.f === me()) return true;
        if (k === 'hit' && d.vic === me() && d.r === 'hit') S.note = 'Dodge a little later, right as the swing comes.';
      },
    },
    {
      id: 'grab', title: 'GRAB AND THROW', need: 3,
      text: () => S.got < 1 ? ['The dummy is shielding now. A shield stops your blows, but a GRAB beats it: hold ', K('guard'), ' and press ', K('light'), '.']
        : S.got < 2 ? ['Got them. ', K('light'), ' while you hold them: a pummel.']
          : ['Now throw: tilt the stick any way (behind you is the strongest), or ', K('jump'), ' to throw up, or ', K('heavy'), ' alone to slam them down.'],
      setup() { place(-1.4, 0); mode('guard'); },
      on(k, d) {
        if (k === 'grab' && d.f === me()) return Math.max(S.got, 1);
        if (k === 'hit' && d.att === me() && d.o.pummel && S.got >= 1) return 2;
        if (k === 'throw' && d.f === me() && S.got >= 1) return 3;
      },
    },
    {
      // TECH: knocked down, hit the floor with Dodge pressed: a QUICK RISE (a roll up off the floor) instead of lying there
      id: 'tech', title: 'TECH (QUICK RISE)', need: 2,
      text: () => ['The dummy is going to KNOCK you over. As you hit the floor, press ', K('dodge'), ': a QUICK RISE, you roll straight back up instead of lying there to be hit. Hold ', D('left'), ' or ', D('right'), ' as you do to pick which way you roll (on its own, away from them). It counts a moment early, so press it just before you land. Tech two knockdowns.'],
      setup() { this.again(); S.cueAt = S.m.time + 1.0; S.flat = false; },
      again() { place(-2.4, -3.8); },
      tick() {
        const a = me(), v = dummy();
        if (a.state === 'down' && !S.flat) { S.flat = true; S.note = 'You hit the floor flat. Press Dodge a moment BEFORE you land (up to a third of a second early counts).'; return 'redraw'; }
        if (a.state !== 'down') S.flat = false;
        if (S.m.time > S.cueAt && v.state !== 'attack' && a.state === 'idle' && a.grounded && !ai().cue) { this.again(); cue(1, 'heavy', 0.1, true); S.cueAt = S.m.time + 2.6; }
      },
      on(k, d) {
        if (k === 'techroll' && d.f === me()) return true;
        if (k === 'hit' && d.vic === me() && blocked(d.r)) S.note = 'Let this one hit you: the lesson is getting up after it.';
      },
    },
    {
      // TECH CHASE: the dummy techs one way or the other, or lies there; be where it comes up and hit it as it does
      id: 'chase', title: 'TECH CHASE', need: 2,
      text: () => ['Now the other way round. KNOCK the dummy over (', TO(), ' + ', K('heavy'), '), and read it: as it lands it either QUICK RISES (rolls left or right) or lies there and gets up. While it rolls or rises it can’t be hit (it flashes). Be where it comes up, and hit it the moment it’s done: a TECH CHASE. Catch it twice.'],
      setup() { place(-1.4, 0); mode('techer'); S.rising = false; S.upAt = null; }, dmax: 10,
      tick() {
        const v = dummy();
        if (v.state === 'getup' || (v.state === 'dodge' && S.rising)) S.rising = true;
        if (S.rising && !['dodge', 'getup', 'down', 'tumble'].includes(v.state) && v.inv <= 0) { S.rising = false; S.upAt = S.m.time; }
        if (S.upAt != null && S.m.time - S.upAt > 0.7) { S.upAt = null; S.note = 'Too slow: it was up and free for a while. Get to where it rolls before it’s done.'; return 'redraw'; }
        if (v.state === 'idle' && v.grounded && Math.abs(v.pos.x) > St().W - 2 && me().state === 'idle') place(-1.4, 0);   // (back to the middle)
      },
      on(k, d) {
        if (k === 'techroll' && d.f === dummy()) S.rising = true;
        if (k !== 'hit' || d.att !== me() || d.vic !== dummy()) return;
        if (d.r === 'miss' && S.rising) S.note = 'Too early: it can’t be hit while it rolls or gets up. Wait for the flashing to stop, then hit.';
        if (d.r === 'hit' && S.upAt != null) { const late = S.m.time - S.upAt; S.upAt = null; S.note = ''; S.m.call(me(), late < 0.25 ? 'TECH CHASED!' : 'CAUGHT!', 'snap'); return S.got + 1; }
      },
      done() { mode('tut'); },
    },
    {
      id: 'chasedash', title: 'CHASE DASH', need: 1,
      text: () => ['One more way after them: KNOCK them (', TO(), ' + ', K('heavy'), '), and while they fly, hold the stick TOWARD them and press ', K('snap'), ': for half a bar of Hype your dash runs them down, a step short, so the combo goes on. You have the Hype.'],
      setup() { place(-4, -2.6); },
      tick() { const a = me(); if (a.hype < 60 && !a.chasing) a.hype = 100; },
      on(k, d) {
        if (k === 'chase' && d.f === me()) return true;
        if (k === 'snap' && d.f === me()) S.note = 'That was a plain Snap: hold the stick toward them as you press it, while they\'re still flying.';
      },
    },
    {
      id: 'charge', title: 'ARMOURED CHARGE', need: 1,
      text: () => ['Hold ', K('heavy'), ' to charge your KNOCK: it hits harder, and while you hold it you take ONE hit without flinching. Hold Heavy now: the dummy will swing at you while you charge.'],
      setup() { place(-1.3, 0); S.swung = false; },
      tick() {
        // the dummy swings the moment you start charging (so a Heavy that's a shot doesn't send it away first)
        const a = me(), v = dummy(), charging = a.state === 'attack' && a.kind === 'heavy' && a.charge > 0.02;
        if (charging && !S.swung && v.state !== 'attack') { cue(1, 'light', 0.1); S.swung = true; }
        if (!charging && a.state !== 'attack') S.swung = false;
        if (!charging && a.state !== 'attack' && v.state !== 'attack' && Math.abs(v.pos.x - a.pos.x) > 3) place(-1.3, 0);   // (back in close)
      },
      on(k, d) {
        if (k === 'hit' && d.vic === me() && d.r === 'armor' && me().kind === 'heavy') return true;
        if (k === 'hit' && d.vic === me() && d.r === 'hit') S.note = 'Start holding Heavy a moment before the swing reaches you, and keep holding it.';
      },
    },
    {
      id: 'auto', title: 'AUTO COMBO', need: 1, skip: () => !autoOf(),
      text: () => ['Your Heavy has an AUTO COMBO: press ', K('heavy'), ', then ', K('heavy'), ' again before the first one lands: ', nm(me().st.heavy), ' › ', nm(autoOf()), ' › ', nm(autoEnd()), ', the last one a KNOCK. (One press on its own is still the KNOCK.)'],
      setup() { place(-1.4, 0); },
      on(k, d) { if (k === 'move' && d.f === me() && d.id === autoEnd()) return true; },
    },
    {
      id: 'special', title: 'SPECIAL', need: 1,
      text: () => ['Your HEAD gives you a Special: ', el('b', null, KB.MOVES[me().st.special].name), '. Press ', K('special'), '. (', el('b', null, me().st.uses + ' uses'), ', shared with the side and down Specials next; a used one comes back every ', el('b', null, me().st.useRegen + ' s'), '.)'],
      setup() { place(-2.4, 0); },
      tick() { const a = me(); if (a.uses < 1) a.uses = a.st.uses; a.spReady = 0; },
      on(k, d) { if (k === 'move' && d.f === me() && d.kind === 'special') return true; },
    },
    {
      id: 'cmd', title: 'SIDE, UP AND DOWN SPECIALS', need: 3,
      text: () => { const C = me().st.cmd || {}; return ['Special takes the stick too: at rest it’s your neutral Special, and three more. ',
        el('b', null, '← / →'), ' + ', K('special'), ': ', nm(C.qcf), ' (the side Special: you face the way you press). ', el('b', null, '↑'), ' + ', K('special'), ': ', nm(C.dp), ' (the up Special, your recovery: free, once each time you leave the ground). ', el('b', null, '↓'), ' + ', K('special'), ': ', nm(C.qcb), ' (the down Special). Do each one once.']; },
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
      text: () => ['Knock them down (', TO(), ' + ', K('heavy'), ', or a throw), and while they are lying on the floor, hit them with a low blow (', D('down'), ' + ', K('heavy'), ') or a dash attack (', K('dodge'), ' then ', K('light'), '). That picks them back up OFF THE GROUND, twice a combo.'],
      setup() { place(-1.4, 0); },
      on(k, d) { if (k === 'otg' && d.att === me()) return true; },
    },
    {
      id: 'toss', title: 'PART TOSS', need: 1,
      text: () => ['Mid-combo, press ', K('toss'), ': you pull off one of your OWN parts and throw it. If it hits, the combo is EXTENDED and you can keep going (twice a combo). Go pick the part back up after! (One that falls off the stage drops back in from the sky.)'],
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
      // the walls: some stages have them (the house ones, a few more), and there the KNOCK bounces them back to you
      id: 'wall', title: 'WALL BOUNCE', need: 2, walled: true,
      text: () => S.got < 1 ? ['Some stages have WALLS (this Shelf, the Desk, the Chest and a few more). There a KNOCK doesn’t send them off the side: two ', K('light'), ', then ', TO(), ' + ', K('heavy'), ', and they hit the wall and BOUNCE back to you.']
        : ['They’re bouncing back at you, still helpless. Hit them again: ', K('light'), ' as they come back. (On a walled stage they’re KNOCKED OUT off the top, at a high %.)'],
      setup() { const W = St().W; place(W - 4.4, W - 2.8); },
      on(k, d) {
        if (k === 'bounce' && d.by === me()) return Math.max(S.got, 1);
        if (k === 'hit' && hits(d) && S.got >= 1 && d.vic.combo.bounces >= 1) return 2;
      },
      tick() { if (S.got === 1 && !dummy().comboing) { S.got = 0; S.note = 'Missed the rebound. Knock them into the wall again, and be ready as they come back.'; const W = St().W; place(W - 4.4, W - 2.8); return 'redraw'; } },
    },
    {
      id: 'finish', title: 'NOW FOR REAL', need: 1,
      text: () => ['That is everything. The dummy fights back now: build up its %, and KNOCK it off the stage!'],
      setup() { place(-3, 3); dummy().pct = 0; mode('cpu'); ai().lv = 1; },
      on(k, d) { if (k === 'ko' && d.vic === dummy()) return true; },
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
    if (!!L.walled !== S.walled) return stage(!!L.walled, () => begin(L));   // (the walls go up, or come down: the Shelf again)
    begin(L);
  }
  function begin(L) {
    if (L.id !== 'finish') mode('tut');
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
    else if (S.note !== before || r === 'redraw') draw();
  }
  function frame(dt) {
    if (!S || App.view !== S.m) return;
    const m = S.m, L = LESSONS[S.i], a = me(), d = dummy(), last = L && L.id === 'finish';
    // a gentle world: your damage stays at 0% (the last lesson aside), the dummy's low unless a lesson wants it high
    if (!a.comboing) a.hp = a.maxHp;
    if (!last && !a.comboing) a.pct = 0;
    if (!last && L && !d.gone) d.pct = L.dpct ? Math.max(d.pct, L.dpct) : Math.min(d.pct, L.dmax != null ? L.dmax : 50);
    if (!L || S.ok || m.phase !== 'fight' || m.paused) return;
    const before = S.note;
    let r = L.tick ? L.tick.call(L, dt) : null;
    if (!r && L.tick2) r = L.tick2.call(L, dt);
    if (r === true || (typeof r === 'number' && r > S.got)) return progress(r);
    if (r === 'redraw' || S.note !== before) draw();
  }

  /* --------------------------------------------------------- start, end */
  /* the fight itself: the Shelf, open (ledges and blast zones) or with its walls up; built again when a lesson wants
     the other one, and the lessons carry on once its intro has dropped them in */
  function stage(walled, then) {
    if (S.off) S.off();
    App.startMatch({ mode: 'training', tutorial: true, builds: S.builds, cpu: [null, null], arena: 'shelf', walled, wins: 99, time: 999, bonus: true });
    const m = App.view;
    m.training.meter = false; m.training.dummy = 'tut';
    S.m = m; S.walled = walled;
    U.$('hud').append(S.card);
    S.off = m.on((k, d) => {
      if (k === 'hit' && d.att === m.fighters[0] && d.r === 'hit') { S.stats.combo = Math.max(S.stats.combo, d.vic.combo.hits); S.stats.bounces = Math.max(S.stats.bounces, d.vic.combo.bounces); }
      if (k === 'ko' && d.vic === m.fighters[1]) S.stats.kos++;
      hear(k, d);
    });
    m.tick = frame;
    const wait = () => { if (!S || S.m !== m || App.view !== m) return; if (m.phase === 'fight') then(); else setTimeout(wait, 100); };
    wait();
  }
  Tutorial.start = o => {
    stop();
    S = { m: null, i: -1, got: 0, note: '', ok: null, onboard: !!(o && o.onboard), stats: { combo: 0, bounces: 0, kos: 0 }, builds: [Menu.activeBuild(), KB.mintBuild('knight', 0)], walled: null };
    S.card = el('div', { class: 'tut' });
    stage(false, next);   // (the intro drops them in; the first lesson opens once the fight starts)
  };
  function stop() { if (!S) return; if (S.off) S.off(); if (S.card) S.card.remove(); S = null; }
  Tutorial.done = () => !!(Auth.S && Auth.S.tutorial && Auth.S.tutorial.done);
  Tutorial.running = () => !!S;
  Tutorial.quit = () => leave();
  Tutorial._t = { get S() { return S; }, jump(id) { if (!S) return; S.i = LESSONS.findIndex(l => l.id === id) - 1; S.ok = null; next(); } };   // (tests: tools/harness.js)
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
      el('div', { class: 'stats' }, ...row('Longest combo', st.combo + ' hits'), ...row('KOs', String(st.kos)), ...row('Most wall bounces', String(st.bounces)), ...(bonus ? row('Reward', '+' + bonus + ' TOKENS') : [])),
      el('p', null, 'Every figure plays by the same buttons. What each of yours does (its string, its tilts and KNOCKs, all four Specials) is in its MOVE LIST (pause in a fight, or the Workshop), and every key and button can be changed in OPTIONS. TRAINING has a dummy to practise on any time.'),
      el('div', { class: 'row' },
        el('button', { class: 'btn big', onclick: () => { SFX.play('ok'); if (onboard) Menu.afterTutorial(true); else Menu.hub(); } }, onboard ? 'ON TO THE HUB' : 'BACK TO THE HUB'),
        el('button', { class: 'btn ghost', onclick: () => { SFX.play('ok'); Tutorial.start({ onboard }); } }, 'AGAIN')));
    App.screen(el('div', { class: 'screen tutend' }, box));
  }
  window.Tutorial = Tutorial;
})();
