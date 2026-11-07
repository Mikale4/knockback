/* ============================================================================
   benders_arts.js -- the ELEMENT BENDERS Legend Arts (arts.js explains an Art).
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3, _v = new V3();
  const { P, face, moveTo, span, beat, once, chest, tick, pose, prop, lit } = Arts.H, Prop = Arts.Prop;
  const G = VX.glow;
  const puff = (at, cols, n, sp, grav, up) => FX.burst(at, { n: n || 16, color: cols, glow: true, speed: sp || 5, size: 0.1, gravity: grav || 0, life: 0.55, up: up || 0 });
  const yawOf = c => Math.atan2(c.D.x, c.D.z);
  // a glowing column (a spout, a pillar of light) that fades
  const column = (c, at, col, r, h, life) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.25, h, 16, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(at.x, h / 2, at.z); return prop(c, m, p => { p.obj.material.opacity = Math.max(0, 0.75 * (1 - p.t / life)); }, life);
  };
  // a bolt of lightning from the sky to a point, gone in a blink
  const bolt = (c, to, col, w) => {
    const from = new V3(to.x + (U.vrand() - 0.5) * 0.6, to.y + 9, to.z + (U.vrand() - 0.5) * 0.6), d = new V3().subVectors(to, from), len = d.length();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w || 0.12, w || 0.12, len), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    m.position.copy(from).addScaledVector(d, 0.5); m.lookAt(to); prop(c, m, null, 0.14);
  };
  const wave = () => Prop.vox(g => { for (let x = -18; x <= 18; x++) for (let y = 0; y <= 26; y++) { const z = Math.round(Math.sin(y / 26 * Math.PI) * 4 * (y / 26)); g.set(x, y, z, y > 22 ? 0xe8f8ff : (x * 3 + y) % 7 ? 0x2a7ad8 : 0x5aa8f0); g.set(x, y, z - 1, 0x1a5ab8); } }, 0.08);
  const pillar = () => Prop.vox(g => g.box(-4, 0, -4, 4, 18, 4, (x, y, z) => y === 18 ? 0xb89a6a : VX.hash3(x, y, z) > 0.7 ? 0x6a5a4a : 0x8a7a62), 0.07);
  const pool = (a, b) => Prop.vox(g => { for (let x = -14; x <= 14; x++) for (let z = -14; z <= 14; z++) if (x * x + z * z < 196) g.set(x, 0, z, VX.hash3(x, 0, z) > 0.75 ? b : a); }, 0.1);
  const plate = () => Prop.vox(g => { g.box(-8, 0, -1, 8, 22, 1, 0x8a8e98); g.box(-8, 0, 1, 8, 22, 1, 0xa8acb4); for (const [x, y] of [[-6, 3], [6, 3], [-6, 19], [6, 19]]) g.set(x, y, 2, 0x5a5e68); }, 0.07);
  const lantern = () => Prop.vox(g => { g.box(-2, 0, -2, 2, 4, 2, G(0xffd86a)); g.box(-2, 5, -2, 2, 5, 2, 0x4a2a7a); g.box(-2, -1, -2, 2, -1, 2, 0x4a2a7a); g.set(0, 6, 0, 0x4a2a7a); }, 0.06);

  Object.assign(Arts.ART, {
    /* AIR: a tornado lifts them, spinning, up past her head; she rides the wind up after them and brings them down */
    airStorm: {
      ticks: 6, fin: 1.95, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.go) { s.go = 1; f.pos.copy(P(c, -1.6, 0, 0)); face(f, o.pos); c.m.call(f, 'EYE OF THE STORM!', 'super'); }
        if (t < 1.2) {
          o.pos.copy(P(c, 0, 0, U.easeOut(span(t, 0.05, 1.1)) * 2.6)); o.spin.rotation.y += dt * 16; pose(c, 'cast');
          for (let i = 0; i < 3; i++) { const a = t * 14 + i * 2.1, h = U.vrand() * (o.pos.y + 1.5), r = 0.4 + h * 0.35; FX.burst(_v.set(c.O.x + Math.cos(a) * r, h, c.O.z + Math.sin(a) * r), { n: 1, color: [0xe8f8ff, 0x9ad8f0], glow: true, speed: 0.6, size: 0.12, life: 0.4, gravity: -2 }); }
          if (beat(c, 'spin', 4, 0.2, 1.1)) { tick(c); SFX.play('whoosh'); }
          return false;
        }
        if (t < 1.55) { f.pos.lerpVectors(P(c, -1.6, 0, 0), P(c, -0.7, 0, 3.0), U.easeOut(span(t, 1.2, 1.5))); face(f, o.pos); pose(c, 'axeKick', 'wind'); o.spin.rotation.y += dt * 6; return false; }
        o.spin.rotation.set(0, 0, 0); pose(c, 'axeKick');
        const k = span(t, 1.55, 1.75); o.pos.y = U.lerp(2.6, 0.6, k); f.pos.y = t < 1.75 ? U.lerp(3.0, 0.9, k) : Math.max(0, 0.9 - (t - 1.75) * 9);
        if (once(c, 'down', 1.62)) { tick(c); tick(c); SFX.play('heavy'); FX.addShake(0.5); FX.ring(P(c, 0, 0, 0.1), { r1: 3.5, life: 0.45, color: 0xc8f0ff }); puff(P(c, 0, 0, 0.4), [0xffffff, 0xc8f0ff], 30, 7, 2); }
        return t >= this.fin;
      },
      cam(c, t) { return t < 1.2 ? { id: 'low', pos: P(c, -3.4, 2.4, 1.2), look: P(c, 0, 0, 1.5) } : { id: 'side', pos: P(c, -0.8, 5.6, 2.6), look: P(c, 0, 0, 1.4) }; },
    },

    /* WATER: the sea stands up behind her and rolls over them; she brings it down on them */
    tidal: {
      ticks: 6, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.wave) { f.pos.copy(P(c, -1.4, 0, 0)); face(f, o.pos); const w = wave(); w.position.copy(P(c, -2.8, 0, 0)); w.rotation.y = yawOf(c); w.scale.y = 0.05; s.wave = prop(c, w, null, 2.2); c.m.call(f, 'TIDAL WAVE!', 'super'); }
        const W = s.wave.obj;
        if (t < 0.5) { W.scale.y = Math.max(0.05, span(t, 0, 0.5)); pose(c, 'cast', 'wind'); o.pos.copy(P(c, 0, 0, 0)); return false; }
        if (t < 1.5) {
          const k = span(t, 0.5, 1.4); W.position.copy(P(c, -2.8 + k * 4.4, 0, 0)); pose(c, 'cast');
          if (k > 0.4) { o.pos.copy(P(c, (k - 0.4) * 2.4, 0, 0.5 + Math.abs(Math.sin(k * 9)) * 0.5)); o.spin.rotation.x += dt * 9; }
          if (beat(c, 'roll', 4, 0.75, 1.45)) { tick(c); SFX.play('hit'); }
          if (U.vrand() < 0.7) FX.burst(_v.copy(W.position).setY(1.9), { n: 2, color: [0xe8f8ff, 0x7ad8ff], speed: 3, size: 0.08, gravity: 8, life: 0.6, up: 1 });
          return false;
        }
        o.spin.rotation.set(0, 0, 0); pose(c, 'dragonPalm'); W.scale.y = Math.max(0.05, 1 - span(t, 1.5, 1.8));
        if (once(c, 'crash', 1.6)) { tick(c); tick(c); SFX.play('boom'); FX.addShake(0.5); FX.burst(chest(o), { n: 34, color: [0x7ad8ff, 0xe8f8ff, 0x2a7ad8], speed: 7, size: 0.11, gravity: 8, life: 0.8, up: 1.5 }); FX.ring(_v.copy(o.pos).setY(0.08), { r1: 3, life: 0.45, color: 0x7ad8ff }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, -0.4, 5.6, 2.0), look: P(c, -0.2, 0, 1.0) }; },
    },

    /* EARTH: pillars of rock burst up under them, one after another, and the stone fist */
    tectonic: {
      ticks: 7, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.go) { s.go = 1; f.pos.copy(P(c, -1.6, 0, 0)); face(f, o.pos); c.m.call(f, 'TECTONIC!', 'super'); }
        const k = beat(c, 'pil', 4, 0.15, 1.3);
        if (k) {
          const pl = pillar(), at = P(c, k % 2 ? 0.25 : -0.25, k % 2 ? 0.35 : -0.35, 0); pl.position.copy(at).setY(-1.3); prop(c, pl, p => { p.obj.position.y = Math.min(0, -1.3 + p.t * 10) - Math.max(0, p.t - 0.5) * 3; }, 0.9);
          tick(c); SFX.play('heavy'); FX.addShake(0.3); FX.burst(_v.copy(at).setY(0.2), { n: 14, color: [0x8a7a62, 0xb89a6a, 0x6a5a4a], speed: 4, size: 0.1, life: 0.5, up: 1 });
        }
        if (t < 1.4) { pose(c, 'stomp', k ? 'strike' : 'wind'); const ph = U.clamp((t - 0.15) % 0.29 / 0.29, 0, 1); o.pos.copy(P(c, 0, 0, t > 0.15 ? 0.4 + Math.sin(ph * Math.PI) * 1.5 : 0)); o.spin.rotation.x = Math.sin(t * 9) * 0.3; return false; }
        o.spin.rotation.set(0, 0, 0); o.pos.copy(P(c, 0, 0, 0.9)); moveTo(f.pos, P(c, -0.95, 0, 0), 10, dt); face(f, o.pos); pose(c, 'punch', t < 1.5 ? 'wind' : 'strike');
        if (once(c, 'fist', 1.55)) { tick(c); tick(c); tick(c); SFX.play('wallbreak'); FX.addShake(0.6); FX.ring(chest(o), { r1: 2.6, life: 0.4, normal: c.D.clone(), color: 0xb89a6a }); FX.burst(chest(o), { n: 26, color: [0x8a7a62, 0xb89a6a, 0xd8b048], speed: 7, size: 0.12, life: 0.6 }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, -0.6, 5.2, 1.8), look: P(c, -0.2, 0, 1.0) }; },
    },

    /* FIRE: a storm of burning blows, then a blast of fire from both palms */
    inferno: {
      ticks: 7, fin: 1.9,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.go) { s.go = 1; f.pos.copy(P(c, -1.3, 0, 0)); face(f, o.pos); c.m.call(f, 'INFERNO!', 'super'); }
        o.pos.copy(P(c, 0, 0, 0));
        if (t < 1.35) {
          moveTo(f.pos, P(c, -0.9, 0, 0), 8, dt); face(f, o.pos);
          const k = beat(c, 'blow', 6, 0.1, 1.3);
          if (k) { pose(c, ['jabR', 'kick', 'punch', 'spinKick', 'hook', 'knee'][k - 1]); tick(c); SFX.play('hit'); puff(chest(o), [0xffd040, 0xff7a2a, 0xff3010], 12, 4, -2); o.spin.rotation.z = k % 2 ? 0.2 : -0.2; }
          if (U.vrand() < 0.5) FX.burst(_v.copy(f.pos).setY(0.2), { n: 1, color: [0xff7a2a, 0xffd040], glow: true, speed: 1, size: 0.08, gravity: -4, life: 0.5 });
          return false;
        }
        o.spin.rotation.set(0, 0, 0); pose(c, 'dragonPalm');
        if (once(c, 'blast', 1.45)) { tick(c); SFX.play('boom'); FX.addShake(0.6); FX.burst(chest(o), { n: 46, color: [0xffd040, 0xff7a2a, 0xff3010], glow: true, speed: 8, size: 0.14, life: 0.6, dir: c.D.clone().multiplyScalar(6) }); FX.ring(chest(o), { r1: 2.8, life: 0.4, normal: c.D.clone(), color: 0xff7a2a }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, -0.4, 4.4, 1.5), look: P(c, -0.4, 0, 1.0) }; },
    },

    /* BLOOD: she lifts them on strings, jerks them through a dance, and drives them into the floor */
    marionette: {
      ticks: 6, fin: 1.95, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.go) { s.go = 1; f.pos.copy(P(c, -2.2, 0, 0)); face(f, o.pos); lit(c, 0.45); c.m.call(f, 'MARIONETTE!', 'super'); }
        if (t < 1.45) {
          pose(c, 'point'); o.pos.copy(P(c, 0, 0, U.easeOut(span(t, 0.05, 0.4)) * 1.4));
          const k = beat(c, 'jerk', 5, 0.4, 1.4);
          if (k) { tick(c); o.spin.rotation.set(k % 2 ? 0.5 : -0.4, k % 2 ? 0.7 : -0.7, 0); SFX.play('hit'); puff(chest(o), [0xff2a4a, 0x8a0a1a], 10, 3); }
          if (U.vrand() < 0.6) { const a = f.fig.socket('wR', [0, 0, 2]), b = chest(o).setY(o.pos.y + 2.2); FX.burst(a.lerp(b, U.vrand()), { n: 1, color: [0xff2a4a], glow: true, speed: 0.2, size: 0.05, life: 0.3, gravity: 0 }); }
          return false;
        }
        o.spin.rotation.set(0, 0, 0); lit(c, 1); pose(c, 'slam');
        o.pos.y = Math.max(0.4, 1.4 - span(t, 1.5, 1.65) * 1.0);
        if (once(c, 'down', 1.6)) { tick(c); SFX.play('heavy'); FX.addShake(0.5); FX.ring(_v.copy(o.pos).setY(0.08), { r1: 3, life: 0.45, color: 0xff2a4a }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, -1.1, 5.4, 2.0), look: P(c, -0.6, 0, 1.2) }; },
    },

    /* LAVA: a pool of lava under them, an eruption that throws them up, and she brings them down into it */
    volcano: {
      ticks: 6, fin: 1.95, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.go) { s.go = 1; f.pos.copy(P(c, -1.6, 0, 0)); face(f, o.pos); const p = pool(G(0xff6a1a), 0x2a1410); p.position.copy(c.O).setY(0.03); prop(c, p, null, 2.2); c.m.call(f, 'VOLCANO!', 'super'); }
        if (t < 0.5) { pose(c, 'stomp', 'wind'); o.pos.copy(P(c, 0, 0, 0)); if (U.vrand() < 0.6) FX.burst(_v.copy(c.O).setY(0.1), { n: 1, color: [0xff6a1a, 0xffd040], glow: true, speed: 2, size: 0.08, gravity: -4, life: 0.5 }); return false; }
        if (t < 1.3) {
          pose(c, 'palmUp'); o.pos.copy(P(c, 0, 0, U.easeOut(span(t, 0.5, 0.9)) * 3)); o.spin.rotation.x += dt * 5;
          if (once(c, 'erupt', 0.5)) { tick(c); SFX.play('boom'); FX.addShake(0.6); column(c, c.O, 0xff6a1a, 0.8, 7, 0.6); puff(_v.copy(c.O).setY(0.5), [0xff6a1a, 0xffd040, 0x2a1410], 34, 8, 6, 2); }
          if (beat(c, 'spat', 3, 0.7, 1.25)) { tick(c); SFX.play('hit'); puff(chest(o), [0xff6a1a, 0xffd040], 12, 4, 4); }
          return false;
        }
        o.spin.rotation.set(0, 0, 0); f.pos.lerpVectors(P(c, -1.6, 0, 0), P(c, -0.6, 0, 3.3), U.easeOut(span(t, 1.3, 1.55))); face(f, o.pos); pose(c, 'slam', t < 1.55 ? 'wind' : 'strike');
        if (t >= 1.55) { const k = span(t, 1.55, 1.75); o.pos.y = U.lerp(3, 0.5, k); f.pos.y = t < 1.75 ? U.lerp(3.3, 0.8, k) : Math.max(0, 0.8 - (t - 1.75) * 9); }
        if (once(c, 'down', 1.62)) { tick(c); tick(c); SFX.play('heavy'); FX.addShake(0.6); puff(P(c, 0, 0, 0.3), [0xff6a1a, 0xffd040, 0x2a1410], 30, 7, 6, 1); }
        return t >= this.fin;
      },
      cam(c, t) { return t < 1.3 ? { id: 'low', pos: P(c, -3.6, 2.2, 1.0), look: P(c, 0, 0, 1.8) } : { id: 'side', pos: P(c, -0.8, 5.8, 2.6), look: P(c, 0, 0, 1.6) }; },
    },

    /* LIGHTNING: the sky goes dark, it strikes them again and again where they hang, then once more, down */
    thunderhead: {
      ticks: 7, fin: 1.95, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.go) { s.go = 1; f.pos.copy(P(c, -2.4, 0, 0)); face(f, o.pos); lit(c, 0.3); c.m.call(f, 'THUNDERHEAD!', 'super'); }
        pose(c, 'point'); o.pos.copy(P(c, 0, 0, t < 1.5 ? 0.3 + span(t, 0, 0.4) * 1.2 : Math.max(0.5, 1.5 - span(t, 1.55, 1.7))));
        const k = beat(c, 'bolt', 5, 0.3, 1.4);
        if (k) { const at = chest(o); bolt(c, at, 0xffffff); bolt(c, at, 0x7ae8ff, 0.06); tick(c); SFX.play('boom'); puff(at, [0x7ae8ff, 0xffffff, 0xffe83a], 14, 4); o.spin.rotation.z = k % 2 ? 0.3 : -0.3; }
        if (t > 1.45) { o.spin.rotation.set(0, 0, 0); lit(c, 1); }
        if (once(c, 'big', 1.55)) { const at = chest(o); bolt(c, at, 0xffffff, 0.3); bolt(c, at, 0xffe83a, 0.12); tick(c); tick(c); SFX.play('wallbreak'); FX.addShake(0.7); FX.ring(_v.copy(o.pos).setY(0.08), { r1: 3.6, life: 0.45, color: 0x7ae8ff }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'low', pos: P(c, -3.8, 2.6, 1.0), look: P(c, -0.4, 0, 1.6) }; },
    },

    /* EXPLOSION: one snap of his fingers, and the explosions run up their body to a big one */
    chainReaction: {
      ticks: 7, fin: 1.9,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.go) { s.go = 1; f.pos.copy(P(c, -1.9, 0, 0)); face(f, o.pos); c.m.call(f, 'CHAIN REACTION!', 'super'); }
        o.pos.copy(P(c, 0, 0, 0)); pose(c, 'point', t < 0.4 ? 'wind' : 'strike');
        if (once(c, 'snap', 0.38)) { SFX.play('guard'); FX.spark(f.fig.socket('wR', [0, 0, 2]), { color: 0xffd040, size: 1 }); }
        const k = beat(c, 'pop', 6, 0.45, 1.4);
        if (k) { const at = chest(o).add(new V3((U.vrand() - 0.5) * 0.6, (k / 6 - 0.55) * 1.3, (U.vrand() - 0.5) * 0.6)); FX.burst(at, { n: 18, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 5, size: 0.1, life: 0.45 }); FX.spark(at, { color: 0xffb040, size: 1.4 }); tick(c); SFX.play('boom'); FX.addShake(0.2); o.spin.rotation.z = k % 2 ? 0.25 : -0.25; }
        if (t > 1.45) o.spin.rotation.set(0, 0, 0);
        if (once(c, 'big', 1.55)) { const at = chest(o); tick(c); SFX.play('wallbreak'); FX.addShake(0.8); FX.burst(at, { n: 48, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 9, size: 0.15, life: 0.7 }); FX.ring(at, { r1: 3.6, life: 0.45, normal: c.D.clone(), color: 0xffa040 }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, -0.8, 4.8, 1.6), look: P(c, -0.6, 0, 1.0) }; },
    },

    /* METAL: two iron plates slam shut round them, he hammers them, and the plates fly apart for the last blow */
    foundry: {
      ticks: 6, fin: 1.95,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.pl) { f.pos.copy(P(c, -1.0, 0, 0)); face(f, o.pos); s.pl = [-1, 1].map(() => { const p = plate(); p.rotation.y = yawOf(c) + Math.PI / 2; return prop(c, p, null, 2.2); }); c.m.call(f, 'FOUNDRY!', 'super'); }
        o.pos.copy(P(c, 0, 0, 0));
        const side = t < 1.4 ? U.lerp(2.6, 0.45, U.easeIn(span(t, 0, 0.4))) : U.lerp(0.45, 4, span(t, 1.4, 1.7));
        s.pl.forEach((p, i) => p.obj.position.copy(P(c, 0, (i ? 1 : -1) * side, 0.05)));
        if (once(c, 'clamp', 0.4)) { tick(c); SFX.play('guard'); FX.spark(chest(o), { color: 0xffffff, size: 1.6 }); FX.addShake(0.3); }
        const k = beat(c, 'ham', 4, 0.5, 1.35);
        if (k) { pose(c, k % 2 ? 'punch' : 'hook'); tick(c); SFX.play('heavy'); FX.burst(chest(o), { n: 10, color: [0xffd040, 0xffffff], glow: true, speed: 5, size: 0.06, life: 0.3 }); }
        if (t > 1.4) pose(c, 'hookL', t < 1.55 ? 'wind' : 'strike');
        if (once(c, 'last', 1.58)) { tick(c); SFX.play('wallbreak'); FX.addShake(0.6); FX.burst(chest(o), { n: 24, color: [0xffd040, 0xffffff, 0x8a8e98], glow: true, speed: 7, size: 0.08, life: 0.5 }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, -0.2, 4.6, 1.8), look: P(c, -0.3, 0, 1.0) }; },
    },

    /* SPIRIT: the light goes; lanterns circle them in the dark, spirits strike from them, and she brings them back, hard */
    spiritWorld: {
      ticks: 6, fin: 1.95, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.lan) {
          f.pos.copy(P(c, -1.8, 0, 0)); face(f, o.pos); lit(c, 0.22); c.m.call(f, 'SPIRIT WORLD!', 'super');
          s.lan = [0, 1, 2, 3, 4].map(i => prop(c, lantern(), (p, d) => { const a = i / 5 * Math.PI * 2 + p.t * 1.6; p.obj.position.set(c.O.x + Math.cos(a) * 1.7, 1.4 + Math.sin(p.t * 3 + i) * 0.3, c.O.z + Math.sin(a) * 1.7); }, 1.6));
        }
        pose(c, t < 1.45 ? 'cast' : 'slam');
        o.pos.copy(P(c, 0, 0, t < 1.45 ? 0.5 + span(t, 0, 0.5) * 1.2 : Math.max(0.4, 1.7 - span(t, 1.5, 1.68) * 1.3)));
        const k = beat(c, 'wisp', 5, 0.4, 1.38);
        if (k && s.lan[k - 1]) { const from = s.lan[k - 1].obj.position.clone(), at = chest(o); for (let j = 0; j < 6; j++) FX.burst(from.clone().lerp(at, j / 6), { n: 1, color: [0xc8a8ff, 0xffffff], glow: true, speed: 0.3, size: 0.08, life: 0.3, gravity: 0 }); puff(at, [0xc8a8ff, 0xffffff], 12, 4); tick(c); SFX.play('whoosh'); o.spin.rotation.y = k * 0.9; }
        if (t > 1.45) { o.spin.rotation.set(0, 0, 0); lit(c, 1); }
        if (once(c, 'down', 1.6)) { tick(c); SFX.play('heavy'); FX.addShake(0.5); FX.ring(_v.copy(o.pos).setY(0.08), { r1: 3.2, life: 0.45, color: 0xc8a8ff }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'high', pos: P(c, -1.6, 4.6, 3.2), look: P(c, 0, 0, 1.0) }; },
    },

    /* SWAMP: the floor turns to mire and swallows them; the bog spits them out, and the thornwhip meets them */
    bog: {
      ticks: 6, fin: 1.95, slam: 1,
      step(c, t, dt) {
        const f = c.f, o = c.o, s = c.s;
        if (!s.go) { s.go = 1; f.pos.copy(P(c, -2.0, 0, 0)); face(f, o.pos); const p = pool(0x3a2e1a, 0x6a5a3a); p.position.copy(c.O).setY(0.03); prop(c, p, null, 2.2); c.m.call(f, 'SWALLOWING BOG!', 'super'); }
        if (t < 1.2) {
          o.pos.copy(P(c, 0, 0, -1.0 * U.easeIn(span(t, 0.1, 1.0)))); pose(c, 'stomp');
          if (beat(c, 'suck', 4, 0.2, 1.15)) { tick(c); SFX.play('heavy'); FX.burst(_v.copy(c.O).setY(0.15), { n: 12, color: [0x3a2e1a, 0x6a5a3a, 0x9ab83a], speed: 3, size: 0.12, life: 0.5, up: 1 }); }
          return false;
        }
        if (t < 1.5) {
          if (once(c, 'spit', 1.2)) { SFX.play('boom'); FX.addShake(0.4); FX.burst(_v.copy(c.O).setY(0.3), { n: 34, color: [0x3a2e1a, 0x6a5a3a, 0x9ab83a], speed: 8, size: 0.13, gravity: 8, life: 0.8, up: 2 }); }
          o.pos.copy(P(c, 0, 0, U.lerp(-1, 2.4, span(t, 1.2, 1.45)))); pose(c, 'twoHandDiag', 'wind'); return false;
        }
        pose(c, 'twoHandDiag'); o.pos.y = Math.max(0.4, 2.4 - (t - 1.5) * 10);
        if (once(c, 'whip', 1.55)) { tick(c); tick(c); SFX.play('heavy'); FX.addShake(0.5); FX.burst(chest(o), { n: 20, color: [0x4a6a2a, 0x9ab83a, 0x6a5a3a], speed: 6, size: 0.1, life: 0.5 }); }
        return t >= this.fin;
      },
      cam(c, t) { return { id: 'side', pos: P(c, -0.9, 5.4, 2.2), look: P(c, -0.4, 0, 1.0) }; },
    },
  });
})();
