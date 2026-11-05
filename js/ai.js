/* ============================================================================
   ai.js -- the CPU. It drives a fighter through the same Input player a human
   uses (held buttons + a stick), so it plays by exactly the same rules.
   Levels 0..3 (Rookie, Fighter, Veteran, Champion) change how fast it reacts,
   how well it guards, techs walls, bursts and finishes combos into walls.
   ========================================================================== */
(function () {
  'use strict';
  const L = {
    react: [0.42, 0.28, 0.17, 0.1], aggro: [0.35, 0.55, 0.7, 0.82], guard: [0.12, 0.32, 0.55, 0.72],
    tech: [0.08, 0.35, 0.62, 0.88], burst: [0.25, 0.55, 0.8, 0.95], skill: [0.35, 0.62, 0.85, 0.97], wallAim: [0.2, 0.5, 0.8, 0.95],
  };
  class AI {
    constructor(m, f, level) {
      this.m = m; this.f = f; this.lv = U.clamp(level == null ? 1 : level, 0, 3);
      this.held = {}; this.move = { x: 0, y: 0 }; this.pulse = new Set(); this.wait = 0; this.guardT = 0; this.plan = null; this.planT = 0;
      this.strafe = Math.random() < 0.5 ? 1 : -1; this.burstAt = U.rndi(3, 7); this.techRoll = null; this.dummy = null;
    }
    press(a) { this.pulse.add(a); }
    stickTo(dx, dz, k) { const l = Math.hypot(dx, dz) || 1; this.move.x = dx / l * (k || 1); this.move.y = -dz / l * (k || 1); }
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
    think(dt) {
      // a press lasts one frame: release last frame's pulses
      for (const a of Input.ACTIONS) this.held[a] = false;
      for (const a of this.pulse) this.held[a] = true; this.pulse.clear();
      const f = this.f, o = f.opp, m = this.m; if (!o) return;
      if (this.guardT > 0) { this.guardT -= dt; this.held.guard = true; }
      if (this.dummy && this.dummy !== 'cpu') return this.dummyThink(dt);
      if (m.phase !== 'fight') { this.stop(); return; }
      const lv = this.lv, d = U.dist(f.pos, o.pos), r = Math.random;
      this.wait -= dt;

      // ---- being comboed
      if (f.state === 'tumble' || f.state === 'hit' || f.state === 'held') {
        this.stop();
        if (f.burst >= 100 && f.combo.hits >= this.burstAt && r() < L.burst[lv] * dt * 6 && !f.heldBySuper) { this.press('snap'); this.burstAt = U.rndi(3, 8); return; }
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
        return;
      }
      this.techRoll = null;
      if (f.state === 'down' || f.state === 'getup' || f.state === 'gbreak' || f.state === 'out' || f.state === 'ko') { this.stop(); return; }

      // ---- in our own move: keep the combo going
      if (f.state === 'attack') {
        const mv = f.move; if (!mv) return;
        const hitNow = f.moveHit, skill = L.skill[lv];
        if (f.kind === 'light' && hitNow) {
          const last = f.chain >= f.lightString().length - 1;
          const aim = this.wallAim(f, o);
          if (!last && r() < skill) {
            // before the finisher: wall close behind them? finish into it. Otherwise launch.
            if (f.chain >= f.lightString().length - 2 || aim) this.press('light');
            else if (r() < 0.3) this.press('heavy'); else this.press('light');
          }
          if (aim && r() < L.wallAim[lv]) this.stickTo(aim.x, aim.z); else this.stop();
          if (last && aim && f.hype >= 50 && r() < 0.1 * lv) this.press('snap');
          return;
        }
        if (f.kind === 'launch' && hitNow && r() < skill) { this.press('jump'); return; }
        if (f.kind === 'air' && hitNow && r() < skill) { if (f.airAtks < 3) this.press('light'); else this.press('heavy'); return; }
        if ((f.kind === 'heavy') && mv.charge && f.input.held.heavy !== undefined) { const aim = this.wallAim(f, o); if (aim) this.stickTo(aim.x, aim.z); if (this.chargeHold > 0) { this.chargeHold -= dt; this.held.heavy = true; } }
        if (hitNow && f.hype >= 100 && r() < 0.25 * lv) this.press('super');
        return;
      }
      if (f.state === 'air') {
        if (o.state === 'tumble' && d < 2 && Math.abs(o.pos.y - f.pos.y) < 1.4) { this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z, 0.6); this.press('light'); return; }
        this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z, 0.5); return;
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

      // ---- go get a part that fell off
      const pick = m.picks.find(p => p.owner === f && p.rest);
      if (pick && d > 2.6) { this.stickTo(pick.grp.position.x - f.pos.x, pick.grp.position.z - f.pos.z); return; }

      // ---- chase a bouncing opponent
      if (o.state === 'tumble') {
        this.stickTo(o.pos.x + o.vel.x * 0.25 - f.pos.x, o.pos.z + o.vel.z * 0.25 - f.pos.z);
        if (d < 1.7 && o.pos.y < 1.8) { this.press(o.pos.y > 0.7 && r() < 0.4 ? 'heavy' : 'light'); this.wait = L.react[lv] * 0.5; }
        else if (d < 2.5 && o.pos.y > 1.4 && r() < 0.05 * lv) this.press('jump');
        return;
      }
      if (o.state === 'down' || o.state === 'getup' || o.state === 'out') { // set up, don't swing into invulnerability
        const keep = 2.2; if (d < keep) this.stickTo(f.pos.x - o.pos.x, f.pos.z - o.pos.z, 0.5); else this.stop(); return;
      }

      // ---- neutral
      if (f.hype >= 100 && d < 3.5 && r() < 0.015 * (lv + 1)) { this.press('super'); return; }
      const sp = KB.MOVES[f.st.special];
      if (f.uses > 0 && !f.broken.head && r() < 0.006 * (lv + 1)) {
        const ok = sp.type === 'proj' ? d > 3 && d < 8 : sp.type === 'teleport' ? d > 3 : sp.type === 'dash' ? d > 2 && d < 5.5 : sp.type === 'radial' ? d < 2.5 : sp.type === 'buff' ? d > 4 : false;
        if (ok) { this.press('special'); this.wait = 0.4; return; }
      }
      const heavy = KB.MOVES[f.st.heavy];
      if (heavy.type === 'proj' && d > 2.5 && d < heavy.range + 1 && r() < 0.012 * (lv + 1)) { this.press('heavy'); this.wait = 0.5; return; }
      if (d > 3.2) {
        this.stickTo(o.pos.x - f.pos.x + this.strafe * 0.6, o.pos.z - f.pos.z);
        if (d < 4.6 && r() < 0.02 * (lv + 1)) { this.press('dodge'); this.dashing = 0.35; }
        return;
      }
      if (this.dashing > 0) { this.dashing -= dt; if (d < 2.6) { this.press('light'); this.dashing = 0; this.wait = L.react[lv]; } return; }
      if (d > 1.45) {
        if (r() < L.aggro[lv] * dt * 3) this.stickTo(o.pos.x - f.pos.x, o.pos.z - f.pos.z);
        else { this.stickTo(-(o.pos.z - f.pos.z) * this.strafe, (o.pos.x - f.pos.x) * this.strafe, 0.6); if (r() < 0.01) this.strafe *= -1; }
        return;
      }
      // in range
      this.stop();
      if (r() < L.aggro[lv] * dt * 8) {
        if (o.state === 'guard' && r() < 0.5 + lv * 0.12) { this.guardT = 0.12; this.held.guard = true; this.press('light'); }
        else if (r() < 0.22) { const aim = this.wallAim(f, o); if (aim) this.stickTo(aim.x, aim.z); this.press('heavy'); this.chargeHold = aim && r() < 0.5 ? U.rnd(0.1, 0.5) : 0; }
        else this.press('light');
        this.wait = L.react[lv] * 0.6;
      } else if (r() < 0.02) { this.guardT = 0.3; }
    }
    dummyThink(dt) {
      const f = this.f; this.stop();
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
