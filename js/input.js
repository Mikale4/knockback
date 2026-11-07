/* ============================================================================
   input.js -- keyboard and gamepads for two players, with an input buffer.

   Each player reads: move (a 2D stick, x = right, y = forward/up), held(a),
   pressed(a) (this frame), and take(a, window) which consumes a press made in
   the last `window` seconds (so a button pressed a moment early still counts).
   Actions: light heavy guard special snap super jump dodge pause.

   CONTROLS ARE YOURS: every action takes two keys per player, and every pad
   button can be rebound. Xbox, PlayStation and Switch controllers are told
   apart by name so the prompts show the right buttons; any other PC pad works
   too (its d-pad hat is read when the browser doesn't map it), and since its
   buttons may be laid out any old way, it can be rebound button by button.
   With a pad, the menus are driven by the d-pad / stick, bottom button to
   choose and right button to go back.
   ========================================================================== */
(function () {
  'use strict';
  const ACTIONS = ['light', 'heavy', 'guard', 'special', 'snap', 'super', 'toss', 'jump', 'dodge'];
  const LABEL = { light: 'Light attack', heavy: 'Heavy / Knock', guard: 'Guard (+Light = Throw)', special: 'Head Special', snap: 'Snap Cancel / Burst', super: 'Legend Art (Super)', toss: 'Part Toss', jump: 'Jump', dodge: 'Dodge / Tech', up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right' };
  const DEFAULT = [
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], light: ['KeyZ'], heavy: ['KeyX'], guard: ['KeyC'], special: ['KeyA'], snap: ['KeyD'], super: ['KeyS'], toss: ['KeyF'], jump: ['Space'], dodge: ['ShiftLeft'] },
    { up: ['KeyI'], down: ['KeyK'], left: ['KeyJ'], right: ['KeyL'], light: ['Numpad1', 'Comma'], heavy: ['Numpad2', 'Period'], guard: ['Numpad3', 'Slash'], special: ['Numpad5', 'Semicolon'], snap: ['Numpad4', 'Quote'], super: ['Numpad6', 'BracketRight'], toss: ['Numpad7', 'BracketLeft'], jump: ['Numpad0', 'ShiftRight'], dodge: ['NumpadDecimal', 'Backslash'] },
  ];
  /* the standard pad layout (button indices): bottom, right, left, top face buttons, LB RB LT RT */
  const PAD_DEFAULT = { jump: 0, dodge: 1, light: 2, heavy: 3, special: 4, guard: 5, super: 6, snap: 7, toss: 11 };
  const PAUSE_BTN = 9;
  /* what each standard button is called on each family of controller */
  const GLYPHS = {
    xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '↑', '↓', '←', '→', 'Guide'],
    ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', '↑', '↓', '←', '→', 'PS'],
    switch: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'LS', 'RS', '↑', '↓', '←', '→', 'Home'],
  };
  const PAD_NAME = { xbox: 'Xbox controller', ps: 'PlayStation controller', switch: 'Switch controller', generic: 'PC controller' };

  const keys = new Set();
  const copy = o => JSON.parse(JSON.stringify(o));
  const BINDS_V = 2;
  let binds = U.read('kb.binds', null);
  if (!binds || binds.length !== 2 || U.read('kb.bindsV', 1) < BINDS_V) { binds = copy(DEFAULT); U.write('kb.binds', binds); U.write('kb.bindsV', BINDS_V); }
  binds.forEach((B, pi) => { if (!B.toss) { const used = new Set(Object.values(B).flat()); B.toss = DEFAULT[pi].toss.filter(c => !used.has(c)); } });
  let padBinds = U.read('kb.padbinds', null);
  if (!padBinds || padBinds.length !== 2) padBinds = [Object.assign({}, PAD_DEFAULT), Object.assign({}, PAD_DEFAULT)];
  padBinds.forEach(P => { if (P.toss == null && !Object.values(P).includes(PAD_DEFAULT.toss)) P.toss = PAD_DEFAULT.toss; });
  const settings = Object.assign({ deadzone: 0.22, swap: false }, U.read('kb.padset', {}));
  let listening = null;   // a callback waiting for the next key (rebinding)
  let padListen = null;   // { pi, action, cb, seen } waiting for the next pad button
  const anyPress = [];    // listeners for "any key or button" (menus)
  const lastDevice = ['keys', 'keys'];

  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' && e.target.type !== 'range' || e.target.tagName === 'TEXTAREA')) return;
    if (padListen && e.code === 'Escape') { e.preventDefault(); const p = padListen; padListen = null; p.cb && p.cb(null); return; }
    if (listening) { e.preventDefault(); const f = listening; listening = null; f(e.code); return; }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) for (const f of anyPress.slice()) f(e.code);
    keys.add(e.code);
    // a pad's presses can come in as keys as well (Steam's desktop controller layout, Windows' own gamepad keys):
    // while a pad is in use, a key doesn't turn the prompts back to the keyboard (they'd flicker between the two)
    if (fromPad(e)) return;
    lastDevice[0] = 'keys'; if (binds[1] && Object.values(binds[1]).some(a => a.includes(e.code))) lastDevice[1] = 'keys';
  });
  let padAt = -1e9;   // when a pad was last used (performance.now)
  const fromPad = e => /^Gamepad/.test(e.key || '') || !e.code || performance.now() - padAt < 600
    || connected().some(gp => gp.buttons.some((b, i) => pressedB(gp, i)) || Math.hypot(padDir(gp).x, padDir(gp).y) > 0);
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  /* ------------------------------------------------------------ pads */
  function padType(gp) {
    const id = (gp && gp.id || '').toLowerCase();
    if (/xbox|xinput|045e|microsoft/.test(id)) return 'xbox';
    if (/playstation|dualshock|dualsense|054c|sony|wireless controller/.test(id)) return 'ps';
    if (/nintendo|switch|pro controller|057e|joy-con/.test(id)) return 'switch';
    return 'generic';
  }
  const padLabel = (type, b) => (GLYPHS[type] || [])[b] || 'B' + (b + 1);
  const connected = () => (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter(g => g && g.connected !== false);
  /* which pads a player reads: in solo, P1 reads every pad; in versus, one each (swappable) */
  function padsFor(i) {
    const list = connected();
    if (Input.mode !== 'versus') return i === 0 ? list : [];
    const order = settings.swap ? [1, 0] : [0, 1];
    const gp = list[order[i]]; return gp ? [gp] : [];
  }
  const pressedB = (gp, n) => !!gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.5);
  /* a stick and d-pad direction, including the hat axis non-standard PC pads report */
  function padDir(gp) {
    let ax = gp.axes[0] || 0, ay = -(gp.axes[1] || 0);
    if (Math.hypot(ax, ay) < settings.deadzone) { ax = 0; ay = 0; }
    if (pressedB(gp, 15)) ax = 1; if (pressedB(gp, 14)) ax = -1; if (pressedB(gp, 12)) ay = 1; if (pressedB(gp, 13)) ay = -1;
    if (gp.mapping !== 'standard' && gp.axes.length > 9) {
      // the hat many PC pads report on axis 9: -1 up, then clockwise in steps of 2/7, ~1.29 when centred.
      // Only trusted once it has been seen centred, so a plain analog axis never reads as a held d-pad.
      const h = gp.axes[9];
      if (h > 1.1) hatOk.add(gp.index);
      else if (hatOk.has(gp.index) && h >= -1.05) { const k = Math.round((h + 1) * 3.5) % 8, a = k * Math.PI / 4; ax = Math.round(Math.sin(a)); ay = Math.round(Math.cos(a)); }
    }
    return { x: ax, y: ay };
  }
  const hatOk = new Set();

  class Player {
    constructor(i) {
      this.i = i; this.move = { x: 0, y: 0 }; this.held = {}; this.prev = {}; this.edge = {}; this.at = {}; this.dirAt = {}; this.guardAt = {}; this.pad = null;
      this.cpu = null; // an AI controller that writes into this player instead of the devices
    }
    poll(t, pads, useKeys) {
      const H = {}; let mx = 0, my = 0;
      if (this.cpu) { Object.assign(H, this.cpu.held); mx = this.cpu.move.x; my = this.cpu.move.y; }
      else {
        if (useKeys) {
          const B = binds[this.i];
          const k = a => (B[a] || []).some(c => keys.has(c));
          for (const a of ACTIONS) H[a] = k(a);
          mx = (k('right') ? 1 : 0) - (k('left') ? 1 : 0); my = (k('up') ? 1 : 0) - (k('down') ? 1 : 0);
        }
        const T = this.i === 0 && window.Touch && Touch.state.active ? Touch.state : null;
        if (T) { for (const a of ACTIONS) H[a] = H[a] || !!T.held[a]; if (Math.hypot(T.move.x, T.move.y) > 0.15) { mx = T.move.x; my = T.move.y; } }
        this.pad = pads[0] || null;
        const PB = padBinds[this.i];
        for (const gp of pads) {
          let any = false;
          for (const a of ACTIONS) if (PB[a] != null && pressedB(gp, PB[a])) { H[a] = true; any = true; }
          if (pressedB(gp, PAUSE_BTN)) { H.pause = true; any = true; }
          const d = padDir(gp);
          if (Math.hypot(d.x, d.y) > 0.01) { mx = d.x; my = d.y; any = true; }
          if (any) { this.pad = gp; lastDevice[this.i] = 'pad'; padAt = performance.now(); }
        }
      }
      const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
      this.move.x = mx; this.move.y = my;
      for (const a of ACTIONS.concat('pause')) {
        this.edge[a] = !!H[a] && !this.prev[a];
        if (this.edge[a]) { this.at[a] = t; this.dirAt[a] = { x: mx, y: my }; this.guardAt[a] = !!H.guard; }
        this.prev[a] = !!H[a]; this.held[a] = !!H[a];
      }
    }
    pressed(a) { return !!this.edge[a]; }
    /* consume a buffered press: true if `a` was pressed within `win` seconds and not yet used */
    take(a, win) { const t = this.at[a]; if (t != null && Input.now - t <= (win == null ? 0.14 : win)) { this.at[a] = null; return true; } return false; }
    peek(a, win) { const t = this.at[a]; return t != null && Input.now - t <= (win == null ? 0.14 : win); }
    clear() { this.at = {}; }
  }

  /* ----------------------------------------------- driving the menus with a pad */
  const Nav = {
    prev: {}, rep: 0, dirHeld: null,
    root() {
      const ovs = document.querySelectorAll('.overlay'); if (ovs.length) return ovs[ovs.length - 1];
      const v = window.App && App.view;
      if (v && v.fighters && v.phase !== 'end' && !v.attract) return null;   // a fight: the pad belongs to the fighters
      return document.getElementById('screens');
    },
    items(root) { return Array.from(root.querySelectorAll('button, select, input[type=range], input[type=text], input[type=password], [data-nav]')).filter(e => !e.disabled && e.offsetParent !== null && e.getBoundingClientRect().width > 0); },
    current(root) { const a = root.querySelector('.padfocus'); return a && a.offsetParent !== null ? a : null; },
    focus(el) { document.querySelectorAll('.padfocus').forEach(e => e.classList.remove('padfocus')); if (!el) return; el.classList.add('padfocus'); try { el.focus({ preventScroll: true }); } catch (e) { /* old browsers */ } el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); if (window.SFX) SFX.play('ui'); },
    move(root, dx, dy) {
      const list = Nav.items(root); if (!list.length) return;
      const cur = Nav.current(root);
      if (!cur) { Nav.focus(root.querySelector('.btn.big:not([disabled])') && Nav.items(root).includes(root.querySelector('.btn.big:not([disabled])')) ? root.querySelector('.btn.big:not([disabled])') : list[0]); return; }
      if (cur.type === 'range' && dx) { cur.value = +cur.value + dx * (+cur.step || 0.05); cur.dispatchEvent(new Event('input', { bubbles: true })); return; }
      const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
      let best = null, bs = 1e9;
      for (const e of list) {
        if (e === cur) continue;
        const r = e.getBoundingClientRect(), ex = r.left + r.width / 2 - cx, ey = r.top + r.height / 2 - cy;
        const along = ex * dx + ey * -dy, across = Math.abs(ex * dy + ey * dx);
        if (along <= 4) continue;
        const s = along + across * 2.2; if (s < bs) { bs = s; best = e; }
      }
      if (best) Nav.focus(best);
    },
    press(root) {
      const cur = Nav.current(root); if (!cur) { Nav.move(root, 0, 0); return; }
      if (cur.tagName === 'SELECT') { cur.selectedIndex = (cur.selectedIndex + 1) % cur.options.length; cur.dispatchEvent(new Event('change', { bubbles: true })); if (window.SFX) SFX.play('ui'); return; }
      cur.click();
    },
    back(root) {
      const pause = document.getElementById('pause');
      const b = pause ? pause.querySelector('.btn.big') : root.querySelector('.mfoot .btn') || root.querySelector('.backbtn');
      if (b) b.click();
    },
    update(dt) {
      const pads = connected(); if (!pads.length) { Nav.prev = {}; return; }
      // what's down on any pad this frame
      const now = {}; let dir = null;
      for (const gp of pads) {
        for (let b = 0; b < gp.buttons.length; b++) if (pressedB(gp, b)) now[b] = true;
        const d = padDir(gp); if (Math.abs(d.x) > 0.6 || Math.abs(d.y) > 0.6) dir = Math.abs(d.x) > Math.abs(d.y) ? [Math.sign(d.x), 0] : [0, Math.sign(d.y)];
      }
      const edge = b => now[b] && !Nav.prev[b];
      // a fresh button press is an "any key" for title screens and reveals
      for (let b = 0; b < 17; b++) if (edge(b) && !padListen) for (const f of anyPress.slice()) f('Pad' + b);
      const root = Nav.root();
      if (root && !padListen) {
        const key = dir ? dir.join(',') : null;
        if (key !== Nav.dirHeld) { Nav.dirHeld = key; Nav.rep = 0.32; if (dir) Nav.move(root, dir[0], dir[1]); }
        else if (dir) { Nav.rep -= dt; if (Nav.rep <= 0) { Nav.rep = 0.11; Nav.move(root, dir[0], dir[1]); } }
        if (edge(0)) Nav.press(root);
        if (edge(1)) Nav.back(root);
        if (edge(PAUSE_BTN) && document.getElementById('pause')) Nav.back(root);
      }
      Nav.prev = now;
    },
  };

  const Input = {
    ACTIONS, LABEL, DEFAULT, PAD_DEFAULT, GLYPHS, PAD_NAME, now: 0,
    players: [new Player(0), new Player(1)],
    /* who reads what: mode 'solo' (P1 gets keys set 1 + every pad), 'versus' (P1 keys 1 + pad 1, P2 keys 2 + pad 2) */
    mode: 'solo',
    update(t) {
      const dt = Math.min(0.1, Math.max(0, t - (Input.now || t))); Input.now = t;
      const [p1, p2] = Input.players;
      p1.poll(t, padsFor(0), true);
      if (Input.mode === 'versus') p2.poll(t, padsFor(1), true); else p2.poll(t, [], false);
      // a pad button being rebound
      if (padListen) {
        const pads = Input.mode === 'versus' && connected().length > 1 ? padsFor(padListen.pi) : connected();
        for (const gp of pads) for (let b = 0; b < gp.buttons.length; b++) {
          const k = gp.index + ':' + b, down = pressedB(gp, b);
          if (down && !padListen.seen.has(k) && b !== PAUSE_BTN && (b < 12 || b > 15)) {
            const p = padListen; padListen = null;
            const PB = padBinds[p.pi], old = PB[p.action];
            for (const a in PB) if (PB[a] === b && a !== p.action) PB[a] = old;   // swap with whatever had it
            PB[p.action] = b; U.write('kb.padbinds', padBinds); p.cb && p.cb(b); return;
          }
          if (!down) padListen.seen.delete(k);
        }
      }
      Nav.update(dt);
    },
    get binds() { return binds; },
    get padBinds() { return padBinds; },
    get settings() { return settings; },
    setSetting(k, v) { settings[k] = v; U.write('kb.padset', settings); },
    /* rebind a key (slot 0 main, 1 alternate). A key can only do one thing: whatever had it gets this slot's old key. */
    rebind(pi, action, cb, slot) {
      slot = slot || 0;
      listening = code => {
        if (code === 'Escape') { cb && cb(null); return; }
        const list = binds[pi][action] || (binds[pi][action] = []);
        if (code === 'Backspace' || code === 'Delete') { if (slot > 0) list.splice(slot, 1); U.write('kb.binds', binds); cb && cb(null); return; }
        const old = list[slot];
        for (let p = 0; p < 2; p++) for (const a in binds[p]) {
          const L = binds[p][a], j = L.indexOf(code);
          if (j < 0 || (p === pi && a === action && j === slot)) continue;
          if (p === pi && old) L[j] = old; else L.splice(j, 1);
        }
        list[slot] = code; binds[pi][action] = list.filter(Boolean);
        U.write('kb.binds', binds); cb && cb(code);
      };
    },
    /* rebind a pad button: the next button pressed on that player's pad */
    rebindPad(pi, action, cb) {
      const seen = new Set(); for (const gp of connected()) gp.buttons.forEach((b, i) => { if (pressedB(gp, i)) seen.add(gp.index + ':' + i); });
      padListen = { pi, action, cb, seen };
    },
    cancelListen() { listening = null; padListen = null; },
    get listeningPad() { return !!padListen; },
    resetBinds() { binds = copy(DEFAULT); U.write('kb.binds', binds); },
    resetPads() { padBinds = [Object.assign({}, PAD_DEFAULT), Object.assign({}, PAD_DEFAULT)]; U.write('kb.padbinds', padBinds); },
    keyName(code) { return String(code || '—').replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ').replace('ShiftLeft', 'L-Shift').replace('ShiftRight', 'R-Shift').replace('ControlLeft', 'L-Ctrl').replace('ControlRight', 'R-Ctrl').replace('AltLeft', 'L-Alt').replace('AltRight', 'R-Alt').replace('Arrow', '').replace('Comma', ',').replace('Period', '.').replace('Slash', '/').replace('Semicolon', ';').replace('Quote', "'").replace('BracketRight', ']').replace('BracketLeft', '[').replace('Backslash', '\\').replace('Minus', '-').replace('Equal', '=').replace('Backquote', '`'); },
    padType, padLabel, padName: t => PAD_NAME[t] || PAD_NAME.generic,
    /* the connected controllers and who they belong to */
    pads() {
      const list = connected();
      return list.map((gp, n) => ({ index: gp.index, n, id: gp.id, type: padType(gp), standard: gp.mapping === 'standard', player: Input.mode === 'versus' ? (settings.swap ? (n === 0 ? 1 : n === 1 ? 0 : -1) : (n < 2 ? n : -1)) : 0, pressed: gp.buttons.map((b, i) => pressedB(gp, i) ? i : -1).filter(i => i >= 0) }));
    },
    /* the prompt for an action: a pad glyph if that player is on a pad, else the key */
    prompt(pi, a) {
      const p = Input.players[pi || 0];
      if (lastDevice[pi || 0] === 'pad') { const gp = p.pad || padsFor(pi || 0)[0]; const b = padBinds[pi || 0][a]; if (b != null) return padLabel(gp ? padType(gp) : 'xbox', b); }
      return Input.keyName((binds[pi || 0][a] || [])[0]);
    },
    usingPad: pi => lastDevice[pi || 0] === 'pad',
    onAny(f) { anyPress.push(f); return () => { const i = anyPress.indexOf(f); if (i >= 0) anyPress.splice(i, 1); }; },
    keyDown: c => keys.has(c),
    Nav,
  };
  window.addEventListener('gamepadconnected', e => { lastDevice[0] = 'pad'; if (window.Menu && Menu.padToast) Menu.padToast(e.gamepad, true); });
  window.addEventListener('gamepaddisconnected', e => { if (window.Menu && Menu.padToast) Menu.padToast(e.gamepad, false); });
  window.Input = Input;
})();
