// A sequence as text art (DECISIONS 306, 1.2): the same data as box-drawing characters, generated here and loaded on demand by a figure with
// variant="text" (React) or by the HTML skill's diagram-text module. The focal participant in a double-line box, the others single-line; lifelines │, a
// working stretch ┃; a main arrow ━━▶, a plain one ──▶, a dashed one ┄┄▷; frames in their own ink with the operator in primary. No character is ever
// written over a word, every frame closes on all four sides, and selecting the block copies the art exactly. Nothing runs at load.

import type { DiagramLineKind, MBar, Model } from "./diagram-core";
import { escapeHtml } from "./diagram-core";

type Ink = "focal" | "name" | "life" | "working" | "main" | "plain" | "label" | "num" | "note" | "frame" | "op" | "band" | "";
interface Row { ch: string[]; ink: Ink[]; n?: number }

/** The art: its HTML (one span a run of one ink, a line a row) and its widest line in characters. */
export function textArt(m: Model): { html: string; width: number } {
  const nodes = m.nodes;
  const steps = m.steps;
  const len = (s: string) => Array.from(s).length;
  // Columns: each head a box round its name; centres far enough apart for every label between them, and for a self-call's words.
  const boxW = nodes.map((n) => Math.max(8, len(n.name) + 4));
  const x = nodes.map(() => 0);
  let at = 0;
  nodes.forEach((_, k) => { x[k] = at + Math.floor(boxW[k]! / 2); at += boxW[k]! + 4; });
  const need = (a: number, b: number, chars: number) => {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const short = chars - (x[hi]! - x[lo]!);
    if (short > 0) for (let k = hi; k < nodes.length; k++) x[k]! += short;
  };
  for (const s of steps) {
    if (!("n" in s)) continue;
    const a = m.byId.get(s.from)?.i ?? 0, b = m.byId.get(s.to)?.i ?? 0;
    const words = Math.max(len(`${s.n} ${s.label}`), len(s.note ?? ""));
    if (a === b) { if (a + 1 < nodes.length) need(a, a + 1, words + 8); } else need(a, b, words + 4);
  }
  const last = nodes.length - 1;
  const selfWidth = Math.max(0, ...steps.map((s) => ("n" in s && s.from === s.to && (m.byId.get(s.from)?.i ?? 0) === last ? len(`${s.n} ${s.label}`) + 8 : 0)));
  const W = (x[last] ?? 0) + Math.ceil((boxW[last] ?? 8) / 2) + selfWidth + 2;
  const rows: Row[] = [];
  const row = (): Row => { const r = { ch: Array<string>(W).fill(" "), ink: Array<Ink>(W).fill("") }; rows.push(r); return r; };
  const put = (r: Row, from: number, text: string, ink: Ink) => { Array.from(text).forEach((c, k) => { const i = from + k; if (i >= 0 && i < W) { r.ch[i] = c; r.ink[i] = ink; } }); };
  // Which participants are working at a message (a bar on its lifeline).
  const working = (k: number, n: number) => m.bars.some((bar: MBar) => bar.who === nodes[k]!.id && bar.from <= n && bar.to >= n);
  let current = 0;
  const lifelines = (r: Row) => nodes.forEach((_, k) => put(r, x[k]!, working(k, current) ? "┃" : "│", working(k, current) ? "working" : "life"));
  // Heads.
  const top = row(), mid = row(), bottom = row();
  nodes.forEach((n, k) => {
    const left = x[k]! - Math.floor(boxW[k]! / 2), w = boxW[k]!;
    const [tl, h, tr, v, bl, br] = n.focal ? ["╔", "═", "╗", "║", "╚", "╝"] : ["┌", "─", "┐", "│", "└", "┘"];
    const ink: Ink = n.focal ? "focal" : "name";
    put(top, left, tl + h.repeat(w - 2) + tr, ink);
    put(mid, left, v, ink); put(mid, left + w - 1, v, ink);
    put(mid, left + Math.floor((w - len(n.name)) / 2), n.name, ink);
    put(bottom, left, bl + h.repeat(w - 2) + br, ink);
  });
  // Frames: their columns' outer edges, a step inside for a nested one; their sides on every row while open.
  const open: Array<{ l: number; r: number }> = [];
  const sides = (r: Row) => { for (const f of open) { put(r, f.l, "│", "frame"); put(r, f.r, "│", "frame"); } };
  const spacer = () => { const r = row(); lifelines(r); sides(r); return r; };
  spacer();
  for (const s of steps) {
    if ("band" in s) {
      const r = row();
      const words = ` ${s.band} `;
      put(r, 0, "─".repeat(W), "band");
      put(r, Math.max(0, Math.floor((W - len(words)) / 2)), words, "band");
      spacer();
      continue;
    }
    if ("open" in s) {
      const a = s.a - 1, b = s.b - 1;
      const inset = open.length * 2;
      const f = { l: Math.max(0, x[a]! - Math.floor(boxW[a]! / 2) - 1 + inset), r: Math.min(W - 1, x[b]! + Math.ceil(boxW[b]! / 2) + (b === last && steps.some((t) => "n" in t && t.from === t.to) ? selfWidth : 0) - inset) };
      const r = row();
      lifelines(r); sides(r);
      put(r, f.l, "┌" + "─".repeat(f.r - f.l - 1) + "┐", "frame");
      put(r, f.l + 1, `[${s.open}]`, "op");
      put(r, f.l + len(s.open) + 4, ` ${s.label} `, "label");
      open.push(f);
      spacer();
      continue;
    }
    if ("otherwise" in s) {
      const f = open[open.length - 1];
      if (!f) continue;
      const r = row();
      lifelines(r); sides(r);
      put(r, f.l, "├" + "┄".repeat(f.r - f.l - 1) + "┤", "frame");
      put(r, f.l + 1, "[else]", "op");
      put(r, f.l + 8, ` ${s.otherwise} `, "label");
      spacer();
      continue;
    }
    if ("close" in s) {
      const f = open.pop();
      if (!f) continue;
      const r = row();
      lifelines(r); sides(r);
      put(r, f.l, "└" + "─".repeat(f.r - f.l - 1) + "┘", "frame");
      spacer();
      continue;
    }
    current = s.n;
    const a = m.byId.get(s.from)?.i ?? 0, b = m.byId.get(s.to)?.i ?? 0;
    const said = `${s.n} ${s.label}`;
    const shaft = (k: DiagramLineKind) => (k === "main" ? "━" : k === "dashed" ? "┄" : "─");
    const head = (k: DiagramLineKind, right: boolean) => (k === "dashed" ? (right ? "▷" : "◁") : right ? "▶" : "◀");
    const ink: Ink = s.kind === "main" ? "main" : "plain";
    const r1 = row(), r2 = row();
    r1.n = s.n; r2.n = s.n;
    lifelines(r1); sides(r1); lifelines(r2); sides(r2);
    if (a === b) {
      const left = a === last && nodes.length > 1;
      const from = left ? x[a]! - 4 : x[a]! + 1;
      put(r1, from, left ? "┌──" : "──┐", ink);
      put(r2, from, left ? "└─" + head(s.kind, true) : head(s.kind, false) + "─┘", ink);
      const wordsAt = left ? from - len(said) - 1 : x[a]! + 5;
      put(r1, wordsAt, said.slice(0, len(String(s.n))), "num");
      put(r1, wordsAt + len(String(s.n)) + 1, s.label, "label");
      if (s.note) { const r3 = row(); lifelines(r3); sides(r3); put(r3, left ? from - len(s.note) - 1 : x[a]! + 5, s.note, "note"); }
    } else {
      const lo = Math.min(x[a]!, x[b]!), hi = Math.max(x[a]!, x[b]!), right = x[b]! > x[a]!;
      const wordsAt = lo + Math.max(2, Math.floor((hi - lo - len(said)) / 2));
      put(r1, wordsAt - 1, " ", "");
      put(r1, wordsAt, String(s.n), "num");
      put(r1, wordsAt + len(String(s.n)), " " + s.label + " ", "label");
      const body = shaft(s.kind).repeat(Math.max(1, hi - lo - 2));
      put(r2, lo + 1, right ? body + head(s.kind, true) : head(s.kind, false) + body, ink);
      if (s.note) { const r3 = row(); lifelines(r3); sides(r3); const at3 = lo + Math.max(2, Math.floor((hi - lo - len(s.note)) / 2)); put(r3, at3 - 1, ` ${s.note} `, "note"); }
    }
  }
  spacer();
  // One span a run of one ink; a row's trailing spaces dropped, so a copy is the art and no more.
  const html = rows.map((r) => {
    const end = r.ch.join("").trimEnd().length;
    let out = "", run = "", ink: Ink = r.ink[0] ?? "";
    for (let i = 0; i < end; i++) {
      if (r.ink[i] !== ink && run) { out += ink ? `<span data-ink="${ink}">${escapeHtml(run)}</span>` : escapeHtml(run); run = ""; }
      ink = r.ink[i]!;
      run += r.ch[i];
    }
    if (run) out += ink ? `<span data-ink="${ink}">${escapeHtml(run)}</span>` : escapeHtml(run);
    return r.n ? `<span data-n="${r.n}">${out}</span>` : out;
  }).join("\n");
  return { html, width: Math.max(...rows.map((r) => r.ch.join("").trimEnd().length)) };
}

/**
 * The build by ink (1.2), under motion="animated": before its turn a message's label is secondary and its arrow tertiary; at its turn both lift to their
 * resting ink over duration-slower, messages duration-diagram-step apart inside duration-diagram-limit. No line is hidden and there is no caret. It never
 * plays under reduced motion, in forced colours, under the hold or in print. Returns a function that settles it at once.
 */
export function buildByInk(code: HTMLElement, steps: number, t: { slower: number; step: number; limit: number }): () => void {
  if (matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active), print").matches || document.documentElement.getAttribute("data-loops") === "held") return () => {};
  const gap = steps > 1 ? Math.min(t.step, (t.limit - t.slower) / (steps - 1)) : 0;
  const animations: Animation[] = [];
  const cs = getComputedStyle(code);
  const secondary = cs.getPropertyValue("--basalt-text-secondary").trim(), tertiary = cs.getPropertyValue("--basalt-text-tertiary").trim();
  code.querySelectorAll<HTMLElement>("[data-n]").forEach((line) => {
    const n = Number(line.dataset.n);
    line.querySelectorAll<HTMLElement>('[data-ink="label"], [data-ink="main"], [data-ink="plain"]').forEach((el) => {
      const rest = getComputedStyle(el).color;
      const before = el.dataset.ink === "label" ? secondary : tertiary;
      animations.push(el.animate([{ color: before }, { color: before, offset: 0.001 }, { color: rest }], { duration: t.slower, delay: (n - 1) * gap, easing: "ease-out", fill: "backwards" }));
    });
  });
  return () => { for (const a of animations) a.finish(); };
}
