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
| `Field`, `Input` | A visible label always; description and error are linked to the control. |
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
| `Breadcrumbs`, `Pagination`, `Link` | Location, bounded page windows and native destination links. |
| `Text`, `Heading`, `InlineCode` | Token type scale; Heading's semantic `level` is independent of visual `size`. |
| `Avatar`, `Separator`, `EmptyState` | Named image/initials, semantic division and next-step guidance for empty views. |
| `Badge` | Neutral pill; `status` adds a dot. The label says the status in words. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | |
| `TableContainer`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `numeric` cells use tabular numerals; `mono` cells for IDs and hashes. |
| `Tooltip`, `TooltipProvider` | Supplements a name with a linked accessible description; never replaces a label. |
| `Checkbox`, `Switch` | The label is `children`. A switch takes effect immediately; a checkbox on submit. |
| `RadioGroup`, `Radio` | A few options, all visible; arrow keys move the choice. |
| `Select` | `options` of `{ value, label, disabled? }`; labelled by its `Field`. |
| `ToastProvider`, `useToast` | `useToast().show({ title, description?, status?, action?, home?, group?, running? })`, then `update(id, patch)`, `close(id)` or `promise(work, { running, success, error })`. A toast stays until dismissed unless it names a `home` for what it says (`"centre"`, `"row"`, `"key"` or `"page"`; an action needs one that is not the page), and then it closes after 5s. Level 1, three deep, danger announced assertively. |
| `NotificationCentre` | The durable copy a toast points to: a bell button with a dot (count in its name) opening a popover of `entries` (`{ id, title, description?, time, status?, unread?, href? }`), "Mark all as read" and "View all". Presentational: you own the entries, their read state and the page. |
| `CommandMenu` | ⌘K: `groups` of `{ id, label, icon?, description?, shortcut?, keywords?, onSelect }`; you bind the shortcut. A `description` is a second line, and is searched below the label. |
| `CommandList` | The same panel set in the page (no dialog): a level-1 panel whose field keeps focus, with a count in its foot. `label` names it; `detail={(command) => pane}` adds a preview beside the list (a push under 816px); `bindShortcut` gives it ⌘K. One command surface per page owns ⌘K. |
| `Textarea` | Multi-line Field control; controlled or uncontrolled, with the field's label, validation and disabled state. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverTitle`, `PopoverDescription`, `PopoverClose` | Anchored details or a short form; Esc returns focus. |
| `Callout` | Persistent inline information; `status`, `title`, optional `actions`. Success, warning and danger draw a 45% status rim over a neutral fill. Set `live` only when it appears in response to something. |
| `Progress` | Required `label`; `value={null}` for an indeterminate task. |
| `Spinner`, `Skeleton`, `NumberTicker` | Loading and rolling tabular digits. Spinner variants: `ring` (default) and `braille`. `glide` eases a ticker toward its value over `slow`. Honour reduced motion. |
| `MorphIcon`, `TextMorph`, `Sparkline`, `Stepper`, `LivePreview`, `TravelSpinner` | Motion primitives. `Sparkline` is a line and its latest value, not a charting component. See [docs/motion.md](../../docs/motion.md). |
| `CodeBlock` | `code`, optional `language`, `title`, `copyable`. Language-aware syntax; exact-text copying and keyboard scrolling. Each language loads on first use: plain text first, colour moments later. For highlighted server-rendered HTML, `await preloadCodeLanguages(["ts", "bash"])` before rendering. |
| `Accordion`, `AccordionItem` | Secondary detail; keyboard operated, with coordinated panel and caret motion. |
| `Icon`, `Kbd` | `Kbd` draws one chip per key from a string (`"⌘K"`), with ⌘ ⌥ ⌃ as Phosphor icons; show real shortcuts only. `Icon` draws a core glyph (`HomeGlyph`, one module each, 2.25 units on 24 at every size; `selected` closes its opening and fills) or a long-tail Phosphor icon in Bold at 16, 20 and 24 (Fill only when `selected` and `fillSafe`). Every `icon` prop takes any component that accepts `size` and `weight` (the core glyphs and Phosphor's do), and Basalt's declarations name no icon or primitive package. |

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
plain. Logs over 100,000 UTF-16 code units also stay plain to keep long logs responsive.

Colours come from the `syntax-*` tokens and follow the theme, including nested overrides.
Every syntax colour meets AA on the code surface in both themes. Source text is never
interpreted as HTML. Server rendering and offline walkthroughs use the same grammars.

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
