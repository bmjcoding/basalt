// The Blacksand stage art: a desert under the moon (dark) and the same desert by day (light), drawn only with Basalt's art tokens.
// Everything here is generated, seeded and static. `build.mjs` inlines what this returns; nothing runs on the page.
//
// Two drawings share one geometry:
// - the dunes: one SVG in its own units (4000 by 800), scaled by the stage's height and anchored on the row, so the big dune keeps its
//   place beside the words at every wide width;
// - the stars: plain dots in CSS pixels, placed from the row's start edge, so the words' quiet zones are in the same place at every width.
//
// The tones are the art tokens. A gradient only ever runs between neighbouring tones (field, tone-1, tone-2, tone-3, tone-4, mark): each
// gradient below is a list of [y, tone] stops and `checkNeighbours` refuses a jump of more than one step.

export const VIEW = { w: 4000, h: 800, crest: 2400 };

const TONES = ["var(--basalt-art-field)", "var(--basalt-art-tone-1)", "var(--basalt-art-tone-2)", "var(--basalt-art-tone-3)", "var(--basalt-art-tone-4)", "var(--basalt-art-mark)"];

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - (h * h * k) / 4; };
const r1 = (v) => Math.round(v * 10) / 10;

/** A dune seen from the side: a long windward slope that rounds over a soft crest, then a rounded brink and a straight slip face. */
function hump({ xc, yc, base, wind, slope = 0.72, r = 120 }) {
  return (x) => {
    if (x <= xc) return yc + (base - yc) * smooth((xc - x) / wind);
    const d = x - xc;
    return Math.min(base, yc + slope * (Math.sqrt(d * d + r * r) - r));
  };
}

/** A rank: its humps joined with a smooth minimum (so a trough is a soft crease, never a corner), over a gently uneven floor. */
function rank(humps, floor, k = 50) {
  const fns = humps.map(hump);
  return (x) => fns.reduce((y, f) => smin(y, f(x), k), floor(x));
}

// The ranks, far to near. y grows downwards; the crest of the big dune is at (2400, 100).
const RANKS = {
  r4: {
    humps: [
      { xc: -260, yc: 594, base: 626, wind: 340, slope: 0.32, r: 120 }, { xc: 240, yc: 588, base: 626, wind: 380, slope: 0.32, r: 120 },
      { xc: 760, yc: 596, base: 626, wind: 360, slope: 0.32, r: 120 }, { xc: 1260, yc: 590, base: 626, wind: 380, slope: 0.32, r: 120 },
      { xc: 1760, yc: 598, base: 626, wind: 360, slope: 0.32, r: 120 }, { xc: 3150, yc: 520, base: 626, wind: 700, slope: 0.5, r: 120 },
      { xc: 3760, yc: 556, base: 626, wind: 520, slope: 0.5, r: 120 },
    ],
    floor: (x) => 626 + 3 * Math.sin(x / 130),
  },
  r3: {
    humps: [
      { xc: 20, yc: 606, base: 652, wind: 420, slope: 0.4, r: 110 }, { xc: 560, yc: 598, base: 652, wind: 440, slope: 0.4, r: 110 },
      { xc: 1110, yc: 608, base: 652, wind: 440, slope: 0.4, r: 110 }, { xc: 1640, yc: 602, base: 652, wind: 440, slope: 0.4, r: 110 },
      { xc: 3330, yc: 466, base: 652, wind: 660, slope: 0.62, r: 120 }, { xc: 3980, yc: 516, base: 652, wind: 560, slope: 0.62, r: 120 },
    ],
    floor: (x) => 652 + 3 * Math.sin(x / 150 + 1),
  },
  r2: {
    humps: [
      { xc: -120, yc: 628, base: 684, wind: 480, slope: 0.5, r: 110 }, { xc: 440, yc: 616, base: 684, wind: 500, slope: 0.5, r: 110 },
      { xc: 1000, yc: 630, base: 684, wind: 500, slope: 0.5, r: 110 }, { xc: 1540, yc: 640, base: 684, wind: 500, slope: 0.5, r: 110 },
      { xc: 2930, yc: 360, base: 684, wind: 660, slope: 0.7, r: 130 }, { xc: 3600, yc: 450, base: 684, wind: 580, slope: 0.7, r: 120 },
    ],
    floor: (x) => 684 + 4 * Math.sin(x / 170 + 2),
  },
  r1: {
    humps: [
      { xc: 2400, yc: 100, base: 704, wind: 1500, slope: 0.72, r: 140 },
      { xc: 3880, yc: 430, base: 716, wind: 780, slope: 0.72, r: 120 },
    ],
    floor: (x) => 704 + 6 * Math.sin(x / 230) + 4 * Math.sin(x / 101 + 1),
    k: 80,
  },
};

// Where each rank's shade (its lee, the side away from the light) starts, and how far its edge sweeps towards the viewer. The light comes
// from the left, the wind's side, so every windward slope is lit and every slip face is in shade. A shade starts on the lee shoulder, a
// little past the summit, so the summit itself stays round and lit; its edge (the brink seen in perspective) curves down and back
// towards the viewer and is hidden by the nearer rank, or, on the big dune, dissolves where both sides reach the field at the stage's foot.
const SHADES = {
  r4: [{ xc: 3150, brink: 70, sweep: 220, fall: 0.35 }, { xc: 3760, brink: 60, sweep: 200, fall: 0.35 }],
  r3: [{ xc: 560, brink: 50, sweep: 150, fall: 0.28 }, { xc: 1110, brink: 50, sweep: 150, fall: 0.28 }, { xc: 1640, brink: 50, sweep: 150, fall: 0.28 }, { xc: 3330, brink: 80, sweep: 300, fall: 0.4 }, { xc: 3980, brink: 70, sweep: 260, fall: 0.4 }],
  r2: [{ xc: -120, brink: 50, sweep: 170, fall: 0.3 }, { xc: 440, brink: 50, sweep: 180, fall: 0.3 }, { xc: 1000, brink: 50, sweep: 180, fall: 0.3 }, { xc: 1540, brink: 50, sweep: 170, fall: 0.3 }, { xc: 2930, brink: 100, sweep: 420, fall: 0.5 }, { xc: 3600, brink: 90, sweep: 360, fall: 0.5 }],
  // The big dune's brink, from the lee shoulder to the foot, in units from the shoulder. It leaves the shoulder leaning back towards the
  // viewer and keeps leaning all the way down (never steeper than about 57° from the horizontal), so it never turns through vertical:
  // an edge that turned from the slip face's direction to the viewer's had to pass vertical, and did, for 11 to 37 rows (fix.md).
  r1: [
    { xc: 2400, brink: 170, scale: 1, trough: 160, path: [[-50, 26], [-110, 90], [-190, 205], [-290, 340], [-420, 480], [-600, "foot"]] },
    { xc: 3880, brink: 110, scale: 0.6, trough: 120, path: [[-50, 26], [-110, 90], [-190, 205], [-290, 340], [-420, 480], [-600, "foot"]] },
  ],
};

// The gradients, per theme, as [y, tone] stops in the drawing's units. Night: the lit side is further from the field (lighter), the
// shade nearer it. Day: the lit side is nearer the field and the shade further from it (darker). The same dunes, the same light from the
// left: the moon at night, the sun by day. The big dune's gradients reach the field at 792, 8 units above the foot (about 2 CSS pixels in
// the narrowest band), so the stage's last row is exactly the field at every width, not a rounded neighbour of it.
const GRADIENTS = {
  dark: {
    "r4-lit": [[420, 2], [700, 1]], "r4-shade": [[560, 1], [760, 0]],
    "r3-lit": [[360, 2], [690, 1]], "r3-shade": [[540, 1], [800, 0]],
    "r2-lit": [[300, 2], [620, 1], [800, 0]], "r2-shade": [[500, 1], [820, 0]],
    "r1-lit": [[-160, 3], [330, 2], [610, 1], [792, 0]], "r1-shade": [[60, 1], [790, 0]],
  },
  light: {
    "r4-lit": [[560, 0], [760, 1]], "r4-shade": [[300, 2], [700, 1]],
    "r3-lit": [[520, 0], [720, 1]], "r3-shade": [[200, 2], [720, 1]],
    "r2-lit": [[400, 0], [640, 1], [1000, 2]], "r2-shade": [[300, 2], [760, 1]],
    "r1-lit": [[-100, 2], [300, 1], [660, 1], [792, 0]], "r1-shade": [[40, 3], [400, 2], [660, 1], [792, 0]],
  },
};

function checkNeighbours(name, stops) {
  for (let i = 1; i < stops.length; i++) {
    if (Math.abs(stops[i][1] - stops[i - 1][1]) > 1) throw new Error(`${name}: a gradient may only run between neighbouring tones`);
    if (stops[i][0] <= stops[i - 1][0]) throw new Error(`${name}: stops must go down the drawing`);
  }
}

function gradient(id, stops) {
  checkNeighbours(id, stops);
  const y1 = stops[0][0], y2 = stops[stops.length - 1][0];
  const inner = stops.map(([y, tone]) => `<stop offset="${Math.round(((y - y1) / (y2 - y1)) * 1000) / 1000}" style="stop-color:${TONES[tone]}"/>`).join("");
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${y1}" y2="${y2}">${inner}</linearGradient>`;
}

/** A number on a 0.1 pen, written short: no leading zero, no trailing ".0". */
const num = (v) => { const r = Math.round(v * 10) / 10; return (Object.is(r, -0) ? 0 : r).toString().replace(/^(-?)0\./, "$1."); };
/** Joins numbers with the fewest separators SVG allows (a minus sign is its own separator). */
const nums = (list) => list.map(num).reduce((out, n, i) => (i === 0 || n.startsWith("-") ? out + n : out + " " + n), "");

/**
 * A smooth path through points (Catmull-Rom as cubic Béziers), in relative commands on a 0.1 pen: each step is measured from the
 * rounded end of the last, so rounding never drifts and the file stays small.
 */
function smoothThrough(points) {
  const round = (v) => Math.round(v * 10) / 10;
  let px = round(points[0][0]), py = round(points[0][1]);
  let d = `M${nums([px, py])}c`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const ex = round(p2[0]), ey = round(p2[1]);
    const seg = nums([c1[0] - px, c1[1] - py, c2[0] - px, c2[1] - py, ex - px, ey - py]);
    d += (i === 0 || seg.startsWith("-") ? "" : " ") + seg;
    px = ex; py = ey;
  }
  return d;
}

const sample = (f, from, to, step) => { const pts = []; for (let x = from; x <= to + 1e-6; x += step) pts.push([x, f(x)]); return pts; };

/**
 * A rank's body: its silhouette across the drawing, closed along the bottom. It runs 2000 units past each side of the view (finely
 * where the dunes are, coarsely on the flat floor beyond), so the drawing reaches both edges of the stage whatever the width and the
 * anchor: at 1024 with a scrollbar it used to stop 13px short of the start edge and leave a column of sky down to the stage's foot.
 */
const REACH = 2000;
function body(f) {
  const pts = [...sample(f, -REACH, -200, 200), ...sample(f, -160, VIEW.w + 160, 40), ...sample(f, VIEW.w + 360, VIEW.w + REACH, 200)];
  return `${smoothThrough(pts)}L${VIEW.w + REACH} ${VIEW.h + 20}L${-REACH} ${VIEW.h + 20}Z`;
}

/**
 * One shade: from the brink on the lee shoulder, along the silhouette to the trough, then back along two edges that run down and
 * towards the viewer. The summit stays round and lit (the shade starts on the shoulder past it), and both edges stay diagonal: neither
 * passes vertical. For a far rank both edges end under the nearer rank, which
 * hides them; for the big dune they reach the stage's foot, where the lit side and the shade have both come to the field.
 */
function shade(f, near, h, s) {
  const FOOT = VIEW.h + 20;
  const xb = h.xc + s.brink, yb = f(xb);
  const dx = 3, slope = (f(xb + dx) - f(xb - dx)) / (2 * dx), tl = Math.hypot(1, slope), t = [1 / tl, slope / tl];
  let xt = xb, prev = yb;
  for (let x = xb + 10; x < VIEW.w + 400; x += 10) { const y = f(x); if (y < prev - 0.05) break; xt = x; prev = y; }
  const yt = f(xt);
  const along = sample(f, xb, xt, 30);
  if (along[along.length - 1][0] !== xt) along.push([xt, yt]);
  // Where each edge ends: hidden under the nearer rank, or at the foot.
  const end = (x0, y0, run) => {
    if (!near) return [x0 - run, FOOT];
    for (let k = 0.2; k <= 4; k += 0.1) { const x = x0 - run * k, y = y0 + run * k * s.fall; if (y > near(x) + 24) return [x, y]; }
    return [x0 - run * 4, y0 + run * 4 * s.fall];
  };
  const [x3, y3] = s.path ? [xb + s.path[s.path.length - 1][0] * s.scale, FOOT] : end(xb, yb, s.sweep);
  const [x4, y4] = s.path ? [xt - s.trough, FOOT] : end(xt, yt, s.sweep * 0.6);
  let d = smoothThrough(along);
  d += `C${r1(xt - (xt - x4) * 0.2)} ${r1(yt + (y4 - yt) * 0.45)} ${r1(x4 + (xt - x4) * 0.25)} ${r1(y4 - (y4 - yt) * 0.15)} ${r1(x4)} ${r1(y4)}`;
  if (near) d += `L${r1(x4)} ${FOOT}L${r1(x3)} ${FOOT}L${r1(x3)} ${r1(y3)}`;
  else if (!s.path) d += `L${r1(x3)} ${r1(y3)}`;
  if (s.path) {
    // The big dune's brink, drawn: from the foot up to the shoulder, leaning the same way all the way.
    const pts = s.path.map(([u, v]) => [xb + u * s.scale, v === "foot" ? FOOT : yb + v * s.scale]).reverse();
    pts.push([xb, yb]);
    d += `L${r1(pts[0][0])} ${r1(pts[0][1])}` + smoothThrough(pts).replace(/^M[^c]*/, "") + "Z";
    return d;
  }
  const k2 = s.tangent ?? 60;
  const c1 = [x3 + (xb - x3) * 0.45, y3 - (y3 - yb) * 0.55];
  const c2 = [xb - k2 * t[0], yb - k2 * t[1] + 2];
  d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(xb)} ${r1(yb)}Z`;
  return d;
}

/** The dunes, one SVG for both themes: the theme's custom properties choose each fill. */
export function dunesSvg() {
  const defs = [];
  for (const theme of ["dark", "light"]) for (const [name, stops] of Object.entries(GRADIENTS[theme])) defs.push(gradient(`${theme[0]}-${name}`, stops));
  const groups = [];
  const fns = Object.fromEntries(Object.entries(RANKS).map(([id, spec]) => [id, rank(spec.humps, spec.floor, spec.k ?? 50)]));
  const nearer = { r4: "r3", r3: "r2", r2: "r1", r1: null };
  for (const id of ["r4", "r3", "r2", "r1"]) {
    const spec = RANKS[id];
    const f = fns[id];
    const near = nearer[id] ? fns[nearer[id]] : null;
    const bodyPath = body(f);
    defs.push(`<path id="body-${id}" d="${bodyPath}"/><clipPath id="clip-${id}"><use href="#body-${id}"/></clipPath>`);
    const shades = SHADES[id].map((s) => { const h = spec.humps.find((hh) => hh.xc === s.xc); return `<path d="${shade(f, near, h, s)}"/>`; }).join("");
    groups.push(`<use href="#body-${id}" style="fill:var(--g-${id}-lit)"/><g clip-path="url(#clip-${id})" style="fill:var(--g-${id}-shade)">${shades}</g>`);
  }
  return `<svg class="dunes" viewBox="0 0 ${VIEW.w} ${VIEW.h}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><defs>${defs.join("")}</defs>${groups.join("")}</svg>`;
}

/** The custom properties that pick each fill, per theme. */
export function duneFills(theme) {
  return Object.keys(GRADIENTS[theme]).map((name) => `--g-${name}: url(#${theme[0]}-${name});`).join(" ");
}

/**
 * The big dune's brink as a dense polyline in the drawing's units, from the shoulder down to the foot: the same points and the same
 * Catmull-Rom segments the drawing uses. `measure.mjs` maps it to the screen to find the brink's edge in the pixels.
 */
export function brinkPolyline(steps = 40) {
  const spec = RANKS.r1, f = rank(spec.humps, spec.floor, spec.k ?? 50);
  const s = SHADES.r1[0], xb = s.xc + s.brink, yb = f(xb), FOOT = VIEW.h + 20;
  const pts = [[xb, yb], ...s.path.map(([u, v]) => [xb + u * s.scale, v === "foot" ? FOOT : yb + v * s.scale])];
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, u = 1 - t;
      out.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** The silhouette of the big dune, for the composition check: y in units at x in units. */
export const silhouette = (() => { const s = RANKS.r1; return rank(s.humps, s.floor, s.k); })();

// ---- Stars ----

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from a point to a rectangle (0 inside). */
const rectDistance = (x, y, r) => Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.h)));

/**
 * A star field in CSS pixels from the row's start edge. `zones` are the ink's quiet zones (with their halo) in the same coordinates; a
 * star is never inside one, and grows likelier with distance over `ramp` px, so a quiet zone thins the sky without a hard edge. The
 * headroom (top `headroom` px) holds none, and the field fills in over the next `ramp` px. Lower down the stars thin and dim, as they do
 * towards a horizon.
 */
export function starsSvg({ seed, x0, x1, y1, zones, headroom, ramp = 120, headroomRamp = 120, margin = 28, density = 1 / 4200, fadeFrom = 460, fadeTo = 860, cls }) {
  const random = mulberry32(seed);
  const area = (x1 - x0) * y1;
  const target = Math.round(area * density);
  const stars = [];
  const minGap = 9;
  for (let tries = 0; stars.length < target && tries < target * 30; tries++) {
    const x = x0 + random() * (x1 - x0);
    const y = random() * y1;
    let p = smooth((y - headroom - 6) / headroomRamp);
    p *= 1 - smooth((y - fadeFrom) / (fadeTo - fadeFrom));
    for (const z of zones) p *= smooth((rectDistance(x, y, z) - margin) / ramp);
    if (random() > p) continue;
    if (stars.some((s) => Math.hypot(s.x - x, s.y - y) < minGap)) continue;
    // Size and tone: most are faint (tone-3), a few are bright (tone-4), and a handful are the mark's ink. Lower stars are dimmer.
    const low = smooth((y - fadeFrom) / (fadeTo - fadeFrom));
    const roll = random();
    const tone = roll > 0.985 - low * 0.02 && y < fadeFrom ? 5 : roll > 0.86 + low * 0.1 ? 4 : 3;
    const size = tone === 5 ? 2.2 : tone === 4 ? (random() > 0.5 ? 1.8 : 1.5) : random() > 0.55 ? 1.5 : 1.2;
    stars.push({ x: Math.round(x), y: Math.round(y), tone, size });
  }
  // One path per tone and size: each star a zero-length line with a round cap, so the file stays small.
  const groups = new Map();
  for (const s of stars) {
    const key = `${s.tone}|${s.size}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(`M${s.x} ${s.y}h0`);
  }
  const paths = [...groups.entries()].map(([key, segs]) => {
    const [tone, size] = key.split("|");
    return `<path style="stroke:${TONES[Number(tone)]}" stroke-width="${size}" d="${segs.join("")}"/>`;
  }).join("");
  return { svg: `<svg class="stars ${cls}" width="1" height="1" viewBox="0 0 1 1" overflow="visible" aria-hidden="true" focusable="false"><g fill="none" stroke-linecap="round">${paths}</g></svg>`, count: stars.length };
}
