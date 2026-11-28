import * as React from "react";

import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./feedback";
import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { SearchGlyph } from "./glyphs/search";
import { Icon } from "./icon";
import { NewTabGlyph, NewTabWords, opensNewTab } from "./new-tab";
import { safeHref } from "./safe-href";
import { Portless } from "./fade-port";
import { join } from "./utils";

// ---- A count and the names it counts (cimip-gaps-3 T2, item 10) ----
// The count is one inline button with TextButton's anatomy in the surrounding text's size ("6 analyzers", the 1px underline at rest, the core chevron-down at
// 16 that turns when open); a press opens a popover with the names. Zero is plain text in the surrounding ink; one is still the trigger, so a column's cells
// keep one form. The root is a `span` and the panel is portalled, so the part is valid inside a paragraph, a cell or a description value.

export interface CountName {
  id?: string;
  name: string;
  /** The name is a link: a focusable row in the list. */
  href?: string;
  target?: string;
  rel?: string;
  /** A fact after the name, in tertiary at `text-xs` (secondary on a linked row's hover wash). */
  detail?: React.ReactNode;
}

export interface CountNamesProps extends Omit<React.ComponentProps<"span">, "children" | "title"> {
  names: ReadonlyArray<string | CountName>;
  /** The noun for one and for many: "analyzer", "analyzers". */
  singular: string;
  plural: string;
  /** The trigger's words in another language. Default "6 analyzers". */
  label?: (count: number) => React.ReactNode;
  /** The true total when `names` is a part of it. Default `names.length`. */
  count?: number;
  /** The popover's title. Default: the trigger's words. */
  title?: React.ReactNode;
  /** What zero says, in the surrounding ink. Default "0 analyzers". */
  empty?: React.ReactNode;
  /** The foot's words when `names` is a part of the total. Default "Showing 50 of 128". */
  partialLabel?: (shown: number, total: number) => string;
  /** The filter appears from this many names (10 by default); `false` never. */
  searchFrom?: number | false;
  /** More in the foot: a link to the rest. */
  footer?: React.ReactNode;
  /** The words a new-tab name adds to its name. Default "(opens in a new tab)". */
  newTabLabel?: string;
}

const defaultPartial = (shown: number, total: number) => `Showing ${shown} of ${total}`;

/** A count that opens the names it counts. See the module note. */
export function CountNames({ names, singular, plural, label, count, title, empty, partialLabel = defaultPartial, searchFrom = 10, footer, newTabLabel, className, ...props }: CountNamesProps) {
  const items = names.map((entry): CountName => (typeof entry === "string" ? { name: entry } : entry));
  const total = count ?? items.length;
  const noun = total === 1 ? singular : plural;
  const words = label ? label(total) : `${total} ${noun}`;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const filterRef = React.useRef<HTMLInputElement>(null);
  const searching = searchFrom !== false && items.length >= searchFrom;
  if (total === 0) return <span {...props} className={join("basalt-count-names", className)}>{empty ?? `0 ${plural}`}</span>;
  const shown = query.trim() ? items.filter((item) => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : items;
  const partial = total > items.length;
  return (
    <span {...props} className={join("basalt-count-names", className)}>
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
        <PopoverTrigger className="basalt-text-button basalt-count-names-trigger" aria-haspopup="dialog" data-open={open ? "" : undefined}>
          <span className="basalt-text-button-label">{words}</span>
          <Icon icon={ChevronDownGlyph} size={16} />
        </PopoverTrigger>
        <Portless.Provider value>
        <PopoverContent
          side="bottom"
          align="start"
          className="basalt-count-names-panel"
          // On open: the filter on a fine pointer when it is shown, otherwise the title, so Enter never follows the first link by accident.
          initialFocus={() => (searching && typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches ? filterRef.current : titleRef.current)}
        >
          <PopoverTitle ref={titleRef} tabIndex={-1} className="basalt-count-names-title">{title ?? words}</PopoverTitle>
          {searching ? (
            <div className="basalt-filter-band basalt-count-names-band">
              <Icon icon={SearchGlyph} size={16} />
              <input
                ref={filterRef}
                className="basalt-filter-band-input"
                type="search"
                value={query}
                aria-label={`Filter ${plural}`}
                placeholder={`Filter ${plural}`}
                onChange={(event) => setQuery(event.target.value)}
                // The first Esc clears the words, the second closes.
                onKeyDown={(event) => { if (event.key === "Escape" && query) { event.preventDefault(); event.stopPropagation(); setQuery(""); } }}
              />
            </div>
          ) : null}
          {shown.length ? (
            <ul className="basalt-count-names-list">
              {shown.map((item, i) => {
                const href = item.href !== undefined ? safeHref(item.href) : null;
                const newTab = item.href !== undefined && opensNewTab(item.target);
                const rel = newTab ? [...new Set([...(item.rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : item.rel;
                return (
                  <li key={item.id ?? `${item.name}\u0000${i}`} className="basalt-count-names-item" data-linked={item.href !== undefined ? "" : undefined}>
                    {item.href !== undefined ? (
                      <a className="basalt-count-names-row" href={href ?? undefined} target={item.target} rel={rel}>
                        <span className="basalt-count-names-name">{item.name}{newTab ? <><NewTabGlyph /><NewTabWords label={newTabLabel} /></> : null}</span>
                        {item.detail !== undefined ? <span className="basalt-count-names-detail">{item.detail}</span> : null}
                      </a>
                    ) : (
                      <>
                        <span className="basalt-count-names-name">{item.name}</span>
                        {item.detail !== undefined ? <><span className="basalt-visually-hidden"> </span><span className="basalt-count-names-detail">{item.detail}</span></> : null}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="basalt-count-names-none">{`No ${plural} match.`}</p>
          )}
          {partial || footer ? (
            <div className="basalt-count-names-foot">
              {partial ? <span>{partialLabel(items.length, total)}</span> : null}
              {footer}
            </div>
          ) : null}
        </PopoverContent>
        </Portless.Provider>
      </Popover>
    </span>
  );
}
