/* Basalt glyph engine, iconography round 3 (Opus). Plain script: the page inlines it and the build runs the same code
   in Node, so the filmstrips are frames of the live morph.

   A drawing is eight cubic slots [x0, y0, x1, y1, x2, y2, x3, y3, on] on the 24 grid, plus an angle and a fill amount f.
   - Rest <-> selected of one glyph interpolates every number; the fill rises with f, the holes open with it.
   - Two glyphs of one rotation group spin.
   - A drawn pair (menu <-> close, play <-> pause, copy -> check, chevron -> download) interpolates slot to slot through the
     pair's own slot map; a straight stroke travels to the nearer end of its partner; a stroke that leaves shrinks into
     its own middle, and one that arrives grows from its own middle.
   - Anything else swaps at once: there are no neighbour morphs.
   - An interrupted morph is judged against the flight it is in, not the drawing on screen: it carries on, runs back
     along its own path, or (in a rotation group) turns on to another member; any other target swaps at once.
   - Reduced motion swaps at once. */
var BasaltGlyph = (function () {
  "use strict";
  var r3 = function (n) { return Math.round(n * 1000) / 1000; };
  var rad = function (d) { return (d * Math.PI) / 180; };

  function rot(s, deg) {
    if (!deg) return s.slice();
    var c = Math.cos(rad(deg)), n = Math.sin(rad(deg)), out = s.slice();
    for (var i = 0; i < 8; i += 2) { var dx = s[i] - 12, dy = s[i + 1] - 12; out[i] = 12 + dx * c - dy * n; out[i + 1] = 12 + dx * n + dy * c; }
    return out;
  }
  var len = function (s) { return Math.hypot(s[6] - s[0], s[7] - s[1]) + Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[6], s[5] - s[7]); };
  var isPoint = function (s) { return len(s) < 1e-3; };

  function seg(s, move) {
    var m = move === false ? "" : "M" + r3(s[0]) + " " + r3(s[1]);
    if (isPoint(s)) return m + "L" + r3(s[6]) + " " + r3(s[7]);
    return m + "C" + r3(s[2]) + " " + r3(s[3]) + " " + r3(s[4]) + " " + r3(s[5]) + " " + r3(s[6]) + " " + r3(s[7]);
  }

  // cubic-bezier(.16, 1, .3, 1): Basalt's ease-out.
  function bez(x1, y1, x2, y2) {
    function cx(t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; }
    function cy(t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 40; i++) { t = (lo + hi) / 2; if (cx(t) < x) lo = t; else hi = t; }
      return cy(t);
    };
  }
  var easeOut = bez(0.16, 1, 0.3, 1);
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  function lerpSlot(a, b, t) { return a.map(function (v, i) { return lerp(v, b[i], t); }); }
  var mid = function (s) { var x = (s[0] + s[6]) / 2, y = (s[1] + s[7]) / 2; return [x, y, x, y, x, y, x, y, 0]; };
  var rev = function (s) { return [s[6], s[7], s[4], s[5], s[2], s[3], s[0], s[1], s[8]]; };

  /** A state: { slots (canonical, unrotated), angle, f (fill 0..1), loops, knock, group, name }. */
  function state(def, selected) {
    var f = selected && def.loops.length ? 1 : 0;
    return { slots: (selected ? def.s : def.c).map(function (s) { return s.slice(); }), angle: def.rot || 0, f: f, loops: def.loops, knock: def.knock, cut: def.cut, eo: def.eo, group: def.group || null, name: def.name };
  }

  /** Pair the slots of two different drawings: through the pair's map, nearer ends first, arrivals and departures from their middles. */
  function pairUp(from, to, map) {
    var target = map ? map.map(function (j) { return to[j]; }) : to.slice();
    var a = [], b = [];
    for (var i = 0; i < from.length; i++) {
      var p = from[i], q = target[i];
      if (p[8] > 0 && q[8] > 0) {
        var d1 = Math.hypot(p[0] - q[0], p[1] - q[1]) + Math.hypot(p[6] - q[6], p[7] - q[7]);
        var d2 = Math.hypot(p[0] - q[6], p[1] - q[7]) + Math.hypot(p[6] - q[0], p[7] - q[1]);
        if (d2 < d1 - 1e-6) q = rev(q);
      } else if (p[8] > 0) q = mid(p);
      else if (q[8] > 0) p = mid(q);
      a.push(p); b.push(q);
    }
    return { a: a, b: b };
  }

  /** The drawing between two states at eased progress e. `pair` is { map } for a drawn pair, or null. */
  function between(a, b, e, pair) {
    if (a.name === b.name) {
      return { slots: a.slots.map(function (s, i) { return lerpSlot(s, b.slots[i], e); }), angle: b.angle, f: lerp(a.f, b.f, e), loops: b.loops, knock: b.knock, cut: b.cut, eo: b.eo };
    }
    if (a.group && a.group === b.group) {
      var d = ((b.angle - a.angle + 540) % 360) - 180; // the shortest way round
      return { slots: b.slots, angle: a.angle + d * e, f: lerp(a.f, b.f, e), loops: b.loops, knock: b.knock, cut: b.cut };
    }
    var from = a.slots.map(function (s) { return rot(s, a.angle); });
    var to = b.slots.map(function (s) { return rot(s, b.angle); });
    var p = pairUp(from, to, pair && pair.map);
    return { slots: p.a.map(function (s, i) { return lerpSlot(s, p.b[i], e); }), angle: 0, f: lerp(a.f, b.f, e), loops: [], knock: [] };
  }

  // A point is drawn 1.5x the stroke, as type draws a period heavier than its stems.
  function widthOf(s, u) { var l = len(s); return l >= u ? u : u * (1 + 0.5 * (1 - l / u)); }

  var seq = 0;
  /** SVG inner markup for a drawing. units: stroke width on the 24 grid. */
  function markup(d, units, prefix) {
    units = +units;
    var ss = d.slots.map(function (s) { return rot(s, d.angle); });
    var out = "";
    var knock = d.knock || [];
    if (d.f > 0.001 && d.loops && d.loops.length) {
      var id = (prefix || "bg") + (++seq);
      var holes = knock.filter(function (i) { return ss[i][8] > 0.001; }).map(function (i) {
        return '<path d="' + seg(ss[i]) + '" stroke-width="' + r3(widthOf(ss[i], units)) + '"' + (ss[i][8] < 0.999 ? ' stroke-opacity="' + r3(ss[i][8]) + '"' : "") + "/>";
      }).join("");
      var fillD = d.loops.map(function (loop) { return loop.map(function (i, k) { return seg(ss[i], k === 0); }).join("") + "Z"; }).join("");
      if (holes) out += '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28"><rect x="-2" y="-2" width="28" height="28" fill="#fff"/><g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="' + r3(d.f) + '">' + holes + "</g></mask>";
      var m = holes ? ' mask="url(#' + id + ')"' : "";
      out += "<g" + m + '><path d="' + fillD + '" fill="currentColor" fill-opacity="' + r3(d.f) + '"' + (d.eo ? ' fill-rule="evenodd"' : "") + '/>';
      if (!d.cut) out += "</g>";
      out += strokes(ss, knock, d.f, units);
      if (d.cut) out += "</g>";
      return out;
    }
    return strokes(ss, knock, 0, units);
  }
  function strokes(ss, knock, f, units) {
    var out = '<g fill="none" stroke="currentColor" stroke-width="' + units + '" stroke-linecap="round" stroke-linejoin="round">';
    ss.forEach(function (s, i) {
      var o = s[8] * (knock.indexOf(i) >= 0 ? 1 - f : 1);
      if (o < 0.002) return;
      var w = widthOf(s, units);
      out += '<path d="' + seg(s) + '"' + (Math.abs(w - units) > 1e-6 ? ' stroke-width="' + r3(w) + '"' : "") + (o < 0.999 ? ' stroke-opacity="' + r3(o) + '"' : "") + "/>";
    });
    return out + "</g>";
  }

  /** Live icons: <svg data-glyph="name" data-units="2.25" [data-selected]>. */
  function reduced() {
    var forced = typeof document !== "undefined" && document.documentElement.getAttribute("data-motion");
    if (forced) return forced === "reduced";
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  var live = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var keyOf = function (name, selected) { return name + (selected ? ":sel" : ""); };
  function draw(el, d) { el.innerHTML = markup(d, el.getAttribute("data-units")); }
  function init(el, defs) {
    var name = el.getAttribute("data-glyph"), sel = el.hasAttribute("data-selected");
    var st = state(defs[name], sel);
    live.set(el, { cur: st, key: keyOf(name, sel), flight: null, raf: 0, clock: null });
    draw(el, st);
  }
  /** Which morph two settled states may run: "same" (rest <-> selected), "group", "pair", or null (swap at once). */
  function kind(a, b, pairs) {
    if (a.name === b.name) return "same";
    if (a.group && a.group === b.group) return "group";
    if (pairs && (pairs[a.name + ">" + b.name] || pairs[b.name + ">" + a.name])) return "pair";
    return null;
  }
  /** Set up a morph: { kind, from, pair }. A pair drawn one way runs the other way by permuting the source. */
  function prepare(from, target, pairs) {
    var k = kind(from, target, pairs);
    if (k !== "pair") return { kind: k, from: from, pair: null };
    var fwd = pairs[from.name + ">" + target.name];
    if (fwd) return { kind: k, from: from, pair: fwd };
    var back = pairs[target.name + ">" + from.name];
    var src = from.slots.map(function (s) { return rot(s, from.angle); });
    var perm = back.map ? back.map.map(function (j) { return src[j]; }) : src;
    return { kind: k, from: { slots: perm, angle: 0, f: from.f, loops: [], knock: [], group: null, name: from.name }, pair: null };
  }
  var CLOCK = {
    now: function () { return performance.now(); },
    raf: function (fn) { return requestAnimationFrame(fn); },
    caf: function (id) { cancelAnimationFrame(id); },
  };
  /**
   * Morph a live icon to a glyph and selection.
   *
   * A morph in flight keeps its identity: the two settled states it runs between, its kind, and how far along it is
   * (eased progress e). The drawing on screen is always between(from, to, e). So an interruption is judged against the
   * flight, never against the in-between drawing, and the allow-list can't be bypassed:
   * - the flight's own target: it carries on;
   * - the state it left: it runs back along the same path (a rotation turns back; it never deforms);
   * - another member of a rotation group it is turning in: it turns on from the angle on screen;
   * - anything else: swaps at once, including mid-rotation.
   * opts: { clock: { now, raf, caf }, reduced: boolean } for checks; the page passes neither.
   */
  function to(el, defs, name, selected, duration, pairs, opts) {
    opts = opts || {};
    var rec = live.get(el);
    if (!rec) { init(el, defs); rec = live.get(el); }
    var clock = opts.clock || CLOCK;
    if (rec.raf && rec.clock) rec.clock.caf(rec.raf);
    rec.raf = 0;
    rec.clock = clock;
    var target = state(defs[name], selected), key = keyOf(name, selected);
    el.setAttribute("data-glyph", name);
    if (selected) el.setAttribute("data-selected", ""); else el.removeAttribute("data-selected");
    var isReduced = opts.reduced != null ? opts.reduced : reduced();
    function settle(st, k) { rec.flight = null; rec.cur = st; rec.key = k; draw(el, st); }
    if (isReduced || !duration) return settle(target, key);
    var fl = rec.flight;
    if (fl) {
      if (key === fl.toKey) return run(fl, 1);
      if (key === fl.fromKey) return run(fl, 0);
      if (fl.kind === "group" && target.group && target.group === fl.to.group) {
        var d = between(fl.from, fl.to, fl.e, fl.pair);
        var here = { slots: fl.to.slots, angle: d.angle, f: d.f, loops: fl.to.loops, knock: fl.to.knock, cut: fl.to.cut, eo: fl.to.eo, group: fl.to.group, name: "~" + fl.to.name };
        return run({ kind: "group", from: here, to: target, pair: null, fromKey: null, toKey: key, fromState: null, toState: target, e: 0 }, 1);
      }
      return settle(target, key);
    }
    if (key === rec.key) return settle(target, key);
    var prep = prepare(rec.cur, target, pairs);
    if (!prep.kind) return settle(target, key);
    run({ kind: prep.kind, from: prep.from, to: target, pair: prep.pair, fromKey: rec.key, toKey: key, fromState: rec.cur, toState: target, e: 0 }, 1);

    /** Run a flight from its current progress to `end` (1 forward, 0 back), over the share of the duration left. */
    function run(f, end) {
      rec.flight = f;
      var e0 = f.e, span = Math.abs(end - e0), dur = duration * span, start = clock.now();
      if (span < 1e-6) return done();
      function step(now) {
        var t = Math.min(1, (now - start) / dur);
        f.e = e0 + (end - e0) * easeOut(t);
        if (t < 1) { draw(el, between(f.from, f.to, f.e, f.pair)); rec.raf = clock.raf(step); }
        else { rec.raf = 0; done(); }
      }
      function done() { if (end === 1) settle(f.toState, f.toKey); else settle(f.fromState, f.fromKey); }
      rec.raf = clock.raf(step);
    }
  }
  /** What a live icon is doing: { key, moving, kind, e } (for checks). */
  function status(el) {
    var rec = live.get(el);
    if (!rec) return null;
    return { key: rec.key, moving: !!rec.flight, kind: rec.flight ? rec.flight.kind : null, e: rec.flight ? rec.flight.e : null };
  }
  return { rot: rot, seg: seg, easeOut: easeOut, state: state, between: between, prepare: prepare, markup: markup, init: init, to: to, status: status, reduced: reduced, kind: kind };
})();
if (typeof module !== "undefined") module.exports = BasaltGlyph;
