/* Basalt HTML script, braille module: the <braille-spinner> element. */
(function (B) {
  'use strict';
  var _ = B._;


  // Braille dots: 1 to 3 down the left column, 4 to 6 down the right, 7 and 8 the bottom row. ⠋ (1, 2, 4) is held under reduced motion.
  var DOT_POS = { 1: [2, 2], 2: [2, 6], 3: [2, 10], 4: [6, 2], 5: [6, 6], 6: [6, 10], 7: [2, 14], 8: [6, 14] };

  function brailleSvg() {
    var dots = '';
    for (var d = 1; d <= 8; d++) {
      dots += '<circle class="braille-dot" data-dot="' + d + '"' + (d === 1 || d === 2 || d === 4 ? ' data-hold' : '') + ' cx="' + DOT_POS[d][0] + '" cy="' + DOT_POS[d][1] + '" r="1.5"/>';
    }
    return '<svg viewBox="0 0 8 16" aria-hidden="true" focusable="false">' + dots + '</svg>';
  }

  function defineElements() {
    if (typeof customElements === 'undefined' || customElements.get('braille-spinner')) return;
    customElements.define('braille-spinner', class extends HTMLElement {
      connectedCallback() {
        if (!this.firstElementChild) this.innerHTML = brailleSvg();
        var label = this.getAttribute('label');
        if (label) { this.setAttribute('role', 'status'); this.setAttribute('aria-label', label); } else this.setAttribute('aria-hidden', 'true');
      }
    });
  }

  _.step(30, 'defineElements', defineElements);
})(window.Basalt);
