/* Basalt HTML script, disclosure module: button[data-disclosure] shows and hides the element it controls. */
(function (B) {
  'use strict';
  var _ = B._;

  function wireDisclosure() {
    document.querySelectorAll('button[data-disclosure]').forEach(function (button) {
      if (button.__bh) return;
      button.__bh = true;
      var panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;
      var open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      button.addEventListener('click', function () {
        var next = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(next));
        panel.hidden = !next;
      });
    });
  }

  _.step(80, 'wireDisclosure', wireDisclosure);
})(window.Basalt);
