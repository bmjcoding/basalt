// LoadingShape (skeleton-shape: DECISIONS 247, 248, 249b and 258; decided by Opus, approved by the owner). A region that, while its data is on its
// way, draws the region's own parts and paints what isn't known yet as bones. docs/foundations.md, "Loading in the page's own shape", is the rule.
//
// Two forms:
//   shape={() => <Rows items={standIns} />}                  everything a bone but known words (KEEP): nothing about the data is known
//   prefill={(v) => <Room room={fillIn(known, standInRoom(v))} />}
//                                                           what is known shows as itself, and only what is unknown is a bone
//
// How a prefill knows what is known, with no marking by the app: it is drawn twice, with two different fillings of what is unknown (`variant` 0,
// shown, and 1, an unseen twin), and the two drawings are compared (bones-measure.ts). Words, marks and controls that come out the same in both,
// in their words and their place, depend only on what is known and are drawn as they are; whatever differs depends on a stand-in and is a bone.
import * as React from "react";

import { measureBones } from "./bones-measure";
import type { Bone } from "./bones-measure";
import { startOf } from "./page-start";
import { KEEP } from "./shape-data";
import type { StandInVariant } from "./shape-data";
import { Spinner } from "./spinner";
import { join } from "./utils";

export interface LoadingShapeProps {
  /** True while the region's own data hasn't arrived. Fetching again what is already on screen is not loading: say `refreshing`. */
  loading: boolean;
  /** The region's parts with stand-in data; everything but known words (`keep`) is a bone. Use it when nothing about the data is known. */
  shape?: () => React.ReactNode;
  /**
   * The region's parts with what is known filled in and the rest stood in (`fillIn`), for each `variant`. What both variants draw the same, in the
   * same place, is shown as itself; what differs is a bone. Takes the place of `shape`. Stand-ins take values from a different set in each variant
   * (`standIn(seed, length, variant)`), with the same rows and branches.
   */
  prefill?: (variant: StandInVariant) => React.ReactNode;
  /** The content, drawn once loading is done. A function is called only then. */
  children: React.ReactNode | (() => React.ReactNode);
  /** The content on screen is a last copy being fetched again: it stays content, and the region carries `data-refreshing`. Pair it with `useRefreshing` and `Refreshing`. */
  refreshing?: boolean;
  /** Said once, politely, for the whole page, if bones are drawn. Default "Loading". */
  label?: string;
  /** Bones are drawn after this wait, counted from the page's start; the structure and what is known show from the start. Default 300 (ms). */
  showAfter?: number;
  /** Once drawn, bones stay at least this long, so a load that ends just after they appear never flashes. Default 400 (ms). */
  minShown?: number;
  /** Words always drawn as they are (a table's column heads, the names of tabs): a selector. Default `KEEP`; `""` for none. */
  keep?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Waiting (structure and what is known, no bones) → shown (bones) → content. */
export type ShapePhase = "waiting" | "shown" | "content";

/** 0 outside a shape; 1 in a drawn shape; 2 in the unseen twin a prefill is compared with. */
export type InShape = 0 | 1 | 2;

const InShapeContext = /* @__PURE__ */ React.createContext<InShape>(0);

/**
 * Where a part is drawn: 0 outside a shape (it is the content); 1 in a drawn shape, where a part that writes (saves a draft, marks something read)
 * does nothing; 2 in the unseen twin, where a part that draws outside itself (a portal into the header) draws nothing.
 */
export function useInShape(): InShape {
  return React.useContext(InShapeContext);
}

// True after hydration, false on the server and while hydrating: a phase worked out from the clock would differ between the two, so a server-rendered
// shape starts waiting and draws its bones after hydration.
const noSubscribe = () => () => {};
const useClient = (): boolean => React.useSyncExternalStore(noSubscribe, () => true, () => false);

export function LoadingShape({ loading, shape, prefill, children, refreshing = false, label = "Loading", showAfter = 300, minShown = 400, keep = KEEP, className, style }: LoadingShapeProps) {
  const phase = useShapePhase(loading, showAfter, minShown);
  useAnnounce(phase === "shown", label);
  // The bones last drawn, kept for the moment the content arrives: they fade out over it, so words appear where their bones were.
  const last = React.useRef<Bone[]>([]);
  const report = React.useCallback((bones: Bone[]) => { last.current = bones; }, []);
  if (phase === "content") {
    return (
      <div className={join("basalt-loading-shape", className)} style={style} data-phase="content" data-refreshing={refreshing || undefined}>
        {typeof children === "function" ? children() : children}
        <Leaving bones={last.current} />
      </div>
    );
  }
  return (
    <div className={join("basalt-loading-shape", className)} style={style} data-phase={phase} aria-busy="true">
      <BonesFrame shown={phase === "shown"} keep={keep} twin={prefill ? prefill(1) : undefined} onBones={phase === "shown" ? report : undefined}>
        {prefill ? prefill(0) : shape?.()}
      </BonesFrame>
    </div>
  );
}

const boneStyle = (bone: Bone): React.CSSProperties => ({ left: bone.x, top: bone.y, width: bone.w, height: bone.h, borderRadius: bone.r });

/** The last bones, fading out once over the content that took their place (an exit: 0.75 of `duration-base`, ease-in, opacity only), then gone. */
function Leaving({ bones }: { bones: Bone[] }) {
  const [gone, setGone] = React.useState(bones.length === 0);
  if (gone) return null;
  return (
    <div className="basalt-bones-leaving" aria-hidden="true" onAnimationEnd={(event) => { if (event.target === event.currentTarget) setGone(true); }}>
      {bones.map((bone, index) => <span key={index} className="basalt-skeleton" style={boneStyle(bone)} />)}
    </div>
  );
}

export interface BonesProps {
  /** Whether the bones are drawn. The drawing's structure and known words show either way. Default true. */
  shown?: boolean;
  /** Words always drawn as they are: a selector. Default `KEEP`. */
  keep?: string;
  /** The same parts drawn from the other stand-in: with it, only what differs between the two is a bone. */
  twin?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * The painting alone, for a place a region can't wrap (a portal's part of a shape). It paints what it holds as bones (all of it but known words, or
 * with a `twin` only what differs) and hides it from assistive technology. It says nothing and has no timing: `LoadingShape` does both.
 */
export function Bones(props: BonesProps) {
  return <BonesFrame {...props} />;
}

function BonesFrame({ shown = true, keep = KEEP, twin, onBones, children, className }: BonesProps & { onBones?: ((bones: Bone[]) => void) | undefined }) {
  const root = React.useRef<HTMLDivElement>(null);
  const [bones, setBones] = React.useState<Bone[]>([]);
  const report = React.useRef(onBones);
  report.current = onBones;
  React.useLayoutEffect(() => {
    const node = root.current;
    if (!node) return undefined;
    let frame = 0;
    const measure = (): void => {
      frame = 0;
      const next = measureBones(node, keep);
      setBones(next);
      report.current?.(next);
    };
    measure();
    const again = (): void => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resized = new ResizeObserver(again);
    resized.observe(node);
    // A part that settles its own layout after it is drawn moves what is inside without changing the region's size, and a prefill whose known part
    // grows changes its words: measure again when the drawing changes, but not for the marks the measure sets.
    const changed = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName !== "inert" && !record.attributeName?.startsWith("data-bone") && !(record.target as Element).closest?.(".basalt-bones-layer"))) again();
    });
    changed.observe(node, { subtree: true, childList: true, attributes: true, characterData: true });
    window.addEventListener("resize", again);
    // A sticky part (a band, a strip of facts) moves against the region as the page scrolls: its bones follow it.
    window.addEventListener("scroll", again, { passive: true, capture: true });
    // The text face arriving changes every line's length.
    void document.fonts?.ready.then(again);
    return () => {
      resized.disconnect();
      changed.disconnect();
      window.removeEventListener("resize", again);
      window.removeEventListener("scroll", again, { capture: true });
      if (frame) cancelAnimationFrame(frame);
      frame = -1;
    };
  }, [keep]);
  // The bones being drawn are what fades out when the content arrives.
  React.useEffect(() => { if (shown) report.current?.(bones); }, [shown, bones]);
  return (
    <InShapeContext.Provider value={1}>
      <div ref={root} className={join("basalt-bones", className)} data-shown={shown || undefined} data-prefill={twin !== undefined || undefined} aria-hidden="true" inert>
        {children}
        {twin !== undefined && (
          <InShapeContext.Provider value={2}>
            <div className="basalt-bones-twin" inert>
              {twin}
            </div>
          </InShapeContext.Provider>
        )}
        <div className="basalt-bones-layer">
          {bones.map((bone, index) => <span key={index} className="basalt-skeleton" style={boneStyle(bone)} />)}
        </div>
      </div>
    </InShapeContext.Provider>
  );
}

// ---- Timing ----

/**
 * Waiting (structure and what is known) → shown (bones) → content. A load under `showAfter` (300ms, counted from the page's start) never shows a
 * bone; once shown, bones stay at least `minShown` (400ms). Content stays content: what is on screen never goes back to bones.
 */
export function useShapePhase(loading: boolean, showAfter = 300, minShown = 400): ShapePhase {
  const client = useClient();
  const mountedAt = React.useRef(0);
  if (mountedAt.current === 0 && client) mountedAt.current = performance.now();
  const shownAt = React.useRef(0);
  const [phase, setPhase] = React.useState<ShapePhase>(() => {
    if (!loading) return "content";
    // Already past the show-after (the page began a while ago): the bones are drawn with the first paint. Never on the server or while hydrating.
    if (client && performance.now() - startOf(mountedAt.current) >= showAfter) {
      shownAt.current = performance.now();
      return "shown";
    }
    return "waiting";
  });
  React.useEffect(() => {
    if (mountedAt.current === 0) mountedAt.current = performance.now();
    if (phase === "waiting") {
      if (!loading) return setPhase("content");
      const timer = window.setTimeout(() => {
        shownAt.current = performance.now();
        setPhase("shown");
      }, Math.max(0, startOf(mountedAt.current) + showAfter - performance.now()));
      return () => window.clearTimeout(timer);
    }
    if (phase === "shown" && !loading) {
      const left = shownAt.current + minShown - performance.now();
      if (left <= 0) return setPhase("content");
      const timer = window.setTimeout(() => setPhase("content"), left);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [phase, loading, showAfter, minShown]);
  return phase;
}

// ---- In phases ----

/**
 * Parts that arrive one by one, released to the page in phases. Until `together` (250ms from the page's start, before the show-after's 300, so what
 * arrives in time never meets a bone) parts land only all at once: a fast page fills in once. After it, a part that is ready waits `gap` (120ms) for
 * any other arriving with it, and they land together. Once every part is here, they land at once. Parts ready from the start land at the first paint.
 * Group a page's parts in reading order, into no more than three phases after the known paint, and let a region wait for every part it reads, so
 * nothing lands above a part still loading whose height it can't know.
 */
export function useStaged<K extends string>(ready: Record<K, boolean>, gap = 120, together = 250): Record<K, boolean> {
  const [released, setReleased] = React.useState<Record<K, boolean>>(ready);
  const start = React.useRef(-1);
  if (start.current < 0 && typeof performance !== "undefined") start.current = startOf(performance.now());
  const keys = Object.keys(ready) as K[];
  const waiting = keys.some((key) => ready[key] && !released[key]);
  const all = keys.every((key) => ready[key]);
  const signature = keys.map((key) => (ready[key] ? 1 : 0)).join("");
  const latest = React.useRef(ready);
  latest.current = ready;
  React.useEffect(() => {
    if (!waiting) return undefined;
    const early = performance.now() - start.current < together;
    const wait = all ? 0 : early ? start.current + together - performance.now() : gap;
    const timer = window.setTimeout(() => setReleased((current) => {
      const next = { ...current };
      for (const key of Object.keys(latest.current) as K[]) if (latest.current[key]) next[key] = true;
      return next;
    }), Math.max(0, wait));
    return () => window.clearTimeout(timer);
    // Restarted only when a part becomes ready (the signature), not on every draw.
  }, [waiting, all, signature, gap, together]);
  return released;
}

// ---- A last copy, refreshing ----

/** True once a refresh of what is on screen has taken longer than `after` (1s): most land before it, and say nothing. */
export function useRefreshing(refreshing: boolean, after = 1000): boolean {
  const [late, setLate] = React.useState(false);
  React.useEffect(() => {
    if (!refreshing) {
      setLate(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setLate(true), after);
    return () => window.clearTimeout(timer);
  }, [refreshing, after]);
  return late;
}

export interface RefreshingProps {
  /** Shown: a refresh has taken more than a second (`useRefreshing`). Its seat is kept either way. */
  on: boolean;
  /** The word. Default "Updating". */
  label?: string;
  /** A phone's bar, with no room for the word: the ring alone, the word kept for assistive technology as plain text. */
  compact?: boolean;
}

/**
 * The quiet mark for a refresh that is taking a while: braille and its word, in tertiary ink, in a seat kept for it whether it shows or not, so nothing
 * moves when it comes and goes. Not a live region: the reader is reading what is on screen, and it is still true.
 */
export function Refreshing({ on, label = "Updating", compact = false }: RefreshingProps) {
  return (
    <span className="basalt-refreshing" data-on={on || undefined} aria-hidden={on ? undefined : true}>
      {compact ? (
        // The word for assistive technology as plain text: the Spinner's own label would be its live status, and this is never announced.
        <>
          <Spinner size={16} />
          <span className="basalt-visually-hidden">{label}</span>
        </>
      ) : (
        <>
          <Spinner variant="braille" />
          <span>{label}</span>
        </>
      )}
    </span>
  );
}

// ---- A page whose shape isn't known yet ----

export interface PageWaitProps {
  /** Said once with the ring. Default "Loading". */
  label?: string;
  /** Nothing is drawn for this long. Default 300 (ms). */
  showAfter?: number;
}

/**
 * The fallback while a page's own code loads, before any shape is known (the shape is the page's code): nothing for `showAfter`, then the ring where
 * the page's first line goes, its label said once. Never a box. It is for a reload, and for a cold first move: preload the pages' code when the app is
 * idle, and on a move keep the page on screen until the next page's code is here (the router's gate, never a lazy fallback in its place), so it is
 * rarely seen. A held first paint (`holdFirstPaint`) waits while one is drawn.
 */
export function PageWait({ label = "Loading", showAfter = 300 }: PageWaitProps) {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), showAfter);
    return () => window.clearTimeout(timer);
  }, [showAfter]);
  return (
    <div className="basalt-page-wait" aria-busy="true">
      {shown && <Spinner size={20} label={label} />}
    </div>
  );
}

// ---- Saying it ----

// One polite "Loading" for the page, however many regions are waiting and however many phases they land in: the first region to draw bones says its
// label, and the rest are quiet until every region is done. Nothing is said as phases land or when they finish. Made on first need, never at import.
let busy = 0;
let region: HTMLElement | null = null;
function liveRegion(): HTMLElement {
  if (region?.isConnected) return region;
  region = document.createElement("div");
  region.className = "basalt-visually-hidden";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("data-basalt-loading-status", "");
  document.body.append(region);
  return region;
}
function useAnnounce(on: boolean, label: string): void {
  React.useEffect(() => {
    if (!on) return undefined;
    busy += 1;
    if (busy === 1) liveRegion().textContent = label;
    return () => {
      busy -= 1;
      if (busy === 0 && region) region.textContent = "";
    };
  }, [on, label]);
}
