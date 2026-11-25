import * as React from "react";

import { NOT_OBSERVED } from "./description-list";
import { Kbd } from "./kbd";
import { inLevel, usePanelLevel } from "./layers";
import type { SurfaceLevel } from "./layers";
import { Reserve } from "./reserve";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// ---- A heatmap (cimip-gaps-3 T2, item 8): a value a day, weeks across and weekdays down ----
// Squares of one whole-pixel size (as large as fits the measured width, 12 to 20px) 2px apart, radius-2xs. Nothing scrolls sideways: when the weeks do not
// fit at 12px the newest that fit are drawn and a line under the grid says so. Level 0 is an empty cell with a border-input edge; above 0, four fills
// (chart-heat-1 to -4); a day not observed is the chart's hatch. The key says the ranges in words; the readout is the picked day, every seat holding its
// widest form. One tab stop: a grid of seven rows (a weekday each, its header hidden where it is not drawn) whose cells are the days. The table is the still
// table and holds every day. At rest, never a page's entrance; a changed value's fill crosses over duration-slow. Nothing here runs when the module loads.

export interface HeatmapDay {
  /** The day, as an ISO UTC date ("2026-11-25"). Oldest first. */
  date: string;
  /** The day's value; `null` is not observed (never zero). */
  value: number | null;
  /** Why a day was not observed ("scheduled service"): in its name, the readout and the table's Note. */
  why?: string | null;
}

export interface HeatmapProps extends Omit<React.ComponentProps<"figure">, "children" | "title"> {
  title: string;
  /** The title's heading level. Default 3. */
  heading?: 2 | 3 | 4 | 5 | 6;
  /** Where the values came from, under the title. */
  source?: React.ReactNode;
  days: HeatmapDay[];
  /** The figure's caption, required: what the figure shows, in a sentence. */
  summary: React.ReactNode;
  /** Writes a day's value with its unit ("26 batches"). */
  format: (value: number) => string;
  /** Writes the key's numbers. Default: a grouped number (whole data), or the fewest decimal places, three at most, at which every bound differs. */
  formatShort?: (value: number) => string;
  /** The lower bounds of levels 2, 3 and 4. Left out, the peak in four equal parts (whole bounds when the data is whole). */
  thresholds?: readonly [number, number, number];
  /** The week's first day: 0 Sunday (the default) or 1 Monday. */
  weekStart?: 0 | 1;
  /** The line under a cut grid, from the first and last day drawn, written as dates. Default "Showing Sep 3 to Nov 25. Earlier days are in the table." */
  cutNote?: (from: string, to: string) => string;
  locale?: string;
}

const DAY = 86_400_000;
const parse = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
};
const shapeOf = (text: string) => text.replace(/\d/g, "0");
const unique = <T,>(list: T[]) => [...new Set(list)];
const defaultCut = (from: string, to: string) => `Showing ${from} to ${to}. Earlier days are in the table.`;

/** The lower bounds of levels 2, 3 and 4 when none are given: whole data takes floor(peak × k / 4) + 1; other data a quarter, a half and three quarters. */
export function heatBounds(values: ReadonlyArray<number>, thresholds?: readonly [number, number, number]): { bounds: [number, number, number]; whole: boolean; peak: number } {
  const peak = values.reduce((max, v) => Math.max(max, v), 0);
  const whole = values.every((v) => Number.isInteger(v));
  if (thresholds) return { bounds: [...thresholds] as [number, number, number], whole, peak };
  const bounds = [1, 2, 3].map((k) => (whole ? Math.floor((peak * k) / 4) + 1 : (peak * k) / 4)) as [number, number, number];
  return { bounds, whole, peak };
}

/** A value's level: 0 for zero (or less), else the highest level whose bound it reaches (1 under the first bound). */
export function heatLevel(value: number, bounds: readonly [number, number, number]): 0 | 1 | 2 | 3 | 4 {
  if (!(value > 0)) return 0;
  if (value >= bounds[2]) return 4;
  if (value >= bounds[1]) return 3;
  if (value >= bounds[0]) return 2;
  return 1;
}

/** The fewest decimal places, three at most, at which every bound (and 0) is written differently. */
function boundDecimals(bounds: readonly number[], locale: string | undefined) {
  for (let d = 0; d <= 3; d += 1) {
    const f = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: d });
    const written = [0, ...bounds].map((b) => f.format(b));
    if (new Set(written).size === written.length) return d;
  }
  return 3;
}

export interface HeatKeyItem { level: 0 | 1 | 2 | 3 | 4 | "missing"; words: string }

/**
 * The key's items (exported for the tests): the ranges in words, never ends alone. A level no value can be in is left out, a range of one value is that
 * number, and no words repeat. A peak of 0 is the "0" item alone; a figure with every day missing is "Not observed" alone.
 */
export function heatKey(days: ReadonlyArray<HeatmapDay>, { thresholds, formatShort, locale }: { thresholds?: readonly [number, number, number]; formatShort?: (value: number) => string; locale?: string } = {}): HeatKeyItem[] {
  const observed = days.filter((d) => d.value !== null).map((d) => d.value as number);
  const missing = days.some((d) => d.value === null);
  const items: HeatKeyItem[] = [];
  if (observed.length) {
    const { bounds, whole, peak } = heatBounds(observed, thresholds);
    const short = formatShort ?? (whole ? (v: number) => new Intl.NumberFormat(locale).format(v) : ((d) => (v: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: d }).format(v))(boundDecimals(bounds, locale)));
    if (process.env.NODE_ENV !== "production" && formatShort) {
      const written = bounds.map(short);
      if (new Set(written).size < written.length) console.warn("Basalt Heatmap: `formatShort` writes two neighbouring bounds alike; the key would repeat its words.");
    }
    items.push({ level: 0, words: short(0) });
    if (peak > 0) {
      const [b1, b2, b3] = bounds;
      if (whole) {
        const range = (from: number, to: number) => (to < from ? null : from === to ? short(from) : `${short(from)} to ${short(to)}`);
        const ranges: [1 | 2 | 3 | 4, string | null][] = [[1, range(1, b1 - 1)], [2, range(b1, b2 - 1)], [3, range(b2, b3 - 1)], [4, `${short(b3)} and over`]];
        for (const [level, words] of ranges) if (words !== null) items.push({ level, words });
      } else {
        const ranges: [1 | 2 | 3 | 4, string | null][] = [
          [1, b1 > 0 ? `Under ${short(b1)}` : null],
          [2, b2 > b1 ? `${short(b1)} to under ${short(b2)}` : null],
          [3, b3 > b2 ? `${short(b2)} to under ${short(b3)}` : null],
          [4, `${short(b3)} and over`],
        ];
        for (const [level, words] of ranges) if (words !== null) items.push({ level, words });
      }
    }
  }
  if (missing) items.push({ level: "missing", words: NOT_OBSERVED });
  // Never the same words twice.
  return items.filter((item, i) => items.findIndex((other) => other.words === item.words) === i);
}

interface Cell { index: number; col: number; row: number }

/** A value a day as a calendar of squares. See the module note. */
export function Heatmap({ title, heading = 3, source, days, summary, format, formatShort, thresholds, weekStart = 0, cutNote = defaultCut, locale, className, ...props }: HeatmapProps) {
  const ids = React.useId();
  const [titleId, captionId, keysId, tableId] = [`${ids}t`, `${ids}c`, `${ids}k`, `${ids}g`];
  const level = usePanelLevel();
  const formats = React.useMemo(() => ({
    name: new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
    line: new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    short: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }),
    shortYear: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    month: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }),
    weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
    weekdayLong: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }),
  }), [locale]);

  // ---- the calendar: a column a week, a row a weekday
  const stamps = days.map((d) => parse(d.date));
  const first = stamps[0] ?? 0;
  const rowOf = (ms: number) => (new Date(ms).getUTCDay() - weekStart + 7) % 7;
  const gridStart = first - rowOf(first) * DAY;
  const cells: Cell[] = stamps.map((ms, index) => ({ index, col: Math.floor((ms - gridStart) / DAY / 7), row: rowOf(ms) }));
  const weeks = cells.length ? cells[cells.length - 1]!.col + 1 : 0;
  if (process.env.NODE_ENV !== "production" && weeks > 53) console.warn(`Basalt Heatmap: ${weeks} weeks is more than a year; draw 53 at most (the rest is in the table).`);

  const observed = days.filter((d) => d.value !== null).map((d) => d.value as number);
  const { bounds } = heatBounds(observed, thresholds);
  const key = heatKey(days, { thresholds, formatShort, locale });
  const keySentence = key.map((item) => item.words).join(", ");

  // ---- the size: whole pixels, 12 to 20, from the measured width; past it the newest weeks that fit at 12
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState<{ size: number; weeks: number } | null>(null);
  React.useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => {
      const css = getComputedStyle(el);
      const px = (name: string, fallback: number) => Number.parseFloat(css.getPropertyValue(name)) || fallback;
      const gap = px("--basalt-space-0-5", 2);
      const ring = px("--basalt-space-1", 4);
      const gutter = (el.querySelector<HTMLElement>(".basalt-heatmap-gutter")?.getBoundingClientRect().width ?? 0);
      const room = el.getBoundingClientRect().width - gutter - ring * 2;
      const size = Math.floor((room + gap) / Math.max(1, weeks) - gap);
      const next = size >= 12 ? { size: Math.min(20, size), weeks } : { size: 12, weeks: Math.max(1, Math.floor((room + gap) / (12 + gap))) };
      setFit((was) => (was && was.size === next.size && was.weeks === next.weeks ? was : next));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [weeks]);
  const size = fit?.size ?? 12;
  const shownWeeks = Math.min(weeks, fit?.weeks ?? weeks);
  const firstCol = weeks - shownWeeks;
  const drawn = cells.filter((cell) => cell.col >= firstCol);
  const drawnFrom = drawn[0]?.index ?? 0;
  const cut = firstCol > 0;
  const lastIndex = days.length - 1;

  // ---- picking: hover, a tap that holds, a drag that scrubs, and the keys
  const latestObserved = (() => { for (let i = lastIndex; i >= 0; i -= 1) if (days[i]!.value !== null) return i; return lastIndex; })();
  const [hover, setHover] = React.useState<number | null>(null);
  const [pinned, setPinned] = React.useState<number | null>(null);
  const [focusDay, setFocusDay] = React.useState<number | null>(null);
  const [focusWithin, setFocusWithin] = React.useState(false);
  const stop = Math.max(drawnFrom, Math.min(lastIndex, focusDay ?? latestObserved));
  const picked = focusWithin ? stop : hover ?? pinned ?? latestObserved;
  const cellRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const at = (index: number) => {
    const ms = stamps[index]!;
    const day = days[index]!;
    return { ms, day };
  };
  const nameOf = (index: number) => {
    const { ms, day } = at(index);
    const date = formats.name.format(ms);
    return day.value === null ? `${date}: ${NOT_OBSERVED}${day.why ? `, ${day.why}` : ""}` : `${date}: ${format(day.value)}`;
  };

  const dayAtPoint = (event: React.PointerEvent) => {
    const el = gridRef.current?.querySelector<HTMLElement>(".basalt-heatmap-cells");
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const pitch = size + 2;
    const col = firstCol + Math.max(0, Math.min(shownWeeks - 1, Math.floor((event.clientX - box.left) / pitch)));
    const row = Math.max(0, Math.min(6, Math.floor((event.clientY - box.top) / pitch)));
    // The nearest day: the cell itself, else the nearest drawn day in its column, else the nearest drawn day.
    const found = drawn.find((c) => c.col === col && c.row === row) ?? drawn.filter((c) => c.col === col).sort((a, b) => Math.abs(a.row - row) - Math.abs(b.row - row))[0];
    return found?.index ?? null;
  };
  const dragging = React.useRef<{ x: number; y: number; scrub: boolean } | null>(null);

  // A tap outside lets a held day go.
  React.useEffect(() => {
    if (pinned === null) return;
    const away = (event: PointerEvent) => { if (!gridRef.current?.contains(event.target as Node)) setPinned(null); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [pinned]);

  const move = (to: number) => {
    const next = Math.max(drawnFrom, Math.min(lastIndex, to));
    setFocusDay(next);
    cellRefs.current[next]?.focus();
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const from = stop;
    const to = event.key === "ArrowRight" ? from + 7 : event.key === "ArrowLeft" ? from - 7 : event.key === "ArrowDown" ? from + 1 : event.key === "ArrowUp" ? from - 1
      : event.key === "PageDown" ? from + 28 : event.key === "PageUp" ? from - 28 : event.key === "Home" ? drawnFrom : event.key === "End" ? lastIndex : null;
    if (to === null) return;
    event.preventDefault();
    // A day index steps by calendar days only where the days are consecutive; otherwise the nearest drawn day to that date.
    const target = stamps[from]! + (to - from) * DAY;
    let best = to;
    if (event.key !== "Home" && event.key !== "End") {
      let gap = Infinity;
      for (const c of drawn) { const d = Math.abs(stamps[c.index]! - target); if (d < gap) { gap = d; best = c.index; } }
    }
    move(best);
  };

  // ---- the month row: a month's name above the column where it begins; of two under space-2 apart, the one with fewer columns is left out
  const months: { col: number; text: string; cols: number }[] = [];
  for (const c of drawn) {
    const date = new Date(stamps[c.index]!);
    if (date.getUTCDate() === 1 || c.index === drawnFrom) {
      const text = formats.month.format(stamps[c.index]!);
      if (!months.some((m) => m.col === c.col)) months.push({ col: c.col, text, cols: 0 });
    }
  }
  months.forEach((m, i) => { m.cols = (months[i + 1]?.col ?? weeks) - m.col; });
  const monthRow = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const row = monthRow.current;
    if (!row) return;
    const labels = [...row.children] as HTMLElement[];
    for (const l of labels) l.removeAttribute("data-hidden");
    const space = Number.parseFloat(getComputedStyle(row).getPropertyValue("--basalt-space-2")) || 8;
    for (let i = 0; i < labels.length - 1; i += 1) {
      const a = labels[i]!;
      if (a.hasAttribute("data-hidden")) continue;
      const b = labels[i + 1]!;
      if (b.getBoundingClientRect().left - a.getBoundingClientRect().right < space) {
        const loser = Number(a.dataset.cols) < Number(b.dataset.cols) ? a : b;
        loser.setAttribute("data-hidden", "");
      }
    }
  });

  // ---- the readout: the picked day, each seat holding its widest form
  const pickedDay = days[picked];
  const dateText = pickedDay ? formats.line.format(stamps[picked]!) : "";
  const valueText = pickedDay ? (pickedDay.value === null ? NOT_OBSERVED : format(pickedDay.value)) : "";
  const whys = unique(days.map((d) => d.why).filter((w): w is string => Boolean(w)));
  const dateForms = unique(stamps.map((ms) => shapeOf(formats.line.format(ms))));
  const valueForms = unique([NOT_OBSERVED, ...observed.map((v) => shapeOf(format(v)))]);

  const weekdayRows = [0, 1, 2, 3, 4, 5, 6].map((row) => gridStart + row * DAY);
  const [open, setOpen] = React.useState(false);
  const Heading = `h${heading}` as const;
  const fromText = cut ? (() => {
    const a = stamps[drawnFrom]!;
    const b = stamps[lastIndex]!;
    const years = new Date(a).getUTCFullYear() !== new Date(b).getUTCFullYear();
    return [(years ? formats.shortYear : formats.short).format(a), (years ? formats.shortYear : formats.short).format(b)] as const;
  })() : null;

  return (
    <figure {...props} aria-labelledby={titleId} className={join("basalt-chart basalt-heatmap", className)} style={{ "--_cell": `${size}px`, ...props.style } as React.CSSProperties}>
      <div className="basalt-chart-head">
        <Heading id={titleId} className="basalt-chart-title">{title}</Heading>
        {source ? <p className="basalt-chart-source">{source}</p> : null}
      </div>
      <p className="basalt-heatmap-readout">
        <Reserve className="basalt-heatmap-seat" show="now" alternatives={{ now: dateText, ...Object.fromEntries(dateForms.map((f, i) => [`d${i}`, f])) }} />
        <span className="basalt-heatmap-dot" aria-hidden="true">·</span>
        <Reserve className="basalt-heatmap-seat basalt-heatmap-value" show="now" alternatives={{ now: valueText, ...Object.fromEntries(valueForms.map((f, i) => [`v${i}`, f])) }} />
        {whys.length ? <Reserve className="basalt-heatmap-seat basalt-heatmap-why" show="now" alternatives={{ now: pickedDay?.value === null && pickedDay.why ? pickedDay.why : "", ...Object.fromEntries(whys.map((w, i) => [`w${i}`, w])) }} /> : null}
      </p>
      <ul className="basalt-heatmap-key" aria-label="Key">
        {key.map((item) => (
          <li key={String(item.level)} className="basalt-heatmap-key-item">
            <i className="basalt-heatmap-swatch" data-level={item.level === "missing" ? undefined : item.level} data-missing={item.level === "missing" ? "" : undefined} aria-hidden="true" />
            {item.words}
          </li>
        ))}
      </ul>
      <div
        ref={gridRef}
        className="basalt-heatmap-frame"
        onPointerMove={(event) => {
          if (event.pointerType === "touch") {
            const d = dragging.current;
            if (!d) return;
            if (!d.scrub && Math.abs(event.clientX - d.x) > Math.abs(event.clientY - d.y) && Math.abs(event.clientX - d.x) > 4) d.scrub = true;
            if (d.scrub) { const day = dayAtPoint(event); if (day !== null) setPinned(day); }
            return;
          }
          setHover(dayAtPoint(event));
        }}
        onPointerDown={(event) => {
          const day = dayAtPoint(event);
          if (event.pointerType === "touch") { dragging.current = { x: event.clientX, y: event.clientY, scrub: false }; if (day !== null) setPinned(day); }
          else setHover(day);
        }}
        onPointerUp={() => { dragging.current = null; }}
        onPointerCancel={() => { dragging.current = null; }}
        onPointerLeave={(event) => { if (event.pointerType !== "touch") setHover(null); }}
      >
        <div className="basalt-heatmap-gutter" aria-hidden="true">
          {weekdayRows.map((ms, row) => (row % 2 === 1 ? <span key={row} style={{ gridRow: row + 1 }}>{formats.weekday.format(ms)}</span> : null))}
        </div>
        <div ref={monthRow} className="basalt-heatmap-months" aria-hidden="true">
          {months.map((m) => <span key={m.col} data-cols={m.cols} style={{ "--_col": m.col - firstCol } as React.CSSProperties}>{m.text}</span>)}
        </div>
        <div
          role="grid"
          aria-labelledby={titleId}
          aria-describedby={`${captionId} ${keysId}`}
          className="basalt-heatmap-grid"
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            const index = Number((event.target as HTMLElement).dataset.i);
            if (Number.isInteger(index)) { setFocusDay(index); setFocusWithin(true); }
          }}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false); }}
        >
          <div className="basalt-heatmap-cells">
            {weekdayRows.map((ms, row) => (
              <div key={row} role="row" className="basalt-heatmap-row">
                <span role="rowheader" className="basalt-visually-hidden">{formats.weekdayLong.format(ms)}</span>
                {Array.from({ length: shownWeeks }, (_, k) => {
                  const col = firstCol + k;
                  const cell = drawn.find((c) => c.col === col && c.row === row);
                  if (!cell) return <span key={col} className="basalt-heatmap-blank" aria-hidden="true" />;
                  const day = days[cell.index]!;
                  const lvl = day.value === null ? null : heatLevel(day.value, bounds);
                  return (
                    <div
                      key={col}
                      ref={(element) => { cellRefs.current[cell.index] = element; }}
                      role="gridcell"
                      tabIndex={cell.index === stop ? 0 : -1}
                      aria-label={nameOf(cell.index)}
                      data-i={cell.index}
                      data-level={lvl ?? undefined}
                      data-missing={lvl === null ? "" : undefined}
                      data-picked={cell.index === picked ? "" : undefined}
                      className="basalt-heatmap-cell"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {cut && fromText ? <p className="basalt-heatmap-cut">{cutNote(fromText[0], fromText[1])}</p> : null}
      <span id={keysId} className="basalt-visually-hidden">{`Key: ${keySentence}. Arrow keys move a week or a day, Page Up and Page Down four weeks, Home and End to the ends.`}</span>
      <p className="basalt-chart-hint" data-kbd-hint="" aria-hidden="true">
        <span><Kbd>←</Kbd> <Kbd>→</Kbd> a week</span>
        <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> a day</span>
        <span><Kbd>PgUp</Kbd> <Kbd>PgDn</Kbd> four weeks</span>
        <span><Kbd>Home</Kbd> <Kbd>End</Kbd> the ends</span>
      </p>
      <div className="basalt-chart-foot">
        <button type="button" className="basalt-button basalt-chart-toggle" data-variant="secondary" data-size="sm" aria-expanded={open} aria-controls={tableId} onClick={() => setOpen((value) => !value)}>
          <span className="basalt-button-label">{open ? "Hide the table" : "View as table"}</span>
        </button>
      </div>
      <div id={tableId} className="basalt-chart-table" hidden={!open}>
        {open ? <HeatmapTable title={title} days={days} stamps={stamps} format={format} line={formats.line} level={level} /> : null}
      </div>
      <figcaption id={captionId} className="basalt-chart-summary">{summary}</figcaption>
    </figure>
  );
}

/** The still table: fixed layout from a colgroup, the date a pinned row header, newest first, the value end-aligned, a Note for `why`. Every day. */
function HeatmapTable({ title, days, stamps, format, line, level }: { title: string; days: HeatmapDay[]; stamps: number[]; format: (value: number) => string; line: Intl.DateTimeFormat; level: SurfaceLevel }) {
  const frame = React.useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = React.useState(false);
  React.useEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const mark = () => element.toggleAttribute("data-scrolled", Math.abs(element.scrollLeft) > 0);
    const measure = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    measure();
    element.addEventListener("scroll", mark, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { element.removeEventListener("scroll", mark); observer.disconnect(); };
  }, []);
  const rows: React.ReactNode[] = [];
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const day = days[i]!;
    rows.push(
      <tr key={day.date}>
        <th scope="row">{line.format(stamps[i]!)}</th>
        <td data-numeric="">{day.value === null ? <span className="basalt-chart-not-observed">{NOT_OBSERVED}</span> : format(day.value)}</td>
        <td className="basalt-chart-note">{day.value === null && day.why ? day.why.charAt(0).toUpperCase() + day.why.slice(1) : ""}</td>
      </tr>,
    );
  }
  return (
    <>
      <div ref={frame} className="basalt-table-container" data-row-density="default" data-level={level} role="region" aria-label={`${title} table`} tabIndex={0}>
        {inLevel(level, (
          <table className="basalt-table" data-fixed="" data-pinned="1" style={{ minWidth: "calc(2 * 8rem + 12rem)" }}>
            <colgroup><col style={{ width: "10rem" }} /><col style={{ width: "8rem" }} /><col /></colgroup>
            <caption className="basalt-visually-hidden">{title}, newest first</caption>
            <thead><tr><th scope="col">Date</th><th scope="col" data-numeric="">Value</th><th scope="col">Note</th></tr></thead>
            <tbody>{rows}</tbody>
          </table>
        ))}
      </div>
      {overflows ? <p className="basalt-chart-scroll-hint">Scroll sideways for every column.</p> : null}
    </>
  );
}
