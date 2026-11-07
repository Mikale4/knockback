/* ============================================================================
   ai.js -- the CPU. It drives a fighter through the same Input player a human
   uses (held buttons + a stick), so it plays by exactly the same rules.
   Levels 0..3 (Rookie, Fighter, Veteran, Champion) change how fast it reacts,
   how well it guards, techs walls, bursts, and how it plays its combos: a Rookie
   mashes and fumbles links, a Champion picks a route (into the wall, into the
   air, a pause branch) when a combo starts and plays it out, then takes every
   free hit after it (the rebound off the wall, a crumple, a dizzy, a sleeper).
   ========================================================================== */
(function () {
  'use strict';
  const L = {
    react: [0.42, 0.28, 0.17, 0.1], aggro: [0.35, 0.55, 0.7, 0.82], guard: [0.12, 0.32, 0.55, 0.72],
    tech: [0.08, 0.35, 0.62, 0.88], burst: [0.25, 0.55, 0.8, 0.95], skill: [0.35, 0.62, 0.85, 0.97], wallAim: [0.2, 0.5, 0.8, 0.95],
    fumble: [0.3, 0.14, 0.03, 0],      // the chance any one link of a combo is missed
    route: [0, 0.35, 0.85, 0.97],      // the chance a combo is played to a plan rather than mashed
    punish: [0.15, 0.45, 0.85, 1],     // the chance a free hit gets taken (rebound, crumple, dizzy, asleep, a whiffed swing)
    ender: [0.15, 0.4, 0.8, 0.95],     // the chance a full combo is cashed in with a Legend Art
  };
  const BTNS = ['light', 'heavy', 'jump', 'dodge', 'special', 'super', 'snap'];
  class AI {
    constructor(m, f, level) {
      this.m = m; this.f = f; this.lv = U.clamp(level == null ? 1 : level, 0, 3);
      this.held = {}; this.move = { x: 0, y: 0 }; this.pulse = new Set(); this.wait = 0; this.guardT = 0; this.plan = null; this.planT = 0;
      this.strafe = Math.random() < 0.5 ? 1 : -1; this.flipT = 0; this.burstAt = U.rndi(3, 7); this.techRoll = null; this.dummy = null; this.play = null;
      this.moveSer = -1; this.next = null; this.cmb = null; this.wantPause = null; this.oppSer = -1; this.punished = null;
    }
    /* a press is a fresh edge: a button already down this frame is let go first, so mashing taps instead of holding */
    press(a) { if (a === 'heavy' && !this.f.broken.armL && !this.f.canUse(this.f.st.heavy)) return; if (!this.held[a]) this.pulse.add(a); }
    /* aim the stick; unless raw, it steers along walls instead of into them, and away from a broken one */
    stickTo(dx, dz, k, raw) {
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      if (!raw) { const s = this.steer(dx, dz); dx = s[0]; dz = s[1]; }
      this.move.x = dx * (k || 1); this.move.y = -dz * (k || 1);
    }
    steer(dx, dz) {
      const f = this.f, A = this.m.arena;
      for (const w of A.walls) {
        const gap = w.lim - w.sign * f.pos[w.axis], zone = w.broken ? 2.4 : 1.0;
        if (gap > zone) continue;
        const into = w.sign * (w.axis === 'x' ? dx : dz);
        if (w.broken && gap < 1.5) { if (w.axis === 'x') dx -= w.sign * 0.8; else dz -= w.sign * 0.8; }   // step back from the drop
        if (into > 0) { const s = U.clamp((zone - gap) / (zone * 0.5), 0, 1); if (w.axis === 'x') dx -= w.sign * into * s; else dz -= w.sign * into * s; }
      }
      const l = Math.hypot(dx, dz);
      if (l < 0.3) {
        // boxed in (a corner, or the way is straight through a wall): turn the circle round and head for the middle
        if (this.flipT <= 0) { this.strafe *= -1; this.flipT = 0.6; }
        const c = Math.hypot(f.pos.x, f.pos.z) || 1; return [-f.pos.x / c, -f.pos.z / c];
      }
      return [dx / l, dz / l];
    }
    stop() { this.move.x = 0; this.move.y = 0; }
    /* the direction to aim a launch: toward the wall behind the opponent */
    wallAim(f, o) {
      const A = this.m.arena, dx = o.pos.x - f.pos.x, dz = o.pos.z - f.pos.z, l = Math.hypot(dx, dz) || 1;
      let best = null, bd = 1e9;
      for (const w of A.walls) {
        const into = -(w.n.x * dx + w.n.z * dz) / l; if (into < 0.35) continue;
        const dist = w.lim - w.sign * o.pos[w.axis]; const score = dist / into;
        if (score < bd) { bd = score; best = w; }
      }
      return best && bd < 7 ? { x: -best.n.x, z: -best.n.z, dist: bd, w: best } : null;
    }
    /* how far away a Legend Art can still catch them */
    /* COMMAND SPECIALS: which of the three suits the distance (null: none of them) */
    pickCmd(C, d, o) {
      const fits = k => {
        const mv = KB.MOVES[C[k]]; if (!mv || !this.f.canSpecial(C[k])) return false;
        if (mv.type === 'act') return mv.act === 'parrot' || mv.act === 'shove' ? d > 3 : mv.act === 'impBomb' ? d > 3 && d < 8 : mv.act === 'gate' ? d > 4 : mv.encore ? !!this.f.lastSp : d > 3.5;
        if (k === 'dp') return d < 2 && Math.random() < 0.3;
        if (mv.type === 'proj') return mv.proj === 'breath' ? d < 3.2 : d > 3 && d < (mv.range || 8) + 0.5;
        if (mv.type === 'dash') return d > 2 && d < (mv.dist || 5) + 1;
        if (mv.type === 'leap' || mv.type === 'teleport') return d > 3 && d < (mv.range || 8);
        if (mv.type === 'trap') return d > 2.5 && d < 7;
        if (mv.type === 'grab') return d < 1.6;
        if (mv.type === 'radial') return d < (mv.rad || 2) + 0.3;
        if (mv.type === 'buff') return mv.buff.id === 'counter' ? d < 2.4 && o.state === 'attack' : d > 4;
        return d < (mv.reach || 1.2) + 0.8;
      };
      const ks = ['qcf', 'qcb', 'dp'].filter(fits); return ks.length ? ks[Math.floor(Math.random() * ks.length)] : null;
    }
    superReach(mv) { return { dash: (mv.dist || 6) * 1.25, melee: (mv.close || 2) + 1.6, proj: (mv.range || 8) - 0.5, leap: 12, jump: 14, mark: 9, wave: mv.rad - 0.3, radial: mv.rad + 0.2 }[mv.catchType] || 3.5; }
    /* how close the first Light of the string reaches (a lance reaches further than a tantō) */
    range() { const mv = KB.MOVES[this.f.lightRoot()] || {}; return U.clamp((mv.reach || 1.2) + 0.3, 1.45, 2.1); }
    /* the string from its first Light: how long, and whether it has a pause branch */
    stringInfo() { let id = this.f.lightRoot(), n = 0, pause = false; while (id && n < 8) { const mv = KB.MOVES[id]; n++; if (mv.nx && mv.nx.p) pause = true; id = mv.nx && mv.nx.l; } return { n, pause }; }

    think(dt) {
      // a press lasts one frame: release last frame's pulses
      for (const a of Input.ACTIONS) this.held[a] = false;
      for (const a of this.pulse) this.held[a] = true; this.pulse.clear();
      const f = this.f, o = f.opp, m = this.m; if (!o) return;
      if (m.cine) { this.stop(); this.guardT = 0; return; }
      if (this.play) return this.playThink(dt);   // TRAINING: the dummy plays your recording (lab.js)
      if (this.guardT > 0) { this.guardT -= dt; this.held.guard = true; }
      if (this.dummy && this.dummy !== 'cpu') return this.dummyThink(dt);
      if (m.phase !== 'fight') { this.stop(); return; }
      this.wait -= dt; this.flipT -= dt; this.planT -= dt;
      const d = U.dist(f.pos, o.pos);
      if (this.underFire(dt)) return;
      if (m.haz && this.hazardThink()) return;
      this.trapThink();
      if (f.state === 'grab') return this.grabThink(dt);
      if (f.state === 'attack') return this.ownMove(dt, d);
      if (f.state === 'air') return this.inAir(dt, d);
      this.neutral(dt, d);
    }

    /* ---- a STAGE HAZARD coming (arenas.js): jump it or step out of its way -- the better the CPU, the more often it does */
    hazardThink() {
      const f = this.f, m = this.m, H = Arena.HAZ[m.arena.haz];
      if (!H || !H.danger || !['idle', 'run', 'air', 'guard'].includes(f.state)) return false;
      const d = H.danger(m, m.haz, f); if (!d) { this.hazRoll = null; return false; }
      if (this.hazRoll == null) this.hazRoll = Math.random() < [0.3, 0.55, 0.8, 0.92][this.lv];
      if (!this.hazRoll) return false;
      if (d === 'jump') { if (f.grounded) this.press('jump'); return false; }   // (and carries on fighting in the air)
      this.guardT = 0; this.held.guard = false; this.stickTo(d.x, d.z, 1); return true;
    }
    /* ---- a BOWLER's ball lying in our path: hop over it rather than trip (the better the CPU, the more often) */
    trapThink() {
      const f = this.f, o = f.opp, b = o && o.balls && o.balls.bowling;
      if (!b || b.ph === 'fly' || !f.grounded || (f.state !== 'idle' && f.state !== 'run')) { this.trapRoll = null; return; }
      const dx = b.pos.x - f.pos.x, dz = b.pos.z - f.pos.z, d = Math.hypot(dx, dz), v = Math.hypot(f.vel.x, f.vel.z);
      if (d > 1.5 || v < 1.5 || (f.vel.x * dx + f.vel.z * dz) / (d * v + 1e-6) < 0.6) { this.trapRoll = null; return; }
      if (this.trapRoll == null) this.trapRoll = Math.random() < [0.3, 0.55, 0.8, 0.92][this.lv];
      if (this.trapRoll) this.press('jump');
    }
    /* ---- being comboed: burst, tech the wall, get out */
    underFire(dt) {
      const f = this.f, m = this.m, lv = this.lv, r = Math.random;
      if ((f.state === 'guard' || f.state === 'guardstun') && f.riposteT > m.time && r() < L.skill[lv]) { this.guardT = 0; this.press('light'); return true; }
      if (f.state === 'tumble' || f.state === 'hit' || f.state === 'held') {
        this.stop();
        if (f.state === 'held' && f.held && f.held.kind === 'grab' && r() < 0.05 + lv * 0.045) this.press(['light', 'heavy', 'jump'][U.rndi(0, 2)]);   // mash out
        if (f.burst >= 100 && f.combo.hits >= this.burstAt && r() < L.burst[lv] * dt * 6 && !f.heldBySuper) { this.press('snap'); this.burstAt = U.rndi(3, 8); return true; }
        if (f.state === 'tumble') {
          // a wall tech, timed as the wall comes up
          for (const w of m.arena.walls) {
            if (w.broken) continue;
            const v = w.sign * f.vel[w.axis], gap = w.lim - w.sign * f.pos[w.axis] - 0.42;
            if (v > 6 && gap / v < 0.2 && f.combo.bounces >= 1) {
              if (this.techRoll == null) this.techRoll = r() < L.tech[lv];
              if (this.techRoll) this.press('dodge');
            }
          }
          if (f.hitstun <= 0 && r() < 0.3 + lv * 0.15) this.press('jump');
          if (f.pos.y < 0.6 && f.vel.y < 0 && r() < 0.15 + lv * 0.2) this.press('dodge');
        }
        return true;
      }
      this.techRoll = null;
      if (f.state === 'down' || f.state === 'getup' || f.state === 'gbreak' || f.state === 'out' || f.state === 'ko') { this.stop(); return true; }
      return false;
    }

    /* ---- the combo this CPU is running on them: one plan per combo */
    combo() {
      const o = this.f.opp;
      if (!this.cmb || this.cmb.obj !== o.combo || this.cmb.ext !== o.combo.ext) this.cmb = Object.assign({ obj: o.combo, ext: o.combo.ext, n: 0 }, this.chooseRoute());
      return this.cmb;
    }
    chooseRoute() {
      const f = this.f, o = f.opp, lv = this.lv, r = Math.random;
      if (r() > L.route[lv]) return { route: 'mash' };
      const aim = this.wallAim(f, o), F = f.forward, S = this.stringInfo();
      const facing = aim && aim.x * F.x + aim.z * F.z > 0.5;
      if (aim && facing && aim.dist < 5.5 && !f.broken.armL && r() < 0.8) return { route: 'knock', at: U.rndi(2, Math.max(2, S.n - 1)) };
      if (S.pause && r() < 0.3) return { route: 'pause' };
      if (r() < 0.5 && !f.broken.armL) return { route: 'launch', at: U.rndi(1, 2) };
      return { route: 'string' };
    }
    /* what to press next, decided once the move connects */
    nextLink(mv, d) {
      const f = this.f, o = f.opp, lv = this.lv, r = Math.random, nx = mv.nx || {}, k = f.kind;
      const aim = this.wallAim(f, o), sup = KB.MOVES[f.st.super];
      const canSuper = f.hype >= 100 && f.grounded && d < this.superReach(sup);
      const ender = () => {
        if (canSuper && r() < L.ender[lv]) return { btn: 'super' };
        // throw a part (never the sword arm) to extend it, twice a combo
        if (lv >= 2 && f.canToss() && (f.hasImp() || f.tossable() !== 'armR') && o.combo.ext < 2 && r() < 0.5) return { btn: 'toss' };
        if (aim && f.hype >= 50 && lv >= 2 && r() < 0.35) return { btn: 'snap' };   // cancel the finisher's recovery and chase the rebound
        return {};
      };
      if (k === 'light') {
        const C = this.combo(); C.n++;
        const last = !nx.l, loops = o.combo.bounces >= 2;   // two trips to the wall: finish it off
        if (C.route === 'knock' && !loops && (C.n >= C.at || last)) {
          const F = f.forward, dir = aim && aim.x * F.x + aim.z * F.z > 0.5 ? aim : { x: F.x, z: F.z };
          return { btn: 'heavy', stick: 'aim', x: dir.x, z: dir.z };
        }
        if (C.route === 'launch' && (C.n >= C.at || last) && o.pos.y < 1.2) return { btn: 'heavy', stick: 'none' };
        if (C.route === 'pause' && nx.p && !C.paused) { C.paused = true; this.wantPause = { id: nx.p }; return {}; }
        if (!last) {
          if (C.route === 'mash') {
            if (!aim && r() < 0.15) return { btn: 'heavy', stick: 'none' };
            if (KB.MOVES[nx.l].chargeL && r() < 0.35) { this.windUpFor = nx.l; this.windUp = U.rnd(0.15, 0.5); }
          }
          return aim && r() < L.wallAim[lv] ? { btn: 'light', stick: 'aim', x: aim.x, z: aim.z } : { btn: 'light', stick: 'none' };
        }
        return ender();
      }
      if (k === 'gun') return { btn: 'light' };
      if (k === 'launch') return { btn: 'jump', stick: 'none' };
      if (k === 'air') {
        if (nx.l && !(f.st.sig === 'airdash' && lv < 2 && r() < 0.4)) return { btn: 'light' };
        if (f.st.sig === 'airdash' && (f.airDashes || 0) < 2 && d > 1.4) return { btn: 'dodge' };
        if (f.st.sig === 'pogo' && f.pogos < 2) { this.pogoNext = true; return { btn: 'jump' }; }
        if (nx.l) return { btn: 'light' };
        return { btn: 'heavy' };
      }
      if (k === 'heavy' || k === 'dash' || k === 'special' || k === 'airHeavy' || k === 'throw') {
        if (canSuper && k !== 'special' && r() < L.ender[lv] * 0.6) return { btn: 'super' };
      }
      return {};
    }
    /* ---- in our own move: keep the combo going */
    ownMove(dt, d) {
      const f = this.f, o = f.opp, mv = f.move, lv = this.lv, r = Math.random;
      if (!mv) return;
      if (this.moveSer !== f.moveSerial) {
        // a new move: whatever was still buffered for the last one is stale now
        this.moveSer = f.moveSerial; this.next = null; this.fumbled = r() < L.fumble[lv]; this.wantPause = null; this.wantChase = r() < 0.45;
        if (f.kind === 'toss') this.guardT = 0;
        for (const a of BTNS) { this.held[a] = false; f.input.at[a] = null; }
      }
      // held buttons: a wound-up Light (the Viking's axe), a charged KNOCK
      if (mv.chargeL && f.kind === 'light' && this.windUpFor === mv.id && this.windUp > 0) { this.windUp -= dt; this.held.light = true; }
      if (f.kind === 'heavy' && mv.auto && this.autoMash && !f.autoArm && f.moveT > 0.03 && f.moveT < mv.su) this.press('heavy');   // (an auto combo: Heavy again)
      if (f.kind === 'heavy' && mv.charge && this.chargeHold > 0) { const aim = this.wallAim(f, o); if (aim) this.stickTo(aim.x, aim.z, 1, true); this.chargeHold -= dt; this.held.heavy = true; }
      if (mv.rapid && f.moveT > mv.su) this.press('light');
      if (!f.moveHit || this.fumbled) return;
      // TECH CHASE: once a KNOCK has them flying, the stick toward them and Snap (half a bar of Hype)
      if (f.kind === 'heavy' && this.wantChase && lv >= 2 && f.hype >= 50 && o.state === 'tumble' && o.combo.by === f && d > 2.6) { this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z, 1, true); this.press('snap'); return; }
      if (!this.next) this.next = this.nextLink(mv, d);
      const n = this.next;
      if (n.stick === 'aim') this.stickTo(n.x, n.z, 1, true); else if (n.stick === 'none') this.stop();
      if (n.guard) { this.held.guard = true; this.guardT = Math.max(this.guardT, 0.1); }   // Guard + Special: the Part Toss
      if (n.btn) this.press(n.btn);   // tapped every other frame until the move takes it
    }

    /* ---- in the air */
    inAir(dt, d) {
      const f = this.f, o = f.opp, r = Math.random;
      const toward = (k) => this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z, k);
      if (this.pogoNext && !f.airStr && d < 2.4) { this.pogoNext = false; toward(0.6); this.press('light'); return; }
      if (o.state === 'tumble' && d < 2 && Math.abs(o.pos.y - f.pos.y) < 1.4 && !f.airStr) { toward(0.6); this.press('light'); return; }
      if (o.state === 'tumble' && f.airJumps > 0 && o.pos.y > f.pos.y + 1 && r() < 0.05 + this.lv * 0.05) { this.press('jump'); return; }
      // DOWN DASH: nothing to do up here and they're on the ground: get back down fast
      if (this.lv >= 1 && f.airDodges > 0 && o.grounded && o.state !== 'tumble' && f.pos.y > 1.3 && f.vel.y < 2 && r() < 0.015 + this.lv * 0.015) { toward(1); this.press('guard'); this.press('dodge'); return; }
      toward(0.5);
    }

    /* ---- on the ground, not in a move */
    neutral(dt, d) {
      const f = this.f, o = f.opp, m = this.m, lv = this.lv, r = Math.random, R = this.range();
      const toward = (k) => this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z, k);
      // the Summoner throws an imp she's carrying from range now and then
      if (lv >= 1 && f.hasImp() && d > 2.5 && d < 7 && o.state !== 'down' && r() < dt * (0.4 + lv * 0.3)) { this.stop(); this.press('toss'); return; }
      // a pause combo, timed: the string move ended, the window is open
      if (this.wantPause) {
        if (f.pauseWin && f.pauseWin.id === this.wantPause.id) { this.stop(); if (m.time >= f.pauseWin.from + 0.02) { this.press('light'); this.wantPause = null; } return; }
        this.wantPause = null;
      }
      // the Samurai's riposte after a Just Guard
      if (f.riposteT > m.time && r() < L.skill[lv]) { this.press('light'); return; }
      // ---- free hits: they bounced off the wall, crumpled, got dizzy or fell asleep in our combo
      if (o.combo.by === f && (o.state === 'tumble' || o.state === 'hit' || o.state === 'down')) {
        if (this.punished !== o.combo) { this.punished = o.combo; this.punishOk = r() < L.punish[lv]; }
        if (this.punishOk && this.chase(dt, d, R)) return;
      }
      if (this.wait > 0) return;

      // ---- defence: they're swinging at us
      const threat = o.state === 'attack' && o.move && d < (o.move.reach || 1.2) + (o.move.lunge || 0) * 0.3 + 1.6 && o.moveT < o.move.su + 0.05;
      if (threat && r() < L.guard[lv] * 0.5) {
        if (o.move.type === 'grab' || r() < 0.25) { this.press('dodge'); this.stickTo(f.pos.x - o.pos.x + this.strafe * 2, f.pos.z - o.pos.z); }
        else { this.guardT = 0.25 + r() * 0.3; this.held.guard = true; }
        this.wait = L.react[lv]; return;
      }
      if (this.guardT > 0) { this.stop(); return; }
      // ---- they whiffed: punish the recovery
      if (o.state === 'attack' && o.move && o.move.type !== 'super' && !o.moveHit && o.moveT > o.move.su + o.move.ac && d < R + 1.2 && this.oppSer !== o.moveSerial) {
        this.oppSer = o.moveSerial;
        if (r() < L.punish[lv] * 0.8) { this.whiffT = 0.5; }
      }
      if (this.whiffT > 0) {
        this.whiffT -= dt;
        if (!(o.state === 'attack' || o.state === 'idle' || o.state === 'run')) this.whiffT = 0;
        else if (d > R) { toward(); return; } else { this.stop(); this.whiffT = 0; this.press('light'); this.wait = L.react[lv] * 0.5; return; }
      }

      // ---- go get the lance (DRAGOON): it's on the floor and he fights with his fists until he has it
      if (f.spearOut && f.spear && f.spear.at && !(d < 2 && r() < 0.5)) { this.stickTo(f.spear.at.x - f.pos.x, f.spear.at.z - f.pos.z, 1, true); return; }
      // ---- go get our ball (MODERN SPORTS): it's on the floor, and the throws wait on it
      for (const k in f.balls) { const b = f.balls[k]; if (b && b.ph !== 'fly' && Math.abs(b.pos.x) < m.arena.W && Math.abs(b.pos.z) < m.arena.D && !(d < 2.2 && r() < 0.6)) { this.stickTo(b.pos.x - f.pos.x, b.pos.z - f.pos.z, 1, true); return; } }
      // ---- go get a part that fell off (it always rests inside the walls, so walk straight to it)
      const pick = m.picks.find(p => p.rest && f.broken[p.part]);
      if (pick && d > 2.6) { this.stickTo(pick.grp.position.x - f.pos.x, pick.grp.position.z - f.pos.z, 1, true); return; }

      // ---- chase a bouncing opponent (not our combo: a stray hit, a projectile)
      if (o.state === 'tumble') { this.chase(dt, d, R); return; }
      if (o.state === 'down' || o.state === 'getup' || o.state === 'out') { // set up, don't swing into invulnerability
        const keep = 2.2; if (d < keep) this.stickTo(f.pos.x - o.pos.x, f.pos.z - o.pos.z, 0.5); else this.stop(); return;
      }

      // ---- neutral
      // a vanished SHINOBI: no idea where he is, so stand and guard
      if (o.buffs.invis && d > 1.4) { this.stop(); if (r() < 0.04) { this.held.guard = true; this.guardT = 0.4; } return; }
      if (f.hype >= 100 && d < Math.min(6, this.superReach(KB.MOVES[f.st.super])) && r() < 0.015 * (lv + 1)) { this.press('super'); return; }
      if (lv >= 1 && f.canSpear() && d > 3.5 && d < 9 && o.state !== 'down' && r() < 0.004 * (lv + 1)) { this.press('guard'); this.press('heavy'); return; }   // (the DRAGOON's lance, thrown)
      const sp = KB.MOVES[f.st.special];
      if (f.canSpecial() && r() < 0.006 * (lv + 1)) {
        const imps = m.minions.filter(mn => mn.owner === f).length;
        const ok = sp.type === 'proj' ? d > (sp.proj === 'breath' ? 0 : 3) && d < (sp.proj === 'breath' ? 3.2 : 8) : sp.type === 'teleport' ? d > 3 : sp.type === 'dash' ? d > 2 && d < 5.5 : sp.type === 'radial' ? d < 2.5 : sp.type === 'buff' ? d > 4 : sp.type === 'summon' ? imps < f.st.minions - 1 && d > 2.2 : false;
        if (ok) { this.press('special'); this.wait = 0.4; return; }
      }
      // COMMAND SPECIALS: the ↑ one when they jump in close; now and then one picked for the distance
      const CM = f.st.cmd;
      if (CM && lv >= 1 && f.canSpecial(CM.dp || CM.qcf)) {   // (their own checks: a ball on the floor only stops a ball Special)
        if (CM.dp && o.pos.y > 1.1 && d < 2.6 && o.vel.y < 2 && r() < 0.04 * lv) { this.cmd = 'dp'; this.press('special'); this.wait = 0.5; return; }
        if (r() < 0.005 * (lv + 1)) { const k = this.pickCmd(CM, d, o); if (k) { this.cmd = k; this.press('special'); this.wait = 0.5; return; } }
      }
      const heavy = KB.MOVES[f.st.heavy];
      if (heavy.type === 'proj' && !(heavy.ball && f.ballOut(heavy.ball)) && !(heavy.round && !f.gunReady()) && d > 2.5 && d < heavy.range + 1 && r() < 0.012 * (lv + 1)) { this.press('heavy'); this.wait = 0.5; return; }
      if (d > 3.2) {
        this.stickTo(o.pos.x - f.pos.x + this.strafe * 0.6, o.pos.z - f.pos.z);
        if (d < 4.6 && r() < 0.02 * (lv + 1)) { this.press('dodge'); this.dashing = 0.35; }
        return;
      }
      if (this.dashing > 0) { this.dashing -= dt; if (d < 2.6) { this.press('light'); this.dashing = 0; this.wait = L.react[lv]; } return; }
      if (d > R) {
        // step in, or circle for a moment: a choice that lasts a little while, not a coin flipped every frame
        if (!this.plan || this.planT <= 0) { this.plan = r() < 0.1 + L.aggro[lv] * 0.9 ? 'in' : 'circle'; this.planT = U.rnd(0.25, 0.7); }
        if (this.plan === 'in') toward();
        else { this.stickTo(-(o.pos.z - f.pos.z) * this.strafe, (o.pos.x - f.pos.x) * this.strafe, 0.6); if (r() < 0.01) this.strafe *= -1; }
        return;
      }
      // in range
      this.stop(); this.plan = null;
      if (r() < L.aggro[lv] * dt * 8) {
        if (o.state === 'guard' && r() < 0.5 + lv * 0.12) { this.guardT = 0.12; this.held.guard = true; this.press('light'); }
        else if (r() < 0.22) { const aim = this.wallAim(f, o); if (aim) this.stickTo(aim.x, aim.z, 1, true); this.press('heavy'); this.chargeHold = aim && r() < 0.5 ? U.rnd(0.1, 0.5) : 0; this.autoMash = !aim && !!KB.MOVES[f.st.heavy].auto && r() < 0.7; if (this.autoMash) this.chargeHold = 0; }
        else {
          if (f.st.sig === 'beat' && !Music.beat(m).near && r() < 0.25 * lv) return;
          const root = KB.MOVES[f.lightRoot()];
          if (root && root.chargeL && r() < 0.3) { this.windUpFor = f.lightRoot(); this.windUp = U.rnd(0.2, 0.5); }   // an armoured wind-up as the opener
          this.press('light');
        }
        this.wait = L.react[lv] * 0.6;
      } else if (r() < 0.02) { this.guardT = 0.3; }
    }
    /* get to a tumbling or stunned opponent and hit them again; false when there's nothing to do */
    chase(dt, d, R) {
      const f = this.f, o = f.opp, A = this.m.arena, lv = this.lv, r = Math.random;
      if (o.state === 'down') return this.otg(dt, d, R);
      if (o.state === 'hit') {
        // crumpled, dizzy or asleep, or plain hitstun with time left on it: walk in and start a string
        const left = o.hitstun - o.stateT, free = o.crumpled || o.dizzy;
        if (!free && left < 0.25) return false;
        if (d > R - 0.15) { this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z); return true; }
        this.stop();
        if (this.wait > 0) return true;
        const aim = this.wallAim(f, o);
        if (free && aim && lv >= 2 && r() < 0.4 && !f.broken.armL) { this.stickTo(aim.x, aim.z, 1, true); this.press('heavy'); this.chargeHold = U.rnd(0.3, 0.55); }
        else this.press('light');
        this.wait = 0.15; return true;
      }
      // tumbling: get to where they'll be (inside the walls), then catch them low enough to hit
      const lim = (w) => w - 1.1;
      const tx = U.clamp(o.pos.x + o.vel.x * 0.25, -lim(A.W), lim(A.W)), tz = U.clamp(o.pos.z + o.vel.z * 0.25, -lim(A.D), lim(A.D));
      this.stickTo(tx - f.pos.x, tz - f.pos.z);
      if (this.wait > 0) return true;
      if (d < R + 0.25 && o.pos.y < 1.8) {
        const aim = this.wallAim(f, o);
        const knock = o.pos.y > 0.7 && (lv < 2 ? r() < 0.4 : aim && o.combo.bounces < 2 && r() < 0.35);
        if (knock && aim) this.stickTo(aim.x, aim.z, 1, true);
        this.press(knock ? 'heavy' : 'light'); this.wait = L.react[lv] * 0.5;
      } else if (d < 2.5 && o.pos.y > 1.4 && r() < 0.05 * lv) this.press('jump');
      return true;
    }
    /* holding them: a few pummels, then a throw -- into a wall if there's one close, else up into a juggle, or the slam */
    grabThink(dt) {
      const f = this.f, o = f.opp, lv = this.lv, r = Math.random, A = this.m.arena;
      this.stop();
      if (!this.gp || this.gp.held !== o.held) {
        let wall = null, wd = 1e9;
        for (const w of A.walls) { const dist = w.lim - w.sign * f.pos[w.axis]; if (dist < wd) { wd = dist; wall = w; } }
        const kind = wall && wd < 5.5 && r() < 0.75 ? 'wall' : lv >= 2 && r() < 0.6 ? 'up' : 'slam';
        this.gp = { held: o.held, pummels: U.rndi(lv >= 2 ? 1 : 0, 1 + lv), t: 0, kind, x: wall ? -wall.n.x : 0, z: wall ? -wall.n.z : 0 };
      }
      const P = this.gp; P.t += dt;
      if (f.throwT >= 0) return;
      if (f.pummelT > 0 && !this.pumOn) { this.pumOn = true; P.pummels--; } else if (f.pummelT <= 0) this.pumOn = false;
      if (P.pummels > 0 || f.pummelT > 0) { if (f.pummelT <= 0 && P.t > 0.08) this.press('light'); return; }
      if (P.kind === 'wall') { this.stickTo(P.x, P.z, 1, true); this.press('heavy'); }
      else if (P.kind === 'up') this.press('jump');
      else this.press('heavy');
    }
    /* OTG: they're down in our combo -- pick them back up off the floor (twice a combo) */
    otg(dt, d, R) {
      const f = this.f, o = f.opp, lv = this.lv;
      if (lv < 1 || (o.combo.otg || 0) >= 2 || !o.combo.hits) return false;
      if ((o.hardKD ? 0.85 : 0.6) - o.stateT < 0.12) return false;
      const toward = (k, raw) => this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z, k, raw);
      const H = KB.MOVES[f.st.heavy], armL = !f.broken.armL;
      if (f.state === 'dodge') { this.press('light'); return true; }                         // the dash attack scoops them
      if (armL && H.proj === 'shot' && d > 1.2 && d < H.range) { toward(1, true); this.press('heavy'); this.wait = 0.35; return true; }   // shoot them where they lie
      if (this.wait > 0) return true;
      if (armL && H.type === 'melee') { if (d > R + 0.1) { toward(); return true; } this.stop(); this.press('heavy'); this.wait = 0.3; return true; }
      if (d > 1.1 && d < 3.4 && f.dodgeCd <= 0) { toward(1, true); this.press('dodge'); return true; }   // no swinging Heavy: dash in and dash-attack
      toward(); return true;
    }
    /* TRAINING's playback: the recorded buttons, frame by frame on the fight's clock; the stick turned from the line the
       dummy had to you when it was recorded onto the line it has now. A press too short for this frame still lands */
    playThink(dt) {
      const P = this.play, f = this.f, o = f.opp, s = P.s;
      for (const a of Input.ACTIONS) this.held[a] = false; this.stop();
      if (P.wait) { if (!['idle', 'run', 'guard', 'air'].includes(f.state) || this.m.phase !== 'fight') return; P.wait = false; P.i = 0; P.el = 0; }
      const now = P.el * 1000 + 0.5; let i = P.i, rise = 0;
      while (i + 1 < s.length && s[i + 1][0] <= now) { i++; rise |= s[i][1] & ~s[i - 1][1]; }
      P.i = i; const [, b0, a, b] = s[i], bits = b0 | rise;
      Input.ACTIONS.forEach((k, j) => { this.held[k] = !!(bits & (1 << j)); });
      let fx = o.pos.x - f.pos.x, fz = o.pos.z - f.pos.z, l = Math.hypot(fx, fz); if (l < 0.3) { fx = Math.sin(f.yaw); fz = Math.cos(f.yaw); l = 1; } fx /= l; fz /= l;
      this.move.x = (a * fx - b * fz) / 100; this.move.y = -(a * fz + b * fx) / 100;
      P.el += dt;
      if (now > s[s.length - 1][0] + 17) { if (P.loop) P.wait = true; else this.play = null; }
    }
    dummyThink(dt) {
      const f = this.f; this.stop();
      if (this.dummy === 'tut') {
        const c = this.cue, o = f.opp; if (!c || !o) return;
        if (U.dist(f.pos, o.pos) > 1.5 && f.state !== 'attack') { this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z, 0.8); return; }
        if (this.m.time >= c.next && c.n > 0) { this.press(c.btn); c.n--; c.next = this.m.time + c.gap; }
        if (c.n <= 0 && f.state !== 'attack') this.cue = null;
        return;
      }
      if (this.dummy === 'guard' && !f.inHitstun) this.held.guard = true;
      if (this.dummy === 'jump' && f.grounded && Math.random() < dt * 1.2) this.press('jump');
      if (this.dummy === 'tech') {
        if (f.state === 'tumble') for (const w of this.m.arena.walls) { const v = w.sign * f.vel[w.axis], gap = w.lim - w.sign * f.pos[w.axis] - 0.42; if (v > 6 && gap / v < 0.2) this.press('dodge'); }
        if (f.burst >= 100 && f.combo.hits >= 5) this.press('snap');
      }
    }
  }
  AI.LEVELS = ['ROOKIE', 'FIGHTER', 'VETERAN', 'CHAMPION'];
  window.AI = AI;
})();
