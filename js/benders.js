/* ============================================================================
   benders.js -- ELEMENT BENDERS: eleven figures who move the world with their
   hands. No weapons: what they hold is the element itself.

     AIR        gusts and palms, a vortex that drags you in, a tornado to ride up
     WATER      a whip of water, ice that pins and freezes, healing water, a riptide
     EARTH      stone fists and boulders, a quake that knocks you flat, skin of stone
     FIRE       fire fists and fireballs, a stream of flame, a heat haze shots pass through
     BLOOD      she grips you from across the stage: pulls, strings, a bleed with every step
     LAVA       molten fists, a river of lava, a shell of obsidian that erupts
     LIGHTNING  bolts from the hand and from the sky, ball lightning, a rod for anyone airborne
     EXPLOSION  sparks that burst, a charge stuck on you, a mine, a detonation that costs him too
     METAL      iron fists and shrapnel, a cable zip, a magnet that sticks you to the wall
     SPIRIT     lantern light, a tether that drinks your health, places traded, a ward
     SWAMP      vines and mud, creeping roots, a body that sinks into the bog and comes up under you

   The engine runs their own rules through KB.HOOK and KB.EXT (parts.js); they are here, after the parts.
   ========================================================================== */
(function () {
  'use strict';
  const { LINES, LINE_ORDER, PARTS: P, PASSIVE, mv, PREFIX, OFF, FIN, THEMES } = KB;
  THEMES.splice(THEMES.findIndex(T => T.id === 'sports'), 0, { id: 'benders', name: 'ELEMENT BENDERS', short: 'BENDERS' });
  const add = (id, o) => { LINES[id] = Object.assign({ theme: 'benders' }, o); LINE_ORDER.push(id); };
  add('air', { name: 'AIR BENDER', css: '#9ad8f0', figure: 'Wren of the Nine Winds', blurb: 'Gusts from open palms, a vortex that drags you in and a tornado to ride. Light on her feet, and hardest to hit right after a dodge.',
    pal: { main: 0xe8eef4, second: 0x5a9ad8, accent: 0xf0c860, dark: 0x1a2230, metal: 0xd8e4f0, skin: 0xf0c8a0, cloth: 0x7ab8e8, glow: 0xc8f0ff } });
  add('water', { name: 'WATER BENDER', css: '#3a8ae8', figure: 'Nerys of the Tidewater', blurb: 'A whip of water, ice that pins your feet and freezes you solid, and water that heals her. Every hit flows into the next.',
    pal: { main: 0x1f4a8a, second: 0xe8f0f8, accent: 0x7ad8f0, dark: 0x0a1424, metal: 0xb8d8f0, skin: 0xd8b090, cloth: 0x2a6ab8, glow: 0x7ae0ff } });
  add('earth', { name: 'EARTH BENDER', css: '#6aa83a', figure: 'Bram Stoneheart', blurb: 'Stone fists, thrown boulders and a quake that knocks you flat. Stand him still and he is a mountain.',
    pal: { main: 0x3a6a2a, second: 0x8a6a3a, accent: 0xd8b048, dark: 0x1a1a10, metal: 0x8a8478, skin: 0xc89068, cloth: 0x6a5030, glow: 0x9ad848 } });
  add('flame', { name: 'FIRE BENDER', css: '#ff5a2a', figure: 'Kael Ashbrand', blurb: 'Fire fists, fireballs and a stream of flame. His fires burn hotter than anyone\'s, and his Hype stokes them.',
    pal: { main: 0x8a1a12, second: 0x1a1414, accent: 0xf0b030, dark: 0x0e0a0a, metal: 0xd8a040, skin: 0xe0b088, cloth: 0x3a1a14, glow: 0xff7a2a } });
  add('blood', { name: 'BLOOD BENDER', css: '#d8203a', figure: 'Morwen the Puppeteer', blurb: 'She never needs to touch you: she pulls you in, walks you on strings and makes every step you take bleed.',
    pal: { main: 0x3a0a14, second: 0x1a1018, accent: 0xd8203a, dark: 0x0a0608, metal: 0xc8c0c8, skin: 0xe8d8d0, cloth: 0x5a1020, glow: 0xff2a4a } });
  add('lava', { name: 'LAVA BENDER', css: '#ff7a1a', figure: 'Vulka Cinderhide', blurb: 'Molten fists, a river of lava and a shell of obsidian that erupts. Hit her up close and you get burned.',
    pal: { main: 0x2a1a16, second: 0x4a2a1a, accent: 0xff6a1a, dark: 0x0e0806, metal: 0x6a4a3a, skin: 0xb87a5a, cloth: 0x8a2a10, glow: 0xff7a20 } });
  add('storm', { name: 'LIGHTNING BENDER', css: '#5ae0ff', figure: 'Ilsa Stormcaller', blurb: 'Bolts from her hand and from the sky, ball lightning and a rod that strikes anyone in the air. Every fifth hit is a discharge.',
    pal: { main: 0x1a2a5a, second: 0xe8e8f0, accent: 0xffe03a, dark: 0x0a0e1a, metal: 0xc8d8f0, skin: 0xf0c8a8, cloth: 0x2a3a7a, glow: 0x7ae8ff } });
  add('blast', { name: 'EXPLOSION BENDER', css: '#ffa03a', figure: 'Rook Blastwright', blurb: 'Sparks that burst, a charge stuck on you that goes off later, mines and a detonation that hurts him too. Walls don\'t survive him.',
    pal: { main: 0x4a4a52, second: 0x2a2a30, accent: 0xff8a1a, dark: 0x121216, metal: 0x8a8a92, skin: 0xd8a47a, cloth: 0x6a3a1a, glow: 0xffb040 } });
  add('metal', { name: 'METAL BENDER', css: '#a8b4c0', figure: 'Varga Ironhand', blurb: 'Iron fists, shrapnel and a cable he zips along. He magnetises you to the wall, and he barely moves when he\'s hit.',
    pal: { main: 0x3a4048, second: 0x1a3a2a, accent: 0xc8ccd4, dark: 0x101214, metal: 0xd8dde6, skin: 0xd8a47a, cloth: 0x2a4a3a, glow: 0x9ad8c8 } });
  add('spirit', { name: 'SPIRIT BENDER', css: '#b48aff', figure: 'Ama the Lantern-Keeper', blurb: 'Lantern light and spirit palms. She trades places with you, drinks your health down a tether, and isn\'t there when you swing.',
    pal: { main: 0x4a2a7a, second: 0xe8e0f8, accent: 0xffd86a, dark: 0x140a24, metal: 0xd8d0f0, skin: 0xf0d0b8, cloth: 0x6a4aa8, glow: 0xc8a8ff } });
  add('swamp', { name: 'SWAMP BENDER', css: '#8aa83a', figure: 'Fen the Bog-Warden', blurb: 'Vines and mud: roots that creep after you, a bog that slows you, and a body that sinks into the mire and comes up under you.',
    pal: { main: 0x3a4a22, second: 0x5a4a2a, accent: 0x9ab83a, dark: 0x141a0c, metal: 0x6a6a4a, skin: 0xa89a72, cloth: 0x2a3a1a, glow: 0xb8e85a } });

  /* ------------------------------------------------------------- the moves (figures and poses in benders_look.js)
     each: A > B > C > D (the string), P (pause after B), AirA > AirB, Heavy, Launch, AirH, Special, Dash, Super,
     and three command Specials QF (↓↘→), QB (↓↙←), DP (→↓↘). A thrown Heavy costs the element's CHI and has a melee Dry Heavy. */
  const CMDS = {}, C = (line, qcf, qcb, dp) => { CMDS[line] = { qcf, qcb, dp }; };   // (put on the heads once they're made, below)

  // AIR · open palms: gusts, a spiral kick, the updraft; pause and a vacuum folds them up
  mv('xaA', { name: 'Gust Palm', pose: 'palm', su: 0.06, dmg: 22, reach: 1.35, lunge: 4, trail: 0, nx: { l: 'xaB' } });
  mv('xaB', { name: 'Twin Gust', pose: 'dragonPalm', su: 0.07, dmg: 24, reach: 1.35, stun: 0.5, lunge: 3, trail: 0, nx: { l: 'xaC', p: 'xaP' } });
  mv('xaC', { name: 'Spiral Kick', pose: 'spinKick', su: 0.08, ac: 0.18, rc: 0.18, dmg: 15, multi: 2, around: 1, rad: 1.45, kb: [3, 0], stun: 0.45, trail: 0, nx: { l: 'xaD' } });
  mv('xaD', { name: 'Updraft', pose: 'palmUp', su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.25, kb: [1.6, 14], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('xaP', { name: 'Vacuum Palm', pose: 'palm', su: 0.08, ac: 0.07, rc: 0.28, dmg: 20, reach: 1.5, kb: [-3, 0], crumple: 0.9, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('xaAirA', { name: 'Wind Slice', pose: 'airKick', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.25, trail: 0, nx: { l: 'xaAirB' } });
  mv('xaAirB', { name: 'Downdraft', pose: 'axeKick', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('xaHeavy', { name: 'Air Blast', type: 'proj', proj: 'gust', pose: 'dragonPalm', su: 0.17, rc: 0.3, dmg: 66, kb: [18, 5], launch: 1, range: 8, charge: 1, round: 1, trail: 0, sfx: 'whoosh' });
  mv('xaDry', { name: 'Gale Palm', pose: 'dragonPalm', su: 0.16, ac: 0.08, rc: 0.3, dmg: 62, reach: 1.3, rad: 1.0, kb: [17, 5], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('xaLaunch', { name: 'Rising Gale', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 14], launch: 1, launcher: 1, trail: 0, sfx: 'whoosh' });
  mv('xaAirH', { name: 'Downburst', pose: 'slam', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('xaSpecial', { name: 'Gale Step', type: 'dash', pose: 'palm', su: 0.1, ac: 0.14, rc: 0.3, dmg: 30, dist: 5, rad: 0.95, kb: [3, 0], stun: 0.45, dizzy: 0.9, inv: 1, trail: 0, sfx: 'whoosh' });
  mv('xaDash', { name: 'Wind Sweep', pose: 'sweep', su: 0.08, ac: 0.12, rc: 0.28, dmg: 38, kb: [4, 9], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('xaSuper', { name: 'Eye of the Storm', type: 'super', pose: 'palmUp', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.3, rad: 1.15, close: 5, seq: 'airStorm', dmg: 295, kb: [4, -14], zone: 'mid' });
  mv('xaQF', { name: 'Gale Cannon', type: 'proj', proj: 'galeCannon', pose: 'dragonPalm', su: 0.24, rc: 0.4, dmg: 58, kb: [26, 4], launch: 1, range: 9, wallBreak: 1, trail: 0, sfx: 'boom', desc: 'Air packed into a ball and fired, 9 m, through anything in its way: it blows them across the stage, and the next wall they hit breaks.' });
  mv('xaQB', { name: 'Vortex', type: 'trap', pose: 'cast', su: 0.14, rc: 0.26, reach: 2.6, trap: { look: 'vortex', col: 0xbfe8ff, r: 1.9, life: 4.5, spin: 5, aura: { pull: 3.4 } }, trail: 0, sfx: 'whoosh', desc: 'A whirlwind on the floor 2.6 m ahead for 4.5 s: anyone within 3.5 m of it is dragged into its middle.' });
  mv('xaDP', { name: 'Tornado', pose: 'spin', su: 0.06, ac: 0.24, rc: 0.38, dmg: 22, multi: 3, around: 1, reach: 1.0, rad: 1.35, h: 1.5, kb: [2, 13], launch: 1, launcher: 1, rise: 10, lunge: 2, inv: 1, trail: 0, sfx: 'whoosh', desc: 'She rides a tornado straight up, invincible as it starts: three hits all round her, and anyone caught goes up with it.' });
  C('air', 'xaQF', 'xaQB', 'xaDP');

  // WATER · a whip of water: lashes, twin streams, the wave; pause and ice shackles them
  mv('xwA', { name: 'Water Whip', pose: 'slashA', su: 0.06, dmg: 23, reach: 1.6, lunge: 3, nx: { l: 'xwB' } });
  mv('xwB', { name: 'Backlash', pose: 'slashB', su: 0.07, dmg: 25, reach: 1.6, stun: 0.5, lunge: 3, nx: { l: 'xwC', p: 'xwP' } });
  mv('xwC', { name: 'Twin Streams', pose: 'twinThrust', su: 0.07, ac: 0.18, rc: 0.16, dmg: 16, multi: 2, reach: 1.6, kb: [2.5, 0], stun: 0.45, nx: { l: 'xwD' } });
  mv('xwD', { name: 'Wave Rise', pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.4, kb: [2, 13], launch: 1, launcher: 1, finisher: 1 });
  mv('xwP', { name: 'Ice Shackle', pose: 'palm', su: 0.08, ac: 0.07, rc: 0.28, dmg: 18, reach: 1.4, crumple: 0.9, root: 1.8, finisher: 1, trail: 0, sfx: 'jguard' });
  mv('xwAirA', { name: 'Spray', pose: 'slashA', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.45, nx: { l: 'xwAirB' } });
  mv('xwAirB', { name: 'Waterfall', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.3, h: 0.5, sfx: 'heavy' });
  mv('xwHeavy', { name: 'Water Jet', type: 'proj', proj: 'jet', pose: 'dragonPalm', su: 0.17, rc: 0.3, dmg: 66, kb: [17, 5], launch: 1, range: 8.5, charge: 1, round: 1, trail: 0, sfx: 'whoosh' });
  mv('xwDry', { name: 'Tide Palm', pose: 'dragonPalm', su: 0.16, ac: 0.08, rc: 0.3, dmg: 62, reach: 1.3, rad: 1.0, kb: [17, 5], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('xwLaunch', { name: 'Geyser', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'whoosh' });
  mv('xwAirH', { name: 'Icicle Drop', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('xwSpecial', { name: 'Healing Water', type: 'buff', pose: 'meditate', su: 0.18, rc: 0.24, buff: { id: 'regen', t: 5, hp: 0.12, call: 'HEALING WATER' }, trail: 0, sfx: 'jguard' });
  mv('xwDash', { name: 'Tide Slide', pose: 'slide', su: 0.07, ac: 0.14, rc: 0.28, dmg: 34, kb: [3, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('xwSuper', { name: 'Tidal Wave', type: 'super', pose: 'cast', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.4, rad: 1.15, close: 5, seq: 'tidal', dmg: 295, kb: [20, 8], zone: 'mid' });
  mv('xwQF', { name: 'Ice Shards', type: 'proj', proj: 'icicles', pose: 'pitchL', su: 0.16, rc: 0.3, dmg: 34, kb: [6, 3], stun: 0.5, slow: 2, range: 8, trail: 0, sfx: 'whoosh', desc: 'Three shards of ice in a fan, 8 m: whoever they hit is SLOWED for 2 s.' });
  mv('xwQB', { name: 'Water Prison', type: 'proj', proj: 'smite', pose: 'cast', su: 0.18, rc: 0.3, dmg: 28, kb: [0.5, 0], stun: 0.6, freeze: 1.4, range: 8, smite: { rad: 1.15, col: 0x7ad8ff, delay: 0.5, pillar: 1, sfx: 'jguard' }, trail: 0, desc: 'A ring of water rises where they stand (8 m) and freezes solid around them: FROZEN for 1.4 s.' });
  mv('xwDP', { name: 'Riptide', type: 'radial', pose: 'spin', su: 0.08, ac: 0.1, rc: 0.34, dmg: 38, rad: 2.8, kb: [-7, 11], launch: 1, launcher: 1, inv: 1, ringCol: 0x7ad8ff, puff: 0x7ad8ff, trail: 0, sfx: 'whoosh', desc: 'A whirlpool all round her, invincible as it starts: anyone within 2.8 m is dragged in and thrown up.' });
  C('water', 'xwQF', 'xwQB', 'xwDP');

  // EARTH · stone fists: a hook, a knee, the pillar; pause and his rock armour bashes them flat
  mv('xeA', { name: 'Stone Fist', pose: 'punch', su: 0.08, ac: 0.07, rc: 0.18, dmg: 28, reach: 1.15, kb: [3, 0], lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xeB' } });
  mv('xeB', { name: 'Rock Hook', pose: 'hook', su: 0.08, dmg: 30, reach: 1.15, stun: 0.55, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xeC', p: 'xeP' } });
  mv('xeC', { name: 'Earth Knee', pose: 'knee', su: 0.07, ac: 0.07, rc: 0.2, dmg: 30, reach: 0.95, kb: [3.5, 0], stun: 0.7, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xeD' } });
  mv('xeD', { name: 'Pillar Rise', pose: 'uppercut', su: 0.1, ac: 0.08, rc: 0.26, dmg: 46, reach: 1.1, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, quake: 1, trail: 0, sfx: 'heavy' });
  mv('xeP', { name: 'Rock Armour Bash', pose: 'bash', su: 0.1, ac: 0.08, rc: 0.3, dmg: 40, reach: 1.05, crumple: 1.0, lunge: 3, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('xeAirA', { name: 'Stone Kick', pose: 'airKick', su: 0.07, dmg: 28, kb: [3, 4], air: 1, reach: 1.15, h: 0.9, trail: 0, sfx: 'heavy', nx: { l: 'xeAirB' } });
  mv('xeAirB', { name: 'Meteor Drop', pose: 'slam', su: 0.1, ac: 0.3, rc: 0.25, dmg: 48, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.1, h: 0.5, quake: 1, trail: 0, sfx: 'heavy' });
  mv('xeHeavy', { name: 'Boulder Toss', type: 'proj', proj: 'boulder', pose: 'hurl', su: 0.22, rc: 0.34, dmg: 82, kb: [18, 5], launch: 1, range: 7.5, charge: 1, round: 1, gbreak: 1, trail: 0, sfx: 'heavy' });
  mv('xeDry', { name: 'Stone Hammer', pose: 'slam', su: 0.18, ac: 0.08, rc: 0.3, dmg: 74, reach: 1.15, rad: 1.0, kb: [18, 5], launch: 1, lunge: 4, charge: 1, quake: 1, trail: 0, sfx: 'heavy' });
  mv('xeLaunch', { name: 'Earth Pillar', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.28, dmg: 40, kb: [1, 13.5], launch: 1, launcher: 1, quake: 1, trail: 0, sfx: 'heavy' });
  mv('xeAirH', { name: 'Landslide', pose: 'overhandL', su: 0.13, ac: 0.1, rc: 0.25, dmg: 56, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, quake: 1, trail: 0, sfx: 'heavy' });
  mv('xeSpecial', { name: 'Quake Stomp', type: 'radial', pose: 'stomp', su: 0.16, ac: 0.08, rc: 0.3, dmg: 26, rad: 3, kb: [3, 6], launch: 1, trip: 1, quake: 1, zone: 'low', ringCol: 0xb89a6a, trail: 0, sfx: 'boom' });
  mv('xeDash', { name: 'Earth Surf', pose: 'slide', su: 0.08, ac: 0.14, rc: 0.3, dmg: 38, kb: [3.5, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, quake: 1, trail: 0, sfx: 'heavy' });
  mv('xeSuper', { name: 'Tectonic', type: 'super', pose: 'stomp', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.25, rad: 1.15, close: 5, seq: 'tectonic', dmg: 300, kb: [21, 8], zone: 'mid' });
  mv('xeQF', { name: 'Earth Wave', type: 'proj', proj: 'earthWave', pose: 'stomp', su: 0.18, rc: 0.32, dmg: 40, kb: [3, 8], launch: 1, trip: 1, range: 8, trail: 0, sfx: 'heavy', desc: 'A ridge of rock runs along the floor, 8 m, through anything: it knocks them flat (a hard knockdown).' });
  mv('xeQB', { name: 'Stone Skin', type: 'buff', pose: 'meditate', su: 0.22, rc: 0.24, buff: { id: 'stoneSkin', t: 6 }, trail: 0, sfx: 'heavy', desc: 'Stone closes over his skin for 6 s: 35% less damage taken, but he can\'t jump or dodge.' });
  mv('xeDP', { name: 'Rock Coffin', type: 'proj', proj: 'smite', pose: 'palmUp', su: 0.16, rc: 0.32, dmg: 26, kb: [0.5, 0], stun: 0.6, root: 2.5, coffin: 1, range: 7, smite: { rad: 1.1, col: 0xb89a6a, delay: 0.5, pillar: 1, sfx: 'heavy' }, trail: 0, desc: 'Stone closes round them where they stand (7 m): ROOTED for 2.5 s, and his next hit within 3 s shatters it for +50%.' });
  C('earth', 'xeQF', 'xeQB', 'xeDP');

  // FIRE · fire fists: jab, fist, kick, the rising flame; pause and a flare dazzles them
  mv('xfA', { name: 'Flame Jab', pose: 'jabR', su: 0.05, dmg: 22, reach: 1.15, lunge: 3, trail: 0, nx: { l: 'xfB' } });
  mv('xfB', { name: 'Fire Fist', pose: 'punch', su: 0.07, dmg: 26, reach: 1.2, stun: 0.5, lunge: 3, burn: [4, 1], trail: 0, sfx: 'heavy', nx: { l: 'xfC', p: 'xfP' } });
  mv('xfC', { name: 'Flame Kick', pose: 'kick', su: 0.07, ac: 0.07, rc: 0.2, dmg: 28, reach: 1.2, kb: [3.5, 0], stun: 0.7, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xfD' } });
  mv('xfD', { name: 'Rising Flame', pose: 'uppercut', su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.1, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, burn: [8, 2], trail: 0, sfx: 'heavy' });
  mv('xfP', { name: 'Flare', pose: 'palm', su: 0.07, ac: 0.07, rc: 0.3, dmg: 22, reach: 1.1, rad: 1.0, dizzy: 1.1, blast: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('xfAirA', { name: 'Fire Kick', pose: 'airKick', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.2, trail: 0, nx: { l: 'xfAirB' } });
  mv('xfAirB', { name: 'Comet Kick', pose: 'axeKick', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, burn: [5, 1.5], trail: 0, sfx: 'heavy' });
  mv('xfHeavy', { name: 'Fireball', type: 'proj', proj: 'fireball', pose: 'dragonPalm', su: 0.17, rc: 0.3, dmg: 64, kb: [17, 5], launch: 1, range: 8, charge: 1, round: 1, burn: [8, 2], trail: 0, sfx: 'whoosh' });
  mv('xfDry', { name: 'Blaze Fist', pose: 'hookL', su: 0.17, ac: 0.08, rc: 0.3, dmg: 64, reach: 1.15, rad: 0.95, kb: [17, 5], launch: 1, lunge: 5, charge: 1, burn: [5, 1.5], trail: 0, sfx: 'heavy' });
  mv('xfLaunch', { name: 'Flame Uppercut', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('xfAirH', { name: 'Falling Sun', pose: 'slam', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, burn: [5, 1.5], trail: 0, sfx: 'heavy' });
  mv('xfSpecial', { name: 'Fire Ring', type: 'radial', pose: 'burst', su: 0.14, ac: 0.08, rc: 0.3, dmg: 30, rad: 2.4, kb: [12, 4], launch: 1, burn: [10, 2], ringCol: 0xff7a2a, puff: 0xff7a2a, trail: 0, sfx: 'boom' });
  mv('xfDash', { name: 'Blaze Rush', pose: 'tackle', su: 0.1, ac: 0.12, rc: 0.3, dmg: 40, kb: [4, 9], launch: 1, lunge: 9, zone: 'low', h: 0.5, burn: [5, 1.5], trail: 0, sfx: 'heavy' });
  mv('xfSuper', { name: 'Inferno', type: 'super', pose: 'dragonPalm', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.25, rad: 1.15, close: 5, seq: 'inferno', dmg: 300, kb: [21, 8], zone: 'mid' });
  mv('xfQF', { name: 'Fire Stream', type: 'proj', proj: 'breath', pose: 'dragonPalm', su: 0.2, rc: 0.38, dmg: 46, range: 4.5, kb: [14, 5], launch: 1, burn: [8, 2], breathCol: [0xffd040, 0xff7a2a, 0xff3010], trail: 0, desc: 'A stream of fire from both hands, 4.5 m ahead: three bursts, BURNING, and the last one throws them.' });
  mv('xfQB', { name: 'Heat Haze', type: 'buff', pose: 'meditate', su: 0.12, rc: 0.24, buff: { id: 'haze', t: 3 }, trail: 0, sfx: 'whoosh', desc: 'The air shimmers round him for 3 s: arrows, bullets, balls and bolts pass straight through.' });
  mv('xfDP', { name: 'Flame Wheel', type: 'leap', pose: 'axeKick', su: 0.1, ac: 0.1, rc: 0.34, air: 0.55, range: 7, dmg: 60, rad: 1.2, kb: [14, 6], launch: 1, burn: [8, 2], trail: 0, sfx: 'heavy', desc: 'A cartwheeling axe kick wreathed in fire: he leaps at them from up to 7 m and comes down on them, BURNING.' });
  C('flame', 'xfQF', 'xfQB', 'xfDP');

  // BLOOD · she grips from a distance: a grip, a twist, a wrench, the marionette lift; pause and she seizes them
  mv('xbA', { name: 'Grip', pose: 'palm', su: 0.06, dmg: 22, reach: 1.7, lunge: 2, trail: 0, nx: { l: 'xbB' } });
  mv('xbB', { name: 'Twist', pose: 'chainYank', su: 0.07, dmg: 25, reach: 1.7, kb: [-2, 0], stun: 0.55, lunge: 2, trail: 0, nx: { l: 'xbC', p: 'xbP' } });
  mv('xbC', { name: 'Wrench', pose: 'dragonPalm', su: 0.07, ac: 0.07, rc: 0.2, dmg: 28, reach: 1.6, kb: [3, 0], stun: 0.7, lunge: 2, trail: 0, sfx: 'heavy', nx: { l: 'xbD' } });
  mv('xbD', { name: 'Marionette Lift', pose: 'palmUp', su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.6, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('xbP', { name: 'Seize', pose: 'point', su: 0.08, ac: 0.07, rc: 0.28, dmg: 20, reach: 2.0, crumple: 1.0, finisher: 1, trail: 0, sfx: 'jguard' });
  mv('xbAirA', { name: 'Claw', pose: 'slashA', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.5, trail: 0, nx: { l: 'xbAirB' } });
  mv('xbAirB', { name: 'Drag Down', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.4, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('xbHeavy', { name: 'Puppet Throw', pose: 'hurl', su: 0.18, ac: 0.08, rc: 0.3, dmg: 76, reach: 1.8, rad: 1.25, kb: [18, 5], launch: 1, lunge: 2, charge: 1, trail: 0, sfx: 'heavy' });
  mv('xbLaunch', { name: 'Marionette Rise', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, reach: 1.7, kb: [1.2, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('xbAirH', { name: 'Puppet Slam', pose: 'slam', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, reach: 1.6, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('xbSpecial', { name: 'Blood Pull', type: 'proj', proj: 'grip', pose: 'chainYank', su: 0.12, rc: 0.3, dmg: 22, range: 4.5, kb: [-11, 1.5], stun: 0.7, trail: 0, sfx: 'jguard' });
  mv('xbDash', { name: 'Crimson Rush', pose: 'lunge', su: 0.08, ac: 0.12, rc: 0.3, dmg: 38, reach: 1.4, kb: [4, 9], launch: 1, lunge: 10, zone: 'low', h: 0.5, trail: 0 });
  mv('xbSuper', { name: 'Marionette', type: 'super', pose: 'point', su: 0.12, catchType: 'melee', lunge: 6, reach: 2.0, rad: 1.2, close: 5, seq: 'marionette', dmg: 300, kb: [4, -14], zone: 'mid' });
  mv('xbQF', { name: 'Puppet Strings', type: 'act', act: 'puppet', pose: 'point', su: 0.16, rc: 0.3, range: 6.5, trail: 0, sfx: 'jguard', desc: 'She takes hold of them from 6.5 m: for 2.5 s their legs are hers, and they walk to her whatever they push.' });
  mv('xbQB', { name: 'Hemorrhage', pose: 'palm', su: 0.1, ac: 0.07, rc: 0.3, dmg: 24, reach: 1.6, stun: 0.5, bleed: 5, trail: 0, sfx: 'heavy', desc: 'A touch that opens them up: for 5 s every metre they move (or are knocked) costs them HP.' });
  mv('xbDP', { name: 'Puppet Toss', type: 'act', act: 'puppetToss', pose: 'hurl', su: 0.14, rc: 0.34, range: 4.2, trail: 0, sfx: 'whoosh', desc: 'A grab from 4.2 m that no guard stops: she lifts them over her head and throws them behind her.' });
  mv('xbTossHit', { name: 'Puppet Toss', type: 'melee', dmg: 52, kb: [11, 11], launch: 1, stun: 0.6, trail: 0 });
  C('blood', 'xbQF', 'xbQB', 'xbDP');

  // LAVA · molten fists: a hook, a knee, the eruption; pause and a basalt bash
  mv('xlA', { name: 'Magma Fist', pose: 'punch', su: 0.08, ac: 0.07, rc: 0.18, dmg: 28, reach: 1.15, kb: [3, 0], lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xlB' } });
  mv('xlB', { name: 'Cinder Hook', pose: 'hook', su: 0.08, dmg: 30, reach: 1.15, stun: 0.55, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xlC', p: 'xlP' } });
  mv('xlC', { name: 'Slag Knee', pose: 'knee', su: 0.07, ac: 0.07, rc: 0.2, dmg: 30, reach: 0.95, kb: [3.5, 0], stun: 0.7, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xlD' } });
  mv('xlD', { name: 'Eruption Upper', pose: 'uppercut', su: 0.1, ac: 0.08, rc: 0.26, dmg: 46, reach: 1.1, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, burn: [8, 2], trail: 0, sfx: 'heavy' });
  mv('xlP', { name: 'Basalt Bash', pose: 'bash', su: 0.1, ac: 0.08, rc: 0.3, dmg: 40, reach: 1.05, crumple: 1.0, lunge: 3, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('xlAirA', { name: 'Ember Kick', pose: 'airKick', su: 0.07, dmg: 28, kb: [3, 4], air: 1, reach: 1.15, h: 0.9, trail: 0, sfx: 'heavy', nx: { l: 'xlAirB' } });
  mv('xlAirB', { name: 'Meteor', pose: 'slam', su: 0.1, ac: 0.3, rc: 0.25, dmg: 48, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.1, h: 0.5, burn: [5, 1.5], trail: 0, sfx: 'heavy' });
  mv('xlHeavy', { name: 'Molten Fist', pose: 'hookL', su: 0.2, ac: 0.08, rc: 0.3, dmg: 84, reach: 1.15, rad: 0.95, kb: [19, 5], launch: 1, lunge: 5, charge: 1, armor: 1, oneArmor: 1, burn: [8, 2], trail: 0, sfx: 'heavy' });
  mv('xlLaunch', { name: 'Lava Spout', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, burn: [5, 1.5], trail: 0, sfx: 'heavy' });
  mv('xlAirH', { name: 'Magma Drop', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.24, dmg: 54, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('xlSpecial', { name: 'Magma Spit', type: 'proj', proj: 'magma', pose: 'pitchL', su: 0.14, rc: 0.3, dmg: 46, kb: [8, 8], launch: 1, range: 7, burn: [10, 2], trail: 0, sfx: 'whoosh' });
  mv('xlDash', { name: 'Molten Slide', pose: 'slide', su: 0.08, ac: 0.14, rc: 0.3, dmg: 38, kb: [3.5, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, burn: [5, 1.5], trail: 0, sfx: 'heavy' });
  mv('xlSuper', { name: 'Volcano', type: 'super', pose: 'palmUp', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.25, rad: 1.15, close: 5, seq: 'volcano', dmg: 300, kb: [4, -14], zone: 'mid' });
  mv('xlQF', { name: 'Lava Flow', type: 'trap', pose: 'stomp', su: 0.16, rc: 0.28, reach: 1.4, trap: { look: 'lava', col: 0xff6a1a, r: 1.3, life: 4, drift: 2.2, aura: { burn: [10, 2], hit: 'xlFlowHit' } }, trail: 0, sfx: 'heavy', desc: 'A river of lava rolls out ahead of her for 4 s: anyone it runs over is BURNING and battered every half second.' });
  mv('xlFlowHit', { name: 'Lava Flow', dmg: 9, kb: [2, 0], stun: 0.25, trail: 0 });
  mv('xlQB', { name: 'Obsidian Shell', type: 'buff', pose: 'meditate', su: 0.08, rc: 1.45, buff: { id: 'shell', t: 1.4 }, trail: 0, sfx: 'heavy', desc: 'She sets into obsidian for 1.4 s: nothing touches her and she can\'t move; then it erupts, throwing anyone within 2.8 m.' });
  mv('xlErupt', { name: 'Obsidian Burst', dmg: 54, kb: [16, 6], launch: 1, burn: [8, 2], trail: 0 });
  mv('xlDP', { name: 'Eruption', pose: 'uppercut', su: 0.06, ac: 0.16, rc: 0.38, dmg: 56, reach: 1.0, rad: 1.1, h: 1.5, kb: [2, 13.5], launch: 1, launcher: 1, rise: 9, lunge: 3, inv: 1, burn: [10, 2], puff: 0xff7a1a, act: 'lavaPool', trail: 0, sfx: 'heavy', desc: 'She rides a spout of magma up, invincible as it starts: a launcher that sets them BURNING, and it leaves a pool of lava where she stood.' });
  mv('xlPool', { name: 'Lava Pool', type: 'trap', reach: 0.01, trap: { look: 'lava', col: 0xff6a1a, r: 1.2, life: 3, aura: { burn: [8, 2] } }, trail: 0 });
  C('lava', 'xlQF', 'xlQB', 'xlDP');

  // LIGHTNING · sparks: a jab, a cross, a knee, the thunder rise; pause and a jolt locks them up
  mv('xzA', { name: 'Spark Jab', pose: 'jabR', su: 0.05, dmg: 22, reach: 1.15, lunge: 3, trail: 0, nx: { l: 'xzB' } });
  mv('xzB', { name: 'Arc Cross', pose: 'punch', su: 0.07, dmg: 26, reach: 1.2, stun: 0.5, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xzC', p: 'xzP' } });
  mv('xzC', { name: 'Static Knee', pose: 'knee', su: 0.07, ac: 0.07, rc: 0.2, dmg: 28, reach: 0.95, kb: [3.5, 0], stun: 0.7, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xzD' } });
  mv('xzD', { name: 'Thunder Rise', pose: 'uppercut', su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.1, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('xzP', { name: 'Jolt', pose: 'palm', su: 0.07, ac: 0.07, rc: 0.3, dmg: 20, reach: 1.15, crumple: 0.9, finisher: 1, trail: 0, sfx: 'jguard' });
  mv('xzAirA', { name: 'Arc Kick', pose: 'airKick', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.2, trail: 0, nx: { l: 'xzAirB' } });
  mv('xzAirB', { name: 'Thunderclap', pose: 'axeKick', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('xzHeavy', { name: 'Lightning Bolt', type: 'proj', proj: 'zap', pose: 'point', su: 0.18, rc: 0.3, dmg: 62, kb: [17, 5], launch: 1, range: 11, charge: 1, round: 1, trail: 0, sfx: 'shot' });
  mv('xzDry', { name: 'Storm Fist', pose: 'hookL', su: 0.17, ac: 0.08, rc: 0.3, dmg: 64, reach: 1.15, rad: 0.95, kb: [17, 5], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('xzLaunch', { name: 'Thunder Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('xzAirH', { name: 'Strike Down', pose: 'slam', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('xzSpecial', { name: 'Thunderstrike', type: 'proj', proj: 'smite', pose: 'point', su: 0.1, rc: 0.3, dmg: 50, kb: [3, 10], launch: 1, range: 9, smite: { rad: 1.1, col: 0xffe83a, delay: 0.26, pillar: 1, sfx: 'boom' }, trail: 0 });
  mv('xzDash', { name: 'Flash Step', pose: 'lunge', su: 0.07, ac: 0.12, rc: 0.28, dmg: 36, reach: 1.3, kb: [4, 9], launch: 1, lunge: 11, zone: 'low', h: 0.5, trail: 0, sfx: 'whoosh' });
  mv('xzSuper', { name: 'Thunderhead', type: 'super', pose: 'point', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.25, rad: 1.15, close: 5, seq: 'thunderhead', dmg: 300, kb: [4, -14], zone: 'mid' });
  mv('xzQF', { name: 'Ball Lightning', type: 'act', act: 'ballLightning', pose: 'cast', su: 0.18, rc: 0.3, trail: 0, sfx: 'whoosh', desc: 'A slow ball of lightning that drifts after them for 4.5 s and zaps them three times when it gets close.' });
  mv('xzOrbZap', { name: 'Ball Lightning', dmg: 14, kb: [1, 0], stun: 0.35, trail: 0 });
  mv('xzOrbLast', { name: 'Ball Lightning', dmg: 24, kb: [9, 6], launch: 1, stun: 0.5, trail: 0 });
  mv('xzQB', { name: 'Static Cage', type: 'trap', pose: 'stomp', su: 0.16, rc: 0.28, reach: 2.2, trap: { look: 'ring', col: 0x7ae8ff, r: 2.0, life: 6, aura: { hit: 'xzCageZap' } }, trail: 0, sfx: 'jguard', desc: 'A ring of crackling static on the floor 2.2 m ahead for 6 s: anyone standing in it is shocked every half second.' });
  mv('xzCageZap', { name: 'Static Cage', dmg: 10, kb: [1.5, 0], stun: 0.3, trail: 0 });
  mv('xzDP', { name: 'Lightning Rod', type: 'act', act: 'rod', pose: 'point', su: 0.08, rc: 0.32, range: 7, trail: 0, sfx: 'jguard', desc: 'An anti-air from anywhere: if they\'re in the air within 7 m, lightning strikes them and drives them into the floor.' });
  mv('xzRodHit', { name: 'Lightning Rod', dmg: 54, kb: [2, -14], launch: 1, spike: 1, trail: 0 });
  C('storm', 'xzQF', 'xzQB', 'xzDP');

  // EXPLOSION · pops: a jab, a snap hook, a bursting knee, the upblast; pause and a flashbang
  mv('xxA', { name: 'Pop Jab', pose: 'jabR', su: 0.05, dmg: 22, reach: 1.15, lunge: 3, trail: 0, nx: { l: 'xxB' } });
  mv('xxB', { name: 'Snap Hook', pose: 'hook', su: 0.07, dmg: 26, reach: 1.15, stun: 0.5, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xxC', p: 'xxP' } });
  mv('xxC', { name: 'Burst Knee', pose: 'knee', su: 0.07, ac: 0.07, rc: 0.2, dmg: 30, reach: 0.95, kb: [3.5, 0], stun: 0.7, lunge: 3, blast: 1, trail: 0, sfx: 'heavy', nx: { l: 'xxD' } });
  mv('xxD', { name: 'Upblast', pose: 'uppercut', su: 0.09, ac: 0.08, rc: 0.25, dmg: 44, reach: 1.1, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, blast: 1, trail: 0, sfx: 'heavy' });
  mv('xxP', { name: 'Flashbang', pose: 'palm', su: 0.07, ac: 0.07, rc: 0.3, dmg: 22, reach: 1.1, rad: 1.0, dizzy: 1.1, blast: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('xxAirA', { name: 'Pop Kick', pose: 'airKick', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.2, trail: 0, nx: { l: 'xxAirB' } });
  mv('xxAirB', { name: 'Blast Dive', pose: 'axeKick', su: 0.09, ac: 0.3, rc: 0.24, dmg: 46, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.2, h: 0.5, blast: 1, trail: 0, sfx: 'heavy' });
  mv('xxHeavy', { name: 'Spark Shot', type: 'proj', proj: 'sparkShot', pose: 'pitchL', su: 0.17, rc: 0.3, dmg: 68, kb: [18, 5], launch: 1, range: 8, charge: 1, round: 1, blast: 1, trail: 0, sfx: 'whoosh' });
  mv('xxDry', { name: 'Blast Palm', pose: 'dragonPalm', su: 0.17, ac: 0.08, rc: 0.3, dmg: 64, reach: 1.15, rad: 1.0, kb: [18, 5], launch: 1, lunge: 4, charge: 1, blast: 1, trail: 0, sfx: 'heavy' });
  mv('xxLaunch', { name: 'Rocket Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13.5], launch: 1, launcher: 1, blast: 1, trail: 0, sfx: 'heavy' });
  mv('xxAirH', { name: 'Crater Drop', pose: 'slam', su: 0.12, ac: 0.1, rc: 0.24, dmg: 54, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, blast: 1, trail: 0, sfx: 'heavy' });
  mv('xxSpecial', { name: 'Sticky Charge', pose: 'palm', su: 0.1, ac: 0.07, rc: 0.28, dmg: 12, reach: 1.25, stun: 0.45, sticky: 1, trail: 0, sfx: 'jguard' });
  mv('xxStickyBoom', { name: 'Sticky Charge', dmg: 60, kb: [16, 7], launch: 1, stun: 0.5, blast: 1, trail: 0 });
  mv('xxDash', { name: 'Rocket Rush', pose: 'tackle', su: 0.1, ac: 0.12, rc: 0.3, dmg: 40, kb: [4, 9], launch: 1, lunge: 10, zone: 'low', h: 0.5, blast: 1, trail: 0, sfx: 'heavy' });
  mv('xxSuper', { name: 'Chain Reaction', type: 'super', pose: 'point', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.25, rad: 1.15, close: 5, seq: 'chainReaction', dmg: 300, kb: [22, 7], zone: 'mid' });
  mv('xxQF', { name: 'Blast Mine', type: 'trap', pose: 'stomp', su: 0.14, rc: 0.26, reach: 1.8, trap: { look: 'mine', col: 0xff8a1a, r: 0.9, life: 9, hit: 'xxMineBoom', call: 'BOOM!', sfx: 'boom' }, trail: 0, sfx: 'whoosh', desc: 'A charge pressed into the floor 1.8 m ahead (9 s): the first foot on it goes up, a KNOCK.' });
  mv('xxMineBoom', { name: 'Blast Mine', dmg: 56, kb: [14, 9], launch: 1, stun: 0.5, blast: 1, trail: 0 });
  mv('xxQB', { name: 'Rocket Jump', type: 'radial', pose: 'stomp', su: 0.08, ac: 0.08, rc: 0.3, dmg: 30, rad: 1.6, kb: [10, 6], launch: 1, recoil: 7, recoilUp: 12, blast: 1, ringCol: 0xff8a1a, puff: 0xff8a1a, trail: 0, sfx: 'boom', desc: 'He blows himself up and back out of trouble: anyone right beside him is thrown, and he lands well clear.' });
  mv('xxDP', { name: 'Detonation', type: 'radial', pose: 'burst', su: 0.2, ac: 0.1, rc: 0.45, dmg: 96, rad: 3.2, kb: [21, 7], launch: 1, inv: 1, blast: 1, act: 'detonate', ringCol: 0xff8a1a, puff: 0xff8a1a, trail: 0, sfx: 'boom', desc: 'He goes off like a bomb, invincible as it builds: a huge KNOCK all round him (3.2 m), and it costs him 6% of his HP.' });
  C('blast', 'xxQF', 'xxQB', 'xxDP');

  // METAL · iron fists: a jab, a hook, a plated knee, the uppercut; pause and a cable lashes them in
  mv('xmA', { name: 'Iron Jab', pose: 'jabR', su: 0.06, dmg: 26, reach: 1.15, kb: [3, 0], lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xmB' } });
  mv('xmB', { name: 'Steel Hook', pose: 'hook', su: 0.08, dmg: 30, reach: 1.15, stun: 0.55, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xmC', p: 'xmP' } });
  mv('xmC', { name: 'Plate Knee', pose: 'knee', su: 0.07, ac: 0.07, rc: 0.2, dmg: 30, reach: 0.95, kb: [3.5, 0], stun: 0.7, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xmD' } });
  mv('xmD', { name: 'Iron Uppercut', pose: 'uppercut', su: 0.1, ac: 0.08, rc: 0.26, dmg: 46, reach: 1.1, kb: [1.4, 13.5], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'heavy' });
  mv('xmP', { name: 'Cable Lash', pose: 'slashB', su: 0.09, ac: 0.08, rc: 0.3, dmg: 24, reach: 2.2, kb: [-3, 0], crumple: 0.9, finisher: 1, sfx: 'whoosh' });
  mv('xmAirA', { name: 'Steel Kick', pose: 'airKick', su: 0.07, dmg: 28, kb: [3, 4], air: 1, reach: 1.15, h: 0.9, trail: 0, sfx: 'heavy', nx: { l: 'xmAirB' } });
  mv('xmAirB', { name: 'Anvil Drop', pose: 'slam', su: 0.1, ac: 0.3, rc: 0.25, dmg: 48, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.1, h: 0.5, trail: 0, sfx: 'heavy' });
  mv('xmHeavy', { name: 'Iron Fist', pose: 'hookL', su: 0.19, ac: 0.08, rc: 0.3, dmg: 82, reach: 1.15, rad: 0.95, kb: [19, 5], launch: 1, lunge: 5, charge: 1, armor: 1, oneArmor: 1, trail: 0, sfx: 'heavy' });
  mv('xmLaunch', { name: 'Girder Upper', pose: 'uppercutL', su: 0.1, ac: 0.08, rc: 0.27, dmg: 40, kb: [1.2, 13], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('xmAirH', { name: 'Anvil Fall', pose: 'overhandL', su: 0.13, ac: 0.1, rc: 0.25, dmg: 56, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('xmSpecial', { name: 'Shrapnel', type: 'proj', proj: 'shrapnel', pose: 'pitchL', su: 0.14, rc: 0.3, dmg: 40, kb: [9, 5], launch: 1, range: 7, trail: 0, sfx: 'whoosh' });
  mv('xmDash', { name: 'Steel Slide', pose: 'slide', su: 0.08, ac: 0.14, rc: 0.3, dmg: 38, kb: [3.5, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'heavy' });
  mv('xmSuper', { name: 'Foundry', type: 'super', pose: 'punch', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.25, rad: 1.15, close: 5, seq: 'foundry', dmg: 300, kb: [21, 8], zone: 'mid' });
  mv('xmQF', { name: 'Cable Zip', type: 'dash', pose: 'lunge', su: 0.12, ac: 0.16, rc: 0.3, dmg: 46, dist: 7, rad: 1.0, kb: [14, 5], launch: 1, trail: 0, sfx: 'whoosh', desc: 'A cable fired at the far side and he zips along it, 7 m in a blink: a KNOCK on anyone in the way.' });
  mv('xmQB', { name: 'Magnetize', pose: 'palm', su: 0.1, ac: 0.07, rc: 0.3, dmg: 20, reach: 1.4, kb: [0, 0], stun: 0.6, magnet: 1, trail: 0, sfx: 'jguard', desc: 'He magnetises them: they slam into the nearest wall and stick there (PINNED for 1.4 s).' });
  mv('xmDP', { name: 'Iron Spikes', type: 'radial', pose: 'stomp', su: 0.06, ac: 0.1, rc: 0.36, dmg: 50, rad: 2.2, kb: [3, 12.5], launch: 1, launcher: 1, gbreak: 1, inv: 1, ringCol: 0xd8dde6, puff: 0x8a8a92, trail: 0, sfx: 'heavy', desc: 'Iron spikes burst from the floor all round him, invincible as they start: anyone within 2.2 m goes up, and a guard they hit shatters.' });
  C('metal', 'xmQF', 'xmQB', 'xmDP');

  // SPIRIT · lantern light: palms, a wisp strike, a soul kick, the ascent; pause and she grasps the soul
  mv('xsA', { name: 'Spirit Palm', pose: 'palm', su: 0.06, dmg: 22, reach: 1.35, lunge: 4, trail: 0, nx: { l: 'xsB' } });
  mv('xsB', { name: 'Wisp Strike', pose: 'slashB', su: 0.07, dmg: 25, reach: 1.35, stun: 0.5, lunge: 3, nx: { l: 'xsC', p: 'xsP' } });
  mv('xsC', { name: 'Soul Kick', pose: 'spinKick', su: 0.08, ac: 0.18, rc: 0.18, dmg: 15, multi: 2, around: 1, rad: 1.4, kb: [3, 0], stun: 0.45, trail: 0, nx: { l: 'xsD' } });
  mv('xsD', { name: 'Ascend', pose: 'palmUp', su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.25, kb: [1.6, 13.5], launch: 1, launcher: 1, finisher: 1, trail: 0, sfx: 'whoosh' });
  mv('xsP', { name: 'Soul Grasp', pose: 'point', su: 0.08, ac: 0.08, rc: 0.28, dmg: 16, reach: 1.6, dizzy: 1.0, finisher: 1, trail: 0, sfx: 'jguard', zone: 'high' });
  mv('xsAirA', { name: 'Drift Kick', pose: 'airKick', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.25, trail: 0, nx: { l: 'xsAirB' } });
  mv('xsAirB', { name: 'Descent', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.25, h: 0.5, sfx: 'heavy' });
  mv('xsHeavy', { name: 'Spirit Lance', type: 'proj', proj: 'spiritLance', pose: 'point', su: 0.18, rc: 0.3, dmg: 64, kb: [16, 5.5], launch: 1, range: 9, charge: 1, round: 1, trail: 0, sfx: 'whoosh' });
  mv('xsDry', { name: 'Lantern Palm', pose: 'dragonPalm', su: 0.16, ac: 0.08, rc: 0.3, dmg: 60, reach: 1.3, rad: 1.0, kb: [16, 5.5], launch: 1, lunge: 5, charge: 1, trail: 0, sfx: 'heavy' });
  mv('xsLaunch', { name: 'Lift Up', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, kb: [1.2, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'whoosh' });
  mv('xsAirH', { name: 'Spirit Drop', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('xsSpecial', { name: 'Spirit Pulse', type: 'radial', pose: 'burst', su: 0.12, ac: 0.08, rc: 0.3, dmg: 24, rad: 2.3, kb: [11, 3], launch: 1, dizzy: 0.9, ringCol: 0xc8a8ff, puff: 0xc8a8ff, trail: 0, sfx: 'whoosh' });
  mv('xsDash', { name: 'Drift', pose: 'slide', su: 0.07, ac: 0.14, rc: 0.28, dmg: 34, kb: [3, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('xsSuper', { name: 'Spirit World', type: 'super', pose: 'cast', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.3, rad: 1.15, close: 5, seq: 'spiritWorld', dmg: 300, kb: [4, -14], zone: 'mid' });
  mv('xsQF', { name: 'Crossing Over', type: 'act', act: 'swap', pose: 'cast', su: 0.12, rc: 0.22, range: 9, trail: 0, sfx: 'dodge', desc: 'She and they trade places, from up to 9 m: she\'s where they were, and they\'re facing the wrong way.' });
  mv('xsQB', { name: 'Soul Tether', type: 'act', act: 'tether', pose: 'point', su: 0.16, rc: 0.3, range: 6, trail: 0, sfx: 'jguard', desc: 'A thread of light to them (6 m): for 5 s, while they stay within 6.5 m, she drinks 1.6% of their HP a second.' });
  mv('xsDP', { name: 'Spirit Ward', type: 'buff', pose: 'meditate', su: 0.05, rc: 0.24, buff: { id: 'ward', t: 2 }, trail: 0, sfx: 'jguard', desc: 'For 2 s the next blow passes through her: she reappears behind whoever threw it.' });
  C('spirit', 'xsQF', 'xsQB', 'xsDP');

  // SWAMP · vines and mud: a lash, a slap, a snaring root, the bog rise; pause and mud in the eyes
  mv('xqA', { name: 'Vine Lash', pose: 'slashA', su: 0.06, dmg: 23, reach: 1.65, lunge: 3, nx: { l: 'xqB' } });
  mv('xqB', { name: 'Mud Slap', pose: 'palm', su: 0.07, dmg: 25, reach: 1.3, stun: 0.5, lunge: 3, trail: 0, sfx: 'heavy', nx: { l: 'xqC', p: 'xqP' } });
  mv('xqC', { name: 'Root Snare', pose: 'slashB', su: 0.07, ac: 0.07, rc: 0.2, dmg: 28, reach: 1.6, kb: [-1.5, 0], stun: 0.7, lunge: 2, zone: 'low', nx: { l: 'xqD' } });
  mv('xqD', { name: 'Bog Rise', pose: 'upslash', su: 0.09, ac: 0.08, rc: 0.25, dmg: 42, reach: 1.5, kb: [2, 13], launch: 1, launcher: 1, finisher: 1 });
  mv('xqP', { name: 'Mud Toss', pose: 'sandToss', su: 0.07, ac: 0.08, rc: 0.28, dmg: 10, reach: 1.2, dizzy: 1.1, finisher: 1, trail: 0, sfx: 'whoosh', zone: 'high' });
  mv('xqAirA', { name: 'Vine Whip', pose: 'slashA', su: 0.06, dmg: 24, kb: [3, 4.5], air: 1, h: 1, reach: 1.5, nx: { l: 'xqAirB' } });
  mv('xqAirB', { name: 'Mire Drop', pose: 'overhead', su: 0.09, ac: 0.3, rc: 0.24, dmg: 44, kb: [2, -13], launch: 1, spike: 1, dive: 1, air: 1, reach: 1.3, h: 0.5, sfx: 'heavy' });
  mv('xqHeavy', { name: 'Thornwhip', pose: 'twoHandDiag', su: 0.2, ac: 0.08, rc: 0.3, dmg: 76, reach: 2.3, rad: 1.0, kb: [18, 5], launch: 1, lunge: 3, charge: 1, sfx: 'heavy' });
  mv('xqLaunch', { name: 'Root Spring', pose: 'palmUp', su: 0.1, ac: 0.08, rc: 0.27, dmg: 38, reach: 1.4, kb: [1.2, 13.5], launch: 1, launcher: 1, trail: 0, sfx: 'heavy' });
  mv('xqAirH', { name: 'Mire Fall', pose: 'overhandL', su: 0.12, ac: 0.1, rc: 0.24, dmg: 52, kb: [2, -14], launch: 1, spike: 1, air: 1, h: 0.6, trail: 0, sfx: 'heavy' });
  mv('xqSpecial', { name: 'Sinking Mud', type: 'trap', pose: 'stomp', su: 0.14, rc: 0.26, reach: 2.0, trap: { look: 'mud', col: 0x5a4a2a, r: 2.0, life: 6, aura: { slow: 1 } }, trail: 0, sfx: 'heavy' });
  mv('xqDash', { name: 'Mud Slide', pose: 'slide', su: 0.07, ac: 0.14, rc: 0.28, dmg: 34, kb: [3, 8.5], launch: 1, lunge: 10, zone: 'low', h: 0.35, trail: 0, sfx: 'whoosh' });
  mv('xqSuper', { name: 'Swallowing Bog', type: 'super', pose: 'stomp', su: 0.12, catchType: 'melee', lunge: 7, reach: 1.4, rad: 1.15, close: 5, seq: 'bog', dmg: 300, kb: [4, -14], zone: 'mid' });
  mv('xqQF', { name: 'Creeping Vines', type: 'act', act: 'vines', pose: 'stomp', su: 0.16, rc: 0.3, trail: 0, sfx: 'whoosh', desc: 'Roots creep along the floor after them for up to 11 m: they catch the first feet they reach, ROOTED for 2 s.' });
  mv('xqVineHit', { name: 'Creeping Vines', dmg: 28, kb: [0.5, 0], stun: 0.5, root: 2, trail: 0 });
  mv('xqQB', { name: 'Bog Body', type: 'act', act: 'bogDive', pose: 'meditate', su: 0.12, rc: 0.72, trail: 0, sfx: 'whoosh', desc: 'She sinks into the mud (nothing touches her) and comes up under them half a second later: a launcher, wherever they are.' });
  mv('xqBogUp', { name: 'Bog Body', dmg: 46, kb: [1.5, 13], launch: 1, launcher: 1, stun: 0.5, trail: 0 });
  mv('xqDP', { name: 'Swamp Gas', type: 'radial', pose: 'burst', su: 0.06, ac: 0.1, rc: 0.38, dmg: 20, rad: 2.6, kb: [6, 3], launch: 1, poison: [10, 3], dizzy: 1.2, inv: 1, ringCol: 0xb8e85a, puff: 0x8ab83a, trail: 0, sfx: 'whoosh', desc: 'A belch of marsh gas all round her, invincible as it starts: anyone within 2.6 m is POISONED and DIZZY.' });
  C('swamp', 'xqQF', 'xqQB', 'xqDP');

  /* -------------------------------------------------------------- the parts */
  const CHI = (name, rounds, reload) => ({ rounds, reload, ammo: name, ammoOut: 'OUT OF ' + name, ammoIn: name + ' BACK' });
  P.air = {
    head: { name: 'Wind Hood', armor: 105, weight: 0.88, special: 'xaSpecial', uses: 3, hype: 1.05, desc: 'SPECIAL: Gale Step. An invincible gust that carries her 5 m straight through them, leaving them DIZZY.' },
    core: { name: 'Sky Robes', hp: 930, def: 0.03, weight: 0.85, guard: 0, desc: 'Layers of pale cloth that catch the wind. Light: she flies far.' },
    armR: { name: 'Gale Hand', armor: 120, weight: 0.88, light: 'xaA', air: 'xaAirA', sig: 'gale', sigName: 'Gale Force', sigDesc: 'Her Heavy KNOCKs throw them 25% further (they hit the wall harder).', trail: 0xd8f4ff, desc: 'Gust Palm › Twin Gust › Spiral Kick › Updraft (launches up). Pause after Twin Gust: Vacuum Palm, sucked in and folded up. Air: Wind Slice › Downdraft. SIGNATURE: gale force.' },
    armL: Object.assign({ name: 'Wind Wraps', armor: 115, weight: 0.88, heavy: 'xaHeavy', launch: 'xaLaunch', airHeavy: 'xaAirH', dry: { heavy: 'xaDry' }, guard: 80, chip: 1.1, trail: 0xd8f4ff, desc: 'HEAVY: Air Blast, a KNOCK from 8 m. THREE BREATHS; then she breathes in for 4 s, and Heavy is the Gale Palm. Guard: weak.' }, CHI('BREATH', 3, 4)),
    legs: { name: 'Feather Steps', armor: 145, weight: 0.85, speed: 6.8, jump: 13, airJumps: 2, dashAtk: 'xaDash', perk: 'skyward', desc: 'Skyward: a triple jump, and air dodges go 35% further. DASH ATTACK: Wind Sweep.' },
    card: { name: 'Eye of the Storm', super: 'xaSuper', passive: 'windstep', desc: 'LEGEND ART: Eye of the Storm, a tornado lifts them, spins them and she brings them down. PASSIVE (Windstep): for 0.6 s after a dodge, her hits deal +20%.' },
  };
  P.water = {
    head: { name: 'Tide Circlet', armor: 110, weight: 0.94, special: 'xwSpecial', uses: 3, hype: 1.05, desc: 'SPECIAL: Healing Water. Water wraps her for 5 s and heals 12% of her HP.' },
    core: { name: 'Riverweave Parka', hp: 980, def: 0.05, weight: 0.96, guard: 5, desc: 'A fur-trimmed parka, river blue. Even all round.' },
    armR: { name: 'Water Whip', armor: 125, weight: 0.95, light: 'xwA', air: 'xwAirA', sig: 'chill', sigName: 'Cold Snap', sigDesc: 'Her Lights deal +25% to anyone ROOTED, FROZEN or SLOWED.', trail: 0x7ad8ff, desc: 'Water Whip › Backlash › Twin Streams › Wave Rise (launches up). Pause after Backlash: Ice Shackle, they fold and their feet freeze. Air: Spray › Waterfall. SIGNATURE: cold snap.' },
    armL: Object.assign({ name: 'Waterskin', armor: 120, weight: 0.95, heavy: 'xwHeavy', launch: 'xwLaunch', airHeavy: 'xwAirH', dry: { heavy: 'xwDry' }, guard: 95, chip: 1, trail: 0x7ad8ff, desc: 'HEAVY: Water Jet, a KNOCK from 8.5 m. THREE JETS; then the skin refills for 4 s, and Heavy is the Tide Palm. Guard: medium.' }, CHI('WATER', 3, 4)),
    legs: { name: 'Shore Boots', armor: 160, weight: 0.96, speed: 6.4, jump: 11, airJumps: 1, dashAtk: 'xwDash', perk: 'dancer', desc: 'Light on the ice: dodges cool down twice as fast. DASH ATTACK: Tide Slide.' },
    card: { name: 'Tidal Wave', super: 'xwSuper', passive: 'flow', desc: 'LEGEND ART: Tidal Wave, the sea stands up behind her and comes down on them. PASSIVE (Flow): +3% damage for every hit already in the combo (up to +24%).' },
  };
  P.earth = {
    head: { name: 'Stone Brow', armor: 130, weight: 1.06, special: 'xeSpecial', uses: 3, hype: 1.0, desc: 'SPECIAL: Quake Stomp. The floor jumps for 3 m round him: anyone on it is knocked flat.' },
    core: { name: 'Bedrock Vest', hp: 1080, def: 0.08, weight: 1.15, guard: 15, desc: 'Leather over a chest like a cliff. The heaviest core here.' },
    armR: { name: 'Stone Fist', armor: 145, weight: 1.1, light: 'xeA', air: 'xeAirA', sig: 'seismic', sigName: 'Seismic', sigDesc: 'His Heavies deal +15% to anyone with their feet on the floor.', trail: 0xb89a6a, desc: 'Stone Fist › Rock Hook › Earth Knee › Pillar Rise (launches up). Pause after the Hook: Rock Armour Bash (crumple). Air: Stone Kick › Meteor Drop. SIGNATURE: seismic.' },
    armL: Object.assign({ name: 'Boulder Grip', armor: 150, weight: 1.15, heavy: 'xeHeavy', launch: 'xeLaunch', airHeavy: 'xeAirH', dry: { heavy: 'xeDry' }, guard: 130, chip: 0.8, trail: 0xb89a6a, desc: 'HEAVY: Boulder Toss, a KNOCK from 7.5 m that shatters a guard. TWO BOULDERS; then he tears up more for 4.5 s, and Heavy is the Stone Hammer. Guard: strong.' }, CHI('STONE', 2, 4.5)),
    legs: { name: 'Rooted Feet', armor: 185, weight: 1.12, speed: 5.8, jump: 10, airJumps: 1, dashAtk: 'xeDash', perk: 'anchor', desc: 'Barefoot on the stone: 15% less knockback taken. DASH ATTACK: Earth Surf.' },
    card: { name: 'Tectonic', super: 'xeSuper', passive: 'rooted', desc: 'LEGEND ART: Tectonic, pillars of rock throw them up again and again, and the fist. PASSIVE (Rooted): 20% less damage while he stands still on the floor.' },
  };
  P.flame = {
    head: { name: 'Ember Topknot', armor: 115, weight: 0.98, special: 'xfSpecial', uses: 3, hype: 1.08, desc: 'SPECIAL: Fire Ring. A ring of flame bursts out round him (2.4 m): it throws them, BURNING.' },
    core: { name: 'Ash Coat', hp: 990, def: 0.05, weight: 1.0, guard: 5, desc: 'A high-collared coat, black and crimson, gold at the hem.' },
    armR: { name: 'Flame Fist', armor: 130, weight: 1.0, light: 'xfA', air: 'xfAirA', sig: 'heat', sigName: 'Inner Fire', sigDesc: 'His Lights deal up to +20% more, the more Hype he has.', trail: 0xff7a2a, desc: 'Flame Jab › Fire Fist › Flame Kick › Rising Flame (launches up, BURNING). Pause after the Fist: Flare, a flash that leaves them dizzy. Air: Fire Kick › Comet Kick. SIGNATURE: inner fire.' },
    armL: Object.assign({ name: 'Fireheart Palm', armor: 125, weight: 1.0, heavy: 'xfHeavy', launch: 'xfLaunch', airHeavy: 'xfAirH', dry: { heavy: 'xfDry' }, guard: 95, chip: 1, trail: 0xff7a2a, desc: 'HEAVY: Fireball, a KNOCK from 8 m, BURNING. THREE FLAMES; then he breathes them back up for 4 s, and Heavy is the Blaze Fist. Guard: medium.' }, CHI('FLAME', 3, 4)),
    legs: { name: 'Cinder Boots', armor: 165, weight: 1.0, speed: 6.3, jump: 11, airJumps: 1, dashAtk: 'xfDash', perk: 'sealegs', desc: 'Quick feet: dodges travel 30% further. DASH ATTACK: Blaze Rush.' },
    card: { name: 'Inferno', super: 'xfSuper', passive: 'stoke', desc: 'LEGEND ART: Inferno, a storm of burning blows and a blast of fire. PASSIVE (Stoke): the fires he sets burn 40% hotter.' },
  };
  P.blood = {
    head: { name: 'Crimson Veil', armor: 105, weight: 0.9, special: 'xbSpecial', uses: 3, hype: 1.05, desc: 'SPECIAL: Blood Pull. She clenches a fist at them from up to 4.5 m and they\'re dragged to her feet.' },
    core: { name: 'Night Gown', hp: 950, def: 0.04, weight: 0.9, guard: 0, desc: 'Black silk, a high collar and a red sash. Light.' },
    armR: { name: 'Puppeteer\'s Hand', armor: 120, weight: 0.9, light: 'xbA', air: 'xbAirA', sig: 'puppet', sigName: 'Puppeteer', sigDesc: 'Her Lights HOBBLE them for a second: no jumping, no dodging.', trail: 0xff2a4a, desc: 'Grip › Twist (pulls them in) › Wrench › Marionette Lift (launches up). All from 1.7 m: she never touches them. Pause after the Twist: Seize (crumple). Air: Claw › Drag Down. SIGNATURE: puppeteer.' },
    armL: { name: 'Grip of the Moon', armor: 115, weight: 0.9, heavy: 'xbHeavy', launch: 'xbLaunch', airHeavy: 'xbAirH', guard: 85, chip: 1.1, trail: 0xff2a4a, desc: 'HEAVY: Puppet Throw, a KNOCK from up to 3 m. Guard: weak.' },
    legs: { name: 'Silent Slippers', armor: 150, weight: 0.88, speed: 6.5, jump: 11.5, airJumps: 1, dashAtk: 'xbDash', perk: 'cloudstep', desc: 'Not a sound: two air dodges. DASH ATTACK: Crimson Rush.' },
    card: { name: 'Marionette', super: 'xbSuper', passive: 'sanguine', desc: 'LEGEND ART: Marionette, she lifts them on strings and makes them dance into the floor. PASSIVE (Sanguine): 8% of the damage she deals heals her.' },
  };
  P.lava = {
    head: { name: 'Basalt Crown', armor: 125, weight: 1.05, special: 'xlSpecial', uses: 3, hype: 1.0, desc: 'SPECIAL: Magma Spit. A glob of magma, 7 m: it throws them, BURNING.' },
    core: { name: 'Magma Hide', hp: 1060, def: 0.07, weight: 1.1, guard: 10, desc: 'Cooled rock over a glowing core. Heavy.' },
    armR: { name: 'Molten Knuckles', armor: 140, weight: 1.08, light: 'xlA', air: 'xlAirA', sig: 'slag', sigName: 'Slag', sigDesc: 'Her hits on anyone BURNING deal +15%, and keep the fire going (it starts over).', trail: 0xff6a1a, desc: 'Magma Fist › Cinder Hook › Slag Knee › Eruption Upper (launches up, BURNING). Pause after the Hook: Basalt Bash (crumple). Air: Ember Kick › Meteor. SIGNATURE: slag.' },
    armL: { name: 'Slag Gauntlet', armor: 145, weight: 1.12, heavy: 'xlHeavy', launch: 'xlLaunch', airHeavy: 'xlAirH', guard: 120, chip: 0.85, trail: 0xff6a1a, desc: 'HEAVY: Molten Fist, an armoured KNOCK that sets them BURNING. Guard: strong.' },
    legs: { name: 'Obsidian Greaves', armor: 175, weight: 1.1, speed: 5.9, jump: 10.5, airJumps: 1, dashAtk: 'xlDash', perk: 'unstoppable', desc: 'Dash attacks carry armour against one hit. DASH ATTACK: Molten Slide.' },
    card: { name: 'Volcano', super: 'xlSuper', passive: 'molten', desc: 'LEGEND ART: Volcano, the floor erupts under them and she brings them down into it. PASSIVE (Molten): anyone who hits her up close is BURNED.' },
  };
  P.storm = {
    head: { name: 'Storm Crown', armor: 110, weight: 0.94, special: 'xzSpecial', uses: 3, hype: 1.05, desc: 'SPECIAL: Thunderstrike. A mark where they stand (9 m), and a heartbeat later lightning strikes it, throwing them up.' },
    core: { name: 'Thunder Cloak', hp: 970, def: 0.05, weight: 0.95, guard: 5, desc: 'Navy and white, crackling at the hem.' },
    armR: { name: 'Spark Hand', armor: 125, weight: 0.94, light: 'xzA', air: 'xzAirA', sig: 'static', sigName: 'Static', sigDesc: 'Every Light she lands takes 3 Hype from them and gives it to her.', trail: 0x7ae8ff, desc: 'Spark Jab › Arc Cross › Static Knee › Thunder Rise (launches up). Pause after the Cross: Jolt (crumple). Air: Arc Kick › Thunderclap. SIGNATURE: static.' },
    armL: Object.assign({ name: 'Conductor Bracer', armor: 120, weight: 0.95, heavy: 'xzHeavy', launch: 'xzLaunch', airHeavy: 'xzAirH', dry: { heavy: 'xzDry' }, guard: 90, chip: 1, trail: 0x7ae8ff, desc: 'HEAVY: Lightning Bolt, a KNOCK from 11 m, and fast. THREE CHARGES; then the bracer charges for 4 s, and Heavy is the Storm Fist. Guard: medium.' }, CHI('CHARGE', 3, 4)),
    legs: { name: 'Flash Boots', armor: 155, weight: 0.92, speed: 6.7, jump: 11.5, airJumps: 1, dashAtk: 'xzDash', perk: 'sealegs', desc: 'Lightning-quick: dodges travel 30% further. DASH ATTACK: Flash Step.' },
    card: { name: 'Thunderhead', super: 'xzSuper', passive: 'charged', desc: 'LEGEND ART: Thunderhead, the sky goes dark and strikes them over and over, then once more, down. PASSIVE (Charged): every fifth hit she lands is a DISCHARGE, +50% damage.' },
  };
  P.blast = {
    head: { name: 'Blast Goggles', armor: 120, weight: 1.0, special: 'xxSpecial', uses: 3, hype: 1.05, desc: 'SPECIAL: Sticky Charge. A tap that sticks a charge on them: 2 s later it goes off (a KNOCK, through any guard).' },
    core: { name: 'Sapper\'s Apron', hp: 1010, def: 0.06, weight: 1.04, guard: 5, desc: 'Scorched leather and pockets of powder.' },
    armR: { name: 'Spark Knuckle', armor: 130, weight: 1.02, light: 'xxA', air: 'xxAirA', sig: 'demo', sigName: 'Demolition', sigDesc: 'His hits break their parts 40% faster.', trail: 0xffb040, desc: 'Pop Jab › Snap Hook › Burst Knee › Upblast (launches up). Pause after the Hook: Flashbang (dizzy). Air: Pop Kick › Blast Dive. SIGNATURE: demolition.' },
    armL: Object.assign({ name: 'Detonator Glove', armor: 125, weight: 1.02, heavy: 'xxHeavy', launch: 'xxLaunch', airHeavy: 'xxAirH', dry: { heavy: 'xxDry' }, guard: 95, chip: 1, trail: 0xffb040, desc: 'HEAVY: Spark Shot, a KNOCK from 8 m that bursts. THREE SPARKS; then the glove primes for 4 s, and Heavy is the Blast Palm. Guard: medium.' }, CHI('SPARK', 3, 4)),
    legs: { name: 'Blast-Proof Boots', armor: 170, weight: 1.04, speed: 6.1, jump: 10.5, airJumps: 1, dashAtk: 'xxDash', perk: 'unstoppable', desc: 'Dash attacks carry armour against one hit. DASH ATTACK: Rocket Rush.' },
    card: { name: 'Chain Reaction', super: 'xxSuper', passive: 'volatile', desc: 'LEGEND ART: Chain Reaction, one snap and the explosions run up their body to a big one. PASSIVE (Volatile): his Heavy KNOCKs deal +20%, and he takes 10% more.' },
  };
  P.metal = {
    head: { name: 'Iron Visor', armor: 135, weight: 1.08, special: 'xmSpecial', uses: 3, hype: 1.0, desc: 'SPECIAL: Shrapnel. Four shards of iron in a fan, 7 m: a little KNOCK.' },
    core: { name: 'Plated Vest', hp: 1050, def: 0.08, weight: 1.12, guard: 15, desc: 'Steel plates riveted over green canvas. Heavy.' },
    armR: { name: 'Iron Knuckles', armor: 150, weight: 1.1, light: 'xmA', air: 'xmAirA', sig: 'forge', sigName: 'Forged', sigDesc: 'A Heavy that lands makes his next Light deal +30%.', trail: 0xd8dde6, desc: 'Iron Jab › Steel Hook › Plate Knee › Iron Uppercut (launches up). Pause after the Hook: Cable Lash, 2.2 m, it hauls them in (crumple). Air: Steel Kick › Anvil Drop. SIGNATURE: forged.' },
    armL: { name: 'Cable Spool', armor: 145, weight: 1.12, heavy: 'xmHeavy', launch: 'xmLaunch', airHeavy: 'xmAirH', guard: 125, chip: 0.8, trail: 0xd8dde6, desc: 'HEAVY: Iron Fist, an armoured KNOCK. Guard: strong.' },
    legs: { name: 'Steel-Toe Boots', armor: 185, weight: 1.12, speed: 5.9, jump: 10, airJumps: 1, dashAtk: 'xmDash', perk: 'anchor', desc: 'Planted: 15% less knockback taken. DASH ATTACK: Steel Slide.' },
    card: { name: 'Foundry', super: 'xmSuper', passive: 'heavymetal', desc: 'LEGEND ART: Foundry, iron plates clamp round them and he hammers them out. PASSIVE (Heavy Metal): 25% less knockback taken.' },
  };
  P.spirit = {
    head: { name: 'Lantern Circlet', armor: 105, weight: 0.9, special: 'xsSpecial', uses: 3, hype: 1.08, desc: 'SPECIAL: Spirit Pulse. A pulse of light all round her (2.3 m): it pushes them away, DIZZY.' },
    core: { name: 'Veil of Lanterns', hp: 940, def: 0.04, weight: 0.88, guard: 0, desc: 'Violet silk hung with tiny glowing lanterns. Light.' },
    armR: { name: 'Spirit Hand', armor: 120, weight: 0.9, light: 'xsA', air: 'xsAirA', sig: 'purify', sigName: 'Cleansing Touch', sigDesc: 'A Light that lands ends one of their buffs (haste, armour, regen, power...).', trail: 0xc8a8ff, desc: 'Spirit Palm › Wisp Strike › Soul Kick › Ascend (launches up). Pause after Wisp Strike: Soul Grasp (dizzy). Air: Drift Kick › Descent. SIGNATURE: cleansing touch.' },
    armL: Object.assign({ name: 'Spirit Lantern', armor: 115, weight: 0.9, heavy: 'xsHeavy', launch: 'xsLaunch', airHeavy: 'xsAirH', dry: { heavy: 'xsDry' }, guard: 85, chip: 1.1, trail: 0xc8a8ff, desc: 'HEAVY: Spirit Lance, a KNOCK from 9 m. THREE SPIRITS; then the lantern rekindles for 4 s, and Heavy is the Lantern Palm. Guard: weak.' }, CHI('SPIRIT', 3, 4)),
    legs: { name: 'Drifting Hem', armor: 150, weight: 0.86, speed: 6.6, jump: 12.5, airJumps: 2, dashAtk: 'xsDash', perk: 'skyward', desc: 'She floats: a triple jump and long air dodges. DASH ATTACK: Drift.' },
    card: { name: 'Spirit World', super: 'xsSuper', passive: 'serene', desc: 'LEGEND ART: Spirit World, she drags them into the dark where the lanterns burn, and back out, hard. PASSIVE (Serene): after 3 s without being hit, she heals 1.5% of her HP a second.' },
  };
  P.swamp = {
    head: { name: 'Moss Crown', armor: 120, weight: 1.0, special: 'xqSpecial', uses: 3, hype: 1.0, desc: 'SPECIAL: Sinking Mud. A pool of mud 2 m ahead for 6 s: anyone in it is SLOWED.' },
    core: { name: 'Bog Cloak', hp: 1030, def: 0.06, weight: 1.05, guard: 10, desc: 'Moss, reeds and peat, and something living in it.' },
    armR: { name: 'Vine Hand', armor: 130, weight: 1.0, light: 'xqA', air: 'xqAirA', sig: 'thorns', sigName: 'Thorns', sigDesc: 'Every third Light she lands ROOTS them for 0.8 s.', trail: 0x9ab83a, desc: 'Vine Lash › Mud Slap › Root Snare › Bog Rise (launches up). Pause after the Slap: Mud Toss (dizzy). Air: Vine Whip › Mire Drop. SIGNATURE: thorns.' },
    armL: { name: 'Thornwhip', armor: 125, weight: 1.0, heavy: 'xqHeavy', launch: 'xqLaunch', airHeavy: 'xqAirH', guard: 95, chip: 1, trail: 0x9ab83a, desc: 'HEAVY: Thornwhip, a KNOCK from 2.3 m. Guard: medium.' },
    legs: { name: 'Root Feet', armor: 170, weight: 1.04, speed: 6.0, jump: 10.5, airJumps: 1, dashAtk: 'xqDash', perk: 'resolve', desc: 'Hard to uproot: 15% less damage taken below 30% HP. DASH ATTACK: Mud Slide.' },
    card: { name: 'Swallowing Bog', super: 'xqSuper', passive: 'bogborn', desc: 'LEGEND ART: Swallowing Bog, the floor turns to mire, it pulls them under, and spits them out into a vine. PASSIVE (Bog-Born): 25% less damage from shots.' },
  };

  for (const l in CMDS) P[l].head.cmd = CMDS[l];

  Object.assign(PASSIVE, {
    windstep: 'Windstep: +20% for 0.6 s after a dodge', flow: 'Flow: +3% a hit already in the combo', rooted: 'Rooted: 20% less damage standing still',
    stoke: 'Stoke: his burns are 40% hotter', sanguine: 'Sanguine: 8% of her damage heals her', molten: 'Molten: hitting her up close burns',
    charged: 'Charged: every 5th hit deals +50%', volatile: 'Volatile: Heavy KNOCKs +20%, takes 10% more', heavymetal: 'Heavy Metal: 25% less knockback',
    serene: 'Serene: heals when she isn\'t hit for 3 s', bogborn: 'Bog-Born: 25% less damage from shots',
  });
  Object.assign(PREFIX, { air: 'Gust', water: 'Tide', earth: 'Stone', flame: 'Flame', blood: 'Blood', lava: 'Magma', storm: 'Spark', blast: 'Blast', metal: 'Iron', spirit: 'Spirit', swamp: 'Bog' });
  Object.assign(OFF, {
    air: { name: 'Gust Palm', pose: 'palm', stun: 0.48 },
    water: { name: 'Splash', pose: 'palm', stun: 0.48 },
    earth: { name: 'Stone Jab', pose: 'jabL', stun: 0.5, dmg: 26 },
    flame: { name: 'Ember Jab', pose: 'jabL', stun: 0.48, burn: [4, 1] },
    blood: { name: 'Grip', pose: 'palm', stun: 0.5 },
    lava: { name: 'Cinder Jab', pose: 'jabL', stun: 0.5, burn: [4, 1] },
    storm: { name: 'Spark Jab', pose: 'jabL', stun: 0.48 },
    blast: { name: 'Pop', pose: 'palm', stun: 0.48 },
    metal: { name: 'Iron Jab', pose: 'jabL', stun: 0.5, dmg: 26 },
    spirit: { name: 'Wisp Palm', pose: 'palm', stun: 0.48 },
    swamp: { name: 'Mud Slap', pose: 'palm', stun: 0.48 },
  });
  Object.assign(FIN, {
    air: { n: 'Updraft', a: 'Downdraft', g: { launch: 1, kb: [1.6, 14] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    water: { n: 'Wave Rise', a: 'Waterfall', g: { launch: 1, kb: [2, 13] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    earth: { n: 'Pillar', a: 'Meteor', g: { launch: 1, kb: [1.4, 13.5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    flame: { n: 'Rising Flame', a: 'Comet', g: { launch: 1, kb: [1.4, 13.5], burn: [6, 2] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    blood: { n: 'Marionette', a: 'Drag Down', g: { launch: 1, kb: [1.4, 13.5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    lava: { n: 'Eruption', a: 'Meteor', g: { launch: 1, kb: [1.4, 13.5], burn: [6, 2] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    storm: { n: 'Thunder', a: 'Thunderclap', g: { launch: 1, kb: [1.4, 13.5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    blast: { n: 'Upblast', a: 'Blast Dive', g: { launch: 1, kb: [1.4, 13.5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    metal: { n: 'Iron Upper', a: 'Anvil', g: { launch: 1, kb: [1.4, 13.5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    spirit: { n: 'Ascend', a: 'Descent', g: { launch: 1, kb: [1.6, 13.5] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
    swamp: { n: 'Bog Rise', a: 'Mire', g: { launch: 1, kb: [2, 13] }, air: { launch: 1, spike: 1, kb: [2, -13] } },
  });
  KB.buildHybrids();

  /* ======================================================== their own rules (KB.EXT, KB.HOOK) */
  const E = KB.EXT, HK = KB.HOOK, G = VX.glow, V3 = THREE.Vector3;
  const alive = o => o && !['ko', 'out'].includes(o.state);
  const free = o => alive(o) && !['held', 'down', 'getup'].includes(o.state);
  const chest = f => new V3(f.pos.x, f.pos.y + 1, f.pos.z);
  const glowAt = (at, col, n, sp) => FX.burst(at, { n: n || 10, color: [col, 0xffffff], glow: true, speed: sp || 3, size: 0.07, gravity: 0, life: 0.45 });
  // a bolt from a to b, gone in a blink (match.js clears M.fx)
  const bolt = (M, a, b, col, w) => {
    const d = new V3().subVectors(b, a), len = d.length(); if (len < 0.05) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w || 0.09, w || 0.09, len), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    m.position.copy(a).addScaledVector(d, 0.5); m.lookAt(b); M.scene.add(m); M.fx.push({ m, t: 0, life: 0.18 });
  };

  /* ---- the shots: looks (match.js LOOK, BALL_MAKE, SPORT) */
  Object.assign(E.LOOK, {
    gust: { speed: 30, trail: 1.2, tw: 0.22, tcol: 0xd8f4ff, w: 0.8, spin: 18 },
    galeball: { speed: 22, trail: 1.6, tw: 0.42, tcol: 0xd8f4ff, w: 1.1, spin: 12 },
    aqua: { speed: 32, trail: 1.3, tw: 0.16, tcol: 0x7ad8ff, w: 0.72, spin: 10 },
    icicle: { speed: 40, trail: 0.9, tw: 0.05, tcol: 0xc8f4ff, w: 0.5 },
    boulder: { speed: 19, trail: 0.6, tw: 0.24, tcol: 0xb89a6a, w: 0.95, spin: 7 },
    ridge: { speed: 15, trail: 0.5, tw: 0.32, tcol: 0xb89a6a, w: 0.85 },
    fireball: { speed: 30, trail: 1.4, tw: 0.2, tcol: 0xff8a2a, w: 0.75, spin: 6 },
    magma: { speed: 24, trail: 1.0, tw: 0.18, tcol: 0xff6a1a, w: 0.7, spin: 6 },
    zap: { speed: 70, trail: 2.6, tw: 0.08, tcol: 0xbff4ff, w: 0.62 },
    spark: { speed: 34, trail: 1.2, tw: 0.12, tcol: 0xffb040, w: 0.66, spin: 14 },
    grip: { speed: 48, trail: 2.4, tw: 0.06, tcol: 0xff2a4a, w: 0.75 },
    shard: { speed: 36, trail: 0.8, tw: 0.05, tcol: 0xd8dde6, w: 0.5, spin: 26 },
    spiritorb: { speed: 26, trail: 1.6, tw: 0.18, tcol: 0xc8a8ff, w: 0.8 },
  });
  const swirl = (cA, cB, r) => () => { const g = new VX.Grid(); for (let k = 0; k < 30; k++) { const a = k * 0.62, rr = 0.6 + k * r / 30; g.set(Math.round(Math.cos(a) * rr), Math.round(Math.sin(a) * rr), Math.round(k / 6) - 2, G(k % 3 ? cA : cB)); } g.ell(0, 0, 0, 1.2, 1.2, 1.2, G(cA)); return VX.object(g, 0.065); };
  Object.assign(E.BALL, {
    gust: swirl(0xe8f8ff, 0x9ad8f0, 3),
    galeball: () => { const g = new VX.Grid(); g.ell(0, 0, 0, 4, 4, 4, (x, y, z) => VX.hash3(x, y, z) > 0.55 ? G(0xffffff) : G(0xbfe8ff)); for (let k = 0; k < 24; k++) { const a = k * 0.5; g.set(Math.round(Math.cos(a) * 6), Math.round(Math.sin(a) * 6), (k % 5) - 2, G(0xe8f8ff)); } return VX.object(g, 0.07); },
    aqua: () => { const g = new VX.Grid(); g.ell(0, 0, 0, 2.6, 2.6, 3.4, (x, y, z) => y > 1 && x < 0 ? G(0xd8f8ff) : 0x2a8ae8); g.ell(0, 0, -4, 1.4, 1.4, 2, 0x3a9af0); return VX.object(g, 0.06); },
    icicle: () => { const g = new VX.Grid(); for (let z = -5; z <= 5; z++) { const r = z > 2 ? 0 : 1; g.box(-r, -r, z, r, r, z, z > 3 ? 0xffffff : 0x9ad8f0); } return VX.object(g, 0.035); },
    boulder: () => { const g = new VX.Grid(); g.ell(0, 0, 0, 4.4, 4, 4.2, (x, y, z) => VX.hash3(x, y, z) > 0.78 ? 0x6a5a4a : VX.hash3(x, y, z) > 0.4 ? 0x9a8a72 : 0x8a7a62); return VX.object(g, 0.075); },
    ridge: () => { const g = new VX.Grid(); for (let x = -6; x <= 6; x++) { const h = 4 - Math.abs(x) * 0.5 + (VX.hash3(x, 1, 2) > 0.5 ? 1 : 0); g.box(x, 0, -2, x, Math.max(1, Math.round(h)), 2, (xx, y) => y > 2 ? 0xb89a6a : 0x8a6a3a); } return VX.object(g, 0.07); },
    fireball: () => { const g = new VX.Grid(); g.ell(0, 0, 0, 2.4, 2.4, 2.4, G(0xffd040)); g.ell(0, 0, -2, 2.6, 2.6, 2.6, (x, y, z) => VX.hash3(x, y, z) > 0.5 ? G(0xff7a2a) : G(0xff3010)); g.ell(0, 0, -5, 1.6, 1.6, 2, G(0xff5a1a)); return VX.object(g, 0.06); },
    magma: () => { const g = new VX.Grid(); g.ell(0, 0, 0, 2.6, 2.4, 2.6, (x, y, z) => VX.hash3(x, y, z) > 0.62 ? 0x2a1a14 : G(0xff6a1a)); return VX.object(g, 0.065); },
    zap: () => { const g = new VX.Grid(); for (let z = -6; z <= 6; z++) { const x = (z * 7 & 3) - 1, y = (z * 5 & 1); g.box(x, y, z, x, y, z, G(z & 1 ? 0xffffff : 0xbff4ff)); g.set(x + 1, y, z, G(0x7ae8ff)); } return VX.object(g, 0.05); },
    grip: () => { const g = new VX.Grid(); for (const [x, y] of [[-2, 1], [-1, 2], [0, 2], [1, 2], [2, 1]]) g.box(x, y, 0, x, y, 2, G(0xff2a4a)); g.box(-2, -1, -1, 2, 0, 1, G(0x8a0a1a)); return VX.object(g, 0.05); },
    spark: () => { const g = new VX.Grid(); g.ell(0, 0, 0, 1.8, 1.8, 1.8, G(0xffe08a)); for (const [x, y, z] of [[3, 0, 0], [-3, 0, 0], [0, 3, 0], [0, -3, 0], [0, 0, 3], [0, 0, -3], [2, 2, 0], [-2, -2, 0]]) g.set(x, y, z, G(0xff8a1a)); return VX.object(g, 0.06); },
    shard: () => { const g = new VX.Grid(); g.box(-3, 0, -1, 3, 0, 1, 0x8a8e98); g.box(-2, 0, 2, 2, 0, 2, 0xc8ccd4); g.set(0, 0, 3, 0xe8eef8); g.box(-1, 1, -1, 1, 1, 0, 0x5a5e68); return VX.object(g, 0.045); },
    spiritorb: () => { const g = new VX.Grid(); g.ell(0, 0, 0, 2.4, 2.4, 2.4, G(0xc8a8ff)); g.ell(0, 0, -3, 1.6, 1.6, 2.4, G(0x8a5ae8)); g.set(0, 0, 2, G(0xffffff)); g.set(0, 3, 0, G(0xffd86a)); return VX.object(g, 0.06); },
  });
  Object.assign(E.SPORT, {
    gust: { look: 'gust', from: 'wR' }, galeCannon: { look: 'galeball', from: 'wR', pierce: 1 },
    jet: { look: 'aqua', from: 'wR' }, icicles: { look: 'icicle', from: 'wR', spread: [-0.16, 0, 0.16] },
    boulder: { look: 'boulder', from: 'wL' }, earthWave: { look: 'ridge', from: 'feet', ground: 1, pierce: 1 },
    fireball: { look: 'fireball', from: 'wR' }, magma: { look: 'magma', from: 'wR' }, grip: { look: 'grip', from: 'wR' },
    zap: { look: 'zap', from: 'wR' }, sparkShot: { look: 'spark', from: 'wR' },
    shrapnel: { look: 'shard', from: 'wL', spread: [-0.21, -0.07, 0.07, 0.21] }, spiritLance: { look: 'spiritorb', from: 'wR' },
  });

  /* ---- the floor traps (match.js TRAP_MAKE): anything made here with userData.own is disposed with the trap */
  const fmat = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const lay = (geo, c, op, y) => { const m = new THREE.Mesh(geo, fmat(c, op)); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.userData.own = true; return m; };
  Object.assign(E.TRAP, {
    vortex: (col, r) => { const g = new THREE.Group(); g.add(lay(new THREE.CircleGeometry(r, 28), 0x3a5a7a, 0.3)); for (let k = 0; k < 4; k++) g.add(lay(new THREE.RingGeometry(r * (0.22 + k * 0.2), r * (0.3 + k * 0.2), 28, 1, k * 1.6, Math.PI * 1.2), k & 1 ? 0xffffff : col, 0.85, 0.01 + k * 0.003)); return g; },
    mud: (col, r) => { const g = new THREE.Group(); g.add(lay(new THREE.CircleGeometry(r, 24), 0x3a2e1a, 0.92)); g.add(lay(new THREE.RingGeometry(r * 0.88, r, 24), 0x6a5a3a, 0.9, 0.006)); for (let k = 0; k < 5; k++) { const b = lay(new THREE.CircleGeometry(0.12 + (k % 2) * 0.08, 10), 0x7a6a4a, 0.95, 0.01); b.position.x = Math.cos(k * 2.4) * r * 0.55; b.position.z = Math.sin(k * 2.4) * r * 0.55; g.add(b); } return g; },
    lava: (col, r) => { const g = new THREE.Group(); g.add(lay(new THREE.CircleGeometry(r, 22), 0x2a1410, 0.95)); g.add(lay(new THREE.CircleGeometry(r * 0.8, 22), col, 0.95, 0.005)); for (let k = 0; k < 4; k++) { const c = lay(new THREE.CircleGeometry(0.16 + (k % 2) * 0.1, 7), 0x3a1a10, 0.95, 0.01); c.position.x = Math.cos(k * 1.9) * r * 0.45; c.position.z = Math.sin(k * 1.9) * r * 0.45; g.add(c); } g.add(lay(new THREE.CircleGeometry(r * 0.3, 14), 0xffd040, 0.9, 0.012)); return g; },
    mine: col => { const g = new VX.Grid(); g.ell(0, 0, 0, 4, 1, 4, (x, y, z) => y > 0 ? 0x3a3a40 : 0x2a2a30); g.box(-1, 1, -1, 1, 2, 1, 0x4a4a52); g.set(0, 3, 0, G(col)); for (const [x, z] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) g.set(x, 1, z, G(0xffd040)); return VX.object(g, 0.06); },
  });

  /* ---- what the acts do (match.js M.act) */
  E.ACTS.puppet = (M, f, mv) => {
    const o = M.opp(f);
    if (!free(o) || o.inv > 0 || U.dist(f.pos, o.pos) > mv.range || o.buffs.pure) { M.call(f, 'OUT OF REACH', 'small'); return; }
    o.bx.puppetT = 2.5; o.bx.puppetBy = f; M.call(o, 'PUPPETED', 'bad'); glowAt(chest(o), 0xff2a4a, 14); bolt(M, f.fig.socket('wR', [0, 0, 2]), chest(o), 0xff2a4a, 0.03);
  };
  E.ACTS.puppetToss = (M, f, mv) => {
    const o = M.opp(f);
    if (!free(o) || o.inv > 0 || U.dist(f.pos, o.pos) > mv.range || o.pos.y > 2.6) { M.call(f, 'OUT OF REACH', 'small'); return; }
    const d = new V3(f.pos.x - o.pos.x, 0, f.pos.z - o.pos.z); if (d.lengthSq() < 0.01) d.set(-f.forward.x, 0, -f.forward.z); d.normalize();
    glowAt(chest(o), 0xff2a4a, 16, 4); bolt(M, f.fig.socket('wR', [0, 0, 2]), chest(o), 0xff2a4a, 0.04);
    Combat.hit(f, o, KB.MOVES.xbTossHit, { kind: 'special', force: true, dir: d, at: chest(o), from: f.pos.clone(), proj: true }); M.call(f, 'PUPPET TOSS', 'buff');
  };
  E.ACTS.lavaPool = (M, f) => M.placeTrap(f, KB.MOVES.xlPool);
  E.ACTS.detonate = (M, f) => {
    f.hp = Math.max(1, f.hp - Math.round(f.maxHp * 0.06)); M.call(f, 'DETONATION!', 'buff'); FX.addShake(0.8);
    const c = chest(f); FX.burst(c, { n: 40, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 9, size: 0.14, life: 0.7 }); FX.ring(c.clone().setY(0.1), { r1: 4.2, life: 0.45, color: 0xffa040 });
  };
  E.ACTS.rod = (M, f, mv, X) => {
    const o = M.opp(f), hand = f.fig.socket('wR', [0, 0, 2]);
    if (!alive(o) || o.inv > 0 || ['held', 'down', 'getup'].includes(o.state) || o.grounded || o.pos.y < 0.5 || U.dist(f.pos, o.pos) > mv.range) {
      bolt(M, hand, hand.clone().setY(hand.y + 6), 0xbff4ff, 0.06); M.call(f, 'NOTHING IN THE AIR', 'small'); return;
    }
    const at = chest(o); bolt(M, new V3(o.pos.x, at.y + 9, o.pos.z), at, 0xffffff, 0.14); bolt(M, new V3(o.pos.x + 0.3, at.y + 9, o.pos.z - 0.2), at, 0x7ae8ff, 0.06); bolt(M, hand, at, 0xbff4ff, 0.04);
    FX.addShake(0.45); SFX.play('boom'); glowAt(at, 0xffe83a, 20, 5);
    Combat.hit(f, o, KB.MOVES.xzRodHit, { kind: 'special', proj: true, dir: X.shotDir(f, o, f.forward), at, from: f.pos.clone() });
  };
  E.ACTS.swap = (M, f, mv) => {
    const o = M.opp(f);
    if (!free(o) || U.dist(f.pos, o.pos) > mv.range) { M.call(f, 'TOO FAR', 'small'); return; }
    glowAt(chest(f), 0xc8a8ff, 16); glowAt(chest(o), 0xc8a8ff, 16);
    const a = f.pos.clone(), b = o.pos.clone(); f.pos.set(b.x, Math.max(0, b.y), b.z); o.pos.set(a.x, Math.max(0, a.y), a.z); f.vel.set(0, 0, 0); f.clampInside(); o.clampInside();
    f.inv = Math.max(f.inv, 0.25); f.yaw = U.ang(f.pos, o.pos); o.yaw = U.ang(f.pos, o.pos);   // (they face away from her)
    glowAt(chest(f), 0xffffff, 10); M.call(f, 'CROSSING OVER', 'buff');
  };
  E.ACTS.tether = (M, f, mv) => {
    const o = M.opp(f);
    if (!alive(o) || U.dist(f.pos, o.pos) > mv.range) { M.call(f, 'TOO FAR', 'small'); return; }
    f.bx.tetherT = 5; M.call(o, 'TETHERED', 'bad'); bolt(M, chest(f), chest(o), 0xc8a8ff, 0.04);
  };
  E.ACTS.bogDive = (M, f) => { f.bx.dive = 0.55; f.inv = Math.max(f.inv, 0.8); f.obj.visible = false; FX.burst(f.pos.clone().setY(0.2), { n: 20, color: [0x3a2e1a, 0x6a5a3a, 0x9ab83a], speed: 3, size: 0.12, life: 0.6 }); M.call(f, 'BOG BODY', 'buff'); };
  // BALL LIGHTNING: it drifts after them and zaps them three times
  const orbMesh = () => { const g = new VX.Grid(); g.ell(0, 0, 0, 3, 3, 3, (x, y, z) => VX.hash3(x, y, z) > 0.5 ? G(0xffffff) : G(0x7ae8ff)); for (const [x, y, z] of [[4, 0, 0], [-4, 1, 0], [0, 4, 1], [1, -4, 0], [0, 0, 4], [0, 1, -4]]) g.set(x, y, z, G(0xffe83a)); return VX.object(g, 0.06); };
  E.ACTS.ballLightning = (M, f, mv, X) => {
    const from = X.inside(f.pos.clone().addScaledVector(f.forward, 0.9).setY(f.pos.y + 1.1)), mesh = orbMesh(); mesh.position.copy(from); M.scene.add(mesh);
    M.projs.push({ kind: 'xorb', f, mv, mesh, pos: from, dir: f.forward.clone(), t: 0, cd: 0.2, zaps: 0, id: 's' + (++M.shotId) });
  };
  E.PROJS.xorb = {
    update(M, p, dt, X) {
      const f = p.f, o = M.opp(f);
      if (alive(o)) { const tx = o.pos.x - p.pos.x, tz = o.pos.z - p.pos.z, l = Math.hypot(tx, tz); if (l > 0.05) { const a = Math.atan2(p.dir.x, p.dir.z), b = Math.atan2(tx, tz); let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = a + U.clamp(d, -2.6 * dt, 2.6 * dt); p.dir.set(Math.sin(na), 0, Math.cos(na)); } }
      p.pos.addScaledVector(p.dir, 3.8 * dt); p.pos.y = 1.1 + Math.sin(p.t * 6) * 0.1; X.inside(p.pos); p.mesh.position.copy(p.pos); p.mesh.rotation.y += dt * 7; p.mesh.rotation.x += dt * 3;
      if (U.vrand() < 0.5) FX.burst(p.pos, { n: 1, color: [0x7ae8ff, 0xffffff], glow: true, speed: 1.5, size: 0.05, life: 0.25, gravity: 0 });
      p.cd -= dt;
      if (free(o) && o.inv <= 0 && p.cd <= 0 && Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z) < 1.4 && Math.abs(o.pos.y + 1 - p.pos.y) < 1.6) {
        p.cd = 0.4; p.zaps++; const last = p.zaps >= 3, at = chest(o);
        bolt(M, p.pos.clone(), at, 0xbff4ff, 0.05); SFX.play('jguard');
        Combat.hit(f, o, last ? KB.MOVES.xzOrbLast : KB.MOVES.xzOrbZap, { kind: 'special', proj: true, multiHit: !last, dir: X.shotDir(f, o, p.dir), at, from: p.pos.clone() });
        if (last) return true;
      }
      return p.t > 4.5 || f.state === 'out';
    },
    drop(M, p) { M.scene.remove(p.mesh); glowAt(p.pos.clone(), 0x7ae8ff, 12, 3); },
  };
  // CREEPING VINES: roots that crawl along the floor after them
  const vineMesh = () => { const g = new VX.Grid(); for (let z = -4; z <= 4; z++) { g.set(Math.round(Math.sin(z) * 1), 0, z, 0x4a6a2a); if (z % 2 === 0) g.set(Math.round(Math.sin(z) * 1) + (z % 4 ? 1 : -1), 1, z, 0x9ab83a); } g.box(-1, 0, 4, 1, 1, 5, 0x6a8a3a); return VX.object(g, 0.07); };
  E.ACTS.vines = (M, f, mv, X) => {
    const from = X.inside(f.pos.clone().addScaledVector(f.forward, 0.8)); from.y = 0.05; const mesh = vineMesh(); mesh.position.copy(from); M.scene.add(mesh);
    M.projs.push({ kind: 'xvine', f, mv, mesh, pos: from, dir: f.forward.clone(), t: 0, dist: 0, id: 's' + (++M.shotId) });
  };
  E.PROJS.xvine = {
    update(M, p, dt, X) {
      const f = p.f, o = M.opp(f);
      if (alive(o)) { const tx = o.pos.x - p.pos.x, tz = o.pos.z - p.pos.z; if (Math.hypot(tx, tz) > 0.05) { const a = Math.atan2(p.dir.x, p.dir.z), b = Math.atan2(tx, tz); let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = a + U.clamp(d, -1.8 * dt, 1.8 * dt); p.dir.set(Math.sin(na), 0, Math.cos(na)); } }
      const step = 7.5 * dt; p.pos.addScaledVector(p.dir, step); p.dist += step; X.inside(p.pos); p.mesh.position.copy(p.pos); p.mesh.rotation.y = Math.atan2(p.dir.x, p.dir.z);
      if (U.vrand() < 0.6) FX.burst(p.pos.clone().setY(0.1), { n: 1, color: [0x6a5a3a, 0x9ab83a], speed: 1.2, size: 0.07, life: 0.4 });
      if (free(o) && o.inv <= 0 && o.pos.y < 0.4 && Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z) < 0.75) {
        FX.burst(o.pos.clone().setY(0.3), { n: 16, color: [0x4a6a2a, 0x9ab83a, 0x6a5a3a], speed: 3, size: 0.09, life: 0.5 });
        Combat.hit(f, o, KB.MOVES.xqVineHit, { kind: 'special', proj: true, dir: X.shotDir(f, o, p.dir), at: o.pos.clone().setY(0.5), from: p.pos.clone() }); return true;
      }
      return p.dist > 11 || p.t > 3 || f.state === 'out';
    },
    drop(M, p) { M.scene.remove(p.mesh); },
  };

  /* ---- their buffs (fighter.js addBuff) */
  E.BUFF.stoneSkin = (f, b) => { f.buffs.stoneSkin = b.t; f.hobbleT = Math.max(f.hobbleT || 0, b.t); f.m.call(f, 'STONE SKIN', 'buff'); FX.burst(chest(f), { n: 18, color: [0x8a7a62, 0xb89a6a, 0x6a5a4a], speed: 2.5, size: 0.1, life: 0.5 }); };
  E.BUFF.haze = (f, b) => { f.buffs.haze = b.t; f.m.call(f, 'HEAT HAZE', 'buff'); FX.burst(chest(f), { n: 16, color: [0xff7a2a, 0xffd040], glow: true, speed: 2, gravity: -3, size: 0.07, life: 0.6 }); };
  E.BUFF.ward = (f, b) => { f.buffs.ward = b.t; f.m.call(f, 'SPIRIT WARD', 'buff'); FX.ring(chest(f), { r1: 1.4, life: 0.35, normal: new V3(0, 1, 0), color: 0xc8a8ff }); };
  E.BUFF.shell = (f, b) => { f.buffs.shell = b.t; f.inv = Math.max(f.inv, b.t); f.rootT = Math.max(f.rootT || 0, b.t); f.bx.shellOn = true; f.flash = 0.6; f.flashCol = 0x1a1414; f.m.call(f, 'OBSIDIAN SHELL', 'buff'); FX.burst(chest(f), { n: 16, color: [0x1a1414, 0x3a2a2a, 0xff6a1a], speed: 2.5, size: 0.11, life: 0.5 }); };

  /* ---- HOOKS: the passives, the signatures, and what the specials leave behind */
  const GOOD = ['haste', 'regen', 'iron', 'berserk', 'empower', 'fury', 'zeal', 'valor', 'pumped', 'morale', 'fuses', 'stoneSkin', 'haze', 'immov', 'autoGuard', 'chalk', 'bulwark', 'slip', 'parry', 'sake'];
  HK.pre.push((att, vic, mv, o, m) => {
    // SPIRIT WARD: the blow passes through her, and she's behind them
    if (!vic.buffs.ward || o.force || o.remote || o.kind === 'super' || mv.type === 'grab' || !free(vic)) return null;
    delete vic.buffs.ward; const F = att.forward;
    glowAt(chest(vic), 0xc8a8ff, 14); vic.pos.set(att.pos.x - F.x * 1.1, Math.max(0, att.pos.y), att.pos.z - F.z * 1.1); vic.clampInside(); vic.vel.set(0, 0, 0);
    vic.yaw = U.ang(vic.pos, att.pos); vic.inv = Math.max(vic.inv, 0.3); glowAt(chest(vic), 0xffffff, 10); m.call(vic, 'SPIRIT WARD', 'tech'); SFX.play('dodge');
    return 'miss';
  });
  HK.dmg.push((att, vic, mv, o, m) => {
    let k = 1; const P = att.st.passive, S = att.st.sig, lite = o.kind === 'light' || o.kind === 'air', ab = att.bx || {}, vb = vic.bx || {};
    if (P === 'windstep' && ab.wind > 0) k *= 1.2;
    if (P === 'charged' && !o.multiHit && att.bx) { ab.charge = (ab.charge || 0) + 1; if (ab.charge >= 5) { ab.charge = 0; k *= 1.5; m.call(vic, 'DISCHARGE!', 'counter'); glowAt(chest(vic), 0x7ae8ff, 16, 4); } }
    if (P === 'flow') k *= 1 + Math.min(0.24, vic.combo.hits * 0.03);
    if (S === 'chill' && lite && (vic.rootT > 0 || vic.freezeT > 0 || vic.slowT > 0)) k *= 1.25;
    if (S === 'seismic' && o.kind === 'heavy' && vic.grounded) k *= 1.15;
    if (S === 'heat' && lite) k *= 1 + 0.2 * att.hype / 100;
    if (S === 'slag' && vic.burn && !vic.burn.poison) k *= 1.15;
    if (P === 'volatile' && o.kind === 'heavy' && mv.launch && !mv.launcher && !mv.spike) k *= 1.2;
    if (vic.st.passive === 'volatile') k *= 1.1;
    if (S === 'forge' && lite && ab.forge) { k *= 1.3; ab.forge = false; }
    if (vb.coffin > 0 && vb.coffinBy === att && !mv.coffin) { k *= 1.5; vb.coffin = 0; m.call(vic, 'SHATTERED', 'counter'); FX.burst(chest(vic), { n: 18, color: [0x8a7a62, 0xb89a6a], speed: 5, size: 0.12, life: 0.5 }); }
    if (vic.buffs.stoneSkin) k *= 0.65;
    if (vic.st.passive === 'rooted' && vic.grounded && Math.hypot(vic.vel.x, vic.vel.z) < 0.6 && !vic.inHitstun) k *= 0.8;
    if (vic.st.passive === 'bogborn' && o.proj) k *= 0.75;
    return k;
  });
  HK.kb.push((att, vic, mv, o) => {
    let k = 1;
    if (att.st.sig === 'gale' && o.kind === 'heavy' && mv.launch && !mv.launcher && !mv.spike) k *= 1.25;
    if (vic.st.passive === 'heavymetal') k *= 0.75;
    return k;
  });
  HK.after.push((att, vic, mv, o, m, dmg) => {
    const P = att.st.passive, S = att.st.sig, lite = o.kind === 'light' || o.kind === 'air', ab = att.bx, vb = vic.bx; if (!ab || !vb) return;
    vb.calm = 0;
    if (P === 'sanguine' && dmg > 0 && att.hp > 0) att.hp = Math.min(att.maxHp, att.hp + dmg * 0.08 * att.st.healMult);
    if (vic.st.passive === 'molten' && !o.proj && att.hp > 0 && !att.burn && U.dist(att.pos, vic.pos) < 2.6) { att.burn = { t: 2, left: 4, tick: 0, dps: 6 * vic.dmgMult('special'), by: vic, poison: false }; m.call(att, 'BURNED', 'bad'); }
    if (vic.hp <= 0) return;
    const pure = vic.buffs.pure;
    if (P === 'stoke' && vic.burn && vic.burn.by === att && !vic.burn.stoked) { vic.burn.dps *= 1.4; vic.burn.stoked = true; }
    if (S === 'slag' && vic.burn && vic.burn.by === att) vic.burn.left = Math.max(vic.burn.left, Math.round(vic.burn.t / 0.5));
    if (S === 'puppet' && lite && !pure) vic.hobbleT = Math.max(vic.hobbleT || 0, 1.0);
    if (S === 'static' && lite) { const s = Math.min(Math.floor(vic.hype), 3); if (s > 0) { vic.hype -= s; att.hype = Math.min(100, att.hype + s); } }
    if (S === 'demo' && mv.zone) { const part = Combat.zonePart(att, vic, mv.zone); if (part && !vic.broken[part]) vic.armor[part] -= dmg * 0.4 * (mv.launch ? 0.55 : 0.35); }   // (the rest comes off in Combat.hit, which breaks it)
    if (S === 'forge' && o.kind === 'heavy') ab.forge = true;
    if (S === 'purify' && lite) for (const k of GOOD) if (vic.buffs[k]) { delete vic.buffs[k]; if (k === 'regen') vic.regenRate = 0; if (['iron', 'immov', 'chalk', 'bulwark'].includes(k)) vic.armorT = 0; m.call(vic, 'CLEANSED', 'bad'); break; }
    if (S === 'thorns' && lite) { ab.thorn = (ab.thorn || 0) + 1; if (ab.thorn >= 3 && !pure) { ab.thorn = 0; vic.rootT = Math.max(vic.rootT || 0, 0.8); m.call(vic, 'ROOTED', 'bad'); } }
    if (pure) return;
    if (mv.sticky) { vb.sticky = 2; vb.stickyBy = att; m.call(vic, 'CHARGE STUCK ON', 'bad'); }
    if (mv.coffin) { vb.coffin = 3; vb.coffinBy = att; }
    if (mv.bleed) { vb.bleed = mv.bleed; vb.bleedBy = att; vb.bleedX = vic.pos.x; vb.bleedZ = vic.pos.z; m.call(vic, 'BLEEDING', 'bad'); }
    if (mv.magnet) { vb.magnetT = 0.9; m.call(vic, 'MAGNETIZED', 'bad'); }
  });
  HK.tick.push((f, dt, m) => {
    const b = f.bx; if (!b) return;
    const out = ['ko', 'out'].includes(f.state);
    if (f.st.passive === 'windstep') { if (f.state === 'dodge') b.wind = 0.6; else if (b.wind > 0) b.wind -= dt; }
    if (f.st.passive === 'serene') { b.calm = (b.calm || 0) + dt; if (b.calm > 3 && f.hp < f.maxHp && !out) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.015 * dt); }
    if (b.puppetT > 0) { b.puppetT -= dt; if (b.puppetT <= 0 || out || !alive(b.puppetBy)) { b.puppetT = 0; b.puppetBy = null; } else if (U.vrand() < 0.2) glowAt(chest(f), 0xff2a4a, 2, 1); }
    if (b.coffin > 0) b.coffin -= dt;
    if (b.bleed > 0) {
      b.bleed -= dt; const d = Math.hypot(f.pos.x - b.bleedX, f.pos.z - b.bleedZ); b.bleedX = f.pos.x; b.bleedZ = f.pos.z;
      if (d > 0.001 && d < 2 && f.hp > 1 && !out) { f.hp = Math.max(1, f.hp - d * 7); if (U.vrand() < d * 2) FX.burst(chest(f), { n: 1, color: [0xd8203a, 0x8a0a1a], speed: 1, size: 0.06, gravity: 6, life: 0.5 }); }
    }
    if (b.sticky > 0) {
      b.sticky -= dt; if (U.vrand() < 0.15) FX.spark(chest(f), { color: 0xffb040, size: 0.5 });
      if (b.sticky <= 0) { const a = b.stickyBy; b.stickyBy = null;
        if (a && free(f) && f.inv <= 0) { const at = chest(f), d = new V3(f.pos.x - a.pos.x, 0, f.pos.z - a.pos.z); if (d.lengthSq() < 0.01) d.set(0, 0, 1); d.normalize();
          FX.burst(at, { n: 26, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 7, size: 0.12, life: 0.55 }); SFX.play('boom'); FX.addShake(0.4);
          Combat.hit(a, f, KB.MOVES.xxStickyBoom, { kind: 'special', force: true, proj: true, dir: d, at, from: at.clone() }); } }
    }
    if (b.magnetT > 0) {
      b.magnetT -= dt; let best = null, bd = 99; for (const w of m.arena.walls) if (!w.broken) { const d = w.lim - w.sign * f.pos[w.axis]; if (d < bd) { bd = d; best = w; } }
      if (!best || out || f.state === 'held') b.magnetT = 0;
      else if (bd > 0.55) { f.pos[best.axis] += best.sign * Math.min(bd - 0.5, 15 * dt); f.vel.x = 0; f.vel.z = 0; }
      else { b.magnetT = 0; f.rootT = Math.max(f.rootT || 0, 1.4); m.call(f, 'STUCK TO THE WALL', 'bad'); FX.spark(chest(f), { color: 0xd8dde6, size: 1.2 }); SFX.play('guard'); }
    }
    if (b.tetherT > 0) {
      b.tetherT -= dt; const o = f.opp;
      if (!alive(o) || out || U.dist(f.pos, o.pos) > 6.5) { b.tetherT = 0; if (!out) m.call(f, 'TETHER BROKEN', 'small'); }
      else { const x = o.maxHp * 0.016 * dt; if (o.hp > 1) { o.hp = Math.max(1, o.hp - x); f.hp = Math.min(f.maxHp, f.hp + x); } if (U.vrand() < 0.4) { const a = chest(f), c = chest(o), k = U.vrand(); FX.burst(a.lerp(c, k), { n: 1, color: [0xc8a8ff, 0xffffff], glow: true, speed: 0.4, size: 0.06, life: 0.35, gravity: 0 }); } }
    }
    if (b.dive > 0) {
      b.dive -= dt; if (U.vrand() < 0.5) FX.burst(f.pos.clone().setY(0.1), { n: 1, color: [0x3a2e1a, 0x6a5a3a], speed: 1.5, size: 0.1, life: 0.4 });
      if (b.dive <= 0) {
        f.obj.visible = true; const o = f.opp;
        if (free(o) && !out) {
          const d = new V3(o.pos.x - f.pos.x, 0, o.pos.z - f.pos.z); if (d.lengthSq() < 0.01) d.copy(f.forward); d.normalize();
          f.pos.set(o.pos.x - d.x * 0.45, 0, o.pos.z - d.z * 0.45); f.clampInside(); f.yaw = U.ang(f.pos, o.pos); f.vel.set(0, 0, 0);
          FX.burst(f.pos.clone().setY(0.3), { n: 24, color: [0x3a2e1a, 0x6a5a3a, 0x9ab83a], speed: 4, size: 0.12, life: 0.6, up: 1 }); SFX.play('heavy');
          if (o.inv <= 0 && o.pos.y < 2) Combat.hit(f, o, KB.MOVES.xqBogUp, { kind: 'special', dir: d, at: chest(o), from: f.pos.clone() });
        }
      }
    }
    if (b.shellOn && !f.buffs.shell) {
      b.shellOn = false; const o = f.opp, c = chest(f);
      FX.burst(c, { n: 30, color: [0xff6a1a, 0xffd040, 0x1a1414], glow: true, speed: 7, size: 0.12, life: 0.6 }); FX.ring(c.clone().setY(0.1), { r1: 3.2, life: 0.4, color: 0xff6a1a }); SFX.play('boom'); FX.addShake(0.4);
      if (free(o) && o.inv <= 0 && U.dist(f.pos, o.pos) < 2.8 && Math.abs(o.pos.y - f.pos.y) < 2) { const d = new V3(o.pos.x - f.pos.x, 0, o.pos.z - f.pos.z); if (d.lengthSq() < 0.01) d.copy(f.forward); d.normalize(); Combat.hit(f, o, KB.MOVES.xlErupt, { kind: 'special', dir: d, at: chest(o), from: f.pos.clone() }); }
    }
  });
  HK.reset.push(f => { if (f.obj) f.obj.visible = true; });
})();
