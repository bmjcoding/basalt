# theme

The theme choice has three states, System, Light and Dark (System is nothing stored), and a site header has no theme control. On a site it lives in the footer: `.theme-choice`, written in full so the right word is chosen before any script (the head script writes `data-theme-choice`).

```html
<div class="theme-choice"><span class="theme-choice-label" id="theme-l">Theme</span>
  <div class="segment" role="radiogroup" aria-labelledby="theme-l">
    <button type="button" role="radio" data-value="system"><span data-label="System">System</span></button>
    <button type="button" role="radio" data-value="light"><span data-label="Light">Light</span></button>
    <button type="button" role="radio" data-value="dark"><span data-label="Dark">Dark</span></button>
  </div></div>
```

One tab stop; the arrows move and choose. `Basalt.themeChoice()` and `Basalt.setThemeChoice('dark')` read and write it. A site header has no theme control.

A page with no footer (a report's bar, an app header) takes the icon form: a ghost icon button that shows the theme in use (the script draws Sun or Moon), is named "Theme: System" (the choice) and opens a menu of three radio rows; choosing closes it. Write the button and the menu, and leave the button empty (`--usage menu`, `--usage popover`):

```html
<button class="btn" data-variant="ghost" data-icon-only data-theme-menu popovertarget="theme-menu" aria-label="Theme: System"></button>
<div class="panel float menu" popover id="theme-menu" aria-label="Theme"><div role="group" aria-label="Theme">
  <button class="menu-item" role="menuitemradio" aria-checked="true" data-value="system"><span class="menu-item-label">System</span></button>
  <button class="menu-item" role="menuitemradio" aria-checked="false" data-value="light"><span class="menu-item-label">Light</span></button>
  <button class="menu-item" role="menuitemradio" aria-checked="false" data-value="dark"><span class="menu-item-label">Dark</span></button>
</div></div>
```

`data-theme-toggle` (a two-state button with no System) is deprecated: it still works for one release, and `Basalt.toggleTheme()` too. Write the menu instead. Neither is printed.
