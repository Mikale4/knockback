/* ============================================================================
   gacha.js -- the CAPSULE MACHINE: blind-box capsules of figure parts and
   Legend Cards, paid for with Tokens (earned by fighting, never bought).

   Rates: STANDARD 62%, DELUXE 28%, LIMITED 8.5%, CHASE 1.5%.
   A 10-pull always holds at least one LIMITED or better. The 70th pull
   without a CHASE is a CHASE (pity). The SPOTLIGHT banner (a different
   line each week) gives that line half of every rarity's capsules.
   A duplicate levels the part up (+2% each, to +5); past that it refunds tokens.
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  const RATES = [0.62, 0.28, 0.085, 0.015];
  const COST = { 1: 100, 10: 900 };
  const PITY = 70;
  const CAP = [0xdfe4ea, 0x45b8f0, 0xffc43a, 0xff4fd8];
  const SLOT_W = { head: 1, core: 1, armR: 1, armL: 1, legs: 1, card: 0.6 };

  const week = () => Math.floor((Date.now() / 86400000 + 3) / 7);
  function banners() {
    const line = KB.LINE_ORDER[week() % KB.LINE_ORDER.length];
    const next = new Date((week() + 1) * 7 * 86400000 - 3 * 86400000);
    return [
      { id: 'feat', name: KB.LINES[line].name + ' SPOTLIGHT', line, desc: 'Half of every capsule is a ' + KB.LINES[line].name + ' part or card. Changes ' + next.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) + '.' },
      { id: 'std', name: 'STANDARD LINE-UP', line: null, desc: 'Every part and Legend Card from all six lines, evenly.' },
    ];
  }
  function pickSlot() { let t = Math.random() * 5.6; for (const s of KB.SLOTS) { t -= SLOT_W[s]; if (t <= 0) return s; } return 'card'; }
  function rarity(P) {
    if (P.sinceChase >= PITY - 1) return 3;
    let x = Math.random(); for (let r = 3; r >= 0; r--) { if (x < RATES[r]) return r; x -= RATES[r]; } return 0;
  }
  /* pull n capsules (tokens already paid): the results, already added to the collection */
  function roll(banner, n) {
    const S = Auth.S, P = S.pity, out = [];
    for (let i = 0; i < n; i++) {
      let r = rarity(P);
      if (n === 10 && i === 9 && !out.some(o => o.r >= 2) && r < 2) r = 2;
      P.total++; P.sinceLtd++; P.sinceChase++;
      if (r >= 2) P.sinceLtd = 0; if (r === 3) P.sinceChase = 0;
      const line = banner.line && Math.random() < 0.5 ? banner.line : U.pick(KB.LINE_ORDER);
      const slot = pickSlot();
      out.push({ line, slot, r });
    }
    for (const o of out) Object.assign(o, Inv.add(o.line, o.slot, o.r));
    S.pulls += n; Auth.save();
    return out;
  }

  /* ------------------------------------------------------ the 3D machine */
  function machine() {
    const s = 0.08, root = new THREE.Group();
    const g = new VX.Grid(); g.jit = 0.03;
    const RED = 0xe0343f, WH = 0xf6f1e6, DK = 0x22222a, GOLD = 0xf2c230;
    g.box(-10, 0, -8, 10, 17, 8, RED);
    g.box(-10, 17, -8, 10, 18, 8, WH); g.box(-10, 0, -8, 10, 0, 8, DK);
    g.box(-11, 1, -9, 11, 2, 9, WH);
    g.box(-5, 3, 9, 5, 7, 10, DK); g.box(-4, 4, 10, 4, 6, 10, 0x0e0e12); g.box(-6, 2, 9, 6, 2, 11, WH);   // the chute and tray
    g.box(-8, 12, 9, -4, 15, 9, WH); g.box(-7, 13, 10, -5, 14, 10, DK);                                 // coin slot
    g.box(3, 9, 9, 9, 15, 9, WH);                                                                       // crank plate
    for (const [x, y] of [[-7, 9], [-5, 9]]) g.set(x, y, 9, GOLD);
    const body = VX.object(g, s); root.add(body);
    // the crank
    const cg = new VX.Grid(); cg.cyl('z', 0, 0, 3, 0, 1, GOLD); cg.box(-1, 0, 2, 1, 5, 2, GOLD); cg.box(-1, 4, 3, 1, 5, 5, WH);
    const crank = VX.object(cg, s); crank.position.set(6 * s, 12 * s, 10 * s); root.add(crank);
    // the dome with capsules in it
    const domeY = 18 * s + 0.95;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.98, 32, 20), new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, shininess: 120, specular: 0xffffff, depthWrite: false }));
    dome.position.y = domeY; root.add(dome);
    const capsGrp = new THREE.Group(); capsGrp.position.y = domeY; root.add(capsGrp);
    for (let i = 0; i < 34; i++) {
      const c = capsule(U.pick([0, 0, 0, 1, 1, 2, 3]), 0.17);
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.72, y = -0.75 + Math.floor(i / 9) * 0.27 + Math.random() * 0.1;
      c.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); c.rotation.set(Math.random() * 3, Math.random() * 3, 0); capsGrp.add(c);
    }
    const cap = VX.object(new VX.Grid().cyl('y', 0, 0, 4, 0, 2, RED).box(-1, 3, -1, 1, 3, 1, GOLD), s); cap.position.y = domeY + 0.92; root.add(cap);
    root.userData = { crank, capsGrp, chute: new V3(0, 5 * s, 11 * s) };
    return root;
  }
  /* a capsule: a coloured top half and a clear-white bottom half */
  function capsule(r, rad) {
    const grp = new THREE.Group(); rad = rad || 0.22;
    const col = CAP[r];
    const top = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: col, shininess: 80, emissive: r === 3 ? 0x501040 : 0 }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xf4f4f8, shininess: 80, transparent: true, opacity: 0.85 }));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.02, rad * 1.02, rad * 0.16, 20, 1, true), new THREE.MeshPhongMaterial({ color: Models.shade(col, 0.7), side: THREE.DoubleSide }));
    top.castShadow = bot.castShadow = true;
    grp.add(top, bot, band); grp.userData = { top, bot, band };
    return grp;
  }

  /* -------------------------------------------------- the capsule view --
     view() -> { scene, camera, update, resize, play(results, done) } */
  function view() {
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    FX.init(scene);
    VX.sky(scene, 0x241a3a, 0x5a3a6a, 0x120c1c);
    scene.add(new THREE.HemisphereLight(0xffe8f4, 0x302040, 0.75));
    const key = new THREE.SpotLight(0xffffff, 1.2, 30, 0.6, 0.5); key.position.set(3, 7, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key); scene.add(key.target);
    const rim = new THREE.PointLight(0xff60c0, 0.6, 15); rim.position.set(-3, 3, -2); scene.add(rim);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshLambertMaterial({ color: 0x3a2a4a })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
    // shop shelves of boxed figures behind
    for (let i = -3; i <= 3; i++) for (let j = 0; j < 3; j++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.3), new THREE.MeshLambertMaterial({ color: [0xe0343f, 0x3f7fe0, 0xf2c230, 0x3fbf6a, 0xff8a2a, 0x9a5be0][(i + j * 2 + 9) % 6] }));
      b.position.set(i * 1.15, 0.8 + j * 1.45, -4.5); scene.add(b);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshBasicMaterial({ color: 0xdce8ff, transparent: true, opacity: 0.35 })); w.position.set(i * 1.15, 0.85 + j * 1.45, -4.34); scene.add(w);
    }
    const mach = machine(); mach.position.set(0, 0, 0); scene.add(mach);
    const { crank, capsGrp, chute } = mach.userData;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.position.set(0, 3.2, 2.2); scene.add(beam);
    const REVEAL = new V3(0, 1.3, 2.2);
    let seq = null;
    const V = {
      scene, camera, camGoal: { p: new V3(0, 2.1, 6.2), t: new V3(0, 1.3, 0) },
      update(dt) {
        camera.position.lerp(V.camGoal.p, 1 - Math.exp(-4 * dt));
        const t = camera.userData.t || (camera.userData.t = V.camGoal.t.clone()); t.lerp(V.camGoal.t, 1 - Math.exp(-4 * dt)); camera.lookAt(t);
        capsGrp.rotation.y += dt * 0.15;
        if (seq) step(dt);
        beam.material.opacity = U.smooth(beam.material.opacity, seq && seq.phase === 'shown' ? (0.07 + 0.035 * seq.cur.r) : 0, 6, dt);
        beam.rotation.y += dt;
        FX.update(dt);
      },
      resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
      /* play a list of results; cb(i, result) when each is shown, done() at the end */
      play(results, onShow, done) {
        seq = { list: results, i: -1, phase: 'next', t: 0, onShow, done, fast: results.length > 1 && false };
      },
      advance() { if (!seq) return; if (seq.phase === 'shown') { seq.phase = 'clear'; seq.t = 0; } else if (seq.phase !== 'next') seq.skip = true; },
      skipAll() { if (!seq) return; seq.skipAll = true; V.advance(); },
      busy: () => !!seq,
    };
    function clearReveal() { if (seq && seq.item) { scene.remove(seq.item); seq.item = null; } if (seq && seq.cap) { scene.remove(seq.cap); seq.cap = null; } if (seq && seq.halves) { seq.halves.forEach(h => scene.remove(h)); seq.halves = null; } }
    function step(dt) {
      const S = seq; S.t += dt * (S.skip || S.skipAll ? 4 : 1);
      if (S.phase === 'next') {
        clearReveal(); S.i++; S.skip = false;
        if (S.i >= S.list.length) { const d = S.done; seq = null; V.camGoal.p.set(0, 2.1, 6.2); V.camGoal.t.set(0, 1.3, 0); d && d(); return; }
        S.cur = S.list[S.i]; S.phase = 'crank'; S.t = 0; SFX.play('crank');
        V.camGoal.p.set(0.6, 1.6, 4.8); V.camGoal.t.set(0, 1.0, 0.5);
      } else if (S.phase === 'crank') {
        crank.rotation.z = -U.ease(Math.min(1, S.t / 0.6)) * Math.PI * 2;
        if (S.t >= 0.6) {
          S.phase = 'roll'; S.t = 0; SFX.play('roll');
          S.cap = capsule(S.cur.r); S.cap.position.copy(chute); scene.add(S.cap);
        }
      } else if (S.phase === 'roll') {
        const k = Math.min(1, S.t / 0.45);
        S.cap.position.set(0, U.lerp(chute.y, 0.22, k) + Math.abs(Math.sin(k * 9)) * 0.08 * (1 - k), U.lerp(chute.z, 1.6, k)); S.cap.rotation.x += dt * 14;
        if (k >= 1) { S.phase = 'hop'; S.t = 0; }
      } else if (S.phase === 'hop') {
        const k = Math.min(1, S.t / 0.35);
        S.cap.position.lerpVectors(new V3(0, 0.22, 1.6), REVEAL, U.easeOut(k)); S.cap.position.y += Math.sin(k * Math.PI) * 0.5;
        S.cap.rotation.x = U.lerp(S.cap.rotation.x, 0, 0.2);
        V.camGoal.p.set(0, 1.7, 5.3); V.camGoal.t.copy(REVEAL);
        if (k >= 1) { S.phase = 'shake'; S.t = 0; }
      } else if (S.phase === 'shake') {
        const r = S.cur.r, k = S.t;
        S.cap.rotation.z = Math.sin(k * (30 + r * 10)) * (0.12 + r * 0.06); S.cap.rotation.x = 0;
        if (r >= 2 && Math.random() < 0.3) FX.burst(REVEAL, { n: 1, color: CAP[r], glow: true, speed: 2, size: 0.05, gravity: -1, life: 0.5 });
        if (k >= 0.45 + r * 0.25) {
          S.phase = 'shown'; S.t = 0; SFX.play('pop'); SFX.play('reveal', { r });
          const { top, bot, band } = S.cap.userData;
          S.halves = [top, bot, band].map((h, i) => { const w = h.clone(); w.position.copy(REVEAL); w.userData.v = new V3(U.rnd(-1, 1), i === 0 ? 3 : -1, U.rnd(0.5, 1.5)); scene.add(w); return w; });
          scene.remove(S.cap); S.cap = null;
          const it = Models.partGroup(S.cur.line, S.cur.slot, S.cur.r);
          const sz = it.userData.size; if (sz) it.scale.setScalar(Math.min(1.4, 0.62 / Math.max(sz.x, sz.y, sz.z)));
          it.position.copy(REVEAL); scene.add(it); S.item = it;
          FX.spark(REVEAL, { color: CAP[S.cur.r], size: 2.4 + S.cur.r, life: 0.3 });
          FX.burst(REVEAL, { n: 16 + S.cur.r * 14, color: [CAP[S.cur.r], 0xffffff], glow: true, speed: 4 + S.cur.r, gravity: 3, life: 0.9, size: 0.06 });
          beam.material.color.setHex(CAP[S.cur.r]);
          S.onShow && S.onShow(S.i, S.cur);
          if (S.skipAll) { S.phase = 'clear'; S.t = 0; }
        }
      } else if (S.phase === 'shown' || S.phase === 'clear') {
        if (S.item) { S.item.rotation.y += dt * 1.4; S.item.position.y = REVEAL.y + Math.sin(S.t * 2) * 0.05; }
        if (S.halves) for (const h of S.halves) { h.userData.v.y -= 9 * dt; h.position.addScaledVector(h.userData.v, dt); h.rotation.x += dt * 5; if (h.position.y < 0.1) { h.position.y = 0.1; h.userData.v.multiplyScalar(0.3); } }
        if (S.phase === 'clear' && S.t > (S.skipAll ? 0.05 : 0.12)) S.phase = 'next';
      }
    }
    camera.position.copy(V.camGoal.p); camera.lookAt(V.camGoal.t);
    return V;
  }

  window.Gacha = { RATES, COST, PITY, CAP, banners, roll, view, capsule };
})();
