/* ============================================================================
   sea_look.js -- how the LOVERS OF THE SEA crew look and stand (models.js
   explains D[line]; anim.js a pose).
   ========================================================================== */
(function () {
  'use strict';
  const { D, H } = Models;
  const { elbow, knee, hand, eyes, shade, G, WOOD, WOOD2, LEATHER, WHITE } = H;
  const BRASS = 0xd8a830, BLACK = 0x16161c, ROPE = 0xb08a5a;
  const tricorne = (g, c, trim) => { g.box(-5, 5, -4, 5, 5, 4, c); g.box(-4, 6, -3, 4, 7, 3, c); g.box(-5, 6, 3, 5, 6, 4, trim); g.boxM(5, 6, -4, 5, 6, 3, trim); g.box(-1, 6, -5, 1, 7, -4, c); };

  /* --------------------------------------------------------------- CAPTAIN */
  D.captain = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 1, -4, 3, 5, -3, 0x8a3a1a); g.boxM(3, 0, -3, 3, 4, 1, 0x8a3a1a); for (let y = -3; y <= 0; y++) g.box(-2, y, -4, 2, y, -4, 0x8a3a1a);   // auburn hair, a queue
      tricorne(g, p.main, p.accent); for (let i = 0; i < 4; i++) g.set(-3 + i, 8 + (i > 1 ? 1 : 0), -1 + i, WHITE);                               // the plume
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-1, 4, 2, 1, 8, 2, p.second); g.box(-1, 6, 3, 1, 7, 3, WHITE);                                     // waistcoat, cravat
      for (const y of [1, 3, 5]) { g.set(-2, y, 3, p.accent); g.set(2, y, 3, p.accent); }                                                         // gold buttons
      g.box(-4, 0, -2, 4, 0, 2, p.cloth); g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, LEATHER); g.set(0, -1, 3, p.accent); g.box(-4, -5, -3, -1, -1, -3, p.main); g.box(1, -5, -3, 4, -1, -3, p.main); g.box(-4, -4, 3, -2, -1, 3, p.main); g.box(2, -4, 3, 4, -1, 3, p.main); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.main); g.box(-2, 1, -2, 2, 1, 2, p.accent); g.box(-2, 0, -2, 2, 0, 2, shade(p.accent, 0.8));                    // epaulette
      g.box(-1, -7, -1, 1, -5, 1, p.main); g.box(-1, -6, -1, 1, -5, 1, p.accent);
      hand(g, WHITE); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, 2, BLACK); g.box(-1, 0, 2, 1, 0, 3, BRASS); g.box(1, -1, -2, 1, 0, 2, BRASS);                                       // grip, guard, stirrup bow
      for (let z = 4; z <= 15; z++) { const y = Math.round(Math.pow((z - 4) / 11, 2) * 1.6); g.set(0, y, z, p.metal); g.set(0, y + 1, z, shade(p.metal, 0.82)); }
    },
    wL(g, p) { g.box(0, -1, -1, 0, 0, 9, BRASS); g.box(-1, -1, 3, 1, 1, 6, LEATHER); g.box(-1, -1, 9, 1, 1, 10, shade(BRASS, 0.85)); g.set(0, 0, 11, 0x8ad8ff); },   // the spyglass
    leg(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, p.second); g.box(-2, -11, -2, 1, -5, 2, BLACK); g.box(-2, -6, -2, 1, -6, 2, shade(BLACK, 1.6));                // breeches, tall sea boots
      knee(g, p, o);
    },
  };

  /* ------------------------------------------------------------- CANNONEER */
  D.cannoneer = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); g.box(-3, 1, 3, 3, 1, 4, 0x5a3a20); g.set(-3, 0, 4, 0x5a3a20); g.set(3, 0, 4, 0x5a3a20);   // a walrus moustache
      g.box(-3, 5, -3, 3, 6, 3, p.cloth); g.box(-1, 3, -4, 1, 5, -4, p.cloth); g.set(0, 2, -5, p.cloth);                                         // the kerchief, knotted behind
      for (const [x, y] of [[-2, 2], [2, 3], [1, 1]]) g.set(x, y, 3, shade(p.skin, 0.55));                                                      // soot
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, 0xe8dcc0); g.box(-4, 0, -2, -2, 7, 2, p.main); g.box(2, 0, -2, 4, 7, 2, p.main);                                  // shirt under a leather vest
      for (let i = 0; i <= 8; i++) { const x = 3 - i, y = i; g.set(x, y, 3, p.second); if (i % 2) g.set(x, y, 4, p.accent); }                    // the cartridge bandolier
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.second); g.box(-4, -3, -2, 4, -2, 2, 0x6a5a40); g.ell(4, -2, 1, 1, 1.4, 1, 0x1c1c22); },   // a powder horn
    arm(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, 0xe8dcc0); g.box(-1, -7, -1, 1, -4, 1, p.skin); g.set(0, -5, 1, shade(p.skin, 0.55));
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -6, 0, 0, 12, WOOD2); g.box(-1, 0, 13, 1, 0, 13, p.metal); g.set(-2, 0, 14, p.metal); g.set(2, 0, 14, p.metal);                // the linstock's staff and fork
      g.set(-2, 0, 15, G(p.glow)); g.set(2, 0, 15, G(0xffd060)); g.set(-2, 1, 15, G(0xff5a2a));                                                 // the smouldering match
    },
    wL(g, p) {
      g.box(-1, 1, -3, 1, 2, 1, WOOD); g.box(-1, 1, 2, 1, 3, 10, BRASS); g.box(-1, 2, 9, 1, 3, 10, shade(BRASS, 0.8)); g.set(0, 4, 3, BLACK);      // the swivel gun along the forearm
      g.box(0, 0, -1, 0, 0, 1, LEATHER);
    },
    leg(g, p, o) {
      g.box(-1, -6, -1, 1, 0, 1, 0x6a5a40); g.box(-1, -9, -1, 1, -7, 1, 0xe8dcc0); g.box(-1, -11, -1, 1, -10, 2, BLACK); g.set(0, -10, 2, BRASS);   // breeches, stockings, buckled shoes
      knee(g, p, o);
    },
  };

  /* ------------------------------------------------------------ BLACKBEARD */
  D.blackbeard = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, -3, 3, 3, 2, 4, BLACK); g.box(-2, -4, 3, 2, -4, 4, BLACK); g.boxM(3, -2, 0, 3, 3, 2, BLACK); g.box(-1, 1, 4, 1, 1, 4, 0x6a1a1a);   // the great black beard, a mouth
      for (const [x, y] of [[-2, -3], [2, -2], [-3, 0], [3, -1]]) { g.set(x, y, 5, 0x3a2a1a); g.set(x, y - 1, 5, G(0xff8a2a)); }                 // lit fuses in the beard
      g.box(-3, 4, -3, 3, 5, -3, BLACK); tricorne(g, BLACK, shade(p.accent, 0.8));
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-2, 3, 2, 2, 8, 2, p.cloth);
      for (let i = 0; i <= 8; i++) { g.set(-4 + i, i, 3, LEATHER); g.set(4 - i, i, 3, LEATHER); }                                               // two bandoliers, crossed
      for (const [x, y] of [[-3, 2], [3, 2], [-1, 5], [1, 5]]) { g.box(x, y, 4, x, y, 5, WOOD2); g.set(x, y + 1, 5, p.metal); }                 // pistols on the straps
      g.box(-4, 0, 3, 4, 1, 3, p.second); g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.second); g.box(-4, -5, -3, 4, -2, -3, p.main); g.box(-4, -4, 3, -2, -2, 3, p.main); g.box(2, -4, 3, 4, -2, 3, p.main); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.main); g.box(-1, 0, -2, 1, 1, 2, p.main);
      g.box(-2, -7, -2, 2, -5, 2, p.main); g.box(-2, -5, -2, 2, -5, 2, p.accent);                                                                // wide turned-back cuffs
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, 2, BLACK); g.box(-1, -1, 2, 1, 1, 3, BRASS); g.box(1, -1, -2, 1, 1, 2, BRASS);                                       // grip and basket hilt
      for (let z = 4; z <= 14; z++) { const y = z > 11 ? 1 : 0; g.box(0, y, z, 0, y + (z < 13 ? 1 : 0), z, p.metal); }
    },
    wL(g, p) { g.box(0, 0, -2, 0, -2, -1, WOOD2); g.box(0, 0, -1, 0, 0, 6, p.metal); g.box(0, 0, -1, 0, 1, 2, WOOD2); g.set(0, 1, 0, BRASS); },   // a flintlock pistol
    leg(g, p, o) {
      g.box(-1, -5, -1, 1, 0, 1, p.cloth); g.box(-2, -11, -2, 2, -6, 2, BLACK); g.box(-2, -6, -2, 2, -5, 2, shade(BLACK, 1.8));                  // bucket boots
      knee(g, p, o);
    },
  };

  /* -------------------------------------------------------------- REDBEARD */
  D.redbeard = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, -3, 3, 3, 2, 4, 0xc8401a); g.box(-2, -4, 3, 2, -4, 4, 0xc8401a); g.boxM(3, -2, 0, 3, 3, 2, 0xc8401a);                           // the red beard
      g.box(-1, 1, 4, 1, 1, 4, 0x6a1a1a);
      g.ell(0, 7, 0, 4.6, 2.6, 4.6, p.second); g.box(-1, 8, -1, 1, 10, 1, p.main); g.set(0, 7, 5, G(p.glow)); g.set(0, 8, 5, p.accent);         // the turban, its red cap and jewel
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-1, 0, 2, 1, 8, 2, p.accent); for (const y of [2, 4, 6]) { g.set(-2, y, 3, p.accent); g.set(2, y, 3, p.accent); }   // a kaftan, frogged in gold
      g.box(-4, 0, -2, 4, 1, 2, p.cloth); g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.cloth); g.box(-4, -6, -3, 4, -2, -3, p.main); g.box(-4, -6, 3, -2, -2, 3, p.main); g.box(2, -6, 3, 4, -2, 3, p.main); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.main); g.box(-1, 0, -2, 1, 1, 2, p.main); g.box(-1, -7, -1, 1, -5, 1, 0x8a8e98);                               // mail at the wrist
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, 2, BLACK); g.box(-2, 0, 2, 2, 0, 2, p.accent);                                                                        // grip and cross-guard
      for (let z = 3; z <= 15; z++) { const y = Math.round(Math.pow((z - 3) / 12, 2) * 3); g.set(0, y, z, p.metal); g.set(0, y + 1, z, shade(p.metal, 0.82)); if (z > 12) g.set(0, y - 1, z, p.metal); }   // the kilij, its widened tip
    },
    wL(g, p) {
      g.box(0, 0, -1, 0, 0, 1, LEATHER);
      for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) { const r = Math.hypot(x, y); if (r > 5.4) continue; g.set(x, y + 1, 2, r > 4.6 ? p.accent : r > 3 ? p.cloth : r > 1.5 ? shade(p.cloth, 1.3) : p.metal); }   // the kalkan
      g.set(0, 1, 3, p.metal);
    },
    leg(g, p, o) {
      g.box(-2, -8, -2, 1, 0, 2, p.second); g.box(-1, -11, -1, 1, -9, 2, 0xd8a830); g.set(0, -10, 3, 0xd8a830);                                // baggy shalwar, pointed yellow boots
      knee(g, p, o);
    },
  };

  /* ---------------------------------------------------------------- SAILOR */
  D.sailor = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3); for (const x of [-2, 0, 2]) g.set(x, 0, 3, shade(p.skin, 0.75));
      g.box(-3, 5, -3, 3, 6, 3, p.second); g.box(-3, 4, -3, 3, 4, 3, shade(p.second, 0.8)); g.set(0, 7, 0, p.second);                           // a knitted watch cap
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, (x, y) => (y % 2 ? p.second : p.main));                                                                          // the striped jersey
      g.box(-2, 7, 2, 2, 8, 3, p.accent); g.box(-1, 5, 3, 1, 6, 3, p.accent);                                                                       // a neckerchief
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, ROPE); g.box(-4, -3, -2, 4, -2, 2, p.cloth); },
    arm(g, p, o) {
      g.box(-1, -3, -1, 1, 0, 1, (x, y) => (y % 2 ? p.second : p.main)); g.box(-1, -7, -1, 1, -4, 1, p.skin);
      g.set(0, -5, 2, p.second); g.set(0, -6, 2, p.second);                                                                                       // an anchor tattoo
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) { g.box(0, 0, -2, 0, 0, 3, p.metal); g.box(-1, -1, 4, 1, 1, 11, p.metal); g.box(-1, -1, 4, 1, 1, 4, shade(p.metal, 0.8)); },   // the belaying pin
    wL(g, p) { /* a bare, tattooed fist */ },
    leg(g, p, o) {
      g.box(-1, -6, -1, 1, 0, 1, p.cloth); g.box(-2, -10, -2, 2, -7, 2, p.cloth);                                                                  // bell-bottoms
      g.box(-1, -11, -1, 1, -11, 2, BLACK);
      knee(g, p, o);
    },
  };

  /* -------------------------------------------------------------- MARAUDER */
  D.marauder = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(1, 3, 3, 2, 3, 4, BLACK); g.box(-3, 4, 3, 3, 4, 3, BLACK);                                                                            // the eye patch and its strap
      g.box(-3, -3, 3, 3, 1, 4, 0x6a3a1a); g.box(-1, -5, 4, 1, -4, 4, 0x6a3a1a); g.set(0, -6, 4, p.accent);                                      // a braided beard, a ring in it
      g.box(-4, 5, -4, 4, 6, 4, 0x4a3a2a); g.ell(0, 7, 0, 3.5, 1.4, 3.5, 0x6a5a40);                                                               // a fur cap
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-4, 6, -2, 4, 8, 2, 0x6a5a40);                                                                     // leather jerkin, fur at the shoulders
      g.box(-4, 2, 3, 4, 2, 3, p.second); g.set(0, 2, 4, p.accent);
      for (let y = 1; y <= 7; y++) g.set(y % 2 ? -1 : 1, y, 3, p.accent);                                                                          // a chain across the chest
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.second); g.box(-4, -4, -3, 4, -2, 3, 0x6a5a40); g.box(3, -5, 3, 4, -2, 3, p.accent); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.skin); g.box(-2, 0, -2, 2, 1, 2, 0x6a5a40); g.box(-1, -7, -1, 1, -5, 1, LEATHER);                            // bare arms, leather bracers
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -3, 0, 0, 10, WOOD2);
      g.box(0, -1, 8, 0, 3, 11, p.metal); g.box(0, 3, 7, 0, 4, 11, p.accent); g.box(0, -2, 10, 0, -1, 11, p.metal); g.set(0, 0, 12, p.metal);   // the bearded axe head, a spike
    },
    wL(g, p) { g.box(0, 0, -2, 0, 0, 2, 0x8a8e98); for (const [x, y] of [[1, 0], [-1, 0], [0, 1]]) { g.set(x * 2, y * 2, 2, p.accent); g.set(x, y, 2, 0x8a8e98); } g.ell(0, -2, -1, 1.4, 1.4, 1.4, ROPE); },   // the grapnel, the coil
    leg(g, p, o) {
      g.box(-1, -7, -1, 1, 0, 1, p.second); g.box(-2, -11, -2, 2, -8, 2, 0x6a5a40); g.box(-1, -11, -1, 1, -11, 2, LEATHER);                      // fur boots
      knee(g, p, o);
    },
  };

  /* ------------------------------------------------------------- MUSKETEER */
  D.musketeer = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); eyes(g, p, 3, 3);
      g.box(-3, 2, -3, 3, 5, -3, 0x3a2a1a); g.box(-1, -2, -4, 1, 2, -4, 0x3a2a1a);                                                                // hair, in a queue
      g.box(-6, 5, -1, 6, 7, 1, BLACK); g.box(-4, 8, -1, 4, 8, 1, BLACK); g.box(-6, 5, 2, 6, 5, 2, p.accent); g.set(-4, 7, 2, p.accent); g.set(-4, 7, 3, WHITE);   // the bicorne, worn athwart, a cockade
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-2, 3, 2, 2, 8, 2, p.second);
      for (let i = 0; i <= 8; i++) { g.set(-4 + i, i, 3, WHITE); g.set(4 - i, i, 3, WHITE); }                                                     // white crossbelts
      g.box(-1, 3, 4, 1, 5, 4, BRASS); g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, WHITE); g.box(-4, -5, -3, 4, -2, -3, p.main); g.box(-4, -4, 3, -2, -2, 3, p.accent); g.box(2, -4, 3, 4, -2, 3, p.accent); g.box(4, -3, -1, 4, -1, 1, BLACK); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.main); g.box(-1, 0, -2, 1, 1, 2, p.main); g.box(-1, -7, -1, 1, -5, 1, p.accent);                              // red cuffs
      hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, -1, -9, 0, 0, -2, WOOD); g.box(0, -2, -9, 0, -2, -7, WOOD);                                                                       // the stock
      g.box(0, 0, -2, 0, 0, 14, p.metal); g.box(0, -1, -2, 0, -1, 12, WOOD); g.set(0, 1, -1, BRASS);                                              // barrel over the fore-end, the lock
      g.box(0, -1, 15, 0, -1, 21, shade(p.metal, 1.05)); g.set(0, 0, 15, p.metal);                                                                 // the bayonet
    },
    wL(g, p) { /* the free hand supports the musket */ },
    leg(g, p, o) {
      g.box(-1, -6, -1, 1, 0, 1, p.cloth); g.box(-1, -10, -1, 1, -7, 1, WHITE); for (const y of [-9, -7]) g.set(o, y, 2, BLACK);                   // breeches, buttoned gaiters
      g.box(-1, -11, -1, 1, -11, 2, BLACK);
      knee(g, p, o);
    },
  };

  /* ----------------------------------------------------------------- GHOST */
  D.ghost = {
    head(g, p) {
      g.box(-3, 0, -3, 3, 5, 3, p.skin); g.set(-2, 3, 3, G(p.glow)); g.set(2, 3, 3, G(p.glow)); g.box(-2, 2, 3, -1, 2, 3, p.dark); g.box(1, 2, 3, 2, 2, 3, p.dark);   // a hollow face, cold eyes
      g.box(-2, 0, 3, 2, 0, 3, p.dark); for (const x of [-1, 1]) g.set(x, 1, 3, shade(p.skin, 1.2));                                              // teeth
      tricorne(g, p.dark, p.accent); g.set(2, 6, 4, p.dark); g.cut && g.cut(-1, 7, 2, 1, 7, 3);
      for (const [x, z] of [[-3, -4], [2, -4]]) g.box(x, -2, z, x, 1, z, 0x3a8a6a);                                                                 // seaweed in the hair
    },
    torso(g, p) {
      g.box(-4, 0, -2, 4, 8, 2, p.main); g.box(-1, 3, 2, 1, 8, 2, p.cloth);
      for (const [x, y] of [[-3, 2], [2, 5], [3, 1], [-2, 6]]) g.set(x, y, 2, G(p.glow));                                                          // holes, glowing through
      for (const x of [-4, 3]) g.box(x, -1, 2, x, 3, 2, 0x3a8a6a);
      g.box(-1, 9, -1, 1, 9, 1, p.joint);
    },
    hips(g, p) { g.box(-3, -1, -2, 3, 0, 2, p.dark); for (let x = -4; x <= 4; x += 2) g.box(x, -5 + (x & 2 ? 1 : 0), -3, x, -1, -3, p.main); for (let x = -4; x <= 4; x += 2) g.box(x, -4 + (x & 2 ? 1 : 0), 3, x, -1, 3, p.main); },
    arm(g, p, o) {
      g.box(-1, -4, -1, 1, 0, 1, p.main); g.box(-2, -6, -2, 2, -4, 2, shade(p.main, 0.8)); g.set(o, -7, 0, p.main);                               // ragged sleeves
      g.box(-1, -7, -1, 1, -7, 1, p.skin); hand(g, p.skin); elbow(g, p, o);
    },
    wR(g, p) {
      g.box(0, 0, -2, 0, 0, 2, p.dark); g.box(-1, -1, 2, 1, 1, 3, p.accent);
      for (let z = 4; z <= 14; z++) { const y = z > 11 ? 1 : 0; g.set(0, y, z, G(p.glow)); if (z < 13) g.set(0, y + 1, z, G(p.second)); }        // a blade of cold light
    },
    wL(g, p) {
      g.box(0, 0, 0, 0, 2, 0, p.dark); g.box(-1, -4, -1, 1, -1, 1, p.accent); g.box(-1, -3, -1, 1, -2, 1, G(p.glow)); g.set(0, -5, 0, p.accent);   // the lantern, burning green
    },
    leg(g, p, o) {
      g.box(-1, -7, -1, 1, 0, 1, p.main); g.box(-1, -9, -1, 1, -8, 1, shade(p.main, 0.75));
      g.box(-1, -11, -1, 1, -10, 1, G(0x2aa878)); g.set(0, -11, 2, G(p.glow));                                                                       // they fade into a glow
      knee(g, p, o);
    },
  };

  /* ------------------------------------------------------------ the stances */
  Object.assign(Anim.READY, {
    captain: { torso: [0.05, 0.4, 0], head: [0, -0.35, 0], armR: [-1.0, 0.2, -0.2], wR: [1.1, 0, 0], armL: [-0.3, 0, 0.5], wL: [0.4, 0, 0], legL: [-0.35, 0, 0.12], legR: [0.3, 0, -0.12], hy: -0.6 },
    cannoneer: { torso: [0.1, 0.3, 0], head: [0, -0.25, 0], armR: [-0.7, 0.1, -0.2], wR: [0.6, 0, 0], armL: [-1.4, -0.2, 0.25], wL: [1.5, 0, 0], legL: [-0.35, 0, 0.15], legR: [0.3, 0, -0.15], hy: -0.9 },
    blackbeard: { torso: [0.15, 0.3, 0], head: [-0.05, -0.25, 0], armR: [-0.8, 0.2, -0.4], wR: [0.7, 0, 0], armL: [-1.4, -0.1, 0.2], wL: [1.5, 0, 0], legL: [-0.4, 0, 0.18], legR: [0.35, 0, -0.18], hy: -1.0 },
    redbeard: { torso: [0.1, 0.3, 0], head: [0, -0.25, 0], armR: [-0.9, 0.2, -0.35], wR: [0.8, 0, 0], armL: [-1.25, -0.2, 0.25], wL: [0, 0, 0], legL: [-0.38, 0, 0.15], legR: [0.32, 0, -0.15], hy: -0.9 },
    sailor: { torso: [0.15, 0.35, 0], head: [0.05, -0.3, 0], armR: [-1.1, 0.3, -0.3], wR: [0.6, 0, 0], armL: [-1.4, -0.3, 0.3], wL: [0.2, 0, 0], legL: [-0.4, 0, 0.12], legR: [0.35, 0, -0.12], hy: -0.9 },
    marauder: { torso: [0.2, 0.2, 0], head: [-0.05, -0.15, 0], armR: [-0.5, 0.1, -0.4], wR: [0.6, 0, 0], armL: [-0.9, -0.1, 0.4], wL: [0.8, 0, 0], legL: [-0.4, 0, 0.2], legR: [0.35, 0, -0.2], hy: -1.2 },
    musketeer: { torso: [0.05, 0.35, 0], head: [0, -0.3, 0], armR: [-1.0, 0.2, 0.25], wR: [0.9, 0, 0], armL: [-1.3, -0.2, -0.5], wL: [0.3, 0, 0], legL: [-0.38, 0, 0.12], legR: [0.32, 0, -0.12], hy: -0.7 },
    ghost: { torso: [0.2, 0.3, 0.1], head: [0.15, -0.3, 0.15], armR: [-0.9, 0.2, -0.4], wR: [0.8, 0, 0], armL: [-0.6, 0, 0.5], wL: [0.2, 0, 0], legL: [-0.2, 0, 0.1], legR: [0.25, 0, -0.1], hy: -0.3 },
  });
  /* ------------------------------------------------------------- the poses */
  Object.assign(Anim.P, {
    kick: { wind: { torso: [-0.1, 0, 0], legR: [0.6, 0, 0], armR: [0.4, 0, -0.5] }, strike: { torso: [-0.35, 0, 0], legR: [-1.7, 0, 0], armR: [0.5, 0, -0.7], armL: [-0.5, 0, 0.7] } },
    aim: { wind: { torso: [0, 0.5, 0], head: [0.15, -0.45, 0], armR: [-1.5, 0.1, 0.35], wR: [1.55, 0, 0], armL: [-1.5, -0.1, -0.4] }, strike: { torso: [-0.12, 0.5, 0], head: [0.15, -0.45, 0], armR: [-1.4, 0.1, 0.35], wR: [1.55, 0, 0], armL: [-1.45, -0.1, -0.4] } },
  });
  Anim.P.pointBlank = Anim.P.shoot;
})();
