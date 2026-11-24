// Basalt core set, iconography round 3 (Opus): the converged set of DECISIONS item 38, drawn on Opus's round-1
// construction and metaphors.
//
// One primitive per slot: a cubic. A slot is [x0, y0, x1, y1, x2, y2, x3, y3, on] on the 24 grid; a straight stroke is a
// cubic with its controls on the line, a circular arc is a cubic with the usual 4/3·tan(θ/4) handles, and a slot whose
// four points coincide is a point. `on` is 1 drawn, 0 unused: an unused slot is an invisible point, as the article asks.
//
// - Actions are exactly three straight lines (MorphIcon's coordinates where MorphIcon already has the action; the arrow is
//   MorphIcon's moved +2.5 on x, item 39a, so MorphIcon's exported arrow changes to match).
// - Richer glyphs have eight cubic slots.
// - The signature: a glyph is drawn closed, and `seam` names the one joint that is open at rest. The rest drawing trims
//   that slot by GAP at that end; the selected drawing is the closed one. So the opening closes as the step into the
//   fill. A glyph with no joint of its own has no seam.
// - Selected: every loop in `loops` fills, every slot in `knock` becomes a hole in the fill, `sel` may move or unfold
//   other slots. Actions keep their drawing, except pause: its two bars fill when selected, because it is the glyph of a
//   held toggle (DECISIONS 361).
// - Stroke: a constant 2.25 units on 24 (1.125 px at 12, 1.5 at 16, 1.875 at 20, 2.25 at 24).

export const GRID = 24;
export const SLOTS = 8;
export const U = 2.25; // stroke, units on 24, at every size
export const GAP = 4.25; // a seam: centreline distance between the two ends, so 2 units of air between the caps

const r3 = (n) => Math.round(n * 1000) / 1000;
const rad = (d) => (d * Math.PI) / 180;

// ---------------------------------------------------------------------------------------------------------- slots
export const L = (x0, y0, x3, y3) => [x0, y0, x0 + (x3 - x0) / 3, y0 + (y3 - y0) / 3, x0 + (2 * (x3 - x0)) / 3, y0 + (2 * (y3 - y0)) / 3, x3, y3, 1];
export const C = (x0, y0, x1, y1, x2, y2, x3, y3) => [x0, y0, x1, y1, x2, y2, x3, y3, 1];
export const P = (x, y) => [x, y, x, y, x, y, x, y, 1];
export const O = (x = 12, y = 12) => [x, y, x, y, x, y, x, y, 0];
/** A circular arc on screen angles (0 is east, 90 is south), from a0 to a1, at most 180° either way. */
export function Arc(cx, cy, r, a0, a1) {
  const s = a1 - a0;
  if (Math.abs(s) > 180.0001) throw new Error("arc over 180°");
  const k = (4 / 3) * Math.tan(rad(s) / 4) * r;
  const p = (a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
  const t = (a) => [-Math.sin(rad(a)), Math.cos(rad(a))];
  const [x0, y0] = p(a0), [x3, y3] = p(a1), [tx0, ty0] = t(a0), [tx1, ty1] = t(a1);
  return [x0, y0, x0 + k * tx0, y0 + k * ty0, x3 - k * tx1, y3 - k * ty1, x3, y3, 1];
}
/** A circle as n arcs, clockwise from `start`. */
export const ring = (cx, cy, r, start = -90, n = 4) => Array.from({ length: n }, (_, i) => Arc(cx, cy, r, start + (360 / n) * i, start + (360 / n) * (i + 1)));
const reverse = (s) => [s[6], s[7], s[4], s[5], s[2], s[3], s[0], s[1], s[8]];

// ------------------------------------------------------------------------------------------------ cubic geometry
const pt = (s, t) => {
  const m = 1 - t;
  return [m * m * m * s[0] + 3 * m * m * t * s[2] + 3 * m * t * t * s[4] + t * t * t * s[6], m * m * m * s[1] + 3 * m * m * t * s[3] + 3 * m * t * t * s[5] + t * t * t * s[7]];
};
export const pointAt = pt;
export function lengthOf(s, n = 64) {
  let len = 0, prev = pt(s, 0);
  for (let i = 1; i <= n; i++) { const q = pt(s, i / n); len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
  return len;
}
/** De Casteljau: the part of a cubic from t to 1. */
function tail(s, t) {
  const lerp = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const p0 = [s[0], s[1]], p1 = [s[2], s[3]], p2 = [s[4], s[5]], p3 = [s[6], s[7]];
  const a = lerp(p0, p1), b = lerp(p1, p2), c = lerp(p2, p3), d = lerp(a, b), e = lerp(b, c), f = lerp(d, e);
  return [f[0], f[1], e[0], e[1], c[0], c[1], p3[0], p3[1], s[8]];
}
/** Trim a slot so its `end` ("start" or "end") moves `d` (straight-line distance) away from where it was. */
export function trim(s, end, d) {
  const src = end === "end" ? reverse(s) : s;
  const p0 = [src[0], src[1]];
  let lo = 0, hi = 1;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; const q = pt(src, m); if (Math.hypot(q[0] - p0[0], q[1] - p0[1]) < d) lo = m; else hi = m; }
  const out = tail(src, (lo + hi) / 2);
  return end === "end" ? reverse(out) : out;
}
export function rotateSlot(s, deg) {
  if (!deg) return s.slice();
  const c = Math.cos(rad(deg)), n = Math.sin(rad(deg));
  const out = s.slice();
  for (let i = 0; i < 8; i += 2) { const dx = s[i] - 12, dy = s[i + 1] - 12; out[i] = 12 + dx * c - dy * n; out[i + 1] = 12 + dx * n + dy * c; }
  return out;
}

// --------------------------------------------------------------------------------------------- drawings, closed
// The pencil is laid out along its axis (45°, tip at the bottom left), then rounded to the quarter unit.
function pencil() {
  const q = (n) => Math.round(n * 4) / 4;
  const u = [Math.SQRT1_2, -Math.SQRT1_2], v = [Math.SQRT1_2, Math.SQRT1_2];
  const T = [4.25, 19.75];
  const at = (d, w) => [q(T[0] + d * u[0] + w * v[0]), q(T[1] + d * u[1] + w * v[1])];
  const w = 2.75;
  const b1 = at(5.75, -w), b2 = at(5.75, w), e1 = at(19.25, -w), e2 = at(19.25, w), f1 = at(15, -w), f2 = at(15, w);
  return { T, b1, b2, e1, e2, f1, f2 };
}
const pen = pencil();

const SEARCH = { c: 10.25, r: 6.25 };
const sx = SEARCH.c + SEARCH.r * Math.SQRT1_2; // where the handle meets the lens

/**
 * family: "line" (exactly three straight lines) or "rich" (eight cubic slots).
 * s: the closed drawing (selected). seam: [slot, "start" | "end", where] for the one opening at rest.
 * sel: slot -> stroke that differs in the selected drawing only (unfolds); rest: slot -> stroke at rest only.
 * group/rotate: same drawing, different angle (spins). of: the group's drawing.
 */
export const GLYPHS = {
  // ------------------------------------------------------------------------------- actions: three straight lines
  menu: { family: "line", label: "Menu", ph: "List", morphIcon: true, s: [L(5, 7, 19, 7), L(5, 12, 19, 12), L(5, 17, 19, 17)] },
  plus: { family: "line", label: "Plus", ph: "Plus", morphIcon: true, group: "plus", rotate: 0, s: [L(5, 12, 19, 12), L(12, 5, 12, 19), O(12, 12)] },
  close: { family: "line", label: "Close", ph: "X", morphIcon: true, group: "plus", rotate: 45, of: "plus" },
  minus: { family: "line", label: "Minus", ph: "Minus", morphIcon: true, s: [L(5, 12, 19, 12), O(12, 12), O(12, 12)] },
  check: { family: "line", label: "Check", ph: "Check", morphIcon: true, s: [L(5, 13, 10, 18), L(10, 18, 19, 7), O(10, 18)] },
  more: { family: "line", label: "More", ph: "DotsThree", s: [P(5, 12), P(12, 12), P(19, 12)] },
  // The arrow group is centred on the tile (item 39a): MorphIcon's arrow moved +2.5 on x, then turned about (12, 12).
  "arrow-right": { family: "line", label: "Arrow right", ph: "ArrowRight", morphIcon: true, group: "arrow", rotate: 0, s: [L(6.5, 12, 17.5, 12), L(17.5, 12, 11.5, 7), L(17.5, 12, 11.5, 17)] },
  "arrow-down": { family: "line", label: "Arrow down", ph: "ArrowDown", morphIcon: true, group: "arrow", rotate: 90, of: "arrow-right" },
  "arrow-left": { family: "line", label: "Arrow left", ph: "ArrowLeft", morphIcon: true, group: "arrow", rotate: 180, of: "arrow-right" },
  "arrow-up": { family: "line", label: "Arrow up", ph: "ArrowUp", morphIcon: true, group: "arrow", rotate: 270, of: "arrow-right" },
  "chevron-right": { family: "line", label: "Chevron right", ph: "CaretRight", morphIcon: true, group: "chevron", rotate: 0, s: [L(9, 6, 15, 12), L(15, 12, 9, 18), O(15, 12)] },
  "chevron-down": { family: "line", label: "Chevron down", ph: "CaretDown", morphIcon: true, group: "chevron", rotate: 90, of: "chevron-right" },
  "chevron-left": { family: "line", label: "Chevron left", ph: "CaretLeft", morphIcon: true, group: "chevron", rotate: 180, of: "chevron-right" },
  "chevron-up": { family: "line", label: "Chevron up", ph: "CaretUp", morphIcon: true, group: "chevron", rotate: 270, of: "chevron-right" },
  external: { family: "line", label: "External", ph: "ArrowUpRight", s: [L(7, 17, 17, 7), L(9.5, 7, 17, 7), L(17, 7, 17, 14.5)] },
  play: { family: "line", label: "Play", ph: "Play", s: [L(7.5, 4.5, 7.5, 19.5), L(7.5, 4.5, 19, 12), L(19, 12, 7.5, 19.5)] },

  // ------------------------------------------------------------------------------------ actions: rich, 8 slots
  // Pause (the pause toggle, DECISIONS n): the glyph of a held toggle, so the one action with a selected form. Each bar is
  // a closed loop 1.5 wide on its own centreline (x 8.5 and 15.5, 3.75 of ink with the stroke), and the loop fills. At
  // rest each loop folds to the one line drawn before: slots 1 and 3 (5 and 7) grow from the bar's ends, slot 2 (and 6)
  // from its middle, so the bar thickens evenly about its centreline.
  pause: {
    family: "rich", label: "Pause", ph: "Pause", where: "none: two bars have no joint",
    s: [L(7.75, 5, 7.75, 19), L(7.75, 19, 9.25, 19), L(9.25, 19, 9.25, 5), L(9.25, 5, 7.75, 5),
        L(14.75, 5, 14.75, 19), L(14.75, 19, 16.25, 19), L(16.25, 19, 16.25, 5), L(16.25, 5, 14.75, 5)],
    rest: { 0: L(8.5, 5, 8.5, 19), 1: O(8.5, 19), 2: O(8.5, 12), 3: O(8.5, 5),
            4: L(15.5, 5, 15.5, 19), 5: O(15.5, 19), 6: O(15.5, 12), 7: O(15.5, 5) },
    loops: [[0, 1, 2, 3], [4, 5, 6, 7]],
  },
  // Download (item 39c): four straight strokes, so a rich glyph. It is arrow-down lifted 3 units over a tray: the same
  // 11-unit shaft and the same head (5 across, 6 down). Slots 0 and 1 are the head, so chevron-down's two strokes
  // become them; slot 2, the shaft, takes the chevron's unused third slot and grows from its own middle; the tray grows
  // from its own middle.
  download: { family: "rich", label: "Download", ph: "DownloadSimple", s: [L(17, 8.5, 12, 14.5), L(12, 14.5, 7, 8.5), L(12, 3.5, 12, 14.5), L(5, 20, 19, 20)] },
  // Copy's front sheet runs its left and bottom edges first, so they hinge into check's two strokes.
  copy: {
    family: "rich", label: "Copy", ph: "Copy",
    s: [L(9, 9.5, 9, 20), L(9, 20, 19.5, 20), L(19.5, 20, 19.5, 9.5), L(19.5, 9.5, 9, 9.5), L(4.5, 15, 4.5, 4.5), L(4.5, 4.5, 15, 4.5)],
  },
  edit: {
    family: "rich", label: "Edit", ph: "PencilSimple",
    s: [L(...pen.T, ...pen.b1), L(...pen.b1, ...pen.e1), L(...pen.e1, ...pen.e2), L(...pen.e2, ...pen.b2), L(...pen.b2, ...pen.T), L(...pen.f1, ...pen.f2)],
  },
  trash: {
    family: "rich", label: "Delete", ph: "Trash",
    s: [L(6, 7, 7, 20.5), L(7, 20.5, 17, 20.5), L(17, 20.5, 18, 7), L(4, 7, 20, 7), L(9.5, 3.5, 14.5, 3.5), L(10.25, 11, 10.25, 16.5), L(13.75, 11, 13.75, 16.5)],
  },


  // ------------------------------------------------------------------------------------------- navigation
  home: {
    family: "rich", nav: true, label: "Home", ph: "House", where: "the right eave, where the wall stops short of the roof",
    s: [L(4, 10, 12, 3.5), L(12, 3.5, 20, 10), L(20, 10, 20, 20.5), L(20, 20.5, 4, 20.5), L(4, 20.5, 4, 10), L(12, 20.5, 12, 15.5)],
    seam: [2, "start"], loops: [[0, 1, 2, 3, 4]], knock: [5], cutKnock: true,
  },
  search: {
    family: "rich", nav: true, label: "Search", ph: "MagnifyingGlass", where: "the handle's joint with the lens",
    s: [...ring(SEARCH.c, SEARCH.c, SEARCH.r, -135), L(sx, sx, 20.5, 20.5), O(SEARCH.c, SEARCH.c)],
    sel: { 5: Arc(SEARCH.c, SEARCH.c, 3, 180, 270) },
    seam: [4, "start"], loops: [[0, 1, 2, 3]], knock: [5],
  },
  notifications: {
    family: "rich", nav: true, label: "Notifications", ph: "Bell", where: "the rim's right corner, where the flare meets the lip",
    s: [Arc(12, 11, 5.5, 180, 270), Arc(12, 11, 5.5, 270, 360), C(17.5, 11, 17.5, 14.5, 18.25, 16.25, 19.5, 17.25), L(19.5, 17.25, 4.5, 17.25), C(4.5, 17.25, 5.75, 16.25, 6.5, 14.5, 6.5, 11), L(9.5, 20.5, 14.5, 20.5), L(12, 5.5, 12, 2.75)],
    seam: [3, "start"], loops: [[0, 1, 2, 3, 4]],
  },
  messages: {
    family: "rich", nav: true, label: "Messages", ph: "ChatText", where: "the tail's joint with the bubble",
    s: [L(4, 4.25, 20, 4.25), L(20, 4.25, 20, 15.25), L(20, 15.25, 9.5, 15.25), L(9.5, 15.25, 4, 19.75), L(4, 19.75, 4, 4.25), L(8, 8, 16, 8), L(8, 11.5, 13, 11.5)],
    seam: [2, "end"], loops: [[0, 1, 2, 3, 4]], knock: [5, 6],
  },
  profile: {
    family: "rich", nav: true, label: "Profile", ph: "User", where: "none: a head and shoulders have no joint",
    s: [...ring(12, 8, 4.25, -90), C(4, 20.5, 4, 15.5, 7.5, 13.75, 12, 13.75), C(12, 13.75, 16.5, 13.75, 20, 15.5, 20, 20.5), L(20, 20.5, 4, 20.5)],
    loops: [[0, 1, 2, 3], [4, 5, 6]],
  },
  settings: {
    family: "rich", nav: true, label: "Settings", ph: "SlidersHorizontal", where: "the top rail's joint with its knob",
    s: [Arc(15, 7.5, 2.75, 180, 360), Arc(15, 7.5, 2.75, 0, 180), Arc(9, 16.5, 2.75, 180, 360), Arc(9, 16.5, 2.75, 0, 180), L(4, 7.5, 12.25, 7.5), L(17.75, 7.5, 20, 7.5), L(4, 16.5, 6.25, 16.5), L(11.75, 16.5, 20, 16.5)],
    seam: [4, "end"], loops: [[0, 1], [2, 3]],
  },
  "more-nav": {
    family: "rich", nav: true, label: "More", ph: "DotsThreeCircle", where: "the top right corner",
    s: [L(4, 4, 20, 4), L(20, 4, 20, 20), L(20, 20, 4, 20), L(4, 20, 4, 4), P(8, 12), P(12, 12), P(16, 12)],
    seam: [1, "start"], loops: [[0, 1, 2, 3]], knock: [4, 5, 6],
  },
  calendar: {
    family: "rich", nav: true, label: "Week", ph: "CalendarBlank", where: "the top right corner of the page",
    s: [L(4, 5.5, 20, 5.5), L(20, 5.5, 20, 20.5), L(20, 20.5, 4, 20.5), L(4, 20.5, 4, 5.5), L(8.5, 3, 8.5, 7.5), L(15.5, 3, 15.5, 7.5), L(7.75, 11, 16.25, 11), P(15.5, 16)],
    seam: [1, "start"], loops: [[0, 1, 2, 3]], knock: [6, 7],
  },
  trends: {
    family: "rich", nav: true, label: "Trends", ph: "ChartLine", where: "where the line meets the right edge",
    s: [L(4, 15.5, 9, 10.5), L(9, 10.5, 13, 14), L(13, 14, 20, 6.5), L(20, 6.5, 20, 19), L(20, 19, 4, 19), L(4, 19, 4, 15.5)],
    seam: [3, "start"], loops: [[0, 1, 2, 3, 4, 5]],
  },
  plan: {
    family: "rich", nav: true, label: "Plan", ph: "ClipboardText", where: "the top right corner of the board",
    s: [L(5, 5, 9, 5), C(9, 5, 9, 1.75, 15, 1.75, 15, 5), L(15, 5, 19, 5), L(19, 5, 19, 21), L(19, 21, 5, 21), L(5, 21, 5, 5), L(8.5, 11, 15.5, 11), L(8.5, 15.5, 13, 15.5)],
    seam: [3, "start"], loops: [[0, 1, 2, 3, 4, 5]], knock: [6, 7],
  },
  sources: {
    family: "rich", nav: true, label: "Sources", ph: "Plug", where: "none: opening the cord would draw a broken connection, a real state on N1's Sources screen",
    s: [L(6, 7.5, 18, 7.5), L(18, 7.5, 18, 10.5), Arc(12, 10.5, 6, 0, 180), L(6, 10.5, 6, 7.5), L(9.5, 3, 9.5, 7.5), L(14.5, 3, 14.5, 7.5), L(12, 16.5, 12, 21.5)],
    loops: [[0, 1, 2, 3]],
  },
  history: {
    family: "rich", nav: true, label: "History", ph: "ClockCounterClockwise", where: "none: a clock face is a circle",
    s: [...ring(12, 12, 8.5, -90), L(12, 12, 12, 7.5), L(12, 12, 15, 14)],
    loops: [[0, 1, 2, 3]], knock: [4, 5],
  },

  // ------------------------------------------------------------------------------------------- Blacksand
  runs: {
    family: "rich", nav: true, label: "Runs", ph: "PlayCircle", product: "Blacksand", where: "the ring's start, upper right, like a run under way",
    s: [...ring(12, 12, 8.5, -45), L(10, 8.25, 15.5, 12), L(15.5, 12, 10, 15.75), L(10, 15.75, 10, 8.25)],
    seam: [0, "start"], loops: [[0, 1, 2, 3]], knock: [4, 5, 6],
  },
  sandboxes: {
    family: "rich", nav: true, label: "Sandboxes", ph: "Cube", product: "Blacksand", where: "the right wall's joint with the rim",
    s: [L(4, 8, 12, 4), L(12, 4, 20, 8), L(20, 8, 12, 12), L(12, 12, 4, 8), L(4, 16, 4, 8), L(12, 20.5, 4, 16), L(20, 16, 12, 20.5), L(20, 8, 20, 16)],
    seam: [7, "start"], loops: [[0, 1, 7, 6, 5, 4], [0, 1, 2, 3]], evenodd: true,
  },
  routes: {
    family: "rich", nav: true, label: "Routes", ph: "Path", product: "Blacksand", where: "the route's joint with the host",
    s: [...ring(18, 6, 2.5, 180, 2), ...ring(6, 18, 2.5, -90, 2), L(6, 15.5, 6, 6), L(6, 6, 15.5, 6)],
    seam: [5, "end"], loops: [[0, 1], [2, 3]],
  },
  policy: {
    family: "rich", nav: true, label: "Policy", ph: "ShieldCheck", product: "Blacksand", where: "the top right corner",
    s: [L(5, 4, 19, 4), L(19, 4, 19, 11), C(19, 11, 19, 15.5, 16, 18.75, 12, 20.75), C(12, 20.75, 8, 18.75, 5, 15.5, 5, 11), L(5, 11, 5, 4), L(8.75, 11.25, 11, 13.5), L(11, 13.5, 15.25, 9.25)],
    seam: [1, "start"], loops: [[0, 1, 2, 3, 4]], knock: [5, 6],
  },
  // Round 3, before the fix pass (item 39): kept only to draw the before and after.
  "r3-arrow-right": { family: "line", label: "Arrow right (round 3)", ph: "ArrowRight", board: true, group: "r3-arrow", rotate: 0, s: [L(4, 12, 15, 12), L(15, 12, 9, 7), L(15, 12, 9, 17)] },
  "r3-arrow-down": { family: "line", label: "Arrow down (round 3)", ph: "ArrowDown", board: true, group: "r3-arrow", rotate: 90, of: "r3-arrow-right" },
  "r3-download": { family: "line", label: "Download (round 3)", ph: "DownloadSimple", board: true, s: [L(17.5, 6.5, 12, 12), L(12, 12, 6.5, 6.5), L(5, 18, 19, 18)] },
  "profile-open": {
    family: "rich", nav: true, label: "Profile", ph: "User", where: "board only", board: true,
    s: [...ring(12, 8, 4.25, -90), C(4, 20.5, 4, 15.5, 7.5, 13.75, 12, 13.75), C(12, 13.75, 16.5, 13.75, 20, 15.5, 20, 20.5), O(20, 20.5)],
    sel: { 6: L(20, 20.5, 4, 20.5) }, loops: [[0, 1, 2, 3], [4, 5, 6]],
  },
  records: {
    family: "rich", nav: true, label: "Records", ph: "FileText", product: "Blacksand", where: "the fold",
    s: [L(5, 3.5, 14, 3.5), L(14, 3.5, 19, 8.5), L(19, 8.5, 19, 20.5), L(19, 20.5, 5, 20.5), L(5, 20.5, 5, 3.5), L(8.5, 12, 15.5, 12), L(8.5, 16, 13, 16)],
    seam: [1, "start"], loops: [[0, 1, 2, 3, 4]], knock: [5, 6],
  },
};

// ---------------------------------------------------------------------------------------------------- access
const baseOf = (name) => (GLYPHS[name].of ? GLYPHS[GLYPHS[name].of] : GLYPHS[name]);
export const pad = (a) => { const o = a.map((s) => s.slice()); while (o.length < SLOTS) o.push(O()); return o; };

/** The canonical (unrotated) slots of the rest or selected drawing. */
export function canonical(name, selected = false) {
  const g = baseOf(name);
  const out = pad(g.s);
  if (!selected && g.seam) { const [i, end, d = GAP] = g.seam; out[i] = trim(out[i], end, d); }
  if (selected && g.sel) for (const [i, s] of Object.entries(g.sel)) out[+i] = s.slice();
  if (!selected && g.rest) for (const [i, s] of Object.entries(g.rest)) out[+i] = s.slice();
  // A slot that only exists when selected is an invisible point at rest, sitting where it will grow from.
  if (!selected && g.sel) for (const i of Object.keys(g.sel)) if (!g.s[+i] || !g.s[+i][8]) { const s = g.sel[i]; out[+i] = O(s[0], s[1]); }
  return out;
}
export const slots = (name, selected = false) => canonical(name, selected).map((s) => rotateSlot(s, GLYPHS[name].rotate || 0));
export const loopsOf = (name) => baseOf(name).loops || [];
export const knockOf = (name) => baseOf(name).knock || [];
export const NAMES = Object.keys(GLYPHS);
export const isNav = (name) => !!GLYPHS[name].nav;

// ---------------------------------------------------------------------------------------------------- lint
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const samples = (s, n = 24) => Array.from({ length: n + 1 }, (_, i) => pt(s, i / n));
/** The drawing rules that can be counted. Returns a list of problems. */
export function lint() {
  const bad = [];
  for (const [name, g] of Object.entries(GLYPHS)) {
    if (g.of) continue;
    const straight = (s) => { const a = [s[0], s[1]], b = [s[6], s[7]], len = dist(a, b) || 1; return [[s[2], s[3]], [s[4], s[5]]].every((c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / len < 1e-6); };
    if (g.family === "line") {
      if (g.s.length !== 3) bad.push(`${name}: an action has ${g.s.length} slots, not 3`);
      if (!g.s.every(straight)) bad.push(`${name}: an action has a curve`);
    } else if (g.s.length > SLOTS) bad.push(`${name}: ${g.s.length} slots > ${SLOTS}`);
    for (const sel of [false, true]) {
      const ss = canonical(name, sel);
      for (const s of ss) if (s[8]) for (const p of samples(s)) for (const v of p) if (v < 2.5 - 1e-3 || v > 21.5 + 1e-3) { bad.push(`${name}: ${r3(v)} outside 2.5–21.5`); break; }
      if (sel) for (const loop of g.loops || []) for (let k = 0; k < loop.length; k++) {
        const a = ss[loop[k]], b = ss[loop[(k + 1) % loop.length]];
        if (dist([a[6], a[7]], [b[0], b[1]]) > 0.02) bad.push(`${name} (selected): loop breaks between ${loop[k]} and ${loop[(k + 1) % loop.length]}`);
      }
      // Clearance: a hole keeps at least one stroke of ink between it and the loop's edge (centrelines ≥ U apart).
      if (sel && !g.cutKnock) for (const k of g.knock || []) {
        if (!ss[k][8]) continue;
        const edge = (g.loops || []).flat().map((i) => ss[i]);
        let min = Infinity;
        for (const p of samples(ss[k])) for (const e of edge) for (const q of samples(e, 48)) min = Math.min(min, dist(p, q));
        if (min < U - 0.01) bad.push(`${name}: hole ${k} is ${r3(min)} from the edge (< ${U})`);
      }
    }
    if (g.seam) {
      const rest = canonical(name, false), closed = canonical(name, true);
      const [i, end] = g.seam;
      const a = end === "start" ? [rest[i][0], rest[i][1]] : [rest[i][6], rest[i][7]];
      const b = end === "start" ? [closed[i][0], closed[i][1]] : [closed[i][6], closed[i][7]];
      if (Math.abs(dist(a, b) - GAP) > 0.05) bad.push(`${name}: seam is ${r3(dist(a, b))}, not ${GAP}`);
    }
  }
  return bad;
}
