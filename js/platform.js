/* ============================================================================
   platform.js -- KNOCK//BACK as a platform fighter: the rules of the stage.

   The figures fight on one plane, seen from the side: x is left and right, y is up. A stage (arena.js) is a floating
   MAIN PLATFORM (its top at y 0, from x -W to W, solid all the way down its sides and under it) with a LEDGE at each
   end, a few PASS-THROUGH PLATFORMS above it (land on them from above, jump up through them, hold ↓ to drop through),
   and nothing underneath. Past the BLAST ZONES (off either side, the top or the bottom) a figure is KNOCKED OUT: a
   stock lost.

   Hits don't take health: they raise a DAMAGE %, and the higher it is the further a launching hit sends you (a figure's
   weight, kbTaken, still counts). Hold the stick as you're launched to bend the launch a little (INFLUENCE). The old
   health numbers are kept as a view of the %, so everything that heals, drains or reads "low health" still works:
   Fighter.hp is maxHp - % / PCT (never below 1), and setting it moves the % by the change.
   ========================================================================== */
(function () {
  'use strict';
  const PCT = 0.15;                 // % per point of damage (a Light ~3%, a KNOCK ~10%, a Legend Art 30-40%)
  const HALF = Math.PI / 2, BODY = 0.42;
  const TEETER = ['hit', 'guardstun', 'gbreak', 'down', 'getup', 'grab', 'burst', 'guard'];
  const P = {
    PCT, HALF,
    /* the launch grows with the %. On an open stage, horizontal from 0.3x at 0% (a shove) to 1.3x at 100%, vertical from
       0.65x to 1.65x: the ring-outs. On a WALLED stage it's the old KNOCK//BACK: nearly full from the start (the walls
       bounce them back for the combo), a little more with the %, and the way out is up */
    scaleH: (pct, walled) => walled ? 1 + pct / 250 : 0.3 + pct / 100,
    scaleV: (pct, walled) => walled ? 1 + Math.max(0, pct - 60) / 90 : 0.65 + pct / 100,   // (walled: steady through a combo, up past 60%: off the top at ~120%)
    /* INFLUENCE: the stick bends a launch up to ~14° toward it (only a real launch, only the side the stick is on) */
    influence(f, vel) {
      const s = f.input && f.input.move; if (!s) return;
      const l = Math.hypot(s.x, s.y), sp = Math.hypot(vel.x, vel.y); if (l < 0.4 || sp < 7) return;
      const a = Math.atan2(vel.y, vel.x), b = Math.atan2(s.y, s.x * (f.confT > 0 ? -1 : 1));
      const turn = 0.24 * Math.sin(b - a) * Math.min(1, l), c = Math.cos(turn), sn = Math.sin(turn);
      const x = vel.x * c - vel.y * sn, y = vel.x * sn + vel.y * c; vel.x = x; vel.y = y;
    },
    /* the ground under a figure after it moved (py: its height before): the main platform, or a pass-through one it
       came down onto (not while it's dropping through, f.dropT) */
    floor(f, py, noFloor) {
      const St = f.m.arena.stage, was = f.grounded;
      if (was && TEETER.includes(f.state)) { const lo = f.plat ? f.plat.x1 + 0.05 : -St.W + 0.05, hi = f.plat ? f.plat.x2 - 0.05 : St.W - 0.05; if (f.pos.x < lo) { f.pos.x = lo; f.vel.x = Math.max(0, f.vel.x); } else if (f.pos.x > hi) { f.pos.x = hi; f.vel.x = Math.min(0, f.vel.x); } }
      const x = f.pos.x;
      let land = null;
      if (!noFloor && f.vel.y <= 0) {
        if (x >= -St.W && x <= St.W && py >= St.top - 0.06 && f.pos.y <= St.top) land = { y: St.top, p: null };
        else if (!(f.dropT > 0)) for (const p of St.plats) if (x >= p.x1 && x <= p.x2 && py >= p.y - 0.06 && f.pos.y <= p.y) { land = { y: p.y, p }; break; }
      }
      if (land) {
        if (!was && f.vel.y < -1) f.landSpeed = f.vel.y;
        f.pos.y = land.y; f.vel.y = 0; f.grounded = true; f.plat = land.p;
      } else { f.grounded = false; f.plat = null; }
      // the main platform is solid: in from its side, you're stopped at the side (tumbling, you bounce off it); from
      // under it, you're stopped under it
      const top = St.top, bot = St.bot;
      if (f.pos.y < top - 0.03 && f.pos.y + 1.7 > bot && Math.abs(x) < St.W + BODY) {
        if (py + 1.7 <= bot + 0.08 && f.vel.y > 0) { f.pos.y = bot - 1.7; f.vel.y = Math.min(0, -f.vel.y * 0.3); }
        else {
          const sx = x >= 0 ? 1 : -1; f.pos.x = sx * (St.W + BODY);
          if (f.state === 'tumble' && Math.abs(f.vel.x) > 5) { f.vel.x = sx * Math.abs(f.vel.x) * 0.45; if (!U.quiet) { SFX.play('heavy'); FX.addShake(0.2); } }
          else if (sx * f.vel.x < 0) f.vel.x = 0;
        }
      }
      f.pos.z = 0; f.vel.z = 0;
    },
    /* a LEDGE: falling (or rising slowly) by either end of the main platform, hands up near its top, facing it or not */
    ledge(f) {
      const St = f.m.arena.stage;
      if ((f.ledgeCd || 0) > 0 || f.vel.y > 3 || f.broken.armL && f.broken.armR) return false;
      for (const side of [-1, 1]) {
        const ax = side * f.pos.x;
        if (ax < St.W - 0.05 || ax > St.W + 1.05 || f.pos.y > St.top - 0.55 || f.pos.y < St.top - 2.5) continue;
        const o = f.opp; if (o && o.state === 'ledge' && o.ledgeSide === side) continue;   // (someone's on it)
        f.setState('ledge'); f.move = null; f.ledgeSide = side; f.vel.set(0, 0, 0);
        f.pos.set(side * (St.W + 0.3), St.top - 1.5, 0); f.yaw = side > 0 ? -HALF : HALF;
        f.airJumps = f.st.airJumps; f.airDodges = f.st.airDodges; f.airStr = 0; f.upUsed = false;
        if (!f.ledgeUsed) f.inv = Math.max(f.inv, 0.6); f.ledgeUsed = true;   // (the first grab since you last touched down: a moment of invincibility)
        if (!U.quiet) { SFX.play('snapon'); FX.burst(new THREE.Vector3(side * St.W, St.top - 0.05, 0), { n: 5, color: f.m.arena.dust, speed: 1.5, size: 0.06, life: 0.3 }); }
        f.m.event('ledge', { f });
        return true;
      }
      return false;
    },
    /* past a BLAST ZONE */
    out(f) { const B = f.m.arena.stage.blast; return f.pos.x < -B.x || f.pos.x > B.x || f.pos.y > B.top || f.pos.y < B.bot; },
    /* where the KO flash goes: the edge of the screen they went off */
    edgeAt(f) { const B = f.m.arena.stage.blast; return new THREE.Vector3(U.clamp(f.pos.x, -B.x + 1, B.x - 1), U.clamp(f.pos.y, B.bot + 1, B.top - 1), 0); },
    /* how a figure sits to the stage: off it (nothing under it, out past the ends or below the top) */
    offStage(f) { const St = f.m.arena.stage; return Math.abs(f.pos.x) > St.W - 0.1 || f.pos.y < St.top - 0.3; },
  };
  window.Platform = P;
})();
