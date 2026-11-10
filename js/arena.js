/* ============================================================================
   arena.js -- the stages, built at toy scale (the figures are a hand tall, so
   the room around them is huge), seen from the side.

   A stage is a floating MAIN PLATFORM, its top at y 0 from x -W to W (its top
   painted with the theme's floor, its sides with the theme's wall pattern,
   narrowing underneath), a LEDGE at each end, and a LAYOUT of pass-through
   platforms above it. Nothing is below: the BLAST ZONES (A.stage.blast) are
   where a figure is knocked out (platform.js has the rules). The theme's
   scenery stands behind it.

   A WALLED stage (the three house stages, and about a third of the rest) has a
   tall WALL at each end instead of a ledge. Each wall keeps a STRESS (0..100)
   that wall bounces add to and that slowly heals; cracks spread across its
   face as it rises, and at 100 it BREAKS: it bursts into blocks and leaves that
   end open for a few seconds, then snaps back together. On a walled stage the
   top blast zone comes down (the way out is up), and the side ones come in
   (out through a broken wall, it's close).
   ========================================================================== */
(function () {
  'use strict';
  const AS = 0.25;  // world units per arena voxel
  const W = 8, D = 2.5;
  const V3 = THREE.Vector3;
  /* the pass-through platforms over the main one: [centre x, height, width] */
  const LAYOUTS = {
    trio: [[-4.6, 2.7, 3.6], [4.6, 2.7, 3.6], [0, 5.2, 3.8]],
    duo: [[-3.9, 3.0, 4.2], [3.9, 3.0, 4.2]],
    high: [[0, 3.4, 6.0]],
    steps: [[-5.2, 2.4, 3.0], [0, 4.3, 3.6], [5.2, 2.4, 3.0]],
    flat: [],
  };
  const LAYOUT_ORDER = ['trio', 'duo', 'steps', 'high', 'trio', 'duo', 'flat'];
  const hashOf = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const layoutOf = id => LAYOUT_ORDER[hashOf(id) % LAYOUT_ORDER.length];
  const HOUSE_WALLED = ['shelf', 'desk', 'chest'], WALL_H = 48, WALL_T = 6;   // (a wall: 12 m tall, 1.5 m thick)
  const walledOf = (id, T) => T && T.walled != null ? !!T.walled : HOUSE_WALLED.includes(id) || (Math.floor(hashOf(id) / 7) % 10) < 3;

  const THEMES = {
    shelf: {
      name: 'PLAYROOM SHELF', sky: [0xf6d9b0, 0xe8b98a, 0x6a4a3a], fog: 0xe8c49a, hemi: [0xfff1dc, 0x6a5040, 0.85], sun: [0xfff0d8, 0.95],
      floor: (x, z) => ((Math.floor(z / 6) % 2) ? 0xc89a62 : 0xbe8f58) - ((x + Math.floor(z / 6) * 7) % 13 === 0 ? 0x101008 : 0),
      wall: (x, y, i) => [0xe0343f, 0x3f7fe0, 0xf2c230, 0x3fbf6a, 0xff8a2a, 0x9a5be0][(Math.floor(i / 4) + Math.floor(y / 4) * 2) % 6],
      edge: 0xf6efe2, dust: [0xc89a62, 0xe0c090], out: 0x5a3f2c, outY: -9,
    },
    desk: {
      name: 'STUDY DESK', sky: [0x2a3550, 0x56607a, 0x1a1a22], fog: 0x3a4258, hemi: [0xd8e4ff, 0x30303a, 0.7], sun: [0xffe2b0, 1.05],
      floor: (x, z) => (x % 8 === 0 || z % 8 === 0) ? 0x7fc79a : ((x + z) % 2 ? 0x2f8a5c : 0x2c8558),
      wall: (x, y, i) => { const b = Math.floor(i / 3); return y > 9 - (b * 7 % 3) ? -1 : [0x8a2a2a, 0x2a4a8a, 0x2a6a4a, 0x7a5a2a, 0x4a2a6a, 0xa0782a][b % 6] - (y === 8 ? 0x101010 : 0); },
      edge: 0xe8d8b0, noEdge: true, dust: [0x2f8a5c, 0x7fc79a], out: 0x4a3426, outY: -9,
    },
    chest: {
      name: 'TOY CHEST', sky: [0x5a4030, 0x8a6040, 0x2a1a12], fog: 0x6a4a34, hemi: [0xffe4c0, 0x40281a, 0.8], sun: [0xffd8a0, 1.0],
      floor: (x, z) => (Math.floor(x / 8) % 2 ? 0xa0703f : 0x986a3c) - (x % 8 === 0 ? 0x181008 : 0),
      wall: (x, y, i) => y % 3 === 0 ? 0x6e4520 : ((Math.floor(i / 9) % 2) ? 0x8a5a2b : 0x84552a),
      edge: 0xd9a441, dust: [0xa0703f, 0x6e4520], out: 0x3a5a8a, outY: -3,
    },
  };

  /* o: { layout, walled } overrides the theme's (the combo trials: the shelf, flat and walled) */
  function build(scene, id, o) {
    o = o || {};
    const T = THEMES[id] || THEMES.shelf;
    const group = new THREE.Group(); scene.add(group);
    scene.fog = new THREE.Fog(T.fog, T.fogR ? T.fogR[0] : 26, T.fogR ? T.fogR[1] : 70);
    VX.sky(scene, T.sky[0], T.sky[1], T.sky[2]);
    const hemi = new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2]); group.add(hemi);
    const sun = new THREE.DirectionalLight(T.sun[0], T.sun[1]); sun.position.set(6, 14, 9); sun.castShadow = true;
    sun.shadow.mapSize.set(U.touch ? 1024 : 2048, U.touch ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 }); sun.shadow.bias = U.touch ? -0.0015 : -0.0008; sun.shadow.normalBias = 0.02;
    group.add(sun); group.add(sun.target);

    // THE STAGE: the main platform's top (the theme's floor, the middle of it), its body (the wall pattern down its faces,
    // narrowing to a keel), and the layout's pass-through platforms
    const ZD = Math.round(D / AS), DEPTH = 9, wallOf = { id: 'S', axis: 'x', sign: 1, lim: W, n: { x: 0, z: -1 }, len: 2 * W, h: 10 };
    const colors = new Set();
    const fg = new VX.Grid(); fg.jit = 0.03;
    for (let x = -32; x < 32; x++) for (let z = -ZD; z < ZD; z++) fg.set(x, 0, z, T.floor(x + 32, z + 24));
    const top = VX.object(fg, AS, { cast: false }); top.position.set(0.125, -0.125, 0.125); group.add(top);
    const under = Models.shade(T.out, 1.15);
    const bg = new VX.Grid(); bg.jit = 0.05;
    for (let y = 1; y <= DEPTH; y++) {
      const ins = y <= 2 ? 0 : Math.round((y - 2) * 2.4), zi = Math.min(ins >> 1, ZD - 3);
      const x0 = -32 + ins, x1 = 31 - ins, z0 = -ZD + zi, z1 = ZD - 1 - zi;
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        const rim = x === x0 || x === x1 || z === z0 || z === z1;
        if (!rim && y !== DEPTH) continue;   // (a shell)
        let c = y <= 3 ? T.wall(0, 9 - y * 2, (z === z0 || z === z1) ? x + 32 : z + ZD, wallOf) : -1;
        if (c == null || c < 0) c = y <= 3 ? Models.shade(T.floor(Math.max(0, x + 32), 0), 0.72) : Models.shade(under, 1 - y * 0.03);
        colors.add(c); bg.set(x, -y, z, c);
      }
    }
    const body = VX.object(bg, AS, { cast: false }); body.position.set(0.125, -0.125, 0.125); group.add(body);
    const layout = LAYOUTS[o.layout] ? o.layout : LAYOUTS[T.layout] ? T.layout : layoutOf(id), plats = [];
    for (const [cx, py, w] of LAYOUTS[layout]) {
      const n = Math.round(w / AS), x0 = Math.round(cx / AS - n / 2), pg = new VX.Grid(); pg.jit = 0.04;
      const edge = T.edge != null ? T.edge : Models.shade(T.floor(32, 24), 1.2);
      for (let x = x0; x < x0 + n; x++) for (let z = -4; z < 4; z++) { pg.set(x, 0, z, x === x0 || x === x0 + n - 1 ? Models.shade(edge, 0.8) : edge); if (z > -3 && z < 3 && (x === x0 + 1 || x === x0 + n - 2)) pg.set(x, -1, z, Models.shade(edge, 0.6)); }
      const o = VX.object(pg, AS, { cast: true }); o.position.set(0.125, py - 0.125, 0.125); group.add(o);
      plats.push({ x1: x0 * AS, x2: (x0 + n) * AS, y: py, soft: true, obj: o });
    }
    const walled = o.walled != null ? !!o.walled : walledOf(id, T);
    const stage = { W, top: 0, bot: -DEPTH * AS, plats, layout, walled, blast: walled ? { x: W + 7, top: 13, bot: -9 } : { x: W + 11, top: 17, bot: -9 } };
    // the walls (a walled stage): the theme's wall pattern up the face the camera sees
    const walls = [];
    if (walled) for (const sign of [1, -1]) {
      const w = { id: sign > 0 ? 'E' : 'W', axis: 'x', sign, lim: W, n: { x: -sign, z: 0 }, len: 2 * D, h: WALL_H };
      const g = new VX.Grid(); g.jit = 0.05;
      for (let t = 0; t < WALL_T; t++) for (let y = 0; y < WALL_H; y++) for (let z = -ZD; z < ZD; z++) {
        if (!(t === 0 || t === WALL_T - 1 || z === -ZD || z === ZD - 1 || y === WALL_H - 1)) continue;   // (a shell)
        let c = T.wall(0, y % 10, (z + ZD) * 2 + t, w);
        if (c == null || c < 0) c = Models.shade(T.floor(t * 9 + 4, Math.max(0, z + 24)), 0.82);
        if (y === WALL_H - 1 && T.edge != null) c = T.edge;
        colors.add(c); g.set(sign > 0 ? t : -t - 1, y, z, c);
      }
      const o = VX.object(g, AS); o.position.set(sign * W + 0.125, 0.125, 0.125); group.add(o);
      w.obj = o; w.baseY = 0.125; w.stress = 0; w.broken = false; w.rebuild = 0; w.cracks = new THREE.Group(); group.add(w.cracks);
      walls.push(w);
    }
    // something big in the background for scale (the newer stages bring their own: arenas.js)
    if (!T.scenery) scenery(group, id, T);

    const crackMat = new THREE.MeshBasicMaterial({ color: 0x1a0f08 }), hotMat = new THREE.MeshBasicMaterial({ color: 0xff7a20, toneMapped: false });
    const seg = new THREE.BoxGeometry(1, 1, 1);
    const A = {
      id, name: T.name, W, D, walls, stage, group, outY: stage.blast.bot, dust: T.dust, wallColors: Array.from(colors).slice(0, 6), hemi, sun, base: { hemi: hemi.intensity, sun: sun.intensity },
      haz: T.haz && HAZ[T.haz] ? T.haz : null, props: {},
      /* a bounce adds stress and spreads a crack from where it hit */
      stress(w, add, at) {
        const before = w.stress; w.stress = Math.min(99, w.stress + add);
        if (U.quiet) return;
        const branches = 2 + Math.floor(add / 14);
        if (stage.walled) {   // (seen from the side: the cracks run over the wall's front)
          const x0 = w.sign > 0 ? W + 0.05 : -W - WALL_T * AS + 0.05, x1 = x0 + WALL_T * AS - 0.1;
          for (let b = 0; b < branches; b++) {
            let px = U.clamp(w.sign * (W + 0.2) + U.vrnd(-0.15, 0.6) * w.sign, x0, x1), py = U.clamp(at.y, 0.3, 7), a = U.vrand() * Math.PI * 2;
            for (let k = 3 + Math.floor(U.vrand() * 3); k > 0; k--) {
              const l = U.vrnd(0.18, 0.42); a += U.vrnd(-0.8, 0.8); const du = Math.cos(a) * l * 0.6, dy = Math.sin(a) * l;
              const m = new THREE.Mesh(seg, w.stress > 65 ? hotMat : crackMat); m.scale.set(Math.abs(du) + 0.05, Math.abs(dy) + 0.05, 0.03);
              m.position.set(U.clamp(px + du / 2, x0, x1), py + dy / 2, D + 0.02); w.cracks.add(m);
              px = U.clamp(px + du, x0, x1); py = U.clamp(py + dy, 0.1, 9);
            }
          }
          if (w.stress > 65 && before <= 65) w.cracks.children.forEach(m => m.material = hotMat);
          if (w.cracks.children.length > 90) w.cracks.children.slice(0, w.cracks.children.length - 90).forEach(m => w.cracks.remove(m));
          return;
        }
        for (let b = 0; b < branches; b++) {
          let px = at.x, py = U.clamp(at.y, 0.2, w.h * AS - 0.15), pz = at.z, a = U.vrand() * Math.PI * 2;
          const steps = 3 + Math.floor(U.vrand() * 3);
          for (let s = 0; s < steps; s++) {
            const l = U.vrnd(0.18, 0.42); a += U.vrnd(-0.8, 0.8);
            const du = Math.cos(a) * l, dy = Math.sin(a) * l;
            const m = new THREE.Mesh(seg, w.stress > 65 ? hotMat : crackMat);
            const u0 = w.axis === 'x' ? pz : px;
            m.scale.set(w.axis === 'x' ? 0.03 : Math.abs(du) + 0.04, Math.abs(dy) + 0.04, w.axis === 'x' ? Math.abs(du) + 0.04 : 0.03);
            const inner = w.sign * (w.lim - 0.005);
            if (w.axis === 'x') m.position.set(inner, py + dy / 2, u0 + du / 2); else m.position.set(u0 + du / 2, py + dy / 2, inner);
            w.cracks.add(m);
            if (w.axis === 'x') pz += du; else px += du; py = U.clamp(py + dy, 0.05, w.h * AS - 0.05);
          }
        }
        if (w.stress > 65 && before <= 65) w.cracks.children.forEach(m => m.material = hotMat);
        if (w.cracks.children.length > 90) w.cracks.children.slice(0, w.cracks.children.length - 90).forEach(m => w.cracks.remove(m));
      },
      breakWall(w, at) {
        w.broken = true; w.rebuild = 6.5; w.stress = 0; w.obj.visible = false;
        while (w.cracks.children.length) w.cracks.remove(w.cracks.children[0]);
        const out = new V3(-w.n.x, 0.2, -w.n.z);
        for (let i = 0; i < 6; i++) {
          const p = at.clone(); if (w.axis === 'x') p.z += U.vrnd(-2.5, 2.5); else p.x += U.vrnd(-2.5, 2.5); p.y = U.vrnd(0.2, w.h * AS);
          FX.burst(p, { n: 14, color: A.wallColors, speed: 9, size: 0.24, life: 1.6, dir: out, floor: T.outY, gravity: 22 });
        }
        FX.burst(at, { n: 30, color: A.wallColors, speed: 13, size: 0.16, life: 1.2, dir: out, floor: T.outY });
      },
      update(dt) {
        for (const w of walls) {
          if (w.broken) {
            w.rebuild -= dt;
            if (w.rebuild <= 0.5 && !w.obj.visible) { w.obj.visible = true; w.obj.position.y = w.baseY - w.h * AS; }
            if (w.obj.visible) w.obj.position.y = U.smooth(w.obj.position.y, w.baseY, 14, dt);
            if (w.rebuild <= 0) { w.broken = false; w.obj.position.y = w.baseY; SFX.play('snapon'); }
          } else if (w.stress > 0) {
            w.stress = Math.max(0, w.stress - dt * 0.6);
            if (w.stress < 12 && w.cracks.children.length) w.cracks.remove(w.cracks.children[0]);
          }
        }
      },
      reset() { for (const w of walls) { w.broken = false; w.rebuild = 0; w.stress = 0; w.obj.visible = true; w.obj.position.y = w.baseY; while (w.cracks.children.length) w.cracks.remove(w.cracks.children[0]); } },
      dispose() {
        scene.remove(group); scene.fog = null; const sk = scene.getObjectByName('sky'); if (sk) { scene.remove(sk); sk.geometry.dispose(); sk.material.dispose(); }
        // free what the stage put on the GPU (the voxel kit's shared materials stay: everything uses them)
        const keep = new Set([VX.litMat(), VX.glowMat()]);
        group.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) { if (keep.has(m)) continue; if (m.map) m.map.dispose(); m.dispose(); } });
      },
    };
    // the stage's own scenery, its HAZARD's meshes and its ambient life (rain, fish, snow...): arenas.js
    if (T.scenery) T.scenery(group, A);
    const H = A.haz ? HAZ[A.haz] : null, hv = H && H.build ? H.build(group, A) : null, amb = T.ambient ? T.ambient(group, A) : null;
    if (amb) amb.update(0, null);
    /* each drawn frame (never in a rollback's replays): pose the hazard from the match's M.haz (null with hazards off) */
    A.draw = (M, dt) => { if (hv && H.draw) H.draw(hv, M, M.hazards ? M.haz : null, dt); if (amb) amb.update(dt, M); };
    return A;
  }

  /* big, simple shapes far off: the room the figures live in */
  function scenery(group, id, T) {
    const add = (g, s, x, y, z, ry) => { const o = VX.object(g, s, { cast: false }); o.position.set(x, y, z); o.rotation.y = ry || 0; group.add(o); return o; };
    if (id === 'shelf') {
      const g = new VX.Grid(); // a giant alphabet block and a ball
      g.box(-4, 0, -4, 4, 8, 4, 0xe0343f); g.box(-3, 1, 5, 3, 7, 5, 0xf6efe2); g.box(-1, 2, 6, 1, 6, 6, 0x3f7fe0);
      add(g, 0.9, -16, T.outY, -18, 0.4);
      const b = new VX.Grid(); b.ell(0, 0, 0, 6, 6, 6, (x, y, z) => (Math.floor((Math.atan2(z, x) + 3.2) * 1.3) % 2 ? 0xf2c230 : 0x3f7fe0)); add(b, 0.8, 27, T.outY + 3, -27);   // (well back: off the side of the stage is where the recoveries are)
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), new THREE.MeshLambertMaterial({ color: 0xf0d8b8 })); wall.position.set(0, 10, -34); group.add(wall);
      for (let i = -6; i <= 6; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 50), new THREE.MeshLambertMaterial({ color: 0xe6c6a0 })); s.position.set(i * 9, 10, -33.9); group.add(s); }
    } else if (id === 'desk') {
      const g = new VX.Grid(); g.cyl('y', 0, 0, 5, 0, 16, (x, y, z) => y > 14 ? 0xd8d8d8 : 0x3a4a6a); // a pencil cup with pencils
      for (const [px, pz, c] of [[-2, 1, 0xf2c230], [1, -2, 0xe0343f], [2, 2, 0x3fbf6a]]) g.box(px, 17, pz, px, 26, pz, c);
      add(g, 0.7, -17, -1.2, -14);
      const lamp = new VX.Grid(); lamp.box(-1, 0, -1, 1, 30, 1, 0x2a2a30); lamp.box(-6, 30, -3, 6, 34, 3, 0x2a2a30); lamp.box(-5, 29, -2, 5, 29, 2, VX.glow(0xfff2c0));
      add(lamp, 0.6, 15, -1.2, -17);
      const glow = new THREE.PointLight(0xffe2a0, 0.8, 40); glow.position.set(15, 9, -17); group.add(glow);
      const top = new THREE.Mesh(new THREE.BoxGeometry(70, 1, 50), new THREE.MeshLambertMaterial({ color: 0x6a4a30 })); top.position.set(0, -1.7, -10); // the desk under the arena: kept well below the floor so the two never z-fight group.add(top);
    } else {
      const g = new VX.Grid(); // a giant teddy-like lump and a toy drum
      g.cyl('y', 0, 0, 6, 0, 8, (x, y, z) => y === 0 || y === 8 ? 0xf2e6c8 : (Math.floor(Math.atan2(z, x) * 3) % 2 ? 0xe0343f : 0xf2c230));
      add(g, 0.8, 16, T.outY, -14);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 1), new THREE.MeshLambertMaterial({ color: 0x7a4a24 })); lid.position.set(0, 7, -14); lid.rotation.x = -0.25; group.add(lid);
    }
  }

  const HAZ = {};   // the STAGE HAZARDS (arenas.js)
  window.Arena = { build, THEMES, HAZ, LIST: ['shelf', 'desk', 'chest'], AS, W, D, LAYOUTS, layoutOf, walledOf };
})();
