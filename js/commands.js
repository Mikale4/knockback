/* commands.js -- COMMAND SPECIALS: three more Specials for every figure, on fighting-game motions.

   The stick is read on the screen like a 2D fighter's: ↓ is down, and → is the side of the screen (left or right) the
   opponent is on, flipping when you swap sides; the Special then turns to face them. With Special:
     ↓↘→  (a quarter-circle forward)   usually the way in: a shot, a rush, a strike at range
     ↓↙←  (a quarter-circle back)      the trick: a counter stance, a trap, a guard, a command grab
     →↓↘  (a dragon punch)             the answer to a jump: a rising move, usually invincible on the way up
   Plain Special is still the figure's own. All four share the HEAD's uses (one more use a round than before).
   They belong to the HEAD, so a figure wearing someone else's head fights with that head's Specials.

   The mechanics (fighter.js, match.js), any of which a move can use:
     rise: n     straight up at n m/s as it hits (committed until it lands, then a beat to recover)
     hop: n      a dash that leaves the floor        recoil / recoilUp: a step (or a flip) back as it goes off
     type 'trap' something left on the floor (trap: { look, col, r, life, hit | aura })
     type 'leap' a jump that lands where they stood and hits all round it
     proj 'smite' a mark on the floor, struck from above a moment later (smite: { rad, delay, col, look, n, pillar })
     buff counter (a stance that answers a blow with its riposte), reflect (shots go back), haste, regen, iron
     on a hit:   slow (they move at half speed), weaken (they deal 20% less), trip (down hard), crush (guard damage)
   and everything a move could already do (launch, crumple, dizzy, sleep, burn, poison, pull, steal, heal...). */
(function () {
  'use strict';
  const { PARTS: P, mv } = KB;
  const C = (line, qcf, qcb, dp) => { P[line].head.cmd = { qcf, qcb, dp }; };
  // a DRAGON PUNCH: a rising move, invincible to the top of its hit unless it says otherwise; it launches
  const DP = (id, o) => mv(id, Object.assign({ su: 0.06, ac: 0.16, rc: 0.38, dmg: 60, reach: 1.0, rad: 1.1, h: 1.5, kb: [2, 13.5], launch: 1, launcher: 1, rise: 9, lunge: 3, inv: 1, sfx: 'heavy' }, o));
  // a COUNTER: a stance for 0.6 s; a blow that would land is answered with the riposte (a grab or a Legend Art gets through)
  const CTR = (id, name, pose, rip, call, desc) => mv(id, { name, type: 'buff', pose, su: 0.04, ac: 0.02, rc: 0.5, buff: { id: 'counter', t: 0.6, rip, call }, trail: 0, sfx: 'jguard', desc });
  const RIP = (id, o) => mv(id, Object.assign({ su: 0.03, ac: 0.08, rc: 0.3, reach: 1.4, rad: 1.0, lunge: 5, sfx: 'heavy' }, o));

  /* ============================================================ HISTORICAL FANTASY */
  // MONK
  mv('cMonF', { name: 'Hundred-Hand Palm', pose: 'flurry', su: 0.1, ac: 0.42, rc: 0.3, dmg: 12, multi: 6, reach: 1.25, rad: 1.0, kb: [15, 5], launch: 1, lunge: 3, sfx: 'slash', desc: 'Six palms in a blur, the last a KNOCK.' });
  mv('cMonB', { name: 'Iron Shirt', type: 'buff', pose: 'meditate', su: 0.2, rc: 0.2, buff: { id: 'iron', t: 3, hits: 3 }, trail: 0, sfx: 'jguard', desc: 'For 3 s, the next three hits don’t stagger him.' });
  DP('cMonD', { name: 'Crane Ascends', pose: 'airKick', rise: 11, dmg: 60, desc: 'An invincible flying knee straight up: launches.' });
  C('monk', 'cMonF', 'cMonB', 'cMonD');
  // VIKING
  mv('cVikF', { name: 'Hurled Axe', type: 'proj', proj: 'hatchet', pose: 'hurl', su: 0.18, rc: 0.32, dmg: 56, kb: [14, 5], launch: 1, range: 8.5, crush: 2, trail: 0, sfx: 'whoosh', desc: 'A throwing axe, 8.5 m: a KNOCK that dents a guard.' });
  mv('cVikB', { name: 'Shield Wall', type: 'buff', pose: 'bash', su: 0.06, rc: 0.32, buff: { id: 'reflect', t: 1.2, call: 'SHIELD WALL' }, trail: 0, sfx: 'jguard', desc: 'Round shield up for 1.2 s: arrows, bullets and bolts bounce back at whoever loosed them.' });
  DP('cVikD', { name: 'Odin’s Ascent', pose: 'twoHandUp', twoHand: 1, rise: 8, dmg: 64, desc: 'An invincible rising axe: launches.' });
  C('viking', 'cVikF', 'cVikB', 'cVikD');
  // SUMMONER
  mv('cSumF', { name: 'Wisp Swarm', type: 'proj', proj: 'wisps', pose: 'cast', su: 0.16, rc: 0.3, dmg: 46, kb: [12, 5], launch: 1, range: 9, trail: 0, sfx: 'whoosh', desc: 'Three spirit wisps fan out, 9 m: a KNOCK.' });
  mv('cSumT', { name: 'Binding Circle', dmg: 18, kb: [0, 0], stun: 0.4, sleep: 1.4, trail: 0 });
  mv('cSumB', { name: 'Binding Circle', type: 'trap', pose: 'summon', su: 0.16, ac: 0.04, rc: 0.3, reach: 2.2, trap: { look: 'ring', col: 0x5fe08a, r: 1.1, life: 10, hit: 'cSumT', call: 'BOUND!' }, trail: 0, desc: 'A circle drawn 2.2 m ahead for 10 s: whoever steps in falls ASLEEP.' });
  mv('cSumD', { name: 'Spirit Pillar', type: 'radial', pose: 'summon', su: 0.06, ac: 0.14, rc: 0.38, dmg: 54, rad: 1.8, kb: [2, 15], launch: 1, launcher: 1, inv: 1, hexfx: 1, puff: 0x5fe08a, trail: 0, sfx: 'boom', desc: 'Invincible: spirits burst up all round her and launch.' });
  C('summoner', 'cSumF', 'cSumB', 'cSumD');
  // BARD
  mv('cBarF', { name: 'Lullaby', type: 'proj', proj: 'wave', pose: 'strum', su: 0.2, rc: 0.32, dmg: 16, kb: [0, 0], stun: 0.4, sleep: 1.3, range: 7, trail: 0, sfx: 'chord', desc: 'A soft wave of notes, 7 m: they fall ASLEEP.' });
  mv('cBarB', { name: 'Discord', type: 'radial', pose: 'strum', su: 0.14, ac: 0.1, rc: 0.3, dmg: 16, rad: 2.6, kb: [6, 3], launch: 1, weaken: 6, notes: 1, trail: 0, sfx: 'chord', desc: 'A sour chord all round: they’re WEAKENED (20% less damage) for 6 s.' });
  DP('cBarD', { name: 'Power Chord', pose: 'upslash', rise: 7, dmg: 58, notes: 1, sfx: 'chord', desc: 'An invincible rising swing of the lute: launches.' });
  C('bard', 'cBarF', 'cBarB', 'cBarD');

  /* ================================================================ EDO JAPAN */
  // SAMURAI
  mv('cSamF', { name: 'Mumyō Thrust', type: 'dash', pose: 'tsuki', twoHand: 1, su: 0.16, ac: 0.12, rc: 0.34, dmg: 64, dist: 5, rad: 0.9, kb: [15, 5], launch: 1, crush: 2.5, sfx: 'slash', desc: 'A dashing thrust, 5 m: a KNOCK that breaks a guard.' });
  RIP('cSamR', { name: 'Mikiri Draw', pose: 'iai', dmg: 72, reach: 1.5, kb: [3, 0], crumple: 1.0, lunge: 6, sfx: 'slash' });
  CTR('cSamB', 'Mikiri', 'sheathe', 'cSamR', 'MIKIRI', 'He reads the blow: hit him in the next 0.6 s and it misses, and he draws and cuts (crumple).');
  DP('cSamD', { name: 'Mikazuki', pose: 'upslash', twoHand: 1, rise: 9, dmg: 62, sfx: 'slash', desc: 'An invincible rising crescent cut: launches.' });
  C('samurai', 'cSamF', 'cSamB', 'cSamD');
  // SHINOBI (the ninja line)
  mv('cNinF', { name: 'Shuriken', type: 'proj', proj: 'shuriken', pose: 'kunaiToss', su: 0.1, rc: 0.26, dmg: 40, kb: [4, 0], stun: 0.6, range: 10, trail: 0, sfx: 'whoosh', desc: 'Three shuriken fan out, 10 m: they stagger.' });
  mv('cNinT', { name: 'Makibishi', dmg: 26, kb: [2, 0], stun: 0.5, slow: 1.6, trail: 0 });
  mv('cNinB', { name: 'Makibishi', type: 'trap', pose: 'toss', su: 0.12, ac: 0.04, rc: 0.28, reach: 1.8, trap: { look: 'spikes', col: 0x2a2e38, r: 1.0, life: 12, hit: 'cNinT', call: 'CALTROPS!' }, trail: 0, desc: 'Caltrops scattered 1.8 m ahead for 12 s: stepping on them hurts and SLOWS them.' });
  mv('cNinD', { name: 'Smoke Bomb', type: 'radial', pose: 'vanish', su: 0.04, ac: 0.12, rc: 0.3, dmg: 22, rad: 2.2, kb: [6, 9], launch: 1, dizzy: 1.0, inv: 1, recoil: 7, recoilUp: 6, puff: 0x5a5a62, trail: 0, sfx: 'boom', desc: 'Invincible smoke burst: anyone close is DIZZY, and he flips away.' });
  C('ninja', 'cNinF', 'cNinB', 'cNinD');
  // RONIN
  mv('cRonF', { name: 'Drunken Stagger', type: 'dash', hop: 3, pose: 'twoHandDiag', twoHand: 1, su: 0.14, ac: 0.18, rc: 0.34, dmg: 58, dist: 4, rad: 1.0, kb: [14, 6], launch: 1, inv: 1, sfx: 'slash', desc: 'He stumbles in, untouchable, and cuts on the way: a KNOCK.' });
  mv('cRonB', { name: 'Sake Fire', type: 'proj', proj: 'breath', pose: 'drink', su: 0.18, rc: 0.4, dmg: 18, kb: [10, 6], launch: 1, range: 3.6, burn: [10, 3], breathCol: [0xfff0b0, 0xffa040, 0xff5020], trail: 0, sfx: 'whoosh', desc: 'A mouthful of sake sprayed over his lantern: a cone of fire, BURNING.' });
  DP('cRonD', { name: 'Wandering Moon', pose: 'upslash', twoHand: 1, rise: 8, dmg: 64, sfx: 'slash', desc: 'An invincible rising draw: launches.' });
  C('ronin', 'cRonF', 'cRonB', 'cRonD');
  // KUNOICHI
  mv('cKunF', { name: 'Poison Mist', type: 'proj', proj: 'breath', pose: 'breath', su: 0.14, rc: 0.36, dmg: 12, kb: [2, 0], stun: 0.6, range: 3.4, poison: [10, 3], breathCol: [0xb0ff6a, 0x9a6aff, 0x5ad040], trail: 0, sfx: 'whoosh', desc: 'A cone of poison mist: POISONED.' });
  mv('cKunT', { name: 'Wire Trap', dmg: 26, kb: [2, 0], stun: 0.7, slow: 1.8, trail: 0 });
  mv('cKunB', { name: 'Wire Trap', type: 'trap', pose: 'toss', su: 0.12, ac: 0.04, rc: 0.28, reach: 1.8, trap: { look: 'wire', col: 0xd8dde6, r: 1.0, life: 12, hit: 'cKunT', call: 'WIRED!' }, trail: 0, desc: 'Razor wire strung 1.8 m ahead for 12 s: whoever walks into it is cut and SLOWED.' });
  DP('cKunD', { name: 'Swallow Kick', pose: 'airKick', rise: 10, dmg: 56, desc: 'An invincible rising kick: launches.' });
  C('kunoichi', 'cKunF', 'cKunB', 'cKunD');
  // SHOGUN
  mv('cShoF', { name: 'Tachi Sweep', pose: 'sweep', su: 0.16, ac: 0.1, rc: 0.34, dmg: 56, reach: 2.0, rad: 1.1, h: 0.4, zone: 'low', kb: [4, 8], launch: 1, trip: 1, lunge: 4, sfx: 'slash', desc: 'A long low sweep of the tachi, 2 m: they go down hard.' });
  mv('cShoB', { name: 'Shogun’s Decree', type: 'radial', pose: 'point', su: 0.16, ac: 0.1, rc: 0.32, dmg: 18, rad: 3.2, kb: [9, 4], launch: 1, weaken: 6, slow: 1.0, trail: 0, sfx: 'boom', desc: 'A word of command all round: WEAKENED for 6 s, and SLOWED.' });
  DP('cShoD', { name: 'Tachi Ascent', pose: 'twoHandUp', rise: 6, inv: 0, armor: 1, dmg: 70, sfx: 'slash', desc: 'A rising cut in full armour (not invincible): launches.' });
  C('shogun', 'cShoF', 'cShoB', 'cShoD');
  // DAIMYO
  mv('cDaiF', { name: 'Tessen Throw', type: 'proj', proj: 'tessen', pose: 'hurl', su: 0.16, rc: 0.3, dmg: 46, kb: [12, 5], launch: 1, range: 9, steal: 12, trail: 0, sfx: 'whoosh', desc: 'The iron war fan thrown, 9 m: a KNOCK that takes 12 Hype from them.' });
  RIP('cDaiR', { name: 'Oath Cut', pose: 'kesa', dmg: 64, kb: [16, 6], launch: 1, steal: 15, sfx: 'slash' });
  CTR('cDaiB', 'Retainer’s Oath', 'salute', 'cDaiR', 'OATH', 'A stance: hit him in the next 0.6 s and it misses; he cuts them down and takes 15 Hype.');
  DP('cDaiD', { name: 'Lord’s Ascent', pose: 'upslash', rise: 8, dmg: 60, desc: 'An invincible rising strike of the fan: launches.' });
  C('daimyo', 'cDaiF', 'cDaiB', 'cDaiD');

  /* ====================================================== KNIGHTS OF THE REALM */
  // KNIGHT
  mv('cKniF', { name: 'Shield Charge', type: 'dash', pose: 'bash', su: 0.16, ac: 0.16, rc: 0.34, dmg: 58, dist: 5.5, rad: 1.0, kb: [16, 5], launch: 1, armor: 1, crush: 3, sfx: 'heavy', desc: 'An armoured shield charge, 5.5 m: a KNOCK that breaks guards.' });
  mv('cKniB', { name: 'Mordhau', pose: 'twoHandOver', twoHand: 1, su: 0.22, ac: 0.08, rc: 0.34, dmg: 70, reach: 1.35, rad: 1.0, kb: [3, 0], crumple: 1.0, lunge: 4, crush: 2, sfx: 'heavy', desc: 'The sword reversed, the crossguard swung like a hammer: slow, but they crumple.' });
  DP('cKniD', { name: 'Shield Uppercut', pose: 'bashUp', rise: 7, inv: 0, armor: 1, dmg: 58, desc: 'A rising shield bash in armour (not invincible): launches.' });
  C('knight', 'cKniF', 'cKniB', 'cKniD');
  // PALADIN
  mv('cPalF', { name: 'Judgment', type: 'proj', proj: 'smite', pose: 'salute', su: 0.16, rc: 0.34, dmg: 62, kb: [2, 14], launch: 1, range: 9, holy: 1, smite: { rad: 1.3, delay: 0.5, col: 0xffd84a, pillar: 1 }, trail: 0, desc: 'Mark where they stand (up to 9 m): half a second later a pillar of light launches whoever is there.' });
  mv('cPalB', { name: 'Lay on Hands', type: 'buff', pose: 'meditate', su: 0.3, rc: 0.25, buff: { id: 'regen', t: 4, hp: 0.12, call: 'LAY ON HANDS' }, trail: 0, sfx: 'jguard', desc: 'Heal 12% over 4 s.' });
  DP('cPalD', { name: 'Hammer of Dawn', pose: 'twoHandUp', twoHand: 1, rise: 8, dmg: 64, holy: 1, desc: 'An invincible rising hammer: launches.' });
  C('paladin', 'cPalF', 'cPalB', 'cPalD');
  // DRAGOON
  mv('cDraF', { name: 'Dragon Fang', pose: 'lance', twoHand: 1, su: 0.18, ac: 0.1, rc: 0.32, dmg: 58, reach: 2.3, rad: 0.8, kb: [15, 5], launch: 1, lunge: 6, burn: [8, 2], sfx: 'slash', desc: 'A lance thrust 2.3 m long, wreathed in fire: a KNOCK, BURNING.' });
  mv('cDraB', { name: 'High Jump', type: 'leap', pose: 'lance', twoHand: 1, su: 0.12, ac: 0.85, rc: 0.3, air: 0.75, range: 10, rad: 1.5, dmg: 70, kb: [3, 10], launch: 1, inv: 1, quake: 1, trail: 0, sfx: 'heavy', desc: 'Leap sky-high, untouchable, and crash down where they stood (up to 10 m): launches.' });
  DP('cDraD', { name: 'Wyrmrise', pose: 'twoHandUp', twoHand: 1, rise: 11, dmg: 60, burn: [6, 1.5], desc: 'An invincible rising lance, trailing fire: launches, BURNING.' });
  C('dragoon', 'cDraF', 'cDraB', 'cDraD');
  // TEMPLAR
  mv('cTemF', { name: 'Cross Blade', type: 'dash', pose: 'thrust', su: 0.16, ac: 0.12, rc: 0.34, dmg: 62, dist: 4.5, rad: 0.9, kb: [15, 5], launch: 1, crush: 2.5, sfx: 'slash', desc: 'A lunging half-sword thrust, 4.5 m: a KNOCK that breaks a guard.' });
  mv('cTemB', { name: 'Consecrate', type: 'trap', pose: 'salute', su: 0.24, ac: 0.04, rc: 0.3, reach: 0.2, trap: { look: 'ring', col: 0xffd84a, r: 1.8, life: 7, aura: { heal: 0.015, burn: [8, 1.2] } }, trail: 0, sfx: 'jguard', desc: 'Holy ground under him for 7 s: it heals him while he stands in it and BURNS them.' });
  DP('cTemD', { name: 'Martyr’s Rise', pose: 'twoHandUp', twoHand: 1, rise: 7, dmg: 62, holy: 1, desc: 'An invincible rising cut: launches.' });
  C('templar', 'cTemF', 'cTemB', 'cTemD');
  // CRUSADER
  mv('cCruF', { name: 'Flail Snare', pose: 'chainThrow', su: 0.16, ac: 0.1, rc: 0.34, dmg: 36, reach: 2.6, rad: 0.9, stun: 0.8, pull: 1, lunge: 2, sfx: 'whoosh', desc: 'The flail lashed out 2.6 m: it drags them in to him.' });
  RIP('cCruR', { name: 'Faith Rewarded', pose: 'overhead', dmg: 60, kb: [15, 6], launch: 1, heal: 0.5 });
  CTR('cCruB', 'Iron Faith', 'salute', 'cCruR', 'IRON FAITH', 'A stance: hit him in the next 0.6 s and it misses; his answer heals him by half the damage it does.');
  DP('cCruD', { name: 'Morning Star Rise', pose: 'twoHandUp', rise: 7, multi: 3, dmg: 22, desc: 'An invincible rising flail, three hits: launches.' });
  C('crusader', 'cCruF', 'cCruB', 'cCruD');
  // LANCER
  mv('cLanF', { name: 'Trample', type: 'dash', pose: 'lance', su: 0.16, ac: 0.3, rc: 0.34, dmg: 22, multi: 3, dist: 7, rad: 1.0, kb: [6, 8], launch: 1, trip: 1, sfx: 'heavy', desc: 'The horse runs them over, 7 m, three hits: down hard.' });
  mv('cLanB', { name: 'Wheel About', pose: 'lance', su: 0.14, ac: 0.12, rc: 0.32, dmg: 52, around: 1, rad: 2.2, h: 0.8, kb: [16, 6], launch: 1, armor: 1, sfx: 'heavy', desc: 'The horse wheels round, hooves and lance all round him: an armoured KNOCK.' });
  DP('cLanD', { name: 'Rear Up', pose: 'bashUp', rise: 3, dmg: 64, reach: 1.3, rad: 1.2, h: 1.6, kb: [4, 14], desc: 'The horse rears, invincible, hooves high: launches.' });
  C('lancer', 'cLanF', 'cLanB', 'cLanD');

  /* ========================================================= LOVERS OF THE SEA */
  // PIRATE
  mv('cPirF', { name: 'Rope Swing', type: 'dash', hop: 6, pose: 'bootKick', su: 0.14, ac: 0.32, rc: 0.3, dmg: 56, dist: 7, rad: 1.0, kb: [15, 6], launch: 1, sfx: 'whoosh', desc: 'Swing in on a rope, boots first, 7 m (over low attacks): a KNOCK.' });
  mv('cPirT', { name: 'Spilled Rum', dmg: 30, kb: [3, 8], launch: 1, trip: 1, burn: [8, 2.5], trail: 0 });
  mv('cPirB', { name: 'Spilled Rum', type: 'trap', pose: 'toss', su: 0.14, ac: 0.04, rc: 0.3, reach: 2.4, trap: { look: 'puddle', col: 0xc8862a, r: 1.0, life: 10, hit: 'cPirT', call: 'SLIPPED!' }, trail: 0, desc: 'A bottle smashed 2.4 m ahead for 10 s: whoever steps in it slips, goes down hard and BURNS.' });
  DP('cPirD', { name: 'Crow’s Nest Kick', pose: 'airKick', rise: 10, dmg: 58, desc: 'An invincible flip kick straight up: launches.' });
  C('pirate', 'cPirF', 'cPirB', 'cPirD');
  // CAPTAIN
  mv('cCapF', { name: 'Ship’s Guns', type: 'proj', proj: 'smite', pose: 'point', su: 0.16, rc: 0.34, dmg: 66, kb: [6, 12], launch: 1, range: 11, blast: 1, smite: { rad: 1.6, delay: 0.65, col: 0xd8a830, look: 'cannonball' }, trail: 0, desc: 'She points: 0.65 s later the ship’s guns land a ball on the spot (up to 11 m).' });
  RIP('cCapR', { name: 'Broken Parley', pose: 'thrust', dmg: 52, reach: 1.5, rad: 0.9, kb: [3, 0], crumple: 0.9, weaken: 6, sfx: 'slash' });
  CTR('cCapB', 'Parley', 'salute', 'cCapR', 'PARLEY', 'A white flag: hit her in the next 0.6 s and it misses; she runs them through (crumple), WEAKENED for 6 s.');
  DP('cCapD', { name: 'Mainmast Rise', pose: 'upslash', rise: 8, dmg: 60, sfx: 'slash', desc: 'An invincible rising sabre: launches.' });
  C('captain', 'cCapF', 'cCapB', 'cCapD');
  // CANNONEER
  mv('cCanF', { name: 'Hot Shot', type: 'proj', proj: 'hotshot', pose: 'pitchL', su: 0.2, rc: 0.34, dmg: 54, kb: [15, 5], launch: 1, range: 9, burn: [10, 3], trail: 0, sfx: 'whoosh', desc: 'A red-hot ball from the swivel gun, 9 m: a KNOCK, BURNING.' });
  mv('cCanT', { name: 'Powder Trail', dmg: 56, kb: [6, 13], launch: 1, blast: 1, trail: 0 });
  mv('cCanB', { name: 'Powder Trail', type: 'trap', pose: 'toss', su: 0.14, ac: 0.04, rc: 0.3, reach: 2.0, trap: { look: 'powder', col: 0x3a3a40, r: 1.2, life: 10, hit: 'cCanT', call: 'KABOOM!', sfx: 'boom' }, trail: 0, desc: 'A powder trail 2 m ahead for 10 s: whoever steps on it is blown sky-high.' });
  DP('cCanD', { name: 'Recoil Jump', pose: 'shootDown', rise: 13, dmg: 58, kb: [3, 14], blast: 1, puff: 0x8a8a90, sfx: 'boom', desc: 'The swivel gun fired at the deck: he rides the blast up, invincible, and launches them.' });
  C('cannoneer', 'cCanF', 'cCanB', 'cCanD');
  // BLACKBEARD
  mv('cBlaF', { name: 'Grenado', type: 'proj', proj: 'bomb', pose: 'toss', su: 0.18, rc: 0.3, dmg: 60, kb: [12, 9], launch: 1, rad: 2.0, trail: 0, sfx: 'whoosh', desc: 'A lobbed grenado: it bursts 2 m wide and launches.' });
  mv('cBlaB', { name: 'Hellfire Breath', type: 'proj', proj: 'breath', pose: 'breath', su: 0.16, rc: 0.4, dmg: 18, kb: [10, 6], launch: 1, range: 3.4, burn: [12, 3], weaken: 4, trail: 0, sfx: 'whoosh', desc: 'Rum blown through the lit fuses in his beard: a cone of fire, BURNING and WEAKENED.' });
  DP('cBlaD', { name: 'Teach’s Hook', pose: 'upslash', rise: 7, dmg: 62, weaken: 4, sfx: 'slash', desc: 'An invincible rising cutlass: launches, WEAKENED.' });
  C('blackbeard', 'cBlaF', 'cBlaB', 'cBlaD');
  // REDBEARD
  mv('cRedF', { name: 'Scimitar Dance', type: 'dash', pose: 'slashA', su: 0.12, ac: 0.36, rc: 0.3, dmg: 15, multi: 4, dist: 5, rad: 1.0, kb: [14, 6], launch: 1, sfx: 'slash', desc: 'Four kilij cuts on the move, 5 m, the last a KNOCK.' });
  mv('cRedB', { name: 'Greek Fire', type: 'trap', pose: 'toss', su: 0.14, ac: 0.04, rc: 0.3, reach: 2.2, trap: { look: 'puddle', col: 0xe8501a, r: 1.4, life: 8, aura: { burn: [10, 1.2] } }, trail: 0, desc: 'A pool of Greek fire 2.2 m ahead for 8 s: anyone in it BURNS.' });
  DP('cRedD', { name: 'Crescent Moon', pose: 'upslash', rise: 8, dmg: 62, sfx: 'slash', desc: 'An invincible rising crescent of the kilij: launches.' });
  C('redbeard', 'cRedF', 'cRedB', 'cRedD');
  // SAILOR
  mv('cSaiF', { name: 'Belaying Pin', type: 'proj', proj: 'belay', pose: 'hurl', su: 0.14, rc: 0.3, dmg: 44, kb: [2, 0], dizzy: 1.2, range: 8, trail: 0, sfx: 'whoosh', desc: 'A belaying pin thrown, 8 m: DIZZY.' });
  mv('cSaiT', { name: 'Bowline Snare', dmg: 20, kb: [0, 0], stun: 1.0, pull: 1, trail: 0 });
  mv('cSaiB', { name: 'Bowline Snare', type: 'trap', pose: 'toss', su: 0.12, ac: 0.04, rc: 0.28, reach: 1.8, trap: { look: 'rope', col: 0xc8a878, r: 0.95, life: 12, hit: 'cSaiT', call: 'CAUGHT!' }, trail: 0, desc: 'A noose on the deck 1.8 m ahead for 12 s: whoever steps in is caught and held.' });
  DP('cSaiD', { name: 'Anchor’s Aweigh', pose: 'uppercut', rise: 7, dmg: 62, desc: 'An invincible rising uppercut: launches.' });
  C('sailor', 'cSaiF', 'cSaiB', 'cSaiD');
  // MARAUDER
  mv('cMarT', { name: 'Pillage', type: 'grab', dmg: 70, kb: [16, 7], launch: 1, steal: 25 });
  mv('cMarF', { name: 'Pillage', type: 'grab', pose: 'grab', su: 0.12, ac: 0.08, rc: 0.4, dmg: 0, reach: 1.25, rad: 0.9, cmd: 'f', throwMv: 'cMarT', kb: [0, 0], trail: 0, sfx: 'whoosh', desc: 'A command grab: he robs them of 25 Hype and throws them (beats guards and counters).' });
  mv('cMarB', { name: 'Hull Breaker', pose: 'skullSplit', su: 0.26, ac: 0.1, rc: 0.36, dmg: 74, reach: 1.5, rad: 1.4, kb: [3, 11], launch: 1, quake: 1, crush: 3, armor: 1, sfx: 'heavy', desc: 'An armoured overhead that splits the deck: pops them up, wrecks a guard.' });
  DP('cMarD', { name: 'Bearded Hook', pose: 'upslash', rise: 6, dmg: 58, desc: 'An invincible rising axe hook: launches.' });
  C('marauder', 'cMarF', 'cMarB', 'cMarD');
  // MUSKETEER
  mv('cMusF', { name: 'Buck and Ball', type: 'proj', proj: 'buck', pose: 'aim', twoHand: 1, su: 0.18, rc: 0.34, dmg: 58, kb: [15, 5], launch: 1, range: 6, trail: 0, sfx: 'shot', desc: 'A musket load of buck and ball: a spray that KNOCKs, 6 m (no cartridge spent).' });
  RIP('cMusR', { name: 'Bayonet Counter', pose: 'thrust', twoHand: 1, dmg: 64, reach: 1.6, rad: 0.9, kb: [3, 0], crumple: 1.0, sfx: 'slash' });
  CTR('cMusB', 'Form Square', 'aim', 'cMusR', 'FORM SQUARE', 'Bayonet levelled: hit her in the next 0.6 s and it misses, and she runs them through (crumple).');
  DP('cMusD', { name: 'Bayonet Rise', pose: 'upslash', twoHand: 1, rise: 6, dmg: 60, sfx: 'slash', desc: 'An invincible rising bayonet: launches.' });
  C('musketeer', 'cMusF', 'cMusB', 'cMusD');
  // GHOST PIRATE
  mv('cGhoF', { name: 'Chains of the Deep', type: 'proj', proj: 'chain', pose: 'chainThrow', su: 0.17, rc: 0.3, dmg: 40, kb: [0, 3], pull: 1, stun: 0.6, range: 6.5, trail: 0, sfx: 'whoosh', desc: 'Spectral chains, 6.5 m: they drag them in.' });
  mv('cGhoB', { name: 'Haunt', type: 'teleport', pose: 'backstab', su: 0.1, ac: 0.08, rc: 0.26, dmg: 40, kb: [9.5, 6.5], launch: 1, range: 9, inv: 1, reach: 1.1, slow: 1.5, sfx: 'slash', desc: 'He vanishes and comes back behind them (up to 9 m) with a chilling cut: SLOWED.' });
  DP('cGhoD', { name: 'Rising Tide', pose: 'upslash', rise: 9, dmg: 60, puff: 0x6affb0, sfx: 'slash', desc: 'An invincible rising cut in a spout of green water: launches.' });
  C('ghost', 'cGhoF', 'cGhoB', 'cGhoD');

  /* ============================================================= MODERN SPORTS */
  // WRESTLER
  mv('cWreF', { name: 'Running Lariat', type: 'dash', pose: 'lariat', su: 0.16, ac: 0.16, rc: 0.34, dmg: 66, dist: 5, rad: 1.0, kb: [15, 7], launch: 1, armor: 1, sfx: 'heavy', desc: 'An armoured running lariat, 5 m.' });
  mv('cWreT', { name: 'Powerbomb', type: 'grab', dmg: 92, kb: [1.5, -14], launch: 1, spike: 1 });
  mv('cWreB', { name: 'Powerbomb', type: 'grab', pose: 'grab', su: 0.12, ac: 0.08, rc: 0.4, dmg: 0, reach: 1.25, rad: 0.9, cmd: 'd', throwMv: 'cWreT', kb: [0, 0], trail: 0, sfx: 'whoosh', desc: 'A command grab: up and down in a Powerbomb (beats guards and counters).' });
  DP('cWreD', { name: 'Dropkick', pose: 'dropkick', rise: 8, dmg: 58, kb: [12, 9], desc: 'An invincible leaping dropkick: launches them away.' });
  C('wrestler', 'cWreF', 'cWreB', 'cWreD');
  // BASEBALL
  mv('cBasF', { name: 'Line Drive', pose: 'homerun', su: 0.18, ac: 0.08, rc: 0.32, dmg: 68, reach: 1.3, rad: 1.0, kb: [22, 5], launch: 1, lunge: 4, sfx: 'heavy', desc: 'A full swing: sends them further than any KNOCK.' });
  mv('cBasB', { name: 'Bunt', type: 'buff', pose: 'homerun', su: 0.05, rc: 0.3, buff: { id: 'reflect', t: 1.0, call: 'SQUARED TO BUNT' }, trail: 0, sfx: 'jguard', desc: 'Squared up for 1 s: shots bounce back off the bat.' });
  DP('cBasD', { name: 'Uppercut Swing', pose: 'homerun', rise: 6, dmg: 64, kb: [3, 15], desc: 'An invincible rising golf swing: launches.' });
  C('baseball', 'cBasF', 'cBasB', 'cBasD');
  // FOOTBALL
  mv('cFooF', { name: 'Stiff Arm', pose: 'palm', su: 0.14, ac: 0.08, rc: 0.3, dmg: 54, reach: 1.45, rad: 1.0, kb: [17, 4], launch: 1, lunge: 6, crush: 2.5, sfx: 'heavy', desc: 'A stiff arm on the run: a KNOCK that breaks guards.' });
  mv('cFooB', { name: 'Hurdle', type: 'dash', hop: 8, pose: 'tackle', su: 0.08, ac: 0.3, rc: 0.3, dmg: 34, dist: 4, rad: 1.0, kb: [3, -9], launch: 1, spike: 1, inv: 1, sfx: 'whoosh', desc: 'An invincible hurdle over them, cleats first on the way down: spikes them for a bounce.' });
  DP('cFooD', { name: 'Pancake Block', pose: 'bashUp', rise: 6, inv: 0, armor: 1, dmg: 60, desc: 'A rising block in armour (not invincible): launches.' });
  C('football', 'cFooF', 'cFooB', 'cFooD');
  // SOCCER
  mv('cSocF', { name: 'Slide Tackle', type: 'dash', pose: 'slide', su: 0.1, ac: 0.18, rc: 0.32, dmg: 44, dist: 6, rad: 0.9, kb: [4, 8], launch: 1, trip: 1, zone: 'low', sfx: 'whoosh', desc: 'A slide, 6 m, under high attacks: they trip and go down hard.' });
  mv('cSocR', { name: 'Yellow Card', type: 'radial', pose: 'point', su: 0.05, ac: 0.08, rc: 0.3, dmg: 12, rad: 2.6, kb: [3, 0], dizzy: 1.0, weaken: 8, trail: 0, sfx: 'jguard' });
  CTR('cSocB', 'Simulation', 'weave', 'cSocR', 'YELLOW CARD', 'Hit him in the next 0.6 s and he goes down theatrically: the ref books them (DIZZY, WEAKENED for 8 s).');
  DP('cSocD', { name: 'Bicycle Kick', pose: 'bicycle', rise: 9, dmg: 60, kb: [6, -10], spike: 1, launcher: 0, desc: 'An invincible bicycle kick: spikes them back down for a bounce.' });
  C('soccer', 'cSocF', 'cSocB', 'cSocD');
  // BOXER
  mv('cBoxF', { name: 'Dempsey Roll', type: 'dash', pose: 'hook', su: 0.12, ac: 0.4, rc: 0.3, dmg: 13, multi: 5, dist: 4, rad: 0.95, kb: [14, 6], launch: 1, sfx: 'heavy', desc: 'Weaving in with five hooks, 4 m, the last a KNOCK.' });
  RIP('cBoxR', { name: 'Counter Hook', pose: 'hookL', dmg: 66, reach: 1.25, kb: [3, 0], crumple: 1.0 });
  CTR('cBoxB', 'Rope-a-Dope', 'weave', 'cBoxR', 'ROPE-A-DOPE', 'He covers up: hit him in the next 0.6 s and he slips it, and a counter hook crumples them.');
  DP('cBoxD', { name: 'Gazelle Punch', pose: 'uppercut', rise: 7, dmg: 64, desc: 'An invincible leaping uppercut: launches.' });
  C('boxer', 'cBoxF', 'cBoxB', 'cBoxD');
  // FENCER
  mv('cFenF', { name: 'Flèche', type: 'dash', pose: 'lunge', su: 0.12, ac: 0.12, rc: 0.3, dmg: 54, dist: 6, rad: 0.8, kb: [14, 5], launch: 1, crush: 1.5, sfx: 'slash', desc: 'A running attack, 6 m in a flash: a KNOCK.' });
  mv('cFenB', { name: 'Prise de Fer', pose: 'thrust', su: 0.1, ac: 0.08, rc: 0.3, dmg: 34, reach: 1.6, rad: 0.85, kb: [4, 0], stun: 0.7, weaken: 6, crush: 3, lunge: 4, sfx: 'slash', desc: 'She binds their blade: WEAKENED for 6 s, and it wrecks a guard.' });
  DP('cFenD', { name: 'Passata Sotto', pose: 'upslash', rise: 5, dmg: 56, sfx: 'slash', desc: 'She ducks under it, invincible, and thrusts up: launches.' });
  C('fencer', 'cFenF', 'cFenB', 'cFenD');
  // WEIGHTLIFTER
  mv('cWeiT', { name: 'Deadlift Throw', type: 'grab', dmg: 88, kb: [19, 8], launch: 1 });
  mv('cWeiF', { name: 'Deadlift Throw', type: 'grab', pose: 'grab', su: 0.12, ac: 0.08, rc: 0.4, dmg: 0, reach: 1.25, rad: 0.9, cmd: 'f', throwMv: 'cWeiT', kb: [0, 0], trail: 0, sfx: 'whoosh', desc: 'A command grab: lifted overhead and thrown, far (beats guards and counters).' });
  mv('cWeiB', { name: 'Barbell Spin', pose: 'press', su: 0.14, ac: 0.4, rc: 0.34, dmg: 15, multi: 4, around: 1, rad: 1.8, h: 1.0, kb: [14, 6], launch: 1, armor: 1, sfx: 'heavy', desc: 'An armoured spin of the barbell, all round, four hits.' });
  DP('cWeiD', { name: 'Clean & Jerk', pose: 'press', rise: 6, inv: 0, armor: 1, dmg: 70, desc: 'A rising press in armour (not invincible): launches.' });
  C('weightlifter', 'cWeiF', 'cWeiB', 'cWeiD');
  // BOWLER
  mv('cBowF', { name: 'Pin Toss', type: 'proj', proj: 'bpin', pose: 'hurl', su: 0.14, rc: 0.3, dmg: 44, kb: [2, 0], dizzy: 1.0, range: 8.5, trail: 0, sfx: 'whoosh', desc: 'A pin thrown, 8.5 m: DIZZY.' });
  mv('cBowT', { name: 'Pin Setter', dmg: 32, kb: [5, 8], launch: 1, trip: 1, trail: 0 });
  mv('cBowB', { name: 'Pin Setter', type: 'trap', pose: 'bowl', su: 0.14, ac: 0.04, rc: 0.3, reach: 2.0, trap: { look: 'pins', col: 0xf6f4ee, r: 0.9, life: 12, hit: 'cBowT', call: 'STRIKE!' }, trail: 0, desc: 'A rack of pins 2 m ahead for 12 s: whoever runs into them goes down hard.' });
  DP('cBowD', { name: 'Follow-Through', pose: 'bowlSwing', rise: 6, dmg: 60, desc: 'An invincible rising follow-through: launches.' });
  C('bowler', 'cBowF', 'cBowB', 'cBowD');
  // ARCHER
  mv('cArcF', { name: 'Rain of Arrows', type: 'proj', proj: 'smite', pose: 'drawBow', su: 0.18, rc: 0.34, dmg: 56, kb: [2, -10], launch: 1, spike: 1, range: 11, smite: { rad: 1.5, delay: 0.6, col: 0xfff07a, look: 'arrow', n: 6, sfx: 'whoosh' }, trail: 0, desc: 'A volley loosed high: 0.6 s later it rains on the marked spot (up to 11 m) and spikes them.' });
  mv('cArcB', { name: 'Disengage', type: 'proj', proj: 'arrow', pose: 'drawBow', su: 0.08, rc: 0.3, dmg: 40, kb: [10, 5], launch: 1, range: 9, recoil: 7, recoilUp: 6, trail: 0, sfx: 'whoosh', desc: 'A backflip away, loosing an arrow mid-air: a KNOCK (no arrow from the quiver).' });
  mv('cArcD', { name: 'Skyward Volley', type: 'proj', proj: 'arrowsUp', pose: 'drawBow', su: 0.08, rc: 0.36, dmg: 46, kb: [2, 12], launch: 1, range: 7, inv: 1, trail: 0, sfx: 'whoosh', desc: 'Invincible: three arrows straight up at anyone jumping in.' });
  C('archer', 'cArcF', 'cArcB', 'cArcD');
  // SKATER
  mv('cSkaF', { name: 'Board Toss', type: 'proj', proj: 'board', pose: 'hurl', su: 0.14, rc: 0.3, dmg: 50, kb: [14, 6], launch: 1, range: 8, trail: 0, sfx: 'whoosh', desc: 'The board flung like a frisbee, 8 m: a KNOCK.' });
  mv('cSkaB', { name: 'Ollie Slam', type: 'leap', pose: 'kickflip', su: 0.1, ac: 0.65, rc: 0.28, air: 0.55, range: 7, rad: 1.4, dmg: 60, kb: [3, 11], launch: 1, quake: 1, trail: 0, sfx: 'heavy', desc: 'An ollie onto them (up to 7 m): the landing pops them up.' });
  DP('cSkaD', { name: 'McTwist', pose: 'kickflip', rise: 9, multi: 3, dmg: 22, desc: 'An invincible spinning 540, three hits: launches.' });
  C('skater', 'cSkaF', 'cSkaB', 'cSkaD');
  // BASKETBALL
  mv('cBbaF', { name: 'Ankle Breaker', type: 'dash', pose: 'weave', su: 0.06, ac: 0.18, rc: 0.24, dmg: 22, dist: 4.5, rad: 0.9, kb: [2, 0], stun: 0.5, dizzy: 1.4, inv: 1, trail: 0, sfx: 'whoosh', desc: 'An invincible crossover through them: their ankles go, DIZZY.' });
  mv('cBbaR', { name: 'Offensive Foul', type: 'radial', pose: 'point', su: 0.04, ac: 0.08, rc: 0.3, dmg: 24, rad: 2.2, kb: [3, 0], crumple: 1.2, trail: 0, sfx: 'jguard' });
  CTR('cBbaB', 'Take the Charge', 'weave', 'cBbaR', 'OFFENSIVE FOUL', 'Feet set: hit him in the next 0.6 s and it’s their foul (they crumple).');
  DP('cBbaD', { name: 'Alley-Oop', pose: 'bashUp', rise: 12, dmg: 58, desc: 'An invincible leap for the alley-oop: launches.' });
  C('basketball', 'cBbaF', 'cBbaB', 'cBbaD');

  // every figure has its three: a check while the game is made (a line added later without them is easy to miss)
  for (const id of KB.LINE_ORDER) if (!P[id].head.cmd) console.warn('[commands] no command specials for ' + id);
})();
