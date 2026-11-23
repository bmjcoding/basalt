import * as React from "react";

import { Kbd } from "./kbd";
import { useShortcutsVisible } from "./keyboard";
import { usePanelLevel } from "./layers";
import {
  applyTrace, buildModel, figureTree, hasStops, hintEntries, keyTarget, measureFigure, syncAttributes,
} from "./diagram-core";
import type { DiagramLegend, DiagramSpec, Dyn, Measured, VNode } from "./diagram-core";

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
}

const P = "basalt-diagram";
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

/** The engine's tree as React elements; slots are React's own, the ink is set as HTML (it is the same string the skill writes). */
function toReact(v: VNode, slots: Record<string, React.ReactNode>, ink: string, root?: Record<string, unknown>): React.ReactNode {
  if (typeof v === "string") return v;
  if ("slot" in v) return slots[v.slot] ?? null;
  const props: Record<string, unknown> = {};
  for (const [k, value] of Object.entries(v.a)) {
    if (value === undefined || value === null || value === false) continue;
    if (k === "style") props.style = styleObject(String(value));
    else props[CAMEL[k] ?? k] = value === true ? (k === "hidden" ? true : "") : value;
  }
  if (typeof v.a.class === "string" && v.a.class.endsWith("-ink")) {
    props.dangerouslySetInnerHTML = { __html: ink };
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

export interface DiagramFigureInternalProps extends DiagramFigureProps {
  spec: DiagramSpec;
  component: string;
}

export function DiagramFigure({ spec, component, title: _title, heading: _heading, legend: _legend, source, summary, className, style, onKeyDown, onFocus, onBlur, onPointerOver, onPointerLeave, ref: callerRef, ...props }: DiagramFigureInternalProps) {
  const base = `dg${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const level = usePanelLevel();
  // The key hint is a data-kbd-hint legend, hidden on touch until a hardware key is pressed: this installs the listener that reveals it.
  useShortcutsVisible();
  // The development checks (placement, groups, the key's words) cost production nothing: a bundler that sets NODE_ENV drops them.
  const model = React.useMemo(() => buildModel(spec, { checks: process.env.NODE_ENV !== "production" }), [spec]);
  const figRef = React.useRef<HTMLElement>(null);
  // The figure's own ref, which measuring reads, and the caller's, both set: a caller's ref never replaces the figure's.
  const setRef = React.useCallback((el: HTMLElement | null) => {
    figRef.current = el;
    if (typeof callerRef === "function") callerRef(el);
    else if (callerRef) callerRef.current = el;
  }, [callerRef]);
  const [dyn, setDyn] = React.useState<Dyn>({});
  const [ink, setInk] = React.useState("");
  const measured = React.useRef<Measured | null>(null);
  const dynRef = React.useRef(dyn);
  dynRef.current = dyn;
  const [focusTrace, setFocusTrace] = React.useState<string | null>(null);
  const [hoverTrace, setHoverTrace] = React.useState<string | null>(null);
  const options = React.useMemo(() => ({ prefix: P, base, level, hasSource: source !== undefined && source !== null, hiddenClass: "basalt-visually-hidden" }), [base, level, source]);

  // Development only: a bundler that sets NODE_ENV to production drops this block, strings included.
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") for (const w of model.warnings) warnOnce(component, w);
  }, [model, component]);

  const measure = React.useCallback(() => {
    const fig = figRef.current;
    if (!fig) return;
    const warn = process.env.NODE_ENV !== "production" ? (message: string) => warnOnce(component, message) : undefined;
    const result = measureFigure(fig, model, P, base, dynRef.current, (d) => syncAttributes(fig, figureTree(model, d, options)), warn);
    measured.current = result;
    dynRef.current = result.dyn;
    setDyn(result.dyn);
    setInk(result.ink);
    // A layout with no stops traces nothing: a pointer resting on a node as the figure narrows into one leaves no trace behind.
    if (!hasStops(model, result.dyn)) setHoverTrace(null);
  }, [model, base, options, component]);

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
    return () => { live = false; observer.disconnect(); cancelAnimationFrame(frame); };
  }, [measure]);

  const trace = focusTrace ?? hoverTrace;
  React.useLayoutEffect(() => {
    const fig = figRef.current;
    if (fig) applyTrace(fig, P, measured.current?.geo ?? null, measured.current?.tokens ?? null, base, trace);
  }, [trace, ink, base]);

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
      if (event.key === "Escape") { if (focusTrace || hoverTrace) { event.preventDefault(); setFocusTrace(null); setHoverTrace(null); } return; }
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
      onClick={() => { const next = { ...dynRef.current, open: !dynRef.current.open, autoOpen: undefined }; dynRef.current = next; setDyn(next); }}
    >
      <span className="basalt-button-label">{dyn.open ? "Hide the list" : "View as list"}</span>
    </button>
  );
  const hint = hintEntries(model).map((entry) => (
    <span key={entry.words}>{entry.keys.map((k, i) => <React.Fragment key={k}>{i ? " " : null}<Kbd>{k}</Kbd></React.Fragment>)} {entry.words}</span>
  ));
  const tree = figureTree(model, dyn, options);
  return toReact(tree, { source, summary, hint, toggle }, ink, root) as React.ReactElement;
}
