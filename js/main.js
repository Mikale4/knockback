/* main.js -- the renderer, the loop, and App (which view and which screen are up). */
(function () {
  'use strict';
  const canvas = U.$('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = U.touch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  if (U.touch) document.body.classList.add('touch');
  renderer.setClearColor(0x0c0a12);
  let W = 1, H = 1;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, U.touch ? 1.5 : 1.75)); renderer.setSize(W, H, false);
    if (App.view && App.view.resize) App.view.resize(W, H);
  }
  const App = {
    view: null, renderer,
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
  const autoPause = () => { const v = App.view; if (v && v.fighters && !v.attract && v.opts && v.opts.mode !== 'watch' && v.phase !== 'end' && !v.paused && !v.disposed) HUD.pause(v); };
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
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 200)); resize();

  let last = performance.now(), errs = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
    try {
      Input.update(t / 1000);
      if (App.view) { App.view.update(dt); renderer.render(App.view.scene, App.view.camera); }
      else renderer.clear();
    } catch (e) { if (errs++ < 5) console.error(e); }
  }
  requestAnimationFrame(frame);
  U.$('boot').remove();
  Menu.title();
  window.__ready = true;
})();
