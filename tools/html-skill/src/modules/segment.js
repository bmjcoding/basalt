/* Basalt HTML script, segment module: the segmented control's sliding pill (React's Pill). */
(function (B) {
  'use strict';
  var _ = B._;

  /**
   * Gives a .segment its shared pill, which travels to the pressed button. The pill's place is four CSS variables on the group, written from
   * the DOM; the stylesheet eases transform, width and height, so a second change retargets the move from wherever it has reached. A new
   * choice (aria-pressed changing) travels; the first measurement, a resize, a font arriving and added or removed buttons only re-place it.
   */
  function attach(root) {
    var pill = document.createElement('span');
    pill.className = 'pill';
    pill.setAttribute('aria-hidden', 'true');
    root.insertBefore(pill, root.firstChild);
    var chosen = null;
    var sent = '';
    var resizes = new ResizeObserver(function () { measure(false); });

    function measure(travel) {
      var item = root.querySelector('[aria-pressed="true"], [aria-checked="true"]');
      if (item !== chosen) {
        if (chosen) resizes.unobserve(chosen);
        if (item) resizes.observe(item);
        chosen = item;
      }
      if (!item) { root.removeAttribute('data-slide'); return; }
      var box = root.getBoundingClientRect();
      var at = item.getBoundingClientRect();
      // The scale a transformed ancestor (a dialog entering at .98) puts on a box, so measuring stays in layout pixels.
      var ratio = root.offsetWidth > 0 ? box.width / root.offsetWidth : 1;
      var scale = Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
      var key = [at.left - box.left, at.top - box.top, at.width, at.height, scale].join(' ');
      if (key === sent && root.hasAttribute('data-slide')) return;
      sent = key;
      function write() {
        var st = root.style;
        st.setProperty('--pill-x', (at.left - box.left) / scale - root.clientLeft + root.scrollLeft + 'px');
        st.setProperty('--pill-y', (at.top - box.top) / scale - root.clientTop + root.scrollTop + 'px');
        st.setProperty('--pill-w', at.width / scale + 'px');
        st.setProperty('--pill-h', at.height / scale + 'px');
      }
      if (travel && root.hasAttribute('data-slide')) { write(); return; }
      root.setAttribute('data-snap', '');
      write();
      root.setAttribute('data-slide', '');
      void pill.offsetWidth;
      root.removeAttribute('data-snap');
    }

    measure(false);
    resizes.observe(root);
    new MutationObserver(function (records) { measure(records.some(function (r) { return r.type === 'attributes'; })); })
      .observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-checked'] });
    addEventListener('resize', function () { measure(false); });
    if (document.fonts) document.fonts.ready.then(function () { measure(false); });
  }

  /**
   * Marks the track data-overflow while its buttons, with the port's padding, are wider than the track (held to the column by max-width, so the mark changes no
   * width and cannot flip back), measured now, on a resize of the track or a button, and when fonts arrive. While it overflows, the chosen button and a button
   * that takes focus are brought whole into view, clear of the fade (core's revealIn), and the port fades at each side that hides buttons (core's scrollFade).
   */
  function watchOverflow(root, port) {
    var buttons = function () { return Array.prototype.slice.call(root.querySelectorAll('button')); };
    var chosen = function () { return root.querySelector('button[aria-pressed="true"], button[aria-checked="true"]'); };
    var fade = _.scrollFade(port, { axis: 'inline' });
    var reveal = function (item) { _.revealIn(port, item); fade.refresh(); };
    var sizes = new ResizeObserver(function () { measure(); });
    function measure() {
      var all = buttons();
      var lo = Infinity, hi = -Infinity;
      all.forEach(function (b) { var r = b.getBoundingClientRect(); lo = Math.min(lo, r.left); hi = Math.max(hi, r.right); });
      var st = getComputedStyle(port);
      var need = all.length ? hi - lo + (parseFloat(st.paddingLeft) || 0) + (parseFloat(st.paddingRight) || 0) : 0;
      var over = need > root.getBoundingClientRect().width + 0.5;
      root.toggleAttribute('data-overflow', over);
      if (over) reveal(chosen());
      else fade.refresh();
    }
    measure();
    sizes.observe(root);
    buttons().forEach(function (b) { sizes.observe(b); });
    new MutationObserver(function () { if (root.hasAttribute('data-overflow')) reveal(chosen()); })
      .observe(root, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-checked'] });
    root.addEventListener('focusin', function (e) { if (root.hasAttribute('data-overflow')) reveal(e.target.closest('button')); });
    if (document.fonts) document.fonts.ready.then(measure);
  }

  function wireSegments() {
    document.querySelectorAll('.segment').forEach(function (root) {
      if (root.__bh) return;
      root.__bh = true;
      root.querySelectorAll('button').forEach(_.reserve);
      // The port (cimip-gaps-3 t7): the buttons move into it with the same padding and gap the track had, so nothing on the page moves. The theme choice
      // keeps its shipped wrap and has none.
      if (root.closest('.theme-choice')) { attach(root); return; }
      var port = document.createElement('div');
      port.className = 'segment-scroll';
      while (root.firstChild) port.appendChild(root.firstChild);
      root.appendChild(port);
      attach(port);
      watchOverflow(root, port);
    });
  }

  _.step(90, 'wireSegments', wireSegments);
})(window.Basalt);
