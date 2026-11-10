/* ============================================================================
   edo.js -- the series, re-shelved, and EDO JAPAN.
   The figures come in four series now (KB.THEMES): HISTORICAL FANTASY, EDO
   JAPAN, KNIGHTS OF THE REALM and MODERN SPORTS. The Samurai and the Shinobi
   (who was the Ninja) move to EDO JAPAN; the Knight, the Paladin and the
   Dragoon to KNIGHTS OF THE REALM (realm.js). The line ids stay what they
   were, so every saved figure and part still works.

     RONIN     a masterless swordsman: every string starts with a cut straight out
               of the scabbard, a straw hat that flies, sake for courage
     KUNOICHI  an iron fan, poisoned hairpins, and Kawarimi: hit her and you hit a log
     SHOGUN    lacquered armour, a cavalry tachi, and a war fan that calls the musket
               line; his KNOCKs bring walls down
     DAIMYO    the castle lord's naginata: the widest sweeps, a levy on their Hype
   ========================================================================== */
(function () {
  'use strict';
  const { LINES, LINE_ORDER, PARTS: P, PASSIVE, mv, PREFIX, OFF, FIN, THEMES } = KB;

  /* ---------------------------------------------------------- the series */
  THEMES.splice(1, 0, { id: 'edo', name: 'EDO JAPAN', short: 'EDO' }, { id: 'realm', name: 'KNIGHTS OF THE REALM', short: 'REALM' });
  LINES.samurai.theme = 'edo'; LINES.ninja.theme = 'edo'; LINES.ninja.name = 'SHINOBI';
  for (const l of ['knight', 'paladin', 'dragoon']) LINES[l].theme = 'realm';

  const add = (id, o) => { LINES[id] = Object.assign({ theme: 'edo' }, o); LINE_ORDER.push(id); };
  add('ronin', { name: 'RONIN', css: '#c8a46a', figure: 'Gennosuke of the Straw Hat', blurb: 'A masterless swordsman. Every string starts with a cut straight out of the scabbard; his hat flies, and the sake gives him courage.',
    pal: { main: 0x5e4a3a, second: 0x2a2a34, accent: 0xc8a050, dark: 0x16141a, metal: 0xc8ccd4, skin: 0xe0b088, cloth: 0x3a4a5a, glow: 0xff5a3a } });
  add('kunoichi', { name: 'KUNOICHI', css: '#e0508a', figure: 'Ayame of the Hidden Iris', blurb: 'An iron fan, hairpins dipped in poison, and a body that isn\'t there when you hit it.',
    pal: { main: 0x7a1f4a, second: 0x1a1a24, accent: 0xe8b84a, dark: 0x120e16, metal: 0xd8dde6, skin: 0xf0cfb0, cloth: 0x3a2a4a, glow: 0xff6ab0 } });
  add('shogun', { name: 'SHOGUN', css: '#d8a830', figure: 'Lord Ryūgen, the Iron Shogun', blurb: 'Lacquered armour, a cavalry tachi, and a war fan that calls the musket line. Slow, heavy and in command; walls fall to him.',
    pal: { main: 0x1c1c24, second: 0x8a1c1c, accent: 0xd8a830, dark: 0x0c0c10, metal: 0xd4dbe3, skin: 0xe8c0a0, cloth: 0x6a1414, glow: 0xffcc44 } });
  add('daimyo', { name: 'DAIMYO', css: '#6a8ae8', figure: 'Lady Kurogane Sayo, the Castle Lord', blurb: 'Lord of her own castle, with the naginata she was raised on: the widest sweeps on the floor, and a levy on their Hype.',
    pal: { main: 0x1f3f7a, second: 0xe8e0d0, accent: 0xd8a830, dark: 0x10141e, metal: 0xd8dde6, skin: 0xf0cfb0, cloth: 0x7a2a3a, glow: 0x66b8ff } });

  /* ------------------------------------------------------------- the moves
     (the poses and the figures are in edo_look.js; the hat, the hairpins and the volley in match.js) */
  // RONIN · Worn Katana: draw-cuts from the scabbard; pause and his straw hat flies
  mv('roA', { name: 'Nukitsuke', pose: 'iai', su: 0.06, dmg: 26, reach: 1.3, lunge: 4, nx: { l: 'roB' } });
  mv('roB', { name: 'Kesa-giri', pose: 'slashB', su: 0.07, dmg: 26, reach: 1.3, stun: 0.5, lunge: 3, nx: { l: 'roC', p: 'roP' } });
  mv('roC', { name: 'Gyaku-giri', pose: 'slashA', su: 0.08, dmg: 30, reach: 1.35, kb: [3.5, 0], stun: 0.6, lunge: 3, nx: { l: 'roD' } });
  mv('roD', { name: 'Chiburi', pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.25, dmg: 44, reach: 1.3, kb: [2, 13], launch: 1, launcher: 1, finisher: 1 });
  mv('roP', { name: 'Kasa Toss', type: 'proj', proj: 'kasa', pose: 'toss', su: 0.09, rc: 0.24, dmg: 34, kb: [9, 5], launch: 1, range: 7.5, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('roAirA', { name: 'Air Draw', pose: 'iai', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.25, nx: { l: 'roAirB' } });
  mv('roAirB', { name: 'Falling Cut', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 46, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.25, h: 0.5, rad: 0.95, sfx: 'heavy' });
  mv('sayaAte', { name: 'Saya-ate', pose: 'bash', su: 0.19, ac: 0.08, rc: 0.3, dmg: 80, reach: 1.15, rad: 0.95, kb: [18, 5], launch: 1, lunge: 6, charge: 1, trail: 0, sfx: 'heavy' });
  mv('sayaUpper', { name: 'Saya Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('sayaDrop', { name: 'Saya Drop', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 54, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('sakeSwig', { name: 'Sake Swig', type: 'buff', pose: 'drink', su: 0.22, rc: 0.24, buff: { id: 'sake', t: 5, heal: 0.05 }, trail: 0, sfx: 'jguard' });
  mv('passingCut', { name: 'Passing Cut', pose: 'iai', su: 0.07, ac: 0.1, rc: 0.26, dmg: 38, kb: [3, 9], launch: 1, lunge: 10, zone: 'low', h: 0.4 });
  mv('lastDraw', { name: 'Last Draw', type: 'super', pose: 'iai', su: 0.14, catchType: 'dash', dist: 7, rad: 1.25, seq: 'lastdraw', dmg: 300, kb: [22, 7], zone: 'mid' });

  // KUNOICHI · Tessen: iron-fan cuts and a petal flurry; pause to flick a poisoned hairpin
  mv('kuA', { name: 'Fan Strike', pose: 'slashA', su: 0.05, ac: 0.05, rc: 0.1, dmg: 20, reach: 1.1, kb: [2, 0], stun: 0.28, lunge: 4, nx: { l: 'kuB' } });
  mv('kuB', { name: 'Fan Sweep', pose: 'slashB', su: 0.05, ac: 0.05, rc: 0.11, dmg: 22, reach: 1.1, kb: [2, 0], stun: 0.45, lunge: 4, nx: { l: 'kuC', p: 'kuP' } });
  mv('kuC', { name: 'Petal Flurry', pose: 'flurry', su: 0.06, ac: 0.24, rc: 0.14, dmg: 10, multi: 3, reach: 1.1, kb: [2.5, 0], stun: 0.45, nx: { l: 'kuD' } });
  mv('kuD', { name: 'Gale Fan', pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.24, dmg: 40, reach: 1.15, kb: [2, 12.5], launch: 1, launcher: 1, finisher: 1 });
  mv('kuP', { name: 'Needle Kiss', type: 'proj', proj: 'pin', pose: 'kunaiToss', su: 0.08, rc: 0.22, dmg: 26, kb: [2, 0], stun: 0.5, range: 6.5, poison: [12, 3], finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('kuAirA', { name: 'Air Fan', pose: 'slashA', su: 0.05, dmg: 20, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'kuAirB' } });
  mv('kuAirB', { name: 'Fan Spin', pose: 'spin', su: 0.06, ac: 0.18, rc: 0.18, dmg: 12, multi: 2, around: 1, rad: 1.25, kb: [3, 4.5], air: 1, nx: { l: 'kuAirC' } });
  mv('kuAirC', { name: 'Iris Drop', pose: 'overhead', su: 0.08, ac: 0.3, rc: 0.24, dmg: 38, kb: [2, -12], launch: 1, spike: 1, dive: 1, air: 1, h: 0.5, sfx: 'heavy' });
  mv('hairpins', { name: 'Kanzashi Volley', type: 'proj', proj: 'pins', pose: 'kunaiToss', su: 0.18, rc: 0.3, dmg: 66, kb: [15, 5], launch: 1, range: 9, charge: 1, poison: [10, 3], trail: 0, sfx: 'whoosh' });
  mv('risingFan', { name: 'Rising Fan', pose: 'uppercutL', su: 0.09, ac: 0.08, rc: 0.27, dmg: 36, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'whoosh' });
  mv('needleRain', { name: 'Needle Rain', type: 'proj', proj: 'pinsDown', pose: 'kunaiToss', su: 0.12, rc: 0.26, dmg: 48, kb: [2, -13], launch: 1, spike: 1, air: 1, range: 6.5, poison: [8, 2], trail: 0, sfx: 'whoosh' });
  mv('kawarimi', { name: 'Kawarimi', type: 'buff', pose: 'weave', su: 0.05, rc: 0.14, buff: { id: 'kawarimi', t: 1.4 }, trail: 0, sfx: 'dodge' });
  mv('silkSlide', { name: 'Silk Slide', pose: 'slide', su: 0.07, ac: 0.14, rc: 0.28, dmg: 34, kb: [3, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('thousandPetals', { name: 'Thousand Petals', type: 'super', pose: 'spin', su: 0.1, catchType: 'dash', dist: 7, rad: 1.25, seq: 'petals', dmg: 290, kb: [16, 11], zone: 'mid' });

  // SHOGUN · Tachi: heavy cavalry cuts with armour in their startup; pause for a rebuke with the war fan
  mv('shA', { name: 'Tachi Cut', pose: 'hack', su: 0.1, ac: 0.08, rc: 0.2, dmg: 38, reach: 1.35, kb: [3, 0], lunge: 3, sfx: 'heavy', nx: { l: 'shB' } });
  mv('shB', { name: 'Return Cut', pose: 'backswing', su: 0.11, ac: 0.08, rc: 0.2, dmg: 42, reach: 1.35, kb: [3, 0], stun: 0.6, lunge: 3, armorSU: 1, sfx: 'heavy', nx: { l: 'shC', p: 'shP' } });
  mv('shC', { name: "Shogun's Verdict", pose: 'twoHandDiag', su: 0.14, ac: 0.1, rc: 0.3, dmg: 58, reach: 1.4, rad: 1.0, kb: [16, 5.5], launch: 1, lunge: 4, armorSU: 1, finisher: 1, sfx: 'heavy' });
  mv('shP', { name: 'Gunbai Rebuke', pose: 'overhead', su: 0.12, ac: 0.08, rc: 0.3, dmg: 50, reach: 1.2, crumple: 1.0, lunge: 3, finisher: 1, zone: 'high', trail: 0, sfx: 'heavy' });
  mv('shAirA', { name: 'Air Tachi', pose: 'hack', su: 0.09, dmg: 36, kb: [3, 4], air: 1, reach: 1.3, h: 0.9, sfx: 'heavy', nx: { l: 'shAirB' } });
  mv('shAirB', { name: 'Helm-Splitter', pose: 'skullSplit', su: 0.11, ac: 0.3, rc: 0.25, dmg: 50, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, rad: 0.95, sfx: 'heavy' });
  mv('gunbaiBash', { name: 'Gunbai Bash', pose: 'bash', su: 0.18, ac: 0.08, rc: 0.3, dmg: 82, reach: 1.15, rad: 0.95, kb: [19, 4.5], launch: 1, lunge: 6, armor: 1, oneArmor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('gunbaiLift', { name: 'Gunbai Lift', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('gunbaiDrop', { name: 'Iron Fan Drop', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 56, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('teppoVolley', { name: 'Teppō Volley', type: 'proj', proj: 'volley', pose: 'point', su: 0.22, rc: 0.3, dmg: 62, kb: [14, 5], launch: 1, range: 11, trail: 0, sfx: 'whoosh' });
  mv('cavalryCharge', { name: 'Cavalry Charge', pose: 'tackle', su: 0.12, ac: 0.12, rc: 0.3, dmg: 50, kb: [12, 5], launch: 1, lunge: 8, armor: 1, oneArmor: 1, trail: 0, sfx: 'heavy' });
  mv('threeRanks', { name: 'Three Ranks', type: 'super', pose: 'point', su: 0.14, catchType: 'melee', lunge: 6, reach: 1.2, rad: 1.1, close: 5, seq: 'ranks', dmg: 300, kb: [20, 7], zone: 'mid' });

  // DAIMYO · Naginata: the widest sweeps, a wheel all around her; pause to reap the shins
  mv('daA', { name: 'Naginata Sweep', pose: 'slashA', twoHand: 1, su: 0.08, dmg: 26, reach: 1.6, rad: 0.95, lunge: 3, nx: { l: 'daB' } });
  mv('daB', { name: 'Return Sweep', pose: 'slashB', twoHand: 1, su: 0.08, dmg: 28, reach: 1.6, rad: 0.95, stun: 0.5, lunge: 3, nx: { l: 'daC', p: 'daP' } });
  mv('daC', { name: 'Wheel', pose: 'spin', twoHand: 1, su: 0.08, ac: 0.18, rc: 0.18, dmg: 17, multi: 2, around: 1, rad: 1.7, kb: [3, 0], stun: 0.45, nx: { l: 'daD' } });
  mv('daD', { name: 'Rising Crescent', pose: 'upslash', twoHand: 1, su: 0.1, ac: 0.08, rc: 0.25, dmg: 44, reach: 1.55, kb: [2, 13], launch: 1, launcher: 1, finisher: 1 });
  mv('daP', { name: 'Sune-gari', pose: 'sweep', twoHand: 1, su: 0.09, ac: 0.1, rc: 0.28, dmg: 34, reach: 1.6, kb: [3, 7.5], launch: 1, zone: 'low', h: 0.35, finisher: 1 });
  mv('daAirA', { name: 'Air Sweep', pose: 'slashA', su: 0.07, dmg: 26, kb: [3, 4.5], air: 1, h: 1, reach: 1.5, nx: { l: 'daAirB' } });
  mv('daAirB', { name: 'Crescent Drop', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 46, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.4, h: 0.5, rad: 0.95, sfx: 'heavy' });
  mv('longThrust', { name: 'Long Thrust', pose: 'thrust', twoHand: 1, su: 0.19, ac: 0.08, rc: 0.3, dmg: 78, reach: 2.0, rad: 0.85, kb: [17, 5], launch: 1, lunge: 5, charge: 1, sfx: 'heavy' });
  mv('haneage', { name: 'Hane-age', pose: 'twoHandUp', twoHand: 1, su: 0.1, ac: 0.08, rc: 0.28, dmg: 40, reach: 1.5, kb: [1.4, 13], launch: 1, launcher: 1 });
  mv('fallingMoon', { name: 'Falling Moon', pose: 'twoHandOver', twoHand: 1, su: 0.12, ac: 0.1, rc: 0.25, dmg: 56, kb: [2.5, -14], launch: 1, spike: 1, air: 1, reach: 1.4, zone: 'high', h: 0.6, sfx: 'heavy' });
  mv('tribute', { name: 'Tribute', pose: 'slashA', su: 0.1, ac: 0.1, rc: 0.28, dmg: 40, reach: 1.7, rad: 1.0, kb: [3, 0], stun: 0.6, steal: 25, lunge: 4 });
  mv('retainersRush', { name: "Retainers' Rush", pose: 'sweep', twoHand: 1, su: 0.08, ac: 0.12, rc: 0.3, dmg: 40, reach: 1.4, kb: [4, 9], launch: 1, lunge: 9, zone: 'low', h: 0.4 });
  mv('hundredBanners', { name: 'Hundred Banners', type: 'super', pose: 'spin', su: 0.12, catchType: 'melee', lunge: 6, reach: 1.5, rad: 1.2, close: 5, seq: 'banners', dmg: 300, kb: [6, 15], zone: 'mid' });

  /* -------------------------------------------------------------- the parts */
  P.ronin = {
    head: { name: 'Straw Kasa', armor: 100, weight: 0.95, special: 'sakeSwig', uses: 2, hype: 1.05, desc: 'SPECIAL: Sake Swig. A long pull from the gourd: heal 5% HP, and for 5 s every cut deals +15%.' },
    core: { name: 'Patched Kimono', hp: 980, def: 0.05, weight: 0.98, guard: 0, desc: 'Faded, mended, honest. Even all round.' },
    armR: { name: 'Worn Katana', armor: 130, weight: 1.0, light: 'roA', air: 'roAirA', sig: 'battojutsu', sigName: 'Battōjutsu', sigDesc: 'The first cut of every string comes straight out of the scabbard: +30% damage.', trail: 0xffffff, desc: 'Nukitsuke (the draw) › Kesa-giri › Gyaku-giri › Chiburi (launches up). Pause after Kesa-giri: Kasa Toss, his straw hat flies at them. Air: Draw › Falling Cut. SIGNATURE: the draw-cut.' },
    armL: { name: 'Saya', armor: 125, weight: 0.95, heavy: 'sayaAte', launch: 'sayaUpper', airHeavy: 'sayaDrop', guard: 95, chip: 1, trail: 0xc8a050, desc: 'The lacquered scabbard, in the off hand. HEAVY: Saya-ate, a scabbard ram that KNOCKs them. Guard: medium.' },
    legs: { name: 'Waraji & Kyahan', armor: 165, weight: 0.98, speed: 6.4, jump: 11.5, airJumps: 1, dashAtk: 'passingCut', perk: null, desc: 'A wanderer\'s sandals and leggings. DASH ATTACK: Passing Cut, low, and it pops them up.' },
    card: { name: 'Masterless', super: 'lastDraw', passive: 'nothing', desc: 'LEGEND ART: Last Draw, one cut, a turn of the back, and the scabbard clicks shut. PASSIVE (Nothing to Lose): +18% damage while he has less HP than them.' },
  };
  P.kunoichi = {
    head: { name: 'Kanzashi & Veil', armor: 95, weight: 0.85, special: 'kawarimi', uses: 3, hype: 1.1, desc: 'SPECIAL: Kawarimi. For 1.4 s the next attack that would hit her hits a log instead: she\'s already behind them, and they\'re left wide open.' },
    core: { name: 'Silk Kimono', hp: 890, def: 0.02, weight: 0.82, guard: -10, desc: 'Silk over chain mesh. Light: quick, but you fly far.' },
    armR: { name: 'Tessen', armor: 110, weight: 0.82, light: 'kuA', air: 'kuAirA', sig: 'toxin', sigName: 'Lingering Venom', sigDesc: 'Lights and air Lights deal +20% to anyone POISONED.', trail: 0xff9ad0, desc: 'Fan Strike › Fan Sweep › Petal Flurry › Gale Fan (launches up). Pause after the Sweep: Needle Kiss, a poisoned hairpin. Air: Fan › Fan Spin › Iris Drop. SIGNATURE: more against the poisoned.' },
    armL: { name: 'Kanzashi', armor: 105, weight: 0.85, heavy: 'hairpins', launch: 'risingFan', airHeavy: 'needleRain', guard: 70, chip: 1.15, trail: 0xff9ad0, desc: 'Hairpins, one hand\'s worth. HEAVY: Kanzashi Volley, three poisoned pins that KNOCK them from 9 m. POISON: damage every half second for 3 s. Guard: weak.' },
    legs: { name: 'Tabi & Kyahan', armor: 145, weight: 0.82, speed: 7.1, jump: 12, airJumps: 2, dashAtk: 'silkSlide', perk: 'dancer', desc: 'A triple jump, and dodges cool down twice as fast. DASH ATTACK: Silk Slide.' },
    card: { name: 'Thousand Petals', super: 'thousandPetals', passive: 'unseen', desc: 'LEGEND ART: Thousand Petals, a storm of iris petals and hairpins from every side. PASSIVE (Unseen): +20% damage on hits from behind them.' },
  };
  P.shogun = {
    head: { name: 'Kuwagata Kabuto', armor: 165, weight: 1.15, special: 'teppoVolley', uses: 2, usesMax: 1, noRegen: 1, hype: 0.95, desc: 'SPECIAL: Teppō Volley. A wave of the war fan and the musket line behind him fires: a KNOCK from 11 m. ONCE A ROUND: one Special, plain or command, and it never comes back.' },
    core: { name: "Shogun's Ō-yoroi", hp: 1160, def: 0.11, weight: 1.32, guard: 30, desc: 'Black lacquer, crimson lacing, gold. The heaviest armour in Edo.' },
    armR: { name: 'Tachi', armor: 155, weight: 1.15, light: 'shA', air: 'shAirA', sig: 'warlord', sigName: 'Warlord', sigDesc: 'A siege in one figure: the walls take 40% more stress from anyone he sends into them, so they crack and break sooner. On an open stage his KNOCKs fly 10% further.', trail: 0xffe0a0, desc: 'Tachi Cut › Return Cut › Shogun\'s Verdict (a KNOCK); the last two have armour in their startup. Pause after the Return Cut: Gunbai Rebuke crumples them. Air: Tachi › Helm-Splitter. SIGNATURE: walls fall.' },
    armL: { name: 'Gunbai', armor: 170, weight: 1.2, heavy: 'gunbaiBash', launch: 'gunbaiLift', airHeavy: 'gunbaiDrop', guard: 150, chip: 0.6, trail: 0xffe0a0, desc: 'The iron war fan of command. HEAVY: Gunbai Bash, armoured, one of the biggest shoves. Guard: strong.' },
    legs: { name: 'Suneate & Kutsu', armor: 215, weight: 1.3, speed: 5.3, jump: 9.8, airJumps: 1, dashAtk: 'cavalryCharge', perk: 'anchor', desc: 'Planted: 15% less knockback taken. DASH ATTACK: Cavalry Charge (armoured).' },
    card: { name: 'Shogunate', super: 'threeRanks', passive: 'ironrule', desc: 'LEGEND ART: Three Ranks, the musket line fires rank after rank, and the tachi. PASSIVE (Iron Rule): Lights and air Lights hit him 15% softer.' },
  };
  P.daimyo = {
    head: { name: 'Maedate Kabuto', armor: 130, weight: 1.05, special: 'tribute', uses: 3, hype: 1.0, desc: 'SPECIAL: Tribute. A wide sweep that levies 25 Hype off them and adds it to hers.' },
    core: { name: 'Odoshi Armour', hp: 1050, def: 0.07, weight: 1.1, guard: 10, desc: 'Blue-laced lamellar, her clan\'s colours. Sturdy.' },
    armR: { name: 'Naginata', armor: 140, weight: 1.1, light: 'daA', air: 'daAirA', sig: 'reach', sigName: 'Long Reach', sigDesc: 'The blade at the end of the pole: Lights that hit from 1.6 m or further deal +15%.', trail: 0xd8e8ff, desc: 'Sweep › Return Sweep › Wheel (all around her) › Rising Crescent (launches up). Pause after the Return Sweep: Sune-gari reaps their shins. Air: Sweep › Crescent Drop. SIGNATURE: damage at the tip.' },
    armL: { name: 'Kote', armor: 125, weight: 0.95, heavy: 'longThrust', launch: 'haneage', airHeavy: 'fallingMoon', guard: 95, chip: 1, trail: 0xd8e8ff, desc: 'An armoured sleeve, hand free for the two-handed grip. HEAVY: Long Thrust, a KNOCK from 2 m away. Guard: medium.' },
    legs: { name: 'Haidate & Waraji', armor: 175, weight: 1.05, speed: 6.0, jump: 11, airJumps: 1, dashAtk: 'retainersRush', perk: null, desc: 'Armoured thighs, straw sandals. DASH ATTACK: Retainers\' Rush.' },
    card: { name: 'Castle Lord', super: 'hundredBanners', passive: 'domain', desc: 'LEGEND ART: Hundred Banners, her clan\'s banners rise and the naginata wheels. PASSIVE (My Domain): +12% damage while she stands within 4 m of the middle of the floor.' },
  };

  Object.assign(PASSIVE, {
    nothing: 'Nothing to Lose: +18% damage while behind on HP', unseen: 'Unseen: +20% damage from behind',
    ironrule: 'Iron Rule: Lights hit him 15% softer', domain: 'My Domain: +12% damage in the middle of the floor',
  });

  /* ----------------------------------------- mixed strings with the new lines */
  Object.assign(PREFIX, { ronin: 'Ronin', kunoichi: 'Fan', shogun: 'Tachi', daimyo: 'Naginata' });
  Object.assign(OFF, {
    ronin: { name: 'Saya Jab', pose: 'jabL', stun: 0.48 },
    kunoichi: { name: 'Hairpin Jab', pose: 'jabL', stun: 0.45, poison: [8, 2] },
    shogun: { name: 'Gunbai Tap', pose: 'bash', armorSU: 1, stun: 0.48 },
    daimyo: { name: 'Pole Butt', pose: 'jabL', stun: 0.5, reach: 1.3 },
  });
  Object.assign(FIN, {
    ronin: { n: 'Last Light', a: 'Falling Leaf', g: { launch: 1, kb: [2, 13] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    kunoichi: { n: 'Iris', a: 'Petalfall', g: { launch: 1, kb: [2, 12.5] }, air: { launch: 1, spike: 1, kb: [2, -12] } },
    shogun: { n: 'Verdict', a: 'Decree', g: { launch: 1, armorSU: 1, kb: [16, 5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    daimyo: { n: 'Crescent', a: 'Castlefall', g: { launch: 1, kb: [2, 13] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
  });
})();
