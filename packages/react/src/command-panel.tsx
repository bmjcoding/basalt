// The cmdk-backed bodies of CommandMenu (the modal) and CommandList (the one in the page). A module of its own, so both can
// import it when they first show and an app that never opens one never downloads cmdk (and the Radix code under it).
import { Command, defaultFilter, useCommandState } from "cmdk";
import * as React from "react";

import { SearchGlyph } from "./glyphs/search";
import { Button } from "./button";
import type { CommandFilter, CommandGroup, CommandItem } from "./command";
import { CommandHints, CommandRowContent, commandRowShape, commandValue } from "./command-row";
import { FilterResult } from "./filter-result";
import { ChevronLeftGlyph } from "./glyphs/chevron-left";
import { Icon } from "./icon";
import { BAND_LEVEL } from "./layers";
import { Kbd } from "./kbd";
import { GlidePlate } from "./plate";
import { isComposingKey, useApplePlatform, useShortcutsVisible } from "./keyboard";
import { ariaShortcut, shortcutKeys } from "./shortcut";
import { join } from "./utils";

/**
 * Title matches rank above keyword and description matches: a match in the label or id scores in the top half, one found only
 * in the keywords (the app's own, and the description) in the bottom half. cmdk's own scorer does both halves.
 */
export function commandFilter(value: string, search: string, keywords?: string[]): number {
  const title = defaultFilter(value, search);
  if (title > 0) return 0.5 + title / 2;
  return keywords?.length ? defaultFilter(value, search, keywords) / 2 : 0;
}

/**
 * The groups in the order a search gives, and in their own order when there is none. cmdk sorts what it keeps by moving nodes in the page, and two things
 * go wrong with that here: its sort of the groups looks each one up by an id that React 19's ids do not survive, so a group with the better match stays
 * below one with the worse (typing "dep" lit "Duplicate sandbox" above "Deploy", and Enter ran it), and nothing sorts the rows back when the search is
 * cleared, so they stayed in the order the last search left them. The order is React's instead: rows by score, groups by their best row, ties in the
 * order given. cmdk still hides the rows that do not match, with the same scorer, and has nothing left to move.
 */
export function orderGroups(groups: CommandGroup[], search: string): CommandGroup[] {
  if (!search) return groups;
  return rank(groups, (command) => commandFilter(commandValue(command), search, keywordsOf(command)), false);
}

/** Rows by score, highest first, groups by their best row, ties in the order given; with `drop`, the rows that score 0 and the groups left empty go. */
function rank(groups: CommandGroup[], scoreOf: (command: CommandItem) => number, drop: boolean): CommandGroup[] {
  const scored = groups.map((group) => {
    const rows = group.commands.map((command) => ({ command, score: scoreOf(command) })).filter((row) => !drop || row.score > 0);
    const best = rows.reduce((top, row) => Math.max(top, row.score), 0);
    return { group: { ...group, commands: [...rows].sort((a, b) => b.score - a.score).map((row) => row.command) }, best };
  });
  return scored.filter((entry) => !drop || entry.group.commands.length > 0).sort((a, b) => b.best - a.best).map((entry) => entry.group);
}

/**
 * The rows a `CommandMenu` draws, in the order it draws them. Basalt's own scorer: every row, ordered (`orderGroups`), and cmdk hides those that score 0
 * with the same scorer. The app's order (`filter={false}`): the rows as given. An app's scorer: scored once here, and only the rows above 0 are drawn, so
 * what is shown, its order and the first row all come from the same scores, whatever the scorer was a render ago (cmdk is told not to filter).
 */
function shownGroups(groups: CommandGroup[], search: string, filter: CommandFilter | undefined): CommandGroup[] {
  if (!search || filter === false) return groups;
  if (!filter) return orderGroups(groups, search);
  return rank(groups, (command) => filter(command, search), true);
}

/** The row the menu lights when its rows change: the first one drawn and shown. Only Basalt's own scorer draws rows that cmdk then hides. */
function firstShown(shown: CommandGroup[], search: string, filter: CommandFilter | undefined): string {
  for (const group of shown) {
    for (const command of group.commands) {
      if (!search || filter !== undefined || commandFilter(commandValue(command), search, keywordsOf(command)) > 0) return commandValue(command);
    }
  }
  return "";
}

/** Whether a key is one cmdk moves the light with (the arrows, Home, End, and its Ctrl N, J, P and K). */
function navigates(event: React.KeyboardEvent): boolean {
  switch (event.key) {
    case "ArrowDown":
    case "ArrowUp":
    case "Home":
    case "End":
      return true;
    case "n":
    case "j":
    case "p":
    case "k":
      return event.ctrlKey;
    default:
      return false;
  }
}

const keywordsOf = (command: CommandItem) => (command.description ? [...(command.keywords ?? []), command.description] : command.keywords);

/**
 * The field names the active option with aria-activedescendant. cmdk sets it once a key has moved the selection, not for the row
 * it selects on its own first, and after a search it can name a row that has gone, so it is kept in step here: the row that is
 * lit is the row the field names, at every moment (open, typing, arrowing then typing, clearing). Used by both panels.
 */
function useActiveDescendant(list: React.RefObject<HTMLElement | null>, field: React.RefObject<HTMLInputElement | null>) {
  React.useLayoutEffect(() => {
    const host = list.current;
    const input = field.current;
    if (!host || !input) return undefined;
    const sync = () => {
      const id = host.querySelector<HTMLElement>("[cmdk-item][data-selected='true']")?.id;
      if (!id) input.removeAttribute("aria-activedescendant");
      else if (input.getAttribute("aria-activedescendant") !== id) input.setAttribute("aria-activedescendant", id);
    };
    sync();
    const changes = new MutationObserver(sync);
    changes.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-selected"] });
    // cmdk writes the attribute itself from its own state, a render after the selection moved: put the lit row back if it did.
    changes.observe(input, { attributes: true, attributeFilter: ["aria-activedescendant"] });
    return () => changes.disconnect();
  }, [list, field]);
}

export interface CommandPanelProps {
  groups: CommandGroup[];
  placeholder: string;
  /** Names the field (cmdk's label): the dialog's own name. */
  label: string;
  /** Names the listbox. */
  listLabel: string;
  filter?: CommandFilter;
  hints: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is typed: the menu holds it (from its first keystroke, while this panel loaded), so an app can read it or control it. */
  search: string;
  onSearchChange: (search: string) => void;
}

export function CommandPanel({ groups, placeholder, label, listLabel, filter, hints, onOpenChange, search, onSearchChange: setSearch }: CommandPanelProps) {
  const hintId = React.useId();
  const apple = useApplePlatform();
  const list = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  useActiveDescendant(list, input);
  // the footer is described to a screen reader only while it is drawn: hidden on a touch device with no keyboard
  const chipsShow = useShortcutsVisible();
  const ordered = shownGroups(groups, search, filter);
  // The lit row is held here, so it can follow the rows. cmdk lights the first row when the words change, and keeps whatever is lit when rows arrive
  // (rows from a server would land above a lit row lower down); until the reader moves the light, the first row shown is lit whenever the rows change.
  const [lit, setLit] = React.useState("");
  const litNow = React.useRef(lit);
  litNow.current = lit;
  // The reader moved the light only when a key cmdk moves it with, or the pointer over a row, really changed the lit row: `reading` holds the lit row
  // from just before such a key or move, for the rest of that event, and a change to another row while it is held is the reader's.
  const moved = React.useRef(false);
  const reading = React.useRef<{ before: string } | null>(null);
  const hold = () => {
    reading.current = { before: litNow.current };
    window.setTimeout(() => { reading.current = null; }, 0);
  };
  const light = (next: string) => {
    if (reading.current && next !== reading.current.before) moved.current = true;
    setLit(next);
  };
  const first = firstShown(ordered, search, filter);
  const shownRows = ordered.map((group) => group.commands.map(commandValue).join("\u0000")).join("\u0001");
  const searched = React.useRef(search);
  React.useLayoutEffect(() => {
    // New words light the first row again (cmdk does the same), so the light is the reader's again only after another move.
    if (searched.current !== search) {
      searched.current = search;
      moved.current = false;
    }
    if (!moved.current && first && first !== lit) setLit(first);
    // Only a change of the rows or the words decides (`lit` is left out): the light itself moving is cmdk's or the reader's.
  }, [shownRows, search, first]);
  // An ordinary row closes the menu, then runs, as it always has; a row that keeps the menu open only runs.
  const choose = (command: CommandItem) => {
    if (!command.keepOpen) onOpenChange(false);
    command.onSelect?.();
  };
  return (
    <Command
      label={label}
      loop
      filter={commandFilter}
      // Only Basalt's own scorer is cmdk's: the app's order and the app's scorer are drawn as they are (`shownGroups`).
      shouldFilter={filter === undefined}
      value={lit}
      onValueChange={light}
      onKeyDownCapture={(event) => { if (navigates(event) && !isComposingKey(event.nativeEvent)) hold(); }}
    >
      <div className="basalt-command-search" data-level={BAND_LEVEL}>
        <Icon icon={SearchGlyph} size={16} />
        <Command.Input ref={input} className="basalt-command-input" placeholder={placeholder} aria-label={label} aria-describedby={hints && chipsShow ? hintId : undefined} value={search} onValueChange={setSearch} autoFocus />
        <span className="basalt-command-slot" aria-hidden="true" />
      </div>
      <Command.List ref={list} className="basalt-command-list" label={listLabel} onPointerMoveCapture={(event) => { if (event.pointerType !== "touch") hold(); }}>
        <GlidePlate />
        <Command.Empty className="basalt-command-empty">No commands match.</Command.Empty>
        {ordered.map((group) => (
          <Command.Group key={group.label} heading={group.label} className="basalt-command-group">
            {group.commands.map((command) => {
              const keys = command.shortcut ? shortcutKeys(command.shortcut, apple) : [];
              const spoken = `${hintId}-${command.id}`;
              return (
                <Command.Item
                  key={command.id}
                  value={commandValue(command)}
                  keywords={keywordsOf(command)}
                  {...commandRowShape(command)}
                  aria-keyshortcuts={keys.length ? ariaShortcut(keys) : undefined}
                  aria-describedby={keys.length ? spoken : undefined}
                  className="basalt-menu-item"
                  onSelect={() => choose(command)}
                >
                  <CommandRowContent command={command} spokenId={spoken} />
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
      {hints ? (
        <div className="basalt-command-footer" id={hintId} data-kbd-hint="">
          <span><Kbd shortcut>↵</Kbd> Run</span>
          <span><Kbd shortcut>Esc</Kbd> Close</span>
        </div>
      ) : null}
    </Command>
  );
}

// ---- The command list in the page ----

export interface CommandListPanelProps {
  groups: CommandGroup[];
  label: string;
  placeholder: string;
  /** The noun the count uses: "9 commands", "3 of 9". */
  noun: string;
  level: number;
  bandLevel: number;
  onSelect?: (command: CommandItem) => void;
  /** The pane for the active command. With it the list has a preview. */
  detail?: (command: CommandItem) => React.ReactNode;
  className?: string;
  /** What was typed into the placeholder search row while this panel loaded. */
  initialSearch?: string;
  /**
   * Set (to true) by the placeholder search row as it is replaced if it held keyboard focus. The field takes the focus over, and
   * clears it, so typing and the arrows go on where they were. Left alone when focus was somewhere else.
   */
  focusHandoff?: React.MutableRefObject<boolean>;
}

type InputKind = "key" | "touch" | "pointer";

/** The pane is a region named by its heading: the first heading inside it, which also takes focus when it is pushed. */
function nameThePane(pane: HTMLElement, fallback: string, makeId: () => string) {
  const heading = pane.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6");
  if (heading) {
    heading.id ||= makeId();
    heading.tabIndex = -1;
    pane.setAttribute("aria-labelledby", heading.id);
    pane.removeAttribute("aria-label");
  } else {
    pane.removeAttribute("aria-labelledby");
    pane.setAttribute("aria-label", fallback);
  }
  return heading;
}

/** The length a token holds, read where it is used: a container query can't, so the JS threshold reads the same three. */
const tokenPx = (el: HTMLElement, name: string, fallback: number) => {
  const value = Number.parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
};

export function CommandListPanel({ groups, label, placeholder, noun, level, bandLevel, onSelect, detail, className, initialSearch = "", focusHandoff }: CommandListPanelProps) {
  const ids = { hint: React.useId(), pane: React.useId(), heading: React.useId(), list: React.useId() };
  const apple = useApplePlatform();
  const [search, setSearch] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [active, setActive] = React.useState("");
  const [mode, setMode] = React.useState<"split" | "push">("push");
  const [view, setView] = React.useState<"list" | "detail">("list");
  const [enter, setEnter] = React.useState<"next" | "prev" | undefined>();
  const wrap = React.useRef<HTMLDivElement>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const body = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const pane = React.useRef<HTMLDivElement>(null);
  const paneBody = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const lastInput = React.useRef<InputKind>("key");
  const savedScroll = React.useRef(0);
  const searchRef = React.useRef(search);
  searchRef.current = search;

  const commands = React.useMemo(() => {
    const byValue = new Map<string, CommandItem>();
    for (const group of groups) for (const command of group.commands) byValue.set(commandValue(command), command);
    return byValue;
  }, [groups]);
  const total = commands.size;
  const split = Boolean(detail) && mode === "split";
  const current = detail ? commands.get(active) : undefined;
  const idle = !split && !focused && !hovered;

  // Opens with the text that was typed while this loaded. It is applied after the first layout, which has measured the
  // unfiltered list, so the list holds that height whatever the first search is.
  React.useLayoutEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  // The panel hugs its rows, up to the popup cap, and scrolls inside past it. Its unfiltered height is measured whenever the list is unfiltered: as
  // page under the panel on the open page (the host's data-reserve, DECISIONS 336), and, beside a preview, as the list's own height, which the list
  // and the pane share. Measured from the sizer cmdk wraps the rows in.
  React.useLayoutEffect(() => {
    const host = list.current;
    const box = body.current;
    const sizer = host?.firstElementChild;
    if (!host || !box || !sizer) return undefined;
    const measure = () => {
      if (searchRef.current) return;
      const style = getComputedStyle(host);
      const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const listHeight = sizer.getBoundingClientRect().height + padding;
      box.style.setProperty("--_held", `${listHeight}px`);
      const page = root.current;
      // The page keeps the taller of the panel's two heights, the unfiltered list's and "Nothing matches"', so a short list filtered to nothing
      // never moves what follows (the code review's finding 6). The sentence's height is read from an unseen copy of it.
      const none = box.querySelector<HTMLElement>(".basalt-command-none-sizer");
      const empty = none ? padding + none.getBoundingClientRect().height : 0;
      if (page) wrap.current?.style.setProperty("--_held-page", `${page.getBoundingClientRect().height - listHeight + Math.max(listHeight, empty)}px`);
    };
    measure();
    const resizes = new ResizeObserver(measure);
    resizes.observe(sizer);
    return () => resizes.disconnect();
  }, [groups]);

  useActiveDescendant(list, input);

  // The placeholder row that was typed into is gone, and with it the focus: the field takes it over, but only if the placeholder had it.
  React.useLayoutEffect(() => {
    if (!focusHandoff?.current) return;
    focusHandoff.current = false;
    input.current?.focus({ preventScroll: true });
  }, [focusHandoff]);

  // A list with a preview answers its own width: side by side from the list, the gap and one container breakpoint.
  React.useLayoutEffect(() => {
    const el = wrap.current;
    if (!el || !detail) return undefined;
    const measure = () => {
      const side = tokenPx(el, "--basalt-size-list-width", 320) + tokenPx(el, "--basalt-space-4", 16) + tokenPx(el, "--basalt-size-breakpoint-container", 480);
      setMode(el.clientWidth >= side ? "split" : "push");
    };
    measure();
    const resizes = new ResizeObserver(measure);
    resizes.observe(el);
    return () => resizes.disconnect();
  }, [Boolean(detail)]);

  // The pane is a region named by its heading, and the heading is where a push lands focus.
  React.useLayoutEffect(() => {
    if (pane.current) nameThePane(pane.current, current?.label ?? label, () => ids.heading);
  });

  // A push moves focus to the detail's heading; Back returns it to the field (a keyed push, or a pointer) or to the list's
  // region (a tap, so a phone's keyboard doesn't spring up). Back keeps the query, the scroll and the active row.
  // Focus moves only when the view really changes from the one last shown: not on mount, and not when Strict Mode runs the effect a second time.
  const shownView = React.useRef(view);
  React.useLayoutEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    if (view === "detail") {
      if (pane.current) nameThePane(pane.current, current?.label ?? label, () => ids.heading)?.focus({ preventScroll: true });
    } else {
      if (list.current) list.current.scrollTop = savedScroll.current;
      const touched = lastInput.current === "touch" && document.documentElement.dataset.keyboard !== "hardware";
      (touched ? root.current : input.current)?.focus({ preventScroll: true });
    }
  }, [view]);
  React.useEffect(() => {
    if (mode === "split" && view === "detail") setView("list");
  }, [mode, view]);

  const push = () => {
    savedScroll.current = list.current?.scrollTop ?? 0;
    setEnter("next");
    setView("detail");
  };
  const back = () => {
    setEnter("prev");
    setView("list");
  };
  const choose = (command: CommandItem) => {
    if (!detail) {
      command.onSelect?.();
      onSelect?.(command);
      return;
    }
    setActive(commandValue(command));
    if (mode === "push") push();
  };

  const keys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      // Esc clears the query and does nothing once it is empty: it never blurs or closes anything.
      if (searchRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setSearch("");
      }
      return;
    }
    if (event.key === "Enter" && split && event.target === input.current && !event.nativeEvent.isComposing) {
      // In a split the plate marks what the pane shows, so ↵ runs the pane's primary action: its first button.
      event.preventDefault();
      paneBody.current?.querySelector<HTMLElement>("button:not([disabled]), a[href]")?.click();
    }
  };

  const clear = () => {
    setSearch("");
    input.current?.focus();
  };

  const row = (command: CommandItem) => {
    const keysOf = command.shortcut ? shortcutKeys(command.shortcut, apple) : [];
    const spoken = `${ids.hint}-${command.id}`;
    return (
      <Command.Item
        key={command.id}
        value={commandValue(command)}
        keywords={keywordsOf(command)}
        {...commandRowShape(command)}
        aria-keyshortcuts={keysOf.length ? ariaShortcut(keysOf) : undefined}
        aria-describedby={keysOf.length ? spoken : undefined}
        className="basalt-menu-item"
        onSelect={() => choose(command)}
      >
        <CommandRowContent command={command} spokenId={spoken} chevron={Boolean(detail)} />
      </Command.Item>
    );
  };

  const panel = (
    <Command
      ref={root}
      label={placeholder}
      loop
      filter={commandFilter}
      // In a split a pointer passing over a row changes nothing: the plate marks what the pane shows.
      disablePointerSelection={split}
      {...(detail ? { value: active, onValueChange: setActive } : null)}
      className="basalt-command basalt-command-page"
      data-level={level}
      role="region"
      aria-label={label}
      data-pane={detail ? "" : undefined}
      onKeyDown={keys}
      onKeyDownCapture={() => { lastInput.current = "key"; }}
      onPointerDownCapture={(event) => { lastInput.current = event.pointerType === "touch" ? "touch" : "pointer"; }}
    >
      <div className="basalt-command-search" data-level={bandLevel}>
        <Icon icon={SearchGlyph} size={16} />
        <Command.Input
          ref={input}
          className="basalt-command-input"
          placeholder={placeholder}
          aria-label={placeholder}
          value={search}
          onValueChange={setSearch}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <span className="basalt-command-slot" aria-hidden="true" />
      </div>
      <div ref={body} className="basalt-command-body">
        <Command.List
          ref={list}
          className="basalt-command-list"
          label={label}
          tabIndex={-1}
          data-idle={idle ? "" : undefined}
          onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }}
          onPointerLeave={() => setHovered(false)}
        >
          <GlidePlate />
          {orderGroups(groups, search).map((group) => (
            <Command.Group key={group.label} heading={group.label} className="basalt-command-group">
              {group.commands.map(row)}
            </Command.Group>
          ))}
        </Command.List>
        <NoMatch query={search} onClear={clear} />
        {/* An unseen copy of "Nothing matches", measured with the list, so the page can keep room for it. */}
        <div className="basalt-command-none basalt-command-none-sizer" aria-hidden="true" inert>
          <p>Nothing matches.</p>
          <Button variant="ghost" size="sm" tabIndex={-1}>Clear search</Button>
        </div>
      </div>
      <Foot total={total} noun={noun} hintId={ids.hint} preview={Boolean(detail)} query={search} />
    </Command>
  );

  if (!detail) return <div ref={wrap} className={join("basalt-command-split", className)}>{panel}</div>;
  return (
    <div
      ref={wrap}
      className={join("basalt-command-split", className)}
      data-mode={mode}
      data-view={view}
      data-enter={enter}
      onAnimationEnd={() => setEnter(undefined)}
    >
      {panel}
      <div
        ref={pane}
        id={ids.pane}
        role="region"
        className="basalt-command-pane"
        data-level={level}
      >
        <div className="basalt-command-back">
          <Button variant="ghost" size="sm" icon={ChevronLeftGlyph} aria-label={`Back to ${label}`} onClick={back}>{label}</Button>
        </div>
        <div ref={paneBody} className="basalt-command-pane-body">{current ? detail(current) : <p className="basalt-command-pane-empty">Nothing to show.</p>}</div>
      </div>
    </div>
  );
}

/** The count and the key legend. The count is shown at once and spoken once, after 400ms of stillness. */
function Foot({ total, noun, hintId, preview, query }: { total: number; noun: string; hintId: string; preview: boolean; query: string }) {
  const counted = useCommandState((state) => state.filtered.count);
  // Before cmdk has seen its rows it counts none: an empty query shows every row, so that is what the count says.
  const shown = query === "" ? total : counted;
  const text = shown === total ? `${total} ${total === 1 ? noun : `${noun}s`}` : `${shown} of ${total}`;
  return (
    <div className="basalt-command-foot">
      <FilterResult className="basalt-command-count">{text}</FilterResult>
      <CommandHints id={hintId} preview={preview} />
    </div>
  );
}

/** No match: one centred sentence and a ghost button, in the held area and outside the listbox, so the button is valid there. */
function NoMatch({ query, onClear }: { query: string; onClear: () => void }) {
  const shown = useCommandState((state) => state.filtered.count);
  if (shown > 0) return null;
  return (
    <div className="basalt-command-none">
      <p>Nothing matches “{query.trim()}”.</p>
      <Button variant="ghost" size="sm" onClick={onClear}>Clear search</Button>
    </div>
  );
}
