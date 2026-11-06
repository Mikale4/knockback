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
  const GRAV = 30, BODY = 0.42, LEAPG = 52;
  // the throws out of a grab: how long the throw takes, its pose, its move
  const THROWS = { f: { t: 0.12, pose: 'hurl', mv: 'throwF' }, s: { t: 0.16, pose: 'hurl', mv: 'throwF' }, b: { t: 0.24, pose: 'hurl', mv: 'throwB' }, u: { t: 0.16, pose: 'palmUp', mv: 'throwU' }, d: { t: 0.24, pose: 'overhead', mv: 'throwD' } };
  const _v = new V3(), _w = new V3(), _c = new V3();
  const fwd = (yaw, v) => (v || new V3()).set(Math.sin(yaw), 0, Math.cos(yaw));

  class Fighter {
    constructor(m, idx, build, input, opts) {
      opts = opts || {};
      this.m = m; this.idx = idx; this.build = build; this.baseBuild = build; this.input = input; this.opts = opts;
      this.st = KB.stats(build, opts.bonus);
      this.fig = Models.figure(build);
      this.obj = new THREE.Group(); this.spin = new THREE.Group();
      this.spin.position.y = 0.95; this.fig.root.position.y = -0.95;
      this.obj.add(this.spin); this.spin.add(this.fig.root); m.scene.add(this.obj);
      this.spearStub = new THREE.Group(); this.spearOut = false; this.spear = null; this.spearGrp = null;
      this.pos = this.obj.position; this.vel = new V3(); this.yaw = 0;
      this.ready = Anim.readyFor(build);
      this.trailR = null; this.newTrails();
      this.brokenMat = this.fig.mat.clone(); this.brokenMat.color.setHex(0x6a6a72);
      this.name = build.name || 'Figure';
      this.color = KB.LINES[build.core.line].css;
      this.hype = 0; this.burst = 60; this.records = { maxCombo: 0, maxBounces: 0, breaks: 0, dmg: 0 };
      this.resetRound(0, 0, 0);
    }

    /* ---------------------------------------------------------------- round */
    resetRound(x, z, yaw) {
      // a part taken off the other figure only lasts the round: back to your own build and your own parts
      if (this.spearOut) this.catchSpear(true);   // a thrown lance comes back for the new round
      if (this.build !== this.baseBuild) { this.build = this.baseBuild; this.st = KB.stats(this.build, this.opts.bonus); this.ready = Anim.readyFor(this.build); this.newTrails(); }
      this.fig.restore();
      const S = this.st;
      this.pos.set(x, 0, z); this.vel.set(0, 0, 0); this.yaw = yaw; this.obj.rotation.y = yaw;
      this.hp = this.maxHp = S.hp;
      this.armorMax = Object.assign({}, S.armor); this.armor = Object.assign({}, S.armor);
      this.broken = { head: false, armR: false, armL: false, legs: false };
      for (const n of ['head', 'armL', 'armR']) this.fig.reattach(n);
      this.setLegMat(false);
      this.uses = S.uses; this.useRegen = 0;
      this.guardMax = S.guard; this.guardHp = S.guard; this.guardIdle = 0;
      this.state = 'idle'; this.stateT = 0; this.move = null; this.hitstop = 0; this.inv = 0; this.armorT = 0; this.armorHits = 0; this.armorCd = 0; this.limits = {};
      this.buffs = {}; this.burn = null; this.slowT = 0; this.dodgeCd = 0; this.airJumps = S.airJumps; this.airDodges = S.airDodges; this.airStr = 0; this.airDashes = 0; this.pauseWin = null; this.riposteT = 0; this.crumpled = this.dizzy = false;
      this.grounded = true; this.combo = this.freshCombo(); this.hitstun = 0; this.held = null; this.flash = 0; this.flashCol = 0xffffff;
      this.spin.rotation.set(0, 0, 0); this.techLock = 0; this.lastDodgeEnd = -9; this.groundT = 0; this.downT = 0; this.hardKD = false;
      this.wallTouch = null; this.out = false; this.ko = false; this.runT = 0; this.phase = 0;
      this.obj.visible = true; this.cine = null; this.pose2 = null; this.kickT = 0; this.yankT = 0; this.chained = null; this.spReady = 0; this.grabbing = null; this.throwT = -1; this.pummelT = 0; this.asleep = false; this.pogos = 0; this.beatOn = false; this.lastBeat = -1;
      if (this.markProp) { this.markProp.parent && this.markProp.parent.remove(this.markProp); this.markProp = null; }
      Anim.set(this.fig, this.ready);
    }
    /* super armour for t seconds. Most takes any number of hits (armorHits 99); the Viking's (one) takes one hit, then
       breaks, and can't come back for 1.2 s -- so it wins a trade, not every trade */
    giveArmor(t, one) {
      if (!one) { this.armorT = Math.max(this.armorT, t); this.armorHits = 99; return; }
      if (this.armorCd > 0) return;                                   // broke a moment ago
      if (this.armorT <= 0) this.armorHits = 1;                       // a fresh window: one hit (an unlimited one already up stays unlimited)
      this.armorT = Math.max(this.armorT, t);
    }
    /* moves with a use limit (the Ninja's Chain Hook: twice in any 5 s): canUse asks, useLimited spends one (or says how long to wait) */
    canUse(id) { const mv = KB.MOVES[id]; if (!mv || !mv.limit) return true; const now = this.m.time, log = (this.limits && this.limits[id]) || []; return log.filter(t => now - t < mv.limit.t).length < mv.limit.n; }
    useLimited(id, mv) {
      const now = this.m.time, L = this.limits = this.limits || {}, log = (L[id] || []).filter(t => now - t < mv.limit.t);
      if (log.length >= mv.limit.n) {
        L[id] = log;
        if (now - (this.limitCall || -9) > 0.6) { this.limitCall = now; this.m.call(this, mv.name.toUpperCase() + ': ' + (mv.limit.t - (now - log[0])).toFixed(1) + ' s', 'bad'); }
        return false;
      }
      log.push(now); L[id] = log; return true;
    }
    freshCombo() { return { hits: 0, dmg: 0, bounces: 0, t: 0, gb: false, by: null, otg: 0, ext: 0, dh: 0 }; }
    newTrails() { if (this.trailR) { this.trailR.dispose(); this.trailL.dispose(); } this.trailR = FX.trail(this.st.trailR); this.trailL = FX.trail(this.st.trailL); }
    /* snap a part on off the floor: your own, or the same part off the other figure if yours is missing (its moves come with it) */
    wearPart(p) {
      const part = p.part;
      if (this.fig.parts[part] === p.grp) this.fig.reattach(part); else this.fig.adopt(part, p.grp);
      const swapped = !!p.item && this.build[part] !== p.item;
      if (swapped) {
        this.build = Object.assign({}, this.build, { [part]: p.item }); this.st = KB.stats(this.build, this.opts.bonus);
        this.armorMax[part] = this.st.armor[part]; this.ready = Anim.readyFor(this.build);
        if (part === 'head') this.uses = Math.min(Math.max(this.uses, 1), this.st.uses);
        if (part === 'armL') { this.guardMax = this.st.guard; this.guardHp = Math.min(this.guardHp, this.guardMax); }
        if (part !== 'head') this.newTrails();
      }
      this.broken[part] = false; this.armor[part] = Math.round(this.armorMax[part] * 0.55);
      return swapped;
    }
    /* PART TOSS (its own button, F by default): pull off a part of your own and throw it -- the head first, then the L-arm, then the R-arm.
       A hit extends the combo (twice a combo at most) */
    /* a Special is ready: uses left, a head to use it with, and (Shadow Step) its cooldown over */
    canSpecial() { return this.uses > 0 && !this.broken.head && this.m.time >= (this.spReady || 0); }
    tossable() { return ['head', 'armL', 'armR'].find(p => !this.broken[p] && !this.fig.detached[p]) || null; }
    canToss() { const o = this.opp; return !!this.tossable() && !(o && o.combo.by === this && o.comboing && o.combo.ext >= 2); }
    setLegMat(broken) { for (const n of ['legL', 'legR']) this.fig.parts[n].children.forEach(c => { if (c.isMesh && c.material !== VX.glowMat()) c.material = broken ? this.brokenMat : this.fig.mat; }); }
    get opp() { return this.m.opp(this); }
    get forward() { return fwd(this.yaw); }
    get airborne() { return !this.grounded; }
    get inHitstun() { return this.state === 'hit' || this.state === 'tumble' || this.state === 'guardstun' || this.state === 'gbreak'; }
    get comboing() { return this.combo.hits > 0 && (this.state === 'hit' || this.state === 'tumble' || this.state === 'held' || this.state === 'down'); }
    setState(s) { this.state = s; this.stateT = 0; }

    /* ---------------------------------------------------------------- main */
    update(dt) {
      if (this.hitstop > 0) { this.hitstop -= dt; this.shakeFig(); this.stopped = true; return; }
      this.stopped = false;   // (Training's frame meter skips the frames a figure stands frozen in a hit's hitstop)
      if (this.slowT > 0) { this.slowT -= dt; dt *= 0.45; }
      this.stateT += dt;
      const S = this.st, I = this.input;
      // timers
      this.inv = Math.max(0, this.inv - dt); this.armorT = Math.max(0, this.armorT - dt); this.armorCd = Math.max(0, this.armorCd - dt); this.dodgeCd = Math.max(0, this.dodgeCd - dt);
      this.techLock = Math.max(0, this.techLock - dt);
      for (const k in this.buffs) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) delete this.buffs[k]; }
      if (this.burn) this.updBurn(dt);
      if (this.state !== 'guard' && this.state !== 'guardstun') { this.guardIdle += dt; if (this.guardIdle > 0.8) this.guardHp = Math.min(this.guardMax, this.guardHp + this.guardMax * 0.22 * dt); }
      if (!this.comboing && this.state !== 'ko') this.burst = Math.min(100, this.burst + 2.6 * S.burstRate * dt);
      if (this.uses < S.uses && !this.broken.head) { this.useRegen += dt; if (this.useRegen > S.useRegen) { this.useRegen = 0; this.uses++; } }
      // BARD signature: the beat pulses under your feet
      if (S.sig === 'beat' && !this.broken.armR) { const b = Music.beat(this.m); if (b.n !== this.lastBeat) { this.lastBeat = b.n; if (this.state !== 'ko' && !this.m.cine) FX.ring(_c.copy(this.pos).setY(0.06), { r0: 0.3, r1: 1.0, life: 0.22, color: 0xff8ad8 }); } }
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
        case 'ddash': this.updDownDash(dt); break;
        case 'hit': this.physics(dt, 9); if (this.stateT > this.hitstun) { if (this.crumpled && this.grounded) { this.crumpled = false; this.hardKD = false; this.setState('down'); } else { this.endCombo(); this.crumpled = this.dizzy = false; this.setState(this.grounded ? 'idle' : 'air'); } } break;
        case 'tumble': this.updTumble(dt); break;
        case 'down': this.physics(dt, 12); if (this.stateT > (this.hardKD ? 0.85 : 0.6)) { this.setState('getup'); this.inv = 0.45; this.endCombo(); } break;
        case 'getup': this.physics(dt, 12); if (this.stateT > 0.32) this.setState('idle'); break;
        case 'held': this.updHeld(dt); break;
        case 'grab': this.updGrab(dt); break;
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
      const sp = S.speed * legs * (this.buffs.momentum ? 1.06 : 1) * (this.buffs.valor ? 1.1 : 1);
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
      this.airJumps = this.st.airJumps; this.airDodges = this.st.airDodges; this.airStr = 0; this.airDashes = 0; this.pogos = 0;
      this.setState('idle'); this.groundT = 0;
      if (this.vel.y < -8) { SFX.play('land'); FX.burst(_c.copy(this.pos).setY(0.05), { n: 5, color: this.m.arena.dust, speed: 2, size: 0.07, life: 0.4, up: 0.4 }); }
    }

    /* the buttons, from neutral (ground or air) */
    tryActions(ground) {
      const I = this.input, S = this.st;
      if (this.m.frozen || this.m.phase !== 'fight') return false;
      if (I.take('super') && this.hype >= 100 && ground) { this.startSuper(); return true; }
      if (I.take('toss') && this.canToss()) { this.startMove('partToss', 'toss'); return true; }
      if (I.take('special')) { if (this.canSpecial() && (ground || this.moveOk(S.special, 'air'))) { this.startMove(S.special, 'special'); return true; } else if (this.broken.head) this.m.call(this, 'NO HEAD!', 'bad'); }
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
        if (I.peek('heavy') && (I.held.guard || I.guardAt.heavy) && this.canSpear()) { I.take('heavy'); this.startMove('spearThrow', 'spear'); return true; }
        if (I.take('heavy')) { this.startMove(this.leftMove('heavy'), 'heavy'); return true; }
        if (I.held.guard) { this.setState('guard'); this.guardStart = this.m.time; return true; }
      } else {
        if (I.take('jump')) {
          if (this.wallTouch && S.perk === 'walljump') { this.wallJump(); return true; }
          if (this.airJumps > 0 && !this.broken.legs) { this.airJumps--; this.jump(0.85); return true; }
        }
        // DOWN DASH: Guard + Dodge in the air -- a fast dive to the floor (it spends your air dodge; no invincibility)
        if (I.peek('dodge') && (I.held.guard || I.guardAt.dodge) && this.airDodges > 0) { I.take('dodge'); this.airDodges--; this.startDownDash(); return true; }
        if (I.take('dodge') && this.airDodges > 0 && this.dodgeCd <= 0) { this.airDodges--; this.startDodge(); return true; }
        if (I.take('light') && !this.airStr) { this.airStr = 1; this.startMove(this.airRoot(), 'air'); return true; }
        if (I.peek('heavy') && (I.held.guard || I.guardAt.heavy) && this.canSpear()) { I.take('heavy'); this.startMove('spearThrow', 'spear'); return true; }
        if (I.take('heavy')) { this.startMove(this.leftMove('airHeavy'), 'airHeavy'); return true; }
      }
      return false;
    }
    moveOk(id, where) { const mv = KB.MOVES[id]; return where !== 'air' || ['dash', 'proj', 'teleport', 'radial'].includes(mv.type); }
    jump(k) {
      this.vel.y = this.st.jump * k * (this.broken.legs ? 0.8 : 1); this.grounded = false; this.setState('air'); if (k < 1) this.airStr = 0;
      const d = this.stick(); if (d) { this.vel.x = d.x * this.st.speed * 0.9; this.vel.z = d.z * this.st.speed * 0.9; }
      SFX.play('jump'); this.m.event('jump', { f: this, air: k < 1 });
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
      this.dodgeCd = (vanish ? 0.33 : 0.55) * this.st.dodgeCd;
      this.dodgeAir = !this.grounded; SFX.play('dodge');
      if (vanish) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 8, color: 0x6a4a9a, speed: 2, size: 0.1, gravity: -2, life: 0.4 });
    }
    updDodge(dt) {
      const T = 0.3, dist = 3.3 * this.st.dodgeDist * (this.dodgeAir ? 0.8 * this.st.airDodgeDist : 1);
      const k = this.stateT < T ? (dist / T) * (1.5 - this.stateT / T) : 0;
      this.vel.x = this.dodgeDir.x * k; this.vel.z = this.dodgeDir.z * k;
      if (this.dodgeAir) this.vel.y = Math.max(this.vel.y, this.stateT < T ? 0.5 : this.vel.y);
      this.physics(dt, 0);
      if (this.stateT >= T + 0.1) { this.lastDodgeEnd = this.m.time; this.setState(this.grounded ? 'idle' : 'air'); return; }
      if (this.stateT > 0.12 && this.grounded && this.input.take('light')) { this.startMove(this.st.dashAtk, 'dash'); }
    }

    /* DOWN DASH (Guard + Dodge in the air): straight down at speed, steered with the stick; you can act the moment you land.
       If you're high up, control comes back after half a second. */
    startDownDash() {
      const d = this.stick(), sp = this.st.speed * 0.9;
      this.setState('ddash'); this.move = null; this.vel.y = -26;
      if (d) { this.vel.x = d.x * sp; this.vel.z = d.z * sp; this.yaw = Math.atan2(d.x, d.z); } else { this.vel.x *= 0.35; this.vel.z *= 0.35; }
      SFX.play('whoosh'); FX.burst(_c.copy(this.pos).setY(this.pos.y + 1.1), { n: 6, color: 0xffffff, glow: true, speed: 2, size: 0.07, gravity: -4, life: 0.25 });
      this.m.event('ddash', { f: this });
    }
    updDownDash(dt) {
      this.vel.y = Math.min(this.vel.y, -26);
      if (this.stateT < 0.35 && U.vrand() < 0.7) FX.burst(_c.copy(this.pos).setY(this.pos.y + 1.2), { n: 1, color: 0xdfe8ff, glow: true, speed: 0.3, size: 0.1, gravity: -14, life: 0.16 });   // the streak
      this.physics(dt, 0);
      if (this.grounded) {
        this.land(); SFX.play('land'); FX.ring(_c.copy(this.pos).setY(0.06), { r0: 0.3, r1: 1.4, life: 0.25 });
        FX.burst(_c.copy(this.pos).setY(0.05), { n: 10, color: this.m.arena.dust, speed: 3, size: 0.08, life: 0.4, up: 0.4 });
        return;
      }
      if (this.stateT > 0.5) this.setState('air');
    }

    /* BURNING (Dragon Breath): a tick of damage every half second until it runs out. No hitstun, no combo; it can't KO
       (it stops at 1 HP), and guarding doesn't put it out. */
    updBurn(dt) {
      const b = this.burn;
      if (['ko', 'out'].includes(this.state) || this.m.phase !== 'fight') { this.burn = null; return; }
      b.t -= dt; b.tick += dt;
      if (U.vrand() < 0.35) FX.burst(_c.copy(this.pos).set(this.pos.x + U.vrnd(-0.3, 0.3), this.pos.y + U.vrnd(0.3, 1.6), this.pos.z + U.vrnd(-0.3, 0.3)), { n: 1, color: [0xffd040, 0xff6a20, 0xff3010], glow: true, speed: 0.4, size: 0.09, gravity: -5, life: 0.35 });
      while (b.tick >= 0.5 && b.left > 0) {
        b.tick -= 0.5; b.left--;
        let d = Math.round(b.dps * 0.5 * (1 - this.st.def)); if (this.m.training && this.m.training.godP2 && this.idx === 1) d = 0;
        d = Math.min(d, Math.max(0, this.hp - 1)); this.hp -= d; if (b.by) b.by.records.dmg += d;
        if (this.comboing && this.combo.by === b.by) this.combo.dmg += d;
        this.flash = Math.max(this.flash, 0.35); this.flashCol = 0xff7a20;
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 1), { n: 5, color: [0xffd040, 0xff6a20], glow: true, speed: 2, size: 0.08, gravity: -4, life: 0.4 });
      }
      if (b.t <= 0 || b.left <= 0) this.burn = null;
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
      if (I.take('toss') && this.canToss()) { this.startMove('partToss', 'toss'); return; }
      if (this.canSpear() && I.take('heavy')) { this.startMove('spearThrow', 'spear'); return; }
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
    lightRoot() { return this.broken.armR ? 'stump1' : this.spearOut ? 'fistA' : this.broken.armL ? this.st.lightPure || this.st.light : this.st.light; }
    airRoot() { return this.broken.armR ? 'stumpAir' : this.spearOut ? 'fistAir' : this.broken.armL ? this.st.airPure || this.st.air : this.st.air; }
    /* the L-arm's Heavy, launcher and air Heavy: a broken L-arm (or a two-handed lance move with the lance thrown) falls back to the body */
    leftMove(k) {
      const fb = { heavy: 'tackle', launch: 'headbutt', airHeavy: 'bodyDrop' }[k], id = this.st[k];
      if (this.broken.armL) return fb;
      return this.spearOut && KB.MOVES[id] && KB.MOVES[id].twoHand ? fb : id;
    }
    /* DRAGOON: Guard + Heavy throws the lance. It flies at them and stays where it lands; walk over it to pick it back up */
    canSpear() { return !!this.st.spear && !this.spearOut && !this.broken.armR && !this.fig.detached.armR; }
    throwSpear() {
      const F = this.fig, grp = F.parts.wR, stub = this.spearStub;
      if (this.spearOut || !grp || grp === stub || !grp.parent) return null;
      grp.updateWorldMatrix(true, false); const mtx = grp.matrixWorld.clone(); grp.parent.remove(grp);
      mtx.decompose(grp.position, grp.quaternion, grp.scale); grp.scale.setScalar(1); this.m.scene.add(grp);
      stub.position.copy(F.rest.wR); stub.quaternion.identity(); F.parts.armR.add(stub); F.parts.wR = stub;
      this.spearGrp = grp; this.spearOut = true; this.trailR.pts.length = 0;
      return grp;
    }
    /* the lance back in his hand: picked up, or called back (his Legend Art, a new round, the arm coming off, lost off the edge) */
    catchSpear(quiet) {
      const F = this.fig, grp = this.spearGrp;
      if (!this.spearOut || !grp) return;
      if (grp.parent) grp.parent.remove(grp); if (this.spearStub.parent) this.spearStub.parent.remove(this.spearStub);
      grp.position.copy(F.rest.wR); grp.quaternion.identity(); grp.scale.setScalar(1); F.parts.armR.add(grp); F.parts.wR = grp;
      this.spearOut = false; this.spearGrp = null; this.spear = null;
      if (!quiet) { SFX.play('snapon'); FX.burst(F.socket('wR', [0, 0, 8]), { n: 10, color: [0xffffff, 0xffc890], glow: true, speed: 2.5, size: 0.06, life: 0.35 }); }
    }
    startLight() { this.startMove(this.lightRoot(), 'light'); }
    startMove(id, kind) {
      const mv = KB.MOVES[id]; if (!mv) return;
      if (mv.limit && !this.useLimited(id, mv)) return;   // (a move with a limit: n uses in any t seconds)
      this.move = mv; this.kind = kind; this.moveT = 0; this.hitSet = new Set(); this.moveHit = false; this.charge = 0; this.fired = false; this.activeOn = false;
      this.lastSub = -1; this.acExt = 0; this.extraHits = 0; this.rapidUsed = 0; this.pauseWin = null; this.moveSerial = (this.moveSerial || 0) + 1;
      this.beatOn = !!(mv.beat && this.st.sig === 'beat' && (kind === 'light' || kind === 'air') && Music.beat(this.m).near); this.beatShown = false;
      if (this.beatOn) FX.ring(_c.copy(this.pos).setY(0.08), { r0: 1.0, r1: 1.7, life: 0.25, color: 0xfff27a });
      if (mv.armorSU) this.giveArmor(mv.su, mv.oneArmor);
      if (kind === 'special') { this.uses--; this.spReady = this.m.time + (this.st.spCd || 0); }
      this.setState('attack'); this.aim(mv); this.m.event('move', { f: this, id, kind });
      if (kind === 'air' || kind === 'airHeavy') { this.vel.y = Math.max(this.vel.y, kind === 'air' ? 2.2 : 3); }
      if (mv.armor || (kind === 'dash' && this.st.perk === 'unstoppable')) this.giveArmor(mv.su + mv.ac, mv.oneArmor || this.st.perk === 'unstoppable');
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
      const S = this.st; let m = { light: S.dmgR, air: S.dmgR, spear: S.dmgR, heavy: S.dmgL, launch: S.dmgL, airHeavy: S.dmgL, gun: S.dmgL, special: S.dmgH, dash: S.dmgG, super: S.dmgK, throw: 1 }[kind] || 1;
      m *= S.setDmg;
      if (this.buffs.momentum) m *= 1.1; if (this.buffs.fury) m *= 1.15; if (this.buffs.valor) m *= 1.12;
      if (S.passive === 'wyrmblood' && !this.grounded) m *= 1.12;
      if (kind === 'minion') m *= S.impDmg || 1;
      if (S.passive === 'bushido' && this.hp < this.maxHp * 0.35) m *= 1.15;
      if (S.passive === 'fury') m *= 1 + Math.min(0.12, (1 - this.hp / this.maxHp) * 0.16);
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
        if (lightCharge) this.giveArmor(0.05, true);   // (once its one hit is spent, holding on doesn't bring it back: the 1.2 s wait)
        if (U.rand() < 0.4) FX.burst(this.fig.socket(lightCharge ? 'wR' : 'wL', [0, 0, lightCharge ? 9 : 2]), { n: 1, color: 0xffd060, glow: true, speed: 1.5, size: 0.06, gravity: -3, life: 0.3 });
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
      if ((t >= end && !(this.yankT > 0)) || (diving && this.grounded && t > su)) {
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
          if ((s && s.dot(this.forward) > 0.5) || (s0 && s0.dot(this.forward) > 0.5)) this.startMove(this.leftMove('heavy'), 'heavy');
          // PIRATE with the Flintlock: a Quick Shot gun cancel instead, once a combo, then the string starts over
          else if (this.st.gunCancel && !this.broken.armL && o && !o.combo.gun) { o.combo.gun = true; this.startMove(this.st.gunCancel, 'gun'); }
          else this.startMove(this.leftMove('launch'), 'launch');
          return true;
        }
      }
      if (k === 'gun' && t >= su + 0.05 && hit && I.take('light', 0.25)) { this.startLight(); return true; }
      if (k === 'air' && nx.l && after && I.take('light', 0.25)) { this.startMove(nx.l, 'air'); return true; }
      // NINJA signature: Dodge after an air hit dashes at them (twice a jump)
      if (k === 'air' && hit && this.st.sig === 'airdash' && (this.airDashes || 0) < 2 && t >= su + ac * 0.3 && I.take('dodge', 0.2)) {
        const o = this.opp; this.airDashes = (this.airDashes || 0) + 1; this.move = null; this.setState('air'); this.airStr = 0;
        if (o) { const d = _v.subVectors(o.pos, this.pos); d.y = 0; const l = d.length() || 1; this.vel.set(d.x / l * 9, Math.max(2.5, (o.pos.y - this.pos.y) * 4), d.z / l * 9); this.yaw = Math.atan2(d.x, d.z); }
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 10, color: 0x30243f, speed: 2.5, size: 0.1, gravity: -1, life: 0.35 }); SFX.play('dodge'); this.m.event('airdash', { f: this });
        return true;
      }
      // DRAGOON signature: Jump off an air hit, a fresh jump and a fresh air string (twice a jump)
      if (k === 'air' && hit && this.st.sig === 'pogo' && this.pogos < 2 && t >= su + ac * 0.3 && I.take('jump', 0.2)) {
        this.pogos++; this.move = null; this.airStr = 0; this.vel.y = this.st.jump * 0.9; this.vel.x *= 0.3; this.vel.z *= 0.3; this.grounded = false; this.setState('air');
        FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.1), { r1: 1.2, life: 0.25, color: 0xffc890 }); SFX.play('tech'); this.m.call(this, 'VAULT', 'small'); this.m.event('vault', { f: this });
        return true;
      }
      if (k === 'air' && hit && t >= su + ac * 0.3 && I.take('heavy', 0.2)) { this.startMove(this.leftMove('airHeavy'), 'airHeavy'); return true; }
      if (k === 'launch' && hit && t >= su + ac * 0.5 && I.take('jump', 0.3)) {
        this.move = null; const o = this.opp; this.vel.y = this.st.jump * 1.12; this.grounded = false; this.setState('air'); this.airStr = 0;
        if (o) { const d = _v.subVectors(o.pos, this.pos).setY(0); const l = d.length(); if (l > 0.01) { this.vel.x = d.x / l * Math.min(6, l * 3); this.vel.z = d.z / l * Math.min(6, l * 3); } }
        SFX.play('jump'); this.m.event('jump', { f: this, follow: true }); return true;
      }
      if (hit && after && ['light', 'heavy', 'launch', 'air', 'dash', 'gun'].includes(k)) {
        if (I.peek('toss', 0.2) && this.canToss()) { I.take('toss'); this.startMove('partToss', 'toss'); return true; }
        if (I.peek('special', 0.2) && this.canSpecial() && (this.grounded || this.moveOk(this.st.special, 'air'))) { I.take('special'); this.startMove(this.st.special, 'special'); return true; }
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
        this.m.hitMinions(this, _c.copy(this.pos).setY(this.pos.y + 0.5), mv.rad, this.moveSerial * 10);
        if (o && U.dist(this.pos, o.pos) < mv.rad + BODY && Math.abs(o.pos.y - this.pos.y) < 2) Combat.hit(this, o, mv, { kind: this.kind, dir: _v.subVectors(o.pos, this.pos).setY(0).normalize().clone() });
        if (mv.holy) FX.burst(_c.copy(this.pos).setY(1), { n: 24, color: [0xfff07a, 0xffffff], glow: true, speed: 5, gravity: -2, size: 0.08, life: 0.6 });
        if (mv.buff) this.addBuff(mv.buff);
      } else if (mv.type === 'buff') this.addBuff(mv.buff);
      else if (mv.type === 'summon') this.m.summon(this, mv.summon);
      if (mv.command && o) this.m.minionsPounce(this, o, true);
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
      // the Vanishing Stab blinks behind them once a combo; after that it's just a stab
      if (mv.cross && o && U.dist(this.pos, o.pos) < (mv.reach || 1) + 1.8 && !['out', 'ko', 'down'].includes(o.state) && !(o.combo.by === this && o.comboing && o.combo.blink)) {
        if (o.combo.by === this && o.comboing) o.combo.blink = true;
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 10, color: 0x30243f, speed: 3, size: 0.11, gravity: -1, life: 0.4 });
        const d = _v.subVectors(o.pos, this.pos).setY(0); if (d.lengthSq() < 0.01) d.copy(F); d.normalize();
        this.pos.set(o.pos.x + d.x * 0.95, Math.max(0, this.pos.y), o.pos.z + d.z * 0.95); this.clampInside();
        this.yaw = U.ang(this.pos, o.pos); this.vel.x = this.vel.z = 0; SFX.play('dodge');
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 10, color: 0x30243f, speed: 3, size: 0.11, gravity: -1, life: 0.4 });
      }
      if (this.kind === 'light' && mv.id && U.rand() < 0) this.m.call(this, mv.name);
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
        this.m.hitMinions(this, c, mv.rad, this.moveSerial * 10 + Math.max(0, this.lastSub));
        const otg = Combat.otgOk(this, o, use, this.kind);
        if (Combat.overlap(c, mv.rad, o, otg)) {
          this.hitSet.add(o);
          if (mv.type === 'grab') return this.tryGrab(o);
          const dir = mv.around ? _v.subVectors(o.pos, this.pos).setY(0).normalize().clone() : null;
          Combat.hit(this, o, use, { kind: this.kind, charge: this.charge, at: c.clone(), dir: dir && dir.lengthSq() > 0.5 ? dir : null, multiHit: use !== mv, otg });
        }
      } else if (mv.type === 'dash') {
        // anything along the dash path
        const a = this.dashFrom || this.pos, b = this.pos;
        this.m.hitMinionsSeg(this, a, b, mv.rad, this.moveSerial * 10);
        const p = Combat.closestOnSeg(a, b, _w.copy(o.pos).setY(o.pos.y + 0.9)), otg = Combat.otgOk(this, o, mv, this.kind);
        const near = otg ? Math.hypot(p.x - o.pos.x, p.z - o.pos.z) < mv.rad + BODY + 0.3 : p.distanceTo(_v.copy(o.pos).setY(o.pos.y + 0.9)) < mv.rad + BODY;
        if (near) { this.hitSet.add(o); Combat.hit(this, o, mv, { kind: this.kind, at: otg ? p.clone().setY(o.pos.y + 0.3) : p.clone(), otg }); }
      }
      // weapon trail
      if (mv.trail) { const w = this.isLeftMove() ? 'wL' : 'wR', T = this.isLeftMove() ? this.trailL : this.trailR; if (!this.fig.detached[w === 'wL' ? 'armL' : 'armR']) T.push(this.fig.socket(w, [0, 0, 3]), this.fig.socket(w, [0, 0, w === 'wR' ? 14 : 10])); }
    }
    isLeftMove() { if (this.move && this.move.offhand) return true; if (this.move && this.move.twoHand) return false; return ['heavy', 'launch', 'airHeavy', 'gun'].includes(this.kind) || (this.move && /^(jabL|heavyDiag|bash|shoot)/.test(this.move.pose)); }
    addBuff(b) {
      if (b.id === 'bulwark') { this.armorT = b.t; this.armorHits = 99; this.buffs.bulwark = b.t; this.m.call(this, 'BULWARK', 'buff'); FX.ring(_c.copy(this.pos).setY(1), { r1: 1.6, normal: new V3(0, 1, 0), color: 0x66aaff }); }
      if (b.id === 'fury') { this.buffs.fury = b.t; this.m.call(this, 'FURY', 'buff'); }
      if (b.id === 'nova') { const heal = Math.round(this.maxHp * b.heal * this.st.healMult); this.hp = Math.min(this.maxHp, this.hp + heal); this.m.call(this, '+' + heal + ' HP', 'heal'); }
      if (b.id === 'valor') { this.buffs.valor = b.t; this.m.call(this, 'SONG OF VALOR', 'buff'); for (let i = 0; i < 3; i++) FX.ring(_c.copy(this.pos).setY(0.3 + i * 0.5), { r1: 1.4 + i * 0.3, life: 0.4 + i * 0.1, color: 0xff8ad8 }); }
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
      // GRAB: hold them. Light pummels, Heavy or a tilt of the stick throws that way (Heavy alone slams them down),
      // Jump throws them up. They can mash to break free; held long enough, they will
      o.move = null; o.setState('held'); o.held = { by: this, kind: 'grab', esc: 0 }; o.heldBySuper = false; o.vel.set(0, 0, 0);
      this.grabbing = o; this.grabT = 0; this.throwT = -1; this.pummelT = 0; this.move = null; this.setState('grab');
      this.grabMax = 1.4 + (1 - o.hp / o.maxHp) * 0.8;   // the more hurt they are, the longer you can hold them
      SFX.play('guard'); this.m.call(this, 'GRAB!', 'small'); this.m.event('grab', { f: this, vic: o });
    }

    /* the Legend Art: a flash, a catch, and if it catches, a cinematic (arts.js) */
    startSuper() {
      this.m.event('super', { f: this });
      const mv = KB.MOVES[this.st.super];
      if (this.spearOut) this.catchSpear(false);   // (the Art calls the lance back to his hand)
      this.hype -= 100; this.move = mv; this.kind = 'super'; this.moveT = 0; this.hitSet = new Set(); this.moveHit = false; this.superPhase = 'start';
      this.moveSerial = (this.moveSerial || 0) + 1;
      this.setState('attack'); this.aim(Object.assign({}, mv, { range: 12 })); this.inv = 0.9; this.vel.set(0, 0, 0);
      this.m.superFreeze(this, mv);
    }
    /* can a Legend Art take them? A fated one (Ragnarök) ignores dodges and knockdowns; an OTG one (Dragonfall) takes
       them off the floor, lying down or getting up */
    catchable(o, fated, otg) {
      if (!o || ['ko', 'out', 'held'].includes(o.state) || o.respawnInv || this.m.phase !== 'fight') return false;
      if (otg && (o.state === 'down' || o.state === 'getup')) return true;
      return !!fated || (o.inv <= 0 && o.state !== 'down' && o.state !== 'getup');
    }
    updSuper(dt) {
      const mv = this.move, o = this.opp;
      this.moveT += dt;
      if (this.superPhase === 'start') { this.physics(dt, 14); if (this.moveT >= mv.su) this.beginCatch(mv, o); return; }
      if (this.superPhase === 'catch') {
        this.catchT += dt;
        const r = this.updCatch(mv, o, dt);
        if (r === true) this.beginSeq(o);
        else if (r === 'miss' || this.catchT > 2.2) this.superMiss();
        return;
      }
      if (this.superPhase === 'seq') return this.updSeq(dt);
      if (this.superPhase === 'miss') { this.missT += dt; this.physics(dt, 12); if (this.missT > 0.45 && this.grounded) { this.move = null; this.setState('idle'); } else if (this.missT > 1.6) { this.move = null; this.setState('air'); } }
    }
    superMiss() {
      this.superPhase = 'miss'; this.missT = 0; this.obj.visible = true; this.inv = 0;
      if (this.markProp) { this.markProp.parent && this.markProp.parent.remove(this.markProp); this.markProp = null; }
      this.m.call(this, 'MISSED', 'small');
    }
    beginCatch(mv, o) {
      this.superPhase = 'catch'; this.catchT = 0; this.dashFrom = this.pos.clone(); this.superCaught = false; this.waveR = 0; this.caughtDone = false;
      if (o && U.dist(this.pos, o.pos) < 14) this.faceOpp();   // look again: they may have moved during the flash
      const d = o ? U.dist(this.pos, o.pos) : 99, ct = mv.catchType;
      SFX.play('whoosh');
      if (ct === 'dash') this.dashLen = U.clamp(d + 1.2, mv.dist * 0.6, mv.dist * 1.35);
      else if (ct === 'melee') this.dashLen = U.clamp(d - 0.95, 0, mv.close || 2);
      else if (ct === 'proj') this.m.fire(this, Object.assign({}, mv, { proj: 'superShot', aimAt: o }), 0);
      else if (ct === 'leap') { this.vel.set(0, 0.5 * LEAPG * mv.flight, 0); this.grounded = false; this.inv = mv.flight + 0.4; SFX.play('jump'); }
      else if (ct === 'jump') { this.vel.set(0, 30, 0); this.grounded = false; this.inv = 2.2; this.markAt = o ? o.pos.clone().setY(0) : this.pos.clone(); SFX.play('jump'); }
      else if (ct === 'mark') {
        this.markAt = o ? o.pos.clone().setY(0) : this.pos.clone();
        this.markProp = Arts.Prop.glyph(KB.LINES.summoner.pal.glow, mv.rad); this.m.scene.add(this.markProp);
      }
    }
    /* each Art's way of catching: true when it has them, 'miss' when it hasn't */
    updCatch(mv, o, dt) {
      const F = this.forward, ct = mv.catchType, t = this.catchT, can = this.catchable(o, mv.fated, mv.otg);
      if (ct === 'dash') {
        const T = 0.2, sp = this.dashLen / T;
        if (t < T) { this.vel.x = F.x * sp; this.vel.z = F.z * sp; } else { this.vel.x *= 0.5; this.vel.z *= 0.5; }
        this.physics(dt, 0);
        if (t < T) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 2, color: 0xffffff, speed: 1, size: 0.08, life: 0.25 });
        // along the dash while it travels; once it stops, only where the attacker stands (so a well-timed dodge still gets out)
        if (can) { const c = _w.copy(o.pos).setY(o.pos.y + 0.9), p = t < T ? Combat.closestOnSeg(this.dashFrom, this.pos, c) : _c.copy(this.pos).setY(this.pos.y + 0.9); if (Math.hypot(p.x - c.x, p.z - c.z) < mv.rad + BODY && Math.abs(c.y - (this.pos.y + 0.9)) < 2.2) return true; }
        return t > T + 0.15 ? 'miss' : false;
      }
      if (ct === 'melee') {
        const T = 0.16, sp = this.dashLen / T;
        if (t < T) { this.vel.x = F.x * sp; this.vel.z = F.z * sp; } else { this.vel.x *= 0.4; this.vel.z *= 0.4; }
        this.physics(dt, 0);
        if (can && Combat.overlap(_c.set(this.pos.x + F.x * mv.reach, this.pos.y + 1, this.pos.z + F.z * mv.reach), mv.rad + 0.3, o)) return true;
        return t > T + 0.14 ? 'miss' : false;
      }
      if (ct === 'proj') { this.physics(dt, 14); if (this.superCaught && can) return true; return t > 0.35 ? 'miss' : false; }
      if (ct === 'leap') {
        // RAGNARÖK: fate tracks them; the axe comes down wherever they stand
        const left = mv.flight - t, A = this.m.arena;
        if (o && left > 0.02) {
          const tx = U.clamp(o.pos.x, -A.W + 0.5, A.W - 0.5), tz = U.clamp(o.pos.z, -A.D + 0.5, A.D - 0.5);
          this.vel.x = U.clamp((tx - this.pos.x) / left, -30, 30); this.vel.z = U.clamp((tz - this.pos.z) / left, -30, 30); this.yaw = U.ang(this.pos, o.pos);
        }
        this.physics(dt, 0, 0, LEAPG);
        if (U.rand() < 0.7) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.8), { n: 1, color: [0xffd080, 0xff6020], glow: true, speed: 0.6, size: 0.08, gravity: -2, life: 0.35 });
        if (t > 0.1 && this.grounded) {
          this.vel.set(0, 0, 0);
          FX.ring(_c.copy(this.pos).setY(0.1), { r1: mv.rad * 1.2, life: 0.45, color: 0xffd080 }); FX.addShake(0.9); SFX.play('boom');
          FX.burst(_c.copy(this.pos).setY(0.1), { n: 30, color: this.m.arena.dust, speed: 7, size: 0.14, life: 0.8 });
          if (can && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < mv.rad + BODY) return true;
          return 'miss';
        }
        return false;
      }
      if (ct === 'jump') {
        // DRAGONFALL: up out of sight, a reticle hunts them, sets, and the lance comes down
        const col = KB.LINES.dragoon.pal.glow;
        if (t < 0.3) { this.physics(dt, 0, 0, 20); return false; }
        if (t < 0.95) {
          this.obj.visible = false; this.vel.set(0, 0, 0);
          if (t < 0.72 && o && o.state !== 'out') this.markAt.set(U.clamp(o.pos.x, -this.m.arena.W + 0.5, this.m.arena.W - 0.5), 0, U.clamp(o.pos.z, -this.m.arena.D + 0.5, this.m.arena.D - 0.5));
          if (Math.floor(t / 0.07) !== Math.floor((t - dt) / 0.07)) FX.ring(_c.copy(this.markAt).setY(0.06), { r0: mv.rad * 1.6, r1: mv.rad, life: 0.12, color: t < 0.72 ? col : 0xffffff });
          if (t >= 0.72 && t - dt < 0.72) SFX.play('tick');
          return false;
        }
        if (!this.obj.visible) { this.obj.visible = true; this.pos.set(this.markAt.x, 10, this.markAt.z); this.vel.set(0, -46, 0); if (o) this.yaw = U.ang(this.pos, o.pos); SFX.play('whoosh'); }
        this.physics(dt, 0, 0, 0.01);
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 1), { n: 2, color: [col, 0xffd080], glow: true, speed: 1, size: 0.09, gravity: 0, life: 0.3 });
        if (this.grounded) {
          FX.ring(_c.copy(this.pos).setY(0.1), { r1: mv.rad * 2.2, life: 0.4, color: col }); FX.addShake(0.8); SFX.play('heavy');
          FX.burst(_c.copy(this.pos).setY(0.2), { n: 24, color: [col, 0xffd080, this.m.arena.dust], glow: true, speed: 6, size: 0.1, life: 0.6 });
          if (can && Math.hypot(o.pos.x - this.markAt.x, o.pos.z - this.markAt.z) < mv.rad + BODY && o.pos.y < 2.6) return true;
          return 'miss';
        }
        return false;
      }
      if (ct === 'mark') {
        // GRAND SUMMONING: a circle opens under them, tracks a moment, then erupts
        this.physics(dt, 14);
        if (t < 0.18 && o && o.state !== 'out') this.markAt.set(o.pos.x, 0, o.pos.z);
        if (this.markProp) { this.markProp.position.copy(this.markAt).setY(0.05); this.markProp.rotation.y += dt * 5; this.markProp.scale.setScalar(0.4 + Math.min(1, t / 0.2) * 0.6); }
        if (t >= 0.42) {
          if (this.markProp) { this.markProp.parent && this.markProp.parent.remove(this.markProp); this.markProp = null; }
          const col = KB.LINES.summoner.pal.glow;
          FX.burst(_c.copy(this.markAt).setY(0.2), { n: 30, color: [col, 0xffffff], glow: true, speed: 6, gravity: -6, size: 0.09, life: 0.6, up: 2 }); SFX.play('boom');
          if (can && Math.hypot(o.pos.x - this.markAt.x, o.pos.z - this.markAt.z) < mv.rad + BODY && o.pos.y < 2.6) return true;
          return 'miss';
        }
        return false;
      }
      if (ct === 'radial') {
        // JUDGMENT OF DAWN: a burst of light all around her
        this.physics(dt, 14);
        if (t >= 0.06) {
          FX.ring(_c.copy(this.pos).setY(0.1), { r1: mv.rad * 1.15, life: 0.4, color: 0xfff07a }); FX.ring(_c.copy(this.pos).setY(1), { r1: mv.rad, life: 0.35, normal: this.m.camDir(), color: 0xffffff });
          FX.burst(_c.copy(this.pos).setY(1), { n: 30, color: [0xfff07a, 0xffffff], glow: true, speed: 7, size: 0.08, gravity: 0, life: 0.5 }); SFX.play('jguard'); FX.addShake(0.4);
          if (can && U.dist(this.pos, o.pos) < mv.rad + BODY && Math.abs(o.pos.y - this.pos.y) < 3.2) return true;
          return 'miss';
        }
        return false;
      }
      if (ct === 'wave') {
        // GRAND FINALE: a ring of sound rolls out; anyone it passes is in the show
        this.physics(dt, 14);
        const T = 0.4, r0 = this.waveR, r = mv.rad * U.easeOut(Math.min(1, t / T)); this.waveR = r;
        if (t - dt <= 0) { FX.ring(_c.copy(this.pos).setY(0.4), { r0: 0.2, r1: mv.rad, life: T, color: 0xff8ad8 }); FX.ring(_c.copy(this.pos).setY(1.2), { r0: 0.2, r1: mv.rad, life: T, color: 0xfff27a }); SFX.play('chord'); }
        if (can) { const d = U.dist(this.pos, o.pos); if (d >= r0 - 0.7 && d <= r + 0.7 && o.pos.y < 3.2) return true; }
        return t > T ? 'miss' : false;
      }
      return 'miss';
    }
    beginSeq(o) {
      // guarding doesn't stop a Legend Art that has caught you
      const otg = o.state === 'down' || o.state === 'getup';
      o.move = null; o.setState('held'); o.held = { by: this, kind: 'super' }; o.heldBySuper = true; o.vel.set(0, 0, 0); o.dizzy = o.crumpled = o.asleep = false; o.hardKD = false;
      if (!o.comboing) o.combo = o.freshCombo();
      this.m.event('art', { f: this, vic: o });
      this.superPhase = 'seq'; this.seqVictim = o; this.inv = 9; this.obj.visible = true; this.vel.set(0, 0, 0);
      if (this.markProp) { this.markProp.parent && this.markProp.parent.remove(this.markProp); this.markProp = null; }
      SFX.play('hit', { power: 2 }); FX.addShake(0.5);
      this.m.call(o, otg ? 'OTG!' : 'CAUGHT!', 'super'); if (otg) this.m.event('otg', { att: this, vic: o, art: true });
      this.cine = Arts.begin(this, o, this.move);
    }
    updSeq(dt) {
      const o = this.seqVictim, mv = this.move, c = this.cine;
      if (!c) { this.superMiss(); return; }
      if (!Arts.step(c, dt)) return;
      // the finisher
      o.held = null; o.heldBySuper = false; this.pose2 = null; this.obj.visible = true;
      const fin = Object.assign({}, mv, { dmg: mv.dmg * 0.52, type: 'melee' });
      Combat.hit(this, o, fin, { kind: 'super', dir: c.D.clone(), force: true, at: _c.copy(o.pos).setY(o.pos.y + 1).clone() });
      Arts.finish(c);
      if (this.st.passive === 'encore') { this.hype = Math.min(100, this.hype + 35); this.m.call(this, 'ENCORE!', 'buff'); }
      this.inv = 0.25; this.superPhase = 'end'; this.move = Object.assign({}, mv, { type: 'melee', su: 0, ac: 0, rc: 0.4 }); this.kind = 'super-end'; this.moveT = 0;
      this.setState('attack');
    }

    /* while held (thrown, or in a Legend Art) */
    updHeld(dt) {
      const h = this.held; if (!h) { this.setState('idle'); return; }
      const by = h.by;
      if (h.kind === 'grab') {
        if (by.state !== 'grab' || by.grabbing !== this) { this.held = null; this.setState(this.pos.y > 0.05 ? 'air' : 'idle'); return; }
        // held out in front; a throw carries them through its arc (up, over the head and down, or round the back)
        const F = by.forward, T = by.throwT >= 0 ? THROWS[by.throwKind] : null, k = T ? U.clamp(by.throwT / T.t, 0, 1) : 0;
        let off = by.pummelT > 0 ? 0.78 : 0.85, y = 0.25;
        if (T) {
          if (by.throwKind === 'u') { off = 0.85 - 0.45 * k; y = 0.25 + 1.6 * k; }
          else if (by.throwKind === 'd') { off = 0.85 - 0.3 * Math.sin(Math.PI * k); y = k < 0.6 ? 0.25 + 1.5 * (k / 0.6) : 1.75 * (1 - (k - 0.6) / 0.4); }
          else if (by.throwKind === 'b') y = 0.25 + Math.sin(Math.PI * k) * 0.7;
          else off = 0.85 - 0.25 * Math.sin(Math.PI * k);
        }
        this.pos.set(by.pos.x + F.x * off, by.pos.y + y, by.pos.z + F.z * off); this.vel.set(0, 0, 0); this.yaw = by.yaw + Math.PI;
        // mash out: every fresh press (and every flick of the stick) loosens the grip
        const I = this.input; for (const a of ['light', 'heavy', 'jump', 'dodge', 'special', 'guard']) if (I.pressed(a)) h.esc += 0.07;
        const tilt = Math.hypot(I.move.x, I.move.y) > 0.6; if (tilt && !h.tilt) h.esc += 0.04; h.tilt = tilt;
      }
    }

    /* holding them: pummel, throw, or (too slow) they break free */
    updGrab(dt) {
      const o = this.grabbing, I = this.input, F = this.forward;
      if (!o || o.state !== 'held' || !o.held || o.held.by !== this) { this.grabbing = null; this.throwT = -1; this.setState(this.grounded ? 'idle' : 'air'); return; }
      this.vel.x = 0; this.vel.z = 0; this.physics(dt, 18); this.grabT += dt;
      if (this.throwT >= 0) {
        this.throwT += dt; const T = THROWS[this.throwKind], k = U.clamp(this.throwT / T.t, 0, 1);
        if (this.throwKind === 'b') this.yaw = this.throwYaw0 + Math.PI * U.ease(k);                      // spin round with them
        if (this.throwKind === 's') this.yaw = U.turn(this.yaw, this.throwYawTo, 1 - Math.exp(-28 * dt));  // turn to throw that way
        if (this.throwT >= T.t) this.releaseThrow();
        return;
      }
      if (this.pummelT > 0) {
        this.pummelT -= dt;
        if (!this.pummelHit && this.pummelT <= 0.12) { this.pummelHit = true; Combat.hit(this, o, KB.MOVES.pummel, { kind: 'throw', force: true, pummel: true, dir: F.clone(), at: _c.copy(o.pos).setY(o.pos.y + 1.1).clone() }); }
        return;
      }
      const s = this.stick(), tilt = s && Math.hypot(I.move.x, I.move.y) > 0.7 && this.grabT > 0.15;
      if (I.take('jump')) return this.startThrow('u');
      if (I.take('heavy') || tilt) { if (!s) return this.startThrow('d'); const dot = s.dot(F); return this.startThrow(dot < -0.5 ? 'b' : dot > 0.5 ? 'f' : 's', s); }
      if (I.take('light')) { this.pummelT = 0.24; this.pummelHit = false; return; }
      if (this.grabT >= this.grabMax - o.held.esc) this.grabBreak();
    }
    startThrow(k, s) {
      this.throwKind = k; this.throwT = 0; this.throwYaw0 = this.yaw; if (s) this.throwYawTo = Math.atan2(s.x, s.z);
      SFX.play('whoosh');
    }
    releaseThrow() {
      const o = this.grabbing, k = this.throwKind, T = THROWS[k], mv = KB.MOVES[T.mv];
      this.grabbing = null; this.throwT = -1;
      if (k === 's') this.yaw = this.throwYawTo;
      // a short recovery in the throw's follow-through
      this.move = { id: mv.id, name: mv.name, type: 'none', pose: T.pose, su: 0, ac: 0.04, rc: 0.26, dmg: 0, kb: [0, 0] }; this.kind = 'throw'; this.moveT = 0.02; this.moveHit = false; this.hitSet = new Set(); this.setState('attack');
      if (!o || o.state !== 'held') return;
      o.held = null; if (k === 'd') o.pos.y = 0; this.m.event('throw', { f: this, vic: o, kind: k });
      Combat.hit(this, o, mv, { kind: 'throw', dir: this.forward.clone(), force: true, at: _c.copy(o.pos).setY(o.pos.y + 0.9).clone() });
      if (k === 'd') { FX.ring(_c.copy(o.pos).setY(0.06), { r1: 1.8, life: 0.3 }); FX.addShake(0.3); }
    }
    /* held too long (or they mashed out): both pushed apart, and the combo is over */
    grabBreak() {
      const o = this.grabbing; this.grabbing = null; this.throwT = -1; this.pummelT = 0;
      const d = _v.subVectors(o.pos, this.pos).setY(0); if (d.lengthSq() < 0.01) d.copy(this.forward); d.normalize();
      o.held = null; o.pos.y = 0; o.endCombo(); o.setState('hit'); o.hitstun = 0.2; o.vel.set(d.x * 6, 0, d.z * 6);
      this.setState('hit'); this.hitstun = 0.3; this.vel.set(-d.x * 3, 0, -d.z * 3);
      SFX.play('jguard'); this.m.call(o, 'GRAB BREAK', 'tech');
    }
    /* let go without a throw (they got hit, a round ended) */
    dropGrab() { const o = this.grabbing; this.grabbing = null; this.throwT = -1; this.pummelT = 0; if (o && o.state === 'held' && o.held && o.held.by === this) { o.held = null; o.setState(o.pos.y > 0.05 ? 'air' : 'idle'); } }

    snapCancel() {
      this.hype -= 50; this.move = null; this.setState(this.grounded ? 'idle' : 'air');
      if (!this.grounded) this.vel.y = Math.max(this.vel.y, 2);
      const o = this.opp; if (o && U.dist(this.pos, o.pos) < 5) o.slowT = 0.5;
      SFX.play('snap'); this.m.call(this, 'SNAP!', 'snap'); this.m.hitstopAll(0.06);
      FX.ring(_c.copy(this.pos).setY(1), { r1: 2.6, life: 0.3, normal: this.m.camDir(), color: 0x7cf9ff });
      this.flash = 0.25; this.flashCol = 0x7cf9ff;
    }
    doBurst() {
      this.m.event('burst', { f: this });
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
      if (this.grabbing) this.dropGrab();
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
    shakeFig() { this.fig.root.position.x = (U.rand() - 0.5) * 0.06 * (this.inHitstun ? 1 : 0.3); }
    animate(dt) {
      this.fig.root.position.x = 0;
      this.obj.rotation.y = this.yaw;
      let pose, rate = 18;
      const R = this.ready, st = this.state;
      if (st === 'attack' && this.move) {
        const mv = Object.assign({}, this.move, { ac: this.move.ac + (this.acExt || 0) }), t = this.moveT;
        let P = Anim.P[this.pose2 || mv.pose] || Anim.compose(this.pose2 || mv.pose) || Anim.P.slashA;
        if (P.alt && t >= mv.su && t < mv.su + mv.ac) P = Anim.P[P.alt[Math.floor((t - mv.su) / 0.06) % P.alt.length]];
        if (this.kind === 'super' && this.superPhase === 'seq' && this.pose2) { pose = Anim.blend(R, Anim.P[this.pose2][this.pose2ph || 'strike'], 1, R); rate = 40; }
        else if (this.kind === 'super' && this.superPhase === 'catch' && (mv.catchType === 'leap' || mv.catchType === 'jump')) { pose = Anim.blend(R, mv.catchType === 'jump' && this.catchT > 0.9 ? Anim.P.plunge.strike : P.wind, 1, R); rate = 20; }
        else if (t < mv.su || (this.kind === 'super' && this.superPhase === 'start')) { pose = Anim.blend(R, P.wind, 1, R); rate = 14 + 6 / Math.max(0.05, mv.su); }
        else if (t < mv.su + mv.ac + mv.rc * 0.35) { const alt = this.kind === 'air' && this.altPose && mv.pose === 'slashA' ? Anim.P.slashB : P; pose = Anim.blend(R, alt.strike, 1, R); rate = 46; }
        else { const k = U.clamp((t - mv.su - mv.ac) / Math.max(0.01, mv.rc), 0, 1); pose = Anim.blend((P.strike), R, U.ease(k), R); rate = 20; }
        if (P.spin && t >= mv.su && t < mv.su + mv.ac + 0.05) this.spin.rotation.y = -((t - mv.su) / (mv.ac + 0.05)) * Math.PI * 2; else this.spin.rotation.y = U.smooth(this.spin.rotation.y, 0, 20, dt);
        if (!this.grounded && this.kind !== 'airHeavy') pose.legL = [-0.8, 0, 0.1];
      } else {
        this.spin.rotation.y = U.smooth(this.spin.rotation.y, 0, 20, dt);
        if (st === 'run') { this.phase += dt * (6 + this.st.speed); pose = Anim.run(R, this.phase, Math.hypot(this.vel.x, this.vel.z), this.build.armR.line); }
        else if (st === 'idle') { pose = Anim.idle(R, this.m.time + this.idx * 1.7, this.build, this); rate = 10; }
        else if (st === 'air') pose = Anim.blend(R, this.vel.y > 0 ? Anim.STATE.air : Anim.STATE.fall, 1, R);
        else if (st === 'ddash') { pose = Anim.blend(R, Anim.P.plunge.strike, 1, R); rate = 34; }
        else if (st === 'guard' || st === 'guardstun') pose = Anim.fill(Anim.STATE.guard);
        else if (st === 'gbreak') { pose = Anim.fill(Anim.STATE.stunned); pose.head[1] = Math.sin(this.stateT * 9) * 0.4; }
        else if (st === 'dodge') pose = Anim.fill(Anim.STATE.dodge);
        else if (st === 'grab') {
          const T = this.throwT >= 0 ? THROWS[this.throwKind] : null;
          if (T) { const P = Anim.P[T.pose]; pose = Anim.blend(Anim.blend(R, P.wind, 1, R), P.strike, U.ease(U.clamp(this.throwT / T.t, 0, 1)), R); rate = 34; }
          else if (this.pummelT > 0) { pose = Anim.blend(R, this.pummelT > 0.12 ? Anim.P.knee.wind : Anim.P.knee.strike, 1, R); rate = 40; }
          else { pose = Anim.blend(R, Anim.P.grab.strike, 1, R); rate = 20; }
        }
        else if (st === 'hit' && this.crumpled) { pose = Anim.fill(Anim.STATE.crumple); rate = 9; }
        else if (st === 'hit' && this.asleep) { pose = Anim.fill(Anim.STATE.stunned); pose.head = [0.75, 0, 0.35]; pose.torso = [0.3, 0, 0.15]; rate = 6; if (U.rand() < 0.04) FX.burst(this.fig.socket('head', [0, 9, 0]), { n: 1, color: 0xffffff, glow: true, speed: 0.4, size: 0.08, gravity: -1.5, life: 0.8 }); }
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
      // short overrides laid over the move: a pistol's kick up the arm, a chain yanked back to the hip
      if (this.kickT > 0) { this.kickT -= dt; const k = this.kickT / 0.14; pose.armL[0] -= 0.6 * k; pose.torso[0] -= 0.12 * k; rate = Math.max(rate, 50); }
      if (this.yankT > 0) { this.yankT -= dt; pose = Anim.blend(pose, Anim.P.chainYank.strike, U.clamp(this.yankT / 0.06, 0, 1), R); rate = Math.max(rate, 30); }
      Anim.drive(this.fig, pose, dt, rate);
      this.holster(dt);
      // the hit flash and status glows
      this.flash = Math.max(0, this.flash - dt * 5);
      let e = this.flash, col = this.flashCol;
      if (this.armorT > 0 && this.armorHits > 0 && !e) { e = 0.18 + Math.sin(this.m.time * 20) * 0.06; col = 0xff9a30; }
      if (this.buffs.momentum && !e) { e = 0.1 + Math.sin(this.m.time * 8) * 0.05; col = 0xffd040; }
      if (this.inv > 0 && (st === 'getup' || this.respawnInv) && !e) { e = (Math.sin(this.m.time * 30) > 0 ? 0.25 : 0); col = 0xffffff; }
      this.fig.mat.emissive.setHex(col).multiplyScalar(e);
    }

    /* the Flintlock stays holstered until it fires, and the Cutlass is put away while it is out */
    holster(dt) {
      const L = KB.PARTS[this.build.armL.line].armL; if (!L.holster) return;
      const drawn = this.state === 'attack' && this.move && (['heavy', 'launch', 'airHeavy', 'gun'].includes(this.kind) || this.move.offhand || this.move.hybrid) && !this.broken.armL;
      this.drawnT = drawn ? 0.25 : Math.max(0, (this.drawnT || 0) - dt);
      const out = this.drawnT > 0, wL = this.fig.parts.wL, wR = this.fig.parts.wR;
      if (wL.visible !== out) { wL.visible = out; if (!this.fig.detached.armL) FX.burst(this.fig.socket('armL', [0, -9, 0]), { n: 4, color: 0xd8d0c0, speed: 1.2, size: 0.06, life: 0.3, gravity: -1 }); }
      if (this.build.armR.line === 'pirate') wR.visible = !out;
    }
    dispose() { this.fig.dispose(); this.trailR.dispose(); this.trailL.dispose(); if (this.obj.parent) this.obj.parent.remove(this.obj); this.brokenMat.dispose(); }
  }

  /* =========================================================== COMBAT ======= */
  const Combat = {
    /* OTG (off the ground): a Heavy, a dash attack, a dive, a sweep or a downward shot may hit a downed opponent,
       once a combo, and scoops them back up into the air */
    otgOk(att, vic, mv, kind) {
      if (vic.state !== 'down' || vic.combo.by !== att || (vic.combo.otg || 0) >= 2 || !vic.combo.hits || vic.inv > 0) return false;   // (twice a combo)
      if (kind === 'super' || kind === 'throw' || kind === 'minion' || (mv && mv.type === 'grab')) return false;
      return !!(mv && (mv.otg || mv.spike || mv.dive || mv.zone === 'low') || kind === 'heavy' || kind === 'airHeavy' || kind === 'dash' || kind === 'toss');
    },
    /* a hit sphere against a figure (two hurt spheres up its body, one when tumbling; low ones along the floor for an OTG) */
    overlap(c, r, o, otg) {
      if (o.state === 'tumble' || o.state === 'held' || o.state === 'out') { for (const y of [0.45, 1.35]) { const h = _v.copy(o.pos); h.y += y; if (c.distanceTo(h) < r + 0.6) return true; } return false; }
      if (o.state === 'down' || (o.state === 'ko' && o.grounded)) {
        if (!otg || o.state !== 'down') return false;
        const F = fwd(o.yaw); for (const s of [0.45, -0.25, -0.95]) { const h = _v.set(o.pos.x + F.x * s, o.pos.y + 0.3, o.pos.z + F.z * s); if (c.distanceTo(h) < r + 0.45) return true; }
        return false;
      }
      for (const y of [0.5, 1.35]) { const h = _v.copy(o.pos); h.y += y; if (c.distanceTo(h) < r + 0.48) return true; }
      return false;
    },
    closestOnSeg(a, b, p) { const ab = _c.subVectors(b, a), l2 = ab.lengthSq(); const t = l2 ? U.clamp(_v.subVectors(p, a).dot(ab) / l2, 0, 1) : 0; return new V3().copy(a).addScaledVector(ab, t).setY(a.y + 0.9); },
    facing(f, from) { const a = U.ang(f.pos, from); return Math.abs(U.wrap(a - f.yaw)) < 1.9; },
    decay(v) { return Math.max(0.42, 1 - v.combo.t * 0.07 - (v.combo.hits - (v.combo.dh || 0)) * 0.012); },
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
      const otg = !!(o.otg && Combat.otgOk(att, vic, mv, o.kind));
      if (!o.force && !otg && (vic.inv > 0 || ['ko', 'out', 'down', 'getup'].includes(vic.state))) { if (vic.state === 'dodge' && vic.inv > 0) m.event('evade', { f: vic, by: att }); return 'miss'; }
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
        const cpu = vic.input.cpu; if (just && cpu && cpu.lv != null && !cpu.dummy && U.rand() > [0.1, 0.22, 0.35, 0.5][cpu.lv]) just = false;
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
      const onBeat = att.beatOn && (o.kind === 'light' || o.kind === 'air');
      let dmg = mv.dmg * (o.charge ? 1 + o.charge * (mv.chargeL ? 0.9 : 0.6) : 1) * att.dmgMult(o.kind) * (1 - vic.st.def) * pr * (counter ? 1.2 : 1) * (onBeat ? 1.3 : 1);
      if (vic.buffs.bulwark) dmg *= 0.75;
      if (vic.st.perk === 'resolve' && vic.hp < vic.maxHp * 0.3) dmg *= 0.85;
      dmg = Math.round(dmg);
      if (m.training && m.training.godP2 && vic.idx === 1) dmg = 0;
      vic.hp -= dmg; att.records.dmg += dmg;
      if (!o.noCombo) { vic.combo.hits++; vic.combo.dmg += dmg; vic.combo.by = att; }
      if (mv.burn && vic.hp > 0) {
        if (!vic.burn) { m.call(vic, 'BURNING', 'bad'); m.event('burn', { att, vic }); }
        vic.burn = { t: mv.burn[1], left: Math.round(mv.burn[1] / 0.5), tick: 0, dps: mv.burn[0] * att.dmgMult(o.kind), by: att };
      }
      // PART TOSS: the combo is extended -- its clock starts over, with a fresh OTG and ground bounce (twice a combo)
      if (o.ext && !o.noCombo && vic.combo.ext < 2) { const n = ++vic.combo.ext; vic.combo.t = 0; vic.combo.dh = vic.combo.hits; vic.combo.otg = 0; vic.combo.gb = false; m.call(att, 'EXTEND ' + n + '/2', 'buff'); m.event('extend', { att, vic, n }); }
      if (!o.remote) att.moveHit = true;
      att.hype = Math.min(100, att.hype + dmg * 0.11 * att.st.hypeGain * (att.buffs.momentum ? 1.5 : 1) * (mv.hype == null ? 1 : mv.hype) * (onBeat ? 1.5 : 1));
      if (onBeat && !att.beatShown) { att.beatShown = true; m.call(att, '♪ ON THE BEAT', 'buff'); }
      // PALADIN: the warhammer heals her
      if (mv.heal && dmg > 0 && att.hp > 0) { const h = Math.max(1, Math.round(dmg * mv.heal * att.st.healMult)); att.hp = Math.min(att.maxHp, att.hp + h); if (h >= 8) m.call(att, '+' + h, 'heal'); FX.burst(_c.copy(att.pos).setY(1.2), { n: 4, color: [0xfff07a, 0x9dff9a], glow: true, speed: 1.2, gravity: -3, size: 0.06, life: 0.5 }); }
      vic.hype = Math.min(100, vic.hype + dmg * 0.05);
      vic.burst = Math.min(100, vic.burst + dmg * 0.055 * vic.st.burstRate);
      // part armour
      const part = mv.zone ? Combat.zonePart(att, vic, mv.zone) : null;
      if (part && !vic.broken[part]) { vic.armor[part] -= dmg * (mv.launch ? 0.55 : 0.35); if (vic.armor[part] <= 0) { Combat.breakPart(vic, part, dir); m.event('partbreak', { att, vic, part }); } }

      // ---- the reaction
      const armored = vic.armorT > 0 && vic.armorHits > 0 && o.kind !== 'super' && o.kind !== 'throw' && mv.type !== 'grab' && vic.state !== 'held';
      const hs = o.multiHit ? 0.018 : 0.045 + Math.min(0.12, dmg * 0.0009) + (counter ? 0.05 : 0);
      if (!o.remote) att.hitstop = hs; vic.hitstop = o.remote ? Math.min(hs, 0.05) : hs;
      if (mv.holy) { FX.ring(atPos.clone(), { r1: 1.6, life: 0.3, normal: m.camDir(), color: 0xfff07a }); FX.burst(atPos, { n: 10, color: [0xfff07a, 0xffffff], glow: true, speed: 4, size: 0.07, gravity: -2, life: 0.5 }); }
      if (mv.blast) { FX.burst(atPos, { n: 22, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 6, size: 0.11, life: 0.5 }); FX.spark(atPos, { color: 0xffb040, size: 2 }); FX.ring(atPos.clone(), { r1: 1.6, life: 0.3, normal: m.camDir(), color: 0xffa040 }); SFX.play('boom'); FX.addShake(0.4); }
      if (mv.hexfx) { const hc = KB.LINES.summoner.pal.glow; FX.ring(atPos.clone(), { r1: 1.5, life: 0.35, normal: m.camDir(), color: hc }); FX.burst(atPos, { n: 12, color: [hc, 0xffffff], glow: true, speed: 4, size: 0.07, life: 0.4, gravity: 0 }); }
      if (mv.quake) { FX.addShake(0.5); FX.ring(_c.copy(vic.pos).setY(0.06), { r1: 2.4, life: 0.4 }); FX.burst(_c.copy(vic.pos).setY(0.1), { n: 14, color: m.arena.dust, speed: 4, size: 0.1 }); }
      if (mv.hybrid && !o.multiHit) m.call(att, mv.name.toUpperCase() + '!', 'buff');
      if (mv.notes) { FX.burst(atPos, { n: 6, color: [0xff8ad8, 0xfff27a, 0x7cf9ff], glow: true, speed: 3, size: 0.09, gravity: -2.5, life: 0.6 }); m.noteFX(atPos.clone(), 2); }
      vic.flash = 0.7; vic.flashCol = counter ? 0xff5050 : 0xffffff;
      const power = U.clamp(mv.kb[0] / 10 + dmg / 80, 0.5, 2.5);
      SFX.play('hit', { power }); if (mv.launch && mv.kb[0] > 12) SFX.play('heavy');
      FX.spark(atPos, { size: 0.8 + power * 0.4, color: counter ? 0xff8080 : 0xffffff });
      FX.burst(atPos, { n: 4 + Math.round(power * 4), color: [0xffffff, 0xffe080, KB.LINES[vic.build.core.line].pal.main], speed: 4 + power * 2, size: 0.07, life: 0.4, glow: true, gravity: 6 });
      FX.addShake(0.08 + power * 0.12);
      if (counter) m.call(vic, 'COUNTER', 'counter');
      if (vic.hp <= 0) { vic.hp = 0; m.ko(vic, att, dir, mv); return 'ko'; }
      if (o.pummel) { if (vic.combo.hits >= 2) m.comboShow(att, vic); return 'hit'; }   // a pummel: they're still held
      if (armored) {
        vic.flashCol = 0xffa040;
        if (vic.armorHits < 99 && --vic.armorHits <= 0) { vic.armorT = 0; vic.armorCd = 1.2; m.call(vic, 'ARMOR BROKEN', 'small'); }   // the Viking's: one hit, then gone for a moment
        else m.call(vic, 'ARMOR', 'small');
        return 'armor';
      }

      if (vic.grabbing) vic.dropGrab();
      vic.move = null; vic.pauseWin = null; vic.crumpled = vic.dizzy = vic.asleep = false; vic.held = vic.state === 'held' && vic.held && vic.held.kind === 'super' && o.kind !== 'super' ? vic.held : null;
      const kbk = vic.st.kbTaken * (o.charge ? 1 + o.charge * 0.75 : 1) * (1 + vic.combo.hits * 0.008);
      const decay = Combat.decay(vic);
      if (otg) {
        // OFF THE GROUND: scooped back up off the floor, twice a combo, and the combo carries on; the second pop is a
        // little lower and shorter, so it buys a hit or two, not a whole new combo
        const n = vic.combo.otg = (vic.combo.otg || 0) + 1, again = n > 1;
        vic.hardKD = false; vic.spiked = false; vic.chained = null;
        vic.vel.set(dir.x * (again ? 2 : 2.5), again ? 6.2 : 8, dir.z * (again ? 2 : 2.5)); vic.pos.y = Math.max(vic.pos.y, 0.05); vic.grounded = false;
        vic.setState('tumble'); vic.hitstun = (again ? 0.42 : 0.55) * Math.max(0.6, decay); vic.yaw = Math.atan2(-dir.x, -dir.z); vic.spin.position.y = 0.95;
        m.call(vic, again ? 'OTG 2!' : 'OTG!', 'bounce'); m.event('otg', { att, vic, n }); FX.ring(_c.copy(vic.pos).setY(0.06), { r1: 1.5, life: 0.3 }); FX.burst(_c.copy(vic.pos).setY(0.1), { n: 12, color: m.arena.dust, speed: 3.5, size: 0.09 });
        if (vic.combo.hits >= 2) m.comboShow(att, vic);
        return 'hit';
      }
      if (mv.pull) {
        // a chain hit: the chain itself drags them in (match.js), so they just stop dead and wait for the yank
        if (o.proj) { vic.vel.set(0, 0, 0); vic.setState('hit'); vic.hitstun = mv.stun * decay + 0.3; return 'hit'; }
        const F = fwd(att.yaw); vic.pos.set(att.pos.x + F.x * 1.1, vic.pos.y, att.pos.z + F.z * 1.1); vic.vel.set(0, vic.grounded ? 0 : 3, 0);
        vic.setState('hit'); vic.hitstun = mv.stun * decay; return 'hit';
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
        if (mv.sleep) { vic.hitstun = mv.sleep * Math.max(0.6, decay); vic.dizzy = true; vic.asleep = true; vic.vel.set(0, 0, 0); m.call(vic, 'ASLEEP  z z z', 'counter'); }
      }
      if (vic.combo.hits >= 2) m.comboShow(att, vic);
      // SUMMONER signature: her imps pounce on whatever she hits
      if (att.st.sig === 'pack' && !o.remote && !o.noCombo && o.kind !== 'super') m.minionsPounce(att, vic, false);
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
        SFX.play('tech'); m.call(vic, 'WALL TECH!', 'tech'); m.event('tech', { f: vic }); FX.ring(contact.clone(), { r1: 1.6, life: 0.3, normal: new V3(n.x, 0, n.z), color: 0x7cf9ff });
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
      c.bounces++; vic.floatT = 0.32; m.event('bounce', { vic, by: c.by, n: c.bounces });
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
      if (part === 'armR' && vic.spearOut) vic.catchSpear(true);
      const grp = vic.fig.detach(part, m.scene); if (!grp) return;
      if (part === 'armR') vic.trailR.pts.length = 0; if (part === 'armL') vic.trailL.pts.length = 0;
      m.dropPart(vic, part, grp, dir);
    },
  };

  const hit0 = Combat.hit;
  Combat.hit = function (att, vic, mv, o) { const r = hit0.call(Combat, att, vic, mv, o); if (att && att.m && att.m.event) att.m.event('hit', { att, vic, mv, o: o || {}, r }); return r; };
  window.Fighter = Fighter; window.Combat = Combat; Fighter.BODY = BODY;
})();
