/* ============================================================================
   fx.js -- particles (instanced voxel cubes), hit sparks, shockwave rings,
   weapon trails, floating callouts and camera shake.
   FX.init(scene) once per scene; FX.update(dt) every frame.
   ========================================================================== */
(function () {
  'use strict';
  const MAX = 900;
  let scene = null, litIM = null, glowIM = null, sparks = [], rings = [], trails = [], P = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _c = new THREE.Color(), _v = new THREE.Vector3();
  const shake = { amt: 0, x: 0, y: 0 };

  function starTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 18 : 64; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
    g.closePath(); g.fill();
    const t = new THREE.CanvasTexture(c); return t;
  }
  let starTex = null;

  const FX = {
    shake,
    init(sc) {
      scene = sc; P = []; sparks = []; rings = []; trails = [];
      const box = new THREE.BoxGeometry(1, 1, 1);
      litIM = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff }), MAX);
      glowIM = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAX);
      for (const im of [litIM, glowIM]) { im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.setColorAt(0, _c.set(1, 1, 1)); scene.add(im); }
      litIM.castShadow = true;
      if (!starTex) starTex = starTexture();
    },
    /* a spray of voxel cubes */
    burst(pos, o) {
      o = o || {}; const n = o.n || 10;
      for (let i = 0; i < n && P.length < MAX * 2; i++) {
        const sp = (o.speed || 5) * U.rnd(0.4, 1.1), a = Math.random() * Math.PI * 2, up = o.up != null ? o.up : 0.6;
        let dx = Math.cos(a), dz = Math.sin(a), dy = U.rnd(-0.2, 1) * up + (o.lift || 0);
        if (o.dir) { dx = dx * 0.5 + o.dir.x; dz = dz * 0.5 + o.dir.z; dy += o.dir.y || 0; }
        const l = Math.hypot(dx, dy, dz) || 1;
        const col = Array.isArray(o.color) ? U.pick(o.color) : (o.color != null ? o.color : 0xffffff);
        P.push({ x: pos.x + U.rnd(-0.1, 0.1), y: pos.y + U.rnd(-0.1, 0.1), z: pos.z + U.rnd(-0.1, 0.1), vx: dx / l * sp, vy: dy / l * sp, vz: dz / l * sp,
          life: (o.life || 0.6) * U.rnd(0.6, 1.2), t: 0, size: (o.size || 0.09) * U.rnd(0.6, 1.3), col, glow: !!o.glow, g: o.gravity != null ? o.gravity : 18,
          rx: Math.random() * 6, ry: Math.random() * 6, spin: U.rnd(-12, 12), floor: o.floor != null ? o.floor : 0, drag: o.drag || 0.6, shrink: o.shrink !== false });
      }
    },
    /* a white-hot star at an impact */
    spark(pos, o) {
      o = o || {};
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: o.color || 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, transparent: true }));
      m.position.copy(pos); const s = o.size || 1.2; m.scale.set(s, s, 1); m.material.rotation = Math.random() * 6; m.renderOrder = 20;
      scene.add(m); sparks.push({ m, t: 0, life: o.life || 0.16, s });
    },
    /* an expanding ring on the floor or facing a direction */
    ring(pos, o) {
      o = o || {};
      const g = new THREE.RingGeometry(0.8, 1, 40);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: o.color || 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      m.position.copy(pos);
      if (o.normal) m.lookAt(_v.copy(pos).add(o.normal)); else m.rotation.x = -Math.PI / 2;
      scene.add(m); rings.push({ m, t: 0, life: o.life || 0.35, r0: o.r0 || 0.2, r1: o.r1 || 3 });
    },
    /* a weapon trail: call trail.push(base, tip) each frame while swinging; it fades on its own */
    trail(color) {
      const N = 14, geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 3), idx = [];
      for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      mesh.frustumCulled = false; mesh.renderOrder = 15; scene.add(mesh);
      const T = { mesh, pts: [], color: new THREE.Color(color || 0xffffff), N, on: false,
        push(a, b) { T.pts.unshift({ a: a.clone(), b: b.clone(), t: 0 }); if (T.pts.length > N) T.pts.length = N; },
        dispose() { scene && scene.remove(mesh); geo.dispose(); mesh.material.dispose(); const i = trails.indexOf(T); if (i >= 0) trails.splice(i, 1); } };
      trails.push(T); return T;
    },
    /* a DOM callout over a world point: FX.call(pos, 'WALL BOUNCE', 'bounce') */
    call(pos, text, cls, camera) {
      const layer = U.$('callouts'); if (!layer || !camera) return;
      const v = pos.clone().project(camera);
      const e = U.el('div', { class: 'callout ' + (cls || '') }, text);
      e.style.left = ((v.x + 1) / 2 * 100) + '%'; e.style.top = ((1 - v.y) / 2 * 100) + '%';
      layer.append(e); setTimeout(() => e.remove(), 1100);
    },
    addShake(a) { shake.amt = Math.min(1.2, shake.amt + a); },
    update(dt) {
      // shake decays; its offset is applied by whoever owns the camera
      shake.amt = Math.max(0, shake.amt - dt * 2.8);
      shake.x = (Math.random() - 0.5) * shake.amt * 0.5; shake.y = (Math.random() - 0.5) * shake.amt * 0.5;
      let li = 0, gi = 0;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.t += dt;
        if (p.t >= p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
        p.vy -= p.g * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vz *= dr;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < p.floor + p.size / 2 && p.vy < 0) { p.y = p.floor + p.size / 2; p.vy *= -0.35; p.vx *= 0.6; p.vz *= 0.6; p.spin *= 0.5; }
        p.rx += p.spin * dt; p.ry += p.spin * 0.7 * dt;
        const k = p.shrink ? Math.min(1, (p.life - p.t) / (p.life * 0.4)) : 1;
        _q.setFromEuler(_e.set(p.rx, p.ry, 0)); _s.setScalar(p.size * k);
        _m.compose(_v.set(p.x, p.y, p.z), _q, _s);
        const im = p.glow ? glowIM : litIM, n = p.glow ? gi++ : li++;
        if (n >= MAX) continue;
        im.setMatrixAt(n, _m); im.setColorAt(n, _c.setHex(p.col));
      }
      if (litIM) {
        litIM.count = Math.min(li, MAX); glowIM.count = Math.min(gi, MAX);
        litIM.instanceMatrix.needsUpdate = glowIM.instanceMatrix.needsUpdate = true;
        if (litIM.instanceColor) litIM.instanceColor.needsUpdate = true; if (glowIM.instanceColor) glowIM.instanceColor.needsUpdate = true;
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.t += dt; const k = s.t / s.life;
        if (k >= 1) { scene.remove(s.m); s.m.material.dispose(); sparks.splice(i, 1); continue; }
        const sc = s.s * (0.6 + k * 0.8); s.m.scale.set(sc, sc, 1); s.m.material.opacity = 1 - k;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.t += dt; const k = r.t / r.life;
        if (k >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); continue; }
        const sc = U.lerp(r.r0, r.r1, U.easeOut(k)); r.m.scale.set(sc, sc, sc); r.m.material.opacity = 0.9 * (1 - k);
      }
      for (const T of trails) {
        for (const p of T.pts) p.t += dt;
        while (T.pts.length && T.pts[T.pts.length - 1].t > 0.16) T.pts.pop();
        const pos = T.mesh.geometry.attributes.position, col = T.mesh.geometry.attributes.color;
        for (let i = 0; i < T.N; i++) {
          const p = T.pts[Math.min(i, T.pts.length - 1)];
          const fade = p ? Math.max(0, 1 - p.t / 0.16) * (1 - i / T.N) : 0;
          for (let j = 0; j < 2; j++) {
            const q = p ? (j ? p.b : p.a) : _v.set(0, -99, 0);
            pos.setXYZ(i * 2 + j, q.x, q.y, q.z);
            const f = fade * (j ? 1 : 0.25);
            col.setXYZ(i * 2 + j, T.color.r * f, T.color.g * f, T.color.b * f);
          }
        }
        pos.needsUpdate = col.needsUpdate = true;
      }
    },
    clear() { P.length = 0; for (const s of sparks) scene.remove(s.m); for (const r of rings) scene.remove(r.m); sparks = []; rings = []; },
  };
  window.FX = FX;
})();
