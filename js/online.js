/* ============================================================================
   online.js -- ONLINE: fight a friend over the internet.

   One of you HOSTS a room and gets a five-letter code; the other JOINS with
   it. The two browsers connect directly (WebRTC), introduced by the free
   PeerJS matchmaking service, so there is no game server to run. In the room
   you both pick a figure (any of yours, or any base character).

   The netcode is ROLLBACK, the GGPO kind fighting games use: both games run
   the same fight, frame by frame (60 a second), and only the buttons travel.
   Your presses play a frame or two later (a small input delay) on both
   screens. Your friend's presses take a moment to arrive, so the game doesn't
   wait for them: it guesses (they're still doing what they did last) and
   plays on, saving the fight on every guessed frame. When their real buttons
   come in and the guess was wrong, it puts the fight back to that frame and
   replays the frames since with the right buttons, in an instant and in
   silence (no sounds, effects or banners twice). The guess is right most of
   the time, so most frames never need it.

   For that the fight is deterministic online: fixed 1/60 s steps, one seeded
   random source for everything that matters (U.rand is seeded during a step;
   looks use U.vrand), timers and the beat on the fight's clock. Every half
   second the two compare a fingerprint of a settled frame; if they ever
   differ (two browsers doing maths a hair apart), the host's fight is copied
   over at an agreed frame. Events (for rewards) and the end of the match only
   count once their frame is settled.

     Online.open()   (the lobby)
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const VERSION = 'kb-online-3';                  // both players need the same game: a different build won't connect
  const PEER_JS = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
  const PREFIX = 'knockback-room-', ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const STEP = 1 / 60, HASH_EVERY = 30;
  const MAXP = 8;                                 // how many frames the fight may run ahead of your friend's last buttons
  const ZERO = [0, 0, 0];
  const ACT = () => Input.ACTIONS;
  // input delay: a frame or two, and on a long ping enough that rollback never has to guess more than ~5 frames
  const delayFor = rtt => U.clamp(Math.max(rtt < 60 ? 1 : 2, Math.ceil(rtt / 2 / 16.7) - 5), 1, 8);

  const Online = window.Online = {};
  let N = null;   // the session: { peer, conn, host, code, me, them, rtt, ui, cfg, pick }
  let G = null;   // the fight running: { m, R, local, D, f, conf, inputs, snaps, ... }

  /* ---------------------------------------------------- seeded random */
  function rng(seed) {
    let s = seed >>> 0;
    const f = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.get = () => s; f.set = v => { s = v | 0; };
    return f;
  }
  const withRng = (R, fn) => { U.setRand(R); try { return fn(); } finally { U.setRand(null); } };

  /* ============================================ the fight, saved and put back
     A rollback needs the whole fight as it was a few frames ago: every
     fighter, figure pose, buffered press, projectile, imp, dropped part, timer
     and the Art on screen. Rather than a list of fields (that would go stale
     as the game grows), this walks the fight from the match object down and
     saves every object it reaches BY VALUE, keeping which object it was:
       plain objects, arrays, Sets, fighters and input players: their fields
       three.js objects: transform, visibility, parent, children, material
       vectors, quaternions, eulers, colours: their numbers
     Anything else (materials, geometry, move data) is kept by reference.
     Putting it back writes those values into the same objects, so everything
     that points at them (the scene, other fighters) is right again; objects
     made since are simply no longer referenced, and the fight's scene objects
     made since leave the scene. Static data (KB, Anim, the Arts tables) is
     never walked. Looks stay out: weapon trails, wall cracks, the camera, the
     particles. */
  const K_OBJ = 0, K_ARR = 1, K_O3 = 2, K_V3 = 3, K_V2 = 4, K_Q = 5, K_E = 6, K_COL = 7, K_SET = 8, K_SCENE = 9;
  const STATIC = new WeakSet(), SIMS = new WeakSet(), IGNS = new WeakMap(), NOWS = new WeakMap(), SEEN = new Set();
  let WALK = new Set(), SC = null, staticDone = false;
  const F_NOW = new Set(['m', 'opts', 'build', 'baseBuild', 'st', 'ready', 'brokenMat']);
  function markStatic(root) {
    const st = [root];
    while (st.length) {
      const o = st.pop(); if (!o || typeof o !== 'object' || STATIC.has(o)) continue;
      const pr = Object.getPrototypeOf(o); if (!Array.isArray(o) && pr !== Object.prototype && pr !== null) continue;
      STATIC.add(o); for (const k in o) { const v = o[k]; if (v && typeof v === 'object') st.push(v); }
    }
  }
  /* get a match ready to be saved (net: its two input players) */
  function prepSnap(m, net, extra) {
    if (!staticDone) { staticDone = true; [KB, window.Anim, window.Arts && Arts.ART, window.Arts && Arts.Prop].forEach(o => o && markStatic(o)); }
    WALK = new Set([m.fighters[0].constructor.prototype, net[0].constructor.prototype].concat(extra || []));
    IGNS.set(m, new Set(['scene', 'camera', 'arena', 'fx', 'camT', 'camP', 'camShake', 'camShot']));
    NOWS.set(m, new Set(['opts']));
    for (const f of m.fighters) { IGNS.set(f, new Set(['trailR', 'trailL'])); NOWS.set(f, F_NOW); }
    for (const w of m.arena.walls) IGNS.set(w, new Set(['cracks']));
    SC = { m, net };
  }
  function visit(o, out) {
    if (SEEN.has(o) || STATIC.has(o)) return;
    SEEN.add(o);
    if (o.isObject3D) {
      SIMS.add(o);
      const p = o.position, q = o.quaternion, e = o.rotation, s = o.scale;
      out.push(K_O3, o, [o.parent, o.children.slice(), o.visible, o.material, p.x, p.y, p.z, q._x, q._y, q._z, q._w, e._x, e._y, e._z, e._order, s.x, s.y, s.z]);
      SEEN.add(p); SEEN.add(q); SEEN.add(e); SEEN.add(s);
      const ch = o.children; for (let i = 0; i < ch.length; i++) visit(ch[i], out);
      return;
    }
    if (Array.isArray(o)) { const c = o.slice(); out.push(K_ARR, o, c); for (let i = 0; i < c.length; i++) { const v = c[i]; if (v !== null && typeof v === 'object') visit(v, out); } return; }
    if (o.isVector3) { out.push(K_V3, o, [o.x, o.y, o.z]); return; }
    if (o.isVector2) { out.push(K_V2, o, [o.x, o.y]); return; }
    if (o.isQuaternion) { out.push(K_Q, o, [o._x, o._y, o._z, o._w]); return; }
    if (o.isEuler) { out.push(K_E, o, [o._x, o._y, o._z, o._order]); return; }
    if (o.isColor) { out.push(K_COL, o, [o.r, o.g, o.b]); return; }
    if (o instanceof Set) { const c = Array.from(o); out.push(K_SET, o, c); for (const v of c) if (v !== null && typeof v === 'object') visit(v, out); return; }
    const pr = Object.getPrototypeOf(o);
    if (pr !== Object.prototype && pr !== null && !WALK.has(pr)) return;    // anything else is kept by reference
    const ign = IGNS.get(o), now = NOWS.get(o), keys = Object.keys(o), rec = [];
    for (let i = 0; i < keys.length; i++) { const k = keys[i]; if (ign && ign.has(k)) continue; rec.push(k, o[k]); }
    out.push(K_OBJ, o, rec);
    for (let i = 1; i < rec.length; i += 2) { const v = rec[i]; if (v !== null && typeof v === 'object' && !(now && now.has(rec[i - 1]))) visit(v, out); }
  }
  function snapshot() {
    const m = SC.m, out = [];
    SEEN.clear();
    out.push(K_SCENE, m.scene, m.scene.children.slice());
    visit(m, out); visit(m.arena.walls, out); visit(SC.net[0], out); visit(SC.net[1], out);
    SEEN.clear();
    return out;
  }
  function restoreObj(o, r) {
    const ks = Object.keys(o), ign = IGNS.get(o);
    let same = !ign && ks.length * 2 === r.length;
    if (same) for (let j = 0; j < ks.length; j++) if (ks[j] !== r[j * 2]) { same = false; break; }
    if (!same) {
      if (ign) { const want = new Set(); for (let j = 0; j < r.length; j += 2) want.add(r[j]); for (const k of ks) if (!want.has(k) && !ign.has(k)) o[k] = undefined; }   // (fighters and the match keep their shape)
      else for (const k of ks) delete o[k];                                                                                                                                // (the rest: the same keys in the same order)
    }
    for (let j = 0; j < r.length; j += 2) o[r[j]] = r[j + 1];
  }
  function restoreO3(o, r) {
    const kids = r[1], cur = o.children;
    let same = cur.length === kids.length;
    if (same) for (let j = 0; j < cur.length; j++) if (cur[j] !== kids[j]) { same = false; break; }
    if (!same) { for (const c of cur) if (c.parent === o && kids.indexOf(c) < 0) c.parent = null; cur.length = 0; for (const c of kids) cur.push(c); }
    o.parent = r[0]; o.visible = r[2]; if (r[3] !== undefined) o.material = r[3];
    const p = o.position, q = o.quaternion, e = o.rotation, s = o.scale;
    p.x = r[4]; p.y = r[5]; p.z = r[6]; q._x = r[7]; q._y = r[8]; q._z = r[9]; q._w = r[10];
    e._x = r[11]; e._y = r[12]; e._z = r[13]; e._order = r[14]; s.x = r[15]; s.y = r[16]; s.z = r[17];
  }
  /* the scene: the fight's own objects as they were; everything else (the arena, particles, trails) as it is now */
  function restoreScene(sc, rec) {
    const keep = [], cur = sc.children;
    for (const c of cur) { if (!SIMS.has(c)) keep.push(c); else if (rec.indexOf(c) < 0 && c.parent === sc) c.parent = null; }
    cur.length = 0; for (const c of keep) cur.push(c); for (const c of rec) if (SIMS.has(c)) cur.push(c);
  }
  function restoreSnap(out) {
    for (let i = 0; i < out.length; i += 3) {
      const k = out[i], o = out[i + 1], r = out[i + 2];
      if (k === K_OBJ) restoreObj(o, r);
      else if (k === K_ARR) { o.length = r.length; for (let j = 0; j < r.length; j++) o[j] = r[j]; }
      else if (k === K_O3) restoreO3(o, r);
      else if (k === K_V3) { o.x = r[0]; o.y = r[1]; o.z = r[2]; }
      else if (k === K_V2) { o.x = r[0]; o.y = r[1]; }
      else if (k === K_Q) { o._x = r[0]; o._y = r[1]; o._z = r[2]; o._w = r[3]; }
      else if (k === K_E) { o._x = r[0]; o._y = r[1]; o._z = r[2]; o._order = r[3]; }
      else if (k === K_COL) { o.r = r[0]; o.g = r[1]; o.b = r[2]; }
      else if (k === K_SET) { o.clear(); for (const v of r) o.add(v); }
      else if (k === K_SCENE) restoreScene(o, r);
    }
  }
  /* (tests) a hash of every value in a save: two saves of the same fight hash the same */
  function hashSnap(out, figOnly) {
    let h = 5381;
    const mix = s => { s = String(s); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; };
    const val = v => { if (v === undefined) return; if (v === null || typeof v !== 'object') mix(typeof v === 'function' ? 'fn' : v); else mix(Array.isArray(v) ? 'a' + v.length : 'o'); };
    for (let i = 0; i < out.length; i += 3) {
      const k = out[i], r = out[i + 2]; mix('|' + k);
      if (k === K_OBJ) { for (let j = 0; j < r.length; j += 2) if (r[j + 1] !== undefined) { mix(r[j]); val(r[j + 1]); } }
      else if (k === K_O3) { if (figOnly && !figOnly(out[i + 1])) continue; mix(r[1].length + ':' + r[2]); for (let j = 4; j < r.length; j++) mix(r[j]); }
      else if (k === K_SCENE) continue;
      else for (const v of r) val(v);
    }
    return h;
  }

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

  /* -------------------------------------------- picking a figure
     any of your own figures, or any base character (its Standard set) */
  function buildOf(key) {
    const S = Auth.S; key = String(key || '');
    if (key.startsWith('mint:') && KB.LINES[key.slice(5)]) return KB.mintBuild(key.slice(5), 0);
    const i = key.startsWith('mine:') ? +key.slice(5) : 0;
    return Inv.levelled(S.builds[i] || S.builds[S.active || 0] || S.builds[0]);
  }
  function meInfo() {
    const b = buildOf(N && N.pick);
    return { name: Auth.user.user, build: b, fig: b.name, line: b.core.line };
  }
  const figLabel = info => info.build && info.build.core ? KB.LINES[info.build.core.line].name : '';
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
    N.conn = null; N.them = null; N.again = null; N.result = null;
    if (G) endFight();
    N.status = name + (wasFight ? ' disconnected during the fight.' : ' left.');
    N.stage = N.host && N.peer && !N.peer.destroyed ? 'hosting' : 'menu';
    App.setView(null); Online.open(true);
  }
  function startPing() {
    clearInterval(N.pingT);
    N.pingT = setInterval(() => { if (!N || !N.conn) return; send({ t: 'ping', ts: performance.now() }); }, 1000);
  }
  /* back to the room (character select), after a fight or out of one */
  function toRoom(status) {
    if (G) endFight();
    N.again = null; N.result = null; N.stage = 'room'; N.status = status || '';
    App.setView(null); Online.open(true);
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
      case 'in':
        if (G) { const I = G.inputs[1 - G.local]; d.d.forEach((x, k) => { I[d.f + k] = x; }); if (d.cur != null) { G.remF = d.cur; G.remAt = performance.now(); } if (d.adv != null) G.radv = d.adv; if (Online._t.onIn) Online._t.onIn(); }
        return;
      case 'h': if (G) checkHash(d.f, d.h); return;
      case 'desync': if (G && N.host) scheduleResync(); return;
      case 'resync': if (G && !N.host) { if (d.at < G.f) { send({ t: 'desync' }); return; } G.syncAt = d.at; G.snap = null; } return;
      case 'snap': if (G && !N.host) G.snap = d; return;
      case 'again': N.again = Object.assign(N.again || {}, { them: true }); draw(); if (N.host && N.again.me && !G) startFight(); return;
      case 'select': if (!G && N.stage === 'fight') toRoom((N.them ? N.them.name : 'Your friend') + ' went back to character select.'); return;
      case 'leftfight': if (G || N.result) toRoom((N.them ? N.them.name : 'Your friend') + ' left the fight.'); return;
      case 'bye': return;
    }
  }

  /* ------------------------------------------------- start a fight */
  function startFight(seed) {
    const c = N.cfg, arena = c.arena === 'random' ? U.pick(Arena.LIST) : c.arena;
    const cfg = { seed: seed != null ? seed : (U.vrand() * 4294967296) >>> 0, D: delayFor(N.rtt || 80), arena, wins: c.wins, bonus: c.bonus, builds: [N.me.build, N.them.build], names: [N.me.name, N.them.name] };
    send({ t: 'start', cfg }); begin(cfg, 0);
  }
  function begin(cfg, local) {
    N.again = null; N.result = null; N.stage = 'fight';
    const PC = Input.players[0].constructor, net = [new PC(0), new PC(1)];
    net.forEach(p => { p.cpu = { held: {}, move: { x: 0, y: 0 } }; });
    Input.mode = 'solo';
    const builds = cfg.builds.map((b, i) => Object.assign({}, b, { name: cfg.names[i] }));
    // the end of the match waits for its frame to be settled (a guessed KO can still be taken back)
    const opts = { mode: 'online', online: true, local, builds, cpu: [null, null], arena: cfg.arena, wins: cfg.wins, time: 99, bonus: cfg.bonus, inputs: net, onEnd: res => { if (G && !G.ended && !G.endQ) G.endQ = { f: G.simF, res }; } };
    App.screen(null); Music.play('battle');
    const m = Match.create(opts); App.setView(m);
    // the same start on both screens: the seed, then the round laid out again under it
    const R = rng(cfg.seed);
    withRng(R, () => m.restart());
    G = { m, R, net, local, D: cfg.D, f: 0, conf: 0, simF: 0, inputs: [{}, {}], used: {}, snaps: {}, rb: null, acc: 0, latch: {}, hq: {}, mine: {}, theirs: {}, hashFloor: -1,
      evq: [], endQ: null, ended: false, syncAt: null, snap: null, waitT: 0, remF: null, remAt: 0, adv: 0, raw: null, radv: null, lastSkip: 0, opts, cfg,
      syncs: 0, rollbacks: 0, rbFrames: 0, rbMax: 0, rbMs: 0, rbSum: 0, guesses: 0, skips: 0 };
    for (let k = 0; k < G.D; k++) { G.inputs[0][k] = ZERO; G.inputs[1][k] = ZERO; }
    G.step = m.update; m.update = frame;
    // events (rewards listen) wait for their frame to be settled too, with the combos as they were then
    m.evHook = (type, d) => { if (G) G.evq.push({ f: G.simF, type, d, combos: m.fighters.map(x => Object.assign({}, x.combo)) }); };
    prepSnap(m, net);
    if (window.Rewards) Rewards.watch(m, opts);
    G.ui = el('div', { class: 'onlinehud' }); U.$('hud').append(G.ui); drawHud();
  }
  function endFight() {
    if (!G) return;
    if (G.menu) G.menu.remove(); if (G.ui) G.ui.remove();
    G = null;
  }

  /* ------------------------------------------------------ the frame
     every real frame: check the guesses against the buttons that came in (and replay if one was wrong),
     then step the fight on as far as real time says, guessing where their buttons haven't come yet */
  const sameIn = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  function frame(realDt) {
    if (!G) return;
    const P0 = Input.players[0], A = ACT();
    for (const a of A) if (P0.held[a]) G.latch[a] = true;          // a tap between two fight frames still counts
    // Esc / Start: the online menu (the fight doesn't stop)
    const esc = Input.keyDown('Escape') || P0.pressed('pause');
    if (esc && !G.escHeld) Online.menu(); G.escHeld = esc;
    // 1. their buttons that came in: were the guesses right?
    const T = G.inputs[1 - G.local];
    while (T[G.conf]) { const f = G.conf; if (f < G.f && !sameIn(G.used[f], T[f]) && (G.rb == null || f < G.rb)) G.rb = f; G.conf++; }
    if (G.rb != null) { rollback(); if (!G) return; }
    for (const k in G.snaps) if (+k < G.conf) delete G.snaps[k];
    /* 2. keep in step (GGPO's time sync): each side measures how far it is ahead of the other's last frame and sends it;
       half the difference of the two is how far ahead this game really is (the ping cancels out). Ahead: hold back a frame
       now and then, else this game would guess further and further ahead of its friend's buttons */
    if (G.remF != null) {
      G.raw = G.f - (G.remF + (performance.now() - G.remAt) * 0.06);
      if (G.radv != null) G.adv = G.adv * 0.9 + (G.raw - G.radv) / 2 * 0.1;
    }
    // 3. the new frames
    G.acc = Math.min(G.acc + realDt, STEP * 6);
    let n = 0, out = null, outF = 0, waiting = false;
    while (G.acc >= STEP && n < 4) {
      if (G.syncAt != null && G.f >= G.syncAt && !barrier()) { waiting = true; break; }
      if (G.f - G.conf >= MAXP) { waiting = true; break; }                // too far ahead of their buttons: wait for them
      const now = performance.now();
      if (G.adv > 1 && now - G.lastSkip > 200) { G.lastSkip = now; G.adv -= 1; G.acc -= STEP; G.skips++; continue; }
      // ours, for D frames from now
      let b = 0; A.forEach((a, i) => { if (P0.held[a] || G.latch[a]) b |= 1 << i; }); G.latch = {};
      const mine = [b, Math.round(P0.move.x * 100), Math.round(P0.move.y * 100)];
      G.inputs[G.local][G.f + G.D] = mine;
      if (!out) { out = []; outF = G.f + G.D; } out.push(mine);
      simFrame(G.f); if (!G) return;
      G.f++; G.acc -= STEP; n++;
    }
    if (out) send({ t: 'in', f: outF, d: out, cur: G.f, adv: G.raw == null ? null : Math.round(G.raw * 10) / 10 });
    // 4. what's settled now: events, fingerprints, the end of the match
    settle(); if (!G) return;
    for (let i = 0; i < 2; i++) for (const k in G.inputs[i]) if (+k < G.conf - 40) delete G.inputs[i][k];
    for (const k in G.used) if (+k < G.conf - 40) delete G.used[k];
    // waiting on them for a while: say so
    if (waiting && n === 0) G.waitT += realDt; else G.waitT = 0;
    if (G.ui) G.ui.classList.toggle('wait', G.waitT > 0.5);
    if (G.waitT > 15) lost();
  }
  /* one fight frame: both players' buttons (theirs guessed if they haven't come: the last ones again; the fight is saved first) */
  function simFrame(f) {
    const A = ACT(), r = 1 - G.local, T = G.inputs[r];
    let x = T[f];
    if (!x) { x = T[G.conf - 1] || ZERO; G.snaps[f] = { R: G.R.get(), s: snapshot() }; G.guesses++; }
    G.used[f] = x;
    const simT = f * STEP, now0 = Input.now;
    for (let i = 0; i < 2; i++) {
      const b = i === r ? x : (G.inputs[i][f] || ZERO), p = G.net[i];
      p.cpu.held = {}; A.forEach((a, k) => { p.cpu.held[a] = !!(b[0] & (1 << k)); }); p.cpu.move.x = b[1] / 100; p.cpu.move.y = b[2] / 100;
      p.poll(simT, [], false);
    }
    G.simF = f; Input.now = simT;
    withRng(G.R, () => G.step(STEP));
    Input.now = now0;
    if (G && (f + 1) % HASH_EVERY === 0) { G.hq[f + 1] = fingerprint(); if (Online._t.debug) (G.dbg = G.dbg || {})[f + 1] = fpStr(); }
    if (G && Online._t.debug === 2) (G.deep = G.deep || {})[f + 1] = hashSnap(snapshot(), Online._t.deepFilter);
  }
  /* a guess was wrong: back to that frame, and replay to now with the right buttons (quietly: you've seen these frames) */
  function rollback() {
    const rb = G.rb; G.rb = null;
    const S = G.snaps[rb];
    if (!S) { console.warn('[online] no save for frame ' + rb); return; }
    const t0 = performance.now(), m = G.m, to = G.f;
    snapshot();                                   // (marks the fight's scene objects made since the save, so they go)
    const fx0 = new Set(m.fx), cine0 = m.cine;
    restoreSnap(S.s); G.R.set(S.R);
    G.evq = G.evq.filter(e => e.f < rb); if (G.endQ && G.endQ.f >= rb) G.endQ = null;
    G.f = rb; U.quiet = true;
    try { while (G && G.f < to) { simFrame(G.f); G.f++; } } finally { U.quiet = false; }
    if (!G) return;
    // looks: lines drawn during the replay go (you saw them the first time); the cinema bars and lights catch up
    for (let i = m.fx.length - 1; i >= 0; i--) { const e = m.fx[i]; if (fx0.has(e)) continue; m.scene.remove(e.m); e.m.geometry.dispose(); e.m.material.dispose(); m.fx.splice(i, 1); }
    if (!!cine0 !== !!m.cine) { HUD.cine(!!m.cine); if (!m.cine) { HUD.cineTint(null); const Ar = m.arena; if (Ar.hemi) { Ar.hemi.intensity = Ar.base.hemi; Ar.sun.intensity = Ar.base.sun; } } }
    const ms = performance.now() - t0;
    G.rollbacks++; G.rbFrames += to - rb; G.rbMax = Math.max(G.rbMax, to - rb); G.rbMs = Math.max(G.rbMs, ms); G.rbSum += ms;
  }
  /* frames below min(settled, simulated) are final: their events go to the listeners, their fingerprints to your friend */
  function settle() {
    const done = Math.min(G.conf, G.f), m = G.m;
    while (G.evq.length && G.evq[0].f < done) {
      const e = G.evq.shift(), F = m.fighters, keep = F.map(x => x.combo);
      F.forEach((x, i) => { x.combo = e.combos[i]; });
      try { m.dispatch(e.type, e.d); } finally { F.forEach((x, i) => { x.combo = keep[i]; }); }
    }
    for (const h in G.hq) if (+h <= done) { const v = G.hq[h]; delete G.hq[h]; G.mine[h] = v; send({ t: 'h', f: +h, h: v }); checkHash(+h); }
    if (G.endQ && G.endQ.f < done) { const r = G.endQ.res; G.endQ = null; G.ended = true; matchEnd(r); }
  }

  /* ------------------------------------------- fingerprints and resync */
  function fingerprint() {
    const s = fpStr();
    let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h;
  }
  function fpStr() {
    const m = G.m; let s = G.R.get() + ':' + m.phase + ':' + m.round + ':' + m.wins.join(',') + ':' + m.projs.length + ',' + m.minions.length + ',' + m.picks.length;
    for (const f of m.fighters) s += '|' + f.state + ',' + (f.move ? f.move.id : '') + ',' + f.pos.x.toFixed(2) + ',' + f.pos.y.toFixed(2) + ',' + f.pos.z.toFixed(2) + ',' + Math.round(f.hp) + ',' + Math.round(f.hype) + ',' + f.combo.hits;
    return s;
  }
  function checkHash(f, theirs) {
    if (theirs != null) G.theirs[f] = theirs;
    const a = G.mine[f], b = G.theirs[f];
    if (a == null || b == null) return;
    delete G.mine[f]; delete G.theirs[f];
    if (a !== b && f > G.hashFloor) { G.desyncs = (G.desyncs || 0) + 1; if (N.host) scheduleResync(); else send({ t: 'desync', f }); }
  }
  function scheduleResync() { if (!G || G.syncAt != null) return; G.syncAt = G.f + MAXP + 24; send({ t: 'resync', at: G.syncAt }); }
  /* the agreed frame: once every frame before it is settled, the host sends its fight and the guest takes it */
  function barrier() {
    if (G.conf < G.syncAt || G.f > G.syncAt) return G.f > G.syncAt ? (G.syncAt = null, true) : false;
    if (N.host) {
      if (G.m.cine) { G.syncAt += 30; send({ t: 'resync', at: G.syncAt }); return true; }
      send({ t: 'snap', at: G.syncAt, s: valueSnap() }); G.hashFloor = G.syncAt; G.syncAt = null; G.syncs++; return true;
    }
    if (!G.snap || G.snap.at !== G.syncAt) return false;
    valueRestore(G.snap.s); G.hashFloor = G.syncAt; G.snap = null; G.syncAt = null; G.syncs++;
    return true;
  }
  /* the fight by value, to send (the fighters and the match; it's a safety net that should never be needed) */
  const SKIP = new Set(['m', 'opp', 'fig', 'obj', 'spin', 'input', 'build', 'baseBuild', 'st', 'opts', 'ready', 'trailR', 'trailL', 'brokenMat', 'idx', 'name', 'color']);
  function valueSnap() {
    const m = G.m;
    return { R: G.R.get(), time: m.time, phase: m.phase, phaseT: m.phaseT, clock: m.clock, round: m.round, wins: m.wins.slice(), slow: m.slow, slowT: m.slowT, winner: m.winner, frozen: m.frozen, freezeT: m.freezeT, freezer: m.freezer ? m.freezer.idx : -1,
      walls: m.arena.walls.map(w => w.stress),
      f: m.fighters.map(f => {
        const o = {};
        for (const k of Object.keys(f)) { if (SKIP.has(k)) continue; const v = f[k]; if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') o[k] = v; }
        o.pos = f.pos.toArray(); o.vel = f.vel.toArray(); o.move = f.move ? f.move.id : null;
        o.combo = Object.assign({}, f.combo, { by: f.combo.by ? f.combo.by.idx : -1 }); o.buffs = Object.assign({}, f.buffs); o.armor = Object.assign({}, f.armor);
        return o;
      }) };
  }
  function valueRestore(s) {
    const m = G.m; G.R.set(s.R);
    Object.assign(m, { time: s.time, phase: s.phase, phaseT: s.phaseT, clock: s.clock, round: s.round, slow: s.slow, slowT: s.slowT, winner: s.winner, frozen: s.frozen, freezeT: s.freezeT, freezer: s.freezer >= 0 ? m.fighters[s.freezer] : null }); m.wins = s.wins.slice();
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
    const recs = { maxCombo: rec.maxCombo, maxBounces: rec.maxBounces, breaks: rec.breaks, dmg: rec.dmg }, wins = res.wins.slice();
    setTimeout(() => {
      if (!N || N.stage !== 'fight') return;
      const hud = U.$('hud'); if (hud) hud.hidden = true;
      const { btn } = Menu.ui, stat = (k, v) => el('div', null, el('small', null, k), el('b', null, v));
      N.again = N.again || {};
      N.result = el('div', { class: 'screen results' },
        el('div', { class: 'panel resp ' + (win ? 'win' : 'lose') },
          el('h1', null, win ? 'YOU WIN' : 'YOU LOSE'),
          el('div', { class: 'note' }, 'vs ' + (N.them ? N.them.name : 'your friend') + ' · online'),
          el('div', { class: 'score' }, wins[local] + ' — ' + wins[1 - local]),
          el('div', { class: 'recs' }, stat('BEST COMBO', recs.maxCombo), stat('MOST BOUNCES', recs.maxBounces), stat('WALL BREAKS', recs.breaks), stat('DAMAGE', Math.round(recs.dmg))),
          el('div', { class: 'reward' }, el('i', { class: 'coin' }), '+' + reward + ' TOKENS'),
          ...awards.map(a => el('div', { class: 'reward gold' }, '★ AWARD: ' + a.name + (a.pay ? '  +' + a.pay : ''))),
          N.ui = el('div', { class: 'againnote' }),
          el('div', { class: 'row' },
            btn('REMATCH', () => { if (!N || !N.conn) return; N.again = Object.assign(N.again || {}, { me: true }); send({ t: 'again' }); draw(); if (N.host && N.again.them) startFight(); }, 'big'),
            btn('CHARACTER SELECT', () => { if (!N) return; send({ t: 'select' }); toRoom(); }, 'big ghost'),
            btn('LEAVE', () => Online.leave(), 'ghost'))));
      endFight();
      App.screen(N.result); draw();
    }, 900);
  }

  /* ------------------------------------------------------ in-fight UI */
  function drawHud() {
    if (!G || !G.ui) return;
    G.ui.innerHTML = '';
    G.ui.append(el('span', null, 'ONLINE · vs ' + (N.them ? N.them.name : '?') + ' · ' + Math.round(N.rtt || 0) + ' ms · rollback, delay ' + G.D), el('b', null, 'waiting for your friend...'));
  }
  Online.menu = () => {
    if (!G) return;
    if (G.menu) { G.menu.remove(); G.menu = null; return; }
    const { btn } = Menu.ui;
    G.menu = el('div', { class: 'overlay onlinemenu' }, el('div', { class: 'panel' },
      el('h2', null, 'ONLINE'), el('p', { class: 'note' }, 'The fight keeps going: an online fight can\'t be paused.'),
      el('div', { class: 'row' }, btn('BACK TO THE FIGHT', () => Online.menu(), 'big'), btn('LEAVE THE FIGHT', () => { send({ t: 'leftfight' }); toRoom(); }, 'ghost danger'))));
    document.body.append(G.menu);
  };

  /* -------------------------------------------------------- the lobby */
  let drawPing = () => {};
  function draw() { if (N && N.redraw) N.redraw(); }
  Online.open = keep => {
    if (!keep || !N) { if (N) Online.leave(true); N = { stage: 'menu', status: '', host: false, pick: 'mine:' + (Auth.S.active || 0), cfg: { arena: 'random', wins: 2, bonus: false } }; }
    N.me = meInfo();
    const { btn, topbar } = Menu.ui, S = Auth.S;
    const render = () => {
      const fig = (who, info, tag) => el('div', { class: 'olcard', style: { '--lc': info.build && info.build.core ? KB.LINES[info.build.core.line].css : '' } }, el('img', { src: Models.figIcon(info.build), alt: '' }), el('b', null, who), el('small', null, info.fig + (figLabel(info) ? ' · ' + figLabel(info) : '')), tag ? el('em', null, tag) : null);
      const seg = (label, val, opts, set) => el('div', { class: 'seg' }, el('span', null, label), el('div', null, ...opts.map(([v, t]) => el('button', { class: String(val) === String(v) ? 'on' : '', disabled: !N.host || null, onclick: () => { set(v); send({ t: 'cfg', cfg: N.cfg }); render(); } }, t))));
      // CHARACTER SELECT: your own figures, then every base character
      const tile = (key, b, top, sub) => el('button', { class: 'olpick' + (key === N.pick ? ' on' : ''), style: { '--lc': KB.LINES[b.core.line].css }, title: b.name, onclick: () => { N.pick = key; N.me = meInfo(); send({ t: 'fig', me: N.me }); render(); } },
        el('img', { src: Models.figIcon(b), alt: '' }), el('b', null, top), el('small', null, sub));
      const pickFig = el('div', { class: 'olselect' },
        el('h3', null, 'CHARACTER SELECT'),
        el('small', { class: 'olsub' }, 'YOUR FIGURES'),
        el('div', { class: 'olgrid' }, ...S.builds.map((b, i) => { const lb = Inv.levelled(b); return tile('mine:' + i, lb, lb.name, KB.LINES[lb.core.line].name); })),
        el('small', { class: 'olsub' }, 'BASE CHARACTERS'),
        el('div', { class: 'olgrid' }, ...KB.LINE_ORDER.map(l => tile('mint:' + l, KB.mintBuild(l, 0), KB.LINES[l].name, 'Standard set'))));
      let body;
      if (N.stage === 'menu') {
        const code = el('input', { type: 'text', maxlength: 5, placeholder: 'CODE', class: 'olcode', autocomplete: 'off', oninput: e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); } });
        code.addEventListener('keydown', e => { if (e.key === 'Enter') join(); });
        const join = () => { const c = code.value.trim().toUpperCase(); if (c.length !== 5) { N.status = 'Room codes are five letters and numbers.'; render(); return; } Online.join(c); };
        body = [
          el('p', { class: 'note' }, 'Fight a friend over the internet. One of you HOSTS a room and gets a code; the other types the code in and JOINS. You can pick your figure here or in the room.'),
          el('div', { class: 'olrow' },
            el('div', { class: 'olbox' }, el('h3', null, 'HOST'), el('p', null, 'Make a room and share its code.'), btn('HOST A ROOM', () => Online.host(), 'big')),
            el('div', { class: 'olbox' }, el('h3', null, 'JOIN'), el('p', null, 'Got a code from a friend?'), code, btn('JOIN', join, 'big'))),
          pickFig,
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
          el('div', { class: 'olvs' }, fig(N.me.name + ' (you)', N.me, N.host ? 'HOST' : ''), el('b', { class: 'vs' }, 'VS'), N.them ? fig(N.them.name, N.them, N.host ? '' : 'HOST') : el('div', { class: 'olcard' }, el('small', null, 'Waiting...'))),
          drawPingEl = el('p', { class: 'olping' }, pingText()),
          N.host ? btn('FIGHT!', () => { if (N.them) startFight(); }, 'big wide fight') : el('p', { class: 'olwait' }, 'Waiting for ' + (N.them ? N.them.name : 'the host') + ' to start the fight...'),
          pickFig,
          seg('ARENA', c.arena, [['random', 'Random'], ...Arena.LIST.map(a => [a, Arena.THEMES[a].name])], v => { c.arena = v; }),
          seg('ROUNDS', c.wins, [[1, 'First to 1'], [2, 'First to 2'], [3, 'First to 3']], v => { c.wins = +v; }),
          seg('RARITY BONUS', c.bonus, [[false, 'Off (fair)'], [true, 'On']], v => { c.bonus = v === true || v === 'true'; }),
          el('div', { class: 'row' }, btn('LEAVE THE ROOM', () => Online.leave(), 'ghost'))];
      } else if (N.stage === 'fight' && N.result) {
        // the results screen redraws its rematch note
        if (N.ui) N.ui.textContent = N.again && N.again.me && N.again.them ? 'Starting...' : N.again && N.again.me ? 'Waiting for ' + (N.them ? N.them.name : 'your friend') + ' to say rematch...' : N.again && N.again.them ? (N.them ? N.them.name : 'Your friend') + ' wants a rematch!' : '';
        return;
      }
      if (N.stage === 'fight') return;
      const scroller = document.querySelector('.screen.online .olpanel'), y = scroller ? scroller.scrollTop : 0;
      App.screen(el('div', { class: 'screen online' }, topbar('ONLINE', () => Online.leave()),
        el('div', { class: 'panel olpanel' }, ...body, N.status ? el('p', { class: 'olstatus' }, N.status) : null)));
      const sc2 = document.querySelector('.screen.online .olpanel'); if (sc2 && y) sc2.scrollTop = y;
    };
    let drawPingEl = null;
    const pingText = () => N.rtt ? 'Ping ' + Math.round(N.rtt) + ' ms · rollback netcode, input delay ' + delayFor(N.rtt) + (delayFor(N.rtt) === 1 ? ' frame' : ' frames') : 'Measuring ping...';
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
  // (tests)
  Online._t = { rng, withRng, onIn: null, prepSnap, snapshot, restoreSnap, hashSnap,
    fake: (conn, host) => { if (N) Online.leave(true); N = { stage: 'joining', status: '', host, pick: 'mine:' + (Auth.S.active || 0), cfg: { arena: 'shelf', wins: 2, bonus: false } }; N.me = meInfo(); attach(conn); },
    G: () => G, debug: 0, deepFilter: null,
    fight: seed => startFight(seed), ping: () => send({ t: 'ping', ts: performance.now() }), pick: k => { N.pick = k; N.me = meInfo(); send({ t: 'fig', me: N.me }); draw(); },
    info: () => G ? { f: G.f, conf: G.conf, D: G.D, local: G.local, syncs: G.syncs, desyncs: G.desyncs || 0, rollbacks: G.rollbacks, rbFrames: G.rbFrames, rbMax: G.rbMax, rbMs: Math.round(G.rbMs * 10) / 10, rbAvg: Math.round(G.rbSum / Math.max(1, G.rollbacks) * 100) / 100, guesses: G.guesses, skips: G.skips, adv: Math.round(G.adv * 100) / 100, hp: G.m.fighters.map(f => Math.round(f.hp)), fp: fingerprint(), stage: N && N.stage } : { stage: N && N.stage, them: N && N.them && N.them.name, code: N && N.code, status: N && N.status, result: !!(N && N.result) } };
  Online.version = VERSION;
})();
