import * as React from "react";

import { Button, IconButton } from "./button";
import type { DiagramFigureInternalProps, DiagramViewerMode } from "./diagram-figure";
import type { buildModel, DiagramSpec, figureKey, figureList, hintEntries, Measured, Model, toHtml } from "./diagram-core";
import { attachZoom, revealIn } from "./diagram-zoom-core";
import type { ZoomController, ZoomState } from "./diagram-zoom-core";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { MinusGlyph } from "./glyphs/minus";
import { PlusGlyph } from "./glyphs/plus";
import { SheetFooter, SheetHeader } from "./overlays";

// The diagram viewer (DECISIONS 301, part 9, as DECISIONS 310): "Expand" opens the figure's drawn layout in a dialog, where the reader zooms and pans it.
// The figure is drawn again from the same data, laid out once at 100% in real CSS pixels, and zoomed with one transform (diagram-zoom-core.ts). This module
// is loaded on demand by a figure's "Expand" (diagram-figure.tsx) and brings Dialog with it; it is not exported from the package. The implementation hasn't
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
}

export interface DiagramViewerProps {
  kit: ViewerKit;
  spec: DiagramSpec;
  component: string;
  source?: React.ReactNode;
  summary: React.ReactNode;
  /** "Expand": focus returns to it when the viewer closes. */
  opener: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

const EMPTY: ZoomState = { zoom: 1, level: 100, fit: 1, min: 1, max: 4, atMin: false, atMax: false, atFit: true, listOpen: false };

/** A length token's value in CSS pixels, read from a probe the stage holds. */
const probeWidth = (stage: HTMLElement | null, which: string) => stage?.querySelector<HTMLElement>(`.${P}-probe[data-probe="${which}"]`)?.offsetWidth ?? 0;

export function DiagramViewer({ kit, spec, component, source, summary, opener, onClose }: DiagramViewerProps) {
  const { Figure: DiagramFigure, Kbd, buildModel, figureKey, figureList, hintEntries, toHtml } = kit;
  // The viewer's figure is still (9.7): no entrance, flow, mover or run, so no motion code is loaded for it.
  const still = React.useMemo<DiagramSpec>(() => ({ ...spec, motion: "still" }), [spec]);
  const model = React.useMemo<Model>(() => buildModel(still), [still]);
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

  // After each layout the zoom learns the drawing's size at 100%: the figure's own box, read with the zoom taken off (offsetWidth ignores the transform).
  const onMeasured = React.useCallback((measured: Measured, fig: HTMLElement) => {
    setLayout({ layout: measured.dyn.layout, bare: measured.dyn.bare, open: measured.dyn.open });
    zoomRef.current?.size(fig.offsetWidth, fig.offsetHeight);
  }, []);
  const viewer = React.useMemo<DiagramViewerMode | undefined>(() => (avail > 0 ? { avail, row: dims.row, contain: dims.contain, layer: () => layerRef.current, onMeasured } : undefined), [avail, dims, onMeasured]);

  // A stack with no lines has its list open, as on the page (9.3).
  const showList = listOpen || Boolean(layout.bare);
  React.useLayoutEffect(() => { zoomRef.current?.list(showList); }, [showList]);

  const key = figureKey(P, model);
  const keyHtml = React.useMemo(() => ({ __html: key ? toHtml(key) : "" }), [key]);
  const listHtml = React.useMemo(() => ({ __html: figureList(P, model).map((v) => toHtml(v)).join("") }), [model]);
  const hint = hintEntries(model, true).map((entry) => (
    <span key={entry.words}>{entry.keys.map((k, i) => <React.Fragment key={k}>{i ? " " : null}<Kbd>{/* A fragment, not a string: Kbd reads a string as a shortcut, and "+" is its separator. */}<>{k}</></Kbd></React.Fragment>)} {entry.words}</span>
  ));
  const off = zoom.listOpen;
  const z = () => zoomRef.current;

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent form className={`${P}-viewer`} initialFocus={stageRef} finalFocus={opener} aria-describedby={descId}>
        <SheetHeader closeLabel="Close">
          <DialogTitle>{model.title}</DialogTitle>
          {source !== undefined && source !== null ? <p className={`basalt-dialog-description ${P}-viewer-source`}>{source}</p> : null}
        </SheetHeader>
        <DialogDescription id={descId} className="basalt-visually-hidden">{summary}</DialogDescription>
        <div ref={setStage} className={`${P}-stage`} tabIndex={0} role="group" aria-label="Zoomed drawing" data-layout={layout.layout}>
          <span className={`${P}-probe`} data-probe="row" aria-hidden="true" />
          <span className={`${P}-probe`} data-probe="contain" aria-hidden="true" />
          <div ref={sizerRef} className={`${P}-sizer`} hidden={showList}>
            <div ref={layerRef} className={`${P}-layer`}>
              {viewer ? <DiagramFigure spec={still} component={component} title={model.title} summary={summary} viewer={viewer} /> : null}
            </div>
          </div>
          {showList ? <div className={`${P}-list ${P}-viewer-list`} dangerouslySetInnerHTML={listHtml} /> : null}
        </div>
        <SheetFooter className={`${P}-viewer-foot`}>
          {key ? <div className={`${P}-viewer-key`} data-layout={layout.layout} data-bare={layout.bare ? "" : undefined} dangerouslySetInnerHTML={keyHtml} /> : null}
          <div className={`${P}-viewer-row`}>
            <div className={`${P}-zoom`}>
              <IconButton icon={MinusGlyph} size="sm" label="Zoom out" aria-disabled={off || zoom.atMin || undefined} onClick={() => { if (!off && !zoom.atMin) z()?.zoomOut(); }} />
              <span className={`${P}-level`} aria-hidden="true" data-reserve="400%"><span>{`${zoom.level}%`}</span></span>
              <IconButton icon={PlusGlyph} size="sm" label="Zoom in" aria-disabled={off || zoom.atMax || undefined} onClick={() => { if (!off && !zoom.atMax) z()?.zoomIn(); }} />
              <Button variant="secondary" size="sm" className={`${P}-fit`} aria-disabled={off || zoom.atFit || undefined} onClick={() => { if (!off && !zoom.atFit) z()?.fit(); }}>Fit</Button>
            </div>
            <p className={`${P}-hint ${P}-viewer-hint`} data-kbd-hint="" aria-hidden="true">{hint}</p>
            <div className={`${P}-viewer-end`}>
              {layout.bare ? null : (
                <button type="button" className={`basalt-button ${P}-toggle`} data-variant="secondary" data-size="sm" aria-expanded={showList} onClick={() => setListOpen((v) => !v)}>
                  <span className="basalt-button-label">{showList ? "Hide the list" : "View as list"}</span>
                </button>
              )}
            </div>
          </div>
          <span ref={statusRef} className="basalt-visually-hidden" role="status" />
        </SheetFooter>
      </DialogContent>
    </Dialog>
  );
}

