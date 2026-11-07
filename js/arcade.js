/* ============================================================================
   arcade.js -- ARCADE: THE TOP SHELF (the script is in story.js).

   Your figure's story, told the way a fighting game's arcade tells one:
     the PROLOGUE (why your fighter climbs), then seven fights up the
     bookcase -- the toy chest, the study desk, the playroom shelf -- each
     opened by a short scene (their taunt, your answer), a VS screen, and
     after it a RANK (S to D) and your win quote.
       stage 4  your RIVAL, who knows a piece of what you lost
       stage 7  THE SOVEREIGN, gold-edition keeper of the Case (a boss:
                more HP and defence)
     then the NORMAL ENDING... unless you climbed well: no continues and
     no more than two rounds lost. Then the Case opens, and PROTO-0, the
     first figure ever cast, steps out: a TRUE FINAL BOSS that re-casts
     its body every round (a mix of every line, then your rival, then YOU),
     and beating it gives the TRUE ENDING.
   Lose and it's CONTINUE? with a countdown (a continue, a restart or a quit
   closes the hidden route for the run). A run is saved as you go: leave and
   pick it up later. Four difficulties, a best score for each, and every
   ending you've seen is kept in STORIES to watch again.

     Arcade.open()  Arcade.results(res, opts) (from Menu.results)
     Arcade.restarted() (a restart or a quit mid-fight)  Arcade.gallery()
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const S = () => Auth.S;
  const LN = l => KB.LINES[l];
  const btn = (...a) => Menu.ui.btn(...a), topbar = (...a) => Menu.ui.topbar(...a);

  /* the CPU's level for stages 1..7 and PROTO-0; tokens and score multipliers; the bosses' extra HP */
  const DIFFS = [
    { id: 'easy', name: 'EASY', lv: [0, 0, 0, 1, 1, 1, 1, 2], pay: 0.6, score: 0.8, boss: 1.15, sub: 'A gentle climb. Learn the story.' },
    { id: 'normal', name: 'NORMAL', lv: [0, 1, 1, 2, 2, 2, 2, 3], pay: 1, score: 1, boss: 1.3, sub: 'The climb as it was meant to be.' },
    { id: 'hard', name: 'HARD', lv: [1, 2, 2, 3, 2, 3, 3, 3], pay: 1.5, score: 1.25, boss: 1.45, sub: 'Veterans and Champions all the way up.' },
    { id: 'legend', name: 'LEGEND', lv: [2, 3, 3, 3, 3, 3, 3, 3], pay: 2, score: 1.5, boss: 1.6, sub: 'Every CPU a Champion, hitting harder.' },
  ];
  const RAR = [0, 1, 1, 2, 2, 3];                                            // stages 1..6 (4 is the rival)
  // up through the house: each stage draws its arena from a pool (once per run, from the run's seed); the bosses wait on the top shelf
  const ARENA = [['chest', 'trainset', 'aquarium'], ['fridge', 'windowsill', 'candy', 'kitchen'], ['desk', 'bathtub', 'chess', 'speedway'], ['clock', 'vinyl', 'neon', 'pinball'],
    ['snowglobe', 'dino', 'desk', 'chest'], ['volcano', 'moonbase', 'shelf'], ['shelf'], ['shelf']];
  const arenaOf = (run, i) => { const P = ARENA[i].filter(a => Arena.THEMES[a]); return P[Math.floor(rng((run.seed >>> 0) + 7919 * (i + 1))() * P.length)] || 'shelf'; };
  const PAY = [60, 80, 100, 160, 140, 180, 300, 600];
  const PROTO_PAINT = Models.PAINTS.findIndex(p => p.proto);
  const PTS = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const BOSS_WIN = { sov: ["The Case is earned. You have not earned it.", "Back to the bottom shelf. Climb again, if you dare."],
    proto: ["YOU ARE MINE NOW. LIKE EVERYTHING ELSE.", "ONE MORE PIECE FOR THE COLLECTION."] };

  /* a small seeded shuffle: a run's opponents and PROTO-0's first body stay the same when you come back to it */
  const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
  const shuffled = (arr, seed) => { const a = arr.slice(), r = rng(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* the bosses */
  const SOV = () => { const L = { head: 'paladin', core: 'knight', armR: 'samurai', armL: 'knight', legs: 'dragoon', card: 'paladin' }, b = { name: 'The Sovereign' }; for (const s of KB.SLOTS) b[s] = { line: L[s], r: 2, lv: 0 }; return b; };
  const protoOf = b => { const o = { name: 'PROTO-0', paint: PROTO_PAINT }; for (const s of KB.SLOTS) o[s] = { line: b[s].line, r: 0, lv: 0 }; return o; };
  const protoMix = seed => { const ls = shuffled(KB.LINE_ORDER, seed + 99), b = { name: 'PROTO-0', paint: PROTO_PAINT }; KB.SLOTS.forEach((s, i) => { b[s] = { line: ls[i], r: 0, lv: 0 }; }); return b; };
  const SOVP = { name: 'THE SOVEREIGN', build: SOV(), css: '#ffd040' };

  /* ------------------------------------------------------------- the save */
  const A = () => { const s = S(); return s.arcade || (s.arcade = { run: null, best: {}, ends: {}, clears: 0 }); };
  const save = () => Auth.save();
  const storyLine = b => b.card.line;
  const mine = () => Object.assign({}, Menu.activeBuild(), { paint: Menu.myPaint() });
  function newRun(diff) {
    const b = mine(), line = storyLine(b), rival = Story.RIVAL[line], seed = (Math.random() * 1e9) | 0;
    const order = shuffled(KB.LINE_ORDER.filter(l => l !== line && l !== rival), seed).slice(0, 5);
    return { line, rival, diff, seed, order, build: b, stage: 0, score: 0, lost: 0, conts: 0, ranks: [], tokens: 0, time: 0, proto: false, t0: Date.now() };
  }
  /* the hidden route is open while you've never continued and lost two rounds at most */
  const trueOpen = run => run.conts === 0 && run.lost <= 2;

  /* stage i of a run: who, how strong, where */
  function stageOf(run, i) {
    const D = DIFFS[run.diff], lvl = D.lv[i], hard = run.diff === 3 ? { dmg: 1.1 } : null;
    if (i === 7) {
      const r1 = protoMix(run.seed);
      return { i, kind: 'proto', tag: 'TRUE FINAL BOSS', name: 'PROTO-0', line: null, css: '#c8c8d0', build: r1, lvl, arena: 'shelf', mods: { hp: D.boss, dmg: 1.1, def: 0.03 },
        recast: [r1, protoOf(KB.mintBuild(run.rival, 0)), protoOf(run.build)] };
    }
    if (i === 6) return { i, kind: 'sov', tag: 'FINAL BOSS', name: 'The Sovereign', line: null, css: '#ffd040', build: SOV(), lvl, arena: 'shelf', mods: Object.assign({ hp: D.boss, def: 0.02 }, hard) };
    if (i === 3) { const b = KB.mintBuild(run.rival, 2); return { i, kind: 'rival', tag: 'RIVAL', name: b.name, line: run.rival, css: LN(run.rival).css, build: b, lvl, arena: Arena.home(run.rival) || arenaOf(run, i), mods: hard }; }
    const line = run.order[i < 3 ? i : i - 1], r = RAR[i], b = KB.mintBuild(line, r);
    if (r === 3) b.name = 'CHASE ' + LN(line).figure;
    return { i, kind: 'fight', tag: 'STAGE ' + (i + 1), name: b.name, line, css: LN(line).css, build: b, lvl, arena: Arena.home(line) || arenaOf(run, i), mods: hard };   // (on their own playset)
  }
  const youOf = run => ({ name: LN(run.line).figure, build: run.build, css: LN(run.line).css });
  const ctxOf = (run, st) => ({ you: youOf(run), opp: st ? { name: st.name, build: st.build, css: st.css } : null,
    proto: { name: 'PROTO-0', build: protoMix(run.seed), css: '#c8c8d0' } });

  /* ------------------------------------------------------- a story scene
     Two portraits and a text box; the one speaking is lit, the text types itself out. Click, a key or a pad button:
     the whole line, then the next. SKIP ends the scene */
  function talk(scene, ctx, done) {
    if (!scene || !scene.length) { done(); return; }
    App.setView(null); Music.play('menu');
    const who = sp => sp === 'you' ? ctx.you : sp === 'opp' ? ctx.opp : sp === 'sov' ? SOVP : sp === 'proto' ? ctx.proto : sp === 'nar' ? null
      : { name: LN(sp).figure, build: KB.mintBuild(sp, 0), css: LN(sp).css };
    const L = el('img', { class: 'tk-por l', alt: '' }), R = el('img', { class: 'tk-por r', alt: '' });
    const name = el('div', { class: 'tk-name' }), text = el('div', { class: 'tk-text' });
    const box = el('div', { class: 'tk-box' }, name, text, el('i', { class: 'tk-more' }, '▼'));
    let i = -1, typing = null, right = ctx.opp, ended = false;
    const finish = () => { if (ended) return; ended = true; clearInterval(typing); off(); done(); };
    const scr = el('div', { class: 'screen talk' }, el('div', { class: 'tk-bg' }), L, R, box, btn('SKIP ▸▸', () => finish(), 'ghost small tk-skip'));
    L.src = Models.figIcon(ctx.you.build, true);
    const show = () => {
      const [sp, t] = scene[i], P = who(sp);
      if (P && sp !== 'you') right = P;
      R.hidden = !right; if (right) R.src = Models.figIcon(right.build, true);
      L.classList.toggle('on', sp === 'you'); R.classList.toggle('on', !!P && sp !== 'you');
      box.className = 'tk-box ' + (sp === 'nar' ? 'nar' : sp === 'you' ? 'l' : 'r');
      name.textContent = P ? P.name : ''; box.style.setProperty('--sc', P ? P.css : '#9aa4b2');
      scr.style.setProperty('--lc1', ctx.you.css); scr.style.setProperty('--lc2', right ? right.css : '#3a3550');
      let n = 0; text.textContent = ''; clearInterval(typing);
      typing = setInterval(() => { n += 2; text.textContent = t.slice(0, n); if (n >= t.length) { clearInterval(typing); typing = null; } }, 16);
    };
    const adv = () => {
      if (ended) return;
      if (typing) { clearInterval(typing); typing = null; text.textContent = scene[i][1]; return; }
      i++; if (i >= scene.length) { finish(); return; }
      SFX.play('ui'); show();
    };
    scr.addEventListener('pointerdown', e => { if (e.target.closest('.tk-skip')) return; adv(); });
    App.screen(scr); const off = Input.onAny(adv); adv();
  }

  /* -------------------------------------------------------- the VS screen */
  function vs(run, st, done) {
    App.setView(null);
    const D = DIFFS[run.diff], open = trueOpen(run) && st.i < 7 && !run.proto;
    const scr = el('div', { class: 'screen vs vs-' + st.kind, style: { '--lc1': LN(run.line).css, '--lc2': st.css } },
      el('div', { class: 'vs-side l' }, el('img', { src: Models.figIcon(run.build, true), alt: '' }), el('b', null, LN(run.line).figure), el('small', null, run.build.name !== LN(run.line).figure ? run.build.name : LN(run.line).name)),
      el('div', { class: 'vs-mid' }, el('small', null, st.tag), el('b', null, 'VS'), el('span', null, Arena.THEMES[st.arena].name),
        el('em', null, D.name + ' · ' + AI.LEVELS[st.lvl]), open ? el('i', { class: 'vs-case' }, '✦ THE CASE IS WATCHING · rounds lost ' + run.lost + ' / 2') : null),
      el('div', { class: 'vs-side r' }, el('img', { src: Models.figIcon(st.build, true), alt: '' }), el('b', null, st.name), el('small', null, st.kind === 'fight' ? LN(st.line).name : st.tag)));
    App.screen(scr); SFX.play('reveal', { r: st.kind === 'fight' ? 1 : 3 });
    let gone = false;
    const go = () => { if (gone) return; gone = true; off(); clearTimeout(t); done(); };
    const t = setTimeout(go, 2800), off = Input.onAny(go); scr.addEventListener('pointerdown', go);
  }

  function fight(run, st) {
    App.startMatch({ mode: 'arcade', builds: [run.build, st.build], cpu: [null, st.lvl], arena: st.arena, wins: 2, bonus: true, lvl: st.lvl, stage: st.i, arcKind: st.kind,
      mods: [null, st.mods || null], recast: st.recast || null,
      recastCall: st.recast ? (round, b) => round >= 3 ? 'IT BECOMES YOU' : 'RE-CAST: ' + LN(b.core.line).name : null });
  }

  /* where the run goes next: the next stage's scene, VS and fight; after the Sovereign, the Case (or the ending) */
  function advance(run) {
    if (run.stage >= 8) return ending(run, 'true');
    if (run.stage === 7 && !run.proto) {
      if (!trueOpen(run)) return ending(run, 'normal');
      run.proto = true; save();
      const P = stageOf(run, 7);
      return talk(Story.twist(run.line), ctxOf(run, P), () => vs(run, P, () => fight(run, P)));
    }
    const st = stageOf(run, run.stage);
    const scene = st.kind === 'rival' ? Story.rival(run.line) : st.kind === 'sov' ? Story.sovereign(run.line) : st.kind === 'proto' ? Story.twist(run.line).slice(-2)
      : Story.prefight(run.line, st.line, run.seed + st.i * 7);
    talk(scene, ctxOf(run, st), () => vs(run, st, () => fight(run, st)));
  }

  /* ------------------------------------------------------------- ranking
     a won fight: victory, speed, HP kept, style (combo, bounces, wall breaks), minus rounds lost; the RANK is read
     before the difficulty multiplier, the SCORE after it (the bosses add a bonus) */
  function scoreOf(res, st, D) {
    const me = res.records[0], them = res.records[1], lost = res.wins[1], t = res.time || 90;
    const lines = [['VICTORY', 10000], ['SPEED', Math.max(0, Math.round(6000 - t * 40))], ['VITALITY', Math.max(0, Math.round(8000 - them.dmg * 4))],
      ['COMBO ×' + me.maxCombo, me.maxCombo * 150], ['BOUNCES ×' + me.maxBounces, me.maxBounces * 400], ['WALL BREAKS ×' + me.breaks, me.breaks * 800],
      ['PERFECT', !lost && !them.dmg ? 3000 : 0], ['ROUNDS LOST ×' + lost, -3000 * lost]];
    const raw = lines.reduce((n, [, v]) => n + v, 0);
    const rank = raw >= 26000 ? 'S' : raw >= 20000 ? 'A' : raw >= 14000 ? 'B' : raw >= 9000 ? 'C' : 'D';
    const bonus = st.kind === 'sov' ? 5000 : st.kind === 'proto' ? 10000 : st.kind === 'rival' ? 2000 : 0;
    if (bonus) lines.push([st.kind === 'rival' ? 'RIVAL' : 'BOSS', bonus]);
    if (D.score !== 1) lines.push(['× ' + D.name, Math.round((raw + bonus) * (D.score - 1))]);
    return { lines, rank, total: Math.max(0, Math.round((raw + bonus) * D.score)) };
  }
  const runRank = run => { if (!run.ranks.length) return 'D'; const v = run.ranks.reduce((n, r) => n + PTS[r], 0) / run.ranks.length - run.conts * 0.5; return v >= 4.6 ? 'S' : v >= 3.8 ? 'A' : v >= 2.8 ? 'B' : v >= 1.8 ? 'C' : 'D'; };
  const clock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const quoteEl = (who, css, q) => el('blockquote', { class: 'ar-quote', style: { '--lc': css } }, el('b', null, who), '“' + q + '”');

  /* ------------------------------------------------------- after a fight */
  const Arcade = { DIFFS };
  Arcade.results = (res, opts) => {
    const run = A().run;
    if (!run || run.stage !== opts.stage) { App.setView(null); Arcade.open(); return; }
    const st = stageOf(run, opts.stage), D = DIFFS[run.diff], win = res.winner === 0;
    const reward = win ? Math.round(PAY[st.i] * D.pay) : 20;
    Auth.record(res, 'arcade', reward);
    const awards = Rewards.fightDone(res, opts);
    run.lost += res.wins[1]; run.time += res.time || 0; run.tokens += reward;
    const awardEls = awards.map(a => el('div', { class: 'reward gold' }, '★ AWARD: ' + a.name + (a.pay ? '  +' + a.pay : '')));
    if (!win) { save(); return cont(run, st, res, reward, awardEls); }
    const sc = scoreOf(res, st, D); run.score += sc.total; run.ranks.push(sc.rank); run.stage++; save();
    const last = st.kind === 'proto' || (st.kind === 'sov' && !trueOpen(run));
    App.screen(el('div', { class: 'screen results arcres' },
      el('div', { class: 'panel resp win arcresp' },
        el('small', { class: 'ar-tag' }, st.tag + ' · CLEAR'),
        el('div', { class: 'ar-head' }, el('div', { class: 'ar-rank rk-' + sc.rank }, sc.rank),
          el('div', { class: 'ar-lines' }, ...sc.lines.filter(([, v]) => v).map(([k, v]) => el('div', null, el('span', null, k), el('b', { class: v < 0 ? 'neg' : '' }, (v > 0 ? '+' : '') + U.fmt(v)))))),
        el('div', { class: 'ar-total' }, 'STAGE ', el('b', null, U.fmt(sc.total)), '   ·   RUN ', el('b', null, U.fmt(run.score))),
        quoteEl(LN(run.line).figure, LN(run.line).css, Story.win(run.line, run.seed + st.i)),
        el('div', { class: 'reward' }, el('i', { class: 'coin' }), '+' + reward + ' TOKENS'), ...awardEls,
        el('div', { class: 'row' }, btn(last ? 'THE ENDING ▸' : st.kind === 'sov' ? 'THE CASE... ▸' : 'NEXT STAGE ▸', () => advance(run), 'big fight'),
          last ? null : btn('SAVE & QUIT', () => Arcade.open(), 'ghost')))));
  };

  /* lost: CONTINUE? and a countdown */
  function cont(run, st, res, reward, awardEls) {
    let n = 9, done = false;
    const num = el('b', { class: 'ct-num' }, String(n));
    const q = st.kind === 'fight' || st.kind === 'rival' ? Story.win(st.line, run.seed + run.lost) : BOSS_WIN[st.kind][run.lost % 2];
    const stop = () => { done = true; clearInterval(tick); };
    const yes = () => { if (done) return; stop(); run.conts++; save(); vs(run, st, () => fight(run, st)); };
    const no = () => { if (done) return; stop(); gameOver(run); };
    App.screen(el('div', { class: 'screen results arccont' },
      el('div', { class: 'panel resp lose arcresp' },
        el('h1', null, 'YOU LOSE'), el('div', { class: 'score' }, res.wins[0] + ' — ' + res.wins[1]),
        quoteEl(st.name, st.css, q),
        el('div', { class: 'ct' }, el('small', null, 'CONTINUE?'), num),
        run.conts === 0 && !run.proto ? el('p', { class: 'note' }, 'A continue closes the Case\'s secret for this run.') : null,
        el('div', { class: 'reward' }, el('i', { class: 'coin' }), '+' + reward + ' TOKENS'), ...awardEls,
        el('div', { class: 'row' }, btn('CONTINUE', yes, 'big fight'), btn('GIVE UP', no, 'ghost')))));
    const tick = setInterval(() => { if (!document.body.contains(num)) { stop(); return; } n--; num.textContent = String(n); SFX.play(n > 0 ? 'ui' : 'back'); if (n <= 0) no(); }, 1000);
  }
  /* a restart or a quit in the middle of a fight costs a continue */
  Arcade.restarted = () => { const r = A().run; if (r) { r.conts++; save(); } };

  function bestOf(run) { const a = A(), k = DIFFS[run.diff].id, prev = a.best[k] || 0; if (run.score > prev) { a.best[k] = run.score; return true; } return false; }
  function gameOver(run) { const nb = bestOf(run); A().run = null; save(); summary(run, 'over', [], nb); }

  /* the ending: its scene, then the rewards */
  function ending(run, kind) {
    Music.play('title');
    const scene = kind === 'true' ? Story.trueEnd(run.line) : Story.normal(run.line);
    talk(scene, ctxOf(run, kind === 'true' ? stageOf(run, 7) : null), () => finish(run, kind));
  }
  function finish(run, kind) {
    const a = A(), D = DIFFS[run.diff], Sv = S(), got = [];
    const pay = Math.round((kind === 'true' ? 1200 : 600) * D.pay); Sv.tokens += pay; run.tokens += pay; got.push((kind === 'true' ? 'TRUE ' : '') + 'ARCADE CLEAR  +' + U.fmt(pay) + ' TOKENS');
    const e = a.ends[run.line] || (a.ends[run.line] = {});
    if (!e[kind]) {
      e[kind] = Date.now();
      if (kind === 'normal') { Sv.tokens += 500; got.push('First NORMAL ENDING for ' + LN(run.line).figure + '  +500 TOKENS'); }
      else { Sv.tokens += 1000; Sv.tickets = (Sv.tickets | 0) + 1; got.push('First TRUE ENDING for ' + LN(run.line).figure + '  +1,000 TOKENS · +1 CAPSULE TICKET'); }
    }
    a.clears = (a.clears | 0) + 1; Sv.records.arcadeClears++;
    const sel = Rewards.selGrant('arcade');
    const fig = !sel && kind !== 'over' ? Rewards.dailyFigure() : null;   // (after the first clear: a random fighter you don't have, once a day)
    const nb = bestOf(run); a.run = null; Auth.save();
    Rewards.record({ arcadeClears: 1 });
    summary(run, kind, got, nb, sel, fig);
  }
  function summary(run, kind, got, newBest, sel, fig) {
    App.setView(null);
    const D = DIFFS[run.diff], rank = runRank(run), title = kind === 'true' ? 'TRUE ENDING' : kind === 'normal' ? 'NORMAL ENDING' : 'GAME OVER';
    const stat = (k, v) => el('div', null, el('small', null, k), el('b', null, v));
    App.screen(el('div', { class: 'screen results arcsum ' + kind, style: { '--lc': LN(run.line).css } },
      el('div', { class: 'panel resp arcresp' },
        el('small', { class: 'ar-tag' }, LN(run.line).figure + ' · ' + D.name),
        el('h1', null, title),
        el('div', { class: 'ar-head' }, el('div', { class: 'ar-rank rk-' + rank }, rank),
          el('div', { class: 'recs' }, stat('SCORE', U.fmt(run.score) + (newBest ? ' ★' : '')), stat('STAGES', Math.min(run.stage, run.proto ? 8 : 7) + ' / ' + (run.proto ? 8 : 7)),
            stat('TIME', clock(run.time)), stat('ROUNDS LOST', run.lost), stat('CONTINUES', run.conts), stat('TOKENS', '+' + U.fmt(run.tokens)))),
        newBest ? el('div', { class: 'reward gold' }, '★ NEW BEST SCORE ON ' + D.name) : null,
        ...got.map(g => el('div', { class: 'reward' }, g)),
        sel ? el('div', { class: 'reward gold selwon' }, '🎫 SELECTION TICKET!', el('small', null, 'Your first Arcade clear: pick any fighter you don\'t have yet and its whole set is yours.'),
          el('button', { class: 'rwready', onclick: () => Menu.selection() }, 'CHOOSE A FIGHTER ▸')) : null,
        fig ? el('div', { class: 'reward gold selwon' }, '★ NEW FIGURE: ' + LN(fig.line).figure.toUpperCase(), el('small', null, 'Today\'s Arcade figure: a fighter you didn\'t have is yours now (one a day).'),
          el('button', { class: 'rwready', onclick: () => Menu.newFigure(fig.line, fig.res) }, 'SEE IT ▸')) : null,
        !sel && !fig && kind !== 'over' && Rewards.figureToday() && KB.LINE_ORDER.some(l => !Inv.hasFigure(l)) ? el('p', { class: 'note hint' }, 'Today\'s Arcade figure is already yours: clear it again tomorrow for another fighter.') : null,
        kind === 'normal' ? el('p', { class: 'note hint' }, 'Something rattled inside the Case... Climb again with no continues, losing no more than two rounds, to find out what.') : null,
        kind === 'over' ? el('p', { class: 'note hint' }, 'The run is over. Your score still counts toward your best.') : null,
        el('div', { class: 'row' }, btn('ARCADE', () => Arcade.open(), 'big'), btn('STORIES', () => Arcade.gallery(), 'ghost'), btn('HUB', () => Menu.hub(), 'ghost')))));
  }

  /* --------------------------------------------------------- the screens */
  Arcade.open = () => {
    Music.play('menu');
    const a = A(), run = a.run, cur = mine(), line = run ? run.line : storyLine(cur), rv = Story.RIVAL[line];
    Menu.room(run ? run.build : cur);
    let diff = Arcade._diff != null ? Arcade._diff : a.diff != null ? a.diff : 1;
    const ends = a.ends[line] || {}, nN = KB.LINE_ORDER.filter(l => (a.ends[l] || {}).normal).length, nT = KB.LINE_ORDER.filter(l => (a.ends[l] || {}).true).length;
    const node = (img, label, cls) => el('div', { class: 'rt-node ' + (cls || '') }, img ? el('img', { src: img, alt: '' }) : el('i', null, cls === 'secret' ? '?' : '·'), el('small', null, label));
    const done = i => run && run.stage > i ? ' done' : run && run.stage === i ? ' now' : '';
    const opp = i => run ? Models.figIcon(stageOf(run, i).build) : null;
    const route = el('div', { class: 'route' }, node(opp(0), '1', 'n' + done(0)), node(opp(1), '2', 'n' + done(1)), node(opp(2), '3', 'n' + done(2)),
      node(Models.figIcon(KB.mintBuild(rv, 2)), 'RIVAL', 'rival' + done(3)), node(opp(4), '5', 'n' + done(4)), node(opp(5), '6', 'n' + done(5)),
      node(Models.figIcon(SOV()), 'SOVEREIGN', 'boss' + done(6)), node(nT || (run && run.proto) ? Models.figIcon(protoMix(run ? run.seed : 1)) : null, nT || (run && run.proto) ? 'PROTO-0' : '???', 'secret' + done(7)));
    const seg = el('div', { class: 'seg diffseg' }, el('span', null, 'DIFFICULTY'), el('div', null, ...DIFFS.map((d, k) => el('button', { class: k === diff ? 'on' : '', onclick: () => { SFX.play('ui'); Arcade._diff = k; a.diff = k; save(); Arcade.open(); } }, d.name))));
    const best = el('div', { class: 'arbest' }, ...DIFFS.map(d => el('span', null, el('small', null, d.name), el('b', null, a.best[d.id] ? U.fmt(a.best[d.id]) : '—'))));
    const body = run ? [
      el('div', { class: 'runcard' }, el('b', null, 'RUN IN PROGRESS'), el('span', null, LN(run.line).figure + ' · ' + DIFFS[run.diff].name + ' · stage ' + Math.min(run.stage + 1, 8) + ' · score ' + U.fmt(run.score)),
        el('small', null, 'Rounds lost ' + run.lost + ' · continues ' + run.conts + (trueOpen(run) && !run.proto ? ' · ✦ the Case is watching' : ''))),
      el('div', { class: 'row' }, btn('CONTINUE THE RUN', () => advance(run), 'big fight'),
        btn('ABANDON', () => { if (confirm('Abandon this run? Its score still counts toward your best.')) { bestOf(run); a.run = null; save(); Arcade.open(); } }, 'ghost'))]
      : [seg, el('p', { class: 'note dsub' }, DIFFS[diff].sub),
        el('div', { class: 'row' }, btn('START', () => { const r = newRun(diff); a.run = r; save(); talk(Story.opening(r.line), ctxOf(r, null), () => advance(r)); }, 'big fight'),
          btn('CHANGE FIGURE', () => Menu.pickActive(), 'ghost'))];
    App.screen(el('div', { class: 'screen arcade' }, topbar('ARCADE', () => Menu.hub()),
      el('div', { class: 'panel arcp arcmenu', style: { '--lc': LN(line).css } },
        el('small', { class: 'ar-tag' }, 'THE TOP SHELF'),
        el('h2', null, LN(line).figure), el('p', { class: 'note story' }, Story.INTRO[line][0]),
        route,
        ...body,
        el('div', { class: 'arfoot' },
          el('div', null, el('small', null, 'THIS STORY'), el('b', { class: ends.normal ? 'got' : '' }, (ends.normal ? '✓' : '—') + ' NORMAL'), el('b', { class: ends.true ? 'got' : '' }, (ends.true ? '✓' : '—') + ' TRUE')),
          el('div', null, el('small', null, 'ENDINGS SEEN'), el('b', null, nN + ' / 10 normal · ' + nT + ' / 10 true')),
          btn('STORIES ▸', () => Arcade.gallery(), 'ghost small')),
        el('div', { class: 'arbestrow' }, el('small', null, 'BEST SCORES'), best),
        el('p', { class: 'fine' }, 'Your figure\'s Legend Card picks the story. They say the Case rattles for a flawless climb: no continues, and two rounds lost at most.'))));
  };

  /* STORIES: every prologue, and the endings you've seen, to watch again */
  Arcade.gallery = () => {
    App.setView(null); Music.play('menu');
    const a = A(), back = () => Arcade.gallery();
    const lineCtx = (l, proto) => ({ you: { name: LN(l).figure, build: KB.mintBuild(l, 0), css: LN(l).css }, opp: proto ? { name: 'PROTO-0', build: protoMix(1), css: '#c8c8d0' } : null, proto: { name: 'PROTO-0', build: protoMix(1), css: '#c8c8d0' } });
    const gb = (label, on, fn) => el('button', { class: 'gbtn' + (on ? '' : ' off'), onclick: () => { if (!on) { SFX.play('back'); Menu.toast('Reach the ' + label + ' ENDING in the Arcade to watch it here.'); return; } SFX.play('ok'); fn(); } }, on ? label : '🔒 ' + label);
    App.screen(el('div', { class: 'screen gallery' }, topbar('STORIES', () => Arcade.open()),
      el('div', { class: 'panel galp' },
        el('p', { class: 'note' }, 'Every fighter has a prologue and two endings. The NORMAL ending comes from beating the Sovereign; the TRUE ending waits for a flawless climb.'),
        Menu.themeTabs(() => Arcade.gallery()),
        el('div', { class: 'galgrid' }, ...Menu.themeLines().map(l => { const e = a.ends[l] || {};
          return el('div', { class: 'galcard', style: { '--lc': LN(l).css } }, el('img', { src: Models.figIcon(KB.mintBuild(l, 0)), alt: '' }), el('b', null, LN(l).figure),
            el('div', { class: 'galbtns' }, gb('INTRO', true, () => talk(Story.opening(l), lineCtx(l), back)),
              gb('NORMAL', !!e.normal, () => talk(Story.normal(l), lineCtx(l), back)), gb('TRUE', !!e.true, () => talk(Story.trueEnd(l), lineCtx(l, true), back)))); })))));
  };
  window.Arcade = Arcade;
})();
