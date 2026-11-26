# @srasyndicate/basalt

Basalt's React components: [Base UI](https://base-ui.com) primitives for behaviour and
accessibility, styled with Basalt tokens, with its own core icon set and [Phosphor](https://phosphoricons.com) for the long tail.

## Use

```tsx
import "@srasyndicate/basalt/fonts.css"; // Geist Sans and Mono (SIL OFL 1.1)
import "@srasyndicate/basalt/styles.css"; // tokens + components
import "@srasyndicate/basalt/base.css"; // optional: the page base (body: no margin, surface-page, primary ink, text-base), never in styles.css

import { Button, Menu, MenuContent, MenuItem, MenuTrigger } from "@srasyndicate/basalt";
import { CopyIcon, PlayIcon } from "@phosphor-icons/react";

<Button variant="primary" icon={PlayIcon}>Deploy</Button>

<Menu>
  <MenuTrigger render={<Button>Actions</Button>} />
  <MenuContent>
    <MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem>
  </MenuContent>
</Menu>
```

Styles sit in `@layer basalt`, so an app's own unlayered CSS overrides them without `!important`.
An app whose own CSS is layered (Tailwind v4's `theme`, `base`, `components` and `utilities`, for one)
names Basalt's layer first, before any sheet is imported, so the app's layers come after it and win:

```css
@layer basalt, theme, base, components, utilities;
```

Without that line the order is the order the sheets arrive in, and Basalt imported after Tailwind
would beat its utilities on Basalt's components.
Every component takes `className`; Base UI parts also accept a function of their state.
Every module that draws a component or holds state declares `"use client"` for React Server
Component consumers, and the package entry itself does not: what is neither a component nor a hook
(`formatStamp` and the other formatters, `CONFIRM_MS` and the other constants, `themeBootstrap`,
`loopsBootstrap`, `preloadCodeLanguages`, `safeHref`, `shareOf`, `trailingMean`, `ambient`, the entrance and travel
helpers) is plain code that a Server Component can call and read. Import the styles and font sheet
once in your application's root layout.

**Data and links.** Pass labels and code as children: Basalt draws children and string props as text, and no component takes HTML. Two props take
markup and are for files in your own repository, never for data: `BrandSvg`'s `source` and a diagram mark's file (a relative path, `https` or a
`data:image/` URI; anything else is not drawn). A destination from data goes through `safeHref(href)`, which returns it when it is relative, `http`,
`https`, `mailto` or `tel`, and `null` otherwise; leave a refused link out. React refuses `javascript:` in an `href` but not in a navigation you make
yourself, so check before `router.push` or `location.assign`, in `onNavigate` and `onSelect` too (`LinkTabs` checks before it calls `onNavigate`). The
check is about the scheme only: a route that must stay on your site also needs its origin checked. Basalt's link components add
`rel="noopener noreferrer"` to a link that opens a new tab; your own `<a target="_blank">` needs it written.

Set `data-density="compact"` on `<html>` to move controls down one size (24px minimum).
Portalled menus inherit it too; a nested `data-density="default"` restores regular sizing.
Touch keeps at least 44px targets in either mode, and text entry stays 16px to avoid iOS
focus zoom. Choice labels provide their larger target; if a checkbox, radio or switch has
no `children`, its consumer must provide the surrounding touch target and accessible name.

**Trim the icons you do not draw.** Every [Phosphor](https://phosphoricons.com) icon ships six weights (thin, light, regular, bold, fill and
duotone) in one module, and Basalt draws two: Bold, and Fill on a selected glyph. `@srasyndicate/basalt/phosphor` is an opt-in build plugin that
cuts the other weights from every Phosphor icon in your app's graph, Basalt's and your own, for esbuild (`phosphorWeightsEsbuild`) and Vite or
Rollup (`phosphorWeightsRollup`; give Vite's dependency optimiser the esbuild one as well, in `optimizeDeps.esbuildOptions.plugins`):

```ts
import { BASALT_PHOSPHOR_WEIGHTS, phosphorWeightsEsbuild } from "@srasyndicate/basalt/phosphor";
await esbuild.build({ plugins: [phosphorWeightsEsbuild({ weights: BASALT_PHOSPHOR_WEIGHTS })] /* … */ });
```

`weights` is required; if your app draws a weight of its own, add it (`[...BASALT_PHOSPHOR_WEIGHTS, "regular"]`), because **a weight that is trimmed
and then drawn draws nothing**. Measured with esbuild's minifier on this package: about 9 KB (1.9 KB gzipped) less for an app that imports ten of the
common components, and about 28 KB (7.5 KB gzipped) less for one that imports everything. Without the plugin the icons ship whole, as before; nothing
else changes.

**Split bundles with esbuild: the imports plugin (experimental).** An app that splits its bundle (`splitting: true`) and imports from the package's root pays
up front for every Basalt module a later route draws: esbuild places a module by which entry points reach it before tree shaking, and each `export … from` in the
root is a path. `@srasyndicate/basalt/imports` gives each of your files a small barrel of the names it imports, each from the module that holds it, so your imports
stay as they are:

```ts
import { basaltImportsEsbuild } from "@srasyndicate/basalt/imports";
await esbuild.build({ splitting: true, plugins: [basaltImportsEsbuild()] /* … */ });
```

Measured with esbuild 0.28 on a first screen that draws `AppShell`, `Nav` and a `Table`, with a route loaded later that draws `Combobox`, `Select`, `Menu`,
`Dialog` and a `Field`: 341 KB minified up front without it (Base UI's combobox, select and menu among it), 160 KB with it, none of them. It changes which chunk
code lands in, never what runs; a bundle without splitting gains nothing from it. It is **experimental**: esbuild only (Rollup and Vite have not been measured),
and it keeps to two rules:

- **It falls back to the whole root when it cannot read a file.** A file is read through esbuild's own parser, and its imports from the root by their grammar. A
  file esbuild cannot transform with the loader it would use, or one that names the root in any other form (a namespace import, `export *`, a default import, the
  name in a string), keeps the full root: a slower first screen, never a missing import.
- **It never rewrites a dependency that resolves another copy of Basalt.** Each import is resolved as esbuild would resolve it for that file, and only one that
  reaches the copy beside the plugin is rewritten.

**Under a content security policy.** Two things Basalt or Base UI write inline have a form for a policy that forbids inline code:

- **The head scripts** (`themeBootstrap`, `loopsBootstrap`) are also files: `@srasyndicate/basalt/head/theme.js` and `@srasyndicate/basalt/head/loops.js`, each
  the exported string exactly. Under `script-src 'self'`, copy them into what your server serves and load them in `<head>` with a plain
  `<script src="/basalt-theme.js"></script>` (no `async`, `defer` or `type="module"`, which would run them after the first frame). With a nonce, keep the
  inline form and give it the nonce: `<script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />`.
- **Base UI's one inline `<style>`** (a hidden scrollbar on `.base-ui-disable-scrollbar`, written when a `Select` opens) is refused by `style-src 'self'`.
  Wrap the app in `<CSPProvider disableStyleElements>`: Base UI writes no style element, and Basalt's stylesheet draws the same two declarations in
  `@layer basalt` (measured: the open popup's box, and its list's scrollbar width and client width, are the same with Base UI's style and without it). Or pass the policy's nonce, `<CSPProvider nonce={nonce}>`, and Base UI writes it on its style and script elements.
  `CSPProvider` takes `nonce`, `disableStyleElements` and `children`, and draws nothing of its own: it is Base UI's provider with Basalt's types.

```ts
// At build time: the head scripts beside your other static files.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
fs.copyFileSync(require.resolve("@srasyndicate/basalt/head/theme.js"), "public/basalt-theme.js");
fs.copyFileSync(require.resolve("@srasyndicate/basalt/head/loops.js"), "public/basalt-loops.js");
```

**Browsers.** The floor is Chrome 123, Safari 17.5 and Firefox 121 (the owner's decision, DECISIONS 140). `light-dark()` sets Chrome's and
Safari's number and `:has()` sets Firefox's; `docs/foundations.md` (Browser support) has the full list and the three known uses above it, and
`test/browser-floor.test.mjs` fails when the built CSS uses a feature past the floor. The opaque header under reduced transparency is drawn
only where `prefers-reduced-transparency` is evaluated (Chromium 118 and later); in Safari and Firefox the header stays smoked.

## Components

| Component | Notes |
|---|---|
| `Button`, `IconButton` | `primary`, `secondary`, `ghost`, `danger`, `outline` (transparent, an input-boundary edge, primary ink; never a toggle); sizes `xs`–`xl` (24–40px) and `2xl` (44), `3xl` (48), `4xl` (52), `5xl` (56): radius 8, 16px, and 600 where there is text; compact steps each down one. `IconButton` requires `label`. Props on `Button`: `fullWidth` (as wide as its space); `amount` with `amountReserve` (a quieter amount after the label, in a seat as wide as the widest, so nothing moves; 0.72 ink on primary, secondary and outline, full ink on ghost and danger); `count` (an outlined pill that holds two digits, `aria-hidden`: put the count in the button's name); `note` (a second line under the label, at least 64 tall, one line in a container 340 to 480 wide: give the container `container-type: inline-size`). On `IconButton`: `done` (the plus becomes a check in the button's own ink, in one seat, a 100ms crossfade even under reduced motion; the name does not change, so say what happened in a `StatusLine`) with `doneIcon`. `useConfirm()` returns `[confirmed, confirm]` and holds for `CONFIRM_MS` (1500). A press whose `onClick` returns a promise waits for it (DECISIONS 260): presses are ignored until it settles (the handler is never called twice), the button is `aria-busy` and keeps its focus, label and width, and the ring shows only after 300ms and stays at least 400ms (`WAIT_SHOW_AFTER_MS`, `WAIT_MIN_SHOWN_MS`; a look only: presses and `aria-busy` end with the answer). `useWaitMark(waiting)` is the same rule for an app that draws a wait of its own. A handler on the element given as `render` is guarded too. A rejection ends the wait and is raised again: say why in the app. `loading` is the app's own flag and wins (the ring at once); `waitForAnswer={false}` calls the handler on every press. A submit button waits for its `Form` too, inside it or outside with `form`. |
| `TextButton` | A button that reads as running text: no box, the text's font, underlined as `Link` is; `quiet` is secondary ink; `iconEnd` is not underlined. No pressed state (a choice between two is a `SegmentedControl`). On touch a button on its own line has a 44px hit box and no layout change; one in a sentence keeps its line. It keeps focus when it disables itself (`focusableWhenDisabled` is on by default; pass `false` to leave the Tab order), so a press that disables it does not drop focus to the page. Its words may be a `Reserve`: the button holds the width of the longest, and the underline is under the words shown (DECISIONS 242). It waits for a promise from `onClick` as `Button` does, and takes `loading`: its busy sign has no box, so nothing moves: the words step down an ink and the underline turns dashed and breathes. |
| `SwitchRowGroup`, `SwitchRow` | One checkbox drawn as a row: `tile` (36px, 32 under 720 wide, decorative), `kind`, and the name as `children`; a plus and a check cross over in a 16px seat. 52 tall from 720 wide, 48 under. Name the group with `aria-labelledby` and describe it; it is not a filter (no count or Clear), and one `FilterResult` says what it did. |
| `OptionChips` | One of many, eight at most, as wrapping chips with no track: a fieldset with `legend`, `options` of `{ value, label, unavailable? }`, a round 16px seat on every chip. `unavailable` is the words ("sold out at the brand"): the disabled look, reachable, never chosen. Above eight values use a `Select`. |
| `Field`, `Input` | A visible label always; description and error are linked to the control. `required` shows "Required" directly after the label (tertiary, `text-xs`, hidden from assistive technology) and the `Input` inside carries `required`; `optional` shows "Optional"; a field marked neither shows nothing. Never an asterisk. A control that is a group, a `SegmentedControl`, is named by the label (with the word "Required" said after it when the field is required) and described by the description and, while the field is `invalid`, the error. In a `FormGrid` a field takes `column`, `row` and `rows`. `labelAction` is a node at the end of the label's row (a `TextButton` such as "Suggest a name" or "Use my address"), on the label track so it lines up in a `FormGrid` row; it is not inside the `<label>`, so a press on it never focuses the control and the label stays as wide as its words (DECISIONS 233, 241). A `description` that is a `Reserve` lays out as a block that wraps, so words that change hold their seat. |
| `FormGrid`, `FormGridItem` | Fields in columns that line up (DECISIONS 237, 239 to 242; the implementation hasn't been reviewed). `<FormGrid columns="3-2">` with `Field`s placed by `column`, `row` and `rows` (`FormGridItem` for a cell that is not a field, such as a `Switch` with its `description`): every field takes four tracks a row, label, control, hint and error, and is a subgrid on them, so beside each other the labels, controls' tops and bottoms, hints and errors sit on the same lines, 0px. The spaces are Basalt's: `space-1-5` inside a field, `space-4` between rows, `space-8` between columns, each held by its track; every control is `size-control-md` tall. A field with `rows={3}` keeps its label on the first row's label track, its hint and error on the last row's, and its control (a `Textarea`, whose `rows` is the least it asks for) fills what is between. It answers the width it is given, not the window: it is the columns where its own width is at least 640 (`size-breakpoint-container-lg`) and the window at least 720, and one column in the markup's order anywhere else (a phone, the 480 form dialog, a narrow pane), so one form reads right in a wide dialog and in a side pane on the same screen. It sits in a frame of its own (`basalt-form-grid-frame`, the container); props go to the grid. A container takes its width from its parent, never from its content, so the frame fills its line as a block does: in a flex row give it `flex: 1` (or a width), as a bare `Pagination` needs. Give every cell a `row`. |
| `Form`, `Fieldset` | Validated submission of named fields; a visible legend and group disabling. A `Form` whose `onSubmit` or `onFormSubmit` returns a promise ignores a second submit (a button or Enter) until it settles, and its submit buttons are busy; `waitForAnswer={false}` turns it off. |
| `Combobox` | Search a single selection from `{ value, label, disabled? }` options; labelled by Field. |
| `NumberField` | Locale-aware number entry; min, max, step, format and bounded increment/decrement. |
| `Slider` | Required `label`; scalar or range; `thumbLabels` and `getValueText` for meaningful spoken values. |
| `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuGroup`, `MenuGroupLabel`, `MenuSeparator` | Items take `icon`, `shortcut`, `danger`. An item whose `onClick` returns a promise closes the menu as ever, and the menu waits: its trigger is busy and the menu does not open again until the answer (`waitForAnswer={false}` on the item turns it off). A trigger that does nothing for now keeps its place and its focus: see [a menu trigger that is off for now](#a-menu-trigger-that-is-off-for-now). |
| `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem`, `MenuSubmenu`, `MenuSubmenuTrigger` | Persistent settings and nested actions, with state marks and keyboard navigation. |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogActions`, `DialogClose` | Focus is trapped; Esc closes; focus returns to the trigger. `DialogContent size="wide"` is a reference dialog's width (992px, decided in DECISIONS 158 Q1: 118 characters of Geist Mono at 14px rounded up, kept in px; capped by the viewport) and its first focus is its title (a reading dialog, so Enter on opening runs nothing; a wide `form` keeps a form's first focus on its first field, DECISIONS 242). A title takes `tabIndex={-1}` and draws no ring. A form or task opens in the center (DECISIONS 222): `DialogContent form` takes the sheet's `SheetHeader`, `SheetBody` and `SheetFooter` in a 480px box (a held head with the title and a 44px Close, a scrolling body that opens with the description, a held foot with Cancel, then the primary), at most the window less 16px above and below, its top held where it opened (it re-centres only on a window resize); a press on the scrim closes it only while nothing has been entered (Basalt compares what the fields hold, by their structure: every selected option of a select, checked boxes and radios, a file input's files, and text; `dirty` is the app's own answer and wins when given, for a custom control with no input or defaults that load after opening); focus on opening goes to the first field, or to the title when a touch opened it; under 720 it is a full-screen modal rising from the bottom. An alert dialog stays centred. Drafts and discards are the app's: the form's values live only while it is open, so an app that keeps a draft across a close holds the values in its own state, and Basalt asks nothing on a close (no "discard changes?" step). |
| `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogActions`, `AlertDialogCancel`, `AlertDialogAction` | Explicit confirmation; cancel receives initial focus, outside clicks do not dismiss. |
| `Sheet`, `SheetTrigger`, `SheetContent`, `SheetTitle`, `SheetDescription`, `SheetActions`, `SheetClose` | Dialog behaviour in a right, left, bottom or top panel. `SheetActions` stays pinned to the foot when it is the last child of `SheetContent`, or of a `Form` placed directly in it. |
| `SheetHeader`, `SheetBody`, `SheetFooter` | A sheet's anatomy: a head band (`SheetTitle` 20/28, a `SheetDescription` count, and with `closeLabel` a 44px close), a body that scrolls (while it overflows and holds nothing focusable it is a keyboard stop, a region named by the sheet's title, with the ring; there is no `tabIndex` to add) and a foot on a divider; the sheet then has no padding of its own and the head and foot keep the safe areas. `SheetContent step="cart"` is the step the sheet shows: when it changes, focus moves to this sheet's title and the body scrolls to its top, so the new title is read out; you swap the body and foot. |
| `Drawer`, `DrawerSection`, `DrawerTrigger` | A panel docked in the flow under a page's column, with two titled halves: no portal, scrim, level reset, motion, shadow, fill or corner, and a divider along its top. `label` names it; `rows` sets its height from 720 in 24px rows (13); `open={false}` hides it and leaves it in the document; `onBack` draws a Back button under 720, where it is a page of its own. `DrawerSection` takes `title` and `actions` and scrolls its body (while the body overflows and holds nothing focusable it is a keyboard stop, a region named by the title, with the ring); `DrawerTrigger` says which drawer it controls (`drawer`) and whether it is open (`open`). It takes no focus when it opens: the app moves it. **On a phone** the open drawer replaces the record: the component stacks the halves on a divider and draws Back (`onBack`); the app hides the record while the drawer is open (`hidden`, so it leaves the accessibility tree too) and, in `onBack`, closes the drawer, shows the record and moves focus to the `DrawerTrigger`. `columns` sets the halves' widths (a `grid-template-columns` value). |
| `Tabs`, `TabsList`, `Tab`, `TabsPanel`, `TabsPanels` | For panels of one view. `size` is `lg` (36), `3xl` (48) or `5xl` (56, 48 in a container under 640). `<TabsPanels stacked>` keeps every panel mounted in one grid cell so the view is as tall as its tallest panel and a change of tab moves nothing under it (hidden panels are `visibility: hidden` and inert; it turns off under 640 wide). |
| `LinkTabs`, `LinkTab` | Tabs that are links: a `nav` with `aria-label`, each `LinkTab` an `a` with `current` (`aria-current="page"` and a static 2px underline; `render` takes a router's link). The current link's label is 600 in primary ink and a resting one 400 in secondary, every label reserving its 600 width, so choosing a page moves nothing. Not a `tablist`. `size` as `Tabs`. **Under 720 wide the row is a `Select` of the same links** (both in the markup, chosen by CSS, so nothing moves on load; one is exposed at a time): it says where choosing goes (DECISIONS 158: a "Go to" label, `goToLabel`, before the current page's name, in the visible label and the accessible name), its value is the current link's `href`, and **only a choice from the open list navigates** (a click, or Enter on the highlighted option; a typed letter or any key on the closed `Select` does not). Navigating calls `onNavigate(href)` (an app's router; focus stays on the `Select`) or else `window.location.assign(href)` (a new page loads and focus starts over there). `Select` takes `valuePrefix`, a label before the value inside the trigger, secondary ink, one line, read as part of the name. |
| `SegmentedControl`, `Segment` | One choice that filters the current view; a press on the chosen segment leaves it chosen. With no `value` nothing is chosen (no segment pressed, no pill). `fullWidth`: equal segments that fill the container, the pill still sliding. One tab stop: Tab lands on the chosen segment (the first that can take focus while none is chosen), the arrows move focus without choosing. `radio`: a radiogroup of radios instead (`aria-checked`; all four arrows, Home and End move focus to the next segment that is not disabled and check it, looping unless `loopFocus={false}`; segments may sit in a fragment or a wrapper; a required group takes `aria-required`), the same pixels. In a `Field` the label names the group; `required` says it in the name (a group of pressed buttons takes no `aria-required`): "Severity, Required"; `invalid` sets `aria-invalid` and, in a `Field` with an `error`, the group is described by it. It draws no invalid mark of its own (not decided, DECISIONS 242). `aria-label` is optional inside a `Field` (DECISIONS 242). |
| `Breadcrumbs`, `Pagination`, `Link` | Location, bounded page windows and native destination links. `Pagination` is seven fixed slots past seven pages (each as wide as the widest page number the list can reach, at 600 in tabular figures; `maxPages` names that number), with Previous and Next always there (`aria-disabled` at an end, still focusable), at one page or none it renders nothing, as before (`keepRoom` keeps its room instead, hidden, with `role="none"` in place of the `nav` landmark: `ListBand` sets it, so a filter that leaves one page closes no gap), never wrapping, and under 640px of its own width Previous, a summary and Next. **A bare `Pagination` is its own container** (`container-type: inline-size`), so it fills its parent as a block does: in a flex row it needs `flex: 1` (or a width), or it collapses to nothing wide; in a column or a block nothing changes. `compact` forces the compact form. A press on a number moves focus to the button that holds the current page. The gap is the core `more` glyph. On a coarse pointer a `Link` on a line of its own has a 44 by 44 hit box (a pseudo-element widens a short link; its line and look do not change), and a link in a sentence keeps its line. A known limit: two standalone links on neighbouring lines less than 24px apart have hit boxes that overlap there. |
| `SocialLinks`, `SocialLink`, `ProfileLinks`, `ProfileLink` | A glyph and the service's name (`service`: github, x, linkedin, instagram, youtube, email; none for a service without a mark). `SocialLinks` is the row (`size` 16 or 20; `iconOnly` for a row made entirely of marks); `ProfileLinks` is the long form, with `handle` as the hint. |
| `Text`, `Heading`, `InlineCode` | Token type scale; Heading's semantic `level` is independent of visual `size`. |
| `Prose` | A prose page's text column: `size-prose-width` wide (34rem), on the row's start edge and never centred. It sets a measure and nothing else. |
| `Nav`, `NavGroup`, `NavItem` | An app's navigation: a column of `NavItem`s (`icon`, `current`, `count`, `dot`), optionally in `NavGroup`s (`label`). Hover is a round pill hugging the glyph and label that glides between items; the current page is its selected glyph and a 600 label. `Nav collapsed` is the rail, where a count or a dot is spoken with the name and not drawn. `Nav size="sm"` is a second, quieter list under the main one (recent items, saved views): a 32px pill at 13/18 with the glyph at 16, the same hover, glide, current page and ring (28 in compact, 44 on touch). |
| `TabBar`, `TabBarItem`, `TabBarMore` | The phone tab bar, fixed to the bottom under 720 (56px plus the bottom safe area; not shown from 720 up or in print), named "Primary" (`aria-label`). Each `TabBarItem` is a link that fills its cell (`icon`, `current`, `dot`); `TabBarMore` is the last cell when there are more than five destinations and opens the rest as `NavItem`s in a bottom `Sheet`. Pass it to `AppShell` as `tabBar`. |
| `AppShell`, `AppHeader`, `PaneLayout`, `usePaneScroller` | An app's frame: the sidebar from 1024 (`sidebar`, `account`), the rail from 720 to 1023, the `tabBar` under 720, and `header` over the content column; the document scrolls. `capped` holds the whole shell to `--basalt-shell-width` (by default `size-sidebar-width` plus `size-page-width`, 1408px at 16px text) and centres it, so on a wide window the navigation and the page stay together; at that cap the page is exactly its own 72rem, and an app sets `--basalt-shell-width` on the root for another. `AppHeader`'s `h1` takes `tabIndex={-1}` and `titleRef`, the landing place for `useRouteFocus` and `useFocusNet`. `AppHeader` takes the page's `title`, `actions` (ghost icon buttons and at most one primary, which stays in the bar with its words under 720, 44 tall, and the title gives way to it) and `facts`: an array of short facts drawn under the title on one line at 13/18 in secondary ink and joined by dots (a reference, a plain status `Badge`, a `Time`). `PaneLayout` is a page with a pane at its end (`pane`, named by `paneLabel`): 256px wide, sticky under the bar, at most the window's height and scrolling inside when it is taller (a tab stop while it overflows); under 920px of its own width it follows the page in the flow. Inside the pane, `usePaneScroller()` returns the pane's element while it is its own scroller (beside the page) and `null` while the window scrolls it: a part that follows scrolling (a list's band, a back-to-top control) takes it as its scroll owner. |
| `Lead`, `PageRow`, `PageSections`, `PageSection`, `SectionIntro`, `SectionActions`, `Columns`, `ColumnsItem` | A site page's lead, row, sections and twelve-track columns; `Heading size` also takes `"6xl"`, `"7xl"` and the roles `"hero"` and `"display"` (see foundations, Display type); in development `Columns` and `ColumnsItem` log a warning for a display or hero heading (or a fixed `6xl` or `7xl`) in a column under 7 of 12 tracks from 1024, whether a named layout or an item's own `span` makes it, and a production build holds none of that code. |
| `Avatar`, `Separator`, `EmptyState` | Named image/initials, semantic division and next-step guidance for empty views. |
| `Badge` | Neutral pill; `status` adds a dot (success, warning, danger, accent, pending, or `"neutral"` by name). No `status` is the word alone; a running badge (a braille `Spinner` first) draws no dot. The label says the status in words. In forced colours every dot is a disc in the system colour of where it sits. |
| `BadgePair` | A name with at most two badges: the `status` first, then one neutral `fact`. When the name and the pair don't fit on one line the pair moves under the name as a unit; a badge never truncates. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `CardTitle` is an `h3`; give it `level` (2 to 6) to put the card in the page's outline where it belongs. The size and weight stay the same at every level. |
| `ChoiceCard`, `ChoiceCardGroup` | A card you can choose: a native radio (or, with `multiple`, a checkbox) wearing a card, with `title`, `description` and `children`; the whole card is the label and the choice box sits in a seat reserved on every card, so choosing moves no title. Put the cards of one choice in a `ChoiceCardGroup` and name it (`aria-label` or `aria-labelledby`). |
| `DescriptionList`, `DescriptionItem` | Facts about one thing as a `dl`: each `DescriptionItem` has a `term` and its `children` (or `values` for several `dd`s); `mono` for identifiers; `missing` keeps the label and says "Not observed" (a reading not taken), or the app's own words given as its children ("None yet", "No one") for a value that is absent. The label column is fixed and the list stacks under 480px of its own width; `narrow="line"` keeps each label and value on one row there, the label column at 80px. |
| `Stats`, `Stat`, `formatStatTime` | A row of figures, never boxed (`Stats`, one `dl`; `min` is the narrowest a stat gets before the row wraps): each `Stat` has a `label`, a `value`, a `note` and a `source` with its `time`. `formatStatTime(time, { now, timeZone, locale })` writes the time as the stat does, in the locale's hour (`en-US` by default: "4:41 AM", "Nov 7, 8:02 AM"). |
| `TableContainer`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `numeric` cells use tabular numerals, end-aligned with their header; `mono` cells for IDs and hashes. Give `TableContainer` a `label` ("Runs table"): while the table is wider than its box the container is a keyboard stop with that name as a `region`, so the hidden columns can be scrolled to without a pointer (an `aria-label` or `aria-labelledby` works too; with none of the three the stop is named by the table's `caption`, and with no caption "Scrollable table"). On touch a lone checkbox or link in a cell has a 44px hit box. In a still table (`columns`) a cell whose text is cut by the ellipsis is a focus stop (`data-cut`, `tabindex="0"`), and on hover or focus its whole value opens in place on a level-3 plate (Esc closes it; it is `aria-hidden`, the cell holds the value); each cut cell is one added tab stop. Size a column of one fixed form (a date, a time, a status) for its longest form under WCAG 1.4.12 spacing, so only free text is cut, and size a header's label to fit its column under the same spacing: a cut sortable header opens no plate (the sort button is the whole cell and its name holds the label), a plain header does. A sortable `TableHead` (`onSortChange`) asks for the first direction, then the reverse, then `undefined`: the table's own order, with no column lit. Sort with `sortRows(rows, value, direction)` from the order the rows loaded in, every time, so ties keep it and the third press gives it back row for row. `TableHeadExplainer`, given to a header as `explainer` (a `title`, one to three sentences and at most one link), says what a column a reader could misread means: it opens from the header on hover after 600ms, on keyboard focus and on a long press on touch, above the header or beside it and never over its column; on a sortable header a press still sorts, and a header that does not sort becomes a focus stop of its own (`tabindex="0"`, the −2 inset ring, described by the card's words), so a keyboard and a screen reader reach it too. A `Table` renders every row it is given (see [Long lists](#long-lists)): page one that can pass a few hundred rows with `Pagination`. |
| `TableEmpty`, `TableScrollHint` | `TableEmpty` is the row a table shows when no row matches: one cell across `colSpan` columns, under the unchanged header, with a sentence (`children`) and an `action` that names what hid the rows: a search alone gets a sentence that names the term (`No runs match “zzq”.`) and "Clear search"; a chosen filter gets "Clear filters", and in the mixed case "Clear filters" clears the search too. `TableScrollHint` is one line right after a `TableContainer` that is wider than its box ("Scroll sideways to see all 6 columns", `label` sets the words); it shows only while the table overflows, is `aria-hidden` and never changes while the table scrolls. |
| `TableContainer flat`, `TableCall` | The flat form (DECISIONS 162, D18b): `flat` draws no border, radius, fill or shadow and adds no level, so a `Card` that holds the table has one box (the card's `space-4` padding is the inset; the header band keeps its fill; cells are padded `space-2` above and below). `TableCall` is a two-line cell's content: `call` in primary at 500 over `detail` in secondary at 400, `space-0-5` apart, wrapping inside its column. The panel's head and note are the app's markup. |
| `Tooltip`, `TooltipProvider` | Supplements a name with a linked accessible description; never replaces a label. |
| `Checkbox`, `Switch` | The label is `children`. A switch takes effect immediately; a checkbox on submit. `Switch` takes a `description`: a line under its row in a `Field` description's style, at the column's start edge (not indented past the switch), linked with `aria-describedby` (DECISIONS 242). |
| `RadioGroup`, `Radio` | A few options, all visible; arrow keys move the choice. |
| `Select` | `options` of `{ value, label, disabled? }`; labelled by its `Field`. `numeric` makes a Select of numbers (a page size) as wide as its widest option, below `size-select-min`, whatever is chosen. `toolbar` makes any Select as wide as its widest label instead of its container, so selects share a toolbar row and a choice moves nothing after it; in a narrower column it fills the column and cuts the value. |
| `ToastProvider`, `useToast` | `useToast().show({ title, description?, status?, action?, home?, group?, running? })`, then `update(id, patch)`, `close(id)` or `promise(work, { running, success, error })`. A toast stays until dismissed unless it names a `home` for what it says (`"centre"`, `"row"`, `"key"` or `"page"`; an action needs one that is not the page), and then it closes after 5s. Level 1, three deep, danger announced assertively. A toast with an `action` is announced with one more sentence: "Undo is available. Press F6 to reach it." F6 lands on the newest toast's action, or on the stack's named region when no toast has one. A toast is a named group, never a dialog, so `isOverlayOpen()` and an app's own "is a dialog open" leave it out. Pass `actionWords={(label) => string}` to `ToastProvider` to say it in another language or other words; a toast with no action says nothing extra. Nothing extra is drawn, and it is said once. |
| `NotificationCenter` (alias `NotificationCentre`) | The durable copy a toast points to: a bell button with a dot (count in its name) opening a popover of `entries` (`{ id, title, description?, time, dateTime?, status?, unread?, href?, current?, entries?, count? }`), "Mark all as read", "View all" and, with `onClearAll`, "Clear all" at the footer's start; `initialFocus` chooses what takes focus on opening (by default its first control). `status` is `success`, `warning`, `danger` or `pending` (waiting: the empty ring, no colour). An entry with `entries` is a group: its row shows the title, "×N" (`count`, default `entries.length`) and a chevron, and opens in place to them. Presentational: you own the entries, the grouping, their read state and the page. |
| `NotificationList` | The center's entries in the page: your notifications page (what "View all" opens) and, on a phone, the tab bar's destination (`TabBarItem` with `NotificationsGlyph` and its `dot`). A head band with the count and "Mark all as read" (`head={false}` drops it, for a list in a sidebar), the list named by `label` or `aria-labelledby`, `empty`. No popover, title, rim or glide. `current` on an entry is `aria-current` and its title at 600. `onClearAll` adds a foot with "Clear all" at its start. |
| `CommandMenu` | ⌘K: `groups` of `{ label, commands }`, each command `{ id, label, icon?, description?, shortcut?, keywords?, danger?, onSelect? }`; you bind the shortcut. A `description` is a second line, and is searched below the label; `danger` draws the command in the danger colour, as in `Menu`. `onSearchChange` hears what is typed and `search` controls it, so a command can carry the words ("Search this document for “budget”", with `keywords: [search]` so it stays found). Left uncontrolled, the search starts empty at every opening and `onSearchChange` hears `""` once the menu has closed; a controlled one is yours to clear (in `onOpenChange`). |
| `CommandList` | The same panel set in the page (no dialog): a level-1 panel whose field keeps focus, with a count in its foot. `label` names it; `detail={(command) => pane}` adds a preview beside the list (a push under 816px); `bindShortcut` gives it ⌘K. One command surface per page owns ⌘K. |
| `SearchTrigger`, `SearchDialog`, `SearchResults`, `SearchResult` | Search by following links. `SearchTrigger` is a button shaped like a field (a 1px input boundary, the glyph and the word, 200 by 44) from 720 and a 44px icon button under it; it opens whatever you open. `SearchDialog` is a centred dialog: a `type="search"` field and a close button (one ×: the browser's is hidden), a count line (`count` is a string, drawn at once and spoken once) and a results area of a fixed height, a full result's, so the field and the count never move. `SearchResults` holds `SearchResult` links: each a tab stop, `media` (96 by 48 with `mediaShape="logo"`, 48 by 60 by default), a name and a `detail` line, a `trailing` value, as tall as its picture plus 6px above and below (never under 48). Enter in the field calls `onSubmit(query)`. There is no active row and no arrow-key movement. `logoRows` (3), `rows` (5) and `all` are a shop's presets: set your own. |
| `SearchField`, `SearchPassages`, `SearchPassage`, `SearchMatch`, `markMatches` | Search in a page or a panel whose results come from your server. `SearchField` (`label`, `value`, `onValueChange`, `onSubmit`, `onOpen`, `onEscape`, `clearLabel`, `controlSize`) is an Input in a `role="search"` form with the search glyph and a clear ×; the first Esc empties it, the next calls `onEscape`. `onOpen` is Enter, said before `onSubmit`, for a search that opens its results on Enter and not on focus. `SearchPassages` is the ordered list (name it; `rows` and `lines` give it a fixed results budget that scrolls inside); a `SearchPassage` is a link (`href`) or button with `source` (who or where), `meta` (when) and the passage as children, `current` for the one shown. `markMatches(text, ranges)` marks a server's `[start, end)` ranges with `SearchMatch` (primary ink at 600, no fill) and never parses HTML. Draw the first load in a `LoadingShape` of stand-in passages; keep the last results while a changed query runs (`refreshing`). |
| `Listbox`, `ListboxGroup`, `ListboxOption` | One choice from a list that stays in the page: `role="listbox"` with one tab stop and `aria-activedescendant`, whose choice follows ↑ ↓ Home End. Options have a `detail` second line and a `trailing` cell; groups are named by their header. The chosen option has a chevron in its gutter and primary ink, never a heavier weight. Focus is a ring on the list's own box, 2px at +2 with radius 8 (DECISIONS 159: the owner, on a 2 to 2 deadlock in DECISIONS 157, Q2); `flush` draws it inside at −2 where the list meets a clipping edge. The rows scroll in a box inside the focused one (`.basalt-listbox-scroll`), so the corners clip nothing and a script that scrolls the list scrolls that box. |
| `OpenList`, `OpenListGroup`, `OpenListRow` | Rows that open (not a listbox). The name is a button stretched over the row; one row, the cursor, holds the tab stop; ↓ ↑ `j` `k`, Home `g`, End `G` move it and Enter opens. A row has `part`, `state` and `detail` cells, aligned down the list, and says what it `opens` into. `off` leaves a row in place that a filter does not match (unavailable to every input, DECISIONS 168: disabled ink, no cells, skipped by the cursor, `aria-disabled`, no hover step, a `not-allowed` cursor, and a press does not open it); count with a `FilterResult` outside the list. `OpenListGroup` is a named `group`, not a landmark. |
| `NoticeBar` | One short notice across the top of a page, above the header: a named region (`label`, not a live region), the level-1 fill with a divider under it, `title` in primary at 600. |
| `Textarea` | Multi-line Field control; controlled or uncontrolled, with the field's label, validation and disabled state. `writing` (on `Input` too): something else is writing into it, an agent's draft: read-only and `aria-busy` at once, then after 300ms (for at least 400ms) the words dim to secondary and the boundary turns dashed on a skeleton's pulsing fill, never the disabled look, and an empty value while writing keeps the text shown (DECISIONS 260); `writingEmpty="clear"` shows the empty value instead, for an app that clears the field on purpose while the busy look stays. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverTitle`, `PopoverDescription`, `PopoverClose` | Anchored details or a short form; Esc returns focus. `PopoverContent` and `MenuContent` take placement props, and one `Popover` can serve many triggers: see [Placement, one popover for many triggers and small parts](#placement-one-popover-for-many-triggers-and-small-parts). |
| `Callout` | Persistent inline information; `status`, `title`, optional `actions`. Success, warning and danger draw a 45% status rim over a neutral fill. Set `live` only when it appears in response to something. |
| `Progress` | Required `label`; `value={null}` for an indeterminate task. |
| `Spinner`, `Skeleton`, `NumberTicker` | Loading and rolling tabular digits. Spinner variants: `ring` (default) and `braille`. `glide` eases a ticker toward its value over `slow`. Under reduced motion and in forced colours the strips are hidden, the number is plain tabular text in the sentence's own line, and a new value changes in place; the system then paints one selection band and its selected-text colour on the digits. A ticker is an inline box, so in a stretched flex row its digits sit where a plain-text sibling's text sits, not on the bottom of the row as they used to (the sparkline's own headline keeps its place). |
| `Slide`, `useGlide`, `useReducedMotion`, `useSlideDirection` | Motion helpers. `Slide` wraps a tab or segment panel so a change slides it in (or fades it under reduced motion) without re-keying it, so a field inside keeps its value and focus; `useSlideDirection(value, order)` says which way a value moved through an ordered list (`""` until the first change). `useGlide(target)` eases a number toward `target` over `slow` (give a screen reader `target`, not the in-between value). `useReducedMotion()` is true after mount when the reader asked for reduced motion. |
| `MorphIcon`, `TextMorph`, `Sparkline`, `Stepper`, `LivePreview`, `TravelSpinner` | Motion primitives. `Sparkline` is a line and its latest value, not a charting component; `format` writes its readings (the value, the scale's ends and the image's name: "2.75%"); left out, the value keeps its own decimals and the scale's ends are whole numbers. See [docs/motion.md](../../docs/motion.md). `TextMorph`'s `label` is what a screen reader hears when `text` changes, if that should say more than the glyphs show; nothing extra is drawn. `Stepper` is a `group` named "Steps" (`label` sets the name), and the step's name is read with where the user is: "Step 2 of 3: Review", once, when it changes. `positionLabel={(step, total) => string}` sets those words for another language. |
| `CodeBlock` | `code`, optional `language`, `title`, `copyable`, `prompt`, and `wrap` (break long lines at spaces only, each run between spaces kept whole; a continuation indented 2ch; a word longer than the line still scrolls). Language-aware syntax; exact-text copying and keyboard scrolling. Each language loads on first use: plain text first, colour moments later. For highlighted server-rendered HTML, `await preloadCodeLanguages(["ts", "bash"])` before rendering. |
| `Accordion`, `AccordionItem` | Secondary detail; keyboard operated, with coordinated panel and caret motion. An item's header is an `h3`; `headingLevel` (2 to 6) sets its level in the page's outline, and it draws the same at every level. |
| `Toolbar`, `ToolbarButton`, `ToolbarIconButton`, `ToolbarLink`, `ToolbarInput`, `ToolbarGroup`, `ToolbarSeparator` | One tab stop for a row (or column) of controls, as the WAI-ARIA toolbar pattern describes: the arrow keys along its `orientation` move between the controls and wrap (`loopFocus={false}` stops at the ends), Home and End go to the first and last, and in a right-to-left page the arrows follow the page. See [Toolbar](#toolbar). |
| The core glyphs | `HomeGlyph` and `ArrowDownGlyph`, `ArrowLeftGlyph`, `ArrowRightGlyph`, `ArrowUpGlyph`, `CalendarGlyph`, `CheckGlyph`, `ChevronDownGlyph`, `ChevronLeftGlyph`, `ChevronRightGlyph`, `ChevronUpGlyph`, `CloseGlyph`, `CopyGlyph`, `DownloadGlyph`, `EditGlyph`, `ExternalGlyph`, `HistoryGlyph`, `MenuGlyph`, `MessagesGlyph`, `MinusGlyph`, `MoreGlyph`, `MoreNavGlyph`, `NotificationsGlyph`, `PauseGlyph`, `PlanGlyph`, `PlayGlyph`, `PlusGlyph`, `PolicyGlyph`, `ProfileGlyph`, `RecordsGlyph`, `RoutesGlyph`, `RunsGlyph`, `SandboxesGlyph`, `SearchGlyph`, `SettingsGlyph`, `SourcesGlyph`, `TrashGlyph`, `TrendsGlyph`: one module each, drawn by `Icon` (next row) or passed to any `icon` prop. |
| `Icon`, `Kbd` | `Kbd` draws one chip per key from a string (`"⌘K"`), with ⌘ ⌥ ⌃ as Phosphor icons; show real shortcuts only. Write a shortcut with `Mod` (`"Mod+Enter"`) and it is ⌘↵ on Apple's systems and Ctrl Enter on Windows, Linux and ChromeOS, in `Kbd`, `ActionShortcut`, `MenuItem`, `CommandMenu` rows and `Tooltip`, with `aria-keyshortcuts` `Meta+Enter` or `Control+Enter` and the words "Command" or "Control" (DECISIONS 244). Bind the key with `isModKey(event)` (Command alone on Apple's systems, Control alone elsewhere; `CommandList`'s `bindShortcut` does), from the same `isApplePlatform()` (`navigator.userAgentData.platform`, else `navigator.platform`, else the user agent; `useApplePlatform()` is the hook), so the hint and the binding can't disagree. A client render (`createRoot`) reads the platform at its first render, so a `Mod` chip is right on the first frame and as wide as a hand-written one; a server-rendered page draws Control and its `Mod` chips settle at hydration, with no mismatch warning. A toast's `action.keys` takes `Mod` too. Strings written the old way (`"⌘K"`, `"Ctrl Enter"`) read as before. `Icon` draws a core glyph (`HomeGlyph`, one module each, 2.25 units on 24 at every size; `selected` closes its opening and fills) or a long-tail Phosphor icon in Bold at 16, 20 and 24 (Fill only when `selected` and `fillSafe`). Every `icon` prop takes any component that accepts `size` and `weight` (the core glyphs and Phosphor's do), and Basalt's declarations name no icon or primitive package. |

### A menu trigger that is off for now

A trigger with nothing to act on yet (no rows chosen, no file open) stays where it is and keeps the focus, so a keyboard user can still find it and read
why: render a `Button` with `disabled` and `focusableWhenDisabled` (it is `aria-disabled`, keeps its place in the Tab order and ignores a press), and control
the menu so it cannot open while the button is off. Base UI's trigger opens on its own key and pointer handlers, so the open state is where it is held:

```tsx
function BulkActions({ selected }: { selected: number }) {
  const [open, setOpen] = React.useState(false);
  const off = selected === 0;
  return (
    <Menu open={open && !off} onOpenChange={(next) => setOpen(next && !off)}>
      <MenuTrigger render={<Button size="sm" iconEnd={ChevronDownGlyph} disabled={off} focusableWhenDisabled>Move to</Button>} />
      <MenuContent>
        <MenuItem onClick={() => move("archive")}>Archive</MenuItem>
        <MenuItem onClick={() => move("shared")}>Shared folder</MenuItem>
      </MenuContent>
    </Menu>
  );
}
```

The same holds in a build pipeline's toolbar ("Run on", off until a branch is chosen) or a team chat's message bar. Say why it is off in the words beside it
(a count, "Choose a branch first"): the disabled look alone does not.

## Toolbar

A toolbar draws nothing. It has no class that styles anything: no gap, no separator look, no padding. Lay it out with your own class, as you would with no landmark role. `ToolbarButton`, `ToolbarIconButton`, `ToolbarLink` and `ToolbarInput` are Basalt's `Button`, `IconButton`, `Link` and `Input` with the same props and the same look, plus a place in the toolbar's arrow keys; a `Button` in a toolbar is the `Button` outside one.

```tsx
<Toolbar aria-label="Formatting" className="my-row">
  <ToolbarButton variant="ghost" icon={TextBIcon}>Bold</ToolbarButton>
  <ToolbarIconButton icon={LinkIcon} label="Link" />
  <ToolbarGroup aria-label="Alignment">…</ToolbarGroup>
  <ToolbarSeparator />
  <Menu>
    <MenuTrigger render={<ToolbarButton iconEnd={CaretDownIcon}>Format</ToolbarButton>} />
    <MenuContent>…</MenuContent>
  </Menu>
  <Popover>
    <PopoverTrigger render={<ToolbarIconButton icon={InfoIcon} label="Details" />} />
    <PopoverContent>…</PopoverContent>
  </Popover>
</Toolbar>
```

- **Name it.** Give `Toolbar` an `aria-label` (or `aria-labelledby`); a group inside it is named the same way when it is more than layout.
- **Orientation is what is drawn.** `orientation` is `"horizontal"` (the default: Left and Right) or `"vertical"` (Up and Down), and it must be true of the layout. A toolbar whose controls wrap into a grid is not one orientation: the arrow keys cannot follow rows and columns, so keep a toolbar to one row or one column, or make each row its own toolbar.
- **Only controls.** Put controls in a toolbar and nothing a user cannot focus: a line of help text or a status belongs outside it, or in a `ToolbarGroup`'s label.
- **Disabled.** A disabled control stays in the arrow order, can take focus and says it is disabled (`aria-disabled`), so a keyboard user finds it and can read why. `focusableWhenDisabled={false}` takes it out of the order. `disabled` on `Toolbar` or `ToolbarGroup` disables the buttons and inputs inside. It does not disable a `ToolbarLink`: Base UI's links have no disabled state, so a link in a disabled toolbar still navigates (leave it out, or render it as text, while the toolbar is disabled).
- **A menu or popover** opened from a control keeps the arrow keys, Home and End to itself while it is open, and focus returns to the control when it closes. Make the trigger the toolbar control: `<MenuTrigger render={<ToolbarButton>…</ToolbarButton>} />`. In a vertical toolbar a menu button of that toolbar does not open on Up or Down (those walk past it); Enter, Space and a click open it.
- **A text field** keeps Home, End and the arrows for its caret; the arrow leaves it only at the edge of its text.
- **`ToolbarSeparator`** is a separator for assistive technology and draws nothing. Give it your own class to draw one: how a separator looks is not decided in Basalt.
- Direction is read from the page (`dir`) at every key, so a right-to-left toolbar walks the way it is drawn, even if the page's direction changes while focus is inside. A toolbar nested in another keeps its own keys.

## Placement, one popover for many triggers and small parts

None of these changes how anything looks: each is an option Base UI already had, opened up, with Basalt's own types.

**Placement props** on `PopoverContent` and `MenuContent`, each optional. Left out, a popup is placed as before: against its trigger, `side="bottom"`, `align="start"`, `sideOffset` 6, flipped and shifted to stay 5px inside the viewport. A popup stays on its axis: below its trigger, or above it when that has more room, and never beside it (`PopoverContent` passes `collisionAvoidance={{ fallbackAxisSide: "none" }}` unless you give your own; a menu already did). A tall one fits the room and scrolls inside.

| Prop | What it does |
|---|---|
| `anchor` | Position against this instead of the trigger: an element, a ref (`{ current }`), a `VirtualAnchor` (`{ getBoundingClientRect, contextElement? }`) or a function that returns one. |
| `sideOffset`, `alignOffset` | Pixels from the anchor, and along the alignment axis. A number, or a function of a `PlacementData` (`{ side, align, anchor: { width, height }, positioner: { width, height } }`) that returns one. `sideOffset` is still 6 when left out; `alignOffset` is 0 (a submenu keeps Base UI's own). |
| `collisionAvoidance` | `{ side?: "flip" \| "shift" \| "none", align?: "flip" \| "shift" \| "none", fallbackAxisSide?: "start" \| "end" \| "none" }`. With `side: "shift"`, `align` is `"shift"` or `"none"`. |
| `collisionBoundary` | The area the popup is kept in: `"clipping-ancestors"` (the default), an element, an array of elements, or `{ x, y, width, height }`. |
| `collisionPadding` | Space kept from the boundary's edge: a number, or `{ top?, right?, bottom?, left? }`. 5 when left out. |
| `sticky` | Keep the popup in view after its anchor has scrolled out of it. |

**One popover, many triggers.** `createPopoverHandle<Payload>()` makes a `PopoverHandle<Payload>` (opaque: `open(triggerId)`, `close()` and `isOpen`). Give it as `handle` to the `Popover` and to each `PopoverTrigger`, which may then sit anywhere on the page. A trigger's `payload` is what the popover's children receive while that trigger has it open: `<Popover handle={handle}>{({ payload }) => <PopoverContent>…</PopoverContent>}</Popover>`; `payload` is `undefined` until a trigger has opened it. Make the handle once (outside render, or in a `useState` initialiser). `triggerId` and `defaultTriggerId` still work on a popover with triggers inside it.

| Export | What it is |
|---|---|
| `VisuallyHidden` | Text for assistive technology only, in the class `.basalt-visually-hidden` (an element can carry the class itself). A `span`; `as="div"` or `"p"` for another. In the accessibility tree, no room on screen: use it for what layout says to the eye (the "to" between two times), never for the only copy of a label sighted people need. |
| `DotSep`, `DotLine` | Words joined by a middle dot (the wording audit's W8): `DotLine` joins its children ("In design · Pilot planned"), `DotSep` is the one separator it and `Stat`, `DateAge` and `OptionChips` use. The dot is drawn by the stylesheet and not read; a ", " drawn at no size (`basalt-said`, inline, so `innerText` has no space before the comma) joins the words, so the text and the accessible name are "In design, Pilot planned". `spaced` draws a space each side. A wrapped line never starts with the dot: a spaced dot keeps to the word before it, and `DotLine` glues the dot to the end of each fact (an inline-block badge too) while the fact itself wraps as the line does; a line that never wraps sets `--basalt-dot-line-wrap: nowrap`. |
| `BrandSvg`, `lockupDrawing` | A file from `brand/` drawn inline (the wording audit's W1): `source` is the file's text; its `<title>` build note is dropped, and the drawing is `aria-hidden`, `focusable="false"` and `pointer-events: none`. Put it in `SiteBrand`'s children or `AppShell`'s `brand`; the link carries the name. `lockupDrawing(file)` reads a lockup's `{ viewBox, d }` from a file's text for `SiteHeader`'s `lockup`, the same way. |
| `StatusLine` | A polite status line that is heard and not seen: a visually hidden `role="status"`, `aria-live="polite"`, `aria-atomic="true"` region that says its text (`children`, a string) once it has held still for `delay` ms (400). Send the same text again by changing `sendId` (a counter): the line is emptied for the `delay`, then filled, so the DOM changes and a screen reader says it again. Text present when it mounts is not announced. `FilterResult` is the same line beside its visible text. |
| `GlidePlate` | The one plate that glides between a popup's rows. Render it first inside a `.basalt-menu` or `.basalt-command-list`; `navigation` lays it on a `.basalt-nav` or `.basalt-site-links`, `notifications` on `.basalt-notifications-scroll`. It is decoration, and it draws only where the stylesheet and the input allow it. |
| `useMediaQuery(query)` | Whether a media query matches, live. `false` for the server render and a hydrating page's first render. |
| `useTheme()`, `themeBootstrap` | The page's theme, on the pattern of `useLoops` and `loopsBootstrap`. See below. |
| `SiteFooter`, `SitePage` | The end of a site page (DECISIONS 146 A): `brand`, `note`, `social`, `links` (one unlabelled line of up to six) or `groups` (`{ label, links }`), a required `legal` line, and the theme choice, always. On the page at level 0 with one divider; the links are the pill link at `sm`; under 720 a group is a disclosure; one `nav` named "Footer". Put it last inside `SitePage`, a column at least `100svh` tall, so a short page keeps it at the foot. |
| `ThemeChoiceControl`, `ThemeMenu` | System, Light and Dark on `useTheme`: `ThemeChoiceControl` is a radio group in the segmented control's drawing for a footer or a settings row; `ThemeMenu` is a ghost icon button named "Theme: System" opening three radio rows, for an app with no footer. `themeBootstrap` writes `data-theme-choice` beside `data-theme`, and CSS draws the chosen word from it before any script. |
| `SiteBrand`, `SiteNav`, `SiteNavList`, `SiteNavLink`, `SiteMenu`, `SiteLockupDefs` | The parts a site's own bar and footer are built from (DECISIONS 146 C, F): the brand link (with `lockup={{ x1, x2 }}`, each drawing `{ viewBox, d }` (`lockupDrawing(file)` reads it from the text of the brand file), defined once as a `symbol`), the pill link list (`size` `md` or `sm`, `orientation`, `hang`), and the narrow menu's trigger and sheet. `SiteHeader`'s slots are `brand` (or `lockup`), `links`, `tools` and `action`; `themeToggle` is deprecated and kept for one release. |
| `useSitePhase`, `SitePhaseSlot` | A bar that arrives, or leaves and returns (DECISIONS 146 D): `useSitePhase(headerRef, { after })` reports `rest`, `between` and `pinned` from one observer on two sentinels and writes `data-phase`, `data-form` and `data-motion`; `SiteHeader` takes `phase={{ after }}` and draws its slot. |
| `LoopsToggle`, `LoopsToggleIcon`, `LOOPS_TOGGLE_NAME`, `LOOPS_TOGGLE_DESCRIPTION` | The hold on every loop, on `useLoops`: `form="icon"` (default; an icon-only ghost toggle with the core `pause` glyph, named by its `title` alone, for `SiteHeader`'s `loopsToggle` slot, first in the end cluster; import `LoopsToggleIcon` to load no `Switch`), `form="button"` (a pressed-toggle Button, `size="md"` or `"sm"`; `SiteHeader` draws it as its narrow menu's first row when `loopsToggle` is passed) or `form="switch"` (a settings row with the description "Moving art and spinners hold still. Your work keeps running."). The name is always "Pause animations" (`LOOPS_TOGGLE_NAME`); `LOOPS_TOGGLE_DESCRIPTION` is the settings row's description. |
| `PairedArt` | A stage's art in two versions, `dark` and `light` (URLs; `position`, `loading`, `width`, `height`), the page's theme choosing: the one for `[data-theme]` or `.dark` or `.light`, else the system's. Decorative (empty `alt`), never filtered. |
| `FramedArt`, `Stage` with `art`, `fit`, `anchor` | Drawn art (an inline `svg` or `canvas`) in the same frame as a picture (`art` in place of `src`), or in a `Stage` (which takes the same two): it keeps its proportions and fills the box (`fit="slice"`, the default for both; `meet` shows all of it). A drawing's own `preserveAspectRatio` stands unless a `fit` or an `anchor` is passed, held at its `anchor` (`"end floor"`), and its lines do not scale. `checkHeadroom` reads each `data-quiet` box grown by `space-1-5` (DECISIONS 146 F). |
| `Stage closing` | The closing block at a page's end (DECISIONS 162, vote 2): level 0 on `art-field`, no headroom marker and no pull-up (`headroom` has no effect), `--basalt-section-gap` above it and as its top padding, `--basalt-stage-room` (the app's) as its bottom padding (`space-16` in forced colours and print). Its art is held still: a `data-ambient` mark in it is drawn at full opacity and does not loop. Its marks keep out of its `data-quiet` zones at every width (pixels inside the top padding, not a percentage of its height); `checkHeadroom` reads a closing block with `stage: ".basalt-stage[data-closing]"` (only its zones, no headroom). At most one, at the end; the stage at the top stays the page's one. |
| `CaptionedColumns`, `CaptionedColumn` | A short head over a sentence, in columns (DECISIONS 162, vote 4): a `dl`, one `CaptionedColumn` (`head`, children) for each item. `size="large"` (the default) is the home page's list: a divider on top of each item, `space-6` above and below, the head `text-xl` at 600, `space-3`, a `text-md` sentence. `size="small"` is the captions' list: one rule over the list, `space-5` under it, `space-6` between rows, the head `text-base` at 500, `space-1`, a `text-base` sentence. `columns` (1 to 4) is the app's count for its own container; the part has no breakpoints. The gutter is `size-gutter`. |
| `AppTile` | The picture an app gives it (`src`), clipped to a superellipse of exponent 5 (no radius) with a 1px `border-hairline` that follows it (DECISIONS 162, votes 5 and 6). `size` is 20, 32, 36, 40, 44, 48 or 52; left out it is as wide as its box, square. Decorative (`aria-hidden`), always beside the company's name; flat (no shadow); not drawn in forced colours. Each tile carries its own clip. Basalt ships no company's icon file: the product gives one it has the right to show. |
| `PeriodStepper` | Two icon buttons round a label that says which stretch of time is shown (DECISIONS 162, D19b): `label`, `spokenPrefix`, `previousLabel`, `nextLabel`, `onPrevious`, `onNext`. `atStart` and `atEnd` stop a button and keep its focus (`aria-disabled`); `whole` hides both and keeps their room, for the view with no periods. The core chevrons, ghost, 32px; the label is 500, tabular, in a seat of at least 128px. The label is spoken once when it changes after mount, after it holds still for `delay` ms (400), with the prefix; the period a page arrives on is read in place, never announced. Under 640px of the app's container (`container-type: inline-size`, in a bar that wraps) it takes its own row, 52px tall with a hairline above and 44 by 44 buttons. Not `Stepper` (a short flow) and not `Pagination`. |
| `ListBand` | The count, the pager and the page size of a list, as one band above it (DECISIONS 222): `total`, `maxTotal`, `page`, `pageSize`, `pageSizes` (10, 25, 50, 100), `onPageChange`, `onPageSizeChange`, `noun` (the app's word for its rows, "Orders" or "Builds": it names the select, "Orders per page", and is said in the announcement), `sizeLabel` ("per page"). `pageSize` has no default: the app chooses where a list starts (the examples start at 25) and keeps the reader's choice where it likes. The count ("1–25 of 214") sits at the start in a seat as wide as its widest form, the `Pagination` in the centre, the page size at the end. From 720 it is sticky under the app's bar, opaque, with a divider only while stuck; when the page or size a press asked for arrives while it is stuck (however long the app takes), the scroller returns to where the band rests. `scroller` (an element or a ref) names a pane that scrolls on its own: the band sticks to that pane's top, the return to rest and Back to top use that pane, and the default is the window. A new size keeps the reader's first row in view (it calls `onPageChange` after `onPageSizeChange`). A page or size change is spoken once after 400ms by the band's own polite line; a change of `filterKey` (a search or a filter) clears it and forgets a press still waiting, while a `total` that changes by itself (a live list) clears nothing. Without `filterKey`, a change of `total` is read as a filter: give `filterKey` whenever the total can change by itself. Under 640px of its width (720 on a coarse pointer) the numbers go, and the page size follows the pager or, where the two do not fit together, is the end of a second row. The app owns the rows, the page and the filters, and returns to page 1 on a search, a filter or a sort. `children` is the list itself: it follows the band and its Back to top and is followed by the foot. Under 720, with more than one page, the band's Previous, count and Next are drawn again centred under the list (the foot, named by `footLabel`): a press changes the page, returns the scroller to where the band rests and moves focus to the band's own arrow. `heading` (an id or a ref) is what Back to top focuses; `backToTop={false}` leaves it out. `seatTotal` is the widest count the seats are drawn for before the list is read (a list from a server gives 9999, so its seats do not grow on the first answer). `rangeTotal={false}` drops "of 214" from the count, in the band and the foot, for a list whose `FilterResult` already says the total (the spoken page change still says it). `keepFootRoom` holds the foot's room under 720 at one page or none too (its arrows hidden, as `Pagination keepRoom`), so rows that arrive after the first frame move nothing under the list; opt-in, pending the council's decision on the default (DECISIONS 227 removed this empty room). |
| `PanelList`, `PanelRow` | Rows of one list in one panel (its level, one rim, radius 12, a divider between rows). A `PanelRow` is a link (`href`) or a button across its whole band: `title` (500, one line, cut), `description` (secondary, one line, cut), `leading` (a seat on the title's line: a plain `Badge`, an `Avatar`), `trailing` (a time or count, never cut) and children under the description. Hover is the wash, full bleed; focus is the ring inside at −2, following the panel's corner on the end rows. Name the list with `aria-label` or `aria-labelledby`. Not `DirectoryList`, which is a site's rimless list on the page. A child that is not a `PanelRow` is the app's own `<li>` (a `DisclosureRow` in one) and is laid across the full row; in development a child that is not an `li` is reported. |
| `SelectableList`, `SelectableItem`, `SelectionBar` | Several to choose from, outside a table. `SelectableList` takes `label`, `values` (what can be chosen now, in order), `value`/`defaultValue`/`onValueChange`, a `bar` and `barSide` (`top` or `bottom`). A `SelectableItem` (`value`, optional `label` for the box's name) is its checkbox's label, so the whole row is the target; chosen, it is the selected wash. A row whose value leaves `values` keeps its place with an empty seat. `SelectionBar` holds the all box (`allLabel`, mixed while some are chosen), the count in words (`count(chosen, total)`, "2 of 8 selected" by default; its room is held for the widest of its wordings for none, one, all but one and all, or for `widest` when the app's widest wording is another) and the actions (children); it sticks to its edge of the scroller, opaque on a divider. |
| `BackToTop` | A button that takes the scroller (the window, or the pane named by `scroller`) to the top of a long list (DECISIONS 227 and 228; `ListBand` draws one and passes its own `scroller`). It sits at the top of the screen, centred on the list, `space-2` under the bar and from 720 under the stuck band, in a dock of zero height right after the band, so it takes no room. It is drawn while the reader scrolls down once the list's top (`list`, a ref) is more than one screen of the scroller above, and it leaves when they scroll up by 8px (the position is held between the page's ends). It never leaves while it holds focus and is not drawn while a modal is open. It fades over `duration-fast` and never slides. A press goes to the top at once and focuses the `heading`. A secondary `sm` Button with the up arrow and "Back to top", with `shadow-overlay`, at every width. |
| `ambient(index)`, `AmbientMark`, `AMBIENT_MAX`, `ambientTiming(index)` | A page's one ambient loop: opacity only, in a `Stage`'s art or a framed drawing, at most 24 marks of `size-dot`. `ambient(i)` returns the props for any element (`ambientTiming(i)` is the period factor, 0.6 to 1.4, and the phase it is built from); `AmbientMark` is a `size-dot` span. Held by the hold, still under reduced motion, in forced colours and in print. |
| `Reflow`, `ReflowItem`, `REFLOW_BOUND` | A list or grid that is filtered or sorted: `order` names the ids shown, every `ReflowItem` stays mounted (an item not shown is `hidden`), and the items that stay move by transform. `fallbackFocus` is the result line focus falls back to; `onReflow` reports what moved. Past `REFLOW_BOUND` (48) items that would move on screen, a change lands at once. |
| `TimeChart`'s `entrance` | Makes a chart its page's one entrance (see `docs/motion.md`). `entranceVerdict`, `entranceSeen`, `markEntranceSeen`, `forgetEntrance` and `entranceKey` are the rule's parts (`ENTRANCE_LATE_MS`, 1000, is how late a page's script may start and still draw the figure's entrance); `entranceStep` is the stagger's step; `markPageChange()` is what a router calls when a page change without a reload begins, so the next chart's gates run from the change. |
| `travelLeg`, `travelRun`, `createTravellers`, `travelTokens`, `TRAVEL_SHORT_LEG`, `TRAVEL_LONG_LEG`, `TRAVEL_MS_PER_PX`, `TRAVEL_MIN_LEG`, `TRAVEL_RUN_LIMIT`, `TRAVEL_IN_FLIGHT` | The timing of a travel the eye follows (a leg of `duration-slower` up to 150px, 2ms a pixel above, `duration-figure` from 300px, a 200ms rest, a run inside five seconds) and its in-flight rule (one traveller a trigger; a third lands the oldest at once). The `TRAVEL_*` constants are those numbers: 150 and 300 px, 2 ms a pixel, a 100 ms shortest leg, a 5,000 ms run and 2 travellers in flight. |

**The theme.** `useTheme()` returns `{ theme, choice, setChoice, ready }`: `theme` is `"light"` or `"dark"`, what the stylesheet is showing; `choice` is `"light"`, `"dark"` or `"system"` (no stored value); `setChoice(choice)` stores it and writes `data-theme` on `<html>`; `"system"` removes the stored value. While the choice is `system` the theme follows the device's colour scheme as it changes, and a change made in another tab arrives by the `storage` event. The key is `basalt-theme` with the values `light` and `dark`: the same as the HTML skill's, so a React app and a skill page on one origin agree (anything else stored counts as `system`, as it does there). **Before the client knows the theme** (a server render, and the first render of a hydrating page) it returns `{ theme: "light", choice: "system", ready: false }`, the stylesheet's own default with no `data-theme`, so the first render is the same on both; the real values follow at once with `ready: true`. Hold back a control that would flash the wrong choice until `ready`. With storage blocked, the choice lasts for the page. Nothing runs at import: the listeners are installed by the first `useTheme()` and removed with the last. Put the head script in the document so the theme applies before the first frame, the way `loopsBootstrap` does: `<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />`, or, under a policy that forbids inline scripts, the same line as a file (`@srasyndicate/basalt/head/theme.js`; see [Use](#use)). It applies the stored choice, else the system's, exactly as the skill's head snippet does for the theme (the skill's goes on to restore the keyboard hint; this one does not). Basalt draws no toggle: the control is the app's.

## A skip link, reserved room and a page's own sticky bar

None of these changes how anything looks: each is an existing look or rule, exported.

| Export | What it is |
|---|---|
| `SkipLink` | The first thing on a page: a link past the bar and the navigation to the content. `<SkipLink target="main" />` renders `<a href="#main">Skip to content</a>`; in an app whose router makes a fragment link a history entry, give `onSkip` (or a function for `target` that finds the element when pressed) and the press is handled in place: no entry, focus moves to the target; the words are `children`, so an app in another language replaces them, and any anchor prop passes through (`target` may carry its `#`). It is unseen until it has focus. With a sticky bar (`SiteHeader`, `AppHeader` or your own `.basalt-sticky-bar`) it then hangs under the bar, space-2 below its line, on the brand's start edge at every width, so it covers nothing in the bar; without one it sits at the page's top start (space-2 in). **How it finds the bar:** when it takes focus it reads the real bottom edge of the first element matching `.basalt-site-header, .basalt-app-header, .basalt-sticky-bar` and sits space-2 below it, and reads it again on scroll and resize while it holds focus, so a bar that is not at the top of the viewport (a notice above it) is still cleared; with no script or no bar it is where the stylesheet puts it, under a bar at the top. It floats like a tooltip (level 3, the rim, `shadow-overlay`, radius 8) on the toast layer; 44px tall on a coarse pointer; not drawn in print. It is the HTML skill's `.skip-link`, drawn with the same tokens. **The app places it itself, as the first element of the page** (before the bar, so it is the first tab stop): `AppShell` and `SiteHeader` render none. Give the target `tabIndex={-1}` so following the link moves focus to it (`AppShell`: `mainProps={{ id: "main", tabIndex: -1 }}`); a target that cannot take focus starts the next Tab there instead. |
| `TimeChart`'s `lit`, `headline`, `headlineFormat`, `trend`, `plotSize`, `compact`, `lane`, `onDayActivate`, `activateHint`; `trailingMean(values, { window, min })` | The lit figure (DECISIONS 153; the implementation hasn't been reviewed). `lit`: solid marks take one vertical gradient in three neutral stops, a line one stroke in the top stop. `headline`: the frame with the picked day's number as the headline (one series), the unit beside it, one context line, no live region; its number is written in the chart's `locale` unless `headlineFormat` writes it. `trend`: `true` (7 days) or a window: the readings as small dots and their trailing mean as one straight line that breaks at a gap, one head dot, the number the trend. `plotSize="sm"` is the 96px plot. `compact` (with `kind="bar"` and `plotSize="sm"`) is the short bar plot (DECISIONS 160, the owner's choice for vote 10): no gridlines, no y labels, no gutter, the plot the figure's width; the legend, keys, table and caption stay; ignored for a line, a 240px plot or a second series. `lane` and `onDayActivate` are what `PhaseChart` is built from. `trailingMean` returns `Array<number \| null>` (no NaN for no data). |
| `PhaseChart` | A trend over weeks with a lane of one choice a week (seven days a choice; lanes of other lengths are in the backlog) and the open week's plate: `name`, `values`, `calls` (`{ word, changed?, text }`), `week`, `onWeekChange`, plus the words, all required and each a whole string, since the chart ships no word for the period: `laneLabel` ("Choose a check-in"), `previousLabel` and `nextLabel` ("Previous check-in", "Next check-in"), `callName(index)` ("Check-in 31", "Nov 3 check-in"), `statusLine(index, call)` (what the status line says of the open choice) and `activateHint` ("opens its check-in", Enter's hint in the legend), plus a `TimeChart`'s `title`, `days`, `format`, `summary`. A press on a day, or Enter, opens its week; on a phone the lane is marks with previous and next controls. |
| `ArchitectureDiagram`, `FlowchartDiagram`, `DataFlowDiagram`, `SequenceDiagram`, `SchemaDiagram` | Diagrams (DECISIONS 281 and 282; the implementation hasn't been reviewed): boxes and the lines between them, monochrome, one focal node inverted, three lines named by their look (`main`, `plain`, `dashed`) whose meaning the `legend` gives. Each takes the figure's `title`, `heading`, `source`, required `summary` and `legend`, and its own data: `nodes` placed by `col` and `row` (an architecture's `groups`, a flowchart's `shape`, a data flow's `lanes`), `edges` by node id (`fromSide`/`toSide` only to change the derived side), a sequence's `participants` and `steps`, a schema's `tables` with `references: "table.column"` on a foreign key. The array's order is the stacked order, the focus order and the list's. The drawn layout is used only where it fits; otherwise the figure is stacked, at most 480 wide. One tab stop, arrow keys between nodes, a trace on hover or keyboard focus, and "View as list". Automatic layout (`layout="auto"`, DECISIONS 306, 1.8; foundations, "Automatic layout") leaves `col` and `row` out: elkjs gives each card a column and a row, and nothing else of elk's is read. Place at build time with `placeDiagram` from `@srasyndicate/basalt/diagram-layout` and pass `placement`, and elkjs never reaches the browser; without `placement` it is loaded on demand. `actions` (`DiagramAction`: `label`, `onSelect`, and `id`, `disabled`, `inViewer`) are the app's own words-only buttons in the foot, after Basalt's controls and before "Clear highlight", in the order given, three at most by intent; each is busy on its own while its promise is answered, and `onSelect` is handed the figure it was pressed in (`figure`, `viewer`, `layout`). Their code loads only for a figure that has some. They follow the figure into the viewer's foot after "View as list": on a phone each row of actions takes 52px from the stage, and `inViewer: false` leaves one out. |
| `ChartGroup` | Charts stacked in one figure (`label` names it): the y gutter and the right margin are as wide as the widest chart's, so every plot starts and ends at the same x. Put the charts inside; each keeps its own title, legend, summary and table. |
| `ShareBar`, `shareOf(values)` | Parts of a whole as one bar: `parts` (`{ name, value }`), `size="sm"` (8px) or `"md"` (12px), `format(share, part)`. One ink, a 4px gap, each part's share (whole percents that add to 100) and name under it; a part that is more than nothing and rounds to 0 reads "<1%" (spoken "less than 1%"), and a part of nothing is left out. |
| `CoverageStrip`, `coverageWords(days)` | One cell a day (`{ date, recorded, why }`): `form="strip"` (slivers, 48px) or `"week"` (seven squares); the missing dates in words, built from the cells. |
| `MarksRow` | A row of marks in the form of the thing measured: `kind` `"columns"`, `"pills"` or `"blocks"`, `values` (`null` missing, `0` a rest day), `cap`, `label`, `height`. Drawn at rest. With a `label` it is an image whose description is its values in order (`format` writes each, `unrecordedLabel` is the word for a missing day); with none it is hidden. |
| `RangeMeter` | A reading against a plan range: `label`, `value`, `max`, `plan` `[low, high]`, `unit`. `role="meter"`; two ticks and a ringed marker from one scale. |
| `Reserve` | Room for words that change in place. `<Reserve show="saved" alternatives={{ idle: "Save", saving: "Saving…", saved: "Saved" }} />` draws every wording in one grid cell and shows the one `show` names, so the cell is as large as the largest and nothing beside it moves when the words do. The caller lists the wordings; nothing is worked out. The unseen ones are `aria-hidden` and `inert`, and `visibility: hidden`: out of the accessibility tree, not focusable, not selectable, not found by find-in-page. The wordings sit at the cell's start; `justify-items: end` on it (by `className`) puts a narrower one against the end. `alternativeClassNames` styles one wording by its key; `className` and any `span` prop pass through to the cell. A wording can be any node, so a state with an icon reserves the icon's room too. `Terminal` (its state words and its buttons) and `Meter` (its reading) are drawn with it. `MultiSelect`'s count keeps its own form (two CSS-generated sizers, no text in the DOM) because its group's description reads that element's text. |

**A linked build and elkjs.** A build that reaches Basalt through a linked folder or a workspace prints one esbuild warning, `equals-negative-zero`, from
`dist/diagram-elk.js`. That file is elkjs's own code, shipped unchanged, and the comparison is correct as written. An installed package
does not print it. To silence it, set `logOverride: { "equals-negative-zero": "silent" }` in the app's esbuild options; that silences the
same warning in the app's own code too.

**A page with its own sticky bar.** A page with `SiteHeader` or `AppHeader` gets `scrollbar-gutter: stable` and a `scroll-padding-top` of the bar plus `space-4` (`--basalt-sticky-offset` + `--basalt-space-4`: 72px with no inset), so an anchor or a focused control lands below the bar. A page that draws its own sticky bar gets the same by putting the class `basalt-sticky-bar` on it: `<header className="basalt-chrome basalt-sticky-bar">`. The offset is the one property, `--basalt-sticky-offset` (the bar's height plus the top safe area: 56 plus the inset by default); a bar of another height sets it on the root (`:root { --basalt-sticky-offset: calc(80px + env(safe-area-inset-top, 0px)); }`) and the landing follows, with the same step. The bar's own contents take a scroll margin as deep as that padding, so a Tab into the bar from a scrolled page holds the page still (the padding alone scrolls it): this applies to `SiteHeader`, `AppHeader` and `basalt-sticky-bar`. The app sidebar is not in that rule (it scrolls its own list), so its brand and first row still scroll the page a little when focused from a scrolled position.

## The phone and what is pinned

| Part | What it is |
|---|---|
| `AppShell` `foot` | A foot pinned to the bottom of the content column (a message field, an action bar) that holds still: on a short page it rests at the window's bottom, on a long page it sticks there while the page scrolls under it. Under 720 it sits on the tab bar; while an on-screen keyboard is up, on the keyboard. A solid band on `surface-page` with a divider on top, its contents on the page's width and edges; never taller than the window less what is pinned at the top and one 44px row (then it scrolls, and a `Tray` in it gives way first). With a foot the shell measures what is pinned (`usePinnedEdges`), so focus and the toast stack stay clear of it. |
| `Tray`, `TrayRow` | The rows that wait on the reader, docked where they work (above a field, at a page's head): a level-1 panel of rows from 720, each `mark`, words (they wrap, never cut) and `actions` on the first line's baseline, 40 tall (44 on touch and under 720). `label` names the region and the phone sheet's title; `summary(count)` is what the phone band says. Under 720 the rows that wait are one band (`aria-haspopup="dialog"`, `showLabel` "Show") that opens them in a bottom sheet; a `TrayRow stay` (work under way, a connection) stays a row of the tray. Focus is never lost to a row that leaves: the row now at its place takes it, and after the last the sheet closes and focus goes to `returnFocus` (the field). Not a live region: say a new row through the app's `StatusLine`. |
| `useScreenKeyboard()`, `useScreenKeyboardLayout()` | An on-screen keyboard (iOS, iPadOS, Chrome and Edge on Android) covers the window's bottom and only the visual viewport shrinks. While one is up the root has `data-screen-keyboard` and `--basalt-keyboard-inset`, `--basalt-viewport-top` and `--basalt-viewport-height`; the tab bar and the phone's status bar are covered (not drawn), and the foot, sheets, dialogs, the command menu and the toasts are laid out on what is seen. Basalt's modals, `AppShell`, `TabBar` and `ToastProvider` install it themselves; `useScreenKeyboardLayout()` installs it for an app's own fixed parts, and `useScreenKeyboard()` also returns `{ open, inset, top, height }` live. Popups anchored to a field are placed by Base UI against the visual viewport already. |
| `usePinnedEdges(enabled?)` | The measured form of what is pinned. Mark the app's own pinned element `data-pinned-edge="top"` or `"bottom"` (Basalt's bars, `ListBand`, the tab bar, the status bar with its message band, and the foot carry it; a page's own `.basalt-sticky-bar` counts as a top part without it); while a component calls this the root carries `data-pinned-measured`, `--basalt-pinned-top` and `--basalt-pinned-bottom` (the heights of what is sticky or fixed and drawn now), the scroll padding follows them (WCAG 2.4.11) and the toast stack sits above what is at the bottom. **When the scroller is an element**, the values are written on it, not the root: a sticky part counts for the box it sticks in (its nearest ancestor that clips overflow), that box gets `data-pinned-measured` and the same scroll padding, and while a keyboard is up every scroll owner (that box, or any element marked `data-scroll-owner`) carries its own `--basalt-keyboard-inset`, `--basalt-viewport-top` and `--basalt-viewport-height`. A part inside it reads `var(--basalt-pinned-top)` and the rest as its owner's, by inheritance. |

```tsx
// A support inbox: a reply field in the foot, and what waits on the agent above it.
<AppShell brand={brand} brandLabel="Desk home" sidebar={nav} header={<AppHeader title="Ticket 1042" />} tabBar={tabs}
  foot={<>
    <Tray label="Waiting on you" summary={(n) => `${n} waiting on you`} returnFocus={reply}>
      {asks.map((ask) => (
        <TrayRow key={ask.id} mark={<Badge variant="plain" status="pending">Waiting</Badge>} actions={<Button size="sm" variant="primary" onClick={() => answer(ask)}>Answer</Button>}>
          {ask.words}
        </TrayRow>
      ))}
    </Tray>
    <Input ref={reply} aria-label="Reply" />
  </>}
>
  {thread}
</AppShell>

// A build pipeline: an approval that waits, and a run that only reports, on a page with its own strip under the bar.
function Pipeline() {
  usePinnedEdges();
  return (
    <>
      <div className="run-strip" data-pinned-edge="top">Build 412 · Running</div>
      <Tray label="Needs your review" summary={(n) => `${n} to review`}>
        <TrayRow mark={<Badge variant="plain" status="pending">Approval</Badge>} actions={<Button size="sm">Review</Button>}>Deploy build 412 to production</TrayRow>
        <TrayRow stay mark={<Spinner variant="braille" />}>Build 413 is running its tests</TrayRow>
      </Tray>
    </>
  );
}
```

**Targets under 720.** Under 720 the touch sizes apply whatever the pointer: a phone-width window with a mouse draws the phone's 44px controls, rows and link boxes. Text entry stays 16px only on a coarse pointer (it is there to stop iOS zooming). A standalone `Link` keeps its line and its 44px box; its words are a label raised over its neighbours' boxes, so links stacked one per line never take each other's taps. Every `Link` now wraps its words in `<span class="basalt-link-label">`, so an app's own `a > span` rule matches it.

**The toast stack on a phone.** Under 720 the stack hangs from the bar, full width, `space-2` below its line (DECISIONS 274), moved down by a measured band under the bar and kept under the bar while a keyboard is up; toasts enter from the top and swipe away upward. From 720 it is bottom right, as before.

**A toast that echoed the page.** A toast whose only `home` is `"page"` closes when the page changes without a reload: `useRouteFocus` says so, or `useToast().pageChanged()` for an app with its own router. The only copy, and a toast with a lasting home, stay.

## Forms and tasks

```tsx
<Form<{ name: string; substrate: string }>
  onFormSubmit={(values) => saveSandbox(values)}
>
  <Fieldset legend="Sandbox details">
    <Field name="name" label="Sandbox name" error="Enter a sandbox name.">
      <Input required />
    </Field>
    <Field name="substrate" label="Substrate" error="Choose a substrate.">
      <Combobox required options={[
        { value: "docker", label: "Local Docker" },
        { value: "kubernetes", label: "Kubernetes" },
      ]} />
    </Field>
  </Fieldset>
  <Button type="submit" variant="primary">Create sandbox</Button>
</Form>
```

`Form` preserves Base UI's `errors`, validation and generic `onFormSubmit`. Field names
determine the keys. Native input constraints work alongside custom Field validation.
Buttons default to `type="button"`; submit actions must opt in. The application still
validates and persists values on its server.

`Combobox` chooses one known string value and displays its option label. `inputProps`
holds input-specific attributes. `NumberField` also accepts `inputProps`, plus Base UI's
locale and formatting props. Use distinct `thumbLabels` for range sliders:

```tsx
<Slider label="Run duration" min={0} max={60} defaultValue={[10, 30]}
  thumbLabels={["Minimum duration", "Maximum duration"]}
  getValueText={(_, value) => `${value} minutes`} />
```

`SheetContent side="right"` defaults to a right panel; `left`, `bottom` and `top` are available.
A controlled Sheet can close after a successful form submit. Use AlertDialog for a
necessary confirmation within that task; its Cancel part receives safe initial focus.
Portalled Select, Combobox, Menu and Popover content inherit the parent modal's layer.
Prefer a single focused task and avoid unnecessary nested dialogs.

## Navigation and content

```tsx
<Breadcrumbs items={[
  { label: "Sandboxes", href: "/sandboxes" },
  { label: "blacksand-api" },
]} />
<Pagination page={page} pageCount={20} onPageChange={setPage} />
<Pagination page={page} pageCount={20} hrefForPage={n => `/runs?page=${n}`} />
<Heading level={1} size="3xl">Sandboxes</Heading>
<Text tone="secondary">Start with <InlineCode>blacksand k8s run</InlineCode>.</Text>
```

Use button pagination for local results or link pagination for URL navigation. The consumer
owns fetching, loading announcements and focus after a result change. Pagination renders
a constant-sized page window and, for zero or one page, hides itself and keeps its room. Put a `ListBand` above a long list for the count and the page size.

Text supports all ten type sizes, the three weights, `tone`, `mono` and `as="p|span|div"`.
Heading's `level` follows document structure; `size` follows the visual role. EmptyState
uses a named section with an h2, description and optional actions. It does not announce an
initial empty view as an error. Avatar requires a person's name and falls back to initials: the first letters of the name's first and last words, or the app's own `initials` for a name in another order ("Doe, Jane Q" is "JD").

## Links and rows

Ported from the owner's approved site prototypes (DECISIONS 152; the implementation hasn't been reviewed by the panel).

```tsx
<BackLink href="/brands">Brands</BackLink>
<Link href="/brands" arrow="end">All brands</Link>           {/* "start" for a back arrow */}

<LinkCard href="/work/alpha" title="Alpha" titleLevel={3} media={<img src="…" alt="…" />} description="What it is." state="2026"
  style={{ "--_basalt-link-card-media-height": "240px" } as React.CSSProperties} />
<LinkTile href="/p/1" media={<img src="…" alt="…" />} brand="Maker" title="Product" details="500 g"
  foot={<><span>£12.00</span><Button size="lg">Add</Button></>} />

<DirectoryList title="Client work and other projects" shown={8} showAllLabel="Show all 30">
  <DirectoryRow href="/a" name="Alpha" description="What it is." state="2026" />
  {/* … */}
</DirectoryList>
<BigLinkList aria-label="Shop by category"><BigLinkRow href="/shop/a">Alpha goods</BigLinkRow></BigLinkList>

<Reveal rest={<MoreContent />} showLabel="Show all 12" hideLabel="Show fewer"><Start /></Reveal>
<CopyButton text="hello@example.com" variant="secondary" size="lg" statusLabel="Address copied">Copy address</CopyButton>
```

- **The arrow** is the core right arrow after a link, card or row that goes on in the site and the left arrow before a back link; a link that opens
  a new tab (`target="_blank"`) draws the new-tab arrow in its place, never both. It travels 2px on hover and focus, not under reduced motion.
- `LinkCard` and `LinkTile` are unboxed (no rim, no level). The card's media window is as tall as its content unless you set
  `--_basalt-link-card-media-height`. A tile's `foot` sits outside its link. Anchor props go on the link; a tile's `className` and `foot` go on the tile.
- `DirectoryList` is one list named by its head. With `shown`, the rows after it open in place from "Show all" (the labels are yours:
  the part does not count for you beyond the default). Keep the list 8px (`space-2`) from any clipping edge so a row's ring is whole.
  `Reveal` opens any content the same way. A keyboard open moves focus to the first new item once the opening has ended; a pointer open leaves it on the button.
- `BigLinkList` and `DirectoryRow` take a name (`aria-label`, or the head). Rows are links: there is no hover wash.
- `CopyButton` holds both words in one cell, so its width never changes; it says "Copied" for 1500ms (`COPIED_MS`) only after the write succeeded.

## Logs, status and forms

Ported from the owner's approved site prototypes (DECISIONS 162; the implementation hasn't been reviewed by the panel).

```tsx
{/* A log line: loud fields primary, the rest secondary, one weight */}
<Terminal title="Proxy" lines={[{ kind: "output", text: "denied 403", fields: ["get a.example ", { text: "denied", loud: true }] }]} />
<CommandBlock command="get a.example" status="403" refused exit={1} at={Date.now()}><LogLine fields={["blocked ", { text: "denied", loud: true }]} /></CommandBlock>
<LogSlots label="Sent" lines={[{ id: 1, fields: ["sent ", { text: "1 of 9", loud: true }] }]} widest={[["sent ", { text: "100 of 100", loud: true }]]} />

<EventLog label="Activity">
  <EventLogRule>New since you left</EventLogRule>
  <EventLine href="/a" verb="opened" object="the page" detail="from the map" time="Nov 17 9:39 AM" unread />
</EventLog>
<Listbox label="Session"><ListboxOption value="a" leading={<EventTime>09:39:11</EventTime>}><EventText verb="opened" object="the page" /></ListboxOption></Listbox>

<SourceStamp source="github" state="answered" at={Date.now()} onOpen={openRequest} />
<SourceStateWords what="the weather" state="unreachable" tried={Date.now()} why="timed out" onRetry={ask} alternative={<a href="/elsewhere">See it elsewhere</a>} />

<StatusBar start={<a href="/run">run 4f2a</a>} sources={<DrawerTrigger drawer="d" open={open} variant="ghost" size="sm">1 of 2 sources</DrawerTrigger>}
  message={message} onMessageClear={() => setMessage(null)} end={<ThemeChoiceControl />} />

<DescriptionList form="stacked"><DescriptionItem term="Hello">What it is.</DescriptionItem></DescriptionList>
<DescriptionList form="three"><DescriptionItem term="get" detail="fetch a page">a.example</DescriptionItem></DescriptionList>
<DescriptionColumns><DescriptionList>…</DescriptionList><DescriptionList>…</DescriptionList></DescriptionColumns>

<InlineFields><InlineField label="subject"><InlineInput /></InlineField><InlineField label="message" multiline><InlineTextarea /></InlineField></InlineFields>
<ActionShortcut shortcut="⌘↵"><Button type="submit">Send</Button></ActionShortcut>   // in a form dialog's foot under 720 its button is one of the two equal 44px buttons (DECISIONS 242)
<FilterToolbar label="Filter orders" search={<input aria-label="Search orders" … />} filter={[<MultiSelect label="Priority" toolbar … />, <MultiSelect label="Status" toolbar … />]} result={<FilterResult>Showing 3 of 24 orders</FilterResult>} sort={<Select aria-label="Sort" … />} />
<FilterToolbar label="Filter builds" search={<input aria-label="Search builds" … />} filter={<MultiSelect label="Branch" toolbar … />} result={<FilterResult>Showing 12 of 380 builds</FilterResult>} />

// A paged list in the window, and the same band in a pane that scrolls on its own (the app owns `page`, `pageSize` and the filters; 25 is where these lists start, not a default).
<ListBand noun="Orders" total={shown.length} maxTotal={all.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} filterKey={query + "|" + status} heading="orders-title" footLabel="Order pages, end of list"><OrderRows rows={rows} /></ListBand>
<div ref={pane} style={{ overflow: "auto", height: "100%" }}>
  <ListBand scroller={pane} noun="Builds" total={builds.total} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} filterKey={branch}><BuildTable rows={rows} /></ListBand>
</div>

useRouteFocus({ key: path, title: "Shop | Castle", target: titleRef, fromControl });   // <AppHeader titleRef={titleRef} …/>; scroll={false} for a page that keeps its place
useFocusNet(titleRef);   // opt-in: a removed control's lost focus lands on the title
const { shortcuts, keyshortcuts } = useShortcuts([{ key: "j", description: "Next", run: next }]);   // the help dialog draws <ShortcutList shortcuts={shortcuts} /> and <SingleKeysSwitch />
<Countdown to={opens} done="Open" /> <Clock timeZone="America/Chicago" /> <DateAge time={t} short />
```

- `StatusBar` clears a message after `STATUS_MESSAGE_MS` (5000) only when its `logged` is true; any other message stays until replaced or cleared with Esc. A page has one foot: do not use it with `TabBar`.
- `useShortcuts` binds single keys only; the choice to turn them off is `useSingleKeys` (`basalt-keys`). Give the help dialog a visible opener that is not a single key. No binding runs from a key pressed inside a dialog, sheet, popover, the command menu, a menu or a listbox; back on the page they run. `isOverlayOpen()` says whether a popup is open and drawn, for an app that asks too. `useShortcutsVisible()` and `isHardwareKey(event)` are the fact Basalt keeps for its chips (a hardware key has been pressed, or the device can hover), for an app that must not focus a field on a touch screen with no keyboard.
- `useNow`, `Clock` and `Countdown` share one lazy timer and hold under `data-loops="held"`. `formatAge` is for beside a date; never in a `Stat`.
- Smaller parts: `LogFields` (the runs of a line) and `LogLine` (one line alone) draw the one log-line look; `LogSummary` is a four-line summary in a `pre`; `InlineValue` is a row that is a label and a value, not a field. A `CommandBlock`'s head sticks under a bar set with `--_basalt-block-top`.
- The formatters draw nothing: `formatStamp` ("14:49:07", to the second and always 24-hour), `formatClock` ("2:49 PM" in `en-US`, "14:49" in `en-GB`: a clock a person reads follows the locale, with a numeric hour), `formatDay` ("Nov 1"), `formatCountdown` ("18d 09:10:51", `null` once passed) and `formatAge`, each with its machine `dateTime` (ISO), the zone an argument and the `locale` too (default `en-US`, never the runtime's, so a server's render and the browser's agree). `Clock`, `Stat`, `SourceStamp`, `SourceStateWords` and `CommandBlock` take `locale` as well, and `EventLog` for the width its time column reserves.
- `SourceStamp`'s name and time are the app's: Basalt ships no source's icon or name. Its `datetime` is the instant in UTC (`toISOString`), the drawn clock the zone's; `timeZoneName` (`"short"`, `"shortOffset"` or another of `Intl.DateTimeFormat`'s styles, the `TimeZoneNameStyle` type) writes the zone's name inside its `time`, so it is in the stamp's accessible name ("github 18:52:07 CST").

## The conversation stream

A support thread, a team chat, a document's comments, an assistant's answer, a build's history: one column of entries, oldest first (the
no-council path, DECISIONS 226 and 265; `docs/foundations.md`, "The conversation stream"). Basalt draws; the app owns the data, what joins,
the words, and following the end.

```tsx
import { ActivityList, ActivityStep, DisclosureRow, EventLogRule, Presence, Stream, StreamArrivedWord, StreamEntry, StreamMessage, StreamNote, StreamQuote } from "@srasyndicate/basalt";

<Stream label="Ticket 4821">
  <EventLogRule>Today</EventLogRule>
  <StreamNote mark={<Icon icon={TagIcon} size={16} />} time="4:13 PM">Assigned to Ada Brooks</StreamNote>
  <StreamMessage author="Jules Ferreira" time="4:12 PM" dateTime="2026-11-18T16:12">Exporting invoices gives me an empty file.</StreamMessage>
  <StreamMessage author="Jules Ferreira" time="4:13 PM" joined>Since yesterday.</StreamMessage>   {/* the app decides what joins */}
  <StreamMessage author="Ada Brooks" time="4:20 PM" meta={<Presence status="away" since={awayAt} />}
    arrived={openedFrom === "notice"} arrivedLabel="From your notice" onArrivedEnd={clearArrival}>
    <StreamQuote cite="Jules Ferreira asked">Why is my export empty?</StreamQuote>
    <p>Which date range did you choose?</p>
  </StreamMessage>
  <StreamEntry panel arrived={linked}>   {/* a panel: its own fill takes the wash; the app puts the word in its head */}
    <Card><CardHeader><CardTitle>Suggested edit</CardTitle><StreamArrivedWord /></CardHeader>…</Card>
  </StreamEntry>
</Stream>

<DisclosureRow mark={<Icon icon={MagnifyingGlassIcon} size={16} />} title="Searched the help center" meta="0.8 s">…the detail…</DisclosureRow>

<ActivityList label="Build 1287">
  <ActivityStep status="done" meta="12 s">Installed 214 packages</ActivityStep>
  <ActivityStep status="failed" meta="48 s" detail={<LogLine fields={["Expected 1,204.50"]} />}>3 of 412 unit tests failed</ActivityStep>
  <ActivityStep status="running">Building the web app</ActivityStep>
</ActivityList>
```

| Export | What it does |
|---|---|
| `Stream` | The ordered list (`label`). Not a live region, and it does not follow its end: follow the end only while the reader is at it, and say what must be heard through `StatusLine`. |
| `StreamMessage` | `author`, `time` (the app's words), `dateTime`, `avatar` (default an `Avatar` at 32, hidden from assistive technology), `joined` (no avatar or head drawn; the name and time are said), `meta` (after the time), `actions` (end of the head), `children`. |
| `StreamNote` | A quieter row: a sentence in secondary at 13, `time`, and an optional `mark` (an icon at 16) in the gutter. |
| `StreamQuote` | The other side of an exchange: `cite` (the app's words: "Dana asked", "Replying to Sam"), `time`, the words. A fill one step from its ground, no rim. |
| `StreamEntry`, `StreamBlock` | An entry of the app's own (a card, an update; `bleed` to span the gutter) and a part of a message that can be the one arrived on its own (its message's head says the block's word; in a joined message the block draws it above itself). `panel` when it holds a panel. |
| `arrived`, `arrivedLabel`, `onArrivedEnd` | On every entry and block: scrolled to, focused (no ring), a plate in the selected wash and a word ("Linked" by default) until the reader presses or types (keys that scroll don't count); then it fades and nothing moves. One entry at a time: a new arrival ends the one before (calling its `onArrivedEnd`). An entry in a hidden pane waits until it is shown. Nothing happens inside a `LoadingShape`. |
| `StreamArrivedWord` | The word, for a panel entry's own head. |
| `DisclosureRow` | One line that opens to its detail: `title`, `mark`, `meta`, `wrap`, `open`/`defaultOpen`/`onOpenChange`, `hiddenUntilFound`. Base UI's Collapsible. |
| `ActivityList`, `ActivityStep` | A sentence a step: `status` (`running`, `done`, `failed`, `waiting`), `word`, `meta`, `detail` (then the step is a disclosure row). |
| `Presence`, `Elapsed`, `formatElapsed` | "Away 6 min": `status` (`active`, `away`, `offline`), `label`, `since`, `now`, `format`, `variant` (`plain` or `outline`). `Elapsed` is the length alone after any word; `formatElapsed` writes it (plain, safe on a server). |

## Stages and runs

A run's stages, its steps and its one voice (DECISIONS 316; `docs/foundations.md`, "Stages and runs"). Seven states: `queued`, `running`, `success`,
`failed`, `skipped`, `canceled`, `retrying`. The state's word always carries the state; the mark never does alone. Basalt draws; the app owns the run.

| Part | Notes |
|---|---|
| `StageMark` | One mark a state at 16, 20 or 24, `aria-hidden`, in a seat that never changes size: queued a circle that breathes by opacity, running and retrying the ring, passed `CheckCircle`, failed `XCircle` in danger, skipped `MinusCircle`, canceled `Prohibit`. A change of state crossfades in the one seat. |
| `STAGE_WORDS`, `formatRunTime(ms)` | The default word for each state, US English ("Queued", "Running", "Passed", "Failed", "Skipped", "Canceled", "Retrying"); the app may change any. `formatRunTime` returns `{ text, dateTime }`: "12.3 s" (tenths, cut and never rounded up), "12 min 34 s", "12 hr 34 min", with its ISO 8601 duration. Plain values a Server Component can read. |
| `RunTimer` | A run's time: tabular Geist Mono at `text-xs`, tertiary, a `time` element, never a live region. `start`, `end` (frozen at `end - start`), `carried` (earlier attempts, so a retry counts on), `since`, and `scale` (`seconds`, `minutes`, `hours`: the longest form its seat holds, so the column never moves). `format` writes the length for the eye (the seat follows it); `spoken` says it for the ear (the timer redraws when either changes) ("3m 4s" read "3 minutes 4 seconds"): given, the drawn figure is hidden from assistive technology and the spoken words are read once in its place, never live, with `datetime` still the ISO duration. Both apply to the duration only; the held and started-at forms are unchanged. |
| `StageBadge` | A `Badge` bound to the seven states: `state`, `words`, `variant` (`outline` in a run's head, `plain` in a list or table), `size`. Its seat is as wide as its widest face, so a change in place moves nothing. |
| `StageList`, `StageRail`, `RunStage` | The same `RunStage` data drawn as a list (`label`, `timeScale`, `reserveDetail` to hold a failure's room from the first frame) or as a rail (`timeScale="minutes"` draws a time under a minute in whole seconds, "45 s", its `datetime` still to the tenth) of two to six nodes on one line (five or six from 480 of its own width, drawn as the list under it). A `RunStage` is `name`, `state`, `word`, `meta`, its times (with `format` and `spoken`, forwarded to its one `RunTimer`, as `RunStep` takes them), and a `detail` with an action (a failure's reason and Retry) that opens under a list's stage; focus is never dropped when it closes. |
| `RunTimeline`, `RunStep` | A run's own view: an append-only list of steps, a sentence each (`state` or `mark`, `word`, `meta`, times, `detail`, `action`). The newest `keep` steps stay in full; older finished steps roll into a tail that recedes a step a row, with a toggle above it that opens the whole record at full ink (`open`, `defaultOpen`, `onOpenChange`, `toggleLabel`). It follows new steps only while the reader is at its end. Nothing in it speaks. |
| `RunAnnouncer` | A run's one voice: a visually hidden polite `role="log"`, additions only: `label` and `events` (append-only, each `{ id, text }`). Each event is said once, in order; an `id` already said is quiet, and events present at mount are not said. Never `role="alert"`; it draws nothing. |

## Versions and release notes

A version is SemVer with its ship date, one link to the release notes (DECISIONS 320; `docs/foundations.md`, "Versions and release notes"). Nothing
marks a release as new, and there is no "What's new" item.

| Part | Notes |
|---|---|
| `VersionLink` | "Version 1.4.0 · Nov 23, 2026" as one link: `version`, `date` (an ISO calendar date, never moved by a time zone), `href` ("/release-notes#v1.4.0"), `label` (default "Version"; a site's footer gives the product), `destinationLabel`, `current` (on the release notes: the number at 600, its width reserved), `locale`. Its place sets its form: the sidebar's foot, the number alone in the rail, the last row of More's sheet, after the legal line in a footer. |
| `ReleaseNotes` | A page of releases from their records: `releases`, `form` (`reference`, a package's changelog with its list open; `notes`, a product's, audience paragraphs first and the list in one fold), `product`, `running` and `runningBuild` (the release this session runs carries "Your version" and Build details), `baseHref`, `headingLevel`, `arrived` and `onArrivedEnd`, `words` (the page's fixed words, for another language), `locale`. Counts, order, folds and the "Action needed" callout come from the record. |
| `ReleaseIndex` | The versions as a `nav` ("Versions"): `releases`, `form` (`pane` for `PaneLayout`'s pane, `fold` for a closed fold above the first release where the pane is not beside the page), `label`, `unreleasedLabel`, `locale`. A page draws both forms; each shows only where it belongs. |

## Writing to someone

The composer, the mention and the mention picker (cimip-gaps-2, B3; decided and built by Opus on the no-council path, not yet reviewed). See foundations, "Writing to
someone".

```tsx
{/* A support inbox: Enter sends, Shift+Enter is a new line; the send waits for the server and keeps the words if it is refused */}
<Composer
  label="Reply to the customer"
  placeholder="Reply to the customer. Type @ to bring someone in."
  actions={<Button variant="ghost" size="sm" onClick={attach}>Attach</Button>}
  status={typingStatus(typingNames)}   // spoken while the field has focus; statusLive="always" or "off" to change that
  onSend={(text) => api.reply(ticket, text)}
  mentions={(field) => <MentionPicker field={field} options={[{ label: "Ana Ruiz", value: "u1", description: "Support lead", group: "People" }, { label: "billing", value: "t1", description: "Team of 4", group: "Teams" }]} onPick={(o) => picked.add(o.value)} />}
/>

{/* A build's comments: Mod+Enter sends (⌘↵ or Ctrl Enter, shown beside Send) */}
<Composer label="Comment on the build" sendKey="Mod+Enter" onSend={comment} />

{/* In the stream: a mention, and one that calls on the reader (on the plate) */}
<p>Thanks <Mention>Ana Ruiz</Mention>; <Mention you>Lee Park</Mention>, can you look? Routed to <Mention trigger="#">billing</Mention>.</p>

{/* An app's own text field with the picker: its handlers see defaultPrevented on a key the picker used */}
<MentionPicker field={ref} options={people} filter={null} onQueryChange={lookUp} />
```

An app's own list draws its active row with the plate Basalt's popups use: `background: var(--basalt-plate)` follows the level the row sits in, and the tokens
`--basalt-plate-0` to `--basalt-plate-3` are each level's.

## Loading in the page's own shape

A region whose data is on its way draws its own parts, and what isn't known is painted as bones measured from the drawing (DECISIONS 247, 248, 249b and 258;
`docs/foundations.md`, "Loading in the page's own shape").

```tsx
import { LoadingShape, Refreshing, fillIn, standIn, useRefreshing, useStaged } from "@srasyndicate/basalt";
import type { StandInVariant } from "@srasyndicate/basalt";

// Stand-ins take values from a different set in each variant, with the same rows and branches.
const standInOrder = (variant: StandInVariant) => ({ customer: standIn(2, 14, variant), placed: variant === 0 ? "Nov 3" : "Dec 14", items: variant === 0 ? 3 : 4, note: null });
const standInDocument = (variant: StandInVariant) => ({ title: standIn(5, 28, variant), editors: variant === 0 ? ["a", "b"] : ["a", "b", "c"], updated: new Date(variant === 0 ? 0 : 1) });

// Something known: the known fields are drawn as themselves at once, and only what the two drawings disagree on is a bone.
// `fillIn` merges plain records only: a Date or an array is taken whole. Leave a field out (or `undefined`) when it is unknown; `null` says it is known to be empty.
<LoadingShape loading={!order} refreshing={fetchingAgain} label="Loading the order"
  prefill={(variant) => <OrderFacts order={fillIn({ id: orderId, note: null }, standInOrder(variant))} />}>
  {() => <OrderFacts order={order!} />}
</LoadingShape>
<LoadingShape loading={!doc} label="Loading the document"
  prefill={(variant) => <DocumentHead doc={fillIn({ title: cachedTitle }, standInDocument(variant))} />}>
  {() => <DocumentHead doc={doc!} />}
</LoadingShape>

// Nothing known: every word a bone but the known ones (a table's heads, the names of tabs, `data-bone="keep"`).
<LoadingShape loading={!rows} shape={() => <Rows rows={standInRows} />}>{() => <Rows rows={rows!} />}</LoadingShape>

// Phases: parts arriving within 250ms of the page's start land together; later ones within 120ms of each other. Let a region wait for every part it reads.
const landed = useStaged({ people: Boolean(people), stream: Boolean(stream) });

// A last copy being fetched again stays content; the mark shows after a second, in a seat kept for it.
<Refreshing on={useRefreshing(fetchingAgain)} compact={phone} />
```

| Export | What it does |
|---|---|
| `LoadingShape` | `loading`, `shape` or `prefill(variant)`, `children` (a function is called only once loaded), `refreshing`, `label` (said once for the page, default "Loading"), `showAfter` (300), `minShown` (400), `keep` (`KEEP`). `aria-busy` while loading; the shape is `aria-hidden` and `inert`, and the ids of what it draws move to `data-shape-id` so `getElementById` never finds the shape's copy. A text query in a test can skip it with `.basalt-bones`. |
| `Bones` | The painting alone (`shown`, `keep`, `twin`), for a place a region can't wrap. |
| `useStaged(ready, gap = 120, together = 250)` | Releases parts in phases. |
| `useRefreshing(on, after = 1000)`, `Refreshing` | "Updating" for a refresh that takes more than a second: braille and its word, or the ring alone with `compact`. |
| `useShapePhase(loading, showAfter, minShown)` | The timing alone: `"waiting"`, `"shown"`, `"content"`. |
| `useInShape()` | 0 outside a shape, 1 in a drawn shape (a part that writes does nothing), 2 in the twin (a portal draws nothing). |
| `PageWait` | A page whose code is still loading: nothing for 300ms, then the 20px ring, its label said once. |
| `fillIn`, `standIn`, `rememberCount`, `rememberedCount`, `forgetCount`, `KEEP` | Plain helpers, safe on a server, that persist nothing on their own: the stand-in merged with what is known (plain records only; `undefined` is unknown, `null` known-empty), stand-in words (neutral everyday words, only ever measured), a list's last count (the count and nothing else, under `basalt-shape:<key>`) and the known-words selector. The count is the app's data, so the app says where it lives: `rememberCount(key, n, store)` with a `CountStore` (anything with `getItem` and `setItem`: `sessionStorage`, a store scoped to the signed-in account and cleared at sign-out, or the app's cache; a function `() => sessionStorage` is read inside a `try`, so blocked storage reads as none). With no store a count lasts only as long as the page in a browser, and is not kept at all on a server (one module serves every request). `forgetCount` on a store with no `removeItem` leaves an empty mark that reads as none. **Migrating:** to keep the counts an earlier Basalt wrote (`basalt-shape:<key>` in `localStorage`), pass `() => localStorage` to both `rememberCount` and `rememberedCount`, and scope the key to the signed-in user if it may be someone else's next. `fillIn` used to read a `null` field as unknown: replace that `null` with leaving the field out (or `undefined`), and declare a field nullable (`note: string | null`) where empty is real. A known value of another kind than its stand-in (a record over a `Date`) keeps the stand-in, and `DeepPartial` takes a `Date`, a `Map`, an array or any other built-in whole. |
| `holdFirstPaint(root, max = 250)`, `markPageStart()` | The reload rule: one paint when the data is quick, and the page's clock. |

**A client-rendered app and its router.** Hold the first paint in the entry, and tell the clock when a move begins:

```tsx
const root = document.getElementById("app")!;
holdFirstPaint(root);                 // before the first render: a reload whose data comes in 250ms paints once
createRoot(root).render(<App />);

// In the router, when a move between pages begins (back and forward too). `markPageChange` is the same call.
markPageStart();
// Gate the move on the next page's code: keep the page on screen until its module is here, then draw the new page. Never draw a lazy
// fallback in its place. `PageWait` is only for a reload (or a cold first move) whose page code is late.
await preload(nextPath);
```

Preloading, how long a last copy is kept and what is forgotten at sign-out are the app's integration choices (its router and its data layer), not Basalt's: the lines above are one way to wire them. A tab switch is not a move between pages: call nothing. The panel left goes at once and the new panel's regions count their 300ms from the switch; put
everything the panel knows (a description) in its first paint, and what it doesn't as bones in their seats. A server-rendered shape has no bones until
hydration. The HTML skill has no loading shape.

## Code

```tsx
<CodeBlock
  language="typescript"
  title="routes.ts"
  code={'const route = "api.anthropic.com";'}
/>
```

Shiki's editor grammars support shell (`bash`, `sh`, `shell`), CSS, HTML, JavaScript (`js`),
JSON, JSX, Python (`py`), SQL, Swift, TSX, TypeScript (`ts`) and YAML (`yml`). Set `language`
explicitly: the title is a label. Without one, or with an unsupported language, code stays
plain. Logs over 100,000 UTF-16 code units also stay plain to keep long logs responsive. In a browser's own render, code over 10,000 code units is coloured once its plain text has painted, not inside the render that
mounts it. Shorter code is coloured in the render, as is any block up to the cap in server rendering and static markup whose language
was preloaded (`preloadCodeLanguages`); a page that hydrates that markup keeps those colours from its first frame.

Colours come from the `syntax-*` tokens and follow the theme, including nested overrides.
Every syntax colour meets AA on the code surface in both themes. Source text is never
interpreted as HTML. Server rendering and offline walkthroughs use the same grammars.

## Long lists

A `Table` renders every row it is given, and `Select`, `Combobox`, `CommandMenu` and a `MultiSelect` checklist mount every item
when they open. None of them draws only what is in view: find-in-page and a screen reader meet every row and item, as they should.
So the length of the list is the app's to bound. Measured in Chrome on an Apple M3 Max with the CPU slowed four times (the usual
stand-in for a mid-range phone), against the 200 ms that Core Web Vitals calls a good response:

- **A table of runs** (seven columns, a checkbox in each row, sortable headings, a filter field; the audit's harness). Measured at 100,
  1,000 and 5,000 rows, in milliseconds (Event Timing, median of 5; the 1-minute load was 3 to 5 at 100 and 1,000 rows): ticking one row
  48, 216 and 848; filtering by one key 56, 624 and 29,320; sorting 104, 1,720 and 49,504; selecting all 96, 640 and 2,736. When the
  app keeps each row's props and children the same between renders (`TableRow`, `TableRowHead` and `TableCell` are memoised, so an
  unchanged row is not rendered again) ticking is 32, 72 and 296, filtering 32, 544 and 38,680, sorting 80, 1,632 and 82,080 and selecting
  all 96, 592 and 2,672. At 5,000 rows the load was 4 to 11 and not under 8 in every run (ticking 9.4, selecting all 10.4, sorting with
  stable rows 7.4, filtering 5.7 and, with stable rows, 6.4), so those five figures are a guide to the size and not exact. Sorting and filtering are the slow
  ones here: they cost 3 to 8 times what a tick does at 1,000 rows, and a stable row does not help them (a sort moves every row). Estimated,
  from a straight line between the nearest measured sizes and so not measured: ticking crosses 200 ms at about 900 rows (about 3,000 with
  stable rows), selecting all at about 300, filtering at about 300 (about 400 with stable rows) and sorting at about 150 (about 170).
  Page a table that can grow past a few hundred rows with `Pagination`, and keep each page's rows stable.
- **`Select`, `Combobox` and `CommandMenu`** open in 85 to 110 ms with 30 items and 270 to 310 ms with 1,000, a cost that grows with
  the count (measured at 30 and 1,000 items; between them it is close to a straight line, which puts 200 ms at about 500 items).
  Open comfortably up to a few hundred items. Past that, search on the server and send the first matches (and say how many more
  there are), or show a shorter list.
- **A `MultiSelect` checklist** opens in 640 ms with 1,000 options and a tick takes 470 ms. The highlight following the pointer is
  cheap at any length; opening and ticking are not. A few hundred options is the comfortable limit.

A control's hidden form input is a layer of its own in Chrome when Base UI fixes it to the viewport. `Checkbox`, `Switch`, `Radio`,
`Select`, `Combobox`, `NumberField`, `SwitchRow`, `OptionChips` and the chips of `MultiSelect` mark their own input (through `inputRef`) and the
stylesheet makes that input absolute at its place in the flow, so a table with a checkbox in each of 1,000 rows is 5 layers, not 1,000. The mark is set
by the browser's script, so a server-rendered page keeps Base UI's styles until it hydrates. The rows of an open `MultiSelect` checklist are not marked (it
would change the popup's corner pixels), so a checklist of 1,000 options still has a layer a row.

These are the numbers on the day they were measured (the 1-minute load was 3 to 11, as said above), not a promise; they tell an app where to start
paging. `docs/foundations.md` states no list-length budget.

## Test

```sh
npm test
```

Typechecks, builds, then runs the browser tests on a demo page (`test/demo.tsx`: most of the
components, not all; the rest are driven by fixtures in their own tests) in both themes:

- axe-core's WCAG 2.0 to 2.2 A and AA rules find no violation on the states the tests open: the demo at rest, with the menu and the dialog open, and each part's own fixtures. That is what the tests prove: axe's rules on those states, and not a claim that no success criterion fails anywhere;
- menus, dialogs, tabs, the segmented control, choices, select and the command menu work
  from the keyboard, and Esc returns focus to where it came from;
- focus shows as a 2px outline in the focus colour;
- the page doesn't scroll sideways at phone width.
- density works across the full size scale and portalled menus, and touch keeps its target
  sizes even in compact mode.
- required form values, combobox search/empty/disabled states, number bounds, slider thumbs,
  safe confirmation focus, sheet layering, menu choices and navigation behave as composed;
- forced colours retain structural control boundaries and selection cues.

Base UI's editable combobox temporarily hides siblings from assistive technology while its
popup is open. The open-widget audit covers the input and popup, then verifies Tab closes
the popup before focus rests outside and runs the full-page audit. Other global axe rules
remain enabled; only the library's transient focus guards are excluded.
The submenu audit likewise covers its active menus while they intentionally cover page
targets, then audits the full page after dismissal.

The tests use the Playwright version pinned in `package.json` and its Chromium.
