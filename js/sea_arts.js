/* ============================================================================
   sea_arts.js -- the LOVERS OF THE SEA Legend Arts (arts.js explains an Art).
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3, _v = new V3();
  const { P, face, moveTo, span, beat, once, chest, tick, pose, prop, drop, lit, glowAt } = Arts.H, Prop = Arts.Prop;
  const splash = at => { FX.burst(at, { n: 30, color: [0x7ab8ff, 0xd8f0ff, 0x3a7ae0], speed: 6, size: 0.1, gravity: 9, life: 0.8, up: 1.5 }); FX.ring(_v.copy(at).setY(0.08), { r1: 2.4, life: 0.45, color: 0x9ad8ff }); };
  const smoke = (at, n) => FX.burst(at, { n: n || 8, color: [0xd8d0c0, 0xa8a090, 0x8a847a], speed: 1.4, size: 0.16, gravity: -1.2, life: 1.0 });
  const flash = at => { FX.spark(at, { color: 0xffc860, size: 1.3 }); FX.burst(at, { n: 5, color: [0xffd060, 0xffffff], glow: true, speed: 4, size: 0.05, life: 0.2 }); smoke(at, 5); };
  const plank = () => Prop.vox(g => { g.box(-2, 0, 0, 2, 0, 40, 0x8a5a2a); for (let z = 0; z <= 40; z += 8) g.box(-2, 0, z, 2, 0, z, 0x6a4020); }, 0.07);
  const cannon = () => Prop.vox(g => { g.box(-3, 0, -4, 3, 2, 4, 0x6a4020); g.ell(-3, 0, -2, 1, 1.4, 1.4, 0x3a2a1a); g.ell(3, 0, -2, 1, 1.4, 1.4, 0x3a2a1a); g.ell(-3, 0, 3, 1, 1.4, 1.4, 0x3a2a1a); g.ell(3, 0, 3, 1, 1.4, 1.4, 0x3a2a1a); for (let z = -4; z <= 10; z++) { const r = z > 8 ? 2 : 1.6; g.ell(0, 4, z, r, r, 0.6, 0x2a2a30); } }, 0.08);
  const anchor = () => Prop.vox(g => { g.box(-1, 0, 0, 1, 22, 1, 0x4a4e58); g.box(-6, 20, 0, 6, 21, 1, 0x4a4e58); for (let x = -8; x <= 8; x++) { const y = Math.round(Math.pow(x / 8, 2) * 6); g.box(x, y, 0, x, y + 1, 1, 0x4a4e58); } g.box(-9, 6, 0, -8, 9, 1, 0x4a4e58); g.box(8, 6, 0, 9, 9, 1, 0x4a4e58); g.ell(0, 24, 0, 2, 2, 1, 0x4a4e58); }, 0.09);
  const water = () => Prop.vox(g => { for (let x = -20; x <= 20; x++) for (let z = -20; z <= 20; z++) if (x * x + z * z < 400) g.set(x, 0, z, ((x + z) & 3) ? 0x0a2a2a : 0x1a4a4a); }, 0.1);
  const hand = () => Prop.vox(g => { g.box(-1, 0, -1, 1, 9, 1, 0x6affb0); for (const x of [-2, 0, 2]) g.box(x, 10, 0, x, 12, 0, 0x9affd8); g.box(-2, 9, -1, 2, 10, 1, 0x6affb0); }, 0.07);

  Object.assign(Arts.ART, {
    /* CAPTAIN: a plank runs out over the floor, she walks them along it at sword-point, they drop, a splash, and the
       sabre as they come up */
    plank: {
      ticks: 6, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.pl) { const b = plank(); b.position.copy(P(c, -0.4, 0, 0.6)); b.rotation.y = Math.atan2(c.D.x, c.D.z); s.pl = prop(c, b, null, 3); c.m.call(f, 'WALK THE PLANK!', 'super'); }
        if (t < 1.1) {
          const k = span(t, 0.1, 1.0); o.pos.copy(P(c, k * 2.2, 0, 0.62)); f.pos.copy(P(c, -1.1 + k * 2.2, 0, 0.62)); face(f, o.pos); o.yaw = f.yaw + Math.PI;
          if (beat(c, 'prod', 4, 0.15, 1.0)) { pose(c, 'thrust'); tick(c); SFX.play('slash'); }
          return false;
        }
        if (t < 1.5) { o.pos.y = Math.max(-1.2, 0.62 - (t - 1.1) * 7); pose(c, 'point'); if (once(c, 'drop', 1.1)) SFX.play('whoosh'); if (once(c, 'sp', 1.28)) { splash(P(c, 2.2, 0, 0)); tick(c); } return false; }
        o.pos.y = U.lerp(-1.2, 0.9, span(t, 1.5, 1.75)); pose(c, 'slashA', t < 1.75 ? 'wind' : 'strike');
        if (once(c, 'cut', 1.8)) { tick(c); SFX.play('heavy'); f.trailR.push(f.fig.socket('wR', [0, 0, 4]), f.fig.socket('wR', [0, 0, 15])); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, 1.0, 5.2, 1.6), look: P(c, 1.0, 0, 0.9) }; },
    },

    /* CANNONEER: a row of cannons rolls up behind him; he walks the linstock down the line and every one fires */
    battery: {
      ticks: 7, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        moveTo(o.pos, P(c, 0.4, 0, 0), 6, dt);
        if (!s.guns) {
          s.guns = [];
          for (let i = 0; i < 5; i++) { const g = cannon(); g.position.copy(P(c, -4.2, -3 + i * 1.5, 0)); g.lookAt(o.pos.x, 0, o.pos.z); s.guns.push(prop(c, g, null, 2.8)); }
          c.m.call(f, 'FULL BATTERY!', 'super');
        }
        const k = beat(c, 'gun', 5, 0.35, 1.55);
        if (k) {
          const gp = s.guns[k - 1].obj.position; f.pos.copy(gp).addScaledVector(c.D, -0.9); face(f, gp); pose(c, 'thrust');
          const mz = _v.copy(gp).addScaledVector(c.D, 0.9).setY(0.45).clone(); flash(mz); SFX.play('boom'); FX.addShake(0.45); tick(c);
          FX.burst(chest(o), { n: 10, color: [0xffa040, 0x3a3a3a], glow: true, speed: 5, size: 0.1, life: 0.4 }); o.spin.rotation.x = -0.2;
        }
        if (t > 1.6) { o.spin.rotation.x = 0; pose(c, 'point'); f.pos.lerp(P(c, -1.5, 0, 0), 0.25); face(f, o.pos); }   // (back beside them for the finish)
        if (once(c, 'last', 1.85)) { tick(c); tick(c); SFX.play('wallbreak'); FX.ring(chest(o), { r1: 4, life: 0.5, normal: c.D.clone(), color: 0xffa040 }); FX.burst(chest(o), { n: 30, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 8, size: 0.12, life: 0.6 }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'line', pos: P(c, -6.5, 3.2, 2.4), look: P(c, -1.2, 0, 0.9) }; },
    },

    /* BLACKBEARD: the fuses flare in his beard, then six pistols, one after another, and the cutlass */
    sixshots: {
      ticks: 8, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o;
        moveTo(o.pos, P(c, 0, 0, 0), 6, dt); f.pos.copy(P(c, -1.9, 0, 0)); face(f, o.pos);
        if (t < 0.4) { pose(c, 'salute'); if (U.vrand() < 0.7) FX.burst(f.fig.socket('head', [U.vrnd(-3, 3), -2, 5]), { n: 2, color: [0xff8a2a, 0xffd060], glow: true, speed: 1, size: 0.06, gravity: -3, life: 0.4 }); if (once(c, 'f', 0.05)) c.m.call(f, 'FUSES LIT', 'super'); smoke(chest(f), 2); return false; }
        const k = beat(c, 'shot', 6, 0.45, 1.45);
        if (k) { pose(c, 'shoot'); f.kickT = 0.14; flash(f.fig.socket('wL', [0, 0, 7])); SFX.play('shot'); tick(c); FX.burst(chest(o), { n: 4, color: [0xffd27a, 0xffffff], glow: true, speed: 4, size: 0.05, life: 0.25 }); if (k === 6) c.m.call(f, 'SIX!', 'super'); }
        if (t > 1.5) pose(c, 'hack', t < 1.75 ? 'wind' : 'strike');
        if (once(c, 'cut', 1.8)) { tick(c); tick(c); SFX.play('heavy'); f.trailR.push(f.fig.socket('wR', [0, 0, 3]), f.fig.socket('wR', [0, 0, 14])); }
        return t >= this.fin;
      },
      cam(c, t) { return t < 0.4 ? { id: 'face', pos: P(c, -0.3, 1.6, 1.8), look: _v.copy(c.f.pos).setY(1.7).clone() } : { id: 'side', pos: P(c, -0.9, 4.6, 1.4), look: P(c, -0.9, 0, 1.1) }; },
    },

    /* REDBEARD: the kilij like a galley's oars, a fleet of cuts, then the crescent */
    fleet: {
      ticks: 9, fin: 1.85,
      step(c, t, dt) {
        const f = c.f, o = c.o;
        moveTo(o.pos, P(c, 0, 0, 0.5), 8, dt);
        if (t < 1.3) {
          const k = beat(c, 'oar', 8, 0.05, 1.25);
          if (k) { const side = k % 2 ? 1 : -1; f.pos.copy(P(c, -1.2, side * 0.9, 0)); face(f, o.pos); pose(c, side > 0 ? 'slashA' : 'slashB'); tick(c); SFX.play('slash'); f.trailR.push(f.fig.socket('wR', [0, 0, 4]), f.fig.socket('wR', [0, 0, 15])); }
          if (once(c, 'call', 0.05)) c.m.call(f, 'CORSAIR FLEET!', 'super');
          return false;
        }
        f.pos.lerp(P(c, -1.4, 0, 0), 0.3); face(f, o.pos); pose(c, 'spin', t < 1.55 ? 'wind' : 'strike');
        if (once(c, 'cres', 1.6)) { tick(c); SFX.play('heavy'); FX.ring(chest(o), { r1: 3.4, life: 0.4, normal: new V3(0, 1, 0), color: 0xffd8a0 }); }
        return t >= this.fin;
      },
      cam(c, t) { const a = Math.atan2(c.S.x, c.S.z) - t * 0.8; return { id: 'orbit', pos: new V3(c.O.x + Math.sin(a) * 5.4, 2.2, c.O.z + Math.cos(a) * 5.4), look: chest(c.o) }; },
    },

    /* SAILOR: a punch on every beat of the shanty (heave, ho), and the ship's anchor comes down on them */
    shanty: {
      ticks: 7, fin: 1.95, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        moveTo(o.pos, P(c, 0, 0, 0), 8, dt); f.pos.copy(P(c, -1.1, 0, 0)); face(f, o.pos);
        if (t < 1.25) {
          const k = beat(c, 'beat', 6, 0.05, 1.2);
          if (k) { pose(c, k % 2 ? 'jabL' : 'jabR'); tick(c); SFX.play('hit', { power: 1.1 }); c.m.call(f, ['HEAVE!', 'HO!', 'HEAVE!', 'HO!', 'AND UP SHE', 'RISES!'][k - 1], 'super'); }
          return false;
        }
        if (!s.anc) { const a = anchor(); a.position.copy(o.pos).setY(9); a.rotation.y = Math.atan2(c.S.x, c.S.z); s.anc = prop(c, a, null, 1.4); f.pos.copy(P(c, -2.4, 0, 0)); pose(c, 'point'); SFX.play('whoosh'); }
        s.anc.obj.position.y = Math.max(0.1, 9 - (t - 1.25) * 22);
        if (once(c, 'thud', 1.62)) { tick(c); SFX.play('wallbreak'); FX.addShake(1); FX.ring(_v.copy(o.pos).setY(0.1), { r1: 4.5, life: 0.5 }); FX.burst(_v.copy(o.pos).setY(0.2), { n: 30, color: c.m.arena.dust, speed: 7, size: 0.13, life: 0.7 }); o.pos.y = 0; }
        return t >= this.fin;
      },
      cam(c, t) { return t < 1.25 ? { id: 'side', pos: P(c, -0.6, 3.8, 1.3), look: P(c, -0.6, 0, 1.1) } : { id: 'up', pos: P(c, -3, 3.5, 1.2), look: P(c, 0, 0, 2.4) }; },
    },

    /* MARAUDER: the grapnel bites, he hauls them across the floor to him, the axe, and the kick over the side */
    boarding: {
      ticks: 7, fin: 1.85,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.from) { s.from = P(c, 3.2, 0, 0); f.pos.copy(P(c, -0.6, 0, 0)); c.m.call(f, 'BOARD HER!', 'super'); }
        if (t < 0.55) { o.pos.lerpVectors(s.from, P(c, 0.4, 0, 0), U.easeIn(span(t, 0.05, 0.5))); face(f, o.pos); pose(c, 'chainYank'); if (once(c, 'yank', 0.1)) { SFX.play('whoosh'); tick(c); } return false; }
        moveTo(o.pos, P(c, 0.5, 0, 0), 8, dt);
        const k = beat(c, 'axe', 4, 0.6, 1.4);
        if (k) { pose(c, k % 2 ? 'hack' : 'slashB'); tick(c); SFX.play('heavy'); f.trailR.push(f.fig.socket('wR', [0, 0, 6]), f.fig.socket('wR', [0, 0, 11])); FX.spark(chest(o), { size: 1.3, life: 0.2 }); }
        if (t > 1.45) pose(c, 'kick', t < 1.65 ? 'wind' : 'strike');
        if (once(c, 'kick', 1.7)) { tick(c); tick(c); SFX.play('heavy'); c.m.call(f, 'OVERBOARD!', 'super'); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, 1.0, 5.4, 1.6), look: P(c, 0.6, 0, 1.0) }; },
    },

    /* MUSKETEER: the bayonet charge, thrust after thrust, a step back, and the one shot she saved, point blank */
    bayonets: {
      ticks: 7, fin: 1.9,
      step(c, t, dt) {
        const f = c.f, o = c.o;
        moveTo(o.pos, P(c, 0, 0, 0.3), 8, dt);
        if (t < 1.1) {
          const k = beat(c, 'th', 6, 0.05, 1.05);
          if (k) { f.pos.copy(P(c, -1.3, (k % 3 - 1) * 0.5, 0)); face(f, o.pos); pose(c, k % 2 ? 'thrust' : 'lunge'); tick(c); SFX.play('slash'); }
          if (once(c, 'call', 0.05)) c.m.call(f, 'FIX BAYONETS!', 'super');
          return false;
        }
        f.pos.lerp(P(c, -2.2, 0, 0), 0.2); face(f, o.pos); pose(c, 'aim');
        if (once(c, 'aim', 1.15)) c.m.call(f, 'PRESENT...', 'super');
        if (once(c, 'fire', 1.7)) { const mz = f.fig.socket('wR', [0, 0, 16]); flash(mz); SFX.play('shot'); SFX.play('boom'); FX.addShake(0.7); tick(c); c.m.call(f, 'FIRE!', 'super'); }
        return t >= this.fin;
      },
      cam(c, t) { return t < 1.1 ? { id: 'side', pos: P(c, -0.8, 4.4, 1.4), look: P(c, -0.6, 0, 1.0) } : { id: 'shoulder', pos: P(c, -3.6, 1.0, 1.6), look: P(c, 0, 0, 1.2) }; },
    },

    /* GHOST: the floor turns to black water, cold hands come up out of it and drag them under, and spit them out */
    locker: {
      ticks: 6, fin: 1.9, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.pool) {
          const w = water(); w.position.copy(c.O).setY(0.03); s.pool = prop(c, w, (p, d) => { p.obj.rotation.y += d * 0.6; }, 3);
          s.hands = [];
          for (let i = 0; i < 5; i++) { const h = hand(), a = i / 5 * Math.PI * 2; h.position.set(c.O.x + Math.sin(a) * 0.8, -1.2, c.O.z + Math.cos(a) * 0.8); h.rotation.z = Math.sin(a) * 0.4; h.rotation.x = Math.cos(a) * 0.4; s.hands.push(prop(c, h, (p, d) => { p.obj.position.y = Math.min(0, p.obj.position.y + d * 3); }, 3)); }
          f.pos.copy(P(c, -2.6, 0, 0)); face(f, o.pos); lit(c, 0.35); c.m.call(f, 'DAVY JONES’ LOCKER', 'super');
        }
        pose(c, 'salute');
        if (t < 1.3) { o.pos.y = U.lerp(0.4, -1.4, U.easeIn(span(t, 0.4, 1.25))); moveTo(o.pos, _v.set(c.O.x, o.pos.y, c.O.z), 6, dt); if (beat(c, 'drag', 4, 0.35, 1.25)) { tick(c); FX.burst(_v.copy(c.O).setY(0.2), { n: 8, color: [0x6affb0, 0x1a4a4a], glow: true, speed: 2, size: 0.08, gravity: 2, life: 0.6 }); } return false; }
        if (once(c, 'spit', 1.35)) { lit(c, 1); SFX.play('boom'); FX.burst(_v.copy(c.O).setY(0.3), { n: 30, color: [0x6affb0, 0xd8fff0, 0x1a4a4a], glow: true, speed: 8, size: 0.1, gravity: 6, life: 0.8, up: 2 }); }
        o.pos.y = t < 1.6 ? U.lerp(-1.4, 2.4, span(t, 1.35, 1.6)) : Math.max(0, 2.4 - (t - 1.6) * 14);
        if (once(c, 'down', 1.75)) { tick(c); SFX.play('heavy'); FX.ring(_v.copy(o.pos).setY(0.1), { r1: 3.5, life: 0.4, color: 0x6affb0 }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'high', pos: P(c, -1.2, 4.4, 3.4), look: P(c, 0, 0, 0.4) }; },
    },
  });
})();
