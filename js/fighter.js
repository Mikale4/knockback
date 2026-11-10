/* ============================================================================
   fighter.js -- one action figure in a fight: control, moves, physics, and
   everything that happens when a hit lands.

   THE KNOCK//BACK RULES (a platform fighter: platform.js has the stage)
   - Hits raise the target's DAMAGE %. A launching hit sends them TUMBLING,
     and the higher their % the further: knock them past a BLAST ZONE and
     they lose a stock. Hold the stick as you're launched to bend it.
   - Off the stage, get back with your jumps, a side Special and the ↑
     Special (it rises; after it you're HELPLESS until you land or grab a
     LEDGE). Hold ↓ on a thin platform to drop through it; ↓ in the air
     falls fast; let go of Jump at once for a short hop.
   - Light and Heavy take the stick's direction: Light alone is the string,
     → is the pause move, ↑ the launcher, ↓ the low move. Heavy is a KNOCK
     (hold it to charge): alone the neutral KNOCK (a slam into the floor: a
     ground bounce), ←/→ the side KNOCK, ↑ the up KNOCK, ↓ the down KNOCK
     (low, both sides). Special the same way: neutral, side, up (each figure's
     own way back to the stage) and down. In the air, ↓ + Light is the spike.
     Guard blocks from both sides, a Legend Art too (most of the guard).
   - WALLED STAGES have a wall at each end: a launch into one bounces back
     (KNOCK//BACK) for more, a dodge as you hit it from the second bounce on
     techs it, and enough stress breaks it open (out that end, the blast zone
     is close). On those the way out is up: the top blast zone is lower.
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
  const GRAV = 30, BODY = 0.42, LEAPG = 52, HALF = Math.PI / 2, FASTFALL = 19;
  // the throws out of a grab: how long the throw takes, its pose, its move
  const THROWS = { f: { t: 0.12, pose: 'hurl', mv: 'throwF' }, s: { t: 0.16, pose: 'hurl', mv: 'throwF' }, b: { t: 0.24, pose: 'hurl', mv: 'throwB' }, u: { t: 0.16, pose: 'palmUp', mv: 'throwU' }, d: { t: 0.24, pose: 'overhead', mv: 'throwD' } };
  const GRAPPLER = { throwF: 'wrThrowF', throwB: 'wrThrowB', throwU: 'wrThrowU', throwD: 'wrThrowD' };
  const _v = new V3(), _w = new V3(), _c = new V3(), _f = new V3();
  const fwd = (yaw, v) => (v || new V3()).set(Math.sin(yaw), 0, Math.cos(yaw));

  class Fighter {
    constructor(m, idx, build, input, opts) {
      opts = opts || {};
      this.m = m; this.idx = idx; this.build = build; this.baseBuild = build; this.input = input; this.opts = opts;
      this.st = this.calc(build);
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
      if (this.build !== this.baseBuild) { this.build = this.baseBuild; this.st = this.calc(this.build); this.ready = Anim.readyFor(this.build); this.newTrails(); }
      this.fig.restore();
      const S = this.st;
      this.pos.set(x, 0, 0); this.vel.set(0, 0, 0); this.yaw = yaw; this.obj.rotation.y = yaw; this.visYaw = yaw;
      this.pct = 0; this.hp = this.maxHp = S.hp;   // (DAMAGE %: hp is a view of it, platform.js)
      this.dropT = 0; this.ledgeCd = 0; this.ledgeUsed = false; this.ledgeSide = 0; this.plat = null; this.upB = false; this.shortOk = false; this.spawnFloat = 0; this.respawnT = 0;
      this.armorMax = Object.assign({}, S.armor); this.armor = Object.assign({}, S.armor);
      this.broken = { head: false, armR: false, armL: false, legs: false };
      for (const n of ['head', 'armL', 'armR']) this.fig.reattach(n);
      this.setLegMat(false);
      this.uses = S.uses; this.useRegen = 0;
      this.guardMax = S.guard; this.guardHp = S.guard; this.guardIdle = 0;
      this.state = 'idle'; this.stateT = 0; this.move = null; this.hitstop = 0; this.inv = 0; this.armorT = 0; this.armorHits = 0; this.armorCd = 0; this.limits = {};
      this.buffs = {}; this.burn = null; this.slowT = 0; this.dodgeCd = 0; this.airJumps = S.airJumps; this.airDodges = S.airDodges; this.airStr = 0; this.airDashes = 0; this.pauseWin = null; this.riposteT = 0; this.crumpled = this.dizzy = false;
      this.grounded = true; this.combo = this.freshCombo(); this.hitstun = 0; this.held = null; this.flash = 0; this.flashCol = 0xffffff;
      this.spin.rotation.set(0, 0, 0); this.techLock = 0; this.lastDodgeEnd = -9; this.groundT = 0; this.downT = 0; this.hardKD = false; this.kdT = 0; this.artFly = false; this.acExt = 0; this.gainsK = 0; this.cmdThrow = null;
      this.wallTouch = null; this.out = false; this.ko = false; this.runT = 0; this.phase = 0; this.hazT = 0;
      this.rounds = this.st.rounds; this.reloadT = 0;   // (AMMO: a gun's rounds, a bow's arrows)
      this.bx = {}; for (const h of KB.HOOK.reset) h(this);   // (a series' own state on a fighter: KB.HOOK)
      this.mot = []; this.mside = 0; this.chasing = false; this.autoArm = false; this.counterRip = null;
      this.sealT = 0; this.confT = 0; this.rootT = 0; this.hobbleT = 0; this.disarmT = 0; this.freezeT = 0; this.bribed = false; this.brandBy = null; this.touche = 0; this.toucheT = 0; this.wallBreakNext = false; this.lastSp = null; this.proneT = 0; this.invisOn = false;   // (UNIQUE SPECIALS) this.counterCall = null; this.regenRate = 0; this.riseAir = false; this.leapDone = false;   // (COMMAND SPECIALS)
      this.balls = {}; this.beanT = 0; this.beanWin = 0; this.swayT = 0; this.noBallT = -9; this.penance = 0; this.firstBlood = false; this.undyingUsed = false;   // (MODERN SPORTS: the balls on the floor are dropped with the round's shots)
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
    limitT(mv) { return mv.limit.t; }   // (the MUSKETEER's Drilled reload is in her ammo now)
    canUse(id) { const mv = KB.MOVES[id]; if (!mv || !mv.limit) return true; const now = this.m.time, log = (this.limits && this.limits[id]) || []; return log.filter(t => now - t < this.limitT(mv)).length < mv.limit.n; }
    useLimited(id, mv) {
      const now = this.m.time, L = this.limits = this.limits || {}, log = (L[id] || []).filter(t => now - t < this.limitT(mv));
      if (log.length >= mv.limit.n) {
        L[id] = log;
        if (now - (this.limitCall || -9) > 0.6) { this.limitCall = now; this.m.call(this, mv.name.toUpperCase() + ': ' + (this.limitT(mv) - (now - log[0])).toFixed(1) + ' s', 'bad'); }
        return false;
      }
      log.push(now); L[id] = log; return true;
    }
    /* the stats from the build, then the fight's modifiers for this figure (opts.mods: an Arcade boss's extra HP,
       damage, defence, weight) */
    calc(b) {
      const s = KB.stats(b, this.opts.bonus), k = this.opts.mods;
      if (k) {
        if (k.hp) s.hp = Math.round(s.hp * k.hp);
        if (k.dmg) for (const x of ['dmgR', 'dmgL', 'dmgH', 'dmgG', 'dmgK']) s[x] *= k.dmg;
        if (k.def) s.def = Math.min(0.4, s.def + k.def);
        if (k.kbTaken) s.kbTaken *= k.kbTaken;
        if (k.guard) s.guard = Math.round(s.guard * k.guard);
        if (k.hype) s.hypeGain *= k.hype;
      }
      return s;
    }
    /* a new body between rounds (the Arcade's PROTO-0 re-casts itself): new parts, stats, moves and trails; the round
       reset that follows puts it on its feet */
    recast(build) {
      if (this.spearOut) this.catchSpear(true);
      this.fig.dispose(); this.brokenMat.dispose();
      this.build = this.baseBuild = build; this.st = this.calc(build);
      this.fig = Models.figure(build); this.fig.root.position.y = -0.95; this.spin.add(this.fig.root);
      this.brokenMat = this.fig.mat.clone(); this.brokenMat.color.setHex(0x6a6a72);
      this.ready = Anim.readyFor(build); this.newTrails(); this.color = KB.LINES[build.core.line].css;
    }
    freshCombo() { return { hits: 0, dmg: 0, bounces: 0, t: 0, gb: false, by: null, otg: 0, ext: 0, dh: 0 }; }
    newTrails() { if (this.trailR) { this.trailR.dispose(); this.trailL.dispose(); } this.trailR = FX.trail(this.st.trailR); this.trailL = FX.trail(this.st.trailL); }
    /* snap a part on off the floor: your own, or the same part off the other figure if yours is missing (its moves come with it) */
    wearPart(p) {
      const part = p.part;
      if (this.fig.parts[part] === p.grp) this.fig.reattach(part); else this.fig.adopt(part, p.grp);
      const swapped = !!p.item && this.build[part] !== p.item;
      if (swapped) {
        this.build = Object.assign({}, this.build, { [part]: p.item }); this.st = this.calc(this.build);
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
    /* the ↑ Special in the air is a recovery: it needs no use, just one go a trip into the air (it comes back when you land or catch a ledge) */
    upAir(id) { return !this.grounded && !!this.st.cmd && id === this.st.cmd.dp; }
    canSpecial(id) { const sp = KB.MOVES[id || this.st.special]; if (this.sealT > 0 || (sp && sp.needImp && !this.m.minions.some(mn => mn.owner === this)) || (sp && sp.needBall && !this.ballOut(sp.needBall))) return false; if (this.upAir(id)) return !this.upUsed && !this.broken.head && !(sp && sp.ball && this.ballOut(sp.ball)); return this.uses > 0 && !this.broken.head && this.m.time >= (this.spReady || 0) && !(sp && sp.ball && this.ballOut(sp.ball)); }
    tossable() { return ['head', 'armL', 'armR'].find(p => !this.broken[p] && !this.fig.detached[p]) || null; }
    canToss() { const o = this.opp; return !!(this.hasImp() || this.tossable()) && !(o && o.combo.by === this && o.comboing && o.combo.ext >= 2); }
    /* the SUMMONER carrying an imp throws it, not a part */
    hasImp() { return !!(this.m.carried && this.m.carried(this).length); }
    tossMove() { return this.hasImp() ? 'impToss' : 'partToss'; }
    setLegMat(broken) { for (const n of ['legL', 'legR']) this.fig.parts[n].children.forEach(c => { if (c.isMesh && c.material !== VX.glowMat()) c.material = broken ? this.brokenMat : this.fig.mat; }); }
    get opp() { return this.m.opp(this); }
    /* left or right only: the fight is on one plane (the figure turns to it, the hits go along it) */
    get forward() { return _f.set(Math.sin(this.yaw) >= 0 ? 1 : -1, 0, 0).clone(); }
    /* the DAMAGE %, seen as health: maxHp - % / PCT, never under 1 (so a 200% figure still counts as alive), and setting
       it moves the % by the change (a heal takes % off, damage puts it on, however high it already is) */
    get hp() { return Math.max(1, this.maxHp - this.pct / Platform.PCT); }
    set hp(v) { const d = v - this.hp; this.pct = Math.max(0, this.pct - d * Platform.PCT); }
    faceX(dx) { if (Math.abs(dx) > 1e-3) this.yaw = dx > 0 ? HALF : -HALF; }
    get airborne() { return !this.grounded; }
    get inHitstun() { return this.state === 'hit' || this.state === 'tumble' || this.state === 'guardstun' || this.state === 'gbreak'; }
    get comboing() { return this.combo.hits > 0 && (this.state === 'hit' || this.state === 'tumble' || this.state === 'held' || this.state === 'down'); }
    setState(s) { this.state = s; this.stateT = 0; this.artFly = false; this.artBounce = false; }

    /* ---------------------------------------------------------------- main */
    update(dt) {
      if (this.rec && (this.state !== 'attack' || !this.upB)) this.recClear();
      if (!U.quiet && this.state === 'attack' && this.move && this.moveT < (this.move.su || 0) && (this.move.type === 'teleport' || this.move.cross || this.move.act === 'swap' || this.move.act === 'soulSwap')) this.blinkLook();   // (a blink's tell)   // (the ↑ Special's rope and the like, once it's over: recovery.js)
      if (this.hitstop > 0) { this.hitstop -= dt; this.shakeFig(); this.stopped = true; return; }
      this.stopped = false;   // (Training's frame meter skips the frames a figure stands frozen in a hit's hitstop)
      if (this.slowT > 0) { this.slowT -= dt; dt *= 0.45; }
      this.stateT += dt;
      const S = this.st, I = this.input;
      // timers
      this.inv = Math.max(0, this.inv - dt); this.armorT = Math.max(0, this.armorT - dt); this.armorCd = Math.max(0, this.armorCd - dt); this.dodgeCd = Math.max(0, this.dodgeCd - dt);
      this.techLock = Math.max(0, this.techLock - dt); this.dropT = Math.max(0, this.dropT - dt); this.ledgeCd = Math.max(0, this.ledgeCd - dt);
      for (const k in this.buffs) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) delete this.buffs[k]; }
      if (this.burn) this.updBurn(dt);
      if (this.state !== 'guard' && this.state !== 'guardstun' && this.state !== 'gbreak') { this.guardIdle += dt; if (this.guardIdle > 0.3) this.guardHp = Math.min(this.guardMax, this.guardHp + this.guardMax * Combat.SHIELD.regen * dt); }
      if (!this.comboing && this.state !== 'ko') this.burst = Math.min(100, this.burst + 2.6 * S.burstRate * dt);
      if (this.uses < S.uses && !this.broken.head) { this.useRegen += dt; if (this.useRegen > S.useRegen) { this.useRegen = 0; this.uses++; } }
      // BARD signature: the beat pulses under your feet
      if (S.sig === 'beat' && !this.broken.armR) { const b = Music.beat(this.m); if (b.n !== this.lastBeat) { this.lastBeat = b.n; if (this.state !== 'ko' && !this.m.cine) FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.06), { r0: 0.3, r1: 1.0, life: 0.22, color: 0xff8ad8 }); } }
      if (this.m.training && this.m.training.meter) { this.hype = 100; this.burst = 100; this.uses = S.uses; }
      if (this.combo.hits && this.inHitstun) this.combo.t += dt;
      if (this.reloadT > 0) {   // AMMO: reloading, and all of it back when it's done
        this.reloadT -= dt;
        if (this.reloadT <= 0) { this.reloadT = 0; this.rounds = S.rounds; if (this.state !== 'ko' && this.state !== 'out') { this.m.call(this, S.ammoIn, 'buff'); SFX.play('snapon'); } }
      }
      this.recMotion();
      // UNIQUE SPECIALS: what's been done to you wears off
      if (this.sealT > 0) this.sealT -= dt; if (this.confT > 0) this.confT -= dt; if (this.rootT > 0) this.rootT -= dt; if (this.hobbleT > 0) this.hobbleT -= dt; if (this.disarmT > 0) this.disarmT -= dt; if (this.proneT > 0) this.proneT -= dt;
      if (this.toucheT > 0) { this.toucheT -= dt; if (this.toucheT <= 0) this.touche = 0; }
      for (const h of KB.HOOK.tick) h(this, dt, this.m);
      if (!!this.buffs.invis !== this.invisOn) { this.invisOn = !!this.buffs.invis; this.obj.visible = !this.invisOn; if (!this.invisOn) FX.burst(_c.copy(this.pos).setY(1), { n: 10, color: [0x8a8a90, 0xd8d8e0], speed: 2, size: 0.12, gravity: -1, life: 0.5 }); }
      if (this.invisOn && U.vrand() < 0.08) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.2), { n: 1, color: [0x8a8a90], speed: 0.5, size: 0.1, gravity: -1, life: 0.5 });   // (a wisp of smoke gives him away, just)
      if (this.buffs.regen && this.state !== 'ko' && this.state !== 'out') this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.regenRate * dt);
      if (this.beanT > 0) {   // BASEBALL: beaned, and seeing stars as soon as they're on their feet
        this.beanWin -= dt;
        if (this.beanWin <= 0 || this.state === 'ko' || this.state === 'out') this.beanT = 0;
        else if (this.grounded && ['idle', 'run', 'guard'].includes(this.state) && !this.m.cine) { this.move = null; this.setState('hit'); this.hitstun = this.beanT; this.dizzy = true; this.vel.set(0, 0, 0); this.beanT = 0; this.m.call(this, 'DIZZY', 'counter'); }
      }

      // the Snap button: Burst out of hitstun, or cancel a move with Hype
      if (I.peek('snap') && this.state !== 'ko' && !this.m.frozen) {
        if ((this.inHitstun || this.state === 'held' && !this.heldBySuper) && this.burst >= 100) { I.take('snap'); this.doBurst(); }
        else if (this.hype >= 50 && this.canChase()) { I.take('snap'); this.techChase(); }
        else if (this.state === 'attack' && this.move && this.move.type !== 'super' && this.hype >= 50) { I.take('snap'); this.snapCancel(); }
      }

      // FROZEN (the Samurai's Kiai): stopped dead where they stand, or hang, until it wears off
      const frozen = this.freezeT > 0; if (frozen) { this.freezeT -= dt; this.vel.set(0, 0, 0); }
      if (!frozen) switch (this.state) {
        case 'idle': case 'run': this.updGround(dt); break;
        case 'air': this.updAir(dt); break;
        case 'attack': this.updAttack(dt); break;
        case 'guard': this.updGuard(dt); break;
        case 'guardstun': this.physics(dt, 14); if (this.riposte()) break; if (this.stateT > this.hitstun) this.setState(this.input.held.guard ? 'guard' : 'idle'); break;
        case 'gbreak': {
          this.physics(dt, this.grounded ? 10 : 0);
          if (this.grounded) { const I = this.input; for (const b of ['light', 'heavy', 'special', 'jump', 'guard', 'dodge']) if (I.take(b)) this.gbreakT = Math.max(0, this.gbreakT - Combat.SHIELD.mash); }
          if (this.stateT > 0.3 && this.grounded && (this.gbreakT -= dt) <= 0) { this.setState('idle'); this.dizzy = false; }
          break;
        }
        case 'dodge': this.updDodge(dt); break;
        case 'ddash': this.updDownDash(dt); break;
        case 'hit': this.physics(dt, 9); if (this.stateT > this.hitstun) { if (this.crumpled && this.grounded) { this.crumpled = false; this.hardKD = false; this.setState('down'); } else { this.endCombo(); this.crumpled = this.dizzy = false; this.setState(this.grounded ? 'idle' : 'air'); } } break;
        case 'tumble': this.updTumble(dt); break;
        case 'down': this.physics(dt, 12); if (this.stateT > (this.kdT || (this.hardKD ? 0.85 : 0.6))) { this.kdT = 0; this.setState('getup'); this.inv = 0.45; this.endCombo(); } break;
        case 'getup': this.physics(dt, 12); if (this.stateT > 0.32) this.setState('idle'); break;
        case 'held': this.updHeld(dt); break;
        case 'grab': this.updGrab(dt); break;
        case 'burst': this.physics(dt, 6, 0.35); if (this.stateT > 0.45) this.setState(this.grounded ? 'idle' : 'air'); break;
        case 'ko': this.physics(dt, this.grounded ? 6 : 0); break;
        case 'victory': case 'intro': this.physics(dt, 12); break;
        case 'out': this.updOut(dt); break;
        case 'ledge': this.updLedge(dt); break;
        case 'helpless': this.updHelpless(dt); break;
      }
      this.collide();
      this.animate(dt);
    }

    /* camera-relative stick -> a world direction (the camera looks from +Z) */
    stick() {
      const P = this.bx && this.bx.puppetT > 0 && this.bx.puppetBy;   // (PUPPET STRINGS: their legs walk them to her)
      if (P && !['ko', 'out'].includes(P.state)) { const dx = P.pos.x - this.pos.x; return Math.abs(dx) < 1.3 ? null : _w.set(Math.sign(dx), 0, 0).clone(); }
      const mv = this.input.move, c = this.confT > 0 ? -1 : 1; return Math.abs(mv.x) < 0.3 ? null : _w.set(Math.sign(mv.x) * c * Math.min(1, Math.abs(mv.x) * 1.15), 0, 0).clone(); }   // (CHARMED: backwards)
    /* the stick's up and down (+1 up), and which way it points for an attack: 'f' (the way you face), 'b', 'u', 'd' or null */
    stickY() { const y = this.input.move.y; return (this.confT > 0 ? -1 : 1) * y; }
    attackDir() { return this.dirOf(this.input.move.x, this.input.move.y); }
    dirOf(sx, sy) {
      const c = this.confT > 0 ? -1 : 1, x = sx * c, y = sy * c;
      if (Math.hypot(x, y) < 0.45) return null;
      if (Math.abs(y) > Math.abs(x) * 0.85) return y > 0 ? 'u' : 'd';
      return (x > 0) === (this.forward.x > 0) ? 'f' : 'b';
    }
    faceOpp() { const o = this.opp; if (o) this.faceX(o.pos.x - this.pos.x); }

    updGround(dt) {
      const S = this.st, I = this.input, dir = this.stick();
      const legs = this.broken.legs ? 0.68 : 1;
      if (this.tryActions(true)) return;
      const sp = S.speed * legs * (this.buffs.momentum ? 1.06 : 1) * (this.buffs.valor ? 1.1 : 1) * (this.buffs.haste ? 1.3 : 1) * (this.buffs.immov ? 0.6 : 1) * (this.rootT > 0 ? 0 : 1);
      // hold ↓ on a thin platform to drop through it
      if (this.plat && this.stickY() < -0.65 && !this.input.held.guard) { this.dropT = 0.28; this.grounded = false; this.plat = null; this.pos.y -= 0.05; this.setState('air'); this.m.event('drop', { f: this }); return; }
      if (dir && this.stickY() > -0.65) {
        this.vel.x = U.smooth(this.vel.x, dir.x * sp, 14, dt);
        this.faceX(dir.x);
        if (this.state !== 'run') this.setState('run'); this.runT += dt;
      } else {
        this.vel.x = U.smooth(this.vel.x, 0, 16, dt);
        if (this.state !== 'idle') this.setState('idle'); this.runT = 0;
        const o = this.opp; if (o && Math.abs(o.pos.x - this.pos.x) < 9 && this.stateT > 0.12) this.faceOpp();
      }
      this.physics(dt, 0);
      if (!this.grounded) this.setState('air');
    }
    updAir(dt) {
      const S = this.st, dir = this.stick();
      // respawned: you stand on the air a moment (or until you move)
      if (this.spawnFloat > 0) { this.spawnFloat -= dt; this.vel.set(0, 0, 0); if (dir || this.stickY() < -0.5 || this.input.peek('jump') || this.input.peek('light') || this.input.peek('heavy') || this.input.peek('special') || this.input.peek('dodge')) this.spawnFloat = 0; else return; }
      if (this.tryActions(false)) return;
      this.airDrift(dt, 0.85);
      this.physics(dt, 0);
      if (this.grounded) { this.land(); return; }
      Platform.ledge(this);
    }
    /* in the air: the stick drifts you (you keep facing the way you jumped: Light the other way is a back attack), ↓
       falls fast, and letting go of Jump straight after a jump from the ground makes it a short hop */
    airDrift(dt, k) {
      const S = this.st, dir = this.stick();
      if (dir) this.vel.x = U.smooth(this.vel.x, dir.x * S.speed * k, 4.5, dt);
      if (this.shortOk && this.vel.y > 0 && !this.input.held.jump && this.m.time - this.jumpT < 0.14) { this.vel.y *= 0.58; this.shortOk = false; this.m.event('shorthop', { f: this }); }
      if (this.vel.y < 1.5 && this.stickY() < -0.7 && this.vel.y > -FASTFALL) { if (!this.fastFell && !U.quiet) FX.ring(_c.copy(this.pos).setY(this.pos.y + 1.6), { r1: 0.5, life: 0.18, color: 0xffffff }); if (!this.fastFell) this.m.event('fastfall', { f: this }); this.fastFell = true; this.vel.y = -FASTFALL; }
    }
    /* HANGING ON A LEDGE: Jump jumps off it, toward (or ↑) climbs up, away (or ↓) lets go, Light / Heavy climbs up
       with an attack, Dodge rolls onto the stage. Five seconds and you let go */
    updLedge(dt) {
      const I = this.input, St = this.m.arena.stage, side = this.ledgeSide, d = this.input.move;
      this.vel.set(0, 0, 0); this.pos.set(side * (St.W + 0.3), St.top - 1.5, 0);
      if (this.stateT < 0.12 || this.m.phase !== 'fight') return;
      const toward = -side * d.x * (this.confT > 0 ? -1 : 1) > 0.5, away = side * d.x * (this.confT > 0 ? -1 : 1) > 0.5;
      const climb = (state) => { this.pos.set(side * (St.W - 0.55), St.top, 0); this.grounded = true; this.plat = null; this.vel.set(0, 0, 0); this.yaw = side > 0 ? -HALF : HALF; this.setState(state || 'idle'); this.inv = Math.max(this.inv, 0.2); this.m.event('climb', { f: this }); };
      if (I.take('jump')) { this.setState('air'); this.vel.set(-side * 2.2, this.st.jump * 1.02, 0); this.grounded = false; this.ledgeCd = 0.35; SFX.play('jump'); this.m.event('jump', { f: this, ledge: true }); return; }
      if (I.take('light') || I.take('heavy')) { climb(); this.startMove(this.st.dashAtk, 'dash'); this.inv = Math.max(this.inv, 0.3); return; }
      if (I.take('dodge')) { climb(); this.dodgeDir = new V3(-side, 0, 0); this.dodgeAir = false; this.setState('dodge'); this.inv = 0.4; SFX.play('dodge'); return; }
      if (toward || this.stickY() > 0.6) { climb(); return; }
      if (away || this.stickY() < -0.6 || this.stateT > 5) { this.setState('air'); this.ledgeCd = 0.45; this.grounded = false; return; }
    }
    /* HELPLESS: after the ↑ Special in the air you only drift down until you land or catch a ledge */
    updHelpless(dt) {
      this.airDrift(dt, 0.55);
      this.physics(dt, 0);
      if (this.grounded) { this.land(); this.recoverT = 0.12; return; }
      Platform.ledge(this);
    }
    land() {
      this.airJumps = this.st.airJumps; this.airDodges = this.st.airDodges; this.airStr = 0; this.airDashes = 0; this.pogos = 0; this.ledgeUsed = false; this.fastFell = false; this.shortOk = false;
      if (!(this.plat && this.plat.temp)) this.upUsed = false;   // (a stone pillar to stand on doesn't give the ↑ Special back)
      this.setState('idle'); this.groundT = 0;
      if (this.vel.y < -8) { SFX.play('land'); FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.05), { n: 5, color: this.m.arena.dust, speed: 2, size: 0.07, life: 0.4, up: 0.4 }); }
    }

    /* the buttons, from neutral (ground or air) */
    tryActions(ground) {
      const I = this.input, S = this.st;
      if (this.m.frozen || this.m.phase !== 'fight') return false;
      if (this.buffs.bubble) { for (const b of ['super', 'toss', 'special', 'light', 'heavy']) I.take(b); }   // (DIVINE SHIELD: nothing gets in, nothing gets out)
      if (this.disarmT > 0 && I.peek('light') && !I.held.guard) { I.take('light'); if (this.m.time - (this.disarmCall || -9) > 0.6) { this.disarmCall = this.m.time; this.m.call(this, 'DISARMED', 'bad'); } }
      if ((this.rootT > 0 || this.hobbleT > 0) && (I.peek('jump') || I.peek('dodge'))) { I.take('jump'); I.take('dodge'); if (this.m.time - (this.disarmCall || -9) > 0.6) { this.disarmCall = this.m.time; this.m.call(this, this.rootT > 0 ? 'PINNED' : 'HOBBLED', 'bad'); } }
      if (I.take('super') && this.hype >= 100 && ground) { this.startSuper(); return true; }
      if (I.take('toss') && this.canToss()) { this.startMove(this.tossMove(), 'toss'); return true; }
      if (I.take('special')) { const id = this.specialId(); if (this.canSpecial(id) && (ground || this.moveOk(id, 'air'))) { this.startSpecial(id); return true; } else if (this.broken.head) this.m.call(this, 'NO HEAD!', 'bad'); else if (this.sealT > 0) this.m.call(this, 'SEALED', 'bad'); else if (KB.MOVES[id].needImp) this.m.call(this, 'NO IMPS', 'bad'); else if (KB.MOVES[id].needBall) this.m.call(this, 'NO BALL OUT', 'bad'); else { const sp = KB.MOVES[id]; if (sp && sp.ball && this.ballOut(sp.ball) && this.m.time - this.noBallT > 0.8) { this.noBallT = this.m.time; this.m.call(this, 'NO BALL!', 'bad'); } } }
      if (ground) {
        if (I.held.guard && I.take('light')) { this.startMove(this.grabMove(), 'throw'); return true; }
        if (I.take('dodge') && this.dodgeCd <= 0) { this.startDodge(); return true; }
        if (I.take('jump')) { this.jump(1); return true; }
        if (I.take('light')) {
          const pw = this.pauseWin, ad = this.attackDir(); this.pauseWin = null;
          if (pw && this.m.time >= pw.from && this.m.time <= pw.to) this.startMove(pw.id, 'light');   // the PAUSE branch
          else if (this.m.time - this.lastDodgeEnd < 0.3 || this.state === 'dodge' || (this.state === 'run' && this.runT > 0.22 && ad === 'f')) this.startMove(S.dashAtk, 'dash');
          else if (ad === 'b') { this.yaw = -this.yaw; this.startMove(this.tiltMove('f'), 'light'); }
          else if (ad) this.startMove(this.tiltMove(ad), 'light');
          else this.startLight();
          return true;
        }
        if (I.peek('heavy') && (I.held.guard || I.guardAt.heavy) && this.canSpear()) { I.take('heavy'); this.startMove('spearThrow', 'spear'); return true; }
        if (I.take('heavy')) {
          const ad = this.attackDir();
          if (ad === 'u') this.startMove(this.knock('u'), 'launch');
          else if (ad === 'd') this.startMove(this.knock('d'), 'heavy');
          else if (!ad) this.startMove(this.knock('n'), 'heavy');
          else { if (ad === 'b') this.yaw = -this.yaw; this.startMove(this.knock('f'), 'heavy'); }
          return true;
        }
        if (I.held.guard) { this.setState('guard'); this.guardStart = this.m.time; return true; }
      } else {
        if (I.take('jump')) {
          if (this.wallTouch && S.perk === 'walljump') { this.wallJump(); return true; }
          if (this.airJumps > 0 && !this.broken.legs) { this.airJumps--; this.jump(0.85); return true; }
        }
        // DOWN DASH: Guard + Dodge in the air -- a fast dive to the floor (it spends your air dodge; no invincibility)
        if (I.peek('dodge') && (I.held.guard || I.guardAt.dodge) && this.airDodges > 0) { I.take('dodge'); this.airDodges--; this.startDownDash(); return true; }
        if (I.take('dodge') && this.airDodges > 0 && this.dodgeCd <= 0) { this.airDodges--; this.startDodge(); return true; }
        if (I.take('light') && !this.airStr) {
          const ad = this.attackDir(); this.airStr = 1;
          if (ad === 'd') { const sp = this.airSpike(); if (sp) { this.startMove(sp, 'air'); return true; } }
          if (ad === 'u') { this.startMove(this.tiltMove('u'), 'air'); return true; }
          if (ad === 'b') this.yaw = -this.yaw;   // (a back attack: turn and swing)
          this.startMove(this.airRoot(), 'air'); return true;
        }
        if (I.peek('heavy') && (I.held.guard || I.guardAt.heavy) && this.canSpear()) { I.take('heavy'); this.startMove('spearThrow', 'spear'); return true; }
        if (I.take('heavy')) { this.startMove(this.leftMove('airHeavy'), 'airHeavy'); return true; }
      }
      return false;
    }
    /* every Special works in the air except the ones that need the floor: a trap set on it, a leap off it, a summoning circle */
    moveOk(id, where) { const mv = KB.MOVES[id]; return where !== 'air' || !['trap', 'summon', 'leap'].includes(mv.type); }
    /* a Light with the stick: → the string's pause move, ↑ its launcher, ↓ its third (low) blow; one move, no string */
    tiltMove(d) {
      const R = KB.MOVES[this.lightRoot()] || {}, B = R.nx && R.nx.l && KB.MOVES[R.nx.l], C = B && B.nx && B.nx.l && KB.MOVES[B.nx.l], D4 = C && C.nx && C.nx.l && KB.MOVES[C.nx.l];
      const pick = d === 'f' ? (B && B.nx && B.nx.p) || (B && B.id) : d === 'u' ? (D4 && D4.id) || this.leftMove('launch') : (C && C.id) || (B && B.id);
      return this.tilts(pick || this.lightRoot(), d);
    }
    /* a single blow, not a string: the move without its follow-ups (made once, kept). The UP TILT reaches higher (it
       catches someone coming down on you); the DOWN TILT is low and quick and pops them up a little, to start a combo */
    tilts(id, d) {
      const k = 'tilt' + (d === 'u' || d === 'd' ? d : '') + ':' + id; if (KB.MOVES[k]) return k; const mv = KB.MOVES[id]; if (!mv) return id;
      const o = Object.assign({}, mv, { id: k, nx: null });
      if (d === 'u') { o.h = Math.max(mv.h || 1, 1.65); o.rad = (mv.rad || 1) + 0.2; }
      if (d === 'd') Object.assign(o, { zone: 'low', h: 0.4, pose: 'sweep', kb: [2.5, 7], launch: 1, launcher: 0, finisher: 0, spike: 0, around: 0, multi: 0, reach: Math.max(1.1, mv.reach || 1.1), su: Math.min(mv.su || 0.08, 0.08), rc: Math.min(mv.rc || 0.22, 0.24) });
      KB.MOVES[k] = o; return k;
    }
    /* the four KNOCKs (Heavy with the stick; hold Heavy to charge any of them): the side KNOCK is the L-arm's Heavy,
       the up KNOCK its launcher, the down KNOCK a low blow all round, the neutral KNOCK an overhead slam just in front
       that drives them into the floor (a ground bounce; off the stage, straight down). The last two are made from the
       Heavy, or its melee fallback when the Heavy is a shot */
    knock(d) {
      const H = this.leftMove('heavy'), L = this.leftMove('launch');
      if (d === 'f') return H;
      const base = d === 'u' ? L : H, k = 'kn' + d + ':' + base; if (KB.MOVES[k]) return k;
      const mv = KB.MOVES[base]; if (!mv) return base;
      let o;
      if (d === 'u') o = Object.assign({}, mv, { id: k, charge: 1, nx: null });
      else if (d === 'n') {
        const src = mv.type === 'melee' ? mv : KB.MOVES[(this.st.dry || {}).heavy] || KB.MOVES[L] || mv;
        o = Object.assign({}, src, { id: k, name: src.name + ' Slam', type: 'melee', pose: 'overhead', around: 0, reach: Math.min(1.35, src.reach || 1.2), rad: Math.max(1.0, src.rad || 1), h: 0.6, zone: 'mid', lunge: 1.5, dist: 0,
          kb: [1.5, -9], launch: 1, launcher: 0, spike: 1, dive: 0, charge: 1, nx: null, round: 0, proj: null, multi: 0, auto: null,
          dmg: Math.round((src.dmg || 50) * 0.95), su: Math.max(0.17, src.su || 0.17), ac: Math.max(0.08, src.ac || 0.08), rc: Math.max(0.34, src.rc || 0.34) });
      }
      else {
        const src = mv.type === 'melee' ? mv : KB.MOVES[(this.st.dry || {}).heavy] || KB.MOVES[L] || mv;
        o = Object.assign({}, src, { id: k, name: 'Low ' + src.name, type: 'melee', pose: 'sweep', around: 1, reach: 0, rad: Math.max(1.55, src.rad || 1), h: 0.35, zone: 'low', lunge: 0, dist: 0,
          kb: [Math.max(9, ((src.kb || [12])[0]) * 0.8), 7.5], launch: 1, launcher: 0, spike: 0, dive: 0, charge: 1, nx: null, round: 0, proj: null, multi: 0, auto: null,
          dmg: Math.round((src.dmg || 50) * 0.9), su: Math.max(0.13, src.su || 0.15), ac: Math.max(0.1, src.ac || 0.1), rc: Math.max(0.32, src.rc || 0.32) });
      }
      KB.MOVES[k] = o; return k;
    }
    /* ↓ + Light in the air: the air string's second blow (its spike) on its own */
    airSpike() { const A = KB.MOVES[this.airRoot()]; const n = A && A.nx && A.nx.l; return n ? this.tilts(n) : null; }
    jump(k) {
      this.vel.y = this.st.jump * k * (this.broken.legs ? 0.8 : 1); this.grounded = false; this.plat = null; this.setState('air'); if (k < 1) this.airStr = 0;
      this.jumpT = this.m.time; this.shortOk = k >= 1; this.fastFell = false;
      const d = this.stick(); if (d) { this.vel.x = d.x * this.st.speed * 0.9; if (k < 1) this.faceX(d.x); }
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
      const d = this.stick() || new V3(0, 0, 0);   // (no direction: a dodge on the spot)
      this.dodgeDir = d.clone(); this.setState('dodge'); this.move = null;
      const vanish = this.st.passive === 'vanish';
      this.inv = (this.grounded ? 0.22 : 0.18) * (vanish ? 1.6 : 1);
      this.dodgeCd = (vanish ? 0.33 : 0.55) * this.st.dodgeCd;
      this.dodgeAir = !this.grounded; SFX.play('dodge');
      if (vanish) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 8, color: 0x6a4a9a, speed: 2, size: 0.1, gravity: -2, life: 0.4 });
    }
    updDodge(dt) {
      if (this.chasing) {
        // TECH CHASE: the dash steers onto where they're going and stops a step short (then you're free to act)
        const o = this.opp, tx = o ? o.pos.x + o.vel.x * 0.12 : this.pos.x, tz = o ? o.pos.z + o.vel.z * 0.12 : this.pos.z;
        const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
        if (!o || ['ko', 'out'].includes(o.state) || d < 1.25 || this.stateT > 0.7) { this.chasing = false; this.vel.x *= 0.15; this.vel.z *= 0.15; this.lastDodgeEnd = -9; this.setState(this.grounded ? 'idle' : 'air'); return; }
        const sp = 21; this.vel.x = dx / d * sp; this.vel.z = dz / d * sp; this.yaw = Math.atan2(dx, dz); this.dodgeDir.set(dx / d, 0, dz / d);
        if (U.vrand() < 0.5) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.15), { n: 1, color: [0x7cf9ff, this.m.arena.dust], speed: 1, size: 0.08, life: 0.3 });
        this.physics(dt, 0); return;
      }
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
        this.land(); SFX.play('land'); FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.06), { r0: 0.3, r1: 1.4, life: 0.25 });
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.05), { n: 10, color: this.m.arena.dust, speed: 3, size: 0.08, life: 0.4, up: 0.4 });
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
      const pz = b.poison, C3 = pz ? [0xb0ff6a, 0x5ad040, 0xd8ffb0] : [0xffd040, 0xff6a20, 0xff3010];   // (POISON, the KUNOICHI's: the same ticks, green)
      if (U.vrand() < 0.35) FX.burst(_c.copy(this.pos).set(this.pos.x + U.vrnd(-0.3, 0.3), this.pos.y + U.vrnd(0.3, 1.6), this.pos.z + U.vrnd(-0.3, 0.3)), { n: 1, color: C3, glow: true, speed: 0.4, size: 0.09, gravity: pz ? -2 : -5, life: 0.35 });
      while (b.tick >= 0.5 && b.left > 0) {
        b.tick -= 0.5; b.left--;
        let d = Math.round(b.dps * 0.5 * (1 - this.st.def)); if (this.m.training && this.m.training.godP2 && this.idx === 1) d = 0;
        this.hp -= d; if (b.by) b.by.records.dmg += d;
        if (this.comboing && this.combo.by === b.by) this.combo.dmg += d;
        this.flash = Math.max(this.flash, 0.35); this.flashCol = pz ? 0x7aff5a : 0xff7a20;
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 1), { n: 5, color: C3.slice(0, 2), glow: true, speed: 2, size: 0.08, gravity: -4, life: 0.4 });
      }
      if (b.t <= 0 || b.left <= 0) this.burn = null;
    }

    /* ---------------------------------------------------------------- guard */
    updGuard(dt) {
      const I = this.input;
      this.guardIdle = 0;
      // THE SHIELD wears down while it's held (a full one lasts about 6 s), and breaks when it's gone
      this.guardHp -= this.guardMax * Combat.SHIELD.drain * dt; if (this.guardHp <= 0) { Combat.shieldBreak(this, null); return; }
      if (this.riposte()) return;
      this.vel.x = U.smooth(this.vel.x, 0, 18, dt); this.vel.z = U.smooth(this.vel.z, 0, 18, dt);
      this.faceOpp(1 - Math.exp(-10 * dt));
      this.physics(dt, 0);
      if (I.take('light')) { this.startMove(this.grabMove(), 'throw'); return; }
      if (I.take('toss') && this.canToss()) { this.startMove(this.tossMove(), 'toss'); return; }
      if (this.canSpear() && I.take('heavy')) { this.startMove('spearThrow', 'spear'); return; }
      if (I.take('dodge') && this.dodgeCd <= 0) { this.startDodge(); return; }
      if (I.take('jump')) { this.jump(1); return; }
      if (!I.held.guard) this.setState('idle');
    }
    /* SAMURAI signature: Light right after a Just Guard is an instant riposte */
    riposte() {
      if (!(this.riposteT > this.m.time) || this.broken.armR || !this.input.take('light', 0.2)) return false;
      this.riposteT = 0; this.startMove(this.st.ripMove || 'kaeshi', 'light'); this.m.call(this, this.st.ripName || 'KAESHI!', 'counter'); SFX.play('slash'); return true;
    }

    /* --------------------------------------------------------------- attacks */
    lightRoot() { return this.broken.armR ? 'stump1' : this.spearOut ? 'fistA' : this.handEmpty() ? 'bareA' : this.broken.armL ? this.st.lightPure || this.st.light : this.st.light; }
    airRoot() { return this.broken.armR ? 'stumpAir' : this.spearOut ? 'fistAir' : this.handEmpty() ? 'bareAir' : this.broken.armL ? this.st.airPure || this.st.air : this.st.air; }
    /* MODERN SPORTS: a ball that's out on the floor. The BOWLER's ball is the one he swings, so until he picks it back
       up he fights bare-handed; a move that needs a ball that's out is swapped (see startMove) */
    ballOut(kind) { return !!(this.balls && this.balls[kind]); }
    handEmpty() { return this.build.armR.line === 'bowler' && this.ballOut('bowling'); }
    /* the ball in the hand, shown only while it's there (the FOOTBALL player's in his left, the BOWLER's in his right, the
       BASKETBALL player's in his left) */
    ballHands() {
      const P = this.fig.parts, L = this.build.armL.line, R = this.build.armR.line;
      if ((L === 'football' || L === 'basketball') && P.wL) P.wL.visible = !this.ballOut(L);
      if (R === 'bowler' && P.wR) P.wR.visible = !this.ballOut('bowling');
    }
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
    /* AMMO (the Flintlock, pistols, a musket, a swivel gun, a bow): a shot spends one when it goes off, the last one starts the reload */
    gunReady() { return !this.st.rounds || this.rounds > 0; }
    spendRound() {
      this.rounds = Math.max(0, this.rounds - 1);
      if (this.rounds <= 0) { this.reloadT = this.st.reload; this.reloadCall(true); }
    }
    reloadCall(force) { if (!force && this.m.time - (this.reloadCallT || -9) < 0.8) return; this.reloadCallT = this.m.time; this.m.call(this, this.reloadT > 0 && !force ? this.st.ammoOut + ': ' + this.reloadT.toFixed(1) + ' s' : this.st.ammoOut, 'bad'); }
    /* THE FOUR SPECIALS: Special with the stick. At rest, the NEUTRAL Special (the head's own); ← or →, the SIDE
       Special (you turn to face the way you pressed); ↑, the UP Special (each figure's own way back to the stage); ↓,
       the DOWN Special. They're keyed qcf (side), dp (up) and qcb (down), from when they were stick motions. Let go of
       the stick a moment before Special and it still counts.
       The CPU, a trial's demo and the harness just say which (cpu.cmd) and never read their stick for it. The camera never turns in a
       fight, so the screen's right is the world's +x (the same mapping stick() uses) and the sim never reads the camera */
    recMotion() {
      const mv = this.input.move, l = Math.hypot(mv.x, mv.y), H = this.mot || (this.mot = []), o = this.opp;
      if (l > 0.45) this.lastDir = { x: mv.x, y: mv.y, t: this.m.time };
      // which side they're on: it only changes once they're clearly across (straight above or below keeps the last side)
      if (o && o.state !== 'out') { const dx = o.pos.x - this.pos.x; if (Math.abs(dx) > 0.35 || !this.mside) this.mside = dx >= 0 ? 1 : -1; }
      let c = 5;
      if (l > 0.5) {
        const k = Math.round(Math.atan2(mv.y, mv.x * (this.mside || 1)) / (Math.PI / 4));   // 0 is forward, -2 is down
        c = { 0: 6, 1: 9, 2: 8, 3: 7, 4: 4, '-4': 4, '-1': 3, '-2': 2, '-3': 1 }[k];
      }
      const last = H[H.length - 1];
      if (!last || last.c !== c) { H.push({ c, t: this.m.time }); if (H.length > 12) H.shift(); }
    }
    motion() {
      const mv = this.input.move; let x = mv.x, y = mv.y;
      if (Math.hypot(x, y) < 0.45 && this.lastDir && this.m.time - this.lastDir.t < 0.12) { x = this.lastDir.x; y = this.lastDir.y; }   // (let go of the stick just before Special)
      const d = this.dirOf(x, y); this.spFace = d === 'f' || d === 'b' ? Math.sign(x) * (this.confT > 0 ? -1 : 1) : 0;
      return d === 'u' ? 'dp' : d === 'd' ? 'qcb' : d ? 'qcf' : null;   // ↑ ↓ ← →
    }
    specialId() {
      this.spFace = 0; const S = this.st, cpu = this.input.cpu, c = cpu && cpu.cmd ? cpu.cmd : cpu && !cpu.stick ? null : this.motion();   // (the CPU, a trial demo and the harness just say which: their stick is for walking; online players' sticks are people's)
      if (cpu && cpu.cmd) cpu.cmd = null;
      if (c) this.m.event('motion', { f: this, c });   // (the tutorial listens)
      const id = c && S.cmd && S.cmd[c];
      return id && KB.MOVES[id] ? id : S.special;
    }
    startSpecial(id) {
      if (KB.MOVES[id].encore) {   // ENCORE (the Bard): the last Special again
        if (!this.lastSp || KB.MOVES[this.lastSp].encore) { this.m.call(this, 'NOTHING TO ENCORE', 'small'); return; }
        this.m.call(this, 'ENCORE!', 'buff'); id = this.lastSp;
      }
      const cmd = id !== this.st.special, o = this.opp;
      if (cmd) { this.mot.length = 0; this.m.call(this, KB.MOVES[id].name.toUpperCase(), 'small'); }
      this.startMove(id, 'special');
      // a command special goes at them wherever they are on the screen (the direction is their side of the screen, not straight at them)
      if (this.move && this.move.id === id) { if (this.spFace) this.faceX(this.spFace); else if (cmd && o && o.state !== 'out') this.faceOpp(); }
    }
    /* a LEAP at them: it comes down where they were standing, and hits all round when it lands */
    startLeap(mv) {
      const o = this.opp, T = mv.air || 0.6, R = mv.range || 8;
      const tgt = o && !['out', 'ko'].includes(o.state) && U.dist(this.pos, o.pos) < R ? _w.copy(o.pos) : _w.copy(this.pos).addScaledVector(this.forward, R * 0.6);
      const St = this.m.arena.stage; if (this.grounded && !Platform.offStage(this)) { tgt.x = U.clamp(tgt.x, -St.W + 0.6, St.W - 0.6); tgt.y = Math.max(tgt.y, St.top); }   // (from the stage, a leap comes down on it)
      this.vel.set((tgt.x - this.pos.x) / T, GRAV * T / 2, (tgt.z - this.pos.z) / T); this.grounded = false;
      if (o) this.yaw = U.ang(this.pos, o.pos);
    }
    leapLand(mv) {
      const o = this.opp; this.vel.set(0, 0, 0);
      FX.addShake(0.35); FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.06), { r1: mv.rad + 0.8, life: 0.4 }); FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.1), { n: 16, color: this.m.arena.dust, speed: 4, size: 0.1, life: 0.5 }); SFX.play('boom');
      this.m.hitMinions(this, _c.copy(this.pos).setY(this.pos.y + 0.6), mv.rad, this.moveSerial * 10 + 7);
      if (o && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < mv.rad + BODY && o.pos.y - this.pos.y < 1.8 && !this.hitSet.has(o)) {
        this.hitSet.add(o); Combat.hit(this, o, mv, { kind: this.kind, dir: _v.subVectors(o.pos, this.pos).setY(0).normalize().clone(), at: _c.copy(o.pos).setY(o.pos.y + 0.6).clone() });
      }
    }
    grabMove() { return this.st.sig === 'grappler' ? 'wrGrab' : 'throw'; }
    startLight() { this.startMove(this.lightRoot(), 'light'); }
    startMove(id, kind) {
      let mv = KB.MOVES[id]; if (!mv) return;
      if (mv.ball && this.ballOut(mv.ball)) {
        // its ball is on the floor: Heavy becomes the move you make without it (the FOOTBALL player's Full-Force
        // Tackle; a plain Tackle or Body Drop for the rest), a Special waits
        const alt = mv.noBall || { heavy: 'tackle', airHeavy: 'bodyDrop' }[kind];
        if (!alt || !KB.MOVES[alt]) { if (this.m.time - this.noBallT > 0.8) { this.noBallT = this.m.time; this.m.call(this, 'NO BALL!', 'bad'); } return; }
        id = alt; mv = KB.MOVES[alt];
      }
      if (mv.round && this.st.rounds && this.rounds <= 0) {
        // AMMO: out while reloading: the move you make without it (the butt of the gun, the bow itself); a string keeps going
        const alt = (this.st.dry || {})[kind], a = alt && KB.MOVES[alt];
        if (!a) { this.reloadCall(); return; }
        id = alt; mv = mv.nx && !a.nx ? Object.assign({}, a, { nx: mv.nx }) : a;
      }
      if (mv.limit && !this.useLimited(id, mv)) return;   // (a move with a limit: n uses in any t seconds)
      if (kind === 'special' && !mv.encore) this.lastSp = id;
      if (this.buffs.invis && kind !== 'special') { delete this.buffs.invis; }   // (SMOKE BOMB: attacking gives him away)
      // A BLINK (a teleport, a blink behind them, trading places): never out of nowhere. Thrown cold (not in our own
      // combo) it takes at least 0.22 s to come out, and all the while the place it'll come out shows (blinkLook)
      if (mv.type === 'teleport' || mv.cross || mv.act === 'swap' || mv.act === 'soulSwap') {
        const o = this.opp, ours = o && o.comboing && o.combo.by === this;
        if (!ours && (mv.su || 0) < 0.22) mv = Object.assign({}, mv, { su: 0.22 });
      }
      if (mv.prone) this.proneT = mv.su + mv.ac + mv.rc;
      this.moveGround = this.grounded;
      this.move = mv; this.kind = kind; this.moveT = 0; this.hitSet = new Set(); this.moveHit = false; this.charge = 0; this.fired = false; this.activeOn = false;
      this.lastSub = -1; this.acExt = 0; this.extraHits = 0; this.rapidUsed = 0; this.pauseWin = null; this.moveSerial = (this.moveSerial || 0) + 1; this.riseAir = false; this.leapDone = false; this.autoArm = false;
      this.beatOn = !!(mv.beat && this.st.sig === 'beat' && (kind === 'light' || kind === 'air') && Music.beat(this.m).near); this.beatShown = false;
      if (this.beatOn) FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.08), { r0: 1.0, r1: 1.7, life: 0.25, color: 0xfff27a });
      if (mv.armorSU) this.giveArmor(mv.su, mv.oneArmor);
      if (this.buffs.berserk && kind !== 'super') this.giveArmor(mv.su + (mv.ac || 0), true);   // (BERSERKERGANG: every attack takes one hit of armour)
      if (kind === 'special') { if (this.upAir(id)) this.upUsed = true; else { this.uses--; this.spReady = this.m.time + (this.st.spCd || 0); } }
      this.upB = kind === 'special' && !!(this.st.cmd && id === this.st.cmd.dp);   // (the ↑ Special: a recovery, each figure's own: recovery.js)
      if (this.upB) this.recBegin(mv); else if (this.rec) this.recClear();
      this.setState('attack'); this.aim(mv); Combat.strikeStart(this); this.m.event('move', { f: this, id, kind });
      if (kind === 'air' || kind === 'airHeavy') { this.vel.y = Math.max(this.vel.y, kind === 'air' ? (this.st.sig === 'hangtime' ? 4.2 : 2.2) : 3); }   // (BASKETBALL: hang time)
      if (mv.armor || (kind === 'dash' && this.st.perk === 'unstoppable')) this.giveArmor(mv.su + mv.ac, mv.oneArmor || this.st.perk === 'unstoppable');
      if (mv.inv) this.inv = Math.max(this.inv, mv.su + mv.ac + 0.04);
    }
    /* THE TELL of a blink, while it winds up (looks only): a ring of shadow closing in on the spot it'll come out at
       (behind them for a blink behind, on them for a swap, on the imp for a Soul Swap), wisps gathering on the user, and a
       ping as it starts */
    /* where a blink winding up will come out (null: not a blink, or past its wind-up) */
    blinkAt() {
      const mv = this.move, o = this.opp;
      if (this.state !== 'attack' || !mv || this.moveT >= (mv.su || 0) || !(mv.type === 'teleport' || mv.cross || mv.act === 'swap' || mv.act === 'soulSwap')) return null;
      if (mv.act === 'soulSwap') { let best = null, bd = -1; for (const mn of this.m.minions) if (mn.owner === this) { const e = Math.abs(mn.pos.x - this.pos.x); if (e > bd) { bd = e; best = mn; } } return best ? best.pos.clone() : null; }
      if (!o || ['out', 'ko'].includes(o.state)) return null;
      return mv.act === 'swap' ? o.pos.clone() : new V3(o.pos.x + (o.pos.x >= this.pos.x ? 1 : -1) * 1.0, o.pos.y, 0);
    }
    blinkLook() {
      const mv = this.move, t = this.moveT, su = mv.su || 0.1, at = this.blinkAt();
      const k = Math.min(1, t / su), col = KB.LINES[this.build.core.line].pal.glow;
      if (t < 0.02) SFX.play('jguard');
      if (at) {
        if (U.vrand() < 0.5) FX.ring(_v.set(at.x, at.y + 0.9, 0).clone(), { r0: 1.5 - k * 1.1, r1: 0.25, life: 0.12, normal: new V3(0, 0, 1), color: 0x2a1a3a });
        if (U.vrand() < 0.7) FX.burst(_v.set(at.x + U.vrnd(-0.5, 0.5), at.y + U.vrnd(0, 1.8), 0).clone(), { n: 1, color: [0x30243f, col], glow: true, speed: 0.6, size: 0.12, gravity: -3, life: 0.35 });
      }
      if (U.vrand() < 0.7) FX.burst(_v.set(this.pos.x + U.vrnd(-0.4, 0.4), this.pos.y + U.vrnd(0.2, 1.7), 0).clone(), { n: 1, color: [0x30243f, col], speed: 0.8, size: 0.1, gravity: 2, life: 0.3 });
    }
    /* turn toward the stick, then snap onto the opponent if they are in front and close. TARGET TRACKING (an option,
       opts.track; off for a trial's demo): every attack turns you to face them, wherever you were facing or aiming */
    aim(mv) {
      const o = this.opp;
      if (o && this.opts.track && !this.noTrack) { this.yaw = U.ang(this.pos, o.pos); return; }
      const d = this.stick(); if (d) this.yaw = Math.atan2(d.x, d.z);
      if (!o) return;
      const dist = U.dist(this.pos, o.pos), a = U.ang(this.pos, o.pos);
      const range = (mv.reach || 1.2) + (mv.lunge || 0) * 0.25 + 1.6 + (mv.range || 0) + (mv.dist || 0) * 0.6;
      if (dist < range && (!d || Math.abs(U.wrap(a - this.yaw)) < 0.95)) this.yaw = a;
      else if (!d && dist < 9) this.yaw = a;
    }
    dmgMult(kind) {
      const S = this.st; let m = { light: S.dmgR, air: S.dmgR, spear: S.dmgR, heavy: S.dmgL, launch: S.dmgL, airHeavy: S.dmgL, gun: S.dmgL, special: S.dmgH, counter: S.dmgH, trap: S.dmgH, dash: S.dmgG, super: S.dmgK, throw: 1 }[kind] || 1;
      m *= S.setDmg;
      if (this.buffs.weak) m *= 0.8;   // (WEAKENED by a command special)
      if (this.buffs.berserk) m *= 1.25; if (this.buffs.pumped) m *= 1.15;
      if (this.buffs.momentum) m *= 1.1; if (this.buffs.fury) m *= 1.15; if (this.buffs.valor) m *= 1.12;
      if (S.passive === 'wyrmblood' && !this.grounded) m *= 1.12;
      if (kind === 'minion') m *= S.impDmg || 1;
      if (S.passive === 'bushido' && this.hp < this.maxHp * 0.35) m *= 1.15;
      if (S.passive === 'fury') m *= 1 + Math.min(0.12, (1 - this.hp / this.maxHp) * 0.16);
      // MODERN SPORTS
      if (S.passive === 'radical' && !this.grounded) m *= 1.12;
      if (this.buffs.chalk) m *= 1.15;
      if (kind === 'throw') { if (S.passive === 'crowd') m *= 1.25; if (S.sig === 'grappler') m *= 1.25; }
      if (S.passive === 'slugger' && kind === 'heavy') m *= 1.15;
      if (S.passive === 'juggernaut' && (kind === 'dash' || kind === 'special')) m *= 1.2;
      if (S.passive === 'gains') m *= 1 + (this.gainsK || 0);
      // EDO JAPAN, KNIGHTS OF THE REALM
      if (this.buffs.sake) m *= 1.15; if (this.buffs.zeal) m *= 1.12;
      if (S.passive === 'domain' && Math.hypot(this.pos.x, this.pos.z) < 4) m *= 1.12;
      if (S.passive === 'charger') m *= 1 + Math.min(0.2, (this.runT || 0) * 0.1);
      if (S.sig === 'mounted' && (kind === 'dash' || kind === 'special')) m *= 1.15;
      if (S.passive === 'admiral') m *= 1.1; if (this.buffs.scrap) m *= 1.15;
      return m;
    }
    updAttack(dt) {
      const mv = this.move, I = this.input;
      if (mv.type === 'super') return this.updSuper(dt);
      // hold Heavy to charge a KNOCK (up to 0.6 s); the VIKING's axe winds up any Light the same way (to 0.5 s)
      const heavyCharge = mv.charge && (this.kind === 'heavy' || this.kind === 'launch') && I.held.heavy && this.charge < 0.6 && !this.autoArm;
      const lightCharge = mv.chargeL && this.kind === 'light' && I.held.light && this.charge < 0.5 && this.moveT > 0.03;
      if ((heavyCharge || lightCharge) && this.moveT >= mv.su * 0.6) {
        this.charge += dt; this.flash = 0.3; this.flashCol = lightCharge && this.charge >= 0.45 ? 0xff4020 : 0xffb030;
        if (lightCharge || heavyCharge) this.giveArmor(0.05, true);   // (a held Heavy too: one hit of armour, for every figure)   // (once its one hit is spent, holding on doesn't bring it back: the 1.2 s wait)
        if (U.rand() < 0.4) FX.burst(this.fig.socket(lightCharge ? 'wR' : 'wL', [0, 0, lightCharge ? 9 : 2]), { n: 1, color: 0xffd060, glow: true, speed: 1.5, size: 0.06, gravity: -3, life: 0.3 });
        this.vel.x *= 0.8; this.vel.z *= 0.8; this.physics(dt, 0); return;
      }
      // MONK signature, Flow: every hit of the running combo makes the strings faster
      const o0 = this.opp, flow = this.st.sig === 'flow' && (this.kind === 'light' || this.kind === 'air') && o0 && o0.combo.by === this ? 1 + Math.min(0.25, o0.combo.hits * 0.04) : 1;
      const t0 = this.moveT; this.moveT += dt * flow; const t = this.moveT;
      // mash Light during a rapid move to keep it going
      if (mv.rapid && t >= mv.su && t < mv.su + mv.ac + this.acExt && this.rapidUsed < mv.rapid && I.take('light', 0.12)) { this.rapidUsed++; this.acExt += 0.18; this.extraHits += 3; }
      const su = mv.su, ac = mv.ac + (this.acExt || 0), end = su + ac + mv.rc; this.curAc = ac;
      // HEAVY AUTO COMBO: Heavy again before the KNOCK lands makes it the opener of the chain (heavies.js)
      if (mv.auto && this.kind === 'heavy' && !this.autoArm && t < su + 0.02 && I.take('heavy', 0.2)) { this.autoArm = true; this.flash = 0.15; this.flashCol = 0xffd060; }   // (acExt: unset until a first move; a Legend Art as your first move never ended)
      const F = this.forward;
      // movement through the move
      if (this.upB && this.rec && this.recMove(mv, t0, t, su, ac, dt)) return;   // the ↑ Special: its own way back (recovery.js)
      if (mv.type === 'dash' && t >= su && t < su + ac) { const sp = mv.dist / ac; this.vel.x = F.x * sp; if (!this.grounded && !mv.hop && !this.upB) this.vel.y = 0; }
      else if (mv.lunge && mv.type !== 'leap' && t > su * 0.4 && t < su + ac) {   // (a leap flies its own arc)
        // lunge in, but stop short of running past them
        // (the blow's real reach, reach.js: a fist steps in closer than a lance before it stops)
        const o = this.opp, stopAt = mv.vReach != null ? mv.vReach * 0.7 + 0.25 : (mv.reach || 1) * 0.85, near = o && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < stopAt && Math.abs(U.wrap(U.ang(this.pos, o.pos) - this.yaw)) < 1.2;
        const sp = near ? 0 : mv.lunge * (this.grounded ? 1 : 0.4); this.vel.x = U.smooth(this.vel.x, F.x * sp, 20, dt); this.vel.z = U.smooth(this.vel.z, F.z * sp, 20, dt); }
      else if (this.grounded) { this.vel.x = U.smooth(this.vel.x, 0, 14, dt); this.vel.z = U.smooth(this.vel.z, 0, 14, dt); }
      if (this.moveGround && this.grounded && !this.upB) { const lo = this.plat ? this.plat.x1 + 0.1 : -this.m.arena.stage.W + 0.1, hi = this.plat ? this.plat.x2 - 0.1 : this.m.arena.stage.W - 0.1, nx = this.pos.x + this.vel.x * dt; if ((nx < lo && this.vel.x < 0) || (nx > hi && this.vel.x > 0)) this.vel.x = 0; }
      if (!this.grounded && (this.kind === 'air') && t < su + ac) this.vel.y = Math.max(this.vel.y, 0.6);
      if (this.kind === 'airHeavy' && t >= su) this.vel.y = Math.min(this.vel.y, -6);
      if (mv.dive && t >= su && !this.grounded) { this.vel.x = F.x * 7; this.vel.z = F.z * 7; this.vel.y = -12; }
      this.physics(dt, 0, 0, this.upB && this.rec ? this.rec.g : undefined);
      if (this.upB && this.rec && this.recAfter(mv, t, su)) return;   // (landed, or caught a ledge)
      // COMMAND SPECIALS: a rising move is committed until it lands (a beat to recover); a leap hits where it comes down
      if (mv.rise && t >= su) { if (!this.grounded) this.riseAir = true; else if (this.riseAir) { this.riseAir = false; const lag = mv.landLag || 0.2; if (t >= end - lag) { this.moveT = end - lag; SFX.play('land'); } } }
      if (mv.type === 'leap' && !this.leapDone && t > su + 0.1 && this.grounded) { this.leapDone = true; this.leapLand(mv); if (this.moveT < su + ac) this.moveT = su + ac; }
      // into the active frames
      if (t0 < su && t >= su) this.onActive(mv);
      if (t >= su && t < su + ac) this.activeFrames(mv);
      else if (t >= su + ac) this.activeOn = false;
      // cancels
      if (this.cancels(mv, t, su, ac)) return;
      const diving = this.kind === 'airHeavy' || mv.dive;
      if ((t >= end && !(this.yankT > 0) && !((mv.rise || mv.type === 'leap') && !this.grounded) && !(this.upB && this.rec && t < this.rec.end)) || (diving && this.grounded && t > su)) {
        if (diving && this.grounded) { this.land(); FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.05), { r1: 1.6, life: 0.3 }); SFX.play('land'); this.setState('idle'); this.vel.set(0, 0, 0); this.recoverT = 0.15; return; }
        // a string move with a pause branch: wait a beat, then Light
        const pw = this.kind === 'light' && mv.nx && mv.nx.p ? { id: mv.nx.p, from: this.m.time + 0.03, to: this.m.time + 0.6 } : null;
        const helpless = this.upB && !this.grounded; this.upB = false;
        this.move = null; this.setState(this.grounded ? 'idle' : helpless ? 'helpless' : 'air'); this.pauseWin = pw;
      } else if (this.grounded && (this.kind === 'air') && t > su) { this.move = null; this.land(); }
    }
    cancels(mv, t, su, ac) {
      const I = this.input, hit = this.moveHit, k = this.kind;
      if (k === 'heavy' && mv.auto && this.autoArm && hit && t >= su + ac * 0.5) { this.startMove(mv.auto, 'heavy'); this.autoArm = true; return true; }   // (the chain runs itself)
      const after = t >= su + ac * (mv.multi ? 0.85 : hit ? 0.3 : 1);
      const nx = mv.nx || {};
      if (k === 'light') {
        if (nx.l && after && I.take('light', 0.25)) { this.startMove(nx.l, 'light'); return true; }
        if (hit && t >= su + ac * 0.3 && I.take('heavy', 0.25)) {
          // Heavy in a string launches them up (alone, ↑ or ↓); with ← or → it's the KNOCK instead (← turns you round first)
          const d0 = I.dirAt.heavy, ad = this.attackDir() || (d0 ? this.dirOf(d0.x, d0.y) : null), o = this.opp;
          if (ad === 'f' || ad === 'b') { if (ad === 'b') this.yaw = -this.yaw; this.startMove(this.leftMove('heavy'), 'heavy'); }
          // PIRATE with the Flintlock: Heavy after the FIRST Light is a Quick Shot gun cancel (once a combo, then the string
          // starts over); after two or more it's the launcher like everyone's
          else if (this.st.gunCancel && mv.id === this.lightRoot() && !this.broken.armL && this.gunReady() && o && !o.combo.gun) {   // (an empty chamber: the launcher)
          o.combo.gun = true; this.startMove(this.st.gunCancel, 'gun'); }
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
        if (I.peek('toss', 0.2) && this.canToss()) { I.take('toss'); this.startMove(this.tossMove(), 'toss'); return true; }
        if (I.peek('special', 0.2)) { const id = this.specialId(); if (this.canSpecial(id) && (this.grounded || this.moveOk(id, 'air'))) { I.take('special'); this.startSpecial(id); return true; } }
        if (I.peek('super', 0.2) && this.hype >= 100 && this.grounded) { I.take('super'); this.startSuper(); return true; }
      }
      // a free dodge out of a finished, landed string (after recovery mostly)
      return false;
    }
    onActive(mv) {
      const F = this.forward, o = this.opp;
      if (mv.sfx) SFX.play(mv.sfx === 'shot' ? 'whoosh' : mv.sfx === 'heavy' ? 'whoosh' : mv.sfx);
      this.activeOn = true;
      // COMMAND SPECIALS: up off the floor, a hop, a step back, a trap set down, a leap at them
      if (mv.rise) { this.vel.y = mv.rise; this.grounded = false; }
      if (mv.hop) { this.vel.y = mv.hop; this.grounded = false; }
      if (mv.recoil) { this.vel.x = -F.x * mv.recoil; this.vel.z = -F.z * mv.recoil; if (mv.recoilUp) { this.vel.y = mv.recoilUp; this.grounded = false; } }
      if (mv.type === 'trap') this.m.placeTrap(this, mv);
      if (mv.puff) FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.8), { n: 26, color: [mv.puff, 0xffffff, 0x8a8a90], speed: 3.5, size: 0.14, gravity: -1, life: 0.65 });   // (smoke, spirits, a muzzle's blast)
      if (mv.type === 'leap') this.startLeap(mv);
      if (mv.act) this.m.act(this, mv);   // (UNIQUE SPECIALS: imps, a gate, a parrot, the deck lurching...)
      if (mv.type === 'proj') { this.m.fire(this, mv, this.charge); if (mv.round && this.st.rounds) this.spendRound(); }
      else if (mv.type === 'radial') {
        FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.1), { r1: mv.rad * 1.1, life: 0.35, color: mv.ringCol || 0xffe0a0 });
        this.m.hitMinions(this, _c.copy(this.pos).setY(this.pos.y + 0.5), mv.rad, this.moveSerial * 10);
        const rb = [{ x0: this.pos.x - mv.rad, x1: this.pos.x + mv.rad, y0: this.pos.y - 0.3, y1: this.pos.y + 2.3 }]; Combat.note(this, rb, 'hit', 0.15);
        if (o && Combat.touch(rb, o)) Combat.hit(this, o, mv, { kind: this.kind, dir: _v.subVectors(o.pos, this.pos).setY(0).normalize().clone() });
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
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.9), { n: 8, color: 0xffffff, speed: 2, size: 0.06, life: 0.3 });
      }
      // NINJA Vanishing Stab: blink to their far side, so the hit carries them back the other way
      // the Vanishing Stab blinks behind them once a combo; after that it's just a stab
      if (mv.cross && o && U.dist(this.pos, o.pos) < (mv.reach || 1) + 1.8 && !['out', 'ko', 'down'].includes(o.state) && !(o.combo.by === this && o.comboing && o.combo.blink && this.st.sig !== 'haunt')) {
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
      let use = this.autoArm && mv.auto ? Object.assign({}, mv, { kb: [2.5, 0], launch: 0, launcher: 0, finisher: 0, stun: 0.5 }) : mv;   // (an auto combo's opener staggers)
      if (mv.multi) {
        const n = mv.multi + (this.extraHits || 0), idx = Math.min(n - 1, Math.floor((this.moveT - mv.su) / ((this.curAc || mv.ac) / n)));
        if (idx > this.lastSub) { this.lastSub = idx; this.hitSet.delete(o); }
        if (idx < n - 1) use = Object.assign({}, mv, { kb: [1, 0], launch: 0, spike: 0, crumple: 0, dizzy: 0, finisher: 0, stun: 0.32 });
      }
      if (this.hitSet.has(o)) return;
      if (mv.type === 'melee' || mv.type === 'teleport' || mv.type === 'grab') {
        // the HITBOXES: whatever strikes (the blade and the arm, a fist, a foot), as it's posed this frame (Combat.strikeBoxes)
        const F = this.forward, c = mv.around ? _c.set(this.pos.x, this.pos.y + 1, this.pos.z) : _c.set(this.pos.x + F.x * mv.reach, this.pos.y + mv.h, this.pos.z + F.z * mv.reach);
        this.m.hitMinions(this, c, mv.rad, this.moveSerial * 10 + Math.max(0, this.lastSub));
        const hb = Combat.strikeBoxes(this, mv); Combat.note(this, hb, mv.type === 'grab' ? 'grab' : 'hit');
        const otg = mv.groundHit ? o.state === 'down' : Combat.otgOk(this, o, use, this.kind);
        const at = Combat.lying(o) && !(otg && o.state === 'down') ? null : Combat.touch(hb, o);
        if (at) {
          this.hitSet.add(o);
          if (mv.type === 'grab') return this.tryGrab(o);
          const dir = mv.around ? _v.subVectors(o.pos, this.pos).setY(0).normalize().clone() : null, poke = o.state === 'guard' || o.state === 'guardstun' ? Combat.pokeAt(hb, o) : null;
          Combat.hit(this, o, use, { kind: this.kind, charge: this.charge, at, poke, dir: dir && dir.lengthSq() > 0.5 ? dir : null, multiHit: use !== mv, otg });
        }
      } else if (mv.type === 'dash' && !mv.noHit) {
        // a charge hits with the whole body, anywhere along the way it has come (from where it started to here)
        const a = this.dashFrom || this.pos, b = this.pos;
        this.m.hitMinionsSeg(this, a, b, mv.rad, this.moveSerial * 10);
        const hb = Combat.bodyBoxes(this, a.x - b.x, a.y - b.y); Combat.note(this, hb, 'hit');
        const otg = Combat.otgOk(this, o, mv, this.kind), at = Combat.lying(o) && !(otg && o.state === 'down') ? null : Combat.touch(hb, o);
        if (at) { this.hitSet.add(o); Combat.hit(this, o, mv, { kind: this.kind, at, otg }); }
      }
      // weapon trail
      if (mv.trail) { const w = this.isLeftMove() ? 'wL' : 'wR', T = this.isLeftMove() ? this.trailL : this.trailR; if (!this.fig.detached[w === 'wL' ? 'armL' : 'armR']) T.push(this.fig.socket(w, [0, 0, 3]), this.fig.socket(w, [0, 0, w === 'wR' ? 14 : 10])); }
    }
    isLeftMove() { if (this.move && this.move.offhand) return true; if (this.move && this.move.twoHand) return false; return ['heavy', 'launch', 'airHeavy', 'gun'].includes(this.kind) || (this.move && /^(jabL|heavyDiag|bash|shoot)/.test(this.move.pose)); }
    addBuff(b) {
      if (KB.EXT.BUFF[b.id]) return KB.EXT.BUFF[b.id](this, b);
      if (b.id === 'bulwark') { this.armorT = b.t; this.armorHits = 99; this.buffs.bulwark = b.t; this.m.call(this, 'BULWARK', 'buff'); FX.ring(_c.copy(this.pos).setY(1), { r1: 1.6, normal: new V3(0, 1, 0), color: 0x66aaff }); }
      if (b.id === 'fury') { this.buffs.fury = b.t; this.m.call(this, 'FURY', 'buff'); }
      if (b.id === 'chalk') { this.armorT = b.t; this.armorHits = 99; this.buffs.chalk = b.t; this.m.call(this, 'CHALK UP', 'buff'); FX.burst(_c.copy(this.pos).setY(1.3), { n: 24, color: [0xffffff, 0xe8e8e8], speed: 2.5, gravity: -1, life: 0.8, size: 0.1 }); }
      if (b.id === 'slip') { this.buffs.slip = b.t; this.m.call(this, 'BOB & WEAVE', 'buff'); }
      if (b.id === 'sake') { const h = Math.round(this.maxHp * b.heal); this.hp = Math.min(this.maxHp, this.hp + h); this.buffs.sake = b.t; this.m.call(this, 'KANPAI! +' + h, 'heal'); FX.burst(this.fig.socket('head', [0, 2, 5]), { n: 8, color: [0xfff4d8, 0xffffff], speed: 1.5, size: 0.06, gravity: 3, life: 0.5 }); }
      if (b.id === 'kawarimi') { this.buffs.kawarimi = b.t; this.m.call(this, 'KAWARIMI', 'buff'); }
      if (b.id === 'vow') { this.buffs.vow = b.t; this.m.call(this, 'VOW OF THE TEMPLE', 'buff'); FX.ring(_c.copy(this.pos).setY(1), { r1: 1.5, normal: new V3(0, 1, 0), color: 0xffffff }); }
      if (b.id === 'zeal') { this.buffs.zeal = b.t; this.m.call(this, 'DEUS VULT!', 'buff'); }
      // LOVERS OF THE SEA
      if (b.id === 'spot') { const o = this.opp; if (o && U.dist(this.pos, o.pos) < 12 && !['ko', 'out'].includes(o.state)) { o.buffs.spotted = b.t; this.m.call(o, 'SPOTTED!', 'bad'); FX.ring(_c.copy(o.pos).setY(o.pos.y + 0.08), { r0: 0.3, r1: 1.2, life: 0.4, color: 0xd8a830 }); } else this.m.call(this, 'NOTHING IN SIGHT', 'small'); }
      if (b.id === 'hornpipe') { this.buffs.valor = b.t; this.m.call(this, 'HORNPIPE!', 'buff'); for (let i = 0; i < 2; i++) FX.ring(_c.copy(this.pos).setY(0.2 + i * 0.4), { r1: 1.3 + i * 0.3, life: 0.35, color: 0x7ad8ff }); }
      if (b.id === 'phase') { this.inv = Math.max(this.inv, b.t); this.buffs.phase = b.t; this.m.call(this, 'PHASE', 'buff'); FX.burst(_c.copy(this.pos).setY(this.pos.y + 1), { n: 14, color: [0x6affb0, 0xd8fff0], glow: true, speed: 2, size: 0.08, gravity: -1, life: 0.6 }); }
      if (b.id === 'parry') { this.buffs.parry = b.t; this.m.call(this, 'EN GARDE', 'buff'); FX.spark(this.fig.socket('wR', [0, 0, 8]), { color: 0x9ad8ff, size: 1.2 }); }
      // COMMAND SPECIALS
      if (b.id === 'counter') { this.buffs.counter = b.t; this.counterRip = b.rip; this.counterCall = b.call || 'COUNTER'; FX.ring(_c.copy(this.pos).setY(1), { r1: 1.3, life: 0.3, normal: new V3(0, 1, 0), color: 0xffffff }); }
      if (b.id === 'reflect') { this.buffs.reflect = b.t; this.m.call(this, b.call || 'REFLECT', 'buff'); FX.ring(_c.copy(this.pos).setY(1), { r1: 1.5, life: 0.35, normal: new V3(0, 1, 0), color: 0x9ad8ff }); }
      if (b.id === 'haste') { this.buffs.haste = b.t; this.m.call(this, b.call || 'HASTE', 'buff'); FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.3), { n: 12, color: [0xffffff, 0x9ad8ff], speed: 3, size: 0.07, life: 0.4 }); }
      if (b.id === 'regen') { this.buffs.regen = b.t; this.regenRate = b.hp / b.t; this.m.call(this, b.call || 'REGEN', 'heal'); FX.burst(_c.copy(this.pos).setY(1), { n: 16, color: [0x66ffcc, 0xffffff], glow: true, speed: 2, gravity: -3, life: 0.7, size: 0.07 }); }
      if (b.id === 'iron') { this.armorT = b.t; this.armorHits = b.hits || 3; this.buffs.iron = b.t; this.m.call(this, b.call || 'IRON SHIRT', 'buff'); FX.ring(_c.copy(this.pos).setY(1), { r1: 1.5, life: 0.35, normal: new V3(0, 1, 0), color: 0xd8a830 }); }
      // UNIQUE SPECIALS
      if (b.id === 'berserk') { this.hp -= Math.round(this.maxHp * (b.cost || 0.1)); this.buffs.berserk = b.t; this.m.call(this, 'BERSERKERGANG', 'buff'); this.flash = 0.5; this.flashCol = 0xff3010; FX.burst(_c.copy(this.pos).setY(1.3), { n: 16, color: [0xff3010, 0xffd060], speed: 3, size: 0.09, life: 0.5 }); }
      if (b.id === 'empower') { this.buffs.empower = b.t; this.m.call(this, b.call || 'EMPOWERED', 'buff'); FX.spark(this.fig.socket('wR', [0, 0, 8]), { color: 0xffffff, size: 1.4 }); }
      if (b.id === 'invis') { this.buffs.invis = b.t; this.m.call(this, 'VANISHED', 'buff'); }
      if (b.id === 'immov') { this.buffs.immov = b.t; this.armorT = Math.max(this.armorT, b.t); this.armorHits = 99; this.m.call(this, b.call || 'IMMOVABLE', 'buff'); FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.1), { r1: 1.8, life: 0.4, normal: new V3(0, 1, 0), color: 0xd8a830 }); }
      if (b.id === 'autoGuard') { this.buffs.autoGuard = b.t; this.m.call(this, b.call || 'GUARDED', 'buff'); }
      if (b.id === 'bubble') { this.buffs.bubble = b.t; this.inv = Math.max(this.inv, b.t); this.m.call(this, 'DIVINE SHIELD', 'buff'); }
      if (b.id === 'morale') { this.buffs.morale = b.t; this.m.call(this, 'COLOURS UP!', 'buff'); }
      if (b.id === 'fuses') { this.buffs.fuses = b.t; this.m.call(this, 'LIT FUSES', 'buff'); }
      if (b.id === 'pumped') { this.buffs.pumped = b.t; this.m.call(this, 'PUMPED', 'buff'); }
      if (b.id === 'catch') { this.buffs.catch = b.t; this.m.call(this, 'GLOVE UP', 'buff'); }
      if (b.id === 'ropes') { this.buffs.ropes = b.t; this.m.call(this, 'ON THE ROPES', 'buff'); }
      if (b.id === 'pure') { this.buffs.pure = b.t; this.burn = null; this.slowT = 0; this.sealT = this.confT = this.rootT = this.hobbleT = this.disarmT = 0; delete this.buffs.weak; delete this.buffs.spotted; this.m.call(this, 'PURIFIED', 'heal'); FX.burst(_c.copy(this.pos).setY(1.2), { n: 18, color: [0xffffff, 0xffe27a], speed: 2.5, gravity: -3, life: 0.7, size: 0.08 }); }
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
      const cmd = this.move && this.move.cmd, cmdMv = this.move && this.move.throwMv;
      // a command grab (Body Slam) chains out of a string: it takes them while they're staggered on the ground too
      if ((o.inHitstun && !(cmd && o.grounded && o.state === 'hit')) || o.airborne || o.state === 'dodge' || o.state === 'down' || o.state === 'getup' || o.inv > 0) return;
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
      SFX.play('guard'); this.m.call(this, cmd ? KB.MOVES[cmdMv].name.toUpperCase() + '!' : 'GRAB!', 'small'); this.m.event('grab', { f: this, vic: o });
      if (cmd) { this.cmdThrow = cmdMv; this.startThrow(cmd); }   // a command grab (the WRESTLER's Body Slam) throws at once
    }

    /* the Legend Art: a flash, a catch, and if it catches, a cinematic (arts.js) */
    startSuper() {
      this.m.event('super', { f: this });
      const mv = KB.MOVES[this.st.super];
      if (this.spearOut) this.catchSpear(false);   // (the Art calls the lance back to his hand)
      if (this.m.recallBalls) this.m.recallBalls(this);   // (and a sports figure's ball)
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
        if (r === true && this.artBlocked(o)) return;
        if (r === true && this.swayOut(o)) return;
        if (r === true) this.beginSeq(o);
        else if (r === 'miss' || this.catchT > 2.2) this.superMiss();
        return;
      }
      if (this.superPhase === 'seq') return this.updSeq(dt);
      if (this.superPhase === 'miss') { this.missT += dt; this.physics(dt, 12); if (this.missT > 0.45 && this.grounded) { this.move = null; this.setState('idle'); } else if (this.missT > 1.6) { this.move = null; this.setState('air'); } }
    }
    /* BOXER (Killer Instinct): a Legend Art thrown raw -- not one that follows a combo -- misses him one time in five:
       he bobs and sways out of it, a quick slip to the side */
    swayOut(o) {
      if (!o || o.st.passive !== 'killer' || o.comboing || o.combo.hits > 0 || !['idle', 'run', 'guard', 'guardstun', 'attack', 'air'].includes(o.state) || (o.state === 'attack' && o.move && o.move.type === 'super')) return false;
      if (U.rand() >= 0.2) return false;
      const d = _v.subVectors(o.pos, this.pos).setY(0); if (d.lengthSq() < 1e-4) fwd(this.yaw, d); d.normalize();
      const side = o.idx ? 1 : -1;
      o.move = null; o.dodgeDir = new V3(-d.z * side * 0.45, 0, d.x * side * 0.45); o.dodgeAir = !o.grounded; o.setState('dodge');
      o.inv = Math.max(o.inv, 0.6); o.yaw = U.ang(o.pos, this.pos); o.swayT = 0.4; o.hype = Math.min(100, o.hype + 10);
      this.m.call(o, 'SWAY!', 'tech'); SFX.play('dodge'); this.m.event('evade', { f: o, by: this }); this.m.event('sway', { f: o, by: this });
      this.superMiss(); return true;
    }
    /* a GUARD stops a Legend Art: the catch fails, the guard takes most of it (a worn guard shatters), and the Art's
       thrower is left open */
    artBlocked(o) {
      if (!o || !(o.state === 'guard' || o.state === 'guardstun' || (o.buffs.autoGuard && ['idle', 'run'].includes(o.state)))) return false;
      o.guardHp -= o.guardMax * 0.6; o.guardIdle = 0; o.hype = Math.min(100, o.hype + 8);
      const at = _c.copy(o.pos).setY(o.pos.y + 1).clone(); FX.spark(at, { color: 0x9fe8ff, size: 2.2 }); FX.ring(at, { r1: 2.2, life: 0.35, normal: new V3(0, 0, 1), color: 0x9fe8ff }); FX.addShake(0.4);
      if (o.guardHp <= 0) Combat.shieldBreak(o, this);
      else { o.setState('guardstun'); o.hitstun = 0.32; o.vel.x = (o.pos.x >= this.pos.x ? 1 : -1) * 6; SFX.play('jguard'); this.m.call(o, 'BLOCKED!', 'tech'); }
      this.m.event('artblock', { f: o, by: this });
      this.superMiss(); this.missT = -0.3; return true;
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
          FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.1), { r1: mv.rad * 1.2, life: 0.45, color: 0xffd080 }); FX.addShake(0.9); SFX.play('boom');
          FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.1), { n: 30, color: this.m.arena.dust, speed: 7, size: 0.14, life: 0.8 });
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
          FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.1), { r1: mv.rad * 2.2, life: 0.4, color: col }); FX.addShake(0.8); SFX.play('heavy');
          FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.2), { n: 24, color: [col, 0xffd080, this.m.arena.dust], glow: true, speed: 6, size: 0.1, life: 0.6 });
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
          FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.1), { r1: mv.rad * 1.15, life: 0.4, color: 0xfff07a }); FX.ring(_c.copy(this.pos).setY(1), { r1: mv.rad, life: 0.35, normal: this.m.camDir(), color: 0xffffff });
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
        if (t - dt <= 0) { FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.4), { r0: 0.2, r1: mv.rad, life: T, color: 0xff8ad8 }); FX.ring(_c.copy(this.pos).setY(1.2), { r0: 0.2, r1: mv.rad, life: T, color: 0xfff27a }); SFX.play('chord'); }
        if (can) { const d = U.dist(this.pos, o.pos); if (d >= r0 - 0.7 && d <= r + 0.7 && o.pos.y < 3.2) return true; }
        return t > T ? 'miss' : false;
      }
      return 'miss';
    }
    beginSeq(o) {
      // guarding doesn't stop a Legend Art that has caught you
      const otg = o.state === 'down' || o.state === 'getup';
      this.artCombo = o.comboing && o.combo.by === this;   // (a combo already going: hits, a bounce, an OTG)
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
      // In a combo already (the Art followed hits, a bounce or an OTG), the last hit is a HARD KNOCKDOWN: they're put on
      // the floor, longer than usual and with no quick rise, and an OTG can scoop them up again. A raw Art (no combo yet)
      // BOUNCES them the way its last hit goes, and the combo carries on: slammed down, off the FLOOR; knocked back
      // (away from you), off the WALL
      const slam = !!c.art.slam, inCombo = !!this.artCombo;
      const dir = new V3().subVectors(o.pos, this.pos).setY(0); if (slam || dir.lengthSq() < 0.09) dir.copy(c.D).setY(0); dir.normalize();
      const fin = Object.assign({}, mv, { dmg: mv.dmg * 0.52, type: 'melee', launch: 1, spike: !inCombo && slam ? 1 : 0, kb: [0, inCombo ? -12 : slam ? -10 : 5.5] });
      const r = Combat.hit(this, o, fin, { kind: 'super', dir: dir.clone(), force: true, at: _c.copy(o.pos).setY(o.pos.y + 1).clone() });
      if (r === 'hit' && o.state === 'tumble') {
        if (inCombo) {
          o.vel.set(dir.x * 2.5, -12, dir.z * 2.5); o.hardKD = true; o.kdT = 1.15; o.combo.otg = Math.min(o.combo.otg || 0, 1);
          this.m.call(o, 'HARD KNOCKDOWN', 'counter');
        } else if (slam) { o.vel.set(dir.x * 1.5, -10, dir.z * 1.5); o.artBounce = true; }
        else {
          // off to the wall: up a little, gravity lightened and no drag till it hits, fast enough to get there and bounce
          const A = this.m.arena; let d = 40, k = 1;
          for (const w of A.walls) { const a = dir[w.axis] * w.sign; if (a > 0.05) { const dd = (w.lim - BODY - w.sign * o.pos[w.axis]) / a; if (dd < d) { d = dd; k = a; } } }
          const g = GRAV * (0.68 + Math.min(0.7, o.combo.hits * 0.03 + o.combo.t * 0.05)) * 0.45, v = 5.5;
          const T = (v + Math.sqrt(v * v + 2 * g * Math.max(0, o.pos.y))) / g, h = U.clamp(Math.max(13, Math.max(0, d) / T + 1, 7.5 / k), 13, 30);
          o.vel.set(dir.x * h, v, dir.z * h); o.artFly = true; o.floatT = T + 0.1; o.hardKD = false;
          o.hitstun = Math.max(o.hitstun, Math.min(T, Math.max(0, d) / h) + 0.25);
        }
      }
      Arts.finish(c);
      if (this.st.passive === 'encore') { this.hype = Math.min(100, this.hype + 35); this.m.call(this, 'ENCORE!', 'buff'); }
      this.inv = 0.25; this.superPhase = 'end'; this.move = Object.assign({}, mv, { type: 'melee', su: 0, ac: 0, rc: inCombo ? 0.4 : 0.2 }); this.kind = 'super-end'; this.moveT = 0; this.acExt = 0;
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
      // the throws: ← / → / ↑ / ↓ (or Jump: up; Heavy alone: down)
      const ad = this.attackDir(), tilt = ad && Math.hypot(I.move.x, I.move.y) > 0.7 && this.grabT > 0.15;
      if (I.take('jump')) return this.startThrow('u');
      if (I.take('heavy') || tilt) return this.startThrow(ad || 'd');
      if (I.take('light')) { this.pummelT = 0.24; this.pummelHit = false; return; }
      if (this.grabT >= this.grabMax - o.held.esc) this.grabBreak();
    }
    startThrow(k, s) {
      this.throwKind = k; this.throwT = 0; this.throwYaw0 = this.yaw; if (s) this.throwYawTo = Math.atan2(s.x, s.z);
      SFX.play('whoosh');
    }
    releaseThrow() {
      // the WRESTLER (Suplex City) throws his own way; a command grab with its own move
      const o = this.grabbing, k = this.throwKind, T = THROWS[k], mv = KB.MOVES[this.cmdThrow || (this.st.sig === 'grappler' ? GRAPPLER[T.mv] : T.mv)];
      this.cmdThrow = null;
      this.grabbing = null; this.throwT = -1;
      if (k === 's') this.yaw = this.throwYawTo;
      // a short recovery in the throw's follow-through
      this.move = { id: mv.id, name: mv.name, type: 'none', pose: T.pose, su: 0, ac: 0.04, rc: 0.26, dmg: 0, kb: [0, 0] }; this.kind = 'throw'; this.moveT = 0.02; this.moveHit = false; this.hitSet = new Set(); this.setState('attack');
      if (!o || o.state !== 'held') return;
      o.held = null; if (k === 'd') o.pos.y = 0; this.m.event('throw', { f: this, vic: o, kind: k });
      Combat.hit(this, o, mv, { kind: 'throw', dir: this.forward.clone(), force: true, at: _c.copy(o.pos).setY(o.pos.y + 0.9).clone() });
      if (k === 'd') { FX.ring(_c.copy(o.pos).setY(o.pos.y + 0.06), { r1: 1.8, life: 0.3 }); FX.addShake(0.3); }
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

    /* TECH CHASE: they're flying from your KNOCK (or tumbling off a wall), you hold the stick toward them and Snap:
       half a bar of Hype, your recovery is cancelled, and your dash runs them down, stopping a step short */
    canChase() {
      const o = this.opp, s = this.stick();
      if (!o || !s || o.combo.by !== this || o.state !== 'tumble' || !this.grounded) return false;
      if (!['idle', 'run', 'attack'].includes(this.state) || (this.state === 'attack' && (!this.move || this.move.type === 'super'))) return false;
      const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      return d > 1.8 && (s.x * dx + s.z * dz) / d > 0.5;
    }
    techChase() {
      const o = this.opp; this.hype -= 50; this.move = null; this.pauseWin = null;
      this.dodgeDir = _v.subVectors(o.pos, this.pos).setY(0).normalize().clone(); this.dodgeAir = false; this.chasing = true; this.setState('dodge');
      this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z); this.inv = Math.max(this.inv, 0.12);
      SFX.play('dodge'); this.m.call(this, 'CHASE DASH!', 'snap'); this.m.event('chase', { f: this, vic: o });
      FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.1), { r1: 1.6, life: 0.3, normal: new V3(0, 1, 0), color: 0x7cf9ff }); this.flash = 0.2; this.flashCol = 0x7cf9ff;
    }
    snapCancel() {
      this.hype -= 50; this.move = null; this.setState(this.grounded ? 'idle' : 'air');
      if (!this.grounded) this.vel.y = Math.max(this.vel.y, 2);
      const o = this.opp; if (o && U.dist(this.pos, o.pos) < 5) o.slowT = 0.5;
      SFX.play('snap'); this.m.call(this, 'SNAP!', 'snap'); this.m.hitstopAll(0.06); this.m.event('snap', { f: this });
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
      this.physics(dt, 0, this.artFly ? 0 : this.combo.bounces || this.m.arena.stage.walled ? 1 : 1.7, g);   // (a walled stage, or off a wall: the old drag)   // (off a wall it carries back as far as it always did)
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
          if (this.artBounce) { this.artBounce = false; this.vel.y = 8; this.hitstun = Math.max(this.hitstun, 0.8); }   // (a raw Legend Art's: chest high as you recover, no air recovery)
          Combat.bounceDamage(this, 12); SFX.play('heavy'); FX.addShake(0.35);
          FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.05), { n: 14, color: this.m.arena.dust, speed: 4, size: 0.1 }); FX.ring(_c.copy(this.pos).setY(this.pos.y + 0.06), { r1: 1.8, life: 0.3 });
          this.m.call(this, 'GROUND BOUNCE', 'bounce'); this.m.event('gbounce', { vic: this, by: this.combo.by });
          return;
        }
        this.spin.rotation.x = 0;
        if (!this.hardKD && I.take('dodge', 0.3) && this.hp > 0) {
          this.endCombo(); this.inv = 0.35; const d = this.stick() || fwd(this.yaw).multiplyScalar(-1);
          this.dodgeDir = d.clone(); this.dodgeAir = false; this.setState('dodge'); this.m.call(this, 'QUICK RISE', 'small'); SFX.play('tech'); this.m.event('techroll', { f: this }); return;
        }
        this.setState('down'); this.vel.x *= 0.3; this.vel.z *= 0.3; SFX.play('land'); FX.addShake(0.15);
        FX.burst(_c.copy(this.pos).setY(this.pos.y + 0.05), { n: 8, color: this.m.arena.dust, speed: 2.5, size: 0.08 });
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
      if (friction) { const k = Math.exp(-friction * dt); this.vel.x *= k; }
      if (drag) { const k = Math.exp(-drag * dt); this.vel.x *= k; }
      if (!this.grounded || this.vel.y > 0) this.vel.y -= (g || GRAV) * dt;
      const py = this.pos.y;
      this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt;
      Platform.floor(this, py, noFloor);   // (and it keeps the figure on the plane)
    }
    /* put somewhere by a move (a teleport, a counter): kept on the plane, inside the blast zones, out of the stage's body */
    clampInside() { const B = this.m.arena.stage.blast, St = this.m.arena.stage; this.pos.x = U.clamp(this.pos.x, -B.x + 1.5, B.x - 1.5); this.pos.z = 0; if (Math.abs(this.pos.x) < St.W && this.pos.y < St.top && this.pos.y > St.bot - 1.7) this.pos.y = St.top; }
    collide() {
      if (this.state === 'out') return;
      const A = this.m.arena; this.wallTouch = null;
      for (const w of A.walls) {
        const p = w.sign * this.pos[w.axis], lim = w.lim - BODY;
        if (p <= lim) { if (!this.grounded && p > lim - 0.2) this.wallTouch = w; continue; }
        const speedIn = w.sign * this.vel[w.axis];
        if (w.broken) continue;   // (a broken wall is open: out that end)
        if ((this.state === 'tumble' || this.state === 'ko') && speedIn > 3.5 && !w.broken) { Combat.wallImpact(this, w, speedIn); continue; }   // (a low-% KNOCK bounces too)
        this.pos[w.axis] = w.sign * lim; if (speedIn > 0) this.vel[w.axis] = 0;
        if (!this.grounded) this.wallTouch = w;
      }
    }

    /* ------------------------------------------------------------ animation */
    shakeFig() { this.fig.root.position.x = (U.rand() - 0.5) * 0.06 * (this.inHitstun ? 1 : 0.3); }
    animate(dt) {
      this.fig.root.position.x = 0;
      if (this.visYaw == null || dt <= 0) this.visYaw = this.yaw; else this.visYaw = U.turn(this.visYaw, this.yaw, 1 - Math.exp(-22 * dt));
      this.obj.rotation.y = this.visYaw;
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
        else if (st === 'helpless') { pose = Anim.fill(Anim.STATE.fall); pose.armL = [-2.6, 0, 0.5]; pose.armR = [-2.6, 0, -0.5]; pose.head = [-0.3, 0, 0]; }
        else if (st === 'ledge') { pose = Anim.fill(Anim.STATE.fall); pose.armL = [-3.0, 0, -0.15]; pose.armR = [-3.0, 0, 0.15]; pose.legL = [0.15, 0, 0.05]; pose.legR = [-0.25, 0, -0.05]; pose.torso = [-0.1, 0, 0]; rate = 24; }
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
      if (this.swayT > 0) { this.swayT -= dt; pose = Anim.blend(R, Anim.P.weave.strike, 1, R); rate = 34; }
      if (this.kickT > 0) { this.kickT -= dt; const k = this.kickT / 0.14; pose.armL[0] -= 0.6 * k; pose.torso[0] -= 0.12 * k; rate = Math.max(rate, 50); }
      if (this.yankT > 0) { this.yankT -= dt; pose = Anim.blend(pose, Anim.P.chainYank.strike, U.clamp(this.yankT / 0.06, 0, 1), R); rate = Math.max(rate, 30); }
      if (this.build.legs.line === 'lancer') pose = Anim.mounted(pose);   // (on horseback: the horse stays level under the rider)
      Anim.drive(this.fig, pose, dt, rate);
      this.holster(dt); this.ballHands();
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
  const _PB = [], _HB = [], DRAWN = new WeakMap();
  const Combat = {
    /* OTG (off the ground): a Heavy, a dash attack, a dive, a sweep or a downward shot may hit a downed opponent,
       once a combo, and scoops them back up into the air */
    otgOk(att, vic, mv, kind) {
      if (vic.state !== 'down' || vic.combo.by !== att || (vic.combo.otg || 0) >= 2 || !vic.combo.hits || vic.inv > 0) return false;   // (twice a combo)
      if (kind === 'super' || kind === 'throw' || kind === 'minion' || (mv && mv.type === 'grab')) return false;
      return !!(mv && (mv.otg || mv.spike || mv.dive || mv.zone === 'low') || kind === 'heavy' || kind === 'airHeavy' || kind === 'dash' || kind === 'toss');
    },
    /* ---- THE SHIELD, as a platform fighter has it: a bubble round the body as big as what's left of it (it wears down
       while it's held, faster as it's hit, and fills back slowly once you let go); a blow that touches the body outside
       the bubble gets through (a shield poke); when it runs out it BREAKS: popped up off the floor, then dazed for a long
       moment (mash buttons to shake it off sooner; a hit ends it), and it comes back a little over a third full */
    SHIELD: { drain: 0.16, regen: 0.11, rMin: 0.45, rMax: 1.45, daze: 3.2, mash: 0.12, after: 0.375 },
    shieldR(f) { const S = Combat.SHIELD; return S.rMin + (S.rMax - S.rMin) * Math.sqrt(U.clamp(f.guardHp / (f.guardMax || 1), 0, 1)); },   // (it shrinks slowly at first, fast near the end)
    shieldC(f) { return _w.set(f.pos.x, f.pos.y + 0.95, 0); },
    outsideShield(f, p) { const c = Combat.shieldC(f); return Math.hypot(p.x - c.x, p.y - c.y) > Combat.shieldR(f); },
    /* a blow whose hitboxes touch the body somewhere the bubble doesn't cover: where (or null) */
    pokeAt(hb, f) {
      const H = Combat.hurtBoxes(f, _HB), c = Combat.shieldC(f), R = Combat.shieldR(f); let best = null, bd = R;
      for (const a of hb) for (const b of H) {
        const x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1), y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y1, b.y1); if (x0 >= x1 || y0 >= y1) continue;
        const px = (x0 + x1) / 2, py = (y0 + y1) / 2, d = Math.hypot(px - c.x, py - c.y);   // (the middle of where it touches the body: outside the bubble, it's through)
        if (d > bd) { bd = d; best = new V3(px, py, 0); }
      }
      return best;
    },
    shieldBreak(f, att) {
      const m = f.m; f.guardHp = f.guardMax * Combat.SHIELD.after; f.guardIdle = 0; f.move = null;
      f.setState('gbreak'); f.dizzy = true; f.gbreakT = Combat.SHIELD.daze; if (f.grounded) { f.vel.set(0, 13, 0); f.grounded = false; }
      m.call(f, 'SHIELD BREAK!', 'bad'); m.event('shieldbreak', { f, by: att });
      if (!U.quiet) { SFX.play('gbreak'); FX.addShake(0.6); const c = Combat.shieldC(f).clone(); FX.burst(c, { n: 34, color: [0x9fd0ff, 0xffffff, KB.LINES[f.build.core.line].pal.glow], glow: true, speed: 8, size: 0.12, gravity: 6, life: 0.7 }); FX.ring(c, { r1: 2.2, life: 0.35, normal: new V3(0, 0, 1), color: 0xffffff }); }
    },
    /* ---- HITBOXES AND HURTBOXES: boxes on the fighting plane ({x0, x1, y0, y1}: x across, y up), read off the figures
       as they're posed (Models: partBoxes). A figure's HURTBOXES are its body: the head, the torso, the hips, both arms,
       both legs, each where it is this frame (crouched, leaning, tumbling, lying down), a long part in pieces; what it
       holds isn't part of it (a blade can't be hit). A blow's HITBOXES are what strikes with it (strikeBoxes). Lying down,
       only the blows that hit them on the floor reach them (an OTG). The Training overlay draws these same boxes. */
    HURT: ['head', 'torso', 'hips', 'armL', 'armR', 'legL', 'legR'],
    lying(o) { return o.state === 'down' || (o.state === 'ko' && o.grounded); },
    hurtBoxes(o, out) {
      out = out || []; out.length = 0; if (o.gone || o.state === 'out') return out;
      o.fig.poseNow(); const T = o.state === 'tumble' || o.state === 'held' ? Combat.TUMBLE : 0;
      for (const p of Combat.HURT) for (const b of o.fig.partBoxes(p, _PB)) { if (T) { b.x0 -= T; b.x1 += T; b.y0 -= T; b.y1 += T; } out.push(b); }
      if (!out.length) out.push({ x0: o.pos.x - 0.4, x1: o.pos.x + 0.4, y0: o.pos.y, y1: o.pos.y + 1.8 });   // (no body left to read)
      return out;
    },
    /* where a set of hitboxes first meets their hurtboxes (the middle of the overlap: the spark goes there), or null */
    touch(hb, o) {
      const H = Combat.hurtBoxes(o, _HB);
      for (const a of hb) for (const b of H) if (a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0) return new V3((Math.max(a.x0, b.x0) + Math.min(a.x1, b.x1)) / 2, (Math.max(a.y0, b.y0) + Math.min(a.y1, b.y1)) / 2, 0);
      return null;
    },
    /* a point hit (a shot, an imp, a strike from the sky...): a square r either way from c */
    overlap(c, r, o, otg) {
      if (o.proneT > 0 && o.state === 'attack' && c.y > o.pos.y + 0.8) return false;   // (PRONE: high blows go over)
      if (Combat.lying(o) && (!otg || o.state !== 'down')) return false;
      return !!Combat.touch([{ x0: c.x - r, x1: c.x + r, y0: c.y - r, y1: c.y + r }], o);
    },
    /* WHAT STRIKES: the limb thrown hardest (it moved the most, against the body, from the start of the move to the blow:
       the blade of a cut, the fist of a punch, the foot of a kick, the head of a header), with what it holds (an arm and
       its weapon go together); a spinning move strikes with everything; a grab with both arms. Picked at each blow (a
       flurry's hits are thrown with alternate fists) */
    LIMBS: ['wR', 'wL', 'armR', 'armL', 'legR', 'legL'],
    MOVERS: ['wR', 'wL', 'armR', 'armL', 'legR', 'legL', 'head'],
    PAIR: { wR: 'armR', armR: 'wR', wL: 'armL', armL: 'wL' },
    MARGIN: 0.18,      // (a blow's boxes reach this much past the limb: the swish of it)
    TUMBLE: 0.2,       // (someone tumbling is a little bigger to hit: their limbs flail through more than any one pose)
    /* what a pose strikes with, read off its own keyframes (anim.js): the limb that turns the most from the wind-up to
       the strike (a leg lifted high counts for more: that's a kick), and a second one that moves nearly as much (both
       palms, both feet). Kept per pose; null when the pose has no keyframes to read */
    POSEPART: {},
    poseStriker(ps) {
      if (!ps) return null; if (ps in Combat.POSEPART) return Combat.POSEPART[ps];
      let P = Anim.P[ps]; if (!P && Anim.compose) { try { P = Anim.compose(ps); } catch (e) { P = null; } }
      const W = (P && P.wind) || {}, S = (P && P.strike) || {};
      const d = k => { const a = W[k] || [0, 0, 0], b = S[k] || [0, 0, 0]; return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); };
      // (an arm thrown forward counts for more than one swung back for balance; a leg only strikes when it's lifted high:
      // a lunge's bent front knee isn't a kick)
      const sc = {}; for (const k of ['armR', 'armL', 'wR', 'wL']) sc[k] = d(k) + 0.35 * Math.max(0, -((S[k] || [0])[0]) - 0.6);
      for (const k of ['legR', 'legL']) { const up = Math.abs((S[k] || [0])[0]); sc[k] = up > 0.95 ? d(k) + 0.6 * (up - 0.6) : d(k) * 0.35; }
      // an arm and the weapon in its hand are one striker (the bigger of the two turns)
      const arms = { R: Math.max(sc.armR, sc.wR), L: Math.max(sc.armL, sc.wL) }, all = [['armR', arms.R], ['armL', arms.L], ['legR', sc.legR], ['legL', sc.legL]].sort((x, y) => y[1] - x[1]);
      let out = null;
      if (all[0][1] > 0.12) { out = [all[0][0] === 'armR' && sc.wR > sc.armR ? 'wR' : all[0][0] === 'armL' && sc.wL > sc.armL ? 'wL' : all[0][0]]; const two = all[1]; if (two[1] > all[0][1] * 0.8 && (two[0].startsWith('leg') === all[0][0].startsWith('leg'))) out.push(two[0]); }
      return Combat.POSEPART[ps] = out;
    },
    /* where each part sits against the hips (taken as a move starts, and again at each blow) */
    partSpots(f) {
      f.fig.poseNow(); const out = {}, hip = f.fig.partBoxes('hips', _PB)[0], hx = hip ? (hip.x0 + hip.x1) / 2 : f.pos.x, hy = hip ? (hip.y0 + hip.y1) / 2 : f.pos.y + 0.9, F = f.forward.x >= 0 ? 1 : -1;
      for (const p of Combat.MOVERS) { const B = f.fig.partBoxes(p, _PB); if (!B.length) continue; let x = 0, y = 0; for (const b of B) { x += (b.x0 + b.x1) / 2; y += (b.y0 + b.y1) / 2; } out[p] = [F * (x / B.length - hx), y / B.length - hy]; }
      return out;
    },
    strikeStart(f) { f.hbSpots = Combat.partSpots(f); f.hitPartsFor = -1; f.hbPrev = null; },
    /* a blow's HITBOXES this frame: what strikes, as posed, a little bigger (MARGIN), each stretched over where it was the
       frame before, so a fast swing can't pass through someone between two frames */
    strikeBoxes(f, mv) {
      f.fig.poseNow();
      const F = f.forward.x >= 0 ? 1 : -1, cx = mv.around ? f.pos.x : f.pos.x + F * mv.reach, cy = f.pos.y + (mv.around ? 1 : mv.h);
      const blow = f.moveSerial * 100 + Math.max(0, f.lastSub);
      if (f.hitPartsFor !== blow) {
        if (mv.around) f.hitParts = Combat.LIMBS.slice();
        else if (mv.type === 'grab') f.hitParts = ['armR', 'armL'];
        else {
          // what kind of blow the pose is: a kick (a leg), a body blow (the torso, the head and the arms), a header, or a
          // blow with an arm (the arm thrown hardest, and what it holds)
          const ps = (f.pose2 || mv.pose || ''), body = /tackle|shoulder|splash|spear|kaoLean/i.test(ps), head = /header|headbutt/i.test(ps), pp = Combat.poseStriker(ps);
          const now = Combat.partSpots(f), was = f.hbSpots || now, pick = c => { let best = null, bd = -1; for (const p of c) { const a = now[p]; if (!a) continue; const b = was[p] || a, d = Math.hypot(a[0] - b[0], a[1] - b[1]) + Math.max(0, a[0]) * 0.15; if (d > bd) { bd = d; best = p; } } return best; };
          if (body) f.hitParts = ['torso', 'head', 'armR', 'armL'];
          else if (head) f.hitParts = ['head', 'torso'];
          else if (pp) { f.hitParts = []; for (const p of pp) { f.hitParts.push(p); if (Combat.PAIR[p] && !pp.includes(Combat.PAIR[p])) f.hitParts.push(Combat.PAIR[p]); } }
          else { const best = pick(['wR', 'wL', 'armR', 'armL']) || pick(Combat.MOVERS); f.hitParts = best ? (Combat.PAIR[best] ? [best, Combat.PAIR[best]] : [best]) : []; }
          f.hbSpots = now;   // (the next blow of a flurry is measured from this one)
        }
        f.hitPartsFor = blow; f.hbPrev = null;
      }
      const out = [], M = Combat.MARGIN, now = [];
      for (const p of f.hitParts) for (const b of f.fig.partBoxes(p, _PB)) now.push({ x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 });
      const prev = f.hbPrev && f.hbPrev.length === now.length ? f.hbPrev : null;
      now.forEach((b, i) => { const q = prev ? prev[i] : b; out.push({ x0: Math.min(b.x0, q.x0) - M, x1: Math.max(b.x1, q.x1) + M, y0: Math.min(b.y0, q.y0) - M, y1: Math.max(b.y1, q.y1) + M }); });
      f.hbPrev = now;
      if (!out.length) { const r = Math.min(mv.rad, 0.55); out.push({ x0: cx - r, x1: cx + r, y0: cy - r, y1: cy + r }); }   // (nothing left to strike with: the blow where it was meant to land)
      return out;
    },
    /* a charge's HITBOXES: the whole body and what it holds, stretched back over the way it came (dx, dy) */
    bodyBoxes(f, dx, dy) {
      f.fig.poseNow(); const out = [], M = Combat.MARGIN;
      for (const p of Combat.HURT.concat(['wR', 'wL'])) for (const b of f.fig.partBoxes(p, _PB)) out.push({ x0: Math.min(b.x0, b.x0 + dx) - M, x1: Math.max(b.x1, b.x1 + dx) + M, y0: Math.min(b.y0, b.y0 + dy) - M, y1: Math.max(b.y1, b.y1 + dy) + M });
      return out;
    },
    /* the boxes a figure just tested (for the Training overlay only: kept off the fight) */
    note(f, boxes, kind, hold) { if (!U.quiet) DRAWN.set(f, { boxes, kind, t: f.m.time, hold: hold || 0 }); },
    drawn(f) { const d = DRAWN.get(f); return d && f.m.time - d.t <= Math.max(1 / 30, d.hold) ? d : null; },
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
      const otg = !!(o.otg && (mv.groundHit || Combat.otgOk(att, vic, mv, o.kind)));
      if (!o.force && !otg && (vic.inv > 0 || ['ko', 'out', 'down', 'getup'].includes(vic.state))) { if (vic.state === 'dodge' && vic.inv > 0) m.event('evade', { f: vic, by: att }); return 'miss'; }
      if (vic.state === 'held' && !o.force && !(vic.held && vic.held.by === att)) return 'miss';
      const atPos = o.at || _c.copy(vic.pos).setY(vic.pos.y + 1).clone();
      let dir = o.dir ? o.dir.clone() : fwd(att.yaw);
      if (o.dir == null && mv.launch && att.stick && !o.proj) { const s = att.stick(); if (s) dir = dir.multiplyScalar(0.35).addScaledVector(s, 0.65).normalize(); }
      if (mv.kbBack) dir.copy(fwd(att.yaw)).multiplyScalar(-1);
      dir.y = 0; dir.z = 0; if (dir.lengthSq() < 1e-4) dir.set(vic.pos.x >= att.pos.x ? 1 : -1, 0, 0); dir.normalize();

      // ---- UNIQUE SPECIALS: BRIBED (their next hit does nothing), ON THE ROPES (nothing lands), GLOVE UP (a shot is caught)
      if (att.bribed && !o.force && o.kind !== 'super') { att.bribed = false; m.call(att, 'BRIBED', 'bad'); FX.burst(atPos, { n: 10, color: [0xffd84a, 0xfff4b0], speed: 3, size: 0.07, life: 0.5 }); return 'miss'; }
      if (vic.buffs.ropes && !o.force && mv.type !== 'grab' && o.kind !== 'super') { vic.hype = Math.min(100, vic.hype + 12); m.call(vic, 'ROPE-A-DOPE +12', 'tech'); att.hitstop = Math.max(att.hitstop, 0.08); SFX.play('guard'); return 'miss'; }
      for (const h of KB.HOOK.pre) { const r = h(att, vic, mv, o, m, dir, atPos); if (r) return r; }
      if (vic.buffs.catch && o.proj && !o.force) { vic.hype = Math.min(100, vic.hype + 20); m.call(vic, 'CAUGHT! +20', 'tech'); SFX.play('jguard'); FX.spark(atPos, { color: 0xffffff, size: 1.3 }); return 'miss'; }
      // ---- BOB & WEAVE / PARRY (Specials): the next attack that would land is slipped, or turned aside with a riposte
      if ((vic.buffs.slip || vic.buffs.parry || vic.buffs.kawarimi || vic.buffs.counter) && !o.force && !o.remote && mv.type !== 'grab' && o.kind !== 'super' && !['held', 'tumble', 'down', 'ko', 'out', 'hit'].includes(vic.state)) {
        const side = new V3(-dir.z, 0, dir.x);
        if (vic.buffs.kawarimi) {
          // KUNOICHI: the hit lands on a log in her clothes; she's behind them, and they're left standing there
          delete vic.buffs.kawarimi; const was = _c.copy(vic.pos).setY(vic.pos.y + 0.9).clone();
          FX.burst(was, { n: 16, color: [0xd8d0c0, 0xa8a090, 0x8a6a4a], speed: 2.5, size: 0.14, gravity: -1, life: 0.6 }); FX.burst(was, { n: 6, color: [0x8a5a2a, 0x6a4020], speed: 4, size: 0.12, gravity: 9, life: 0.7 });
          const af = fwd(att.yaw); vic.pos.set(att.pos.x - af.x * 1.0, Math.max(0, att.pos.y), att.pos.z - af.z * 1.0); vic.clampInside();
          vic.move = null; vic.setState(vic.grounded ? 'idle' : 'air'); vic.inv = Math.max(vic.inv, 0.35); vic.yaw = U.ang(vic.pos, att.pos); vic.hype = Math.min(100, vic.hype + 8);
          att.hitstop = Math.max(att.hitstop, 0.3); m.call(vic, 'KAWARIMI!', 'tech'); SFX.play('dodge'); m.event('evade', { f: vic, by: att });
          FX.burst(_c.copy(vic.pos).setY(vic.pos.y + 0.9), { n: 10, color: [0xd8d0c0, 0xffffff], speed: 2, size: 0.12, gravity: -1, life: 0.4 });
          return 'miss';
        }
        if (vic.buffs.counter) {
          // COMMAND SPECIALS: a counter stance takes the blow and answers it (a grab or a Legend Art gets through)
          delete vic.buffs.counter; vic.inv = Math.max(vic.inv, 0.3); att.hitstop = Math.max(att.hitstop, 0.24); vic.yaw = U.ang(vic.pos, att.pos);
          if (!o.proj && U.dist(vic.pos, att.pos) > 1.3) { const d = _v.subVectors(vic.pos, att.pos).setY(0).normalize(); vic.pos.set(att.pos.x + d.x * 1.1, vic.pos.y, att.pos.z + d.z * 1.1); vic.clampInside(); }
          vic.startMove(vic.counterRip, 'counter'); m.call(vic, vic.counterCall + '!', 'counter'); SFX.play('jguard'); FX.spark(atPos, { color: 0xffffff, size: 1.8 }); m.event('evade', { f: vic, by: att });
          return 'miss';
        }
        if (vic.buffs.slip) {
          delete vic.buffs.slip; vic.inv = Math.max(vic.inv, 0.3); vic.move = null; vic.setState('idle');
          vic.pos.addScaledVector(side, 0.9); vic.clampInside(); vic.yaw = U.ang(vic.pos, att.pos); vic.hype = Math.min(100, vic.hype + 8);
          m.call(vic, 'SLIP!', 'tech'); SFX.play('dodge'); m.event('evade', { f: vic, by: att });
        } else {
          delete vic.buffs.parry; vic.inv = Math.max(vic.inv, 0.2); att.hitstop = Math.max(att.hitstop, 0.14); vic.yaw = U.ang(vic.pos, att.pos);
          vic.startMove(vic.st.ripMove || 'feRiposte', 'light'); m.call(vic, 'PARRY!', 'counter'); SFX.play('jguard'); FX.spark(atPos, { color: 0x9ad8ff, size: 1.6 });
        }
        return 'miss';
      }
      // ---- guard
      const shielded = vic.state === 'guard' || vic.state === 'guardstun';
      let guarding = (shielded || (vic.buffs.autoGuard && ['idle', 'run'].includes(vic.state))) && !o.force;   // (CHIVALRY: guards on its own; a guard covers both sides)
      // SHIELD POKE: the bubble shrinks as the shield wears down, and a blow that touches the body outside it gets through
      if (guarding && shielded && mv.type !== 'grab') { const p = o.poke || (o.at && Combat.outsideShield(vic, o.at) ? o.at : null); if (p) { guarding = false; o.at = p; m.call(vic, 'SHIELD POKE', 'bad'); } }
      if (guarding && mv.type !== 'grab') {
        let just = vic.state === 'guard' && m.time - (vic.guardStart || -9) < 0.18;   // (JUST GUARD: shield the moment it lands)
        const overShield = att.st.sig === 'flail' && (o.kind === 'light' || o.kind === 'air');   // (CRUSADER: no Just Guard, twice the guard)
        if (overShield) just = false;
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
        vic.hp -= chip; vic.guardHp -= raw * (mv.launch ? 1.0 : 0.7) * (overShield ? 2 : 1) * (mv.crush || 1); vic.guardIdle = 0; if (mv.gbreak) vic.guardHp = 0;   // (the VIKING's axe shatters it)
        if (vic.broken.armL === false) vic.armor.armL = Math.max(1, vic.armor.armL - raw * 0.25);
        att.hype = Math.min(100, att.hype + raw * 0.04 * att.st.hypeGain);
        if (vic.guardHp <= 0) { vic.hitstop = att.hitstop = 0.1; Combat.shieldBreak(vic, att); return 'gcrush'; }
        vic.setState('guardstun'); vic.hitstun = 0.12 + raw * 0.0016; vic.vel.x = dir.x * (mv.kb[0] * 0.35 + 1.5); vic.vel.z = dir.z * (mv.kb[0] * 0.35 + 1.5);
        att.hitstop = vic.hitstop = 0.05; SFX.play('guard'); FX.spark(atPos, { color: 0x9fd0ff, size: 0.9 });
        return 'blocked';
      }

      // ---- the hit lands
      if (vic.state === 'gbreak') { vic.gbreakT = 0; vic.dizzy = false; }
      const counter = vic.state === 'attack' && vic.move && vic.moveT < vic.move.su && !o.noCombo;
      if (!vic.comboing || vic.combo.by !== att) { if (!o.noCombo) vic.combo = vic.freshCombo(); }
      const pr = o.kind === 'super' ? Math.max(0.55, Combat.prorate(vic)) : Combat.prorate(vic);
      const onBeat = att.beatOn && (o.kind === 'light' || o.kind === 'air');
      let dmg = mv.dmg * (o.charge ? 1 + o.charge * (mv.chargeL ? 0.9 : 0.6) : 1) * att.dmgMult(o.kind) * (1 - vic.st.def) * pr * (counter ? (att.st.sig === 'counter' ? 1.5 : 1.2) : 1) * (onBeat ? 1.3 : 1);
      // MODERN SPORTS passives that need the target
      { const P = att.st.passive; if (P === 'hattrick' && vic.combo.hits >= 2) dmg *= 1.12; else if (P === 'killer' && vic.hp < vic.maxHp * 0.5) dmg *= 1.15; else if (P === 'precision' && !vic.combo.hits) dmg *= 1.25;
        else if (P === 'hookspin' && mv.type === 'proj') dmg *= 1.18; else if (P === 'eagle' && Math.hypot(att.pos.x - vic.pos.x, att.pos.z - vic.pos.z) >= 5) dmg *= 1.18; }
      // EDO JAPAN, KNIGHTS OF THE REALM, and the BASKETBALL player: the ones that need the target too
      { const P = att.st.passive, G = att.st.sig, lite = o.kind === 'light' || o.kind === 'air', dist = Math.hypot(att.pos.x - vic.pos.x, att.pos.z - vic.pos.z);
        if (P === 'nothing' && att.hp < vic.hp) dmg *= 1.18;
        if (P === 'unseen' && !Combat.facing(vic, att.pos)) dmg *= 1.2;
        if (P === 'rim' && !vic.grounded) dmg *= 1.15;
        if (P === 'firstblood' && !att.firstBlood && !o.noCombo) { dmg *= 1.4; att.firstBlood = true; m.call(att, 'FIRST BLOOD', 'buff'); }
        if (P === 'penance' && att.penance > 0) { dmg *= 1 + att.penance; att.penance = 0; }
        if (G === 'battojutsu' && o.kind === 'light' && mv.id === att.st.light) dmg *= 1.3;
        if (G === 'toxin' && lite && vic.burn && vic.burn.poison) dmg *= 1.2;
        if (G === 'halfsword' && lite && dist < 1.1) dmg *= 1.2;
        if (G === 'reach' && lite && dist >= 1.6) dmg *= 1.15;
        if (vic.st.passive === 'ironrule' && lite) dmg *= 0.85;
        if (vic.buffs.vow) dmg *= 0.8;
        if (vic.st.passive === 'penance') vic.penance = Math.min(0.3, (vic.penance || 0) + 0.02);
        // LOVERS OF THE SEA
        if (vic.buffs.spotted) dmg *= G === 'broadside' && lite ? 1.265 : 1.15;
        if (P === 'quarterdeck' && att.hp > vic.hp) dmg *= 1.12;
        if (G === 'match' && lite && vic.burn && !vic.burn.poison) dmg *= 1.2;
        if (G === 'cornered' && (m.arena.walls.some(w => !w.broken && w.lim - w.sign * vic.pos[w.axis] < 1.5) || Math.abs(vic.pos.x) > m.arena.stage.W - 1.5)) dmg *= 1.15;
        if (P === 'steadyaim' && mv.type === 'proj') dmg *= 1.18;
        if (vic.st.passive === 'terror' && dist < 3) dmg *= 0.9;
        if (vic.st.passive === 'scrapper') vic.buffs.scrap = 3; }
      for (const h of KB.HOOK.dmg) dmg *= h(att, vic, mv, o, m);
      if (vic.buffs.bulwark) dmg *= 0.75;
      // UNIQUE SPECIALS: a last stand, no quarter, a sheathed blade, Davy Jones' toll
      if (mv.lastStand) dmg *= 1 + 1.6 * (1 - att.hp / att.maxHp);
      if (mv.execute && vic.hp < vic.maxHp * 0.3) { dmg *= 2; m.call(att, 'NO QUARTER', 'buff'); }
      const emp = att.buffs.empower && o.kind !== 'trap'; if (emp) { delete att.buffs.empower; dmg *= 1.6; }
      if (mv.drain) dmg = Math.max(dmg, vic.hp * mv.drain);
      if (vic.st.perk === 'resolve' && vic.hp < vic.maxHp * 0.3) dmg *= 0.85;
      dmg = Math.round(dmg);
      if (m.training && m.training.godP2 && vic.idx === 1) dmg = 0;
      vic.hp -= dmg; att.records.dmg += dmg;
      if (!o.noCombo) { vic.combo.hits++; vic.combo.dmg += dmg; vic.combo.by = att; }
      const bn = mv.burn || mv.poison;   // (BURNING, the Dragoon's; POISON, the Kunoichi's)
      if (bn && vic.hp > 0) {
        const pz = !mv.burn;
        if (!vic.burn || !!vic.burn.poison !== pz) { m.call(vic, pz ? 'POISONED' : 'BURNING', 'bad'); m.event('burn', { att, vic, poison: pz }); }
        const bt = bn[1] * (!pz && att.st.passive === 'powder' ? 2 : 1);   // (CANNONEER: Powder Keg, his burns last twice as long)
        vic.burn = { t: bt, left: Math.round(bt / 0.5), tick: 0, dps: bn[0] * att.dmgMult(o.kind), by: att, poison: pz };
      }
      // DAIMYO: Tribute levies their Hype
      const pure = vic.buffs.pure;   // (the CRUSADER's relic: nothing takes)
      if (mv.slow && vic.hp > 0 && !pure) { vic.slowT = Math.max(vic.slowT || 0, mv.slow); m.call(vic, 'SLOWED', 'bad'); }
      if (mv.weaken && vic.hp > 0 && !pure) { vic.buffs.weak = Math.max(vic.buffs.weak || 0, mv.weaken); m.call(vic, 'WEAKENED', 'bad'); }
      if (vic.hp > 0 && !pure) {
        if (mv.seal) { vic.sealT = mv.seal; m.call(vic, 'SEALED', 'bad'); FX.ring(_c.copy(vic.pos).setY(1.6), { r1: 0.7, life: 0.4, normal: new V3(0, 1, 0), color: 0xffd060 }); }
        if (mv.confuse) { vic.confT = mv.confuse; m.call(vic, 'CHARMED', 'bad'); FX.burst(_c.copy(vic.pos).setY(1.9), { n: 8, color: [0xff6ab0, 0xffb0d8], speed: 1.5, size: 0.08, gravity: -2, life: 0.6 }); }
        if (mv.root) { vic.rootT = mv.root; m.call(vic, 'PINNED', 'bad'); }
        if (mv.hobble) { vic.hobbleT = mv.hobble; m.call(vic, 'HOBBLED', 'bad'); }
        if (mv.disarm) { vic.disarmT = mv.disarm; m.call(vic, 'DISARMED', 'bad'); }
        if (mv.bribe) { vic.bribed = true; m.call(vic, 'BRIBED', 'bad'); FX.burst(_c.copy(vic.pos).setY(1.2), { n: 10, color: [0xffd84a, 0xfff4b0], speed: 2.5, size: 0.07, life: 0.5 }); }
        if (mv.brand) { vic.buffs.branded = mv.brand; vic.brandBy = att; m.call(vic, 'BRANDED', 'bad'); }
        if (mv.wallBreak) { vic.wallBreakNext = true; m.call(vic, m.arena.stage.walled ? 'MARKED: THE NEXT WALL BREAKS' : 'MARKED: THE NEXT KNOCK +35%', 'bad'); }
      }
      if (vic.buffs.branded && vic.brandBy === att && dmg > 0) { const h = Math.round(dmg * 0.4); att.hp = Math.min(att.maxHp, att.hp + h); m.call(att, '+' + h, 'heal'); }   // (the TEMPLAR's brand)
      if (att.buffs.morale && dmg > 0) { att.hp = Math.min(att.maxHp, att.hp + Math.round(att.maxHp * 0.03)); att.hype = Math.min(100, att.hype + 4); }   // (the CAPTAIN's colours)
      if (att.buffs.fuses && !o.proj && vic.hp > 0 && !vic.burn && !pure) { vic.burn = { t: 2, left: 4, tick: 0, dps: 6 * att.dmgMult('special'), by: att, poison: false }; m.call(vic, 'BURNING', 'bad'); }
      if (vic.buffs.fuses && !o.proj && att.hp > 0 && !att.burn) { att.burn = { t: 2, left: 4, tick: 0, dps: 6 * vic.dmgMult('special'), by: vic, poison: false }; m.call(att, 'BURNING', 'bad'); }   // (hitting BLACKBEARD up close burns)
      if (mv.sunder && vic.hp > 0) {   // (the MARAUDER's axe: the weakest part loses 45% of its armour, or breaks)
        let part = null, low = 2; for (const k of ['head', 'armR', 'armL', 'legs']) if (!vic.broken[k]) { const r = vic.armor[k] / vic.armorMax[k]; if (r < low) { low = r; part = k; } }
        if (part) { vic.armor[part] -= vic.armorMax[part] * 0.45; if (vic.armor[part] <= 0) Combat.breakPart(vic, part, dir); else m.call(vic, 'SUNDERED', 'bad'); }
      }
      for (const h of KB.HOOK.after) h(att, vic, mv, o, m, dmg, dir);
      if (mv.steal && vic.hp > 0) { const st = Math.min(Math.round(vic.hype), mv.steal); if (st > 0) { vic.hype -= st; att.hype = Math.min(100, att.hype + st); m.call(att, 'TRIBUTE +' + st, 'buff'); } }
      // PART TOSS: the combo is extended -- its clock starts over, with a fresh OTG and ground bounce (twice a combo)
      if (o.ext && !o.noCombo && vic.combo.ext < 2) { const n = ++vic.combo.ext; vic.combo.t = 0; vic.combo.dh = vic.combo.hits; vic.combo.otg = 0; vic.combo.gb = false; vic.floatT = 0.35;   /* (they hang a moment: time to follow the throw) */ m.call(att, 'EXTEND ' + n + '/2', 'buff'); m.event('extend', { att, vic, n }); }
      if (!o.remote) att.moveHit = true;
      if (att.st.sig === 'brawler' && o.kind === 'heavy' && !o.remote) att.giveArmor(1, true);
      if (att.st.passive === 'gains' && o.kind === 'heavy' && (att.gainsK || 0) < 0.2) { att.gainsK = Math.min(0.2, (att.gainsK || 0) + 0.04); m.call(att, 'GAINS +' + Math.round(att.gainsK * 100) + '%', 'buff'); }
      att.hype = Math.min(100, att.hype + dmg * 0.11 * att.st.hypeGain * (att.st.passive === 'admiral' ? 1.15 : 1) * (att.buffs.momentum ? 1.5 : 1) * (mv.hype == null ? 1 : mv.hype) * (onBeat ? 1.5 : 1) * (att.st.sig === 'style' && !att.grounded ? 1.5 : 1));
      if (onBeat && !att.beatShown) { att.beatShown = true; m.call(att, '♪ ON THE BEAT', 'buff'); }
      // PALADIN: the warhammer heals her
      if (mv.heal && dmg > 0 && att.hp > 0) { const h = Math.max(1, Math.round(dmg * mv.heal * att.st.healMult)); att.hp = Math.min(att.maxHp, att.hp + h); if (h >= 8) m.call(att, '+' + h, 'heal'); FX.burst(_c.copy(att.pos).setY(1.2), { n: 4, color: [0xfff07a, 0x9dff9a], glow: true, speed: 1.2, gravity: -3, size: 0.06, life: 0.5 }); }
      vic.hype = Math.min(100, vic.hype + dmg * 0.05 * (vic.buffs.vow ? 2 : 1));
      vic.burst = Math.min(100, vic.burst + dmg * 0.055 * vic.st.burstRate);
      // part armour
      const part = mv.zone ? Combat.zonePart(att, vic, mv.zone) : null;
      if (part && !vic.broken[part]) {
        vic.armor[part] -= dmg * (mv.launch ? 0.55 : 0.35) * (att.st.passive === 'reaver' ? 1.3 : 1);
        if (vic.armor[part] <= 0) {
          Combat.breakPart(vic, part, dir); m.event('partbreak', { att, vic, part });
          if (att.st.sig === 'plunder') { const h = Math.round(att.maxHp * 0.08); att.hp = Math.min(att.maxHp, att.hp + h); att.hype = Math.min(100, att.hype + 15); m.call(att, 'PLUNDER +' + h, 'heal'); }   // (MARAUDER)
        }
      }

      // ---- the reaction
      const armored = vic.armorT > 0 && vic.armorHits > 0 && o.kind !== 'super' && o.kind !== 'throw' && mv.type !== 'grab' && vic.state !== 'held';
      const hs = o.multiHit ? 0.018 : 0.045 + Math.min(0.12, dmg * 0.0009) + (counter ? 0.05 : 0);
      if (!o.remote) att.hitstop = hs; vic.hitstop = o.remote ? Math.min(hs, 0.05) : hs;
      if (mv.holy) { FX.ring(atPos.clone(), { r1: 1.6, life: 0.3, normal: m.camDir(), color: 0xfff07a }); FX.burst(atPos, { n: 10, color: [0xfff07a, 0xffffff], glow: true, speed: 4, size: 0.07, gravity: -2, life: 0.5 }); }
      if (mv.blast) { FX.burst(atPos, { n: 22, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 6, size: 0.11, life: 0.5 }); FX.spark(atPos, { color: 0xffb040, size: 2 }); FX.ring(atPos.clone(), { r1: 1.6, life: 0.3, normal: m.camDir(), color: 0xffa040 }); SFX.play('boom'); FX.addShake(0.4); }
      if (mv.hexfx) { const hc = KB.LINES.summoner.pal.glow; FX.ring(atPos.clone(), { r1: 1.5, life: 0.35, normal: m.camDir(), color: hc }); FX.burst(atPos, { n: 12, color: [hc, 0xffffff], glow: true, speed: 4, size: 0.07, life: 0.4, gravity: 0 }); }
      if (mv.quake) { FX.addShake(0.5); FX.ring(_c.copy(vic.pos).setY(vic.pos.y + 0.06), { r1: 2.4, life: 0.4 }); FX.burst(_c.copy(vic.pos).setY(vic.pos.y + 0.1), { n: 14, color: m.arena.dust, speed: 4, size: 0.1 }); }
      if (mv.hybrid && !o.multiHit) m.call(att, mv.name.toUpperCase() + '!', 'buff');
      if (mv.notes) { FX.burst(atPos, { n: 6, color: [0xff8ad8, 0xfff27a, 0x7cf9ff], glow: true, speed: 3, size: 0.09, gravity: -2.5, life: 0.6 }); m.noteFX(atPos.clone(), 2); }
      vic.flash = 0.7; vic.flashCol = counter ? 0xff5050 : 0xffffff;
      const power = U.clamp(mv.kb[0] / 10 + dmg / 80, 0.5, 2.5);
      SFX.play('hit', { power }); if (mv.launch && mv.kb[0] > 12) SFX.play('heavy');
      FX.spark(atPos, { size: 0.8 + power * 0.4, color: counter ? 0xff8080 : 0xffffff });
      FX.burst(atPos, { n: 4 + Math.round(power * 4), color: [0xffffff, 0xffe080, KB.LINES[vic.build.core.line].pal.main], speed: 4 + power * 2, size: 0.07, life: 0.4, glow: true, gravity: 6 });
      FX.addShake(0.08 + power * 0.12);
      if (counter) m.call(vic, 'COUNTER', 'counter');
      vic.lastBy = att;   // (who to credit if they go out)
      if (o.pummel) { if (vic.combo.hits >= 2) m.comboShow(att, vic); return 'hit'; }   // a pummel: they're still held
      if (armored) {
        vic.flashCol = 0xffa040;
        if (vic.armorHits < 99 && --vic.armorHits <= 0) { vic.armorT = 0; vic.armorCd = 1.2; m.call(vic, 'ARMOR BROKEN', 'small'); }   // the Viking's: one hit, then gone for a moment
        else m.call(vic, 'ARMOR', 'small');
        return 'armor';
      }

      if (vic.grabbing) vic.dropGrab();
      vic.move = null; vic.pauseWin = null; vic.crumpled = vic.dizzy = vic.asleep = false; vic.held = vic.state === 'held' && vic.held && vic.held.kind === 'super' && o.kind !== 'super' ? vic.held : null;
      let kbk = vic.st.kbTaken * (vic.buffs.pumped ? 0.75 : 1) * (o.charge ? 1 + o.charge * 0.75 : 1) * (1 + vic.combo.hits * 0.008);
      for (const h of KB.HOOK.kb) kbk *= h(att, vic, mv, o);
      const decay = Combat.decay(vic);
      // RANGED HITS (a shot, a thrown part, an imp) on an open stage: each one within 2.5 s of the last counts for less
      // (x0.7 each time), and on someone off the stage they only nudge (a third of the push, never a spike, a short stun,
      // and a jump back), so nobody can be shot off the screen. Any hit gives back the ↑ Special (a recovery that was
      // interrupted isn't the end)
      const ranged = !!(o.proj || o.kind === 'minion' || o.kind === 'toss') && !m.arena.stage.walled && o.kind !== 'trap';
      let rk = 1, offR = false;
      if (ranged) {
        if (m.time - (vic.rangedT || -9) > 2.5) vic.rangedN = 0;
        rk = Math.pow(0.7, vic.rangedN || 0); vic.rangedN = (vic.rangedN || 0) + 1; vic.rangedT = m.time;
        offR = !vic.grounded && Platform.offStage(vic);
        if (offR) vic.airJumps = Math.max(vic.airJumps, 1);
      }
      vic.upUsed = false;
      if (otg) {
        // OFF THE GROUND: scooped back up off the floor, twice a combo, and the combo carries on; the second pop is a
        // little lower and shorter, so it buys a hit or two, not a whole new combo
        const n = vic.combo.otg = (vic.combo.otg || 0) + 1, again = n > 1;
        vic.hardKD = false; vic.kdT = 0; vic.spiked = false; vic.chained = null;
        vic.vel.set(dir.x * (again ? 2 : 2.5), again ? 6.2 : 8, dir.z * (again ? 2 : 2.5)); vic.pos.y = Math.max(vic.pos.y, 0.05); vic.grounded = false;
        vic.setState('tumble'); vic.hitstun = (again ? 0.42 : 0.55) * Math.max(0.6, decay); vic.yaw = Math.atan2(-dir.x, -dir.z); vic.spin.position.y = 0.95; if (!again) vic.floatT = 0.3;
        m.call(vic, again ? 'OTG 2!' : 'OTG!', 'bounce'); m.event('otg', { att, vic, n }); FX.ring(_c.copy(vic.pos).setY(vic.pos.y + 0.06), { r1: 1.5, life: 0.3 }); FX.burst(_c.copy(vic.pos).setY(vic.pos.y + 0.1), { n: 12, color: m.arena.dust, speed: 3.5, size: 0.09 });
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
        // DAMAGE %: a launch goes further the higher it is (platform.js); a MARK (a Siege Ram, a Gale Cannon) adds a third
        const pc = vic.pct, mark = vic.wallBreakNext && mv.launch && !m.arena.stage.walled ? 1.35 : 1; if (mark > 1) vic.wallBreakNext = false;
        const wl = m.arena.stage.walled;
        let h = mv.kb[0] * kbk * (mv.launch ? Platform.scaleH(pc, wl) : (wl ? 1 : 0.55) + pc / 300) * mark * (att.st.sig === 'warlord' && mv.launch && !m.arena.stage.walled ? 1.1 : 1), v = mv.kb[1];
        if (!mv.launch) { h *= 0.6; v = Math.max(v, 4.5); }
        if (mv.spike) { v = mv.kb[1] * ((wl ? 1 : 0.8) + pc / 250); vic.spiked = true; } else { vic.spiked = false; v *= mv.launch ? Platform.scaleV(pc, wl) * mark : (wl ? 1 : 0.92) + pc / 400; }
        if (ranged) { h *= rk; if (v > 0) v *= rk; }
        if (offR) { h = Math.sign(h) * Math.min(Math.abs(h) * 0.35, 5); v = v < 2 ? 2 : Math.min(v * 0.5, 7); vic.spiked = false; }
        vic.vel.set(dir.x * h, v * (v > 0 ? Math.min(1.15, kbk) : 1), 0);
        Platform.influence(vic, vic.vel);
        vic.setState('tumble'); vic.grounded = v <= 0 && vic.grounded; if (v > 0) vic.pos.y += 0.02, vic.grounded = false;
        if (mv.trip) vic.hardKD = true;   // (tripped: they go down hard)
        vic.hitstun = Math.min(1.6, (0.26 + 0.026 * Math.hypot(h, v)) * decay) * (ranged ? Math.max(0.5, rk) : 1);
        if (offR) vic.hitstun = Math.min(vic.hitstun, 0.3);
        vic.hardKD = !!((mv.spike && !offR) || o.kind === 'super' || o.kind === 'throw'); vic.kdT = 0;
        vic.yaw = Math.atan2(-dir.x, -dir.z);
      } else {
        vic.setState('hit'); vic.hitstun = (mv.stun || 0.3) * (counter ? 1.3 : 1) * Math.max(0.6, decay) * (ranged ? Math.max(0.5, rk) : 1);
        // (a blow in the middle of a string pushes them back about half as far: the next one is meant to reach them; the
        // string's last blow, and everything else, the full push)
        const midString = (o.kind === 'light' || o.kind === 'air') && mv.nx && mv.nx.l ? 0.5 : 1;
        vic.vel.x = dir.x * mv.kb[0] * kbk * rk * midString; vic.vel.z = dir.z * mv.kb[0] * kbk * rk * midString; vic.yaw = Math.atan2(-dir.x, -dir.z);
        // CRUMPLE (they fold up, then fall down) and DIZZY (they stand there rubbing their eyes)
        const crumple = mv.crumple || (emp ? 1.0 : 0) || (mv.chargeL && (o.charge || 0) >= 0.45 ? 0.9 : 0);
        let bout = 0; if (mv.touche) { vic.touche++; vic.toucheT = 10; m.call(vic, 'TOUCH\u00c9 ' + vic.touche, 'counter'); if (vic.touche >= 3) { vic.touche = 0; bout = 2.0; m.call(att, 'BOUT!', 'buff'); } }   // (the FENCER: three touchés win the bout)
        if (crumple) { vic.hitstun = crumple * Math.max(0.7, decay); vic.crumpled = true; vic.vel.x *= 0.3; vic.vel.z *= 0.3; m.call(vic, 'CRUMPLE', 'counter'); }
        if (mv.dizzy || bout) { vic.hitstun = (mv.dizzy || bout) * Math.max(0.6, decay); vic.dizzy = true; vic.vel.set(0, 0, 0); m.call(vic, 'DIZZY', 'counter'); }
        if (mv.sleep) { vic.hitstun = mv.sleep * Math.max(0.6, decay); vic.dizzy = true; vic.asleep = true; vic.vel.set(0, 0, 0); m.call(vic, 'ASLEEP  z z z', 'counter'); }
      }
      if (mv.freeze && vic.hp > 0 && !vic.buffs.pure) { vic.freezeT = mv.freeze; vic.hitstun = Math.max(vic.hitstun, mv.freeze + 0.15); m.call(vic, 'FROZEN', 'counter'); FX.burst(_c.copy(vic.pos).setY(1), { n: 12, color: [0xd8f0ff, 0xffffff], speed: 2, size: 0.08, life: 0.5 }); }   // (the SAMURAI's Kiai)
      if (vic.combo.hits >= 2) m.comboShow(att, vic);
      // SUMMONER signature: her imps pounce on whatever she hits
      if (att.st.sig === 'pack' && !o.remote && !o.noCombo && o.kind !== 'super') m.minionsPounce(att, vic, false);
      return 'hit';
    },
    /* a small hit inside a Legend Art */
    seqTick(att, vic, dmg, pos) {
      const d = Math.round(dmg * att.dmgMult('super') * (1 - vic.st.def) * Math.max(0.55, Combat.prorate(vic)));
      vic.hp -= d; vic.combo.hits++; vic.combo.dmg += d; vic.combo.by = att; att.records.dmg += d; vic.lastBy = att;
      vic.flash = 0.6; vic.flashCol = 0xffffff; vic.hitstop = 0.03;
      const p = pos || _c.copy(vic.pos).setY(vic.pos.y + 1 + U.rnd(-0.3, 0.3)).clone();
      FX.spark(p, { size: 1.1 }); FX.burst(p, { n: 5, color: [0xffffff, 0xffe080], glow: true, speed: 5, size: 0.07, life: 0.35 });
      SFX.play('hit', { power: 1.2 }); FX.addShake(0.12); att.m.comboShow(att, vic);
    },
    /* a STAGE HAZARD hits (arenas.js). It's nobody's combo, so it never breaks into one: it skips anyone being comboed,
       in a Legend Art, invincible (a dodge, a respawn) or already down, and hits the same figure once a second at most.
       o: { dmg, kb: [h, v] (a launch) or push (a stagger), dir {x, z}, call, flash, colors, sfx, stun, cd } */
    hazard(vic, o) {
      const m = vic.m;
      if (m.phase !== 'fight' || m.cine || m.frozen || (vic.hazT || 0) > 0 || vic.inv > 0 || vic.comboing) return false;
      if (['ko', 'out', 'down', 'getup', 'held', 'grab', 'intro', 'victory', 'burst'].includes(vic.state) || vic.superPhase && vic.state === 'attack') return false;
      vic.hazT = o.cd || 1.1;
      const d = new V3(o.dir ? o.dir.x : 0, 0, o.dir ? o.dir.z : 0); if (d.lengthSq() < 1e-6) fwd(vic.yaw, d).multiplyScalar(-1); d.normalize();
      const dmg = Math.round((o.dmg || 0) * (1 - vic.st.def));
      vic.hp -= dmg;
      if (vic.grabbing) vic.dropGrab();
      vic.move = null; vic.pauseWin = null; vic.held = null; vic.crumpled = vic.dizzy = vic.asleep = false; vic.spiked = false; vic.chained = null; vic.combo = vic.freshCombo();
      vic.flash = 0.8; vic.flashCol = o.flash || 0xffa040; vic.hitstop = 0.07;
      const at = _c.copy(vic.pos).setY(vic.pos.y + 1).clone();
      SFX.play(o.sfx || 'heavy'); FX.spark(at, { size: 1.5, color: o.flash || 0xffc080 }); FX.addShake(0.3);
      FX.burst(at, { n: 14, color: o.colors || [0xffffff, 0xffd080], speed: 6, size: 0.09, life: 0.5 });
      if (o.call) m.call(vic, o.call + (dmg ? '  -' + dmg : ''), 'bad');
      m.event('hazard', { vic, dmg });
      if (vic.hp <= 0) { vic.hp = 0; m.ko(vic, m.opp(vic), d, null); return true; }
      if (o.kb) {
        vic.vel.set(d.x * o.kb[0] * vic.st.kbTaken, o.kb[1], d.z * o.kb[0] * vic.st.kbTaken); vic.grounded = false; vic.pos.y = Math.max(vic.pos.y, 0.02);
        vic.setState('tumble'); vic.hitstun = 0.3 + 0.02 * Math.hypot(o.kb[0], o.kb[1]); vic.hardKD = false; vic.kdT = 0; vic.yaw = Math.atan2(-d.x, -d.z);
      } else {
        vic.setState('hit'); vic.hitstun = o.stun || 0.35; vic.vel.x = d.x * (o.push || 8); vic.vel.z = d.z * (o.push || 8); vic.yaw = Math.atan2(-d.x, -d.z);
      }
      return true;
    },
    bounceDamage(vic, base) {
      const d = Math.round(base * Math.max(0.4, Combat.prorate(vic)));
      vic.hp -= d; vic.combo.dmg += d; if (vic.combo.by) vic.combo.by.records.dmg += d;
      return d;
    },

    /* ---------------------------------------------------- THE WALL BOUNCE */
    wallImpact(vic, w, speedIn) {
      const m = vic.m, A = m.arena, n = w.n, c = vic.combo;
      const contact = _c.copy(vic.pos); contact[w.axis] = w.sign * w.lim; contact.y = vic.pos.y + 0.9;
      vic.pos[w.axis] = w.sign * (w.lim - BODY); vic.artFly = false;
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
      const add = speedIn * 2.3 * (c.by && c.by.st.sig === 'warlord' ? 1.4 : 1);   // (SHOGUN: Warlord)
      const breaks = (w.stress + add >= 100 || c.bounces >= 3 || vic.wallBreakNext) && vic.state !== 'ko'; vic.wallBreakNext = false;   // (the SHOGUN's Siege Ram)
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
    },
    wallBreak(vic, w, speedIn, contact) {
      const m = vic.m, A = m.arena, n = w.n, c = vic.combo, att = c.by || vic.opp;
      A.breakWall(w, contact);
      const dmg = Combat.bounceDamage(vic, (vic.maxHp * 0.06 + 70) * 1.0 / Math.max(0.4, Combat.prorate(vic)) * Math.max(0.6, Combat.prorate(vic)));
      c.bounces++;
      // out through the hole, harder the higher their % (it's close to the blast zone at that end)
      const out = Math.max(9, speedIn * 0.8) * (0.55 + vic.pct / 110);
      vic.vel.set(-n.x * out, 6 + vic.pct * 0.02, 0);
      vic.pos[w.axis] = w.sign * (w.lim + 0.2);
      vic.setState('tumble'); vic.hitstun = 0.95; vic.spiked = false; vic.lastBy = att;
      if (att) { att.buffs.momentum = 8; att.records.breaks++; att.hype = Math.min(100, att.hype + 25); m.call(att, 'MOMENTUM', 'buff'); }
      SFX.play('wallbreak'); FX.addShake(1.1); m.slowmo(0.22, 0.75); m.hitstopAll(0.12);
      FX.ring(contact.clone(), { r1: 4, life: 0.5, normal: new V3(n.x, 0, n.z), color: 0xffd070 });
      m.call(vic, 'WALL BREAK!!', 'break', contact.clone());
      if (att) m.comboShow(att, vic);
      m.event('wallbreak', { vic, w });
    },

    /* a limb's armour hits zero: it pops off the figure */
    breakPart(vic, part, dir) {
      const m = vic.m; vic.broken[part] = true; vic.armor[part] = 0;
      SFX.play('partbreak'); m.call(vic, { head: 'HEAD OFF!', armR: 'R-ARM BROKEN!', armL: 'L-ARM BROKEN!', legs: 'LEGS CRACKED!' }[part], 'part');
      if (part === 'legs') { vic.setLegMat(true); FX.burst(_c.copy(vic.pos).setY(vic.pos.y + 0.5), { n: 12, color: [0x6a6a72, 0x9a9aa2], speed: 3, size: 0.07 }); return; }
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
