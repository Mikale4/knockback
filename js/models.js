/* ============================================================================
   models.js -- the voxel action figures.

   THE PEG SKELETON (voxel units, scale S). Every part of every line is drawn
   to fit it, so any head, core, arms and legs snap together:
     hips  at (0, 12.5, 0) of the figure's feet   (CORE draws the waist/skirt)
     legL/legR at (+/-2, -1, 0) of hips, voxels y -11..0   (LEGS)
     torso at (0, 1, 0) of hips, voxels y 0..8            (CORE)
     head  at (0, 9.5, 0) of torso, voxels y 0..7         (HEAD)
     armL/armR at (+/-6, 7.5, 0) of torso, voxels y -9..0 (ARMS)
     wL/wR (what the hand holds) at (0, -8.5, 0) of the arm, drawn along +Z
   +Z is the way the figure faces, +X its own left. Grey ball joints at the
   elbows and knees sell the toy. Rarity repaints a part: DELUXE chrome,
   LIMITED gold, CHASE a dark body with glowing trim.
   ========================================================================== */
(function () {
  'use strict';
  const S = 0.062;
  const G = VX.glow;
  const JOINT = 0x6b6e78;
  const WOOD = 0x8a5a2b, WOOD2 = 0x6e4520, BONE = 0xf1e6c8, LEATHER = 0x4a3020, WHITE = 0xf4f4f0;
  const shade = (c, k) => { const r = Math.min(255, ((c >> 16) & 255) * k) | 0, g = Math.min(255, ((c >> 8) & 255) * k) | 0, b = Math.min(255, (c & 255) * k) | 0; return (r << 16) | (g << 8) | b; };
  const mix = (a, b, t) => { const f = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t); return (f(16) << 16) | (f(8) << 8) | f(0); };

  /* PALETTES: every figure comes in seven colours. CLASSIC is the line's own; the others repaint its armour and cloth in
     one theme (a mixed custom reads as one colour too). Two figures in a fight that would look alike (the same colours on
     the same fighter, or the same theme) don't: the second one gets a TINT, darker (lighter for SHADOW) and a shade cooler */
  const PAINTS = [
    { name: 'CLASSIC' },
    { name: 'CRIMSON', h: 0.995, h2: 0.07, acc: 0xffd040 },
    { name: 'AZURE', h: 0.585, h2: 0.53, acc: 0xeef4ff },
    { name: 'JADE', h: 0.4, h2: 0.33, acc: 0xffd040 },
    { name: 'ROYAL', h: 0.76, h2: 0.84, acc: 0xffd040 },
    { name: 'SHADOW', dark: 1 },
    { name: 'IVORY', light: 1 },
  ];
  const _C = new THREE.Color(), _H = {}, clamp01 = v => Math.min(1, Math.max(0, v));
  const hsl = (c, f) => { _C.setHex(c & 0xffffff); _C.getHSL(_H); f(_H); _C.setHSL(((_H.h % 1) + 1) % 1, clamp01(_H.s), clamp01(_H.l)); return _C.getHex(); };
  function painted(b, k) {
    const P = PAINTS[k]; if (!P || !k) return b;
    const p = Object.assign({}, b);
    if (P.h != null) {
      p.main = hsl(b.main, o => { o.h = P.h; o.s = Math.max(o.s, 0.6); o.l = Math.min(0.55, Math.max(0.3, o.l)); });
      p.second = hsl(b.second, o => { o.h = P.h2; o.s = Math.max(o.s, 0.45); o.l = Math.min(0.5, Math.max(0.16, o.l)); });
      p.cloth = hsl(b.cloth, o => { o.h = P.h2; o.s = Math.max(o.s, 0.35); o.l = Math.min(0.6, Math.max(0.2, o.l)); });
      p.dark = hsl(b.dark, o => { o.h = P.h; o.s = Math.min(o.s, 0.4); o.l = Math.min(o.l, 0.16); });
      p.accent = P.acc;
    } else if (P.dark) {
      for (const key of ['main', 'second', 'cloth']) p[key] = hsl(b[key], o => { o.s *= 0.25; o.l = 0.1 + o.l * 0.3; });
      p.dark = 0x060608; p.accent = hsl(b.glow, o => { o.l = Math.max(o.l, 0.55); });
    } else if (P.light) {
      p.main = mix(b.main, 0xf2eee4, 0.72); p.second = mix(b.second, 0xd8d2c4, 0.6); p.cloth = mix(b.cloth, 0xffffff, 0.55); p.dark = mix(b.dark, 0x7a7468, 0.5); p.accent = 0xd8a830;
    }
    return p;
  }
  function tinted(p) {
    _C.setHex(p.main & 0xffffff); _C.getHSL(_H); const lighten = _H.l < 0.22, q = Object.assign({}, p);
    for (const key of ['main', 'second', 'cloth', 'dark', 'accent', 'metal']) if (q[key] != null && q[key] <= 0xffffff) q[key] = hsl(q[key], o => { o.l = lighten ? o.l * 1.5 + 0.16 : o.l * 0.55; o.h += 0.05; o.s = Math.min(1, o.s * 1.1); });
    return q;
  }
  /* two builds in one fight that would look alike: the same theme on anyone, or close colours on the same fighter
     (3 of its 5 parts; the SAMURAI's own colours are already crimson, say) */
  function looksAlike(a, b) {
    if (!a || !b) return false;
    const pa = a.paint | 0, pb = b.paint | 0;
    if (pa === pb && pa > 0) return true;
    if (['head', 'core', 'armL', 'armR', 'legs'].filter(s => a[s].line === b[s].line).length < 3) return false;
    if (pa === pb) return true;
    const ca = painted(KB.LINES[a.core.line].pal, pa).main, cb = painted(KB.LINES[b.core.line].pal, pb).main;
    return Math.hypot(((ca >> 16) & 255) - ((cb >> 16) & 255), ((ca >> 8) & 255) - ((cb >> 8) & 255), (ca & 255) - (cb & 255)) < 70;
  }
  /* a palette's colours on a line, for the menus' swatches */
  const swatch = (line, k) => { const p = painted(KB.LINES[line].pal, k | 0); return [p.main, p.second, p.accent].map(c => '#' + (c & 0xffffff).toString(16).padStart(6, '0')); };

  /* the line's palette, repainted for a rarity (and a palette, and the look-alike tint) */
  function palette(line, r, k, tint) {
    const b = painted(KB.LINES[line].pal, k | 0), p = Object.assign({}, b);
    p.eye = 0x1a1a24; p.joint = JOINT; p.gem = b.glow;
    if (r === 1) { p.accent = shade(b.accent, 1.18); p.metal = 0xf6faff; p.main = shade(b.main, 1.06); p.gem = G(b.glow); }
    if (r === 2) { p.accent = 0xffc83d; p.metal = 0xfff3c4; p.second = shade(b.second, 0.9); p.gem = G(0xfff1a0); p.joint = 0xb8902a; }
    if (r === 3) {
      p.main = mix(b.main, 0x140f22, 0.78); p.second = mix(b.second, 0x0a0812, 0.55); p.dark = 0x07060c; p.cloth = mix(b.cloth, 0x1a1428, 0.6);
      p.accent = G(b.glow); p.metal = G(shade(b.glow, 1.25) | 0x404040); p.eye = G(b.glow); p.gem = G(b.glow); p.joint = 0x2a2838;
    }
    return tint ? tinted(p) : p;
  }

  /* ------------------------------------------------------------- drawing --
     D[line] = { head(g,p), torso(g,p), hips(g,p), arm(g,p,o), wR(g,p), wL(g,p), leg(g,p,o) }
     o is the outward side: +1 for the left limbs (+X), -1 for the right. */
  const elbow = (g, p, o) => { g.set(-o, -4, 0, p.joint); g.set(-o, -4, -1, p.joint); };
  const knee = (g, p, o) => { g.set(o, -5, 0, p.joint); g.set(-o, -5, 0, p.joint); };
  const hand = (g, c) => g.box(-1, -9, -1, 1, -8, 1, c);
  const eyes = (g, p, y, z) => { g.box(-2, y, z, -1, y, z, p.eye); g.box(1, y, z, 2, y, z, p.eye); };
  const lumpy = (g, x0, y0, z0, x1, y1, z1, c, k) => g.box(x0, y0, z0, x1, y1, z1, (x, y, z) => VX.hash3(x, y, z) < (k || 0.5) ? c : shade(c, 0.85));

  const D = {};
  /* ---------------------------------------------------------------- SAMURAI */
  D.samurai = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin);
      eyes(g, p, 3, 3); g.box(-2, 4, 3, -1, 4, 3, p.dark); g.box(1, 4, 3, 2, 4, 3, p.dark);
      g.box(-2, 0, 4, 2, 2, 4, p.main); g.box(-1, 1, 4, 1, 1, 4, p.dark); g.set(0, 2, 5, p.main);      // menpo mask
      g.box(-4, 5, -4, 4, 6, 4, p.second); g.box(-3, 7, -3, 3, 7, 3, p.second); g.box(-2, 8, -2, 2, 8, 2, p.second);
      g.box(-4, 5, 4, 4, 5, 4, p.accent);
      for (let y = 1; y <= 5; y++) g.box(-5, y, -5, 5, y, -4, y % 2 ? p.main : p.dark);           // shikoro
      g.boxM(5, 1, -4, 5, 5, 1, (x, y) => y % 2 ? p.main : p.dark);
      g.boxM(5, 4, 2, 5, 6, 3, p.main); g.setM(5, 6, 3, p.accent);                                   // fukigaeshi
      g.box(0, 6, 5, 0, 7, 5, p.accent);
      [[1, 8], [2, 9], [3, 10], [3, 11], [4, 12]].forEach(([x, y]) => g.setM(x, y, 5, p.accent));      // crescent
      g.set(0, 6, 6, p.gem);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      for (const y of [1, 3, 5]) { g.box(-4, y, 2, 4, y, 2, p.dark); g.box(-4, y, -2, 4, y, -2, p.dark); }
      g.box(-3, 7, 3, 3, 8, 3, p.second); g.box(-2, 8, 3, 2, 8, 3, p.accent);
      g.setM(2, 2, 3, p.accent); g.setM(2, 4, 3, p.accent); g.setM(2, 6, 3, p.accent);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-3, -1, -2, 3, 0, 2, p.second); g.box(-1, -1, 3, 1, 0, 3, p.accent);
      for (const [x0, x1] of [[-4, -1], [1, 4]]) { g.box(x0, -5, 3, x1, -1, 3, (x, y) => y % 2 ? p.main : p.dark); g.box(x0, -5, -3, x1, -1, -3, (x, y) => y % 2 ? p.main : p.dark); }
      g.boxM(4, -4, -2, 4, -1, 2, (x, y) => y % 2 ? p.main : p.dark);
    },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.second);
      g.box(o * 2, -4, -2, o * 2, 1, 2, (x, y) => y === 1 ? p.accent : (y % 2 ? p.main : p.dark));
      g.box(-1, 1, -2, 1, 1, 2, p.main);
      g.box(-1, -7, -1, 1, -5, 1, p.dark); g.set(0, -6, 2, p.accent); g.set(o, -6, 1, p.accent);
      hand(g, p.second); elbow(g, p, o);
    },
    wR(g, p) {
      for (let z = -2; z <= 2; z++) g.set(0, 0, z, z % 2 ? p.dark : WHITE);
      g.box(-1, -1, 3, 1, 1, 3, p.accent);
      for (let z = 4; z <= 15; z++) { const y = z >= 12 ? 1 : 0; g.set(0, y, z, p.metal); if (z < 14) g.set(0, y + 1, z, shade(p.metal & 0xffffff, 0.8) | (p.metal & 0x1000000)); }
    },
    wL(g, p) { /* the Kote's hand is empty: it joins the right hand on the katana's grip */ },
    leg(g, p, o) {
      g.box(-1, -7, -2, 1, 0, 2, p.cloth); g.box(o * 2, -7, -2, o * 2, -3, 2, p.cloth);
      g.box(0, -7, 2, 0, -1, 2, shade(p.cloth, 0.8));
      g.box(-1, -9, -1, 1, -8, 1, p.main); g.set(0, -8, 2, p.accent); g.set(0, -9, 2, p.main);
      g.box(-1, -11, -1, 1, -10, 1, WHITE); g.box(-1, -11, 2, 1, -10, 2, WHITE); g.box(-1, -11, -1, 1, -11, 2, 0xc9a66b);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- KNIGHT */
  D.knight = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 7, 3, p.main); g.cut(-3, 7, -3, -3, 7, 3); g.cut(3, 7, -3, 3, 7, 3);
      g.box(-3, 4, 3, 3, 4, 3, p.eye === 0x1a1a24 ? 0x101018 : p.eye); g.set(0, 4, 3, p.accent);
      g.box(0, 1, 3, 0, 6, 3, p.accent); g.box(-1, 6, 3, 1, 6, 3, p.accent);
      g.setM(2, 2, 3, p.dark); g.setM(2, 1, 3, p.dark);
      g.box(-3, 0, -3, 3, 0, 3, p.accent);
      g.box(0, 8, -3, 0, 9, 1, p.cloth); g.box(0, 10, -2, 0, 10, 0, p.cloth);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-3, 3, 3, 3, 7, 3, p.main); g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      g.box(-2, 0, 3, 2, 6, 3, p.second); g.box(-2, 0, 2, 2, 2, 2, p.second);
      g.box(0, 1, 4, 0, 5, 4, p.accent); g.box(-1, 4, 4, 1, 4, 4, p.accent);
      g.box(-3, 8, -2, 3, 8, 2, p.dark); g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-4, -3, -2, 4, 0, 2, (x, y) => y === -1 ? p.dark : p.main); g.box(-4, 0, -2, 4, 0, 2, LEATHER); g.set(0, 0, 3, p.accent);
      g.box(-2, -6, 3, 2, -1, 3, p.second); g.box(-2, -6, 3, 2, -6, 3, p.accent);
    },
    arm(g, p, o) {
      g.box(-2, -2, -2, 2, 1, 2, p.main); g.box(-1, 2, -1, 1, 2, 1, p.main); g.box(-2, -2, -2, 2, -2, 2, p.accent);
      g.box(o * 3, -3, -1, o * 3, 0, 1, p.main);
      g.box(-1, -4, -1, 1, -3, 1, p.main); g.set(0, -4, -2, p.accent);
      g.box(-1, -7, -1, 1, -5, 1, p.main); g.box(-1, -7, -1, 1, -7, 1, p.accent);
      hand(g, p.dark); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, -2, p.accent); g.box(0, 0, -1, 0, 0, 1, 0x5a3a22);
      g.box(-2, 0, 2, 2, 0, 2, p.accent); g.box(0, -1, 2, 0, 1, 2, p.accent);
      for (let z = 3; z <= 16; z++) { g.set(0, 0, z, p.metal); if (z < 16) g.set(0, 1, z, p.metal); }
      g.set(0, 0, 17, p.metal);
    },
    wL(g, p) {
      g.box(0, 0, -1, 0, 0, 1, LEATHER);
      for (let y = -4; y <= 7; y++) {
        const w = y >= 4 ? 4 : Math.max(0, Math.round(4 * (y + 5) / 9));
        for (let x = -w; x <= w; x++) { const edge = Math.abs(x) === w || y === 7 || y === -4; g.set(x, y + 1, 2, edge ? p.accent : p.second); }
      }
      g.box(0, -2, 3, 0, 7, 3, p.metal); g.box(-3, 5, 3, 3, 5, 3, p.metal); g.set(0, 5, 4, p.gem);
    },
    leg(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.main); g.box(-1, -5, 2, 1, -5, 2, p.accent); g.box(-1, -5, -1, 1, -5, 1, p.main);
      g.box(-1, -9, -1, 1, -6, 1, p.main); g.box(-1, -9, 2, 1, -7, 2, p.main);
      g.box(-1, -11, -1, 1, -10, 2, p.main); g.box(0, -11, 3, 0, -11, 3, p.main); g.box(-1, -11, -1, 1, -11, 2, p.dark);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- PIRATE */
  D.pirate = {
    head(g, p) {
      const hair = 0x3b2416;
      g.box(-3, 0, -3, 3, 5, 3, p.skin);
      g.box(-3, 1, -3, 3, 5, -3, hair); g.boxM(3, 1, -2, 3, 4, 0, hair);
      g.box(-2, 3, 3, -1, 3, 3, p.eye); g.box(1, 3, 3, 2, 3, 3, p.dark);                      // the patch
      [[3, 5], [2, 4], [-1, 2], [-2, 1]].forEach(([x, y]) => g.set(x > 2 ? 3 : x, y, x > 2 ? 2 : 3, p.dark));
      g.set(0, 2, 4, p.skin);
      g.box(-3, -1, 2, 3, 1, 3, hair); g.box(-2, -2, 3, 2, -1, 3, hair); g.box(-2, 2, 4, 2, 2, 4, hair); g.set(0, 1, 3, 0x8a3a3a);
      g.box(-3, 6, -3, 3, 8, 3, p.dark); g.box(-2, 9, -2, 2, 9, 2, p.dark);
      g.box(-5, 6, -4, 5, 6, 4, p.dark);
      for (let x = -4; x <= 4; x++) { const zf = 5 - Math.abs(x); g.set(x, 7, Math.min(4, zf + 0), p.dark); }
      g.box(0, 7, 5, 0, 8, 5, p.dark); g.setM(5, 7, -3, p.dark); g.setM(5, 8, -3, p.dark); g.box(-4, 7, -5, 4, 8, -5, p.dark);
      g.box(-5, 6, -4, 5, 6, -4, p.accent); g.setM(5, 6, -3, p.accent); g.set(0, 6, 5, p.accent);
      g.box(-1, 7, 4, 1, 8, 4, WHITE); g.set(0, 7, 4, p.dark);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      g.box(-1, 2, 2, 1, 8, 2, p.cloth); g.box(-1, 6, 3, 1, 8, 3, p.cloth); g.set(0, 5, 3, p.cloth);
      g.box(-2, 2, 3, -2, 8, 3, p.accent); g.box(2, 2, 3, 2, 8, 3, p.accent);
      for (const y of [3, 5]) g.setM(3, y, 3, p.accent);
      g.box(-4, 0, -2, 4, 1, 2, p.second); g.box(-4, 0, 3, -2, 1, 3, p.second);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-3, -1, -2, 3, 0, 2, 0xd9c9a3);
      g.box(-4, -7, -3, 4, 0, -3, p.main); g.box(-4, -7, -3, 4, -7, -3, p.accent);
      g.boxM(4, -5, -2, 4, 0, 2, p.main); g.boxM(3, -5, 3, 4, 0, 3, p.main); g.boxM(3, -5, 3, 4, -5, 3, p.accent);
      g.box(-4, -3, 3, -3, 0, 4, p.second);
    },
    arm(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, p.main);
      g.box(-1, 1, -1, 1, 1, 1, p.accent); g.box(o * 2, -1, -1, o * 2, 1, 1, p.accent);
      g.box(-2, -7, -2, 2, -6, 2, p.main); g.box(-2, -6, -2, 2, -6, 2, p.accent);
      g.box(-1, -7, 2, 1, -7, 2, p.cloth);
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -1, 0, 0, 1, p.dark);
      g.box(-1, -1, 1, 1, 1, 2, p.accent); g.cut(0, 0, 1, 0, 0, 2); g.set(0, 0, 1, p.dark);
      for (let z = 3; z <= 12; z++) { const lo = z >= 8 && z <= 11 ? -1 : 0; g.box(0, lo, z, 0, z === 12 ? 0 : 1, z, p.metal); }
    },
    wL(g, p) {
      g.box(0, -2, -1, 0, 0, 1, WOOD); g.set(0, -3, -2, WOOD); g.set(0, -2, -2, p.accent);
      g.box(0, 1, 0, 0, 1, 2, WOOD); g.box(0, 2, 1, 0, 2, 9, p.dark); g.set(0, 2, 10, p.metal);
      g.set(0, 3, 1, p.metal); g.set(0, 2, 4, p.accent); g.set(0, 2, 7, p.accent); g.box(0, 1, 3, 0, 1, 6, WOOD);
    },
    leg(g, p, o) {
      const pants = 0xd9c9a3;
      if (o > 0) { // the peg leg
        g.box(-1, -5, -1, 1, 0, 1, pants); g.box(-1, -6, -1, 1, -6, 1, p.second);
        g.box(0, -11, 0, 0, -7, 0, WOOD); g.box(0, -11, 0, 0, -11, 0, p.accent); g.box(-1, -7, -1, 1, -7, 1, WOOD2);
      } else {
        g.box(-1, -4, -1, 1, 0, 1, pants);
        g.box(-1, -11, -1, 1, -5, 1, 0x1c1a1f); g.box(-2, -6, -2, 2, -5, 2, 0x2b2730); g.box(-1, -11, 2, 1, -10, 2, 0x1c1a1f);
        g.set(0, -9, 2, p.accent);
      }
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- MONK */
  D.monk = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 6, 3, p.skin); g.cut(-3, 6, -3, -3, 6, 3); g.cut(3, 6, -3, 3, 6, 3); g.cut(-3, 6, -3, 3, 6, -3);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0], [0, -2]]) g.set(x, 6, z, 0x9a6040);
      if (p.eye === 0x1a1a24) { g.box(-2, 3, 3, -1, 3, 3, p.dark); g.box(1, 3, 3, 2, 3, 3, p.dark); } else eyes(g, p, 3, 3);
      g.box(-3, 4, 3, -1, 4, 3, p.dark); g.box(1, 4, 3, 3, 4, 3, p.dark);
      g.setM(4, 2, 0, p.skin); g.setM(4, 3, 0, p.skin); g.set(0, 2, 4, p.skin);
      g.box(-1, 1, 3, 1, 1, 3, 0x9a5040);
      g.set(0, 5, 4, p.gem);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      for (let y = 0; y <= 8; y++) { const x0 = y - 5; for (let x = x0; x <= x0 + 2; x++) if (x >= -4 && x <= 4) { g.set(x, y, 2, p.second); g.set(-x, y, -2, p.second); } }
      for (const [x, y] of [[3, 8], [3, 7], [2, 6], [2, 5], [1, 4]]) { g.set(x, y, 3, p.dark); g.set(-x, y, 3, p.dark); }
      g.set(0, 4, 3, p.dark); g.set(0, 3, 3, 0xb02a20); g.set(0, 3, 4, p.accent);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-4, -3, -2, 4, 0, 2, p.main); g.box(-4, 0, -2, 4, 0, 2, p.cloth); g.set(1, 0, 3, p.cloth); g.box(1, -3, 3, 1, -1, 3, p.cloth); g.set(1, -3, 3, p.accent);
    },
    arm(g, p, o) {
      g.box(-1, -2, -1, 1, 0, 1, p.main); g.box(-2, -2, -2, 2, -2, 2, p.main); g.box(-1, 1, -1, 1, 1, 1, p.main);
      g.box(-1, -4, -1, 1, -3, 1, p.skin);
      g.box(-1, -7, -1, 1, -5, 1, (x, y) => y % 2 ? p.cloth : shade(p.cloth, 0.8));
      g.box(-1, -9, -1, 1, -8, 2, p.skin); g.box(-1, -8, 2, 1, -8, 2, shade(p.skin, 0.88));
      elbow(g, p, o);
    },
    wR(g, p) { g.box(-1, 0, 2, 1, 1, 2, p.metal); g.box(-1, 1, 3, 1, 1, 3, p.metal); },
    wL(g, p) { g.box(-2, 1, -2, 2, 1, 2, p.accent); g.box(-1, -1, 3, 1, 0, 3, G(p.glow)); g.set(0, 0, 4, G(p.glow)); },
    leg(g, p, o) {
      g.box(-1, -6, -2, 1, 0, 2, p.main); g.box(o * 2, -6, -1, o * 2, -2, 1, p.main);
      g.box(-1, -9, -1, 1, -7, 1, (x, y) => (y + x) % 2 ? p.cloth : shade(p.cloth, 0.82));
      g.box(-1, -11, -1, 1, -10, 1, p.skin); g.box(-1, -11, 2, 1, -11, 2, p.skin);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- VIKING */
  D.viking = {
    head(g, p) {
      const beard = p.cloth;
      g.box(-3, 0, -3, 3, 5, 3, p.skin); g.box(-3, 1, -4, 3, 5, -4, beard);
      eyes(g, p, 3, 3);
      g.box(-4, 5, -4, 4, 6, 4, p.metal); g.box(-3, 7, -3, 3, 7, 3, p.metal); g.box(-2, 8, -2, 2, 8, 2, p.metal);
      g.box(-4, 5, 4, 4, 5, 4, p.accent); g.box(0, 2, 4, 0, 4, 4, p.metal);
      g.box(-3, -2, 3, 3, 2, 4, (x, y) => y === 2 && Math.abs(x) <= 2 ? beard : beard); g.cut(-2, 3, 4, 2, 3, 4);
      g.cut(-1, 2, 4, 1, 2, 4); g.box(-2, 2, 5, 2, 2, 5, beard); g.box(-2, 1, 5, 2, 1, 5, shade(beard, 0.85)); g.set(0, 0, 5, 0x8a3030);
      g.setM(1, -3, 4, beard); g.setM(1, -4, 4, beard); g.setM(1, -3, 5, p.accent);
      [[5, 6], [6, 7], [6, 8], [6, 9], [5, 10], [5, 11]].forEach(([x, y]) => { g.setM(x, y, 0, BONE); g.setM(x, y, 1, BONE); });
      g.setM(5, 11, 0, shade(BONE, 0.85));
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 7, 2, (x, y, z) => (x + y + z) % 2 ? p.metal : shade(p.metal & 0xffffff, 0.75));
      g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      lumpy(g, -5, 6, -3, 5, 8, 3, p.main, 0.55); g.cut(-1, 8, -1, 1, 8, 1);
      g.box(-4, 0, -2, 4, 1, 2, p.dark); g.box(-1, 0, 3, 1, 1, 3, p.accent);
      g.box(-1, 9, -1, 1, 9, 1, p.joint); g.box(-1, 8, -1, 1, 8, 1, p.joint);
    },
    hips(g, p) { g.box(-4, -3, -2, 4, 0, 2, p.second); g.box(-4, -3, -2, 4, -3, 2, shade(p.second, 0.8)); g.box(-4, 0, -2, 4, 0, 2, p.dark); },
    arm(g, p, o) {
      lumpy(g, -2, -1, -2, 2, 1, 2, p.main, 0.5);
      g.box(-1, -4, -1, 1, -2, 1, p.skin);
      g.box(-1, -7, -1, 1, -5, 1, p.dark); g.set(o, -6, 1, p.accent); g.set(0, -6, 2, p.accent); g.set(0, -5, 2, p.accent);
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, 9, WOOD);
      g.box(0, -3, 8, 0, 1, 9, p.metal); g.box(0, -4, 9, 0, 1, 10, p.metal); g.set(0, 2, 9, p.metal);
      g.box(0, -4, 10, 0, 2, 10, p.accent === 0xc8ccd2 ? 0xeef2f6 : p.accent); g.set(0, 0, 7, p.metal);
    },
    wL(g, p) {
      g.box(0, 0, -1, 0, 0, 1, LEATHER);
      for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) {
        const r = Math.hypot(x, y); if (r > 5.2) continue;
        const c = r > 4.3 ? p.metal : ((x >= 0) === (y >= 0) ? p.second : WOOD);
        g.set(x, y + 2, 2, c);
      }
      g.box(-1, 1, 3, 1, 3, 3, p.metal); g.set(0, 2, 4, p.accent === 0xc8ccd2 ? p.metal : p.accent);
    },
    leg(g, p, o) {
      g.box(-1, -8, -1, 1, 0, 1, (x, y, z) => y < -3 && (y + x + z) % 3 === 0 ? p.dark : p.second);
      lumpy(g, -2, -11, -2, 2, -9, 2, p.main, 0.5); g.box(-1, -11, 3, 1, -10, 3, p.main); g.box(-2, -11, -2, 2, -11, 3, p.dark);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- NINJA */
  D.ninja = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 6, 3, p.main);
      g.box(-2, 3, 3, 2, 4, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-2, 5, 4, 2, 5, 4, p.accent); g.set(0, 5, 5, p.gem);
      g.box(-3, 5, -3, 3, 5, 3, p.accent); g.box(-2, 5, 3, 2, 5, 3, p.accent);
      g.box(-1, 4, -4, 1, 5, -4, p.dark); g.box(-1, 1, -5, -1, 4, -5, p.main); g.box(1, 0, -5, 1, 3, -5, p.main);
      g.box(-3, -1, -3, 3, 0, 3, p.second); g.box(-2, -1, -4, 2, 0, -4, p.second);
      for (let z = -5; z >= -9; z--) g.set(-2 - ((z + 5) >> 1 & 1), -1 + (z < -7 ? -1 : 0), z, p.second);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.cut(-4, 0, -2, -4, 2, 2); g.cut(4, 0, -2, 4, 2, 2);
      for (let y = 4; y <= 8; y++) { const x = Math.min(3, y - 4); g.set(-x, y, 2, p.cloth); g.set(x, y, 2, p.cloth); }
      g.box(-3, 0, -2, 3, 1, 2, p.dark); g.box(1, 0, 3, 2, 1, 3, p.second);
      for (let i = 0; i <= 9; i++) g.set(-3 + Math.round(i * 0.66), i, -3, i > 7 ? p.accent : p.dark);
      g.set(3, 10, -3, p.accent);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -2, -2, 3, 0, 2, p.main); g.box(-3, 0, -2, 3, 0, 2, p.dark); g.box(-5, -2, -1, -4, -1, 1, 0x3a2a1c); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.main); g.box(-1, 1, -1, 1, 1, 1, p.main);
      g.box(-1, -7, -1, 1, -5, 1, p.cloth); g.box(o, -7, -1, o, -5, 1, p.accent); g.box(-1, -7, 2, 1, -5, 2, p.accent);
      hand(g, p.dark); elbow(g, p, o);
    },
    wR(g, p) { g.box(0, 0, -1, 0, 0, 1, p.dark); g.box(0, -1, 2, 0, 1, 2, p.accent); for (let z = 3; z <= 8; z++) { g.set(0, 0, z, p.metal); if (z < 7) g.set(0, 1, z, p.metal); } },
    wL(g, p) {
      g.box(0, 0, -1, 0, 0, 4, 0x7a5230); g.set(0, 0, 5, p.accent);
      for (const [y, z] of [[1, 5], [2, 5], [3, 5], [4, 4], [4, 3], [3, 2]]) g.set(0, y, z, p.metal);
      for (let i = 1; i <= 5; i++) g.set(0, -i, -1 - (i > 3 ? 1 : 0), 0x50525e);
      g.box(0, -6, -2, 0, -6, -2, p.metal);
    },
    leg(g, p, o) {
      g.box(-1, -6, -1, 1, 0, 1, p.main);
      g.box(-1, -9, -1, 1, -7, 1, (x, y) => y % 2 ? p.cloth : shade(p.cloth, 0.75));
      g.box(-1, -11, -1, 1, -10, 1, p.dark); g.set(-1, -11, 2, p.dark); g.set(1, -11, 2, p.dark);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- SUMMONER */
  D.summoner = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.box(-1, 1, 3, 1, 1, 3, shade(p.skin, 0.82));
      g.box(-4, 0, -4, 4, 7, -4, p.main); g.boxM(4, 0, -3, 4, 7, 3, p.main); g.box(-4, 6, -3, 4, 7, 3, p.main);   // the hood
      g.boxM(4, 0, 4, 4, 7, 4, p.main); g.box(-3, 6, 4, 3, 7, 4, p.main); g.box(-4, 7, 5, 4, 7, 5, p.accent); g.boxM(4, 0, 5, 4, 6, 5, shade(p.main, 0.8));   // its gold-trimmed brim
      g.box(-3, 5, 3, 3, 5, 3, shade(p.skin, 0.55));                                                              // shadow under the brim
      g.box(-2, 8, -4, 2, 8, 1, p.main); g.box(-1, 9, -4, 1, 9, -2, p.main); g.set(0, 9, -5, p.main); g.set(0, 8, -5, p.main);
      g.set(0, 7, 5, p.gem); g.setM(1, 7, 5, p.accent);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      g.box(-1, 0, 3, 1, 7, 3, p.second); g.box(-4, 1, 3, 4, 1, 3, p.dark); g.set(0, 1, 4, p.accent);
      g.box(-4, 7, -3, 4, 8, 3, p.second); g.box(-3, 8, 3, 3, 8, 3, p.accent); g.cut(-1, 8, -1, 1, 8, 1);    // the mantle
      g.set(0, 4, 4, p.gem); g.set(0, 5, 4, p.accent); g.setM(1, 4, 4, p.accent);                           // a rune pendant
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-4, -1, -3, 4, 0, 3, p.main);
      for (let y = -8; y <= -2; y++) { const w = y < -5 ? 5 : 4; g.box(-w, y, 3, w, y, 3, p.main); g.box(-w, y, -3, w, y, -3, p.main); g.boxM(w, y, -2, w, y, 2, p.main); }
      g.box(-1, -8, 3, 1, -1, 3, p.second); g.box(-5, -8, 3, 5, -8, 3, p.accent); g.box(-5, -8, -3, 5, -8, -3, p.accent); g.boxM(5, -8, -2, 5, -8, 2, p.accent);
    },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 1, 1, p.main); g.box(-2, 0, -2, 2, 1, 2, p.second);
      g.box(-2, -7, -2, 2, -5, 2, p.main); g.box(-2, -7, -2, 2, -7, 2, p.accent); g.set(o * 2, -6, 0, p.second);
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -6, 0, 0, 11, WOOD); g.set(0, 0, -7, p.accent); g.box(0, 0, 2, 0, 0, 3, LEATHER);
      g.box(-1, -1, 12, 1, 1, 12, p.accent);
      g.ell(0, 0, 14, 1, 1, 1, G(p.glow));
      for (const [x, y] of [[-2, 0], [2, 0], [0, 2], [0, -2]]) g.box(x, y, 13, x, y, 15, p.accent);
      g.set(0, 0, 16, p.accent);
    },
    wL(g, p) {
      g.box(-2, -1, 1, 2, 1, 7, p.second); g.box(-1, 0, 2, 2, 0, 7, BONE); g.box(-2, -1, 1, -2, 1, 7, p.dark);
      g.box(-1, 2, 3, 1, 2, 5, p.accent); g.set(0, 2, 4, p.gem); g.box(2, -1, 1, 2, 1, 1, p.accent); g.box(2, -1, 7, 2, 1, 7, p.accent);
    },
    leg(g, p, o) {
      g.box(-1, -9, -1, 1, 0, 1, p.cloth);
      g.box(-1, -11, -1, 1, -10, 2, p.skin); g.box(-1, -11, -1, 1, -11, 2, LEATHER); g.box(-1, -10, 1, 1, -10, 1, LEATHER);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- PALADIN */
  D.paladin = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.box(-1, 1, 3, 1, 1, 3, shade(p.skin, 0.85));
      g.box(-4, 4, -4, 4, 7, 3, p.main); g.cut(-4, 7, -4, -4, 7, 3); g.cut(4, 7, -4, 4, 7, 3);
      g.box(-4, 0, -4, 4, 4, -4, p.main); g.boxM(4, 0, -3, 4, 3, 2, p.main);
      g.box(-4, 4, 4, 4, 4, 4, p.accent); g.box(0, 1, 4, 0, 4, 4, p.main);
      g.box(-2, 8, -2, 2, 8, 2, p.main); g.box(-1, 8, 3, 1, 9, 3, p.accent); g.set(0, 9, 4, p.gem); g.set(0, 10, 3, p.accent);
      [[5, -1, 1], [6, -2, 0], [7, -3, -1], [8, -4, -2], [9, -4, -3]].forEach(([y, z0, z1]) => g.boxM(5, y, z0, 5, y, z1, y > 7 ? p.accent : p.metal));
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      g.box(-3, 3, 3, 3, 7, 3, p.main);
      g.box(-2, 0, 3, 2, 6, 3, p.cloth); g.box(-2, 6, 3, 2, 6, 3, p.accent); g.boxM(2, 0, 3, 2, 6, 3, p.accent);
      g.set(0, 4, 4, p.gem); g.setM(1, 4, 4, p.accent); g.set(0, 5, 4, p.accent); g.set(0, 3, 4, p.accent);
      g.box(-4, 8, -2, 4, 8, 2, p.accent); g.box(-4, 0, -2, 4, 0, 2, LEATHER);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-4, -2, -2, 4, 0, 2, p.main); g.box(-4, 0, -2, 4, 0, 2, LEATHER); g.set(0, 0, 3, p.accent);
      g.box(-2, -8, 3, 2, -1, 3, p.cloth); g.box(-2, -8, 3, 2, -8, 3, p.accent);
      g.box(-2, -7, -3, 2, -1, -3, p.cloth); g.box(-2, -7, -3, 2, -7, -3, p.accent);
      g.boxM(4, -4, -2, 4, -2, 2, p.main); g.boxM(4, -4, -2, 4, -4, 2, p.accent);
    },
    arm(g, p, o) {
      g.ell(0, 0, 0, 2.2, 1.6, 2.2, p.main); g.box(-2, -1, -2, 2, -1, 2, p.accent); g.set(o * 3, 0, 0, p.accent);
      g.box(-1, -4, -1, 1, -2, 1, p.dark);
      g.box(-1, -7, -1, 1, -5, 1, p.main); g.box(-2, -7, -2, 2, -7, 2, p.accent);
      hand(g, p.main); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, 9, WOOD2); g.set(0, 0, -3, p.accent); g.box(0, 0, 0, 0, 0, 1, LEATHER); g.set(0, 0, 9, p.accent);
      g.box(-1, -3, 10, 1, 3, 12, p.metal); g.box(-1, -3, 10, 1, -3, 12, p.accent); g.box(-1, 3, 10, 1, 3, 12, p.accent);
      g.setM(2, 0, 11, p.gem); g.set(0, 0, 13, p.metal); g.set(0, 0, 14, p.metal);
    },
    wL(g, p) {
      g.box(0, 0, -1, 0, 0, 1, LEATHER);
      g.box(-4, -6, 2, 4, 9, 2, p.main);
      g.box(-4, -6, 2, 4, -6, 2, p.accent); g.box(-4, 9, 2, 4, 9, 2, p.accent); g.boxM(4, -6, 2, 4, 9, 2, p.accent);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.set(Math.round(Math.cos(a) * 2.6), 3 + Math.round(Math.sin(a) * 2.6), 3, p.accent); }
      g.ell(0, 3, 3, 1, 1, 0, p.gem); g.box(0, -4, 3, 0, -1, 3, p.cloth);
    },
    leg(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.main); g.box(-1, -5, 2, 1, -5, 2, p.accent);
      g.box(-1, -9, -1, 1, -6, 1, p.main); g.box(-1, -9, 2, 1, -6, 2, p.main); g.box(-1, -6, 2, 1, -6, 2, p.accent);
      g.box(-1, -11, -1, 1, -10, 3, p.main); g.box(-1, -11, -1, 1, -11, 3, p.dark); g.set(0, -10, 3, p.accent);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- DRAGOON */
  D.dragoon = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 6, 3, p.main); g.box(-3, 7, -2, 3, 7, 2, p.main);
      g.box(-3, 3, 3, 3, 3, 3, p.dark); g.setM(2, 3, 3, G(p.glow));                            // the visor slit, eyes burning
      g.box(-2, 4, 4, 2, 6, 5, p.main); g.box(-1, 5, 6, 1, 6, 6, p.main); g.set(0, 6, 7, p.main); // the dragon's snout over the brow
      g.box(-2, 4, 6, 2, 4, 6, p.accent); g.setM(2, 5, 6, p.accent);                            // its teeth
      g.box(-3, 0, 4, 3, 2, 4, p.second); g.box(-2, 0, 5, 2, 1, 5, p.second);                   // the jaw guard
      [[3, 6, -1], [3, 6, -2], [4, 7, -3], [4, 7, -4], [4, 8, -5], [4, 8, -6], [4, 9, -7]].forEach(([x, y, z]) => { g.setM(x, y, z, p.accent); g.setM(x, y - 1, z, shade(p.accent & 0xffffff, 0.8)); });
      for (let i = 0; i < 5; i++) g.set(0, 8 - i, -3 - (i >> 1), i % 2 ? p.second : p.main);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, (x, y) => (x + (y >> 1)) % 2 ? p.main : shade(p.main, 0.78));
      g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      g.box(-3, 4, 3, 3, 7, 3, p.accent); g.box(-1, 5, 4, 1, 6, 4, p.second); g.set(0, 6, 5, p.gem);
      g.box(-4, 0, -2, 4, 1, 2, p.second); g.box(-4, 0, 3, -2, 1, 3, p.second);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-4, -2, -2, 4, 0, 2, p.main); g.box(-4, 0, -2, 4, 0, 2, p.dark);
      g.boxM(3, -6, 3, 4, -1, 3, (x, y) => y % 2 ? p.main : p.accent);
      for (let i = 0; i < 7; i++) g.set(0, -1 - i, -3 - (i >> 1), i % 2 ? p.main : p.second);
    },
    arm(g, p, o) {
      g.box(-2, -1, -2, 2, 1, 2, p.main); g.box(-1, 2, -1, 1, 2, 1, p.main); g.set(o * 2, 2, 0, p.accent); g.set(o * 2, 3, -1, p.accent); g.set(o * 2, 4, -2, p.accent);
      g.box(-1, -4, -1, 1, -2, 1, p.dark);
      g.box(-1, -7, -1, 1, -5, 1, p.accent); g.set(0, -6, 2, p.second);
      hand(g, p.main); g.set(-1, -9, 2, p.accent); g.set(1, -9, 2, p.accent);
      elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -7, 0, 0, 14, p.dark); g.set(0, 0, -8, p.accent);
      for (const z of [-4, 4, 10]) g.set(0, 0, z, p.second);
      g.box(-2, 0, 15, 2, 0, 15, p.accent); g.box(0, -1, 15, 0, 1, 15, p.accent); g.setM(3, 0, 14, p.accent);
      g.box(-1, 0, 16, 1, 0, 19, p.metal); g.box(0, -1, 16, 0, 1, 19, p.metal); g.set(0, 0, 20, p.metal); g.set(0, 0, 21, p.metal);
    },
    wL(g, p) { /* the gauntlet's hand is free: it grips the lance two-handed */ },
    leg(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.cloth);
      g.box(-1, -9, -1, 1, -5, 1, (x, y) => y % 2 ? p.main : shade(p.main, 0.78)); g.box(-1, -6, 2, 1, -5, 2, p.accent); g.set(0, -4, 2, p.accent);
      g.box(-1, -11, -1, 1, -10, 2, p.main); g.box(-1, -11, -1, 1, -11, 2, p.dark); g.set(-1, -11, 3, p.accent); g.set(1, -11, 3, p.accent);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- BARD */
  D.bard = {
    head(g, p) {
      const hair = 0xc8743a;
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.box(-1, 1, 3, 1, 1, 3, 0xa83a4a); g.setM(2, 2, 3, mix(p.skin, 0xff8080, 0.35));
      g.box(-3, 1, -3, 3, 5, -3, hair); g.boxM(3, 1, -2, 3, 4, 0, hair); g.boxM(4, 1, -1, 4, 2, 0, hair);
      g.box(-4, 5, -4, 4, 6, 4, p.main); g.box(-3, 7, -3, 4, 7, 3, p.main); g.box(-1, 8, -2, 4, 8, 2, p.main); g.box(2, 9, -1, 4, 9, 1, p.main);
      g.box(-4, 5, 4, 4, 5, 4, p.second); g.box(-4, 5, -4, -4, 5, 4, p.second);
      [[-3, 7, -1], [-4, 8, -2], [-4, 9, -3], [-5, 10, -4], [-5, 10, -5], [-5, 11, -6], [-5, 11, -7], [-5, 12, -8]].forEach(([x, y, z], i) => g.set(x, y, z, i > 5 ? p.gem : WHITE));
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, (x) => Math.abs(x) % 3 === 1 ? p.second : p.main);
      g.cut(-4, 0, -2, -4, 1, 2); g.cut(4, 0, -2, 4, 1, 2);
      g.box(-1, 1, 3, 1, 7, 3, p.second); for (let y = 2; y <= 6; y += 2) g.set(0, y, 3, p.accent);
      g.box(-3, 8, -3, 3, 8, 3, WHITE); g.box(-2, 7, 3, 2, 7, 3, WHITE); g.cut(-1, 8, -1, 1, 8, 1);          // the ruff
      g.box(-4, 0, -2, 4, 1, 2, p.dark); g.set(0, 1, 3, p.accent);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-4, -3, -2, 4, 0, 2, p.main); g.box(-4, -3, -2, 4, -3, 2, p.accent); g.box(-4, 0, -2, 4, 0, 2, p.dark);
      g.box(3, -4, 3, 4, -1, 3, LEATHER); g.set(4, -2, 4, p.accent);
    },
    arm(g, p, o) {
      g.ell(0, -1, 0, 2, 2, 2, (x, y, z) => (x + z + y) % 2 ? p.main : p.second);
      g.box(-1, -7, -1, 1, -4, 1, p.main); g.box(-1, -7, -1, 1, -7, 1, WHITE);
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, 7, WOOD2); g.box(0, 1, -3, 0, 1, -1, WOOD2); g.setM(1, 1, -3, p.accent); g.setM(1, 1, -1, p.accent);   // the neck and pegbox
      g.box(0, 1, 0, 0, 1, 7, BONE);                                                                                                // strings
      g.ell(0, 0, 11, 3, 1, 3.5, WOOD); g.ell(0, 1, 11, 2, 0, 2.5, shade(WOOD, 1.15)); g.ell(0, 2, 11, 1, 0, 1, p.dark);              // the bowl and its sound hole
      g.box(0, 2, 13, 0, 2, 14, p.accent);
    },
    wL(g, p) {
      g.box(0, 0, -1, 0, 0, 1, WOOD);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.set(Math.round(Math.cos(a) * 3), Math.round(Math.sin(a) * 3), 3, i % 3 ? WOOD : p.metal); }
      for (let i = 0; i < 12; i += 3) { const a = i * Math.PI / 6 + 0.3; g.set(Math.round(Math.cos(a) * 3.6), Math.round(Math.sin(a) * 3.6), 3, p.accent); }
      g.ell(0, 0, 3, 2, 2, 0, BONE); g.set(0, 0, 4, p.gem);
    },
    leg(g, p, o) {
      g.box(-1, -9, -1, 1, 0, 1, p.cloth); g.box(-1, -3, -1, 1, -3, 1, p.second);
      g.box(-1, -11, -1, 1, -10, 2, p.main); g.box(0, -11, 3, 0, -10, 3, p.main); g.set(0, -9, 4, p.main); g.set(0, -9, 4, p.accent);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- the SUMMONER's imp */
  const IMPS = new Map();
  function imp(line, r) {
    const k = line + ':' + r;
    if (!IMPS.has(k)) {
      const p = palette(line, r), g = new VX.Grid(); g.jit = 0.04;
      const body = p.second, dark = shade(body & 0xffffff, 0.68), belly = mix(body & 0xffffff, 0xffffff, 0.35);
      g.ell(0, 4, 0, 2.2, 2.6, 2, body); g.box(-1, 2, 2, 1, 4, 2, belly);
      g.setM(1, 5, 2, G(p.glow)); g.box(-1, 3, 3, 1, 3, 3, dark); g.setM(1, 3, 3, BONE);                 // eyes and a fanged grin
      g.setM(2, 7, 0, p.accent); g.setM(2, 8, -1, p.accent); g.setM(3, 8, -2, p.accent);                  // horns
      g.boxM(1, 0, 0, 1, 1, 1, dark); g.boxM(3, 3, 1, 3, 4, 1, dark); g.setM(3, 2, 2, dark);              // feet and little arms
      g.boxM(3, 5, -2, 4, 6, -2, p.main); g.setM(5, 7, -2, p.main);                                       // wings
      g.set(0, 2, -3, dark); g.set(0, 2, -4, dark); g.set(0, 3, -5, G(p.glow));                            // a tail with a spark on the end
      IMPS.set(k, VX.object(g, 0.078));
    }
    return IMPS.get(k).clone();
  }

  /* -------------------------------------------------------- geometry cache */
  const GEO = new Map();
  function geo(line, piece, r, draw, pk, tint) {
    const k = line + ':' + piece + ':' + r + ':' + (pk | 0) + (tint ? 't' : '');
    if (GEO.has(k)) return GEO.get(k);
    const g = new VX.Grid(); g.jit = 0.035; draw(g, palette(line, r, pk, tint));
    const out = VX.meshGrid(g, S); GEO.set(k, out); return out;
  }
  let plastic = null;
  const plasticMat = () => plastic || (plastic = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 38, specular: 0x2a2a2a }));

  function meshes(grp, G, mat) {
    if (G.lit) { const m = new THREE.Mesh(G.lit, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m); }
    if (G.glow) grp.add(new THREE.Mesh(G.glow, VX.glowMat()));
  }

  /* which slot owns each group of the skeleton */
  const OWNER = { hips: 'core', torso: 'core', head: 'head', armL: 'armL', armR: 'armR', wL: 'armL', wR: 'armR', legL: 'legs', legR: 'legs' };
  const LAYOUT = {
    hips: { parent: null, at: [0, 12.5, 0] }, torso: { parent: 'hips', at: [0, 1, 0] }, head: { parent: 'torso', at: [0, 9.5, 0] },
    armL: { parent: 'torso', at: [6, 7.5, 0] }, armR: { parent: 'torso', at: [-6, 7.5, 0] },
    wL: { parent: 'armL', at: [0, -8.5, 0] }, wR: { parent: 'armR', at: [0, -8.5, 0] },
    legL: { parent: 'hips', at: [2, -1, 0] }, legR: { parent: 'hips', at: [-2, -1, 0] },
  };
  /* a whole figure from a build: { root, parts, mat, socket(), detach(), reattach(), flash() } */
  function figure(build) {
    const mat = plasticMat().clone(); mat.emissive = new THREE.Color(0, 0, 0);
    const root = new THREE.Group(), parts = {}, pk = build.paint | 0, tn = !!build.tint;
    for (const name in LAYOUT) {
      const slot = OWNER[name], it = build[slot], line = it.line, r = it.r || 0, d = D[line];
      const grp = new THREE.Group(); grp.name = name;
      let G;
      if (name === 'hips') G = geo(line, 'hips', r, d.hips, pk, tn);
      else if (name === 'torso') G = geo(line, 'torso', r, d.torso, pk, tn);
      else if (name === 'head') G = geo(line, 'head', r, d.head, pk, tn);
      else if (name === 'armL') G = geo(line, 'armL', r, (g, p) => d.arm(g, p, 1), pk, tn);
      else if (name === 'armR') G = geo(line, 'armR', r, (g, p) => d.arm(g, p, -1), pk, tn);
      else if (name === 'wL') G = geo(line, 'wL', r, d.wL, pk, tn);
      else if (name === 'wR') G = geo(line, 'wR', r, d.wR, pk, tn);
      else if (name === 'legL') G = geo(line, 'legL', r, (g, p) => d.leg(g, p, 1), pk, tn);
      else if (name === 'legR') G = geo(line, 'legR', r, (g, p) => d.leg(g, p, -1), pk, tn);
      meshes(grp, G, mat);
      parts[name] = grp;
    }
    const rest = {};
    for (const name in LAYOUT) {
      const L = LAYOUT[name], grp = parts[name];
      grp.position.set(L.at[0] * S, L.at[1] * S, L.at[2] * S);
      rest[name] = grp.position.clone();
      (L.parent ? parts[L.parent] : root).add(grp);
    }
    const F = { root, parts, rest, mat, build, scale: S, height: 31 * S, detached: {} };
    const _v = new THREE.Vector3();
    F.socket = (name, off, target) => {
      const p = parts[name] || root, v = target || new THREE.Vector3();
      v.set((off ? off[0] : 0) * S, (off ? off[1] : 0) * S, (off ? off[2] : 0) * S);
      p.updateWorldMatrix(true, false); return p.localToWorld(v);
    };
    /* pull a limb off (for a part break): returns the group, now in world space */
    F.detach = (name, scene) => {
      const grp = parts[name]; if (!grp || F.detached[name]) return null;
      grp.updateWorldMatrix(true, false);
      const m = grp.matrixWorld.clone(); grp.parent.remove(grp);
      m.decompose(grp.position, grp.quaternion, grp.scale); grp.scale.setScalar(1);
      scene.add(grp); F.detached[name] = true; return grp;
    };
    F.reattach = name => {
      const grp = parts[name]; if (!grp || !F.detached[name]) return;
      if (grp.parent) grp.parent.remove(grp);
      grp.position.copy(rest[name]); grp.quaternion.identity();
      parts[LAYOUT[name].parent].add(grp); F.detached[name] = false;
    };
    /* wear a part that came off another figure: it takes this figure's plastic, so it flashes with it */
    F.own = Object.assign({}, parts);
    const SUBP = { armL: 'wL', armR: 'wR' }, paint = (grp, m) => grp.traverse(o => { if (o.isMesh && o.material !== VX.glowMat()) o.material = m; });
    F.adopt = (name, grp) => {
      if (grp.parent) grp.parent.remove(grp);
      parts[name] = grp; if (SUBP[name]) parts[SUBP[name]] = grp.getObjectByName(SUBP[name]) || parts[SUBP[name]];
      grp.position.copy(rest[name]); grp.quaternion.identity(); grp.scale.setScalar(1); paint(grp, mat);
      parts[LAYOUT[name].parent].add(grp); F.detached[name] = false;
    };
    /* a new round: every figure takes its own parts back (reattach then puts them on) */
    F.restore = () => {
      for (const name of ['head', 'armL', 'armR']) {
        const own = F.own[name], cur = parts[name];
        if (cur !== own) { if (cur.parent === parts[LAYOUT[name].parent]) cur.parent.remove(cur); parts[name] = own; if (SUBP[name]) parts[SUBP[name]] = F.own[SUBP[name]]; F.detached[name] = true; }
        paint(own, mat);
      }
    };
    F.dispose = () => { mat.dispose(); if (root.parent) root.parent.remove(root); for (const n in F.detached) if (F.detached[n] && parts[n].parent) parts[n].parent.remove(parts[n]); };
    return F;
  }

  /* a turntable display stand (menus) */
  function stand(color) {
    const g = new VX.Grid();
    g.cyl('y', 0, 0, 9, -2, -1, (x, y, z) => Math.hypot(x, z) > 8.2 ? (color || 0xe0343f) : 0x23232c);
    g.cyl('y', 0, 0, 7, 0, 0, 0x2e2e38);
    return VX.object(g, S);
  }

  /* ------------------------------------------------- a part on its own --
     For icons, the capsule reveal and the shelf. Centred on the origin. */
  function partGroup(line, slot, r) {
    const d = D[line], grp = new THREE.Group(), mat = plasticMat();
    if (slot === 'card') {
      const tex = new THREE.CanvasTexture(cardCanvas(line, r));
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.26, 0.03), [0, 0, 0, 0, 0, 0].map((_, i) => i === 4 ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : new THREE.MeshLambertMaterial({ color: 0xf4f0e6 })));
      grp.add(box); return grp;
    }
    const add = (piece, draw, pos) => { const G = geo(line, piece, r, draw); const s = new THREE.Group(); meshes(s, G, mat); if (pos) s.position.set(pos[0] * S, pos[1] * S, pos[2] * S); grp.add(s); };
    if (slot === 'head') add('head', d.head);
    else if (slot === 'core') { add('torso', d.torso); add('hips', d.hips, [0, -1, 0]); }
    else if (slot === 'armR') { add('armR', (g, p) => d.arm(g, p, -1)); add('wR', d.wR, [0, -8.5, 0]); }
    else if (slot === 'armL') { add('armL', (g, p) => d.arm(g, p, 1)); add('wL', d.wL, [0, -8.5, 0]); }
    else if (slot === 'legs') { add('legL', (g, p) => d.leg(g, p, 1), [2, 0, 0]); add('legR', (g, p) => d.leg(g, p, -1), [-2, 0, 0]); }
    const box = new THREE.Box3().setFromObject(grp), c = box.getCenter(new THREE.Vector3());
    grp.children.forEach(ch => ch.position.sub(c));
    grp.userData.size = box.getSize(new THREE.Vector3());
    return grp;
  }

  /* --------------------------------------------------------------- icons --
     A part rendered to a little PNG (gacha results, the shelf, the workshop). */
  let iconR = null, iconScene, iconCam;
  const ICONS = new Map();
  function iconRender(grp, slot) {
    if (!iconR) {
      iconR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); iconR.setPixelRatio(1); iconR.setSize(192, 192);
      iconScene = new THREE.Scene(); iconCam = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
      iconScene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 0.95)); const dl = new THREE.DirectionalLight(0xffffff, 0.65); dl.position.set(2, 3, 4); iconScene.add(dl);
    }
    const sz = grp.userData.size || new THREE.Vector3(1, 1, 1);
    const R = Math.max(sz.x, sz.y, sz.z) * 0.6;
    grp.rotation.y = slot === 'armR' ? -0.9 : slot === 'armL' ? 0.9 : slot === 'fig' ? 0.4 : 0.55;
    iconScene.add(grp);
    const dist = R / Math.tan(14 * Math.PI / 180);
    iconCam.position.set(dist * 0.25, dist * 0.22, dist); iconCam.lookAt(0, 0, 0);
    iconR.setClearColor(0x000000, 0); iconR.render(iconScene, iconCam);
    iconScene.remove(grp);
    return iconR.domElement;
  }
  function icon(line, slot, r) {
    const k = line + ':' + slot + ':' + r; if (ICONS.has(k)) return ICONS.get(k);
    if (slot === 'card') { const u = cardCanvas(line, r).toDataURL('image/png'); ICONS.set(k, u); return u; }
    const url = iconRender(partGroup(line, slot, r), slot).toDataURL('image/png');
    ICONS.set(k, url); return url;
  }

  /* a whole figure in its ready stance, as a PNG (blister packs, select screens) */
  const FIGS = new Map();
  function figIcon(build) {
    const k = KB.SLOTS.map(s => build[s].line + build[s].r).join('|') + '|' + (build.paint | 0) + (build.tint ? 't' : ''); if (FIGS.has(k)) return FIGS.get(k);
    const F = figure(build); Anim.set(F, Anim.readyFor(build)); F.parts.wL.visible = !KB.PARTS[build.armL.line].armL.holster;
    const grp = new THREE.Group(); grp.add(F.root);
    const box = new THREE.Box3().setFromObject(F.root), c = box.getCenter(new THREE.Vector3());
    F.root.position.sub(c); grp.userData.size = box.getSize(new THREE.Vector3()).multiplyScalar(0.92);
    const url = iconRender(grp, 'fig').toDataURL('image/png'); F.dispose(); FIGS.set(k, url); return url;
  }

  /* ------------------------------------------------------- Legend Cards --
     The trading card packed in with every figure. Drawn on a canvas. */
  const CARDS = new Map();
  function cardCanvas(line, r) {
    const k = line + ':' + r; if (CARDS.has(k)) return CARDS.get(k);
    const L = KB.LINES[line], P = KB.PARTS[line].card, RR = KB.RARITY[r];
    const c = document.createElement('canvas'); c.width = 256; c.height = 360; const g = c.getContext('2d');
    const frame = ['#d8dde4', '#7fd6ff', '#ffd25a', '#ff6ae0'][r];
    g.fillStyle = frame; g.fillRect(0, 0, 256, 360);
    if (r >= 2) { const gr = g.createLinearGradient(0, 0, 256, 360); (r === 3 ? ['#ff6ae0', '#7cf9ff', '#fff27a', '#ff6ae0'] : ['#fff1a8', '#c8901e', '#fff1a8', '#a87010']).forEach((col, i, a) => gr.addColorStop(i / (a.length - 1), col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 360); }
    g.fillStyle = '#15131c'; g.fillRect(10, 10, 236, 340);
    const bg = g.createLinearGradient(0, 40, 0, 230); bg.addColorStop(0, L.css); bg.addColorStop(1, '#15131c'); g.fillStyle = bg; g.fillRect(16, 40, 224, 190);
    // a halftone burst behind the head
    g.save(); g.translate(128, 140); g.globalAlpha = 0.25; g.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, -130); g.lineTo(10, -130); g.fill(); }
    g.restore();
    try { const im = iconRender(partGroup(line, 'head', r), 'head'); g.drawImage(im, 38, 46, 180, 180); } catch (e) { /* no GL */ }
    g.fillStyle = '#fff'; g.font = 'bold 13px Rubik, sans-serif'; g.textAlign = 'left'; g.fillText('LEGEND CARD', 18, 30);
    g.textAlign = 'right'; g.fillStyle = frame; g.fillText('★'.repeat(RR.stars), 238, 30);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '700 26px "Bebas Neue", Impact, sans-serif'; g.fillText(L.name, 128, 256);
    g.font = '600 15px Rubik, sans-serif'; g.fillStyle = frame; g.fillText(P.name, 128, 280);
    g.font = '12px Rubik, sans-serif'; g.fillStyle = '#cfd3dc'; g.fillText('ART: ' + KB.MOVES[P.super].name, 128, 304);
    g.fillText(KB.PASSIVE[P.passive].split(':')[0], 128, 322);
    g.font = 'bold 10px Rubik, sans-serif'; g.fillStyle = '#7a7f8c'; g.fillText('KNOCK//BACK · ' + RR.name, 128, 342);
    if (r === 3) { g.globalCompositeOperation = 'overlay'; const h = g.createLinearGradient(0, 0, 256, 360); ['#ff00cc', '#00ffee', '#ffee00', '#ff00cc'].forEach((col, i) => h.addColorStop(i / 3, col)); g.globalAlpha = 0.35; g.fillStyle = h; g.fillRect(10, 10, 236, 340); }
    CARDS.set(k, c); return c;
  }

  window.Models = { S, D, palette, imp, figure, stand, icon, figIcon, partGroup, cardCanvas, shade, mix, LAYOUT, OWNER, PAINTS, looksAlike, swatch };
})();
