/* ============================================================================
   edo_arts.js -- the EDO JAPAN Legend Arts (arts.js explains an Art: ticks,
   fin, slam, step(c, t, dt), cam(c, t)).
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3, _v = new V3();
  const { P, face, moveTo, span, beat, once, chest, tick, pose, prop, drop, lit, glowAt } = Arts.H, Prop = Arts.Prop;
  const leaves = (c, at, n) => FX.burst(at, { n: n || 4, color: [0xe8803a, 0xd8a040, 0xb8502a], speed: 1.4, size: 0.08, gravity: 1.2, life: 1.1 });
  const petals = (c, at, n) => FX.burst(at, { n: n || 5, color: [0xff9ad0, 0xffc8e8, 0xb06bff], glow: true, speed: 2.4, size: 0.07, gravity: 0.6, life: 0.9 });
  const ashigaru = col => Prop.vox(g => {
    g.box(-1, 0, -1, 1, 3, 1, 0x2a2a34); g.box(-1, 4, -1, 1, 7, 1, col); g.box(-1, 8, -1, 1, 9, 1, 0xe8c0a0);
    g.ell(0, 10, 0, 2.4, 0.6, 2.4, 0x1c1c22);                                                          // the jingasa hat
    g.box(0, 6, 2, 0, 6, 9, 0x5a3a20); g.set(0, 6, 10, 0x8a8e98);                                        // the matchlock, levelled
  }, 0.07);
  const banner = (a, b) => Prop.vox(g => { g.box(0, 0, 0, 0, 30, 0, 0x2a1a14); for (let y = 14; y <= 29; y++) g.box(1, y, 0, 6, y, 0, y > 26 ? b : a); g.box(1, 21, 0, 6, 22, 0, b); }, 0.07);

  Object.assign(Arts.ART, {
    /* RONIN: one cut, done before they see it; he stands past them with his back turned, the leaves fall, the cuts
       arrive late, and the scabbard clicks shut */
    lastdraw: {
      ticks: 7, fin: 1.75,
      step(c, t, dt) {
        const f = c.f, o = c.o;
        moveTo(o.pos, P(c, 0, 0, 0), 8, dt);
        if (once(c, 'draw', 0.02)) { f.pos.copy(P(c, 2.4, 0, 0)); f.yaw = Math.atan2(c.D.x, c.D.z); pose(c, 'iai'); tick(c); SFX.play('slash'); c.m.call(f, 'ISSEN', 'super'); FX.burst(chest(o), { n: 14, color: 0xffffff, speed: 3, size: 0.06, life: 0.3 }); }
        if (t > 0.1 && U.vrand() < 0.5) leaves(c, P(c, U.vrnd(-2, 3), U.vrnd(-2, 2), 2.6), 1);
        const k = beat(c, 'late', 5, 0.45, 1.15);
        if (k) { tick(c); SFX.play('slash'); const p = chest(o).add(new V3(U.vrnd(-0.4, 0.4), U.vrnd(-0.5, 0.5), U.vrnd(-0.4, 0.4))); FX.spark(p, { size: 1.3, life: 0.2 }); o.spin.rotation.z = (k % 2 ? 1 : -1) * 0.12; }
        if (t > 1.2) pose(c, 'sheathe', t < 1.5 ? 'wind' : 'strike');
        if (once(c, 'click', 1.62)) { SFX.play('snap'); tick(c); o.spin.rotation.z = 0; for (let i = 0; i < 8; i++) FX.spark(chest(o).add(new V3(U.vrnd(-0.6, 0.6), U.vrnd(-0.6, 0.6), U.vrnd(-0.6, 0.6))), { size: 1.2, life: 0.25 }); leaves(c, chest(o), 16); }
        return t >= this.fin;
      },
      cam(c, t) {
        if (t < 1.2) return { id: 'wide', pos: P(c, 1.2, 4.6, 1.1), look: P(c, 1.2, 0, 1.0) };
        return { id: 'back', pos: P(c, 4.6, 1.2, 1.4), look: P(c, 1.4, 0, 1.1) };
      },
    },

    /* KUNOICHI: she's everywhere at once in a storm of iris petals, a rain of hairpins from above, and the fan */
    petals: {
      ticks: 11, fin: 1.85,
      step(c, t, dt) {
        const f = c.f, o = c.o;
        moveTo(o.pos, P(c, 0, 0, 0.7), 8, dt);
        if (U.vrand() < 0.6) petals(c, P(c, U.vrnd(-2, 2), U.vrnd(-2, 2), U.vrnd(0.3, 2.4)), 2);
        if (t < 1.25) {
          const k = beat(c, 'cut', 8, 0.02, 1.2);
          if (k) {
            const a = k * 2.2 + 0.3; f.pos.set(o.pos.x + Math.sin(a) * 1.35, Math.max(0, o.pos.y - 0.7), o.pos.z + Math.cos(a) * 1.35); face(f, o.pos);
            pose(c, k % 2 ? 'slashA' : 'spin'); tick(c); SFX.play('slash'); petals(c, chest(o), 6);
          }
          if (once(c, 'call', 0.05)) c.m.call(f, 'THOUSAND PETALS', 'super');
          return false;
        }
        if (t < 1.6) {
          f.pos.lerp(P(c, -0.6, 0, 3.2), 0.25); face(f, o.pos); pose(c, 'kunaiToss');
          if (beat(c, 'pin', 3, 1.3, 1.55)) { tick(c); SFX.play('whoosh'); FX.burst(chest(o), { n: 4, color: [0xff6ab0, 0xd8dde6], glow: true, speed: 3, size: 0.05, life: 0.3 }); }
          return false;
        }
        f.pos.lerp(P(c, -0.9, 0, 0.6), 0.35); pose(c, 'overhead');
        if (t >= this.fin) { petals(c, chest(o), 40); FX.ring(chest(o), { r1: 3.5, life: 0.45, normal: c.D.clone(), color: 0xff9ad0 }); SFX.play('heavy'); return true; }
        return false;
      },
      cam(c, t) {
        if (t < 1.25) { const a = Math.atan2(c.S.x, c.S.z) - t * 1.3; return { id: 'orbit', pos: new V3(c.O.x + Math.sin(a) * 5, 2.2, c.O.z + Math.cos(a) * 5), look: chest(c.o) }; }
        return { id: 'low', pos: P(c, 1.5, 4.8, 0.7), look: P(c, 0, 0, 1.8) };
      },
    },

    /* SHOGUN: the war fan falls, three ranks of musketeers rise behind him and fire, rank after rank, and the tachi */
    ranks: {
      ticks: 8, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        moveTo(o.pos, P(c, 0, 0, 0), 8, dt);
        if (!s.men) {
          s.men = [];
          f.pos.copy(P(c, -2.2, 0, 0)); face(f, o.pos);
          for (let r = 0; r < 3; r++) for (const side of [-1.5, 0, 1.5]) {
            const at = P(c, -3.4 - r * 0.9, side + (r === 1 ? 0.75 : 0), 0), m = ashigaru(r === 1 ? 0x8a1c1c : 0x2a3a5a);
            m.position.copy(at); m.position.y = -1.2; m.lookAt(o.pos.x, 0, o.pos.z);
            s.men.push(prop(c, m, (p, d) => { p.obj.position.y = Math.min(0, p.obj.position.y + d * 5); }, 2.6));
          }
          c.m.call(f, 'THREE RANKS!', 'super');
        }
        pose(c, 'point', t < 0.4 ? 'wind' : 'strike');
        const k = beat(c, 'vol', 3, 0.5, 1.3);
        if (k) {
          SFX.play('shot'); FX.addShake(0.4); tick(c); tick(c);
          for (let i = (k - 1) * 3; i < k * 3; i++) { const m = s.men[i].obj; const mz = _v.set(0, 0.42, 0.72).applyQuaternion(m.quaternion).add(m.position).clone(); FX.spark(mz, { color: 0xffc860, size: 1 }); FX.burst(mz, { n: 6, color: [0xd8d0c0, 0xa8a090], speed: 1.2, size: 0.14, gravity: -1.2, life: 1.0 }); }
          FX.burst(chest(o), { n: 8, color: [0xffd27a, 0xffffff], glow: true, speed: 4, size: 0.06, life: 0.3 }); o.spin.rotation.x = -0.15;
        }
        if (t > 1.4) { o.spin.rotation.x = 0; f.pos.lerp(P(c, -1.1, 0, 0), 0.3); pose(c, 'twoHandDiag', t < 1.7 ? 'wind' : 'strike'); }
        if (once(c, 'cut', 1.75)) { tick(c); SFX.play('heavy'); f.trailR.push(f.fig.socket('wR', [0, 0, 4]), f.fig.socket('wR', [0, 0, 16])); }
        if (t >= this.fin) { FX.ring(chest(o), { r1: 3.5, life: 0.45, normal: c.D.clone(), color: 0xffcc44 }); return true; }
        return false;
      },
      cam(c, t) {
        if (t < 1.4) return { id: 'ranks', pos: P(c, -7, 2.6, 2.6), look: P(c, -1.5, 0, 1.0) };
        return { id: 'side', pos: P(c, -0.6, 4.6, 1.3), look: P(c, -0.6, 0, 1.1) };
      },
    },

    /* DAIMYO: her clan's banners rise in a ring, the naginata wheels round and round inside it, and the crescent */
    banners: {
      ticks: 9, fin: 1.9,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s, L = KB.LINES.daimyo.pal;
        moveTo(o.pos, P(c, 0, 0, 0.5), 8, dt);
        if (!s.flags) {
          s.flags = [];
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2, b = banner(L.main, L.second);
            b.position.set(c.O.x + Math.sin(a) * 3.3, -2.2, c.O.z + Math.cos(a) * 3.3); b.rotation.y = a + Math.PI / 2;
            s.flags.push(prop(c, b, (p, d) => { p.obj.position.y = Math.min(0, p.obj.position.y + d * 6); }, 2.6));
          }
          c.m.call(f, 'HUNDRED BANNERS', 'super');
        }
        if (t < 1.35) {
          const k = beat(c, 'wh', 8, 0.25, 1.3);
          if (k) {
            const a = k * 1.6; f.pos.set(o.pos.x + Math.sin(a) * 1.7, 0, o.pos.z + Math.cos(a) * 1.7); face(f, o.pos);
            pose(c, k % 2 ? 'slashA' : 'slashB'); tick(c); SFX.play('slash'); f.trailR.push(f.fig.socket('wR', [0, 0, 14]), f.fig.socket('wR', [0, 0, 22]));
          }
          return false;
        }
        f.pos.lerp(P(c, -1.6, 0, 0), 0.3); face(f, o.pos); pose(c, 'upslash', t < 1.6 ? 'wind' : 'strike');
        if (t > 1.6) o.pos.y = U.lerp(0.5, 2.0, span(t, 1.6, 1.85));
        if (t >= this.fin) { tick(c); FX.ring(chest(o), { r1: 4, life: 0.5, normal: new V3(0, 1, 0), color: 0x66b8ff }); SFX.play('heavy'); return true; }
        return false;
      },
      cam(c, t) { const a = Math.atan2(c.S.x, c.S.z) + t * 0.9; return { id: 'orbit', pos: new V3(c.O.x + Math.sin(a) * 6.2, 2.8, c.O.z + Math.cos(a) * 6.2), look: chest(c.o) }; },
    },
  });
})();
