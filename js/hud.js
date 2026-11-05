/* ============================================================================
   hud.js -- the in-fight overlay (DOM): HP with a damage trail, the part
   diagram (each limb's armour), Burst, Hype, Special uses, the combo counter,
   the wall stress map, banners, the Legend Art cut-in, pause and training.
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
        el('div', { class: 'pname' }, el('b', null, i ? (M.ai[1] && !M.training ? 'CPU' : 'P2') : 'P1'), ' ', f.name),
        R.pips = el('div', { class: 'pips' })),
      el('div', { class: 'hpwrap' }, R.trail = el('div', { class: 'hptrail' }), R.hp = el('div', { class: 'hp' }), R.hpn = el('span', { class: 'hpn' })),
      el('div', { class: 'prow2' }, parts,
        el('div', { class: 'gauges' },
          el('div', { class: 'glabel' }, 'BURST'), el('div', { class: 'bar burst' }, R.burst = el('i')),
          el('div', { class: 'glabel' }, 'GUARD'), el('div', { class: 'bar guard' }, R.guard = el('i')))),
      R.tags = el('div', { class: 'tags' }));
    const low = el('div', { class: 'plow p' + (i + 1) },
      el('div', { class: 'hypebox' }, el('span', { class: 'hlabel' }, 'HYPE'), el('div', { class: 'bar hype' }, R.hype = el('i'), el('em')), R.hypen = el('b', { class: 'hypen' }, '0')),
      el('div', { class: 'uses' }, el('span', null, 'SPECIAL'), R.uses = el('span', { class: 'usepips' })),
      R.combo = el('div', { class: 'combo' }, R.cn = el('b'), R.cl = el('span'), R.cb = el('em'), R.cd = el('small')));
    R.box = box; R.low = low; R.f = f; R.lastHp = f.hp; R.trailHp = f.hp;
    return R;
  }

  const HUD = {
    build(match) {
      M = match; root = $('hud'); root.innerHTML = ''; root.hidden = false;
      const [a, b] = M.fighters;
      refs = [side(0, a), side(1, b)];
      refs.timer = el('div', { class: 'timer' }, '99');
      refs.walls = el('div', { class: 'wallmap' }, ...['N', 'E', 'S', 'W'].map(id => el('i', { class: 'w' + id, 'data-w': id })), refs.dots = el('div', { class: 'wm-dots' }, el('b', { class: 'd1' }), el('b', { class: 'd2' })));
      root.append(el('div', { class: 'top' }, refs[0].box, el('div', { class: 'mid' }, refs.timer, refs.walls), refs[1].box), refs[0].low, refs[1].low,
        refs.banner = el('div', { class: 'banner' }), refs.cut = el('div', { class: 'supercut' }));
      if (M.training) root.append(HUD.trainingPanel());
      comboT = [0, 0];
    },
    hide(match) { if (match && match !== M) return; if (root) { root.hidden = true; root.innerHTML = ''; } const p = $('pause'); if (p) p.remove(); M = null; },
    update(match) {
      if (!refs || match !== M) return;
      const dt = 1 / 60;
      for (let i = 0; i < 2; i++) {
        const R = refs[i], f = R.f;
        const hp = Math.max(0, f.hp / f.maxHp);
        R.hp.style.width = (hp * 100) + '%';
        if (f.hp < R.lastHp) R.hold = 0.7; R.lastHp = f.hp;
        R.hold = (R.hold || 0) - dt; if (R.hold <= 0) R.trailHp = U.smooth(R.trailHp, f.hp, 4, dt); if (R.trailHp < f.hp) R.trailHp = f.hp;
        R.trail.style.width = (Math.max(0, R.trailHp / f.maxHp) * 100) + '%';
        R.hp.classList.toggle('low', hp < 0.3);
        R.hpn.textContent = Math.ceil(f.hp);
        R.burst.style.width = f.burst + '%'; R.burst.parentNode.classList.toggle('full', f.burst >= 100);
        R.guard.style.width = (f.guardHp / f.guardMax * 100) + '%';
        R.hype.style.width = f.hype + '%'; R.hypen.textContent = Math.floor(f.hype); R.hype.parentNode.classList.toggle('max', f.hype >= 100); R.hype.parentNode.classList.toggle('half', f.hype >= 50);
        R.uses.textContent = f.broken.head ? '✕' : '◆'.repeat(f.uses) + '◇'.repeat(Math.max(0, f.st.uses - f.uses));
        const pd = (el, k) => { const v = f.broken[k] ? 0 : f.armor[k] / f.armorMax[k]; el.className = el.className.split(' ')[0] + (f.broken[k] ? ' off' : v < 0.35 ? ' red' : v < 0.65 ? ' yel' : ''); };
        pd(R.ph, 'head'); pd(R.pr, 'armR'); pd(R.pl, 'armL'); pd(R.pg, 'legs');
        R.pc.className = 'pd-core' + (hp < 0.3 ? ' red' : hp < 0.6 ? ' yel' : '');
        R.pips.innerHTML = ''; for (let k = 0; k < M.opts.wins; k++) R.pips.append(el('i', { class: M.wins[i] > k ? 'on' : '' }));
        const tags = []; if (f.buffs.momentum) tags.push('MOMENTUM'); if (f.buffs.bulwark) tags.push('BULWARK'); if (f.buffs.fury) tags.push('FURY');
        if (f.st.set === 2) tags.push('MINT SET'); else if (f.st.set === 1) tags.push('PARTIAL SET');
        const t = tags.join(' · '); if (R.tags.textContent !== t) R.tags.textContent = t;
        comboT[i] -= dt; R.combo.classList.toggle('on', comboT[i] > 0);
      }
      const c = Math.ceil(M.clock); refs.timer.textContent = M.training ? '∞' : c; refs.timer.classList.toggle('low', c <= 10 && !M.training);
      for (const w of M.arena.walls) { const e = refs.walls.querySelector('.w' + w.id); e.style.setProperty('--s', (w.broken ? 100 : w.stress) + '%'); e.classList.toggle('broken', w.broken); e.classList.toggle('hot', w.stress > 65); }
      const A = M.arena; M.fighters.forEach((f, i) => { const d = refs.dots.children[i]; d.style.left = (50 + f.pos.x / A.W * 50) + '%'; d.style.top = (50 + f.pos.z / A.D * 50) + '%'; });
      if (M.training && refs.tr) { const v = M.fighters[1].combo, p = M.fighters[0].combo; const c2 = v.hits ? v : refs.lastC || v; if (v.hits) refs.lastC = { hits: v.hits, dmg: v.dmg, bounces: v.bounces }; refs.tr.textContent = 'LAST COMBO  ' + (c2.hits || 0) + ' hits · ' + Math.round(c2.dmg || 0) + ' dmg · ' + (c2.bounces || 0) + ' bounces'; }
    },
    combo(attIdx, c) {
      if (!refs) return; const R = refs[attIdx];
      R.cn.textContent = c.hits; R.cl.textContent = c.hits === 1 ? 'HIT' : 'HITS';
      R.cb.textContent = c.bounces ? 'KNOCK//BACK ×' + c.bounces : ''; R.cd.textContent = Math.round(c.dmg) + ' DMG  ·  ' + Math.round(Combat.prorate({ combo: c }) * 100) + '% VALUE';
      R.combo.classList.remove('pop'); void R.combo.offsetWidth; R.combo.classList.add('pop');
      comboT[attIdx] = 1.6;
    },
    banner(text, cls, dur) {
      if (!refs) return; const b = refs.banner; b.className = 'banner ' + (cls || ''); b.innerHTML = '';
      if (text.includes('//')) { const [x, y] = text.split('//'); b.append(el('span', null, x), el('i', null, '//'), el('span', null, y)); } else b.textContent = text;
      void b.offsetWidth; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), (dur || 1) * 1000);
    },
    superCut(f, mv) {
      if (!refs) return; const c = refs.cut; const K = KB.LINES[f.build.card.line];
      c.innerHTML = ''; c.style.setProperty('--lc', K.css); c.className = 'supercut p' + (f.idx + 1);
      c.append(el('div', { class: 'sc-band' }, el('small', null, 'LEGEND ART'), el('b', null, mv.name), el('span', null, f.name)));
      void c.offsetWidth; c.classList.add('show'); setTimeout(() => c.classList.remove('show'), 900);
    },
    trainingPanel() {
      const T = M.training; const sel = (label, key, opts) => el('label', null, label, el('select', { onchange: e => { T[key] = e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value; e.target.blur(); } }, ...opts.map(([v, t]) => el('option', { value: v, selected: String(T[key]) === String(v) }, t))));
      return el('div', { class: 'trainpanel' },
        el('b', null, 'TRAINING'),
        sel('Dummy', 'dummy', [['stand', 'Stand'], ['guard', 'Guard'], ['jump', 'Jump'], ['tech', 'Tech + Burst'], ['cpu', 'CPU']]),
        sel('Meters', 'meter', [['true', 'Always full'], ['false', 'Normal']]),
        el('span', { class: 'hint' }, 'R: reset positions · Esc: pause / move list'),
        refs.tr = el('div', { class: 'trread' }, 'LAST COMBO'));
    },
    pause(match) {
      if ($('pause') || match.phase === 'end') return;
      match.paused = true; SFX.play('ui');
      const close = () => { match.paused = false; ov.remove(); for (const p of Input.players) p.clear(); };
      const ov = el('div', { id: 'pause', class: 'overlay' },
        el('div', { class: 'panel pausep' },
          el('h2', null, 'PAUSED'),
          el('div', { class: 'cols' },
            el('div', { class: 'col' },
              el('button', { class: 'btn big', onclick: close }, 'RESUME'),
              el('button', { class: 'btn', onclick: () => { close(); match.restart(); } }, 'RESTART'),
              el('button', { class: 'btn ghost', onclick: () => { close(); App.quitMatch(); } }, 'QUIT TO MENU')),
            el('div', { class: 'col wide' }, HUD.moveList(match.fighters[0].build, 0)))));
      document.body.append(ov);
      const onKey = e => { if (e.code === 'Escape') { e.preventDefault(); close(); window.removeEventListener('keydown', onKey, true); } };
      setTimeout(() => window.addEventListener('keydown', onKey, true), 50);
    },
    /* every move of a build, with the keys that do it */
    moveList(build, pi) {
      const S = KB.stats(build), B = Input.binds[pi || 0], k = a => Input.keyName((B[a] || [])[0]);
      const nm = id => KB.MOVES[id].name;
      const row = (keys, name, note) => el('div', { class: 'mrow' }, el('kbd', null, keys), el('b', null, name), note ? el('span', null, note) : null);
      return el('div', { class: 'movelist' },
        el('h3', null, build.name || 'Your figure'),
        row(k('light') + ' ×' + S.light.length, S.light.map(nm).join(' › '), 'R-ARM string'),
        row(k('light') + '… ' + k('heavy'), nm(S.launch), 'launcher, then ' + k('jump') + ' to follow'),
        row(k('light') + '… toward + ' + k('heavy'), nm(S.heavy), 'KNOCK them back into the wall mid-combo'),
        row(k('heavy') + ' (hold)', nm(S.heavy), 'the KNOCK: aim it at a wall'),
        row('air ' + k('light'), nm(S.air), 'up to 4 in the air'),
        row('air ' + k('heavy'), nm(S.airHeavy), 'spike: ground bounce'),
        row(k('dodge') + ' › ' + k('light'), nm(S.dashAtk), 'dash attack (LEGS)'),
        row(k('special'), nm(S.special), S.uses + ' uses a round (HEAD)'),
        row(k('super'), nm(S.super), '100 Hype (LEGEND CARD)'),
        row(k('guard') + ' + ' + k('light'), 'Throw', 'beats guard'),
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
