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

  function wireSegments() {
    document.querySelectorAll('.segment').forEach(function (root) {
      if (root.__bh) return;
      root.__bh = true;
      attach(root);
    });
  }

  _.step(90, 'wireSegments', wireSegments);
})(window.Basalt);
