/* ============================================================================
   edo_look.js -- how the EDO JAPAN figures look and stand (models.js explains
   D[line]; anim.js a pose): the Ronin, the Kunoichi, the Shogun, the Daimyo.
   ========================================================================== */
(function () {
  'use strict';
  const { D, H } = Models;
  const { elbow, knee, hand, eyes, shade, G, WOOD, WOOD2, LEATHER, WHITE } = H;
  const HAIR = 0x16121a, STRAW = 0xd0a858;
  const lace = (a, b) => (x, y) => (y & 1 ? a : b);

  /* ----------------------------------------------------------------- RONIN */
  D.ronin = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      for (const [x, y] of [[-2, 0], [0, 0], [2, 0], [-1, 1], [1, 1]]) g.set(x, y, 3, shade(p.skin, 0.72));      // stubble
      g.box(-3, 4, -3, 3, 5, -3, HAIR); g.box(-3, 5, -3, 3, 5, 2, HAIR); g.box(-1, 1, -4, 1, 4, -4, HAIR);       // hair, tied back
      // the straw kasa: a wide shallow cone of woven straw
      for (let y = 6; y <= 9; y++) { const r = 7 - (y - 6) * 2.1; g.ell(0, y, 0, r, 0.55, r, (x, yy, z) => ((x + z) & 1 ? STRAW : shade(STRAW, 0.85))); }
      g.set(0, 10, 0, shade(STRAW, 0.75)); g.boxM(3, 1, 1, 3, 5, 1, shade(p.cloth, 0.8));                          // the chin cord
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main);
      for (let y = 3; y <= 8; y++) { const x = Math.round((8 - y) * 0.55); g.set(-x, y, 2, p.second); g.set(x, y, 2, p.second); }  // the crossed collar
      g.box(-1, 4, 2, 1, 7, 2, p.skin);
      g.box(-4, 0, -2, 4, 1, 2, p.cloth); g.box(-4, 0, 3, -2, 1, 3, p.accent);                                       // the obi, the saya's cord
      for (const [x, y, z] of [[3, 5, 2], [-3, 2, -2], [2, 6, -2]]) g.set(x, y, z, shade(p.main, 1.3));              // patches
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-3, -1, -2, 3, 0, 2, p.second); g.box(-4, -3, -3, 4, -2, 3, p.second);
      g.ell(-5, -2, 1, 1.2, 1.6, 1.2, 0xd8b878); g.set(-5, 0, 1, 0x7a4a2a);                                          // the sake gourd at his hip
    },
    arm(g, p, o) {
      g.box(-2, -4, -2, 2, 0, 2, p.main); g.box(-2, -4, -2, 2, -4, 2, shade(p.main, 0.8));                         // wide kimono sleeve
      g.box(-1, -7, -1, 1, -5, 1, p.skin); g.box(-1, -6, -1, 1, -6, 1, shade(p.cloth, 0.9));
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      for (let z = -3; z <= 2; z++) g.set(0, 0, z, z % 2 ? 0x3a2a1a : 0x6a4a2a);                                  // a worn, dark grip
      g.box(-1, -1, 3, 1, 1, 3, p.dark);                                                                             // a plain iron tsuba
      for (let z = 4; z <= 15; z++) { const y = z >= 12 ? 1 : 0; g.set(0, y, z, p.metal); if (z < 14) g.set(0, y + 1, z, shade(p.metal, 0.8)); }
      g.set(0, 1, 9, shade(p.metal, 0.6));                                                                           // a nick in the edge
    },
    wL(g, p) { g.box(0, -1, -2, 0, 0, 13, p.dark); g.box(0, -1, -2, 0, 0, -2, p.accent); g.box(0, -1, 13, 0, 0, 13, 0x6a4a2a); },   // the saya
    leg(g, p, o) {
      g.box(-2, -7, -2, 1, 0, 2, p.second); g.box(o * 2, -7, -2, o * 2, -3, 2, p.second);                          // hakama
      g.box(-1, -9, -1, 1, -8, 1, p.cloth); g.box(-1, -10, -1, 1, -10, 1, p.skin);                                   // kyahan, ankle
      g.box(-1, -11, -1, 1, -11, 2, STRAW); g.set(0, -10, 2, shade(STRAW, 0.7));                                     // waraji
      knee(g, p, o);
    },
  };

  /* -------------------------------------------------------------- KUNOICHI */
  D.kunoichi = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 0, 3, 3, 2, 3, p.second); g.box(-3, 0, -3, -3, 2, 3, p.second); g.box(3, 0, -3, 3, 2, 3, p.second);   // the half mask
      g.box(-3, 4, -3, 3, 6, 3, HAIR); g.box(-3, 1, -3, 3, 3, -3, HAIR); g.ell(0, 7, -2, 2, 1.6, 1.6, HAIR);          // hair, up in a bun
      g.box(-4, 7, -2, 4, 7, -2, p.accent); g.set(-4, 8, -2, G(p.glow)); g.set(4, 8, -2, G(p.glow));                   // kanzashi through the bun
      g.set(3, 6, 1, 0xff9ad0); g.set(3, 7, 1, 0xff6ab0);                                                                  // an iris
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main);
      for (let y = 4; y <= 8; y++) { const x = Math.round((8 - y) * 0.5); g.set(-x, y, 2, p.second); g.set(x, y, 2, p.second); }
      g.box(-4, 1, -2, 4, 3, 2, p.second); g.box(-1, 2, 3, 1, 2, 3, p.accent); g.box(-2, 1, -3, 2, 3, -3, p.accent);   // the obi, its bow behind
      for (const [x, y] of [[-3, 6], [2, 5], [-2, 4]]) g.set(x, y, 2, shade(p.glow, 0.8));                               // irises on the silk
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.main); g.box(-4, -3, -2, 4, -2, 2, p.main); g.box(-4, -3, -2, 4, -3, 2, p.second); },
    arm(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, p.main); g.box(-2, -4, -1, 2, -3, 1, shade(p.main, 0.85));
      g.box(-1, -7, -1, 1, -5, 1, p.second); g.set(0, -6, 1, p.accent);                                                // tekko, a dark wrap
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      // the tessen, opened: iron ribs and dark paper in a half circle
      for (let x = -7; x <= 7; x++) for (let z = 1; z <= 8; z++) { const r = Math.hypot(x, z); if (r > 8 || z < Math.abs(x) * 0.35) continue; const a = Math.atan2(x, z); g.set(x, 0, z, Math.abs(Math.sin(a * 6)) < 0.25 || r > 7.2 ? p.metal : p.second); }
      g.box(0, 0, -1, 0, 0, 1, p.dark); g.set(0, 1, 0, p.accent);
      for (const [x, z] of [[-3, 5], [2, 6], [0, 4]]) g.set(x, 0, z, shade(p.glow, 0.85));
    },
    wL(g, p) { g.box(0, 0, 0, 0, 0, 5, p.metal); g.set(0, 0, -1, 0xff6ab0); g.set(0, 1, -1, p.accent); },   // a hairpin between the fingers
    leg(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, p.second); g.box(-1, -9, -1, 1, -6, 1, p.cloth);
      g.box(-1, -8, 1, 1, -7, 1, p.accent);
      g.box(-1, -11, -1, 1, -10, 2, p.dark); g.set(0, -11, 2, shade(p.dark, 1.4));                                       // split-toe tabi
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- SHOGUN */
  D.shogun = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 0, 3, 3, 2, 4, p.dark); g.box(-2, 1, 5, 2, 1, 5, 0xe8e8e8); g.set(0, 2, 5, p.dark);                    // the iron menpō, a white moustache
      g.box(-4, 5, -4, 4, 7, 4, p.main); g.box(-3, 8, -3, 3, 8, 3, p.main); g.box(-4, 5, 4, 4, 5, 5, p.accent);         // the kabuto, its brim
      for (let y = 1; y <= 5; y++) g.box(-5, y, -5, 5, y, -4, y % 2 ? p.main : p.second);                               // shikoro, laced
      g.boxM(5, 1, -4, 5, 5, 0, lace(p.second, p.main));
      // the kuwagata: two great gilt horns, and the clan's crest between them
      [[1, 7, 6], [2, 8, 6], [3, 9, 6], [4, 10, 6], [4, 11, 6], [5, 12, 6], [5, 13, 6]].forEach(([x, y, z]) => g.setM(x, y, z, p.accent));
      g.ell(0, 7, 6, 1.2, 1.2, 0.5, G(p.glow));
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main);
      for (let y = 0; y <= 6; y += 2) { g.box(-4, y, 3, 4, y, 3, p.second); g.box(-4, y, -3, 4, y, -3, p.second); }     // crimson lacing on black lacquer
      g.box(-4, 7, 3, 4, 8, 3, p.main); g.ell(0, 4, 3, 1.4, 1.4, 0.5, p.accent);                                        // the gold mon
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-3, -1, -2, 3, 0, 2, p.cloth);
      for (const [x0, x1] of [[-5, -1], [1, 5]]) { g.box(x0, -6, 3, x1, -1, 3, lace(p.main, p.second)); g.box(x0, -6, -3, x1, -1, -3, lace(p.main, p.second)); }
      g.boxM(5, -5, -2, 5, -1, 2, lace(p.main, p.second));
    },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.cloth);
      g.box(o * 3, -5, -3, o * 2, 2, 3, lace(p.main, p.second)); g.box(o * 3, 2, -3, o * 2, 2, 3, p.accent);           // the great sode
      g.box(-1, -7, -1, 1, -5, 1, p.dark); g.set(0, -6, 2, p.accent); g.set(o, -6, 1, p.metal);
      hand(g, p.dark); elbow(g, p, o);
    },
    wR(g, p) {
      for (let z = -3; z <= 2; z++) g.set(0, 0, z, z % 2 ? p.dark : WHITE);
      g.box(-1, -1, 3, 1, 1, 3, p.accent);
      for (let z = 4; z <= 17; z++) { const y = Math.round(Math.pow((z - 4) / 13, 2) * 2); g.set(0, y, z, p.metal); if (z < 16) g.set(0, y + 1, z, shade(p.metal, 0.8)); }   // a long, deep-curved tachi
    },
    wL(g, p) {
      g.box(0, 0, -2, 0, 0, 4, WOOD2); g.set(0, 0, -3, p.accent);                                                          // the gunbai's handle
      g.ell(0, 0, 8, 3.6, 0.5, 3.8, p.accent); g.ell(0, 0, 8, 2, 0.6, 2, p.second); g.set(0, 1, 8, G(p.glow));           // gold, with a red sun
    },
    leg(g, p, o) {
      g.box(-2, -6, -2, 1, 0, 2, p.cloth); g.box(-2, -5, 3, 1, -1, 3, lace(p.main, p.second));                          // haidate
      g.box(-1, -10, -1, 1, -7, 1, p.main); g.box(-1, -9, 2, 1, -7, 2, p.accent);                                         // suneate
      g.box(-1, -11, -1, 1, -11, 2, p.dark);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- DAIMYO */
  D.daimyo = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.boxM(2, 1, 3, 2, 1, 3, shade(p.skin, 0.9));
      g.box(-3, 1, -4, 3, 4, -3, HAIR); for (let y = -6; y <= 1; y++) g.box(-2, y, -4, 2, y, -4, HAIR);                    // long hair down her back
      g.box(-4, 5, -4, 4, 6, 4, p.main); g.box(-3, 7, -3, 3, 7, 3, p.main); g.box(-4, 5, 4, 4, 5, 5, p.second);          // the kabuto
      for (let y = 2; y <= 5; y++) g.boxM(4, y, -3, 4, y, 0, lace(p.main, p.second));
      g.ell(0, 9, 5, 2.4, 2.4, 0.5, p.accent); g.ell(0, 9, 5, 1.2, 1.2, 0.6, G(p.glow));                                  // the maedate: a golden sun
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main);
      for (let y = 0; y <= 7; y++) { g.box(-4, y, 3, 4, y, 3, y % 2 ? p.second : p.main); }                               // white and blue odoshi lacing
      g.box(-2, 5, 4, 2, 6, 4, p.accent); g.set(0, 7, 4, p.accent);                                                         // the clan mon
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-3, -1, -2, 3, 0, 2, p.cloth);
      for (const [x0, x1] of [[-4, -1], [1, 4]]) { g.box(x0, -5, 3, x1, -1, 3, lace(p.second, p.main)); g.box(x0, -5, -3, x1, -1, -3, lace(p.second, p.main)); }
    },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.cloth);
      g.box(o * 2, -4, -2, o * 2, 1, 2, lace(p.main, p.second)); g.box(-1, 1, -2, 1, 1, 2, p.main);
      g.box(-1, -7, -1, 1, -5, 1, p.dark); g.set(0, -6, 2, p.metal);
      hand(g, p.dark); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -8, 0, 0, 13, 0x2a1a14); g.set(0, 0, -9, p.accent);                                                      // the lacquered shaft
      for (const z of [-5, 0, 5, 10]) g.set(0, 1, z, p.accent);
      g.box(-1, -1, 14, 1, 1, 14, p.accent);
      for (let z = 15; z <= 22; z++) { const y = Math.round(Math.pow((z - 15) / 7, 2) * 3); g.set(0, y, z, p.metal); g.set(0, y + 1, z, shade(p.metal, 0.82)); }   // the curved blade
    },
    wL(g, p) { /* the free hand joins the right on the shaft */ },
    leg(g, p, o) {
      g.box(-2, -6, -2, 1, 0, 2, p.cloth); g.box(-2, -5, 3, 1, -1, 3, lace(p.second, p.main));
      g.box(-1, -10, -1, 1, -7, 1, p.main); g.box(-1, -9, 2, 1, -7, 2, p.metal);
      g.box(-1, -11, -1, 1, -11, 2, STRAW);
      knee(g, p, o);
    },
  };

  /* ------------------------------------------------------------ the stances */
  Object.assign(Anim.READY, {
    ronin: { torso: [0.12, 0.45, 0], head: [0.05, -0.4, 0], armR: [-0.95, 0.2, -0.3], wR: [0.55, 0, 0], armL: [-0.7, -0.2, 0.55], wL: [1.3, 0, 0], legL: [-0.4, 0, 0.15], legR: [0.35, 0, -0.15], hy: -1.0 },
    kunoichi: { torso: [0.15, 0.35, 0], head: [0, -0.3, 0], armR: [-1.4, 0.2, -0.5], wR: [0.6, 0, 0], armL: [-0.5, 0, 0.6], wL: [0, 0, 0], legL: [-0.45, 0, 0.2], legR: [0.4, 0, -0.2], hy: -1.4 },
    shogun: { torso: [0.05, 0.2, 0], head: [0, -0.15, 0], armR: [-0.9, 0.2, -0.3], wR: [0.9, 0, 0], armL: [-1.3, -0.2, 0.3], wL: [0.4, 0, 0], legL: [-0.3, 0, 0.25], legR: [0.3, 0, -0.25], hy: -0.9 },
    daimyo: { torso: [0.1, 0.5, 0], head: [0, -0.45, 0], armR: [-1.1, 0.2, -0.2], wR: [1.0, 0, 0], armL: [-1.3, 0, 0.6], wL: [0, 0, 0], legL: [-0.5, 0, 0.2], legR: [0.4, 0, -0.2], hy: -1.1 },
  });
  /* ------------------------------------------------------------- the poses */
  Object.assign(Anim.P, {
    drink: { wind: { armL: [-2.4, 0, 0.5], head: [-0.2, 0, 0] }, strike: { armL: [-2.7, 0, 0.3], head: [-0.6, 0, 0], torso: [-0.15, 0, 0] } },
  });
})();
