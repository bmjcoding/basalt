/** Lengths on the four physical sides of a box, in CSS pixels. A side left out is 0. */
export interface Sides {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/** The scale a transformed ancestor (a popup entering at .98) puts on a box, so measuring stays in layout pixels. */
export function scaleOf(box: HTMLElement, rect: DOMRect) {
  const ratio = box.offsetWidth > 0 ? rect.width / box.offsetWidth : 1;
  return Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
}

/** A length a computed style gives in pixels ("auto" and "normal" are 0). */
const px = (value: string) => parseFloat(value) || 0;

/**
 * Brings `item` whole into view inside `scroller`, at once, on both axes (cimip-gaps-3 t4, item 6, made two-axis by t7). On each side it keeps clear the larger
 * of the item's `scroll-margin` and the port's `scroll-padding` (the fade's length and the ring's room), measured from the port's visible box less `edges`
 * (a clip line, or an opaque strip held at an edge: the tab row's column, a classic scrollbar, a sheet's held actions). The scroll is worked out from the
 * boxes' rects and added to `scrollLeft` and `scrollTop`, so no sign of `scrollLeft` is assumed (right to left included), and only `scroller` moves: never the
 * window. After the move the item's real rect is measured again, and a second move is made if it is still short (a clip that changed with the scroll). An
 * item too large to clear keeps its reading start in view: its top, and its start edge in reading order. An axis that does not overflow is left alone.
 */
export function revealIn(scroller: HTMLElement, item: Element | null, edges?: Sides) {
  if (!(item instanceof Element) || !scroller.contains(item)) return;
  for (let pass = 0; pass < 2; pass += 1) {
    const box = scroller.getBoundingClientRect();
    const scale = scaleOf(scroller, box);
    const at = item.getBoundingClientRect();
    const style = getComputedStyle(item);
    const port = getComputedStyle(scroller);
    let dx = 0;
    let dy = 0;
    if (scroller.scrollWidth - scroller.clientWidth > 1) {
      const clear = Math.max(px(style.scrollMarginInlineStart), px(style.scrollMarginInlineEnd), px(port.scrollPaddingLeft), px(port.scrollPaddingRight)) * scale;
      const start = box.left + (scroller.clientLeft + (edges?.left ?? 0)) * scale;
      const end = box.left + (scroller.clientLeft + scroller.clientWidth - (edges?.right ?? 0)) * scale;
      // Wider than the port with its margins: its start wins (in reading order), so its words begin in view.
      if (at.width + 2 * clear > end - start) dx = style.direction === "rtl" ? at.right + clear - end : at.left - clear - start;
      else if (at.left - clear < start) dx = at.left - clear - start;
      else if (at.right + clear > end) dx = at.right + clear - end;
    }
    if (scroller.scrollHeight - scroller.clientHeight > 1) {
      const clear = Math.max(px(style.scrollMarginBlockStart), px(style.scrollMarginBlockEnd), px(port.scrollPaddingTop), px(port.scrollPaddingBottom)) * scale;
      const top = box.top + (scroller.clientTop + (edges?.top ?? 0)) * scale;
      const bottom = box.top + (scroller.clientTop + scroller.clientHeight - (edges?.bottom ?? 0)) * scale;
      if (at.height + 2 * clear > bottom - top) dy = at.top - clear - top;
      else if (at.top - clear < top) dy = at.top - clear - top;
      else if (at.bottom + clear > bottom) dy = at.bottom + clear - bottom;
    }
    // Under half a pixel is rounding, not a shortfall.
    if (Math.abs(dx) < 0.5) dx = 0;
    if (Math.abs(dy) < 0.5) dy = 0;
    if (!dx && !dy) return;
    const before = `${scroller.scrollLeft} ${scroller.scrollTop}`;
    if (dx) scroller.scrollLeft += dx / scale;
    if (dy) scroller.scrollTop += dy / scale;
    // Already at the end of the scroll: a second pass would ask for the same move.
    if (`${scroller.scrollLeft} ${scroller.scrollTop}` === before) return;
  }
}

/**
 * Keeps a scrolling tab row's content inside its column (cimip-gaps-3 t4). The port's padding is the focus ring's room, and a scrollport shows content through
 * its padding, so a cut tab and the divider would reach past the column there. While content is hidden past a side, that side is clipped at the column's edge:
 * the content edge, and on the start side the hang too (the port's start margin less its padding). A side with nothing past it is not clipped, so the ring
 * at +2 of the first tab at rest and of the last tab at the end keeps its room; a tab brought into view is clear of the fade, inside the clip. Physical sides,
 * read from the boxes' rects, so right to left needs nothing of its own. Returns the two insets it wrote (the fade's clip insets, cimip-gaps-3 t7).
 */
export function clipToColumn(port: HTMLElement, content: HTMLElement): Sides {
  const box = port.getBoundingClientRect();
  const at = content.getBoundingClientRect();
  const style = getComputedStyle(port);
  const padLeft = px(style.paddingLeft);
  const padRight = px(style.paddingRight);
  const hangLeft = Math.max(0, -px(style.marginLeft) - padLeft);
  const hangRight = Math.max(0, -px(style.marginRight) - padRight);
  const rtl = style.direction === "rtl";
  const contentLeft = box.left + port.clientLeft + padLeft;
  const contentRight = box.left + port.clientLeft + port.clientWidth - padRight;
  const left = at.left < contentLeft - 0.5 ? padLeft + (rtl ? 0 : hangLeft) : 0;
  const right = at.right > contentRight + 0.5 ? padRight + (rtl ? hangRight : 0) : 0;
  port.style.setProperty("--_clip-left", `${left}px`);
  port.style.setProperty("--_clip-right", `${right}px`);
  if (left || right) port.setAttribute("data-clip", "");
  else port.removeAttribute("data-clip");
  return { left, right };
}
