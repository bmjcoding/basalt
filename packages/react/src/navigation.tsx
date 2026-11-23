import * as React from "react";

import { ChevronLeftGlyph } from "./glyphs/chevron-left";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { MoreGlyph } from "./glyphs/more";
import { Button } from "./button";
import { GoArrow } from "./go-arrow";
import { Icon } from "./icon";
import { Reserve } from "./reserve";
import { NewTabGlyph, NewTabWords, hasVisibleText, newTabWords, opensNewTab } from "./new-tab";
import { join } from "./utils";

export interface LinkProps extends React.ComponentProps<"a"> {
  /**
   * The words a link that opens a new tab adds to its name, for translation. Default "(opens in a new tab)". There is no
   * prop for the arrow: it, and these words, come from `target="_blank"` and nothing else.
   */
  newTabLabel?: string;
  /**
   * The arrow form of a link, for a link on a line of its own rather than in running text (DECISIONS 152, vote 4): no underline,
   * weight 500, a 44px target, and the core arrow as its cue: `"end"` is a right arrow after the words (going on in the site),
   * `"start"` a left arrow before them (going back). Secondary ink, lifting to primary and travelling 2px with the link's hover. A link
   * with `target="_blank"` draws the new-tab arrow in the arrow's place and never both.
   */
  arrow?: "end" | "start";
}

/**
 * A link. A link with `target="_blank"` also draws the new-tab arrow after its label and says "(opens in a new tab)" in its
 * name: automatically, with no opt-out. A same-tab link to another site gets neither.
 */
export function Link({ className, target, rel, children, newTabLabel, arrow, ...props }: LinkProps) {
  const newTab = opensNewTab(target);
  // The words, as a label of their own in every form of the link (see below).
  const words = <span className="basalt-link-label">{children}</span>;
  const relationship = newTab ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;
  if (!newTab && arrow) {
    return (
      <a {...props} target={target} rel={relationship} data-arrow={arrow} className={join("basalt-link", "basalt-link-go", className)}>
        {arrow === "start" ? <GoArrow side="start" /> : null}
        {words}
        {arrow === "end" ? <GoArrow /> : null}
      </a>
    );
  }
  // The words are a label of their own, so that on touch the link's own line is painted over a neighbouring link's 44px box: two links
  // stacked one per line never take each other's taps.
  if (!newTab) return <a {...props} target={target} rel={relationship} className={join("basalt-link", className)}>{words}</a>;
  // An aria-label replaces the content, so the words join the label itself. A link that holds only a logo keeps the words and skips the arrow.
  const label = props["aria-label"];
  return (
    <a {...props} target={target} rel={relationship} aria-label={label ? `${label}${newTabWords(newTabLabel)}` : undefined} data-new-tab="" data-arrow={arrow} className={join("basalt-link", arrow && "basalt-link-go", className)}>
      {words}
      {hasVisibleText(children) ? <NewTabGlyph /> : null}
      {label ? null : <NewTabWords label={newTabLabel} />}
    </a>
  );
}

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
}
export interface BreadcrumbsProps extends React.ComponentProps<"nav"> {
  items: readonly BreadcrumbItem[];
}

/** A path through the app. The final item identifies the current page. */
export function Breadcrumbs({ items, className, "aria-label": label = "Breadcrumb", ...props }: BreadcrumbsProps) {
  return (
    <nav {...props} aria-label={label} className={join("basalt-breadcrumbs", className)}>
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            {index ? <Icon icon={ChevronRightGlyph} size={16} /> : null}
            {item.href ? <Link href={item.href} aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface PaginationProps extends Omit<React.ComponentProps<"nav">, "onChange" | "children"> {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  /** Provide for URL navigation; otherwise buttons paginate the app's current view. */
  hrefForPage?: (page: number) => string;
  /**
   * The most pages the list can ever reach (its unfiltered count at its smallest page size). Each of the seven slots is as wide as the widest page
   * number up to it, at 600 in tabular figures, and the box reserves `min(7, maxPages)` slots, so Previous and Next never move as the pages change. Default:
   * `pageCount`, which holds still across the pages of one list; give it whenever a filter or a page size can change `pageCount`.
   */
  maxPages?: number;
  /**
   * What sits between the arrows in the compact form, under `size-breakpoint-container-lg` (640px) of its container (`container-type: inline-size`
   * on an ancestor; `ListBand` is one, and a bare Pagination is its own: it fills its parent, so in a flex row give it `flex: 1`): Previous, this and Next, with no numbers. Default "Page 3 of 22", in a seat as wide as "Page 88 of 88" for the most pages the list can reach, so Next does not move. At one page or none the arrows and numbers are
   * hidden and a summary you pass stays; the default goes too.
   */
  summary?: React.ReactNode;
  /** Always the compact form (Previous, the summary and Next), whatever the container's width: the list's foot under 720. */
  compact?: boolean;
  /**
   * At one page or none a bare `Pagination` renders nothing, as it always did. Set this to keep its room instead (its arrows `visibility: hidden`, and `role="none"` instead of a `nav` landmark: an empty landmark
   * would be read out), so a filter that leaves one page closes no gap and moves nothing. `ListBand` sets it.
   */
  keepRoom?: boolean;
}

type PageItem = number | "gap";

/** Seven slots past seven pages: `1 2 3 4 5 … N`, then `1 … p−1 p p+1 … N`, then `1 … N−4 N−3 N−2 N−1 N`. Seven or fewer pages show every number. */
function pageItems(page: number, count: number): PageItem[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "gap", count];
  if (page >= count - 3) return [1, "gap", count - 4, count - 3, count - 2, count - 1, count];
  return [1, "gap", page - 1, page, page + 1, "gap", count];
}

/** The widest a page number can be, as eights: tabular figures are all one width, so the string stands for every number of its length. */
const eights = (n: number) => String(n).replace(/\d/g, "8");

/**
 * Bounded pagination, fixed in place: seven slots, each as wide as the widest page number the list can reach, so no page and neither arrow moves when the page
 * changes. Previous and Next are always there and stop at an end without leaving focus (`aria-disabled`). At one page or none it renders nothing, or with `keepRoom` it is
 * hidden and keeps its room. It never wraps: under 640px of its container it is Previous, a summary and Next. The current page is its number at 600 on a plate. A press on a number moves focus to
 * the button that holds the current page.
 */
export function Pagination({ page, pageCount, onPageChange, hrefForPage, maxPages, summary, compact, keepRoom, className, "aria-label": label = "Pagination", ...props }: PaginationProps) {
  const count = Number.isFinite(pageCount) ? Math.max(0, Math.floor(pageCount)) : 0;
  const current = Math.max(1, Math.min(Math.max(count, 1), Math.floor(page) || 1));
  const whole = count <= 1;
  const reach = Math.max(count, Math.floor(maxPages || 0), 1);
  const widest = eights(reach);
  const root = React.useRef<HTMLElement>(null);
  const pressed = React.useRef(false);
  // A press on a number moves focus to the button that now holds the current page (the numbers slide along, so the one that was pressed may be another page now). It waits for the page to change,
  // however long the app takes (a page set after an await works); an arrow press clears it, so a press the app refused leaves nothing for a later arrow.
  React.useLayoutEffect(() => {
    if (!pressed.current) return;
    pressed.current = false;
    root.current?.querySelector<HTMLElement>('.basalt-pagination-pages [aria-current="page"]')?.focus({ preventScroll: true });
  }, [current]);
  const control = (value: number, name: string, content: React.ReactNode, ended = false) => {
    const selected = value === current && name.startsWith("Page ");
    // A page's number is 400 at rest and 600 on the current page, and carries a copy of itself that the stylesheet lays out at 600 (the same as ChosenLabel does for a segment or a tab),
    // and a copy of the widest page number the list can reach (`data-widest`), unseen, so every slot is as wide as the widest page. Both are attributes: the DOM holds the words once.
    if (typeof content === "number") content = <span data-label={content} data-widest={widest}>{content}</span>;
    // An arrow that has nowhere to go stops but stays: `aria-disabled`, still focusable, as the period stepper's is.
    if (hrefForPage && !ended) return <Link href={hrefForPage(value)} aria-label={name} aria-current={selected ? "page" : undefined} className="basalt-page-link">{content}</Link>;
    // A page that is not there (before the first, after the last) keeps a link's box: a Button's is 4px wider, so reaching the first or last page would move every page after it.
    if (hrefForPage) return <a role="link" tabIndex={0} aria-disabled="true" aria-label={name} className="basalt-page-link">{content}</a>;
    return (
      <Button
        size="sm"
        variant="ghost"
        aria-label={name}
        aria-current={selected ? "page" : undefined}
        disabled={ended}
        focusableWhenDisabled
        onClick={() => {
          if (ended) return;
          // A number press waits for the page to change, and an arrow press is its own: one nobody answered must not take its focus.
          pressed.current = typeof value === "number" && name.startsWith("Page ");
          onPageChange?.(value);
        }}
      >
        {content}
      </Button>
    );
  };
  // At one page or none: nothing (as before), or its room with no landmark role (an empty `nav` would be read out).
  if (whole && !keepRoom) return null;
  const items = whole ? [] : pageItems(current, count);
  return (
    <nav {...props} ref={root} role={whole ? "none" : undefined} aria-label={whole ? undefined : label} data-whole={whole ? "" : undefined} data-compact={compact ? "" : undefined} className={join("basalt-pagination", className)}>
      {control(current - 1, "Previous page", <Icon icon={ChevronLeftGlyph} />, current <= 1)}
      {compact ? null : (
        <div className="basalt-pagination-pages">
          <div className="basalt-pagination-reserve" aria-hidden="true">
            {Array.from({ length: Math.min(7, reach) }, (_, i) => <span key={i} className="basalt-button" data-variant="ghost" data-size="sm"><span data-label={widest}>{widest}</span></span>)}
          </div>
          <div className="basalt-pagination-live">
            {items.map((item, slot) => (
              <React.Fragment key={slot}>
                {typeof item === "number" ? control(item, `Page ${item}`, item) : <span className="basalt-pagination-gap" aria-hidden="true"><span className="basalt-pagination-gap-seat">{widest}</span><Icon icon={MoreGlyph} /></span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      <span className="basalt-pagination-summary" data-default={summary === undefined ? "" : undefined}>{summary ?? <Reserve show="now" alternatives={{ now: `Page ${current} of ${Math.max(count, 1)}`, seat: `Page ${widest} of ${widest}` }} />}</span>
      {control(current + 1, "Next page", <Icon icon={ChevronRightGlyph} />, current >= count)}
    </nav>
  );
}
