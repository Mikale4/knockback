/* ============================================================================
   input.js -- keyboard and gamepads for two players, with an input buffer.

   Each player reads: move (a 2D stick, x = right, y = forward/up), held(a),
   pressed(a) (this frame), and take(a, window) which consumes a press made in
   the last `window` seconds (so a button pressed a moment early still counts).
   Actions: light heavy guard special snap super jump dodge pause.
   ========================================================================== */
(function () {
  'use strict';
  const ACTIONS = ['light', 'heavy', 'guard', 'special', 'snap', 'super', 'jump', 'dodge'];
  const LABEL = { light: 'Light attack', heavy: 'Heavy / Knock', guard: 'Guard (+Light = Throw)', special: 'Head Special', snap: 'Snap Cancel / Burst', super: 'Legend Art (Super)', jump: 'Jump', dodge: 'Dodge / Tech', up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right' };
  const DEFAULT = [
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], light: ['KeyJ'], heavy: ['KeyK'], guard: ['KeyL'], special: ['KeyI'], snap: ['KeyU'], super: ['KeyO'], jump: ['Space'], dodge: ['ShiftLeft'] },
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], light: ['Numpad1', 'Comma'], heavy: ['Numpad2', 'Period'], guard: ['Numpad3', 'Slash'], special: ['Numpad5', 'Semicolon'], snap: ['Numpad4', 'Quote'], super: ['Numpad6', 'BracketRight'], jump: ['Numpad0', 'ShiftRight'], dodge: ['NumpadDecimal', 'Backslash'] },
  ];
  const PAD = { jump: 0, dodge: 1, light: 2, heavy: 3, special: 4, guard: 5, super: 6, snap: 7 };

  const keys = new Set();
  let binds = U.read('kb.binds', null);
  if (!binds || binds.length !== 2) binds = JSON.parse(JSON.stringify(DEFAULT));
  let listening = null; // a callback waiting for the next key (rebinding)
  const anyPress = []; // listeners for "any key" (menus)

  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (listening) { e.preventDefault(); const f = listening; listening = null; f(e.code); return; }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) for (const f of anyPress) f(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  class Player {
    constructor(i) {
      this.i = i; this.move = { x: 0, y: 0 }; this.held = {}; this.prev = {}; this.edge = {}; this.at = {}; this.dirAt = {}; this.pad = null;
      this.cpu = null; // an AI controller that writes into this player instead of the devices
    }
    poll(t, padIndex, useKeys) {
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
        const gp = padIndex != null && navigator.getGamepads ? navigator.getGamepads()[padIndex] : null;
        this.pad = gp || null;
        if (gp) {
          const b = n => gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.5);
          for (const a in PAD) H[a] = H[a] || b(PAD[a]);
          H.pause = b(9);
          let ax = gp.axes[0] || 0, ay = -(gp.axes[1] || 0);
          if (b(15)) ax = 1; if (b(14)) ax = -1; if (b(12)) ay = 1; if (b(13)) ay = -1;
          if (Math.hypot(ax, ay) > 0.22) { mx = ax; my = ay; }
        }
      }
      const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
      this.move.x = mx; this.move.y = my;
      for (const a of ACTIONS.concat('pause')) {
        this.edge[a] = !!H[a] && !this.prev[a];
        if (this.edge[a]) { this.at[a] = t; this.dirAt[a] = { x: mx, y: my }; }
        this.prev[a] = !!H[a]; this.held[a] = !!H[a];
      }
    }
    pressed(a) { return !!this.edge[a]; }
    /* consume a buffered press: true if `a` was pressed within `win` seconds and not yet used */
    take(a, win) { const t = this.at[a]; if (t != null && Input.now - t <= (win == null ? 0.14 : win)) { this.at[a] = null; return true; } return false; }
    peek(a, win) { const t = this.at[a]; return t != null && Input.now - t <= (win == null ? 0.14 : win); }
    clear() { this.at = {}; }
  }

  const Input = {
    ACTIONS, LABEL, DEFAULT, now: 0,
    players: [new Player(0), new Player(1)],
    /* who reads what: mode 'solo' (P1 gets keys set 1 + the first pad), 'versus' (P1 keys 1 + pad 0, P2 keys 2 + pad 1) */
    mode: 'solo',
    update(t) {
      Input.now = t;
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean).map(g => g.index) : [];
      const [p1, p2] = Input.players;
      if (Input.mode === 'versus') { p1.poll(t, pads[0], true); p2.poll(t, pads[1], true); }
      else { p1.poll(t, pads[0], true); p2.poll(t, null, false); }
    },
    get binds() { return binds; },
    rebind(pi, action, cb) { listening = code => { if (code !== 'Escape') { binds[pi][action] = [code]; U.write('kb.binds', binds); } cb && cb(code); }; },
    resetBinds() { binds = JSON.parse(JSON.stringify(DEFAULT)); U.write('kb.binds', binds); },
    keyName(code) { return String(code || '?').replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ').replace('ShiftLeft', 'L-Shift').replace('ShiftRight', 'R-Shift').replace('Arrow', '').replace('Comma', ',').replace('Period', '.').replace('Slash', '/').replace('Semicolon', ';').replace('Quote', "'").replace('BracketRight', ']').replace('Backslash', '\\'); },
    onAny(f) { anyPress.push(f); return () => { const i = anyPress.indexOf(f); if (i >= 0) anyPress.splice(i, 1); }; },
    keyDown: c => keys.has(c),
  };
  window.Input = Input;
})();
