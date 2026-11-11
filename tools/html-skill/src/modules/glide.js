/* Basalt HTML script, glide module: the shared plate of a popup's rows (React's GlidePlate), for the palette, the menu and the notification
   centre. Not a page API: a module's script calls _.glide(host, plate, kind) with the list that holds the rows and the plate it put in it.
   Source: tools/html-skill/src/modules/glide.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  /**
   * One plate that follows the lit row. Each row paints its own plate when lit; that stays the fallback, and the whole story on touch, under
   * reduced motion and in forced colours. Where it can, the list also draws ONE plate, placed by four CSS variables (the stylesheet
   * transitions transform, width and height on duration-base). The pointer moving the highlight travels it; a key moves it at once; from nowhere
   * it appears in place; when the highlight clears it freezes and fades where it is, and a return during the fade travels from there.
   * Returns the cleanup. The list's rows may be rebuilt: the plate is put back by the caller.
   *   kind.active   the selector of the lit row inside host (the primitive is the authority on which row is lit)
   *   kind.item     for a host with no highlight of its own (the notification centre, the navigation): the row under the pointer is marked data-hovered,
   *                 and the first key hides the plate (the ring shows) until the pointer moves again
   *   kind.shape    the box inside the row that the plate hugs (the navigation's pill), if not the row's own plate (its ::before)
   */
  _.glide = function (host, plate, kind) {
    var OFF = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active), (hover: none), (pointer: coarse)');
    var ACTIVE = kind.active;
    var modality = kind.item ? 'pointer' : 'keyboard';
    var last = null;
    var target = '';
    var snapNext = false;
    var leaving;

    function on() { return !OFF.matches && (kind.item ? modality === 'pointer' : modality !== 'touch'); }
    function lit() { return plate.dataset.state === 'on'; }
    // The row's own plate (its ::before) is the shape to follow, so the shared one matches the fallback to the pixel.
    function geometry(row) {
      var box = host.getBoundingClientRect();
      var ratio = host.offsetWidth > 0 ? box.width / host.offsetWidth : 1;
      var scale = Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
      var shape = kind.shape ? row.querySelector(kind.shape) : null;
      if (shape) {
        var hug = shape.getBoundingClientRect();
        return {
          x: (hug.left - box.left) / scale - host.clientLeft + host.scrollLeft,
          y: (hug.top - box.top) / scale - host.clientTop + host.scrollTop,
          w: hug.width / scale,
          h: hug.height / scale
        };
      }
      var at = row.getBoundingClientRect();
      var own = getComputedStyle(row, '::before');
      // A pseudo-element has no rectangle: its size is read from the computed style, which keeps four decimals, and the box lays out in 64ths of a pixel,
      // so a value is put on its 64th before it is written (77.6562 would truncate to 77.640625, not 77.65625).
      var snap = function (v) { return Math.round(v * 64) / 64; };
      return {
        x: (at.left - box.left) / scale - host.clientLeft + host.scrollLeft + snap(parseFloat(own.left) || 0),
        y: (at.top - box.top) / scale - host.clientTop + host.scrollTop + snap(parseFloat(own.top) || 0),
        w: snap(parseFloat(own.width)) || at.width / scale,
        h: snap(parseFloat(own.height)) || at.height / scale
      };
    }
    function write(g) {
      var st = plate.style;
      st.setProperty('--plate-x', g.x + 'px'); st.setProperty('--plate-y', g.y + 'px');
      st.setProperty('--plate-w', g.w + 'px'); st.setProperty('--plate-h', g.h + 'px');
    }
    // Runs `change` with the plate's transitions off and commits it, so it takes effect in place.
    function inPlace(change) {
      plate.setAttribute('data-snap', '');
      change();
      void plate.offsetWidth;
      plate.removeAttribute('data-snap');
    }
    function leave() {
      if (!lit()) return;
      // Freeze a move in progress where it has reached, then fade there: the off state has no transform transition, so what is written stays.
      var st = getComputedStyle(plate);
      var m = new DOMMatrixReadOnly(st.transform);
      write({ x: m.m41, y: m.m42, w: parseFloat(st.width), h: parseFloat(st.height) });
      plate.dataset.state = 'off';
      last = null;
      target = '';
    }
    function settle() {
      clearTimeout(leaving);
      leaving = undefined;
      host.toggleAttribute('data-glide', on());
      if (!on()) {
        if (plate.dataset.state !== 'off' || last) inPlace(function () { plate.dataset.state = 'off'; });
        last = null;
        target = '';
        return;
      }
      var row = host.querySelector(ACTIVE);
      if (!row) { leaving = setTimeout(function () { if (!host.querySelector(ACTIVE)) leave(); }, 0); return; }
      var g = geometry(row);
      var key = g.x + ' ' + g.y + ' ' + g.w + ' ' + g.h;
      if (row === last && lit() && key === target) return; // nothing changed: leave a move in flight alone
      target = key;
      // How much of the plate still shows: 0 once a fade has finished, so the plate appears in place.
      var shown = lit() ? 1 : parseFloat(getComputedStyle(plate).opacity) || 0;
      var travel = !snapNext && row !== last && modality === 'pointer' && shown > 0.01;
      snapNext = false;
      if (travel) { write(g); plate.dataset.state = 'on'; } else inPlace(function () { write(g); plate.dataset.state = 'on'; });
      last = row;
    }
    function input(e) {
      var next = modality;
      if (e.type === 'keydown') { if (!/^(Shift|Control|Alt|Meta)$/.test(e.key)) next = 'keyboard'; } else next = e.pointerType === 'touch' ? 'touch' : 'pointer';
      if (next === modality) return;
      var was = on();
      modality = next;
      if (kind.item) host.toggleAttribute('data-keys', modality === 'keyboard');
      if (on() !== was) settle();
    }
    // A host with no highlight of its own: the item under a mouse or pen is the lit one. Touch never lights it.
    function hover(e) {
      if (e.pointerType === 'touch') return;
      var item = e.target.closest(kind.item);
      var now = host.querySelector(ACTIVE);
      if (item === now) return;
      if (now) now.removeAttribute('data-hovered');
      if (item) item.setAttribute('data-hovered', '');
    }
    function unhover() { var now = host.querySelector(ACTIVE); if (now) now.removeAttribute('data-hovered'); }
    if (kind.item) { host.addEventListener('pointerover', hover); host.addEventListener('pointerleave', unhover); }

    plate.dataset.state = 'off';
    var changes = new MutationObserver(settle);
    changes.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: [kind.item ? 'data-hovered' : kind.attr] });
    // A row that moved under a still highlight (a filter, a font, a resize) is re-placed in place.
    var resizes = new ResizeObserver(function () { snapNext = true; target = ''; settle(); });
    resizes.observe(host);
    OFF.addEventListener('change', settle);
    var events = ['pointermove', 'pointerdown', 'keydown'];
    events.forEach(function (t) { document.addEventListener(t, input, { capture: true, passive: true }); });
    settle();
    return function () {
      clearTimeout(leaving);
      changes.disconnect();
      resizes.disconnect();
      OFF.removeEventListener('change', settle);
      events.forEach(function (t) { document.removeEventListener(t, input, { capture: true }); });
      if (kind.item) { host.removeEventListener('pointerover', hover); host.removeEventListener('pointerleave', unhover); unhover(); }
      host.removeAttribute('data-glide');
      host.removeAttribute('data-keys');
    };
  };
})(window.Basalt);
