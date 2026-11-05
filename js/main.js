/* main.js -- the renderer, the loop, and App (which view and which screen are up). */
(function () {
  'use strict';
  const canvas = U.$('view');
  /* GRAPHICS (Options): AUTO starts at MEDIUM on phones and tablets, HIGH on computers, and steps down a level if a
     fight can't hold ~50 fps; or pick HIGH / MEDIUM / LOW. A level sets the resolution (pixel ratio), the shadows and
     how many particles effects throw. (Looks only: the fight itself is the same at every level.) */
  const QUALITY = {
    high: { pr: U.touch ? 1.5 : 1.75, shadows: true, soft: !U.touch, fx: 1 },
    medium: { pr: 1.25, shadows: true, soft: false, fx: 0.7 },
    low: { pr: 1, shadows: false, soft: false, fx: 0.45 },
  };
  const LEVELS = ['high', 'medium', 'low'];
  const Gfx = { mode: U.read('kb.gfx', 'auto'), level: null, epoch: 0, fps: !!U.read('kb.fps', false) };
  if (!['auto', ...LEVELS].includes(Gfx.mode)) Gfx.mode = 'auto';
  const autoAt = U.read('kb.gfxAuto', null);   // (where AUTO stepped down to last time)
  Gfx.level = Gfx.mode !== 'auto' ? Gfx.mode : LEVELS.includes(autoAt) ? autoAt : U.touch ? 'medium' : 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: Gfx.level !== 'low', powerPreference: 'high-performance' });
  if (U.touch) document.body.classList.add('touch');
  renderer.setClearColor(0x0c0a12);
  let W = 1, H = 1;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[Gfx.level].pr)); renderer.setSize(W, H, false);
    if (App.view && App.view.resize) App.view.resize(W, H);
  }
  function applyGfx() {
    const q = QUALITY[Gfx.level];
    renderer.shadowMap.enabled = q.shadows; renderer.shadowMap.type = q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.needsUpdate = true;
    FX.amount = q.fx; Gfx.epoch++; resize();
  }
  /* materials compile for the shadow settings they're first drawn with: after a change, each one on screen recompiles once */
  function refreshMaterials(scene) {
    if (!scene || scene.__gfx === Gfx.epoch) return; scene.__gfx = Gfx.epoch;
    scene.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) if (m.__gfx !== Gfx.epoch) { m.__gfx = Gfx.epoch; m.needsUpdate = true; } });
  }
  const App = {
    view: null, renderer, gfx: Gfx, levels: LEVELS,
    setGfx(mode) { Gfx.mode = mode; U.write('kb.gfx', mode); Gfx.level = mode === 'auto' ? (U.touch ? 'medium' : 'high') : mode; U.write('kb.gfxAuto', null); Gfx.slow = 0; applyGfx(); },
    setFps(on) { Gfx.fps = !!on; U.write('kb.fps', Gfx.fps); fpsEl.hidden = !Gfx.fps; },
    setView(v) {
      if (App.view && App.view !== v && App.view.dispose) App.view.dispose();
      App.view = v; if (v && v.resize) v.resize(W, H);
    },
    screen(node) { const s = U.$('screens'); s.innerHTML = ''; if (node) s.append(node); },
    startMatch(opts) {
      App.screen(null); Music.play('battle');
      const o = Object.assign({}, opts);
      const m = Match.create(Object.assign({}, o, { onEnd: res => setTimeout(() => { if (App.view === m) Menu.results(res, opts); }, 900) }));
      App.setView(m);
      if (window.Rewards) Rewards.watch(m, opts);
    },
    quitMatch() { if (window.Tutorial && Tutorial.running()) return Tutorial.quit(); if (window.Trials && Trials.running()) return Trials.quit(); App.setView(null); Menu.hub(); },
  };
  window.App = App;
  /* phones and tablets: the page never zooms. Safari ignores the viewport's user-scalable=no, so a pinch is stopped
     here (its gesture events, and any two-finger move outside the game's own touch controls); and if the page did end
     up zoomed (a text box, an old browser), it snaps back to 1x once you're done typing */
  if (U.touch) {
    for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', e => { if (e.touches.length > 1 && !e.target.closest('#touch')) e.preventDefault(); }, { passive: false });
    const vp = document.querySelector('meta[name=viewport]'), base = vp.content;
    const unzoom = () => { const v = window.visualViewport; if (v && v.scale <= 1.01) return; if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; vp.content = base + ', minimum-scale=1'; setTimeout(() => { vp.content = base; }, 60); };
    document.addEventListener('focusout', () => setTimeout(unzoom, 50));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => setTimeout(unzoom, 300));
    window.addEventListener('orientationchange', () => setTimeout(unzoom, 400));
  }
  /* step away (another tab, another window) and the fight pauses itself */
  const autoPause = () => { const v = App.view; if (v && v.fighters && !v.attract && v.opts && v.opts.mode !== 'watch' && !v.opts.online && v.phase !== 'end' && !v.paused && !v.disposed) HUD.pause(v); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  window.addEventListener('blur', autoPause);
  /* in a fight, the cursor hides once it stops moving */
  let curT = null;
  window.addEventListener('mousemove', () => { document.body.classList.remove('nocursor'); clearTimeout(curT); curT = setTimeout(() => { const v = App.view; if (v && v.fighters && !v.attract && !v.paused) document.body.classList.add('nocursor'); }, 1800); });
  /* Esc on a menu screen: close the pop-up, or go back */
  window.addEventListener('keydown', e => {
    if (e.code !== 'Escape' || e.repeat) return;
    const v = App.view; if (v && v.fighters && !v.attract) return;          // in a fight Esc pauses (match.js)
    if (document.querySelector('.kbtn.wait')) return;                        // a key slot is waiting for its key
    const ov = [...document.querySelectorAll('.overlay')].pop();
    if (ov) { const c = ov.querySelector('.mfoot button'); if (c) { e.preventDefault(); c.click(); } return; }
    const b = document.querySelector('#screens .backbtn'); if (b) { e.preventDefault(); b.click(); }
  });
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 200)); applyGfx();

  /* the FPS counter (Options), and AUTO's step down: in a fight, two 3-second stretches in a row under ~48 fps */
  const fpsEl = U.el('div', { id: 'fps', hidden: !Gfx.fps }); document.body.append(fpsEl);
  const meter = { n: 0, t: 0, win: 0, wn: 0 };
  function measure(ms) {
    meter.n++; meter.t += ms;
    if (meter.t >= 500) { if (Gfx.fps) fpsEl.textContent = Math.round(meter.n * 1000 / meter.t) + ' FPS · ' + Gfx.level.toUpperCase(); meter.n = 0; meter.t = 0; }
    const v = App.view, fighting = v && v.fighters && !v.paused && !v.attract && !document.hidden;
    if (Gfx.mode !== 'auto' || !fighting || ms > 250) { meter.win = 0; meter.wn = 0; return; }   // (a long gap is a hidden tab or a hitch, not the game being slow)
    meter.win += ms; meter.wn++;
    if (meter.win < 3000) return;
    const fps = meter.wn * 1000 / meter.win; meter.win = 0; meter.wn = 0;
    if (fps >= 48) { Gfx.slow = 0; return; }
    if (++Gfx.slow < 2) return;
    const i = LEVELS.indexOf(Gfx.level); if (i >= LEVELS.length - 1) return;
    Gfx.slow = 0; Gfx.level = LEVELS[i + 1]; U.write('kb.gfxAuto', Gfx.level); applyGfx();
    if (window.Menu && Menu.toast) Menu.toast('Graphics set to ' + Gfx.level.toUpperCase() + ' to keep the game smooth (OPTIONS to change it).');
  }

  /* phones: the screen doesn't dim or lock in the middle of a fight */
  let lock = null, wantLock = false;
  function keepAwake(on) {
    wantLock = on;
    if (on && !lock && navigator.wakeLock && !document.hidden) navigator.wakeLock.request('screen').then(l => { lock = l; l.addEventListener('release', () => { if (lock === l) lock = null; }); if (!wantLock) { l.release().catch(() => {}); } }).catch(() => {});
    if (!on && lock) { const l = lock; lock = null; l.release().catch(() => {}); }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && wantLock) { wantLock = false; keepAwake(true); } });

  let last = performance.now(), errs = 0, wasFight = false;
  function frame(t) {
    requestAnimationFrame(frame);
    const raw = Math.max(0, t - last), dt = Math.min(0.05, raw / 1000); last = t;
    try {
      Input.update(t / 1000);
      if (App.view) { App.view.update(dt); if (App.view) { refreshMaterials(App.view.scene); renderer.render(App.view.scene, App.view.camera); } }
      else renderer.clear();
    } catch (e) { if (errs++ < 5) console.error(e); }
    measure(raw);
    const fight = !!(App.view && App.view.fighters && !App.view.attract);
    if (fight !== wasFight) { wasFight = fight; keepAwake(fight); }
  }

  /* INSTALL: the game as an app (an icon on your home screen, full screen, playable offline once it has loaded).
     Chrome and Android offer it (OPTIONS has the button); on an iPhone or iPad it's Share, then Add to Home Screen.
     The offline copy (sw.js) is a service worker: the page itself always comes from the network when there is one, so a
     new version shows up on the next load; the game's files are stamped (?v=) so the copy is never stale. */
  App.install = { evt: null, installed: matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true,
    ios: /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); App.install.evt = e; });
  window.addEventListener('appinstalled', () => { App.install.installed = true; App.install.evt = null; if (window.Menu && Menu.toast) Menu.toast('Installed: KNOCK//BACK is on your home screen.', 'gold'); });
  App.install.prompt = async () => { const e = App.install.evt; if (!e) return false; e.prompt(); try { const c = await e.userChoice; if (c && c.outcome === 'accepted') App.install.evt = null; } catch (x) { /* fine */ } return true; };
  // (not on this computer's own test server, where every edit has to show up at once; ?sw=1 turns it on there for a test)
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !/[?&]sw=1/.test(location.search);
  if ('serviceWorker' in navigator && !local) navigator.serviceWorker.register('sw.js').catch(() => {});
  requestAnimationFrame(frame);
  U.$('boot').remove();
  Menu.title();
  window.__ready = true;
})();
