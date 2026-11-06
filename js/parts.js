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
  const LINE_ORDER = ['samurai', 'knight', 'pirate', 'monk', 'viking', 'ninja', 'summoner', 'paladin', 'dragoon', 'bard'];
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
    summoner: { name: 'SUMMONER', css: '#5fe08a', figure: 'Mirelle of the Ninefold Circle', blurb: 'Calls little imps that fight beside her. They pop after a couple of hits, so keep calling.',
      pal: { main: 0x4b2a7a, second: 0x1f7a6a, accent: 0xd9b84a, dark: 0x1a1226, metal: 0xc8c0d8, skin: 0xe8c4a8, cloth: 0x2a1a40, glow: 0x6dffa0 } },
    paladin: { name: 'PALADIN', css: '#ffe066', figure: 'Dame Aurelia Dawnward', blurb: 'A warhammer, a tower shield, and every hit she lands patches her up.',
      pal: { main: 0xefe8d4, second: 0x9c1f2e, accent: 0xe9b93c, dark: 0x5a4632, metal: 0xfff2c8, skin: 0xe8bfa0, cloth: 0x9c1f2e, glow: 0xfff07a } },
    dragoon: { name: 'DRAGOON', css: '#36b6ff', figure: 'Varek Wyrmspear', blurb: 'The longest reach and the highest jump. Vault off them and keep the fight in the sky.',
      pal: { main: 0x283c78, second: 0x8a1c2a, accent: 0xc9ced8, dark: 0x141a2e, metal: 0xdfe6ee, skin: 0xe6bc98, cloth: 0x3a2a5a, glow: 0xff7a30 } },
    bard: { name: 'BARD', css: '#ff6fa8', figure: 'Pip Lightfinger, the Wandering Lute', blurb: 'Hits harder on the beat, sings them to sleep, and ends every fight with a show.',
      pal: { main: 0xb83a5e, second: 0xf2d27a, accent: 0xe8b84a, dark: 0x3a2230, metal: 0xd8d0c0, skin: 0xf0c8a0, cloth: 0x2c5a8a, glow: 0xff8ad8 } },
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
  mv('kesa', { name: 'Kesa-giri', pose: 'twoHandDiag', twoHand: 1, su: 0.2, ac: 0.08, rc: 0.3, dmg: 84, kb: [16, 5.5], launch: 1, lunge: 4, charge: 1, zone: 'mid', sfx: 'heavy' });
  mv('tsubame', { name: 'Tsubame', pose: 'twoHandUp', twoHand: 1, su: 0.1, ac: 0.08, rc: 0.28, dmg: 40, kb: [1.4, 13], launch: 1, lunge: 2, launcher: 1 });
  mv('kabutowari', { name: 'Kabuto-wari', pose: 'twoHandOver', twoHand: 1, su: 0.12, ac: 0.1, rc: 0.25, dmg: 58, kb: [2.5, -14], launch: 1, spike: 1, air: 1, zone: 'high', h: 0.6, sfx: 'heavy' });
  mv('iai', { name: 'Iai Flash', type: 'dash', pose: 'iai', su: 0.14, ac: 0.12, rc: 0.32, dmg: 70, kb: [12, 6.5], launch: 1, dist: 5.6, rad: 0.95, inv: 1, sfx: 'slash', zone: 'mid' });
  mv('ashibarai', { name: 'Ashi-barai', pose: 'sweep', su: 0.1, ac: 0.1, rc: 0.28, dmg: 38, kb: [4, 7.5], launch: 1, lunge: 7, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('thousandCuts', { name: 'Thousand Cuts', type: 'super', pose: 'iai', su: 0.14, catchType: 'dash', dist: 7, rad: 1.25, seq: 'cuts', dmg: 300, kb: [20, 8], zone: 'mid' });

  // KNIGHT
  mv('shieldBash', { name: 'Shield Bash', pose: 'bash', su: 0.17, ac: 0.08, rc: 0.3, dmg: 80, reach: 1.1, rad: 0.95, kb: [18.5, 4], launch: 1, lunge: 6, armor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('shieldUpper', { name: 'Shield Upper', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('shieldDrop', { name: 'Shield Drop', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 55, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('bulwark', { name: 'Bulwark', type: 'buff', pose: 'salute', su: 0.22, rc: 0.25, buff: { id: 'bulwark', t: 3.2 }, trail: 0, sfx: 'jguard' });
  mv('stomp', { name: 'Sabaton Stomp', pose: 'stomp', su: 0.12, ac: 0.08, rc: 0.3, dmg: 45, kb: [3, 9], launch: 1, lunge: 6, zone: 'low', h: 0.3, trail: 0, sfx: 'heavy' });
  mv('lanceCharge', { name: 'Holy Lance Charge', type: 'super', pose: 'lance', su: 0.16, catchType: 'dash', dist: 10, rad: 1.25, seq: 'charge', armor: 1, dmg: 280, kb: [27, 3], zone: 'mid' });

  // PIRATE
  mv('pointBlank', { name: 'Point Blank', type: 'proj', proj: 'shot', pose: 'shoot', su: 0.2, rc: 0.32, dmg: 74, kb: [15, 5], launch: 1, range: 6.5, charge: 1, trail: 0, sfx: 'shot' });
  mv('pistolWhip', { name: 'Pistol Whip', pose: 'upslash', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.5, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'whoosh' });
  mv('airShot', { name: 'Plunging Shot', type: 'proj', proj: 'shotDown', pose: 'shootDown', su: 0.14, rc: 0.28, dmg: 50, kb: [3, -13], launch: 1, spike: 1, air: 1, range: 6, trail: 0, sfx: 'shot' });
  mv('powderKeg', { name: 'Powder Keg', type: 'proj', proj: 'bomb', pose: 'toss', su: 0.18, rc: 0.3, dmg: 88, kb: [13, 9], launch: 1, rad: 2.2, trail: 0, sfx: 'whoosh' });
  mv('pegSweep', { name: 'Peg Sweep', pose: 'sweep', su: 0.1, ac: 0.1, rc: 0.28, dmg: 36, kb: [3, 8], launch: 1, lunge: 7, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('broadside', { name: 'Broadside', type: 'super', pose: 'shoot', su: 0.14, catchType: 'proj', range: 11, seq: 'cannon', dmg: 290, kb: [14, 16], zone: 'high' });

  // MONK
  mv('thunderPalm', { name: 'Thunder Palm', pose: 'palm', su: 0.2, ac: 0.07, rc: 0.3, dmg: 92, reach: 1.15, kb: [21, 4], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('risingPalm', { name: 'Rising Palm', pose: 'palmUp', su: 0.09, ac: 0.08, rc: 0.27, dmg: 36, kb: [1, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('axeKick', { name: 'Axe Kick', pose: 'axeKick', su: 0.12, ac: 0.1, rc: 0.24, dmg: 54, kb: [2, -14], launch: 1, spike: 1, air: 1, zone: 'high', h: 0.6, trail: 0, sfx: 'heavy' });
  mv('mantra', { name: 'Mantra', type: 'buff', pose: 'meditate', su: 0.42, rc: 0.2, buff: { id: 'mantra', heal: 0.07, repair: 0.25 }, trail: 0, sfx: 'jguard' });
  mv('flyingKnee', { name: 'Flying Knee', pose: 'knee', su: 0.1, ac: 0.1, rc: 0.27, dmg: 42, kb: [5, 11], launch: 1, lunge: 7, trail: 0, sfx: 'whoosh' });
  mv('hundredPalm', { name: 'Hundred Hands', type: 'super', pose: 'punch', su: 0.12, catchType: 'melee', lunge: 9, reach: 1.2, rad: 1.1, close: 5.5, seq: 'hundred', dmg: 300, kb: [24, 6], zone: 'mid' });

  // VIKING
  mv('shieldRam', { name: 'Shield Ram', pose: 'bash', su: 0.18, ac: 0.1, rc: 0.3, dmg: 80, reach: 1.1, rad: 0.95, kb: [17, 6], launch: 1, lunge: 9, armor: 1, oneArmor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('upperHaft', { name: 'Haft Upper', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 42, kb: [1, 12], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('skullDrop', { name: 'Skull Drop', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 58, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('warHorn', { name: 'War Horn', type: 'radial', pose: 'roar', su: 0.2, ac: 0.1, rc: 0.35, dmg: 30, kb: [10, 5], launch: 1, rad: 2.7, buff: { id: 'fury', t: 5 }, trail: 0, sfx: 'boom', zone: 'high' });
  mv('bullRush', { name: 'Bull Rush', pose: 'bash', su: 0.12, ac: 0.12, rc: 0.3, dmg: 48, kb: [12, 5], launch: 1, lunge: 9, armor: 1, oneArmor: 1, trail: 0, sfx: 'heavy' });
  mv('ragnarok', { name: 'Ragnarök', type: 'super', pose: 'slam', su: 0.12, catchType: 'leap', flight: 0.55, rad: 4, fated: 1, seq: 'quake', dmg: 270, kb: [8, 16], zone: 'high' });

  // NINJA
  // the SUMMONER with an imp in hand throws it instead (match.js): the same button, the same extension
  mv('impToss', { name: 'Imp Toss', type: 'proj', proj: 'imp', pose: 'toss', su: 0.1, rc: 0.22, dmg: 28, kb: [2, 8], launch: 1, range: 7.5, lunge: 0, hype: 0.6, trail: 0, sfx: 'whoosh' });
  mv('partToss', { name: 'Part Toss', type: 'proj', proj: 'part', pose: 'toss', su: 0.12, rc: 0.24, dmg: 24, kb: [2, 8], launch: 1, range: 7.5, lunge: 0, hype: 0.6, trail: 0, sfx: 'whoosh' });
  mv('chainHook', { name: 'Chain Hook', type: 'proj', proj: 'chain', pose: 'chainThrow', su: 0.17, rc: 0.3, dmg: 48, kb: [0, 3], pull: 1, stun: 0.6, range: 5, charge: 1, trail: 0, sfx: 'whoosh', limit: { n: 2, t: 5 } });   // twice in any 5 s
  mv('sickleRise', { name: 'Sickle Rise', pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.26, dmg: 36, kb: [1.4, 13], launch: 1, launcher: 1 });
  mv('chainDrop', { name: 'Chain Drop', pose: 'overhead', su: 0.12, ac: 0.1, rc: 0.24, dmg: 50, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6 });
  mv('shadowStep', { name: 'Shadow Step', type: 'teleport', pose: 'backstab', su: 0.1, ac: 0.08, rc: 0.24, dmg: 46, kb: [9.5, 6.5], launch: 1, range: 9, inv: 1, reach: 1.1, sfx: 'slash', zone: 'mid' });
  mv('shadowKick', { name: 'Shadow Kick', pose: 'knee', su: 0.07, ac: 0.1, rc: 0.24, dmg: 34, kb: [9, 5], launch: 1, lunge: 9, trail: 0, sfx: 'whoosh' });
  mv('cloneBarrage', { name: 'Shadow Clone Arts', type: 'super', pose: 'backstab', su: 0.12, catchType: 'dash', dist: 7.5, rad: 1.25, seq: 'clones', dmg: 290, kb: [16, 11], zone: 'mid' });


  /* ---- the R-ARM strings: each line its own tree.
     nx.l is the next Light; nx.p is the PAUSE branch (let the move finish, wait a beat, then Light).
     multi: hits that many times; rapid: mash Light to extend it; cross: blink behind them first;
     around: hits all around; dive: drives down through the air; crumple / dizzy: a long helpless stagger;
     kbBack: knocks them back the way you came; chargeL: hold Light to wind it up; armorSU: armour in startup. */
  // SAMURAI · Katana: precise cuts that end launching UP; the pause branch dashes through them
  mv('kaA', { name: 'Kiri', pose: 'kiri', su: 0.07, dmg: 28, lunge: 3, nx: { l: 'kaB' } });
  mv('kaB', { name: 'Kesa', pose: 'kesa', su: 0.07, dmg: 30, lunge: 3, stun: 0.5, nx: { l: 'kaC', p: 'kaP' } });
  mv('kaC', { name: 'Tsuki', pose: 'tsuki', su: 0.08, dmg: 34, reach: 1.6, kb: [3.5, 0], lunge: 6, nx: { l: 'kaD' } });
  mv('kaD', { name: 'Rising Cut', pose: 'upslash', su: 0.11, ac: 0.08, rc: 0.24, dmg: 48, kb: [2, 12.5], launch: 1, lunge: 3, finisher: 1, launcher: 1 });
  mv('kaP', { name: 'Issen', type: 'dash', pose: 'iai', su: 0.15, ac: 0.1, rc: 0.3, dmg: 66, dist: 3.4, rad: 0.95, kb: [13, 5], launch: 1, kbBack: 1, inv: 1, finisher: 1 });
  mv('kaAirA', { name: 'Air Kiri', pose: 'kiri', su: 0.06, dmg: 26, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'kaAirB' } });
  mv('kaAirB', { name: 'Air Kesa', pose: 'kesa', su: 0.06, dmg: 26, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'kaAirC' } });
  mv('kaAirC', { name: 'Tsubame Gaeshi', pose: 'tsubameAir', su: 0.08, ac: 0.14, rc: 0.24, dmg: 22, multi: 2, kb: [2, -13], launch: 1, spike: 1, air: 1, h: 0.8 });
  mv('kaeshi', { name: 'Kaeshi', pose: 'iai', su: 0.03, ac: 0.08, rc: 0.25, dmg: 55, reach: 1.3, rad: 1, crumple: 0.9, inv: 1, lunge: 4 });
  // KNIGHT · Longsword: three slow armoured swings; the last one slams them into the floor
  mv('loA', { name: 'Cleave', pose: 'cleave', su: 0.1, ac: 0.07, rc: 0.19, dmg: 38, reach: 1.4, kb: [3, 0], lunge: 3, nx: { l: 'loB' } });
  mv('loB', { name: 'Backswing', pose: 'backswing', su: 0.11, ac: 0.07, rc: 0.2, dmg: 42, reach: 1.4, kb: [3, 0], lunge: 3, armorSU: 1, stun: 0.5, nx: { l: 'loC', p: 'loP' } });
  mv('loC', { name: 'Judgment', pose: 'judgment', su: 0.18, ac: 0.08, rc: 0.32, dmg: 70, reach: 1.45, kb: [2, -10], launch: 1, spike: 1, armorSU: 1, finisher: 1, zone: 'high', sfx: 'heavy' });
  mv('loP', { name: 'Pommel Strike', pose: 'pommel', su: 0.06, ac: 0.06, rc: 0.22, dmg: 30, reach: 1.0, crumple: 1.0, lunge: 4, trail: 0, sfx: 'heavy', zone: 'high' });
  mv('loAirA', { name: 'Air Cleave', pose: 'cleave', su: 0.09, dmg: 40, kb: [3, 4], air: 1, reach: 1.3, h: 1, nx: { l: 'loAirB' } });
  mv('loAirB', { name: 'Plunging Thrust', pose: 'plunge', su: 0.12, ac: 0.3, rc: 0.25, dmg: 48, kb: [2, -12], launch: 1, spike: 1, air: 1, dive: 1, reach: 1.2, h: 0.5, sfx: 'heavy' });
  // PIRATE · Cutlass: a flashy spin, then a boot to the face; the pause branch throws sand
  mv('cuA', { name: 'Cut', pose: 'cutA', su: 0.06, rc: 0.13, dmg: 24, lunge: 3, nx: { l: 'cuB' } });
  mv('cuB', { name: 'Backcut', pose: 'cutB', su: 0.06, rc: 0.13, dmg: 24, lunge: 3, stun: 0.5, nx: { l: 'cuC', p: 'cuP' } });
  mv('cuC', { name: 'Flourish', pose: 'flourish', su: 0.08, ac: 0.16, rc: 0.16, dmg: 16, multi: 2, rad: 1.2, reach: 0.6, kb: [2, 0], nx: { l: 'cuD' } });
  mv('cuD', { name: 'Boot to the Face', pose: 'bootKick', su: 0.09, ac: 0.07, rc: 0.26, dmg: 44, reach: 1.15, kb: [13, 4.5], launch: 1, lunge: 5, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('cuP', { name: 'Sand in the Eyes', pose: 'sandToss', su: 0.08, ac: 0.08, rc: 0.3, dmg: 8, reach: 1.5, rad: 1.0, dizzy: 1.1, trail: 0, sfx: 'whoosh', zone: 'high' });
  mv('cuAirA', { name: 'Air Cut', pose: 'cutA', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'cuAirB' } });
  mv('cuAirB', { name: 'Air Backcut', pose: 'cutB', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'cuAirC' } });
  mv('cuAirC', { name: 'Cannonball', pose: 'cannonball', su: 0.1, ac: 0.3, rc: 0.22, dmg: 40, kb: [9, -6], launch: 1, spike: 1, dive: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('quickShot', { name: 'Quick Shot', type: 'proj', proj: 'shot', pose: 'shoot', su: 0.08, rc: 0.16, dmg: 26, kb: [1.5, 0], stun: 0.55, range: 5, trail: 0, sfx: 'shot' });
  // MONK · Fists: a mashable flurry into a palm; the pause branch sweeps the legs
  mv('fiA', { name: 'Jab', pose: 'jabL', su: 0.05, ac: 0.05, rc: 0.11, dmg: 16, reach: 1.0, kb: [1.6, 0], stun: 0.28, lunge: 3, trail: 0, sfx: 'whoosh', nx: { l: 'fiB' } });
  mv('fiB', { name: 'Cross', pose: 'jabR', su: 0.05, ac: 0.05, rc: 0.11, dmg: 18, reach: 1.0, kb: [1.6, 0], stun: 0.45, lunge: 3, trail: 0, sfx: 'whoosh', nx: { l: 'fiC', p: 'fiP' } });
  mv('fiC', { name: 'Hundred Fists', pose: 'flurry', su: 0.06, ac: 0.36, rc: 0.12, dmg: 7, multi: 6, rapid: 2, reach: 1.05, kb: [0.8, 0], stun: 0.32, trail: 0, sfx: 'whoosh', nx: { l: 'fiD' } });
  mv('fiD', { name: 'Dragon Palm', pose: 'dragonPalm', su: 0.1, ac: 0.07, rc: 0.26, dmg: 42, reach: 1.15, kb: [14, 4], launch: 1, lunge: 6, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('fiP', { name: 'Leg Sweep', pose: 'sweep', su: 0.08, ac: 0.08, rc: 0.26, dmg: 28, kb: [1.5, 7.5], launch: 1, launcher: 1, zone: 'low', h: 0.35, reach: 1.1, lunge: 4, trail: 0, sfx: 'whoosh' });
  mv('fiAirA', { name: 'Air Knee', pose: 'knee', su: 0.05, dmg: 20, kb: [2.5, 5], air: 1, reach: 0.95, h: 0.9, trail: 0, sfx: 'whoosh', nx: { l: 'fiAirB' } });
  mv('fiAirB', { name: 'Spin Kick', pose: 'spinKick', su: 0.06, dmg: 22, kb: [2.5, 5], air: 1, reach: 1.05, h: 0.9, trail: 0, sfx: 'whoosh', nx: { l: 'fiAirC' } });
  mv('fiAirC', { name: 'Whirlwind Kick', pose: 'whirlKick', su: 0.07, ac: 0.24, rc: 0.2, dmg: 10, multi: 3, kb: [3, 5.5], air: 1, rad: 1.1, reach: 0.5, h: 0.9, trail: 0, sfx: 'whoosh' });
  // VIKING · Bearded Axe: hold Light to wind up any swing; the string ends in a 360° whirlwind
  mv('axA', { name: 'Hack', pose: 'hack', su: 0.13, ac: 0.08, rc: 0.21, dmg: 41, reach: 1.3, kb: [3.2, 0], stun: 0.38, lunge: 3, chargeL: 1, oneArmor: 1, sfx: 'heavy', nx: { l: 'axB' } });
  mv('axB', { name: 'Hew', pose: 'hew', su: 0.13, ac: 0.08, rc: 0.21, dmg: 44, reach: 1.3, kb: [3.2, 0], stun: 0.75, lunge: 3, chargeL: 1, oneArmor: 1, sfx: 'heavy', nx: { l: 'axC', p: 'axP' } });
  mv('axC', { name: 'Whirlwind', pose: 'whirlwind', su: 0.14, ac: 0.24, rc: 0.3, dmg: 26, multi: 3, around: 1, rad: 1.6, kb: [11, 6], launch: 1, finisher: 1, chargeL: 1, sfx: 'heavy' });
  mv('axP', { name: 'Skull Splitter', pose: 'skullSplit', su: 0.22, ac: 0.08, rc: 0.34, dmg: 66, reach: 1.35, kb: [2, -11], launch: 1, spike: 1, chargeL: 1, armorSU: 1, oneArmor: 1, finisher: 1, zone: 'high', sfx: 'heavy' });
  mv('axAirA', { name: 'Air Chop', pose: 'hack', su: 0.1, dmg: 38, kb: [3, 3.5], air: 1, reach: 1.25, h: 0.9, sfx: 'heavy', nx: { l: 'axAirB' } });
  mv('axAirB', { name: 'Axe Drill', pose: 'drill', su: 0.1, ac: 0.3, rc: 0.25, dmg: 14, multi: 3, kb: [2, -12], launch: 1, spike: 1, dive: 1, air: 1, rad: 1.0, reach: 0.6, h: 0.5, sfx: 'heavy' });
  // NINJA · Tantō: reverse-grip flicks, a blink behind them, then a shadow spin; the pause branch throws kunai
  mv('taA', { name: 'Flick', pose: 'flickA', su: 0.045, ac: 0.05, rc: 0.1, dmg: 20, reach: 1.05, kb: [2, 0], stun: 0.28, lunge: 4, nx: { l: 'taB' } });
  mv('taB', { name: 'Backflick', pose: 'flickB', su: 0.045, ac: 0.05, rc: 0.1, dmg: 20, reach: 1.05, kb: [2, 0], stun: 0.45, lunge: 4, nx: { l: 'taC', p: 'taP' } });
  mv('taC', { name: 'Vanishing Stab', pose: 'vanish', su: 0.07, ac: 0.06, rc: 0.12, dmg: 26, reach: 1.1, kb: [2.5, 0], stun: 0.36, cross: 1, nx: { l: 'taD' } });
  mv('taD', { name: 'Shadow Slash', pose: 'shadowSlash', su: 0.08, ac: 0.1, rc: 0.22, dmg: 40, rad: 1.15, reach: 0.7, kb: [11, 6], launch: 1, finisher: 1 });
  mv('taP', { name: 'Kunai Toss', type: 'proj', proj: 'kunai', pose: 'kunaiToss', su: 0.08, rc: 0.22, dmg: 30, kb: [2, 0], stun: 0.45, range: 6.5, trail: 0, sfx: 'whoosh' });
  mv('taAirA', { name: 'Air Flick', pose: 'flickA', su: 0.045, dmg: 20, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'taAirB' } });
  mv('taAirB', { name: 'Air Backflick', pose: 'flickB', su: 0.045, dmg: 20, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'taAirC' } });
  mv('taAirC', { name: 'Kunai Rain', type: 'proj', proj: 'kunaiDown', pose: 'kunaiToss', su: 0.07, rc: 0.22, dmg: 36, kb: [2, -11], launch: 1, spike: 1, air: 1, range: 6, trail: 0, sfx: 'whoosh' });

  // SUMMONER · Summoning Staff: her imps join every string; the pause branch calls another
  mv('smA', { name: 'Staff Jab', pose: 'thrust', su: 0.07, dmg: 24, reach: 1.35, kb: [2.5, 0], lunge: 3, nx: { l: 'smB' } });
  mv('smB', { name: 'Staff Swing', pose: 'slashA', su: 0.08, dmg: 26, reach: 1.3, stun: 0.5, lunge: 3, nx: { l: 'smC', p: 'smP' } });
  mv('smC', { name: "Sic 'Em!", pose: 'point', su: 0.08, ac: 0.08, rc: 0.18, dmg: 14, reach: 1.25, kb: [2, 0], stun: 0.55, command: 1, trail: 0, sfx: 'whoosh', nx: { l: 'smD' } });
  mv('smD', { name: 'Conjure Bolt', type: 'proj', proj: 'bolt', pose: 'cast', su: 0.1, rc: 0.26, dmg: 42, kb: [12, 5], launch: 1, range: 6.5, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('smP', { name: 'Call Imp', type: 'summon', summon: 1, pose: 'summon', su: 0.12, rc: 0.26, trail: 0, sfx: 'jguard' });
  mv('smAirA', { name: 'Air Swing', pose: 'slashA', su: 0.07, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.25, nx: { l: 'smAirB' } });
  mv('smAirB', { name: 'Spirit Bolt', type: 'proj', proj: 'boltDown', pose: 'cast', su: 0.09, rc: 0.24, dmg: 34, kb: [3, -11], launch: 1, spike: 1, air: 1, range: 6, trail: 0, sfx: 'whoosh' });
  mv('impBite', { name: 'Imp', dmg: 14, kb: [2, 0], stun: 0.42, zone: 'mid', hype: 0.6, trail: 0 });
  mv('impPounce', { name: 'Imp Pounce', dmg: 18, kb: [2.5, 0], stun: 0.5, zone: 'mid', hype: 0.6, trail: 0 });
  mv('hexBlast', { name: 'Hex Blast', type: 'proj', proj: 'hex', pose: 'cast', su: 0.2, rc: 0.32, dmg: 76, kb: [15.5, 5], launch: 1, range: 4.2, charge: 1, trail: 0, sfx: 'whoosh' });
  mv('risingGlyph', { name: 'Rising Glyph', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1, 13], launch: 1, launcher: 1, trail: 0, sfx: 'jguard' });
  mv('fallingTome', { name: 'Falling Tome', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('summonPair', { name: 'Summon Imps', type: 'summon', summon: 2, pose: 'summon', su: 0.2, rc: 0.3, trail: 0, sfx: 'jguard' });
  mv('staffSweep', { name: 'Staff Sweep', pose: 'sweep', su: 0.1, ac: 0.1, rc: 0.28, dmg: 36, kb: [3.5, 8], launch: 1, lunge: 7, zone: 'low', h: 0.35, sfx: 'whoosh' });
  mv('grandSummon', { name: 'Grand Summoning', type: 'super', pose: 'summon', su: 0.12, catchType: 'mark', rad: 1.8, seq: 'golem', dmg: 290, kb: [16, 12], zone: 'mid' });
  // PALADIN · Warhammer: three heavy blows ending in a holy shockwave; every string hit heals her
  mv('paA', { name: 'Smite', pose: 'hack', su: 0.1, ac: 0.08, rc: 0.2, dmg: 40, reach: 1.3, kb: [3, 0], lunge: 3, heal: 0.15, sfx: 'heavy', nx: { l: 'paB' } });
  mv('paB', { name: 'Hammer Fall', pose: 'backswing', su: 0.11, ac: 0.08, rc: 0.2, dmg: 44, reach: 1.3, kb: [3, 0], stun: 0.55, lunge: 3, heal: 0.15, sfx: 'heavy', nx: { l: 'paC', p: 'paP' } });
  mv('paC', { name: 'Consecrate', pose: 'slam', su: 0.16, ac: 0.1, rc: 0.32, dmg: 58, around: 1, rad: 1.9, kb: [9, 10], launch: 1, finisher: 1, heal: 0.3, holy: 1, sfx: 'heavy', zone: 'low' });
  mv('paP', { name: 'Hallowed Strike', pose: 'overhead', su: 0.13, ac: 0.08, rc: 0.3, dmg: 52, reach: 1.25, crumple: 1.0, heal: 0.5, holy: 1, lunge: 3, finisher: 1, zone: 'high', sfx: 'heavy' });
  mv('paAirA', { name: 'Air Smite', pose: 'hack', su: 0.09, dmg: 38, kb: [3, 4], air: 1, reach: 1.25, h: 0.9, heal: 0.15, sfx: 'heavy', nx: { l: 'paAirB' } });
  mv('paAirB', { name: 'Meteor Hammer', pose: 'skullSplit', su: 0.12, ac: 0.3, rc: 0.25, dmg: 48, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.1, h: 0.5, heal: 0.15, sfx: 'heavy' });
  mv('radiantBash', { name: 'Radiant Bash', pose: 'bash', su: 0.19, ac: 0.08, rc: 0.3, dmg: 82, reach: 1.15, rad: 1.0, kb: [18, 4.5], launch: 1, lunge: 6, armor: 1, charge: 1, holy: 1, trail: 0, sfx: 'heavy' });
  mv('shieldLift', { name: 'Shield Lift', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('shieldSlam', { name: 'Shield Slam', pose: 'bashDown', su: 0.14, ac: 0.1, rc: 0.25, dmg: 56, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('holyNova', { name: 'Holy Nova', type: 'radial', pose: 'salute', su: 0.2, ac: 0.1, rc: 0.32, dmg: 34, kb: [10, 6], launch: 1, rad: 2.5, buff: { id: 'nova', heal: 0.06 }, holy: 1, trail: 0, sfx: 'jguard', zone: 'high' });
  mv('shieldRush', { name: 'Shield Rush', pose: 'bash', su: 0.12, ac: 0.12, rc: 0.3, dmg: 46, kb: [12, 5], launch: 1, lunge: 9, armor: 1, trail: 0, sfx: 'heavy' });
  mv('dawnJudgment', { name: 'Judgment of Dawn', type: 'super', pose: 'salute', su: 0.12, catchType: 'radial', rad: 3.4, seq: 'dawn', dmg: 280, kb: [12, 14], zone: 'high' });
  // DRAGOON · Dragon Lance: the longest reach; land an air hit and Jump to vault off them
  mv('drA', { name: 'Thrust', pose: 'tsuki', su: 0.08, dmg: 26, reach: 1.75, kb: [3, 0], lunge: 3, nx: { l: 'drB' } });
  mv('drB', { name: 'Twin Thrust', pose: 'twinThrust', su: 0.07, ac: 0.14, rc: 0.15, dmg: 15, multi: 2, reach: 1.8, kb: [3, 0], stun: 0.5, nx: { l: 'drC', p: 'drP' } });
  mv('drC', { name: 'Wheel Sweep', pose: 'lanceWheel', su: 0.09, ac: 0.16, rc: 0.18, dmg: 32, around: 1, rad: 1.85, kb: [3, 0], stun: 0.45, zone: 'low', nx: { l: 'drD' } });
  mv('drD', { name: 'Rising Lance', pose: 'twoHandUp', su: 0.1, ac: 0.08, rc: 0.25, dmg: 44, reach: 1.5, kb: [2, 13], launch: 1, launcher: 1, finisher: 1 });
  mv('drP', { name: 'Impaling Lunge', type: 'dash', pose: 'tsuki', su: 0.14, ac: 0.12, rc: 0.3, dmg: 58, dist: 4, rad: 0.9, crumple: 1.0, finisher: 1, sfx: 'heavy' });
  mv('drAirA', { name: 'Air Thrust', pose: 'tsuki', su: 0.07, dmg: 26, reach: 1.6, kb: [3, 4.5], air: 1, h: 0.9, nx: { l: 'drAirB' } });
  mv('drAirB', { name: 'Dragon Dive', pose: 'plunge', su: 0.1, ac: 0.35, rc: 0.24, dmg: 46, kb: [3, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.3, h: 0.4, sfx: 'heavy' });
  mv('wyvernStrike', { name: 'Wyvern Strike', pose: 'tsuki', twoHand: 1, su: 0.2, ac: 0.08, rc: 0.3, dmg: 80, reach: 1.95, kb: [17, 4.5], launch: 1, lunge: 5, charge: 1, sfx: 'heavy' });
  mv('lanceVault', { name: 'Lance Vault', pose: 'twoHandUp', twoHand: 1, su: 0.1, ac: 0.08, rc: 0.28, dmg: 38, kb: [1.4, 13.5], launch: 1, launcher: 1 });
  mv('talonDrop', { name: 'Talon Drop', pose: 'twoHandOver', twoHand: 1, su: 0.12, ac: 0.1, rc: 0.25, dmg: 56, kb: [2.5, -14], launch: 1, spike: 1, air: 1, zone: 'high', h: 0.6, sfx: 'heavy' });
  mv('dragonBreath', { name: 'Dragon Breath', type: 'proj', proj: 'breath', pose: 'breath', su: 0.16, rc: 0.42, dmg: 18, kb: [10, 6], launch: 1, range: 3.4, trail: 0, sfx: 'whoosh', zone: 'high', burn: [10, 3] });   // (sets them burning: 10 a second for 3 s)
  mv('lanceDash', { name: 'Lance Dash', type: 'dash', pose: 'tsuki', su: 0.1, ac: 0.12, rc: 0.3, dmg: 44, dist: 4.2, rad: 0.9, kb: [9, 6], launch: 1, sfx: 'slash' });
  mv('dragonfall', { name: 'Dragonfall', type: 'super', pose: 'twoHandUp', su: 0.1, catchType: 'jump', rad: 1.6, seq: 'skewer', dmg: 300, kb: [10, 15], zone: 'high', otg: 1 });   // (it takes them off the floor too)
  // BARD · Lute: start a Light on the beat for a stronger hit; the pause branch sings them to sleep
  mv('baA', { name: 'Strum', pose: 'cutA', su: 0.06, rc: 0.13, dmg: 22, reach: 1.25, lunge: 3, beat: 1, nx: { l: 'baB' } });
  mv('baB', { name: 'Twang', pose: 'cutB', su: 0.06, rc: 0.13, dmg: 24, reach: 1.25, lunge: 3, stun: 0.5, beat: 1, nx: { l: 'baC', p: 'baP' } });
  mv('baC', { name: 'Power Chord', pose: 'strum', su: 0.09, ac: 0.08, rc: 0.18, dmg: 30, reach: 1.3, rad: 1.15, kb: [5, 0], stun: 0.45, beat: 1, notes: 1, trail: 0, sfx: 'chord', nx: { l: 'baD' } });
  mv('baD', { name: 'Encore!', pose: 'overhead', su: 0.12, ac: 0.08, rc: 0.26, dmg: 50, reach: 1.3, kb: [13, 6], launch: 1, finisher: 1, beat: 1, sfx: 'heavy' });
  mv('baP', { name: 'Lullaby', pose: 'strum', su: 0.1, ac: 0.12, rc: 0.3, dmg: 6, reach: 1.5, rad: 1.15, sleep: 1.4, notes: 1, trail: 0, sfx: 'lullaby', zone: 'high' });
  mv('baAirA', { name: 'Air Strum', pose: 'cutA', su: 0.06, dmg: 22, kb: [3, 4.5], air: 1, h: 1, beat: 1, nx: { l: 'baAirB' } });
  mv('baAirB', { name: 'Crescendo', pose: 'spin', su: 0.08, ac: 0.24, rc: 0.2, dmg: 12, multi: 3, around: 1, rad: 1.35, kb: [6, 5], launch: 1, air: 1, notes: 1, beat: 1, sfx: 'chord' });
  mv('sonicBoom', { name: 'Sonic Boom', type: 'proj', proj: 'wave', pose: 'shoot', su: 0.2, rc: 0.32, dmg: 70, kb: [15, 5], launch: 1, range: 5.5, charge: 1, trail: 0, sfx: 'chord' });
  mv('risingNote', { name: 'Rising Note', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 36, kb: [1, 13], launch: 1, launcher: 1, notes: 1, trail: 0, sfx: 'chord' });
  mv('bassDrop', { name: 'Bass Drop', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('valorSong', { name: 'Song of Valor', type: 'buff', pose: 'strum', su: 0.24, rc: 0.24, buff: { id: 'valor', t: 6 }, trail: 0, sfx: 'chord' });
  mv('twirlKick', { name: 'Twirl Kick', pose: 'spinKick', su: 0.09, ac: 0.12, rc: 0.27, dmg: 38, kb: [5, 9], launch: 1, lunge: 7, trail: 0, sfx: 'whoosh' });
  mv('grandFinale', { name: 'Grand Finale', type: 'super', pose: 'strum', su: 0.1, catchType: 'wave', rad: 6.5, seq: 'concert', dmg: 285, kb: [15, 13], zone: 'mid' });

  // GENERIC (broken arms fall back on these) and the universal throw
  mv('stump1', { name: 'Stump Jab', pose: 'jabL', su: 0.07, dmg: 12, reach: 0.9, kb: [1.5, 0], trail: 0, sfx: 'whoosh', nx: { l: 'stump1b' } });
  mv('stump1b', { name: 'Stump Jab', pose: 'jabR', su: 0.07, dmg: 12, reach: 0.9, kb: [1.5, 0], trail: 0, sfx: 'whoosh', nx: { l: 'stump2' } });
  mv('stump2', { name: 'Shoulder', pose: 'bash', su: 0.1, dmg: 22, reach: 0.95, kb: [8, 3.5], launch: 1, lunge: 4, finisher: 1, trail: 0, sfx: 'heavy' });
  // DRAGOON: the lance thrown (Guard + Heavy). Until he picks it back up he fights with his fists
  mv('spearThrow', { name: 'Spear Throw', type: 'proj', proj: 'spear', pose: 'toss', su: 0.16, rc: 0.3, dmg: 60, kb: [12, 6], launch: 1, range: 11, hype: 0.8, trail: 0, sfx: 'whoosh', zone: 'mid' });
  mv('fistA', { name: 'Gauntlet Jab', pose: 'jabR', su: 0.07, dmg: 14, reach: 0.95, kb: [1.5, 0], trail: 0, sfx: 'whoosh', nx: { l: 'fistB' } });
  mv('fistB', { name: 'Gauntlet Jab', pose: 'jabL', su: 0.07, dmg: 14, reach: 0.95, kb: [1.5, 0], trail: 0, sfx: 'whoosh', nx: { l: 'fistC' } });
  mv('fistC', { name: 'Shoulder Check', pose: 'bash', su: 0.1, dmg: 24, reach: 1.0, kb: [8, 3.5], launch: 1, lunge: 4, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('fistAir', { name: 'Air Knee', pose: 'knee', su: 0.07, dmg: 16, kb: [2.5, 4], air: 1, reach: 0.9, trail: 0, sfx: 'whoosh' });
  mv('stumpAir', { name: 'Air Knee', pose: 'knee', su: 0.07, dmg: 16, kb: [2.5, 4], air: 1, reach: 0.9, trail: 0, sfx: 'whoosh' });
  mv('tackle', { name: 'Tackle', pose: 'bash', su: 0.18, dmg: 40, reach: 1.0, kb: [11, 4], launch: 1, lunge: 7, charge: 1, trail: 0, sfx: 'heavy' });
  mv('headbutt', { name: 'Headbutt', pose: 'bashUp', su: 0.11, dmg: 25, kb: [1, 10.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('bodyDrop', { name: 'Body Drop', pose: 'bashDown', su: 0.13, dmg: 30, kb: [2, -12], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('pummel', { name: 'Pummel', type: 'grab', dmg: 8, kb: [0, 0], stun: 0.3, zone: 'high', hype: 1.2 });
  mv('throwF', { name: 'Forward Throw', type: 'grab', dmg: 44, kb: [16, 5.5], launch: 1, zone: 'mid' });
  mv('throwB', { name: 'Back Throw', type: 'grab', dmg: 52, kb: [18, 6.5], launch: 1, zone: 'mid' });
  mv('throwU', { name: 'Up Throw', type: 'grab', dmg: 36, kb: [0.6, 15.5], launch: 1, zone: 'mid' });
  mv('throwD', { name: 'Slam', type: 'grab', dmg: 42, kb: [1.2, -12], launch: 1, spike: 1, zone: 'mid' });
  mv('throw', { name: 'Grab', type: 'grab', pose: 'grab', su: 0.09, ac: 0.07, rc: 0.38, dmg: 70, reach: 0.95, rad: 0.75, kb: [17, 6], launch: 1, trail: 0, sfx: 'whoosh', zone: 'mid' });

  /* ------------------------------------------------------------------ parts */
  const P = {
    samurai: {
      head: { name: 'Crescent Kabuto', armor: 110, weight: 1.0, special: 'iai', uses: 3, hype: 1.0, desc: 'SPECIAL: Iai Flash. Dash through the foe in a single cut (invulnerable).' },
      core: { name: 'Lacquered Ō-yoroi', hp: 1000, def: 0.06, weight: 1.0, guard: 0, desc: 'Balanced lacquer plate. No weak spots, no tricks.' },
      armR: { name: 'Katana', armor: 130, weight: 1.0, light: 'kaA', air: 'kaAirA', sig: 'riposte', sigName: 'Kaeshi-waza', sigDesc: 'After a Just Guard, press Light: an instant riposte that crumples them.', trail: 0xffffff, desc: 'Kiri › Kesa › Tsuki › Rising Cut (launches up). Pause after Kesa: Issen, a dash through them that knocks them back the other way. SIGNATURE: Kaeshi riposte after a Just Guard.' },
      armL: { name: 'Lacquered Kote', armor: 125, weight: 0.95, heavy: 'kesa', launch: 'tsubame', airHeavy: 'kabutowari', guard: 90, chip: 1, trail: 0xffd0d0, desc: 'An armoured gauntlet, hand free for a two-handed grip. HEAVY: Kesa-giri, a two-handed diagonal KNOCK with the right-hand weapon. Guard: medium.' },
      legs: { name: 'Hakama & Waraji', armor: 170, weight: 1.0, speed: 6.3, jump: 11.5, airJumps: 1, dashAtk: 'ashibarai', perk: null, desc: 'Even footing. DASH ATTACK: Ashi-barai, a low sweep that pops them up.' },
      card: { name: 'Way of the Blade', super: 'thousandCuts', passive: 'bushido', desc: 'LEGEND ART: Thousand Cuts. PASSIVE (Bushido): +15% damage under 35% HP.' },
    },
    knight: {
      head: { name: 'Great Helm', armor: 160, weight: 1.15, special: 'bulwark', uses: 3, hype: 0.9, desc: 'SPECIAL: Bulwark. 3 s of super armour and 25% less damage.' },
      core: { name: 'Plate Cuirass', hp: 1150, def: 0.12, weight: 1.3, guard: 30, desc: 'The most HP and defence. Heavy: you fly less, you move less.' },
      armR: { name: 'Longsword', armor: 150, weight: 1.15, light: 'loA', air: 'loAirA', sig: 'steadfast', sigName: 'Steadfast', sigDesc: 'Every swing after the first has armour in its startup: trade through jabs.', trail: 0xcfe2ff, desc: 'Cleave › Backswing › Judgment, a slam that ground-bounces them. Pause after Backswing: Pommel Strike crumples. Air: two hits ending in a diving thrust. SIGNATURE: armoured swings.' },
      armL: { name: 'Kite Shield', armor: 180, weight: 1.25, heavy: 'shieldBash', launch: 'shieldUpper', airHeavy: 'shieldDrop', guard: 165, chip: 0.5, trail: 0xcfe2ff, desc: 'HEAVY: Shield Bash, armoured, the biggest shove. Guard: huge, half chip.' },
      legs: { name: 'Iron Sabatons', armor: 220, weight: 1.35, speed: 5.1, jump: 9.8, airJumps: 1, dashAtk: 'stomp', perk: 'anchor', desc: 'Slow but planted: 15% less knockback taken. DASH ATTACK: Sabaton Stomp.' },
      card: { name: 'Oath of the Keep', super: 'lanceCharge', passive: 'plateFaith', desc: 'LEGEND ART: Holy Lance Charge, armoured. PASSIVE: guard +40%, chip -30%.' },
    },
    pirate: {
      head: { name: "Captain's Tricorne", armor: 105, weight: 0.95, special: 'powderKeg', uses: 3, hype: 1.15, desc: 'SPECIAL: Powder Keg. Lob a bomb that blows them off their feet.' },
      core: { name: 'Frock Coat', hp: 950, def: 0.04, weight: 0.95, guard: 0, desc: 'Light and loose. Builds Hype faster.', hypeBonus: 0.1 },
      armR: { name: 'Cutlass', armor: 125, weight: 0.95, light: 'cuA', air: 'cuAirA', sig: 'dirty', sigName: 'Dirty Fighting', sigDesc: 'Pause after the Backcut and throw sand: they stand there dizzy.', trail: 0xfff1c0, desc: 'Cut › Backcut › Flourish (spin) › Boot to the Face. Pause after Backcut: Sand in the Eyes (dizzy). Air ends in a Cannonball dive. With the Flintlock: Heavy mid-string is a Quick Shot.' },
      armL: { name: 'Flintlock', armor: 110, weight: 0.9, heavy: 'pointBlank', launch: 'pistolWhip', airHeavy: 'airShot', guard: 70, chip: 1.1, trail: 0xffd28a, holster: 1, gunCancel: 'quickShot', desc: 'Holstered until he fires (the cutlass is put away while it is out). HEAVY: Point Blank, a shot that reaches 6 m. Guard: weak.' },
      legs: { name: 'Peg & Boot', armor: 165, weight: 0.95, speed: 6.2, jump: 11, airJumps: 1, dashAtk: 'pegSweep', perk: 'sealegs', desc: 'Sea legs: dodges travel 30% further. DASH ATTACK: Peg Sweep.' },
      card: { name: 'Jolly Plunder', super: 'broadside', passive: 'plunder', desc: 'LEGEND ART: Broadside, a cannon barrage. PASSIVE (Plunder): +35% Hype gain.' },
    },
    monk: {
      head: { name: 'Serene Mind', armor: 100, weight: 0.9, special: 'mantra', uses: 3, hype: 1.0, desc: 'SPECIAL: Mantra. Heal 7% HP and repair every part 25%.' },
      core: { name: 'Saffron Robe', hp: 900, def: 0.03, weight: 0.85, guard: -10, desc: 'Light as a leaf. Burst refills 25% faster.', burstBonus: 0.25 },
      armR: { name: 'Iron Fist Wraps', armor: 120, weight: 0.85, light: 'fiA', air: 'fiAirA', sig: 'flow', sigName: 'Flow', sigDesc: 'Every hit of a combo makes your next moves faster (up to +25%).', trail: 0xffe0a0, desc: 'Jab › Cross › Hundred Fists (mash Light to extend) › Dragon Palm. Pause after Cross: Leg Sweep launcher. Air: Knee › Spin Kick › Whirlwind Kick. SIGNATURE: Flow, combos speed up.' },
      armL: { name: 'Thunder Palm', armor: 115, weight: 0.85, heavy: 'thunderPalm', launch: 'risingPalm', airHeavy: 'axeKick', guard: 60, chip: 1.2, trail: 0x9ff7ff, desc: 'HEAVY: Thunder Palm, the strongest straight KNOCK. Guard: weak.' },
      legs: { name: 'Cloud Steps', armor: 150, weight: 0.85, speed: 6.6, jump: 12.5, airJumps: 2, dashAtk: 'flyingKnee', perk: 'cloudstep', desc: 'Triple jump and two air dodges. DASH ATTACK: Flying Knee launcher.' },
      card: { name: 'Hundred Hands', super: 'hundredPalm', passive: 'innerPeace', desc: 'LEGEND ART: Hundred Hands. PASSIVE (Inner Peace): Burst fills 45% faster.' },
    },
    viking: {
      head: { name: 'Horned Helm', armor: 145, weight: 1.15, special: 'warHorn', uses: 3, hype: 0.95, desc: 'SPECIAL: War Horn. A roar that blows them back; +15% damage for 5 s.' },
      core: { name: 'Fur & Mail', hp: 1100, def: 0.08, weight: 1.25, guard: 15, desc: 'Thick fur over mail. Lots of HP.' },
      armR: { name: 'Bearded Axe', armor: 150, weight: 1.2, light: 'axA', air: 'axAirA', sig: 'windup', sigName: 'Wind-up', sigDesc: 'Hold Light to wind up any axe swing: armour against one hit while you hold, +45% damage, and a full charge crumples.', trail: 0xd8e8ff, desc: 'Hack › Hew › Whirlwind (hits all around). Pause after Hew: Skull Splitter. Air: Chop › Axe Drill. SIGNATURE: hold Light to wind up any swing.' },
      armL: { name: 'Round Shield', armor: 170, weight: 1.2, heavy: 'shieldRam', launch: 'upperHaft', airHeavy: 'skullDrop', guard: 140, chip: 0.7, trail: 0xd8e8ff, desc: 'HEAVY: Shield Ram, armoured and long. Guard: strong.' },
      legs: { name: 'Fur Boots', armor: 200, weight: 1.25, speed: 5.5, jump: 10, airJumps: 1, dashAtk: 'bullRush', perk: 'unstoppable', desc: 'Dash attacks carry armour against one hit. DASH ATTACK: Bull Rush.' },
      card: { name: 'Ragnarök', super: 'ragnarok', passive: 'fury', desc: 'LEGEND ART: Ragnarök, a leaping quake. PASSIVE (Fury): up to +12% damage as HP falls.' },
    },
    ninja: {
      head: { name: 'Shinobi Hood', armor: 95, weight: 0.85, special: 'shadowStep', uses: 2, noRegen: 1, spCd: 3, hype: 1.05, desc: 'SPECIAL: Shadow Step. Vanish behind them and stab. Twice a round, 3 s apart.' },
      core: { name: 'Shinobi Shōzoku', hp: 880, def: 0.02, weight: 0.8, guard: -10, desc: 'Barely there. The lightest core: fast, but you fly far.' },
      armR: { name: 'Tantō', armor: 110, weight: 0.8, light: 'taA', air: 'taAirA', sig: 'airdash', sigName: 'Shadow Dash', sigDesc: 'Dodge after an air hit: dash at them through the air and keep the combo going (twice a jump).', trail: 0xd9b8ff, desc: 'Flick › Backflick › Vanishing Stab (blinks behind them) › Shadow Slash. Pause after Backflick: Kunai Toss. Air ends in Kunai Rain. SIGNATURE: air-dash after an air hit.' },
      armL: { name: 'Kusarigama', armor: 110, weight: 0.85, heavy: 'chainHook', launch: 'sickleRise', airHeavy: 'chainDrop', guard: 70, chip: 1.1, trail: 0xd9b8ff, desc: 'HEAVY: Chain Hook, drag them in from 5 m (twice in any 5 s). Guard: weak.' },
      legs: { name: 'Tabi Boots', armor: 145, weight: 0.8, speed: 7.4, jump: 12, airJumps: 2, dashAtk: 'shadowKick', perk: 'walljump', desc: 'The fastest legs, a triple jump, and WALL JUMPS. DASH ATTACK: Shadow Kick.' },
      card: { name: 'Shadow Clone Arts', super: 'cloneBarrage', passive: 'vanish', desc: 'LEGEND ART: four clones strike at once. PASSIVE (Vanish): longer dodge, shorter cooldown.' },
    },
    summoner: {
      head: { name: "Conjurer's Cowl", armor: 100, weight: 0.9, special: 'summonPair', uses: 3, hype: 1.05, desc: 'SPECIAL: Summon Imps. Two imps pop out of a circle and go for them. Each one takes two hits.' },
      core: { name: "Conjurer's Robe", hp: 900, def: 0.03, weight: 0.9, guard: -5, desc: 'Loose robes. Light, and a little fragile.' },
      armR: { name: 'Summoning Staff', armor: 115, weight: 0.9, light: 'smA', air: 'smAirA', sig: 'pack', sigName: 'Pack Tactics', sigDesc: "Your imps pounce on anyone you hit. Sic 'Em sends them all in at once.", trail: 0x9dffc0, desc: "Staff Jab › Staff Swing › Sic 'Em (every imp attacks) › Conjure Bolt. Pause after Staff Swing: Call Imp. Air ends in a Spirit Bolt spike. SIGNATURE: imps join your hits." },
      armL: { name: 'Grimoire', armor: 110, weight: 0.85, heavy: 'hexBlast', launch: 'risingGlyph', airHeavy: 'fallingTome', guard: 65, chip: 1.15, trail: 0x9dffc0, desc: 'HEAVY: Hex Blast, a glyph that bursts 4 m out. Guard: weak.' },
      legs: { name: 'Ritual Sandals', armor: 150, weight: 0.9, speed: 6.0, jump: 11, airJumps: 1, dashAtk: 'staffSweep', perk: 'familiar', desc: 'Familiar: start every round with an imp at your side. DASH ATTACK: Staff Sweep.' },
      card: { name: 'Ninefold Circle', super: 'grandSummon', passive: 'legion', desc: 'LEGEND ART: Grand Summoning, a spirit giant. PASSIVE (Legion): her imps bite 30% harder.' },
    },
    paladin: {
      head: { name: 'Sun Helm', armor: 150, weight: 1.1, special: 'holyNova', uses: 3, hype: 0.95, desc: 'SPECIAL: Holy Nova. A burst of light that blows them back and heals you 6%.' },
      core: { name: 'Gilded Plate', hp: 1080, def: 0.1, weight: 1.2, guard: 25, desc: 'Gold-trimmed plate. Lots of HP and defence.' },
      armR: { name: 'Warhammer', armor: 145, weight: 1.15, light: 'paA', air: 'paAirA', sig: 'heal', sigName: 'Lay on Hands', sigDesc: 'Every string hit heals you for 15% of its damage (the finishers for more).', trail: 0xfff3b0, desc: 'Smite › Hammer Fall › Consecrate (a holy shockwave all around). Pause after Hammer Fall: Hallowed Strike crumples and heals big. Air ends in a Meteor Hammer dive. SIGNATURE: hits heal you.' },
      armL: { name: 'Tower Shield', armor: 190, weight: 1.3, heavy: 'radiantBash', launch: 'shieldLift', airHeavy: 'shieldSlam', guard: 180, chip: 0.4, trail: 0xfff3b0, desc: 'HEAVY: Radiant Bash, armoured. Guard: the biggest, almost no chip.' },
      legs: { name: 'Greaves of Dawn', armor: 210, weight: 1.25, speed: 5.3, jump: 10, airJumps: 1, dashAtk: 'shieldRush', perk: 'resolve', desc: 'Resolve: under 30% HP you take 15% less damage. DASH ATTACK: Shield Rush.' },
      card: { name: 'Oath of Dawn', super: 'dawnJudgment', passive: 'devotion', desc: 'LEGEND ART: Judgment of Dawn. PASSIVE (Devotion): healing +40%, Specials come back faster.' },
    },
    dragoon: {
      head: { name: 'Wyrm Helm', armor: 125, weight: 1.0, special: 'dragonBreath', uses: 3, hype: 1.0, desc: 'SPECIAL: Dragon Breath. Three bursts of fire in a cone; the last one blows them away. It sets them BURNING: damage every half second for 3 s.' },
      core: { name: 'Scale Mail', hp: 980, def: 0.07, weight: 1.0, guard: 10, desc: 'Overlapping dragon scales. Even all round.' },
      armR: { name: 'Dragon Lance', armor: 130, weight: 1.05, light: 'drA', air: 'drAirA', sig: 'pogo', spear: 1, sigName: 'Skyborne', sigDesc: 'Land an air hit and press Jump: vault off them with a fresh jump and a fresh air string (twice a jump).', trail: 0xffc890, desc: 'Thrust › Twin Thrust › Wheel Sweep › Rising Lance. Pause after Twin Thrust: Impaling Lunge. Air: Thrust › Dragon Dive. SIGNATURE: vault off an air hit. GUARD + HEAVY: throw the lance (walk over it to pick it back up; until then, fists).' },
      armL: { name: 'Scale Gauntlet', armor: 125, weight: 0.95, heavy: 'wyvernStrike', launch: 'lanceVault', airHeavy: 'talonDrop', guard: 85, chip: 1, trail: 0xffc890, desc: 'A clawed gauntlet, hand free for a two-handed grip. HEAVY: Wyvern Strike, the longest KNOCK. Guard: medium.' },
      legs: { name: 'Wyrm Greaves', armor: 175, weight: 1.0, speed: 6.0, jump: 14, airJumps: 1, dashAtk: 'lanceDash', perk: 'skyward', desc: 'Skyward: the highest jump, and air dodges go 35% further. DASH ATTACK: Lance Dash.' },
      card: { name: 'Dragonsoul', super: 'dragonfall', passive: 'wyrmblood', desc: 'LEGEND ART: Dragonfall, a dive from the sky that pins them even when they\'re down (OTG). PASSIVE (Wyrmblood): +12% damage in the air.' },
    },
    bard: {
      head: { name: 'Feathered Cap', armor: 100, weight: 0.85, special: 'valorSong', uses: 3, hype: 1.1, desc: 'SPECIAL: Song of Valor. +12% damage and +10% speed for 6 s.' },
      core: { name: "Minstrel's Doublet", hp: 920, def: 0.03, weight: 0.9, guard: 0, hypeBonus: 0.15, desc: 'A puffed doublet. Builds Hype fast.' },
      armR: { name: 'Lute', armor: 115, weight: 0.9, light: 'baA', air: 'baAirA', sig: 'beat', sigName: 'On the Beat', sigDesc: 'A beat pulses under your feet in time with the music. Start a Light on the beat: +30% damage and +50% Hype.', trail: 0xffb0e0, desc: 'Strum › Twang › Power Chord › Encore! Pause after Twang: Lullaby puts them to sleep. Air: Strum › Crescendo. SIGNATURE: hit on the beat.' },
      armL: { name: 'Tambourine', armor: 110, weight: 0.85, heavy: 'sonicBoom', launch: 'risingNote', airHeavy: 'bassDrop', guard: 60, chip: 1.2, trail: 0xffb0e0, desc: 'HEAVY: Sonic Boom, a sound wave that reaches 5.5 m. Guard: weak.' },
      legs: { name: 'Dancing Shoes', armor: 150, weight: 0.85, speed: 6.8, jump: 11.5, airJumps: 1, dashAtk: 'twirlKick', perk: 'dancer', desc: 'Dancer: dodges cool down twice as fast. DASH ATTACK: Twirl Kick.' },
      card: { name: 'Grand Finale', super: 'grandFinale', passive: 'encore', desc: "LEGEND ART: Grand Finale, a show they can't walk out of. PASSIVE (Encore): 35 Hype back after your Legend Art lands." },
    },
  };

  const PASSIVE = {
    bushido: 'Bushido: +15% damage under 35% HP', plateFaith: 'Plate Faith: guard +40%, chip -30%', plunder: 'Plunder: +35% Hype gain',
    innerPeace: 'Inner Peace: Burst fills 45% faster', fury: 'Fury: up to +12% damage as HP falls', vanish: 'Vanish: longer dodge, shorter cooldown',
    legion: 'Legion: imps bite 30% harder', devotion: 'Devotion: healing +40%, Specials back faster', wyrmblood: 'Wyrmblood: +12% damage in the air', encore: 'Encore: 35 Hype back after a Legend Art',
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
      dodgeDist: G.perk === 'sealegs' ? 1.3 : 1, dodgeCd: G.perk === 'dancer' ? 0.5 : 1, airDodgeDist: G.perk === 'skyward' ? 1.35 : 1,
      minions: 2, impHp: 2, impLife: 5, impDmg: K.passive === 'legion' ? 1.3 : 1, healMult: K.passive === 'devotion' ? 1.4 : 1, useRegen: H.noRegen ? 1e9 : K.passive === 'devotion' ? 11 : 16, spCd: H.spCd || 0,
      guard: Math.round((100 + L.guard + C.guard) * (K.passive === 'plateFaith' ? 1.4 : 1)),
      chip: L.chip * (K.passive === 'plateFaith' ? 0.7 : 1),
      hypeGain: H.hype * (1 + (C.hypeBonus || 0)) * (K.passive === 'plunder' ? 1.35 : 1),
      burstRate: (1 + (C.burstBonus || 0)) * (K.passive === 'innerPeace' ? 1.45 : 1),
      dmgR: m('armR'), dmgL: m('armL'), dmgH: m('head'), dmgG: m('legs'), dmgK: m('card'),
      set, setDmg: set === 2 ? 1.08 : set === 1 ? 1.04 : 1,
      armor: { head: Math.round(H.armor * m('head')), armR: Math.round(R.armor * m('armR')), armL: Math.round(L.armor * m('armL')), legs: Math.round(G.armor * m('legs')) },
      passive: K.passive, special: H.special, uses: H.uses, super: K.super,
      ...(() => { const mixed = b.armR.line !== b.armL.line && M['hx:' + b.armR.line + ':' + b.armL.line + ':0']; return { mixed: !!mixed, light: mixed ? 'hx:' + b.armR.line + ':' + b.armL.line + ':0' : R.light, air: mixed ? 'hxa:' + b.armR.line + ':' + b.armL.line + ':0' : R.air }; })(),
      lightPure: R.light, airPure: R.air, spear: !!R.spear, sig: R.sig, sigName: R.sigName, sigDesc: R.sigDesc, gunCancel: L.gunCancel, heavy: L.heavy, launch: L.launch, airHeavy: L.airHeavy, dashAtk: G.dashAtk,
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


  /* ======================================================================
     MIXED STRINGS. An R-arm and an L-arm from different lines make a string of their own:
     the R-arm opens (its first two hits), the L-arm's weapon cuts in, the R-arm's third hit if it has
     one, then a HYBRID FINISHER that swings both arms and carries the L-arm line's effect. In the air,
     the R-arm's air string ends in a hybrid air finisher. Ten lines make 90 pairings, and every one has
     its own string, finisher and air finisher (named for the R-arm's weapon and the L-arm's effect).
     ====================================================================== */
  const PREFIX = { samurai: 'Iaido', knight: 'Longsword', pirate: 'Cutlass', monk: 'Iron Fist', viking: 'Axe', ninja: 'Tantō', summoner: 'Staff', paladin: 'Hammer', dragoon: 'Lance', bard: 'Lute' };
  // the L-arm's weapon cutting into the string
  const OFF = {
    samurai: { name: 'Kote Strike', pose: 'jabL', stun: 0.5 },
    knight: { name: 'Shield Check', pose: 'bash', armorSU: 1, stun: 0.48 },
    pirate: { name: 'Pistol Pop', pose: 'shoot', type: 'proj', proj: 'shot', range: 3.4, dmg: 18, kb: [1.5, 0], stun: 0.5, sfx: 'shot', trail: 0 },
    monk: { name: 'Thunder Jab', pose: 'palm', multi: 2, dmg: 13 },
    viking: { name: 'Boss Smash', pose: 'bash', armorSU: 1, oneArmor: 1, kb: [3.5, 0] },
    ninja: { name: 'Chain Lash', pose: 'chainThrow', pull: 1, reach: 1.9, stun: 0.5 },
    summoner: { name: 'Hex Spark', pose: 'cast', hexfx: 1, command: 1 },
    paladin: { name: 'Holy Bash', pose: 'bash', heal: 0.3, holy: 1 },
    dragoon: { name: 'Gauntlet Hook', pose: 'jabL', dmg: 26 },
    bard: { name: 'Tambourine Slap', pose: 'jabL', notes: 1, beat: 1 },
  };
  // the L-arm line's effect on a hybrid finisher: its name on the ground (n) and in the air (a), and what it does
  const FIN = {
    samurai: { n: 'Severance', a: 'Moonfall', g: { crumple: 0.9, kb: [3, 0], dmgK: 1.15 }, air: { launch: 1, spike: 1, kb: [2, -13], dmgK: 1.15 } },
    knight: { n: 'Rampart', a: 'Bulwark Drop', g: { launch: 1, kb: [17, 4.5], armorSU: 1 }, air: { launch: 1, spike: 1, dive: 1, kb: [2, -13] } },
    pirate: { n: 'Cannonade', a: 'Powder Dive', g: { launch: 1, blast: 1, kb: [12, 9] }, air: { launch: 1, spike: 1, blast: 1, kb: [3, -12] } },
    monk: { n: 'Tempest', a: 'Storm', g: { launch: 1, multi: 4, kb: [13, 5] }, air: { launch: 1, multi: 4, kb: [8, 6] } },
    viking: { n: 'Quake', a: 'Meteor', g: { launch: 1, spike: 1, quake: 1, kb: [2, -12] }, air: { launch: 1, spike: 1, dive: 1, quake: 1, kb: [2, -14] } },
    ninja: { n: 'Eclipse', a: 'Shadowfall', g: { launch: 1, cross: 1, kb: [12, 6] }, air: { launch: 1, spike: 1, cross: 1, kb: [2, -12] } },
    summoner: { n: 'Hexbloom', a: 'Spiritfall', g: { launch: 1, hexfx: 1, command: 1, kb: [2, 12.5] }, air: { launch: 1, spike: 1, hexfx: 1, command: 1, kb: [2, -12] } },
    paladin: { n: 'Daybreak', a: 'Sunfall', g: { launch: 1, around: 1, holy: 1, heal: 0.4, kb: [9, 9] }, air: { launch: 1, spike: 1, holy: 1, heal: 0.3, kb: [2, -12] } },
    dragoon: { n: 'Updraft', a: 'Skyrend', g: { launch: 1, kb: [1.5, 14.5] }, air: { launch: 1, kb: [2, 12] } },
    bard: { n: 'Refrain', a: 'Fortissimo', g: { dizzy: 0.9, notes: 1, kb: [2, 0] }, air: { launch: 1, multi: 3, notes: 1, kb: [6, 5] } },
  };
  const KEEP = ['beat', 'heal', 'chargeL', 'armorSU', 'oneArmor'];   // the R-arm's signature rides along on its finisher
  const chainOf = root => { const out = []; let id = root; while (id && out.length < 8) { out.push(id); id = (M[id].nx || {}).l; } return out; };
  function hybridFinisher(base, first, A, B, air) {
    const proj = base.type === 'proj', mv = {
      name: PREFIX[A] + ' ' + (air ? FIN[B].a : FIN[B].n), type: 'melee', hybrid: 1, finisher: 1, mix: [A, B],
      pose: 'hy|' + (proj ? first.pose : base.pose) + '|' + OFF[B].pose,
      su: Math.max(0.08, base.su) + 0.02, ac: Math.max(0.08, base.ac || 0.06), rc: (base.rc || 0.2) + 0.05,
      reach: proj ? 1.3 : base.reach || 1.2, rad: (base.rad || 0.8) + 0.1, h: air ? 0.9 : base.h || 1.1, lunge: proj ? 3 : base.lunge || 2,
      zone: 'mid', sfx: 'heavy', trail: 1, hype: 1.2, stun: 0.5, kb: [10, 5],
      dmg: Math.round(base.dmg * (base.multi ? base.multi * 0.6 : 1) * 1.2 + 8),
    };
    if (air) mv.air = 1;
    for (const k of KEEP) if (base[k]) mv[k] = base[k];
    const e = FIN[B][air ? 'air' : 'g'];
    Object.assign(mv, e);
    if (e.dmgK) { mv.dmg = Math.round(mv.dmg * e.dmgK); delete mv.dmgK; }
    if (mv.multi) { mv.dmg = Math.round(mv.dmg * 1.4 / mv.multi); mv.ac = Math.max(mv.ac, 0.06 * mv.multi); }
    return mv;
  }
  for (const A of LINE_ORDER) for (const B of LINE_ORDER) {
    if (A === B) continue;
    const R = P[A].armR, g = chainOf(R.light), air = chainOf(R.air);
    const link = (seq, pre, air) => seq.forEach((s, i) => {
      const id = pre + i, next = i + 1 < seq.length ? pre + (i + 1) : null; let mv;
      if (s === 'OFF') mv = Object.assign({ name: OFF[B].name, type: 'melee', su: 0.07, ac: 0.07, rc: 0.16, dmg: 22, kb: [2.5, 0], stun: 0.45, reach: 1.15, rad: 0.85, h: 1.1, lunge: 3, zone: 'mid', sfx: 'slash', trail: 1, hype: 1, offhand: 1, mix: [A, B] }, OFF[B]);
      else if (s === 'FIN') mv = hybridFinisher(M[(air ? air : g)[(air ? air : g).length - 1]], M[(air ? air : g)[0]], A, B, !!air);
      else { mv = Object.assign({}, M[s]); delete mv.finisher; }
      mv.id = id; mv.nx = Object.assign({}, mv.nx || {}); if (next) mv.nx.l = next; else delete mv.nx.l;
      M[id] = mv;
    });
    link([g[0], g[1], 'OFF', ...(g.length >= 4 ? [g[2]] : []), 'FIN'], 'hx:' + A + ':' + B + ':', null);
    link([...air.slice(0, -1), 'FIN'], 'hxa:' + A + ':' + B + ':', air);
  }

  window.KB = { SLOTS, SLOT_NAME, RARITY, LINES, LINE_ORDER, PARTS: P, MOVES: M, PASSIVE, stats, mintBuild, randomBuild, key, itemName, part };
})();
