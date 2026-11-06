/* ============================================================================
   realm_arts.js -- the KNIGHTS OF THE REALM newcomers' Legend Arts, and the
   BASKETBALL player's (arts.js explains an Art).
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3, _v = new V3();
  const { P, face, moveTo, span, beat, once, chest, tick, pose, prop, drop, lit, glowAt } = Arts.H, Prop = Arts.Prop;
  const flag = () => Prop.vox(g => { g.box(0, 0, 0, 0, 32, 0, 0x3a2a1a); for (let y = 18; y <= 31; y++) g.box(1, y, 0, 8, y, 0, y > 24 ? 0x141418 : 0xf0ece0); g.set(0, 33, 0, 0xc8ccd4); }, 0.07);
  const hoop = () => Prop.vox(g => { g.box(-6, 0, 0, 6, 8, 0, 0xf4f4f0); g.box(-3, 1, 0, 3, 4, 0, 0xff7a1a); for (let a = 0; a < 16; a++) { const x = Math.round(Math.sin(a / 16 * Math.PI * 2) * 3.4), z = 3 + Math.round(Math.cos(a / 16 * Math.PI * 2) * 3); g.set(x, 0, z, 0xff5a1a); } }, 0.07);
  const ballP = () => Prop.vox(g => g.ell(0, 0, 0, 3, 3, 3, (x, y, z) => x === 0 || y === 0 ? 0x2a1a10 : 0xe8681a), 0.07);
  const splinters = at => FX.burst(at, { n: 14, color: [0xd8b878, 0xa8783a, 0xf0d860], speed: 6, size: 0.09, gravity: 8, life: 0.7 });

  Object.assign(Arts.ART, {
    /* TEMPLAR: the Beauséant planted behind him, three great cuts, then he grips the blade and swings the hilt down:
       the Murder-Stroke */
    beauseant: {
      ticks: 5, fin: 1.75, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.flag) { const b = flag(); b.position.copy(P(c, -3.0, 1.2, 0)); b.rotation.y = Math.atan2(c.S.x, c.S.z); s.flag = prop(c, b, null, 3); f.pos.copy(P(c, -1.3, 0, 0)); face(f, o.pos); c.m.call(f, 'BEAUSÉANT!', 'super'); }
        moveTo(o.pos, P(c, 0.25 * span(t, 0.3, 1.2), 0, 0), 6, dt);
        const k = beat(c, 'cut', 3, 0.3, 1.15);
        if (k) { pose(c, ['twoHandDiag', 'hack', 'slashB'][k - 1]); tick(c); SFX.play('heavy'); FX.addShake(0.3); FX.spark(chest(o), { size: 1.8, life: 0.25 }); f.trailR.push(f.fig.socket('wR', [0, 0, 6]), f.fig.socket('wR', [0, 0, 20])); }
        if (t > 1.2) { pose(c, 'twoHandOver', t < 1.5 ? 'wind' : 'strike'); if (once(c, 'm', 1.25)) c.m.call(f, 'MORDHAU!', 'super'); }
        if (t > 1.5) o.pos.y = Math.max(0, o.pos.y - dt * 6);
        if (once(c, 'hilt', 1.6)) { tick(c); SFX.play('wallbreak'); FX.ring(_v.copy(o.pos).setY(0.1), { r1: 4, life: 0.45 }); FX.burst(_v.copy(o.pos).setY(0.2), { n: 30, color: c.m.arena.dust, speed: 7, size: 0.12, life: 0.7 }); }
        return t >= this.fin;
      },
      cam(c, t) {
        if (t < 1.2) return { id: 'side', pos: P(c, -0.8, 4.8, 1.6), look: P(c, -0.6, 0, 1.2) };
        return { id: 'low', pos: P(c, 1.8, 2.4, 0.5), look: P(c, -0.4, 0, 1.6) };
      },
    },

    /* CRUSADER: the flail wheels round him faster and faster, and comes down from a leap like a falling star */
    flailstorm: {
      ticks: 9, fin: 1.85, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o;
        moveTo(o.pos, P(c, 0, 0, 0.4 + (t < 1.2 ? Math.abs(Math.sin(t * 7)) * 0.2 : 0)), 8, dt);
        if (t < 1.2) {
          f.pos.copy(P(c, -1.2, 0, 0)); f.yaw += dt * (10 + t * 10); pose(c, 'spin');
          f.trailR.push(f.fig.socket('wR', [0, 0, 6]), f.fig.socket('wR', [0, 0, 12]));
          const k = beat(c, 'hit', 7, 0.1, 1.15); if (k) { tick(c); SFX.play('heavy'); FX.spark(chest(o), { size: 1.2, life: 0.2, color: 0xffc080 }); o.spin.rotation.z = k % 2 ? 0.14 : -0.14; }
          if (once(c, 'call', 0.05)) c.m.call(f, 'DEUS VULT!', 'super');
          return false;
        }
        o.spin.rotation.z = 0;
        if (t < 1.55) { face(f, o.pos); f.pos.y = U.easeOut(span(t, 1.2, 1.5)) * 2.4; pose(c, 'overhead', 'wind'); if (once(c, 'j', 1.2)) SFX.play('jump'); return false; }
        f.pos.y = (1 - U.easeIn(span(t, 1.55, 1.75))) * 2.4; pose(c, 'overhead', 'strike');
        if (once(c, 'star', 1.75)) { tick(c); tick(c); SFX.play('wallbreak'); FX.ring(_v.copy(o.pos).setY(0.1), { r1: 4.5, life: 0.5, color: 0xffa040 }); FX.burst(chest(o), { n: 30, color: [0xffc080, 0xffffff], glow: true, speed: 8, size: 0.09, life: 0.6 }); }
        return t >= this.fin;
      },
      cam(c, t) { const a = Math.atan2(c.S.x, c.S.z) + t * 0.6; return { id: 'orbit', pos: new V3(c.O.x + Math.sin(a) * 5.6, 2.4 + (t > 1.2 ? 1 : 0), c.O.z + Math.cos(a) * 5.6), look: chest(c.o) }; },
    },

    /* LANCER: the lists: away down the floor, turn, and two passes at the gallop (the lance shatters on the first), then
       the third lifts them out of the saddle */
    joust: {
      ticks: 5, fin: 1.9,
      step(c, t, dt) {
        const f = c.f, o = c.o;
        moveTo(o.pos, P(c, 0, 0, 0), 8, dt);
        const leg = (a, b, t0, t1) => { const k = span(t, t0, t1); f.pos.lerpVectors(a, b, k); f.yaw = Math.atan2(b.x - a.x, b.z - a.z); if (U.vrand() < 0.6) FX.burst(_v.copy(f.pos).setY(0.1), { n: 2, color: c.m.arena.dust, speed: 2, size: 0.09, life: 0.4 }); };
        const E = P(c, 5.2, 0, 0), W = P(c, -5.2, 0, 0);
        if (once(c, 'call', 0.02)) c.m.call(f, 'TO THE LISTS!', 'super');
        pose(c, 'lance');
        if (t < 0.4) leg(f.pos.clone(), W, 0, 0.4);
        else if (t < 0.85) leg(W, E, 0.4, 0.85);
        else if (t < 1.35) leg(E, W, 0.85, 1.35);
        else if (t < 1.75) leg(W, P(c, 1.4, 0, 0), 1.35, 1.75);
        if (once(c, 'p1', 0.62)) { tick(c); SFX.play('heavy'); splinters(chest(o)); c.m.call(f, 'A HIT!', 'super'); FX.addShake(0.4); }
        if (once(c, 'p2', 1.1)) { tick(c); tick(c); SFX.play('heavy'); splinters(chest(o)); FX.addShake(0.4); }
        if (t > 1.6) { pose(c, 'upslash'); o.pos.y = U.lerp(0, 1.8, span(t, 1.6, 1.85)); }
        if (once(c, 'p3', 1.65)) { tick(c); tick(c); SFX.play('crack'); splinters(chest(o)); c.m.call(f, 'UNHORSED!', 'super'); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'lists', pos: P(c, 0, 7.5, 2.6), look: P(c, 0, 0, 1.0) }; },
    },

    /* BASKETBALL: a crossover (their ankles go), the alley-oop off the backboard, and the slam: POSTERIZED */
    posterize: {
      ticks: 6, fin: 1.7, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.hoop) {
          const h = hoop(); h.position.copy(P(c, 0.4, 0, 3.4)); h.rotation.y = Math.atan2(-c.D.x, -c.D.z); s.hoop = prop(c, h, null, 3);
          f.pos.copy(P(c, -1.2, 0, 0)); face(f, o.pos);
        }
        if (t < 0.6) {
          moveTo(o.pos, P(c, 0, 0, 0), 8, dt);
          f.pos.copy(P(c, -1.2, Math.sin(t * 16) * 0.6, 0)); face(f, o.pos); pose(c, 'palm', Math.sin(t * 16) > 0 ? 'wind' : 'strike');
          o.spin.rotation.z = span(t, 0.3, 0.55) * 0.9;
          if (beat(c, 'x', 2, 0.15, 0.5)) { tick(c); SFX.play('whoosh'); }
          if (once(c, 'ank', 0.45)) c.m.call(o, 'ANKLES!', 'super');
          return false;
        }
        if (!s.ball) { const b = ballP(); b.position.copy(chest(f)); s.ball = prop(c, b, null, 2); s.b0 = chest(f); SFX.play('whoosh'); c.m.call(f, 'ALLEY-OOP!', 'super'); }
        const k = span(t, 0.6, 1.05);
        s.ball.obj.position.lerpVectors(s.b0, P(c, 0.2, 0, 3.4), k).y += Math.sin(k * Math.PI) * 1.2;
        if (t < 1.25) {
          o.spin.rotation.z = 0.9 * (1 - span(t, 0.6, 0.8)); o.pos.y = U.lerp(0, 1.2, span(t, 0.8, 1.2));
          f.pos.y = U.easeOut(span(t, 0.75, 1.2)) * 3.2; f.pos.lerp(P(c, -0.4, 0, f.pos.y), 0.1); pose(c, 'press', 'wind');
          if (once(c, 'catch', 1.1)) { s.ball.obj.position.copy(f.fig.socket('wR', [0, 0, 2])); tick(c); }
          return false;
        }
        f.pos.y = (1 - U.easeIn(span(t, 1.25, 1.5))) * 3.2; o.pos.y = Math.max(0, o.pos.y - dt * 8); pose(c, 'bashDown');
        s.ball.obj.position.copy(chest(o)).y += 0.6;
        if (once(c, 'slam', 1.45)) { tick(c); tick(c); SFX.play('wallbreak'); FX.ring(_v.copy(o.pos).setY(0.1), { r1: 4.5, life: 0.5, color: 0xff7a1a }); FX.addShake(1); c.m.call(f, 'POSTERIZED!', 'super'); }
        return t >= this.fin;
      },
      cam(c, t) {
        if (t < 0.6) return { id: 'front', pos: P(c, 2.6, 2.4, 1.3), look: P(c, -0.6, 0, 1.1) };
        return { id: 'low', pos: P(c, -1.5, 4.8, 0.6), look: P(c, -0.2, 0, 2.4) };
      },
    },
  });
})();
