/* Basalt HTML script, chart module: React's TimeChart and ChartGroup. A series over time as lines or bars, with a plan, missing data, a legend that is also the
   readout, a day-by-day keyboard and a table. The chart is drawn in real pixels at its measured width (never a viewBox), so its 12px text is 12px at every width.
   Data comes from <script type="application/json" data-chart> inside <figure class="chart"> (or Basalt.chart(figure, options), whose format functions can be real
   functions). The drawing follows chart.tsx: the same scale, layout, lane, labels and sentences. Nothing runs when the module loads. */
(function (B) {
  'use strict';
  var _ = B._;
  var esc = _.esc;

  var DAY_MS = 86400000;
  var NOT_OBSERVED = 'Not observed';
  var SHAPES = ['disc', 'square', 'diamond'];
  var DASHES = ['solid', 'dash', 'dot'];
  var LABEL_GAP = 56;
  var LONG_LABEL = 80;
  var BAR_SHARE = 0.6;
  var MARKER_DAYS = 2;
  var NICE = [1, 2, 2.5, 5];
  var counter = 0;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function parseDay(iso) { var p = String(iso).split('-').map(Number); return Date.UTC(p[0] || 1970, (p[1] || 1) - 1, p[2] || 1); }
  function shapeOf(text) { return text.replace(/\d/g, '0'); }
  function unique(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }
  function nearly(a, b) { return Math.abs(a - b) < 1e-9; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /** Runs of equal keys from index `from` to `to`: [{ from, to, key }]. */
  function runs(from, to, keyOf) {
    var out = [];
    for (var i = from; i <= to; i++) {
      var key = keyOf(i);
      var last = out[out.length - 1];
      if (last && last.key === key) last.to = i; else out.push({ from: i, to: i, key: key });
    }
    return out;
  }

  /* ---------------------------------------------------------------- the scale */

  /** 3 to 6 gridlines on round steps. A bar chart starts at zero; a line chart's scale needn't. */
  function scaleOf(values, bar, fromZero, given) {
    var low = values.length ? Math.min.apply(null, values) : 0;
    var high = values.length ? Math.max.apply(null, values) : 1;
    var zero = bar || fromZero;
    var lo0 = zero ? Math.min(0, low) : low;
    var hi0 = zero ? Math.max(0, high) : high;
    var pad = bar ? 0 : Math.max((hi0 - lo0) * 0.04, 0);
    var hiPad = bar ? Math.max(hi0 * 1.04, hi0) : hi0 + pad;
    var loPad = lo0 - (zero ? 0 : pad);
    function fit(step) {
      var base = Math.floor(loPad / step + 1e-9) * step;
      return { lo: base, hi: Math.max(Math.ceil(hiPad / step - 1e-9) * step, base + step), step: step };
    }
    function intervals(s) { return Math.round((s.hi - s.lo) / s.step); }
    var scale;
    if (given && given > 0) {
      scale = fit(given);
      if (intervals(scale) <= 5) return scale.lo === scale.hi ? { lo: scale.lo, hi: scale.lo + 2 * given, step: given } : scale;
    }
    var span = Math.max(hiPad - loPad, hi0 > 0 ? hi0 : 1);
    var magnitude = Math.floor(Math.log10(Math.max(span, 1e-9)));
    for (var power = magnitude - 2; power <= magnitude + 2; power++) {
      for (var b = 0; b < NICE.length; b++) {
        var step = NICE[b] * Math.pow(10, power);
        scale = fit(step);
        if (intervals(scale) <= 5) return intervals(scale) < 2 ? { lo: scale.lo, hi: scale.lo + 2 * step, step: step } : scale;
      }
    }
    return fit(span);
  }

  function ticksOf(scale) {
    var out = [];
    for (var k = 0; k <= Math.round((scale.hi - scale.lo) / scale.step); k++) out.push(Math.round((scale.lo + k * scale.step) * 1e9) / 1e9);
    return out;
  }

  /* ------------------------------------------------------------------ formats */

  function hm(minutes) {
    var h = Math.floor(minutes / 60);
    var m = Math.round(minutes - h * 60);
    if (m === 60) { h += 1; m = 0; }
    return m ? h + ' h ' + m + ' m' : h + ' h';
  }
  function hmSay(minutes) {
    var h = Math.floor(minutes / 60);
    var m = Math.round(minutes - h * 60);
    if (m === 60) { h += 1; m = 0; }
    return h + ' ' + (h === 1 ? 'hour' : 'hours') + (m ? ' ' + m + ' ' + (m === 1 ? 'minute' : 'minutes') : '');
  }

  /** The writers a spec makes: write(v) and say(v) (the spoken form). A spec is { duration: "minutes" } or Intl.NumberFormat options with prefix, suffix and spoken. */
  function writers(spec, locale) {
    spec = spec || {};
    if (spec.duration) return { write: hm, say: hmSay };
    var options = {};
    for (var k in spec) if (k !== 'prefix' && k !== 'suffix' && k !== 'spoken' && k !== 'duration') options[k] = spec[k];
    var nf = new Intl.NumberFormat(locale, options);
    var prefix = spec.prefix || '';
    var suffix = spec.suffix || '';
    var spoken = spec.spoken != null ? spec.spoken : suffix;
    return { write: function (v) { return prefix + nf.format(v) + suffix; }, say: function (v) { return prefix + nf.format(v) + spoken; } };
  }

  /* ------------------------------------------------------------------- the words for a day */

  function daySentence(c, i) {
    var parts = [c.formats.long.format(c.stamps[i]) + (i === c.n - 1 && c.lastIsToday ? ', today' : '')];
    c.series.forEach(function (s) {
      var v = s.values[i];
      var why = s.reasons && s.reasons[i];
      parts.push(s.name + ' ' + (v == null ? 'not observed' + (why ? ', ' + why : '') : c.say(v) + (i === c.partial ? ' ' + c.partialSuffix : '')));
    });
    var plan = c.plan;
    var p = plan && plan.values[i];
    var note = plan && plan.kind === 'value' && plan.notes ? plan.notes[i] : undefined;
    var label = (plan && plan.label) || 'Plan';
    parts.push(p == null ? note || 'No ' + label.toLowerCase() : typeof p === 'number' ? label + ' ' + c.say(p) : label + ' ' + c.say(p[0]) + ' to ' + c.say(p[1]));
    var first = c.series[0];
    var v0 = first && first.values[i];
    if (first && p != null && v0 != null && i !== c.partial) {
      if (typeof p === 'number') parts.push(v0 < p ? c.say(p - v0) + ' under the plan' : v0 > p ? c.say(v0 - p) + ' over the plan' : 'On the plan');
      else parts.push(v0 < p[0] ? first.name + ' ' + c.say(p[0] - v0) + ' under the plan' : v0 > p[1] ? first.name + ' ' + c.say(v0 - p[1]) + ' over the plan' : first.name + ' inside the plan');
    }
    return parts.join('. ') + '.';
  }

  function planText(c, p) {
    if (p == null) return '';
    if (c.formatPlan) return c.formatPlan(p);
    return typeof p === 'number' ? c.format(p) : c.format(p[0]) + '–' + c.format(p[1]);
  }

  /* ---------------------------------------------------------------- markers and swatches */

  /** A marker of equal area to an 8px disc: a disc, a square or a diamond. A ring is the same shape grown by the cut; a hollow marker keeps its outer size. */
  function marker(shape, x, y, half, cls, grow, hollow, line) {
    grow = grow || 0;
    var inset = hollow ? line / 2 : 0;
    var extra = ' data-shape="' + shape + '"' + (hollow ? ' data-so-far=""' : '');
    if (shape === 'square') {
      var h = (half * Math.sqrt(Math.PI)) / 2 + grow - inset;
      return '<rect class="' + cls + '" x="' + (x - h) + '" y="' + (y - h) + '" width="' + 2 * h + '" height="' + 2 * h + '"' + extra + '/>';
    }
    if (shape === 'diamond') {
      var q = half * Math.sqrt(Math.PI / 2) + (grow - inset) * Math.SQRT2;
      return '<path class="' + cls + '" d="M' + x + ' ' + (y - q) + 'L' + (x + q) + ' ' + y + 'L' + x + ' ' + (y + q) + 'L' + (x - q) + ' ' + y + 'Z"' + extra + '/>';
    }
    return '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="' + (half + grow - inset) + '"' + extra + '/>';
  }

  /** A legend key drawn like its mark, 16px. Its lengths are the chart tokens, in CSS. */
  function swatch(kind, index, idBase, bar) {
    var dash = DASHES[index % 3];
    var shape = SHAPES[index % 3];
    var inner = '';
    if (kind === 'series') inner = '<line class="chart-line" data-dash="' + dash + '" x1="0" x2="16" y1="8" y2="8"/>' + marker(shape, 8, 8, 4, 'chart-ring', 2) + marker(shape, 8, 8, 4, 'chart-mark');
    else if (kind === 'bar') inner = '<rect class="chart-bar" x="4" y="2" width="8" height="14"/>';
    else if (kind === 'so-far') inner = '<rect class="chart-bar" data-so-far="" x="' + (bar ? 5 : 4) + '" y="' + (bar ? 7 : 4) + '" width="' + (bar ? 6 : 8) + '" height="8"/>';
    else if (kind === 'value') inner = '<line class="chart-plan" x1="0" x2="16" y1="8" y2="8"/>';
    else if (kind === 'band') inner = '<rect class="chart-band" x="0" y="3.5" width="16" height="9"/><line class="chart-band-edge" x1="0" x2="16" y1="3.5" y2="3.5"/><line class="chart-band-edge" x1="0" x2="16" y1="12.5" y2="12.5"/>';
    else if (kind === 'missing') inner = '<defs><pattern id="' + idBase + '-sw" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><line class="chart-hatch-line" x1="0.5" y1="0" x2="0.5" y2="4"/></pattern></defs><rect x="2" y="0" width="12" height="16" fill="url(#' + idBase + '-sw)"/>';
    return '<svg class="chart-swatch" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /* ------------------------------------------------------------------ one chart */

  var groups = typeof WeakMap === 'function' ? new WeakMap() : null;

  /** A stack of charts shares one gutter, so their plots line up. */
  function groupOf(el) {
    var host = el.closest && el.closest('.chart-group');
    if (!host || !groups) return null;
    var g = groups.get(host);
    if (!g) {
      g = { members: [], shared: { gutter: 0, right: 0 } };
      g.report = function (member, sizes) {
        member.sizes = sizes;
        var shared = { gutter: 0, right: 0 };
        g.members.forEach(function (m) { if (m.sizes) { shared.gutter = Math.max(shared.gutter, m.sizes.gutter); shared.right = Math.max(shared.right, m.sizes.right); } });
        if (shared.gutter === g.shared.gutter && shared.right === g.shared.right) return;
        g.shared = shared;
        g.members.forEach(function (m) { if (m !== member) m.draw(); });
      };
      groups.set(host, g);
    }
    return g;
  }

  function chart(figure, options) {
    if (!figure || !options) return null;
    // A new data set while the old chart is mid-entrance hands the marks over: each glides from where it is drawn (below), and destroy() counts the visit as seen.
    var carry = figure.__bhChart && figure.__bhChart.drawn ? figure.__bhChart.drawn() : null;
    if (figure.__bhChart) figure.__bhChart.destroy();
    var o = options;
    var bar = o.kind === 'bar';
    var series = (o.series || []).slice(0, bar ? 1 : 3);
    var days = o.days || [];
    var n = days.length;
    var plan = o.plan;
    var locale = o.locale || 'en-GB';
    var wr = writers(o.format, locale);
    var format = typeof o.format === 'function' ? o.format : wr.write;
    var say = typeof o.spoken === 'function' ? o.spoken : typeof o.format === 'function' ? format : wr.say;
    var plain = new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 });
    var divisor = o.tickDivisor || 1;
    var formatTick = typeof o.formatTick === 'function' ? o.formatTick : function (v) { return plain.format(v / divisor); };
    var partial = o.partial;
    var partialLabel = o.partialLabel || 'Today so far';
    var partialSuffix = o.partialSuffix || 'so far';
    var unit = o.unit;
    var id = 'bc' + (++counter);
    var titleId = id + '-title', captionId = id + '-summary', keysId = id + '-keys', tableId = id + '-table';
    var formats = {
      short: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      withDay: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }),
      long: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    };
    var stamps = days.map(parseDay);
    var nowMs = o.now == null ? Date.now() : new Date(o.now).getTime();
    var c = {
      n: n, series: series, plan: plan, partial: partial, partialSuffix: partialSuffix, say: say, format: format, stamps: stamps, formats: formats,
      formatPlan: o.formatPlan, lastIsToday: n > 0 && days[n - 1] === new Date(nowMs).toISOString().slice(0, 10)
    };
    var dayLabel = function (i) { return formats.short.format(stamps[i]); };
    var dateOf = function (i) { return formats.withDay.format(stamps[i]); };

    // The scale, from every value the chart may draw.
    var numbers = [];
    series.forEach(function (s) { s.values.forEach(function (v) { if (isNum(v)) numbers.push(v); }); });
    if (plan) plan.values.forEach(function (p) { if (p == null) return; if (typeof p === 'number') numbers.push(p); else numbers.push(p[0], p[1]); });
    var scale = scaleOf(numbers, bar, !!o.fromZero, o.step);
    var ticks = ticksOf(scale);
    function tickText(value, index) { return formatTick(value) + (unit && index === ticks.length - 1 ? ' ' + unit : ''); }

    var heading = 'h' + ([2, 3, 4, 5, 6].indexOf(o.heading) === -1 ? 3 : o.heading);
    var hasGap = series.some(function (s) { return s.values.some(function (v) { return v == null; }); });
    var hasPartial = partial !== undefined && partial !== null && partial >= 0 && partial < n;
    var planLabel = (plan && plan.label) || 'Plan';

    /* ---- The legend, which is the readout: each value reserves the widest of its forms ---- */
    function valueOf(s, i) {
      var v = s.values[i];
      return v == null ? (s.reasons && s.reasons[i] ? NOT_OBSERVED + ' · ' + s.reasons[i] : NOT_OBSERVED) : format(v) + (i === partial ? ' ' + partialSuffix : '');
    }
    function planValue(i) {
      var p = plan.values[i];
      var note = plan.kind === 'value' && plan.notes ? plan.notes[i] : undefined;
      return p == null ? note || 'None' : planText(c, p);
    }
    function reserves(forms) { return unique(forms).map(function (f) { return '<span class="chart-reserve" aria-hidden="true">' + esc(f) + '</span>'; }).join(''); }
    var legend = '';
    series.forEach(function (s, k) {
      var forms = [];
      for (var i = 0; i < n; i++) forms.push(shapeOf(valueOf(s, i)));
      if (s.values.some(function (v) { return v == null; })) forms.push(NOT_OBSERVED);
      legend += '<li class="chart-entry">' + swatch(bar ? 'bar' : 'series', k, id) + '<span class="chart-name">' + esc(s.name) + '</span><span class="chart-value" data-series="' + esc(s.id) + '">' + reserves(forms) + '<span data-part="value"></span></span></li>';
    });
    if (plan) {
      var pforms = [];
      for (var q = 0; q < n; q++) pforms.push(shapeOf(planValue(q)));
      legend += '<li class="chart-entry">' + swatch(plan.kind, 0, id) + '<span class="chart-name">' + esc(planLabel) + '</span><span class="chart-value" data-series="plan">' + reserves(pforms) + '<span data-part="value"></span></span></li>';
    }
    if (hasPartial) legend += '<li class="chart-entry">' + swatch('so-far', 0, id, bar) + '<span class="chart-name">' + esc(partialLabel) + '</span></li>';
    if (hasGap) legend += '<li class="chart-entry">' + swatch('missing', 0, id) + '<span class="chart-name">' + NOT_OBSERVED + '</span></li>';
    var dateForms = [];
    for (var d = 0; d < n; d++) dateForms.push(shapeOf('Latest · ' + dateOf(d)));

    var kbdChip = function (t) { return '<kbd class="kbd">' + t + '</kbd>'; };
    figure.textContent = '';
    figure.setAttribute('aria-labelledby', titleId);
    figure.setAttribute('data-kind', o.kind);
    figure.innerHTML =
      '<div class="chart-head"><' + heading + ' id="' + titleId + '" class="chart-title">' + esc(o.title || '') + '</' + heading + '>' + (o.source ? '<p class="chart-source">' + esc(o.source) + '</p>' : '') + '</div>' +
      '<div class="chart-key"><p class="chart-date">' + reserves(dateForms) + '<span data-part="date"></span></p><ul class="chart-legend" aria-label="Key">' + legend + '</ul></div>' +
      '<div class="chart-plot"><span class="chart-ruler" aria-hidden="true"></span><div class="chart-svg-host"></div>' +
      '<div role="group" aria-roledescription="chart" aria-labelledby="' + titleId + '" aria-describedby="' + captionId + ' ' + keysId + '" class="chart-days"></div>' +
      '<span id="' + keysId + '" class="visually-hidden">Arrow keys move a day, Page Up and Page Down a week, Home and End to the ends.</span></div>' +
      '<p class="chart-hint" data-kbd-hint="" aria-hidden="true"><span>' + kbdChip('←') + ' ' + kbdChip('→') + ' a day</span><span>' + kbdChip('PgUp') + ' ' + kbdChip('PgDn') + ' a week</span><span>' + kbdChip('Home') + ' ' + kbdChip('End') + ' the ends</span></p>' +
      '<div class="chart-foot"><button type="button" class="btn chart-toggle" data-variant="secondary" data-size="sm" aria-expanded="false" aria-controls="' + tableId + '"><span>View as table</span></button></div>' +
      '<div id="' + tableId + '" class="chart-table" hidden></div>' +
      '<figcaption id="' + captionId + '" class="chart-summary">' + esc(o.summary || '') + '</figcaption>';

    var plot = figure.querySelector('.chart-plot');
    var ruler = figure.querySelector('.chart-ruler');
    var host = figure.querySelector('.chart-svg-host');
    var daysEl = figure.querySelector('.chart-days');
    var dateEl = figure.querySelector('[data-part="date"]');
    var valueEls = figure.querySelectorAll('.chart-value');
    var toggle = figure.querySelector('.chart-toggle');
    var tableEl = figure.querySelector('.chart-table');

    var dayEls = [];
    for (var di = 0; di < n; di++) {
      var dayEl = document.createElement('div');
      dayEl.setAttribute('role', 'img');
      dayEl.className = 'chart-day';
      dayEl.setAttribute('data-i', di);
      dayEl.setAttribute('aria-label', daySentence(c, di));
      daysEl.appendChild(dayEl);
      dayEls.push(dayEl);
    }

    /* ---- Measure: the plot's width, the tokens, and text ---- */
    var metrics = null;
    function readMetrics() {
      var style = getComputedStyle(plot);
      var px = function (name, fallback) { var v = parseFloat(style.getPropertyValue(name)); return isFinite(v) ? v : fallback; };
      return {
        mark: px('--basalt-size-chart-mark', 8), cut: px('--basalt-size-cut', 2), line: px('--basalt-size-chart-line', 2), hair: px('--basalt-size-hairline', 1),
        pitch: px('--basalt-size-hatch-pitch', 4), barMax: px('--basalt-size-chart-bar-max', 24), barMin: px('--basalt-size-chart-bar-min', 2),
        plot: px('--basalt-size-chart-plot', 240), s1: px('--basalt-space-1', 4), s2: px('--basalt-space-2', 8), lineH: px('--basalt-text-xs-line-height', 16),
        container: px('--basalt-size-breakpoint-container', 480), dash: px('--basalt-size-chart-dash', 6), dashGap: px('--basalt-size-chart-dash-gap', 4)
      };
    }
    var widths = {};
    function measure(text, weight) {
      weight = weight || 400;
      var key = weight + '|' + text;
      if (widths[key] !== undefined) return widths[key];
      ruler.style.fontWeight = String(weight);
      ruler.textContent = text;
      return (widths[key] = ruler.getBoundingClientRect().width);
    }

    /* ---- Which day is picked ---- */
    var hover = null, pinned = null, focusDay = null, focusWithin = false;
    function stop() { return clamp(focusDay === null ? n - 1 : focusDay, 0, Math.max(n - 1, 0)); }
    function activeDay() {
      var picked = focusWithin ? stop() : pinned !== null ? pinned : hover;
      return picked !== null && picked >= 0 && picked < n ? picked : null;
    }

    /* ---- Layout ---- */
    var width = 0;
    var L = null;
    var group = groupOf(figure);
    var member = { sizes: null, draw: function () { draw(true); } };
    if (group) group.members.push(member);

    function layout() {
      var m = metrics;
      var w = Math.max(width, 240);
      var narrow = w < m.container;
      var direct = !bar && series.length > 1 && !narrow;
      var gutter = Math.ceil(Math.max.apply(null, ticks.map(function (t, k) { return measure(tickText(t, k)); }))) + m.s2;
      var names = series.map(function (s) { return s.name; }).concat(plan ? [planLabel] : []);
      var right = direct ? Math.ceil(Math.max.apply(null, names.map(function (name) { return measure(name); }))) + 2 * m.s2 : m.s2;
      if (group) group.report(member, { gutter: gutter, right: right });
      var laneRows = narrow ? 2 : 1;
      var top = laneRows * m.lineH + m.s1;
      var plotH = m.plot;
      var x0 = Math.max(gutter, group ? group.shared.gutter : 0);
      var x1 = w - Math.max(right, group ? group.shared.right : 0);
      var slot = (x1 - x0) / n;
      return {
        width: w, height: top + plotH + m.s2 + m.lineH, narrow: narrow, laneRows: laneRows, x0: x0, x1: x1, top: top, plotH: plotH, bottom: top + plotH, slot: slot, direct: direct,
        lo: scale.lo, hi: scale.hi, barWidth: Math.max(m.barMin, Math.min(m.barMax, Math.round(slot * BAR_SHARE))),
        y: function (v) { return top + (1 - (v - scale.lo) / (scale.hi - scale.lo)) * plotH; },
        cx: function (i) { return x0 + (i + 0.5) * slot; },
        sx: function (i) { return x0 + i * slot; }
      };
    }

    /* ---- The drawing, as a string ---- */
    var snap = (function () {
      var planA = [], planB = [];
      for (var i = 0; i < n; i++) {
        var p = plan ? plan.values[i] : null;
        if (p == null) { planA.push(null); planB.push(null); } else if (typeof p === 'number') { planA.push(p); planB.push(null); } else { planA.push(p[0]); planB.push(p[1]); }
      }
      return { series: series.map(function (s) { return s.values.map(function (v) { return isNum(v) ? v : null; }); }), planA: planA, planB: planB };
    })();

    function svgString(active) {
      var m = metrics;
      var crisp = function (v) { return Math.round(v - 0.5) + 0.5; };
      var hatchId = id + '-hatch';
      var out = '<defs><pattern id="' + hatchId + '" patternUnits="userSpaceOnUse" width="' + m.pitch + '" height="' + m.pitch + '" patternTransform="rotate(45)"><line class="chart-hatch-line" x1="' + m.hair / 2 + '" y1="0" x2="' + m.hair / 2 + '" y2="' + m.pitch + '"/></pattern></defs>';
      var main = snap.series[0] || [];
      var zeroTick;
      ticks.forEach(function (t) { if (zeroTick === undefined && nearly(t, 0)) zeroTick = t; });
      ticks.forEach(function (t) {
        var yy = crisp(L.y(t));
        if (yy < L.top - 1 || yy > L.bottom + 1 || t === zeroTick) return;
        out += '<line class="chart-grid" x1="' + L.x0 + '" x2="' + L.x1 + '" y1="' + yy + '" y2="' + yy + '"/>';
      });
      if (active !== null) out += '<rect class="chart-plate" x="' + L.sx(active) + '" y="' + L.top + '" width="' + L.slot + '" height="' + L.plotH + '"/>';
      if (plan && plan.kind === 'band') {
        runs(0, n - 1, function (i) { return snap.planA[i] == null ? '' : snap.planA[i] + '-' + snap.planB[i]; }).forEach(function (run) {
          if (!run.key) return;
          var xa = Math.round(L.sx(run.from)), xb = Math.round(L.sx(run.to + 1));
          var ya = crisp(L.y(snap.planB[run.from])), yb = crisp(L.y(snap.planA[run.from]));
          out += '<rect class="chart-band" x="' + xa + '" y="' + ya + '" width="' + (xb - xa) + '" height="' + (yb - ya) + '"/>' +
            '<line class="chart-band-edge" x1="' + xa + '" x2="' + xb + '" y1="' + ya + '" y2="' + ya + '"/><line class="chart-band-edge" x1="' + xa + '" x2="' + xb + '" y1="' + yb + '" y2="' + yb + '"/>';
        });
      }
      // missing: the hatch over the full plot height, over the whole slot (a bar's slot too); the reason is in the lane
      var gaps = [];
      for (var i = 0; i < n; i++) {
        var gone = series.filter(function (s) { return s.values[i] == null; });
        gaps.push(gone.length ? { key: gone.map(function (s) { return s.id; }).join('+') + ':' + (gone[0].reasons && gone[0].reasons[i] || ''), names: gone.map(function (s) { return s.name; }), all: gone.length === series.length, why: gone[0].reasons && gone[0].reasons[i] || undefined } : null);
      }
      var gapRuns = runs(0, n - 1, function (i) { return gaps[i] ? gaps[i].key : ''; }).filter(function (r) { return r.key; });
      gapRuns.forEach(function (run) {
        var xa = Math.round(L.sx(run.from)), xb = Math.round(L.sx(run.to + 1));
        out += '<rect class="chart-hatch" x="' + xa + '" y="' + L.top + '" width="' + (xb - xa) + '" height="' + L.plotH + '" fill="url(#' + hatchId + ')"/>';
      });
      if (zeroTick !== undefined) { var zy = crisp(L.y(zeroTick)); out += '<line class="chart-baseline" x1="' + L.x0 + '" x2="' + L.x1 + '" y1="' + zy + '" y2="' + zy + '"/>'; }
      if (bar) {
        var bw = L.barWidth;
        var base = Math.round(L.y(Math.max(L.lo, 0)));
        for (var b = 0; b < n; b++) {
          var v = main[b];
          if (v == null) continue;
          var bx = Math.round(L.cx(b) - bw / 2);
          var topY = Math.round(L.y(v));
          if (b === partial) {
            var inset = m.line / 2;
            out += '<rect class="chart-bar" data-so-far="" x="' + (bx + inset) + '" y="' + (topY + inset) + '" width="' + Math.max(bw - 2 * inset, 0) + '" height="' + Math.max(base - topY - 2 * inset, 0) + '"/>';
          } else if (base - topY > 0) out += '<rect class="chart-bar" x="' + bx + '" y="' + topY + '" width="' + bw + '" height="' + (base - topY) + '"/>';
        }
        // The cut is drawn only where the bar runs on past it, so a bar's end is never hidden.
        for (var u = 0; u < n; u++) {
          var pl = snap.planA[u], bv = main[u];
          if (pl == null || bv == null) continue;
          var P = Math.round(L.y(pl)), T = Math.round(L.y(bv)), half = m.line / 2, ux = Math.round(L.cx(u) - bw / 2);
          if (T <= P - half - m.cut - 2) out += '<rect class="chart-cut" x="' + ux + '" y="' + (P - half - m.cut) + '" width="' + bw + '" height="' + m.cut + '"/>';
          if (T <= P - half && base > P + half + m.cut) out += '<rect class="chart-cut" x="' + ux + '" y="' + (P + half) + '" width="' + bw + '" height="' + m.cut + '"/>';
        }
      }
      if (plan && plan.kind === 'value') {
        runs(0, n - 1, function (i) { return snap.planA[i] == null ? '' : String(snap.planA[i]); }).forEach(function (run) {
          if (!run.key) return;
          var yy = Math.round(L.y(snap.planA[run.from]));
          out += '<line class="chart-plan" x1="' + Math.round(L.sx(run.from)) + '" x2="' + Math.round(L.sx(run.to + 1)) + '" y1="' + yy + '" y2="' + yy + '"/>';
        });
      }
      if (!bar) {
        var everyDay = L.slot >= MARKER_DAYS * m.mark;
        for (var k = series.length - 1; k >= 0; k--) {
          var s = series[k];
          var values = snap.series[k] || [];
          var points = values.map(function (val, idx) { return val == null ? null : { i: idx, x: L.cx(idx), y: L.y(val) }; });
          var marked = points.filter(function (pt, index) {
            if (!pt) return false;
            var before = index > 0 ? points[index - 1] : undefined;
            var after = index < points.length - 1 ? points[index + 1] : undefined;
            var besideGap = (index > 0 && !before) || (index < points.length - 1 && !after);
            var isolated = !before && !after;
            return everyDay || pt.i === active || pt.i === n - 1 || pt.i === partial || besideGap || isolated;
          });
          var shape = SHAPES[k] || 'disc';
          var path = '', open = false;
          points.forEach(function (pt) { if (!pt) { open = false; return; } path += (open ? 'L' : 'M') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1); open = true; });
          out += '<g data-series="' + esc(s.id) + '" class="chart-series">' +
            marked.map(function (pt) { return marker(shape, pt.x, pt.y, m.mark / 2, 'chart-ring', m.cut); }).join('') +
            (path ? '<path class="chart-line" data-dash="' + (DASHES[k] || 'solid') + '" d="' + path + '"/>' : '') +
            marked.map(function (pt) { return marker(shape, pt.x, pt.y, m.mark / 2, 'chart-mark', 0, pt.i === partial, m.line); }).join('') + '</g>';
        }
      }
      // the lane above the plot: each gap's reason, in words, from where it starts. Text never sits on the hatch.
      var laneEnds = [];
      for (var le = 0; le < L.laneRows; le++) laneEnds.push(-Infinity);
      gapRuns.forEach(function (run, gi) {
        var g = gaps[run.from];
        var row = gi % L.laneRows;
        var next = gapRuns[gi + L.laneRows];
        var previous = gapRuns[gi - 1];
        var start = Math.round(L.sx(run.from)), end = Math.round(L.sx(run.to + 1));
        var limit = next ? Math.round(L.sx(next.from)) - m.s2 * 2 : L.width;
        var floor = previous ? Math.round(L.sx(previous.to + 1)) + m.s2 : -Infinity;
        var who = g.all ? NOT_OBSERVED : g.names.join(' and ') + ' not observed';
        var tries = [g.why ? who + ' · ' + g.why : who, who, NOT_OBSERVED];
        for (var t = 0; t < tries.length; t++) {
          var text = tries[t];
          var w = measure(text);
          var x = Math.max(start, laneEnds[row] + m.s2 * 2);
          if (x + w > limit) { if (t < tries.length - 1) continue; x = limit - w; } // only the last words may step back to fit
          if (x < floor || x < laneEnds[row] + m.s2 * 2 || x > end) continue;
          out += '<text class="chart-lane" x="' + x + '" y="' + (row * m.lineH + m.lineH / 2) + '">' + esc(text) + '</text>';
          laneEnds[row] = x + w;
          break;
        }
      });
      // y labels, end-aligned in the gutter; the unit once, on the top tick
      ticks.forEach(function (t, tk) {
        var yy = L.y(t);
        if (yy < L.top - 1 || yy > L.bottom + 1) return;
        out += '<text class="chart-axis" x="' + (L.x0 - m.s2) + '" y="' + yy + '" text-anchor="end">' + esc(tickText(t, tk)) + '</text>';
      });
      // x labels at least 56px apart: every day; every k days back from the latest (two weeks or less); else Mondays
      var step = Math.ceil(LABEL_GAP / L.slot);
      var labels = [];
      if (step <= 1) { for (var li = 0; li < n; li++) labels.push(li); } else if (n <= 14) { for (var lj = n - 1; lj >= 0; lj -= step) labels.push(lj); } else {
        var every = Math.ceil(step / 7), monday = 0;
        for (var lk = n - 1; lk >= 0; lk--) if (new Date(stamps[lk]).getUTCDay() === 1) { if (monday % every === 0) labels.push(lk); monday++; }
      }
      var long = L.slot * Math.max(step, 1) >= LONG_LABEL && step <= 1;
      var labelOf = function (i) { return (long ? formats.withDay : formats.short).format(stamps[i]); };
      var axisY = L.bottom + m.s2 + m.lineH / 2;
      var anchorFor = function (x, text) { var w = measure(text); return x + w / 2 > L.width ? 'end' : x - w / 2 < 0 ? 'start' : 'middle'; };
      var activeText = active === null ? null : labelOf(active);
      var activeBox = active === null ? null : [L.cx(active) - measure(activeText) / 2 - m.s2, L.cx(active) + measure(activeText) / 2 + m.s2];
      labels.forEach(function (i) {
        if (i === active) return;
        var text = labelOf(i);
        var w = measure(text);
        var x = L.cx(i);
        if (activeBox && x + w / 2 > activeBox[0] && x - w / 2 < activeBox[1]) return;
        var anchor = anchorFor(x, text);
        out += '<text class="chart-axis" x="' + (anchor === 'end' ? L.width : anchor === 'start' ? 0 : x) + '" y="' + axisY + '" text-anchor="' + anchor + '">' + esc(text) + '</text>';
      });
      if (active !== null) {
        var aa = anchorFor(L.cx(active), activeText);
        out += '<text class="chart-axis" data-active="" x="' + (aa === 'end' ? L.width : aa === 'start' ? 0 : L.cx(active)) + '" y="' + axisY + '" text-anchor="' + aa + '">' + esc(activeText) + '</text>';
      }
      // direct labels at each line's last observed point, nudged apart by a line of text
      if (L.direct) {
        var ends = [];
        series.forEach(function (s, si) {
          var vals = snap.series[si] || [];
          for (var i2 = n - 1; i2 >= 0; i2--) { if (vals[i2] != null) { ends.push({ name: s.name, y: L.y(vals[i2]) }); break; } }
        });
        var lastA = snap.planA[n - 1], lastB = snap.planB[n - 1];
        if (plan && lastA != null) ends.push({ name: planLabel, y: L.y(lastB == null ? lastA : (lastA + lastB) / 2) });
        ends.sort(function (a, b2) { return a.y - b2.y; });
        for (var e = 1; e < ends.length; e++) if (ends[e].y - ends[e - 1].y < m.lineH) ends[e].y = ends[e - 1].y + m.lineH;
        ends.forEach(function (end) { out += '<text class="chart-direct" x="' + (L.x1 + m.s2) + '" y="' + end.y + '">' + esc(end.name) + '</text>'; });
      }
      return '<svg class="chart-svg" width="' + L.width + '" height="' + L.height + '" viewBox="0 0 ' + L.width + ' ' + L.height + '" aria-hidden="true" focusable="false">' + out + '</svg>';
    }

    /* ---- Draw: the frame, the plate, the days and the readout ---- */
    function readout(shown, active) {
      dateEl.textContent = (active === null ? 'Latest · ' : '') + dateOf(shown);
      var vi = 0;
      series.forEach(function (s) {
        var el = valueEls[vi++].querySelector('[data-part="value"]');
        el.textContent = valueOf(s, shown);
        if (s.values[shown] == null) el.setAttribute('data-missing', ''); else el.removeAttribute('data-missing');
      });
      if (plan) {
        var pel = valueEls[vi].querySelector('[data-part="value"]');
        var p = plan.values[shown];
        var note = plan.kind === 'value' && plan.notes ? plan.notes[shown] : undefined;
        pel.textContent = planValue(shown);
        if (p == null && !note) pel.setAttribute('data-missing', ''); else pel.removeAttribute('data-missing');
      }
    }

    var lastActive;
    /* ---- The entrance (React's `entrance`; DECISIONS 136 A) ----
       `"entrance": true` makes this chart its page's one: on a first visit, at load, its marks draw once, each over duration-figure on ease-out,
       duration-stagger apart, every start within duration-slow of the first (a bar scales from its baseline, a solid line draws along its length, any other
       mark fades in). The frame, the words and the controls are drawn at rest in the same frame. A page seen before (localStorage, `basalt-entrance:<path>`, written
       when the entrance finishes or gives way), reduced motion, the hold, a hidden tab, a page opened below its first screen, a script that starts after a
       second (from the page's start, or from the change `Basalt.pageChange()` reported) and print draw it at rest; the hold or printing arriving mid-entrance settles it
       at once. The svg is redrawn on a hover or a key, so each redraw starts the marks again at the elapsed time. A new data set is a new call: when the old chart is
       mid-entrance, every mark of the new one glides from where the old was drawn, over duration-slow (React's yield), and the visit counts as seen. Outside an entrance the
       skill draws a new data set at once, as it always has. */
    var MARKS = '.chart-bar, .chart-plan, .chart-band, .chart-band-edge, .chart-line, .chart-ring, .chart-mark';
    var entrance = null;
    var entranceChecked = !o.entrance || !!carry;
    var entranceDone = false;
    var seenKey = 'basalt-entrance:' + location.pathname;
    function seen() { try { localStorage.setItem(seenKey, 'seen'); } catch (e) { /* storage blocked: the next visit plays it again */ } }
    function cssMs(name, fallback) {
      var v = /^\s*([\d.]+)(ms|s)\s*$/.exec(getComputedStyle(document.documentElement).getPropertyValue(name));
      return v ? Number(v[1]) * (v[2] === 's' ? 1000 : 1) : fallback;
    }
    function entranceAllowed() {
      var box = plot.getBoundingClientRect();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('print').matches || document.documentElement.getAttribute('data-loops') === 'held') return false;
      if (document.visibilityState === 'hidden' || performance.now() - (B.pageChangedAt || 0) > 1000) return false;
      try { if (localStorage.getItem(seenKey) === 'seen') return false; } catch (e) { /* none */ }
      return box.bottom > 0 && box.top < innerHeight;
    }
    function endEntrance() {
      if (!entrance) return;
      clearTimeout(entrance.timer);
      entrance = null;
      seen();
      draw(true);
    }
    function playEntrance() {
      var marks = host.querySelectorAll(MARKS);
      var from = entrance.from;
      var slowMs = cssMs('--basalt-duration-slow', 200);
      var figureMs = from ? slowMs : cssMs('--basalt-duration-figure', 600);
      var step = !from && marks.length > 1 ? Math.min(cssMs('--basalt-duration-stagger', 22), slowMs / (marks.length - 1)) : 0;
      var ease = getComputedStyle(document.documentElement).getPropertyValue('--basalt-ease-out').trim() || 'cubic-bezier(0.16, 1, 0.3, 1)';
      var elapsed = performance.now() - entrance.t0;
      Array.prototype.forEach.call(marks, function (el, i) {
        var frames, st = el.style, was = from && from[i];
        if (el.classList.contains('chart-bar')) {
          st.transformBox = 'fill-box'; st.transformOrigin = '50% 100%';
          // From where the old bar was drawn: its height times its scale, as a scale of this bar's own height (0 for a mark the old chart did not have).
          var r = was && was.k === 'bar' && el.getBBox().height > 0 ? Math.min(was.h * was.s / el.getBBox().height, 4) : 0;
          frames = [{ transform: 'scaleY(' + (from ? r : 0) + ')' }, { transform: 'scaleY(1)' }];
        } else {
          // A line and its markers glide from where they are drawn: the line along its old path (the dash progress, if it was being drawn, goes on), every other mark from
          // its old centre. Paths interpolate only when they have the same commands; otherwise the line takes its new shape at the first frame.
          var line = el.classList.contains('chart-line'), solid = line && el.getAttribute('data-dash') === 'solid' && el.getTotalLength && el.getTotalLength() > 0, f0, f1;
          if (solid) {
            var len = el.getTotalLength(), full = len + 2 * (parseFloat(getComputedStyle(el).strokeWidth) || 2);
            st.strokeDasharray = len + ' ' + len * 2;
            f0 = { strokeDashoffset: String(was && was.k === 'line' ? was.p * full : full) }; f1 = { strokeDashoffset: '0' };
          } else { f0 = { opacity: was && was.o !== undefined ? was.o : 0 }; f1 = { opacity: 1 }; }
          if (was && line && was.d && el.getAttribute('d') && was.d.replace(/[-\d.]+/g, '') === el.getAttribute('d').replace(/[-\d.]+/g, '')) {
            f0.d = 'path("' + was.d + '")'; f1.d = 'path("' + el.getAttribute('d') + '")';
          } else if (was && !line && was.cx !== undefined) {
            var now = el.getBBox();
            f0.transform = 'translate(' + (was.cx - (now.x + now.width / 2)) + 'px, ' + (was.cy - (now.y + now.height / 2)) + 'px)'; f1.transform = 'none';
          }
          frames = [f0, f1];
        }
        el.animate(frames, { duration: figureMs, delay: i * step, easing: ease, fill: 'backwards' }).currentTime = elapsed;
      });
      if (!entrance.timer) entrance.timer = setTimeout(endEntrance, Math.max(0, (marks.length - 1) * step + figureMs - elapsed) + 20);
    }
    /* Where every mark is drawn now, for the next chart to glide from; null when this one is not mid-entrance. */
    function drawnNow() {
      if (!entrance) return null;
      return Array.prototype.map.call(host.querySelectorAll(MARKS), function (el) {
        var cs = getComputedStyle(el);
        if (el.classList.contains('chart-bar')) return { k: 'bar', s: !cs.transform || cs.transform === 'none' ? 1 : new DOMMatrixReadOnly(cs.transform).d, h: el.getBBox().height };
        var box = el.getBBox(), at = { cx: box.x + box.width / 2, cy: box.y + box.height / 2, o: parseFloat(cs.opacity) };
        if (el.classList.contains('chart-line')) at.d = el.getAttribute('d');
        if (el.classList.contains('chart-line') && el.style.strokeDasharray) { at.k = 'line'; at.p = parseFloat(cs.strokeDashoffset) / (parseFloat(el.style.strokeDasharray) + 2 * (parseFloat(cs.strokeWidth) || 2)); } else at.k = 'fade';
        return at;
      });
    }
    function onHold(e) { if (e.detail && e.detail.held) endEntrance(); }
    document.addEventListener('basalt:loops', onHold);
    // Printing that begins mid-entrance settles it too: print never shows a partly drawn figure.
    var printQuery = matchMedia('print');
    function onPrint() { if (printQuery.matches) endEntrance(); }
    if (printQuery.addEventListener) printQuery.addEventListener('change', onPrint);
    // The browser's own print path fires `beforeprint` and no media change: settle on it as well.
    function onBeforePrint() { endEntrance(); }
    window.addEventListener('beforeprint', onBeforePrint);

    function draw(force) {
      if (!metrics || !n) return;
      var active = activeDay();
      L = layout();
      plot.style.height = L.height + 'px';
      host.innerHTML = svgString(active);
      if (entrance) playEntrance();
      figure.toggleAttribute('data-narrow', L.narrow);
      var tabStop = stop();
      dayEls.forEach(function (el, i) {
        el.style.left = L.x0 + i * L.slot + 'px'; el.style.top = L.top + 'px'; el.style.width = L.slot + 'px'; el.style.height = L.plotH + 'px';
        el.tabIndex = i === tabStop ? 0 : -1;
        el.toggleAttribute('data-active', active === i);
      });
      if (force || active !== lastActive) readout(active === null ? n - 1 : active, active);
      lastActive = active;
    }
    function pick() { if (activeDay() !== lastActive) draw(); }

    function measureNow() {
      width = plot.clientWidth;
      if (!metrics) metrics = readMetrics();
      if (!entranceChecked) { entranceChecked = true; if (entranceAllowed()) entrance = { t0: performance.now(), timer: 0, from: null }; }
      else if (carry && !entrance && !entranceDone) { entranceDone = true; entrance = { t0: performance.now(), timer: 0, from: carry }; }
      draw(true);
    }

    /* ---- Pointer and keys ---- */
    function pointerDay(event) {
      if (!L) return null;
      var x = event.clientX - plot.getBoundingClientRect().left;
      if (x < L.x0 || x > L.x1) return null;
      return clamp(Math.floor((x - L.x0) / L.slot), 0, n - 1);
    }
    plot.addEventListener('pointermove', function (e) {
      // A finger only moves while it is down: it scrubs, and the day it reaches is held until a tap outside.
      if (e.pointerType === 'touch') { if (e.buttons !== 0) { pinned = pointerDay(e); pick(); } return; }
      hover = pointerDay(e); pick();
    });
    plot.addEventListener('pointerdown', function (e) {
      var day = pointerDay(e);
      if (e.pointerType === 'touch') pinned = day; else hover = day;
      pick();
    });
    plot.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') { hover = null; pick(); } });
    // The path is read at dispatch: the plot's own handler has redrawn the svg by now, so its target is no longer in the document.
    var outside = function (e) { if (pinned !== null && e.composedPath().indexOf(plot) === -1) { pinned = null; pick(); } };
    document.addEventListener('pointerdown', outside);

    daysEl.addEventListener('keydown', function (e) {
      var index = Number(e.target.getAttribute('data-i'));
      if (!isFinite(index) || e.target.getAttribute('data-i') === null) return;
      var to = index;
      if (e.key === 'ArrowRight') to = index + 1;
      else if (e.key === 'ArrowLeft') to = index - 1;
      else if (e.key === 'PageDown') to = index + 7;
      else if (e.key === 'PageUp') to = index - 7;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = n - 1;
      else return;
      e.preventDefault();
      to = clamp(to, 0, n - 1);
      focusDay = to;
      dayEls[to].focus({ preventScroll: true });
      pick();
      draw(true);
    });
    daysEl.addEventListener('focusin', function (e) {
      var raw = e.target.getAttribute && e.target.getAttribute('data-i');
      if (raw === null || raw === undefined) return;
      focusDay = Number(raw); focusWithin = true; draw(true);
    });
    daysEl.addEventListener('focusout', function (e) {
      if (!daysEl.contains(e.relatedTarget)) { focusWithin = false; draw(true); }
    });

    /* ---- The table ---- */
    var tableObserver = null;
    function tableHtml() {
      var cols = ['<col style="width:8rem">'].concat(series.map(function () { return '<col style="width:7.5rem">'; }), plan ? ['<col style="width:8.5rem">'] : [], ['<col>']);
      var rows = '';
      for (var i = n - 1; i >= 0; i--) {
        var notes = [];
        var cells = series.map(function (s) {
          var v = s.values[i];
          if (v == null) {
            var reason = s.reasons && s.reasons[i];
            if (reason) notes.push((series.length > 1 ? s.name + ' ' : '') + reason);
            return '<td data-numeric=""><span class="chart-not-observed">' + NOT_OBSERVED + '</span></td>';
          }
          return '<td data-numeric="">' + esc(format(v) + (i === partial ? ' ' + partialSuffix : '')) + '</td>';
        }).join('');
        var p = plan && plan.values[i];
        var note = plan && plan.kind === 'value' && plan.notes ? plan.notes[i] : undefined;
        if (plan && p == null && note) notes.push(note);
        var text = unique(notes).join('; ');
        rows += '<tr><th scope="row">' + esc(formats.withDay.format(stamps[i])) + '</th>' + cells + (plan ? '<td data-numeric="">' + (p == null ? '' : esc(planText(c, p))) + '</td>' : '') +
          '<td class="chart-note">' + esc(text ? text.charAt(0).toUpperCase() + text.slice(1) : '') + '</td></tr>';
      }
      var minWidth = 'calc(' + (cols.length - 1) + ' * 8rem + 12rem)';
      return '<div class="panel table-wrap" role="region" aria-label="' + esc((o.title || '') + ' table') + '" tabindex="0"><table style="min-width:' + minWidth + '"><colgroup>' + cols.join('') + '</colgroup>' +
        '<caption class="visually-hidden">' + esc((o.title || '') + ', newest first') + '</caption><thead><tr><th scope="col">Date</th>' +
        series.map(function (s) { return '<th scope="col" data-numeric="">' + esc(s.name) + '</th>'; }).join('') + (plan ? '<th scope="col" data-numeric="">' + esc(planLabel) + '</th>' : '') +
        '<th scope="col">Note</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.firstElementChild.textContent = open ? 'Hide the table' : 'View as table';
      if (tableObserver) { tableObserver.disconnect(); tableObserver = null; }
      if (!open) { tableEl.hidden = true; tableEl.textContent = ''; return; }
      tableEl.innerHTML = tableHtml();
      tableEl.hidden = false;
      var frame = tableEl.firstElementChild;
      var hint = null;
      var update = function () {
        frame.toggleAttribute('data-scrolled', Math.abs(frame.scrollLeft) > 0);
        var overflows = frame.scrollWidth > frame.clientWidth + 1;
        if (overflows && !hint) { hint = document.createElement('p'); hint.className = 'chart-scroll-hint'; hint.textContent = 'Scroll sideways for every column.'; tableEl.appendChild(hint); } else if (!overflows && hint) { hint.remove(); hint = null; }
      };
      frame.addEventListener('scroll', update, { passive: true });
      update();
      if (typeof ResizeObserver === 'function') { tableObserver = new ResizeObserver(update); tableObserver.observe(frame); }
    });

    /* ---- Go ---- */
    var observer = null;
    var live = true;
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(function () { if (Math.abs(plot.clientWidth - width) >= 0.5 || !L) measureNow(); });
      observer.observe(plot);
    }
    measureNow();
    // Text is measured with the real face; once it loads, measure again.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (live) { widths = {}; draw(true); } });

    var api = {
      drawn: drawnNow,
      destroy: function () {
        live = false;
        if (entrance) { clearTimeout(entrance.timer); entrance = null; seen(); }
        document.removeEventListener('basalt:loops', onHold);
        if (printQuery.removeEventListener) printQuery.removeEventListener('change', onPrint);
        window.removeEventListener('beforeprint', onBeforePrint);
        if (observer) observer.disconnect();
        if (tableObserver) tableObserver.disconnect();
        document.removeEventListener('pointerdown', outside);
        if (group) group.members.splice(group.members.indexOf(member), 1);
        figure.__bhChart = null;
      }
    };
    figure.__bhChart = api;
    return api;
  }

  function wireCharts() {
    document.querySelectorAll('script[type="application/json"][data-chart]').forEach(function (script) {
      var figure = script.parentElement;
      if (!figure || figure.__bhChart || script.__bh) return;
      script.__bh = true;
      var data;
      try { data = JSON.parse(script.textContent); } catch (e) { console.warn('Basalt: a chart\'s data is not valid JSON (' + e.message + ')'); return; }
      script.remove();
      chart(figure, data);
    });
  }

  // A router's page change without a reload counts as a load: the entrance's late gate then measures from the change (`at`, as performance.now() gave it, or now).
  B.pageChange = function (at) { B.pageChangedAt = at === undefined ? performance.now() : at; };
  B.chart = chart;
  _.step(60, 'wireCharts', wireCharts);
})(window.Basalt);
