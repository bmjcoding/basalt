import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as React from "react";

import { SearchGlyph } from "./glyphs/search";
import { Button } from "./button";
import { CommandHints, CommandRowContent, commandRowShape, commandValue } from "./command-row";
import { Icon } from "./icon";
import { BAND_LEVEL, inLevel, MODAL_LEVEL, ModalDepth, ModalHost, useModalLayer, usePanelLevel } from "./layers";
import { useModalOutside } from "./modal-outside";
import { isComposingKey } from "./keyboard";
import { isModKey } from "./platform";
import type { MatchRange } from "./search-match";
import { Spinner } from "./spinner";
import type { IconComponent } from "./types";
import { join } from "./utils";

export interface CommandItem {
  id: string;
  label: string;
  icon?: IconComponent;
  shortcut?: string;
  /**
   * A second line under the label: 13/18, tertiary, one line, cut with an ellipsis. It is searched too, below a match in the label,
   * and is part of the row's name after it. A row without one is one line; the two may share a list.
   */
  description?: string;
  /** Extra words that should find this command, e.g. ["remove"] for "Delete sandbox". */
  keywords?: string[];
  /** A destructive command: shown in the danger colour, as in `Menu`. */
  danger?: boolean;
  /** Runs when the command is chosen. In a `CommandList` with a `detail` pane there is nothing to run: the pane has the actions. */
  onSelect?: () => void;
  /**
   * In a `CommandMenu`, choosing the row leaves the menu open (an ordinary row closes it, then runs `onSelect`): a row that opens a list of choices (its
   * `onSelect` changes `groups`, or types a word into a controlled `search`). A `CommandList` never closes, so it does not read it.
   */
  keepOpen?: boolean;
  /**
   * What matched, as the app that ranked the rows found it: ranges (`[start, end)` in UTF-16 code units, as `markMatches` takes them) on the
   * string of each name, drawn as `SearchMatch` wherever that string shows. Basalt marks nothing from its own score. `unavailable` indexes the
   * reason, never the description.
   */
  matches?: CommandMatches;
  /**
   * Why the command cannot run now. Its presence is the state: the row stays where the order put it, can be lit and reached by every key and the
   * pointer, but Enter, a click or a tap runs nothing and closes nothing, and the reason is spoken (again on every press). The title and glyph are
   * in disabled ink and the reason is the second line, in the description's inks; it wraps, so it is never cut. No key chip is drawn. With a
   * `description`, the reason takes the second line and the description stays a search keyword. With `danger`, unavailable wins. An app's own
   * global shortcut for the command should check the same condition.
   */
  unavailable?: string;
}

/** The ranges that matched in each of a command's strings (`CommandItem.matches`). */
export interface CommandMatches {
  label?: readonly MatchRange[];
  description?: readonly MatchRange[];
  /** Ranges on the reason (`unavailable`), never the description's offsets. */
  unavailable?: readonly MatchRange[];
}

/** What a function `empty` is given: the words typed, and a way to empty the search and focus the field. */
export interface CommandEmptyState {
  search: string;
  clear: () => void;
}

/** What a command surface shows when no row is shown: its own sentence (and a control) in place of Basalt's, inside Basalt's centred stack. */
export type CommandEmpty = React.ReactNode | ((state: CommandEmptyState) => React.ReactNode);

/**
 * How a `CommandMenu` matches and orders its rows. `false`: the app filters and orders them itself, and every row it gives is shown, in its order. A
 * function: the row's score for the search, called only while something is typed, as cmdk's scorer is; above 0 it is shown, and rows (and groups, by
 * their best row) are ordered by it, highest first, ties in the order given.
 */
export type CommandFilter = false | ((command: CommandItem, search: string) => number);

export interface CommandGroup {
  label: string;
  commands: CommandItem[];
}

export interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  placeholder?: string;
  /**
   * Names the dialog and its search field, as the button that opens it is named ("Find", "Go to"). Without it the dialog and the loaded field are
   * "Command menu", and the field drawn while the panel loads is named by its placeholder, as before.
   */
  label?: string;
  /** Names the list of rows (its listbox): "Results", "Pages". "Commands" by default. */
  listLabel?: string;
  /**
   * How the rows are matched and ordered: Basalt's own scorer by default (the label and id first, then the keywords and description). `false` for the
   * app's own order (rows from a server, already ranked), or a function that scores a row (`CommandFilter`).
   */
  filter?: CommandFilter;
  /** Show the keys (↵ Run, Esc Close) at the end of the foot. Off by default: they're universal. The foot and its count are always drawn. */
  hints?: boolean;
  /** What the foot counts, singular: "7 commands", "2 of 7". "command" by default. */
  noun?: string;
  /** The app's own count line, in place of the default (a server's own total, or a noun that does not take an s). */
  count?: string;
  /**
   * What shows when no row is shown, in place of Basalt's sentence and button ("Nothing matches “…”." and Clear search; "Nothing to show." with no
   * words and no rows). A node, or a function of the search and a `clear` that empties it and focuses the field. Basalt keeps the centred stack.
   */
  empty?: CommandEmpty;
  /**
   * What is typed in the search field, for a menu that controls it: pass it with `onSearchChange`. Left out, the menu keeps its own, which starts empty
   * at every opening. A controlled search is the app's to clear: the menu changes it only as the person types (clear it in `onOpenChange` for a fresh
   * search at every opening). Words typed while the panel loads are part of it.
   */
  search?: string;
  /**
   * Called with the search as it changes: as the person types, and (in a menu that keeps its own) with `""` once it has closed. A command may carry the
   * words, as a "Search this page for …" row does (its `label` holds the words, and `keywords: [search]` keeps it found), and the list filters and orders
   * it with the rest.
   */
  onSearchChange?: (search: string) => void;
}

type PanelModule = typeof import("./command-panel");

// cmdk is the one large dependency here, so it arrives with the first opening, not with the import.
let panel: Promise<PanelModule> | undefined;

function loadPanel() {
  // A rejected promise is never kept, so every attempt asks for the chunk again.
  panel ??= import("./command-panel").catch((error) => {
    panel = undefined;
    throw error;
  });
  return panel;
}

/** A load that finishes sooner than this shows no spinner at all: a flash of one is worse than none. */
const SPINNER_DELAY_MS = 300;

/** The loading ring, drawn only once the wait has run past `SPINNER_DELAY_MS`. Unmounts with the loading row, so every wait starts its own clock. */
function LoadingRing() {
  const [late, setLate] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setLate(true), SPINNER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return late ? <Spinner size={16} /> : null;
}

export type PanelState = { status: "loading" } | { status: "error"; failures: number } | { status: "ready"; Panel: PanelModule["CommandPanel"]; ListPanel: PanelModule["CommandListPanel"] };
const LOADING: PanelState = { status: "loading" };

/** The panel once it has loaded; `loading` or `error` until then. Opening again, or `retry`, asks for the chunk again after a failure. */
function usePanel(open: boolean) {
  const [state, setState] = React.useState<PanelState>(LOADING);
  const [attempt, setAttempt] = React.useState(0);
  const ready = state.status === "ready";
  const failures = React.useRef(0);
  React.useEffect(() => {
    if (!open || ready) return;
    let live = true;
    setState(LOADING);
    loadPanel().then(
      // An abandoned attempt (closed, or retried) owns nothing: it never touches the counter or the state, so a failure that
      // two subscriptions to one cached request both hear is counted once, by the one still live.
      (module) => {
        if (!live) return;
        failures.current = 0;
        setState({ status: "ready", Panel: module.CommandPanel, ListPanel: module.CommandListPanel });
      },
      () => {
        if (!live) return;
        failures.current += 1;
        setState({ status: "error", failures: failures.current });
      },
    );
    return () => { live = false; };
  }, [open, ready, attempt]);
  const retry = React.useCallback(() => setAttempt((count) => count + 1), []);
  return { state, retry };
}

/**
 * A searchable list of every action, opened with ⌘K (Ctrl K on Windows and Linux: bind it with `isModKey`). Type to filter, arrows to move,
 * Enter to run, Esc to close. Bind the shortcut in the app; this component is the dialog.
 * Filtering and keyboard selection come from cmdk (MIT), loaded the first time it opens.
 */
export function CommandMenu(props: CommandMenuProps) {
  const { state, retry } = usePanel(props.open);
  return <CommandMenuShell {...props} state={state} retry={retry} />;
}

/**
 * The dialog around the panel, drawn for a given load state. Not exported from the package: `CommandMenu` passes the real
 * state, and the review walkthrough passes a fixed one to show the loading and error looks.
 * @internal
 */
export function CommandMenuShell({ open, onOpenChange, groups, placeholder = "Search commands", label, listLabel = "Commands", filter, hints = false, noun = "command", count, empty, search: controlled, onSearchChange, state, retry }: CommandMenuProps & { state: PanelState; retry: () => void }) {
  const layer = useModalLayer();
  const popup = React.useRef<HTMLDivElement>(null);
  const popupRef = useModalOutside<HTMLDivElement>(popup);
  const loadingId = React.useId();
  // The search is held here, not in the panel, so what is typed while the panel loads is the panel's search when it arrives, and so an app can control it.
  // A menu that keeps its own clears it once it has closed (after the closing transition, so the list does not change on its way out), and says so to
  // `onSearchChange`; a controlled one is the app's to clear.
  const [own, setOwn] = React.useState("");
  const search = controlled ?? own;
  const heard = React.useRef(onSearchChange);
  heard.current = onSearchChange;
  const setSearch = React.useCallback((next: string) => {
    if (controlled === undefined) setOwn(next);
    heard.current?.(next);
  }, [controlled]);
  const closed = (isOpen: boolean) => {
    if (isOpen || controlled !== undefined || own === "") return;
    setOwn("");
    heard.current?.("");
  };
  // Keys typed between the opening and focus reaching the menu (the app opened it from a key, and focus is still in the app's field while the dialog
  // mounts and moves it) are the search's, not the app's: from the commit that opens the menu, a printable key is taken from the control that has focus and
  // added to the search. It is one handoff an opening: the first time focus is inside the menu (its field, or the error's button) the capture is retired,
  // and it is not armed again until the menu has closed and opens again, so a dialog opened from the menu, or anything after, types as it should.
  const typed = React.useRef(search);
  typed.current = search;
  const write = React.useRef(setSearch);
  write.current = setSearch;
  React.useLayoutEffect(() => {
    if (!open) return undefined;
    const doc = popup.current?.ownerDocument ?? document;
    const inside = (node: EventTarget | Element | null) => Boolean(node && popup.current?.contains(node as Node));
    const retire = () => {
      doc.removeEventListener("keydown", take, true);
      doc.removeEventListener("focusin", arrived, true);
    };
    function arrived(event: FocusEvent) {
      if (inside(event.target)) retire();
    }
    function take(event: KeyboardEvent) {
      if (inside(doc.activeElement)) {
        retire();
        return;
      }
      if (event.defaultPrevented || isComposingKey(event) || event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      typed.current += event.key;
      write.current(typed.current);
    }
    if (inside(doc.activeElement)) return undefined;
    doc.addEventListener("keydown", take, true);
    doc.addEventListener("focusin", arrived, true);
    return retire;
  }, [open]);
  const Panel = state.status === "ready" ? state.Panel : null;
  return (
    <ModalDepth.Provider value={layer.depth}>
    <ModalHost.Provider value={popup}>
      <BaseDialog.Root open={open} onOpenChange={onOpenChange} onOpenChangeComplete={closed}>
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className="basalt-dialog-backdrop basalt-command-backdrop" style={{ zIndex: layer.backdrop }} />
          <BaseDialog.Popup ref={popupRef} className="basalt-dialog basalt-command" data-level={MODAL_LEVEL} style={{ zIndex: layer.popup }} aria-label={label ?? "Command menu"}>
            {inLevel(
              MODAL_LEVEL,
              Panel ? (
                <Panel groups={groups} placeholder={placeholder} label={label ?? "Command menu"} listLabel={listLabel} filter={filter} hints={hints} noun={noun} count={count} empty={empty} onOpenChange={onOpenChange} search={search} onSearchChange={setSearch} />
              ) : state.status === "error" ? (
                // The alert is the sentence alone: the buttons are not read out with it. A browser keeps a failed
                // file for the life of the page, so after a second failure Reload page comes first and has focus.
                <div className="basalt-command-error">
                  <p className="basalt-command-empty" role="alert">
                    {state.failures > 1 ? "Still couldn't load commands. Reloading the page usually fixes this." : "Couldn't load commands."}
                  </p>
                  <div className="basalt-command-error-actions">
                    {state.failures > 1 ? <Button size="sm" autoFocus onClick={() => window.location.reload()}>Reload page</Button> : null}
                    <Button size="sm" autoFocus={state.failures <= 1} onClick={() => { popup.current?.focus(); retry(); }}>Retry</Button>
                    <BaseDialog.Close render={<Button size="sm" variant="ghost">Close</Button>} />
                  </div>
                </div>
              ) : (
                // The real search row while the panel loads: same height, same placeholder, focused, so typing is kept
                // and nothing jumps when the panel arrives. "Loading commands" is its description, not a live region. It has no
                // autoFocus: that would run before the dialog notes what to return focus to. The dialog focuses it.
                // The ring is for a wait that runs long: it sits in a slot at the row's end that the ready row also keeps
                // (empty), so the input is the same width before and after and nothing moves when loading ends.
                <div className="basalt-command-search" data-level={BAND_LEVEL}>
                  <Icon icon={SearchGlyph} size={16} />
                  <input
                    className="basalt-command-input"
                    placeholder={placeholder}
                    aria-label={label ?? placeholder}
                    aria-describedby={loadingId}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <span className="basalt-command-slot" aria-hidden="true"><LoadingRing /></span>
                  <span id={loadingId} className="basalt-visually-hidden">Loading commands</span>
                </div>
              ),
            )}
          </BaseDialog.Popup>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </ModalHost.Provider>
    </ModalDepth.Provider>
  );
}

// ---- CommandList: the command surface set in the page ----

export interface CommandListProps {
  groups: CommandGroup[];
  /** Names the list: its region, its listbox and the Back button of a pushed detail ("Console"). */
  label: string;
  /** The search field's placeholder and name. "Search commands" by default. */
  placeholder?: string;
  /** What the foot counts, singular: "9 commands", "3 of 9". "command" by default. */
  noun?: string;
  /** The app's own count line, in place of the default (a server's own total, or a noun that does not take an s). */
  count?: string;
  /**
   * What shows when no row is shown, in place of Basalt's sentence and button. A node, or a function of the search and a `clear` that empties it
   * and focuses the field. Basalt keeps the centred stack and its padding.
   */
  empty?: CommandEmpty;
  /** A command was chosen (↵ or a press); its own `onSelect` has already run. Not called when there is a `detail` pane. */
  onSelect?: (command: CommandItem) => void;
  /**
   * The pane for the active command, which makes this a list with a preview: two panels side by side from the width of the list,
   * a gap and one container breakpoint, and a push (the list alone, then the detail with a Back band) below it. The pane is a
   * region named by its first heading; ↵ runs its first button. The pane's own panels sit one level inside it.
   */
  detail?: (command: CommandItem) => React.ReactNode;
  /**
   * Bind Mod+K (⌘K on Apple's systems, Ctrl K elsewhere: `isModKey`) to this list: focus the field, select its text, scroll it into view. One command surface owns ⌘K
   * on a page. A page whose surface is this list sets it, and has no `CommandMenu`; a page with a modal gives ⌘K to the modal.
   */
  bindShortcut?: boolean;
  /**
   * On the open page (the list's panel at level 1) the list's unfiltered height is kept as page under the panel, so what follows never moves while
   * the panel hugs its matches (DECISIONS 336, Q6). Inside a card or any other surface it holds no room. `false` says the same for an app's own
   * painted box. Default true.
   */
  reserve?: boolean;
  className?: string;
}

/**
 * The command panel set in the page: a level-1 panel in the flow with no scrim or shadow, a search field that keeps focus while
 * the arrows move through the rows, and a foot that counts what is shown. The panel is as tall as its rows; on the open page (with `reserve`) the taller of its unfiltered and its
 * "Nothing matches" heights is kept as page under it, so filtering never moves what follows. Until cmdk
 * arrives (the first mount, as `CommandMenu`'s first opening), the rows are drawn as they will be and what is typed is kept.
 */
export function CommandList({ groups, label, placeholder = "Search commands", noun = "command", count, empty, onSelect, detail, bindShortcut = false, reserve = true, className }: CommandListProps) {
  const level = usePanelLevel();
  const bandLevel = Math.min(level + 1, 3);
  const { state, retry } = usePanel(true);
  const [early, setEarly] = React.useState("");
  const host = React.useRef<HTMLDivElement>(null);
  const loadingId = React.useId();
  // The placeholder row is replaced when cmdk arrives. If it held focus as it went (React detaches its ref before the node leaves
  // the document, so activeElement still names it), the panel's field takes focus over; if not, focus is left where it is.
  const handoff = React.useRef(false);
  const holdFocus = React.useCallback((element: HTMLInputElement | null) => {
    if (!element) return undefined;
    return () => { if (element.ownerDocument.activeElement === element) handoff.current = true; };
  }, []);
  React.useEffect(() => {
    if (!bindShortcut) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !isModKey(event) || event.altKey || event.shiftKey) return;
      const field = host.current?.querySelector<HTMLInputElement>(".basalt-command-input");
      if (!field) return;
      event.preventDefault();
      field.focus({ preventScroll: true });
      field.select();
      field.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [bindShortcut]);
  // The pane's content is the app's, so it is handed the panel's level here, where the package's own context lives.
  const paneOf = detail ? (command: CommandItem) => inLevel(level, detail(command)) : undefined;
  const total = groups.reduce((sum, group) => sum + group.commands.length, 0);
  if (state.status === "ready") {
    const ListPanel = state.ListPanel;
    return (
      <div ref={host} className="basalt-command-host" data-pane={detail ? "" : undefined} data-reserve={reserve && level === 1 ? "" : undefined}>
        <ListPanel groups={groups} label={label} placeholder={placeholder} noun={noun} count={count} empty={empty} level={level} bandLevel={bandLevel} onSelect={onSelect} detail={paneOf} className={className} initialSearch={early} focusHandoff={handoff} />
      </div>
    );
  }
  return (
    <div ref={host} className="basalt-command-host" data-pane={detail ? "" : undefined} data-reserve={reserve && level === 1 ? "" : undefined}>
      <div className={join("basalt-command-split", className)}>
        <div className="basalt-command basalt-command-page" data-level={level} role="region" aria-label={label} aria-busy={state.status === "loading" || undefined}>
          <div className="basalt-command-search" data-level={bandLevel}>
            <Icon icon={SearchGlyph} size={16} />
            <input
              ref={holdFocus}
              className="basalt-command-input"
              placeholder={placeholder}
              aria-label={placeholder}
              aria-describedby={state.status === "loading" ? loadingId : undefined}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={early}
              onChange={(event) => setEarly(event.target.value)}
            />
            <span className="basalt-command-slot" aria-hidden="true">{state.status === "loading" ? <LoadingRing /> : null}</span>
            <span id={loadingId} className="basalt-visually-hidden">Loading commands</span>
          </div>
          <div className="basalt-command-body">
            {state.status === "error" ? (
              <div className="basalt-command-error">
                <p className="basalt-command-empty" role="alert">{state.failures > 1 ? "Still couldn't load commands. Reloading the page usually fixes this." : "Couldn't load commands."}</p>
                <div className="basalt-command-error-actions">
                  {state.failures > 1 ? <Button size="sm" onClick={() => window.location.reload()}>Reload page</Button> : null}
                  <Button size="sm" onClick={retry}>Retry</Button>
                </div>
              </div>
            ) : (
              // The rows as they will be, so nothing jumps when cmdk arrives. They are not yet filtered, and not yet selectable.
              <div className="basalt-command-list" role="listbox" aria-label={label}>
                {groups.map((group) => (
                  <div key={group.label} className="basalt-command-group" role="group" aria-label={group.label}>
                    <div cmdk-group-heading="" aria-hidden="true">{group.label}</div>
                    {group.commands.map((command) => (
                      <div key={command.id} role="option" aria-selected="false" className="basalt-menu-item" {...commandRowShape(command)} data-value={commandValue(command)}>
                        <CommandRowContent command={command} spokenId={`${loadingId}-${command.id}`} chevron={Boolean(detail)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="basalt-command-foot">
            <p className="basalt-filter-result basalt-command-count">{count ?? `${total} ${total === 1 ? noun : `${noun}s`}`}</p>
            <CommandHints preview={Boolean(detail)} />
          </div>
        </div>
        {detail ? <div className="basalt-command-pane" data-level={level} aria-hidden="true" /> : null}
      </div>
    </div>
  );
}

export type { CommandItem as Command };
