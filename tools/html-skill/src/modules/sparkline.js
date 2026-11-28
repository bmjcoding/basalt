/* Basalt HTML script, sparkline module: React's Sparkline. A `.sparkline` holds JSON in `script[data-sparkline]`: { "label": "Requests", "data": [12, 18, 9, 30],
   "loading": false, "empty": "No data yet", "times": ["2026-11-25T14:00", …], "marks": [{ "time": "2026-11-25T14:14", "label": "Calibration" }] }. `data` is
   oldest first; an empty list with `loading` false is the quiet empty state (the `empty` sentence), and with `loading` true a flat line that breathes. As React's
   (cimip-gaps-3 T2, items 5 and 12): the scale is a gutter at the plot's start (the peak at its top edge, the floor at its bottom), from the data's own range (0
   to the peak; a series under 0 from its lowest; never a floor of 1), written whole from 100 and to two significant figures under it. The plot is drawn in real
   pixels at its width, 64 tall. With `times` a sample's x is its moment and a lane under the plot writes the first and last moments (and the midpoint when the
   three stay 56px apart): clocks under 48 hours, days past it. Up to two `marks`: a diamond, then a square, on the line, and a key under the lane. The image is
   named from the data. It draws once at rest; Basalt.sparkline(el, options) draws again with new options.
   Source: tools/html-skill/src/modules/sparkline.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var esc = _.esc;
  var HEIGHT = 64;
  var PAD = 2;

  // Grouped, with as many decimals as the value has (React's NumberTicker).
  function grouped(value) {
    var decimals = (new Intl.NumberFormat('en-US', { maximumFractionDigits: 20, useGrouping: false }).format(value).split('.')[1] || '').length;
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }
  // The scale's decimal places from the data's peak: none from 100, else as many as two significant figures need (React's scaleDecimals).
  function decimalsOf(peak) {
    var size = Math.abs(peak);
    if (!(size > 0) || size >= 100) return 0;
    return (new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2, useGrouping: false }).format(size).split('.')[1] || '').length;
  }

  // React's ticker at rest: the number in text, once, for a reader and a copy; for the eye one box a character, its glyph generated content (never text).
  function value(text) {
    return '<span class="sparkline-value"><span class="sparkline-text">' + esc(text) + '</span><span aria-hidden="true">' +
      Array.prototype.map.call(text, function (c) { return '<span' + (/\d/.test(c) ? ' data-d' : '') + ' data-ch="' + esc(c) + '"></span>'; }).join('') + '</span></span>';
  }

  function draw(root, o) {
    o = o || {};
    root.__bhSpark = o;
    var data = (o.data || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    var label = o.label == null ? '' : String(o.label);
    var loading = !!o.loading;
    var quiet = !loading && data.length === 0;
    var low = 0, high = 0;
    data.forEach(function (v) { if (v < low) low = v; if (v > high) high = v; });
    var flat = low === 0 && high === 0;
    var top = flat ? 1 : high;
    var latest = data.length ? data[data.length - 1] : 0;
    var samples = data.length ? data : [0, 0];
    var times = Array.isArray(o.times) && o.times.length === data.length && data.length ? o.times.map(function (t) { return new Date(t).getTime(); }) : null;
    if (o.times && !times) console.warn('Basalt: a sparkline\'s times do not match its samples; no time axis is drawn.');
    var first = times ? times[0] : 0, last = times ? times[times.length - 1] : 0, span = last - first;
    var clock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
    var day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    function when(t) { return (span < 48 * 3600000 ? clock : day).format(t).replace(/\s(?=[AP]M)/, ' '); }
    var marks = times && Array.isArray(o.marks) ? o.marks.slice(0, 2).map(function (m) { return { time: new Date(m.time).getTime(), label: String(m.label) }; }).filter(function (m) { return m.time >= first && m.time <= last; }) : [];
    var d = decimalsOf(flat ? 0 : Math.max(Math.abs(high), Math.abs(low)));
    var scale = new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    var said = label + ', ' + latest + (times ? ', ' + when(first) + ' to ' + when(last) + ', peak ' + high : '') + marks.map(function (m) { return ', ' + m.label + ' at ' + when(m.time); }).join('');
    root.toggleAttribute('data-loading', loading);
    root.toggleAttribute('data-empty', quiet);
    root.innerHTML =
      '<div class="sparkline-head"><span class="sparkline-label">' + esc(label) + '</span>' + (data.length ? value(grouped(latest)) : '') + '</div>' +
      (quiet ? '<p class="sparkline-empty">' + esc(o.empty == null ? 'No data yet' : o.empty) + '</p>'
        : '<div class="sparkline-body">' +
          (data.length ? '<span class="sparkline-scale" aria-hidden="true"><span>' + (flat ? '' : esc(scale.format(high))) + '</span><span>' + esc(scale.format(low)) + '</span></span>' : '<span></span>') +
          '<div class="sparkline-plot"><svg role="img" aria-label="' + esc(said) + '"></svg></div>' +
          (times ? '<span class="sparkline-times" aria-hidden="true"><span>' + esc(when(first)) + '</span><span class="sparkline-times-middle">' + esc(when(first + span / 2)) + '</span><span>' + esc(when(last)) + '</span></span>' : '') +
          (marks.length ? '<span class="sparkline-key" aria-hidden="true">' + marks.map(function (m, i) {
            return '<span class="sparkline-key-item"><svg viewBox="0 0 8 8" width="8" height="8" focusable="false">' + (i === 0 ? '<polygon class="sparkline-mark" points="4,0 8,4 4,8 0,4"/>' : '<rect class="sparkline-mark" width="8" height="8"/>') + '</svg><span>' + esc(when(m.time) + ' ' + m.label) + '</span></span>';
          }).join('') + '</span>' : '') +
          '</div>');
    var plot = root.querySelector('.sparkline-plot');
    if (!plot) return;
    function paint() {
      var W = plot.getBoundingClientRect().width || 100;
      var range = top - low || 1;
      function y(v) { return loading ? HEIGHT - PAD - ((0 - low) / range) * (HEIGHT - PAD * 2) : HEIGHT - PAD - ((v - low) / range) * (HEIGHT - PAD * 2); }
      function x(i) { return times && span > 0 ? ((times[i] - first) / span) * W : samples.length === 1 ? W / 2 : (i / (samples.length - 1)) * W; }
      var ys = samples.map(function (v) { return y(v); });
      var svg = plot.firstChild;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + HEIGHT);
      var html = '<polyline class="sparkline-line" points="' + samples.map(function (v, i) { return x(i).toFixed(2) + ',' + ys[i].toFixed(2); }).join(' ') + '"/>';
      marks.forEach(function (m, k) {
        var px = span > 0 ? ((m.time - first) / span) * W : W / 2;
        var py = ys[ys.length - 1];
        for (var i = 0; i < times.length - 1; i++) if (m.time >= times[i] && m.time <= times[i + 1]) { var f = times[i + 1] === times[i] ? 0 : (m.time - times[i]) / (times[i + 1] - times[i]); py = ys[i] + (ys[i + 1] - ys[i]) * f; break; }
        html += k === 0 ? '<polygon class="sparkline-mark" points="' + px + ',' + (py - 4) + ' ' + (px + 4) + ',' + py + ' ' + px + ',' + (py + 4) + ' ' + (px - 4) + ',' + py + '"/>'
          : '<rect class="sparkline-mark" x="' + (px - 4) + '" y="' + (py - 4) + '" width="8" height="8"/>';
      });
      svg.innerHTML = html;
      var lane = root.querySelector('.sparkline-times');
      if (lane) {
        var r = Array.prototype.map.call(lane.children, function (el) { return el.getBoundingClientRect(); });
        lane.toggleAttribute('data-crowded', r[1].left - r[0].right < 56 || r[2].left - r[1].right < 56);
      }
    }
    paint();
    if (!root.__bhSparkObserved && typeof ResizeObserver !== 'undefined') {
      root.__bhSparkObserved = true;
      var w = 0;
      new ResizeObserver(function () { var now = root.getBoundingClientRect().width; if (Math.abs(now - w) < 0.5) return; w = now; if (root.__bhSpark) draw(root, root.__bhSpark); }).observe(root);
    }
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
