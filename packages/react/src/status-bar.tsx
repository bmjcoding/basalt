import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import * as React from "react";

import { STATUS_MESSAGE_MS } from "./constants";
import type { ButtonEdge } from "./button";
import { StatusLine } from "./filter-result";
import { Icon } from "./icon";
import { usePinnedEdges } from "./pinned-edges";
import { usePeekPlate } from "./use-peek";
import { join } from "./utils";

// ---- The status bar (DECISIONS 162, D14b: V7, R6, R7, B7) ----
// A foot of 44px from 720 in the page's layout, and fixed under 720 (56px plus the safe area). The name `StatusLine` is the announcer's
// (a polite line heard and not seen), so this part is the bar.

/** How long the live regions keep a message's words after saying them, when the message is a focus stop that holds them itself. */
const SPOKEN_MS = 2000;

export interface StatusMessage {
  /** The words. */
  text: string;
  /** An error carries the XCircle mark in a 16px seat and danger ink, and is said through an assertive region. */
  status?: "error";
  /**
   * The app has also written this message to its event log, which is its home: only then does the slot clear it itself, after 5000ms. Any
   * other message stays until the next one replaces it or Esc clears it.
   */
  logged?: boolean;
  /** Tells two messages with the same words apart, so the second is said again. */
  id?: string | number;
}

export interface StatusBarProps extends Omit<React.ComponentProps<"footer">, "children"> {
  /** The bar's name. Default "Status". */
  label?: string;
  /**
   * The run: a button or a link with its mark, its id and its counts. A control given `variant="ghost"` first here (or first in `sources` when there
   * is no `start`) is hung at the bar's start, and one last in `end` at its end: its words on the bar's line (DECISIONS 336).
   */
  start?: React.ReactNode;
  /**
   * The sources and the session in one button that opens the `Drawer`: a `DrawerTrigger` (`variant="ghost" size="sm"`), which carries
   * `aria-expanded` and `aria-controls`. Its words say how the sources stand, so no colour carries it.
   */
  sources?: React.ReactNode;
  /** The centre slot. It reserves its line, so a message coming and going moves nothing. */
  message?: StatusMessage | null;
  /** The slot asks to be cleared: the 5000ms timer of a logged message, or Esc. Set `message` to null. */
  onMessageClear?: () => void;
  /** The theme control, or the like. */
  end?: React.ReactNode;
  /**
   * A bar outside `AppShell` (a page under a `SiteHeader`, say), pinned to the bottom of its column from 720: `position: sticky; bottom: 0`, so it
   * spans exactly that column and never crosses a rail or a sidebar. Still 44px, solid, its divider on top, the bottom safe area as padding. **Its
   * column must reach the bottom:** the bar's parent is a flex column at least as tall as what scrolls it, and the page above the bar grows
   * (`flex: 1 0 auto`); `SitePage` is such a column. While pinned it opts into `usePinnedEdges`, so scroll padding and the toast stack clear it on the
   * box it sticks in. Under 720 nothing changes (the fixed phone form); it is not drawn from 720 while an on-screen keyboard is up, and it is in the
   * flow in a window under 480 tall and in print. In `AppShell`'s `foot` it is not needed: a status bar that is the foot's only child sits flush, and
   * the foot holds it. Default false.
   */
  pinned?: boolean;
}

type Hangable = { variant?: string; edge?: ButtonEdge; label?: unknown; icon?: unknown; children?: React.ReactNode };

/** A ghost control, read from its props so the bar imports no button: `variant="ghost"`, or an `IconButton`'s defaults (a label and an icon, no variant). */
function isGhost(props: Hangable): boolean {
  return props.variant === "ghost" || (props.variant === undefined && props.label !== undefined && props.icon !== undefined);
}

/**
 * A slot's first (or last) control, when it is a ghost Basalt control with no edge of its own (a ghost `Button`, `IconButton` or `DrawerTrigger`),
 * hung at the bar's edge (DECISIONS 336). A fragment is looked into, so its first or last child is the slot's (the code review's finding 4).
 */
function hang(slot: React.ReactNode, side: ButtonEdge): React.ReactNode {
  const items = React.Children.toArray(slot);
  const at = side === "start" ? 0 : items.length - 1;
  const item = items[at];
  if (!React.isValidElement<Hangable>(item)) return slot;
  if (item.type === React.Fragment) {
    items[at] = React.cloneElement(item, undefined, hang(item.props.children, side));
    return items;
  }
  if (typeof item.type === "string" || !isGhost(item.props) || item.props.edge !== undefined) return slot;
  items[at] = React.cloneElement(item, { edge: side });
  return items;
}

/**
 * The foot of an app. A message is spoken once through regions that are in the page before any text: a polite one, and an assertive one for
 * an error. The visible words are hidden from assistive technology so they are not said twice. A page has one foot: the status bar and a
 * phone tab bar do not share it.
 *
 * From 720 the message keeps one truncated line. While its words are cut it is a focus stop (`role="note"`, named by the words) and shows them whole on a plate
 * lifted into the page above the bar (DECISIONS 168 and 170; peek-plate.ts). The stop holds the words, so the live regions let go of them once they have said
 * them, and a screen reader meets them in one place.
 */
export function StatusBar({ label = "Status", start, sources, message, onMessageClear, end, pinned = false, className, ...props }: StatusBarProps) {
  usePinnedEdges(pinned);
  const clear = React.useRef(onMessageClear);
  clear.current = onMessageClear;
  const logged = message?.logged;
  const key = message ? `${message.id ?? ""}${message.text}` : "";
  React.useEffect(() => {
    if (!message) return;
    const timer = logged ? window.setTimeout(() => clear.current?.(), STATUS_MESSAGE_MS) : undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) clear.current?.(); };
    document.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(timer); document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the message's identity; `message` itself is a new object each render
  }, [key, logged]);
  // The bar tells the page it is there, so the page's bottom offset and the toasts can clear it under 720 (the style sheet reads the root's attribute, never `:root:has()`).
  // Under 720 the message is a band stacked above the bar, so the page's bottom offset must count it too (WCAG 2.4.11): the bar measures the band and writes its
  // height on the root as `--basalt-status-band`, which the style sheet adds to the offset (0 when no message shows, and from 720, where the band is in the flow).
  const band = React.useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = React.useState(false);
  usePeekPlate(band, "status", { onCut: setCut });
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-status-bar", "");
    const target = band.current;
    let observer: ResizeObserver | undefined;
    if (target && typeof ResizeObserver !== "undefined") {
      const write = () => root.style.setProperty("--basalt-status-band", `${target.offsetHeight}px`);
      observer = new ResizeObserver(write);
      observer.observe(target);
      write();
    }
    return () => { observer?.disconnect(); root.style.removeProperty("--basalt-status-band"); root.removeAttribute("data-status-bar"); };
  }, []);
  // The assertive region: in the page already, then given the error's words a moment later.
  const [alert, setAlert] = React.useState("");
  const error = message?.status === "error";
  // While the message is a stop it holds the words, so the regions empty themselves once they have said them.
  const [said, setSaid] = React.useState(false);
  React.useEffect(() => {
    setSaid(false);
    if (!cut || !message) return;
    const timer = window.setTimeout(() => setSaid(true), SPOKEN_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the message's identity
  }, [key, cut]);
  const held = cut && said;
  React.useEffect(() => {
    setAlert("");
    if (!error || !message) return;
    const timer = window.setTimeout(() => setAlert(message.text), 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the message's identity
  }, [key, error]);
  return (
    <footer {...props} aria-label={label} data-pinned-edge="bottom" data-pinned={pinned ? "" : undefined} className={join("basalt-status-bar", className)}>
      {start ? <div className="basalt-status-bar-start">{hang(start, "start")}</div> : null}
      {sources ? <div className="basalt-status-bar-sources">{start ? sources : hang(sources, "start")}</div> : null}
      <p
        ref={band}
        data-pinned-extent=""
        className="basalt-status-bar-message"
        aria-hidden={cut ? undefined : "true"}
        role={cut ? "note" : undefined}
        aria-label={cut ? message?.text : undefined}
        tabIndex={cut ? 0 : undefined}
        data-cut={cut ? "" : undefined}
        data-status={message?.status}
        data-empty={message ? undefined : ""}
      >
        {error ? <span className="basalt-status-bar-seat" aria-hidden={cut ? "true" : undefined}><Icon icon={XCircleIcon} size={16} /></span> : null}
        <span className="basalt-status-bar-text" aria-hidden={cut ? "true" : undefined}>{message?.text}</span>
      </p>
      {end ? <div className="basalt-status-bar-end">{hang(end, "end")}</div> : null}
      <StatusLine sendId={message?.id}>{message && !error && !held ? message.text : ""}</StatusLine>
      <span role="alert" aria-live="assertive" aria-atomic="true" className="basalt-visually-hidden">{held ? "" : alert}</span>
    </footer>
  );
}
