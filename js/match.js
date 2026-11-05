/* ============================================================================
   match.js -- a fight: two figures, an arena, rounds, the camera, and the
   things fighters spawn (shots, bombs, chains, dropped parts, clones).

   Match.create(opts) -> a view { scene, camera, update(dt), dispose() }
     opts: { mode: 'cpu'|'versus'|'training'|'arcade'|'attract', builds: [b1, b2],
             arena, cpu: [lvl|null, lvl|null], bonus, wins: 2, time: 99, onEnd(result) }
   ========================================================================== */
(function () {
  'use strict';
  const V3 = THREE.Vector3;
  const _v = new V3(), _w = new V3();

  function create(opts) {
    opts = Object.assign({ mode: 'cpu', wins: 2, time: 99, bonus: true, arena: U.pick(Arena.LIST) }, opts);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
    FX.init(scene);
    const arena = Arena.build(scene, opts.arena);
    const M = {
      opts, scene, camera, arena, time: 0, phase: 'intro', phaseT: 0, round: 1, wins: [0, 0], clock: opts.time,
      frozen: false, freezeT: 0, freezer: null, slow: 1, slowT: 0, paused: false, projs: [], picks: [], clones: [], fx: [],
      training: opts.mode === 'training' ? { dummy: 'stand', meter: true, godP2: false, reset: 0 } : null,
      attract: opts.mode === 'attract', results: null, camT: new V3(0, 0, 0), camP: new V3(0, 8, 14), camShake: 0,
    };
    // the players
    const human = [opts.cpu ? opts.cpu[0] == null : true, opts.cpu ? opts.cpu[1] == null : false];
    Input.mode = human[0] && human[1] ? 'versus' : 'solo';
    for (let i = 0; i < 2; i++) Input.players[i].cpu = null;
    M.fighters = [0, 1].map(i => new Fighter(M, i, opts.builds[i], Input.players[i], { bonus: opts.bonus }));
    M.ai = [null, null];
    for (let i = 0; i < 2; i++) if (!human[i]) { M.ai[i] = new AI(M, M.fighters[i], opts.cpu[i]); Input.players[i].cpu = M.ai[i]; }
    if (M.training) { M.ai[1] = new AI(M, M.fighters[1], 1); M.ai[1].dummy = 'stand'; Input.players[1].cpu = M.ai[1]; }
    for (const p of Input.players) p.clear();

    M.opp = f => M.fighters[1 - f.idx];
    M.camDir = () => _w.subVectors(camera.position, M.camT).normalize().clone();
    M.call = (f, text, cls, pos) => FX.call(pos || _v.copy(f.pos).setY(f.pos.y + 2.25), text, cls, camera);
    M.hitstopAll = t => { for (const f of M.fighters) f.hitstop = Math.max(f.hitstop, t); };
    M.slowmo = (s, d) => { M.slow = s; M.slowT = d; };
    M.event = (type, data) => { if (type === 'wallbreak') HUD.banner('WALL BREAK', 'break', 1.1); };
    M.comboShow = (att, vic) => HUD.combo(att.idx, vic.combo);

    /* ------------------------------------------------------------ rounds */
    function place() {
      arena.reset(); FX.clear();
      for (const p of M.picks) { if (p.grp.parent) p.grp.parent.remove(p.grp); }
      M.picks = []; M.projs.forEach(p => p.mesh && scene.remove(p.mesh)); M.projs = []; M.clones.forEach(c => c.f.dispose()); M.clones = [];
      M.fighters[0].resetRound(-3.2, 0.6, Math.PI / 2); M.fighters[1].resetRound(3.2, 0.6, -Math.PI / 2);
      for (const f of M.fighters) { f.pos.y = 7; f.grounded = false; f.setState('intro'); f.dropIn = true; }
      M.phase = 'intro'; M.phaseT = 0; M.clock = opts.time; M.slow = 1; M.slowT = 0;
      if (!M.attract) HUD.banner(M.training ? 'TRAINING' : (M.round === 1 && !opts.final ? 'ROUND 1' : opts.final && M.wins[0] === opts.wins - 1 && M.wins[1] === opts.wins - 1 ? 'FINAL ROUND' : 'ROUND ' + M.round), 'round', 1.2);
    }
    M.restart = () => { M.round = 1; M.wins = [0, 0]; for (const f of M.fighters) { f.hype = 0; f.burst = 60; } place(); };
    place();

    M.ko = (vic, att, dir, mv, fromBreak) => {
      if (M.phase !== 'fight' && M.phase !== 'ko') return;
      if (M.training) { vic.hp = 1; return; }
      if (M.phase === 'ko') return;
      M.phase = 'ko'; M.phaseT = 0; M.winner = att ? att.idx : 1 - vic.idx;
      vic.endCombo(); vic.state = 'ko'; vic.stateT = 0; vic.move = null; vic.held = null; vic.ko = true;
      if (!fromBreak && vic.state !== 'out') { vic.vel.set(dir.x * 13, 9, dir.z * 13); vic.grounded = false; }
      M.slowmo(0.28, 1.3); SFX.play('ko'); FX.addShake(0.9);
      if (!M.attract) HUD.banner('KNOCK//OUT', 'ko', 1.8);
      M.wins[M.winner]++;
    };
    M.ringOut = f => {
      if (M.phase === 'ko') { f.vel.set(0, 0, 0); f.pos.y = arena.outY + 0.4; return; }
      const dmg = Math.round(f.maxHp * 0.08);
      f.hp -= M.training ? 0 : dmg;
      M.call(f, 'RING OUT  -' + dmg, 'break', new V3(f.pos.x * 0.8, 1.5, f.pos.z * 0.8));
      if (f.hp <= 0) { f.hp = 0; M.phase = 'fight'; M.ko(f, M.opp(f), new V3(0, 0, 0), null, true); f.vel.set(0, 0, 0); return; }
      setTimeout(() => { if (M.disposed) return;
        const o = M.opp(f); const a = Math.atan2(-o.pos.x, -o.pos.z) + U.rnd(-0.5, 0.5);
        f.pos.set(U.clamp(Math.sin(a) * 4, -6, 6), 7, U.clamp(Math.cos(a) * 3, -4, 4)); f.vel.set(0, 0, 0); f.grounded = false;
        f.setState('air'); f.inv = 1.5; f.respawnInv = true; f.spin.rotation.set(0, 0, 0); f.yaw = U.ang(f.pos, o.pos); f.endCombo();
        setTimeout(() => { f.respawnInv = false; }, 1500);
      }, 700);
    };

    /* ---------------------------------------------------------- the super */
    M.superFreeze = (f, mv) => {
      M.frozen = true; M.freezeT = 0.75; M.freezer = f; SFX.play('superStart');
      if (!M.attract) HUD.superCut(f, mv);
      FX.burst(_v.copy(f.pos).setY(1), { n: 30, color: [0xffffff, KB.LINES[f.build.card.line].pal.glow], glow: true, speed: 4, gravity: -3, life: 0.9, size: 0.07 });
    };

    /* ------------------------------------------------------- projectiles */
    const tracer = (a, b, color, w) => {
      const d = _v.subVectors(b, a), len = d.length();
      const m = new THREE.Mesh(new THREE.BoxGeometry(w || 0.06, w || 0.06, len), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true }));
      m.position.copy(a).addScaledVector(d, 0.5); m.lookAt(b); scene.add(m); M.fx.push({ m, t: 0, life: 0.14 });
    };
    /* a ray hit test against the opponent */
    function rayHit(f, o, from, dir, range) {
      const c = _w.copy(o.pos).setY(o.pos.y + 0.9); const t = _v.subVectors(c, from).dot(dir);
      if (t < 0 || t > range) return null;
      const p = from.clone().addScaledVector(dir, t); return p.distanceTo(c) < 0.75 ? p : null;
    }
    M.fire = (f, mv, charge) => {
      const o = M.opp(f), F = f.forward;
      const muzzle = f.fig.detached.armL ? _v.copy(f.pos).setY(1.2).addScaledVector(F, 0.5).clone() : f.fig.socket('wL', [0, 2, 10]);
      if (mv.proj === 'shot' || mv.proj === 'shotDown' || mv.proj === 'superShot') {
        const dir = mv.proj === 'shotDown' ? new V3(F.x * 0.7, -0.7, F.z * 0.7).normalize() : F.clone();
        const range = (mv.range || 6) + (charge || 0) * 3;
        const hit = rayHit(f, o, muzzle, dir, range);
        const end = hit || muzzle.clone().addScaledVector(dir, range);
        SFX.play('shot'); tracer(muzzle, end, 0xffe6a0, 0.07); FX.addShake(0.15);
        FX.burst(muzzle, { n: 8, color: [0xd8d0c0, 0xa8a090], speed: 1.5, size: 0.12, gravity: -1.5, life: 0.6 }); FX.spark(muzzle, { color: 0xffc060, size: 0.7 });
        if (hit && o.inv <= 0) {
          if (mv.proj === 'superShot') { if (!['ko', 'out', 'down'].includes(o.state)) f.superCaught = true; }
          else Combat.hit(f, o, mv, { kind: f.kind, charge, at: hit, from: f.pos.clone(), dir: dir.clone().setY(0).normalize(), proj: true });
        }
        if (mv.proj === 'superShot') setTimeout(() => { f.superCaught = false; }, 600);
      } else if (mv.proj === 'chain') {
        const range = mv.range + (charge || 0) * 2.5, from = _v.copy(f.pos).setY(1.1).clone();
        const hit = rayHit(f, o, from, F, range); const end = hit || from.clone().addScaledVector(F, range);
        tracer(from, end, 0x50525e, 0.05); SFX.play('whoosh');
        for (let i = 0; i < 6; i++) FX.burst(from.clone().lerp(end, i / 6), { n: 1, color: 0x8a8fa0, speed: 0.5, size: 0.07, life: 0.25, gravity: 0 });
        if (hit && o.inv <= 0) Combat.hit(f, o, mv, { kind: f.kind, charge, at: hit, from: f.pos.clone(), dir: F.clone().multiplyScalar(-1), proj: true });
      } else if (mv.proj === 'kunai' || mv.proj === 'kunaiDown') {
        const from = f.fig.detached.armR ? _v.copy(f.pos).setY(1.2).addScaledVector(F, 0.4).clone() : f.fig.socket('armR', [0, -9, 1]);
        const base = mv.proj === 'kunaiDown' ? new V3(F.x * 0.72, -0.7, F.z * 0.72).normalize() : F.clone();
        let hitP = null;
        for (const a of [-0.18, 0, 0.18]) {
          const dir = base.clone().applyAxisAngle(new V3(0, 1, 0), a), h = rayHit(f, o, from, dir, mv.range);
          tracer(from, h || from.clone().addScaledVector(dir, mv.range), 0xd8dde6, 0.04); if (h && !hitP) hitP = h;
        }
        SFX.play('whoosh');
        if (hitP && o.inv <= 0) Combat.hit(f, o, mv, { kind: f.kind, at: hitP, from: f.pos.clone(), dir: F.clone(), proj: true });
      } else if (mv.proj === 'bomb') {
        const g = new VX.Grid(); g.ell(0, 0, 0, 2, 2, 2, 0x22222a); g.set(0, 3, 0, 0x8a5a2b); g.set(0, 4, 0, VX.glow(0xffa020));
        const mesh = VX.object(g, 0.07); scene.add(mesh);
        const p = f.fig.socket('armR', [0, -9, 1]); mesh.position.copy(p);
        const d = o ? Math.min(7, U.dist(f.pos, o.pos)) : 5;
        M.projs.push({ kind: 'bomb', f, mv, mesh, pos: p, vel: new V3(F.x * (3 + d), 6.5, F.z * (3 + d)), t: 0 });
      }
    };
    function explode(p) {
      const f = p.f, o = M.opp(f), c = p.pos;
      SFX.play('boom'); FX.addShake(0.6);
      FX.ring(c.clone().setY(Math.max(0.05, c.y)), { r1: p.mv.rad * 1.3, life: 0.35, color: 0xffa040 });
      FX.burst(c, { n: 26, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 7, size: 0.12, life: 0.6 });
      FX.burst(c, { n: 10, color: [0x5a5a5a, 0x8a8a8a], speed: 2, size: 0.25, life: 1.0, gravity: -2 });
      FX.spark(c, { color: 0xffb040, size: 2.6, life: 0.2 });
      if (o && o.pos.distanceTo(_v.copy(c).setY(Math.max(0, c.y - 0.9))) < p.mv.rad + 0.5) {
        const d = _v.subVectors(o.pos, c).setY(0); if (d.lengthSq() < 0.01) d.copy(f.forward); d.normalize();
        Combat.hit(f, o, p.mv, { kind: 'special', dir: d.clone(), from: c.clone(), at: o.pos.clone().setY(1), proj: true });
      }
    }
    M.cannonball = pos => {
      const g = new VX.Grid(); g.ell(0, 0, 0, 2, 2, 2, 0x1a1a20); const mesh = VX.object(g, 0.09); scene.add(mesh);
      mesh.position.set(pos.x + U.rnd(-0.4, 0.4), 9, pos.z + U.rnd(-0.4, 0.4));
      M.projs.push({ kind: 'ball', mesh, pos: mesh.position, vel: new V3(0, -30, 0), target: pos.y + 0.8, t: 0 });
    };
    M.chain = (att, vic) => { const a = _v.copy(att.pos).setY(1.1).clone(); tracer(a, vic.pos.clone().setY(1.1), 0x50525e, 0.05); };
    M.clone = (att, vic, i) => {
      const f = Models.figure(att.build); scene.add(f.root);
      f.root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; if (o.material.color) o.material.color.setHex(0x6a4a9a); o.castShadow = false; } });
      const a = i * Math.PI / 2 + 0.6; const from = new V3(vic.pos.x + Math.sin(a) * 2.6, 0, vic.pos.z + Math.cos(a) * 2.6);
      const to = new V3(vic.pos.x - Math.sin(a) * 2.6, 0, vic.pos.z - Math.cos(a) * 2.6);
      f.root.position.copy(from); f.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      Anim.set(f, Anim.blend(att.ready, Anim.P.iai.strike, 1, att.ready));
      M.clones.push({ f, from, to, t: 0 }); SFX.play('slash');
    };

    /* ---------------------------------------------------- dropped parts */
    M.dropPart = (vic, part, grp, dir) => {
      const vel = new V3(dir.x * 5 + U.rnd(-1, 1), 6 + U.rnd(0, 2), dir.z * 5 + U.rnd(-1, 1));
      M.picks.push({ owner: vic, part, grp, vel, spin: new V3(U.rnd(-9, 9), U.rnd(-9, 9), U.rnd(-9, 9)), t: 0, rest: false });
      FX.burst(grp.position.clone(), { n: 10, color: [0xffffff, 0x9a9aa2], speed: 4, size: 0.06 });
    };
    function updPicks(dt) {
      for (let i = M.picks.length - 1; i >= 0; i--) {
        const p = M.picks[i], g = p.grp; p.t += dt;
        if (!p.rest) {
          p.vel.y -= 26 * dt; g.position.addScaledVector(p.vel, dt);
          g.rotation.x += p.spin.x * dt; g.rotation.y += p.spin.y * dt; g.rotation.z += p.spin.z * dt;
          const inside = Math.abs(g.position.x) < arena.W && Math.abs(g.position.z) < arena.D;
          for (const w of arena.walls) if (!w.broken && w.sign * g.position[w.axis] > w.lim - 0.2) { g.position[w.axis] = w.sign * (w.lim - 0.2); p.vel[w.axis] *= -0.5; }
          if (inside && g.position.y < 0.15 && p.vel.y < 0) { g.position.y = 0.15; p.vel.y *= -0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; p.spin.multiplyScalar(0.5); if (Math.abs(p.vel.y) < 1.2) { p.rest = true; g.rotation.x = Math.PI / 2 * Math.round(g.rotation.x / (Math.PI / 2)); g.rotation.z = Math.PI / 2 * Math.round(g.rotation.z / (Math.PI / 2)); } }
          if (g.position.y < arena.outY) { scene.remove(g); M.picks.splice(i, 1); continue; }
        } else { g.position.y = 0.15 + Math.abs(Math.sin(M.time * 3 + i)) * 0.06; }
        if (p.t < 0.6) continue;
        for (const f of M.fighters) {
          if (!f.grounded || f.inHitstun || f.state === 'ko' || f.state === 'out') continue;
          const d = Math.hypot(f.pos.x - g.position.x, f.pos.z - g.position.z);
          if (d > 0.85) continue;
          if (f === p.owner) {
            f.fig.reattach(p.part); f.broken[p.part] = false; f.armor[p.part] = Math.round(f.armorMax[p.part] * 0.55);
            SFX.play('snapon'); M.call(f, 'SNAP ON!', 'heal'); M.picks.splice(i, 1); break;
          } else if (p.rest || p.t > 1) { // kick it away
            const k = _v.set(g.position.x - f.pos.x, 0, g.position.z - f.pos.z).normalize();
            p.vel.set(k.x * 7, 5, k.z * 7); p.rest = false; p.t = 0.3; SFX.play('land');
          }
        }
      }
    }

    /* ---------------------------------------------------------- camera */
    function updCamera(dt) {
      const [a, b] = M.fighters;
      let target, dist, from;
      if (M.frozen && M.freezer) {
        const f = M.freezer, F = f.forward;
        target = _v.copy(f.pos).setY(f.pos.y + 1.0).clone(); dist = 4.6;
        from = new V3(F.x * 0.8 + 0.5, 0.45, F.z * 0.8 + 0.7).normalize();
      } else {
        const ina = a.state !== 'out', inb = b.state !== 'out';
        const pa = ina ? a.pos : b.pos, pb = inb ? b.pos : a.pos;
        target = new V3((pa.x + pb.x) / 2, Math.min(3, (pa.y + pb.y) / 2) * 0.5 + 0.6, (pa.z + pb.z) / 2);
        target.x = U.clamp(target.x, -arena.W + 2, arena.W - 2); target.z = U.clamp(target.z, -arena.D + 1, arena.D - 1);
        const sep = Math.hypot(pa.x - pb.x, (pa.z - pb.z) * 1.4);
        dist = U.clamp(8.5 + sep * 0.62, 10, 17) * U.clamp(1.45 / Math.max(0.4, camera.aspect), 1, 2.1);
        from = new V3(0, 0.62, 0.79);
        if (M.attract) { const t = M.time * 0.08; from.set(Math.sin(t) * 0.5, 0.55, Math.cos(t) * 0.8).normalize(); }
        if (M.phase === 'ko' && M.phaseT < 1.6) { const v = M.fighters[1 - M.winner]; target.lerp(_w.copy(v.pos).setY(1), 0.5); dist *= 0.75; }
      }
      const k = M.frozen ? 10 : 4.5;
      M.camT.x = U.smooth(M.camT.x, target.x, k, dt); M.camT.y = U.smooth(M.camT.y, target.y, k, dt); M.camT.z = U.smooth(M.camT.z, target.z, k, dt);
      const want = _w.copy(M.camT).addScaledVector(from, dist);
      camera.position.x = U.smooth(camera.position.x, want.x, k, dt); camera.position.y = U.smooth(camera.position.y, want.y, k, dt); camera.position.z = U.smooth(camera.position.z, want.z, k, dt);
      camera.lookAt(M.camT);
      camera.position.x += FX.shake.x; camera.position.y += FX.shake.y;
    }

    /* ---------------------------------------------------------- update */
    M.update = rawDt => {
      if (M.paused) { updCamera(0); return; }
      if (M.slowT > 0) { M.slowT -= rawDt; if (M.slowT <= 0) M.slow = 1; }
      const dt = Math.min(rawDt, 1 / 30) * M.slow;
      M.time += dt; M.phaseT += dt;
      // pause
      const esc = Input.keyDown('Escape');
      if (!M.attract && ((esc && !M.escHeld) || Input.players.some(p => !p.cpu && p.pressed('pause')))) HUD.pause(M);
      M.escHeld = esc;
      if (M.frozen) {
        M.freezeT -= rawDt;
        const f = M.freezer; f.animate(rawDt);
        if (M.freezeT <= 0) { M.frozen = false; M.freezer = null; }
        updCamera(rawDt); FX.update(rawDt); HUD.update(M); return;
      }
      for (let i = 0; i < 2; i++) if (M.ai[i]) M.ai[i].think(dt);
      // phases
      if (M.phase === 'intro') {
        for (const f of M.fighters) { f.vel.y -= 30 * dt; f.pos.y = Math.max(0, f.pos.y + f.vel.y * dt); if (f.pos.y <= 0 && f.dropIn) { f.dropIn = false; f.vel.y = 0; f.grounded = true; SFX.play('land'); FX.burst(_v.copy(f.pos).setY(0.05), { n: 10, color: arena.dust, speed: 3, size: 0.09 }); } f.animate(dt); }
        if (M.phaseT > 1.6) { M.phase = 'fight'; M.phaseT = 0; for (const f of M.fighters) f.setState('idle'); if (!M.attract) { HUD.banner('FIGHT!', 'fight', 0.8); SFX.play('bell'); } }
      } else {
        for (const f of M.fighters) f.update(dt);
        separate();
        if (M.phase === 'fight' && !M.training && !M.attract) {
          M.clock -= dt;
          if (M.clock <= 0) { M.clock = 0; timeUp(); }
        }
        if (M.phase === 'ko') {
          if (M.phaseT > 2.2 && M.phaseT - dt <= 2.2) { const w = M.fighters[M.winner]; if (w.state !== 'out') { w.move = null; w.setState('victory'); w.faceOpp(); } }
          if (M.phaseT > 3.6) nextRound();
        }
        if (M.training) trainingTick(dt);
      }
      updProjs(dt); updPicks(dt); arena.update(dt);
      for (let i = M.clones.length - 1; i >= 0; i--) { const c = M.clones[i]; c.t += dt; c.f.root.position.lerpVectors(c.from, c.to, U.clamp(c.t / 0.22, 0, 1)); if (c.t > 0.4) { c.f.root.traverse(o => { if (o.isMesh && o.material.opacity) o.material.opacity *= 0.8; }); } if (c.t > 0.7) { c.f.dispose(); M.clones.splice(i, 1); } }
      for (let i = M.fx.length - 1; i >= 0; i--) { const e = M.fx[i]; e.t += dt; e.m.material.opacity = 1 - e.t / e.life; if (e.t > e.life) { scene.remove(e.m); e.m.geometry.dispose(); e.m.material.dispose(); M.fx.splice(i, 1); } }
      updCamera(rawDt); FX.update(dt);
      if (!M.attract) HUD.update(M);
    };
    function updProjs(dt) {
      for (let i = M.projs.length - 1; i >= 0; i--) {
        const p = M.projs[i]; p.t += dt;
        if (p.kind === 'bomb') {
          p.vel.y -= 22 * dt; p.pos.addScaledVector(p.vel, dt); p.mesh.position.copy(p.pos); p.mesh.rotation.x += dt * 8;
          if (Math.random() < 0.5) FX.burst(p.pos.clone().setY(p.pos.y + 0.3), { n: 1, color: 0xffc040, glow: true, speed: 0.5, size: 0.05, life: 0.2, gravity: -2 });
          const o = M.opp(p.f); const near = o && o.pos.distanceTo(_v.copy(p.pos).setY(p.pos.y - 0.9)) < 0.9;
          if (p.pos.y <= 0.15 && p.vel.y < 0) { p.pos.y = 0.15; p.vel.y *= -0.4; p.vel.x *= 0.6; p.vel.z *= 0.6; p.bounced = (p.bounced || 0) + 1; }
          for (const w of arena.walls) if (!w.broken && w.sign * p.pos[w.axis] > w.lim - 0.15) { p.pos[w.axis] = w.sign * (w.lim - 0.15); p.vel[w.axis] *= -0.5; }
          if (near || p.t > 1.15 || p.bounced >= 2) { explode(p); scene.remove(p.mesh); M.projs.splice(i, 1); }
        } else if (p.kind === 'ball') {
          p.pos.addScaledVector(p.vel, dt);
          if (p.pos.y <= p.target) {
            SFX.play('boom'); FX.burst(p.pos.clone(), { n: 18, color: [0xffd040, 0xff6a20, 0x3a3a3a], glow: true, speed: 6, size: 0.1, life: 0.5 });
            FX.spark(p.pos.clone(), { color: 0xffb040, size: 2 }); FX.addShake(0.3); scene.remove(p.mesh); M.projs.splice(i, 1);
          }
        }
      }
    }
    /* figures don't stand inside each other */
    function separate() {
      const [a, b] = M.fighters;
      if (['tumble', 'held', 'out', 'ko', 'down'].includes(a.state) || ['tumble', 'held', 'out', 'ko', 'down'].includes(b.state)) return;
      if (Math.abs(a.pos.y - b.pos.y) > 1.4) return;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = 0.78;
      if (d < min && d > 1e-4) { const push = (min - d) / 2; a.pos.x -= dx / d * push; a.pos.z -= dz / d * push; b.pos.x += dx / d * push; b.pos.z += dz / d * push; }
      else if (d <= 1e-4) { a.pos.x -= 0.2; b.pos.x += 0.2; }
    }
    function timeUp() {
      if (M.phase !== 'fight') return;
      const [a, b] = M.fighters, ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
      M.phase = 'ko'; M.phaseT = 0; M.winner = ra >= rb ? 0 : 1; M.wins[M.winner]++;
      HUD.banner('TIME', 'ko', 1.6); SFX.play('ko');
    }
    function nextRound() {
      const need = opts.wins;
      if (M.attract) { M.round++; if (M.round > 3) { opts.onEnd && opts.onEnd({ attract: true }); return; } place(); return; }
      if (M.wins[0] >= need || M.wins[1] >= need) {
        M.phase = 'end';
        const res = { winner: M.wins[0] >= need ? 0 : 1, wins: M.wins.slice(), mode: opts.mode, records: M.fighters.map(f => f.records), builds: opts.builds };
        M.results = res; Touch.hide(); opts.onEnd && opts.onEnd(res);
        return;
      }
      M.round++; opts.final = true; place();
    }
    function trainingTick(dt) {
      const T = M.training, d = M.fighters[1], p = M.fighters[0];
      M.ai[1].dummy = T.dummy;
      for (const f of M.fighters) if (!f.comboing && f.state !== 'ko') { f.idleT = (f.idleT || 0) + dt; if (f.idleT > 1.2) { f.hp = U.smooth(f.hp, f.maxHp, 6, dt); for (const k in f.armor) if (!f.broken[k]) f.armor[k] = f.armorMax[k]; } } else f.idleT = 0;
      if (Input.keyDown('KeyR') || Input.keyDown('Backspace')) { if (!T.resetHeld) { T.resetHeld = true; place(); M.phase = 'fight'; for (const f of M.fighters) { f.pos.y = 0; f.grounded = true; f.setState('idle'); } } } else T.resetHeld = false;
    }
    M.dispose = () => {
      M.disposed = true;
      for (const f of M.fighters) f.dispose();
      for (const p of M.picks) if (p.grp.parent) p.grp.parent.remove(p.grp);
      arena.dispose(); HUD.hide(M); if (!M.attract) Touch.hide();
      for (const p of Input.players) if (p.cpu && M.ai.includes(p.cpu)) p.cpu = null;
    };
    M.resize = (w, h) => { camera.aspect = w / h; camera.updateProjectionMatrix(); };
    if (!M.attract) { HUD.build(M); Touch.show(opts.mode === 'watch'); }
    camera.position.set(0, 9, 14); camera.lookAt(0, 0.6, 0);
    return M;
  }

  window.Match = { create };
})();
