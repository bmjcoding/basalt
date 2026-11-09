---
name: basalt-html
description: Generate any standalone HTML page in this project, such as a report, document, mockup, dashboard or small interactive tool, so it looks and behaves like Basalt in both themes and works offline. Use whenever asked to write, draft or mock up an .html file.
---

# Basalt HTML

Standalone HTML that looks and behaves like Basalt: one file, no network, dark and light, keyboard-first. You write the body; a script builds the page.

## Use it

1. Write the **body** to a file such as `report.body.html`: the HTML that goes inside `<body>`, with the classes below. The same file may carry `<title>` (else the first `<h1>` is the title), your own `<style>`, `<script type="application/json" data-palette>{ "groups": [...] }</script>` for palette items with no code, or a `<script>` of yours that calls `Basalt.init({ palette })` for items that run code (the script adds `Basalt.init()` unless you do).
2. Run `node .agent/skills/basalt-html/compose.mjs report.body.html` (writes `report.html`; `--out <page.html>` names it). It wraps the body in the doctype, meta and theme bootstrap, inlines Geist, and adds the core CSS and script plus only the modules your classes, attributes and tags use, and the icons you name in quotes. It prints what it added. `--no-fonts` skips Geist (only for a file a tool reads, never a file a person opens), `--lang fr` sets the language, `--all` adds every module.
3. Open the page in both themes at 1440 and 390 wide before you hand it over.

`examples/static.body.html` (a report) and `examples/interactive.body.html` (inputs, tabs, a palette) are bodies to copy from. Never open or paste `parts/`: it is minified output.

Modules: topbar, kbd, segment, forms, rows, tabs, disclosure, table, code, callout, status, stats, progress, palette, spinner, braille, copy, theme. Markup built only at run time (a `.row` your script writes) won't be seen: add `<!-- basalt:use rows -->` to the body.

Your own CSS goes in a `<style>` in the body (moved to the head, after Basalt's), using `--basalt-*` tokens only. Element selectors (`a`, `button`, `table`, `h1`) go inside `@layer reset { }`, so they can never beat a Basalt class; class rules can sit unlayered. Basalt's classes are in `@layer basalt` (the layer `@basalt/react` uses), so any unlayered rule of yours wins without `!important`. Never restyle a Basalt class from an element rule.

## Rules

- **Monochrome.** Colour only in named roles: status (a dot or icon beside its word), syntax inside code. Never decorative, never the only carrier of meaning.
- **Type:** Geist and Geist Mono, weights 400, 500 and 600 only. Mono for identifiers, code, numbers in logs.
- **Levels, rim, nesting.** A panel (`.panel`, `.card`, `.callout`, `.code`, `.table-wrap`) is one level above what holds it, capped at 3, with a 1px rim and no shadow. Level is position, not importance: a hero or a featured card on the page is still level 1. Group with space and dividers first; a panel is for a distinct object (code, table, preview, callout); go at most one panel deep inside a panel. Only things that leave the flow (menu, popover, dialog, palette) take `.float` and a shadow.
- **Kbd** only for a real shortcut the page binds, one per row, and never on the primary fill. In running text about keys, use `data-doc` so it stays on touch. A palette item's `keys` is a real binding: ⌘, ⌃ or ⌥ plus one key (⌘ answers to Meta or Ctrl); anything else warns and draws no chip. No single-character shortcuts on the page (WCAG 2.1.4).
- **Selected** is the 2px bar or the raised pill, and the 2px bar is only for selection. Tabs don't slide their indicator in static files.
- **No row of stat tiles.** `.stats` > `.stat`: up to 3 figures that matter, on the page, never boxed; one headline figure when the page answers one number (put it before the form it answers).
- **A badge** labels one object's status or count, always with a word; never decoration.
- **Busy** is `aria-busy="true"` on the button (label in a `<span>`): the label hides and a ring sits over it, so the width holds. Braille only while work runs on a mono or terminal line, never in a button.
- **Print:** the script prints in the light theme and goes back after; the top bar, skip link, theme toggle and copy buttons are not printed.
- **The top bar is Basalt's one smoked surface** (foundations, "Chrome: the smoked header"): `.topbar` is `surface-chrome` over a 12px blur with a hairline below, opaque `surface-page` without `backdrop-filter`, under reduced transparency, and in forced colours (`Canvas`). Once per page. Only primary and secondary text goes on it (`.faint` becomes secondary there), a pressed ghost `.btn` takes primary ink, no danger button. Don't restyle it, and don't put a second blurred layer on the page.
- **Accessibility details.** A spinner beside a visible word is decoration: put `aria-hidden="true"` on it; keep `role="status"` and `aria-label` for one that stands alone. Don't give a section and an inner `.table-wrap` region the same accessible name (axe `landmark-unique`): name the region for what it is ("Services table"), the section for the topic.
- **Both themes, always.** WCAG 2.2 AA: 4.5:1 text, 3:1 boundaries, focus and icons (the tokens pass; do not invent colours).
- **Motion** from the tokens only; entries ease out, nothing bounces or overshoots; under reduced motion, opacity only. The palette has no animation. A press is a colour step, and `.btn` also scales to .98 (100ms, ease-out) while pressed, never when disabled or busy and never under reduced motion; nothing else scales on press.
- **390px wide** must work: no sideways scroll, touch targets at least 44px (standalone links too), inputs 16px (the CSS does this on coarse pointers). A standalone link (a nav link, a footer link, a link on its own line) gets a 44px hit box on touch with no change to layout; a link inside running text (`p`, `li`, `.prose`, `.small`, `.hint`) stays inline. Add `.tap` to a link the CSS can't tell is standalone. At 390 a table's name column and any status column come first and fit on screen; only numbers may scroll. Don't hide a column to make it fit.
- **No** CDN, framework, web font request, glow, gradient, dot grid, outer frame around the page, bounce, press scale beyond `.btn`'s .98, red fill, or decorative colour. Danger is red text with a red hairline.
- Icons: Phosphor via `<i data-icon="Name"></i>`: Bold at 16px, Regular from 20px (`data-size="20"`). Available: Command, Option, Control, MagnifyingGlass, Copy, Check, Sun, Moon, Info, Warning, X, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, CaretDown, CaretRight, Plus, Minus, Trash, Download, ArrowClockwise, CheckCircle, XCircle. A script that names one writes it as a quoted string (`icon: 'Trash'`). Need another icon? Add its name to tools/html-skill/src/icons.json and rebuild. Never draw one, never use an emoji.

## Cheat sheet

**Layout:** `.page` (`.narrow`), `.stack` and `.cluster` (`style="--gap: var(--basalt-space-3)"`), `.grid` (`--min: 220px`), `.split` (`.aside`: a 20rem sidebar), `.section` > `.section-head`, `.spacer`, `.hide-narrow`, `.divider`, `.divide-y`, `.topbar` > `.topbar-inner` (with `.brand`), `.footer`, `.tap`, `.skip-link`, `.visually-hidden`.
**Type:** `h1`–`h4`, `.display`, `.text-5xl` (56/60; give it room at 390), `.lead`, `.eyebrow`, `.muted`, `.faint`, `.small`, `.mono`, `.num`, `.prose`, inline `code`.
**Panels:** `.panel`, `.card`, `.panel-pad`, `.panel-head`, `.callout[data-status=info|success|warning|danger]` (icon, then `.callout-title` and `.callout-body`), `.float` (+ `.modal`).
**Figures:** `.stats` (`--min` sets the column width) > `.stat` (`.stat-label`, `.stat-value`, `.stat-note`), no panel, no border. A small `dl` of figures goes in `.stats.small.num`.
**Controls:** `.btn[data-variant=primary|ghost|danger]` (default secondary), `data-size=sm|lg`, `data-icon-only`, `aria-busy`; `.segment` (`role="group"`) of `button[aria-pressed]`, one pressed (the page sets it); `.badge` (`data-status=success|warning|danger` draws a dot); `.field` (label, `.input`, `.hint`, `.error`), `.input` on `input`, `textarea`, `select` (wrap a select in `.select`), `aria-invalid="true"`.
**Lists and tables:** `.rows` > `.row` (`data-active`, `data-danger`, `.row-label`, `.row-hint`), `.row-group`, `.input-row` (search band, first child of a panel); `.table-wrap` (`role=region`, `aria-label`, `tabindex=0`) > `table`, `th[data-numeric]`, `td[data-numeric]`, `td[data-mono]`, `tr[aria-selected=true]`.
**Code:** `.code` > `.code-head` + `pre.code-body > code` (`tabindex=0`), tokens `.tok-k .tok-s .tok-n .tok-f .tok-c`.
**Status:** `.status[data-status=success|warning|danger]` (a dot, then the word), `.badge`, `.progress` (`style="--value: 61%"`, `role=progressbar` and a label).
**Kbd:** `<span data-kbd="⌘ K"></span>` (one chip per key), `.kbd`, `.kbd-group`, `[data-kbd-hint]` for words that only make sense with chips.
**Spinners:** `<span class="spinner" role="status" aria-label="Loading"></span>` (ring, the default), `<braille-spinner label="Loading"></braille-spinner>` (mono and terminal lines).

**Behaviour (opt in by attribute):**
- `[data-theme-toggle]` on `<button class="btn" data-variant="ghost" data-icon-only>`.
- Tabs: `<div data-tabs><div class="tabs" role="tablist" aria-label="…"><button class="tab" role="tab" id aria-controls aria-selected>…</button></div><div class="tabpanel" id role="tabpanel" aria-labelledby>…</div></div>`.
- Disclosure: `<button class="disclosure" data-disclosure aria-expanded="false" aria-controls="id">…</button>` and the element with that `id` and `hidden`.
- Copy: `<button class="btn" data-copy="#code-id">` or `data-copy-text="…"`; keep an icon and a `<span>` label inside.
- Palette: `<button class="btn" data-open-palette>` and `Basalt.init({ palette: { groups: [{ label, items: [{ label, icon, keys, hint, keywords, danger, href, onSelect }] }] } })` (or a function returning that), or the `data-palette` JSON. Cmd or Ctrl+K opens it; each item's `keys` runs it from anywhere (the row carries `aria-keyshortcuts` and an `aria-describedby` that says it in words; an ⌥-only combination is ignored while typing in a field).
- `Basalt.announce(text)` speaks to screen readers; `Basalt.toggleTheme()`, `Basalt.openPalette(options)`, `Basalt.copyText(text)`.
