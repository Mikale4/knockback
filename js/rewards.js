/* ============================================================================
   rewards.js -- REWARDS: daily and weekly jobs, a mastery track for every
   fighter line, milestones, and awards.

   Everything a collector does is counted here, in three scopes at once:
   `life` (never reset), `day` (reset at midnight) and `week` (reset on
   Monday). The daily and weekly boards read the short scopes, the fighter
   tracks and milestones the lifetime one, so one event feeds all of them.

   Five boards:
     DAILY       small jobs from a normal day's play (one rotates: today's
                 featured figure)
     WEEKLY      the week's bigger goals
     FIGHTERS    a mastery track per line: win with its Legend Card; the
                 higher tiers pay out that line's parts
     MILESTONES  first steps for a new collector, then tiered chains (I-V)
     AWARDS      one-off medals that pay the moment they unlock

   Quests and tiers have to be CLAIMED (a reward you never saw arrive may as
   well not have been given); awards pay at once, with a toast.

   A fight is watched through the match's events (match.js M.on) and its
   counts are added when it ends (or is quit). Capsules, the tutorial and
   the Workshop report in directly.

     Rewards.watch(m, opts)  Rewards.fightDone(res, opts)  Rewards.record(add)
     Rewards.ready() (how many to claim)  Rewards.screen(tab)
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;

  /* ------------------------------------------------------------- periods */
  const dayKey = t => { const d = new Date(t || Date.now()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const weekStart = t => { const d = new Date(t || Date.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
  const weekKey = t => { const d = weekStart(t); return d.getFullYear() + '-w' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const resets = () => { const d = new Date(); d.setHours(24, 0, 0, 0); const w = weekStart(); w.setDate(w.getDate() + 7); return { day: d - Date.now(), week: w - Date.now() }; };
  const left = ms => { const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60; return h >= 24 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : h + 'h ' + m + 'm'; };
  /* today's featured figure: the lines in turn, one a day */
  const featured = () => KB.LINE_ORDER[Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000) % KB.LINE_ORDER.length];
  const NAME = l => KB.LINES[l].name;

  /* ---------------------------------------------------------- the boards
     stat: a counter in the scope (or value(c) for anything else), goal,
     pay: { tokens, tickets (a free ×1 capsule), part: [line, rarity] } */
  const DAILY = [
    { id: 'd_fight', name: 'Warm-up', desc: 'Finish 3 fights (CPU, Arcade or Versus).', stat: 'fights', goal: 3, pay: { tokens: 100 } },
    { id: 'd_win', name: 'Winner\'s circle', desc: 'Win 2 fights.', stat: 'wins', goal: 2, pay: { tokens: 150 } },
    { id: 'd_feat', name: 'Featured figure', desc: () => 'Win a fight wearing any ' + NAME(featured()) + ' part. (Tomorrow it\'s a different line.)', stat: 'featWins', goal: 1, pay: { tokens: 200 } },
    { id: 'd_bounce', name: 'Off the wall', desc: 'Bounce someone off a wall 10 times.', stat: 'bounces', goal: 10, pay: { tokens: 100 } },
    { id: 'd_combo', name: 'Combo artist', desc: 'Land a 12-hit combo.', value: c => c.day.bestCombo || 0, goal: 12, pay: { tokens: 120 } },
    { id: 'd_art', name: 'Legendary', desc: 'Land a Legend Art.', stat: 'arts', goal: 1, pay: { tokens: 120 } },
    { id: 'd_throw', name: 'Hands on', desc: 'Throw someone 3 times (Guard + Light, then tilt).', stat: 'throws', goal: 3, pay: { tokens: 80 } },
    { id: 'd_otg', name: 'Off the ground', desc: 'Land 2 OTGs.', stat: 'otgs', goal: 2, pay: { tokens: 80 } },
    { id: 'd_parts', name: 'Snap!', desc: 'Break off 2 of their parts.', stat: 'partBreaks', goal: 2, pay: { tokens: 100 } },
    { id: 'd_capsule', name: 'One more capsule', desc: 'Open a capsule.', stat: 'capsules', goal: 1, pay: { tokens: 100 } },
    { id: 'd_sweep', name: 'Busy day', desc: 'Claim 6 other daily rewards.', stat: 'dailyClaims', goal: 6, pay: { tokens: 200, tickets: 1 } },
  ];
  const WEEKLY = [
    { id: 'w_wins', name: 'A good week', desc: 'Win 15 fights.', stat: 'wins', goal: 15, pay: { tokens: 600, tickets: 1 } },
    { id: 'w_fights', name: 'Fight fit', desc: 'Finish 40 fights.', stat: 'fights', goal: 40, pay: { tokens: 400 } },
    { id: 'w_champ', name: 'Giant killer', desc: 'Beat a CHAMPION CPU 3 times.', stat: 'champWins', goal: 3, pay: { tokens: 800, tickets: 1 } },
    { id: 'w_arcade', name: 'Six in a row', desc: 'Clear the Arcade.', stat: 'arcadeClears', goal: 1, pay: { tokens: 1000, tickets: 1 } },
    { id: 'w_lines', name: 'Versatile', desc: 'Win with 5 different Legend Cards.', value: c => Object.keys(c.week.cardWins || {}).length, goal: 5, pay: { tokens: 500 } },
    { id: 'w_walls', name: 'Wrecking crew', desc: 'Break 8 walls.', stat: 'wallBreaks', goal: 8, pay: { tokens: 500 } },
    { id: 'w_ringout', name: 'Out of here', desc: 'Ring someone out 5 times.', stat: 'ringouts', goal: 5, pay: { tokens: 400 } },
    { id: 'w_combo', name: 'Combo week', desc: 'Land a 25-hit combo.', value: c => c.week.bestCombo || 0, goal: 25, pay: { tokens: 600 } },
    { id: 'w_arts', name: 'Legends only', desc: 'Land 8 Legend Arts.', stat: 'arts', goal: 8, pay: { tokens: 500 } },
    { id: 'w_mixed', name: 'Mix and match', desc: 'Win 5 fights with arms from two different lines.', stat: 'mixedWins', goal: 5, pay: { tokens: 400 } },
    { id: 'w_steal', name: 'Finders keepers', desc: 'Snap on a part you knocked off THEM, 3 times.', stat: 'steals', goal: 3, pay: { tokens: 400 } },
    { id: 'w_daily', name: 'Every day counts', desc: 'Claim 25 daily rewards.', stat: 'dailyClaims', goal: 25, pay: { tokens: 1000, tickets: 1 } },
  ];
  /* a collector's first steps */
  const FIRST = [
    { id: 'f_win', name: 'First blood', desc: 'Win your first fight.', stat: 'wins', goal: 1, pay: { tokens: 200 } },
    { id: 'f_capsule', name: 'Shake it', desc: 'Open your first capsule.', stat: 'capsules', goal: 1, pay: { tokens: 150 } },
    { id: 'f_mixed', name: 'Kitbash', desc: 'In the Workshop, build a figure whose arms come from two different lines.', value: c => c.owned.mixedBuilds, goal: 1, pay: { tokens: 200 } },
    { id: 'f_arcade', name: 'Insert coin', desc: 'Win an Arcade stage.', stat: 'arcadeStages', goal: 1, pay: { tokens: 150 } },
    { id: 'f_wall', name: 'Through the wall', desc: 'Break a wall.', stat: 'wallBreaks', goal: 1, pay: { tokens: 150 } },
    { id: 'f_art', name: 'The real thing', desc: 'Land a Legend Art.', stat: 'arts', goal: 1, pay: { tokens: 150 } },
    { id: 'f_steal', name: 'Spare parts', desc: 'Snap on a part you knocked off them.', stat: 'steals', goal: 1, pay: { tokens: 150 } },
    { id: 'f_versus', name: 'Couch rivals', desc: 'Play a 2-player Versus.', stat: 'versus', goal: 1, pay: { tokens: 150 } },
    { id: 'f_online', name: 'Long distance', desc: 'Play an online fight.', stat: 'online', goal: 1, pay: { tokens: 200 } },
  ];
  /* the chains: one number and a ladder of targets; the tiers are claimed in order and pay
     TIER_PAY scaled by the chain's weight */
  const TIER_PAY = [{ tokens: 100 }, { tokens: 250 }, { tokens: 500, tickets: 1 }, { tokens: 1000, tickets: 1 }, { tokens: 2000, tickets: 2 }];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
  const L = k => c => c.life[k] || 0;
  const CATS = [['fight', 'Fighting'], ['wall', 'The wall'], ['tech', 'Technique'], ['collect', 'Collection'], ['dedication', 'Dedication']];
  const CHAINS = [
    { id: 'c_wins', cat: 'fight', name: 'Winner', desc: 'Win {n} fights.', value: L('wins'), tiers: [5, 25, 75, 200, 500], weight: 1.2 },
    { id: 'c_fights', cat: 'fight', name: 'Regular', desc: 'Finish {n} fights.', value: L('fights'), tiers: [10, 50, 150, 400, 1000], weight: 1 },
    { id: 'c_champ', cat: 'fight', name: 'Champion slayer', desc: 'Beat a CHAMPION CPU {n} times.', value: L('champWins'), tiers: [1, 10, 30, 75, 150], weight: 1.5 },
    { id: 'c_arcade', cat: 'fight', name: 'Arcade legend', desc: 'Clear the Arcade {n} times.', value: L('arcadeClears'), tiers: [1, 5, 15, 40], weight: 2 },
    { id: 'c_bounces', cat: 'wall', name: 'KNOCK//BACK', desc: 'Bounce someone off a wall {n} times.', value: L('bounces'), tiers: [25, 150, 500, 1500, 4000], weight: 1 },
    { id: 'c_walls', cat: 'wall', name: 'Wall breaker', desc: 'Break {n} walls.', value: L('wallBreaks'), tiers: [5, 25, 75, 200, 500], weight: 1.2 },
    { id: 'c_ringouts', cat: 'wall', name: 'Out of bounds', desc: 'Ring someone out {n} times.', value: L('ringouts'), tiers: [3, 15, 50, 150], weight: 1.2 },
    { id: 'c_combo', cat: 'tech', name: 'Combo master', desc: 'Land a {n}-hit combo.', value: c => c.life.bestCombo || 0, tiers: [10, 20, 30, 45, 60], weight: 1.5 },
    { id: 'c_arts', cat: 'tech', name: 'Living legend', desc: 'Land {n} Legend Arts.', value: L('arts'), tiers: [5, 25, 75, 200, 500], weight: 1 },
    { id: 'c_throws', cat: 'tech', name: 'Grappler', desc: 'Throw someone {n} times.', value: L('throws'), tiers: [10, 50, 150, 400], weight: 0.8 },
    { id: 'c_otgs', cat: 'tech', name: 'Off the ground', desc: 'Land {n} OTGs.', value: L('otgs'), tiers: [10, 50, 150, 400], weight: 0.8 },
    { id: 'c_extends', cat: 'tech', name: 'Spare change', desc: 'Extend {n} combos with a Part Toss.', value: L('extends'), tiers: [5, 25, 75, 200], weight: 1 },
    { id: 'c_trials', cat: 'tech', name: 'Combo scholar', desc: 'Clear {n} combo trials.', value: c => c.owned.trials, tiers: [5, 20, 40, 70], weight: 1.2 },
    { id: 'c_bursts', cat: 'tech', name: 'Breakout', desc: 'Spring Burst out of {n} combos.', value: L('bursts'), tiers: [5, 25, 75, 200], weight: 0.8 },
    { id: 'c_parts', cat: 'collect', name: 'Collector', desc: 'Own {n} different parts.', value: c => c.owned.parts, tiers: [20, 50, 100, 160, 240], weight: 1.2 },
    { id: 'c_capsules', cat: 'collect', name: 'Capsule fiend', desc: 'Open {n} capsules.', value: L('capsules'), tiers: [10, 50, 150, 400, 1000], weight: 1 },
    { id: 'c_breaks', cat: 'collect', name: 'Scrap dealer', desc: 'Break off {n} of their parts.', value: L('partBreaks'), tiers: [10, 50, 150, 400], weight: 1 },
    { id: 'c_steals', cat: 'collect', name: 'Magpie', desc: 'Snap on {n} parts you knocked off them.', value: L('steals'), tiers: [1, 5, 20, 50], weight: 1 },
    { id: 'c_days', cat: 'dedication', name: 'Regular customer', desc: 'Play on {n} different days.', value: L('days'), tiers: [3, 7, 30, 100], weight: 1.5 },
    { id: 'c_dailies', cat: 'dedication', name: 'Every day counts', desc: 'Claim {n} daily rewards.', value: L('dailyClaims'), tiers: [10, 50, 200, 500], weight: 1 },
  ];
  /* a mastery track per line: win with its Legend Card; tiers III and V pay one of its parts */
  const FIGHTER_TIERS = [1, 5, 15, 40, 100];
  const fighterPay = (line, i) => Object.assign({ tokens: [100, 250, 500, 800, 1500][i] }, i === 2 ? { part: [line, 1] } : i === 4 ? { part: [line, 2] } : {}, i === 3 ? { tickets: 1 } : {});
  /* awards: one-off medals, paid the moment they unlock (check(c, fight) on the lifetime bag) */
  const AWARDS = [
    { id: 'a_perfect', name: 'Untouched', desc: 'Win a round without being hit.', pay: 150, check: (c, F) => F && F.perfect },
    { id: 'a_pingpong', name: 'Ping-pong', desc: 'Bounce someone off walls 3 times in one combo.', pay: 100, check: (c, F) => F && F.maxBounces >= 3 },
    { id: 'a_ringout', name: 'See you outside', desc: 'Ring someone out.', pay: 100, check: c => c.life.ringouts >= 1 },
    { id: 'a_comeback', name: 'Not yet!', desc: 'Win a round with under 10% HP left.', pay: 150, check: (c, F) => F && F.comeback },
    { id: 'a_mint', name: 'Mint condition', desc: 'Win with a full MINT SET (all six parts from one line).', pay: 100, check: c => c.life.mintWins >= 1 },
    { id: 'a_mixed', name: 'Hybrid theory', desc: 'Land a hybrid finisher (arms from two lines).', pay: 100, check: c => c.life.hybrids >= 1 },
    { id: 'a_all10', name: 'Every line', desc: 'Win with ten different Legend Cards.', pay: 1000, check: c => Object.keys(c.life.cardWins || {}).length >= 10 },
    { id: 'a_thief', name: 'Wearing your arm', desc: 'Win a fight while wearing a part you took off them.', pay: 200, check: (c, F) => F && F.won && F.steals > 0 },
    { id: 'a_double', name: 'Double extend', desc: 'Extend one combo twice with Part Tosses.', pay: 150, check: (c, F) => F && F.doubleExt },
    { id: 'a_champ', name: 'Champion slayer', desc: 'Beat a CHAMPION CPU.', pay: 200, check: c => c.life.champWins >= 1 },
    { id: 'a_combo30', name: 'Thirty!', desc: 'Land a 30-hit combo.', pay: 300, check: c => c.life.bestCombo >= 30 },
    { id: 'a_demolition', name: 'Demolition', desc: 'Break 3 walls in one fight.', pay: 200, check: (c, F) => F && F.wallBreaks >= 3 },
    { id: 'a_chase', name: 'Chase!', desc: 'Pull a CHASE part from a capsule.', pay: 200, check: c => c.life.chases >= 1 },
    { id: 'a_arcade', name: 'Credits roll', desc: 'Clear the Arcade.', pay: 300, check: c => c.life.arcadeClears >= 1 },
    { id: 'a_throwko', name: 'Thrown out', desc: 'Win a round with a throw.', pay: 100, check: (c, F) => F && F.throwKO },
    { id: 'a_artko', name: 'Legendary finish', desc: 'Win a round with a Legend Art.', pay: 150, check: (c, F) => F && F.artKO },
    { id: 'a_graduate', name: 'Graduate', desc: 'Finish the tutorial.', pay: 0, check: c => c.life.tutorials >= 1 },
    { id: 'a_online', name: 'Friendly fire', desc: 'Win an online fight.', pay: 200, check: c => c.life.onlineWins >= 1 },
    { id: 'a_trials', name: 'Mastered', desc: 'Clear every combo trial for one fighter.', pay: 300, check: c => c.owned.trialLines >= 1 },
    { id: 'a_trialsAll', name: 'Professor', desc: 'Clear every combo trial for every fighter.', pay: 2000, check: c => c.owned.trialLines >= KB.LINE_ORDER.length },
  ];

  /* -------------------------------------------------------- the counters */
  const blank = k => ({ k, cardWins: {} });
  function load() {
    const S = Auth.S; if (!S) return null;
    const q = S.quests || (S.quests = { life: blank('life'), day: blank(dayKey()), week: blank(weekKey()), claimed: { first: {}, chain: {}, fighter: {} }, awards: {} });
    if (S.tickets == null) S.tickets = 0;
    if (q.day.k !== dayKey()) { q.day = blank(dayKey()); q.day.claimed = {}; }
    if (q.week.k !== weekKey()) { q.week = blank(weekKey()); q.week.claimed = {}; }
    q.day.claimed = q.day.claimed || {}; q.week.claimed = q.week.claimed || {};
    if (q.life.lastDay !== q.day.k) { q.life.lastDay = q.day.k; q.life.days = (q.life.days || 0) + 1; }
    return q;
  }
  /* what is read live rather than counted */
  const owned = () => {
    const T = Auth.S.trials || {}, lists = window.Trials ? Trials.all() : null;
    return { parts: Inv.count(), mixedBuilds: (Auth.S.builds || []).filter(b => b.armR.line !== b.armL.line).length,
      trials: Object.values(T).reduce((n, o) => n + Object.keys(o).length, 0), trialLines: lists ? KB.LINE_ORDER.filter(l => Object.keys(T[l] || {}).length >= lists[l].length).length : 0 };
  };
  const ctx = q => ({ life: q.life, day: q.day, week: q.week, owned: owned() });
  /* add counts (n), best-ever numbers (best) and per-line wins (cardWin) to all three scopes */
  function add(n, best, cardWin) {
    const q = load(); if (!q) return;
    for (const bag of [q.life, q.day, q.week]) {
      for (const k in n || {}) if (n[k]) bag[k] = (bag[k] || 0) + n[k];
      for (const k in best || {}) bag[k] = Math.max(bag[k] || 0, best[k]);
      if (cardWin) bag.cardWins[cardWin] = (bag.cardWins[cardWin] || 0) + 1;
    }
  }
  const valueOf = (it, c, scope) => it.value ? it.value(c) : (c[scope][it.stat] || 0);

  /* ------------------------------------------------------------- paying */
  function pay(p) {
    const S = Auth.S, got = [];
    if (p.tokens) { S.tokens += p.tokens; got.push('+' + U.fmt(p.tokens) + ' TOKENS'); }
    if (p.tickets) { S.tickets += p.tickets; got.push('+' + p.tickets + ' CAPSULE TICKET' + (p.tickets > 1 ? 'S' : '')); }
    if (p.part) {
      const [line, r] = p.part, slot = U.pick(KB.SLOTS), res = Inv.add(line, slot, r);
      got.push(KB.RARITY[r].name + ' ' + NAME(line) + ' ' + KB.SLOT_NAME[slot] + (res.isNew ? ' (NEW)' : res.lvUp ? ' (+1 LEVEL)' : ''));
    }
    return got.join(' · ');
  }
  const scaled = (p, w) => Object.assign({}, p, { tokens: Math.round(p.tokens * w / 10) * 10 });
  const say = (text, cls) => { if (Menu.toast) Menu.toast(text, cls); };
  /* awards unlock and pay at once */
  function checkAwards(F) {
    const q = load(); if (!q) return [];
    const c = ctx(q), got = [];
    for (const a of AWARDS) {
      if (q.awards[a.id]) continue;
      if (a.check(c, F)) { q.awards[a.id] = Date.now(); if (a.pay) Auth.S.tokens += a.pay; got.push(a); }
    }
    return got;
  }

  /* every item on every board, with its progress and state */
  function items() {
    const q = load(); if (!q) return null;
    const c = ctx(q), out = { daily: [], weekly: [], fighters: [], milestones: [], awards: [] };
    for (const it of DAILY) { const v = valueOf(it, c, 'day'); out.daily.push({ it, v, goal: it.goal, pay: it.pay, claimed: !!q.day.claimed[it.id], key: 'd:' + it.id }); }
    for (const it of WEEKLY) { const v = valueOf(it, c, 'week'); out.weekly.push({ it, v, goal: it.goal, pay: it.pay, claimed: !!q.week.claimed[it.id], key: 'w:' + it.id }); }
    for (const line of KB.LINE_ORDER) {
      const t = q.claimed.fighter[line] || 0, v = q.life.cardWins[line] || 0, i = Math.min(t, FIGHTER_TIERS.length - 1);
      out.fighters.push({ line, it: { id: 'm_' + line, name: NAME(line) + ' mastery' + (t < FIGHTER_TIERS.length ? ' ' + ROMAN[t] : ''), desc: 'Win ' + FIGHTER_TIERS[i] + ' fights with a ' + NAME(line) + ' Legend Card.' }, v, goal: FIGHTER_TIERS[i], pay: fighterPay(line, i), claimed: t >= FIGHTER_TIERS.length, tier: t, key: 'm:' + line });
    }
    for (const it of FIRST) { const v = valueOf(it, c, 'life'); out.milestones.push({ it, v, goal: it.goal, pay: it.pay, claimed: !!q.claimed.first[it.id], key: 'f:' + it.id, cat: 'first' }); }
    for (const ch of CHAINS) {
      const t = q.claimed.chain[ch.id] || 0, i = Math.min(t, ch.tiers.length - 1), v = ch.value(c);
      out.milestones.push({ it: { id: ch.id, name: ch.name + ' ' + ROMAN[i], desc: ch.desc.replace('{n}', U.fmt(ch.tiers[i])) }, v, goal: ch.tiers[i], pay: scaled(TIER_PAY[i], ch.weight), claimed: t >= ch.tiers.length, tier: t, of: ch.tiers.length, key: 'c:' + ch.id, cat: ch.cat });
    }
    for (const a of AWARDS) out.awards.push({ it: a, earned: q.awards[a.id] || 0 });
    for (const k of ['daily', 'weekly', 'fighters', 'milestones']) for (const r of out[k]) r.ready = !r.claimed && r.v >= r.goal;
    return out;
  }
  /* claim one (by key) */
  function claim(key) {
    const q = load(); if (!q) return null;
    const [kind, id] = key.split(':'), all = items();
    const row = [...all.daily, ...all.weekly, ...all.fighters, ...all.milestones].find(r => r.key === key);
    if (!row || !row.ready) return null;
    if (kind === 'd') { q.day.claimed[id] = 1; add({ dailyClaims: 1 }); }
    else if (kind === 'w') q.week.claimed[id] = 1;
    else if (kind === 'm') q.claimed.fighter[id] = (q.claimed.fighter[id] || 0) + 1;
    else if (kind === 'f') q.claimed.first[id] = 1;
    else if (kind === 'c') q.claimed.chain[id] = (q.claimed.chain[id] || 0) + 1;
    const got = pay(row.pay);
    checkAwards(); Auth.save();
    return got;
  }

  /* ---------------------------------------------------- watching a fight */
  const Rewards = { DAILY, WEEKLY, FIRST, CHAINS, AWARDS, featured };
  Rewards.watch = (m, opts) => {
    if (!Auth.S || opts.tutorial || !['cpu', 'arcade', 'versus', 'online'].includes(opts.mode)) return;
    const me = m.fighters[opts.mode === 'online' ? opts.local : 0];
    const F = { bounces: 0, wallBreaks: 0, ringouts: 0, otgs: 0, extends: 0, throws: 0, bursts: 0, arts: 0, partBreaks: 0, steals: 0, hybrids: 0, bestCombo: 0, maxBounces: 0, perfect: false, comeback: false, doubleExt: false, throwKO: false, artKO: false, hitThisRound: false, flushed: false };
    m.on((k, d) => {
      if (k === 'hit') {
        if (d.att === me && d.r === 'hit') { F.bestCombo = Math.max(F.bestCombo, d.vic.combo.hits); F.maxBounces = Math.max(F.maxBounces, d.vic.combo.bounces); if (d.mv && d.mv.hybrid && !d.o.multiHit) F.hybrids++; }
        if (d.vic === me && (d.r === 'hit' || d.r === 'ko')) F.hitThisRound = true;
      }
      else if (k === 'bounce' && d.by === me) F.bounces++;
      else if (k === 'wallbreak' && d.vic && d.vic.combo.by === me) F.wallBreaks++;
      else if (k === 'ringout' && d.by === me) F.ringouts++;
      else if (k === 'otg' && d.att === me) F.otgs++;
      else if (k === 'extend' && d.att === me) { F.extends++; if (d.n >= 2) F.doubleExt = true; }
      else if (k === 'throw' && d.f === me) F.throws++;
      else if (k === 'burst' && d.f === me) F.bursts++;
      else if (k === 'art' && d.f === me) F.arts++;
      else if (k === 'partbreak' && d.att === me) F.partBreaks++;
      else if (k === 'steal' && d.f === me) F.steals++;
      else if (k === 'ko') {
        if (d.att === me) {
          if (!F.hitThisRound) F.perfect = true;
          if (me.hp < me.maxHp * 0.1) F.comeback = true;
          if (d.mv && d.mv.type === 'super') F.artKO = true;
          if (d.mv && /^throw[FBUD]$/.test(d.mv.id)) F.throwKO = true;
        }
        F.hitThisRound = false;
      }
    });
    m.rewardsF = F;
    // quitting part-way still counts what was done
    const d0 = m.dispose; m.dispose = () => { flush(F, null, opts); d0(); };
  };
  function flush(F, res, opts) {
    if (!F || F.flushed || !Auth.S) return [];
    F.flushed = true;
    const n = { bounces: F.bounces, wallBreaks: F.wallBreaks, ringouts: F.ringouts, otgs: F.otgs, extends: F.extends, throws: F.throws, bursts: F.bursts, arts: F.arts, partBreaks: F.partBreaks, steals: F.steals, hybrids: F.hybrids };
    let card = null;
    if (res) {
      const meI = opts.mode === 'online' ? opts.local : 0, win = res.winner === meI, b = opts.builds[meI], lines = KB.SLOTS.map(s => b[s].line);
      F.won = win;
      Object.assign(n, { fights: 1, wins: win ? 1 : 0, versus: opts.mode === 'versus' ? 1 : 0, online: opts.mode === 'online' ? 1 : 0, onlineWins: opts.mode === 'online' && win ? 1 : 0 });
      if (win && opts.mode !== 'versus') {
        if ((opts.lvl || 0) >= 3) n.champWins = 1;
        if (lines.includes(featured())) n.featWins = 1;
        if (b.armR.line !== b.armL.line) n.mixedWins = 1;
        if (KB.stats(b).set === 2) n.mintWins = 1;
        if (opts.mode === 'arcade') n.arcadeStages = 1;   // (a clear is counted at the ending: arcade.js)
        card = b.card.line;
      }
    }
    add(n, { bestCombo: F.bestCombo }, card);
    const got = checkAwards(F);
    Auth.save();
    return got;
  }
  /* the fight is over (Menu.results): what it added, and the awards it unlocked */
  Rewards.fightDone = (res, opts) => { const m = App.view; return flush(m && m.rewardsF, res, opts); };
  /* capsules, the tutorial: counts from outside a fight */
  Rewards.record = (n, best) => { if (!Auth.S) return []; add(n, best); const got = checkAwards(); Auth.save(); for (const a of got) say('AWARD · ' + a.name + (a.pay ? '  +' + a.pay : ''), 'gold'); return got; };
  /* how many rewards are waiting to be claimed */
  Rewards.ready = () => { const all = items(); if (!all) return 0; return [...all.daily, ...all.weekly, ...all.fighters, ...all.milestones].filter(r => r.ready).length; };

  /* ------------------------------------------------------------ the screen */
  const TABS = [['daily', 'DAILY'], ['weekly', 'WEEKLY'], ['fighters', 'FIGHTERS'], ['milestones', 'MILESTONES'], ['awards', 'AWARDS']];
  const chips = p => el('span', { class: 'rwpay' },
    p.tokens ? el('span', { class: 'chip tok' }, el('i', { class: 'coin' }), U.fmt(p.tokens)) : null,
    p.tickets ? el('span', { class: 'chip tix' }, '🎟 ' + p.tickets) : null,
    p.part ? el('span', { class: 'chip part', style: { '--rc': KB.RARITY[p.part[1]].css } }, KB.RARITY[p.part[1]].short + ' ' + NAME(p.part[0]) + ' PART') : null);
  Rewards.screen = tab => {
    const all = items(); if (!all) return;
    tab = tab || Rewards._tab || 'daily'; Rewards._tab = tab;
    const { btn, topbar } = Menu.ui, R = resets();
    const cnt = k => all[k] && all[k].filter ? all[k].filter(r => r.ready).length : 0;
    const row = r => el('div', { class: 'rwrow' + (r.ready ? ' ready' : '') + (r.claimed ? ' done' : '') },
      r.line ? el('img', { class: 'rwfig', src: Models.figIcon(KB.mintBuild(r.line, 0)), alt: '' }) : null,
      el('div', { class: 'rwtxt' },
        el('b', null, r.it.name),
        el('span', null, typeof r.it.desc === 'function' ? r.it.desc() : r.it.desc),
        r.claimed ? null : el('div', { class: 'rwbar' }, el('i', { style: { width: Math.min(100, 100 * r.v / r.goal) + '%' } }), el('small', null, U.fmt(Math.min(r.v, r.goal)) + ' / ' + U.fmt(r.goal)))),
      r.claimed ? el('span', { class: 'rwdone' }, r.of || r.line ? 'ALL TIERS ✓' : 'CLAIMED ✓') : chips(r.pay),
      r.claimed ? null : btn(r.ready ? 'CLAIM' : '—', () => { if (!r.ready) return; const got = claim(r.key); if (got) { SFX.play('coin'); say(got, 'gold'); } Rewards.screen(tab); }, r.ready ? 'small claim' : 'ghost small off'));
    let body;
    if (tab === 'awards') {
      const got = all.awards.filter(a => a.earned).length;
      body = [el('p', { class: 'note' }, got + ' / ' + all.awards.length + ' awards. Each pays the moment you earn it.'),
        ...all.awards.map(a => el('div', { class: 'rwrow award' + (a.earned ? ' done' : '') }, el('span', { class: 'medal' }, a.earned ? '★' : '☆'),
          el('div', { class: 'rwtxt' }, el('b', null, a.it.name), el('span', null, a.it.desc)),
          a.it.pay ? el('span', { class: 'rwpay' }, el('span', { class: 'chip tok' }, el('i', { class: 'coin' }), a.it.pay)) : null,
          el('span', { class: 'rwdone' }, a.earned ? new Date(a.earned).toLocaleDateString() : '')))];
    } else {
      const list = all[tab].filter(r => tab !== 'fighters' || KB.themeOf(r.line) === Menu.theme()).sort((a, b) => (b.ready - a.ready) || (a.claimed - b.claimed));
      const head = tab === 'daily' ? 'New jobs in ' + left(R.day) + ' · today\'s featured figure: ' + NAME(featured())
        : tab === 'weekly' ? 'New goals in ' + left(R.week)
          : tab === 'fighters' ? 'Win with a line\'s Legend Card to climb its track. Tiers III and V pay one of its parts.'
            : 'Your first steps, then tiered goals: each tier pays more.';
      body = [el('p', { class: 'note' }, head), tab === 'fighters' ? Menu.themeTabs(() => Rewards.screen(tab)) : null, ...list.map(row)];
    }
    const total = cnt('daily') + cnt('weekly') + cnt('fighters') + cnt('milestones');
    App.screen(el('div', { class: 'screen rewards' }, topbar('REWARDS', () => Menu.hub()),
      el('div', { class: 'panel rwpanel' },
        el('div', { class: 'tabs rwtabs' }, ...TABS.map(([k, t]) => el('button', { class: k === tab ? 'on' : '', onclick: () => { SFX.play('ui'); Rewards.screen(k); } }, t, cnt(k) ? el('em', { class: 'badge' }, cnt(k)) : null))),
        el('div', { class: 'rwhead' }, el('span', null, el('i', { class: 'coin' }), U.fmt(Auth.S.tokens), '  ·  🎟 ', String(Auth.S.tickets), ' capsule ticket' + (Auth.S.tickets === 1 ? '' : 's'),
            Auth.S.selTickets > 0 ? el('button', { class: 'chip seltix', onclick: () => { SFX.play('ok'); Menu.selection(); } }, '🎫 ' + Auth.S.selTickets + ' SELECTION TICKET' + (Auth.S.selTickets > 1 ? 'S' : '') + ' ▸') : null),
          total ? btn('CLAIM ALL (' + total + ')', () => { let n = 0; for (const r of [...items().daily, ...items().weekly, ...items().fighters, ...items().milestones]) if (r.ready && claim(r.key)) n++; if (n) { SFX.play('coin'); say('Claimed ' + n + ' reward' + (n > 1 ? 's' : ''), 'gold'); } Rewards.screen(tab); }, 'small claim') : null),
        el('div', { class: 'rwlist' }, ...body))));
  };
  /* ---------------------------------------------------- selection tickets
     A Selection Ticket picks any fighter you don't have yet (Menu.selection): its whole Standard set. Each source pays
     one ticket, once ever (S.selGot remembers which): your first Arcade clear, also for a collector who cleared it
     before tickets existed (selBackfill, at log-in) */
  Rewards.selGrant = src => {
    const S = Auth.S; if (!S) return false;
    S.selGot = S.selGot || {}; if (S.selGot[src]) return false;
    S.selGot[src] = Date.now(); S.selTickets = (S.selTickets | 0) + 1; Auth.save(); return true;
  };
  Rewards.selBackfill = () => !!(Auth.S && Auth.S.records && Auth.S.records.arcadeClears >= 1) && Rewards.selGrant('arcade');
  Rewards.items = items; Rewards.claim = claim;
  window.Rewards = Rewards;
})();
