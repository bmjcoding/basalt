import * as React from "react";

import { REFLOW_BOUND } from "./constants";
import { ArrowUpGlyph } from "./glyphs/arrow-up";
import { Icon } from "./icon";
import { useLoops } from "./loops";
import { useReducedMotion } from "./motion";
import { Reserve } from "./reserve";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// ---- The event log (DECISIONS 162, D14a: V3, V4 and R5) ----
// Lines of one form: a time, a verb in secondary ink and an object in primary, with a quieter second line. As a list of links with a roving
// tab stop, day rules and a labelled rule where new events begin (`EventLog`); or as the lines of a `Listbox` that can be chosen (the
// session log: `EventTime` and `EventText` are its parts, `ListboxOption`'s `leading` its time cell).

const WIDEST_STAMP = "00:00:00";
// A day and a clock to the minute reads in the locale's hour (DECISIONS 207): "Nov 7, 8:02 AM" in `en-US`. The widest it can be is "Mmm 00 00:00 PM" there and
// "Mmm 00 00:00" where the hour is 24-hour, so the column reserves what it holds (in the log's mono font only the count of characters counts, so a day-first locale reserves the same).
const widestDayStamp = (locale: string | string[]) => (new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12 ? "Mmm 00 00:00 PM" : "Mmm 00 00:00");

export interface EventTimeProps extends Omit<React.ComponentProps<"time">, "children"> {
  /** The time as the app writes it: to the second and 24-hour in a session log ("14:49:07"), or the day and the clock in the locale's hour ("Nov 17 9:39 AM"). */
  children: string;
  /** The widest stamp this column can show, drawn unseen so the column is as wide as it, measured in the line's own font. Default "00:00:00". */
  widest?: string;
}

/** A time cell: right-aligned, tabular, mono. The column is as wide as the widest stamp it can show, never counted in characters. */
export function EventTime({ children, widest = WIDEST_STAMP, className, ...props }: EventTimeProps) {
  return (
    <time {...props} className={join("basalt-event-time", className)}>
      <Reserve show="now" alternatives={{ now: children, widest }} />
    </time>
  );
}

export interface EventTextProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** What happened: secondary ink. */
  verb: React.ReactNode;
  /** What it happened to: primary ink. */
  object: React.ReactNode;
}

/** The words of an event line: a verb in secondary and an object in primary, at weight 400. */
export function EventText({ verb, object, className, ...props }: EventTextProps) {
  return <span {...props} className={join("basalt-event-text", className)}><span className="basalt-event-verb">{verb}</span> <span className="basalt-event-object">{object}</span></span>;
}

const WidestContext = /* @__PURE__ */ React.createContext("Mmm 00 00:00 PM");

export interface EventLogProps extends Omit<React.ComponentProps<"ul">, "children"> {
  /** Names the list. */
  label: string;
  /** The widest stamp a line can show, so the time column holds it. Default: a day and a clock in the locale's hour ("Mmm 00 00:00 PM" in `en-US`, "Mmm 00 00:00" for a 24-hour locale). */
  widest?: string;
  /** The locale the lines' times are written in, which the default `widest` follows. Default `en-US`. */
  locale?: string | string[];
  /**
   * `oldest` (the default) is the log as before. `newest` is a feed that grows at its top (cimip-gaps-3 T2, item 9): the app passes its lines newest first,
   * each with a stable `key`. A line that arrives above the lines already drawn shows at once only while the reader is at the head and not engaged (the
   * head in view; focus, the pointer and a selection outside the log; no hold; no scroll). Otherwise it waits out of the DOM, nothing on screen moves, and a
   * "3 new events" control floats at the log's head; a press lands them, brings the head into view and focuses the first new line.
   */
  order?: "oldest" | "newest";
  /** The waiting count's words, on the control and in the one polite line. Default "1 new event", "3 new events". */
  newLabel?: (count: number) => string;
  /** Says the count of new events once a burst has settled (400ms), then not again for 10 seconds. Default true. `order="newest"` only. */
  announce?: boolean;
  children: React.ReactNode;
}

const defaultNewLabel = (count: number) => `${count} new ${count === 1 ? "event" : "events"}`;
/** How long a burst of arrivals settles before the count is said, and how long until it may be said again. */
const SETTLE_MS = 400;
const QUIET_MS = 10_000;
/** How long the page must rest after a scroll before waiting lines arrive. */
const SCROLL_REST_MS = 150;

const LINES = "[data-event-line]";

/**
 * A feed of events as links, with one tab stop (the arrows, Home and End move between lines). Lines may stand under day rules
 * (`EventLogRule`). The list keeps `space-1-5` from its own edge for the ring, which is the control ring at +2 outside each line. It does
 * not follow its tail: where the list scrolls, follow the end only while the reader is at it, as a `Terminal` does.
 */
export function EventLog({ label, locale = "en-US", widest = widestDayStamp(locale), order = "oldest", newLabel = defaultNewLabel, announce = true, className, children, onKeyDown, onFocus, ...props }: EventLogProps) {
  const root = React.useRef<HTMLUListElement>(null);
  const feed = useNewestFirst(order === "newest", children, root, newLabel, announce);
  // One tab stop: the line last focused, else the first. The attribute is set on the DOM, so the lines' own props never change.
  React.useLayoutEffect(() => {
    const lines = [...(root.current?.querySelectorAll<HTMLElement>(LINES) ?? [])];
    if (!lines.length || lines.some((line) => line.tabIndex === 0)) return;
    lines[0]!.tabIndex = 0;
  });
  const list = (
      <ul
        {...props}
        ref={root}
        aria-label={label}
        className={join("basalt-event-log", className)}
        onFocus={(event) => {
          onFocus?.(event);
          const target = (event.target as Element).closest<HTMLElement>(LINES);
          if (!target) return;
          for (const line of root.current?.querySelectorAll<HTMLElement>(LINES) ?? []) line.tabIndex = line === target ? 0 : -1;
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          const lines = [...(root.current?.querySelectorAll<HTMLElement>(LINES) ?? [])];
          const at = lines.indexOf((event.target as Element).closest<HTMLElement>(LINES) as HTMLElement);
          if (at < 0) return;
          const to = event.key === "ArrowDown" ? Math.min(lines.length - 1, at + 1) : event.key === "ArrowUp" ? Math.max(0, at - 1) : event.key === "Home" ? 0 : event.key === "End" ? lines.length - 1 : -1;
          if (to < 0) return;
          event.preventDefault();
          lines[to]!.focus();
        }}
      >
        {feed ? feed.lines : children}
      </ul>
  );
  if (!feed) return <WidestContext.Provider value={widest}>{list}</WidestContext.Provider>;
  // The feed's root holds the release dock, the head's sentinel, the list and the one polite line: engagement is read on it, so moving from a line onto the
  // control is still in the log, and the wait does not end under a press.
  return (
    <WidestContext.Provider value={widest}>
      <div className="basalt-event-feed" {...feed.rootProps}>
        <div className="basalt-back-to-top-dock basalt-event-feed-dock">
          {/* Button's own markup (a secondary sm with the core arrow-up), written here so a log that never waits does not load Button. */}
          <button
            type="button"
            data-variant="secondary"
            data-size="sm"
            className="basalt-button basalt-back-to-top"
            data-shown={feed.waiting > 0 ? "" : undefined}
            tabIndex={feed.waiting > 0 ? undefined : -1}
            aria-hidden={feed.waiting > 0 ? undefined : true}
            onClick={feed.release}
          >
            <Icon icon={ArrowUpGlyph} size={16} />
            <span className="basalt-button-label">{newLabel(Math.max(1, feed.waiting))}</span>
          </button>
        </div>
        <span ref={feed.head} className="basalt-event-feed-head" aria-hidden="true" />
        {list}
        {announce ? <span className="basalt-visually-hidden" role="status" aria-live="polite">{feed.spoken}</span> : null}
      </div>
    </WidestContext.Provider>
  );
}

/** Reads a duration token off an element, in milliseconds. */
const tokenMs = (el: Element, name: string) => {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
};

/**
 * The newest-first feed (cimip-gaps-3 T2, item 9). Which lines are drawn, which wait, when they arrive, and the one polite line. Lines are keyed and never
 * remounted: a waiting line is left out of the DOM, and the lines on screen keep their nodes, so focus stays where it was.
 */
function useNewestFirst(on: boolean, children: React.ReactNode, list: React.RefObject<HTMLUListElement | null>, newLabel: (count: number) => string, announce: boolean) {
  const { held } = useLoops();
  const reduced = useReducedMotion();
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const visible = React.useRef<Set<string> | null>(null);
  const engaged = React.useRef({ pointer: false, focus: false, selecting: false, scrolling: false, headOut: false });
  const pressed = React.useRef(false);
  const before = React.useRef<Map<Element, number> | null>(null);
  const revealed = React.useRef<string[]>([]);
  const head = React.useRef<HTMLSpanElement>(null);
  const rootEl = React.useRef<HTMLDivElement | null>(null);
  const [spoken, setSpoken] = React.useState("");

  const items = on ? (React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement[]) : [];
  if (on && process.env.NODE_ENV !== "production" && items.some((item) => !String(item.key).startsWith(".$"))) console.warn("Basalt EventLog: a newest-first log's lines each need a stable `key`, or an arrival cannot be told from a line already drawn.");
  const keys = items.map((item) => String(item.key));

  let waitingKeys: string[] = [];
  let nextVisible: Set<string> | null = null;
  if (on) {
    const seen = visible.current;
    const firstKept = seen ? keys.findIndex((key) => seen.has(key)) : -1;
    if (!seen || firstKept < 0) {
      // A first render, or a render that keeps none of the last lines: a new list, and nothing waits.
      nextVisible = new Set(keys);
    } else {
      nextVisible = new Set(keys.filter((key, i) => seen.has(key) || i > firstKept));
      const arrivals = keys.slice(0, firstKept);
      const free = !held && !Object.values(engaged.current).some(Boolean);
      if (arrivals.length && (free || pressed.current)) {
        for (const key of arrivals) nextVisible.add(key);
        revealed.current = arrivals;
        // Where each line is drawn before the arrivals land, for the move (read before React writes the DOM).
        if (list.current && !pressed.current) {
          const map = new Map<Element, number>();
          for (const li of list.current.children) map.set(li, li.getBoundingClientRect().top);
          before.current = map;
        }
      } else waitingKeys = arrivals;
    }
  }

  React.useLayoutEffect(() => {
    if (!on || !nextVisible) return;
    visible.current = nextVisible;
    const landed = revealed.current;
    revealed.current = [];
    const wasPressed = pressed.current;
    pressed.current = false;
    const from = before.current;
    before.current = null;
    const el = list.current;
    if (!landed.length || !el) return;
    const nodes = [...el.children] as HTMLElement[];
    if (wasPressed) {
      // A press lands at once, brings the head into view at once, and focuses the first new line (a plain line takes tabindex -1, with no ring).
      head.current?.scrollIntoView({ block: "nearest" });
      const first = nodes[0];
      const target = first?.querySelector<HTMLElement>("[data-event-line]") ?? first?.querySelector<HTMLElement>(".basalt-event-line");
      if (target) { if (!target.hasAttribute("data-event-line")) target.tabIndex = -1; target.focus({ preventScroll: true }); }
      return;
    }
    if (!from || held) return;
    const arrivals = nodes.filter((li) => !from.has(li));
    const easing = getComputedStyle(el).getPropertyValue("--basalt-ease-out").trim() || "ease-out";
    for (const li of arrivals) li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: tokenMs(li, reduced ? "--basalt-duration-fast" : "--basalt-duration-base"), easing });
    if (reduced) return;
    const moves: [HTMLElement, number][] = [];
    for (const li of nodes) {
      const was = from.get(li);
      if (was === undefined) continue;
      const dy = was - li.getBoundingClientRect().top;
      if (Math.abs(dy) >= 0.5) moves.push([li, dy]);
    }
    // As Reflow: past 48 lines that would move, they land at once.
    if (moves.length > REFLOW_BOUND) return;
    for (const [li, dy] of moves) li.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: tokenMs(li, "--basalt-duration-slow"), easing });
  });

  // ---- what engages the reader: read on the feed's root, the scroll, the selection and whether the head is in view
  const waiting = items.filter((item) => waitingKeys.includes(String(item.key)) && item.type !== EventLogRule).length;
  const waitingAny = waitingKeys.length > 0;
  const waitingRef = React.useRef(false);
  waitingRef.current = waitingAny;
  const settle = React.useCallback(() => { if (waitingRef.current) bump(); }, []);
  React.useEffect(() => {
    if (!on) return;
    let rest: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      engaged.current.scrolling = true;
      clearTimeout(rest);
      rest = setTimeout(() => { engaged.current.scrolling = false; settle(); }, SCROLL_REST_MS);
    };
    const onSelection = () => {
      const selection = document.getSelection();
      const root = rootEl.current;
      const now = Boolean(selection && !selection.isCollapsed && root && selection.anchorNode && root.contains(selection.anchorNode));
      if (now === engaged.current.selecting) return;
      engaged.current.selecting = now;
      if (!now) settle();
    };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("selectionchange", onSelection);
    let observer: IntersectionObserver | undefined;
    if (head.current && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(([entry]) => {
        const out = !entry?.isIntersecting;
        if (out === engaged.current.headOut) return;
        engaged.current.headOut = out;
        if (!out) settle();
      });
      observer.observe(head.current);
    }
    return () => { window.removeEventListener("scroll", onScroll, { capture: true }); document.removeEventListener("selectionchange", onSelection); observer?.disconnect(); clearTimeout(rest); };
  }, [on, settle]);

  // ---- the one polite line: the count, 400ms after a burst's last arrival, then not again for 10 seconds (the next says the total since)
  const heard = React.useRef<Set<string> | null>(null);
  const since = React.useRef(0);
  const lastSaid = React.useRef(-Infinity);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keyText = keys.join("\u0000");
  React.useEffect(() => {
    if (!on) return;
    const known = heard.current;
    const lines = items.filter((item) => item.type !== EventLogRule).map((item) => String(item.key));
    heard.current = new Set(keys);
    if (!known) return;
    const fresh = lines.filter((key) => !known.has(key)).length;
    if (!fresh || !announce) return;
    since.current += fresh;
    clearTimeout(timer.current);
    const say = () => { lastSaid.current = Date.now(); setSpoken(newLabel(since.current)); since.current = 0; };
    timer.current = setTimeout(function wait() {
      const left = lastSaid.current + QUIET_MS - Date.now();
      if (left > 0) { timer.current = setTimeout(wait, left); return; }
      say();
    }, SETTLE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, keyText, announce]);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  if (!on) return null;
  const drawn = items.filter((item) => nextVisible?.has(String(item.key)));
  return {
    lines: drawn,
    waiting: waitingAny ? Math.max(1, waiting) : 0,
    head,
    spoken,
    release: () => { pressed.current = true; bump(); },
    rootProps: {
      ref: rootEl,
      onPointerEnter: () => { engaged.current.pointer = true; },
      onPointerLeave: () => { engaged.current.pointer = false; settle(); },
      onFocus: () => { engaged.current.focus = true; },
      onBlur: (event: React.FocusEvent) => {
        if (event.relatedTarget instanceof Node && rootEl.current?.contains(event.relatedTarget)) return;
        engaged.current.focus = false;
        settle();
      },
    },
  };
}

export interface EventLogRuleProps extends Omit<React.ComponentProps<"li">, "children"> {
  /** A day ("Nov 17") or where new events begin ("New since you left"). */
  children: string;
}

/** A labelled rule: a hairline either side of a 12px tertiary word. Not focusable, and no line of its own to read. */
export function EventLogRule({ children, className, ...props }: EventLogRuleProps) {
  return <li {...props} className={join("basalt-event-rule", className)}><span aria-hidden="true" className="basalt-event-rule-line" /><span className="basalt-event-rule-word">{children}</span><span aria-hidden="true" className="basalt-event-rule-line" /></li>;
}

export interface EventLineProps extends Omit<React.ComponentProps<"a">, "children" | "ref" | "href"> {
  verb: React.ReactNode;
  object: React.ReactNode;
  /** A quieter second line: tertiary, one line, cut with an ellipsis. */
  detail?: React.ReactNode;
  /** The time as the app writes it. */
  time: string;
  /** The same moment for machines. */
  dateTime?: string;
  /** New since the reader came (V4): a 6px dot in the seat that every line keeps, and primary ink; no weight change. The app says when it is read. */
  unread?: boolean;
  /** Where it goes: a link. Without one and with `onClick`, the line is a button; with neither, a plain line (cimip-gaps-3 T2, item 7). */
  href?: string;
}

/**
 * One event: a link with `href`, a button with `onClick`, or a plain line with neither (a log of changes): a `div` with no tab stop, no hover wash and no
 * pointer, which the arrows skip; its `object` or `detail` may hold a `Link`, its own tab stop. The dot's seat is always there, filled only while the line
 * is `unread`, so reading a line moves nothing; an unread line is also said in words ("New: ") for a reader who does not see the dot.
 */
export function EventLine({ verb, object, detail, time, dateTime, unread = false, href, className, ...props }: EventLineProps) {
  const widest = React.useContext(WidestContext);
  const body = (
    <>
      <span className="basalt-event-dot" aria-hidden="true" />
      <EventTime dateTime={dateTime} widest={widest}>{time}</EventTime>
      <span className="basalt-event-main">
        <EventText verb={<>{unread ? <span className="basalt-visually-hidden">New: </span> : null}{verb}</>} object={object} />
        {detail ? <span className="basalt-event-detail">{detail}</span> : null}
      </span>
    </>
  );
  if (href === undefined && props.onClick === undefined) {
    const { target: _target, rel: _rel, download: _download, hrefLang: _hrefLang, ping: _ping, referrerPolicy: _referrer, type: _type, media: _media, ...rest } = props;
    return (
      <li className="basalt-event-item">
        <div {...(rest as React.ComponentProps<"div">)} className={join("basalt-event-line", className)} data-plain="" data-unread={unread ? "" : undefined}>{body}</div>
      </li>
    );
  }
  const common = { "data-event-line": "", "data-unread": unread ? "" : undefined, tabIndex: -1, className: join("basalt-event-line", className) };
  return (
    <li className="basalt-event-item">
      {href ? <a {...props} {...common} href={href}>{body}</a> : <button {...(props as unknown as React.ComponentProps<"button">)} {...common} type="button">{body}</button>}
    </li>
  );
}
