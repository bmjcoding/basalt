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
The package entry declares `"use client"` for React Server Component consumers. Import the
styles and font sheet once in your application's root layout.

Set `data-density="compact"` on `<html>` to move controls down one size (24px minimum).
Portalled menus inherit it too; a nested `data-density="default"` restores regular sizing.
Touch keeps at least 44px targets in either mode, and text entry stays 16px to avoid iOS
focus zoom. Choice labels provide their larger target; if a checkbox, radio or switch has
no `children`, its consumer must provide the surrounding touch target and accessible name.

## Components

| Component | Notes |
|---|---|
| `Button`, `IconButton` | `primary`, `secondary`, `ghost`, `danger`; sizes `xs`–`xl` (24–40px). `IconButton` requires `label`. |
| `Field`, `Input` | A visible label always; description and error are linked to the control. `required` shows "Required" directly after the label (tertiary, `text-xs`, hidden from assistive technology) and the `Input` inside carries `required`; `optional` shows "Optional"; a field marked neither shows nothing. Never an asterisk. |
| `Form`, `Fieldset` | Validated submission of named fields; a visible legend and group disabling. |
| `Combobox` | Search a single selection from `{ value, label, disabled? }` options; labelled by Field. |
| `NumberField` | Locale-aware number entry; min, max, step, format and bounded increment/decrement. |
| `Slider` | Required `label`; scalar or range; `thumbLabels` and `getValueText` for meaningful spoken values. |
| `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuGroup`, `MenuGroupLabel`, `MenuSeparator` | Items take `icon`, `shortcut`, `danger`. |
| `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem`, `MenuSubmenu`, `MenuSubmenuTrigger` | Persistent settings and nested actions, with state marks and keyboard navigation. |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogActions`, `DialogClose` | Focus is trapped; Esc closes; focus returns to the trigger. |
| `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogActions`, `AlertDialogCancel`, `AlertDialogAction` | Explicit confirmation; cancel receives initial focus, outside clicks do not dismiss. |
| `Sheet`, `SheetTrigger`, `SheetContent`, `SheetTitle`, `SheetDescription`, `SheetActions`, `SheetClose` | Dialog behaviour in a right, left or bottom panel. `SheetActions` stays pinned to the foot when it is the last child of `SheetContent`, or of a `Form` placed directly in it. |
| `Tabs`, `TabsList`, `Tab`, `TabsPanel` | For panels of one view. |
| `SegmentedControl`, `Segment` | One choice that filters the current view; never empty. |
| `Breadcrumbs`, `Pagination`, `Link` | Location, bounded page windows and native destination links. On a coarse pointer a `Link` on a line of its own has a 44 by 44 hit box (a pseudo-element widens a short link; its line and look do not change), and a link in a sentence keeps its line. A known limit: two standalone links on neighbouring lines less than 24px apart have hit boxes that overlap there. |
| `SocialLinks`, `SocialLink`, `ProfileLinks`, `ProfileLink` | A glyph and the service's name (`service`: github, x, linkedin, instagram, youtube, email; none for a service without a mark). `SocialLinks` is the row (`size` 16 or 20; `iconOnly` for a row made entirely of marks); `ProfileLinks` is the long form, with `handle` as the hint. |
| `Text`, `Heading`, `InlineCode` | Token type scale; Heading's semantic `level` is independent of visual `size`. |
| `Lead`, `PageRow`, `PageSections`, `PageSection`, `SectionIntro`, `SectionActions`, `Columns`, `ColumnsItem` | A site page's lead, row, sections and twelve-track columns; `Heading size` also takes `"6xl"`, `"7xl"` and the roles `"hero"` and `"display"` (see foundations, Display type); in development `Columns` and `ColumnsItem` log a warning for a display or hero heading (or a fixed `6xl` or `7xl`) in a column under 7 of 12 tracks from 1024, whether a named layout or an item's own `span` makes it, and a production build holds none of that code. |
| `Avatar`, `Separator`, `EmptyState` | Named image/initials, semantic division and next-step guidance for empty views. |
| `Badge` | Neutral pill; `status` adds a dot (success, warning, danger, accent, pending, or `"neutral"` by name). No `status` is the word alone; a running badge (a braille `Spinner` first) draws no dot. The label says the status in words. In forced colours every dot is a disc in the system colour of where it sits. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `CardTitle` is an `h3`; give it `level` (2 to 6) to put the card in the page's outline where it belongs. The size and weight stay the same at every level. |
| `TableContainer`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `numeric` cells use tabular numerals, end-aligned with their header; `mono` cells for IDs and hashes. Give `TableContainer` a `label` ("Runs table"): while the table is wider than its box the container is a keyboard stop with that name as a `region`, so the hidden columns can be scrolled to without a pointer (an `aria-label` or `aria-labelledby` works too; with neither it is still a stop but has no role). On touch a lone checkbox or link in a cell has a 44px hit box. In a still table (`columns`) a cell whose text is cut by the ellipsis is a focus stop (`data-cut`, `tabindex="0"`), and on hover or focus its whole value opens in place on a level-3 plate (Esc closes it; it is `aria-hidden`, the cell holds the value); each cut cell is one added tab stop. Size a column of one fixed form (a date, a time, a status) for its longest form under WCAG 1.4.12 spacing, so only free text is cut, and size a header's label to fit its column under the same spacing: a cut sortable header opens no plate (the sort button is the whole cell and its name holds the label), a plain header does. A `Table` renders every row it is given (see [Long lists](#long-lists)): page one that can pass a few hundred rows with `Pagination`. |
| `Tooltip`, `TooltipProvider` | Supplements a name with a linked accessible description; never replaces a label. |
| `Checkbox`, `Switch` | The label is `children`. A switch takes effect immediately; a checkbox on submit. |
| `RadioGroup`, `Radio` | A few options, all visible; arrow keys move the choice. |
| `Select` | `options` of `{ value, label, disabled? }`; labelled by its `Field`. |
| `ToastProvider`, `useToast` | `useToast().show({ title, description?, status?, action?, home?, group?, running? })`, then `update(id, patch)`, `close(id)` or `promise(work, { running, success, error })`. A toast stays until dismissed unless it names a `home` for what it says (`"centre"`, `"row"`, `"key"` or `"page"`; an action needs one that is not the page), and then it closes after 5s. Level 1, three deep, danger announced assertively. A toast with an `action` is announced with one more sentence: "Undo is available. Press F6 to reach it." (F6 moves to the stack's named region, where the action is a stop.) Pass `actionWords={(label) => string}` to `ToastProvider` to say it in another language or other words; a toast with no action says nothing extra. Nothing extra is drawn, and it is said once. |
| `NotificationCentre` | The durable copy a toast points to: a bell button with a dot (count in its name) opening a popover of `entries` (`{ id, title, description?, time, status?, unread?, href? }`), "Mark all as read" and "View all". Presentational: you own the entries, their read state and the page. |
| `CommandMenu` | ⌘K: `groups` of `{ id, label, icon?, description?, shortcut?, keywords?, onSelect }`; you bind the shortcut. A `description` is a second line, and is searched below the label. |
| `CommandList` | The same panel set in the page (no dialog): a level-1 panel whose field keeps focus, with a count in its foot. `label` names it; `detail={(command) => pane}` adds a preview beside the list (a push under 816px); `bindShortcut` gives it ⌘K. One command surface per page owns ⌘K. |
| `Textarea` | Multi-line Field control; controlled or uncontrolled, with the field's label, validation and disabled state. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverTitle`, `PopoverDescription`, `PopoverClose` | Anchored details or a short form; Esc returns focus. `PopoverContent` and `MenuContent` take placement props, and one `Popover` can serve many triggers: see [Placement, one popover for many triggers and small parts](#placement-one-popover-for-many-triggers-and-small-parts). |
| `Callout` | Persistent inline information; `status`, `title`, optional `actions`. Success, warning and danger draw a 45% status rim over a neutral fill. Set `live` only when it appears in response to something. |
| `Progress` | Required `label`; `value={null}` for an indeterminate task. |
| `Spinner`, `Skeleton`, `NumberTicker` | Loading and rolling tabular digits. Spinner variants: `ring` (default) and `braille`. `glide` eases a ticker toward its value over `slow`. Under reduced motion and in forced colours the strips are hidden, the number is plain tabular text in the sentence's own line, and a new value changes in place; the system then paints one selection band and its selected-text colour on the digits. A ticker is an inline box, so in a stretched flex row its digits sit where a plain-text sibling's text sits, not on the bottom of the row as they used to (the sparkline's own headline keeps its place). |
| `MorphIcon`, `TextMorph`, `Sparkline`, `Stepper`, `LivePreview`, `TravelSpinner` | Motion primitives. `Sparkline` is a line and its latest value, not a charting component. See [docs/motion.md](../../docs/motion.md). `TextMorph`'s `label` is what a screen reader hears when `text` changes, if that should say more than the glyphs show; nothing extra is drawn. `Stepper` is a `group` named "Steps" (`label` sets the name), and the step's name is read with where the user is: "Step 2 of 3: Review", once, when it changes. `positionLabel={(step, total) => string}` sets those words for another language. |
| `CodeBlock` | `code`, optional `language`, `title`, `copyable`. Language-aware syntax; exact-text copying and keyboard scrolling. Each language loads on first use: plain text first, colour moments later. For highlighted server-rendered HTML, `await preloadCodeLanguages(["ts", "bash"])` before rendering. |
| `Accordion`, `AccordionItem` | Secondary detail; keyboard operated, with coordinated panel and caret motion. An item's header is an `h3`; `headingLevel` (2 to 6) sets its level in the page's outline, and it draws the same at every level. |
| `Toolbar`, `ToolbarButton`, `ToolbarIconButton`, `ToolbarLink`, `ToolbarInput`, `ToolbarGroup`, `ToolbarSeparator` | One tab stop for a row (or column) of controls, as the WAI-ARIA toolbar pattern describes: the arrow keys along its `orientation` move between the controls and wrap (`loopFocus={false}` stops at the ends), Home and End go to the first and last, and in a right-to-left page the arrows follow the page. See [Toolbar](#toolbar). |
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
| `LoopsToggle`, `LoopsToggleIcon` | The hold on every loop, on `useLoops`: `form="icon"` (default; an icon-only ghost toggle with the core `pause` glyph, named by its `title` alone, for `SiteHeader`'s `loopsToggle` slot, before the theme toggle; import `LoopsToggleIcon` to load no `Switch`), `form="button"` (a pressed-toggle Button; `SiteHeader` draws it as its narrow menu's first row when `loopsToggle` is passed) or `form="switch"` (a settings row with the description "Moving art and spinners hold still. Your work keeps running."). The name is always "Pause animations". |
| `ambient(index)`, `AmbientMark`, `AMBIENT_MAX` | A page's one ambient loop: opacity only, in a `Stage`'s art or a framed drawing, at most 24 marks of `size-dot`. `ambient(i)` returns the props for any element; `AmbientMark` is a `size-dot` span. Held by the hold, still under reduced motion, in forced colours and in print. |
| `Reflow`, `ReflowItem` | A list or grid that is filtered or sorted: `order` names the ids shown, every `ReflowItem` stays mounted (an item not shown is `hidden`), and the items that stay move by transform. `fallbackFocus` is the result line focus falls back to; `onReflow` reports what moved. |
| `TimeChart`'s `entrance` | Makes a chart its page's one entrance (see `docs/motion.md`). `entranceVerdict`, `entranceSeen`, `markEntranceSeen`, `forgetEntrance` and `entranceKey` are the rule's parts; `entranceStep` is the stagger's step; `markPageChange()` is what a router calls when a page change without a reload begins, so the next chart's gates run from the change. |
| `travelLeg`, `travelRun`, `createTravellers`, `travelTokens` | The timing of a travel the eye follows (a leg of `duration-slower` up to 150px, 2ms a pixel above, `duration-figure` from 300px, a 200ms rest, a run inside five seconds) and its in-flight rule (one traveller a trigger; a third lands the oldest at once). |

**The theme.** `useTheme()` returns `{ theme, choice, setChoice, ready }`: `theme` is `"light"` or `"dark"`, what the stylesheet is showing; `choice` is `"light"`, `"dark"` or `"system"` (no stored value); `setChoice(choice)` stores it and writes `data-theme` on `<html>`; `"system"` removes the stored value. While the choice is `system` the theme follows the device's colour scheme as it changes, and a change made in another tab arrives by the `storage` event. The key is `basalt-theme` with the values `light` and `dark`: the same as the HTML skill's, so a React app and a skill page on one origin agree (anything else stored counts as `system`, as it does there). **Before the client knows the theme** (a server render, and the first render of a hydrating page) it returns `{ theme: "light", choice: "system", ready: false }`, the stylesheet's own default with no `data-theme`, so the first render is the same on both; the real values follow at once with `ready: true`. Hold back a control that would flash the wrong choice until `ready`. With storage blocked, the choice lasts for the page. Nothing runs at import: the listeners are installed by the first `useTheme()` and removed with the last. Put the head script in the document so the theme applies before the first frame, the way `loopsBootstrap` does: `<script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />`. It applies the stored choice, else the system's, exactly as the skill's head snippet does for the theme (the skill's goes on to restore the keyboard hint; this one does not). Basalt draws no toggle: the control is the app's.

## A skip link, reserved room and a page's own sticky bar

None of these changes how anything looks: each is an existing look or rule, exported.

| Export | What it is |
|---|---|
| `SkipLink` | The first thing on a page: a link past the bar and the navigation to the content. `<SkipLink target="main" />` renders `<a href="#main">Skip to content</a>`; the words are `children`, so an app in another language replaces them, and any anchor prop passes through (`target` may carry its `#`). It is unseen until it has focus. With a sticky bar (`SiteHeader`, `AppHeader` or your own `.basalt-sticky-bar`) it then hangs under the bar, space-2 below its line, on the brand's start edge at every width, so it covers nothing in the bar; without one it sits at the page's top start (space-2 in). **How it finds the bar:** when it takes focus it reads the real bottom edge of the first element matching `.basalt-site-header, .basalt-app-header, .basalt-sticky-bar` and sits space-2 below it, and reads it again on scroll and resize while it holds focus, so a bar that is not at the top of the viewport (a notice above it) is still cleared; with no script or no bar it is where the stylesheet puts it, under a bar at the top. It floats like a tooltip (level 3, the rim, `shadow-overlay`, radius 8) on the toast layer; 44px tall on a coarse pointer; not drawn in print. It is the HTML skill's `.skip-link`, drawn with the same tokens. **The app places it itself, as the first element of the page** (before the bar, so it is the first tab stop): `AppShell` and `SiteHeader` render none. Give the target `tabIndex={-1}` so following the link moves focus to it (`AppShell`: `mainProps={{ id: "main", tabIndex: -1 }}`); a target that cannot take focus starts the next Tab there instead. |
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

`SheetContent side="right"` defaults to a right panel; `left` and `bottom` are available.
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

- **A table of runs** (seven columns, a checkbox in each row, sortable headings, a filter field). Ticking a row, filtering, sorting and
  selecting all each take time that grows with the row count; no figures are given here yet. When the app keeps each row's props and children the same between renders (`TableRow`,
  `TableRowHead` and `TableCell` are memoised, so an unchanged row is not rendered again) a tick or a filter renders only the rows
  that changed. Page a table that can grow past a few hundred rows with `Pagination`, and keep each page's rows stable.
- **`Select`, `Combobox` and `CommandMenu`** open in 85 to 110 ms with 30 items and 270 to 310 ms with 1,000, a cost that grows with
  the count (measured at 30 and 1,000 items; between them it is close to a straight line, which puts 200 ms at about 500 items).
  Open comfortably up to a few hundred items. Past that, search on the server and send the first matches (and say how many more
  there are), or show a shorter list.
- **A `MultiSelect` checklist** opens in 640 ms with 1,000 options and a tick takes 470 ms. The highlight following the pointer is
  cheap at any length; opening and ticking are not. A few hundred options is the comfortable limit.

These are the numbers on the day they were measured (the 1-minute load was 3 to 6), not a promise; they tell an app where to start
paging. `docs/foundations.md` states no list-length budget.

## Test

```sh
npm test
```

Typechecks, builds, then runs the browser tests on a page with every component
(`test/demo.tsx`), in both themes:

- axe-core finds no WCAG 2.2 A or AA violations, at rest and with the menu and dialog open;
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
