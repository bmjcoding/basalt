/* Basalt HTML script, theme module: the theme choice (React's ThemeChoiceControl, DECISIONS 146 B): System, Light and Dark as a radio group (.theme-choice, the footer's), and its
   app form (React's ThemeMenu): [data-theme-menu], a ghost icon button showing the theme in use and named "Theme: System", that opens the page's .menu of three radio rows
   (choosing closes it). System is nothing stored. One tab stop in the group; the arrows move and choose, Home and End go to the ends. Basalt.themeChoice() and
   Basalt.setThemeChoice() read and write it from script. The two-state [data-theme-toggle] button is deprecated and kept for one release. getTheme, setTheme and
   toggleTheme are in the core. */
(function (B) {
  'use strict';
  var _ = B._;
  var KEY = 'basalt-theme';
  var ORDER = ['system', 'light', 'dark'];
  var WORD = { system: 'System', light: 'Light', dark: 'Dark' };

  function syncThemeButton(button) {
    var dark = _.getTheme() === 'dark';
    // The button shows what a press will switch to, and its name says so too.
    button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    button.innerHTML = _.icon(dark ? 'Sun' : 'Moon');
  }

  function wireThemeToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      if (button.__bh) return;
      button.__bh = true;
      button.type = 'button';
      button.addEventListener('click', B.toggleTheme);
      syncThemeButton(button);
    });
  }

  /** What was chosen: light, dark, or system (nothing stored). */
  function choice() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) { /* storage blocked: the choice lasts for the page */ }
    return v === 'light' || v === 'dark' ? v : (B.__choice || 'system');
  }
  /** Writes the theme in use and the choice on the root, and lets every control know. */
  function apply() {
    var c = choice();
    var t = c === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : c;
    _.writeTheme(t);
    document.documentElement.setAttribute('data-theme-choice', c);
    ours();
    syncChoices();
  }
  /* Who wrote data-theme. The script's own writes are consumed here, so anything the observer still holds, or reports later, is the page's: a theme the page set by hand stays its
     own, and System does not overwrite it when the system's scheme changes, until the reader picks a choice (apply) or the page takes its attribute off. A .dark or .light root is
     the page's too. */
  var watch = null;
  var hand = false;
  function ours() { if (watch) watch.takeRecords(); hand = false; }
  function followSystem() {
    var root = document.documentElement;
    if (watch && watch.takeRecords().length) hand = root.hasAttribute('data-theme');
    if (choice() === 'system' && !hand && !root.classList.contains('dark') && !root.classList.contains('light')) apply();
  }
  function setChoice(c) {
    if (ORDER.indexOf(c) < 0) return;
    B.__choice = c;
    try { if (c === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, c); } catch (e) { /* storage blocked */ }
    apply();
    _.onTheme.forEach(function (f) { if (f !== syncChoices) f(); });
  }
  function syncChoices() {
    var c = choice();
    document.querySelectorAll('.theme-choice [role="radio"]').forEach(function (r) {
      var on = r.getAttribute('data-value') === c;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    });
    if (document.documentElement.getAttribute('data-theme-choice') !== c) document.documentElement.setAttribute('data-theme-choice', c);
    // The app form: the glyph shows the theme in use, the name the choice, the menu's rows the chosen one.
    var dark = _.getTheme() === 'dark';
    document.querySelectorAll('[data-theme-menu]').forEach(function (b) {
      b.setAttribute('aria-label', 'Theme: ' + WORD[c]);
      if (b.__bhIcon !== dark) { b.__bhIcon = dark; b.innerHTML = _.icon(dark ? 'Moon' : 'Sun'); }
      var menu = document.getElementById(b.getAttribute('popovertarget'));
      if (menu) menu.querySelectorAll('[data-value]').forEach(function (r) { r.setAttribute('aria-checked', String(r.getAttribute('data-value') === c)); });
    });
  }

  function wireThemeMenus() {
    document.querySelectorAll('[data-theme-menu]').forEach(function (b) {
      var menu = document.getElementById(b.getAttribute('popovertarget'));
      if (!menu || menu.__bhChoice) return;
      menu.__bhChoice = true;
      menu.addEventListener('click', function (e) {
        var r = e.target.closest('[data-value]');
        if (!r) return;
        setChoice(r.getAttribute('data-value'));
        menu.hidePopover();
      });
    });
    syncChoices();
  }

  function wireThemeChoices() {
    document.querySelectorAll('.theme-choice [role="radiogroup"]').forEach(function (group) {
      if (group.__bhChoice) return;
      group.__bhChoice = true;
      group.addEventListener('click', function (e) { var r = e.target.closest('[role="radio"]'); if (r) setChoice(r.getAttribute('data-value')); });
      group.addEventListener('keydown', function (e) {
        var at = ORDER.indexOf(choice());
        var rtl = getComputedStyle(group).direction === 'rtl';
        var step = { ArrowRight: rtl ? -1 : 1, ArrowDown: 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: -1 }[e.key];
        var next = step ? (at + step + 3) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : -1;
        if (next < 0) return;
        e.preventDefault();
        setChoice(ORDER[next]);
        group.querySelector('[data-value="' + ORDER[next] + '"]').focus();
      });
    });
    if (!document.documentElement.__bhChoice) {
      document.documentElement.__bhChoice = true;
      // The attribute at load is the head script's unless it is not what the system says while nothing is stored: then the page set it.
      var now = document.documentElement.getAttribute('data-theme');
      hand = choice() === 'system' && now !== null && now !== (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      // The page's own data-theme write moves the browser chrome too, as React's does.
      watch = new MutationObserver(function () { hand = document.documentElement.hasAttribute('data-theme'); _.syncThemeColor(); });
      watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      // A theme the core writes (the toggle, print) is the script's too.
      _.onTheme.push(ours);
      addEventListener('storage', function (e) { if (e.key === null || e.key === KEY) apply(); });
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', followSystem);
    }
    syncChoices();
  }

  B.themeChoice = choice;
  B.setThemeChoice = setChoice;
  _.onTheme.push(function () { document.querySelectorAll('[data-theme-toggle]').forEach(syncThemeButton); });
  _.onTheme.push(syncChoices);
  _.step(60, 'wireThemeToggles', wireThemeToggles);
  _.step(61, 'wireThemeChoices', wireThemeChoices);
  _.step(62, 'wireThemeMenus', wireThemeMenus);
})(window.Basalt);
