import * as React from "react";

import { Reserve } from "./reserve";
import { join } from "./utils";

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
  children: React.ReactNode;
}

const LINES = "[data-event-line]";

/**
 * A feed of events as links, with one tab stop (the arrows, Home and End move between lines). Lines may stand under day rules
 * (`EventLogRule`). The list keeps `space-1-5` from its own edge for the ring, which is the control ring at +2 outside each line. It does
 * not follow its tail: where the list scrolls, follow the end only while the reader is at it, as a `Terminal` does.
 */
export function EventLog({ label, locale = "en-US", widest = widestDayStamp(locale), className, children, onKeyDown, onFocus, ...props }: EventLogProps) {
  const root = React.useRef<HTMLUListElement>(null);
  // One tab stop: the line last focused, else the first. The attribute is set on the DOM, so the lines' own props never change.
  React.useLayoutEffect(() => {
    const lines = [...(root.current?.querySelectorAll<HTMLElement>(LINES) ?? [])];
    if (!lines.length || lines.some((line) => line.tabIndex === 0)) return;
    lines[0]!.tabIndex = 0;
  });
  return (
    <WidestContext.Provider value={widest}>
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
        {children}
      </ul>
    </WidestContext.Provider>
  );
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
  /** Where it goes: a link. Without one the line is a button. */
  href?: string;
}

/**
 * One event: a link (or a button). The dot's seat is always there, filled only while the line is `unread`, so reading a line moves
 * nothing; an unread line is also said in words ("New: ") for a reader who does not see the dot.
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
  const common = { "data-event-line": "", "data-unread": unread ? "" : undefined, tabIndex: -1, className: join("basalt-event-line", className) };
  return (
    <li className="basalt-event-item">
      {href ? <a {...props} {...common} href={href}>{body}</a> : <button {...(props as unknown as React.ComponentProps<"button">)} {...common} type="button">{body}</button>}
    </li>
  );
}
