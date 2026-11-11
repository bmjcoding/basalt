---
name: basalt-html
description: Generate any standalone HTML page in this project, such as a report, document, mockup, dashboard or small interactive tool, so it looks and behaves like Basalt in both themes and works offline. Use whenever asked to write, draft or mock up an .html file.
---

# Basalt HTML

Standalone HTML that looks and behaves like Basalt: one file, no network, dark and light, keyboard-first. You write the body; a script builds the page.

## Use it

1. Pick the modules from the index below, then print their usage in one call, always with core: `node .agent/skills/basalt-html/compose.mjs --usage core table status callout`. Core is the layout, type, panel and button classes every page uses. Each usage also names the modules it needs and the classes, attributes and tags that bring it in. `--usage` alone prints the index.
2. Write the **body** to a file such as `report.body.html`: the HTML that goes inside `<body>`, with the classes the usage names. The same file may carry `<title>` (else the first `<h1>` is the title) and your own `<style>`; the script adds `Basalt.init()` unless your own `<script>` calls it.
3. Run `node .agent/skills/basalt-html/compose.mjs report.body.html` (writes `report.html`; `--out <page.html>` names it). It wraps the body in the doctype, meta and theme bootstrap, inlines Geist, and adds the core CSS and script plus only the modules your classes, attributes and tags use, and the icons you name in quotes. It prints what it added, and one warning line for each module added. `--no-fonts` skips Geist (only for a file a tool reads, never a file a person opens), `--lang fr` sets the language, `--all` adds every module.
4. Open the page in both themes at 1440 and 390 wide before you hand it over. It follows the system theme; the toggle or `Basalt.toggleTheme()` switches it.

`examples/static.body.html` (a report) and `examples/interactive.body.html` (inputs, tabs, a palette) are bodies to copy from. Never open or paste `parts/`: it is minified output.

## Modules

Markup built only at run time (a `.row` your script writes) won't be seen: add `<!-- basalt:use rows -->` to the body.

- **core** `.page`, `.stack`, `.panel`, `.card`, `.btn`: always in; always print its usage with your modules.
- **topbar** `.topbar`: once per page; never restyle it; no danger button; no second blurred layer.
- **kbd** `data-kbd`, `.kbd`: only a real shortcut the page binds, never on the primary fill; `data-doc` for keys in prose.
- **segment** `.segment`: `button[aria-pressed]`, one true; a click doesn't switch it, your script does.
- **forms** `.field`, `.input`, `<input>`, `<select>`, `<textarea>`: wrap a select in `.select`; errors are `aria-invalid`.
- **number** `.number-field`: wraps `input.input.num`; a bare number input has no steppers.
- **range** `type="range"`: styled bare; no wrapper, no class.
- **rows** `.rows`, `.row`: `.input-row` is a panel's first child; `data-active` is the lit row's fill, never a bar.
- **tabs** `data-tabs`, `role="tablist"`: every tab has `aria-controls`; the page sets the panel's top space (`--basalt-space-4`).
- **disclosure** `data-disclosure`, `<details>`: the controlled element starts `hidden`.
- **table** `.table-wrap`, `<table>`: a labelled region; never name it like its section.
- **code** `.code`: `tabindex="0"` goes on `pre.code-body` (it scrolls), with `<code>` inside; `.tok-k` and kin only in it.
- **callout** `.callout`: the icon, then one `<div>` holding `.callout-title` and `.callout-body`.
- **status** `.status`, `.badge`: a dot beside its word; never one without a word.
- **accent** `data-accent="cobalt"`: the one accent, on `<html>` or a section; `none` turns it off.
- **art** `var(--basalt-art-tone-2)`: tokens only (art tones, chart roles, aspects); greys only, never an accent.
- **stats** `.stats`: never a row of boxed tiles; up to 3 figures.
- **progress** `.progress`: `role="progressbar"`, a label, `--value`, and an empty `<span>` that paints the fill.
- **palette** `data-open-palette`, `Basalt.init({ palette })`: `keys` is an array, `['⌘', 'S']`: ⌘, ⌃ or ⌥ plus one key.
- **spinner** `.spinner`: ring for a wait; `aria-hidden` beside a word.
- **braille** `<braille-spinner>`: inside `.status` beside a word; never in a button.
- **copy** `data-copy`: a button with an icon and a `<span>` label.
- **theme** `data-theme-toggle`: on a ghost, icon-only `.btn`; leave it empty.

Your own CSS goes in a `<style>` in the body (moved to the head, after Basalt's), using `--basalt-*` tokens only. Element selectors (`a`, `button`, `table`, `h1`) go inside `@layer reset { }`, so they can never beat a Basalt class; class rules can sit unlayered. Basalt's classes are in `@layer basalt`, so any unlayered rule of yours wins without `!important`. Never restyle a Basalt class from an element rule.

## Rules

- **Monochrome.** Colour only in named roles: status (a dot or icon beside its word), a product's accent, syntax inside code. Never decorative, never the only carrier of meaning.
- **Type:** Geist and Geist Mono, weights 400, 500 and 600 only. Mono for identifiers, code, numbers in logs.
- **Levels, rim, nesting.** A panel (`.panel`, `.card`, `.callout`, `.code`, `.table-wrap`) is one level above what holds it, capped at 3, with a 1px rim and no shadow. Level is position, not importance: a hero or a featured card on the page is still level 1. Group with space and dividers first; a panel is for a distinct object (code, table, preview, callout); go at most one panel deep inside a panel. Only things that leave the flow (menu, popover, dialog, palette) take `.float` and a shadow.
- **Keys.** No single-character shortcuts on the page (WCAG 2.1.4): a shortcut needs ⌘, ⌃ or ⌥.
- **Selected** is a shape or a step in ink, never a wash alone: the raised pill, a row's filled background, a checked box, a tab's underline. No vertical bar, no inset outline.
- **Both themes, always.** WCAG 2.2 AA: 4.5:1 text, 3:1 boundaries, focus and icons (the tokens pass; do not invent colours).
- **Motion** from the tokens only; entries ease out, nothing bounces or overshoots; under reduced motion, opacity only. A press is a colour step; only `.btn` scales (`--usage core`).
- **390px wide** must work: no sideways scroll, touch targets at least 44px (standalone links too: `--usage core`), inputs 16px (the CSS does this on coarse pointers). Don't hide a column to make a table fit.
- **No** CDN, framework, web font request, glow, gradient, dot grid, outer frame around the page, bounce, press scale beyond `.btn`'s .98, red fill, or decorative colour. Danger is red text with a red hairline.
- Icons: Phosphor via `<i data-icon="Name"></i>`: Bold at 16px, Regular from 20px (`data-size="20"`). Available: Command, Option, Control, MagnifyingGlass, Copy, Check, Sun, Moon, Info, Warning, X, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, CaretDown, CaretRight, Plus, Minus, Trash, Download, ArrowClockwise, CheckCircle, XCircle. A script that names one writes it as a quoted string (`icon: 'Trash'`). Need another icon? Add its name to tools/html-skill/src/icons.json and rebuild. Never draw one, never use an emoji.
