/* ============================================================================
   arts.js -- a Legend Art once it has caught someone: a short scripted
   cinematic. While it plays the fight holds still (the clock, the CPUs, the
   other figure), black bars slide in, the camera follows the Art's own shot
   list, and the last blow lands with a freeze, a flash and the Art's name.

   ART[seq] = { ticks, fin, step(c, t, dt), cam(c, t) -> { id, pos, look } }
     ticks: how many small hits it deals before the finisher (they share 48%
            of the damage; the finisher is the other 52%)
     fin:   the time the finisher lands
     slam:  the last hit drives them DOWN into the floor (a raw Art ground-bounces them); without it, the last hit knocks
            them back (a raw Art wall-bounces them)
   c (the cinematic) = { f attacker, o victim, m match, mv, D forward, S side
                         (toward the camera), O where it caught, t, props[] }
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
  const _v = new V3();
  const G = c => VX.glow(c);

  /* ------------------------------------------------------------- props */
  const addMat = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 0.6 : op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const Prop = {
    /* a column of light standing on the floor */
    beam(color, r, h) { const g = new THREE.CylinderGeometry(r, r, h, 20, 1, true); g.translate(0, h / 2, 0); const m = new THREE.Mesh(g, addMat(color, 0.45)); m.renderOrder = 12; return m; },
    /* a spotlight cone hanging from its apex */
    cone(color, r, h) { const g = new THREE.ConeGeometry(r, h, 28, 1, true); g.translate(0, -h / 2, 0); const m = new THREE.Mesh(g, addMat(color, 0.13)); m.renderOrder = 12; return m; },
    /* a summoning circle flat on the floor */
    glyph(color, r) {
      const w = new THREE.Group(), g = new THREE.Group(), mat = addMat(color, 0.8); g.rotation.x = -Math.PI / 2; w.add(g);
      for (const [a, b] of [[0.88, 1], [0.6, 0.66]]) g.add(new THREE.Mesh(new THREE.RingGeometry(r * a, r * b, 48), mat));
      for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.72, r * 0.05), mat); m.rotation.z = i * Math.PI / 3 + Math.PI / 6; g.add(m); }
      w.position.y = 0.04; return w;
    },
    vox(build, scale) { const g = new VX.Grid(); g.jit = 0.03; build(g); return VX.object(g, scale); },
    /* a spirit dragon's head, all glow */
    dragon(col) {
      return Prop.vox(g => {
        const c = G(col), d = G(Models.shade(col, 0.7)), e = G(0xffffff);
        g.box(-3, 0, -4, 3, 4, 3, c); g.box(-2, 1, 4, 2, 3, 10, c); g.box(-2, -2, 2, 2, -1, 9, d);
        g.setM(2, 3, 3, e); g.setM(1, 3, 10, d);
        for (let z = 4; z <= 9; z += 2) { g.setM(2, 0, z, e); g.setM(2, -1, z + 1, e); }
        g.line(2, 4, -2, 4, 8, -9, d, 0.6); g.line(-2, 4, -2, -4, 8, -9, d, 0.6);
        for (let i = 0; i < 4; i++) { g.line(3, 2 - i, -4, 6, 1 - i * 2, -8, c); g.line(-3, 2 - i, -4, -6, 1 - i * 2, -8, c); }
      }, 0.13);
    },
    /* wings of light (a fan of feathers each side) */
    wings(col) {
      return Prop.vox(g => {
        for (const s of [1, -1]) for (let i = 0; i < 7; i++) {
          const a = -0.35 + i * 0.24, len = 15 - Math.abs(i - 3) * 1.4;
          g.line(s * 3, 6, -2, s * (3 + Math.cos(a) * len), 6 + Math.sin(a) * len, -4 - i * 0.3, i % 2 ? G(col) : G(0xffffff), 0.55);
        }
      }, 0.1);
    },
    /* a jagged lightning bolt from the sky */
    bolt(col) {
      return Prop.vox(g => {
        let x = 0, z = 0;
        for (let y = 90; y > 0; y -= 6) { const nx = x + Math.floor(U.vrnd(-4, 5)), nz = z + Math.floor(U.vrnd(-4, 5)); g.line(x, y, z, nx, y - 6, nz, G(col), 0.6); x = nx; z = nz; }
      }, 0.08);
    },
    ball(r) { return Prop.vox(g => { g.ell(0, 0, 0, r, r, r, 0x1a1a20); g.set(0, r + 1, 0, 0x8a5a2b); g.set(0, r + 2, 0, G(0xffa020)); }, 0.09); },
    /* a see-through copy of a figure (shadow clones) */
    ghost(build, color) {
      const F = Models.figure(build);
      F.root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; if (o.material.color) o.material.color.setHex(color); o.castShadow = false; } });
      return F;
    },
    /* a giant spirit imp */
    giant(line, r) {
      const o = Models.imp(line, r || 0), col = KB.LINES[line].pal.glow;
      o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.82; if (m.material.emissive) m.material.emissive.setHex(col).multiplyScalar(0.35); } });
      return o;
    },
  };

  /* -------------------------------------------------------------- helpers */
  const P = (c, f, s, u, base) => { const b = base || c.O; return new V3(b.x + c.D.x * f + c.S.x * s, b.y + u, b.z + c.D.z * f + c.S.z * s); };
  const face = (fig, p) => { fig.yaw = Math.atan2(p.x - fig.pos.x, p.z - fig.pos.z); };
  const moveTo = (pos, p, k, dt) => { pos.x = U.smooth(pos.x, p.x, k, dt); pos.y = U.smooth(pos.y, p.y, k, dt); pos.z = U.smooth(pos.z, p.z, k, dt); };
  const span = (t, a, b) => U.clamp((t - a) / (b - a), 0, 1);
  /* the k-th of n evenly spaced beats between t0 and t1, once each (0 when nothing new) */
  function beat(c, key, n, t0, t1, ease) {
    if (c.t < t0) return 0;
    let k = U.clamp((c.t - t0) / (t1 - t0), 0, 1); if (ease) k = ease(k);
    const i = Math.min(n, Math.floor(k * n) + 1);
    if (i > (c.beats[key] || 0)) { c.beats[key] = i; return i; }
    return 0;
  }
  const once = (c, key, when) => c.t >= when && !c.flags[key] && (c.flags[key] = true);
  const chest = o => _v.copy(o.pos).setY(o.pos.y + 1).clone();
  const tick = (c, pos) => Combat.seqTick(c.f, c.o, c.mv.dmg * 0.48 / c.art.ticks, pos || null);
  const pose = (c, name, ph) => { c.f.pose2 = name; c.f.pose2ph = ph || 'strike'; };
  function prop(c, obj, upd, life) { c.m.scene.add(obj.root || obj); const p = { obj, upd, t: 0, life: life || 99 }; c.props.push(p); return p; }
  function drop(c, p) { const i = c.props.indexOf(p); if (i >= 0) c.props.splice(i, 1); const o = p.obj; if (o.dispose) o.dispose(); else if (o.parent) o.parent.remove(o); }
  const fade = (obj, a) => obj.traverse(m => { if (m.isMesh && m.material) { m.material.transparent = true; m.material.opacity = a; } });
  const lit = (c, k) => { c.lightTo = k; };
  const glowAt = (c, pos, col, n) => FX.burst(pos, { n: n || 10, color: [col, 0xffffff], glow: true, speed: 3, size: 0.07, gravity: -2, life: 0.5 });

  /* ------------------------------------------------------------ the Arts */
  const ART = {
    /* SAMURAI: ten blinks around them, a turn of the back, the blade slides home, every cut lands at once */
    cuts: {
      ticks: 10, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o;
        moveTo(o.pos, P(c, 0, 0, 0.9), 8, dt); o.spin.rotation.z = Math.sin(t * 9) * 0.06;
        const k = beat(c, 'cut', 10, 0.02, 1.0);
        if (k) {
          FX.burst(chest(f), { n: 6, color: [0xffffff, 0xd0d8e8], speed: 1, size: 0.1, gravity: 0, life: 0.3 });
          const a = k * 2.35 + 0.4; f.pos.set(o.pos.x + Math.sin(a) * 1.45, Math.max(0, o.pos.y - 0.8), o.pos.z + Math.cos(a) * 1.45); face(f, o.pos);
          pose(c, k % 2 ? 'slashA' : 'slashB'); f.trailR.push(f.fig.socket('wR', [0, 0, 3]), f.fig.socket('wR', [0, 0, 14]));
          tick(c); SFX.play('slash');
        }
        if (once(c, 'turn', 1.04)) { f.pos.copy(P(c, 2.3, 0, 0)); f.yaw = Math.atan2(c.D.x, c.D.z); pose(c, 'iai'); SFX.play('whoosh'); FX.burst(chest(f), { n: 10, color: 0xffffff, speed: 2, size: 0.08, life: 0.3 }); }
        if (t > 1.3) pose(c, 'sheathe', t < 1.55 ? 'wind' : 'strike');
        if (once(c, 'glint', 1.4)) FX.spark(f.fig.socket('wR', [0, 0, 12]), { size: 1.6, life: 0.3 });
        if (once(c, 'click', 1.92)) { SFX.play('snap'); for (let i = 0; i < 10; i++) FX.spark(chest(o).add(new V3(U.vrnd(-0.6, 0.6), U.vrnd(-0.6, 0.6), U.vrnd(-0.6, 0.6))), { size: 1.2, life: 0.25 }); }
        return t >= this.fin;
      },
      cam(c, t) {
        if (t < 1.04) { const a = Math.atan2(c.S.x, c.S.z) + t * 1.1; return { id: 'orbit', pos: new V3(c.O.x + Math.sin(a) * 4.8, c.O.y + 2.0, c.O.z + Math.cos(a) * 4.8), look: chest(c.o) }; }
        return { id: 'close', pos: P(c, 5.8, 1.3, 1.05), look: P(c, 1.2, 0, 1.0) };
      },
    },

    /* KNIGHT: the charge carries them into a wall, then a column of light comes down on them */
    charge: {
      ticks: 8, fin: 1.75,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D, s = c.s;
        if (s.imp == null) {
          const sp = 13; f.pos.x += D.x * sp * dt; f.pos.z += D.z * sp * dt; f.yaw = Math.atan2(D.x, D.z); pose(c, 'lance');
          o.pos.set(f.pos.x + D.x * 1.3, 0.5, f.pos.z + D.z * 1.3);
          if (beat(c, 'run', 5, 0.05, 0.85)) tick(c);
          if (U.vrand() < 0.5) FX.burst(_v.copy(f.pos).setY(0.1), { n: 2, color: c.m.arena.dust, speed: 2, size: 0.08, life: 0.4 });
          const wall = c.m.arena.walls.some(w => !w.broken && w.sign * o.pos[w.axis] > w.lim - 0.9);
          if (wall || t > 0.9) { s.imp = t; s.pin = o.pos.clone(); FX.addShake(0.8); SFX.play('knock', { n: 3 }); FX.ring(chest(o), { r1: 2.2, normal: D.clone().negate(), color: 0xfff1c0 }); c.O = s.pin.clone().setY(0); }
          return false;
        }
        const u = t - s.imp;
        moveTo(o.pos, s.pin.clone().setY(U.lerp(0.5, 1.6, span(u, 0.1, 0.6))), 6, dt);
        moveTo(f.pos, s.pin.clone().addScaledVector(D, -2.2).setY(0), 7, dt); face(f, o.pos); pose(c, 'salute');
        if (once(c, 'beam', s.imp + 0.1)) { s.beam = prop(c, Prop.beam(0xfff0a0, 0.1, 14), (p, dt2) => { p.obj.position.copy(s.pin).setY(0); const k = Math.min(1, p.t / 0.3); p.obj.scale.set(1 + k * 7, 1, 1 + k * 7); p.obj.rotation.y += dt2 * 2; }); SFX.play('jguard'); }
        if (beat(c, 'holy', 3, s.imp + 0.25, s.imp + 0.7)) { tick(c); glowAt(c, chest(o), 0xfff0a0, 14); }
        if (t >= s.imp + 0.82) { if (s.beam) drop(c, s.beam); FX.ring(chest(o), { r1: 4, life: 0.5, color: 0xfff0a0 }); FX.burst(chest(o), { n: 40, color: [0xfff0a0, 0xffffff], glow: true, speed: 9, size: 0.09, life: 0.7 }); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f, o = c.o;
        if (c.s.imp == null) return { id: 'track', pos: _v.copy(f.pos).addScaledVector(c.S, 4.4).addScaledVector(c.D, -0.6).setY(1.3).clone(), look: _v.copy(f.pos).addScaledVector(c.D, 1.0).setY(1).clone() };
        return { id: 'low', pos: P(c, -3.8, 1.6, 0.35, c.s.pin.clone().setY(0)), look: c.s.pin.clone().setY(2.2) };
      },
    },

    /* PIRATE: "FIRE!" and the sky rains cannonballs, then one the size of a barrel */
    cannon: {
      ticks: 7, fin: 2.0, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        s.vy = (s.vy || 0) - 18 * dt; o.pos.y = Math.max(0.2, o.pos.y + s.vy * dt); if (o.pos.y <= 0.2) s.vy = Math.max(0, s.vy);
        moveTo(o.pos, _v.set(c.O.x, o.pos.y, c.O.z), 8, dt);
        face(f, o.pos); pose(c, t < 0.5 ? 'salute' : 'cutA');
        if (once(c, 'fire', 0.16)) { c.m.call(f, 'FIRE!', 'super'); SFX.play('shot'); }
        const k = beat(c, 'ball', 7, 0.45, 1.45);
        if (k) c.m.cannonball(new V3(o.pos.x + U.rnd(-0.5, 0.5), 0.8, o.pos.z + U.rnd(-0.5, 0.5)), () => { tick(c); s.vy = 5.5; o.spin.rotation.x -= 0.6; });
        if (once(c, 'big', 1.5)) {
          s.ball = prop(c, Prop.ball(5), (p) => { const k2 = span(p.t, 0, 0.5); p.obj.position.set(o.pos.x, U.lerp(14, o.pos.y + 1, U.easeIn(k2)), o.pos.z); p.obj.rotation.x += 0.1; });
          SFX.play('whoosh');
        }
        if (t >= this.fin) {
          if (s.ball) drop(c, s.ball); SFX.play('boom'); SFX.play('wallbreak');
          FX.burst(chest(o), { n: 50, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 10, size: 0.14, life: 0.8 });
          FX.ring(_v.copy(o.pos).setY(0.1), { r1: 5, life: 0.6, color: 0xffa040 }); return true;
        }
        return false;
      },
      cam(c, t) {
        const f = c.f;
        if (t < 0.45) return { id: 'hero', pos: _v.copy(f.pos).addScaledVector(c.D, -2.4).addScaledVector(c.S, 0.9).setY(1.0).clone(), look: _v.copy(f.pos).addScaledVector(c.D, 3).setY(1.5).clone() };
        if (t < 1.5) return { id: 'wide', pos: P(c, -3, 6, 6), look: c.O.clone().setY(1) };
        return { id: 'up', pos: P(c, -2.6, 2.2, 0.5), look: c.O.clone().setY(3.5) };
      },
    },

    /* MONK: an ever-faster flurry, a breath, and the palm */
    hundred: {
      ticks: 18, fin: 1.6,
      step(c, t, dt) {
        const f = c.f, o = c.o, D = c.D;
        o.pos.set(f.pos.x + D.x * 1.05, Math.max(0, o.pos.y * 0.9), f.pos.z + D.z * 1.05); face(f, o.pos);
        const k = beat(c, 'jab', 18, 0.02, 1.2, x => Math.pow(x, 0.7));
        if (k) {
          pose(c, k % 2 ? 'jabL' : 'jabR'); f.poseT = 0;
          const p = chest(o).addScaledVector(D, -0.3).add(new V3(U.rnd(-0.35, 0.35), U.rnd(-0.4, 0.4), U.rnd(-0.35, 0.35)));
          tick(c, p); FX.burst(p, { n: 3, color: KB.LINES[f.build.armR.line].pal.skin || 0xffd0a0, speed: 1, size: 0.12, gravity: 0, life: 0.15 });
        }
        if (t > 1.22) {
          pose(c, 'dragonPalm', 'wind');
          if (U.vrand() < 0.7) { const h = f.fig.socket('armR', [0, -9, 0]); FX.burst(h.add(new V3(U.vrnd(-0.6, 0.6), U.vrnd(-0.6, 0.6), U.vrnd(-0.6, 0.6))), { n: 1, color: KB.LINES.monk.pal.glow, glow: true, speed: 0.4, size: 0.06, gravity: 0, life: 0.25 }); }
        }
        if (t >= this.fin) { pose(c, 'dragonPalm'); FX.ring(chest(o), { r1: 3.4, life: 0.4, normal: D.clone(), color: 0x9ff7ff }); FX.ring(chest(o), { r1: 2.2, life: 0.3, normal: D.clone(), color: 0xffffff }); SFX.play('heavy'); return true; }
        return false;
      },
      cam(c, t) {
        const f = c.f, o = c.o, mid = _v.addVectors(f.pos, o.pos).multiplyScalar(0.5).clone();
        if (t < 0.6) return { id: 'shoulder', pos: _v.copy(f.pos).addScaledVector(c.D, -1.9).addScaledVector(c.S, 1.0).setY(1.7).clone(), look: chest(o) };
        if (t < 1.22) return { id: 'front', pos: _v.copy(o.pos).addScaledVector(c.D, 2.3).addScaledVector(c.S, 1.5).setY(1.25).clone(), look: _v.copy(f.pos).setY(1.1).clone() };
        return { id: 'side', pos: mid.clone().addScaledVector(c.S, 3.4).setY(1.1), look: mid.setY(1) };
      },
    },

    /* VIKING: the sky goes red, lightning, the leap, and the world-ending slam */
    quake: {
      ticks: 7, fin: 1.62, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (beat(c, 'q', 2, 0.0, 0.2)) { FX.ring(_v.copy(f.pos).setY(0.1), { r1: 5, life: 0.5, color: 0xffd080 }); FX.addShake(0.6); tick(c); }
        if (t < 0.9) { moveTo(o.pos, P(c, 0, 0, 5.2), 3.2, dt); o.spin.rotation.x -= dt * 2; }
        if (once(c, 'sky', 0.25)) { lit(c, 0.35); c.tint = ['linear-gradient(180deg, rgba(150,0,0,.55), rgba(60,0,0,.15) 60%, transparent)', 1]; SFX.play('boom'); }
        if (t > 0.25 && t < 0.9) { pose(c, 'roar'); face(f, o.pos); }
        if (beat(c, 'bolt', 4, 0.32, 0.85)) {
          const at = P(c, U.rnd(-3, 3), U.rnd(-3, 3), 0); const b = Prop.bolt(0xcfe8ff); b.position.copy(at); prop(c, b, null, 0.14);
          FX.ring(at.setY(0.1), { r1: 1.5, life: 0.3, color: 0xcfe8ff }); FX.addShake(0.35); SFX.play('crack'); tick(c);
        }
        if (t >= 0.9 && t < 1.28) { const k = span(t, 0.9, 1.25); f.pos.set(U.lerp(f.pos.x, o.pos.x - c.D.x * 0.9, k), U.lerp(0, o.pos.y + 0.7, U.easeOut(k)), U.lerp(f.pos.z, o.pos.z - c.D.z * 0.9, k)); face(f, o.pos); pose(c, 'slam', 'wind'); }
        if (once(c, 'roar2', 0.92)) SFX.play('superStart');
        if (t >= 1.28) {
          const k = span(t, 1.28, 1.55); pose(c, 'slam');
          o.pos.y = U.lerp(o.pos.y, 0.05, U.easeIn(k)); f.pos.y = Math.max(0, o.pos.y - 0.3);
          f.trailR.push(f.fig.socket('wR', [0, 0, 3]), f.fig.socket('wR', [0, 0, 11]));
          if (once(c, 'tk', 1.4)) tick(c);
        }
        if (t >= this.fin) {
          lit(c, 1); c.tint = null; o.pos.y = 0; f.pos.y = 0;
          for (const [r, l] of [[7, 0.6], [4.5, 0.45], [2.5, 0.3]]) FX.ring(_v.copy(o.pos).setY(0.1), { r1: r, life: l, color: 0xffb060 });
          FX.burst(_v.copy(o.pos).setY(0.1), { n: 50, color: c.m.arena.dust, speed: 9, size: 0.16, life: 1.0 });
          FX.burst(_v.copy(o.pos).setY(0.3), { n: 20, color: [0xffd080, 0xff8040], glow: true, speed: 7, size: 0.09, life: 0.6 });
          SFX.play('wallbreak'); return true;
        }
        return false;
      },
      cam(c, t) {
        const f = c.f, o = c.o;
        if (t < 0.3) return { id: 'wide', pos: _v.copy(f.pos).addScaledVector(c.S, 5.5).setY(1.2).clone(), look: _v.addVectors(f.pos, o.pos).multiplyScalar(0.5).setY(1.2).clone() };
        if (t < 0.9) return { id: 'up', pos: _v.copy(f.pos).addScaledVector(c.D, -2.6).addScaledVector(c.S, 1.6).setY(0.6).clone(), look: chest(f).lerp(chest(o), 0.55) };
        return { id: 'fall', pos: P(c, -1, 6.5, 3.6), look: _v.addVectors(f.pos, o.pos).multiplyScalar(0.5).setY(Math.max(1, (f.pos.y + o.pos.y) / 2)).clone() };
      },
    },

    /* NINJA: clones cut through them, ring them, and strike all at once */
    clones: {
      ticks: 9, fin: 1.7,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        moveTo(o.pos, P(c, 0, 0, 0.6), 8, dt);
        const k = beat(c, 'dash', 4, 0.02, 0.9);
        if (k) { c.m.clone(f, o, k); tick(c); f.obj.visible = false; }
        if (once(c, 'ring', 1.0)) {
          f.obj.visible = true; s.g = [];
          for (let i = 0; i < 4; i++) s.g.push(prop(c, Prop.ghost(f.build, 0x6a4a9a), null));
          FX.burst(chest(o), { n: 20, color: 0x30243f, speed: 3, size: 0.12, gravity: -1, life: 0.5 }); SFX.play('dodge');
        }
        if (t >= 1.0 && t < 1.5) {
          const a0 = (t - 1.0) * 2.4;
          const put = (fig, i, yawSet) => { const a = a0 + i * Math.PI * 2 / 5, r = 2.3; const p = new V3(o.pos.x + Math.sin(a) * r, 0, o.pos.z + Math.cos(a) * r); return p; };
          f.pos.copy(put(f, 0)); face(f, o.pos); pose(c, 'vanish', 'wind');
          s.g.forEach((g, i) => { const p = put(g.obj, i + 1); g.obj.root.position.copy(p); g.obj.root.rotation.y = Math.atan2(o.pos.x - p.x, o.pos.z - p.z); Anim.set(g.obj, Anim.blend(f.ready, Anim.P.vanish.wind, 1, f.ready)); });
          if (beat(c, 'tk', 3, 1.05, 1.45)) tick(c);
        }
        if (t >= 1.5) {
          const k2 = span(t, 1.5, 1.62);
          const step = (pos, i) => { const a = (0.5 * 2.4) + i * Math.PI * 2 / 5; return new V3(o.pos.x + Math.sin(a) * 2.3 * (1 - 1.6 * k2), 0, o.pos.z + Math.cos(a) * 2.3 * (1 - 1.6 * k2)); };
          f.pos.copy(step(f.pos, 0)); pose(c, 'shadowSlash');
          if (s.g) s.g.forEach((g, i) => { g.obj.root.position.copy(step(null, i + 1)); Anim.set(g.obj, Anim.blend(f.ready, Anim.P.backstab.strike, 1, f.ready)); });
        }
        if (t >= this.fin) {
          if (s.g) s.g.forEach(g => { FX.burst(_v.copy(g.obj.root.position).setY(0.9), { n: 12, color: 0x30243f, speed: 3, size: 0.12, gravity: -1, life: 0.5 }); drop(c, g); });
          for (let i = 0; i < 5; i++) FX.spark(chest(o).add(new V3(U.vrnd(-0.5, 0.5), U.vrnd(-0.5, 0.5), U.vrnd(-0.5, 0.5))), { size: 1.4, color: 0xd9b8ff, life: 0.25 });
          f.pos.copy(P(c, 1.4, 0, 0)); f.yaw = Math.atan2(c.D.x, c.D.z); return true;
        }
        return false;
      },
      cam(c, t) {
        if (t < 1.0) { const a = Math.atan2(c.S.x, c.S.z) - t * 1.3; return { id: 'orbit', pos: new V3(c.O.x + Math.sin(a) * 5, 1.8, c.O.z + Math.cos(a) * 5), look: chest(c.o) }; }
        if (t < 1.5) { const a = (t - 1) * 1.5; return { id: 'top', pos: new V3(c.O.x + Math.sin(a) * 1.2, 8, c.O.z + Math.cos(a) * 1.2), look: c.O.clone() }; }
        return { id: 'low', pos: P(c, -1.5, 3.4, 0.4), look: chest(c.o) };
      },
    },

    /* SUMMONER: chains of light, her imps pile on, and a giant imp rises behind her and belly-flops them */
    golem: {
      ticks: 8, fin: 2.2, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s, line = f.build.card.line === 'summoner' ? 'summoner' : f.build.head.line === 'summoner' ? 'summoner' : 'summoner';
        const col = KB.LINES.summoner.pal.glow;
        moveTo(o.pos, P(c, 0, 0, 1.0), 6, dt); o.spin.rotation.z = Math.sin(t * 14) * 0.05;
        if (once(c, 'chains', 0.02)) {
          s.chains = [];
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + 0.6, base = new V3(c.O.x + Math.sin(a) * 1.8, 0, c.O.z + Math.cos(a) * 1.8);
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1), addMat(col, 0.6));
            s.chains.push(prop(c, m, p => { const tgt = chest(o); const d = _v.subVectors(tgt, base); p.obj.position.copy(base).addScaledVector(d, 0.5); p.obj.scale.z = d.length(); p.obj.lookAt(tgt); }));
          }
          prop(c, Prop.glyph(col, 1.9), (p, dt2) => { p.obj.position.set(c.O.x, 0.04, c.O.z); p.obj.rotation.y += dt2 * 1.5; });
          SFX.play('jguard');
        }
        face(f, o.pos); pose(c, 'summon', t < 0.5 ? 'wind' : 'strike');
        // her imps join in
        if (beat(c, 'imp', 4, 0.1, 0.6)) { tick(c); c.m.minionsPounce(f, o); }
        if (once(c, 'circle', 0.5)) {
          s.home = P(c, -2.6, 0, 0, f.pos.clone().setY(0));
          s.circle = prop(c, Prop.glyph(col, 2.6), (p, dt2) => { p.obj.position.copy(s.home).setY(0.05); p.obj.rotation.y -= dt2 * 2; });
          SFX.play('superStart');
        }
        if (once(c, 'rise', 0.62)) {
          s.giant = prop(c, Prop.giant(line, f.build.card.r), p => {
            const g = p.obj; g.scale.setScalar(4.7);
            if (c.t < 1.45) { const k = span(c.t, 0.62, 1.35); g.position.set(s.home.x, U.lerp(-3.4, 0, U.easeOut(k)), s.home.z); g.rotation.y = Math.atan2(c.D.x, c.D.z); }
            else { const k = span(c.t, 1.5, 2.2); const from = s.home, to = o.pos; g.position.set(U.lerp(from.x, to.x, k), Math.max(o.pos.y - 0.4, Math.sin(k * Math.PI) * 4.5 + U.lerp(0, o.pos.y - 0.4, k)), U.lerp(from.z, to.z, k)); g.rotation.x = k * 0.9; }
          });
          FX.burst(s.home.clone().setY(0.3), { n: 30, color: [col, 0xffffff], glow: true, speed: 4, gravity: -3, size: 0.09, life: 0.9 }); FX.addShake(0.5); SFX.play('boom');
        }
        if (once(c, 'leap', 1.5)) SFX.play('jump');
        if (beat(c, 'hum', 3, 0.7, 1.4)) tick(c);
        if (t >= this.fin) {
          if (s.chains) s.chains.forEach(p => drop(c, p)); if (s.giant) { const g = s.giant; g.upd = (p) => { fade(p.obj, Math.max(0, 0.8 - p.t * 2)); }; g.life = g.t + 0.5; }
          FX.burst(chest(o), { n: 45, color: [col, 0xffffff, KB.LINES.summoner.pal.second], glow: true, speed: 9, size: 0.12, life: 0.8 });
          FX.ring(_v.copy(o.pos).setY(0.1), { r1: 5, life: 0.5, color: col }); SFX.play('wallbreak'); return true;
        }
        return false;
      },
      cam(c, t) {
        const f = c.f, o = c.o;
        if (t < 0.62) return { id: 'chained', pos: P(c, -2.8, 1.2, 1.4), look: chest(o) };
        if (t < 1.45) return { id: 'rise', pos: _v.copy(o.pos).addScaledVector(c.D, 2.6).addScaledVector(c.S, 2.8).setY(0.9).clone(), look: (c.s.home || f.pos).clone().setY(2.2) };
        const mid = _v.addVectors(o.pos, c.s.home || f.pos).multiplyScalar(0.5).clone();
        return { id: 'flop', pos: mid.clone().addScaledVector(c.S, 8.5).setY(3.2), look: mid.setY(1.6) };
      },
    },

    /* PALADIN: a beam lifts them, wings of light unfold, and the hammer comes down like the dawn */
    dawn: {
      ticks: 6, fin: 1.78, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s, col = 0xfff07a;
        if (once(c, 'beam', 0.02)) { s.beam = prop(c, Prop.beam(col, 0.1, 16), (p, dt2) => { const k = Math.min(1, p.t / 0.25); p.obj.position.set(c.O.x, 0, c.O.z); p.obj.scale.set(1 + k * 8, 1, 1 + k * 8); p.obj.rotation.y += dt2; }); SFX.play('jguard'); lit(c, 0.6); }
        if (t < 1.25) { moveTo(o.pos, P(c, 0, 0, 2.7), 3, dt); o.spin.rotation.x = Math.sin(t * 3) * 0.2; }
        if (beat(c, 'lift', 3, 0.1, 0.6)) { tick(c); glowAt(c, chest(o), col, 10); }
        face(f, o.pos);
        if (t < 0.6) pose(c, 'salute');
        if (once(c, 'wings', 0.5)) {
          s.wings = prop(c, Prop.wings(col), p => { const k = U.easeOut(Math.min(1, p.t / 0.4)); p.obj.scale.setScalar(k); p.obj.position.copy(f.pos).setY(f.pos.y + 0.5); p.obj.rotation.y = f.yaw; });
          SFX.play('superStart'); FX.burst(chest(f), { n: 30, color: [col, 0xffffff], glow: true, speed: 4, size: 0.08, gravity: -2, life: 0.8 });
        }
        if (t >= 0.6 && t < 1.25) { moveTo(f.pos, P(c, -2.4, 0, 2.0), 3, dt); pose(c, 'overhead', 'wind'); if (U.vrand() < 0.6) glowAt(c, f.fig.socket('wR', [0, 0, 11]), col, 2); }
        if (t >= 1.25 && t < 1.5) { moveTo(f.pos, _v.copy(o.pos).addScaledVector(c.D, -0.9).setY(o.pos.y + 0.6), 14, dt); pose(c, 'overhead', 'wind'); }
        if (t >= 1.5) {
          const k = span(t, 1.5, 1.72); pose(c, 'overhead'); o.pos.y = U.lerp(o.pos.y, 0.05, U.easeIn(k)); f.pos.y = Math.max(0, o.pos.y - 0.1);
          f.trailR.push(f.fig.socket('wR', [0, 0, 3]), f.fig.socket('wR', [0, 0, 13]));
          if (once(c, 'tk', 1.55)) tick(c);
        }
        if (t >= this.fin) {
          lit(c, 1); if (s.beam) drop(c, s.beam); if (s.wings) { s.wings.upd = (p) => { fade(p.obj, Math.max(0, 1 - p.t * 2.5)); }; s.wings.life = s.wings.t + 0.4; }
          o.pos.y = 0; f.pos.y = 0;
          for (const n of [new V3(1, 0, 0), new V3(0, 0, 1), null]) FX.ring(_v.copy(o.pos).setY(n ? 1 : 0.1), { r1: 5, life: 0.55, normal: n, color: col });
          FX.burst(chest(o), { n: 50, color: [col, 0xffffff], glow: true, speed: 10, size: 0.1, life: 0.8 });
          const heal = Math.round(f.maxHp * 0.08 * f.st.healMult); f.hp = Math.min(f.maxHp, f.hp + heal); c.m.call(f, '+' + heal + ' HP', 'heal');
          SFX.play('wallbreak'); return true;
        }
        return false;
      },
      cam(c, t) {
        const f = c.f, o = c.o;
        if (t < 0.6) return { id: 'beam', pos: P(c, -3.2, 1.6, 0.4), look: c.O.clone().setY(2.3) };
        if (t < 1.25) return { id: 'wings', pos: _v.copy(f.pos).addScaledVector(c.D, -4.4).addScaledVector(c.S, 2.6).setY(f.pos.y + 1.3).clone(), look: chest(f).lerp(chest(o), 0.5) };
        const mid = _v.addVectors(f.pos, o.pos).multiplyScalar(0.5).clone();
        return { id: 'smash', pos: mid.clone().addScaledVector(c.S, 7).setY(2.4), look: mid.setY(Math.max(1, mid.y)) };
      },
    },

    /* DRAGOON: skewered, carried up, three dives from three sides, and the dragon's own */
    skewer: {
      ticks: 7, fin: 2.25, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s, col = KB.LINES.dragoon.pal.glow;
        if (once(c, 'dragon', 0.15)) {
          s.dragon = prop(c, Prop.dragon(col), p => { const k = U.easeOut(Math.min(1, p.t / 0.35)); p.obj.scale.setScalar(k); const b = c.t < 1.8 ? f.pos : o.pos; p.obj.position.set(b.x - c.D.x * 1.5, b.y + 2.6 + Math.sin(p.t * 3) * 0.2, b.z - c.D.z * 1.5); p.obj.rotation.y = Math.atan2(c.D.x, c.D.z); });
          SFX.play('superStart'); SFX.play('boom');
        }
        if (t < 0.45) { o.pos.copy(P(c, 0, 0, 0.3)); f.pos.copy(P(c, -1.0, 0, 0.4)); face(f, o.pos); pose(c, 'tsuki'); if (once(c, 't0', 0.05)) tick(c); }
        else if (t < 0.95) { const k = U.easeOut(span(t, 0.45, 0.95)); o.pos.copy(P(c, 0, 0, U.lerp(0.3, 5, k))); f.pos.copy(P(c, -1.0, 0, U.lerp(0.4, 4.6, k))); pose(c, 'twoHandUp'); if (once(c, 'up', 0.47)) SFX.play('jump'); }
        else if (t < 1.8) {
          o.pos.copy(P(c, 0, 0, 5)); o.spin.rotation.x -= dt * 3;
          const k = beat(c, 'dive', 3, 0.95, 1.8);
          if (k) { s.dv = { a: k * 2.1 + 0.5, t: c.t }; tick(c); SFX.play('slash'); }
          if (s.dv) {
            const u = span(c.t, s.dv.t, s.dv.t + 0.18), a = s.dv.a;
            const from = new V3(o.pos.x + Math.sin(a) * 3, o.pos.y + 3, o.pos.z + Math.cos(a) * 3), to = new V3(o.pos.x - Math.sin(a) * 2, o.pos.y - 2, o.pos.z - Math.cos(a) * 2);
            f.pos.lerpVectors(from, to, u); face(f, to); pose(c, 'plunge');
            FX.burst(chest(f), { n: 2, color: [col, 0xffd080], glow: true, speed: 1, size: 0.08, gravity: 0, life: 0.3 });
          }
        } else {
          const k = span(t, 1.8, 2.2);
          if (k < 0.3) { f.pos.copy(P(c, 0, 0, 9)); pose(c, 'plunge', 'wind'); } else { f.pos.copy(P(c, 0, 0, U.lerp(9, 0.6, (k - 0.3) / 0.7))); pose(c, 'plunge'); o.pos.y = Math.min(o.pos.y, f.pos.y - 0.4 > 0 ? 5 : 0.05); }
          if (k > 0.75) o.pos.y = U.lerp(o.pos.y, 0.05, 0.5);
          f.yaw = Math.atan2(c.D.x, c.D.z); FX.burst(chest(f), { n: 3, color: [col, 0xffd080, 0xff4020], glow: true, speed: 2, size: 0.1, gravity: -2, life: 0.4 });
        }
        if (t >= this.fin) {
          o.pos.y = 0; f.pos.copy(P(c, -0.7, 0, 0)); if (s.dragon) drop(c, s.dragon);
          FX.burst(_v.copy(o.pos).setY(0.3), { n: 60, color: [col, 0xffd080, 0xff4020, 0x3a3a3a], glow: true, speed: 10, size: 0.13, life: 0.8 });
          FX.ring(_v.copy(o.pos).setY(0.1), { r1: 6, life: 0.6, color: col }); SFX.play('wallbreak'); return true;
        }
        return false;
      },
      cam(c, t) {
        const o = c.o;
        if (t < 0.45) return { id: 'skewer', pos: P(c, -0.8, 4.6, 1.4), look: P(c, -0.6, 0, 1.7) };
        if (t < 0.95) return { id: 'rise', pos: P(c, 1.2, 2.4, 0.3), look: chest(o) };
        if (t < 1.8) { const a = Math.atan2(c.S.x, c.S.z) + (t - 0.95) * 1.2; return { id: 'orbit', pos: new V3(o.pos.x + Math.sin(a) * 6.5, o.pos.y + 0.8, o.pos.z + Math.cos(a) * 6.5), look: chest(o) }; }
        return { id: 'down', pos: P(c, -0.5, 2.2, 10), look: c.O.clone() };
      },
    },

    /* BARD: the house lights drop, two spotlights, they dance to every beat, and the lute comes down for the encore */
    concert: {
      ticks: 8, fin: 2.3, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s, col = KB.LINES.bard.pal.glow;
        if (once(c, 'lights', 0.02)) {
          lit(c, 0.35); c.tint = ['rgba(10,4,20,.38)', 1];
          s.spotO = prop(c, Prop.cone(0xffb0e0, 1.3, 9), p => p.obj.position.set(o.pos.x, 9, o.pos.z));
          s.spotF = prop(c, Prop.cone(0xffffff, 1.1, 9), p => p.obj.position.set(f.pos.x, 9, f.pos.z));
          SFX.play('superStart');
        }
        // they dance
        o.pos.set(c.O.x, Math.abs(Math.sin(t * 7)) * 0.35, c.O.z); if (t < 1.8) o.yaw += dt * 7;
        face(f, o.pos);
        const k = beat(c, 'note', 8, 0.4, 1.75);
        if (k) {
          pose(c, 'strum', k % 2 ? 'wind' : 'strike'); SFX.play('chord'); tick(c);
          const from = f.fig.socket('wR', [0, 0, 11]);
          for (let i = 0; i < 4; i++) FX.burst(from.clone().lerp(chest(o), i / 4), { n: 2, color: [col, 0xffffff, 0xfff27a], glow: true, speed: 1.2, size: 0.1, gravity: -1, life: 0.4 });
          FX.ring(chest(o), { r1: 1.6, life: 0.25, normal: c.D.clone(), color: col });
        }
        if (t >= 1.8) {
          const u = span(t, 1.8, 2.2); pose(c, 'overhead', u < 0.6 ? 'wind' : 'strike');
          f.pos.copy(P(c, U.lerp(-2.2, -0.9, u), 0, Math.sin(u * Math.PI) * 1.6)); o.yaw = Math.atan2(-c.D.x, -c.D.z);
          if (u > 0.6) f.trailR.push(f.fig.socket('wR', [0, 0, 3]), f.fig.socket('wR', [0, 0, 13]));
        }
        if (t >= this.fin) {
          lit(c, 1); c.tint = null; drop(c, s.spotO); drop(c, s.spotF); f.pos.y = 0;
          for (let i = 0; i < 4; i++) FX.burst(chest(o).add(new V3(U.vrnd(-1, 1), U.vrnd(0, 1.5), U.vrnd(-1, 1))), { n: 18, color: [[0xff6fa8, 0xfff27a], [0x7cf9ff, 0xffffff], [0x9dff7a, 0xffd040], [0xd9b8ff, 0xff8ad8]][i], glow: true, speed: 7, size: 0.08, gravity: 4, life: 0.9 });
          FX.ring(chest(o), { r1: 4.5, life: 0.5, normal: c.D.clone(), color: col }); SFX.play('wallbreak'); return true;
        }
        return false;
      },
      cam(c, t) {
        const f = c.f, o = c.o, mid = _v.addVectors(f.pos, o.pos).multiplyScalar(0.5).clone();
        if (t < 0.4) return { id: 'house', pos: mid.clone().addScaledVector(c.S, 7.5).setY(2.6), look: mid.setY(1) };
        if (t < 0.95) return { id: 'bard', pos: _v.copy(f.pos).addScaledVector(c.D, 2.3).addScaledVector(c.S, 0.9).setY(1.15).clone(), look: _v.copy(f.pos).setY(1.1).clone() };
        if (t < 1.4) return { id: 'dance', pos: _v.copy(o.pos).addScaledVector(c.D, -2.3).addScaledVector(c.S, 1.6).setY(1.3).clone(), look: _v.copy(o.pos).setY(0.9).clone() };
        return { id: 'stage', pos: mid.clone().addScaledVector(c.S, 4.6).addScaledVector(c.D, -0.5).setY(1.0), look: mid.setY(1.3) };
      },
    },
  };

  /* ------------------------------------------------------------ the runner */
  const Arts = {
    ART, Prop,
    begin(f, o, mv) {
      const m = f.m, art = ART[mv.seq] || ART.cuts;
      const D = new V3(o.pos.x - f.pos.x, 0, o.pos.z - f.pos.z); if (D.lengthSq() < 0.01) D.copy(f.forward); D.normalize();
      const S = new V3().crossVectors(UP, D).normalize();
      if (S.z < 0 || (S.z === 0 && S.x < 0)) S.multiplyScalar(-1);   // the side toward where the camera normally sits (+Z); never the camera itself, which differs per screen (online, both must agree)
      const O = o.pos.clone(); O.y = 0;
      // side shots stand 4-8 m off to the side: take the side with room for them
      const room = k => { const A = m.arena, x = O.x + S.x * k, z = O.z + S.z * k; return Math.max(Math.abs(x) - A.W, -z - A.D); };   // (the low front wall, +Z, doesn't block a shot)
      if (room(5) > -0.5 && room(-5) < room(5)) S.multiplyScalar(-1);
      const c = { f, o, m, mv, art, D, S, O, t: 0, beats: {}, flags: {}, s: {}, props: [], shot: null, outro: -1, light: 1, lightTo: 1, tint: null, done: false };
      m.cine = c; f.vel.set(0, 0, 0); o.vel.set(0, 0, 0);
      if (!m.attract) HUD.cine(true);
      return c;
    },
    /* advance the Art; true on the frame its finisher should land */
    step(c, dt) {
      if (c.done) return false;
      c.t += dt;
      const fin = c.art.step(c, c.t, dt);
      // an Art near a wall: nobody is choreographed into or through it
      for (const w of c.m.arena.walls) if (!w.broken) for (const F of [c.f, c.o]) if (w.sign * F.pos[w.axis] > w.lim - 0.45) F.pos[w.axis] = w.sign * (w.lim - 0.45);
      if (fin) { c.done = true; return true; }
      return false;
    },
    /* the finisher has landed: freeze, flash, the name */
    finish(c) {
      c.outro = 0; c.f.pose2 = null; c.f.obj.visible = true;
      c.m.slowmo(0.3, 0.55); c.m.hitstopAll(0.1); FX.addShake(1.1);
      if (!c.m.attract) { HUD.cineFlash(); HUD.cineTitle(c.mv.name.toUpperCase(), KB.LINES[c.f.build.card.line].css); }
    },
    /* every frame from the match (real time): props, lights, the outro */
    update(c, dt) {
      for (let i = c.props.length - 1; i >= 0; i--) { const p = c.props[i]; p.t += dt; if (p.upd) p.upd(p, dt); if (p.t > p.life) drop(c, p); }
      c.light = U.smooth(c.light, c.lightTo, 5, dt);
      const A = c.m.arena; if (A.hemi) { A.hemi.intensity = A.base.hemi * c.light; A.sun.intensity = A.base.sun * c.light; }
      if (!c.m.attract) HUD.cineTint(c.tint);
      if (c.outro >= 0) { c.outro += dt; if (c.outro > 0.95) Arts.end(c); }
    },
    cam(c) {
      if (c.outro >= 0) { const o = c.o; return { id: 'outro', pos: _v.copy(o.pos).addScaledVector(c.S, 7.5).addScaledVector(c.D, -1.5).setY(Math.max(2.2, o.pos.y + 1.5)).clone(), look: _v.copy(o.pos).setY(Math.max(1, o.pos.y + 0.6)).clone() }; }
      return c.art.cam(c, c.t);
    },
    end(c) {
      if (!c || c.ended) return; c.ended = true;
      for (const p of c.props.slice()) drop(c, p);
      const A = c.m.arena; if (A.hemi) { A.hemi.intensity = A.base.hemi; A.sun.intensity = A.base.sun; }
      c.f.obj.visible = true; c.f.pose2 = null; c.f.cine = null;
      if (c.m.cine === c) c.m.cine = null;
      if (!c.m.attract) { HUD.cine(false); HUD.cineTint(null); }
    },
  };
  window.Arts = Arts;
})();
