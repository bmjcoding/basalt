import * as React from "react";

import { Kbd } from "./kbd";
import { useShortcutsVisible } from "./keyboard";
import { usePanelLevel } from "./layers";
import {
  applyTrace, buildModel, entranceDrawn, figureKey, figureList, figureTree, hasStops, hintEntries, keyTarget, measureFigure, settleEntrance, syncAttributes, toHtml,
} from "./diagram-core";
import type { DiagramLegend, DiagramMotion, DiagramSpec, Dyn, Measured, VNode } from "./diagram-core";
import type { MotionController } from "./diagram-motion-core";
import { ArrowsOutSimpleIcon } from "@phosphor-icons/react/dist/csr/ArrowsOutSimple";
import { Icon } from "./icon";

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
}

const P = "basalt-diagram";
/** What the viewer is handed (diagram-viewer.tsx): this component and the engine, so its chunk holds no second copy of either. Built at the first open. */
let kitMade: import("./diagram-viewer").ViewerKit | undefined;
const kitOf = () => (kitMade ??= { Figure: DiagramFigure, Kbd, buildModel, figureKey, figureList, hintEntries, toHtml });
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

/** The viewer's own figure (DECISIONS 310, 9.3): laid out at a width the viewer gives, its drawing alone shown, measured only at 100%. */
export interface DiagramViewerMode {
  /** The width it may be laid out at: the stage's inner width, never over the page row (`row`) unless its least drawn width is more. */
  avail: number;
  row: number;
  /** A stack is held at most this wide (`size-breakpoint-container`). */
  contain: number;
  /** The layer the figure is laid out in: its width is the layout width. */
  layer: () => HTMLElement | null;
  /** After every layout: what was measured, and the figure. */
  onMeasured: (measured: Measured, fig: HTMLElement) => void;
}

export interface DiagramFigureInternalProps extends DiagramFigureProps {
  spec: DiagramSpec;
  component: string;
  /** Internal: the figure is the viewer's (diagram-viewer.tsx). */
  viewer?: DiagramViewerMode;
}

export function DiagramFigure({ spec, component, viewer, zoom = true, title: _title, heading: _heading, legend: _legend, motion: _motion, source, summary, className, style, onKeyDown, onFocus, onBlur, onPointerOver, onPointerLeave, ref: callerRef, ...props }: DiagramFigureInternalProps) {
  const base = `dg${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const level = usePanelLevel();
  // The key hint is a data-kbd-hint legend, hidden on touch until a hardware key is pressed: this installs the listener that reveals it.
  useShortcutsVisible();
  // The development checks (placement, groups, the key's words) cost production nothing: a bundler that sets NODE_ENV drops them.
  const model = React.useMemo(() => buildModel(spec, { checks: process.env.NODE_ENV !== "production" }), [spec]);
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
  // The viewer's figure: the least width the engine was found to draw it at (0: none was found), for this data.
  const leastDrawn = React.useRef<number | undefined>(undefined);
  const leastFor = React.useRef<unknown>(null);
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
  const options = React.useMemo(() => ({ prefix: P, base, level, hasSource: source !== undefined && source !== null, hiddenClass: "basalt-visually-hidden", viewer: Boolean(viewer) }), [base, level, source, viewer]);

  // Development only: a bundler that sets NODE_ENV to production drops this block, strings included.
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") for (const w of model.warnings) warnOnce(component, w);
  }, [model, component]);

  const measure = React.useCallback(() => {
    const fig = figRef.current;
    if (!fig) return;
    const warn = process.env.NODE_ENV !== "production" ? (message: string) => warnOnce(component, message) : undefined;
    const apply = (d: Dyn) => syncAttributes(fig, figureTree(model, d, options));
    // The viewer's figure is laid out at the stage's width, never under its least drawn width (9.3); a stack it must hold is at most the container's width.
    const layer = viewer?.layer();
    if (leastFor.current !== model) { leastFor.current = model; leastDrawn.current = undefined; }
    const sizeTo = viewer && layer ? (least: number) => { layer.style.width = `${Math.max(leastDrawn.current ?? least, Math.min(viewer.avail, viewer.row))}px`; } : undefined;
    // The layer has no width of its own until the first layout: it starts at the stage's, so the figure can be measured.
    if (viewer && layer && !layer.style.width) layer.style.width = `${Math.min(viewer.avail, viewer.row)}px`;
    // The engine measures only at 100% (9.3): the zoom is taken off the layer while it measures and put back before anything paints.
    const zoomed = layer?.style.transform ?? "";
    if (layer && zoomed) layer.style.transform = "none";
    let result = measureFigure(fig, model, P, base, dynRef.current, apply, warn, sizeTo);
    // The figure's least drawn width is the first width the engine draws it at, which the token sum can undercount (a sequence's columns are measured, a
    // decision's diamond may be refused at a width). Found once by trying wider layouts, in steps of 16 and then by the pixel, up to half the row past it.
    if (viewer && layer && result.dyn.layout === "stacked" && leastDrawn.current === undefined && result.least !== undefined) {
      // A width counts when it draws twice running: measured from the stack, then again from its own drawn state, as every later measure is.
      const at = (w: number) => {
        layer.style.width = `${w}px`;
        const first = measureFigure(fig, model, P, base, result.dyn, apply);
        return first.dyn.layout === "drawn" ? measureFigure(fig, model, P, base, first.dyn, apply) : first;
      };
      const from = Math.max(result.least, Math.min(viewer.avail, viewer.row));
      const cap = Math.max(viewer.row, from) * 1.5;
      let found: number | undefined;
      for (let w = from + 16; w <= cap && found === undefined; w += 16) if (at(w).dyn.layout === "drawn") found = w;
      if (found !== undefined) for (let w = found - 15; w < found; w++) if (at(w).dyn.layout === "drawn") { found = w; break; }
      if (found !== undefined) { leastDrawn.current = found; result = at(found); }
      else leastDrawn.current = 0;
    }
    if (viewer && layer && result.dyn.layout === "stacked" && fig.clientWidth > viewer.contain) {
      layer.style.width = `${viewer.contain}px`;
      result = measureFigure(fig, model, P, base, result.dyn, apply, warn);
    }
    if (layer && zoomed) layer.style.transform = zoomed;
    measured.current = result;
    // The same layout is the same state: a measure that changes nothing renders nothing.
    // (A layout is plain data that the engine builds in one order, so its text is a fair test.)
    if (JSON.stringify(dynRef.current) !== JSON.stringify(result.dyn)) { dynRef.current = result.dyn; setDyn(result.dyn); }
    setInk(result.ink);
    // A layout with no stops traces nothing: a pointer resting on a node as the figure narrows into one leaves no trace behind.
    if (!hasStops(model, result.dyn)) setHoverTrace(null);
    if (viewer) viewer.onMeasured(result, fig);
  }, [model, base, options, component, viewer]);

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

  const trace = focusTrace ?? hoverTrace;
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
  React.useEffect(() => { if (!viewer) setScripted(true); }, [viewer]);
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
      if (event.key === "Escape") { if (!viewer && (focusTrace || hoverTrace)) { event.preventDefault(); setFocusTrace(null); setHoverTrace(null); } return; }
      if (!stops) return;
      const to = keyTarget(model, node.dataset.node!, event.key);
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
  const hint = hintEntries(model).map((entry) => (
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
        <Icon icon={ArrowsOutSimpleIcon} size={16} />
        <span className="basalt-button-label">Expand</span>
        {opening ? <span className="basalt-button-spinner" aria-hidden="true"><span className="basalt-spinner" data-variant="ring" style={{ width: 16, height: 16 }}><svg viewBox="0 0 16 16" width={16} height={16} fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" /><path d="M8 1.75A6.25 6.25 0 0 1 14.25 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></span> : null}
      </button>
      {viewerOpen && viewerModule ? (
        <viewerModule.DiagramViewer kit={kitOf()} spec={spec} component={component} source={source} summary={summary} opener={expandRef} onClose={closeViewer} />
      ) : null}
    </>
  ) : null;
  const foot = <>{toggle}{expand}{Foot && controller ? <Foot controller={controller} /> : null}</>;
  return toReact(tree, { source, summary, hint, toggle: foot }, inkHtml, root) as React.ReactElement;
}
