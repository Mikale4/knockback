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
    },
    quitMatch() { App.setView(null); Menu.hub(); },
  };
  window.App = App;
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
