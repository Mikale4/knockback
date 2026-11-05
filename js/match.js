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
      frozen: false, freezeT: 0, freezer: null, slow: 1, slowT: 0, paused: false, projs: [], picks: [], clones: [], fx: [], minions: [], cine: null, camShot: null,
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

    /* ------------------------------------------- the SUMMONER's imps
       Little helpers: they walk in, bite, pounce on whatever she hits, and
       pop after a couple of hits (any attack that touches one hurts it). */
    let shotId = 0;
    const impCol = () => KB.LINES.summoner.pal.glow;
    const impR = f => { const it = ['card', 'head', 'armR', 'legs'].map(s => f.build[s]).find(b => b.line === 'summoner'); return it ? it.r || 0 : 0; };
    function poof(mn, quiet) {
      const i = M.minions.indexOf(mn); if (i < 0) return; M.minions.splice(i, 1); scene.remove(mn.obj);
      if (!quiet) { FX.burst(_v.copy(mn.pos).setY(mn.pos.y + 0.3), { n: 14, color: [impCol(), 0xffffff, KB.LINES.summoner.pal.second], glow: true, speed: 3, gravity: -2, size: 0.07, life: 0.5 }); SFX.play('pop'); }
    }
    M.summon = (f, n, quiet) => {
      for (let i = 0; i < n; i++) {
        const mine = M.minions.filter(mn => mn.owner === f);
        if (mine.length >= f.st.minions) poof(mine[0]);   // the oldest makes room
        const F = f.forward, side = (mine.length % 2 ? 1 : -1) * (0.8 + (i >> 1) * 0.5);
        const pos = new V3(U.clamp(f.pos.x + F.x * 0.7 + F.z * side, -arena.W + 0.4, arena.W - 0.4), 0, U.clamp(f.pos.z + F.z * 0.7 - F.x * side, -arena.D + 0.4, arena.D - 0.4));
        const obj = Models.imp('summoner', impR(f)); obj.position.copy(pos); obj.rotation.y = f.yaw; scene.add(obj);
        M.minions.push({ owner: f, obj, pos: obj.position, vel: new V3(0, 3, 0), yaw: f.yaw, hp: f.st.impHp, t: 0, life: f.st.impLife || 5, cd: U.rnd(0.4, 0.9), atk: 0, hurt: 0, hitBy: null, hitDone: false, air: true, mv: 'impBite' });
        if (!quiet) { FX.ring(pos.clone().setY(0.05), { r1: 0.9, life: 0.35, color: impCol() }); FX.burst(pos.clone().setY(0.4), { n: 10, color: [impCol(), 0xffffff], glow: true, speed: 2, gravity: -3, size: 0.06, life: 0.5 }); }
      }
      if (!quiet) SFX.play('pop');
    };
    function lunge(mn, o, dur, mv) {
      const dx = o.pos.x - mn.pos.x, dz = o.pos.z - mn.pos.z, d = Math.hypot(dx, dz) || 1, T = U.clamp(d / 9, 0.18, dur);
      mn.atk = T + 0.12; mn.hitDone = false; mn.cd = U.rnd(1.0, 1.5); mn.mv = mv || 'impBite';
      mn.vel.set(dx / d * Math.max(0, d - 0.6) / T, 4.5, dz / d * Math.max(0, d - 0.6) / T); mn.air = true; mn.yaw = Math.atan2(dx, dz);
    }
    /* her imps go for whoever she points at (all: every imp; otherwise only the ones close and ready) */
    M.minionsPounce = (f, o, all) => {
      for (const mn of M.minions) {
        if (mn.owner !== f || mn.hurt > 0) continue;
        const d = Math.hypot(o.pos.x - mn.pos.x, o.pos.z - mn.pos.z);
        if (!all && (d > 4.5 || mn.cd > 0.35 || mn.atk > 0)) continue;
        lunge(mn, o, all ? 0.55 : 0.32, 'impPounce');
      }
    };
    function hurtMinion(mn, att, id) {
      mn.hitBy = id; mn.hp--; mn.hurt = 0.3; mn.atk = 0;
      const k = _w.subVectors(mn.pos, att.pos).setY(0); if (k.lengthSq() < 1e-4) k.copy(att.forward); k.normalize();
      mn.vel.set(k.x * 6, 4, k.z * 6); mn.air = true;
      SFX.play('hit', { power: 0.6 }); FX.spark(_v.copy(mn.pos).setY(mn.pos.y + 0.5).clone(), { size: 0.8 });
      att.hype = Math.min(100, att.hype + 2);
      if (mn.hp <= 0) { M.call(mn.owner, 'IMP POPPED', 'small', mn.pos.clone().setY(mn.pos.y + 1)); poof(mn); }
    }
    /* any attack that reaches an imp hurts it (id: one hit per swing) */
    M.hitMinions = (att, c, r, id) => { for (const mn of M.minions.slice()) { if (mn.owner === att || mn.hitBy === id) continue; if (_v.copy(mn.pos).setY(mn.pos.y + 0.45).distanceTo(c) < r + 0.55) hurtMinion(mn, att, id); } };
    M.hitMinionsSeg = (att, a, b, r, id) => { for (const mn of M.minions.slice()) { if (mn.owner === att || mn.hitBy === id) continue; const p = Combat.closestOnSeg(a, b, mn.pos); if (Math.hypot(p.x - mn.pos.x, p.z - mn.pos.z) < r + 0.55 && Math.abs(mn.pos.y - a.y) < 1.7) hurtMinion(mn, att, id); } };
    M.hitMinionsRay = (att, from, dir, range, w, id) => {
      for (const mn of M.minions.slice()) {
        if (mn.owner === att) continue;
        const c = _w.copy(mn.pos).setY(mn.pos.y + 0.45), t = _v.subVectors(c, from).dot(dir);
        if (t < 0 || t > range) continue;
        if (from.clone().addScaledVector(dir, t).distanceTo(c) < w + 0.45) hurtMinion(mn, att, id);
      }
    };
    function updMinions(dt) {
      for (let i = M.minions.length - 1; i >= 0; i--) {
        const mn = M.minions[i], f = mn.owner, o = M.opp(f);
        mn.t += dt; mn.cd -= dt; mn.hurt = Math.max(0, mn.hurt - dt);
        if (mn.t > mn.life || f.state === 'ko' || !o) { poof(mn); continue; }
        const dx = o.pos.x - mn.pos.x, dz = o.pos.z - mn.pos.z, d = Math.hypot(dx, dz) || 1;
        if (mn.atk > 0) {
          mn.atk -= dt;
          if (!mn.hitDone && !['held', 'out', 'ko'].includes(o.state) && M.phase === 'fight' && Combat.overlap(_v.copy(mn.pos).setY(mn.pos.y + 0.45), 0.5, o)) {
            mn.hitDone = true; mn.vel.x *= -0.3; mn.vel.z *= -0.3;
            Combat.hit(f, o, KB.MOVES[mn.mv], { kind: 'minion', remote: true, from: mn.pos.clone(), dir: new V3(dx / d, 0, dz / d), at: _v.copy(mn.pos).setY(mn.pos.y + 0.45).clone() });
          }
        } else if (mn.hurt <= 0 && !mn.air && M.phase === 'fight' && !['out', 'ko'].includes(o.state)) {
          if (d > 1.1) {
            let vx = dx / d * 4.4, vz = dz / d * 4.4;
            for (const k of M.minions) if (k !== mn) { const ex = mn.pos.x - k.pos.x, ez = mn.pos.z - k.pos.z, e = Math.hypot(ex, ez); if (e < 0.85 && e > 1e-3) { vx += ex / e * 3; vz += ez / e * 3; } }
            mn.vel.x = U.smooth(mn.vel.x, vx, 10, dt); mn.vel.z = U.smooth(mn.vel.z, vz, 10, dt); mn.yaw = Math.atan2(dx, dz);
            if (Math.random() < dt * 2.5) { mn.vel.y = 2.4; mn.air = true; }
          } else { mn.vel.x *= 0.8; mn.vel.z *= 0.8; mn.yaw = Math.atan2(dx, dz); if (mn.cd <= 0) lunge(mn, o, 0.25); }
        } else if (!mn.air) { mn.vel.x *= Math.exp(-8 * dt); mn.vel.z *= Math.exp(-8 * dt); }
        mn.vel.y -= 22 * dt; mn.pos.addScaledVector(mn.vel, dt);
        if (mn.pos.y <= 0) { mn.pos.y = 0; mn.vel.y = 0; mn.air = false; if (mn.atk <= 0 && mn.hurt <= 0) { mn.vel.x *= 0.7; mn.vel.z *= 0.7; } }
        mn.pos.x = U.clamp(mn.pos.x, -arena.W + 0.4, arena.W - 0.4); mn.pos.z = U.clamp(mn.pos.z, -arena.D + 0.4, arena.D - 0.4);
        const ob = mn.obj; ob.rotation.y = U.turn(ob.rotation.y, mn.yaw, 1 - Math.exp(-12 * dt));
        ob.rotation.x = mn.atk > 0 ? 0.55 : mn.hurt > 0 ? -0.6 : 0; ob.rotation.z = !mn.air && mn.atk <= 0 ? Math.sin(mn.t * 16) * 0.14 : 0;
        ob.scale.setScalar(mn.hurt > 0 ? 1 + Math.sin(mn.hurt * 40) * 0.18 : 1);
        ob.visible = mn.life - mn.t > 1.2 || Math.sin(mn.t * 30) > 0;   // blinks out in its last second
      }
    }

    /* ------------------------------------------------------------ rounds */
    function place() {
      if (M.cine) Arts.end(M.cine);
      for (const mn of M.minions.slice()) poof(mn, true);
      arena.reset(); FX.clear();
      for (const p of M.picks) { if (p.grp.parent) p.grp.parent.remove(p.grp); }
      M.picks = []; M.projs.forEach(dropProj); M.projs = []; M.camShot = null; M.clones.forEach(c => c.f.dispose()); M.clones = [];
      M.fighters[0].resetRound(-3.2, 0.6, Math.PI / 2); M.fighters[1].resetRound(3.2, 0.6, -Math.PI / 2);
      for (const f of M.fighters) { f.pos.y = 7; f.grounded = false; f.setState('intro'); f.dropIn = true; }
      for (const f of M.fighters) if (f.st.perk === 'familiar') M.summon(f, 1, true);   // FAMILIAR: an imp from the start
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
    function rayHit(f, o, from, dir, range, w) {
      const c = _w.copy(o.pos).setY(o.pos.y + 0.9); const t = _v.subVectors(c, from).dot(dir);
      if (t < 0 || t > range) return null;
      const p = from.clone().addScaledVector(dir, t); return p.distanceTo(c) < (w || 0.75) ? p : null;
    }
    const glowMat = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op == null ? 0.9 : op, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    /* ---- what flies: aim, the muzzle flash, darts (a bullet, a kunai, a bolt) and the chain */
    const UP = new V3(0, 1, 0), CHAIN_N = 64, _q = new V3(), _o3 = new THREE.Object3D();
    /* point a shot at them if they're inside the cone in front (down: only if they're below) */
    /* where they'll be in t seconds: their velocity, gravity if they're in the air, and the walls they can't pass */
    function predict(o, t, out) {
      out.copy(o.pos).addScaledVector(o.vel, t);
      if (!o.grounded && o.state !== 'down') out.y -= 0.5 * 30 * t * t;
      out.y = Math.max(0, out.y) + (o.state === 'down' ? 0.3 : 0.95);
      out.x = U.clamp(out.x, -arena.W + 0.45, arena.W - 0.45); out.z = U.clamp(out.z, -arena.D + 0.45, arena.D - 0.45);
      return out;
    }
    /* aim a shot of the given speed at them: lead them, and turn to face it. Outside the cone (or out of range) it goes straight */
    function aimDir(f, o, from, dir, range, cone, down, speed) {
      if (!o || ['out', 'ko', 'getup'].includes(o.state) || (o.state === 'down' && !Combat.otgOk(f, o, f.move || {}, f.kind))) return dir;
      const tgt = predict(o, 0, new V3());
      for (let k = 0; k < 3 && speed; k++) predict(o, tgt.distanceTo(from) / speed, tgt);
      const d = tgt.sub(from), flat = _v.copy(d).setY(0), fl = flat.length();
      // (a downward shot -- Kunai Rain, Plunging Shot, Spirit Bolt -- aims at them too, level or below: the hit's own
      // knockback is what spikes them, so in an air combo it goes at them, not at the floor)
      if (fl < 0.05 || d.length() > range + 1.5) return dir;
      if (flat.multiplyScalar(1 / fl).dot(_q.copy(f.forward)) < cone) return dir;
      f.yaw = Math.atan2(d.x, d.z);
      return d.normalize();
    }
    function muzzleFlash(at, dir) {
      const q = at.clone().add(dir);
      const g = new THREE.ConeGeometry(0.2, 0.7, 8); g.rotateX(-Math.PI / 2); g.translate(0, 0, 0.35);
      const cone = new THREE.Mesh(g, glowMat(0xffc860, 1)); cone.position.copy(at); cone.lookAt(q); scene.add(cone); M.fx.push({ m: cone, t: 0, life: 0.07 });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), glowMat(0xffffff, 1)); core.position.copy(at); scene.add(core); M.fx.push({ m: core, t: 0, life: 0.05 });
      FX.spark(at, { color: 0xffc060, size: 0.9 });
      FX.burst(at, { n: 6, color: [0xffd060, 0xffffff], glow: true, speed: 6, size: 0.04, life: 0.16, gravity: 2, dir: dir.clone().multiplyScalar(2) });
      FX.burst(at, { n: 9, color: [0xd8d0c0, 0xa8a090, 0x8a847a], speed: 1.2, size: 0.13, gravity: -1.2, life: 0.9, dir: dir.clone().multiplyScalar(0.6) });
    }
    const LOOK = {
      bullet: { speed: 58, trail: 1.6, tw: 0.05, tcol: 0xffd27a, w: 0.62 },
      kunai: { speed: 34, trail: 0.7, tw: 0.025, tcol: 0xe6ecf4, w: 0.5 },
      bolt: { speed: 30, trail: 1.3, tw: 0.11, tcol: 0xffffff, w: 0.8 },
    };
    let kunaiSrc = null, weightSrc = null;
    const kunaiMesh = () => {
      if (!kunaiSrc) { const g = new VX.Grid(); g.box(0, 0, 0, 0, 0, 5, 0xd8dde6); g.box(-1, 0, 1, 1, 0, 2, 0xc8ced8); g.set(0, 0, 6, 0xffffff); g.box(0, 0, -3, 0, 0, -1, 0x2a2430); g.set(0, 1, -4, 0x8a8f9c); g.set(0, -1, -4, 0x8a8f9c); g.set(0, 0, -5, 0x8a8f9c); kunaiSrc = VX.object(g, 0.035); }
      return kunaiSrc.clone();
    };
    const chainWeight = () => {
      if (!weightSrc) { const g = new VX.Grid(); g.ell(0, 0, 0, 1.6, 1.6, 1.6, 0x4a4e5a); g.set(0, 0, 2, 0x9aa0ad); g.set(0, 0, 3, 0xc8ced8); g.set(0, 0, -2, 0x9aa0ad); weightSrc = VX.object(g, 0.055); }
      return weightSrc.clone();
    };
    const chainHand = f => f.fig.detached.armL ? _v.copy(f.pos).setY(1.1).addScaledVector(f.forward, 0.3).clone() : f.fig.socket('wL', [0, 0, 2]).clone();
    /* BARD: music notes, glowing voxel quavers in three colours */
    const NOTE_COLS = [0xff8ad8, 0xfff27a, 0x7cf9ff], noteSrc = {};
    const noteMesh = (i) => {
      const col = NOTE_COLS[i % 3], two = i % 2 === 1, k = col + (two ? 'b' : 'a');
      if (!noteSrc[k]) {
        const g = new VX.Grid(), c = VX.glow(col);
        g.ell(0, 0, 0, 1.6, 1.1, 0.6, c); g.box(1, 0, 0, 1, 6, 0, c); g.set(2, 6, 0, c); g.set(3, 5, 0, c); g.set(3, 4, 0, c);
        if (two) { g.ell(5, 1, 0, 1.6, 1.1, 0.6, c); g.box(6, 1, 0, 6, 7, 0, c); g.box(2, 6, 0, 6, 6, 0, c); g.box(2, 7, 0, 6, 7, 0, c); }
        noteSrc[k] = VX.object(g, 0.075);
      }
      return noteSrc[k].clone();
    };
    /* a few notes that float up off a hit and fade out (they shrink away) */
    M.noteFX = (at, n) => {
      for (let i = 0; i < (n || 3); i++) {
        const mesh = noteMesh(U.rndi(0, 5)); mesh.position.copy(at); scene.add(mesh);
        M.projs.push({ kind: 'fnote', mesh, vel: new V3(U.rnd(-1.4, 1.4), U.rnd(1.6, 2.8), U.rnd(-1.4, 1.4)), t: 0, life: U.rnd(0.6, 0.9), spin: U.rnd(-5, 5) });
      }
    };
    function hexGlyph(col) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 6), glowMat(col, 0.95)); g.add(ring);
      const tri = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.22, 3), glowMat(0xffffff, 0.9)); g.add(tri);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), glowMat(col, 1)); g.add(core);
      g.renderOrder = 14; return g;
    }
    function disposeGroup(g) { scene.remove(g); g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }
    function dart(f, mv, look, from, dir, range, opt) {
      opt = opt || {}; const L = LOOK[look];
      let mesh, own = true;
      if (look === 'kunai') { mesh = kunaiMesh(); own = false; }
      else if (look === 'bolt') mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), glowMat(opt.col || 0xffffff, 0.95));
      else mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.24), glowMat(0xfff4d0, 1));
      mesh.position.copy(from); mesh.lookAt(from.clone().add(dir)); scene.add(mesh);
      const trail = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glowMat(look === 'bolt' ? opt.col : L.tcol, look === 'kunai' ? 0.45 : 0.8));
      trail.scale.set(L.tw, L.tw, 0.001); trail.visible = false; scene.add(trail);
      M.projs.push({ kind: 'dart', look, f, mv, k: f.kind, charge: opt.charge || 0, pos: from.clone(), from: from.clone(), dir: dir.clone().normalize(), speed: L.speed, range, dist: 0, w: L.w,
        mesh, trail, own, grp: opt.grp || { done: false }, id: 's' + (++shotId), visual: !!opt.visual, col: opt.col, t: 0, stuck: null });
    }
    /* where a moving point (a to b) meets their body: standing (shins to head) or, for an OTG, lying on the floor */
    function bodyHit(f, o, a, b, w, mv, kind) {
      if (['out', 'ko', 'getup'].includes(o.state) || o.inv > 0) return null;
      const lying = o.state === 'down';
      if (lying && !Combat.otgOk(f, o, mv, kind)) return null;
      const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
      const t = l2 > 1e-6 ? U.clamp(((o.pos.x - a.x) * dx + (o.pos.z - a.z) * dz) / l2, 0, 1) : 1;
      const q = new V3(a.x + dx * t, a.y + (b.y - a.y) * t, a.z + dz * t);
      if (Math.hypot(q.x - o.pos.x, q.z - o.pos.z) > w + (lying ? 0.45 : 0)) return null;
      const lo = o.pos.y + (lying ? -0.2 : 0.15), hi = o.pos.y + (lying ? 0.75 : 1.75);
      return q.y >= lo && q.y <= hi ? q : null;
    }
    function killDart(p) {
      scene.remove(p.mesh); if (p.own) { p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
      if (p.trail) { if (p.trail.visible) M.fx.push({ m: p.trail, t: 0, life: 0.1 }); else { scene.remove(p.trail); p.trail.geometry.dispose(); p.trail.material.dispose(); } p.trail = null; }
    }
    function dartImpact(p, at, what) {
      const col = p.look === 'bolt' ? p.col : p.look === 'kunai' ? 0xe6ecf4 : 0xffd27a;
      if (what === 'fighter') { if (p.look === 'bolt') FX.burst(at, { n: 10, color: [col, 0xffffff], glow: true, speed: 3.5, size: 0.08, life: 0.4, gravity: 0 }); return; }
      if (what === 'wall' || what === 'floor') {
        FX.spark(at, { color: col, size: p.look === 'bolt' ? 1.1 : 0.6 });
        FX.burst(at, { n: 6, color: arena.dust, speed: 2.2, size: 0.07, life: 0.4 });
        if (p.look === 'bullet') FX.burst(at, { n: 5, color: [0xffe08a, 0xffffff], glow: true, speed: 5, size: 0.04, life: 0.2 });
        if (p.look === 'bolt') FX.burst(at, { n: 10, color: [col, 0xffffff], glow: true, speed: 3, size: 0.07, life: 0.35, gravity: 0 });
      } else FX.burst(at, { n: 3, color: p.look === 'bolt' ? [col] : [0xcfc8b8], glow: p.look === 'bolt', speed: 0.6, size: 0.06, life: 0.3, gravity: -1 });
    }
    /* the chain: hand to weight, a run of flat links that sag when slack and pull straight when they're taut */
    function drawChain(p, hand) {
      const len = hand.distanceTo(p.pos), n = Math.min(CHAIN_N, Math.max(2, Math.ceil(len / 0.11)));
      const sag = p.ph === 'out' ? 0.1 : p.ph === 'back' ? 0.35 : 0.02, wob = p.ph === 'out' ? 0.07 : 0;
      const side = _v.subVectors(p.pos, hand).setY(0); const sl = side.length() || 1; side.set(-side.z / sl, 0, side.x / sl);
      const pt = (s, out) => { out.lerpVectors(hand, p.pos, s); const e = Math.sin(Math.PI * s); out.y -= e * sag; out.addScaledVector(side, Math.sin(s * 9 - p.t * 50) * wob * e); return out; };
      const A = new V3(), B = new V3();
      for (let i = 0; i < n; i++) {
        pt(i / n, A); pt((i + 1) / n, B);
        _o3.position.lerpVectors(A, B, 0.5); _o3.scale.set(1, 1, Math.max(0.02, A.distanceTo(B) * 0.92)); _o3.lookAt(B); _o3.rotateZ(i % 2 ? Math.PI / 2 : 0); _o3.updateMatrix();
        p.links.setMatrixAt(i, _o3.matrix);
      }
      p.links.count = n; p.links.instanceMatrix.needsUpdate = true;
      p.weight.position.copy(p.pos); p.weight.lookAt(_v.copy(p.pos).multiplyScalar(2).sub(hand));
    }
    function endChain(p) { scene.remove(p.weight); scene.remove(p.links); p.links.geometry.dispose(); p.links.material.dispose(); if (p.vic) p.vic.chained = null; }
    M.fire = (f, mv, charge) => {
      const o = M.opp(f), F = f.forward;
      const muzzle = f.fig.detached.armL ? _v.copy(f.pos).setY(1.2).addScaledVector(F, 0.5).clone() : f.fig.socket('wL', [0, 2, 10]);
      if (mv.proj === 'shot' || mv.proj === 'shotDown' || mv.proj === 'superShot') {
        const down = mv.proj === 'shotDown', range = (mv.range || 6) + (charge || 0) * 3;
        // a pistol is aimed: if they're in front and in range, the shot goes at them, high or low (or on the floor)
        const dir = aimDir(f, o, muzzle, down ? new V3(F.x * 0.7, -0.7, F.z * 0.7).normalize() : F.clone(), range, 0.35, down, mv.proj === 'superShot' ? 0 : LOOK.bullet.speed);
        SFX.play('shot'); FX.addShake(0.15); muzzleFlash(muzzle, dir); f.kickT = 0.14;
        if (mv.proj === 'superShot') {
          // the Broadside's signal shot: decided on the spot (the Art waits on it), the ball still flies
          const hit = rayHit(f, o, muzzle, dir, range), end = hit || muzzle.clone().addScaledVector(dir, range);
          dart(f, mv, 'bullet', muzzle, dir, muzzle.distanceTo(end), { visual: true });
          if (hit && o.inv <= 0 && !['ko', 'out', 'down'].includes(o.state)) f.superCaught = true;
          setTimeout(() => { f.superCaught = false; }, 600);
        } else dart(f, mv, 'bullet', muzzle, dir, range, { charge });
      } else if (mv.proj === 'chain') {
        // NINJA: the kusarigama's weighted chain. It flies out, wraps them up, and drags them in (see updProjs)
        const range = mv.range + (charge || 0) * 2.5, hand = chainHand(f);
        const dir = aimDir(f, o, hand, F.clone(), range, 0.35, false, 42);
        const weight = chainWeight(); weight.position.copy(hand); scene.add(weight);
        const links = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.028, 1), new THREE.MeshLambertMaterial({ color: 0x9aa0ad }), CHAIN_N);
        links.count = 0; links.frustumCulled = false; links.castShadow = true; scene.add(links);
        M.projs.push({ kind: 'chain', f, mv, k: f.kind, charge, ph: 'out', pos: hand.clone(), dir, range, dist: 0, T: 0, t: 0, weight, links, id: 's' + (++shotId), vic: null });
        SFX.play('whoosh');
      } else if (mv.proj === 'part') {
        // PART TOSS: pull off a part of your own figure and throw it at them
        const part = f.tossable(); if (!part) return;
        const grp = f.fig.detach(part, scene); if (!grp) return;
        f.broken[part] = true; f.armor[part] = 0; if (part === 'armR') f.trailR.pts.length = 0; if (part === 'armL') f.trailL.pts.length = 0;
        M.call(f, part === 'head' ? 'HEAD TOSS!' : 'ARM TOSS!', 'part');
        const from = grp.position.clone(), SPD = 20;
        let vel = new V3(F.x * SPD, 1, F.z * SPD), homing = false;
        if (o && !['out', 'ko', 'getup'].includes(o.state) && U.dist(f.pos, o.pos) < mv.range + 2) {
          const tgt = predict(o, 0, new V3()); for (let k = 0; k < 3; k++) predict(o, tgt.distanceTo(from) / SPD, tgt);
          vel = tgt.sub(from).normalize().multiplyScalar(SPD); homing = true; f.yaw = Math.atan2(vel.x, vel.z);
        }
        M.projs.push({ kind: 'part', f, mv, k: f.kind, grp, part, item: f.build[part], pos: grp.position, vel, homing, spin: new V3(U.rnd(10, 16), U.rnd(-6, 6), 0), t: 0, done: false });
        SFX.play('whoosh'); FX.burst(from, { n: 8, color: [0xffffff, 0x9a9aa2], speed: 3, size: 0.06 });
      } else if (mv.proj === 'kunai' || mv.proj === 'kunaiDown') {
        const from = f.fig.detached.armR ? _v.copy(f.pos).setY(1.2).addScaledVector(F, 0.4).clone() : f.fig.socket('armR', [0, -9, 1]).clone();
        const down = mv.proj === 'kunaiDown', base = aimDir(f, o, from, down ? new V3(F.x * 0.72, -0.7, F.z * 0.72).normalize() : F.clone(), mv.range, 0.35, down, LOOK.kunai.speed);
        const grp = { done: false };   // three blades, one hit between them
        for (const a of [-0.16, 0, 0.16]) dart(f, mv, 'kunai', from, base.clone().applyAxisAngle(UP, a), mv.range, { grp });
        SFX.play('whoosh');
      } else if (mv.proj === 'bolt' || mv.proj === 'boltDown') {
        // SUMMONER: a bolt of spirit light from the staff
        const col = KB.LINES.summoner.pal.glow, from = f.fig.detached.armR ? _v.copy(f.pos).setY(1.2).addScaledVector(F, 0.5).clone() : f.fig.socket('wR', [0, 0, 14]).clone();
        const down = mv.proj === 'boltDown', dir = aimDir(f, o, from, down ? new V3(F.x * 0.72, -0.7, F.z * 0.72).normalize() : F.clone(), mv.range, 0.35, down, LOOK.bolt.speed);
        dart(f, mv, 'bolt', from, dir, mv.range, { col, charge }); SFX.play('whoosh');
        FX.burst(from, { n: 6, color: [col, 0xffffff], glow: true, speed: 2, size: 0.06, life: 0.3, gravity: 0 });
      } else if (mv.proj === 'hex') {
        // SUMMONER: a hex glyph spins out of the grimoire and bursts a few metres out, or on them
        const col = KB.LINES.summoner.pal.glow, range = mv.range + (charge || 0) * 1.5;
        const from = f.fig.detached.armL ? _w.copy(f.pos).setY(f.pos.y + 1).addScaledVector(F, 0.4).clone() : f.fig.socket('wL', [0, 0, 6]).clone();
        const dir = aimDir(f, o, from, F.clone(), range, 0.35, false, 22);
        const mesh = hexGlyph(col); mesh.position.copy(from); mesh.lookAt(from.clone().add(dir)); scene.add(mesh);
        M.projs.push({ kind: 'hex', f, mv, k: f.kind, charge, mesh, col, pos: from.clone(), dir, range, dist: 0, t: 0, id: 's' + (++shotId) });
        SFX.play('whoosh'); FX.burst(from, { n: 8, color: [col, 0xffffff], glow: true, speed: 2, size: 0.06, life: 0.3, gravity: 0 });
      } else if (mv.proj === 'breath') {
        M.projs.push({ kind: 'breath', f, mv, k: f.kind, t: 0, n: 0, id: 's' + (++shotId) }); SFX.play('boom');
      } else if (mv.proj === 'wave') {
        // BARD: a ring of sound that rolls forward
        const from = _w.copy(f.pos).setY(f.pos.y + 1).clone(), ring = new THREE.Group();
        [[0.95, 0xff8ad8, 0.5, 0], [0.7, 0xfff0fa, 0.4, -0.3]].forEach(([r, c, op, z]) => {
          const g = new THREE.SphereGeometry(r, 22, 6, 0, Math.PI * 2, 0, 0.8); g.rotateX(Math.PI / 2); g.translate(0, 0, z - r);
          const sh = new THREE.Mesh(g, glowMat(c, op)); sh.userData.op = op; sh.renderOrder = 14; ring.add(sh);
        });
        ring.position.copy(from); ring.lookAt(from.clone().add(F)); scene.add(ring);
        const notes = [0, 1, 2, 3].map(i => { const n = noteMesh(i); scene.add(n); return n; });
        M.projs.push({ kind: 'wave', f, mv, k: f.kind, charge, mesh: ring, notes, pos: from, dir: F.clone(), dist: 0, range: mv.range + (charge || 0) * 2, t: 0, id: 's' + (++shotId), hit: false });
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
      M.hitMinions(f, c, p.mv.rad, 's' + (++shotId));
      if (o && o.pos.distanceTo(_v.copy(c).setY(Math.max(0, c.y - 0.9))) < p.mv.rad + 0.5) {
        const d = _v.subVectors(o.pos, c).setY(0); if (d.lengthSq() < 0.01) d.copy(f.forward); d.normalize();
        Combat.hit(f, o, p.mv, { kind: 'special', dir: d.clone(), from: c.clone(), at: o.pos.clone().setY(1), proj: true });
      }
    }
    M.cannonball = (pos, cb) => {
      const g = new VX.Grid(); g.ell(0, 0, 0, 2, 2, 2, 0x1a1a20); const mesh = VX.object(g, 0.09); scene.add(mesh);
      mesh.position.set(pos.x + U.rnd(-0.4, 0.4), 9, pos.z + U.rnd(-0.4, 0.4));
      M.projs.push({ kind: 'ball', mesh, pos: mesh.position, vel: new V3(0, -30, 0), target: pos.y + 0.8, t: 0, cb });
    };
    M.chain = () => {};
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
      M.picks.push({ owner: vic, part, grp, vel, spin: new V3(U.rnd(-9, 9), U.rnd(-9, 9), U.rnd(-9, 9)), t: 0, rest: false, item: vic.build[part] });
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
          if (f.broken[p.part]) {
            // missing that part? snap it on: your own, or theirs (and its moves come with it)
            const swapped = f.wearPart(p);
            SFX.play('snapon'); M.call(f, swapped ? KB.LINES[p.item.line].name + ' ' + ({ head: 'HEAD', armL: 'L-ARM', armR: 'R-ARM' }[p.part]) + '!' : 'SNAP ON!', 'heal');
            FX.burst(g.position.clone(), { n: 12, color: [0xffffff, 0x9dff9a], glow: true, speed: 3, size: 0.06, life: 0.4 });
            M.picks.splice(i, 1); break;
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
      if (M.cine) {
        const sh = Arts.cam(M.cine), cut = sh.id !== M.camShot; M.camShot = sh.id;
        if (sh.pos.y < 2.8) { sh.pos.x = U.clamp(sh.pos.x, -arena.W + 0.35, arena.W - 0.35); sh.pos.z = U.clamp(sh.pos.z, -arena.D + 0.35, arena.D - 0.35); }   // never inside a wall
        if (cut) { M.camT.copy(sh.look); camera.position.copy(sh.pos); }
        else { const k = 6; M.camT.x = U.smooth(M.camT.x, sh.look.x, k, dt); M.camT.y = U.smooth(M.camT.y, sh.look.y, k, dt); M.camT.z = U.smooth(M.camT.z, sh.look.z, k, dt); camera.position.x = U.smooth(camera.position.x, sh.pos.x, k, dt); camera.position.y = U.smooth(camera.position.y, sh.pos.y, k, dt); camera.position.z = U.smooth(camera.position.z, sh.pos.z, k, dt); }
        camera.lookAt(M.camT); camera.position.x += FX.shake.x; camera.position.y += FX.shake.y; return;
      }
      M.camShot = null;
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
      if (M.cine) Arts.update(M.cine, rawDt);
      for (let i = 0; i < 2; i++) if (M.ai[i]) M.ai[i].think(dt);
      // phases
      if (M.phase === 'intro') {
        for (const f of M.fighters) { f.vel.y -= 30 * dt; f.pos.y = Math.max(0, f.pos.y + f.vel.y * dt); if (f.pos.y <= 0 && f.dropIn) { f.dropIn = false; f.vel.y = 0; f.grounded = true; SFX.play('land'); FX.burst(_v.copy(f.pos).setY(0.05), { n: 10, color: arena.dust, speed: 3, size: 0.09 }); } f.animate(dt); }
        if (M.phaseT > 1.6) { M.phase = 'fight'; M.phaseT = 0; for (const f of M.fighters) f.setState('idle'); if (!M.attract) { HUD.banner('FIGHT!', 'fight', 0.8); SFX.play('bell'); } }
      } else {
        for (const f of M.fighters) f.update(dt);
        separate();
        if (M.phase === 'fight' && !M.training && !M.attract && !M.cine) {
          M.clock -= dt;
          if (M.clock <= 0) { M.clock = 0; timeUp(); }
        }
        if (M.phase === 'ko') {
          if (M.phaseT > 2.2 && M.phaseT - dt <= 2.2) { const w = M.fighters[M.winner]; if (w.state !== 'out') { w.move = null; w.setState('victory'); w.faceOpp(); } }
          if (M.phaseT > 3.6) nextRound();
        }
        if (M.training) trainingTick(dt);
      }
      updProjs(dt); updPicks(dt); updMinions(dt); arena.update(dt);
      for (let i = M.clones.length - 1; i >= 0; i--) { const c = M.clones[i]; c.t += dt; c.f.root.position.lerpVectors(c.from, c.to, U.clamp(c.t / 0.22, 0, 1)); if (c.t > 0.4) { c.f.root.traverse(o => { if (o.isMesh && o.material.opacity) o.material.opacity *= 0.8; }); } if (c.t > 0.7) { c.f.dispose(); M.clones.splice(i, 1); } }
      for (let i = M.fx.length - 1; i >= 0; i--) { const e = M.fx[i]; e.t += dt; e.m.material.opacity = 1 - e.t / e.life; if (e.t > e.life) { scene.remove(e.m); e.m.geometry.dispose(); e.m.material.dispose(); M.fx.splice(i, 1); } }
      updCamera(rawDt); FX.update(dt);
      if (!M.attract) HUD.update(M);
    };
    /* take something that's flying out of the scene (a new round, the end of the match) */
    function dropProj(p) {
      if (p.kind === 'dart') killDart(p); else if (p.kind === 'chain') endChain(p); else if (p.kind === 'hex') disposeGroup(p.mesh);
      else if (p.kind === 'wave') { disposeGroup(p.mesh); p.notes.forEach(n => scene.remove(n)); }
      else if (p.kind === 'part') { if (p.grp.parent) p.grp.parent.remove(p.grp); }
      else if (p.mesh) scene.remove(p.mesh);
    }
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
            FX.spark(p.pos.clone(), { color: 0xffb040, size: 2 }); FX.addShake(0.3); scene.remove(p.mesh); M.projs.splice(i, 1); if (p.cb) p.cb();
          }
        } else if (p.kind === 'breath') {
          // DRAGOON: three bursts of fire in a cone; the last one throws them
          const f = p.f, o = M.opp(f), F = f.forward, from = f.fig.detached.head ? _v.copy(f.pos).setY(1.6).clone() : f.fig.socket('head', [0, 2, 6]);
          for (let k = 0; k < 3; k++) FX.burst(from, { n: 1, color: [0xffd040, 0xff6a20, 0xff3010], glow: true, speed: p.mv.range * 2.4, size: 0.13, gravity: -2, life: 0.3, up: 0.15, dir: new V3(F.x * 1.6, 0.05, F.z * 1.6), drag: 2 });
          while (p.n < 3 && p.n <= Math.floor(p.t / 0.12)) {
            const last = p.n === 2; p.n++;
            for (const s of [1, 2, 3]) M.hitMinions(f, _w.copy(f.pos).setY(f.pos.y + 1).addScaledVector(F, s).clone(), 0.35 + s * 0.2, p.id + ':' + p.n);
            const dx = o.pos.x - f.pos.x, dz = o.pos.z - f.pos.z, d = Math.hypot(dx, dz);
            const ang = d > 0.01 ? Math.acos(U.clamp((dx * F.x + dz * F.z) / d, -1, 1)) : 0;
            if (d < p.mv.range + 0.4 && ang < 0.6 && Math.abs(o.pos.y - f.pos.y) < 1.8 && o.inv <= 0) {
              const mv = last ? p.mv : Object.assign({}, p.mv, { kb: [2, 0], launch: 0, stun: 0.4 });
              Combat.hit(f, o, mv, { kind: p.k, at: _v.copy(o.pos).setY(o.pos.y + 1.1).clone(), from: f.pos.clone(), dir: F.clone(), proj: true, multiHit: !last });
            }
          }
          if (p.t > 0.38) M.projs.splice(i, 1);
        } else if (p.kind === 'dart') {
          if (p.stuck != null) { p.stuck -= dt; if (p.stuck <= 0) { killDart(p); M.projs.splice(i, 1); } continue; }   // a kunai left in the wall
          const f = p.f, o = M.opp(f), a = _q.copy(p.pos), step = Math.min(p.speed * dt, p.range - p.dist);
          p.pos.addScaledVector(p.dir, step); p.dist += step;
          let end = null, what = null;
          if (!p.visual && !p.grp.done && o) { const q = bodyHit(f, o, a, p.pos, p.w, p.mv, p.k); if (q) { end = q; what = 'fighter'; } }
          if (!p.visual) M.hitMinionsSeg(f, a, p.pos, 0.15, p.id);
          if (!end) for (const w of arena.walls) if (!w.broken && w.sign * p.pos[w.axis] > w.lim - 0.06) { p.pos[w.axis] = w.sign * (w.lim - 0.06); end = p.pos.clone(); what = 'wall'; break; }
          if (!end && p.pos.y <= 0.04) { p.pos.y = 0.04; end = p.pos.clone(); what = 'floor'; }
          if (!end && p.dist >= p.range) { end = p.pos.clone(); what = 'air'; }
          if (end) p.pos.copy(end);
          p.mesh.position.copy(p.pos); if (p.look === 'kunai') p.mesh.rotateZ(dt * 25);
          const tl = Math.min(LOOK[p.look].trail, p.pos.distanceTo(p.from));
          if (tl > 0.03) { p.trail.visible = true; p.trail.position.copy(p.pos).addScaledVector(p.dir, -tl / 2); p.trail.scale.z = tl; p.trail.lookAt(p.pos); }
          if (p.look === 'bolt' && Math.random() < 0.6) FX.burst(p.pos, { n: 1, color: [p.col, 0xffffff], glow: true, speed: 0.6, size: 0.06, life: 0.3, gravity: 0 });
          if (!end) continue;
          if (what === 'fighter') { p.grp.done = true; Combat.hit(f, o, p.mv, { kind: p.k, charge: p.charge, at: end.clone(), from: f.pos.clone(), dir: _v.copy(p.dir).setY(0).normalize().clone(), proj: true, otg: o.state === 'down' }); }
          dartImpact(p, end, what);
          if (p.look === 'kunai' && (what === 'wall' || what === 'floor')) { p.stuck = 0.9; if (p.trail) { M.fx.push({ m: p.trail, t: 0, life: 0.1 }); p.trail = null; } continue; }
          killDart(p); M.projs.splice(i, 1);
        } else if (p.kind === 'fnote') {
          p.t += 0; p.mesh.position.addScaledVector(p.vel, dt); p.vel.multiplyScalar(Math.exp(-2.5 * dt)); p.mesh.quaternion.copy(camera.quaternion); p.mesh.rotateZ(Math.sin(p.t * 6) * 0.3 + p.spin * 0.05);
          const k = p.t / p.life; p.mesh.scale.setScalar(k < 0.15 ? k / 0.15 : k > 0.7 ? Math.max(0.01, (1 - k) / 0.3) : 1);
          if (k >= 1) { scene.remove(p.mesh); M.projs.splice(i, 1); }
        } else if (p.kind === 'hex') {
          const f = p.f, o = M.opp(f), a = _q.copy(p.pos).clone(), step = Math.min(22 * dt, p.range - p.dist);
          p.pos.addScaledVector(p.dir, step); p.dist += step; p.mesh.position.copy(p.pos); p.mesh.quaternion.copy(camera.quaternion); p.mesh.rotateZ(p.t * 9);   // a magic circle, turned to face you
          const sc = 1.3 + p.dist * 0.1; p.mesh.scale.setScalar(sc);
          if (Math.random() < 0.7) FX.burst(p.pos, { n: 1, color: [p.col, 0xffffff], glow: true, speed: 0.5, size: 0.06, life: 0.3, gravity: 0 });
          const q = o ? bodyHit(f, o, a, p.pos, 0.9, p.mv, p.k) : null;
          let wall = false; for (const w of arena.walls) if (!w.broken && w.sign * p.pos[w.axis] > w.lim - 0.15) { p.pos[w.axis] = w.sign * (w.lim - 0.15); wall = true; }
          if (q || wall || p.dist >= p.range) {
            const at = q || p.pos.clone(), col = p.col, n = p.dir;
            FX.ring(at.clone(), { r1: 1.7, life: 0.35, normal: n.clone(), color: col }); FX.ring(at.clone(), { r1: 1.1, life: 0.3, normal: n.clone(), color: 0xffffff });
            FX.burst(at, { n: 18, color: [col, 0xffffff], glow: true, speed: 5, size: 0.08, life: 0.45, gravity: 0 }); SFX.play('boom'); FX.addShake(0.2);
            M.hitMinions(f, at, 1.0, p.id);
            // the burst catches them if they're right there, glyph or no glyph
            const c = o && _w.copy(o.pos).setY(o.pos.y + 0.9);
            if (o && o.inv <= 0 && (q || c.distanceTo(at) < 1.25)) Combat.hit(f, o, p.mv, { kind: p.k, charge: p.charge, at: at.clone(), from: f.pos.clone(), dir: _v.copy(p.dir).setY(0).normalize().clone(), proj: true, otg: o.state === 'down' });
            disposeGroup(p.mesh); M.projs.splice(i, 1);
          }
        } else if (p.kind === 'part') {
          // a tossed part in flight; when it lands (or bounces off them) it's a part on the floor like any other
          const f = p.f, o = M.opp(f), a = _q.copy(p.pos).clone();
          if (p.homing && o && !p.done && p.t < 1.1) {
            // it steers onto them (where they're going) until it passes them
            const tgt = predict(o, Math.min(0.3, o.pos.distanceTo(p.pos) / 20), new V3()), want = tgt.sub(p.pos);
            if (want.dot(p.vel) <= 0 || ['out', 'ko', 'getup'].includes(o.state)) p.homing = false;
            else { const sp = p.vel.length(), cur = p.vel.clone().normalize(), w = want.normalize(), ang = cur.angleTo(w), k = ang > 1e-4 ? Math.min(1, 9 * dt / ang) : 1; p.vel.copy(cur.lerp(w, k).normalize().multiplyScalar(sp)); }
          } else p.vel.y -= 18 * dt;
          p.pos.addScaledVector(p.vel, dt); p.grp.rotation.x += p.spin.x * dt; p.grp.rotation.y += p.spin.y * dt;
          if (Math.random() < 0.5) FX.burst(p.pos.clone(), { n: 1, color: 0xffffff, speed: 0.4, size: 0.05, life: 0.25, gravity: 0 });
          let land = p.t > 1.6 || (p.pos.y <= 0.15 && !(p.homing && o && o.state === 'down'));
          const q = o && !p.done ? bodyHit(f, o, a, p.pos, 0.75, p.mv, p.k) : null;
          if (q) {
            p.done = true; land = true;
            Combat.hit(f, o, p.mv, { kind: p.k, at: q.clone(), from: f.pos.clone(), dir: _v.copy(p.vel).setY(0).normalize().clone(), proj: true, ext: true, otg: o.state === 'down' });
            p.vel.set(-p.vel.x * 0.2, 4.5, -p.vel.z * 0.2);
          }
          for (const w of arena.walls) if (!w.broken && w.sign * p.pos[w.axis] > w.lim - 0.2) { p.pos[w.axis] = w.sign * (w.lim - 0.2); p.vel[w.axis] *= -0.4; land = true; }
          if (land) { M.picks.push({ owner: f, part: p.part, grp: p.grp, vel: p.vel.clone(), spin: p.spin.clone().multiplyScalar(0.6), t: 0, rest: false, item: p.item }); M.projs.splice(i, 1); }
        } else if (p.kind === 'chain') {
          // out: the weight flies -- wrap: it whips round them -- pull: they're dragged in -- back: a miss, it's reeled in
          const f = p.f, o = M.opp(f), hand = chainHand(f); p.T += dt; p.t += dt;
          const cut = f.inHitstun || ['ko', 'out', 'held', 'down'].includes(f.state);
          if (cut && p.ph !== 'back') { if (p.vic) p.vic.chained = null; p.vic = null; p.ph = 'back'; p.T = 0; p.backFrom = p.pos.clone(); }
          if (p.ph === 'out') {
            const a = _q.copy(p.pos).clone(), step = Math.min(42 * dt, p.range - p.dist); p.pos.addScaledVector(p.dir, step); p.dist += step;
            M.hitMinionsSeg(f, a, p.pos, 0.25, p.id);
            let stop = p.dist >= p.range;
            const q = o ? bodyHit(f, o, a, p.pos, 0.65, p.mv, p.k) : null;
            if (q) {
              p.pos.copy(q);
              const res = Combat.hit(f, o, p.mv, { kind: p.k, charge: p.charge, at: q.clone(), from: f.pos.clone(), dir: _v.copy(p.dir).setY(0).normalize().negate().clone(), proj: true, otg: o.state === 'down' });
              if (res === 'hit') { p.ph = 'wrap'; p.T = 0; p.vic = o; o.chained = p; FX.spark(q, { color: 0xd8dde6, size: 0.9 }); SFX.play('guard'); }
              else { stop = true; FX.spark(q, { color: 0x9fd0ff, size: 0.7 }); }   // guarded, or armour: it clanks off
            }
            for (const w of arena.walls) if (!stop && !w.broken && w.sign * p.pos[w.axis] > w.lim - 0.1) { p.pos[w.axis] = w.sign * (w.lim - 0.1); stop = true; FX.spark(p.pos.clone(), { color: 0xd8dde6, size: 0.6 }); FX.burst(p.pos.clone(), { n: 5, color: arena.dust, speed: 2, size: 0.06, life: 0.35 }); }
            if (stop && p.ph === 'out') { p.ph = 'back'; p.T = 0; p.backFrom = p.pos.clone(); }
          }
          if (p.ph === 'wrap' || p.ph === 'pull') {
            const v = p.vic;
            if (!v || v.state !== 'hit' || v.chained !== p) { if (v) v.chained = null; p.vic = null; p.ph = 'back'; p.T = 0; p.backFrom = p.pos.clone(); }
            else {
              const ang = p.t * 34, chest = _w.copy(v.pos).setY(v.pos.y + 1.0);
              p.pos.set(chest.x + Math.cos(ang) * 0.4, chest.y + Math.sin(ang * 0.5) * 0.12, chest.z + Math.sin(ang) * 0.4);
              f.yankT = 0.14;
              if (p.ph === 'wrap' && p.T > 0.07) {
                p.ph = 'pull'; p.T = 0; p.vicFrom = v.pos.clone(); SFX.play('whoosh');
                const d = _v.subVectors(v.pos, f.pos).setY(0), l = d.length() || 1; p.pullTo = new V3(f.pos.x + d.x / l * 1.05, 0, f.pos.z + d.z / l * 1.05);
              }
              if (p.ph === 'pull') {
                const k = U.clamp(p.T / 0.2, 0, 1), e = k * k;
                v.pos.lerpVectors(p.vicFrom, p.pullTo, e); v.pos.y = p.vicFrom.y * (1 - e); v.vel.set(0, 0, 0); v.grounded = v.pos.y <= 0.01;
                v.yaw = Math.atan2(f.pos.x - v.pos.x, f.pos.z - v.pos.z);
                if (Math.random() < 0.8) FX.burst(_q.copy(v.pos).setY(0.05), { n: 1, color: arena.dust, speed: 1.2, size: 0.08, life: 0.35 });
                if (k >= 1) { v.chained = null; p.vic = null; FX.burst(_q.copy(v.pos).setY(0.05), { n: 8, color: arena.dust, speed: 2.5, size: 0.08 }); SFX.play('land'); endChain(p); M.projs.splice(i, 1); continue; }
              }
            }
          }
          if (p.ph === 'back') {
            const k = U.clamp(p.T / 0.16, 0, 1); p.pos.lerpVectors(p.backFrom, hand, k * k);
            if (k >= 1) { endChain(p); M.projs.splice(i, 1); continue; }
          }
          drawChain(p, hand);
        } else if (p.kind === 'wave') {
          const step = 16 * dt; p.dist += step; p.pos.addScaledVector(p.dir, step); p.mesh.position.copy(p.pos);
          const s = 1 + p.dist * 0.35; p.mesh.scale.set(s, s, s); p.mesh.children.forEach(c => { c.material.opacity = c.userData.op * (1 - 0.7 * p.dist / p.range); });
          // its notes ride round the ring, bobbing
          const side = _v.set(p.dir.z, 0, -p.dir.x).normalize(), upv = _w.crossVectors(side, p.dir).normalize();
          p.notes.forEach((n, j) => { const a = p.t * 7 + j * Math.PI / 2, r = 0.85 * s; n.position.copy(p.pos).addScaledVector(side, Math.cos(a) * r).addScaledVector(upv, Math.sin(a) * r + Math.sin(p.t * 20 + j) * 0.06); n.quaternion.copy(camera.quaternion); n.rotateZ(Math.sin(p.t * 9 + j) * 0.4); n.scale.setScalar(1.1 * (1 - 0.4 * p.dist / p.range)); });
          if (Math.random() < 0.5) FX.burst(p.pos, { n: 1, color: [0xff8ad8, 0xfff27a, 0x7cf9ff], glow: true, speed: 1, size: 0.08, gravity: -1, life: 0.4 });
          M.hitMinions(p.f, p.pos, 0.6 + s * 0.3, p.id);
          const o = M.opp(p.f);
          if (!p.hit && o && o.inv <= 0 && Combat.overlap(p.pos, 0.5 + s * 0.3, o)) { p.hit = true; Combat.hit(p.f, o, p.mv, { kind: p.k, charge: p.charge, at: p.pos.clone(), from: p.f.pos.clone(), dir: p.dir.clone(), proj: true }); M.noteFX(p.pos.clone(), 4); }
          if (p.dist >= p.range) { disposeGroup(p.mesh); p.notes.forEach(n => scene.remove(n)); M.noteFX(p.pos.clone(), 2); M.projs.splice(i, 1); }
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
      M.disposed = true; if (M.cine) Arts.end(M.cine);
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
