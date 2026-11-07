/* ============================================================================
   benders_look.js -- how the ELEMENT BENDERS look and stand (models.js
   explains D[line]; anim.js a pose). What they hold is the element itself,
   wrapped round the hand.
   ========================================================================== */
(function () {
  'use strict';
  const { D, H } = Models;
  const { elbow, knee, hand, eyes, shade, G, LEATHER, WHITE } = H;
  const HAIR = 0x2a1a10;
  // a sleeve and a hand with a wrap at the wrist (most of them fight bare-handed)
  const sleeve = (g, p, o, c, cuff, skin) => { g.box(-1, -4, -1, 1, 0, 1, c); g.box(-1, -7, -1, 1, -5, 1, skin != null ? skin : p.skin); g.box(-1, -7, -1, 1, -7, 1, cuff); hand(g, p.skin); elbow(g, p, o); };
  const orb = (g, c1, c2, r) => g.ell(0, 0, 1, r || 1.6, r || 1.6, r || 1.6, (x, y, z) => VX.hash3(x, y, z) > 0.5 ? G(c1) : G(c2));

  /* ------------------------------------------------------------------- AIR */
  D.air = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-4, 4, -4, 4, 6, 4, p.cloth); g.box(-4, 0, -4, 4, 4, -4, p.cloth); g.boxM(4, 0, -3, 4, 4, 2, p.cloth); g.box(-3, 6, -3, 3, 7, 2, p.cloth);   // the hood
      g.box(-3, 5, 4, 3, 5, 4, p.accent); for (let i = 0; i < 4; i++) g.set(-1 + (i & 1), 7 + i, -2 - i, p.main);                                 // a ribbon blowing back
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-1, 0, 2, 1, 8, 2, p.second); g.box(-4, 3, -2, 4, 3, 2, p.accent); g.box(-1, 9, -1, 1, 9, 1, p.joint); },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.accent); g.box(-4, -5, -3, 4, -1, 3, p.main); g.box(-4, -5, 3, 4, -5, 3, p.second); },
    arm(g, p, o) { g.box(-2, -6, -2, 2, 0, 2, p.main); g.box(-2, -6, -2, 2, -6, 2, p.second); g.box(-1, -7, -1, 1, -7, 1, p.skin); hand(g, p.skin); elbow(g, p, o); },   // wide sleeves
    wR(g, p) { for (let k = 0; k < 10; k++) { const a = k * 0.63; g.set(Math.round(Math.cos(a) * 2), Math.round(Math.sin(a) * 2), (k % 3) - 1, G(k & 1 ? 0xffffff : p.glow)); } },
    wL(g, p) { for (let k = 0; k < 10; k++) { const a = -k * 0.63; g.set(Math.round(Math.cos(a) * 2), Math.round(Math.sin(a) * 2), (k % 3) - 1, G(k & 1 ? 0xffffff : p.glow)); } },
    leg(g, p, o) { g.box(-1, -8, -1, 1, 0, 1, p.main); g.box(-1, -9, -1, 1, -8, 1, p.second); g.box(-1, -11, -1, 1, -10, 2, 0xd8c8a8); knee(g, p, o); },   // wraps and sandals
  };

  /* ----------------------------------------------------------------- WATER */
  D.water = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 4, -3, 3, 6, 3, HAIR); g.box(-3, 0, -4, 3, 5, -4, HAIR); for (let y = -5; y <= 0; y++) g.set(0, y, -4, HAIR);   // a long braid
      g.box(-4, 4, 3, 4, 4, 3, p.accent); g.set(0, 4, 4, G(p.glow));                                                          // the circlet
      g.boxM(3, 1, 2, 3, 2, 2, p.accent);
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-4, 7, -3, 4, 9, 3, p.second); g.box(-1, 0, 2, 1, 6, 2, p.cloth); for (const y of [2, 4]) g.set(0, y, 3, p.accent); g.box(-1, 9, -1, 1, 9, 1, p.joint); },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.cloth); g.box(-4, -6, -3, 4, -1, 3, p.main); g.box(-4, -6, -3, 4, -6, 3, p.second); },
    arm(g, p, o) { sleeve(g, p, o, p.main, p.second); },
    wR(g, p) { orb(g, p.glow, 0x2a8ae8); for (let z = 3; z <= 7; z++) g.set(0, z === 7 ? 1 : 0, z, G(z & 1 ? p.glow : 0x9ae8ff)); },   // the whip, coiled
    wL(g, p) { orb(g, p.glow, 0x2a8ae8, 1.4); },
    leg(g, p, o) { g.box(-1, -5, -1, 1, 0, 1, p.main); g.box(-2, -11, -2, 1, -6, 2, 0x3a2a1a); g.box(-2, -6, -2, 1, -6, 2, p.second); knee(g, p, o); },   // fur-topped boots
  };

  /* ----------------------------------------------------------------- EARTH */
  D.earth = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.box(-3, 4, 3, 3, 4, 3, HAIR);
      g.box(-3, 5, -3, 3, 6, 3, HAIR); g.box(-4, 5, -2, 4, 5, 2, p.main);                                                     // a headband
      g.box(-2, 0, 3, 2, 1, 4, 0x3a2a1a);                                                                                  // a short beard
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-3, 4, 2, 3, 8, 2, p.skin); g.box(-4, 0, -2, 4, 1, 2, p.second); g.box(-2, 6, 3, 2, 7, 3, p.metal); g.box(-1, 9, -1, 1, 9, 1, p.joint); },   // open vest, a stone pendant
    hips(g, p) { g.box(-4, -1, -2, 4, 0, 2, p.accent); g.box(-4, -5, -2, 4, -2, 2, p.second); },
    arm(g, p, o) { g.box(-2, -4, -2, 2, 0, 2, p.skin); g.box(-1, -7, -1, 1, -5, 1, p.skin); g.box(-2, -7, -2, 2, -6, 2, p.cloth); hand(g, p.skin); elbow(g, p, o); },   // bare arms
    wR(g, p) { g.ell(0, 0, 0, 2.2, 2.2, 2.4, (x, y, z) => VX.hash3(x, y, z) > 0.6 ? shade(p.metal, 0.8) : p.metal); },   // a stone gauntlet
    wL(g, p) { g.ell(0, 0, 0, 2.2, 2.2, 2.4, (x, y, z) => VX.hash3(x, y, z) > 0.6 ? shade(p.metal, 0.8) : p.metal); },
    leg(g, p, o) { g.box(-1, -8, -1, 1, 0, 1, p.second); g.box(-1, -8, -1, 1, -8, 1, p.cloth); g.box(-1, -11, -1, 1, -9, 2, p.skin); knee(g, p, o); },   // barefoot
  };

  /* ------------------------------------------------------------------ FIRE */
  D.flame = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 5, -3, 3, 6, 3, 0x1a1414); g.box(-1, 7, -1, 1, 8, 1, 0x1a1414); g.set(0, 9, 0, G(p.glow)); g.box(-1, 7, 2, 1, 7, 2, p.accent);   // a topknot, a gold flame pin
      g.boxM(3, 1, -1, 3, 4, 1, 0x1a1414);
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-4, 7, -3, 4, 9, 3, p.second); g.box(-1, 0, 2, 1, 7, 2, p.second); g.box(-4, 1, -2, 4, 1, 2, p.accent); g.box(-1, 9, -1, 1, 9, 1, p.joint); },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.accent); g.box(-4, -6, -3, 4, -1, 3, p.second); g.box(-4, -6, 3, 4, -6, 3, p.main); },
    arm(g, p, o) { sleeve(g, p, o, p.main, p.accent); },
    wR(g, p) { for (const [x, y, z, c] of [[0, 1, 0, 0xffd040], [0, 2, 0, 0xff7a2a], [1, 1, 1, 0xff7a2a], [-1, 1, -1, 0xff3010], [0, 3, 1, 0xff3010], [0, 0, 1, 0xffd040]]) g.set(x, y, z, G(c)); },   // flame on the fist
    wL(g, p) { for (const [x, y, z, c] of [[0, 1, 0, 0xffd040], [0, 2, 0, 0xff7a2a], [-1, 1, 1, 0xff7a2a], [1, 1, -1, 0xff3010], [0, 3, -1, 0xff3010]]) g.set(x, y, z, G(c)); },
    leg(g, p, o) { g.box(-1, -6, -1, 1, 0, 1, p.second); g.box(-1, -11, -1, 1, -7, 1, 0x1a1414); g.box(-1, -11, -1, 1, -10, 2, 0x1a1414); g.box(-1, -7, -1, 1, -7, 1, p.accent); knee(g, p, o); },
  };

  /* ----------------------------------------------------------------- BLOOD */
  D.blood = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.set(-2, 3, 3, G(p.glow)); g.set(2, 3, 3, G(p.glow));        // red eyes
      g.box(-4, 3, -4, 4, 6, 3, 0x14080c); g.box(-4, -3, -4, 4, 3, -4, 0x14080c); g.boxM(4, -2, -3, 4, 3, 0, 0x14080c);  // long black hair
      g.box(-3, 1, 4, 3, 2, 4, p.accent);                                                                                 // the veil
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-3, 8, -2, 3, 10, 2, p.second); g.box(-4, 2, -2, 4, 2, 2, p.accent); g.box(-1, 9, -1, 1, 9, 1, p.joint); },   // the high collar
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.accent); g.box(-4, -9, -3, 4, -1, 3, p.main); g.box(-4, -9, -3, 4, -9, 3, p.cloth); },   // a long gown
    arm(g, p, o) { sleeve(g, p, o, p.main, p.accent); },
    wR(g, p) { for (let k = 0; k < 6; k++) g.set((k % 3) - 1, Math.floor(k / 3) - 1, 2 + (k & 1), G(k & 1 ? p.glow : 0x8a0a1a)); },   // threads of red from the fingers
    wL(g, p) { for (let k = 0; k < 6; k++) g.set(1 - (k % 3), Math.floor(k / 3) - 1, 2 + (k & 1), G(k & 1 ? p.glow : 0x8a0a1a)); },
    leg(g, p, o) { g.box(-1, -8, -1, 1, 0, 1, p.main); g.box(-1, -11, -1, 1, -9, 1, 0x14080c); g.box(-1, -11, 1, 1, -11, 2, 0x14080c); knee(g, p, o); },
  };

  /* ------------------------------------------------------------------ LAVA */
  D.lava = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.set(-2, 3, 3, G(0xffd040)); g.set(2, 3, 3, G(0xffd040));
      for (const [x, z] of [[-3, -2], [-1, 0], [1, -1], [3, -2], [0, 2], [-2, 2], [2, 2]]) { g.box(x, 5, z, x, 6 + ((x + z) & 1), z, p.main); g.set(x, 7 + ((x + z) & 1), z, G(p.glow)); }   // a crown of basalt, glowing tips
      g.box(-1, 1, 3, 1, 1, 3, shade(p.skin, 0.7));
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, (x, y, z) => VX.hash3(x, y, z) > 0.86 ? G(p.glow) : p.main); g.box(-2, 3, 2, 2, 6, 2, G(p.accent)); g.box(-1, 9, -1, 1, 9, 1, p.joint); },   // cracked rock, the core glowing through
    hips(g, p) { g.box(-4, -1, -2, 4, 0, 2, p.second); g.box(-4, -5, -2, 4, -2, 2, p.cloth); },
    arm(g, p, o) { g.box(-2, -4, -2, 2, 0, 2, (x, y, z) => VX.hash3(x, y, z) > 0.85 ? G(p.glow) : p.main); g.box(-1, -7, -1, 1, -5, 1, p.skin); hand(g, p.skin); elbow(g, p, o); },
    wR(g, p) { g.ell(0, 0, 0, 2.2, 2.2, 2.4, (x, y, z) => VX.hash3(x, y, z) > 0.55 ? G(p.glow) : 0x2a1410); },   // molten knuckles
    wL(g, p) { g.ell(0, 0, 0, 2.4, 2.4, 2.6, (x, y, z) => VX.hash3(x, y, z) > 0.7 ? G(p.glow) : p.metal); },   // the slag gauntlet
    leg(g, p, o) { g.box(-1, -5, -1, 1, 0, 1, p.cloth); g.box(-2, -11, -2, 1, -6, 2, (x, y, z) => VX.hash3(x, y, z) > 0.88 ? G(p.glow) : 0x1a1210); knee(g, p, o); },   // obsidian greaves
  };

  /* ------------------------------------------------------------- LIGHTNING */
  D.storm = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 4, -3, 3, 6, 3, 0xe8e8f0); g.box(-3, 0, -4, 3, 5, -4, 0xe8e8f0); g.boxM(3, 1, -3, 3, 4, 0, 0xe8e8f0);   // white hair
      for (const [x, y] of [[-2, 7], [0, 8], [2, 7]]) { g.set(x, y, 0, p.accent); g.set(x, y - 1, 0, p.accent); }       // a crown of bolts
      g.box(-3, 6, -1, 3, 6, 1, p.accent);
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.main); for (let i = 0; i < 6; i++) g.set(i % 2 ? 1 : -1, 7 - i, 3, G(p.accent)); g.box(-4, 0, -2, 4, 0, 2, p.second); g.box(-1, 9, -1, 1, 9, 1, p.joint); },   // a zigzag down the front
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.second); g.box(-4, -6, -3, 4, -1, 3, p.cloth); g.box(-4, -6, -3, 4, -6, 3, p.accent); },
    arm(g, p, o) { sleeve(g, p, o, p.main, p.accent); },
    wR(g, p) { for (const [x, y, z] of [[0, 0, 1], [1, 1, 2], [0, 2, 2], [-1, 1, 3], [0, -1, 2], [1, 0, 3]]) g.set(x, y, z, G(y & 1 ? 0xffffff : p.glow)); },   // sparks off the fingers
    wL(g, p) { g.box(-2, -1, -2, 2, 1, 1, p.metal); g.box(-2, 0, -2, 2, 0, 1, G(p.glow)); },   // the conductor bracer
    leg(g, p, o) { g.box(-1, -5, -1, 1, 0, 1, p.cloth); g.box(-1, -11, -1, 1, -6, 2, p.main); g.box(-1, -6, -1, 1, -6, 1, p.accent); knee(g, p, o); },
  };

  /* ------------------------------------------------------------- EXPLOSION */
  D.blast = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 5, -3, 3, 6, 3, 0x3a2414); g.box(-3, 3, 3, 3, 4, 4, p.dark); g.box(-2, 3, 4, -1, 4, 4, G(p.glow)); g.box(1, 3, 4, 2, 4, 4, G(p.glow));   // goggles
      g.boxM(4, 3, -3, 4, 4, 3, p.dark); for (const [x, y] of [[-2, 1], [2, 0]]) g.set(x, y, 3, shade(p.skin, 0.6));                                       // soot
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.second); g.box(-3, 0, 2, 3, 7, 2, p.cloth); for (const [x, y] of [[-2, 2], [2, 2], [0, 4]]) g.box(x - 1, y, 3, x, y + 1, 3, shade(p.cloth, 0.8)); g.box(-1, 9, -1, 1, 9, 1, p.joint); },   // the apron, pockets
    hips(g, p) { g.box(-4, -1, -2, 4, 0, 2, LEATHER); g.box(-4, -5, -2, 4, -2, 2, p.main); },
    arm(g, p, o) { sleeve(g, p, o, p.main, p.dark); },
    wR(g, p) { g.box(-2, -2, -1, 2, 2, 2, p.dark); g.box(-2, -2, 2, 2, 2, 2, G(p.glow)); },   // a knuckle that glows
    wL(g, p) { g.box(-2, -2, -1, 2, 2, 2, LEATHER); g.box(-1, 2, 0, 1, 3, 1, p.metal); g.set(0, 4, 0, G(0xffd040)); },   // the detonator glove
    leg(g, p, o) { g.box(-1, -5, -1, 1, 0, 1, p.main); g.box(-2, -11, -2, 1, -6, 2, 0x2a2a30); g.box(-2, -11, -2, 1, -11, 3, 0x2a2a30); knee(g, p, o); },
  };

  /* ----------------------------------------------------------------- METAL */
  D.metal = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-4, 3, 3, 4, 4, 4, p.metal); g.box(-3, 3, 4, 3, 3, 4, G(p.glow));                                         // the visor
      g.box(-3, 5, -3, 3, 5, 3, p.main); g.box(-1, 6, -3, 1, 6, 3, p.metal);                                          // a cropped crest
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.cloth); g.box(-4, 3, -3, 4, 8, -3, p.metal); g.box(-4, 3, 3, 4, 8, 3, p.metal); for (const [x, y] of [[-3, 4], [3, 4], [-3, 7], [3, 7]]) g.set(x, y, 4, p.main); g.box(-1, 9, -1, 1, 9, 1, p.joint); },   // plates, rivets
    hips(g, p) { g.box(-4, -1, -2, 4, 0, 2, p.main); g.box(-4, -5, -2, 4, -2, 2, p.cloth); g.box(-4, -3, 3, 4, -3, 3, p.metal); },
    arm(g, p, o) { g.box(-2, 0, -2, 2, 1, 2, p.metal); g.box(-1, -4, -1, 1, 0, 1, p.cloth); g.box(-2, -7, -2, 2, -5, 2, p.metal); hand(g, p.skin); elbow(g, p, o); },
    wR(g, p) { g.box(-2, -2, -1, 2, 2, 2, p.metal); g.box(-2, 1, 2, 2, 2, 3, shade(p.metal, 0.8)); },   // iron knuckles
    wL(g, p) { g.cyl('x', 0, 0, 2, -2, 2, p.main); g.cyl('x', 0, 0, 1, -3, 3, p.metal); for (let z = 2; z <= 6; z++) g.set(0, (z & 1) - 1, z, p.metal); },   // the cable spool
    leg(g, p, o) { g.box(-1, -5, -1, 1, 0, 1, p.cloth); g.box(-2, -11, -2, 1, -6, 2, p.main); g.box(-2, -11, 2, 1, -10, 3, p.metal); knee(g, p, o); },
  };

  /* ---------------------------------------------------------------- SPIRIT */
  D.spirit = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 4, -3, 3, 6, 3, 0xe8e0f8); g.box(-3, -2, -4, 3, 5, -4, 0xe8e0f8);                                       // pale hair
      g.box(-4, 5, -1, 4, 5, 1, p.accent); g.set(0, 5, 4, G(p.glow)); g.set(0, 6, 4, G(0xffffff));                     // the circlet, a lantern gem
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-1, 0, 2, 1, 8, 2, p.second); for (const [x, y] of [[-3, 1], [3, 3], [-2, 6]]) g.set(x, y, 3, G(p.accent)); g.box(-1, 9, -1, 1, 9, 1, p.joint); },   // little lanterns sewn on
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.accent); g.box(-4, -8, -3, 4, -1, 3, p.main); g.box(-4, -8, -3, 4, -8, 3, G(p.glow)); },
    arm(g, p, o) { g.box(-2, -6, -2, 2, 0, 2, p.main); g.box(-2, -6, -2, 2, -6, 2, p.second); g.box(-1, -7, -1, 1, -7, 1, p.skin); hand(g, p.skin); elbow(g, p, o); },
    wR(g, p) { orb(g, p.glow, 0xffffff, 1.3); },
    wL(g, p) { g.box(0, 0, 0, 0, 2, 0, p.dark); g.box(-2, -4, -2, 2, -1, 2, p.accent); g.box(-1, -3, -1, 1, -2, 1, G(p.glow)); g.box(-1, -5, -1, 1, -5, 1, p.accent); },   // a paper lantern
    leg(g, p, o) { g.box(-1, -9, -1, 1, 0, 1, p.main); g.box(-1, -11, -1, 1, -10, 1, G(p.glow)); knee(g, p, o); },   // the hem drifts off into light
  };

  /* ----------------------------------------------------------------- SWAMP */
  D.swamp = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.set(-2, 3, 3, G(p.glow)); g.set(2, 3, 3, G(p.glow));
      g.box(-4, 5, -4, 4, 6, 4, (x, y, z) => VX.hash3(x, y, z) > 0.5 ? p.accent : 0x4a6a2a); g.box(-4, 0, -4, 4, 5, -4, 0x4a6a2a);   // a crown of moss
      for (const x of [-3, 0, 3]) g.box(x, 7, 0, x, 8, 0, 0x6a8a3a); g.set(-1, 0, 4, 0x4a6a2a); g.set(1, 1, 4, 0x4a6a2a);          // reeds, a straggle of weed
    },
    torso(g, p) { g.box(-4, 0, -2, 4, 8, 2, (x, y, z) => VX.hash3(x, y, z) > 0.7 ? p.accent : p.main); g.box(-4, 0, -3, 4, 9, -3, p.cloth); g.box(-1, 9, -1, 1, 9, 1, p.joint); },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.second); g.box(-4, -7, -3, 4, -1, 3, (x, y, z) => y < -5 && VX.hash3(x, y, z) > 0.5 ? -1 : p.main); },   // a ragged cloak of moss
    arm(g, p, o) { sleeve(g, p, o, p.main, p.accent); for (let y = -6; y <= -1; y += 2) g.set(o * 2, y, 0, 0x6a8a3a); },
    wR(g, p) { for (let k = 0; k < 8; k++) { const a = k * 0.8; g.set(Math.round(Math.cos(a) * 1.6), Math.round(Math.sin(a) * 1.6), k - 2, k & 1 ? p.accent : 0x4a6a2a); } },   // a vine coiled round the wrist
    wL(g, p) { for (let z = 0; z <= 9; z++) { g.set(Math.round(Math.sin(z * 0.9)), 0, z, 0x4a6a2a); if (z % 3 === 1) g.set(Math.round(Math.sin(z * 0.9)) + 1, 1, z, p.accent); } },   // the thornwhip
    leg(g, p, o) { g.box(-1, -7, -1, 1, 0, 1, p.main); g.box(-1, -11, -1, 1, -8, 1, p.skin); for (const x of [-1, 1]) g.set(x, -11, 2, 0x4a6a2a); knee(g, p, o); },   // root-wrapped feet
  };

  /* ------------------------------------------------------------ the stances
     Each bender fights in a real martial art, the one their element was built on:
       AIR       Baguazhang: walking the circle, low, the body twisted toward them, lead palm out, rear palm at the elbow
       WATER     Yang-style tai chi: Ward Off, the front arm rounded across the chest, the rear hand down by the hip
       EARTH     Hung Gar: the four-level horse stance, a tiger claw out, the rear fist chambered at the hip
       FIRE      Northern Shaolin long fist: a long, deep bow stance, lead palm out, rear fist at the waist
       BLOOD     chin na: seizing and locking, a clawed hand up, weight light on the front foot
       LAVA      Choy Li Fut: low, the torso angled away to cut the target, lead arm long, rear hand up by the chin
       LIGHTNING Piguazhang: tall and loose, the rear arm wound back for the chop
       EXPLOSION Bajiquan: the higher Baji horse stance, side-on, both fists close with the elbows sunk
       METAL     the Iron Wire of Hung Gar: a square horse stance, both bridges out, every muscle locked
       SPIRIT    Fujian White Crane: the lead hand a crane's beak, the rear arm spread like a wing
       SWAMP     Chen-style tai chi: Lazily Tying Coat, low and wide, the right palm out to the side */
  Object.assign(Anim.READY, {
    air: { torso: [0.08, -0.55, 0], head: [0, 0.5, 0], armL: [-1.75, 0, 0.6], wL: [0.1, 0, 0], armR: [-1.3, 0, 0.75], wR: [0.1, 0, 0], legL: [-0.55, 0, 0.04], legR: [0.45, 0, -0.04], hy: -1.6 },
    water: { torso: [0.05, 0.25, 0], head: [0, -0.25, 0], armL: [-1.35, 0, -0.55], wL: [0.1, 0, 0], armR: [-0.4, 0, -0.18], wR: [0.6, 0, 0], legL: [-0.45, 0, 0.1], legR: [0.3, 0, -0.1], hy: -1.0 },
    earth: { torso: [0.1, 0.15, 0], head: [0, -0.12, 0], armL: [-1.4, -0.2, 0.15], wL: [-0.7, 0, 0], armR: [0.35, 0, -0.18], wR: [1.5, 0, 0], legL: [-0.15, 0, 0.5], legR: [0.1, 0, -0.5], hy: -1.4 },
    flame: { torso: [0.12, 0.45, 0], head: [0, -0.4, 0], armL: [-1.5, -0.2, 0.25], wL: [0.1, 0, 0], armR: [0.35, 0, -0.2], wR: [1.5, 0, 0], legL: [-0.65, 0, 0.08], legR: [0.55, 0, -0.08], hy: -2.0 },
    blood: { torso: [0.0, 0.3, 0], head: [0.05, -0.25, 0], armR: [-1.5, 0.3, -0.05], wR: [-0.6, 0, 0], armL: [-0.5, -0.1, 0.4], wL: [0, 0, 0], legL: [-0.25, 0, 0.05], legR: [0.2, 0, -0.05], hy: -0.35 },
    lava: { torso: [0.15, 0.65, 0], head: [0.02, -0.6, 0], armL: [-1.3, -0.3, 0.55], wL: [1.3, 0, 0], armR: [-2.0, 0.3, 0.35], wR: [1.2, 0, 0], legL: [-0.5, 0, 0.12], legR: [0.45, 0, -0.2], hy: -1.5 },
    storm: { torso: [0.05, 0.55, 0], head: [0, -0.5, 0], armL: [-0.9, -0.2, 0.35], wL: [0.1, 0, 0], armR: [0.5, 0, -0.35], wR: [0.1, 0, 0], legL: [-0.45, 0, 0.1], legR: [0.4, 0, -0.1], hy: -1.0 },
    blast: { torso: [0.1, 0.6, 0], head: [0, -0.55, 0], armL: [-1.2, -0.2, 0.15], wL: [1.5, 0, 0], armR: [-0.9, 0.2, 0.25], wR: [1.5, 0, 0], legL: [-0.25, 0, 0.35], legR: [0.2, 0, -0.35], hy: -0.9 },
    metal: { torso: [0.08, 0.1, 0], head: [0, -0.08, 0], armR: [-1.35, 0, 0.25], wR: [1.5, 0, 0], armL: [-1.35, 0, -0.25], wL: [1.5, 0, 0], legL: [-0.1, 0, 0.5], legR: [0.05, 0, -0.5], hy: -1.4 },
    spirit: { torso: [0.05, 0.4, 0.05], head: [0.05, -0.35, 0.05], armL: [-1.6, -0.2, 0.25], wL: [-1.1, 0, 0], armR: [-0.4, 0, -1.2], wR: [0.3, 0, 0], legL: [-0.3, 0, 0.05], legR: [0.15, 0, -0.08], hy: -0.5 },
    swamp: { torso: [0.15, 0.25, 0], head: [0.05, -0.2, 0], armR: [-1.45, 0, -1.0], wR: [0.1, 0, 0], armL: [-0.5, 0, 0.25], wL: [0.6, 0, 0], legL: [-0.2, 0, 0.45], legR: [0.2, 0, -0.45], hy: -1.5 },
  });

  /* ------------------------------------------------------- the techniques (wind, then strike)
     named for the techniques of each art; the moves in benders.js use them */
  const horse = { legL: [-0.15, 0, 0.5], legR: [0.1, 0, -0.5], hy: -1.6 }, bow = { legL: [-0.65, 0, 0.08], legR: [0.55, 0, -0.08], hy: -2.0 };
  const tuck = { legL: [-0.95, 0, 0.1], legR: [-0.25, 0, -0.1] }, A = (...o) => Object.assign({}, ...o);
  Object.assign(Anim.P, {
    // BAGUAZHANG
    piercePalm: { wind: { torso: [0.1, -0.5, 0], armR: [0.2, 0, -0.3], armL: [-1.2, 0, 0.5], hy: -1.4 }, strike: { torso: [0.12, 0.6, 0], armR: [-1.65, 0, 0.1], wR: [1.5, 0, 0], armL: [-1.0, 0, -0.6], legR: [-0.5, 0, 0], legL: [0.4, 0, 0], hy: -1.5 } },
    palmChange: { wind: { torso: [0.05, 0.7, 0], armL: [-1.5, 0, -0.6], armR: [-0.6, 0, 0.3], hy: -1.6 }, strike: { torso: [0.12, -0.7, 0], armL: [-1.6, 0, 0.1], wL: [0.1, 0, 0], armR: [-1.3, 0, 0.6], legL: [-0.6, 0, 0.15], legR: [0.45, 0, -0.1], hy: -1.8 } },
    pushPalm: { wind: { torso: [0.05, -0.7, 0], armR: [-0.6, 0, 0.3], armL: [-1.3, 0, 0.4], hy: -1.6 }, strike: { torso: [0.12, 0.6, 0], armR: [-1.6, 0, 0.0], wR: [0.1, 0, 0], armL: [-1.2, 0, -0.5], legR: [-0.55, 0, -0.1], legL: [0.45, 0, 0.1], hy: -1.8 } },
    doubleChange: { spin: 1, wind: { torso: [0.1, 0.6, 0], armR: [-1.4, 0, -0.9], armL: [-1.2, 0, 0.9], hy: -1.6 }, strike: { armR: [-1.57, 0, -1.25], wR: [0.1, 0, 0], armL: [-1.57, 0, 1.25], wL: [0.1, 0, 0], legL: [-0.4, 0, 0.2], legR: [0.35, 0, -0.2], hy: -1.9 } },
    touchSky: { wind: { torso: [0.4, 0, 0], armR: [0.3, 0, -0.3], armL: [-0.8, 0, 0.3], hy: -2.2 }, strike: { torso: [-0.25, 0.2, 0], armR: [-3.05, 0, -0.1], wR: [0.1, 0, 0], armL: [-0.3, 0, 0.35], legL: [-0.2, 0, 0], legR: [0.15, 0, 0], hy: 0.3 } },
    rollBall: { wind: { torso: [0.1, 0.4, 0], armR: [-1.9, 0, -0.5], armL: [-1.1, 0, 0.5], hy: -1.4 }, strike: { torso: [-0.1, -0.4, 0], armR: [-1.1, 0, 0.3], armL: [-1.9, 0, -0.3], legL: [-0.3, 0, 0.1], legR: [0.5, 0, -0.1], hy: -1.4 } },
    swallowSkim: { wind: A(tuck, { torso: [0.1, 0.4, 0], armR: [-1.4, 0, 0.8] }), strike: A(tuck, { torso: [0.15, -0.4, 0], armR: [-1.5, 0, -1.15], wR: [0.1, 0, 0], armL: [-1.2, 0, 0.7] }) },
    phoenixNest: { wind: { torso: [-0.3, 0, 0], armR: [-2.9, 0, -0.3], armL: [-2.9, 0, 0.3], legL: [-0.8, 0, 0] }, strike: { torso: [0.6, 0, 0], armR: [-0.7, 0, -0.15], wR: [0.1, 0, 0], armL: [-0.7, 0, 0.15], wL: [0.1, 0, 0], legL: [-1.0, 0, 0], legR: [-0.3, 0, 0] } },
    // YANG TAI CHI
    brushKnee: { wind: { torso: [0, -0.5, 0], armR: [-2.0, 0, -0.6], armL: [-1.0, 0, -0.3], hy: -1.0 }, strike: { torso: [0.1, 0.5, 0], armR: [-1.55, 0, 0.1], wR: [0.1, 0, 0], armL: [-0.25, 0, 0.45], legL: [-0.55, 0, 0.1], legR: [0.4, 0, -0.1], hy: -1.4 } },
    partMane: { wind: { torso: [0, 0.5, 0], armL: [-1.0, 0, -0.5], armR: [-1.7, 0, 0.3], hy: -1.0 }, strike: { torso: [0.08, -0.45, 0], armL: [-1.9, 0, 0.7], wL: [0.1, 0, 0], armR: [-0.3, 0, -0.3], legL: [-0.6, 0, 0.12], legR: [0.45, 0, -0.1], hy: -1.6 } },
    singleWhip: { wind: { torso: [0, 0.6, 0], armR: [-1.5, 0, 0.4], armL: [-1.0, 0, -0.5], hy: -1.2 }, strike: { torso: [0.08, -0.3, 0], armR: [-1.6, 0, -1.45], wR: [-1.0, 0, 0], armL: [-1.55, 0, 0.2], wL: [0.1, 0, 0], legL: [-0.5, 0, 0.25], legR: [0.4, 0, -0.2], hy: -1.8 } },
    craneWings: { wind: { torso: [0.15, 0, 0], armR: [-1.4, 0, 0.6], armL: [-1.4, 0, -0.6], hy: -1.4 }, strike: { torso: [-0.15, 0.2, 0], armR: [-2.9, 0, -0.45], wR: [0.1, 0, 0], armL: [-0.3, 0, 0.35], legL: [-0.25, 0, 0], legR: [0.1, 0, 0], hy: 0.1 } },
    seaNeedle: { wind: { torso: [-0.1, 0.2, 0], armR: [-2.4, 0, -0.3], armL: [-0.9, 0, 0.3] }, strike: { torso: [0.7, 0.15, 0], armR: [-0.75, 0, 0.05], wR: [1.5, 0, 0], armL: [-0.4, 0, 0.3], legL: [-0.35, 0, 0], legR: [0.25, 0, 0], hy: -2.0 } },
    fanBack: { wind: A(tuck, { armR: [-1.2, 0, 0.3], armL: [-1.2, 0, -0.3] }), strike: A(tuck, { torso: [0.05, -0.4, 0], armR: [-2.7, 0, -0.6], armL: [-1.6, 0, 0.1], wL: [0.1, 0, 0] }) },
    earFists: { wind: { torso: [0.2, 0, 0], armR: [-0.4, 0, -0.9], armL: [-0.4, 0, 0.9], legL: [-0.8, 0, 0] }, strike: { torso: [0.45, 0, 0], armR: [-1.9, 0, 0.35], wR: [1.5, 0, 0], armL: [-1.9, 0, -0.35], wL: [1.5, 0, 0], legL: [-0.9, 0, 0], legR: [-0.3, 0, 0] } },
    taiPush: { wind: { torso: [-0.15, 0, 0], armR: [-1.0, 0, 0.2], armL: [-1.0, 0, -0.2], legL: [-0.3, 0, 0], legR: [0.3, 0, 0], hy: -0.8 }, strike: { torso: [0.15, 0.1, 0], armR: [-1.55, 0, 0.05], wR: [0.1, 0, 0], armL: [-1.55, 0, -0.05], wL: [0.1, 0, 0], legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1], hy: -1.5 } },
    taiPress: { wind: { torso: [-0.1, 0.3, 0], armL: [-1.2, 0, -0.5], armR: [-1.0, 0, 0.5], hy: -0.9 }, strike: { torso: [0.15, 0.1, 0], armL: [-1.5, 0, -0.35], armR: [-1.5, 0, 0.35], wR: [0.1, 0, 0], legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1], hy: -1.5 } },
    cloudHands: { wind: { torso: [0.05, -0.5, 0], armR: [-1.7, 0, -0.2], armL: [-0.8, 0, 0.3], legL: [0, 0, 0.35], legR: [0, 0, -0.35], hy: -1.0 }, strike: { torso: [0.05, 0.5, 0], armR: [-0.8, 0, -0.3], armL: [-1.7, 0, 0.2], legL: [0, 0, 0.35], legR: [0, 0, -0.35], hy: -1.0 } },
    commence: { wind: { armR: [-1.5, 0, -0.1], armL: [-1.5, 0, 0.1], wR: [0.1, 0, 0], wL: [0.1, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], legL: [0, 0, 0.15], legR: [0, 0, -0.15], hy: -0.3 }, strike: { armR: [-0.6, 0, -0.15], armL: [-0.6, 0, 0.15], torso: [0.05, 0, 0], head: [0.1, 0, 0], legL: [0, 0, 0.15], legR: [0, 0, -0.15], hy: -1.2 } },
    // HUNG GAR
    straightBridge: { wind: A(horse, { torso: [0.1, -0.2, 0], armR: [0.4, 0, -0.15], armL: [-1.4, 0, 0.1] }), strike: A(horse, { torso: [0.12, 0.3, 0], armR: [-1.6, 0, 0.12], wR: [1.5, 0, 0], armL: [0.35, 0, 0.15], hy: -1.8 }) },
    pressBridge: { wind: { torso: [0, -0.2, 0], armL: [-1.8, 0, -0.2], wL: [-0.7, 0, 0], armR: [0.35, 0, -0.15], hy: -1.4 }, strike: { torso: [0.15, 0.35, 0], armL: [-0.9, 0, -0.2], wL: [-0.7, 0, 0], armR: [-1.6, 0, 0.1], wR: [1.5, 0, 0], legL: [-0.45, 0, 0.2], legR: [0.35, 0, -0.2], hy: -1.8 } },
    inchBridge: { wind: A(horse, { torso: [0.1, -0.3, 0], armR: [-1.0, 0, 0.4] }), strike: { torso: [0.12, 0.35, 0], armR: [-1.4, 0, 0.25], wR: [1.5, 0, 0], armL: [0.3, 0, 0.15], legL: [-0.3, 0, 0.3], legR: [-0.2, 0, -0.35], hy: -1.6 } },
    liftBridge: { wind: { torso: [0.35, 0, 0], armR: [0.2, 0, -0.3], hy: -2.2 }, strike: { torso: [-0.25, 0.2, 0], armR: [-2.7, 0, 0.15], wR: [1.5, 0, 0], armL: [0.3, 0, 0.2], hy: 0 } },
    tigerClaws: { wind: { torso: [-0.1, 0, 0], armR: [0.35, 0, -0.2], armL: [0.35, 0, 0.2], hy: -1.4 }, strike: { torso: [0.2, 0.1, 0], armR: [-1.85, 0, 0.1], wR: [-0.7, 0, 0], armL: [-1.15, 0, -0.1], wL: [-0.7, 0, 0], legL: [-0.55, 0, 0.15], legR: [0.45, 0, -0.15], hy: -2.0 } },
    craneBeak: { wind: A(tuck, { armR: [-0.4, 0, -0.6] }), strike: A(tuck, { torso: [0.1, 0.3, 0], armR: [-1.5, 0, -0.1], wR: [-1.2, 0, 0], armL: [-0.3, 0, 1.0] }) },
    tameTiger: { wind: { torso: [-0.3, 0, 0], armR: [-2.8, 0, -0.3], armL: [-2.8, 0, 0.3], legL: [-0.8, 0, 0] }, strike: { torso: [0.6, 0, 0], armR: [-0.7, 0, -0.2], wR: [-0.7, 0, 0], armL: [-0.7, 0, 0.2], wL: [-0.7, 0, 0], legL: [-1.0, 0, 0], legR: [-0.3, 0, 0] } },
    horseHold: { wind: A(horse, { torso: [0, 0, 0], head: [0, 0, 0], armR: [0.35, 0, -0.2], armL: [0.35, 0, 0.2], wR: [1.5, 0, 0], wL: [1.5, 0, 0] }), strike: A(horse, { torso: [0.05, 0, 0], head: [0.05, 0, 0], armR: [0.4, 0, -0.18], armL: [0.4, 0, 0.18], wR: [1.5, 0, 0], wL: [1.5, 0, 0], hy: -2.1 }) },
    // NORTHERN SHAOLIN LONG FIST
    bowPunch: { wind: A(bow, { torso: [0.1, -0.4, 0], armR: [0.4, 0, -0.2], armL: [-1.5, 0, 0.2] }), strike: A(bow, { torso: [0.15, 0.7, 0], armR: [-1.62, 0, 0.05], wR: [1.5, 0, 0], armL: [0.4, 0, 0.2], legL: [-0.7, 0, 0.08], legR: [0.6, 0, -0.08], hy: -2.3 }) },
    heartPunch: { wind: { torso: [0.1, -0.5, 0], armR: [0.4, 0, -0.2], hy: -1.4 }, strike: A(bow, { torso: [0.3, 0.75, 0], armR: [-1.4, 0, 0.1], wR: [1.5, 0, 0], armL: [-0.3, 0, 0.6], hy: -2.4 }) },
    springLeg: { wind: { legR: [-0.8, 0, 0], armR: [-1.4, 0, -1.0], armL: [-1.4, 0, 1.0], torso: [0, 0, 0] }, strike: { legR: [-1.55, 0, 0], legL: [0.12, 0, 0], torso: [-0.2, 0, 0], armR: [-1.5, 0, -1.25], wR: [0.1, 0, 0], armL: [-1.5, 0, 1.25], wL: [0.1, 0, 0], hy: 0 } },
    whirlwindKick: { spin: 1, wind: { torso: [0.3, -0.4, 0], armR: [-1.0, 0, -0.9], armL: [-1.0, 0, 0.9], hy: -2.0 }, strike: { legR: [-2.6, 0, -0.3], legL: [0.3, 0, 0], torso: [-0.3, 0, 0], armR: [-2.5, 0, -0.5], armL: [-2.5, 0, 0.5], hy: 0.8 } },
    plumBlossom: { wind: { torso: [0.1, 0.3, 0], armR: [-1.5, 0, 0.3], armL: [-1.5, 0, -0.3], hy: -1.2 }, strike: { torso: [0.1, 0.1, 0], armR: [-1.75, 0, -0.65], wR: [0.1, 0, 0], armL: [-1.75, 0, 0.65], wL: [0.1, 0, 0], legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1], hy: -1.6 } },
    flyingKick: { wind: { legL: [-1.3, 0, 0], legR: [0.2, 0, 0], torso: [0.1, 0, 0], armL: [-2.4, 0, 0.5] }, strike: { legR: [-1.65, 0, 0], legL: [-0.9, 0, 0], torso: [-0.3, 0, 0], armR: [-1.6, 0, 0], wR: [0.1, 0, 0], armL: [-2.6, 0, 0.5] } },
    lotusKick: { wind: { legR: [-2.6, 0, 0.6], torso: [-0.3, 0.3, 0], armR: [-1.4, 0, -0.9], armL: [-1.4, 0, 0.9] }, strike: { legR: [-0.4, 0, -0.9], legL: [-0.6, 0, 0], torso: [0.4, -0.3, 0], armR: [-1.4, 0, -0.9], wR: [0.1, 0, 0], armL: [-1.4, 0, 0.9] } },
    // CHIN NA
    tendonGrip: { wind: { torso: [0, -0.2, 0], armR: [-1.2, 0, -0.3], wR: [0, 0, 0] }, strike: { torso: [0.08, 0.35, 0], armR: [-1.6, 0.8, 0.05], wR: [-0.9, 0, 0], armL: [-0.6, 0, 0.3], legR: [-0.3, 0, 0], legL: [0.2, 0, 0], hy: -0.8 } },
    boneTwist: { wind: { armR: [-1.5, 0, 0.1], wR: [-0.8, 0, 0], armL: [-1.5, 0, -0.1], wL: [-0.8, 0, 0], torso: [0.1, 0, 0] }, strike: { torso: [-0.15, -0.4, 0], armR: [-1.3, 1.2, 0.2], wR: [-0.8, 0, 0], armL: [-1.3, -1.2, -0.2], wL: [-0.8, 0, 0], legL: [-0.4, 0, 0], legR: [0.35, 0, 0], hy: -0.9 } },
    breathSeal: { wind: { torso: [0, -0.3, 0], armR: [-2.0, 0, -0.4] }, strike: { torso: [0.15, 0.5, 0], armR: [-1.75, 0, 0.0], wR: [0.1, 0, 0], armL: [-1.2, 0, -0.4], legR: [-0.4, 0, 0], legL: [0.3, 0, 0], hy: -1.0 } },
    vesselSeal: { wind: { torso: [0.2, 0, 0], armR: [-0.6, 0, -0.2], wR: [1.5, 0, 0], hy: -1.0 }, strike: { torso: [-0.2, 0.25, 0], head: [-0.25, -0.2, 0], armR: [-2.6, 0, 0.0], wR: [1.5, 0, 0], armL: [-0.3, 0, 0.5], hy: 0 } },
    smallCatch: { wind: { torso: [0, -0.3, 0], armL: [-1.6, 0, -0.1], wL: [-0.8, 0, 0], armR: [-0.4, 0, -0.3] }, strike: { torso: [0.1, 0.6, 0], armL: [0.3, 0, 0.3], wL: [-0.8, 0, 0], armR: [-1.55, 0, 0.1], wR: [0.1, 0, 0], legL: [-0.5, 0, 0.1], legR: [0.4, 0, -0.1], hy: -1.2 } },
    eagleClaw: { wind: A(tuck, { armR: [-2.6, 0, -0.3], wR: [-0.4, 0, 0] }), strike: A(tuck, { torso: [0.3, 0.2, 0], armR: [-1.2, 0, 0.1], wR: [-1.0, 0, 0], armL: [-0.6, 0, 0.5] }) },
    captureHold: { wind: { torso: [-0.3, 0, 0], armR: [-2.7, 0, -0.3], wR: [-0.8, 0, 0], armL: [-2.7, 0, 0.3], wL: [-0.8, 0, 0], legL: [-0.8, 0, 0] }, strike: { torso: [0.5, 0, 0], armR: [0.1, 0, -0.3], wR: [-0.8, 0, 0], armL: [0.1, 0, 0.3], wL: [-0.8, 0, 0], legL: [-1.0, 0, 0], legR: [-0.3, 0, 0] } },
    // CHOY LI FUT
    chopJab: { wind: { torso: [0.12, -0.2, 0], armR: [-1.1, 0, -0.4], hy: -1.3 }, strike: { torso: [0.15, 0.75, 0], armR: [-1.62, 0, 0.12], wR: [1.5, 0, 0], armL: [-1.0, 0, 0.6], legL: [-0.55, 0, 0.12], legR: [0.5, 0, -0.2], hy: -1.8 } },
    sowSwing: { wind: { torso: [0.1, -0.9, 0], armR: [-1.5, 0, -1.5], wR: [1.3, 0, 0], hy: -1.4 }, strike: { torso: [0.15, 0.9, 0], armR: [-1.55, 0, 0.75], wR: [1.4, 0, 0], armL: [-0.9, 0, 0.6], legL: [-0.55, 0, 0.12], legR: [0.5, 0, -0.2], hy: -1.8 } },
    gwaBackfist: { wind: { torso: [-0.2, 0.3, 0], armR: [-3.0, 0, 0.2], wR: [1.3, 0, 0] }, strike: { torso: [0.25, 0.4, 0], armR: [-1.35, 0, 0.05], wR: [1.2, 0, 0], armL: [-1.0, 0, 0.5], legL: [-0.5, 0, 0.1], legR: [0.45, 0, -0.15], hy: -1.6 } },
    powUpper: { wind: { torso: [0.3, -0.7, 0], armR: [0.7, 0, -0.5], wR: [1.3, 0, 0], hy: -2.2 }, strike: { torso: [-0.25, 0.6, 0], armR: [-2.7, 0, 0.3], wR: [1.4, 0, 0], armL: [-0.6, 0, 0.5], hy: 0.2 } },
    kupHammer: { wind: { torso: [-0.4, 0.2, 0], armR: [-3.1, 0, -0.1], wR: [1.3, 0, 0], hy: -0.4 }, strike: { torso: [0.6, 0.2, 0], armR: [-0.9, 0, 0.1], wR: [1.4, 0, 0], armL: [-0.6, 0, 0.5], legL: [-0.6, 0, 0.1], legR: [0.5, 0, -0.15], hy: -2.0 } },
    nailKick: { wind: { legR: [-2.2, 0, 0], torso: [-0.3, 0, 0], armR: [-1.2, 0, -0.8], armL: [-1.2, 0, 0.8] }, strike: { legR: [-0.3, 0, 0], legL: [-0.9, 0, 0], torso: [0.5, 0, 0], armR: [-1.2, 0, -0.9], armL: [-1.2, 0, 0.9] } },
    springKick: { wind: A(tuck, { torso: [0.15, 0.3, 0], armR: [-1.6, 0, 0.3] }), strike: { legR: [-1.6, 0, 0.1], legL: [-0.4, 0, 0], torso: [-0.3, 0.3, 0], armR: [-1.4, 0, 0.5], armL: [-0.6, 0, 0.8] } },
    // PIGUAZHANG
    chopPalm: { wind: { torso: [-0.1, -0.4, 0], armR: [-2.9, 0, -0.3], wR: [0.1, 0, 0], armL: [-1.2, 0, 0.3] }, strike: { torso: [0.2, 0.6, 0], armR: [-1.2, 0, 0.1], wR: [0.1, 0, 0], armL: [0.6, 0, 0.3], legL: [-0.5, 0, 0.1], legR: [0.45, 0, -0.1], hy: -1.4 } },
    chopPalmL: { wind: { torso: [-0.1, 0.4, 0], armL: [-2.9, 0, 0.3], wL: [0.1, 0, 0], armR: [-1.2, 0, -0.3] }, strike: { torso: [0.2, -0.6, 0], armL: [-1.2, 0, -0.1], wL: [0.1, 0, 0], armR: [0.6, 0, -0.3], legL: [-0.5, 0, 0.1], legR: [0.45, 0, -0.1], hy: -1.4 } },
    hangPalm: { wind: { torso: [0.2, -0.3, 0], armR: [0.6, 0, -0.2], wR: [0.1, 0, 0] }, strike: { torso: [-0.1, 0.5, 0], armR: [-2.3, 0, 0.1], wR: [0.1, 0, 0], armL: [-0.6, 0, 0.4], legL: [-0.45, 0, 0.1], legR: [0.4, 0, -0.1], hy: -1.0 } },
    wheelPalms: { alt: ['chopPalm', 'chopPalmL'], wind: { torso: [-0.1, -0.4, 0], armR: [-2.9, 0, -0.3], armL: [0.6, 0, 0.3] }, strike: { torso: [0.2, 0.6, 0], armR: [-1.2, 0, 0.1], armL: [0.6, 0, 0.3], hy: -1.4 } },
    greenDragon: { wind: { torso: [0.3, 0, 0], armR: [0.5, 0, -0.3], armL: [0.5, 0, 0.3], hy: -2.0 }, strike: { torso: [-0.25, 0.1, 0], armR: [-2.9, 0, -0.25], wR: [0.1, 0, 0], armL: [-2.9, 0, 0.25], wL: [0.1, 0, 0], hy: 0.4 } },
    splitPalm: { wind: { torso: [-0.2, 0.2, 0], armR: [-3.1, 0, 0], wR: [0.1, 0, 0], armL: [-1.4, 0, 0.3] }, strike: { torso: [0.55, 0.3, 0], armR: [-0.9, 0, 0.05], wR: [0.1, 0, 0], armL: [0.7, 0, 0.3], legL: [-0.6, 0, 0.1], legR: [0.5, 0, -0.1], hy: -2.0 } },
    whipPalm: { wind: A(tuck, { torso: [0.1, 0.4, 0], armR: [-1.5, 0, 0.9] }), strike: A(tuck, { torso: [0.1, -0.5, 0], armR: [-1.5, 0, -1.2], wR: [0.1, 0, 0], armL: [-0.6, 0, 0.6] }) },
    // BAJIQUAN
    stampPunch: { wind: { torso: [0.1, -0.3, 0], armR: [0.2, 0, -0.2], armL: [-1.3, 0, 0.2], legR: [0.3, 0, -0.1], hy: -0.6 }, strike: { torso: [0.12, 0.75, 0], armR: [-1.6, 0, 0.1], wR: [1.5, 0, 0], armL: [0.4, 0, 0.3], legL: [-0.55, 0, 0.2], legR: [0.35, 0, -0.25], hy: -1.7 } },
    topElbow: { wind: { torso: [0.1, -0.3, 0], armR: [-0.6, 0, -0.4], hy: -1.0 }, strike: { torso: [0.15, 1.0, 0], armR: [-1.5, 0, 1.1], wR: [-1.5, 0, 0], armL: [-1.4, 0, -0.9], legL: [-0.3, 0, 0.35], legR: [0.25, 0, -0.35], hy: -1.5 } },
    tiKnee: { wind: { legR: [0.45, 0, 0], hy: -0.6, armR: [-1.4, 0, -0.1], armL: [-1.4, 0, 0.1] }, strike: { legR: [-1.9, 0, 0], legL: [0.3, 0, 0], torso: [0.2, 0, 0], armR: [0.3, 0, -0.3], wR: [1.5, 0, 0], armL: [0.3, 0, 0.3], wL: [1.5, 0, 0], hy: 0.8 } },
    kaoLean: { wind: { torso: [0.3, 0.3, 0], armR: [-0.5, 0, -0.2], armL: [-0.5, 0, 0.2], hy: -2.0 }, strike: { torso: [-0.2, 1.3, 0.35], head: [0, -0.9, -0.2], armR: [-0.3, 0, -0.3], armL: [-0.2, 0, 0.3], legL: [-0.6, 0, 0.2], legR: [0.4, 0, -0.2], hy: -0.6 } },
    embraceSplit: { wind: { torso: [0.15, 0, 0], armR: [-1.5, 0, 0.6], armL: [-1.5, 0, -0.6], hy: -1.0 }, strike: { torso: [-0.1, 0, 0], armR: [-1.6, 0, -1.3], wR: [0.1, 0, 0], armL: [-1.6, 0, 1.3], wL: [0.1, 0, 0], legL: [-0.3, 0, 0.3], legR: [0.2, 0, -0.3], hy: -1.4 } },
    risingFoot: { wind: A(tuck, { armR: [-0.8, 0, -0.6], armL: [-0.8, 0, 0.6] }), strike: { legR: [-1.4, 0, 0], legL: [-0.3, 0, 0], torso: [-0.25, 0, 0], armR: [-0.8, 0, -0.6], armL: [-0.8, 0, 0.6] } },
    poundElbow: { wind: { torso: [-0.3, -0.3, 0], armR: [-2.8, 0, -0.4], legL: [-0.8, 0, 0] }, strike: { torso: [0.7, 0.5, 0], armR: [-0.4, 0, 0.6], wR: [-1.5, 0, 0], armL: [-0.5, 0, 0.5], legL: [-1.0, 0, 0], legR: [-0.3, 0, 0] } },
    // IRON WIRE
    hardBridge: { wind: A(horse, { torso: [0.08, -0.1, 0], armR: [0.35, 0, -0.15], armL: [-1.35, 0, -0.25] }), strike: A(horse, { torso: [0.1, 0.25, 0], armR: [-1.6, 0, 0.1], wR: [1.5, 0, 0], armL: [-1.0, 0, -0.3], wL: [1.5, 0, 0], hy: -1.8 }) },
    separateBridge: { wind: A(horse, { armR: [-1.4, 0, 0.7], armL: [-1.4, 0, -0.7], wR: [1.5, 0, 0], wL: [1.5, 0, 0] }), strike: A(horse, { torso: [0.1, 0.05, 0], armR: [-1.5, 0, -0.9], wR: [1.5, 0, 0], armL: [-1.5, 0, 0.9], wL: [1.5, 0, 0], hy: -1.8 }) },
    keepBridge: { wind: A(horse, { torso: [0.08, 0.3, 0], armR: [-1.6, 0, -0.5], wR: [1.5, 0, 0] }), strike: A(horse, { torso: [0.1, -0.4, 0], armR: [-1.6, 0, 0.9], wR: [-1.4, 0, 0], armL: [-1.4, 0, -0.6], wL: [1.5, 0, 0], hy: -1.8 }) },
    matchBridge: { wind: { torso: [0.3, 0, 0], armR: [-0.5, 0, -0.2], armL: [-0.5, 0, 0.2], wR: [1.5, 0, 0], wL: [1.5, 0, 0], hy: -2.2 }, strike: { torso: [-0.2, 0, 0], armR: [-2.4, 0, -0.15], wR: [1.5, 0, 0], armL: [-2.4, 0, 0.15], wL: [1.5, 0, 0], hy: -0.4 } },
    controlBridge: { wind: { torso: [0.1, 0.3, 0], armR: [-1.6, 0, 0.1], wR: [1.5, 0, 0], hy: -1.2 }, strike: { torso: [-0.1, -0.5, 0], armR: [0.2, 0, -0.3], wR: [1.5, 0, 0], armL: [-1.0, 0, -0.2], wL: [1.5, 0, 0], legL: [-0.4, 0, 0.3], legR: [0.3, 0, -0.3], hy: -1.6 } },
    circBridge: { wind: A(tuck, { armR: [-2.2, 0, -0.5], wR: [1.5, 0, 0] }), strike: A(tuck, { torso: [0.15, 0.3, 0], armR: [-1.3, 0, 0.6], wR: [1.5, 0, 0], armL: [-1.0, 0, -0.3] }) },
    stableBridge: { wind: { torso: [-0.3, 0, 0], armR: [-2.4, 0, -0.2], armL: [-2.4, 0, 0.2], wR: [1.5, 0, 0], wL: [1.5, 0, 0], legL: [-0.8, 0, 0] }, strike: { torso: [0.6, 0, 0], armR: [-0.9, 0, -0.15], wR: [1.5, 0, 0], armL: [-0.9, 0, 0.15], wL: [1.5, 0, 0], legL: [-1.0, 0, 0], legR: [-0.3, 0, 0] } },
    // WHITE CRANE
    beakPeck: { wind: { torso: [0.05, -0.2, 0], armR: [-1.2, 0, -0.5], wR: [0, 0, 0] }, strike: { torso: [0.1, 0.5, 0], armR: [-1.65, 0, 0.1], wR: [-1.2, 0, 0], armL: [-0.4, 0, 1.2], legL: [-0.45, 0, 0.05], legR: [0.3, 0, -0.08], hy: -1.0 } },
    // the Spirit Lance: thrown from exactly where the old pointing hand was (the shot's start, and the trials, rest on it), the rear arm a wing
    beakThrust: { wind: { armR: [-2.6, 0, -0.2], wR: [1.1, 0, 0], torso: [0, -0.3, 0], armL: [-0.4, 0, 1.2] }, strike: { armR: [-1.7, 0, 0.1], wR: [1.6, 0, 0], torso: [0.15, 0.4, 0], armL: [-0.4, 0, 1.2], hy: -0.6, legR: [0.4, 0, 0], legL: [-0.4, 0, 0] } },
    craneWing: { wind: { torso: [0.05, 0.4, 0], armR: [-1.4, 0, 0.8] }, strike: { torso: [0.1, -0.4, 0], armR: [-1.5, 0, -1.3], wR: [0.1, 0, 0], armL: [-0.5, 0, 0.9], legL: [-0.4, 0, 0.05], legR: [0.3, 0, -0.08], hy: -0.9 } },
    spreadWings: { spin: 1, wind: { torso: [0.15, 0, 0], armR: [-0.6, 0, 0.3], armL: [-0.6, 0, -0.3], hy: -1.2 }, strike: { torso: [0, 0, 0], armR: [-1.5, 0, -1.45], wR: [0.1, 0, 0], armL: [-1.5, 0, 1.45], wL: [0.1, 0, 0], legL: [-0.3, 0, 0.2], legR: [0.25, 0, -0.2], hy: -1.2 } },
    flyingCrane: { wind: { torso: [0.3, 0, 0], armR: [0.5, 0, -0.6], armL: [0.5, 0, 0.6], hy: -2.0 }, strike: { torso: [-0.15, 0, 0], armR: [-2.6, 0, -0.9], wR: [0.1, 0, 0], armL: [-2.6, 0, 0.9], wL: [0.1, 0, 0], legR: [-1.2, 0, 0], legL: [0.05, 0, 0], hy: 0.6 } },
    shakeA: { wind: { torso: [0.2, 0, 0], armR: [-1.0, 0, 0.3], armL: [-1.0, 0, -0.3] }, strike: { torso: [-0.15, 0.08, 0], armR: [-1.4, 0, -0.9], wR: [0.1, 0, 0], armL: [-1.4, 0, 0.9], wL: [0.1, 0, 0], hy: -0.8 } },
    shakeB: { wind: { torso: [0.2, 0, 0], armR: [-1.0, 0, 0.3], armL: [-1.0, 0, -0.3] }, strike: { torso: [-0.1, -0.08, 0], armR: [-1.5, 0, -0.75], wR: [0.3, 0, 0], armL: [-1.5, 0, 0.75], wL: [0.3, 0, 0], hy: -1.0 } },
    shakingCrane: { alt: ['shakeA', 'shakeB'], wind: { torso: [0.2, 0, 0], armR: [-1.0, 0, 0.3], armL: [-1.0, 0, -0.3], hy: -1.0 }, strike: { torso: [-0.15, 0, 0], armR: [-1.4, 0, -0.9], wR: [0.1, 0, 0], armL: [-1.4, 0, 0.9], wL: [0.1, 0, 0], hy: -0.8 } },
    feedPeck: { wind: { torso: [-0.2, 0, 0], armR: [-2.6, 0, -0.2], armL: [-0.4, 0, 1.2], legL: [-0.8, 0, 0] }, strike: { torso: [0.55, 0.1, 0], armR: [-0.8, 0, 0.05], wR: [-1.2, 0, 0], armL: [-0.4, 0, 1.2], legL: [-1.0, 0, 0], legR: [-0.3, 0, 0] } },
    craneStand: { wind: { torso: [0, 0, 0], armR: [-0.6, 0, -0.6], armL: [-0.6, 0, 0.6], hy: -0.6 }, strike: { torso: [-0.05, 0, 0], head: [-0.1, 0, 0], armR: [-1.1, 0, -1.25], wR: [-1.1, 0, 0], armL: [-1.1, 0, 1.25], wL: [-1.1, 0, 0], legR: [-1.0, 0, 0], legL: [0.02, 0, 0], hy: 0.2 } },
    // CHEN TAI CHI
    hiddenPunch: { wind: { torso: [0.1, -0.6, 0], armR: [0.4, 0, -0.2], armL: [-1.4, 0, -0.3], legL: [-0.4, 0, 0.3], legR: [0.3, 0, -0.3], hy: -1.8 }, strike: { torso: [0.15, 0.85, 0], armR: [-1.62, 0, 0.1], wR: [1.5, 0, 0], armL: [0.45, 0, 0.3], legL: [-0.55, 0, 0.3], legR: [0.4, 0, -0.3], hy: -2.2 } },
    drapeFist: { wind: { torso: [-0.1, 0.4, 0], armR: [-2.4, 0, 0.8], wR: [1.4, 0, 0] }, strike: { torso: [0.2, -0.5, 0], armR: [-1.2, 0, -0.9], wR: [1.4, 0, 0], armL: [-0.6, 0, 0.5], legL: [-0.5, 0, 0.25], legR: [0.4, 0, -0.25], hy: -1.8 } },
    stirA: { wind: { torso: [0.1, 0.5, 0] }, strike: { torso: [0.12, 0.4, 0], armR: [-1.4, 0, 0.6], wR: [0.1, 0, 0], armL: [-1.0, 0, 0.6], legL: [-0.5, 0, 0.25], legR: [0.4, 0, -0.25], hy: -1.8 } },
    stirB: { wind: { torso: [0.1, -0.5, 0] }, strike: { torso: [0.12, -0.4, 0], armR: [-1.0, 0, -0.6], wR: [0.1, 0, 0], armL: [-1.4, 0, -0.6], legL: [-0.5, 0, 0.25], legR: [0.4, 0, -0.25], hy: -1.8 } },
    yellowDragon: { alt: ['stirA', 'stirB'], wind: { torso: [0.1, 0.5, 0], armR: [-1.0, 0, -0.5], armL: [-1.4, 0, -0.5], hy: -1.6 }, strike: { torso: [0.12, 0.4, 0], armR: [-1.4, 0, 0.6], armL: [-1.0, 0, 0.6], legL: [-0.5, 0, 0.25], legR: [0.4, 0, -0.25], hy: -1.8 } },
    poundMortar: { wind: { torso: [0.3, 0, 0], armR: [0.3, 0, 0.1], armL: [-0.9, 0, -0.4], hy: -2.2 }, strike: { torso: [-0.1, 0.1, 0], armR: [-2.5, 0, 0.2], wR: [1.5, 0, 0], armL: [-0.9, 0, -0.4], wL: [0.1, 0, 0], legR: [-1.3, 0, 0], legL: [0.05, 0, 0], hy: 0.6 } },
    sixSealing: { wind: { torso: [-0.1, -0.2, 0], armR: [-1.9, 0, -0.4], armL: [-1.9, 0, 0.4], hy: -1.0 }, strike: { torso: [0.2, 0.15, 0], armR: [-1.35, 0, 0.15], wR: [0.1, 0, 0], armL: [-1.35, 0, -0.15], wL: [0.1, 0, 0], legL: [-0.55, 0, 0.25], legR: [0.45, 0, -0.25], hy: -1.9 } },
    doubleJump: { wind: { legL: [-1.4, 0, 0], legR: [0.2, 0, 0], torso: [0.1, 0, 0], armL: [-2.4, 0, 0.6] }, strike: { legR: [-1.65, 0, 0], legL: [-0.8, 0, 0], torso: [-0.3, 0, 0], armR: [-1.6, 0, 0], wR: [0.1, 0, 0], armL: [-2.4, 0, 0.6] } },
    poundGround: { wind: { torso: [-0.3, 0, 0], armR: [-2.9, 0, -0.2], wR: [1.5, 0, 0], legL: [-0.8, 0, 0] }, strike: { torso: [0.8, 0, 0], armR: [-0.5, 0, 0.1], wR: [1.5, 0, 0], armL: [-0.5, 0, 0.6], legL: [-0.9, 0, 0.1], legR: [0.3, 0, 0] } },
  });

  /* Baguazhang is walked, not run: low and level, gliding round them with the guard held up */
  const run0 = Anim.run;
  Anim.run = (base, phase, speed, style) => {
    const o = run0(base, phase, speed, style);
    if (style === 'air') { const c = Math.cos(phase); o.armR = base.armR.slice(); o.armL = base.armL.slice(); o.wR = base.wR.slice(); o.wL = base.wL.slice(); o.torso = [0.1, base.torso[1] * 0.8, 0]; o.head = base.head.slice(); o.legL[0] *= 0.8; o.legR[0] *= 0.8; o.hy = -1.3 - Math.abs(c) * 0.15; }
    return o;
  };
})();
