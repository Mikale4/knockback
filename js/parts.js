/* ============================================================================
   parts.js -- the catalog: warrior lines, part slots, rarities, every move.

   A FIGURE is six parts, any mix of lines (all parts share one peg skeleton):
     HEAD   its Special (limited uses a round) and the head's armour
     CORE   HP, defence, weight, guard
     R-ARM  the Light string (and the air Light)
     L-ARM  the Heavy KNOCK, the Launcher, the air Heavy spike, and the guard
     LEGS   speed, jumps, the dash attack and a perk
     CARD   the Legend Card: the Legend Art (super) and a passive
   Each limb has its own armour. Break it and it pops off the figure (pick it
   back up to snap it on). The core is the HP bar.

   Times are seconds. kb = [horizontal, vertical] launch speed in m/s.
   ========================================================================== */
(function () {
  'use strict';
  const SLOTS = ['head', 'core', 'armR', 'armL', 'legs', 'card'];
  const SLOT_NAME = { head: 'HEAD', core: 'CORE', armR: 'R-ARM', armL: 'L-ARM', legs: 'LEGS', card: 'LEGEND CARD' };
  const RARITY = [
    { id: 0, name: 'STANDARD', short: 'STD', stars: 1, mult: 1.00, css: '#a9b4c2' },
    { id: 1, name: 'DELUXE', short: 'DLX', stars: 2, mult: 1.04, css: '#4fc3f7' },
    { id: 2, name: 'LIMITED', short: 'LTD', stars: 3, mult: 1.08, css: '#ffc94a' },
    { id: 3, name: 'CHASE', short: 'CHASE', stars: 4, mult: 1.12, css: '#ff4fd8' },
  ];
  const LINE_ORDER = ['samurai', 'knight', 'pirate', 'monk', 'viking', 'ninja'];
  const LINES = {
    samurai: { name: 'SAMURAI', css: '#e0343f', figure: 'Kaze, the Wandering Blade', blurb: 'Fast, precise strings and a lunge that cuts through a crowd.',
      pal: { main: 0xb3202a, second: 0x1d1b22, accent: 0xd9a441, dark: 0x0f0e12, metal: 0xd4dbe3, skin: 0xf0c8a0, cloth: 0x2b3a67, glow: 0xff3344 } },
    knight: { name: 'KNIGHT', css: '#5b8cff', figure: 'Sir Brackett of the Keep', blurb: 'Heavy plate, a wall of a shield, and the biggest shove in the game.',
      pal: { main: 0xc3cad4, second: 0x2a4f9e, accent: 0xe0b13a, dark: 0x3a3f4a, metal: 0xe8eef4, skin: 0xe8bfa0, cloth: 0x8a2232, glow: 0x66aaff } },
    pirate: { name: 'PIRATE', css: '#f2a33a', figure: 'Captain Gunnel Rook', blurb: 'Cutlass flurries, a pistol that reaches, and a powder keg for company.',
      pal: { main: 0x1f2f5c, second: 0xa8242f, accent: 0xe8b84a, dark: 0x2a1c14, metal: 0xc7cdd4, skin: 0xe3b48d, cloth: 0xefe8d8, glow: 0xffaa22 } },
    monk: { name: 'MONK', css: '#ff9a3c', figure: 'Brother Ox of the Hill', blurb: 'Five-hit fists and a palm that sends anyone into the far wall.',
      pal: { main: 0xe8892b, second: 0x9c3b1f, accent: 0xd8b04a, dark: 0x4a2a17, metal: 0xe0e0e0, skin: 0xd9a06e, cloth: 0xf2d27a, glow: 0x66ffcc } },
    viking: { name: 'VIKING', css: '#3fc1a6', figure: 'Hrolf Ironbeard', blurb: 'Slow, brutal axe swings, armour through hits, and a slam that quakes the floor.',
      pal: { main: 0x6b4a2f, second: 0x2e6b5e, accent: 0xc8ccd2, dark: 0x3b2a1e, metal: 0x9aa3ad, skin: 0xf0c4a2, cloth: 0xc0532b, glow: 0x55ddff } },
    ninja: { name: 'NINJA', css: '#b06bff', figure: 'Kage of the Ninth Night', blurb: 'The fastest feet, wall jumps, a chain that drags you in, and vanishing tricks.',
      pal: { main: 0x262838, second: 0xb5212e, accent: 0x8a8fa0, dark: 0x14141c, metal: 0xd8dde6, skin: 0xe9c19c, cloth: 0x3a3d55, glow: 0xb06bff } },
  };

  /* ------------------------------------------------------------------ moves
     pose: the animation (anim.js). su/ac/rc: startup, active, recovery.
     reach/rad/h: a hit sphere `reach` ahead, radius `rad`, `h` above the feet.
     launch: the hit sends the target tumbling (else a grounded stagger of `stun`).
     zone: which part of the target takes armour damage (high head, mid arms, low legs).
     type: melee (default) | dash | proj | radial | buff | teleport | grab | super */
  const M = {};
  const mv = (id, o) => { M[id] = Object.assign({ id, type: 'melee', su: 0.08, ac: 0.06, rc: 0.15, dmg: 30, kb: [2.5, 0], stun: 0.32, reach: 1.15, rad: 0.8, h: 1.1, lunge: 2, zone: 'mid', sfx: 'slash', trail: 1, hype: 1 }, o); };

  // SAMURAI
  mv('katana1', { name: 'Kiri', pose: 'slashA', su: 0.07, dmg: 28, lunge: 3 });
  mv('katana2', { name: 'Kaeshi', pose: 'slashB', su: 0.07, dmg: 28, lunge: 3 });
  mv('katana3', { name: 'Tsuki', pose: 'thrust', su: 0.08, dmg: 32, reach: 1.45, kb: [3.2, 0], lunge: 5 });
  mv('katana4', { name: 'Rising Cut', pose: 'upslash', su: 0.12, ac: 0.08, rc: 0.24, dmg: 52, kb: [10.5, 7], launch: 1, lunge: 4, finisher: 1 });
  mv('katanaAir', { name: 'Air Slash', pose: 'slashA', su: 0.07, dmg: 30, kb: [3, 4], air: 1, h: 1.0 });
  mv('kesa', { name: 'Kesa-giri', pose: 'twoHandDiag', twoHand: 1, su: 0.2, ac: 0.08, rc: 0.3, dmg: 84, kb: [16, 5.5], launch: 1, lunge: 4, charge: 1, zone: 'mid', sfx: 'heavy' });
  mv('tsubame', { name: 'Tsubame', pose: 'twoHandUp', twoHand: 1, su: 0.1, ac: 0.08, rc: 0.28, dmg: 40, kb: [1.4, 13], launch: 1, lunge: 2, launcher: 1 });
  mv('kabutowari', { name: 'Kabuto-wari', pose: 'twoHandOver', twoHand: 1, su: 0.12, ac: 0.1, rc: 0.25, dmg: 58, kb: [2.5, -14], launch: 1, spike: 1, air: 1, zone: 'high', h: 0.6, sfx: 'heavy' });
  mv('iai', { name: 'Iai Flash', type: 'dash', pose: 'iai', su: 0.14, ac: 0.12, rc: 0.32, dmg: 70, kb: [12, 6.5], launch: 1, dist: 5.6, rad: 0.95, inv: 1, sfx: 'slash', zone: 'mid' });
  mv('ashibarai', { name: 'Ashi-barai', pose: 'sweep', su: 0.1, ac: 0.1, rc: 0.28, dmg: 38, kb: [4, 7.5], launch: 1, lunge: 7, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('thousandCuts', { name: 'Thousand Cuts', type: 'super', pose: 'iai', su: 0.28, catchType: 'dash', dist: 6.5, rad: 1.1, seq: 'cuts', dmg: 300, kb: [20, 8], zone: 'mid' });

  // KNIGHT
  mv('long1', { name: 'Cleave', pose: 'slashA', su: 0.1, ac: 0.07, rc: 0.19, dmg: 38, reach: 1.35, kb: [3, 0], lunge: 3 });
  mv('long2', { name: 'Backswing', pose: 'slashB', su: 0.1, ac: 0.07, rc: 0.19, dmg: 42, reach: 1.35, kb: [3, 0], lunge: 3 });
  mv('long3', { name: 'Judgment', pose: 'overhead', su: 0.16, ac: 0.08, rc: 0.3, dmg: 70, reach: 1.4, kb: [13, 4], launch: 1, lunge: 4, finisher: 1, zone: 'high', sfx: 'heavy' });
  mv('longAir', { name: 'Air Cleave', pose: 'slashA', su: 0.09, dmg: 40, kb: [3, 4], air: 1, reach: 1.3, h: 1.0 });
  mv('shieldBash', { name: 'Shield Bash', pose: 'bash', su: 0.17, ac: 0.08, rc: 0.3, dmg: 80, reach: 1.1, rad: 0.95, kb: [18.5, 4], launch: 1, lunge: 6, armor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('shieldUpper', { name: 'Shield Upper', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('shieldDrop', { name: 'Shield Drop', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 55, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('bulwark', { name: 'Bulwark', type: 'buff', pose: 'salute', su: 0.22, rc: 0.25, buff: { id: 'bulwark', t: 3.2 }, trail: 0, sfx: 'jguard' });
  mv('stomp', { name: 'Sabaton Stomp', pose: 'stomp', su: 0.12, ac: 0.08, rc: 0.3, dmg: 45, kb: [3, 9], launch: 1, lunge: 6, zone: 'low', h: 0.3, trail: 0, sfx: 'heavy' });
  mv('lanceCharge', { name: 'Holy Lance Charge', type: 'super', pose: 'lance', su: 0.32, catchType: 'dash', dist: 10, rad: 1.1, seq: 'charge', armor: 1, dmg: 280, kb: [27, 3], zone: 'mid' });

  // PIRATE
  mv('cut1', { name: 'Cut', pose: 'slashA', su: 0.06, rc: 0.13, dmg: 25, lunge: 3 });
  mv('cut2', { name: 'Cut', pose: 'slashB', su: 0.06, rc: 0.13, dmg: 25, lunge: 3 });
  mv('cut3', { name: 'Stab', pose: 'thrust', su: 0.06, rc: 0.13, dmg: 30, reach: 1.35, lunge: 4 });
  mv('cut4', { name: 'Flourish', pose: 'spin', su: 0.1, ac: 0.12, rc: 0.24, dmg: 46, rad: 1.2, reach: 0.6, kb: [10, 6], launch: 1, finisher: 1 });
  mv('cutAir', { name: 'Air Cut', pose: 'slashA', su: 0.06, dmg: 28, kb: [3, 4], air: 1, h: 1.0 });
  mv('pointBlank', { name: 'Point Blank', type: 'proj', proj: 'shot', pose: 'shoot', su: 0.2, rc: 0.32, dmg: 74, kb: [15, 5], launch: 1, range: 6.5, charge: 1, trail: 0, sfx: 'shot' });
  mv('pistolWhip', { name: 'Pistol Whip', pose: 'upslash', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.5, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'whoosh' });
  mv('airShot', { name: 'Plunging Shot', type: 'proj', proj: 'shotDown', pose: 'shootDown', su: 0.14, rc: 0.28, dmg: 50, kb: [3, -13], launch: 1, spike: 1, air: 1, range: 6, trail: 0, sfx: 'shot' });
  mv('powderKeg', { name: 'Powder Keg', type: 'proj', proj: 'bomb', pose: 'toss', su: 0.18, rc: 0.3, dmg: 88, kb: [13, 9], launch: 1, rad: 2.2, trail: 0, sfx: 'whoosh' });
  mv('pegSweep', { name: 'Peg Sweep', pose: 'sweep', su: 0.1, ac: 0.1, rc: 0.28, dmg: 36, kb: [3, 8], launch: 1, lunge: 7, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('broadside', { name: 'Broadside', type: 'super', pose: 'shoot', su: 0.3, catchType: 'proj', range: 10, seq: 'cannon', dmg: 290, kb: [14, 16], zone: 'high' });

  // MONK
  mv('fist1', { name: 'Jab', pose: 'jabL', su: 0.05, ac: 0.05, rc: 0.11, dmg: 18, reach: 1.0, kb: [1.8, 0], stun: 0.28, lunge: 3, trail: 0, sfx: 'whoosh' });
  mv('fist2', { name: 'Cross', pose: 'jabR', su: 0.05, ac: 0.05, rc: 0.11, dmg: 18, reach: 1.0, kb: [1.8, 0], stun: 0.28, lunge: 3, trail: 0, sfx: 'whoosh' });
  mv('fist3', { name: 'Hook', pose: 'jabL', su: 0.05, ac: 0.05, rc: 0.11, dmg: 22, reach: 1.0, kb: [2, 0], stun: 0.3, lunge: 3, trail: 0, sfx: 'whoosh' });
  mv('fist4', { name: 'Body Blow', pose: 'jabR', su: 0.05, ac: 0.05, rc: 0.11, dmg: 22, reach: 1.0, kb: [2, 0], stun: 0.3, lunge: 3, trail: 0, sfx: 'whoosh' });
  mv('fist5', { name: 'Rush Punch', pose: 'punch', su: 0.1, ac: 0.07, rc: 0.24, dmg: 44, reach: 1.15, kb: [12, 5], launch: 1, lunge: 6, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('fistAir', { name: 'Air Kick', pose: 'airKick', su: 0.05, dmg: 24, kb: [3, 4.5], air: 1, reach: 1.0, h: 0.9, trail: 0, sfx: 'whoosh' });
  mv('thunderPalm', { name: 'Thunder Palm', pose: 'palm', su: 0.2, ac: 0.07, rc: 0.3, dmg: 92, reach: 1.15, kb: [21, 4], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('risingPalm', { name: 'Rising Palm', pose: 'palmUp', su: 0.09, ac: 0.08, rc: 0.27, dmg: 36, kb: [1, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('axeKick', { name: 'Axe Kick', pose: 'axeKick', su: 0.12, ac: 0.1, rc: 0.24, dmg: 54, kb: [2, -14], launch: 1, spike: 1, air: 1, zone: 'high', h: 0.6, trail: 0, sfx: 'heavy' });
  mv('mantra', { name: 'Mantra', type: 'buff', pose: 'meditate', su: 0.42, rc: 0.2, buff: { id: 'mantra', heal: 0.07, repair: 0.25 }, trail: 0, sfx: 'jguard' });
  mv('flyingKnee', { name: 'Flying Knee', pose: 'knee', su: 0.1, ac: 0.1, rc: 0.27, dmg: 42, kb: [5, 11], launch: 1, lunge: 7, trail: 0, sfx: 'whoosh' });
  mv('hundredPalm', { name: 'Hundred Hands', type: 'super', pose: 'punch', su: 0.26, catchType: 'melee', lunge: 9, reach: 1.2, rad: 1.0, seq: 'hundred', dmg: 300, kb: [24, 6], zone: 'mid' });

  // VIKING
  mv('axe1', { name: 'Hack', pose: 'slashA', su: 0.13, ac: 0.08, rc: 0.21, dmg: 48, reach: 1.3, kb: [3.2, 0], stun: 0.36, lunge: 3, sfx: 'heavy' });
  mv('axe2', { name: 'Hew', pose: 'slashB', su: 0.13, ac: 0.08, rc: 0.21, dmg: 52, reach: 1.3, kb: [3.2, 0], stun: 0.36, lunge: 3, sfx: 'heavy' });
  mv('axe3', { name: 'Cleave', pose: 'overhead', su: 0.2, ac: 0.08, rc: 0.32, dmg: 85, reach: 1.35, kb: [15, 6], launch: 1, lunge: 4, finisher: 1, zone: 'high', sfx: 'heavy' });
  mv('axeAir', { name: 'Air Chop', pose: 'overhead', su: 0.1, dmg: 45, kb: [3, 3.5], air: 1, reach: 1.25, h: 0.9, sfx: 'heavy' });
  mv('shieldRam', { name: 'Shield Ram', pose: 'bash', su: 0.18, ac: 0.1, rc: 0.3, dmg: 80, reach: 1.1, rad: 0.95, kb: [17, 6], launch: 1, lunge: 9, armor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('upperHaft', { name: 'Haft Upper', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 42, kb: [1, 12], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('skullDrop', { name: 'Skull Drop', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 58, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('warHorn', { name: 'War Horn', type: 'radial', pose: 'roar', su: 0.2, ac: 0.1, rc: 0.35, dmg: 30, kb: [10, 5], launch: 1, rad: 2.7, buff: { id: 'fury', t: 5 }, trail: 0, sfx: 'boom', zone: 'high' });
  mv('bullRush', { name: 'Bull Rush', pose: 'bash', su: 0.12, ac: 0.12, rc: 0.3, dmg: 48, kb: [12, 5], launch: 1, lunge: 9, armor: 1, trail: 0, sfx: 'heavy' });
  mv('ragnarok', { name: 'Ragnarök', type: 'super', pose: 'slam', su: 0.5, catchType: 'radial', rad: 3.6, leap: 1, seq: 'quake', dmg: 270, kb: [8, 16], zone: 'high' });

  // NINJA
  mv('tanto1', { name: 'Flick', pose: 'slashA', su: 0.045, ac: 0.05, rc: 0.1, dmg: 20, reach: 1.05, kb: [2, 0], stun: 0.28, lunge: 4 });
  mv('tanto2', { name: 'Flick', pose: 'slashB', su: 0.045, ac: 0.05, rc: 0.1, dmg: 20, reach: 1.05, kb: [2, 0], stun: 0.28, lunge: 4 });
  mv('tanto3', { name: 'Pierce', pose: 'thrust', su: 0.05, ac: 0.05, rc: 0.1, dmg: 24, reach: 1.2, kb: [2.4, 0], stun: 0.3, lunge: 5 });
  mv('tanto4', { name: 'Shadow Slash', pose: 'spin', su: 0.09, ac: 0.1, rc: 0.22, dmg: 42, rad: 1.15, reach: 0.7, kb: [11, 6], launch: 1, finisher: 1 });
  mv('tantoAir', { name: 'Air Flick', pose: 'slashA', su: 0.045, dmg: 22, kb: [3, 4.5], air: 1, h: 1.0 });
  mv('chainHook', { name: 'Chain Hook', type: 'proj', proj: 'chain', pose: 'shoot', su: 0.17, rc: 0.3, dmg: 48, kb: [0, 3], pull: 1, stun: 0.6, range: 5, charge: 1, trail: 0, sfx: 'whoosh' });
  mv('sickleRise', { name: 'Sickle Rise', pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.26, dmg: 36, kb: [1.4, 13], launch: 1, launcher: 1 });
  mv('chainDrop', { name: 'Chain Drop', pose: 'overhead', su: 0.12, ac: 0.1, rc: 0.24, dmg: 50, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6 });
  mv('shadowStep', { name: 'Shadow Step', type: 'teleport', pose: 'backstab', su: 0.1, ac: 0.08, rc: 0.24, dmg: 46, kb: [9.5, 6.5], launch: 1, range: 9, inv: 1, reach: 1.1, sfx: 'slash', zone: 'mid' });
  mv('shadowKick', { name: 'Shadow Kick', pose: 'knee', su: 0.07, ac: 0.1, rc: 0.24, dmg: 34, kb: [9, 5], launch: 1, lunge: 9, trail: 0, sfx: 'whoosh' });
  mv('cloneBarrage', { name: 'Shadow Clone Arts', type: 'super', pose: 'backstab', su: 0.26, catchType: 'dash', dist: 7.5, rad: 1.1, seq: 'clones', dmg: 290, kb: [16, 11], zone: 'mid' });

  // GENERIC (broken arms fall back on these) and the universal throw
  mv('stump1', { name: 'Stump Jab', pose: 'jabL', su: 0.07, dmg: 12, reach: 0.9, kb: [1.5, 0], trail: 0, sfx: 'whoosh' });
  mv('stump2', { name: 'Shoulder', pose: 'bash', su: 0.1, dmg: 22, reach: 0.95, kb: [8, 3.5], launch: 1, lunge: 4, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('stumpAir', { name: 'Air Knee', pose: 'knee', su: 0.07, dmg: 16, kb: [2.5, 4], air: 1, reach: 0.9, trail: 0, sfx: 'whoosh' });
  mv('tackle', { name: 'Tackle', pose: 'bash', su: 0.18, dmg: 40, reach: 1.0, kb: [11, 4], launch: 1, lunge: 7, charge: 1, trail: 0, sfx: 'heavy' });
  mv('headbutt', { name: 'Headbutt', pose: 'bashUp', su: 0.11, dmg: 25, kb: [1, 10.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('bodyDrop', { name: 'Body Drop', pose: 'bashDown', su: 0.13, dmg: 30, kb: [2, -12], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('throw', { name: 'Throw', type: 'grab', pose: 'grab', su: 0.09, ac: 0.07, rc: 0.38, dmg: 70, reach: 0.95, rad: 0.75, kb: [17, 6], launch: 1, trail: 0, sfx: 'whoosh', zone: 'mid' });

  /* ------------------------------------------------------------------ parts */
  const P = {
    samurai: {
      head: { name: 'Crescent Kabuto', armor: 110, weight: 1.0, special: 'iai', uses: 3, hype: 1.0, desc: 'SPECIAL: Iai Flash. Dash through the foe in a single cut (invulnerable).' },
      core: { name: 'Lacquered Ō-yoroi', hp: 1000, def: 0.06, weight: 1.0, guard: 0, desc: 'Balanced lacquer plate. No weak spots, no tricks.' },
      armR: { name: 'Katana', armor: 130, weight: 1.0, light: ['katana1', 'katana2', 'katana3', 'katana4'], air: 'katanaAir', trail: 0xffffff, desc: 'The one blade. LIGHT: 4-hit string ending in a Rising Cut. With the Kote it is gripped in both hands.' },
      armL: { name: 'Lacquered Kote', armor: 125, weight: 0.95, heavy: 'kesa', launch: 'tsubame', airHeavy: 'kabutowari', guard: 90, chip: 1, trail: 0xffd0d0, desc: 'An armoured gauntlet, hand free for a two-handed grip. HEAVY: Kesa-giri, a two-handed diagonal KNOCK with the right-hand weapon. Guard: medium.' },
      legs: { name: 'Hakama & Waraji', armor: 170, weight: 1.0, speed: 6.3, jump: 11.5, airJumps: 1, dashAtk: 'ashibarai', perk: null, desc: 'Even footing. DASH ATTACK: Ashi-barai, a low sweep that pops them up.' },
      card: { name: 'Way of the Blade', super: 'thousandCuts', passive: 'bushido', desc: 'LEGEND ART: Thousand Cuts. PASSIVE (Bushido): +15% damage under 35% HP.' },
    },
    knight: {
      head: { name: 'Great Helm', armor: 160, weight: 1.15, special: 'bulwark', uses: 3, hype: 0.9, desc: 'SPECIAL: Bulwark. 3 s of super armour and 25% less damage.' },
      core: { name: 'Plate Cuirass', hp: 1150, def: 0.12, weight: 1.3, guard: 30, desc: 'The most HP and defence. Heavy: you fly less, you move less.' },
      armR: { name: 'Longsword', armor: 150, weight: 1.15, light: ['long1', 'long2', 'long3'], air: 'longAir', trail: 0xcfe2ff, desc: 'LIGHT: 3 slow, long, heavy-hitting swings.' },
      armL: { name: 'Kite Shield', armor: 180, weight: 1.25, heavy: 'shieldBash', launch: 'shieldUpper', airHeavy: 'shieldDrop', guard: 165, chip: 0.5, trail: 0xcfe2ff, desc: 'HEAVY: Shield Bash, armoured, the biggest shove. Guard: huge, half chip.' },
      legs: { name: 'Iron Sabatons', armor: 220, weight: 1.35, speed: 5.1, jump: 9.8, airJumps: 1, dashAtk: 'stomp', perk: 'anchor', desc: 'Slow but planted: 15% less knockback taken. DASH ATTACK: Sabaton Stomp.' },
      card: { name: 'Oath of the Keep', super: 'lanceCharge', passive: 'plateFaith', desc: 'LEGEND ART: Holy Lance Charge, armoured. PASSIVE: guard +40%, chip -30%.' },
    },
    pirate: {
      head: { name: "Captain's Tricorne", armor: 105, weight: 0.95, special: 'powderKeg', uses: 3, hype: 1.15, desc: 'SPECIAL: Powder Keg. Lob a bomb that blows them off their feet.' },
      core: { name: 'Frock Coat', hp: 950, def: 0.04, weight: 0.95, guard: 0, desc: 'Light and loose. Builds Hype faster.', hypeBonus: 0.1 },
      armR: { name: 'Cutlass', armor: 125, weight: 0.95, light: ['cut1', 'cut2', 'cut3', 'cut4'], air: 'cutAir', trail: 0xfff1c0, desc: 'LIGHT: quick 4-hit string ending in a spinning Flourish.' },
      armL: { name: 'Flintlock', armor: 110, weight: 0.9, heavy: 'pointBlank', launch: 'pistolWhip', airHeavy: 'airShot', guard: 70, chip: 1.1, trail: 0xffd28a, holster: 1, desc: 'Holstered until he fires (the cutlass is put away while it is out). HEAVY: Point Blank, a shot that reaches 6 m. Guard: weak.' },
      legs: { name: 'Peg & Boot', armor: 165, weight: 0.95, speed: 6.2, jump: 11, airJumps: 1, dashAtk: 'pegSweep', perk: 'sealegs', desc: 'Sea legs: dodges travel 30% further. DASH ATTACK: Peg Sweep.' },
      card: { name: 'Jolly Plunder', super: 'broadside', passive: 'plunder', desc: 'LEGEND ART: Broadside, a cannon barrage. PASSIVE (Plunder): +35% Hype gain.' },
    },
    monk: {
      head: { name: 'Serene Mind', armor: 100, weight: 0.9, special: 'mantra', uses: 3, hype: 1.0, desc: 'SPECIAL: Mantra. Heal 7% HP and repair every part 25%.' },
      core: { name: 'Saffron Robe', hp: 900, def: 0.03, weight: 0.85, guard: -10, desc: 'Light as a leaf. Burst refills 25% faster.', burstBonus: 0.25 },
      armR: { name: 'Iron Fist Wraps', armor: 120, weight: 0.85, light: ['fist1', 'fist2', 'fist3', 'fist4', 'fist5'], air: 'fistAir', trail: 0xffe0a0, desc: 'LIGHT: 5 lightning jabs, the fastest string, short reach.' },
      armL: { name: 'Thunder Palm', armor: 115, weight: 0.85, heavy: 'thunderPalm', launch: 'risingPalm', airHeavy: 'axeKick', guard: 60, chip: 1.2, trail: 0x9ff7ff, desc: 'HEAVY: Thunder Palm, the strongest straight KNOCK. Guard: weak.' },
      legs: { name: 'Cloud Steps', armor: 150, weight: 0.85, speed: 6.6, jump: 12.5, airJumps: 2, dashAtk: 'flyingKnee', perk: 'cloudstep', desc: 'Triple jump and two air dodges. DASH ATTACK: Flying Knee launcher.' },
      card: { name: 'Hundred Hands', super: 'hundredPalm', passive: 'innerPeace', desc: 'LEGEND ART: Hundred Hands. PASSIVE (Inner Peace): Burst fills 45% faster.' },
    },
    viking: {
      head: { name: 'Horned Helm', armor: 145, weight: 1.15, special: 'warHorn', uses: 3, hype: 0.95, desc: 'SPECIAL: War Horn. A roar that blows them back; +15% damage for 5 s.' },
      core: { name: 'Fur & Mail', hp: 1100, def: 0.08, weight: 1.25, guard: 15, desc: 'Thick fur over mail. Lots of HP.' },
      armR: { name: 'Bearded Axe', armor: 150, weight: 1.2, light: ['axe1', 'axe2', 'axe3'], air: 'axeAir', trail: 0xd8e8ff, desc: 'LIGHT: 3 slow, brutal chops. Each one hurts.' },
      armL: { name: 'Round Shield', armor: 170, weight: 1.2, heavy: 'shieldRam', launch: 'upperHaft', airHeavy: 'skullDrop', guard: 140, chip: 0.7, trail: 0xd8e8ff, desc: 'HEAVY: Shield Ram, armoured and long. Guard: strong.' },
      legs: { name: 'Fur Boots', armor: 200, weight: 1.25, speed: 5.5, jump: 10, airJumps: 1, dashAtk: 'bullRush', perk: 'unstoppable', desc: 'Dash attacks carry super armour. DASH ATTACK: Bull Rush.' },
      card: { name: 'Ragnarök', super: 'ragnarok', passive: 'fury', desc: 'LEGEND ART: Ragnarök, a leaping quake. PASSIVE (Fury): up to +18% damage as HP falls.' },
    },
    ninja: {
      head: { name: 'Shinobi Hood', armor: 95, weight: 0.85, special: 'shadowStep', uses: 3, hype: 1.05, desc: 'SPECIAL: Shadow Step. Vanish behind them and stab.' },
      core: { name: 'Shinobi Shōzoku', hp: 880, def: 0.02, weight: 0.8, guard: -10, desc: 'Barely there. The lightest core: fast, but you fly far.' },
      armR: { name: 'Tantō', armor: 110, weight: 0.8, light: ['tanto1', 'tanto2', 'tanto3', 'tanto4'], air: 'tantoAir', trail: 0xd9b8ff, desc: 'LIGHT: the quickest blade string, ending in a Shadow Slash.' },
      armL: { name: 'Kusarigama', armor: 110, weight: 0.85, heavy: 'chainHook', launch: 'sickleRise', airHeavy: 'chainDrop', guard: 70, chip: 1.1, trail: 0xd9b8ff, desc: 'HEAVY: Chain Hook, drag them in from 5 m. Guard: weak.' },
      legs: { name: 'Tabi Boots', armor: 145, weight: 0.8, speed: 7.4, jump: 12, airJumps: 2, dashAtk: 'shadowKick', perk: 'walljump', desc: 'The fastest legs, a triple jump, and WALL JUMPS. DASH ATTACK: Shadow Kick.' },
      card: { name: 'Shadow Clone Arts', super: 'cloneBarrage', passive: 'vanish', desc: 'LEGEND ART: four clones strike at once. PASSIVE (Vanish): longer dodge, shorter cooldown.' },
    },
  };

  const PASSIVE = {
    bushido: 'Bushido: +15% damage under 35% HP', plateFaith: 'Plate Faith: guard +40%, chip -30%', plunder: 'Plunder: +35% Hype gain',
    innerPeace: 'Inner Peace: Burst fills 45% faster', fury: 'Fury: up to +18% damage as HP falls', vanish: 'Vanish: longer dodge, shorter cooldown',
  };

  /* --------------------------------------------------------------- builds */
  const lv = it => (it && it.lv) || 0;
  const mult = it => (RARITY[(it && it.r) || 0].mult) * (1 + 0.02 * lv(it));
  const part = (b, slot) => P[b[slot].line][slot];

  /* every number a fighter needs, from its six parts (bonus=false: rarity and levels ignored, for fair versus) */
  function stats(b, bonus) {
    const m = slot => bonus === false ? 1 : mult(b[slot]);
    const H = part(b, 'head'), C = part(b, 'core'), R = part(b, 'armR'), L = part(b, 'armL'), G = part(b, 'legs'), K = part(b, 'card');
    const weight = C.weight * 0.4 + G.weight * 0.3 + R.weight * 0.1 + L.weight * 0.1 + H.weight * 0.1;
    const cardLine = b.card.line;
    const match = ['head', 'core', 'armR', 'armL', 'legs'].filter(s => b[s].line === cardLine).length;
    const set = match >= 5 ? 2 : match >= 3 ? 1 : 0;
    const S = {
      hp: Math.round(C.hp * m('core') * (set === 2 ? 1.06 : 1)),
      def: C.def, weight,
      kbTaken: (1 / Math.sqrt(weight)) * (G.perk === 'anchor' ? 0.85 : 1),
      speed: G.speed * (1.08 - 0.08 * weight), jump: G.jump, airJumps: G.airJumps, perk: G.perk,
      airDodges: G.perk === 'cloudstep' ? 2 : 1,
      dodgeDist: G.perk === 'sealegs' ? 1.3 : 1,
      guard: Math.round((100 + L.guard + C.guard) * (K.passive === 'plateFaith' ? 1.4 : 1)),
      chip: L.chip * (K.passive === 'plateFaith' ? 0.7 : 1),
      hypeGain: H.hype * (1 + (C.hypeBonus || 0)) * (K.passive === 'plunder' ? 1.35 : 1),
      burstRate: (1 + (C.burstBonus || 0)) * (K.passive === 'innerPeace' ? 1.45 : 1),
      dmgR: m('armR'), dmgL: m('armL'), dmgH: m('head'), dmgG: m('legs'), dmgK: m('card'),
      set, setDmg: set === 2 ? 1.08 : set === 1 ? 1.04 : 1,
      armor: { head: Math.round(H.armor * m('head')), armR: Math.round(R.armor * m('armR')), armL: Math.round(L.armor * m('armL')), legs: Math.round(G.armor * m('legs')) },
      passive: K.passive, special: H.special, uses: H.uses, super: K.super,
      light: R.light, air: R.air, heavy: L.heavy, launch: L.launch, airHeavy: L.airHeavy, dashAtk: G.dashAtk,
      trailR: R.trail, trailL: L.trail,
    };
    return S;
  }

  /* the six "mint in box" figures: a full set of one line */
  function mintBuild(line, r) { const b = { name: LINES[line].figure }; for (const s of SLOTS) b[s] = { line, r: r || 0, lv: 0 }; return b; }
  function randomBuild(rMax, lineBias) {
    const b = {}; const base = lineBias || U.pick(LINE_ORDER);
    for (const s of SLOTS) b[s] = { line: Math.random() < 0.55 ? base : U.pick(LINE_ORDER), r: U.rndi(0, rMax || 0), lv: 0 };
    b.name = LINES[b.core.line].name[0] + LINES[b.core.line].name.slice(1).toLowerCase() + '-' + LINES[b.armR.line].name[0] + LINES[b.legs.line].name[0] + ' ' + U.rndi(10, 99);
    return b;
  }
  const key = (line, slot, r) => line + ':' + slot + ':' + r;
  const itemName = (line, slot) => P[line][slot].name;

  window.KB = { SLOTS, SLOT_NAME, RARITY, LINES, LINE_ORDER, PARTS: P, MOVES: M, PASSIVE, stats, mintBuild, randomBuild, key, itemName, part };
})();
