/* ============================================================================
   realm_look.js -- how the KNIGHTS OF THE REALM newcomers look and stand: the
   Templar, the Crusader, and the Lancer on horseback. The Lancer's horse is his
   legs part (Bramble the warhorse), drawn whole in the left leg so it moves as
   one; a figure that wears it rides (Fighter.animate keeps the horse level).
   ========================================================================== */
(function () {
  'use strict';
  const { D, H } = Models;
  const { elbow, knee, hand, eyes, shade, G, WOOD, WOOD2, LEATHER, WHITE } = H;
  const MAIL = 0x8a8e98;
  const mail = c => (x, y, z) => ((x + y + z) & 1 ? c : shade(c, 0.82));

  /* --------------------------------------------------------------- TEMPLAR */
  D.templar = {
    head(g, p) {
      // the great helm: a flat-topped barrel, a slit for the eyes, the cross below it
      g.box(-4, 0, -4, 4, 7, 4, p.metal); g.box(-3, 8, -3, 3, 8, 3, p.metal);
      g.box(-3, 4, 4, 3, 4, 4, p.dark); g.box(0, 0, 4, 0, 3, 4, p.second); g.box(-2, 2, 4, 2, 2, 4, p.second);
      for (const [x, y] of [[-3, 1], [-2, 1], [2, 1], [3, 1]]) g.set(x, y, 4, shade(p.metal, 0.6));
      g.box(-4, 0, -4, 4, 0, 4, shade(p.metal, 0.75));
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-4, 6, -2, 4, 8, 2, mail(MAIL));
      g.box(-1, 1, 3, 1, 7, 3, p.second); g.box(-3, 5, 3, 3, 5, 3, p.second);                                           // the red cross
      g.box(-1, 2, -3, 1, 6, -3, p.second); g.box(-2, 4, -3, 2, 4, -3, p.second);
      g.box(-4, 0, 3, 4, 0, 3, LEATHER); g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, LEATHER); g.box(-4, -5, -3, 4, -2, 3, p.main); g.box(-4, -5, -3, 4, -5, 3, shade(p.main, 0.85)); g.box(-1, -5, 3, 1, -2, 3, p.second); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, mail(MAIL)); g.box(-1, 0, -2, 1, 1, 2, mail(MAIL));
      g.box(-1, -7, -1, 1, -5, 1, mail(MAIL)); g.box(-1, -5, -1, 1, -5, 1, p.metal);
      hand(g, mail(MAIL)); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -5, 0, 0, -5, p.metal); for (let z = -4; z <= 1; z++) g.set(0, 0, z, LEATHER);                          // pommel, a long grip
      g.box(-3, 0, 2, 3, 0, 2, p.metal); g.set(-3, 1, 2, p.metal); g.set(3, 1, 2, p.metal);                              // the cross-guard
      for (let z = 3; z <= 21; z++) { g.set(0, 0, z, p.metal); g.set(0, 1, z, shade(p.metal, 0.8)); if (z < 19) g.set(0, -1, z, shade(p.metal, 0.9)); }
    },
    wL(g, p) { /* the free hand joins the right on the long grip */ },
    leg(g, p, o) {
      g.box(-1, -10, -1, 1, 0, 1, mail(MAIL)); g.box(-1, -6, 2, 1, -4, 2, p.metal); g.set(0, -5, 3, p.metal);           // mail, a knee cop
      g.box(-1, -11, -1, 1, -11, 2, p.dark);
      knee(g, p, o);
    },
  };

  /* -------------------------------------------------------------- CRUSADER */
  D.crusader = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-4, 0, -4, 4, 4, -3, mail(MAIL)); g.boxM(4, 0, -3, 4, 4, 2, mail(MAIL)); g.box(-3, 0, 3, 3, 0, 3, mail(MAIL));   // the mail coif
      g.box(-4, 5, -4, 4, 7, 4, p.metal); g.box(-3, 8, -3, 3, 8, 3, p.metal); g.box(0, 1, 4, 0, 5, 4, p.metal);          // a nasal helm
      g.box(-4, 5, -4, 4, 5, 4, shade(p.metal, 0.75));
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, mail(p.main));
      g.box(-3, 0, 3, 3, 7, 3, p.second); g.box(-1, 1, 4, 1, 6, 4, p.accent); g.box(-3, 4, 4, 3, 4, 4, p.accent);       // the surcoat, its cross
      g.box(-3, 0, -3, 3, 7, -3, p.second);
      g.box(-4, 0, 3, 4, 0, 3, LEATHER); g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, LEATHER); g.box(-4, -6, -3, 4, -2, 3, mail(p.main)); g.box(-3, -6, 4, 3, -2, 4, p.second); g.box(-1, -5, 5, 1, -2, 5, p.accent); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, mail(p.main)); g.box(-1, 0, -2, 1, 1, 2, mail(p.main));
      g.box(-1, -7, -1, 1, -5, 1, mail(p.main));
      hand(g, LEATHER); elbow(g, p, o);
    },
    wR(g, p) {
      for (let z = -2; z <= 4; z++) g.set(0, 0, z, z === -2 ? p.metal : WOOD2);                                          // the haft
      for (let z = 5; z <= 8; z++) g.set(0, z & 1 ? 0 : 1, z, p.dark);                                                   // the chain
      g.ell(0, 0, 11, 2, 2, 2, p.metal);                                                                                  // the morning star
      for (const [x, y, z] of [[3, 0, 11], [-3, 0, 11], [0, 3, 11], [0, -3, 11], [0, 0, 14], [2, 2, 12], [-2, -2, 10], [2, -2, 12], [-2, 2, 10]]) g.set(x, y, z, shade(p.metal, 1.15));
    },
    wL(g, p) {
      // the heater shield: a flat top, the sides curving to a point, the cross
      g.box(0, 0, -1, 0, 0, 1, LEATHER);
      for (let y = -4; y <= 7; y++) { const w = y >= 2 ? 4 : Math.max(0, Math.round(4 - (2 - y) * 0.7)); for (let x = -w; x <= w; x++) g.set(x, y + 1, 2, Math.abs(x) === w || y === 7 ? p.metal : p.second); }
      g.box(0, -2, 3, 0, 7, 3, p.accent); g.box(-3, 5, 3, 3, 5, 3, p.accent);
    },
    leg(g, p, o) {
      g.box(-1, -10, -1, 1, 0, 1, mail(p.main)); g.box(-1, -6, 2, 1, -4, 2, p.metal);
      g.box(-1, -11, -1, 1, -11, 2, p.dark); g.set(0, -10, -2, p.accent); g.set(0, -10, -3, p.accent);                   // spurs
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- LANCER */
  D.lancer = {
    head(g, p) {
      // a jousting helm: the frog-mouth, a sight slit, the plume
      g.box(-4, 0, -4, 4, 6, 4, p.metal); g.box(-3, 7, -3, 3, 7, 3, p.metal);
      g.box(-3, 5, 4, 3, 5, 5, p.dark); g.box(-4, 0, 4, 4, 4, 5, shade(p.metal, 0.9)); g.box(-4, 6, 4, 4, 6, 5, p.metal);
      for (let i = 0; i < 6; i++) { g.set(0, 8 + Math.min(i, 3), -1 - i, i & 1 ? p.second : p.main); g.set(1, 8 + Math.min(i, 2), -1 - i, p.main); }
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.metal); g.box(-4, 0, 3, 0, 6, 3, p.main); g.box(1, 0, 3, 4, 6, 3, p.second);         // tournament plate, a tabard in two colours
      g.box(-4, 0, -3, 0, 6, -3, p.second); g.box(1, 0, -3, 4, 6, -3, p.main);
      g.box(-2, 7, 3, 2, 8, 3, p.metal); g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.metal); g.box(-4, -3, -3, 4, -2, 3, shade(p.metal, 0.85)); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.metal); g.box(-2, -1, -2, 2, 1, 2, o === 1 ? p.main : p.metal);                   // the pauldrons (the shield side in colour)
      g.box(-1, -7, -1, 1, -5, 1, p.metal);
      hand(g, shade(p.metal, 0.8)); elbow(g, p, o);
    },
    wR(g, p) {
      g.ell(0, 0, 2, 2.4, 2.4, 1, p.metal);                                                                               // the vamplate
      for (let z = -4; z <= 26; z++) { const r = z < 4 ? 1 : z < 14 ? 1 : 0; const c = ((z >> 1) & 1) ? p.main : p.second; g.box(-r, -r, z, r, r, z, z < 4 ? WOOD2 : c); }   // a striped tilting lance
      g.set(0, 0, 27, p.metal); g.set(1, 0, 27, p.metal); g.set(-1, 0, 27, p.metal);                                     // the coronel
    },
    wL(g, p) {
      g.box(0, 0, -1, 0, 0, 1, LEATHER);
      for (let y = -3; y <= 6; y++) for (let x = -3; x <= 3; x++) { if (y < -1 && Math.abs(x) > y + 4) continue; g.set(x, y, 2, Math.abs(x) === 3 || y === 6 ? p.metal : x < 0 ? p.main : p.second); }
      g.set(0, 3, 3, p.gem);
    },
    leg(g, p, o) {
      if (o !== 1) return;   // the whole horse hangs from the left leg, so it moves as one (centred under the rider)
      const X = -2, HIDE = p.cloth, MANE = 0x2a1a10;
      g.ell(X, -4, 0, 3.4, 3, 7.5, HIDE);                                                                                // the body
      g.box(X - 4, -6, -6, X + 4, -1, 6, (x, y, z) => (y === -6 ? p.second : ((z + 9) % 5 === 0 ? p.second : p.main))); // the caparison, hemmed
      g.box(X - 5, -3, -1, X - 5, 0, 2, p.metal); g.box(X + 5, -3, -1, X + 5, 0, 2, p.metal);                            // the rider's legs, either side
      g.set(X - 5, -4, 2, p.dark); g.set(X + 5, -4, 2, p.dark);
      for (let i = 0; i <= 5; i++) g.box(X - 1, -2 + i, 6 + Math.round(i * 0.5), X + 1, -1 + i, 7 + Math.round(i * 0.5), HIDE);   // the neck
      for (let i = 0; i <= 5; i++) g.set(X, -1 + i, 5 + Math.round(i * 0.5), MANE);
      g.box(X - 1, 3, 9, X + 1, 5, 12, HIDE); g.box(X - 1, 3, 12, X + 1, 4, 13, shade(HIDE, 0.7));                     // the head, the muzzle
      g.box(X - 1, 5, 10, X + 1, 5, 12, p.metal); g.set(X - 2, 4, 11, 0x0a0a0e); g.set(X + 2, 4, 11, 0x0a0a0e);           // the chanfron, the eyes
      g.set(X - 1, 6, 9, HIDE); g.set(X + 1, 6, 9, HIDE);                                                                 // ears
      for (const [lx, lz] of [[X - 2, 5], [X + 2, 5], [X - 2, -5], [X + 2, -5]]) {                                       // four legs, white socks, hooves
        g.box(lx, -10, lz, lx, -6, lz, HIDE); g.box(lx, -10, lz + 1, lx, -8, lz + 1, HIDE);
        g.box(lx, -10, lz, lx, -9, lz + 1, 0xf0ece0); g.box(lx, -11, lz, lx, -11, lz + 1, 0x1a1a1e);
      }
      g.box(X, -4, -8, X, -1, -8, MANE); g.box(X, -6, -9, X, -3, -9, MANE);                                              // the tail
    },
  };

  /* on horseback (the Lancer's legs on anyone): the horse stays level, the hips at riding height; the rider's moves still play above it */
  Anim.mounted = pose => Object.assign({}, pose, { legL: [(pose.legL ? pose.legL[0] : 0) * 0.12, 0, 0], legR: [0, 0, 0], hy: 0 });
  const readyFor = Anim.readyFor;
  Anim.readyFor = build => { const r = readyFor(build); return build && build.legs && build.legs.line === 'lancer' ? Anim.mounted(r) : r; };

  /* ------------------------------------------------------------ the stances */
  Object.assign(Anim.READY, {
    templar: { torso: [0.05, 0.4, 0], head: [0, -0.35, 0], armR: [-1.0, 0.25, -0.2], wR: [1.15, 0, 0], armL: [-1.2, -0.1, 0.55], wL: [0, 0, 0], legL: [-0.4, 0, 0.2], legR: [0.35, 0, -0.2], hy: -0.9 },
    crusader: { torso: [0.1, 0.3, 0], head: [0, -0.2, 0], armR: [-0.3, 0.1, -0.4], wR: [0.6, 0, 0], armL: [-1.25, -0.2, 0.25], wL: [0, 0, 0], legL: [-0.35, 0, 0.15], legR: [0.3, 0, -0.15], hy: -0.9 },
    lancer: { torso: [0.05, 0.15, 0], head: [0, -0.1, 0], armR: [-1.45, 0.1, -0.15], wR: [1.5, 0, 0], armL: [-1.1, -0.2, 0.3], wL: [0, 0, 0], legL: [0, 0, 0], legR: [0, 0, 0], hy: 0 },
  });
})();
