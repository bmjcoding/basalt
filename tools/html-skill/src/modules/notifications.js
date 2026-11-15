/* Basalt HTML script, notifications module: Basalt.notifications(host, options) builds React's NotificationCentre into `host`: a bell button (a dot when
   anything is unread) that opens a popover of entries, with "Mark all as read" and "View all". It is presentational: the page owns the entries, their read
   state and persistence, and calls .setEntries(entries) when they change. Returns { setEntries, open, close, element, button }. Needs the popover and glide modules.
   Source: tools/html-skill/src/modules/notifications.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var seq = 0;
  var MARK = { success: 'CheckCircle', warning: 'Warning', danger: 'XCircle' };
  var BELL = '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="%glyph:notifications%"/></svg>';

  /**
   *   Basalt.notifications(host, { entries: [{ id, title, description?, time, dateTime?, status?: 'success'|'warning'|'danger', unread?, href? }],
   *     label?: 'Notifications', onSelect?(entry), onMarkAllRead?(), onViewAll?(), viewAllHref?, side?: 'bottom', align?: 'end' })
   */
  function notifications(host, options) {
    var o = options || {};
    if (typeof host === 'string') host = document.querySelector(host);
    var id = 'bh-notes-' + (++seq);
    var label = o.label || 'Notifications';
    var entries = o.entries || [];
    host.innerHTML =
      '<button type="button" class="btn" data-variant="ghost" data-icon-only popovertarget="' + id + '" aria-haspopup="dialog">' + BELL + '<span class="notifications-dot" aria-hidden="true" hidden></span></button>' +
      '<div class="panel float popover notifications" popover id="' + id + '" data-side="' + (o.side || 'bottom') + '" data-align="' + (o.align || 'end') + '" aria-labelledby="' + id + '-title">' +
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
    foot.innerHTML = o.viewAllHref
      ? '<a class="btn" data-variant="ghost" data-size="sm" href="' + _.esc(o.viewAllHref) + '"><span>View all</span></a>'
      : '<button type="button" class="btn" data-variant="ghost" data-size="sm"><span>View all</span></button>';
    var viewAll = foot.firstElementChild;
    var unglide;

    function leave() { if (pop.matches(':popover-open')) pop.hidePopover(); }

    function render() {
      var unread = entries.reduce(function (n, e) { return n + (e.unread ? 1 : 0); }, 0);
      button.setAttribute('aria-label', unread > 0 ? label + ', ' + unread + ' unread' : label);
      dot.hidden = unread === 0;
      count.textContent = unread + ' unread';
      // Stays mounted and keeps focus when nothing is left to mark: disabled in place.
      if (unread === 0) mark.setAttribute('aria-disabled', 'true'); else mark.removeAttribute('aria-disabled');
      empty.hidden = entries.length > 0;
      scroll.hidden = entries.length === 0;
      list.innerHTML = entries.map(function (e, i) {
        var st = e.status || 'neutral';
        var tag = e.href ? 'a' : 'button';
        return '<li><' + tag + (e.href ? ' href="' + _.esc(e.href) + '"' : ' type="button"') + ' class="notification" data-index="' + i + '"' + (e.unread ? ' data-unread' : '') + ' data-status="' + _.esc(st) + '">' +
          '<span class="notification-dot" aria-hidden="true"></span><span class="notification-mark" aria-hidden="true">' + (MARK[st] ? _.icon(MARK[st]) : '') + '</span>' +
          '<span class="notification-text"><span class="notification-title">' + (e.unread ? '<span class="visually-hidden">Unread: </span>' : '') + _.esc(e.title) + '</span>' +
          (e.description ? '<span class="notification-line">' + _.esc(e.description) + '</span>' : '') + '</span>' +
          '<time class="notification-time"' + (e.dateTime ? ' datetime="' + _.esc(e.dateTime) + '"' : '') + '>' + _.esc(e.time) + '</time></' + tag + '></li>';
      }).join('');
    }

    list.addEventListener('click', function (ev) {
      var row = ev.target.closest('.notification');
      if (!row) return;
      if (o.onSelect) o.onSelect(entries[Number(row.dataset.index)]);
      leave();
    });
    mark.addEventListener('click', function () { if (mark.getAttribute('aria-disabled') !== 'true' && o.onMarkAllRead) o.onMarkAllRead(); });
    viewAll.addEventListener('click', function () { if (o.onViewAll) o.onViewAll(); leave(); });
    pop.addEventListener('toggle', function (ev) {
      if (ev.newState === 'open') unglide = _.glide(scroll, scroll.firstElementChild, { active: '.notification[data-hovered]', item: '.notification' });
      else if (unglide) { unglide(); unglide = null; }
    });
    render();
    return {
      element: pop,
      button: button,
      setEntries: function (next) { entries = next || []; render(); },
      open: function () { pop.showPopover({ source: button }); },
      close: leave
    };
  }

  B.notifications = notifications;
})(window.Basalt);
