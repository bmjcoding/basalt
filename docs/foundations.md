# Basalt foundations

The decisions under every Basalt component, and why each was made. The values live in
`packages/tokens/tokens/*.tokens.json`; this page explains them. Change a value there,
and change the reason here.

Basalt is one system for every SRA Syndicate product: Blacksand, srasyndicate.io,
baileymjones.com, N1 and what comes after. It's monochrome. A product adds colour through
its own accent, in a few named roles, and nowhere else.

## Principles

- **Meet WCAG 2.2 AA by construction.** Every text, boundary and focus pair is tested on
  every surface it can appear on (`packages/tokens/test/contrast.test.mjs`). A token change
  that breaks a pair fails the build.
- **The page is the darkest layer, in both themes.** Anything closer to you is lighter.
  Light mode never puts a full white page in front of you.
- **Borders build structure; shadows exist only for things that float.**
- **Panels have one rim:** a 1px edge in two solid colours, at most 8% white on top and 6%
  on the other sides in dark, uniform in light. No gradient along or across an edge, no inner
  glow or sheen, no blur, no animation, no outer frame, no light falloff on the page. Never
  on controls or chips. See [Elevation](#elevation).
- **No ornament that signals "generated":** no gradient borders, no glow, no bounce, and no
  scale on press beyond the .98 of Button and IconButton. Colour never carries meaning alone.
- **One smoked surface.** The only translucent, blurred surface is an app's sticky header
  bar ([Chrome](#chrome-the-smoked-header)). Every dialog, sheet, menu, popover, toast and the
  command menu is solid. Use the class once per viewport; translucent layers never stack.
- **Native is first-class.** Tokens are platform-neutral and generate CSS, TypeScript and
  Swift (Kotlin when an Android app needs it). Components are native per platform; tokens, icons and type are shared.

## Colour

All colours are OKLCH and inside sRGB, so every display shows the same colour. The neutrals
are achromatic (no tint) and named by HSL lightness: `neutral-4` is `#0a0a0a`.

### Surfaces

Depth is four levels, `surface-0` to `surface-3`. A role token is one of them, so naming the
levels changed no pixel.

| Level | Dark | Light | Roles that use it |
|---|---|---|---|
| `surface-0` | `#000` | `#fafafa` | `surface-page`: the page, and app sidebars |
| `surface-1` | `#0a0a0a` | `#fff` | `surface-raised`: a panel on the page (cards, tables, code blocks); inputs and secondary buttons; a menu, select or popover opened from the page or a sidebar; and a dialog, sheet or command menu (a modal resets to level 1) |
| `surface-2` | `#111111` | `#fff` | `surface-overlay`: a panel in a panel, a popup opened from a card or a modal (a menu from a table row, or from a dialog), the command menu's input band, a modal's inner panels |
| `surface-3` | `#171717` | `#fff` | `surface-top`: the deepest panel, a popup opened from a level-2 panel (the cap), tooltips, toasts; under the selected pill in a segmented control and in vertical tabs (dark adds the selected wash) |

| Role | Dark | Light | Use |
|---|---|---|---|
| `surface-sunken` | `#0a0a0a` | `#f5f5f5` | Wells and code blocks on the page |
| `surface-well-2`, `surface-well-3` | `#111111`, `#171717` | `#f5f5f5` | A well one or two levels deeper (see below) |
| `surface-sunken-strong` | `#111111` | `#f0f0f0` | Table headers, segmented-control tracks (bands, not boxes) |
| `surface-chrome` | `#000` at 85% | `#fafafa` at 92% | The fill of a sticky header bar, the page colour with alpha. The only translucent surface; see [Chrome](#chrome-the-smoked-header) |

Dark steps up from true black in small increments, as Linear does. Nothing above the page
is pure black, so large moving surfaces never smear on OLED (pixels at `#000` switch fully
off and lag when they turn back on). Light sits the page just below white, as Vercel does,
so white cards lift without a shadow.

**Depth is by level, and the level is not a prop.** It is a private context, rendered as
`data-level`, that crosses portals as the modal depth does:

- an in-flow panel (Card, TableContainer, CodeBlock, Callout, the preview card) is its parent's
  level plus one, with level 3 the cap;
- a non-modal popup (Menu, Select, Combobox, Popover) is its opener's level plus one, with a
  floor of 1 and a cap of 3. A menu opened from the page or a sidebar is level 1 (`#0a0a0a`, 1.06:1
  on the page, its rim 1.19:1 on the page); from a card, a table row or a modal, level 2
  (`#111111`); from a level-2 panel, level 3 (`#171717`). The floor is 1 in both themes: in light,
  levels 1 to 3 are one white, so it changes no pixel there;
- a modal (Dialog, AlertDialog, Sheet, CommandMenu) resets to level 1 above its scrim, so what it
  holds starts at 2: a card, a code block or a menu opened inside a dialog is `#111111`. The modal
  depth that stacks z-index is a separate context and is unchanged;
- a Tooltip and a Toast are 3 (this round leaves them as they are).

A grey menu on the black page was the complaint that moved the floor from 2 to 1 (the owner, 9 Nov
2026, with the council: 4–0 on `#0a0a0a`, 3–1 on opener plus one). The page is `#000` and the rim carries
the edge, so a level-1 popup is near black without being OLED-smeared.

In light, levels 1 to 3 are one white. Nesting shows by the rim (and a shadow when the panel
floats), never by a darker fill: a darker panel on a lighter one would read as sunken, the
opposite of raised. Wells follow the same rule in dark (a code block in a card is level 2,
`#111111`; in a dialog, which is level 1, a code block is level 2 as well) and stay `#f5f5f5` in light. Inputs keep their fill and their 3:1
border at every level.

**The nesting guard.** Most grouping is not a panel:

1. Group with space or a divider first.
2. A panel is for a distinct object: a code block, a table, a preview, a callout.
3. Go at most one panel deeper inside any in-flow panel (a card holding a preview that holds a
   code block is three rimmed boxes whose fills step about 1.05:1 each: nested boxes).
4. Level 3 is the cap; beyond it, use a divider.
5. Bands (the command menu's input row, a table header, a settings row) are not boxes.
6. Floating surfaces are a layer, not nesting: they follow the popup and modal rules above.

### Text

| Role | Dark | Light | Worst case on any surface |
|---|---|---|---|
| `text-primary` | `#ededed` | `#171717` | 15.3:1 / 15.7:1 |
| `text-secondary` | `#a1a1a1` | `#4d4d4d` | 6.9:1 / 7.4:1 |
| `text-tertiary` | `#858585` | `#6b6b6b` | 4.86:1 / 4.68:1 |
| `text-disabled` | `#5c5c5c` | `#a3a3a3` | Exempt (disabled controls only) |

On a hover or selected wash, tertiary text becomes secondary; the wash would take it below
4.5:1. Four text levels were considered and rejected: Linear's fourth (`#62666d`) is 3.0 to
3.45:1, which fails AA.

### Lines, states and actions

- **Hairline:** `0 0 0 1px` at 14.5% white (dark) or 8% black (light), with a second 1px
  ring in the page colour behind it, so the translucent line mixes against the same colour
  on any background (Vercel's technique). Controls, badges and avatars keep it. Decorative; it
  carries no required information.
- **Rim:** a panel's edge, and the only edge a panel has. A real 1px `border` (so forced colours
  keep it), 6% white on the sides and bottom and 8% white on top in dark (`border-rim` and
  `border-rim-top`), and 8% black on every side in light, where a lit top on a white panel would
  not show. On Card, TableContainer, CodeBlock, Callout, the preview card, Popover, Menu, Select
  and Combobox popups, Dialog, AlertDialog, CommandMenu, Sheet (its inner edge), Toast and
  Tooltip. Never on a control, chip, badge or pill.
- **Divider:** rules between table rows, menu groups and card sections: 6% white in dark, 8% black
  in light, never brighter than the rim (the header bar's line is the one exception; see
  [Chrome](#chrome-the-smoked-header)).
- **Input boundary:** 38% white or 45% black, 3.4:1 or better on every surface (WCAG 1.4.11).
  Vercel's inputs measure 1.35:1, and Linear's borders 1.3:1; neither passes.
- **Focus:** a 2px outline with a 2px offset in the secondary text colour, 6.9:1 or better.
  A field flush with a clipping edge takes the focus outline inset (offset −2px) around its visible
  band. A modal palette whose input is its only focus stop shows none. Against the fills and rim
  composites it touches the inset ring is 6.0:1 or better in dark and 7.1:1 in light.
  Outlines survive Windows forced-colours mode; box-shadow rings don't.
- **Hover and selected:** washes of 6% and 9% white, or 4% and 7% black, so they work on any
  surface. A hovered control's hairline steps up to 24% white or 16% black (`border-hover`). A selected
  tab or segment is a raised pill with a hairline, not a wash: a wash alone is about 1.2:1, and a state
  that only a change of colour shows fails WCAG 1.4.1 (the change of a background inside a component is
  outside 1.4.11's scope, which is why the cue has to be a shape or a step in ink). The pill is
  `surface-top`; in dark it is `surface-top` plus the selected wash, as one solid fill (`#2c2c2c` on a
  `#111111` track, 1.35:1), so a 36px pill in a vertical track reads as a pill and not as a wash. In light it
  is white on the track. A hover wash is a row of a list, not a plate: it runs full bleed and never lifts ink.
- **The active row** (the row a keyboard or pointer is on, in Menu, Select, Combobox and CommandMenu) is a
  plate and a lift. The plate is a rounded rectangle (radius 8) in the selected wash, painted as one solid
  `background-color` per level and never a layered image (forced colours turns an image into a backplate):
  in dark the next level plus the wash, `#262626` on level 1 (1.31:1 against the panel) and `#2c2c2c` on level 2
  (1.35:1), and at the cap, which has no next level, the wash alone over `surface-3` (`#2c2c2c`, 1.28:1); in light
  the 7% wash (`#ededed` on white, 1.17:1). The lift is the ink: a rest row's label and glyph are secondary
  (7.66:1 on level 1 in dark, 8.45:1 in light) and the active row's go to primary (12.86:1 and 15.33:1 on the
  plate). A hint (a host, a region, a count) lifts from tertiary to secondary on the plate, because tertiary
  falls under 4.5:1 there; a shortcut chip lifts to primary. There is no weight change (a heavier label shifts
  its width), no bar, no inset outline and no ↵ chip: the owner ruled the vertical bar and the outline AI
  tells (9 Nov 2026), and the plate with the ink step is the cue that does not rest on colour (1.4.1) and says where
  focus is (2.4.7). A chosen value (a Select option, a checked item) is a check in primary ink at the row's start, in a
  16px slot every row reserves so labels align, with no extra weight; its label stays secondary until lit. Danger keeps its colour on the plate: 5.16:1 on level 1 and
  4.80:1 on levels 2 and 3 in dark, 5.43:1 in light. Group labels are tertiary, 12/16, weight 500 (4.86:1 or better).
  In forced colours the lit row is `Highlight` with `HighlightText` for its label, glyph, hint and chip text and border,
  `forced-color-adjust: none` on the row (Chromium otherwise paints a Canvas backplate behind forced text and the
  label renders as a black box), a solid plate, a danger row taking the same pairing, and the panel on `Canvas` with
  a real `CanvasText` border.
- **Tabs and segments.** Horizontal tabs keep a 2px underline that slides under the active tab: it is horizontal, not the
  vertical line the owner ruled out. Vertical tabs are a column of 36px pills (radius 8) in a track (padding 4, radius
  12, `surface-sunken-strong`), the chosen one raised as the segmented control's pill is; there is no divider and no
  sliding indicator. The segmented control keeps its horizontal size (28px segments in a track of padding 2 and radius
  8) and takes the dark pill fill above.
- **Settings and list rows** are full-bleed bands, not plates: each row spans the card edge to edge, dividers run edge to
  edge, and a row you can act on takes the hover wash (the card clips the corners). A choose-one list inside a card uses
  the menu plate. There is no settings-row component; this is the pattern for an app's own markup.
- **Primary action:** the inverse of the page (near-white on dark, near-black on light),
  brightening to pure white or black on hover, and stepping to `action-primary-press` (the
  action colour 85% toward the page: about `#bfbfbf` in dark, `#333333` in light) while pressed.
  Its text is 11.4:1 or better on the pressed fill. Secondary, ghost and danger buttons press to
  the selected wash. A press is a colour step, and Button and IconButton also scale to .98 (see
  [Motion](#motion)).
- **Status:** danger, success and warning, each a dot beside a text label, never a coloured
  badge fill. Danger is also a text colour (4.77:1 or better, including on the hover and selected washes; light `#ba1d27`). There is no filled red button:
  a destructive action is red text on a red hairline, quieter than the primary action, with
  focus starting on Cancel. In tables a status is a plain dot and word, not a pill per row.
- **Disabled** keeps its control's shape with the disabled text colour and a fainter line.
- **Selected rows** (a table) are the selected wash as a band, edge to edge, with no bar and no edge mark, in
  forced colours too. The state is carried by the row's checked box and by a count in words, not by the wash
  (about 1.2:1): the first column is a checkbox column (a `Checkbox` per row, labelled "Select {name}", and a header
  box that is mixed while some rows are selected), and the count ("3 of 12 selected") is written in a polite live
  region by the app. Basalt ships no helper for the column or the count: the column is the app's own markup on
  `Table`, `TableCell` and `Checkbox`, given a first column `size-control-md` wide, and the row takes `selected`.
  Do not mark selection with a vertical line.
- **Checked controls** (checkbox, radio, switch) fill with the primary action colour; a switch
  also moves its thumb. Off is quiet: a tertiary thumb on an input-bordered track.
- **Toasts** carry a dot only for warning and danger; the title says what happened.
- **Callouts** keep a neutral surface; status is the icon and the words, and danger also
  colours its title.
- **Loading:** progress tracks are filled with the input-boundary colour (3:1); skeletons use
  `surface-placeholder` and a calm 2s pulse. Two spinners, one job each: the ring turns in 640ms
  (the default, and the one inside a button), and braille is Basalt's own 2 by 4 dot matrix
  stepping through ten frames (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏) in 530ms, for mono and terminal lines. Under reduced
  motion the ring fades and braille holds its first frame.

### Keyboard keys

A key is a chip: a fill (`surface-kbd`, 8% white or 6% black) with no border, 20px tall and at
least 20 wide, 4px of padding either side, radius 4, in Geist Mono 400 at 12/16. One chip per
key, 2px apart, so the keys of a shortcut read as one object. Text is `text-secondary` (5.59:1 or
better in dark, 6.50:1 in light, on the chip over every surface), and `text-primary` on a hover or
selected wash. ⌘ ⌥ ⌃ have no glyph in Geist, so they are Phosphor's Command, Option and Control,
Bold at 12px in the text colour; "Esc" is the word; letters, ⇧ ↵ ⌫ ⇥ and the arrows stay in Geist
Mono.

Show a chip only for a real shortcut the app binds, at most one shortcut per row, at the row's end
in Menu and CommandMenu, in the CommandMenu footer and in tooltips; never on the primary fill (the
chip is 2.23:1 there). The chip is `aria-hidden`. The item carries `aria-keyshortcuts` ("Meta+K")
and an `aria-describedby` that says it in words ("Command K"), so the name stays "Copy" and not
"Copy C".

On a touch device with no keyboard a shortcut chip has nothing to show, so it hides. A chip that
stands for a key the app binds (`data-shortcut`: Menu and CommandMenu rows, the CommandMenu footer,
tooltip shortcuts, a trigger's chip) and any words that only make sense beside one (`data-kbd-hint`:
a legend, the footer whole, its divider included) are `display: none` on `(hover: none) and
(pointer: coarse)` until a hardware key is pressed. The first Tab or Escape, or any key with
Command, Control or Alt held (never Shift alone, an arrow or "Unidentified"), sets
`<html data-keyboard="hardware">` and remembers it in `sessionStorage` for the tab. Nothing replaces
a hidden chip: the row keeps its word, and a trigger is [icon][word][chip] on a fine pointer and
[icon][word] on touch, at least 44px. A bare `Kbd` in running text is documentation and shows on
every device. The CommandMenu input carries `aria-describedby` for its footer only while the chips
show; `aria-keyshortcuts` always stays. A hybrid device shows chips after its first hardware key.

## Type

### Code syntax

`CodeBlock` uses Shiki's TextMate grammars, the same grammar format used by editors, with a
small Basalt theme. The interface stays monochrome; syntax is a functional exception confined
to code. Four hues, as in most editor themes: keywords and markup tags blue, strings green,
constants amber, functions, types and classes purple. Comments are tertiary grey; operators and
punctuation are secondary grey; identifiers stay in the text colour. Each hue has one
lightness and chroma per theme (dark L 0.80 C 0.09, light L 0.50 C 0.12), so no role shouts
and light mode is no louder than dark. The colours are separate from status and product
accents. Every syntax colour, including comments, meets 4.5:1 on every surface in both
themes and stays inside sRGB.

Planned exception: a future diff view may show added and removed lines in the status success
and danger colours, because there they are status. It needs +/− markers and line
backgrounds as well, so it waits for that component; CodeBlock doesn't colour diffs. The source is the `color.syntax` group, generated into CSS, TypeScript and Swift.

Pass the language explicitly; a title is a display label, not a language detector. Twelve
grammars ship with the package: shell, CSS, HTML, JavaScript, JSON, JSX, Python, SQL, Swift,
TSX, TypeScript and YAML, including their common aliases. Plain text, unsupported languages
and logs over 100,000 UTF-16 code units stay plain. Each grammar is its own chunk in the app's
bundle, loaded the first time a block in that language renders; nothing comes from a CDN.
Until then the code shows as plain text, and colour arrives without moving the layout. An app
that wants highlighted HTML from the server awaits `preloadCodeLanguages([...])` before
rendering. CSS variables switch colours with the theme.
Source is rendered as React text, with its whitespace preserved; copying always uses the
original source. Comments stay upright, by choice.

### Interface type

Geist Sans and Geist Mono (SIL OFL 1.1), variable fonts, at three weights: 400, 500, 600.
In-between weights such as 510 or 590 were considered: SwiftUI and Compose map only whole
steps, so they'd render differently on native.

| Token | Size / line | Tracking | Use |
|---|---|---|---|
| `text-5xl` | 56 / 60 | −0.035em | Display |
| `text-4xl` | 40 / 44 | −0.03em | Page hero |
| `text-3xl` | 30 / 36 | −0.025em | Page title |
| `text-2xl` | 24 / 30 | −0.02em | Section |
| `text-xl` | 20 / 28 | −0.015em | Card title |
| `text-lg` | 18 / 26 | −0.01em | Lead |
| `text-md` | 16 / 24 | −0.005em | Body in docs and marketing |
| `text-base` | 14 / 20 | 0 | Body and controls in apps; the rows of every popup (13 / 18 in compact) |
| `text-sm` | 13 / 18 | 0 | Tables, sidebars, and popup rows in compact density |
| `text-xs` | 12 / 16 | 0.01em | Labels, captions, a field's helper text |

Tabular numerals for tables, metrics and timestamps; Mono for identifiers, code and keys.

## Space, size, radius

- **Space:** a 4px base, with Tailwind-compatible names (`space-4` is 16px), plus the half
  steps 0.5, 1.5, 2.5 and 3.5 (2, 6, 10 and 14px) for control padding and optical spacing.
- **Component sizes are tokens too:** the tab underline (2), tracks (4), dots (6), choice boxes,
  the switch, kbd and badge heights, table rows, and the widths of dialogs, sheets, toasts,
  popovers, tooltips and the command menu, all under `size-*`. Component CSS has no raw
  lengths; Stylelint enforces it, with the screen-reader clip as the one exception.
- **Controls:** 24, 28, 32, 36 and 40px tall; 32 is the app default, and
  `data-density="compact"` moves controls down one step (24px is the floor) and uses 13px
  control text. Set it on `<html>` so portalled menus inherit it; a nested
  `data-density="default"` restores regular sizes. A popup row (Menu, Select, Combobox) is a 36px plate (`size-menu-row`, which is
  `size-control-lg`) in a 40px hit area, and a command menu row a 40px plate in a 44px hit area; compact steps the plates to 32
  and 36; on touch a hit area is at least 44px, and a combobox's text entry is 16px. All shared control targets stay at least 44px on
  touch regardless of density. Choice labels provide their target without enlarging the
  glyph; a standalone choice must be placed inside a target of at least that size by its
  consumer. Text entry is 16px on touch to avoid iOS focus zoom.
- **Radius by role:** 4 (badges, checkboxes), 6 (controls up to 32px, inputs included), 8
  (controls 36px and up), 12 (cards, menus, dialogs), 16 (bottom sheets; full-height side sheets are square), full (avatars and dots only). A
  nested radius is the outer radius minus the padding.

## Elevation

Depth is [levels](#surfaces), and a panel's edge is its rim. Page-level panels have a rim and
nothing else; shadows start at things that float. Menus and popovers use `shadow-overlay`,
dialogs and sheets `shadow-modal` over a scrim, and both are the drop shadow alone: no 1px ring
layer and no page-coloured backing ring, because the rim is the edge. Tables run 40px rows by
default, 32px for logs (`density="compact"`) and 44px for touch.

The rim is one thing, kept to one rule: two solid colours, no gradient along or across the edge, no
inner glow or sheen, no blur, no animation, no outer frame, and no light falloff on the page. The
top is lit by 2 points in dark (8% against 6% white), capped at 8% so it reads as an edge and
not as a highlight. In light every side is the same. Blur belongs only to the header chrome material
(below), never to a panel or its rim.

The Toast's drain line is drawn on the straight part of its bottom rim, 1px, in `text-tertiary`.

### Chrome: the smoked header

An app's own sticky header bar is the one smoked surface in Basalt. Dialogs, sheets, menus, popovers,
toasts, tooltips and the command menu stay solid, as they are: an opaque panel on a scrim is the
overlay, and a translucent layer on a translucent layer is the failure mode.

- **Tokens.** `surface-chrome` is the page colour with alpha: `#000` at 85% in dark, `#fafafa` at
  92% in light. `blur-chrome` is 12px. There is no `saturate()` and no brightness filter: on a
  monochrome page they tint noise or do nothing.
- **The class.** Put `basalt-chrome` on the app's `<header>`. It is a plain class (no component: a header
  is the app's own layout) that sets `position: sticky; top: 0` on the sticky layer, the fill,
  `backdrop-filter: blur(var(--basalt-blur-chrome))` with the `-webkit-` prefix, a 1px bottom
  `border-hairline` line, and primary ink. The bar's line is the exception to "a divider is never brighter than the
  rim" (see Lines): the bar sits on level 0, is not a panel and has no rim, so in dark its line is the hairline
  (14.5% white) where a divider is 6%. In light it is black 8% either way. The council decided this by majority (3-1).
- **Fallbacks, all to opaque.** Without `backdrop-filter` (`@supports not`), under
  `prefers-reduced-transparency: reduce`, and in print, the fill is opaque `surface-page` and there is
  no filter. In forced colours it is `Canvas` and `CanvasText` with a real bottom border and no filter.
- **Ink.** Only `text-primary` and `text-secondary` may sit on it. Over a pure white plate the dark bar
  holds secondary at 5.84:1 (tertiary falls to 4.09:1, below AA), and over a pure black plate the light
  bar holds it at 6.77:1 (tertiary 4.27:1); primary is 12.88:1 or better. The class sets primary ink and
  promotes tertiary text (`Text tone="tertiary"`, a Sparkline axis) to secondary inside it, and no Basalt
  part draws tertiary text on the bar without a fill of its own. An app does not put tertiary there.
- **A pressed ghost Button takes primary ink.** Inside the bar only, a ghost Button held down shows `text-primary`
  on the selected wash (secondary ink is 4.42:1 there on a touch device, where a press is the only state; primary is
  9.75:1 or better). The wash stays. The council decided this by majority (3-1); elsewhere a ghost keeps its ink.
- **No danger Button on the bar.** Destructive actions don't belong in global chrome (the owner's rule). Danger
  text on the bar's washes is below AA where the bar sits over a contrasting backdrop: hover 4.32:1 and pressed
  3.92:1 in dark over white, pressed 4.36:1 in light over black. On the bare bar it passes (5.17:1 and 5.09:1).
- **Under a dialog's scrim the bar stays filtered.** It is the one blurred surface and the scrim over it is
  unblurred, so the two never stack blur (the council decided this 4-0, and it is what is built).
- **Use it once per viewport.** This is a usage rule, not a guarantee. Basalt ships one filtered class and
  no filtered overlay, and a browser test opens the dialogs, sheet, command menu, menus, popovers, tooltip
  and toast together to prove that, but an app can put `basalt-chrome` on a second element. Don't:
  translucent layers never stack, so no smoked dialog under, over or inside the header, and no blur on a
  scrim (80% in dark, 40% in light, unblurred).
- **Where it can go.** The bar sticks to its scroller, so an `overflow` ancestor between the bar and the
  scroller (anything but the scroller itself) stops it sticking. `backdrop-filter` also makes the bar the
  containing block for any `position: fixed` descendant, so a fixed element inside the `<header>` is
  clipped to the bar: portal it out. Basalt's own overlays already portal.
- **Use it where something scrolls under the bar.** If nothing does, an opaque `surface-page` bar is
  the same bar without the layer.

Portals inherit a shared modal-depth context. A menu, select, combobox or popover opened
inside a modal sits above its parent. A necessary nested confirmation has a backdrop above
the previous popup. Tooltips use their intended layer, a tooltip role and an explicit
trigger description while open, preserving any existing description. Keep one focused task at a
time; layering support is not a reason to stack unrelated tasks.

**Level is position, not importance.** A surface in the page's flow is its parent plus one, whatever its
role: a hero, a console or a featured card on the page is level 1, and its input band and the panels
inside it are level 2. Only a surface that leaves the flow (opened above the page, out of the flow,
overlapping other content: a menu, popover, dialog, sheet, toast or tooltip) carries a shadow, and its level
follows the popup and modal rules above: a popup is its opener plus one (a floor of 1), a modal is 1. Don't use `float` or an explicit level to make an in-flow panel look more important;
use space, type and the content. A static picture of a floating surface in documentation is drawn as
that surface. `data-level` is written only to re-base a subtree (a page, a portal, a specimen frame),
never to promote a panel.

The command menu is a modal panel at level 1 (`#0a0a0a` in dark). Its input row is a full-bleed band one level above
the panel (level 2, `#111111`, in dark; white in light, set by the band's own `data-level`, not a fixed surface),
48px, with a divider below and no rim or radius of its own. Its rows are popup rows with a taller plate: 40px (36 when
compact) in a 44px hit area, radius 8, 4px in from each side of the list, 12px between the glyph and the label; the plate stays
lit when the pointer leaves a row, as cmdk does everywhere. Menu, Select and Combobox clear it, as Base UI does, but their rows
touch (the 4px gap between plates is drawn inside the rows, 2px above and below each plate), so a pointer crossing the gap never
leaves one. A panel's padding is 4px inline and 2px block, so a plate is 4px from the rim on every side. It is summoned from the
keyboard many times a day, so it neither opens nor closes with motion, its backdrop included.

## Motion

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0 | Hover-in colour, selection |
| `duration-fast` | 100ms | Hover-out, toggles, colour changes |
| `duration-base` | 150ms | Tooltips, menus, popovers |
| `duration-slow` | 200ms | Dialogs, accordions, tab indicator and panel, glide |
| `duration-slower` | 300ms | Sheets and drawers, a travelling spinner |

Loops are not on this scale: they repeat while work is happening. `duration-loop-ring` is 640ms,
`duration-loop-braille` 530ms and `duration-loop-fade` 1200ms.

| Curve | Value | For |
|---|---|---|
| `ease-out` | `cubic-bezier(.16, 1, .3, 1)` | Entries, and every move that answers input |
| `ease-in` | `cubic-bezier(.4, 0, 1, 1)` | Exits, at three quarters of the entry |
| `ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | A rest-to-rest travel the eye follows (TravelSpinner only), and loop pulses |
| `ease-linear` | `cubic-bezier(0, 0, 1, 1)` | Spinners |

Nothing overshoots: Vercel's overlays overshoot by 10% (`cubic-bezier(.175, .885, .32, 1.1)`);
Basalt's settle. A press is a colour step; Button and IconButton also scale to .98 over `duration-fast`
on `ease-out` while pressed, and back, on `:active` only, never when disabled or loading, and on nothing
else (no row, card, menu item, command row or the parts of a field; there is no `basalt-press` utility). A popup (Menu, Select,
Combobox, Popover, Tooltip) enters from opacity 0 and scale .98, from where it grew
(`--transform-origin`), with no offset, in `duration-base` on `ease-out`, and leaves at three
quarters of that on `ease-in`. The horizontal tab underline, and the panel that moves 8px with it, run on
`duration-slow` `ease-out`; the panel never remounts. Nothing loops except spinners and the line of a
loading Sparkline.

**What persists, stays.** A control or word that is in both states does not remount. Only the
part that changed moves: shared letters stay put, and a change to a panel moves the panel, not the
page.

Under `prefers-reduced-motion`: no transform, no size and no position animates (a press keeps its
colour step and its scale is 1). `duration-base`,
`duration-slow` and `duration-slower` are 100ms, so state changes become short fades; the toast
stack sits at its final offsets and only fades; Progress width jumps; NumberTicker is plain
tabular text at the same width and baseline; the toast drain is not drawn; Sparkline snaps its
scale and labels; a travelling spinner appears at its destination with the same fade; a tab change is
a 100ms crossfade; the horizontal tab underline does not move. Spinners fade or hold still, and a loop is
never cut to 100ms.

The components and what each does are in [Motion and primitives](motion.md).

## Icons

Phosphor (MIT): Bold at 16px, so its line weight matches Vercel's and Linear's 16px icons;
Regular at 20px and up; Fill for selected states. Icons take `currentColor`, default to the
secondary text colour, and turn primary when active. On iOS, system concepts (back, share,
settings) use SF Symbols. Icons for Blacksand's own concepts (sandboxes, substrates,
routes) will be drawn on a 16px grid, as Vercel and Linear draw theirs.

## Primitives

Components build on Base UI (the default base in shadcn/ui since July 2026, from the team
behind Radix), with shadcn/ui's variable names mapped onto Basalt's in `dist/css/shadcn.css`.

Forms retain native labels, grouped legends and validation. Select is for a short known
list; Combobox searches a single known choice. NumberField enters an exact value in one bordered control sized to its content, steppers inside; Slider
adjusts a scalar or range, with distinct names for range thumbs. Confirmations use
AlertDialog with safe initial focus. Sheets use the dialog contract in a scrolling side or
bottom panel, including safe-area padding and motion preferences.

Text and Heading consume the shared type scale; structural heading level is independent
of visual size. Breadcrumbs mark the current location, Pagination renders a bounded page
window, and Link retains native navigation, underlined in the input-boundary colour (3:1) that brightens to the text on hover. Avatar, Separator and EmptyState provide
neutral composition without replacing meaningful words with imagery.

Forced-colours mode uses real borders and system colour keywords for boundaries, focus
and selection. The web tests inspect these structural cues in addition to the themed
contrast checks. Automated checks cover supported states; they are not a substitute for
assistive-technology review in a consuming product.

The SwiftPM `BasaltUI` product implements a core native layer over `BasaltTokens`, including
native entry controls and reusable button/toggle/progress styles. Desktop keeps the token
size scale; iOS and visionOS controls use a 44-point target floor. macOS appearance renders
are verified; runtime checks on other Apple platforms remain app integration work.

## How these were decided

Two design reviewers proposed the original foundations independently and converged on the
initial rounds. Rounds 5–7 and the syntax palette were built without them and reviewed
afterwards: the panel's changes (a four-hue syntax set replacing copied GitHub Primer values,
neutral operators, square side sheets, a grouped NumberField and others) are applied, and the
owner's review is still to come. Vercel's and Linear's values were measured from their live CSS (Vercel's dashboard
and Geist pages; Linear's public site and login screen), not recalled, and used only as
reference: none of their CSS, icons or assets is in this repository.

Motion and primitives (PR #12, #13) were built without the panel and reviewed afterwards; the
surface rules (levels, the rim, the nesting guard, kbd chips, the pressed
primary colour) and the motion rulings were reviewed by the panel in three rounds. The owner has not
approved either yet.

The press scale and the smoked header were decided by the owner (7 Nov 2026) after two council rounds
between the design reviewers; the owner's decisions are in this page's Motion and Chrome sections. Their
implementation has not been reviewed by the panel.

The menus redesign (the depth floor and modal reset, the plate and lift on every popup row, the 36 and 40 rows, the
bar's removal everywhere, selected table rows, vertical tabs and the segmented pill, the forced-colours fix) was
decided by the council in four rounds (their votes are in `.review/council/menus-r2/`, the drawing in
`.review/council/menus-final/`) and approved by the owner on 9 Nov 2026 as drawn, with a menu from a table row at level 2.
