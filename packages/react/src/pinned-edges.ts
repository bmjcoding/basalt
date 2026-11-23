import * as React from "react";

// What is pinned over a scroller's edges, measured. `--basalt-sticky-offset` (the bar) and `--basalt-bottom-offset` (the tab bar) are fixed
// values: right for a page with one bar, short for a page that also pins its own strip under the bar or a foot over the bottom. A page opts into
// the measured form, and then each scroller carries what really covers its edges:
//
//   data-pinned-measured      on the scroller (the root when the window scrolls)
//   --basalt-pinned-top       the heights of everything pinned to its top that is pinned now (the bar, a strip under it, a list's band from 720)
//   --basalt-pinned-bottom    the same at its bottom (a foot, the tab bar or the status bar under 720)
//
// The scroller is found, not named: a sticky element is pinned to its nearest ancestor that clips its overflow (the box it sticks in), and a fixed
// element to the window, whose scroller is the root. So a page whose scroller is an element (a pane, a sheet's body, an app that scrolls a column)
// gets the values on that element, and the stylesheet gives any `[data-pinned-measured]` element the same scroll padding the root gets. The values
// are custom properties, so everything inside a scroller reads that scroller's: a scroll owner reads `var(--basalt-pinned-top)` as its own.
//
// They feed the scroll padding, so a control that focus or an anchor brings into view is never under them (WCAG 2.4.11), and the toast stack sits
// above what is pinned at the window's bottom. An element counts when it carries `data-pinned-edge="top"` or `"bottom"` and is pinned now: its
// position is `sticky` or `fixed` and it is drawn. Basalt's own pinned parts carry the attribute; an app adds it to its own.
//
// Nothing runs at import. The first caller installs one ResizeObserver (on the pinned elements), one MutationObserver (for pinned elements
// that come and go) and one `resize` listener, each answered at most once a frame; the last to go removes them and every value it wrote.

let users = 0;
let teardown: (() => void) | undefined;

// A page's own sticky bar (`.basalt-sticky-bar`, the documented class for a custom header) covers the top without the attribute.
const PINNED = "[data-pinned-edge], .basalt-sticky-bar";
const edgeOf = (element: Element) => ["top", "bottom"].indexOf(element.getAttribute("data-pinned-edge") ?? (element.classList.contains("basalt-sticky-bar") ? "top" : ""));
const drawn = (style: CSSStyleDeclaration) => style.display !== "none" && style.visibility !== "hidden";

/**
 * The height an element covers now: it is pinned (sticky or fixed) and drawn. A list's band that sticks only from 720 counts only there. A part
 * it carries outside its own box (the status bar's message band, stacked above the bar under 720) is marked `data-pinned-extent`, and the cover
 * is the union of the two.
 */
function covering(style: CSSStyleDeclaration, element: Element): number {
  if (!drawn(style) || !/^(sticky|fixed)$/.test(style.position)) return 0;
  const box = element.getBoundingClientRect();
  let [top, bottom] = [box.top, box.bottom];
  for (const part of element.querySelectorAll("[data-pinned-extent]")) {
    const rect = part.getBoundingClientRect();
    if (!drawn(getComputedStyle(part)) || !rect.height) continue;
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
  }
  return bottom - top;
}
const CLIPS = /auto|scroll|hidden|overlay/;

/** The scroller a sticky element is pinned to: its nearest ancestor that clips overflow (any value but `visible` and `clip`), else the root. */
function scrollOwnerOf(element: Element): HTMLElement {
  for (let at = element.parentElement; at && at !== document.body && at !== document.documentElement; at = at.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(at);
    if (CLIPS.test(overflowX + overflowY)) return at;
  }
  return document.documentElement;
}

const NAMES = ["--basalt-pinned-top", "--basalt-pinned-bottom"];
function mark(owner: HTMLElement, values?: number[]) {
  owner.toggleAttribute("data-pinned-measured", !!values);
  NAMES.forEach((name, i) => (values ? owner.style.setProperty(name, `${Math.ceil(values[i]!)}px`) : owner.style.removeProperty(name)));
}

function install(): () => void {
  const root = document.documentElement;
  let frame = 0;
  // Every scroller written to, so a scroller that loses its pinned parts (or leaves the page) is cleaned.
  let owners = new Map<HTMLElement, number[]>();
  let watched: Element[] = [];
  const sizes = new ResizeObserver(() => schedule());
  const measure = () => {
    frame = 0;
    // Observed again only when the set changes: a newly observed element reports at once, and that report must not schedule this forever.
    const found = [...document.querySelectorAll(PINNED)];
    if (found.length !== watched.length || found.some((element, i) => element !== watched[i])) {
      sizes.disconnect();
      found.forEach((element) => sizes.observe(element));
      watched = found;
    }
    // The root is always measured while the page opts in: its fixed values give way to the measured ones even with nothing pinned.
    const totals = new Map<HTMLElement, number[]>([[root, [0, 0]]]);
    for (const element of found) {
      const edge = edgeOf(element);
      const style = getComputedStyle(element);
      const height = covering(style, element);
      if (edge < 0 || !height) continue;
      // A fixed part covers the window, whose scroller is the root; a sticky part covers the box it sticks in.
      const owner = style.position === "fixed" ? root : scrollOwnerOf(element);
      const total = totals.get(owner) ?? [0, 0];
      total[edge]! += height;
      totals.set(owner, total);
    }
    for (const owner of owners.keys()) if (!totals.has(owner)) mark(owner);
    owners = totals;
    totals.forEach((values, owner) => mark(owner, values));
  };
  const schedule = () => { frame ||= requestAnimationFrame(measure); };
  // Pinned parts come and go with the page's state (a strip that appears, a foot on one screen), and change their position at a breakpoint. A
  // part can also become pinned, or stop, with no change of size (a class or a style that makes it sticky, `hidden`): such a change on a pinned
  // part or on anything that holds one is measured; the same change anywhere else is not (an animated style elsewhere costs nothing here).
  const changes = new MutationObserver((records) => {
    const relevant = records.some((record) => record.type === "childList" || record.attributeName === "data-pinned-edge" || watched.some((element) => record.target === element || record.target.contains(element)));
    if (relevant) schedule();
  });
  changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-pinned-edge", "class", "style", "hidden"] });
  addEventListener("resize", schedule);
  measure();
  return () => {
    cancelAnimationFrame(frame);
    sizes.disconnect();
    changes.disconnect();
    removeEventListener("resize", schedule);
    owners.forEach((_, owner) => mark(owner));
  };
}

/**
 * Opt into the measured form of what is pinned (see the module's note): while a component that calls this is mounted, the scroll padding of the
 * root, and of any element that scrolls pinned parts of its own, follows `--basalt-pinned-top` and `--basalt-pinned-bottom`, measured from every
 * element marked `data-pinned-edge`, and the toast stack sits above what is pinned at the window's bottom. `AppShell` turns it on for itself when it
 * has a `foot`. Pass `false` to leave it off.
 */
export function usePinnedEdges(enabled = true): void {
  React.useEffect(() => {
    if (!enabled) return undefined;
    users += 1;
    if (users === 1) teardown = install();
    return () => {
      users -= 1;
      if (users > 0) return;
      teardown?.();
      teardown = undefined;
    };
  }, [enabled]);
}
