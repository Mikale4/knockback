/* ============================================================================
   arena.js -- the stages: an enclosed floor with four walls, built at toy
   scale (the figures are a hand tall, so the room around them is huge).

   Each wall keeps a STRESS (0..100) that wall bounces add to and that slowly
   heals. Cracks spread across it as it rises; at 100 it BREAKS: it bursts
   into blocks, leaves a gap out of the arena for a few seconds, then snaps
   back together. Walls: E (x = +W), W (x = -W), N (z = -D), S (z = +D, the
   low one nearest the camera).
   ========================================================================== */
(function () {
  'use strict';
  const AS = 0.25;  // world units per arena voxel
  const W = 8, D = 6;
  const V3 = THREE.Vector3;

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
      edge: 0xe8d8b0, dust: [0x2f8a5c, 0x7fc79a], out: 0x4a3426, outY: -9,
    },
    chest: {
      name: 'TOY CHEST', sky: [0x5a4030, 0x8a6040, 0x2a1a12], fog: 0x6a4a34, hemi: [0xffe4c0, 0x40281a, 0.8], sun: [0xffd8a0, 1.0],
      floor: (x, z) => (Math.floor(x / 8) % 2 ? 0xa0703f : 0x986a3c) - (x % 8 === 0 ? 0x181008 : 0),
      wall: (x, y, i) => y % 3 === 0 ? 0x6e4520 : ((Math.floor(i / 9) % 2) ? 0x8a5a2b : 0x84552a),
      edge: 0xd9a441, dust: [0xa0703f, 0x6e4520], out: 0x3a5a8a, outY: -3,
    },
  };

  function build(scene, id) {
    const T = THEMES[id] || THEMES.shelf;
    const group = new THREE.Group(); scene.add(group);
    scene.fog = new THREE.Fog(T.fog, 26, 70);
    VX.sky(scene, T.sky[0], T.sky[1], T.sky[2]);
    const hemi = new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2]); group.add(hemi);
    const sun = new THREE.DirectionalLight(T.sun[0], T.sun[1]); sun.position.set(6, 14, 9); sun.castShadow = true;
    sun.shadow.mapSize.set(U.touch ? 1024 : 2048, U.touch ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 }); sun.shadow.bias = U.touch ? -0.0015 : -0.0008; sun.shadow.normalBias = 0.02;
    group.add(sun); group.add(sun.target);

    // the floor
    const fg = new VX.Grid(); fg.jit = 0.03;
    for (let x = -32; x < 32; x++) for (let z = -24; z < 24; z++) fg.set(x, 0, z, T.floor(x + 32, z + 24));
    for (let x = -32; x < 32; x++) for (let z = -24; z < 24; z++) if (x === -32 || x === 31 || z === -24 || z === 23) fg.set(x, -1, z, T.floor(x + 32, z + 24));
    const floor = VX.object(fg, AS, { cast: false }); floor.position.set(0.125, -0.125, 0.125); group.add(floor);
    // what's below the edge (a ring out lands there)
    const outM = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshLambertMaterial({ color: T.out }));
    outM.rotation.x = -Math.PI / 2; outM.position.y = T.outY; outM.receiveShadow = true; group.add(outM);
    // a plinth under the arena so it reads as raised
    const pl = new THREE.Mesh(new THREE.BoxGeometry(16.1, Math.abs(T.outY), 12.1), new THREE.MeshLambertMaterial({ color: Models.shade(T.out, 1.3) }));
    pl.position.y = T.outY / 2 - 0.13; pl.receiveShadow = true; group.add(pl);

    // the four walls
    const walls = [
      { id: 'E', axis: 'x', sign: 1, lim: W, n: { x: -1, z: 0 }, len: 2 * D, h: 10 },
      { id: 'W', axis: 'x', sign: -1, lim: W, n: { x: 1, z: 0 }, len: 2 * D, h: 10 },
      { id: 'N', axis: 'z', sign: -1, lim: D, n: { x: 0, z: 1 }, len: 2 * W, h: 10 },
      { id: 'S', axis: 'z', sign: 1, lim: D, n: { x: 0, z: -1 }, len: 2 * W, h: 3 },
    ];
    const colors = new Set();
    for (const w of walls) {
      const g = new VX.Grid(); g.jit = 0.05; const n = w.len / AS;
      for (let i = 0; i < n; i++) for (let y = 0; y < w.h; y++) for (let t = 0; t < 2; t++) {
        let c = T.wall(0, y, i); if (c < 0) continue;
        if (y === w.h - 1 && T.edge && id !== 'desk') c = T.edge;
        colors.add(c);
        if (w.axis === 'x') g.set(t, y, i - n / 2, c); else g.set(i - n / 2, y, t, c);
      }
      const o = VX.object(g, AS); w.obj = o;
      if (w.axis === 'x') o.position.set(w.sign > 0 ? W + 0.125 : -W - 0.375, 0.125, 0.125);
      else o.position.set(0.125, 0.125, w.sign > 0 ? D + 0.125 : -D - 0.375);
      w.baseY = o.position.y; group.add(o);
      w.stress = 0; w.broken = false; w.rebuild = 0; w.cracks = new THREE.Group(); group.add(w.cracks);
    }
    // corner posts
    const cg = new VX.Grid();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = 0; y < 11; y++) cg.box(sx > 0 ? 32 : -34, y, sz > 0 ? 24 : -26, sx > 0 ? 33 : -33, y, sz > 0 ? 25 : -25, y === 10 ? T.edge : Models.shade(T.out, 1.6));
    const corners = VX.object(cg, AS); corners.position.set(0.125, 0.125, 0.125); group.add(corners);
    // something big in the background for scale
    scenery(group, id, T);

    const crackMat = new THREE.MeshBasicMaterial({ color: 0x1a0f08 }), hotMat = new THREE.MeshBasicMaterial({ color: 0xff7a20, toneMapped: false });
    const seg = new THREE.BoxGeometry(1, 1, 1);
    const A = {
      id, name: T.name, W, D, walls, group, outY: T.outY, dust: T.dust, wallColors: Array.from(colors).slice(0, 6), hemi, sun, base: { hemi: hemi.intensity, sun: sun.intensity },
      /* a bounce adds stress and spreads a crack from where it hit */
      stress(w, add, at) {
        const before = w.stress; w.stress = Math.min(99, w.stress + add);
        const branches = 2 + Math.floor(add / 14);
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
      dispose() { scene.remove(group); scene.fog = null; const sk = scene.getObjectByName('sky'); if (sk) scene.remove(sk); },
    };
    return A;
  }

  /* big, simple shapes far off: the room the figures live in */
  function scenery(group, id, T) {
    const add = (g, s, x, y, z, ry) => { const o = VX.object(g, s, { cast: false }); o.position.set(x, y, z); o.rotation.y = ry || 0; group.add(o); return o; };
    if (id === 'shelf') {
      const g = new VX.Grid(); // a giant alphabet block and a ball
      g.box(-4, 0, -4, 4, 8, 4, 0xe0343f); g.box(-3, 1, 5, 3, 7, 5, 0xf6efe2); g.box(-1, 2, 6, 1, 6, 6, 0x3f7fe0);
      add(g, 0.9, -16, T.outY, -18, 0.4);
      const b = new VX.Grid(); b.ell(0, 0, 0, 6, 6, 6, (x, y, z) => (Math.floor((Math.atan2(z, x) + 3.2) * 1.3) % 2 ? 0xf2c230 : 0x3f7fe0)); add(b, 0.8, 18, T.outY + 5, -16);
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

  window.Arena = { build, THEMES, LIST: ['shelf', 'desk', 'chest'], AS };
})();
