// The cmdk-backed bodies of CommandMenu (the modal) and CommandList (the one in the page). A module of its own, so both can
// import it when they first show and an app that never opens one never downloads cmdk (and the Radix code under it).
import { Command, defaultFilter } from "cmdk";
import * as React from "react";

import { SearchGlyph } from "./glyphs/search";
import { Button } from "./button";
import type { CommandEmpty, CommandFilter, CommandGroup, CommandItem } from "./command";
import { CommandHints, CommandRowContent, commandRowShape, commandValue } from "./command-row";
import { FilterResult, StatusLine } from "./filter-result";
import { ChevronLeftGlyph } from "./glyphs/chevron-left";
import { Icon } from "./icon";
import { BAND_LEVEL } from "./layers";
import { GlidePlate } from "./plate";
import { useRowsFade, useScrollFade } from "./fade-port";
import { useScrollStop } from "./scroll-stop";
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
 * The rows a search shows, in the order it gives them, and every row in its own order when there is none. Basalt filters and orders the rows itself, once,
 * and cmdk is told not to (`shouldFilter={false}`): cmdk's sorter moves only the rows it can select, so a better match that can run would land behind a
 * worse one that cannot, in the same group (the lit first row and Home then went to the wrong command); its sort of the groups looks each one up by an id
 * that React 19's ids do not survive; and nothing sorted the rows back when the search was cleared. The order is React's: rows by score, groups by their
 * best row, ties in the order given, and the rows that score 0 (and the groups left empty) are not drawn.
 */
export function orderGroups(groups: CommandGroup[], search: string): CommandGroup[] {
  if (!search) return groups;
  return rank(groups, (command) => commandFilter(commandValue(command), search, keywordsOf(command)), true);
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
 * The rows a `CommandMenu` draws, in the order it draws them, every one of them shown: Basalt's own scorer (`orderGroups`), the app's order as given
 * (`filter={false}`), or the app's scorer, scored once here with only the rows above 0 drawn, so what is shown, its order and the first row all come from
 * the same scores, whatever the scorer was a render ago.
 */
function shownGroups(groups: CommandGroup[], search: string, filter: CommandFilter | undefined): CommandGroup[] {
  if (!search || filter === false) return groups;
  if (!filter) return orderGroups(groups, search);
  return rank(groups, (command) => filter(command, search), true);
}

/** The value cmdk keeps for a row (it trims what it is given), and what the lit row is held as. */
const valueOf = (command: CommandItem) => commandValue(command).trim();

/** The rows drawn, in order: every row, available or not. The first is the one lit when the rows change. */
function shownValues(shown: CommandGroup[]): string[] {
  const out: string[] = [];
  for (const group of shown) for (const command of group.commands) out.push(valueOf(command));
  return out;
}

/**
 * The count line: "7 commands" at rest, "2 of 7" while filtering ("7 of 7" when every row matches), the app's own line when it gives one. `filtering` is
 * whether a search is narrowing the rows: never with `filter={false}`, where every row given is shown whatever is typed.
 */
export function countLine(shown: number, total: number, noun: string, filtering: boolean, count?: string): string {
  if (count !== undefined) return count;
  return filtering ? `${shown} of ${total}` : `${total} ${total === 1 ? noun : `${noun}s`}`;
}

interface LitOptions {
  /** The rows drawn and their order. */
  shown: CommandGroup[];
  search: string;
  list: React.RefObject<HTMLElement | null>;
  /** Every command, by its value. */
  commands: Map<string, CommandItem>;
  /** Whether the pointer lights a row (not beside a preview, where the plate marks what the pane shows). */
  pointer: boolean;
  /** Enter, with a row lit that can run. */
  onEnter: (command: CommandItem, event: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * The lit row, held by Basalt in both panels (cmdk's `value` is controlled), so a row that cannot run can be lit, reached and pressed. cmdk skips
 * `aria-disabled` rows in its own first-row and arrow code, so the keys it moves with (the arrows, Home, End, its Ctrl N, J, P and K, with Alt by group and
 * ⌘ to the ends) and Enter are handled here, over every row in DOM order, before cmdk sees them. cmdk's own changes are taken only from the pointer; a
 * pointer on a disabled row (cmdk gives it no handler) is read by delegation on the list. Any other change cmdk makes (it lights its first enabled row as
 * the search changes, and writes its own value before the controlled early return) is put back by a value that differs only in a trailing space, which
 * cmdk trims. Until the reader moves the light, the first row shown is lit whenever the rows or the words change.
 */
function useLitRow({ shown, search, list, commands, pointer, onEnter }: LitOptions) {
  const [lit, setLitState] = React.useState("");
  const [resync, setResync] = React.useState(0);
  const litNow = React.useRef(lit);
  litNow.current = lit;
  const moved = React.useRef(false);
  const fromPointer = React.useRef<string | null>(null);
  // How the next lit row is brought into view: by a key, as cmdk does (the nearest scroller, the page too); when the rows change, inside the list
  // alone, so a list lower on the page never pulls the page to it; by the pointer, not at all.
  const scroll = React.useRef<"key" | "list" | false>(false);
  const values = shownValues(shown);
  const first = values[0] ?? "";
  const shownKey = values.join("\u0000");
  const searched = React.useRef(search);
  const setLit = (next: string, { byReader = false, scrollTo = "list" as "key" | "list" | false } = {}) => {
    if (byReader && next !== litNow.current) moved.current = true;
    scroll.current = scrollTo;
    litNow.current = next;
    setLitState(next);
  };
  React.useLayoutEffect(() => {
    // New words light the first row again (cmdk does the same), so the light is the reader's again only after another move.
    if (searched.current !== search) {
      searched.current = search;
      moved.current = false;
    }
    const gone = !values.includes(litNow.current);
    if ((!moved.current || gone) && first !== litNow.current) {
      if (gone) moved.current = false;
      setLit(first);
    }
    // Only a change of the rows or the words decides: the light itself moving is the reader's.
  }, [shownKey, search, first]);
  // A move by key, or the rows changing, keeps the lit row in view (its group's heading too, when it is the group's first row), as cmdk did.
  React.useLayoutEffect(() => {
    const how = scroll.current;
    scroll.current = false;
    const host = list.current;
    const row = rowOf(host, lit);
    if (!how || !host || !row) return;
    const first = row.parentElement?.firstElementChild === row;
    const heading = first ? row.closest("[cmdk-group]")?.querySelector<HTMLElement>("[cmdk-group-heading]") : null;
    if (how === "key") {
      heading?.scrollIntoView({ block: "nearest" });
      row.scrollIntoView({ block: "nearest" });
      return;
    }
    const box = host.getBoundingClientRect();
    const top = (heading ?? row).getBoundingClientRect().top - box.top;
    const bottom = row.getBoundingClientRect().bottom - box.top;
    if (top < 0) host.scrollTop += top;
    else if (bottom > host.clientHeight) host.scrollTop += bottom - host.clientHeight;
  }, [lit, list]);
  const [said, setSaid] = React.useState({ text: "", id: 0 });
  const say = (text: string) => setSaid((last) => ({ text, id: last.id + 1 }));

  // cmdk's own change: taken from the pointer (a move over a row, or a press), put back from anything else.
  const onValueChange = (next: string) => {
    if (fromPointer.current !== null) {
      setLit(next.trim(), { byReader: fromPointer.current !== "touch", scrollTo: false });
      return;
    }
    if (next.trim() !== litNow.current) setResync((count) => count + 1);
  };
  const holdPointer = (event: React.PointerEvent | React.MouseEvent) => {
    fromPointer.current = "pointerType" in event ? event.pointerType : "mouse";
    window.setTimeout(() => { fromPointer.current = null; }, 0);
  };
  const disabledRow = (target: EventTarget) => (target as Element).closest?.<HTMLElement>("[cmdk-item][aria-disabled='true']") ?? null;
  const listProps = {
    onPointerMoveCapture: holdPointer,
    onPointerDownCapture: holdPointer,
    onClickCapture: holdPointer,
    onPointerMove: (event: React.PointerEvent) => {
      if (!pointer) return;
      const row = disabledRow(event.target);
      const value = row?.getAttribute("data-value");
      if (value && value !== litNow.current) setLit(value, { byReader: event.pointerType !== "touch", scrollTo: false });
    },
    // A press on a row that cannot run keeps focus where it is (the field), as a press on any other row does.
    onMouseDown: (event: React.MouseEvent) => { if (disabledRow(event.target)) event.preventDefault(); },
    onClick: (event: React.MouseEvent) => {
      const row = disabledRow(event.target);
      const command = row ? commands.get(row.getAttribute("data-value") ?? "") : undefined;
      if (command?.unavailable === undefined) return;
      // A press lights the row it was on (beside a preview too, where the pane then shows the reason).
      setLit(valueOf(command), { scrollTo: false });
      say(command.unavailable);
    },
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || isComposingKey(event.nativeEvent)) return;
    const host = list.current;
    if (!host) return;
    const rows = [...host.querySelectorAll<HTMLElement>("[cmdk-item]")];
    const at = rows.findIndex((row) => row.getAttribute("data-value") === litNow.current);
    const go = (row: HTMLElement | undefined) => {
      event.preventDefault();
      const value = row?.getAttribute("data-value");
      if (value) setLit(value, { byReader: true, scrollTo: "key" });
    };
    const step = (by: 1 | -1) => {
      if (!rows.length) return go(undefined);
      const next = at === -1 ? (by > 0 ? 0 : rows.length - 1) : (at + by + rows.length) % rows.length;
      go(rows[next]);
    };
    const byGroup = (by: 1 | -1) => {
      const groups = [...host.querySelectorAll<HTMLElement>("[cmdk-group]")].filter((group) => group.querySelector("[cmdk-item]"));
      const current = rows[at]?.closest<HTMLElement>("[cmdk-group]");
      const index = current ? groups.indexOf(current) : -1;
      const target = index === -1 ? undefined : groups[index + by];
      if (target) go(target.querySelector<HTMLElement>("[cmdk-item]") ?? undefined);
      else step(by);
    };
    const down = () => (event.metaKey ? go(rows[rows.length - 1]) : event.altKey ? byGroup(1) : step(1));
    const up = () => (event.metaKey ? go(rows[0]) : event.altKey ? byGroup(-1) : step(-1));
    switch (event.key) {
      case "ArrowDown": return down();
      case "ArrowUp": return up();
      case "n":
      case "j": return event.ctrlKey ? down() : undefined;
      case "p":
      case "k": return event.ctrlKey ? up() : undefined;
      case "Home": return go(rows[0]);
      case "End": return go(rows[rows.length - 1]);
      case "Enter": {
        event.preventDefault();
        const command = commands.get(litNow.current);
        if (!command) return undefined;
        // A row that cannot run: nothing runs, nothing closes, focus and the light stay, and the reason is said (again on every press).
        if (command.unavailable !== undefined) return say(command.unavailable);
        return onEnter(command, event);
      }
      default: return undefined;
    }
  };

  // The trailing space changes the prop, so cmdk writes its value again; it trims it, so the value it keeps is the lit row's.
  const value = resync % 2 ? `${lit} ` : lit;
  const status = <StatusLine delay={0} sendId={said.id}>{said.text}</StatusLine>;
  return { lit, setLit, value, onValueChange, onKeyDown, listProps, say, status };
}

const rowOf = (host: HTMLElement | null, value: string) => (value ? [...(host?.querySelectorAll<HTMLElement>("[cmdk-item]") ?? [])].find((row) => row.getAttribute("data-value") === value) ?? null : null);

/** Every command, by the value cmdk keeps for it. */
function byValue(groups: CommandGroup[]) {
  const out = new Map<string, CommandItem>();
  for (const group of groups) for (const command of group.commands) out.set(valueOf(command), command);
  return out;
}

/** A cmdk row: a row that cannot run is cmdk's `disabled` (cmdk writes `aria-disabled` and never clicks it), and carries no key chip or shortcut. */
function CommandRow({ command, spoken, apple, chevron, onSelect }: { command: CommandItem; spoken: string; apple: boolean; chevron?: boolean; onSelect: () => void }) {
  const unavailable = command.unavailable !== undefined;
  const keys = command.shortcut && !unavailable ? shortcutKeys(command.shortcut, apple) : [];
  return (
    <Command.Item
      value={commandValue(command)}
      keywords={keywordsOf(command)}
      disabled={unavailable}
      {...commandRowShape(command)}
      aria-keyshortcuts={keys.length ? ariaShortcut(keys) : undefined}
      aria-describedby={keys.length ? spoken : undefined}
      className="basalt-menu-item"
      onSelect={onSelect}
    >
      <CommandRowContent command={command} spokenId={spoken} chevron={chevron} />
    </Command.Item>
  );
}

/**
 * No row shown: one centred sentence (and a control), outside the listbox, so a button or a link is valid there. With words, "Nothing matches “…”."
 * and Clear search; with no words and no rows, "Nothing to show."; `empty` replaces both. It is not live: the count already said "0 of 7". A key other
 * than Esc stops here, so cmdk's root (which takes Enter for its lit row) never eats a button's or a link's own activation.
 */
function NoneBlock({ search, clear, empty, className, ...props }: { search: string; clear: () => void; empty?: CommandEmpty } & Omit<React.ComponentProps<"div">, "children" | "onKeyDown">) {
  const words = search.trim();
  const content = empty === undefined
    ? (words ? <><p>Nothing matches “{words}”.</p><Button variant="ghost" size="sm" onClick={clear}>Clear search</Button></> : <p>Nothing to show.</p>)
    : typeof empty === "function" ? empty({ search, clear }) : empty;
  return (
    <div {...props} className={join("basalt-command-none", className)} onKeyDown={(event) => { if (event.key !== "Escape") event.stopPropagation(); }}>
      {content}
    </div>
  );
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
  noun: string;
  count?: string;
  empty?: CommandEmpty;
  onOpenChange: (open: boolean) => void;
  /** What is typed: the menu holds it (from its first keystroke, while this panel loaded), so an app can read it or control it. */
  search: string;
  onSearchChange: (search: string) => void;
}

export function CommandPanel({ groups, placeholder, label, listLabel, filter, hints, noun, count, empty, onOpenChange, search, onSearchChange: setSearch }: CommandPanelProps) {
  const hintId = React.useId();
  const apple = useApplePlatform();
  const list = React.useRef<HTMLDivElement>(null);
  // The list fades at each edge that hides rows; the row the keys are on is kept clear (cimip-gaps-3 t7).
  useRowsFade(list);
  const input = React.useRef<HTMLInputElement>(null);
  useActiveDescendant(list, input);
  // the legend is described to a screen reader only while it is drawn: hidden on a touch device with no keyboard
  const chipsShow = useShortcutsVisible();
  const ordered = shownGroups(groups, search, filter);
  const commands = React.useMemo(() => byValue(groups), [groups]);
  // An ordinary row closes the menu, then runs, as it always has; a row that keeps the menu open only runs.
  const choose = (command: CommandItem) => {
    if (command.unavailable !== undefined) return;
    if (!command.keepOpen) onOpenChange(false);
    command.onSelect?.();
  };
  const lit = useLitRow({ shown: ordered, search, list, commands, pointer: true, onEnter: choose });
  const total = commands.size;
  const shown = shownValues(ordered).length;
  const clear = () => {
    setSearch("");
    input.current?.focus();
  };
  return (
    <Command
      label={label}
      loop
      // Basalt filters and orders the rows it draws (`shownGroups`); cmdk neither hides nor moves one.
      shouldFilter={false}
      value={lit.value}
      onValueChange={lit.onValueChange}
      onKeyDown={lit.onKeyDown}
    >
      <div className="basalt-command-search" data-level={BAND_LEVEL}>
        <Icon icon={SearchGlyph} size={16} />
        <Command.Input ref={input} className="basalt-command-input" placeholder={placeholder} aria-label={label} aria-describedby={hints && chipsShow ? hintId : undefined} value={search} onValueChange={setSearch} autoFocus />
        <span className="basalt-command-slot" aria-hidden="true" />
      </div>
      <Command.List ref={list} className="basalt-command-list" label={listLabel} data-none={shown === 0 ? "" : undefined} {...lit.listProps}>
        <GlidePlate />
        {ordered.map((group) => (
          <Command.Group key={group.label} heading={group.label} className="basalt-command-group">
            {group.commands.map((command) => (
              <CommandRow key={command.id} command={command} spoken={`${hintId}-${command.id}`} apple={apple} onSelect={() => choose(command)} />
            ))}
          </Command.Group>
        ))}
      </Command.List>
      {shown === 0 ? <NoneBlock search={search} clear={clear} empty={empty} /> : null}
      <div className="basalt-command-foot">
        <FilterResult className="basalt-command-count">{countLine(shown, total, noun, search !== "" && filter !== false, count)}</FilterResult>
        {/* The legend keeps its id while hidden from assistive technology, so the field's description still resolves. */}
        {hints ? <CommandHints id={hintId} preview={false} modal /> : null}
      </div>
      {lit.status}
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
  count?: string;
  empty?: CommandEmpty;
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

export function CommandListPanel({ groups, label, placeholder, noun, count, empty, level, bandLevel, onSelect, detail, className, initialSearch = "", focusHandoff }: CommandListPanelProps) {
  const ids = { hint: React.useId(), pane: React.useId(), heading: React.useId(), list: React.useId() };
  const apple = useApplePlatform();
  const [search, setSearch] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [mode, setMode] = React.useState<"split" | "push">("push");
  const [view, setView] = React.useState<"list" | "detail">("list");
  const [enter, setEnter] = React.useState<"next" | "prev" | undefined>();
  const wrap = React.useRef<HTMLDivElement>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const body = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  // The list fades at each edge that hides rows; the row the keys are on is kept clear (cimip-gaps-3 t7).
  useRowsFade(list);
  const pane = React.useRef<HTMLDivElement>(null);
  const paneBody = React.useRef<HTMLDivElement>(null);
  // The pane keeps its rim, radius and fill and stops scrolling; its body scrolls on both axes and fades at each edge that hides more, and while it overflows
  // and holds nothing focusable it is a keyboard stop named by the pane's heading, with its ring on the pane (cimip-gaps-3 t7).
  const paneStop = useScrollStop<HTMLDivElement>({ labelledBy: (box) => box.closest(".basalt-command-pane")?.getAttribute("aria-labelledby") ?? undefined }, paneBody);
  useScrollFade(paneBody, { axis: "both", ring: 4 });
  const input = React.useRef<HTMLInputElement>(null);
  const lastInput = React.useRef<InputKind>("key");
  const savedScroll = React.useRef(0);
  const searchRef = React.useRef(search);
  searchRef.current = search;
  // What the page keeps under the panel: the unfiltered panel's height less its list (`rest`), and the taller of the list and the empty block.
  const held = React.useRef<{ rest: number; list: number } | null>(null);
  const noneHeight = React.useRef(0);
  const noneRef = React.useRef<HTMLDivElement>(null);
  const hold = () => {
    if (held.current) wrap.current?.style.setProperty("--_held-page", `${held.current.rest + Math.max(held.current.list, noneHeight.current)}px`);
  };

  const commands = React.useMemo(() => byValue(groups), [groups]);
  const total = commands.size;
  const split = Boolean(detail) && mode === "split";
  const ordered = orderGroups(groups, search);
  const shown = shownValues(ordered).length;

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
      // never moves what follows (the code review's finding 6). Basalt's own sentence is read from an unseen copy of it; an app's `empty` is read
      // where it shows, the first time it does (`noneHeight`).
      const none = box.querySelector<HTMLElement>(".basalt-command-none-sizer");
      if (none) noneHeight.current = padding + none.getBoundingClientRect().height;
      if (!page) return;
      held.current = { rest: page.getBoundingClientRect().height - listHeight, list: listHeight };
      hold();
    };
    measure();
    const resizes = new ResizeObserver(measure);
    resizes.observe(sizer);
    return () => resizes.disconnect();
  }, [groups]);

  // An app's own `empty` is mounted once, only while it shows, and measured there: the page then keeps room for it too, from then on.
  React.useLayoutEffect(() => {
    const block = noneRef.current;
    const host = list.current;
    if (!block || !host || empty === undefined) return undefined;
    const measure = () => {
      const style = getComputedStyle(host);
      const tall = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom) + block.getBoundingClientRect().height;
      if (tall <= noneHeight.current) return;
      noneHeight.current = tall;
      hold();
    };
    measure();
    const resizes = new ResizeObserver(measure);
    resizes.observe(block);
    return () => resizes.disconnect();
  }, [shown === 0, empty === undefined]);

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
    // A row that cannot run opens no pane and runs nothing: its reason is said instead.
    if (command.unavailable !== undefined) {
      lit.say(command.unavailable);
      return;
    }
    if (!detail) {
      command.onSelect?.();
      onSelect?.(command);
      return;
    }
    lit.setLit(valueOf(command), { scrollTo: false });
    if (mode === "push") push();
  };
  const lit = useLitRow({
    shown: ordered,
    search,
    list,
    commands,
    pointer: !split,
    onEnter: (command, event) => {
      // In a split the plate marks what the pane shows, so ↵ in the field runs the pane's primary action: its first button.
      if (split && event.target === input.current) paneBody.current?.querySelector<HTMLElement>("button:not([disabled]), a[href]")?.click();
      else choose(command);
    },
  });
  const current = detail ? commands.get(lit.lit) : undefined;
  const idle = !split && !focused && !hovered;

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
    lit.onKeyDown(event);
  };

  const clear = () => {
    setSearch("");
    input.current?.focus();
  };

  const row = (command: CommandItem) => (
    <CommandRow key={command.id} command={command} spoken={`${ids.hint}-${command.id}`} apple={apple} chevron={Boolean(detail)} onSelect={() => choose(command)} />
  );

  const panel = (
    <Command
      ref={root}
      label={placeholder}
      loop
      // Basalt filters and orders the rows it draws (`orderGroups`); cmdk neither hides nor moves one.
      shouldFilter={false}
      // In a split a pointer passing over a row changes nothing: the plate marks what the pane shows.
      disablePointerSelection={split}
      value={lit.value}
      onValueChange={lit.onValueChange}
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
          {...lit.listProps}
        >
          <GlidePlate />
          {ordered.map((group) => (
            <Command.Group key={group.label} heading={group.label} className="basalt-command-group">
              {group.commands.map(row)}
            </Command.Group>
          ))}
        </Command.List>
        {shown === 0 ? <NoneBlock ref={noneRef} search={search} clear={clear} empty={empty} /> : null}
        {/* An unseen copy of Basalt's own "Nothing matches", measured with the list, so the page can keep room for it. An app's own `empty` is never
            mounted twice: it is measured where it shows (below). */}
        {empty === undefined ? <NoneBlock className="basalt-command-none-sizer" aria-hidden="true" inert search="?" clear={() => {}} /> : null}
      </div>
      <div className="basalt-command-foot">
        <FilterResult className="basalt-command-count">{countLine(shown, total, noun, search !== "", count)}</FilterResult>
        <CommandHints id={ids.hint} preview={Boolean(detail)} />
      </div>
      {lit.status}
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
        <div {...paneStop.attributes} ref={paneStop.ref} className="basalt-command-pane-body">
          {/* A row that cannot run has no pane: its reason is the pane's empty form, and ↵ has no button to press. */}
          {current?.unavailable !== undefined ? <p className="basalt-command-pane-empty">{current.unavailable}</p> : current ? detail(current) : <p className="basalt-command-pane-empty">Nothing to show.</p>}
        </div>
      </div>
    </div>
  );
}
