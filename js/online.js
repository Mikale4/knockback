/* ============================================================================
   online.js -- ONLINE: fight a friend over the internet.

   One of you HOSTS a room and gets a five-letter code; the other JOINS with
   it. The two browsers connect directly (WebRTC), introduced by the free
   PeerJS matchmaking service, so there is no game server to run.

   The netcode is delay-based lockstep, the classic fighting-game kind: both
   games run the same fight, frame by frame (60 a second), and only the
   buttons travel. Your presses are played a few frames later (the input
   delay, set from your ping) on BOTH screens, so both fights stay the same.
   For that the fight is deterministic online: fixed 1/60 s steps, one seeded
   random source for everything that matters (U.rand is seeded during a
   step; looks use U.vrand; three.js keeps Math.random), timers on the fight's clock, the beat
   on the fight's clock. Every half second the two compare a fingerprint of
   the fight; if they ever differ (two browsers doing maths a hair apart),
   the host's fight is copied over at an agreed frame.

     Online.open()   (the lobby)
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const VERSION = 'kb-online-2';                  // both players need the same game: a different build won't connect
  const PEER_JS = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
  const PREFIX = 'knockback-room-', ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const STEP = 1 / 60, HASH_EVERY = 30;
  const ACT = () => Input.ACTIONS;

  const Online = window.Online = {};
  let N = null;   // the session: { peer, conn, host, code, me, them, rtt, ui, cfg }
  let G = null;   // the fight running: { m, R, local, D, f, inputs, ... }

  /* ---------------------------------------------------- seeded random */
  function rng(seed) {
    let s = seed >>> 0;
    const f = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.get = () => s; f.set = v => { s = v | 0; };
    return f;
  }
  const withRng = (R, fn) => { U.setRand(R); try { return fn(); } finally { U.setRand(null); } };

  /* --------------------------------------------------- the connection */
  function loadPeer() {
    return new Promise((res, rej) => {
      if (window.Peer) return res();
      let i = 0;
      const next = () => {
        if (i >= PEER_JS.length) return rej(new Error('Couldn\'t load the online library. Check your internet connection.'));
        const s = document.createElement('script'); s.src = PEER_JS[i++]; s.async = true;
        s.onload = () => (window.Peer ? res() : next()); s.onerror = next; document.head.appendChild(s);
      };
      next();
    });
  }
  const makeCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(U.vrand() * ALPHA.length)]).join('');
  const why = e => ({
    'peer-unavailable': 'No room with that code. Check it, or ask your friend to host again.',
    'network': 'Couldn\'t reach the matchmaking service. Check your connection and try again.',
    'server-error': 'The matchmaking service is having trouble. Try again in a minute.',
    'socket-error': 'Couldn\'t reach the matchmaking service. Check your connection and try again.',
    'socket-closed': 'Lost the matchmaking service. Try again.',
    'browser-incompatible': 'This browser can\'t do peer-to-peer connections. Try Chrome, Edge, Firefox or Safari.',
    'webrtc': 'The connection between you failed. Some networks (school or work Wi-Fi, some mobile data) block it.',
  })[e && e.type] || ('Connection problem' + (e && e.type ? ' (' + e.type + ')' : '') + '. Try again.');

  function meInfo() {
    const S = Auth.S, bi = N && N.myBuild != null ? N.myBuild : S.active || 0;
    const b = Inv.levelled(S.builds[bi]);
    return { name: Auth.user.user, build: b, fig: b.name };
  }
  function send(o) { if (N && N.conn && N.conn.open) { try { N.conn.send(o); } catch (e) { /* closed */ } } }
  function attach(conn) {
    N.conn = conn;
    conn.on('open', () => { N.status = 'Connected. Saying hello...'; send({ t: 'hello', ver: VERSION, me: meInfo() }); draw(); });
    conn.on('data', onData);
    conn.on('close', () => lost());
    conn.on('error', () => lost());
  }
  function lost() {
    if (!N) return;
    const wasFight = !!G, name = N.them ? N.them.name : 'Your friend';
    N.conn = null; N.them = null; N.again = null;
    if (G) endFight();
    N.status = name + (wasFight ? ' disconnected during the fight.' : ' left.');
    N.stage = N.host && N.peer && !N.peer.destroyed ? 'hosting' : 'menu';
    App.setView(null); Online.open(true);
  }
  function startPing() {
    clearInterval(N.pingT);
    N.pingT = setInterval(() => { if (!N || !N.conn) return; send({ t: 'ping', ts: performance.now() }); }, 1000);
  }

  /* ------------------------------------------------------ messages */
  function onData(d) {
    if (!N || !d || !d.t) return;
    switch (d.t) {
      case 'hello':
        if (d.ver !== VERSION) { N.status = 'Your friend is on a different version of the game. Both of you reload the page (Ctrl+F5), then try again.'; send({ t: 'bye' }); setTimeout(() => N && N.conn && N.conn.close(), 300); draw(); return; }
        N.them = d.me; N.stage = 'room'; N.status = ''; startPing(); SFX.play('ok'); if (N.host) send({ t: 'cfg', cfg: N.cfg }); Online.open(true); return;
      case 'fig': if (N.them) { N.them = d.me; draw(); } return;
      case 'ping': send({ t: 'pong', ts: d.ts }); return;
      case 'pong': { const r = performance.now() - d.ts; N.rtt = N.rtt ? N.rtt * 0.7 + r * 0.3 : r; if (!G) drawPing(); return; }
      case 'cfg': if (!N.host) { N.cfg = d.cfg; draw(); } return;
      case 'start': begin(d.cfg, 1); return;
      case 'in': if (G) { const I = G.inputs[1 - G.local]; d.d.forEach((x, k) => { I[d.f + k] = x; }); if (Online._t.onIn) Online._t.onIn(); } return;
      case 'h': if (G) checkHash(d.f, d.h, false); return;
      case 'desync': if (G && N.host) scheduleResync(); return;
      case 'resync': if (G && !N.host) { G.syncAt = d.at; G.snap = null; } return;
      case 'snap': if (G && !N.host) G.snap = d; return;
      case 'again': N.again = Object.assign(N.again || {}, { them: true }); draw(); if (N.host && N.again.me && !G) startFight(); return;
      case 'leftfight': if (G) { endFight(); N.status = (N.them ? N.them.name : 'Your friend') + ' left the fight.'; N.stage = 'room'; App.setView(null); Online.open(true); } return;
      case 'bye': return;
    }
  }

  /* ------------------------------------------------- start a fight */
  function startFight() {
    const c = N.cfg, arena = c.arena === 'random' ? U.pick(Arena.LIST) : c.arena;
    const D = U.clamp(Math.round((N.rtt || 60) / 2 / 16.7) + 2, 2, 8);
    const cfg = { seed: (U.vrand() * 4294967296) >>> 0, D, arena, wins: c.wins, bonus: c.bonus, builds: [N.me.build, N.them.build], names: [N.me.name, N.them.name] };
    send({ t: 'start', cfg }); begin(cfg, 0);
  }
  function begin(cfg, local) {
    N.again = null; N.result = null; N.stage = 'fight';
    const PC = Input.players[0].constructor, net = [new PC(0), new PC(1)];
    net.forEach(p => { p.cpu = { held: {}, move: { x: 0, y: 0 } }; });
    Input.mode = 'solo';
    const builds = cfg.builds.map((b, i) => Object.assign({}, b, { name: cfg.names[i] }));
    const opts = { mode: 'online', online: true, local, builds, cpu: [null, null], arena: cfg.arena, wins: cfg.wins, time: 99, bonus: cfg.bonus, inputs: net, onEnd: res => matchEnd(res) };
    App.screen(null); Music.play('battle');
    const m = Match.create(opts); App.setView(m);
    // the same start on both screens: the seed, then the round laid out again under it
    const R = rng(cfg.seed);
    withRng(R, () => m.restart());
    G = { m, R, net, local, D: cfg.D, f: 0, inputs: [{}, {}], acc: 0, latch: {}, mine: {}, theirs: {}, syncAt: null, snap: null, waitT: 0, opts, cfg };
    const Z = [0, 0, 0];
    for (let k = 0; k < G.D; k++) { G.inputs[0][k] = Z; G.inputs[1][k] = Z; }
    G.step = m.update; m.update = frame;
    if (window.Rewards) Rewards.watch(m, opts);
    G.esc = false; G.ui = el('div', { class: 'onlinehud' }); U.$('hud').append(G.ui); drawHud();
  }
  function endFight() {
    if (!G) return;
    if (G.menu) G.menu.remove(); if (G.ui) G.ui.remove();
    G = null;
  }

  /* ------------------------------------------------------ the frame
     the real frame: take what you're pressing, then step the fight as far as both players' buttons have arrived */
  function frame(realDt) {
    if (!G) return;
    const P0 = Input.players[0], A = ACT();
    for (const a of A) if (P0.held[a]) G.latch[a] = true;          // a tap between two fight frames still counts
    // Esc / Start: the online menu (the fight doesn't stop)
    const esc = Input.keyDown('Escape') || P0.pressed('pause');
    if (esc && !G.escHeld) Online.menu(); G.escHeld = esc;
    G.acc = Math.min(G.acc + realDt, STEP * 8);
    let n = 0, out = null, outF = 0;
    while (G.acc >= STEP && n < 8) {
      const f = G.f;
      // an agreed resync: the host sends its fight after this frame; the guest waits for it
      if (G.syncAt != null && f === G.syncAt + 1) {
        if (N.host) {
          if (G.m.cine || G.m.frozen) { G.syncAt += 30; send({ t: 'resync', at: G.syncAt }); }
          else { send({ t: 'snap', at: G.syncAt, s: snapshot() }); G.syncAt = null; G.syncs = (G.syncs || 0) + 1; }
        } else {
          if (!G.snap || G.snap.at !== G.syncAt) break;
          restore(G.snap.s); G.snap = null; G.syncAt = null; G.syncs = (G.syncs || 0) + 1;
        }
      }
      const theirs = G.inputs[1 - G.local][f]; if (!theirs) break;   // their buttons for this frame haven't arrived: wait
      // ours, for D frames from now
      let b = 0; A.forEach((a, i) => { if (P0.held[a] || G.latch[a]) b |= 1 << i; }); G.latch = {};
      const mine = [b, Math.round(P0.move.x * 100), Math.round(P0.move.y * 100)];
      G.inputs[G.local][f + G.D] = mine;
      if (!out) { out = []; outF = f + G.D; } out.push(mine);
      // this frame, for both
      const simT = f * STEP, now0 = Input.now;
      for (let i = 0; i < 2; i++) { const x = G.inputs[i][f], p = G.net[i]; p.cpu.held = {}; A.forEach((a, k) => { p.cpu.held[a] = !!(x[0] & (1 << k)); }); p.cpu.move.x = x[1] / 100; p.cpu.move.y = x[2] / 100; p.poll(simT, [], false); }
      Input.now = simT;
      withRng(G.R, () => G.step(STEP));
      Input.now = now0;
      if (!G) return;   // the fight ended inside the step
      delete G.inputs[0][f - 120]; delete G.inputs[1][f - 120];
      G.f++; G.acc -= STEP; n++;
      if (G.f % HASH_EVERY === 0) { const h = fingerprint(); G.mine[G.f] = h; send({ t: 'h', f: G.f, h }); checkHash(G.f, null, true); }
    }
    if (out) send({ t: 'in', f: outF, d: out });
    // waiting on them for a while: say so
    if (n === 0) G.waitT += realDt; else G.waitT = 0;
    if (G.ui) G.ui.classList.toggle('wait', G.waitT > 0.5);
    if (G.waitT > 15) lost();
    if (n === 0) G.m.update === frame && G.step && updCameraOnly();
  }
  /* (stalled: keep the camera alive so the screen isn't frozen solid) */
  function updCameraOnly() { /* the last frame stays on screen; nothing to do */ }

  /* ------------------------------------------- fingerprints and resync */
  function fingerprint() {
    const m = G.m; let s = G.R.get() + ':' + m.phase + ':' + m.round + ':' + m.wins.join(',');
    for (const f of m.fighters) s += '|' + f.state + ',' + (f.move ? f.move.id : '') + ',' + f.pos.x.toFixed(2) + ',' + f.pos.y.toFixed(2) + ',' + f.pos.z.toFixed(2) + ',' + Math.round(f.hp);
    let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h;
  }
  function checkHash(f, theirs, mineJustMade) {
    if (theirs != null) G.theirs[f] = theirs;
    const a = G.mine[f], b = G.theirs[f];
    if (a == null || b == null) return;
    delete G.mine[f]; delete G.theirs[f];
    if (a !== b) { if (N.host) scheduleResync(); else send({ t: 'desync', f }); }
  }
  function scheduleResync() { if (!G || G.syncAt != null) return; G.syncAt = G.f + G.D * 2 + 12; send({ t: 'resync', at: G.syncAt }); }
  const SKIP = new Set(['m', 'opp', 'fig', 'obj', 'spin', 'input', 'build', 'baseBuild', 'st', 'opts', 'ready', 'trailR', 'trailL', 'brokenMat', 'idx', 'name', 'color']);
  function snapshot() {
    const m = G.m;
    return { R: G.R.get(), time: m.time, phase: m.phase, phaseT: m.phaseT, clock: m.clock, round: m.round, wins: m.wins.slice(), slow: m.slow, slowT: m.slowT, winner: m.winner,
      walls: m.arena.walls.map(w => w.stress),
      f: m.fighters.map(f => {
        const o = {};
        for (const k of Object.keys(f)) { if (SKIP.has(k)) continue; const v = f[k]; if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') o[k] = v; }
        o.pos = f.pos.toArray(); o.vel = f.vel.toArray(); o.move = f.move ? f.move.id : null;
        o.combo = Object.assign({}, f.combo, { by: f.combo.by ? f.combo.by.idx : -1 }); o.buffs = Object.assign({}, f.buffs); o.armor = Object.assign({}, f.armor);
        return o;
      }) };
  }
  function restore(s) {
    const m = G.m; G.R.set(s.R);
    Object.assign(m, { time: s.time, phase: s.phase, phaseT: s.phaseT, clock: s.clock, round: s.round, slow: s.slow, slowT: s.slowT, winner: s.winner }); m.wins = s.wins.slice();
    m.arena.walls.forEach((w, i) => { w.stress = s.walls[i]; });
    m.fighters.forEach((f, i) => {
      const o = s.f[i];
      for (const k in o) { if (['pos', 'vel', 'move', 'combo', 'buffs', 'armor'].includes(k)) continue; f[k] = o[k]; }
      f.pos.fromArray(o.pos); f.vel.fromArray(o.vel);
      if (!o.move) f.move = null; else if (KB.MOVES[o.move]) f.move = KB.MOVES[o.move];
      f.combo = Object.assign({}, o.combo, { by: o.combo.by >= 0 ? m.fighters[o.combo.by] : null }); f.buffs = o.buffs; f.armor = o.armor;
    });
  }

  /* --------------------------------------------------------- the end */
  function matchEnd(res) {
    if (!G) return;
    const local = G.local, opts = G.opts, win = res.winner === local, rec = res.records[local];
    const S = Auth.S, reward = win ? 100 : 40;
    S.records.matches++; if (win) S.records.wins++; else S.records.losses++;
    S.records.bestCombo = Math.max(S.records.bestCombo, rec.maxCombo); S.records.maxBounces = Math.max(S.records.maxBounces, rec.maxBounces); S.records.wallBreaks += rec.breaks;
    S.tokens += reward; Auth.save();
    const awards = window.Rewards ? Rewards.fightDone(res, opts) : [];
    setTimeout(() => {
      if (!N) return;
      const hud = U.$('hud'); if (hud) hud.hidden = true;
      const { btn } = Menu.ui, stat = (k, v) => el('div', null, el('small', null, k), el('b', null, v));
      N.again = N.again || {};
      N.result = el('div', { class: 'screen results' },
        el('div', { class: 'panel resp ' + (win ? 'win' : 'lose') },
          el('h1', null, win ? 'YOU WIN' : 'YOU LOSE'),
          el('div', { class: 'note' }, 'vs ' + (N.them ? N.them.name : 'your friend') + ' · online'),
          el('div', { class: 'score' }, res.wins[local] + ' — ' + res.wins[1 - local]),
          el('div', { class: 'recs' }, stat('BEST COMBO', rec.maxCombo), stat('MOST BOUNCES', rec.maxBounces), stat('WALL BREAKS', rec.breaks), stat('DAMAGE', Math.round(rec.dmg))),
          el('div', { class: 'reward' }, el('i', { class: 'coin' }), '+' + reward + ' TOKENS'),
          ...awards.map(a => el('div', { class: 'reward gold' }, '★ AWARD: ' + a.name + (a.pay ? '  +' + a.pay : ''))),
          N.ui = el('div', { class: 'againnote' }),
          el('div', { class: 'row' },
            btn('REMATCH', () => { if (!N || !N.conn) return; N.again = Object.assign(N.again || {}, { me: true }); send({ t: 'again' }); draw(); if (N.host && N.again.them) startFight(); }, 'big'),
            btn('BACK TO THE ROOM', () => { send({ t: 'leftfight' }); endFight(); N.stage = 'room'; App.setView(null); Online.open(true); }, 'ghost'),
            btn('LEAVE', () => Online.leave(), 'ghost'))));
      endFight();
      App.screen(N.result); draw();
    }, 900);
  }

  /* ------------------------------------------------------ in-fight UI */
  function drawHud() {
    if (!G || !G.ui) return;
    G.ui.innerHTML = '';
    G.ui.append(el('span', null, 'ONLINE · vs ' + (N.them ? N.them.name : '?') + ' · ' + Math.round(N.rtt || 0) + ' ms · delay ' + G.D), el('b', null, 'waiting for your friend...'));
  }
  Online.menu = () => {
    if (!G) return;
    if (G.menu) { G.menu.remove(); G.menu = null; return; }
    const { btn } = Menu.ui;
    G.menu = el('div', { class: 'overlay onlinemenu' }, el('div', { class: 'panel' },
      el('h2', null, 'ONLINE'), el('p', { class: 'note' }, 'The fight keeps going: an online fight can\'t be paused.'),
      el('div', { class: 'row' }, btn('BACK TO THE FIGHT', () => Online.menu(), 'big'), btn('LEAVE THE FIGHT', () => { send({ t: 'leftfight' }); endFight(); N.stage = 'room'; App.setView(null); Online.open(true); }, 'ghost danger'))));
    document.body.append(G.menu);
  };

  /* -------------------------------------------------------- the lobby */
  let drawPing = () => {};
  function draw() { if (N && N.redraw) N.redraw(); }
  Online.open = keep => {
    if (!keep || !N) { if (N) Online.leave(true); N = { stage: 'menu', status: '', host: false, myBuild: Auth.S.active || 0, cfg: { arena: 'random', wins: 2, bonus: false } }; }
    N.me = meInfo();
    const { btn, topbar } = Menu.ui, S = Auth.S;
    const render = () => {
      const fig = (who, b, tag) => el('div', { class: 'olcard' }, el('img', { src: Models.figIcon(b), alt: '' }), el('b', null, who), el('small', null, b.name), tag ? el('em', null, tag) : null);
      const seg = (label, val, opts, set) => el('div', { class: 'seg' }, el('span', null, label), el('div', null, ...opts.map(([v, t]) => el('button', { class: String(val) === String(v) ? 'on' : '', disabled: !N.host || null, onclick: () => { set(v); send({ t: 'cfg', cfg: N.cfg }); render(); } }, t))));
      const pickFig = el('div', { class: 'seg' }, el('span', null, 'YOUR FIGURE'), el('div', null, ...S.builds.map((b, i) => el('button', { class: i === N.myBuild ? 'on' : '', onclick: () => { N.myBuild = i; N.me = meInfo(); send({ t: 'fig', me: N.me }); render(); } }, b.name))));
      let body;
      if (N.stage === 'menu') {
        const code = el('input', { type: 'text', maxlength: 5, placeholder: 'CODE', class: 'olcode', autocomplete: 'off', oninput: e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); } });
        code.addEventListener('keydown', e => { if (e.key === 'Enter') join(); });
        const join = () => { const c = code.value.trim().toUpperCase(); if (c.length !== 5) { N.status = 'Room codes are five letters and numbers.'; render(); return; } Online.join(c); };
        body = [
          el('p', { class: 'note' }, 'Fight a friend over the internet. One of you HOSTS a room and gets a code; the other types the code in and JOINS.'),
          pickFig,
          el('div', { class: 'olrow' },
            el('div', { class: 'olbox' }, el('h3', null, 'HOST'), el('p', null, 'Make a room and share its code.'), btn('HOST A ROOM', () => Online.host(), 'big')),
            el('div', { class: 'olbox' }, el('h3', null, 'JOIN'), el('p', null, 'Got a code from a friend?'), code, btn('JOIN', join, 'big'))),
          el('p', { class: 'fine' }, 'Your browsers connect to each other directly (WebRTC); the free PeerJS service only introduces you. Like any peer-to-peer game, your friend\'s browser can see your IP address. Some school, work or mobile networks block this kind of connection.')];
      } else if (N.stage === 'hosting') {
        body = [
          el('p', { class: 'note' }, 'Your room is open. Send this code to your friend; they press JOIN and type it in.'),
          el('div', { class: 'olbig' }, N.code || '·····'),
          el('div', { class: 'row' }, N.code ? btn('COPY CODE', () => { try { navigator.clipboard.writeText(N.code); toastMsg('Copied ' + N.code); } catch (e) { /* fine */ } }, 'ghost') : null, btn('CLOSE THE ROOM', () => Online.open(), 'ghost')),
          el('p', { class: 'olwait' }, N.code ? 'Waiting for a friend to join...' : 'Opening the room...')];
      } else if (N.stage === 'joining') {
        body = [el('p', { class: 'olwait' }, 'Joining room ' + N.code + '...'), btn('CANCEL', () => Online.open(), 'ghost')];
      } else if (N.stage === 'room') {
        const c = N.cfg;
        body = [
          el('div', { class: 'olvs' }, fig(N.me.name + ' (you)', N.me.build, N.host ? 'HOST' : ''), el('b', { class: 'vs' }, 'VS'), N.them ? fig(N.them.name, N.them.build, N.host ? '' : 'HOST') : el('div', { class: 'olcard' }, el('small', null, 'Waiting...'))),
          drawPingEl = el('p', { class: 'olping' }, pingText()),
          pickFig,
          seg('ARENA', c.arena, [['random', 'Random'], ...Arena.LIST.map(a => [a, Arena.THEMES[a].name])], v => { c.arena = v; }),
          seg('ROUNDS', c.wins, [[1, 'First to 1'], [2, 'First to 2'], [3, 'First to 3']], v => { c.wins = +v; }),
          seg('RARITY BONUS', c.bonus, [[false, 'Off (fair)'], [true, 'On']], v => { c.bonus = v === true || v === 'true'; }),
          N.host ? btn('FIGHT!', () => { if (N.them) startFight(); }, 'big wide fight') : el('p', { class: 'olwait' }, 'Waiting for ' + (N.them ? N.them.name : 'the host') + ' to start the fight...'),
          el('div', { class: 'row' }, btn('LEAVE THE ROOM', () => Online.leave(), 'ghost'))];
      } else if (N.stage === 'fight' && N.result) {
        // the results screen redraws its rematch note
        if (N.ui) N.ui.textContent = N.again && N.again.me && N.again.them ? 'Starting...' : N.again && N.again.me ? 'Waiting for ' + (N.them ? N.them.name : 'your friend') + ' to say rematch...' : N.again && N.again.them ? (N.them ? N.them.name : 'Your friend') + ' wants a rematch!' : '';
        return;
      }
      if (N.stage === 'fight') return;
      App.screen(el('div', { class: 'screen online' }, topbar('ONLINE', () => Online.leave()),
        el('div', { class: 'panel olpanel' }, ...body, N.status ? el('p', { class: 'olstatus' }, N.status) : null)));
    };
    let drawPingEl = null;
    const pingText = () => N.rtt ? 'Ping ' + Math.round(N.rtt) + ' ms · input delay ' + U.clamp(Math.round(N.rtt / 2 / 16.7) + 2, 2, 8) + ' frames' : 'Measuring ping...';
    drawPing = () => { if (drawPingEl && document.body.contains(drawPingEl)) drawPingEl.textContent = pingText(); };
    N.redraw = render;
    if (N.stage !== 'fight') { useMenuRoom(); render(); }
  };
  const toastMsg = t => Menu.toast && Menu.toast(t, 'gold');
  const useMenuRoom = () => { if (!App.view || App.view.fighters) App.setView(null); Music.play('menu'); };

  Online.host = async () => {
    N.stage = 'hosting'; N.host = true; N.status = ''; N.code = null; draw();
    try { await loadPeer(); } catch (e) { N.stage = 'menu'; N.status = e.message; draw(); return; }
    const open = () => {
      const code = makeCode(), peer = new Peer(PREFIX + code, { debug: 0 });
      N.peer = peer;
      peer.on('open', () => { if (N && N.peer === peer) { N.code = code; draw(); } });
      peer.on('connection', conn => { if (!N || N.conn) { conn.on('open', () => conn.close()); return; } attach(conn); });
      peer.on('error', e => { if (!N || N.peer !== peer) return; if (e.type === 'unavailable-id') { peer.destroy(); open(); return; } if (e.type === 'peer-unavailable') return; N.status = why(e); if (!N.them) { N.stage = 'menu'; } draw(); });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* fine */ } });
    };
    open();
  };
  Online.join = async code => {
    N.stage = 'joining'; N.host = false; N.code = code; N.status = ''; draw();
    try { await loadPeer(); } catch (e) { N.stage = 'menu'; N.status = e.message; draw(); return; }
    const peer = new Peer({ debug: 0 }); N.peer = peer;
    peer.on('open', () => { if (!N || N.peer !== peer) return; const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }); attach(conn); setTimeout(() => { if (N && N.stage === 'joining') { N.stage = 'menu'; N.status = 'No answer from room ' + code + '. Check the code, or ask your friend to host again.'; draw(); } }, 12000); });
    peer.on('error', e => { if (!N || N.peer !== peer) return; N.stage = 'menu'; N.status = why(e); draw(); });
  };
  Online.leave = quiet => {
    if (!N) return;
    if (G) { send({ t: 'leftfight' }); endFight(); App.setView(null); }
    send({ t: 'bye' });
    clearInterval(N.pingT);
    try { if (N.conn) N.conn.close(); } catch (e) { /* fine */ }
    try { if (N.peer) N.peer.destroy(); } catch (e) { /* fine */ }
    N = null;
    if (!quiet) Menu.hub();
  };
  Online.running = () => !!G;
  Online._t = { rng, withRng, onIn: null, info: () => G ? { f: G.f, D: G.D, local: G.local, syncs: G.syncs || 0, hp: G.m.fighters.map(f => Math.round(f.hp)), fp: fingerprint(), stage: N && N.stage } : { stage: N && N.stage, them: N && N.them && N.them.name, code: N && N.code, status: N && N.status } };   // (tests)
  Online.version = VERSION;
})();
