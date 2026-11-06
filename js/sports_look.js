/* ============================================================================
   sports_look.js -- how the MODERN SPORTS figures look and move: their voxel
   parts (models.js explains D[line]: head, torso, hips, arm(o), wR, wL,
   leg(o); o is +1 for the left limbs, -1 for the right), their ready stances
   and their attack poses (anim.js explains a pose).
   ========================================================================== */
(function () {
  'use strict';
  const { D, H } = Models;
  const { elbow, knee, hand, eyes, shade, G, WOOD, WOOD2, LEATHER, WHITE } = H;
  const HAIR = 0x2a1a10, BLOND = 0xd8a84a, SOLE = 0xeeeae0, IRON = 0x3a3e48;

  /* ------------------------------------------------------------- WRESTLER */
  D.wrestler = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.main);                                   // the mask
      g.box(-1, 0, 3, 1, 1, 3, p.skin); g.set(0, 0, 3, shade(p.skin, 0.75));                            // mouth
      g.boxM(1, 2, 3, 3, 4, 3, p.accent); eyes(g, p, 3, 3);                                             // eye holes, outlined
      g.box(-1, 6, -2, 1, 6, 2, p.accent); g.box(0, 6, -3, 0, 6, 3, p.accent);                          // the crest
      g.set(0, 5, 3, G(p.glow)); g.set(1, 4, 3, G(p.glow)); g.set(-1, 5, 3, G(p.glow));                  // a lightning bolt
      g.boxM(4, 3, -1, 4, 5, 1, p.accent); g.setM(4, 6, 0, p.accent); g.setM(5, 5, 0, p.accent);         // flame wings
      g.box(-1, 1, -4, 1, 4, -4, p.accent); for (const y of [1, 3]) g.box(-1, y, -4, 1, y, -4, p.second); // laces
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.skin);
      g.box(-3, 5, 2, -1, 6, 2, shade(p.skin, 0.9)); g.box(1, 5, 2, 3, 6, 2, shade(p.skin, 0.9));         // chest
      for (const y of [1, 3]) g.box(-1, y, 2, 1, y, 2, shade(p.skin, 0.88));                            // abs
      g.box(-4, 0, -2, 4, 2, 2, p.main); g.boxM(2, 3, 2, 3, 8, 2, p.main); g.boxM(2, 3, -2, 3, 8, -2, p.main);   // the singlet and its straps
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) {
      g.box(-3, -1, -2, 3, 0, 2, p.main);
      g.box(-4, -1, -3, 4, 0, 3, p.second); g.box(-2, -2, 3, 2, 1, 4, p.accent); g.box(-1, -1, 4, 1, 0, 4, shade(p.accent, 0.8)); g.set(0, -1, 5, G(p.glow));   // the title belt
    },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.skin); g.box(-1, 0, -2, 1, 1, 2, p.skin);
      g.box(-1, -7, -1, 1, -5, 1, p.skin); g.box(-1, -7, -1, 1, -6, 1, WHITE);                          // taped wrists
      if (o === 1) { g.box(-2, -5, -2, 2, -3, 2, p.main); g.box(-2, -4, 2, 2, -4, 2, p.accent); }       // the elbow pad
      hand(g, WHITE); elbow(g, p, o);
    },
    wR(g, p) { },
    wL(g, p) { },
    leg(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, p.main); g.box(o * 2, -4, -1, o * 2, -1, 1, p.accent);                  // tights, a side stripe
      g.box(-1, -6, 1, 1, -4, 2, p.accent);                                                              // knee pad
      g.box(-1, -9, -1, 1, -6, 1, p.second); g.box(0, -9, 1, 0, -7, 1, p.accent);                         // lace-up boots
      g.box(-1, -11, -1, 1, -10, 2, p.second); g.box(-1, -11, -1, 1, -11, 2, p.dark);
      knee(g, p, o);
    },
  };

  /* -------------------------------------------------------------- BASEBALL */
  D.baseball = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.boxM(1, 2, 3, 2, 2, 3, p.dark);            // eye black
      g.box(-4, 4, -4, 4, 7, 4, p.second); g.box(-3, 8, -3, 3, 8, 3, p.second);                          // the helmet
      g.box(-3, 5, 4, 3, 5, 6, p.second); g.box(-1, 6, 4, 1, 7, 4, p.accent);                            // brim, logo
      g.box(-4, 1, -1, -4, 4, 3, p.second); g.set(-4, 3, 1, p.dark);                                     // the ear flap
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, (x) => ((x + 8) % 3 === 0 ? p.second : p.main));                       // pinstripes
      g.box(-2, 8, -2, 2, 8, 2, p.second); g.box(0, 0, 2, 0, 7, 2, p.main);                              // collar, placket
      g.box(1, 6, 2, 3, 6, 2, p.accent); g.box(3, 3, 2, 3, 5, 2, p.accent); g.set(2, 4, 2, p.accent);    // the number 7
      g.box(-3, 6, 2, -2, 6, 2, p.second);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.dark); g.set(0, -1, 3, p.metal); g.box(-3, -3, -2, 3, -2, 2, p.main); },
    arm(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, p.main); g.box(-1, -3, -1, 1, -3, 1, p.second); g.box(-1, 0, -2, 1, 1, 2, p.main);
      g.box(-1, -7, -1, 1, -4, 1, p.skin); g.box(-1, -7, -1, 1, -7, 1, p.accent);
      hand(g, o === 1 ? 0xb07a3a : p.second); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(-1, -1, -2, 1, 1, -2, WOOD2); g.box(0, 0, -1, 0, 0, 4, 0x2a2a30);                             // knob, taped handle
      for (let z = 5; z <= 15; z++) { const r = z < 8 ? 0 : 1; g.box(-r, -r, z, r, r, z, z === 15 ? 0xc8a070 : 0xdcb47e); }   // the barrel
      g.set(1, 1, 12, 0x1a1a20);
    },
    wL(g, p) {
      g.box(-2, -2, -1, 2, 2, 3, 0xb07a3a); g.box(-1, -1, 3, 1, 1, 3, 0x8a5a2a);                          // the mitt and its pocket
      g.box(-2, 2, -1, 2, 2, 3, 0x6a4020); g.box(2, -2, 0, 2, 2, 0, 0x6a4020);                            // lacing
    },
    leg(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, (x, y, z) => ((x + 8) % 3 === 0 ? p.second : p.main));
      g.box(-1, -9, -1, 1, -6, 1, p.second); g.box(0, -8, 1, 0, -6, 1, WHITE);                           // stirrup socks
      g.box(-1, -11, -1, 1, -10, 2, p.dark); g.box(-1, -11, 2, 1, -11, 2, p.metal);                       // cleats
      knee(g, p, o);
    },
  };

  /* -------------------------------------------------------------- FOOTBALL */
  D.football = {
    head(g, p) {
      g.box(-4, 0, -4, 4, 6, 4, p.main); g.box(-3, 7, -3, 3, 7, 3, p.main);                              // the helmet
      g.box(-2, 1, 4, 2, 4, 4, p.skin); eyes(g, p, 3, 4);                                                // the face
      g.box(0, 7, -3, 0, 7, 3, p.accent); g.box(0, 5, 4, 0, 6, 4, p.accent);                             // the stripe
      g.box(-3, 1, 5, 3, 1, 5, p.metal); g.box(-3, 2, 5, -3, 4, 5, p.metal); g.box(3, 2, 5, 3, 4, 5, p.metal); g.box(0, 0, 5, 0, 2, 5, p.metal);   // the face mask
      g.setM(4, 3, 0, p.dark); g.setM(4, 4, 2, p.accent);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-5, 7, -3, 5, 9, 3, p.main); g.box(-5, 7, 3, 5, 7, 3, p.accent); g.box(-5, 7, -3, 5, 7, -3, p.accent);   // jersey over big pads
      g.box(-2, 2, 2, 2, 2, 2, p.accent); g.box(2, 3, 2, 2, 5, 2, p.accent); g.box(-2, 5, 2, 2, 5, 2, p.accent); g.box(-2, 3, 2, -2, 4, 2, p.accent);   // 0? a number block
      g.box(-1, 2, -2, 1, 6, -2, p.accent);
      g.box(-1, 9, -1, 1, 10, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.second); g.box(-3, -3, -2, 3, -2, 2, p.metal); },
    arm(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, p.main); g.box(-1, -3, -1, 1, -3, 1, p.accent);
      g.box(-1, -7, -1, 1, -4, 1, p.skin); g.box(-1, -6, -1, 1, -5, 1, WHITE);
      hand(g, p.second); elbow(g, p, o);
    },
    wR(g, p) { },
    wL(g, p) { g.ell(0, 0, 1, 2, 2, 3, 0x8a4a22); g.box(0, 2, 0, 0, 2, 2, WHITE); g.set(-1, 2, 1, WHITE); g.set(1, 2, 1, WHITE); },
    leg(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, p.metal); g.box(o * 2, -4, -1, o * 2, 0, 1, p.main); g.box(-1, -6, 1, 1, -4, 2, p.metal);   // pants, a stripe, knee pad
      g.box(-1, -9, -1, 1, -6, 1, p.main); g.box(-1, -11, -1, 1, -10, 2, p.second); g.box(-1, -11, -1, 1, -11, 2, WHITE);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- SOCCER */
  D.soccer = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 4, -3, 3, 4, 3, p.accent);                                                               // the headband
      g.box(-3, 5, -3, 3, 6, 3, HAIR); g.box(-3, 1, -3, 3, 3, -3, HAIR); g.boxM(3, 2, -3, 3, 3, 0, HAIR);
      [[-2, 7, 1], [0, 7, 2], [2, 7, 0], [-1, 8, 0], [1, 7, -2], [-3, 7, -1]].forEach(([x, y, z]) => g.set(x, y, z, HAIR));   // spiky hair
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-4, 3, -2, 4, 4, 2, shade(p.main, 0.82));
      g.box(-2, 8, -2, 2, 8, 2, p.second); g.box(-1, 7, 2, 1, 7, 2, p.second);                          // the collar
      g.box(-2, 4, 2, -2, 6, 2, p.second); g.box(0, 4, 2, 2, 4, 2, p.second); g.box(0, 6, 2, 2, 6, 2, p.second); g.box(0, 5, 2, 0, 5, 2, p.second); g.box(2, 5, 2, 2, 5, 2, p.second);   // 10
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.cloth); g.box(-3, -3, -2, 3, -2, 2, p.cloth); g.boxM(3, -3, -2, 3, -1, 2, p.second); },
    arm(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, p.main); g.box(-1, -3, -1, 1, -3, 1, p.second);
      if (o === -1) g.box(-1, -2, -1, 1, -2, 1, p.accent);                                               // the captain's armband
      g.box(-1, -7, -1, 1, -4, 1, p.skin);
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) { },
    wL(g, p) { g.box(-2, -2, -1, 2, 2, 2, 0x1c1c22); g.box(-2, -1, 2, 2, 1, 2, p.accent); g.box(-2, -2, -1, 2, -2, 2, p.main); },   // the goalie glove
    leg(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, p.cloth); g.box(-1, -5, -1, 1, -4, 1, p.skin);
      g.box(-1, -9, -1, 1, -6, 1, p.main); g.box(-1, -6, -1, 1, -6, 1, p.second); g.box(-1, -8, 1, 1, -7, 1, p.second);   // socks, shin guard
      g.box(-1, -11, -1, 1, -10, 2, p.dark); g.box(o, -10, 0, o, -10, 2, p.accent);
      knee(g, p, o);
    },
  };

  /* ----------------------------------------------------------------- BOXER */
  D.boxer = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-4, 5, -4, 4, 6, 4, p.main); g.boxM(4, 1, -3, 4, 5, 3, p.main); g.box(-3, 1, -4, 3, 5, -4, p.main);   // the headgear
      g.box(-3, 5, 3, 3, 5, 4, p.main); g.boxM(3, 1, 3, 3, 2, 4, p.main); g.box(-2, 6, 4, 2, 6, 4, p.second); g.box(-1, 0, 4, 1, 0, 4, p.main);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.skin);
      g.box(-3, 5, 2, -1, 6, 2, shade(p.skin, 0.9)); g.box(1, 5, 2, 3, 6, 2, shade(p.skin, 0.9));
      for (const y of [1, 3]) g.box(-1, y, 2, 1, y, 2, shade(p.skin, 0.88));
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-4, -1, -2, 4, 0, 2, p.second); g.box(-4, -4, -2, 4, -2, 2, p.main); g.box(2, -3, 2, 3, -2, 2, p.accent); },   // the trunks
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.skin); g.box(-1, 0, -2, 1, 1, 2, p.skin);
      g.box(-1, -7, -1, 1, -5, 1, p.skin); g.box(-1, -7, -1, 1, -6, 1, WHITE);
      hand(g, WHITE); elbow(g, p, o);
    },
    wR(g, p) { g.box(-2, -2, -2, 2, 2, 3, p.main); g.box(-2, -2, -2, 2, 2, -2, p.second); g.box(2, -1, 0, 2, 1, 1, shade(p.main, 0.85)); },   // the gloves
    wL(g, p) { g.box(-2, -2, -2, 2, 2, 3, p.main); g.box(-2, -2, -2, 2, 2, -2, p.second); g.box(-2, -1, 0, -2, 1, 1, shade(p.main, 0.85)); },
    leg(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, p.skin);
      g.box(-1, -9, -1, 1, -6, 1, p.main); g.box(-1, -6, -1, 1, -6, 1, WHITE); g.box(0, -9, 1, 0, -7, 1, WHITE);   // high boots
      g.box(-1, -11, -1, 1, -10, 2, p.main); g.box(-1, -11, -1, 1, -11, 2, WHITE);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- FENCER */
  D.fencer = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.main); g.box(-2, 6, -2, 2, 6, 2, p.main);
      g.box(-3, 1, 3, 3, 5, 4, (x, y) => ((x + y) & 1 ? p.dark : shade(p.dark, 1.5)));                  // the mesh
      g.box(-3, 0, 2, 3, 0, 4, WHITE); g.box(-2, -1, 3, 2, -1, 4, WHITE);                                // the bib
      g.box(-3, 5, 4, 3, 5, 4, p.accent); g.box(-3, 2, -4, 3, 3, -4, p.accent);                          // trim, the back strap
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main);
      for (let y = 0; y <= 7; y++) g.set(Math.round(-2 + y * 0.6), y, 2, p.second);                      // the diagonal closure
      g.box(-4, 4, 2, -2, 7, 2, p.metal); g.box(-1, 8, -2, 1, 8, 2, p.main); g.box(-1, 8, 2, 1, 8, 2, p.accent);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.main); g.box(-3, 0, -2, 3, 0, 2, p.second); g.box(-3, -3, -2, 3, -2, 2, p.main); },
    arm(g, p, o) {
      g.box(-1, -7, -1, 1, 0, 1, p.main); g.box(-1, 0, -2, 1, 1, 2, p.main); g.box(-1, -7, -1, 1, -7, 1, p.second);
      hand(g, WHITE); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, 0, p.dark); g.box(-2, -2, 1, 2, 2, 1, p.metal); g.box(-1, -1, 2, 1, 1, 2, p.metal);   // grip, the bell guard
      for (let z = 3; z <= 17; z++) g.set(0, z > 15 ? 0 : 0, z, z > 16 ? p.dark : p.metal);              // the blade
      g.set(0, 0, 18, G(p.glow));
    },
    wL(g, p) { },
    leg(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, p.main); g.box(-1, -5, -1, 1, -5, 1, p.second);
      g.box(-1, -9, -1, 1, -6, 1, WHITE); g.box(-1, -11, -1, 1, -10, 2, p.second); g.box(-1, -11, 2, 1, -10, 2, p.accent);
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------- WEIGHTLIFTER */
  D.weightlifter = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 5, -3, 3, 6, 3, HAIR); g.box(-3, 2, -3, 3, 4, -3, HAIR); g.box(-1, 6, -4, 1, 8, -2, HAIR);   // hair, the bun
      g.box(-3, 4, 3, 3, 4, 3, p.accent); g.boxM(3, 4, -3, 3, 4, 3, p.accent); g.box(-3, 4, -3, 3, 4, -3, p.accent);   // the headband
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-4, 7, -2, 4, 8, 2, p.skin); g.boxM(2, 6, -2, 3, 8, 2, p.main);   // the singlet
      g.boxM(4, 0, -2, 4, 6, 2, p.second); g.box(-1, 3, 2, 1, 5, 2, p.accent);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-4, -1, -3, 4, 0, 3, p.second); g.box(-2, -1, 3, 2, 0, 4, p.accent); g.box(-3, -3, -2, 3, -2, 2, p.main); },   // the lifting belt
    arm(g, p, o) {
      g.box(-1, -4, -2, 1, 0, 2, p.skin); g.box(-2, -1, -2, 2, 1, 2, p.skin);                            // big shoulders
      g.box(-1, -7, -1, 1, -5, 1, p.skin); g.box(-1, -7, -1, 1, -6, 1, p.accent);                        // wrist wraps
      hand(g, 0xf0ece4); elbow(g, p, o);                                                                 // chalk
    },
    wR(g, p) { g.box(-2, 0, 0, 2, 0, 0, p.second); g.boxM(3, -2, -2, 4, 2, 2, IRON); g.boxM(3, 0, 0, 4, 0, 0, p.accent); },   // the dumbbell
    wL(g, p) { g.box(-1, 1, -1, 1, 1, 1, IRON); g.boxM(1, -1, -1, 1, 1, 1, IRON); g.ell(0, -1, 4, 2.6, 2.6, 2.6, IRON); g.set(0, -1, 7, p.accent); },   // the kettlebell
    leg(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, p.main); g.box(-1, -4, -1, 1, -4, 1, p.skin);
      g.box(-2, -7, -2, 2, -5, 2, p.dark); g.box(-1, -9, -1, 1, -8, 1, p.skin);                          // knee sleeves
      g.box(-1, -11, -1, 1, -10, 2, p.accent); g.box(-1, -10, 0, 1, -10, 1, p.dark); g.box(-1, -11, -1, 1, -11, 2, WOOD);   // lifting shoes
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- BOWLER */
  D.bowler = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.boxM(3, 1, 0, 3, 3, 1, HAIR);               // sideburns
      g.box(-3, 5, -3, 3, 6, 3, HAIR); g.box(-2, 7, -1, 2, 7, 3, HAIR); g.box(-1, 8, 1, 1, 8, 3, HAIR);  // the pompadour
      g.box(-3, 4, 3, 3, 4, 3, p.main); g.boxM(3, 4, -3, 3, 4, 3, p.main); g.box(-3, 5, 4, 3, 5, 5, p.main); g.set(0, 5, 5, p.accent);   // the lucky visor
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-4, 6, -2, 4, 8, 2, p.second); g.boxM(2, 0, 2, 2, 5, 2, p.second);   // two-tone shirt
      g.box(-3, 8, 2, 3, 8, 3, p.second); g.box(-3, 4, 2, -2, 4, 2, p.accent);                            // collar, name patch
      for (const y of [1, 3, 5]) g.set(0, y, 2, p.dark);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.dark); g.set(0, -1, 3, p.accent); g.box(-3, -3, -2, 3, -2, 2, p.cloth); },
    arm(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, p.main); g.box(-1, -3, -1, 1, -3, 1, p.second); g.box(-1, 0, -2, 1, 1, 2, p.second);
      g.box(-1, -7, -1, 1, -4, 1, p.skin);
      if (o === 1) { g.box(-1, -7, -1, 1, -5, 1, 0x1c1c22); g.box(-1, -6, 1, 1, -6, 1, p.accent); }    // the wrist brace
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) { g.ell(0, 0, 3, 3, 3, 3, (x, y, z) => (Math.sin(x * 1.3 + z * 0.9) > 0.6 ? p.metal : shade(p.metal, 1.6))); g.set(-1, 2, 5, 0x0a0a0e); g.set(1, 2, 5, 0x0a0a0e); g.set(0, 1, 6, 0x0a0a0e); },   // the ball
    wL(g, p) { },
    leg(g, p, o) {
      g.box(-1, -9, -1, 1, 0, 1, p.cloth); g.box(-1, -1, 1, 1, -1, 1, shade(p.cloth, 1.2));
      g.box(-1, -11, -1, 1, -10, 2, p.second); g.box(-1, -11, 1, 1, -10, 2, p.accent); g.box(-1, -10, -1, 1, -10, -1, p.accent);   // two-tone shoes
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- ARCHER */
  D.archer = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 5, -3, 3, 6, 3, BLOND); g.box(-3, 2, -3, 3, 4, -3, BLOND); g.box(0, 1, -5, 0, 4, -4, BLOND); g.set(0, 0, -5, BLOND);   // a ponytail
      g.box(-3, 4, 3, 3, 4, 3, p.main); g.boxM(3, 4, -3, 3, 4, 3, p.main); g.box(-3, 4, 4, 3, 4, 6, p.main); g.box(-2, 4, 6, 2, 4, 6, shade(p.main, 0.85));   // the sun visor
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.second); g.box(-4, 3, 2, 0, 7, 3, 0x1c1c22); g.box(-3, 5, 3, -2, 5, 3, p.main);   // the chest guard
      for (let y = 0; y <= 8; y++) g.set(Math.round(4 - y), y, 2, LEATHER);                               // the quiver strap
      g.box(1, 1, -4, 3, 8, -3, LEATHER); g.box(1, 9, -4, 1, 10, -4, p.accent); g.box(2, 9, -3, 2, 11, -3, p.main); g.box(3, 9, -4, 3, 10, -4, p.accent);   // the quiver and its fletchings
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, LEATHER); g.box(-3, -3, -2, 3, -2, 2, p.cloth); },
    arm(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, p.second); g.box(-1, -7, -1, 1, -4, 1, p.skin);
      if (o === 1) { g.box(-1, -7, -1, 1, -4, 1, LEATHER); g.box(-1, -6, 1, 1, -5, 1, p.main); }          // the arm guard
      hand(g, o === -1 ? LEATHER : p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, -2, 0, 0, 2, 1, p.dark);                                                                  // the riser
      for (let y = 3; y <= 9; y++) { const z = 1 - Math.round(Math.pow((y - 2) / 7, 2) * 2) + (y === 9 ? 1 : 0); g.set(0, y, z, p.main); g.set(0, -y, z, p.main); }   // recurve limbs
      g.box(0, -8, -1, 0, 8, -1, WHITE); g.set(0, 0, 2, p.accent);
    },
    wL(g, p) { g.box(0, 0, -1, 0, 0, 10, 0xd8c08a); g.box(0, -1, -1, 0, 1, 0, p.accent); g.set(0, 0, 11, p.metal); },   // an arrow, nocked
    leg(g, p, o) {
      g.box(-1, -9, -1, 1, 0, 1, p.cloth); g.box(o * 2, -6, -1, o * 2, -3, 1, shade(p.cloth, 0.8));
      g.box(-1, -11, -1, 1, -10, 2, p.main); g.box(-1, -11, -1, 1, -11, 2, SOLE);
      knee(g, p, o);
    },
  };

  /* ----------------------------------------------------------- SKATEBOARDER */
  D.skater = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.boxM(3, 2, -1, 3, 4, 2, HAIR);
      g.box(-3, 4, -3, 3, 7, 3, p.main); g.box(-3, 4, -3, 3, 4, 3, p.dark); g.box(-2, 8, -2, 2, 8, 2, p.main); g.set(0, 9, 0, p.accent);   // the beanie
      g.box(-3, 4, 4, -1, 4, 4, HAIR);
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.second); g.box(-4, 0, -2, 4, 0, 2, shade(p.second, 0.8));             // the hoodie
      g.box(-2, 3, 2, 2, 6, 2, p.main); g.box(-1, 4, 2, 1, 5, 2, p.accent);                              // a graphic
      g.box(-3, 7, -3, 3, 9, -3, p.second); g.box(-1, 5, 2, -1, 7, 2, WHITE); g.box(1, 5, 2, 1, 7, 2, WHITE);   // the hood, drawstrings
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.cloth); g.box(-4, -3, -2, 4, -2, 2, p.cloth); g.set(3, -2, 3, p.metal); },
    arm(g, p, o) {
      g.box(-1, -6, -1, 1, 0, 1, p.second); g.box(-1, -6, -1, 1, -6, 1, shade(p.second, 0.8));
      if (o === 1) { g.box(-1, -7, -1, 1, -6, 1, 0x1c1c22); g.box(-1, -7, 1, 1, -6, 1, p.accent); }      // the wrist guard
      else g.box(-1, -7, -1, 1, -7, 1, p.skin);
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, -2, 0, 0, 2, 12, 0x1a1a1e); g.box(1, -2, 0, 1, 2, 12, (x, y, z) => (z > 3 && z < 9 && Math.abs(y) < 2 ? p.accent : p.main));   // grip tape, the graphic
      g.box(0, -1, -1, 1, 1, -1, p.main); g.box(0, -1, 13, 1, 1, 13, p.main);                            // the kicktails
      for (const z of [2, 10]) { g.box(2, -1, z, 2, 1, z, p.metal); g.box(3, -2, z - 1, 3, -1, z, SOLE); g.box(3, 1, z - 1, 3, 2, z, SOLE); }   // trucks and wheels
    },
    wL(g, p) { },
    leg(g, p, o) {
      g.box(-2, -5, -2, 1, 0, 2, p.cloth); g.box(-1, -9, -1, 1, -6, 1, WHITE); g.box(-1, -7, -1, 1, -7, 1, p.accent);   // baggy shorts, high socks
      g.box(-2, -11, -2, 2, -10, 3, 0x1c1c22); g.box(-2, -11, -2, 2, -11, 3, SOLE); g.set(o * 2, -10, 1, p.accent);   // chunky shoes
      knee(g, p, o);
    },
  };

  /* ------------------------------------------------------------ the stances */
  Object.assign(Anim.READY, {
    wrestler: { torso: [0.25, 0.1, 0], head: [-0.15, 0, 0], armR: [-1.0, 0.2, -0.5], wR: [0.2, 0, 0], armL: [-1.0, -0.2, 0.5], wL: [0.2, 0, 0], legL: [-0.45, 0, 0.2], legR: [0.35, 0, -0.2], hy: -1.3 },
    baseball: { torso: [0.05, -0.4, 0], head: [0, 0.4, 0], armR: [-2.2, 0, -0.5], wR: [0.4, 0, 0], armL: [-1.8, 0, -0.9], wL: [0.2, 0, 0], legL: [-0.3, 0, 0.15], legR: [0.3, 0, -0.15], hy: -0.8 },
    football: { torso: [0.45, 0.1, 0], head: [-0.4, 0, 0], armR: [-0.9, 0, -0.2], wR: [0, 0, 0], armL: [-0.7, 0, 0.3], wL: [0.4, 0, 0], legL: [-0.5, 0, 0.15], legR: [0.4, 0, -0.15], hy: -1.5 },
    soccer: { torso: [0.08, 0.15, 0], head: [0, -0.1, 0], armR: [-0.2, 0, -0.3], wR: [0, 0, 0], armL: [-0.2, 0, 0.3], wL: [0, 0, 0], legL: [-0.25, 0, 0.08], legR: [0.25, 0, -0.08], hy: -0.4 },
    boxer: { torso: [0.15, 0.4, 0], head: [0.1, -0.35, 0], armR: [-1.6, 0.4, -0.25], wR: [0, 0, 0], armL: [-1.75, -0.3, 0.25], wL: [0, 0, 0], legL: [-0.4, 0, 0.1], legR: [0.35, 0, -0.1], hy: -0.8 },
    fencer: { torso: [0.05, 0.6, 0], head: [0, -0.6, 0], armR: [-1.35, 0.2, -0.1], wR: [1.3, 0, 0], armL: [-2.4, -0.3, 0.9], wL: [0, 0, 0], legL: [-0.55, 0, 0.25], legR: [0.4, 0, -0.25], hy: -1.0 },
    weightlifter: { torso: [0.15, 0.15, 0], head: [0, -0.1, 0], armR: [-0.5, 0, -0.45], wR: [0.2, 0, 0], armL: [-0.4, 0, 0.45], wL: [0.2, 0, 0], legL: [-0.3, 0, 0.3], legR: [0.3, 0, -0.3], hy: -1.2 },
    bowler: { torso: [0.1, 0.2, 0], head: [0, -0.15, 0], armR: [-1.2, 0.3, 0.3], wR: [0.4, 0, 0], armL: [-1.0, -0.2, -0.4], wL: [0, 0, 0], legL: [-0.25, 0, 0.1], legR: [0.25, 0, -0.1], hy: -0.6 },
    archer: { torso: [0.05, 0.3, 0], head: [0, -0.3, 0], armR: [-0.7, 0.2, -0.25], wR: [0.9, 0, 0], armL: [-0.3, 0, 0.35], wL: [0.5, 0, 0], legL: [-0.3, 0, 0.1], legR: [0.3, 0, -0.1], hy: -0.6 },
    skater: { torso: [0.1, 0.25, 0], head: [0, -0.25, 0], armR: [-0.3, 0, -0.35], wR: [1.0, 0, 0], armL: [-0.4, 0, 0.4], wL: [0, 0, 0], legL: [-0.3, 0, 0.12], legR: [0.3, 0, -0.12], hy: -0.7 },
  });

  /* ------------------------------------------------------------- the poses */
  Object.assign(Anim.P, {
    chop: { wind: { torso: [0, -0.4, 0], armR: [-2.6, 0, -0.6] }, strike: { torso: [0.15, 0.5, 0], armR: [-1.2, 0, 0.5] } },
    lariat: { wind: { torso: [0, -0.8, 0], armR: [-1.5, 0, -1.5] }, strike: { torso: [0.1, 0.9, 0], armR: [-1.55, 0, 0.3], hy: -0.3 } },
    elbowDrop: { wind: { torso: [-0.3, 0, 0], armR: [-2.4, 0, -0.4] }, strike: { torso: [0.6, 0, 0], armR: [-0.6, 0, 0.6], legL: [-0.8, 0, 0], legR: [-0.6, 0, 0] } },
    tackle: { wind: { torso: [0.5, 0, 0], armR: [-0.6, 0, -0.2], armL: [-0.6, 0, 0.2], legL: [-0.6, 0, 0], legR: [0.5, 0, 0], hy: -1.4 }, strike: { torso: [0.85, 0, 0], armR: [-1.1, 0, 0.2], armL: [-1.1, 0, -0.2], legL: [-0.3, 0, 0], legR: [0.9, 0, 0], hy: -1.6 } },
    uppercut: { wind: { torso: [0.3, -0.4, 0], armR: [-0.2, 0, -0.2], hy: -1.2 }, strike: { torso: [-0.2, 0.4, 0], armR: [-2.6, 0, 0.2], hy: 0.3 } },
    uppercutL: { wind: { torso: [0.3, 0.4, 0], armL: [-0.2, 0, 0.2], hy: -1.2 }, strike: { torso: [-0.2, -0.4, 0], armL: [-2.6, 0, -0.2], hy: 0.3 } },
    legDrop: { wind: { torso: [-0.4, 0, 0], legR: [-1.6, 0, 0], hy: 1 }, strike: { torso: [0.3, 0, 0], legR: [-0.4, 0, 0], legL: [-1.2, 0, 0], hy: -1 } },
    dropkick: { wind: { torso: [-0.3, 0, 0], legL: [-1.0, 0, 0], legR: [-1.0, 0, 0] }, strike: { torso: [-0.8, 0, 0], legL: [-1.6, 0, 0], legR: [-1.6, 0, 0], armR: [0.6, 0, -0.6], armL: [0.6, 0, 0.6], hy: 2 } },
    homerun: { wind: { torso: [0, -1.0, 0], armR: [-1.6, 0, -1.4], armL: [-1.5, 0, -1.0], wR: [1.2, 0, 0], hy: -0.6 }, strike: { torso: [0.1, 1.1, 0], armR: [-1.55, 0, 0.9], armL: [-1.5, 0, 1.2], wR: [1.4, 0, 0], hy: -0.4 } },
    pitchL: { wind: { torso: [0, 0.7, 0], armL: [0.6, 0, 1.2], legR: [-0.6, 0, 0] }, strike: { torso: [0.3, -0.6, 0], armL: [-2.0, 0, 0.2], legL: [-0.8, 0, 0] } },
    slide: { wind: { torso: [-0.6, 0, 0], legL: [-1.2, 0, 0], legR: [-0.2, 0, 0], hy: -2 }, strike: { torso: [-0.9, 0, 0], legL: [-1.5, 0, 0], legR: [-0.6, 0, 0], armR: [0.6, 0, -0.4], armL: [0.6, 0, 0.4], hy: -5 } },
    toePoke: { wind: { legR: [0.5, 0, 0] }, strike: { torso: [-0.1, 0, 0], legR: [-1.2, 0, 0] } },
    instep: { wind: { torso: [0.1, 0.3, 0], legR: [0.9, 0, 0], armL: [-0.4, 0, 0.6] }, strike: { torso: [-0.2, -0.3, 0], legR: [-1.5, 0, 0], armL: [-0.3, 0, 0.9], armR: [0.3, 0, -0.6] } },
    bicycle: { wind: { torso: [-0.9, 0, 0], legL: [-1.4, 0, 0], hy: 2 }, strike: { torso: [-1.6, 0, 0], legR: [-2.8, 0, 0], legL: [-0.5, 0, 0], armR: [0.8, 0, -0.8], armL: [0.8, 0, 0.8], hy: 3 } },
    header: { wind: { torso: [-0.4, 0, 0], head: [-0.4, 0, 0] }, strike: { torso: [0.6, 0, 0], head: [0.5, 0, 0], armR: [0.5, 0, -0.5], armL: [0.5, 0, 0.5], hy: 0.5 } },
    hook: { wind: { torso: [0, -0.6, 0], armR: [-1.4, -0.6, -1.2] }, strike: { torso: [0.1, 0.8, 0], armR: [-1.6, 0.4, 0.6], hy: -0.4 } },
    hookL: { wind: { torso: [0, 0.6, 0], armL: [-1.4, 0.6, 1.2] }, strike: { torso: [0.1, -0.8, 0], armL: [-1.6, -0.4, -0.6], hy: -0.4 } },
    overhand: { wind: { torso: [-0.2, -0.3, 0], armR: [-2.9, 0, -0.4] }, strike: { torso: [0.5, 0.4, 0], armR: [-1.0, 0, 0.3] } },
    overhandL: { wind: { torso: [-0.2, 0.3, 0], armL: [-2.9, 0, 0.4] }, strike: { torso: [0.5, -0.4, 0], armL: [-1.0, 0, -0.3] } },
    weave: { wind: { torso: [0.3, 0, 0.3], hy: -1.5 }, strike: { torso: [0.4, 0, -0.4], head: [0.2, 0, 0], hy: -2 } },
    lunge: { wind: { armR: [-1.4, 0, -0.2], wR: [1.5, 0, 0], legL: [-0.4, 0, 0], hy: -0.5 }, strike: { torso: [0.3, 0.2, 0], armR: [-1.6, 0, 0], wR: [1.57, 0, 0], armL: [0.6, 0, 1.2], legL: [-1.3, 0, 0], legR: [0.9, 0, 0], hy: -2.2 } },
    enGarde: { wind: { armR: [-1.2, 0, -0.1], wR: [1.2, 0, 0], armL: [-2.2, 0, 0.9], hy: -1 }, strike: { torso: [-0.1, -0.3, 0], armR: [-1.9, 0, 0.3], wR: [1.0, 0, 0], hy: -1.2 } },
    curl: { wind: { armR: [-0.2, 0, -0.2], hy: -0.6 }, strike: { torso: [-0.1, 0.3, 0], armR: [-2.4, 0, 0.2], hy: -0.3 } },
    press: { wind: { armR: [-0.4, 0, -0.3], armL: [-0.4, 0, 0.3], hy: -1.6 }, strike: { armR: [-3.1, 0, -0.2], armL: [-3.1, 0, 0.2], head: [-0.3, 0, 0], hy: 0.4 } },
    kettle: { wind: { torso: [0.4, 0.4, 0], armL: [0.8, 0, 0.3], hy: -1.6 }, strike: { torso: [-0.1, -0.3, 0], armL: [-2.0, 0, -0.2], hy: -0.2 } },
    bowlSwing: { wind: { torso: [0.2, -0.3, 0], armR: [0.9, 0, -0.2] }, strike: { torso: [0.2, 0.3, 0], armR: [-1.6, 0, 0.2] } },
    bowl: { wind: { torso: [0.4, -0.2, 0], armR: [1.2, 0, -0.2], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], hy: -1.5 }, strike: { torso: [0.6, 0.1, 0], armR: [-0.9, 0, 0], legL: [-1.1, 0, 0], legR: [1.2, 0, 0.3], hy: -2.5 } },
    drawBow: { wind: { torso: [0, -0.4, 0], armR: [-1.55, 0, 0.1], wR: [1.5, 0, 0], armL: [-1.5, 0, -0.3] }, strike: { torso: [0, -0.5, 0], armR: [-1.6, 0, 0.15], wR: [1.5, 0, 0], armL: [-1.2, 0, -0.9] } },
    kickflip: { wind: { legR: [0.4, 0, 0], hy: -1.4 }, strike: { torso: [-0.3, 0, 0], legR: [-2.2, 0, 0], armR: [-2.0, 0, -0.4], hy: 1 } },
    grind: { wind: { torso: [0.3, 0.6, 0], armR: [-0.8, 0, -0.8], armL: [-0.8, 0, 0.8], legL: [-0.4, 0, 0.2], legR: [0.4, 0, -0.2], hy: -1.2 }, strike: { torso: [0.4, 0.8, 0], armR: [-1.0, 0, -1.2], armL: [-1.0, 0, 1.2], hy: -1.8 } },
  });
})();
