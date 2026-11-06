/* ============================================================================
   sports.js -- MODERN SPORTS, the second series of KNOCK//BACK figures:
   ten athletes, each its own line of six parts (parts.js explains the
   slots). Loaded after parts.js: the lines, their moves and parts go into the
   same catalog (KB), and the mixed strings are built again for all twenty.

     WRESTLER      grabs that turn into suplexes; a command-grab Body Slam
     BASEBALL      a bat string with a wind-up Home Run Swing; pitches
     FOOTBALL      armoured blocks, a long pass, a Blitz charge
     SOCCER        all kicks: a ball shot, a bicycle kick, the fastest feet
     BOXER         jab-cross-body blows; counters hit harder; Bob & Weave
     FENCER        the quickest pokes, a Flèche, parry and riposte
     WEIGHTLIFTER  the heaviest figure: wind-up dumbbell, Chalk Up armour
     BOWLER        rolling balls along the floor, split shots, strikes
     ARCHER        arrows at every range, a pinning shot, an arrow rain
     SKATEBOARDER  board tricks, wall jumps, style in the air
   ========================================================================== */
(function () {
  'use strict';
  const { LINES, LINE_ORDER, PARTS: P, PASSIVE, mv, PREFIX, OFF, FIN } = KB;
  const add = (id, o) => { LINES[id] = Object.assign({ theme: 'sports' }, o); LINE_ORDER.push(id); };

  /* ------------------------------------------------------------- the lines */
  add('wrestler', { name: 'WRESTLER', css: '#d43bd0', figure: 'El Trueno, the Masked Thunder', blurb: 'Chops, a Spear tackle and grabs that become suplexes and powerbombs. Get close and the crowd is yours.',
    pal: { main: 0xc22bbf, second: 0x2a1640, accent: 0xffd23a, dark: 0x16101e, metal: 0xe8e8ee, skin: 0xd9a070, cloth: 0x7a1d8a, glow: 0xff5af0 } });
  add('baseball', { name: 'BASEBALL', css: '#2d5bd8', figure: 'Dusty "Ace" Callahan', blurb: 'A bat string with a wind-up Home Run Swing, and a fastball that reaches across the room.',
    pal: { main: 0xf2f0ea, second: 0x1d3c9a, accent: 0xd8323a, dark: 0x141a2c, metal: 0xc89a5a, skin: 0xf0c8a0, cloth: 0x2b4fc0, glow: 0x6ab8ff } });
  add('football', { name: 'FOOTBALL', css: '#d95a1f', figure: 'Tank Brody, the Blitz', blurb: 'Armoured blocks, a bullet pass and a Blitz you can\'t stop. Built like a fridge, runs like a truck.',
    pal: { main: 0xd9531a, second: 0x1e2430, accent: 0xf4f4f0, dark: 0x111318, metal: 0xc8ccd4, skin: 0x8a5a3a, cloth: 0xd9531a, glow: 0xffa060 } });
  add('soccer', { name: 'SOCCER', css: '#1fbf5f', figure: 'Nico Volley, the Golden Boot', blurb: 'All kicks: a ball shot, a bicycle kick and the slide tackle. The quickest feet on the shelf.',
    pal: { main: 0x16a64e, second: 0xf4f4f0, accent: 0xffd23a, dark: 0x0e1a14, metal: 0xe8e8ee, skin: 0xc8946a, cloth: 0x101418, glow: 0x7dff9a } });
  add('boxer', { name: 'BOXER', css: '#e02a2a', figure: 'Rocco "Iron Jaw" Malone', blurb: 'Jab, cross, body blows, uppercut. Counter hits land harder, and he slips the next punch.',
    pal: { main: 0xd81f26, second: 0xf4f0e6, accent: 0xffd23a, dark: 0x1a1214, metal: 0xe8e8ee, skin: 0xe8b48a, cloth: 0xd81f26, glow: 0xff6a5a } });
  add('fencer', { name: 'FENCER', css: '#c8d0e0', figure: 'Céleste Vireau, the Riposte', blurb: 'The quickest pokes and the longest lunge. Parry anything, and the riposte comes before they can blink.',
    pal: { main: 0xf2f2f6, second: 0xb8bfcc, accent: 0x2a6fd8, dark: 0x22252e, metal: 0xdfe6f0, skin: 0xf0cfb0, cloth: 0xe8e8ee, glow: 0x9ad8ff } });
  add('weightlifter', { name: 'WEIGHTLIFTER', css: '#9aa3b0', figure: 'Bruna "The Barbell" Strand', blurb: 'The heaviest figure. Wind up every dumbbell swing, chalk up for armour, and lift them clean off the floor.',
    pal: { main: 0x3a4a6a, second: 0x9aa3b0, accent: 0xe8b923, dark: 0x16181e, metal: 0x4a4e58, skin: 0xe2b08a, cloth: 0x2a3550, glow: 0xffe066 } });
  add('bowler', { name: 'BOWLER', css: '#1fb5b0', figure: 'Lenny Lanes, the Perfect Game', blurb: 'Balls that roll along the floor and knock them over, split shots, and a swing like a pendulum.',
    pal: { main: 0x1fa8a3, second: 0xf2e6c8, accent: 0xe8323a, dark: 0x101a1e, metal: 0x2a1c40, skin: 0xf0c8a0, cloth: 0x2a2a34, glow: 0x6affe8 } });
  add('archer', { name: 'ARCHER', css: '#e8b923', figure: 'Wren Fletcher, the Bullseye', blurb: 'Arrows at every range, a shot that pins them, and a rain of arrows from above. Keep your distance.',
    pal: { main: 0xe8b923, second: 0x2f4a2a, accent: 0xd8323a, dark: 0x14180e, metal: 0x8a6a3a, skin: 0xd8a47a, cloth: 0x3a5a34, glow: 0xfff07a } });
  add('skater', { name: 'SKATEBOARDER', css: '#9bd400', figure: 'Kai "Kickflip" Torres', blurb: 'Board tricks, wall jumps and a 900 to finish. The best in the air, and the flashiest.',
    pal: { main: 0x9bd400, second: 0x2a2a34, accent: 0xff5a1f, dark: 0x121216, metal: 0xe8e8ee, skin: 0xc8946a, cloth: 0x4a4a58, glow: 0xd8ff5a } });

  /* ------------------------------------------------------------- the moves
     (the poses are in sports_look.js; the projectiles -- balls, arrows -- in match.js) */
  // WRESTLER · Taped Fists: chops into a lariat; his grab reaches further and his throws are suplexes and powerbombs
  mv('wrA', { name: 'Chop', pose: 'chop', su: 0.07, dmg: 26, reach: 1.05, lunge: 3, trail: 0, sfx: 'whoosh', nx: { l: 'wrB' } });
  mv('wrB', { name: 'Forearm Smash', pose: 'jabR', su: 0.08, dmg: 30, reach: 1.05, stun: 0.5, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'wrC', p: 'wrP' } });
  mv('wrC', { name: 'Knee Lift', pose: 'knee', su: 0.08, dmg: 30, kb: [2.5, 3], stun: 0.45, lunge: 4, trail: 0, sfx: 'whoosh', nx: { l: 'wrD' } });
  mv('wrD', { name: 'Lariat', pose: 'lariat', su: 0.11, ac: 0.09, rc: 0.26, dmg: 48, reach: 1.2, rad: 1.0, kb: [14, 5], launch: 1, lunge: 6, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('wrP', { name: 'Eye Rake', pose: 'sandToss', su: 0.07, ac: 0.08, rc: 0.28, dmg: 10, reach: 1.1, dizzy: 1.1, trail: 0, sfx: 'whoosh', zone: 'high' });
  mv('wrAirA', { name: 'Flying Forearm', pose: 'jabR', su: 0.07, dmg: 26, kb: [3, 4.5], air: 1, h: 1, trail: 0, sfx: 'whoosh', nx: { l: 'wrAirB' } });
  mv('wrAirB', { name: 'Elbow Drop', pose: 'elbowDrop', su: 0.1, ac: 0.3, rc: 0.24, dmg: 46, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('spearTackle', { name: 'Spear', pose: 'tackle', su: 0.18, ac: 0.1, rc: 0.3, dmg: 82, reach: 1.1, rad: 0.95, kb: [18, 5], launch: 1, lunge: 10, armor: 1, oneArmor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('euroUpper', { name: 'European Uppercut', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 40, kb: [1, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('legDrop', { name: 'Leg Drop', pose: 'legDrop', su: 0.13, ac: 0.12, rc: 0.25, dmg: 56, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.4, trail: 0, sfx: 'heavy' });
  mv('bodySlam', { name: 'Body Slam', type: 'grab', pose: 'grab', su: 0.12, ac: 0.08, rc: 0.4, dmg: 70, reach: 1.15, rad: 0.85, cmd: 'd', throwMv: 'wrSlam', kb: [17, 6], launch: 1, trail: 0, sfx: 'whoosh', zone: 'mid' });
  mv('dropkick', { name: 'Dropkick', pose: 'dropkick', su: 0.09, ac: 0.1, rc: 0.3, dmg: 46, kb: [13, 6], launch: 1, lunge: 8, trail: 0, sfx: 'heavy' });
  mv('mainEvent', { name: 'Main Event', type: 'super', pose: 'grab', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.15, rad: 1.1, close: 5, seq: 'powerbomb', dmg: 300, kb: [6, -14], zone: 'mid' });
  // his throws (the grappler's): a suplex, a German suplex, a gutwrench toss up, a powerbomb; Body Slam's own
  mv('wrThrowF', { name: 'Suplex', type: 'grab', dmg: 56, kb: [17, 7], launch: 1, zone: 'mid' });
  mv('wrThrowB', { name: 'German Suplex', type: 'grab', dmg: 64, kb: [19, 7.5], launch: 1, zone: 'mid' });
  mv('wrThrowU', { name: 'Gutwrench', type: 'grab', dmg: 44, kb: [0.6, 16.5], launch: 1, zone: 'mid' });
  mv('wrThrowD', { name: 'Powerbomb', type: 'grab', dmg: 54, kb: [1.2, -13], launch: 1, spike: 1, zone: 'mid' });
  mv('wrSlam', { name: 'Body Slam', type: 'grab', dmg: 76, kb: [1.5, -13], launch: 1, spike: 1, zone: 'mid' });

  mv('wrGrab', { name: 'Grab', type: 'grab', pose: 'grab', su: 0.09, ac: 0.08, rc: 0.38, dmg: 70, reach: 1.3, rad: 0.85, kb: [17, 6], launch: 1, trail: 0, sfx: 'whoosh', zone: 'mid' });   // (Suplex City reaches further)

  // BASEBALL · Slugger Bat: swings into a Home Run Swing you can wind up (hold Light); pause for a Bunt that pops them up
  mv('bbA', { name: 'Check Swing', pose: 'slashA', su: 0.07, dmg: 26, reach: 1.35, lunge: 3, nx: { l: 'bbB' } });
  mv('bbB', { name: 'Line Drive', pose: 'slashB', su: 0.07, dmg: 28, reach: 1.35, stun: 0.5, lunge: 3, nx: { l: 'bbC', p: 'bbP' } });
  mv('bbC', { name: 'Bat Jab', pose: 'thrust', su: 0.08, dmg: 30, reach: 1.6, kb: [3.5, 0], stun: 0.85, lunge: 5, nx: { l: 'bbD' } });   // (a long stagger: time to wind up the Home Run)
  mv('bbD', { name: 'Home Run Swing', pose: 'homerun', twoHand: 1, su: 0.13, ac: 0.08, rc: 0.28, dmg: 50, reach: 1.45, rad: 1.0, kb: [16, 6], launch: 1, lunge: 3, chargeL: 1, finisher: 1, sfx: 'heavy' });
  mv('bbP', { name: 'Bunt', pose: 'thrust', su: 0.07, ac: 0.08, rc: 0.26, dmg: 22, reach: 1.3, kb: [1.2, 12], launch: 1, launcher: 1, zone: 'low', h: 0.6, trail: 0, sfx: 'whoosh' });
  mv('bbAirA', { name: 'Air Swing', pose: 'slashA', su: 0.07, dmg: 26, kb: [3, 4.5], air: 1, h: 1, reach: 1.3, nx: { l: 'bbAirB' } });
  mv('bbAirB', { name: 'Chopper', pose: 'overhead', su: 0.1, ac: 0.3, rc: 0.24, dmg: 46, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.3, h: 0.5, sfx: 'heavy' });
  mv('fastball', { name: 'Fastball', type: 'proj', proj: 'pitch', pose: 'pitchL', su: 0.2, rc: 0.3, dmg: 72, kb: [15, 5], launch: 1, range: 9, charge: 1, trail: 0, sfx: 'whoosh' });
  mv('gloveUpper', { name: 'Glove Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('sinker', { name: 'Sinker', type: 'proj', proj: 'pitchDown', pose: 'pitchL', su: 0.14, rc: 0.28, dmg: 50, kb: [3, -13], launch: 1, spike: 1, air: 1, range: 7, trail: 0, sfx: 'whoosh' });
  mv('curveball', { name: 'Curveball', type: 'proj', proj: 'pitch', pose: 'pitchL', su: 0.16, rc: 0.3, dmg: 40, kb: [2, 0], dizzy: 1.1, range: 10, trail: 0, sfx: 'whoosh', zone: 'high' });
  mv('baseSlide', { name: 'Base Slide', pose: 'slide', su: 0.08, ac: 0.14, rc: 0.3, dmg: 38, kb: [3, 8.5], launch: 1, lunge: 9, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('grandSlam', { name: 'Grand Slam', type: 'super', pose: 'pitchL', su: 0.14, catchType: 'proj', range: 11, superLook: 'baseball', superFrom: 'wL', seq: 'homer', dmg: 290, kb: [24, 8], zone: 'mid' });

  // FOOTBALL · Stiff-Arm: armoured shoves; Facemask (pause) crumples them
  mv('fbA', { name: 'Stiff Arm', pose: 'palm', su: 0.08, dmg: 28, reach: 1.1, kb: [3, 0], lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'fbB' } });
  mv('fbB', { name: 'Forearm Shiver', pose: 'jabR', su: 0.09, dmg: 32, reach: 1.05, kb: [3, 0], stun: 0.5, lunge: 3, armorSU: 1, trail: 0, sfx: 'heavy', nx: { l: 'fbC', p: 'fbP' } });
  mv('fbC', { name: 'Swim Move', pose: 'vanish', su: 0.08, ac: 0.06, rc: 0.14, dmg: 26, reach: 1.1, kb: [2.5, 0], stun: 0.4, cross: 1, armorSU: 1, trail: 0, sfx: 'whoosh', nx: { l: 'fbD' } });
  mv('fbD', { name: 'Pancake Block', pose: 'tackle', su: 0.12, ac: 0.09, rc: 0.28, dmg: 50, reach: 1.15, rad: 0.95, kb: [2, -11], launch: 1, spike: 1, armorSU: 1, lunge: 5, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('fbP', { name: 'Facemask!', pose: 'grab', su: 0.08, ac: 0.07, rc: 0.3, dmg: 30, reach: 1.05, crumple: 1.0, lunge: 3, trail: 0, sfx: 'heavy', zone: 'high' });
  mv('fbAirA', { name: 'Leaping Shove', pose: 'palm', su: 0.08, dmg: 28, kb: [3, 4.5], air: 1, h: 1, trail: 0, sfx: 'heavy', nx: { l: 'fbAirB' } });
  mv('fbAirB', { name: 'Dogpile', pose: 'cannonball', su: 0.1, ac: 0.3, rc: 0.24, dmg: 46, kb: [6, -10], launch: 1, spike: 1, dive: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('bulletPass', { name: 'Bullet Pass', type: 'proj', proj: 'pass', pose: 'pitchL', su: 0.19, rc: 0.3, dmg: 74, kb: [16, 5], launch: 1, range: 9.5, charge: 1, trail: 0, sfx: 'whoosh' });
  mv('liftBlock', { name: 'Lift Block', pose: 'bashUp', su: 0.11, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 12.5], launch: 1, launcher: 1, armorSU: 1, trail: 0, sfx: 'heavy' });
  mv('ballSpike', { name: 'Spike!', pose: 'bashDown', su: 0.13, ac: 0.1, rc: 0.25, dmg: 56, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('blitz', { name: 'Blitz', type: 'dash', pose: 'tackle', su: 0.14, ac: 0.14, rc: 0.32, dmg: 72, dist: 5.5, rad: 1.0, kb: [17, 6], launch: 1, armor: 1, sfx: 'heavy' });
  mv('shoulderCharge', { name: 'Shoulder Charge', pose: 'tackle', su: 0.12, ac: 0.12, rc: 0.3, dmg: 48, kb: [12, 5], launch: 1, lunge: 9, armor: 1, oneArmor: 1, trail: 0, sfx: 'heavy' });
  mv('touchdown', { name: 'Touchdown Drive', type: 'super', pose: 'tackle', su: 0.14, catchType: 'dash', dist: 9, rad: 1.25, armor: 1, seq: 'touchdown', dmg: 290, kb: [3, -14], zone: 'mid' });

  // SOCCER · Captain's Armband: every Light is a kick that carries you with them; pause for a Slide Tackle
  mv('scA', { name: 'Toe Poke', pose: 'toePoke', su: 0.06, dmg: 22, reach: 1.15, lunge: 4, trail: 0, sfx: 'whoosh', nx: { l: 'scB' } });
  mv('scB', { name: 'Instep Drive', pose: 'instep', su: 0.07, dmg: 26, reach: 1.2, stun: 0.5, lunge: 4, trail: 0, sfx: 'whoosh', nx: { l: 'scC', p: 'scP' } });
  mv('scC', { name: 'Scissor Kick', pose: 'spinKick', su: 0.08, ac: 0.16, rc: 0.16, dmg: 15, multi: 2, rad: 1.15, reach: 0.8, kb: [2.5, 0], stun: 0.45, lunge: 3, trail: 0, sfx: 'whoosh', nx: { l: 'scD' } });
  mv('scD', { name: 'Bicycle Kick', pose: 'bicycle', su: 0.1, ac: 0.08, rc: 0.25, dmg: 44, reach: 1.15, kb: [2, 13], launch: 1, launcher: 1, lunge: 3, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('scP', { name: 'Slide Tackle', pose: 'slide', su: 0.08, ac: 0.14, rc: 0.28, dmg: 30, kb: [3, 8], launch: 1, lunge: 8, zone: 'low', h: 0.35, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('scAirA', { name: 'Volley', pose: 'instep', su: 0.06, dmg: 22, kb: [3, 4.5], air: 1, h: 0.9, trail: 0, sfx: 'whoosh', nx: { l: 'scAirB' } });
  mv('scAirB', { name: 'Flying Scissor', pose: 'spinKick', su: 0.06, dmg: 22, kb: [3, 4.5], air: 1, h: 0.9, trail: 0, sfx: 'whoosh', nx: { l: 'scAirC' } });
  mv('scAirC', { name: 'Overhead Kick', pose: 'bicycle', su: 0.08, ac: 0.1, rc: 0.24, dmg: 38, kb: [3, -12], launch: 1, spike: 1, air: 1, h: 0.8, trail: 0, sfx: 'heavy' });
  mv('powerShot', { name: 'Power Shot', type: 'proj', proj: 'soccer', pose: 'instep', su: 0.19, rc: 0.3, dmg: 72, kb: [15, 6], launch: 1, range: 8.5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('headerFlick', { name: 'Header', pose: 'header', su: 0.09, ac: 0.08, rc: 0.26, dmg: 36, kb: [1, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy', zone: 'high' });
  mv('divingHeader', { name: 'Diving Header', pose: 'header', su: 0.11, ac: 0.3, rc: 0.24, dmg: 50, kb: [3, -13], launch: 1, spike: 1, dive: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('freeKick', { name: 'Free Kick', type: 'proj', proj: 'soccerCurl', pose: 'instep', su: 0.16, rc: 0.3, dmg: 58, kb: [3, 0], crumple: 0.9, range: 10, trail: 0, sfx: 'heavy' });
  mv('slideTackle', { name: 'Slide Tackle', pose: 'slide', su: 0.07, ac: 0.14, rc: 0.28, dmg: 36, kb: [3, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('goldenGoal', { name: 'Golden Goal', type: 'super', pose: 'instep', su: 0.12, catchType: 'proj', range: 10, superLook: 'soccer', superFrom: 'feet', seq: 'golazo', dmg: 285, kb: [24, 9], zone: 'mid' });

  // BOXER · Right Glove: jab, cross, body blows (mash), uppercut; pause for a Haymaker that crumples
  mv('bxA', { name: 'Jab', pose: 'jabL', su: 0.045, ac: 0.05, rc: 0.1, dmg: 17, reach: 1.05, kb: [1.6, 0], stun: 0.28, lunge: 3, trail: 0, sfx: 'whoosh', nx: { l: 'bxB' } });
  mv('bxB', { name: 'Cross', pose: 'jabR', su: 0.05, ac: 0.05, rc: 0.11, dmg: 20, reach: 1.05, kb: [1.6, 0], stun: 0.45, lunge: 3, trail: 0, sfx: 'whoosh', nx: { l: 'bxC', p: 'bxP' } });
  mv('bxC', { name: 'Body Blows', pose: 'flurry', su: 0.06, ac: 0.3, rc: 0.12, dmg: 9, multi: 4, rapid: 2, reach: 1.0, kb: [0.8, 0], stun: 0.32, trail: 0, sfx: 'whoosh', nx: { l: 'bxD' } });
  mv('bxD', { name: 'Uppercut', pose: 'uppercut', su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.0, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('bxP', { name: 'Haymaker', pose: 'hook', su: 0.12, ac: 0.07, rc: 0.3, dmg: 52, reach: 1.1, rad: 0.95, crumple: 1.0, lunge: 4, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('bxAirA', { name: 'Air Jab', pose: 'jabL', su: 0.045, dmg: 19, kb: [2.5, 5], air: 1, h: 1, reach: 0.95, trail: 0, sfx: 'whoosh', nx: { l: 'bxAirB' } });
  mv('bxAirB', { name: 'Air Cross', pose: 'jabR', su: 0.05, dmg: 21, kb: [2.5, 5], air: 1, h: 1, reach: 0.95, trail: 0, sfx: 'whoosh', nx: { l: 'bxAirC' } });
  mv('bxAirC', { name: 'Overhand', pose: 'overhand', su: 0.08, ac: 0.08, rc: 0.24, dmg: 38, kb: [2, -13], launch: 1, spike: 1, air: 1, h: 0.8, trail: 0, sfx: 'heavy' });
  mv('powerHook', { name: 'Power Hook', pose: 'hookL', su: 0.19, ac: 0.07, rc: 0.3, dmg: 88, reach: 1.1, rad: 0.95, kb: [20, 4.5], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('risingUpper', { name: 'Rising Uppercut', pose: 'uppercutL', su: 0.09, ac: 0.08, rc: 0.27, dmg: 38, kb: [1, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('hammerFist', { name: 'Hammer Fist', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy', zone: 'high' });
  mv('bobWeave', { name: 'Bob & Weave', type: 'buff', pose: 'weave', su: 0.06, rc: 0.12, buff: { id: 'slip', t: 1.5 }, trail: 0, sfx: 'dodge' });
  mv('leapingHook', { name: 'Leaping Hook', pose: 'hook', su: 0.09, ac: 0.1, rc: 0.27, dmg: 42, kb: [6, 10], launch: 1, lunge: 8, trail: 0, sfx: 'heavy' });
  mv('finalRound', { name: 'Final Round', type: 'super', pose: 'jabR', su: 0.11, catchType: 'melee', lunge: 9, reach: 1.15, rad: 1.1, close: 5.5, seq: 'knockout', dmg: 300, kb: [3, 16], zone: 'mid' });

  // FENCER · Épée: the quickest thrusts and a long reach; pause for the Flèche; parry with a Just Guard and riposte
  mv('feA', { name: 'Thrust', pose: 'tsuki', su: 0.045, ac: 0.05, rc: 0.1, dmg: 19, reach: 1.7, kb: [2, 0], stun: 0.28, lunge: 4, nx: { l: 'feB' } });
  mv('feB', { name: 'Disengage', pose: 'thrust', su: 0.05, ac: 0.05, rc: 0.11, dmg: 21, reach: 1.7, kb: [2, 0], stun: 0.45, lunge: 4, nx: { l: 'feC', p: 'feP' } });
  mv('feC', { name: 'Flurry of Points', pose: 'twinThrust', su: 0.06, ac: 0.2, rc: 0.14, dmg: 12, multi: 3, reach: 1.75, kb: [2.5, 0], stun: 0.45, nx: { l: 'feD' } });
  mv('feD', { name: 'Coupé', pose: 'slashA', su: 0.09, ac: 0.08, rc: 0.24, dmg: 40, reach: 1.6, kb: [12, 5.5], launch: 1, lunge: 4, finisher: 1 });
  mv('feP', { name: 'Flèche', type: 'dash', pose: 'lunge', su: 0.12, ac: 0.1, rc: 0.28, dmg: 58, dist: 4.4, rad: 0.85, kb: [13, 5], launch: 1, kbBack: 1, inv: 1, finisher: 1 });
  mv('feAirA', { name: 'Air Thrust', pose: 'tsuki', su: 0.05, dmg: 21, reach: 1.6, kb: [3, 4.5], air: 1, h: 0.9, nx: { l: 'feAirB' } });
  mv('feAirB', { name: 'Plunging Point', pose: 'plunge', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.3, h: 0.4 });
  mv('feRiposte', { name: 'Riposte', pose: 'lunge', su: 0.03, ac: 0.08, rc: 0.22, dmg: 50, reach: 1.7, rad: 0.95, crumple: 0.9, inv: 1, lunge: 5 });
  mv('balestra', { name: 'Balestra Lunge', type: 'dash', pose: 'lunge', su: 0.18, ac: 0.12, rc: 0.3, dmg: 80, dist: 4.6, rad: 0.9, kb: [17, 4.5], launch: 1, charge: 1, sfx: 'heavy' });
  mv('priseDeFer', { name: 'Prise de Fer', pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.26, dmg: 36, reach: 1.5, kb: [1.4, 13], launch: 1, launcher: 1 });
  mv('pointDrop', { name: 'Point Drop', pose: 'plunge', su: 0.12, ac: 0.1, rc: 0.25, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, reach: 1.3, sfx: 'heavy' });
  mv('parry', { name: 'Parry', type: 'buff', pose: 'enGarde', su: 0.04, rc: 0.16, buff: { id: 'parry', t: 0.55 }, trail: 0, sfx: 'jguard' });
  mv('fencerFleche', { name: 'Running Flèche', type: 'dash', pose: 'lunge', su: 0.1, ac: 0.12, rc: 0.3, dmg: 44, dist: 4.2, rad: 0.85, kb: [9, 6], launch: 1, sfx: 'slash' });
  mv('touche', { name: 'Touché', type: 'super', pose: 'lunge', su: 0.12, catchType: 'dash', dist: 7.5, rad: 1.2, seq: 'touche', dmg: 290, kb: [22, 7], zone: 'mid' });

  // WEIGHTLIFTER · Dumbbell: slow wind-up swings (hold Light), armour in their startup; pause to throw a weight plate
  mv('wlA', { name: 'Dumbbell Swing', pose: 'hack', su: 0.13, ac: 0.08, rc: 0.21, dmg: 42, reach: 1.25, kb: [3.2, 0], stun: 0.4, lunge: 3, chargeL: 1, armorSU: 1, sfx: 'heavy', nx: { l: 'wlB' } });
  mv('wlB', { name: 'Curl Smash', pose: 'curl', su: 0.13, ac: 0.08, rc: 0.21, dmg: 46, reach: 1.2, kb: [3.2, 0], stun: 0.75, lunge: 3, chargeL: 1, armorSU: 1, sfx: 'heavy', nx: { l: 'wlC', p: 'wlP' } });
  mv('wlC', { name: 'Overhead Press', pose: 'press', su: 0.16, ac: 0.1, rc: 0.32, dmg: 62, around: 1, rad: 1.7, kb: [2, -11], launch: 1, spike: 1, chargeL: 1, armorSU: 1, finisher: 1, quake: 1, zone: 'high', sfx: 'heavy' });
  mv('wlP', { name: 'Plate Toss', type: 'proj', proj: 'plate', pose: 'toss', su: 0.14, rc: 0.3, dmg: 46, kb: [12, 5], launch: 1, range: 7, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('wlAirA', { name: 'Air Swing', pose: 'hack', su: 0.1, dmg: 38, kb: [3, 3.5], air: 1, reach: 1.2, h: 0.9, sfx: 'heavy', nx: { l: 'wlAirB' } });
  mv('wlAirB', { name: 'Dumbbell Drop', pose: 'skullSplit', su: 0.11, ac: 0.3, rc: 0.25, dmg: 50, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.1, h: 0.5, sfx: 'heavy' });
  mv('kettleSwing', { name: 'Kettlebell Swing', pose: 'kettle', su: 0.2, ac: 0.1, rc: 0.32, dmg: 90, reach: 1.1, rad: 1.0, kb: [20, 4.5], launch: 1, lunge: 4, armor: 1, oneArmor: 1, charge: 1, trail: 0, sfx: 'heavy' });
  mv('cleanJerk', { name: 'Clean & Jerk', pose: 'press', su: 0.12, ac: 0.08, rc: 0.3, dmg: 42, kb: [1, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('kettleDrop', { name: 'Kettle Drop', pose: 'bashDown', su: 0.14, ac: 0.1, rc: 0.26, dmg: 60, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('chalkUp', { name: 'Chalk Up', type: 'buff', pose: 'salute', su: 0.24, rc: 0.24, buff: { id: 'chalk', t: 4 }, trail: 0, sfx: 'jguard' });
  mv('deadliftRam', { name: 'Deadlift Ram', pose: 'tackle', su: 0.13, ac: 0.12, rc: 0.32, dmg: 50, kb: [12, 5], launch: 1, lunge: 8, armor: 1, oneArmor: 1, trail: 0, sfx: 'heavy' });
  mv('worldRecord', { name: 'World Record', type: 'super', pose: 'press', su: 0.12, catchType: 'melee', lunge: 6, reach: 1.15, rad: 1.1, close: 4.5, seq: 'record', dmg: 300, kb: [4, -14], zone: 'mid' });

  // BOWLER · Bowling Ball: pendulum swings; pause for a Gutter Ball that rolls along the floor and trips them
  mv('bwA', { name: 'Ball Swing', pose: 'bowlSwing', su: 0.08, dmg: 30, reach: 1.15, kb: [3, 0], lunge: 3, sfx: 'heavy', nx: { l: 'bwB' } });
  mv('bwB', { name: 'Backswing', pose: 'backswing', su: 0.09, dmg: 32, reach: 1.15, kb: [3, 0], stun: 0.5, lunge: 3, sfx: 'heavy', nx: { l: 'bwC', p: 'bwP' } });
  mv('bwC', { name: 'Spinner', pose: 'spin', su: 0.08, ac: 0.18, rc: 0.18, dmg: 17, multi: 2, around: 1, rad: 1.4, kb: [3, 0], stun: 0.45, sfx: 'heavy', nx: { l: 'bwD' } });
  mv('bwD', { name: 'Strike!', pose: 'bowl', su: 0.1, ac: 0.08, rc: 0.26, dmg: 46, reach: 1.15, kb: [5, 10.5], launch: 1, lunge: 5, zone: 'low', h: 0.6, finisher: 1, sfx: 'heavy' });
  mv('bwP', { name: 'Gutter Ball', type: 'proj', proj: 'roll', pose: 'bowl', su: 0.1, rc: 0.28, dmg: 30, kb: [2, 9], launch: 1, range: 8, zone: 'low', finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('bwAirA', { name: 'Air Swing', pose: 'bowlSwing', su: 0.08, dmg: 28, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'bwAirB' } });
  mv('bwAirB', { name: 'Ball Drop', pose: 'bashDown', su: 0.1, ac: 0.3, rc: 0.24, dmg: 48, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, h: 0.5, sfx: 'heavy' });
  mv('rollingThunder', { name: 'Rolling Thunder', type: 'proj', proj: 'roll', pose: 'bowl', su: 0.19, rc: 0.3, dmg: 70, kb: [15, 6], launch: 1, range: 9.5, charge: 1, otg: 1, zone: 'low', trail: 0, sfx: 'heavy' });
  mv('spareLift', { name: 'Spare Lift', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('pinDrop', { name: 'Pin Drop', type: 'proj', proj: 'rollDown', pose: 'bashDown', su: 0.13, rc: 0.28, dmg: 52, kb: [2, -13], launch: 1, spike: 1, air: 1, range: 6, trail: 0, sfx: 'heavy' });
  mv('splitShot', { name: 'Split Shot', type: 'proj', proj: 'roll2', pose: 'bowl', su: 0.16, rc: 0.32, dmg: 44, kb: [3, 10], launch: 1, range: 9, zone: 'low', trail: 0, sfx: 'whoosh' });
  mv('approachSlide', { name: 'Approach Slide', pose: 'slide', su: 0.09, ac: 0.14, rc: 0.3, dmg: 38, kb: [3, 8.5], launch: 1, lunge: 9, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('perfectGame', { name: 'Perfect Game', type: 'super', pose: 'bowl', su: 0.12, catchType: 'proj', range: 11, superLook: 'bowling', superFrom: 'feet', seq: 'perfect', dmg: 290, kb: [8, 15], zone: 'low' });

  // ARCHER · Recurve Bow: bow strikes into an arrow at point blank; pause to loose a three-arrow volley
  mv('arA', { name: 'Bow Strike', pose: 'slashA', su: 0.06, dmg: 22, reach: 1.25, lunge: 3, nx: { l: 'arB' } });
  mv('arB', { name: 'Limb Swipe', pose: 'slashB', su: 0.06, dmg: 24, reach: 1.25, stun: 0.5, lunge: 3, nx: { l: 'arC', p: 'arP' } });
  mv('arC', { name: 'Snap Shot', type: 'proj', proj: 'arrow', pose: 'drawBow', su: 0.08, rc: 0.16, dmg: 26, kb: [2.5, 0], stun: 0.5, range: 6, trail: 0, sfx: 'whoosh', nx: { l: 'arD' } });
  mv('arD', { name: 'Bow Uppercut', pose: 'upslash', su: 0.1, ac: 0.08, rc: 0.24, dmg: 42, reach: 1.25, kb: [2, 12.5], launch: 1, launcher: 1, finisher: 1 });
  mv('arP', { name: 'Volley', type: 'proj', proj: 'arrows', pose: 'drawBow', su: 0.1, rc: 0.26, dmg: 34, kb: [10, 5], launch: 1, range: 7.5, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('arAirA', { name: 'Air Strike', pose: 'slashA', su: 0.06, dmg: 22, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'arAirB' } });
  mv('arAirB', { name: 'Air Swipe', pose: 'slashB', su: 0.06, dmg: 22, kb: [3, 4.5], air: 1, h: 1, nx: { l: 'arAirC' } });
  mv('arAirC', { name: 'Arrow Rain', type: 'proj', proj: 'arrowDown', pose: 'drawBow', su: 0.07, rc: 0.22, dmg: 36, kb: [2, -11], launch: 1, spike: 1, air: 1, range: 6.5, trail: 0, sfx: 'whoosh' });
  mv('powerDraw', { name: 'Power Draw', type: 'proj', proj: 'arrowBig', pose: 'drawBow', su: 0.2, rc: 0.3, dmg: 74, kb: [16, 5], launch: 1, range: 10.5, charge: 1, trail: 0, sfx: 'whoosh' });
  mv('bracerUpper', { name: 'Bracer Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 36, kb: [1, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('plungingArrow', { name: 'Plunging Arrow', type: 'proj', proj: 'arrowDown', pose: 'drawBow', su: 0.13, rc: 0.28, dmg: 52, kb: [3, -13], launch: 1, spike: 1, air: 1, range: 7, trail: 0, sfx: 'whoosh' });
  mv('pinningShot', { name: 'Pinning Shot', type: 'proj', proj: 'arrowBig', pose: 'drawBow', su: 0.16, rc: 0.32, dmg: 46, kb: [3, 0], crumple: 1.0, range: 12, trail: 0, sfx: 'whoosh' });
  mv('archerSlide', { name: 'Slide Kick', pose: 'slide', su: 0.08, ac: 0.14, rc: 0.28, dmg: 36, kb: [3, 8.5], launch: 1, lunge: 9, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('bullseye', { name: 'Bullseye', type: 'super', pose: 'drawBow', su: 0.14, catchType: 'proj', range: 12, superLook: 'arrow', superFrom: 'wR', seq: 'bullseye', dmg: 290, kb: [26, 6], zone: 'mid' });

  // SKATER · Skateboard: deck swings into a kickflip, a board slam to finish; pause to grind along the floor through them
  mv('skA', { name: 'Deck Swing', pose: 'slashA', su: 0.06, dmg: 24, reach: 1.3, lunge: 3, nx: { l: 'skB' } });
  mv('skB', { name: 'Tail Whip', pose: 'slashB', su: 0.06, dmg: 26, reach: 1.3, stun: 0.5, lunge: 3, nx: { l: 'skC', p: 'skP' } });
  mv('skC', { name: 'Kickflip', pose: 'kickflip', su: 0.08, ac: 0.08, rc: 0.24, dmg: 40, reach: 1.15, kb: [2, 12.5], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('skP', { name: 'Grind', type: 'dash', pose: 'grind', su: 0.1, ac: 0.12, rc: 0.28, dmg: 50, dist: 4.2, rad: 0.9, kb: [10, 7], launch: 1, finisher: 1, sfx: 'whoosh' });
  mv('skAirA', { name: 'Air Kick', pose: 'knee', su: 0.05, dmg: 22, kb: [3, 4.5], air: 1, h: 0.9, trail: 0, sfx: 'whoosh', nx: { l: 'skAirB' } });
  mv('skAirB', { name: 'Shove-It', pose: 'spin', su: 0.07, ac: 0.18, rc: 0.18, dmg: 13, multi: 2, around: 1, rad: 1.3, kb: [3, 4.5], air: 1, nx: { l: 'skAirC' } });
  mv('skAirC', { name: 'Board Drop', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 40, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, h: 0.5, sfx: 'heavy' });
  mv('ollieSlam', { name: 'Ollie Slam', pose: 'overhead', su: 0.19, ac: 0.08, rc: 0.3, dmg: 82, reach: 1.25, rad: 1.0, kb: [18, 6], launch: 1, lunge: 6, charge: 1, sfx: 'heavy' });
  mv('padUpper', { name: 'Pad Upper', pose: 'uppercutL', su: 0.09, ac: 0.08, rc: 0.27, dmg: 36, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('railDrop', { name: 'Rail Drop', pose: 'grind', su: 0.12, ac: 0.3, rc: 0.25, dmg: 52, kb: [3, -14], launch: 1, spike: 1, dive: 1, air: 1, h: 0.4, sfx: 'heavy' });
  mv('grindRush', { name: 'Grind Rush', type: 'dash', pose: 'grind', su: 0.1, ac: 0.14, rc: 0.3, dmg: 54, dist: 6, rad: 0.9, kb: [6, 12], launch: 1, inv: 1, sfx: 'whoosh' });
  mv('powerslide', { name: 'Powerslide', pose: 'slide', su: 0.07, ac: 0.14, rc: 0.28, dmg: 36, kb: [4, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('nineHundred', { name: 'The 900', type: 'super', pose: 'kickflip', su: 0.1, catchType: 'dash', dist: 7, rad: 1.2, seq: 'ninehundred', dmg: 290, kb: [4, -14], zone: 'mid' });

  /* -------------------------------------------------------------- the parts */
  P.wrestler = {
    head: { name: 'Lucha Mask', armor: 125, weight: 1.05, special: 'bodySlam', uses: 3, hype: 1.05, desc: 'SPECIAL: Body Slam. A command grab that slams them into the floor (it ground-bounces them). It can\'t be guarded.' },
    core: { name: 'Singlet & Title Belt', hp: 1120, def: 0.08, weight: 1.25, guard: 15, desc: 'A heavyweight\'s core. Lots of HP, and a gold belt to defend.' },
    armR: { name: 'Taped Fists', armor: 140, weight: 1.1, light: 'wrA', air: 'wrAirA', sig: 'grappler', sigName: 'Suplex City', sigDesc: 'Your grab reaches further, and your throws become a Suplex, a German Suplex, a Gutwrench and a Powerbomb (+25% damage).', trail: 0xffd23a, desc: 'Chop › Forearm Smash › Knee Lift › Lariat. Pause after the Forearm: Eye Rake (dizzy). Air: Flying Forearm › Elbow Drop. SIGNATURE: suplex throws.' },
    armL: { name: 'Elbow Pad', armor: 140, weight: 1.1, heavy: 'spearTackle', launch: 'euroUpper', airHeavy: 'legDrop', guard: 110, chip: 0.9, trail: 0xffd23a, desc: 'HEAVY: Spear, an armoured tackle that runs them down. Guard: good.' },
    legs: { name: 'Lace-up Boots', armor: 190, weight: 1.2, speed: 5.7, jump: 10.5, airJumps: 1, dashAtk: 'dropkick', perk: 'anchor', desc: 'Planted: 15% less knockback taken. DASH ATTACK: Dropkick.' },
    card: { name: 'Main Event', super: 'mainEvent', passive: 'crowd', desc: 'LEGEND ART: Main Event, a lift, a spin and a powerbomb. PASSIVE (Crowd Pleaser): throws deal +25% damage.' },
  };
  P.baseball = {
    head: { name: 'Batting Helmet', armor: 125, weight: 1.0, special: 'curveball', uses: 3, hype: 1.0, desc: 'SPECIAL: Curveball. A pitch that reaches 10 m and leaves them dizzy.' },
    core: { name: 'Pinstripe Jersey', hp: 1000, def: 0.06, weight: 1.0, guard: 5, desc: 'An even, sturdy core.' },
    armR: { name: 'Slugger Bat', armor: 135, weight: 1.05, light: 'bbA', air: 'bbAirA', sig: 'clutch', sigName: 'Clutch Hitter', sigDesc: 'Hold Light on the Home Run Swing to wind it up: +45% damage, and a full swing crumples them.', trail: 0xf0e0c0, desc: 'Check Swing › Line Drive › Bat Jab › Home Run Swing (hold to wind up). Pause after the Line Drive: Bunt pops them up. Air: Swing › Chopper dive. SIGNATURE: a wind-up home run.' },
    armL: { name: 'Leather Glove', armor: 125, weight: 0.95, heavy: 'fastball', launch: 'gloveUpper', airHeavy: 'sinker', guard: 95, chip: 1, trail: 0xc89a5a, desc: 'HEAVY: Fastball, a pitch that KNOCKs them from 9 m. Guard: medium.' },
    legs: { name: 'Cleats & Stirrups', armor: 170, weight: 1.0, speed: 6.4, jump: 11, airJumps: 1, dashAtk: 'baseSlide', perk: null, desc: 'Even footing. DASH ATTACK: Base Slide, low, and it pops them up.' },
    card: { name: 'Grand Slam', super: 'grandSlam', passive: 'slugger', desc: 'LEGEND ART: Grand Slam, batting practice on them. PASSIVE (Slugger): Heavy moves deal +15%.' },
  };
  P.football = {
    head: { name: 'Gridiron Helmet', armor: 160, weight: 1.15, special: 'blitz', uses: 3, hype: 0.95, desc: 'SPECIAL: Blitz. An armoured charge 5.5 m that runs straight through them.' },
    core: { name: 'Shoulder Pads', hp: 1130, def: 0.1, weight: 1.3, guard: 25, desc: 'Big pads, big HP, big defence. Heavy.' },
    armR: { name: 'Stiff-Arm Glove', armor: 145, weight: 1.15, light: 'fbA', air: 'fbAirA', sig: 'blocker', sigName: 'Pass Block', sigDesc: 'Every Light after the first has armour in its startup: block through their jabs.', trail: 0xffa060, desc: 'Stiff Arm › Forearm Shiver › Swim Move (round behind them) › Pancake Block (ground-bounces them). Pause after the Shiver: Facemask! crumples. Air: Shove › Dogpile. SIGNATURE: armoured strings.' },
    armL: { name: 'Game Ball', armor: 130, weight: 1.0, heavy: 'bulletPass', launch: 'liftBlock', airHeavy: 'ballSpike', guard: 100, chip: 0.9, trail: 0xc87a3a, desc: 'HEAVY: Bullet Pass, a throw that KNOCKs them from 9.5 m. Guard: medium.' },
    legs: { name: 'Turf Cleats', armor: 205, weight: 1.25, speed: 5.9, jump: 10, airJumps: 1, dashAtk: 'shoulderCharge', perk: 'unstoppable', desc: 'Dash attacks carry armour against one hit. DASH ATTACK: Shoulder Charge.' },
    card: { name: 'Touchdown', super: 'touchdown', passive: 'juggernaut', desc: 'LEGEND ART: Touchdown Drive, the length of the field and a spike. PASSIVE (Juggernaut): dash attacks and Specials deal +20%.' },
  };
  P.soccer = {
    head: { name: 'Captain\'s Headband', armor: 100, weight: 0.9, special: 'freeKick', uses: 3, hype: 1.1, desc: 'SPECIAL: Free Kick. A curling shot that reaches 10 m and crumples them.' },
    core: { name: 'Home Kit', hp: 930, def: 0.03, weight: 0.88, guard: -5, desc: 'Light and quick. You fly a little further.' },
    armR: { name: 'Captain\'s Armband', armor: 115, weight: 0.85, light: 'scA', air: 'scAirA', sig: 'footwork', sigName: 'Footwork', sigDesc: 'Every Light is a kick that carries you with them: the longest lunges, the easiest wall carry.', trail: 0x7dff9a, desc: 'Toe Poke › Instep Drive › Scissor Kick › Bicycle Kick (launches up). Pause after the Instep: Slide Tackle. Air: Volley › Flying Scissor › Overhead Kick. SIGNATURE: kicks that carry.' },
    armL: { name: 'Goalie Glove', armor: 110, weight: 0.85, heavy: 'powerShot', launch: 'headerFlick', airHeavy: 'divingHeader', guard: 75, chip: 1.1, trail: 0x7dff9a, desc: 'HEAVY: Power Shot, a ball that KNOCKs them from 8.5 m. Guard: weak.' },
    legs: { name: 'Studded Boots', armor: 150, weight: 0.85, speed: 7.2, jump: 11.5, airJumps: 1, dashAtk: 'slideTackle', perk: 'dancer', desc: 'The fastest runner: dodges cool down twice as fast. DASH ATTACK: Slide Tackle.' },
    card: { name: 'Golden Boot', super: 'goldenGoal', passive: 'hattrick', desc: 'LEGEND ART: Golden Goal, keep-ups, volleys and the bicycle kick. PASSIVE (Hat Trick): +12% damage from the third hit of a combo on.' },
  };
  P.boxer = {
    head: { name: 'Headgear', armor: 135, weight: 1.0, special: 'bobWeave', uses: 3, hype: 1.0, desc: 'SPECIAL: Bob & Weave. For 1.5 s the next attack that would hit you misses: you slip it and step to their side.' },
    core: { name: 'Trunks & Robe', hp: 990, def: 0.05, weight: 0.98, guard: 10, desc: 'Fit and even.' },
    armR: { name: 'Right Glove', armor: 130, weight: 0.95, light: 'bxA', air: 'bxAirA', sig: 'counter', sigName: 'Counterpuncher', sigDesc: 'Counter hits (catching them in their startup) deal +50% instead of +20%.', trail: 0xff6a5a, desc: 'Jab › Cross › Body Blows (mash Light) › Uppercut. Pause after the Cross: Haymaker crumples. Air: Jab › Cross › Overhand spike. SIGNATURE: big counter hits.' },
    armL: { name: 'Left Glove', armor: 130, weight: 0.95, heavy: 'powerHook', launch: 'risingUpper', airHeavy: 'hammerFist', guard: 140, chip: 0.8, trail: 0xff6a5a, desc: 'HEAVY: Power Hook, one of the strongest straight KNOCKs. Guard: strong (gloves up).' },
    legs: { name: 'Boxing Boots', armor: 160, weight: 0.95, speed: 6.5, jump: 10.5, airJumps: 1, dashAtk: 'leapingHook', perk: 'dancer', desc: 'Footwork: dodges cool down twice as fast. DASH ATTACK: Leaping Hook launcher.' },
    card: { name: 'Final Round', super: 'finalRound', passive: 'killer', desc: 'LEGEND ART: Final Round, a flurry and the knockout uppercut. PASSIVE (Killer Instinct): +15% damage against anyone under half HP.' },
  };
  P.fencer = {
    head: { name: 'Fencing Mask', armor: 110, weight: 0.9, special: 'parry', uses: 3, hype: 1.05, desc: 'SPECIAL: Parry. A guard for half a second: anything that hits you is turned aside and you riposte at once.' },
    core: { name: 'Fencing Jacket', hp: 920, def: 0.04, weight: 0.88, guard: 0, desc: 'Light, white and quick.' },
    armR: { name: 'Épée', armor: 115, weight: 0.85, light: 'feA', air: 'feAirA', sig: 'riposte', ripMove: 'feRiposte', ripName: 'RIPOSTE!', sigName: 'Riposte', sigDesc: 'After a Just Guard, press Light: an instant lunge that crumples them.', trail: 0xdfe6f0, desc: 'Thrust › Disengage › Flurry of Points › Coupé. Pause after the Disengage: Flèche, a dash through them. Air: Thrust › Plunging Point. SIGNATURE: riposte after a Just Guard.' },
    armL: { name: 'Fencing Glove', armor: 110, weight: 0.85, heavy: 'balestra', launch: 'priseDeFer', airHeavy: 'pointDrop', guard: 90, chip: 1, trail: 0xdfe6f0, desc: 'A free hand for balance. HEAVY: Balestra Lunge, a leaping thrust that crosses 4.6 m. Guard: medium.' },
    legs: { name: 'Piste Shoes', armor: 150, weight: 0.85, speed: 6.7, jump: 11.5, airJumps: 1, dashAtk: 'fencerFleche', perk: 'sealegs', desc: 'Lunging footwork: dodges travel 30% further. DASH ATTACK: Running Flèche.' },
    card: { name: 'Touché', super: 'touche', passive: 'precision', desc: 'LEGEND ART: Touché, five touches from five sides. PASSIVE (Precision): the first hit of a combo deals +25%.' },
  };
  P.weightlifter = {
    head: { name: 'Chalk & Headband', armor: 140, weight: 1.15, special: 'chalkUp', uses: 3, hype: 0.95, desc: 'SPECIAL: Chalk Up. 4 s of super armour and +15% damage.' },
    core: { name: 'Singlet & Belt', hp: 1200, def: 0.1, weight: 1.42, guard: 25, desc: 'The heaviest core in the game: the most HP, you barely fly.' },
    armR: { name: 'Dumbbell', armor: 160, weight: 1.25, light: 'wlA', air: 'wlAirA', sig: 'windup', sigName: 'Max Effort', sigDesc: 'Hold Light to wind up any swing: armour while you hold, +45% damage, and a full rep crumples. Every swing has armour in its startup.', trail: 0xc8ccd4, desc: 'Dumbbell Swing › Curl Smash › Overhead Press (ground-bounces everyone around her). Pause after the Curl: Plate Toss. Air: Swing › Dumbbell Drop. SIGNATURE: wind-up reps.' },
    armL: { name: 'Kettlebell', armor: 170, weight: 1.3, heavy: 'kettleSwing', launch: 'cleanJerk', airHeavy: 'kettleDrop', guard: 150, chip: 0.6, trail: 0xc8ccd4, desc: 'HEAVY: Kettlebell Swing, armoured, the biggest swing in the game. Guard: strong.' },
    legs: { name: 'Lifting Shoes', armor: 215, weight: 1.4, speed: 4.9, jump: 9.5, airJumps: 1, dashAtk: 'deadliftRam', perk: 'anchor', desc: 'Planted: 15% less knockback taken. DASH ATTACK: Deadlift Ram (armoured).' },
    card: { name: 'World Record', super: 'worldRecord', passive: 'gains', desc: 'LEGEND ART: World Record, three reps with them on the bar. PASSIVE (Gains): every Heavy that lands adds +4% damage for the round (up to +20%).' },
  };
  P.bowler = {
    head: { name: 'Lucky Visor', armor: 110, weight: 0.95, special: 'splitShot', uses: 3, hype: 1.05, desc: 'SPECIAL: Split Shot. Two balls roll out in a V and knock over anyone they reach.' },
    core: { name: 'League Shirt', hp: 1010, def: 0.05, weight: 1.05, guard: 5, desc: 'A team shirt with your name on it. Even.' },
    armR: { name: 'Bowling Ball', armor: 140, weight: 1.1, light: 'bwA', air: 'bwAirA', sig: 'strike', sigName: 'Strike!', sigDesc: 'Pause after the Backswing: a Gutter Ball rolls along the floor and trips them from range.', trail: 0x6affe8, desc: 'Ball Swing › Backswing › Spinner (all around) › Strike! (pops them up). Pause after the Backswing: Gutter Ball, a rolling ball. Air: Swing › Ball Drop. SIGNATURE: a string that rolls.' },
    armL: { name: 'Wrist Brace', armor: 125, weight: 0.95, heavy: 'rollingThunder', launch: 'spareLift', airHeavy: 'pinDrop', guard: 100, chip: 1, trail: 0x6affe8, desc: 'HEAVY: Rolling Thunder, a ball along the floor that knocks them up from 9.5 m, even off the floor (OTG). Guard: medium.' },
    legs: { name: 'Two-Tone Shoes', armor: 165, weight: 1.0, speed: 6.0, jump: 10.5, airJumps: 1, dashAtk: 'approachSlide', perk: 'sealegs', desc: 'Slick soles: dodges slide 30% further. DASH ATTACK: Approach Slide.' },
    card: { name: 'Perfect Game', super: 'perfectGame', passive: 'hookspin', desc: 'LEGEND ART: Perfect Game, ten frames and ten strikes. PASSIVE (Hook Spin): thrown and rolled shots deal +18%.' },
  };
  P.archer = {
    head: { name: 'Sun Visor', armor: 100, weight: 0.88, special: 'pinningShot', uses: 3, hype: 1.05, desc: 'SPECIAL: Pinning Shot. An arrow that flies 12 m and crumples them where they stand.' },
    core: { name: 'Chest Guard', hp: 930, def: 0.04, weight: 0.9, guard: -5, desc: 'Light. A guard on one side.' },
    armR: { name: 'Recurve Bow', armor: 115, weight: 0.88, light: 'arA', air: 'arAirA', sig: 'quickdraw', sigName: 'Quick Draw', sigDesc: 'The string fires arrows: a Snap Shot in the middle, a three-arrow Volley on the pause, Arrow Rain in the air.', trail: 0xfff07a, desc: 'Bow Strike › Limb Swipe › Snap Shot (an arrow) › Bow Uppercut. Pause after the Swipe: Volley, three arrows. Air: Strike › Swipe › Arrow Rain. SIGNATURE: arrows in the string.' },
    armL: { name: 'Arm Guard', armor: 105, weight: 0.85, heavy: 'powerDraw', launch: 'bracerUpper', airHeavy: 'plungingArrow', guard: 70, chip: 1.15, trail: 0xfff07a, desc: 'HEAVY: Power Draw, an arrow that KNOCKs them from 10.5 m. Guard: weak.' },
    legs: { name: 'Trail Runners', armor: 150, weight: 0.85, speed: 6.5, jump: 12.5, airJumps: 1, dashAtk: 'archerSlide', perk: 'skyward', desc: 'Skyward: a high jump, and air dodges go 35% further. DASH ATTACK: Slide Kick.' },
    card: { name: 'Bullseye', super: 'bullseye', passive: 'eagle', desc: 'LEGEND ART: Bullseye, a sky full of arrows and one through the middle. PASSIVE (Eagle Eye): +18% damage on hits from 5 m or more.' },
  };
  P.skater = {
    head: { name: 'Beanie & Helmet', armor: 105, weight: 0.9, special: 'grindRush', uses: 3, hype: 1.1, desc: 'SPECIAL: Grind Rush. Ride 6 m through them (invulnerable) and pop them up.' },
    core: { name: 'Graphic Hoodie', hp: 910, def: 0.03, weight: 0.86, guard: -5, desc: 'Light and loose. You fly further.', hypeBonus: 0.1 },
    armR: { name: 'Skateboard', armor: 120, weight: 0.9, light: 'skA', air: 'skAirA', sig: 'style', sigName: 'Style Points', sigDesc: 'Air hits build 50% more Hype.', trail: 0xd8ff5a, desc: 'Deck Swing › Tail Whip › Kickflip (launches up). Pause after the Tail Whip: Grind, through them. Air: Kick › Shove-It › Board Drop. SIGNATURE: style in the air.' },
    armL: { name: 'Wrist Guard', armor: 110, weight: 0.85, heavy: 'ollieSlam', launch: 'padUpper', airHeavy: 'railDrop', guard: 75, chip: 1.1, trail: 0xd8ff5a, desc: 'HEAVY: Ollie Slam, a jumping board smash KNOCK. Guard: weak.' },
    legs: { name: 'Skate Shoes', armor: 150, weight: 0.85, speed: 7.0, jump: 12, airJumps: 1, dashAtk: 'powerslide', perk: 'walljump', desc: 'Fast, with WALL JUMPS. DASH ATTACK: Powerslide.' },
    card: { name: 'Kickflip 900', super: 'nineHundred', passive: 'radical', desc: 'LEGEND ART: The 900, two and a half spins and a board slam. PASSIVE (Radical): +12% damage in the air.' },
  };

  Object.assign(PASSIVE, {
    crowd: 'Crowd Pleaser: throws deal +25% damage', slugger: 'Slugger: Heavy moves deal +15% damage', juggernaut: 'Juggernaut: dash attacks and Specials +20%',
    hattrick: 'Hat Trick: +12% damage from a combo\'s 3rd hit', killer: 'Killer Instinct: +15% damage under half HP', precision: 'Precision: a combo\'s first hit +25%',
    gains: 'Gains: +4% damage per Heavy landed (to +20%)', hookspin: 'Hook Spin: thrown and rolled shots +18%', eagle: 'Eagle Eye: +18% damage from 5 m or more', radical: 'Radical: +12% damage in the air',
  });

  /* ----------------------------------------- mixed strings with the new lines */
  Object.assign(PREFIX, { wrestler: 'Lariat', baseball: 'Bat', football: 'Stiff-Arm', soccer: 'Boot', boxer: 'Glove', fencer: 'Épée', weightlifter: 'Dumbbell', bowler: 'Ball', archer: 'Bow', skater: 'Deck' });
  Object.assign(OFF, {
    wrestler: { name: 'Elbow Smash', pose: 'jabL', stun: 0.5 },
    baseball: { name: 'Glove Pop', pose: 'jabL', stun: 0.45 },
    football: { name: 'Ball Jab', pose: 'jabL', armorSU: 1, stun: 0.45 },
    soccer: { name: 'Goalie Punch', pose: 'palm', stun: 0.5 },
    boxer: { name: 'Left Hook', pose: 'hook', dmg: 26 },
    fencer: { name: 'Guard Beat', pose: 'jabL', stun: 0.5, reach: 1.3 },
    weightlifter: { name: 'Kettle Knock', pose: 'bash', armorSU: 1, oneArmor: 1, kb: [3.5, 0] },
    bowler: { name: 'Brace Jab', pose: 'jabL', stun: 0.48 },
    archer: { name: 'Arrow Jab', pose: 'jabL', reach: 1.4, stun: 0.45 },
    skater: { name: 'Pad Smack', pose: 'jabL', stun: 0.48 },
  });
  Object.assign(FIN, {
    wrestler: { n: 'Slam', a: 'Moonsault', g: { launch: 1, spike: 1, kb: [2, -12] }, air: { launch: 1, spike: 1, dive: 1, kb: [2, -14] } },
    baseball: { n: 'Line Drive', a: 'Pop Fly', g: { launch: 1, kb: [17, 4] }, air: { launch: 1, kb: [2, 12] } },
    football: { n: 'Sack', a: 'Spike', g: { launch: 1, armorSU: 1, kb: [14, 5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    soccer: { n: 'Golazo', a: 'Overhead', g: { launch: 1, kb: [13, 8] }, air: { launch: 1, spike: 1, kb: [3, -12] } },
    boxer: { n: 'Knockout', a: 'Hammer', g: { crumple: 1.0, kb: [3, 0], dmgK: 1.1 }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    fencer: { n: 'Touché', a: 'Point', g: { launch: 1, kbBack: 1, kb: [12, 6] }, air: { launch: 1, spike: 1, dive: 1, kb: [2, -13] } },
    weightlifter: { n: 'Deadlift', a: 'Plate Drop', g: { launch: 1, kb: [1.5, 14] }, air: { launch: 1, spike: 1, quake: 1, kb: [2, -14] } },
    bowler: { n: 'Strike', a: 'Gutter', g: { launch: 1, zone: 'low', kb: [6, 10] }, air: { launch: 1, spike: 1, kb: [3, -12] } },
    archer: { n: 'Bullseye', a: 'Arrowfall', g: { launch: 1, kb: [15, 5] }, air: { launch: 1, spike: 1, kb: [2, -12] } },
    skater: { n: 'Kickflip', a: 'Grind', g: { launch: 1, kb: [2, 13] }, air: { launch: 1, multi: 2, kb: [7, 6] } },
  });
  KB.buildHybrids();
})();
