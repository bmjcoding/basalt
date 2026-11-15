// The cmdk-backed bodies of CommandMenu (the modal) and CommandList (the one in the page). A module of its own, so both can
// import it when they first show and an app that never opens one never downloads cmdk (and the Radix code under it).
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Command, defaultFilter, useCommandState } from "cmdk";
import * as React from "react";

import { Button } from "./button";
import type { CommandGroup, CommandItem } from "./command";
import { CommandHints, CommandRowContent, commandRowShape, commandValue } from "./command-row";
import { FilterResult } from "./filter-result";
import { ChevronLeftGlyph } from "./glyphs/chevron-left";
import { Icon } from "./icon";
import { BAND_LEVEL } from "./layers";
import { Kbd } from "./kbd";
import { GlidePlate } from "./plate";
import { useShortcutsVisible } from "./keyboard";
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
  hints: boolean;
  onOpenChange: (open: boolean) => void;
  /** What was typed into the placeholder search row while this panel loaded. */
  initialSearch?: string;
}

export function CommandPanel({ groups, placeholder, hints, onOpenChange, initialSearch = "" }: CommandPanelProps) {
  const hintId = React.useId();
  const [search, setSearch] = React.useState(initialSearch);
  const list = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  useActiveDescendant(list, input);
  // the footer is described to a screen reader only while it is drawn: hidden on a touch device with no keyboard
  const chipsShow = useShortcutsVisible();
  return (
    <Command label="Command menu" loop filter={commandFilter}>
      <div className="basalt-command-search" data-level={BAND_LEVEL}>
        <Icon icon={MagnifyingGlassIcon} size={16} />
        <Command.Input ref={input} className="basalt-command-input" placeholder={placeholder} aria-label={placeholder} aria-describedby={hints && chipsShow ? hintId : undefined} value={search} onValueChange={setSearch} autoFocus />
        <span className="basalt-command-slot" aria-hidden="true" />
      </div>
      <Command.List ref={list} className="basalt-command-list" label="Commands">
        <GlidePlate />
        <Command.Empty className="basalt-command-empty">No commands match.</Command.Empty>
        {groups.map((group) => (
          <Command.Group key={group.label} heading={group.label} className="basalt-command-group">
            {group.commands.map((command) => {
              const keys = command.shortcut ? shortcutKeys(command.shortcut) : [];
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
                  onSelect={() => {
                    onOpenChange(false);
                    command.onSelect?.();
                  }}
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

  // The list holds its unfiltered height, up to the popup cap, and scrolls inside: filtering never changes it, so what is
  // below it never moves. Measured whenever the list is unfiltered, from the sizer cmdk wraps the rows in.
  React.useLayoutEffect(() => {
    const host = list.current;
    const box = body.current;
    const sizer = host?.firstElementChild;
    if (!host || !box || !sizer) return undefined;
    const measure = () => {
      if (searchRef.current) return;
      const style = getComputedStyle(host);
      const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      box.style.setProperty("--_held", `${sizer.getBoundingClientRect().height + padding}px`);
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
  const entered = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!entered.current) {
      entered.current = true;
      return;
    }
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
    const keysOf = command.shortcut ? shortcutKeys(command.shortcut) : [];
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
        <Icon icon={MagnifyingGlassIcon} size={16} />
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
          {groups.map((group) => (
            <Command.Group key={group.label} heading={group.label} className="basalt-command-group">
              {group.commands.map(row)}
            </Command.Group>
          ))}
        </Command.List>
        <NoMatch query={search} onClear={clear} />
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
