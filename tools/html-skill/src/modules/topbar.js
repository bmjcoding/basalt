/* Basalt HTML script, topbar module: the site footer's links and disclosures (React's SiteFooter), a bar that arrives or leaves and returns (React's useSitePhase),
   and the skip link under a bar that is not at the top of the viewport (DECISIONS 142). When the page's skip link takes focus it reads the real bottom
   edge of the first .topbar or .app-header and sits space-2 below it, and reads it again on scroll and on resize while it holds focus: a notice above the bar scrolls away and the bar
   then sticks at the top. With no script, or no bar, the link is where the stylesheet puts it (under a bar at the viewport's top). React's SkipLink does the same.
   Source: tools/html-skill/src/modules/topbar.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  function wireSkipLink() {
    var link = document.querySelector('.skip-link');
    if (!link || link.__bhSkip) return;
    link.__bhSkip = true;
    function place() {
      var bar = document.querySelector('.topbar, .app-header');
      if (bar) link.style.top = 'calc(' + Math.max(0, bar.getBoundingClientRect().bottom) + 'px + var(--basalt-space-2))';
      else link.style.removeProperty('top');
    }
    link.addEventListener('focus', function () {
      place();
      window.addEventListener('scroll', place, { capture: true, passive: true });
      window.addEventListener('resize', place);
    });
    link.addEventListener('blur', function () {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      link.style.removeProperty('top');
    });
  }


  /* ---- The site footer (DECISIONS 146 A): each list of links gets the pill's reserved 600 width and the shared glide's plate; under 720 each labelled group is a
     disclosure (a 44px row with the label and a chevron, closed unless it holds the current page). Without script every group is open. ---- */
  var footers = 0;
  function wireFooters() {
    document.querySelectorAll('.site-footer').forEach(function (footer) {
      if (footer.__bhFooter) return;
      footer.__bhFooter = true;
      footer.querySelectorAll('ul').forEach(function (list) {
        list.querySelectorAll('a').forEach(function (a) { a.setAttribute('data-label', a.textContent.trim()); });
        var host = document.createElement('div');
        host.className = 'site-footer-links-host';
        var plate = document.createElement('span');
        plate.className = 'plate';
        plate.setAttribute('aria-hidden', 'true');
        list.parentNode.insertBefore(host, list);
        host.appendChild(plate);
        host.appendChild(list);
        if (_.glide) _.glide(host, plate, { active: 'a[data-hovered]', item: 'a' });
      });
      footer.querySelectorAll('.site-footer-group').forEach(function (group) {
        var label = group.querySelector('.site-footer-label');
        var host = group.querySelector('.site-footer-links-host');
        if (!label || !host) return;
        var id = 'bh-footer-' + footers++;
        host.id = id;
        var name = label.textContent;
        label.innerHTML = '<span class="site-footer-label-wide"></span><button type="button" class="site-footer-toggle" aria-controls="' + id + '"><span></span>%glyph-svg:chevron-down%</button>';
        label.querySelector('.site-footer-label-wide').textContent = name;
        label.querySelector('.site-footer-toggle > span').textContent = name;
        var toggle = label.querySelector('.site-footer-toggle');
        function show(open) { group.toggleAttribute('data-open', open); toggle.setAttribute('aria-expanded', String(open)); }
        show(!!group.querySelector('[aria-current="page"]'));
        toggle.addEventListener('click', function () { show(!group.hasAttribute('data-open')); });
      });
      footer.setAttribute('data-wired', '');
    });
  }

  /* ---- A bar that arrives, or leaves and returns (DECISIONS 146 D). `<div class="site-slot"><header class="topbar" data-phase-after="#hero">`: one observer on two 1px
     sentinels (the slot's bottom and a bar's height above the bottom of the trigger, or of the slot when there is no trigger), a long downward root margin so a jump past a
     sentinel that starts below the fold still counts, and no scroll handler. It writes data-phase (rest, between, pinned), data-form (row, bar) and data-motion on the bar and
     data-site-phase on the root. Where the page is decides, never the direction. A jump past the line, the opening state and a return to rest straight from pinned switch at
     once; focus inside the bar holds it while the page is between. ---- */
  function ms(token) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return v.slice(-2) === 'ms' ? parseFloat(v) : parseFloat(v) * 1000;
  }
  function sentinel() {
    var d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.setAttribute('data-bh-sentinel', '');
    d.style.cssText = 'position:absolute;inset-inline-start:0;width:1px;height:1px;pointer-events:none;visibility:hidden';
    return d;
  }
  function wirePhases() {
    document.querySelectorAll('.site-slot > .topbar[data-phase-after]').forEach(function (head) {
      if (head.__bhPhase || !window.IntersectionObserver) return;
      head.__bhPhase = true;
      var slot = head.parentElement;
      var after = document.querySelector(head.getAttribute('data-phase-after')) || slot;
      var root = document.documentElement;
      var probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;width:0;height:var(--basalt-sticky-offset)';
      head.appendChild(probe);
      var line = probe.getBoundingClientRect().height;
      probe.remove();
      [slot, after].forEach(function (host) { if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; });
      var rowEnd = sentinel();
      rowEnd.style.top = 'calc(100% - 1px)';
      var triggerLine = sentinel();
      triggerLine.style.bottom = line + 'px';
      slot.appendChild(rowEnd);
      after.appendChild(triggerLine);
      var phase = '', form = 'row', held = false, settled = false, rowGone = false, afterGone = false, jump = false, leaving;
      head.setAttribute('data-form', form);
      function set(f, motion) { form = f; head.setAttribute('data-form', f); head.setAttribute('data-motion', motion); }
      function want() { return phase === 'pinned' || (held && phase === 'between') ? 'bar' : 'row'; }
      function enter(now) {
        clearTimeout(leaving);
        if (now) { set('bar', 'none'); return; }
        if (form === 'bar') { head.setAttribute('data-motion', 'in'); return; }
        set('bar', 'from');
        void head.offsetWidth;
        head.setAttribute('data-motion', 'in');
      }
      function leave(now) {
        if (form !== 'bar') return;
        clearTimeout(leaving);
        if (now) { set('row', 'none'); return; }
        head.setAttribute('data-motion', 'out');
        leaving = setTimeout(function () { if (want() === 'row') set('row', 'none'); }, ms('--basalt-duration-slower') * 0.75 + 34);
      }
      function apply(now) { if (want() === 'bar') enter(now); else leave(now || phase === 'rest'); }
      function update() {
        var next = afterGone ? 'pinned' : rowGone ? 'between' : 'rest';
        if (next === phase) return;
        phase = next;
        head.setAttribute('data-phase', next);
        root.setAttribute('data-site-phase', next);
        apply(!settled || (next === 'pinned' && jump));
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var top = e.rootBounds ? e.rootBounds.top : 0;
          var gone = !e.isIntersecting && e.boundingClientRect.bottom <= top + 1;
          if (e.target === rowEnd) rowGone = gone;
          else { afterGone = gone; jump = gone && top - e.boundingClientRect.bottom > line; }
        });
        update();
        if (!settled) requestAnimationFrame(function () { requestAnimationFrame(function () { settled = true; }); });
      }, { root: document, rootMargin: '0px 0px 1000000px 0px', threshold: [0] });
      io.observe(rowEnd);
      io.observe(triggerLine);
      head.addEventListener('focusin', function () { if (held) return; held = true; if (phase === 'between') apply(false); });
      head.addEventListener('focusout', function (e) {
        if (e.relatedTarget && head.contains(e.relatedTarget)) return;
        held = false;
        apply(false);
      });
    });
  }

  _.step(35, 'wireSkipLink', wireSkipLink);
  _.step(36, 'wireFooters', wireFooters);
  _.step(37, 'wirePhases', wirePhases);
})(window.Basalt);
