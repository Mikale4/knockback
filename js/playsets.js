/* ============================================================================
   playsets.js -- every figure comes with its own PLAYSET: a stage built from
   its own world (the Samurai's dojo under cherry blossom, the Pirate's ship,
   the Bowler's lane...). Thirty-six of them, one per line, as themes in
   Arena.THEMES with ids 'ps_<line>' and a `line` naming whose home it is.

   They are made from a small kit: patterns for the floor and the walls, a
   box of voxel props (trees, roofs, towers, flags, tents, masts, cannons,
   goals, hoops, targets...) and drifting particles (petals, snow, embers,
   bubbles...). They have no hazards: the house stages keep those.

   Arena.HOME[line] is a figure's playset; Arena.HOUSE lists the house stages.
   ========================================================================== */
(function () {
  'use strict';
  const TH = Arena.THEMES, hh = VX.hash3, G = VX.glow;
  const V3 = THREE.Vector3;
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  function prop(group, g, s, x, y, z, ry) { const ob = VX.object(g, s, { cast: false }); ob.position.set(x, y, z); ob.rotation.y = ry || 0; group.add(ob); return ob; }
  function slab(group, w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); group.add(m); return m; }
  const glowLight = (group, c, i, r, x, y, z) => { const l = new THREE.PointLight(c, i, r); l.position.set(x, y, z); group.add(l); return l; };

  /* ---------------------------------------------------- floor and wall patterns
     a floor is x 0..63 by z 0..47 (a voxel is a quarter metre); a wall is i along it by y 0..9 (the near one 0..2) */
  const pick = (a, x, y, z) => a[Math.floor(hh(x, y, z) * a.length) % a.length];
  const planks = (x, z, a, b, seam, len) => { const r = z >> 2, L = len || 16; return (x + r * 7) % L === 0 || z % 4 === 0 ? seam : (r % 2 ? a : b); };
  const plankZ = (x, z, a, b, seam, len) => planks(z, x, a, b, seam, len);
  const tiles = (x, z, n, a, b, grout) => (x % n === 0 || z % n === 0) ? grout : (((x / n | 0) + (z / n | 0)) % 2 ? a : b);
  const checker = (x, z, n, a, b) => (((x / n | 0) + (z / n | 0)) % 2 ? a : b);
  const speck = (x, z, base, sp, p) => hh(x, 3, z) > (p || 0.9) ? sp : base;
  const dist = (x, z) => Math.hypot(x - 31.5, z - 23.5);
  const stripes = (k, n, a, b) => ((k / n | 0) % 2 ? a : b);

  /* ------------------------------------------------------------ the prop box */
  const K = {
    tree(trunk, leaf, h, r, leaf2) { const g = new VX.Grid(); g.cyl('y', 0, 0, 1.3, 0, h, trunk); g.ell(0, h + r * 0.35, 0, r, r * 0.75, r, (x, y, z) => leaf2 != null && hh(x, y, z) > 0.62 ? leaf2 : leaf); return g; },
    pine(trunk, leaf, leaf2) { const g = new VX.Grid(); g.cyl('y', 0, 0, 1, 0, 5, trunk); for (let k = 0; k < 4; k++) g.cyl('y', 0, 0, 7 - k * 1.6, 4 + k * 4, 7 + k * 4, (x, y, z) => hh(x, y, z) > 0.75 ? leaf2 : leaf); g.box(0, 20, 0, 0, 22, 0, leaf); return g; },
    palm(trunk, leaf) { const g = new VX.Grid(); for (let y = 0; y < 22; y++) g.box(Math.round(Math.sin(y / 7) * 2), y, 0, Math.round(Math.sin(y / 7) * 2) + 1, y, 1, y % 3 ? trunk : Models.H.shade(trunk, 0.8)); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; for (let s = 1; s < 9; s++) g.set(Math.round(Math.cos(a) * s) + 2, 22 - Math.round(s * s / 14), Math.round(Math.sin(a) * s), leaf); } return g; },
    // a Japanese roof (eaves upturned at the corners) over walls; `levels` of them make a pagoda or a keep
    pagoda(levels, wallC, roofC, w, trim) { const g = new VX.Grid(); let y = 0;
      for (let k = 0; k < levels; k++) { const r = w - k * 2; g.box(-r, y, -r, r, y + 6, r, (x, yy, z) => (Math.abs(x) === r || Math.abs(z) === r) && (x + z) % 4 === 0 ? (trim != null ? trim : 0x2a1a10) : wallC);
        y += 7; for (let e = 0; e < 3; e++) { const rr = r + 4 - e; g.box(-rr, y + e, -rr, rr, y + e, rr, roofC); }
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.set(sx * (r + 4), y + 1, sz * (r + 4), roofC);
        y += 3; }
      g.box(0, y, 0, 0, y + 4, 0, trim != null ? trim : 0xd8b048); return g; },
    tower(r, h, wallC, capC, flag) { const g = new VX.Grid(); g.cyl('y', 0, 0, r, 0, h, (x, y, z) => y % 4 === 0 ? Models.H.shade(wallC, 0.85) : wallC);
      for (let k = 0; k < 16; k += 2) { const a = k / 16 * Math.PI * 2; g.box(Math.round(Math.cos(a) * r), h + 1, Math.round(Math.sin(a) * r), Math.round(Math.cos(a) * r), h + 2, Math.round(Math.sin(a) * r), wallC); }
      if (capC != null) for (let k = 0; k < 8; k++) g.cyl('y', 0, 0, Math.max(0, r - k * r / 7), h + 1 + k, h + 1 + k, capC);
      if (flag != null) { g.box(0, h + 9, 0, 0, h + 16, 0, 0x5a5a5a); g.box(1, h + 13, 0, 6, h + 16, 0, flag); } return g; },
    keep(w, h, wallC, flag) { const g = new VX.Grid(); g.box(-w, 0, -w, w, h, w, (x, y, z) => y % 3 === 0 || (x + z + (y / 3 | 0) * 2) % 6 === 0 ? Models.H.shade(wallC, 0.85) : wallC);
      for (let x = -w; x <= w; x += 2) { g.box(x, h + 1, -w, x, h + 2, -w, wallC); g.box(x, h + 1, w, x, h + 2, w, wallC); } for (let z = -w; z <= w; z += 2) { g.box(-w, h + 1, z, -w, h + 2, z, wallC); g.box(w, h + 1, z, w, h + 2, z, wallC); }
      for (let y = 4; y < h - 2; y += 6) for (const x of [-w / 2 | 0, w / 2 | 0]) g.box(x, y, w + 1, x, y + 2, w + 1, 0x1a1a1e);
      if (flag != null) { g.box(0, h + 1, 0, 0, h + 12, 0, 0x5a5a5a); g.box(1, h + 8, 0, 7, h + 12, 0, flag); } return g; },
    flag(h, a, b, w) { const g = new VX.Grid(); g.box(0, 0, 0, 0, h, 0, 0x6a5a4a); g.box(1, h - 6, 0, w || 7, h, 0, (x, y) => b != null && (y + x) % 4 < 2 ? b : a); return g; },
    banner(h, a, b) { const g = new VX.Grid(); g.box(0, 0, 0, 0, h, 0, 0x3a2a1a); g.box(1, h - 2, 0, 3, h, 0, 0x3a2a1a); g.box(1, 4, 0, 3, h - 3, 0, (x, y) => b != null && y % 6 === 0 ? b : a); return g; },
    tent(r, h, a, b) { const g = new VX.Grid(); for (let y = 0; y <= h; y++) g.cyl('y', 0, 0, r * (1 - y / (h + 1)) + 0.5, y, y, (x, yy, z) => b != null && Math.floor((Math.atan2(z, x) + 3.2) * 2) % 2 ? b : a); g.box(0, h + 1, 0, 0, h + 4, 0, 0x6a5a4a); g.box(1, h + 3, 0, 3, h + 4, 0, b != null ? b : a); return g; },
    mast(h, sail, flag) { const g = new VX.Grid(); g.box(0, 0, 0, 1, h, 1, 0x6a4424); g.box(-9, h * 0.35 | 0, 0, 10, h * 0.35 | 0, 1, 0x6a4424); g.box(-9, h * 0.75 | 0, 0, 10, h * 0.75 | 0, 1, 0x6a4424);
      g.box(-8, (h * 0.35 | 0) + 1, 2, 9, (h * 0.75 | 0) - 1, 2, sail); g.box(-3, h - 4, -3, 4, h - 2, 4, 0x5a3a20); if (flag != null) g.box(2, h + 1, 0, 9, h + 5, 0, flag); return g; },
    hull(len, col, rail) { const g = new VX.Grid(); for (let x = -len; x <= len; x++) { const k = 1 - (x / len) ** 2, w = Math.round(2 + 6 * Math.sqrt(Math.max(0, k))); g.box(x, 0, -w, x, 7, w, (xx, y) => y === 7 ? rail : y % 2 ? col : Models.H.shade(col, 0.9)); } return g; },
    cannon(c) { const g = new VX.Grid(); g.box(-3, 0, -2, 3, 2, 2, 0x6a4424); g.cyl('x', 4, 0, 1.6, -4, 7, c); g.cyl('x', 4, 0, 2.2, -5, -4, c); for (const [x, z] of [[-2, -3], [2, -3], [-2, 3], [2, 3]]) g.cyl('z', 1, x, 1.3, z, z, 0x3a2a1a); return g; },
    barrel(c, band) { const g = new VX.Grid(); g.cyl('y', 0, 0, 3, 0, 7, (x, y) => y === 1 || y === 6 ? band : c); return g; },
    crate(c) { const g = new VX.Grid(); g.box(-3, 0, -3, 3, 6, 3, (x, y, z) => Math.abs(x) === 3 || Math.abs(z) === 3 || y === 0 || y === 6 ? Models.H.shade(c, 0.8) : c); return g; },
    lantern(c) { const g = new VX.Grid(); g.box(0, 6, 0, 0, 9, 0, 0x2a2a2a); g.box(-1, 2, -1, 1, 5, 1, G(c)); g.box(-2, 1, -2, 2, 1, 2, 0x2a2a2a); g.box(-2, 6, -2, 2, 6, 2, 0x2a2a2a); return g; },
    stoneLantern() { const g = new VX.Grid(); g.box(-2, 0, -2, 2, 1, 2, 0x8a8478); g.box(-1, 2, -1, 1, 6, 1, 0x9a948a); g.box(-2, 7, -2, 2, 9, 2, (x, y, z) => y === 8 && Math.abs(x) < 2 && Math.abs(z) < 2 ? G(0xffd890) : 0x8a8478); g.box(-3, 10, -3, 3, 10, 3, 0x7a746a); g.set(0, 11, 0, 0x7a746a); return g; },
    disc(r, c, ring) { const g = new VX.Grid(); g.cyl('z', 0, 0, r, 0, 0, (x, y) => ring && Math.abs(Math.hypot(x, y) - r * 0.7) < 1 ? ring : c); return g; },
    target(r) { const g = new VX.Grid(); const cols = [0xf2c230, 0xd8301a, 0x2a6ae0, 0x1a1a1e, 0xf4f4f0]; g.cyl('z', 0, 0, r, 0, 1, (x, y) => cols[Math.min(4, Math.floor(Math.hypot(x, y) / (r / 5)))]); g.box(-r, -r - 6, 2, -r + 1, 0, 2, 0x6a4424); g.box(r - 1, -r - 6, 2, r, 0, 2, 0x6a4424); return g; },
    goal(w, h, c) { const g = new VX.Grid(); g.box(-w, 0, 0, -w, h, 0, c); g.box(w, 0, 0, w, h, 0, c); g.box(-w, h, 0, w, h, 0, c); for (let x = -w; x <= w; x += 2) g.box(x, 0, -4, x, h - 1, -4, 0xe8e8e8); g.box(-w, h, -4, w, h, -4, 0xe8e8e8); return g; },
    posts(h, c) { const g = new VX.Grid(); g.box(0, 0, 0, 0, 8, 0, c); g.box(-7, 8, 0, 7, 8, 0, c); g.box(-7, 8, 0, -7, h, 0, c); g.box(7, 8, 0, 7, h, 0, c); return g; },
    hoop() { const g = new VX.Grid(); g.box(0, 0, 0, 1, 20, 1, 0x6a6e74); g.box(-6, 20, 2, 7, 28, 2, (x, y) => (x === -6 || x === 7 || y === 20 || y === 28) ? 0xe8681a : (Math.abs(x - 0.5) < 3 && y > 21 && y < 25 && (x === -2 || x === 3 || y === 22) ? 0xf4f4f0 : 0xf4f4f0)); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.set(Math.round(Math.cos(a) * 2.5) + 1, 21, Math.round(Math.sin(a) * 2.5) + 6, 0xe8681a); } return g; },
    stands(w, rows, seat, crowd) { const g = new VX.Grid(); for (let r = 0; r < rows; r++) { g.box(-w, r * 2, -r * 2, w, r * 2 + 1, -r * 2 - 1, seat); for (let x = -w; x <= w; x += 2) if (hh(x, r, 5) > 0.35) g.box(x, r * 2 + 2, -r * 2 - 1, x, r * 2 + 3, -r * 2 - 1, pick(crowd, x, r, 1)); } return g; },
    lights(h, c) { const g = new VX.Grid(); g.box(0, 0, 0, 1, h, 1, 0x6a6e74); g.box(-4, h + 1, 0, 5, h + 4, 1, (x, y) => (x + y) % 2 ? G(c || 0xffffff) : 0x3a3a40); return g; },
    screen(w, h, c) { const g = new VX.Grid(); g.box(-w - 1, -1, 0, w + 1, h + 1, 1, 0x1a1a1e); g.box(-w, 0, -1, w, h, -1, (x, y) => hh(x, y, 2) > 0.55 ? G(c) : G(Models.H.shade(c, 0.4))); return g; },
    bell(c) { const g = new VX.Grid(); g.box(-7, 0, 0, -6, 18, 1, 0x6a4424); g.box(6, 0, 0, 7, 18, 1, 0x6a4424); g.box(-8, 18, 0, 8, 19, 1, 0x4a2a1a); for (let y = 0; y < 9; y++) g.cyl('y', 0, 0.5, 2.5 + y * 0.35, 16 - y, 16 - y, c); return g; },
    blossomTree(trunk, a, b) { const g = new VX.Grid(); g.cyl('y', 0, 0, 1.3, 0, 9, trunk); g.line(0, 9, 0, -6, 14, 2, trunk, 1); g.line(0, 9, 0, 5, 15, -2, trunk, 1);
      for (const [x, y, z, r] of [[-6, 16, 2, 5], [5, 17, -2, 5], [0, 19, 0, 6]]) g.ell(x, y, z, r, r * 0.7, r, (xx, yy, zz) => hh(xx, yy, zz) > 0.6 ? b : a); return g; },
    skull(c) { const g = new VX.Grid(); g.ell(0, 8, 0, 8, 7, 9, c); g.box(-6, 0, 4, 6, 4, 12, c); g.ell(-3.5, 9, 7, 2, 2, 2, -1); g.ell(3.5, 9, 7, 2, 2, 2, -1); for (const s of [-1, 1]) g.line(s * 6, 13, 0, s * 13, 22, -6, c, 1.4); for (let x = -5; x <= 5; x += 2) g.box(x, 0, 12, x, 2, 12, 0xf4f0e0); return g; },
    rock(c, r) { const g = new VX.Grid(); g.ell(0, r * 0.6, 0, r, r * 1.3, r * 0.8, (x, y, z) => hh(x, y, z) > 0.8 ? Models.H.shade(c, 0.85) : c); return g; },
    pins() { const g = new VX.Grid(); for (const [x, z] of [[0, 0], [-3, -4], [3, -4], [-6, -8], [0, -8], [6, -8]]) { g.ell(x, 4, z, 1.5, 3, 1.5, 0xf6f4ee); g.ell(x, 9, z, 1, 1.6, 1, 0xf6f4ee); g.box(x - 1, 6, z - 1, x + 1, 6, z + 1, 0xd8323a); } return g; },
    dumbbell(c) { const g = new VX.Grid(); g.cyl('x', 0, 0, 1, -8, 8, 0xa8acb4); for (const x of [-8, -6, 6, 8]) g.cyl('x', 0, 0, 4.5, x, x + (x < 0 ? 1 : -1), c); return g; },
    belt() { const g = new VX.Grid(); g.box(-14, -2, 0, 14, 2, 0, 0x1a1a1e); g.ell(0, 0, 0, 5, 4.5, 1, (x, y) => Math.hypot(x, y) < 2.5 ? 0xffe27a : 0xd8b048); for (const x of [-9, 9]) g.ell(x, 0, 0, 2.5, 2.5, 0.6, 0xd8b048); return g; },
    wheel(c) { const g = new VX.Grid(); for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; g.set(Math.round(Math.cos(a) * 9), Math.round(Math.sin(a) * 9), 0, c); } for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.line(0, 0, 0, Math.cos(a) * 12, Math.sin(a) * 12, 0, c, 0.6); } g.ell(0, 0, 0, 2, 2, 1.5, 0xd8b048); return g; },
    anchor(c) { const g = new VX.Grid(); g.box(0, 0, 0, 1, 16, 1, c); g.box(-4, 14, 0, 5, 14, 1, c); g.cyl('z', 0.5, 17, 2, 0, 1, -1); for (let k = 0; k <= 12; k++) { const a = Math.PI + k / 12 * Math.PI; g.set(Math.round(Math.cos(a) * 7) + 0.5, Math.round(Math.sin(a) * 5) + 5, 0, c); } return g; },
    halfpipe(c, cope) { const g = new VX.Grid(); for (let x = -14; x <= 14; x++) { const h = Math.round((Math.abs(x) / 14) ** 2 * 12); g.box(x, 0, -10, x, h, 10, (xx, y) => y === h && Math.abs(x) > 12 ? cope : c); } return g; },
    city(n, col, win) { const g = new VX.Grid(); for (let k = 0; k < n; k++) { const x0 = k * 9 - n * 4.5, h = 14 + Math.floor(hh(k, 1, 9) * 22); g.box(x0, 0, 0, x0 + 7, h, 5, (x, y) => (x % 2 === 0 && y % 3 === 1 && hh(x, y, k) > 0.45) ? G(win) : col); } return g; },
  };

  /* ---------------------------------------------------------- drifting things */
  function drift(group, o) {
    const N = o.n || 150, pos = new Float32Array(N * 3), vel = [];
    for (let i = 0; i < N; i++) { pos[i * 3] = U.vrnd(-22, 22); pos[i * 3 + 1] = U.vrnd(-1, 14); pos[i * 3 + 2] = U.vrnd(-18, 13); vel.push(U.vrnd(0.6, 1.4)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: o.col, size: o.size || 0.13, transparent: true, opacity: o.op || 0.9, depthWrite: false })));
    let t = 0;
    return { update(dt) { t += dt; const a = geo.attributes.position.array, up = o.rise ? 1 : -1;
      for (let i = 0; i < N; i++) { const k = i * 3, v = vel[i]; a[k + 1] += up * (o.speed || 1) * v * dt; a[k] += (Math.sin(t * (o.sway || 0.9) + i) * (o.amp || 0.5) + (o.wind || 0) * v) * dt; a[k + 2] += Math.cos(t * 0.7 + i * 1.3) * (o.amp || 0.5) * 0.5 * dt;
        if (up < 0 && a[k + 1] < -1.5) { a[k + 1] = 14; a[k] = U.vrnd(-22, 22); } if (up > 0 && a[k + 1] > 14) { a[k + 1] = -1; a[k] = U.vrnd(-22, 22); }
        if (a[k] > 24) a[k] = -24; else if (a[k] < -24) a[k] = 24; }
      geo.attributes.position.needsUpdate = true; } };
  }
  // camera flashes in the crowd (the ring, the title fight)
  function flashes(group, n, area) {
    const ms = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); m.position.set(U.vrnd(-area[0], area[0]), U.vrnd(1, area[1]), U.vrnd(area[2], area[3])); m.visible = false; group.add(m); ms.push(m); }
    return { update() { for (const m of ms) m.visible = U.vrand() < 0.03; } };
  }

  /* --------------------------------------------------------------- a playset */
  const HOME = {};
  const set = (line, T) => { const id = 'ps_' + line; T.line = line; T.sky[2] = T.fog; TH[id] = T; HOME[line] = id; };

  /* ================================================== HISTORICAL FANTASY */
  set('monk', { name: 'MOUNTAIN TEMPLE', tag: 'Above the clouds, where the bell rings at dawn',
    sky: [0xf0b89a, 0xfde6d2], fog: 0xf2dccc, hemi: [0xfff0e0, 0x6a5a4a, 0.85], sun: [0xffe0c0, 1.0],
    floor: (x, z) => speck(x, z, tiles(x, z, 8, 0xb8b0a0, 0xaea694, 0x8a8478), 0x7a8a5a, 0.94),
    wall: (x, y, i) => y >= 8 ? 0x4a2a1a : (i % 8 < 2 ? 0xb8302a : 0xeee6d6),
    edge: 0x3a2a1a, dust: [0xb8b0a0, 0xeee6d6], out: 0xe8dcd0, outY: -12, post: 0xb8302a, plinth: 0x8a8478,
    scenery(g) { prop(g, K.pagoda(3, 0xeee6d6, 0x3a3a44, 9, 0xb8302a), 0.42, 0, -1.2, -20); prop(g, K.bell(0xa87a3a), 0.4, -15, -1.2, -12, 0.4);
      for (const [x, z] of [[14, -14], [18, -6], [-19, -4]]) prop(g, K.pine(0x5a3a24, 0x3a6a3a, 0x4a7a44), 0.45, x, -1.2, z);
      for (const [x, z, s] of [[-30, -40, 2.2], [26, -44, 2.6], [0, -50, 3]]) prop(g, K.rock(0x8a94a8, 8), s, x, -14, z); },
    ambient: g => drift(g, { col: 0xe08a3a, n: 60, speed: 0.5, size: 0.16, amp: 1 }) });
  set('viking', { name: 'LONGHOUSE', tag: 'Under the northern lights, by the longship',
    sky: [0x0a1a2a, 0x2a7a5a], fog: 0x1a2a34, hemi: [0xa0c8ff, 0x2a1a10, 0.7], sun: [0xffc890, 0.9],
    floor: (x, z) => planks(x, z, 0x6a4a2a, 0x5e4226, 0x3a2614, 20),
    wall: (x, y, i) => { const s = i % 10, c = s >= 3 && s <= 6 && y >= 3 && y <= 6; return c ? [0xc8201a, 0xf2c230, 0x2a5ab8][(i / 10 | 0) % 3] : (y % 3 === 0 ? 0x4a2e18 : 0x5a3a20); },
    edge: 0xc8a040, dust: [0x6a4a2a, 0xe8f0f8], out: 0xe8f0f8, outY: -3, post: 0x3a2614, plinth: 0x4a2e18,
    scenery(g) { prop(g, K.hull(16, 0x6a4424, 0xc8a040), 0.45, 0, -2.5, -18); const prow = new VX.Grid(); prow.line(0, 0, 0, 0, 14, 4, 0x6a4424, 1.2); prow.ell(0, 15, 6, 2, 2, 3, 0xc8a040); prop(g, prow, 0.45, 7.4, 0.6, -18);
      prop(g, K.mast(26, 0xc8201a), 0.4, 0, -1.2, -18); prop(g, K.rock(0x5a6a7a, 5), 0.5, -16, -2.5, -10); glowLight(g, 0xff9a40, 1.2, 30, 14, 1, -10);
      const fire = new VX.Grid(); fire.cyl('y', 0, 0, 4, 0, 1, 0x3a3a3a); fire.ell(0, 3, 0, 2.5, 3, 2.5, (x, y) => G(y > 4 ? 0xffd040 : 0xff6a20)); prop(g, fire, 0.4, 14, -1.2, -10); },
    ambient: g => drift(g, { col: 0xffffff, n: 220, speed: 0.8, size: 0.12 }) });
  set('summoner', { name: 'SUMMONING CIRCLE', tag: 'Where the ninefold circle opens',
    sky: [0x14081e, 0x3a1a5a], fog: 0x2a1a3a, hemi: [0xc8a0ff, 0x1a1020, 0.7], sun: [0xd0c0ff, 0.9],
    floor: (x, z) => { const d = dist(x, z); return Math.abs(d - 19) < 0.8 || Math.abs(d - 10) < 0.7 ? G(0x5fe08a) : tiles(x, z, 8, 0x3a3444, 0x34303e, 0x24202c); },
    wall: (x, y, i) => hh(i, y, 7) > 0.92 ? G(0x5fe08a) : 0x24202c,
    edge: 0x5fe08a, dust: [0x3a3444, 0x5fe08a], out: 0x0c0614, outY: -14, post: 0x24202c, plinth: 0x1a1620,
    scenery(g) { for (const [x, y, z] of [[-14, 3, -12], [15, 5, -14], [0, 7, -22], [-20, 6, -4]]) { const c = new VX.Grid(); c.ell(0, 0, 0, 2, 5, 2, G(0x7affb0)); prop(g, c, 0.4, x, y, z, x); }
      for (const [x, z] of [[-10, -14], [9, -16], [18, -7]]) { const c = new VX.Grid(); c.cyl('y', 0, 0, 2, 0, 12, 0xe8e0d0); c.box(0, 13, 0, 0, 15, 0, G(0xffd890)); prop(g, c, 0.35, x, -1.2, z); }
      const book = new VX.Grid(); book.box(-12, 0, -8, 12, 2, 8, 0x3a1a4a); book.box(-11, 3, -7, -1, 3, 7, 0xf0e8d0); book.box(1, 3, -7, 11, 3, 7, 0xf0e8d0); prop(g, book, 0.45, 0, -1.6, -17, 0.1); glowLight(g, 0x5fe08a, 0.8, 30, 0, 3, -6); },
    ambient: g => drift(g, { col: 0x7affb0, n: 90, rise: true, speed: 0.6, size: 0.1 }) });
  set('bard', { name: 'TAVERN STAGE', tag: 'One more song before last orders',
    sky: [0x2a1a10, 0x6a4024], fog: 0x4a3020, hemi: [0xffd8a0, 0x3a2414, 0.85], sun: [0xffc070, 1.0],
    floor: (x, z) => planks(x, z, 0x9a6a3a, 0x8e6236, 0x5a3a1e, 12),
    wall: (x, y, i) => i % 12 === 0 ? 0x3a2414 : y < 4 ? 0x4a2a16 : 0xd8c098,
    edge: 0x2a180c, dust: [0x9a6a3a, 0xd8c098], out: 0x3a2414, outY: -2, post: 0x3a2414, plinth: 0x4a2a16,
    scenery(g) { for (const [x, z, k] of [[-15, -12, 0], [-12, -15, 1], [-15, -15, 2]]) prop(g, K.barrel(0x8a5a2a, 0x4a4a4a), 0.4, x, -2 + (k === 2 ? 2.8 : 0), z);
      const lute = new VX.Grid(); lute.ell(0, 0, 0, 7, 9, 2, 0xc8883a); lute.cyl('z', 0, 0, 2, 2, 2, 0x2a1a10); lute.box(-1, 9, 0, 1, 24, 1, 0x6a3a1a); lute.box(-2, 24, 0, 2, 28, 1, 0x4a2a14); prop(g, lute, 0.4, 15, -1.6, -14, -0.4);
      for (const x of [-6, 6]) { prop(g, K.lantern(0xffc060), 0.4, x, 5, -9); glowLight(g, 0xffb050, 0.8, 18, x, 5, -8); } },
    ambient: g => drift(g, { col: 0xffd080, n: 50, speed: 0.15, size: 0.08, amp: 0.3 }) });

  /* ========================================================== EDO JAPAN */
  set('samurai', { name: 'CHERRY BLOSSOM DOJO', tag: 'Tatami, shoji, and the blossom falling',
    sky: [0x8ac0ff, 0xffe0ea], fog: 0xf8e4ea, hemi: [0xffffff, 0x6a5a4a, 0.9], sun: [0xfff4e8, 1.0],
    floor: (x, z) => (x % 8 === 0 || z % 16 === 0) ? 0x2a3a2a : ((x >> 3) + (z >> 4)) % 2 ? 0xc8c08a : 0xc0b882,
    wall: (x, y, i) => i % 6 === 0 || y % 3 === 0 ? 0x6a4a2a : 0xf4efe2,
    edge: 0x4a3220, dust: [0xc8c08a, 0xffb0c8], out: 0x5a8a4a, outY: -2, post: 0x4a3220, plinth: 0x6a4a2a,
    scenery(g) { for (const [x, z, s] of [[-15, -12, 0.42], [14, -15, 0.45], [19, -4, 0.38], [-6, -19, 0.4]]) prop(g, K.blossomTree(0x4a3020, 0xffb0c8, 0xf8d8e4), s, x, -2, z);
      prop(g, K.stoneLantern(), 0.35, -9, -2, -9); prop(g, K.pagoda(1, 0xf4efe2, 0x3a3a44, 10, 0x6a4a2a), 0.4, 3, -2, -18); },
    ambient: g => drift(g, { col: 0xffa8c8, n: 160, speed: 0.45, size: 0.14, amp: 1.2 }) });
  set('ninja', { name: 'MOONLIT ROOFTOPS', tag: 'Across the castle town by moonlight',
    sky: [0x0a1030, 0x2a3a6a], fog: 0x1a2240, hemi: [0x8aa0ff, 0x101018, 0.6], sun: [0xb8c8ff, 0.9],
    floor: (x, z) => z % 4 === 0 ? 0x24282e : (x % 3 === 0 ? 0x2e343c : 0x3a4048),
    wall: (x, y, i) => y >= 6 ? 0xc8c4bc : (i % 8 === 0 ? 0x1a1614 : 0x2a2420),
    edge: 0x5a5a62, dust: [0x3a4048, 0xc8c4bc], out: 0x101420, outY: -10, post: 0x1a1614, plinth: 0x2a2420,
    scenery(g) { const moon = new VX.Grid(); moon.cyl('z', 0, 0, 9, 0, 0, (x, y) => hh(x, y, 4) > 0.85 ? G(0xd8dcc8) : G(0xfff8d8)); prop(g, moon, 0.6, 12, 16, -40);
      prop(g, K.pagoda(4, 0x2a2a34, 0x14141a, 8, 0x3a3a44), 0.45, -14, -10, -24); for (const [x, z] of [[8, -20], [20, -12], [-22, -8]]) prop(g, K.pagoda(1, 0x2a2a34, 0x14141a, 7, 0x3a3a44), 0.4, x, -4, z);
      glowLight(g, 0xd8e0ff, 0.6, 60, 12, 16, -30); },
    ambient: g => drift(g, { col: 0xd8f070, n: 30, speed: 0.1, size: 0.1, amp: 0.8 }) });
  set('ronin', { name: 'ROADSIDE TEAHOUSE', tag: 'Autumn on the old road, and a jug of sake',
    sky: [0xff9a5a, 0xffd8a8], fog: 0xf0c8a0, hemi: [0xffe0b0, 0x5a3a2a, 0.85], sun: [0xffb070, 1.0],
    floor: (x, z) => z < 3 || z > 44 ? speck(x, z, 0x6a8a3a, 0x8aa04a, 0.6) : speck(x, z, 0xa88a5a, 0x7a6a4a, 0.88),
    wall: (x, y, i) => i % 3 === 2 ? 0x6a7a3a : (y % 4 === 0 ? 0x7a8a40 : 0x9ab060),
    edge: 0x5a4a2a, dust: [0xa88a5a, 0xd8301a], out: 0x6a5a3a, outY: -2, post: 0x5a4a2a, plinth: 0x6a5a3a,
    scenery(g) { const umb = new VX.Grid(); umb.box(0, 0, 0, 0, 14, 0, 0x6a4424); for (let y = 0; y < 4; y++) umb.cyl('y', 0, 0, 9 - y * 2.2, 14 + y, 14 + y, 0xd8301a); prop(g, umb, 0.4, -13, -2, -11);
      const bench = new VX.Grid(); bench.box(-8, 3, -3, 8, 4, 3, 0xd8301a); for (const x of [-7, 7]) bench.box(x, 0, -2, x, 3, 2, 0x4a2a14); prop(g, bench, 0.4, -9, -2, -13);
      prop(g, K.pagoda(1, 0xe8dcc0, 0x5a4a3a, 9, 0x4a2a14), 0.45, 6, -2, -19);
      for (const [x, z] of [[17, -10], [-20, -4], [16, -18]]) prop(g, K.tree(0x4a3020, 0xd8401a, 10, 7, 0xf2a030), 0.42, x, -2, z); },
    ambient: g => drift(g, { col: 0xd8401a, n: 90, speed: 0.5, size: 0.15, amp: 1.2 }) });
  set('kunoichi', { name: 'WISTERIA GARDEN', tag: 'Raked gravel and purple blossom',
    sky: [0x6a5aa8, 0xd8c8f0], fog: 0xd8ccec, hemi: [0xf0e8ff, 0x5a4a6a, 0.85], sun: [0xfff0ff, 0.95],
    floor: (x, z) => { const s = [[18, 14], [44, 30], [30, 40]].some(([a, b]) => Math.hypot(x - a, z - b) < 3); return s ? 0x8a8478 : z % 3 === 0 ? 0xc8c4bc : 0xdedad2; },
    wall: (x, y, i) => y > 5 && hh(i, y, 3) > 0.55 ? 0xa07ad8 : (hh(i, y, 9) > 0.7 ? 0x2e5a2e : 0x3a6a3a),
    edge: 0x2a4a2a, dust: [0xdedad2, 0xa07ad8], out: 0x3a6a8a, outY: -1.5, post: 0x2a4a2a, plinth: 0x4a4440,
    scenery(g) { const tr = new VX.Grid(); for (const x of [-12, 12]) tr.box(x, 0, 0, x, 16, 0, 0x5a3a24); tr.box(-14, 16, -3, 14, 16, 3, 0x5a3a24); for (let x = -13; x <= 13; x += 2) for (let z = -2; z <= 2; z += 2) { const l = 3 + Math.floor(hh(x, 1, z) * 5); tr.box(x, 16 - l, z, x, 15, z, (xx, y) => y % 2 ? 0xa07ad8 : 0xc8a0f0); } prop(g, tr, 0.42, -2, -1.5, -15);
      const br = new VX.Grid(); for (let x = -10; x <= 10; x++) { const y = Math.round(5 - (x / 10) ** 2 * 5); br.box(x, y, -3, x, y, 3, 0xc8302a); br.box(x, y + 1, -3, x, y + 2, -3, x % 3 === 0 ? 0xc8302a : -1); br.box(x, y + 1, 3, x, y + 2, 3, x % 3 === 0 ? 0xc8302a : -1); } prop(g, br, 0.4, 14, -1.5, -11, 0.5);
      prop(g, K.stoneLantern(), 0.35, -15, -1.5, -8); },
    ambient: g => drift(g, { col: 0xb890f0, n: 110, speed: 0.4, size: 0.13, amp: 1 }) });
  set('shogun', { name: 'CASTLE KEEP', tag: 'The great hall, gold screens and the war fan',
    sky: [0x2a1a3a, 0xc87a5a], fog: 0x8a5a5a, hemi: [0xffd8c0, 0x3a2020, 0.8], sun: [0xffc8a0, 1.0],
    floor: (x, z) => x % 16 === 0 || z % 16 === 0 ? 0xc8a040 : planks(x, z, 0x3a2418, 0x42291b, 0x2a180e, 24),
    wall: (x, y, i) => i % 8 === 0 || y === 0 || y === 9 ? 0x1a1010 : (hh(i >> 1, y >> 1, 5) > 0.7 ? 0xf0e0a0 : 0xd8b048),
    edge: 0x1a1010, dust: [0x3a2418, 0xd8b048], out: 0x2a3a4a, outY: -6, post: 0x1a1010, plinth: 0x8a8478,
    scenery(g) { prop(g, K.pagoda(4, 0xf4f0e8, 0x2a2a34, 11, 0x1a1010), 0.42, 0, -6, -24);
      for (const [x, z] of [[-14, -10], [-17, -6], [14, -10], [17, -6]]) prop(g, K.banner(26, 0xf4f0e8, 0xc8201a), 0.35, x, -2, z);
      const yoroi = new VX.Grid(); yoroi.box(-3, 0, -2, 3, 9, 2, 0x1a1a24); yoroi.box(-5, 7, -2, 5, 10, 2, 0xc8201a); yoroi.ell(0, 13, 0, 3, 3, 3, 0x1a1a24); yoroi.box(-4, 15, 0, 4, 17, 0, 0xd8b048); prop(g, yoroi, 0.35, -11, -2, -14); },
    ambient: null });
  set('daimyo', { name: "LORD'S COURTYARD", tag: 'White gravel, black-tiled walls, a lord at home',
    sky: [0x6aa8e8, 0xe8f0f8], fog: 0xe0eaf2, hemi: [0xffffff, 0x8a8a7a, 0.95], sun: [0xfffaf0, 1.0],
    floor: (x, z) => Math.abs(x - 31.5) < 3 || Math.abs(z - 23.5) < 3 ? (hh(x, 2, z) > 0.5 ? 0x9a968a : 0x8e8a7e) : speck(x, z, 0xe8e6e0, 0xd4d2ca, 0.6),
    wall: (x, y, i) => ((i + y) % 4 === 0 || (i - y + 400) % 4 === 0) ? 0xf4f4f0 : 0x2a2a30,
    edge: 0x2a2a30, dust: [0xe8e6e0, 0x2a2a30], out: 0xc8c4b8, outY: -2, post: 0x2a2a30, plinth: 0x9a968a,
    scenery(g) { prop(g, K.pine(0x5a3a24, 0x2e5a2e, 0x3a6a3a), 0.5, -15, -2, -12); prop(g, K.pine(0x5a3a24, 0x2e5a2e, 0x3a6a3a), 0.4, 17, -2, -8);
      const kago = new VX.Grid(); kago.box(-4, 4, -3, 4, 10, 3, 0x1a1a1e); kago.box(-5, 11, -4, 5, 11, 4, 0xd8b048); kago.box(-14, 9, 0, 14, 9, 0, 0x5a3a24); prop(g, kago, 0.4, 8, -2, -15);
      const gold = new VX.Grid(); for (let k = 0; k < 40; k++) gold.ell(Math.floor(hh(k, 1, 1) * 10) - 5, Math.floor(hh(k, 2, 1) * 3), Math.floor(hh(k, 3, 1) * 8) - 4, 1.3, 0.5, 1, 0xd8b048); prop(g, gold, 0.3, -8, -2, -17);
      prop(g, K.pagoda(2, 0xf4f4f0, 0x2a2a30, 10, 0x2a2a30), 0.42, 0, -2, -24); },
    ambient: null });

  /* ================================================ KNIGHTS OF THE REALM */
  set('knight', { name: 'CASTLE COURTYARD', tag: 'Cobbles, battlements, and the banners flying',
    sky: [0x6a9ae8, 0xd8e8ff], fog: 0xd0dcec, hemi: [0xffffff, 0x5a5a4a, 0.9], sun: [0xfff4e0, 1.0],
    floor: (x, z) => { const r = z / 3 | 0, o = r % 2 ? 1 : 0; return z % 3 === 0 || (x + o * 2) % 4 === 0 ? 0x5a5650 : pick([0x8a8680, 0x7e7a74, 0x96928a], (x + o * 2) >> 2, 0, r); },
    wall: (x, y, i) => y >= 8 && (i >> 1) % 2 ? -1 : (y % 3 === 0 || (i + (y / 3 | 0) * 3) % 6 === 0 ? 0x7a766e : 0xa8a49a),
    edge: 0xb8b4aa, dust: [0x8a8680, 0xa8a49a], out: 0x3a5a6a, outY: -5, post: 0x7a766e, plinth: 0x8a867e,
    scenery(g) { prop(g, K.keep(9, 30, 0xa8a49a, 0x2a4ac8), 0.45, 0, -5, -22); prop(g, K.tower(5, 24, 0xa8a49a, 0x2a4ac8, 0xf4f0e6), 0.42, -18, -5, -12); prop(g, K.tower(5, 24, 0xa8a49a, 0x2a4ac8, 0xf4f0e6), 0.42, 18, -5, -12);
      for (const x of [-9, 9]) prop(g, K.banner(24, 0x2a4ac8, 0xf4f0e6), 0.35, x, -2, -10); },
    ambient: null });
  set('paladin', { name: 'CATHEDRAL', tag: 'Marble, gold, and light through stained glass',
    sky: [0x4a3a2a, 0xffe8b0], fog: 0xf0dcb0, hemi: [0xfff4d8, 0x4a3a2a, 0.9], sun: [0xfff0c0, 1.1],
    floor: (x, z) => checker(x, z, 8, 0xf2ece0, 0xc8b890),
    wall: (x, y, i) => (i % 12 >= 3 && i % 12 <= 8 && y >= 3 && y <= 8) ? G(pick([0xd8301a, 0x2a6ae0, 0xffd84a, 0x3aa85a], i, y, 2)) : (y % 3 === 0 ? 0xc8bea8 : 0xd8ceb8),
    edge: 0xd8b048, dust: [0xf2ece0, 0xffd84a], out: 0x3a3024, outY: -4, post: 0xd8b048, plinth: 0xc8bea8,
    scenery(g) { const rose = new VX.Grid(); rose.cyl('z', 0, 0, 12, 0, 1, (x, y) => { const r = Math.hypot(x, y), a = Math.atan2(y, x); return r > 11 ? 0x8a7a5a : r < 2 ? G(0xffd84a) : G([0xd8301a, 0x2a6ae0, 0xffd84a, 0x3aa85a][Math.floor((a + 3.2) * 4 / Math.PI) % 4]); }); prop(g, rose, 0.5, 0, 6, -24);
      for (const x of [-16, -10, 10, 16]) { const p = new VX.Grid(); p.cyl('y', 0, 0, 2.5, 0, 40, 0xd8ceb8); p.box(-3, 40, -3, 3, 42, 3, 0xc8bea8); prop(g, p, 0.4, x, -4, -16); }
      const altar = new VX.Grid(); altar.box(-8, 0, -3, 8, 6, 3, 0xf2ece0); altar.box(-9, 7, -4, 9, 7, 4, 0xd8b048); for (const x of [-6, -2, 2, 6]) { altar.box(x, 8, 0, x, 11, 0, 0xf4f0e8); altar.set(x, 12, 0, G(0xffd890)); } prop(g, altar, 0.4, 0, -4, -14); glowLight(g, 0xffe0a0, 1, 40, 0, 6, -12); },
    ambient: g => drift(g, { col: 0xffe27a, n: 70, rise: true, speed: 0.3, size: 0.09, amp: 0.4 }) });
  set('dragoon', { name: "DRAGON'S PEAK", tag: 'A crag above the lava, and the bones of a wyrm',
    sky: [0x3a0a0a, 0xe85a2a], fog: 0x8a3a2a, hemi: [0xffb090, 0x2a1010, 0.8], sun: [0xff9a6a, 1.05],
    floor: (x, z) => hh(x, 5, z) > 0.965 ? G(0xff6a20) : speck(x, z, 0x6a5a54, 0x5e504a, 0.5),
    wall: (x, y, i) => y > 6 + Math.floor(hh(i >> 1, 0, 3) * 4) ? -1 : (hh(i, y, 1) > 0.7 ? 0x3e302c : 0x4a3a36),
    noEdge: true, edge: 0x4a3a36, dust: [0x6a5a54, 0xff6a20], out: 0xff5a1a, outGlow: true, outY: -6, post: 0x3e302c, plinth: 0x3a2a26,
    scenery(g) { prop(g, K.skull(0xe8dcc0), 0.5, 4, -2, -20, 0.2); for (const [x, z, s] of [[-17, -12, 0.7], [18, -10, 0.6], [-10, -22, 0.9], [22, -20, 0.8]]) { const sp = new VX.Grid(); sp.cyl('y', 0, 0, 4, 0, 6, 0x4a3a36); sp.cyl('y', 0, 0, 2.5, 6, 18, 0x4a3a36); sp.cyl('y', 0, 0, 1, 18, 26, 0x3e302c); prop(g, sp, s, x, -6, z); }
      const nest = new VX.Grid(); nest.cyl('y', 0, 0, 7, 0, 2, 0x6a4424); for (const [x, z] of [[-2, 0], [2, 1], [0, -2]]) nest.ell(x, 4, z, 1.6, 2.2, 1.6, 0xd8c8a8); prop(g, nest, 0.4, -14, -2, -9); },
    ambient: g => drift(g, { col: 0xffa040, n: 110, rise: true, speed: 0.9, size: 0.1, amp: 0.8 }) });
  set('templar', { name: 'DESERT FORTRESS', tag: 'Sandstone walls under the white-and-red banners',
    sky: [0x4a8ae0, 0xfff0c8], fog: 0xf8e8c8, hemi: [0xfff8e8, 0x8a6a4a, 0.95], sun: [0xfff0d0, 1.15],
    floor: (x, z) => tiles(x, z, 8, 0xe0c890, 0xd8bf86, 0xb89a68),
    wall: (x, y, i) => { const s = i % 14; if (s >= 4 && s <= 8 && y >= 2 && y <= 8) return (s === 6 || y === 5) ? 0xc8201a : 0xf4f0e6; return y % 3 === 0 ? 0xc8ac74 : 0xd8bc84; },
    edge: 0xb8985e, dust: [0xe0c890, 0xe8d0a0], out: 0xe8d0a0, outY: -3, post: 0xb8985e, plinth: 0xc8ac74,
    scenery(g) { prop(g, K.keep(8, 26, 0xd8bc84, 0xf4f0e6), 0.45, 0, -3, -22); for (const [x, z] of [[-16, -12], [-19, -5], [16, -14], [20, -6]]) prop(g, K.palm(0x8a6a3a, 0x4a8a3a), 0.4, x, -3, z);
      for (const x of [-9, 9]) prop(g, K.tent(6, 8, 0xf4f0e6, 0xc8201a), 0.4, x, -3, -15); },
    ambient: g => drift(g, { col: 0xe8d0a0, n: 120, speed: 0.1, wind: 4, size: 0.08, amp: 0.3 }) });
  set('crusader', { name: 'SIEGE CAMP', tag: 'Mud, tents and the trebuchet',
    sky: [0x6a7a8a, 0xb8c0c8], fog: 0xa8b0b8, hemi: [0xe8eef4, 0x4a4a3a, 0.85], sun: [0xf0f0e8, 0.85],
    floor: (x, z) => (Math.abs(z - 14) < 1 || Math.abs(z - 33) < 1) ? 0x4a3a24 : pick([0x6a5a3a, 0x5a6a3a, 0x7a6a4a, 0x5e5a38], x >> 1, 4, z >> 1),
    wall: (x, y, i) => y >= 8 && i % 3 !== 1 ? -1 : (i % 3 === 0 ? 0x6a4c2a : 0x7a5a32),
    noEdge: true, edge: 0x7a5a32, dust: [0x6a5a3a, 0x4a3a24], out: 0x4a3a28, outY: -2, post: 0x5a3e22, plinth: 0x4a3a28,
    scenery(g) { const tb = new VX.Grid(); tb.box(-8, 0, -4, 8, 2, 4, 0x6a4424); for (const s of [-1, 1]) tb.line(s * 7, 2, 0, 0, 16, 0, 0x6a4424, 1); tb.line(-14, 22, 0, 10, 12, 0, 0x5a3a20, 0.8); tb.box(8, 8, -2, 12, 12, 2, 0x5a5a5a); prop(g, tb, 0.45, -14, -2, -16, 0.3);
      for (const [x, z] of [[4, -18], [12, -14], [18, -8]]) prop(g, K.tent(6, 9, 0xe8e0d0, 0xc8201a), 0.4, x, -2, z);
      const st = new VX.Grid(); st.box(-5, 0, -5, 5, 30, 5, (x, y, z) => y % 4 === 0 ? 0x5a3e22 : 0x7a5a32); prop(g, st, 0.42, -4, -2, -22); },
    ambient: g => drift(g, { col: 0x9a9a9a, n: 60, rise: true, speed: 0.35, size: 0.22, op: 0.5, amp: 0.6 }) });
  set('lancer', { name: 'THE LISTS', tag: 'The tournament field, pavilions and all',
    sky: [0x5aa0ff, 0xe8f4ff], fog: 0xe0ecf8, hemi: [0xffffff, 0x6a6a4a, 0.95], sun: [0xfff8e8, 1.1],
    floor: (x, z) => Math.abs(z - 23.5) < 0.6 ? 0xc8b07a : speck(x, z, z % 2 ? 0xe0cc98 : 0xdac690, 0xc8b484, 0.85),
    wall: (x, y, i) => y === 9 ? 0xd8b048 : ((i >> 1) % 2 ? 0xc8202a : 0xf4f0e6),
    edge: 0xd8b048, dust: [0xe0cc98, 0xc8202a], out: 0x5a9a4a, outY: -2, post: 0xd8b048, plinth: 0x8a6a3a,
    scenery(g) { const cols = [[0xc8202a, 0xf4f0e6], [0x2a4ac8, 0xf2c230], [0x3a8a3a, 0xf4f0e6], [0x6a2a8a, 0xf2c230]];
      [[-15, -12], [-6, -17], [6, -17], [15, -12]].forEach(([x, z], k) => prop(g, K.tent(7, 10, cols[k][0], cols[k][1]), 0.42, x, -2, z));
      prop(g, K.stands(20, 4, 0x8a6a3a, [0xc8202a, 0x2a4ac8, 0xf2c230, 0xf4f0e6, 0x3a8a3a]), 0.4, 0, -2, -22); for (const x of [-20, 20]) prop(g, K.banner(26, 0xc8202a, 0xf2c230), 0.35, x, -2, -6); },
    ambient: null });

  /* =================================================== LOVERS OF THE SEA */
  const deck = (x, z, a, b, seam) => { const r = z >> 2; return z % 4 === 0 ? seam : ((x + r * 11) % 18 === 0 ? seam : (hh(x, 6, z) > 0.985 ? 0x2a2a2a : r % 2 ? a : b)); };
  set('pirate', { name: 'PIRATE SHIP', tag: 'The main deck, the black flag over it',
    sky: [0x3a8ae8, 0xd8f0ff], fog: 0xc8e4f4, hemi: [0xffffff, 0x3a5a7a, 0.9], sun: [0xfff4e0, 1.05],
    floor: (x, z) => deck(x, z, 0xa87a48, 0x9e7244, 0x6a4424),
    wall: (x, y, i) => y >= 8 ? 0x8a5a30 : (i % 10 >= 4 && i % 10 <= 6 && y >= 3 && y <= 5 ? 0x1a1210 : (y % 3 === 0 ? 0x5a3a1e : 0x6a4424)),
    edge: 0x8a5a30, dust: [0xa87a48, 0xd8f0ff], out: 0x2a6a9a, outY: -3, post: 0x5a3a1e, plinth: 0x6a4424,
    scenery(g) { const jr = new VX.Grid(); jr.box(0, 0, 0, 8, 5, 0, (x, y) => (Math.abs(x - 4) <= 1 && y >= 2 && y <= 4) || (y === 1 && (x === 2 || x === 6)) ? 0xf4f0e6 : 0x1a1a1e);
      prop(g, K.mast(34, 0xf4ecd8), 0.45, 0, -1.2, -16); const fl = prop(g, jr, 0.45, 1, 14.6, -16);
      const chest = new VX.Grid(); chest.box(-5, 0, -3, 5, 5, 3, 0x6a4424); chest.box(-5, 6, -3, 5, 7, 3, 0x8a5a30); chest.box(-1, 3, 4, 1, 5, 4, 0xd8b048); for (let k = 0; k < 12; k++) chest.set(Math.floor(hh(k, 0, 2) * 8) - 4, 6, Math.floor(hh(k, 1, 2) * 4) - 2, 0xffd84a); prop(g, chest, 0.4, -14, -1.2, -11, 0.3);
      prop(g, K.cannon(0x2a2a30), 0.4, 15, -1.2, -10, Math.PI / 2); const isle = new VX.Grid(); isle.ell(0, 0, 0, 14, 4, 8, 0xe8d0a0); prop(g, isle, 1.2, -30, -4, -55); prop(g, K.palm(0x8a6a3a, 0x4a8a3a), 0.9, -30, -1, -55); },
    ambient: null });
  set('captain', { name: 'QUARTERDECK', tag: 'Her deck: brass, the wheel, the colours',
    sky: [0xf0a070, 0xffe0c0], fog: 0xf8d8c0, hemi: [0xfff0e0, 0x3a4a6a, 0.9], sun: [0xffd8b0, 1.0],
    floor: (x, z) => x % 16 === 0 ? 0xd8b048 : deck(x, z, 0xc89a62, 0xbe9058, 0x8a6a3a),
    wall: (x, y, i) => y >= 8 ? (i % 2 ? 0xe8e0d0 : -1) : y === 5 ? 0xd8a830 : 0x1f3a7a,
    edge: 0xe8e0d0, dust: [0xc89a62, 0xd8a830], out: 0x3a7aaa, outY: -3, post: 0x1f3a7a, plinth: 0x1f3a7a,
    scenery(g) { prop(g, K.wheel(0x8a5a30), 0.45, 0, 4, -14); const st = new VX.Grid(); st.box(-1, 0, -1, 1, 10, 1, 0x6a4424); prop(g, st, 0.45, 0, -1.2, -14.4);
      prop(g, K.flag(30, 0xf4f0e6, 0xc8201a, 12), 0.4, -15, -1.2, -12); const tbl = new VX.Grid(); tbl.box(-6, 6, -4, 6, 7, 4, 0x6a4424); tbl.box(-5, 8, -3, 5, 8, 3, 0xe8dcc0); for (const [x, z] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) tbl.box(x, 0, z, x, 5, z, 0x4a2a14); prop(g, tbl, 0.4, 14, -1.2, -12);
      prop(g, K.mast(34, 0xf4ecd8, 0x1f3a7a), 0.45, 12, -1.2, -22); },
    ambient: null });
  set('cannoneer', { name: 'GUN DECK', tag: 'Below decks, where the cannons live',
    sky: [0x2a2a2e, 0x6a6a68], fog: 0x5a5a58, hemi: [0xffe0c0, 0x2a2420, 0.8], sun: [0xffd0a0, 0.95],
    floor: (x, z) => hh(x, 7, z) > 0.94 ? 0x2a2420 : deck(x, z, 0x5a3c22, 0x523620, 0x3a2614),
    wall: (x, y, i) => i % 9 >= 3 && i % 9 <= 5 && y >= 2 && y <= 4 ? (y === 3 && i % 9 === 4 ? 0x0a0a0a : 0x2a2a30) : (y % 3 === 0 ? 0x3a2412 : 0x4a2e18),
    edge: 0x6a4424, dust: [0x5a3c22, 0x8a8a8a], out: 0x2a1a10, outY: -3, post: 0x3a2412, plinth: 0x3a2412,
    scenery(g) { for (const [x, z, r] of [[-14, -10, 0.5], [14, -10, -0.5], [-8, -16, 0.2], [8, -16, -0.2]]) prop(g, K.cannon(0x2a2a30), 0.45, x, -1.2, z, Math.PI / 2 + r);
      for (const [x, z] of [[-17, -4], [18, -4]]) { prop(g, K.barrel(0x5a3a1a, 0x3a3a3a), 0.4, x, -1.2, z); prop(g, K.barrel(0x5a3a1a, 0x3a3a3a), 0.4, x, 1.6, z); }
      const balls = new VX.Grid(); for (let l = 0; l < 3; l++) for (let x = -2 + l; x <= 2 - l; x++) for (let z = -2 + l; z <= 2 - l; z++) balls.ell(x * 3, l * 2.6, z * 3, 1.5, 1.5, 1.5, 0x1c1c22); prop(g, balls, 0.3, 0, -1.2, -18);
      for (const x of [-6, 6]) { prop(g, K.lantern(0xffb050), 0.4, x, 5, -8); glowLight(g, 0xffa040, 0.9, 18, x, 5, -7); } },
    ambient: g => drift(g, { col: 0x8a8a8a, n: 70, rise: true, speed: 0.25, size: 0.24, op: 0.4, amp: 0.5 }) });
  set('blackbeard', { name: 'STORM DECK', tag: 'Night, rain, and the black flag in the wind',
    sky: [0x0a0a14, 0x2a2a3a], fog: 0x1a1a24, hemi: [0x9aaac8, 0x1a1a22, 0.8], sun: [0xb8c8e8, 1.0],
    floor: (x, z) => hh(x, 8, z) > 0.9 ? 0x6a5a48 : deck(x, z, 0x4a3828, 0x423222, 0x2a1e14),
    wall: (x, y, i) => y === 8 ? 0x8a1a1a : 0x1c1a1e,
    edge: 0x3a3a40, dust: [0x3a2a1c, 0x8a9ab8], out: 0x101a24, outY: -3, post: 0x1c1a1e, plinth: 0x1c1a1e,
    scenery(g) { prop(g, K.mast(32, 0x2a2a2e), 0.45, 0, -1.2, -17); const sk = new VX.Grid(); sk.box(0, 0, 0, 9, 6, 0, (x, y) => (x >= 3 && x <= 5 && y >= 2 && y <= 5) || (y === 1 && (x === 2 || x === 6)) ? 0xf4f0e6 : 0x0e0e12); prop(g, sk, 0.5, 1, 14, -17);
      for (const [x, z] of [[-12, -9], [12, -9], [-6, -14]]) { prop(g, K.lantern(0xffb050), 0.4, x, 4, z); glowLight(g, 0xffa040, 0.7, 14, x, 4, z + 1); }
      const bm = new VX.Grid(); bm.box(0, 0, 0, 1, 14, 1, 0x3a2a1c); bm.line(0, 14, 0, 6, 20, 2, 0x3a2a1c, 0.8); prop(g, bm, 0.45, 15, -1.2, -14, 0.5); },
    ambient: g => drift(g, { col: 0xa8c0e8, n: 320, speed: 9, size: 0.06, op: 0.6, amp: 0.1, wind: -1 }) });
  set('redbeard', { name: 'CORSAIR HARBOUR', tag: 'Blue tiles, white domes, the galleys in',
    sky: [0x4a6ad8, 0xffd0a0], fog: 0xf0c8a8, hemi: [0xfff0e0, 0x6a4a3a, 0.9], sun: [0xffc890, 1.05],
    floor: (x, z) => { if (x % 8 === 0 || z % 8 === 0) return 0x2a5ab8; const a = x % 8 - 4, b = z % 8 - 4; return Math.abs(a) + Math.abs(b) < 3 ? (Math.abs(a) + Math.abs(b) < 1.5 ? 0x3ab8b0 : 0x2a5ab8) : 0xf4f0e6; },
    wall: (x, y, i) => { const s = i % 10; if (s >= 3 && s <= 6 && y <= 6 && !(y === 6 && (s === 3 || s === 6))) return -1; return y % 2 ? 0xd8c8a8 : 0xb87a4a; },
    edge: 0xd8a830, dust: [0xf4f0e6, 0x2a5ab8], out: 0x2a7a9a, outY: -3, post: 0xb87a4a, plinth: 0xd8c8a8,
    scenery(g) { const dome = new VX.Grid(); dome.box(-10, 0, -10, 10, 14, 10, 0xf4f0e6); dome.ell(0, 14, 0, 9, 9, 9, (x, y) => y < 14 ? -1 : 0xf4f0e6); dome.box(0, 23, 0, 0, 27, 0, 0xd8a830); prop(g, dome, 0.42, -2, -3, -22);
      prop(g, K.hull(16, 0x6a4424, 0xc8201a), 0.42, 16, -3.5, -14, 0.3); for (let k = 0; k < 6; k++) { const o = new VX.Grid(); o.line(0, 0, 0, 0, -6, 10, 0x8a5a30, 0.6); prop(g, o, 0.42, 10 + k * 2.2, -1, -10.5); }
      const fl = new VX.Grid(); fl.box(0, 0, 0, 0, 28, 0, 0x6a5a4a); fl.box(1, 21, 0, 12, 28, 0, (x, y) => Math.hypot(x - 6, y - 24.5) < 2.5 && Math.hypot(x - 7, y - 24.5) > 2 ? 0xf4f0e6 : 0xc8201a); prop(g, fl, 0.4, -16, -3, -12); },
    ambient: null });
  set('sailor', { name: 'HARBOUR PIER', tag: 'The pier, the crates, the lighthouse',
    sky: [0x8aa8c8, 0xe0e8f0], fog: 0xd0dae4, hemi: [0xf0f4f8, 0x4a5a6a, 0.85], sun: [0xf8f4ec, 0.9],
    floor: (x, z) => x % 5 === 0 ? 0x2a3a4a : plankZ(x, z, 0x9a7a54, 0x8e7050, 0x5a4430, 22),
    wall: (x, y, i) => y === 9 ? 0xc8a878 : ((i % 6 === 0 || y % 5 === 0) ? 0x7a5a30 : 0xa87a48),
    edge: 0xc8a878, dust: [0x9a7a54, 0xd0dae4], out: 0x3a5a7a, outY: -2.5, post: 0x5a4430, plinth: 0x5a4430,
    scenery(g) { const lh = new VX.Grid(); lh.cyl('y', 0, 0, 5, 0, 40, (x, y) => (y / 6 | 0) % 2 ? 0xc8201a : 0xf4f0e6); lh.cyl('y', 0, 0, 3, 41, 45, G(0xfff2a0)); lh.cyl('y', 0, 0, 4, 46, 47, 0x2a2a2e); prop(g, lh, 0.42, -15, -2.5, -22);
      prop(g, K.anchor(0x3a3a40), 0.4, 13, -2, -12, 0.3); for (const [x, z] of [[-14, -9], [-10, -11], [-14, -12]]) prop(g, K.crate(0xa87a48), 0.4, x, -2, z);
      for (const x of [-6, 0, 6]) { const b = new VX.Grid(); b.cyl('y', 0, 0, 1.5, 0, 4, 0x2a2a2e); b.cyl('y', 0, 0, 2, 4, 5, 0x2a2a2e); prop(g, b, 0.35, x, -2, -9); }
      prop(g, K.hull(10, 0x3a6a9a, 0xf4f0e6), 0.4, 14, -3.2, -20, 0.2); glowLight(g, 0xfff2a0, 0.8, 40, -15, 15, -21); },
    ambient: null });
  set('marauder', { name: 'RAIDED PORT', tag: 'Smoke, embers and the loot',
    sky: [0x2a0a0a, 0xc84a1a], fog: 0x6a2a1a, hemi: [0xffb080, 0x201010, 0.75], sun: [0xff9050, 1.0],
    floor: (x, z) => hh(x, 9, z) > 0.97 ? G(0xff6a20) : deck(x, z, 0x4a3020, 0x3a261a, 0x241810),
    wall: (x, y, i) => y > 6 + Math.floor(hh(i >> 1, 2, 5) * 4) ? -1 : (hh(i, y, 4) > 0.6 ? 0x3a2a1e : 0x5a3e26),
    noEdge: true, edge: 0x5a3e26, dust: [0x4a3020, 0xff6a20], out: 0x3a1a10, outY: -3, post: 0x3a2a1e, plinth: 0x2a1a10,
    scenery(g) { const h = K.hull(16, 0x3a2a1e, 0x241810); for (let k = 0; k < 60; k++) h.set(Math.floor(hh(k, 1, 6) * 30) - 15, 8 + Math.floor(hh(k, 2, 6) * 6), Math.floor(hh(k, 3, 6) * 10) - 5, G(hh(k, 4, 6) > 0.5 ? 0xff6a20 : 0xffd040)); prop(g, h, 0.45, 0, -3.5, -20, 0.15);
      const loot = new VX.Grid(); for (let k = 0; k < 50; k++) loot.ell(Math.floor(hh(k, 1, 3) * 12) - 6, Math.floor(hh(k, 2, 3) * 4), Math.floor(hh(k, 3, 3) * 8) - 4, 1.2, 0.6, 1, hh(k, 4, 3) > 0.8 ? 0xd8d8e0 : 0xd8b048); prop(g, loot, 0.35, -14, -1.2, -11);
      for (const x of [12, 16]) prop(g, K.crate(0x5a3e26), 0.4, x, -1.2, -10); glowLight(g, 0xff7030, 1.2, 40, 0, 4, -16); },
    ambient: g => drift(g, { col: 0xff8a30, n: 140, rise: true, speed: 1.0, size: 0.1, amp: 0.9 }) });
  set('musketeer', { name: 'FORT RAMPART', tag: 'The parade ground, the ensign, the guns',
    sky: [0x7ab0e8, 0xf0f4f8], fog: 0xe0e8ee, hemi: [0xffffff, 0x6a6a5a, 0.9], sun: [0xfff8ee, 1.05],
    floor: (x, z) => Math.abs(z - 23.5) < 2.5 ? tiles(x, z, 5, 0x9a968c, 0x8e8a80, 0x6a665e) : speck(x, z, 0xb8a47a, 0xa8946a, 0.75),
    wall: (x, y, i) => y >= 7 ? (y === 9 ? 0x5a7a3a : 0x6a8a4a) : (y >= 4 && i % 5 < 3 ? (y % 2 ? 0x8a6a3a : 0x7a5a32) : 0x9a968c),
    edge: 0x5a7a3a, dust: [0xb8a47a, 0x9a968c], out: 0x5a6a3a, outY: -4, post: 0x8a867c, plinth: 0x8a867c,
    scenery(g) { prop(g, K.flag(40, 0xf4f0e6, 0x2a4ac8, 12), 0.42, 0, -2, -18); prop(g, K.cannon(0x2a2a30), 0.45, -13, -2, -12, Math.PI / 2 + 0.3); prop(g, K.cannon(0x2a2a30), 0.45, 13, -2, -12, Math.PI / 2 - 0.3);
      for (const x of [-18, 18]) prop(g, K.tent(6, 9, 0xf4f0e6, 0xe8e0d0), 0.42, x, -2, -6);
      const stack = new VX.Grid(); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; stack.line(Math.cos(a) * 4, 0, Math.sin(a) * 4, 0, 16, 0, 0x5a3a20, 0.6); } prop(g, stack, 0.4, -7, -2, -15); },
    ambient: null });
  set('ghost', { name: "DAVY JONES' LOCKER", tag: 'The sea floor, where the drowned ships lie',
    sky: [0x02140e, 0x0a4a3a], fog: 0x0a3a2e, hemi: [0x6affb0, 0x021008, 0.65], sun: [0x8affd0, 0.8],
    floor: (x, z) => hh(x, 10, z) > 0.985 ? 0xd8d0b8 : (hh(x, 11, z) > 0.9 ? 0x2a4a30 : speck(x, z, 0x4a5a44, 0x44543e, 0.5)),
    wall: (x, y, i) => hh(i, y, 12) > 0.982 ? G(0x3ad88a) : (hh(i, y, 13) > 0.85 ? 0x6a7a68 : 0x2a3a30),
    noEdge: true, edge: 0x2a3a30, dust: [0x4a5a44, 0x6affb0], out: 0x010806, outY: -14, post: 0x2a3a30, plinth: 0x14201a,
    scenery(g) { const w = prop(g, K.hull(18, 0x2a3a30, 0x1a2a20), 0.48, 2, -3, -20, 0.3); w.rotation.z = 0.35; prop(g, K.mast(26, 0x3a5a4a), 0.4, -6, -1.6, -18).rotation.z = -0.5;
      for (const [x, y, z] of [[-14, 5, -10], [15, 7, -12], [-5, 9, -20], [20, 4, -4]]) { const j = new VX.Grid(); j.ell(0, 0, 0, 3, 2, 3, G(0x8affd0)); for (let k = 0; k < 6; k++) j.box(k - 3, -6, 0, k - 3, -3, 0, G(0x3ad88a)); prop(g, j, 0.3, x, y, z); }
      const ch = new VX.Grid(); ch.box(-5, 0, -3, 5, 6, 3, 0x3a2a1a); ch.box(-4, 7, -2, 4, 7, 2, G(0x6affb0)); prop(g, ch, 0.4, 14, -1.2, -10, -0.3); glowLight(g, 0x6affb0, 1, 30, 0, 4, -8); },
    ambient: g => drift(g, { col: 0xc8fff0, n: 120, rise: true, speed: 0.8, size: 0.1, amp: 0.4 }) });

  /* ======================================================= MODERN SPORTS */
  const ropes = (y, a, b, c, apron) => y === 9 ? a : y === 6 ? b : y === 3 ? c : y === 0 ? apron : -1;
  set('wrestler', { name: 'LUCHA ARENA', tag: 'The ring, the lights, the crowd on its feet',
    sky: [0x1a0a2a, 0x5a1a5a], fog: 0x2a1030, hemi: [0xffc8ff, 0x1a0a20, 0.75], sun: [0xffffff, 1.1],
    floor: (x, z) => { const d = dist(x, z); return Math.abs(d - 8) < 1 ? 0xff3a9a : (d < 3 ? 0xf2c230 : (x < 2 || x > 61 || z < 2 || z > 45 ? 0x1a3a9a : 0x2a6ae0)); },
    wall: (x, y) => ropes(y, 0xff3a9a, 0xffd23a, 0x3ad86a, 0x1a1a2a),
    noEdge: true, edge: 0xff3a9a, post: 0xff3a9a, dust: [0x2a6ae0, 0xff3a9a], out: 0x1a1a24, outY: -2, plinth: 0x1a1a2a,
    scenery(g) { prop(g, K.stands(26, 6, 0x2a2a34, [0xff3a9a, 0xffd23a, 0x3ad86a, 0x7a3ad8, 0xffffff]), 0.45, 0, -2, -16); for (const x of [-22, 22]) prop(g, K.stands(10, 6, 0x2a2a34, [0xff3a9a, 0xffd23a, 0x3ad86a, 0xffffff]), 0.45, x, -2, -2, x > 0 ? -Math.PI / 2 : Math.PI / 2);
      prop(g, K.screen(16, 9, 0xff3a9a), 0.45, 0, 8, -24); for (const x of [-14, 14]) prop(g, K.lights(28, 0xffffff), 0.4, x, -2, -14); },
    ambient: g => flashes(g, 18, [20, 5, -24, -12]) });
  set('baseball', { name: 'BALLPARK', tag: 'The diamond under the lights',
    sky: [0x0a1430, 0x3a5a9a], fog: 0x2a3a5a, hemi: [0xe8f0ff, 0x2a3a2a, 0.85], sun: [0xffffff, 1.15],
    floor: (x, z) => { const m = Math.abs(x - 31.5) + Math.abs(z - 23.5); if (Math.abs(m - 20) < 0.7) return 0xf4f4f0; if (m < 20) return (m < 7 && m > 5 ? 0x3a8a3a : speck(x, z, 0xb8845a, 0xa8764e, 0.8)); return (x >> 2) % 2 ? 0x3a8a3a : 0x348034; },
    wall: (x, y, i) => y === 9 ? 0xf2c230 : (i % 16 >= 2 && i % 16 <= 12 && y >= 3 && y <= 6 ? pick([0xc8201a, 0x2a4ac8, 0xf4f4f0, 0xf2c230], i >> 4, 0, 1) : 0x2a6a3a),
    edge: 0xf2c230, dust: [0xb8845a, 0x3a8a3a], out: 0x2a6a2a, outY: -2, post: 0x2a6a3a, plinth: 0x2a4a2a,
    scenery(g) { prop(g, K.screen(18, 8, 0xf2c230), 0.45, 0, 6, -24); for (const x of [-18, 18]) { prop(g, K.lights(34, 0xffffff), 0.42, x, -2, -16); glowLight(g, 0xffffff, 0.5, 40, x, 13, -15); }
      const ball = new VX.Grid(); ball.ell(0, 0, 0, 7, 7, 7, (x, y, z) => Math.abs(y - 3 * Math.cos(Math.atan2(z, x) * 2)) < 0.8 ? 0xd8323a : 0xf6f4ee); prop(g, ball, 0.4, -14, 1, -12);
      prop(g, K.stands(24, 5, 0x2a3a5a, [0xc8201a, 0x2a4ac8, 0xf4f4f0, 0xf2c230]), 0.42, 0, -2, -18); },
    ambient: null });
  set('football', { name: 'GRIDIRON', tag: 'Friday night under the lights',
    sky: [0x0a1020, 0x2a3a5a], fog: 0x1a2a40, hemi: [0xffffff, 0x1a3a1a, 0.85], sun: [0xffffff, 1.15],
    floor: (x, z) => x < 6 ? 0x1a3a8a : x > 57 ? 0xc8201a : (x % 6 === 0 || ((z === 16 || z === 31) && x % 2 === 0) ? 0xf0f0f0 : ((x / 6 | 0) % 2 ? 0x3a8a3a : 0x2e7e2e)),
    wall: (x, y) => y >= 8 ? 0xf0f0f0 : y === 5 ? 0xf0f0f0 : 0x1a3a8a,
    edge: 0xf0f0f0, dust: [0x3a8a3a, 0xf0f0f0], out: 0x8a4a3a, outY: -2, post: 0x1a3a8a, plinth: 0x2a2a2e,
    scenery(g) { for (const x of [-20, 20]) prop(g, K.posts(26, 0xf2c230), 0.42, x, -2, -10, Math.PI / 2); for (const x of [-14, 14]) prop(g, K.lights(34, 0xffffff), 0.42, x, -2, -18);
      prop(g, K.stands(26, 6, 0x2a2a34, [0x1a3a8a, 0xc8201a, 0xf0f0f0, 0xf2c230]), 0.45, 0, -2, -18); prop(g, K.screen(12, 7, 0xf2c230), 0.42, 0, 9, -24); },
    ambient: null });
  set('soccer', { name: 'THE PITCH', tag: 'Matchday: the stripes, the centre circle',
    sky: [0x5aa0e8, 0xe8f4ff], fog: 0xd8e8f4, hemi: [0xffffff, 0x3a5a3a, 0.95], sun: [0xfffaf0, 1.1],
    floor: (x, z) => { const d = dist(x, z); return x === 31 || x === 32 || Math.abs(d - 9) < 0.6 || d < 1 ? 0xf4f4f0 : ((x >> 3) % 2 ? 0x4aa04a : 0x3e943e); },
    wall: (x, y, i) => y >= 7 ? -1 : (y === 0 ? 0x1a1a1e : [0x2a4ac8, 0xc8201a, 0xf2c230, 0xf4f4f0, 0x1a1a1e][(i / 20 | 0) % 5]),
    noEdge: true, edge: 0xf4f4f0, dust: [0x4aa04a, 0xf4f4f0], out: 0x3a7a3a, outY: -2, post: 0xf4f4f0, plinth: 0x2a5a2a,
    scenery(g) { prop(g, K.goal(12, 9, 0xf4f4f0), 0.45, -19, -2, -2, Math.PI / 2); prop(g, K.goal(12, 9, 0xf4f4f0), 0.45, 19, -2, -2, -Math.PI / 2);
      prop(g, K.stands(28, 7, 0x3a3a44, [0x2a4ac8, 0xf4f4f0, 0xc8201a, 0xf2c230]), 0.45, 0, -2, -16); for (const [x, z] of [[-17, -12], [17, -12]]) prop(g, K.flag(12, 0xf2c230, 0xc8201a, 4), 0.35, x, -2, z); },
    ambient: null });
  set('boxer', { name: 'TITLE FIGHT', tag: 'Twelve rounds for the belt',
    sky: [0x0a0a0a, 0x2a2a2a], fog: 0x1a1a1a, hemi: [0xfff4e0, 0x101010, 0.7], sun: [0xfff0d8, 1.2],
    floor: (x, z) => { const d = dist(x, z); if (d < 5) return d < 3 ? 0xd8b048 : 0xc8a040; if (x < 8 && z < 8) return 0xc8202a; if (x > 55 && z > 39) return 0x2a4ac8; return speck(x, z, 0xd8d4cc, 0xccc8c0, 0.7); },
    wall: (x, y) => ropes(y, 0xc8202a, 0xf4f4f0, 0x2a4ac8, 0x1a1a1a),
    noEdge: true, edge: 0xc8202a, post: 0xd8b048, dust: [0xd8d4cc, 0xc8202a], out: 0x0a0a0a, outY: -2, plinth: 0x1a1a1a,
    scenery(g) { prop(g, K.belt(), 0.42, 0, 8, -20); const bag = new VX.Grid(); bag.box(0, 18, 0, 0, 26, 0, 0x6a6a6a); bag.cyl('y', 0, 0, 3, 0, 17, 0xc8202a); prop(g, bag, 0.4, -15, -1, -12);
      prop(g, K.stands(26, 6, 0x1a1a1e, [0x3a3a40, 0x4a4a52, 0x2a2a30, 0xd8d4cc]), 0.45, 0, -2, -16); for (const x of [-12, 12]) { prop(g, K.lights(30, 0xfff0d8), 0.4, x, -2, -14); } },
    ambient: g => flashes(g, 14, [20, 5, -24, -12]) });
  set('fencer', { name: "SALLE D'ARMES", tag: 'The piste in the old fencing hall',
    sky: [0x3a2a1a, 0xa88a5a], fog: 0x6a5434, hemi: [0xffe8c8, 0x3a2a1a, 0.85], sun: [0xfff0d8, 1.0],
    floor: (x, z) => z >= 20 && z <= 27 ? (z === 20 || z === 27 || x === 26 || x === 37 ? 0xf4f4f0 : 0xa8acb4) : (((x + z) >> 1) % 2 ? 0x9a6a3a : 0x8a5a32),
    wall: (x, y, i) => y === 4 || y === 9 ? 0xd8b048 : (i % 10 >= 2 && i % 10 <= 7 && y >= 5 && y <= 8 ? 0xc8d0d8 : 0x5a3a1e),
    edge: 0xd8b048, dust: [0x9a6a3a, 0xd8b048], out: 0x2a1a10, outY: -2, post: 0x5a3a1e, plinth: 0x3a2412,
    scenery(g) { const ch = new VX.Grid(); ch.box(0, 6, 0, 0, 14, 0, 0xd8b048); ch.cyl('y', 0, 0, 6, 4, 5, 0xd8b048); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ch.set(Math.round(Math.cos(a) * 6), 6, Math.round(Math.sin(a) * 6), G(0xffe0a0)); } prop(g, ch, 0.4, 0, 6, -12); glowLight(g, 0xffe0a0, 1, 30, 0, 8, -12);
      const sab = new VX.Grid(); sab.ell(0, 0, 0, 5, 5, 1, 0x6a3a1a); sab.line(-7, -7, 1, 7, 7, 1, 0xd8dde6, 0.6); sab.line(-7, 7, 1, 7, -7, 1, 0xd8dde6, 0.6); prop(g, sab, 0.4, -12, 5, -14);
      const lights = new VX.Grid(); lights.box(-6, 0, 0, 6, 4, 1, 0x1a1a1e); lights.box(-5, 1, -1, -1, 3, -1, G(0xff3a3a)); lights.box(1, 1, -1, 5, 3, -1, G(0x3aff6a)); prop(g, lights, 0.4, 12, 5, -14); },
    ambient: g => drift(g, { col: 0xffe8c0, n: 50, speed: 0.12, size: 0.07, amp: 0.3 }) });
  set('weightlifter', { name: 'IRON GYM', tag: 'Chalk, iron and the platform',
    sky: [0x1a1a1e, 0x4a4a52], fog: 0x34343a, hemi: [0xe8f0ff, 0x202024, 0.8], sun: [0xf0f4ff, 1.0],
    floor: (x, z) => x >= 24 && x <= 39 && z >= 16 && z <= 31 ? (x === 24 || x === 39 ? 0x1a1a1e : plankZ(x, z, 0xb8905a, 0xae8854, 0x8a6a3a, 16)) : speck(x, z, tiles(x, z, 8, 0x2a2a2e, 0x26262a, 0x1a1a1e), 0xb8b8b8, 0.988),
    wall: (x, y, i) => (y % 3 === 0 || (i + (y / 3 | 0) * 3) % 6 === 0) ? 0x5a4a44 : 0x8a3a2a,
    edge: 0x3a3a40, dust: [0x2a2a2e, 0xd8d8d8], out: 0x4a4a4e, outY: -2, post: 0x3a3a40, plinth: 0x3a3a40,
    scenery(g) { for (const [x, z, r] of [[-14, -10, 0.3], [14, -12, -0.3]]) prop(g, K.dumbbell(0x1a1a1e), 0.45, x, 0, z, r);
      const rack = new VX.Grid(); for (const x of [-10, 10]) for (const z of [-4, 4]) rack.box(x, 0, z, x, 26, z, 0xa8acb4); rack.box(-10, 26, -4, 10, 26, 4, 0xa8acb4); rack.cyl('x', 18, 0, 0.8, -14, 14, 0xc8ccd4); for (const x of [-13, 13]) rack.cyl('x', 18, 0, 5, x, x + (x < 0 ? 1 : -1), 0x1a1a1e); prop(g, rack, 0.42, 0, -2, -18);
      const plates = new VX.Grid(); for (let k = 0; k < 6; k++) plates.cyl('y', 0, 0, 6 - k * 0.6, k, k, k % 2 ? 0xc8201a : 0x1a1a1e); prop(g, plates, 0.4, -16, -2, -16); },
    ambient: g => drift(g, { col: 0xf4f4f0, n: 60, speed: 0.1, size: 0.09, op: 0.5, amp: 0.3 }) });
  set('bowler', { name: 'BOWLING ALLEY', tag: 'Lane twelve, glow-in-the-dark night',
    sky: [0x0a0a2a, 0x3a1a5a], fog: 0x1a1030, hemi: [0xffd8ff, 0x101020, 0.75], sun: [0xfff0ff, 1.0],
    floor: (x, z) => z < 3 || z > 44 ? 0x3a3a44 : ((x >= 40 && x <= 44 && Math.abs(z - 23.5) % 6 < 1 && (x - 40) >= Math.abs((z % 6) - 3)) ? 0x5a2a1a : (z % 2 ? 0xd8b07a : 0xcfa670)),
    wall: (x, y, i) => y < 4 ? 0x2a2a3a : ((i >> 2) % 2 ? G(0xff3ad8) : G(0x3ad8ff)),
    edge: 0x2a2a3a, dust: [0xd8b07a, 0xff3ad8], out: 0x1a1a24, outY: -2, post: 0x2a2a3a, plinth: 0x1a1a24,
    scenery(g) { prop(g, K.pins(), 0.5, 0, -1.2, -16); const sign = new VX.Grid(); for (let x = -14; x <= 14; x++) for (let y = 0; y <= 4; y++) if ((x + 14) % 6 < 4 && (y === 0 || y === 4 || (x + 14) % 6 === 0 || (x + 14) % 6 === 3)) sign.set(x, y, 0, G(0xff3ad8)); prop(g, sign, 0.45, 0, 7, -22);
      const ret = new VX.Grid(); ret.box(-4, 0, -3, 4, 6, 3, 0x3a3a44); for (const x of [-2, 2]) ret.ell(x, 8, 0, 2, 2, 2, x < 0 ? 0x2a1a4a : 0xd8301a); prop(g, ret, 0.4, -14, -1.2, -10);
      for (const x of [-12, 12]) prop(g, K.screen(6, 4, 0x3ad8ff), 0.4, x, 6, -18); },
    ambient: null });
  set('archer', { name: 'ARCHERY RANGE', tag: 'Summer on the range, the targets in a row',
    sky: [0x6ab0f0, 0xf0f8ff], fog: 0xe0eef8, hemi: [0xffffff, 0x5a6a3a, 0.95], sun: [0xfff8e0, 1.1],
    floor: (x, z) => x === 6 || x === 57 ? 0xf4f4f0 : (z % 8 === 0 && x % 4 < 2 ? 0xf4f4f0 : ((z >> 3) % 2 ? 0x6ab04a : 0x5ea444)),
    wall: (x, y, i) => y % 4 === 0 ? 0xb89a50 : (hh(i, y, 2) > 0.7 ? 0xd8b860 : 0xe8c870),
    edge: 0xc8a850, dust: [0x6ab04a, 0xe8c870], out: 0x5a9a3a, outY: -2, post: 0xb89a50, plinth: 0x6a8a3a,
    scenery(g) { for (const [x, z] of [[-12, -16], [0, -18], [12, -16]]) prop(g, K.target(9), 0.42, x, 2.5, z);
      for (const [x, z] of [[-19, -8], [19, -10], [-16, -22], [17, -22]]) prop(g, K.tree(0x5a3a24, 0x3a8a3a, 12, 8, 0x4a9a44), 0.42, x, -2, z);
      const q = new VX.Grid(); q.cyl('y', 0, 0, 2, 0, 9, 0x8a5a2a); for (const [x, z] of [[-1, 0], [1, 1], [0, -1]]) { q.box(x, 10, z, x, 14, z, 0xd8c08a); q.set(x, 15, z, 0xd8301a); } prop(g, q, 0.4, -14, -2, -9); },
    ambient: null });
  set('skater', { name: 'SKATE PARK', tag: 'Concrete, coping and graffiti at sundown',
    sky: [0xff7a5a, 0xffc8a0], fog: 0xf0b8a0, hemi: [0xfff0e8, 0x5a4a4a, 0.9], sun: [0xffc8a0, 1.05],
    floor: (x, z) => x % 16 === 0 || z % 16 === 0 ? 0x7a7874 : (hh(x >> 2, 4, z >> 2) > 0.9 ? pick([0xff3ad8, 0x3ad8ff, 0xf2c230], x >> 2, 0, z >> 2) : speck(x, z, 0xa8a6a2, 0x9e9c98, 0.6)),
    wall: (x, y, i) => y === 9 ? 0xc8ccd4 : (hh(i >> 2, y >> 2, 8) > 0.6 ? pick([0xff3ad8, 0x3ad8ff, 0xf2c230, 0x3ad86a], i >> 2, y >> 2, 3) : 0x8a8884),
    edge: 0xc8ccd4, dust: [0xa8a6a2, 0xff3ad8], out: 0x3a3a3e, outY: -2, post: 0x8a8884, plinth: 0x6a6864,
    scenery(g) { prop(g, K.halfpipe(0x9e9c98, 0xc8ccd4), 0.45, 0, -2, -18); const rail = new VX.Grid(); rail.box(-12, 4, 0, 12, 4, 0, 0xc8ccd4); for (const x of [-10, 10]) rail.box(x, 0, 0, x, 3, 0, 0x6a6e74); prop(g, rail, 0.4, -14, -2, -9, 0.4);
      prop(g, K.city(6, 0x3a3440, 0xffd890), 0.45, 0, -2, -34); },
    ambient: null });
  set('basketball', { name: 'STREET COURT', tag: 'Blacktop, chain-link and the city lights',
    sky: [0x1a2a4a, 0xff9a6a], fog: 0x6a5a6a, hemi: [0xfff0e8, 0x2a2a34, 0.85], sun: [0xffd8b0, 1.0],
    floor: (x, z) => { const d = dist(x, z); if (x === 31 || x === 32 || Math.abs(d - 7) < 0.6) return 0xf4f4f0; if ((x < 14 || x > 49) && Math.abs(z - 23.5) < 6) return (x === 13 || x === 50 || Math.abs(Math.abs(z - 23.5) - 6) < 0.6) ? 0xf4f4f0 : 0xe8681a; return speck(x, z, 0x4a6a8a, 0x42627e, 0.6); },
    wall: (x, y, i) => i % 8 === 0 ? 0x6a6e74 : ((i + y) % 2 ? 0x9aa0a8 : -1),
    noEdge: true, edge: 0x9aa0a8, dust: [0x4a6a8a, 0xe8681a], out: 0x2a2a2e, outY: -2, post: 0x6a6e74, plinth: 0x2a2a2e,
    scenery(g) { prop(g, K.hoop(), 0.42, -17, -2, -2, Math.PI / 2); prop(g, K.hoop(), 0.42, 17, -2, -2, -Math.PI / 2); prop(g, K.city(8, 0x2a2a38, 0xffd890), 0.5, 0, -2, -30);
      const lamp = new VX.Grid(); lamp.box(0, 0, 0, 0, 30, 0, 0x3a3a40); lamp.box(0, 30, 0, 5, 30, 0, 0x3a3a40); lamp.box(4, 28, -1, 6, 29, 1, G(0xffd890)); prop(g, lamp, 0.4, 14, -2, -12); glowLight(g, 0xffd890, 0.8, 24, 16, 10, -12); },
    ambient: null });

  /* ===================================================== ELEMENT BENDERS */
  const deadTree = (c, h) => { const g = new VX.Grid(); g.cyl('y', 0, 0, 1.2, 0, h, c); g.line(0, h * 0.6, 0, -6, h + 4, 2, c, 0.8); g.line(0, h * 0.8, 0, 5, h + 6, -2, c, 0.8); g.line(0, h, 0, 1, h + 8, 1, c, 0.7); return g; };
  const cloud = () => { const g = new VX.Grid(); g.ell(0, 0, 0, 10, 3, 6, 0xffffff); g.ell(6, 2, 0, 6, 3, 5, 0xffffff); g.ell(-7, 1, 1, 6, 2.5, 5, 0xf0f6ff); return g; };
  const spike = (c, tip, h) => { const g = new VX.Grid(); for (let y = 0; y < h; y++) g.cyl('y', 0, 0, Math.max(0.5, 3 - y * 3 / h), y, y, y > h - 4 ? tip : c); return g; };
  set('air', { name: 'SKY TEMPLE', tag: 'Pale stone above the clouds, banners in the wind',
    sky: [0x6ab8f0, 0xd8f0ff], fog: 0xc8e4f8, hemi: [0xffffff, 0x8ab0d0, 1.0], sun: [0xfff4e0, 1.1],
    floor: (x, z) => Math.abs(dist(x, z) - 10) < 0.7 ? 0xf0c860 : tiles(x, z, 8, 0xe8e4dc, 0xdcd8d0, 0xb8b4ac),
    wall: (x, y, i) => y === 9 ? 0xf0c860 : (i % 8 === 0 ? 0xc8c4bc : 0xe8e4dc),
    edge: 0xf0c860, dust: [0xe8e4dc, 0xffffff], out: 0xe8f4ff, outY: -20, post: 0xc8c4bc, plinth: 0xb8b4ac,
    scenery(g) { for (const x of [-16, 16]) prop(g, K.tower(5, 22, 0xe8e4dc, 0x5a9ad8, 0xf0c860), 0.45, x, -2, -18);
      for (const [x, z] of [[-8, -20], [8, -20]]) prop(g, K.banner(18, 0xf0c860, 0x5a9ad8), 0.4, x, -2, z);
      for (const [x, y, z] of [[-20, -6, -6], [21, -7, -10], [-6, -8, -30], [12, -5, -34], [0, -10, 16], [-22, -9, 12]]) prop(g, cloud(), 0.5, x, y, z); },
    ambient: g => drift(g, { col: 0xffffff, n: 70, speed: 0.2, size: 0.12, wind: 3, amp: 0.2 }) });
  set('water', { name: 'FROZEN SHORE', tag: 'Sea ice at the edge of the world, under snow',
    sky: [0x2a4a7a, 0xa8d0f0], fog: 0xb8d8f0, hemi: [0xe8f4ff, 0x4a6a8a, 0.95], sun: [0xe8f0ff, 0.95],
    floor: (x, z) => hh(x >> 1, 5, z >> 1) > 0.93 ? 0x9ac8e8 : speck(x, z, 0xd8ecf8, 0xffffff, 0.86),
    wall: (x, y, i) => ((y + (i >> 2)) % 3 === 0 ? 0xb8dcf0 : 0xd8ecf8),
    edge: 0xffffff, dust: [0xd8ecf8, 0xffffff], out: 0x1a4a7a, outY: -2, post: 0x9ac8e8, plinth: 0x6a9ac8,
    scenery(g) { for (const [x, z, h] of [[-15, -10, 16], [-18, -16, 22], [16, -12, 18], [19, -18, 14], [-6, -22, 12], [7, -24, 20]]) prop(g, spike(0xb8dcf0, 0xffffff, h), 0.45, x, -2, z);
      const ig = new VX.Grid(); ig.ell(0, 0, 0, 9, 7, 9, (x, y, z) => y < 0 ? -1 : ((y + (x >> 2)) % 3 === 0 ? 0xc8dcf0 : 0xf0f8ff)); ig.box(-2, 0, 8, 2, 4, 9, 0x6a8ab0); prop(g, ig, 0.4, 13, -2, -22, -0.4); },
    ambient: g => drift(g, { col: 0xffffff, n: 160, speed: 0.6, size: 0.12 }) });
  set('earth', { name: 'CANYON RING', tag: 'A ring of stone slabs in a red canyon',
    sky: [0xd8904a, 0xf8d8a0], fog: 0xe8c090, hemi: [0xfff0d8, 0x6a4a2a, 0.95], sun: [0xffe0b0, 1.1],
    floor: (x, z) => hh(x, 4, z) > 0.94 ? 0x6a4a2a : tiles(x, z, 6, 0x9a7a5a, 0x8e6e50, 0x6a4a2a),
    wall: (x, y, i) => hh(i, y, 3) > 0.8 ? 0x6a4a2a : (y > 7 ? 0xa88a62 : 0x8a6a4a),
    edge: 0x6a4a2a, dust: [0x9a7a5a, 0xb89a6a], out: 0x5a3a20, outY: -2, post: 0x6a4a2a, plinth: 0x5a3a1a,
    scenery(g) { for (const [x, z, r] of [[-20, -26, 10], [0, -36, 12], [22, -28, 11], [-26, -8, 8], [26, -6, 7]]) prop(g, K.rock(0xa86a3a, r), 0.5, x, -2, z);
      for (const [x, z] of [[-12, -12], [12, -12]]) { const c = new VX.Grid(); c.box(-3, 0, -3, 3, 20, 3, (xx, y, zz) => y % 5 === 0 ? 0x6a4a2a : 0x9a7a5a); prop(g, c, 0.42, x, -2, z); } },
    ambient: null });
  set('flame', { name: 'EMBER PALACE', tag: 'Red lacquer, gold trim and braziers burning',
    sky: [0x3a0a0a, 0xd8501a], fog: 0x6a1a10, hemi: [0xffd0a0, 0x2a0a08, 0.85], sun: [0xffa060, 1.0],
    floor: (x, z) => dist(x, z) < 4 ? (dist(x, z) < 2.6 ? 0xd8a040 : 0x1a1414) : tiles(x, z, 8, 0x8a1a12, 0x7a1410, 0xd8a040),
    wall: (x, y, i) => y === 9 ? 0xd8a040 : (i % 6 === 0 ? 0x1a1414 : 0x8a1a12),
    edge: 0xd8a040, dust: [0x8a1a12, 0xffa040], out: 0x1a0808, outY: -2, post: 0x1a1414, plinth: 0x2a0a08,
    scenery(g) { prop(g, K.pagoda(2, 0x8a1a12, 0x1a1414, 7, 0xd8a040), 0.5, 0, -2, -26);
      for (const [x, z] of [[-14, -10], [14, -10], [-18, -20], [18, -20]]) { const b = new VX.Grid(); b.box(-1, 0, -1, 1, 6, 1, 0x1a1414); b.ell(0, 8, 0, 3, 1.5, 3, 0xd8a040); b.ell(0, 10, 0, 2, 2, 2, G(0xff7a2a)); b.set(0, 12, 0, G(0xffd040)); prop(g, b, 0.4, x, -2, z); }
      glowLight(g, 0xff7a2a, 1.2, 30, 0, 6, -12); },
    ambient: g => drift(g, { col: 0xff7a2a, n: 120, rise: true, speed: 0.8, size: 0.1 }) });
  set('blood', { name: 'MOONLIT HOLLOW', tag: 'Dead trees under a blood-red moon',
    sky: [0x0a0410, 0x3a0a1a], fog: 0x1a0810, hemi: [0xd8c0d0, 0x0a0408, 0.6], sun: [0xffe0e0, 0.7],
    floor: (x, z) => hh(x, 6, z) > 0.975 ? 0x8a0a1a : speck(x, z, 0x2a1418, 0x3a1a20, 0.7),
    wall: (x, y, i) => i % 4 === 0 ? 0x2a1a14 : (y === 4 || y === 8 ? 0x3a2a1a : -1),
    edge: 0x2a1a14, dust: [0x2a1418, 0x8a0a1a], out: 0x05020a, outY: -2, post: 0x2a1a14, plinth: 0x14080c,
    scenery(g) { prop(g, K.disc(7, G(0xffd0d0)), 0.6, 10, 16, -34); prop(g, K.disc(6, G(0xff8a9a)), 0.6, 10.3, 16.2, -33.8);
      for (const [x, z, h] of [[-16, -10, 14], [17, -12, 16], [-10, -22, 18], [12, -24, 13], [-22, -18, 12]]) prop(g, deadTree(0x2a1a14, h), 0.45, x, -2, z);
      glowLight(g, 0xff2a4a, 0.6, 30, 0, 8, -10); },
    ambient: g => drift(g, { col: 0xff2a4a, n: 60, rise: true, speed: 0.3, size: 0.08 }) });
  set('lava', { name: 'MAGMA CALDERA', tag: 'Black basalt over a sea of lava',
    sky: [0x1a0a08, 0xff5a1a], fog: 0x4a1a0a, hemi: [0xffb080, 0x1a0806, 0.8], sun: [0xff9a5a, 1.0],
    floor: (x, z) => hh(x, 7, z) > 0.95 || (x * 3 + z * 5) % 29 === 0 ? 0xff6a1a : speck(x, z, 0x2a1a16, 0x3a2420, 0.7),
    wall: (x, y, i) => y === 9 ? 0x3a2420 : (i % 3 === 0 ? 0x1a1210 : 0x2a1a16),
    edge: 0x3a2420, dust: [0x2a1a16, 0xff6a1a], out: 0xff5a1a, outY: -6, post: 0x1a1210, plinth: 0x2a1a16,
    scenery(g) { const vo = new VX.Grid(); for (let y = 0; y < 22; y++) vo.cyl('y', 0, 0, 24 - y, y, y, (x, yy, z) => yy > 18 && hh(x, yy, z) > 0.5 ? G(0xff5a1a) : (hh(x, yy, z) > 0.8 ? 0x3a2420 : 0x2a1a16)); prop(g, vo, 0.6, 0, -2, -42);
      for (const [x, z, r] of [[-18, -12, 6], [19, -14, 7], [-24, -24, 8], [24, -26, 6]]) prop(g, K.rock(0x2a1a16, r), 0.45, x, -2, z);
      glowLight(g, 0xff6a1a, 1.4, 40, 0, 4, -14); },
    ambient: g => drift(g, { col: 0xffa040, n: 140, rise: true, speed: 1.0, size: 0.09 }) });
  set('storm', { name: 'STORM PEAK', tag: 'A slate summit in the rain, lightning rods at every corner',
    sky: [0x0a0e1a, 0x3a4a6a], fog: 0x2a3448, hemi: [0xb8c8e8, 0x0a0e1a, 0.75], sun: [0xc8d8ff, 0.8],
    floor: (x, z) => Math.abs(dist(x, z) - 9) < 0.6 ? 0xffe03a : tiles(x, z, 10, 0x4a5060, 0x424858, 0x2a2e38),
    wall: (x, y, i) => y === 9 || y === 0 ? 0x6a7080 : (i % 3 === 0 ? 0x6a7080 : -1),
    edge: 0x6a7080, dust: [0x4a5060, 0x7ae8ff], out: 0x0a0e1a, outY: -20, post: 0x6a7080, plinth: 0x2a2e38,
    scenery(g) { for (const [x, z] of [[-17, -9], [17, -9], [-20, -20], [20, -20]]) { const r = new VX.Grid(); r.box(0, 0, 0, 0, 28, 0, 0x6a7080); r.box(-1, 28, -1, 1, 30, 1, G(0x7ae8ff)); r.box(-2, 0, -2, 2, 1, 2, 0x3a3e48); prop(g, r, 0.42, x, -2, z); }
      for (const [x, z, r] of [[-14, -34, 12], [6, -40, 15], [24, -32, 10]]) prop(g, spike(0x3a4050, 0xe8eef8, r * 2), 0.6, x, -6, z); },
    ambient: g => { const rain = drift(g, { col: 0x9ab8e8, n: 220, speed: 5, size: 0.06, wind: 1.5, amp: 0.1 }), L = new THREE.PointLight(0xbff4ff, 0, 90); L.position.set(0, 26, -12); g.add(L); let t = 0;
      return { update(dt) { rain.update(dt); t -= dt; if (t <= 0 && U.vrand() < 0.006) t = 0.14; L.intensity = t > 0 ? 3.5 : 0; } }; } });
  set('blast', { name: "SAPPER'S RANGE", tag: 'Scorched dirt, craters, sandbags and powder kegs',
    sky: [0x8a7a6a, 0xd8c8a8], fog: 0xb8a890, hemi: [0xfff0d8, 0x4a3a2a, 0.9], sun: [0xffe8c0, 1.05],
    floor: (x, z) => [[14, 12], [46, 30], [28, 38], [52, 10], [10, 36]].some(([a, b]) => Math.hypot(x - a, z - b) < 3.2) ? (hh(x, 2, z) > 0.5 ? 0x2a2420 : 0x3a322a) : speck(x, z, 0x9a8a6a, 0x8a7a5a, 0.6),
    wall: (x, y, i) => ((y + (i >> 1)) % 2 === 0 ? 0xb8a880 : 0xa89870),
    edge: 0x6a5a3a, dust: [0x9a8a6a, 0x3a3a3a], out: 0x6a5a3a, outY: -2, post: 0x6a5a3a, plinth: 0x4a3a2a,
    scenery(g) { for (const [x, z] of [[-14, -10], [-16, -12], [15, -11]]) prop(g, K.barrel(0xd8301a, 0x2a2a30), 0.42, x, -2, z);
      for (const [x, z] of [[17, -14], [-18, -18], [20, -20]]) prop(g, K.crate(0x8a6a3a), 0.45, x, -2, z);
      prop(g, K.target(9), 0.45, 0, 2, -26); },
    ambient: g => drift(g, { col: 0x8a847a, n: 50, rise: true, speed: 0.4, size: 0.22, op: 0.5 }) });
  set('metal', { name: 'IRON FOUNDRY', tag: 'Riveted plate, girders and the furnaces roaring',
    sky: [0x14161a, 0x4a3a2a], fog: 0x2a2622, hemi: [0xffd8a0, 0x14161a, 0.8], sun: [0xffc890, 0.95],
    floor: (x, z) => (x % 8 === 0 || z % 8 === 0) ? 0x3a3e44 : ((x % 8 === 2 || x % 8 === 6) && (z % 8 === 2 || z % 8 === 6) ? 0x8a8e98 : 0x5a5e66),
    wall: (x, y, i) => y === 9 || y === 0 ? 0x8a6a2a : (i % 4 === 0 || (i + y) % 4 === 0 ? 0x5a5e66 : -1),
    edge: 0x8a6a2a, dust: [0x5a5e66, 0xffa040], out: 0x14161a, outY: -2, post: 0x3a3e44, plinth: 0x2a2e34,
    scenery(g) { for (const x of [-16, 0, 16]) { const fu = new VX.Grid(); fu.box(-6, 0, -4, 6, 14, 4, (xx, y, z) => z === 4 && Math.abs(xx) < 3 && y > 2 && y < 8 ? G(0xff7a1a) : 0x3a3e44); fu.cyl('y', 0, 0, 2, 15, 26, 0x2a2e34); prop(g, fu, 0.45, x, -2, -24); }
      const gi = new VX.Grid(); gi.box(-40, 30, 0, 40, 31, 1, 0x8a6a2a); for (const x of [-40, 40]) gi.box(x, 0, 0, x + 1, 30, 1, 0x8a6a2a); prop(g, gi, 0.42, 0, -2, -16);
      glowLight(g, 0xff7a1a, 1.4, 34, 0, 4, -20); },
    ambient: g => drift(g, { col: 0xffa040, n: 90, rise: true, speed: 1.2, size: 0.06 }) });
  set('spirit', { name: 'LANTERN GROVE', tag: 'Night in the grove where the lanterns float',
    sky: [0x0a0a2a, 0x2a1a4a], fog: 0x1a1430, hemi: [0xc8b8ff, 0x0a0820, 0.7], sun: [0xd8c8ff, 0.7],
    floor: (x, z) => hh(x, 9, z) > 0.985 ? 0xc8a8ff : speck(x, z, 0x1a2240, 0x22284a, 0.6),
    wall: (x, y, i) => y === 9 ? 0xffd86a : (i % 5 === 0 || y === 5 ? 0x4a4a6a : -1),
    edge: 0x4a4a6a, dust: [0x22284a, 0xc8a8ff], out: 0x05050f, outY: -2, post: 0x4a4a6a, plinth: 0x14142a,
    scenery(g) { for (const [x, z] of [[-16, -12], [17, -14], [-12, -24], [10, -26], [-22, -20], [22, -22]]) prop(g, K.tree(0x2a1a2a, 0x2a2a5a, 12, 7, 0x3a3a7a), 0.45, x, -2, z);
      for (const [x, y, z] of [[-8, 5, -14], [6, 6, -16], [-3, 7, -20], [12, 5, -10], [-14, 6, -8]]) prop(g, K.lantern(0xffd86a), 0.45, x, y, z);
      prop(g, K.stoneLantern(), 0.45, -6, -2, -12); prop(g, K.stoneLantern(), 0.45, 6, -2, -12); glowLight(g, 0xc8a8ff, 1.0, 30, 0, 6, -12); },
    ambient: g => drift(g, { col: 0xffd86a, n: 90, rise: true, speed: 0.25, size: 0.1, amp: 0.8 }) });
  set('swamp', { name: 'THE MIRE', tag: 'Black water, reeds and the old drowned trees',
    sky: [0x1a2a14, 0x6a7a4a], fog: 0x3a4a2a, hemi: [0xc8d8a0, 0x141a0c, 0.75], sun: [0xd8e0b0, 0.8],
    floor: (x, z) => hh(x >> 2, 2, z >> 2) > 0.78 ? (hh(x, 3, z) > 0.9 ? 0x4a6a3a : 0x2a3a2a) : speck(x, z, 0x4a4a2a, 0x3a4a22, 0.6),
    wall: (x, y, i) => (hh(i, 1, 4) > 0.4 && y < 4 + (hh(i, 2, 4) * 6 | 0)) ? (y % 3 ? 0x6a8a3a : 0x8aa84a) : -1,
    noEdge: true, edge: 0x4a4a2a, dust: [0x4a4a2a, 0x9ab83a], out: 0x1a2a14, outY: -2, post: 0x3a2a1a, plinth: 0x2a2a14,
    scenery(g) { for (const [x, z, h] of [[-16, -10, 14], [17, -12, 12], [-10, -22, 16], [12, -24, 18], [-22, -18, 12]]) prop(g, deadTree(0x3a2a1a, h), 0.45, x, -2, z);
      for (const [x, z] of [[-18, -6], [18, -8], [0, -20]]) prop(g, K.tree(0x3a2a1a, 0x4a5a2a, 10, 6, 0x6a7a3a), 0.42, x, -2, z);
      glowLight(g, 0xb8e85a, 0.7, 30, 0, 5, -10); },
    ambient: g => drift(g, { col: 0xb8e85a, n: 70, rise: true, speed: 0.2, size: 0.09, amp: 0.9 }) });

  /* ================================================== the lists and the home ground */
  Arena.HOUSE = Arena.LIST.slice();
  Arena.HOME = HOME;
  Arena.PLAYSETS = KB.LINE_ORDER.filter(l => HOME[l]).map(l => HOME[l]);
  Arena.LIST = Arena.HOUSE.concat(Arena.PLAYSETS);
  Arena.home = line => HOME[line] || null;
  for (const id of KB.LINE_ORDER) if (!HOME[id]) console.warn('[playsets] no playset for ' + id);
})();
