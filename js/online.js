/* ============================================================================
   online.js -- ONLINE: rooms of up to six over the internet.

   THE ROOM LIST: public and private rooms are listed (private ones need a
   password to get in); you can also join any room by its five-letter code.
   The list lives on two free public MQTT brokers (no account, no server of
   ours): each host keeps a short note about its room there, and the broker
   drops it when the host's browser goes away. The password never goes there.

   A ROOM: up to six players. Two fight; everyone else watches the fight live
   and waits for their turn (a queue: winner stays, both rotate, or the host
   picks). Everyone picks a figure (one of their own or any base character)
   and readies up. The host runs the room: name, public/private + password,
   listed or code-only, locked, room size, rules (arena, rounds, round time,
   rarity bonus, which figures), rotation, auto-start, kick and block.

   THE LINKS: browsers connect directly (WebRTC, through PeerJS; the free
   PeerJS service only introduces them). The host links to every member. A
   fight between two members who aren't the host gets its own direct link
   (relayed through the host if a direct one can't be made). Each fighter
   also sends its buttons to the host, who passes them to the watchers: their
   games replay the fight from them (catching up fast if they came in late).

   THE NETCODE is ROLLBACK, the GGPO kind fighting games use: both fighters'
   games run the same fight, frame by frame (60 a second), and only the
   buttons travel. Your presses play a frame or two later (a small input
   delay) on both screens. The other fighter's presses take a moment to
   arrive, so the game doesn't wait: it guesses (they're still doing what
   they did last), saving the fight on every guessed frame, and when their
   real buttons come in and the guess was wrong it puts the fight back to
   that frame and replays to now with the right buttons, in an instant and
   in silence. The fight is deterministic online (fixed 1/60 s steps, one
   seeded random source for gameplay, looks on their own one, timers and the
   beat on the fight's clock); fingerprints of settled frames are compared,
   with a resync as a safety net. Events (rewards) and the end of a match only
   count once their frame is settled.

     Online.open()   (the lobby)
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const VERSION = 'kb-online-4';                  // everyone in a room needs the same game: a different build won't connect
  const PEER_JS = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
  const MQTT_JS = ['https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js', 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js'];
  const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
  const PREFIX = 'knockback-room-', ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const STEP = 1 / 60, HASH_EVERY = 30;
  const MAXP = 8;                                 // how many frames a fight may run ahead of the other fighter's last buttons
  const ROOM_MAX = 6;
  const ZERO = [0, 0, 0];
  const ACT = () => Input.ACTIONS;
  // input delay: a frame or two, and on a long ping enough that rollback never has to guess more than ~5 frames
  const delayFor = rtt => U.clamp(Math.max(rtt < 60 ? 1 : 2, Math.ceil(rtt / 2 / 16.7) - 5), 1, 8);
  // quick chat (set phrases only: rooms can be public)
  const CHAT = ['GG!', 'Nice combo!', 'Good luck!', 'One more?', 'Ready!', 'Be right back', 'Wow!', 'Thanks for the fight!'];

  const Online = window.Online = {};
  /* the room's timers run on performance.now (tests drive it), checked a few times a second */
  let LATER = [];
  const later = (ms, fn) => { LATER.push({ at: performance.now() + ms, fn }); };
  function runLater() { if (!LATER.length) return; const now = performance.now(), due = LATER.filter(t => t.at <= now).sort((a, b) => a.at - b.at); if (!due.length) return; LATER = LATER.filter(t => t.at > now); for (const t of due) { try { t.fn(); } catch (e) { console.error(e); } } }
  setInterval(runLater, 100);
  let N = null;   // the session: the lobby, or the room you're in
  let G = null;   // the fight on your screen: yours, or one you're watching (G.watch)

  /* ---------------------------------------------------- seeded random */
  function rng(seed) {
    let s = seed | 0;                             // (one form for the state: a restored save writes it back the same way)
    const f = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.get = () => s | 0; f.set = v => { s = v | 0; };
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

  /* ===================================================== the connection */
  let PeerImpl = null;                            // (tests run rooms over a fake network)
  const PeerC = () => PeerImpl || window.Peer;
  function loadScript(urls, ok) {
    return new Promise((res, rej) => {
      if (ok()) return res();
      let i = 0;
      const next = () => {
        if (i >= urls.length) return rej(new Error('Couldn\'t load the online library. Check your internet connection.'));
        const s = document.createElement('script'); s.src = urls[i++]; s.async = true;
        s.onload = () => (ok() ? res() : next()); s.onerror = next; document.head.appendChild(s);
      };
      next();
    });
  }
  const loadPeer = () => loadScript(PEER_JS, () => !!PeerC());
  const loadMqtt = () => loadScript(MQTT_JS, () => !!window.mqtt);
  const makeCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(U.vrand() * ALPHA.length)]).join('');
  const rid = () => Math.floor(U.vrand() * 2147483647).toString(36) + Math.floor(U.vrand() * 2147483647).toString(36);
  const why = e => ({
    'peer-unavailable': 'No room with that code. It may have closed, or check the code.',
    'network': 'Couldn\'t reach the matchmaking service. Check your connection and try again.',
    'server-error': 'The matchmaking service is having trouble. Try again in a minute.',
    'socket-error': 'Couldn\'t reach the matchmaking service. Check your connection and try again.',
    'socket-closed': 'Lost the matchmaking service. Try again.',
    'browser-incompatible': 'This browser can\'t do peer-to-peer connections. Try Chrome, Edge, Firefox or Safari.',
    'webrtc': 'The connection failed. Some networks (school or work Wi-Fi, some mobile data) block it.',
  })[e && e.type] || ('Connection problem' + (e && e.type ? ' (' + e.type + ')' : '') + '. Try again.');
  const DENY = {
    version: 'That room is on a different version of the game. Reload the page (Ctrl+F5) and try again.',
    blocked: 'The host of that room has blocked you.',
    locked: 'That room is locked: its host isn\'t letting anyone new in.',
    full: 'That room is full.',
    pass: 'That room is private: type its password.',
    wrongpass: 'Wrong password. Try again.',
    bad: 'The room couldn\'t read your figure. Pick another one and try again.',
  };

  /* ===================================================== the room list
     Every host keeps a note about its room (retained, refreshed every 10 s) on two free public MQTT brokers; the
     broker deletes it when the host's browser goes away (its "last will"). The list subscribes to all of them. Only
     what the list shows goes there: name, host, players, rules, whether it needs a password (never the password). */
  const Dir = {
    topic: 'knockback-online/' + VERSION + '/rooms/', rooms: new Map(), subs: null, pub: null, state: 'off', onChange: null, disabled: false,
    async browse() {
      if (Dir.disabled || Dir.subs) return;
      Dir.subs = []; Dir.state = 'connecting'; Dir.changed();
      try { await loadMqtt(); } catch (e) { if (Dir.subs) { Dir.subs = null; Dir.state = 'down'; Dir.changed(); } return; }
      if (!Dir.subs) return;                       // stopped meanwhile
      Dir.subs = BROKERS.map(url => {
        const c = mqtt.connect(url, { clientId: 'kbl_' + rid(), keepalive: 30, reconnectPeriod: 5000, connectTimeout: 8000, clean: true });
        c.on('connect', () => { c.subscribe(Dir.topic + '+'); if (Dir.state !== 'up') { Dir.state = 'up'; Dir.changed(); } });
        c.on('message', (t, m) => Dir.got(t, m));
        c.on('error', () => {});
        return c;
      });
      clearInterval(Dir.pruneT); Dir.pruneT = setInterval(Dir.prune, 4000);
      setTimeout(() => { if (Dir.subs && Dir.state === 'connecting') { Dir.state = 'down'; Dir.changed(); } }, 10000);
    },
    got(topic, msg) {
      const code = topic.slice(Dir.topic.length); if (!/^[A-Z0-9]{5}$/.test(code)) return;
      const s = String(msg);
      if (!s) { if (Dir.rooms.delete(code)) Dir.changed(); return; }
      let r; try { r = JSON.parse(s); } catch (e) { return; }
      if (!r || typeof r !== 'object' || r.v !== VERSION || typeof r.name !== 'string' || typeof r.host !== 'string' || !KB.LINES[r.line]) return;
      if (!(r.n >= 1 && r.n <= ROOM_MAX && r.max >= 2 && r.max <= ROOM_MAX) || !['open', 'full', 'fight', 'locked'].includes(r.state)) return;
      if (!(Math.abs(Date.now() - r.ts) < 45000)) return;
      const old = Dir.rooms.get(code); if (old && old.ts > r.ts) return;
      Dir.rooms.set(code, { code, name: r.name.slice(0, 24), host: r.host.slice(0, 24), line: r.line, n: r.n | 0, max: r.max | 0, priv: !!r.priv, state: r.state, wins: r.wins | 0, time: r.time | 0, figs: r.figs === 'base' ? 'base' : 'any', ts: r.ts, seen: performance.now() });
      Dir.changed();
    },
    prune() { const now = performance.now(); let ch = false; for (const [k, r] of Dir.rooms) if (now - r.seen > 35000) { Dir.rooms.delete(k); ch = true; } if (ch) Dir.changed(); },
    changed() { if (Dir.onChange) Dir.onChange(); },
    stopBrowse() { clearInterval(Dir.pruneT); for (const c of Dir.subs || []) { try { c.end(true); } catch (e) { /* fine */ } } Dir.subs = null; Dir.rooms.clear(); Dir.state = 'off'; },
    /* hosting: the note about your room, kept fresh; gone when you close it (or your browser goes away) */
    async host(code, info) {
      if (Dir.disabled) return;
      Dir.stopHost();
      const topic = Dir.topic + code, P = Dir.pub = { topic, info, clients: [] };
      try { await loadMqtt(); } catch (e) { return; }
      if (Dir.pub !== P) return;
      P.clients = BROKERS.map(url => {
        const c = mqtt.connect(url, { clientId: 'kbh_' + rid(), keepalive: 30, reconnectPeriod: 5000, connectTimeout: 8000, clean: true, will: { topic, payload: '', retain: true, qos: 0 } });
        c.on('connect', () => Dir.publish(c)); c.on('error', () => {});
        return c;
      });
      P.t = setInterval(() => Dir.update(), 10000);
    },
    publish(c) { const P = Dir.pub; if (!P) return; const i = P.info(); try { c.publish(P.topic, i ? JSON.stringify(Object.assign(i, { v: VERSION, ts: Date.now() })) : '', { retain: true, qos: 0 }); } catch (e) { /* fine */ } },
    update() { const P = Dir.pub; if (!P) return; for (const c of P.clients) if (c.connected) Dir.publish(c); },
    stopHost() {
      const P = Dir.pub; if (!P) return; Dir.pub = null; clearInterval(P.t);
      for (const c of P.clients) { try { if (c.connected) c.publish(P.topic, '', { retain: true, qos: 0 }); } catch (e) { /* fine */ } setTimeout(() => { try { c.end(true); } catch (e) { /* fine */ } }, 600); }
    },
  };

  /* ===================================================== figures
     any of your own figures, or any base character (its Standard set) */
  function buildOf(key) {
    const S = Auth.S; key = String(key || '');
    if (key.startsWith('mint:') && KB.LINES[key.slice(5)]) return KB.mintBuild(key.slice(5), 0);
    const i = key.startsWith('mine:') ? +key.slice(5) : 0;
    return Inv.levelled(S.builds[i] || S.builds[S.active || 0] || S.builds[0]);
  }
  function meInfo() {
    const b = buildOf(N && N.pick);
    return { name: Auth.user.user, build: b, fig: b.name, line: b.core.line, pick: String(N && N.pick || '') };
  }
  const goodBuild = b => !!b && typeof b === 'object' && KB.SLOTS.every(s => b[s] && KB.LINES[b[s].line] && Number.isInteger(b[s].r) && b[s].r >= 0 && b[s].r < KB.RARITY.length && (b[s].lv == null || typeof b[s].lv === 'number'));
  function cleanInfo(me) {
    if (!me || !goodBuild(me.build)) return null;
    const b = JSON.parse(JSON.stringify(me.build)); b.name = String(b.name || KB.LINES[b.core.line].figure).slice(0, 40);
    return { name: String(me.name || 'Player').slice(0, 24), build: b, fig: b.name, line: b.core.line, pick: String(me.pick || '').slice(0, 16) };
  }
  const isBase = info => !!info && String(info.pick).startsWith('mint:');
  const lineName = info => info && info.build && info.build.core ? KB.LINES[info.build.core.line].name : '';

  /* ===================================================== the room
     The host's browser keeps the room (N.room) and sends it to everyone whenever it changes:
       { code, hostId, name, priv, listed, locked, max, rules: { arena, wins, time, bonus, figs },
         rot: 'winner' | 'rotate' | 'host', auto, members: [{ id, name, info, ready, sit, watch, host, rtt }],
         queue: [ids], fight: { fid, ids, names, lines, state } | null, cd, last } */
  const memberOf = id => N && N.room ? N.room.members.find(m => m.id === id) || null : null;
  const roomKey = R => JSON.stringify(R, (k, v) => (k === 'rtt' ? undefined : v));
  /* the fighter you bring by default: your figure if it's a custom slot, else your starter's base character */
  const defaultPick = () => { const S = Auth.S; return S.active >= 1 && S.builds[S.active] ? 'mine:' + S.active : 'mint:' + (S.starter || S.builds[0].core.line); };
  function freshN(pick) { return { sid: rid(), stage: 'menu', status: '', host: false, pick: pick || defaultPick(), autoWatch: N ? N.autoWatch !== false : true, chat: [], form: N && N.form }; }
  function toMember(id, msg) { if (!N || !N.host || id === N.myId) return; const M = N.mem.get(id); if (M && M.conn && M.conn.open) { try { M.conn.send(msg); } catch (e) { /* closed */ } } }
  function toAll(msg, except) { if (!N || !N.host) return; for (const m of N.room.members) if (!except || !except.includes(m.id)) toMember(m.id, msg); }
  /* a message to the host (the host's own go straight in) */
  function toHost(msg) { if (!N) return; if (N.host) hostGot(N.myId, msg); else if (N.conn && N.conn.open) { try { N.conn.send(msg); } catch (e) { /* closed */ } } }
  const act = msg => toHost(msg);
  function nextPair() { const R = N.room; const p = R.queue.slice(0, 2).map(memberOf); return p.length === 2 && p[0] && p[1] ? p : null; }

  /* ---- the host's side */
  function newRoom(o, code, id) {
    return { code, hostId: id, name: String(o.name || '').trim().slice(0, 24) || (Auth.user.user + '\'s room'), priv: !!o.priv, listed: o.listed !== false, locked: false,
      max: U.clamp(o.max | 0 || ROOM_MAX, 2, ROOM_MAX), rules: { arena: 'random', wins: 2, time: 99, bonus: false, figs: 'any' }, rot: 'winner', auto: true,
      members: [], queue: [], fight: null, cd: null, last: null };
  }
  function listing() {
    const R = N && N.room; if (!R || !R.listed || !N.host) return null;
    return { name: R.name, host: Auth.user.user, line: N.me.line, n: R.members.length, max: R.max, priv: R.priv, state: R.locked ? 'locked' : R.members.length >= R.max ? 'full' : R.fight ? 'fight' : 'open', wins: R.rules.wins, time: R.rules.time, figs: R.rules.figs };
  }
  function pushRoom() {
    if (!N || !N.host) return;
    const R = N.room, key = roomKey(R);
    toAll({ t: 'room', room: R });
    if (key !== N.roomKey) { N.roomKey = key; draw(); clearTimeout(N.dirT); N.dirT = setTimeout(() => Dir.update(), 400); }
    else updPings();
  }
  function requeue() {
    const R = N.room, ok = id => { const m = memberOf(id); return m && !m.sit; };
    R.queue = R.queue.filter((id, i, a) => ok(id) && a.indexOf(id) === i);
    for (const m of R.members) if (!m.sit && !R.queue.includes(m.id)) R.queue.push(m.id);
  }
  function chatLine(c) { N.chat.push(c); if (N.chat.length > 40) N.chat.shift(); drawChat(); if (N.stage !== 'room' && !c.sys && c.from !== Auth.user.user) toastMsg(c.from + ': ' + CHAT[c.i]); }
  function say(c) { if (!N.host) return; toAll(Object.assign({ t: 'chat' }, c)); chatLine(c); }
  const sysSay = text => say({ sys: text });

  /* someone opened a link to your room */
  function hostConn(conn) {
    const S = N;
    conn.on('data', d => { if (N === S) hostData(conn, d); });
    conn.on('close', () => { if (N === S) memberGone(conn.peer, 'left'); });
    conn.on('error', () => {});
  }
  function hostData(conn, d) {
    if (!d || !d.t) return;
    const id = conn.peer, R = N.room;
    if (!N.mem.has(id)) {                          // not in yet: the only thing they can say is hello
      if (d.t !== 'hello') return;
      const no = w => { try { conn.send({ t: 'deny', why: w }); } catch (e) { /* closed */ } setTimeout(() => { try { conn.close(); } catch (e) { /* fine */ } }, 500); };
      if (d.ver !== VERSION) return no('version');
      if (N.blocked.has(id) || N.blockedNames.has(String(d.me && d.me.name))) return no('blocked');
      if (R.locked) return no('locked');
      if (R.members.length >= R.max) return no('full');
      if (R.priv && String(d.pass || '') !== N.pass) return no(d.pass ? 'wrongpass' : 'pass');
      const info = cleanInfo(d.me); if (!info) return no('bad');
      N.mem.set(id, { conn });
      R.members.push({ id, name: info.name, info, ready: false, sit: false, watch: false, host: false, rtt: 0 });
      requeue();
      conn.send({ t: 'welcome', you: id, chat: N.chat.slice(-12) });
      if (R.fight && N.flog && N.flog.D != null) conn.send({ t: 'flog', log: denseLog(N.flog) });   // a fight is on: they can watch it from the start
      sysSay(info.name + ' joined.'); SFX.play('ok');
      pushRoom(); return;
    }
    hostGot(id, d);
  }
  /* what a member asks (the host's own requests come here too) */
  function hostGot(id, d) {
    const R = N.room, m = memberOf(id); if (!m) return;
    switch (d.t) {
      case 'fig': { const info = cleanInfo(d.me); if (info) { m.info = info; m.name = info.name; } m.ready = false; break; }
      case 'ready': m.ready = !!d.on && !m.sit && (R.rules.figs !== 'base' || isBase(m.info)); break;
      case 'sit': m.sit = !!d.on; if (m.sit) m.ready = false; break;
      case 'watching': m.watch = !!d.on; break;
      case 'chat': if (CHAT[d.i] != null) say({ from: m.name, i: d.i | 0 }); return;
      case 'ping': toMember(id, { t: 'pong', ts: d.ts }); return;
      case 'pong': m.rtt = Math.round(performance.now() - d.ts); return;
      // (a fight's buttons keep coming for a moment after it's over: the watchers are a little behind and need them all)
      case 'sin': if (N.flog && d.fid === N.flog.cfg.fid && N.flog.cfg.ids[d.s] === id) logIn(d.fid, d.s, d.f, d.d); return;
      case 'ssnap': if (N.flog && d.fid === N.flog.cfg.fid && N.flog.cfg.ids[0] === id) { N.flog.snaps[d.at] = d.s; toAll({ t: 'ssnap', fid: d.fid, at: d.at, s: d.s }, N.flog.cfg.ids); } return;
      case 'fgo': if (R.fight && d.fid === R.fight.fid && R.fight.ids[0] === id) { R.fight.state = 'on'; toAll({ t: 'fgo', fid: d.fid, D: d.D }, R.fight.ids); onFgo(d.fid, d.D); } break;
      case 'fover': if (R.fight && d.fid === R.fight.fid && R.fight.ids.includes(id)) fightOver(d, id); return;
      case 'F':                                    // a fight message: for the host as a fighter, or to relay between two members
        if (!d.to) { fightData(d, 'room'); return; }
        if (R.fight && R.fight.ids.includes(id) && R.fight.ids.includes(d.to)) { if (d.to === N.myId) fightData({ t: 'F', fid: d.fid, m: d.m }, 'relay'); else toMember(d.to, { t: 'F', fid: d.fid, m: d.m, via: 'relay' }); }
        return;
      default: return;
    }
    requeue(); pushRoom();
  }
  function memberGone(id, how) {
    const R = N && N.room; if (!R || !N.host) return;
    N.mem.delete(id);
    const i = R.members.findIndex(m => m.id === id); if (i < 0) return;
    const m = R.members[i]; R.members.splice(i, 1);
    sysSay(m.name + (how === 'kick' ? ' was removed from the room.' : ' left.'));
    if (R.fight && R.fight.ids.includes(id)) abortFight(m.name + ' left, so the fight is off.');
    requeue(); pushRoom();
  }
  /* the host's controls */
  const H = {
    rule(k, v) { const R = N.room; R.rules[k] = v; if (k === 'figs' && v === 'base') for (const m of R.members) if (!isBase(m.info)) m.ready = false; pushRoom(); },
    set(k, v) {
      const R = N.room;
      if (k === 'name') R.name = String(v || '').trim().slice(0, 24) || R.name;
      else if (k === 'priv') { R.priv = !!v.on; N.pass = R.priv ? String(v.pass || '').slice(0, 16) : ''; }
      else if (k === 'max') R.max = U.clamp(v | 0, 2, ROOM_MAX);
      else R[k] = v;
      if (k === 'listed' && !v) Dir.update();
      pushRoom();
    },
    kick(id, block) {
      const m = memberOf(id); if (!m || id === N.myId) return;
      if (block) { N.blocked.add(id); N.blockedNames.add(m.name); }
      toMember(id, { t: 'kicked', block: !!block });
      const M = N.mem.get(id); setTimeout(() => { try { M && M.conn.close(); } catch (e) { /* fine */ } }, 400);
      memberGone(id, 'kick');
    },
    front(id) { const R = N.room; R.queue = [id].concat(R.queue.filter(x => x !== id)); requeue(); pushRoom(); },
    start(seed) { startNext(seed); },
  };
  /* every second: pings, the auto-start countdown */
  function hostTick() {
    if (!N || !N.host || !N.room) return;
    const R = N.room, now = performance.now();
    if ((N.tickN = (N.tickN || 0) + 1) % 2 === 0) for (const m of R.members) toMember(m.id, { t: 'ping', ts: now });
    const pair = nextPair(), can = !R.fight && pair && pair.every(m => m.ready);
    if (R.auto && can) { if (R.cd == null) R.cd = 5; else if (--R.cd <= 0) { R.cd = null; startNext(); return; } pushRoom(); }
    else if (R.cd != null) { R.cd = null; pushRoom(); }
    else if (N.tickN % 2 === 0) pushRoom();
  }
  function startNext(seed) {
    const R = N.room; if (R.fight) return;
    const pair = nextPair(); if (!pair) { toastMsg('A fight needs two players.'); return; }
    if (!pair.every(m => m.ready)) { toastMsg('Both fighters need to be READY.'); return; }
    R.cd = null;
    const rules = R.rules, arena = rules.arena === 'random' ? U.pick(Arena.LIST) : rules.arena;
    const fid = 'f' + (N.fidN = (N.fidN || 0) + 1) + rid().slice(0, 4);
    const cfg = { fid, seed: seed != null ? seed : (U.vrand() * 4294967296) >>> 0, arena, wins: rules.wins, time: rules.time, bonus: rules.bonus,
      ids: pair.map(m => m.id), builds: pair.map(m => m.info.build), names: pair.map(m => m.name) };
    R.fight = { fid, ids: cfg.ids, names: cfg.names, lines: pair.map(m => m.info.line), state: 'connecting' };
    pair.forEach(m => { m.ready = false; });
    toAll({ t: 'fight', cfg }); onFightCfg(cfg); pushRoom();
  }
  function fightOver(d, id) {
    const R = N.room, F = R.fight; if (!F) return;
    if (d.aborted) { abortFight(d.why || ((memberOf(id) || {}).name || 'A fighter') + ' left the fight.'); requeue(); pushRoom(); return; }
    const w = d.winner === 1 ? 1 : 0, W = F.ids[w], L = F.ids[1 - w], wins = Array.isArray(d.wins) ? d.wins.slice(0, 2).map(x => x | 0) : [0, 0];
    R.fight = null; R.cd = null; R.last = { names: F.names, wins, winner: w };
    if (R.rot === 'winner') R.queue = [W].concat(R.queue.filter(x => x !== W && x !== L), [L]);
    else if (R.rot === 'rotate') R.queue = R.queue.filter(x => x !== W && x !== L).concat([W, L]);
    if (N.flog && N.flog.cfg.fid === F.fid) N.flog.over = R.last;
    sysSay(F.names[w] + ' beat ' + F.names[1 - w] + ' ' + wins[w] + '–' + wins[1 - w] + '.');
    requeue(); pushRoom();
  }
  function abortFight(text) { const R = N.room, fid = R.fight.fid; R.fight = null; R.cd = null; toAll({ t: 'fabort', fid, why: text }); onAbort(fid, text); }
  /* the fight's buttons, kept for the watchers (and sent to them as they come) */
  function logIn(fid, s, f, d) {
    if (!flogIn(fid, s, f, d)) return;
    toAll({ t: 'sin', fid, s, f, d }, N.flog.cfg.ids);
  }
  function flogIn(fid, s, f, d) {
    const L = N.flog; if (!L || L.cfg.fid !== fid || !Array.isArray(d)) return false;
    const I = L.inputs[s]; d.forEach((x, k) => { I[f + k] = x; });
    while (I[L.top[s]]) L.top[s]++;
    return true;
  }
  function denseLog(L) { return { cfg: L.cfg, D: L.D, inputs: L.inputs.map((I, s) => Array.from({ length: L.top[s] }, (_, i) => I[i])), snaps: L.snaps, over: L.over }; }

  /* ---- a member's side */
  function guestGot(d) {
    if (!N || !d || !d.t) return;
    switch (d.t) {
      case 'welcome': N.myId = d.you; N.stage = 'room'; N.status = ''; (d.chat || []).forEach(c => N.chat.push(c)); SFX.play('ok'); Online.open(true); return;
      case 'deny': {
        const code = N.code, pick = N.pick, peer = N.peer; N.leaving = true; try { peer.destroy(); } catch (e) { /* fine */ }
        N = freshN(pick); N.status = DENY[d.why] || 'Couldn\'t join that room.';
        if (d.why === 'pass' || d.why === 'wrongpass') { N.needPass = code; N.codeIn = code; }
        Online.open(true); return;
      }
      case 'room': { const key = roomKey(d.room); N.room = d.room; checkRules(); if (key !== N.roomKey) { N.roomKey = key; draw(); } else updPings(); return; }
      case 'chat': chatLine(d); return;
      case 'ping': toHost({ t: 'pong', ts: d.ts }); return;
      case 'kicked': roomGone(d.block ? 'The host removed you from the room and blocked you.' : 'The host removed you from the room.'); return;
      case 'closed': roomGone('The host closed the room.'); return;
      case 'fight': onFightCfg(d.cfg); return;
      case 'fgo': onFgo(d.fid, d.D); return;
      case 'sin': flogIn(d.fid, d.s, d.f, d.d); return;
      case 'ssnap': if (N.flog && N.flog.cfg.fid === d.fid) N.flog.snaps[d.at] = d.s; return;
      case 'flog': {
        const L = d.log; if (!L || !L.cfg) return;
        N.flog = { cfg: L.cfg, D: L.D, inputs: L.inputs.map(a => Object.assign({}, a)), top: L.inputs.map(a => a.length), snaps: L.snaps || {}, over: L.over || null };
        if (N.autoWatch && N.stage === 'room') startWatch(); else draw();
        return;
      }
      case 'fabort': onAbort(d.fid, d.why); return;
      case 'F': fightData(d, d.via === 'relay' ? 'relay' : 'room'); return;
    }
  }
  /* the room went away (the host closed it, you were removed, the link dropped) */
  function roomGone(text) {
    if (!N || N.leaving || N.host) return;
    const peer = N.peer, pick = N.pick; N.leaving = true;
    if (G) endFight();
    try { peer && peer.destroy(); } catch (e) { /* fine */ }
    N = freshN(pick); N.status = text || 'Lost the connection to the room.';
    App.setView(null); Online.open(true);
  }
  /* a room for base characters only: switch to the base character of your figure's line */
  function checkRules() {
    const R = N.room; if (!R || R.rules.figs !== 'base' || String(N.pick).startsWith('mint:')) return;
    N.pick = 'mint:' + N.me.line; N.me = meInfo(); act({ t: 'fig', me: N.me });
    toastMsg('This room is base characters only: you\'re ' + KB.LINES[N.me.line].name + '.');
  }
  /* back to the room screen (after a fight, out of one, or done watching) */
  function toRoom(status) {
    if (!N) return;
    if (G) endFight();
    N.result = null; N.stage = 'room'; if (status) toastMsg(status);
    App.setView(null); Online.open(true);
  }

  /* ===================================================== the fight link
     The second fighter calls the first directly (metadata: the fight's id); if that can't be made in 6 s, their
     messages go through the host instead. A fight with the host in it uses the room link. Once linked, the first
     fighter measures the ping (three round trips), picks the input delay and says go. */
  function onFightCfg(cfg) {
    N.flog = { cfg, D: null, inputs: [{}, {}], top: [0, 0], snaps: {}, over: null };
    if (G && G.watch) endFight();
    const side = cfg.ids.indexOf(N.myId);
    if (side < 0) { N.stage = N.stage === 'watch' ? 'room' : N.stage; if (N.stage === 'room') Online.open(true); return; }
    openLink(cfg, side);
  }
  function openLink(cfg, side) {
    const S = N, other = cfg.ids[1 - side], L = N.flink = { cfg, fid: cfg.fid, side, other, mode: 'wait', conn: null, up: false, rtts: [] };
    N.stage = 'room'; draw();
    if (N.host || other === N.room.hostId) { L.mode = 'room'; L.conn = N.host ? (N.mem.get(other) || {}).conn : N.conn; if (side === 1) linkSend(L, { t: 'hi' }); }
    else if (side === 1) {
      L.mode = 'direct';
      const c = L.conn = N.peer.connect(other, { reliable: true, serialization: 'json', metadata: { fid: cfg.fid } });
      c.on('open', () => { if (N === S && N.flink === L && L.mode === 'direct') linkSend(L, { t: 'hi' }); });
      c.on('data', d => { if (N === S) fightData(d, 'direct', c); });
      c.on('close', () => { if (N === S && N.flink === L && L.mode === 'direct' && L.conn === c) linkLost(L); });
      c.on('error', () => {});
      later(6000, () => { if (N === S && N.flink === L && !L.up) { try { c.close(); } catch (e) { /* fine */ } L.mode = 'relay'; L.conn = null; linkSend(L, { t: 'hi' }); } });   // no direct link: through the host
    }
    const early = (N.early || []).filter(e => e[0].fid === cfg.fid); N.early = [];
    early.forEach(e => fightData(...e));
    later(20000, () => { if (N === S && N.flink === L && !L.started) linkAbort(L, 'Couldn\'t connect the two fighters.'); });
  }
  /* the second fighter calling you (a fighter) directly */
  function fightConn(c) {
    const S = N;
    c.on('data', d => { if (N === S) fightData(d, 'direct', c); });
    c.on('close', () => {
      const L = N === S && N.flink; if (!L || L.conn !== c || L.mode !== 'direct') return;
      if (!L.started) { L.mode = 'wait'; L.conn = null; L.up = false; return; }   // (they're coming through the host instead)
      linkLost(L);
    });
    c.on('error', () => {});
  }
  function fightData(d, via, c) {
    if (!N || !d || d.t !== 'F') return;
    const L = N.flink;
    if (!L || L.fid !== d.fid) { (N.early = N.early || []).push([d, via, c]); if (N.early.length > 60) N.early.shift(); return; }
    if (L.mode === 'wait') { if (via === 'direct') { L.mode = 'direct'; L.conn = c; } else if (via === 'relay') { L.mode = 'relay'; L.conn = null; } }
    else if (via === 'relay' && L.mode === 'direct' && !L.up) { L.mode = 'relay'; L.conn = null; }
    L.up = true;
    linkMsg(L, d.m || {});
  }
  function linkSend(L, m) {
    if (!L || !N) return;
    const msg = { t: 'F', fid: L.fid, m };
    try {
      if (L.mode === 'room' || L.mode === 'direct') { if (L.conn && L.conn.open) L.conn.send(msg); }
      else if (L.mode === 'relay') { msg.to = L.other; toHost(msg); }
    } catch (e) { /* closed */ }
  }
  const linkPing = L => linkSend(L, { t: 'fp', ts: performance.now() });
  function linkMsg(L, m) {
    switch (m.t) {
      case 'hi': if (L.side === 0 && !L.going) { L.going = true; linkPing(L); } return;
      case 'fp': linkSend(L, { t: 'fq', ts: m.ts }); return;
      case 'fq': {
        if (L.side !== 0 || L.started) return;
        L.rtts.push(performance.now() - m.ts);
        if (L.rtts.length < 3) { linkPing(L); return; }
        const r = L.rtts.slice().sort((a, b) => a - b)[1], D = delayFor(r);
        L.started = true; linkSend(L, { t: 'go', D, rtt: r }); toHost({ t: 'fgo', fid: L.fid, D }); beginFight(L, D, r);
        return;
      }
      case 'go': if (L.side === 1 && !L.started) { L.started = true; beginFight(L, m.D | 0 || 2, m.rtt || 0); } return;
      default: onFightMsg(m);
    }
  }
  function linkLost(L) {
    if (G && !G.watch && G.cfg.fid === L.fid && !G.ended) { toHost({ t: 'fover', fid: L.fid, aborted: true, why: 'The fighters lost their connection.' }); N.flink = null; toRoom('Lost the connection to ' + G.cfg.names[1 - L.side] + '.'); }
    else if (!G || G.watch) linkAbort(L, 'Couldn\'t connect the two fighters.');
  }
  function linkAbort(L, text) { if (!N || N.flink !== L || L.started) return; N.flink = null; toHost({ t: 'fover', fid: L.fid, aborted: true, why: text }); toRoom(text); }
  /* the host said the fight is off (someone left) */
  function onAbort(fid, text) {
    if (!N) return;
    if (N.flink && N.flink.fid === fid) N.flink = null;
    if (N.flog && N.flog.cfg.fid === fid) N.flog = null;
    if (G && G.cfg.fid === fid && !(G.ended && !G.watch)) toRoom(text);
    else { toastMsg(text); draw(); }
  }
  /* the input delay is known: the frames before it are empty for both, and watchers can start */
  function onFgo(fid, D) {
    const L = N.flog; if (!L || L.cfg.fid !== fid) return;
    L.D = D; for (let k = 0; k < D; k++) for (const s of [0, 1]) if (!L.inputs[s][k]) L.inputs[s][k] = ZERO;
    for (const s of [0, 1]) while (L.inputs[s][L.top[s]]) L.top[s]++;
    if (N.autoWatch && N.stage === 'room' && !G && !(N.flink && N.flink.fid === fid)) startWatch(); else draw();
  }

  /* ===================================================== a fight on your screen */
  function makeMatch(cfg, local, watch) {
    const PC = Input.players[0].constructor, net = [new PC(0), new PC(1)];
    net.forEach(p => { p.cpu = { held: {}, move: { x: 0, y: 0 } }; });
    Input.mode = 'solo';
    const builds = cfg.builds.map((b, i) => Object.assign({}, b, { name: cfg.names[i] }));
    // the end of the match waits for its frame to be settled (a guessed KO can still be taken back)
    const opts = { mode: 'online', online: true, local: Math.max(0, local), builds, cpu: [null, null], arena: cfg.arena, wins: cfg.wins, time: cfg.time || 99, bonus: cfg.bonus, inputs: net,
      onEnd: res => { if (!G) return; if (G.watch) watchEnd(res); else if (!G.ended && !G.endQ) G.endQ = { f: G.simF, res }; } };
    App.screen(null); Music.play('battle');
    const m = Match.create(opts); App.setView(m);
    if (watch) Touch.show(true);                  // (watching: no touch buttons, just the pause key)
    // the same start on every screen: the seed, then the round laid out again under it
    const R = rng(cfg.seed);
    withRng(R, () => m.restart());
    return { m, R, net, opts };
  }
  function beginFight(L, D, rtt) {
    const cfg = Object.assign({}, L.cfg, { D }), side = L.side;
    N.stage = 'fight'; N.result = null;
    if (G) endFight();
    const { m, R, net, opts } = makeMatch(cfg, side, false);
    G = { m, R, net, local: side, D, f: 0, conf: 0, simF: 0, inputs: [{}, {}], used: {}, snaps: {}, rb: null, acc: 0, latch: {}, hq: {}, mine: {}, theirs: {}, hashFloor: -1,
      evq: [], endQ: null, ended: false, syncAt: null, snap: null, waitT: 0, remF: null, remAt: 0, adv: 0, raw: null, radv: null, lastSkip: 0, opts, cfg, rtt, link: L,
      syncs: 0, rollbacks: 0, rbFrames: 0, rbMax: 0, rbMs: 0, rbSum: 0, guesses: 0, skips: 0 };
    G.tx = msg => linkSend(L, msg);
    G.mirror = (f, d) => toHost({ t: 'sin', fid: cfg.fid, s: side, f, d });   // your buttons, for the watchers
    for (let k = 0; k < D; k++) { G.inputs[0][k] = ZERO; G.inputs[1][k] = ZERO; }
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
    const L = G.link, watch = G.watch;
    G = null;
    if (watch && N) act({ t: 'watching', on: false });
    if (L && L.mode === 'direct' && L.conn) later(3000, () => { try { if (!N || N.flink !== L) L.conn.close(); } catch (e) { /* fine */ } });
  }
  /* the other fighter's messages */
  function onFightMsg(d) {
    if (!G || G.watch || !d) return;
    switch (d.t) {
      case 'in': { const I = G.inputs[1 - G.local]; if (!Array.isArray(d.d)) return; d.d.forEach((x, k) => { I[d.f + k] = x; }); if (d.cur != null) { G.remF = d.cur; G.remAt = performance.now(); } if (d.adv != null) G.radv = d.adv; if (Online._t.onIn) Online._t.onIn(); return; }
      case 'h': checkHash(d.f, d.h); return;
      case 'desync': if (G.local === 0) scheduleResync(); return;
      case 'resync': if (G.local === 1) { if (d.at < G.f) { G.tx({ t: 'desync' }); return; } G.syncAt = d.at; G.snap = null; } return;
      case 'snap': if (G.local === 1) G.snap = d; return;
      case 'left': if (!G.ended) { toHost({ t: 'fover', fid: G.cfg.fid, aborted: true, why: G.cfg.names[1 - G.local] + ' left the fight.' }); toRoom(G.cfg.names[1 - G.local] + ' left the fight.'); } return;
    }
  }
  /* the connection to the other fighter is gone */
  function fightLost() { if (!G || G.watch) return; const L = G.link; toHost({ t: 'fover', fid: G.cfg.fid, aborted: true, why: 'The fighters lost their connection.' }); if (N && N.flink === L) N.flink = null; toRoom('Lost the connection to ' + G.cfg.names[1 - G.local] + '.'); }

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
    if (out) { G.tx({ t: 'in', f: outF, d: out, cur: G.f, adv: G.raw == null ? null : Math.round(G.raw * 10) / 10 }); G.mirror(outF, out); }
    // 4. what's settled now: events, fingerprints, the end of the match
    settle(); if (!G) return;
    for (let i = 0; i < 2; i++) for (const k in G.inputs[i]) if (+k < G.conf - 40) delete G.inputs[i][k];
    for (const k in G.used) if (+k < G.conf - 40) delete G.used[k];
    // waiting on them for a while: say so
    if (waiting && n === 0) G.waitT += realDt; else G.waitT = 0;
    if (G.ui) G.ui.classList.toggle('wait', G.waitT > 0.5);
    if (G.waitT > 15) fightLost();
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
    for (const h in G.hq) if (+h <= done) { const v = G.hq[h]; delete G.hq[h]; G.mine[h] = v; G.tx({ t: 'h', f: +h, h: v }); checkHash(+h); }
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
    if (a !== b && f > G.hashFloor) { G.desyncs = (G.desyncs || 0) + 1; if (G.local === 0) scheduleResync(); else G.tx({ t: 'desync', f }); }
  }
  function scheduleResync() { if (!G || G.syncAt != null) return; G.syncAt = G.f + MAXP + 24; G.tx({ t: 'resync', at: G.syncAt }); }
  /* the agreed frame: once every frame before it is settled, the first fighter sends its fight and the second takes it */
  function barrier() {
    if (G.conf < G.syncAt || G.f > G.syncAt) return G.f > G.syncAt ? (G.syncAt = null, true) : false;
    if (G.local === 0) {
      if (G.m.cine) { G.syncAt += 30; G.tx({ t: 'resync', at: G.syncAt }); return true; }
      const s = valueSnap(); G.tx({ t: 'snap', at: G.syncAt, s }); toHost({ t: 'ssnap', fid: G.cfg.fid, at: G.syncAt, s });   // (the watchers take it too) G.hashFloor = G.syncAt; G.syncAt = null; G.syncs++; return true;
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

  /* ===================================================== watching a fight
     A watcher's game replays the fight from both fighters' buttons as the host passes them on: a frame runs once
     both fighters' buttons for it are in, a few frames behind the newest (so it doesn't stutter). Come in late and it
     catches up from the start, quietly and fast. No rollback needed: it never guesses. */
  function startWatch() {
    const L = N && N.flog; if (!L || L.D == null || (G && !G.watch)) return;
    if (G) endFight();
    N.stage = 'watch';
    const { m, R, net, opts } = makeMatch(L.cfg, -1, true);
    G = { m, R, net, watch: true, f: 0, simF: 0, acc: 0, waitT: 0, inputs: L.inputs, log: L, cfg: L.cfg, opts, ended: false };
    G.step = m.update; m.update = watchFrame;
    m.evHook = () => {};                          // (watching doesn't count for rewards)
    G.ui = el('div', { class: 'onlinehud spect' }, el('span', null, 'WATCHING · ' + L.cfg.names[0] + ' vs ' + L.cfg.names[1] + ' · Esc / ❚❚ for the room'), el('b', null, 'catching up...'));
    U.$('hud').append(G.ui);
    act({ t: 'watching', on: true });
  }
  function watchFrame(realDt) {
    if (!G || !G.watch) return;
    const P0 = Input.players[0], esc = Input.keyDown('Escape') || P0.pressed('pause');
    if (esc && !G.escHeld) Online.menu(); G.escHeld = esc;
    const L = G.log, avail = Math.min(L.top[0], L.top[1]), lag = avail - G.f;
    if (lag > 150) {                              // far behind (came in late): catch up quietly, 10 s of fight a frame
      U.quiet = true;
      try { let k = 0; while (G && G.watch && G.f < avail - 8 && k < 600) { watchStep(G.f); if (!G) return; G.f++; k++; } } finally { U.quiet = false; }
      if (G && G.ui) G.ui.classList.add('wait');
      return;
    }
    // a few frames behind the newest: a touch faster when further back, a touch slower when nearly caught up
    G.acc = Math.min(G.acc + realDt * (lag > 24 ? 1.5 : lag < 6 ? 0.85 : 1), STEP * 6);
    let n = 0;
    while (G && G.watch && G.acc >= STEP && G.f < avail && n < 4) { watchStep(G.f); if (!G) return; G.f++; G.acc -= STEP; n++; }
    if (!G) return;
    if (n === 0 && G.f >= avail) G.waitT += realDt; else G.waitT = 0;
    if (G.ui) G.ui.classList.toggle('wait', G.waitT > 0.6);
  }
  function watchStep(f) {
    const A = ACT(), simT = f * STEP, now0 = Input.now, snap = G.log.snaps[f];
    if (snap) valueRestore(snap);                // (the fighters resynced here)
    for (let i = 0; i < 2; i++) {
      const b = G.inputs[i][f] || ZERO, p = G.net[i];
      p.cpu.held = {}; A.forEach((a, k) => { p.cpu.held[a] = !!(b[0] & (1 << k)); }); p.cpu.move.x = b[1] / 100; p.cpu.move.y = b[2] / 100;
      p.poll(simT, [], false);
    }
    G.simF = f; Input.now = simT;
    withRng(G.R, () => G.step(STEP));
    Input.now = now0;
    if (G && Online._t.debug && (f + 1) % HASH_EVERY === 0) (G.dbg = G.dbg || {})[f + 1] = fpStr();
  }
  function watchEnd(res) {
    if (!G || !G.watch || G.ended) return;
    G.ended = true;
    const names = G.cfg.names, w = res.winner, t = names[w] + ' wins ' + res.wins[w] + '–' + res.wins[1 - w] + '.';
    const g = G; later(2200, () => { if (G === g) toRoom(t); });
  }

  /* ===================================================== the end of your fight */
  function matchEnd(res) {
    if (!G || G.watch) return;
    const local = G.local, opts = G.opts, win = res.winner === local, rec = res.records[local], cfg = G.cfg;
    const S = Auth.S, reward = win ? 100 : 40;
    S.records.matches++; if (win) S.records.wins++; else S.records.losses++;
    S.records.bestCombo = Math.max(S.records.bestCombo, rec.maxCombo); S.records.maxBounces = Math.max(S.records.maxBounces, rec.maxBounces); S.records.wallBreaks += rec.breaks;
    S.tokens += reward; Auth.save();
    const awards = window.Rewards ? Rewards.fightDone(res, opts) : [];
    const recs = { maxCombo: rec.maxCombo, maxBounces: rec.maxBounces, breaks: rec.breaks, dmg: rec.dmg }, wins = res.wins.slice();
    toHost({ t: 'fover', fid: cfg.fid, winner: res.winner, wins });
    const g = G;
    later(900, () => {
      if (!N || G !== g) return;
      const hud = U.$('hud'); if (hud) hud.hidden = true;
      const { btn } = Menu.ui, stat = (k, v) => el('div', null, el('small', null, k), el('b', null, v));
      N.result = el('div', { class: 'screen results' },
        el('div', { class: 'panel resp ' + (win ? 'win' : 'lose') },
          el('h1', null, win ? 'YOU WIN' : 'YOU LOSE'),
          el('div', { class: 'note' }, 'vs ' + cfg.names[1 - local] + ' · ' + (N.room ? N.room.name : 'online')),
          el('div', { class: 'score' }, wins[local] + ' — ' + wins[1 - local]),
          el('div', { class: 'recs' }, stat('BEST COMBO', recs.maxCombo), stat('MOST BOUNCES', recs.maxBounces), stat('WALL BREAKS', recs.breaks), stat('DAMAGE', Math.round(recs.dmg))),
          el('div', { class: 'reward' }, el('i', { class: 'coin' }), '+' + reward + ' TOKENS'),
          ...awards.map(a => el('div', { class: 'reward gold' }, '★ AWARD: ' + a.name + (a.pay ? '  +' + a.pay : ''))),
          N.ui = el('div', { class: 'againnote' }),
          el('div', { class: 'olchatbtns' }, ...[0, 7, 3].map(i => el('button', { onclick: () => act({ t: 'chat', i }) }, CHAT[i]))),
          el('div', { class: 'row' },
            btn('READY', () => { toRoom(); act({ t: 'ready', on: true }); }, 'big'),
            btn('CHARACTER SELECT', () => toRoom(), 'big ghost'),
            btn('LEAVE ROOM', () => Online.leave(), 'ghost'))));
      endFight();
      App.screen(N.result); drawResultNote();
    });
  }
  function drawResultNote() {
    if (!N || !N.ui || !N.result || !N.room) return;
    const R = N.room, p = nextPair();
    N.ui.textContent = R.fight ? 'Now fighting: ' + R.fight.names.join(' vs ') : R.cd != null && p ? 'Next fight in ' + R.cd + ': ' + p.map(m => m.name).join(' vs ') : p ? 'Next up: ' + p.map(m => m.name).join(' vs ') + '. READY takes you back to the room, ready.' : '';
  }

  /* ===================================================== in-fight UI */
  function drawHud() {
    if (!G || !G.ui || G.watch) return;
    G.ui.innerHTML = '';
    G.ui.append(el('span', null, 'ONLINE · vs ' + G.cfg.names[1 - G.local] + ' · ' + Math.round(G.rtt || 0) + ' ms · rollback, delay ' + G.D), el('b', null, 'waiting for ' + G.cfg.names[1 - G.local] + '...'));
  }
  Online.menu = () => {
    if (!G) return;
    if (G.menu) { G.menu.remove(); G.menu = null; return; }
    const { btn } = Menu.ui;
    G.menu = G.watch
      ? el('div', { class: 'overlay onlinemenu' }, el('div', { class: 'panel' },
        el('h2', null, 'WATCHING'), el('p', { class: 'note' }, G.cfg.names[0] + ' vs ' + G.cfg.names[1] + '. You can come back and watch again from the room.'),
        el('div', { class: 'row' }, btn('KEEP WATCHING', () => Online.menu(), 'big'), btn('BACK TO THE ROOM', () => toRoom(), 'ghost'))))
      : el('div', { class: 'overlay onlinemenu' }, el('div', { class: 'panel' },
        el('h2', null, 'ONLINE'), el('p', { class: 'note' }, 'The fight keeps going: an online fight can\'t be paused.'),
        el('div', { class: 'row' }, btn('BACK TO THE FIGHT', () => Online.menu(), 'big'), btn('LEAVE THE FIGHT', () => {
          if (!G) return; G.tx({ t: 'left' }); toHost({ t: 'fover', fid: G.cfg.fid, aborted: true, why: G.cfg.names[G.local] + ' left the fight.' }); toRoom();
        }, 'ghost danger'))));
    document.body.append(G.menu);
  };

  /* ===================================================== the lobby */
  let updPings = () => {}, drawChat = () => {};
  function draw() {
    if (!N || !N.redraw) return;
    if (N.stage === 'fight' || N.stage === 'watch') { drawResultNote(); return; }
    const a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest('.screen.online')) { N.dirty = true; return; }   // not while you're typing
    N.redraw();
  }
  const toastMsg = t => Menu.toast && Menu.toast(t, 'gold');
  const useMenuRoom = () => { if (!App.view || App.view.fighters) App.setView(null); Music.play('menu'); };
  const STATE_TXT = { open: 'OPEN', full: 'FULL', fight: 'FIGHTING', locked: 'LOCKED' };
  const ROT_TXT = [['winner', 'Winner stays'], ['rotate', 'Both rotate'], ['host', 'Host picks']];

  Online.open = keep => {
    if (!keep || !N) { if (N) Online.leave(true); N = freshN(); }
    N.me = meInfo();
    const { btn, topbar } = Menu.ui, S = Auth.S;
    const render = () => {
      if (!N) return;
      N.dirty = false;
      const R = N.room, host = N.host;
      const seg = (label, val, opts, set, on) => el('div', { class: 'seg' }, el('span', null, label), el('div', null, ...opts.map(([v, t]) => el('button', { class: String(val) === String(v) ? 'on' : '', disabled: on === false || null, onclick: () => set(v) }, t))));
      const field = (label, input, extra) => el('div', { class: 'olfield' }, el('span', null, label), input, extra || null);
      const figIcon = info => el('img', { src: Models.figIcon(info.build), alt: '' });
      // CHARACTER SELECT: your own figures, then every base character (a base-only room greys yours out)
      const baseOnly = R && R.rules.figs === 'base';
      // in a room: switch any time you're not in the fight on now (it takes your READY off, so the fight waits for you)
      const inFight = !!(R && R.fight && R.fight.ids.includes(N.myId)), wasReady = !!(R && (memberOf(N.myId) || {}).ready);
      const tile = (key, b, top, sub) => el('button', { class: 'olpick' + (key === N.pick ? ' on' : ''), disabled: (baseOnly && key.startsWith('mine:')) || inFight || null, style: { '--lc': KB.LINES[b.core.line].css }, title: b.name,
        onclick: () => {
          if (key === N.pick) return;
          N.pick = key; N.me = meInfo();
          if (R) { act({ t: 'fig', me: N.me }); toastMsg("You're " + (key.startsWith('mint:') ? KB.LINES[N.me.line].name : N.me.fig) + ' now.' + (wasReady ? ' Press READY again.' : '')); }
          render();
        } },
        el('img', { src: Models.figIcon(b), alt: '' }), el('b', null, top), el('small', null, sub));
      const pickFig = el('div', { class: 'olselect' },
        el('h3', null, R ? 'YOUR FIGHTER' : 'CHARACTER SELECT'),
        R ? el('p', { class: 'olhint' }, inFight ? "You're in the fight that's on: you can switch after it." : "Tap a fighter to switch, any time you're not fighting: one of your custom fighters (built in the Workshop) or a base character. Switching takes your READY off.") : null,
        el('small', { class: 'olsub' }, 'YOUR CUSTOM FIGHTERS' + (baseOnly ? ' (not in this room: the host set base characters only)' : '')),
        el('div', { class: 'olgrid' }, ...S.builds.slice(1).map((b, k) => { const lb = Inv.levelled(b); return tile('mine:' + (k + 1), lb, lb.name, KB.LINES[lb.core.line].name + ' core'); })),
        el('small', { class: 'olsub' }, 'BASE CHARACTERS'),
        el('div', { class: 'olgrid' }, ...KB.LINE_ORDER.map(l => tile('mint:' + l, KB.mintBuild(l, 0), KB.LINES[l].name, 'Standard set'))));
      let body;
      if (N.stage === 'menu') {
        const code = el('input', { type: 'text', maxlength: 5, placeholder: 'CODE', class: 'olcode', autocomplete: 'off', value: N.codeIn || '', oninput: e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); N.codeIn = e.target.value; } });
        const pass = N.needPass ? el('input', { type: 'password', maxlength: 16, placeholder: 'PASSWORD', class: 'olcode olpass', autocomplete: 'off' }) : null;
        const join = () => { const c = code.value.trim().toUpperCase(); if (c.length !== 5) { N.status = 'Room codes are five letters and numbers.'; render(); return; } Online.join(c, pass ? pass.value : ''); };
        [code, pass].forEach(x => x && x.addEventListener('keydown', e => { if (e.key === 'Enter') join(); }));
        body = [
          el('p', { class: 'note' }, 'Rooms hold up to six: two fight, everyone else watches and waits for their turn. Join a room from the list, host your own, or join a private room by its code.'),
          el('div', { class: 'olrow' },
            el('div', { class: 'olbox' }, el('h3', null, 'HOST'), el('p', null, 'Make a room: public or private (with a password), your rules.'), btn('HOST A ROOM', () => { N.stage = 'create'; N.status = ''; render(); }, 'big')),
            el('div', { class: 'olbox' }, el('h3', null, 'JOIN BY CODE'), el('p', null, N.needPass ? 'Room ' + N.needPass + ' needs its password.' : 'Got a code from a friend?'), code, pass, btn('JOIN', join, 'big'))),
          el('div', { class: 'olrooms' }, el('div', { class: 'olroomshead' }, el('h3', null, 'ROOMS'), N.dirEl = el('small', null, '')), N.listEl = el('div', { class: 'ollist' })),
          pickFig,
          el('p', { class: 'fine' }, 'Your browsers connect to each other directly (WebRTC); the free PeerJS service only introduces you. Like any peer-to-peer game, the people in your room can see your IP address. The room list is kept on free public MQTT services: anyone can read a listed room\'s name, its host and its rules (never its password). Some school, work or mobile networks block this kind of connection.')];
      } else if (N.stage === 'create') {
        const f = N.form = N.form || { name: Auth.user.user + '\'s room', priv: false, pass: '', listed: true, max: ROOM_MAX };
        const name = el('input', { type: 'text', maxlength: 24, class: 'olinput', value: f.name, oninput: e => { f.name = e.target.value; } });
        const pass = el('input', { type: 'text', maxlength: 16, class: 'olinput', value: f.pass, placeholder: 'password', autocomplete: 'off', oninput: e => { f.pass = e.target.value; } });
        const go = () => { if (f.priv && !f.pass.trim()) { N.status = 'A private room needs a password.'; render(); return; } Online.create({ name: f.name, priv: f.priv, pass: f.pass.trim(), listed: f.listed, max: f.max }); };
        body = [
          el('h3', { class: 'olh' }, 'NEW ROOM'),
          field('ROOM NAME', name),
          seg('TYPE', f.priv, [[false, 'Public'], [true, 'Private (password)']], v => { f.priv = v === true || v === 'true'; render(); }),
          f.priv ? field('PASSWORD', pass, el('small', null, 'Tell your friends. People in the list see a lock and have to type it.')) : null,
          seg('ROOM LIST', f.listed, [[true, 'Show it in the list'], [false, 'Code only']], v => { f.listed = v === true || v === 'true'; render(); }),
          seg('PLAYERS', f.max, [2, 3, 4, 5, 6].map(n => [n, String(n)]), v => { f.max = +v; render(); }),
          el('p', { class: 'note' }, 'You can change all of this, and the fight rules, from inside the room.'),
          el('div', { class: 'row' }, btn('CREATE ROOM', go, 'big'), btn('BACK', () => { N.stage = 'menu'; N.status = ''; Online.open(true); }, 'ghost'))];
      } else if (N.stage === 'joining' || N.stage === 'creating') {
        body = [el('p', { class: 'olwait' }, N.stage === 'creating' ? 'Opening your room...' : 'Joining room ' + N.code + '...'), btn('CANCEL', () => Online.open(), 'ghost')];
      } else if (N.stage === 'room' && R) {
        const me = memberOf(N.myId) || {}, F = R.fight, pair = nextPair(), fighting = F && F.ids.includes(N.myId);
        const qpos = id => R.queue.indexOf(id);
        // who's fighting, who's next
        let now;
        if (F) now = [el('b', null, (F.state === 'on' ? 'NOW FIGHTING: ' : 'STARTING: ') + F.names[0] + ' vs ' + F.names[1]),
          fighting ? el('small', null, 'Connecting you to ' + F.names[1 - F.ids.indexOf(N.myId)] + '...')
            : N.flog && N.flog.D != null && !G ? btn('WATCH', () => startWatch(), 'big') : el('small', null, 'Getting the fight ready...')];
        else if (pair) {
          const waiting = pair.filter(m => !m.ready).map(m => m.name);
          now = [el('b', null, (R.cd != null ? 'NEXT FIGHT IN ' + R.cd + ': ' : 'NEXT UP: ') + pair[0].name + ' vs ' + pair[1].name),
            el('small', null, waiting.length ? 'Waiting for ' + waiting.join(' and ') + ' to press READY.' : host ? (R.auto ? 'Both ready: starting...' : 'Both ready.') : (R.auto ? 'Both ready: starting...' : 'Both ready: waiting for the host.')),
            host && !R.auto ? btn('START FIGHT', () => H.start(), 'big fight' + (waiting.length ? ' off' : '')) : null];
        } else now = [el('b', null, 'WAITING FOR PLAYERS'), el('small', null, 'A fight needs two players who aren\'t sitting out.')];
        const card = m => {
          const tags = [];
          if (m.host) tags.push(['HOST', 'h']); if (m.id === N.myId) tags.push(['YOU', 'y']);
          if (F && F.ids.includes(m.id)) tags.push(['FIGHTING', 'f']); else if (m.sit) tags.push(['SITTING OUT', 's']); else if (qpos(m.id) >= 0) tags.push([qpos(m.id) < 2 ? 'NEXT UP' : '#' + (qpos(m.id) + 1) + ' IN LINE', 'q']);
          if (m.ready) tags.push(['READY', 'r']); if (m.watch) tags.push(['WATCHING', 'w']);
          const can = host && m.id !== N.myId;
          return el('div', { class: 'olmem' + (m.ready ? ' ready' : ''), style: { '--lc': KB.LINES[m.info.line].css } },
            figIcon(m.info), el('div', { class: 'olmemt' }, el('b', null, m.name), el('small', null, m.info.fig + ' · ' + lineName(m.info)),
              el('div', { class: 'oltags' }, ...tags.map(([t, c]) => el('em', { class: 'olt ' + c }, t)))),
            el('span', { class: 'olmping', 'data-id': m.id }, m.host ? '' : (m.rtt ? m.rtt + ' ms' : '')),
            can ? el('div', { class: 'olmact' }, el('button', { title: 'Fight next', onclick: () => H.front(m.id) }, '▲ NEXT'), el('button', { onclick: () => H.kick(m.id, false) }, 'KICK'), el('button', { onclick: () => H.kick(m.id, true) }, 'BLOCK'))
              : m.id === N.myId && !(F && F.ids.includes(m.id)) ? el('div', { class: 'olmact' }, el('button', { class: 'mine', onclick: () => { const s2 = document.querySelector('.screen.online .olselect'); if (s2) s2.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'CHANGE FIGHTER')) : null);
        };
        const empties = Array.from({ length: Math.max(0, R.max - R.members.length) }, () => el('div', { class: 'olmem empty' }, el('small', null, 'Open slot')));
        const rules = R.rules;
        const hostName = el('input', { type: 'text', maxlength: 24, class: 'olinput', value: R.name });
        const hostPass = el('input', { type: 'text', maxlength: 16, class: 'olinput', value: host ? N.pass || '' : '', placeholder: 'password', autocomplete: 'off' });
        body = [
          el('div', { class: 'olhead' },
            el('div', null, el('h2', null, R.name), el('div', { class: 'olbadges' }, el('em', { class: R.priv ? 'priv' : 'pub' }, R.priv ? 'PRIVATE' : 'PUBLIC'), R.listed ? null : el('em', null, 'CODE ONLY'), R.locked ? el('em', { class: 'lock' }, 'LOCKED') : null, el('span', null, R.members.length + '/' + R.max + ' players'))),
            el('div', { class: 'olcodebox' }, el('small', null, 'ROOM CODE'), el('b', null, R.code), btn('COPY', () => { try { navigator.clipboard.writeText(R.code); toastMsg('Copied ' + R.code + (R.priv ? ' (they\'ll need the password too)' : '')); } catch (e) { /* fine */ } }, 'ghost small'))),
          el('div', { class: 'olnow' + (F ? ' live' : '') }, ...now),
          R.last && !F ? el('p', { class: 'ollast' }, 'Last fight: ' + R.last.names[R.last.winner] + ' beat ' + R.last.names[1 - R.last.winner] + ' ' + R.last.wins[R.last.winner] + '–' + R.last.wins[1 - R.last.winner]) : null,
          el('div', { class: 'olmembers' }, ...R.members.map(card), ...empties),
          el('div', { class: 'olmine' },
            btn(me.ready ? 'READY ✓' : 'READY', () => act({ t: 'ready', on: !me.ready }), 'big' + (me.ready ? ' on' : '') + (fighting || me.sit ? ' off' : '')),
            btn(me.sit ? 'SITTING OUT' : 'SIT OUT', () => act({ t: 'sit', on: !me.sit }), 'ghost' + (me.sit ? ' on' : '')),
            el('label', { class: 'olcheck' }, el('input', { type: 'checkbox', checked: N.autoWatch || null, onchange: e => { N.autoWatch = e.target.checked; } }), 'Watch fights automatically')),
          pickFig,
          el('div', { class: 'olchat' }, N.chatEl = el('div', { class: 'olchatlog' }), el('div', { class: 'olchatbtns' }, ...CHAT.map((t, i) => el('button', { onclick: () => act({ t: 'chat', i }) }, t)))),
          el('div', { class: 'olset' }, el('h3', null, 'RULES' + (host ? '' : ' (the host sets these)')),
            seg('ARENA', rules.arena, [['random', 'Random'], ...Arena.LIST.map(a => [a, Arena.THEMES[a].name])], v => H.rule('arena', v), host),
            seg('ROUNDS', rules.wins, [[1, 'First to 1'], [2, 'First to 2'], [3, 'First to 3']], v => H.rule('wins', +v), host),
            seg('ROUND TIME', rules.time, [[60, '60 s'], [99, '99 s'], [180, '180 s']], v => H.rule('time', +v), host),
            seg('RARITY BONUS', rules.bonus, [[false, 'Off (fair)'], [true, 'On']], v => H.rule('bonus', v === true || v === 'true'), host),
            seg('FIGHTERS', rules.figs, [['any', 'Any (custom or base)'], ['base', 'Base characters only']], v => H.rule('figs', v), host),
            seg('ROTATION', R.rot, ROT_TXT, v => H.set('rot', v), host),
            seg('AUTO-START', R.auto, [[true, 'On (5 s after both are ready)'], [false, 'Off (the host starts)']], v => H.set('auto', v === true || v === 'true'), host)),
          host ? el('div', { class: 'olset' }, el('h3', null, 'ROOM'),
            field('NAME', hostName, btn('SAVE', () => H.set('name', hostName.value), 'ghost small')),
            seg('TYPE', R.priv, [[false, 'Public'], [true, 'Private (password)']], v => { const on = v === true || v === 'true'; if (on && !(N.pass || hostPass.value.trim())) { toastMsg('Type a password first, then press SAVE.'); return; } H.set('priv', { on, pass: on ? N.pass || hostPass.value.trim() : '' }); }),
            R.priv ? field('PASSWORD', hostPass, btn('SAVE', () => { const p = hostPass.value.trim(); if (!p) { toastMsg('A private room needs a password.'); return; } H.set('priv', { on: true, pass: p }); toastMsg('Password changed.'); }, 'ghost small'))
              : field('PASSWORD', hostPass, btn('MAKE PRIVATE', () => { const p = hostPass.value.trim(); if (!p) { toastMsg('Type a password first.'); return; } H.set('priv', { on: true, pass: p }); }, 'ghost small')),
            seg('ROOM LIST', R.listed, [[true, 'Show it in the list'], [false, 'Code only']], v => H.set('listed', v === true || v === 'true')),
            seg('NEW PLAYERS', R.locked, [[false, 'Let them in'], [true, 'Locked']], v => H.set('locked', v === true || v === 'true')),
            seg('ROOM SIZE', R.max, [2, 3, 4, 5, 6].map(n => [n, String(n)]), v => H.set('max', +v))) : null,
          el('div', { class: 'row' }, btn(host ? 'CLOSE THE ROOM' : 'LEAVE THE ROOM', () => Online.leave(), 'ghost danger'))];
      } else return;
      const scroller = document.querySelector('.screen.online .olpanel'), y = scroller ? scroller.scrollTop : 0;
      const scr = el('div', { class: 'screen online' }, topbar('ONLINE', () => (N.stage === 'create' ? (N.stage = 'menu', Online.open(true)) : Online.leave())),
        el('div', { class: 'panel olpanel' }, ...body, N.status ? el('p', { class: 'olstatus' }, N.status) : null));
      scr.addEventListener('focusout', () => setTimeout(() => { if (N && N.dirty && N.redraw === render) render(); }, 250));
      App.screen(scr);
      const sc2 = document.querySelector('.screen.online .olpanel'); if (sc2 && y) sc2.scrollTop = y;
      if (N.stage === 'menu') fillList();
      drawChat();
    };
    // the room list, redrawn in place as rooms come and go
    const fillList = () => {
      if (!N || N.stage !== 'menu' || !N.listEl) return;
      const rooms = [...Dir.rooms.values()].sort((a, b) => (a.state === 'open' ? 0 : 1) - (b.state === 'open' ? 0 : 1) || b.n - a.n || a.name.localeCompare(b.name));
      N.dirEl.textContent = Dir.disabled ? '' : Dir.state === 'up' ? rooms.length + (rooms.length === 1 ? ' room' : ' rooms') : Dir.state === 'down' ? 'Couldn\'t reach the room list. You can still host a room and join by code.' : 'Looking for rooms...';
      const { btn } = Menu.ui;
      N.listEl.innerHTML = '';
      if (!rooms.length) { N.listEl.append(el('p', { class: 'olempty' }, Dir.state === 'up' ? 'No rooms open right now. Host one!' : '')); return; }
      for (const r of rooms) {
        const cant = r.state === 'full' || r.state === 'locked', open = N.passFor === r.code;
        const pass = open ? el('input', { type: 'password', maxlength: 16, placeholder: 'PASSWORD', class: 'olinput olrpass', autocomplete: 'off' }) : null;
        const go = () => { if (r.priv && !open) { N.passFor = r.code; fillList(); const i = N.listEl.querySelector('.olrpass'); if (i) i.focus(); return; } Online.join(r.code, pass ? pass.value : ''); };
        if (pass) pass.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
        N.listEl.append(el('div', { class: 'olroom' + (cant ? ' off' : ''), style: { '--lc': KB.LINES[r.line].css } },
          el('img', { src: Models.figIcon(KB.mintBuild(r.line, 0)), alt: '' }),
          el('div', { class: 'olroomt' }, el('b', null, r.name), el('small', null, 'Host ' + r.host + ' · first to ' + r.wins + ' · ' + r.time + ' s · ' + (r.figs === 'base' ? 'base characters only' : 'custom fighters OK'))),
          r.priv ? el('em', { class: 'olt priv' }, 'PRIVATE') : null,
          el('span', { class: 'olroomn' }, r.n + '/' + r.max),
          el('em', { class: 'olt st-' + r.state }, STATE_TXT[r.state]),
          pass, btn(open ? 'GO' : 'JOIN', go, 'small' + (cant ? ' off' : ''))));
      }
    };
    updPings = () => { if (!N || !N.room) return; document.querySelectorAll('.olmping').forEach(e => { const m = memberOf(e.dataset.id); if (m && !m.host) e.textContent = m.rtt ? m.rtt + ' ms' : ''; }); if (N.stage === 'room') { const b = document.querySelector('.olnow b'); const R = N.room, p = nextPair(); if (b && !R.fight && p) b.textContent = (R.cd != null ? 'NEXT FIGHT IN ' + R.cd + ': ' : 'NEXT UP: ') + p[0].name + ' vs ' + p[1].name; } drawResultNote(); };
    drawChat = () => {
      if (!N || !N.chatEl || !document.body.contains(N.chatEl)) return;
      N.chatEl.innerHTML = '';
      for (const c of N.chat.slice(-8)) N.chatEl.append(c.sys ? el('div', { class: 'sys' }, c.sys) : el('div', null, el('b', null, c.from + ': '), CHAT[c.i] || ''));
      N.chatEl.scrollTop = 1e6;
    };
    N.redraw = render;
    Dir.onChange = () => fillList();
    if (N.stage === 'menu') Dir.browse(); else if (!N.host) Dir.stopBrowse();
    if (N.stage !== 'fight' && N.stage !== 'watch') { useMenuRoom(); render(); }
  };

  /* hosting: the room opens under a fresh code */
  Online.create = async o => {
    const S0 = N; N.stage = 'creating'; N.status = ''; draw();
    try { await loadPeer(); } catch (e) { if (N === S0) { N.stage = 'create'; N.status = e.message; draw(); } return; }
    if (N !== S0) return;
    Dir.stopBrowse();
    const open = () => {
      const code = makeCode(), peer = new (PeerC())(PREFIX + code, { debug: 0 }), S = N;
      N.peer = peer;
      peer.on('open', id => {
        if (N !== S || N.peer !== peer) return;
        Object.assign(N, { code, myId: id, host: true, pass: o.priv ? String(o.pass || '').slice(0, 16) : '', mem: new Map(), blocked: new Set(), blockedNames: new Set(), stage: 'room', status: '' });
        N.me = meInfo(); N.room = newRoom(o, code, id);
        N.room.members.push({ id, name: N.me.name, info: cleanInfo(N.me), ready: false, sit: false, watch: false, host: true, rtt: 0 });
        requeue(); clearInterval(N.tickT); N.tickT = setInterval(hostTick, 1000);
        Dir.host(code, listing);
        sysSay('Room open. Its code is ' + code + '.');
        Online.open(true);
      });
      peer.on('connection', conn => { if (N !== S) return; if (conn.metadata && conn.metadata.fid) fightConn(conn); else hostConn(conn); });
      peer.on('error', e => {
        if (N !== S || N.peer !== peer) return;
        if (e.type === 'unavailable-id') { try { peer.destroy(); } catch (x) { /* fine */ } open(); return; }
        if (e.type === 'peer-unavailable') return;
        if (N.stage === 'creating') { N.stage = 'create'; N.status = why(e); draw(); } else toastMsg(why(e));
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* fine */ } });
    };
    open();
  };
  /* joining: by code (with a password for a private room) */
  Online.join = async (code, pass) => {
    if (N && N.room) Online.leave(true);
    if (!N) N = freshN();
    Dir.stopBrowse();
    const S0 = N; Object.assign(N, { stage: 'joining', host: false, code, status: '', needPass: null, passFor: null }); draw();
    try { await loadPeer(); } catch (e) { if (N === S0) { N.stage = 'menu'; N.status = e.message; Online.open(true); } return; }
    if (N !== S0) return;
    const peer = new (PeerC())({ debug: 0 }), S = N; N.peer = peer;
    peer.on('open', id => {
      if (N !== S) return;
      N.myId = id;
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json', metadata: { room: true } }); N.conn = conn;
      conn.on('open', () => { if (N === S) conn.send({ t: 'hello', ver: VERSION, me: meInfo(), pass: pass || '' }); });
      conn.on('data', d => { if (N === S) guestGot(d); });
      conn.on('close', () => { if (N === S) roomGone(N.stage === 'joining' ? 'Couldn\'t join room ' + code + '.' : 'Lost the connection to the room.'); });
      conn.on('error', () => {});
      later(12000, () => { if (N === S && N.stage === 'joining') roomGone('No answer from room ' + code + '. It may have closed, or check the code.'); });
    });
    peer.on('connection', c => { if (N === S && c.metadata && c.metadata.fid) fightConn(c); else { try { c.close(); } catch (e) { /* fine */ } } });
    peer.on('error', e => { if (N !== S || N.peer !== peer) return; if (N.stage === 'joining') roomGone(why(e)); });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* fine */ } });
  };
  Online.leave = quiet => {
    if (!N) return;
    const S = N; N.leaving = true;
    if (G) { if (!G.watch && !G.ended) { G.tx({ t: 'left' }); toHost({ t: 'fover', fid: G.cfg.fid, aborted: true, why: G.cfg.names[G.local] + ' left the room.' }); } endFight(); App.setView(null); }
    if (S.host) { toAll({ t: 'closed' }); Dir.stopHost(); clearInterval(S.tickT); }
    Dir.stopBrowse();
    const peer = S.peer;
    setTimeout(() => { try { if (S.conn) S.conn.close(); } catch (e) { /* fine */ } try { if (peer) peer.destroy(); } catch (e) { /* fine */ } }, 250);
    N = null;
    if (!quiet) Menu.hub();
  };
  Online.running = () => !!G;
  // (tests)
  Online._t = { rng, withRng, onIn: null, prepSnap, snapshot, restoreSnap, hashSnap, Dir, H, act,
    usePeer: C => { PeerImpl = C; }, N: () => N, G: () => G, tick: () => hostTick(), later: runLater, debug: 0, deepFilter: null,
    pick: k => { N.pick = k; N.me = meInfo(); if (N.room) act({ t: 'fig', me: N.me }); draw(); },
    info: () => G && !G.watch ? { f: G.f, conf: G.conf, D: G.D, local: G.local, syncs: G.syncs, desyncs: G.desyncs || 0, rollbacks: G.rollbacks, rbFrames: G.rbFrames, rbMax: G.rbMax, rbMs: Math.round(G.rbMs * 10) / 10, rbAvg: Math.round(G.rbSum / Math.max(1, G.rollbacks) * 100) / 100, guesses: G.guesses, skips: G.skips, adv: Math.round(G.adv * 100) / 100, hp: G.m.fighters.map(f => Math.round(f.hp)), fp: fingerprint(), stage: N && N.stage, link: G.link && G.link.mode }
      : G && G.watch ? { watch: true, f: G.f, avail: Math.min(G.log.top[0], G.log.top[1]), hp: G.m.fighters.map(f => Math.round(f.hp)), fp: fingerprint(), stage: N && N.stage }
        : { stage: N && N.stage, code: N && N.code, status: N && N.status, myId: N && N.myId, room: N && N.room ? { n: N.room.members.length, fight: N.room.fight && N.room.fight.state, queue: N.room.queue.length, cd: N.room.cd } : null, result: !!(N && N.result) } };
  Online.version = VERSION;
})();
