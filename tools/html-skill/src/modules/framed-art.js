/* Basalt HTML script, framed-art module: the frame's phase (React's FramedArt). The frame shows `surface-placeholder` while its picture loads (the picture is
   hidden) and if it fails (the picture is gone and, for meaningful art, its alt text is shown); once decoded the picture fades in. What the document already knows
   is not faded: a picture that finished before this ran is shown at once. Without script the picture simply shows.
   Source: tools/html-skill/src/modules/framed-art.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  function wire(frame) {
    var img = frame.querySelector('img');
    if (!img || frame.hasAttribute('data-phase')) return;
    // Entering the loading state is instant: a picture drawn a moment ago does not fade out (the inline rule is gone before the phase that fades it in).
    var shown = function (phase) { img.style.removeProperty('transition'); frame.setAttribute('data-phase', phase); };
    var failed = function () {
      shown('failed');
      var alt = img.getAttribute('alt');
      if (alt) frame.insertAdjacentHTML('beforeend', '<span class="framed-alt">' + _.esc(alt) + '</span>');
    };
    // Decoded, then shown, so a fade never starts on a half-painted picture.
    var loaded = function () {
      var done = function () { shown('loaded'); };
      if (img.decode) img.decode().then(done, done); else done();
    };
    if (img.complete) { if (img.naturalWidth > 0) shown('loaded'); else failed(); return; }
    img.style.transition = 'none';
    frame.setAttribute('data-phase', 'loading');
    img.addEventListener('load', loaded, { once: true });
    img.addEventListener('error', failed, { once: true });
  }

  _.step(52, 'wireFramedArt', function () { document.querySelectorAll('.framed-frame').forEach(wire); });
})(window.Basalt);
