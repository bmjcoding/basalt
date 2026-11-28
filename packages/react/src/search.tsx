import * as React from "react";

import { IconButton } from "./button";
import { Dialog, DialogClose, DialogContent, DialogHoldsTop, DialogTitle } from "./dialog";
import { FilterResult } from "./filter-result";
import { CloseGlyph } from "./glyphs/close";
import { SearchGlyph } from "./glyphs/search";
import { Icon } from "./icon";
import { isComposingKey } from "./keyboard";
import type { FocusTarget } from "./types";
import { Portless, useFadeRef } from "./fade-port";
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
      {/* Its top is held where the full box has it and the box ends under what it shows (DECISIONS 336, Q3). */}
      <DialogHoldsTop.Provider value>
      <Portless.Provider value>
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
          <DialogClose render={<IconButton icon={CloseGlyph} label={closeLabel} edge="end" className="basalt-search-close" />} />
        </form>
        <FilterResult className="basalt-search-count">{count}</FilterResult>
        {children}
      </DialogContent>
      </Portless.Provider>
      </DialogHoldsTop.Provider>
    </Dialog>
  );
}

export interface SearchResultsProps extends React.ComponentProps<"ul"> {
  /** The most rows that show a logo a result can hold (60px each). Default 3: the defaults are a shop's presets; set your own budget, 0 for none. */
  logoRows?: number;
  /** The most rows that show a picture a result can hold (72px each). Default 5 (a shop's preset). */
  rows?: number;
  /** Whether a "See all" row can follow the rows. Default true. */
  all?: boolean;
}

/**
 * The results area. It is as tall as its rows, up to a full result's height (`logoRows` logo rows, `rows` picture rows and a "See all" row), and
 * scrolls inside past it; on a short window it is the room the dialog has. The dialog's top is held where the full box has it, so the field and
 * the count never move and the box ends under what it shows (DECISIONS 336).
 */
export function SearchResults({ logoRows = 3, rows = 5, all = true, className, style, ref, ...props }: SearchResultsProps) {
  // The area fades at each edge that hides results; a focused result and its ring are never under a band (cimip-gaps-3 t7).
  const port = useFadeRef<HTMLUListElement>({ axis: "block", ring: 4 }, ref);
  return <ul {...props} ref={port} data-grows="" className={join("basalt-search-results", className)} style={{ "--_logos": logoRows, "--_packs": rows, "--_alls": all ? 1 : 0, ...style } as React.CSSProperties} />;
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

// ---- Search in a page or a panel, with results from a server ----

export interface SearchFieldProps {
  /** The field's name, not drawn ("Search this document"). */
  label: string;
  /** The words in the field. The app runs the search (on its server, after its own debounce); the field only holds them. */
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Enter in the field: run the search now. */
  onSubmit?: (value: string) => void;
  /**
   * Enter in the field, said as its own event before `onSubmit`, with the words (trimmed; empty when there are none): for a search that opens its results
   * on Enter and not on focus, so that taking focus (a Tab passing through, a shortcut) opens nothing. A key an input method is still composing with is
   * not Enter.
   */
  onOpen?: (value: string) => void;
  /** Esc in an empty field (the first Esc empties it): the app closes its search. Without it, the second Esc is left to what holds the field (a sheet closes). */
  onEscape?: () => void;
  /** The clear button's name. Default "Clear search". */
  clearLabel?: string;
  /** The field's height: 32px (`md`) by default, 44 on touch, as every control. */
  controlSize?: "sm" | "md" | "lg";
  /** No typing and no clearing: the × is disabled and Esc leaves the words. */
  disabled?: boolean;
  /** The words can be read and selected, not changed: the × is disabled and Esc leaves the words. */
  readOnly?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Anything else for the input: `aria-keyshortcuts`, `aria-controls`, `onFocus`. */
  inputProps?: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "placeholder" | "aria-label">;
  className?: string;
}

/**
 * A search field for a page or a panel: the core search glyph at its start, the words, and a clear button at its end while there are words (its seat
 * is padding, kept, so the words never move). It is a `role="search"` form. Esc empties it first and only the next Esc leaves (`onEscape`). The browser's
 * own clear × is hidden: the field has one ×.
 */
export function SearchField({ label, value, onValueChange, placeholder, onSubmit, onOpen, onEscape, clearLabel = "Clear search", controlSize = "md", disabled, readOnly, inputRef, inputProps, className }: SearchFieldProps) {
  const off = Boolean(disabled ?? inputProps?.disabled);
  const fixed = off || Boolean(readOnly ?? inputProps?.readOnly);
  const own = React.useRef<HTMLInputElement | null>(null);
  const setRef = (node: HTMLInputElement | null) => {
    own.current = node;
    if (typeof inputRef === "function") inputRef(node);
    else if (inputRef) (inputRef as React.RefObject<HTMLInputElement | null>).current = node;
  };
  return (
    <form
      role="search"
      className={join("basalt-search-box", className)}
      data-size={controlSize}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value.trim());
      }}
    >
      <Icon icon={SearchGlyph} size={16} className="basalt-search-box-glyph" />
      <input
        {...inputProps}
        ref={setRef}
        type="search"
        className="basalt-input basalt-search-box-input"
        data-size={controlSize}
        aria-label={label}
        disabled={off}
        readOnly={fixed && !off ? true : undefined}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          inputProps?.onKeyDown?.(event);
          if (event.defaultPrevented || isComposingKey(event.nativeEvent)) return;
          // Enter goes on to submit the form (onSubmit); the open is said first.
          if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) onOpen?.(value.trim());
          // An input method's own Esc (cancelling a composition) is the input method's.
          if (event.key !== "Escape") return;
          if (value && !fixed) {
            // The first Esc empties the words, and nothing round the field closes with it.
            event.preventDefault();
            event.stopPropagation();
            onValueChange("");
          } else if (onEscape) {
            // The app takes the Esc: a dialog or sheet round the field does not close as well.
            event.preventDefault();
            event.stopPropagation();
            onEscape();
          }
        }}
      />
      {value ? (
        <IconButton
          icon={CloseGlyph}
          label={clearLabel}
          size="xs"
          disabled={fixed}
          className="basalt-search-box-clear"
          onClick={() => {
            onValueChange("");
            own.current?.focus();
          }}
        />
      ) : null}
    </form>
  );
}

// The marks live in a module of their own (the command row draws them, and must not load this module's dialog); re-exported here.
export { markMatches, SearchMatch } from "./search-match";
export type { MatchRange, SearchMatchProps } from "./search-match";

export interface SearchPassagesProps extends React.ComponentProps<"ol"> {
  /**
   * A results budget: the list is as tall as this many passages and scrolls inside, so what sits above it (the field, the count) and below it
   * never moves however many results come back. Unset, the list grows with its results (a page that scrolls).
   */
  rows?: number;
  /** With `rows`: the lines of passage text each budgeted passage holds (its head line is counted apart). Default 2. */
  lines?: number;
}

/**
 * The results of a search in a page or a panel: an ordered list of `SearchPassage`s, in the order the server ranked them. Give it a name
 * (`aria-label`). It keeps `space-1-5` from its edges, so a ring is never cut by a scrolling panel. `rows` (and `lines`) give it a fixed budget
 * that scrolls inside, as the site search's results area has; the query, its paging and any grouping are the app's. While the first results are on their way,
 * draw it in a `LoadingShape` with stand-in passages; while a changed query runs, keep the last results on screen (`refreshing`).
 */
export function SearchPassages({ rows, lines = 2, className, style, ref, ...props }: SearchPassagesProps) {
  // A budget scrolls inside and fades at each edge that hides passages (cimip-gaps-3 t7); the ring is at 0 outside the plate's box.
  const port = useFadeRef<HTMLOListElement>({ axis: "block", ring: 2 }, ref);
  const budget = rows === undefined ? undefined : ({ "--_rows": rows, "--_lines": lines } as React.CSSProperties);
  return <ol {...props} ref={port} className={join("basalt-passages", className)} data-budget={rows === undefined ? undefined : ""} style={budget ? { ...budget, ...style } : style} />;
}

export interface SearchPassageProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Where the passage is: who said it, or the section or file it is in. One line, cut with an ellipsis. */
  source: React.ReactNode;
  /** At the head's end: when, or what kind ("2h ago", "Step 4"). Tertiary, tabular. */
  meta?: React.ReactNode;
  /** The passage, with its matches marked (`markMatches`, or `SearchMatch` round each). It wraps; its length is the server's. */
  children: React.ReactNode;
  /** A link to the passage. Without it the passage is a button (`onClick`): the app shows it beside the results. */
  href?: string;
  target?: string;
  rel?: string;
  /** The passage now shown beside the results: `aria-current`, and the source at 600 from 400 (one cut line, so nothing moves). */
  current?: boolean;
}

/**
 * One result: a link or a button over a head line (the source, then the meta at its end) and the passage under it, in secondary ink with its
 * matches in primary at 600. Popup-row geometry, as a notification entry: a plate on hover inset 2px, radius 8, the control ring at +2. Hover
 * lifts the meta to secondary, which tertiary would fail on the plate.
 */
export function SearchPassage({ source, meta, children, href, target, rel, current = false, className, ...props }: SearchPassageProps) {
  const body = (
    <>
      <span className="basalt-passage-head">
        <span className="basalt-passage-source">{source}</span>
        {meta ? <span className="basalt-passage-meta">{meta}</span> : null}
      </span>
      <span className="basalt-passage-text">{children}</span>
    </>
  );
  const common = { ...props, className: join("basalt-passage", className), "data-current": current ? "" : undefined };
  return (
    <li className="basalt-passages-item">
      {href ? (
        <a {...common} href={href} target={target} rel={rel} aria-current={current ? "page" : undefined}>{body}</a>
      ) : (
        <button type="button" {...common} aria-current={current ? "true" : undefined}>{body}</button>
      )}
    </li>
  );
}
