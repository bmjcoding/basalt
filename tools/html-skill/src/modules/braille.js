/* Basalt HTML script, braille module: the <braille-spinner> element. */
(function (B) {
  'use strict';
  var _ = B._;

  // Braille dots as Unicode numbers them: 1 to 3 down the left column, 4 to 6 down the right. Only the six the frames use are drawn
  // (dots 7 and 8, the bottom row, are never lit), on a 6 by 10 grid. ⠋ (1, 2, 4) is frame one, and is held under reduced motion.
  var DOT_POS = { 1: [1, 1], 2: [1, 5], 3: [1, 9], 4: [5, 1], 5: [5, 5], 6: [5, 9] };

  function brailleSvg() {
    var dots = '';
    for (var d = 1; d <= 6; d++) {
      dots += '<circle class="braille-dot" data-dot="' + d + '"' + (d === 1 || d === 2 || d === 4 ? ' data-hold' : '') + ' cx="' + DOT_POS[d][0] + '" cy="' + DOT_POS[d][1] + '" r="1"/>';
    }
    return '<svg viewBox="0 0 6 10" aria-hidden="true" focusable="false">' + dots + '</svg>';
  }

  function defineElements() {
    if (typeof customElements === 'undefined' || customElements.get('braille-spinner')) return;
    customElements.define('braille-spinner', class extends HTMLElement {
      connectedCallback() {
        if (!this.firstElementChild) this.innerHTML = brailleSvg();
        var label = this.getAttribute('label');
        if (label) { this.setAttribute('role', 'status'); this.setAttribute('aria-label', label); } else this.setAttribute('aria-hidden', 'true');
        // Spinners on a page share one clock: every animation starts at the timeline's origin, so two mounted at different moments tick in phase.
        if (this.getAnimations) this.getAnimations({ subtree: true }).forEach(function (a) { a.startTime = 0; });
      }
    });
  }

  _.step(30, 'defineElements', defineElements);
})(window.Basalt);
