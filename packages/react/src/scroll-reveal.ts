/**
 * Brings `item` whole into view inside `scroller`, its `scroll-margin-inline` clear on each side, at once (cimip-gaps-3 t4, item 6: a tab row and a
 * segmented control wider than their column). The scroll is worked out from the two boxes' rects and added to `scrollLeft`, so no sign of `scrollLeft`
 * is assumed (right to left included), and only `scroller` moves: never the window. Does nothing while `scroller` does not overflow.
 */
export function revealIn(scroller: HTMLElement, item: Element | null) {
  if (!(item instanceof HTMLElement) || scroller.scrollWidth <= scroller.clientWidth) return;
  const box = scroller.getBoundingClientRect();
  const at = item.getBoundingClientRect();
  const style = getComputedStyle(item);
  const clear = Math.max(parseFloat(style.scrollMarginInlineStart) || 0, parseFloat(style.scrollMarginInlineEnd) || 0);
  const start = box.left + scroller.clientLeft;
  const end = start + scroller.clientWidth;
  let delta = 0;
  // The item is wider than the port with its margins: its start wins (in reading order), so its words begin in view.
  const rtl = style.direction === "rtl";
  if (at.width + 2 * clear > end - start) delta = rtl ? at.right + clear - end : at.left - clear - start;
  else if (at.left - clear < start) delta = at.left - clear - start;
  else if (at.right + clear > end) delta = at.right + clear - end;
  if (delta) scroller.scrollLeft += delta;
}
