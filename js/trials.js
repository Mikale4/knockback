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
    const sp = KB.MOVES[S.special], spStep = { m: S.special, k: 'special', t: ['buff', 'summon'].includes(sp.type) ? 'nohit' : '' };
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
    const up = S.gunCancel ? [L(g[0]), L(g[1]), { m: S.gunCancel, k: 'heavy' }, L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }] : [L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }];
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
  /* where a line's own rules change a common trial */
  const FIX = {
    // the Flintlock: the first Heavy of a combo is a Quick Shot, so the launcher comes after one
    pirate: (T, S, g, a, air) => {
      const t = T.find(x => x.name === 'Launcher');
      t.name = 'Smoke and steel'; t.stars = 3; t.note = 'The first Heavy in a combo is a Quick Shot; the string starts again, and the next Heavy launches.';
      t.steps = [L(g[0]), L(g[1]), { m: S.gunCancel, k: 'heavy' }, L(g[0]), L(g[1]), { m: S.launch, k: 'heavy' }, { e: 'jump', k: 'jump' }, ...air];
      const s = T.find(x => x.name === 'Special cancel');
      s.name = 'Gunslinger'; s.note = 'Quick Shot mid-string, then the whole string again.'; s.steps = [L(g[0]), L(g[1]), { m: S.gunCancel, k: 'heavy' }, ...g.map(L)];
    },
    // the Chain Hook drags them in rather than out: the Ninja's wall combo starts with the dash attack
    ninja: (T, S, g) => {
      const t = T.find(x => x.name === 'KNOCK//BACK');
      t.note = 'Dodge at them, then Light: Shadow Kick sends them into the wall. Catch them on the rebound.';
      t.steps = [{ m: S.dashAtk, k: 'light', t: 'dash' }, { e: 'bounce' }, L(g[0]), L(g[1])];
    },
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
      { name: 'Six-shooter', stars: 4, note: 'Quick Shot, Pistol Whip, a Plunging Shot from the air, and a second Pistol Whip off the ground bounce.', steps: [L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), H('pistolWhip')] },
      { name: 'Dirty deeds', stars: 3, note: 'A Quick Shot starts the string over; sand in their eyes, and the whole string while they can\'t see.', steps: [L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), PZ('cuP'), L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
      { name: 'Keelhaul', stars: 5, note: 'Open with BROADSIDE: a raw Legend Art GROUND BOUNCES them. Then the guns: Quick Shot, Pistol Whip and a Plunging Shot.', steps: [...ART, GB, L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot')] },
      { name: 'Plunging OTG', stars: 4, note: 'Two Plunging Shots: the first bounces them, the second puts them down for a Peg Sweep OTG.', steps: [L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), OTG('pegSweep', 'light')] },
      { name: 'Cannonball', stars: 3, note: 'The whole air string: the Cannonball spikes them, and the whole string off the bounce.', steps: [L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), A('cuAirB'), A('cuAirC'), GB, L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
      { name: 'Loose cannon', stars: 3, note: 'A Quick Shot, then a Part Toss to extend it again.', steps: [L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), { m: 'partToss', k: 'toss' }, L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
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
      { name: 'Dead man\'s chest', wall: true, note: 'Quick Shot, Pistol Whip, a Plunging Shot, Point Blank into the wall off the bounce, a Part Toss, then BROADSIDE and a Peg Sweep OTG.', steps: [L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), TW('pointBlank'), WB, L('cuA'), L('cuB'), PT, L('cuA'), L('cuB'), ...ART, OTG('pegSweep', 'light')] },
      { name: 'Gun kata', note: 'All pistol: Quick Shot, Pistol Whip, Plunging Shot, Pistol Whip again off the ground bounce, Plunging Shot to put them down, and a Peg Sweep OTG.', steps: [L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), OTG('pegSweep', 'light')] },
      { name: 'Dirty pirate', wall: true, note: 'Sand, a Quick Shot, the Boot to the Face into the wall, and up off the rebound.', steps: [L('cuA'), L('cuB'), PZ('cuP'), L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), L('cuC'), L('cuD'), WB, L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), A('cuAirB'), A('cuAirC')] },
      { name: 'Broadside', note: 'Open with BROADSIDE (a raw Art bounces them), the guns, a Plunging Shot to put them down, a Peg Sweep OTG and a Part Toss.', steps: [...ART, GB, L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), OTG('pegSweep', 'light'), L('cuA'), L('cuB'), PT, L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
      { name: 'Keelhauled', wall: true, note: 'Point Blank from range into the wall, Quick Shot, Pistol Whip, a Plunging Shot, a Part Toss and the Boot.', steps: [FAR('pointBlank'), WB, L('cuA'), L('cuB'), H('quickShot'), L('cuA'), L('cuB'), H('pistolWhip'), J, A('cuAirA'), AH('airShot'), GB, L('cuA'), L('cuB'), PT, L('cuA'), L('cuB'), L('cuC'), L('cuD')] },
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
  const all = () => { if (!TRIALS.samurai) for (const l of KB.LINE_ORDER) TRIALS[l] = build(l); return TRIALS; };
  const allAdv = () => { if (!TRIALS_ADV.samurai) for (const l of KB.LINE_ORDER) TRIALS_ADV[l] = ADV[l] ? ADV[l]().map(t => Object.assign({ adv: true }, t)) : []; return TRIALS_ADV; };
  const allPro = () => { if (!TRIALS_PRO.samurai) for (const l of KB.LINE_ORDER) TRIALS_PRO[l] = PRO[l] ? PRO[l]().map(t => Object.assign({ pro: true, stars: 5 }, t)) : []; return TRIALS_PRO; };
  const listOf = (line, tier) => (tier === 'pro' ? allPro() : tier === 'adv' ? allAdv() : all())[line];

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
    const a = me(); a.spReady = 0; a.uses = a.st.uses; a.hype = 100; a.burst = 100;
    R.m.training.spot = R.trial.wall ? 'wall' : 'centre'; R.m.training.lastSpot = R.m.training.spot; R.m.trainReset();
    if (!R.trial.wall) { const [p, d] = R.m.fighters; p.pos.set(-(R.trial.gap || 1.3), 0, 0.6); d.pos.set(0, 0, 0.6); p.yaw = Math.PI / 2; d.yaw = -Math.PI / 2; }
    for (const mn of R.m.minions.slice()) { if (mn.obj.parent) mn.obj.parent.remove(mn.obj); } R.m.minions.length = 0;
    if (R.trial.imps) { R.m.summon(me(), R.trial.imps, true); for (const mn of R.m.minions) if (mn.owner === me()) mn.carried = true; }
    R.note = why || ''; draw();
  }
  function advance() {
    R.at++;
    if (R.at >= R.trial.steps.length) return success();
    draw();
  }
  function success() {
    R.state = 'ok'; SFX.play('win'); HUD.banner('TRIAL CLEAR', 'fight', 1.1);
    const first = !cleared(R.line, R.i, R.tier), k = key(R.line, R.tier);
    if (!R.demo) { (done()[k] = done()[k] || {})[R.i] = Date.now(); Auth.save(); if (first && window.Rewards) Rewards.record({ trials: 1 }); }
    R.note = R.demo ? 'That\'s how it goes. Your turn!' : first ? 'Cleared! On to the next one.' : 'Cleared again.';
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
    if (k === 'hit' && d.att === a && (d.r === 'hit' || d.r === 'ko') && s.m && d.mv && d.mv.id === s.m && s.t !== 'nohit' && !s.nohit) {
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
    a.hp = a.maxHp; d.hp = Math.max(d.hp, d.maxHp * 0.5); a.hype = R.at === 0 || (s && s.e === 'super') ? 100 : a.hype;
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
    R.dk = (R.dk || 0) + 1; const tap = R.dk % 3 === 0;
    const dx = d.pos.x - a.pos.x, dz = d.pos.z - a.pos.z, dist = Math.hypot(dx, dz), dy = d.pos.y - a.pos.y;
    const toward = (k) => { fake.move.x = dx / (dist || 1) * (k || 1); fake.move.y = -dz / (dist || 1) * (k || 1); };
    const busy = a.state === 'attack' && !a.moveHit;
    const press = b => { if (tap) fake.held[b] = true; };
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
    if (s.t === 'air') { if (a.grounded && a.state !== 'attack') return; if (dist > 0.8) toward(0.6); if (a.state === 'air' || (a.state === 'attack' && a.moveHit)) if (Math.abs(dy) < 1.5 && dist < 2.2) press(s.k); return; }
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
      if (canLink && ((a.move.nx || {}).l === s.m || s.k === 'heavy') && left < 0.1) { if (s.t === 'toward') toward(0.3); press(s.k); fake.held[s.k] = true; return; }
      const far = mv.type === 'proj' || mv.type === 'radial', hiY = far || s.k === 'special' ? 2.1 : 1.5, maxD = far ? Math.max(reach + 0.6, (mv.range || mv.rad || 2) + 0.3) : reach + 0.6;   // (a shot, a breath or a burst reaches higher and further than a swing; and nobody swings at someone right over their head)
      if ((fresh || canLink) && yh > 0.15 && yh < hiY && dh > (fresh ? 0.45 : 0.2) && dh < maxD) { if (s.k !== 'heavy' || s.t === 'toward') toward(0.3); press(s.k); return; }   // (a plain Heavy wants the stick let go: tilted, it's the KNOCK)
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
  Trials.start = (line, i, tier) => {
    Trials.stop();
    tier = tier === 'adv' || tier === 'pro' ? tier : 'basic';
    const list = listOf(line, tier);
    App.startMatch({ mode: 'training', trials: true, builds: [KB.mintBuild(line, 0), KB.mintBuild('knight', 0)], cpu: [null, null], arena: 'shelf', wins: 99, time: 999, bonus: true });
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
          : 'Every fighter\'s combos on its own move list, step by step. ') + 'DEMO shows you any of them. ' + got + ' / ' + total + ' cleared.'),
        el('div', { class: 'tgrid' }, ...KB.LINE_ORDER.map(l => {
          const L = KB.LINES[l], n = listOf(l, tier).length, c = clearedCount(l, tier);
          return el('button', { class: 'tcard' + (c >= n ? ' full' : '') + (l === focus ? ' focus' : ''), style: { '--lc': L.css }, onclick: () => { SFX.play('ok'); Trials.start(l, null, tier); } },
            el('img', { src: Models.figIcon(KB.mintBuild(l, 0)), alt: '' }), el('b', null, L.name), el('small', null, c + ' / ' + n + (c >= n ? ' ✓' : '')),
            el('div', { class: 'tbar' }, el('i', { style: { width: (100 * c / n) + '%' } })));
        })))));
  };
  Trials.all = all; Trials.allAdv = allAdv; Trials.allPro = allPro; Trials.cleared = cleared;
  window.Trials = Trials;
})();
