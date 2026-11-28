import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import { durationBase } from "@srasyndicate/basalt-tokens/durations";
import * as React from "react";

import { STATUS_MESSAGE_MS } from "./constants";
import { StatusLine } from "./filter-result";
import { Icon } from "./icon";
import { usePinnedEdges } from "./pinned-edges";
import { Elapsed } from "./presence";
import { Spinner } from "./spinner";
import { join } from "./utils";

// The connection bar (cimip-gaps-3 T5, item 10b): a band stuck under the header that says the app's connection is not up. Nothing is drawn while it
// is up. The timing is the part's own, so every app waits the same: "Reconnecting" that follows a connection that was up waits a second (DECISIONS
// 249b, rule 2: a wait that ends quickly shows nothing), so an outage under a second draws and says nothing, coming or going; offline and
// disconnected are drawn at once; and when the connection is back while the bar is drawn it says "Back online" for STATUS_MESSAGE_MS, held while the
// pointer or focus is on it, then leaves. Any newer status cancels every pending timer, so a stale retry never reports "Back online". The bar is the
// one owner of what is said: a polite line and an assertive region are in the page from mount, and each drawn state is said once, when it is drawn.

export type ConnectionStatus = "connected" | "reconnecting" | "offline" | "disconnected";

/** What the bar draws: a state, or "restored" (back online, for a while). */
type Drawn = Exclude<ConnectionStatus, "connected"> | "restored";

/** How long "Reconnecting" waits when it follows a connection that was up, in milliseconds (DECISIONS 249b, rule 2). */
const RECONNECTING_AFTER_MS = 1000;

export interface ConnectionBarProps extends Omit<React.ComponentProps<"div">, "children" | "title"> {
  /** The connection's state, as the app knows it. `connected` draws nothing (or "Back online", for a while, after an outage that was drawn). */
  status: ConnectionStatus;
  /** The words for each state, in the app's language. Defaults "Reconnecting", "Offline", "Disconnected" and "Back online" (`restored`). */
  words?: { reconnecting?: string; offline?: string; disconnected?: string; restored?: string };
  /** More, after the word, at 400 in secondary: what is affected, in the app's words. Not drawn in "Back online". Basalt ships no sentence of its own. */
  detail?: React.ReactNode;
  /** When the outage began: an `Elapsed` after the word ("Offline 6 min"). */
  since?: Date | number;
  /** One ghost `sm` Button at the end ("Retry"). It is given `edge="end"` when it has none. Not drawn in "Back online". */
  action?: React.ReactNode;
  /** Without `AppShell`: put its row on the page row (`size-page-width`, the gutter), for a bar placed directly after the page's own header. */
  contained?: boolean;
  /** The band's name, a region. Default "Connection". */
  label?: string;
}

const DEFAULT_WORDS = { reconnecting: "Reconnecting", offline: "Offline", disconnected: "Disconnected", restored: "Back online" } as const;

/** The drawn state, from the app's status, with the part's own timing. */
function useDrawn(status: ConnectionStatus, held: React.RefObject<boolean>): [Drawn | null, () => void] {
  const [drawn, setDrawn] = React.useState<Drawn | null>(status === "connected" || status === "reconnecting" ? null : status);
  const current = React.useRef(drawn);
  current.current = drawn;
  const timer = React.useRef<number | undefined>(undefined);
  // "Back online" leaves once its time is up and nothing holds it; a hold that ends after the time asks again.
  const due = React.useRef(false);
  const leave = React.useCallback(() => {
    if (current.current !== "restored" || !due.current || held.current) return;
    due.current = false;
    setDrawn(null);
  }, [held]);
  React.useEffect(() => {
    window.clearTimeout(timer.current);
    due.current = false;
    const was = current.current;
    if (status === "connected") {
      // An outage that was never drawn draws and says nothing as it ends.
      if (was === null || was === "restored") return undefined;
      setDrawn("restored");
      timer.current = window.setTimeout(() => { due.current = true; leave(); }, STATUS_MESSAGE_MS);
    } else if (status === "reconnecting" && (was === null)) {
      timer.current = window.setTimeout(() => setDrawn("reconnecting"), RECONNECTING_AFTER_MS);
    } else {
      setDrawn(status);
    }
    return () => window.clearTimeout(timer.current);
  }, [status, leave]);
  return [drawn, leave];
}

/**
 * A band stuck under the header while the app's connection is not up (see the module's note). In `AppShell` pass it as `banner`; without a shell put it
 * directly after the page's bar. It sticks under the bar (`--basalt-sticky-offset`), writes its height as `--basalt-banner-height` on the root while it is
 * drawn and sticky (so `--basalt-sticky-top`, scroll padding and phone toasts clear it), and takes room in the flow: the page moves by its height once
 * when it comes and once when it goes; nothing animates height. Level 1, a divider under it, at least 40 tall (44 on touch and under 720). In the flow in a
 * window under 480 tall; not drawn in print.
 */
export function ConnectionBar({ status, words, detail, since, action, contained = false, label = "Connection", className, onPointerEnter, onPointerLeave, onFocus, onBlur, ...props }: ConnectionBarProps) {
  const held = React.useRef(false);
  const [drawn, leave] = useDrawn(status, held);
  const said = { ...DEFAULT_WORDS, ...words };
  // Leaving fades out over 0.75 of duration-base before the band goes, so its going is one move of the page after the fade.
  const [shown, setShown] = React.useState<Drawn | null>(drawn);
  const [leaving, setLeaving] = React.useState(false);
  React.useEffect(() => {
    if (drawn !== null) { setShown(drawn); setLeaving(false); return undefined; }
    if (shown === null) return undefined;
    setLeaving(true);
    const timer = window.setTimeout(() => { setShown(null); setLeaving(false); }, durationBase * 0.75);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change of what is drawn starts or ends the fade
  }, [drawn]);
  const band = React.useRef<HTMLDivElement | null>(null);
  usePinnedEdges(shown !== null);
  // The band's height on the root while it is drawn and sticky, so whatever sticks under the bar sits under the band too.
  React.useEffect(() => {
    const element = band.current;
    if (!element || shown === null) return undefined;
    const root = element.ownerDocument.documentElement;
    const write = () => {
      const sticky = getComputedStyle(element).position === "sticky";
      if (sticky) root.style.setProperty("--basalt-banner-height", `${element.offsetHeight}px`);
      else root.style.removeProperty("--basalt-banner-height");
    };
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(write);
    observer?.observe(element);
    window.addEventListener("resize", write);
    write();
    return () => { observer?.disconnect(); window.removeEventListener("resize", write); root.style.removeProperty("--basalt-banner-height"); };
  }, [shown]);
  // Speech: each drawn state once, when it is drawn; disconnected through the assertive region.
  const [polite, setPolite] = React.useState("");
  const [assertive, setAssertive] = React.useState("");
  const [sendId, setSendId] = React.useState(0);
  React.useEffect(() => {
    if (drawn === null) return undefined;
    const words = said[drawn];
    setSendId((n) => n + 1);
    if (drawn === "disconnected") {
      setPolite("");
      setAssertive("");
      const timer = window.setTimeout(() => setAssertive(words), 50);
      return () => window.clearTimeout(timer);
    }
    setAssertive("");
    setPolite(words);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a state is said when it is drawn, not when the app's words object is new
  }, [drawn]);
  // The pointer and focus hold "Back online" separately: it leaves only when neither is on it.
  const hover = React.useRef(false);
  const focus = React.useRef(false);
  const hold = (kind: "hover" | "focus", on: boolean) => {
    (kind === "hover" ? hover : focus).current = on;
    held.current = hover.current || focus.current;
    if (!held.current) leave();
  };
  // A band that has gone takes no pointer or focus with it: the next one starts unheld.
  React.useEffect(() => {
    if (shown !== null) return;
    hover.current = false;
    focus.current = false;
    held.current = false;
  }, [shown]);
  const state = shown;
  const restored = state === "restored";
  const mark = state === "reconnecting" ? <Spinner variant="braille" size={16} />
    : state === "offline" ? <Icon icon={WarningIcon} slot="status-warning" size={16} />
    : state === "disconnected" ? <Icon icon={XCircleIcon} slot="status-danger" size={16} />
    : state === "restored" ? <Icon icon={CheckCircleIcon} slot="status-success" size={16} /> : null;
  return (
    <>
      {state !== null ? (
        <div
          {...props}
          ref={band}
          role="region"
          aria-label={label}
          data-pinned-edge="top"
          data-state={state}
          data-leaving={leaving ? "" : undefined}
          data-contained={contained ? "" : undefined}
          className={join("basalt-connection-bar", className)}
          onPointerEnter={(event) => { onPointerEnter?.(event); hold("hover", true); }}
          onPointerLeave={(event) => { onPointerLeave?.(event); hold("hover", false); }}
          onFocus={(event) => { onFocus?.(event); hold("focus", true); }}
          onBlur={(event) => { onBlur?.(event); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hold("focus", false); }}
        >
          <div className="basalt-connection-bar-row">
            <span className="basalt-connection-bar-seat" aria-hidden="true">{mark}</span>
            <p className="basalt-connection-bar-words">
              <span className="basalt-connection-bar-word">{said[state]}</span>
              {!restored && since !== undefined ? <> <Elapsed since={since} className="basalt-connection-bar-since" /></> : null}
              {!restored && detail != null ? <> <span className="basalt-connection-bar-detail">{detail}</span></> : null}
            </p>
            {!restored && action != null ? <span className="basalt-connection-bar-action">{withEdge(action)}</span> : null}
          </div>
        </div>
      ) : null}
      <StatusLine sendId={sendId} delay={0}>{polite}</StatusLine>
      <span role="alert" aria-live="assertive" aria-atomic="true" className="basalt-visually-hidden">{assertive}</span>
    </>
  );
}

/** The action, hung at the band's end when it is a ghost control with no edge of its own (DECISIONS 336). */
function withEdge(action: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<{ variant?: string; edge?: string }>(action) || typeof action.type === "string" || action.props.edge !== undefined) return action;
  if (action.props.variant !== "ghost") return action;
  return React.cloneElement(action as React.ReactElement<{ edge?: string }>, { edge: "end" });
}
