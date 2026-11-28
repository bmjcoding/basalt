/* Basalt HTML script, peek module: the plate that shows cut text whole (React's cell-peek.ts and the text plate in peek-plate.ts). One controller, `_.peek`, opens a
   level-3 plate (`.cell-peek`: the rim, shadow-overlay, radius 8) over what is cut on hover (after the tooltip's 600ms wait, at once within 400ms of another closing)
   or on keyboard focus. It meets WCAG 1.4.13: Esc closes it without moving the pointer or focus (captured, so a dialog round it stays open), the pointer can move onto
   it, and it stays until hover and focus have both left. It is aria-hidden: the cut element holds the words. The still table's cut cells use it, and so does
   `[data-lines]` text (cut to one line, or clamped to n): while it is cut it is a stop of its own (`data-cut`, `tabindex="0"`), or, inside a control (a link, a button,
   a summary, a label or a widget role), the control is the stop and the plate opens from its hover and focus, and a press on the plate is a press on the control.
   Without hover there is no plate inside a control: the core CSS shows the text whole there. `data-peek="off"` cuts and opens nothing.
   Source: tools/html-skill/src/modules/peek.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var CONTROL = 'a[href], button, summary, label, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="checkbox"], [role="radio"], [role="switch"], [role="treeitem"]';
  var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [role="checkbox"], [role="button"]';

  /* cfg: { hosts: [elements that hear hover and focus], find(target) -> the cut element or null, focused() -> the cut element focus is on or null, fill(el, plate),
     ring?(el) -> whether the plate carries the focus ring (default: focus is on it), press?(el), holds?: a long press on touch opens it }. Returns { close(el?) }. */
  function peek(cfg) {
    var plate = null, current = null, hovered = null, suppressed = null, wait = 0, leave = 0, hold = 0, closedAt = -1e9, plateHovered = false, byTouch = false, from = null;
    function inHosts(n) { return n instanceof Node && cfg.hosts.some(function (h) { return h.contains(n); }); }
    function make() {
      if (plate) return plate;
      plate = document.createElement('div');
      plate.className = 'cell-peek';
      plate.setAttribute('aria-hidden', 'true');
      plate.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') { clearTimeout(leave); plateHovered = true; } });
      plate.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'touch') return;
        plateHovered = false;
        if (!(e.relatedTarget instanceof Node && current && (current.contains(e.relatedTarget) || (cfg.press && inHosts(e.relatedTarget))))) hovered = null;
        settle();
      });
      // The plate keeps focus where it is, and a press on it is a press on what it covers.
      plate.addEventListener('pointerdown', function (e) { if (cfg.press) e.preventDefault(); });
      plate.addEventListener('click', function () { var t = current; if (!t || !cfg.press) return; close(); cfg.press(t); });
      // In the top-layer surface its element sits in (a modal <dialog>, an open popover), or the page: appended to the body, a plate over a modal dialog's text
      // would be under the dialog and inert.
      var surface = cfg.hosts[0].closest('dialog[open], [popover]');
      (surface || document.body).appendChild(plate);
      return plate;
    }
    function open(el, touch) {
      clearTimeout(wait); clearTimeout(leave);
      if (suppressed === el) return;
      var p = make();
      current = el;
      byTouch = !!touch;
      cfg.fill(el, p);
      p.toggleAttribute('data-focus', cfg.ring ? cfg.ring(el) : cfg.focused() === el);
      p.setAttribute('data-open', '');
      el.setAttribute('data-peeking', '');
    }
    function close() {
      clearTimeout(wait); clearTimeout(leave);
      if (current) current.removeAttribute('data-peeking');
      if (!current || !plate) { current = null; return; }
      plate.removeAttribute('data-open'); plate.removeAttribute('data-focus');
      current = null; byTouch = false; plateHovered = false; closedAt = performance.now();
    }
    // It stays while the pointer is on its element or the plate, or focus is on its element; it goes when all of them have left.
    function settle() {
      clearTimeout(leave);
      leave = setTimeout(function () {
        if (byTouch) return;
        var f = cfg.focused();
        if (f && f !== suppressed) { if (current !== f) open(f); return; }
        if ((hovered && current === hovered) || plateHovered) return;
        close();
      }, 100);
    }
    function over(e) {
      if (e.pointerType === 'touch') return;
      var el = cfg.find(e.target);
      if (!el || el === hovered) return;
      hovered = el; clearTimeout(wait); clearTimeout(leave);
      if (current === el) return;
      if (current || performance.now() - closedAt < 400) open(el); else wait = setTimeout(function () { open(el); }, 600);
    }
    function out(e) {
      if (e.pointerType === 'touch') return;
      var el = cfg.find(e.target);
      if (!el || el !== hovered) return;
      var to = e.relatedTarget;
      if (to instanceof Node && (el.contains(to) || (plate && plate.contains(to)) || (cfg.press && inHosts(to)))) return;
      hovered = null; clearTimeout(wait);
      if (suppressed === el) suppressed = null;
      settle();
    }
    function focusChange() {
      requestAnimationFrame(function () {
        var f = cfg.focused();
        if (suppressed && suppressed !== f) suppressed = null;
        if (f) { if (current !== f) open(f); else if (plate) plate.setAttribute('data-focus', ''); return; }
        if (current && !byTouch) settle();
      });
    }
    cfg.hosts.forEach(function (h) {
      h.addEventListener('pointerover', over);
      h.addEventListener('pointerout', out);
      h.addEventListener('focusin', focusChange);
      h.addEventListener('focusout', focusChange);
      if (!cfg.holds) return;
      // A long press on touch opens it (500ms, a drift of 8px cancels); a touch anywhere else closes it.
      h.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'touch') return;
        var el = cfg.find(e.target);
        if (!el) return;
        from = { x: e.clientX, y: e.clientY };
        clearTimeout(hold);
        hold = setTimeout(function () { open(el, true); }, 500);
      });
      h.addEventListener('pointermove', function (e) { if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 8) { clearTimeout(hold); from = null; } });
      h.addEventListener('pointerup', function () { clearTimeout(hold); from = null; });
      h.addEventListener('contextmenu', function (e) { if (from || byTouch) e.preventDefault(); });
    });
    document.addEventListener('pointerdown', function (e) { if (byTouch && current && !(plate && plate.contains(e.target))) close(); }, true);
    window.addEventListener('keydown', function (e) { if (e.key !== 'Escape' || !current) return; suppressed = current; close(); e.stopPropagation(); }, true);
    window.addEventListener('scroll', function () { if (current && plate) cfg.fill(current, plate); }, { capture: true, passive: true });
    return { close: function (el) { if (!el || el === current) close(); } };
  }
  _.peek = peek;

  // ---- `[data-lines]`: text cut to one line or clamped to n, read whole on the plate ----
  var range = null;
  function isCut(el) {
    if (el.querySelector(FOCUSABLE)) return false;
    var n = Number(el.getAttribute('data-lines'));
    if (!(n >= 1)) return false;
    if (n > 1) return el.scrollHeight > el.clientHeight + 1;
    if (el.scrollWidth > el.clientWidth) return true;
    range = range || document.createRange();
    range.selectNodeContents(el);
    var cs = getComputedStyle(el);
    return range.getBoundingClientRect().width > el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 0.5;
  }
  function fillText(el, p) {
    var cs = getComputedStyle(el), view = document.documentElement, g = 'var(--basalt-space-2)';
    p.setAttribute('data-kind', 'text');
    p.textContent = el.textContent.replace(/\s+/g, ' ').trim();
    ['fontFamily', 'fontSize', 'fontWeight', 'fontVariantNumeric', 'letterSpacing', 'wordSpacing', 'lineHeight', 'color', 'textAlign', 'direction'].forEach(function (k) { p.style[k] = cs[k]; });
    // The plate's first line starts on the pixel the text starts on; it is at least the text's width and at most the wider of that and size-popover-max, inside the viewport.
    var r = el.getBoundingClientRect(), ps = getComputedStyle(p), inset = parseFloat(ps.borderLeftWidth) + parseFloat(ps.paddingLeft), own = r.width + 2 * inset;
    var room = 'calc(' + view.clientWidth + 'px - 2 * ' + g + ')';
    p.style.minWidth = 'min(' + own + 'px, ' + room + ')';
    p.style.maxWidth = 'min(max(' + own + 'px, var(--basalt-size-popover-max)), ' + room + ')';
    p.style.left = '0px'; p.style.top = '0px';
    var b = p.getBoundingClientRect(), want = cs.direction === 'rtl' ? r.right + inset - b.width : r.left - inset;
    p.style.left = 'max(' + g + ', min(' + want + 'px, calc(' + (view.clientWidth - b.width) + 'px - ' + g + ')))';
    p.style.top = 'max(' + g + ', min(' + (r.top - inset) + 'px, calc(' + (view.clientHeight - b.height) + 'px - ' + g + ')))';
  }
  function wireText(el) {
    if (el.__bhLines) return;
    el.__bhLines = true;
    var n = Number(el.getAttribute('data-lines'));
    if (n >= 1) el.style.setProperty('--_lines', String(Math.floor(n)));
    // An option of a list is read by its list; data-peek="off" only cuts.
    if (el.getAttribute('data-peek') === 'off' || el.closest('[role="option"]')) return;
    var host = el.parentElement && el.parentElement.closest(CONTROL);
    var control = host && host.tagName === 'LABEL' ? host.control : host;
    var api = peek({
      hosts: host ? [host].concat(control && !host.contains(control) ? [control] : []) : [el],
      find: function (t) { return t instanceof Node && (host || el).contains(t) && el.hasAttribute('data-cut') ? el : null; },
      focused: function () {
        var a = document.activeElement;
        if (!el.hasAttribute('data-cut')) return null;
        if (!host) return a === el && el.matches(':focus-visible') ? el : null;
        return control && a === control && control.matches(':focus-visible') ? el : null;
      },
      fill: fillText,
      press: host ? function () { host.click(); } : null,
      holds: !host
    });
    function mark() {
      var cut = isCut(el);
      if (cut === el.hasAttribute('data-cut')) return;
      el.toggleAttribute('data-cut', cut);
      if (!host) { if (cut) el.setAttribute('tabindex', '0'); else el.removeAttribute('tabindex'); }
      if (!cut) api.close(el);
    }
    var frame = 0;
    function schedule() { if (!frame) frame = requestAnimationFrame(function () { frame = 0; mark(); }); }
    // Measured again when its box or its words change, when the fonts arrive, and on a reader's own spacing (WCAG 1.4.12), which a root style sets without touching its box.
    new ResizeObserver(schedule).observe(el);
    new MutationObserver(schedule).observe(el, { childList: true, subtree: true, characterData: true });
    new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'lang', 'dir'] });
    if (document.fonts) document.fonts.ready.then(schedule);
    mark();
  }

  _.step(64, 'peekText', function () { document.querySelectorAll('[data-lines]').forEach(wireText); });
})(window.Basalt);
