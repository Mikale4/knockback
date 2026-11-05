/* ============================================================================
   voxel.js -- the voxel kit: a paintable grid, a mesher with ambient occlusion,
   and rigs (a tree of pivoting parts) built from part definitions.

   Conventions used by every model in the game
   - A model is a set of PARTS. Each part has a pivot; its voxels are painted in
     coordinates relative to that pivot (the voxel at 0,0,0 is centred on it).
   - +Y is up, +Z is the way the model faces, +X is the model's own LEFT.
   - A part's `at` is where its pivot sits inside its parent, in the parent's
     voxel units. `scale` (world units per voxel) is set once per model.
   - Colours are 0xRRGGBB numbers. Wrap one as VX.glow(0xRRGGBB) to make it
     unlit (neon, Ether, fire, eyes): glowing voxels ignore lighting and shadow.
   ========================================================================== */
(function () {
  'use strict';

  const GLOW = 0x1000000; // a flag bit above the 24 colour bits
  const glow = c => (c & 0xffffff) | GLOW;
  const isGlow = c => (c & GLOW) !== 0;

  // a tiny deterministic hash so per-voxel colour jitter is stable between builds
  function hash3(x, y, z) {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  /* ---------------------------------------------------------------- grid -- */
  class Grid {
    constructor() { this.m = new Map(); this.jit = 0.06; }
    static key(x, y, z) { return ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512); }
    set(x, y, z, c) { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (c == null || c < 0) this.m.delete(Grid.key(x, y, z)); else this.m.set(Grid.key(x, y, z), c); return this; }
    get(x, y, z) { const v = this.m.get(Grid.key(x, y, z)); return v === undefined ? -1 : v; }
    has(x, y, z) { return this.m.has(Grid.key(x, y, z)); }
    del(x, y, z) { this.m.delete(Grid.key(Math.round(x), Math.round(y), Math.round(z))); return this; }
    /* inclusive box; c may be a function (x,y,z) => colour (or -1 to skip) */
    box(x0, y0, z0, x1, y1, z1, c) {
      if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        const v = typeof c === 'function' ? c(x, y, z) : c; if (v != null && v >= 0) this.set(x, y, z, v);
      }
      return this;
    }
    /* the same box and its mirror image across x = 0 */
    boxM(x0, y0, z0, x1, y1, z1, c) { this.box(x0, y0, z0, x1, y1, z1, c); this.box(-x0, y0, z0, -x1, y1, z1, c); return this; }
    setM(x, y, z, c) { this.set(x, y, z, c); this.set(-x, y, z, c); return this; }
    /* hollow out a box (removes voxels) */
    cut(x0, y0, z0, x1, y1, z1) {
      if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.m.delete(Grid.key(x, y, z));
      return this;
    }
    /* ellipsoid centred at (cx,cy,cz) */
    ell(cx, cy, cz, rx, ry, rz, c) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
          for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
            const d = ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 + ((z - cz) / (rz + 0.5)) ** 2;
            if (d <= 1) { const v = typeof c === 'function' ? c(x, y, z) : c; if (v != null && v >= 0) this.set(x, y, z, v); }
          }
      return this;
    }
    /* cylinder along an axis ('y' default): centre (cx,cz) on the other two axes, from a0 to a1 */
    cyl(axis, c1, c2, r, a0, a1, c) {
      if (a0 > a1) [a0, a1] = [a1, a0];
      for (let a = a0; a <= a1; a++)
        for (let i = Math.floor(c1 - r); i <= Math.ceil(c1 + r); i++)
          for (let j = Math.floor(c2 - r); j <= Math.ceil(c2 + r); j++) {
            if ((i - c1) ** 2 + (j - c2) ** 2 > (r + 0.35) ** 2) continue;
            const v = typeof c === 'function' ? (axis === 'x' ? c(a, i, j) : axis === 'y' ? c(i, a, j) : c(i, j, a)) : c;
            if (v == null || v < 0) continue;
            if (axis === 'x') this.set(a, i, j, v); else if (axis === 'y') this.set(i, a, j, v); else this.set(i, j, a, v);
          }
      return this;
    }
    /* a 3D line of voxels (Bresenham-ish, by sampling) with an optional thickness radius */
    line(x0, y0, z0, x1, y1, z1, c, r) {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 2));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t;
        if (r) this.ell(x, y, z, r, r, r, c); else this.set(x, y, z, c);
      }
      return this;
    }
    /* recolour every existing voxel that passes a test */
    paint(test, c) { for (const [k, v] of this.m) { const z = (k % 1024) - 512, y = (Math.floor(k / 1024) % 1024) - 512, x = Math.floor(k / 1048576) - 512; if (test(x, y, z, v)) this.m.set(k, typeof c === 'function' ? c(x, y, z, v) : c); } return this; }
    each(fn) { for (const [k, v] of this.m) { const z = (k % 1024) - 512, y = (Math.floor(k / 1024) % 1024) - 512, x = Math.floor(k / 1048576) - 512; fn(x, y, z, v); } }
    get size() { return this.m.size; }
    bounds() {
      let a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9];
      this.each((x, y, z) => { a = [Math.min(a[0], x), Math.min(a[1], y), Math.min(a[2], z)]; b = [Math.max(b[0], x), Math.max(b[1], y), Math.max(b[2], z)]; });
      return { min: a, max: b };
    }
  }

  /* -------------------------------------------------------------- mesher --
     Every exposed face becomes a quad. Each corner is darkened by the voxels
     around it (classic voxel ambient occlusion), and every voxel gets a little
     deterministic colour jitter so flat areas read as painted, not plastic. */
  const FACES = [
    // dir, the 4 corners (counter-clockwise seen from outside), shade
    { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.86 },
    { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.86 },
    { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0 },
    { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.62 },
    { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.94 },
    { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.78 },
  ];
  const AO = [0.52, 0.7, 0.86, 1.0];

  function meshGrid(grid, s, opts) {
    opts = opts || {};
    const jit = opts.jitter != null ? opts.jitter : grid.jit;
    const out = { lit: { p: [], n: [], c: [], i: [] }, glow: { p: [], n: [], c: [], i: [] } };
    const solid = (x, y, z) => grid.has(x, y, z);
    const col = new THREE.Color();
    grid.each((x, y, z, v) => {
      const g = isGlow(v), B = g ? out.glow : out.lit, rgb = v & 0xffffff;
      col.setHex(rgb);
      const j = 1 + (hash3(x, y, z) - 0.5) * 2 * (g ? jit * 0.4 : jit);
      for (const F of FACES) {
        const [dx, dy, dz] = F.d;
        if (solid(x + dx, y + dy, z + dz)) continue;
        if (opts.noBottom && dy === -1) continue;
        const base = B.p.length / 3, aos = [];
        for (const cr of F.c) {
          const px = x - 0.5 + cr[0], py = y - 0.5 + cr[1], pz = z - 0.5 + cr[2];
          B.p.push(px * s, py * s, pz * s);
          B.n.push(dx, dy, dz);
          let a = 3;
          if (!g && opts.ao !== false) {
            // the two edge neighbours and the corner neighbour, one step outside the face
            const ox = x + dx, oy = y + dy, oz = z + dz;
            const u = [], axes = [0, 1, 2].filter(k => F.d[k] === 0);
            for (const k of axes) u.push(cr[k] ? 1 : -1);
            const off = (k, sgn) => { const o = [0, 0, 0]; o[axes[k]] = sgn; return o; };
            const e1 = off(0, u[0]), e2 = off(1, u[1]);
            const s1 = solid(ox + e1[0], oy + e1[1], oz + e1[2]) ? 1 : 0;
            const s2 = solid(ox + e2[0], oy + e2[1], oz + e2[2]) ? 1 : 0;
            const sc = solid(ox + e1[0] + e2[0], oy + e1[1] + e2[1], oz + e1[2] + e2[2]) ? 1 : 0;
            a = s1 && s2 ? 0 : 3 - (s1 + s2 + sc);
          }
          aos.push(a);
          const k = (g ? 1 : F.s * AO[a]) * j;
          B.c.push(Math.min(1, col.r * k), Math.min(1, col.g * k), Math.min(1, col.b * k));
        }
        // flip the diagonal where it hides the AO gradient better
        if (aos[0] + aos[2] > aos[1] + aos[3]) B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
        else B.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      }
    });
    const mk = B => {
      if (!B.i.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
      g.setIndex(B.i);
      g.computeBoundingSphere();
      return g;
    };
    return { lit: mk(out.lit), glow: mk(out.glow) };
  }

  /* ------------------------------------------------------------ materials -- */
  const MAT = {};
  function litMat() { return MAT.lit || (MAT.lit = new THREE.MeshLambertMaterial({ vertexColors: true })); }
  function glowMat() { return MAT.glow || (MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); }

  /* a static object (a prop or a piece of scenery) from one grid */
  function object(grid, s, opts) {
    opts = opts || {};
    const G = meshGrid(grid, s, opts), root = new THREE.Group();
    if (G.lit) { const m = new THREE.Mesh(G.lit, opts.material || litMat()); m.castShadow = opts.cast !== false; m.receiveShadow = opts.receive !== false; root.add(m); }
    if (G.glow) { const m = new THREE.Mesh(G.glow, glowMat()); root.add(m); }
    return root;
  }

  /* ---------------------------------------------------------------- rigs --
     def = { scale, parts: { name: { parent, at:[x,y,z], rot:[x,y,z], draw(g) } } }
     The meshed geometry is cached per definition, so a dozen of the same enemy
     cost one mesh build. Each rig gets its own lit material (for hit flashes and
     status tints) and shares the glow material. */
  const CACHE = new Map();
  function buildGeoms(id, def) {
    if (id && CACHE.has(id)) return CACHE.get(id);
    const out = {};
    for (const name in def.parts) {
      const P = def.parts[name], g = new Grid();
      if (P.jitter != null) g.jit = P.jitter;
      if (P.draw) P.draw(g, def);
      out[name] = meshGrid(g, def.scale, { ao: P.ao });
    }
    if (id) CACHE.set(id, out);
    return out;
  }

  function rig(id, def) {
    const geoms = buildGeoms(id, def);
    const mat = litMat().clone();
    mat.emissive = new THREE.Color(0, 0, 0);
    const root = new THREE.Group(), parts = {}, rest = {};
    const s = def.scale;
    // create groups first, then parent them
    for (const name in def.parts) {
      const P = def.parts[name], grp = new THREE.Group();
      grp.name = name;
      const G = geoms[name];
      if (G.lit) { const m = new THREE.Mesh(G.lit, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m); }
      if (G.glow) { const m = new THREE.Mesh(G.glow, glowMat()); grp.add(m); }
      parts[name] = grp;
    }
    for (const name in def.parts) {
      const P = def.parts[name], grp = parts[name];
      const at = P.at || [0, 0, 0];
      grp.position.set(at[0] * s, at[1] * s, at[2] * s);
      if (P.rot) grp.rotation.set(P.rot[0], P.rot[1], P.rot[2]);
      rest[name] = { px: grp.position.x, py: grp.position.y, pz: grp.position.z, rx: grp.rotation.x, ry: grp.rotation.y, rz: grp.rotation.z };
      (P.parent ? parts[P.parent] : root).add(grp);
    }
    const R = { id, def, root, parts, rest, mat, height: (def.height || 26) * s, scale: s };
    // world position of a named socket (a part plus a voxel offset), e.g. a weapon tip
    R.socket = (name, off, target) => {
      const p = parts[name] || root; const v = target || new THREE.Vector3();
      v.set((off ? off[0] : 0) * s, (off ? off[1] : 0) * s, (off ? off[2] : 0) * s);
      root.updateMatrixWorld(true);
      return p.localToWorld(v);
    };
    R.dispose = () => { mat.dispose(); if (root.parent) root.parent.remove(root); };
    return R;
  }

  /* a sky dome: a vertical gradient from `top` (zenith) through `mid` (horizon) to `bottom`, unlit and unfogged */
  function sky(scene, top, mid, bottom) {
    const geo = new THREE.SphereGeometry(300, 24, 16), pos = geo.attributes.position, cols = [];
    const T = new THREE.Color(top), M = new THREE.Color(mid != null ? mid : top), B = new THREE.Color(bottom != null ? bottom : (mid != null ? mid : top)), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i) / 300; // -1 .. 1
      if (h >= 0) c.copy(M).lerp(T, Math.pow(h, 0.6)); else c.copy(M).lerp(B, Math.min(1, -h * 3));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    m.renderOrder = -10; m.name = 'sky';
    scene.add(m);
    return m;
  }

  window.VX = { Grid, glow, isGlow, meshGrid, object, rig, litMat, glowMat, hash3, sky, cache: CACHE };
})();
