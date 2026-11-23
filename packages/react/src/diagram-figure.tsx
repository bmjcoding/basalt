import * as React from "react";

import { Kbd } from "./kbd";
import { useShortcutsVisible } from "./keyboard";
import { inLevel, usePanelLevel } from "./layers";
import {
  applyTrace, buildModel, tapTrace, entranceDrawn, figureKey, figureList, figureTree, hasStops, hintEntries, keyTarget, measureFigure, settleEntrance, syncAttributes, toHtml,
} from "./diagram-core";
import type { DiagramLegend, DiagramMotion, DiagramSpec, Dyn, Measured, Model, VNode } from "./diagram-core";
import type { MotionController } from "./diagram-motion-core";

type MotionModule = typeof import("./diagram-motion");
let motionLoading: Promise<MotionModule> | undefined;
/** The motion code (DECISIONS 292, 2.6): a module of its own, loaded the first time a figure is animated, so a still figure never pays for it. */
const loadMotion = () => (motionLoading ??= import("./diagram-motion").catch((error) => { motionLoading = undefined; throw error; }));

type ViewerModule = typeof import("./diagram-viewer");
let viewerLoading: Promise<ViewerModule> | undefined;
/** The viewer (DECISIONS 310, 9.13): a module of its own, with the Dialog it needs, loaded at the Expand button's first hover, focus or touch. */
const loadViewer = () => (viewerLoading ??= import("./diagram-viewer").catch((error) => { viewerLoading = undefined; throw error; }));

// The figure every diagram shares (DECISIONS 281): the title, the drawing, the key, the key hint, the required summary and "View as list".
// Not exported from the package: each of the five diagrams is its own module on top of it. The markup is the engine's tree, so it is the
// HTML skill's markup too; the drawing is measured before the first paint and again when the figure's width changes or its fonts arrive.

export interface DiagramFigureProps extends Omit<React.ComponentProps<"figure">, "children" | "title"> {
  /** What the diagram shows. Required: it names the figure and its drawing. */
  title: string;
  /** The heading level of the title (default 3); the list's sub-headings are one level under it. */
  heading?: 2 | 3 | 4 | 5 | 6;
  /** Where it came from, under the title. */
  source?: React.ReactNode;
  /** Required. The sentence under the drawing that says what it shows. */
  summary: React.ReactNode;
  /** The words for the marks. The key is built from what is drawn; main, dashed and the focal node must have words when drawn. */
  legend?: DiagramLegend;
  /**
   * `"still"` (the default) is the drawing as it is, with no motion code loaded. `"animated"` (DECISIONS 292) draws each line once when the figure
   * comes into view, every word at rest, and runs whichever of flow, a pulse or a packet the data names, with "Pause animations" in the foot. A
   * reduced-motion or forced-colours figure is still. Motion never carries a fact alone: the words say what moves.
   */
  motion?: DiagramMotion;
  /**
   * `true` (the default) puts "Expand" in the foot, after "View as list" (DECISIONS 310): it opens the viewer, a dialog that holds the drawn layout,
   * where the reader zooms (from Fit or 100% to 400%) and pans it. `false` leaves both out. Before script there is no button: it does nothing without it.
   */
  zoom?: boolean;
  /** `"first-visit"` (DECISIONS 306, 1.5): an animated figure's entrance plays until it has played once on this page; later visits are at rest. Needs an `id`. */
  entrance?: "always" | "first-visit";
}

const P = "basalt-diagram";
/** What the viewer is handed (diagram-viewer.tsx): this component and the engine, so its chunk holds no second copy of either. Built at the first open. */
let kitMade: import("./diagram-viewer").ViewerKit | undefined;
const kitOf = () => (kitMade ??= { Figure: DiagramFigure, Kbd, buildModel, figureKey, figureList, hintEntries, toHtml, inLevel, measureFigure });
declare const process: { env: { NODE_ENV?: string } };

const CAMEL: Record<string, string> = { class: "className", tabindex: "tabIndex", for: "htmlFor", viewbox: "viewBox" };
function styleObject(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(";")) {
    const at = part.indexOf(":");
    if (at > 0) out[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  return out;
}

/**
 * The engine's tree as React elements; slots are React's own, the ink is set as HTML (it is the same string the skill writes). `ink` is one object for one
 * string: React writes the HTML again whenever the object changes, and the motion module's overlays and masks live inside it, so a render that draws the
 * same lines must hand React the same object.
 */
function toReact(v: VNode, slots: Record<string, React.ReactNode>, ink: { __html: string }, root?: Record<string, unknown>): React.ReactNode {
  if (typeof v === "string") return v;
  if ("slot" in v) return slots[v.slot] ?? null;
  const props: Record<string, unknown> = {};
  for (const [k, value] of Object.entries(v.a)) {
    if (value === undefined || value === null || value === false) continue;
    if (k === "style") props.style = styleObject(String(value));
    else props[CAMEL[k] ?? k] = value === true ? (k === "hidden" ? true : "") : value;
  }
  if (typeof v.a.class === "string" && v.a.class.endsWith("-ink")) {
    props.dangerouslySetInnerHTML = ink;
    return React.createElement(v.t, props);
  }
  if (root) Object.assign(props, root, { className: [props.className, root.className].filter(Boolean).join(" "), style: { ...(props.style as object), ...(root.style as object) } });
  return React.createElement(v.t, props, ...v.c.map((c) => toReact(c, slots, ink)));
}

let warned: Set<string> | undefined;
function warnOnce(component: string, message: string) {
  warned ??= new Set();
  const key = `${component}: ${message}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`Basalt ${key}`);
}

/** The viewer's own figure (DECISIONS 310, 9.3): laid out and measured by the viewer, its drawing alone shown. */
export interface DiagramViewerMode {
  /** Lays the figure out (diagram-zoom-core's measureViewerFigure, with this module's engine). */
  measure: (fig: HTMLElement, m: Model, P: string, base: string, current: Dyn, apply: (dyn: Dyn) => void, warn?: (s: string) => void) => Measured;
  /** The words the keys sentence ends with. */
  keys: string;
  /** After every layout: what was measured, and the figure. */
  onMeasured: (measured: Measured, fig: HTMLElement) => void;
}

export interface DiagramFigureInternalProps extends DiagramFigureProps {
  spec: DiagramSpec;
  component: string;
  /** Internal: the figure is the viewer's (diagram-viewer.tsx). */
  viewer?: DiagramViewerMode;
}

export function DiagramFigure({ spec, component, viewer, zoom = true, entrance: _entrance, title: _title, heading: _heading, legend: _legend, motion: _motion, source, summary, className, style, onKeyDown, onFocus, onBlur, onPointerOver, onPointerLeave, ref: callerRef, ...props }: DiagramFigureInternalProps) {
  const base = `dg${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const level = usePanelLevel();
  // The key hint is a data-kbd-hint legend, hidden on touch until a hardware key is pressed: this installs the listener that reveals it.
  useShortcutsVisible();
  // The development checks (placement, groups, the key's words) cost production nothing: a bundler that sets NODE_ENV drops them.
  // Right to left (DECISIONS 306, 1.7): no prop; the figure follows its computed direction, read as it is measured, and the model is mirrored.
  const [rtl, setRtl] = React.useState(false);
  const model = React.useMemo(() => buildModel(spec, { checks: process.env.NODE_ENV !== "production", rtl }), [spec, rtl]);
  const animated = model.motion.animated;
  const figRef = React.useRef<HTMLElement>(null);
  // The figure's own ref, which measuring reads, and the caller's, both set: a caller's ref never replaces the figure's.
  const setRef = React.useCallback((el: HTMLElement | null) => {
    figRef.current = el;
    if (typeof callerRef === "function") callerRef(el);
    else if (callerRef) callerRef.current = el;
  }, [callerRef]);
  const [dyn, setDyn] = React.useState<Dyn>({});
  const [ink, setInk] = React.useState("");
  const inkHtml = React.useMemo(() => ({ __html: ink }), [ink]);
  const measured = React.useRef<Measured | null>(null);
  const dynRef = React.useRef(dyn);
  dynRef.current = dyn;
  const [motionModule, setMotionModule] = React.useState<MotionModule | null>(null);
  // A development error (DECISIONS 292, 4.1), checked once the motion code is here: a mover's route that does not exist, two movers, flow on a dashed
  // line or on the mover's route. A flow line with no label is a warning.
  if (process.env.NODE_ENV !== "production" && motionModule && animated) {
    const { errors, warnings } = motionModule.motionErrors(model);
    if (errors.length) throw new Error(`Basalt ${component}: ${errors.join("; ")}`);
    for (const w of warnings) warnOnce(component, w);
  }
  const [controller, setController] = React.useState<MotionController | null>(null);
  const modelRef = React.useRef(model);
  modelRef.current = model;
  const [focusTrace, setFocusTrace] = React.useState<string | null>(null);
  const [hoverTrace, setHoverTrace] = React.useState<string | null>(null);
  // A trace on touch (DECISIONS 306, 1.5), the third source after keyboard focus. "On touch" is the media's, or a figure that has taken a touch tap.
  const [touchTrace, setTouchTrace] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);
  const options = React.useMemo(() => ({ prefix: P, base, level, hasSource: source !== undefined && source !== null, hiddenClass: "basalt-visually-hidden", viewer: viewer?.keys }), [base, level, source, viewer]);

  // Development only: a bundler that sets NODE_ENV to production drops this block, strings included.
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") for (const w of model.warnings) warnOnce(component, w);
    if (process.env.NODE_ENV !== "production" && model.motion.firstVisit && !props.id) warnOnce(component, 'entrance="first-visit" needs an id: without one the entrance plays on every visit');
  }, [model, component, props.id]);

  const measure = React.useCallback(() => {
    const fig = figRef.current;
    if (!fig) return;
    const dirRtl = getComputedStyle(fig).direction === "rtl";
    if (dirRtl !== rtl) { setRtl(dirRtl); return; }
    const warn = process.env.NODE_ENV !== "production" ? (message: string) => warnOnce(component, message) : undefined;
    const apply = (d: Dyn) => syncAttributes(fig, figureTree(model, d, options));
    const result = (viewer ? viewer.measure : measureFigure)(fig, model, P, base, dynRef.current, apply, warn);
    measured.current = result;
    // The same layout is the same state: a measure that changes nothing renders nothing.
    // (A layout is plain data that the engine builds in one order, so its text is a fair test.)
    if (JSON.stringify(dynRef.current) !== JSON.stringify(result.dyn)) { dynRef.current = result.dyn; setDyn(result.dyn); }
    setInk(result.ink);
    // A layout with no stops traces nothing: a pointer resting on a node as the figure narrows into one leaves no trace behind.
    if (!hasStops(model, result.dyn)) { setHoverTrace(null); setTouchTrace(null); }
    // A figure hidden (the viewer's list is open) was not measured: the viewer keeps the drawing's size and place it had.
    if (viewer && result.tokens) viewer.onMeasured(result, fig);
  }, [model, base, options, component, viewer, rtl]);

  // Measured before the first paint, then whenever the figure's width changes or the real faces arrive.
  React.useLayoutEffect(() => {
    measure();
    const fig = figRef.current;
    if (!fig) return undefined;
    let width = fig.clientWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (Math.abs(fig.clientWidth - width) < 0.5) return;
      width = fig.clientWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(fig);
    let live = true;
    document.fonts?.ready.then(() => { if (live) measure(); });
    // A card's mark keeps its seat's padding out of forced colours, where no mark is drawn: the mode changing is a new measure (DECISIONS 292, 2.7).
    const forced = matchMedia("(forced-colors: active)");
    const marks = model.nodes.some((n) => n.mark);
    if (marks) forced.addEventListener("change", measure);
    return () => { live = false; observer.disconnect(); cancelAnimationFrame(frame); if (marks) forced.removeEventListener("change", measure); };
  }, [measure, model]);

  const trace = focusTrace ?? touchTrace ?? hoverTrace;
  React.useLayoutEffect(() => {
    const fig = figRef.current;
    if (fig) applyTrace(fig, P, measured.current?.geo ?? null, measured.current?.tokens ?? null, base, trace);
  }, [trace, ink, base]);
  // In the frame an animated figure's lines are first drawn it is marked pending, before any paint (DECISIONS 292, 1.5); the module, once loaded,
  // follows the lines each time they are drawn again. What it follows is the drawing itself, not the string: if React wrote the ink again for any reason
  // (a remount, the faces arriving with the same lines), the reveal and the loops are built again on the new elements.
  const drawn = React.useRef<{ svg: Element | null; controller: MotionController | null } | null>(null);
  // The motion code failed to load. A figure hidden when it failed (inside a closed disclosure, an unselected tab) had no lines and no entrance to settle
  // then: the lines it draws when it is shown are settled in the frame they are drawn, so they are never left pending.
  const motionFailed = React.useRef(false);
  React.useLayoutEffect(() => {
    const fig = figRef.current;
    if (!fig || !animated || !measured.current?.tokens) return;
    const svg = fig.querySelector(`.${P}-ink > .${P}-svg`);
    if (drawn.current && drawn.current.svg === svg && drawn.current.controller === controller) return;
    drawn.current = { svg, controller };
    entranceDrawn(fig, Boolean(measured.current.geo?.lines.length));
    if (motionFailed.current) settleEntrance(fig);
    controller?.redrawn();
  });
  React.useEffect(() => {
    if (!animated) return undefined;
    let live = true;
    motionFailed.current = false;
    // If the motion code cannot load, the figure settles: every line whole, as still, now and whenever its lines are drawn later.
    loadMotion().then((mod) => { if (live) setMotionModule(() => mod); }, () => {
      if (!live) return;
      motionFailed.current = true;
      const fig = figRef.current;
      if (fig) settleEntrance(fig);
    });
    return () => { live = false; };
  }, [animated]);
  React.useLayoutEffect(() => {
    const fig = figRef.current;
    if (!fig || !animated || !motionModule) return undefined;
    const made = motionModule.attachMotion({ fig, P, base, model: () => modelRef.current, geo: () => measured.current?.geo ?? null, tokens: () => measured.current?.tokens ?? null });
    setController(made);
    return () => { made.destroy(); setController(null); };
  }, [animated, motionModule, base]);
  // New data is a different figure: its entrance settles if its lines are not the same lines (1.5), and its mover follows the new route.
  React.useEffect(() => { controller?.changed(); }, [model, controller]);
  const sendValue = model.motion.packet?.send;
  React.useEffect(() => { controller?.sendValue(sendValue); }, [sendValue, controller]);
  const settle = () => { if (animated && figRef.current) settleEntrance(figRef.current); };

  // The viewer (DECISIONS 310): "Expand" exists once script runs. Its module loads at the button's first hover, focus or touch; a press before it has
  // arrived makes the button busy until the dialog opens. While the viewer is open the page's figure holds its loops and settles a running entrance (9.7).
  const [scripted, setScripted] = React.useState(false);
  const [onTouch, setOnTouch] = React.useState(false);
  React.useEffect(() => { if (!viewer) { setScripted(true); setOnTouch(matchMedia("(hover: none), (pointer: coarse)").matches); } }, [viewer]);
  const expandRef = React.useRef<HTMLButtonElement>(null);
  const [viewerModule, setViewerModule] = React.useState<ViewerModule | null>(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [opening, setOpening] = React.useState(false);
  const fetchViewer = React.useCallback(() => loadViewer().then((mod) => { setViewerModule(() => mod); return mod; }, (error: unknown) => {
    if (process.env.NODE_ENV !== "production") warnOnce(component, `the viewer could not load (${String(error)}); "Expand" stays and does nothing`);
    return null;
  }), [component]);
  const preloadViewer = () => { if (!viewerModule) void fetchViewer(); };
  const openViewer = () => {
    if (opening) return;
    settle();
    if (viewerModule) { setViewerOpen(true); return; }
    setOpening(true);
    void fetchViewer().then((mod) => { setOpening(false); if (mod) setViewerOpen(true); });
  };
  const closeViewer = React.useCallback(() => setViewerOpen(false), []);
  React.useLayoutEffect(() => {
    const fig = figRef.current;
    if (!fig || viewer) return;
    fig.toggleAttribute("data-viewing", viewerOpen);
    if (viewerOpen && animated) settleEntrance(fig);
  }, [viewerOpen, viewer, animated]);

  const nodeOf = (target: EventTarget | null) => {
    const el = (target as HTMLElement | null)?.closest?.<HTMLElement>(`.${P}-node`);
    return el && figRef.current?.contains(el) ? el : null;
  };
  const stops = hasStops(model, dyn);

  const root = {
    ...props,
    ref: setRef,
    className,
    style,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(event);
      const node = nodeOf(event.target);
      if (!node || event.defaultPrevented) return;
      settle();
      // In the viewer Esc always closes the dialog, traced or not (9.8): the figure leaves it to the dialog.
      if (event.key === "Escape") { if (!viewer && (focusTrace || hoverTrace || touchTrace)) { event.preventDefault(); setFocusTrace(null); setHoverTrace(null); setTouchTrace(null); } return; }
      if (!stops) return;
      // The model is mirrored right to left, so the table is already physical.
      const to = keyTarget(model, node.dataset.node!, event.key, dynRef.current.layout === "drawn");
      if (!to) return;
      event.preventDefault();
      const next = { ...dynRef.current, stop: to };
      dynRef.current = next;
      setDyn(next);
      figRef.current?.querySelector<HTMLElement>(`.${P}-node[data-node="${CSS.escape(to)}"]`)?.focus({ preventScroll: false });
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      onFocus?.(event);
      const node = nodeOf(event.target);
      if (!node) return;
      settle();
      const id = node.dataset.node!;
      // Tracing follows the keyboard's focus (:focus-visible), so a press that focuses a node traces nothing.
      setFocusTrace(node.matches(":focus-visible") ? id : null);
      if (stops && dynRef.current.stop !== id) { const next = { ...dynRef.current, stop: id }; dynRef.current = next; setDyn(next); }
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      onBlur?.(event);
      const left = nodeOf(event.target);
      if (!left) return;
      if (!nodeOf(event.relatedTarget)) setFocusTrace(null);
      // A node kept as a stop in a stack with no stops stops being one once focus has left it.
      if (dynRef.current.keep === left.dataset.node) { const next = { ...dynRef.current, keep: undefined }; dynRef.current = next; setDyn(next); }
    },
    onPointerOver: (event: React.PointerEvent<HTMLElement>) => {
      onPointerOver?.(event);
      if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover)").matches) return;
      const node = nodeOf(event.target);
      if (node) settle();
      setHoverTrace(node && hasStops(model, dynRef.current) ? node.dataset.node! : null);
    },
    onPointerLeave: (event: React.PointerEvent<HTMLElement>) => { onPointerLeave?.(event); setHoverTrace(null); },
    "data-touch": !viewer && (onTouch || touched) ? "" : undefined,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      props.onClick?.(event as React.MouseEvent<HTMLElement>);
      const fig = figRef.current;
      if (!fig || event.defaultPrevented) return;
      const next = tapTrace(fig, P, event.nativeEvent, touchTrace);
      if (next === undefined) return;
      settle();
      setTouched(true);
      setTouchTrace(next);
    },
  };

  const toggle = (
    <button
      type="button"
      className="basalt-button basalt-diagram-toggle"
      data-variant="secondary"
      data-size="sm"
      aria-expanded={Boolean(dyn.open)}
      aria-controls={`${base}-list`}
      onClick={() => { settle(); const next = { ...dynRef.current, open: !dynRef.current.open, autoOpen: undefined }; dynRef.current = next; setDyn(next); }}
    >
      <span className="basalt-button-label">{dyn.open ? "Hide the list" : "View as list"}</span>
    </button>
  );
  const hint = hintEntries(model, dyn.layout === "drawn").map((entry) => (
    <span key={entry.words}>{entry.keys.map((k, i) => <React.Fragment key={k}>{i ? " " : null}<Kbd>{k}</Kbd></React.Fragment>)} {entry.words}</span>
  ));
  const tree = figureTree(model, dyn, options);
  // The viewer's figure shows its drawing alone: its head, key, hint and foot are the dialog's.
  if (viewer) return toReact(tree, { source, summary, hint: null, toggle: null }, inkHtml, root) as React.ReactElement;
  // The foot (1.9, and DECISIONS 310, 9.1): "View as list", "Expand", then the run button and "Pause animations", which the motion module draws when it has loaded.
  const Foot = motionModule?.MotionFoot;
  const expand = zoom && scripted ? (
    <>
      <button
        ref={expandRef}
        type="button"
        className="basalt-button basalt-diagram-expand"
        data-variant="secondary"
        data-size="sm"
        aria-haspopup="dialog"
        aria-busy={opening || undefined}
        data-busy={opening ? "" : undefined}
        data-loading={opening ? "" : undefined}
        onPointerEnter={preloadViewer}
        onFocus={preloadViewer}
        onTouchStart={preloadViewer}
        onClick={openViewer}
      >
        {/* Words only (a deviation from 9.1, the lead's call): Phosphor's icon cost every still figure 2.2 KB of six weights, and the core set draws no expand glyph. */}
        <span className="basalt-button-label">Expand</span>
        {opening ? <span className="basalt-button-spinner" aria-hidden="true"><span className="basalt-spinner" data-variant="ring" style={{ width: 16, height: 16 }}><svg viewBox="0 0 16 16" width={16} height={16} fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" /><path d="M8 1.75A6.25 6.25 0 0 1 14.25 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></span> : null}
      </button>
      {viewerOpen && viewerModule ? (
        <viewerModule.DiagramViewer kit={kitOf()} spec={spec} component={component} source={source} summary={summary} opener={expandRef} onClose={closeViewer} />
      ) : null}
    </>
  ) : null;
  // "Clear highlight" (1.5): last in the foot, mounted whenever the figure is on touch and can be traced, aria-disabled until a trace is up.
  const clear = !viewer && (onTouch || touched) && ink ? (
    <button type="button" className="basalt-button basalt-diagram-clear" data-variant="secondary" data-size="sm" aria-disabled={touchTrace ? undefined : true} onClick={() => { if (touchTrace) setTouchTrace(null); }}>
      <span className="basalt-button-label">Clear highlight</span>
    </button>
  ) : null;
  const foot = <>{toggle}{expand}{Foot && controller ? <Foot controller={controller} /> : null}{clear}</>;
  return toReact(tree, { source, summary, hint, toggle: foot }, inkHtml, root) as React.ReactElement;
}
