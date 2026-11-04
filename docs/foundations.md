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
- **No ornament that signals "generated":** no top highlights on cards, no gradient
  borders, no glow, no press-shrink, no bounce. Colour never carries meaning alone.
- **Code has its own syntax palette.** Colour inside code helps distinguish language roles;
  it does not change the monochrome interface or carry a product status.
- **Native is first-class.** Tokens are platform-neutral and generate CSS, TypeScript and
  Swift (Kotlin when an Android app needs it). Components are native per platform; tokens, icons and type are shared.

## Colour

All colours are OKLCH and inside sRGB, so every display shows the same colour. The neutrals
are achromatic (no tint) and named by HSL lightness: `neutral-4` is `#0a0a0a`.

### Surfaces

| Role | Dark | Light | Use |
|---|---|---|---|
| `surface-page` | `#000` | `#fafafa` | The page, and app sidebars |
| `surface-raised` | `#0a0a0a` | `#fff` | Cards, tables, secondary buttons |
| `surface-overlay` | `#111111` | `#fff` | Menus, popovers, selects |
| `surface-top` | `#171717` | `#fff` | Tooltips, toasts, the selected pill in a segmented control |
| `surface-sunken` | `#0a0a0a` | `#f5f5f5` | Wells, code blocks |
| `surface-sunken-strong` | `#111111` | `#f0f0f0` | Table headers, segmented-control tracks |

Dark steps up from true black in small increments, as Linear does. Nothing above the page
is pure black, so large moving surfaces never smear on OLED (pixels at `#000` switch fully
off and lag when they turn back on). Light sits the page just below white, as Vercel does,
so white cards lift without a shadow.

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
  on any background (Vercel's technique). Decorative; it carries no required information.
- **Input boundary:** 38% white or 45% black, 3.4:1 or better on every surface (WCAG 1.4.11).
  Vercel's inputs measure 1.35:1, and Linear's borders 1.3:1; neither passes.
- **Focus:** a 2px outline with a 2px offset in the secondary text colour, 6.9:1 or better.
  Outlines survive Windows forced-colours mode; box-shadow rings don't.
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
  `surface-placeholder` and a calm 2s pulse; spinners turn once a second. Under reduced motion
  they fade or hold still.

## Type

### Code syntax

`CodeBlock` uses Shiki's TextMate grammars, the same grammar format used by editors, with a
small Basalt theme. The interface stays monochrome; syntax is a functional exception confined
to code. Keywords are blue, strings green, constants amber, functions purple, types and tags
teal, and comments neutral grey. The colours are separate from status and product accents.
Every syntax colour, including comments, meets 4.5:1 on every surface in both themes and stays
inside sRGB. The source is the `color.syntax` group, generated into CSS, TypeScript and Swift.

Pass the language explicitly; a title is a display label, not a language detector. Twelve
grammars are bundled: shell, CSS, HTML, JavaScript, JSON, JSX, Python, SQL, Swift, TSX,
TypeScript and YAML, including their common aliases. Plain text, unsupported languages and
logs over 100,000 UTF-16 code units stay plain. No language is fetched from the network.
Tokenization works during server rendering, and CSS variables switch colours with the theme.
Source is rendered as React text, with its whitespace preserved; copying always uses the
original source. Comments use the bundled upright Geist Mono rather than a synthetic italic.

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
| `text-xs` | 12 / 16 | 0.01em | Labels, captions |

Tabular numerals for tables, metrics and timestamps; Mono for identifiers, code and keys.

## Space, size, radius

- **Space:** a 4px base, with Tailwind-compatible names (`space-4` is 16px).
- **Controls:** 24, 28, 32, 36 and 40px tall; 32 is the app default, and
  `data-density="compact"` moves controls down one step (24px is the floor) and uses 13px
  control text. Set it on `<html>` so portalled menus inherit it; a nested
  `data-density="default"` restores regular sizes. Menu rows are 32px by default, 28px in
  compact mode, and at least 44px on touch. All shared control targets stay at least 44px on
  touch regardless of density. Choice labels provide their target without enlarging the
  glyph; a standalone choice must be placed inside a target of at least that size by its
  consumer. Text entry is 16px on touch to avoid iOS focus zoom.
- **Radius by role:** 4 (badges, checkboxes), 6 (controls up to 32px), 8 (controls 36px and
  up, inputs), 12 (cards, menus, dialogs), 16 (sheets), full (avatars and dots only). A
  nested radius is the outer radius minus the padding.

## Elevation

Page and raised surfaces use the hairline only. Tables run 40px rows by default, 32px for
logs (`density="compact"`) and 44px for touch. Shadows start at overlays: menus and
popovers use `shadow-overlay`, dialogs and sheets `shadow-modal` over a scrim.

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
(`cubic-bezier(.175, .885, .32, 1.1)`); Basalt's settle. A press is a one-step colour
change, never a scale. Under `prefers-reduced-motion`, nothing moves and state changes
become short fades.

## Icons

Phosphor (MIT): Bold at 16px, so its line weight matches Vercel's and Linear's 16px icons;
Regular at 20px and up; Fill for selected states. Icons take `currentColor`, default to the
secondary text colour, and turn primary when active. On iOS, system concepts (back, share,
settings) use SF Symbols. Icons for Blacksand's own concepts (sandboxes, substrates,
routes) will be drawn on a 16px grid, as Vercel and Linear draw theirs.

## Primitives

Components build on Base UI (the default base in shadcn/ui since July 2026, from the team
behind Radix), with shadcn/ui's variable names mapped onto Basalt's in `dist/css/shadcn.css`.

## How these were decided

Two design reviewers proposed foundations independently, converged, and reviewed every
change. Vercel's and Linear's values were measured from their live CSS (Vercel's dashboard
and Geist pages; Linear's public site and login screen), not recalled, and used only as
reference: none of their CSS, icons or assets is in this repository.
