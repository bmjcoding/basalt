/* Basalt HTML script, framed-art module: the frame's phase (React's FramedArt). The frame shows `surface-placeholder` while its picture loads (the picture is
   hidden) and if it fails (the picture is gone and, for meaningful art, its alt text is shown); once decoded the picture fades in. What the document already knows
   is not faded: a picture that finished before this ran is shown at once. Without script the picture simply shows.
   Drawn art (an svg or canvas straight in the frame) takes data-fit and data-anchor from the figure.
   Source: tools/html-skill/src/modules/framed-art.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  /* How drawn art sits in its box (React's art-fit, DECISIONS 146 F): `slice` keeps the proportions and fills the box (the default), `meet` shows all of it; `anchor` holds the crop
     like object-position. An svg takes it as its preserveAspectRatio, a canvas as object-fit and object-position. */
  var AT = { start: ['xMin', '0%'], center: ['xMid', '50%'], end: ['xMax', '100%'], top: ['YMin', '0%'], floor: ['YMax', '100%'] };
  function fitArt(owner, box) {
    var fit = owner.getAttribute('data-fit') === 'meet' ? 'meet' : 'slice';
    var a = (owner.getAttribute('data-anchor') || 'center center').split(' ');
    var x = AT[a[0]] && a[0] !== 'top' && a[0] !== 'floor' ? AT[a[0]] : AT.center;
    var y = a[1] === 'top' || a[1] === 'floor' ? AT[a[1]] : ['YMid', '50%'];
    box.style.setProperty('--_art-fit', fit === 'meet' ? 'contain' : 'cover');
    box.style.setProperty('--_art-position', x[1] + ' ' + y[1]);
    var svg = box.querySelector(':scope > svg');
    if (svg && (owner.hasAttribute('data-fit') || owner.hasAttribute('data-anchor') || !svg.hasAttribute('preserveAspectRatio'))) svg.setAttribute('preserveAspectRatio', x[0] + y[0] + ' ' + fit);
  }

  function wire(frame) {
    var img = frame.querySelector('img');
    if (!img) { if (frame.querySelector(':scope > svg, :scope > canvas')) fitArt(frame.parentElement, frame); return; }
    if (frame.hasAttribute('data-phase')) return;
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
