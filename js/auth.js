/* ============================================================================
   auth.js -- local accounts and each account's save (kept in this browser).

   On passwords: this is localStorage, so it is NOT a security boundary --
   anyone with the machine and devtools can read or edit it. Passwords are
   salted SHA-256 only so a reused password is never kept in the clear.

   The save: tokens, the collection (inv), three builds, gacha pity, records.
     Auth.list() register(u, pw) login(u, pw) resume() logout() save()
     Auth.user (the signed-in account) and Inv (the collection helpers)
   ========================================================================== */
(function () {
  'use strict';
  const ACC = 'kb.accounts', SES = 'kb.session';
  const all = () => U.read(ACC, {}) || {};
  const norm = u => String(u || '').trim().toLowerCase();
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function salt() { const b = new Uint8Array(16); (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256 | 0); return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); }
  async function hash(pw, s) {
    const data = new TextEncoder().encode(s + '|' + pw);
    if (window.crypto && crypto.subtle) { const buf = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(buf), x => x.toString(16).padStart(2, '0')).join(''); }
    let h = 0; for (const c of s + '|' + pw) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0; return 'weak:' + (h >>> 0).toString(16);
  }
  function freshSave() {
    return { tokens: 0, inv: {}, builds: [], active: 0, pity: { total: 0, sinceLtd: 0, sinceChase: 0 }, starter: null,
      records: { wins: 0, losses: 0, matches: 0, arcadeClears: 0, bestCombo: 0, maxBounces: 0, wallBreaks: 0, bestArcade: 0 },
      daily: null, pulls: 0, created: Date.now() };
  }

  const Auth = {
    user: null,
    list() { return Object.values(all()).sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0)).map(a => ({ id: a.id, user: a.user, lastLogin: a.lastLogin })); },
    checkName(u) {
      u = String(u || '').trim();
      if (u.length < 3) return 'Name needs at least 3 characters.';
      if (u.length > 16) return 'Name can be at most 16 characters.';
      if (!/^[a-zA-Z0-9 _-]+$/.test(u)) return 'Letters, numbers, spaces, - and _ only.';
      if (Object.values(all()).some(a => norm(a.user) === norm(u))) return 'That name is taken on this device.';
      return null;
    },
    async register(user, pw, remember) {
      const e = Auth.checkName(user) || (String(pw || '').length < 4 ? 'Password needs at least 4 characters.' : null);
      if (e) return { err: e };
      const s = salt(), id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const a = { id, user: String(user).trim(), salt: s, hash: await hash(pw, s), created: Date.now(), lastLogin: Date.now(), save: freshSave() };
      const A = all(); A[id] = a; U.write(ACC, A);
      Auth.user = a; U.write(SES, remember ? id : null); return { ok: true, fresh: true };
    },
    async login(user, pw, remember) {
      const a = Object.values(all()).find(x => norm(x.user) === norm(user));
      if (!a) return { err: 'No figure collector by that name on this device.' };
      if (await hash(pw, a.salt) !== a.hash) return { err: 'Wrong password.' };
      a.lastLogin = Date.now(); Auth.user = a; Auth.save(); U.write(SES, remember ? a.id : null);
      return { ok: true, fresh: !a.save.starter };
    },
    resume() { const id = U.read(SES, null); const a = id && all()[id]; if (a) { Auth.user = a; a.lastLogin = Date.now(); Auth.save(); return true; } return false; },
    logout() { Auth.user = null; U.write(SES, null); },
    remove(id) { const A = all(); delete A[id]; U.write(ACC, A); },
    save() { if (!Auth.user) return; const A = all(); A[Auth.user.id] = Auth.user; U.write(ACC, A); },
    get S() { return Auth.user && Auth.user.save; },
    /* the daily bonus: 300 tokens the first sign-in of each day */
    daily() { const S = Auth.S; if (!S || !S.starter) return 0; const t = today(); if (S.daily === t) return 0; S.daily = t; S.tokens += 300; Auth.save(); return 300; },
    /* a new collector picks a starter figure: its full Standard set, plus tokens for a first 10-pull */
    starter(line) {
      const S = Auth.S; S.starter = line;
      for (const slot of KB.SLOTS) Inv.add(line, slot, 0);
      S.builds = [KB.mintBuild(line, 0), KB.mintBuild(line, 0), KB.mintBuild(line, 0)];
      S.builds[0].name = KB.LINES[line].figure; S.builds[1].name = 'Custom A'; S.builds[2].name = 'Custom B';
      S.tokens += 1500; S.daily = today(); Auth.save();
    },
    record(res, mode, reward) {
      const S = Auth.S; if (!S) return; const R = S.records, me = res.records[0];
      R.matches++; if (res.winner === 0) R.wins++; else R.losses++;
      R.bestCombo = Math.max(R.bestCombo, me.maxCombo); R.maxBounces = Math.max(R.maxBounces, me.maxBounces); R.wallBreaks += me.breaks;
      S.tokens += reward || 0; Auth.save();
    },
  };

  /* --------------------------------------------------------- the collection */
  const Inv = {
    k: (line, slot, r) => line + ':' + slot + ':' + r,
    get(line, slot, r) { return Auth.S.inv[Inv.k(line, slot, r)] || null; },
    has(line, slot, r) { return !!Inv.get(line, slot, r); },
    /* add one: new, a level up (to +5), or past that a token refund */
    add(line, slot, r) {
      const S = Auth.S, k = Inv.k(line, slot, r), it = S.inv[k];
      if (!it) { S.inv[k] = { n: 1, lv: 0, t: Date.now() }; return { isNew: true, lv: 0 }; }
      it.n++;
      if (it.lv < 5) { it.lv++; return { lvUp: true, lv: it.lv }; }
      const refund = [20, 50, 150, 400][r]; S.tokens += refund; return { refund, lv: it.lv };
    },
    /* every owned item for a slot, best first */
    forSlot(slot) {
      const out = [];
      for (const line of KB.LINE_ORDER) for (let r = 3; r >= 0; r--) { const it = Inv.get(line, slot, r); if (it) out.push({ line, slot, r, lv: it.lv, n: it.n }); }
      return out.sort((a, b) => b.r - a.r || KB.LINE_ORDER.indexOf(a.line) - KB.LINE_ORDER.indexOf(b.line));
    },
    /* a fighter is yours when you own its whole Standard set (all six parts): your starter, a Selection Ticket's
       pick, or six capsules' worth. Your figures are those, ready to fight as */
    hasFigure: line => KB.SLOTS.every(s => Inv.has(line, s, 0)),
    figures: () => KB.LINE_ORDER.filter(l => Inv.hasFigure(l)),
    count() { return Object.keys(Auth.S.inv).length; },
    total: () => KB.LINE_ORDER.length * KB.SLOTS.length * 4,
    /* a build's parts carry their current levels */
    levelled(b) { const o = { name: b.name }; for (const s of KB.SLOTS) { const it = Inv.get(b[s].line, s, b[s].r); o[s] = { line: b[s].line, r: b[s].r, lv: it ? it.lv : 0 }; } return o; },
  };
  window.Auth = Auth; window.Inv = Inv;
})();
