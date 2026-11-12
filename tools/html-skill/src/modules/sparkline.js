/* Basalt HTML script, sparkline module: React's Sparkline. A `.sparkline` holds JSON in `script[data-sparkline]`: { "label": "Requests", "data": [12, 18, 9, 30],
   "loading": false, "empty": "No data yet" }. `data` is oldest first; an empty list with `loading` false is the quiet empty state (the `empty` sentence), and with
   `loading` true is a flat line that breathes. The drawing is chart.tsx's own sparkline: a 100 by 36 box, the line scaled so the peak (at least 1) sits 2 units
   from the top, the head's label and latest value, and the axis from 0 to the peak. The image is named "label, latest". It draws once at rest, as React does
   under reduced motion, since the skill has no value to ease; Basalt.sparkline(el, options) draws again with new options (it replaces the drawing).
   Source: tools/html-skill/src/modules/sparkline.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var esc = _.esc;
  var WIDTH = 100;
  var HEIGHT = 36;

  function pointY(value, ceiling) { return HEIGHT - 2 - (value / Math.max(ceiling, 1)) * (HEIGHT - 4); }
  // Grouped, with as many decimals as the value has (React's NumberTicker); the axis is whole numbers (React's formatCount).
  function grouped(value) {
    var decimals = (new Intl.NumberFormat('en-US', { maximumFractionDigits: 20, useGrouping: false }).format(value).split('.')[1] || '').length;
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }

  // React's ticker as it stands at rest: the number in text for a screen reader, and for the eye one box for each character (a digit's is 1em tall).
  function value(text) {
    return '<span class="sparkline-value"><span class="visually-hidden">' + esc(text) + '</span><span aria-hidden="true">' +
      Array.prototype.map.call(text, function (c) { return /\d/.test(c) ? '<span data-d>' + c + '</span>' : '<span>' + esc(c) + '</span>'; }).join('') + '</span></span>';
  }

  function draw(root, o) {
    o = o || {};
    var data = (o.data || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    var label = o.label == null ? '' : String(o.label);
    var loading = !!o.loading;
    var quiet = !loading && data.length === 0;
    var peak = Math.max.apply(null, [1].concat(data));
    var latest = data.length ? data[data.length - 1] : 0;
    var samples = data.length ? data : [0, 0];
    var points = samples.map(function (value, i) {
      var x = samples.length === 1 ? WIDTH / 2 : (i / (samples.length - 1)) * WIDTH;
      var y = loading ? pointY(0, peak) : pointY(value, peak);
      return x.toFixed(2) + ',' + y.toFixed(2);
    }).join(' ');
    root.toggleAttribute('data-loading', loading);
    root.toggleAttribute('data-empty', quiet);
    root.innerHTML =
      '<div class="sparkline-head"><span class="sparkline-label">' + esc(label) + '</span>' + (data.length ? value(grouped(latest)) : '') + '</div>' +
      (quiet ? '<p class="sparkline-empty">' + esc(o.empty == null ? 'No data yet' : o.empty) + '</p>'
        : '<svg viewBox="0 0 ' + WIDTH + ' ' + HEIGHT + '" role="img" aria-label="' + esc(label + ', ' + latest) + '"><polyline class="sparkline-line" points="' + points + '"/></svg>') +
      (data.length ? '<div class="sparkline-axis"><span>0</span><span>' + esc(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(peak)) + '</span></div>' : '');
  }

  function wireSparklines() {
    document.querySelectorAll('.sparkline > script[type="application/json"][data-sparkline]').forEach(function (script) {
      var root = script.parentElement;
      var options;
      try { options = JSON.parse(script.textContent); } catch (e) { console.warn('Basalt: a sparkline\'s data is not valid JSON (' + e.message + ')'); return; }
      script.remove();
      draw(root, options);
    });
  }

  B.sparkline = draw;
  _.step(60, 'wireSparklines', wireSparklines);
})(window.Basalt);
