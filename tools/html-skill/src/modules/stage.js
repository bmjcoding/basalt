/* Basalt HTML script, stage module: how drawn art sits in the stage (React's Stage `fit` and `anchor`, DECISIONS 146 F). `slice` is the default: an svg keeps its proportions and
   fills the box, cropped like object-fit: cover; data-fit="meet" on the stage shows all of it, and data-anchor (start, center or end, then top, center or floor: "end floor")
   holds the crop. An svg takes it as its preserveAspectRatio, a canvas as object-fit and object-position. A drawing that sets its own preserveAspectRatio keeps it unless the
   stage names data-fit or data-anchor.
   Source: tools/html-skill/src/modules/stage.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var AT = { start: ['xMin', '0%'], center: ['xMid', '50%'], end: ['xMax', '100%'], top: ['YMin', '0%'], floor: ['YMax', '100%'] };
  _.step(53, 'wireStage', function () {
    document.querySelectorAll('.stage').forEach(function (stage) {
      var box = stage.querySelector('.stage-art');
      if (!box) return;
      var asked = stage.hasAttribute('data-fit') || stage.hasAttribute('data-anchor');
      var fit = stage.getAttribute('data-fit') === 'meet' ? 'meet' : 'slice';
      var a = (stage.getAttribute('data-anchor') || 'center center').split(' ');
      var x = AT[a[0]] && a[0] !== 'top' && a[0] !== 'floor' ? AT[a[0]] : AT.center;
      var y = a[1] === 'top' || a[1] === 'floor' ? AT[a[1]] : ['YMid', '50%'];
      box.style.setProperty('--_art-fit', fit === 'meet' ? 'contain' : 'cover');
      box.style.setProperty('--_art-position', x[1] + ' ' + y[1]);
      var svg = box.querySelector(':scope > svg');
      if (svg && (asked || !svg.hasAttribute('preserveAspectRatio'))) svg.setAttribute('preserveAspectRatio', x[0] + y[0] + ' ' + fit);
    });
  });
})(window.Basalt);
