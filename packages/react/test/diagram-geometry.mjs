// The diagrams' geometry, read from what is drawn (DECISIONS 269 and 270, section 7): the paths and heads of the SVG, the label boxes and the nodes'
// boxes, the way the decision's proofs read Draft A. One function, evaluated in the page, so React's tests and the HTML skill's read the same things.
// `inspect(prefix, figureSelector)` returns the figure's layout and a list of problems, each a sentence; an empty list is a clean drawing.

export function inspectSource() {
  return `(${inspect.toString()})`;
}

/* eslint-disable */
function inspect(P, selector) {
  const fig = document.querySelector(selector);
  const drawing = fig.querySelector(`.${P}-drawing`);
  const o = drawing.getBoundingClientRect();
  const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top }; };
  const hit = (a, b, e = 0.01) => a.l < b.r - e && a.r > b.l + e && a.t < b.b - e && a.b > b.t + e;
  const grow = (a, p) => ({ l: a.l - p, t: a.t - p, r: a.r + p, b: a.b + p });
  const problems = [];
  const layout = fig.getAttribute("data-layout");
  const type = fig.getAttribute("data-type");
  const nodes = [...drawing.querySelectorAll(`.${P}-node`)].map((el) => ({ id: el.dataset.node, shape: el.dataset.shape, el, ...R(el) }));
  const inside = (p, n, pad) => {
    const cx = (n.l + n.r) / 2, cy = (n.t + n.b) / 2, hw = (n.r - n.l) / 2, hh = (n.b - n.t) / 2;
    if (n.shape === "decision" && fig.hasAttribute("data-measured")) return Math.abs(p.x - cx) / hw + Math.abs(p.y - cy) / hh < 1 - pad / Math.min(hw, hh);
    if (n.shape === "terminal") { const rr = Math.min(hw, hh); const ex = Math.min(Math.max(p.x, n.l + rr), n.r - rr); return Math.hypot(p.x - ex, p.y - cy) < rr - pad; }
    return p.x > n.l + pad && p.x < n.r - pad && p.y > n.t + pad && p.y < n.b - pad;
  };
  const boxOnShape = (box, n) => {
    if (!hit(box, n)) return false;
    const steps = 6;
    for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) if (inside({ x: box.l + ((box.r - box.l) * i) / steps, y: box.t + ((box.b - box.t) * j) / steps }, n, 0)) return true;
    // A shape's own point inside the box (a diamond's vertex in a wide label).
    const cx = (n.l + n.r) / 2, cy = (n.t + n.b) / 2;
    for (const p of [{ x: n.l, y: cy }, { x: n.r, y: cy }, { x: cx, y: n.t }, { x: cx, y: n.b }]) if (p.x > box.l && p.x < box.r && p.y > box.t && p.y < box.b) return true;
    return false;
  };
  // ---- lines, from their paths: the corners (a Q's control point), the stop, the tip ----
  const lines = [...drawing.querySelectorAll(`.${P}-edge`)].map((g) => {
    const d = g.querySelector(`.${P}-line`).getAttribute("d");
    const pts = [];
    for (const m of d.matchAll(/([MLQ])([^MLQ]*)/g)) {
      const n = m[2].trim().split(/[ ,]+/).map(Number);
      if (m[1] === "Q") { pts.pop(); pts.push({ x: n[0], y: n[1] }); } else pts.push({ x: n[0], y: n[1] });
    }
    const tipEl = g.querySelector(`.${P}-tip`);
    const tn = tipEl.getAttribute("d").match(/-?[\d.]+/g).map(Number);
    const open = tipEl.hasAttribute("data-open");
    const tip = open ? { x: tn[2], y: tn[3] } : { x: tn[0], y: tn[1] };
    const width = parseFloat(getComputedStyle(g.querySelector(`.${P}-line`)).strokeWidth);
    const full = pts.slice(0, -1).concat([tip]);
    return { i: g.dataset.edge, from: g.dataset.from, to: g.dataset.to, pts: full, stop: pts[pts.length - 1], tip, width, tipEl };
  });
  const segs = (l) => l.pts.slice(1).map((p, k) => [l.pts[k], p]);
  const segRect = (a, b, w) => ({ l: Math.min(a.x, b.x) - w / 2, r: Math.max(a.x, b.x) + w / 2, t: Math.min(a.y, b.y) - w / 2, b: Math.max(a.y, b.y) + w / 2 });
  const heads = lines.map((l) => ({ i: l.i, ...R(l.tipEl) }));
  const labels = [...drawing.querySelectorAll(`.${P}-label`)].map((el) => ({ i: el.dataset.edge, text: el.textContent, el, ...R(el) }));
  const rules = [];
  drawing.querySelectorAll(`.${P}-gbox, .${P}-group`).forEach((el) => {
    if (!el.getClientRects().length || getComputedStyle(el).display === "contents") return;
    const g = R(el);
    rules.push({ what: "a group's boundary", l: g.l, r: g.r, t: g.t, b: g.t + 1 }, { what: "a group's boundary", l: g.l, r: g.r, t: g.b - 1, b: g.b }, { what: "a group's boundary", l: g.l, r: g.l + 1, t: g.t, b: g.b }, { what: "a group's boundary", l: g.r - 1, r: g.r, t: g.t, b: g.b });
    const label = el.querySelector(`:scope > .${P}-glabel`);
    if (label && label.getClientRects().length && getComputedStyle(label).display !== "none") rules.push({ what: "a group's label", ...R(label) });
  });
  drawing.querySelectorAll(`.${P}-lane`).forEach((el, k) => {
    if (!el.getClientRects().length) return;
    const lane = R(el);
    if (k > 0) { const y = lane.t - parseFloat(getComputedStyle(drawing).rowGap) / 2; rules.push({ what: "a lane rule", l: lane.l, r: lane.r, t: y - 0.5, b: y + 0.5 }); }
    rules.push({ what: "a lane's name", ...R(el.querySelector(`.${P}-lane-name`)) });
  });

  // ---- scroll ----
  if (document.documentElement.scrollWidth > innerWidth + 0.5) problems.push(`the page scrolls sideways (${document.documentElement.scrollWidth} in ${innerWidth})`);
  if (fig.scrollWidth > fig.clientWidth + 0.5) problems.push(`the figure scrolls sideways (${fig.scrollWidth} in ${fig.clientWidth})`);
  if (drawing.getBoundingClientRect().right > fig.getBoundingClientRect().right + 0.5) problems.push("the drawing is wider than its figure");
  // ---- nodes ----
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) if (hit(nodes[a], nodes[b], 0.5)) problems.push(`${nodes[a].id} is on ${nodes[b].id}`);
  for (const n of nodes) {
    n.el.querySelectorAll(`.${P}-kind, .${P}-name, .${P}-detail, .${P}-tname, .${P}-cname, .${P}-ctype, .${P}-keyseat, .${P}-more`).forEach((t) => {
      if (!t.getClientRects().length) return;
      for (const rect of t.getClientRects()) {
        const r = { l: rect.left - o.left, t: rect.top - o.top, r: rect.right - o.left, b: rect.bottom - o.top };
        if (r.r - r.l < 0.5) continue;
        if (r.l < n.l - 0.5 || r.r > n.r + 0.5 || r.t < n.t - 0.5 || r.b > n.b + 0.5) problems.push(`"${t.textContent}" leaves its box (${n.id})`);
        if (n.shape === "decision" && fig.hasAttribute("data-measured")) for (const p of [{ x: r.l, y: r.t }, { x: r.r, y: r.t }, { x: r.l, y: r.b }, { x: r.r, y: r.b }]) if (!inside(p, n, -0.5)) { problems.push(`"${t.textContent}" leaves its diamond (${n.id})`); break; }
      }
      if (getComputedStyle(t).textOverflow === "ellipsis" || t.scrollWidth > t.clientWidth + 1) problems.push(`"${t.textContent}" is cut`);
    });
    if (n.shape === "decision" && fig.hasAttribute("data-measured")) {
      const w = n.r - n.l, h = n.b - n.t;
      if (h < 64 - 0.5) problems.push(`the decision ${n.id} is ${h.toFixed(1)} tall, under 64`);
      if (w / h > 5.001) problems.push(`the decision ${n.id} is ${(w / h).toFixed(2)}:1, flatter than 5:1`);
    }
  }
  // ---- lines ----
  for (const l of lines) {
    for (const n of nodes) for (const [a, b] of segs(l)) {
      const len = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(2, Math.ceil(len / 2));
      let through = false;
      for (let k = 1; k < steps && !through; k++) { const f = k / steps; if (f * len < 1.5 || (1 - f) * len < 1.5) continue; if (inside({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, n, 1)) through = true; }
      if (through) { problems.push(`${l.from} to ${l.to} passes through ${n.id}`); break; }
    }
    // the head on its line's axis, and its tip on the contour of the node it points at
    const [a, b] = segs(l)[segs(l).length - 1];
    const vertical = Math.abs(a.x - b.x) < 0.01;
    if (vertical ? Math.abs(l.stop.x - l.tip.x) > 0.01 : Math.abs(l.stop.y - l.tip.y) > 0.01) problems.push(`${l.from} to ${l.to}: its head is off its line's axis`);
    const target = nodes.find((n) => n.id === l.to);
    if (target && !fig.querySelector(`.${P}-msg`)) {
      const near = [-0.75, 0.75].some((d) => inside({ x: l.tip.x + (vertical ? 0 : d), y: l.tip.y + (vertical ? d : 0) }, target, 0)) && ![-0.75, 0.75].every((d) => inside({ x: l.tip.x + (vertical ? 0 : d), y: l.tip.y + (vertical ? d : 0) }, target, 0));
      if (!near && !(target.shape === "table")) problems.push(`${l.from} to ${l.to}: its tip (${l.tip.x.toFixed(1)}, ${l.tip.y.toFixed(1)}) is not on ${l.to}'s contour`);
    }
  }
  // crossings
  const crossings = [];
  for (let x = 0; x < lines.length; x++) for (let y = x + 1; y < lines.length; y++) for (const [p1, p2] of segs(lines[x])) for (const [q1, q2] of segs(lines[y])) {
    const aH = Math.abs(p1.y - p2.y) < 0.01, bH = Math.abs(q1.y - q2.y) < 0.01;
    if (aH === bH) continue;
    const [h1, h2, v1, v2] = aH ? [p1, p2, q1, q2] : [q1, q2, p1, p2];
    if (v1.x > Math.min(h1.x, h2.x) + 0.75 && v1.x < Math.max(h1.x, h2.x) - 0.75 && h1.y > Math.min(v1.y, v2.y) + 0.75 && h1.y < Math.max(v1.y, v2.y) - 0.75) crossings.push({ a: lines[x], b: lines[y], x: v1.x, y: h1.y, under: aH ? lines[y] : lines[x] });
  }
  const cuts = crossings.map((c) => { const path = drawing.querySelector(`.${P}-edge[data-edge="${c.under.i}"] .${P}-line`); return Boolean(path?.getAttribute("mask")); });
  // ---- labels ----
  for (const lab of labels) {
    const G = grow(lab, 0);
    for (const n of nodes) if (boxOnShape(G, n)) problems.push(`the label "${lab.text}" is on ${n.id}`);
    for (const other of labels) if (other !== lab && hit(G, other)) problems.push(`the label "${lab.text}" is on the label "${other.text}"`);
    for (const h of heads) if (hit(G, h, 0.5)) problems.push(`the label "${lab.text}" is on a head`);
    for (const r of rules) if (hit(G, r)) problems.push(`the label "${lab.text}" is on ${r.what}`);
    for (const l of lines) if (l.i !== lab.i && segs(l).some(([a, b]) => hit(G, segRect(a, b, l.width)))) problems.push(`${l.from} to ${l.to} runs through the label "${lab.text}"`);
    if (lab.l < -0.5 || lab.r > drawing.clientWidth + 0.5) problems.push(`the label "${lab.text}" leaves the drawing`);
    if (lab.el.scrollWidth > lab.el.clientWidth + 1) problems.push(`the label "${lab.text}" is cut`);
  }
  // ---- the stack's width ----
  if (layout === "stacked" && type !== "schema" && drawing.getBoundingClientRect().width > 480.5) problems.push(`the stacked drawing is ${drawing.getBoundingClientRect().width.toFixed(1)} wide`);
  // ---- type size ----
  fig.querySelectorAll("*").forEach((el) => { if (!el.getClientRects().length || ![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) return; const size = parseFloat(getComputedStyle(el).fontSize); if (size < 12 && !el.closest(".basalt-visually-hidden, .visually-hidden, [aria-hidden='true'] .x")) problems.push(`"${el.textContent.trim().slice(0, 30)}" is ${size}px`); });
  return {
    layout, type, width: fig.clientWidth, problems: [...new Set(problems)],
    lines: lines.map((l) => ({ i: l.i, from: l.from, to: l.to, pts: l.pts, width: l.width })),
    labels: labels.map((l) => ({ i: l.i, text: l.text })),
    crossings: crossings.map((c, k) => ({ a: `${c.a.from}>${c.a.to}`, b: `${c.b.from}>${c.b.to}`, cut: cuts[k] })),
    nodes: nodes.map((n) => ({ id: n.id, shape: n.shape, w: n.r - n.l, h: n.b - n.t, l: n.l, t: n.t })),
  };
}
