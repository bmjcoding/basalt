import * as React from "react";

// A cut cell that can be read (decisions 138 and 139). A still table keeps its ellipsis and its row height. A cell whose text is cut
// becomes a focus stop, and on hover (after the tooltip's wait) or focus its whole value opens in place over it on a level-3 plate that
// meets WCAG 1.4.13: Esc dismisses it without moving the pointer or focus, the pointer can move onto it, and it stays until hover and
// focus have both left. A cell that is not cut is not a stop and opens nothing. Nothing here runs when the module loads; the plate is
// made on first use and removed with the table.

/** The tooltip's wait before it opens on hover, and the grace after one closes in which the next opens at once. Exported: the list and status plates (peek-plate.ts) keep the same timings. */
export const WAIT = 600;
export const GRACE = 400;
/** How long the pointer may be off the cell and the plate before the plate leaves: the time it takes to cross the 1px rim between them. */
export const LEAVE = 100;

const COPIED = ["fontFamily", "fontSize", "fontWeight", "fontVariantNumeric", "letterSpacing", "wordSpacing", "lineHeight", "color"] as const;

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [role="checkbox"], [role="button"]';

/** The box that carries a cell's ellipsis: the cell, or the one block it holds that truncates itself. */
function cutBox(cell: HTMLElement): HTMLElement {
  const only = cell.children.length === 1 && cell.childNodes.length === 1 ? (cell.children[0] as HTMLElement) : null;
  if (only && getComputedStyle(only).display === "block" && getComputedStyle(only).overflowX !== "visible") return only;
  return cell;
}

/**
 * Whether a cell's text is cut: its content is wider than its box. `range` is the table's one Range, pointed at each cell in turn: the
 * document adjusts every live Range on every insertion and removal anywhere on the page, so a Range per cell, dropped, would make each
 * later DOM change (a sort moves every row) pay for all of them until the collector ran.
 */
function isCut(cell: HTMLElement, range: Range): boolean {
  const box = cutBox(cell);
  if (box.scrollWidth > box.clientWidth) return true;
  // A fractional overflow rounds away in scrollWidth: measure the text itself.
  range.selectNodeContents(box);
  const style = getComputedStyle(box);
  const inner = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  return range.getBoundingClientRect().width > inner + 0.5;
}

/** A cell that holds something focusable (a link, a button, a checkbox), or that the app made a stop itself, has its own stop. */
const ownsAStop = (cell: HTMLElement) => (cell.hasAttribute("tabindex") && !cell.hasAttribute("data-cut")) || cell.querySelector(FOCUSABLE) !== null;

/** The cells that can be cut: data cells, row headers and plain column headers (a sortable header is a button with its own stop). */
const cutCandidates = (table: HTMLTableElement) => [...table.querySelectorAll<HTMLElement>("tbody > tr:not([data-empty]) > :is(td, th), thead > tr > th:not([data-sortable])")];

/** The cells of one row that can be cut (the same set `cutCandidates` finds, for one row). */
const rowCandidates = (row: HTMLTableRowElement): HTMLElement[] => {
  if (row.matches("tbody > tr:not([data-empty])")) return [...row.querySelectorAll<HTMLElement>(":scope > :is(td, th)")];
  if (row.matches("thead > tr")) return [...row.querySelectorAll<HTMLElement>(":scope > th:not([data-sortable])")];
  return [];
};

/**
 * Marks the cut cells of a still table (`data-cut`, and `tabindex="0"` so each is a stop) and opens the plate over one on hover or
 * focus. `enabled` is false for a table that lays out from its content, which never truncates.
 */
export function useCellPeek(table: React.RefObject<HTMLTableElement | null>, enabled: boolean, zIndex?: string) {
  React.useEffect(() => {
    const found = table.current;
    const view = found?.ownerDocument.defaultView;
    if (!enabled || !found || !view) return undefined;
    const root: HTMLTableElement = found;
    const win = view;
    const doc = root.ownerDocument;

    // ---- which cells are cut ----
    // One Range for the table, made on first use. What is measured is what can have changed: every cell when the table's width, the fonts, a style
    // sheet or the root's spacing change, and otherwise only the rows a mutation names (a row that only moved is not named: its cells are the
    // cells they were, as the columns are fixed). Every cell is read before any is written, so the page recalculates its style once.
    let range: Range | null = null;
    let frame = 0;
    let all = false;
    let width = -1;
    const rows = new Set<HTMLTableRowElement>();
    // The rows measured so far: a row that comes back to the table (a sort, a page) is not measured again unless the table was.
    let seen = new WeakSet<HTMLTableRowElement>();
    const mark = () => {
      frame = 0;
      let cells: HTMLElement[];
      if (all) {
        cells = cutCandidates(root);
        seen = new WeakSet();
        for (const row of root.rows) seen.add(row);
      } else {
        cells = [];
        for (const row of rows) {
          if (!root.contains(row)) continue;
          seen.add(row);
          cells.push(...rowCandidates(row));
        }
      }
      all = false;
      rows.clear();
      width = root.getBoundingClientRect().width;
      range ??= doc.createRange();
      const reading = range;
      const changes: Array<[HTMLElement, boolean]> = [];
      for (const cell of cells) {
        if (ownsAStop(cell)) continue;
        const cut = isCut(cell, reading);
        if (cut !== cell.hasAttribute("data-cut")) changes.push([cell, cut]);
      }
      reading.setStart(doc, 0);
      reading.collapse(true);
      for (const [cell, cut] of changes) {
        if (cut) {
          cell.setAttribute("data-cut", "");
          cell.setAttribute("tabindex", "0");
        } else {
          cell.removeAttribute("data-cut");
          cell.removeAttribute("tabindex");
          if (current === cell) close();
        }
      }
    };
    const schedule = () => { if (!frame) frame = win.requestAnimationFrame(mark); };
    const scheduleAll = () => { all = true; schedule(); };
    // A mutation names the rows it changed: its target's row, or the new rows it added to a section. A row removed is not named.
    const named = (records: MutationRecord[]) => {
      for (const record of records) {
        const target = record.target;
        const at = target instanceof win.Element ? target : target.parentElement;
        const row = at?.closest("tr");
        if (row && root.contains(row)) {
          rows.add(row);
          continue;
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof win.Element)) continue;
          if (node instanceof win.HTMLTableRowElement) {
            if (!seen.has(node)) rows.add(node);
          } else {
            for (const inner of node.querySelectorAll("tr")) if (!seen.has(inner)) rows.add(inner);
          }
        }
      }
      if (rows.size) schedule();
    };

    // ---- the plate ----
    let plate: HTMLDivElement | null = null;
    let current: HTMLElement | null = null;
    let hovered: HTMLElement | null = null;
    let suppressed: HTMLElement | null = null;
    let wait = 0;
    let leave = 0;
    let closedAt = -Infinity;

    const make = () => {
      if (plate) return plate;
      plate = doc.createElement("div");
      plate.className = "basalt-cell-peek";
      plate.setAttribute("aria-hidden", "true");
      plate.setAttribute("data-level", "3");
      if (zIndex) plate.style.zIndex = zIndex;
      plate.addEventListener("pointerenter", () => { win.clearTimeout(leave); plateHovered = true; });
      plate.addEventListener("pointerleave", (event) => {
        plateHovered = false;
        // Off the plate and not back onto its cell: the pointer has left both.
        if (!(event.relatedTarget instanceof Node && current?.contains(event.relatedTarget))) hovered = null;
        settle();
      });
      doc.body.append(plate);
      return plate;
    };
    let plateHovered = false;

    // Place the plate over its cell: the text starts exactly where the cell's does, the plate wraps at the container's end edge, and
    // it is never past the viewport (a cell scrolled half out of view moves the plate in, rather than leaving it off screen).
    const place = () => {
      if (!plate || !current) return;
      const rect = current.getBoundingClientRect();
      const frameBox = (current.closest(".basalt-table-container") ?? root).getBoundingClientRect();
      const rtl = getComputedStyle(current).direction === "rtl";
      const view = doc.documentElement;
      const reach = (n: number) => `${n}px`;
      const gutter = "var(--basalt-space-2)";
      // The plate may be narrower than its cell (a column wider than the viewport), never wider than the viewport less a gutter each side; the column never changes.
      const room = `calc(${reach(view.clientWidth)} - 2 * ${gutter})`;
      plate.style.minWidth = `min(${reach(rect.width)}, ${room})`;
      plate.style.minHeight = reach(rect.height);
      plate.style.maxWidth = `min(max(${reach(rect.width)}, ${reach(rtl ? rect.right - frameBox.left : frameBox.right - rect.left)}), ${room})`;
      plate.style.left = "0px";
      plate.style.top = "0px";
      const box = plate.getBoundingClientRect();
      const wanted = rtl ? rect.right - box.width : rect.left;
      plate.style.left = `max(${gutter}, min(${reach(wanted)}, calc(${reach(view.clientWidth - box.width)} - ${gutter})))`;
      plate.style.top = `max(${gutter}, min(${reach(rect.top)}, calc(${reach(view.clientHeight - box.height)} - ${gutter})))`;
    };

    const open = (cell: HTMLElement) => {
      win.clearTimeout(wait);
      win.clearTimeout(leave);
      if (suppressed === cell) return;
      const style = getComputedStyle(cell);
      const peek = make();
      peek.textContent = (cell.textContent ?? "").trim();
      for (const property of COPIED) peek.style[property] = style[property];
      // The plate's own 1px rim stands in for the cell's padding, so the text starts on the same pixel.
      peek.style.paddingInline = `calc(${style.paddingLeft} - var(--basalt-size-hairline)) calc(${style.paddingRight} - var(--basalt-size-hairline))`;
      peek.style.paddingBlock = "0px";
      peek.toggleAttribute("data-focus", doc.activeElement === cell && cell.matches(":focus-visible"));
      current = cell;
      place();
      peek.setAttribute("data-open", "");
    };

    function close() {
      win.clearTimeout(wait);
      win.clearTimeout(leave);
      if (!current || !plate) { current = null; return; }
      plate.removeAttribute("data-open");
      plate.removeAttribute("data-focus");
      current = null;
      closedAt = win.performance.now();
    }

    // The plate stays while the pointer is on the cell or the plate, or focus is on the cell; it goes when all three have left.
    function settle() {
      win.clearTimeout(leave);
      leave = win.setTimeout(() => {
        const focused = doc.activeElement instanceof HTMLElement && doc.activeElement.hasAttribute("data-cut") && root.contains(doc.activeElement) ? doc.activeElement : null;
        if (focused) { if (current !== focused) open(focused); return; }
        if (hovered && current === hovered) return;
        if (plateHovered) return;
        close();
      }, LEAVE);
    }

    const cellOf = (target: EventTarget | null) => {
      const cell = target instanceof Element ? target.closest<HTMLElement>("[data-cut]") : null;
      return cell && root.contains(cell) ? cell : null;
    };

    const onOver = (event: PointerEvent) => {
      const cell = cellOf(event.target);
      if (!cell || cell === hovered) return;
      hovered = cell;
      win.clearTimeout(wait);
      win.clearTimeout(leave);
      if (current === cell) return;
      // The tooltip's wait, or at once while a plate is open or one has just closed.
      if (current || win.performance.now() - closedAt < GRACE) open(cell);
      else wait = win.setTimeout(() => open(cell), WAIT);
    };
    const onOut = (event: PointerEvent) => {
      const cell = cellOf(event.target);
      if (!cell || cell !== hovered) return;
      const to = event.relatedTarget;
      if (to instanceof Node && (cell.contains(to) || plate?.contains(to))) return;
      hovered = null;
      win.clearTimeout(wait);
      if (suppressed === cell) suppressed = null;
      settle();
    };
    const onFocusIn = (event: FocusEvent) => {
      const cell = cellOf(event.target);
      if (!cell) return;
      if (suppressed && suppressed !== cell) suppressed = null;
      open(cell);
    };
    const onFocusOut = (event: FocusEvent) => {
      const cell = cellOf(event.target);
      if (!cell) return;
      if (suppressed === cell) suppressed = null;
      settle();
    };
    // Esc dismisses the plate and nothing else: the pointer and focus stay where they are, so the cell keeps its focus ring. Capture
    // and stop, so a dialog or a menu around the table does not close with it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !current) return;
      suppressed = current;
      close();
      event.stopPropagation();
    };
    // A scroll (the page's, or the container's sideways) carries the plate with its cell.
    const onScroll = () => { if (current) place(); };

    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerout", onOut);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    win.addEventListener("keydown", onKey, true);
    win.addEventListener("scroll", onScroll, { capture: true, passive: true });

    // ---- when to measure again ----
    // The table's width (a height that only follows its rows is none of the cells' business), its rows, its text, and a user's own spacing
    // (WCAG 1.4.12), which a style sheet or a root style sets without touching the table's box.
    const resize = new win.ResizeObserver(() => {
      const now = root.getBoundingClientRect().width;
      if (width >= 0 && now !== width) scheduleAll();
    });
    resize.observe(root);
    const mutation = new win.MutationObserver(named);
    mutation.observe(root, { childList: true, subtree: true, characterData: true });
    const spacing = new win.MutationObserver(scheduleAll);
    spacing.observe(doc.documentElement, { attributes: true, attributeFilter: ["style", "class", "lang", "dir"] });
    // A style sheet need not be in `<head>`: a user-style extension appends a `<style>` to `<html>`, and a sheet can arrive as a `<link>` that loads later. Any
    // style or link that comes, goes, changes its text or loads sets the cells to be measured again (WCAG 1.4.12); other mutations of the page (the page's title
    // among them) are none of its business.
    const sheetNode = (node: Node | null) => { const element = node instanceof win.Element ? node : node?.parentElement; return Boolean(element?.closest("style, link[rel~='stylesheet']")); };
    const sheets = new win.MutationObserver((records) => {
      if (records.some((record) => sheetNode(record.target) || [...record.addedNodes, ...record.removedNodes].some((node) => sheetNode(node)))) scheduleAll();
    });
    sheets.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["media", "disabled", "href"] });
    doc.addEventListener("load", scheduleAll, true);
    // A font that arrives later (the page's, or one a new line of text asks for) changes every width; fonts already loaded at mount need no second look.
    doc.fonts?.addEventListener("loadingdone", scheduleAll);
    win.addEventListener("resize", scheduleAll);
    all = true;
    mark();

    return () => {
      win.cancelAnimationFrame(frame);
      win.clearTimeout(wait);
      win.clearTimeout(leave);
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerout", onOut);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      win.removeEventListener("keydown", onKey, true);
      win.removeEventListener("scroll", onScroll, true);
      win.removeEventListener("resize", scheduleAll);
      resize.disconnect();
      mutation.disconnect();
      spacing.disconnect();
      sheets.disconnect();
      doc.removeEventListener("load", scheduleAll, true);
      doc.fonts?.removeEventListener("loadingdone", scheduleAll);
      plate?.remove();
      for (const cell of root.querySelectorAll("[data-cut]")) {
        cell.removeAttribute("data-cut");
        cell.removeAttribute("tabindex");
      }
    };
  }, [table, enabled, zIndex]);
}
