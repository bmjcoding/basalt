import type { Sides } from "./scroll-fade";

// The shared reveal lives with the fade (scroll-fade.ts), so a lazy module that fades (the status peek plate) reaches one chunk that imports nothing.
export { revealIn, scaleOf } from "./scroll-fade";

/** A length a computed style gives in pixels ("auto" and "normal" are 0). */
const px = (value: string) => parseFloat(value) || 0;
export type { Sides } from "./scroll-fade";

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
