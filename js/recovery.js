/* recovery.js -- THE ↑ SPECIAL: every figure's own way back to the stage.

   ↑ + Special (the "dp" slot of a head's command Specials) is a RECOVERY. In the air it's free once per airtime (it
   comes back when you land or catch a ledge) and you're HELPLESS after it until you land or catch a ledge; on the
   ground it costs a use like any other Special. Each move carries a rec = { k: kind, ...numbers } read here:

     rise     up (and forward, vx), the stick steering a little; a hit as it starts. Its options are what make one
              figure's different from the next: aimed (the whole jump goes the way you point), beat (higher on the
              beat), pctV (higher the more damage you've taken), cost (it costs you %), fuse (a wait first),
              blast (an explosion behind it), shot (a shot fired down), catch (shots caught), empower (the next hit
              hits harder), apex (a second hit at the top), hop (a second jump off whoever it hits), spring (a
              bounce off the stage's side or a wall), back (a backflip), groundAct (something left on the floor)
     dash     a straight line in the stick's direction (any of 8), legs: more than one cut, each re-aimed
     warp     gone, and back d metres the stick's way
     zap      there in an instant, hitting anything on the way
     tether   a line to: the ledge (reeled in, or a swing), the stage top (hauled onto it), or the opponent; a hook is
              a short one; a miss is a little hop
     home     pulled in toward the stage on a line from above
     wallrun  up the stage's side (or a wall) to the ledge; away from one, a backflip
     glide    up, then a long glide forward; float: a slow drift down
     fly      free flight the stick's way; up: always rising (a bubble)
     burst    n pushes, each re-aimed, each one a hit
     ascend   a steady climb
     thrust   jets steered by the stick (held: only while Special is held)
     pillar   a stone column under you that you can stand on for a few seconds
     loop     a crescent path, up, back and over
     spin     a hovering spin, drifting with the stick
     charge   hold Special to jump higher
     step     a jump off something that then falls on whoever is below

   On the way down any of them catches a ledge it passes; one that lands on the stage ends there. A CPU aims them at
   the nearer ledge. Everything a recovery keeps lives on the fighter or the match, so an online rollback saves it. */
(function () {
  'use strict';
  const { PARTS: P, mv } = KB, V3 = THREE.Vector3, FP = Fighter.prototype, BODY = Fighter.BODY, ZERO = 0.0001;
  const _a = new V3(), _b = new V3(), _c = new V3();

  /* ------------------------------------------------------------ the engine */
  FP.recBegin = function (m) {
    const r = m.rec || { k: 'rise', v: 15.5 };
    this.rec = { r, n: 0, g: undefined, end: m.su + (r.t != null ? r.t : m.ac + 0.1), air: false, ch: 0 };
  };
  FP.recClear = function () {
    const c = this.rec; this.rec = null;
    rigHide(this);
    if (c && c.hid) this.obj.visible = !this.invisOn;
  };
  const isAI = f => !!(f.input.cpu && f.input.cpu.f === f);
  /* where a CPU aims: the nearer ledge, from just above it */
  FP.recGoal = function () { const St = this.m.arena.stage, s = this.pos.x >= 0 ? 1 : -1; return { x: s * (St.W - 0.8), y: St.top + 1.4 }; };
  /* the way the recovery goes: the stick (straight up with it at rest); a CPU off the stage, at the ledge */
  FP.recAim = function () {
    const s = this.input.move, c = this.confT > 0 ? -1 : 1; let x = s.x * c, y = s.y * c;
    if (isAI(this)) { if (Platform.offStage(this)) { const g = this.recGoal(); x = g.x - this.pos.x; y = g.y - this.pos.y; } else { x = 0; y = 1; } }
    else if (Math.hypot(x, y) < 0.45) { x = 0; y = 1; }
    const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l };
  };
  FP.recSteer = function (dt, sp, k) { const d = this.stick(); if (d) this.vel.x = U.smooth(this.vel.x, d.x * sp, k || 5, dt); };
  /* a hit of its own (a second strike, an explosion, the anchor coming down): once per move unless again is set */
  FP.recHit = function (id, at, rad, again) {
    const o = this.opp, m2 = KB.MOVES[id]; if (!o || !m2) return false;
    const key = 'rec:' + id + (again ? ':' + again : ''); if (this.hitSet.has(key)) return false;
    this.m.hitMinions(this, at, rad, this.moveSerial * 10 + 7);
    const hb = [{ x0: at.x - rad, x1: at.x + rad, y0: at.y - rad, y1: at.y + rad }]; Combat.note(this, hb, 'hit', 0.15);
    if (!Combat.touch(hb, o) || Combat.lying(o)) return false;
    this.hitSet.add(key);
    Combat.hit(this, o, m2, { kind: 'special', at: at.clone(), dir: _b.set(o.pos.x - this.pos.x || this.forward.x, 0, 0).normalize().clone() });
    return true;
  };
  const boom = (p, col, r) => { if (U.quiet) return; FX.burst(p, { n: 22, color: [col, 0xffffff, 0x5a5a60], glow: true, speed: 5, size: 0.13, gravity: -1, life: 0.5 }); FX.ring(p, { r1: r || 1.6, life: 0.3, color: col }); FX.addShake(0.15); SFX.play('boom'); };
  const puff = (p, col, n) => { if (!U.quiet) FX.burst(p, { n: n || 14, color: [col, 0xffffff], speed: 3, size: 0.12, gravity: -1, life: 0.5 }); };
  /* a line from the hand: a rope, a chain, a cable, a vine (with what's on the end of it) */
  FP.ropeDraw = function (to, col, from) {
    if (U.quiet) return;
    const r = rig(this, 'rope', () => new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), new THREE.MeshLambertMaterial({ color: 0xb08a5a })));
    const a = from || (this.fig.detached.armR ? _a.copy(this.pos).setY(this.pos.y + 1.3) : this.fig.socket('wR', [0, 0, 2])), d = a.distanceTo(to);
    r.position.copy(a).lerp(to, 0.5); r.lookAt(to); r.scale.set(1, 1, Math.max(0.01, d)); r.material.color.setHex(col || 0xb08a5a);
    const tk = this.move && TIPS[this.move.id];
    if (tk) { const tp = rig(this, 'tip:' + tk, TIP_MAKE[tk]); tp.position.copy(to); tp.lookAt(_b.copy(to).add(_c.subVectors(to, a))); }
  };
  FP.ropeHide = function () { const o = VIS.get(this); if (o) for (const k in o) if (k === 'rope' || k.startsWith('tip:')) o[k].visible = false; };
  /* a tether's target: { p: where it pulls you, ledge: the side to hang from } or null */
  FP.recTarget = function (r) {
    const St = this.m.arena.stage, o = this.opp; let hand = _c.set(this.pos.x, this.pos.y + 1.3, 0); const on = !Platform.offStage(this);
    if (r.to === 'foe') { const p = o && !['out', 'ko'].includes(o.state) && !o.gone ? new V3(o.pos.x, o.pos.y + 0.9, 0) : null; if (p && p.distanceTo(hand) <= r.range) return { p, foe: true }; if (!r.alt) return null; r = { to: r.alt, range: r.altRange || r.range }; }
    if (on) return null;
    const side = this.pos.x >= 0 ? 1 : -1;
    if (r.to === 'top') { const p = new V3(side * (St.W - 1.1), St.top, 0); return p.distanceTo(hand) <= r.range && this.pos.y < St.top + 3 ? { p, top: true } : null; }
    if (o && o.state === 'ledge' && o.ledgeSide === side) return null;   // (someone's on it)
    const L = _a.set(side * St.W, St.top, 0);
    if (L.distanceTo(hand) > r.range || this.pos.y > St.top + 2.5 || side * this.pos.x < St.W - 0.3) return null;
    return { p: new V3(side * (St.W + 0.3), St.top - 1.5, 0), ledge: side, anchor: L.clone() };
  };
  /* arrived at a ledge (a tether, a wall run): hang on it */
  FP.recLedge = function () {
    this.vel.set(0, 0, 0); this.ledgeCd = 0;
    if (Platform.ledge(this)) return true;
    this.vel.y = 6; return false;   // (taken, or no arms to hang on with: a hop)
  };
  /* is it worth using now (the CPU asks): a tether needs something in reach */
  FP.recUseful = function () {
    const id = this.st.cmd && this.st.cmd.dp, m = id && KB.MOVES[id], r = m && m.rec; if (!r) return true;
    if (r.k === 'tether' && !r.hook) return !!this.recTarget(r) || this.pos.y < this.m.arena.stage.top - 3.5;
    return true;
  };

  /* before the physics: the recovery's own motion. True: the frame is done (it moved the figure itself) */
  FP.recMove = function (m, t0, t, su, ac, dt) {
    const c = this.rec, r = c.r, St = this.m.arena.stage, I = this.input, fx = this.forward.x >= 0 ? 1 : -1, start = t0 < su && t >= su, ai = isAI(this);
    c.g = undefined;
    if (t >= su && !this.grounded) c.air = true;
    if (start && m.buffAt) this.addBuff(m.buffAt);
    if (m.buffAfter && t0 < su + ac && t >= su + ac) this.addBuff(m.buffAfter);
    switch (r.k) {
      case 'charge': {
        // CLEAN AND JERK: Special held, he sets himself (and sinks a little); let go, or full, and up
        if (t < su && c.ch < r.max && (I.held.special || (ai && c.ch < r.max * 0.8)) && t >= su * 0.5) {
          c.ch += dt; this.moveT = Math.min(this.moveT, su * 0.9); this.flash = 0.25; this.flashCol = c.ch >= r.max - 0.02 ? 0xff4020 : 0xffb030;
          this.vel.x *= 0.9; this.vel.y = Math.max(this.vel.y, -2.5); this.physics(dt, 0, 0, 10); return true;
        }
        if (start) {
          const k = Math.min(1, c.ch / r.max); this.vel.y = Math.max(this.vel.y, r.v0 + (r.v1 - r.v0) * k); this.grounded = false;
          if (k > 0.95) { this.m.call(this, r.call || 'FULL LIFT!', 'buff'); boom(_a.copy(this.pos).setY(this.pos.y + 0.2), 0xffd060, 1.2); }
        }
        this.recSteer(dt, r.steer || 3.5); break;
      }
      case 'rise': {
        if (t < su) { if (r.fuse && !this.grounded) { this.vel.x *= 0.9; this.vel.y = Math.max(this.vel.y * 0.85, -1.5); } if (r.fuse && !U.quiet && U.vrand() < 0.5) FX.burst(_a.copy(this.pos).setY(this.pos.y + 0.3), { n: 1, color: [0xffd060, 0xff6a1a], glow: true, speed: 2, size: 0.06, gravity: -2, life: 0.3 }); break; }
        if (start) {
          let v = r.v || 15.5;
          if (r.beat && Music.beat(this.m).near) { v *= r.beat; this.m.call(this, 'ON THE BEAT!', 'buff'); if (!U.quiet) for (let i = 0; i < 2; i++) FX.ring(_a.copy(this.pos).setY(this.pos.y + 0.3 + i * 0.5), { r1: 1.2 + i * 0.4, life: 0.35, color: 0xfff27a }); }
          if (r.pctV) { const add = Math.min(r.pctV[1], this.pct * r.pctV[0]); v += add; if (add > r.pctV[1] * 0.6) this.m.call(this, 'NOTHING LEFT TO LOSE', 'buff'); }
          if (r.cost) { this.pct += r.cost; this.m.call(this, '+' + r.cost + '%', 'bad'); }
          if (r.aimed) { const a = this.recAim(); this.vel.x = a.x * v; this.vel.y = a.y * v; if (a.x) this.faceX(a.x); }
          else { this.vel.y = Math.max(this.vel.y, v); this.vel.x = this.vel.x * 0.3 + fx * ((r.vx || 0) - (r.back || 0)); }
          this.grounded = false;
          if (r.blast) { const a = r.aimed ? _b.set(-this.vel.x, -this.vel.y, 0).normalize() : _b.set(0, -1, 0), p = _a.copy(this.pos).setY(this.pos.y + 0.8).addScaledVector(a, 1.1); boom(p, r.blastCol || 0xffa040, r.blastR); this.recHit(r.blast, p, r.blastR || 1.5); }
          if (r.shot) this.m.fire(this, KB.MOVES[r.shot], 0);
          if (r.catch) this.addBuff({ id: 'catch', t: r.catch });
          if (r.groundAct && t0 < su && this.moveGround) KB.EXT.ACTS[r.groundAct](this.m, this);
        }
        if (!r.aimed && t < su + ac + 0.1) this.vel.y = Math.max(this.vel.y, r.hold != null ? r.hold : 4);
        this.recSteer(dt, r.steer || 4);
        // a second blow at the top of it (a dunk, a hind-leg kick, the lance point down)
        if (r.apex && !c.n && t > su + 0.1 && this.vel.y < 2) {
          c.n = 1; const p = _a.set(this.pos.x + fx * r.apexAt[0], this.pos.y + r.apexAt[1], 0);
          this.recHit(r.apex, p, r.apexR || 1.1); if (!U.quiet) { FX.ring(p, { r1: 1.1, life: 0.25, color: r.apexCol || 0xffffff }); SFX.play('heavy'); }
          if (r.apexHang) this.vel.y = Math.max(this.vel.y, r.apexHang);
        }
        // off them for a second jump
        if (r.hop && this.moveHit && !c.n) { c.n = 1; this.vel.y = Math.max(this.vel.y, r.hop); this.m.call(this, r.hopCall || 'STEPPING STONE', 'small'); puff(_a.copy(this.pos).setY(this.pos.y + 0.2), 0xd8c8a0, 8); }
        break;
      }
      case 'dash': {
        if (t < su) { c.g = 6; this.vel.x *= 0.85; this.vel.y = Math.max(this.vel.y * 0.7, -2); break; }
        const L = r.legs || 1, per = r.dt + (r.gap || 0), i = Math.min(L - 1, Math.floor((t - su) / per)), into = t - su - i * per;
        if (i >= c.n) { c.n = i + 1; c.aim = this.recAim(); if (c.aim.x) this.faceX(c.aim.x); this.hitSet.clear(); puff(_a.copy(this.pos).setY(this.pos.y + 0.9), r.col || 0xffffff, 8); if (i > 0) SFX.play('whoosh'); }
        if (into < r.dt) { this.vel.x = c.aim.x * r.sp; this.vel.y = c.aim.y * r.sp; c.g = ZERO; if (!U.quiet && U.vrand() < 0.6) FX.burst(_a.copy(this.pos).setY(this.pos.y + 0.9), { n: 1, color: r.col || 0xffffff, speed: 0.5, size: 0.1, gravity: 0, life: 0.25 }); }
        else if (c.kept !== i) { c.kept = i; this.vel.x *= r.keep; this.vel.y *= r.keep; }
        break;
      }
      case 'warp': {
        if (start) { c.hid = true; this.obj.visible = false; puff(_a.copy(this.pos).setY(this.pos.y + 0.9), r.col || 0x5a5a62, 26); SFX.play('boom'); this.inv = Math.max(this.inv, r.t + 0.12); }
        if (t >= su && t0 < su + r.t) {
          this.vel.set(0, 0, 0); c.g = ZERO;
          if (t >= su + r.t) {
            const a = this.recAim(), B = St.blast; this.pos.x = U.clamp(this.pos.x + a.x * r.d, -B.x + 1.5, B.x - 1.5); this.pos.y = U.clamp(this.pos.y + a.y * r.d, B.bot + 1.5, B.top - 2);
            if (Math.abs(this.pos.x) < St.W + BODY && this.pos.y < St.top && this.pos.y > St.bot - 1.7) this.pos.y = St.top;
            if (a.x) this.faceX(a.x); c.hid = false; this.obj.visible = !this.invisOn; this.vel.set(a.x * 3, a.y * 3, 0);
            puff(_a.copy(this.pos).setY(this.pos.y + 0.9), r.col || 0x5a5a62, 20); SFX.play('dodge');
            if (r.arrive) this.recHit(r.arrive, _a.copy(this.pos).setY(this.pos.y + 0.9), r.arriveR || 1.4);
            if (r.invis) this.addBuff({ id: 'invis', t: r.invis });
          }
          return this.physics(dt, 0, 0, ZERO), true;
        }
        break;
      }
      case 'zap': {
        if (start) {
          const a = this.recAim(), B = St.blast, from = this.pos.clone();
          let d = r.d; if (Math.abs(from.x) < St.W + BODY && from.y < St.top - 0.05 && a.y > 0) d = Math.min(d, Math.max(0, (St.bot - 1.75 - from.y) / a.y));   // (under the stage: as far as its underside)
          this.pos.x = U.clamp(from.x + a.x * d, -B.x + 1.5, B.x - 1.5); this.pos.y = U.clamp(from.y + a.y * d, B.bot + 1.5, B.top - 2);
          if (Math.abs(this.pos.x) < St.W + BODY && this.pos.y < St.top && this.pos.y > St.bot - 1.7) this.pos.y = St.top;
          if (a.x) this.faceX(a.x); this.grounded = false; this.vel.set(a.x * 4, a.y * 6, 0);
          if (!U.quiet) { const v = vstate(this); v.bolt = { from: from.clone().setY(from.y + 1), to: this.pos.clone().setY(this.pos.y + 1), t: this.m.time }; }
          for (let i = 0; i <= 6; i++) {
            const p = _c.copy(from).lerp(this.pos, i / 6).setY(from.y + (this.pos.y - from.y) * i / 6 + 0.9);
            this.recHit(r.path, p, 1.0); if (!U.quiet) FX.burst(p, { n: 3, color: [0xbfe8ff, 0xffffff, 0x7ad8ff], glow: true, speed: 2.5, size: 0.08, gravity: 0, life: 0.35 });
          }
          if (!U.quiet) { SFX.play('jguard'); FX.addShake(0.12); }
        }
        break;
      }
      case 'tether': case 'home': {
        if (t < su) { if (!this.grounded) { this.vel.x *= 0.9; this.vel.y = Math.max(this.vel.y, -3); } break; }
        if (start) {
          c.tg = r.k === 'home' ? { p: new V3(), home: true } : this.recTarget(r);
          const o = this.opp;
          if (r.foeHit && o && !['out', 'ko'].includes(o.state) && !o.gone) {   // (IRON CABLE: they're nearer than the ledge, so it takes them instead)
            const p = new V3(o.pos.x, o.pos.y + 0.9, 0), d = p.distanceTo(_c.set(this.pos.x, this.pos.y + 1.3, 0));
            if (d <= r.range && (!c.tg || d < c.tg.p.distanceTo(this.pos))) { c.tg = null; c.miss = p; this.recHit(r.foeHit, p, 1.2); this.vel.y = Math.max(this.vel.y, r.miss || 7); this.grounded = false; this.faceX(p.x - this.pos.x); }
          }
          if (!c.tg) { if (!c.miss) {
            // a miss: the line goes out the way you point and comes back, and you get a little hop
            const a = this.recAim(); c.miss = new V3(this.pos.x + a.x * r.range * 0.8, this.pos.y + 1.3 + a.y * r.range * 0.8, 0);
            this.vel.y = Math.max(this.vel.y, r.hook ? r.v || 13 : r.miss || 7); this.grounded = false; if (a.x) this.faceX(a.x);
            if (o && r.whip) for (let i = 1; i <= 4; i++) this.recHit(r.whip, _a.copy(this.pos).setY(this.pos.y + 1.3).lerp(c.miss, i / 4), 0.8);
          } } else {
            c.from = this.pos.clone(); c.s = 0; c.pull = true; this.grounded = false;
            if (!c.tg.home) this.faceX(c.tg.p.x - this.pos.x); else this.faceX(-Math.sign(this.pos.x) || 1);
            c.len = c.from.distanceTo(c.tg.p); if (!U.quiet) SFX.play(r.sfx || 'whoosh');
          }
        }
        if (c.miss) { if (t < su + 0.25) this.ropeDraw(_b.copy(this.pos).setY(this.pos.y + 1.3).lerp(c.miss, Math.sin(Math.min(1, (t - su) / 0.25) * Math.PI)), r.col); else this.ropeHide(); break; }
        if (!c.pull) break;
        if (c.tg.home) {
          // LIFELINE: a line from above (the ship, over the stage) pulls her in
          const g = this.recGoal(); c.tg.p.set(g.x, g.y, 0);
          const d = _a.subVectors(c.tg.p, this.pos); d.z = 0; const l = d.length();
          if (t >= su + r.t || l < 0.5) { c.pull = false; this.vel.multiplyScalar(0.3); this.vel.y = Math.max(this.vel.y, 3); this.ropeHide(); break; }
          d.multiplyScalar(1 / (l || 1)); this.vel.x = U.smooth(this.vel.x, d.x * r.sp, 8, dt); this.vel.y = U.smooth(this.vel.y, d.y * r.sp, 8, dt); c.g = ZERO;
          this.ropeDraw(_b.set(g.x * 0.6, St.top + 9, 0), r.col, _c.copy(this.pos).setY(this.pos.y + 1.6));
          break;
        }
        // reeled in along the line (a swing sags below it on the way)
        const T = c.tg.p, anchor = c.tg.anchor || T; c.s = Math.min(1, c.s + r.sp * dt / Math.max(0.5, c.len));
        const s = c.s, sag = r.swing ? r.swing * Math.sin(s * Math.PI) : 0;
        const nx = c.from.x + (T.x - c.from.x) * s, ny = c.from.y + (T.y - c.from.y) * s - sag;
        this.vel.set((nx - this.pos.x) / dt, (ny - this.pos.y) / dt, 0); c.g = ZERO;
        this.ropeDraw(anchor, r.col);
        if (s >= 1) {
          c.pull = false; this.pos.set(T.x, T.y, 0); this.ropeHide();
          if (c.tg.ledge) { if (this.recLedge()) return true; }
          else if (c.tg.top) { this.pos.y = St.top; this.vel.set(0, 0, 0); this.grounded = true; if (r.arrive) { boom(_a.copy(this.pos).setY(0.3), 0xb8b0a0, 1.6); this.recHit(r.arrive, _a.copy(this.pos).setY(this.pos.y + 0.7), r.arriveR || 1.6); } }
          else if (c.tg.foe) { this.vel.set(-fx * 2, 7, 0); if (r.arrive) this.recHit(r.arrive, _a.copy(this.pos).setY(this.pos.y + 0.9), 1.3); }
          return this.physics(dt, 0, 0, ZERO), true;
        }
        this.physics(dt, 0, 0, ZERO); return true;
      }
      case 'wallrun': {
        if (start) {
          const side = this.pos.x >= 0 ? 1 : -1, ax = side * this.pos.x, w = this.wallTouch;
          if (!this.grounded && ax > St.W - 0.1 && ax < St.W + 3.0 && this.pos.y < St.top - 0.4 && this.pos.y > St.bot - 4) { c.run = side; this.pos.x = side * (St.W + BODY); this.faceX(-side); }
          else if (w && w.axis === 'x') { c.wall = w; this.faceX(-w.sign); }
          else { this.vel.y = Math.max(this.vel.y, r.v); this.vel.x = -fx * (r.back || 0); this.grounded = false; c.flip = true; }
        }
        if (c.run && t >= su) {
          this.pos.x = c.run * (St.W + BODY); this.vel.set(0, r.sp, 0); c.g = ZERO;
          if (!U.quiet && U.vrand() < 0.5) FX.burst(_a.set(c.run * St.W, this.pos.y + 0.1, 0), { n: 2, color: this.m.arena.dust, speed: 1.5, size: 0.07, life: 0.3 });
          if (this.pos.y >= St.top - 1.5) { const sd = c.run; c.run = 0; this.pos.set(sd * (St.W + 0.3), St.top - 1.5, 0); if (this.recLedge()) return true; }
          else if (t >= su + r.t) { c.run = 0; this.vel.set(0, 6, 0); }
        } else if (c.wall && t >= su) {
          if (t < su + r.t) { this.vel.set(0, r.sp, 0); c.g = ZERO; }
          else { this.vel.set(-c.wall.sign * 7, 10, 0); this.faceX(-c.wall.sign); c.wall = null; puff(_a.copy(this.pos).setY(this.pos.y + 0.3), 0xffffff, 8); }
        }
        if (c.flip) this.recSteer(dt, 4);
        break;
      }
      case 'glide': case 'float': {
        if (start) { this.vel.y = Math.max(this.vel.y, r.v); this.grounded = false; }
        if (t < su) break;
        if (!c.ph && this.vel.y < 0.5) c.ph = 1;
        if (c.ph) {
          c.g = r.g; this.vel.y = Math.max(this.vel.y, -r.fall);
          const d = this.stick();
          if (r.k === 'glide') { const x = d ? d.x : fx; this.vel.x = U.smooth(this.vel.x, x * r.vx, 2.2, dt); if (d) this.faceX(d.x); }
          else this.recSteer(dt, r.vx, 3);
          if (!U.quiet && U.vrand() < 0.3) FX.burst(_a.copy(this.pos).setY(this.pos.y + (r.k === 'float' ? 2.1 : 1.9)), { n: 1, color: [r.col || 0xffffff], glow: r.k === 'float', speed: 0.4, size: 0.08, gravity: r.k === 'float' ? -1 : 2, life: 0.4 });
          if (this.stickY() < -0.7) c.ph = 2, this.rec.end = Math.min(this.rec.end, t);   // (↓: let go, fall)
        } else this.recSteer(dt, 4);
        break;
      }
      case 'fly': case 'ascend': case 'spin': {
        if (t < su) break;
        if (start) { this.grounded = false; if (r.v) this.vel.y = Math.max(this.vel.y, r.v); }
        if (t < su + r.t) {
          if (r.k === 'fly') {
            const a = this.recAim(), still = !isAI(this) && Math.hypot(this.input.move.x, this.input.move.y) < 0.45;
            const tx = still ? 0 : a.x * r.sp, ty = r.up != null ? r.up : still ? r.sp * 0.45 : a.y * r.sp;
            this.vel.x = U.smooth(this.vel.x, tx, 5, dt); this.vel.y = U.smooth(this.vel.y, ty, 5, dt); c.g = ZERO; if (a.x && !still) this.faceX(a.x);
            if (r.ghost) this.inv = Math.max(this.inv, 0.05);
          } else if (r.k === 'ascend') { this.vel.y = r.vy; this.recSteer(dt, r.sp || 2, 4); c.g = ZERO; }
          else { c.g = r.g; if (r.vy != null) this.vel.y = U.smooth(this.vel.y, r.vy, 6, dt); else this.vel.y = Math.max(this.vel.y, r.minVy); this.recSteer(dt, r.sp, 4); }
          if (!U.quiet && U.vrand() < 0.45) FX.burst(_a.copy(this.pos).setY(this.pos.y + U.vrnd(0.2, 1.6)), { n: 1, color: [r.col || 0xffffff, 0xffffff], glow: !!r.glow, speed: 1.2, size: 0.09, gravity: r.k === 'ascend' ? -4 : 0, life: 0.4 });
        } else if (r.endHit && !c.n) {
          c.n = 1; const p = _a.copy(this.pos).setY(this.pos.y + (r.endAt || 1)); this.recHit(r.endHit, p, r.endR || 1.3);
          if (!U.quiet) { FX.ring(p, { r1: r.endR || 1.3, life: 0.3, color: r.col || 0xffffff }); FX.burst(p, { n: 14, color: [r.col || 0xffffff, 0xffffff], speed: 3, size: 0.1, gravity: -1, life: 0.45 }); SFX.play(r.endSfx || 'whoosh'); }
        }
        break;
      }
      case 'burst': {
        if (t < su) break;
        const i = Math.min(r.n - 1, Math.floor((t - su) / r.gap));
        if (i >= c.n) {
          c.n = i + 1; const a = this.recAim(); this.vel.x = a.x * r.sp; this.vel.y = Math.max(a.y * r.sp, r.minUp != null ? r.minUp : -4); this.grounded = false; if (a.x) this.faceX(a.x);
          const p = _a.copy(this.pos).setY(this.pos.y + 0.7); this.recHit(r.hit, p, r.hitR || 1.3, i + 1);
          if (r.boom) boom(_b.copy(this.pos).setY(this.pos.y + 0.4).addScaledVector(_c.set(-a.x, -a.y, 0), 0.6), r.col, 1.3);
          else if (!U.quiet) { FX.ring(_b.copy(this.pos).setY(this.pos.y + 0.2), { r1: 1.0, life: 0.22, color: r.col || 0xffffff }); SFX.play('whoosh'); }
        }
        break;
      }
      case 'thrust': {
        if (t < su) break;
        if (start) this.grounded = false;
        const on = t < su + r.t && !c.off && (!r.held || I.held.special || ai);
        if (!on && !c.off) { c.off = true; this.rec.end = Math.min(this.rec.end, t + 0.05); }
        if (on) {
          if (r.held) { this.vel.y = U.smooth(this.vel.y, r.vy, 9, dt); this.recSteer(dt, r.sp || 4); c.g = ZERO; }
          else { const a = this.recAim(); this.vel.x += a.x * r.acc * dt; this.vel.y += a.y * r.acc * dt; const l = Math.hypot(this.vel.x, this.vel.y); if (l > r.max) { this.vel.x *= r.max / l; this.vel.y *= r.max / l; } if (a.x) this.faceX(a.x); c.g = ZERO; }
          if (!U.quiet) FX.burst(_a.copy(this.pos).setY(this.pos.y + 0.1), { n: 2, color: r.cols || [0xffa040, 0xff5a1a, 0xffe080], glow: !r.held, speed: 2.5, size: 0.11, gravity: r.held ? 8 : -1, life: 0.35, up: -1 });
          if (r.under) this.recHit(r.under, _b.copy(this.pos).setY(this.pos.y - 0.4), 1.0, 1 + Math.floor((t - su) / 0.2));
        }
        break;
      }
      case 'pillar': {
        if (start) {
          const B = this.m.tplats || (this.m.tplats = []), side = this.pos.x >= 0 ? 1 : -1, w = r.w || 1.6, top = this.pos.y + r.lift;
          let x = this.pos.x; const ax = side * x;
          if (!(ax < St.W && this.pos.y < St.top - 0.05)) {
            if (ax > St.W - w / 2 && ax < St.W + w / 2 && this.pos.y < St.top - 0.05) x = side * (St.W + w / 2);   // (right by the stage: it rises against its side)
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1, 1.4), new THREE.MeshLambertMaterial({ color: r.col || 0x8a7a5a }));
            const h = top - (St.bot - 2); mesh.scale.y = h; mesh.position.set(x, top - h / 2, 0); mesh.castShadow = mesh.receiveShadow = true; this.m.scene.add(mesh);
            mesh.scale.y = 0.01; B.push({ x1: x - w / 2, x2: x + w / 2, y: top, temp: true, till: this.m.time + r.life, mesh, by: this.idx, born: this.m.time, h });
            this.recHit(r.hit, _a.set(x, top + 0.4, 0), 1.2);
            if (!U.quiet) { SFX.play('heavy'); FX.addShake(0.18); FX.burst(_a.set(x, top, 0), { n: 18, color: [r.col || 0x8a7a5a, 0xc8b898], speed: 4, size: 0.12, gravity: 14, life: 0.6 }); }
          }
          this.vel.y = Math.max(this.vel.y, r.v); this.grounded = false;
        }
        if (t >= su) this.recSteer(dt, 3.5);
        break;
      }
      case 'loop': {
        if (start) { c.from = this.pos.clone(); const d = this.stick(); c.dir = d ? Math.sign(d.x) : fx; if (isAI(this) && Platform.offStage(this)) c.dir = this.pos.x > 0 ? -1 : 1; this.faceX(c.dir); this.grounded = false; }
        if (t >= su && t < su + r.t) {
          const s = (t - su) / r.t, u = 1 - s, F = c.from, d = c.dir;
          // a crescent: up and back a little first, then over and forward (a curve through a point high behind the start)
          const p1x = F.x - d * 1.4, p1y = F.y + r.h * 1.7, p2x = F.x + d * r.w, p2y = F.y + r.h;
          const nx = u * u * F.x + 2 * u * s * p1x + s * s * p2x, ny = u * u * F.y + 2 * u * s * p1y + s * s * p2y;
          this.vel.set((nx - this.pos.x) / dt, (ny - this.pos.y) / dt, 0); c.g = ZERO;
          if (!U.quiet) FX.burst(_a.copy(this.pos).setY(this.pos.y + 1.0).addScaledVector(this.forward, 0.8), { n: 1, color: [0xe8f0ff, 0xffffff], glow: true, speed: 0.3, size: 0.1, gravity: 0, life: 0.3 });
        } else if (t >= su + r.t && t0 < su + r.t) { this.vel.set(c.dir * 3.5, 2, 0); }
        break;
      }
      case 'step': {
        if (start) {
          this.vel.y = Math.max(this.vel.y, r.v); this.grounded = false;
          c.ball = { x: this.pos.x, y: this.pos.y - 0.2, vy: -3, t: 0 };
          if (!U.quiet) SFX.play('heavy');
        }
        if (c.ball && c.ball.t < 1.2) { const b = c.ball; b.t += dt; b.vy -= 30 * dt; b.y += b.vy * dt; this.recHit(r.ball, _a.set(b.x, b.y, 0), 0.65); }
        if (t >= su) this.recSteer(dt, 4);
        break;
      }
    }
    return false;
  };
  FP.recMoveRaw = FP.recMove;
  FP.recMove = function (m, t0, t, su, ac, dt) { const done = this.recMoveRaw(m, t0, t, su, ac, dt); if (!U.quiet && this.rec) this.recLook(m, t, su); return done; };
  /* after the physics: landing ends it, a ledge on the way down is caught, a springboard off a side */
  FP.recAfter = function (m, t, su) {
    const c = this.rec, r = c.r, St = this.m.arena.stage;
    if (r.spring && !c.sp && t > su && !this.grounded) {
      const w = this.wallTouch, side = this.pos.x >= 0 ? 1 : -1, bySide = this.pos.y < St.top - 0.03 && Math.abs(side * this.pos.x - (St.W + BODY)) < 0.03;
      if (w || bySide) {
        c.sp = 1; this.vel.y = Math.max(this.vel.y, r.spring); this.vel.x = w ? -w.sign * 4 : -side * 1.5; this.faceX(this.vel.x);
        this.m.call(this, r.springCall || 'OFF THE ROPES!', 'buff'); this.hitSet.clear(); this.moveT = Math.min(this.moveT, su + 0.02);
        if (!U.quiet) { SFX.play('heavy'); FX.burst(_a.copy(this.pos).setY(this.pos.y + 0.6), { n: 10, color: [0xffffff, 0xfff27a], speed: 3, size: 0.08, life: 0.35 }); }
      }
    }
    if (this.grounded && c.air && t > su + 0.06 && !c.pull) {
      this.move = null; this.upB = false; this.recClear(); this.land(); this.recoverT = r.lag || 0.16; SFX.play('land');
      if (r.k === 'tether' && r.to === 'top') this.recoverT = 0.08;
      return true;
    }
    if (!this.grounded && t > su && this.vel.y <= 3 && !c.pull && !c.run && Platform.ledge(this)) return true;
    return false;
  };


  /* ------------------------------------------------------------ the looks
     Drawn frames only, and kept off the fight (a WeakMap, not the fighter), so an online rollback never sees them:
     the geyser under the Water figure, the magma spout, the column of light, the siege ladder, the imps, the bubble,
     the lantern, the war fan, the cyclone, the flail rotor, the fire jets, the powder keg, the bolt, the ball, the
     crescent, the lifebuoy, and what's on the end of each rope. */
  const VIS = new WeakMap(), VST = new WeakMap();
  const basic = (col, op, add) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, toneMapped: false });
  const lam = col => new THREE.MeshLambertMaterial({ color: col });
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  function rig(f, key, make) {
    let o = VIS.get(f); if (!o) VIS.set(f, o = {});
    let g = o[key]; if (!g) { g = o[key] = make(); g.traverse(x => { x.frustumCulled = false; }); }
    const sc = f.m.scene; if (g.parent !== sc || !sc.children.includes(g)) { if (g.parent) g.parent.remove(g); sc.add(g); }
    g.visible = true; return g;
  }
  function rigHide(f, key) { const o = VIS.get(f); if (!o) return; if (key) { if (o[key]) o[key].visible = false; } else for (const k in o) o[k].visible = false; }
  const vstate = f => { let v = VST.get(f); if (!v) VST.set(f, v = {}); return v; };
  const TIPS = { rPir: 'grapnel', rArc: 'arrow', rSai: 'anchor', rMet: 'claw', rVik: 'axe' };
  const TIP_MAKE = {
    grapnel: () => { const g = new THREE.Group(), m = lam(0x6a6a72); g.add(box(0.07, 0.07, 0.5, m)); for (let i = 0; i < 3; i++) { const h = new THREE.Group(); h.rotation.z = i * 2.1; const pr = box(0.06, 0.06, 0.34, m); pr.rotation.x = 0.9; pr.position.set(0, 0.12, 0.2); h.add(pr); g.add(h); } return g; },
    arrow: () => { const g = new THREE.Group(); const sh = box(0.04, 0.04, 0.7, lam(0x8a6a3a)); sh.position.z = -0.3; const hd = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 6), lam(0xb8bcc4)); hd.rotation.x = Math.PI / 2; hd.position.z = 0.08; const fl = box(0.16, 0.02, 0.14, lam(0xd83a2a)); fl.position.z = -0.6; g.add(sh, hd, fl); return g; },
    anchor: () => { const g = new THREE.Group(), m = lam(0x5a5f6a); const sh = box(0.1, 0.1, 0.8, m); const cr = box(0.6, 0.08, 0.08, m); cr.position.z = -0.3; const a1 = box(0.08, 0.08, 0.42, m); a1.position.set(0.18, 0, 0.32); a1.rotation.y = -0.7; const a2 = a1.clone(); a2.position.x = -0.18; a2.rotation.y = 0.7; g.add(sh, cr, a1, a2); return g; },
    claw: () => { const g = new THREE.Group(), m = lam(0xd8dde6); g.add(box(0.16, 0.16, 0.2, m)); for (let i = 0; i < 3; i++) { const h = new THREE.Group(); h.rotation.z = i * 2.1; const pr = box(0.05, 0.05, 0.3, m); pr.position.set(0, 0.1, 0.18); pr.rotation.x = -0.5; h.add(pr); g.add(h); } return g; },
    axe: () => { const g = new THREE.Group(); const hd = box(0.06, 0.42, 0.3, lam(0x9aa0ad)); hd.position.y = 0.12; const hf = box(0.05, 0.05, 0.5, lam(0x6a4a2a)); hf.position.z = -0.25; g.add(hd, hf); return g; },
  };
  const LOOK = { rWat: 'geyser', rLav: 'magma', rPal: 'light', rSho: 'ladder', rSum: 'imps', rGho: 'mist', rSwa: 'bubble', rSpi: 'lantern', rDai: 'fan', rAir: 'cyclone', rCru: 'rotor', rFla: 'jets', rBla: 'keg', rSto: 'bolt', rBow: 'ball', rRed: 'crescent', rCap: 'buoy', rMon: 'cloud', rBba: 'bball', rBar: 'notes', rTem: 'scourge' };
  const column = (cols) => () => {
    const G = new THREE.Group(), C = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.95, 1, 20, 1, true), basic(cols[0], 0.78)); outer.position.y = -0.5;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.55, 1, 14, 1, true), basic(cols[1], 0.55)); inner.position.y = -0.5;
    const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.99, 1, 6, 1, true), basic(cols[2], 0.22)); streak.position.y = -0.5;
    C.add(outer, inner, streak);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 8), basic(cols[2], 0.8)); cap.scale.y = 0.32;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.6, 14, 1, true), basic(cols[1], 0.55, true)); crown.position.y = 0.1; crown.rotation.x = Math.PI;
    G.add(C, cap, crown); G.userData = { C, cap, crown, inner, streak, outer }; return G;
  };
  FP.recLook = function (m, t, su) {
    const c = this.rec, r = c.r, L = LOOK[m.id]; if (!L) return;
    const T = this.m.time, p = this.pos, fx = this.forward.x >= 0 ? 1 : -1, v = vstate(this);
    if (v.rec !== c) { v.rec = c; v.n = 0; v.cloudT = -9; v.lx = p.x; v.ly = p.y; v.offT = null; }
    const on = t >= su && t < su + (r.t != null ? r.t : 0.5);
    switch (L) {
      case 'geyser': case 'magma': {
        // a column of water (or magma) from the ground under her (or out of the depths) up to her feet, the foam on top
        let k = 1;
        if (L === 'geyser') { if (c.off && v.offT == null) v.offT = T; if (v.offT != null) k = 1 - (T - v.offT) / 0.25; }
        else k = t < su ? 0 : t < su + 0.45 ? 1 : 1 - (t - su - 0.45) / 0.25;
        if (t < su || k <= 0) { rigHide(this, L); break; }
        const g = rig(this, L, column(L === 'geyser' ? [0x1a6ac8, 0x7ac8ff, 0xffffff] : [0xc8300a, 0xff8a1a, 0xffe080])), G = g.userData;
        const gy = Platform.groundAt(this.m, p.x, p.y), base = gy != null ? gy : p.y - 9, h = Math.max(0.2, p.y - base);
        g.position.set(p.x, p.y, 0); G.C.scale.set(k * (1 + 0.07 * Math.sin(T * 31)), h, k * (1 + 0.07 * Math.cos(T * 27)));
        G.inner.rotation.y = T * 9; G.streak.rotation.y = -T * 6; G.cap.scale.set(k * (1 + 0.15 * Math.sin(T * 40)), 0.32 * k, k * (1 + 0.15 * Math.cos(T * 37)));
        G.crown.scale.setScalar(k * (0.85 + 0.2 * Math.sin(T * 23)));
        if (U.vrand() < 0.7) FX.burst(_a.set(p.x + U.vrnd(-0.4, 0.4), p.y + 0.1, 0), { n: 2, color: L === 'geyser' ? [0xffffff, 0xbfe8ff, 0x7ad8ff] : [0xffd060, 0xff6a1a], glow: L === 'magma', speed: 3.5, size: 0.1, gravity: 16, life: 0.5, up: 3 });
        if (gy != null && U.vrand() < 0.35) FX.burst(_a.set(p.x, gy + 0.05, 0), { n: 2, color: L === 'geyser' ? [0xffffff, 0x7ad8ff] : [0xff8a1a, 0x3a2a20], speed: 3, size: 0.09, gravity: 12, life: 0.4, up: 1 });
        break;
      }
      case 'light': {
        if (!on) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); G.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 7, 20, 1, true), basic(0xffe070, 0.22, true)), new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 7, 14, 1, true), basic(0xfffbe0, 0.3, true))); return G; });
        g.position.set(p.x, p.y + 1.2, 0); g.children[0].material.opacity = 0.18 + 0.08 * Math.sin(T * 14); g.rotation.y = T * 2;
        if (U.vrand() < 0.6) FX.burst(_a.set(p.x + U.vrnd(-0.8, 0.8), p.y + U.vrnd(-1, 1), 0), { n: 1, color: [0xfff07a, 0xffffff], glow: true, speed: 0.5, size: 0.08, gravity: -6, life: 0.6 });
        break;
      }
      case 'ladder': {
        if (t < su) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(), w = lam(0x8a5a2a); for (const sd of [-1, 1]) { const r1 = box(0.1, 7.4, 0.1, w); r1.position.x = sd * 0.34; G.add(r1); } for (let i = 0; i < 17; i++) { const rg = box(0.68, 0.07, 0.08, w); rg.position.y = -3.6 + i * 0.44; G.add(rg); } return G; });
        g.position.set(v.lx, v.ly + 3.1, -0.35);
        break;
      }
      case 'imps': {
        if (!on) { rigHide(this, L); break; }
        const col = KB.LINES.summoner.pal.glow;
        const g = rig(this, L, () => { const G = new THREE.Group(); for (const sd of [-1, 1]) { const I = new THREE.Group(); I.add(box(0.44, 0.44, 0.36, lam(0x4a2a5a))); for (const e of [-1, 1]) { const ey = box(0.09, 0.09, 0.02, basic(col, 1)); ey.position.set(e * 0.1, 0.06, 0.19); I.add(ey); for (const hn of [0]) { const horn = box(0.06, 0.16, 0.06, lam(0x2a1a2e)); horn.position.set(e * 0.15, 0.28, 0); I.add(horn); } } for (const e of [-1, 1]) { const wg = box(0.56, 0.03, 0.3, basic(col, 0.75)); wg.position.x = e * 0.42; wg.name = 'w'; I.add(wg); } I.position.x = sd * 0.7; G.add(I); } return G; });
        g.position.set(p.x, p.y + 2.2 + 0.08 * Math.sin(T * 12), 0.15);
        g.traverse(x => { if (x.name === 'w') x.rotation.z = Math.sin(T * 42) * 0.8 * Math.sign(x.position.x); });
        break;
      }
      case 'mist': case 'bubble': {
        if (!on) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); G.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 14), L === 'mist' ? basic(0x6affb0, 0.2, true) : basic(0xb8e85a, 0.28))); if (L === 'bubble') { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), basic(0xffffff, 0.6)); hl.position.set(-0.5, 0.55, 0.8); G.add(hl); } return G; });
        g.position.set(p.x, p.y + 0.95, 0); const w = Math.sin(T * (L === 'bubble' ? 7 : 11)) * 0.06; g.scale.set(1 + w, 1 - w, 1 + w);
        if (L === 'mist' && U.vrand() < 0.8) FX.burst(_a.set(p.x + U.vrnd(-0.6, 0.6), p.y + U.vrnd(0.2, 1.8), 0), { n: 1, color: [0x6affb0, 0xd8fff0], glow: true, speed: 0.6, size: 0.14, gravity: -1, life: 0.6 });
        break;
      }
      case 'lantern': {
        if (t < su) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); const pole = box(0.05, 0.8, 0.05, lam(0x5a4a3a)); pole.position.y = -0.45; const la = box(0.28, 0.36, 0.28, basic(0xd8f4ff, 0.95)); const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), basic(0x9ad8ff, 0.3, true)); G.add(pole, la, glow); return G; });
        g.position.set(p.x + fx * 0.3, p.y + 2.45 + 0.05 * Math.sin(T * 5), 0.1); g.rotation.z = Math.sin(T * 3) * 0.12;
        break;
      }
      case 'fan': {
        if (t < su) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); const fan = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), lam(0x2a1a14)); fan.scale.y = 1.15; const sun = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), basic(0xd8401a, 1)); sun.position.z = 0.01; const rim = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.64, 24), basic(0xffd84a, 1)); rim.scale.y = 1.15; rim.position.z = 0.012; const h = box(0.06, 0.5, 0.06, lam(0x6a4a2a)); h.position.y = -0.9; G.add(fan, sun, rim, h); return G; });
        g.position.set(p.x, p.y + 2.6, 0.2); g.rotation.z = -fx * (c.ph ? 0.35 : 0.1) + Math.sin(T * 6) * 0.05;
        break;
      }
      case 'cyclone': {
        if (!on) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); const a = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.3, 2.9, 20, 1, true), basic(0xe8f8ff, 0.22, true)); const b = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.2, 2.5, 7, 1, true), basic(0xffffff, 0.18, true)); G.add(a, b); return G; });
        g.position.set(p.x, p.y + 1.2, 0); g.children[0].rotation.y = T * 18; g.children[1].rotation.y = -T * 24;
        if (U.vrand() < 0.7) FX.burst(_a.set(p.x + U.vrnd(-1.2, 1.2), p.y + U.vrnd(0, 2.4), 0), { n: 1, color: [0xffffff, 0xd8f0ff], speed: 1.5, size: 0.07, gravity: -2, life: 0.35 });
        break;
      }
      case 'rotor': {
        if (!on) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(), mt = lam(0x6a6a72); G.add(box(2.8, 0.06, 0.06, lam(0x8a6a3a))); for (const sd of [-1, 1]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), mt); b.position.x = sd * 1.4; G.add(b); } const blur = new THREE.Mesh(new THREE.CircleGeometry(1.45, 28), basic(0xc8ccd4, 0.14)); blur.rotation.x = -Math.PI / 2; G.add(blur); return G; });
        g.position.set(p.x, p.y + 2.2, 0); g.rotation.y = T * 26;
        break;
      }
      case 'jets': {
        if (!on || c.off) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); for (const sd of [-1, 1]) { const J = new THREE.Group(); const a = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.3, 10, 1, true), basic(0xff7a1a, 0.75, true)); a.position.y = -0.65; a.rotation.x = Math.PI; const b = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 8, 1, true), basic(0xfff0a0, 0.9, true)); b.position.y = -0.4; b.rotation.x = Math.PI; J.add(a, b); J.position.x = sd * 0.16; G.add(J); } return G; });
        const sp = Math.hypot(this.vel.x, this.vel.y) || 1, dx = this.vel.x / sp, dy = this.vel.y / sp;
        g.position.set(p.x, p.y + 0.2, 0); g.rotation.z = Math.atan2(-dx, dy); g.scale.set(1, 0.85 + 0.3 * U.vrand(), 1);
        break;
      }
      case 'keg': {
        if (t >= su) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); G.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.75, 14), lam(0x6a4422))); for (const y of [-0.24, 0.24]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 14), lam(0x2a2a2e)); b.position.y = y; G.add(b); } return G; });
        g.position.set(p.x, p.y - 0.3, 0); g.rotation.z = Math.sin(T * 30) * 0.05;
        break;
      }
      case 'bolt': {
        const B = v.bolt; if (!B || T - B.t > 0.3) { rigHide(this, L); break; }
        const N = 10, g = rig(this, L, () => { const G = new THREE.Group(); for (let i = 0; i < N; i++) G.add(box(1, 0.09, 0.09, basic(i % 2 ? 0xffffff : 0x9ad8ff, 0.95, true))); return G; });
        const prev = _a.copy(B.from), dx = B.to.x - B.from.x, dy = B.to.y - B.from.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        for (let i = 0; i < N; i++) {
          const sN = (i + 1) / N, j = i < N - 1 ? U.vrnd(-0.45, 0.45) : 0, q = _c.set(B.from.x + dx * sN + nx * j, B.from.y + dy * sN + ny * j, 0), seg = g.children[i];
          seg.position.set((prev.x + q.x) / 2, (prev.y + q.y) / 2, 0); seg.rotation.z = Math.atan2(q.y - prev.y, q.x - prev.x); seg.scale.x = Math.hypot(q.x - prev.x, q.y - prev.y) + 0.05; prev.copy(q);
          seg.material.opacity = 0.95 * (1 - (T - B.t) / 0.3);
        }
        break;
      }
      case 'ball': {
        const b = c.ball; if (!b || b.t >= 1.2) { rigHide(this, L); break; }
        const g = rig(this, L, () => new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshPhongMaterial({ color: 0x2a2a8a, shininess: 90 })));
        g.position.set(b.x, b.y, 0); g.rotation.x += 0.3;
        break;
      }
      case 'crescent': {
        if (!on) { rigHide(this, L); break; }
        const g = rig(this, L, () => new THREE.Mesh(new THREE.RingGeometry(0.85, 1.25, 28, 1, 0, Math.PI), basic(0xe8f0ff, 0.6, true)));
        g.position.set(p.x, p.y + 1.0, 0.1); g.rotation.z = Math.atan2(this.vel.y, this.vel.x) - Math.PI / 2; g.material.opacity = 0.6 * (1 - (t - su) / (r.t || 0.5)) + 0.15;
        break;
      }
      case 'buoy': {
        if (!c.pull) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); for (let i = 0; i < 4; i++) { const sg = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.13, 8, 6, Math.PI / 2), lam(i % 2 ? 0xffffff : 0xd8402a)); sg.rotation.z = i * Math.PI / 2; G.add(sg); } G.rotation.x = Math.PI / 2; return G; });
        g.position.set(p.x, p.y + 1.0, 0); g.rotation.z = T * 2;
        break;
      }
      case 'cloud': {
        if (c.n !== v.n) { v.n = c.n; v.cloudT = T; v.cx = p.x; v.cy = p.y; }
        const a = 1 - (T - v.cloudT) / 0.4; if (a <= 0) { rigHide(this, L); break; }
        const g = rig(this, L, () => { const G = new THREE.Group(); for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), basic(0xfff4c8, 0.8)); d.position.set((i - 1) * 0.42, 0, 0); d.scale.y = 0.45; G.add(d); } return G; });
        g.position.set(v.cx, v.cy - 0.1, 0); g.scale.setScalar(0.8 + (1 - a) * 0.6); g.children.forEach(d => { d.material.opacity = 0.8 * a; });
        break;
      }
      case 'bball': {
        if (t < su || c.n) { rigHide(this, L); break; }
        const g = rig(this, L, () => new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), lam(0xe8701a)));
        g.position.set(p.x + fx * 0.35, p.y + 2.5, 0.1); g.rotation.z = T * 8;
        break;
      }
      case 'notes': {
        if (on && U.vrand() < 0.5) FX.burst(_a.set(p.x + U.vrnd(-0.6, 0.6), p.y + U.vrnd(0.6, 1.8), 0), { n: 1, color: [0xfff27a, 0xffffff, 0xffb0e0], glow: true, speed: 1.2, size: 0.11, gravity: -3, life: 0.6 });
        break;
      }
      case 'scourge': {
        if (t >= su && !v.n) { v.n = 1; FX.burst(_a.set(p.x, p.y + 1.2, 0), { n: 18, color: [0xd81a1a, 0x8a0a0a, 0xffffff], speed: 4, size: 0.08, gravity: 12, life: 0.5 }); }
        break;
      }
    }
  };

  /* ------------------------------------------------------------ the 47
     dp: the move (no lunge: the recovery moves it; a hit all round it unless said otherwise) */
  const UP = (line, id, o) => {
    mv(id, Object.assign({ type: 'melee', around: 1, lunge: 0, trail: 0, su: 0.08, ac: 0.18, rc: 0.28, dmg: 40, rad: 1.1, h: 1.0, kb: [3, 11], launch: 1, sfx: 'whoosh' }, o));
    P[line].head.cmd.dp = id;
  };
  const HIT = (id, o) => mv(id, Object.assign({ type: 'melee', lunge: 0, trail: 0, dmg: 40, kb: [4, 10], launch: 1, sfx: 'heavy' }, o));

  /* ====================================================== HISTORICAL FANTASY */
  // MONK: three steps up the air, a kick on each (the first a burst of ki that breaks every shot near him)
  HIT('rMonK', { name: 'Cloud Step', dmg: 24, kb: [3, 9] });
  UP('monk', 'rMon', { name: 'Ki Ascent', type: 'act', act: 'kiBurst', pose: 'craneStand', su: 0.06, rc: 0.24, rec: { k: 'burst', n: 3, gap: 0.2, sp: 11, minUp: 4, hit: 'rMonK', hitR: 1.2, col: 0xffe080, t: 0.6 }, desc: 'A burst of ki (every shot near him breaks), then three steps up the air, each one a kick: the stick picks the way of each.' });
  // VIKING: the bearded axe hooked over the ledge; out of reach of one, a rising chop
  UP('viking', 'rVik', { name: 'Skeggøx Hook', pose: 'overhead', su: 0.1, ac: 0.14, rc: 0.3, dmg: 46, rad: 1.1, kb: [3, 12], rec: { k: 'tether', to: 'ledge', hook: 1, range: 5.5, sp: 30, v: 14, col: 0x9aa0ad, sfx: 'slash' }, desc: 'The beard of his axe hooked over the ledge from up to 5.5 m, and he hauls himself to it; out of reach, a rising chop.' });
  // SUMMONER: two imps take her arms and fly her
  UP('summoner', 'rSum', { name: 'Imp Lift', pose: 'summon', su: 0.1, ac: 1.2, rc: 0.2, dmg: 10, multi: 3, rad: 1.2, kb: [8, 7], rec: { k: 'fly', sp: 7, t: 1.25, col: 0xb05aff, glow: 1 }, desc: 'Two imps take her by the arms and fly her where the stick points for 1.25 s; anything they bump into gets clawed.' });
  // BARD: a rising chord (higher on the beat)
  UP('bard', 'rBar', { name: 'Crescendo', pose: 'strum', su: 0.06, ac: 0.16, rc: 0.3, dmg: 34, rad: 1.4, kb: [3, 12], sfx: 'chord', rec: { k: 'rise', v: 14, beat: 1.3, steer: 4.5 }, desc: 'He rides a rising chord: on the beat it goes 30% higher.' });

  /* ================================================================ EDO JAPAN */
  // SAMURAI: one rising draw, and the blade slid home on the way down (Nōtō: his next hit hits harder)
  UP('samurai', 'rSam', { name: 'Nōtō Draw', pose: 'upslash', around: 0, reach: 0.9, h: 1.8, su: 0.06, ac: 0.12, rc: 0.3, dmg: 58, rad: 1.1, kb: [2, 14], launcher: 1, sfx: 'slash', trail: 1, buffAfter: { id: 'empower', t: 4, call: 'NŌTŌ' }, rec: { k: 'rise', v: 16, vx: 1.5, steer: 3.5 }, desc: 'One rising draw, straight up, and the blade slid home on the way down: his next hit within 4 s deals +60% and crumples.' });
  // SHINOBI: smoke, and he's somewhere else
  HIT('rNinP', { name: 'Smoke Bomb', dmg: 18, kb: [2, 0], stun: 0.6, dizzy: 0.8 });
  UP('ninja', 'rNin', { name: 'Smoke Bomb', type: 'act', pose: 'vanish', su: 0.06, rc: 0.24, sfx: 'boom', rec: { k: 'warp', d: 7, t: 0.32, invis: 1.2, arrive: 'rNinP', col: 0x5a5a62 }, desc: 'A smoke bomb: he vanishes and reappears 7 m the way the stick points, unseen for a moment (anyone where he lands is left DIZZY).' });
  // RONIN: the more he's taken, the higher he goes
  UP('ronin', 'rRon', { name: 'Last Stand', pose: 'twoHandDiag', twoHand: 1, su: 0.08, ac: 0.14, rc: 0.3, dmg: 50, rad: 1.2, kb: [4, 13], lastStand: 1, sfx: 'slash', trail: 1, rec: { k: 'rise', v: 12.5, vx: 2, pctV: [0.06, 7], steer: 4 }, desc: 'A desperate leaping cut: the more damage he has taken, the higher it goes (and the harder it hits).' });
  // KUNOICHI: up the side of the stage to the ledge; away from it, a backflip kick
  UP('kunoichi', 'rKun', { name: 'Wall Run', pose: 'axeKick', su: 0.04, ac: 0.16, rc: 0.28, dmg: 36, rad: 1.1, kb: [3, 12], rec: { k: 'wallrun', sp: 14, t: 0.8, v: 14.5 }, desc: 'Beside the stage, she runs straight up its side to the ledge (on a walled stage, up a wall and off it). Anywhere else, a backflip kick.' });
  // SHOGUN: a siege ladder, climbed in armour, and a yari thrust at the top
  HIT('rShoY', { name: 'Yari Thrust', dmg: 52, kb: [3, 14], sfx: 'slash' });
  UP('shogun', 'rSho', { name: 'Siege Ladder', type: 'act', pose: 'salute', su: 0.12, rc: 0.24, armor: 1, ac: 1.0, rec: { k: 'ascend', vy: 6, t: 1.0, sp: 2, endHit: 'rShoY', endAt: 2.0, endR: 1.3, col: 0x8a6a3a }, desc: 'A siege ladder: he climbs it, slowly, and nothing staggers him on the way. At the top, a yari thrust straight up.' });
  // DAIMYO: the war fan opened like a sail
  UP('daimyo', 'rDai', { name: 'Gunbai Glide', pose: 'hurl', su: 0.08, ac: 0.12, rc: 0.2, dmg: 26, rad: 1.3, kb: [10, 6], rec: { k: 'glide', v: 12.5, t: 2.2, g: 5, fall: 2.2, vx: 7, col: 0xffd84a }, desc: 'A sweep of the war fan to rise, then he glides on it, a long way: the stick steers, ↓ lets go.' });

  /* ====================================================== KNIGHTS OF THE REALM */
  // KNIGHT: an armoured shield rush any way (eight of them)
  UP('knight', 'rKni', { name: 'Shield Rush', pose: 'bash', su: 0.1, ac: 0.3, rc: 0.28, dmg: 48, rad: 1.1, kb: [13, 8], armor: 1, crush: 2, sfx: 'heavy', rec: { k: 'dash', sp: 14, dt: 0.3, keep: 0.4, col: 0xd8dde6, t: 0.32 }, desc: 'Shield first, in armour, 4 m any of eight ways: a KNOCK that breaks guards.' });
  // PALADIN: lifted in a column of light, untouchable (and unable to strike)
  UP('paladin', 'rPal', { name: 'Divine Ascent', type: 'act', pose: 'salute', su: 0.06, rc: 0.16, sfx: 'jguard', buffAt: { id: 'bubble', t: 0.85 }, rec: { k: 'ascend', vy: 8.5, t: 0.75, sp: 3, col: 0xfff07a, glow: 1 }, desc: 'A column of light lifts him, untouchable, 6 m (he can’t attack from inside it).' });
  // DRAGOON: a pole-vault on the lance, the point coming down at the top
  HIT('rDraS', { name: 'Lance Point', dmg: 44, kb: [3, -11], spike: 1, sfx: 'slash' });
  UP('dragoon', 'rDra', { name: 'Lance Vault', pose: 'lance', twoHand: 1, su: 0.08, ac: 0.14, rc: 0.3, dmg: 30, rad: 1.1, kb: [4, 10], rec: { k: 'rise', v: 15, vx: 6, steer: 3, apex: 'rDraS', apexAt: [0.6, -0.3], apexR: 1.1 }, desc: 'He vaults forward on the lance, and at the top of the arc the point comes down: it spikes anyone under him.' });
  // TEMPLAR: the scourge for the highest leap of all
  UP('templar', 'rTem', { name: 'Martyr’s Leap', pose: 'overhead', su: 0.12, ac: 0.14, rc: 0.3, dmg: 44, rad: 1.2, kb: [3, 13], sfx: 'heavy', rec: { k: 'rise', v: 19.5, vx: 1.5, steer: 4, cost: 4 }, desc: 'He scourges himself for it (4%), and leaps higher than anyone.' });
  // CRUSADER: the flail whirled overhead like a rotor
  UP('crusader', 'rCru', { name: 'Flail Rotor', pose: 'overhead', su: 0.1, ac: 1.0, rc: 0.24, dmg: 12, multi: 5, rad: 1.5, h: 1.6, kb: [12, 8], sfx: 'heavy', rec: { k: 'spin', v: 7, t: 1.0, g: 10, minVy: -0.8, sp: 5.5, col: 0x9aa0ad }, desc: 'The flail whirled over his head like a rotor: he hangs in the air a full second, drifting with the stick, five hits all round.' });
  // LANCER: the capriole (the horse leaps and kicks out behind)
  HIT('rLanK', { name: 'Capriole Kick', dmg: 54, kb: [15, 7], kbBack: 1 });
  UP('lancer', 'rLan', { name: 'Capriole', pose: 'bashUp', su: 0.1, ac: 0.14, rc: 0.3, dmg: 30, rad: 1.2, kb: [4, 11], rec: { k: 'rise', v: 14.5, vx: 5.5, steer: 3, apex: 'rLanK', apexAt: [-1.1, 0.6], apexR: 1.3, apexHang: 3 }, desc: 'The horse leaps forward and, at the top, kicks out with both hind legs: a KNOCK on anyone behind.' });

  /* ========================================================= LOVERS OF THE SEA */
  // PIRATE: a grapnel to the ledge, and a swing in on its rope
  HIT('rPirW', { name: 'Grapnel', dmg: 24, kb: [3, 4], stun: 0.5 });
  UP('pirate', 'rPir', { name: 'Grapnel', type: 'act', pose: 'chainThrow', su: 0.1, rc: 0.2, rec: { k: 'tether', to: 'ledge', range: 8, sp: 14, swing: 1.6, miss: 7, whip: 'rPirW', col: 0xb08a5a, t: 1.2 }, desc: 'A grappling hook thrown at the ledge (up to 8 m): it bites, and he swings in on the rope and hangs there. A miss still hooks anyone in its way.' });
  // CAPTAIN: a line thrown from her ship, high over the stage, hauls her in
  UP('captain', 'rCap', { name: 'Lifeline', type: 'act', pose: 'point', su: 0.08, rc: 0.2, rec: { k: 'home', sp: 8, t: 1.0, col: 0xd8c89a }, desc: 'A line thrown from her ship, high above: the crew haul her in toward the stage for a second, whatever the stick says.' });
  // CANNONEER: the swivel gun fired the other way, and he goes where you point
  HIT('rCanB', { name: 'Recoil Blast', dmg: 48, kb: [8, 10], blast: 1 });
  UP('cannoneer', 'rCan', { name: 'Recoil Jump', type: 'act', pose: 'shootDown', su: 0.12, rc: 0.3, sfx: 'boom', rec: { k: 'rise', aimed: 1, v: 18, blast: 'rCanB', blastR: 1.6, blastCol: 0xffa040 }, desc: 'The swivel gun fired the other way: he goes where the stick points, 18 m/s, and the blast hits anyone at the muzzle.' });
  // BLACKBEARD: a powder keg under his boots (a fuse first)
  HIT('rBlaB', { name: 'Powder Keg', dmg: 64, kb: [10, 11], blast: 1, burn: [8, 2] });
  UP('blackbeard', 'rBla', { name: 'Powder Keg', type: 'act', pose: 'roar', su: 0.42, rc: 0.3, sfx: 'boom', rec: { k: 'rise', v: 20.5, steer: 3.5, fuse: 1, blast: 'rBlaB', blastR: 2.2, blastCol: 0xff6a1a }, desc: 'A lit keg under his boots: a fuse (he hangs there), then the biggest blast of them all sends him sky-high and sets anyone under him BURNING.' });
  // REDBEARD: a crescent swing of the kilij, and he goes with it
  UP('redbeard', 'rRed', { name: 'Crescent Rise', pose: 'slashA', su: 0.06, ac: 0.55, rc: 0.24, dmg: 16, multi: 3, rad: 1.3, kb: [12, 8], sfx: 'slash', trail: 1, rec: { k: 'loop', w: 4.5, h: 4, t: 0.55 }, desc: 'He swings the kilij in a crescent and goes with it: up, back and over, 4.5 m forward and 4 m up, three cuts on the way.' });
  // SAILOR: the anchor thrown onto the deck and hauled in on its line
  HIT('rSaiA', { name: 'Anchor Down', dmg: 50, kb: [3, 11], groundHit: 1 });
  UP('sailor', 'rSai', { name: 'Anchor Haul', type: 'act', pose: 'hurl', su: 0.12, rc: 0.24, rec: { k: 'tether', to: 'top', range: 7.5, sp: 17, miss: 7, whip: 'rSaiA', arrive: 'rSaiA', arriveR: 1.6, col: 0x9aa0ad, t: 1.0 }, desc: 'The anchor flung onto the stage (up to 7.5 m), and he hauls himself up its line onto his feet, the anchor hitting anyone standing where it lands.' });
  // MARAUDER: a leap at them, and a second one off their head
  UP('marauder', 'rMar', { name: 'Boarding Leap', pose: 'skullSplit', su: 0.1, ac: 0.2, rc: 0.3, dmg: 40, rad: 1.2, kb: [2, -10], spike: 1, sfx: 'heavy', rec: { k: 'rise', v: 13.5, vx: 2, steer: 4, hop: 15, hopCall: 'BOARDED!' }, desc: 'A leaping axe blow that spikes them down, and if it lands he jumps again off their head.' });
  // MUSKETEER: a shot fired down, and the recoil
  mv('rMusS', { name: 'Recoil Shot', type: 'proj', proj: 'shotDown', dmg: 40, kb: [3, -9], spike: 1, range: 8, trail: 0 });
  UP('musketeer', 'rMus', { name: 'Recoil Shot', type: 'act', pose: 'aim', twoHand: 1, su: 0.1, rc: 0.3, sfx: 'shot', rec: { k: 'rise', v: 15, steer: 4, shot: 'rMusS' }, desc: 'The musket fired down at 45°: the shot spikes anyone it hits, and the kick sends her up.' });
  // GHOST PIRATE: he comes apart and drifts where he likes, nothing touching him
  UP('ghost', 'rGho', { name: 'Phantom Drift', type: 'act', pose: 'vanish', su: 0.06, rc: 0.2, sfx: 'dodge', rec: { k: 'fly', sp: 6, t: 1.35, ghost: 1, col: 0x6affb0, glow: 1 }, desc: 'He comes apart into mist and drifts the way the stick points for 1.35 s: nothing can touch him, and he can’t touch anything.' });

  /* ============================================================= MODERN SPORTS */
  // WRESTLER: a crossbody off the ropes: hit the side of the stage (or a wall) and he springs off it again
  UP('wrestler', 'rWre', { name: 'Springboard', pose: 'lariat', su: 0.08, ac: 0.2, rc: 0.3, dmg: 48, rad: 1.3, kb: [12, 8], sfx: 'heavy', rec: { k: 'rise', v: 13, vx: 4, steer: 4, spring: 17 }, desc: 'A flying crossbody; if he meets the side of the stage or a wall on the way, he springboards off it, higher.' });
  // BASEBALL: robbing the home run (glove up: shots are caught)
  UP('baseball', 'rBas', { name: 'Robbing the Homer', pose: 'palm', su: 0.05, ac: 0.14, rc: 0.3, dmg: 34, rad: 1.1, kb: [3, 12], rec: { k: 'rise', v: 16.5, steer: 4, catch: 0.9 }, desc: 'A leap at the wall, glove up: any shot that reaches him in the next 0.9 s is caught.' });
  // FOOTBALL: a juke and a cut (two dashes, each one where the stick points then)
  UP('football', 'rFoo', { name: 'Juke', pose: 'tackle', su: 0.06, ac: 0.4, rc: 0.24, dmg: 34, rad: 1.1, kb: [11, 7], sfx: 'whoosh', rec: { k: 'dash', legs: 2, sp: 15, dt: 0.16, gap: 0.07, keep: 0.4, col: 0xffffff, t: 0.46 }, desc: 'Two cuts, a fake and the real one: two short dashes, each the way the stick points as it starts.' });
  // SOCCER: the bicycle kick (backward, and it spikes)
  UP('soccer', 'rSoc', { name: 'Bicycle Kick', pose: 'bicycle', su: 0.06, ac: 0.16, rc: 0.3, dmg: 46, rad: 1.2, kb: [6, -10], spike: 1, rec: { k: 'rise', v: 15, back: 3.5, steer: 3.5 }, desc: 'A bicycle kick: up and backward, and it spikes them down for a bounce.' });
  // BOXER: the leaping uppercut
  UP('boxer', 'rBox', { name: 'Gazelle Punch', pose: 'uppercut', around: 0, reach: 0.8, h: 1.6, su: 0.04, ac: 0.12, rc: 0.3, dmg: 60, rad: 1.1, kb: [2, 14], launcher: 1, inv: 1, sfx: 'heavy', rec: { k: 'rise', v: 16.5, vx: 2.5, steer: 4 }, desc: 'An invincible leaping uppercut, the fastest of them: launches.' });
  // FENCER: a flèche any way, long and thin
  UP('fencer', 'rFen', { name: 'Flèche', pose: 'lunge', su: 0.1, ac: 0.24, rc: 0.24, dmg: 50, rad: 0.8, kb: [13, 6], crush: 1.5, sfx: 'slash', rec: { k: 'dash', sp: 20, dt: 0.24, keep: 0.3, col: 0xe8f0ff, t: 0.26 }, desc: 'A flèche in a straight line any of eight ways, 4.8 m in a flash: a KNOCK.' });
  // WEIGHTLIFTER: hold Special to set yourself, then the jerk
  UP('weightlifter', 'rWei', { name: 'Clean and Jerk', pose: 'press', su: 0.12, ac: 0.14, rc: 0.3, dmg: 52, rad: 1.3, h: 1.8, kb: [3, 13], sfx: 'heavy', rec: { k: 'charge', max: 0.7, v0: 12, v1: 20.5, call: 'FULL LIFT!' }, desc: 'Hold Special to set himself (he sinks while he does), let go for the jerk: the longer the hold, the higher (up to 0.7 s).' });
  // BOWLER: the ball lofted under him, jumped off, and it falls on whoever is below
  HIT('rBowB', { name: 'Dropped Ball', dmg: 46, kb: [3, -10], spike: 1 });
  UP('bowler', 'rBow', { name: 'Loft', type: 'act', pose: 'bowl', su: 0.1, rc: 0.3, rec: { k: 'step', v: 15.5, ball: 'rBowB', col: 0x2a2a6a }, desc: 'The ball lofted under his feet and jumped off: then it drops like a stone on anyone under him (a spike).' });
  // ARCHER: a rope arrow into the ledge, from furthest of all
  HIT('rArcW', { name: 'Rope Arrow', dmg: 28, kb: [4, 3], stun: 0.5 });
  UP('archer', 'rArc', { name: 'Rope Arrow', type: 'act', pose: 'drawBow', su: 0.12, rc: 0.2, rec: { k: 'tether', to: 'ledge', range: 11, sp: 22, miss: 6, whip: 'rArcW', col: 0xd8c89a, t: 1.0 }, desc: 'An arrow trailing a rope, into the ledge from up to 11 m: she’s reeled straight in and hangs there. A miss still hits anyone in its way.' });
  // SKATER: a 540 with all his speed in it (the stick steers it hard)
  UP('skater', 'rSka', { name: 'McTwist', pose: 'kickflip', su: 0.06, ac: 0.3, rc: 0.3, dmg: 18, multi: 3, rad: 1.3, kb: [6, 12], rec: { k: 'rise', v: 15, steer: 9 }, desc: 'A spinning 540, three hits: he keeps all his speed in it, so the stick steers it further than anyone’s.' });
  // BASKETBALL: the alley-oop, and the dunk at the top
  HIT('rBbaD', { name: 'Slam Dunk', dmg: 50, kb: [3, -12], spike: 1 });
  UP('basketball', 'rBba', { name: 'Alley-Oop', pose: 'bashUp', su: 0.06, ac: 0.14, rc: 0.3, dmg: 26, rad: 1.1, kb: [3, 10], rec: { k: 'rise', v: 16.5, steer: 4, apex: 'rBbaD', apexAt: [0.8, 0.3], apexR: 1.2, apexHang: 3, apexCol: 0xff8a1a }, desc: 'The ball thrown up, a leap after it, and the dunk at the top: it spikes anyone in front of him. (Hang time: he hangs there a moment after.)' });

  /* =========================================================== ELEMENT BENDERS */
  // AIR: a cyclone that carries her up
  UP('air', 'rAir', { name: 'Cyclone', pose: 'doubleChange', su: 0.06, ac: 0.75, rc: 0.24, dmg: 12, multi: 4, rad: 1.4, h: 1.5, kb: [3, 12], inv: 1, rec: { k: 'spin', vy: 8.5, t: 0.75, g: ZERO, sp: 6.5, col: 0xe8f8ff }, desc: 'A cyclone carries her up, about 6 m, steered by the stick, invincible as it starts: four hits all round.' });
  // WATER: a geyser under her, as long as Special is held
  HIT('rWatG', { name: 'Geyser', dmg: 8, kb: [2, 6], stun: 0.35 });
  UP('water', 'rWat', { name: 'Geyser', type: 'act', pose: 'cloudHands', su: 0.08, rc: 0.2, rec: { k: 'thrust', held: 1, vy: 8.5, t: 0.75, sp: 4.5, under: 'rWatG', cols: [0x7ad8ff, 0xffffff, 0x3a9adf] }, desc: 'A geyser under her that lifts her as long as Special is held (up to 0.75 s); it hits anyone under her.' });
  // EARTH: a column of stone under his feet that stays a few seconds
  HIT('rEarP', { name: 'Stone Pillar', dmg: 40, kb: [3, 12] });
  UP('earth', 'rEar', { name: 'Stone Pillar', type: 'act', pose: 'liftBridge', su: 0.1, rc: 0.24, rec: { k: 'pillar', v: 13.5, lift: 2.4, life: 3, w: 1.6, hit: 'rEarP', col: 0x8a7a5a }, desc: 'A column of stone shoots up under him (it hits anyone on top) and stays 3 s: land on it and jump again. (Landing on it doesn’t give this one back.)' });
  // FLAME: fire jets from the feet, steered
  UP('flame', 'rFla', { name: 'Fire Jets', pose: 'axeKick', su: 0.1, ac: 0.6, rc: 0.24, dmg: 10, multi: 4, rad: 1.2, kb: [5, 9], burn: [6, 1.5], rec: { k: 'thrust', acc: 70, max: 13, t: 0.55 }, desc: 'Fire from his feet for half a second, steered by the stick, four BURNING hits all round.' });
  // BLOOD: the strings pulled on her own body: she's yanked to them
  HIT('rBloY', { name: 'Puppet Strings', dmg: 44, kb: [6, 11], stun: 0.6 });
  UP('blood', 'rBlo', { name: 'Puppet Strings', type: 'act', pose: 'hurl', su: 0.1, rc: 0.24, rec: { k: 'tether', to: 'foe', alt: 'ledge', altRange: 6.5, range: 8, sp: 18, miss: 13, arrive: 'rBloY', col: 0xa01a2a, t: 0.8 }, desc: 'She hooks a string into them (up to 8 m) and yanks herself to them, slamming into them. Nobody in reach: a string into the ledge (6.5 m).' });
  // LAVA: she rides a spout of magma up
  UP('lava', 'rLav', { name: 'Eruption', pose: 'powUpper', su: 0.06, ac: 0.16, rc: 0.38, dmg: 50, rad: 1.2, h: 1.5, kb: [2, 13.5], launcher: 1, inv: 1, burn: [10, 2], puff: 0xff7a1a, sfx: 'heavy', rec: { k: 'rise', v: 17, steer: 3.5, groundAct: 'lavaPool' }, desc: 'She rides a spout of magma straight up, invincible as it starts: BURNING; from the floor it leaves a pool of lava where she stood.' });
  // STORM: a lightning step, there before you see it, through anything in the way
  HIT('rStoL', { name: 'Lightning Step', dmg: 38, kb: [6, 9], stun: 0.5 });
  UP('storm', 'rSto', { name: 'Lightning Step', type: 'act', pose: 'greenDragon', su: 0.1, rc: 0.3, sfx: 'jguard', rec: { k: 'zap', d: 6.5, path: 'rStoL' }, desc: 'He goes as lightning: 6.5 m the way the stick points, in an instant, hitting anyone along the way.' });
  // BLAST: three explosions, each one aimed
  HIT('rBlaX', { name: 'Combustion', dmg: 26, kb: [7, 8], blast: 1 });
  UP('blast', 'rBls', { name: 'Combustion', type: 'act', pose: 'burst', su: 0.08, rc: 0.24, sfx: 'boom', rec: { k: 'burst', n: 3, gap: 0.24, sp: 10.5, minUp: 2, hit: 'rBlaX', hitR: 1.4, boom: 1, col: 0xff8a1a, t: 0.72 }, desc: 'Three explosions behind him, each one sending him the way the stick points then; each one hits.' });
  // METAL: a cable to the ledge, or, if they're nearer, into them
  HIT('rMetC', { name: 'Iron Cable', dmg: 30, kb: [0, 3], pull: 1, stun: 0.6 });
  UP('metal', 'rMet', { name: 'Iron Cable', type: 'act', pose: 'chainThrow', su: 0.1, rc: 0.2, rec: { k: 'tether', to: 'ledge', range: 9, sp: 24, miss: 7, whip: 'rMetC', foeHit: 'rMetC', col: 0xd8dde6, t: 0.8 }, desc: 'A steel cable shot at the ledge (up to 9 m) and reeled in fast; if they’re nearer than the ledge, it takes them instead and drags them in.' });
  // SPIRIT: a lantern of spirit light that lets her down slowly
  UP('spirit', 'rSpi', { name: 'Spirit Lantern', pose: 'craneStand', su: 0.06, ac: 0.12, rc: 0.2, dmg: 22, rad: 1.4, kb: [3, 9], rec: { k: 'float', v: 11, t: 2.6, g: 4, fall: 1.0, vx: 5, col: 0x9ad8ff }, desc: 'A lantern of spirit light held up: a little rise, then she floats down slowly for 2.6 s, drifting with the stick (↓ lets go).' });
  // SWAMP: a bubble of marsh gas carries her up; when it bursts, it poisons
  HIT('rSwaP', { name: 'Bog Bubble', type: 'radial', dmg: 14, kb: [6, 4], poison: [8, 3] });
  UP('swamp', 'rSwa', { name: 'Bog Bubble', type: 'act', pose: 'burst', su: 0.08, rc: 0.2, rec: { k: 'fly', up: 5.5, sp: 5, t: 1.3, col: 0xb8e85a, endHit: 'rSwaP', endR: 1.8, endSfx: 'boom' }, desc: 'A bubble of marsh gas carries her up for 1.3 s (the stick takes it side to side); when it bursts, anyone close is POISONED.' });

  for (const id of KB.LINE_ORDER) { const d = P[id].head.cmd && KB.MOVES[P[id].head.cmd.dp]; if (!d || !d.rec) console.warn('[recovery] no recovery for ' + id); }
})();
