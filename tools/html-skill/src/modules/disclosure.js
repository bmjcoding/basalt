/* Basalt HTML script, disclosure module: button[data-disclosure] shows and hides the element it controls. With data-reveal it is "Show all":
   the rest of a list opens in place (DECISIONS 152, D6), as React's Reveal and DirectoryList. */
(function (B) {
  'use strict';
  var _ = B._;

  /* The element the button controls is the root: it gets data-reveal, data-open and data-settled; each .reveal-clip inside is inert while closed. Settled is
     the transition's own end (or at once when nothing moves), and a keyboard open puts focus on the first new row only then, so its ring is whole. */
  function wireReveal(button, root) {
    var closed = button.textContent.trim();
    var opened = button.getAttribute('data-open-label') || closed;
    var land = false;
    root.setAttribute('data-reveal', '');
    function show(open, settled) {
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? opened : closed;
      root.toggleAttribute('data-open', open);
      root.toggleAttribute('data-settled', settled);
      root.querySelectorAll('.reveal-clip').forEach(function (clip) { clip.inert = !open; });
    }
    function settle() {
      root.setAttribute('data-settled', '');
      if (!land) return;
      land = false;
      var first = root.querySelector('.reveal-clip a[href], .reveal-clip button, .reveal-clip input, .reveal-clip select, .reveal-clip textarea');
      if (first) first.focus();
    }
    var open = button.getAttribute('aria-expanded') === 'true';
    show(open, open);
    root.addEventListener('transitionend', function (event) {
      if (event.propertyName === 'grid-template-rows' && root.hasAttribute('data-open')) settle();
    });
    button.addEventListener('click', function (event) {
      var next = button.getAttribute('aria-expanded') !== 'true';
      // A click from the keyboard has no pointer position: its detail is 0.
      land = next && event.detail === 0;
      show(next, false);
      var panel = root.querySelector('.reveal');
      if (next && (!panel || parseFloat(getComputedStyle(panel).transitionDuration) === 0)) settle();
    });
  }

  function wireDisclosure() {
    document.querySelectorAll('button[data-disclosure]').forEach(function (button) {
      if (button.__bh) return;
      button.__bh = true;
      if (button.hasAttribute('data-reveal')) { var root = document.getElementById(button.getAttribute('aria-controls')); if (root) wireReveal(button, root); return; }
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
