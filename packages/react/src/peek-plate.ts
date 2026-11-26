import { GRACE, LEAVE, WAIT } from "./cell-peek";

// The plate that shows cut text whole on four parts (DECISIONS 168 and 170; cimip-gaps-3 T3, 3): a `Listbox` option, an `OpenList` row, the `StatusBar`'s
// message and a `Text` with `lines` (the text's own box opened over it, its first line on the pixel the text starts on; inside a control, from the control's
// hover and focus, and a press on it is a press on the control).
// The list parts take the row itself, raised to level 3: the rim, `shadow-overlay`, radius 8, every word that was showing on the pixel it was on,
// and the cut text carrying on below, so nothing is half covered and nothing sticks out from under it. It grows downward and its foot never ends in
// the middle of a line of text. The status message's plate leaves the bar and lifts into the page above it, the slot's width, its foot `space-2`
// above the bar's top border; the bar keeps its truncated line and its height.
//
// The behaviour is the still table's cut cell (cell-peek.ts, DECISIONS 138 B and 142), with its timings: it opens on hover after the tooltip's wait
// (with the grace after one closes) or at once on keyboard focus, Esc closes it and moves neither the pointer nor focus, the pointer can move onto
// it, and it stays while hover or focus stays (WCAG 1.4.13). It fades and never scales, and it is `aria-hidden`: the row already holds the words.
// A press on a list's plate is a press on its row. On touch the listbox wraps at rest (the style sheet), so it has no plate to open, and the open
// list opens its plate on a long press, whose release opens nothing.
//
// Nothing here runs when the module loads: the plate and the one Range that measures are made on first use and removed with the part.

export type PeekKind = "listbox" | "open" | "status" | "text";

/**
 * What a cut `Text` counts as its control: the nearest ancestor that is one by element or by widget role, never by a bare `tabindex` (a `main` or a
 * heading that takes route focus, a dialog's popup, a focusable scroll region are not controls). Inside one, the control is the stop and the plate opens
 * from its hover and focus.
 */
export const TEXT_CONTROL = 'a[href], button, summary, label, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="checkbox"], [role="radio"], [role="switch"], [role="treeitem"]';

/** Something focusable inside a cut `Text`: then the text only cuts, with no stop and no plate. */
const HOLDS_A_STOP = 'a[href], button, input, select, textarea, summary, [tabindex], [role="checkbox"], [role="button"]';

/** How long a finger holds a row before its plate opens, and how far it may drift while it does. */
const HOLD = 500;
const SLOP = 8;

const px = (n: number) => `${n}px`;

/** The measuring of cut text. One `Range` serves every element this part measures: a Range is live, and the browser updates each one on every change to the page. */
function measurer(doc: Document) {
  let range: Range | null = null;
  return (el: Element | null): boolean => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.scrollWidth > el.clientWidth) return true;
    // A fractional overflow rounds away in scrollWidth: measure the words themselves, without the visually hidden ones (a button's ": opens its
    // record" is clipped out of view and is not part of what is drawn).
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.parentElement?.closest(".basalt-visually-hidden") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let first: Text | null = null;
    let last: Text | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { first ??= n as Text; last = n as Text; }
    if (!first || !last) return false;
    range ??= doc.createRange();
    range.setStart(first, 0);
    range.setEnd(last, last.length);
    const style = getComputedStyle(el);
    const inner = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return range.getBoundingClientRect().width > inner + 0.5;
  };
}

/** An element's words, without the visually hidden ones a button adds for its name (": opens its record"). */
function wordsOf(el: Element | null): string {
  if (!el) return "";
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(".basalt-visually-hidden").forEach((n) => n.remove());
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

const FONT = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "fontVariantNumeric"] as const;
const CELL_STYLE = ["color", "display", "alignItems", "justifyContent", "gap", "textAlign", "whiteSpace", "overflow", "textOverflow", "visibility"] as const;

/** A copy of a cell, placed on the plate at the pixel the cell is on, with the ink and visibility it has now. */
function pinnedCopy(cell: HTMLElement, origin: { x: number; y: number }): HTMLElement {
  const rect = cell.getBoundingClientRect();
  const copy = cell.cloneNode(true) as HTMLElement;
  const style = getComputedStyle(cell);
  for (const property of CELL_STYLE) copy.style[property] = style[property];
  // A chip or a mark inside keeps its own ink and visibility (a chip is hidden on every row but the cursor's).
  const from = cell.querySelectorAll<HTMLElement>("*");
  const to = copy.querySelectorAll<HTMLElement>("*");
  from.forEach((node, i) => {
    const target = to[i];
    if (!target) return;
    const s = getComputedStyle(node);
    target.style.visibility = s.visibility;
    target.style.color = s.color;
  });
  copy.removeAttribute("id");
  copy.style.position = "absolute";
  copy.style.margin = "0";
  copy.style.left = px(rect.left - origin.x);
  copy.style.top = px(rect.top - origin.y);
  copy.style.width = px(rect.width);
  copy.style.height = px(rect.height);
  copy.style.boxSizing = "border-box";
  return copy;
}

interface RowParts {
  gutter: HTMLElement | null;
  /** The element whose words and ink the name has. */
  name: HTMLElement;
  /** The box the name's first line sits in. */
  nameBox: HTMLElement;
  detail: HTMLElement | null;
  /** The cells the row shows beside the name, each kept on its pixel. */
  cells: HTMLElement[];
  chosen: boolean;
}

interface Adapter {
  /** The row (or the message) an event's target belongs to. */
  targetOf(node: EventTarget | null): HTMLElement | null;
  /** Whether any of its text is cut now. */
  isCut(target: HTMLElement): boolean;
  /** Fills the plate and places it. */
  fill(target: HTMLElement, plate: HTMLDivElement): void;
  /** The target keyboard focus is on, when focus is visible. */
  focusTarget(): HTMLElement | null;
  /** A press on the plate is a press on its row. */
  press?(target: HTMLElement): void;
  /** The element whose own ring gives way to the plate's while it is open: the target, unless this says otherwise. */
  peekingOf?(target: HTMLElement): HTMLElement;
  /** Whether a long press on touch opens the plate. */
  holds?: boolean;
}

// ---- rows: the listbox's options and the open list's rows ----

/** Every one-line box in a list that the plate's foot could cut through. */
const LINES = [
  ".basalt-listbox-heading", ".basalt-listbox-name", ".basalt-listbox-detail", ".basalt-listbox-trailing",
  ".basalt-open-list-label", ".basalt-open-name", ".basalt-open-detail", ".basalt-open-part", ".basalt-open-state",
].join(", ");

function placeRow(row: HTMLElement, parts: RowParts, plate: HTMLDivElement) {
  const doc = row.ownerDocument;
  const view = doc.documentElement;
  plate.replaceChildren();
  plate.dataset.kind = "row";
  plate.toggleAttribute("data-chosen", parts.chosen);
  const rowStyle = getComputedStyle(row);
  const rtl = rowStyle.direction === "rtl";
  plate.style.direction = rowStyle.direction;
  for (const property of FONT) plate.style[property] = rowStyle[property];
  const r = row.getBoundingClientRect();
  const plateStyle = getComputedStyle(plate);
  const rim = parseFloat(plateStyle.borderLeftWidth);
  const padInline = parseFloat(plateStyle.paddingLeft);
  const padTop = parseFloat(plateStyle.paddingTop);
  const nameRect = parts.nameBox.getBoundingClientRect();
  const lineHeight = parseFloat(rowStyle.lineHeight);

  // The plate's box: the row's own inline edges, and a top that puts the first line on the pixel it is on.
  const left = r.left;
  const top = nameRect.top - padTop - rim;
  const origin = { x: left + rim, y: top + rim };
  const contentStart = left + rim + padInline;
  const contentEnd = r.right - rim - padInline;

  if (parts.gutter) plate.append(pinnedCopy(parts.gutter, origin));
  for (const cell of parts.cells) plate.append(pinnedCopy(cell, origin));

  const text = doc.createElement("div");
  text.className = "basalt-peek-text";
  // Where the name's first line begins (the gutter's side), and the room the cells keep at its other end: mirrored in a right-to-left row.
  text.style.marginInlineStart = px(rtl ? contentEnd - nameRect.right : nameRect.left - contentStart);
  // The first line keeps the cells where they are: a float holds their room, so the name's first line breaks where the row cut it, and its next lines
  // take the row's whole width.
  const seat = doc.createElement("span");
  seat.className = "basalt-peek-seat";
  seat.style.width = px(Math.max(0, rtl ? nameRect.left - contentStart : contentEnd - nameRect.right));
  seat.style.height = px(lineHeight);
  const name = doc.createElement("span");
  name.className = "basalt-peek-name";
  name.textContent = wordsOf(parts.name);
  name.style.color = getComputedStyle(parts.name).color;
  text.append(seat, name);
  if (parts.detail) {
    const detail = doc.createElement("span");
    detail.className = "basalt-peek-detail";
    detail.textContent = wordsOf(parts.detail);
    detail.style.color = getComputedStyle(parts.detail).color;
    text.append(detail);
  }
  plate.append(text);

  plate.style.left = px(left);
  plate.style.width = px(r.width);
  plate.style.top = px(top);
  plate.style.paddingBottom = "";
  // The foot never ends inside a line of the list below it: where it would cut through a line's letters (the next row's name, a group's label), it
  // runs on to that line's end, at most one line, so what shows under the plate is whole lines.
  const list = row.closest(".basalt-listbox, .basalt-open-list");
  if (list) {
    const focus = plate.hasAttribute("data-focus") ? parseFloat(plateStyle.outlineOffset) + parseFloat(plateStyle.outlineWidth) : 0;
    const foot = plate.getBoundingClientRect().bottom;
    let extra = 0;
    for (const el of list.querySelectorAll<HTMLElement>(LINES)) {
      if (row.contains(el)) continue;
      const line = el.getBoundingClientRect();
      if (!line.height || line.top < r.top) continue;
      // The band the letters stand in (ascenders to descenders): the line box less its leading. The plate's edge, or its focus ring and the gap inside
      // the ring, crossing that band would show letters cut in half; then the plate's own edge goes past it.
      const leading = Math.max(0, (line.height - parseFloat(getComputedStyle(el).fontSize) * 1.2) / 2);
      const inkTop = line.top + leading;
      const inkBottom = line.bottom - leading;
      if (foot < inkBottom && foot + focus > inkTop) extra = Math.max(extra, inkBottom + 1 - foot);
    }
    if (extra) plate.style.paddingBottom = `calc(${plateStyle.paddingBottom} + ${px(extra)})`;
  }
  // Never past the viewport: a row near the foot lifts its plate in, as the table's plate does.
  const h = plate.getBoundingClientRect().height;
  plate.style.top = `max(var(--basalt-space-2), min(${px(top)}, calc(${px(view.clientHeight - h)} - var(--basalt-space-2))))`;
}

function listboxAdapter(root: HTMLElement, cut: (el: Element | null) => boolean): Adapter {
  const doc = root.ownerDocument;
  const partsOf = (option: HTMLElement): RowParts => ({
    gutter: option.querySelector(".basalt-listbox-gutter"),
    name: option.querySelector(".basalt-listbox-name")!,
    nameBox: option.querySelector(".basalt-listbox-name")!,
    detail: option.querySelector(".basalt-listbox-detail"),
    cells: [...option.querySelectorAll<HTMLElement>(".basalt-listbox-leading, .basalt-listbox-trailing")],
    chosen: option.getAttribute("aria-selected") === "true",
  });
  return {
    targetOf: (node) => (node instanceof Element ? node.closest<HTMLElement>('[role="option"]:not([aria-disabled="true"])') : null),
    isCut: (option) => cut(option.querySelector(".basalt-listbox-name")) || cut(option.querySelector(".basalt-listbox-detail")),
    fill: (option, plate) => placeRow(option, partsOf(option), plate),
    focusTarget: () => {
      if (doc.activeElement !== root || !root.matches(":focus-visible")) return null;
      const id = root.getAttribute("aria-activedescendant");
      return id ? doc.getElementById(id) : null;
    },
    press: (option) => {
      option.click();
      // A press on an option focuses the list without the keyboard ring; so does a press on its plate. The attribute turns the ring off (until a key
      // is pressed or focus leaves) where a browser ignores `focusVisible: false`.
      if (doc.activeElement !== root) {
        root.setAttribute("data-pointer-focus", "");
        root.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
      }
    },
  };
}

function openListAdapter(root: HTMLElement, cut: (el: Element | null) => boolean): Adapter {
  const doc = root.ownerDocument;
  const win = doc.defaultView!;
  const partsOf = (row: HTMLElement): RowParts => ({
    gutter: row.querySelector(".basalt-open-gutter"),
    name: row.querySelector(".basalt-open-button")!,
    nameBox: row.querySelector(".basalt-open-name")!,
    detail: row.querySelector(".basalt-open-detail"),
    cells: [...row.querySelectorAll<HTMLElement>(".basalt-open-part, .basalt-open-state, .basalt-open-into")],
    // The cursor row has the chosen fill while the list holds focus, and from 720 only (below it the list is a column with no cursor plate).
    chosen: row.hasAttribute("data-cursor") && root.matches(":focus-within") && win.matchMedia("(min-width: 720px)").matches,
  });
  return {
    targetOf: (node) => (node instanceof Element ? node.closest<HTMLElement>("[data-open-row]:not([data-off])") : null),
    isCut: (row) => [".basalt-open-button", ".basalt-open-part", ".basalt-open-state", ".basalt-open-detail"].some((s) => cut(row.querySelector(s))),
    fill: (row, plate) => placeRow(row, partsOf(row), plate),
    focusTarget: () => {
      const active = doc.activeElement;
      if (!(active instanceof HTMLElement) || !active.matches("[data-open-button]:focus-visible") || !root.contains(active)) return null;
      return active.closest<HTMLElement>("[data-open-row]");
    },
    press: (row) => row.querySelector<HTMLElement>("[data-open-button]")?.click(),
  };
}

// ---- the status bar's message ----

function statusAdapter(message: HTMLElement, cut: (el: Element | null) => boolean): Adapter {
  const doc = message.ownerDocument;
  const textOf = () => message.querySelector<HTMLElement>(".basalt-status-bar-text");
  return {
    targetOf: (node) => (node instanceof Node && message.contains(node) ? message : null),
    isCut: () => cut(textOf()),
    fill: (_target, plate) => {
      const view = doc.documentElement;
      plate.replaceChildren();
      plate.dataset.kind = "status";
      plate.removeAttribute("data-chosen");
      const text = textOf();
      const style = getComputedStyle(message);
      plate.style.direction = style.direction;
      for (const property of FONT) plate.style[property] = style[property];
      const body = doc.createElement("div");
      body.className = "basalt-peek-status";
      // An error's XCircle keeps its seat before the words, in the danger ink it has in the bar.
      const seat = message.querySelector<HTMLElement>(".basalt-status-bar-seat");
      if (seat) body.append(seat.cloneNode(true));
      const words = doc.createElement("span");
      words.className = "basalt-peek-name";
      words.textContent = wordsOf(text);
      if (text) words.style.color = getComputedStyle(text).color;
      body.append(words);
      plate.append(body);
      // The slot's own width and start, so the plate is the slot opened upward; never wider than the viewport less a gutter each side.
      const slot = message.getBoundingClientRect();
      const bar = message.closest<HTMLElement>(".basalt-status-bar") ?? message;
      const barTop = bar.getBoundingClientRect().top;
      // It grows up from the bar and never past the top of the viewport (what does not fit scrolls inside it).
      plate.style.maxHeight = `calc(${px(Math.min(barTop, view.clientHeight))} - 2 * var(--basalt-space-2))`;
      const room = `calc(${px(view.clientWidth)} - 2 * var(--basalt-space-2))`;
      plate.style.width = `min(${px(slot.width)}, ${room})`;
      plate.style.left = "0px";
      const box = plate.getBoundingClientRect();
      plate.style.left = `max(var(--basalt-space-2), min(${px(slot.left)}, calc(${px(view.clientWidth - box.width)} - var(--basalt-space-2))))`;
      // Its foot `space-2` above the bar's top border, in the page above the bar and clear of every control in it.
      plate.style.top = "auto";
      plate.style.bottom = `max(var(--basalt-space-2), calc(${px(view.clientHeight - barTop)} + var(--basalt-space-2)))`;
    },
    focusTarget: () => {
      const active = doc.activeElement;
      return active === message && message.hasAttribute("data-cut") && message.matches(":focus-visible") ? message : null;
    },
  };
}

// ---- a cut `Text`: one line or a clamp of n ----

/** Whether a `Text` with `lines` is cut now: one line by its width (and the fractional overflow a Range shows), a clamp by its height. */
function textCut(text: HTMLElement, cut: (el: Element | null) => boolean): boolean {
  if (text.querySelector(HOLDS_A_STOP)) return false;
  const lines = Number(text.getAttribute("data-lines"));
  if (!(lines >= 1)) return false;
  if (lines === 1) return cut(text);
  return text.scrollHeight > text.clientHeight + 1;
}

function textAdapter(text: HTMLElement, host: HTMLElement | null, cut: (el: Element | null) => boolean): Adapter {
  const doc = text.ownerDocument;
  // A label's focus is on its control; every other control takes focus itself.
  const focusable = (): HTMLElement | null => (host instanceof HTMLLabelElement ? host.control : host);
  return {
    targetOf: (node) => (node instanceof Node && (host ?? text).contains(node) ? text : null),
    isCut: () => textCut(text, cut),
    fill: (_target, plate) => {
      const view = doc.documentElement;
      plate.replaceChildren();
      plate.dataset.kind = "text";
      plate.removeAttribute("data-chosen");
      const style = getComputedStyle(text);
      plate.style.direction = style.direction;
      for (const property of FONT) plate.style[property] = style[property];
      plate.style.wordSpacing = style.wordSpacing;
      plate.style.textAlign = style.textAlign;
      plate.style.color = style.color;
      const words = doc.createElement("span");
      words.className = "basalt-peek-name";
      words.textContent = wordsOf(text);
      plate.append(words);
      // The plate's first line starts on the pixel the text starts on: its padding and rim sit outside the text's box. It is at least the text's width and
      // at most the wider of that and size-popover-max, never wider than the viewport less a gutter each side.
      const rect = text.getBoundingClientRect();
      const plateStyle = getComputedStyle(plate);
      const inset = parseFloat(plateStyle.borderLeftWidth) + parseFloat(plateStyle.paddingLeft);
      const own = rect.width + 2 * inset;
      const room = `calc(${px(view.clientWidth)} - 2 * var(--basalt-space-2))`;
      plate.style.minWidth = `min(${px(own)}, ${room})`;
      plate.style.maxWidth = `min(max(${px(own)}, var(--basalt-size-popover-max)), ${room})`;
      plate.style.left = "0px";
      plate.style.top = "0px";
      const box = plate.getBoundingClientRect();
      const rtl = style.direction === "rtl";
      const wanted = rtl ? rect.right + inset - box.width : rect.left - inset;
      plate.style.left = `max(var(--basalt-space-2), min(${px(wanted)}, calc(${px(view.clientWidth - box.width)} - var(--basalt-space-2))))`;
      plate.style.top = `max(var(--basalt-space-2), min(${px(rect.top - inset)}, calc(${px(view.clientHeight - box.height)} - var(--basalt-space-2))))`;
    },
    focusTarget: () => {
      const active = doc.activeElement;
      if (!host) return active === text && text.hasAttribute("data-cut") && text.matches(":focus-visible") ? text : null;
      const control = focusable();
      return control && active === control && control.matches(":focus-visible") ? text : null;
    },
    // A press on the plate is a press on the control round the text; on a text that is its own stop it does nothing.
    press: host ? () => host.click() : undefined,
    peekingOf: () => (host ? focusable() ?? host : text),
    // Outside a control a long press opens it; inside one the long press stays the browser's (a link's menu) and the control's.
    holds: !host,
  };
}

// ---- the controller: when the plate opens and closes ----

/** A running plate controller: `stop` removes it, and `sync` lets it see a pointer or focus that arrived before it loaded. */
export interface PeekController { stop: () => void; sync: () => void }

export function attachPeek(root: HTMLElement, kind: PeekKind, zIndex: string | undefined, onCut: (cut: boolean) => void): PeekController {
  const doc = root.ownerDocument;
  const found = doc.defaultView;
  if (!found) return { stop: () => {}, sync: () => {} };
  const win: Window & typeof globalThis = found;
  const cut = measurer(doc);
  // A `Text` inside a listbox option or an open-list row only cuts: those parts open their own plate over a cut row (or wrap on touch).
  if (kind === "text" && root.closest('[role="option"], [data-open-row]')) return { stop: () => {}, sync: () => {} };
  const host = kind === "text" ? root.parentElement?.closest<HTMLElement>(TEXT_CONTROL) ?? null : null;
  const adapter = kind === "listbox" ? listboxAdapter(root, cut) : kind === "open" ? openListAdapter(root, cut) : kind === "text" ? textAdapter(root, host, cut) : statusAdapter(root, cut);
  // Where hover and focus are heard: the control round a text (and a label's control, which can sit outside it), else the part itself.
  const hosts = kind === "text" && host ? [host, ...(host instanceof HTMLLabelElement && host.control && !host.contains(host.control) ? [host.control] : [])] : [root];
  let plate: HTMLDivElement | null = null;
  let current: HTMLElement | null = null;
  let hovered: HTMLElement | null = null;
  let suppressed: HTMLElement | null = null;
  let plateHovered = false;
  let byTouch = false;
  let wait = 0;
  let leave = 0;
  let hold = 0;
  let frame = 0;
  let closedAt = -Infinity;
  // The row (or message) under an open plate: its own focus ring gives way to the plate's, which goes round the whole plate.
  let peeking: HTMLElement | null = null;

  const make = () => {
    if (plate) return plate;
    plate = doc.createElement("div");
    plate.className = "basalt-peek";
    plate.setAttribute("aria-hidden", "true");
    plate.setAttribute("data-level", "3");
    if (zIndex) plate.style.zIndex = zIndex;
    plate.addEventListener("pointerenter", (event) => { if (event.pointerType !== "touch") { win.clearTimeout(leave); plateHovered = true; } });
    plate.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      plateHovered = false;
      // Off the plate and not back onto its row: the pointer has left both.
      const to = event.relatedTarget;
      if (!(to instanceof Node && (current?.contains(to) || (host !== null && hosts.some((at) => at.contains(to)))))) hovered = null;
      settle();
    });
    // The plate keeps focus where it is, and a press on it is a press on its row.
    plate.addEventListener("pointerdown", (event) => event.preventDefault());
    plate.addEventListener("click", () => {
      const target = current;
      if (!target || !adapter.press) return;
      close();
      adapter.press(target);
    });
    doc.body.append(plate);
    return plate;
  };

  const open = (target: HTMLElement, how: { touch?: boolean } = {}) => {
    win.clearTimeout(wait);
    win.clearTimeout(leave);
    if (suppressed === target || !adapter.isCut(target)) return;
    const p = make();
    current = target;
    byTouch = Boolean(how.touch);
    p.toggleAttribute("data-touch", byTouch);
    // The control ring at +2 goes round the plate when the keyboard opened it, except in the listbox, whose ring is the list's own.
    p.toggleAttribute("data-focus", kind !== "listbox" && adapter.focusTarget() === target);
    adapter.fill(target, p);
    p.setAttribute("data-open", "");
    peeking?.removeAttribute("data-peeking");
    peeking = adapter.peekingOf?.(target) ?? target;
    peeking.setAttribute("data-peeking", "");
  };

  function close() {
    win.clearTimeout(wait);
    win.clearTimeout(leave);
    peeking?.removeAttribute("data-peeking");
    peeking = null;
    if (!plate || !current) { current = null; return; }
    plate.removeAttribute("data-open");
    plate.removeAttribute("data-focus");
    current = null;
    byTouch = false;
    plateHovered = false;
    closedAt = win.performance.now();
  }

  // The plate stays while the pointer is on its row or the plate, or focus is on its row; it goes when all of them have left.
  function settle() {
    win.clearTimeout(leave);
    leave = win.setTimeout(() => {
      if (byTouch) return;
      const focused = adapter.focusTarget();
      if (focused && focused !== suppressed && adapter.isCut(focused)) { if (current !== focused) open(focused); return; }
      if (hovered && current === hovered) return;
      if (plateHovered) return;
      close();
    }, LEAVE);
  }

  // The row's words, or its place, have changed under an open plate: draw it again, or take it down when nothing is cut or the row has scrolled out of its list.
  const refresh = () => {
    if (!current || !plate) return;
    if (!current.isConnected || !adapter.isCut(current)) { close(); return; }
    const box = current.closest<HTMLElement>(".basalt-listbox-scroll")?.getBoundingClientRect();
    const at = current.getBoundingClientRect();
    if (box && (at.bottom <= box.top || at.top >= box.bottom)) { close(); return; }
    adapter.fill(current, plate);
  };

  // ---- hover ----
  const onOver = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const target = adapter.targetOf(event.target);
    if (!target || !(root.contains(target) || target === root) || target === hovered) return;
    hovered = target;
    win.clearTimeout(wait);
    if (current === target) { win.clearTimeout(leave); return; }
    if (!adapter.isCut(target)) { if (current) settle(); return; }
    win.clearTimeout(leave);
    // The tooltip's wait, or at once while a plate is open or one has just closed.
    if (current || win.performance.now() - closedAt < GRACE) open(target);
    else wait = win.setTimeout(() => open(target), WAIT);
  };
  const onOut = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const target = adapter.targetOf(event.target);
    if (!target || target !== hovered) return;
    const to = event.relatedTarget;
    // Inside a control the pointer is on the text while it is anywhere on the control.
    if (to instanceof Node && (target.contains(to) || plate?.contains(to) || (host !== null && hosts.some((at) => at.contains(to))))) return;
    hovered = null;
    win.clearTimeout(wait);
    if (suppressed === target) suppressed = null;
    settle();
  };

  // ---- focus ----
  const onFocusChange = () => {
    // After the browser has settled :focus-visible and the listbox its active option.
    win.requestAnimationFrame(() => {
      const focused = adapter.focusTarget();
      if (suppressed && suppressed !== focused) suppressed = null;
      if (focused && adapter.isCut(focused)) {
        if (current !== focused) open(focused);
        else plate?.toggleAttribute("data-focus", kind !== "listbox");
        return;
      }
      if (current && !byTouch) settle();
    });
  };
  const watch = new win.MutationObserver(onFocusChange);
  if (kind === "listbox") watch.observe(root, { attributes: true, attributeFilter: ["aria-activedescendant"] });

  // ---- Esc: the plate and nothing else ----
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !current) return;
    suppressed = current;
    close();
    event.stopPropagation();
  };
  // Any key after a press on the listbox's plate gives the keyboard its ring back.
  const onRootKey = () => root.removeAttribute("data-pointer-focus");
  const onRootBlur = () => root.removeAttribute("data-pointer-focus");

  // ---- touch: touch and hold on a cut row (the open list) ----
  let holdFrom: { x: number; y: number } | null = null;
  let swallowClick = false;
  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || !(kind === "open" || adapter.holds)) return;
    const target = adapter.targetOf(event.target);
    if (!target || !(root.contains(target) || target === root) || !adapter.isCut(target)) return;
    holdFrom = { x: event.clientX, y: event.clientY };
    win.clearTimeout(hold);
    hold = win.setTimeout(() => { swallowClick = true; open(target, { touch: true }); }, HOLD);
  };
  const onMove = (event: PointerEvent) => {
    if (!holdFrom || event.pointerType !== "touch") return;
    if (Math.hypot(event.clientX - holdFrom.x, event.clientY - holdFrom.y) > SLOP) { win.clearTimeout(hold); holdFrom = null; }
  };
  // The click a long press may or may not be followed by is swallowed if it comes; one that does not come must not swallow the next press.
  const onUp = () => { win.clearTimeout(hold); holdFrom = null; if (swallowClick) win.setTimeout(() => { swallowClick = false; }, 400); };
  // The release that ends a hold lands on the plate (it opened under the finger) or the row: either way it is swallowed, once.
  const onClickCapture = (event: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  };
  const onMenu = (event: Event) => { if (holdFrom || byTouch) event.preventDefault(); };
  // A touch anywhere but the plate closes a plate a hold opened; the touch then does what it does.
  const onDocDown = (event: PointerEvent) => {
    if (!byTouch || !current) return;
    if (plate && event.target instanceof Node && plate.contains(event.target)) return;
    close();
  };

  // ---- the status message: a focus stop only while it is cut ----
  let wasCut: boolean | null = null;
  const measure = () => {
    frame = 0;
    const now = adapter.isCut(root);
    if (now !== wasCut) {
      wasCut = now;
      // A cut `Text` is marked, and outside a control it is a stop of its own; inside one the control stays the one stop.
      if (kind === "text") {
        root.toggleAttribute("data-cut", now);
        if (!host) { if (now) root.setAttribute("tabindex", "0"); else root.removeAttribute("tabindex"); }
      }
      onCut(now);
    }
    refresh();
  };
  const schedule = () => { if (!frame) frame = win.requestAnimationFrame(measure); };

  // ---- scroll and resize carry the plate with its row ----
  const onScroll = () => { if (current && plate) refresh(); };
  const measured = kind === "status" || kind === "text";
  const onResize = () => { if (measured) schedule(); else refresh(); };

  for (const at of hosts) {
    at.addEventListener("pointerover", onOver);
    at.addEventListener("pointerout", onOut);
    at.addEventListener("focusin", onFocusChange);
    at.addEventListener("focusout", onFocusChange);
    at.addEventListener("pointerdown", onDown);
    at.addEventListener("pointermove", onMove);
    at.addEventListener("pointerup", onUp);
    at.addEventListener("pointercancel", onUp);
    at.addEventListener("contextmenu", onMenu);
  }
  if (kind === "listbox") { root.addEventListener("keydown", onRootKey); root.addEventListener("blur", onRootBlur); }
  doc.addEventListener("click", onClickCapture, true);
  doc.addEventListener("pointerdown", onDocDown, true);
  win.addEventListener("keydown", onKey, true);
  win.addEventListener("scroll", onScroll, { capture: true, passive: true });
  win.addEventListener("resize", onResize);

  let resize: ResizeObserver | undefined;
  let mutation: MutationObserver | undefined;
  let spacing: MutationObserver | undefined;
  if (measured) {
    // The message (or the text) is a stop only while it is cut: measured when it is drawn, when its box or its words change, and when the fonts arrive.
    resize = new win.ResizeObserver(schedule);
    resize.observe(root);
    mutation = new win.MutationObserver(schedule);
    mutation.observe(root, { childList: true, characterData: true, subtree: true, ...(kind === "text" ? { attributes: true, attributeFilter: ["data-lines", "style"] } : null) });
    void doc.fonts?.ready.then(schedule);
    if (kind === "text") {
      // A reader's own spacing (WCAG 1.4.12) can change what is cut without changing the text's box: a root style or class, or a style sheet.
      spacing = new win.MutationObserver(schedule);
      spacing.observe(doc.documentElement, { attributes: true, attributeFilter: ["style", "class", "lang", "dir"] });
      doc.fonts?.addEventListener("loadingdone", schedule);
    }
    measure();
  }

  // Hover and focus that began while this module was loading: the pointer is already on a row (the deepest hovered element is its target), or focus is in.
  const sync = () => {
    const hot = hosts.map((at) => [...at.querySelectorAll(":hover")].pop() ?? (at.matches(":hover") ? at : null)).find(Boolean) ?? null;
    if (hot) onOver({ target: hot, pointerType: "mouse" } as unknown as PointerEvent);
    onFocusChange();
  };

  const stop = () => {
    win.clearTimeout(wait);
    win.clearTimeout(leave);
    win.clearTimeout(hold);
    win.cancelAnimationFrame(frame);
    watch.disconnect();
    resize?.disconnect();
    mutation?.disconnect();
    spacing?.disconnect();
    doc.fonts?.removeEventListener("loadingdone", schedule);
    for (const at of hosts) {
      at.removeEventListener("pointerover", onOver);
      at.removeEventListener("pointerout", onOut);
      at.removeEventListener("focusin", onFocusChange);
      at.removeEventListener("focusout", onFocusChange);
      at.removeEventListener("pointerdown", onDown);
      at.removeEventListener("pointermove", onMove);
      at.removeEventListener("pointerup", onUp);
      at.removeEventListener("pointercancel", onUp);
      at.removeEventListener("contextmenu", onMenu);
    }
    if (kind === "text") {
      root.removeAttribute("data-cut");
      if (!host) root.removeAttribute("tabindex");
    }
    root.removeEventListener("keydown", onRootKey);
    root.removeEventListener("blur", onRootBlur);
    doc.removeEventListener("click", onClickCapture, true);
    doc.removeEventListener("pointerdown", onDocDown, true);
    win.removeEventListener("keydown", onKey, true);
    win.removeEventListener("scroll", onScroll, true);
    win.removeEventListener("resize", onResize);
    peeking?.removeAttribute("data-peeking");
    root.removeAttribute("data-pointer-focus");
    plate?.remove();
  };
  return { stop, sync };
}
