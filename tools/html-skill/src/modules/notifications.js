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
   *     label?: 'Notifications', onSelect?(entry), onMarkAllRead?(), onClearAll?() (shows Clear all at the foot's start), onViewAll?(), viewAllHref?, side?: 'bottom', align?: 'end',
   *     wrap?: titles and lines wrap whole, direct (on an entry): addressed to the reader, the ringed dot and "for you", directLabel?: 'for you', count (on any entry): "×N" above 1,
   *     markAllReadReason? / clearAllReason?: why the action cannot run now (the button is off in place and described by the drawn reason), empty?: 'Nothing yet.',
   *     loading?: before the first setEntries, no count and no empty words })
   *   .setReasons({ markAllRead?, clearAll? }) changes the reasons.
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
    // Before the first answer (`loading` until the first setEntries): no count and no empty words.
    var waiting = !!o.loading;
    var directWords = o.directLabel || 'for you';
    var reasons = { markAllRead: o.markAllReadReason || '', clearAll: o.clearAllReason || '' };
    // Which groups are open, by entry id, so a new list from setEntries keeps them.
    var opened = {};
    // A placement the popover module knows, else the default: an option never reaches the markup as written.
    var side = _.pick(o.side, ['top', 'bottom', 'left', 'right'], 'bottom');
    var align = _.pick(o.align, ['start', 'center', 'end'], 'end');
    var viewAllHref = href(o.viewAllHref);
    // The bell is hung at a bar's end when it is the bar's last control (DECISIONS 336): `edge: 'end'`, or data-edge on its host.
    var edge = _.pick(o.edge || host.getAttribute('data-edge'), ['start', 'end'], '');
    host.innerHTML =
      '<button type="button" class="btn" data-variant="ghost" data-icon-only' + (edge ? ' data-edge="' + edge + '"' : '') + ' popovertarget="' + id + '" aria-haspopup="dialog">' + BELL + '<span class="notifications-dot" aria-hidden="true" hidden></span></button>' +
      '<div class="panel float popover notifications" popover id="' + id + '" data-side="' + side + '" data-align="' + align + '" aria-labelledby="' + id + '-title">' +
        '<div class="notifications-head"><h2 class="popover-title notifications-title" id="' + id + '-title">' + _.esc(label) + '</h2><span class="notifications-count"></span>' +
          '<button type="button" class="btn notifications-mark" data-variant="ghost" data-size="sm" data-edge="end">Mark all as read</button></div>' +
        '<p class="notifications-empty" hidden></p>' +
        '<div class="notifications-scroll"><span class="plate" aria-hidden="true"></span><ul class="notifications-list"' + (o.wrap ? ' data-wrap' : '') + '></ul></div>' +
        '<div class="notifications-foot"></div>' +
      '</div>';
    var button = host.firstElementChild;
    var pop = host.lastElementChild;
    var dot = button.querySelector('.notifications-dot');
    var count = pop.querySelector('.notifications-count');
    var mark = pop.querySelector('.notifications-mark');
    var empty = pop.querySelector('.notifications-empty');
    empty.textContent = o.empty || 'Nothing yet.';
    var head = pop.querySelector('.notifications-head');
    var scroll = pop.querySelector('.notifications-scroll');
    var list = pop.querySelector('.notifications-list');
    var foot = pop.querySelector('.notifications-foot');
    foot.innerHTML = (o.onClearAll ? '<button type="button" class="btn notifications-clear" data-variant="ghost" data-size="sm" data-edge="start">Clear all</button>' : '') + (viewAllHref
      ? '<a class="btn" data-variant="ghost" data-size="sm" data-edge="end" href="' + _.esc(viewAllHref) + '"><span>View all</span></a>'
      : '<button type="button" class="btn" data-variant="ghost" data-size="sm" data-edge="end"><span>View all</span></button>');
    var viewAll = foot.lastElementChild;
    var clear = pop.querySelector('.notifications-clear');
    var unglide;
    // A reason line under the head's row (or the foot's), from the band's start edge: drawn and referenced only while the action would otherwise run.
    function reason(control, band, words, applies, key) {
      if (!control) return;
      var line = band.querySelector('.notifications-reason[data-for="' + key + '"]');
      if (words && applies) {
        if (!line) { line = document.createElement('p'); line.className = 'notifications-reason'; line.id = id + '-' + key; line.setAttribute('data-for', key); band.appendChild(line); }
        line.textContent = words;
        control.setAttribute('aria-describedby', line.id);
        control.setAttribute('aria-disabled', 'true');
      } else {
        if (line) line.remove();
        control.removeAttribute('aria-describedby');
      }
    }

    function leave() { if (pop.matches(':popover-open')) pop.hidePopover(); }

    // One rule for the row, the dot, the count and Mark all as read: a group is unread while any of its entries is (its own flag is ignored).
    function isUnread(e) { return isGroup(e) ? e.entries.some(function (c) { return !!c.unread; }) : !!e.unread; }
    // Unread and for the reader, counted as unread is: an unread child of a group counts, and a group's own flag is ignored.
    function isDirect(e) { return isGroup(e) ? e.entries.some(function (c) { return !!(c.unread && c.direct); }) : !!(e.unread && e.direct); }
    function row(e, index, group) {
      var st = e.status || 'neutral';
      var link = group ? null : href(e.href);
      var tag = link ? 'a' : 'button';
      var unread = isUnread(e);
      var direct = unread && isDirect(e);
      // The count is the app's only as a whole number above 0 (above 1 on an entry that is not a group), so nothing else reaches the markup.
      var n = group ? (Number.isInteger(e.count) && e.count > 0 ? e.count : e.entries.length) : Number.isInteger(e.count) && e.count > 1 ? e.count : 0;
      var title = '<span class="notification-title">' + (unread ? '<span class="visually-hidden">' + (direct ? 'Unread, ' + _.esc(directWords) + ': ' : 'Unread: ') + '</span>' : '') + _.esc(e.title) + (n ? '<span class="visually-hidden">, ' + n + ' times</span>' : '') + '</span>';
      return '<' + tag + (tag === 'a' ? ' href="' + _.esc(link) + '"' : ' type="button"') + ' class="notification" data-index="' + index + '" data-id="' + _.esc(e.id) + '"' + (unread ? ' data-unread' : '') + (direct ? ' data-direct' : '') + ' data-status="' + _.esc(st) + '"' +
        (e.current ? ' data-current aria-current="' + (tag === 'a' ? 'page' : 'true') + '"' : '') + (group ? ' data-group aria-expanded="' + !!opened[e.id] + '" aria-controls="' + group + '"' : '') + '>' +
        '<span class="notification-dot" aria-hidden="true"></span><span class="notification-mark" aria-hidden="true">' + (MARK[st] ? _.icon(MARK[st]) : '') + '</span>' +
        '<span class="notification-text">' + (n ? '<span class="notification-head">' + title + '<span class="notification-count" aria-hidden="true">×' + n + '</span>' + (group ? CARET : '') + '</span>' : title) +
        (e.description ? '<span class="notification-line">' + _.esc(e.description) + '</span>' : '') + '</span>' +
        '<time class="notification-time"' + (e.dateTime ? ' datetime="' + _.esc(e.dateTime) + '"' : '') + '>' + _.esc(e.time) + '</time></' + tag + '>';
    }

    function render() {
      // The entry that holds focus keeps it when it is still there after the list is drawn again.
      var held = list.contains(document.activeElement) && document.activeElement.dataset.id;
      var unread = entries.reduce(function (n, e) { return n + (isGroup(e) ? e.entries.filter(function (c) { return c.unread; }).length : e.unread ? 1 : 0); }, 0);
      var direct = entries.reduce(function (n, e) { return n + (isGroup(e) ? e.entries.filter(function (c) { return c.unread && c.direct; }).length : e.unread && e.direct ? 1 : 0); }, 0);
      button.setAttribute('aria-label', unread > 0 ? label + ', ' + unread + ' unread' + (direct > 0 ? ', ' + direct + ' ' + directWords : '') : label);
      dot.hidden = unread === 0;
      button.toggleAttribute('data-direct', direct > 0);
      // "3 unread" is drawn and ", 1 for you" said (the longer line does not fit beside the title and the button at 360); before the first answer the seat is blank.
      count.textContent = waiting && entries.length === 0 ? '' : unread + ' unread';
      if (direct > 0 && !(waiting && entries.length === 0)) { var said = document.createElement('span'); said.className = 'visually-hidden'; said.textContent = ', ' + direct + ' ' + directWords; count.appendChild(said); }
      // Stays mounted and keeps focus when nothing is left to mark: disabled in place.
      if (unread === 0) mark.setAttribute('aria-disabled', 'true'); else mark.removeAttribute('aria-disabled');
      if (clear) { if (entries.length === 0) clear.setAttribute('aria-disabled', 'true'); else clear.removeAttribute('aria-disabled'); }
      reason(mark, head, reasons.markAllRead, unread > 0, 'mark');
      reason(clear, foot, reasons.clearAll, entries.length > 0, 'clear');
      empty.hidden = entries.length > 0 || waiting;
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
      setEntries: function (next) { waiting = false; entries = drawn(next || []); render(); },
      setReasons: function (next) { reasons = { markAllRead: (next && next.markAllRead) || '', clearAll: (next && next.clearAll) || '' }; render(); },
      open: function () { pop.showPopover({ source: button }); },
      close: leave
    };
  }

  B.notifications = notifications;
})(window.Basalt);
