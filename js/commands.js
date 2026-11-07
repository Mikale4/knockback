/* commands.js -- COMMAND SPECIALS: three more Specials for every figure, each one something only that figure would do.

   A direction held with Special, read on the screen: → is the side of the screen (left or right) the opponent is on,
   flipping when you swap sides, ↑ is the stick pushed up; the Special then turns to face them:
     → + Special (the qcf slot)     ← + Special (qcb)     ↑ + Special (dp)     (the keys are from when they were motions)
   The motions are only the buttons: what each does is the figure's own (a rising anti-air is there only where it's
   that figure's signature: the boxer's uppercut, the bicycle kick, the alley-oop, a horse rearing, a cannon jump).
   Plain Special is still the figure's own. All four share the HEAD's uses (one more use a round than before); they
   belong to the HEAD, so a figure wearing someone else's head fights with that head's Specials.

   What a move can carry (fighter.js, match.js):
     on a hit   seal (no Special), confuse (the stick backwards), root (can't move), hobble (no jump or dodge),
                disarm (no Lights), freeze (stopped dead, even in the air), bribe (their next hit does nothing),
                brand (hits on them heal you), wallBreak (the next wall they hit breaks), sunder (armour off a part),
                touche (three win the bout), drain (a share of their HP), execute (double under 30%), lastStand
                (more the lower your HP), gbreak (a guard shatters), groundHit (hits them lying down), and
                slow, weaken, trip, crush, plus launch, crumple, dizzy, sleep, burn, poison, pull, steal, heal
     buffs      berserk, empower, invis, immov, autoGuard, bubble, morale, fuses, pumped, catch, ropes, pure,
                and counter, reflect, haste, regen, iron
     act        impBomb, soulSwap, sacrifice, kiBurst, gate, parrot, shove, scourge, reloadDrill, dance, hulkUp,
                spare, safe (match.js M.act: the things only one figure does)
     and rise, hop, recoil, prone, noHit, needImp, needBall, encore; type trap / leap; proj smite and the shots */
(function () {
  'use strict';
  const { PARTS: P, mv } = KB;
  const C = (line, qcf, qcb, dp) => { P[line].head.cmd = { qcf, qcb, dp }; };
  const RISE = (id, o) => mv(id, Object.assign({ su: 0.06, ac: 0.16, rc: 0.38, dmg: 60, reach: 1.0, rad: 1.1, h: 1.5, kb: [2, 13.5], launch: 1, launcher: 1, rise: 9, lunge: 3, inv: 1, sfx: 'heavy' }, o));
  const BUFF = (id, name, pose, buff, desc, o) => mv(id, Object.assign({ name, type: 'buff', pose, su: 0.2, rc: 0.22, buff, trail: 0, sfx: 'jguard', desc }, o));
  const ACT = (id, name, pose, act, desc, o) => mv(id, Object.assign({ name, type: 'act', pose, su: 0.16, rc: 0.28, act, trail: 0, sfx: 'whoosh', desc }, o));

  /* ============================================================ HISTORICAL FANTASY */
  // MONK: pressure points, an iron body, ki
  mv('cMonF', { name: 'Dim Mak', pose: 'jabR', su: 0.12, ac: 0.06, rc: 0.3, dmg: 30, reach: 1.3, rad: 0.8, kb: [2, 0], stun: 0.7, seal: 6, lunge: 4, sfx: 'heavy', desc: 'Two fingers to a pressure point: SEALED, no Special for 6 s.' });
  BUFF('cMonB', 'Iron Shirt', 'meditate', { id: 'iron', t: 3, hits: 3 }, 'For 3 s, the next three hits don’t stagger him.');
  mv('cMonD', { name: 'Ki Burst', type: 'radial', pose: 'burst', su: 0.05, ac: 0.1, rc: 0.34, dmg: 24, rad: 2.4, kb: [13, 4], launch: 1, inv: 1, act: 'kiBurst', puff: 0xffe080, trail: 0, sfx: 'boom', desc: 'Invincible burst of ki: every enemy shot within 4.5 m is destroyed, and anyone close is blown away.' });
  C('monk', 'cMonF', 'cMonB', 'cMonD');
  // VIKING: a throwing axe, the shield wall, the berserker
  mv('cVikF', { name: 'Hurled Axe', type: 'proj', proj: 'hatchet', pose: 'hurl', su: 0.18, rc: 0.32, dmg: 56, kb: [14, 5], launch: 1, range: 8.5, gbreak: 1, trail: 0, sfx: 'whoosh', desc: 'A throwing axe, 8.5 m: a KNOCK, and a guard it hits is shattered.' });
  BUFF('cVikB', 'Shield Wall', 'bash', { id: 'reflect', t: 1.5, call: 'SHIELD WALL' }, 'Round shield up for 1.5 s: arrows, bullets and bolts bounce back at whoever loosed them.', { su: 0.06, rc: 0.32 });
  BUFF('cVikD', 'Berserkergang', 'roar', { id: 'berserk', t: 8, cost: 0.1 }, 'He bites his shield: 10% of his HP for 8 s of +25% damage, and every attack he starts takes one hit of armour.', { su: 0.3 });
  C('viking', 'cVikF', 'cVikB', 'cVikD');
  // SUMMONER: her imps are the weapon, the door and the offering
  ACT('cSumF', 'Imp Bomb', 'hurl', 'impBomb', 'One of her imps hurled (a fresh one if none is out): it bursts where it lands, 2 m wide.', { dmg: 54, kb: [12, 9], launch: 1, rad: 2.0 });
  ACT('cSumB', 'Soul Swap', 'vanish', 'soulSwap', 'She trades places with her imp furthest away.', { su: 0.08, rc: 0.24, needImp: 1, sfx: 'dodge' });
  ACT('cSumD', 'Blood Pact', 'summon', 'sacrifice', 'Every imp she has bursts: each one heals her 5% and gives 10 Hype.', { su: 0.2, needImp: 1 });
  C('summoner', 'cSumF', 'cSumB', 'cSumD');
  // BARD: a lullaby, the tempo, an encore
  mv('cBarF', { name: 'Lullaby', type: 'proj', proj: 'wave', pose: 'strum', su: 0.2, rc: 0.32, dmg: 16, kb: [0, 0], stun: 0.4, sleep: 1.3, range: 7, trail: 0, sfx: 'chord', desc: 'A soft wave of notes, 7 m: they fall ASLEEP.' });
  BUFF('cBarB', 'Allegro', 'strum', { id: 'haste', t: 6, call: 'ALLEGRO' }, 'The tempo picks up: 30% faster on his feet for 6 s.', { sfx: 'chord' });
  ACT('cBarD', 'Encore', 'strum', null, 'An encore: his last Special again (it costs a use like any other).', { encore: 1, sfx: 'chord' });
  C('bard', 'cBarF', 'cBarB', 'cBarD');

  /* ================================================================ EDO JAPAN */
  // SAMURAI: the shout, the reading of a blow, the blade sheathed
  mv('cSamF', { name: 'Kiai', type: 'radial', pose: 'roar', su: 0.12, ac: 0.08, rc: 0.36, dmg: 10, rad: 3.2, kb: [0, 0], stun: 0.3, freeze: 0.9, puff: 0xe8f0ff, trail: 0, sfx: 'boom', desc: 'A battle shout: anyone within 3.2 m is FROZEN in place for 0.9 s, even in the air.' });
  mv('cSamR', { name: 'Mikiri Draw', pose: 'iai', su: 0.03, ac: 0.08, rc: 0.3, dmg: 72, reach: 1.5, rad: 1.0, kb: [3, 0], crumple: 1.0, lunge: 6, sfx: 'slash' });
  mv('cSamB', { name: 'Mikiri', type: 'buff', pose: 'sheathe', su: 0.04, ac: 0.02, rc: 0.5, buff: { id: 'counter', t: 0.6, rip: 'cSamR', call: 'MIKIRI' }, trail: 0, sfx: 'jguard', desc: 'He reads the blow: hit him in the next 0.6 s and it misses, and he draws and cuts (crumple).' });
  BUFF('cSamD', 'Nōtō', 'sheathe', { id: 'empower', t: 4, call: 'NŌTŌ' }, 'He slides the blade home: his next hit within 4 s deals +60% and crumples.');
  C('samurai', 'cSamF', 'cSamB', 'cSamD');
  // SHINOBI (the ninja line): stars, caltrops, smoke
  mv('cNinF', { name: 'Shuriken', type: 'proj', proj: 'shuriken', pose: 'kunaiToss', su: 0.1, rc: 0.26, dmg: 40, kb: [4, 0], stun: 0.6, range: 10, trail: 0, sfx: 'whoosh', desc: 'Three shuriken fan out, 10 m: they stagger.' });
  mv('cNinT', { name: 'Makibishi', dmg: 26, kb: [2, 0], stun: 0.5, slow: 1.6, trail: 0 });
  mv('cNinB', { name: 'Makibishi', type: 'trap', pose: 'toss', su: 0.12, ac: 0.04, rc: 0.28, reach: 1.8, trap: { look: 'spikes', col: 0x2a2e38, r: 1.0, life: 12, hit: 'cNinT', call: 'CALTROPS!' }, trail: 0, desc: 'Caltrops scattered 1.8 m ahead for 12 s: stepping on them hurts and SLOWS them.' });
  BUFF('cNinD', 'Smoke Bomb', 'vanish', { id: 'invis', t: 3 }, 'A smoke bomb: he vanishes from sight for 3 s (attacking gives him away).', { su: 0.04, rc: 0.18, inv: 1, puff: 0x5a5a62, sfx: 'boom' });
  C('ninja', 'cNinF', 'cNinB', 'cNinD');
  // RONIN: drunk, rude, and most dangerous when he's nearly finished
  mv('cRonF', { name: 'Drunken Stagger', type: 'dash', hop: 3, pose: 'twoHandDiag', twoHand: 1, su: 0.14, ac: 0.18, rc: 0.34, dmg: 58, dist: 4, rad: 1.0, kb: [14, 6], launch: 1, inv: 1, sfx: 'slash', desc: 'He stumbles in, untouchable, and cuts on the way: a KNOCK.' });
  mv('cRonB', { name: 'Sake Spit', type: 'proj', proj: 'breath', pose: 'drink', su: 0.16, rc: 0.38, dmg: 10, kb: [0, 0], stun: 0.4, dizzy: 1.4, range: 3.2, breathCol: [0xfff8e0, 0xe0f0ff, 0xffffff], trail: 0, sfx: 'whoosh', desc: 'A mouthful of sake sprayed in their eyes: DIZZY.' });
  mv('cRonD', { name: 'Last Stand', pose: 'iai', su: 0.14, ac: 0.08, rc: 0.34, dmg: 50, reach: 1.5, rad: 1.0, kb: [16, 6], launch: 1, lunge: 6, lastStand: 1, sfx: 'slash', desc: 'One desperate cut: the lower his HP, the harder it hits (up to ×2.6).' });
  C('ronin', 'cRonF', 'cRonB', 'cRonD');
  // KUNOICHI: poison, a charm, a needle
  mv('cKunF', { name: 'Poison Mist', type: 'proj', proj: 'breath', pose: 'breath', su: 0.14, rc: 0.36, dmg: 12, kb: [2, 0], stun: 0.6, range: 3.4, poison: [10, 3], breathCol: [0xb0ff6a, 0x9a6aff, 0x5ad040], trail: 0, sfx: 'whoosh', desc: 'A cone of poison mist: POISONED.' });
  mv('cKunB', { name: 'Charm', type: 'proj', proj: 'heart', pose: 'point', su: 0.14, rc: 0.3, dmg: 6, kb: [0, 0], stun: 0.3, confuse: 3, range: 7, trail: 0, sfx: 'whoosh', desc: 'A blown kiss, 7 m: CHARMED for 3 s, their stick works backwards.' });
  mv('cKunD', { name: 'Senbon Pin', type: 'proj', proj: 'pin', pose: 'kunaiToss', su: 0.1, rc: 0.28, dmg: 22, kb: [0, 0], stun: 0.4, root: 1.6, range: 9, trail: 0, sfx: 'whoosh', desc: 'A needle through the foot, 9 m: PINNED, they can’t move or jump for 1.6 s.' });
  C('kunoichi', 'cKunF', 'cKunB', 'cKunD');
  // SHOGUN: siege, command, the general who does not move
  mv('cShoF', { name: 'Siege Ram', type: 'dash', pose: 'bash', su: 0.18, ac: 0.18, rc: 0.36, dmg: 58, dist: 5.5, rad: 1.0, kb: [18, 5], launch: 1, armor: 1, wallBreak: 1, sfx: 'heavy', desc: 'An armoured charge, 5.5 m: a KNOCK, and the next wall they hit breaks.' });
  mv('cShoB', { name: 'Shogun’s Decree', type: 'radial', pose: 'point', su: 0.16, ac: 0.1, rc: 0.32, dmg: 18, rad: 3.2, kb: [9, 4], launch: 1, weaken: 6, slow: 1.0, trail: 0, sfx: 'boom', desc: 'A word of command all round: WEAKENED for 6 s, and SLOWED.' });
  BUFF('cShoD', 'Kabuto Stance', 'salute', { id: 'immov', t: 5, call: 'IMMOVABLE' }, 'The general does not retreat: for 5 s nothing staggers him, but he moves at 60%.');
  C('shogun', 'cShoF', 'cShoB', 'cShoD');
  // DAIMYO: a fan that comes home, a gate, a bribe
  mv('cDaiF', { name: 'Returning Tessen', type: 'proj', proj: 'tessenRet', pose: 'hurl', su: 0.16, rc: 0.3, dmg: 40, kb: [10, 4], launch: 1, range: 7, steal: 8, trail: 0, sfx: 'whoosh', desc: 'The iron fan flies out 7 m and comes back to his hand: it hits going and coming, and takes Hype.' });
  ACT('cDaiB', 'Castle Gate', 'point', 'gate', 'A castle gate rises 1.8 m in front of him for 6 s: no shot and no figure gets through it.', { su: 0.2, rc: 0.3, reach: 1.8, sfx: 'boom' });
  mv('cDaiD', { name: 'Bribe', pose: 'jabL', su: 0.1, ac: 0.06, rc: 0.3, dmg: 0, reach: 1.4, rad: 0.8, kb: [0, 0], stun: 0.3, bribe: 1, lunge: 3, trail: 0, sfx: 'whoosh', desc: 'A gold koban slipped into their hand: BRIBED, their next hit does nothing.' });
  C('daimyo', 'cDaiF', 'cDaiB', 'cDaiD');

  /* ====================================================== KNIGHTS OF THE REALM */
  // KNIGHT: the charge, the murder stroke, chivalry
  mv('cKniF', { name: 'Shield Charge', type: 'dash', pose: 'bash', su: 0.16, ac: 0.16, rc: 0.34, dmg: 58, dist: 5.5, rad: 1.0, kb: [16, 5], launch: 1, armor: 1, crush: 3, sfx: 'heavy', desc: 'An armoured shield charge, 5.5 m: a KNOCK that breaks guards.' });
  mv('cKniB', { name: 'Mordhau', pose: 'twoHandOver', twoHand: 1, su: 0.22, ac: 0.08, rc: 0.34, dmg: 70, reach: 1.35, rad: 1.0, kb: [3, 0], crumple: 1.0, lunge: 4, crush: 2, sfx: 'heavy', desc: 'The sword reversed, the crossguard swung like a hammer: slow, but they crumple.' });
  BUFF('cKniD', 'Chivalry', 'salute', { id: 'autoGuard', t: 4, call: 'CHIVALRY' }, 'For 4 s, any blow from the front is guarded on its own, even on the move.');
  C('knight', 'cKniF', 'cKniB', 'cKniD');
  // PALADIN: judgment, healing hands, a divine shield
  mv('cPalF', { name: 'Judgment', type: 'proj', proj: 'smite', pose: 'salute', su: 0.16, rc: 0.34, dmg: 62, kb: [2, 14], launch: 1, range: 9, holy: 1, smite: { rad: 1.3, delay: 0.5, col: 0xffd84a, pillar: 1 }, trail: 0, desc: 'Mark where they stand (up to 9 m): half a second later a pillar of light launches whoever is there.' });
  BUFF('cPalB', 'Lay on Hands', 'meditate', { id: 'regen', t: 4, hp: 0.12, call: 'LAY ON HANDS' }, 'Heal 12% over 4 s.', { su: 0.3, rc: 0.25 });
  BUFF('cPalD', 'Divine Shield', 'salute', { id: 'bubble', t: 1.5 }, 'A golden shield: untouchable for 1.5 s, but he can’t attack from inside it.', { su: 0.06, rc: 0.1 });
  C('paladin', 'cPalF', 'cPalB', 'cPalD');
  // DRAGOON: the fang, the jump, the vault
  mv('cDraF', { name: 'Dragon Fang', pose: 'lance', twoHand: 1, su: 0.18, ac: 0.1, rc: 0.32, dmg: 58, reach: 2.3, rad: 0.8, kb: [15, 5], launch: 1, lunge: 6, burn: [8, 2], sfx: 'slash', desc: 'A lance thrust 2.3 m long, wreathed in fire: a KNOCK, BURNING.' });
  mv('cDraB', { name: 'High Jump', type: 'leap', pose: 'lance', twoHand: 1, su: 0.12, ac: 0.85, rc: 0.3, air: 0.75, range: 10, rad: 1.5, dmg: 70, kb: [3, 10], launch: 1, inv: 1, quake: 1, lunge: 0, trail: 0, sfx: 'heavy', desc: 'Leap sky-high, untouchable, and crash down where they stood (up to 10 m): launches.' });
  mv('cDraD', { name: 'Lance Vault', type: 'dash', hop: 10, pose: 'lance', twoHand: 1, su: 0.1, ac: 0.34, rc: 0.3, dmg: 46, dist: 5.5, rad: 1.1, kb: [3, -11], launch: 1, spike: 1, inv: 1, sfx: 'slash', desc: 'He pole-vaults over them on his lance and comes down behind them point first: spikes them.' });
  C('dragoon', 'cDraF', 'cDraB', 'cDraD');
  // TEMPLAR: the brand, holy ground, the scourge
  mv('cTemF', { name: 'Templar’s Brand', pose: 'palm', su: 0.12, ac: 0.07, rc: 0.3, dmg: 30, reach: 1.3, rad: 0.85, kb: [3, 0], stun: 0.6, brand: 8, lunge: 4, sfx: 'heavy', desc: 'The cross branded on them: for 8 s his hits on them heal him by 40% of the damage.' });
  mv('cTemB', { name: 'Consecrate', type: 'trap', pose: 'salute', su: 0.24, ac: 0.04, rc: 0.3, reach: 0.2, trap: { look: 'ring', col: 0xffd84a, r: 1.8, life: 7, aura: { heal: 0.015, burn: [8, 1.2] } }, trail: 0, sfx: 'jguard', desc: 'Holy ground under him for 7 s: it heals him while he stands in it and BURNS them.' });
  ACT('cTemD', 'Scourge', 'overhead', 'scourge', 'He scourges himself: 8% of his HP for 40 Hype and +12% damage for 5 s.', { su: 0.24, rc: 0.24 });
  C('templar', 'cTemF', 'cTemB', 'cTemD');
  // CRUSADER: the flail's chain, the relic, the storm
  mv('cCruF', { name: 'Flail Wrap', pose: 'chainThrow', su: 0.16, ac: 0.1, rc: 0.32, dmg: 28, reach: 2.4, rad: 0.9, kb: [3, 0], stun: 0.6, disarm: 3, lunge: 2, sfx: 'whoosh', desc: 'The flail’s chain wraps their weapon, 2.4 m: DISARMED, no Lights for 3 s.' });
  BUFF('cCruB', 'Holy Relic', 'salute', { id: 'pure', t: 4 }, 'The relic held high: every BURN, POISON, SLOW, WEAKEN, SEAL and the like on him is lifted, and none takes for 4 s.');
  mv('cCruD', { name: 'Flail Storm', type: 'dash', pose: 'overhead', su: 0.12, ac: 0.5, rc: 0.34, dmg: 16, multi: 4, dist: 4, rad: 1.4, kb: [15, 6], launch: 1, sfx: 'heavy', desc: 'The flail whirling, he walks into them: four hits, the last a KNOCK.' });
  C('crusader', 'cCruF', 'cCruB', 'cCruD');
  // LANCER: the horse does the work
  mv('cLanF', { name: 'Trample', type: 'dash', pose: 'lance', su: 0.16, ac: 0.3, rc: 0.34, dmg: 22, multi: 3, dist: 7, rad: 1.0, kb: [6, 8], launch: 1, trip: 1, sfx: 'heavy', desc: 'The horse runs them over, 7 m, three hits: down hard.' });
  mv('cLanB', { name: 'Wheel About', pose: 'lance', su: 0.14, ac: 0.12, rc: 0.32, dmg: 52, around: 1, rad: 2.2, h: 0.8, kb: [16, 6], launch: 1, armor: 1, sfx: 'heavy', desc: 'The horse wheels round, hooves and lance all round him: an armoured KNOCK.' });
  RISE('cLanD', { name: 'Rear Up', pose: 'bashUp', rise: 3, dmg: 64, reach: 1.3, rad: 1.2, h: 1.6, kb: [4, 14], desc: 'The horse rears, invincible, hooves high: launches.' });
  C('lancer', 'cLanF', 'cLanB', 'cLanD');

  /* ========================================================= LOVERS OF THE SEA */
  // PIRATE: a rope, the rum, the parrot
  mv('cPirF', { name: 'Rope Swing', type: 'dash', hop: 6, pose: 'bootKick', su: 0.14, ac: 0.32, rc: 0.3, dmg: 56, dist: 7, rad: 1.0, kb: [15, 6], launch: 1, sfx: 'whoosh', desc: 'Swing in on a rope, boots first, 7 m (over low attacks): a KNOCK.' });
  mv('cPirT', { name: 'Spilled Rum', dmg: 30, kb: [3, 8], launch: 1, trip: 1, burn: [8, 2.5], trail: 0 });
  mv('cPirB', { name: 'Spilled Rum', type: 'trap', pose: 'toss', su: 0.14, ac: 0.04, rc: 0.3, reach: 2.4, trap: { look: 'puddle', col: 0xc8862a, r: 1.0, life: 10, hit: 'cPirT', call: 'SLIPPED!' }, trail: 0, desc: 'A bottle smashed 2.4 m ahead for 10 s: whoever steps in it slips, goes down hard and BURNS.' });
  ACT('cPirD', 'Polly!', 'point', 'parrot', 'His parrot flies at them and pecks three times, following them wherever they go.', { su: 0.12, rc: 0.26, dmg: 12, kb: [1.5, 0], stun: 0.45 });
  C('pirate', 'cPirF', 'cPirB', 'cPirD');
  // CAPTAIN: the ship's guns, the ship itself, the colours
  mv('cCapF', { name: 'Ship’s Guns', type: 'proj', proj: 'smite', pose: 'point', su: 0.16, rc: 0.34, dmg: 66, kb: [6, 12], launch: 1, range: 11, blast: 1, smite: { rad: 1.6, delay: 0.65, col: 0xd8a830, look: 'cannonball' }, trail: 0, desc: 'She points: 0.65 s later the ship’s guns land a ball on the spot (up to 11 m).' });
  mv('cCapT', { name: 'Hard to Port!', dmg: 6, kb: [15, 4], launch: 1, trail: 0 });
  ACT('cCapB', 'Hard to Port!', 'point', 'shove', 'The deck lurches: wherever they are, they’re thrown away from her (it can’t be guarded).', { su: 0.2, rc: 0.3, sfx: 'boom' });
  BUFF('cCapD', 'Raise the Colours', 'salute', { id: 'morale', t: 8 }, 'Colours up: for 8 s every hit she lands heals her 3% and gives 4 Hype.', { su: 0.24 });
  C('captain', 'cCapF', 'cCapB', 'cCapD');
  // CANNONEER: hot shot, powder, and the gun as a rocket
  mv('cCanF', { name: 'Hot Shot', type: 'proj', proj: 'hotshot', pose: 'pitchL', su: 0.2, rc: 0.34, dmg: 54, kb: [15, 5], launch: 1, range: 9, burn: [10, 3], trail: 0, sfx: 'whoosh', desc: 'A red-hot ball from the swivel gun, 9 m: a KNOCK, BURNING.' });
  mv('cCanT', { name: 'Powder Trail', dmg: 56, kb: [6, 13], launch: 1, blast: 1, trail: 0 });
  mv('cCanB', { name: 'Powder Trail', type: 'trap', pose: 'toss', su: 0.14, ac: 0.04, rc: 0.3, reach: 2.0, trap: { look: 'powder', col: 0x3a3a40, r: 1.2, life: 10, hit: 'cCanT', call: 'KABOOM!', sfx: 'boom' }, trail: 0, desc: 'A powder trail 2 m ahead for 10 s: whoever steps on it is blown sky-high.' });
  RISE('cCanD', { name: 'Recoil Jump', pose: 'shootDown', rise: 13, dmg: 58, kb: [3, 14], blast: 1, puff: 0x8a8a90, sfx: 'boom', desc: 'The swivel gun fired at the deck: he rides the blast up, invincible, and launches them.' });
  C('cannoneer', 'cCanF', 'cCanB', 'cCanD');
  // BLACKBEARD: the grenado, the fuses, no quarter
  mv('cBlaF', { name: 'Grenado', type: 'proj', proj: 'bomb', pose: 'toss', su: 0.18, rc: 0.3, dmg: 60, kb: [12, 9], launch: 1, rad: 2.0, trail: 0, sfx: 'whoosh', desc: 'A lobbed grenado: it bursts 2 m wide and launches.' });
  BUFF('cBlaB', 'Lit Fuses', 'roar', { id: 'fuses' , t: 5 }, 'Every fuse in his beard alight for 5 s: his blows set them BURNING, and anyone who hits him up close burns too.', { puff: 0x5a4a3a });
  mv('cBlaD', { name: 'No Quarter', pose: 'hack', su: 0.14, ac: 0.08, rc: 0.34, dmg: 48, reach: 1.35, rad: 1.0, kb: [15, 7], launch: 1, execute: 1, lunge: 5, sfx: 'heavy', desc: 'A cutlass blow that shows no mercy: double damage on anyone under 30% HP.' });
  C('blackbeard', 'cBlaF', 'cBlaB', 'cBlaD');
  // REDBEARD: the kalkan thrown, Greek fire, a crescent of steel
  mv('cRedF', { name: 'Kalkan Toss', type: 'proj', proj: 'kalkan', pose: 'hurl', su: 0.16, rc: 0.3, dmg: 42, kb: [12, 5], launch: 1, range: 8, trail: 0, sfx: 'whoosh', desc: 'The round shield thrown: it bounces off up to two walls, so it can come at them from anywhere.' });
  mv('cRedB', { name: 'Greek Fire', type: 'trap', pose: 'toss', su: 0.14, ac: 0.04, rc: 0.3, reach: 2.2, trap: { look: 'puddle', col: 0xe8501a, r: 1.4, life: 8, aura: { burn: [10, 1.2] } }, trail: 0, desc: 'A pool of Greek fire 2.2 m ahead for 8 s: anyone in it BURNS.' });
  mv('cRedD', { name: 'Crescent Wave', type: 'proj', proj: 'crescent', pose: 'slashA', su: 0.16, rc: 0.32, dmg: 44, kb: [13, 5], launch: 1, range: 7, trail: 0, sfx: 'slash', desc: 'A crescent of steel flies off his kilij, 7 m: it passes through them and keeps going.' });
  C('redbeard', 'cRedF', 'cRedB', 'cRedD');
  // SAILOR: a pin, a knot, the anchor
  mv('cSaiF', { name: 'Belaying Pin', type: 'proj', proj: 'belay', pose: 'hurl', su: 0.14, rc: 0.3, dmg: 44, kb: [2, 0], dizzy: 1.2, range: 8, trail: 0, sfx: 'whoosh', desc: 'A belaying pin thrown, 8 m: DIZZY.' });
  mv('cSaiB', { name: 'Lasso Knot', type: 'proj', proj: 'lasso', pose: 'hurl', su: 0.14, rc: 0.3, dmg: 14, kb: [0, 0], stun: 0.3, hobble: 4, range: 7, trail: 0, sfx: 'whoosh', desc: 'A knotted rope thrown round their legs, 7 m: HOBBLED, no jumping or dodging for 4 s.' });
  mv('cSaiD', { name: 'Anchor Drop', pose: 'overhead', su: 0.24, ac: 0.1, rc: 0.36, dmg: 66, reach: 1.4, rad: 1.2, kb: [3, 10], launch: 1, quake: 1, groundHit: 1, sfx: 'heavy', desc: 'A small anchor slammed down: pops them up, and it hits them even lying on the deck.' });
  C('sailor', 'cSaiF', 'cSaiB', 'cSaiD');
  // MARAUDER: plunder, the hull, the armour
  mv('cMarT', { name: 'Pillage', type: 'grab', dmg: 70, kb: [16, 7], launch: 1, steal: 25 });
  mv('cMarF', { name: 'Pillage', type: 'grab', pose: 'grab', su: 0.12, ac: 0.08, rc: 0.4, dmg: 0, reach: 1.25, rad: 0.9, cmd: 'f', throwMv: 'cMarT', kb: [0, 0], trail: 0, sfx: 'whoosh', desc: 'A command grab: he robs them of 25 Hype and throws them (beats guards and counters).' });
  mv('cMarB', { name: 'Hull Breaker', pose: 'skullSplit', su: 0.26, ac: 0.1, rc: 0.36, dmg: 74, reach: 1.5, rad: 1.4, kb: [3, 11], launch: 1, quake: 1, crush: 3, armor: 1, sfx: 'heavy', desc: 'An armoured overhead that splits the deck: pops them up, wrecks a guard.' });
  mv('cMarD', { name: 'Sunder', pose: 'cleave', su: 0.16, ac: 0.08, rc: 0.34, dmg: 40, reach: 1.35, rad: 1.0, kb: [3, 0], stun: 0.6, sunder: 1, lunge: 4, sfx: 'heavy', desc: 'An axe aimed at their armour: their weakest part loses 45% of its armour, or breaks.' });
  C('marauder', 'cMarF', 'cMarB', 'cMarD');
  // MUSKETEER: buck and ball, prone, the drill
  mv('cMusF', { name: 'Buck and Ball', type: 'proj', proj: 'buck', pose: 'aim', twoHand: 1, su: 0.18, rc: 0.34, dmg: 58, kb: [15, 5], launch: 1, range: 6, trail: 0, sfx: 'shot', desc: 'A musket load of buck and ball: a spray that KNOCKs, 6 m (no cartridge spent).' });
  mv('cMusB', { name: 'Prone Shot', type: 'proj', proj: 'musket', pose: 'slide', su: 0.16, rc: 0.4, dmg: 46, kb: [3, 0], crumple: 0.9, range: 11, prone: 1, trail: 0, sfx: 'shot', desc: 'She drops flat (high blows and shots go over her) and fires along the floor, 11 m: crumples.' });
  ACT('cMusD', 'Reload Drill', 'aim', 'reloadDrill', 'Make ready! The musket loaded in a heartbeat, and her next hit deals +60% and crumples.', { twoHand: 1, su: 0.2, rc: 0.2 });
  C('musketeer', 'cMusF', 'cMusB', 'cMusD');
  // GHOST PIRATE: chains, a haunting, the toll
  mv('cGhoF', { name: 'Chains of the Deep', type: 'proj', proj: 'chain', pose: 'chainThrow', su: 0.17, rc: 0.3, dmg: 40, kb: [0, 3], pull: 1, stun: 0.6, range: 6.5, trail: 0, sfx: 'whoosh', desc: 'Spectral chains, 6.5 m: they drag them in.' });
  mv('cGhoB', { name: 'Haunt', type: 'teleport', pose: 'backstab', su: 0.1, ac: 0.08, rc: 0.26, dmg: 40, kb: [9.5, 6.5], launch: 1, range: 9, inv: 1, reach: 1.1, slow: 1.5, sfx: 'slash', desc: 'He vanishes and comes back behind them (up to 9 m) with a chilling cut: SLOWED.' });
  mv('cGhoD', { name: 'Davy’s Toll', type: 'radial', pose: 'roar', su: 0.14, ac: 0.1, rc: 0.36, dmg: 0, rad: 2.4, kb: [0, 0], stun: 0.5, drain: 0.12, heal: 1, puff: 0x6affb0, trail: 0, sfx: 'boom', desc: 'Davy Jones takes his toll: anyone within 2.4 m loses 12% of their HP, and he gains it.' });
  C('ghost', 'cGhoF', 'cGhoB', 'cGhoD');

  /* ============================================================= MODERN SPORTS */
  // WRESTLER: the lariat, the powerbomb, the comeback
  mv('cWreF', { name: 'Running Lariat', type: 'dash', pose: 'lariat', su: 0.16, ac: 0.16, rc: 0.34, dmg: 66, dist: 5, rad: 1.0, kb: [15, 7], launch: 1, armor: 1, sfx: 'heavy', desc: 'An armoured running lariat, 5 m.' });
  mv('cWreT', { name: 'Powerbomb', type: 'grab', dmg: 92, kb: [1.5, -14], launch: 1, spike: 1 });
  mv('cWreB', { name: 'Powerbomb', type: 'grab', pose: 'grab', su: 0.12, ac: 0.08, rc: 0.4, dmg: 0, reach: 1.25, rad: 0.9, cmd: 'd', throwMv: 'cWreT', kb: [0, 0], trail: 0, sfx: 'whoosh', desc: 'A command grab: up and down in a Powerbomb (beats guards and counters).' });
  ACT('cWreD', 'Hulk Up', 'roar', 'hulkUp', 'He flexes and shakes it all off: heals 8%, fills his Burst, and two seconds of armour.', { su: 0.4, rc: 0.2, sfx: 'boom' });
  C('wrestler', 'cWreF', 'cWreB', 'cWreD');
  // BASEBALL: the swing, the glove, the steal
  mv('cBasF', { name: 'Line Drive', pose: 'homerun', su: 0.18, ac: 0.08, rc: 0.32, dmg: 68, reach: 1.3, rad: 1.0, kb: [22, 5], launch: 1, lunge: 4, sfx: 'heavy', desc: 'A full swing: sends them further than any KNOCK.' });
  BUFF('cBasB', 'Catch', 'palm', { id: 'catch', t: 1.2 }, 'Glove up for 1.2 s: any shot that reaches him is caught (no damage) for 20 Hype.', { su: 0.05, rc: 0.3 });
  mv('cBasD', { name: 'Stolen Base', type: 'dash', pose: 'slide', su: 0.08, ac: 0.24, rc: 0.24, dmg: 0, dist: 5.5, rad: 0.9, inv: 1, noHit: 1, act: 'safe', zone: 'low', trail: 0, sfx: 'whoosh', desc: 'An invincible head-first slide, 5.5 m, under anything and past them: +15 Hype if it beats them.' });
  C('baseball', 'cBasF', 'cBasB', 'cBasD');
  // FOOTBALL: the stiff arm, the hurdle, the celebration
  mv('cFooF', { name: 'Stiff Arm', pose: 'palm', su: 0.14, ac: 0.08, rc: 0.3, dmg: 54, reach: 1.45, rad: 1.0, kb: [17, 4], launch: 1, lunge: 6, crush: 2.5, sfx: 'heavy', desc: 'A stiff arm on the run: a KNOCK that breaks guards.' });
  mv('cFooB', { name: 'Hurdle', type: 'dash', hop: 8, pose: 'tackle', su: 0.08, ac: 0.3, rc: 0.3, dmg: 34, dist: 4, rad: 1.0, kb: [3, -9], launch: 1, spike: 1, inv: 1, sfx: 'whoosh', desc: 'An invincible hurdle over them, cleats first on the way down: spikes them for a bounce.' });
  ACT('cFooD', 'Victory Dance', 'weave', 'dance', 'He celebrates early: a long, open dance, then 35 Hype.', { su: 0.6, rc: 0.2, sfx: 'chord' });
  C('football', 'cFooF', 'cFooB', 'cFooD');
  // SOCCER: the tackle, the dive, the bicycle kick
  mv('cSocF', { name: 'Slide Tackle', type: 'dash', pose: 'slide', su: 0.1, ac: 0.18, rc: 0.32, dmg: 44, dist: 6, rad: 0.9, kb: [4, 8], launch: 1, trip: 1, zone: 'low', sfx: 'whoosh', desc: 'A slide, 6 m, under high attacks: they trip and go down hard.' });
  mv('cSocR', { name: 'Yellow Card', type: 'radial', pose: 'point', su: 0.05, ac: 0.08, rc: 0.3, dmg: 12, rad: 2.6, kb: [3, 0], dizzy: 1.0, weaken: 8, trail: 0, sfx: 'jguard' });
  mv('cSocB', { name: 'Simulation', type: 'buff', pose: 'weave', su: 0.04, ac: 0.02, rc: 0.5, buff: { id: 'counter', t: 0.6, rip: 'cSocR', call: 'YELLOW CARD' }, trail: 0, sfx: 'jguard', desc: 'Hit him in the next 0.6 s and he goes down theatrically: the ref books them (DIZZY, WEAKENED for 8 s).' });
  RISE('cSocD', { name: 'Bicycle Kick', pose: 'bicycle', rise: 9, dmg: 60, kb: [6, -10], spike: 1, launcher: 0, desc: 'An invincible bicycle kick: spikes them back down for a bounce.' });
  C('soccer', 'cSocF', 'cSocB', 'cSocD');
  // BOXER: the roll, the ropes, the uppercut
  mv('cBoxF', { name: 'Dempsey Roll', type: 'dash', pose: 'hook', su: 0.12, ac: 0.4, rc: 0.3, dmg: 13, multi: 5, dist: 4, rad: 0.95, kb: [14, 6], launch: 1, sfx: 'heavy', desc: 'Weaving in with five hooks, 4 m, the last a KNOCK.' });
  BUFF('cBoxB', 'Rope-a-Dope', 'weave', { id: 'ropes', t: 1.5 }, 'On the ropes for 1.5 s: hits do nothing to him, and each one he soaks up gives 12 Hype.', { su: 0.04, rc: 0.3 });
  RISE('cBoxD', { name: 'Gazelle Punch', pose: 'uppercut', rise: 7, dmg: 64, desc: 'An invincible leaping uppercut: launches.' });
  C('boxer', 'cBoxF', 'cBoxB', 'cBoxD');
  // FENCER: the flèche, the touch, the duck under
  mv('cFenF', { name: 'Flèche', type: 'dash', pose: 'lunge', su: 0.12, ac: 0.12, rc: 0.3, dmg: 54, dist: 6, rad: 0.8, kb: [14, 5], launch: 1, crush: 1.5, sfx: 'slash', desc: 'A running attack, 6 m in a flash: a KNOCK.' });
  mv('cFenB', { name: 'Touché', pose: 'thrust', su: 0.06, ac: 0.06, rc: 0.22, dmg: 18, reach: 1.6, rad: 0.8, kb: [2, 0], stun: 0.45, touche: 1, lunge: 5, sfx: 'slash', desc: 'A quick touch, 1.6 m: three touchés within 10 s win the bout, DIZZY for 2 s.' });
  RISE('cFenD', { name: 'Passata Sotto', pose: 'upslash', rise: 5, dmg: 56, sfx: 'slash', desc: 'She ducks under it, invincible, and thrusts up: launches.' });
  C('fencer', 'cFenF', 'cFenB', 'cFenD');
  // WEIGHTLIFTER: a plate along the floor, the barbell, the shake
  mv('cWeiF', { name: 'Plate Roll', type: 'proj', proj: 'plateRoll', pose: 'bowl', su: 0.16, rc: 0.3, dmg: 40, kb: [4, 8], launch: 1, trip: 1, range: 9, trail: 0, sfx: 'whoosh', desc: 'A weight plate rolled along the floor, 9 m: it only takes feet (jump it), and they go down hard.' });
  mv('cWeiB', { name: 'Barbell Spin', pose: 'press', su: 0.14, ac: 0.4, rc: 0.34, dmg: 15, multi: 4, around: 1, rad: 1.8, h: 1.0, kb: [14, 6], launch: 1, armor: 1, sfx: 'heavy', desc: 'An armoured spin of the barbell, all round, four hits.' });
  BUFF('cWeiD', 'Protein Shake', 'drink', { id: 'pumped', t: 8 }, 'A protein shake: +15% damage and 25% less knockback for 8 s.', { su: 0.3 });
  C('weightlifter', 'cWeiF', 'cWeiB', 'cWeiD');
  // BOWLER: the split, the pins, the spare
  mv('cBowF', { name: '7-10 Split', type: 'proj', proj: 'split', pose: 'hurl', su: 0.14, rc: 0.3, dmg: 36, kb: [2, 0], dizzy: 1.0, range: 8.5, trail: 0, sfx: 'whoosh', desc: 'Two pins at once, a hair apart: a sidestep that dodges one walks into the other. DIZZY.' });
  mv('cBowT', { name: 'Pin Setter', dmg: 32, kb: [5, 8], launch: 1, trip: 1, trail: 0 });
  mv('cBowB', { name: 'Pin Setter', type: 'trap', pose: 'bowl', su: 0.14, ac: 0.04, rc: 0.3, reach: 2.0, trap: { look: 'pins', col: 0xf6f4ee, r: 0.9, life: 12, hit: 'cBowT', call: 'STRIKE!' }, trail: 0, desc: 'A rack of pins 2 m ahead for 12 s: whoever runs into them goes down hard.' });
  ACT('cBowD', 'Spare', 'point', 'spare', 'His ball, lying on the floor, rolls back to him and flattens anything in its way.', { su: 0.1, rc: 0.24, needBall: 'bowling', dmg: 46, kb: [5, 8], launch: 1, trip: 1 });
  C('bowler', 'cBowF', 'cBowB', 'cBowD');
  // ARCHER: every one of them an arrow
  mv('cArcF', { name: 'Rain of Arrows', type: 'proj', proj: 'smite', pose: 'drawBow', su: 0.18, rc: 0.34, dmg: 56, kb: [2, -10], launch: 1, spike: 1, range: 11, smite: { rad: 1.5, delay: 0.6, col: 0xfff07a, look: 'arrow', n: 6, sfx: 'whoosh' }, trail: 0, desc: 'A volley loosed high: 0.6 s later it rains on the marked spot (up to 11 m) and spikes them.' });
  mv('cArcB', { name: 'Disengage', type: 'proj', proj: 'arrow', pose: 'drawBow', su: 0.08, rc: 0.3, dmg: 40, kb: [10, 5], launch: 1, range: 9, recoil: 7, recoilUp: 6, trail: 0, sfx: 'whoosh', desc: 'A backflip away, loosing an arrow mid-air: a KNOCK (no arrow from the quiver).' });
  mv('cArcD', { name: 'Skyward Volley', type: 'proj', proj: 'arrowsUp', pose: 'drawBow', su: 0.08, rc: 0.36, dmg: 46, kb: [2, 12], launch: 1, range: 7, inv: 1, trail: 0, sfx: 'whoosh', desc: 'Invincible: three arrows straight up at anyone jumping in.' });
  C('archer', 'cArcF', 'cArcB', 'cArcD');
  // SKATER: the board, a handplant, the McTwist
  mv('cSkaF', { name: 'Board Toss', type: 'proj', proj: 'board', pose: 'hurl', su: 0.14, rc: 0.3, dmg: 50, kb: [14, 6], launch: 1, range: 8, trail: 0, sfx: 'whoosh', desc: 'The board flung like a frisbee, 8 m: a KNOCK.' });
  mv('cSkaB', { name: 'Handplant', pose: 'kickflip', su: 0.1, ac: 0.36, rc: 0.3, dmg: 14, multi: 3, around: 1, rad: 1.6, h: 0.9, kb: [13, 6], launch: 1, prone: 1, sfx: 'whoosh', desc: 'A handplant: he goes low (high blows miss) and his legs sweep round him, three hits.' });
  RISE('cSkaD', { name: 'McTwist', pose: 'kickflip', rise: 9, multi: 3, dmg: 22, desc: 'An invincible spinning 540, three hits: launches.' });
  C('skater', 'cSkaF', 'cSkaB', 'cSkaD');
  // BASKETBALL: the crossover, the charge, the alley-oop
  mv('cBbaF', { name: 'Ankle Breaker', type: 'dash', pose: 'weave', su: 0.06, ac: 0.18, rc: 0.24, dmg: 22, dist: 4.5, rad: 0.9, kb: [2, 0], stun: 0.5, dizzy: 1.4, inv: 1, trail: 0, sfx: 'whoosh', desc: 'An invincible crossover through them: their ankles go, DIZZY.' });
  mv('cBbaR', { name: 'Offensive Foul', type: 'radial', pose: 'point', su: 0.04, ac: 0.08, rc: 0.3, dmg: 24, rad: 2.2, kb: [3, 0], crumple: 1.2, trail: 0, sfx: 'jguard' });
  mv('cBbaB', { name: 'Take the Charge', type: 'buff', pose: 'weave', su: 0.04, ac: 0.02, rc: 0.5, buff: { id: 'counter', t: 0.6, rip: 'cBbaR', call: 'OFFENSIVE FOUL' }, trail: 0, sfx: 'jguard', desc: 'Feet set: hit him in the next 0.6 s and it’s their foul (they crumple).' });
  RISE('cBbaD', { name: 'Alley-Oop', pose: 'bashUp', rise: 12, dmg: 58, desc: 'An invincible leap for the alley-oop: launches.' });
  C('basketball', 'cBbaF', 'cBbaB', 'cBbaD');

  // every figure has its three: a check while the game is made (a line added later without them is easy to miss)
  for (const id of KB.LINE_ORDER) if (!P[id].head.cmd) console.warn('[commands] no command specials for ' + id);
})();
