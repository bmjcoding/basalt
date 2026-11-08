var LogoGeo = (function () {
// Outline tools: turn the lettering's stroked skeletons into filled outlines, and write compound paths by hand.
// Only what the drawings use: straight lines, circular arcs (rx = ry), cubic curves for Datum. No dependencies.
//
// A contour is an array of commands in absolute coordinates:
//   ['M', x, y]  ['L', x, y]  ['A', r, large, sweep, x, y]  ['C', x1, y1, x2, y2, x, y]  ['Z']
// Orientation: "cw" means clockwise as seen on screen (y down). Ink is cw, holes are ccw, so a path fills
// the same way under nonzero and evenodd.

const n = (v, dp = 3) => {
  const k = 10 ** dp;
  const s = (Math.round(v * k) / k).toFixed(dp).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

function serialize(contours, dp = 3) {
  const out = [];
  const f = v => n(v, dp);
  for (const c of contours) {
    let cx = null, cy = null;
    for (const k of c) {
      const t = k[0];
      if (t === 'M') { out.push(`M${f(k[1])} ${f(k[2])}`); cx = k[1]; cy = k[2]; }
      else if (t === 'L') {
        if (near(k[1], cx) && near(k[2], cy)) continue;
        if (near(k[2], cy)) out.push(`H${f(k[1])}`);
        else if (near(k[1], cx)) out.push(`V${f(k[2])}`);
        else out.push(`L${f(k[1])} ${f(k[2])}`);
        cx = k[1]; cy = k[2];
      } else if (t === 'A') {
        if (near(k[5], cx) && near(k[6], cy)) continue;
        out.push(`A${f(k[1])} ${f(k[1])} 0 ${k[2]} ${k[3]} ${f(k[4])} ${f(k[5])}`); cx = k[4]; cy = k[5];
      } else if (t === 'C') { out.push(`C${f(k[1])} ${f(k[2])} ${f(k[3])} ${f(k[4])} ${f(k[5])} ${f(k[6])}`); cx = k[5]; cy = k[6]; }
      else if (t === 'Z') out.push('Z');
    }
  }
  return out.join('');
}
const near = (a, b) => b !== null && Math.abs(a - b) < 5e-4;

// ---------- sampling, area, reversal, translation ----------
function arcCentre(x0, y0, r, large, sweep, x1, y1) {
  const dx = (x1 - x0) / 2, dy = (y1 - y0) / 2;
  const d2 = dx * dx + dy * dy;
  const h = Math.sqrt(Math.max(0, r * r - d2));
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const len = Math.sqrt(d2) || 1;
  // the perpendicular to the chord, on one side or the other
  const ux = -dy / len, uy = dx / len;
  const sgn = large === sweep ? -1 : 1;
  return [mx + sgn * h * ux, my + sgn * h * uy];
}
function sample(contour, steps = 24) {
  const pts = [];
  let x = 0, y = 0;
  for (const k of contour) {
    if (k[0] === 'M' || k[0] === 'L') { x = k[1]; y = k[2]; pts.push([x, y]); }
    else if (k[0] === 'A') {
      const [r, large, sweep, x1, y1] = k.slice(1);
      const [cx, cy] = arcCentre(x, y, r, large, sweep, x1, y1);
      let a0 = Math.atan2(y - cy, x - cx), a1 = Math.atan2(y1 - cy, x1 - cx);
      let da = a1 - a0;
      if (sweep === 1 && da < 0) da += 2 * Math.PI;
      if (sweep === 0 && da > 0) da -= 2 * Math.PI;
      for (let i = 1; i <= steps; i++) { const a = a0 + da * i / steps; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      x = x1; y = y1;
    } else if (k[0] === 'C') {
      const [x1, y1, x2, y2, x3, y3] = k.slice(1);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        pts.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
      }
      x = x3; y = y3;
    }
  }
  return pts;
}
// Positive = clockwise on screen (y down).
function area(contour) {
  const p = sample(contour);
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; a += x0 * y1 - x1 * y0; }
  return a / 2;
}
function reverse(contour) {
  // Walk the segments backwards. Arcs flip their sweep; cubics swap their handles.
  const segs = [];
  let x = 0, y = 0;
  for (const k of contour) {
    if (k[0] === 'M') { x = k[1]; y = k[2]; continue; }
    if (k[0] === 'Z') continue;
    const end = k[0] === 'A' ? [k[4], k[5]] : k[0] === 'C' ? [k[5], k[6]] : [k[1], k[2]];
    segs.push({ k, from: [x, y], to: end });
    [x, y] = end;
  }
  const start = contour[0];
  const closes = !(near(x, start[1]) && near(y, start[2]));
  if (closes) segs.push({ k: ['L', start[1], start[2]], from: [x, y], to: [start[1], start[2]] });
  const out = [['M', segs[segs.length - 1].to[0], segs[segs.length - 1].to[1]]];
  for (let i = segs.length - 1; i >= 0; i--) {
    const { k, from } = segs[i];
    if (k[0] === 'A') out.push(['A', k[1], k[2], 1 - k[3], from[0], from[1]]);
    else if (k[0] === 'C') out.push(['C', k[3], k[4], k[1], k[2], from[0], from[1]]);
    else out.push(['L', from[0], from[1]]);
  }
  out.push(['Z']);
  return out;
}
const orient = (contour, want = 'cw') => ((area(contour) > 0) === (want === 'cw') ? contour : reverse(contour));
function translate(contours, dx, dy, s = 1) {
  return contours.map(c => c.map(k => {
    if (k[0] === 'M' || k[0] === 'L') return [k[0], k[1] * s + dx, k[2] * s + dy];
    if (k[0] === 'A') return ['A', k[1] * s, k[2], k[3], k[4] * s + dx, k[5] * s + dy];
    if (k[0] === 'C') return ['C', k[1] * s + dx, k[2] * s + dy, k[3] * s + dx, k[4] * s + dy, k[5] * s + dx, k[6] * s + dy];
    return k;
  }));
}
function bbox(contours) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of contours) for (const [x, y] of sample(c, 32)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

// ---------- parsing the skeleton subset (absolute M H V L A Z) ----------
function parse(d) {
  const toks = d.match(/[MHVLAZ]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const subs = [];
  let cur = null, x = 0, y = 0, i = 0, cmd = null;
  const num = () => +toks[i++];
  // zero-length segments have no direction; drop them
  const line = (x1, y1) => { if (Math.hypot(x1 - x, y1 - y) > 1e-9) cur.segs.push({ t: 'L', p0: [x, y], p1: [x1, y1] }); x = x1; y = y1; };
  while (i < toks.length) {
    if (/[MHVLAZ]/.test(toks[i])) cmd = toks[i++];
    if (cmd === 'M') { x = num(); y = num(); cur = { start: [x, y], segs: [], closed: false }; subs.push(cur); cmd = 'L'; }
    else if (cmd === 'H') { const x1 = num(); line(x1, y); }
    else if (cmd === 'V') { const y1 = num(); line(x, y1); }
    else if (cmd === 'L') { const x1 = num(), y1 = num(); line(x1, y1); }
    else if (cmd === 'A') {
      const r = num(); num(); num(); const large = num(), sweep = num(), x1 = num(), y1 = num();
      const c = arcCentre(x, y, r, large, sweep, x1, y1);
      cur.segs.push({ t: 'A', p0: [x, y], p1: [x1, y1], r, large, sweep, c });
      x = x1; y = y1;
    } else if (cmd === 'Z') { cur.closed = true; x = cur.start[0]; y = cur.start[1]; cmd = null; }
    else throw new Error('bad path ' + d);
  }
  return subs;
}

// ---------- stroking an open skeleton into an outline (butt ends, miter joins) ----------
function offsetSeg(s, d) {
  if (s.t === 'L') {
    const [x0, y0] = s.p0, [x1, y1] = s.p1;
    const L = Math.hypot(x1 - x0, y1 - y0);
    const tx = (x1 - x0) / L, ty = (y1 - y0) / L, nx = -ty, ny = tx;
    return { t: 'L', p0: [x0 + nx * d, y0 + ny * d], p1: [x1 + nx * d, y1 + ny * d], dir: [tx, ty] };
  }
  // Arc: the left normal points to the centre when sweep = 1 and away from it when sweep = 0.
  const r2 = s.sweep === 1 ? s.r - d : s.r + d;
  const [cx, cy] = s.c;
  const u0 = [(s.p0[0] - cx) / s.r, (s.p0[1] - cy) / s.r], u1 = [(s.p1[0] - cx) / s.r, (s.p1[1] - cy) / s.r];
  if (r2 < -1e-6) throw new Error('stroke wider than the curve it follows');
  return { t: 'A', r: Math.max(0, r2), large: s.large, sweep: s.sweep, c: s.c, p0: [cx + u0[0] * r2, cy + u0[1] * r2], p1: [cx + u1[0] * r2, cy + u1[1] * r2] };
}
function lineX(a, b) {
  // intersection of the infinite lines through segments a and b
  const [x1, y1] = a.p0, [x2, y2] = a.p1, [x3, y3] = b.p0, [x4, y4] = b.p1;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}
function side(segs, d) {
  const o = segs.map(s => offsetSeg(s, d));
  for (let i = 0; i < o.length - 1; i++) {
    const a = o[i], b = o[i + 1];
    if (Math.hypot(a.p1[0] - b.p0[0], a.p1[1] - b.p0[1]) < 1e-6) continue; // tangent
    if (a.t === 'L' && b.t === 'L') { const X = lineX(a, b); if (X) { a.p1 = X; b.p0 = X; } }
  }
  return o;
}
const segCmd = s => (s.t === 'L' ? ['L', s.p1[0], s.p1[1]] : s.r < 1e-6 ? ['L', s.p1[0], s.p1[1]] : ['A', s.r, s.large, s.sweep, s.p1[0], s.p1[1]]);
function strokeOutline(d, w) {
  const c = w / 2;
  return parse(d).map(sp => {
    if (sp.closed) throw new Error('closed skeletons are not used');
    const L = side(sp.segs, c);
    const R = side(sp.segs, -c);
    const out = [['M', L[0].p0[0], L[0].p0[1]]];
    L.forEach(s => out.push(segCmd(s)));
    out.push(['L', R[R.length - 1].p1[0], R[R.length - 1].p1[1]]);
    for (let i = R.length - 1; i >= 0; i--) {
      const s = R[i];
      out.push(s.t === 'L' || s.r < 1e-6 ? ['L', s.p0[0], s.p0[1]] : ['A', s.r, s.large, 1 - s.sweep, s.p0[0], s.p0[1]]);
    }
    out.push(['Z']);
    return out;
  });
}
function polygon(d) {
  return parse(d).map(sp => {
    const out = [['M', sp.start[0], sp.start[1]]];
    sp.segs.forEach(s => out.push(s.t === 'L' ? ['L', s.p1[0], s.p1[1]] : ['A', s.r, s.large, s.sweep, s.p1[0], s.p1[1]]));
    out.push(['Z']);
    return out;
  });
}

// ---------- hand-drawing helpers ----------
// Rounded rectangle, clockwise on screen. r may be a number or [tl, tr, br, bl].
function rrect(x, y, w, h, r) {
  const [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r];
  const k = [['M', x + a, y], ['L', x + w - b, y]];
  if (b) k.push(['A', b, 0, 1, x + w, y + b]);
  k.push(['L', x + w, y + h - c]);
  if (c) k.push(['A', c, 0, 1, x + w - c, y + h]);
  k.push(['L', x + d, y + h]);
  if (d) k.push(['A', d, 0, 1, x, y + h - d]);
  k.push(['L', x, y + a]);
  if (a) k.push(['A', a, 0, 1, x + a, y]);
  k.push(['Z']);
  return k;
}
const poly = (...pts) => [['M', ...pts[0]], ...pts.slice(1).map(p => ['L', ...p]), ['Z']];

// ---------- cubic helpers (Datum) ----------
function cubicAt(P, t) {
  const u = 1 - t;
  return [0, 1].map(i => u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]);
}
function cubicSplit(P, t) {
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = L(P[0], P[1]), b = L(P[1], P[2]), c = L(P[2], P[3]);
  const d = L(a, b), e = L(b, c), f = L(d, e);
  return [[P[0], a, d, f], [f, e, c, P[3]]];
}
function cubicSub(P, t0, t1) {
  let Q = cubicSplit(P, t1)[0];
  if (t0 > 0) Q = cubicSplit(Q, t0 / t1)[1];
  return Q;
}
// t at which a cubic whose y runs monotonically reaches level y
function cubicTAtY(P, y) {
  let lo = 0, hi = 1;
  const inc = P[3][1] > P[0][1];
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    const ym = cubicAt(P, m)[1];
    if ((ym < y) === inc) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

// The masters, round 4: Datum (SRA Syndicate, unchanged) and N₁ (N1, now free-standing); Breach (Blacksand) is kept only as the fallback the
// One bridge vote names. The 16 and 32 drawings now live in small.mjs, on whole pixels.
// Every mark is one compound path in currentColor: ink contours clockwise, holes anticlockwise, so it fills the same
// under nonzero and evenodd and needs no mask, no id and no style. Masters sit on a 48-unit grid; 32 and 16 are
// separate drawings on whole pixels, inside their own viewBox.
//
// Each geometry function takes a motion parameter and returns the path at that frame. The rest frame is the
// exported file, so the motion always ends on exactly the shipped mark.

// ---------------------------------------------------------------------------------------------
// Datum. A solid whose top edge dips under load, then rises past the line it started on. A hairline cut on
// that old line separates the gain from the base, so the gain reads as new material.
// ---------------------------------------------------------------------------------------------
const DATUM = {
  48: { L: 3, R: 45, B: 40, base: 20, sh: 9, tr: [22.5, 31], pk: [37, 7], k: [6.5, 6.5, 6.5, 7], cut: [18, 20] },
  // Round 3: the last handle (into the peak) is 3, was 4.5, so the gain fills under the peak instead of thinning to
  // a sliver at the cut. Every straight edge is a whole pixel; only the curve is anti-aliased.
  32: { L: 2, R: 30, B: 27, base: 13, sh: 6, tr: [15, 21], pk: [25, 4], k: [4, 4, 4, 3], cut: [11, 13] },
  16: { L: 1, R: 15, B: 14, base: 7, sh: 3, tr: [7.5, 11], pk: [12.5, 2], k: [2, 2, 2.5, 2.5], cut: [6, 7] },
};
// a: how far the dip has gone (0 flat, 1 full). b: how far the rise has gone (0 at the old line, 1 at the peak).
function datumContours(S, a = 1, b = 1) {
  const ty = S.base + (S.tr[1] - S.base) * a;
  const py = S.base + (S.pk[1] - S.base) * b;
  const C1 = [[S.sh, S.base], [S.sh + S.k[0], S.base], [S.tr[0] - S.k[1], ty], [S.tr[0], ty]];
  const C2 = [[S.tr[0], ty], [S.tr[0] + S.k[2], ty], [S.pk[0] - S.k[3], py], [S.pk[0], py]];
  const [ct, cb] = S.cut;
  const cub = P => ['C', P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]];
  const head = [['M', S.L, S.B], ['L', S.L, S.base], ['L', S.sh, S.base], cub(C1)];
  if (py >= cb - 1e-9) return [[...head, cub(C2), ['L', S.R, py], ['L', S.R, S.B], ['Z']]];
  const t20 = cubicTAtY(C2, cb);
  const base = [...head, cub(cubicSub(C2, 0, t20)), ['L', S.R, cb], ['L', S.R, S.B], ['Z']];
  if (py >= ct - 1e-9) return [base];
  const t18 = cubicTAtY(C2, ct);
  const G = cubicSub(C2, t18, 1);
  const gain = [['M', G[0][0], G[0][1]], cub(G), ['L', S.R, py], ['L', S.R, ct], ['Z']];
  return [base, gain];
}
const datumD = (size, a, b) => serialize(datumContours(DATUM[size], a, b));

// ---------------------------------------------------------------------------------------------
// Breach. A lowercase b cut from a sealed tile. The bowl is the room; the stem is the only cut that reaches the
// edge. Stems are heavier than the bowl's horizontals (the usual optical correction), and the stem is now one
// family stroke (6), a unit wider than round 1, so the notch reads as an opening before it reads as an ascender.
// ---------------------------------------------------------------------------------------------
const BREACH = {
  48: { T: 48, rt: 8, sx: [14.5, 20.5], top: 21, bl: 38, rx: 33.5, hz: 5, vt: 6, ro: 7, ri: 2 },
  32: { T: 32, rt: 5, sx: [9, 13], top: 14, bl: 25, rx: 23, hz: 3, vt: 4, ro: 4, ri: 1 },
  16: { T: 16, rt: 3, sx: [4, 7], top: 7, bl: 13, rx: 12, hz: 2, vt: 2, ro: 2, ri: 0 },
};
// s: where the stem's cut ends, as a fraction of the way from sealed (0: the room only) to open (1: through the edge).
function breachContours(S, s = 1) {
  const { T, rt, sx: [x0, x1], top, bl, rx, hz, vt, ro, ri } = S;
  const ix = rx - vt, it = top + hz, ib = bl - hz; // the counter: x1..ix, it..ib
  // The counter: an island of ink, the run inside its room.
  const island = [['M', x1, it], ['L', ix - ri, it]];
  if (ri) island.push(['A', ri, 0, 1, ix, it + ri]);
  island.push(['L', ix, ib - ri]);
  if (ri) island.push(['A', ri, 0, 1, ix - ri, ib]);
  island.push(['L', x1, ib], ['Z']);
  // The b, walked anticlockwise (it is a hole): down the stem's left side, along the baseline, round the bowl, back
  // along the bowl's top to the stem, up the stem's right side to where the cut has reached.
  const yTop = top * (1 - s);
  const b = [['L', x0, bl], ['L', rx - ro, bl], ['A', ro, 0, 0, rx, bl - ro], ['L', rx, top + ro], ['A', ro, 0, 0, rx - ro, top], ['L', x1, top]];
  const corners = [['A', rt, 0, 1, T, rt], ['L', T, T - rt], ['A', rt, 0, 1, T - rt, T], ['L', rt, T], ['A', rt, 0, 1, 0, T - rt], ['L', 0, rt], ['A', rt, 0, 1, rt, 0]];
  if (s >= 1) {
    // Open: the cut is part of the tile's outline, a bay in the top edge. One clockwise contour plus the island.
    const outer = [['M', rt, 0], ['L', x0, 0], ...b, ['L', x1, 0], ['L', T - rt, 0], ...corners, ['Z']];
    return [outer, island];
  }
  const hole = [['M', x0, yTop], ...b, ['L', x1, yTop], ['Z']];
  return [rrect(0, 0, T, T, rt), hole, island];
}
const breachD = (size, s) => serialize(breachContours(BREACH[size], s));

// ---------------------------------------------------------------------------------------------
// N₁. N with a subscript 1: a sample of one, and a number that says where it came from.
// Round 4 (council, 4–0): free-standing, no tile. The letters are round 3's, now ink rather than cut from a tile, so
// N₁ is the same kind of solid as Datum and One bridge. The subscript's foot stands on the family ground (y 40), the
// N's cap line is y 8, like One bridge's top. Every straight edge is on a whole unit (round 3's 1 had a 4.5-unit stem
// at x 34.5; it is now 5 units, 34 to 39), so the master is whole at any whole number of px a unit.
// ---------------------------------------------------------------------------------------------
const SUB = {
  // N: stems [x0,x1] and [x2,x3] from cap line y0 to baseline y1; the diagonal leaves the left stem's top at x0..dt
  // and lands on the baseline at db..x3. 1: stem [u0,u1] from v0 to v1; the flag runs 45 degrees from the stem's
  // top-left corner down to x fx, fd deep measured vertically.
  48: { N: { x: [9, 15, 23, 29], y: [8, 34], dt: 15.25, db: 22.75 }, one: { u: [34, 39], v: [27, 40], fx: 31, fd: 4 } },
};
// drop: 0 = the 1 stands on the N's baseline (the name, N1); 1 = it has settled into the subscript (N₁).
function subContours(S, drop = 1) {
  const [x0, x1, x2, x3] = S.N.x, [y0, y1] = S.N.y;
  // Where the diagonal's edges cross the stems' inner edges.
  const yR = y0 + (y1 - y0) * (x2 - S.N.dt) / (x3 - S.N.dt);
  const yL = y0 + (y1 - y0) * (x1 - x0) / (S.N.db - x0);
  const N = [['M', x0, y0], ['L', S.N.dt, y0], ['L', x2, yR], ['L', x2, y0], ['L', x3, y0], ['L', x3, y1], ['L', S.N.db, y1], ['L', x1, yL], ['L', x1, y1], ['L', x0, y1], ['Z']];
  const o = S.one, run = o.u[0] - o.fx;
  const one = [['M', o.u[0], o.v[0]], ['L', o.u[1], o.v[0]], ['L', o.u[1], o.v[1]], ['L', o.u[0], o.v[1]], ['L', o.u[0], o.v[0] + o.fd],
    ['L', o.fx, o.v[0] + o.fd + run], ['L', o.fx, o.v[0] + run], ['Z']];
  const dy = -(o.v[1] - y1) * (1 - drop);
  return [N, translate([one], 0, dy)[0]]; // both clockwise: ink
}
const subD = (size, drop) => serialize(subContours(SUB[size], drop));


return { datumD: datumD, breachD: breachD, subD: subD };
})();

var LogoMotion = (function () {
  function bez(x1, y1, x2, y2) {
    function a(t, p1, p2) { var u = 1 - t; return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t; }
    return function (x) { if (x <= 0) return 0; if (x >= 1) return 1; var lo = 0, hi = 1, t = x; for (var i = 0; i < 30; i++) { t = (lo + hi) / 2; if (a(t, x1, x2) < x) lo = t; else hi = t; } return a(t, y1, y2); };
  }
  var c01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  // Basalt's motion tokens, as the page's CSS defines them.
  function tokens() {
    var cs = getComputedStyle(document.documentElement);
    function ms(name) { var m = /^(\d*\.?\d+)(ms|s)$/.exec(cs.getPropertyValue(name).trim()); return m ? parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1) : NaN; }
    var e = /^cubic-bezier\(\s*([\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*([\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/.exec(cs.getPropertyValue('--basalt-ease-out').trim());
    var T = { fast: ms('--basalt-duration-fast'), base: ms('--basalt-duration-base'), slow: ms('--basalt-duration-slow'), slower: ms('--basalt-duration-slower'), ease: e ? bez(+e[1], +e[2], +e[3], +e[4]) : null };
    T.ok = !!T.ease && [T.fast, T.base, T.slow, T.slower].every(function (v) { return v > 0; });
    return T;
  }
  var M = {
    datum: function (T) { return { ms: Math.max(T.base, T.fast + T.slow), d: function (t, z) { return LogoGeo.datumD(z, T.ease(c01(t / T.base)), T.ease(c01((t - T.fast) / T.slow))); } }; },
    sub: function (T) { return { ms: T.fast + T.slow, d: function (t, z) { return LogoGeo.subD(z, T.ease(c01((t - T.fast) / T.slow))); } }; },
    breach: function (T) { return { ms: T.slower, d: function (t, z) { return LogoGeo.breachD(z, T.ease(c01(t / T.slower))); } }; }
  };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var playing = 0;
  function parts(svg) {
    var p = svg.querySelector('path');
    if (!p.hasAttribute('data-rest')) p.setAttribute('data-rest', p.getAttribute('d'));
    return { p: p, kind: svg.getAttribute('data-motion'), z: +svg.getAttribute('data-size') };
  }
  // The motion for a mark, or null when it must rest: reduced motion, unreadable tokens, or longer than duration-slower.
  function motion(o) {
    if (reduce.matches || !M[o.kind]) return null;
    var T = tokens();
    if (!T.ok) return null;
    var m = M[o.kind](T);
    return m.ms <= T.slower ? m : null;
  }
  function rest(o) { o.p.setAttribute('d', o.p.getAttribute('data-rest')); }
  // now: the frame time of the frame that draws the start pose, so the clock runs from what the eye first sees move.
  function play(svg, now) {
    var o = parts(svg), m = motion(o);
    if (!m) { rest(o); return; }
    var t0 = typeof now === 'number' ? now : null;
    playing++;
    o.p.setAttribute('d', m.d(0, o.z));
    function step(now) {
      if (t0 === null) t0 = now;
      var t = now - t0;
      if (t >= m.ms) { rest(o); playing--; return; } // the end frame is the shipped path; nothing is scheduled after it
      o.p.setAttribute('d', m.d(t, o.z));
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  // A hero: draw the first frame before the first paint, then play once, after the page has loaded.
  function arm(svg) {
    var o = parts(svg), m = motion(o);
    if (!m || window.__noAutoplay) return;
    o.p.setAttribute('d', m.d(0, o.z));
    var go = function () { requestAnimationFrame(function (now) { play(svg, now); }); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  // The frame the player draws at time t (ms) into the entrance, for stills of the motion (the family page's filmstrip):
  // the same motion function, the same tokens and the same end rule as play(). Nothing calls it on a page.
  function frame(svg, t) {
    var o = parts(svg), m = motion(o);
    if (!m || t >= m.ms) { rest(o); return o.p.getAttribute('d'); }
    o.p.setAttribute('d', m.d(t, o.z));
    return o.p.getAttribute('d');
  }
  return { play: play, arm: arm, frame: frame, playing: function () { return playing; }, tokens: tokens };
})();
