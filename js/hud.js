/* ============================================================================
   hud.js -- the in-fight overlay (DOM): the DAMAGE % and the stocks left, the
   part diagram (each limb's armour), Burst, Hype, Special uses, the combo
   counter, banners, the Legend Art cut-in, pause and training.
   ========================================================================== */
(function () {
  'use strict';
  const { el, $ } = U;
  let root = null, M = null, refs = null, comboT = [0, 0], bannerT = null;

  function side(i, f) {
    const R = {};
    const parts = el('div', { class: 'pdiag' },
      R.ph = el('i', { class: 'pd-head' }), R.pr = el('i', { class: 'pd-armR' }), R.pc = el('i', { class: 'pd-core' }), R.pl = el('i', { class: 'pd-armL' }), R.pg = el('i', { class: 'pd-legs' }));
    const box = el('div', { class: 'pside p' + (i + 1), style: { '--lc': f.color } },
      el('div', { class: 'prow' },
        el('div', { class: 'pname' }, el('b', null, M.ai[i] && !M.training ? (M.ai[1 - i] ? 'CPU ' + (i + 1) : 'CPU') : 'P' + (i + 1)), ' ', f.name),
        R.pips = el('div', { class: 'pips' })),
      el('div', { class: 'pctwrap' }, R.pct = el('b', { class: 'pct' }, '0', el('small', null, '%')), R.stk = el('div', { class: 'stocks' })),
      el('div', { class: 'prow2' }, parts,
        el('div', { class: 'gauges' },
          el('div', { class: 'glabel' }, 'BURST'), el('div', { class: 'bar burst' }, R.burst = el('i')),
          el('div', { class: 'glabel gl-guard' }, 'GUARD'), el('div', { class: 'bar guard' }, R.guard = el('i')))),
      R.tags = el('div', { class: 'tags' }));
    const low = el('div', { class: 'plow p' + (i + 1) },
      el('div', { class: 'hypebox' }, el('span', { class: 'hlabel' }, 'HYPE'), el('div', { class: 'bar hype' }, R.hype = el('i'), el('em')), R.hypen = el('b', { class: 'hypen' }, '0')),
      R.ready = el('div', { class: 'artready' }),
      el('div', { class: 'uses' }, el('span', null, 'SPECIAL'), R.uses = el('span', { class: 'usepips' })),
      f.st.rounds ? R.rnd = el('div', { class: 'rounds' }, el('span', null, f.st.ammo), R.rounds = el('span', { class: 'usepips' })) : null,
      R.combo = el('div', { class: 'combo' }, R.cn = el('b'), R.cl = el('span'), R.cb = el('em'), R.cd = el('small')));
    R.box = box; R.low = low; R.f = f; R.lastPct = -1; R.lastStk = -1;
    return R;
  }

  const HUD = {
    build(match) {
      M = match; root = $('hud'); root.innerHTML = ''; root.hidden = false;
      const [a, b] = M.fighters;
      refs = [side(0, a), side(1, b)];
      refs.timer = el('div', { class: 'timer' }, '99');
      root.append(el('div', { class: 'top' }, refs[0].box, el('div', { class: 'mid' }, refs.timer), refs[1].box), refs[0].low, refs[1].low,
        refs.banner = el('div', { class: 'banner' }), refs.cut = el('div', { class: 'supercut' }),
        refs.cine = el('div', { class: 'cine' }, refs.cTint = el('div', { class: 'ctint' }), el('i', { class: 'cbar t' }), el('i', { class: 'cbar b' }), refs.cFlash = el('div', { class: 'cflash' }), refs.cTitle = el('div', { class: 'ctitle' })));
      root.classList.remove('cinema');
      if (M.training && !M.opts.tutorial && !M.opts.trials) { root.append(HUD.trainingPanel()); if (M.lab) root.append(...Lab.build(refs)); }
      comboT = [0, 0];
    },
    hide(match) { if (match && match !== M) return; if (root) { root.hidden = true; root.innerHTML = ''; root.classList.remove('cinema'); } const p = $('pause'); if (p) p.remove(); M = null; },
    update(match) {
      if (!refs || match !== M) return;
      const dt = 1 / 60;
      if (!M.ai[0]) Touch.sync(M.fighters[0]);
      for (let i = 0; i < 2; i++) {
        const R = refs[i], f = R.f;
        const hp = Math.max(0, f.hp / f.maxHp);
        // the DAMAGE %: white at 0, through yellow and orange to a deep red past 150; it jolts when it goes up
        const pc = Math.floor(f.pct);
        if (pc !== R.lastPct) {
          if (pc > R.lastPct && R.lastPct >= 0) { R.pct.classList.remove('jolt'); void R.pct.offsetWidth; R.pct.classList.add('jolt'); }
          R.lastPct = pc; R.pct.firstChild.textContent = f.gone ? '' : String(pc);
          const k = U.clamp(pc / 150, 0, 1); R.pct.style.color = 'hsl(' + Math.round(55 - k * 55) + ',' + Math.round(k * 95) + '%,' + Math.round(96 - k * 46) + '%)';
        }
        const stk = M.training ? -2 : M.stocks[i];
        if (stk !== R.lastStk) { R.lastStk = stk; R.stk.innerHTML = ''; if (stk === -2) R.stk.append(el('span', null, '∞')); else for (let k = 0; k < Math.max(0, stk); k++) R.stk.append(el('i')); }
        R.burst.style.width = f.burst + '%'; R.burst.parentNode.classList.toggle('full', f.burst >= 100);
        R.guard.style.width = (f.guardHp / f.guardMax * 100) + '%';
        R.hype.style.width = f.hype + '%'; R.hypen.textContent = Math.floor(f.hype); R.hype.parentNode.classList.toggle('max', f.hype >= 100); R.hype.parentNode.classList.toggle('half', f.hype >= 50);
        { const human = !(M.ai && M.ai[f.idx]) && !M.attract && M.opts.mode !== 'watch', on = human && f.hype >= 100 && !M.cine && f.state !== 'ko'; if (on !== R.readyOn) { R.readyOn = on; R.ready.classList.toggle('on', on); if (on) R.ready.textContent = 'LEGEND ART READY · ' + (U.touch && !Input.usingPad(f.idx) ? 'SUPER' : Input.prompt(f.idx, 'super')); } }
        R.uses.textContent = f.broken.head ? '✕' : '◆'.repeat(Math.max(0, f.uses)) + '◇'.repeat(Math.max(0, f.st.uses - Math.max(0, f.uses)));
        if (R.rounds) {   // AMMO
          const t = f.broken[f.st.ammoPart] ? '\u2715' : f.reloadT > 0 ? f.st.ammoOut + ' ' + f.reloadT.toFixed(1) : '\u25cf'.repeat(f.rounds) + '\u25cb'.repeat(Math.max(0, f.st.rounds - f.rounds));
          if (R.rounds.textContent !== t) { R.rounds.textContent = t; R.rnd.classList.toggle('empty', f.reloadT > 0); }
        }
        const pd = (el, k) => { const v = f.broken[k] ? 0 : f.armor[k] / f.armorMax[k]; el.className = el.className.split(' ')[0] + (f.broken[k] ? ' off' : v < 0.35 ? ' red' : v < 0.65 ? ' yel' : ''); };
        pd(R.ph, 'head'); pd(R.pr, 'armR'); pd(R.pl, 'armL'); pd(R.pg, 'legs');
        R.pc.className = 'pd-core' + (hp < 0.3 ? ' red' : hp < 0.6 ? ' yel' : '');
        R.pips.innerHTML = ''; if (!M.training && !M.attract && M.opts.wins > 1) for (let k = 0; k < Math.min(5, M.opts.wins); k++) R.pips.append(el('i', { class: M.wins[i] > k ? 'on' : '' }));
        const tags = []; if (f.buffs.momentum) tags.push('MOMENTUM'); if (f.buffs.bulwark) tags.push('BULWARK'); if (f.buffs.fury) tags.push('FURY');
        if (f.st.set === 2) tags.push('MINT SET'); else if (f.st.set === 1) tags.push('PARTIAL SET');
        const t = tags.join(' · '); if (R.tags.textContent !== t) R.tags.textContent = t;
        comboT[i] -= dt; R.combo.classList.toggle('on', comboT[i] > 0);
      }
      const c = Math.ceil(M.clock), ct = M.training ? '∞' : c >= 100 ? Math.floor(c / 60) + ':' + String(c % 60).padStart(2, '0') : String(c);
      if (refs.timer.textContent !== ct) refs.timer.textContent = ct; refs.timer.classList.toggle('low', c <= 10 && !M.training);
      if (M.lab) Lab.draw(M, refs);
      if (M.training && refs.tr) { const v = M.fighters[1].combo, p = M.fighters[0].combo; const c2 = v.hits ? v : refs.lastC || v; if (v.hits) refs.lastC = { hits: v.hits, dmg: v.dmg }; refs.tr.textContent = 'LAST COMBO  ' + (c2.hits || 0) + ' hits · ' + Math.round((c2.dmg || 0) * Platform.PCT) + '%'; }
    },
    combo(attIdx, c) {
      if (!refs || U.quiet) return; const R = refs[attIdx];
      R.cn.textContent = c.hits; R.cl.textContent = c.hits === 1 ? 'HIT' : 'HITS';
      R.cb.textContent = ''; R.cd.textContent = Math.round(c.dmg * Platform.PCT) + '%  ·  ' + Math.round(Combat.prorate({ combo: c }) * 100) + '% VALUE';
      R.combo.classList.remove('pop'); void R.combo.offsetWidth; R.combo.classList.add('pop');
      comboT[attIdx] = 1.6;
    },
    banner(text, cls, dur) {
      if (!refs || U.quiet) return; const b = refs.banner; b.className = 'banner ' + (cls || ''); b.innerHTML = '';
      if (text.includes('//')) { const [x, y] = text.split('//'); b.append(el('span', null, x), el('i', null, '//'), el('span', null, y)); } else b.textContent = text;
      void b.offsetWidth; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), (dur || 1) * 1000);
    },
    superCut(f, mv) {
      if (!refs || U.quiet) return; const c = refs.cut; const K = KB.LINES[f.build.card.line];
      c.innerHTML = ''; c.style.setProperty('--lc', K.css); c.className = 'supercut p' + (f.idx + 1);
      c.append(el('div', { class: 'sc-band' }, el('small', null, 'LEGEND ART'), el('b', null, mv.name), el('span', null, f.name)));
      void c.offsetWidth; c.classList.add('show'); setTimeout(() => c.classList.remove('show'), 900);
    },
    /* the Legend Art cinematic: bars in, a flash and the Art's name on the finisher, a tint for the mood */
    cine(on) { if (!refs || U.quiet) return; root.classList.toggle('cinema', on); refs.cine.classList.toggle('on', on); if (!on) refs.cTitle.classList.remove('go'); },
    cineFlash() { if (!refs || U.quiet) return; const e = refs.cFlash; e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); },
    cineTitle(text, css) { if (!refs || U.quiet) return; const e = refs.cTitle; e.textContent = text; e.style.setProperty('--lc', css || '#fff'); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); },
    cineTint(t) { if (!refs || U.quiet) return; const e = refs.cTint; if (!t) { e.style.opacity = 0; return; } if (e.dataset.bg !== t[0]) { e.dataset.bg = t[0]; e.style.background = t[0]; } e.style.opacity = t[1]; },
    /* the Start choice follows a SAVE POSITION */
    trainingSpot() { const s = refs && refs.spot && refs.spot.querySelector('select'); if (s && M && M.training) s.value = M.training.spot; },
    /* H turned the hitboxes on or off: the panel follows */
    trainingSync() { const s = refs && refs.hb && refs.hb.querySelector('select'); if (s && M && M.training) s.value = String(!!M.training.hitboxes); },
    trainingPanel() {
      const T = M.training; const sel = (label, key, opts) => el('label', null, label, el('select', { onchange: e => { T[key] = e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value; e.target.blur(); if (key === 'inputs' || key === 'frames' || key === 'hitboxes') U.write('kb.lab', { inputs: T.inputs, frames: T.frames, hitboxes: T.hitboxes }); } }, ...opts.map(([v, t]) => el('option', { value: v, selected: String(T[key]) === String(v) }, t))));
      const tb = (label, fn, cls) => el('button', { class: 'btn small' + (cls ? ' ' + cls : ''), onclick: e => { e.currentTarget.blur(); fn(); } }, label);
      const panel = el('div', { class: 'trainpanel' + (U.touch ? ' min' : '') },
        el('b', { onclick: () => panel.classList.toggle('min') }, 'TRAINING ', el('i', null, '▾')),
        sel('Dummy', 'dummy', [['stand', 'Stand'], ['guard', 'Guard'], ['jump', 'Jump'], ['tech', 'Tech + Burst'], ['cpu', 'CPU'], ['play', 'Playback (loop)']]),
        sel('Meters', 'meter', [['true', 'Always full'], ['false', 'Normal']]),
        refs.hb = sel('Hitboxes', 'hitboxes', [['false', 'Hide'], ['true', 'Show']]),
        refs.spot = sel('Start', 'spot', [['centre', 'Centre'], ['wall', 'By a wall'], ['saved', 'Saved position']]),
        el('div', { class: 'trbtns' }, tb('SAVE POSITION', () => M.trainSave()), tb('RESET', () => M.trainReset(), 'ghost')),
        M.lab ? el('div', { class: 'trbtns' }, tb('● RECORD', () => Lab.record(M), 'rec'), tb('▶ PLAY', () => Lab.play(M), 'ghost')) : null,
        M.lab ? sel('Inputs', 'inputs', [['true', 'Show'], ['false', 'Hide']]) : null,
        M.lab ? sel('Frame data', 'frames', [['true', 'Show'], ['false', 'Hide']]) : null,
        el('span', { class: 'hint' }, U.touch ? 'Pause button: move list, record and play' : 'R: reset · T: save the position · H: hitboxes · Y: record the dummy (you play it) · U: play it back · pad: tap Back to reset, hold it to save; record and play are in the pause menu · Esc: pause'),
        refs.tr = el('div', { class: 'trread' }, 'LAST COMBO'));
      return panel;
    },
    pause(match) {
      if (match.opts && match.opts.online) { if (window.Online) Online.menu(); return; }
      if ($('pause') || match.phase === 'end') return;
      match.paused = true; SFX.play('ui');
      const close = () => { match.paused = false; ov.remove(); for (const p of Input.players) p.clear(); };
      const ov = el('div', { id: 'pause', class: 'overlay' },
        el('div', { class: 'panel pausep' },
          el('h2', null, 'PAUSED'),
          el('div', { class: 'cols' },
            el('div', { class: 'col' },
              el('button', { class: 'btn big', onclick: close }, 'RESUME'),
              el('button', { class: 'btn', onclick: () => { close(); if (match.opts.mode === 'arcade' && window.Arcade) Arcade.restarted(); match.restart(); } }, match.opts.mode === 'arcade' ? 'RESTART (A CONTINUE)' : 'RESTART'),
              match.training && !match.opts.tutorial && !match.opts.trials && !match.opts.roomTraining ? el('button', { class: 'btn', onclick: () => { close(); App.setView(null); Menu.training(); } }, 'CHARACTER SELECT') : null,
              ['cpu', 'versus', 'watch'].includes(match.opts.mode) && !match.attract ? el('button', { class: 'btn', onclick: () => { close(); App.setView(null); Menu.versus(match.opts.cfg || Menu._vs); } }, 'CHARACTER SELECT') : null,
              match.lab ? el('button', { class: 'btn', onclick: () => { close(); Lab.record(match); } }, match.lab.rec ? 'STOP RECORDING' : 'RECORD THE DUMMY') : null,
              match.lab ? el('button', { class: 'btn', onclick: () => { close(); Lab.play(match); } }, match.ai[1] && match.ai[1].play && !match.ai[1].play.loop ? 'STOP PLAYBACK' : 'PLAY THE RECORDING') : null,
              el('button', { class: 'btn ghost', onclick: () => { close(); App.quitMatch(); } }, match.opts.roomTraining ? 'BACK TO THE ROOM' : 'QUIT TO MENU'),
              ...['sfx', 'music'].map(k => el('label', { class: 'vol pvol' }, k.toUpperCase(), el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: SFX.vol[k], oninput: e => SFX.setVol(k, +e.target.value) })))),
            el('div', { class: 'col wide' }, HUD.moveList(match.fighters[0].build, 0)))));
      document.body.append(ov);
      const onKey = e => { if (e.code === 'Escape') { e.preventDefault(); close(); window.removeEventListener('keydown', onKey, true); } };
      setTimeout(() => window.addEventListener('keydown', onKey, true), 50);
    },
    /* every move of a build, with the keys that do it */
    moveList(build, pi) {
      const S = KB.stats(build), k = a => Input.prompt(pi || 0, a);
      const nm = id => KB.MOVES[id].name;
      const chain = root => { const out = []; let id = root; while (id && out.length < 8) { out.push(id); id = (KB.MOVES[id].nx || {}).l; } return out; };
      const L = chain(S.light), A = chain(S.air), pi2 = L.findIndex(id => (KB.MOVES[id].nx || {}).p);
      const row = (keys, name, note) => el('div', { class: 'mrow' }, el('kbd', null, keys), el('b', null, name), note ? el('span', null, note) : null);
      return el('div', { class: 'movelist' },
        el('h3', null, build.name || 'Your figure'),
        row(k('light') + ' ×' + L.length, L.map(nm).join(' › '), S.mixed ? 'MIXED string: ' + KB.LINES[build.armR.line].name + ' R-ARM + ' + KB.LINES[build.armL.line].name + ' L-ARM' : 'R-ARM string'),
        pi2 >= 0 ? row(k('light') + ' ×' + (pi2 + 1) + ', pause, ' + k('light'), nm(KB.MOVES[L[pi2]].nx.p), 'PAUSE combo: let it finish, wait a beat, press again') : null,
        row(k('light') + '… ' + k('heavy'), nm(S.launch), 'launcher, then ' + k('jump') + ' to follow'),
        row(k('light') + '… toward + ' + k('heavy'), nm(S.heavy), 'KNOCK them back into the wall mid-combo'),
        row(k('heavy') + ' (hold)', nm(S.heavy), 'the KNOCK: aim it at a wall; one hit of armour while you hold it'),
        KB.MOVES[S.heavy] && KB.MOVES[S.heavy].auto ? row(k('heavy') + ' ' + k('heavy'), 'Auto combo', [S.heavy, KB.MOVES[S.heavy].auto, KB.MOVES[KB.MOVES[S.heavy].auto].auto].map(nm).join(' \u203a ') + ': Heavy again before it lands') : null,
        row('toward + ' + k('snap'), 'Tech Chase', 'after your KNOCK sends them flying: half a bar of Hype, and your dash runs them down'),
        row('air ' + k('light') + ' ×' + A.length, A.map(nm).join(' › '), S.mixed ? 'mixed air string, one per jump' : 'air string, one per jump'),
        S.gunCancel ? row(k('light') + ' ' + k('heavy'), nm(S.gunCancel), 'one Light, then Heavy: a gun cancel (Flintlock), once a combo; then Light starts the string again') : null,
        S.rounds ? row('\u25cf'.repeat(S.rounds), S.rounds + ' ' + S.ammo.toLowerCase(), 'every shot spends one; empty, you reload (' + +S.reload.toFixed(1) + ' s)' + (S.dry.heavy ? ' and Heavy is the ' + nm(S.dry.heavy) : '')) : null,
        S.sig ? row('★ ' + S.sigName, S.sigDesc, 'R-ARM signature') : null,
        row('air ' + k('heavy'), nm(S.airHeavy), 'spike: ground bounce'),
        row(k('dodge') + ' › ' + k('light'), nm(S.dashAtk), 'dash attack (LEGS)'),
        row(k('special'), nm(S.special), S.uses + ' uses a round (HEAD)'),
        ...(S.cmd ? [['qcf', '→ +'], ['qcb', '← +'], ['dp', '↑ +']].filter(([c]) => S.cmd[c] && KB.MOVES[S.cmd[c]]).map(([c, a]) => row(a + ' ' + k('special'), nm(S.cmd[c]), KB.MOVES[S.cmd[c]].desc || '')) : []),
        S.cmd ? row('→ ← ↓', 'Command motions', 'like a 2D fighter: ↓ is down, → is the side of the screen they’re on; all four Specials share the uses') : null,
        row(k('super'), nm(S.super), '100 Hype (LEGEND CARD)'),
        row(k('guard') + ' + ' + k('light'), 'Grab', 'beats guard. Then ' + k('light') + ' pummel, tilt or ' + k('heavy') + ' throw that way (' + k('heavy') + ' alone slams), ' + k('jump') + ' throws up'),
        row(k('toss'), 'Part Toss', 'throw one of your parts: in a combo it EXTENDS it (twice a combo)'),
        KB.MOVES[S.special] && KB.MOVES[S.special].type === 'summon' ? row(k('toss') + ' with an imp', 'Imp Toss', 'run into your imps to pick them up (two at most; carried, they don\'t run out): Toss throws one instead of a part, and each one EXTENDS a combo') : null,
        row(k('guard') + ' + ' + k('dodge') + ' in the air', 'Down Dash', 'dive straight to the floor (uses your air dodge)'),
        S.spear ? row(k('guard') + ' + ' + k('heavy'), 'Spear Throw', 'throw the lance; walk over it to pick it up (fists until then)') : null,
        el('h4', null, 'GETTING OUT'),
        row(k('snap') + ' in hitstun', 'Spring Burst', 'full Burst gauge'),
        row(k('dodge') + ' at a wall', 'Wall Tech', 'from the 2nd bounce of a combo'),
        row(k('dodge') + ' on landing', 'Quick Rise', 'not after a spike or throw'),
        row(k('snap') + ' in a move', 'Snap Cancel', '50 Hype: cancel the recovery'),
        row(k('guard'), 'Guard', 'tap just before a hit: Just Guard'));
    },
  };
  window.HUD = HUD;
})();
