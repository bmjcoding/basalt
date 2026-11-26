import * as React from "react";

import { Button, IconButton } from "./button";
import type { DiagramActions } from "./diagram-actions";
import type { DiagramAction, DiagramFigureInternalProps, DiagramLayoutInfo, DiagramViewerMode } from "./diagram-figure";
import type { buildModel, DiagramSpec, figureKey, figureList, hintEntries, Measured, measureFigure, Model, toHtml } from "./diagram-core";
import { attachZoom, drawnSize, measureViewerFigure, revealIn, VIEWER_KEYS, viewerHint, viewerTextWidth } from "./diagram-zoom-core";
import type { ViewerMemo, ZoomController, ZoomState } from "./diagram-zoom-core";
import { createPortal } from "react-dom";

import { CloseGlyph } from "./glyphs/close";
import { MinusGlyph } from "./glyphs/minus";
import { PlusGlyph } from "./glyphs/plus";

// The diagram viewer (DECISIONS 301, part 9, as DECISIONS 310): "Expand" opens the figure's drawn layout in a dialog, where the reader zooms and pans it.
// The figure is drawn again from the same data, laid out once at 100% in real CSS pixels, and zoomed with one transform (diagram-zoom-core.ts). This module
// is loaded on demand by a figure's "Expand" (diagram-figure.tsx); it is not exported from the package. Its dialog is the form dialog's box and the sheet's head,
// body and foot, drawn on a native modal <dialog> as the HTML skill's is, not Base UI's: an import of Base UI's dialog from a chunk any figure can load widens the
// Base UI chunk every other component's bundle shares (Button alone grew by 1.8 KB), so the viewer brings no Base UI but the button's. The implementation hasn't
// been reviewed, and no seat has drawn, checked or given a position on part 9: every value is the decider's alone.

const P = "basalt-diagram";

/**
 * What the figure hands the viewer: its own component and the engine's functions. The viewer imports none of them, so its chunk holds the dialog, the
 * buttons and the zoom, and never a second copy of the engine.
 */
export interface ViewerKit {
  Figure: (props: DiagramFigureInternalProps) => React.ReactNode;
  Kbd: (props: { children?: React.ReactNode }) => React.ReactNode;
  buildModel: typeof buildModel;
  figureKey: typeof figureKey;
  figureList: typeof figureList;
  hintEntries: typeof hintEntries;
  toHtml: typeof toHtml;
  /** The figure's own surface-level context: the viewer's content is level 1, as a modal's is. */
  inLevel: (level: 1, children: React.ReactNode) => React.ReactNode;
  measureFigure: typeof measureFigure;
}

export interface DiagramViewerProps {
  kit: ViewerKit;
  /** An app's own actions, after "View as list" (all but those marked `inViewer: false`). */
  actions?: readonly DiagramAction[];
  /** Their component, loaded by the figure (diagram-actions.tsx): the viewer imports nothing for them. */
  Actions?: typeof DiagramActions;
  spec: DiagramSpec;
  component: string;
  source?: React.ReactNode;
  summary: React.ReactNode;
  /** "Expand": focus returns to it when the viewer closes. */
  opener: React.RefObject<HTMLButtonElement | null>;
  /**
   * The popup of the Basalt modal the figure sits in (layers.ts, ModalHost), or none on the page. Opened from a modal, the viewer is written into its popup:
   * at the end of the body it would be outside the modal, where everything is inert, and every control in it dead.
   */
  host?: React.RefObject<HTMLElement | null> | null;
  onClose: () => void;
}

const EMPTY: ZoomState = { zoom: 1, level: 100, fit: 1, min: 1, max: 4, atMin: false, atMax: false, atFit: true, listOpen: false };

/** A length token's value in CSS pixels, read from a probe the stage holds. */
const probeWidth = (stage: HTMLElement | null, which: string) => stage?.querySelector<HTMLElement>(`.${P}-probe[data-probe="${which}"]`)?.offsetWidth ?? 0;

export function DiagramViewer({ kit, actions, Actions, spec, component, source, summary, opener, host, onClose }: DiagramViewerProps) {
  const { Figure: DiagramFigure, Kbd, buildModel, figureKey, figureList, hintEntries, toHtml, inLevel, measureFigure } = kit;
  // The viewer's figure is still (9.7): no entrance, flow, mover or run, so no motion code is loaded for it.
  const still = React.useMemo<DiagramSpec>(() => ({ ...spec, motion: "still" }), [spec]);
  // An automatic figure's foot (its key hint) is read from a placed model: unplaced, every card is in one cell and the hint would say two arrows where the
  // drawing has rows and columns (the pixel review's check on the viewer's hint).
  // Its list sits under the dialog's h2, whatever the page's heading: its sub-headings are h3 and its group lines h4 (the viewer's outline). The heading is
  // the model's alone; the figure the stage draws keeps the spec's.
  const model = React.useMemo<Model>(() => buildModel({ ...still, heading: 2 }, { placement: Array.isArray(still.placement) ? still.placement[0] : still.placement }), [still]);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const sizerRef = React.useRef<HTMLDivElement>(null);
  const layerRef = React.useRef<HTMLDivElement>(null);
  const statusRef = React.useRef<HTMLSpanElement>(null);
  const zoomRef = React.useRef<ZoomController | null>(null);
  const [zoom, setZoom] = React.useState<ZoomState>(EMPTY);
  const [avail, setAvail] = React.useState(0);
  const [dims, setDims] = React.useState({ row: 1104, contain: 480 });
  const [layout, setLayout] = React.useState<{ layout?: string; bare?: boolean; open?: boolean }>({});
  const [listOpen, setListOpen] = React.useState(false);
  const descId = React.useId();

  // The stage's inner width (its width less the padding of 9.4) is the width the figure may be laid out at; it is read again when the stage resizes.
  const readStage = React.useCallback(() => {
    const stage = stageRef.current, sizer = sizerRef.current;
    if (!stage || !sizer) return;
    const pad = Number.parseFloat(getComputedStyle(sizer).paddingLeft) || 0;
    setAvail(Math.max(0, Math.floor(stage.clientWidth - 2 * pad)));
    setDims({ row: probeWidth(stage, "row") || 1104, contain: probeWidth(stage, "contain") || 480 });
  }, []);

  // The dialog's content mounts in a portal: the stage is wired once it exists.
  const [stageNode, setStageNode] = React.useState<HTMLDivElement | null>(null);
  const setStage = React.useCallback((el: HTMLDivElement | null) => { stageRef.current = el; setStageNode(el); }, []);
  React.useLayoutEffect(() => {
    const stage = stageNode, sizer = sizerRef.current, layer = layerRef.current, status = statusRef.current;
    if (!stage || !sizer || !layer || !status) return undefined;
    const rest = Number.parseFloat(getComputedStyle(stage).getPropertyValue("--_rest")) || 300;
    const z = attachZoom({ stage, sizer, layer, status, rest, onChange: setZoom });
    zoomRef.current = z;
    readStage();
    let width = stage.clientWidth;
    const observer = new ResizeObserver(() => { if (Math.abs(stage.clientWidth - width) >= 0.5) { width = stage.clientWidth; readStage(); } });
    observer.observe(stage);
    // A focused card is brought into view by the least distance, space-4 clear of the stage's edge (9.5).
    const onFocusIn = (event: FocusEvent) => {
      const node = (event.target as HTMLElement | null)?.closest?.(`.${P}-node`);
      if (node && stage.contains(node)) revealIn(stage, node, Number.parseFloat(getComputedStyle(stage).getPropertyValue("--_clear")) || 16);
    };
    stage.addEventListener("focusin", onFocusIn);
    return () => { z.destroy(); zoomRef.current = null; observer.disconnect(); stage.removeEventListener("focusin", onFocusIn); };
  }, [stageNode, readStage]);

  // After each layout the zoom learns the drawing's size at 100%: the drawing's own box, read with the zoom taken off (offsetWidth ignores the transform).
  const onMeasured = React.useCallback((measured: Measured, fig: HTMLElement) => {
    setLayout({ layout: measured.dyn.layout, bare: measured.dyn.bare, open: measured.dyn.open });
    zoomRef.current?.size(...drawnSize(fig));
  }, []);
  // The drawing's layout, for an app's action pressed here: the viewer's figure reports it after every layout.
  const laidRef = React.useRef<DiagramLayoutInfo | null>(null);
  const laid = React.useCallback((info: DiagramLayoutInfo) => { laidRef.current = info; }, []);
  const memo = React.useRef<ViewerMemo>({});
  // The figure is laid out as the dialog opens, through its scale from .98; once the entrance has ended it is laid out again, unscaled, so its lines
  // snap on the pixel grid they are drawn on.
  const [settled, setSettled] = React.useState(0);
  const viewer = React.useMemo<DiagramViewerMode | undefined>(() => {
    const layer = layerRef.current;
    if (!(avail > 0) || !layer) return undefined;
    return {
      keys: VIEWER_KEYS,
      room: () => {
        const stage = stageRef.current, sizer = sizerRef.current;
        const pad = sizer ? Number.parseFloat(getComputedStyle(sizer).paddingTop) || 0 : 0;
        return { w: (stage?.clientWidth ?? 0) - 2 * pad, h: (stage?.clientHeight ?? 0) - 2 * pad };
      },
      onMeasured,
      laid,
      measure: (fig, m, p, base, current, apply, warn) => measureViewerFigure(fig, m, p, base, current, apply, warn, { layer, avail, row: dims.row, contain: dims.contain, memo: memo.current, measureFigure }),
      textWidth: (need) => viewerTextWidth({ layer, avail, row: dims.row, contain: dims.contain, memo: memo.current, measureFigure }, need),
    };
  }, [avail, dims, onMeasured, laid, measureFigure, settled]);

  // A stack with no lines has its list open, as on the page (9.3).
  const showList = listOpen || Boolean(layout.bare);
  React.useLayoutEffect(() => { zoomRef.current?.list(showList); }, [showList]);

  const key = figureKey(P, model);
  const keyHtml = React.useMemo(() => ({ __html: key ? toHtml(key) : "" }), [key]);
  const listHtml = React.useMemo(() => ({ __html: figureList(P, model).map((v) => toHtml(v)).join("") }), [model]);
  const hint = viewerHint(hintEntries(model, { layout: layout.layout as "drawn" | "stacked" | undefined, bare: layout.bare })).map((entry) => (
    <span key={entry.words}>{entry.keys.map((k, i) => <React.Fragment key={k}>{i ? " " : null}<Kbd>{/* A fragment, not a string: Kbd reads a string as a shortcut, and "+" is its separator. */}<>{k}</></Kbd></React.Fragment>)} {entry.words}</span>
  ));
  const off = zoom.listOpen;
  const z = () => zoomRef.current;

  // The dialog: shown as a modal when it mounts; Esc (the browser's cancel), Close and a press on the scrim close it, after its own exit motion; focus
  // returns to "Expand". While it is open the page behind does not scroll (the stylesheet), and Tab wraps inside it.
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const closing = React.useRef(false);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  // Where the dialog is written: the modal's popup, read once as the viewer opens (the modal is open, so it is there), else the body.
  const [into] = React.useState<HTMLElement | null>(() => host?.current ?? null);
  const close = React.useCallback(() => {
    const d = dialogRef.current;
    if (!d || closing.current) return;
    closing.current = true;
    if (d.open) d.close();
  }, []);
  React.useLayoutEffect(() => {
    const d = dialogRef.current;
    if (!d) return undefined;
    if (!d.open) d.showModal();
    stageRef.current?.focus({ preventScroll: true });
    let timer = 0;
    const onClose = () => {
      closing.current = true;
      opener.current?.focus({ preventScroll: true });
      const out = (Number.parseFloat(getComputedStyle(d).getPropertyValue("--_out")) || 0);
      timer = window.setTimeout(() => onCloseRef.current(), out);
    };
    let down = false;
    const outside = (e: MouseEvent) => { const r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
    const onDown = (e: PointerEvent) => { down = e.target === d && outside(e); };
    const onClick = (e: MouseEvent) => { if (down && e.target === d && outside(e)) close(); down = false; };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented) return;
      const all = Array.from(d.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((n) => n.getClientRects().length && !n.closest("[hidden]"));
      if (!all.length) return;
      const first = all[0]!, last = all[all.length - 1]!, at = document.activeElement;
      if (e.shiftKey && (at === first || at === d)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    };
    // A linked card is followed on a click, a tap or Enter; a link that stays in this tab closes the viewer first (9.7). The dialog closes as the click is
    // handled, and the browser then follows the link as it would anywhere: a new tab's link leaves the viewer open.
    const onLink = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.(`a.${P}-node[href]`) as HTMLAnchorElement | null;
      if (!a || !d.contains(a) || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (a.target && a.target !== "_self")) return;
      close();
    };
    const onEntered = (e: TransitionEvent) => { if (e.target === d && e.propertyName === "transform" && d.open && !closing.current) setSettled((n) => n + 1); };
    d.addEventListener("transitionend", onEntered);
    d.addEventListener("close", onClose);
    d.addEventListener("pointerdown", onDown);
    d.addEventListener("click", onClick);
    d.addEventListener("click", onLink);
    d.addEventListener("keydown", onKey);
    // In a modal, the viewer closes as the modal starts to close (Base UI marks its popup `data-closed`), so the two leave together, and the native modal
    // is gone before the modal returns focus to its trigger (which the viewer would hold inert). Unmounted with it, the cleanup below closes it too.
    const parent = into ? new MutationObserver(() => { if (into.hasAttribute("data-closed")) close(); }) : null;
    if (into) parent?.observe(into, { attributes: true, attributeFilter: ["data-closed"] });
    return () => { parent?.disconnect(); clearTimeout(timer); d.removeEventListener("transitionend", onEntered); d.removeEventListener("close", onClose); d.removeEventListener("pointerdown", onDown); d.removeEventListener("click", onClick); d.removeEventListener("click", onLink); d.removeEventListener("keydown", onKey); if (d.open) d.close(); };
  }, [opener, close, into]);

  return createPortal(
    // In a modal, Esc closes the viewer alone (the browser's cancel): the key goes no further, so the modal's own dismissal, a React handler on its popup and
    // a listener on the document, never sees it. On the page it travels as it always has.
    <dialog ref={dialogRef} className={`basalt-dialog ${P}-viewer`} data-form="" data-level={1} aria-labelledby={titleId} aria-describedby={descId} onKeyDown={into ? stopEscape : undefined}>
      {inLevel(1, <>
        <header className="basalt-sheet-head">
          <div className="basalt-sheet-head-text">
            <h2 id={titleId} className="basalt-dialog-title" tabIndex={-1}>{model.title}</h2>
            {source !== undefined && source !== null ? <p className={`basalt-dialog-description ${P}-viewer-source`}>{source}</p> : null}
          </div>
          <IconButton icon={CloseGlyph} label="Close" edge="end" className="basalt-sheet-close" onClick={close} />
        </header>
        <p id={descId} className="basalt-visually-hidden">{summary}</p>
        <div ref={setStage} className={`${P}-stage`} tabIndex={0} role="group" aria-label="Zoomed drawing" data-layout={layout.layout}>
          <span className={`${P}-probe`} data-probe="row" aria-hidden="true" />
          <span className={`${P}-probe`} data-probe="contain" aria-hidden="true" />
          <div ref={sizerRef} className={`${P}-sizer`} hidden={showList}>
            <div ref={layerRef} className={`${P}-layer`}>
              {viewer ? <DiagramFigure spec={still} component={component} title={model.title} source={source} summary={summary} viewer={viewer} /> : null}
            </div>
          </div>
          {showList ? (
            <div
              className={`${P}-list ${P}-viewer-list`}
              // sink: the figure's list, written by diagram-core's figureList and toHtml from the model; every text and attribute is escaped there; test/diagram-recheck.test.mjs (hostile words in the viewer's list and key)
              // oxlint-disable-next-line react/no-danger -- the engine's own escaped markup (the sink: comment above)
              dangerouslySetInnerHTML={listHtml}
            />
          ) : null}
        </div>
        <footer className={`basalt-sheet-foot ${P}-viewer-foot`}>
          {key ? (
            <div
              className={`${P}-viewer-key`}
              data-layout={layout.layout}
              data-bare={layout.bare ? "" : undefined}
              // sink: the figure's key, written by diagram-core's figureKey and toHtml from the model; every text and attribute is escaped there; test/diagram-recheck.test.mjs (hostile words in the viewer's list and key)
              // oxlint-disable-next-line react/no-danger -- the engine's own escaped markup (the sink: comment above)
              dangerouslySetInnerHTML={keyHtml}
            />
          ) : null}
          <div className={`${P}-viewer-row`}>
            <div className={`${P}-zoom`}>
              {/* At a limit, or with the list open, a control is disabled as Basalt's are (B1 of the pixel review): it stays mounted and focusable, loses its
                  ink, and takes no hover, press or scale. */}
              <IconButton icon={MinusGlyph} size="sm" edge="start" label="Zoom out" disabled={off || zoom.atMin} focusableWhenDisabled onClick={() => { if (!off && !zoom.atMin) z()?.zoomOut(); }} />
              <span className={`${P}-level`} aria-hidden="true" data-reserve="400%"><span>{`${zoom.level}%`}</span></span>
              <IconButton icon={PlusGlyph} size="sm" label="Zoom in" disabled={off || zoom.atMax} focusableWhenDisabled onClick={() => { if (!off && !zoom.atMax) z()?.zoomIn(); }} />
              <Button variant="secondary" size="sm" className={`${P}-fit`} disabled={off || zoom.atFit} focusableWhenDisabled onClick={() => { if (!off && !zoom.atFit) z()?.fit(); }}>Fit</Button>
            </div>
            <p className={`${P}-hint ${P}-viewer-hint`} data-kbd-hint="" aria-hidden="true">{hint}</p>
            <div className={`${P}-viewer-end`}>
              {layout.bare ? null : (
                <button type="button" className={`basalt-button ${P}-toggle`} data-variant="secondary" data-size="sm" aria-expanded={showList} onClick={() => { if (!showList) zoomRef.current?.list(true); setListOpen((v) => !v); }}>
                  <span className="basalt-button-label">{showList ? "Hide the list" : "View as list"}</span>
                </button>
              )}
              {/* An app's actions follow the figure (the foot decision): handed the viewer's drawing, at 100% whatever the zoom, the list open or closed. */}
              {Actions && actions ? <Actions actions={actions} viewer component={component} context={() => ({ figure: layerRef.current!.querySelector<HTMLElement>(`.${P}`)!, viewer: true, layout: laidRef.current })} /> : null}
            </div>
          </div>
          <span ref={statusRef} className="basalt-visually-hidden" role="status" />
        </footer>
      </>)}
    </dialog>,
    into ?? document.body,
  );
}

const stopEscape = (event: React.KeyboardEvent) => { if (event.key === "Escape") event.stopPropagation(); };

