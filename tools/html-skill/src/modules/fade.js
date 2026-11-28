/* Basalt HTML script, fade module: cut content fades (cimip-gaps-3 t7, DECISIONS 395 to 399), for the modules that scroll (tabs, segment, code, terminal,
   palette, command list, filter, notifications, search, menu, combobox, dialog, popover, sheet, pane). Not a page API. React's own scroll-fade.ts is bundled
   in by the build, so the two cannot drift: _.scrollFade(port, opts) fades a scrollport at each edge that hides more (opts: axis, content, insets, pinned,
   skip, ring; it returns refresh, keep and stop) and _.revealIn(port, item, edges) brings an item clear of the fade on both axes. _.port(host, cls, opts)
   moves a popup's or a panel's content into its port, and _.scrollStop(box, name) makes a port that overflows with nothing focusable a keyboard stop.
   Source: tools/html-skill/src/modules/fade.js (do not edit the copy in the skill folder). */
import { revealIn, watchScrollFade } from "../../../../packages/react/src/scroll-fade.ts";

(function (B) {
  'use strict';
  var _ = B._;
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

  /**
   * While `box` overflows downward and holds nothing focusable it is a keyboard stop with a role and a name (React's useScrollStop, WCAG 2.1.1): tabindex 0,
   * role region, named by `name()` (an id). Measured from the box and what is in it, so a resize, a new line or a control that arrives counts.
   */
  function scrollStop(box, name) {
    if (box.__bhStop) return;
    box.__bhStop = true;
    var own = box.hasAttribute('tabindex');
    function measure() {
      var holds = Array.prototype.some.call(box.querySelectorAll(FOCUSABLE), function (n) { return n.getClientRects().length && !n.closest('[hidden],[inert]'); });
      var on = !own && (box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1) && !holds;
      var id = name && name();
      if (on) { box.setAttribute('tabindex', '0'); if (id) { box.setAttribute('role', 'region'); box.setAttribute('aria-labelledby', id); } }
      else if (!own && box.hasAttribute('tabindex')) { box.removeAttribute('tabindex'); box.removeAttribute('role'); box.removeAttribute('aria-labelledby'); }
    }
    new ResizeObserver(measure).observe(box);
    new MutationObserver(measure).observe(box, { childList: true, subtree: true });
    measure();
  }

  /**
   * A popup's or a panel's port (cimip-gaps-3 t7): the first time, the host's children move into a new element of class `cls`, which holds the padding,
   * scrolls and fades at each edge that hides more, while the host keeps its rim, fill, shadow and ring. `opts` are scrollFade's. Returns the port.
   */
  function port(host, cls, opts) {
    var box = host.querySelector(':scope > .' + cls);
    if (!box) {
      box = document.createElement('div');
      box.className = cls;
      while (host.firstChild) box.appendChild(host.firstChild);
      host.appendChild(box);
    }
    if (!box.__bhFade) box.__bhFade = watchScrollFade(box, opts || {});
    return box;
  }

  _.scrollFade = watchScrollFade;
  _.revealIn = revealIn;
  _.port = port;
  _.scrollStop = scrollStop;
})(window.Basalt);
