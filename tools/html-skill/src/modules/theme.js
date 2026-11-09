/* Basalt HTML script, theme module: the [data-theme-toggle] button. getTheme, setTheme and toggleTheme are in the core. */
(function (B) {
  'use strict';
  var _ = B._;

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

  _.onTheme.push(function () { document.querySelectorAll('[data-theme-toggle]').forEach(syncThemeButton); });
  _.step(60, 'wireThemeToggles', wireThemeToggles);
})(window.Basalt);
