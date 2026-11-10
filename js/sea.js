/* ============================================================================
   sea.js -- LOVERS OF THE SEA: the Pirate (moved here from HISTORICAL FANTASY)
   and eight more who live on the water, each armed the way they really were.

     CAPTAIN     a naval sabre and a brass spyglass: she spots a target and the crew piles on
     CANNONEER   a linstock with its smouldering match (burns), a swivel gun for grapeshot
     BLACKBEARD  a cutlass, a brace of six pistols, and lit fuses smoking in his beard
     REDBEARD    the corsair admiral: a kilij and a round kalkan shield, a pot of naphtha
     SAILOR      a belaying pin and a bare fist, and the hornpipe
     MARAUDER    a boarding axe, a throwing hatchet, and a grappling hook that hauls you in
     MUSKETEER   a musket with a bayonet fixed, one shot and then reload
     GHOST       the drowned captain: a spectral cutlass, a lantern of ghostfire, and he won't stay dead
   ========================================================================== */
(function () {
  'use strict';
  const { LINES, LINE_ORDER, PARTS: P, PASSIVE, mv, PREFIX, OFF, FIN, THEMES } = KB;
  THEMES.splice(THEMES.findIndex(T => T.id === 'sports'), 0, { id: 'sea', name: 'LOVERS OF THE SEA', short: 'SEA' });
  LINES.pirate.theme = 'sea';
  const add = (id, o) => { LINES[id] = Object.assign({ theme: 'sea' }, o); LINE_ORDER.push(id); };
  add('captain', { name: 'CAPTAIN', css: '#3a7ae0', figure: 'Captain Isadora Vance of the Gull', blurb: 'A naval sabre and a brass spyglass. She spots her mark from across the deck, and everything hits it harder.',
    pal: { main: 0x1f3a7a, second: 0xe8d8b0, accent: 0xd8a830, dark: 0x141824, metal: 0xd8dde6, skin: 0xf0c8a0, cloth: 0xa82a2a, glow: 0x7ab8ff } });
  add('cannoneer', { name: 'CANNONEER', css: '#8a8e98', figure: 'Gunner Bartholomew "Boom" Hale', blurb: 'A linstock with its match still smouldering, a swivel gun on his arm, and grapeshot. Everything he touches catches fire.',
    pal: { main: 0x5a4a3a, second: 0x2a2a30, accent: 0xff7a2a, dark: 0x16141a, metal: 0x4a4e58, skin: 0xd8a47a, cloth: 0x8a2a1a, glow: 0xffa040 } });
  add('blackbeard', { name: 'BLACKBEARD', css: '#3a3a44', figure: 'Edward Teach, Blackbeard', blurb: 'A cutlass, a brace of six pistols, and lit fuses smoking in his beard. Up close, they can barely lift a hand to him.',
    pal: { main: 0x1a1a22, second: 0x6a1a1a, accent: 0xd8a830, dark: 0x0c0c10, metal: 0xc8ccd4, skin: 0xd8a47a, cloth: 0x2a2a34, glow: 0xff8a2a } });
  add('redbeard', { name: 'REDBEARD', css: '#e0402a', figure: 'Hayreddin Barbarossa, the Corsair Admiral', blurb: 'A kilij, a round kalkan shield and a pot of naphtha. Corner them against a wall and the admiral is at his best.',
    pal: { main: 0xb8261a, second: 0xf0e6d0, accent: 0xd8a830, dark: 0x1a1214, metal: 0xd8dde6, skin: 0xe0b088, cloth: 0x1f6a5a, glow: 0xff6a3a } });
  add('sailor', { name: 'SAILOR', css: '#5ab8e8', figure: 'Able Seaman Jack Tarrow', blurb: 'A belaying pin and a bare fist, a hornpipe to dance, and the harder you hit him the harder he hits back.',
    pal: { main: 0xf4f4f0, second: 0x1f3a7a, accent: 0xd8323a, dark: 0x101418, metal: 0x8a6a3a, skin: 0xe8b48a, cloth: 0x1f3a7a, glow: 0x7ad8ff } });
  add('marauder', { name: 'MARAUDER', css: '#a86a3a', figure: 'Grim Hask the Marauder', blurb: 'A boarding axe, a hatchet to throw, and a grappling hook that hauls you across the deck to him. He keeps what he breaks.',
    pal: { main: 0x6a4a2a, second: 0x2a2a30, accent: 0xc8ccd4, dark: 0x16120e, metal: 0xb8bcc4, skin: 0xd8a47a, cloth: 0x4a5a3a, glow: 0xffb04a } });
  add('musketeer', { name: 'MUSKETEER', css: '#d8d8e8', figure: 'Corporal Margot Duval of the Marines', blurb: 'A musket with the bayonet fixed: thrusts and butt strokes, one long shot, then reload.',
    pal: { main: 0x2a3a8a, second: 0xf0ece0, accent: 0xd8323a, dark: 0x14182a, metal: 0xd8dde6, skin: 0xf0cfb0, cloth: 0xd8d8d0, glow: 0xffe07a } });
  add('ghost', { name: 'GHOST PIRATE', css: '#6affb0', figure: 'The Drowned Captain', blurb: 'A spectral cutlass, a lantern of ghostfire, and he slips through your blows. He has died once already. He won\'t again.',
    pal: { main: 0x2a5a5a, second: 0x9affd8, accent: 0x6a8a7a, dark: 0x0a1a1a, metal: 0xa8ffe0, skin: 0x8ad8c0, cloth: 0x1a3a3a, glow: 0x6affb0 } });

  /* ------------------------------------------------------------- the moves (figures and poses in sea_look.js) */
  // CAPTAIN · Naval Sabre: cuts and a thrust, a KNOCK to finish; pause and the spyglass bonks them dizzy
  mv('caA', { name: 'Sabre Cut', pose: 'slashA', su: 0.06, dmg: 24, reach: 1.3, lunge: 3, nx: { l: 'caB' } });
  mv('caB', { name: 'Backcut', pose: 'slashB', su: 0.07, dmg: 26, reach: 1.3, stun: 0.5, lunge: 3, nx: { l: 'caC', p: 'caP' } });
  mv('caC', { name: 'Thrust', pose: 'thrust', su: 0.08, dmg: 30, reach: 1.5, kb: [3.5, 0], stun: 0.7, lunge: 5, nx: { l: 'caD' } });
  mv('caD', { name: "Captain's Slash", pose: 'slashA', su: 0.11, ac: 0.08, rc: 0.27, dmg: 50, reach: 1.35, rad: 1.0, kb: [15, 6], launch: 1, lunge: 4, finisher: 1, sfx: 'heavy' });
  mv('caP', { name: 'Spyglass Bonk', pose: 'overhandL', su: 0.08, ac: 0.07, rc: 0.28, dmg: 18, reach: 1.1, dizzy: 1.1, finisher: 1, trail: 0, sfx: 'heavy', zone: 'high' });
  mv('caAirA', { name: 'Air Cut', pose: 'slashA', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.25, nx: { l: 'caAirB' } });
  mv('caAirB', { name: 'Boarding Drop', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.25, h: 0.5, sfx: 'heavy' });
  mv('spyglassSmash', { name: 'Spyglass Smash', pose: 'hookL', su: 0.19, ac: 0.07, rc: 0.3, dmg: 80, reach: 1.15, rad: 0.95, kb: [18, 5], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('spyglassUpper', { name: 'Spyglass Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('spyglassDrop', { name: 'Spyglass Drop', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.25, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy', zone: 'high' });
  mv('spotted', { name: 'Spotted!', type: 'buff', pose: 'point', su: 0.14, rc: 0.2, buff: { id: 'spot', t: 5 }, trail: 0, sfx: 'jguard' });
  mv('boardingLunge', { name: 'Boarding Lunge', pose: 'thrust', su: 0.08, ac: 0.12, rc: 0.3, dmg: 40, reach: 1.4, kb: [4, 9], launch: 1, lunge: 10, zone: 'low', h: 0.5 });
  mv('walkThePlank', { name: 'Walk the Plank', type: 'super', pose: 'thrust', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.3, rad: 1.1, close: 5, seq: 'plank', dmg: 295, kb: [20, 8], zone: 'mid' });

  // CANNONEER · Linstock: the match on a pole, jabs and a spin, and the touch-hole sets them alight; pause for a powder flash
  mv('cnA', { name: 'Match Jab', pose: 'thrust', su: 0.07, dmg: 24, reach: 1.45, lunge: 3, nx: { l: 'cnB' } });
  mv('cnB', { name: 'Pole Swing', pose: 'slashB', su: 0.08, dmg: 26, reach: 1.45, rad: 0.95, stun: 0.5, lunge: 3, nx: { l: 'cnC', p: 'cnP' } });
  mv('cnC', { name: 'Linstock Spin', pose: 'spin', su: 0.08, ac: 0.18, rc: 0.18, dmg: 15, multi: 2, around: 1, rad: 1.5, kb: [3, 0], stun: 0.45, nx: { l: 'cnD' } });
  mv('cnD', { name: 'Touch-Hole', pose: 'upslash', su: 0.1, ac: 0.08, rc: 0.25, dmg: 40, reach: 1.4, kb: [2, 13], launch: 1, launcher: 1, finisher: 1, burn: [10, 2] });
  mv('cnP', { name: 'Powder Flash', pose: 'palm', su: 0.07, ac: 0.07, rc: 0.3, dmg: 22, reach: 1.1, rad: 1.0, dizzy: 1.1, blast: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('cnAirA', { name: 'Air Jab', pose: 'thrust', su: 0.07, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.35, nx: { l: 'cnAirB' } });
  mv('cnAirB', { name: 'Ramrod Drop', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.3, h: 0.5, sfx: 'heavy' });
  mv('grapeshot', { name: 'Grapeshot', type: 'proj', proj: 'grape', pose: 'pitchL', su: 0.19, rc: 0.32, dmg: 78, kb: [16, 5.5], launch: 1, range: 6, charge: 1, round: 1, trail: 0, sfx: 'whoosh' });
  // out of shot while he swabs and loads: the swivel gun's barrel, swung
  mv('swivelBash', { name: 'Barrel Bash', pose: 'bash', su: 0.15, ac: 0.08, rc: 0.3, dmg: 46, reach: 1.15, rad: 0.95, kb: [14, 4.5], launch: 1, lunge: 4, trail: 0, sfx: 'heavy' });
  mv('gunButt', { name: 'Gun Butt', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 40, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('mortarDrop', { name: 'Mortar Drop', type: 'proj', proj: 'mortar', pose: 'pitchL', su: 0.12, rc: 0.28, dmg: 52, kb: [3, -13], launch: 1, spike: 1, air: 1, range: 6.5, round: 1, trail: 0, sfx: 'whoosh' });
  mv('chainShot', { name: 'Chain Shot', type: 'proj', proj: 'chainshot', pose: 'pitchL', su: 0.17, rc: 0.32, dmg: 64, kb: [13, 6], launch: 1, range: 10, trail: 0, sfx: 'whoosh' });
  mv('powderRush', { name: 'Powder Rush', pose: 'tackle', su: 0.1, ac: 0.12, rc: 0.3, dmg: 42, kb: [4, 9], launch: 1, lunge: 9, zone: 'low', h: 0.5, burn: [6, 2], trail: 0, sfx: 'heavy' });
  mv('fullBattery', { name: 'Full Battery', type: 'super', pose: 'point', su: 0.14, catchType: 'melee', lunge: 6, reach: 1.3, rad: 1.1, close: 5, seq: 'battery', dmg: 300, kb: [22, 8], zone: 'mid' });

  // BLACKBEARD · Cutlass: hacks, his beard to the face, a boot; pause and a pistol goes off point blank
  mv('bbA2', { name: 'Cutlass Hack', pose: 'hack', su: 0.08, ac: 0.07, rc: 0.18, dmg: 30, reach: 1.25, kb: [3, 0], lunge: 3, sfx: 'heavy', nx: { l: 'bbB2' } });
  mv('bbB2', { name: 'Backhand', pose: 'slashB', su: 0.08, dmg: 30, reach: 1.25, stun: 0.55, lunge: 3, nx: { l: 'bbC2', p: 'bbP2' } });
  mv('bbC2', { name: 'Beard Butt', pose: 'header', su: 0.08, ac: 0.07, rc: 0.2, dmg: 30, reach: 0.95, kb: [3.5, 0], stun: 0.7, lunge: 3, burn: [5, 1.5], trail: 0, sfx: 'heavy', nx: { l: 'bbD2' } });
  mv('bbD2', { name: 'The Boot', pose: 'kick', su: 0.1, ac: 0.08, rc: 0.26, dmg: 48, reach: 1.1, rad: 0.95, kb: [16, 5.5], launch: 1, lunge: 4, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('bbP2', { name: 'Close Shot', type: 'proj', proj: 'shot', pose: 'pointBlank', su: 0.08, rc: 0.26, dmg: 36, kb: [3, 0], crumple: 0.9, range: 4, round: 1, finisher: 1, burn: [5, 1.5], trail: 0, sfx: 'shot' });
  mv('bbAirA2', { name: 'Air Hack', pose: 'hack', su: 0.08, dmg: 30, kb: [3, 4], air: 1, reach: 1.2, h: 0.9, sfx: 'heavy', nx: { l: 'bbAirB2' } });
  mv('bbAirB2', { name: 'Cutlass Drop', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 46, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, sfx: 'heavy' });
  mv('sixPistols', { name: 'Six Pistols', type: 'proj', proj: 'shot', pose: 'pointBlank', su: 0.16, rc: 0.28, dmg: 70, kb: [15, 5], launch: 1, range: 8, charge: 1, round: 1, trail: 0, sfx: 'shot' });
  // every pistol fired and the brace reloading: the butt instead
  mv('bbButtJab', { name: 'Pistol Butt', pose: 'jabL', su: 0.08, dmg: 30, reach: 1.15, stun: 0.55, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('pistolBash', { name: 'Pistol Bash', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('pistolRain', { name: 'Pistol Rain', type: 'proj', proj: 'shotDown', pose: 'pointBlank', su: 0.12, rc: 0.26, dmg: 50, kb: [3, -13], launch: 1, spike: 1, air: 1, range: 6, round: 1, trail: 0, sfx: 'shot' });
  mv('smokeFuses', { name: 'Smoke & Fuses', type: 'radial', pose: 'salute', su: 0.16, ac: 0.08, rc: 0.3, dmg: 18, rad: 2.5, kb: [1, 0], dizzy: 1.3, trail: 0, sfx: 'heavy' });
  mv('teachCharge', { name: "Teach's Charge", pose: 'tackle', su: 0.12, ac: 0.12, rc: 0.3, dmg: 48, kb: [4, 9], launch: 1, lunge: 9, zone: 'low', h: 0.5, trail: 0, sfx: 'heavy' });
  mv('queenAnne', { name: "Queen Anne's Revenge", type: 'super', pose: 'pointBlank', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.15, rad: 1.1, close: 5, seq: 'sixshots', dmg: 300, kb: [20, 8], zone: 'mid' });

  // REDBEARD · Kilij: the curved sabre's draw cuts and a crescent; pause and the kalkan's rim folds them up
  mv('rdA', { name: 'Kilij Cut', pose: 'slashA', su: 0.06, dmg: 24, reach: 1.3, lunge: 3, nx: { l: 'rdB' } });
  mv('rdB', { name: 'Draw Cut', pose: 'slashB', su: 0.07, dmg: 26, reach: 1.3, stun: 0.5, lunge: 3, nx: { l: 'rdC', p: 'rdP' } });
  mv('rdC', { name: 'Crescent', pose: 'spin', su: 0.08, ac: 0.18, rc: 0.18, dmg: 16, multi: 2, around: 1, rad: 1.45, kb: [3, 0], stun: 0.45, nx: { l: 'rdD' } });
  mv('rdD', { name: "Corsair's Rise", pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.25, dmg: 44, reach: 1.3, kb: [2, 13], launch: 1, launcher: 1, finisher: 1 });
  mv('rdP', { name: 'Kalkan Rim', pose: 'bash', su: 0.1, ac: 0.08, rc: 0.3, dmg: 40, reach: 1.05, crumple: 1.0, lunge: 3, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('rdAirA', { name: 'Air Cut', pose: 'slashA', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.25, nx: { l: 'rdAirB' } });
  mv('rdAirB', { name: 'Falling Crescent', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.25, h: 0.5, sfx: 'heavy' });
  mv('kalkanCharge', { name: 'Kalkan Charge', pose: 'bash', su: 0.17, ac: 0.08, rc: 0.3, dmg: 78, reach: 1.1, rad: 0.95, kb: [18.5, 4.5], launch: 1, lunge: 7, armor: 1, oneArmor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('kalkanLift', { name: 'Kalkan Lift', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 12.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('kalkanFall', { name: 'Kalkan Fall', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 54, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('naphthaPot', { name: 'Naphtha Pot', type: 'proj', proj: 'pot', pose: 'toss', su: 0.1, rc: 0.3, dmg: 46, kb: [8, 9], launch: 1, rad: 1.5, burn: [12, 3], trail: 0, sfx: 'whoosh' });
  mv('corsairRush', { name: 'Corsair Rush', pose: 'slashA', su: 0.08, ac: 0.12, rc: 0.3, dmg: 40, reach: 1.3, kb: [4, 9], launch: 1, lunge: 10, zone: 'low', h: 0.5 });
  mv('corsairFleet', { name: 'Corsair Fleet', type: 'super', pose: 'spin', su: 0.12, catchType: 'dash', dist: 7.5, rad: 1.25, seq: 'fleet', dmg: 295, kb: [20, 8], zone: 'mid' });

  // SAILOR · Belaying Pin: a club and a knee, the uppercut; pause to spit in their eye
  mv('slA', { name: 'Pin Swing', pose: 'slashA', su: 0.06, dmg: 24, reach: 1.15, lunge: 3, sfx: 'heavy', nx: { l: 'slB' } });
  mv('slB', { name: 'Pin Backhand', pose: 'slashB', su: 0.07, dmg: 26, reach: 1.15, stun: 0.5, lunge: 3, sfx: 'heavy', nx: { l: 'slC', p: 'slP' } });
  mv('slC', { name: 'Knee to the Gut', pose: 'knee', su: 0.07, ac: 0.07, rc: 0.18, dmg: 28, reach: 0.95, kb: [3, 0], stun: 0.7, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'slD' } });
  mv('slD', { name: "Sailor's Uppercut", pose: 'uppercut', su: 0.09, ac: 0.08, rc: 0.25, dmg: 44, reach: 1.05, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('slP', { name: 'Spit in the Eye', pose: 'sandToss', su: 0.07, ac: 0.08, rc: 0.28, dmg: 8, reach: 1.1, dizzy: 1.1, finisher: 1, trail: 0, sfx: 'whoosh', zone: 'high' });
  mv('slAirA', { name: 'Air Pin', pose: 'slashA', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'slAirB' } });
  mv('slAirB', { name: 'Deck Drop', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, h: 0.5, sfx: 'heavy' });
  mv('seaHaymaker', { name: 'Haymaker', pose: 'hookL', su: 0.19, ac: 0.07, rc: 0.3, dmg: 84, reach: 1.1, rad: 0.95, kb: [19, 4.5], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('anchorUpper', { name: 'Anchor Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('hammerDrop', { name: 'Hammer Drop', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy', zone: 'high' });
  mv('hornpipe', { name: 'Hornpipe', type: 'buff', pose: 'weave', su: 0.16, rc: 0.2, buff: { id: 'hornpipe', t: 6 }, trail: 0, sfx: 'jguard' });
  mv('deckSlide', { name: 'Deck Slide', pose: 'slide', su: 0.07, ac: 0.14, rc: 0.28, dmg: 34, kb: [3, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('seaShanty', { name: 'Sea Shanty', type: 'super', pose: 'grab', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.15, rad: 1.1, close: 5, seq: 'shanty', dmg: 295, kb: [4, -14], zone: 'mid' });

  // MARAUDER · Boarding Axe: hack, hook with the axe's beard, cleave; pause to throw the hatchet from his belt
  mv('maA', { name: 'Axe Hack', pose: 'hack', su: 0.08, ac: 0.07, rc: 0.18, dmg: 30, reach: 1.2, kb: [3, 0], lunge: 3, sfx: 'heavy', nx: { l: 'maB' } });
  mv('maB', { name: 'Axe Backhand', pose: 'slashB', su: 0.08, dmg: 30, reach: 1.2, stun: 0.55, lunge: 3, sfx: 'heavy', nx: { l: 'maC', p: 'maP' } });
  mv('maC', { name: 'Bearded Hook', pose: 'chop', su: 0.08, dmg: 30, reach: 1.15, kb: [-2, 0], stun: 0.7, lunge: 2, nx: { l: 'maD' } });
  mv('maD', { name: 'Cleave', pose: 'twoHandDiag', su: 0.12, ac: 0.08, rc: 0.28, dmg: 54, reach: 1.25, rad: 1.0, kb: [16, 6], launch: 1, lunge: 4, finisher: 1, sfx: 'heavy' });
  mv('maP', { name: 'Hatchet Throw', type: 'proj', proj: 'hatchet', pose: 'toss', su: 0.09, rc: 0.24, dmg: 32, kb: [9, 5], launch: 1, range: 7.5, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('maAirA', { name: 'Air Hack', pose: 'hack', su: 0.08, dmg: 30, kb: [3, 4], air: 1, reach: 1.15, h: 0.9, sfx: 'heavy', nx: { l: 'maAirB' } });
  mv('maAirB', { name: 'Axe Drop', pose: 'skullSplit', su: 0.1, ac: 0.3, rc: 0.25, dmg: 48, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.1, h: 0.5, sfx: 'heavy' });
  mv('grapple', { name: 'Grappling Hook', type: 'proj', proj: 'hookline', pose: 'chainThrow', su: 0.17, rc: 0.3, dmg: 46, kb: [0, 3], pull: 1, stun: 0.6, range: 5.5, charge: 1, trail: 0, sfx: 'whoosh', limit: { n: 2, t: 5 } });
  mv('hookUpper', { name: 'Hook Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('hookDrop', { name: 'Hook Drop', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('boardingRush', { name: 'Boarding Rush', type: 'dash', pose: 'tackle', su: 0.14, ac: 0.14, rc: 0.32, dmg: 70, dist: 5.5, rad: 1.0, kb: [17, 6], launch: 1, armor: 1, sfx: 'heavy' });
  mv('marauderKick', { name: 'Boarding Kick', pose: 'kick', su: 0.08, ac: 0.1, rc: 0.26, dmg: 40, kb: [4, 9], launch: 1, lunge: 9, zone: 'low', h: 0.5, trail: 0, sfx: 'heavy' });
  mv('boardingParty', { name: 'Boarding Party', type: 'super', pose: 'chainThrow', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.2, rad: 1.1, close: 5, seq: 'boarding', dmg: 300, kb: [22, 7], zone: 'mid' });

  // MUSKETEER · Musket & Bayonet: thrusts and the butt, a twist; pause to lunge through; one shot, then reload
  mv('muA', { name: 'Bayonet Thrust', pose: 'thrust', twoHand: 1, su: 0.07, dmg: 24, reach: 1.6, lunge: 4, nx: { l: 'muB' } });
  mv('muB', { name: 'Butt Stroke', pose: 'slashB', twoHand: 1, su: 0.08, dmg: 28, reach: 1.25, stun: 0.5, lunge: 3, sfx: 'heavy', nx: { l: 'muC', p: 'muP' } });
  mv('muC', { name: 'Bayonet Twist', pose: 'twinThrust', twoHand: 1, su: 0.07, ac: 0.18, rc: 0.16, dmg: 16, multi: 2, reach: 1.6, kb: [2.5, 0], stun: 0.45, nx: { l: 'muD' } });
  mv('muD', { name: 'Musket Lift', pose: 'twoHandUp', twoHand: 1, su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.3, kb: [1.4, 13], launch: 1, launcher: 1, finisher: 1, sfx: 'heavy' });
  mv('muP', { name: 'Bayonet Charge', type: 'dash', pose: 'lunge', su: 0.1, ac: 0.12, rc: 0.28, dmg: 50, dist: 4.4, rad: 0.85, kb: [13, 5], launch: 1, kbBack: 1, finisher: 1 });
  mv('muAirA', { name: 'Air Thrust', pose: 'thrust', su: 0.07, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.5, nx: { l: 'muAirB' } });
  mv('muAirB', { name: 'Plunging Bayonet', pose: 'plunge', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.3, h: 0.5 });
  mv('musketShot', { name: 'Musket Shot', type: 'proj', proj: 'musket', pose: 'aim', twoHand: 1, su: 0.2, rc: 0.32, dmg: 78, kb: [17, 5], launch: 1, range: 12, charge: 1, round: 1, trail: 0, sfx: 'shot' });
  mv('stockUpper', { name: 'Stock Upper', pose: 'twoHandUp', twoHand: 1, su: 0.1, ac: 0.08, rc: 0.28, dmg: 40, reach: 1.25, kb: [1.4, 13], launch: 1, launcher: 1, sfx: 'heavy' });
  // the musket's empty while she reloads: Heavy is the butt of it
  mv('musketButt', { name: 'Musket Butt', pose: 'twoHandDiag', twoHand: 1, su: 0.15, ac: 0.08, rc: 0.3, dmg: 46, reach: 1.3, rad: 0.9, kb: [14, 4.5], launch: 1, lunge: 4, trail: 0, sfx: 'heavy' });
  mv('stockDrop', { name: 'Stock Drop', pose: 'twoHandOver', twoHand: 1, su: 0.12, ac: 0.1, rc: 0.25, dmg: 54, kb: [2.5, -14], launch: 1, spike: 1, air: 1, h: 0.6, zone: 'high', sfx: 'heavy' });
  mv('aimedShot', { name: 'Aimed Shot', type: 'proj', proj: 'musketAim', pose: 'aim', twoHand: 1, su: 0.24, rc: 0.3, dmg: 54, kb: [3, 0], crumple: 1.0, range: 14, trail: 0, sfx: 'shot' });
  mv('marineLunge', { name: 'Marine Lunge', pose: 'lunge', su: 0.08, ac: 0.12, rc: 0.3, dmg: 40, reach: 1.5, kb: [4, 9], launch: 1, lunge: 10, zone: 'low', h: 0.5 });
  mv('fixBayonets', { name: 'Fix Bayonets!', type: 'super', pose: 'lunge', su: 0.12, catchType: 'dash', dist: 7.5, rad: 1.25, seq: 'bayonets', dmg: 295, kb: [22, 7], zone: 'mid' });

  // GHOST · Spectral Cutlass: cuts that pass through, and a rise that drowns them in the air; pause for a wail
  mv('ghA', { name: 'Spectral Cut', pose: 'slashA', su: 0.06, dmg: 24, reach: 1.25, lunge: 4, nx: { l: 'ghB' } });
  mv('ghB', { name: 'Phantom Backcut', pose: 'slashB', su: 0.07, dmg: 26, reach: 1.25, stun: 0.5, lunge: 3, nx: { l: 'ghC', p: 'ghP' } });
  mv('ghC', { name: 'Through the Body', pose: 'vanish', su: 0.08, ac: 0.06, rc: 0.14, dmg: 28, reach: 1.1, kb: [2.5, 0], stun: 0.42, cross: 1, nx: { l: 'ghD' } });
  mv('ghD', { name: 'Drowning Rise', pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.24, dmg: 42, reach: 1.25, kb: [2, 13], launch: 1, launcher: 1, finisher: 1 });
  mv('ghP', { name: 'Wail', pose: 'salute', su: 0.08, ac: 0.08, rc: 0.28, dmg: 14, reach: 1.3, rad: 1.1, dizzy: 1.1, finisher: 1, trail: 0, sfx: 'whoosh', zone: 'high' });
  mv('ghAirA', { name: 'Air Cut', pose: 'slashA', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.2, nx: { l: 'ghAirB' } });
  mv('ghAirB', { name: 'Undertow', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, sfx: 'heavy' });
  mv('ghostfire', { name: 'Ghostfire', type: 'proj', proj: 'wisp', pose: 'pitchL', su: 0.18, rc: 0.3, dmg: 64, kb: [15, 5.5], launch: 1, range: 8.5, charge: 1, poison: [8, 3], trail: 0, sfx: 'whoosh' });
  mv('lanternUpper', { name: 'Lantern Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('lanternDrop', { name: 'Lantern Drop', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy', poison: [6, 2] });
  mv('phase', { name: 'Phase', type: 'buff', pose: 'weave', su: 0.05, rc: 0.16, buff: { id: 'phase', t: 1.0 }, trail: 0, sfx: 'dodge' });
  mv('driftingCut', { name: 'Drifting Cut', pose: 'slashA', su: 0.07, ac: 0.12, rc: 0.28, dmg: 38, reach: 1.25, kb: [4, 9], launch: 1, lunge: 10, zone: 'low', h: 0.5 });
  mv('davyJones', { name: "Davy Jones' Locker", type: 'super', pose: 'salute', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.25, rad: 1.15, close: 5, seq: 'locker', dmg: 300, kb: [4, -14], zone: 'mid' });

  /* -------------------------------------------------------------- the parts */
  P.captain = {
    head: { name: 'Plumed Tricorne', armor: 115, weight: 0.95, special: 'spotted', uses: 3, hype: 1.05, desc: 'SPECIAL: Spotted! Sight them through the glass (within 12 m): for 5 s everything hits them 15% harder.' },
    core: { name: "Captain's Coat", hp: 990, def: 0.05, weight: 0.98, guard: 5, desc: 'Navy wool, gold frogging, epaulettes. Even all round.' },
    armR: { name: 'Naval Sabre', armor: 130, weight: 1.0, light: 'caA', air: 'caAirA', sig: 'broadside', sigName: 'All Hands', sigDesc: 'Her Lights hit anyone SPOTTED 10% harder again (on top of the 15%).', trail: 0xe8eef8, desc: 'Sabre Cut › Backcut › Thrust › Captain\'s Slash (a KNOCK). Pause after the Backcut: Spyglass Bonk, they\'re dizzy. Air: Cut › Boarding Drop. SIGNATURE: the crew piles on.' },
    armL: { name: 'Brass Spyglass', armor: 120, weight: 0.95, heavy: 'spyglassSmash', launch: 'spyglassUpper', airHeavy: 'spyglassDrop', guard: 95, chip: 1, trail: 0xd8a830, desc: 'A long brass telescope, heavier than it looks. HEAVY: Spyglass Smash, a KNOCK. Guard: medium.' },
    legs: { name: 'Sea Boots', armor: 160, weight: 0.98, speed: 6.4, jump: 11, airJumps: 1, dashAtk: 'boardingLunge', perk: 'sealegs', desc: 'Sea legs: dodges travel 30% further. DASH ATTACK: Boarding Lunge.' },
    card: { name: 'Walk the Plank', super: 'walkThePlank', passive: 'quarterdeck', desc: 'LEGEND ART: Walk the Plank, out along the board at sword-point and a splash. PASSIVE (Quarterdeck): +12% damage while she has more HP than them.' },
  };
  P.cannoneer = {
    head: { name: "Gunner's Kerchief", armor: 110, weight: 0.98, special: 'chainShot', uses: 3, hype: 1.0, desc: 'SPECIAL: Chain Shot. Two balls chained together, spinning wide: a KNOCK from 10 m that\'s hard to step round.' },
    core: { name: 'Powder-Stained Smock', hp: 1020, def: 0.06, weight: 1.05, guard: 5, desc: 'Scorched canvas and a bandolier of cartridges.' },
    armR: { name: 'Linstock', armor: 130, weight: 1.0, light: 'cnA', air: 'cnAirA', sig: 'match', sigName: 'Slow Match', sigDesc: 'The match on his pole is always lit: the Touch-Hole sets them BURNING, and his strings deal +20% to anyone burning.', trail: 0xffa040, desc: 'Match Jab › Pole Swing › Linstock Spin › Touch-Hole (launches up, BURNING). Pause after the Swing: Powder Flash, a puff that leaves them dizzy. Air: Jab › Ramrod Drop. SIGNATURE: fire.' },
    armL: { name: 'Swivel Gun', armor: 135, weight: 1.1, heavy: 'grapeshot', launch: 'gunButt', airHeavy: 'mortarDrop', rounds: 3, reload: 5, ammo: 'SHOT', dry: { heavy: 'swivelBash', airHeavy: 'bodyDrop' }, guard: 100, chip: 0.9, trail: 0xffa040, desc: 'A swivel gun braced on the arm. HEAVY: Grapeshot, a spray of shot that KNOCKs them from 6 m, wide. THREE SHOTS (Grapeshot and the Mortar Drop); then he swabs and loads for 5 s, and Heavy is a Barrel Bash. Guard: medium.' },
    legs: { name: 'Gun-Deck Boots', armor: 175, weight: 1.05, speed: 5.9, jump: 10.5, airJumps: 1, dashAtk: 'powderRush', perk: 'anchor', desc: 'Planted on a rolling deck: 15% less knockback taken. DASH ATTACK: Powder Rush (it sets them alight).' },
    card: { name: 'Full Battery', super: 'fullBattery', passive: 'powder', desc: 'LEGEND ART: Full Battery, a row of cannons and every one of them fires. PASSIVE (Powder Keg): every burn he sets lasts twice as long.' },
  };
  P.blackbeard = {
    head: { name: 'Fuses in the Beard', armor: 120, weight: 1.0, special: 'smokeFuses', uses: 3, hype: 1.05, desc: 'SPECIAL: Smoke & Fuses. The lit fuses in his beard pour smoke all around him: anyone close stands there DIZZY.' },
    core: { name: 'Long Coat & Sash', hp: 1040, def: 0.06, weight: 1.08, guard: 10, desc: 'A black coat, a red sash, and a lot of belts.' },
    armR: { name: 'Cutlass', armor: 135, weight: 1.05, light: 'bbA2', air: 'bbAirA2', sig: 'dread', sigName: 'Dread', sigDesc: 'The fuses: a Beard Butt or a Close Shot that lands leaves them smouldering (a little BURNING).', trail: 0xffc890, desc: 'Cutlass Hack › Backhand › Beard Butt (the fuses burn) › The Boot (a KNOCK). Pause after the Backhand: Close Shot, a pistol point blank (crumple). Air: Hack › Cutlass Drop. SIGNATURE: dread.' },
    armL: { name: 'Brace of Pistols', armor: 125, weight: 1.0, heavy: 'sixPistols', launch: 'pistolBash', airHeavy: 'pistolRain', rounds: 6, reload: 6, ammo: 'PISTOLS', dry: { heavy: 'pistolButt', airHeavy: 'pistolClub', light: 'bbButtJab' }, guard: 85, chip: 1, trail: 0xffd28a, desc: 'Six pistols on bandoliers across his chest. HEAVY: one pistol, a KNOCK from 8 m. SIX PISTOLS (the Close Shot and the air shot spend one too); once all six are fired he reloads for 6 s, and Heavy is the Pistol Butt. Guard: medium.' },
    legs: { name: 'Bucket Boots', armor: 170, weight: 1.05, speed: 6.0, jump: 10.5, airJumps: 1, dashAtk: 'teachCharge', perk: null, desc: 'Heavy cuffed boots. DASH ATTACK: Teach\'s Charge.' },
    card: { name: "Queen Anne's Revenge", super: 'queenAnne', passive: 'terror', desc: 'LEGEND ART: Queen Anne\'s Revenge: the fuses lit, six pistols one after another, and the cutlass. PASSIVE (Terror): anyone within 3 m of him deals 10% less damage.' },
  };
  P.redbeard = {
    head: { name: "Admiral's Turban", armor: 120, weight: 1.0, special: 'naphthaPot', uses: 3, hype: 1.0, desc: 'SPECIAL: Naphtha Pot. A lobbed clay pot that bursts into flame: it throws them and sets them BURNING.' },
    core: { name: 'Corsair Kaftan', hp: 1030, def: 0.07, weight: 1.05, guard: 10, desc: 'A long red kaftan over mail. Sturdy.' },
    armR: { name: 'Kilij', armor: 135, weight: 1.0, light: 'rdA', air: 'rdAirA', sig: 'cornered', sigName: 'Admiral', sigDesc: 'Every hit on someone with their back to a wall or the edge of the stage (within 1.5 m of it) deals +15%.', trail: 0xfff0d8, desc: 'Kilij Cut › Draw Cut › Crescent (all around) › Corsair\'s Rise (launches up). Pause after the Draw Cut: Kalkan Rim, the shield\'s edge (crumple). Air: Cut › Falling Crescent. SIGNATURE: pin them to the wall.' },
    armL: { name: 'Kalkan Shield', armor: 165, weight: 1.15, heavy: 'kalkanCharge', launch: 'kalkanLift', airHeavy: 'kalkanFall', guard: 145, chip: 0.7, trail: 0xfff0d8, desc: 'A round shield of woven cane and silk, a steel boss. HEAVY: Kalkan Charge, armoured. Guard: strong.' },
    legs: { name: 'Corsair Boots', armor: 170, weight: 1.02, speed: 6.2, jump: 11, airJumps: 1, dashAtk: 'corsairRush', perk: 'sealegs', desc: 'Sea legs: dodges travel 30% further. DASH ATTACK: Corsair Rush.' },
    card: { name: 'Corsair Fleet', super: 'corsairFleet', passive: 'admiral', desc: 'LEGEND ART: Corsair Fleet, the kilij like a fleet of oars, and the crescent. PASSIVE (Barbarossa): +10% damage, and his Hype builds 15% faster.' },
  };
  P.sailor = {
    head: { name: "Sailor's Cap", armor: 110, weight: 0.95, special: 'hornpipe', uses: 3, hype: 1.05, desc: 'SPECIAL: Hornpipe. A sailor\'s jig: for 6 s, +12% damage and 10% faster.' },
    core: { name: 'Striped Jersey', hp: 1000, def: 0.05, weight: 1.0, guard: 5, desc: 'Blue and white stripes, rolled sleeves, a tattoo. Even.' },
    armR: { name: 'Belaying Pin', armor: 130, weight: 1.0, light: 'slA', air: 'slAirA', sig: 'brawler', sigName: 'Bar Brawler', sigDesc: 'Every Heavy that lands gives him a second of super armour against the next hit.', trail: 0xd8b878, desc: 'Pin Swing › Pin Backhand › Knee to the Gut › Sailor\'s Uppercut (launches up). Pause after the Backhand: Spit in the Eye (dizzy). Air: Pin › Deck Drop. SIGNATURE: armour as he lands them.' },
    armL: { name: 'Bare Fist', armor: 125, weight: 0.95, heavy: 'seaHaymaker', launch: 'anchorUpper', airHeavy: 'hammerDrop', guard: 100, chip: 1, trail: 0xd8b878, desc: 'A tattooed fist. HEAVY: Haymaker, a KNOCK. Guard: medium.' },
    legs: { name: 'Bell-Bottoms', armor: 160, weight: 0.98, speed: 6.6, jump: 11, airJumps: 1, dashAtk: 'deckSlide', perk: 'dancer', desc: 'Light on deck: dodges cool down twice as fast. DASH ATTACK: Deck Slide.' },
    card: { name: 'Sea Shanty', super: 'seaShanty', passive: 'scrapper', desc: 'LEGEND ART: Sea Shanty, a punch on every beat and the anchor comes down. PASSIVE (Scrapper): for 3 s after he\'s hit, +15% damage.' },
  };
  P.marauder = {
    head: { name: 'Horned Cap', armor: 125, weight: 1.05, special: 'boardingRush', uses: 3, hype: 1.0, desc: 'SPECIAL: Boarding Rush. An armoured charge 5.5 m that runs straight through them.' },
    core: { name: 'Hide & Rings', hp: 1060, def: 0.07, weight: 1.12, guard: 10, desc: 'Leather, chain and everything he took.' },
    armR: { name: 'Boarding Axe', armor: 140, weight: 1.1, light: 'maA', air: 'maAirA', sig: 'plunder', sigName: 'Keep What You Break', sigDesc: 'Every part he breaks off them heals him 8% and gives him 15 Hype.', trail: 0xd8dde6, desc: 'Axe Hack › Backhand › Bearded Hook (pulls them in) › Cleave (a KNOCK). Pause after the Backhand: Hatchet Throw. Air: Hack › Axe Drop. SIGNATURE: plunder.' },
    armL: { name: 'Grappling Hook', armor: 125, weight: 1.0, heavy: 'grapple', launch: 'hookUpper', airHeavy: 'hookDrop', guard: 85, chip: 1, trail: 0xc8a050, desc: 'A three-pronged grapnel on a rope. HEAVY: Grappling Hook, it flies 5.5 m and hauls them in (twice in any 5 s). Guard: medium.' },
    legs: { name: 'Fur Boots', armor: 180, weight: 1.1, speed: 5.9, jump: 10.5, airJumps: 1, dashAtk: 'marauderKick', perk: 'unstoppable', desc: 'Dash attacks carry armour against one hit. DASH ATTACK: Boarding Kick.' },
    card: { name: 'Boarding Party', super: 'boardingParty', passive: 'reaver', desc: 'LEGEND ART: Boarding Party, the hook, the haul, the axe and over the side. PASSIVE (Reaver): his hits break parts 30% faster.' },
  };
  P.musketeer = {
    head: { name: 'Marine Bicorne', armor: 110, weight: 0.95, special: 'aimedShot', uses: 3, hype: 1.0, desc: 'SPECIAL: Aimed Shot. A long, careful shot: it crumples them from 14 m.' },
    core: { name: 'Marine Coat', hp: 990, def: 0.06, weight: 1.0, guard: 5, desc: 'Blue coat, white facings, crossbelts. Even.' },
    armR: { name: 'Musket & Bayonet', armor: 130, weight: 1.05, light: 'muA', air: 'muAirA', sig: 'drill', sigName: 'Drilled', sigDesc: 'Reload drill: the Musket Shot is ready again in 1.8 s, not 3.', trail: 0xe8eef8, desc: 'Bayonet Thrust › Butt Stroke › Bayonet Twist › Musket Lift (launches up). Pause after the Butt Stroke: Bayonet Charge, through them. Air: Thrust › Plunging Bayonet. SIGNATURE: a faster reload.' },
    armL: { name: 'Cartridge Box', armor: 120, weight: 0.95, heavy: 'musketShot', launch: 'stockUpper', airHeavy: 'stockDrop', rounds: 1, reload: 3, ammo: 'CARTRIDGE', dry: { heavy: 'musketButt' }, guard: 90, chip: 1, trail: 0xe8eef8, desc: 'The free hand on the stock, the cartridges at her hip. HEAVY: Musket Shot, a KNOCK from 12 m; one cartridge, then she reloads (3 s), and Heavy is the Musket Butt meanwhile. Guard: medium.' },
    legs: { name: 'Gaiters & Buckles', armor: 160, weight: 0.98, speed: 6.3, jump: 11, airJumps: 1, dashAtk: 'marineLunge', perk: null, desc: 'White gaiters. DASH ATTACK: Marine Lunge.' },
    card: { name: 'Fix Bayonets!', super: 'fixBayonets', passive: 'steadyaim', desc: 'LEGEND ART: Fix Bayonets!, the charge, the thrusts, and one shot point blank. PASSIVE (Steady Aim): shots deal +18%.' },
  };
  P.ghost = {
    head: { name: 'Drowned Tricorne', armor: 105, weight: 0.9, special: 'phase', uses: 3, hype: 1.05, desc: 'SPECIAL: Phase. For a second he\'s not there at all: everything passes through him.' },
    core: { name: 'Rotted Coat', hp: 940, def: 0.04, weight: 0.88, guard: 0, desc: 'Sea-green rags that drift in no wind. Light.' },
    armR: { name: 'Spectral Cutlass', armor: 120, weight: 0.88, light: 'ghA', air: 'ghAirA', sig: 'haunt', sigName: 'Haunting', sigDesc: 'Through the Body passes through them every time, not once a combo.', trail: 0x9affd8, desc: 'Spectral Cut › Phantom Backcut › Through the Body (passes through them) › Drowning Rise (launches up). Pause after the Backcut: Wail, they\'re dizzy. Air: Cut › Undertow. SIGNATURE: through and through.' },
    armL: { name: 'Ghost Lantern', armor: 115, weight: 0.88, heavy: 'ghostfire', launch: 'lanternUpper', airHeavy: 'lanternDrop', guard: 80, chip: 1.1, trail: 0x6affb0, desc: 'A lantern burning green. HEAVY: Ghostfire, a cold flame that KNOCKs them from 8.5 m and burns (GHOSTFIRE, damage every half second for 3 s). Guard: weak.' },
    legs: { name: 'Drifting Rags', armor: 150, weight: 0.85, speed: 6.6, jump: 12, airJumps: 2, dashAtk: 'driftingCut', perk: 'skyward', desc: 'He floats: a triple jump and long air dodges. DASH ATTACK: Drifting Cut.' },
    card: { name: "Davy Jones' Locker", super: 'davyJones', passive: 'undying', desc: 'LEGEND ART: Davy Jones\' Locker, the floor turns to black water and hands drag them under. PASSIVE (Undying): once a round, a blow that would KO him leaves him at 1 HP.' },
  };

  Object.assign(PASSIVE, {
    quarterdeck: 'Quarterdeck: +12% damage while ahead on HP', powder: 'Powder Keg: his burns last twice as long', terror: 'Terror: anyone within 3 m deals 10% less',
    admiral: 'Barbarossa: +10% damage, Hype 15% faster', scrapper: 'Scrapper: +15% for 3 s after he\'s hit', reaver: 'Reaver: breaks parts 30% faster',
    steadyaim: 'Steady Aim: shots deal +18%', undying: 'Undying: once a round, stays up at 1 HP',
  });
  Object.assign(PREFIX, { captain: 'Sabre', cannoneer: 'Linstock', blackbeard: 'Cutlass', redbeard: 'Kilij', sailor: 'Pin', marauder: 'Axe', musketeer: 'Bayonet', ghost: 'Spectral' });
  Object.assign(OFF, {
    captain: { name: 'Spyglass Jab', pose: 'jabL', stun: 0.48 },
    cannoneer: { name: 'Gun Jab', pose: 'jabL', stun: 0.48 },
    blackbeard: { name: 'Pistol Butt', pose: 'jabL', stun: 0.5 },
    redbeard: { name: 'Boss Punch', pose: 'bash', stun: 0.48 },
    sailor: { name: 'Jab', pose: 'jabL', stun: 0.45, dmg: 24 },
    marauder: { name: 'Hook Jab', pose: 'jabL', stun: 0.5 },
    musketeer: { name: 'Stock Jab', pose: 'jabL', stun: 0.48 },
    ghost: { name: 'Cold Hand', pose: 'palm', stun: 0.5, poison: [5, 1.5] },
  });
  Object.assign(FIN, {
    captain: { n: 'Broadside', a: 'Boarding', g: { launch: 1, kb: [15, 6] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    cannoneer: { n: 'Touch-Hole', a: 'Mortar', g: { launch: 1, kb: [2, 13], burn: [8, 2] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    blackbeard: { n: 'Boot', a: 'Plunder Drop', g: { launch: 1, kb: [16, 5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    redbeard: { n: 'Crescent', a: 'Corsair Drop', g: { launch: 1, kb: [2, 13] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    sailor: { n: 'Uppercut', a: 'Deck Drop', g: { launch: 1, kb: [1.4, 13.5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    marauder: { n: 'Cleave', a: 'Axefall', g: { launch: 1, kb: [16, 6] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    musketeer: { n: 'Musket Lift', a: 'Bayonet Fall', g: { launch: 1, kb: [1.4, 13] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    ghost: { n: 'Drowning', a: 'Undertow', g: { launch: 1, kb: [2, 13] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
  });
  KB.buildHybrids();
})();
