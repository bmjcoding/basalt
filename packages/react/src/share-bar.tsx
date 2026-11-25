import * as React from "react";

import { NewTabGlyph, NewTabWords, opensNewTab } from "./new-tab";
import { safeHref } from "./safe-href";
import { shareOf } from "./share-of";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// A share bar (DECISIONS 153, votes 12 and 13; cimip-gaps-3 T2, items 1 and 13): parts of a whole as one bar. A part is as long as its share, with a floor
// (12px on `md`, 8px on `sm`) taken from the other parts, so the bar keeps its width; the 4px gap stays. A part's ink is neutral (`chart-observed`) or a
// named status, never a token or a colour passed in. The words are the content: inline, under each part, only when every part's share and name fit on one
// line each within the part's own segment less space-2 (the last part: its whole segment), so two neighbours' words are always 8px apart; otherwise, all or
// none, the bar is drawn alone and the words are one legend under it in the bar's order. A part may be a link or a button: the same element in both forms, so
// a change of form never drops focus. Nothing here runs when the module loads.

/** One part of the whole. `value` is any positive number; the shares come from the values, so they add to 100. */
export interface SharePart {
  /** A stable key. Defaults to the name. */
  id?: string;
  name: string;
  value: number;
  /** The segment's ink (and the legend swatch's): `neutral` (the default, `chart-observed`) or a status. The share and the name keep their inks. */
  tone?: "neutral" | "success" | "warning" | "danger";
  /** The part is a link (through `safeHref`): the whole part inline, the legend item in the legend form. */
  href?: string;
  target?: string;
  rel?: string;
  /** The part is a button. With `href` too, `href` wins (development warns). A press that narrows a list is a shortcut to that list's filter: no pressed state. */
  onSelect?: (part: SharePart) => void;
}

export interface ShareBarProps extends Omit<React.ComponentProps<"ul">, "children"> {
  parts: SharePart[];
  /** 8px (`space-2`, a plan) or 12px (`space-3`, a tally). A part's floor is 8px on `sm` and 12px on `md`. */
  size?: "sm" | "md";
  /** How a part's share is written, from the share in whole percent. Default "40%". */
  format?: (share: number, part: SharePart) => string;
  /**
   * `inline` puts each part's words under its segment; `legend` draws the bar alone and the words in a list under it. `auto` (the default) measures before the
   * first client paint, when fonts are ready, on a resize and when `parts` or `format` change, and draws the inline form only when every part's words fit. A
   * server render in `auto` draws the inline form, so a page that knows its form pins it.
   */
  form?: "auto" | "inline" | "legend";
  /** The words a new-tab part adds to its name, in the app's language. Default "(opens in a new tab)". */
  newTabLabel?: string;
}

/** The segments' lengths in px for a bar `width` wide: proportional, each at least `floor`, the floor taken from the others (as flex's min-width does). */
export function shareLengths(values: ReadonlyArray<number>, width: number, gap: number, floor: number): number[] {
  const room = Math.max(0, width - gap * Math.max(0, values.length - 1));
  const out = values.map(() => 0);
  const fixed = new Set<number>();
  for (;;) {
    const free = values.reduce((sum, v, i) => (fixed.has(i) ? sum : sum + v), 0);
    const left = room - fixed.size * floor;
    let changed = false;
    values.forEach((v, i) => {
      if (fixed.has(i)) { out[i] = floor; return; }
      out[i] = free > 0 ? (v / free) * left : 0;
      if (out[i]! < floor) { fixed.add(i); changed = true; }
    });
    if (!changed) return out;
  }
}

const shareWords = (share: number, many: boolean) =>
  share === 0
    ? <><span aria-hidden="true">&lt;1%</span><span className="basalt-visually-hidden">less than 1%</span></>
    : share === 100 && many
      ? <><span aria-hidden="true">&gt;99%</span><span className="basalt-visually-hidden">more than 99 percent</span></>
      : `${share}%`;

/**
 * Parts of a whole as one bar. The bar is decoration and the words are the content, so a screen reader reads each part once ("40%, Protein"). A part of nothing
 * draws no bar and is left out; a part that is more than nothing and rounds to 0 reads "<1%" to the eye and "less than 1%" to assistive technology (DECISIONS
 * 157, Q4); a part that rounds to 100 beside a part that is not empty reads ">99%" and is spoken "more than 99 percent" (DECISIONS 167, Q11b), since "100%"
 * would say the rest is nothing; every other share is a whole number. The root is a `ul` and each part one `li` in either form.
 */
export function ShareBar({ parts, size = "sm", format, form = "auto", newTabLabel, className, style, ...props }: ShareBarProps) {
  const kept = parts.filter((part) => Number.isFinite(part.value) && part.value > 0);
  const shares = shareOf(kept.map((part) => part.value));
  const total = kept.reduce((sum, part) => sum + part.value, 0);
  const ref = React.useRef<HTMLUListElement>(null);
  const [measured, setMeasured] = React.useState<{ form: "inline" | "legend"; lengths: number[] | null; gap: number }>({ form: form === "legend" ? "legend" : "inline", lengths: null, gap: 0 });
  const drawn = form === "auto" ? measured.form : form;
  const acts = kept.some((part) => part.href !== undefined || part.onSelect !== undefined);

  if (process.env.NODE_ENV !== "production") {
    for (const part of kept) if (part.href !== undefined && part.onSelect) console.warn(`Basalt ShareBar: "${part.name}" has both \`href\` and \`onSelect\`; the link wins.`);
  }

  // The words written out, so the measure reads what is drawn: a change of a part's value, its name or `format` measures again.
  const key = kept.map((part, i) => `${part.id ?? part.name}\u0000${part.name}\u0000${format ? format(shares[i]!, part) : shares[i]}\u0000${part.href ?? ""}${part.onSelect ? "\u0001" : ""}`).join("\u0002");
  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const css = getComputedStyle(el);
    const px = (name: string) => Number.parseFloat(css.getPropertyValue(name)) || 0;
    const gap = px("--basalt-space-1");
    const floor = px(size === "md" ? "--basalt-space-3" : "--basalt-space-2");
    const apart = px("--basalt-space-2");
    const width = el.getBoundingClientRect().width;
    const lengths = shareLengths(kept.map((part) => part.value), width, gap, floor);
    // The words' own one-line widths, read in one forced layout with nothing wrapping, then put back before paint.
    el.setAttribute("data-measuring", "");
    const items = [...el.querySelectorAll<HTMLElement>(":scope > .basalt-share-part")];
    const words = items.map((li) => {
      const value = li.querySelector<HTMLElement>(".basalt-share-value");
      const name = li.querySelector<HTMLElement>(".basalt-share-name");
      return Math.max(value?.getBoundingClientRect().width ?? 0, name?.getBoundingClientRect().width ?? 0);
    });
    el.removeAttribute("data-measuring");
    const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    const tap = px("--basalt-size-tap-min");
    const fits = kept.every((part, i) => {
      const room = (lengths[i] ?? 0) - (i === kept.length - 1 ? 0 : apart);
      if ((words[i] ?? 0) > room + 0.5) return false;
      return !(coarse && (part.href !== undefined || part.onSelect !== undefined) && (lengths[i] ?? 0) < tap);
    });
    const next = fits ? "inline" : "legend";
    setMeasured((was) => (was.form === next && was.gap === gap && was.lengths?.join() === lengths.join() ? was : { form: next, lengths, gap }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size]);

  React.useLayoutEffect(() => {
    if (form !== "auto" && form !== "legend") return;
    measure();
    const el = ref.current;
    if (!el) return;
    let live = true;
    void document.fonts?.ready.then(() => { if (live) measure(); });
    if (typeof ResizeObserver === "undefined") return () => { live = false; };
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => { live = false; observer.disconnect(); };
  }, [form, measure]);

  const legend = drawn === "legend";
  // The legend's segments stand in the bar's row, placed from the measured lengths; before a measure (a pinned legend on a server) from the shares alone.
  const lengths = legend ? measured.lengths : null;
  let start = 0;
  return (
    <ul {...props} ref={ref} role="list" className={join("basalt-share", className)} data-size={size} data-form={drawn} data-acts={acts ? "" : undefined} style={{ "--_count": kept.length, ...style } as React.CSSProperties}>
      {kept.map((part, index) => {
        const share = shares[index]!;
        const before = kept.slice(0, index).reduce((sum, p) => sum + p.value, 0);
        const segment: React.CSSProperties = lengths
          ? { "--_start": `${start}px`, "--_length": `${lengths[index]}px` } as React.CSSProperties
          : { "--_before": (before / total) * 100, "--_index": index } as React.CSSProperties;
        if (lengths) start += (lengths[index] ?? 0) + measured.gap;
        const words = (
          <>
            <b className="basalt-share-value">{format ? format(share, part) : shareWords(share, kept.length > 1)}</b>
            <span className="basalt-visually-hidden"> </span>
            <span className="basalt-share-name">{part.name}</span>
          </>
        );
        const href = part.href !== undefined ? safeHref(part.href) : null;
        const newTab = href !== null && opensNewTab(part.target);
        let item: React.ReactNode;
        if (part.href !== undefined) {
          const rel = newTab ? [...new Set([...(part.rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : part.rel;
          item = (
            <a className="basalt-share-item" data-acts="" href={href ?? undefined} target={part.target} rel={rel}>
              {legend ? <span className="basalt-share-swatch" data-tone={part.tone ?? "neutral"} aria-hidden="true" /> : null}
              {words}
              {newTab ? <><NewTabGlyph /><NewTabWords label={newTabLabel} /></> : null}
            </a>
          );
        } else if (part.onSelect) {
          const select = part.onSelect;
          item = (
            <button type="button" className="basalt-share-item" data-acts="" onClick={() => select(part)}>
              {legend ? <span className="basalt-share-swatch" data-tone={part.tone ?? "neutral"} aria-hidden="true" /> : null}
              {words}
            </button>
          );
        } else {
          item = (
            <span className="basalt-share-item">
              {legend ? <span className="basalt-share-swatch" data-tone={part.tone ?? "neutral"} aria-hidden="true" /> : null}
              {words}
            </span>
          );
        }
        return (
          <li key={part.id ?? part.name} className="basalt-share-part" style={{ "--_share": (part.value / total) * 100, ...segment } as React.CSSProperties}>
            <span className="basalt-share-bar" data-tone={part.tone ?? "neutral"} aria-hidden="true" />
            {item}
          </li>
        );
      })}
    </ul>
  );
}
