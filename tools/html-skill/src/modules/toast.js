/* Basalt HTML script, toast module: Basalt.toast({ title, description?, status?, action?, group?, running?, home?, timeout? }) shows a toast and returns its
   id; Basalt.toast.update(id, patch), .close(id) and .promise(work, { running, success, error }) are React's useToast. Toasts appear bottom right, stack three
   deep with the ones behind peeking, expand on hover or focus, and pause their clocks while hovered, focused, in a blurred window or in a hidden tab.
   A toast with no `home` is the only copy of what it says and stays until dismissed; with a `home` ("centre", "row", "key" or "page") it closes after
   5000ms. Results are announced once each: danger through an assertive live region, the rest through Basalt.announce. Needs the braille module (running).
   Source: tools/html-skill/src/modules/toast.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var LIMIT = 3;
  var DEFAULT_TIMEOUT = 5000;
  var items = []; // on screen, oldest first
  var queue = []; // waiting for room, oldest first
  var seq = 0;
  var viewport;
  var alertRegion;
  var hover = false;
  var focus = false;
  var blurred = false;
  var hidden = false;
  var NOSCROLL = { preventScroll: true };
  var modals = []; // focus history, retained when focus is lost to the browser or the document body
  var prior = null;
  var from = null; // where focus was when F6 took it to the region

  function status(o) { return o.status || 'neutral'; }
  function homes(o) { return o.home === undefined ? [] : typeof o.home === 'string' ? [o.home] : o.home; }

  /** A toast's lifetime in ms; 0 keeps it until it is dismissed. Only a toast that is not the only copy may time out: it needs a home, and an action needs a home other than the page. */
  function lifetime(o) {
    if (o.running) return 0;
    var h = homes(o);
    var kept = o.action ? h.some(function (x) { return x !== 'page'; }) : h.length > 0;
    return kept ? (o.timeout == null ? DEFAULT_TIMEOUT : o.timeout) : 0;
  }

  function say(text, urgent) {
    if (urgent) {
      alertRegion.textContent = '';
      setTimeout(function () { alertRegion.textContent = text; }, 30);
    } else B.announce(text);
  }
  function announce(o, suffix) { say(o.title + (suffix || '') + (o.description ? '. ' + o.description : ''), status(o) === 'danger'); }

  var MARK = { success: 'CheckCircle', warning: 'Warning', danger: 'XCircle' };

  function ensure() {
    if (viewport) return;
    viewport = document.createElement('div');
    viewport.className = 'toast-viewport';
    viewport.setAttribute('popover', 'manual');
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', 'Notifications');
    viewport.setAttribute('aria-live', 'off');
    // F6 reaches the region, as Base UI's viewport does in React: focus goes to it (not in the tab order), and Shift+Tab or Escape from it goes back to where it came from.
    viewport.tabIndex = -1;
    viewport.addEventListener('keydown', function (e) {
      if ((e.target !== viewport && e.target !== viewport.firstElementChild) || (e.key !== 'Escape' && !(e.key === 'Tab' && e.shiftKey))) return; // from the region, or from the first toast (what Shift+Tab would leave the stack for)
      e.preventDefault();
      e.stopPropagation(); // inside a dialog the focus trap would read the element just focused and wrap backwards
      var back = from;
      from = null;
      if (back && back.isConnected) back.focus(NOSCROLL);
    });
    document.body.appendChild(viewport);
    viewport.addEventListener('pointerenter', function () { hover = true; sync(); });
    viewport.addEventListener('pointerleave', function () { hover = false; sync(); });
    viewport.addEventListener('focusin', function () { focus = true; sync(); });
    viewport.addEventListener('focusout', function (e) { if (!viewport.contains(e.relatedTarget)) { focus = false; sync(); } });
    window.addEventListener('blur', function (e) { if (e.target === window) { blurred = true; sync(); } }, true);
    window.addEventListener('focus', function (e) { if (e.target === window) { blurred = false; sync(); } }, true);
    document.addEventListener('visibilitychange', function () { hidden = document.visibilityState === 'hidden'; sync(); });
    hidden = document.visibilityState === 'hidden';
    document.addEventListener('focusin', place);
    // Native focus can leave for browser chrome. Keep the last focused live modal until focus identifies another.
    new MutationObserver(place).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    document.addEventListener('beforetoggle', function (e) { if (e.newState === 'closed') release(e.target); }, true);
  }

  function ensureRegion() {
    if (alertRegion) return;
    alertRegion = document.createElement('div');
    alertRegion.className = 'visually-hidden';
    alertRegion.setAttribute('role', 'alert');
    document.body.appendChild(alertRegion);
  }

  /** Focus identifies the live modal; its history supplies the same answer when the document loses focus. */
  function place() {
    if (!viewport) return;
    modals = modals.filter(function (m) { return m.isConnected && m.matches('dialog:modal,.palette-scrim'); });
    var a = document.activeElement;
    var m = a && a.closest ? a.closest('dialog:modal,.palette-scrim') : null;
    if (m) { modals = modals.filter(function (x) { return x !== m; }); modals.push(m); }
    if (a !== document.body && !viewport.contains(a)) prior = a;
    move(modals[modals.length - 1] || document.body);
  }
  function move(to) {
    if (viewport.parentNode === to) return;
    var was = viewport.matches(':popover-open');
    to.appendChild(viewport);
    if (was || items.length) { viewport.showPopover(); resume(); }
  }
  /** Move before a modal hides or removes its contents; its own focus restoration places us in the next modal. */
  function release(m) {
    if (m === viewport) return;
    if (viewport && m.contains(viewport)) move(document.body);
    modals = modals.filter(function (x) { return x !== m; });
  }
  _.toast = { release: release };
  /** A moved element restarts its animations: each drain line picks up where its clock is. */
  function resume() {
    items.forEach(function (t) {
      var line = t.el.querySelector('.toast-drain');
      var ms = lifetime(t.o);
      if (!line || ms <= 0) return;
      var left = t.left - (t.running ? Date.now() - t.running : 0);
      line.style.animationDelay = (left - ms) + 'ms';
    });
  }

  function away() { return blurred || hidden; }
  function expanded() { return hover || focus; }

  /** Writes the stack's geometry (index, heights, offsets), the expanded state, and runs or pauses each clock. */
  function sync() {
    if (!viewport) return;
    var live = items.filter(function (t) { return !t.leaving; }).reverse(); // newest first
    var offset = 0;
    var frontmost = 0;
    viewport.toggleAttribute('data-away', away());
    // Natural heights first: a toast's own height with its height left to its content.
    live.forEach(function (t, i) {
      // The content flows at its own height whatever the toast's height is set to: that and the two rim pixels.
      t.h = t.content.offsetHeight + 2 * parseFloat(getComputedStyle(t.el).borderTopWidth);
      if (i === 0) frontmost = t.h;
    });
    items.forEach(function (t) {
      var i = live.indexOf(t);
      if (i < 0) return;
      var st = t.el.style;
      st.setProperty('--toast-index', i);
      st.setProperty('--toast-height', t.h + 'px');
      st.setProperty('--toast-frontmost-height', frontmost + 'px');
      st.setProperty('--toast-offset-y', offset + 'px');
      offset += t.h;
      t.el.toggleAttribute('data-expanded', expanded());
      t.content.toggleAttribute('data-expanded', expanded());
      t.content.toggleAttribute('data-behind', i > 0 && !expanded());
      t.el.toggleAttribute('data-limited', i >= LIMIT);
    });
    items.forEach(clock);
  }

  /** A toast's own clock: it runs for its lifetime, stops while the stack is hovered, focused or away, and resumes with what was left. */
  function clock(t) {
    clearTimeout(t.timer);
    if (t.leaving) return;
    var ms = lifetime(t.o);
    if (t.lap !== t.stamp + ':' + ms) { t.lap = t.stamp + ':' + ms; t.left = ms; t.running = 0; }
    if (t.running) { t.left = Math.max(0, t.left - (Date.now() - t.running)); t.running = 0; }
    if (ms <= 0 || expanded() || away()) return;
    t.running = Date.now();
    t.timer = setTimeout(function () { dismiss(t.id); }, t.left);
  }

  function dismiss(id) {
    var t = items.filter(function (x) { return x.id === id; })[0];
    if (!t || t.leaving) return;
    t.leaving = true;
    clearTimeout(t.timer);
    t.el.setAttribute('data-ending-style', '');
    sync();
    var finish = function () {
      t.el.remove();
      items = items.filter(function (x) { return x !== t; });
      if (!items.length && viewport.matches(':popover-open')) viewport.hidePopover();
      drain();
      sync();
    };
    // Gone once its leaving transition has run (a toast that cannot animate is gone at once).
    var run = t.el.getAnimations ? t.el.getAnimations() : [];
    if (run.length) Promise.all(run.map(function (a) { return a.finished.catch(function () {}); })).then(finish); else finish();
  }

  function focused(t) { return t.el.contains(document.activeElement); }

  /** Room for one more: below the limit, or by closing the oldest toast that is not the only copy and is not focused. */
  function makeRoom() {
    var onscreen = items.filter(function (t) { return !t.leaving; });
    if (onscreen.length < LIMIT) return true;
    for (var i = 0; i < onscreen.length; i++) {
      if (lifetime(onscreen[i].o) > 0 && !focused(onscreen[i])) { dismiss(onscreen[i].id); return true; }
    }
    return false;
  }

  function drain() {
    while (queue.length && items.filter(function (t) { return !t.leaving; }).length < LIMIT) enter(queue.shift());
  }

  function fill(t) {
    var o = t.o;
    var st = status(o);
    t.el.setAttribute('data-status', st);
    t.el.toggleAttribute('data-running', !!o.running);
    var running = !!o.running;
    var mark = !running && MARK[st] ? _.icon(MARK[st]) : '';
    t.content.innerHTML =
      (t.seat ? '<span class="toast-seat" aria-hidden="true">' + (running ? '<braille-spinner></braille-spinner>' : mark) + '</span>' : '') +
      '<div class="toast-text"><p class="toast-title" id="' + t.id + '-t">' + _.esc(o.title) +
      (t.count > 1 ? '<span class="toast-count" aria-hidden="true">×' + t.count + '</span><span class="visually-hidden">, ' + t.count + ' times</span>' : '') + '</p>' +
      '<p class="toast-description" id="' + t.id + '-d">' + _.esc(o.description || '') + '</p></div>' +
      (o.action ? '<button type="button" class="btn toast-action" data-size="xs"' + (o.action.keys ? ' aria-keyshortcuts="' + _.esc(o.action.keys) + '"' : '') + '><span>' + _.esc(o.action.label) + '</span></button>' : '') +
      '<button type="button" class="btn toast-close" data-variant="ghost" data-size="xs" data-icon-only aria-label="Dismiss">' + _.icon('X') + '</button>';
    var action = t.content.querySelector('.toast-action');
    if (action) action.addEventListener('click', function () { o.action.onClick(); });
    t.content.querySelector('.toast-close').addEventListener('click', function () { dismiss(t.id); });
    var old = t.el.querySelector('.toast-drain');
    if (old) old.remove();
    var ms = lifetime(o);
    if (ms > 0) t.el.insertAdjacentHTML('afterbegin', '<span class="toast-drain" style="animation-duration:' + ms + 'ms"></span>');
    t.el.setAttribute('aria-labelledby', t.id + '-t');
    t.el.setAttribute('aria-describedby', t.id + '-d');
  }

  function enter(t) {
    ensure();
    items.push(t);
    t.el = document.createElement('div');
    t.el.className = 'toast';
    t.el.id = t.id;
    t.el.setAttribute('role', 'dialog');
    t.el.setAttribute('aria-modal', 'false');
    t.el.tabIndex = 0;
    t.content = document.createElement('div');
    t.content.className = 'toast-content';
    t.el.appendChild(t.content);
    fill(t);
    t.el.setAttribute('data-starting-style', '');
    // It lives in the modal that holds focus, if there is one, and is raised above what has been opened since.
    place();
    var above = document.querySelector('[popover]:popover-open:not(.toast-viewport)');
    if (viewport.matches(':popover-open') && above) viewport.hidePopover();
    if (!viewport.matches(':popover-open')) viewport.showPopover();
    viewport.insertBefore(t.el, viewport.firstChild);
    sync();
    void t.el.offsetWidth;
    t.el.removeAttribute('data-starting-style');
    t.el.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      e.preventDefault(); // the containing native modal must stay open when Escape dismisses a toast action
      e.stopPropagation();
      var back = from;
      from = null;
      dismiss(t.id);
      if (back && back.isConnected) back.focus(NOSCROLL);
    });
    swipe(t);
    // Running work is not announced, step by step or at all: only its result is.
    if (!t.o.running) announce(t.o, t.count > 1 ? ', ' + t.count + ' times' : '');
  }

  /** Swiping a toast to the right dismisses it; a short pull springs back. */
  function swipe(t) {
    var x0 = null;
    t.el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button === 0) if (!e.target.closest('button')) x0 = e.clientX; });
    t.el.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      var dx = Math.max(0, e.clientX - x0);
      if (dx > 4) { t.el.setAttribute('data-swiping', ''); t.el.style.setProperty('--toast-swipe-movement-x', dx + 'px'); }
    });
    var end = function (e) {
      if (x0 === null) return;
      var dx = Math.max(0, e.clientX - x0);
      x0 = null;
      t.el.removeAttribute('data-swiping');
      if (dx > 60) { t.el.setAttribute('data-swipe-direction', 'right'); dismiss(t.id); } else t.el.style.removeProperty('--toast-swipe-movement-x');
    };
    t.el.addEventListener('pointerup', end);
    t.el.addEventListener('pointercancel', end);
  }

  function find(id) {
    return items.filter(function (t) { return t.id === id; })[0] || queue.filter(function (t) { return t.id === id; })[0];
  }

  function show(o) {
    ensureRegion();
    var st = status(o);
    if (o.group && st !== 'danger' && !o.running) {
      var same = function (t) { return t.o.group === o.group && !t.o.running && status(t.o) === st && !t.leaving; };
      var found = items.filter(same)[0] || queue.filter(same)[0];
      if (found) {
        found.count += 1;
        found.o = o;
        if (found.el) { found.stamp = ++seq; fill(found); sync(); announce(o, ', ' + found.count + ' times'); }
        return found.id;
      }
    }
    var t = { id: 'bh-toast-' + (++seq), o: o, seat: !!o.running || st !== 'neutral', count: 1, stamp: ++seq };
    if (makeRoom()) enter(t); else queue.push(t);
    return t.id;
  }

  function update(id, patch) {
    var t = find(id);
    if (!t) return;
    var prev = t.o;
    var ends = !!prev.running && !patch.running;
    // A result is a new statement: it starts from the title, the group and the lifetime, not from the running toast's action.
    var base = ends ? { title: prev.title, group: prev.group, home: prev.home, timeout: prev.timeout } : prev;
    var next = {};
    Object.keys(base).forEach(function (k) { next[k] = base[k]; });
    Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });
    next.running = patch.running || false;
    t.o = next;
    t.seat = t.seat || status(next) !== 'neutral';
    if (!t.el) return;
    t.stamp = ++seq;
    fill(t);
    sync();
    if (!next.running && (ends || prev.title !== next.title || prev.description !== next.description)) announce(next);
  }

  function close(id) {
    var t = find(id);
    if (!t) return;
    if (t.el) dismiss(id); else queue = queue.filter(function (x) { return x !== t; });
  }

  function promise(work, o) {
    var base = typeof o.running === 'string' ? { title: o.running } : o.running;
    var run = {};
    Object.keys(base).forEach(function (k) { run[k] = base[k]; });
    run.running = true;
    var id = show(run);
    var patch = function (given) { return typeof given === 'string' ? { title: given } : given; };
    work.then(
      function (value) { update(id, patch(typeof o.success === 'function' ? o.success(value) : o.success)); },
      function (error) { var p = patch(typeof o.error === 'function' ? o.error(error) : o.error); var d = { status: 'danger' }; Object.keys(p).forEach(function (k) { d[k] = p[k]; }); update(id, d); }
    );
    return work;
  }

  B.toast = show;
  show.update = update;
  show.close = close;
  show.promise = promise;
  // The announcer exists, empty, before the first toast, so the first result is spoken.
  _.step(140, 'wireToast', function () {
    ensureRegion();
    ensure(); // observe focus before any modal opens, even if the first toast is raised after focus is lost
    // Only this module handles keys in the toast stack; the palette checks its own event target.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'F6' || !items.length || e.target === viewport) return;
      e.preventDefault();
      place();
      if (!viewport.contains(document.activeElement)) from = document.activeElement === document.body && prior && prior.isConnected ? prior : document.activeElement;
      viewport.focus(NOSCROLL);
    }, true);
  });
})(window.Basalt);
