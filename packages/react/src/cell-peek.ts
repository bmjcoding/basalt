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

/** Whether a cell's text is cut: its content is wider than its box. */
function isCut(cell: HTMLElement): boolean {
  const box = cutBox(cell);
  if (box.scrollWidth > box.clientWidth) return true;
  // A fractional overflow rounds away in scrollWidth: measure the text itself.
  const range = cell.ownerDocument.createRange();
  range.selectNodeContents(box);
  const style = getComputedStyle(box);
  const inner = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  return range.getBoundingClientRect().width > inner + 0.5;
}

/** A cell that holds something focusable (a link, a button, a checkbox), or that the app made a stop itself, has its own stop. */
const ownsAStop = (cell: HTMLElement) => (cell.hasAttribute("tabindex") && !cell.hasAttribute("data-cut")) || cell.querySelector(FOCUSABLE) !== null;

/** The cells that can be cut: data cells, row headers and plain column headers (a sortable header is a button with its own stop). */
const cutCandidates = (table: HTMLTableElement) => [...table.querySelectorAll<HTMLElement>("tbody > tr:not([data-empty]) > :is(td, th), thead > tr > th:not([data-sortable])")];

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
    let frame = 0;
    const mark = () => {
      frame = 0;
      for (const cell of cutCandidates(root)) {
        if (ownsAStop(cell)) continue;
        const cut = isCut(cell);
        if (cut && !cell.hasAttribute("data-cut")) {
          cell.setAttribute("data-cut", "");
          cell.setAttribute("tabindex", "0");
        } else if (!cut && cell.hasAttribute("data-cut")) {
          cell.removeAttribute("data-cut");
          cell.removeAttribute("tabindex");
          if (current === cell) close();
        }
      }
    };
    const schedule = () => { if (!frame) frame = win.requestAnimationFrame(mark); };

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
    // The table's box, its rows (a sort, a filter, a page, a load) and its text change which cells are cut; so do a user's own
    // spacing (WCAG 1.4.12), which a style sheet or a root style sets without touching the table's box.
    const resize = new win.ResizeObserver(schedule);
    resize.observe(root);
    const mutation = new win.MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true, characterData: true });
    const styles = new win.MutationObserver(schedule);
    styles.observe(doc.head, { childList: true, subtree: true, characterData: true });
    styles.observe(doc.documentElement, { attributes: true, attributeFilter: ["style", "class", "lang", "dir"] });
    // A style sheet need not be in `<head>`: a user-style extension appends a `<style>` to `<html>`, and a sheet can arrive as a `<link>` that loads later. Any
    // style or link that comes, goes, changes its text or loads sets the cells to be measured again (WCAG 1.4.12); other mutations of the page are none of its business.
    const sheetNode = (node: Node | null) => { const element = node instanceof win.Element ? node : node?.parentElement; return Boolean(element?.closest("style, link[rel~='stylesheet']")); };
    const sheets = new win.MutationObserver((records) => {
      if (records.some((record) => sheetNode(record.target) || [...record.addedNodes, ...record.removedNodes].some((node) => sheetNode(node)))) schedule();
    });
    sheets.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["media", "disabled", "href"] });
    doc.addEventListener("load", schedule, true);
    void doc.fonts?.ready.then(schedule);
    win.addEventListener("resize", schedule);
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
      win.removeEventListener("resize", schedule);
      resize.disconnect();
      mutation.disconnect();
      styles.disconnect();
      sheets.disconnect();
      doc.removeEventListener("load", schedule, true);
      plate?.remove();
      for (const cell of root.querySelectorAll("[data-cut]")) {
        cell.removeAttribute("data-cut");
        cell.removeAttribute("tabindex");
      }
    };
  }, [table, enabled, zIndex]);
}
