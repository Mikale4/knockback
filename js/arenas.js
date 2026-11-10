/* ============================================================================
   arenas.js -- seventeen more stages (twenty in all), and the STAGE HAZARDS.

   Every stage is a theme in Arena.THEMES: its floor and walls (painted voxel
   by voxel), its light, and the big scenery around it -- the figures are a
   hand tall, so the house around them is enormous. Twelve of the new ones
   have a HAZARD, Arena.HAZ[theme.haz]:
     init()            its state at the start of each round. Plain numbers:
                       it lives on the match as M.haz, so online rollback
                       saves and restores it with everything else
     step(M, S, dt)    the sim. Timing comes from S.t (the round's own clock,
                       which only runs while fighting), choices from U.rand,
                       hits through Combat.hazard
     danger(M, S, f)   for the CPU: null, 'jump', or a way {x, z} to step
     build(group, A)   its meshes; draw(V, M, S, dt) poses them from S (S is
                       null with hazards off: everything stays at rest)
   STAGE HAZARDS in Options turns them off; online it is the room's rule.
   ========================================================================== */
(function () {
  'use strict';
  const TH = Arena.THEMES, HAZ = Arena.HAZ, AS = Arena.AS, W = 8, D = 6;
  const V3 = THREE.Vector3, hh = VX.hash3, G = VX.glow, TAU = Math.PI * 2;
  const wx = x => (x - 31.5) * AS, wz = z => (z - 23.5) * AS;            // a floor voxel's centre in the world
  const along = (i, w) => (i - w.len / AS / 2 + 0.5) * AS;              // a wall voxel's place along its wall (z on E/W, x on N/S)
  const css = c => '#' + (c & 0xffffff).toString(16).padStart(6, '0');
  function prop(group, g, s, x, y, z, ry, o) { const ob = VX.object(g, s, Object.assign({ cast: false }, o)); ob.position.set(x, y, z); ob.rotation.y = ry || 0; group.add(ob); return ob; }
  const basic = (color, op, add, side) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 1 : op, depthWrite: false, toneMapped: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, side: side || THREE.FrontSide });
  function decal(group, geo, color, op, x, z, y, add) { const m = new THREE.Mesh(geo, basic(color, op, add)); m.rotation.x = -Math.PI / 2; m.position.set(x || 0, y || 0.03, z || 0); m.renderOrder = 3; group.add(m); return m; }
  const lam = (color, o) => new THREE.MeshLambertMaterial(Object.assign({ color }, o));
  function box(group, w, h, d, color, x, y, z, o) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color && color.isMaterial ? color : lam(color, o)); m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m; }
  function canvasTex(w, h, draw, rx, ry) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); return t; }
  const tileTex = (bg, line, rx, ry) => canvasTex(64, 64, g => { g.fillStyle = css(bg); g.fillRect(0, 0, 64, 64); g.fillStyle = css(line); g.fillRect(0, 0, 64, 4); g.fillRect(0, 0, 4, 64); }, rx, ry);
  function backdrop(group, z, w, h, mat, y) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(0, (y || 0) + h / 2, z); group.add(m); return m; }
  /* a hollow ellipsoid (big blobs stay cheap to mesh) */
  const shell = (g, cx, cy, cz, rx, ry, rz, c, k) => g.ell(cx, cy, cz, rx, ry, rz, (x, y, z) => {
    const d = ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 + ((z - cz) / (rz + 0.5)) ** 2;
    return d < (k || 0.62) ? -1 : (typeof c === 'function' ? c(x, y, z) : c);
  });
  const pulse = (t, f) => 0.5 + 0.5 * Math.sin(t * f);
  const smooth01 = t => { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  /* after a hazard moved someone: back inside any wall that's still standing */
  function clampIn(f) {
    const A = f.m.arena, B = Fighter.BODY;
    for (const w of A.walls) { if (w.broken) continue; const lim = w.lim - B; if (w.sign * f.pos[w.axis] > lim) f.pos[w.axis] = w.sign * lim; }
  }
  /* a hazard's clock: an event every `per` seconds from `first` -> { n: which one, p: how far into it } */
  const cyc = (S, first, per) => { const k = S.t - first; if (k < 0) return null; const n = Math.floor(k / per); return { n, p: k - n * per }; };
  const awayX = (f, x) => (f.pos.x >= x ? 1 : -1);
  /* which lane a rolling hazard takes: mostly the one someone is standing in (each fighter in turn), now and then any */
  const laneFor = (M, n, L) => { const r = U.rand(), k = Math.floor(U.rand() * L.length); if (r > 0.7) return k; const x = M.fighters[n % 2].pos.x; let best = 0; L.forEach((lx, i) => { if (Math.abs(lx - x) < Math.abs(L[best] - x)) best = i; }); return best; };

  /* ======================================================== 1. TRAIN SET */
  const LANE = 0, TW = 1.6, TR = 2.7, TS = 22;   // the track's z (on the fighting line: seen from the side, it runs right through the stage); the warning, the run, the train's speed
  TH.trainset = {
    name: 'TRAIN SET', haz: 'train', tag: 'A toy railway runs through the middle of the floor',
    sky: [0x8ac8ff, 0xe4f2ff, 0x3a5a30], fog: 0xd4e8f4, hemi: [0xffffff, 0x4a6a3a, 0.9], sun: [0xfff4e0, 1.0],
    floor: (x, z) => { const d = Math.abs(wz(z) - LANE); if (d < 0.9) return hh(x, 1, z) > 0.5 ? 0x8a7c6a : 0x7a6e60;   // the ballast
      return hh(x, 0, z) > 0.82 ? 0x5aa64a : (((x >> 3) + (z >> 3)) % 2 ? 0x4c9a40 : 0x489440); },
    wall: (x, y, i, w) => {
      if (w && w.axis === 'x') { const d = Math.abs(along(i, w) - LANE); if (d < 0.8 && y < 8) return -1; if (d < 1.05 && y < 9) return 0x6a6a72; }   // the tunnel mouths
      return y >= 8 ? 0x5aa64a : (hh(i, y, 3) > 0.72 ? 0x9a9aa4 : ((y + (i >> 1)) % 4 ? 0x8a8a94 : 0x7c7c86));
    },
    edge: 0x6cb85c, dust: [0x4c9a40, 0x8a7c6a], out: 0x3e7a34, outY: -3, post: 0x8a8a94,
    scenery(group) {
      const tree = new VX.Grid(); tree.box(0, 0, 0, 0, 4, 0, 0x7a4a2a); tree.ell(0, 7, 0, 3, 3, 3, (x, y, z) => hh(x, y, z) > 0.75 ? 0x6ac85a : 0x4aa83a);
      [[-12, -9, 0.55], [-16, -5, 0.6], [12.5, -10, 0.5], [16, -4.5, 0.55], [-10, -15, 0.7], [14, -16, 0.65], [2, -16, 0.6], [-5, -13, 0.5], [-13, 6, 0.55], [13, 7, 0.5]].forEach(([x, z, s]) => prop(group, tree, s, x, -3 + 0.5 * s, z));
      const house = (c) => { const g = new VX.Grid(); g.box(-4, 0, -3, 4, 6, 3, c); for (let k = 0; k < 4; k++) g.box(-5 + k, 7 + k, -4, 5 - k, 7 + k, 4, 0xb83a2a); g.box(-1, 0, 3, 1, 3, 3, 0x5a3a24); g.box(-3, 4, 3, -2, 5, 3, 0x9ad8ff); g.box(2, 4, 3, 3, 5, 3, 0x9ad8ff); return g; };
      prop(group, house(0xf2e6c8), 0.45, -13, -3, -10, 0.3); prop(group, house(0xd8e8f4), 0.4, 11, -3, -13, -0.4); prop(group, house(0xf4d8a0), 0.4, -4, -3, -15, 0.1);
      // the hills the line runs into at both ends
      const hill = new VX.Grid(); shell(hill, 0, 0, 0, 14, 18, 12, (x, y, z) => y < 0 ? -1 : (hh(x, y, z) > 0.8 ? 0x5aa64a : 0x4a9440), 0.5);
      hill.cut(-16, 6, -3, 16, 11, 3); hill.paint((x, y, z) => Math.abs(z) <= 4 && y <= 12 && y >= 5, 0x1e1e18);
      prop(group, hill, 0.5, -25, -3, LANE); prop(group, hill, 0.5, 25, -3, LANE);
    },
  };
  function trainMesh() {
    const grp = new THREE.Group(), e = new VX.Grid();
    e.box(-12, 3, -4, 12, 4, 4, 0x2a2a2e);                                                  // the chassis
    for (const x of [-8, -2, 5]) for (const z of [-4, 4]) e.cyl('z', x, 2, 2, z, z, (X, Y) => (X === x && Y === 2) ? 0xf2c230 : 0xc8302a);
    e.cyl('x', 6, 0, 2.6, -3, 11, (x) => x % 5 === 0 ? 0xf2c230 : 0xd0302a);              // the boiler, with gold bands
    e.box(-12, 5, -4, -4, 11, 4, 0x2a5ad0); e.box(-11, 8, -4, -5, 10, -4, 0x1a1a24); e.box(-11, 8, 4, -5, 10, 4, 0x1a1a24);   // the cab
    e.box(-13, 12, -5, -3, 12, 5, 0x1a1a1e);
    e.box(8, 8, -1, 10, 11, 1, 0x1a1a1e); e.box(7, 12, -2, 11, 12, 2, 0x2a2a2e);             // the chimney
    e.box(12, 6, -1, 12, 7, 1, G(0xfff2a0)); e.box(12, 3, -4, 13, 4, 4, 0xf2c230);         // the lamp and the buffer beam
    grp.add(VX.object(e, 0.125));
    const wagon = (c, cargo) => { const g = new VX.Grid(); g.box(-6, 3, -4, 6, 4, 4, 0x2a2a2e); for (const x of [-4, 4]) for (const z of [-4, 4]) g.cyl('z', x, 2, 2, z, z, 0x3a3a40);
      g.box(-6, 5, -4, 6, 8, 4, c); g.cut(-5, 6, -3, 5, 8, 3); cargo(g); return g; };
    const a = VX.object(wagon(0xf2c230, g => { g.box(-4, 6, -2, -1, 9, 1, 0xe0343f); g.box(1, 6, -2, 4, 8, 2, 0x3f7fe0); g.box(0, 9, -1, 2, 10, 1, 0x3fbf6a); }), 0.125); a.position.x = -2.45; grp.add(a);
    const b = VX.object(wagon(0x3fbf6a, g => { g.ell(0, 8, 0, 4, 2, 2, 0xf4f4f4); }), 0.125); b.position.x = -4.2; grp.add(b);
    grp.position.set(0, 0.3125, LANE); return grp;
  }
  HAZ.train = {
    name: 'THE TRAIN', desc: 'Every 13 s the crossing lights flash and a train runs straight through the middle. Get off the track.',
    init: () => ({ n: -1, p: -1, dir: 1 }),
    nose: S => -S.dir * 26 + S.dir * TS * (S.p - TW),
    step(M, S) {
      const c = cyc(S, 7, 13); if (!c) return;
      if (c.n !== S.n) { S.n = c.n; S.dir = c.n % 2 ? -1 : 1; }
      S.p = c.p; if (c.p < TW || c.p > TW + TR) return;
      const nose = HAZ.train.nose(S);
      for (const f of M.fighters) {
        if (Math.abs(f.pos.z - LANE) > 1.0 || f.pos.y > 1.6) continue;
        const behind = (nose - f.pos.x) * S.dir;   // how far back from the engine's nose they are
        if (behind < -0.4 || behind > 7.0) continue;
        Combat.hazard(f, { dmg: 80, kb: [15, 7], dir: { x: S.dir, z: (f.pos.z >= LANE ? 1 : -1) * 0.45 }, call: 'CHOO CHOO!', flash: 0xffd060 });
      }
    },
    danger(M, S, f) {
      if (S.p < 0 || S.p > TW + TR - 0.3 || Math.abs(f.pos.z - LANE) > 1.7) return null;
      if (S.p >= TW && (HAZ.train.nose(S) - f.pos.x) * S.dir > 7) return null;
      return { x: 0, z: f.pos.z >= LANE ? 1 : -1 };
    },
    build(group) {
      const V = { n: -9, w: -9 }, tg = new VX.Grid();
      for (let x = -168; x <= 168; x += 4) tg.box(x, 0, -6, x + 1, 0, 6, 0x6a4024);           // the sleepers
      tg.box(-168, 1, -4, 168, 1, -4, 0xc0c4cc); tg.box(-168, 1, 4, 168, 1, 4, 0xc0c4cc);   // the rails
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const x = s * (70 + k * 24); tg.box(x - 1, -24, -5, x + 1, -1, 5, 0x8a6a48); }   // trestles past the walls
      prop(group, tg, 0.125, 0, 0.0625, LANE);
      // a crossbuck and two lamps on top of each tunnel wall
      const post = new VX.Grid(); post.box(0, 0, 0, 0, 9, 0, 0x2a2a2e); post.box(-3, 9, 0, 3, 9, 0, 0x2a2a2e); post.line(-3, 11, 0, 3, 14, 0, 0xf4f4f4); post.line(-3, 14, 0, 3, 11, 0, 0xf4f4f4);
      V.lamps = [];
      for (const s of [-1, 1]) {
        const x = s * 8.25, z = LANE + s * 1.35; prop(group, post, 0.125, x, 2.5, z);
        for (const k of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), basic(0x3a1010)); m.position.set(x + k * 0.36, 2.5 + 1.15, z + 0.08); group.add(m); V.lamps.push(m); }
      }
      V.stripe = decal(group, new THREE.PlaneGeometry(16, 1.9), 0xff3020, 0, 0, LANE, 0.04);
      V.train = trainMesh(); V.train.visible = false; group.add(V.train);
      return V;
    },
    draw(V, M, S) {
      const p = S ? S.p : -1, live = p >= 0 && p < TW + TR, blink = Math.floor(M.time * 5) % 2;
      V.lamps.forEach((m, k) => m.material.color.setHex(live && (k % 2) === blink ? 0xff2a1a : 0x3a1010));
      V.stripe.material.opacity = p >= 0 && p < TW ? 0.16 + 0.22 * pulse(M.time, 16) : 0;
      if (live && V.n !== S.n) { V.n = S.n; SFX.play('ding'); }
      if (live && p >= TW) {
        const nose = HAZ.train.nose(S); V.train.visible = true; V.train.position.x = nose - S.dir * 1.6; V.train.rotation.y = S.dir > 0 ? 0 : Math.PI;
        if (V.w !== S.n) { V.w = S.n; SFX.play('choo'); }
        if (U.vrand() < 0.5) FX.burst(new V3(nose - S.dir * 0.5, 1.9, LANE), { n: 1, color: [0xf4f4f4, 0xd8d8d8], speed: 1, size: 0.2, gravity: -2, life: 0.9, up: 1 });
      } else V.train.visible = false;
    },
  };

  /* =================================================== 2. KITCHEN COUNTER */
  const BURN = [[-4.2, 0], [4.2, 0]];   // (on the fighting line)
  TH.kitchen = {
    name: 'KITCHEN COUNTER', haz: 'burner', tag: 'A stovetop: the two burners take turns heating up',
    sky: [0xfff2d8, 0xf6dcb4, 0x6a4a30], fog: 0xf0d8b4, hemi: [0xfff6e8, 0x6a5040, 0.9], sun: [0xfff4e4, 1.0],
    floor: (x, z) => { const X = wx(x), Z = wz(z);
      for (const b of BURN) { const r = Math.hypot(X - b[0], Z - b[1]); if (r < 1.75) return [0.45, 0.9, 1.35].some(c => Math.abs(r - c) < 0.14) ? 0x4a2a26 : 0x1e1416; if (Math.abs(r - 1.95) < 0.1) return 0xd8d8e0; }
      return hh(x, 2, z) > 0.96 ? 0x3a3a46 : 0x16161c; },
    wall: (x, y, i) => (y % 4 === 3 || i % 4 === 3) ? 0xb8b4ae : (hh(i, y, 5) > 0.94 ? 0x4a8ad8 : 0xf6f4f0),
    edge: 0xd8dce4, dust: [0x2a2a30, 0xd8d8e0], out: 0x8a5a38, outY: -9, post: 0xc8ccd4,
    scenery(group) {
      box(group, 120, 1, 46, 0x9a948c, 0, -0.8, -31);                                        // the counter behind the stove
      backdrop(group, -34, 120, 44, lam(0xffffff, { map: tileTex(0xf4f0e6, 0xd8d0c4, 40, 15) }), -0.3);
      const k = new VX.Grid(); k.ell(0, 8, 0, 9, 8, 9, (x, y, z) => y < 1 ? -1 : (hh(x, y, z) > 0.93 ? 0xf05a4a : 0xd8302a));   // the kettle
      k.cyl('y', 0, 0, 5, 15, 16, 0xd8302a); k.ell(0, 18, 0, 2, 2, 2, 0x1a1a1e); k.line(8, 8, 0, 15, 14, 0, 0xd8302a, 1.6); k.line(-6, 15, 0, 0, 21, 0, 0x1a1a1e, 1.1); k.line(0, 21, 0, 6, 15, 0, 0x1a1a1e, 1.1);
      const kettle = prop(group, k, 0.45, -11, -0.3, -12, 0.5); group.userData.spout = kettle;
      const t = new VX.Grid(); t.box(-8, 0, -5, 8, 10, 5, (x, y, z) => hh(x, y, z) > 0.9 ? 0xe4e8ee : 0xc8ccd4);       // the toaster
      for (const sx of [-4, 3]) { t.cut(sx - 2, 9, -3, sx + 1, 10, 2); t.box(sx - 2, 9, -2, sx + 1, 13, 1, (x, y) => y > 12 ? 0xb87a3a : 0xd8a050); }
      t.box(9, 3, -1, 10, 4, 1, 0x1a1a1e); prop(group, t, 0.45, 11, -0.3, -12, -0.4);
      const shaker = cap => { const g = new VX.Grid(); g.cyl('y', 0, 0, 3, 0, 8, 0xf4f4f4); g.cyl('y', 0, 0, 3, 9, 11, cap); return g; };
      prop(group, shaker(0xc8ccd4), 0.35, -3.5, -0.3, -10.5); prop(group, shaker(0x2a2a2e), 0.35, -1.5, -0.3, -11);
      const sp = new VX.Grid(); sp.box(0, 0, -1, 30, 1, 1, 0xc89a62); sp.ell(35, 1, 0, 5, 1, 3, 0xc89a62); prop(group, sp, 0.2, 2, -0.15, -9, 0.3);
    },
    ambient(group) {
      const k = group.userData.spout; let t = 0;
      return { update(dt) { t += dt; if (k && U.vrand() < dt * 3) FX.burst(new V3(k.position.x + 6.3, k.position.y + 6.6, k.position.z - 3.6), { n: 1, color: [0xffffff, 0xeeeeee], speed: 0.8, size: 0.35, gravity: -2, life: 1.6, up: 1, floor: -9 }); } };
    },
  };
  HAZ.burner = {
    name: 'THE BURNERS', desc: 'The two burners take turns: glowing red is the warning, orange is HOT. Hot launches you.',
    init: () => ({ n: -1, p: -1, on: [0, 0] }),
    step(M, S) {
      const c = cyc(S, 6, 8); if (!c) return;
      if (c.n !== S.n) { S.n = c.n; const r1 = U.rand(), r2 = U.rand(), both = S.t > 36 && r2 < 0.4, one = r1 < 0.5 ? 0 : 1; S.on = [both || one === 0 ? 1 : 0, both || one === 1 ? 1 : 0]; }
      S.p = c.p; if (c.p < 1.3 || c.p > 3.1) return;
      for (let b = 0; b < 2; b++) if (S.on[b]) for (const f of M.fighters) {
        const dx = f.pos.x - BURN[b][0], dz = f.pos.z - BURN[b][1];
        if (f.pos.y < 0.7 && Math.hypot(dx, dz) < 1.75) Combat.hazard(f, { dmg: 45, kb: [5, 11], dir: { x: dx, z: dz }, call: 'HOT!', flash: 0xff6a20, colors: [0xffd040, 0xff6a20, 0x3a3a3a], sfx: 'sizzle' });
      }
    },
    danger(M, S, f) {
      if (S.p < 0 || S.p > 3.1) return null;
      for (let b = 0; b < 2; b++) if (S.on[b]) { const dx = f.pos.x - BURN[b][0], dz = f.pos.z - BURN[b][1]; if (Math.hypot(dx, dz) < 2.4) return { x: dx || 1, z: dz }; }
      return null;
    },
    build(group) {
      const V = { b: [], s: -9 };
      for (const [x, z] of BURN) V.b.push({ x, z, disc: decal(group, new THREE.CircleGeometry(1.75, 40), 0xff3a10, 0, x, z, 0.03, true), coils: [0.45, 0.9, 1.35].map(r => decal(group, new THREE.RingGeometry(r - 0.1, r + 0.1, 48), 0xff8a2a, 0, x, z, 0.035, true)) });
      return V;
    },
    draw(V, M, S) {
      V.b.forEach((B, k) => {
        const on = S && S.on[k] && S.p >= 0 && S.p < 4.0, hot = on && S.p >= 1.3 && S.p < 3.1; let a = 0;
        if (on) a = S.p < 1.3 ? (0.15 + 0.25 * pulse(M.time, 10)) * (0.4 + 0.6 * S.p / 1.3) : S.p < 3.1 ? 0.8 + 0.15 * pulse(M.time, 30) : 0.8 * (1 - (S.p - 3.1) / 0.9);
        B.disc.material.opacity = a * 0.45; B.coils.forEach(m => { m.material.opacity = a; m.material.color.setHex(on && S.p >= 1.3 ? 0xffa040 : 0xff3010); });
        if (hot && U.vrand() < 0.6) FX.burst(new V3(B.x + U.vrnd(-1.3, 1.3), 0.1, B.z + U.vrnd(-1.3, 1.3)), { n: 1, color: [0xffd040, 0xff7a20, 0xff4010], glow: true, speed: 1.5, size: 0.12, gravity: -6, life: 0.5, up: 1 });
      });
      if (S && S.p >= 1.3 && S.p < 3.1 && V.s !== S.n) { V.s = S.n; SFX.play('sizzle'); }
    },
  };

  /* ========================================================= 3. BATH TIME */
  const DRAIN = [0, 0], DAISY = [[-5.6, 3.6, 0xff6aa8], [-2.4, 1.2, 0x9a7aff], [1.6, 3.9, 0x4ad08a], [5.4, 0.8, 0xff8a5a], [-6.0, -2.4, 0x4aa0ff], [4.6, -3.4, 0xff6aa8], [-2.8, -4.6, 0xffb020], [2.6, -0.9, 0xff6aa8], [6.6, 4.4, 0x9a7aff], [-4.4, 0.2, 0xff8a5a]];
  TH.bathtub = {
    name: 'BATH TIME', haz: 'geyser', tag: 'The bath is draining, and the drain fights back',
    sky: [0x9ad8ff, 0xd8f0ff, 0x5a8aa8], fog: 0xc4e4f6, hemi: [0xf4fbff, 0x6a8aa0, 0.78], sun: [0xfffaf0, 0.82],
    floor: (x, z) => { const r = Math.hypot(wx(x) - DRAIN[0], wz(z) - DRAIN[1]);
      if (r < 0.55) return r < 0.42 && (x % 2 === 0) ? 0x3a4048 : 0xa8b0bc;
      for (const [fx, fz, c] of DAISY) { const X = wx(x) - fx, Z = wz(z) - fz, d = Math.hypot(X, Z);   // the non-slip daisies
        if (d < 0.2) return 0xffd040; if (d < 0.66 && Math.cos(Math.atan2(Z, X) * 5) > -0.25) return c; }
      return hh(x, 3, z) > 0.9 ? 0xd8eaf6 : 0xe4f0f8; },
    wall: (x, y, i) => y > 7 ? 0xffffff : (y === 4 || y === 5) ? ((i >> 1) % 2 ? 0x5ab0e8 : 0x7ac4f0) : (y < 2 ? 0xd4e2ec : 0xe8f0f6),
    edge: 0xffffff, dust: [0xbfe4ff, 0xffffff], out: 0x6ab8e4, outY: -2, post: 0xe8eef4,
    scenery(group, A) {
      const rim = lam(0xf8fbff);
      box(group, 64, 5.5, 4, rim, 0, 0.25, -17); box(group, 4, 5.5, 38, rim, -30, 0.25, 0); box(group, 4, 5.5, 38, rim, 30, 0.25, 0);   // the tub's rim
      backdrop(group, -19.1, 120, 50, lam(0xffffff, { map: tileTex(0xbfe0f0, 0x9ac4dc, 40, 16) }), 3);
      const d = new VX.Grid();                                                                // a rubber duck
      shell(d, 0, 4, 0, 7, 4, 5, (x, y, z) => y < 1 ? -1 : 0xffd83a); shell(d, 5, 9, 0, 3, 3, 3, 0xffd83a);
      d.box(8, 8, -1, 10, 9, 1, 0xff8a20); d.box(7, 10, -2, 7, 10, -2, 0x1a1a1e); d.box(7, 10, 2, 7, 10, 2, 0x1a1a1e); d.ell(-1, 6, -4, 3, 1, 1, 0xf2c830); d.ell(-1, 6, 4, 3, 1, 1, 0xf2c830);
      A.props.duck = prop(group, d, 0.5, -15, -2.3, -8, 0.7);
      const f = new VX.Grid(); f.box(-2, 0, -2, 2, 2, 2, 0xd8dce4); f.line(0, 2, 0, 0, 10, 0, 0xc8ccd4, 1.3); f.line(0, 10, 0, 0, 10, 9, 0xc8ccd4, 1.3); f.box(-1, 7, 8, 1, 9, 10, 0xb8bcc4);   // the tap
      for (const [sx, c] of [[-5, 0xe0343f], [5, 0x3f7fe0]]) { f.box(sx, 0, 0, sx, 3, 0, 0xc8ccd4); f.box(sx - 2, 3, 0, sx + 2, 3, 0, c); f.box(sx, 3, -2, sx, 3, 2, c); }
      prop(group, f, 0.4, 0, 3, -16.2);
      const b = new VX.Grid(); b.box(-4, 0, -2, 4, 16, 2, 0x9a5ad0); b.box(-3, 17, -1, 3, 19, 1, 0xf4f4f4); b.box(-2, 6, 2, 2, 11, 2, 0xf4f4f4); prop(group, b, 0.35, 21, 3, -16.5, -0.2);
      const soap = new VX.Grid(); soap.ell(0, 2, 0, 7, 2, 4, 0xffb0c8); prop(group, soap, 0.3, -20, 3, -16.5, 0.2);
    },
    ambient(group, A) {
      const geo = new THREE.SphereGeometry(1, 12, 8), mat = basic(0xeaf8ff, 0.35), B = [];
      for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(geo, mat); const s = U.vrnd(0.15, 0.45); m.scale.setScalar(s); m.position.set(U.vrnd(-24, 24), U.vrnd(-2, 10), U.vrnd(-15, 12)); if (Math.abs(m.position.x) < 9 && Math.abs(m.position.z) < 7) m.position.x += 18 * Math.sign(m.position.x || 1); m.userData.v = U.vrnd(0.3, 0.8); group.add(m); B.push(m); }
      let t = 0; const duck = A.props.duck, dy = duck.position.y;
      return { update(dt) { t += dt; for (const m of B) { m.position.y += m.userData.v * dt; m.position.x += Math.sin(t * 1.3 + m.userData.v * 9) * dt * 0.3; if (m.position.y > 12) m.position.y = -1.8; }
        duck.position.y = dy + Math.sin(t * 1.4) * 0.12; duck.rotation.z = Math.sin(t * 1.1) * 0.05; duck.rotation.y = 0.7 + Math.sin(t * 0.3) * 0.2; } };
    },
  };
  HAZ.geyser = {
    name: 'THE DRAIN', desc: 'Every 8.5 s the drain at the back gurgles, then blows a spout of water that throws you sky high.',
    init: () => ({ n: -1, p: -1 }),
    step(M, S) {
      const c = cyc(S, 6, 8.5); if (!c) return; S.n = c.n; S.p = c.p; if (c.p < 1.4 || c.p > 2.3) return;
      for (const f of M.fighters) { const dx = f.pos.x - DRAIN[0], dz = f.pos.z - DRAIN[1]; if (f.pos.y < 4 && Math.hypot(dx, dz) < 1.4) Combat.hazard(f, { dmg: 25, kb: [2.5, 17], dir: { x: dx, z: dz || 1 }, call: 'SPLASH!', flash: 0x9ad8ff, colors: [0xffffff, 0x9ad8ff, 0x5ab8e8], sfx: 'splash' }); }
    },
    danger(M, S, f) { if (S.p < 0 || S.p > 2.3) return null; const dx = f.pos.x - DRAIN[0], dz = f.pos.z - DRAIN[1]; return Math.hypot(dx, dz) < 2.1 ? { x: dx || 1, z: dz || 1 } : null; },
    build(group) {
      const V = { s: -9 }; V.ring = decal(group, new THREE.RingGeometry(1.1, 1.4, 40), 0xffffff, 0, DRAIN[0], DRAIN[1], 0.04);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.25, 1, 18, 1, true), basic(0x9ad8ff, 0.55, false, THREE.DoubleSide)); col.geometry.translate(0, 0.5, 0);
      col.position.set(DRAIN[0], 0, DRAIN[1]); col.visible = false; group.add(col); V.col = col; return V;
    },
    draw(V, M, S) {
      const p = S ? S.p : -1, warn = p >= 0 && p < 1.4;
      V.ring.material.opacity = warn ? 0.3 + 0.4 * pulse(M.time, 12) : 0; V.ring.scale.setScalar(warn ? 0.7 + 0.3 * p / 1.4 : 1);
      if (warn && U.vrand() < 0.5) FX.burst(new V3(DRAIN[0] + U.vrnd(-0.6, 0.6), 0.1, DRAIN[1] + U.vrnd(-0.6, 0.6)), { n: 1, color: [0xffffff, 0xd8f0ff], speed: 1, size: 0.1, gravity: -4, life: 0.6, up: 1 });
      const on = p >= 1.4 && p < 2.5; V.col.visible = on;
      if (on) { const k = (p - 1.4) / 1.1; V.col.scale.set(1, 7 * Math.sin(Math.min(1, k * 2.2) * Math.PI / 2) * (k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1) + 0.01, 1);
        if (U.vrand() < 0.8) FX.burst(new V3(DRAIN[0], V.col.scale.y, DRAIN[1]), { n: 3, color: [0xffffff, 0x9ad8ff], speed: 5, size: 0.12, life: 0.8, up: 0.6 });
        if (V.s !== S.n) { V.s = S.n; SFX.play('splash'); FX.addShake(0.3); } }
    },
  };

  /* ===================================================== 4. PINBALL TABLE */
  const BUMP = [[-6.3, 0], [6.3, 0]], BR = 0.7;   // (on the fighting line, out by the ends: they guard the edges)
  TH.pinball = {
    name: 'PINBALL TABLE', haz: 'bumper', tag: 'Three pop bumpers: touch one and it fires you off',
    sky: [0x0a0820, 0x3a1a6a, 0x05040e], fog: 0x1a1040, hemi: [0xc8c0ff, 0x1a1030, 0.75], sun: [0xffffff, 0.85],
    floor: (x, z) => { const X = wx(x), Z = wz(z);
      for (const b of BUMP) if (Math.abs(Math.hypot(X - b[0], Z - b[1]) - 1.25) < 0.1) return G(0xffd040);   // lit rings round the bumpers
      const lx = (x % 16) - 8, lz = z % 8;
      if (z > 30 && lz < 4 && Math.abs(lx) <= 3 - lz) return G([0xff3a6a, 0x3af0ff, 0x7aff5a, 0xffd040][(x >> 4) % 4]);   // arrows up the lanes
      if (hh(x, 4, z) > 0.988) return G(0xffffff);
      return ((x >> 2) + (z >> 2)) % 2 ? 0x1a2a72 : 0x1c2e7a; },
    wall: (x, y, i) => y === 5 ? G([0xff3a6a, 0xffd040, 0x3af0ff][Math.floor(i / 4) % 3]) : (y % 3 === 0 ? 0x9aa0aa : 0xc8ccd4),
    edge: 0xff3a6a, dust: [0x3af0ff, 0xffd040], out: 0x101a50, outY: -0.6, post: 0xc8ccd4,
    scenery(group, A) {
      const bg = new VX.Grid();                                                               // the backglass
      for (let x = -30; x <= 30; x++) for (let y = 0; y <= 32; y++) {
        let c = (x === -30 || x === 30 || y === 0 || y === 32) ? 0xc8ccd4 : 0x1a0a3a;
        const r = Math.hypot(x, y - 16); if (Math.abs(r - 11) < 1) c = G(0xff3ad8); else if (Math.abs(r - 7) < 0.8) c = G(0x3af0ff); else if (r < 3) c = G(0xffd040);
        else if (c === 0x1a0a3a && hh(x, y, 5) > 0.95) c = G(0xffffff);
        bg.set(x, y, 0, c);
      }
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; bg.line(Math.cos(a) * 3, 16 + Math.sin(a) * 3, -1, Math.cos(a) * 6, 16 + Math.sin(a) * 6, -1, G(0xffd040)); }
      const back = prop(group, bg, 0.4, 0, 1, -14); back.rotation.x = -0.18;
      const fl = new VX.Grid(); fl.box(0, 0, -1, 14, 1, 1, 0xf4f4f4); fl.box(0, 0, -2, 14, 1, -2, 0xe02a2a); fl.box(0, 0, 2, 14, 1, 2, 0xe02a2a); fl.cyl('y', 0, 0, 2, 0, 1, 0xf4f4f4);
      A.props.flip = [prop(group, fl, 0.2, -3.6, -0.55, 8.4, -0.45), prop(group, fl, 0.2, 3.6, -0.55, 8.4, Math.PI + 0.45)];
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshPhongMaterial({ color: 0xd8dce4, specular: 0xffffff, shininess: 90 })); ball.castShadow = true; group.add(ball); A.props.ball = ball;
    },
    ambient(group, A) {
      let t = 0, ft = [0, 0]; const ball = A.props.ball, F = A.props.flip;
      return { update(dt) { t += dt; const a = t * 0.55; ball.position.set(Math.cos(a) * 11.5, -0.05, Math.sin(a) * 8.6); ball.rotation.z -= dt * 3;
        F.forEach((f, k) => { if (ft[k] <= 0 && U.vrand() < dt * 0.4) ft[k] = 0.3; ft[k] -= dt; const up = ft[k] > 0 ? 0.6 : 0; const base = k ? Math.PI + 0.45 : -0.45; f.rotation.y = U.smooth(f.rotation.y, base + (k ? -up : up), 30, dt); }); } };
    },
  };
  HAZ.bumper = {
    name: 'POP BUMPERS', desc: 'Touch a bumper and it kicks you away. A figure flying into one bounces off it, harder than off a wall.',
    init: () => ({ lit: [-9, -9, -9], said: [-9, -9, -9] }),
    step(M, S) {
      BUMP.forEach((b, k) => { for (const f of M.fighters) {
        if (f.state === 'out' || f.state === 'held' || f.pos.y > 1.3) continue;
        const dx = f.pos.x - b[0], dz = f.pos.z - b[1], r = Math.hypot(dx, dz), R = BR + 0.4; if (r >= R) continue;
        const nx = r > 1e-3 ? dx / r : 1, nz = r > 1e-3 ? dz / r : 0;
        f.pos.x = b[0] + nx * R; f.pos.z = b[1] + nz * R;
        const vin = f.vel.x * nx + f.vel.z * nz;
        if (f.state === 'tumble' || f.state === 'ko' || f.comboing) {
          if (vin < 0) { const kick = -vin * 2.3 + 3; f.vel.x += nx * kick; f.vel.z += nz * kick; f.vel.y = Math.max(f.vel.y, 5); S.lit[k] = S.t;
            if (S.t - S.said[k] > 0.5) { S.said[k] = S.t; M.call(f, 'BUMPER!', 'bounce'); SFX.play('bumper'); } }
        } else if (Combat.hazard(f, { dmg: 12, push: 13, stun: 0.3, dir: { x: nx, z: nz }, call: 'BUMPER!', cd: 0.5, flash: 0xffd040, sfx: 'bumper' })) S.lit[k] = S.t;
        else if (vin < 0) { f.vel.x -= vin * nx; f.vel.z -= vin * nz; }
      } });
    },
    build(group) {
      const V = { b: [] }, g = new VX.Grid();
      g.cyl('y', 0, 0, 4, 0, 4, 0xf4f4f4); g.cyl('y', 0, 0, 5, 1, 2, 0xe02a2a); g.cyl('y', 0, 0, 6, 5, 6, 0xe02a2a); g.cyl('y', 0, 0, 4, 7, 7, G(0xfff0a0));
      for (const [x, z] of BUMP) { prop(group, g, 0.125, x, 0.0625, z, 0, { cast: true }); V.b.push(decal(group, new THREE.RingGeometry(0.85, 1.15, 36), 0xffe070, 0, x, z, 0.05, true)); }
      return V;
    },
    draw(V, M, S) { V.b.forEach((m, k) => { const a = S ? Math.max(0, 1 - (S.t - S.lit[k]) / 0.3) : 0; m.material.opacity = a; m.scale.setScalar(1 + (1 - a) * 0.3); }); },
  };

  /* ====================================================== 5. NEON ARCADE */
  TH.neon = {
    name: 'NEON ARCADE', tag: 'After hours on the arcade floor',
    sky: [0x12042a, 0xff3a9a, 0x08021a], fog: 0x2a0844, fogR: [30, 110], hemi: [0xb890ff, 0x1a0630, 0.7], sun: [0xffd0ff, 0.75],
    floor: (x, z) => z % 8 === 0 ? G(0x3af0ff) : x % 8 === 0 ? G(0xff3ad8) : (hh(x, 5, z) > 0.97 ? 0x2a1450 : 0x140a2a),
    wall: (x, y, i, w) => { const c = i % 8, cab = Math.floor(i / 8), body = [0x5a2ad0, 0xd02a6a, 0x2a7ad0, 0x2ab88a][cab % 4];
      if (c === 0 || c === 7) return 0x14101e;
      if (w && w.h <= 3) return y === 1 && (c === 3 || c === 4) ? G(0xffa030) : body;
      if (y >= 4 && y <= 7 && c >= 2 && c <= 5) return G(hh(i, y, cab) > 0.3 ? [0x3af0ff, 0x7aff5a, 0xff3ad8, 0xffd040][(cab + y) % 4] : 0x3a2a6a);
      return y === 9 ? G(body) : body; },
    noEdge: true, dust: [0xff3ad8, 0x3af0ff], out: 0x0a0418, outY: -6, post: 0x2a1450,
    outMat: () => new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, g => { g.fillStyle = '#0a0418'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ff3ad8'; g.fillRect(0, 0, 64, 3); g.fillRect(0, 0, 3, 64); }, 60, 60) }),
    scenery(group, A) {
      const sun = new VX.Grid();                                                              // a striped sunset sun on the horizon
      for (let x = -30; x <= 30; x++) for (let y = 0; y <= 30; y++) { if (x * x + y * y > 900) continue; if (y < 16 && (y % 4 === 0 || (y < 8 && y % 2 === 0))) continue;
        sun.set(x, y, 0, G(y > 20 ? 0xffe04a : y > 12 ? 0xff9a3a : 0xff3a8a)); }
      prop(group, sun, 0.9, 0, -6, -62);
      const mt = new VX.Grid();
      for (const [cx, hgt, wd] of [[-40, 14, 16], [-22, 20, 18], [-4, 12, 14], [14, 18, 16], [34, 15, 18]]) for (let y = 0; y <= hgt; y++) { const half = Math.round(wd * (1 - y / hgt)); for (let x = -half; x <= half; x++) mt.set(cx + x, y, 0, Math.abs(x) >= half - 0.5 ? G(0xff3ad8) : 0x1a0838); }
      prop(group, mt, 0.9, 0, -6, -50);
      const js = new VX.Grid(); js.box(-6, 0, -6, 6, 3, 6, 0x1a1a24); js.box(-1, 4, -1, 1, 13, 1, 0x2a2a34); js.ell(0, 16, 0, 3, 3, 3, 0xe0343f); prop(group, js, 0.45, -14, -6, -10, 0.3);
      const bt = new VX.Grid(); bt.box(-10, 0, -4, 10, 3, 4, 0x1a1a24); for (const [x, c] of [[-6, 0x3af0ff], [0, 0xffd040], [6, 0xff3ad8]]) { bt.cyl('y', x, 0, 2, 4, 4, c); bt.cyl('y', x, 0, 1, 5, 5, G(c)); }
      prop(group, bt, 0.45, 14, -6, -10, -0.3);
      A.props.lights = [0xff3ad8, 0x3af0ff].map((c, k) => { const l = new THREE.PointLight(c, 0.9, 28); l.position.set(k ? 9 : -9, 5, -3); group.add(l); return l; });
    },
    ambient(group, A) { let t = 0; return { update(dt) { t += dt; A.props.lights.forEach((l, k) => { l.position.x = Math.cos(t * 0.5 + k * Math.PI) * 10; l.position.z = Math.sin(t * 0.5 + k * Math.PI) * 6 - 1; l.intensity = 0.7 + 0.3 * Math.sin(t * 3 + k); }); } }; },
  };

  /* ======================================================= 6. CANDY SHOP */
  const LANES = [-4.6, 0, 4.6], BALLC = [0xff3a6a, 0x3a9aff, 0xffd040, 0x5ad84a, 0xff8a2a, 0xb05ae0];
  TH.candy = {
    name: 'CANDY SHOP', haz: 'gumball', tag: 'The gumball machine rolls its gumballs down the lanes',
    sky: [0xffc8ec, 0xfff0f8, 0x8a4a6a], fog: 0xffe0f0, hemi: [0xfff4ff, 0x8a5a7a, 0.9], sun: [0xfff6f0, 0.95],
    floor: (x, z) => (x % 8 === 0 || z % 8 === 0) ? 0x4a2414 : ((x % 8 === 1 || z % 8 === 1) ? 0x7c4628 : 0x6a3a1e),   // a chocolate bar
    wall: (x, y, i) => ((i + y) % 6 < 3) ? 0xf03a4a : 0xfff4f4,
    edge: 0xffd0e4, dust: [0x6a3a1e, 0xffd0e4], out: 0xf08ab8, outY: -9, post: 0xfff4f4,
    scenery(group) {
      box(group, 120, 1, 46, 0xf4d4e4, 0, -0.8, -31);
      backdrop(group, -34, 120, 44, lam(0xffffff, { map: canvasTex(64, 64, g => { g.fillStyle = '#ffe4f0'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ffc8e0'; g.fillRect(0, 0, 32, 64); }, 30, 1) }), -0.3);
      const m = new VX.Grid();                                                                // the gumball machine
      m.box(-8, 0, -8, 8, 10, 8, 0xd8202a); m.box(-3, 4, 8, 3, 7, 9, 0xc8ccd4); m.box(-2, 1, 8, 2, 2, 10, 0xc8ccd4);
      shell(m, 0, 21, 0, 10, 10, 10, (x, y, z) => hh(x, y, z) > 0.92 ? 0xffffff : BALLC[Math.floor(hh(z, x, y) * 6)], 0.55);
      m.cyl('y', 0, 0, 5, 31, 33, 0xd8202a); m.ell(0, 35, 0, 2, 2, 2, 0xd8202a);
      prop(group, m, 0.5, 0, -0.3, -16);
      const lolly = c => { const g = new VX.Grid(); g.box(0, 0, 0, 0, 16, 0, 0xf4f4f4); g.cyl('z', 0, 22, 6, -1, 1, (x, y) => (Math.floor(Math.atan2(y - 22, x) * 1.6 + Math.hypot(x, y - 22) * 0.7) % 2) ? c : 0xffffff); return g; };
      prop(group, lolly(0x3fbf6a), 0.4, -14, -0.3, -11, 0.4); prop(group, lolly(0x9a5ad0), 0.45, 15, -0.3, -12, -0.3);
      const cup = new VX.Grid(); cup.cyl('y', 0, 0, 5, 0, 5, (x, y, z) => (x + z) % 2 ? 0x5ab8e8 : 0x8ad0f4); cup.ell(0, 8, 0, 6, 4, 6, 0xffd8ec); cup.ell(0, 13, 0, 1, 1, 1, 0xe0202a);
      prop(group, cup, 0.4, -6.5, -0.3, -10.5);
      const wrap = c => { const g = new VX.Grid(); g.ell(0, 2, 0, 4, 2, 2, c); g.box(-7, 1, -1, -5, 3, 1, c); g.box(5, 1, -1, 7, 3, 1, c); return g; };
      prop(group, wrap(0xffd040), 0.3, 6.5, -0.3, -9.6, 0.5); prop(group, wrap(0x3a9aff), 0.3, 9, -0.3, -11, -0.3); prop(group, wrap(0xff3a6a), 0.3, -10, -0.3, -9.3, 0.2);
    },
  };
  HAZ.gumball = {
    name: 'GUMBALLS', desc: 'A lane lights up, then a gumball the size of you drops in and rolls down it. Step out of the lane.',
    init: () => ({ n: -1, p: -1, lanes: [1] }),
    bz: p => -5.6 + 9 * (p - 1.2),
    step(M, S) {
      const c = cyc(S, 7, 6.5); if (!c) return;
      if (c.n !== S.n) { S.n = c.n; const a = laneFor(M, c.n, LANES), r2 = U.rand(), r3 = U.rand(); S.lanes = S.t > 40 && r2 < 0.5 ? [a, (a + 1 + Math.floor(r3 * 2)) % 3] : [a]; }
      S.p = c.p; if (c.p < 1.2 || c.p > 2.6) return;
      const bz = HAZ.gumball.bz(c.p);
      for (const li of S.lanes) for (const f of M.fighters) { const lx = LANES[li];
        if (Math.abs(f.pos.x - lx) < 1.15 && Math.abs(f.pos.z - bz) < 1.15 && f.pos.y < 1.6) Combat.hazard(f, { dmg: 45, kb: [11, 8], dir: { x: awayX(f, lx) * 0.4, z: 1 }, call: 'GUMBALL!', flash: 0xff6ab8, colors: [0xff6ab8, 0xffd040, 0x7ad8ff] }); }
    },
    danger(M, S, f) {
      if (S.p < 0 || S.p > 2.6) return null; const bz = HAZ.gumball.bz(Math.max(1.2, S.p));
      for (const li of S.lanes) { const lx = LANES[li]; if (Math.abs(f.pos.x - lx) < 1.7 && f.pos.z > bz - 1.2) return { x: awayX(f, lx), z: 0 }; }
      return null;
    },
    build(group) {
      const V = { lanes: [], balls: [], popped: [-9, -9], ss: -9 }, g = new VX.Grid();
      g.ell(0, 0, 0, 6, 6, 6, (x, y, z) => (x < -2 && y > 2 && z > 0 && hh(x, y, z) > 0.4) ? 0xffffff : 0xd8d8d8);
      for (let k = 0; k < 2; k++) { const mat = VX.litMat().clone(); const b = VX.object(g, 0.125, { material: mat }); b.children.forEach(c => { c.castShadow = true; }); b.userData.mat = mat; b.visible = false; group.add(b); V.balls.push(b); }
      for (const x of LANES) V.lanes.push(decal(group, new THREE.PlaneGeometry(1.9, 12), 0xffffff, 0, x, 0, 0.04, true));
      return V;
    },
    draw(V, M, S) {
      const p = S ? S.p : -1, col = S ? BALLC[((S.n % 6) + 6) % 6] : 0xffffff;
      V.lanes.forEach((m, li) => { const on = S && p >= 0 && p < 2.6 && S.lanes.includes(li); m.material.opacity = on ? (p < 1.2 ? 0.12 + 0.2 * pulse(M.time, 14) : 0.1) : 0; m.material.color.setHex(col); });
      V.balls.forEach((b, k) => {
        const li = S && S.lanes[k]; if (li == null || p < 0.85 || p > 2.6) { b.visible = false; return; }
        const x = LANES[li]; let y = 0.75, z = -5.6;
        if (p < 1.2) { const u = (p - 0.85) / 0.35; y = 4.2 - 3.45 * u * u; } else z = HAZ.gumball.bz(p);
        if (z > 5.3) { b.visible = false; if (V.popped[k] !== S.n) { V.popped[k] = S.n; FX.burst(new V3(x, 0.8, 5.6), { n: 22, color: [col, 0xffffff], speed: 7, size: 0.13, life: 0.7 }); SFX.play('pop'); } return; }
        b.visible = true; b.userData.mat.color.setHex(col); b.position.set(x, y + 0.06, z); b.rotation.x = z / 0.75;
      });
      if (S && p >= 1.2 && p < 1.3 && V.ss !== S.n) { V.ss = S.n; SFX.play('roll'); FX.addShake(0.2); }
    },
  };

  /* ================================================== 7. RAINY WINDOWSILL */
  TH.windowsill = {
    name: 'RAINY WINDOWSILL', tag: 'A grey afternoon on the windowsill, next to the cat',
    sky: [0x26303e, 0x4e5c70, 0x161a22], fog: 0x3a4656, fogR: [30, 120], hemi: [0xb8c8e0, 0x2a2a34, 0.75], sun: [0xd8e4ff, 0.75],
    floor: (x, z) => { const X = wx(x) / 5.2, Z = wz(z) / 3.4, e = X * X + Z * Z;
      if (e < 1) { if (e > 0.86) return 0x8a5a2a; const a = Math.atan2(Z, X); return ((Math.floor(a * 9 / Math.PI) + Math.floor(Math.sqrt(e) * 7)) % 2) ? 0xd8a858 : (Math.sqrt(e) < 0.3 ? 0xd85a4a : 0xc89040); }   // a woven placemat
      return z % 8 === 0 ? 0xcfc2a8 : (hh(x >> 1, 6, z) > 0.8 ? 0xe8dcc4 : 0xf0e6d0); },
    wall: (x, y, i, w) => (w && w.axis === 'x') ? (y % 5 === 0 ? 0xa04a2a : (hh(i, y, 8) > 0.85 ? 0xc06038 : 0xb4562e)) : (y % 4 === 0 ? 0xe0dcd4 : 0xf4f0ea),
    edge: 0xf8f6f2, dust: [0xf0e6d0, 0xd8a858], out: 0xe8dcc4, outY: -0.5, outSize: [120, 14, -0.5], post: 0xf4f0ea,
    scenery(group, A) {
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(80, 26), basic(0x9ab8d8, 0.12)); glass.position.set(0, 13, -7.4); group.add(glass);
      A.props.flash = new THREE.Mesh(new THREE.PlaneGeometry(200, 80), basic(0xe8f0ff, 0)); A.props.flash.position.set(0, 20, -40); group.add(A.props.flash);
      const fr = lam(0xf4f0ea); for (const x of [-30, -15, 0, 15, 30]) box(group, 0.6, 26, 0.6, fr, x, 13, -7.3); for (const y of [0.2, 13, 26]) box(group, 80, 0.6, 0.6, fr, 0, y, -7.3);
      const city = new THREE.Group(), cm = lam(0x1e2836), wg = new VX.Grid();
      for (let k = 0; k < 16; k++) { const x = -60 + k * 8 + hh(k, 1, 2) * 4, h = 10 + hh(k, 2, 3) * 26, w = 5 + hh(k, 3, 4) * 3; box(city, w, h, 6, cm, x, -8 + h / 2, -72);
        for (let wy = 0; wy < h - 2; wy += 2) for (let wx2 = -w / 2 + 1; wx2 < w / 2 - 0.5; wx2 += 1.5) if (hh(k * 31 + wy, Math.round(wx2 * 7), 9) > 0.62) wg.set(Math.round(x / 0.5 + wx2 * 2), Math.round((-8 + wy + 1) / 0.5), 0, G(0xffd890)); }
      group.add(city); prop(group, wg, 0.5, 0, 0, -68.8);
      const cat = new VX.Grid(), fur = (x, y, z) => (Math.sin(x * 0.55 + z * 0.1) > 0.55 ? 0xc8702a : (hh(x, y, z) > 0.85 ? 0xf0a050 : 0xe8903a));   // a sleeping cat, enormous
      shell(cat, 0, 9, 0, 22, 10, 12, (x, y, z) => y < 1 ? -1 : fur(x, y, z), 0.6);
      shell(cat, 20, 9, 6, 8, 7, 8, (x, y, z) => (x > 25 && y < 9 && Math.abs(z - 6) < 4) ? 0xf8f0e8 : fur(x, y, z), 0.5);
      cat.box(16, 15, 0, 18, 18, 2, 0xe8903a); cat.box(16, 15, 10, 18, 18, 12, 0xe8903a); cat.box(17, 16, 1, 17, 17, 1, 0xffb0b0); cat.box(17, 16, 11, 17, 17, 11, 0xffb0b0);
      cat.box(27, 11, 3, 28, 11, 5, 0x3a2414); cat.box(27, 11, 7, 28, 11, 9, 0x3a2414); cat.box(29, 8, 6, 29, 8, 6, 0xd86a7a);
      cat.line(-20, 3, 8, -6, 2, 14, 0xe8903a, 2.2); cat.line(-6, 2, 14, 12, 2, 14, 0xe8903a, 2.2);
      A.props.cat = prop(group, cat, 0.25, -17, -0.5, -3, 0);
      const pot = (plant) => { const g = new VX.Grid(); g.cyl('y', 0, 0, 5, 0, 7, (x, y) => y === 7 ? 0xc06038 : 0xb4562e); g.cyl('y', 0, 0, 4, 8, 8, 0x4a3020); plant(g); return g; };
      prop(group, pot(g => { g.ell(0, 16, 0, 3, 8, 3, 0x4a9a4a); g.ell(5, 15, 0, 2, 4, 2, 0x4a9a4a); g.box(2, 14, 0, 4, 14, 0, 0x4a9a4a); }), 0.35, 12.5, -0.5, -4.5);
      prop(group, pot(g => { g.box(0, 8, 0, 0, 18, 0, 0x3a7a3a); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.ell(Math.cos(a) * 3, 20, Math.sin(a) * 3, 2, 1, 2, 0xff6a9a); } g.ell(0, 20, 0, 1, 1, 1, 0xffd040); }), 0.35, 17, -0.5, -1);
    },
    ambient(group, A) {
      const drops = [], mat = basic(0xd8e8ff, 0.35), geo = new THREE.PlaneGeometry(0.06, 0.9);
      for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(geo, mat); m.position.set(U.vrnd(-38, 38), U.vrnd(1, 26), -7.5 - U.vrand() * 4); m.userData.v = U.vrnd(10, 18); group.add(m); drops.push(m); }
      let t = 0, next = U.vrnd(5, 12), fl = 0, boom = -1; const cat = A.props.cat;
      return { update(dt) { t += dt;
        for (const m of drops) { m.position.y -= m.userData.v * dt; if (m.position.y < 0.5) { m.position.y = 26; m.position.x = U.vrnd(-38, 38); } }
        next -= dt; if (next <= 0) { next = U.vrnd(7, 16); fl = 1; boom = U.vrnd(0.4, 1.4); }
        if (boom > 0) { boom -= dt; if (boom <= 0) SFX.play('thunder'); }
        fl = Math.max(0, fl - dt * 3); A.props.flash.material.opacity = fl * (0.6 + 0.4 * Math.sin(t * 60));
        cat.scale.y = 1 + Math.sin(t * 1.6) * 0.025; } };
    },
  };

  /* ======================================================= 8. SNOW GLOBE */
  TH.snowglobe = {
    name: 'SNOW GLOBE', haz: 'shake', tag: 'Someone keeps shaking the globe: the gale shoves everyone',
    sky: [0x6aa8e8, 0xd8ecff, 0x3a5a7a], fog: 0xc8dcf0, hemi: [0xeaf4ff, 0x5a6a8a, 0.95], sun: [0xfff8f0, 0.9],
    floor: (x, z) => hh(x, 7, z) > 0.75 ? 0xe2eaf6 : (hh(x, 8, z) > 0.975 ? G(0xffffff) : 0xf2f6fc),
    wall: (x, y, i) => y < 3 ? (hh(i, y, 9) > 0.6 ? 0xb8cce4 : 0xc4d6ec) : (hh(i, y, 10) > 0.8 ? 0xe4ecf8 : 0xf0f6ff),
    edge: 0xffffff, dust: [0xffffff, 0xd8e4f4], out: 0xf0f4fa, outY: -1.5, post: 0xc4d6ec, plinth: 0xd8e4f4,
    scenery(group) {
      const house = (c, roof) => { const g = new VX.Grid(); g.box(-5, 0, -4, 5, 7, 4, c); for (let k = 0; k < 5; k++) g.box(-6 + k, 8 + k, -5, 6 - k, 8 + k, 5, k === 4 ? 0xffffff : roof);
        g.box(-6, 8, -5, 6, 8, 5, 0xffffff); g.box(-1, 0, 4, 1, 4, 4, 0x5a3a24); for (const x of [-4, 3]) g.box(x, 4, 4, x + 1, 5, 4, G(0xffd890)); g.box(3, 11, -2, 4, 15, -1, 0x8a4a3a); return g; };
      [[0xc8302a, 0x6a2a2a, -13, -10, 0.4], [0x3a6ad0, 0x2a3a6a, 12, -11, -0.5], [0xf2c230, 0x8a5a2a, -1, -15, 0.1], [0x3fbf6a, 0x2a5a3a, 15, -1, -1.2], [0xf4e8d0, 0x6a4a3a, -15, 0, 1.3]].forEach(([c, r, x, z, ry]) => prop(group, house(c, r), 0.42, x, -1.5, z, ry));
      const pine = new VX.Grid(); pine.box(0, 0, 0, 0, 3, 0, 0x6a4a2a); for (let y = 0; y < 12; y++) { const r = Math.max(0.6, (12 - y) * 0.45 + (y % 4 === 0 ? 0.6 : 0)); pine.cyl('y', 0, 0, r, y + 3, y + 3, (x, yy, z) => y % 4 === 0 && hh(x, yy, z) > 0.4 ? 0xffffff : 0x2a7a4a); }
      [[-9, -12], [7, -14], [-17, -7], [18, -8], [-4, -18], [10, 9], [-11, 9], [19, 5]].forEach(([x, z], k) => prop(group, pine, 0.4 + (k % 3) * 0.08, x, -1.5, z));
      const sm = new VX.Grid(); sm.ell(0, 4, 0, 4, 4, 4, 0xffffff); sm.ell(0, 10, 0, 3, 3, 3, 0xffffff); sm.ell(0, 15, 0, 2, 2, 2, 0xffffff); sm.box(-2, 17, -2, 2, 17, 2, 0x1a1a1e); sm.box(-1, 18, -1, 1, 20, 1, 0x1a1a1e); sm.box(0, 15, 2, 0, 15, 4, 0xff8a20);
      prop(group, sm, 0.35, 10.5, -1.5, -6, -0.6);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 40, 20, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, fog: false }));
      dome.position.y = -1.5; group.add(dome);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(31, 32, 6, 56, 1, true), lam(0x6a3a1e, { side: THREE.DoubleSide })); base.position.y = -4.6; group.add(base);
    },
    ambient(group, A) {
      const N = 420, pos = new Float32Array(N * 3), vel = [];
      for (let i = 0; i < N; i++) { pos[i * 3] = U.vrnd(-24, 24); pos[i * 3 + 1] = U.vrnd(-1, 18); pos[i * 3 + 2] = U.vrnd(-20, 16); vel.push(U.vrnd(0.4, 1.0)); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false })); group.add(pts);
      let t = 0;
      return { update(dt, M) { t += dt; const S = M && M.hazards ? M.haz : null, g = S && S.p >= 1.0 && S.p < 3.4 ? Math.sin(Math.min(1, (S.p - 1.0) / 2.4) * Math.PI) : 0;
        for (let i = 0; i < N; i++) { const k = i * 3; pos[k + 1] -= vel[i] * dt * (1 - g * 0.6); pos[k] += (Math.sin(t * 0.7 + i) * 0.3 + (S ? S.dx : 0) * g * 12) * dt; pos[k + 2] += (Math.cos(t * 0.6 + i * 1.3) * 0.3 + (S ? S.dz : 0) * g * 12) * dt + (g ? Math.sin(t * 4 + i) * g * 3 * dt : 0);
          if (g) pos[k + 1] += Math.cos(t * 3 + i * 0.7) * g * 4 * dt;
          if (pos[k + 1] < -1.4) pos[k + 1] = 18; if (pos[k] > 24) pos[k] -= 48; if (pos[k] < -24) pos[k] += 48; if (pos[k + 2] > 16) pos[k + 2] -= 36; if (pos[k + 2] < -20) pos[k + 2] += 36; }
        geo.attributes.position.needsUpdate = true; } };
    },
  };
  HAZ.shake = {
    name: 'THE SHAKE', desc: 'Every 11 s someone shakes the globe: for two seconds a gale shoves everyone across the floor.',
    init: () => ({ n: -1, p: -1, dx: 1, dz: 0 }),
    step(M, S, dt) {
      const c = cyc(S, 8, 11); if (!c) return;
      if (c.n !== S.n) { S.n = c.n; const a = (c.n % 2 ? Math.PI : 0) + U.rnd(-0.5, 0.5); S.dx = Math.cos(a); S.dz = Math.sin(a); }
      S.p = c.p; if (c.p < 1.0 || c.p > 2.8) return;
      const k = Math.sin((c.p - 1.0) / 1.8 * Math.PI) * 6;   // a gust: up and down again
      for (const f of M.fighters) { if (f.state === 'out' || f.state === 'held' || (f.state === 'ko' && f.grounded)) continue; f.pos.x += S.dx * k * dt; f.pos.z += S.dz * k * dt; clampIn(f); }
    },
    build() { return { s: -9 }; },
    draw(V, M, S) {
      if (!S || S.p < 0) return;
      if (S.p < 1.0 && V.s !== S.n) { V.s = S.n; M.call(M.fighters[0], 'SHAKE!', 'break', new V3(0, 3.2, 0)); SFX.play('rumble'); }
      if (S.p >= 1.0 && S.p < 2.8) { FX.addShake(0.04); if (V.g !== S.n) { V.g = S.n; SFX.play('gust'); } }
    },
  };

  /* ======================================================== 9. CHECKMATE */
  function chessPiece(kind, c) {
    const g = new VX.Grid(), rim = c === 0xf2ead8 ? 0xd8ccb4 : 0x2a2a30;
    g.cyl('y', 0, 0, 7, 0, 1, rim); g.cyl('y', 0, 0, 6, 2, 2, c);
    if (kind === 0) { g.cyl('y', 0, 0, 4, 3, 12, c); g.cyl('y', 0, 0, 5, 13, 15, c); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; g.box(Math.round(Math.cos(a) * 4) - 1, 16, Math.round(Math.sin(a) * 4) - 1, Math.round(Math.cos(a) * 4) + 1, 17, Math.round(Math.sin(a) * 4) + 1, c); } }        // rook
    else if (kind === 1) { g.cyl('y', 0, 0, 4, 3, 7, c); g.box(-3, 8, -3, 3, 14, 2, c); g.box(-3, 12, 2, 3, 15, 7, c); g.box(-2, 15, -2, 2, 17, 1, c); g.box(-1, 16, -3, 1, 18, -2, rim); g.box(-1, 14, 7, 1, 14, 7, rim); }   // knight
    else if (kind === 2) { g.cyl('y', 0, 0, 3, 3, 10, c); g.ell(0, 14, 0, 3, 4, 3, c); g.box(-1, 15, 3, 1, 15, 3, rim); g.ell(0, 19, 0, 1, 1, 1, c); }   // bishop
    else if (kind === 3) { g.cyl('y', 0, 0, 3, 3, 12, c); g.cyl('y', 0, 0, 5, 13, 14, c); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.ell(Math.round(Math.cos(a) * 4), 16, Math.round(Math.sin(a) * 4), 1, 1, 1, c); } g.ell(0, 17, 0, 2, 2, 2, c); }   // queen
    else { g.cyl('y', 0, 0, 3, 3, 13, c); g.cyl('y', 0, 0, 5, 14, 15, c); g.box(-1, 16, -1, 1, 22, 1, c); g.box(-3, 19, -1, 3, 20, 1, c); }   // king
    return g;
  }
  TH.chess = {
    name: 'CHECKMATE', haz: 'chess', tag: 'Chess pieces slam down on the square you stand on',
    sky: [0x22222e, 0x5a5a70, 0x0e0e14], fog: 0x40404e, hemi: [0xfff4e0, 0x2a2626, 0.8], sun: [0xfff0d8, 1.05],
    floor: (x, z) => ((x >> 3) + (z >> 3)) % 2 ? (hh(x, 9, z) > 0.8 ? 0x52341f : 0x5a3a24) : (hh(x, 9, z) > 0.8 ? 0xe2cfa8 : 0xead8b4),
    wall: (x, y, i) => y === 7 ? 0xd8b048 : (hh(i, y, 11) > 0.85 ? 0x442a1a : 0x3a2416),
    edge: 0xd8b048, dust: [0xead8b4, 0x5a3a24], out: 0x1a4a2a, outY: -1.2, post: 0x2a1a10, plinth: 0x3a2416,
    scenery(group) {
      prop(group, chessPiece(4, 0xf2ead8), 0.55, -14, -1.2, -12); prop(group, chessPiece(3, 0x2a2a30), 0.55, 13, -1.2, -13, 0.4);
      prop(group, chessPiece(1, 0xf2ead8), 0.5, 17, -1.2, -3, -1.6);
      const pawn = new VX.Grid(); pawn.cyl('y', 0, 0, 6, 0, 1, 0x2a2a30); pawn.cyl('y', 0, 0, 3, 2, 8, 0x2a2a30); pawn.ell(0, 11, 0, 3, 3, 3, 0x2a2a30);
      const p = prop(group, pawn, 0.5, -15.5, -0.2, 3, 0.4); p.rotation.z = Math.PI / 2;
      const clk = new VX.Grid(); clk.box(-12, 0, -4, 12, 10, 4, 0x6a4a2a); for (const x of [-6, 6]) { clk.cyl('z', x, 5, 4, 5, 5, 0xf4f0e6); clk.box(x, 5, 6, x, 8, 6, 0x1a1a1e); clk.box(x - 2, 11, -1, x + 2, 12, 1, x < 0 ? 0xd8b048 : 0xc8ccd4); }
      prop(group, clk, 0.4, 0, -1.2, -16);
    },
  };
  HAZ.chess = {
    name: 'THE PIECES', desc: 'Every 6.5 s the square under someone turns red; a moment later a chess piece slams down on it.',
    init: () => ({ n: -1, p: -1, sq: [], kind: 0, done: 1 }),
    step(M, S) {
      const c = cyc(S, 6, 6.5); if (!c) return;
      if (c.n !== S.n) { S.n = c.n; S.done = 0; S.kind = c.n % 5;
        S.sq = (S.t > 40 ? [0, 1] : [c.n % 2]).map(i => { const f = M.fighters[i]; return [-7 + 2 * U.clamp(Math.floor((f.pos.x + 8) / 2), 0, 7), -5 + 2 * U.clamp(Math.floor((f.pos.z + 6) / 2), 0, 5)]; });
        if (S.sq.length === 2 && S.sq[0][0] === S.sq[1][0] && S.sq[0][1] === S.sq[1][1]) S.sq.length = 1; }
      S.p = c.p;
      if (c.p >= 1.4 && !S.done) { S.done = 1;
        for (const q of S.sq) for (const f of M.fighters) { const dx = f.pos.x - q[0], dz = f.pos.z - q[1];
          if (Math.abs(dx) < 1.15 && Math.abs(dz) < 1.15 && f.pos.y < 2.4) Combat.hazard(f, { dmg: 60, kb: [7, 9], dir: { x: dx || (f.idx ? 1 : -1), z: dz }, call: 'CHECK!', flash: 0xffffff, colors: [0xead8b4, 0x5a3a24, 0xffffff], sfx: 'thud' }); } }
    },
    danger(M, S, f) {
      if (S.p < 0 || S.p >= 1.4) return null;
      for (const q of S.sq) { const dx = f.pos.x - q[0], dz = f.pos.z - q[1]; if (Math.abs(dx) < 1.5 && Math.abs(dz) < 1.5) return Math.abs(dx) > Math.abs(dz) ? { x: Math.sign(dx) || 1, z: 0 } : { x: 0, z: Math.sign(dz) || 1 }; }
      return null;
    },
    build(group) {
      const V = { sq: [], pc: [], slam: -9 };
      for (let k = 0; k < 2; k++) { V.sq.push(decal(group, new THREE.PlaneGeometry(2, 2), 0xff2a1a, 0, 0, 0, 0.04)); V.pc.push([0, 1, 2, 3, 4].map(kind => { const o = VX.object(chessPiece(kind, k ? 0x2a2a30 : 0xf2ead8), 0.125); o.children.forEach(c => { c.castShadow = true; }); o.visible = false; group.add(o); return o; })); }
      return V;
    },
    draw(V, M, S) {
      const p = S ? S.p : -1;
      for (let k = 0; k < 2; k++) {
        const q = S && S.sq[k], on = q && p >= 0 && p < 2.5;
        V.sq[k].material.opacity = on && p < 1.4 ? 0.25 + 0.35 * pulse(M.time, 10 + p * 10) : (on && p < 1.9 ? 0.15 : 0);
        if (q) V.sq[k].position.set(q[0], 0.04, q[1]);
        V.pc[k].forEach((o, kind) => {
          if (!on || kind !== S.kind || p < 1.05) { o.visible = false; return; }
          let y = 0; if (p < 1.4) { const u = (p - 1.05) / 0.35; y = 12 * (1 - u * u); } else if (p > 1.9) y = Math.pow((p - 1.9) / 0.6, 2) * 12;
          o.visible = true; o.position.set(q[0], y + 0.06, q[1]); o.rotation.y = (k ? Math.PI : 0) + 0.3;
        });
      }
      if (S && p >= 1.4 && V.slam !== S.n) { V.slam = S.n; SFX.play('thud'); FX.addShake(0.5); for (const q of S.sq) FX.burst(new V3(q[0], 0.1, q[1]), { n: 18, color: [0xead8b4, 0x5a3a24], speed: 5, size: 0.11 }); }
    },
  };

  /* ========================================================= 10. SPEEDWAY */
  const CARL = [-4.8, 0, 4.8], CARV = 24, CARC = [0xe0202a, 0x2a6ae0, 0xf2c230];
  const carZ = p => -16 + CARV * (p - 1.3);
  const carY = z => z < -6.6 ? 3.0 + (-6.6 - z) * 0.25 : z < -3 ? 3.0 * (1 - Math.pow((z + 6.6) / 3.6, 2)) : z > 5.4 ? Math.max(0, (z - 5.4) * 0.9 - Math.pow(z - 5.4, 2) * 0.05) : 0;
  TH.speedway = {
    name: 'SPEEDWAY', haz: 'cars', tag: 'Race cars jump the back wall and tear across the floor',
    sky: [0x5aa8ff, 0xd8ecff, 0x3a3a40], fog: 0xc8dcf0, hemi: [0xffffff, 0x4a4a50, 0.85], sun: [0xfff4e0, 1.05],
    floor: (x, z) => { const X = wx(x);
      if (z >= 38 && z <= 39) return ((x >> 1) + z) % 2 ? 0x1a1a1e : 0xf4f4f4;          // the start line
      for (const b of [-2.4, 2.4]) if (Math.abs(X - b) < 0.13 && (z % 8) < 4) return 0xf0f0f0;
      return hh(x, 12, z) > 0.9 ? 0x4a4a52 : (hh(x, 13, z) > 0.97 ? 0x2a2a30 : 0x3a3a42); },
    wall: (x, y, i) => y < 2 ? (((i >> 1) % 2) ? 0xe02a2a : 0xf4f4f4) : ((y - 2) % 4 === 3 ? 0x101012 : ((i >> 2) % 2 ? 0x24242a : 0x1c1c22)),
    edge: 0xe02a2a, dust: [0x3a3a42, 0xf4f4f4], out: 0x4a8a3a, outY: -3, post: 0xf4f4f4,
    scenery(group) {
      const tr = new VX.Grid();                                                               // the ramps the cars come down, behind the back wall
      for (const lx of CARL) for (let z = -6; z >= -112; z--) { const Z = z * 0.125, y = Math.round(carY(Z) / 0.125 - 0.5), X = Math.round(lx / 0.125);
        if (Z > -6.7) continue; tr.box(X - 5, y, z, X + 5, y, z, 0xff8a20); tr.box(X - 6, y + 1, z, X - 6, y + 1, z, 0xe06a10); tr.box(X + 6, y + 1, z, X + 6, y + 1, z, 0xe06a10);
        if (z % 24 === 0) tr.box(X - 1, -24, z, X + 1, y - 1, z, 0x8a8a92); }
      prop(group, tr, 0.125, 0, 0, 0);
      const gs = new VX.Grid(); for (let r = 0; r < 6; r++) gs.box(-14, r * 3, -r * 3, 14, r * 3 + 2, -r * 3 - 2, (x, y, z) => y === r * 3 + 2 ? [0xe0202a, 0x2a6ae0, 0xf2c230, 0x3fbf6a][(x + 20) % 4] : 0x8a8a92);
      gs.box(-15, 18, -19, 15, 19, -16, 0xf4f4f4); gs.box(-15, 0, -19, -14, 18, -19, 0x8a8a92); gs.box(14, 0, -19, 15, 18, -19, 0x8a8a92);
      prop(group, gs, 0.45, 16, -3, -10, -0.5);
      const lp = new VX.Grid(); for (let k = 0; k < 120; k++) { const a = k / 120 * TAU; const x = Math.round(Math.cos(a) * 16), y = Math.round(Math.sin(a) * 16 + 16); lp.box(x, y, -4, x, y, 4, 0xff8a20); }
      prop(group, lp, 0.3, -16, -3, -14, 0.5);
      const flag = new VX.Grid(); flag.box(0, 0, 0, 0, 30, 0, 0x8a8a92); flag.box(1, 20, 0, 12, 29, 0, (x, y) => ((x >> 1) + (y >> 1)) % 2 ? 0x1a1a1e : 0xf4f4f4); prop(group, flag, 0.2, -9.6, -3, 7.6);
      const tire = new VX.Grid(); for (let s = 0; s < 3; s++) tire.cyl('y', 0, 0, 4, s * 3, s * 3 + 2, (x, y, z) => Math.hypot(x, z) < 2 ? -1 : 0x1a1a1e);
      prop(group, tire, 0.3, -10, -3, -8); prop(group, tire, 0.3, 10, -3, -8); prop(group, tire, 0.3, 10.5, -3, 7.5);
    },
  };
  function carMesh(col) {
    const g = new VX.Grid();
    g.box(-4, 1, -9, 4, 3, 9, col); g.box(-3, 4, -3, 3, 5, 3, 0x1a1a24); g.box(-2, 4, -6, 2, 4, -4, col);
    g.box(-5, 5, -10, 5, 5, -9, col); g.box(-1, 4, -10, -1, 4, -9, 0x1a1a1e); g.box(1, 4, -10, 1, 4, -9, 0x1a1a1e);   // the spoiler
    g.box(-5, 1, 8, 5, 1, 10, col); g.cyl('x', 3, 0, 2, 4, 4, 0xf4f4f4); g.cyl('x', 3, 0, 1, 5, 5, 0x1a1a1e);
    for (const x of [-5, 5]) for (const z of [-6, 6]) g.cyl('x', 1, z, 2, x, x, (X, Y, Z) => Y === 1 && Z === z ? 0xc8ccd4 : 0x141418);
    g.box(-3, 2, 10, -2, 2, 10, G(0xfff2a0)); g.box(2, 2, 10, 3, 2, 10, G(0xfff2a0));
    const o = VX.object(g, 0.125); o.children.forEach(c => { c.castShadow = true; }); return o;
  }
  HAZ.cars = {
    name: 'RACE CARS', desc: 'Every 7 s a lane flashes, then a race car jumps the back wall and races down it. Get out of the lane.',
    init: () => ({ n: -1, p: -1, lane: 1 }),
    step(M, S) {
      const c = cyc(S, 7, 7); if (!c) return;
      if (c.n !== S.n) { S.n = c.n; S.lane = laneFor(M, c.n, CARL); }
      S.p = c.p; if (c.p < 1.3) return;
      const z = carZ(c.p); if (z < -4 || z > 6.5) return;
      const lx = CARL[S.lane], y = carY(z);
      for (const f of M.fighters) if (Math.abs(f.pos.x - lx) < 1.05 && Math.abs(f.pos.z - z) < 1.4 && f.pos.y < y + 1.1 && f.pos.y + 1.8 > y)
        Combat.hazard(f, { dmg: 50, kb: [13, 8], dir: { x: awayX(f, lx) * 0.5, z: 1 }, call: 'VROOM!', flash: 0xffd040 });
    },
    danger(M, S, f) {
      if (S.p < 0) return null; const z = carZ(Math.max(1.3, S.p)); if (z > 6.5) return null;
      const lx = CARL[S.lane]; return Math.abs(f.pos.x - lx) < 1.7 && f.pos.z > z - 1.4 ? { x: awayX(f, lx), z: 0 } : null;
    },
    build(group) {
      const V = { lanes: CARL.map(x => decal(group, new THREE.PlaneGeometry(1.9, 12), 0xffd040, 0, x, 0, 0.04, true)), cars: CARC.map(c => { const o = carMesh(c); o.visible = false; group.add(o); return o; }), h: -9, v: -9 };
      return V;
    },
    draw(V, M, S) {
      const p = S ? S.p : -1, z = carZ(p);
      V.lanes.forEach((m, k) => { m.material.opacity = S && k === S.lane && p >= 0 && p < 1.3 ? 0.12 + 0.25 * pulse(M.time, 18) : 0; });
      V.cars.forEach((o, k) => {
        if (!S || k !== ((S.n % 3) + 3) % 3 || p < 1.3 || z > 20) { o.visible = false; return; }
        const y = carY(z), y2 = carY(z + 0.5); o.visible = true; o.position.set(CARL[S.lane], y + 0.19, z); o.rotation.x = -Math.atan2(y2 - y, 0.5);
      });
      if (S && p >= 0 && p < 1.3 && V.h !== S.n) { V.h = S.n; SFX.play('horn'); }
      if (S && p >= 1.3 && V.v !== S.n) { V.v = S.n; SFX.play('vroom'); }
    },
  };

  /* ============================================== 11. SCIENCE FAIR VOLCANO */
  const CRATER = new V3(0, 11.3, -20);
  TH.volcano = {
    name: 'SCIENCE FAIR VOLCANO', haz: 'rocks', tag: 'The volcano project erupts and the floor is lava',
    sky: [0x4a2a3a, 0xd8885a, 0x221414], fog: 0x7a4a3a, hemi: [0xffd8c0, 0x4a2a20, 0.8], sun: [0xffc890, 1.0],
    floor: (x, z) => { const a = Math.abs(Math.sin(x * 0.21 + Math.sin(z * 0.17) * 2.2)), b = Math.abs(Math.sin(z * 0.27 + Math.cos(x * 0.13) * 2.6));
      if (a < 0.045 || b < 0.04) return G(hh(x, 14, z) > 0.5 ? 0xff7a20 : 0xff5a10);
      return hh(x, 15, z) > 0.8 ? 0x463a36 : 0x3a302c; },
    wall: (x, y, i, w) => { const c = i % 16; if (w && w.h <= 3) return 0xf4f4ee;
      if (y === 8) return 0x3a6ad0; if (c >= 3 && c <= 7 && y >= 3 && y <= 6) return [0xf2c230, 0xe0343f, 0x3fbf6a][(i >> 4) % 3];
      if (c >= 9 && c <= 13 && y >= 2 && y <= 6) return (y === 2 || c === 9) ? 0x2a2a2a : ((c - 9) * 1.2 + 2 > y && c > 9 ? 0x3a6ad0 : 0xf4f4ee); return 0xf4f4ee; },
    edge: 0x3a6ad0, dust: [0x3a302c, 0xff7a20], out: 0xff5a10, outGlow: true, outY: -2.5, post: 0xf4f4ee, plinth: 0x2a2220,
    scenery(group, A) {
      box(group, 70, 1, 30, 0xf4f4ee, 0, -0.8, -23);                                        // the fair table
      const v = new VX.Grid(), H = 26;                                                        // the volcano, papier-mache
      for (let y = 0; y <= H; y++) { const r = 22 * (1 - y / H * 0.78); v.cyl('y', 0, 0, r, y, y, (x, yy, z) => { const d = Math.hypot(x, z); if (d < r - 2.2 && y < H) return -1; if (y === H && d < r - 1.5) return G(0xff7a20);
        const a = Math.atan2(z, x); if (Math.abs(Math.sin(a * 3 + y * 0.05)) < 0.08 && z > 0) return G(0xff5a10); return hh(x, yy, z) > 0.7 ? 0x6a8a3a : (hh(z, yy, x) > 0.5 ? 0x8a5a34 : 0x7a4a2c); }); }
      prop(group, v, 0.45, 0, -0.3, -20);
      const board = new VX.Grid(); board.box(-14, 0, 0, 14, 20, 0, (x, y) => (Math.abs(x) === 5 ? 0xd8d8d0 : y > 16 ? 0x3a6ad0 : ((x + 30) % 10 < 6 && y > 4 && y < 14 ? [0xf2c230, 0xe0343f, 0x3fbf6a][Math.floor((x + 15) / 10) % 3] : 0xf4f4ee)));
      prop(group, board, 0.35, -15, -0.3, -12, 0.5); prop(group, board, 0.35, 15, -0.3, -12, -0.5);
      const rib = new VX.Grid(); rib.cyl('z', 0, 0, 4, 0, 0, (x, y) => Math.hypot(x, y) < 2 ? 0xf2c230 : 0x2a5ad0); rib.box(-1, -9, 0, 0, -4, 0, 0x2a5ad0); rib.box(1, -9, 0, 2, -4, 0, 0x2a5ad0);
      prop(group, rib, 0.25, 15.6, 4, -11.5, -0.5);
      A.props.glow = new THREE.PointLight(0xff6a20, 1.2, 60); A.props.glow.position.copy(CRATER).setY(CRATER.y + 2); group.add(A.props.glow);
    },
    ambient(group, A) { let t = 0; return { update(dt) { t += dt; A.props.glow.intensity = 1.0 + 0.4 * Math.sin(t * 2.3) + 0.2 * Math.sin(t * 7.1);
      if (U.vrand() < dt * 3) FX.burst(CRATER.clone(), { n: 1, color: [0x5a5050, 0x7a7070, 0x6a5a5a], speed: 1.2, size: 0.8, gravity: -1.6, life: 3, up: 1, floor: -9 }); } }; },
  };
  HAZ.rocks = {
    name: 'LAVA ROCKS', desc: 'The volcano erupts every 7 s: glowing circles mark where the rocks will land. Get out of them.',
    init: () => ({ n: -1, p: -1, at: [], done: 1 }),
    step(M, S) {
      const c = cyc(S, 6, 7); if (!c) return;
      if (c.n !== S.n) { S.n = c.n; S.done = 0; S.at = M.fighters.map(f => [U.clamp(f.pos.x + U.rnd(-1.3, 1.3), -6.8, 6.8), U.clamp(f.pos.z + U.rnd(-1, 1), -4.8, 4.8)]);
        if (S.t > 40) S.at.push([U.rnd(-6.5, 6.5), U.rnd(-4.5, 4.5)]); }
      S.p = c.p;
      if (c.p >= 1.5 && !S.done) { S.done = 1;
        for (const q of S.at) for (const f of M.fighters) { const dx = f.pos.x - q[0], dz = f.pos.z - q[1];
          if (f.pos.y < 2.6 && Math.hypot(dx, dz) < 1.35) Combat.hazard(f, { dmg: 50, kb: [8, 10], dir: { x: dx || 1, z: dz }, call: 'MAGMA!', flash: 0xff5020, colors: [0xffd040, 0xff5a10, 0x3a302c], sfx: 'boom' }); } }
    },
    danger(M, S, f) {
      if (S.p < 0 || S.p >= 1.5) return null;
      for (const q of S.at) { const dx = f.pos.x - q[0], dz = f.pos.z - q[1]; if (Math.hypot(dx, dz) < 1.9) return { x: dx || 1, z: dz || 0.3 }; }
      return null;
    },
    build(group) {
      const V = { t: [], r: [], e: -9, i: -9 }, rg = new VX.Grid(); rg.ell(0, 0, 0, 5, 4, 5, (x, y, z) => hh(x, y, z) > 0.75 ? G(0xff7a20) : (hh(z, y, x) > 0.5 ? 0x3a302c : 0x2a2220));
      for (let k = 0; k < 3; k++) {
        V.t.push({ disc: decal(group, new THREE.CircleGeometry(1.35, 32), 0xff5a10, 0, 0, 0, 0.035, true), ring: decal(group, new THREE.RingGeometry(1.22, 1.38, 40), 0xffa040, 0, 0, 0, 0.04, true) });
        const o = VX.object(rg, 0.125); o.visible = false; group.add(o); V.r.push(o);
      }
      return V;
    },
    draw(V, M, S) {
      const p = S ? S.p : -1;
      for (let k = 0; k < 3; k++) {
        const q = S && S.at[k], on = q && p >= 0 && p < 1.5, T = V.t[k], R = V.r[k];
        T.disc.material.opacity = on ? 0.12 + 0.25 * (p / 1.5) * pulse(M.time, 14) : 0; T.ring.material.opacity = on ? 0.5 + 0.4 * pulse(M.time, 14) : 0;
        if (q) { T.disc.position.set(q[0], 0.035, q[1]); T.ring.position.set(q[0], 0.04, q[1]); T.ring.scale.setScalar(on ? 1.5 - 0.5 * (p / 1.5) : 1); }
        if (on && p > 0.75) { const u = (p - 0.75) / 0.75; R.visible = true; R.position.set(CRATER.x + (q[0] - CRATER.x) * u, CRATER.y + (0.6 - CRATER.y) * u + Math.sin(u * Math.PI) * 7, CRATER.z + (q[1] - CRATER.z) * u); R.rotation.x += 0.2; R.rotation.z += 0.13;
          if (U.vrand() < 0.5) FX.burst(R.position.clone(), { n: 1, color: [0xff7a20, 0xffd040], glow: true, speed: 0.5, size: 0.18, gravity: 0, life: 0.4 }); }
        else R.visible = false;
      }
      if (S && p >= 0.7 && p < 1.5 && V.e !== S.n) { V.e = S.n; SFX.play('rumble'); FX.burst(CRATER.clone(), { n: 30, color: [0xff7a20, 0xffd040, 0xff4010], glow: true, speed: 9, size: 0.3, life: 1.4, up: 1.4 }); }
      if (S && p >= 1.5 && V.i !== S.n) { V.i = S.n; SFX.play('boom'); FX.addShake(0.45); for (const q of S.at) { FX.burst(new V3(q[0], 0.2, q[1]), { n: 24, color: [0xff7a20, 0xffd040, 0x3a302c], glow: true, speed: 6, size: 0.12, life: 0.8 }); FX.ring(new V3(q[0], 0.06, q[1]), { r1: 2.2, life: 0.35, color: 0xff7a20 }); } }
    },
  };

  /* ======================================================== 12. MOON BASE */
  const CRAT = [[14, 10, 5], [47, 31, 7], [30, 41, 3.5], [52, 8, 3]];
  TH.moonbase = {
    name: 'MOON BASE', tag: 'A landing pad on the Moon, with the Earth overhead',
    sky: [0x000004, 0x0a0a1c, 0x000000], fog: 0x0a0a14, fogR: [45, 170], hemi: [0xd8e0ff, 0x1a1a24, 0.6], sun: [0xffffff, 1.25],
    floor: (x, z) => {
      for (const [cx, cz, r] of CRAT) { const d = Math.hypot(x - cx, z - cz); if (Math.abs(d - r) < 0.8) return 0xb4b4bc; if (d < r) return d < r * 0.5 ? 0x6e6e76 : 0x7a7a82; }
      const ax = Math.abs(x - 31.5), az = Math.abs(z - 23.5); if (ax < 6 && az < 6 && (ax > 4.5 || az > 4.5)) return 0xf2c230;   // the pad's square
      return hh(x, 16, z) > 0.85 ? 0xa4a4aa : (hh(x, 17, z) > 0.5 ? 0x94949a : 0x8e8e94); },
    wall: (x, y, i) => { if (y <= 1) return ((i + y) % 4 < 2) ? 0xf2c230 : 0x1a1a1e; if (y === 6) return i % 3 === 0 ? G(0x4ad8ff) : 0xd8dce4;
      return i % 8 === 0 ? 0xa4a8b0 : (hh(i, y, 18) > 0.9 ? 0xd0d4dc : 0xe4e8ee); },
    edge: 0xff8a2a, dust: [0xa4a4aa, 0x8e8e94], out: 0x5e5e64, outY: -6, post: 0xd8dce4,
    scenery(group, A) {
      const e = new VX.Grid(); shell(e, 0, 0, 0, 12, 12, 12, (x, y, z) => { const n = Math.sin(x * 0.5) * Math.cos(z * 0.4) + Math.sin(y * 0.45 + x * 0.2); return Math.abs(y) > 10 ? 0xf4f8ff : n > 1.2 ? 0xc8b07a : n > 0.6 ? 0x4a9a4a : (hh(x, y, z) > 0.9 ? 0xf4f8ff : 0x2a5ad0); }, 0.7);
      const EG = VX.meshGrid(e, 1.4), earth = new THREE.Mesh(EG.lit, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false })); earth.position.set(-40, 45, -120); earth.rotation.z = 0.3; group.add(earth); A.props.earth = earth;
      const N = 700, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = U.vrand() * 2 - 1, a = U.vrand() * TAU, r = 260, s = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = Math.abs(u) * r * 0.9 + 4; pos[i * 3 + 2] = Math.sin(a) * s * r; }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      A.props.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true })); group.add(A.props.stars);
      const l = new VX.Grid(); l.cyl('y', 0, 0, 6, 8, 16, (x, y, z) => hh(x, y, z) > 0.6 ? 0xe8c040 : 0xd8a830); l.cyl('y', 0, 0, 4, 17, 22, 0xd8dce4); l.box(-1, 18, 4, 1, 20, 4, G(0x4ad8ff)); l.cyl('y', 0, 0, 3, 5, 7, 0x6a6a72);
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.78, cx = Math.round(Math.cos(a) * 10), cz = Math.round(Math.sin(a) * 10); l.line(Math.cos(a) * 5, 10, Math.sin(a) * 5, cx, 0, cz, 0xb8bcc4, 0.6); l.box(cx - 1, 0, cz - 1, cx + 1, 0, cz + 1, 0xb8bcc4); }
      prop(group, l, 0.4, -14, -6, -12, 0.3);
      const dish = new VX.Grid(); dish.box(0, 0, 0, 0, 10, 0, 0xb8bcc4); dish.ell(0, 14, 2, 7, 7, 2, (x, y, z) => z > 2 ? -1 : 0xe4e8ee); dish.box(0, 14, 2, 0, 14, 5, 0x6a6a72);
      A.props.dish = prop(group, dish, 0.4, 14, -6, -12);
      const hab = new VX.Grid(); shell(hab, 0, 0, 0, 12, 9, 12, (x, y, z) => y < 0 ? -1 : (y === 3 && (x + z) % 3 === 0 ? G(0x9ae8ff) : (hh(x, y, z) > 0.85 ? 0xd0d4dc : 0xe8ecf0)), 0.6);
      prop(group, hab, 0.45, 2, -6, -18);
      const flag = new VX.Grid(); flag.box(0, 0, 0, 0, 22, 0, 0xc8ccd4); flag.box(1, 14, 0, 12, 21, 0, (x, y) => y === 17 || y === 18 ? 0xffffff : 0xff8a2a); flag.box(0, 22, 0, 12, 22, 0, 0xc8ccd4);
      prop(group, flag, 0.15, -8.15, 2.85, -6.15, 0.2);
    },
    ambient(group, A) { let t = 0; return { update(dt) { t += dt; A.props.dish.rotation.y = Math.sin(t * 0.25) * 1.2; A.props.earth.rotation.y += dt * 0.02; A.props.stars.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.7); } }; },
  };

  /* ========================================================= 13. DINO DIG */
  const STOMP = [2.1, -10.2];   // (under the T-rex's stomping foot)
  function boneAt(x, z) {
    if (x >= 6 && x <= 26) { const sz = 34 + Math.round(1.5 * Math.sin(x * 0.3)); if (z === sz) return 0xf2ead4; if ((x - 8) % 4 === 0 && x <= 22 && Math.abs(z - sz) <= 4) return 0xe8dcc0; }
    const dx = (x - 30) / 4.5, dz = (z - 34) / 3, d = dx * dx + dz * dz; if (d < 1) return d < 0.25 && x > 30 ? 0x9a7a50 : 0xf2ead4;   // the skull, and its eye
    return 0;
  }
  TH.dino = {
    name: 'DINO DIG', haz: 'stomp', tag: 'A toy T-rex stomps behind the wall: jump the shockwave',
    sky: [0xff8a4a, 0xffd49a, 0x5a3a2a], fog: 0xe8b48a, hemi: [0xfff0d0, 0x6a4a30, 0.9], sun: [0xffd8a0, 1.05],
    floor: (x, z) => { if (x % 16 === 0 || z % 16 === 0) return 0xf4f0e0;                  // the dig's string grid
      return boneAt(x, z) || (hh(x, 19, z) > 0.8 ? 0xcaa870 : (hh(x, 20, z) > 0.96 ? 0x9a7a50 : 0xd8b880)); },
    wall: (x, y, i) => y % 3 === 0 ? 0x7a5430 : (i % 12 === 0 ? 0x5a3a20 : (hh(i, y, 21) > 0.85 ? 0xa4744a : 0x9a6a3a)),
    edge: 0xc89a5a, dust: [0xd8b880, 0x9a7a50], out: 0x8a5a34, outY: -4, post: 0x5a3a20,
    scenery(group, A) {
      box(group, 60, 4, 24, 0xc8a070, 0, -2, -19);                                            // the mound the T-rex stands on
      const skin = (x, y, z) => hh(x, y, z) > 0.86 ? 0x3a7a2a : 0x4a9a3a, belly = (x, y, z) => (z > 6 && y < 24) ? 0x9ad06a : skin(x, y, z);
      const r = new VX.Grid();
      shell(r, 0, 22, 0, 8, 9, 13, belly, 0.55);                                            // the body
      shell(r, 0, 26, 9, 5, 6, 5, belly, 0.4);                                               // the neck
      shell(r, 0, 33, 16, 6, 5, 9, skin, 0.45); r.box(-5, 27, 12, 5, 29, 24, skin);         // the head and the jaw
      r.box(-4, 30, 14, 4, 30, 25, 0x7a1a1a); for (let z = 15; z <= 25; z += 2) { r.set(-4, 31, z, 0xf4f4ee); r.set(4, 31, z, 0xf4f4ee); r.set(-4, 29, z + 1, 0xf4f4ee); r.set(4, 29, z + 1, 0xf4f4ee); }   // the mouth, and teeth
      for (const s of [-1, 1]) { r.box(s * 6, 35, 17, s * 6, 36, 19, 0xffffff); r.box(s * 6, 35, 18, s * 6, 35, 18, 0x1a1a1e); r.box(s * 4, 38, 15, s * 5, 38, 19, 0x3a7a2a); }   // the eyes and the brows
      for (let k = 0; k < 6; k++) { const t = k / 5; r.ell(0, 22 - t * 8, -12 - t * 22, 5 - t * 3.5, 5 - t * 3.5, 5, skin); }   // the tail
      for (let k = 0; k < 7; k++) r.box(-1, 31 - k * 1.2, -2 - k * 4, 1, 32 - k * 1.2, -1 - k * 4, 0x3a7a2a);   // the ridge down its back
      r.box(-5, 18, 11, -4, 20, 14, skin); r.box(4, 18, 11, 5, 20, 14, skin);                 // its little arms
      shell(r, -6, 14, 0, 4, 7, 5, skin, 0.4); r.box(-7, 2, -1, -5, 10, 2, skin); r.box(-8, 0, -1, -4, 1, 6, 0x3a7a2a);   // the far leg
      const rexG = new THREE.Group(); rexG.position.set(0.5, 0, -10); rexG.rotation.y = 0.5; group.add(rexG);   // three-quarters on: its profile reads
      A.props.rex = prop(rexG, r, 0.25, 0, 0, 0);
      const leg = new VX.Grid(); shell(leg, 0, -4, 0, 4, 7, 5, skin, 0.4); leg.box(-1, -16, -1, 1, -8, 2, skin); leg.box(-2, -18, -1, 2, -17, 6, 0x3a7a2a);
      A.props.leg = prop(rexG, leg, 0.25, 1.5, 4.5, 0);
      const palm = new VX.Grid(); for (let y = 0; y < 18; y++) palm.box(Math.round(Math.sin(y * 0.15) * 2), y, 0, Math.round(Math.sin(y * 0.15) * 2) + 1, y, 1, y % 3 ? 0x8a5a2a : 0x6a4020);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; palm.line(3, 18, 0, 3 + Math.cos(a) * 9, 14, Math.sin(a) * 9, 0x3a9a3a, 0.8); }
      prop(group, palm, 0.4, -13, 0, -12); prop(group, palm, 0.45, 14, 0, -11, 1.2); prop(group, palm, 0.35, -16, -4, 4, 2);
      const egg = new VX.Grid(); shell(egg, 0, 6, 0, 4, 6, 4, (x, y, z) => y > 9 && hh(x, y, z) > 0.5 ? -1 : (hh(x, y, z) > 0.8 ? 0x9ac06a : 0xf4ecd8), 0.5); prop(group, egg, 0.35, -9.5, 0, -8, 0.5);
    },
  };
  HAZ.stomp = {
    name: 'THE STOMP', desc: 'Every 10 s the T-rex roars and stomps: a shockwave rolls across the floor. Jump over it.',
    init: () => ({ n: -1, p: -1, r: 0 }),
    step(M, S) {
      const c = cyc(S, 8, 10); if (!c) return;
      if (c.n !== S.n) { S.n = c.n; S.r = 0; }
      S.p = c.p; if (c.p < 1.1 || c.p > 2.9) return;
      const r1 = 13 * (c.p - 1.1), r0 = S.r; S.r = r1;
      for (const f of M.fighters) { const dx = f.pos.x - STOMP[0], dz = f.pos.z - STOMP[1], d = Math.hypot(dx, dz);
        if (f.pos.y < 0.45 && d > r0 - 0.35 && d <= r1 + 0.35) Combat.hazard(f, { dmg: 35, kb: [5, 8], dir: { x: dx, z: dz }, call: 'STOMP!', flash: 0xffd8a0, colors: [0xd8b880, 0x9a7a50] }); }
    },
    danger(M, S, f) {
      if (S.p < 0 || S.p > 2.9 || f.pos.y > 0.3) return null;
      const d = Math.hypot(f.pos.x - STOMP[0], f.pos.z - STOMP[1]), tt = S.p < 1.1 ? (1.1 - S.p) + d / 13 : (d - 13 * (S.p - 1.1)) / 13;
      return tt > 0 && tt < 0.3 ? 'jump' : null;
    },
    build(group, A) { return { leg: A.props.leg, rex: A.props.rex, ring: null, r: -9, b: -9 }; },
    draw(V, M, S) {
      const p = S ? S.p : -1, lift = p >= 0 && p < 1.1 ? (p < 0.85 ? smooth01(p / 0.7) : 1 - (p - 0.85) / 0.25) : 0;
      V.leg.rotation.x = -0.95 * Math.max(0, lift); V.leg.position.y = 4.5 + 0.8 * Math.max(0, lift); V.rex.rotation.x = -0.06 * Math.max(0, lift);
      if (S && p >= 0 && p < 1.1 && V.r !== S.n) { V.r = S.n; SFX.play('roar'); }
      const live = S && p >= 1.1 && p < 2.9;
      if (live && V.b !== S.n) { V.b = S.n; SFX.play('thud'); FX.addShake(0.8); FX.burst(new V3(STOMP[0], 0.3, STOMP[1]), { n: 30, color: [0xd8b880, 0x9a7a50], speed: 8, size: 0.15, life: 0.8 }); }
      if (V.ring) { V.ring.parent.remove(V.ring); V.ring.geometry.dispose(); V.ring = null; }
      if (live) { const r = S.r; V.ring = decal(V.rex.parent.parent, new THREE.RingGeometry(Math.max(0.01, r - 0.35), r + 0.35, 80), 0xffe8c0, 0.75 * (1 - (p - 1.1) / 1.8), STOMP[0], STOMP[1], 0.05, true);
        if (U.vrand() < 0.9) { const a = U.vrand() * Math.PI, x = STOMP[0] + Math.cos(a) * r, z = STOMP[1] + Math.sin(a) * r; if (Math.abs(x) < W && Math.abs(z) < D) FX.burst(new V3(x, 0.1, z), { n: 2, color: [0xd8b880, 0xcaa870], speed: 3, size: 0.1, life: 0.5 }); } }
    },
  };

  /* ====================================================== 14. ALARM CLOCK */
  const HANDW = TAU / 15;
  TH.clock = {
    name: 'ALARM CLOCK', haz: 'hand', tag: 'The second hand sweeps the whole floor: jump it',
    sky: [0x1e2240, 0x4a4e80, 0x101222], fog: 0x30345a, hemi: [0xe0e0ff, 0x2a2a3a, 0.8], sun: [0xfff0d0, 1.0],
    floor: (x, z) => { const X = wx(x), Z = wz(z), r = Math.hypot(X, Z);
      if (r > 5.75) return r < 6.0 ? 0xd8b048 : (hh(x, 22, z) > 0.8 ? 0xd0c4a4 : 0xdccfae);
      const deg = ((Math.atan2(X, -Z) * 180 / Math.PI) + 360) % 360;
      if (r > 4.55 && r < 5.4 && Math.min(deg % 30, 30 - deg % 30) < 2.4) return 0x22222a;   // the hours
      if (r > 5.1 && r < 5.55 && Math.min(deg % 6, 6 - deg % 6) < 0.9) return 0x4a4a52;     // the minutes
      return hh(x, 23, z) > 0.9 ? 0xf2ead2 : 0xf8f0dc; },
    wall: (x, y, i) => y < 2 ? 0xa82a2a : (hh(i, y, 24) > 0.85 ? 0xe04848 : 0xd83a3a),
    edge: 0xe0e4ea, dust: [0xf8f0dc, 0xd8b048], out: 0x6a4a30, outY: -6, post: 0xe0e4ea, plinth: 0xa82a2a,
    scenery(group, A) {
      box(group, 16.6, 8.5, 3, 0xc83434, 0, -1.75, -8);                                   // the clock's body, behind the face
      const bell = new VX.Grid(); shell(bell, 0, 0, 0, 9, 9, 9, (x, y, z) => y < 0 ? -1 : (hh(x, y, z) > 0.85 ? 0xf0d070 : 0xd8b048), 0.6); bell.box(0, 9, 0, 0, 12, 0, 0xc8ccd4);
      A.props.bells = [prop(group, bell, 0.3, -5.5, 2.5, -7.6, 0, { cast: true }), prop(group, bell, 0.3, 5.5, 2.5, -7.6, 0, { cast: true })];
      const ham = new VX.Grid(); ham.box(0, 0, 0, 0, 10, 0, 0xc8ccd4); ham.ell(0, 11, 0, 2, 1, 1, 0xd8b048); A.props.ham = prop(group, ham, 0.3, 0, 2.5, -7.6);
      const lamp = new VX.Grid(); lamp.cyl('y', 0, 0, 6, 0, 1, 0x2a2a34); lamp.box(0, 2, 0, 0, 36, 0, 0xc8ccd4); lamp.cyl('y', 0, 0, 10, 37, 46, (x, y, z) => Math.hypot(x, z) < 9 && y < 46 ? -1 : 0xf4e0b0); lamp.cyl('y', 0, 0, 3, 38, 40, G(0xfff2c0));
      prop(group, lamp, 0.4, 14, -6, -12);
      const gl = new THREE.PointLight(0xffd8a0, 0.7, 40); gl.position.set(14, 9, -12); group.add(gl);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.8, 7, 24, 1, true), basic(0xcfe8ff, 0.25, false, THREE.DoubleSide)); glass.position.set(-13, -2.5, -10); group.add(glass);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.75, 4.5, 24), basic(0x7ac4ec, 0.35)); water.position.set(-13, -3.7, -10); group.add(water);
      const books = new VX.Grid(); [[0xd83a3a, 0], [0x3a6ad0, 1], [0x3fbf6a, 2], [0xf2c230, 3]].forEach(([c, k]) => books.box(-8 + k, k * 4, -5 - k, 8 - k, k * 4 + 3, 5, c)); prop(group, books, 0.35, -15, -6, 1, 0.3);
    },
    ambient(group, A) { let t = 0; return { update(dt) { t += dt; const ring = A.props.ringT > 0; A.props.ringT = Math.max(0, (A.props.ringT || 0) - dt);
      A.props.bells.forEach((b, k) => { b.rotation.z = ring ? Math.sin(t * 60 + k) * 0.08 : 0; }); A.props.ham.rotation.z = ring ? Math.sin(t * 70) * 0.5 : 0; } }; },
  };
  HAZ.hand = {
    name: 'THE SECOND HAND', desc: 'The red hand sweeps the whole floor once every 15 s, low to the ground: jump it as it comes.',
    init: () => ({ th: 0, rel: [9, 9] }),
    step(M, S) {
      const th1 = HANDW * Math.max(0, S.t - 2); if (th1 <= S.th) return; S.th = th1;
      for (const f of M.fighters) {
        // where each figure is against the hand (+: ahead of it, the way it sweeps). It hits when it sweeps over you --
        // you were ahead of it, now you're under it -- not when you run across it from behind
        const r = Math.hypot(f.pos.x, f.pos.z), rel = Math.atan2(Math.sin(Math.atan2(f.pos.x, -f.pos.z) - th1), Math.cos(Math.atan2(f.pos.x, -f.pos.z) - th1)), was = S.rel[f.idx];
        S.rel[f.idx] = rel;
        if (r < 0.8 || f.pos.y > 0.45 || !(was > 0 && was < 1.5) || rel > 0.35 / r || rel < -1) continue;
        // it trips you up and over, back behind it (thrown ahead of it, you'd only be caught again)
        Combat.hazard(f, { dmg: 30, kb: [3, 10], dir: { x: -Math.cos(th1), z: -Math.sin(th1) }, call: 'TICK TOCK!', flash: 0xff4a4a });
      }
    },
    danger(M, S, f) {
      if (f.pos.y > 0.3) return null; const r = Math.hypot(f.pos.x, f.pos.z); if (r < 0.8) return null;
      const ahead = ((Math.atan2(f.pos.x, -f.pos.z) - S.th) % TAU + TAU * 2) % TAU; return ahead / HANDW < 0.3 && S.t > 2 ? 'jump' : null;
    },
    build(group, A) {
      const V = { turn: 0, sec: -1, A };
      const hub = new VX.Grid(); hub.cyl('y', 0, 0, 3, 0, 2, 0xd8b048); hub.cyl('y', 0, 0, 1, 3, 3, 0x2a2a2a); prop(group, hub, 0.125, 0, 0.06, 0);
      // the hour and minute hands (they don't move: it's always ten past ten)
      for (const [ang, L, wd] of [[TAU * (10 / 12) + TAU / 72, 3.2, 0.32], [TAU * (2 / 12), 4.4, 0.24]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(wd, 0.06, L), lam(0x1a1a22)); m.geometry.translate(0, 0.03, -L / 2); m.rotation.y = -ang; m.position.y = 0.01; m.receiveShadow = true; group.add(m); }
      const hand = new THREE.Group(), mat = lam(0xe02a2a), bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1), mat); bar.geometry.translate(0, 0.1, -0.5); bar.castShadow = true; hand.add(bar);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 1.4), mat); tail.geometry.translate(0, 0.1, 0.7); hand.add(tail);
      group.add(hand); V.hand = hand; V.bar = bar; V.bar.scale.z = 5.95; return V;
    },
    draw(V, M, S) {
      const th = S ? S.th : 0, s = Math.abs(Math.sin(th)), c = Math.abs(Math.cos(th)); V.hand.rotation.y = -th;
      V.bar.scale.z = Math.min(s > 1e-3 ? 7.95 / s : 99, c > 1e-3 ? 5.95 / c : 99, 10.2);
      if (!S) return;
      const turn = Math.floor(th / TAU); if (turn !== V.turn) { V.turn = turn; if (turn > 0) { SFX.play('alarm'); V.A.props.ringT = 1.4; M.call(M.fighters[0], 'RING RING!', 'break', new V3(0, 3.4, -5)); } }
      const sec = Math.floor(S.t); if (sec !== V.sec && S.t > 2) { V.sec = sec; SFX.play('tick'); }
    },
  };

  /* ===================================================== 15. RECORD PLAYER */
  TH.vinyl = {
    name: 'RECORD PLAYER', haz: 'spin', tag: 'The floor is a spinning record, and sometimes it scratches',
    sky: [0x2e2232, 0x7a5262, 0x161016], fog: 0x4a3240, hemi: [0xffe0d0, 0x2a1a20, 0.8], sun: [0xffd8b0, 1.0],
    floor: () => -1,
    wall: (x, y, i) => y % 4 === 0 ? 0x5a3420 : (hh(i >> 1, y, 25) > 0.75 ? 0x7a4a2c : 0x6a4026),
    edge: 0xc8ccd4, dust: [0x2a2a30, 0xd83a3a], out: 0x3a2418, outY: -2, post: 0x4a2a18, swatch: 0x1c1c22,
    scenery(group, A) {
      const dg = new VX.Grid(); dg.jit = 0.02;
      for (let x = -43; x <= 43; x++) for (let z = -43; z <= 43; z++) {
        const r = Math.hypot(x + 0.5, z + 0.5) * AS; if (r > 10.7 || r < 0.3) continue;
        let c = r < 2.3 ? (r > 1.9 && r < 2.1 ? 0xf4e8d0 : (hh(x, 26, z) > 0.9 ? 0xc83030 : 0xd83a3a)) : (Math.floor(r * 2.2) % 2 ? 0x1c1c22 : 0x24242c);
        if (r > 2.5 && r < 10.3 && Math.abs(Math.sin(Math.atan2(z, x) * 2)) < 0.06) c = 0x3a3a44;   // a sheen: it shows the record turning
        if (r > 10.35) c = 0x2a2a30; dg.set(x, 0, z, c);
      }
      const disc = VX.object(dg, AS, { cast: false }); disc.position.set(0.125, -0.125, 0.125); const spin = new THREE.Group(); spin.add(disc); group.add(spin); A.props.disc = spin;
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(11.1, 11.3, 1.6, 64), lam(0x9a9ea6)); plat.position.y = -1.06; group.add(plat);
      const sp = new VX.Grid(); sp.cyl('y', 0, 0, 1, 0, 4, 0xd8dce4); prop(group, sp, 0.125, 0, 0.06, 0);
      const arm = new VX.Grid(); arm.cyl('y', 0, 0, 6, 0, 6, 0x2a2a30); arm.cyl('y', 0, 0, 3, 7, 10, 0xc8ccd4); arm.line(0, 10, 0, -6, 10, 60, 0xd8dce4, 1); arm.box(-9, 8, 59, -4, 10, 66, 0x2a2a30); arm.ell(0, 10, -8, 3, 3, 3, 0x6a6a72);
      A.props.arm = prop(group, arm, 0.125, 11.6, -0.3, -7.5, 0.25);
      const spk = new VX.Grid(); spk.box(-8, 0, -6, 8, 36, 6, 0x3a2418); for (const [y, r] of [[10, 6], [24, 4], [32, 2]]) { spk.cyl('z', 0, y, r, 7, 7, 0x1a1a1e); spk.cyl('z', 0, y, r * 0.35, 8, 8, 0x4a4a52); }
      prop(group, spk, 0.4, -17, -2, -12, 0.35); prop(group, spk, 0.4, 17, -2, -12, -0.35);
      const sl = new VX.Grid(); [[0xf2c230, 0], [0x3a9aff, 1], [0xe0343f, 2]].forEach(([c, k]) => sl.box(-12, k * 2, -12 + k * 2, 12, k * 2, 12 + k * 2, (x, y, z) => Math.hypot(x, z - k * 2) < 6 ? 0x1a1a1e : c));
      const s = prop(group, sl, 0.3, -15, -1.9, 4, 0.3); s.rotation.z = 0.1;
    },
  };
  HAZ.spin = {
    name: 'THE PLATTER', desc: 'The floor turns, carrying you round while you stand on it. Every 12 s the record scratches: it whips back and forth.',
    init: () => ({ n: -1, p: -1, ang: 0, w: 0 }),
    step(M, S, dt) {
      let w = 0.3; const c = cyc(S, 10, 12);
      if (c) { S.n = c.n; S.p = c.p; if (c.p >= 1 && c.p < 2.6) w += 2.2 * Math.sin((c.p - 1) / 1.6 * Math.PI * 3); }
      S.w = w; const a = -w * dt, ca = Math.cos(a), sa = Math.sin(a); S.ang += a;
      for (const f of M.fighters) { if (!f.grounded || f.pos.y > 0.02 || f.state === 'out' || f.state === 'held') continue;
        const x = f.pos.x, z = f.pos.z; f.pos.x = x * ca + z * sa; f.pos.z = -x * sa + z * ca; f.yaw += a; clampIn(f); }
    },
    build(group, A) { return { disc: A.props.disc, arm: A.props.arm, s: -9 }; },
    draw(V, M, S) {
      V.disc.rotation.y = S ? S.ang : 0; const sc = S && S.p >= 1 && S.p < 2.6;
      V.arm.rotation.y = 0.25 + (sc ? Math.sin(M.time * 30) * 0.03 : 0);
      if (S && S.p >= 0.2 && S.p < 1 && V.s !== S.n) { V.s = S.n; M.call(M.fighters[0], 'SCRATCH!', 'break', new V3(0, 3.2, 0)); }
      if (sc && V.k !== S.n) { V.k = S.n; SFX.play('scratch'); }
    },
  };

  /* ================================================== 16. INSIDE THE FRIDGE */
  TH.fridge = {
    name: 'INSIDE THE FRIDGE', tag: 'Up on the top shelf, with the leftovers',
    sky: [0xdaf0ff, 0xf2faff, 0x8aa8b8], fog: 0xdcecf6, hemi: [0xf0f8ff, 0x8aa0b0, 0.85], sun: [0xf4fbff, 0.8],
    floor: (x, z) => (x % 4 === 0) ? 0xeef6fa : (hh(x, 27, z) > 0.9 ? 0xb8dcee : 0xaad4ea),
    wall: (x, y, i) => y % 4 === 0 ? 0xdde6ec : (hh(i, y, 28) > 0.93 ? 0xe8f0f4 : 0xf4f8fa),
    edge: 0xbfe4ff, dust: [0xf4f8fa, 0xbfe4ff], out: 0xc8dce8, outY: -7, post: 0xe8f0f4,
    scenery(group) {
      const liner = lam(0xf0f6fa); backdrop(group, -18, 70, 40, liner, -8);
      for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), liner); m.position.set(s * 26, 12, -2); m.rotation.y = -s * Math.PI / 2; group.add(m); }
      box(group, 52, 0.3, 11, new THREE.MeshLambertMaterial({ color: 0xd8ecf4, transparent: true, opacity: 0.7 }), 0, -0.15, -12.5);   // the shelf behind
      const milk = new VX.Grid(); milk.box(-5, 0, -5, 5, 18, 5, (x, y) => y > 6 && y < 13 ? 0x3a7ad8 : 0xf4f6f8); for (let k = 0; k < 5; k++) milk.box(-5 + k, 19 + k, -5, 5 - k, 19 + k, 5, 0xf4f6f8); milk.box(-1, 24, -1, 1, 25, 1, 0x3a7ad8);
      prop(group, milk, 0.55, -14, 0, -12, 0.3);
      const eggs = new VX.Grid(); eggs.box(-12, 0, -6, 12, 2, 6, 0xb8b0a0); for (const x of [-8, 0, 8]) for (const z of [-3, 3]) eggs.ell(x, 5, z, 3, 4, 3, 0xf4ece0);
      prop(group, eggs, 0.4, 12, 0, -11.5, -0.2);
      const jar = new VX.Grid(); jar.cyl('y', 0, 0, 6, 0, 14, (x, y, z) => Math.hypot(x, z) < 5 && y > 0 ? (hh(x, y, z) > 0.55 ? 0x5a9a3a : 0x8ac06a) : 0xc8e8c0); jar.cyl('y', 0, 0, 6, 15, 16, 0xd8b048);
      prop(group, jar, 0.5, -5.5, 0, -14);
      const ch = new VX.Grid(); for (let x = 0; x < 14; x++) ch.box(x, 0, -4, x, Math.round(8 - x * 0.55), 4, (X, Y, Z) => hh(X, Y, Z) > 0.88 ? 0xd8a820 : 0xf2c838); prop(group, ch, 0.5, 3.5, 0, -14, 0.4);
      const br = new VX.Grid(); br.box(-1, 0, -1, 1, 8, 1, 0x7aa84a); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; br.ell(Math.cos(a) * 4, 11, Math.sin(a) * 4, 3, 3, 3, 0x3a8a3a); } br.ell(0, 13, 0, 3, 3, 3, 0x3a8a3a); prop(group, br, 0.35, -19, 0, -6, 0.5);
      const kb = new VX.Grid(); kb.cyl('y', 0, 0, 4, 0, 16, (x, y) => y > 6 && y < 11 ? 0xf4f4ee : 0xd8202a); kb.cyl('y', 0, 0, 2, 17, 20, 0xf4f4ee); prop(group, kb, 0.35, 19, 0, -6);
      const orange = new VX.Grid(); orange.ell(0, 5, 0, 5, 5, 5, (x, y, z) => hh(x, y, z) > 0.8 ? 0xffa030 : 0xff8a10); orange.box(0, 10, 0, 0, 11, 0, 0x4a8a3a); orange.box(1, 11, 0, 3, 11, 0, 0x5ab04a);
      prop(group, orange, 0.4, 8.5, 0, -9.5); prop(group, orange, 0.32, 10.5, 0, -8.6, 1);
      const jelly = new VX.Grid(); for (let y = 0; y < 8; y++) jelly.cyl('y', 0, 0, 7 - y * 0.5, y, y, y > 5 ? 0xff5a7a : 0xe0203a); jelly.ell(0, 9, 0, 2, 1, 2, 0xffffff); jelly.box(0, 10, 0, 0, 10, 0, 0xd8202a);
      prop(group, jelly, 0.4, -9, 0, -9.4);
      const can = new VX.Grid(); can.cyl('y', 0, 0, 3, 0, 11, (x, y) => y === 0 || y === 11 ? 0xc8ccd4 : (y > 4 && y < 8 ? 0xf4f4f4 : 0x2a8ad8)); prop(group, can, 0.4, 16, 0, -11, 0.4);
      const bulb = new VX.Grid(); bulb.ell(0, 0, 0, 3, 4, 3, G(0xf4fbff)); prop(group, bulb, 0.4, 0, 18, -16);
      const L = new THREE.PointLight(0xe8f4ff, 0.8, 50); L.position.set(0, 17, -14); group.add(L);
    },
    ambient(group) { return { update(dt) { if (U.vrand() < dt * 5) { const s = U.vrand() < 0.5 ? -1 : 1; FX.burst(new V3(s * U.vrnd(9, 18), U.vrnd(0, 3), U.vrnd(-10, 6)), { n: 1, color: [0xffffff, 0xeaf6ff], speed: 0.3, size: 0.35, gravity: -0.4, life: 3, up: 0.3, floor: -9 }); } } }; },
  };

  /* ======================================================== 17. FISH TANK */
  const GRAVEL = [0xd86a4a, 0x4a8ad8, 0xe8d84a, 0x6ad86a, 0xe8e0d0, 0x8a6ad8, 0xf09ab8];
  TH.aquarium = {
    name: 'FISH TANK', tag: 'The bottom of the fish tank, by the castle',
    sky: [0x0a4a6a, 0x2a8aa8, 0x062a3a], fog: 0x1a6a84, fogR: [16, 58], hemi: [0x9af0ff, 0x0a2a3a, 0.85], sun: [0xd8fff8, 0.9],
    floor: (x, z) => { const v = hh(x, 29, z); return v > 0.55 ? GRAVEL[Math.floor(hh(z, 30, x) * GRAVEL.length)] : (v > 0.2 ? 0xc8b89a : 0xb4a488); },
    wall: (x, y, i, w) => { if (w && w.h > 3 && y > 6 && hh(i, y, 31) > 0.55) return -1;
      return y < 4 ? (hh(i, y, 32) > 0.5 ? 0x6a5a50 : 0x5a4c44) : [0xff7a9a, 0xff9a4a, 0xa06ad8, 0xf4e05a][(Math.floor(i / 6) + (y > 7 ? 1 : 0)) % 4]; },
    noEdge: true, dust: [0xc8b89a, 0xe8e0d0], out: 0x8a7a5a, outY: -3, post: 0x5a4c44,
    scenery(group, A) {
      const c = new VX.Grid(), stone = (x, y, z) => hh(x, y, z) > 0.8 ? 0x8a8a92 : 0x9a9aa4;   // a sunken castle
      c.box(-10, 0, -6, 10, 12, 6, stone); for (const [x, z] of [[-10, -6], [10, -6], [-10, 6], [10, 6]]) { c.cyl('y', x, z, 3, 0, 20, stone); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; c.set(x + Math.round(Math.cos(a) * 3), 21, z + Math.round(Math.sin(a) * 3), stone(0, 0, k)); } }
      c.box(-3, 0, 6, 3, 7, 6, 0x2a2a30); c.box(-7, 8, 6, -6, 10, 6, 0x2a2a30); c.box(6, 8, 6, 7, 10, 6, 0x2a2a30);
      prop(group, c, 0.35, -13, -3, -11, 0.4);
      const ch = new VX.Grid(); ch.box(-6, 0, -4, 6, 6, 4, 0x7a4a24); ch.box(-6, 7, -4, 6, 9, 4, 0x6a3a1c); ch.box(-6, 6, -5, 6, 6, -4, 0xd8b048); ch.box(-1, 4, 4, 1, 6, 5, 0xd8b048);
      for (let k = 0; k < 10; k++) ch.set(Math.round(hh(k, 1, 1) * 10 - 5), 10, Math.round(hh(k, 2, 2) * 6 - 3), G(0xffd040));
      prop(group, ch, 0.35, 13, -3, -9, -0.4);
      const helm = new VX.Grid(); shell(helm, 0, 7, 0, 7, 7, 7, (x, y, z) => y < 1 ? -1 : (z > 4 && Math.hypot(x, y - 8) < 3.5 ? 0x2a4a5a : 0xc8902a), 0.55); helm.cyl('y', 0, 0, 8, 0, 1, 0xa87420);
      prop(group, helm, 0.3, 15, -3, 0, -1.2);
      A.props.weed = [];
      const weed = new VX.Grid(); for (let y = 0; y < 30; y++) weed.box(Math.round(Math.sin(y * 0.4) * 1.5), y, 0, Math.round(Math.sin(y * 0.4) * 1.5) + 1, y, 1, y % 5 === 0 ? 0x5ac85a : 0x3aa84a);
      [[-10, -8], [-16, -4], [9, -10], [-4, -12], [16, -6], [4, -13], [-17, 4], [17, 5]].forEach(([x, z], k) => A.props.weed.push(prop(group, weed, 0.25 + (k % 3) * 0.05, x, -3, z, k)));
      const st = new VX.Grid(); st.ell(0, 1, 0, 3, 1, 3, 0x6a6a72); prop(group, st, 0.3, -11, -3, -6);
    },
    ambient(group, A) {
      const FC = [[0xff8a2a, 0xffffff], [0x3a8aff, 0xffd040], [0xffd040, 0x2a2a30], [0xff5a9a, 0xffd0e0], [0x7aff9a, 0x2a8a5a], [0xb05ae0, 0xffffff]];
      const fish = FC.map(([a, b], k) => { const g = new VX.Grid(); g.ell(0, 0, 0, 2, 3, 5, (x, y, z) => (z % 4 === 0 ? b : a)); g.box(0, -2, -8, 0, 2, -6, a); g.box(0, -1, -6, 0, 1, -6, a); g.box(0, 3, -1, 0, 4, 1, b); g.box(-2, 1, 3, 2, 1, 3, 0x1a1a1e);
        const o = prop(group, g, 0.1 + (k % 3) * 0.03, 0, 0, 0); o.userData = { rx: 12 + k * 1.1, rz: 9 + (k % 3) * 1.3, y: 2 + k * 0.9, w: (k % 2 ? -1 : 1) * (0.22 + k * 0.03), a: k * 1.3 }; return o; });
      const bub = [], bg = new THREE.SphereGeometry(1, 10, 8), bm = basic(0xd8f8ff, 0.4);
      for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(bg, bm); m.scale.setScalar(U.vrnd(0.06, 0.16)); m.position.set(-11 + U.vrnd(-0.4, 0.4), U.vrnd(-3, 14), -6 + U.vrnd(-0.4, 0.4)); m.userData.v = U.vrnd(1.2, 2.4); group.add(m); bub.push(m); }
      let t = 0;
      return { update(dt) { t += dt;
        for (const o of fish) { const u = o.userData; u.a += u.w * dt; const x = Math.cos(u.a) * u.rx, z = Math.sin(u.a) * u.rz; o.position.set(x, u.y + Math.sin(t + u.a * 3) * 0.4, z); o.rotation.y = Math.atan2(-Math.sin(u.a) * u.rx * u.w, Math.cos(u.a) * u.rz * u.w); }
        for (const m of bub) { m.position.y += m.userData.v * dt; m.position.x += Math.sin(t * 3 + m.userData.v * 5) * dt * 0.2; if (m.position.y > 14) m.position.y = -3; }
        A.props.weed.forEach((w, k) => { w.rotation.z = Math.sin(t * 0.9 + k) * 0.08; w.rotation.x = Math.cos(t * 0.7 + k * 1.7) * 0.05; }); } };
    },
  };

  /* ================================================== the list and the menus */
  // the sky below the horizon fades into each stage's own haze (a low camera never sees a dark band past the ground)
  for (const id in TH) if (!['shelf', 'desk', 'chest'].includes(id)) TH[id].sky[2] = TH[id].fog;
  Arena.LIST = ['shelf', 'desk', 'chest','trainset', 'kitchen', 'bathtub', 'candy', 'windowsill', 'fridge', 'chess', 'clock', 'vinyl', 'pinball', 'neon', 'speedway', 'snowglobe', 'aquarium', 'dino', 'volcano', 'moonbase'];
  TH.shelf.tag = 'The playroom shelf, where it all starts'; TH.desk.tag = 'Homework can wait'; TH.chest.tag = 'Down in the toy chest';
  /* a picture of an arena for the menus: built off-screen once, seen from the fight camera, kept */
  const THUMBS = new Map(), WAIT = new Map(); let tR = null, busy = false;
  function render(id) {
    if (!tR) { tR = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); tR.setPixelRatio(1); tR.setSize(320, 180); }
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 400), A = Arena.build(scene, id);
    cam.position.set(0, 9.2, 16.4); cam.lookAt(0, 1.4, -2.2); tR.render(scene, cam);
    const url = tR.domElement.toDataURL('image/jpeg', 0.85); A.dispose(); return url;
  }
  Arena.thumb = (id, cb) => {
    if (THUMBS.has(id)) { cb && cb(THUMBS.get(id)); return THUMBS.get(id); }
    if (cb) { if (!WAIT.has(id)) WAIT.set(id, []); WAIT.get(id).push(cb); pump(); }
    return null;
  };
  function pump() {
    if (busy || !WAIT.size) return; busy = true;
    setTimeout(() => { busy = false; const id = WAIT.keys().next().value, cbs = WAIT.get(id); WAIT.delete(id);
      let url = ''; try { url = render(id); } catch (e) { console.warn('arena thumb', id, e); } THUMBS.set(id, url); cbs.forEach(f => { try { f(url); } catch (e) { /* the menu moved on */ } }); pump(); }, 16);
  }
  /* what a menu shows for an arena: its name, its line, and its hazard (if it has one) */
  Arena.info = id => { const T = TH[id] || TH.shelf, H = T.haz && HAZ[T.haz]; return { id, name: T.name, tag: T.tag || '', haz: H ? H.name : null, hazDesc: H ? H.desc : null, sky: css(T.sky[1]), floor: css(T.swatch != null ? T.swatch : (T.floor(20, 20) > 0 ? T.floor(20, 20) : T.out)), edge: css(T.edge || T.post || 0xffffff) }; };
})();
