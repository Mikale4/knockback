/* ============================================================================
   menu.js -- every screen outside a fight.
   TITLE -> LOG IN / NEW COLLECTOR -> (new: pick a starter figure) -> HUB
   HUB: ARCADE · VERSUS · TRAINING · WORKSHOP · CAPSULES · SHELF · OPTIONS
   ========================================================================== */
(function () {
  'use strict';
  const { el, $ } = U;
  const stars = r => '★'.repeat(KB.RARITY[r].stars);
  const rcls = r => 'r' + r;
  const S = () => Auth.S;
  const logo = cls => el('div', { class: 'logo ' + (cls || '') }, el('span', null, 'KNOCK'), el('i', null, '//'), el('span', null, 'BACK'));
  const btn = (label, onclick, cls, sub) => el('button', { class: 'btn ' + (cls || ''), onclick: e => { SFX.play('ok'); onclick(e); } }, label, sub ? el('small', null, sub) : null);
  const back = to => btn('◂ BACK', () => { SFX.play('back'); to(); }, 'ghost backbtn');
  const glyph = (type, b) => el('span', { class: 'glyph g-' + type + ' gb' + b }, Input.padLabel(type, b));
  /* COLOURS: a row of palette swatches, each the figure's own colours in that palette */
  function paintRow(label, val, line, set, redraw) {
    val = val | 0;
    return el('div', { class: 'seg paints' }, el('span', null, label), el('div', { class: 'swatches' },
      ...Models.PAINTS.map((P, k) => { const [a, b, c] = Models.swatch(line, k);
        return el('button', { class: 'sw' + (val === k ? ' on' : ''), title: P.name, 'aria-label': P.name, style: { background: 'linear-gradient(135deg, ' + a + ' 0 52%, ' + b + ' 52% 100%)', borderColor: c }, onclick: () => { SFX.play('ok'); set(k); redraw(); } }); }),
      el('small', { class: 'swname' }, (Models.PAINTS[val] || Models.PAINTS[0]).name)));
  }
  const myPaint = () => (S().paint | 0) % Models.PAINTS.length;
  const painted = (b, k) => Object.assign({}, b, { paint: k | 0 });
  function topbar(title, onBack) {
    return el('div', { class: 'topbar' }, onBack ? back(onBack) : null, el('h1', null, title), el('div', { class: 'grow' }),
      el('div', { class: 'tokens', id: 'tok' }, el('i', { class: 'coin' }), U.fmt(S().tokens)),
      el('div', { class: 'who' }, Auth.user.user));
  }
  const refreshTokens = () => { const t = $('tok'); if (t) t.lastChild.textContent = U.fmt(S().tokens); };
  function toast(text, cls) { const t = el('div', { class: 'toast ' + (cls || '') }, text); document.body.append(t); setTimeout(() => t.classList.add('show'), 10); setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600); }
  function modal(content, onClose) {
    const ov = el('div', { class: 'overlay', onclick: e => { if (e.target === ov) close(); } }, el('div', { class: 'panel modal' }, content, el('div', { class: 'mfoot' }, btn('CLOSE', () => close(), 'ghost'))));
    const close = () => { ov.remove(); onClose && onClose(); };
    document.body.append(ov); return close;
  }
  const activeBuild = () => Inv.levelled(S().builds[S().active || 0]);
  /* builds[0] is your starter figure (its Standard set); builds[1..] are your custom slots: A and B come free, the
     next four are bought with tokens, in order */
  const CUSTOMS = [{ name: 'Custom A', cost: 0 }, { name: 'Custom B', cost: 0 }, { name: 'Custom C', cost: 1000 }, { name: 'Custom D', cost: 2000 }, { name: 'Custom E', cost: 3000 }, { name: 'Custom F', cost: 5000 }];
  const starterLine = () => S().starter || S().builds[0].core.line;
  const partLabel = (it, slot) => KB.itemName(it.line, slot || it.slot) + (it.lv ? ' +' + it.lv : '');

  /* ------------------------------------------------------- the showroom --
     A figure on a turntable stand (hub, workshop, select screens). */
  function showroom() {
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    FX.init(scene);
    VX.sky(scene, 0x1c1a2a, 0x3a2a40, 0x0c0a12);
    scene.add(new THREE.HemisphereLight(0xfff2e6, 0x30283a, 0.7));
    const key = new THREE.SpotLight(0xffffff, 1.3, 25, 0.5, 0.6); key.position.set(2.5, 6, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
    const rim = new THREE.PointLight(0x7cf9ff, 0.7, 12); rim.position.set(-2.5, 2.5, -2); scene.add(rim);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshLambertMaterial({ color: 0x24202e })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
    const stand = Models.stand(0xe0343f); scene.add(stand);
    const spin = new THREE.Group(); spin.position.y = 0.12; scene.add(spin);
    key.target = spin;
    let F = null, build = null, t = 0;
    const V = {
      scene, camera, offset: 1.15, side: 1, wide: true,
      setFigure(b) {
        if (F) F.dispose(); build = b; F = Models.figure(b); spin.add(F.root); Anim.set(F, Anim.readyFor(b));
        F.parts.wL.visible = !KB.PARTS[b.armL.line].armL.holster;
        stand.children.forEach(m => m.material && m.material.color && 0);
      },
      update(dt) {
        t += dt; spin.rotation.y += dt * 0.5;
        if (F) { const p = Anim.idle(Anim.readyFor(build), t, build, V); Anim.drive(F, p, dt, 8); }
        const o = V.wide ? V.offset * V.side : 0;
        camera.position.set(o, 1.5, 6.8); camera.lookAt(o, 1.0, 0);
        FX.update(dt);
      },
      resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); V.wide = w > h * 1.1; },
      dispose() { if (F) F.dispose(); },
    };
    return V;
  }
  let room = null;
  function useRoom(b, side) { if (!room || App.view !== room) { room = showroom(); App.setView(room); } room.setFigure(b || activeBuild()); room.side = side || 1; return room; }

  /* attract mode behind the title and login */
  function attract() {
    if (App.view && App.view.attract) return;
    const m = Match.create({ mode: 'attract', builds: [KB.randomBuild(3), KB.randomBuild(3)], cpu: [2, 2], arena: U.pick(Arena.LIST), wins: 9, time: 999, onEnd: () => setTimeout(() => { if (App.view === m) { App.view = null; attract(); } }, 0) });
    App.setView(m);
  }

  const Menu = {
    toast: (t, c) => toast(t, c),
    ui: { btn: (...a) => btn(...a), topbar: (...a) => topbar(...a) },
    /* phones: fill the screen and hold landscape, where the browser allows it (Android; iPhone Safari can't) */
    fullscreen() {
      if (!U.touch || document.fullscreenElement) return;
      const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen;
      if (!req) return;
      try { const p = req.call(d, { navigationUI: 'hide' }); if (p && p.then) p.then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {}); } catch (e) { /* not allowed: fine */ }
    },
    /* ----------------------------------------------------------- title */
    title() {
      attract(); Music.play('title');
      const s = el('div', { class: 'screen title' },
        el('div', { class: 'titlewrap' }, logo('l-big'), el('div', { class: 'tag' }, 'ACTION FIGURE ARENA FIGHTER'),
          el('div', { class: 'press' }, U.touch ? 'TAP TO START' : 'PRESS ANY KEY OR BUTTON')),
        el('div', { class: 'foot' }, 'Knock them into a wall. They bounce back. Hit them again.'));
      App.screen(s);
      const go = () => { off(); s.removeEventListener('pointerdown', go); SFX.play('ok'); Menu.fullscreen(); if (Auth.resume()) Menu.afterLogin(false); else Menu.login(); };
      const off = Input.onAny(go); s.addEventListener('pointerdown', go);
    },
    /* ----------------------------------------------------------- log in */
    login(tab) {
      attract(); tab = tab || (Auth.list().length ? 'in' : 'new');
      const err = el('div', { class: 'err' });
      const name = el('input', { type: 'text', maxlength: 16, placeholder: 'Collector name', autocomplete: 'username' });
      const pw = el('input', { type: 'password', maxlength: 64, placeholder: 'Password', autocomplete: tab === 'new' ? 'new-password' : 'current-password' });
      const rem = el('input', { type: 'checkbox', checked: true });
      const submit = async () => {
        err.textContent = '';
        const r = tab === 'new' ? await Auth.register(name.value, pw.value, rem.checked) : await Auth.login(name.value, pw.value, rem.checked);
        if (r.err) { err.textContent = r.err; SFX.play('back'); return; }
        SFX.play('coin'); Menu.afterLogin(r.fresh);
      };
      [name, pw].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
      const accounts = Auth.list();
      const s = el('div', { class: 'screen login' },
        el('div', { class: 'loginleft' }, logo('l-mid'), el('div', { class: 'tag' }, 'ACTION FIGURE ARENA FIGHTER')),
        el('div', { class: 'panel loginp' },
          el('div', { class: 'tabs' },
            el('button', { class: tab === 'in' ? 'on' : '', onclick: () => Menu.login('in') }, 'LOG IN'),
            el('button', { class: tab === 'new' ? 'on' : '', onclick: () => Menu.login('new') }, 'NEW COLLECTOR')),
          tab === 'in' && accounts.length ? el('div', { class: 'acclist' }, el('small', null, 'ON THIS DEVICE'), ...accounts.slice(0, 6).map(a => el('button', { class: 'chip', onclick: () => { name.value = a.user; pw.focus(); } }, a.user))) : null,
          tab === 'new' ? el('p', { class: 'note' }, 'Make a collector to keep your figures, parts and Tokens. Everything is saved in this browser only.') : null,
          el('label', null, 'NAME', name), el('label', null, 'PASSWORD', pw),
          el('label', { class: 'check' }, rem, ' Keep me signed in'),
          err, btn(tab === 'new' ? 'CREATE COLLECTOR' : 'LOG IN', submit, 'big wide'),
          el('p', { class: 'fine' }, 'Saved locally; not a secure account. Don\'t reuse an important password.')));
      App.screen(s); setTimeout(() => (accounts.length && tab === 'in' ? pw : name).focus(), 50);
    },
    afterLogin(fresh) {
      if (!S().starter) return Menu.starter();
      const bonus = Auth.daily();
      Menu.hub(); if (bonus) toast('DAILY BONUS  +' + bonus + ' TOKENS', 'gold');
    },
    /* -------------------------------------------------- pick a starter */
    starter() {
      Music.play('menu');
      const packs = KB.LINE_ORDER.map(line => {
        const L = KB.LINES[line], b = KB.mintBuild(line, 0);
        return el('button', { class: 'blister', style: { '--lc': L.css }, onclick: () => pick(line) },
          el('div', { class: 'bl-top' }, logo('l-tiny'), el('span', null, L.name)),
          el('div', { class: 'bl-bubble' }, el('img', { src: Models.figIcon(b), alt: L.figure })),
          el('div', { class: 'bl-name' }, L.figure), el('div', { class: 'bl-blurb' }, L.blurb));
      });
      const pick = line => {
        const L = KB.LINES[line];
        const close = modal(el('div', { class: 'confirm' }, el('h2', null, 'Open ' + L.figure + '?'),
          el('p', null, 'You get the full ', el('b', null, L.name), ' set (all six parts, Standard), and 1,500 Tokens for the Capsule Machine.'),
          btn('OPEN THE BOX', () => { close(); Auth.starter(line); SFX.play('reveal', { r: 2 }); Menu.offerTutorial(); }, 'big')));
      };
      App.screen(el('div', { class: 'screen starter' }, el('h1', null, 'CHOOSE YOUR FIRST FIGURE'),
        el('p', { class: 'sub' }, 'Every figure is six snap-on parts. Mix lines later with parts from the Capsule Machine.'),
        el('div', { class: 'packs' }, ...packs)));
    },
    /* a new collector: the tutorial, played for real (tutorial.js), or straight to the hub */
    offerTutorial() {
      useRoom(activeBuild());
      App.screen(el('div', { class: 'screen tutoffer' },
        el('div', { class: 'panel tutofferp' },
          el('small', null, 'NEW COLLECTOR'),
          el('h2', null, 'LEARN TO FIGHT?'),
          el('p', null, 'A quick tutorial, played for real with ', el('b', null, activeBuild().name), ' against a training dummy: moving, your string, the wall bounce, guarding, grabs, and everything else, one lesson at a time. About five minutes. Finish it for ', el('b', null, '+900 TOKENS'), '.'),
          el('div', { class: 'row' }, btn('START THE TUTORIAL', () => Tutorial.start({ onboard: true }), 'big'), btn('SKIP FOR NOW', () => Menu.afterTutorial(false), 'ghost')),
          el('p', { class: 'fine' }, 'It is always in the hub (TUTORIAL) if you skip it.'))));
    },
    afterTutorial(finished) {
      Menu.hub();
      setTimeout(() => toast('+1,500 TOKENS · Try the CAPSULES!', 'gold'), 300);
      if (!finished) setTimeout(() => toast('The TUTORIAL is in the hub whenever you want it.'), 1600);
    },
    activeBuild: () => activeBuild(),
    paintRow, myPaint,
    /* -------------------------------------------------------------- hub */
    hub() {
      Music.play('menu'); useRoom(activeBuild(), -1);
      const b = activeBuild(), st = KB.stats(b);
      const item = (label, sub, fn, cls) => el('button', { class: 'hubbtn ' + (cls || ''), onclick: () => { SFX.play('ok'); fn(); } }, el('b', null, label), el('small', null, sub));
      App.screen(el('div', { class: 'screen hub' },
        el('div', { class: 'topbar' }, logo('l-small'), el('div', { class: 'grow' }), el('div', { class: 'tokens', id: 'tok' }, el('i', { class: 'coin' }), U.fmt(S().tokens)),
          el('div', { class: 'who' }, Auth.user.user), btn('LOG OUT', () => { Auth.logout(); Menu.login('in'); }, 'ghost small')),
        el('div', { class: 'hubmenu' },
          item('ARCADE', 'Six figures in a row. Big token rewards.', () => Menu.arcade(), 'hot'),
          item('VERSUS', 'Against the CPU, a friend on one keyboard / two pads, or watch CPU vs CPU.', () => Menu.versus()),
          item('ONLINE', 'Rooms of up to six, public or private: fight, watch, wait your turn.', () => Online.open(), 'hot'),
          item('REPLAYS', 'Your online fights and the ones you watched: watch again, keep, share.', () => Online.replays()),
          item('TUTORIAL', Tutorial.done() ? 'Fourteen lessons, played for real. Again any time.' : 'New here? Fourteen lessons, played for real. +900 tokens.', () => Tutorial.start(), Tutorial.done() ? '' : 'hot'),
          item('TRAINING', 'A dummy, full meters, every system to practise.', () => Menu.training()),
          item('COMBO TRIALS', 'Every fighter\'s combos, step by step, with a demo.', () => Trials.open()),
          item('WORKSHOP', 'Snap parts together on your custom slots: A and B, and four more to unlock.', () => Menu.workshop()),
          (() => { const n = Rewards.ready(); const b = item('REWARDS', n ? n + ' ready to claim · daily and weekly jobs, fighter mastery, milestones, awards' : 'Daily and weekly jobs, fighter mastery, milestones and awards.', () => Rewards.screen(), n ? 'gold' : ''); if (n) b.append(el('em', { class: 'badge' }, n)); return b; })(),
          item('CAPSULES', 'Spend tokens on blind capsules of parts and cards.', () => Menu.capsules(), 'gold'),
          item('SHELF', 'Your collection and records.', () => Menu.shelf()),
          item('HOW TO PLAY', 'The wall bounce, and how to get out of it.', () => Menu.howto()),
          item('OPTIONS', 'Sound, controls, graphics, install the app.', () => Menu.options())),
        el('button', { class: 'plate', title: 'Change your figure', onclick: () => { SFX.play('ok'); Menu.pickActive(); } }, el('small', null, 'ACTIVE FIGURE · CHANGE ▸'), el('b', null, b.name), el('span', null, 'HP ' + st.hp + ' · ' + KB.LINES[b.core.line].name + ' core' + (st.set === 2 ? ' · MINT SET' : '')))));
    },
    /* ---------------------------------------------------------- workshop */
    workshop(slotOpen) {
      Music.play('menu');
      const Sv = S();
      // the workshop edits your custom slots only (your starter figure stays its Standard set)
      let bi = Menu._ws; if (!(bi >= 1 && bi < Sv.builds.length)) bi = Sv.active >= 1 && Sv.active < Sv.builds.length ? Sv.active : 1;
      Menu._ws = bi;
      const raw = Sv.builds[bi]; const b = Inv.levelled(raw);
      useRoom(b);
      const st = KB.stats(b);
      const rows = KB.SLOTS.map(slot => {
        const it = b[slot], P = KB.PARTS[it.line][slot];
        return el('button', { class: 'slotrow ' + rcls(it.r) + (slotOpen === slot ? ' open' : ''), style: { '--lc': KB.LINES[it.line].css }, onclick: () => Menu.workshop(slotOpen === slot ? null : slot) },
          el('img', { src: Models.icon(it.line, slot, it.r) }),
          el('div', { class: 'sr-t' }, el('small', null, KB.SLOT_NAME[slot] + ' · ' + KB.LINES[it.line].name), el('b', null, partLabel(it, slot)), el('span', { class: 'stars' }, stars(it.r) + ' ' + KB.RARITY[it.r].name)));
      });
      let picker = null;
      if (slotOpen) {
        const items = Inv.forSlot(slotOpen);
        picker = el('div', { class: 'picker' }, el('h3', null, 'YOUR ' + KB.SLOT_NAME[slotOpen] + ' PARTS (' + items.length + ')'),
          el('div', { class: 'pgrid' }, ...items.map(it => {
            const on = b[slotOpen].line === it.line && b[slotOpen].r === it.r;
            return el('button', { class: 'pcell ' + rcls(it.r) + (on ? ' on' : ''), title: KB.PARTS[it.line][slotOpen].desc, onclick: () => { raw[slotOpen] = { line: it.line, r: it.r, lv: 0 }; Auth.save(); SFX.play('snapon'); Menu.workshop(slotOpen); } },
              el('img', { src: Models.icon(it.line, slotOpen, it.r) }), el('b', null, partLabel(it)), el('small', null, stars(it.r))); })),
          el('p', { class: 'pdesc' }, KB.PARTS[b[slotOpen].line][slotOpen].desc));
      }
      const stat = (k, v, max) => el('div', { class: 'stat' }, el('span', null, k), el('div', { class: 'sbar' }, el('i', { style: { width: Math.min(100, v / max * 100) + '%' } })), el('b', null, typeof v === 'number' ? (v % 1 ? v.toFixed(2) : v) : v));
      const nameIn = el('input', { type: 'text', value: raw.name, maxlength: 22, onchange: e => { raw.name = e.target.value.trim() || 'Custom'; Auth.save(); } });
      App.screen(el('div', { class: 'screen workshop' }, topbar('WORKSHOP', () => Menu.hub()),
        el('div', { class: 'wsbody' },
          el('div', { class: 'blisterframe', style: { '--lc': KB.LINES[b.card.line].css } }, el('div', { class: 'bf-top' }, logo('l-tiny'), el('span', null, st.set === 2 ? 'MINT SET' : st.set === 1 ? 'PARTIAL SET' : 'CUSTOM')), el('div', { class: 'bf-name' }, raw.name)),
          el('div', { class: 'panel wspanel' },
            el('div', { class: 'tabs wstabs' }, ...CUSTOMS.map((c, k) => {
              const i = k + 1;
              if (i < Sv.builds.length) return el('button', { class: (i === bi ? 'on' : '') + (Sv.active === i ? ' inuse' : ''), title: Sv.active === i ? 'In use in fights' : '', onclick: () => { Menu._ws = i; Menu.workshop(); } }, Sv.builds[i].name || c.name);
              const next = i === Sv.builds.length;
              return el('button', { class: 'locked' + (next ? '' : ' far'), onclick: () => next ? Menu.unlockCustom(i) : toast('Unlock ' + CUSTOMS[Sv.builds.length - 1].name + ' first.') }, '🔒 ' + c.name, el('small', null, U.fmt(c.cost)));
            })),
            el('div', { class: 'wsuse' }, Sv.active === bi ? el('span', { class: 'inuse' }, '✓ IN USE IN FIGHTS') : btn('USE IN FIGHTS', () => { Sv.active = bi; Auth.save(); toast(raw.name + ' is your figure now.', 'gold'); Menu.workshop(slotOpen); }, 'small'),
              el('small', null, 'Your figure for Arcade, Versus and Training. Change it from the hub too.')),
            el('label', { class: 'nameedit' }, 'NAME', nameIn),
            el('div', { class: 'slots' }, ...rows),
            picker,
            el('div', { class: 'stats' },
              stat('HP', st.hp, 1300), stat('DEFENCE', Math.round(st.def * 100), 15), stat('SPEED', +st.speed.toFixed(1), 8), stat('JUMP', st.jump, 13),
              stat('WEIGHT', +st.weight.toFixed(2), 1.4), stat('GUARD', st.guard, 300), stat('AIR JUMPS', st.airJumps, 2), stat('HYPE GAIN', +st.hypeGain.toFixed(2), 1.6)),
            el('div', { class: 'wsfoot' }, el('span', { class: 'setb' }, st.set === 2 ? 'MINT SET: +8% damage, +6% HP' : st.set === 1 ? 'PARTIAL SET (3+ parts match the card): +4% damage' : 'Match 3+ parts to your Legend Card\'s line for a set bonus'),
              btn('MOVE LIST', () => modal(HUD.moveList(b, 0)), 'small'))))));
    },
    /* a new custom slot: it starts as your starter's set, ready to rebuild */
    unlockCustom(i) {
      const Sv = S(), c = CUSTOMS[i - 1]; if (!c || i !== Sv.builds.length) return;
      const can = Sv.tokens >= c.cost;
      const close = modal([el('h2', null, 'UNLOCK ' + c.name.toUpperCase()),
        el('p', { class: 'note' }, 'Another build slot in the Workshop to snap parts together on. It starts as your ' + KB.LINES[starterLine()].name + ' set.'),
        el('p', { class: 'note' }, el('i', { class: 'coin' }), ' ' + U.fmt(c.cost) + ' tokens · you have ' + U.fmt(Sv.tokens)),
        el('div', { class: 'row' }, btn(can ? 'UNLOCK FOR ' + U.fmt(c.cost) : 'NOT ENOUGH TOKENS', () => {
          if (Sv.tokens < c.cost || i !== Sv.builds.length) return;
          Sv.tokens -= c.cost; Sv.builds.push(Object.assign(KB.mintBuild(starterLine(), 0), { name: c.name })); Auth.save();
          close(); SFX.play('reveal', { r: 1 }); toast(c.name + ' unlocked!', 'gold'); Menu._ws = i; Menu.workshop();
        }, 'big' + (can ? '' : ' off')))]);
    },
    /* the figure you fight with (the hub's plate): your starter or any custom slot */
    pickActive() {
      const Sv = S();
      const close = modal([el('h2', null, 'YOUR FIGURE'), el('p', { class: 'note' }, 'The figure you take into Arcade, Versus and Training. Build your custom slots in the Workshop.'),
        el('div', { class: 'actpick' }, ...Sv.builds.map((x, i) => { const lb = Inv.levelled(x);
          return el('button', { class: 'actfig' + (i === (Sv.active || 0) ? ' on' : ''), style: { '--lc': KB.LINES[lb.core.line].css }, onclick: () => { Sv.active = i; Auth.save(); close(); Menu.hub(); } },
            el('img', { src: Models.figIcon(lb), alt: '' }), el('b', null, lb.name), el('small', null, i === 0 ? 'Starter · ' + KB.LINES[lb.core.line].name + ' set' : 'Custom · ' + KB.LINES[lb.core.line].name + ' core')); }))]);
    },
    /* ---------------------------------------------------------- capsules */
    capsules(bannerIdx) {
      Music.play('gacha');
      const V = (App.view && App.view.isGacha) ? App.view : Object.assign(Gacha.view(), { isGacha: true });
      if (App.view !== V) App.setView(V);
      const B = Gacha.banners(), bi = bannerIdx || 0, ban = B[bi], P = S().pity;
      const canPay = n => S().tokens >= Gacha.COST[n];
      const ticket = () => {
        if (!(S().tickets > 0) || V.busy()) { SFX.play('back'); return; }
        S().tickets--; Auth.save(); SFX.play('coin');
        const res = Gacha.roll(ban, 1); Rewards.record({ capsules: 1, chases: res.filter(o => o.r === 3).length }); Menu.reveal(V, res, () => Menu.capsules(bi));
      };
      const pull = n => {
        if (!canPay(n) || V.busy()) { SFX.play('back'); toast('Not enough tokens. Win fights to earn more.', 'bad'); return; }
        S().tokens -= Gacha.COST[n]; Auth.save(); SFX.play('coin');
        const res = Gacha.roll(ban, n); Rewards.record({ capsules: n, chases: res.filter(o => o.r === 3).length }); Menu.reveal(V, res, () => Menu.capsules(bi));
      };
      const rates = () => modal(el('div', { class: 'rates' }, el('h2', null, 'CAPSULE RATES'),
        ...KB.RARITY.map((R, i) => el('div', { class: 'rrow ' + rcls(i) }, el('b', null, stars(i) + ' ' + R.name), el('span', null, (Gacha.RATES[i] * 100).toFixed(1) + '%'), el('small', null, ['base colours', 'chrome trim, +4% stats', 'gold edition, +8% stats', 'dark body, glowing trim, +12% stats'][i]))),
        el('p', null, 'A 10-pull always has at least one LIMITED or better. The ' + Gacha.PITY + 'th pull without a CHASE is always a CHASE. Duplicates level a part up (+2% each, up to +5); after that they refund tokens. Legend Cards are a little rarer than parts.')));
      App.screen(el('div', { class: 'screen capsules' }, topbar('CAPSULES', () => { App.setView(null); Menu.hub(); }),
        el('div', { class: 'capbody' },
          el('div', { class: 'banners' }, ...B.map((x, i) => el('button', { class: 'banner-tab' + (i === bi ? ' on' : ''), style: { '--lc': x.line ? KB.LINES[x.line].css : '#9aa4b2' }, onclick: () => Menu.capsules(i) }, el('b', null, x.name), el('small', null, x.desc)))),
          el('div', { class: 'panel cappanel' },
            el('div', { class: 'pullrow' },
              el('button', { class: 'pullbtn' + (canPay(1) ? '' : ' off'), onclick: () => pull(1) }, el('b', null, 'PULL ×1'), el('span', null, el('i', { class: 'coin' }), Gacha.COST[1])),
              el('button', { class: 'pullbtn ten' + (canPay(10) ? '' : ' off'), onclick: () => pull(10) }, el('b', null, 'PULL ×10'), el('span', null, el('i', { class: 'coin' }), Gacha.COST[10]), el('small', null, 'LIMITED+ guaranteed')),
              S().tickets > 0 ? el('button', { class: 'pullbtn tix', onclick: () => ticket() }, el('b', null, 'TICKET ×1'), el('span', null, '🎟 ' + S().tickets + ' left'), el('small', null, 'a free capsule')) : null),
            el('div', { class: 'pity' }, 'CHASE pity ', el('b', null, P.sinceChase + ' / ' + Gacha.PITY), ' · total pulls ' + P.total, ' · ', el('a', { href: '#', onclick: e => { e.preventDefault(); rates(); } }, 'rates')),
            el('div', { class: 'collected' }, 'Collection ' + Inv.count() + ' / ' + Inv.total())))));
    },
    reveal(V, res, done) {
      const cap = el('div', { class: 'revealcap' }), hint = el('div', { class: 'revealhint' }, 'CLICK / ANY KEY: next');
      const skip = res.length > 1 ? btn('SKIP ▸▸', () => V.skipAll(), 'ghost small skipbtn') : null;
      const ov = el('div', { class: 'screen revealscr' }, cap, hint, skip);
      App.screen(ov);
      const adv = () => V.advance(); ov.addEventListener('pointerdown', e => { if (e.target.closest('.skipbtn')) return; adv(); }); const off = Input.onAny(adv);
      V.play(res, (i, it) => {
        cap.className = 'revealcap show ' + rcls(it.r);
        cap.innerHTML = '';
        cap.append(el('div', { class: 'rc-st' }, stars(it.r) + '  ' + KB.RARITY[it.r].name),
          el('div', { class: 'rc-name' }, it.slot === 'card' ? KB.PARTS[it.line].card.name : KB.itemName(it.line, it.slot)),
          el('div', { class: 'rc-sub' }, KB.LINES[it.line].name + ' · ' + KB.SLOT_NAME[it.slot] + '  (' + (i + 1) + '/' + res.length + ')'),
          el('div', { class: 'rc-tag' }, it.isNew ? 'NEW!' : it.lvUp ? 'LEVEL UP  +' + it.lv : it.refund ? 'MAXED  +' + it.refund + ' TOKENS' : ''));
      }, () => {
        off();
        if (res.length === 1) { done(); return; }
        App.screen(el('div', { class: 'screen results10' }, el('div', { class: 'panel' }, el('h2', null, 'YOUR CAPSULES'),
          el('div', { class: 'r10grid' }, ...res.map(it => el('div', { class: 'r10 ' + rcls(it.r) }, el('img', { src: Models.icon(it.line, it.slot, it.r) }), el('b', null, it.slot === 'card' ? KB.PARTS[it.line].card.name : KB.itemName(it.line, it.slot)), el('small', null, stars(it.r)), el('em', null, it.isNew ? 'NEW' : it.lvUp ? '+' + it.lv : it.refund ? '+' + it.refund : '')))),
          btn('CONTINUE', done, 'big'))));
      });
    },
    /* ------------------------------------------------------------ shelf */
    shelf() {
      Music.play('menu'); useRoom(activeBuild());
      const R = S().records;
      const grid = el('div', { class: 'shelfgrid' }, el('div'), ...KB.SLOTS.map(s => el('div', { class: 'sh-h' }, KB.SLOT_NAME[s])),
        ...KB.LINE_ORDER.flatMap(line => [el('div', { class: 'sh-line', style: { '--lc': KB.LINES[line].css } }, KB.LINES[line].name),
          ...KB.SLOTS.map(slot => {
            let best = -1; for (let r = 3; r >= 0; r--) if (Inv.has(line, slot, r)) { best = r; break; }
            const dots = el('div', { class: 'sh-dots' }, ...[0, 1, 2, 3].map(r => el('i', { class: rcls(r) + (Inv.has(line, slot, r) ? ' on' : '') })));
            return el('div', { class: 'sh-cell ' + (best >= 0 ? rcls(best) : 'none'), title: KB.itemName(line, slot) + (slot === 'card' ? '' : ' — ' + KB.PARTS[line][slot].desc) },
              best >= 0 ? el('img', { src: Models.icon(line, slot, best) }) : el('div', { class: 'q' }, '?'), el('small', null, best >= 0 ? KB.itemName(line, slot) : '???'), dots);
          })]));
      App.screen(el('div', { class: 'screen shelf' }, topbar('SHELF', () => Menu.hub()),
        el('div', { class: 'panel shelfp' },
          el('div', { class: 'recs' }, ...[['WINS', R.wins], ['LOSSES', R.losses], ['ARCADE CLEARS', R.arcadeClears], ['BEST COMBO', R.bestCombo], ['MOST BOUNCES', R.maxBounces], ['WALL BREAKS', R.wallBreaks], ['COLLECTION', Inv.count() + '/' + Inv.total()]].map(([k, v]) => el('div', null, el('small', null, k), el('b', null, v)))),
          grid)));
    },
    /* ----------------------------------------------------------- versus
       Three ways to fight: you against the CPU, two players, or CPU vs CPU (watch). */
    versus(cfg) {
      Music.play('menu');
      cfg = cfg || Menu._vs || (S().vs ? Object.assign({}, S().vs) : null) || { mode: 'cpu', p1: S().active || 0, p2: 'random', p2b: 0, lvl: 1, w1: 'random', w2: 'random', l1: 2, l2: 2, arena: 'random', wins: 2, bonus: true };
      Menu._vs = cfg; S().vs = Object.assign({}, cfg); if (S().vs.p1 >= S().builds.length) S().vs.p1 = 0; Auth.save();
      const mine = S().builds, watch = cfg.mode === 'watch', two = cfg.mode === 'two';
      const opp = [['random', 'Random figure'], ...KB.LINE_ORDER.map(l => [l, KB.LINES[l].figure])];
      const anyFig = [['random', 'Random'], ...mine.map((b, i) => ['mine:' + i, 'Your ' + b.name]), ...KB.LINE_ORDER.map(l => [l, KB.LINES[l].name])];
      const lvls = AI.LEVELS.map((n, i) => [i, n]);
      useRoom(watch ? (String(cfg.w1).startsWith('mine:') ? Inv.levelled(mine[+cfg.w1.slice(5)]) : cfg.w1 !== 'random' ? KB.mintBuild(cfg.w1, 0) : activeBuild()) : painted(Inv.levelled(mine[cfg.p1]), myPaint()));
      const p2line = String(cfg.p2b).startsWith('mint:') ? cfg.p2b.slice(5) : (mine[+cfg.p2b] || mine[0]).core.line;
      const seg = (label, val, opts, set) => el('div', { class: 'seg' }, el('span', null, label), el('div', null, ...opts.map(([v, t]) => el('button', { class: String(val) === String(v) ? 'on' : '', onclick: () => { set(v); Menu.versus(cfg); } }, t))));
      App.screen(el('div', { class: 'screen versus' }, topbar('VERSUS', () => Menu.hub()),
        el('div', { class: 'panel vspanel' },
          seg('MODE', cfg.mode, [['cpu', 'VS CPU'], ['two', '2 PLAYERS'], ['watch', 'CPU VS CPU']], v => { cfg.mode = v; if (v === 'two') cfg.bonus = false; }),
          watch ? [
            seg('CPU 1 FIGURE', cfg.w1, anyFig, v => cfg.w1 = v), seg('CPU 1 LEVEL', cfg.l1, lvls, v => cfg.l1 = +v),
            seg('CPU 2 FIGURE', cfg.w2, anyFig, v => cfg.w2 = v), seg('CPU 2 LEVEL', cfg.l2, lvls, v => cfg.l2 = +v),
          ] : [
            seg('P1 FIGURE', cfg.p1, mine.map((b, i) => [i, b.name]), v => cfg.p1 = +v),
            paintRow('P1 COLOURS', myPaint(), (mine[cfg.p1] || mine[0]).core.line, k => { S().paint = k; Auth.save(); }, () => Menu.versus(cfg)),
            two ? seg('P2 FIGURE', cfg.p2b, [...mine.map((b, i) => [i, 'Your ' + b.name]), ...KB.LINE_ORDER.map(l => ['mint:' + l, KB.LINES[l].name])], v => cfg.p2b = v)
              : seg('OPPONENT', cfg.p2, opp, v => cfg.p2 = v),
            two ? paintRow('P2 COLOURS', cfg.c2, p2line, k => { cfg.c2 = k; }, () => Menu.versus(cfg)) : null,
            two ? null : seg('CPU LEVEL', cfg.lvl, lvls, v => cfg.lvl = +v),
          ],
          seg('ARENA', cfg.arena, [['random', 'Random'], ...Arena.LIST.map(a => [a, Arena.THEMES[a].name])], v => cfg.arena = v),
          seg('ROUNDS', cfg.wins, [[1, 'First to 1'], [2, 'First to 2'], [3, 'First to 3']], v => cfg.wins = +v),
          seg('RARITY BONUS', cfg.bonus, [[true, 'On'], [false, 'Off (fair)']], v => cfg.bonus = v === true || v === 'true'),
          two ? el('p', { class: 'note' }, 'P1: arrows + Z X C / A S D / F, Space, L-Shift · P2: I J K L + Numpad 1-7, Num 0, Num . (or , . / ; \' ] R-Shift \\) · Controllers: the first pad is P1, the second P2 (swap them, and rebind anything, in OPTIONS).') : null,
          watch ? el('p', { class: 'note' }, 'Sit back and watch two CPUs fight. Random figures are re-rolled every fight. Esc pauses. No tokens for watching.') : null,
          btn(watch ? 'WATCH!' : 'FIGHT!', () => Menu.versusStart(cfg), 'big wide fight'))));
    },
    versusStart(cfg) {
      const mine = S().builds;
      const pick = (v, lvl) => v === 'random' ? KB.randomBuild(Math.min(3, lvl)) : String(v).startsWith('mine:') ? Inv.levelled(mine[+v.slice(5)]) : KB.mintBuild(v, Math.min(3, lvl));
      const arena = cfg.arena === 'random' ? U.pick(Arena.LIST) : cfg.arena;
      if (cfg.mode === 'watch') {
        App.startMatch({ mode: 'watch', builds: [pick(cfg.w1, cfg.l1), pick(cfg.w2, cfg.l2)], cpu: [cfg.l1, cfg.l2], arena, wins: cfg.wins, bonus: cfg.bonus, cfg });
        return;
      }
      const b1 = painted(Inv.levelled(mine[cfg.p1]), myPaint());
      let b2;
      if (cfg.mode === 'two') b2 = painted(String(cfg.p2b).startsWith('mint:') ? KB.mintBuild(cfg.p2b.slice(5), 0) : Inv.levelled(mine[+cfg.p2b]), cfg.c2);
      else b2 = cfg.p2 === 'random' ? KB.randomBuild(Math.min(3, cfg.lvl)) : KB.mintBuild(cfg.p2, Math.min(3, cfg.lvl));
      App.startMatch({ mode: cfg.mode === 'two' ? 'versus' : 'cpu', builds: [b1, b2], cpu: [null, cfg.mode === 'two' ? null : cfg.lvl], arena, wins: cfg.wins, bonus: cfg.bonus, lvl: cfg.lvl });
    },
    /* ----------------------------------------------------------- arcade */
    arcade() {
      Music.play('menu'); useRoom(activeBuild());
      const ladder = Menu.ladder();
      const run = Menu._arc || null;
      const stage = run ? run.stage : 0;
      App.screen(el('div', { class: 'screen arcade' }, topbar('ARCADE', () => Menu.hub()),
        el('div', { class: 'panel arcp' },
          el('p', { class: 'note' }, 'Six figures, each tougher than the last. The last one is a CHASE variant. Lose a fight and you can retry it.'),
          el('div', { class: 'ladder' }, ...ladder.map((L, i) => el('div', { class: 'rung' + (i < stage ? ' done' : i === stage ? ' next' : ''), style: { '--lc': KB.LINES[L.line].css } },
            el('img', { src: Models.figIcon(L.build) }), el('b', null, (i + 1) + '. ' + L.build.name), el('small', null, AI.LEVELS[L.lvl] + ' · ' + stars(L.r) + ' · +' + L.reward)))),
          el('div', { class: 'row' }, btn(run ? 'CONTINUE: STAGE ' + (stage + 1) : 'START', () => Menu.arcadeFight(), 'big fight'), run ? btn('NEW RUN', () => { Menu._arc = null; Menu.arcade(); }, 'ghost') : null))));
    },
    ladder() {
      if (!Menu._ladder) {
        const lines = U.shuffle(KB.LINE_ORDER.slice()).slice(0, 6);
        Menu._ladder = lines.map((line, i) => { const r = [0, 0, 1, 1, 2, 3][i]; const b = KB.mintBuild(line, r); if (i === 5) b.name = 'CHASE ' + KB.LINES[line].figure; return { line, r, lvl: [0, 1, 1, 2, 2, 3][i], build: b, reward: 60 + i * 40, arena: Arena.LIST[i % 3] }; });
      }
      return Menu._ladder;
    },
    arcadeFight() {
      Menu._arc = Menu._arc || { stage: 0 };
      const L = Menu.ladder()[Menu._arc.stage];
      App.startMatch({ mode: 'arcade', builds: [painted(activeBuild(), myPaint()), L.build], cpu: [null, L.lvl], arena: L.arena, wins: 2, bonus: true, lvl: L.lvl, stage: Menu._arc.stage });
    },
    /* --------------------------------------------------------- training */
    /* TRAINING: pick yourself (your figures, or any base fighter), the dummy and the arena (it remembers them) */
    training(cfg) {
      Music.play('menu');
      const Sv = S(), mine = Sv.builds;
      cfg = cfg || Menu._tr || (Sv.train ? Object.assign({}, Sv.train) : null) || { p: 'mine:' + (Sv.active || 0), d: 'random', arena: 'shelf' };
      if (String(cfg.p).startsWith('mine:') && !mine[+cfg.p.slice(5)]) cfg.p = 'mine:0';
      if (!Arena.LIST.includes(cfg.arena)) cfg.arena = 'shelf';
      Menu._tr = cfg;
      const buildFor = k => String(k).startsWith('mint:') ? KB.mintBuild(k.slice(5), 0) : Inv.levelled(mine[+String(k).slice(5)] || mine[0]);
      useRoom(painted(buildFor(cfg.p), myPaint()));
      const tile = (on, b, top, sub, pick) => el('button', { class: 'olpick' + (on ? ' on' : ''), style: { '--lc': b ? KB.LINES[b.core.line].css : '#9aa4b2' }, onclick: () => { SFX.play('ok'); pick(); Menu.training(cfg); } },
        b ? el('img', { src: Models.figIcon(b), alt: '' }) : el('div', { class: 'olq' }, '?'), el('b', null, top), el('small', null, sub));
      const seg = (label, val, opts, set) => el('div', { class: 'seg' }, el('span', null, label), el('div', null, ...opts.map(([v, t]) => el('button', { class: String(val) === String(v) ? 'on' : '', onclick: () => { set(v); Menu.training(cfg); } }, t))));
      App.screen(el('div', { class: 'screen training' }, topbar('TRAINING', () => Menu.hub()),
        el('div', { class: 'panel vspanel' },
          el('div', { class: 'olselect' }, el('h3', null, 'YOU'),
            el('small', { class: 'olsub' }, 'YOUR FIGURES'),
            el('div', { class: 'olgrid' }, ...mine.map((b, i) => { const lb = Inv.levelled(b); return tile(cfg.p === 'mine:' + i, lb, lb.name, i === 0 ? 'Your starter' : 'Custom · ' + KB.LINES[lb.core.line].name, () => { cfg.p = 'mine:' + i; }); })),
            el('small', { class: 'olsub' }, 'BASE FIGHTERS'),
            el('div', { class: 'olgrid' }, ...KB.LINE_ORDER.map(l => tile(cfg.p === 'mint:' + l, KB.mintBuild(l, 0), KB.LINES[l].name, 'Standard set', () => { cfg.p = 'mint:' + l; }))),
            paintRow('COLOURS', myPaint(), buildFor(cfg.p).core.line, k => { S().paint = k; Auth.save(); }, () => Menu.training(cfg))),
          el('div', { class: 'olselect' }, el('h3', null, 'THE DUMMY'),
            el('div', { class: 'olgrid' }, tile(cfg.d === 'random', null, 'RANDOM', 'a new one each time', () => { cfg.d = 'random'; }),
              ...KB.LINE_ORDER.map(l => tile(cfg.d === 'mint:' + l, KB.mintBuild(l, 0), KB.LINES[l].name, 'Standard set', () => { cfg.d = 'mint:' + l; })))),
          seg('ARENA', cfg.arena, Arena.LIST.map(a => [a, Arena.THEMES[a].name]), v => { cfg.arena = v; }),
          el('p', { class: 'note' }, 'In training: health comes back the moment a combo ends; R resets, T saves the position you\'re in (or the buttons in the TRAINING panel; on a pad, tap Back to reset and hold it to save). CHARACTER SELECT in the pause menu brings you back here.'),
          btn('START TRAINING', () => Menu.trainingStart(cfg), 'big wide fight'))));
    },
    trainingStart(cfg) {
      cfg = cfg || Menu._tr; const Sv = S(); Sv.train = Object.assign({}, cfg); Auth.save();
      const mine = Sv.builds, me = String(cfg.p).startsWith('mint:') ? KB.mintBuild(cfg.p.slice(5), 0) : Inv.levelled(mine[+String(cfg.p).slice(5)] || mine[0]);
      const dummy = cfg.d === 'random' || !String(cfg.d).startsWith('mint:') ? U.pick(KB.LINE_ORDER) : cfg.d.slice(5);
      App.startMatch({ mode: 'training', builds: [painted(me, myPaint()), KB.mintBuild(dummy, 0)], cpu: [null, null], arena: cfg.arena || 'shelf', wins: 99, time: 999, bonus: true });
    },
    /* ---------------------------------------------------------- how to */
    howto() {
      useRoom(activeBuild());
      const sec = (h, ...p) => el('div', { class: 'howsec' }, el('h3', null, h), ...p.map(x => el('p', null, x)));
      App.screen(el('div', { class: 'screen howto' }, topbar('HOW TO PLAY', () => Menu.hub()),
        el('div', { class: 'panel howp' },
          el('div', { class: 'row' }, btn(Tutorial.done() ? 'PLAY THE TUTORIAL AGAIN' : 'PLAY THE TUTORIAL', () => Tutorial.start(), 'big')),
          sec('THE GIMMICK: KNOCK//BACK', 'Launch someone into a wall fast enough and they BOUNCE back off it, still helpless. Keep hitting them. Every bounce in a combo hits harder. Hold a direction as a launcher lands to aim it at a wall.'),
          sec('THE WALL CAN BREAK', 'Each bounce cracks the wall (watch the cracks, and the wall map under the timer). When it gives out, or on a 4th bounce in one combo, it is a WALL BREAK: big damage, they fly out of the arena (RING OUT), and you get MOMENTUM (+10% damage, faster Hype). The wall snaps back after a few seconds.'),
          sec('MOVING', 'DOWN DASH: hold Guard and press Dodge in the air to dive straight to the floor, steering with the stick. It uses your air dodge and gives no invincibility: it is for getting back down fast (to carry on a combo, or to get out of a juggle you saw coming).'),
          sec('GETTING OUT OF IT', 'SPRING BURST: press Snap while being hit with a full Burst gauge to blow them away. If they are guarding, it is blocked: they can bait it.', 'WALL TECH: from the second bounce of a combo, press Dodge just before you hit the wall to kick off it. Mashing locks you out for a moment.', 'Combos DECAY: each hit is worth less, hitstun shortens and gravity grows the longer a combo runs. QUICK RISE: Dodge as you land. RECOVER: any button once hitstun ends in the air.'),
          sec('YOUR PARTS', 'Your figure is six parts. HEAD gives the Special (3 uses a round, one comes back every 16 s). R-ARM is your Light string. L-ARM is the Heavy KNOCK, the Launcher and your guard. LEGS: speed, jumps, the dash attack. CORE: HP. LEGEND CARD: the super (Legend Art, 100 Hype).', 'Limbs have armour: break it and the part POPS OFF the figure. Walk over it to SNAP it back on. Broken arms fall back on weak stump attacks; no head, no Special; cracked legs slow you down.'),
          sec('OFFENCE', 'Light string, then Heavy to launch, then Jump to follow and air Lights; air Heavy spikes for a ground bounce. Hold Heavy to charge a KNOCK. Guard + Light is a throw. Snap Cancel (Snap, 50 Hype) cancels any move\'s recovery to keep a combo going. Hitting someone as they start a move is a COUNTER.'),
          HUD.moveList(activeBuild(), 0))));
    },
    /* ---------------------------------------------------------- options */
    options() {
      useRoom(activeBuild());
      const vol = k => el('label', { class: 'vol' }, k.toUpperCase(), el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: SFX.vol[k], oninput: e => SFX.setVol(k, +e.target.value) }));
      // the keyboard: two keys an action, a key can only do one thing
      const keyBtn = (pi, a, slot) => {
        const code = (Input.binds[pi][a] || [])[slot];
        return el('button', { class: 'kbtn' + (code ? '' : ' empty'), onclick: e => { e.currentTarget.textContent = 'press a key…'; e.currentTarget.classList.add('wait'); Input.rebind(pi, a, () => Menu.options(), slot); } }, code ? Input.keyName(code) : '+');
      };
      const table = pi => el('div', { class: 'binds' }, el('h3', null, 'PLAYER ' + (pi + 1)),
        ...['up', 'down', 'left', 'right', ...Input.ACTIONS].map(a => el('div', { class: 'brow' }, el('span', null, Input.LABEL[a]), el('div', { class: 'kslots' }, keyBtn(pi, a, 0), keyBtn(pi, a, 1)))));
      // controllers
      const pads = Input.pads(), vsOf = n => (Input.settings.swap ? [1, 0] : [0, 1])[n] ?? -1;
      const typeOf = pi => { const p = pads.find(q => vsOf(q.n) === pi) || pads[0]; return p ? p.type : 'xbox'; };
      const padBtn = (pi, a) => { const b = Input.padBinds[pi][a]; return el('button', { class: 'kbtn pbtn', onclick: e => { e.currentTarget.textContent = 'press a button…'; e.currentTarget.classList.add('wait'); Input.rebindPad(pi, a, () => Menu.options()); } }, b == null ? '—' : glyph(typeOf(pi), b)); };
      const padTable = pi => el('div', { class: 'binds' }, el('h3', null, 'PLAYER ' + (pi + 1) + ' PAD'),
        ...Input.ACTIONS.map(a => el('div', { class: 'brow' }, el('span', null, Input.LABEL[a]), padBtn(pi, a))));
      const padList = el('div', { class: 'padlist' });
      const drawPads = () => {
        const P = Input.pads(); padList.innerHTML = '';
        if (!P.length) { padList.append(el('div', { class: 'padcard none' }, el('b', null, 'NO CONTROLLER FOUND'), el('span', null, 'Plug one in (or switch it on) and press any button on it.'))); return; }
        for (const p of P) padList.append(el('div', { class: 'padcard t-' + p.type },
          el('b', null, Input.padName(p.type)), el('span', { class: 'pid' }, p.id.replace(/\(.*?\)/g, '').slice(0, 48) + (p.standard ? '' : ' · custom layout')),
          el('span', { class: 'who' }, vsOf(p.n) >= 0 ? (P.length > 1 ? 'P' + (vsOf(p.n) + 1) + ' IN VERSUS' : 'PLAYER 1') : 'SPARE'),
          el('div', { class: 'live' }, ...(p.pressed.length ? p.pressed.map(i => glyph(p.type, i)) : [el('small', null, 'press buttons to test')]))));
      };
      drawPads();
      const timer = setInterval(() => { if (!document.body.contains(padList)) { clearInterval(timer); Input.cancelListen(); return; } if (!Input.listeningPad) drawPads(); }, 120);
      const dz = el('label', { class: 'vol' }, 'STICK DEADZONE', el('input', { type: 'range', min: 0.08, max: 0.5, step: 0.02, value: Input.settings.deadzone, oninput: e => Input.setSetting('deadzone', +e.target.value) }));
      App.screen(el('div', { class: 'screen options' }, topbar('OPTIONS', () => { Input.cancelListen(); Menu.hub(); }),
        el('div', { class: 'panel optp' },
          el('div', { class: 'vols' }, vol('sfx'), vol('music')),
          el('h2', { class: 'osec' }, 'DISPLAY'),
          el('div', { class: 'seg' }, el('span', null, 'GRAPHICS'), el('div', null, ...[['auto', 'Auto'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([v, t]) =>
            el('button', { class: App.gfx.mode === v ? 'on' : '', onclick: () => { App.setGfx(v); Menu.options(); } }, t + (v === 'auto' && App.gfx.mode === 'auto' ? ' (' + App.gfx.level + ')' : ''))))),
          el('p', { class: 'note' }, 'Lower it if fights stutter on your phone: it lowers the resolution, the shadows and the particles. AUTO picks for you, and steps down by itself if a fight runs slow.'),
          el('div', { class: 'seg' }, el('span', null, 'SHOW FPS'), el('div', null, ...[[true, 'On'], [false, 'Off']].map(([v, t]) =>
            el('button', { class: App.gfx.fps === v ? 'on' : '', onclick: () => { App.setFps(v); Menu.options(); } }, t)))),
          el('div', { class: 'seg' }, el('span', null, 'SCREEN SHAKE'), el('div', null, ...[[1, 'Full'], [0.45, 'Reduced'], [0, 'Off']].map(([v, t]) =>
            el('button', { class: FX.shakeK === v ? 'on' : '', onclick: () => { FX.shakeK = v; try { localStorage.setItem('kb.shake', JSON.stringify(v)); } catch (e) { /* fine */ } Menu.options(); } }, t)))),
          el('h2', { class: 'osec' }, 'INSTALL THE GAME'),
          App.install.installed ? el('p', { class: 'note' }, 'You\'re playing the installed app. ✓')
            : App.install.evt ? el('div', { class: 'row' }, btn('INSTALL KNOCK//BACK', async () => { await App.install.prompt(); Menu.options(); }, 'big'), el('p', { class: 'note' }, 'An icon on your home screen or desktop, full screen, and it plays offline once it has loaded (online rooms still need the internet).'))
              : App.install.ios ? el('p', { class: 'note' }, 'On an iPhone or iPad: tap Share (the square with the arrow) in Safari, then "Add to Home Screen". The game opens full screen from its icon, and plays offline once it has loaded.')
                : el('p', { class: 'note' }, 'Your browser can install the game as an app: in Chrome or Edge, use the install icon at the right end of the address bar (or the ⋮ menu: Install KNOCK//BACK). On a phone, use the browser menu: Add to Home Screen.'),
          el('h2', { class: 'osec' }, 'KEYBOARD'),
          el('p', { class: 'note' }, 'Click a slot and press the key you want. Each action takes two keys. A key that was already doing something else swaps over. Esc cancels; Backspace clears an alternate.'),
          el('div', { class: 'bindcols' }, table(0), table(1)),
          el('div', { class: 'row' }, btn('RESET KEYS', () => { Input.resetBinds(); Menu.options(); }, 'ghost')),
          el('h2', { class: 'osec' }, 'CONTROLLERS'),
          el('p', { class: 'note' }, 'Xbox, PlayStation and Switch controllers are recognised and the game shows their own buttons. Any other PC controller works too: if its buttons land in odd places, rebind them below. In one-player modes every pad controls Player 1; in 2-player versus the first pad is Player 1 and the second is Player 2. In the menus: d-pad or stick to move, the bottom button to choose, the right button to go back.'),
          padList,
          el('div', { class: 'vols' }, dz, btn(Input.settings.swap ? 'PADS SWAPPED ⇄' : 'SWAP P1 / P2 PADS', () => { Input.setSetting('swap', !Input.settings.swap); Menu.options(); }, 'ghost')),
          el('div', { class: 'bindcols' }, padTable(0), padTable(1)),
          el('div', { class: 'row' }, btn('RESET PAD BUTTONS', () => { Input.resetPads(); Menu.options(); }, 'ghost')),
          U.touch ? el('p', { class: 'note' }, 'On a phone or tablet you get on-screen controls in every fight: the stick appears wherever your left thumb lands, and every button is held while touched (hold GUARD and tap LIGHT to throw). Turn the phone sideways for the best view.') : null,
          el('div', { class: 'row' }, btn('DELETE THIS COLLECTOR', () => { if (confirm('Delete ' + Auth.user.user + ' and everything they own? This cannot be undone.')) { Auth.remove(Auth.user.id); Auth.logout(); Menu.login('new'); } }, 'ghost danger')))));
    },
    /* a controller came or went */
    padToast(gp, on) { toast((on ? '🎮 ' + Input.padName(Input.padType(gp)) + ' connected' : 'Controller disconnected'), on ? 'gold' : ''); },
    /* ---------------------------------------------------------- results */
    results(res, opts) {
      setTimeout(() => { const onKey = e => { if (!document.querySelector('.screen.results')) return window.removeEventListener('keydown', onKey); if (e.code === 'Enter' || e.code === 'Space') { const b = document.querySelector('.screen.results .btn.big'); if (b) { e.preventDefault(); window.removeEventListener('keydown', onKey); b.click(); } } }; window.addEventListener('keydown', onKey); }, 600);
      Music.play('menu'); const hud = U.$('hud'); if (hud) hud.hidden = true;
      const watch = opts.mode === 'watch';
      const win = res.winner === 0, me = res.records[watch ? res.winner : 0];
      let reward = 0, extra = null;
      if (opts.mode === 'cpu') reward = win ? 80 + 40 * (opts.lvl || 0) : 30;
      if (opts.mode === 'versus') reward = 40;
      if (opts.mode === 'arcade') {
        const L = Menu.ladder()[opts.stage];
        if (win) { reward = L.reward; Menu._arc.stage++; if (Menu._arc.stage >= 6) { reward += 600; extra = 'ARCADE CLEAR!  +600'; S().records.arcadeClears++; Menu._arc = null; Menu._ladder = null; } }
        else reward = 20;
      }
      if (!watch) Auth.record(res, opts.mode, reward);
      const awards = watch ? [] : Rewards.fightDone(res, opts), ready = watch ? 0 : Rewards.ready();
      const stat = (k, v) => el('div', null, el('small', null, k), el('b', null, v));
      const next = opts.mode === 'arcade' && win && Menu._arc ? btn('NEXT STAGE ▸', () => Menu.arcadeFight(), 'big fight') : null;
      App.screen(el('div', { class: 'screen results' },
        el('div', { class: 'panel resp ' + (win || watch ? 'win' : 'lose') },
          el('h1', null, watch ? 'CPU ' + (res.winner + 1) + ' WINS' : opts.mode === 'versus' ? 'PLAYER ' + (res.winner + 1) + ' WINS' : win ? 'YOU WIN' : 'YOU LOSE'),
          watch ? el('div', { class: 'note' }, res.builds[res.winner].name) : null,
          el('div', { class: 'score' }, res.wins[0] + ' — ' + res.wins[1]),
          el('div', { class: 'recs' }, stat('BEST COMBO', me.maxCombo), stat('MOST BOUNCES', me.maxBounces), stat('WALL BREAKS', me.breaks), stat('DAMAGE', Math.round(me.dmg))),
          reward ? el('div', { class: 'reward' }, el('i', { class: 'coin' }), '+' + reward + ' TOKENS') : null,
          extra ? el('div', { class: 'reward gold' }, extra) : null,
          ...awards.map(a => el('div', { class: 'reward gold' }, '★ AWARD: ' + a.name + (a.pay ? '  +' + a.pay : ''))),
          ready ? el('button', { class: 'rwready', onclick: () => { App.setView(null); Rewards.screen(); } }, '🎁 ' + ready + ' REWARD' + (ready > 1 ? 'S' : '') + ' READY TO CLAIM ▸') : null,
          el('div', { class: 'row' }, next,
            watch ? btn('NEXT FIGHT', () => Menu.versusStart(opts.cfg), 'big fight') : null,
            opts.mode !== 'arcade' ? btn('REMATCH', () => App.startMatch(opts), watch ? 'ghost' : 'big') : (!win ? btn('RETRY', () => Menu.arcadeFight(), 'big') : null),
            btn('MENU', () => { App.setView(null); Menu.hub(); }, 'ghost')))));
    },
  };
  window.Menu = Menu;
})();
