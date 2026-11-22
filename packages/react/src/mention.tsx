import * as React from "react";
import { createPortal } from "react-dom";

import { isComposingKey } from "./keyboard";
import { useFloatingLayer, usePopupLevel } from "./layers";
import { GlidePlate } from "./plate";
import { join } from "./utils";

// A mention, and the picker that writes one (cimip-gaps-2, B3). A mention is a name in running text that calls on someone: the trigger
// ("@") and the name, at 500 in primary ink, so it is marked by a glyph and a weight and never by colour alone. The picker is a popup of
// popup rows (Combobox's rows, plate, glide and group labels) anchored under the trigger in a text field, while focus stays in the field:
// the field carries `aria-activedescendant` to the row the keys are on. `Listbox` is a list in the page that holds its own focus, so the
// picker reuses the popup's rows rather than it. Nothing here runs at import.

// ---- Mention ----

export interface MentionProps extends Omit<React.ComponentProps<"span">, "prefix"> {
  /** The name, as written after the trigger: "Ana Ruiz", "design". */
  children: React.ReactNode;
  /** The trigger drawn before the name. Default "@". */
  trigger?: string;
  /** The mention calls on the person reading: it sits on the plate as well, so "you were called" shows by shape (and as `Mark` in forced colours). */
  you?: boolean;
}

/** A name in running text that calls on someone: "@Ana Ruiz" at 500 in primary ink. With `you`, on the plate too. */
export function Mention({ children, trigger = "@", you = false, className, ...props }: MentionProps) {
  return (
    <span {...props} className={join("basalt-mention", className)} data-you={you ? "" : undefined}>
      {trigger}
      {children}
    </span>
  );
}

// ---- The picker ----

export interface MentionOption {
  /** The row's title, and what is written after the trigger when it is picked: "Ana Ruiz". */
  label: string;
  /** What the app keeps for the pick (an id). Default: the label. */
  value?: string;
  /** A second line under the title (13/18, tertiary, one line): a role, a team's size, a handle. */
  description?: string;
  /** The heading the row sits under ("People", "Teams", "Roles"). Rows of a group are drawn together, groups in the order they first appear. */
  group?: string;
  /** Shown and passed over by the keys; it cannot be picked. */
  disabled?: boolean;
}

export interface MentionPickDetails {
  /** The field's text after the pick. */
  text: string;
  /** Where the mention starts and ends in that text (the trigger included, the space after it not). */
  start: number;
  end: number;
}

export interface MentionPickerProps {
  /** The text field the picker writes into: a `textarea` or a text `input`. Its own handlers run after the picker's, and see `defaultPrevented` on a key it used. */
  field: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  /** Who can be named. With the default filter, give them all; with `filter={null}`, give what `onQueryChange`'s query found. */
  options: readonly MentionOption[];
  /** The character that starts a mention. Default "@". */
  trigger?: string;
  /** Which options match what is typed after the trigger. Default: each word typed starts a word of the label or the description. `null` shows every option given. */
  filter?: null | ((option: MentionOption, query: string) => boolean);
  /** What is typed after the trigger, as it changes, or `null` when there is no mention at the caret: for an app that looks names up. */
  onQueryChange?: (query: string | null) => void;
  /** A row was picked: the name is written into the field and a space after it. */
  onPick?: (option: MentionOption, details: MentionPickDetails) => void;
  /** The list's accessible name. Default "Suggestions". */
  label?: string;
}

/** What a mention at the caret looks like: where its trigger is, and what follows it up to the caret. */
interface Query {
  at: number;
  text: string;
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
const words = (text: string) => fold(text).split(/[\s.,'’_-]+/u).filter(Boolean);

/** Each word typed starts a word of the label or of the description. */
function startsWords(option: MentionOption, query: string): boolean {
  const typed = words(query);
  if (typed.length === 0) return true;
  const own = [...words(option.label), ...words(option.description ?? "")];
  return typed.every((word) => own.some((each) => each.startsWith(word)));
}

/** The mention being typed at the caret: a trigger at the start of the text or after a space or an opening bracket, with no line break or second trigger after it. */
function queryAt(value: string, caret: number, trigger: string): Query | null {
  const before = value.slice(0, caret);
  const at = before.lastIndexOf(trigger);
  if (at < 0) return null;
  const ahead = before[at - 1];
  if (at > 0 && ahead !== undefined && !/[\s([{"'“‘]/u.test(ahead)) return null;
  const text = before.slice(at + trigger.length);
  if (/[\n\r]/.test(text) || text.includes(trigger) || /^\s/u.test(text)) return null;
  return { at, text };
}

// The caret's box, measured on a copy of the field laid out the same way (a textarea wraps; an input is one line).
const COPIED = ["boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle", "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontStretch", "fontVariantNumeric", "fontFeatureSettings", "letterSpacing", "lineHeight", "textTransform", "textIndent", "wordSpacing", "tabSize", "direction", "textAlign"] as const;

function caretBox(field: HTMLTextAreaElement | HTMLInputElement, index: number): { x: number; top: number; bottom: number } {
  const style = getComputedStyle(field);
  const copy = document.createElement("div");
  for (const name of COPIED) copy.style[name] = style[name];
  Object.assign(copy.style, { position: "absolute", top: "0", left: "0", visibility: "hidden", overflow: "hidden", height: "auto", whiteSpace: field instanceof HTMLTextAreaElement ? "pre-wrap" : "pre", overflowWrap: "break-word" });
  copy.textContent = field.value.slice(0, index);
  const mark = document.createElement("span");
  mark.textContent = field.value.slice(index, index + 1) || "​";
  copy.append(mark);
  document.body.append(copy);
  const box = field.getBoundingClientRect();
  const x = box.left + field.clientLeft + mark.offsetLeft - field.scrollLeft;
  const top = box.top + field.clientTop + mark.offsetTop - field.scrollTop;
  const line = Number.parseFloat(style.lineHeight) || mark.offsetHeight;
  copy.remove();
  // A trigger scrolled out of the field is held at the field's edge, so the list never floats away from it.
  const clampedTop = Math.min(Math.max(top, box.top), box.bottom - line);
  return { x: Math.min(Math.max(x, box.left), box.right), top: clampedTop, bottom: clampedTop + line };
}

/** A field the picker may write into: not read-only, not disabled, with a caret and no selection. */
const writable = (element: HTMLTextAreaElement | HTMLInputElement) => !element.readOnly && !element.disabled && element.selectionStart === element.selectionEnd;

/** The mention at the field's caret now, read from its live value: a controlled update fires no input event, so a query held from before may be stale. */
const liveQuery = (element: HTMLTextAreaElement | HTMLInputElement, trigger: string) => (writable(element) ? queryAt(element.value, element.selectionStart ?? element.value.length, trigger) : null);
const same = (a: Query | null, b: Query | null) => Boolean(a && b && a.at === b.at && a.text === b.text);

/** The ARIA the picker sets on the field. The caller's own values are kept and put back when the picker lets go. */
const OWNED = ["aria-autocomplete", "aria-haspopup", "aria-controls", "aria-activedescendant"] as const;

/** 6px from the trigger's line, as a popup sits from its trigger; 8px from the window's edges. */
const OFFSET = 6;
const MARGIN = 8;

/**
 * The picker for a mention in a text field. Typing the trigger at the start of a word opens a popup of the options that match what follows it,
 * under the trigger's line (above it when there is more room there), at the popup's level. Focus stays in the field: ↑ and ↓ move the plate
 * (passing over a disabled row), Enter or Tab writes the name and a space, Esc closes it until another trigger is typed, and a press on a row
 * picks it. A query with a space in it stays open only while something matches, so a name can hold a space and a sentence closes it. The rows
 * are Combobox's two-line rows, under `group` labels.
 */
export function MentionPicker({ field, options, trigger = "@", filter, onQueryChange, onPick, label = "Suggestions" }: MentionPickerProps) {
  const [query, setQuery] = React.useState<Query | null>(null);
  const [active, setActive] = React.useState(0);
  const dismissed = React.useRef<number | null>(null);
  const base = React.useId();
  const listId = `${base}-list`;
  const level = usePopupLevel();
  const layer = useFloatingLayer();

  const shown = React.useMemo(() => {
    if (!query) return [];
    const test = filter === null ? null : (filter ?? startsWords);
    const matched = test ? options.filter((option) => test(option, query.text)) : [...options];
    // Rows of one group are drawn together, the groups in the order they first appear; within a group the app's order stands.
    const order: string[] = [];
    for (const option of matched) if (!order.includes(option.group ?? "")) order.push(option.group ?? "");
    return order.flatMap((group) => matched.filter((option) => (option.group ?? "") === group));
  }, [query, options, filter]);
  // A query with a space in it is a name with a space while something matches it, and a sentence once nothing does.
  const open = Boolean(query) && shown.length > 0 && (shown.some((option) => !option.disabled) || !/\s/u.test(query!.text));
  const firstEnabled = (from: number, step: 1 | -1) => {
    for (let tries = 0, i = from; tries < shown.length; tries++, i = (i + step + shown.length) % shown.length) if (!shown[i]!.disabled) return i;
    return -1;
  };
  const current = open ? (shown[active] && !shown[active]!.disabled ? active : firstEnabled(0, 1)) : -1;
  const optionId = (index: number) => `${base}-option-${index}`;

  // What is typed after the trigger, read from the field on every change of its text or caret.
  const read = React.useCallback(() => {
    const element = field.current;
    if (!element || document.activeElement !== element || !writable(element)) { setQuery(null); return; }
    const next = liveQuery(element, trigger);
    if (next && dismissed.current === next.at) { setQuery(null); return; }
    if (!next) dismissed.current = null;
    setQuery((was) => (was && next && was.at === next.at && was.text === next.text ? was : next));
  }, [field, trigger]);

  // The caller's own values of the attributes the picker sets, read once from the field before the picker writes any.
  const saved = React.useRef<{ element: Element; values: Map<string, string | null> } | null>(null);
  const saveAria = React.useCallback((element: Element) => {
    if (saved.current?.element === element) return;
    saved.current = { element, values: new Map(OWNED.map((name) => [name, element.getAttribute(name)])) };
  }, []);
  const restoreAria = React.useCallback((element: Element, name: string) => {
    const value = saved.current?.element === element ? saved.current.values.get(name) : null;
    if (value === null || value === undefined) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }, []);

  const queryText = query?.text ?? null;
  const onQuery = React.useRef(onQueryChange);
  onQuery.current = onQueryChange;
  React.useEffect(() => { onQuery.current?.(queryText); }, [queryText]);
  // A new query starts on its first row.
  React.useEffect(() => { setActive(0); }, [queryText]);

  const pick = React.useCallback((option: MentionOption) => {
    const element = field.current;
    if (!element || !query || option.disabled) return;
    // Write only into the mention the field holds now: a field the app made read-only or disabled, or a value it replaced, closes the picker
    // and keeps its text.
    if (!same(liveQuery(element, trigger), query)) { setQuery(null); return; }
    const end = element.selectionStart ?? element.value.length;
    const name = `${trigger}${option.label}`;
    const spaced = /^\s/u.test(element.value.slice(end)) ? name : `${name} `;
    element.focus();
    element.setSelectionRange(query.at, end);
    // insertText keeps the browser's own undo; where it is refused, the text is set and an input event tells the app (React reads it as a change).
    if (!document.execCommand?.("insertText", false, spaced)) {
      element.setRangeText(spaced, query.at, end, "end");
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const after = query.at + spaced.length + (spaced === name ? 1 : 0);
    element.setSelectionRange(after, after);
    // The name written is a mention made: it does not offer itself again as the words after it are typed.
    dismissed.current = query.at;
    setQuery(null);
    onPick?.(option, { text: element.value, start: query.at, end: query.at + name.length });
  }, [field, query, trigger, onPick]);

  // The keys, on the field itself, so they run before any handler the app gave the field (React's run at the root).
  const state = React.useRef({ open, current, shown, pick, query });
  state.current = { open, current, shown, pick, query };
  React.useEffect(() => {
    const element = field.current;
    if (!element) return undefined;
    const onKey = (event: Event) => {
      const key = event as KeyboardEvent;
      const s = state.current;
      if (!s.open || isComposingKey(key)) return;
      // The field changed under the picker (the app set its value, or made it read-only): it closes. An Enter or Tab meant for the rows it
      // showed is still the picker's, so it neither writes nor sends.
      if (!same(liveQuery(element, trigger), s.query)) {
        if (key.key === "Enter" || key.key === "Tab" || key.key === "ArrowDown" || key.key === "ArrowUp" || key.key === "Escape") key.preventDefault();
        read();
        return;
      }
      if (key.key === "ArrowDown" || key.key === "ArrowUp") {
        key.preventDefault();
        const step = key.key === "ArrowDown" ? 1 : -1;
        let next = s.current;
        for (let tries = 0; tries < s.shown.length; tries++) {
          next = (next + step + s.shown.length) % s.shown.length;
          if (!s.shown[next]!.disabled) break;
        }
        // Two keys in one task each move once: the next reads where this one left it, before React draws.
        s.current = next;
        setActive(next);
      } else if ((key.key === "Enter" || key.key === "Tab") && !key.shiftKey && !key.altKey && !key.metaKey && !key.ctrlKey) {
        const option = s.shown[s.current];
        if (!option || option.disabled) return;
        key.preventDefault();
        s.pick(option);
      } else if (key.key === "Escape") {
        key.preventDefault();
        // The Esc is the picker's: a dialog round the field stays open.
        key.stopPropagation();
        const at = queryAt(element.value, element.selectionStart ?? 0, trigger)?.at;
        dismissed.current = at ?? null;
        setQuery(null);
      }
    };
    const onBlur = () => setQuery(null);
    const later = () => requestAnimationFrame(read);
    // The text is read once the app has heard it: on the document, after React's own listener at the root has taken the change. Read on the
    // field itself, a state change here would draw a controlled field before React had its new value, and the keystroke would be undone.
    const doc = element.ownerDocument;
    const onInput = (event: Event) => { if (event.target === element) read(); };
    element.addEventListener("keydown", onKey);
    doc.addEventListener("input", onInput);
    element.addEventListener("keyup", read);
    element.addEventListener("pointerup", later);
    element.addEventListener("focus", read);
    element.addEventListener("blur", onBlur);
    // A selection or caret the app moved without an input event (a value it set) is read too.
    const onSelection = () => { if (doc.activeElement === element) read(); };
    doc.addEventListener("selectionchange", onSelection);
    saveAria(element);
    element.setAttribute("aria-autocomplete", "list");
    element.setAttribute("aria-haspopup", "listbox");
    return () => {
      doc.removeEventListener("selectionchange", onSelection);
      element.removeEventListener("keydown", onKey);
      doc.removeEventListener("input", onInput);
      element.removeEventListener("keyup", read);
      element.removeEventListener("pointerup", later);
      element.removeEventListener("focus", read);
      element.removeEventListener("blur", onBlur);
      for (const name of OWNED) restoreAria(element, name);
      saved.current = null;
    };
  }, [field, read, trigger, saveAria, restoreAria]);

  // The field names the list while it is open, and the row the keys are on.
  React.useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    saveAria(element);
    if (open) element.setAttribute("aria-controls", listId);
    else restoreAria(element, "aria-controls");
    if (open && current >= 0) element.setAttribute("aria-activedescendant", optionId(current));
    else restoreAria(element, "aria-activedescendant");
    // A value the app set while the picker was open (no input event): the query is read again, and closes if it is gone.
    if (query && !same(liveQuery(element, trigger), query)) read();
  });

  // The popup stays mounted through its exit (0.75 of its entry, easing in), as Base UI's popups do.
  const [mounted, setMounted] = React.useState(false);
  const [phase, setPhase] = React.useState<"starting" | "open" | "ending">("starting");
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase((was) => (was === "open" ? was : "starting"));
      // Two frames, so the starting style is drawn once before it goes; both are cancelled if it closes first, or the inner one would undo the exit.
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setPhase("open")); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    if (!mounted) return undefined;
    setPhase("ending");
    const done = window.setTimeout(() => setMounted(false), 250);
    return () => window.clearTimeout(done);
  }, [open, mounted]);

  // Where it sits: under the trigger's line, or above it when there is more room there; never past what can be seen.
  const positioner = React.useRef<HTMLDivElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const anchor = open ? query!.at : -1;
  const place = React.useCallback(() => {
    const element = field.current;
    const box = positioner.current;
    const list = popup.current;
    if (!element || !box || !list || anchor < 0) return;
    const caret = caretBox(element, anchor);
    // The room is the visual viewport's, where there is one: a phone's keyboard shrinks it and not the layout viewport (WebKit's innerHeight
    // stays whole), and a pinch-zoom moves it. Its offsets are in the layout viewport's coordinates, which the caret and a fixed box use too.
    const view = window.visualViewport;
    const top = view?.offsetTop ?? 0;
    const leftEdge = view?.offsetLeft ?? 0;
    const height = view?.height ?? window.innerHeight;
    const viewWidth = view?.width ?? window.innerWidth;
    const below = top + height - caret.bottom - OFFSET - MARGIN;
    const above = caret.top - top - OFFSET - MARGIN;
    list.style.removeProperty("--available-height");
    const natural = list.scrollHeight + (list.offsetHeight - list.clientHeight);
    const down = below >= natural || below >= above;
    list.style.setProperty("--available-height", `${Math.max(0, down ? below : above)}px`);
    list.style.setProperty("--transform-origin", down ? "left top" : "left bottom");
    const width = list.offsetWidth;
    const left = Math.min(Math.max(leftEdge + MARGIN, caret.x), Math.max(leftEdge + MARGIN, leftEdge + viewWidth - MARGIN - width));
    box.style.left = `${left}px`;
    if (down) { box.style.top = `${caret.bottom + OFFSET}px`; box.style.bottom = ""; }
    else { box.style.bottom = `${window.innerHeight - caret.top + OFFSET}px`; box.style.top = ""; }
    box.dataset.side = down ? "bottom" : "top";
  }, [field, anchor]);
  React.useLayoutEffect(() => { if (mounted && anchor >= 0) place(); }, [mounted, anchor, shown, place]);
  React.useEffect(() => {
    if (!mounted) return undefined;
    let frame = 0;
    const again = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    window.addEventListener("resize", again);
    window.addEventListener("scroll", again, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", again);
    window.visualViewport?.addEventListener("scroll", again);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", again);
      window.removeEventListener("scroll", again, { capture: true });
      window.visualViewport?.removeEventListener("resize", again);
      window.visualViewport?.removeEventListener("scroll", again);
    };
  }, [mounted, place]);

  // The row the keys moved to is scrolled into the list's view (the list alone: the page never moves).
  React.useLayoutEffect(() => {
    const list = popup.current;
    const row = current >= 0 ? document.getElementById(optionId(current)) : null;
    if (!list || !row || !list.contains(row)) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [current]);

  // The last rows drawn stay during the exit, so the popup fades with what it held.
  const drawn = React.useRef<readonly MentionOption[]>([]);
  if (open) drawn.current = shown;
  if (!mounted || typeof document === "undefined") return null;
  const rows = open ? shown : drawn.current;
  const groups: { name: string; rows: { option: MentionOption; index: number }[] }[] = [];
  rows.forEach((option, index) => {
    const name = option.group ?? "";
    const last = groups.at(-1);
    if (last && last.name === name) last.rows.push({ option, index });
    else groups.push({ name, rows: [{ option, index }] });
  });
  const row = ({ option, index }: { option: MentionOption; index: number }) => (
    <div
      key={`${option.group ?? ""}\u0000${option.value ?? option.label}`}
      id={optionId(index)}
      role="option"
      aria-selected={index === current}
      aria-disabled={option.disabled || undefined}
      data-highlighted={index === current ? "" : undefined}
      data-described={option.description ? "" : undefined}
      className="basalt-menu-item basalt-mention-option"
      onPointerMove={() => { if (!option.disabled && index !== current) setActive(index); }}
      onClick={() => pick(option)}
    >
      <span className="basalt-menu-item-label">{option.label}</span>
      {option.description ? <span className="basalt-menu-item-description">{option.description}</span> : null}
    </div>
  );
  return createPortal(
    <div ref={positioner} className="basalt-positioner basalt-mention-positioner" style={layer}>
      <div
        ref={popup}
        data-level={level}
        className="basalt-menu basalt-mention-picker"
        data-starting-style={phase === "starting" ? "" : undefined}
        data-ending-style={phase === "ending" ? "" : undefined}
        // A press inside never takes focus from the field.
        onPointerDown={(event) => event.preventDefault()}
        onMouseDown={(event) => event.preventDefault()}
      >
        <GlidePlate />
        <div id={listId} role="listbox" aria-label={label}>
          {groups.map((group, g) =>
            group.name ? (
              <div key={`${g}-${group.name}`} role="group" aria-labelledby={`${base}-group-${g}`}>
                <div id={`${base}-group-${g}`} role="presentation" className="basalt-menu-group-label">{group.name}</div>
                {group.rows.map(row)}
              </div>
            ) : (
              group.rows.map(row)
            ),
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
