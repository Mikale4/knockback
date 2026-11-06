/* ============================================================================
   sports_arts.js -- the MODERN SPORTS Legend Arts (arts.js explains an Art:
   ticks, fin, slam, step(c, t, dt), cam(c, t)).
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3, _v = new V3();
  const { P, face, moveTo, span, beat, once, chest, tick, pose, prop, drop, lit, glowAt } = Arts.H, Prop = Arts.Prop;
  const ball = (r, col, scale) => Prop.vox(g => g.ell(0, 0, 0, r, r, r, col), scale || 0.06);
  const pins = () => Prop.vox(g => { g.box(-1, 0, -1, 1, 5, 1, 0xf4f4f0); g.box(-1, 6, -1, 1, 7, 1, 0xf4f4f0); g.set(0, 8, 0, 0xf4f4f0); g.box(-1, 5, -1, 1, 5, 1, 0xe8323a); }, 0.07);
  const arrow = () => Prop.vox(g => { g.box(0, 0, 0, 0, 0, 10, 0xd8c08a); g.box(0, -1, 0, 0, 1, 1, 0xd8323a); g.set(0, 0, 11, 0xc8ccd4); }, 0.06);
  const side = c => _v.copy(c.S);

  Object.assign(Arts.ART, {
    /* WRESTLER: up on the shoulders, the airplane spin, a leap, and the powerbomb */
    powerbomb: {
      ticks: 6, fin: 1.75, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D, s = c.s;
        if (t < 0.35) { o.pos.set(f.pos.x + D.x * 0.9, Math.max(0, o.pos.y * 0.9), f.pos.z + D.z * 0.9); face(f, o.pos); pose(c, 'grab'); if (once(c, 'g', 0.05)) { tick(c); c.m.call(f, 'GOT YOU!', 'super'); } return false; }
        if (t < 1.3) {
          if (t < 0.9) { f.yaw += dt * 13 * span(t, 0.35, 0.55); if (once(c, 'spin', 0.4)) c.m.call(f, 'AIRPLANE SPIN!', 'super'); }
          else { const k = span(t, 0.9, 1.25); f.pos.y = U.easeOut(k) * 2.2; if (once(c, 'leap', 0.9)) SFX.play('jump'); }
          pose(c, 'press', 'strike'); o.pos.set(f.pos.x, f.pos.y + 2.2, f.pos.z); o.spin.rotation.z = Math.PI / 2;
          if (beat(c, 'sp', 3, 0.45, 0.88)) { tick(c); FX.burst(chest(o), { n: 6, color: [0xffd23a, 0xffffff], speed: 2, size: 0.07, life: 0.3 }); }
          return false;
        }
        const k = span(t, 1.3, 1.62); pose(c, 'bashDown');
        f.pos.y = (1 - U.easeIn(k)) * 2.2; o.pos.set(f.pos.x + D.x * 1.1 * k, Math.max(0.05, f.pos.y + 2.2 * (1 - k)), f.pos.z + D.z * 1.1 * k); o.spin.rotation.z = Math.PI / 2 * (1 - k);
        if (once(c, 'tk', 1.45)) tick(c);
        if (t >= this.fin) { o.spin.rotation.z = 0; f.pos.y = 0; o.pos.y = 0.05; FX.ring(_v.copy(o.pos).setY(0.1), { r1: 5, life: 0.5, color: 0xff5af0 }); FX.burst(_v.copy(o.pos).setY(0.1), { n: 40, color: c.m.arena.dust, speed: 8, size: 0.14, life: 0.8 }); SFX.play('wallbreak'); c.m.call(f, 'POWERBOMB!', 'super'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f;
        if (t < 0.35) return { id: 'close', pos: _v.copy(f.pos).addScaledVector(c.S, 3.2).addScaledVector(c.D, 0.4).setY(1.3).clone(), look: chest(c.o) };
        if (t < 0.9) { const a = Math.atan2(c.S.x, c.S.z) + t * 1.8; return { id: 'orbit', pos: new V3(f.pos.x + Math.sin(a) * 5.5, 2.2, f.pos.z + Math.cos(a) * 5.5), look: _v.copy(f.pos).setY(2.4).clone() }; }
        return { id: 'low', pos: _v.copy(f.pos).addScaledVector(c.S, 5).addScaledVector(c.D, 1).setY(0.6).clone(), look: _v.copy(f.pos).setY(2).clone() };
      },
    },

    /* BASEBALL: batting practice on them, a toss up, and the home run */
    homer: {
      ticks: 8, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D, s = c.s;
        if (!s.at) { s.at = c.O.clone().addScaledVector(D, -1.6); }
        moveTo(f.pos, s.at, 10, dt); face(f, o.pos);
        if (t < 1.3) {
          o.pos.y = U.lerp(o.pos.y, 0.5 + Math.abs(Math.sin(t * 9)) * 0.4, 0.3); moveTo(o.pos, _v.set(c.O.x, o.pos.y, c.O.z), 6, dt);
          const k = beat(c, 'sw', 7, 0.15, 1.2);
          if (k) { pose(c, 'homerun', k % 2 ? 'strike' : 'wind'); tick(c); SFX.play('heavy'); FX.burst(chest(o), { n: 5, color: [0xffffff, 0xdcb47e], speed: 3, size: 0.07, life: 0.3 }); f.trailR.push(f.fig.socket('wR', [0, 0, 4]), f.fig.socket('wR', [0, 0, 15])); }
          if (once(c, 'bp', 0.1)) c.m.call(f, 'BATTING PRACTICE!', 'super');
          return false;
        }
        const k = span(t, 1.3, 1.6); o.pos.y = U.lerp(0.5, 1.9, U.easeOut(k)); pose(c, 'homerun', t < 1.7 ? 'wind' : 'strike');
        if (once(c, 'up', 1.32)) { c.m.call(f, 'BATTER UP!', 'super'); SFX.play('whoosh'); }
        if (t > 1.7) f.trailR.push(f.fig.socket('wR', [0, 0, 4]), f.fig.socket('wR', [0, 0, 15]));
        if (t >= this.fin) { SFX.play('crack'); FX.spark(chest(o), { size: 2.4, life: 0.35 }); FX.ring(chest(o), { r1: 4, life: 0.5, normal: D.clone(), color: 0xffffff }); c.m.call(f, 'HOME RUN!', 'super'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f;
        if (t < 1.3) return { id: 'shoulder', pos: _v.copy(f.pos).addScaledVector(c.D, -2.4).addScaledVector(c.S, 1.2).setY(1.8).clone(), look: chest(c.o) };
        return { id: 'side', pos: P(c, -0.8, 5.2, 1.4), look: c.O.clone().setY(1.4) };
      },
    },

    /* FOOTBALL: on the shoulder, the length of the field, and the touchdown */
    touchdown: {
      ticks: 8, fin: 1.9, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D, s = c.s;
        if (s.end == null) {
          const sp = 11; f.pos.x += D.x * sp * dt; f.pos.z += D.z * sp * dt; f.yaw = Math.atan2(D.x, D.z); pose(c, 'tackle', 'strike');
          o.pos.set(f.pos.x + D.x * 0.2, 1.7, f.pos.z + D.z * 0.2); o.spin.rotation.z = Math.PI / 2;
          if (beat(c, 'run', 5, 0.05, 0.95)) tick(c);
          if (once(c, 'go', 0.05)) c.m.call(f, 'HUT! HUT!', 'super');
          if (U.vrand() < 0.5) FX.burst(_v.copy(f.pos).setY(0.1), { n: 2, color: c.m.arena.dust, speed: 2, size: 0.08, life: 0.4 });
          const wall = c.m.arena.walls.some(w => !w.broken && w.sign * f.pos[w.axis] > w.lim - 1.4);
          if (wall || t > 1.05) { s.end = t; s.pin = f.pos.clone().addScaledVector(D, 0.9); c.O = s.pin.clone().setY(0); }
          return false;
        }
        const u = t - s.end, k = span(u, 0.0, 0.35);
        f.pos.y = Math.sin(Math.PI * Math.min(1, u / 0.45)) * 1.6; pose(c, 'bashDown', u < 0.25 ? 'wind' : 'strike');
        o.pos.set(s.pin.x, U.lerp(1.7 + f.pos.y, 0.05, U.easeIn(k)), s.pin.z); o.spin.rotation.z = Math.PI / 2 * (1 - k);
        if (once(c, 'tk', s.end + 0.3)) tick(c);
        if (t >= this.fin) { o.spin.rotation.z = 0; f.pos.y = 0; o.pos.y = 0.05; c.m.call(f, 'TOUCHDOWN!', 'super'); FX.ring(_v.copy(o.pos).setY(0.1), { r1: 5.5, life: 0.6, color: 0xffa060 }); FX.burst(chest(o), { n: 40, color: [0xffa060, 0xffffff, 0xd9531a], glow: true, speed: 9, size: 0.1, life: 0.8 }); SFX.play('boom'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f;
        if (c.s.end == null) return { id: 'track', pos: _v.copy(f.pos).addScaledVector(c.S, 4.6).addScaledVector(c.D, -0.8).setY(1.6).clone(), look: _v.copy(f.pos).addScaledVector(c.D, 1.2).setY(1.2).clone() };
        return { id: 'high', pos: P(c, -2.4, 3.6, 4.2), look: c.O.clone().setY(0.6) };
      },
    },

    /* SOCCER: keep-ups, a volley after volley, and the bicycle kick */
    golazo: {
      ticks: 9, fin: 2.0,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D, s = c.s;
        if (!s.at) { s.at = c.O.clone().addScaledVector(D, -2.4); s.ball = prop(c, ball(3, 0xf4f4f0), (p) => { p.obj.position.copy(s.bp || f.pos); p.obj.rotation.x += 0.3; }); }
        moveTo(f.pos, _v.set(s.at.x, f.pos.y, s.at.z), 10, dt); face(f, o.pos); moveTo(o.pos, _v.set(c.O.x, 0.4, c.O.z), 6, dt);
        const foot = _v.copy(f.pos).addScaledVector(D, 0.5);
        if (t < 0.6) { s.bp = foot.clone().setY(0.4 + Math.abs(Math.sin(t * 14)) * 1.0); pose(c, Math.sin(t * 14) > 0 ? 'toePoke' : 'instep', 'strike'); if (once(c, 'k', 0.05)) c.m.call(f, 'KEEP-UPS!', 'super'); return false; }
        if (t < 1.4) {
          const k = beat(c, 'v', 6, 0.62, 1.38); const ph = ((t - 0.62) / (0.76 / 6)) % 1;
          s.bp = foot.clone().lerp(chest(o), Math.sin(Math.PI * ph)).setY(0.6 + Math.sin(Math.PI * ph) * 0.6);
          if (k) { pose(c, 'instep', 'strike'); tick(c, chest(o)); SFX.play('heavy'); FX.burst(chest(o), { n: 5, color: [0xffffff, 0x7dff9a], speed: 3, size: 0.07, life: 0.3 }); }
          return false;
        }
        const k = span(t, 1.4, 1.65); f.pos.y = U.easeOut(k) * 1.8; s.bp = _v.copy(f.pos).setY(f.pos.y + 2.3).clone();
        pose(c, 'bicycle', t < 1.7 ? 'wind' : 'strike');
        if (t > 1.7) { const k2 = span(t, 1.7, 1.95); s.bp = s.bp.lerp(chest(o), k2); }
        if (t >= this.fin) { f.pos.y = 0; if (s.ball) drop(c, s.ball); c.m.call(f, 'GOOOOAL!', 'super'); FX.burst(chest(o), { n: 50, color: [0xffd23a, 0x7dff9a, 0xff5af0, 0x6ab8ff, 0xffffff], glow: true, speed: 10, size: 0.1, life: 1.0 }); FX.ring(chest(o), { r1: 4, life: 0.5, normal: D.clone(), color: 0x7dff9a }); SFX.play('boom'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f;
        if (t < 0.6) return { id: 'feet', pos: _v.copy(f.pos).addScaledVector(c.S, 2.6).addScaledVector(c.D, 0.6).setY(0.7).clone(), look: _v.copy(f.pos).addScaledVector(c.D, 0.5).setY(0.9).clone() };
        if (t < 1.4) return { id: 'side', pos: P(c, -1.2, 5, 1.3), look: c.O.clone().addScaledVector(c.D, -1.2).setY(0.9) };
        return { id: 'low', pos: P(c, 1.8, 3.4, 0.4), look: _v.copy(f.pos).setY(2).clone() };
      },
    },

    /* BOXER: a flurry against the ropes, the bell, and the uppercut */
    knockout: {
      ticks: 16, fin: 1.7,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D;
        o.pos.set(f.pos.x + D.x * 1.05, Math.max(0, o.pos.y * 0.9), f.pos.z + D.z * 1.05); face(f, o.pos);
        const k = beat(c, 'p', 14, 0.02, 1.15, x => Math.pow(x, 0.75));
        if (k) {
          pose(c, k % 5 === 0 ? 'hook' : k % 2 ? 'jabL' : 'jabR'); f.poseT = 0;
          const p = chest(o).addScaledVector(D, -0.3).add(new V3(U.vrnd(-0.35, 0.35), U.vrnd(-0.4, 0.3), U.vrnd(-0.35, 0.35)));
          tick(c, p); FX.burst(p, { n: 3, color: [0xff6a5a, 0xffffff], speed: 1.2, size: 0.1, gravity: 0, life: 0.15 }); SFX.play('whoosh');
        }
        if (once(c, 'bell', 1.18)) { SFX.play('bell'); c.m.call(f, 'DING DING!', 'super'); }
        if (t > 1.2) pose(c, 'uppercut', 'wind');
        if (t >= this.fin) { pose(c, 'uppercut'); FX.ring(chest(o), { r1: 3.6, life: 0.45, color: 0xff6a5a }); FX.ring(chest(o), { r1: 2.2, life: 0.3, color: 0xffffff }); c.m.call(f, 'KNOCKOUT!', 'super'); SFX.play('heavy'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f, o = c.o, mid = _v.addVectors(f.pos, o.pos).multiplyScalar(0.5).clone();
        if (t < 0.55) return { id: 'shoulder', pos: _v.copy(f.pos).addScaledVector(c.D, -1.9).addScaledVector(c.S, 1.0).setY(1.7).clone(), look: chest(o) };
        if (t < 1.18) return { id: 'front', pos: _v.copy(o.pos).addScaledVector(c.D, 2.3).addScaledVector(c.S, -1.4).setY(1.2).clone(), look: _v.copy(f.pos).setY(1.1).clone() };
        return { id: 'low', pos: mid.clone().addScaledVector(c.S, 3.2).setY(0.5), look: mid.setY(1.6) };
      },
    },

    /* FENCER: five touches from five sides, the salute, and the last lunge */
    touche: {
      ticks: 5, fin: 1.8,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        moveTo(o.pos, P(c, 0, 0, 0.6), 8, dt);
        const k = beat(c, 't', 5, 0.05, 1.05);
        if (k) {
          const a = k * 1.26 + 0.3; f.pos.set(o.pos.x + Math.sin(a) * 1.9, 0, o.pos.z + Math.cos(a) * 1.9); face(f, o.pos);
          pose(c, 'lunge'); tick(c); SFX.play('slash'); c.m.call(o, 'TOUCHÉ ' + k, 'buff');
          FX.burst(chest(o), { n: 8, color: k % 2 ? [0x5aff7a] : [0xff5a5a], glow: true, speed: 2.5, size: 0.08, life: 0.35 });
        }
        if (once(c, 'back', 1.12)) { s.from = P(c, -3.4, 0, 0); f.pos.copy(s.from); f.yaw = Math.atan2(c.D.x, c.D.z); SFX.play('whoosh'); }
        if (t > 1.12 && t < 1.45) pose(c, 'enGarde', 'strike');
        if (t >= 1.45) { const u = span(t, 1.45, 1.75); f.pos.copy(s.from).lerp(P(c, 1.2, 0, 0), U.easeIn(u)); pose(c, 'lunge'); f.trailR.push(f.fig.socket('wR', [0, 0, 4]), f.fig.socket('wR', [0, 0, 18])); }
        if (t >= this.fin) { FX.spark(chest(o), { size: 2, life: 0.3 }); FX.ring(chest(o), { r1: 3.2, life: 0.4, normal: c.D.clone(), color: 0x9ad8ff }); c.m.call(f, 'TOUCHÉ!', 'super'); return true; }
        return false;
      },
      cam(c, t) {
        if (t < 1.1) { const a = Math.atan2(c.S.x, c.S.z) + t * 1.2; return { id: 'orbit', pos: new V3(c.O.x + Math.sin(a) * 4.6, 1.8, c.O.z + Math.cos(a) * 4.6), look: chest(c.o) }; }
        return { id: 'side', pos: P(c, -1.0, 5.4, 1.1), look: P(c, -1.0, 0, 1.0) };
      },
    },

    /* WEIGHTLIFTER: overhead, three reps for the crowd, and down they go */
    record: {
      ticks: 6, fin: 1.9, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D;
        face(f, _v.copy(f.pos).add(D)); o.spin.rotation.z = Math.PI / 2;
        let y = 2.4;
        if (t < 0.5) { y = U.lerp(1.0, 2.4, U.easeOut(span(t, 0, 0.45))); pose(c, 'press', t < 0.25 ? 'wind' : 'strike'); }
        else if (t < 1.4) { const ph = ((t - 0.5) / 0.3) % 1; y = 2.4 - Math.sin(Math.PI * ph) * 0.9; pose(c, 'press', ph > 0.2 && ph < 0.8 ? 'wind' : 'strike'); }
        else if (t < 1.6) { pose(c, 'press', 'strike'); f.spin.rotation.z = Math.sin(t * 60) * 0.03; }
        o.pos.set(f.pos.x, f.pos.y + y, f.pos.z);
        const k = beat(c, 'rep', 3, 0.62, 1.32); if (k) { tick(c); c.m.call(f, 'REP ' + k, 'buff'); SFX.play('heavy'); FX.burst(_v.copy(f.pos).setY(0.1), { n: 10, color: [0xffffff], speed: 2, size: 0.1, life: 0.5 }); }
        if (once(c, 'wr', 1.42)) { c.m.call(f, 'WORLD RECORD!', 'super'); lit(c, 0.55); }
        if (t >= 1.6) { const u = span(t, 1.6, 1.85); f.spin.rotation.z = 0; pose(c, 'bashDown'); o.pos.set(f.pos.x + D.x * 1.3 * u, U.lerp(2.4, 0.05, U.easeIn(u)), f.pos.z + D.z * 1.3 * u); o.spin.rotation.z = Math.PI / 2 * (1 - u); if (once(c, 'tk', 1.7)) tick(c); }
        if (t >= this.fin) { lit(c, 1); o.spin.rotation.z = 0; o.pos.y = 0.05; for (const [r, l] of [[6, 0.6], [3.5, 0.4]]) FX.ring(_v.copy(o.pos).setY(0.1), { r1: r, life: l, color: 0xffe066 }); FX.burst(_v.copy(o.pos).setY(0.1), { n: 40, color: c.m.arena.dust, speed: 8, size: 0.14, life: 0.9 }); SFX.play('wallbreak'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f;
        if (t < 1.4) return { id: 'up', pos: _v.copy(f.pos).addScaledVector(c.D, 3.2).addScaledVector(c.S, 1.4).setY(0.5).clone(), look: _v.copy(f.pos).setY(2.4).clone() };
        return { id: 'wide', pos: _v.copy(f.pos).addScaledVector(c.S, 6).setY(2).clone(), look: _v.copy(f.pos).addScaledVector(c.D, 0.8).setY(1.2).clone() };
      },
    },

    /* BOWLER: they're the pins: frame after frame, and one ball the size of a car */
    perfect: {
      ticks: 10, fin: 2.0,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D, s = c.s;
        if (!s.at) { s.at = c.O.clone().addScaledVector(D, -3.6); s.pins = []; for (const [a, b] of [[-0.5, 0.5], [0.5, 0.5], [0, 1]]) s.pins.push(prop(c, pins(), (p) => { p.obj.position.copy(c.O).addScaledVector(D, b).addScaledVector(c.S, a); p.obj.rotation.x = Math.sin(t * 20 + a) * (p.hit || 0); }, 2.0)); }
        moveTo(f.pos, s.at, 8, dt); face(f, o.pos); moveTo(o.pos, _v.set(c.O.x, 0, c.O.z), 8, dt);
        const k = beat(c, 'b', 9, 0.2, 1.2);
        if (k) {
          pose(c, 'bowl', 'strike'); const b = prop(c, ball(3, 0x3a1c6a), (p, dt2) => { const u = Math.min(1, p.t / 0.18); p.obj.position.copy(s.at).lerp(c.O, u).setY(0.22); p.obj.rotation.x += dt2 * 30; }, 0.2);
          M_tick(c, k); for (const pn of s.pins) pn.hit = 0.6;
        }
        if (t > 1.2 && t < 1.4) pose(c, 'bowl', 'wind');
        if (once(c, 'big', 1.4)) { pose(c, 'bowl', 'strike'); c.m.call(f, 'LAST FRAME!', 'super'); s.big = prop(c, ball(12, 0x3a1c6a, 0.08), (p, dt2) => { const u = Math.min(1, p.t / 0.55); p.obj.position.copy(s.at).lerp(c.O, u).setY(1.0); p.obj.rotation.x += dt2 * 8; }); SFX.play('whoosh'); }
        if (t >= this.fin) { if (s.big) drop(c, s.big); c.m.call(f, 'PERFECT GAME!', 'super'); FX.burst(chest(o), { n: 40, color: [0x6affe8, 0xffffff, 0xe8323a], glow: true, speed: 9, size: 0.1, life: 0.8 }); FX.ring(chest(o), { r1: 4.4, life: 0.5, normal: D.clone(), color: 0x6affe8 }); SFX.play('wallbreak'); return true; }
        return false;
      },
      cam(c, t) {
        const s = c.s, at = s.at || c.f.pos;
        if (t < 1.4) return { id: 'lane', pos: _v.copy(at).addScaledVector(c.D, -1.8).addScaledVector(c.S, 1.7).setY(1.8).clone(), look: c.O.clone().setY(0.8) };
        return { id: 'side', pos: P(c, -1.5, 5.4, 1.2), look: c.O.clone().addScaledVector(c.D, -1.5).setY(1) };
      },
    },

    /* ARCHER: up high, a sky full of arrows, a target on them, and one through the middle */
    bullseye: {
      ticks: 10, fin: 2.0,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D, s = c.s;
        moveTo(o.pos, _v.set(c.O.x, 0, c.O.z), 8, dt);
        if (t < 0.4) { f.pos.y = U.easeOut(span(t, 0, 0.35)) * 3.2; face(f, o.pos); pose(c, 'drawBow', 'wind'); if (once(c, 'u', 0.02)) SFX.play('jump'); return false; }
        if (t < 1.3) {
          face(f, o.pos); pose(c, 'drawBow', 'strike');
          const k = beat(c, 'a', 9, 0.42, 1.28);
          if (k) {
            const at = chest(o).add(new V3(U.vrnd(-0.4, 0.4), U.vrnd(-0.3, 0.3), U.vrnd(-0.4, 0.4))), from = chest(f).clone();
            prop(c, arrow(), (p) => { const u = Math.min(1, p.t / 0.12); p.obj.position.copy(from).lerp(at, u); p.obj.lookAt(at); }, 0.4);
            tick(c, chest(o));
          }
          return false;
        }
        if (once(c, 'land', 1.3)) { s.from = P(c, -4.2, 0, 0); f.pos.copy(s.from); f.yaw = Math.atan2(D.x, D.z); c.m.call(f, 'BULLSEYE...', 'super'); s.tgt = [1.2, 0.8, 0.4].map((r, i) => prop(c, Prop.glyph([0xffffff, 0xd8323a, 0xffe066][i], r), (p) => { p.obj.position.copy(chest(o)).addScaledVector(D, -0.5); p.obj.lookAt(_v.copy(p.obj.position).sub(D)); })); }
        pose(c, 'drawBow', 'strike'); f.pos.y = 0;
        if (t > 1.5 && U.vrand() < 0.7) FX.burst(f.fig.socket('wL', [0, 0, 10]), { n: 1, color: 0xfff07a, glow: true, speed: 0.4, size: 0.07, gravity: 0, life: 0.3 });
        if (t >= this.fin) { for (const p of s.tgt || []) drop(c, p); FX.spark(chest(o), { size: 2.4, life: 0.35 }); FX.ring(chest(o), { r1: 3.8, life: 0.45, normal: D.clone(), color: 0xfff07a }); c.m.call(f, 'BULLSEYE!', 'super'); SFX.play('crack'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f;
        if (t < 1.3) return { id: 'up', pos: P(c, 2.2, 2.6, 0.5), look: _v.copy(f.pos).setY(Math.max(1.5, f.pos.y + 1)).clone() };
        return { id: 'behind', pos: _v.copy(f.pos).addScaledVector(c.D, -2.2).addScaledVector(c.S, 0.9).setY(1.7).clone(), look: chest(c.o) };
      },
    },

    /* SKATEBOARDER: a kick up, an ollie after them, two and a half spins, and the board comes down */
    ninehundred: {
      ticks: 7, fin: 1.85, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D;
        if (t < 0.4) { o.pos.set(c.O.x, U.easeOut(span(t, 0, 0.38)) * 2.6, c.O.z); face(f, o.pos); pose(c, 'kickflip'); if (once(c, 'k', 0.02)) { tick(c); SFX.play('whoosh'); } return false; }
        if (t < 1.3) {
          const k = span(t, 0.4, 0.75); f.pos.set(U.lerp(f.pos.x, o.pos.x - D.x * 0.8, k), U.easeOut(k) * 3.0, U.lerp(f.pos.z, o.pos.z - D.z * 0.8, k));
          o.pos.y = 2.6 + Math.sin(t * 6) * 0.1;
          if (t > 0.75) { f.spin.rotation.y += dt * 31; pose(c, 'grind', 'strike'); } else pose(c, 'kickflip', 'strike');
          if (beat(c, 's', 5, 0.8, 1.25)) { tick(c); FX.burst(chest(o), { n: 5, color: [0xd8ff5a, 0xffffff], speed: 3, size: 0.07, life: 0.3 }); SFX.play('heavy'); }
          if (once(c, 'n', 0.78)) c.m.call(f, '900!', 'super');
          return false;
        }
        f.spin.rotation.y = 0; const u = span(t, 1.3, 1.62); pose(c, 'overhead', u < 0.3 ? 'wind' : 'strike');
        f.pos.y = (1 - U.easeIn(u)) * 3.0; o.pos.y = Math.max(0.05, (1 - U.easeIn(u)) * 2.6);
        f.trailR.push(f.fig.socket('wR', [0, 0, 1]), f.fig.socket('wR', [0, 0, 12]));
        if (once(c, 'tk', 1.5)) tick(c);
        if (t >= this.fin) { f.pos.y = 0; o.pos.y = 0.05; FX.ring(_v.copy(o.pos).setY(0.1), { r1: 5, life: 0.5, color: 0xd8ff5a }); FX.burst(_v.copy(o.pos).setY(0.2), { n: 40, color: [0xd8ff5a, 0xff5a1f, 0xffffff], glow: true, speed: 8, size: 0.1, life: 0.8 }); SFX.play('wallbreak'); c.m.call(f, 'NINE HUNDRED!', 'super'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f;
        if (t < 0.4) return { id: 'low', pos: P(c, -2.4, 2.4, 0.4), look: c.O.clone().setY(1.2) };
        if (t < 1.3) { const a = Math.atan2(c.S.x, c.S.z) + t * 1.5; return { id: 'orbit', pos: new V3(c.O.x + Math.sin(a) * 5.6, 3.2, c.O.z + Math.cos(a) * 5.6), look: c.O.clone().setY(2.8) }; }
        return { id: 'down', pos: P(c, -1.5, 4.6, 2.8), look: c.O.clone().setY(0.8) };
      },
    },
  });
  // a hit from a prop that's on its way (a ball, an arrow): the tick lands at their chest
  function M_tick(c, k) { tick(c, chest(c.o)); if (k % 3 === 0) c.m.call(c.f, 'STRIKE!', 'super'); }
})();
