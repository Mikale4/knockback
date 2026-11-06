/* ============================================================================
   lab.js -- TRAINING's lab: the practice tools of a fighting game.

   INPUTS: your button history, one row each time what you hold changes, with
   how many frames you held it (the stick as an arrow, as it sits on screen).
   FRAME DATA: a frame meter (one cell a frame, both fighters: startup, active,
   recovery, stun, dodging), your last move's startup / active / recovery, and
   the FRAME ADVANTAGE once you both can act again (+ you're free first).
   RECORD: you take the dummy and play it (your own figure stands still) for up
   to 10 s, starting at your first input; PLAY has it do that once, and
   Dummy: Playback loops it. The stick is kept relative to the dummy's line to
   you, so "walk at them" still walks at you from anywhere in the arena.
   Only in plain Training (not the tutorial or the trials).
   ========================================================================== */
(function () {
  'use strict';
  const MAX_REC = 10, VIS = 90;
  const TAG = { light: 'L', heavy: 'H', guard: 'G', special: 'SP', snap: 'SN', super: 'SU', toss: 'T', jump: 'J', dodge: 'D' };
  const ARROW = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
  const FREE = ['idle', 'run', 'guard', 'air'];
  const free = f => FREE.includes(f.state);
  const bitsOf = held => Input.ACTIONS.reduce((b, a, k) => b | (held[a] ? 1 << k : 0), 0);
  /* the line from f to o on the floor (or f's facing when they're on top of each other) */
  const lineTo = (f, o) => { let x = o.pos.x - f.pos.x, z = o.pos.z - f.pos.z, l = Math.hypot(x, z); if (l < 0.3) { x = Math.sin(f.yaw); z = Math.cos(f.yaw); l = 1; } return [x / l, z / l]; };
  /* a frame of a fighter, for the meter */
  function cat(f) {
    const s = f.state;
    if (s === 'attack' && f.move) {
      const mv = f.move; if (mv.type === 'super') return 'ac';
      const t = f.moveT, ac = mv.ac + (f.acExt || 0);
      return t < mv.su ? 'su' : t < mv.su + ac ? 'ac' : 'rc';
    }
    if (s === 'grab') return 'ac';
    if (['hit', 'tumble', 'held', 'gbreak', 'down', 'getup', 'guardstun'].includes(s)) return 'stun';
    if (s === 'dodge' || s === 'ddash' || s === 'burst') return 'mv';
    return 'free';
  }
  /* an input that never presses anything (your own figure, while you record the dummy) */
  const NULL_IN = { move: { x: 0, y: 0 }, held: {}, edge: {}, at: {}, dirAt: {}, guardAt: {}, cpu: null, pad: null, pressed: () => false, take: () => false, peek: () => false, clear() { /* nothing */ } };
  const saved = () => { const s = U.read('kb.trainRec', null); return s && Array.isArray(s.s) && s.s.length ? s : null; };

  const Lab = {
    attach(M) {
      const T = M.training, P = U.read('kb.lab', {});
      if (T.inputs == null) T.inputs = P.inputs != null ? !!P.inputs : !U.touch;
      if (T.frames == null) T.frames = P.frames != null ? !!P.frames : !U.touch;
      const L = M.lab = { rows: [], rowsV: 0, sess: null, last: null, lastV: 0, rec: null, slot: saved(), noSlot: false };
      M.on((type, d) => {
        if (type === 'move' && d.f === Lab.you(M)) { const mv = KB.MOVES[d.id]; if (mv) { L.last = { name: mv.name, su: mv.su, ac: mv.ac, rc: mv.rc, type: mv.type }; L.lastV++; } }
        if (type === 'hit' && d.vic && M.fighters.includes(d.vic) && d.att && M.fighters.includes(d.att) && d.r !== 'miss') {
          const S = Lab.session(M);
          S.contact = { att: d.att.idx, block: d.r === 'blocked' || d.r === 'jguard' || d.r === 'gcrush', free: [null, null] }; S.adv = null;
        }
      });
      return L;
    },
    /* who you're playing: the dummy while you record it */
    you: M => M.fighters[M.lab && M.lab.rec ? 1 : 0],
    session(M) { const L = M.lab; if (!L.sess || L.sess.done) L.sess = { cells: [[], []], quiet: 0, done: false, contact: null, adv: null, v: 0 }; return L.sess; },
    reset(M) {
      const L = M.lab; if (!L) return; L.sess = null; L.rows.length = 0; L.rowsV++;
      const ai = M.ai[1]; if (ai && ai.play) { ai.play.i = 0; ai.play.el = 0; ai.play.wait = false; }
    },

    /* every frame of a plain Training fight (after the fighters move) */
    tick(M, dt) {
      const L = M.lab; if (!L) return;
      const T = M.training, F = M.fighters, n = Math.max(1, Math.round(dt * 60)), I = Input.players[0];
      // ---- the recording
      const R = L.rec;
      if (R) {
        const bits = bitsOf(I.held), mag = Math.hypot(I.move.x, I.move.y);
        if (!R.on && (bits || mag > 0.3)) { R.on = true; R.t = 0; }
        if (R.on && !M.cine) {
          const [fx, fz] = lineTo(F[1], F[0]), wx = I.move.x, wz = -I.move.y;
          R.s.push([Math.round(R.t * 1000), bits, Math.round((wx * fx + wz * fz) * 100), Math.round((wz * fx - wx * fz) * 100)]);
          R.t += dt; if (R.t >= MAX_REC) Lab.stopRec(M);
        }
      }
      // ---- Dummy: Playback loops the recording
      const ai = M.ai[1];
      if (ai && !L.rec) {
        if (T.dummy === 'play') {
          if (!ai.play && L.slot) ai.play = { s: L.slot.s, i: 0, el: 0, loop: true, wait: true };
          else if (!L.slot && !L.noSlot) { L.noSlot = true; M.call(F[0], 'RECORD FIRST (' + Lab.keyName('rec') + ')', 'bad'); }
        } else { L.noSlot = false; if (ai.play && ai.play.loop) Lab.stopPlay(M); }
      }
      // ---- the input history (yours: the buttons and stick you hold, whoever they drive)
      const mag = Math.hypot(I.move.x, I.move.y), dir = mag < 0.3 ? -1 : ((Math.round(Math.atan2(I.move.y, I.move.x) / (Math.PI / 4)) % 8) + 8) % 8;
      const bits = bitsOf(I.held), key = (dir + 1) * 1024 + bits, top = L.rows[0];
      if (top && top.key === key) top.n += n; else { L.rows.unshift({ key, dir, bits, n }); if (L.rows.length > 18) L.rows.pop(); L.rowsV++; }
      // ---- the frame meter
      if (M.phase !== 'fight' || M.cine) return;
      const c0 = cat(F[0]), c1 = cat(F[1]), busy = c0 !== 'free' || c1 !== 'free';
      if ((!L.sess || L.sess.done) && !busy) return;
      const S = Lab.session(M);
      // (a hit's hitstop doesn't count, as on a fighting game's own meter: each figure's frozen frames are left out; the
      // two freeze for as long, so the rows still line up)
      for (let k = 0; k < n; k++) { if (!F[0].stopped) S.cells[0].push(c0); if (!F[1].stopped) S.cells[1].push(c1); }
      for (const c of S.cells) if (c.length > 240) c.splice(0, c.length - 240);
      S.v++;
      // frame advantage: after the last hit or block, who can act first (and by how many frames)
      const C = S.contact;
      if (C && !S.adv) {
        for (let i = 0; i < 2; i++) if (C.free[i] == null && free(F[i])) C.free[i] = M.time;
        if (C.free[0] != null && C.free[1] != null) S.adv = { v: Math.round((C.free[1] - C.free[0]) * 60), att: C.att, block: C.block };
      }
      if (busy) S.quiet = 0;
      else { S.quiet += n; if (S.quiet >= 24) { S.done = true; for (const c of S.cells) c.length = Math.max(0, c.length - (S.quiet - 4)); } }
    },

    /* RECORD: you take the dummy (or, recording, stop and keep it) */
    record(M) {
      const L = M.lab; if (!L) return;
      if (L.rec) { Lab.stopRec(M); return; }
      Lab.stopPlay(M);
      const [p, d] = M.fighters;
      L.rec = { on: false, s: [], t: 0, orig: [p.input, d.input] };
      d.input = Input.players[0]; p.input = NULL_IN; Input.players[0].clear();
      M.call(d, 'YOU ARE THE DUMMY', 'buff'); SFX.play('ok');
    },
    stopRec(M) {
      const L = M.lab, R = L && L.rec; if (!R) return;
      L.rec = null; const [p, d] = M.fighters; p.input = R.orig[0]; d.input = R.orig[1]; Input.players[0].clear();
      // the stop button's own wait at the end isn't kept (up to a quarter second of nothing is)
      let k = R.s.length; while (k > 0 && !R.s[k - 1][1] && Math.hypot(R.s[k - 1][2], R.s[k - 1][3]) < 30) k--;
      const s = R.s.slice(0, Math.min(R.s.length, k + 15));
      if (!k) { M.call(p, 'NOTHING RECORDED', 'bad'); return; }
      L.slot = { line: d.build.core.line, s }; U.write('kb.trainRec', L.slot);
      M.call(p, 'RECORDED ' + (s[s.length - 1][0] / 1000).toFixed(1) + ' s', 'buff'); SFX.play('ok');
    },
    /* PLAY: the dummy does the recording once (again: stop it) */
    play(M) {
      const L = M.lab, ai = M.ai[1]; if (!L || !ai) return;
      if (L.rec) Lab.stopRec(M);
      if (ai.play && !ai.play.loop) { Lab.stopPlay(M); return; }
      if (!L.slot) { M.call(M.fighters[0], 'RECORD FIRST (' + Lab.keyName('rec') + ')', 'bad'); return; }
      ai.play = { s: L.slot.s, i: 0, el: 0, loop: false, wait: false };
    },
    stopPlay(M) { const ai = M.ai[1]; if (ai && ai.play) { ai.play = null; ai.stop(); for (const a of Input.ACTIONS) ai.held[a] = false; } },
    keyName: k => k === 'rec' ? 'Y' : 'U',

    /* ------------------------------------------------------------- the HUD */
    build(refs) {
      refs.inh = U.el('div', { class: 'inhist' });
      refs.fm = U.el('div', { class: 'fmeter' },
        refs.fmc = U.el('canvas', { width: 720, height: 46 }),
        U.el('div', { class: 'fmrow' }, refs.fmMove = U.el('span', { class: 'fmmove' }), refs.fmAdv = U.el('b', { class: 'fmadv' })),
        U.el('div', { class: 'fmkey' }, ...[['su', 'STARTUP'], ['ac', 'ACTIVE'], ['rc', 'RECOVERY'], ['stun', 'HIT / BLOCK STUN'], ['mv', 'DODGE']].map(([c, t]) => U.el('span', null, U.el('i', { class: 'c-' + c }), t))));
      refs.recb = U.el('div', { class: 'recbadge' });
      return [refs.inh, refs.fm, refs.recb];
    },
    COL: { free: '#2a2438', su: '#3ddc84', ac: '#ff4a6a', rc: '#3a8cff', stun: '#ffd23f', mv: '#b07cff' },
    draw(M, refs) {
      const L = M.lab, T = M.training; if (!L || !refs.inh) return;
      // inputs
      refs.inh.hidden = !T.inputs;
      if (T.inputs) {
        if (refs.inhV !== L.rowsV) {
          refs.inhV = L.rowsV; refs.inh.innerHTML = '';
          for (const r of L.rows.slice(0, 14)) {
            const btns = Input.ACTIONS.filter((a, k) => r.bits & (1 << k));
            refs.inh.append(U.el('div', { class: 'ihrow' }, U.el('small', null, r.n > 99 ? '99+' : String(r.n)), U.el('b', { class: 'iharr' }, r.dir < 0 ? '·' : ARROW[r.dir]), ...btns.map(a => U.el('i', { class: 'ib-' + a }, TAG[a]))));
          }
          refs.inhTop = refs.inh.firstChild && refs.inh.firstChild.firstChild;
        } else if (refs.inhTop && L.rows[0]) { const t = L.rows[0].n > 99 ? '99+' : String(L.rows[0].n); if (refs.inhTop.textContent !== t) refs.inhTop.textContent = t; }
      }
      // the frame meter
      refs.fm.hidden = !T.frames;
      const S = L.sess;
      if (T.frames && S && refs.fmV !== S.v) {
        refs.fmV = S.v; const c = refs.fmc, g = c.getContext('2d'), w = c.width / VIS, h = 19;
        g.clearRect(0, 0, c.width, c.height);
        const from = Math.max(0, Math.max(S.cells[0].length, S.cells[1].length) - VIS);
        for (let r = 0; r < 2; r++) {
          const cells = S.cells[r];
          for (let k = 0; k < VIS; k++) { const v = cells[from + k]; g.fillStyle = v ? Lab.COL[v] : '#15111f'; g.fillRect(k * w + 0.5, r * (h + 6) + 1, w - 1, h); }
        }
      }
      if (T.frames && refs.fmLV !== L.lastV + ':' + (S ? S.v : 0)) {
        refs.fmLV = L.lastV + ':' + (S ? S.v : 0);
        // a move's frames at 60 a second: STARTUP is the frame it first hits on (as fighting games count it), then
        // how many frames it can hit for, then the frames before you can act again
        // (counted the way a move's clock runs, a 60th at a time, so it says what the meter shows)
        const m = L.last, f = x => { let t = 0, k = 0; while (t < x && k < 900) { t += 1 / 60; k++; } return k; };
        const s0 = m && f(m.su), a0 = m && f(m.su + m.ac), e0 = m && f(m.su + m.ac + m.rc);
        refs.fmMove.textContent = m ? m.name.toUpperCase() + '   STARTUP ' + (s0 + 1) + ' · ACTIVE ' + (a0 > s0 ? a0 - s0 : '—') + ' · RECOVERY ' + (e0 - a0) : 'DO A MOVE: ITS FRAMES SHOW HERE';
        const A = S && S.adv;
        let t = '', cls = 'fmadv';
        if (A) {
          const v = A.v, sv = (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
          t = A.att === 0 ? (A.block ? 'ON BLOCK ' : 'ON HIT ') + sv : (A.block ? 'YOU BLOCKED · YOU ' : 'YOU GOT HIT · YOU ') + sv;
          cls += v > 0 ? ' plus' : v < 0 ? ' minus' : '';
        } else if (S && S.done && !S.contact) t = 'WHIFF';
        if (refs.fmAdv.textContent !== t) refs.fmAdv.textContent = t; refs.fmAdv.className = cls;
      }
      // recording / playing
      const ai = M.ai[1], R = L.rec;
      const badge = R ? (R.on ? '● REC  ' + R.t.toFixed(1) + ' / ' + MAX_REC + ' s  ·  ' + Lab.keyName('rec') + ' to stop' : '● REC  you are the dummy · waiting for your first input')
        : ai && ai.play ? (ai.play.loop ? '▶ PLAYBACK (loop)' : '▶ PLAYBACK  ·  ' + Lab.keyName('play') + ' to stop') : '';
      if (refs.recb.textContent !== badge) { refs.recb.textContent = badge; refs.recb.className = 'recbadge' + (R ? ' rec' : badge ? ' play' : ''); }
    },
  };
  window.Lab = Lab;
})();
