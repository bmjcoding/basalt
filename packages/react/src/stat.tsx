import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import * as React from "react";

import { NOT_OBSERVED } from "./description-list";
import { DotSep } from "./dot-sep";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "./feedback";
import { ArrowRightGlyph } from "./glyphs/arrow-right";
import { ExternalGlyph } from "./glyphs/external";
import { Icon } from "./icon";
import { NewTabWords, opensNewTab } from "./new-tab";
import { safeHref } from "./safe-href";
import { join } from "./utils";
import { formatStatTime } from "./time-format";

declare const process: { env: { NODE_ENV?: string } };

export interface StatsProps extends Omit<React.ComponentProps<"dl">, "children"> {
  /** The narrowest a stat gets before the row wraps: a CSS length, or a number of px. Default 10rem. */
  min?: string | number;
  children: React.ReactNode;
}

/** A row of figures on the page, never boxed: up to three that matter, or one headline. One `dl`; each `Stat` is a `div` in it. */
export function Stats({ min, style, className, children, ...props }: StatsProps) {
  const width = typeof min === "number" ? `${min}px` : min;
  return (
    <dl {...props} className={join("basalt-stats", className)} style={width ? ({ "--min": width, ...style } as React.CSSProperties) : style}>
      {children}
    </dl>
  );
}

export type StatProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** What the figure measures. */
  label: React.ReactNode;
  /** What the figure means: "−0.6 kg this week". Interpretation, not evidence. */
  note?: React.ReactNode;
  /** Where the figure came from: "Scale". Without it the source line is left out. */
  source?: React.ReactNode;
  /** When it was measured. Always written absolute ("4:41 AM" in `en-US`), never "2 min ago". */
  time?: Date | number;
  /** The zone the time is written in: an IANA name. Defaults to the runtime's. */
  timeZone?: string;
  /** What counts as today, for the date to be left out of the time. Defaults to now. */
  now?: Date | number;
  locale?: string | string[];
  /**
   * The stat is a link (cimip-gaps-3 T2, item 2): the whole cell is the target at every pointer (the link is round the figure, inside its `dd`, and stretched
   * over the cell), with the core arrow after the figure (`external` and the hidden new-tab words with `target="_blank"`). Its name is the label and the
   * figure, then the new-tab words; its description is the note. With `href`, the note and the source hold nothing that acts.
   */
  href?: string;
  target?: string;
  rel?: string;
  /** The words a new-tab stat adds to its name, in the app's language. Default "(opens in a new tab)". */
  newTabLabel?: string;
  /** An explanation of the label, behind an info button after it: a popover titled `hintTitle` (or the label), holding `hint` (it may hold a link). */
  hint?: React.ReactNode;
  hintTitle?: React.ReactNode;
  /** The info button's name. Default "About " and the label, when the label is a string. */
  hintLabel?: string;
} & (
  /** The reading could have been taken and was not: `value` is the app's absence words ("No reading yet"), "Not observed" when left out. */
  | { missing: true; value?: React.ReactNode }
  | { missing?: false; value: React.ReactNode }
);

/**
 * One figure: a label, the figure, a note and, below them all, where it came from and when. A `div` of a `dl`: the label is the
 * `dt`; the figure, the note and the source are `dd`s. The source is pinned to the foot of the stat's cell, so sources line up
 * across a row even when one stat has no note.
 */
export function Stat({ label, value, note, source, time, timeZone, now, locale, href, target, rel, newTabLabel, hint, hintTitle, hintLabel, missing, className, ...props }: StatProps) {
  const stamp = source !== undefined && source !== null && time !== undefined ? formatStatTime(time, { now, timeZone, locale }) : null;
  const ids = React.useId();
  const [labelId, figureId, noteId, newTabId] = [`${ids}l`, `${ids}f`, `${ids}n`, `${ids}t`];
  const linked = href !== undefined;
  const safe = linked ? safeHref(href) : null;
  const newTab = linked && opensNewTab(target);
  const relation = newTab ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;
  const hasNote = note !== undefined && note !== null && note !== false && note !== "";
  const absent = missing === true;
  const figure = absent ? <span className="basalt-stat-missing">{value ?? NOT_OBSERVED}</span> : value;
  const hintName = hintLabel ?? (typeof label === "string" ? `About ${label}` : "More information");
  if (process.env.NODE_ENV !== "production" && hint !== undefined && hintLabel === undefined && typeof label !== "string") console.warn("Basalt Stat: a hint beside a label that is not a string needs `hintLabel`; it is named \"More information\".");

  // Development: with `href`, the note and the source hold nothing that acts (the whole cell is the link).
  const root = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !linked) return;
    if (root.current?.querySelector(":is(.basalt-stat-note, .basalt-stat-source) :is(a[href], button, input, select, textarea, [tabindex])")) console.warn("Basalt Stat: a linked stat's note or source holds a control; the whole cell is the link, so nothing in it may act.");
  });

  const cue = newTab ? ExternalGlyph : ArrowRightGlyph;
  return (
    <div {...props} ref={root} className={join("basalt-stat", className)} data-linked={linked ? "" : undefined} data-missing={absent ? "" : undefined}>
      {/* The label, the figure and the note are separate elements with no space between them, so a text scan (and a name built from the content) would run them together: a hidden space ends each. */}
      <dt className="basalt-stat-label">
        <span id={labelId}>{label}</span>
        {hint !== undefined ? (
          <Popover>
            <PopoverTrigger className="basalt-stat-hint" aria-label={hintName}><Icon icon={InfoIcon} size={16} /></PopoverTrigger>
            <PopoverContent side="bottom" align="start">
              <PopoverTitle>{hintTitle ?? label}</PopoverTitle>
              <PopoverDescription render={<div />}>{hint}</PopoverDescription>
            </PopoverContent>
          </Popover>
        ) : null}
        <span className="basalt-visually-hidden"> </span>
      </dt>
      <dd className="basalt-stat-value">
        {linked ? (
          <a
            className="basalt-stat-link"
            href={safe ?? undefined}
            target={target}
            rel={relation}
            aria-labelledby={newTab ? `${labelId} ${figureId} ${newTabId}` : `${labelId} ${figureId}`}
            aria-describedby={hasNote ? noteId : undefined}
          >
            <span id={figureId}>{figure}</span>
            <span className="basalt-stat-cue" aria-hidden="true"><Icon icon={cue} size={absent ? 16 : 20} /></span>
            {newTab ? <NewTabWords id={newTabId} label={newTabLabel} /> : null}
          </a>
        ) : figure}
        <span className="basalt-visually-hidden"> </span>
      </dd>
      {hasNote ? <dd className="basalt-stat-note" id={noteId}>{note}<span className="basalt-visually-hidden"> </span></dd> : null}
      {source !== undefined && source !== null ? (
        <dd className="basalt-stat-source">
          {stamp ? (
            <>
              <time dateTime={stamp.dateTime}>{stamp.text}</time><DotSep spaced />
            </>
          ) : null}
          {source}
        </dd>
      ) : null}
    </div>
  );
}
