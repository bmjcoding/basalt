---
name: basalt-html
description: Generate any standalone HTML page in this project, such as a report, document, mockup, dashboard or small interactive tool, so it looks and behaves like Basalt in both themes and works offline. Use whenever asked to write, draft or mock up an .html file.
---

# Basalt HTML

Standalone HTML that looks and behaves like Basalt: one file, no network, dark and light, keyboard-first. You write the body; a script builds the page.

## Use it

1. Pick the modules from the index below, then print their usage in one call, always with core: `node .agent/skills/basalt-html/compose.mjs --usage core table status callout`. Core is the layout, type, panel and button classes every page uses. Each usage also names the modules it needs and the classes, attributes and tags that bring it in. `--usage` alone prints the index.
2. Write the **body** to a file such as `report.body.html`: the HTML that goes inside `<body>`, with the classes the usage names. The same file may carry `<title>` (else the first `<h1>` is the title), your own `<style>`, and head tags: `<meta name="description">`, `og:`/`twitter:` meta, `<link rel="icon" href="data:…">` or `canonical` (any other meta or link is refused); the script adds `Basalt.init()` unless your own `<script>` calls it.
3. Run `node .agent/skills/basalt-html/compose.mjs report.body.html` (writes `report.html`; `--out <page.html>` names it). It wraps the body in the doctype, meta and theme bootstrap, inlines Geist, and adds the core CSS and script plus only the modules your classes, attributes and tags use, and the icons you name in quotes. It prints what it added, and one warning line for each module added. `--no-fonts` skips Geist (only for a file a tool reads, never a file a person opens), `--lang fr` sets the language, `--all` adds every module.
4. Open the page in both themes at 1440 and 390 wide before you hand it over. It follows the system theme; the toggle or `Basalt.toggleTheme()` switches it.

`examples/static.body.html`, `sales.body.html` (reports) and `interactive.body.html` (inputs, tabs, a palette) are bodies to copy. Never open or paste `parts/`: it is minified output.

## Modules

Markup built only at run time (a `.row` your script writes) won't be seen: add `<!-- basalt:use rows -->` to the body.

- **core** `.page`, `.stack`, `.panel`, `.card`, `.btn`: always in; print its usage with your modules.
- **glyph** `data-glyph`: Basalt's own glyph by name, never drawn by hand; filled inside `aria-current`.
- **topbar** `.topbar`, `.site-footer`: once per page; never restyle it; no danger button; no second blurred layer.
- **kbd** `data-kbd`, `.kbd`: only a real shortcut the page binds, never on the primary fill; `data-doc` for keys in prose.
- **segment** `.segment`: `button[aria-pressed]`, one true; a click doesn't switch it, your script does.
- **forms** `.field`, `.input`, `<input>`, `<select>`, `<textarea>`: wrap a select in `.select`; errors are `aria-invalid`.
- **number** `.number-field`: wraps `input.input.num`; a bare number input has no steppers.
- **range** `type="range"`: styled bare; no wrapper, no class.
- **select** `<select>`: wrap in `.select`, class `input`; a second line is `.option-description`.
- **choice** `type="checkbox"`, `role="switch"`: bare inputs in a `label.choice`; radios in `.radio-group`.
- **choice-card** `.choice-card`: a `label.panel` around a hidden radio or checkbox; words only, no link or control inside.
- **toggle** `aria-pressed`: secondary or ghost `.btn` only; your script flips it; the `.btn-check` seat comes first.
- **rows** `.rows`, `.row`: `.input-row` is a panel's first child; `data-active` is the lit row's fill, never a bar.
- **glide** `.plate`: the palette's, a menu's and the centre's shared plate; never write one.
- **links** `.links`, `target="_blank"`: a glyph then the name, none for a service without a mark; never write the arrow.
- **link-rows** `.dir`: a named `ul`; no wash.
- **tabs** `data-tabs`, `role="tablist"`: every tab has `aria-controls`; the page sets the panel's top space (`--basalt-space-4`).
- **link-tabs** `.link-tabs`: a `nav` of links, `aria-current="page"` on one; not a tablist.
- **disclosure** `data-disclosure`, `<details>`: the controlled element starts `hidden`.
- **table** `.table-wrap`, `<table>`: a labelled region; never name it like its section.
- **selection** `data-select-all`: the header box of a `td.select-col` column; label each box "Select NAME".
- **still-table** `data-fixed`, `data-sortable`: a `<col>` for each column, one with no width; never size a column from content.
- **explainer** `.explainer`: inside a sortable `th`, after its words; only for a column a reader could misread.
- **filter** `.filter`: write only labelled checkboxes, the script builds the control; one `.filter-result` for each list.
- **option-chips** `.option-chips`: native radios, eight at most; an unavailable one is `aria-disabled`, not `disabled`.
- **code** `.code`: `tabindex="0"` goes on `pre.code-body` (it scrolls), with `<code>` inside; `.tok-k` and kin only in it.
- **callout** `.callout`: the icon, then one `<div>` holding `.callout-title` and `.callout-body`.
- **status** `.status`, `.badge`: `data-status` draws the mark, none is the word alone; never one without a word.
- **accent** `data-accent="cobalt"`: the one accent, on `<html>` or a section; `none` turns it off.
- **art** `var(--basalt-art-tone-2)`: tokens only (art tones, chart roles, aspects); greys only, never an accent.
- **stage** `.stage`: first content after the bar, outside `.page`; art in `.stage-art`, never filtered; the bar stays smoked.
- **framed-art** `.framed`: a `figure` for a one-version picture; `data-aspect` sets the box; always write `alt`.
- **type-layout** `.text-hero`, `.page-sections`, `.columns`: a site page's roles; no `.text-7xl` on a phone, no `<br>`.
- **stats** `.stats`: never a row of boxed tiles; up to 3 figures.
- **progress** `.progress`: `role="progressbar"`, a label, `--value`, and an empty `<span>` that paints the fill.
- **meter** `.meter`: not `.progress`; `--value` and `--target` are percentages; write `aria-valuetext`.
- **dlist** `.dlist`: a `dl` of `div` rows, never in a panel; no value writes `Not observed`.
- **captioned** `.captioned`: a `dl` of `div`s (`dt` head, `dd` sentence); `data-size` always; the page counts `data-columns`.
- **app-tile** `.app-tile`: `aria-hidden`, the company's name beside it in words; never ship a company's icon file.
- **period** `.period`: two ghost icon buttons round `.period-label`; at an end `aria-disabled`, never `disabled`.
- **terminal** `.terminal`: with `.code`; lines are `span[data-kind]`; the script draws the gutter.
- **chart** `.chart`: JSON in `script[data-chart]`; `null` is a day not observed, never zero; needs a `summary`.
- **diagram** `.diagram`: JSON in `script[data-diagram]`; sides only to change the default; needs a `summary`.
- **diagram-motion** `"motion": "animated"`: added for you, with `loops`; a flow line needs a label; one mover a figure.
- **sparkline** `.sparkline`: JSON in `script[data-sparkline]`; one line, no axes or series (that is a `chart`).
- **palette** `data-open-palette`, `Basalt.init({ palette })`: `keys` is an array, `['⌘', 'S']`: ⌘, ⌃ or ⌥ plus one key.
- **command-list** `.command-list`: the script builds it; items are the palette's; ⌘K goes to the palette when the page has one.
- **spinner** `.spinner`: ring for a wait; `aria-hidden` beside a word; a long wait needs `loops`.
- **braille** `<braille-spinner>`: inside `.status` beside a word; never in a button.
- **loops** `data-loops-toggle`: a page that spins past five seconds needs it; the control's name stays fixed.
- **ambient** `data-ambient`: one loop a page, in art only, opacity only; the page then needs the `loops` toggle.
- **copy** `data-copy`: a button with an icon and a `<span>` label.
- **theme** `.theme-choice`, `data-theme-menu`: the footer's three words, or an icon and a menu.
- **popover** `popovertarget`: the popup goes right after its opener, titled; never for a decision.
- **menu** `.menu`: rows are `button.menu-item` with a role; a radio sits in a `role="group"`.
- **combobox** `.combobox`: an `input.input` and a `ul` of `li`; the script builds the popup, caret and value.
- **dialog** `data-dialog-open`: a `<dialog>` with a `.dialog-title`; an alert dialog marks its safe button `data-cancel`.
- **sheet** `.sheet`: a dialog with `data-side`; the top one opens with a `.sheet-band`.
- **dialog-form** `data-form`: a dialog with the sheet's parts, in the center.
- **search** `.search`: link rows in a fixed-height `.search-results`; Enter in the field sends the query, never a row.
- **tooltip** `data-tooltip`: only supplements a name the control already has; plain text.
- **toast** `Basalt.toast`: no `home` means it stays until dismissed; never build your own.
- **notifications** `Basalt.notifications`: the page owns the entries; call `setEntries` after a change.
- **nav** `.nav`: `a.nav-item` > `.nav-pill`; `aria-current` marks the page; never write a bar or a wash.
- **topbar-nav** `.topbar-links`: five links at most, one `.topbar-action`; the script builds the narrow menu, never write it.
- **app-shell** `.app-shell`: the document scrolls; one smoked bar; every sidebar item has a glyph.
- **pane** `.pane-layout`: page first, pane after.
- **tab-bar** `.tab-bar`: three to five links, glyph over label; with more, four and a More sheet.

Your own CSS goes in a `<style>` in the body (moved to the head, after Basalt's), using `--basalt-*` tokens only. Element selectors (`a`, `button`, `table`, `h1`) go inside `@layer reset { }`, so they can never beat a Basalt class; class rules can sit unlayered. Basalt's classes are in `@layer basalt`, so any unlayered rule of yours wins without `!important`. Never restyle a Basalt class from an element rule.

## Rules

- **Monochrome.** Colour only in named roles: status (a dot or icon beside its word), a product's accent, syntax inside code. Never decorative, never the only carrier of meaning.
- **Type:** Geist and Geist Mono, weights 400, 500 and 600 only. Mono for identifiers, code, numbers in logs.
- **Levels, rim, nesting.** A panel (`.panel`, `.card`, `.callout`, `.code`, `.table-wrap`) is one level above what holds it, capped at 3, with a 1px rim and no shadow. Level is position, not importance: a hero is still level 1. Group with space and dividers first; a panel is for a distinct object; at most one panel deep. Only things that leave the flow (menu, popover, dialog) take `.float` and a shadow.
- **Keys.** No single-character shortcuts on the page (WCAG 2.1.4): a shortcut needs ⌘, ⌃ or ⌥.
- **Selected** is a shape or weight, never a wash alone: a segment or tab label at 600 (400 at rest) on its pill or underline, a row's filled background, a checked box. No vertical bar; an outline never marks a state.
- **Both themes, always.** WCAG 2.2 AA: 4.5:1 text, 3:1 boundaries, focus and icons (the tokens pass; do not invent colours).
- **Motion** from the tokens only; entries ease out, nothing bounces or overshoots; under reduced motion, opacity only. A press is a colour step; only `.btn` scales (`--usage core`).
- **390px wide** must work: no sideways scroll, touch targets at least 44px (standalone links too: `--usage core`), inputs 16px (the CSS does this on coarse pointers). Don't hide a column to make a table fit.
- **No** CDN, framework, web font request, glow, gradient, dot grid, outer frame around the page, bounce, press scale beyond `.btn`'s .98, red fill, or decorative colour. Danger is red text with a red hairline.
- **Brand SVG file** (from `brand/`): paste it with `data-brand` on its `<svg>`; compose hides it and drops its title. The link round it needs `aria-label`.
- **A dot between words** is `.dot-sep`, never an `aria-hidden` dot with a hidden comma; a value and its unit need a space between them (`--usage core`).
- Icons: Phosphor Bold via `<i data-icon="Name"></i>`, 16px (`data-size="20"` beside 18 to 24px text). Available: Command, Option, Control, Sun, Moon, Info, Warning, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, CaretUpDown, Trash, Download, ArrowClockwise, CheckCircle, XCircle, GithubLogo, XLogo, LinkedinLogo, InstagramLogo, YoutubeLogo, EnvelopeSimple, TerminalWindow. Check, close, chevrons, copy, plus, minus, search: core glyphs (`data-glyph`), not icons. A script that names one writes it as a quoted string (`icon: 'Trash'`). Need another icon? Add its name to tools/html-skill/src/icons.json and rebuild. Never draw one, never use an emoji.
