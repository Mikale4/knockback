/* ============================================================================
   trials.js -- COMBO TRIALS: every fighter's combos, one at a time.

   BASIC: seven trials per line, on its BASE move list (a mint figure of that
   line: its own string, launcher, KNOCK, Special and Legend Art, never a mixed
   string): the string, the pause combo, the launcher into an air combo, the
   KNOCK//BACK with the rebound, a Special cancel, the line's signature trick,
   and a Legend Art finish.
   ADVANCED: each line's own long routes, built on what only it has (the
   Pirate's pistol, the Ninja's Chain Hook, the Viking's wind-up, the Bard's
   Lullaby...): ground bounces, wall bounces, OTGs, and Legend Arts that end
   a combo in a hard knockdown to OTG.
   A panel lists the steps in your own keys; each one ticks off as it lands,
   and the trial resets if the combo drops or a wrong move comes out. DEMO
   plays it for you (the same bot proves every trial can be done).

   A step is { m: move id, k: the button, t: how } or { e: an event, k }:
     t: '' | 'pause' (let the last move finish, a beat, then press) |
        'toward' (hold the stick at them) | 'hold' (hold it: a wind-up) |
        'beat' (on the music's beat) | 'mash' | 'dash' (Dodge then Light) |
        'nohit' (it only has to come out) | 'air' | 'otg' (they're on the
        floor: pick them up) | 'far' (from range: a shot or the Chain Hook)
     e: 'jump' | 'bounce' (off the wall) | 'gbounce' (off the floor) |
        'airdash' | 'vault' | 'snap' (a Snap Cancel) |
        'super' (the Legend Art starts) | 'art' (it catches them) |
        'pickup' (the Summoner runs into one of her imps)
     A trial may say gap: how far apart you start, and imps: how many imps
     the Summoner starts with in hand.

     Trials.open() (the fighter select)   Trials.start(line, i)
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const chain = root => { const o = []; let id = root; while (id && o.length < 8) { o.push(id); id = (KB.MOVES[id].nx || {}).l; } return o; };

  /* -------------------------------------------------------- the trials */
  const S0 = line => KB.stats(KB.mintBuild(line, 0));
  const L = id => ({ m: id, k: 'light' });
  function build(line) {
    const S = S0(line), g = chain(S.light), a = chain(S.air), P = KB.MOVES[g[1]].nx && KB.MOVES[g[1]].nx.p;
    const air = a.map(id => ({ m: id, k: 'light', t: 'air' }));
    const sp = KB.MOVES[S.special], spStep = { m: S.special, k: 'special', t: ['buff', 'summon', 'trap', 'act'].includes(sp.type) ? 'nohit' : '' };
    const T = [];
    T.push({ name: 'The string', stars: 1, note: 'Your Light string, start to finish: press again as each hit lands.', steps: g.map(L) });
    if (P) T.push({ name: 'Pause combo', stars: 2, note: 'Two hits, then let the second one finish, wait a beat, and press Light again for the pause branch.', steps: [L(g[0]), L(g[1]), { m: P, k: 'light', t: 'pause', nohit: ['buff', 'summon'].includes(KB.MOVES[P].type) }] });
    T.push({ name: 'Launcher', stars: 2, note: 'Heavy mid-string (stick let go) launches. Jump straight after it and finish in the air.', steps: [L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, ...air] });
    T.push({ name: 'KNOCK//BACK', stars: 3, wall: true, note: 'Toward + Heavy mid-string KNOCKS them into the wall. Catch them on the rebound.', steps: [L(g[0]), L(g[1]), { m: S.heavy, k: 'heavy', t: 'toward' }, { e: 'bounce' }, L(g[0]), L(g[1])] });
    T.push({ name: 'Special cancel', stars: 2, note: 'A Special comes straight out of a hit: cancel the string into ' + sp.name + '.', steps: [L(g[0]), L(g[1]), spStep] });
    const sig = SIG[line] && SIG[line](S, g, a, air);
    if (sig) T.push(Object.assign({ stars: 3 }, sig));
    T.push({ name: 'Legend Art finish', stars: 4, note: 'With full Hype, a Legend Art comes straight out of a hit too.', steps: [L(g[0]), L(g[1]), { e: 'super', k: 'super' }, { e: 'art' }] });
    // per-line changes to the common ones
    if (FIX[line]) FIX[line](T, S, g, a, air);
    // three more, after the seven: the air Heavy SPIKE and its ground bounce, an OTG off the floor, and a Part Toss
    const up = S.gunCancel ? [L(g[0]), { m: S.gunCancel, k: 'heavy' }, L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }] : [L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }];
    const spike = [...up, { e: 'jump', k: 'jump' }, air[0], { m: S.airHeavy, k: 'heavy', t: 'air' }, { e: 'gbounce' }];
    const shotHeavy = KB.MOVES[S.heavy].type === 'proj';
    const pick = shotHeavy ? { m: S.dashAtk, k: 'light', t: 'otg' } : { m: S.heavy, k: 'heavy', t: 'otg' };
    T.push({ name: 'Spike', stars: 2, note: 'After an air hit, Heavy in the air (' + KB.MOVES[S.airHeavy].name + ') SPIKES them into the floor: a GROUND BOUNCE.', steps: spike });
    T.push({ name: 'Off the ground', stars: 3, note: 'They land after the ground bounce: an OTG (' + KB.MOVES[pick.m].name + (shotHeavy ? ', Dodge then Light' : '') + ') picks them back up.', steps: [...spike, pick] });
    T.push({ name: 'Part Toss', stars: 2, note: 'Mid-combo, Toss throws one of your OWN parts at them: it EXTENDS the combo, and the string starts again.', steps: [L(g[0]), L(g[1]), { m: 'partToss', k: 'toss' }, ...g.map(L)] });
    return T;
  }
  /* each line's signature trick */
  const SIG = {
    samurai: (S, g, a, air) => ({ name: 'Swallow\'s flight', note: 'The whole string: Rising Cut sends them up. Jump after them for the air string and Tsubame Gaeshi.', steps: [...g.map(L), { e: 'jump', k: 'jump' }, ...air] }),
    knight: (S, g, a, air) => ({ name: 'Judgment day', note: 'Judgment spikes them into the floor; catch the ground bounce and launch with Shield Upper.', steps: [...g.map(L), L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, air[0]] }),
    pirate: (S, g) => ({ name: 'Dirty fighting', note: 'Pause after the Backcut to throw sand: they stand there DIZZY. Then the whole string.', steps: [L(g[0]), L(g[1]), { m: 'cuP', k: 'light', t: 'pause' }, ...g.map(L)] }),
    monk: (S, g, a, air) => ({ name: 'Flow state', note: 'Mash Light through the Flurry, then launch with Rising Palm and follow them up.', steps: [L(g[0]), L(g[1]), { m: g[2], k: 'light', t: 'mash' }, { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, ...air] }),
    viking: (S, g) => ({ name: 'Wind-up', note: 'HOLD Light to wind up the first swing (armour while you hold); a full wind-up crumples them. Then finish the string.', steps: [{ m: g[0], k: 'light', t: 'hold' }, L(g[1]), L(g[2])] }),
    ninja: (S, g, a, air) => ({ name: 'Shadow Dash', note: 'In the air, Dodge after a hit dashes at them: then a fresh air string.', steps: [L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, air[0], { e: 'airdash', k: 'dodge' }, ...air] }),
    summoner: (S, g) => ({ name: 'Sic \'Em', note: 'Call your imps first, then the string: Sic \'Em sends every imp in.', steps: [{ m: S.special, k: 'special', t: 'nohit' }, ...g.map(L)] }),
    paladin: (S, g) => ({ name: 'Hammer and shield', note: 'The pause branch crumples them and heals you. Then the whole string while they fold.', steps: [L(g[0]), L(g[1]), { m: 'paP', k: 'light', t: 'pause' }, ...g.map(L)] }),
    dragoon: (S, g, a, air) => ({ name: 'Skyborne', note: 'In the air, Jump off a hit for a fresh jump and a fresh air string.', steps: [L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, air[0], { e: 'vault', k: 'jump' }, ...air] }),
    bard: (S, g) => ({ name: 'On the beat', note: 'Start the string ON the music\'s beat (the ring under your feet pulses with it) for +30% damage.', steps: [{ m: g[0], k: 'light', t: 'beat' }, ...g.slice(1).map(L)] }),
  };
  // MODERN SPORTS
  Object.assign(SIG, {
    wrestler: (S, g) => ({ name: 'Heel tactics', note: 'Pause after the Forearm Smash to rake the eyes: they stand there DIZZY. Then the whole string, Lariat and all.', steps: [L(g[0]), L(g[1]), { m: 'wrP', k: 'light', t: 'pause' }, ...g.map(L)] }),
    baseball: (S, g) => ({ name: 'Clutch hitter', note: 'HOLD Light on the Home Run Swing to wind it up; a full swing crumples them.', steps: [L(g[0]), L(g[1]), L(g[2]), { m: g[3], k: 'light', t: 'hold' }] }),
    football: (S, g) => ({ name: 'Pancake', note: 'The Pancake Block drives them into the floor: catch the ground bounce with the string and launch with the Lift Block.', steps: [...g.map(L), { e: 'gbounce' }, L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }] }),
    soccer: (S, g, a, air) => ({ name: 'Bicycle kick', note: 'The whole string: the Bicycle Kick sends them up. Jump after them for the air string and the Overhead Kick.', steps: [...g.map(L), { e: 'jump', k: 'jump' }, ...air] }),
    boxer: (S, g, a, air) => ({ name: 'Body work', note: 'Mash Light through the Body Blows, Uppercut, and follow them up.', steps: [L(g[0]), L(g[1]), { m: g[2], k: 'light', t: 'mash' }, L(g[3]), { e: 'jump', k: 'jump' }, ...air] }),
    fencer: (S, g) => ({ name: 'Flèche', note: 'Pause after the Disengage: the Flèche runs through them and knocks them back the way you came.', steps: [L(g[0]), L(g[1]), { m: 'feP', k: 'light', t: 'pause' }] }),
    weightlifter: (S, g) => ({ name: 'Max effort', note: 'HOLD Light to wind up the first swing (armour while you hold); a full rep crumples them. Then finish the set.', steps: [{ m: g[0], k: 'light', t: 'hold' }, L(g[1]), L(g[2])] }),
    bowler: (S, g) => ({ name: 'Gutter ball', note: 'Pause after the Backswing: a ball rolls along the floor and trips them.', steps: [L(g[0]), L(g[1]), { m: 'bwP', k: 'light', t: 'pause' }] }),
    archer: (S, g) => ({ name: 'Volley', note: 'Pause after the Limb Swipe: three arrows at once.', steps: [L(g[0]), L(g[1]), { m: 'arP', k: 'light', t: 'pause' }] }),
    skater: (S, g, a, air) => ({ name: 'Style points', note: 'The Kickflip sends them up: jump after them, Shove-It, and the Board Drop.', steps: [...g.map(L), { e: 'jump', k: 'jump' }, ...air] }),
  });
  /* where a line's own rules change a common trial */
  const FIX = {
    // the Flintlock: the first Heavy of a combo is a Quick Shot, so the launcher comes after one
    pirate: (T, S, g, a, air) => {
      const t = T.find(x => x.name === 'Launcher');
      t.name = 'Smoke and steel'; t.stars = 3; t.note = 'The first Heavy in a combo is a Quick Shot; the string starts again, and the next Heavy launches.';
      t.steps = [L(g[0]), { m: S.gunCancel, k: 'heavy' }, L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, ...air];
      const s = T.find(x => x.name === 'Special cancel');
      s.name = 'Gunslinger'; s.note = 'One Light, then Heavy: a Quick Shot, then the whole string again.'; s.steps = [L(g[0]), { m: S.gunCancel, k: 'heavy' }, ...g.map(L)];
    },
    // the Chain Hook drags them in rather than out: the Ninja's wall combo starts with the dash attack
    ninja: (T, S, g) => {
      const t = T.find(x => x.name === 'KNOCK//BACK');
      t.note = 'Dodge at them, then Light: Shadow Kick sends them into the wall. Catch them on the rebound.';
      t.steps = [{ m: S.dashAtk, k: 'light', t: 'dash' }, { e: 'bounce' }, L(g[0]), L(g[1])];
    },
  };
  // the KUNOICHI's hairpins KNOCK from so close she'd overrun the rebound on foot: she jumps to meet it
  // the MARAUDER's grapnel hauls them in: his wall combo is the whole string, the Cleave
  FIX.marauder = (T, S, g) => {
    const t = T.find(x => x.name === 'KNOCK//BACK');
    t.note = 'The whole string: the Cleave KNOCKS them into the wall. Catch them on the rebound.'; t.steps = [...g.map(L), { e: 'bounce' }, L(g[0]), L(g[1])];
  };
  FIX.kunoichi = (T, S, g, a, air) => {
    const t = T.find(x => x.name === 'KNOCK//BACK');
    t.note = 'Toward + Heavy mid-string: the Kanzashi Volley KNOCKS them into the wall. Jump to meet the rebound with the air string.';
    t.steps = [L(g[0]), L(g[1]), { m: S.heavy, k: 'heavy', t: 'toward' }, { e: 'bounce' }, { e: 'jump', k: 'jump' }, ...air.slice(0, 2)];
  };
  /* ---------------------------------------------------- ADVANCED trials
     each line's own long routes (the move ids are its base kit's) */
  const H = (id, t) => ({ m: id, k: 'heavy', t: t || '' }), TW = id => ({ m: id, k: 'heavy', t: 'toward' }), A = id => ({ m: id, k: 'light', t: 'air' }), AH = id => ({ m: id, k: 'heavy', t: 'air' });
  const PZ = id => ({ m: id, k: 'light', t: 'pause' }), J = { e: 'jump', k: 'jump' }, WB = { e: 'bounce' }, GB = { e: 'gbounce' }, ART = [{ e: 'super', k: 'super' }, { e: 'art' }];
  const OTG = (id, k) => ({ m: id, k: k || 'heavy', t: 'otg' }), SPC = (id, nohit) => ({ m: id, k: 'special', t: nohit ? 'nohit' : '' });
  const TOSS = { m: 'impToss', k: 'toss' }, PICK = { e: 'pickup' };
  const MASH = id => ({ m: id, k: 'light', t: 'mash' }), FAR = id => ({ m: id, k: 'heavy', t: 'far' });
  const ADV = {
    samurai: () => [
      { name: 'Tsubame return', stars: 3, note: 'Launch, Tsubame Gaeshi spikes them off the floor: catch the GROUND BOUNCE with the whole string.', steps: [L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), A('kaAirB'), A('kaAirC'), GB, L('kaA'), L('kaB'), L('kaC'), L('kaD')] },
      { name: 'Helm splitter', stars: 4, note: 'Cut the air string short with Kabuto-wari (air Heavy), then launch them again off the ground bounce.', steps: [L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), AH('kabutowari'), GB, L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), A('kaAirB'), A('kaAirC')] },
      { name: 'Wall and blade', wall: true, stars: 4, note: 'Kesa-giri into the wall, Tsubame off the rebound (each hit lifts them: launch, do not chase), and up after them.', steps: [L('kaA'), L('kaB'), TW('kesa'), WB, L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), A('kaAirB'), A('kaAirC')] },
      { name: 'Way of the sword', stars: 5, note: 'A Legend Art that ENDS a combo is a hard knockdown: they stay down, so OTG them with Kesa-giri.', steps: [L('kaA'), L('kaB'), L('kaC'), L('kaD'), J, A('kaAirA'), A('kaAirB'), A('kaAirC'), GB, L('kaA'), L('kaB'), ...ART, OTG('kesa')] },
      { name: 'Twin helms', stars: 4, note: 'Kabuto-wari spends the ground bounce, so the second one puts them on the floor: Kesa-giri OTG.', steps: [L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), AH('kabutowari'), GB, L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), AH('kabutowari'), OTG('kesa')] },
      { name: 'Iai cancel', stars: 4, note: 'Up and down with Kabuto-wari, then off the ground bounce, Iai Flash straight out of a hit.', steps: [L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), AH('kabutowari'), GB, L('kaA'), L('kaB'), SPC('iai')] },
      { name: 'Snap launch', stars: 4, note: 'SNAP CANCEL the Rising Cut (it costs Hype) so you are free sooner, and jump after them.', steps: [L('kaA'), L('kaB'), L('kaC'), L('kaD'), { e: 'snap', k: 'snap' }, J, A('kaAirA'), A('kaAirB'), A('kaAirC')] },
    ],
    knight: () => [
      { name: 'Crumple and crush', stars: 3, note: 'Pommel Strike crumples them, Judgment spikes them, and Heavy off the ground bounce is Shield Upper: up after them.', steps: [L('loA'), L('loB'), PZ('loP'), L('loA'), L('loB'), L('loC'), GB, H('shieldUpper'), J, A('loAirA'), A('loAirB')] },
      { name: 'Shield wall', wall: true, stars: 4, note: 'Shield Bash into the wall, then Judgment on the rebound for a ground bounce, and launch.', steps: [L('loA'), L('loB'), TW('shieldBash'), WB, L('loA'), L('loB'), L('loC'), GB, L('loA'), H('shieldUpper'), J, A('loAirA'), A('loAirB')] },
      { name: 'Siege engine', stars: 4, note: 'The second Judgment can\'t bounce them again: they hit the floor, and Shield Bash scoops them up (OTG).', steps: [L('loA'), L('loB'), L('loC'), GB, L('loA'), L('loB'), L('loC'), OTG('shieldBash')] },
      { name: 'Holy Lance', wall: true, stars: 5, note: 'Into the wall, the Legend Art off the rebound, then OTG the hard knockdown.', steps: [L('loA'), L('loB'), TW('shieldBash'), WB, L('loA'), L('loB'), ...ART, OTG('shieldBash')] },
      { name: 'Shield drop', stars: 4, note: 'Shield Drop from the air for the ground bounce, then Judgment puts them on the floor.', steps: [L('loA'), L('loB'), H('shieldUpper'), J, A('loAirA'), AH('shieldDrop'), GB, L('loA'), L('loB'), L('loC')] },
      { name: 'Pommel toss', stars: 3, note: 'Crumple them, then a Part Toss mid-string to extend it.', steps: [L('loA'), L('loB'), PZ('loP'), L('loA'), L('loB'), { m: 'partToss', k: 'toss' }, L('loA'), L('loB'), L('loC')] },
      { name: 'Sabaton', stars: 4, note: 'Judgment, Shield Upper off the bounce, Plunging Thrust puts them down: Sabaton Stomp OTG (Dodge, then Light).', steps: [L('loA'), L('loB'), L('loC'), GB, H('shieldUpper'), J, A('loAirA'), A('loAirB'), OTG('stomp', 'light')] },
    ],
    pirate: () => [
      { name: 'Pistols and powder', wall: true, stars: 3, note: 'Only the pistol and the cannons: Point Blank into the wall, and BROADSIDE as they come off it.', steps: [H('pointBlank', 'far'), WB, ...ART] },
      { name: 'Six-shooter', stars: 4, note: 'Quick Shot, Pistol Whip, a Plunging Shot from the air, and a second Pistol Whip off the ground bounce.', steps: [L('cuA'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), H('pistolWhip')] },
      { name: 'Dirty deeds', stars: 3, note: 'A Quick Shot starts the string over; sand in their eyes, and the whole string while they can\'t see.', steps: [L('cuA'), H('quickShot'), L('cuA'), L('cuB'), PZ('cuP'), L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
      { name: 'Keelhaul', stars: 5, note: 'Open with BROADSIDE: a raw Legend Art GROUND BOUNCES them. Then the guns: Quick Shot, Pistol Whip and a Plunging Shot.', steps: [...ART, GB, L('cuA'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot')] },
      { name: 'Plunging OTG', stars: 4, note: 'Two Plunging Shots: the first bounces them, the second puts them down for a Peg Sweep OTG.', steps: [L('cuA'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), OTG('pegSweep', 'light')] },
      { name: 'Cannonball', stars: 3, note: 'The whole air string: the Cannonball spikes them, and the whole string off the bounce.', steps: [L('cuA'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), A('cuAirB'), A('cuAirC'), GB, L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
      { name: 'Loose cannon', stars: 3, note: 'A Quick Shot, then a Part Toss to extend it again.', steps: [L('cuA'), H('quickShot'), L('cuA'), L('cuB'), { m: 'partToss', k: 'toss' }, L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
    ],
    monk: () => [
      { name: 'Sweep the leg', stars: 3, note: 'The pause branch is a Leg Sweep that launches: jump after it for the air string.', steps: [L('fiA'), L('fiB'), PZ('fiP'), J, A('fiAirA'), A('fiAirB'), A('fiAirC')] },
      { name: 'Hundred and one', wall: true, stars: 4, note: 'Mash the Flurry, Dragon Palm into the wall, and the Flurry again on the rebound into Rising Palm.', steps: [L('fiA'), L('fiB'), { m: 'fiC', k: 'light', t: 'mash' }, L('fiD'), WB, L('fiA'), L('fiB'), { m: 'fiC', k: 'light', t: 'mash' }, H('risingPalm'), J, A('fiAirA'), A('fiAirB')] },
      { name: 'Axe kick', stars: 4, note: 'Axe Kick (air Heavy) ends the air string early; launch them again off the ground bounce.', steps: [L('fiA'), L('fiB'), H('risingPalm'), J, A('fiAirA'), A('fiAirB'), AH('axeKick'), GB, L('fiA'), L('fiB'), H('risingPalm'), J, A('fiAirA'), A('fiAirB'), A('fiAirC')] },
      { name: 'Thousand palms', stars: 5, note: 'Flurry, launch, Axe Kick, the Legend Art off the ground bounce, and Thunder Palm on the knockdown.', steps: [L('fiA'), L('fiB'), { m: 'fiC', k: 'light', t: 'mash' }, H('risingPalm'), J, A('fiAirA'), AH('axeKick'), GB, L('fiA'), L('fiB'), ...ART, OTG('thunderPalm')] },
      { name: 'Whirlwind OTG', stars: 3, note: 'The Whirlwind Kick lets them fall: Thunder Palm picks them up off the floor.', steps: [L('fiA'), L('fiB'), H('risingPalm'), J, A('fiAirA'), A('fiAirB'), A('fiAirC'), OTG('thunderPalm')] },
      { name: 'Flying knee', stars: 3, note: 'Dodge at them, then Light: the Flying Knee pops them up; two hits and Rising Palm, and up after them.', steps: [{ m: 'flyingKnee', k: 'light', t: 'dash' }, L('fiA'), L('fiB'), H('risingPalm'), J, A('fiAirA'), A('fiAirB')] },
      { name: 'Palm toss', stars: 4, note: 'Flurry, launch, Axe Kick, then a Part Toss off the ground bounce and the Flurry again.', steps: [L('fiA'), L('fiB'), MASH('fiC'), H('risingPalm'), J, A('fiAirA'), AH('axeKick'), GB, L('fiA'), L('fiB'), { m: 'partToss', k: 'toss' }, L('fiA'), L('fiB'), MASH('fiC'), L('fiD')] },
    ],
    viking: () => [
      { name: 'Skull splitter', stars: 3, note: 'The pause branch splits their skull into the floor: catch the ground bounce and launch.', steps: [L('axA'), L('axB'), PZ('axP'), GB, L('axA'), L('axB'), H('upperHaft'), J, A('axAirA'), A('axAirB')] },
      { name: 'Berserker', wall: true, stars: 4, note: 'HOLD the first swing for a full wind-up (it crumples them), then Shield Ram into the wall and finish the string.', steps: [{ m: 'axA', k: 'light', t: 'hold' }, L('axB'), TW('shieldRam'), WB, L('axA'), L('axB'), L('axC')] },
      { name: 'Call of war', stars: 4, note: 'Skull Drop from the air, then the War Horn blasts them off the ground bounce.', steps: [L('axA'), L('axB'), H('upperHaft'), J, A('axAirA'), AH('skullDrop'), GB, L('axA'), SPC('warHorn')] },
      { name: 'Twilight', wall: true, stars: 5, note: 'Shield Ram into the wall, RAGNARÖK off the rebound, and Shield Ram again on the knockdown.', steps: [L('axA'), L('axB'), TW('shieldRam'), WB, L('axA'), L('axB'), ...ART, OTG('shieldRam')] },
      { name: 'Haft and drill', stars: 3, note: 'Skull Drop for the ground bounce, launch again, and the Axe Drill to finish.', steps: [L('axA'), L('axB'), H('upperHaft'), J, A('axAirA'), AH('skullDrop'), GB, L('axA'), L('axB'), H('upperHaft'), J, A('axAirA'), A('axAirB')] },
      { name: 'Wind-up toss', stars: 3, note: 'A full wind-up, then a Part Toss to extend into the Whirlwind.', steps: [{ m: 'axA', k: 'light', t: 'hold' }, L('axB'), { m: 'partToss', k: 'toss' }, L('axA'), L('axB'), L('axC')] },
      { name: 'Horn and splitter', stars: 4, note: 'The Skull Splitter bounces them; the War Horn blasts them on the way back up.', steps: [L('axA'), L('axB'), PZ('axP'), GB, L('axA'), SPC('warHorn')] },
    ],
    ninja: () => [
      { name: 'Get over here', stars: 3, gap: 4, note: 'The Chain Hook from range drags them to you: the whole string.', steps: [H('chainHook', 'far'), L('taA'), L('taB'), L('taC'), L('taD')] },
      { name: 'Hook and blade', stars: 4, gap: 4, note: 'Hook them in, Shadow Slash knocks them away: hook them back (→ + Heavy) and launch.', steps: [H('chainHook', 'far'), L('taA'), L('taB'), L('taC'), L('taD'), { m: 'chainHook', k: 'heavy', t: 'far' }, L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), A('taAirB')] },
      { name: 'Kunai storm', stars: 4, note: 'Shadow Dash twice in one jump, then Kunai Rain spikes them: catch the ground bounce.', steps: [L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), { e: 'airdash', k: 'dodge' }, A('taAirA'), { e: 'airdash', k: 'dodge' }, A('taAirA'), A('taAirB'), A('taAirC'), GB, L('taA'), L('taB'), L('taC'), L('taD')] },
      { name: 'Ninth night', stars: 5, gap: 4, note: 'Hook, launch, Chain Drop, the Legend Art off the ground bounce, and a Shadow Kick OTG.', steps: [H('chainHook', 'far'), L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), AH('chainDrop'), GB, L('taA'), L('taB'), ...ART, OTG('shadowKick', 'light')] },
      { name: 'Kunai toss', stars: 3, note: 'The pause branch throws a Kunai: then the whole string.', steps: [L('taA'), L('taB'), PZ('taP'), L('taA'), L('taB'), L('taC'), L('taD')] },
      { name: 'Chain drop', stars: 4, note: 'Chain Drop twice: the first bounces them, the second puts them down for a Shadow Kick OTG.', steps: [L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), AH('chainDrop'), GB, L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), AH('chainDrop'), OTG('shadowKick', 'light')] },
      { name: 'Hook and toss', stars: 4, gap: 4, note: 'Hook them in from range, then a Part Toss mid-string to extend it.', steps: [FAR('chainHook'), L('taA'), L('taB'), { m: 'partToss', k: 'toss' }, L('taA'), L('taB'), L('taC'), L('taD')] },
    ],
    summoner: () => [
      { name: 'Pack hunt', stars: 3, note: 'Two imps first; Sic \'Em sends them in, and the Conjure Bolt finishes.', steps: [SPC('summonPair', 1), L('smA'), L('smB'), L('smC'), L('smD')] },
      { name: 'Familiar', stars: 4, note: 'Imps out, Sic \'Em sends them in, then Rising Glyph and a Spirit Bolt from above.', steps: [SPC('summonPair', 1), L('smA'), L('smB'), L('smC'), H('risingGlyph'), J, A('smAirA'), A('smAirB')] },
      { name: 'Spirit bolts', stars: 4, note: 'Spirit Bolt spikes them from the air. Still up there, Falling Tome (air Heavy) meets the ground bounce and puts them down: Staff Sweep picks them up (OTG).', steps: [L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), A('smAirB'), GB, AH('fallingTome'), OTG('staffSweep', 'light')] },
      { name: 'Fetch!', stars: 3, note: 'Imps out, then run into one to PICK IT UP. Mid-string, Toss throws the imp instead of a part: it extends the combo.', steps: [SPC('summonPair', 1), PICK, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), L('smC'), L('smD')] },
      { name: 'Imp juggler', stars: 5, imps: 2, note: 'Two imps in hand: throw one, carry on, throw the other. Every imp is an extension, so the combo goes all the way up.', steps: [L('smA'), L('smB'), TOSS, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), A('smAirB')] },
      { name: 'Grand summoning', stars: 5, imps: 1, note: 'An imp in hand, and open with the Legend Art: a raw one GROUND BOUNCES them. Throw the imp to extend, then up after them.', steps: [...ART, GB, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), A('smAirB')] },
      { name: 'Tome OTG', stars: 4, note: 'Falling Tome twice: the first bounces them, the second puts them down for a Staff Sweep OTG.', steps: [L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), AH('fallingTome'), GB, L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), AH('fallingTome'), OTG('staffSweep', 'light')] },
    ],
    paladin: () => [
      { name: 'Meteor', stars: 3, note: 'Meteor Hammer spikes them; Consecrate them off the ground bounce.', steps: [L('paA'), L('paB'), H('shieldLift'), J, A('paAirA'), A('paAirB'), GB, L('paA'), L('paB'), L('paC')] },
      { name: 'Hallowed ground', wall: true, stars: 4, note: 'Hallowed Strike crumples them, Radiant Bash into the wall, and the string on the rebound.', steps: [L('paA'), L('paB'), PZ('paP'), L('paA'), L('paB'), TW('radiantBash'), WB, L('paA'), L('paB'), L('paC')] },
      { name: 'Holy nova', stars: 4, note: 'Shield Slam from the air, then Holy Nova blasts them off the ground bounce.', steps: [L('paA'), L('paB'), H('shieldLift'), J, A('paAirA'), AH('shieldSlam'), GB, L('paA'), SPC('holyNova')] },
      { name: 'Dawn', wall: true, stars: 5, note: 'Radiant Bash into the wall, the Legend Art off the rebound, and Radiant Bash on the knockdown.', steps: [L('paA'), L('paB'), TW('radiantBash'), WB, L('paA'), L('paB'), ...ART, OTG('radiantBash')] },
      { name: 'Meteor OTG', stars: 4, note: 'Crumple, up, the Meteor Hammer bounces them and they land: Radiant Bash OTG, and Consecrate.', steps: [L('paA'), L('paB'), PZ('paP'), L('paA'), L('paB'), H('shieldLift'), J, A('paAirA'), A('paAirB'), GB, OTG('radiantBash'), L('paA'), L('paB'), L('paC')] },
      { name: 'Smite toss', stars: 3, note: 'Crumple them with the Hallowed Strike, then a Part Toss to extend into Consecrate.', steps: [L('paA'), L('paB'), PZ('paP'), L('paA'), L('paB'), { m: 'partToss', k: 'toss' }, L('paA'), L('paB'), L('paC')] },
      { name: 'Shield rush', wall: true, stars: 3, note: 'Dodge at them, then Light: the Shield Rush carries them into the wall. Catch the rebound.', steps: [{ m: 'shieldRush', k: 'light', t: 'dash' }, WB, L('paA'), L('paB'), L('paC')] },
    ],
    dragoon: () => [
      { name: 'Rising lance', stars: 3, note: 'The whole string launches; Vault off the air hit for a fresh jump and dive.', steps: [L('drA'), L('drB'), L('drC'), L('drD'), J, A('drAirA'), { e: 'vault', k: 'jump' }, A('drAirA'), A('drAirB')] },
      { name: 'Impaler', wall: true, stars: 4, note: 'Impaling Lunge crumples them, Wyvern Strike into the wall, and the whole string on the rebound.', steps: [L('drA'), L('drB'), PZ('drP'), L('drA'), L('drB'), TW('wyvernStrike'), WB, L('drA'), L('drB'), L('drC'), L('drD')] },
      { name: 'Dragon\'s breath', stars: 4, note: 'Talon Drop from the air, then Dragon Breath sets them burning off the ground bounce.', steps: [L('drA'), L('drB'), H('lanceVault'), J, A('drAirA'), AH('talonDrop'), GB, L('drA'), SPC('dragonBreath')] },
      { name: 'Dragonfall', stars: 5, note: 'Open with DRAGONFALL: a raw Legend Art GROUND BOUNCES them. The whole string, Vault, and the dive.', steps: [...ART, GB, L('drA'), L('drB'), L('drC'), L('drD'), J, A('drAirA'), { e: 'vault', k: 'jump' }, A('drAirA'), A('drAirB')] },
      { name: 'Talon OTG', stars: 4, note: 'Talon Drop twice: the first bounces them, the second puts them down for a Wyvern Strike OTG.', steps: [L('drA'), L('drB'), H('lanceVault'), J, A('drAirA'), AH('talonDrop'), GB, L('drA'), L('drB'), H('lanceVault'), J, A('drAirA'), AH('talonDrop'), OTG('wyvernStrike')] },
      { name: 'Lance dash', wall: true, stars: 3, note: 'Dodge at them, then Light: the Lance Dash carries them into the wall. Off the rebound, Lance Vault and up.', steps: [{ m: 'lanceDash', k: 'light', t: 'dash' }, WB, L('drA'), L('drB'), H('lanceVault'), J, A('drAirA'), A('drAirB')] },
      { name: 'Lunge and breath', stars: 4, note: 'The Impaling Lunge crumples them; then Dragon Breath sets them burning mid-string.', steps: [L('drA'), L('drB'), PZ('drP'), L('drA'), L('drB'), SPC('dragonBreath')] },
    ],
    bard: () => [
      { name: 'Lullaby', stars: 3, note: 'The pause branch sings them to sleep: then the whole string.', steps: [L('baA'), L('baB'), PZ('baP'), L('baA'), L('baB'), L('baC'), L('baD')] },
      { name: 'Bass drop', stars: 4, note: 'Bass Drop from the air, then the whole string off the ground bounce.', steps: [L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), AH('bassDrop'), GB, L('baA'), L('baB'), L('baC'), L('baD')] },
      { name: 'Encore', wall: true, stars: 4, note: 'Start ON the beat, Encore! into the wall, and the rebound into Rising Note.', steps: [{ m: 'baA', k: 'light', t: 'beat' }, L('baB'), L('baC'), L('baD'), WB, L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), A('baAirB')] },
      { name: 'Grand finale', wall: true, stars: 5, note: 'Lullaby, Sonic Boom into the wall, the Legend Art off the rebound, and a Twirl Kick OTG.', steps: [L('baA'), L('baB'), PZ('baP'), L('baA'), L('baB'), TW('sonicBoom'), WB, L('baA'), L('baB'), ...ART, OTG('twirlKick', 'light')] },
      { name: 'Crescendo OTG', stars: 3, note: 'The Crescendo lets them fall: a Twirl Kick (Dodge, then Light) picks them up.', steps: [L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), A('baAirB'), OTG('twirlKick', 'light')] },
      { name: 'Sonic wall', wall: true, stars: 3, note: 'Sonic Boom into the wall, and Rising Note off the rebound.', steps: [L('baA'), L('baB'), TW('sonicBoom'), WB, L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), A('baAirB')] },
      { name: 'Sleep and toss', stars: 3, note: 'Sing them to sleep, then a Part Toss to extend into Encore!', steps: [L('baA'), L('baB'), PZ('baP'), L('baA'), L('baB'), { m: 'partToss', k: 'toss' }, L('baA'), L('baB'), L('baC'), L('baD')] },
    ],
  };

  /* ------------------------------------------------ PROFESSIONAL trials
     the longest and hardest-hitting routes in the game: every mechanic there is. KNOCK//BACKs and wall bounces,
     launchers, air spikes and the ground bounce, Special cancels, Snap Cancels, Part Toss (or imp) extensions, each
     fighter's own tricks, and the Legend Arts, raw or to end it, with the OTGs after. (A Part Toss throws your HEAD
     first, so a route uses its Special before its first toss.) */
  const PT = { m: 'partToss', k: 'toss' }, SNAP = { e: 'snap', k: 'snap' }, AD = { e: 'airdash', k: 'dodge' }, VLT = { e: 'vault', k: 'jump' };
  const PRO = {
    samurai: () => [
      { name: 'Thousand cuts', wall: true, note: 'Rising Cut and up, Tsubame Gaeshi into a ground bounce, Kesa-giri into the wall, a Part Toss, and THOUSAND CUTS to end it: OTG the knockdown.', steps: [L('kaA'), L('kaB'), L('kaC'), L('kaD'), J, A('kaAirA'), A('kaAirB'), A('kaAirC'), GB, L('kaA'), L('kaB'), TW('kesa'), WB, L('kaA'), L('kaB'), PT, L('kaA'), L('kaB'), ...ART, OTG('kesa')] },
      { name: 'Swallow\'s return', note: 'Kabuto-wari spends the ground bounce, so the second Tsubame Gaeshi puts them down: OTG with Kesa-giri and the whole string again.', steps: [L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), AH('kabutowari'), GB, L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), A('kaAirB'), A('kaAirC'), OTG('kesa'), L('kaA'), L('kaB'), L('kaC'), L('kaD')] },
      { name: 'Iai', note: 'Rising Cut and up, Tsubame Gaeshi for the ground bounce, and IAI FLASH straight out of the string: a dash through them.', steps: [L('kaA'), L('kaB'), L('kaC'), L('kaD'), J, A('kaAirA'), A('kaAirB'), A('kaAirC'), GB, L('kaA'), L('kaB'), SPC('iai')] },
      { name: 'Snap and sheathe', note: 'SNAP CANCEL the Rising Cut\'s recovery and jump after them sooner; the air string spikes, and two Part Tosses keep it going.', steps: [L('kaA'), L('kaB'), L('kaC'), L('kaD'), SNAP, J, A('kaAirA'), A('kaAirB'), A('kaAirC'), GB, L('kaA'), L('kaB'), PT, L('kaA'), L('kaB'), PT, L('kaA'), L('kaB'), L('kaC'), L('kaD')] },
      { name: 'Endless blade', note: 'Two Part Tosses, two extensions (the second one is your L-arm: no Heavies after it), then the Rising Cut and up for Tsubame Gaeshi.', steps: [L('kaA'), L('kaB'), H('tsubame'), J, A('kaAirA'), A('kaAirB'), A('kaAirC'), GB, L('kaA'), L('kaB'), PT, L('kaA'), L('kaB'), PT, L('kaA'), L('kaB'), L('kaC'), L('kaD'), J, A('kaAirA'), A('kaAirB'), A('kaAirC')] },
    ],
    knight: () => [
      { name: 'Siege of the keep', wall: true, note: 'Judgment, Shield Upper, Plunging Thrust puts them down: OTG, Shield Bash into the wall, then the HOLY LANCE and a Sabaton Stomp OTG.', steps: [L('loA'), L('loB'), L('loC'), GB, H('shieldUpper'), J, A('loAirA'), A('loAirB'), OTG('shieldBash'), L('loA'), L('loB'), TW('shieldBash'), WB, L('loA'), L('loB'), ...ART, OTG('stomp', 'light')] },
      { name: 'Crusade', note: 'Crumple, Judgment, Shield Upper; Shield Drop puts them down for the OTG, and a Part Toss for the rest.', steps: [L('loA'), L('loB'), PZ('loP'), L('loA'), L('loB'), L('loC'), GB, H('shieldUpper'), J, A('loAirA'), AH('shieldDrop'), OTG('shieldBash'), L('loA'), L('loB'), PT, L('loA'), L('loB'), L('loC')] },
      { name: 'Bulwark', note: 'While they fold up from the Pommel Strike, raise BULWARK (armour), then the whole route.', steps: [L('loA'), L('loB'), PZ('loP'), SPC('bulwark', 1), L('loA'), L('loB'), L('loC'), GB, H('shieldUpper'), J, A('loAirA'), A('loAirB')] },
      { name: 'Holy order', wall: true, note: 'Shield Bash into the wall, Judgment for the ground bounce, Shield Upper, Shield Drop puts them down: OTG and Judgment again.', steps: [L('loA'), L('loB'), TW('shieldBash'), WB, L('loA'), L('loB'), L('loC'), GB, H('shieldUpper'), J, A('loAirA'), AH('shieldDrop'), OTG('shieldBash'), L('loA'), L('loB'), L('loC')] },
      { name: 'Last stand', note: 'Judgment, a Part Toss (it gives back the ground bounce), Judgment again, and the HOLY LANCE off the second bounce with a Sabaton Stomp OTG.', steps: [L('loA'), L('loB'), L('loC'), GB, L('loA'), L('loB'), PT, L('loA'), L('loB'), L('loC'), GB, L('loA'), L('loB'), ...ART, OTG('stomp', 'light')] },
    ],
    pirate: () => [
      { name: 'Dead man\'s chest', wall: true, note: 'Quick Shot, Pistol Whip, a Plunging Shot, Point Blank into the wall off the bounce, a Part Toss, then BROADSIDE and a Peg Sweep OTG.', steps: [L('cuA'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), TW('pointBlank'), WB, L('cuA'), L('cuB'), PT, L('cuA'), L('cuB'), ...ART, OTG('pegSweep', 'light')] },
      { name: 'Gun kata', note: 'All pistol: Quick Shot, Pistol Whip, Plunging Shot, Pistol Whip again off the ground bounce, Plunging Shot to put them down, and a Peg Sweep OTG.', steps: [L('cuA'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), OTG('pegSweep', 'light')] },
      { name: 'Dirty pirate', wall: true, note: 'Sand, a Quick Shot, the Boot to the Face into the wall, and up off the rebound.', steps: [L('cuA'), L('cuB'), PZ('cuP'), L('cuA'), H('quickShot'), L('cuA'), L('cuB'), L('cuC'), L('cuD'), WB, L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), A('cuAirB'), A('cuAirC')] },
      { name: 'Broadside', note: 'Open with BROADSIDE (a raw Art bounces them), the guns, a Plunging Shot to put them down, a Peg Sweep OTG and a Part Toss.', steps: [...ART, GB, L('cuA'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), OTG('pegSweep', 'light'), L('cuA'), L('cuB'), PT, L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
      { name: 'Keelhauled', wall: true, note: 'Point Blank from range into the wall, Quick Shot, Pistol Whip, a Plunging Shot, a Part Toss and the Boot.', steps: [FAR('pointBlank'), WB, L('cuA'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), PT, L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
    ],
    monk: () => [
      { name: 'Thousand fists', wall: true, note: 'Flurry, up, Axe Kick, the Flurry and the Dragon Palm into the wall, a Part Toss, then HUNDRED HANDS and Thunder Palm on the knockdown.', steps: [L('fiA'), L('fiB'), MASH('fiC'), H('risingPalm'), J, A('fiAirA'), AH('axeKick'), GB, L('fiA'), L('fiB'), MASH('fiC'), L('fiD'), WB, L('fiA'), L('fiB'), PT, L('fiA'), L('fiB'), ...ART, OTG('thunderPalm')] },
      { name: 'Leg sweep', note: 'The Leg Sweep launches; Axe Kick for the ground bounce, and the whole air string from the second launch.', steps: [L('fiA'), L('fiB'), PZ('fiP'), J, A('fiAirA'), A('fiAirB'), AH('axeKick'), GB, L('fiA'), L('fiB'), H('risingPalm'), J, A('fiAirA'), A('fiAirB'), A('fiAirC')] },
      { name: 'Flow', note: 'Flurry and launch; the Whirlwind lets them fall, so OTG with Thunder Palm and go again: Axe Kick, the ground bounce, the Flurry and the Palm.', steps: [L('fiA'), L('fiB'), MASH('fiC'), H('risingPalm'), J, A('fiAirA'), A('fiAirB'), A('fiAirC'), OTG('thunderPalm'), L('fiA'), L('fiB'), H('risingPalm'), J, A('fiAirA'), AH('axeKick'), GB, L('fiA'), L('fiB'), MASH('fiC'), L('fiD')] },
      { name: 'Snap palm', wall: true, note: 'SNAP CANCEL the Dragon Palm so you are ready for the rebound: the Flurry again, and up.', steps: [L('fiA'), L('fiB'), MASH('fiC'), L('fiD'), SNAP, WB, L('fiA'), L('fiB'), MASH('fiC'), H('risingPalm'), J, A('fiAirA'), A('fiAirB'), A('fiAirC')] },
      { name: 'Enlightenment', note: 'Two Part Tosses after the ground bounce, two extensions, and the Flurry into the Dragon Palm.', steps: [L('fiA'), L('fiB'), H('risingPalm'), J, A('fiAirA'), AH('axeKick'), GB, L('fiA'), L('fiB'), PT, L('fiA'), L('fiB'), PT, L('fiA'), L('fiB'), MASH('fiC'), L('fiD')] },
    ],
    viking: () => [
      { name: 'Valhalla', wall: true, note: 'Up and Skull Drop, Shield Ram into the wall off the ground bounce, a Part Toss, then RAGNARÖK and Shield Ram on the knockdown.', steps: [L('axA'), L('axB'), H('upperHaft'), J, A('axAirA'), AH('skullDrop'), GB, L('axA'), L('axB'), TW('shieldRam'), WB, L('axA'), L('axB'), PT, L('axA'), L('axB'), ...ART, OTG('shieldRam')] },
      { name: 'Skull and horn', note: 'Skull Splitter, launch, the Axe Drill puts them down: OTG, and the War Horn.', steps: [L('axA'), L('axB'), PZ('axP'), GB, L('axA'), L('axB'), H('upperHaft'), J, A('axAirA'), A('axAirB'), OTG('shieldRam'), L('axA'), SPC('warHorn')] },
      { name: 'Berserker rage', wall: true, note: 'A full wind-up, up, Skull Drop, Shield Ram into the wall off the ground bounce, and the Whirlwind off the rebound.', steps: [{ m: 'axA', k: 'light', t: 'hold' }, L('axB'), H('upperHaft'), J, A('axAirA'), AH('skullDrop'), GB, L('axA'), L('axB'), TW('shieldRam'), WB, L('axA'), L('axB'), L('axC')] },
      { name: 'Fury', note: 'Wind-up, launch, Skull Drop, and two Part Tosses into the Whirlwind.', steps: [{ m: 'axA', k: 'light', t: 'hold' }, L('axB'), H('upperHaft'), J, A('axAirA'), AH('skullDrop'), GB, L('axA'), L('axB'), PT, L('axA'), L('axB'), PT, L('axA'), L('axB'), L('axC')] },
      { name: 'Ragnarök', note: 'Open with RAGNARÖK: a raw Art bounces them. Up, the Axe Drill puts them down, OTG, a Part Toss and the Whirlwind.', steps: [...ART, GB, L('axA'), L('axB'), H('upperHaft'), J, A('axAirA'), A('axAirB'), OTG('shieldRam'), L('axA'), L('axB'), PT, L('axA'), L('axB'), L('axC')] },
    ],
    ninja: () => [
      { name: 'Shadow of the moon', gap: 4, note: 'Hook, the string, hook them back, up with two Shadow Dashes, Kunai Rain for the ground bounce, and the Legend Art with a Shadow Kick OTG.', steps: [FAR('chainHook'), L('taA'), L('taB'), L('taC'), L('taD'), FAR('chainHook'), L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), AD, A('taAirA'), A('taAirB'), A('taAirC'), GB, L('taA'), L('taB'), ...ART, OTG('shadowKick', 'light')] },
      { name: 'Chain gang', gap: 4, note: 'Hook, the whole string, the second hook, up, Chain Drop, a Part Toss off the ground bounce, and up again.', steps: [FAR('chainHook'), L('taA'), L('taB'), L('taC'), L('taD'), FAR('chainHook'), L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), AH('chainDrop'), GB, L('taA'), L('taB'), PT, L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), A('taAirB')] },
      { name: 'Kunai', note: 'Kunai Toss mid-string, then up: Shadow Dash twice, Kunai Rain, and the whole string off the ground bounce.', steps: [L('taA'), L('taB'), PZ('taP'), L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), AD, A('taAirA'), AD, A('taAirA'), A('taAirB'), A('taAirC'), GB, L('taA'), L('taB'), L('taC'), L('taD')] },
      { name: 'Ninth night', note: 'Up, Shadow Dash, Chain Drop, a Part Toss, and the Legend Art with a Shadow Kick OTG.', steps: [L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), AD, A('taAirA'), AH('chainDrop'), GB, L('taA'), L('taB'), PT, L('taA'), L('taB'), ...ART, OTG('shadowKick', 'light')] },
      { name: 'Vanishing', gap: 4, note: 'Hook, Kunai Toss, the string, hook again, and up for the full air string.', steps: [FAR('chainHook'), L('taA'), L('taB'), PZ('taP'), L('taA'), L('taB'), L('taC'), L('taD'), FAR('chainHook'), L('taA'), L('taB'), H('sickleRise'), J, A('taAirA'), AD, A('taAirA'), A('taAirB'), A('taAirC')] },
    ],
    summoner: () => [
      { name: 'Legion', imps: 2, note: 'Two imps in hand: throw, throw, then up for the Spirit Bolt and Sic \'Em off the ground bounce.', steps: [L('smA'), L('smB'), TOSS, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), A('smAirB'), GB, L('smA'), L('smB'), L('smC'), L('smD')] },
      { name: 'Grand familiar', imps: 2, note: 'Open with the Legend Art (raw: a ground bounce), an imp (it gives the ground bounce back), up, Falling Tome for the second bounce, the other imp, and Sic Em into the Conjure Bolt.', steps: [...ART, GB, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), AH('fallingTome'), GB, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), L('smC'), L('smD')] },
      { name: 'Fetch and carry', note: 'Summon, pick up BOTH imps, and throw them both mid-combo.', steps: [SPC('summonPair', 1), PICK, PICK, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), L('smC'), L('smD')] },
      { name: 'Hex master', wall: true, note: 'Up, Falling Tome, Hex Blast into the wall off the ground bounce, and Sic Em off the rebound.', steps: [L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), AH('fallingTome'), GB, L('smA'), L('smB'), TW('hexBlast'), WB, L('smA'), L('smB'), L('smC')] },
      { name: 'Spirit army', imps: 2, note: 'Falling Tome for the ground bounce, then both imps, one after the other, and Sic Em into the Conjure Bolt.', steps: [L('smA'), L('smB'), H('risingGlyph'), J, A('smAirA'), AH('fallingTome'), GB, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), TOSS, L('smA'), L('smB'), L('smC'), L('smD')] },
    ],
    paladin: () => [
      { name: 'Crusader', wall: true, note: 'Up and Shield Slam, Radiant Bash into the wall off the ground bounce, a Part Toss, then JUDGMENT OF DAWN and Radiant Bash on the knockdown.', steps: [L('paA'), L('paB'), H('shieldLift'), J, A('paAirA'), AH('shieldSlam'), GB, L('paA'), L('paB'), TW('radiantBash'), WB, L('paA'), L('paB'), PT, L('paA'), L('paB'), ...ART, OTG('radiantBash')] },
      { name: 'Hallowed', note: 'Hallowed Strike crumples, the Meteor Hammer spikes, and Consecrate off the ground bounce.', steps: [L('paA'), L('paB'), PZ('paP'), L('paA'), L('paB'), H('shieldLift'), J, A('paAirA'), A('paAirB'), GB, L('paA'), L('paB'), L('paC')] },
      { name: 'Holy nova', wall: true, note: 'Up and Shield Slam, Radiant Bash into the wall off the ground bounce, and Holy Nova off the rebound.', steps: [L('paA'), L('paB'), H('shieldLift'), J, A('paAirA'), AH('shieldSlam'), GB, L('paA'), L('paB'), TW('radiantBash'), WB, L('paA'), SPC('holyNova')] },
      { name: 'Divine wrath', wall: true, note: 'Crumple, up, the Meteor Hammer, Radiant Bash into the wall off the ground bounce, a Part Toss and Consecrate.', steps: [L('paA'), L('paB'), PZ('paP'), L('paA'), L('paB'), H('shieldLift'), J, A('paAirA'), A('paAirB'), GB, L('paA'), L('paB'), TW('radiantBash'), WB, L('paA'), L('paB'), PT, L('paA'), L('paB'), L('paC')] },
      { name: 'Dawn breaks', note: 'Open with the Legend Art (raw: a ground bounce), then two Part Tosses, two extensions, and Consecrate.', steps: [...ART, GB, L('paA'), L('paB'), PT, L('paA'), L('paB'), PT, L('paA'), L('paB'), L('paC')] },
    ],
    dragoon: () => [
      { name: 'Dragon rider', wall: true, note: 'Rising Lance, Vault, Talon Drop, Wyvern Strike into the wall off the ground bounce, a Part Toss and the whole string.', steps: [L('drA'), L('drB'), L('drC'), L('drD'), J, A('drAirA'), VLT, A('drAirA'), AH('talonDrop'), GB, L('drA'), L('drB'), TW('wyvernStrike'), WB, L('drA'), L('drB'), PT, L('drA'), L('drB'), L('drC'), L('drD')] },
      { name: 'Skyborne', note: 'Vault, Dragon Dive, then Lance Vault and Talon Drop to put them down: Wyvern Strike OTG.', steps: [L('drA'), L('drB'), L('drC'), L('drD'), J, A('drAirA'), VLT, A('drAirA'), A('drAirB'), GB, L('drA'), L('drB'), H('lanceVault'), J, A('drAirA'), AH('talonDrop'), OTG('wyvernStrike')] },
      { name: 'Impaler', wall: true, note: 'Impaling Lunge, Rising Lance, Vault and Talon Drop, Wyvern Strike into the wall off the ground bounce, and Dragon Breath off the rebound.', steps: [L('drA'), L('drB'), PZ('drP'), L('drA'), L('drB'), L('drC'), L('drD'), J, A('drAirA'), VLT, A('drAirA'), AH('talonDrop'), GB, L('drA'), L('drB'), TW('wyvernStrike'), WB, L('drA'), SPC('dragonBreath')] },
      { name: 'Dragonfall', note: 'Open with DRAGONFALL (raw: a ground bounce), Vault, Talon Drop puts them down: Wyvern Strike OTG, a Part Toss and the whole string.', steps: [...ART, GB, L('drA'), L('drB'), L('drC'), L('drD'), J, A('drAirA'), VLT, A('drAirA'), AH('talonDrop'), OTG('wyvernStrike'), L('drA'), L('drB'), PT, L('drA'), L('drB'), L('drC'), L('drD')] },
      { name: 'Wyrm\'s reach', note: 'Impaling Lunge, the whole string, Vault, Talon Drop, a Part Toss and the string again.', steps: [L('drA'), L('drB'), PZ('drP'), L('drA'), L('drB'), L('drC'), L('drD'), J, A('drAirA'), VLT, A('drAirA'), AH('talonDrop'), GB, L('drA'), L('drB'), PT, L('drA'), L('drB'), L('drC'), L('drD')] },
    ],
    bard: () => [
      { name: 'Rock opera', wall: true, note: 'Up, Bass Drop, Encore! into the wall off the ground bounce, a Part Toss, then GRAND FINALE and a Twirl Kick OTG.', steps: [L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), AH('bassDrop'), GB, L('baA'), L('baB'), L('baC'), L('baD'), WB, L('baA'), L('baB'), PT, L('baA'), L('baB'), ...ART, OTG('twirlKick', 'light')] },
      { name: 'Serenade', wall: true, note: 'Lullaby, and while they sleep, the Song of Valor (+damage). Then Encore! into the wall and up.', steps: [L('baA'), L('baB'), PZ('baP'), SPC('valorSong', 1), L('baA'), L('baB'), L('baC'), L('baD'), WB, L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), A('baAirB')] },
      { name: 'Headliner', wall: true, note: 'Start ON the beat, up, Bass Drop, the whole string into the wall off the ground bounce, and two more off the rebound.', steps: [{ m: 'baA', k: 'light', t: 'beat' }, L('baB'), H('risingNote'), J, A('baAirA'), AH('bassDrop'), GB, L('baA'), L('baB'), L('baC'), L('baD'), WB, L('baA'), L('baB')] },
      { name: 'Drop the bass', note: 'Bass Drop for the ground bounce, up again, the Crescendo lets them fall: Twirl Kick OTG and the whole string.', steps: [L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), AH('bassDrop'), GB, L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), A('baAirB'), OTG('twirlKick', 'light'), L('baA'), L('baB'), L('baC'), L('baD')] },
      { name: 'Grand finale', wall: true, note: 'Lullaby, up, Bass Drop, Sonic Boom into the wall off the ground bounce, a Part Toss, then GRAND FINALE and a Twirl Kick OTG.', steps: [L('baA'), L('baB'), PZ('baP'), L('baA'), L('baB'), H('risingNote'), J, A('baAirA'), AH('bassDrop'), GB, L('baA'), L('baB'), TW('sonicBoom'), WB, L('baA'), L('baB'), PT, L('baA'), L('baB'), ...ART, OTG('twirlKick', 'light')] },
    ],
  };
  const TRIALS = {}, TRIALS_ADV = {}, TRIALS_PRO = {};
  /* ---- MODERN SPORTS: ADVANCED (7 each) and PROFESSIONAL (5 each) */
  const HOLD = id => ({ m: id, k: 'light', t: 'hold' });
  Object.assign(ADV, {
    wrestler: () => [
      { name: 'Slam and launch', stars: 3, note: 'Body Slam out of the string, two hits off the ground bounce, the European Uppercut, and the Elbow Drop.', steps: [L('wrA'), L('wrB'), SPC('bodySlam'), GB, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), A('wrAirB')] },
      { name: 'Leg drop', stars: 4, note: 'Cut the air string short with the Leg Drop (air Heavy), then launch them again off the ground bounce.', steps: [L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), AH('legDrop'), GB, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), A('wrAirB')] },
      { name: 'Spear', wall: true, stars: 4, note: 'The Spear runs them into the wall; uppercut off the rebound and follow them up.', steps: [L('wrA'), L('wrB'), TW('spearTackle'), WB, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), A('wrAirB')] },
      { name: 'Slam chain', stars: 3, note: 'Two hits, then BODY SLAM straight out of the string (a command grab): it ground-bounces them, and up they go.', steps: [L('wrA'), L('wrB'), SPC('bodySlam'), GB, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), A('wrAirB')] },
      { name: 'Main event', stars: 5, note: 'Leg Drop for the bounce, then MAIN EVENT to end it: a hard knockdown, so Spear them off the floor.', steps: [L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), AH('legDrop'), GB, L('wrA'), L('wrB'), ...ART, OTG('spearTackle')] },
      { name: 'Heel turn', stars: 4, note: 'Rake their eyes (dizzy), the string into a Body Slam, and the whole string off the bounce.', steps: [L('wrA'), L('wrB'), PZ('wrP'), L('wrA'), L('wrB'), SPC('bodySlam'), GB, L('wrA'), L('wrB'), L('wrC'), L('wrD')] },
      { name: 'Double drop', stars: 4, note: 'The second Leg Drop can\'t bounce them: they land, and the Spear scoops them up (OTG).', steps: [L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), AH('legDrop'), GB, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), AH('legDrop'), OTG('spearTackle')] },
    ],
    baseball: () => [
      { name: 'Bunt and run', stars: 3, note: 'The pause branch is a Bunt that pops them up: after them, the Chopper spikes, and the whole string off the bounce.', steps: [L('bbA'), L('bbB'), PZ('bbP'), J, A('bbAirA'), A('bbAirB'), GB, L('bbA'), L('bbB'), L('bbC'), L('bbD')] },
      { name: 'Sinker', stars: 4, note: 'A Sinker (air Heavy) pitches them into the floor; launch them again off the ground bounce.', steps: [L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), AH('sinker'), GB, L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), A('bbAirB')] },
      { name: 'Fastball', wall: true, stars: 4, note: 'A Fastball mid-string KNOCKS them into the wall (your one ball: it stays where it drops); two swings off the rebound and the Glove Upper.', steps: [L('bbA'), L('bbB'), TW('fastball'), WB, L('bbA'), L('bbB'), H('gloveUpper')] },
      { name: 'Grand slam', stars: 5, note: 'Sinker, the bounce, then GRAND SLAM to end it: a hard knockdown, so Base Slide them off the floor (Dodge, then Light).', steps: [L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), AH('sinker'), GB, L('bbA'), L('bbB'), ...ART, OTG('baseSlide', 'light')] },
      { name: 'Curveball', stars: 3, note: 'A Curveball straight out of the string leaves them dizzy: the whole string while they wobble.', steps: [L('bbA'), L('bbB'), SPC('curveball'), L('bbA'), L('bbB'), L('bbC'), L('bbD')] },
      { name: 'Clutch', wall: true, stars: 4, note: 'The Bat Jab staggers them: HOLD the Home Run Swing to a full wind-up, into the wall, and two swings off the rebound.', steps: [L('bbA'), L('bbB'), L('bbC'), HOLD('bbD'), WB, L('bbA'), L('bbB')] },
      { name: 'Double play', stars: 4, note: 'Sinker for the bounce; the ball is on the floor now, so Bunt them back up, and the Chopper can\'t bounce them: Base Slide them off the floor (Dodge, then Light).', steps: [L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), AH('sinker'), GB, L('bbA'), L('bbB'), PZ('bbP'), J, A('bbAirA'), A('bbAirB'), OTG('baseSlide', 'light')] },
    ],
    football: () => [
      { name: 'Pancake', stars: 3, note: 'The Pancake Block ground-bounces them: two hits, Lift Block, and up after them.', steps: [L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), A('fbAirB')] },
      { name: 'Spike it', stars: 4, note: 'Spike! (air Heavy) for the ground bounce, then Lift Block and up again.', steps: [L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), AH('ballSpike'), GB, L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), A('fbAirB')] },
      { name: 'Bullet pass', wall: true, stars: 4, note: 'A Bullet Pass mid-string KNOCKS them into the wall; Lift Block off the rebound.', steps: [L('fbA'), L('fbB'), TW('bulletPass'), WB, L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), A('fbAirB')] },
      { name: 'Touchdown', stars: 5, note: 'Pancake for the bounce, two hits, and TOUCHDOWN DRIVE to end it: the length of the field.', steps: [L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB'), ...ART] },
      { name: 'Facemask', stars: 3, note: 'Grab the facemask (they crumple), the whole string into the Pancake, and Lift Block off the bounce.', steps: [L('fbA'), L('fbB'), PZ('fbP'), L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB'), H('liftBlock')] },
      { name: 'Blitz', wall: true, stars: 4, note: 'BLITZ straight out of the string: it runs them into the wall. Lift Block off the rebound.', steps: [L('fbA'), L('fbB'), SPC('blitz'), WB, L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), A('fbAirB')] },
      { name: 'Dogpile', stars: 4, note: 'Spike! for the bounce; the Pancake after it puts them down: Shoulder Charge OTG.', steps: [L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), AH('ballSpike'), GB, L('fbA'), L('fbB'), L('fbC'), L('fbD'), OTG('shoulderCharge', 'light')] },
    ],
    soccer: () => [
      { name: 'Bicycle', stars: 3, note: 'The Bicycle Kick launches: the air string, the Overhead Kick spikes, and the whole string again.', steps: [L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB'), A('scAirC'), GB, L('scA'), L('scB'), L('scC'), L('scD')] },
      { name: 'Diving header', stars: 4, note: 'Header up, the Diving Header (air Heavy) for the bounce, and the string into the Bicycle Kick.', steps: [L('scA'), L('scB'), H('headerFlick'), J, A('scAirA'), AH('divingHeader'), GB, L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB')] },
      { name: 'Power shot', wall: true, stars: 4, note: 'A Power Shot mid-string KNOCKS them into the wall; the string and the Bicycle Kick off the rebound.', steps: [L('scA'), L('scB'), TW('powerShot'), WB, L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB'), A('scAirC')] },
      { name: 'Golden goal', stars: 5, note: 'Bicycle, the air string, the bounce, then GOLDEN GOAL to end it: Slide Tackle them off the floor.', steps: [L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB'), A('scAirC'), GB, L('scA'), L('scB'), ...ART, OTG('slideTackle', 'light')] },
      { name: 'Slide tackle', stars: 3, note: 'Bicycle and up, the Overhead Kick bounce, and the Slide Tackle pause branch off it.', steps: [L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB'), A('scAirC'), GB, L('scA'), L('scB'), PZ('scP')] },
      { name: 'Free kick', stars: 4, note: 'A Free Kick straight out of the string crumples them: the whole string and up.', steps: [L('scA'), L('scB'), SPC('freeKick'), L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB')] },
      { name: 'Hat trick', stars: 4, note: 'The second Diving Header can\'t bounce them: Slide Tackle them off the floor.', steps: [L('scA'), L('scB'), H('headerFlick'), J, A('scAirA'), AH('divingHeader'), GB, L('scA'), L('scB'), H('headerFlick'), J, A('scAirA'), AH('divingHeader'), OTG('slideTackle', 'light')] },
    ],
    boxer: () => [
      { name: 'Uppercut', stars: 3, note: 'Mash the Body Blows, Uppercut, the air string; the Overhand spikes, and Rising Uppercut off the bounce.', steps: [L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB'), A('bxAirC'), GB, L('bxA'), L('bxB'), H('risingUpper')] },
      { name: 'Hammer fist', stars: 4, note: 'Rising Uppercut, the Hammer Fist (air Heavy) for the bounce, and the string into the Uppercut.', steps: [L('bxA'), L('bxB'), H('risingUpper'), J, A('bxAirA'), AH('hammerFist'), GB, L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB')] },
      { name: 'Power hook', wall: true, stars: 4, note: 'Power Hook into the wall; off the rebound, the Body Blows and the Uppercut, and up.', steps: [L('bxA'), L('bxB'), TW('powerHook'), WB, L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB'), A('bxAirC')] },
      { name: 'Final round', stars: 5, note: 'Up, the Overhand bounce, then FINAL ROUND to end it: a hard knockdown, so Power Hook them off the floor.', steps: [L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB'), A('bxAirC'), GB, L('bxA'), L('bxB'), ...ART, OTG('powerHook')] },
      { name: 'Haymaker', stars: 3, note: 'The pause branch is a Haymaker that crumples them: the Body Blows and the Uppercut while they fold.', steps: [L('bxA'), L('bxB'), PZ('bxP'), L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB')] },
      { name: 'Ten count', stars: 4, note: 'The second Hammer Fist can\'t bounce them: Power Hook them off the floor.', steps: [L('bxA'), L('bxB'), H('risingUpper'), J, A('bxAirA'), AH('hammerFist'), GB, L('bxA'), L('bxB'), H('risingUpper'), J, A('bxAirA'), AH('hammerFist'), OTG('powerHook')] },
      { name: 'Weave and work', stars: 3, note: 'BOB & WEAVE first (the next attack misses you), then the whole combo.', steps: [SPC('bobWeave', 1), L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB'), A('bxAirC')] },
    ],
    fencer: () => [
      { name: 'Prise de fer', stars: 3, note: 'Prise de Fer lifts them: the Plunging Point spikes, and the whole string off the bounce.', steps: [L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), A('feAirB'), GB, L('feA'), L('feB'), L('feC'), L('feD')] },
      { name: 'Point drop', stars: 4, note: 'Point Drop (air Heavy) for the bounce, then Prise de Fer and up again.', steps: [L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), AH('pointDrop'), GB, L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), A('feAirB')] },
      { name: 'Balestra', wall: true, stars: 4, note: 'The Balestra Lunge runs them into the wall; the whole string off the rebound, Flurry and Coupé.', steps: [L('feA'), L('feB'), TW('balestra'), WB, L('feA'), L('feB'), L('feC'), L('feD')] },
      { name: 'Touché', stars: 5, note: 'Point Drop for the bounce, then TOUCHÉ to end it: a hard knockdown, so Balestra them off the floor.', steps: [L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), AH('pointDrop'), GB, L('feA'), L('feB'), ...ART, OTG('balestra')] },
      { name: 'Coupé', wall: true, stars: 3, note: 'The whole string: the Coupé knocks them into the wall. Off the rebound, two thrusts and the Flèche.', steps: [L('feA'), L('feB'), L('feC'), L('feD'), WB, L('feA'), L('feB'), PZ('feP')] },
      { name: 'Remise', stars: 4, note: 'Up and down for the bounce, then three thrusts and Prise de Fer again.', steps: [L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), A('feAirB'), GB, L('feA'), L('feB'), L('feC'), H('priseDeFer'), J, A('feAirA'), A('feAirB')] },
      { name: 'Double point', stars: 4, note: 'The second Point Drop can\'t bounce them: Balestra them off the floor.', steps: [L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), AH('pointDrop'), GB, L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), AH('pointDrop'), OTG('balestra')] },
    ],
    weightlifter: () => [
      { name: 'Press', stars: 3, note: 'The Overhead Press ground-bounces them: two swings, Clean & Jerk, and up.', steps: [L('wlA'), L('wlB'), L('wlC'), GB, L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), A('wlAirB')] },
      { name: 'Kettle drop', stars: 4, note: 'Kettle Drop (air Heavy) for the bounce, then Clean & Jerk and up again.', steps: [L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), AH('kettleDrop'), GB, L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), A('wlAirB')] },
      { name: 'Kettlebell', wall: true, stars: 4, note: 'The Kettlebell Swing sends them into the wall; Clean & Jerk off the rebound.', steps: [L('wlA'), L('wlB'), TW('kettleSwing'), WB, L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), A('wlAirB')] },
      { name: 'World record', stars: 5, note: 'Press for the bounce, then WORLD RECORD to end it: a hard knockdown, so swing the Kettlebell off the floor.', steps: [L('wlA'), L('wlB'), L('wlC'), GB, L('wlA'), L('wlB'), ...ART, OTG('kettleSwing')] },
      { name: 'Max effort', stars: 4, note: 'HOLD the first swing to a full wind-up (it crumples them), the Press bounce, and Clean & Jerk off it.', steps: [HOLD('wlA'), L('wlB'), L('wlC'), GB, L('wlA'), L('wlB'), H('cleanJerk')] },
      { name: 'Chalk up', stars: 3, note: 'CHALK UP first (armour, +15%), then the set: Press and Clean & Jerk.', steps: [SPC('chalkUp', 1), L('wlA'), L('wlB'), L('wlC'), GB, L('wlA'), L('wlB'), H('cleanJerk')] },
      { name: 'Two plates', stars: 4, note: 'Kettle Drop for the bounce; the Press after it puts them down: Kettlebell Swing off the floor.', steps: [L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), AH('kettleDrop'), GB, L('wlA'), L('wlB'), L('wlC'), OTG('kettleSwing')] },
    ],
    bowler: () => [
      { name: 'Strike', stars: 3, note: 'Strike! pops them up: the Ball Drop spikes, and the whole string off the bounce.', steps: [L('bwA'), L('bwB'), L('bwC'), L('bwD'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), L('bwC'), L('bwD')] },
      { name: 'Pin drop', stars: 4, note: 'Strike! and the Ball Drop bounce, Spare Lift off it, and drop the ball on them (Pin Drop, air Heavy) to end it.', steps: [L('bwA'), L('bwB'), L('bwC'), L('bwD'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), H('spareLift'), J, A('bwAirA'), AH('pinDrop')] },
      { name: 'Rolling thunder', stars: 4, note: 'Spare Lift and the Ball Drop bounce, the whole string to Strike!, and when they land, Rolling Thunder sweeps them off the floor (OTG). Then the ball is on the floor: walk over it to pick it up.', steps: [L('bwA'), L('bwB'), H('spareLift'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), L('bwC'), L('bwD'), OTG('rollingThunder')] },
      { name: 'Perfect game', stars: 5, note: 'Strike, the Ball Drop bounce, then PERFECT GAME to end it: Approach Slide them off the floor.', steps: [L('bwA'), L('bwB'), L('bwC'), L('bwD'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), ...ART, OTG('approachSlide', 'light')] },
      { name: 'Gutter and spare', stars: 3, note: 'Strike, the Ball Drop bounce, then the Gutter Ball pause branch trips them.', steps: [L('bwA'), L('bwB'), L('bwC'), L('bwD'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), PZ('bwP')] },
      { name: 'Hook', stars: 3, note: 'Two swings and the Spinner, then a HOOK SHOT straight out of it: the ball goes out wide and hooks back into them.', steps: [L('bwA'), L('bwB'), L('bwC'), SPC('hookShot')] },
      { name: 'Spare', stars: 3, note: 'Up and down with the Ball Drop, two swings off the ground bounce, and Spare Lift to send them back up.', steps: [L('bwA'), L('bwB'), H('spareLift'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), H('spareLift')] },
    ],
    archer: () => [
      { name: 'Bow up', stars: 3, note: 'The Bow Uppercut launches: Arrow Rain spikes them, and the whole string off the bounce.', steps: [L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB'), A('arAirC'), GB, L('arA'), L('arB'), L('arC'), L('arD')] },
      { name: 'Plunging arrow', stars: 4, note: 'Bracer Upper, a Plunging Arrow (air Heavy) for the bounce, and the string into the Bow Uppercut.', steps: [L('arA'), L('arB'), H('bracerUpper'), J, A('arAirA'), AH('plungingArrow'), GB, L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB')] },
      { name: 'Power draw', wall: true, stars: 4, note: 'A Power Draw mid-string KNOCKS them into the wall; the string and the Uppercut off the rebound.', steps: [L('arA'), L('arB'), TW('powerDraw'), WB, L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB'), A('arAirC')] },
      { name: 'Bullseye', stars: 5, note: 'Up, Arrow Rain for the bounce, then BULLSEYE to end it: Slide Kick them off the floor.', steps: [L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB'), A('arAirC'), GB, L('arA'), L('arB'), ...ART, OTG('archerSlide', 'light')] },
      { name: 'Pinned', stars: 3, note: 'A Pinning Shot straight out of the string crumples them: the whole string and up.', steps: [L('arA'), L('arB'), SPC('pinningShot'), L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB')] },
      { name: 'Volley', wall: true, stars: 3, note: 'The Volley pause branch knocks them into the wall; the whole string off the rebound.', steps: [L('arA'), L('arB'), PZ('arP'), WB, L('arA'), L('arB'), L('arC'), L('arD')] },
      { name: 'Quiver', stars: 4, note: 'The second Plunging Arrow can\'t bounce them: Slide Kick them off the floor.', steps: [L('arA'), L('arB'), H('bracerUpper'), J, A('arAirA'), AH('plungingArrow'), GB, L('arA'), L('arB'), H('bracerUpper'), J, A('arAirA'), AH('plungingArrow'), OTG('archerSlide', 'light')] },
    ],
    skater: () => [
      { name: 'Kickflip', stars: 3, note: 'The Kickflip launches: the air string, the Board Drop spikes, and the string again.', steps: [L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC'), GB, L('skA'), L('skB'), L('skC')] },
      { name: 'Rail drop', stars: 4, note: 'Pad Upper, a Rail Drop (air Heavy) for the bounce, and the Kickflip into the air string.', steps: [L('skA'), L('skB'), H('padUpper'), J, A('skAirA'), AH('railDrop'), GB, L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC')] },
      { name: 'Ollie slam', wall: true, stars: 4, note: 'Kickflip and the air string, the Board Drop bounce, and an Ollie Slam into the wall off it.', steps: [L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC'), GB, L('skA'), L('skB'), TW('ollieSlam'), WB] },
      { name: 'The 900', stars: 5, note: 'Kickflip, the air string, the bounce, then THE 900 to end it: Ollie Slam them off the floor.', steps: [L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC'), GB, L('skA'), L('skB'), ...ART, OTG('ollieSlam')] },
      { name: 'Grind', wall: true, stars: 3, note: 'The Grind pause branch rides them into the wall; the Kickflip off the rebound.', steps: [L('skA'), L('skB'), PZ('skP'), WB, L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB')] },
      { name: 'Grind rush', stars: 4, note: 'Kickflip, the air string, the bounce, then a GRIND RUSH straight out of the string.', steps: [L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC'), GB, L('skA'), L('skB'), SPC('grindRush')] },
      { name: 'Double drop', stars: 4, note: 'The second Rail Drop can\'t bounce them: Ollie Slam them off the floor.', steps: [L('skA'), L('skB'), H('padUpper'), J, A('skAirA'), AH('railDrop'), GB, L('skA'), L('skB'), H('padUpper'), J, A('skAirA'), AH('railDrop'), OTG('ollieSlam')] },
    ],
  });
  Object.assign(PRO, {
    wrestler: () => [
      { name: 'Hall of Fame', wall: true, note: 'Body Slam first, the Spear into the wall off the ground bounce, a Part Toss, then MAIN EVENT and the Spear on the knockdown.', steps: [L('wrA'), L('wrB'), SPC('bodySlam'), GB, L('wrA'), L('wrB'), TW('spearTackle'), WB, L('wrA'), L('wrB'), PT, L('wrA'), L('wrB'), ...ART, OTG('spearTackle')] },
      { name: 'Suplex City', note: 'Rake the eyes, Body Slam, up and down with the Elbow Drop, Spear them off the floor, and the whole string.', steps: [L('wrA'), L('wrB'), PZ('wrP'), L('wrA'), L('wrB'), SPC('bodySlam'), GB, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), A('wrAirB'), OTG('spearTackle'), L('wrA'), L('wrB'), L('wrC'), L('wrD')] },
      { name: 'Tag team', note: 'Leg Drop, a Part Toss (it gives back the ground bounce), and a second Leg Drop off the next launch.', steps: [L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), AH('legDrop'), GB, L('wrA'), L('wrB'), PT, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), AH('legDrop'), GB, L('wrA'), L('wrB'), L('wrC'), L('wrD')] },
      { name: 'Ring entrance', note: 'Open with MAIN EVENT (a raw Art bounces them off the floor), Leg Drop them back down, Spear them up, a Part Toss and the string.', steps: [...ART, GB, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), AH('legDrop'), OTG('spearTackle'), L('wrA'), L('wrB'), PT, L('wrA'), L('wrB'), L('wrC'), L('wrD')] },
      { name: 'Royal rumble', wall: true, note: 'The Lariat into the wall, uppercut and Leg Drop off the rebound, and the whole string off the ground bounce.', steps: [L('wrA'), L('wrB'), L('wrC'), L('wrD'), WB, L('wrA'), L('wrB'), H('euroUpper'), J, A('wrAirA'), AH('legDrop'), GB, L('wrA'), L('wrB'), L('wrC'), L('wrD')] },
    ],
    baseball: () => [
      { name: 'World Series', wall: true, note: 'Bunt, the Chopper bounce, a Fastball into the wall, a Part Toss, then GRAND SLAM and a Base Slide on the knockdown.', steps: [L('bbA'), L('bbB'), PZ('bbP'), J, A('bbAirA'), A('bbAirB'), GB, L('bbA'), L('bbB'), TW('fastball'), WB, L('bbA'), L('bbB'), PT, L('bbA'), L('bbB'), ...ART, OTG('baseSlide', 'light')] },
      { name: 'Extra innings', note: 'Sinker for the bounce, a Part Toss to extend it, and the whole string to the Home Run Swing.', steps: [L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), AH('sinker'), GB, L('bbA'), L('bbB'), PT, L('bbA'), L('bbB'), L('bbC'), L('bbD')] },
      { name: 'Curve and clutch', wall: true, note: 'A Curveball (dizzy), the string, a full wind-up Home Run Swing into the wall, and up off the rebound.', steps: [L('bbA'), L('bbB'), SPC('curveball'), L('bbA'), L('bbB'), L('bbC'), HOLD('bbD'), WB, L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), A('bbAirB')] },
      { name: 'Batting practice', wall: true, note: 'Open with GRAND SLAM (a raw Art bounces them off the wall), Sinker, a Part Toss and the string.', steps: [...ART, WB, L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), AH('sinker'), GB, L('bbA'), L('bbB'), PT, L('bbA'), L('bbB'), L('bbC'), L('bbD')] },
      { name: 'Squeeze play', note: 'Sinker for the bounce, up again and the Chopper to put them down, a Base Slide off the floor, a Part Toss and the string.', steps: [L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), AH('sinker'), GB, L('bbA'), L('bbB'), H('gloveUpper'), J, A('bbAirA'), A('bbAirB'), OTG('baseSlide', 'light'), L('bbA'), L('bbB'), PT, L('bbA'), L('bbB'), L('bbC'), L('bbD')] },
    ],
    football: () => [
      { name: 'Hail Mary', wall: true, note: 'A Bullet Pass into the wall, the Pancake off the rebound, a Part Toss, and TOUCHDOWN DRIVE to end it.', steps: [L('fbA'), L('fbB'), TW('bulletPass'), WB, L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB'), PT, L('fbA'), L('fbB'), ...ART] },
      { name: 'Two-minute drill', note: 'Spike!, a Part Toss (a fresh ground bounce), the Pancake off it, and up again.', steps: [L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), AH('ballSpike'), GB, L('fbA'), L('fbB'), PT, L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), A('fbAirB')] },
      { name: 'Blitz package', wall: true, note: 'Facemask, a BLITZ into the wall, the Pancake off the rebound, and Lift Block.', steps: [L('fbA'), L('fbB'), PZ('fbP'), L('fbA'), L('fbB'), SPC('blitz'), WB, L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB'), H('liftBlock')] },
      { name: 'Kick-off', note: 'Facemask (crumple), the string into the Pancake, a Part Toss off the bounce, Lift Block and the Dogpile.', steps: [L('fbA'), L('fbB'), PZ('fbP'), L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB'), PT, L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), A('fbAirB')] },
      { name: 'Goal-line stand', note: 'Pancake, up, the Dogpile puts them down, Shoulder Charge them up, a Part Toss, and a second Pancake bounce.', steps: [L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB'), H('liftBlock'), J, A('fbAirA'), A('fbAirB'), OTG('shoulderCharge', 'light'), L('fbA'), L('fbB'), PT, L('fbA'), L('fbB'), L('fbC'), L('fbD'), GB, L('fbA'), L('fbB')] },
    ],
    soccer: () => [
      { name: 'World Cup', wall: true, note: 'A Power Shot into the wall, the Bicycle and the air string off the rebound, a Part Toss, then GOLDEN GOAL and a Slide Tackle on the knockdown.', steps: [L('scA'), L('scB'), TW('powerShot'), WB, L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB'), A('scAirC'), GB, L('scA'), L('scB'), PT, L('scA'), L('scB'), ...ART, OTG('slideTackle', 'light')] },
      { name: 'Extra time', note: 'Diving Header, a Part Toss (a fresh ground bounce), the Bicycle and the whole air string.', steps: [L('scA'), L('scB'), H('headerFlick'), J, A('scAirA'), AH('divingHeader'), GB, L('scA'), L('scB'), PT, L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB'), A('scAirC')] },
      { name: 'Set piece', note: 'A Free Kick (crumple), the string and the Bicycle, a Diving Header for the bounce, and the Slide Tackle off it.', steps: [L('scA'), L('scB'), SPC('freeKick'), L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), AH('divingHeader'), GB, L('scA'), L('scB'), PZ('scP')] },
      { name: 'Kick-off', wall: true, note: 'Open with GOLDEN GOAL (a raw Art bounces them off the wall), the Bicycle, a Diving Header, a Part Toss and the string.', steps: [...ART, WB, L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), AH('divingHeader'), GB, L('scA'), L('scB'), PT, L('scA'), L('scB'), L('scC')] },
      { name: 'Penalty shootout', note: 'Diving Header, the Bicycle and the whole air string to put them down, a Slide Tackle off the floor, a Part Toss and two kicks.', steps: [L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), AH('divingHeader'), GB, L('scA'), L('scB'), L('scC'), L('scD'), J, A('scAirA'), A('scAirB'), A('scAirC'), OTG('slideTackle', 'light'), L('scA'), L('scB'), PT, L('scA'), L('scB')] },
    ],
    boxer: () => [
      { name: 'Title fight', wall: true, note: 'A Power Hook into the wall, the Body Blows and the Uppercut off the rebound, the Overhand bounce, a Part Toss, then FINAL ROUND and a Power Hook on the knockdown.', steps: [L('bxA'), L('bxB'), TW('powerHook'), WB, L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB'), A('bxAirC'), GB, L('bxA'), L('bxB'), PT, L('bxA'), L('bxB'), ...ART, OTG('powerHook')] },
      { name: 'Twelve rounds', note: 'Hammer Fist, a Part Toss (a fresh ground bounce), Rising Uppercut and the air string, and the Body Blows off the bounce.', steps: [L('bxA'), L('bxB'), H('risingUpper'), J, A('bxAirA'), AH('hammerFist'), GB, L('bxA'), L('bxB'), PT, L('bxA'), L('bxB'), H('risingUpper'), J, A('bxAirA'), A('bxAirB'), A('bxAirC'), GB, L('bxA'), L('bxB'), MASH('bxC')] },
      { name: 'Haymaker hook', wall: true, note: 'Haymaker (crumple), a Power Hook into the wall, and off the rebound the Body Blows, the Uppercut and the air string.', steps: [L('bxA'), L('bxB'), PZ('bxP'), L('bxA'), L('bxB'), TW('powerHook'), WB, L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB'), A('bxAirC')] },
      { name: 'Bell to bell', wall: true, note: 'Open with FINAL ROUND (a raw Art bounces them off the wall), the Uppercut, a Hammer Fist, a Part Toss and the Body Blows.', steps: [...ART, WB, L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), AH('hammerFist'), GB, L('bxA'), L('bxB'), PT, L('bxA'), L('bxB'), MASH('bxC')] },
      { name: 'Counterpuncher', note: 'BOB & WEAVE, Hammer Fist, the Uppercut and the air string to put them down, a Power Hook off the floor, and the Body Blows.', steps: [SPC('bobWeave', 1), L('bxA'), L('bxB'), H('risingUpper'), J, A('bxAirA'), AH('hammerFist'), GB, L('bxA'), L('bxB'), MASH('bxC'), L('bxD'), J, A('bxAirA'), A('bxAirB'), A('bxAirC'), OTG('powerHook'), L('bxA'), L('bxB'), MASH('bxC'), L('bxD')] },
    ],
    fencer: () => [
      { name: 'Olympic final', wall: true, note: 'Prise de Fer, the Plunging Point bounce, a Balestra into the wall, a Part Toss, then TOUCHÉ and the Balestra on the knockdown.', steps: [L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), A('feAirB'), GB, L('feA'), L('feB'), TW('balestra'), WB, L('feA'), L('feB'), PT, L('feA'), L('feB'), ...ART, OTG('balestra')] },
      { name: 'Grand salute', note: 'Point Drop for the bounce, a Part Toss to extend it, and three thrusts into the Flurry of Points.', steps: [L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), AH('pointDrop'), GB, L('feA'), L('feB'), PT, L('feA'), L('feB'), L('feC')] },
      { name: 'Flèche and coupé', wall: true, note: 'Up, a Point Drop bounce, the Coupé into the wall off it, and the Flèche off the rebound.', steps: [L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), AH('pointDrop'), GB, L('feA'), L('feB'), L('feC'), L('feD'), WB, L('feA'), L('feB'), PZ('feP')] },
      { name: 'En garde', wall: true, note: 'Open with TOUCHÉ (a raw Art bounces them off the wall), Prise de Fer, a Point Drop, a Part Toss and the string.', steps: [...ART, WB, L('feA'), L('feB'), H('priseDeFer'), J, A('feAirA'), AH('pointDrop'), GB, L('feA'), L('feB'), PT, L('feA'), L('feB'), L('feC'), L('feD')] },
      { name: 'Hundred touches', note: 'Three thrusts and up, twice; the second Point Drop puts them down, and the Balestra takes them off the floor.', steps: [L('feA'), L('feB'), L('feC'), H('priseDeFer'), J, A('feAirA'), A('feAirB'), GB, L('feA'), L('feB'), L('feC'), H('priseDeFer'), J, A('feAirA'), AH('pointDrop'), OTG('balestra')] },
    ],
    weightlifter: () => [
      { name: 'Olympic platform', wall: true, note: 'The Press bounce, a Kettlebell Swing into the wall, a Part Toss, then WORLD RECORD and the Kettlebell on the knockdown.', steps: [L('wlA'), L('wlB'), L('wlC'), GB, L('wlA'), L('wlB'), TW('kettleSwing'), WB, L('wlA'), L('wlB'), PT, L('wlA'), L('wlB'), ...ART, OTG('kettleSwing')] },
      { name: 'Personal best', note: 'Kettle Drop, a Part Toss (a fresh ground bounce), the Press, and Clean & Jerk right on the bounce into the air string.', steps: [L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), AH('kettleDrop'), GB, L('wlA'), L('wlB'), PT, L('wlA'), L('wlB'), L('wlC'), GB, H('cleanJerk'), J, A('wlAirA'), A('wlAirB')] },
      { name: 'Chalk and plates', note: 'CHALK UP, the Press bounce, up and down, the Kettlebell off the floor, and the Press again.', steps: [SPC('chalkUp', 1), L('wlA'), L('wlB'), L('wlC'), GB, L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), A('wlAirB'), OTG('kettleSwing'), L('wlA'), L('wlB'), L('wlC')] },
      { name: 'Clean sweep', note: 'Open with WORLD RECORD (a raw Art bounces them off the floor), a Kettle Drop puts them down, the Kettlebell picks them up, a Part Toss and the Press.', steps: [...ART, GB, L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), AH('kettleDrop'), OTG('kettleSwing'), L('wlA'), L('wlB'), PT, L('wlA'), L('wlB'), L('wlC')] },
      { name: 'Deadlift', wall: true, note: 'Kettlebell into the wall, the Press bounce off the rebound, up and down, the Kettlebell off the floor, a Part Toss and the Press.', steps: [L('wlA'), L('wlB'), TW('kettleSwing'), WB, L('wlA'), L('wlB'), L('wlC'), GB, L('wlA'), L('wlB'), H('cleanJerk'), J, A('wlAirA'), A('wlAirB'), OTG('kettleSwing'), L('wlA'), L('wlB'), PT, L('wlA'), L('wlB'), L('wlC')] },
    ],
    bowler: () => [
      { name: 'Three hundred', note: 'Strike!, the Ball Drop bounce, a Part Toss, then PERFECT GAME and an Approach Slide on the knockdown.', steps: [L('bwA'), L('bwB'), L('bwC'), L('bwD'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), PT, L('bwA'), L('bwB'), ...ART, OTG('approachSlide', 'light')] },
      { name: 'League night', note: 'Spare Lift and the Ball Drop bounce, a Part Toss to extend it, Spare Lift again and a Pin Drop to put them down.', steps: [L('bwA'), L('bwB'), H('spareLift'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), PT, L('bwA'), L('bwB'), H('spareLift'), J, A('bwAirA'), AH('pinDrop')] },
      { name: 'Ten frames', note: 'Strike! and up, the Ball Drop bounce, a Part Toss, Spare Lift, and a Pin Drop to end it.', steps: [L('bwA'), L('bwB'), L('bwC'), L('bwD'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), PT, L('bwA'), L('bwB'), H('spareLift'), J, A('bwAirA'), AH('pinDrop')] },
      { name: 'Turkey', wall: true, note: 'Open with PERFECT GAME (a raw Art bounces them off the wall), Strike! and the Ball Drop bounce, a Part Toss, up again and a Pin Drop.', steps: [...ART, WB, L('bwA'), L('bwB'), L('bwC'), L('bwD'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), PT, L('bwA'), L('bwB'), H('spareLift'), J, A('bwAirA'), AH('pinDrop')] },
      { name: 'Seven-ten split', note: 'Strike and up, the Ball Drop bounce, Spare Lift off it, and one more swing in the air.', steps: [L('bwA'), L('bwB'), L('bwC'), L('bwD'), J, A('bwAirA'), A('bwAirB'), GB, L('bwA'), L('bwB'), H('spareLift'), J, A('bwAirA')] },
    ],
    archer: () => [
      { name: 'Olympic gold', wall: true, note: 'Up, Arrow Rain for the bounce, a Power Draw into the wall, a Part Toss, then BULLSEYE and a Slide Kick on the knockdown.', steps: [L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB'), A('arAirC'), GB, L('arA'), L('arB'), TW('powerDraw'), WB, L('arA'), L('arB'), PT, L('arA'), L('arB'), ...ART, OTG('archerSlide', 'light')] },
      { name: 'Full quiver', note: 'Plunging Arrow, a Part Toss (a fresh ground bounce), the string and the Arrow Rain, and the string again.', steps: [L('arA'), L('arB'), H('bracerUpper'), J, A('arAirA'), AH('plungingArrow'), GB, L('arA'), L('arB'), PT, L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB'), A('arAirC'), GB, L('arA'), L('arB'), L('arC')] },
      { name: 'Pin and volley', wall: true, note: 'The Volley into the wall, the string and the Bow Uppercut off the rebound, Arrow Rain for the bounce, and the string again.', steps: [L('arA'), L('arB'), PZ('arP'), WB, L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB'), A('arAirC'), GB, L('arA'), L('arB'), L('arC')] },
      { name: 'Eagle eye', wall: true, note: 'Open with BULLSEYE (a raw Art bounces them off the wall), the string and up, a Plunging Arrow, a Part Toss and the string.', steps: [...ART, WB, L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), AH('plungingArrow'), GB, L('arA'), L('arB'), PT, L('arA'), L('arB'), L('arC'), L('arD')] },
      { name: 'Robin Hood', note: 'Plunging Arrow, the string and the Arrow Rain to put them down, a Slide Kick off the floor, a Part Toss and two strikes.', steps: [L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), AH('plungingArrow'), GB, L('arA'), L('arB'), L('arC'), L('arD'), J, A('arAirA'), A('arAirB'), A('arAirC'), OTG('archerSlide', 'light'), L('arA'), L('arB'), PT, L('arA'), L('arB')] },
    ],
    skater: () => [
      { name: 'X Games', wall: true, note: 'Kickflip and up, the Board Drop bounce, an Ollie Slam into the wall, a Part Toss, then THE 900 and an Ollie Slam on the knockdown.', steps: [L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC'), GB, L('skA'), L('skB'), TW('ollieSlam'), WB, L('skA'), L('skB'), PT, L('skA'), L('skB'), ...ART, OTG('ollieSlam')] },
      { name: 'Session', note: 'Rail Drop, a Part Toss (a fresh ground bounce), the Kickflip and the air string, and the string again.', steps: [L('skA'), L('skB'), H('padUpper'), J, A('skAirA'), AH('railDrop'), GB, L('skA'), L('skB'), PT, L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC'), GB, L('skA'), L('skB'), L('skC')] },
      { name: 'Line', note: 'Kickflip, Rail Drop, Kickflip again and the air string to put them down, an Ollie Slam off the floor, a Part Toss and the string.', steps: [L('skA'), L('skB'), L('skC'), J, A('skAirA'), AH('railDrop'), GB, L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC'), OTG('ollieSlam'), L('skA'), L('skB'), PT, L('skA'), L('skB'), L('skC')] },
      { name: 'Drop in', note: 'Open with THE 900 (a raw Art bounces them off the floor), a Rail Drop puts them down, the Ollie Slam picks them up, a Part Toss and the Kickflip.', steps: [...ART, GB, L('skA'), L('skB'), H('padUpper'), J, A('skAirA'), AH('railDrop'), OTG('ollieSlam'), L('skA'), L('skB'), PT, L('skA'), L('skB'), L('skC')] },
      { name: 'Grind the shelf', wall: true, note: 'The Grind into the wall, the Kickflip off the rebound, the Board Drop bounce, and a GRIND RUSH.', steps: [L('skA'), L('skB'), PZ('skP'), WB, L('skA'), L('skB'), L('skC'), J, A('skAirA'), A('skAirB'), A('skAirC'), GB, L('skA'), L('skB'), SPC('grindRush')] },
    ],
  });
  /* ---- the newer lines (EDO JAPAN, KNIGHTS OF THE REALM, BASKETBALL): their routes come from one set of
     patterns over each kit (its string, pause branch, launcher, air string, spike, KNOCK, Special, dash attack and
     Legend Art), named for the line; ROUTE_FIX[line] swaps a step where a kit needs it. Each was proven at 60 Hz,
     144 Hz and uneven frames like the rest. */
  const NAMES = {
    basketball: ['Fast break', 'Putback', 'From downtown', 'Posterized', 'Ankle breaker', 'Euro step', 'Double double', 'Buzzer beater', 'Triple double', 'And one', 'Showtime', 'Full-court press'],
    ronin: ['Draw and cut', 'Falling cut', 'Scabbard', 'Last draw', 'The straw hat', 'Courage', 'Two leaves', 'Wandering blade', 'Road to nowhere', 'Moon and blade', 'Masterless', 'Rain on the road'],
    kunoichi: ['Gale fan', 'Iris drop', 'Kanzashi', 'Thousand petals', 'Needle kiss', 'Kawarimi', 'Two irises', 'Hidden iris', 'Venom', 'Fan dance', 'Smoke and petals', 'Night mission'],
    shogun: ['Verdict', 'Iron fan', 'Gunbai', 'Three ranks', 'Rebuke', 'Teppō', 'Decree', 'Shogunate', 'Iron rule', 'Siege', 'Unification', 'The long campaign'],
    daimyo: ['Rising crescent', 'Falling moon', 'Long thrust', 'Hundred banners', 'Shin reap', 'Tribute', 'Two moons', 'Castle lord', 'My domain', 'Hundred sieges', 'Banners raised', 'The levy'],
    templar: ['Zornhau', 'Cross drop', 'Wrath', 'Beauséant', 'Mordhau', 'The vow', 'Penance', 'Non nobis', 'The order', 'Pilgrimage', 'Murder-stroke', 'Vigil'],
    crusader: ['Morning star', 'Falling star', 'Heater charge', 'Siege of faith', 'Shield hook', 'Deus vult', 'Two stars', 'The long road', 'Over the shield', 'Faith and iron', 'Siege engine', 'Onward'],
    lancer: ['Unhorse', 'Lance fall', 'Couched lance', 'The joust', 'Trample', 'The tilt', 'Two falls', 'Tournament', 'Grand melee', 'The lists', 'Champion', 'Victory lap'],
    captain: ['Broadside', 'Boarding drop', 'Spyglass', 'Walk the plank', 'Spotted', 'All hands', 'Two bells', 'Admiralty', 'Ship of the line', 'Crow\u2019s nest', 'Quarterdeck', 'Make sail'],
    cannoneer: ['Touch-hole', 'Mortar', 'Grapeshot', 'Full battery', 'Powder flash', 'Chain shot', 'Two salutes', 'Gun deck', 'Fire in the hole', 'Run out the guns', 'Salvo', 'Twenty-one guns'],
    blackbeard: ['The boot', 'Cutlass drop', 'Six pistols', 'Queen Anne', 'Close shot', 'Smoke and fuses', 'Two shots', 'Terror of the seas', 'Black flag', 'Lit fuses', 'No quarter', 'Ocracoke'],
    redbeard: ['Corsair\u2019s rise', 'Falling crescent', 'Kalkan', 'Corsair fleet', 'Kalkan rim', 'Naphtha', 'Two crescents', 'Admiral', 'Galley', 'Barbarossa', 'Against the wall', 'The fleet'],
    sailor: ['Uppercut', 'Deck drop', 'Haymaker', 'Sea shanty', 'Spit in the eye', 'Hornpipe', 'Shore leave', 'Bar brawl', 'All hands on deck', 'Heave ho', 'The ship\u2019s anchor', 'Port of call'],
    marauder: ['Cleave', 'Axe drop', 'Grapnel', 'Boarding party', 'Hatchet', 'Boarding rush', 'Two axes', 'Plunder', 'Take it all', 'Over the side', 'Reaver', 'X marks the spot'],
    musketeer: ['Musket lift', 'Plunging bayonet', 'Musket shot', 'Fix bayonets', 'Bayonet charge', 'Aimed shot', 'Two thrusts', 'By rank', 'Make ready', 'Present', 'Hold the line', 'Fire!'],
    ghost: ['Drowning rise', 'Undertow', 'Ghostfire', 'Davy Jones', 'Wail', 'Phase', 'Two tides', 'Cold hands', 'The deep', 'Lantern light', 'The locker', 'Undying'],
  };
  const ROUTE_FIX = {};
  /* ELEMENT BENDERS: their route names, and each one's pause branch as the signature trial */
  Object.assign(NAMES, {
    air: ['Touch the sky', 'Downburst', 'Air blast', 'Eye of the storm', 'Lion rolls the ball', 'Gale step', 'Walking the circle', 'Mother palms', 'Jet stream', 'Nine winds', 'Cyclone', 'Weightless'],
    water: ['White crane', 'Waterfall', 'Water jet', 'Tidal wave', 'Needle at sea bottom', 'Healing water', 'Push hands', 'Riptide', 'Cloud hands', 'Cold snap', 'Grasp the sparrow\u2019s tail', 'Still water'],
    earth: ['Lifting bridge', 'Meteor', 'Boulder', 'Tectonic', 'Tiger claw', 'Quake', 'Horse stance', 'Tiger and crane', 'Bedrock', 'Avalanche', 'The mountain', 'Unmoved'],
    flame: ['Whirlwind', 'Falling sun', 'Fireball', 'Inferno', 'Plum blossom', 'Fire ring', 'Open the gate', 'Linked chain', 'Wildfire', 'Inner fire', 'Ten roads', 'Phoenix step'],
    blood: ['Seal the vessel', 'Drag down', 'Puppet throw', 'Strings', 'Small catch', 'Blood pull', 'Heartbeat', 'Full moon', 'Seize and hold', 'Crimson', 'No escape', 'Bow'],
    lava: ['Pow choy', 'Meteor', 'Molten fist', 'Volcano', 'Kup choy', 'Magma spit', 'Five shouts', 'Lava flow', 'Caldera', 'Obsidian', 'Magma core', 'Molten'],
    storm: ['Green dragon', 'Strike down', 'Lightning bolt', 'Thunderhead', 'Splitting palm', 'Thunderstrike', 'Chop and hang', 'Forked', 'Chain lightning', 'Overcharge', 'The storm', 'Flash'],
    blast: ['Shoulder lean', 'Crater', 'Spark shot', 'Chain reaction', 'Embrace and split', 'Sticky charge', 'Six openings', 'Powder keg', 'Demolition', 'Charging step', 'Big bang', 'Aftershock'],
    metal: ['Matching bridge', 'Anvil', 'Iron fist', 'Foundry', 'Controlling bridge', 'Shrapnel', 'Twelve bridges', 'Tempered', 'Heavy metal', 'Iron wire', 'The forge', 'Ironhand'],
    spirit: ['Flying crane', 'Descent', 'Spirit lance', 'Spirit world', 'Shaking crane', 'Spirit pulse', 'Lantern', 'Wisps', 'Sanchin', 'Two worlds', 'Lost ones', 'Serene'],
    swamp: ['Pound the mortar', 'Mire', 'Thornwhip', 'Swallowing bog', 'Six sealing', 'Sinking mud', 'Silk reeling', 'Quagmire', 'Cannon fist', 'Bog-born', 'The deep mire', 'Overgrown'],
  });
  const BENDER_SIG = { air: ['xaP', 'Lion rolls the ball', 'Pause after the Single Palm Change: Lion Rolls the Ball sucks them in and folds them up. Then the whole string.'],
    water: ['xwP', 'Needle at sea bottom', 'Pause after Wild Horse Parts Mane: Needle at Sea Bottom folds them up and freezes their feet. Then the whole string.'],
    earth: ['xeP', 'Tiger claw', 'Pause after the Pressing Bridge: the Tiger Claw crumples them. Then the whole string.'],
    flame: ['xfP', 'Plum blossom', 'Pause after Pierce the Heart: Plum Blossom leaves them DIZZY. Then the whole string.'],
    blood: ['xbP', 'Small catch', 'Pause after Misplacing the Bone: Small Catch and Hit seizes them from 2 m and they fold. Then the whole string.'],
    lava: ['xlP', 'Kup choy', 'Pause after the Sow Choy: the Kup Choy hammers down and crumples them. Then the whole string.'],
    storm: ['xzP', 'Splitting palm', 'Pause after the Hanging Palm: the Single Splitting Palm folds them up. Then the whole string.'],
    blast: ['xxP', 'Embrace and split', 'Pause after the Top Elbow: Embrace and Split leaves them DIZZY. Then the whole string.'],
    metal: ['xmP', 'Controlling bridge', 'Pause after the Separating Bridge: the Controlling Bridge hauls them in from 2.2 m and they fold. Then the whole string.'],
    spirit: ['xsP', 'Shaking crane', 'Pause after the Crane Wing: the Shaking Crane leaves them DIZZY. Then the whole string.'],
    swamp: ['xqP', 'Six sealing', 'Pause after Draping Fist Over Body: Six Sealing Four Closing leaves them DIZZY. Then the whole string.'] };
  for (const [line, [pz, name, note]] of Object.entries(BENDER_SIG)) SIG[line] = (S, g) => ({ name, note, steps: [L(g[0]), L(g[1]), PZ(pz), ...g.map(L)] });
  // the heavier ones jump low: no second launch after the bounce, a Part Toss and the string instead
  const benderLow = (adv, pro, k) => { const M = id => KB.MOVES[id].name; adv[6].steps = [...k.spike, ...k.two, PT, ...k.str]; adv[6].note = M(k.S.airHeavy) + ' for the bounce, a Part Toss (a fresh bounce), and the whole string.'; };
  // a thrown Heavy off the wall: two hits off the rebound, a Part Toss and the string (they're too low to launch again)
  const benderShot = (adv, pro, k) => { const M = id => KB.MOVES[id].name; pro[2].steps = [...k.two, TW(k.S.heavy), WB, ...k.two, PT, ...k.str]; pro[2].note = M(k.S.heavy) + ' into the wall, two off the rebound, a Part Toss, and the whole string.'; };
  // their Heavy into the wall: two off the rebound and the launcher (the whole string drifts out of reach at high frame rates)
  const benderWall = (adv, pro, k) => { const M = id => KB.MOVES[id].name; adv[2].steps = [...k.two, TW(k.S.heavy), WB, ...k.two, H(k.S.launch)]; adv[2].note = M(k.S.heavy) + ' mid-string KNOCKS them into the wall; two hits off the rebound and ' + M(k.S.launch) + '.'; };
  const both = (...fx) => (adv, pro, k) => fx.forEach(f => f(adv, pro, k));
  ROUTE_FIX.earth = benderLow; ROUTE_FIX.metal = benderLow; ROUTE_FIX.lava = benderLow; ROUTE_FIX.swamp = both(benderLow, benderWall);
  ROUTE_FIX.blast = both(benderLow, benderShot); ROUTE_FIX.water = benderShot; ROUTE_FIX.flame = both(benderShot, benderWall);
  ROUTE_FIX.blood = (adv, pro, k) => { adv[2].steps = [...k.two, TW(k.S.heavy), WB, ...k.two, SPC(k.S.special)]; adv[2].note = 'Puppet Throw mid-string KNOCKS them into the wall; two off the rebound, and BLOOD PULL drags them back in.'; };
  // the KUNOICHI's hairpins KNOCK from so close that she overruns the rebound: her routes stay off the wall
  ROUTE_FIX.kunoichi = (adv, pro, k) => {
    adv[2] = { name: 'Kanzashi', stars: 4, note: 'Needle Kiss poisons them; the string while it burns (+20% to the POISONED), the Rising Fan, and up after them.', steps: [...k.two, PZ('kuP'), ...k.two, H('risingFan'), J, ...k.air] };
    pro[0] = { name: 'Hidden iris', note: 'Needle Kiss, the whole string and up, the Iris Drop for the bounce, a Part Toss, then THOUSAND PETALS and a Silk Slide on the knockdown.', steps: [...k.two, PZ('kuP'), ...k.str, J, ...k.air, GB, ...k.two, PT, ...k.two, ...ART, k.otg] };
    pro[3].steps = [...ART, WB, ...k.two, PT, ...k.str.slice(0, 3)]; pro[3].note = 'Open with THOUSAND PETALS (a raw Art bounces them off the wall), two hits off the rebound, a Part Toss, and the string to the Petal Flurry.';
    pro[2] = { name: 'Fan dance', note: 'Needle Rain for the bounce, a Part Toss, the Rising Fan, and the Fan and the Fan Spin in the air.', steps: [...k.spike, ...k.two, PT, ...k.two, H('risingFan'), J, A('kuAirA'), A('kuAirB')] };
  };
  // the SHOGUN is heavy and jumps low: one air hit and the air Heavy after a launch, his strings on the ground
  ROUTE_FIX.shogun = (adv, pro, k) => {
    const upAH = [...k.up, A('shAirA'), AH('gunbaiDrop')];
    adv[1].steps = [...k.spike, ...k.str]; adv[1].note = 'Iron Fan Drop (air Heavy) for the ground bounce, then the whole string: the Verdict sends them away.';
    adv[2].steps = [...k.two, TW('gunbaiBash'), WB, ...k.str]; adv[2].note = 'Gunbai Bash mid-string KNOCKS them into the wall; the whole string off the rebound, and the Verdict sends them back.';
    adv[6].steps = [...k.two, PZ('shP'), ...upAH, GB, ...k.two, L('shC')]; adv[6].note = 'The Rebuke crumples them, up and the Iron Fan Drop for the bounce, and the Verdict to finish.';
    pro[2].steps = [...k.spike, ...k.two, TW('gunbaiBash'), WB, ...k.str]; pro[2].note = 'The bounce, Gunbai Bash into the wall off it, and the whole string off the rebound.';
    pro[3] = { name: 'Unification', note: 'The Rebuke crumples them, two cuts, a Part Toss, two more, and THREE RANKS: a Cavalry Charge on the knockdown.', steps: [...k.two, PZ('shP'), ...k.two, PT, ...k.two, ...ART, k.otg] };
    pro[4] = { name: 'The long campaign', note: 'The Rebuke, up and the Iron Fan Drop for the bounce, a Part Toss, two cuts, then THREE RANKS and the Cavalry Charge.', steps: [...k.two, PZ('shP'), ...upAH, GB, ...k.two, PT, ...k.two, ...ART, k.otg] };
  };
  ROUTE_FIX.daimyo = (adv, pro, k) => {
    adv[2].steps = [...k.two, TW('longThrust'), WB, ...k.str]; adv[2].note = 'The Long Thrust mid-string KNOCKS them into the wall; the whole string off the rebound, up to the Rising Crescent.';
  };
  // the TEMPLAR is heavy too: strings off the rebound, and the second launch ends with the air Heavy
  ROUTE_FIX.templar = (adv, pro, k) => {
    const upAH = [...k.up, A('teAirA'), AH('crossguardDrop')];
    adv[1].steps = [...k.spike, ...k.str]; adv[1].note = 'Crossguard Drop (air Heavy) for the ground bounce, then the whole string: the Zornhau sends them away.';
    adv[2].steps = [...k.two, TW('wrathCut'), WB, ...k.str]; adv[2].note = 'Wrath of the Temple mid-string KNOCKS them into the wall; the whole string off the rebound, and the Zornhau sends them back.';
    pro[3].steps = [...ART, GB, ...k.two, PT, ...k.str]; pro[3].note = 'Open with BEAUSÉANT (a raw Art slams them off the floor), two cuts off the bounce, a Part Toss, and the whole string.';
    pro[4] = { name: 'Vigil', note: 'The Mordhau crumples them, up and the Crossguard Drop for the bounce, a Part Toss, two cuts, then BEAUSÉANT and the Pilgrim\u2019s Lunge on the knockdown.', steps: [...k.two, PZ('teP'), ...upAH, GB, ...k.two, PT, ...k.two, ...ART, k.otg] };
  };
  // the CRUSADER and the LANCER are heavy as well (a low jump): no second launch, strings off the rebound
  const groundFix = extra => (adv, pro, k) => {
    const M = id => KB.MOVES[id].name;
    adv[1].steps = [...k.spike, ...k.str]; adv[1].note = M(k.S.airHeavy) + ' (air Heavy) for the ground bounce, then the whole string.';
    adv[2].steps = [...k.two, TW(k.S.heavy), WB, ...k.str]; adv[2].note = M(k.S.heavy) + ' mid-string KNOCKS them into the wall, and the whole string off the rebound.';
    pro[2].steps = [...k.spike, ...k.two, TW(k.S.heavy), WB, ...k.str]; pro[2].note = 'The bounce, ' + M(k.S.heavy) + ' into the wall off it, and the whole string off the rebound.';
    pro[4].steps = [...k.spike, ...k.two, PT, ...k.two, ...ART, k.otg]; pro[4].note = M(k.S.airHeavy) + ' for the bounce, a Part Toss, two more, then ' + M(k.S.super).toUpperCase() + ' and ' + M(k.S.dashAtk) + ' on the knockdown.';
    extra(adv, pro, k);
  };
  ROUTE_FIX.crusader = groundFix((adv, pro, k) => {
    adv[6].steps = [...k.two, PZ('crP'), J, A('crAirA'), AH('heaterFall'), GB, ...k.str]; adv[6].note = 'The Shield Hook pops them up, the Shield Fall for the bounce, and the string: the Morning Star can\u2019t bounce them twice.';
  });
  ROUTE_FIX.lancer = groundFix((adv, pro, k) => {
    adv[6].steps = [...k.spike, ...k.two, PT, ...k.str]; adv[6].note = 'The Lance Drop for the bounce, a Part Toss (a fresh bounce), and the whole string up to the Unhorse.';
  });
  // the MARAUDER's Heavy hauls them IN: his wall routes ride the Cleave at the end of his string
  ROUTE_FIX.marauder = (adv, pro, k) => {
    adv[2].steps = [...k.str, WB, ...k.two, H('hookUpper'), J, A('maAirA')]; adv[2].note = 'The whole string: the Cleave KNOCKS them into the wall. Two hacks off the rebound, the Hook Upper and up after them.';
    pro[0].steps = [...k.str, WB, ...k.two, PT, ...k.two, ...ART, k.otg]; pro[0].note = 'The Cleave into the wall, two off the rebound, a Part Toss, then BOARDING PARTY and a Boarding Kick on the knockdown.';
    pro[2].steps = [...k.spike, ...k.str, WB]; pro[2].note = 'The Hook Drop for the bounce, and the whole string off it: the Cleave sends them into the wall.';
  };
  ROUTE_FIX.ghost = (adv, pro, k) => {
    adv[2].steps = [...k.two, TW('ghostfire'), WB, ...k.two, H('lanternUpper')]; adv[2].note = 'Ghostfire mid-string KNOCKS them into the wall (and burns cold); two cuts off the rebound and the Lantern Upper.';
  };
  ROUTE_FIX.captain = (adv, pro, k) => {
    adv[2].steps = [...k.two, TW('spyglassSmash'), WB, ...k.two, H('spyglassUpper')]; adv[2].note = 'Spyglass Smash mid-string KNOCKS them into the wall; two cuts off the rebound and the Spyglass Upper.';
  };
  ROUTE_FIX.redbeard = (adv, pro, k) => {
    adv[5].steps = [...k.two, SPC('naphthaPot'), k.otg]; adv[5].note = 'Two cuts, the NAPHTHA POT straight out of them (it throws them, BURNING), and Corsair Rush off the floor when they land (Dodge, then Light).';
  };
  ROUTE_FIX.musketeer = (adv, pro, k) => {
    pro[2].steps = [...k.two, TW('musketShot'), WB, ...k.two, PT, ...k.str]; pro[2].note = 'The Musket Shot into the wall, two off the rebound, a Part Toss, and the whole string up to the Musket Lift.';
  };
  ROUTE_FIX.ronin = (adv, pro, k) => {
    adv[2].steps = [...k.two, TW('sayaAte'), WB, ...k.two, H('sayaUpper'), J, A('roAirA')]; adv[2].note = 'Saya-ate mid-string KNOCKS them into the wall; two cuts off the rebound, the Saya Upper, and the Air Draw.';
  };
  function genRoutes(line) {
    const S = S0(line), g = chain(S.light), a = chain(S.air), N = NAMES[line], MV = id => KB.MOVES[id], nm = id => MV(id).name;
    const P = MV(g[1]).nx && MV(g[1]).nx.p, Pm = P && MV(P), fin = MV(g[g.length - 1]), sp = MV(S.special), slam = Arts.ART[MV(S.super).seq] && Arts.ART[MV(S.super).seq].slam;
    const str = g.map(L), two = [L(g[0]), L(g[1])], air = a.map(A), up = [...two, H(S.launch), J], spike = [...up, A(a[0]), AH(S.airHeavy), GB];
    const otg = OTG(S.dashAtk, 'light'), upFin = fin.launcher ? [J, ...air] : [];
    const buff = ['buff', 'trap', 'act'].includes(sp.type);   // (a Special that doesn't hit: first, then the combo)
    // the pause branch: a crumple or a stagger leads into the string; a launcher into the air string; anything else ends it
    const pz = Pm.crumple || Pm.dizzy || (Pm.type === 'proj' && !Pm.launch) ? [PZ(P), ...str, ...upFin] : Pm.launcher ? [PZ(P), J, ...air] : null;
    const adv = [
      { name: N[0], stars: 3, note: nm(g[g.length - 1]) + ' ends the string; ' + nm(S.launch) + ' and the air string, ' + nm(a[a.length - 1]) + ' for the bounce, and the whole string again.', steps: [...up, ...air, GB, ...str] },
      { name: N[1], stars: 4, note: nm(S.airHeavy) + ' (air Heavy) for the ground bounce, then the whole string.', steps: [...spike, ...str] },
      { name: N[2], wall: true, stars: 4, note: nm(S.heavy) + ' mid-string KNOCKS them into the wall, and the whole string off the rebound.', steps: [...two, TW(S.heavy), WB, ...str] },
      { name: N[3], stars: 5, note: nm(S.airHeavy) + ' for the bounce, then ' + nm(S.super).toUpperCase() + ' to end it: a hard knockdown, so ' + nm(S.dashAtk) + ' them off the floor (Dodge, then Light).', steps: [...spike, ...two, ...ART, otg] },
      pz ? { name: N[4], stars: 3, note: 'Pause after ' + nm(g[1]) + ': ' + nm(P) + (Pm.launcher ? ' sends them up, and the air string.' : ', then the whole string.'), steps: [...two, ...pz] }
        : { name: N[4], stars: 3, note: 'Up and down for the bounce, two hits, and the pause branch: ' + nm(P) + '.', steps: [...up, ...air, GB, ...two, PZ(P)] },
      buff ? { name: N[5], stars: 3, note: sp.name.toUpperCase() + ' first, then the whole combo.', steps: [SPC(S.special, 1), ...str, ...upFin] }
        : Pm.crumple || Pm.dizzy ? { name: N[5], stars: 4, note: nm(P) + ' (pause after ' + nm(g[1]) + ') folds them up; two hits, then ' + sp.name.toUpperCase() + ' straight out of the string.', steps: [...two, PZ(P), ...two, SPC(S.special)] }
        : { name: N[5], stars: 4, note: 'Up and down for the bounce, two hits, then ' + sp.name.toUpperCase() + ' straight out of the string.', steps: [...up, ...air, GB, ...two, SPC(S.special)] },
      { name: N[6], stars: 4, note: 'The second ' + nm(S.airHeavy) + ' can’t bounce them: ' + nm(S.dashAtk) + ' them off the floor (Dodge, then Light).', steps: [...spike, ...up, A(a[0]), AH(S.airHeavy), otg] },
    ];
    const shot = MV(S.heavy).type === 'proj';   // (a thrown KNOCK at someone in the air won't wall-bounce them: it goes in first)
    const pro = [
      shot ? { name: N[7], wall: true, note: nm(S.heavy) + ' into the wall, two off the rebound, a Part Toss, then ' + nm(S.super).toUpperCase() + ' and ' + nm(S.dashAtk) + ' on the knockdown.', steps: [...two, TW(S.heavy), WB, ...two, PT, ...two, ...ART, otg] }
        : { name: N[7], wall: true, note: 'Up, the bounce, ' + nm(S.heavy) + ' into the wall, a Part Toss, then ' + nm(S.super).toUpperCase() + ' and ' + nm(S.dashAtk) + ' on the knockdown.', steps: [...up, ...air, GB, ...two, TW(S.heavy), WB, ...two, PT, ...two, ...ART, otg] },
      { name: N[8], note: nm(S.airHeavy) + ', a Part Toss (a fresh ground bounce), and the whole string' + (fin.launcher ? ' into the air string.' : '.'), steps: [...spike, ...two, PT, ...str, ...upFin] },
      shot ? { name: N[9], wall: true, note: nm(S.heavy) + ' into the wall, ' + nm(S.launch) + ' off the rebound, ' + nm(S.airHeavy) + ' for the bounce, and the whole string.', steps: [...two, TW(S.heavy), WB, ...spike, ...str] }
        : { name: N[9], wall: true, note: 'The bounce, ' + nm(S.heavy) + ' into the wall off it, and the whole string off the rebound.', steps: [...spike, ...two, TW(S.heavy), WB, ...str] },
      slam ? { name: N[10], note: 'Open with ' + nm(S.super).toUpperCase() + ' (a raw Art bounces them off the floor), ' + nm(S.launch) + ', ' + nm(S.airHeavy) + ' (the bounce is spent: ' + nm(S.dashAtk) + ' them off the floor), a Part Toss and the string.', steps: [...ART, GB, ...up, A(a[0]), AH(S.airHeavy), otg, ...two, PT, ...str] }
        : { name: N[10], wall: true, note: 'Open with ' + nm(S.super).toUpperCase() + ' (a raw Art bounces them off the wall), two hits off the rebound, a Part Toss, and the whole string.', steps: [...ART, WB, ...two, PT, ...str] },
      { name: N[11], note: nm(S.airHeavy) + ' for the bounce, a Part Toss, two more, then ' + nm(S.super).toUpperCase() + ' and ' + nm(S.dashAtk) + ' on the knockdown.', steps: [...spike, ...two, PT, ...two, ...ART, otg] },
    ];
    if (ROUTE_FIX[line]) ROUTE_FIX[line](adv, pro, { S, g, a, P, two, up, air, spike, str, otg });
    return { adv, pro };
  }
  for (const l of Object.keys(NAMES)) { ADV[l] = () => genRoutes(l).adv; PRO[l] = () => genRoutes(l).pro; }
  Object.assign(SIG, {
    basketball: (S, g, a, air) => ({ name: 'Hang time', note: 'The whole string: Block Party sends them up. Jump after them: the air string is three hits, and every one keeps you up there.', steps: [...g.map(L), J, ...air] }),
    ronin: (S, g, a, air) => ({ name: 'Battōjutsu', note: 'The first cut of every string comes straight out of the scabbard (+30%). The whole string, and up after them.', steps: [...g.map(L), J, ...air] }),
    kunoichi: (S, g) => ({ name: 'Needle kiss', note: 'Pause after the Fan Sweep: a poisoned hairpin. Then the string: Lights hit anyone POISONED 20% harder.', steps: [L(g[0]), L(g[1]), PZ('kuP'), ...g.map(L)] }),
    shogun: (S, g) => ({ name: 'Rebuke', note: 'Pause after the Return Cut: the war fan crumples them. Then the whole string, Verdict and all.', steps: [L(g[0]), L(g[1]), PZ('shP'), ...g.map(L)] }),
    daimyo: (S, g) => ({ name: 'Shin reap', note: 'Pause after the Return Sweep: Sune-gari reaps their shins and pops them up.', steps: [L(g[0]), L(g[1]), PZ('daP')] }),
    templar: (S, g) => ({ name: 'Mordhau', note: 'Pause after the Zwerchhau: grip the blade and strike with the hilt (they crumple). Then the whole string.', steps: [L(g[0]), L(g[1]), PZ('teP'), ...g.map(L)] }),
    crusader: (S, g, a, air) => ({ name: 'Shield hook', note: 'Pause after the Backhand: the shield hooks them up. Jump after them.', steps: [L(g[0]), L(g[1]), PZ('crP'), J, ...air] }),
    lancer: (S, g) => ({ name: 'Trample', note: 'Pause after the Lance Sweep: the horse runs them down.', steps: [L(g[0]), L(g[1]), PZ('lnP')] }),
    captain: (S, g) => ({ name: 'Spyglass bonk', note: 'Pause after the Backcut: the spyglass leaves them DIZZY. Then the whole string, into the Captain\u2019s Slash.', steps: [L(g[0]), L(g[1]), PZ('caP'), ...g.map(L)] }),
    cannoneer: (S, g) => ({ name: 'Powder flash', note: 'Pause after the Pole Swing: a puff of powder, they\u2019re DIZZY. Then the string: the Touch-Hole sets them alight.', steps: [L(g[0]), L(g[1]), PZ('cnP'), ...g.map(L)] }),
    blackbeard: (S, g) => ({ name: 'Close shot', note: 'Pause after the Backhand: a pistol point blank folds them up, smouldering. Then the string and the Boot.', steps: [L(g[0]), L(g[1]), PZ('bbP2'), ...g.map(L)] }),
    redbeard: (S, g) => ({ name: 'Kalkan rim', note: 'Pause after the Draw Cut: the shield\u2019s rim folds them up. Then the whole string.', steps: [L(g[0]), L(g[1]), PZ('rdP'), ...g.map(L)] }),
    sailor: (S, g) => ({ name: 'Spit in the eye', note: 'Pause after the Pin Backhand: they\u2019re DIZZY. Then the whole string, up to the Sailor\u2019s Uppercut.', steps: [L(g[0]), L(g[1]), PZ('slP'), ...g.map(L)] }),
    marauder: (S, g) => ({ name: 'Hatchet', note: 'Pause after the Axe Backhand: he throws the hatchet from his belt.', steps: [L(g[0]), L(g[1]), PZ('maP')] }),
    musketeer: (S, g) => ({ name: 'Bayonet charge', note: 'Pause after the Butt Stroke: the bayonet charge runs through them.', steps: [L(g[0]), L(g[1]), PZ('muP')] }),
    ghost: (S, g) => ({ name: 'Wail', note: 'Pause after the Phantom Backcut: the wail leaves them DIZZY. Then the string: Through the Body passes through them every time.', steps: [L(g[0]), L(g[1]), PZ('ghP'), ...g.map(L)] }),
  });
  const all = () => { if (!TRIALS.samurai) for (const l of KB.LINE_ORDER) TRIALS[l] = build(l); return TRIALS; };
  const allAdv = () => { if (!TRIALS_ADV.samurai) for (const l of KB.LINE_ORDER) TRIALS_ADV[l] = ADV[l] ? ADV[l]().map(t => Object.assign({ adv: true }, t)) : []; return TRIALS_ADV; };
  const allPro = () => { if (!TRIALS_PRO.samurai) for (const l of KB.LINE_ORDER) TRIALS_PRO[l] = PRO[l] ? PRO[l]().map(t => Object.assign({ pro: true, stars: 5 }, t)) : []; return TRIALS_PRO; };
  /* routes cut back to the part that plays the same every time on the platform fighter's rules (they ran on past a
     point that no longer holds): the steps up to there, and a note that says what they are */
  const TRIM = { 'samurai:adv:5': 9, 'knight:adv:1': 12, 'monk:pro:4': 14, 'wrestler:pro:3': 13, 'football:pro:4': 20, 'boxer:adv:5': 12, 'fencer:pro:0': 12,
    'weightlifter:pro:2': 13, 'bowler:pro:3': 6, 'basketball:adv:2': 7, 'cannoneer:pro:2': 8, 'blackbeard:pro:2': 9, 'storm:pro:2': 9, 'monk:pro:0': 11, 'monk:pro:2': 19, 'boxer:pro:2': 10, 'fencer:pro:2': 13, 'bowler:adv:0': 11, 'storm:adv:2': 6 };
  const trimmed = new Map();
  const listOf = (line, tier) => {
    const L = (tier === 'pro' ? allPro() : tier === 'adv' ? allAdv() : all())[line]; if (!L) return L;
    return L.map((t, i) => {
      const n = TRIM[line + ':' + tier + ':' + i]; if (!n || n >= t.steps.length) return t;
      const k = line + ':' + tier + ':' + i;
      if (!trimmed.has(k)) trimmed.set(k, Object.assign({}, t, { steps: t.steps.slice(0, n), note: 'The route: ' + t.steps.slice(0, n).map(stepName).join(' › ') + '.' }));
      return trimmed.get(k);
    });
  };

  /* ------------------------------------------------- saved progress */
  const done = () => { const S = Auth.S; if (!S) return {}; return S.trials || (S.trials = {}); };
  const key = (line, tier) => tier === 'adv' || tier === 'pro' ? line + ':' + tier : line;
  const cleared = (line, i, tier) => !!(done()[key(line, tier)] || {})[i];
  const clearedCount = (line, tier) => Object.keys(done()[key(line, tier)] || {}).length;

  /* ----------------------------------------------- the keys a step names */
  const touching = () => U.touch && !Input.usingPad(0);
  const TOUCH = { light: 'LIGHT', heavy: 'HEAVY', guard: 'GUARD', special: 'SPECIAL', snap: 'SNAP', super: 'SUPER', toss: 'TOSS', jump: 'JUMP', dodge: 'DODGE' };
  const K = a => el('kbd', null, touching() ? TOUCH[a] : Input.prompt(0, a) || '?');
  function stepName(s) {
    if (s.e === 'jump') return 'Jump after them';
    if (s.e === 'bounce') return 'Off the wall!';
    if (s.e === 'gbounce') return 'Ground bounce!';
    if (s.e === 'snap') return 'Snap Cancel';
    if (s.e === 'pickup') return 'Pick up an imp';
    if (s.e === 'airdash') return 'Shadow Dash';
    if (s.e === 'vault') return 'Vault';
    if (s.e === 'super') return 'Legend Art';
    if (s.e === 'art') return 'It catches them';
    return KB.MOVES[s.m].name;
  }
  function stepKeys(s) {
    if (s.e === 'bounce' || s.e === 'art' || s.e === 'gbounce') return [el('i', null, s.e === 'bounce' ? 'they hit the wall' : s.e === 'gbounce' ? 'they hit the floor' : 'the cinematic')];
    if (s.t === 'otg') return [el('i', null, 'OTG '), ...(s.k === 'light' ? [K('dodge'), el('i', null, ' › ')] : []), K(s.k)];
    if (s.t === 'far') return [el('i', null, 'from range '), K(s.k)];
    if (s.e === 'pickup') return [el('i', null, 'run into it')];
    if (s.t === 'pause') return [el('i', null, 'pause, '), K(s.k)];
    if (s.t === 'toward') return [el('i', null, '→ '), K(s.k)];
    if (s.t === 'hold') return [el('i', null, 'hold '), K(s.k)];
    if (s.t === 'beat') return [K(s.k), el('i', null, ' on the beat ♪')];
    if (s.t === 'mash') return [K(s.k), el('i', null, ' mash')];
    if (s.t === 'dash') return [K('dodge'), el('i', null, ' › '), K(s.k)];
    if (s.t === 'air') return [el('i', null, 'air '), K(s.k)];
    return [K(s.k)];
  }

  /* ------------------------------------------------------- the runner */
  let R = null;   // { m, line, i, trial, at (next step), combo, state: 'go'|'ok'|'fail', demo, panel, off }
  const me = () => R.m.fighters[0], dummy = () => R.m.fighters[1];
  function reset(why) {
    R.at = 0; R.combo = null; R.state = 'go'; R.started = {};
    const a = me(); a.spReady = 0; a.uses = a.st.uses; a.hype = 100; a.burst = 100; a.rounds = a.st.rounds; a.reloadT = 0; a.limits = {};
    // the dummy starts each try at the trial's DAMAGE % (the launches carry about as far as the routes need)
    // (a route off a wall starts by it, the dummy at a % where the KNOCK gets there hard enough to bounce)
    const wallish = R.trial.wall || R.trial.steps.some(st => st.e === 'bounce');
    R.m.training.pct = [0, R.trial.pct != null ? R.trial.pct : wallish ? Trials.WALL_PCT : Trials.PCT];
    R.m.training.spot = wallish ? 'wall' : 'centre'; R.m.training.lastSpot = R.m.training.spot; R.m.trainReset();
    if (!wallish) { const [p, d] = R.m.fighters; p.pos.set(-(R.trial.gap || 1.3), 0, 0.6); d.pos.set(0, 0, 0.6); p.yaw = Math.PI / 2; d.yaw = -Math.PI / 2; }
    for (const mn of R.m.minions.slice()) { if (mn.obj.parent) mn.obj.parent.remove(mn.obj); } R.m.minions.length = 0;
    if (R.trial.imps) { R.m.summon(me(), R.trial.imps, true); for (const mn of R.m.minions) if (mn.owner === me()) mn.carried = true; }
    R.note = why || ''; draw();
  }
  function advance() {
    R.at++;
    if (R.at >= R.trial.steps.length) return success();
    draw();
  }
  /* every trial a fighter has, Basic, Advanced and Professional: clear them all and the fighter is yours */
  const TIERS = ['basic', 'adv', 'pro'];
  const lineAll = l => TIERS.reduce((n, t) => n + listOf(l, t).length, 0);
  const lineGot = l => TIERS.reduce((n, t) => n + clearedCount(l, t), 0);
  function success() {
    R.state = 'ok'; SFX.play('win'); HUD.banner('TRIAL CLEAR', 'fight', 1.1);
    const first = !cleared(R.line, R.i, R.tier), k = key(R.line, R.tier);
    if (!R.demo) { (done()[k] = done()[k] || {})[R.i] = Date.now(); Auth.save(); if (first && window.Rewards) Rewards.record({ trials: 1 }); }
    const unlocked = !R.demo && first && lineGot(R.line) >= lineAll(R.line) && !Inv.hasFigure(R.line) && Menu.giftFigure(R.line);   // (the last of its trials: the fighter is yours)
    R.note = R.demo ? 'That\'s how it goes. Your turn!' : unlocked ? 'Every trial cleared: the ' + KB.LINES[R.line].figure + ' is yours!' : first ? 'Cleared! On to the next one.' : 'Cleared again.';
    stopDemo(); draw();
    const m = R.m, i = R.i, wasDemo = R.wasDemo;
    setTimeout(() => { if (!R || R.m !== m || R.i !== i) return; if (!wasDemo && R.i + 1 < R.list.length) go(R.i + 1); else reset(); }, 1800);
  }
  function fail(why) {
    if (R.state !== 'go' || R.at === 0) return;
    R.state = 'fail'; SFX.play('back'); stopDemo();
    const m = R.m, i = R.i; R.note = why; draw();
    setTimeout(() => { if (R && R.m === m && R.i === i) reset(why + ' Try again.'); }, 900);
  }
  /* what counts: every event the fight puts out, checked against the next step */
  function hear(k, d) {
    if (!R || R.state !== 'go' || App.view !== R.m) return;
    const a = me(), s = R.trial.steps[R.at]; if (!s) return;
    if (k === 'move' && d.f === a) {
      if (s.m === d.id) { R.started[R.at] = true; if (s.t === 'nohit' || s.nohit) { if (R.at === 0) R.combo = 'free'; advance(); } return; }
      // the moves of the step just done may still be ending; anything else is the wrong move
      const prev = R.trial.steps[R.at - 1];
      if (R.at > 0 && !(prev && prev.m === d.id)) fail('Wrong move: ' + KB.MOVES[d.id].name + '.');
      return;
    }
    if (k === 'hit' && d.att === a && (d.r === 'hit' || d.r === 'ko') && s.m && d.mv && (d.mv.id === s.m || (KB.MOVES[s.m] && KB.MOVES[s.m].throwMv === d.mv.id)) && s.t !== 'nohit' && !s.nohit) {
      if (s.t === 'hold' && !((d.o.charge || 0) >= 0.45)) { R.note = 'Hold Light longer: a full wind-up (it glows red).'; draw(); return; }
      if (s.t === 'beat' && !a.beatOn) { fail('Not on the beat.'); return; }
      if (!R.combo || R.combo === 'free') R.combo = d.vic.combo;
      else if (d.vic.combo !== R.combo) { fail('The combo dropped.'); return; }
      advance(); return;
    }
    if (k === 'jump' && d.f === a && s.e === 'jump') return advance();
    if (k === 'bounce' && d.by === a && s.e === 'bounce') return advance();
    if (k === 'gbounce' && d.by === a && s.e === 'gbounce') return advance();
    if (k === 'snap' && d.f === a && s.e === 'snap') return advance();
    if (k === 'pickup' && d.f === a && s.e === 'pickup') return advance();
    if (k === 'airdash' && d.f === a && s.e === 'airdash') return advance();
    if (k === 'vault' && d.f === a && s.e === 'vault') return advance();
    if (k === 'super' && d.f === a && s.e === 'super') return advance();
    if (k === 'art' && d.f === a && s.e === 'art') return advance();
  }
  function tick(dt) {
    if (!R || App.view !== R.m) return;
    const a = me(), d = dummy(), s = R.trial.steps[R.at];
    a.pct = 0; a.hype = R.at === 0 || (s && s.e === 'super') ? 100 : a.hype;
    if (Input.keyDown('KeyR')) { if (!R.rHeld) { R.rHeld = true; stopDemo(); reset(); return; } } else R.rHeld = false;
    if (R.state !== 'go') return;
    // the combo has to keep going (a Legend Art has its own catch)
    const inArt = s && (s.e === 'art') || (a.move && a.move.type === 'super');
    if (R.at > 0 && R.combo && R.combo !== 'free' && !d.comboing && !inArt && !(s && s.e === 'bounce' && d.state === 'tumble')) fail('The combo dropped.');
    if (R.demo) demo(dt);
  }

  /* ------------------------------------------------------------ DEMO
     a bot that plays the next step: walk in, press the step's button the way it
     wants (in time, toward them, held, on the beat...), then the next */
  let fake = null;
  function startDemo() { if (!R) return; reset(); R.demo = true; R.wasDemo = true; R.dk = 0; fake = { held: {}, move: { x: 0, y: 0 } }; Input.players[0].cpu = fake; R.m.fighters[0].noTrack = true; draw(); }   // (the demo plays it as written: no target tracking)
  function stopDemo() { if (!R || !R.demo) return; R.demo = false; R.m.fighters[0].noTrack = false; if (Input.players[0].cpu === fake) Input.players[0].cpu = null; fake = null; setTimeout(() => { if (R) R.wasDemo = false; }, 1900); }
  function demo(dt) {
    const a = me(), d = dummy(), s = R.trial.steps[R.at], m = R.m; if (!s || !fake) return;
    for (const k in fake.held) fake.held[k] = false; fake.move.x = 0; fake.move.y = 0;
    if (a.shortOk && m.time - a.jumpT < 0.16) fake.held.jump = true;   // (Jump held through a jump off the ground: a full one, not a short hop)
    R.dk = (R.dk || 0) + 1; const tap = R.dk % 3 === 0;
    const dx = d.pos.x - a.pos.x, dz = d.pos.z - a.pos.z, dist = Math.hypot(dx, dz), dy = d.pos.y - a.pos.y;
    const toward = (k) => { fake.move.x = dx / (dist || 1) * (k || 1); fake.move.y = -dz / (dist || 1) * (k || 1); };
    const busy = a.state === 'attack' && !a.moveHit;
    const press = b => { if (tap) { fake.held[b] = true; if (b === 'heavy' && s.m && s.m === a.leftMove('heavy') && Math.abs(fake.move.x) < 0.5) toward(1); } };   // (the side KNOCK: Heavy with the stick at them)
    if (s.e === 'bounce' || s.e === 'art' || s.e === 'gbounce') return;
    if (s.e === 'jump') return press('jump');
    if (s.e === 'snap') { if (a.state === 'attack' && a.moveHit) press('snap'); return; }
    if (s.e === 'pickup') {
      let best = null, bd = 1e9; for (const mn of m.minions) if (mn.owner === a && !mn.carried && !mn.thrown) { const e = Math.hypot(mn.pos.x - a.pos.x, mn.pos.z - a.pos.z); if (e < bd) { bd = e; best = mn; } }
      if (best && a.state !== 'attack') { const ex = best.pos.x - a.pos.x, ez = best.pos.z - a.pos.z, e = Math.hypot(ex, ez) || 1; fake.move.x = ex / e; fake.move.y = -ez / e; }
      return;
    }
    // OTG: wait for them to land, then walk up and pick them up (Light: the dash attack)
    if (s.t === 'otg') {
      if (R.started[R.at] && (a.state === 'attack' || a.state === 'dodge')) { if (a.state === 'dodge' && a.stateT > 0.1) press('light'); return; }
      if (d.state !== 'down') { if (dist > 1.6 && a.state !== 'attack') toward(); return; }
      if (a.state === 'attack' || a.state === 'dodge') { if (a.state === 'dodge' && a.stateT > 0.1) press('light'); return; }
      if (!a.grounded) return;
      if (s.k === 'light') { toward(); if (dist < 2.4) press('dodge'); return; }
      if (dist > 1.3) { toward(); return; } press(s.k); return;
    }
    // from range: a shot or the Chain Hook, as soon as the last hit has landed
    if (s.t === 'far') {
      if (R.started[R.at] && a.state === 'attack' && a.move && a.move.id === s.m) return;
      const rng = (KB.MOVES[s.m].range || 5) - 0.6;
      if (a.state === 'attack' && !a.moveHit) return;
      if (dist > rng) { if (a.state !== 'attack') toward(); return; }
      toward(); press(s.k); return;
    }
    if (s.e === 'airdash') { toward(); if (a.state === 'attack' && a.moveHit) press('dodge'); return; }
    if (s.e === 'vault') { if (a.state === 'attack' && a.moveHit) press('jump'); return; }
    if (s.e === 'super') { if (R.at === 0 || a.state !== 'attack' || a.moveHit) press('super'); return; }
    // a move step (once its move is out, no more presses: a spare one would be the next move)
    if (R.started[R.at] && a.state === 'attack' && a.move && a.move.id === s.m && s.t !== 'mash' && s.t !== 'hold') return;
    if (s.t === 'air') {
      if (a.grounded && a.state !== 'attack') return; if (dist > 0.8) toward(0.6);
      // a DIVE drives you down: it waits until they've come down to you (from below, it passes under them)
      const sm = KB.MOVES[s.m], down = sm && sm.type !== 'proj' && sm.dive && !sm.multi, top = down ? 1.0 : 1.5;   // (a spinning drill hits all round: it can go early)
      if (a.state === 'air' || (a.state === 'attack' && a.moveHit)) if (dy < top && dy > -1.5 && dist < 2.2) press(s.k); return;
    }
    if (s.t === 'pause') { if (a.pauseWin && m.time >= a.pauseWin.from + 0.02) fake.held.light = true; return; }   // (pressed before the window opens, it would start the string over)
    if (s.t === 'dash') { if (a.state === 'dodge') { if (a.stateT > 0.13) press('light'); return; } if (dist > 1.8 && a.state !== 'attack') toward(); else { toward(); press('dodge'); } return; }
    if (s.t === 'hold') { if (a.state === 'attack' && a.move && a.move.id === s.m) { fake.held.light = a.charge < 0.5; return; } if (dist > 1.4) { toward(); return; } fake.held.light = true; return; }
    if (s.t === 'beat') { if (dist > 1.4) { toward(); return; } if (Music.beat(m).near) fake.held.light = true; return; }
    if (s.t === 'mash') { press('light'); return; }
    // walk in for a fresh start, or to catch a rebound; then press when the last hit has landed
    const fresh = a.state !== 'attack';
    if (d.state === 'tumble') {
      // catching a rebound: swing so the hit lands as they come down through hitting height,
      // and until then stand one reach short of where they'll land (never walk mid-move)
      const mv = KB.MOVES[s.m], tH = (mv.su || 0.08) + 0.06, reach = mv.reach || 1.1;
      const yh = d.pos.y + d.vel.y * tH - 15 * tH * tH, xh = d.pos.x + d.vel.x * tH, zh = d.pos.z + d.vel.z * tH, dh = Math.hypot(xh - a.pos.x, zh - a.pos.z);
      const canLink = a.moveHit && a.move && ((a.move.nx || {}).l === s.m || s.k === 'heavy' || s.k === 'special' || s.k === 'super');
      // (a press it can't cancel into waits for the move to end; one it can waits for them to come into reach, but never
      // past the last tenth of a second of the move: after that the cancel is gone and it's a fresh move, or the pause branch)
      const left = a.move ? a.move.su + a.move.ac + (a.acExt || 0) + a.move.rc - a.moveT : 0;
      if (canLink && ((a.move.nx || {}).l === s.m || s.k === 'heavy') && left < 0.1) { if (s.t === 'toward') toward(1); press(s.k); fake.held[s.k] = true; return; }
      const far = mv.type === 'proj' || mv.type === 'radial', hiY = far || s.k === 'special' ? 2.1 : 1.5, maxD = far ? Math.max(reach + 0.6, (mv.range || mv.rad || 2) + 0.3) : reach + 0.6;   // (a shot, a breath or a burst reaches higher and further than a swing; and nobody swings at someone right over their head)
      if ((fresh || canLink) && yh > 0.15 && yh < hiY && dh > (fresh ? 0.45 : 0.2) && dh < maxD) { if (s.k !== 'heavy' || s.t === 'toward') toward(s.t === 'toward' ? 1 : 0.3); press(s.k); return; }   // (a plain Heavy wants the stick let go: tilted, it's the KNOCK)
      if (!fresh) return;
      const g = 30, vy = d.vel.y, y = Math.max(0, d.pos.y), tl = (vy + Math.sqrt(vy * vy + 2 * g * y)) / g;
      const lx = d.pos.x + d.vel.x * tl, lz = d.pos.z + d.vel.z * tl, r0 = reach * 0.85;
      const ox = a.pos.x - lx, oz = a.pos.z - lz, ol = Math.hypot(ox, oz) || 1, sx = lx + ox / ol * r0, sz = lz + oz / ol * r0;
      const mx = sx - a.pos.x, mz = sz - a.pos.z, ml = Math.hypot(mx, mz);
      if (ml > 0.25) { fake.move.x = mx / ml; fake.move.y = -mz / ml; }
      return;
    }
    if (fresh && dist > 1.5 && !(s.k === 'special')) { toward(); return; }
    if (busy) return;
    if (s.t === 'toward') toward();
    press(s.k);
  }

  /* -------------------------------------------------------- the panel */
  function draw() {
    if (!R || !R.panel) return;
    const t = R.trial, P = R.panel, keep = P.querySelector('.tsteps'), scrolled = keep ? keep.scrollTop : 0; P.innerHTML = '';
    const ok = R.state === 'ok', bad = R.state === 'fail', long = t.steps.length > 11;
    // a long route: two columns, read top to bottom (on a wide screen); and the list scrolls if it still won't fit
    P.className = 'trialp' + (long ? ' long' : '') + (ok ? ' ok' : bad ? ' bad' : '');
    P.style.setProperty('--rows', Math.ceil(t.steps.length / 2));
    P.append(...[
      el('div', { class: 'th' }, el('span', null, (R.tier === 'pro' ? 'PROFESSIONAL · ' : R.tier === 'adv' ? 'ADVANCED · ' : 'COMBO TRIALS · ') + KB.LINES[R.line].name), el('span', { class: 'stars' }, '★'.repeat(t.stars) + '☆'.repeat(5 - t.stars))),
      el('h3', null, (R.i + 1) + ' / ' + R.list.length + '  ' + t.name + (cleared(R.line, R.i, R.tier) ? '  ✓' : '')),
      el('p', { class: 'tnote' }, t.note),
      el('ol', { class: 'tsteps' }, ...t.steps.map((s, k) => el('li', { class: k < R.at || ok ? 'done' : k === R.at && R.state === 'go' ? 'now' : '' },
        el('b', null, stepName(s)), el('span', null, ...stepKeys(s))))),
      R.note ? el('div', { class: 'tmsg' + (bad ? ' bad' : ok ? ' ok' : '') }, R.note) : null,
      R.demo ? el('div', { class: 'tmsg demo' }, '▶ DEMO: watch, then try it') : null,
      el('div', { class: 'trow' },
        el('button', { disabled: R.i === 0 || null, onclick: () => { SFX.play('ui'); go(R.i - 1); } }, '◂'),
        el('button', { onclick: () => { SFX.play('ui'); if (R.demo) { stopDemo(); reset(); } else startDemo(); } }, R.demo ? 'STOP' : 'DEMO'),
        el('button', { onclick: () => { SFX.play('ui'); stopDemo(); reset(); } }, 'RESET'),
        el('button', { disabled: R.i + 1 >= R.list.length || null, onclick: () => { SFX.play('ui'); go(R.i + 1); } }, '▸'),
        el('button', { class: 'exit', onclick: () => { SFX.play('back'); Trials.quit(); } }, 'EXIT'))].filter(Boolean));   // (an empty row is null: DOM append would print it)
    // keep the step you're on in view (the list keeps its place between redraws otherwise)
    const ol = P.querySelector('.tsteps'), now = P.querySelector('.tsteps li.now'); ol.scrollTop = scrolled;
    if (now && ol.scrollHeight > ol.clientHeight + 1) { const top = now.offsetTop - ol.offsetTop, bot = top + now.offsetHeight; if (top < ol.scrollTop + 4 || bot > ol.scrollTop + ol.clientHeight - 4) ol.scrollTop = Math.max(0, top - ol.clientHeight / 2 + now.offsetHeight / 2); }
  }
  function go(i) { if (!R) return; stopDemo(); R.i = i; R.trial = R.list[i]; reset(); }

  /* ------------------------------------------------ start, leave, select */
  const Trials = {};
  Trials.list = (line, tier) => listOf(line, tier);
  Trials.PCT = 0; Trials.WALL_PCT = 0;   // (the dummy's % at the start of a try, unless the trial says: off a wall, more)
  Trials.start = (line, i, tier) => {
    Trials.stop();
    tier = tier === 'adv' || tier === 'pro' ? tier : 'basic';
    const list = listOf(line, tier);
    App.startMatch({ mode: 'training', trials: true, builds: [KB.mintBuild(line, 0), KB.mintBuild('knight', 0)], cpu: [null, null], arena: 'shelf', layout: 'flat', walled: true, wins: 99, time: 999, bonus: true });   // (no platforms to land on mid-combo)
    const m = App.view; m.training.meter = true; m.training.dummy = 'stand';
    R = { m, line, list, tier, i: i == null ? Math.max(0, list.findIndex((t, k) => !cleared(line, k, tier))) : i, at: 0, state: 'go', note: '', started: {} };
    if (R.i < 0) R.i = 0;
    R.trial = list[R.i];
    R.panel = el('div', { class: 'trialp' }); U.$('hud').append(R.panel);
    R.off = m.on(hear); m.tick = tick;
    const wait = () => { if (!R || R.m !== m || App.view !== m) return; if (m.phase === 'fight') reset(); else setTimeout(wait, 100); };
    wait();
  };
  Trials.stop = () => { if (!R) return; stopDemo(); if (R.off) R.off(); if (R.panel) R.panel.remove(); R = null; };
  Trials.running = () => !!R;
  Trials.quit = () => { const line = R && R.line; Trials.stop(); App.setView(null); Trials.open(line); };
  Trials.tier = 'basic';   // which list the select screen shows (it remembers)
  /* the select screen: every fighter, and how far you've got */
  Trials.open = focus => {
    const { btn, topbar } = Menu.ui;
    const tier = Trials.tier, adv = tier === 'adv', pro = tier === 'pro';
    const total = KB.LINE_ORDER.reduce((n, l) => n + listOf(l, tier).length, 0), got = KB.LINE_ORDER.reduce((n, l) => n + clearedCount(l, tier), 0);
    const tab = (t, label) => el('button', { class: tier === t ? 'on' : '', onclick: () => { if (Trials.tier === t) return; SFX.play('ui'); Trials.tier = t; Trials.open(focus); } }, label);
    App.screen(el('div', { class: 'screen trials' }, topbar('COMBO TRIALS', () => Menu.hub()),
      el('div', { class: 'panel trialsel' },
        el('div', { class: 'ttabs' }, tab('basic', 'BASIC'), tab('adv', 'ADVANCED'), tab('pro', 'PROFESSIONAL')),
        el('p', { class: 'note' }, (pro ? 'The longest, hardest-hitting combos in the game, with every mechanic there is: KNOCK//BACKs, ground bounces, OTGs, Specials, Snap Cancels, Part Tosses (and imps), and Legend Arts. ' : adv ? 'Each fighter\'s own long combos, built on what only it has: ground and wall bounces, OTGs, and Legend Arts to end them. '
          : 'Every fighter\'s combos on its own move list, step by step. ') + 'DEMO shows you any of them. ' + got + ' / ' + total + ' cleared. Clear all of a fighter\'s trials (Basic, Advanced and Professional) and the fighter is yours.'),
        Menu.themeTabs(() => Trials.open(focus)),
        el('div', { class: 'tgrid' }, ...Menu.themeLines().filter(l => listOf(l, tier).length).map(l => {
          const L = KB.LINES[l], n = listOf(l, tier).length, c = clearedCount(l, tier);
          return el('button', { class: 'tcard' + (c >= n ? ' full' : '') + (l === focus ? ' focus' : ''), style: { '--lc': L.css }, onclick: () => { SFX.play('ok'); Trials.start(l, null, tier); } },
            el('img', { src: Models.figIcon(KB.mintBuild(l, 0)), alt: '' }), el('b', null, L.name), el('small', null, c + ' / ' + n + (c >= n ? ' ✓' : '')),
            Inv.hasFigure(l) ? null : el('em', { class: 'tlock' }, '\ud83d\udd12 ' + lineGot(l) + ' / ' + lineAll(l) + ' to unlock'),
            el('div', { class: 'tbar' }, el('i', { style: { width: (100 * c / n) + '%' } })));
        })))));
  };
  Trials.all = all; Trials.allAdv = allAdv; Trials.allPro = allPro; Trials.cleared = cleared; Trials.lineAll = lineAll; Trials.lineGot = lineGot;
  window.Trials = Trials;
})();
