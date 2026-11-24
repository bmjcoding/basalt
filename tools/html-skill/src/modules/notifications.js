/* Basalt HTML script, notifications module: Basalt.notifications(host, options) builds React's NotificationCentre into `host`: a bell button (a dot when
   anything is unread) that opens a popover of entries, with "Mark all as read" and "View all". It is presentational: the page owns the entries, their read
   state and persistence, and calls .setEntries(entries) when they change. Returns { setEntries, open, close, element, button }. Needs the popover and glide modules.
   Source: tools/html-skill/src/modules/notifications.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var seq = 0;
  var MARK = { success: 'CheckCircle', warning: 'Warning', danger: 'XCircle', pending: 'Circle' };
  var CARET = '<svg class="icon notification-caret" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="%glyph:chevron-right%"/></svg>';
  var BELL = '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="%glyph:notifications%"/></svg>';

  /**
   *   Basalt.notifications(host, { entries: [{ id, title, description?, time, dateTime?, status?: 'success'|'warning'|'danger'|'pending', unread?, href?, current?,
   *     entries?: [...] (a group: its row opens to these; it is unread while any of them is, and a danger entry is lifted out of it), count? }],
   *     label?: 'Notifications', onSelect?(entry), onMarkAllRead?(), onClearAll?() (shows Clear all at the foot's start), onViewAll?(), viewAllHref?, side?: 'bottom', align?: 'end' })
   */
  function isGroup(e) { return !!(e.entries && e.entries.length); }
  // A link from the entries is written only when it passes core's check (relative, http, https, mailto or tel); any other row is a button.
  var href = _.safeHref;
  // Errors never group: a danger entry in a group is drawn at the top level, right after it, and a group left with none is not drawn.
  function drawn(list) {
    var out = [];
    list.forEach(function (e) {
      if (!isGroup(e)) return out.push(e);
      var kept = e.entries.filter(function (c) { return c.status !== 'danger'; });
      if (kept.length) out.push(kept.length === e.entries.length ? e : Object.assign({}, e, { entries: kept }));
      e.entries.forEach(function (c) { if (c.status === 'danger') out.push(c); });
    });
    return out;
  }

  function notifications(host, options) {
    var o = options || {};
    if (typeof host === 'string') host = document.querySelector(host);
    var id = 'bh-notes-' + (++seq);
    var label = o.label || 'Notifications';
    var entries = drawn(o.entries || []);
    // Which groups are open, by entry id, so a new list from setEntries keeps them.
    var opened = {};
    // A placement the popover module knows, else the default: an option never reaches the markup as written.
    var side = _.pick(o.side, ['top', 'bottom', 'left', 'right'], 'bottom');
    var align = _.pick(o.align, ['start', 'center', 'end'], 'end');
    var viewAllHref = href(o.viewAllHref);
    host.innerHTML =
      '<button type="button" class="btn" data-variant="ghost" data-icon-only popovertarget="' + id + '" aria-haspopup="dialog">' + BELL + '<span class="notifications-dot" aria-hidden="true" hidden></span></button>' +
      '<div class="panel float popover notifications" popover id="' + id + '" data-side="' + side + '" data-align="' + align + '" aria-labelledby="' + id + '-title">' +
        '<div class="notifications-head"><h2 class="popover-title notifications-title" id="' + id + '-title">' + _.esc(label) + '</h2><span class="notifications-count"></span>' +
          '<button type="button" class="btn notifications-mark" data-variant="ghost" data-size="sm">Mark all as read</button></div>' +
        '<p class="notifications-empty" hidden>Nothing yet.</p>' +
        '<div class="notifications-scroll"><span class="plate" aria-hidden="true"></span><ul class="notifications-list"></ul></div>' +
        '<div class="notifications-foot"></div>' +
      '</div>';
    var button = host.firstElementChild;
    var pop = host.lastElementChild;
    var dot = button.querySelector('.notifications-dot');
    var count = pop.querySelector('.notifications-count');
    var mark = pop.querySelector('.notifications-mark');
    var empty = pop.querySelector('.notifications-empty');
    var scroll = pop.querySelector('.notifications-scroll');
    var list = pop.querySelector('.notifications-list');
    var foot = pop.querySelector('.notifications-foot');
    foot.innerHTML = (o.onClearAll ? '<button type="button" class="btn notifications-clear" data-variant="ghost" data-size="sm">Clear all</button>' : '') + (viewAllHref
      ? '<a class="btn" data-variant="ghost" data-size="sm" href="' + _.esc(viewAllHref) + '"><span>View all</span></a>'
      : '<button type="button" class="btn" data-variant="ghost" data-size="sm"><span>View all</span></button>');
    var viewAll = foot.lastElementChild;
    var clear = pop.querySelector('.notifications-clear');
    var unglide;

    function leave() { if (pop.matches(':popover-open')) pop.hidePopover(); }

    // One rule for the row, the dot, the count and Mark all as read: a group is unread while any of its entries is (its own flag is ignored).
    function isUnread(e) { return isGroup(e) ? e.entries.some(function (c) { return !!c.unread; }) : !!e.unread; }
    function row(e, index, group) {
      var st = e.status || 'neutral';
      var link = group ? null : href(e.href);
      var tag = link ? 'a' : 'button';
      var unread = isUnread(e);
      // The count is the app's only as a whole number above 0, so nothing else reaches the markup.
      var n = group ? (Number.isInteger(e.count) && e.count > 0 ? e.count : e.entries.length) : 0;
      var title = '<span class="notification-title">' + (unread ? '<span class="visually-hidden">Unread: </span>' : '') + _.esc(e.title) + (group ? '<span class="visually-hidden">, ' + n + ' times</span>' : '') + '</span>';
      return '<' + tag + (tag === 'a' ? ' href="' + _.esc(link) + '"' : ' type="button"') + ' class="notification" data-index="' + index + '" data-id="' + _.esc(e.id) + '"' + (unread ? ' data-unread' : '') + ' data-status="' + _.esc(st) + '"' +
        (e.current ? ' data-current aria-current="' + (tag === 'a' ? 'page' : 'true') + '"' : '') + (group ? ' data-group aria-expanded="' + !!opened[e.id] + '" aria-controls="' + group + '"' : '') + '>' +
        '<span class="notification-dot" aria-hidden="true"></span><span class="notification-mark" aria-hidden="true">' + (MARK[st] ? _.icon(MARK[st]) : '') + '</span>' +
        '<span class="notification-text">' + (group ? '<span class="notification-head">' + title + '<span class="notification-count" aria-hidden="true">×' + n + '</span>' + CARET + '</span>' : title) +
        (e.description ? '<span class="notification-line">' + _.esc(e.description) + '</span>' : '') + '</span>' +
        '<time class="notification-time"' + (e.dateTime ? ' datetime="' + _.esc(e.dateTime) + '"' : '') + '>' + _.esc(e.time) + '</time></' + tag + '>';
    }

    function render() {
      // The entry that holds focus keeps it when it is still there after the list is drawn again.
      var held = list.contains(document.activeElement) && document.activeElement.dataset.id;
      var unread = entries.reduce(function (n, e) { return n + (isGroup(e) ? e.entries.filter(function (c) { return c.unread; }).length : e.unread ? 1 : 0); }, 0);
      button.setAttribute('aria-label', unread > 0 ? label + ', ' + unread + ' unread' : label);
      dot.hidden = unread === 0;
      count.textContent = unread + ' unread';
      // Stays mounted and keeps focus when nothing is left to mark: disabled in place.
      if (unread === 0) mark.setAttribute('aria-disabled', 'true'); else mark.removeAttribute('aria-disabled');
      if (clear) { if (entries.length === 0) clear.setAttribute('aria-disabled', 'true'); else clear.removeAttribute('aria-disabled'); }
      empty.hidden = entries.length > 0;
      scroll.hidden = entries.length === 0;
      // A group's row opens its entries in place, indented under its words (at once: the reveal's track is React's); focus stays on the row.
      list.innerHTML = entries.map(function (e, i) {
        if (!isGroup(e)) return '<li>' + row(e, i) + '</li>';
        var gid = id + '-g' + i;
        return '<li>' + row(e, i, gid) + '<ul class="notification-entries" id="' + gid + '"' + (opened[e.id] ? '' : ' hidden') + '>' +
          e.entries.map(function (c, j) { return '<li>' + row(c, i + '.' + j) + '</li>'; }).join('') + '</ul></li>';
      }).join('');
      if (held) [].some.call(list.querySelectorAll('.notification'), function (el) { return el.dataset.id === held && (el.focus(), true); });
    }

    list.addEventListener('click', function (ev) {
      var el = ev.target.closest('.notification');
      if (!el) return;
      var at = el.dataset.index.split('.');
      if (el.hasAttribute('data-group')) {
        var open = el.getAttribute('aria-expanded') !== 'true';
        opened[entries[Number(at[0])].id] = open;
        el.setAttribute('aria-expanded', String(open));
        document.getElementById(el.getAttribute('aria-controls')).hidden = !open;
        return;
      }
      var e = entries[Number(at[0])];
      if (o.onSelect) o.onSelect(at.length > 1 ? e.entries[Number(at[1])] : e);
      leave();
    });
    mark.addEventListener('click', function () { if (mark.getAttribute('aria-disabled') !== 'true' && o.onMarkAllRead) o.onMarkAllRead(); });
    if (clear) clear.addEventListener('click', function () { if (clear.getAttribute('aria-disabled') !== 'true') o.onClearAll(); });
    viewAll.addEventListener('click', function () { if (o.onViewAll) o.onViewAll(); leave(); });
    pop.addEventListener('toggle', function (ev) {
      if (ev.newState === 'open') unglide = _.glide(scroll, scroll.firstElementChild, { active: '.notification[data-hovered]', item: '.notification' });
      else if (unglide) { unglide(); unglide = null; }
    });
    render();
    return {
      element: pop,
      button: button,
      setEntries: function (next) { entries = drawn(next || []); render(); },
      open: function () { pop.showPopover({ source: button }); },
      close: leave
    };
  }

  B.notifications = notifications;
})(window.Basalt);
