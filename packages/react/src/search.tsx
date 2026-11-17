import * as React from "react";

import { IconButton } from "./button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./dialog";
import { FilterResult } from "./filter-result";
import { CloseGlyph } from "./glyphs/close";
import { SearchGlyph } from "./glyphs/search";
import { Icon } from "./icon";
import type { FocusTarget } from "./types";
import { join } from "./utils";

// ---- The search trigger: a button shaped like a field ----

export interface SearchTriggerProps extends Omit<React.ComponentProps<"button">, "children"> {
  /** The button's name, and the word it shows from 720 ("Search"). Under 720 it is an icon alone and this is only its name. */
  label?: string;
}

/**
 * The header's way into search. From 720 it is shaped like a field: a 1px input boundary, the search glyph and the word, 200px wide.
 * Under 720 it is a 44px icon button. It is a plain button: it opens whatever the app opens, usually a `SearchDialog`. The word is
 * decoration (`aria-hidden`); `aria-label` names the button at both sizes.
 */
export function SearchTrigger({ label = "Search", className, type = "button", ...props }: SearchTriggerProps) {
  return (
    <button {...props} type={type} aria-label={label} className={join("basalt-search-trigger", className)}>
      <Icon icon={SearchGlyph} size={16} />
      <span className="basalt-search-trigger-word" aria-hidden="true">{label}</span>
    </button>
  );
}

// ---- The search dialog ----

export interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The dialog's name, read on opening and not drawn ("Search the shop"). */
  title: string;
  /** The field's name, not drawn ("Search products and brands"). */
  label: string;
  placeholder?: string;
  /** The text in the field. The app filters; this dialog only holds the field and what the app puts under it. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Enter in the field, with no row chosen: the app takes the query somewhere (a results page). Rows are links: Enter never follows one. */
  onSubmit?: (query: string) => void;
  /** The count in words ("3 products, 1 brand", or a prompt before there is a query). It is drawn at once and spoken once, after it holds still, never rewritten per keystroke. */
  count: string;
  /** The close button's name. Default "Close search". */
  closeLabel?: string;
  /** Where focus goes on close. By default, back to the trigger. */
  finalFocus?: FocusTarget;
  /** A `SearchResults`. */
  children?: React.ReactNode;
}

/**
 * A dialog for finding a thing and following a link to it: a field and a close button, a count line, and a results area of a fixed height
 * that scrolls inside, so the field and the count never move however many results there are. The results are links (`SearchResult`),
 * each a tab stop; there is no active row and no arrow-key movement, and Enter in the field sends the query to the app.
 */
export function SearchDialog({ open, onOpenChange, title, label, placeholder, query, onQueryChange, onSubmit, count, closeLabel = "Close search", finalFocus, children }: SearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="basalt-search" finalFocus={finalFocus}>
        <DialogTitle className="basalt-visually-hidden">{title}</DialogTitle>
        <form
          role="search"
          className="basalt-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) onSubmit?.(query.trim());
          }}
        >
          <label className="basalt-search-field">
            <Icon icon={SearchGlyph} size={16} />
            <span className="basalt-visually-hidden">{label}</span>
            <input
              type="search"
              className="basalt-search-input"
              value={query}
              placeholder={placeholder}
              autoComplete="off"
              enterKeyHint="search"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
          <DialogClose render={<IconButton icon={CloseGlyph} label={closeLabel} className="basalt-search-close" />} />
        </form>
        <FilterResult className="basalt-search-count">{count}</FilterResult>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export interface SearchResultsProps extends React.ComponentProps<"ul"> {
  /** The most rows that show a logo a result can hold (60px each). Default 3. */
  logoRows?: number;
  /** The most rows that show a picture a result can hold (72px each). Default 5. */
  rows?: number;
  /** Whether a "See all" row can follow the rows. Default true. */
  all?: boolean;
}

/**
 * The results area. Its height is that of a full result: `logoRows` logo rows, `rows` picture rows and a "See all" row. It holds that
 * height with fewer results, with none, and with the app's lead links, and scrolls inside; on a short window it is the room the dialog has.
 */
export function SearchResults({ logoRows = 3, rows = 5, all = true, className, style, ...props }: SearchResultsProps) {
  return <ul {...props} className={join("basalt-search-results", className)} style={{ "--_logos": logoRows, "--_packs": rows, "--_alls": all ? 1 : 0, ...style } as React.CSSProperties} />;
}

export interface SearchResultProps extends Omit<React.ComponentProps<"a">, "children" | "media"> {
  /** What it is called: a product, a brand. */
  children: React.ReactNode;
  /** The picture. It's the app's. `logo` makes room for 96 by 48; `pack` (the default) for 48 by 60. A row with no picture is at least 48 tall. */
  media?: React.ReactNode;
  mediaShape?: "logo" | "pack";
  /** A second line under the name: 13/18, tertiary ("Brand · 2 lb"). */
  detail?: React.ReactNode;
  /** At the row's end: a price, an arrow. */
  trailing?: React.ReactNode;
  /** A row of its own words, centred ("See all 12"). */
  centered?: boolean;
}

/**
 * One result, a link. A row is as tall as its picture plus 6px above and below (72 for a pack, 60 for a logo), never under 48. It is
 * a tab stop with the control ring outside it; its hover wash runs to the dialog's edges, and no ink lifts (the detail's tertiary passes 4.5:1 on the wash over the dialog's level: 4.78:1 dark, 4.88:1 light).
 */
export function SearchResult({ children, media, mediaShape = "pack", detail, trailing, centered = false, className, ...props }: SearchResultProps) {
  return (
    <li className="basalt-search-item">
      <a {...props} className={join("basalt-search-result", className)} data-centered={centered ? "" : undefined}>
        {media ? <span className="basalt-search-media" data-shape={mediaShape}>{media}</span> : null}
        <span className="basalt-search-name">
          <span className="basalt-search-title">{children}</span>
          {detail ? <span className="basalt-search-detail">{detail}</span> : null}
        </span>
        {trailing ? <span className="basalt-search-trailing">{trailing}</span> : null}
      </a>
    </li>
  );
}
