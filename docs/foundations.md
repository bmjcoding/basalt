# Basalt foundations

The decisions under every Basalt component, and why each was made. The values live in
`packages/tokens/tokens/*.tokens.json`; this page explains them. Change a value there,
and change the reason here.

Basalt is one system for every SRA Syndicate product: Blacksand, srasyndicate.io,
baileymjones.com, N1 and what comes after. The foundation is one warm mineral neutral.
A product adds colour through its own accent, in a few named roles, and nowhere else.

## Principles

- **Meet WCAG 2.2 AA by construction.** Every text, boundary and focus pair is tested on
  every surface it can appear on (`packages/tokens/test/contrast.test.mjs`). A token change
  that breaks a pair fails the build.
- **The page is the darkest layer, in both themes.** Anything closer to you is lighter.
  Light mode never puts a full white page in front of you.
- **Borders build structure; shadows exist only for things that float.**
- **No ornament that signals "generated":** no top highlights on cards, no gradient
  borders, no glow, no press-shrink, no bounce. Colour never carries meaning alone.
- **Native is first-class.** Tokens are platform-neutral and generate CSS, TypeScript and
  Swift (Kotlin when an Android app needs it). Components are native per platform; tokens, icons and type are shared.

## Colour

All colours are OKLCH and inside sRGB, so every display shows the same colour. The neutrals
are a warm mineral ramp: hue 95, chroma about 0.005 to 0.013. Keys such as `neutral-95`
are OKLCH lightness × 100, not HSL percent. The page is volcanic in the dark (`#080806`,
not pure black) and warm paper in the light (`#f2f0e7`, not `#fafafa`). Every surface is
its own step. The full brand palettes and measured contrast are in [brands.md](brands.md).

### Surfaces

| Role | Dark | Light | Use |
|---|---|---|---|
| `surface-page` | `#080806` | `#f2f0e7` | The page, and app sidebars. Darkest of the raised layers. |
| `surface-sunken` | `#100f0c` | `#ebe9e0` | Wells and code blocks. Darker than a card, lighter than the dark page. |
| `surface-sunken-strong` | `#161613` | `#e5e3d9` | Table headers, segmented-control tracks. |
| `surface-raised` | `#1d1c19` | `#f8f7f2` | Cards, tables, secondary buttons. |
| `surface-overlay` | `#252421` | `#fbfaf7` | Menus, popovers, selects. |
| `surface-top` | `#2d2c28` | `#fefdfb` | Tooltips, toasts, the selected pill in a segmented control. |
| `surface-brand` | the page | the page | Product ground. Blacksand replaces it with a flat backlight. Controls never use it. |

Nothing is pure black or pure white. Dark steps up from a volcanic near-black so large
surfaces are not fully off on OLED. Light sits the page on warm paper so a raised card
lifts without a shadow. Raised, overlay and top are three different steps in both themes.

### Text

| Role | Dark | Light | Worst case on any surface |
|---|---|---|---|
| `text-primary` | `#edebe5` | `#23221c` | 11.8:1 / 12.4:1 |
| `text-secondary` | `#b9b7b2` | `#4f4d47` | 7.0:1 / 6.6:1 |
| `text-tertiary` | `#9a9893` | `#5f5e57` | 4.87:1 / 5.07:1 |
| `text-disabled` | `#5c5c5c` | `#a3a3a3` | Exempt (disabled controls only) |

On a hover or selected wash, tertiary text becomes secondary; the wash would take it below
4.5:1. Four text levels were considered and rejected: Linear's fourth (`#62666d`) is 3.0 to
3.45:1, which fails AA.

### Lines, states and actions

- **Hairline:** `0 0 0 1px` at 14.5% white (dark) or 8% black (light), with a second 1px
  ring in the page colour behind it, so the translucent line mixes against the same colour
  on any background (Vercel's technique). Decorative; it carries no required information.
- **Input boundary:** 38% white or 45% black, 3.4:1 or better on every surface (WCAG 1.4.11).
  Vercel's inputs measure 1.35:1, and Linear's borders 1.3:1; neither passes.
- **Focus:** a 2px outline with a 2px offset in `accent-text`, which follows `data-brand`
  and stays at least 4.5:1 on every surface (so it also clears 3:1). Outlines survive
  Windows forced-colours mode; box-shadow rings don't.
- **Accent:** `accent`, `accent-hover`, `accent-pressed`, `accent-subtle`, `on-accent` and
  `accent-text`, plus `accent-counter` for a second small colour. The default is mineral
  Basalt, distinct from the neutral primary action. `data-brand` selects `sra` (ember),
  `blacksand` (no hue; a neutral highlight), `n1` (cobalt, or any hue at fixed lightness
  and chroma via `--basalt-accent-h`) or `portfolio` (teal, with a peach counter).
- **Status:** danger is rose (hue 8), warning is yellow (hue 102–105), success is green
  (hue 152). They stay at least 24° from ember, teal, peach and cobalt. Danger is still
  text plus a hairline, never a fill.
- **Hover and selected:** washes of 6% and 9% white, or 4% and 7% black, so they work on any
  surface. A hovered control's hairline steps up to 24% white or 16% black (`border-hover`). A selected tab or segment is a raised pill with a hairline, not a wash: a wash
  alone is about 1.2:1 and fails 1.4.11.
- **Primary action:** the inverse of the page (near-white on dark, near-black on light),
  brightening to pure white or black on hover.
- **Status:** danger, success and warning, each a dot beside a text label, never a coloured
  badge fill. Danger is also a text colour (4.68:1 or better). There is no filled red button:
  a destructive action is red text on a red hairline, quieter than the primary action, with
  focus starting on Cancel. In tables a status is a plain dot and word, not a pill per row.
- **Disabled** keeps its control's shape with the disabled text colour and a fainter line.
- **Selected rows** carry a 2px bar on the leading edge besides the wash.
- **Checked controls** (checkbox, radio, switch) fill with the primary action colour; a switch
  also moves its thumb. Off is quiet: a tertiary thumb on an input-bordered track.
- **Toasts** carry a dot only for warning and danger; the title says what happened.
- **Callouts** keep a neutral surface; status is the icon and the words, and danger also
  colours its title.
- **Loading:** progress tracks are filled with the input-boundary colour (3:1); skeletons use
  `surface-placeholder` and a calm 2s pulse. The ring spinner turns in 640ms, the braille
  frame steps every 70ms, and the dots fade on that same turn. Under reduced motion they
  fade or hold still. A `NumberTicker` rolls tabular digits in 200ms and snaps when motion
  is reduced; the value is always in the text.

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
| `text-base` | 14 / 20 | 0 | Body and controls in apps |
| `text-sm` | 13 / 18 | 0 | Menus, tables, sidebars |
| `text-xs` | 12 / 16 | 0.01em | Captions |
| `text-label` | 12 / 16 | 0.06em | Mono uppercase eyebrows. Same size as captions, wider tracking. Nothing smaller. |

A product view should use the eyebrow, the UI size (`text-base`), one title (`text-2xl`) and
at most one display size. The 12 and 13 steps both stay: captions and compact controls are
different jobs. `text-5xl` stays for the rare editorial display and is not a default UI size.
Tabular numerals (`Text tabular`, or `.basalt-tabular`) for tables, metrics and timestamps.
Mono for identifiers, code, keys and eyebrows.

Geist and Geist Mono remain the UI faces. Instrument Serif, Newsreader and Fraunces are OFL
candidates for editorial moments only, shown in [type-specimens.md](type-specimens.md). None
is the default.

## Space, size, radius

- **Space:** a 4px base, with Tailwind-compatible names (`space-4` is 16px), plus the half
  steps 0.5, 1.5, 2.5 and 3.5 (2, 6, 10 and 14px) for control padding and optical spacing.
- **Component sizes are tokens too:** indicator bars (2), tracks (4), dots (6), choice boxes,
  the switch, kbd and badge heights, table rows, and the widths of dialogs, sheets, toasts,
  popovers, tooltips and the command menu, all under `size-*`. Component CSS has no raw
  lengths; Stylelint enforces it, with the screen-reader clip as the one exception.
- **Controls:** 24, 28, 32, 36 and 40px tall; 32 is the app default, and
  `data-density="compact"` moves controls down one step (24px is the floor) and uses 13px
  control text. Set it on `<html>` so portalled menus inherit it; a nested
  `data-density="default"` restores regular sizes. Menu rows are 32px by default, 28px in
  compact mode, and at least 44px on touch. All shared control targets stay at least 44px on
  touch regardless of density. Choice labels provide their target without enlarging the
  glyph; a standalone choice must be placed inside a target of at least that size by its
  consumer. Text entry is 16px on touch to avoid iOS focus zoom.
- **Radius by role:** 4 (badges, checkboxes), 6 (controls up to 32px, inputs included), 8
  (controls 36px and up), 12 (cards, menus, dialogs), 16 (bottom sheets; full-height side sheets are square), full (avatars and dots only). A
  nested radius is the outer radius minus the padding.

## Elevation

Page and raised surfaces use the hairline only. Tables run 40px rows by default, 32px for
logs (`density="compact"`) and 44px for touch. Shadows start at overlays: menus and
popovers use `shadow-overlay`, dialogs and sheets `shadow-modal` over a scrim.

Portals inherit a shared modal-depth context. A menu, select, combobox or popover opened
inside a modal sits above its parent. A necessary nested confirmation has a backdrop above
the previous popup. Tooltips use their intended layer, a tooltip role and an explicit
trigger description while open, preserving any existing description. Keep one focused task at a
time; layering support is not a reason to stack unrelated tasks.

## Motion

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0 | Hover-in colour, selection |
| `duration-fast` | 100ms | Hover-out, toggles, colour changes |
| `duration-base` | 150ms | Tooltips, menus, popovers |
| `duration-slow` | 200ms | Dialogs, accordions |
| `duration-slower` | 300ms | Sheets and drawers |

Entries ease out with `cubic-bezier(.16, 1, .3, 1)`; exits run at three quarters of their
entry with `ease-in`. Nothing overshoots: Vercel's overlays overshoot by 10%
(`cubic-bezier(.175, .885, .32, 1.1)`); Basalt's settle. A press is a darker colour step in 80ms, never a scale. Under `prefers-reduced-motion`,
nothing moves and state changes become short fades. Spinners may loop; nothing else does.

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
