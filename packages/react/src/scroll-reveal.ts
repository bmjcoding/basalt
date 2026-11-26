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

/**
 * Keeps a scrolling tab row's content inside its column (cimip-gaps-3 t4). The port's padding is the focus ring's room, and a scrollport shows content through
 * its padding, so a cut tab and the divider would reach past the column there. While content is hidden past a side, that side is clipped at the column's edge:
 * the content edge, and on the start side the hang too (the port's start margin less its padding). A side with nothing past it is not clipped, so the ring
 * at +2 of the first tab at rest and of the last tab at the end keeps its room; a tab brought into view is space-6 clear, inside the clip. Physical sides,
 * read from the boxes' rects, so right to left needs nothing of its own.
 */
export function clipToColumn(port: HTMLElement, content: HTMLElement) {
  const box = port.getBoundingClientRect();
  const at = content.getBoundingClientRect();
  const style = getComputedStyle(port);
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;
  const hangLeft = Math.max(0, -(parseFloat(style.marginLeft) || 0) - padLeft);
  const hangRight = Math.max(0, -(parseFloat(style.marginRight) || 0) - padRight);
  const rtl = style.direction === "rtl";
  const contentLeft = box.left + port.clientLeft + padLeft;
  const contentRight = box.left + port.clientLeft + port.clientWidth - padRight;
  const left = at.left < contentLeft - 0.5 ? padLeft + (rtl ? 0 : hangLeft) : 0;
  const right = at.right > contentRight + 0.5 ? padRight + (rtl ? hangRight : 0) : 0;
  port.style.setProperty("--_clip-left", `${left}px`);
  port.style.setProperty("--_clip-right", `${right}px`);
  if (left || right) port.setAttribute("data-clip", "");
  else port.removeAttribute("data-clip");
}
