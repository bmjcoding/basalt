import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import * as React from "react";

import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { ControlIcon, loadFlight } from "./control-icon";
import { join } from "./utils";

/** Set by `DisclosureList`: a row in it renders its root as an `li`, through an app's own wrapper component too. */
export const InDisclosureList = /* @__PURE__ */ React.createContext(false);

// ---- The disclosure row ----
// One line that opens to show its detail under it: a tool call, a thought, a folded stretch of work, a step's log. Lighter than `Accordion`
// (which is for a page's sections, with a heading and a divider): no heading, no divider, no wash. The row is a button (`aria-expanded`,
// `aria-controls`) on Base UI's Collapsible: an optional mark in a 16px seat, the line, an optional meta in tertiary and the core chevron at the
// end, which turns from right to down by the morph (a rotation group; the engine loads when a pointer or focus reaches the row, so the first press already morphs). Closed, the line is cut with an ellipsis; open, it wraps, so the whole
// line is read in place. Hover lifts the ink; focus is the control ring at +2 outside the row. The detail opens by height over `duration-slow`.

export interface DisclosureRowProps extends Omit<React.ComponentProps<"div">, "title" | "children" | "onChange"> {
  /** The line: what the detail is ("Read the deploy log", "Thought for 4 s", "Ran 3 tools"). */
  title: React.ReactNode;
  /** A mark in the 16px seat before the line: an `Icon` at 16, a braille `Spinner` while it runs. A mark that says a state (failed, running) carries its own label. */
  mark?: React.ReactNode;
  /** A short fact at the end of the line, in tertiary: a length ("1.2 s"), a count. */
  meta?: React.ReactNode;
  /** What opens under the line. */
  children: React.ReactNode;
  /** The line wraps whether open or closed (a sentence that must be read whole). By default it is one line, cut, while closed. */
  wrap?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Keep the closed detail in the document (for find-in-page, which then opens it). */
  hiddenUntilFound?: boolean;
}

/** A line that opens to its detail. See the module note. */
export function DisclosureRow({ title, mark, meta, children, wrap = false, open: controlled, defaultOpen = false, onOpenChange, disabled, hiddenUntilFound, className, ...props }: DisclosureRowProps) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = controlled ?? inner;
  const inList = React.useContext(InDisclosureList);
  return (
    <BaseCollapsible.Root
      {...props}
      render={inList ? <li /> : undefined}
      open={open}
      disabled={disabled}
      onOpenChange={(next) => { if (controlled === undefined) setInner(next); onOpenChange?.(next); }}
      className={join("basalt-disclosure", className)}
      data-wrap={wrap ? "" : undefined}
      data-marked={mark ? "" : undefined}
    >
      <BaseCollapsible.Trigger className="basalt-disclosure-row" onPointerEnter={() => void loadFlight()} onFocus={() => void loadFlight()}>
        {mark ? <span className="basalt-disclosure-mark">{mark}</span> : null}
        <span className="basalt-disclosure-title">{title}</span>
        {meta ? <span className="basalt-disclosure-meta">{meta}</span> : null}
        <span className="basalt-disclosure-chevron" aria-hidden="true"><ControlIcon icon={open ? ChevronDownGlyph : ChevronRightGlyph} size={16} /></span>
      </BaseCollapsible.Trigger>
      <BaseCollapsible.Panel className="basalt-disclosure-panel" hiddenUntilFound={hiddenUntilFound}>
        <div className="basalt-disclosure-detail">{inList ? <InDisclosureList.Provider value={false}>{children}</InDisclosureList.Provider> : children}</div>
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  );
}

// ---- A disclosure in prose ----
// A line in running text that opens to its detail (cimip-gaps-3 T3, 7a): not a log row. Base UI's Collapsible: a button with `aria-expanded` and
// `aria-controls`; the closed detail is out of the accessibility tree unless `hiddenUntilFound`. The trigger hugs its words: the core chevron leads in a
// 16px seat one line tall (to the end while closed, mirrored right to left, down while open, by the rotation morph), then the title, which always wraps,
// at 500 in primary at the size of where it sits. Hover lifts the chevron to primary and underlines the title; no wash. At least 28 tall (44 on touch, as
// real height), the control ring at +2. The detail is indented to the title's edge, space-2 under it.

export interface DisclosureProps extends Omit<React.ComponentProps<"div">, "title" | "onChange"> {
  /** The line that opens. It always wraps and is never cut. */
  title: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Keep the closed detail in the document for find-in-page, as `DisclosureRow`'s. */
  hiddenUntilFound?: boolean;
}

/** A line in prose that opens to its detail. See the note above. A page that is mostly closed disclosures is an `Accordion` or a `DisclosureList`. */
export function Disclosure({ title, children, open: controlled, defaultOpen = false, onOpenChange, disabled, hiddenUntilFound, className, ...props }: DisclosureProps) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = controlled ?? inner;
  return (
    <BaseCollapsible.Root
      {...props}
      open={open}
      disabled={disabled}
      onOpenChange={(next) => { if (controlled === undefined) setInner(next); onOpenChange?.(next); }}
      className={join("basalt-prose-disclosure", className)}
    >
      <BaseCollapsible.Trigger className="basalt-prose-disclosure-trigger" onPointerEnter={() => void loadFlight()} onFocus={() => void loadFlight()}>
        <span className="basalt-prose-disclosure-chevron" aria-hidden="true"><ControlIcon icon={open ? ChevronDownGlyph : ChevronRightGlyph} size={16} /></span>
        <span className="basalt-prose-disclosure-title">{title}</span>
      </BaseCollapsible.Trigger>
      <BaseCollapsible.Panel className="basalt-prose-disclosure-panel" hiddenUntilFound={hiddenUntilFound}>
        <div className="basalt-prose-disclosure-detail">{children}</div>
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  );
}

// ---- A list of disclosure rows ----

export interface DisclosureListProps extends React.ComponentProps<"ul"> {
  /** `DisclosureRow`s. Name the list (`aria-label` or `aria-labelledby`). */
  children: React.ReactNode;
}

/**
 * `DisclosureRow`s as one ruled list on its parent's surface (cimip-gaps-3 T3, 7b): a `ul` with no rim, level or fill, each row an `li`, a divider between
 * items (never above the first or below the last). A row is at least 40 tall (44 on touch), its words on the list's line; hover and focus stay the row's own.
 * If any row has a mark, every row keeps the mark's seat. The rimmed form is a `PanelList` holding `<li><DisclosureRow /></li>`.
 */
export function DisclosureList({ className, children, ...props }: DisclosureListProps) {
  return (
    <ul {...props} className={join("basalt-disclosure-list", className)}>
      <InDisclosureList.Provider value={true}>{children}</InDisclosureList.Provider>
    </ul>
  );
}
