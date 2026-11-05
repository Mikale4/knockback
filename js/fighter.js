/* ============================================================================
   fighter.js -- one action figure in a fight: control, moves, physics, and
   everything that happens when a hit lands.

   THE KNOCK//BACK RULES (the wall bounce and the ways out of it)
   - A launching hit sends the target TUMBLING. Tumble into a wall fast
     enough and they bounce back off it ("KNOCK//BACK") still in hitstun:
     you can keep the combo going. Each bounce in a combo hits harder.
   - From the second bounce of a combo on, the target can WALL TECH: press
     Dodge just before they hit the wall and they kick off it, free.
   - Every bounce cracks the wall (its stress shows in the cracks). Full
     stress, or a 4th bounce in one combo, is a WALL BREAK: big damage, the
     wall bursts, the target flies out of the arena (RING OUT), and the
     attacker gets Momentum.
   - Combos decay: each hit is worth less (proration), hitstun shortens and
     gravity grows the longer it runs.
   - SPRING BURST (Snap while being hit, full Burst gauge): blow the attacker
     away and escape. A guarding attacker blocks it, so it can be baited.
   - SNAP CANCEL (Snap while attacking, 50 Hype): cancel any move's recovery.
   - Guard (hold) blocks from the front; just-guard it at the last moment for
     no chip and a shove; throws (Guard + Light) beat guard.
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  const GRAV = 30, BODY = 0.42;
  const _v = new V3(), _w = new V3(), _c = new V3();
  const fwd = (yaw, v) => (v || new V3()).set(Math.sin(yaw), 0, Math.cos(yaw));

  class Fighter {
    constructor(m, idx, build, input, opts) {
      opts = opts || {};
      this.m = m; this.idx = idx; this.build = build; this.input = input; this.opts = opts;
      this.st = KB.stats(build, opts.bonus);
      this.fig = Models.figure(build);
      this.obj = new THREE.Group(); this.spin = new THREE.Group();
      this.spin.position.y = 0.95; this.fig.root.position.y = -0.95;
      this.obj.add(this.spin); this.spin.add(this.fig.root); m.scene.add(this.obj);
      this.pos = this.obj.position; this.vel = new V3(); this.yaw = 0;
      this.ready = Anim.readyFor(build);
      this.trailR = FX.trail(this.st.trailR); this.trailL = FX.trail(this.st.trailL);
      this.brokenMat = this.fig.mat.clone(); this.brokenMat.color.setHex(0x6a6a72);
      this.name = build.name || 'Figure';
      this.color = KB.LINES[build.core.line].css;
      this.hype = 0; this.burst = 60; this.records = { maxCombo: 0, maxBounces: 0, breaks: 0, dmg: 0 };
      this.resetRound(0, 0, 0);
    }

    /* ---------------------------------------------------------------- round */
    resetRound(x, z, yaw) {
      const S = this.st;
      this.pos.set(x, 0, z); this.vel.set(0, 0, 0); this.yaw = yaw; this.obj.rotation.y = yaw;
      this.hp = this.maxHp = S.hp;
      this.armorMax = Object.assign({}, S.armor); this.armor = Object.assign({}, S.armor);
      this.broken = { head: false, armR: false, armL: false, legs: false };
      for (const n of ['head', 'armL', 'armR']) this.fig.reattach(n);
      this.setLegMat(false);
      this.uses = S.uses; this.useRegen = 0;
      this.guardMax = S.guard; this.guardHp = S.guard; this.guardIdle = 0;
      this.state = 'idle'; this.stateT = 0; this.move = null; this.hitstop = 0; this.inv = 0; this.armorT = 0;
      this.buffs = {}; this.slowT = 0; this.dodgeCd = 0; this.airJumps = S.airJumps; this.airDodges = S.airDodges; this.airStr = 0; this.airDashes = 0; this.pauseWin = null; this.riposteT = 0; this.crumpled = this.dizzy = false;
      this.grounded = true; this.combo = this.freshCombo(); this.hitstun = 0; this.held = null; this.flash = 0; this.flashCol = 0xffffff;
      this.spin.rotation.set(0, 0, 0); this.techLock = 0; this.lastDodgeEnd = -9; this.groundT = 0; this.downT = 0; this.hardKD = false;
      this.wallTouch = null; this.out = false; this.ko = false; this.runT = 0; this.phase = 0;
      Anim.set(this.fig, this.ready);
    }
    freshCombo() { return { hits: 0, dmg: 0, bounces: 0, t: 0, gb: false, by: null }; }
    setLegMat(broken) { for (const n of ['legL', 'legR']) this.fig.parts[n].children.forEach(c => { if (c.isMesh && c.material !== VX.glowMat()) c.material = broken ? this.brokenMat : this.fig.mat; }); }
    get opp() { return this.m.opp(this); }
    get forward() { return fwd(this.yaw); }
    get airborne() { return !this.grounded; }
    get inHitstun() { return this.state === 'hit' || this.state === 'tumble' || this.state === 'guardstun' || this.state === 'gbreak'; }
    get comboing() { return this.combo.hits > 0 && (this.state === 'hit' || this.state === 'tumble' || this.state === 'held' || this.state === 'down'); }
    setState(s) { this.state = s; this.stateT = 0; }

    /* ---------------------------------------------------------------- main */
    update(dt) {
      if (this.hitstop > 0) { this.hitstop -= dt; this.shakeFig(); return; }
      if (this.slowT > 0) { this.slowT -= dt; dt *= 0.45; }
      this.stateT += dt;
      const S = this.st, I = this.input;
      // timers
      this.inv = Math.max(0, this.inv - dt); this.armorT = Math.max(0, this.armorT - dt); this.dodgeCd = Math.max(0, this.dodgeCd - dt);
      this.techLock = Math.max(0, this.techLock - dt);
      for (const k in this.buffs) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) delete this.buffs[k]; }
      if (this.state !== 'guard' && this.state !== 'guardstun') { this.guardIdle += dt; if (this.guardIdle > 0.8) this.guardHp = Math.min(this.guardMax, this.guardHp + this.guardMax * 0.22 * dt); }
      if (!this.comboing && this.state !== 'ko') this.burst = Math.min(100, this.burst + 2.6 * S.burstRate * dt);
      if (this.uses < S.uses && !this.broken.head) { this.useRegen += dt; if (this.useRegen > 16) { this.useRegen = 0; this.uses++; } }
      if (this.m.training && this.m.training.meter) { this.hype = 100; this.burst = 100; this.uses = S.uses; }
      if (this.combo.hits && this.inHitstun) this.combo.t += dt;

      // the Snap button: Burst out of hitstun, or cancel a move with Hype
      if (I.peek('snap') && this.state !== 'ko' && !this.m.frozen) {
        if ((this.inHitstun || this.state === 'held' && !this.heldBySuper) && this.burst >= 100) { I.take('snap'); this.doBurst(); }
        else if (this.state === 'attack' && this.move && this.move.type !== 'super' && this.hype >= 50) { I.take('snap'); this.snapCancel(); }
      }

      switch (this.state) {
        case 'idle': case 'run': this.updGround(dt); break;
        case 'air': this.updAir(dt); break;
        case 'attack': this.updAttack(dt); break;
        case 'guard': this.updGuard(dt); break;
        case 'guardstun': this.physics(dt, 14); if (this.riposte()) break; if (this.stateT > this.hitstun) this.setState(this.input.held.guard ? 'guard' : 'idle'); break;
        case 'gbreak': this.physics(dt, 10); if (this.stateT > 1.1) this.setState('idle'); break;
        case 'dodge': this.updDodge(dt); break;
        case 'hit': this.physics(dt, 9); if (this.stateT > this.hitstun) { if (this.crumpled && this.grounded) { this.crumpled = false; this.hardKD = false; this.setState('down'); } else { this.endCombo(); this.crumpled = this.dizzy = false; this.setState(this.grounded ? 'idle' : 'air'); } } break;
        case 'tumble': this.updTumble(dt); break;
        case 'down': this.physics(dt, 12); if (this.stateT > (this.hardKD ? 0.85 : 0.6)) { this.setState('getup'); this.inv = 0.45; this.endCombo(); } break;
        case 'getup': this.physics(dt, 12); if (this.stateT > 0.32) this.setState('idle'); break;
        case 'held': this.updHeld(dt); break;
        case 'burst': this.physics(dt, 6, 0.35); if (this.stateT > 0.45) this.setState(this.grounded ? 'idle' : 'air'); break;
        case 'ko': this.physics(dt, this.grounded ? 6 : 0); break;
        case 'victory': case 'intro': this.physics(dt, 12); break;
        case 'out': this.updOut(dt); break;
      }
      this.collide();
      this.animate(dt);
    }

    /* camera-relative stick -> a world direction (the camera looks from +Z) */
    stick() { const mv = this.input.move; const l = Math.hypot(mv.x, mv.y); return l < 0.25 ? null : _w.set(mv.x, 0, -mv.y).normalize().clone(); }
    faceOpp(k) { const o = this.opp; if (!o) return; const a = U.ang(this.pos, o.pos); this.yaw = k == null ? a : U.turn(this.yaw, a, k); }

    updGround(dt) {
      const S = this.st, I = this.input, dir = this.stick();
      const legs = this.broken.legs ? 0.68 : 1;
      if (this.tryActions(true)) return;
      const sp = S.speed * legs * (this.buffs.momentum ? 1.06 : 1);
      if (dir) {
        this.vel.x = U.smooth(this.vel.x, dir.x * sp, 14, dt); this.vel.z = U.smooth(this.vel.z, dir.z * sp, 14, dt);
        this.yaw = U.turn(this.yaw, Math.atan2(dir.x, dir.z), 1 - Math.exp(-16 * dt));
        if (this.state !== 'run') this.setState('run'); this.runT += dt;
      } else {
        this.vel.x = U.smooth(this.vel.x, 0, 16, dt); this.vel.z = U.smooth(this.vel.z, 0, 16, dt);
        if (this.state !== 'idle') this.setState('idle'); this.runT = 0;
        const o = this.opp; if (o && U.dist(this.pos, o.pos) < 9) this.faceOpp(1 - Math.exp(-6 * dt));
      }
      this.physics(dt, 0);
      if (!this.grounded) this.setState('air');
    }
    updAir(dt) {
      const S = this.st, dir = this.stick();
      if (this.tryActions(false)) return;
      if (dir) { this.vel.x = U.smooth(this.vel.x, dir.x * S.speed * 0.85, 4.5, dt); this.vel.z = U.smooth(this.vel.z, dir.z * S.speed * 0.85, 4.5, dt); this.yaw = U.turn(this.yaw, Math.atan2(dir.x, dir.z), 1 - Math.exp(-6 * dt)); }
      this.physics(dt, 0);
      if (this.grounded) { this.land(); }
    }
    land() {
      this.airJumps = this.st.airJumps; this.airDodges = this.st.airDodges; this.airStr = 0; this.airDashes = 0;
      this.setState('idle'); this.groundT = 0;
      if (this.vel.y < -8) { SFX.play('land'); FX.burst(_c.copy(this.pos).setY(0.05), { n: 5, color: this.m.arena.dust, speed: 2, size: 0.07, life: 0.4, up: 0.4 }); }
    }

    /* the buttons, from neutral (ground or air) */
    tryActions(ground) {
      const I = this.input, S = this.st;
      if (this.m.frozen || this.m.phase !== 'fight') return false;
      if (I.take('super') && this.hype >= 100 && ground) { this.startSuper(); return true; }
      if (I.take('special')) { if (this.uses > 0 && !this.broken.head && (ground || this.moveOk(S.special, 'air'))) { this.startMove(S.special, 'special'); return true; } else if (this.broken.head) this.m.call(this, 'NO HEAD!', 'bad'); }
      if (ground) {
        if (I.held.guard && I.take('light')) { this.startMove('throw', 'throw'); return true; }
        if (I.take('dodge') && this.dodgeCd <= 0) { this.startDodge(); return true; }
        if (I.take('jump')) { this.jump(1); return true; }
        if (I.take('light')) {
          const pw = this.pauseWin; this.pauseWin = null;
          if (pw && this.m.time >= pw.from && this.m.time <= pw.to) this.startMove(pw.id, 'light');   // the PAUSE branch
          else if (this.m.time - this.lastDodgeEnd < 0.3 || this.state === 'dodge') this.startMove(S.dashAtk, 'dash');
          else this.startLight();
          return true;
        }
        if (I.take('heavy')) { this.startMove(this.broken.armL ? 'tackle' : S.heavy, 'heavy'); return true; }
        if (I.held.guard) { this.setState('guard'); this.guardStart = this.m.time; return true; }
      } else {
        if (I.take('jump')) {
          if (this.wallTouch && S.perk === 'walljump') { this.wallJump(); return true; }
          if (this.airJumps > 0 && !this.broken.legs) { this.airJumps--; this.jump(0.85); return true; }
        }
        if (I.take('dodge') && this.airDodges > 0 && this.dodgeCd <= 0) { this.airDodges--; this.startDodge(); return true; }
        if (I.take('light') && !this.airStr) { this.airStr = 1; this.startMove(this.airRoot(), 'air'); return true; }
        if (I.take('heavy')) { this.startMove(this.broken.armL ? 'bodyDrop' : S.airHeavy, 'airHeavy'); return true; }
      }
      return false;
    }
    moveOk(id, where) { const mv = KB.MOVES[id]; return where !== 'air' || ['dash', 'proj', 'teleport', 'radial'].includes(mv.type); }
    jump(k) {
      this.vel.y = this.st.jump * k * (this.broken.legs ? 0.8 : 1); this.grounded = false; this.setState('air'); if (k < 1) this.airStr = 0;
      const d = this.stick(); if (d) { this.vel.x = d.x * this.st.speed * 0.9; this.vel.z = d.z * this.st.speed * 0.9; }
      SFX.play('jump');
      if (k < 1) FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.1), { r1: 0.9, life: 0.25, color: 0xffffff });
    }
    wallJump() {
      const w = this.wallTouch; this.vel.x = w.n.x * 8; this.vel.z = w.n.z * 8; this.vel.y = this.st.jump * 0.95;
      this.yaw = Math.atan2(w.n.x, w.n.z); this.airDodges = this.st.airDodges; this.airStr = 0; this.setState('air'); this.wallTouch = null;
      SFX.play('tech'); FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.8), { n: 6, color: 0xffffff, speed: 3, size: 0.06 });
      this.m.call(this, 'WALL JUMP', 'small');
    }

    /* ---------------------------------------------------------------- dodge */
    startDodge() {
      const d = this.stick() || this.forward.multiplyScalar(-1);
      this.dodgeDir = d.clone(); this.setState('dodge'); this.move = null;
      const vanish = this.st.passive === 'vanish';
      this.inv = (this.grounded ? 0.22 : 0.18) * (vanish ? 1.6 : 1);
      this.dodgeCd = vanish ? 0.33 : 0.55;
      this.dodgeAir = !this.grounded; SFX.play('dodge');
      if (vanish) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 8, color: 0x6a4a9a, speed: 2, size: 0.1, gravity: -2, life: 0.4 });
    }
    updDodge(dt) {
      const T = 0.3, dist = 3.3 * this.st.dodgeDist * (this.dodgeAir ? 0.8 : 1);
      const k = this.stateT < T ? (dist / T) * (1.5 - this.stateT / T) : 0;
      this.vel.x = this.dodgeDir.x * k; this.vel.z = this.dodgeDir.z * k;
      if (this.dodgeAir) this.vel.y = Math.max(this.vel.y, this.stateT < T ? 0.5 : this.vel.y);
      this.physics(dt, 0);
      if (this.stateT >= T + 0.1) { this.lastDodgeEnd = this.m.time; this.setState(this.grounded ? 'idle' : 'air'); return; }
      if (this.stateT > 0.12 && this.grounded && this.input.take('light')) { this.startMove(this.st.dashAtk, 'dash'); }
    }

    /* ---------------------------------------------------------------- guard */
    updGuard(dt) {
      const I = this.input;
      this.guardIdle = 0;
      if (this.riposte()) return;
      this.vel.x = U.smooth(this.vel.x, 0, 18, dt); this.vel.z = U.smooth(this.vel.z, 0, 18, dt);
      this.faceOpp(1 - Math.exp(-10 * dt));
      this.physics(dt, 0);
      if (I.take('light')) { this.startMove('throw', 'throw'); return; }
      if (I.take('dodge') && this.dodgeCd <= 0) { this.startDodge(); return; }
      if (I.take('jump')) { this.jump(1); return; }
      if (!I.held.guard) this.setState('idle');
    }
    /* SAMURAI signature: Light right after a Just Guard is an instant riposte */
    riposte() {
      if (!(this.riposteT > this.m.time) || this.broken.armR || !this.input.take('light', 0.2)) return false;
      this.riposteT = 0; this.startMove('kaeshi', 'light'); this.m.call(this, 'KAESHI!', 'counter'); SFX.play('slash'); return true;
    }

    /* --------------------------------------------------------------- attacks */
    lightRoot() { return this.broken.armR ? 'stump1' : this.st.light; }
    airRoot() { return this.broken.armR ? 'stumpAir' : this.st.air; }
    startLight() { this.startMove(this.lightRoot(), 'light'); }
    startMove(id, kind) {
      const mv = KB.MOVES[id]; if (!mv) return;
      this.move = mv; this.kind = kind; this.moveT = 0; this.hitSet = new Set(); this.moveHit = false; this.charge = 0; this.fired = false; this.activeOn = false;
      this.lastSub = -1; this.acExt = 0; this.extraHits = 0; this.rapidUsed = 0; this.pauseWin = null;
      if (mv.armorSU) this.armorT = Math.max(this.armorT, mv.su);
      if (kind === 'special') this.uses--;
      this.setState('attack'); this.aim(mv);
      if (kind === 'air' || kind === 'airHeavy') { this.vel.y = Math.max(this.vel.y, kind === 'air' ? 2.2 : 3); }
      if (mv.armor || (kind === 'dash' && this.st.perk === 'unstoppable')) this.armorT = mv.su + mv.ac;
      if (mv.inv) this.inv = Math.max(this.inv, mv.su + mv.ac + 0.04);
    }
    /* turn toward the stick, then snap onto the opponent if they are in front and close */
    aim(mv) {
      const d = this.stick(); if (d) this.yaw = Math.atan2(d.x, d.z);
      const o = this.opp; if (!o) return;
      const dist = U.dist(this.pos, o.pos), a = U.ang(this.pos, o.pos);
      const range = (mv.reach || 1.2) + (mv.lunge || 0) * 0.25 + 1.6 + (mv.range || 0) + (mv.dist || 0) * 0.6;
      if (dist < range && (!d || Math.abs(U.wrap(a - this.yaw)) < 0.95)) this.yaw = a;
      else if (!d && dist < 9) this.yaw = a;
    }
    dmgMult(kind) {
      const S = this.st; let m = { light: S.dmgR, air: S.dmgR, heavy: S.dmgL, launch: S.dmgL, airHeavy: S.dmgL, gun: S.dmgL, special: S.dmgH, dash: S.dmgG, super: S.dmgK, throw: 1 }[kind] || 1;
      m *= S.setDmg;
      if (this.buffs.momentum) m *= 1.1; if (this.buffs.fury) m *= 1.15;
      if (S.passive === 'bushido' && this.hp < this.maxHp * 0.35) m *= 1.15;
      if (S.passive === 'fury') m *= 1 + Math.min(0.18, (1 - this.hp / this.maxHp) * 0.24);
      return m;
    }
    updAttack(dt) {
      const mv = this.move, I = this.input;
      if (mv.type === 'super') return this.updSuper(dt);
      // hold Heavy to charge a KNOCK (up to 0.6 s); the VIKING's axe winds up any Light the same way (to 0.5 s)
      const heavyCharge = mv.charge && this.kind === 'heavy' && I.held.heavy && this.charge < 0.6;
      const lightCharge = mv.chargeL && this.kind === 'light' && I.held.light && this.charge < 0.5 && this.moveT > 0.03;
      if ((heavyCharge || lightCharge) && this.moveT >= mv.su * 0.6) {
        this.charge += dt; this.flash = 0.3; this.flashCol = lightCharge && this.charge >= 0.45 ? 0xff4020 : 0xffb030;
        if (lightCharge) this.armorT = Math.max(this.armorT, 0.05);
        if (Math.random() < 0.4) FX.burst(this.fig.socket(lightCharge ? 'wR' : 'wL', [0, 0, lightCharge ? 9 : 2]), { n: 1, color: 0xffd060, glow: true, speed: 1.5, size: 0.06, gravity: -3, life: 0.3 });
        this.vel.x *= 0.8; this.vel.z *= 0.8; this.physics(dt, 0); return;
      }
      // MONK signature, Flow: every hit of the running combo makes the strings faster
      const o0 = this.opp, flow = this.st.sig === 'flow' && (this.kind === 'light' || this.kind === 'air') && o0 && o0.combo.by === this ? 1 + Math.min(0.25, o0.combo.hits * 0.04) : 1;
      const t0 = this.moveT; this.moveT += dt * flow; const t = this.moveT;
      // mash Light during a rapid move to keep it going
      if (mv.rapid && t >= mv.su && t < mv.su + mv.ac + this.acExt && this.rapidUsed < mv.rapid && I.take('light', 0.12)) { this.rapidUsed++; this.acExt += 0.18; this.extraHits += 3; }
      const su = mv.su, ac = mv.ac + this.acExt, end = su + ac + mv.rc; this.curAc = ac;
      const F = this.forward;
      // movement through the move
      if (mv.type === 'dash' && t >= su && t < su + ac) { const sp = mv.dist / ac; this.vel.x = F.x * sp; this.vel.z = F.z * sp; if (!this.grounded) this.vel.y = 0; }
      else if (mv.lunge && t > su * 0.4 && t < su + ac) {
        // lunge in, but stop short of running past them
        const o = this.opp, near = o && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < (mv.reach || 1) * 0.85 && Math.abs(U.wrap(U.ang(this.pos, o.pos) - this.yaw)) < 1.2;
        const sp = near ? 0 : mv.lunge * (this.grounded ? 1 : 0.4); this.vel.x = U.smooth(this.vel.x, F.x * sp, 20, dt); this.vel.z = U.smooth(this.vel.z, F.z * sp, 20, dt); }
      else if (this.grounded) { this.vel.x = U.smooth(this.vel.x, 0, 14, dt); this.vel.z = U.smooth(this.vel.z, 0, 14, dt); }
      if (!this.grounded && (this.kind === 'air') && t < su + ac) this.vel.y = Math.max(this.vel.y, 0.6);
      if (this.kind === 'airHeavy' && t >= su) this.vel.y = Math.min(this.vel.y, -6);
      if (mv.dive && t >= su && !this.grounded) { this.vel.x = F.x * 7; this.vel.z = F.z * 7; this.vel.y = -12; }
      this.physics(dt, 0);
      // into the active frames
      if (t0 < su && t >= su) this.onActive(mv);
      if (t >= su && t < su + ac) this.activeFrames(mv);
      else if (t >= su + ac) this.activeOn = false;
      // cancels
      if (this.cancels(mv, t, su, ac)) return;
      const diving = this.kind === 'airHeavy' || mv.dive;
      if (t >= end || (diving && this.grounded && t > su)) {
        if (diving && this.grounded) { this.land(); FX.ring(_c.copy(this.pos).setY(0.05), { r1: 1.6, life: 0.3 }); SFX.play('land'); this.setState('idle'); this.vel.set(0, 0, 0); this.recoverT = 0.15; return; }
        // a string move with a pause branch: wait a beat, then Light
        const pw = this.kind === 'light' && mv.nx && mv.nx.p ? { id: mv.nx.p, from: this.m.time + 0.03, to: this.m.time + 0.6 } : null;
        this.move = null; this.setState(this.grounded ? 'idle' : 'air'); this.pauseWin = pw;
      } else if (this.grounded && (this.kind === 'air') && t > su) { this.move = null; this.land(); }
    }
    cancels(mv, t, su, ac) {
      const I = this.input, hit = this.moveHit, k = this.kind;
      const after = t >= su + ac * (mv.multi ? 0.85 : hit ? 0.3 : 1);
      const nx = mv.nx || {};
      if (k === 'light') {
        if (nx.l && after && I.take('light', 0.25)) { this.startMove(nx.l, 'light'); return true; }
        if (hit && t >= su + ac * 0.3 && I.take('heavy', 0.25)) {
          // Heavy in a string launches them up; held toward them, it's the KNOCK instead (back into the wall)
          const s = this.stick(), d0 = I.dirAt.heavy, s0 = d0 && Math.hypot(d0.x, d0.y) > 0.3 ? new V3(d0.x, 0, -d0.y).normalize() : null, o = this.opp;
          if ((s && s.dot(this.forward) > 0.5) || (s0 && s0.dot(this.forward) > 0.5)) this.startMove(this.broken.armL ? 'tackle' : this.st.heavy, 'heavy');
          // PIRATE with the Flintlock: a Quick Shot gun cancel instead, once a combo, then the string starts over
          else if (this.st.gunCancel && !this.broken.armL && o && !o.combo.gun) { o.combo.gun = true; this.startMove(this.st.gunCancel, 'gun'); }
          else this.startMove(this.broken.armL ? 'headbutt' : this.st.launch, 'launch');
          return true;
        }
      }
      if (k === 'gun' && t >= su + 0.05 && hit && I.take('light', 0.25)) { this.startLight(); return true; }
      if (k === 'air' && nx.l && after && I.take('light', 0.25)) { this.startMove(nx.l, 'air'); return true; }
      // NINJA signature: Dodge after an air hit dashes at them (twice a jump)
      if (k === 'air' && hit && this.st.sig === 'airdash' && (this.airDashes || 0) < 2 && t >= su + ac * 0.3 && I.take('dodge', 0.2)) {
        const o = this.opp; this.airDashes = (this.airDashes || 0) + 1; this.move = null; this.setState('air'); this.airStr = 0;
        if (o) { const d = _v.subVectors(o.pos, this.pos); d.y = 0; const l = d.length() || 1; this.vel.set(d.x / l * 9, Math.max(2.5, (o.pos.y - this.pos.y) * 4), d.z / l * 9); this.yaw = Math.atan2(d.x, d.z); }
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 10, color: 0x30243f, speed: 2.5, size: 0.1, gravity: -1, life: 0.35 }); SFX.play('dodge');
        return true;
      }
      if (k === 'air' && hit && t >= su + ac * 0.3 && I.take('heavy', 0.2)) { this.startMove(this.broken.armL ? 'bodyDrop' : this.st.airHeavy, 'airHeavy'); return true; }
      if (k === 'launch' && hit && t >= su + ac * 0.5 && I.take('jump', 0.3)) {
        this.move = null; const o = this.opp; this.vel.y = this.st.jump * 1.12; this.grounded = false; this.setState('air'); this.airStr = 0;
        if (o) { const d = _v.subVectors(o.pos, this.pos).setY(0); const l = d.length(); if (l > 0.01) { this.vel.x = d.x / l * Math.min(6, l * 3); this.vel.z = d.z / l * Math.min(6, l * 3); } }
        SFX.play('jump'); return true;
      }
      if (hit && after && ['light', 'heavy', 'launch', 'air', 'dash', 'gun'].includes(k)) {
        if (I.peek('special', 0.2) && this.uses > 0 && !this.broken.head && (this.grounded || this.moveOk(this.st.special, 'air'))) { I.take('special'); this.startMove(this.st.special, 'special'); return true; }
        if (I.peek('super', 0.2) && this.hype >= 100 && this.grounded) { I.take('super'); this.startSuper(); return true; }
      }
      // a free dodge out of a finished, landed string (after recovery mostly)
      return false;
    }
    onActive(mv) {
      const F = this.forward, o = this.opp;
      if (mv.sfx) SFX.play(mv.sfx === 'shot' ? 'whoosh' : mv.sfx === 'heavy' ? 'whoosh' : mv.sfx);
      this.activeOn = true;
      if (mv.type === 'proj') this.m.fire(this, mv, this.charge);
      else if (mv.type === 'radial') {
        FX.ring(_c.copy(this.pos).setY(0.1), { r1: mv.rad * 1.1, life: 0.35, color: 0xffe0a0 });
        if (o && U.dist(this.pos, o.pos) < mv.rad + BODY && Math.abs(o.pos.y - this.pos.y) < 2) Combat.hit(this, o, mv, { kind: this.kind, dir: _v.subVectors(o.pos, this.pos).setY(0).normalize().clone() });
        if (mv.buff) this.addBuff(mv.buff);
      } else if (mv.type === 'buff') this.addBuff(mv.buff);
      else if (mv.type === 'teleport') {
        if (o && U.dist(this.pos, o.pos) < mv.range && o.state !== 'out') {
          FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 12, color: 0x30243f, speed: 3, size: 0.12, gravity: -1, life: 0.45 });
          const of = fwd(o.yaw); this.pos.set(o.pos.x - of.x * 1.0, Math.max(0, o.pos.y), o.pos.z - of.z * 1.0);
          this.clampInside(); this.yaw = U.ang(this.pos, o.pos); this.vel.set(0, 0, 0);
          FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 12, color: 0x30243f, speed: 3, size: 0.12, gravity: -1, life: 0.45 });
          SFX.play('dodge');
        }
      } else if (mv.type === 'dash') {
        this.dashFrom = this.pos.clone();
        FX.burst(_c.copy(this.pos).setY(0.9), { n: 8, color: 0xffffff, speed: 2, size: 0.06, life: 0.3 });
      }
      // NINJA Vanishing Stab: blink to their far side, so the hit carries them back the other way
      if (mv.cross && o && U.dist(this.pos, o.pos) < (mv.reach || 1) + 1.8 && !['out', 'ko', 'down'].includes(o.state)) {
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 10, color: 0x30243f, speed: 3, size: 0.11, gravity: -1, life: 0.4 });
        const d = _v.subVectors(o.pos, this.pos).setY(0); if (d.lengthSq() < 0.01) d.copy(F); d.normalize();
        this.pos.set(o.pos.x + d.x * 0.95, Math.max(0, this.pos.y), o.pos.z + d.z * 0.95); this.clampInside();
        this.yaw = U.ang(this.pos, o.pos); this.vel.x = this.vel.z = 0; SFX.play('dodge');
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 10, color: 0x30243f, speed: 3, size: 0.11, gravity: -1, life: 0.4 });
      }
      if (this.kind === 'light' && mv.id && Math.random() < 0) this.m.call(this, mv.name);
    }
    activeFrames(mv) {
      const o = this.opp; if (!o) return;
      // a multi-hit move hits again every slice of its active time; only the last hit carries the real knockback
      let use = mv;
      if (mv.multi) {
        const n = mv.multi + (this.extraHits || 0), idx = Math.min(n - 1, Math.floor((this.moveT - mv.su) / ((this.curAc || mv.ac) / n)));
        if (idx > this.lastSub) { this.lastSub = idx; this.hitSet.delete(o); }
        if (idx < n - 1) use = Object.assign({}, mv, { kb: [1, 0], launch: 0, spike: 0, crumple: 0, dizzy: 0, finisher: 0, stun: 0.32 });
      }
      if (this.hitSet.has(o)) return;
      if (mv.type === 'melee' || mv.type === 'teleport' || mv.type === 'grab') {
        const F = this.forward, c = mv.around ? _c.set(this.pos.x, this.pos.y + 1, this.pos.z) : _c.set(this.pos.x + F.x * mv.reach, this.pos.y + mv.h, this.pos.z + F.z * mv.reach);
        if (Combat.overlap(c, mv.rad, o)) {
          this.hitSet.add(o);
          if (mv.type === 'grab') return this.tryGrab(o);
          const dir = mv.around ? _v.subVectors(o.pos, this.pos).setY(0).normalize().clone() : null;
          Combat.hit(this, o, use, { kind: this.kind, charge: this.charge, at: c.clone(), dir: dir && dir.lengthSq() > 0.5 ? dir : null, multiHit: use !== mv });
        }
      } else if (mv.type === 'dash') {
        // anything along the dash path
        const a = this.dashFrom || this.pos, b = this.pos;
        const p = Combat.closestOnSeg(a, b, _w.copy(o.pos).setY(o.pos.y + 0.9));
        if (p.distanceTo(_v.copy(o.pos).setY(o.pos.y + 0.9)) < mv.rad + BODY) { this.hitSet.add(o); Combat.hit(this, o, mv, { kind: this.kind, at: p.clone() }); }
      }
      // weapon trail
      if (mv.trail) { const w = this.isLeftMove() ? 'wL' : 'wR', T = this.isLeftMove() ? this.trailL : this.trailR; if (!this.fig.detached[w === 'wL' ? 'armL' : 'armR']) T.push(this.fig.socket(w, [0, 0, 3]), this.fig.socket(w, [0, 0, w === 'wR' ? 14 : 10])); }
    }
    isLeftMove() { if (this.move && this.move.twoHand) return false; return ['heavy', 'launch', 'airHeavy', 'gun'].includes(this.kind) || (this.move && /^(jabL|heavyDiag|bash|shoot)/.test(this.move.pose)); }
    addBuff(b) {
      if (b.id === 'bulwark') { this.armorT = b.t; this.buffs.bulwark = b.t; this.m.call(this, 'BULWARK', 'buff'); FX.ring(_c.copy(this.pos).setY(1), { r1: 1.6, normal: new V3(0, 1, 0), color: 0x66aaff }); }
      if (b.id === 'fury') { this.buffs.fury = b.t; this.m.call(this, 'FURY', 'buff'); }
      if (b.id === 'mantra') {
        const heal = Math.round(this.maxHp * b.heal); this.hp = Math.min(this.maxHp, this.hp + heal);
        for (const k in this.armor) if (!this.broken[k]) this.armor[k] = Math.min(this.armorMax[k], this.armor[k] + this.armorMax[k] * b.repair);
        this.m.call(this, '+' + heal + ' HP', 'heal');
        FX.burst(_c.copy(this.pos).setY(1), { n: 20, color: [0x66ffcc, 0xffffff, 0xffe080], glow: true, speed: 2.5, gravity: -4, life: 0.8, size: 0.07 });
      }
    }
    tryGrab(o) {
      if (o.inHitstun || o.airborne || o.state === 'dodge' || o.state === 'down' || o.state === 'getup' || o.inv > 0) return;
      // two figures throwing at once: a throw tech, both pushed apart
      if (o.state === 'attack' && o.move && o.move.type === 'grab' && o.moveT < o.move.su + o.move.ac) {
        for (const f of [this, o]) { f.move = null; f.setState('hit'); f.hitstun = 0.25; const d = _v.subVectors(f.pos, f === this ? o.pos : this.pos).setY(0).normalize(); f.vel.x = d.x * 7; f.vel.z = d.z * 7; }
        SFX.play('jguard'); this.m.call(this, 'THROW TECH', 'tech'); return;
      }
      o.move = null; o.setState('held'); o.held = { by: this, kind: 'throw' }; o.heldBySuper = false;
      this.throwing = o; this.throwT = 0; this.moveT = this.move.su + this.move.ac; // into the recovery
      this.move = Object.assign({}, this.move, { pose: 'hurl' });
      SFX.play('guard');
    }

    /* the Legend Art */
    startSuper() {
      const mv = KB.MOVES[this.st.super];
      this.hype -= 100; this.move = mv; this.kind = 'super'; this.moveT = 0; this.hitSet = new Set(); this.moveHit = false; this.superPhase = 'start';
      this.setState('attack'); this.aim(Object.assign({}, mv, { range: 8 })); this.inv = 0.9; this.vel.set(0, 0, 0);
      this.m.superFreeze(this, mv);
    }
    updSuper(dt) {
      const mv = this.move, F = this.forward, o = this.opp;
      this.moveT += dt; const t = this.moveT;
      if (this.superPhase === 'start') {
        this.physics(dt, 14);
        if (t >= mv.su) {
          this.superPhase = 'catch'; this.catchT = 0; this.dashFrom = this.pos.clone();
          if (mv.catchType === 'proj') { this.m.fire(this, Object.assign({}, mv, { proj: 'superShot' }), 0); }
          if (mv.catchType === 'radial' && mv.leap && o) { const d = _v.subVectors(o.pos, this.pos).setY(0); const l = Math.min(6, d.length()); d.normalize(); this.vel.set(d.x * l / 0.45, 11, d.z * l / 0.45); this.grounded = false; }
          SFX.play('whoosh');
        }
        return;
      }
      if (this.superPhase === 'catch') {
        this.catchT += dt;
        let caught = false;
        if (mv.catchType === 'dash') {
          const sp = mv.dist / 0.2; if (this.catchT < 0.2) { this.vel.x = F.x * sp; this.vel.z = F.z * sp; } else { this.vel.x *= 0.5; this.vel.z *= 0.5; }
          this.physics(dt, 0);
          if (o && o.inv <= 0 && !['ko', 'out', 'down'].includes(o.state)) { const p = Combat.closestOnSeg(this.dashFrom, this.pos, _w.copy(o.pos).setY(o.pos.y + 0.9)); if (p.distanceTo(_v.copy(o.pos).setY(o.pos.y + 0.9)) < mv.rad + BODY) caught = true; }
          if (this.catchT < 0.2) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 2, color: 0xffffff, speed: 1, size: 0.08, life: 0.25 });
        } else if (mv.catchType === 'melee') {
          if (this.catchT < 0.18) { this.vel.x = F.x * mv.lunge; this.vel.z = F.z * mv.lunge; } this.physics(dt, 8);
          if (o && o.inv <= 0 && !['ko', 'out', 'down'].includes(o.state) && Combat.overlap(_c.set(this.pos.x + F.x * mv.reach, this.pos.y + 1, this.pos.z + F.z * mv.reach), mv.rad, o)) caught = true;
        } else if (mv.catchType === 'radial') {
          this.physics(dt, 0);
          if (this.grounded && this.catchT > 0.1) {
            FX.ring(_c.copy(this.pos).setY(0.1), { r1: mv.rad * 1.2, life: 0.45, color: 0xffd080 }); FX.addShake(0.8); SFX.play('boom');
            FX.burst(_c.copy(this.pos).setY(0.1), { n: 30, color: this.m.arena.dust, speed: 7, size: 0.14, life: 0.8 });
            if (o && o.inv <= 0 && U.dist(this.pos, o.pos) < mv.rad + BODY && o.pos.y < 1.5 && !['ko', 'out', 'down'].includes(o.state)) caught = true;
            if (!caught) { this.superPhase = 'miss'; this.missT = 0; return; }
          }
        } else if (mv.catchType === 'proj') { this.physics(dt, 14); if (this.superCaught) caught = true; }
        if (caught && o.state !== 'held') { this.beginSeq(o); return; }
        if (this.catchT > 0.55 && !caught) { this.superPhase = 'miss'; this.missT = 0; }
        return;
      }
      if (this.superPhase === 'seq') return this.updSeq(dt);
      if (this.superPhase === 'miss') { this.missT += dt; this.physics(dt, 12); if (this.missT > 0.5) { this.move = null; this.setState(this.grounded ? 'idle' : 'air'); } }
    }
    beginSeq(o) {
      // guarding doesn't stop a Legend Art that has caught you
      o.move = null; o.setState('held'); o.held = { by: this, kind: 'super' }; o.heldBySuper = true; o.vel.set(0, 0, 0);
      if (!o.comboing) o.combo = o.freshCombo();
      this.superPhase = 'seq'; this.seqT = 0; this.seqHits = 0; this.seqVictim = o; this.seqDir = this.forward.clone(); this.seqStart = this.pos.clone();
      this.inv = 9; SFX.play('hit', { power: 2 }); FX.addShake(0.5);
      this.m.call(o, KB.MOVES[this.st.super].name.toUpperCase(), 'super');
    }
    updSeq(dt) {
      const o = this.seqVictim, mv = this.move, D = this.seqDir; this.seqT += dt; const t = this.seqT;
      const tick = (n, dur) => { const k = Math.floor(t / (dur / n)); if (k > this.seqHits && k <= n) { this.seqHits = k; return true; } return false; };
      const small = (pos) => { const dmg = mv.dmg * 0.06; Combat.seqTick(this, o, dmg, pos); };
      let done = false;
      const seq = mv.seq;
      if (seq === 'cuts') {
        o.pos.y = U.lerp(o.pos.y, 0.6, 0.1);
        if (tick(8, 1.0)) { const a = this.seqHits * 2.4; this.pos.set(o.pos.x + Math.sin(a) * 1.3, 0, o.pos.z + Math.cos(a) * 1.3); this.yaw = U.ang(this.pos, o.pos); this.pose2 = this.seqHits % 2 ? 'slashA' : 'slashB'; small(); this.trailR.push(this.fig.socket('wR', [0, 0, 3]), this.fig.socket('wR', [0, 0, 14])); SFX.play('slash'); }
        if (t > 1.05) { this.pos.set(o.pos.x - D.x * 1.2, 0, o.pos.z - D.z * 1.2); this.yaw = Math.atan2(D.x, D.z); done = true; }
      } else if (seq === 'charge') {
        const sp = 13; this.vel.set(D.x * sp, 0, D.z * sp); this.physics(dt, 0);
        o.pos.set(this.pos.x + D.x * 1.3, 0.4, this.pos.z + D.z * 1.3);
        if (tick(5, 0.8)) small();
        const nearWall = this.m.arena.walls.some(w => !w.broken && w.sign * o.pos[w.axis] > w.lim - 1.0);
        if (t > 0.85 || nearWall) done = true;
      } else if (seq === 'cannon') {
        o.pos.y = U.lerp(o.pos.y, 0.2, 0.1);
        if (tick(5, 1.1)) { this.m.cannonball(o.pos.clone()); small(); }
        if (t > 1.2) done = true;
      } else if (seq === 'hundred') {
        o.pos.set(this.pos.x + D.x * 1.05, Math.max(0, o.pos.y), this.pos.z + D.z * 1.05);
        if (tick(12, 1.0)) { this.pose2 = this.seqHits % 2 ? 'jabL' : 'jabR'; this.poseT = 0; small(_c.set(o.pos.x - D.x * 0.3 + U.rnd(-0.3, 0.3), 1 + U.rnd(-0.4, 0.4), o.pos.z - D.z * 0.3 + U.rnd(-0.3, 0.3)).clone()); }
        if (t > 1.05) { this.pose2 = 'palm'; done = true; }
      } else if (seq === 'quake') {
        o.pos.y = U.lerp(o.pos.y, 1.1, 0.08);
        if (tick(3, 0.6)) { FX.ring(_c.copy(this.pos).setY(0.1), { r1: 3, life: 0.3, color: 0xffd080 }); FX.addShake(0.5); SFX.play('heavy'); small(); }
        if (t > 0.7) done = true;
      } else if (seq === 'clones') {
        o.pos.y = U.lerp(o.pos.y, 0.5, 0.1);
        if (tick(4, 1.0)) { this.m.clone(this, o, this.seqHits); small(); }
        if (t > 1.05) { this.pos.set(o.pos.x - D.x * 1.1, 0, o.pos.z - D.z * 1.1); this.yaw = Math.atan2(D.x, D.z); done = true; }
      }
      if (done) {
        o.held = null; o.heldBySuper = false;
        const fin = Object.assign({}, mv, { dmg: mv.dmg * 0.52, type: 'melee' });
        Combat.hit(this, o, fin, { kind: 'super', dir: D.clone(), force: true, at: _c.copy(o.pos).setY(o.pos.y + 1).clone() });
        this.inv = 0.25; this.pose2 = null;
        this.superPhase = 'end'; this.move = Object.assign({}, mv, { type: 'melee', su: 0, ac: 0, rc: 0.4 }); this.kind = 'super-end'; this.moveT = 0;
        this.setState('attack');
      }
    }

    /* while held (thrown, or in a Legend Art) */
    updHeld(dt) {
      const h = this.held; if (!h) { this.setState('idle'); return; }
      const by = h.by;
      if (h.kind === 'throw') {
        const F = by.forward; this.pos.set(by.pos.x + F.x * 0.9, 0.35, by.pos.z + F.z * 0.9);
        by.throwT = (by.throwT || 0) + dt;
        if (by.throwT > 0.32) {
          this.held = null; by.throwing = null;
          let dir = by.stick() || F.clone();
          Combat.hit(by, this, KB.MOVES.throw, { kind: 'throw', dir, force: true });
        }
      }
    }

    snapCancel() {
      this.hype -= 50; this.move = null; this.setState(this.grounded ? 'idle' : 'air');
      if (!this.grounded) this.vel.y = Math.max(this.vel.y, 2);
      const o = this.opp; if (o && U.dist(this.pos, o.pos) < 5) o.slowT = 0.5;
      SFX.play('snap'); this.m.call(this, 'SNAP!', 'snap'); this.m.hitstopAll(0.06);
      FX.ring(_c.copy(this.pos).setY(1), { r1: 2.6, life: 0.3, normal: this.m.camDir(), color: 0x7cf9ff });
      this.flash = 0.25; this.flashCol = 0x7cf9ff;
    }
    doBurst() {
      this.burst = 0; this.move = null; this.held = null; this.setState('burst'); this.inv = 0.5; this.endCombo();
      this.vel.set(0, this.grounded ? 0 : 3, 0); this.hitstun = 0;
      SFX.play('burst'); this.m.call(this, 'SPRING BURST!', 'burst'); FX.addShake(0.6); this.m.hitstopAll(0.08);
      const c = _c.copy(this.pos).setY(this.pos.y + 0.9);
      FX.ring(c, { r1: 3.4, life: 0.4, normal: this.m.camDir(), color: 0x7cf9ff }); FX.ring(c.clone(), { r1: 3.2, life: 0.45, color: 0xffffff });
      FX.burst(c, { n: 24, color: [0x7cf9ff, 0xffffff], glow: true, speed: 8, size: 0.08, life: 0.5, gravity: 0 });
      const o = this.opp;
      if (o && U.dist(this.pos, o.pos) < 3.3 && Math.abs(o.pos.y - this.pos.y) < 2.6) {
        if (o.state === 'held' && o.held && o.held.by === this) { o.held = null; }
        const d = _v.subVectors(o.pos, this.pos).setY(0); if (d.lengthSq() < 0.01) d.copy(fwd(this.yaw)); d.normalize();
        if (o.state === 'guard' && Combat.facing(o, this.pos)) { o.setState('guardstun'); o.hitstun = 0.3; o.vel.x = d.x * 6; o.vel.z = d.z * 6; SFX.play('jguard'); this.m.call(o, 'BURST BAITED', 'tech'); this.hitstun = 0.5; }
        else Combat.hit(this, o, { id: 'burst', dmg: 0, kb: [14, 8], launch: 1, zone: 'mid', hype: 0 }, { kind: 'burst', dir: d.clone(), force: true, noCombo: true });
      }
      if (this.throwing) this.throwing = null;
    }
    endCombo() {
      const c = this.combo;
      if (c.hits >= 2 && c.by) { c.by.records.maxCombo = Math.max(c.by.records.maxCombo, c.hits); c.by.records.maxBounces = Math.max(c.by.records.maxBounces, c.bounces); }
      this.combo = this.freshCombo();
    }

    /* --------------------------------------------------------------- tumble */
    updTumble(dt) {
      this.hitstun -= dt; this.floatT = Math.max(0, (this.floatT || 0) - dt);
      const g = GRAV * (0.68 + Math.min(0.7, this.combo.hits * 0.03 + this.combo.t * 0.05)) * (this.floatT > 0 ? 0.45 : 1);
      this.physics(dt, 0, 1, g);
      if (!this.spiked && this.vel.y < -11) this.vel.y = -11;
      const sp = Math.hypot(this.vel.x, this.vel.z);
      this.spin.rotation.x -= dt * (4 + sp * 0.7);
      // air recovery once hitstun runs out
      const I = this.input;
      const timeout = this.hitstun <= 0 && this.combo.t > 5.5;
      if (this.hitstun <= 0 && !this.out && (timeout || I.take('jump', 0.1) || I.take('dodge', 0.1) || I.take('light', 0.1) || I.take('heavy', 0.1) || I.take('guard', 0.1))) {
        this.endCombo(); this.setState('air'); this.inv = 0.2; this.vel.y = Math.max(this.vel.y, 4); this.vel.x *= 0.4; this.vel.z *= 0.4;
        this.spin.rotation.x = 0; SFX.play('tech'); this.m.call(this, 'RECOVER', 'small'); return;
      }
      if (this.grounded) {
        if (this.spiked && !this.combo.gb) {
          this.combo.gb = true; this.spiked = false; this.grounded = false; this.pos.y = 0.01;
          this.vel.y = 8.5; this.vel.x *= 0.5; this.vel.z *= 0.5; this.hitstun = 0.55 * Combat.decay(this);
          Combat.bounceDamage(this, 12); SFX.play('heavy'); FX.addShake(0.35);
          FX.burst(_c.copy(this.pos).setY(0.05), { n: 14, color: this.m.arena.dust, speed: 4, size: 0.1 }); FX.ring(_c.copy(this.pos).setY(0.06), { r1: 1.8, life: 0.3 });
          this.m.call(this, 'GROUND BOUNCE', 'bounce');
          return;
        }
        this.spin.rotation.x = 0;
        if (!this.hardKD && I.take('dodge', 0.3) && this.hp > 0) {
          this.endCombo(); this.inv = 0.35; const d = this.stick() || fwd(this.yaw).multiplyScalar(-1);
          this.dodgeDir = d.clone(); this.dodgeAir = false; this.setState('dodge'); this.m.call(this, 'QUICK RISE', 'small'); SFX.play('tech'); return;
        }
        this.setState('down'); this.vel.x *= 0.3; this.vel.z *= 0.3; SFX.play('land'); FX.addShake(0.15);
        FX.burst(_c.copy(this.pos).setY(0.05), { n: 8, color: this.m.arena.dust, speed: 2.5, size: 0.08 });
      }
    }

    /* outside the arena after a WALL BREAK: fall, then drop back in */
    updOut(dt) {
      this.physics(dt, 0, 1, GRAV, true);
      this.spin.rotation.x -= dt * 6;
      if ((this.pos.y < this.m.arena.outY + 0.6 || this.stateT > 1.5) && !this.outDone) { this.outDone = true; this.m.ringOut(this); }
    }

    /* ------------------------------------------------------------- physics */
    physics(dt, friction, drag, g, noFloor) {
      if (friction) { const k = Math.exp(-friction * dt); this.vel.x *= k; this.vel.z *= k; }
      if (drag) { const k = Math.exp(-drag * dt); this.vel.x *= k; this.vel.z *= k; }
      if (!this.grounded || this.vel.y > 0) this.vel.y -= (g || GRAV) * dt;
      this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
      const A = this.m.arena, inside = Math.abs(this.pos.x) <= A.W + 0.05 && Math.abs(this.pos.z) <= A.D + 0.05;
      if (!noFloor && inside && this.pos.y <= 0 && this.vel.y <= 0) {
        if (!this.grounded && this.vel.y < -1) this.landSpeed = this.vel.y;
        this.pos.y = 0; this.vel.y = 0; this.grounded = true;
      } else if (this.pos.y > 0.001 || !inside) this.grounded = false;
    }
    clampInside() { const A = this.m.arena; this.pos.x = U.clamp(this.pos.x, -A.W + BODY, A.W - BODY); this.pos.z = U.clamp(this.pos.z, -A.D + BODY, A.D - BODY); }
    collide() {
      if (this.state === 'out') return;
      const A = this.m.arena; this.wallTouch = null;
      for (const w of A.walls) {
        const p = w.sign * this.pos[w.axis], lim = w.lim - BODY;
        if (p <= lim) { if (!this.grounded && p > lim - 0.2) this.wallTouch = w; continue; }
        const speedIn = w.sign * this.vel[w.axis];
        if (w.broken) {
          if (this.state === 'tumble' || this.state === 'ko') { if (p > w.lim + 0.1) { this.setState('out'); this.outDone = false; this.endCombo(); } continue; }
        }
        if ((this.state === 'tumble' || this.state === 'ko') && speedIn > 6 && !w.broken) { Combat.wallImpact(this, w, speedIn); continue; }
        this.pos[w.axis] = w.sign * lim; if (speedIn > 0) this.vel[w.axis] = 0;
        if (!this.grounded) this.wallTouch = w;
      }
    }

    /* ------------------------------------------------------------ animation */
    shakeFig() { this.fig.root.position.x = (Math.random() - 0.5) * 0.06 * (this.inHitstun ? 1 : 0.3); }
    animate(dt) {
      this.fig.root.position.x = 0;
      this.obj.rotation.y = this.yaw;
      let pose, rate = 18;
      const R = this.ready, st = this.state;
      if (st === 'attack' && this.move) {
        const mv = Object.assign({}, this.move, { ac: this.move.ac + (this.acExt || 0) }), t = this.moveT;
        let P = Anim.P[this.pose2 || mv.pose] || Anim.P.slashA;
        if (P.alt && t >= mv.su && t < mv.su + mv.ac) P = Anim.P[P.alt[Math.floor((t - mv.su) / 0.06) % P.alt.length]];
        if (this.kind === 'super' && this.superPhase === 'seq' && this.pose2) { pose = Anim.blend(R, Anim.P[this.pose2].strike, 1, R); rate = 40; }
        else if (t < mv.su || (this.kind === 'super' && this.superPhase === 'start')) { pose = Anim.blend(R, P.wind, 1, R); rate = 14 + 6 / Math.max(0.05, mv.su); }
        else if (t < mv.su + mv.ac + mv.rc * 0.35) { const alt = this.kind === 'air' && this.altPose && mv.pose === 'slashA' ? Anim.P.slashB : P; pose = Anim.blend(R, alt.strike, 1, R); rate = 46; }
        else { const k = U.clamp((t - mv.su - mv.ac) / Math.max(0.01, mv.rc), 0, 1); pose = Anim.blend((P.strike), R, U.ease(k), R); rate = 20; }
        if (P.spin && t >= mv.su && t < mv.su + mv.ac + 0.05) this.spin.rotation.y = -((t - mv.su) / (mv.ac + 0.05)) * Math.PI * 2; else this.spin.rotation.y = U.smooth(this.spin.rotation.y, 0, 20, dt);
        if (!this.grounded && this.kind !== 'airHeavy') pose.legL = [-0.8, 0, 0.1];
      } else {
        this.spin.rotation.y = U.smooth(this.spin.rotation.y, 0, 20, dt);
        if (st === 'run') { this.phase += dt * (6 + this.st.speed); pose = Anim.run(R, this.phase, Math.hypot(this.vel.x, this.vel.z), this.build.armR.line); }
        else if (st === 'idle') { pose = Anim.fill(R); const b = Math.sin(this.m.time * 2.4 + this.idx) * 0.25; pose.hy += b; pose.torso[0] += b * 0.04; }
        else if (st === 'air') pose = Anim.blend(R, this.vel.y > 0 ? Anim.STATE.air : Anim.STATE.fall, 1, R);
        else if (st === 'guard' || st === 'guardstun') pose = Anim.fill(Anim.STATE.guard);
        else if (st === 'gbreak') { pose = Anim.fill(Anim.STATE.stunned); pose.head[1] = Math.sin(this.stateT * 9) * 0.4; }
        else if (st === 'dodge') pose = Anim.fill(Anim.STATE.dodge);
        else if (st === 'hit' && this.crumpled) { pose = Anim.fill(Anim.STATE.crumple); rate = 9; }
        else if (st === 'hit' && this.dizzy) { pose = Anim.fill(Anim.STATE.stunned); pose.head[1] = Math.sin(this.stateT * 8) * 0.5; pose.armL = [-2.2, 0, -0.6]; rate = 10; }
        else if (st === 'hit' || st === 'held') { pose = Anim.fill(Anim.STATE.flinch); rate = 30; }
        else if (st === 'tumble' || st === 'out') { pose = Anim.fill(Anim.STATE.tumble); rate = 24; }
        else if (st === 'down' || st === 'ko') pose = Anim.fill(Anim.STATE.down);
        else if (st === 'getup') pose = Anim.fill(Anim.STATE.crouch);
        else if (st === 'burst') pose = Anim.blend(R, this.stateT < 0.08 ? Anim.P.burst.wind : Anim.P.burst.strike, 1, R);
        else if (st === 'victory') pose = Anim.fill(Anim.STATE.victory);
        else pose = Anim.fill(R);
      }
      // lying down: tip the whole figure on its back
      const lying = st === 'down' || (st === 'ko' && this.grounded);
      if (lying) { this.spin.rotation.x = U.smooth(this.spin.rotation.x, -Math.PI / 2, 12, dt); this.spin.position.y = U.smooth(this.spin.position.y, 0.2, 12, dt); }
      else if (st !== 'tumble' && st !== 'out' && st !== 'ko') { this.spin.rotation.x = U.smooth(this.spin.rotation.x, st === 'dodge' && !this.grounded ? -Math.PI * 2 * U.clamp(this.stateT / 0.3, 0, 1) : 0, st === 'dodge' ? 40 : 14, dt); this.spin.position.y = U.smooth(this.spin.position.y, 0.95, 14, dt); }
      if (st === 'getup') this.spin.rotation.x = U.smooth(this.spin.rotation.x, 0, 16, dt);
      Anim.drive(this.fig, pose, dt, rate);
      this.holster(dt);
      // the hit flash and status glows
      this.flash = Math.max(0, this.flash - dt * 5);
      let e = this.flash, col = this.flashCol;
      if (this.armorT > 0 && !e) { e = 0.18 + Math.sin(this.m.time * 20) * 0.06; col = 0xff9a30; }
      if (this.buffs.momentum && !e) { e = 0.1 + Math.sin(this.m.time * 8) * 0.05; col = 0xffd040; }
      if (this.inv > 0 && (st === 'getup' || this.respawnInv) && !e) { e = (Math.sin(this.m.time * 30) > 0 ? 0.25 : 0); col = 0xffffff; }
      this.fig.mat.emissive.setHex(col).multiplyScalar(e);
    }

    /* the Flintlock stays holstered until it fires, and the Cutlass is put away while it is out */
    holster(dt) {
      const L = KB.PARTS[this.build.armL.line].armL; if (!L.holster) return;
      const drawn = this.state === 'attack' && this.move && ['heavy', 'launch', 'airHeavy', 'gun'].includes(this.kind) && !this.broken.armL;
      this.drawnT = drawn ? 0.25 : Math.max(0, (this.drawnT || 0) - dt);
      const out = this.drawnT > 0, wL = this.fig.parts.wL, wR = this.fig.parts.wR;
      if (wL.visible !== out) { wL.visible = out; if (!this.fig.detached.armL) FX.burst(this.fig.socket('armL', [0, -9, 0]), { n: 4, color: 0xd8d0c0, speed: 1.2, size: 0.06, life: 0.3, gravity: -1 }); }
      if (this.build.armR.line === 'pirate') wR.visible = !out;
    }
    dispose() { this.fig.dispose(); this.trailR.dispose(); this.trailL.dispose(); if (this.obj.parent) this.obj.parent.remove(this.obj); this.brokenMat.dispose(); }
  }

  /* =========================================================== COMBAT ======= */
  const Combat = {
    /* a hit sphere against a figure (two hurt spheres up its body, one when tumbling) */
    overlap(c, r, o) {
      if (o.state === 'tumble' || o.state === 'held' || o.state === 'out') { for (const y of [0.45, 1.35]) { const h = _v.copy(o.pos); h.y += y; if (c.distanceTo(h) < r + 0.6) return true; } return false; }
      if (o.state === 'down' || (o.state === 'ko' && o.grounded)) return false;
      for (const y of [0.5, 1.35]) { const h = _v.copy(o.pos); h.y += y; if (c.distanceTo(h) < r + 0.48) return true; }
      return false;
    },
    closestOnSeg(a, b, p) { const ab = _c.subVectors(b, a), l2 = ab.lengthSq(); const t = l2 ? U.clamp(_v.subVectors(p, a).dot(ab) / l2, 0, 1) : 0; return new V3().copy(a).addScaledVector(ab, t).setY(a.y + 0.9); },
    facing(f, from) { const a = U.ang(f.pos, from); return Math.abs(U.wrap(a - f.yaw)) < 1.9; },
    decay(v) { return Math.max(0.42, 1 - v.combo.t * 0.07 - v.combo.hits * 0.012); },
    prorate(v) { return Math.max(0.3, Math.pow(0.93, v.combo.hits)); },
    /* the zone a hit strikes decides which part's armour takes it */
    zonePart(att, vic, zone) {
      if (zone === 'high') return 'head'; if (zone === 'low') return 'legs';
      // mid: the arm on the side facing the attacker
      const a = U.wrap(U.ang(vic.pos, att.pos) - vic.yaw);
      const side = a > 0 ? 'armL' : 'armR';
      return vic.broken[side] ? (vic.broken[side === 'armL' ? 'armR' : 'armL'] ? null : (side === 'armL' ? 'armR' : 'armL')) : side;
    },

    hit(att, vic, mv, o) {
      o = o || {};
      const m = att.m;
      if (!o.force && (vic.inv > 0 || ['ko', 'out', 'down', 'getup'].includes(vic.state))) return 'miss';
      if (vic.state === 'held' && !o.force && !(vic.held && vic.held.by === att)) return 'miss';
      const atPos = o.at || _c.copy(vic.pos).setY(vic.pos.y + 1).clone();
      let dir = o.dir ? o.dir.clone() : fwd(att.yaw);
      if (o.dir == null && mv.launch && att.stick && !o.proj) { const s = att.stick(); if (s) dir = dir.multiplyScalar(0.35).addScaledVector(s, 0.65).normalize(); }
      if (mv.kbBack) dir.copy(fwd(att.yaw)).multiplyScalar(-1);
      dir.y = 0; if (dir.lengthSq() < 1e-4) dir.copy(fwd(att.yaw)); dir.normalize();

      // ---- guard
      const guarding = (vic.state === 'guard' || vic.state === 'guardstun') && !o.force && Combat.facing(vic, o.from || att.pos);
      if (guarding && mv.type !== 'grab') {
        let just = vic.state === 'guard' && m.time - (vic.guardStart || -9) < 0.12;
        const cpu = vic.input.cpu; if (just && cpu && cpu.lv != null && !cpu.dummy && Math.random() > [0.1, 0.22, 0.35, 0.5][cpu.lv]) just = false;
        const raw = mv.dmg * att.dmgMult(o.kind);
        if (just) {
          vic.setState('guardstun'); vic.hitstun = 0.08; vic.hype = Math.min(100, vic.hype + 10);
          att.hitstop = 0.12; vic.hitstop = 0.12; if (att.state === 'attack' && !o.proj) { att.moveT = Math.max(att.moveT, att.move ? att.move.su + att.move.ac : 0); const d = _v.subVectors(att.pos, vic.pos).setY(0).normalize(); att.vel.x = d.x * 6; att.vel.z = d.z * 6; }
          SFX.play('jguard'); m.call(vic, 'JUST GUARD', 'tech'); vic.flash = 0.5; vic.flashCol = 0x9fe8ff;
          if (vic.st.sig === 'riposte') vic.riposteT = m.time + 0.4;
          FX.spark(atPos, { color: 0x9fe8ff, size: 1.4 });
          return 'jguard';
        }
        const chip = Math.round(raw * 0.12 * vic.st.chip);
        vic.hp = Math.max(1, vic.hp - chip); vic.guardHp -= raw * (mv.launch ? 1.0 : 0.7); vic.guardIdle = 0;
        if (vic.broken.armL === false) vic.armor.armL = Math.max(1, vic.armor.armL - raw * 0.25);
        att.hype = Math.min(100, att.hype + raw * 0.04 * att.st.hypeGain);
        if (vic.guardHp <= 0) {
          vic.guardHp = 0; vic.setState('gbreak'); SFX.play('gbreak'); m.call(vic, 'GUARD CRUSH', 'bad'); FX.addShake(0.5);
          FX.burst(atPos, { n: 16, color: [0x66aaff, 0xffffff], glow: true, speed: 6, size: 0.08 }); vic.hitstop = att.hitstop = 0.1; return 'gcrush';
        }
        vic.setState('guardstun'); vic.hitstun = 0.12 + raw * 0.0016; vic.vel.x = dir.x * (mv.kb[0] * 0.35 + 1.5); vic.vel.z = dir.z * (mv.kb[0] * 0.35 + 1.5);
        att.hitstop = vic.hitstop = 0.05; SFX.play('guard'); FX.spark(atPos, { color: 0x9fd0ff, size: 0.9 });
        return 'blocked';
      }

      // ---- the hit lands
      const counter = vic.state === 'attack' && vic.move && vic.moveT < vic.move.su && !o.noCombo;
      if (!vic.comboing || vic.combo.by !== att) { if (!o.noCombo) vic.combo = vic.freshCombo(); }
      const pr = o.kind === 'super' ? Math.max(0.55, Combat.prorate(vic)) : Combat.prorate(vic);
      let dmg = mv.dmg * (o.charge ? 1 + o.charge * (mv.chargeL ? 1.2 : 0.6) : 1) * att.dmgMult(o.kind) * (1 - vic.st.def) * pr * (counter ? 1.2 : 1);
      if (vic.buffs.bulwark) dmg *= 0.75;
      dmg = Math.round(dmg);
      if (m.training && m.training.godP2 && vic.idx === 1) dmg = 0;
      vic.hp -= dmg; att.records.dmg += dmg;
      if (!o.noCombo) { vic.combo.hits++; vic.combo.dmg += dmg; vic.combo.by = att; }
      att.moveHit = true;
      att.hype = Math.min(100, att.hype + dmg * 0.11 * att.st.hypeGain * (att.buffs.momentum ? 1.5 : 1) * (mv.hype == null ? 1 : mv.hype));
      vic.hype = Math.min(100, vic.hype + dmg * 0.05);
      vic.burst = Math.min(100, vic.burst + dmg * 0.055 * vic.st.burstRate);
      // part armour
      const part = mv.zone ? Combat.zonePart(att, vic, mv.zone) : null;
      if (part && !vic.broken[part]) { vic.armor[part] -= dmg * (mv.launch ? 0.55 : 0.35); if (vic.armor[part] <= 0) Combat.breakPart(vic, part, dir); }

      // ---- the reaction
      const armored = vic.armorT > 0 && o.kind !== 'super' && o.kind !== 'throw' && mv.type !== 'grab' && vic.state !== 'held';
      const hs = o.multiHit ? 0.018 : 0.045 + Math.min(0.12, dmg * 0.0009) + (counter ? 0.05 : 0);
      att.hitstop = hs; vic.hitstop = hs;
      vic.flash = 0.7; vic.flashCol = counter ? 0xff5050 : 0xffffff;
      const power = U.clamp(mv.kb[0] / 10 + dmg / 80, 0.5, 2.5);
      SFX.play('hit', { power }); if (mv.launch && mv.kb[0] > 12) SFX.play('heavy');
      FX.spark(atPos, { size: 0.8 + power * 0.4, color: counter ? 0xff8080 : 0xffffff });
      FX.burst(atPos, { n: 4 + Math.round(power * 4), color: [0xffffff, 0xffe080, KB.LINES[vic.build.core.line].pal.main], speed: 4 + power * 2, size: 0.07, life: 0.4, glow: true, gravity: 6 });
      FX.addShake(0.08 + power * 0.12);
      if (counter) m.call(vic, 'COUNTER', 'counter');
      if (vic.hp <= 0) { vic.hp = 0; m.ko(vic, att, dir, mv); return 'ko'; }
      if (armored) { m.call(vic, 'ARMOR', 'small'); vic.flashCol = 0xffa040; return 'armor'; }

      vic.move = null; vic.pauseWin = null; vic.crumpled = vic.dizzy = false; vic.held = vic.state === 'held' && vic.held && vic.held.kind === 'super' && o.kind !== 'super' ? vic.held : null;
      const kbk = vic.st.kbTaken * (o.charge ? 1 + o.charge * 0.75 : 1) * (1 + vic.combo.hits * 0.008);
      const decay = Combat.decay(vic);
      if (mv.pull) {
        const F = fwd(att.yaw); vic.pos.set(att.pos.x + F.x * 1.1, vic.pos.y, att.pos.z + F.z * 1.1); vic.vel.set(0, vic.grounded ? 0 : 3, 0);
        vic.setState('hit'); vic.hitstun = mv.stun * decay; m.chain(att, vic); return 'hit';
      }
      if (mv.launch || vic.airborne || vic.state === 'tumble') {
        let h = mv.kb[0] * kbk, v = mv.kb[1];
        if (!mv.launch) { h *= 0.6; v = Math.max(v, 4.5); }
        if (mv.spike) { v = mv.kb[1]; vic.spiked = true; } else vic.spiked = false;
        vic.vel.set(dir.x * h, v * (v > 0 ? Math.min(1.15, kbk) : 1), dir.z * h);
        vic.setState('tumble'); vic.grounded = v <= 0 && vic.pos.y <= 0.01; if (v > 0) vic.pos.y = Math.max(vic.pos.y, 0.02), vic.grounded = false;
        vic.hitstun = (0.26 + 0.026 * Math.hypot(h, v)) * decay;
        vic.hardKD = !!(mv.spike || o.kind === 'super' || o.kind === 'throw');
        vic.yaw = Math.atan2(-dir.x, -dir.z);
      } else {
        vic.setState('hit'); vic.hitstun = (mv.stun || 0.3) * (counter ? 1.3 : 1) * Math.max(0.6, decay);
        vic.vel.x = dir.x * mv.kb[0] * kbk; vic.vel.z = dir.z * mv.kb[0] * kbk; vic.yaw = Math.atan2(-dir.x, -dir.z);
        // CRUMPLE (they fold up, then fall down) and DIZZY (they stand there rubbing their eyes)
        const crumple = mv.crumple || (mv.chargeL && (o.charge || 0) >= 0.45 ? 0.9 : 0);
        if (crumple) { vic.hitstun = crumple * Math.max(0.7, decay); vic.crumpled = true; vic.vel.x *= 0.3; vic.vel.z *= 0.3; m.call(vic, 'CRUMPLE', 'counter'); }
        if (mv.dizzy) { vic.hitstun = mv.dizzy * Math.max(0.6, decay); vic.dizzy = true; vic.vel.set(0, 0, 0); m.call(vic, 'DIZZY', 'counter'); }
      }
      if (vic.combo.hits >= 2) m.comboShow(att, vic);
      return 'hit';
    },
    /* a small hit inside a Legend Art */
    seqTick(att, vic, dmg, pos) {
      const d = Math.round(dmg * att.dmgMult('super') * (1 - vic.st.def) * Math.max(0.55, Combat.prorate(vic)));
      vic.hp = Math.max(1, vic.hp - d); vic.combo.hits++; vic.combo.dmg += d; vic.combo.by = att; att.records.dmg += d;
      vic.flash = 0.6; vic.flashCol = 0xffffff; vic.hitstop = 0.03;
      const p = pos || _c.copy(vic.pos).setY(vic.pos.y + 1 + U.rnd(-0.3, 0.3)).clone();
      FX.spark(p, { size: 1.1 }); FX.burst(p, { n: 5, color: [0xffffff, 0xffe080], glow: true, speed: 5, size: 0.07, life: 0.35 });
      SFX.play('hit', { power: 1.2 }); FX.addShake(0.12); att.m.comboShow(att, vic);
    },
    bounceDamage(vic, base) {
      const d = Math.round(base * Math.max(0.4, Combat.prorate(vic)));
      vic.hp = Math.max(vic.combo.by ? 0 : 1, vic.hp - d); vic.combo.dmg += d; if (vic.combo.by) vic.combo.by.records.dmg += d;
      return d;
    },

    /* ---------------------------------------------------- THE WALL BOUNCE */
    wallImpact(vic, w, speedIn) {
      const m = vic.m, A = m.arena, n = w.n, c = vic.combo;
      const contact = _c.copy(vic.pos); contact[w.axis] = w.sign * w.lim; contact.y = vic.pos.y + 0.9;
      vic.pos[w.axis] = w.sign * (w.lim - BODY);
      // 1. a wall tech (not on the first bounce of a combo)
      const techOk = c.bounces >= 1 && vic.state === 'tumble' && vic.techLock <= 0 && vic.hp > 0;
      if (techOk && vic.input.take('dodge', 0.32)) {
        vic.endCombo(); vic.setState('air'); vic.inv = 0.3; vic.spin.rotation.x = 0;
        vic.vel.set(n.x * 5, 7, n.z * 5); vic.yaw = Math.atan2(n.x, n.z);
        SFX.play('tech'); m.call(vic, 'WALL TECH!', 'tech'); FX.ring(contact.clone(), { r1: 1.6, life: 0.3, normal: new V3(n.x, 0, n.z), color: 0x7cf9ff });
        A.stress(w, speedIn * 1.2, contact);
        return;
      }
      // mashing Dodge early gets you locked out of the tech for a moment
      if (vic.input.peek('dodge', 0.8) && !vic.input.peek('dodge', 0.32)) vic.techLock = 0.5;
      const add = speedIn * 2.3;
      const breaks = (w.stress + add >= 100 || c.bounces >= 3) && vic.state !== 'ko';
      if (breaks) return Combat.wallBreak(vic, w, speedIn, contact);
      // 2. KNOCK//BACK: off the wall, still tumbling
      const e = Math.max(0.3, 0.6 - 0.08 * c.bounces);
      // off the wall at a catchable pace: harder impacts give more height and damage, not more distance
      const vn = vic.vel.x * n.x + vic.vel.z * n.z; // negative, into the wall
      const tx = (vic.vel.x - vn * n.x) * 0.55, tz = (vic.vel.z - vn * n.z) * 0.55, out = Math.min(-vn * e, 3.6 + speedIn * 0.06);
      vic.vel.x = tx + n.x * out; vic.vel.z = tz + n.z * out;
      vic.vel.y = Math.max(vic.vel.y, 6.6 + Math.min(4, speedIn * 0.12));
      c.bounces++; vic.floatT = 0.32;
      vic.hitstun = Math.max(vic.hitstun, 0.78 * Combat.decay(vic)); vic.hardKD = false;
      const dmg = Combat.bounceDamage(vic, (16 + speedIn * 2.1) * (1 + 0.3 * (c.bounces - 1)));
      if (c.by) c.by.hype = Math.min(100, c.by.hype + 6 * c.by.st.hypeGain);
      A.stress(w, add, contact);
      vic.hitstop = 0.09; if (c.by) c.by.hitstop = Math.max(c.by.hitstop, 0.05);
      SFX.play('knock', { n: c.bounces }); FX.addShake(0.35 + speedIn * 0.02);
      FX.ring(contact.clone(), { r1: 1.4 + speedIn * 0.06, life: 0.3, normal: new V3(n.x, 0, n.z), color: 0xfff1c0 });
      FX.burst(contact.clone(), { n: 14, color: A.wallColors, speed: 4 + speedIn * 0.2, size: 0.1, dir: new V3(n.x, 0.3, n.z), life: 0.6 });
      m.call(vic, 'KNOCK//BACK' + (c.bounces > 1 ? ' ×' + c.bounces : ''), 'bounce', contact.clone());
      if (c.by) m.comboShow(c.by, vic);
      if (vic.hp <= 0) m.ko(vic, c.by || vic.opp, new V3(n.x, 0, n.z), null);
    },
    wallBreak(vic, w, speedIn, contact) {
      const m = vic.m, A = m.arena, n = w.n, c = vic.combo, att = c.by || vic.opp;
      A.breakWall(w, contact);
      const dmg = Combat.bounceDamage(vic, (vic.maxHp * 0.06 + 70) * 1.0 / Math.max(0.4, Combat.prorate(vic)) * Math.max(0.6, Combat.prorate(vic)));
      c.bounces++;
      vic.vel.set(-n.x * Math.max(9, speedIn * 0.8), 7, -n.z * Math.max(9, speedIn * 0.8));
      vic.pos[w.axis] = w.sign * (w.lim + 0.2);
      vic.setState(vic.hp <= 0 ? 'ko' : 'out'); vic.outDone = false;
      if (att) { att.buffs.momentum = 8; att.records.breaks++; att.hype = Math.min(100, att.hype + 25); m.call(att, 'MOMENTUM', 'buff'); }
      SFX.play('wallbreak'); FX.addShake(1.1); m.slowmo(0.22, 0.75); m.hitstopAll(0.12);
      FX.ring(contact.clone(), { r1: 4, life: 0.5, normal: new V3(n.x, 0, n.z), color: 0xffd070 });
      m.call(vic, 'WALL BREAK!!', 'break', contact.clone());
      if (att) m.comboShow(att, vic);
      m.event('wallbreak', { vic, w });
      if (vic.hp <= 0) m.ko(vic, att, new V3(-n.x, 0, -n.z), null, true);
    },

    /* a limb's armour hits zero: it pops off the figure */
    breakPart(vic, part, dir) {
      const m = vic.m; vic.broken[part] = true; vic.armor[part] = 0;
      SFX.play('partbreak'); m.call(vic, { head: 'HEAD OFF!', armR: 'R-ARM BROKEN!', armL: 'L-ARM BROKEN!', legs: 'LEGS CRACKED!' }[part], 'part');
      if (part === 'legs') { vic.setLegMat(true); FX.burst(_c.copy(vic.pos).setY(0.5), { n: 12, color: [0x6a6a72, 0x9a9aa2], speed: 3, size: 0.07 }); return; }
      const grp = vic.fig.detach(part, m.scene); if (!grp) return;
      if (part === 'armR') vic.trailR.pts.length = 0; if (part === 'armL') vic.trailL.pts.length = 0;
      m.dropPart(vic, part, grp, dir);
    },
  };

  window.Fighter = Fighter; window.Combat = Combat; Fighter.BODY = BODY;
})();
