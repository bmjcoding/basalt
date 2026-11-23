// A diagram's motion (DECISIONS 292): the entrance, flow, the pulse, the packet and the sequence's run, for React and the HTML skill alike. It holds
// no React. It is never imported by a still figure: React loads it on demand (diagram-motion.tsx) the first time a figure is animated, and the skill
// adds it to a page (the diagram-motion module) only when a diagram's JSON says "motion": "animated". Nothing runs when it loads: the page's one set
// of observers is made by the first figure that attaches, and taken down by the last that leaves.
//
// The still engine (diagram-core.ts) draws every line and marks an animated figure pending in the frame its lines are first drawn (entranceDrawn).
// This module plays that entrance when the figure comes into view, carries it across a re-measure on its one clock, settles it at once when the reader
// acts or a mode turns on, and then runs the loops the data names while they may run. Every value is a token, read from the page.

import { entranceBlocked, pathD, settleEntrance } from "./diagram-core";
import type { Geo, GLine, Model, Pt, Tokens } from "./diagram-core";

export interface MotionHost {
  /** The figure element, which carries data-motion="animated". */
  fig: HTMLElement;
  /** The class prefix: "basalt-diagram" in React, "diagram" in the skill. */
  P: string;
  base: string;
  model: () => Model;
  /** The lines as last drawn. */
  geo: () => Geo | null;
  tokens: () => Tokens | null;
}

export interface MotionState {
  /** "Pause animations" is shown (1.9). */
  canLoop: boolean;
  /** "Play the run" is shown (1.10). */
  runShown: boolean;
  /** A run the reader started is going: the button reads "Stop the run". */
  running: boolean;
}

export interface MotionController {
  /** The engine drew the lines again (the faces arriving, a resize): they are different from the lines it drew before. */
  redrawn: () => void;
  /** The data may have changed: a different figure settles, and its mover follows the new route. */
  changed: () => void;
  /** The packet's `send` value as the app has it now: a new value sends one message; the first one seen sends none. */
  sendValue: (value: number | string | undefined) => void;
  /** The run button: plays the run, or stops it. */
  toggleRun: () => void;
  state: () => MotionState;
  subscribe: (notify: () => void) => () => void;
  destroy: () => void;
}

// ---- The page: one set of observers for every animated figure on it ----

interface Page { figs: Set<Figure>; io: IntersectionObserver; mo: MutationObserver; media: MediaQueryList[]; onChange: () => void; onPrint: () => void }
let page: Page | undefined;

const THRESHOLDS = Array.from({ length: 21 }, (_, k) => k / 20);

function join(fig: Figure): Page {
  if (!page) {
    const onChange = () => { for (const f of page?.figs ?? []) f.sync(); };
    // The browser's own print path fires beforeprint with no media change: every entrance settles on it as well (1.5).
    const onPrint = () => { for (const f of page?.figs ?? []) settleEntrance(f.host.fig); onChange(); };
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) for (const f of page?.figs ?? []) if (f.drawing === entry.target) f.seen(entry);
    }, { threshold: THRESHOLDS });
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.target === document.documentElement) { for (const f of page?.figs ?? []) f.holdChanged(); continue; }
        for (const f of page?.figs ?? []) if (f.host.fig === r.target) f.traceChanged();
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-loops"] });
    const media = ["(prefers-reduced-motion: reduce)", "(forced-colors: active)", "print"].map((q) => matchMedia(q));
    for (const mq of media) mq.addEventListener("change", onChange);
    window.addEventListener("beforeprint", onPrint);
    document.addEventListener("visibilitychange", onChange);
    page = { figs: new Set(), io, mo, media, onChange, onPrint };
  }
  page.figs.add(fig);
  if (fig.drawing) page.io.observe(fig.drawing);
  page.mo.observe(fig.host.fig, { attributes: true, attributeFilter: ["data-tracing"] });
  return page;
}

function leave(fig: Figure) {
  if (!page) return;
  page.figs.delete(fig);
  if (fig.drawing) page.io.unobserve(fig.drawing);
  if (page.figs.size) return;
  page.io.disconnect();
  page.mo.disconnect();
  for (const mq of page.media) mq.removeEventListener("change", page.onChange);
  window.removeEventListener("beforeprint", page.onPrint);
  document.removeEventListener("visibilitychange", page.onChange);
  page = undefined;
}

// ---- Tokens ----

interface Timing {
  lineMin: number; lineMax: number; stagger: number; step: number; arrow: number; limit: number; legMin: number; legMax: number;
  rest: number; pause: number; repeat: number; fast: number; base: number; slow: number; slower: number;
  trace: number; packet: number; pulse: number; flow: number; bead: number; flowPeriod: number;
  inOut: string; out: string; in: string;
}

function readTiming(el: Element): Timing {
  const cs = getComputedStyle(el);
  const raw = (name: string) => cs.getPropertyValue(`--basalt-${name}`).trim();
  const ms = (name: string) => { const v = raw(name); const n = parseFloat(v); return /ms$/.test(v) ? n : /s$/.test(v) ? n * 1000 : n || 0; };
  const num = (name: string) => parseFloat(raw(name)) || 0;
  const ease = (name: string) => raw(`ease-${name}`) || "ease";
  return {
    lineMin: ms("duration-diagram-line-min"), lineMax: ms("duration-diagram-line-max"), stagger: ms("duration-diagram-stagger"), step: ms("duration-diagram-step"),
    arrow: ms("duration-diagram-arrow"), limit: ms("duration-diagram-limit"), legMin: ms("duration-diagram-leg-min"), legMax: ms("duration-diagram-leg-max"),
    rest: ms("duration-diagram-rest"), pause: ms("duration-diagram-pause"), repeat: ms("duration-diagram-repeat"),
    fast: ms("duration-fast"), base: ms("duration-base"), slow: ms("duration-slow"), slower: ms("duration-slower"),
    trace: num("speed-diagram-trace"), packet: num("speed-diagram-packet"), pulse: num("speed-diagram-pulse"), flow: num("speed-diagram-flow"),
    bead: num("size-diagram-bead"), flowPeriod: num("size-diagram-flow"),
    inOut: ease("in-out"), out: ease("out"), in: ease("in"),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const SVG = "http://www.w3.org/2000/svg";
const svgEl = (name: string, attrs: Record<string, string | number>, parent?: Element) => {
  const el = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
};
const now = () => Number(document.timeline.currentTime ?? performance.now());
const aborted = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
const unit: Record<string, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/** A line's points with its end moved back from the tip by `back` along its last run. */
function trimmed(l: GLine, back: number): Pt[] {
  const pts = l.pts.map((p) => ({ ...p }));
  const u = unit[l.dir]!;
  const last = pts[pts.length - 1]!, prev = pts[pts.length - 2]!;
  const room = Math.hypot(last.x - prev.x, last.y - prev.y);
  const by = Math.min(back, Math.max(0, room - 0.5));
  last.x -= u.x * by; last.y -= u.y * by;
  return pts;
}
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((sum, p, k) => sum + Math.hypot(p.x - pts[k]!.x, p.y - pts[k]!.y), 0);
const boundsOf = (pts: Pt[], pad: number) => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { l: Math.floor(Math.min(...xs) - pad), t: Math.floor(Math.min(...ys) - pad), r: Math.ceil(Math.max(...xs) + pad), b: Math.ceil(Math.max(...ys) + pad) };
};

// ---- One figure ----

interface Plan { start: number; dur: number; end: number }

class Figure implements MotionController {
  host: MotionHost;
  drawing: Element | null;
  private page: Page;
  private t: Timing;
  private listeners = new Set<() => void>();
  private snapshot: MotionState = { canLoop: false, runShown: false, running: false };
  private destroyed = false;
  // The entrance: one clock (t0), one stagger factor, the plan each line was last given, the animations on it.
  private t0 = 0;
  private factor = 1;
  private plans = new Map<number, Plan>();
  private intro = new Set<Animation>();
  private labels = new Set<Animation>();
  private introEnd: Animation | null = null;
  private defs: SVGSVGElement | null = null;
  private signature = "";
  // What the reader can see of the figure.
  private inView = false;
  private enough = false;
  // The loops: a generation that every async step checks, the animations they run, the elements that persist between runs.
  private loopGen = 0;
  private loops = new Set<Animation>();
  private looping = false;
  private flowEls = new Map<number, SVGSVGElement>();
  private beadEls = new Map<number, SVGSVGElement>();
  private dot: HTMLElement | null = null;
  /** Whose the dot is while it travels: a loop's (cleared by the hold) or a run's or a send's (never stopped by it). */
  private dotOwner: "loop" | "run" | null = null;
  private resumeAt = 0;
  private resumeTimer = 0;
  // A run the reader started, and the app's messages.
  private runGen = 0;
  private runAnims = new Set<Animation>();
  private runAt = -1;
  private inFlight = false;
  private waiting = false;
  private lastSend: { v: number | string | undefined } | null = null;
  private arrivals = new Map<Element, number>();

  constructor(host: MotionHost) {
    this.host = host;
    this.drawing = host.fig.querySelector(`.${host.P}-drawing`);
    this.t = readTiming(host.fig);
    this.signature = this.edgeSignature();
    host.fig.addEventListener("basalt-diagram-settle", this.onSettle);
    this.page = join(this);
    this.sync();
  }

  // ---- The controller's face ----

  state = () => this.snapshot;
  subscribe = (notify: () => void) => { this.listeners.add(notify); return () => { this.listeners.delete(notify); }; };
  private publish() {
    const lines = this.hasLines();
    const m = this.host.model();
    const modes = this.modes();
    const loopsNamed = m.edges.some((e) => e.flow) || Boolean(m.motion.pulse) || Boolean(m.motion.packet?.repeat);
    const next: MotionState = {
      canLoop: m.motion.animated && loopsNamed && lines && !modes.reduce && !modes.forced,
      runShown: m.motion.animated && m.motion.run && lines,
      running: this.runAt >= 0,
    };
    if (next.canLoop === this.snapshot.canLoop && next.runShown === this.snapshot.runShown && next.running === this.snapshot.running) return;
    this.snapshot = next;
    for (const notify of this.listeners) notify();
  }

  destroy = () => {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopRun();
    this.clearLoops();
    // Motion turned off, or the figure gone: a running entrance is settled. A pending one is left as it is: it is drawn only while the figure says
    // data-motion="animated", and a figure attached again (React's development double effects) plays it.
    if (this.entrance() === "running") this.host.fig.setAttribute("data-entrance", "done");
    this.clearIntro();
    this.host.fig.removeEventListener("basalt-diagram-settle", this.onSettle);
    clearTimeout(this.resumeTimer);
    for (const el of [...this.flowEls.values(), ...this.beadEls.values()]) el.remove();
    this.dot?.remove();
    leave(this);
  };

  // ---- What the page tells every figure ----

  private modes() {
    return {
      reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
      forced: matchMedia("(forced-colors: active)").matches,
      print: matchMedia("print").matches,
      held: document.documentElement.getAttribute("data-loops") === "held",
    };
  }
  private entrance() { return this.host.fig.getAttribute("data-entrance"); }
  private hasLines() { return Boolean(this.host.geo()?.lines.length); }
  private traced() { return this.host.fig.hasAttribute("data-tracing"); }

  seen(entry: IntersectionObserverEntry) {
    this.inView = entry.isIntersecting;
    // Two fifths of the drawing's height in view, or of the window's for a drawing taller than the window (1.5).
    const need = Math.min(entry.boundingClientRect.height, window.innerHeight) * 0.4;
    this.enough = entry.isIntersecting && entry.intersectionRect.height >= need - 0.5;
    this.sync();
  }

  holdChanged() {
    // The hold settles an entrance (1.5) and clears the loops to rest; releasing it starts them again at once (1.9).
    if (this.modes().held) settleEntrance(this.host.fig);
    this.sync();
  }

  traceChanged() {
    if (this.traced()) {
      // A run the reader started ends when a node is traced: the reader has turned to something else (1.13).
      this.stopRun();
      this.resumeAt = Infinity;
    } else if (this.resumeAt === Infinity) {
      // Loops start again duration-diagram-pause after a trace ends, so a pointer crossing the cards does not flicker them.
      this.resumeAt = now() + this.t.pause;
      clearTimeout(this.resumeTimer);
      this.resumeTimer = window.setTimeout(() => this.sync(), this.t.pause);
    }
    this.sync();
  }

  /** Brings the figure in line with everything it depends on: whether its entrance plays, settles or waits, and whether its loops run, freeze or rest. */
  sync() {
    if (this.destroyed) return;
    const fig = this.host.fig;
    const m = this.host.model();
    const modes = this.modes();
    const state = this.entrance();
    // A mode that turns on settles (1.5): the hold, print, reduced motion, forced colours. Motion turned off is the host's: it destroys this figure.
    if ((state === "pending" || state === "running") && (modes.held || modes.print || modes.reduce || modes.forced)) settleEntrance(fig);
    else if (state === "pending" && this.enough && !document.hidden && this.hasLines()) this.play();
    // A figure that came into view at rest stays at rest: a later release starts its loops, not an entrance.
    if (!state && this.enough && this.hasLines()) fig.setAttribute("data-entrance", "done");
    this.syncLoops(m, modes);
    this.publish();
  }

  // ---- The entrance (1.3 to 1.5) ----

  private onSettle = () => {
    // settleEntrance has already set data-entrance="done": every line whole, every label at rest, and then the loops may start.
    this.clearIntro();
    this.sync();
  };

  private ordered(geo: Geo): GLine[] {
    const m = this.host.model();
    const lines = [...geo.lines];
    // A schema's lines are derived, so they go by where each starts: top to bottom, then start to end. Every other type keeps the author's order.
    if (m.type === "schema") lines.sort((a, b) => a.pts[0]!.y - b.pts[0]!.y || a.pts[0]!.x - b.pts[0]!.x || a.i - b.i);
    else lines.sort((a, b) => a.i - b.i);
    return lines;
  }

  /** Each line's own times on the entrance's clock (its start, duration and the end of its head), and the stagger factor that keeps it inside the limit. */
  private plan(lines: GLine[], factor?: number): { plans: Map<number, Plan>; factor: number } {
    const t = this.t;
    const sequence = this.host.model().type === "sequence";
    const step = sequence ? t.step : t.stagger;
    const own = lines.map((l) => {
      const path = this.lineEl(l)?.querySelector<SVGGeometryElement>(`.${this.host.P}-line`);
      const len = path ? path.getTotalLength() : lengthOf(l.pts);
      // A message's arrow draws duration-base after its label starts lifting, over duration-diagram-arrow; a traced line takes its length at the
      // trace speed, clamped. A line ends when its head has: the head starts at 85% and fades in over duration-slow.
      const dur = sequence ? t.arrow : clamp((len / t.trace) * 1000, t.lineMin, t.lineMax);
      const lead = sequence ? t.base : 0;
      return { lead, dur, tail: lead + Math.max(dur, 0.85 * dur + t.slow, sequence ? t.slower : 0) };
    });
    let f = 1;
    for (let k = 1; k < own.length; k++) f = Math.min(f, Math.max(0, (t.limit - own[k]!.tail) / (k * step)));
    if (factor !== undefined) f = Math.min(f, factor);
    const plans = new Map<number, Plan>();
    lines.forEach((l, k) => { const at = k * step * f; plans.set(l.i, { start: at + own[k]!.lead, dur: own[k]!.dur, end: at + own[k]!.tail }); });
    return { plans, factor: f };
  }

  private lineEl(l: GLine) { return this.host.fig.querySelector<SVGGElement>(`.${this.host.P}-edge[data-edge="${l.i}"]`); }

  private play() {
    const geo = this.host.geo();
    if (!geo?.lines.length) return;
    this.host.fig.setAttribute("data-entrance", "running");
    this.t0 = now();
    const { plans, factor } = this.plan(this.ordered(geo));
    this.factor = factor;
    this.plans = plans;
    this.build(new Set(), true);
  }

  /** Builds the reveal from the one clock: every line not yet whole is masked and drawn on, a whole one is left whole, and a sequence's labels lift. */
  private build(whole: Set<number>, labels: boolean) {
    const geo = this.host.geo();
    const fig = this.host.fig;
    const { P } = this.host;
    const t = this.t;
    if (!geo) return;
    // The lines' reveal is built again; a sequence's labels keep the lift they were given on the clock.
    for (const a of this.intro) a.cancel();
    this.intro.clear();
    this.defs?.remove();
    const ink = fig.querySelector(`.${P}-ink`);
    const svg = ink?.querySelector(`.${P}-svg`);
    if (!ink || !svg) return;
    this.defs = svgEl("svg", { class: `${P}-motion-defs`, width: 0, height: 0, "aria-hidden": "true", focusable: "false" }) as SVGSVGElement;
    svg.after(this.defs);
    const defs = svgEl("defs", {}, this.defs);
    const clocked = (a: Animation, into = this.intro) => { a.startTime = this.t0; into.add(a); return a; };
    let last = 0;
    for (const l of geo.lines) {
      const plan = this.plans.get(l.i);
      const g = this.lineEl(l);
      if (!plan || !g) continue;
      last = Math.max(last, plan.end);
      if (whole.has(l.i)) { g.removeAttribute("mask"); continue; }
      // Each line is revealed on its own (1.3): its own mask on its own edge group, over the engine's crossing mask on its path.
      const id = `${this.host.base}-reveal-${l.i}`;
      const mask = svgEl("mask", { id, maskUnits: "userSpaceOnUse", x: -geo.w, y: -geo.h, width: 3 * geo.w, height: 3 * geo.h }, defs);
      const line = g.querySelector<SVGGeometryElement>(`.${P}-line`);
      if (line) {
        const len = line.getTotalLength();
        const copy = svgEl("path", { d: line.getAttribute("d") ?? "", fill: "none", stroke: "#fff", "stroke-width": l.width + 6, "stroke-dasharray": `${len} ${len + 8}`, "stroke-dashoffset": len }, mask);
        clocked(copy.animate([{ strokeDashoffset: `${len}px` }, { strokeDashoffset: "0px" }], { duration: plan.dur, delay: plan.start, easing: t.inOut, fill: "both" }));
      }
      const tip = g.querySelector(`.${P}-tip`);
      if (tip) {
        const copy = svgEl("path", { d: tip.getAttribute("d") ?? "", fill: "#fff", stroke: "#fff", "stroke-width": 3, "stroke-linejoin": "round" }, mask);
        clocked(copy.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.slow, delay: plan.start + 0.85 * plan.dur, easing: t.out, fill: "both" }));
      }
      const dot = g.querySelector(`.${P}-dot`);
      if (dot) {
        const copy = svgEl("circle", { cx: dot.getAttribute("cx") ?? 0, cy: dot.getAttribute("cy") ?? 0, r: Number(dot.getAttribute("r") ?? 3) + 1, fill: "#fff" }, mask);
        clocked(copy.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.fast, delay: plan.start, easing: t.out, fill: "both" }));
      }
      g.setAttribute("mask", `url(#${id})`);
    }
    // A sequence's labels are drawn in secondary ink before their turn and lift to primary over duration-slower (1.4). Built once, on the clock.
    if (labels && this.host.model().type === "sequence") {
      const cs = getComputedStyle(fig);
      const from = cs.getPropertyValue("--basalt-text-secondary").trim(), to = cs.getPropertyValue("--basalt-text-primary").trim();
      const msgs = fig.querySelectorAll<HTMLElement>(`.${P}-msg`);
      this.ordered(geo).forEach((l, k) => {
        const label = msgs[k]?.querySelector(`.${P}-mlabel`);
        const plan = this.plans.get(l.i);
        if (label && plan && from && to) clocked(label.animate([{ color: from }, { color: to }], { duration: t.slower, delay: plan.start - t.base, easing: t.out, fill: "both" }), this.labels);
      });
    }
    this.introEnd?.cancel();
    this.introEnd = new Animation(new KeyframeEffect(null, [], { duration: Math.max(1, last) }), document.timeline);
    this.introEnd.startTime = this.t0;
    this.introEnd.finished.then(() => this.finishIntro(), () => {});
  }

  private finishIntro() {
    if (this.entrance() !== "running") return;
    this.host.fig.setAttribute("data-entrance", "done");
    this.clearIntro();
    this.sync();
  }

  private clearIntro() {
    for (const a of [...this.intro, ...this.labels]) a.cancel();
    this.intro.clear();
    this.labels.clear();
    this.introEnd?.cancel();
    this.introEnd = null;
    this.defs?.remove();
    this.defs = null;
    this.host.fig.querySelectorAll(`.${this.host.P}-edge[mask]`).forEach((g) => g.removeAttribute("mask"));
  }

  redrawn = () => {
    if (this.destroyed) return;
    const state = this.entrance();
    if (state === "running") {
      const geo = this.host.geo();
      if (!geo?.lines.length) {
        // Narrowed to a layout with no lines: at rest, with no control (1.5).
        this.clearIntro();
        this.host.fig.setAttribute("data-entrance", "done");
      } else {
        // Different lines, running: the entrance carries on, on the new lines, from its one clock. A line that was whole stays whole; the stagger
        // never grows, so no line starts later than it was going to; the limit is still counted from the first start.
        const elapsed = now() - this.t0;
        const whole = new Set([...this.plans].filter(([, p]) => p.end <= elapsed).map(([i]) => i));
        const { plans, factor } = this.plan(this.ordered(geo), this.factor);
        for (const i of whole) { const old = this.plans.get(i); if (old) plans.set(i, old); }
        this.factor = factor;
        this.plans = plans;
        this.build(whole, false);
      }
    }
    // A loop follows the new lines: cleared and started again at once (1.9). A run the reader started carries on from its message, that leg again.
    if (this.looping) { this.clearLoops(); }
    for (const el of [...this.flowEls.values(), ...this.beadEls.values()]) el.remove();
    this.flowEls.clear();
    this.beadEls.clear();
    if (this.runAt >= 0) this.playRun(this.runAt);
    this.sync();
  };

  private edgeSignature() {
    const m = this.host.model();
    const lines = m.type === "sequence" ? m.steps.flatMap((s) => ("n" in s ? [`${s.from}>${s.to}:${s.kind}`] : [])) : m.edges.map((e) => `${e.from}>${e.to}:${e.kind}`);
    return lines.join("|");
  }

  changed = () => {
    const next = this.edgeSignature();
    const route = JSON.stringify([this.host.model().motion.pulse, this.host.model().motion.packet?.path, this.host.model().edges.map((e) => Boolean(e.flow))]);
    if (next !== this.signature) {
      this.signature = next;
      // A different figure: its edges are no longer the same edges in the same order.
      settleEntrance(this.host.fig);
      this.stopRun();
    }
    if (route !== this.route) { this.route = route; if (this.looping) this.clearLoops(); }
    this.sync();
  };
  private route = "";

  // ---- The loops (1.6, 1.7, 1.8, 1.9) ----

  private syncLoops(m: Model, modes: ReturnType<Figure["modes"]>) {
    const settled = this.entrance() === "done";
    const rest = !m.motion.animated || !settled || !this.hasLines() || modes.reduce || modes.forced || modes.print || modes.held || this.traced() || now() < this.resumeAt;
    if (rest) { if (this.looping) this.clearLoops(); return; }
    const freeze = !this.inView || document.hidden;
    if (!this.looping) {
      if (freeze) return;
      this.startLoops(m);
      return;
    }
    // Out of view or in a hidden tab they freeze where they are and carry on from there.
    for (const a of this.loops) { if (freeze && a.playState === "running") a.pause(); else if (!freeze && a.playState === "paused") a.play(); }
  }

  private startLoops(m: Model) {
    const geo = this.host.geo();
    if (!geo) return;
    this.looping = true;
    const gen = ++this.loopGen;
    for (const e of m.edges) if (e.flow) this.flow(geo, e.i);
    if (m.motion.pulse) this.pulse(gen, m.motion.pulse).catch(() => {});
    else if (m.motion.packet?.repeat) this.repeat(gen, m.motion.packet.path).catch(() => {});
  }

  private clearLoops() {
    this.looping = false;
    this.loopGen++;
    for (const a of this.loops) a.cancel();
    this.loops.clear();
    // Cleared to rest: solid lines, no bead, no dot, no arrival step. The elements persist, hidden, for the next run.
    for (const el of [...this.flowEls.values(), ...this.beadEls.values()]) el.style.display = "none";
    if (this.dotOwner === "loop" && this.dot) { this.dot.style.display = "none"; this.dotOwner = null; }
    if (this.runAt < 0 && this.dotOwner !== "run") this.clearArrivals();
  }

  private track(a: Animation, into: Set<Animation>) {
    into.add(a);
    const drop = () => { into.delete(a); };
    a.finished.then(drop, drop);
    if (into === this.loops && (!this.inView || document.hidden)) a.pause();
    return a;
  }
  /** A wait that freezes with the loops: an animation with no target, so a rest can pause out of view. */
  private wait(ms: number, into: Set<Animation>) {
    return this.track(new Animation(new KeyframeEffect(null, [], { duration: Math.max(1, ms) }), document.timeline), into).finished.then((a) => { a.cancel(); });
  }
  private playing(a: Animation) { a.play(); return a; }

  /** A small overlay the size of one line, never the figure's (1.14), placed in the ink after the lines and before the labels. */
  private overlay(l: GLine, pad: number, cls: string): { svg: SVGSVGElement; d: string; pts: Pt[] } | null {
    const ink = this.host.fig.querySelector(`.${this.host.P}-ink`);
    const svg = ink?.querySelector(`.${this.host.P}-svg`);
    if (!ink || !svg) return null;
    const tk = this.host.tokens();
    const pts = trimmed(l, tk?.head ?? 8);
    const b = boundsOf(pts, pad);
    const el = svgEl("svg", { class: `${this.host.P}-${cls}`, width: b.r - b.l, height: b.b - b.t, viewBox: `${b.l} ${b.t} ${b.r - b.l} ${b.b - b.t}`, "aria-hidden": "true", focusable: "false" }) as SVGSVGElement;
    el.style.left = `${b.l}px`;
    el.style.top = `${b.t}px`;
    const after = this.defs ?? svg;
    let at: Element = after;
    while (at.nextElementSibling && !at.nextElementSibling.classList.contains(`${this.host.P}-label`)) at = at.nextElementSibling;
    at.after(el);
    return { svg: el, d: pathD(pts, l.from === l.to ? tk?.radiusXs ?? 4 : tk?.radius ?? 8), pts };
  }

  /** How much of a line shows: its length to the head's base, less any label plate on it. */
  private visible(l: GLine, pts: Pt[]) {
    const geo = this.host.geo();
    let plates = 0;
    for (const lab of geo?.labels ?? []) if (lab.i === l.i && lab.on) {
      // A plate on a run: along a horizontal run it takes its width, along a vertical one its height.
      const cy = (lab.box.t + lab.box.b) / 2;
      const horiz = pts.some((p, k) => k > 0 && Math.abs(p.y - pts[k - 1]!.y) < 0.5 && Math.abs(cy - p.y) < 1.5);
      plates += horiz ? lab.box.r - lab.box.l : lab.box.b - lab.box.t;
    }
    return lengthOf(pts) - plates;
  }

  private flow(geo: Geo, i: number) {
    const l = geo.lines.find((x) => x.i === i);
    if (!l) return;
    const tk = this.host.tokens();
    let made = this.flowEls.get(i);
    if (!made) {
      // The cuts stop space-1 short of the line's end, so a head is never cut off its shaft (1.6).
      const space1 = tk?.space("1") ?? 4;
      const o = this.overlay({ ...l, pts: trimmed(l, space1) }, l.width + 2, "flow");
      if (!o) return;
      // A flow line needs 48px of visible line: four periods. A shorter one stays solid at this layout.
      if (this.visible(l, trimmed(l, tk?.head ?? 8)) < 48) { o.svg.remove(); return; }
      const cut = tk?.cut ?? 2;
      svgEl("path", { d: o.d, "stroke-width": l.width + 2, "stroke-dasharray": `${cut} ${this.t.flowPeriod - cut}` }, o.svg);
      made = o.svg;
      this.flowEls.set(i, made);
    }
    made.style.display = "";
    const path = made.firstElementChild as SVGGeometryElement;
    const period = this.t.flowPeriod;
    // Cuts of size-cut in the ground colour every size-diagram-flow, marching toward the head at speed-diagram-flow on ease-linear.
    this.track(path.animate([{ strokeDashoffset: "0px" }, { strokeDashoffset: `${-period}px` }], { duration: (period / this.t.flow) * 1000, iterations: Infinity, easing: "linear" }), this.loops);
  }

  private edgeFor(from: string, to: string): GLine | undefined {
    const m = this.host.model();
    const e = m.edges.find((x) => x.from === from && x.to === to);
    return e ? this.host.geo()?.lines.find((l) => l.i === e.i) : undefined;
  }
  private node(id: string) { return this.host.fig.querySelector<HTMLElement>(`.${this.host.P}-node[data-node="${CSS.escape(id)}"]`); }

  /** A card's arrival step (1.10): its rim diagram-hit, the focal card's fill and edge diagram-focal-hit, in over duration-slower, out over three quarters of it. */
  private arrive(el: Element | null) {
    if (!el || this.traced()) return;
    clearTimeout(this.arrivals.get(el));
    el.removeAttribute("data-arrival-out");
    el.setAttribute("data-arrival", "");
  }
  private depart(el: Element | null) {
    if (!el || !el.hasAttribute("data-arrival")) return;
    el.removeAttribute("data-arrival");
    el.setAttribute("data-arrival-out", "");
    this.arrivals.set(el, window.setTimeout(() => { el.removeAttribute("data-arrival-out"); this.arrivals.delete(el); }, this.t.slower * 0.75));
  }
  private clearArrivals() {
    this.host.fig.querySelectorAll("[data-arrival], [data-arrival-out]").forEach((el) => { el.removeAttribute("data-arrival"); el.removeAttribute("data-arrival-out"); });
    for (const timer of this.arrivals.values()) clearTimeout(timer);
    this.arrivals.clear();
  }

  private async pulse(gen: number, route: string[]) {
    const tk = this.host.tokens();
    while (gen === this.loopGen) {
      for (let k = 1; k < route.length; k++) {
        const l = this.edgeFor(route[k - 1]!, route[k]!);
        if (!l || gen !== this.loopGen) return;
        let el = this.beadEls.get(l.i);
        if (!el) {
          const o = this.overlay(l, l.width + 2, "bead");
          if (!o) return;
          svgEl("path", { d: o.d, "stroke-width": l.width + 2 * (tk?.hair ?? 1) }, o.svg);
          el = o.svg;
          this.beadEls.set(l.i, el);
        }
        el.style.display = "";
        const path = el.firstElementChild as SVGGeometryElement;
        const len = path.getTotalLength();
        // A solid segment of size-diagram-bead, never more than two fifths of the line showing (1.7); it leaves from under the source card's edge
        // and is taken in at the line's end, at speed-diagram-pulse.
        const bead = Math.min(this.t.bead, 0.4 * this.visible(l, trimmed(l, tk?.head ?? 8)));
        path.setAttribute("stroke-dasharray", `${bead} ${len + bead}`);
        await this.track(path.animate([{ strokeDashoffset: `${bead}px` }, { strokeDashoffset: `${-len}px` }], { duration: ((len + bead) / this.t.pulse) * 1000, easing: "linear", fill: "forwards" }), this.loops).finished;
        if (gen !== this.loopGen) return;
        el.style.display = "none";
        const card = this.node(route[k]!);
        this.arrive(card);
        await this.wait(this.t.rest, this.loops);
        this.depart(card);
      }
      if (gen !== this.loopGen) return;
      await this.wait(this.t.pause, this.loops);
    }
  }

  /** The one dot (1.8): an HTML element moved along offset-path, which is exact here because a diagram is never scaled through a viewBox. */
  private dotEl(): HTMLElement | null {
    const ink = this.host.fig.querySelector(`.${this.host.P}-ink`);
    if (!ink) return null;
    if (!this.dot || !this.dot.isConnected || this.dot.parentElement !== ink) {
      this.dot?.remove();
      this.dot = document.createElement("span");
      this.dot.className = `${this.host.P}-packet`;
      this.dot.setAttribute("aria-hidden", "true");
      const svg = ink.querySelector(`.${this.host.P}-svg`);
      let at: Element | null = svg;
      while (at?.nextElementSibling && !at.nextElementSibling.classList.contains(`${this.host.P}-label`)) at = at.nextElementSibling;
      if (at) at.after(this.dot); else ink.prepend(this.dot);
    }
    return this.dot;
  }

  /** One leg: the dot appears at the source's port, travels on ease-in-out, stops space-1 short of the line's end and is taken in as the stop arrives. */
  private async leg(l: GLine, into: Set<Animation>, gen: () => boolean, stops: Array<Element | null>) {
    const tk = this.host.tokens();
    const dot = this.dotEl();
    if (!dot) return;
    const pts = trimmed(l, (tk?.head ?? 8) + (tk?.space("1") ?? 4));
    const d = pathD(pts, l.from === l.to ? tk?.radiusXs ?? 4 : tk?.radius ?? 8);
    dot.style.offsetPath = `path("${d}")`;
    dot.style.display = "";
    this.dotOwner = into === this.loops ? "loop" : "run";
    const len = lengthOf(pts);
    const t = this.t;
    this.track(dot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.base, easing: t.out, fill: "both" }), into);
    await this.track(dot.animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }], { duration: clamp((len / t.packet) * 1000, t.legMin, t.legMax), easing: t.inOut, fill: "forwards" }), into).finished;
    if (!gen()) return;
    for (const s of stops) this.arrive(s);
    await this.track(dot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.base, easing: t.in, fill: "forwards" }), into).finished;
    for (const a of dot.getAnimations()) a.cancel();
    dot.style.display = "none";
    this.dotOwner = null;
    if (!gen()) return;
    await this.wait(t.rest, into);
    for (const s of stops) this.depart(s);
  }

  private async packetRun(path: string[], into: Set<Animation>, gen: () => boolean) {
    for (let k = 1; k < path.length; k++) {
      const l = this.edgeFor(path[k - 1]!, path[k]!);
      if (!l || !gen()) return;
      await this.leg(l, into, gen, [this.node(path[k]!)]);
    }
  }

  private async repeat(gen: number, path: string[]) {
    const live = () => gen === this.loopGen;
    while (live()) {
      this.inFlight = true;
      try { await this.packetRun(path, this.loops, live); } finally { this.inFlight = false; }
      if (!live()) return;
      await this.wait(this.t.repeat, this.loops);
    }
  }

  // ---- What the app and the reader start: a send, and the sequence's run (1.8, 1.10, 1.11) ----

  sendValue = (value: number | string | undefined) => {
    if (!this.lastSend) { this.lastSend = { v: value }; return; }
    if (value === undefined || value === this.lastSend.v) return;
    this.lastSend = { v: value };
    this.send();
  };

  private send() {
    const m = this.host.model();
    const path = m.motion.packet?.path;
    if (!m.motion.animated || !path || !this.hasLines()) return;
    // One mover a figure: a second send while a dot is in flight waits for it; one may wait, and further ones are dropped.
    if (this.inFlight) { this.waiting = true; return; }
    const modes = this.modes();
    if (modes.held || modes.reduce) {
      // Nothing sends itself under the hold, and nothing travels under reduced motion: the last stop takes its arrival step for the rest.
      const stop = this.node(path[path.length - 1]!);
      this.arrive(stop);
      window.setTimeout(() => this.depart(stop), this.t.rest);
      return;
    }
    if (this.looping && m.motion.packet?.repeat) return;
    this.inFlight = true;
    const gen = ++this.runGen;
    this.packetRun(path, this.runAnims, () => gen === this.runGen).catch((e) => { if (!aborted(e)) throw e; }).finally(() => {
      this.inFlight = false;
      if (this.waiting && gen === this.runGen) { this.waiting = false; this.send(); }
    });
  }

  toggleRun = () => {
    if (this.runAt >= 0) { this.stopRun(); this.publish(); return; }
    // It settles a running entrance first. It runs under the hold.
    settleEntrance(this.host.fig);
    this.playRun(0);
    this.publish();
  };

  private stopRun() {
    this.runGen++;
    this.runAt = -1;
    for (const a of this.runAnims) a.cancel();
    this.runAnims.clear();
    if (this.dot && this.dotOwner === "run") { this.dot.style.display = "none"; this.dotOwner = null; }
    if (!this.looping) this.inFlight = false;
    if (!this.looping) this.clearArrivals();
    else this.host.fig.querySelectorAll(`.${this.host.P}-msg[data-arrival]`).forEach((el) => el.removeAttribute("data-arrival"));
  }

  /** The run: a packet through every message in order, each arrow a leg; at each arrival the number lifts and the receiver's head steps (1.10). */
  private playRun(from: number) {
    const geo = this.host.geo();
    if (!geo?.lines.length) return;
    for (const a of this.runAnims) a.cancel();
    this.runAnims.clear();
    const gen = ++this.runGen;
    const live = () => gen === this.runGen;
    const lines = this.ordered(geo);
    const msgs = this.host.fig.querySelectorAll(`.${this.host.P}-msg`);
    this.runAt = from;
    const go = async () => {
      for (let k = from; k < lines.length; k++) {
        if (!live()) return;
        this.runAt = k;
        const l = lines[k]!;
        const stops = [msgs[k] ?? null, this.node(l.to)];
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
          // Reduced motion: no traveller; each number lifts and each participant steps in turn, on the same schedule. Colour only.
          const tk = this.host.tokens();
          const len = lengthOf(trimmed(l, (tk?.head ?? 8) + (tk?.space("1") ?? 4)));
          await this.wait(clamp((len / this.t.packet) * 1000, this.t.legMin, this.t.legMax) + this.t.base, this.runAnims);
          if (!live()) return;
          for (const s of stops) this.arrive(s);
          await this.wait(this.t.rest, this.runAnims);
          for (const s of stops) this.depart(s);
        } else await this.leg(l, this.runAnims, live, stops);
      }
      if (live()) { this.runAt = -1; this.publish(); }
    };
    go().catch((e) => { if (!aborted(e)) throw e; });
  }
}

/**
 * What a development build throws on (DECISIONS 292, 4.1): an id in the pulse or the packet's path that no node has, two neighbouring ids no line joins in
 * that direction, both a pulse and a packet, flow on a dashed line, and flow on a line of the mover's route. And what it warns on: a flow line with no
 * label. Here, and not in the still engine, because only an animated figure reads them.
 */
export function motionErrors(m: Model): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { pulse, packet } = m.motion;
  if (pulse && packet) errors.push("a figure names both a pulse and a packet: it has one mover at most");
  const path = pulse ?? packet?.path;
  const what = pulse ? "pulse" : "packet";
  const onPath = new Set<number>();
  if (path) {
    for (const id of path) if (!m.byId.has(id)) errors.push(`the ${what} names ${id}, which is not a node`);
    for (let k = 1; k < path.length; k++) {
      const e = m.edges.find((x) => x.from === path[k - 1] && x.to === path[k]);
      if (!e) errors.push(`the ${what} goes from ${path[k - 1]} to ${path[k]}, and no line joins them in that direction`);
      else onPath.add(e.i);
    }
  }
  for (const e of m.edges) {
    if (!e.flow) continue;
    if (e.kind === "dashed") errors.push(`the line from ${e.from} to ${e.to} is dashed and flows: flow is on a main or plain line only`);
    if (onPath.has(e.i)) errors.push(`the line from ${e.from} to ${e.to} flows and is on the ${what}'s route: flow never runs on a line the mover travels`);
    if (!e.label) warnings.push(`the line from ${e.from} to ${e.to} flows but has no label: motion never carries a fact alone, so its label says it is a stream`);
  }
  return { errors, warnings };
}

/** Attaches motion to one animated figure. The host calls `redrawn` after each new drawing, `changed` after new data, and `destroy` when done. */
export function attachMotion(host: MotionHost): MotionController {
  return new Figure(host);
}
