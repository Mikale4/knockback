/* ============================================================================
   touch.js -- on-screen controls for phones and tablets (Player 1).

   Left half of the screen: a floating stick (it appears where your thumb
   lands). Right side: the buttons. Every button is held while touched, so
   charging a Heavy and Guard + Light (throw) work with two thumbs.
   Touch.state is merged into Player 1's input by input.js.
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U;
  const state = { move: { x: 0, y: 0 }, held: {}, active: false };
  const BTNS = [
    ['light', 'LIGHT'], ['heavy', 'HEAVY'], ['jump', 'JUMP'], ['dodge', 'DODGE'],
    ['guard', 'GUARD'], ['special', 'SPECIAL'], ['snap', 'SNAP'], ['super', 'SUPER'], ['toss', 'TOSS'],
  ];
  const R = 52; // how far the stick travels, px
  let root = null, zone, stick, knob, pid = null, sx = 0, sy = 0, btns = {};

  function placeStick(x, y) { stick.style.left = x + 'px'; stick.style.top = y + 'px'; }
  function restStick() { const r = zone.getBoundingClientRect(); placeStick(r.left + Math.min(110, r.width * 0.4), r.top + r.height * 0.68); knob.style.transform = ''; stick.classList.remove('on'); }
  function moveStick(e) {
    let dx = e.clientX - sx, dy = e.clientY - sy; const l = Math.hypot(dx, dy);
    if (l > R) { sx += dx * (1 - R / l); sy += dy * (1 - R / l); dx = e.clientX - sx; dy = e.clientY - sy; placeStick(sx, sy); } // the stick follows a thumb that wanders
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const k = Math.min(1, Math.hypot(dx, dy) / R), a = Math.atan2(-dy, dx);
    state.move.x = Math.cos(a) * k; state.move.y = Math.sin(a) * k;
    if (k < 0.18) state.move.x = state.move.y = 0;
  }
  function build() {
    root = el('div', { id: 'touch', hidden: true });
    zone = el('div', { class: 't-zone' }); stick = el('div', { class: 't-stick' }, knob = el('div', { class: 't-knob' })); zone.append(stick);
    zone.addEventListener('pointerdown', e => {
      if (pid != null) return; e.preventDefault(); pid = e.pointerId; try { zone.setPointerCapture(pid); } catch (x) { /* fine */ }
      sx = e.clientX; sy = e.clientY; placeStick(sx, sy); stick.classList.add('on'); moveStick(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === pid) moveStick(e); });
    const end = e => { if (e.pointerId !== pid) return; pid = null; state.move.x = state.move.y = 0; restStick(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    const pad = el('div', { class: 't-pad' });
    for (const [id, label] of BTNS) {
      const b = el('button', { class: 't-btn b-' + id }, el('span', null, label), el('em'));
      const up = () => { state.held[id] = false; b.classList.remove('down'); };
      b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } state.held[id] = true; b.classList.add('down'); if (navigator.vibrate) try { navigator.vibrate(6); } catch (x) { /* fine */ } });
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      pad.append(b); btns[id] = b;
    }
    const pause = el('button', { class: 't-pause', 'aria-label': 'Pause' }, '❚❚');
    pause.addEventListener('pointerdown', e => { e.preventDefault(); const v = App.view; if (v && v.fighters && !v.attract) HUD.pause(v); });
    root.append(zone, pad, pause, el('div', { class: 't-rotate' }, '↻ Turn your phone sideways', el('small', null, 'for the best view of the arena')));
    root.addEventListener('contextmenu', e => e.preventDefault());
    document.body.append(root);
  }
  function clear() { for (const k in state.held) state.held[k] = false; state.move.x = state.move.y = 0; pid = null; for (const k in btns) btns[k].classList.remove('down'); }

  const Touch = {
    state,
    /* show the controls for a fight; watchOnly (CPU vs CPU) shows just the pause button */
    show(watchOnly) {
      if (!U.touch) return;
      if (!root) build();
      clear(); root.hidden = false; root.classList.toggle('watch', !!watchOnly); state.active = !watchOnly;
      requestAnimationFrame(restStick);
    },
    hide() { if (!root) return; root.hidden = true; state.active = false; clear(); },
    /* keep the buttons honest about what they'll do right now */
    sync(f) {
      if (!root || root.hidden || !f) return;
      btns.super.classList.toggle('ready', f.hype >= 100);
      btns.special.classList.toggle('off', f.broken.head || f.uses <= 0);
      btns.special.lastChild.textContent = f.broken.head ? '✕' : f.uses;
      const burst = (f.inHitstun || f.state === 'held') && f.burst >= 100;
      btns.snap.firstChild.textContent = burst ? 'BURST' : 'SNAP';
      btns.snap.classList.toggle('ready', burst || (f.state === 'attack' && f.hype >= 50));
    },
  };
  window.Touch = Touch;
})();
