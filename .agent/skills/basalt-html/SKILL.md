---
name: basalt-html
description: Generate any standalone HTML page in this project, such as a report, document, mockup, dashboard or small interactive tool, so it looks and behaves like Basalt in both themes and works offline. Use whenever asked to write, draft or mock up an .html file.
---

# Basalt HTML

Standalone HTML that looks and behaves like Basalt: one file, no network, dark and light, keyboard-first.

## Use it

1. Copy `template-static.html` (a report or document) or `template-interactive.html` (a tool with inputs, tabs, a command palette) next to your output. They already inline `basalt-html.css` and `basalt-html.js`; to start from scratch, paste the two files into `<style>` and `<script>` yourself.
2. For any file a person will open, run `node .agent/skills/basalt-html/inline-fonts.mjs <file>` after writing it. Never paste font data. Skip it only for files that tools read. (The templates carry a `<!-- basalt:fonts -->` marker in the head for it to replace; keep the marker in a file you write from scratch.)
3. Keep the head snippet (`<script>` before `<style>`: it sets `data-theme` from the saved choice or the system) and the `Basalt.init(...)` call at the end of `<body>`.
4. Replace the content. Use the classes below. Write your own CSS after the inlined one, using `--basalt-*` tokens only: element selectors (`a`, `button`, `table`, `h1`) go inside `@layer reset { }` (the templates have an empty one for you), so they can never beat a Basalt class; class rules can sit in an unlayered `<style>`. The skill's own classes are in `@layer basalt` (the layer name `@basalt/react` uses), so any unlayered rule of yours wins over them without `!important`. Never restyle a Basalt class from an element rule.
5. Open it in both themes at 1440 and 390 wide before you hand it over.

Rebuild after any change to `tools/html-skill/src/`: `npm run build`. Never edit the files in this folder by hand; a test fails if they drift. `geist.css` (Geist and Geist Mono as data URIs, about 190 KB, SIL OFL 1.1) is what `inline-fonts.mjs` inlines; it is never part of the inline budget.

## Rules

- **Monochrome.** Colour only in named roles: status (a dot or icon beside its word), syntax inside code. Never decorative, never the only carrier of meaning.
- **Type:** Geist and Geist Mono, weights 400, 500 and 600 only. Mono for identifiers, code, numbers in logs.
- **Levels, rim, nesting.** A panel (`.panel`, `.card`, `.callout`, `.code`, `.table-wrap`) is one level above what holds it, capped at 3, with a 1px rim and no shadow. Level is position, not importance: a hero or a featured card on the page is still level 1. Group with space and dividers first; a panel is for a distinct object (code, table, preview, callout); go at most one panel deep inside a panel. Only things that leave the flow (menu, popover, dialog, palette) take `.float` and a shadow.
- **Kbd** only for a real shortcut the page binds, one per row, and never on the primary fill. In running text about keys, use `data-doc` so it stays on touch. A palette item's `keys` is a real binding: it needs ⌘, ⌃ or ⌥ plus one key (⌘ answers to Meta or Ctrl), anything else warns and draws no chip. No single-character shortcuts on the page (WCAG 2.1.4).
- **Selected** is the 2px bar or the raised pill, and the 2px bar is only for selection. Tabs don't slide their indicator in static files.
- **No row of stat tiles.** `.stats` > `.stat`: up to 3 figures that matter, on the page, never boxed; one headline figure when the page answers one number (put it before the form it answers).
- **A badge** labels one object's status or count, always with a word; never decoration.
- **Busy** is `aria-busy="true"` on the button (label in a `<span>`): the label hides and a ring sits over it, so the width holds. Braille only while work runs on a mono or terminal line, never in a button.
- **Print:** the script prints in the light theme and goes back after; the top bar, skip link, theme toggle and copy buttons are not printed.
- **The top bar is Basalt's one smoked surface** (foundations, "Chrome: the smoked header"): `.topbar` is `surface-chrome` over a 12px blur with a hairline below, and it is opaque `surface-page` without `backdrop-filter`, under reduced transparency, and in forced colours (`Canvas`). Use it once per page. Only primary and secondary text goes on it (`.faint` becomes secondary there), a pressed ghost `.btn` takes primary ink, and there is no danger button on it. Don't restyle it, and don't put a second blurred layer on the page.
- **Accessibility details.** A spinner beside a visible word is decoration: put `aria-hidden="true"` on it, and keep `role="status"` and `aria-label` for one that stands alone. Don't give a section and an inner `.table-wrap` region the same accessible name (axe `landmark-unique`): name the region for what it is ("Services table"), the section for the topic.
- **Both themes, always.** Test dark and light. WCAG 2.2 AA: 4.5:1 text, 3:1 boundaries, focus and icons (the tokens already pass; do not invent colours).
- **Motion** from the tokens only; entries ease out, nothing bounces or overshoots; under reduced motion, opacity only. The palette has no animation. A press is a colour step, and `.btn` also scales to .98 (100ms, ease-out) while pressed, never when disabled or busy and never under reduced motion; nothing else scales on press (no row, tab, card or disclosure).
- **390px wide** must work: no sideways scroll, touch targets at least 44px (standalone links too), inputs 16px (the CSS does this on coarse pointers). A standalone link (a nav link, a footer link, a link on its own line) gets a 44px hit box on touch with no change to the layout; a link inside running text (`p`, `li`, `.prose`, `.small`, `.hint`) stays inline and is exempt. Add `.tap` to a link the CSS can't tell is standalone. At 390 a table's name column and any status column come first and fit on screen; only numbers may scroll. Don't hide a column to make it fit.
- **No** CDN, framework, web font request, glow, gradient, dot grid, outer frame around the page, bounce, any press scale beyond `.btn`'s .98, red fill, or decorative colour. Danger is red text with a red hairline.
- Icons: Phosphor via `<i data-icon="Name"></i>`: Bold at 16px, Regular from 20px (`data-size="20"`). Available: Command, Option, Control, MagnifyingGlass, Copy, Check, Sun, Moon, Info, Warning, X, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, CaretDown, CaretRight, Plus, Minus, Trash, Download, ArrowClockwise, CheckCircle, XCircle. Need another icon? Add its name to tools/html-skill/src/icons.json and rebuild. Never draw one, never use an emoji. An unknown name logs one warning and draws nothing.

## Cheat sheet

**Layout:** `.page` (`.narrow`), `.stack` and `.cluster` (`style="--gap: var(--basalt-space-3)"`), `.grid` (`--min: 220px`), `.split` (`.aside` for a 20rem sidebar), `.section` > `.section-head`, `.spacer`, `.hide-narrow`, `.divider`, `.divide-y`, `.topbar` > `.topbar-inner` (with `.brand`), `.footer` (inside `.page`, or after it on the same column, where it drops its top margin), `.tap` (a standalone link that must be 44px on touch), `.skip-link`, `.visually-hidden`.
**Type:** `h1`–`h4`, `.display` (page hero), `.text-5xl` (the 56/60 Display step; give it room at 390, it does not shrink), `.lead`, `.eyebrow`, `.muted`, `.faint`, `.small`, `.mono`, `.num`, `.prose` (reading width and list rhythm), inline `code`.
**Panels:** `.panel`, `.card`, `.panel-pad`, `.panel-head` (wraps when it runs out of room), `.callout[data-status=info|success|warning|danger]` (icon, then `.callout-title` and `.callout-body`), `.float` (+ `.modal`).
**Figures:** `.stats` (a grid; `--min` sets the column width) > `.stat` (`.stat-label`, `.stat-value`, `.stat-note`), no panel, no border. A small `dl` of two or three more figures goes in `.stats.small.num`; it keeps its columns inside a flex row.
**Controls:** `.btn[data-variant=primary|ghost|danger]` (default is secondary), `data-size=sm|lg`, `data-icon-only`, `aria-busy`; `.segment` (`role="group"`) of `button[aria-pressed]`, one pressed at a time (the page sets it); `.badge` (`data-status=success|warning|danger` draws a dot); `.field` (label, `.input`, `.hint`, `.error`), `.input` on `input`, `textarea`, `select` (wrap a select in `.select`), `aria-invalid="true"`.
**Lists and tables:** `.rows` > `.row` (`data-active`, `data-danger`, `.row-label`, `.row-hint`), `.row-group`, `.input-row` (raised search band, first child of a panel); `.table-wrap` (give it `role=region`, `aria-label`, `tabindex=0`) > `table`, `th[data-numeric]`, `td[data-numeric]`, `td[data-mono]`, `tr[aria-selected=true]`.
**Code:** `.code` > `.code-head` + `pre.code-body > code` (with `tabindex=0`), tokens `.tok-k .tok-s .tok-n .tok-f .tok-c`.
**Status:** `.status[data-status=success|warning|danger]` (a dot, then the word), `.badge`, `.progress` (`style="--value: 61%"` on it, with `role=progressbar` and a label).
**Kbd:** `<span data-kbd="⌘ K"></span>` (becomes one chip per key), `.kbd`, `.kbd-group`, `[data-kbd-hint]` for words that only make sense with chips.
**Spinners:** `<span class="spinner" role="status" aria-label="Loading"></span>` (ring, the default), `<braille-spinner label="Loading"></braille-spinner>` (mono and terminal lines).

**Behaviour (JS, opt in by attribute):**
- `[data-theme-toggle]` on a `<button class="btn" data-variant="ghost" data-icon-only>`.
- Tabs: `<div data-tabs><div class="tabs" role="tablist" aria-label="…"><button class="tab" role="tab" id aria-controls aria-selected>…</button></div><div class="tabpanel" id role="tabpanel" aria-labelledby>…</div></div>`.
- Disclosure: `<button class="disclosure" data-disclosure aria-expanded="false" aria-controls="id">…</button>` and the element with that `id` and `hidden`.
- Copy: `<button class="btn" data-copy="#code-id">` or `data-copy-text="…"`; keep an icon and a `<span>` label inside.
- Palette: `<button class="btn" data-open-palette>` and `Basalt.init({ palette: { groups: [{ label, items: [{ label, icon, keys, hint, keywords, danger, href, onSelect }] }] } })`, or a function returning that. Cmd or Ctrl+K opens it, and each item's `keys` run it from anywhere on the page (a row with `keys` carries `aria-keyshortcuts` and an `aria-describedby` that says it in words, "Command K") (an ⌥-only combination is ignored while typing in a field).
- `Basalt.announce(text)` speaks to screen readers; `Basalt.toggleTheme()`, `Basalt.openPalette(options)`, `Basalt.copyText(text)`.
