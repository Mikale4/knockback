/* ============================================================================
   realm.js -- KNIGHTS OF THE REALM: the Knight, the Paladin and the Dragoon
   (moved here by edo.js), and three more of the order.

     TEMPLAR   a greatsword in both hands: wide cuts, the half-sword up close, the
               Murder-Stroke with the hilt; a vow that hardens him
     CRUSADER  a morning-star flail that swings over any shield (his string can't be
               Just Guarded), a heater shield, and a war cry that blows them back
     LANCER    a knight on horseback with a tilting lance: the fastest run, the longest
               charges, and every metre run before a hit makes it hurt more
   ========================================================================== */
(function () {
  'use strict';
  const { LINES, LINE_ORDER, PARTS: P, PASSIVE, mv, PREFIX, OFF, FIN } = KB;
  const add = (id, o) => { LINES[id] = Object.assign({ theme: 'realm' }, o); LINE_ORDER.push(id); };
  add('templar', { name: 'TEMPLAR', css: '#f0ece0', figure: 'Brother Aldric of the Temple', blurb: 'A greatsword in both hands and a vow he keeps. Wide cuts, the half-sword up close, and a Murder-Stroke with the hilt.',
    pal: { main: 0xf0ece0, second: 0xb81c1c, accent: 0xb8b8c0, dark: 0x2a2a30, metal: 0xd8dde6, skin: 0xe8c0a0, cloth: 0x1a1a1e, glow: 0xff4a3a } });
  add('crusader', { name: 'CRUSADER', css: '#d8603a', figure: 'Sir Godric Ashborne', blurb: 'A morning-star flail that swings over any shield, a heater shield of his own, and the war cry that starts it all.',
    pal: { main: 0x9a9aa2, second: 0xf0ece0, accent: 0xc81c1c, dark: 0x2a2a30, metal: 0xc8ccd4, skin: 0xe0b090, cloth: 0x7a1a1a, glow: 0xff7a3a } });
  add('lancer', { name: 'LANCER', css: '#4ab86a', figure: 'Dame Rosalind Vane, and Bramble', blurb: 'A tilting lance, a shield on the arm and a warhorse underneath: the fastest run, the longest charges, and a joust to finish.',
    pal: { main: 0x2a7a4a, second: 0xf0d860, accent: 0xc8ccd4, dark: 0x1a1a1e, metal: 0xd8dde6, skin: 0xf0c8a0, cloth: 0x7a4e2e, glow: 0x8aff9a } });

  /* ------------------------------------------------------------- the moves (poses and figures in realm_look.js) */
  // TEMPLAR · Greatsword: the strikes of the long sword; pause for the Mordhau, the hilt as a hammer
  mv('teA', { name: 'Oberhau', pose: 'hack', twoHand: 1, su: 0.09, ac: 0.08, rc: 0.2, dmg: 34, reach: 1.45, kb: [3, 0], lunge: 3, sfx: 'heavy', nx: { l: 'teB' } });
  mv('teB', { name: 'Zwerchhau', pose: 'slashB', twoHand: 1, su: 0.09, dmg: 36, reach: 1.45, rad: 0.95, stun: 0.55, lunge: 3, sfx: 'heavy', nx: { l: 'teC', p: 'teP' } });
  mv('teC', { name: 'Half-Sword Thrust', pose: 'thrust', twoHand: 1, su: 0.08, dmg: 32, reach: 1.5, kb: [3.5, 0], stun: 0.7, lunge: 5, nx: { l: 'teD' } });
  mv('teD', { name: 'Zornhau', pose: 'twoHandDiag', twoHand: 1, su: 0.12, ac: 0.08, rc: 0.28, dmg: 54, reach: 1.45, rad: 1.0, kb: [16, 6], launch: 1, lunge: 4, finisher: 1, sfx: 'heavy' });
  mv('teP', { name: 'Mordhau', pose: 'twoHandOver', twoHand: 1, su: 0.12, ac: 0.08, rc: 0.3, dmg: 52, reach: 1.2, crumple: 1.0, lunge: 3, finisher: 1, zone: 'high', sfx: 'heavy' });
  mv('teAirA', { name: 'Air Cleave', pose: 'hack', su: 0.08, dmg: 32, kb: [3, 4], air: 1, reach: 1.35, h: 0.9, sfx: 'heavy', nx: { l: 'teAirB' } });
  mv('teAirB', { name: 'Cross Drop', pose: 'skullSplit', su: 0.1, ac: 0.3, rc: 0.25, dmg: 48, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, rad: 0.95, sfx: 'heavy' });
  mv('wrathCut', { name: 'Wrath of the Temple', pose: 'twoHandDiag', twoHand: 1, su: 0.2, ac: 0.08, rc: 0.3, dmg: 86, reach: 1.45, rad: 1.0, kb: [17, 5.5], launch: 1, lunge: 4, charge: 1, sfx: 'heavy' });
  mv('pommelRise', { name: 'Pommel Rise', pose: 'twoHandUp', twoHand: 1, su: 0.1, ac: 0.08, rc: 0.28, dmg: 40, kb: [1.4, 13], launch: 1, launcher: 1 });
  mv('crossguardDrop', { name: 'Crossguard Drop', pose: 'twoHandOver', twoHand: 1, su: 0.12, ac: 0.1, rc: 0.25, dmg: 58, kb: [2.5, -14], launch: 1, spike: 1, air: 1, zone: 'high', h: 0.6, sfx: 'heavy' });
  mv('templarVow', { name: 'Vow of the Temple', type: 'buff', pose: 'salute', su: 0.2, rc: 0.24, buff: { id: 'vow', t: 5 }, trail: 0, sfx: 'jguard' });
  mv('pilgrimLunge', { name: "Pilgrim's Lunge", pose: 'thrust', twoHand: 1, su: 0.08, ac: 0.12, rc: 0.3, dmg: 42, reach: 1.5, kb: [11, 6], launch: 1, lunge: 9 });
  mv('beauseant', { name: 'Beauséant', type: 'super', pose: 'twoHandUp', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.3, rad: 1.15, close: 5, seq: 'beauseant', dmg: 300, kb: [4, -14], zone: 'mid' });

  // CRUSADER · Morning Star: flail swings that wrap over a guard, a whirl, and the star brought down; pause to hook with the shield
  mv('crA', { name: 'Flail Swing', pose: 'slashA', su: 0.09, ac: 0.08, rc: 0.2, dmg: 30, reach: 1.4, rad: 0.95, kb: [3, 0], lunge: 3, sfx: 'heavy', nx: { l: 'crB' } });
  mv('crB', { name: 'Backhand Flail', pose: 'slashB', su: 0.09, dmg: 32, reach: 1.4, rad: 0.95, stun: 0.55, lunge: 3, sfx: 'heavy', nx: { l: 'crC', p: 'crP' } });
  mv('crC', { name: 'Whirling Chain', pose: 'spin', su: 0.09, ac: 0.2, rc: 0.2, dmg: 16, multi: 3, around: 1, rad: 1.6, kb: [3, 0], stun: 0.45, sfx: 'heavy', nx: { l: 'crD' } });
  mv('crD', { name: 'Morning Star', pose: 'overhead', su: 0.12, ac: 0.1, rc: 0.3, dmg: 56, reach: 1.35, rad: 1.0, kb: [2, -11], launch: 1, spike: 1, lunge: 3, finisher: 1, zone: 'high', sfx: 'heavy' });
  mv('crP', { name: 'Shield Hook', pose: 'bashUp', su: 0.1, ac: 0.08, rc: 0.3, dmg: 34, reach: 1.05, kb: [2, 12.5], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('crAirA', { name: 'Air Flail', pose: 'slashA', su: 0.08, dmg: 30, kb: [3, 4], air: 1, reach: 1.35, h: 0.9, sfx: 'heavy', nx: { l: 'crAirB' } });
  mv('crAirB', { name: 'Falling Star', pose: 'skullSplit', su: 0.1, ac: 0.3, rc: 0.25, dmg: 48, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, rad: 1.0, sfx: 'heavy' });
  mv('heaterCharge', { name: 'Heater Charge', pose: 'bash', su: 0.17, ac: 0.08, rc: 0.3, dmg: 78, reach: 1.1, rad: 0.95, kb: [18.5, 4.5], launch: 1, lunge: 7, armor: 1, oneArmor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('heaterLift', { name: 'Shield Lift', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('heaterFall', { name: 'Shield Fall', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 54, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('deusVult', { name: 'Deus Vult!', type: 'radial', pose: 'salute', su: 0.16, ac: 0.08, rc: 0.3, dmg: 30, rad: 2.6, kb: [11, 7], launch: 1, buff: { id: 'zeal', t: 5 }, trail: 0, sfx: 'heavy' });
  mv('holyCharge', { name: 'Holy Charge', pose: 'tackle', su: 0.12, ac: 0.12, rc: 0.3, dmg: 46, kb: [12, 5], launch: 1, lunge: 8, armor: 1, oneArmor: 1, trail: 0, sfx: 'heavy' });
  mv('siegeOfFaith', { name: 'Siege of Faith', type: 'super', pose: 'overhead', su: 0.12, catchType: 'dash', dist: 7.5, rad: 1.25, seq: 'flailstorm', dmg: 295, kb: [18, 8], zone: 'mid' });

  // LANCER · Tilting Lance: from the saddle, the longest Lights in the realm; pause and the horse tramples them
  mv('lnA', { name: 'Lance Jab', pose: 'thrust', su: 0.07, dmg: 26, reach: 1.8, rad: 0.75, kb: [2.5, 0], lunge: 4, nx: { l: 'lnB' } });
  mv('lnB', { name: 'Lance Sweep', pose: 'slashB', su: 0.08, dmg: 28, reach: 1.7, rad: 0.9, stun: 0.5, lunge: 3, nx: { l: 'lnC', p: 'lnP' } });
  mv('lnC', { name: 'Hoof Strike', pose: 'bash', su: 0.09, ac: 0.08, rc: 0.2, dmg: 30, reach: 1.2, kb: [3.5, 0], stun: 0.75, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'lnD' } });
  mv('lnD', { name: 'Unhorse', pose: 'upslash', su: 0.1, ac: 0.08, rc: 0.25, dmg: 44, reach: 1.8, kb: [2, 13], launch: 1, launcher: 1, finisher: 1 });
  mv('lnP', { name: 'Trample', type: 'dash', pose: 'tackle', su: 0.1, ac: 0.14, rc: 0.28, dmg: 46, dist: 4.4, rad: 0.95, kb: [3, 9], launch: 1, zone: 'low', finisher: 1, sfx: 'heavy' });
  mv('lnAirA', { name: 'Lance Up', pose: 'thrust', su: 0.07, dmg: 26, reach: 1.7, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'lnAirB' } });
  mv('lnAirB', { name: 'Lance Fall', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 46, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.6, h: 0.5, rad: 0.95, sfx: 'heavy' });
  mv('couchedLance', { name: 'Couched Lance', type: 'dash', pose: 'lance', su: 0.18, ac: 0.14, rc: 0.3, dmg: 84, dist: 5.5, rad: 0.95, kb: [20, 5], launch: 1, charge: 1, sfx: 'heavy' });
  mv('bracingLift', { name: 'Bracing Lift', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('lanceDrop', { name: 'Lance Drop', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 54, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('theTilt', { name: 'The Tilt', type: 'dash', pose: 'lance', su: 0.14, ac: 0.16, rc: 0.32, dmg: 74, dist: 8, rad: 1.0, kb: [18, 6], launch: 1, armor: 1, sfx: 'heavy' });
  mv('gallop', { name: 'Gallop', pose: 'lance', su: 0.1, ac: 0.12, rc: 0.3, dmg: 44, reach: 0.9, rad: 0.9, kb: [12, 6], launch: 1, lunge: 11, zone: 'low', h: 0.6, sfx: 'heavy' });
  mv('theJoust', { name: 'The Joust', type: 'super', pose: 'lance', su: 0.16, catchType: 'dash', dist: 10, rad: 1.25, seq: 'joust', armor: 1, dmg: 300, kb: [24, 6], zone: 'mid' });

  /* -------------------------------------------------------------- the parts */
  P.templar = {
    head: { name: 'Templar Great Helm', armor: 150, weight: 1.1, special: 'templarVow', uses: 2, hype: 0.95, desc: 'SPECIAL: Vow of the Temple. For 5 s he takes 20% less damage, and every hit he takes gives him twice the Hype.' },
    core: { name: 'Surcoat & Hauberk', hp: 1080, def: 0.09, weight: 1.18, guard: 15, desc: 'White wool over mail, a red cross on the breast. Sturdy.' },
    armR: { name: 'Greatsword', armor: 145, weight: 1.15, light: 'teA', air: 'teAirA', sig: 'halfsword', sigName: 'Half-Sword', sigDesc: 'Up close he chokes up on the blade: Lights that hit from under 1.1 m deal +20%.', trail: 0xe8eef8, desc: 'Oberhau › Zwerchhau › Half-Sword Thrust › Zornhau (a KNOCK). Pause after the Zwerchhau: Mordhau, the hilt as a hammer (crumple). Air: Cleave › Cross Drop. SIGNATURE: the half-sword.' },
    armL: { name: 'Mailed Gauntlet', armor: 130, weight: 1.0, heavy: 'wrathCut', launch: 'pommelRise', airHeavy: 'crossguardDrop', guard: 105, chip: 0.9, trail: 0xe8eef8, desc: 'A mail glove, hand free for the two-handed grip. HEAVY: Wrath of the Temple, the biggest two-handed KNOCK. Guard: medium.' },
    legs: { name: 'Mail Chausses', armor: 195, weight: 1.15, speed: 5.6, jump: 10.5, airJumps: 1, dashAtk: 'pilgrimLunge', perk: null, desc: 'Heavy mail on the legs. DASH ATTACK: Pilgrim\'s Lunge.' },
    card: { name: 'Beauséant', super: 'beauseant', passive: 'penance', desc: 'LEGEND ART: Beauséant, the black-and-white banner, three great cuts and the Murder-Stroke. PASSIVE (Penance): every hit he takes adds 2% to his next hit that lands (up to +30%).' },
  };
  P.crusader = {
    head: { name: 'Flat-Top Helm', armor: 145, weight: 1.1, special: 'deusVult', uses: 3, hype: 1.0, desc: 'SPECIAL: Deus Vult! A war cry that blows them back from all around him, and 5 s of Zeal (+12% damage).' },
    core: { name: 'Hauberk & Surcoat', hp: 1100, def: 0.09, weight: 1.22, guard: 20, desc: 'Mail to the knees, the cross on his chest. Heavy.' },
    armR: { name: 'Morning Star', armor: 140, weight: 1.15, light: 'crA', air: 'crAirA', sig: 'flail', sigName: 'Over the Shield', sigDesc: 'A flail swings over a guard: his Lights can\'t be Just Guarded, and blocking them costs twice the guard.', trail: 0xffc080, desc: 'Flail Swing › Backhand › Whirling Chain (all around) › Morning Star (ground-bounces them). Pause after the Backhand: Shield Hook pops them up. Air: Flail › Falling Star. SIGNATURE: over the shield.' },
    armL: { name: 'Heater Shield', armor: 175, weight: 1.2, heavy: 'heaterCharge', launch: 'heaterLift', airHeavy: 'heaterFall', guard: 155, chip: 0.6, trail: 0xffc080, desc: 'HEAVY: Heater Charge, armoured, a big shove. Guard: strong.' },
    legs: { name: 'Mail & Spurs', armor: 200, weight: 1.2, speed: 5.5, jump: 10, airJumps: 1, dashAtk: 'holyCharge', perk: 'unstoppable', desc: 'Dash attacks carry armour against one hit. DASH ATTACK: Holy Charge.' },
    card: { name: 'Siege of Faith', super: 'siegeOfFaith', passive: 'firstblood', desc: 'LEGEND ART: Siege of Faith, the flail wheels round and round and comes down like a falling star. PASSIVE (First Blood): his first hit of each round deals +40%.' },
  };
  P.lancer = {
    head: { name: 'Plumed Helm', armor: 135, weight: 1.05, special: 'theTilt', uses: 3, hype: 1.0, desc: 'SPECIAL: The Tilt. A full-gallop charge 8 m with the lance couched: armoured, and a big KNOCK.' },
    core: { name: 'Jousting Harness', hp: 1060, def: 0.08, weight: 1.2, guard: 15, desc: 'Tournament plate, built for the lists. Sturdy.' },
    armR: { name: 'Tilting Lance', armor: 135, weight: 1.1, light: 'lnA', air: 'lnAirA', sig: 'mounted', sigName: 'Mounted', sigDesc: 'From the saddle: dash attacks and Specials hit 15% harder.', trail: 0xd8dde6, desc: 'Lance Jab › Lance Sweep › Hoof Strike › Unhorse (launches up). Pause after the Sweep: Trample, the horse runs them down (low). Air: Lance Up › Lance Fall. SIGNATURE: the charge.' },
    armL: { name: 'Jousting Shield', armor: 145, weight: 1.05, heavy: 'couchedLance', launch: 'bracingLift', airHeavy: 'lanceDrop', guard: 140, chip: 0.7, trail: 0xd8dde6, desc: 'The shield braces the lance. HEAVY: Couched Lance, a 5.5 m charge that KNOCKs them (hold to charge). Guard: strong.' },
    legs: { name: 'Bramble (Warhorse)', armor: 230, weight: 1.35, speed: 7.6, jump: 10, airJumps: 1, dashAtk: 'gallop', perk: null, desc: 'A warhorse under you: the fastest run in the game. DASH ATTACK: Gallop.' },
    card: { name: 'The Lists', super: 'theJoust', passive: 'charger', desc: 'LEGEND ART: The Joust, two passes down the lists and the lance that unhorses them. PASSIVE (Charger): every half-second spent running before a hit adds 5% to it (up to +20%).' },
  };

  Object.assign(PASSIVE, {
    penance: 'Penance: each hit taken adds 2% to his next hit (to +30%)', firstblood: 'First Blood: the round\'s first hit +40%',
    charger: 'Charger: running before a hit adds up to +20%',
  });
  Object.assign(PREFIX, { templar: 'Greatsword', crusader: 'Flail', lancer: 'Lance' });
  Object.assign(OFF, {
    templar: { name: 'Gauntlet Punch', pose: 'jabL', stun: 0.5 },
    crusader: { name: 'Shield Punch', pose: 'bash', stun: 0.48 },
    lancer: { name: 'Shield Rim', pose: 'bash', stun: 0.48 },
  });
  Object.assign(FIN, {
    templar: { n: 'Zornhau', a: 'Crossfall', g: { launch: 1, kb: [16, 6] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    crusader: { n: 'Morning Star', a: 'Starfall', g: { launch: 1, spike: 1, kb: [2, -11] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    lancer: { n: 'Unhorse', a: 'Lancefall', g: { launch: 1, kb: [17, 5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
  });
  KB.buildHybrids();
})();
