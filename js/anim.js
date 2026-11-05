/* ============================================================================
   anim.js -- procedural poses for the peg skeleton.
   A pose is { part: [rx, ry, rz] ..., hy } (hy: hips height offset, voxels).
   Arms hang down -Y: a negative X rotation raises an arm forward; +Z swings
   the left arm out, -Z the right. The held weapon is drawn along +Z of the
   hand: a wR/wL X rotation of about +1.5 lines it up with the arm.
   Every move names a pose with a `wind` (startup) and a `strike` (active).
   ========================================================================== */
(function () {
  'use strict';
  const PARTS = ['torso', 'head', 'armL', 'armR', 'legL', 'legR', 'wL', 'wR'];
  const Z = [0, 0, 0];

  const READY = {
    blade: { torso: [0.08, 0.3, 0], head: [0, -0.25, 0], armR: [-0.7, 0.25, -0.2], wR: [0.5, 0, 0], armL: [-0.55, -0.2, 0.2], wL: [0.3, 0, 0], legL: [-0.32, 0, 0.07], legR: [0.28, 0, -0.07], hy: -0.5 },
    fists: { torso: [0.12, 0.35, 0], head: [0.05, -0.3, 0], armR: [-1.25, 0.35, -0.35], wR: [0.2, 0, 0], armL: [-1.45, -0.35, 0.3], wL: [0.2, 0, 0], legL: [-0.4, 0, 0.1], legR: [0.35, 0, -0.1], hy: -0.8 },
    twohand: { torso: [0.08, 0.2, 0], head: [0, -0.2, 0], armR: [-0.95, 0.2, 0.32], wR: [0.35, 0, 0], armL: [-1.0, -0.2, -0.62], wL: [0.3, 0, 0], legL: [-0.34, 0, 0.08], legR: [0.3, 0, -0.08], hy: -0.6 },
    knight: { torso: [0.06, 0.25, 0], head: [0, -0.2, 0], armR: [-0.55, 0.2, -0.12], wR: [1.0, 0, 0], armL: [-0.4, -0.2, 0.2], wL: [0.3, 0, 0], legL: [-0.38, 0, 0.12], legR: [0.3, 0, -0.12], hy: -0.7 },
    pirate: { torso: [0.02, 0.4, 0.04], head: [0.08, -0.35, 0.1], armR: [-0.95, 0.35, -0.4], wR: [0.85, 0, 0], armL: [0.15, 0, 0.5], wL: [0.2, 0, 0], legL: [-0.18, 0, 0.14], legR: [0.32, 0, -0.08], hy: -0.3 },
    viking: { torso: [0.2, 0.15, 0], head: [-0.05, -0.1, 0], armR: [-0.3, 0, -0.3], wR: [0.35, 0, 0], armL: [-0.45, 0, 0.35], wL: [0.3, 0, 0], legL: [-0.36, 0, 0.16], legR: [0.3, 0, -0.16], hy: -1.1 },
    ninja: { torso: [0.38, 0.45, 0], head: [-0.2, -0.45, 0], armR: [-0.95, 0.3, -0.45], wR: [-1.4, 0, 0], armL: [-1.25, -0.3, 0.45], wL: [0.3, 0, 0], legL: [-0.85, 0, 0.22], legR: [0.5, 0, -0.2], hy: -2.5 },
    summoner: { torso: [0.04, 0.2, 0], head: [0, -0.2, 0], armR: [-0.5, 0.2, -0.22], wR: [-0.85, 0, 0], armL: [-1.1, -0.35, 0.25], wL: [0.95, 0, 0], legL: [-0.2, 0, 0.05], legR: [0.2, 0, -0.05], hy: -0.2 },
    paladin: { torso: [0.06, 0.25, 0], head: [0, -0.2, 0], armR: [-1.05, 0.35, -0.3], wR: [-1.35, 0, 0], armL: [-0.95, -0.45, 0.35], wL: [0.75, 0.35, 0], legL: [-0.4, 0, 0.14], legR: [0.32, 0, -0.14], hy: -0.8 },
    dragoon: { torso: [0.2, 0.35, 0], head: [-0.05, -0.3, 0], armR: [-0.8, 0.25, 0.3], wR: [0.55, 0, 0], armL: [-1.15, -0.25, -0.62], wL: [0.3, 0, 0], legL: [-0.6, 0, 0.2], legR: [0.45, 0, -0.2], hy: -1.6 },
    bard: { torso: [-0.05, 0.3, 0.05], head: [0.05, -0.3, 0.12], armR: [-1.1, 0.4, -0.25], wR: [-1.2, 0, 0], armL: [-0.3, 0, 0.6], wL: [0.4, 0, 0], legL: [-0.1, 0, 0.1], legR: [0.25, 0, -0.2], hy: -0.2 },
    shield: { torso: [0.1, 0.3, 0], head: [0, -0.25, 0], armR: [-0.6, 0.2, -0.2], wR: [0.5, 0, 0], armL: [-0.95, -0.45, 0.35], wL: [0.75, 0.35, 0], legL: [-0.3, 0, 0.07], legR: [0.26, 0, -0.07], hy: -0.5 },
  };
  /* each move pose: wind (held through startup) and strike (the active frames) */
  const P = {
    slashA: { wind: { torso: [0, -0.7, 0], armR: [-1.7, 0, -1.2], wR: [1.25, 0, 0] }, strike: { torso: [0.1, 0.75, 0], armR: [-1.5, 0, 0.7], wR: [1.35, 0, 0] } },
    slashB: { wind: { torso: [0, 0.65, 0], armR: [-1.5, 0, 0.75], wR: [1.35, 0, 0] }, strike: { torso: [0.1, -0.65, 0], armR: [-1.55, 0, -1.25], wR: [1.25, 0, 0] } },
    thrust: { wind: { torso: [0, -0.55, 0], armR: [-1.0, 0, -0.25], wR: [0.95, 0, 0], legR: [0.2, 0, 0] }, strike: { torso: [0.15, 0.5, 0], armR: [-1.62, 0, 0.05], wR: [1.57, 0, 0], legR: [0.55, 0, 0], legL: [-0.6, 0, 0], hy: -1 } },
    upslash: { wind: { torso: [0.35, -0.35, 0], armR: [0.35, 0, -0.45], wR: [1.4, 0, 0], hy: -1.4 }, strike: { torso: [-0.25, 0.3, 0], armR: [-2.85, 0, 0.1], wR: [1.4, 0, 0], hy: 0.4 } },
    overhead: { wind: { torso: [-0.25, 0, 0], armR: [-3.0, 0, -0.1], wR: [1.35, 0, 0], armL: [-2.6, 0, 0.25], head: [-0.2, 0, 0] }, strike: { torso: [0.45, 0, 0], armR: [-0.85, 0, 0], wR: [1.4, 0, 0], armL: [-0.7, 0, 0.1], hy: -1.2 } },
    twoHandDiag: { wind: { torso: [0, -0.6, 0], armR: [-2.75, 0, -0.35], armL: [-2.7, 0, -0.55], wR: [1.3, 0, 0], hy: -0.4 }, strike: { torso: [0.35, 0.55, 0], armR: [-1.0, 0, 0.6], armL: [-1.0, 0, 0.15], wR: [1.4, 0, 0], hy: -1.3, legL: [-0.6, 0, 0], legR: [0.5, 0, 0] } },
    twoHandUp: { wind: { torso: [0.35, -0.3, 0], armR: [0.3, 0, 0.15], armL: [0.3, 0, -0.45], wR: [1.4, 0, 0], hy: -1.5 }, strike: { torso: [-0.25, 0.3, 0], armR: [-2.85, 0, 0.1], armL: [-2.8, 0, -0.4], wR: [1.4, 0, 0], hy: 0.5 } },
    twoHandOver: { wind: { torso: [-0.3, 0, 0], armR: [-3.0, 0, 0.1], armL: [-3.0, 0, -0.3], wR: [1.35, 0, 0] }, strike: { torso: [0.5, 0, 0], armR: [-0.8, 0, 0.15], armL: [-0.8, 0, -0.3], wR: [1.4, 0, 0], legL: [-0.6, 0, 0], legR: [-0.3, 0, 0] } },
    // SAMURAI
    kiri: { wind: { torso: [0, -0.85, 0], armR: [-1.5, 0, -1.25], armL: [-1.35, 0, -0.95], wR: [1.3, 0, 0] }, strike: { torso: [0.12, 0.85, 0], armR: [-1.5, 0, 0.65], armL: [-1.45, 0, 0.95], wR: [1.38, 0, 0], hy: -0.9 } },
    kesa: { wind: { torso: [0, -0.5, 0], armR: [-2.75, 0, -0.6], armL: [-2.6, 0, -0.7], wR: [1.3, 0, 0], hy: -0.3 }, strike: { torso: [0.32, 0.62, 0], armR: [-0.8, 0, 0.7], armL: [-0.85, 0, 0.4], wR: [1.42, 0, 0], hy: -1.1, legL: [-0.5, 0, 0], legR: [0.45, 0, 0] } },
    tsuki: { wind: { torso: [0, -0.6, 0], armR: [-0.9, 0, -0.3], armL: [-0.95, 0, -0.5], wR: [1.0, 0, 0], legR: [0.3, 0, 0] }, strike: { torso: [0.28, 0.42, 0], armR: [-1.6, 0, 0.05], armL: [-1.55, 0, -0.35], wR: [1.57, 0, 0], legL: [-0.95, 0, 0], legR: [0.75, 0, 0], hy: -1.7 } },
    tsubameAir: { wind: { armR: [-2.9, 0, -0.3], armL: [-2.8, 0, -0.5], wR: [1.4, 0, 0], torso: [-0.3, 0, 0] }, strike: { armR: [-0.4, 0, 0.5], armL: [-0.5, 0, 0.2], wR: [1.4, 0, 0], torso: [0.6, 0.4, 0], legL: [-1.2, 0, 0], legR: [-0.3, 0, 0] } },
    // KNIGHT
    cleave: { wind: { torso: [0, -0.9, 0], armR: [-1.2, 0, -1.45], wR: [1.4, 0, 0], hy: -0.6 }, strike: { torso: [0.15, 0.9, 0], armR: [-1.4, 0, 0.9], wR: [1.45, 0, 0], hy: -1, legR: [0.5, 0, 0], legL: [-0.5, 0, 0] } },
    backswing: { wind: { torso: [0, 0.9, 0], armR: [-1.3, 0, 0.9], wR: [1.4, 0, 0] }, strike: { torso: [0.15, -0.85, 0], armR: [-1.5, 0, -1.45], wR: [1.4, 0, 0], hy: -0.8 } },
    judgment: { wind: { torso: [-0.4, 0, 0], armR: [-3.1, 0, 0], wR: [1.3, 0, 0], hy: 1.2, legL: [-0.6, 0, 0], legR: [0.4, 0, 0] }, strike: { torso: [0.62, 0, 0], armR: [-0.6, 0, 0], wR: [1.45, 0, 0], hy: -2.2, legL: [-0.9, 0, 0], legR: [0.8, 0, 0] } },
    pommel: { wind: { armR: [-0.7, 0, -0.2], wR: [-0.4, 0, 0], torso: [0, -0.45, 0] }, strike: { armR: [-1.7, 0, 0.1], wR: [-1.25, 0, 0], torso: [0.2, 0.35, 0], legR: [0.5, 0, 0] } },
    plunge: { wind: { armR: [-2.2, 0, 0], wR: [1.5, 0, 0], torso: [-0.2, 0, 0], legL: [-1, 0, 0] }, strike: { armR: [-0.9, 0, 0], wR: [1.57, 0, 0], torso: [0.7, 0, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0] } },
    // PIRATE
    cutA: { wind: { torso: [0, -0.6, 0], armR: [-2.0, 0, -1.0], wR: [1.2, 0, 0], armL: [-0.2, 0, 0.6] }, strike: { torso: [0.1, 0.7, 0], armR: [-1.2, 0, 0.7], wR: [1.4, 0, 0], armL: [-0.4, 0, 0.9], hy: -0.6 } },
    cutB: { wind: { torso: [0, 0.6, 0], armR: [-1.0, 0, 0.8], wR: [1.4, 0, 0] }, strike: { torso: [0.05, -0.7, 0], armR: [-1.9, 0, -1.2], wR: [1.3, 0, 0], armL: [-0.2, 0, 0.7], hy: -0.6 } },
    flourish: { spin: 1, wind: { armR: [-1.5, 0, -1.2], wR: [1.4, 0, 0], torso: [0, -0.6, 0] }, strike: { armR: [-1.6, 0, -1.5], wR: [1.4, 0, 0], armL: [-1.3, 0, 1.4], hy: -0.5 } },
    bootKick: { wind: { legR: [-1.0, 0, 0], hy: -0.4, torso: [-0.1, 0, 0], armL: [-0.5, 0, 0.7] }, strike: { legR: [-1.65, 0, 0], legL: [0.2, 0, 0], torso: [-0.35, 0, 0], armR: [-0.4, 0, -0.8], armL: [-0.4, 0, 0.9], hy: 0.3 } },
    sandToss: { wind: { armL: [0.6, 0, 0.2], torso: [0.45, 0.4, 0], hy: -1.8 }, strike: { armL: [-1.9, 0, -0.1], torso: [-0.1, -0.45, 0], hy: -0.6 } },
    cannonball: { wind: { legL: [-1.8, 0, 0.3], legR: [-1.8, 0, -0.3], torso: [0.6, 0, 0] }, strike: { legR: [-1.4, 0, 0], legL: [-0.2, 0, 0], torso: [-0.4, 0, 0], armR: [-2.5, 0, -0.4], armL: [-2.5, 0, 0.4] } },
    // MONK
    flurry: { alt: ['jabL', 'jabR'], wind: { torso: [0.1, 0.2, 0], armL: [-1.3, 0, 0.3], armR: [-1.3, 0, -0.3] }, strike: { torso: [0.1, 0, 0], armL: [-1.6, 0, 0], armR: [-1.6, 0, 0], hy: -1 } },
    dragonPalm: { wind: { torso: [0, -0.8, 0], armR: [-0.5, 0, -0.5], armL: [-0.5, 0, 0.5], hy: -1 }, strike: { torso: [0.25, 0.6, 0], armR: [-1.6, 0, 0.15], armL: [-1.5, 0, -0.1], wR: [0.1, 0, 0], wL: [0.1, 0, 0], hy: -1.5, legR: [0.9, 0, 0], legL: [-0.8, 0, 0] } },
    spinKick: { spin: 1, wind: { legR: [-0.6, 0, -0.4], torso: [0, 0.4, 0] }, strike: { legR: [-1.5, 0, -0.8], legL: [0.3, 0, 0], torso: [-0.2, 0, 0.3], armL: [-0.9, 0, 1.2] } },
    whirlKick: { spin: 1, wind: { legR: [-1.0, 0, -0.6], legL: [-1.0, 0, 0.6] }, strike: { legR: [-1.4, 0, -1.2], legL: [-1.4, 0, 1.2], armL: [-1.5, 0, 1.5], armR: [-1.5, 0, -1.5] } },
    // VIKING
    hack: { wind: { torso: [0, -0.7, 0], armR: [-2.8, 0, -0.7], wR: [1.3, 0, 0], hy: -0.3 }, strike: { torso: [0.35, 0.6, 0], armR: [-0.7, 0, 0.5], wR: [1.4, 0, 0], hy: -1.3, legL: [-0.5, 0, 0], legR: [0.45, 0, 0] } },
    hew: { wind: { torso: [0.1, 0.7, 0], armR: [-0.3, 0, 0.6], wR: [1.4, 0, 0], hy: -1.2 }, strike: { torso: [-0.1, -0.7, 0], armR: [-2.4, 0, -1.0], wR: [1.3, 0, 0], hy: 0 } },
    whirlwind: { spin: 1, wind: { armR: [-1.5, 0, -1.4], wR: [1.4, 0, 0], torso: [0, -0.7, 0], hy: -1 }, strike: { armR: [-1.55, 0, -1.55], wR: [1.4, 0, 0], armL: [-1.2, 0, 1.3], hy: -1.2 } },
    skullSplit: { wind: { armR: [-3.1, 0, 0.15], armL: [-3.0, 0, -0.2], wR: [1.3, 0, 0], torso: [-0.4, 0, 0], hy: 0.4 }, strike: { armR: [-0.6, 0, 0.1], armL: [-0.6, 0, -0.1], wR: [1.45, 0, 0], torso: [0.75, 0, 0], hy: -2.5, legL: [-0.9, 0, 0], legR: [0.6, 0, 0] } },
    drill: { spin: 1, wind: { armR: [-3.0, 0, 0], wR: [1.4, 0, 0] }, strike: { armR: [-0.3, 0, 0], wR: [1.57, 0, 0], torso: [0.6, 0, 0], legL: [-0.5, 0, 0] } },
    // NINJA (a reverse grip: the blade runs back along the forearm)
    flickA: { wind: { torso: [0.3, -0.5, 0], armR: [-1.2, 0, -0.8], wR: [-1.4, 0, 0], hy: -2 }, strike: { torso: [0.35, 0.6, 0], armR: [-1.4, 0, 0.6], wR: [-1.5, 0, 0], hy: -2.2 } },
    flickB: { wind: { torso: [0.3, 0.5, 0], armR: [-1.2, 0, 0.6], wR: [-1.5, 0, 0], hy: -2 }, strike: { torso: [0.35, -0.6, 0], armR: [-1.5, 0, -0.9], wR: [-1.4, 0, 0], hy: -2.2 } },
    vanish: { wind: { hy: -2.5, torso: [0.6, 0, 0], armR: [-0.5, 0, -0.4], wR: [-1.5, 0, 0] }, strike: { armR: [-1.6, 0, 0.2], wR: [1.5, 0, 0], torso: [0.35, 0.4, 0], hy: -1.8, legR: [0.8, 0, 0], legL: [-0.7, 0, 0] } },
    shadowSlash: { spin: 1, wind: { armR: [-1.3, 0, -1.2], wR: [-1.4, 0, 0], hy: -2 }, strike: { armR: [-1.5, 0, -1.5], wR: [-1.4, 0, 0], armL: [-1.3, 0, 1.3], hy: -1.6 } },
    kunaiToss: { wind: { armR: [-2.6, 0, -0.5], wR: [0, 0, 0], torso: [0, -0.5, 0] }, strike: { armR: [-1.3, 0, 0.3], torso: [0.25, 0.5, 0], armL: [-0.8, 0, 0.6] } },
    // SUMMONER
    point: { wind: { armR: [-2.6, 0, -0.2], wR: [1.1, 0, 0], torso: [0, -0.3, 0] }, strike: { armR: [-1.7, 0, 0.1], wR: [1.6, 0, 0], torso: [0.15, 0.4, 0], armL: [-0.5, 0, 0.4], hy: -0.6, legR: [0.4, 0, 0], legL: [-0.4, 0, 0] } },
    cast: { wind: { armR: [-0.7, 0, -0.3], armL: [-0.7, 0, 0.3], torso: [0, -0.4, 0], hy: -0.4 }, strike: { armR: [-1.6, 0, 0.15], wR: [1.55, 0, 0], armL: [-1.5, 0, -0.1], wL: [1.5, 0, 0], torso: [0.2, 0.3, 0], hy: -0.8, legR: [0.4, 0, 0], legL: [-0.45, 0, 0] } },
    summon: { wind: { armR: [-2.9, 0, -0.2], wR: [1.33, 0, 0], armL: [-1.3, 0, 0.4], wL: [0.9, 0, 0], torso: [-0.2, 0, 0], head: [-0.3, 0, 0] }, strike: { armR: [-3.0, 0, -0.1], wR: [1.4, 0, 0], armL: [-1.5, 0, 0.6], wL: [0.9, 0, 0], torso: [-0.3, 0, 0], head: [-0.4, 0, 0], hy: 0.4 } },
    // DRAGOON
    tsukiPull: { wind: { torso: [0, -0.4, 0], armR: [-1.0, 0, -0.2], armL: [-1.0, 0, -0.5], wR: [1.0, 0, 0] }, strike: { torso: [0.15, 0.2, 0], armR: [-1.3, 0, -0.1], armL: [-1.25, 0, -0.45], wR: [1.3, 0, 0], hy: -1.2, legL: [-0.6, 0, 0], legR: [0.5, 0, 0] } },
    twinThrust: { alt: ['tsuki', 'tsukiPull'], wind: { torso: [0, -0.6, 0], armR: [-0.9, 0, -0.3], armL: [-0.95, 0, -0.5], wR: [1.0, 0, 0], legR: [0.3, 0, 0] }, strike: { torso: [0.28, 0.42, 0], armR: [-1.6, 0, 0.05], armL: [-1.55, 0, -0.35], wR: [1.57, 0, 0], legL: [-0.95, 0, 0], legR: [0.75, 0, 0], hy: -1.7 } },
    lanceWheel: { spin: 1, wind: { armR: [-1.4, 0, -1.3], armL: [-1.3, 0, -0.9], wR: [1.45, 0, 0], torso: [0, -0.7, 0], hy: -1.2 }, strike: { armR: [-1.55, 0, -1.5], armL: [-1.5, 0, -1.2], wR: [1.5, 0, 0], hy: -1.6, legL: [-0.5, 0, 0.3], legR: [0.4, 0, -0.3] } },
    breath: { wind: { torso: [-0.3, 0, 0], head: [-0.5, 0, 0], armR: [-0.4, 0, -0.5], armL: [-0.4, 0, 0.5] }, strike: { torso: [0.35, 0, 0], head: [0.25, 0, 0], hy: -0.8, armR: [-0.3, 0, -0.7], armL: [-0.3, 0, 0.7], legL: [-0.4, 0, 0], legR: [0.4, 0, 0] } },
    // BARD
    strum: { wind: { armR: [-1.2, 0.6, 0.6], wR: [1.2, 0.8, 0], armL: [-1.0, -0.4, 0.2], torso: [0, -0.3, 0] }, strike: { armR: [-1.3, 0.7, 0.8], wR: [1.3, 0.9, 0.3], armL: [-1.2, -0.5, -0.3], torso: [-0.2, 0.3, 0], head: [-0.3, 0, 0.15], hy: -0.5 } },
    // the Legend Art cinematics
    sheathe: { wind: { armR: [-0.6, 0, 0.7], wR: [2.6, 0, 0], torso: [0.1, -0.3, 0] }, strike: { armR: [-0.3, 0, 0.55], wR: [2.9, 0, 0], armL: [-0.5, 0, -0.4], torso: [0.12, -0.35, 0], head: [0.25, 0, 0], hy: -0.4 } },
    heavyDiag: { wind: { torso: [0, 0.65, 0], armL: [-2.7, 0, 0.6], wL: [1.3, 0, 0], hy: -0.4 }, strike: { torso: [0.3, -0.55, 0], armL: [-0.6, 0, -0.55], wL: [1.3, 0, 0], hy: -1.2, legL: [-0.6, 0, 0], legR: [0.5, 0, 0] } },
    bash: { wind: { torso: [0, 0.55, 0], armL: [-0.8, -0.6, 0.45], wL: [0.6, 0.4, 0], hy: -0.8 }, strike: { torso: [0.15, -0.45, 0], armL: [-1.5, 0, 0], wL: [1.45, 0, 0], hy: -1, legR: [0.75, 0, 0], legL: [-0.65, 0, 0] } },
    bashUp: { wind: { torso: [0.35, 0, 0], armL: [0.35, 0, 0.3], wL: [1.0, 0, 0], hy: -1.5 }, strike: { torso: [-0.3, 0, 0], armL: [-2.9, 0, 0.1], wL: [1.5, 0, 0], hy: 0.6, legL: [-0.3, 0, 0] } },
    bashDown: { wind: { torso: [-0.3, 0, 0], armL: [-2.8, 0, 0.2], armR: [-2.6, 0, -0.2], wL: [1.4, 0, 0] }, strike: { torso: [0.65, 0, 0], armL: [-0.55, 0, 0.1], armR: [-0.6, 0, -0.1], wL: [1.4, 0, 0], legL: [-0.6, 0, 0], legR: [-0.3, 0, 0] } },
    jabL: { wind: { torso: [0, 0.35, 0], armL: [-1.2, 0, 0.3] }, strike: { torso: [0.1, -0.45, 0], armL: [-1.62, -0.1, -0.1], wL: [1.5, 0, 0], legL: [-0.5, 0, 0] } },
    jabR: { wind: { torso: [0, -0.35, 0], armR: [-1.2, 0, -0.3] }, strike: { torso: [0.1, 0.45, 0], armR: [-1.62, 0.1, 0.1], wR: [1.5, 0, 0], legR: [-0.5, 0, 0] } },
    punch: { wind: { torso: [0, -0.75, 0], armR: [-0.6, 0, -0.6], hy: -0.7 }, strike: { torso: [0.22, 0.75, 0], armR: [-1.65, 0, 0.15], wR: [1.5, 0, 0], hy: -1.1, legR: [0.8, 0, 0], legL: [-0.7, 0, 0] } },
    airKick: { wind: { legR: [0.5, 0, 0], torso: [0.2, 0, 0] }, strike: { legR: [-1.6, 0, 0], legL: [0.6, 0, 0], torso: [-0.35, 0, 0] } },
    palm: { wind: { torso: [0, 0.75, 0], armL: [-0.5, 0, 0.55], hy: -0.9 }, strike: { torso: [0.22, -0.65, 0], armL: [-1.62, 0, -0.05], wL: [0.1, 0, 0], hy: -1.4, legL: [0.85, 0, 0], legR: [-0.75, 0, 0] } },
    palmUp: { wind: { torso: [0.35, 0, 0], armL: [0.3, 0, 0.3], hy: -1.6 }, strike: { torso: [-0.3, 0, 0], armL: [-2.95, 0, 0.1], hy: 0.6 } },
    axeKick: { wind: { legR: [-2.7, 0, 0], torso: [-0.4, 0, 0], legL: [0.4, 0, 0] }, strike: { legR: [0.25, 0, 0], torso: [0.55, 0, 0] } },
    sweep: { wind: { hy: -4, torso: [0.5, 0, 0], legR: [-0.4, 0, -0.6], legL: [-1.5, 0, 0.25] }, strike: { hy: -4.5, torso: [0.5, 0.6, 0], legR: [-1.45, 0, -1.05], legL: [-1.55, 0, 0.3], armR: [0.4, 0, -0.6] } },
    knee: { wind: { legR: [0.45, 0, 0], hy: -0.6 }, strike: { legR: [-2.0, 0, 0], legL: [0.5, 0, 0], torso: [-0.2, 0, 0], armR: [0.55, 0, -0.35], armL: [0.55, 0, 0.35], hy: 1 } },
    stomp: { wind: { legR: [-1.8, 0, 0], hy: 1, torso: [-0.2, 0, 0] }, strike: { legR: [-0.25, 0, 0], hy: -1.6, torso: [0.4, 0, 0] } },
    spin: { spin: 1, wind: { armR: [-1.4, 0, -1.3], wR: [1.4, 0, 0], torso: [0, -0.5, 0] }, strike: { armR: [-1.5, 0, -1.4], wR: [1.4, 0, 0], armL: [-1.2, 0, 1.2], hy: -1 } },
    shoot: { wind: { armL: [-1.25, 0, 0.1], wL: [1.3, 0, 0], torso: [0, 0.55, 0], head: [0, -0.3, 0] }, strike: { armL: [-1.62, 0, -0.05], wL: [1.57, 0, 0], torso: [-0.05, 0.65, 0], head: [0, -0.45, 0], armR: [-0.3, 0, -0.3] } },
    chainThrow: { wind: { armL: [-2.9, 0, 0.55], wL: [0.4, 0, 0], torso: [0, 0.4, 0], head: [0, -0.25, 0], armR: [-0.4, 0, -0.3] }, strike: { armL: [-1.55, 0, 0.05], wL: [1.57, 0, 0], torso: [0.12, 0.6, 0], head: [0, -0.45, 0], armR: [0.3, 0, -0.4], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], hy: -0.8 } },
    chainYank: { wind: { armL: [-1.4, 0, 0.1] }, strike: { armL: [0.55, 0, 0.35], wL: [1.2, 0, 0], torso: [-0.22, -0.45, 0], head: [0.1, 0.3, 0], armR: [-0.7, 0, -0.3], legL: [-0.65, 0, 0], legR: [0.55, 0, 0], hy: -1.3 } },
    shootDown: { wind: { armL: [-0.9, 0, 0], wL: [1.57, 0, 0] }, strike: { armL: [-0.6, 0, 0], wL: [1.57, 0, 0], torso: [0.5, 0, 0] } },
    toss: { wind: { armR: [-2.85, 0, -0.3], torso: [0, -0.45, 0], wR: [0.5, 0, 0] }, strike: { armR: [-1.0, 0, -0.1], torso: [0.2, 0.45, 0] } },
    iai: { wind: { torso: [0.35, -0.95, 0], armR: [-0.35, 0, 0.65], wR: [1.4, 0, 0], hy: -2 }, strike: { torso: [0.3, 0.85, 0], armR: [-1.6, 0, -1.45], wR: [1.4, 0, 0], hy: -2.6, legR: [-0.95, 0, 0], legL: [0.85, 0, 0] } },
    salute: { wind: { armR: [-1.6, 0, -0.2], wR: [1.4, 0, 0] }, strike: { armR: [-2.95, 0, -0.1], wR: [1.4, 0, 0], head: [-0.3, 0, 0], torso: [-0.15, 0, 0] } },
    meditate: { wind: { hy: -4, legL: [-1.4, 0, 0.8], legR: [-1.4, 0, -0.8] }, strike: { hy: -5.2, legL: [-1.55, 0, 0.95], legR: [-1.55, 0, -0.95], armL: [-1.25, 0, -0.55], armR: [-1.25, 0, 0.55], torso: [0, 0, 0], head: [0.15, 0, 0] } },
    roar: { wind: { torso: [0.5, 0, 0], head: [0.4, 0, 0], armL: [-0.3, 0, 0.4], armR: [-0.3, 0, -0.4] }, strike: { torso: [-0.45, 0, 0], head: [-0.55, 0, 0], armL: [-1.0, 0, 1.4], armR: [-1.0, 0, -1.4], hy: -0.8 } },
    backstab: { wind: { hy: -2.2, torso: [0.5, 0, 0], armR: [-0.4, 0, -0.5], wR: [1.5, 0, 0] }, strike: { armR: [-1.45, 0, 0.3], wR: [1.5, 0, 0], torso: [0.3, 0.55, 0], hy: -1.5, legR: [0.7, 0, 0], legL: [-0.6, 0, 0] } },
    grab: { wind: { armL: [-1.35, 0, 0.1], armR: [-1.35, 0, -0.1], torso: [0.15, 0, 0] }, strike: { armL: [-1.55, 0, -0.3], armR: [-1.55, 0, 0.3], torso: [0.25, 0, 0], hy: -0.8 } },
    hurl: { wind: { armL: [-1.6, 0, -0.3], armR: [-1.6, 0, 0.3], torso: [0, -0.9, 0] }, strike: { torso: [-0.2, 1.1, 0], armR: [-2.2, 0, -0.6], armL: [-2.0, 0, 0.6], hy: -1 } },
    lance: { wind: { armR: [-1.45, 0, 0.1], wR: [1.57, 0, 0], torso: [0.3, 0.45, 0], hy: -1.5, armL: [-1.0, -0.4, 0.4], wL: [0.8, 0.3, 0] }, strike: { armR: [-1.55, 0, 0.1], wR: [1.57, 0, 0], torso: [0.35, 0.45, 0], hy: -1.8, armL: [-1.1, -0.4, 0.4], wL: [0.8, 0.3, 0] } },
    slam: { wind: { armR: [-3.0, 0, -0.45], armL: [-3.0, 0, 0.45], wR: [1.4, 0, 0], wL: [1.4, 0, 0], torso: [-0.35, 0, 0], legL: [-0.6, 0, 0], legR: [0.3, 0, 0] }, strike: { armR: [-0.5, 0, -0.25], armL: [-0.5, 0, 0.25], torso: [0.75, 0, 0], hy: -3, legL: [-0.9, 0, 0.3], legR: [0.6, 0, -0.3] } },
    burst: { wind: { armL: [-0.4, 0, 0.3], armR: [-0.4, 0, -0.3], torso: [0.4, 0, 0], hy: -1 }, strike: { armL: [-1.2, 0, 1.6], armR: [-1.2, 0, -1.6], torso: [-0.4, 0, 0], head: [-0.4, 0, 0], legL: [-0.2, 0, 0.5], legR: [-0.2, 0, -0.5] } },
  };
  const STATE = {
    flinch: { torso: [-0.5, 0, 0.1], head: [-0.55, 0, 0], armR: [-0.6, 0, -0.75], armL: [-0.6, 0, 0.75], wR: [0.3, 0, 0], wL: [0.3, 0, 0], legL: [0.15, 0, 0.05], legR: [-0.2, 0, -0.05], hy: -0.6 },
    tumble: { torso: [-0.4, 0, 0], head: [-0.45, 0, 0], armR: [-2.4, 0, -0.65], armL: [-2.4, 0, 0.65], wR: [0.3, 0, 0], wL: [0.3, 0, 0], legL: [-0.85, 0, 0.25], legR: [0.25, 0, -0.25], hy: 0 },
    down: { torso: [-0.1, 0, 0], head: [-0.3, 0.4, 0], armR: [-0.3, 0, -1.2], armL: [-0.2, 0, 1.0], legL: [-0.15, 0, 0.2], legR: [-0.4, 0, -0.15], hy: 0 },
    guard: { torso: [0.15, 0.3, 0], head: [0.05, -0.2, 0], armL: [-1.25, -0.6, 0.5], wL: [1.1, 0.5, 0], armR: [-0.85, 0.45, -0.35], wR: [0.6, 0, 0], legL: [-0.4, 0, 0.1], legR: [0.35, 0, -0.1], hy: -0.9 },
    air: { torso: [0.1, 0, 0], legL: [-0.95, 0, 0.1], legR: [-0.2, 0, -0.1], armL: [-0.7, 0, 0.6], armR: [-0.7, 0, -0.6], wR: [0.6, 0, 0], wL: [0.6, 0, 0], hy: 0 },
    fall: { torso: [-0.05, 0, 0], legL: [-0.3, 0, 0.15], legR: [-0.1, 0, -0.15], armL: [-0.9, 0, 0.9], armR: [-0.9, 0, -0.9], wR: [0.5, 0, 0], wL: [0.5, 0, 0], hy: 0 },
    dodge: { torso: [0.7, 0, 0], head: [0.2, 0, 0], legL: [-1.3, 0, 0], legR: [-0.5, 0, 0], armL: [-0.6, 0, 0.3], armR: [-0.6, 0, -0.3], hy: -2.2 },
    victory: { armR: [-2.95, 0, -0.35], wR: [1.4, 0, 0], armL: [-0.25, 0, 0.55], torso: [-0.15, 0.2, 0], head: [-0.3, 0, 0], legL: [-0.1, 0, 0.15], legR: [0.05, 0, -0.1], hy: 0 },
    land: { torso: [0.35, 0, 0], legL: [-0.6, 0, 0.1], legR: [-0.6, 0, -0.1], armL: [-0.4, 0, 0.5], armR: [-0.4, 0, -0.5], hy: -2 },
    crouch: { torso: [0.3, 0.2, 0], legL: [-0.9, 0, 0.12], legR: [-0.7, 0, -0.12], armL: [-0.8, 0, 0.4], armR: [-0.8, 0, -0.4], hy: -2.5 },
    crumple: { torso: [0.75, 0, 0.12], head: [0.6, 0, 0.1], armR: [0.2, 0, -0.25], armL: [0.25, 0, 0.2], wR: [0.2, 0, 0], wL: [0.2, 0, 0], legL: [-1.25, 0, 0.1], legR: [-0.95, 0, -0.12], hy: -4.2 },
    stunned: { torso: [0.4, 0, 0.2], head: [0.5, 0.3, 0.2], armR: [0.1, 0, -0.2], armL: [0.1, 0, 0.2], legL: [-0.2, 0, 0.1], legR: [0.1, 0, -0.1], hy: -1 },
    idle: { torso: [0.02, 0, 0], head: [0, 0, 0], armR: [-0.05, 0, -0.08], armL: [-0.05, 0, 0.08], wR: [0.2, 0, 0], wL: [0.2, 0, 0], legL: [0, 0, 0.03], legR: [0, 0, -0.03], hy: 0 },
  };

  /* which ready stance a build stands in */
  const CACHE = new Map();
  function readyFor(build) {
    const k = build.armR.line + '|' + build.armL.line; if (CACHE.has(k)) return CACHE.get(k);
    const R = build.armR.line, L = build.armL.line;
    let base = R === 'monk' ? READY.fists : READY[R] || READY.blade;
    if (R === 'samurai' && (L === 'samurai' || L === 'dragoon')) base = READY.twohand;   // a free left hand joins the grip
    const out = blend(base, base, 0, base);
    if (L === 'knight' || L === 'viking' || L === 'paladin') { out.armL = READY.shield.armL.slice(); out.wL = READY.shield.wL.slice(); }
    CACHE.set(k, out); return out;
  }
  /* a + (b - a) * t, part by part (missing parts fall back to `base`) */
  function blend(a, b, t, base) {
    const out = {};
    for (const k of PARTS) {
      const x = a[k] || (base && base[k]) || Z, y = b[k] || (base && base[k]) || Z;
      out[k] = [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
    }
    const ha = a.hy != null ? a.hy : (base && base.hy) || 0, hb = b.hy != null ? b.hy : (base && base.hy) || 0;
    out.hy = ha + (hb - ha) * t;
    return out;
  }
  const fill = (p, base) => blend(p, p, 0, base);

  /* ease the figure's parts toward a target pose */
  function drive(fig, target, dt, rate) {
    const k = 1 - Math.exp(-(rate || 18) * dt);
    for (const name of PARTS) {
      const g = fig.parts[name]; if (!g || fig.detached[name]) continue;
      const t = target[name] || Z;
      g.rotation.x += (t[0] - g.rotation.x) * k; g.rotation.y += (t[1] - g.rotation.y) * k; g.rotation.z += (t[2] - g.rotation.z) * k;
    }
    const hips = fig.parts.hips, ry = fig.rest.hips.y + (target.hy || 0) * fig.scale;
    hips.position.y += (ry - hips.position.y) * k;
  }
  /* snap straight to a pose (no easing) */
  function set(fig, target) { drive(fig, target, 1, 1e6); }

  /* the run cycle layered on a base pose */
  function run(base, phase, speed, style) {
    const amp = U.clamp(0.25 + speed * 0.1, 0.3, 0.95), s = Math.sin(phase), c = Math.cos(phase);
    const o = fill(base);
    o.legL = [-s * amp, 0, 0.04]; o.legR = [s * amp, 0, -0.04];
    o.armL = [o.armL[0] + s * amp * 0.5, o.armL[1], o.armL[2]]; o.armR = [o.armR[0] - s * amp * 0.5, o.armR[1], o.armR[2]];
    o.torso = [0.12 + speed * 0.02, o.torso[1] * 0.4 + c * 0.08, 0];
    o.hy = -0.3 - Math.abs(c) * 0.8;
    if (style === 'ninja') { o.armL = [0.95, 0, 0.25]; o.armR = [0.95, 0, -0.25]; o.torso = [0.55, 0, 0]; o.head = [-0.35, 0, 0]; o.hy = -1.2 - Math.abs(c) * 0.6; }
    if (style === 'viking') { o.torso = [0.25, c * 0.15, 0]; o.hy -= 0.4; }
    if (style === 'knight' || style === 'paladin') { o.legL[0] *= 0.7; o.legR[0] *= 0.7; o.hy *= 0.6; }
    if (style === 'dragoon') { o.torso = [0.4, 0.2, 0]; o.armR = base.armR.slice(); o.armL = base.armL.slice(); o.hy = -0.9 - Math.abs(c) * 0.6; }
    if (style === 'summoner') { o.armR = base.armR.slice(); o.legL[0] *= 0.6; o.legR[0] *= 0.6; o.hy = -0.2 - Math.abs(c) * 0.3; }
    if (style === 'bard') { o.hy = -0.1 - Math.abs(c) * 1.5; o.head = [0, -0.2, s * 0.18]; o.armR = base.armR.slice(); }
    return o;
  }

  window.Anim = { READY, P, STATE, PARTS, readyFor, blend, fill, drive, set, run };
})();
