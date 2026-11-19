# @srasyndicate/basalt

Basalt's React components: [Base UI](https://base-ui.com) primitives for behaviour and
accessibility, styled with Basalt tokens, with its own core icon set and [Phosphor](https://phosphoricons.com) for the long tail.

## Use

```tsx
import "@srasyndicate/basalt/fonts.css"; // Geist Sans and Mono (SIL OFL 1.1)
import "@srasyndicate/basalt/styles.css"; // tokens + components

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

Styles sit in `@layer basalt`, so an app's own CSS overrides them without `!important`.
Every component takes `className`; Base UI parts also accept a function of their state.
Every module that draws a component or holds state declares `"use client"` for React Server
Component consumers, and the package entry itself does not: what is neither a component nor a hook
(`formatStamp` and the other formatters, `CONFIRM_MS` and the other constants, `themeBootstrap`,
`loopsBootstrap`, `preloadCodeLanguages`, `shareOf`, `trailingMean`, `ambient`, the entrance and travel
helpers) is plain code that a Server Component can call and read. Import the styles and font sheet
once in your application's root layout.

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

**Browsers.** The floor is Chrome 123, Safari 17.5 and Firefox 121 (the owner's decision, DECISIONS 140). `light-dark()` sets Chrome's and
Safari's number and `:has()` sets Firefox's; `docs/foundations.md` (Browser support) has the full list and the three known uses above it, and
`test/browser-floor.test.mjs` fails when the built CSS uses a feature past the floor. The opaque header under reduced transparency is drawn
only where `prefers-reduced-transparency` is evaluated (Chromium 118 and later); in Safari and Firefox the header stays smoked.

## Components

| Component | Notes |
|---|---|
| `Button`, `IconButton` | `primary`, `secondary`, `ghost`, `danger`, `outline` (transparent, an input-boundary edge, primary ink; never a toggle); sizes `xs`–`xl` (24–40px) and `2xl` (44), `3xl` (48), `4xl` (52), `5xl` (56): radius 8, 16px, and 600 where there is text; compact steps each down one. `IconButton` requires `label`. Props on `Button`: `fullWidth` (as wide as its space); `amount` with `amountReserve` (a quieter amount after the label, in a seat as wide as the widest, so nothing moves; 0.72 ink on primary, secondary and outline, full ink on ghost and danger); `count` (an outlined pill that holds two digits, `aria-hidden`: put the count in the button's name); `note` (a second line under the label, at least 64 tall, one line in a container 340 to 480 wide: give the container `container-type: inline-size`). On `IconButton`: `done` (the plus becomes a check in the button's own ink, in one seat, a 100ms crossfade even under reduced motion; the name does not change, so say what happened in a `StatusLine`) with `doneIcon`. `useConfirm()` returns `[confirmed, confirm]` and holds for `CONFIRM_MS` (1500). |
| `TextButton` | A button that reads as running text: no box, the text's font, underlined as `Link` is; `quiet` is secondary ink; `iconEnd` is not underlined. No pressed state (a choice between two is a `SegmentedControl`). On touch a button on its own line has a 44px hit box and no layout change; one in a sentence keeps its line. |
| `SwitchRowGroup`, `SwitchRow` | One checkbox drawn as a row: `tile` (36px, 32 under 720 wide, decorative), `kind`, and the name as `children`; a plus and a check cross over in a 16px seat. 52 tall from 720 wide, 48 under. Name the group with `aria-labelledby` and describe it; it is not a filter (no count or Clear), and one `FilterResult` says what it did. |
| `OptionChips` | One of many, eight at most, as wrapping chips with no track: a fieldset with `legend`, `options` of `{ value, label, unavailable? }`, a round 16px seat on every chip. `unavailable` is the words ("sold out at the brand"): the disabled look, reachable, never chosen. Above eight values use a `Select`. |
| `Field`, `Input` | A visible label always; description and error are linked to the control. `required` shows "Required" directly after the label (tertiary, `text-xs`, hidden from assistive technology) and the `Input` inside carries `required`; `optional` shows "Optional"; a field marked neither shows nothing. Never an asterisk. |
| `Form`, `Fieldset` | Validated submission of named fields; a visible legend and group disabling. |
| `Combobox` | Search a single selection from `{ value, label, disabled? }` options; labelled by Field. |
| `NumberField` | Locale-aware number entry; min, max, step, format and bounded increment/decrement. |
| `Slider` | Required `label`; scalar or range; `thumbLabels` and `getValueText` for meaningful spoken values. |
| `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuGroup`, `MenuGroupLabel`, `MenuSeparator` | Items take `icon`, `shortcut`, `danger`. |
| `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem`, `MenuSubmenu`, `MenuSubmenuTrigger` | Persistent settings and nested actions, with state marks and keyboard navigation. |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogActions`, `DialogClose` | Focus is trapped; Esc closes; focus returns to the trigger. `DialogContent size="wide"` is a reference dialog's width (992px, decided in DECISIONS 158 Q1: 118 characters of Geist Mono at 14px rounded up, kept in px; capped by the viewport) and its first focus is its title, so Enter on opening runs nothing. A title takes `tabIndex={-1}` and draws no ring. |
| `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogActions`, `AlertDialogCancel`, `AlertDialogAction` | Explicit confirmation; cancel receives initial focus, outside clicks do not dismiss. |
| `Sheet`, `SheetTrigger`, `SheetContent`, `SheetTitle`, `SheetDescription`, `SheetActions`, `SheetClose` | Dialog behaviour in a right, left, bottom or top panel. `SheetActions` stays pinned to the foot when it is the last child of `SheetContent`, or of a `Form` placed directly in it. |
| `SheetHeader`, `SheetBody`, `SheetFooter` | A sheet's anatomy: a head band (`SheetTitle` 20/28, a `SheetDescription` count, and with `closeLabel` a 44px close), a body that scrolls (while it overflows and holds nothing focusable it is a keyboard stop, a region named by the sheet's title, with the ring; there is no `tabIndex` to add) and a foot on a divider; the sheet then has no padding of its own and the head and foot keep the safe areas. `SheetContent step="cart"` is the step the sheet shows: when it changes, focus moves to this sheet's title and the body scrolls to its top, so the new title is read out; you swap the body and foot. |
| `Drawer`, `DrawerSection`, `DrawerTrigger` | A panel docked in the flow under a page's column, with two titled halves: no portal, scrim, level reset, motion, shadow, fill or corner, and a divider along its top. `label` names it; `rows` sets its height from 720 in 24px rows (13); `open={false}` hides it and leaves it in the document; `onBack` draws a Back button under 720, where it is a page of its own. `DrawerSection` takes `title` and `actions` and scrolls its body (while the body overflows and holds nothing focusable it is a keyboard stop, a region named by the title, with the ring); `DrawerTrigger` says which drawer it controls (`drawer`) and whether it is open (`open`). It takes no focus when it opens: the app moves it. **On a phone** the open drawer replaces the record: the component stacks the halves on a divider and draws Back (`onBack`); the app hides the record while the drawer is open (`hidden`, so it leaves the accessibility tree too) and, in `onBack`, closes the drawer, shows the record and moves focus to the `DrawerTrigger`. `columns` sets the halves' widths (a `grid-template-columns` value). |
| `Tabs`, `TabsList`, `Tab`, `TabsPanel`, `TabsPanels` | For panels of one view. `size` is `lg` (36), `3xl` (48) or `5xl` (56, 48 in a container under 640). `<TabsPanels stacked>` keeps every panel mounted in one grid cell so the view is as tall as its tallest panel and a change of tab moves nothing under it (hidden panels are `visibility: hidden` and inert; it turns off under 640 wide). |
| `LinkTabs`, `LinkTab` | Tabs that are links: a `nav` with `aria-label`, each `LinkTab` an `a` with `current` (`aria-current="page"` and a static 2px underline; `render` takes a router's link). The current link's label is 600 in primary ink and a resting one 400 in secondary, every label reserving its 600 width, so choosing a page moves nothing. Not a `tablist`. `size` as `Tabs`. **Under 720 wide the row is a `Select` of the same links** (both in the markup, chosen by CSS, so nothing moves on load; one is exposed at a time): it says where choosing goes (DECISIONS 158: a "Go to" label, `goToLabel`, before the current page's name, in the visible label and the accessible name), its value is the current link's `href`, and **only a choice from the open list navigates** (a click, or Enter on the highlighted option; a typed letter or any key on the closed `Select` does not). Navigating calls `onNavigate(href)` (an app's router; focus stays on the `Select`) or else `window.location.assign(href)` (a new page loads and focus starts over there). `Select` takes `valuePrefix`, a label before the value inside the trigger, secondary ink, one line, read as part of the name. |
| `SegmentedControl`, `Segment` | One choice that filters the current view; never empty. |
| `Breadcrumbs`, `Pagination`, `Link` | Location, bounded page windows and native destination links. On a coarse pointer a `Link` on a line of its own has a 44 by 44 hit box (a pseudo-element widens a short link; its line and look do not change), and a link in a sentence keeps its line. A known limit: two standalone links on neighbouring lines less than 24px apart have hit boxes that overlap there. |
| `SocialLinks`, `SocialLink`, `ProfileLinks`, `ProfileLink` | A glyph and the service's name (`service`: github, x, linkedin, instagram, youtube, email; none for a service without a mark). `SocialLinks` is the row (`size` 16 or 20; `iconOnly` for a row made entirely of marks); `ProfileLinks` is the long form, with `handle` as the hint. |
| `Text`, `Heading`, `InlineCode` | Token type scale; Heading's semantic `level` is independent of visual `size`. |
| `Prose` | A prose page's text column: `size-prose-width` wide (34rem), on the row's start edge and never centred. It sets a measure and nothing else. |
| `Nav`, `NavGroup`, `NavItem` | An app's navigation: a column of `NavItem`s (`icon`, `current`, `count`, `dot`), optionally in `NavGroup`s (`label`). Hover is a round pill hugging the glyph and label that glides between items; the current page is its selected glyph and a 600 label. `Nav collapsed` is the rail, where a count or a dot is spoken with the name and not drawn. |
| `TabBar`, `TabBarItem`, `TabBarMore` | The phone tab bar, fixed to the bottom under 720 (56px plus the bottom safe area; not shown from 720 up or in print), named "Primary" (`aria-label`). Each `TabBarItem` is a link that fills its cell (`icon`, `current`, `dot`); `TabBarMore` is the last cell when there are more than five destinations and opens the rest as `NavItem`s in a bottom `Sheet`. Pass it to `AppShell` as `tabBar`. |
| `Lead`, `PageRow`, `PageSections`, `PageSection`, `SectionIntro`, `SectionActions`, `Columns`, `ColumnsItem` | A site page's lead, row, sections and twelve-track columns; `Heading size` also takes `"6xl"`, `"7xl"` and the roles `"hero"` and `"display"` (see foundations, Display type); in development `Columns` and `ColumnsItem` log a warning for a display or hero heading (or a fixed `6xl` or `7xl`) in a column under 7 of 12 tracks from 1024, whether a named layout or an item's own `span` makes it, and a production build holds none of that code. |
| `Avatar`, `Separator`, `EmptyState` | Named image/initials, semantic division and next-step guidance for empty views. |
| `Badge` | Neutral pill; `status` adds a dot (success, warning, danger, accent, pending, or `"neutral"` by name). No `status` is the word alone; a running badge (a braille `Spinner` first) draws no dot. The label says the status in words. In forced colours every dot is a disc in the system colour of where it sits. |
| `BadgePair` | A name with at most two badges: the `status` first, then one neutral `fact`. When the name and the pair don't fit on one line the pair moves under the name as a unit; a badge never truncates. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `CardTitle` is an `h3`; give it `level` (2 to 6) to put the card in the page's outline where it belongs. The size and weight stay the same at every level. |
| `ChoiceCard`, `ChoiceCardGroup` | A card you can choose: a native radio (or, with `multiple`, a checkbox) wearing a card, with `title`, `description` and `children`; the whole card is the label and the choice box sits in a seat reserved on every card, so choosing moves no title. Put the cards of one choice in a `ChoiceCardGroup` and name it (`aria-label` or `aria-labelledby`). |
| `DescriptionList`, `DescriptionItem` | Facts about one thing as a `dl`: each `DescriptionItem` has a `term` and its `children` (or `values` for several `dd`s); `mono` for identifiers; `missing` keeps the label and says "Not observed". The label column is fixed and the list stacks under 480px of its own width. |
| `Stats`, `Stat`, `formatStatTime` | A row of figures, never boxed (`Stats`, one `dl`; `min` is the narrowest a stat gets before the row wraps): each `Stat` has a `label`, a `value`, a `note` and a `source` with its `time`. `formatStatTime(time, { now, timeZone, locale })` writes the time as the stat does ("04:41", "Nov 7, 08:02"). |
| `TableContainer`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `numeric` cells use tabular numerals, end-aligned with their header; `mono` cells for IDs and hashes. Give `TableContainer` a `label` ("Runs table"): while the table is wider than its box the container is a keyboard stop with that name as a `region`, so the hidden columns can be scrolled to without a pointer (an `aria-label` or `aria-labelledby` works too; with none of the three the stop is named by the table's `caption`, and with no caption "Scrollable table"). On touch a lone checkbox or link in a cell has a 44px hit box. In a still table (`columns`) a cell whose text is cut by the ellipsis is a focus stop (`data-cut`, `tabindex="0"`), and on hover or focus its whole value opens in place on a level-3 plate (Esc closes it; it is `aria-hidden`, the cell holds the value); each cut cell is one added tab stop. Size a column of one fixed form (a date, a time, a status) for its longest form under WCAG 1.4.12 spacing, so only free text is cut, and size a header's label to fit its column under the same spacing: a cut sortable header opens no plate (the sort button is the whole cell and its name holds the label), a plain header does. A `Table` renders every row it is given (see [Long lists](#long-lists)): page one that can pass a few hundred rows with `Pagination`. |
| `TableEmpty`, `TableScrollHint` | `TableEmpty` is the row a table shows when no row matches: one cell across `colSpan` columns, under the unchanged header, with a sentence (`children`) and an `action` such as "Clear filters". `TableScrollHint` is one line right after a `TableContainer` that is wider than its box ("Scroll sideways to see all 6 columns", `label` sets the words); it shows only while the table overflows, is `aria-hidden` and never changes while the table scrolls. |
| `TableContainer flat`, `TableCall` | The flat form (DECISIONS 162, D18b): `flat` draws no border, radius, fill or shadow and adds no level, so a `Card` that holds the table has one box (the card's `space-4` padding is the inset; the header band keeps its fill; cells are padded `space-2` above and below). `TableCall` is a two-line cell's content: `call` in primary at 500 over `detail` in secondary at 400, `space-0-5` apart, wrapping inside its column. The panel's head and note are the app's markup. |
| `Tooltip`, `TooltipProvider` | Supplements a name with a linked accessible description; never replaces a label. |
| `Checkbox`, `Switch` | The label is `children`. A switch takes effect immediately; a checkbox on submit. |
| `RadioGroup`, `Radio` | A few options, all visible; arrow keys move the choice. |
| `Select` | `options` of `{ value, label, disabled? }`; labelled by its `Field`. |
| `ToastProvider`, `useToast` | `useToast().show({ title, description?, status?, action?, home?, group?, running? })`, then `update(id, patch)`, `close(id)` or `promise(work, { running, success, error })`. A toast stays until dismissed unless it names a `home` for what it says (`"centre"`, `"row"`, `"key"` or `"page"`; an action needs one that is not the page), and then it closes after 5s. Level 1, three deep, danger announced assertively. A toast with an `action` is announced with one more sentence: "Undo is available. Press F6 to reach it." (F6 moves to the stack's named region, where the action is a stop.) Pass `actionWords={(label) => string}` to `ToastProvider` to say it in another language or other words; a toast with no action says nothing extra. Nothing extra is drawn, and it is said once. |
| `NotificationCentre` | The durable copy a toast points to: a bell button with a dot (count in its name) opening a popover of `entries` (`{ id, title, description?, time, status?, unread?, href? }`), "Mark all as read" and "View all". Presentational: you own the entries, their read state and the page. |
| `CommandMenu` | ⌘K: `groups` of `{ label, commands }`, each command `{ id, label, icon?, description?, shortcut?, keywords?, danger?, onSelect? }`; you bind the shortcut. A `description` is a second line, and is searched below the label; `danger` draws the command in the danger colour, as in `Menu`. |
| `CommandList` | The same panel set in the page (no dialog): a level-1 panel whose field keeps focus, with a count in its foot. `label` names it; `detail={(command) => pane}` adds a preview beside the list (a push under 816px); `bindShortcut` gives it ⌘K. One command surface per page owns ⌘K. |
| `SearchTrigger`, `SearchDialog`, `SearchResults`, `SearchResult` | Search by following links. `SearchTrigger` is a button shaped like a field (a 1px input boundary, the glyph and the word, 200 by 44) from 720 and a 44px icon button under it; it opens whatever you open. `SearchDialog` is a centred dialog: a `type="search"` field and a close button (one ×: the browser's is hidden), a count line (`count` is a string, drawn at once and spoken once) and a results area of a fixed height, a full result's, so the field and the count never move. `SearchResults` holds `SearchResult` links: each a tab stop, `media` (96 by 48 with `mediaShape="logo"`, 48 by 60 by default), a name and a `detail` line, a `trailing` value, as tall as its picture plus 6px above and below (never under 48). Enter in the field calls `onSubmit(query)`. There is no active row and no arrow-key movement. |
| `Listbox`, `ListboxGroup`, `ListboxOption` | One choice from a list that stays in the page: `role="listbox"` with one tab stop and `aria-activedescendant`, whose choice follows ↑ ↓ Home End. Options have a `detail` second line and a `trailing` cell; groups are named by their header. The chosen option has a chevron in its gutter and primary ink, never a heavier weight. Focus is a ring on the list's own box, 2px at +2 with radius 8 (DECISIONS 159: the owner, on a 2 to 2 deadlock in DECISIONS 157, Q2); `flush` draws it inside at −2 where the list meets a clipping edge. The rows scroll in a box inside the focused one (`.basalt-listbox-scroll`), so the corners clip nothing and a script that scrolls the list scrolls that box. |
| `OpenList`, `OpenListGroup`, `OpenListRow` | Rows that open (not a listbox). The name is a button stretched over the row; one row, the cursor, holds the tab stop; ↓ ↑ `j` `k`, Home `g`, End `G` move it and Enter opens. A row has `part`, `state` and `detail` cells, aligned down the list, and says what it `opens` into. `off` leaves a row in place that a filter does not match (unavailable to every input, DECISIONS 168: disabled ink, no cells, skipped by the cursor, `aria-disabled`, no hover step, a `not-allowed` cursor, and a press does not open it); count with a `FilterResult` outside the list. `OpenListGroup` is a named `group`, not a landmark. |
| `NoticeBar` | One short notice across the top of a page, above the header: a named region (`label`, not a live region), the level-1 fill with a divider under it, `title` in primary at 600. |
| `Textarea` | Multi-line Field control; controlled or uncontrolled, with the field's label, validation and disabled state. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverTitle`, `PopoverDescription`, `PopoverClose` | Anchored details or a short form; Esc returns focus. `PopoverContent` and `MenuContent` take placement props, and one `Popover` can serve many triggers: see [Placement, one popover for many triggers and small parts](#placement-one-popover-for-many-triggers-and-small-parts). |
| `Callout` | Persistent inline information; `status`, `title`, optional `actions`. Success, warning and danger draw a 45% status rim over a neutral fill. Set `live` only when it appears in response to something. |
| `Progress` | Required `label`; `value={null}` for an indeterminate task. |
| `Spinner`, `Skeleton`, `NumberTicker` | Loading and rolling tabular digits. Spinner variants: `ring` (default) and `braille`. `glide` eases a ticker toward its value over `slow`. Under reduced motion and in forced colours the strips are hidden, the number is plain tabular text in the sentence's own line, and a new value changes in place; the system then paints one selection band and its selected-text colour on the digits. A ticker is an inline box, so in a stretched flex row its digits sit where a plain-text sibling's text sits, not on the bottom of the row as they used to (the sparkline's own headline keeps its place). |
| `Slide`, `useGlide`, `useReducedMotion`, `useSlideDirection` | Motion helpers. `Slide` wraps a tab or segment panel so a change slides it in (or fades it under reduced motion) without re-keying it, so a field inside keeps its value and focus; `useSlideDirection(value, order)` says which way a value moved through an ordered list (`""` until the first change). `useGlide(target)` eases a number toward `target` over `slow` (give a screen reader `target`, not the in-between value). `useReducedMotion()` is true after mount when the reader asked for reduced motion. |
| `MorphIcon`, `TextMorph`, `Sparkline`, `Stepper`, `LivePreview`, `TravelSpinner` | Motion primitives. `Sparkline` is a line and its latest value, not a charting component. See [docs/motion.md](../../docs/motion.md). `TextMorph`'s `label` is what a screen reader hears when `text` changes, if that should say more than the glyphs show; nothing extra is drawn. `Stepper` is a `group` named "Steps" (`label` sets the name), and the step's name is read with where the user is: "Step 2 of 3: Review", once, when it changes. `positionLabel={(step, total) => string}` sets those words for another language. |
| `CodeBlock` | `code`, optional `language`, `title`, `copyable`. Language-aware syntax; exact-text copying and keyboard scrolling. Each language loads on first use: plain text first, colour moments later. For highlighted server-rendered HTML, `await preloadCodeLanguages(["ts", "bash"])` before rendering. |
| `Accordion`, `AccordionItem` | Secondary detail; keyboard operated, with coordinated panel and caret motion. An item's header is an `h3`; `headingLevel` (2 to 6) sets its level in the page's outline, and it draws the same at every level. |
| `Toolbar`, `ToolbarButton`, `ToolbarIconButton`, `ToolbarLink`, `ToolbarInput`, `ToolbarGroup`, `ToolbarSeparator` | One tab stop for a row (or column) of controls, as the WAI-ARIA toolbar pattern describes: the arrow keys along its `orientation` move between the controls and wrap (`loopFocus={false}` stops at the ends), Home and End go to the first and last, and in a right-to-left page the arrows follow the page. See [Toolbar](#toolbar). |
| The core glyphs | `HomeGlyph` and `ArrowDownGlyph`, `ArrowLeftGlyph`, `ArrowRightGlyph`, `ArrowUpGlyph`, `CalendarGlyph`, `CheckGlyph`, `ChevronDownGlyph`, `ChevronLeftGlyph`, `ChevronRightGlyph`, `ChevronUpGlyph`, `CloseGlyph`, `CopyGlyph`, `DownloadGlyph`, `EditGlyph`, `ExternalGlyph`, `HistoryGlyph`, `MenuGlyph`, `MessagesGlyph`, `MinusGlyph`, `MoreGlyph`, `MoreNavGlyph`, `NotificationsGlyph`, `PauseGlyph`, `PlanGlyph`, `PlayGlyph`, `PlusGlyph`, `PolicyGlyph`, `ProfileGlyph`, `RecordsGlyph`, `RoutesGlyph`, `RunsGlyph`, `SandboxesGlyph`, `SearchGlyph`, `SettingsGlyph`, `SourcesGlyph`, `TrashGlyph`, `TrendsGlyph`: one module each, drawn by `Icon` (next row) or passed to any `icon` prop. |
| `Icon`, `Kbd` | `Kbd` draws one chip per key from a string (`"⌘K"`), with ⌘ ⌥ ⌃ as Phosphor icons; show real shortcuts only. `Icon` draws a core glyph (`HomeGlyph`, one module each, 2.25 units on 24 at every size; `selected` closes its opening and fills) or a long-tail Phosphor icon in Bold at 16, 20 and 24 (Fill only when `selected` and `fillSafe`). Every `icon` prop takes any component that accepts `size` and `weight` (the core glyphs and Phosphor's do), and Basalt's declarations name no icon or primitive package. |

## Toolbar

A toolbar draws nothing. It has no class that styles anything: no gap, no separator look, no padding. Lay it out with your own class, as you would a plain `div`. `ToolbarButton`, `ToolbarIconButton`, `ToolbarLink` and `ToolbarInput` are Basalt's `Button`, `IconButton`, `Link` and `Input` with the same props and the same look, plus a place in the toolbar's arrow keys; a `Button` in a toolbar is the `Button` outside one.

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

**Placement props** on `PopoverContent` and `MenuContent`, each optional. Left out, a popup is placed as before: against its trigger, `side="bottom"`, `align="start"`, `sideOffset` 6, flipped and shifted to stay 5px inside the viewport.

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
| `StatusLine` | A polite status line that is heard and not seen: a visually hidden `role="status"`, `aria-live="polite"`, `aria-atomic="true"` region that says its text (`children`, a string) once it has held still for `delay` ms (400). Send the same text again by changing `sendId` (a counter): the line is emptied for the `delay`, then filled, so the DOM changes and a screen reader says it again. Text present when it mounts is not announced. `FilterResult` is the same line beside its visible text. |
| `GlidePlate` | The one plate that glides between a popup's rows. Render it first inside a `.basalt-menu` or `.basalt-command-list`; `navigation` lays it on a `.basalt-nav` or `.basalt-site-links`, `notifications` on `.basalt-notifications-scroll`. It is decoration, and it draws only where the stylesheet and the input allow it. |
| `useMediaQuery(query)` | Whether a media query matches, live. `false` for the server render and a hydrating page's first render. |
| `useTheme()`, `themeBootstrap` | The page's theme, on the pattern of `useLoops` and `loopsBootstrap`. See below. |
| `SiteFooter`, `SitePage` | The end of a site page (DECISIONS 146 A): `brand`, `note`, `social`, `links` (one unlabelled line of up to six) or `groups` (`{ label, links }`), a required `legal` line, and the theme choice, always. On the page at level 0 with one divider; the links are the pill link at `sm`; under 720 a group is a disclosure; one `nav` named "Footer". Put it last inside `SitePage`, a column at least `100svh` tall, so a short page keeps it at the foot. |
| `ThemeChoiceControl`, `ThemeMenu` | System, Light and Dark on `useTheme`: `ThemeChoiceControl` is a radio group in the segmented control's drawing for a footer or a settings row; `ThemeMenu` is a ghost icon button named "Theme: System" opening three radio rows, for an app with no footer. `themeBootstrap` writes `data-theme-choice` beside `data-theme`, and CSS draws the chosen word from it before any script. |
| `SiteBrand`, `SiteNav`, `SiteNavList`, `SiteNavLink`, `SiteMenu`, `SiteLockupDefs` | The parts a site's own bar and footer are built from (DECISIONS 146 C, F): the brand link (with `lockup={{ x1, x2 }}`, each drawing `{ viewBox, d }`, defined once as a `symbol`), the pill link list (`size` `md` or `sm`, `orientation`, `hang`), and the narrow menu's trigger and sheet. `SiteHeader`'s slots are `brand` (or `lockup`), `links`, `tools` and `action`; `themeToggle` is deprecated and kept for one release. |
| `useSitePhase`, `SitePhaseSlot` | A bar that arrives, or leaves and returns (DECISIONS 146 D): `useSitePhase(headerRef, { after })` reports `rest`, `between` and `pinned` from one observer on two sentinels and writes `data-phase`, `data-form` and `data-motion`; `SiteHeader` takes `phase={{ after }}` and draws its slot. |
| `LoopsToggle`, `LoopsToggleIcon`, `LOOPS_TOGGLE_NAME`, `LOOPS_TOGGLE_DESCRIPTION` | The hold on every loop, on `useLoops`: `form="icon"` (default; an icon-only ghost toggle with the core `pause` glyph, named by its `title` alone, for `SiteHeader`'s `loopsToggle` slot, first in the end cluster; import `LoopsToggleIcon` to load no `Switch`), `form="button"` (a pressed-toggle Button; `SiteHeader` draws it as its narrow menu's first row when `loopsToggle` is passed) or `form="switch"` (a settings row with the description "Moving art and spinners hold still. Your work keeps running."). The name is always "Pause animations" (`LOOPS_TOGGLE_NAME`); `LOOPS_TOGGLE_DESCRIPTION` is the settings row's description. |
| `PairedArt` | A stage's art in two versions, `dark` and `light` (URLs; `position`, `loading`, `width`, `height`), the page's theme choosing: the one for `[data-theme]` or `.dark` or `.light`, else the system's. Decorative (empty `alt`), never filtered. |
| `FramedArt`, `Stage` with `art`, `fit`, `anchor` | Drawn art (an inline `svg` or `canvas`) in the same frame as a picture (`art` in place of `src`), or in a `Stage` (which takes the same two): it keeps its proportions and fills the box (`fit="slice"`, the default for both; `meet` shows all of it). A drawing's own `preserveAspectRatio` stands unless a `fit` or an `anchor` is passed, held at its `anchor` (`"end floor"`), and its lines do not scale. `checkHeadroom` reads each `data-quiet` box grown by `space-1-5` (DECISIONS 146 F). |
| `Stage closing` | The closing block at a page's end (DECISIONS 162, vote 2): level 0 on `art-field`, no headroom marker and no pull-up (`headroom` has no effect), `--basalt-section-gap` above it and as its top padding, `--basalt-stage-room` (the app's) as its bottom padding (`space-16` in forced colours and print). Its art is held still: a `data-ambient` mark in it is drawn at full opacity and does not loop. Its marks keep out of its `data-quiet` zones at every width (pixels inside the top padding, not a percentage of its height); `checkHeadroom` reads a closing block with `stage: ".basalt-stage[data-closing]"` (only its zones, no headroom). At most one, at the end; the stage at the top stays the page's one. |
| `CaptionedColumns`, `CaptionedColumn` | A short head over a sentence, in columns (DECISIONS 162, vote 4): a `dl`, one `CaptionedColumn` (`head`, children) for each item. `size="large"` (the default) is the home page's list: a divider on top of each item, `space-6` above and below, the head `text-xl` at 600, `space-3`, a `text-md` sentence. `size="small"` is the captions' list: one rule over the list, `space-5` under it, `space-6` between rows, the head `text-base` at 500, `space-1`, a `text-base` sentence. `columns` (1 to 4) is the app's count for its own container; the part has no breakpoints. The gutter is `size-gutter`. |
| `AppTile` | The picture an app gives it (`src`), clipped to a superellipse of exponent 5 (no radius) with a 1px `border-hairline` that follows it (DECISIONS 162, votes 5 and 6). `size` is 20, 32, 36, 40, 44, 48 or 52; left out it is as wide as its box, square. Decorative (`aria-hidden`), always beside the company's name; flat (no shadow); not drawn in forced colours. Each tile carries its own clip. Basalt ships no company's icon file: the product gives one it has the right to show. |
| `PeriodStepper` | Two icon buttons round a label that says which stretch of time is shown (DECISIONS 162, D19b): `label`, `spokenPrefix`, `previousLabel`, `nextLabel`, `onPrevious`, `onNext`. `atStart` and `atEnd` stop a button and keep its focus (`aria-disabled`); `whole` hides both and keeps their room, for the view with no periods. The core chevrons, ghost, 32px; the label is 500, tabular, in a seat of at least 128px. The label is spoken once, after it holds still for `delay` ms (400), with the prefix. Under 640px of the app's container (`container-type: inline-size`, in a bar that wraps) it takes its own row, 52px tall with a hairline above and 44 by 44 buttons. Not `Stepper` (a short flow) and not `Pagination`. |
| `ambient(index)`, `AmbientMark`, `AMBIENT_MAX`, `ambientTiming(index)` | A page's one ambient loop: opacity only, in a `Stage`'s art or a framed drawing, at most 24 marks of `size-dot`. `ambient(i)` returns the props for any element (`ambientTiming(i)` is the period factor, 0.6 to 1.4, and the phase it is built from); `AmbientMark` is a `size-dot` span. Held by the hold, still under reduced motion, in forced colours and in print. |
| `Reflow`, `ReflowItem`, `REFLOW_BOUND` | A list or grid that is filtered or sorted: `order` names the ids shown, every `ReflowItem` stays mounted (an item not shown is `hidden`), and the items that stay move by transform. `fallbackFocus` is the result line focus falls back to; `onReflow` reports what moved. Past `REFLOW_BOUND` (48) items that would move on screen, a change lands at once. |
| `TimeChart`'s `entrance` | Makes a chart its page's one entrance (see `docs/motion.md`). `entranceVerdict`, `entranceSeen`, `markEntranceSeen`, `forgetEntrance` and `entranceKey` are the rule's parts (`ENTRANCE_LATE_MS`, 1000, is how late a page's script may start and still draw the figure's entrance); `entranceStep` is the stagger's step; `markPageChange()` is what a router calls when a page change without a reload begins, so the next chart's gates run from the change. |
| `travelLeg`, `travelRun`, `createTravellers`, `travelTokens`, `TRAVEL_SHORT_LEG`, `TRAVEL_LONG_LEG`, `TRAVEL_MS_PER_PX`, `TRAVEL_MIN_LEG`, `TRAVEL_RUN_LIMIT`, `TRAVEL_IN_FLIGHT` | The timing of a travel the eye follows (a leg of `duration-slower` up to 150px, 2ms a pixel above, `duration-figure` from 300px, a 200ms rest, a run inside five seconds) and its in-flight rule (one traveller a trigger; a third lands the oldest at once). The `TRAVEL_*` constants are those numbers: 150 and 300 px, 2 ms a pixel, a 100 ms shortest leg, a 5,000 ms run and 2 travellers in flight. |

**The theme.** `useTheme()` returns `{ theme, choice, setChoice, ready }`: `theme` is `"light"` or `"dark"`, what the stylesheet is showing; `choice` is `"light"`, `"dark"` or `"system"` (no stored value); `setChoice(choice)` stores it and writes `data-theme` on `<html>`; `"system"` removes the stored value. While the choice is `system` the theme follows the device's colour scheme as it changes, and a change made in another tab arrives by the `storage` event. The key is `basalt-theme` with the values `light` and `dark`: the same as the HTML skill's, so a React app and a skill page on one origin agree (anything else stored counts as `system`, as it does there). **Before the client knows the theme** (a server render, and the first render of a hydrating page) it returns `{ theme: "light", choice: "system", ready: false }`, the stylesheet's own default with no `data-theme`, so the first render is the same on both; the real values follow at once with `ready: true`. Hold back a control that would flash the wrong choice until `ready`. With storage blocked, the choice lasts for the page. Nothing runs at import: the listeners are installed by the first `useTheme()` and removed with the last. Put the head script in the document so the theme applies before the first frame, the way `loopsBootstrap` does: `<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />`. It applies the stored choice, else the system's, exactly as the skill's head snippet does for the theme (the skill's goes on to restore the keyboard hint; this one does not). Basalt draws no toggle: the control is the app's.

## A skip link, reserved room and a page's own sticky bar

None of these changes how anything looks: each is an existing look or rule, exported.

| Export | What it is |
|---|---|
| `SkipLink` | The first thing on a page: a link past the bar and the navigation to the content. `<SkipLink target="main" />` renders `<a href="#main">Skip to content</a>`; the words are `children`, so an app in another language replaces them, and any anchor prop passes through (`target` may carry its `#`). It is unseen until it has focus. With a sticky bar (`SiteHeader`, `AppHeader` or your own `.basalt-sticky-bar`) it then hangs under the bar, space-2 below its line, on the brand's start edge at every width, so it covers nothing in the bar; without one it sits at the page's top start (space-2 in). **How it finds the bar:** when it takes focus it reads the real bottom edge of the first element matching `.basalt-site-header, .basalt-app-header, .basalt-sticky-bar` and sits space-2 below it, and reads it again on scroll and resize while it holds focus, so a bar that is not at the top of the viewport (a notice above it) is still cleared; with no script or no bar it is where the stylesheet puts it, under a bar at the top. It floats like a tooltip (level 3, the rim, `shadow-overlay`, radius 8) on the toast layer; 44px tall on a coarse pointer; not drawn in print. It is the HTML skill's `.skip-link`, drawn with the same tokens. **The app places it itself, as the first element of the page** (before the bar, so it is the first tab stop): `AppShell` and `SiteHeader` render none. Give the target `tabIndex={-1}` so following the link moves focus to it (`AppShell`: `mainProps={{ id: "main", tabIndex: -1 }}`); a target that cannot take focus starts the next Tab there instead. |
| `TimeChart`'s `lit`, `headline`, `headlineFormat`, `trend`, `plotSize`, `compact`, `lane`, `onDayActivate`, `activateHint`; `trailingMean(values, { window, min })` | The lit figure (DECISIONS 153; the implementation hasn't been reviewed). `lit`: solid marks take one vertical gradient in three neutral stops, a line one stroke in the top stop. `headline`: the frame with the picked day's number as the headline (one series), the unit beside it, one context line, no live region; its number is written in the chart's `locale` unless `headlineFormat` writes it. `trend`: `true` (7 days) or a window: the readings as small dots and their trailing mean as one straight line that breaks at a gap, one head dot, the number the trend. `plotSize="sm"` is the 96px plot. `compact` (with `kind="bar"` and `plotSize="sm"`) is the short bar plot (DECISIONS 160, the owner's choice for vote 10): no gridlines, no y labels, no gutter, the plot the figure's width; the legend, keys, table and caption stay; ignored for a line, a 240px plot or a second series. `lane` and `onDayActivate` are what `PhaseChart` is built from. `trailingMean` returns `Array<number \| null>` (no NaN for no data). |
| `PhaseChart` | A trend over weeks with a lane of one choice a week and the open week's plate: `name`, `values`, `calls` (`{ word, changed?, text }`), `week`, `onWeekChange`, plus a `TimeChart`'s `title`, `days`, `format`, `summary`. A press on a day, or Enter, opens its week; on a phone the lane is marks with previous and next controls. |
| `ChartGroup` | Charts stacked in one figure (`label` names it): the y gutter and the right margin are as wide as the widest chart's, so every plot starts and ends at the same x. Put the charts inside; each keeps its own title, legend, summary and table. |
| `ShareBar`, `shareOf(values)` | Parts of a whole as one bar: `parts` (`{ name, value }`), `size="sm"` (8px) or `"md"` (12px), `format(share, part)`. One ink, a 4px gap, each part's share (whole percents that add to 100) and name under it; a part that is more than nothing and rounds to 0 reads "<1%" (spoken "less than 1%"), and a part of nothing is left out. |
| `CoverageStrip`, `coverageWords(days)` | One cell a day (`{ date, recorded, why }`): `form="strip"` (slivers, 48px) or `"week"` (seven squares); the missing dates in words, built from the cells. |
| `MarksRow` | A row of marks in the form of the thing measured: `kind` `"columns"`, `"pills"` or `"blocks"`, `values` (`null` missing, `0` a rest day), `cap`, `label`, `height`. Drawn at rest. With a `label` it is an image whose description is its values in order (`format` writes each, `unrecordedLabel` is the word for a missing day); with none it is hidden. |
| `RangeMeter` | A reading against a plan range: `label`, `value`, `max`, `plan` `[low, high]`, `unit`. `role="meter"`; two ticks and a ringed marker from one scale. |
| `Reserve` | Room for words that change in place. `<Reserve show="saved" alternatives={{ idle: "Save", saving: "Saving…", saved: "Saved" }} />` draws every wording in one grid cell and shows the one `show` names, so the cell is as large as the largest and nothing beside it moves when the words do. The caller lists the wordings; nothing is worked out. The unseen ones are `aria-hidden` and `inert`, and `visibility: hidden`: out of the accessibility tree, not focusable, not selectable, not found by find-in-page. The wordings sit at the cell's start; `justify-items: end` on it (by `className`) puts a narrower one against the end. `alternativeClassNames` styles one wording by its key; `className` and any `span` prop pass through to the cell. A wording can be any node, so a state with an icon reserves the icon's room too. `Terminal` (its state words and its buttons) and `Meter` (its reading) are drawn with it. `MultiSelect`'s count keeps its own form (two CSS-generated sizers, no text in the DOM) because its group's description reads that element's text. |

**A page with its own sticky bar.** A page with `SiteHeader` or `AppHeader` gets `scrollbar-gutter: stable` and a `scroll-padding-top` of the bar plus `space-4` (`--basalt-sticky-offset` + `--basalt-space-4`: 72px with no inset), so an anchor or a focused control lands below the bar. A page that draws its own sticky bar gets the same by putting the class `basalt-sticky-bar` on it: `<header className="basalt-chrome basalt-sticky-bar">`. The offset is the one property, `--basalt-sticky-offset` (the bar's height plus the top safe area: 56 plus the inset by default); a bar of another height sets it on the root (`:root { --basalt-sticky-offset: calc(80px + env(safe-area-inset-top, 0px)); }`) and the landing follows, with the same step. The bar's own contents take a scroll margin as deep as that padding, so a Tab into the bar from a scrolled page holds the page still (the padding alone scrolls it): this applies to `SiteHeader`, `AppHeader` and `basalt-sticky-bar`. The app sidebar is not in that rule (it scrolls its own list), so its brand and first row still scroll the page a little when focused from a scrolled position.

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
a constant-sized page window and hides itself for zero or one page.

Text supports all ten type sizes, the three weights, `tone`, `mono` and `as="p|span|div"`.
Heading's `level` follows document structure; `size` follows the visual role. EmptyState
uses a named section with an h2, description and optional actions. It does not announce an
initial empty view as an error. Avatar requires a person's name and falls back to initials.

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

<EventLog label="Activity" widest="00 Mmm 00:00">
  <EventLogRule>New since you left</EventLogRule>
  <EventLine href="/a" verb="opened" object="the page" detail="from the map" time="09:39:11" unread />
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
<ActionShortcut shortcut="⌘↵"><Button type="submit">Send</Button></ActionShortcut>
<FilterToolbar label="Filter and sort" filter={<MultiSelect label="Brand" toolbar … />} result={<FilterResult>Showing 3 of 24</FilterResult>} sort={<Select aria-label="Sort" … />} />

useRouteFocus({ key: path, title: "Shop | Castle", target: titleRef, fromControl });
const { shortcuts, keyshortcuts } = useShortcuts([{ key: "j", description: "Next", run: next }]);   // the help dialog draws <ShortcutList shortcuts={shortcuts} /> and <SingleKeysSwitch />
<Countdown to={opens} done="Open" /> <Clock timeZone="America/Chicago" /> <DateAge time={t} short />
```

- `StatusBar` clears a message after `STATUS_MESSAGE_MS` (5000) only when its `logged` is true; any other message stays until replaced or cleared with Esc. A page has one foot: do not use it with `TabBar`.
- `useShortcuts` binds single keys only; the choice to turn them off is `useSingleKeys` (`basalt-keys`). Give the help dialog a visible opener that is not a single key.
- `useNow`, `Clock` and `Countdown` share one lazy timer and hold under `data-loops="held"`. `formatAge` is for beside a date; never in a `Stat`.
- Smaller parts: `LogFields` (the runs of a line) and `LogLine` (one line alone) draw the one log-line look; `LogSummary` is a four-line summary in a `pre`; `InlineValue` is a row that is a label and a value, not a field. A `CommandBlock`'s head sticks under a bar set with `--_basalt-block-top`.
- The formatters draw nothing: `formatStamp` ("14:49:07"), `formatClock` ("14:49"), `formatDay` ("Nov 1"), `formatCountdown` ("18d 09:10:51", `null` once passed) and `formatAge`, each with its machine `dateTime`, the zone an argument.
- `SourceStamp`'s name and time are the app's: Basalt ships no source's icon or name.

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
