// The words and previews of the Basalt reference. The values are not here: they come from
// the tokens at build time. Keep this in step with docs/foundations.md.
import { COMPLETION_DOCS, COMPLETION_PREVIEWS } from "./completion-content.mjs";

export const README = `Basalt is the design system for every SRA Syndicate product: Blacksand, srasyndicate.io, baileymjones.com, N1 and what comes next. It is monochrome. A product adds colour through one of Basalt's accent classes, in its named roles, and nowhere else.

Build with the React package and its one stylesheet:

\`\`\`tsx
import "@srasyndicate/basalt/fonts.css";
import "@srasyndicate/basalt/styles.css";
import { Button } from "@srasyndicate/basalt";

<Button variant="primary">Deploy</Button>
\`\`\`

Every value below is a token. Use the token, never its value: \`var(--basalt-surface-raised)\`, not \`#0a0a0a\`.

## Content

- Write plainly, in sentence case, in the second person when you address someone ("Your sandbox is ready"), never "we" for the product.
- A button says what happens: **Deploy**, **Delete sandbox**, **Cancel**. Never "OK", "Submit" or "Click here".
- A destructive confirmation names the thing and the consequence: "Delete blacksand-api? Its runs and records stay. The sandbox and its routes are removed, and this can't be undone."
- Every field has a visible label. Placeholder text is an example, never the label.
- Statuses are words: **Ready**, **Building**, **Error**. A dot may sit beside the word; it never replaces it.
- No emoji, no exclamation marks, no filler ("Seamlessly", "Supercharge"). Numbers, times and identifiers are exact: \`4m 12s\`, \`a81f3c2\`.

## Colour

- The page is the darkest layer in both themes, and everything closer to you is lighter. Light mode never puts a full white page in front of anyone.
- Dark: \`basalt-surface-page\` is true black, and raised layers step up in small increments (\`basalt-surface-raised\`, \`basalt-surface-overlay\`, \`basalt-surface-top\`). Nothing above the page is pure black, so large moving surfaces never smear on OLED screens.
- Light: \`basalt-surface-page\` sits just below white, so white cards lift without a shadow; sunken areas (\`basalt-surface-sunken\`, \`basalt-surface-sunken-strong\`) step darker.
- Text comes in three levels: \`basalt-text-primary\`, \`basalt-text-secondary\`, \`basalt-text-tertiary\`. All three meet 4.5:1 on every surface in both themes. On a hover or selected wash, tertiary text becomes secondary.
- Lines: a panel's edge is its rim (\`basalt-border-rim\`, a real 1px border, lit 2 points more on top in dark); \`shadow-hairline\` frames controls; \`basalt-border-divider\` separates rows and groups; \`basalt-border-input\` bounds inputs at 3:1 or better.
- Hover is a wash (\`basalt-state-hover\`) or one step brighter on a hairline (\`basalt-border-hover\`). Selected is a wash **plus** a second cue: a pill, a check, a checked box, or a step in ink. There is no vertical bar anywhere.
- The primary action (\`basalt-action-primary\`) is the inverse of the page: one per view.
- Status colour is a dot beside a word, never a coloured fill. \`basalt-status-danger\` is also the text of destructive actions, on a red hairline. There is no filled red button.
- Every colour sits inside sRGB, so every display shows the same colour.
- Syntax colours stay inside code: blue keywords, green strings, amber constants, purple functions, teal types and neutral comments. Every \`basalt-syntax-*\` text colour meets 4.5:1; these are separate from status and accent classes.

## Type

- Geist for everything, Geist Mono for identifiers, hashes, keys and code. Three weights: 400 (\`basalt-font-weight-regular\`), 500 (\`basalt-font-weight-medium\`), 600 (\`basalt-font-weight-semibold\`).
- Apps run on \`body\` (14/20); menus, tables and sidebars on \`small\` (13/18); docs and marketing on \`body-docs\` (16/24). Headings tighten as they grow, from \`card-title\` to \`display\`.
- Numbers in tables, metrics and timestamps use tabular figures.

## Space, size, radius

- Space on a 4px base: \`basalt-space-4\` is 16px. Cards and table cells pad \`basalt-space-4\`; dialogs \`basalt-space-6\`.
- Controls are 24, 28, 32, 36 or 40px tall; 32 (\`basalt-size-control-md\`) is the app default. Touch targets are at least 44px (\`basalt-size-tap-min\`).
- Set \`data-density="compact"\` on \`html\` for controls one step smaller, with 24px as the floor; a nested \`data-density="default"\` restores regular sizes. Portalled menus inherit the app density. Touch retains 44px targets and 16px text entry regardless of density. A standalone choice needs its consumer to provide the labelled touch target.
- Radius by role: \`basalt-radius-xs\` for badges and checkboxes, \`basalt-radius-sm\` for controls up to 32px, \`basalt-radius-md\` from 36px, \`basalt-radius-lg\` for cards, menus and dialogs, \`basalt-radius-full\` for avatars and dots only. A nested radius is the outer radius minus the padding.

## Elevation and motion

- Depth is four levels (\`basalt-surface-0\` to \`3\`); a panel is one level above what it sits in and 3 is the cap. Every panel has a rim and nothing else. Shadows start at things that float: \`shadow-overlay\` for menus, popovers and tooltips; \`shadow-modal\` for dialogs, over \`basalt-scrim\`.
- One rim per panel, in two solid colours: no gradient along or across an edge, no glow or sheen, no coloured left borders.
- Entries ease out (\`basalt-ease-out\`) and settle without overshoot; exits run at three quarters of their entry with \`basalt-ease-in\`. Menus take \`basalt-duration-base\`, dialogs \`basalt-duration-slow\`.
- A press is a colour step, and Button and IconButton also scale to .98 for 100ms on ease-out (scale 1 under reduced motion). Never on a disabled or loading button, a row, a card, a menu item, a command row or the parts of a field. A Button that opens a Menu doesn't press; the menu opening is the response. Under reduced motion nothing else moves; state changes become short fades.
- The only smoked surface is the sticky header, \`basalt-chrome\`: the page colour at 85% in dark and 92% in light, blur 12px, no saturate. Dialogs, sheets, menus, popovers and toasts stay solid.

## Iconography

- Icons are [Phosphor](https://phosphoricons.com), in \`currentColor\`: Bold at 16px (\`basalt-size-icon-sm\`), Regular at 20px and up, Fill for a selected state. The \`Icon\` component picks the weight from the size.
- Icons default to \`basalt-text-secondary\` and turn primary when active. An icon beside a label is decorative and hidden from screen readers; an icon-only button carries a label.
- No icon repeats down a column unless it says something that differs by row.
- On iOS, system ideas (back, share, settings) use SF Symbols.

## Accessibility

- Everything meets WCAG 2.2 AA: text 4.5:1 on every surface, control boundaries and focus 3:1, in both themes. The tokens are tested for it on every build.
- Focus is a 2px outline in \`basalt-border-focus\`, offset 2px, on every focusable control. Outlines survive forced-colours mode.
- Menus, dialogs, tabs and the segmented control work from the keyboard. Esc closes overlays and returns focus where it came from; a destructive dialog opens on Cancel.

## Composing tasks

- Form coordinates validation of named Fields. Fieldset gives related fields a visible legend and a shared disabled state. Labels stay visible even when the control has a placeholder.
- Select chooses from a short list; Combobox searches a known single choice. NumberField enters an exact value; Slider adjusts a scalar or range with named thumbs.
- AlertDialog puts safe initial focus on its cancel action and ignores outside clicks. Sheet uses the dialog contract in a scrolling right, left or bottom panel. Floating controls inherit their parent modal's layer.
- Text and Heading use the shared scale; heading level follows document structure independently of visual size. Breadcrumbs, Pagination and Link retain native navigation semantics.
- Avatar uses a named initials fallback. EmptyState explains the condition and the next useful action, without announcing an initial empty view as an error.
- The native BasaltUI package implements core SwiftUI controls using the same tokens. macOS appearance renders are verified; iOS and visionOS runtime review is separate.
- Completion rounds 5–7 await owner review. Generated reference material does not imply a published release or approval of those additions.
`;

const doc = (title, body) => `# ${title}\n\n${body.trim()}\n`;

export const COMPONENT_DOCS = {
  ...COMPLETION_DOCS,
  Button: doc("Button", `
A button runs an action; \`IconButton\` is the same with only an icon.

**Variants.** \`primary\` for the one main action in a view; \`secondary\` (the default) for the rest; \`ghost\` for low-emphasis actions in toolbars and card footers; \`danger\` for destructive actions: red text on a red hairline, never a fill.

**Sizes.** \`xs\` 24, \`sm\` 28, \`md\` 32 (the default), \`lg\` 36, \`xl\` 40.

**You provide** the label (\`children\`), and optionally \`icon\` (before) or \`iconEnd\` (after, e.g. a caret), as Phosphor icons. \`IconButton\` requires \`label\`: it is the button's accessible name.

- Do say what happens: "Deploy", "Delete sandbox".
- Do put the primary action last in a row, after Cancel.
- Don't use more than one \`primary\` per view, or \`danger\` for anything reversible.
- Disabled keeps its variant's shape; prefer explaining why an action is unavailable to disabling it silently.
`),
  Field: doc("Field", `
A labelled form field: label, control, description and error, wired together for screen readers.

**You provide** \`label\` (always visible), the control as \`children\` (usually \`Input\`), and optionally \`description\` and \`error\`. Set \`invalid\` to show the error.

\`Input\` takes \`controlSize\` (\`xs\` to \`xl\`, default \`md\`) and every native input prop. Its boundary is \`basalt-border-input\` (3:1 or better); invalid turns it \`basalt-status-danger\`.

- Do write errors that say how to fix it: "Enter a host, for example api.anthropic.com."
- Don't use placeholder text as the label.
`),
  Menu: doc("Menu", `
A menu of actions on a trigger, opened by click or keyboard and dismissed by Esc or an outside click.

**You provide** \`MenuTrigger\` (usually \`render={<Button>…</Button>}\`), \`MenuContent\`, and \`MenuItem\`s. Items take \`icon\`, \`shortcut\` (e.g. "⌘D") and \`danger\`. Group with \`MenuGroup\` and \`MenuGroupLabel\`; separate with \`MenuSeparator\`.

Use MenuCheckboxItem for independent settings, MenuRadioGroup/MenuRadioItem for one choice, and MenuSubmenu/MenuSubmenuTrigger with a nested MenuContent for secondary actions. State marks accompany the wash. Choice changes keep the menu open by default; ArrowRight opens a submenu and Escape returns to its parent.

A row is a 36px plate (\`basalt-size-menu-row\`) in a 40px hit area, in 14/20 text (13 when compact): the 4px gap between plates is drawn inside the rows. The popup takes its opener's level plus one, with a floor of 1 (\`#0a0a0a\` from the page in dark), \`shadow-overlay\`, radius \`basalt-radius-lg\`; rows have radius \`basalt-radius-md\`. The active row is a plate in the selected wash plus a lift from secondary ink to primary: no bar, no weight change.

- Do put destructive items last, after a separator.
- Don't hide the only way to do something in a menu.
`),
  Dialog: doc("Dialog", `
A modal dialog for a decision that interrupts: focus moves into it, stays inside, and returns to the trigger when it closes; Esc closes it.

**You provide** \`DialogTrigger\`, \`DialogContent\` with a \`DialogTitle\` (required: it names the dialog), a \`DialogDescription\`, and \`DialogActions\` holding \`DialogClose\` buttons: Cancel first, the action last.

For destructive confirmations the action is \`variant="danger"\`, never primary, and focus starts on Cancel.

- Do name the thing and the consequence in the title and description.
- Don't open a dialog on page load. Prefer one task at a time; use AlertDialog for a necessary confirmation inside a task.
`),
  Tabs: doc("Tabs", `
Tabs switch between panels of one view.

**You provide** \`Tabs\` with a \`defaultValue\` or \`value\`, a \`TabsList\` (give it an \`aria-label\`) of \`Tab\`s, and one \`TabsPanel\` per tab with the same \`value\`.

In a horizontal bar the active tab is marked by a 2px underline in \`basalt-text-primary\` that slides between tabs, not by colour alone. Vertical tabs are a column of 36px pills in a track, with no divider and no indicator. Arrow keys move between tabs.

- Use \`SegmentedControl\` instead when the options filter one view rather than switch panels.
`),
  SegmentedControl: doc("SegmentedControl", `
One choice among a few options that filter or change the current view: a time range, a layout.

**You provide** \`aria-label\` (required), \`value\` and \`onValueChange\` (or \`defaultValue\`), and \`Segment\`s with a \`value\` each. Exactly one segment is always selected: pressing the selected one again keeps it.

The selected segment is a raised pill (\`basalt-surface-top\` with \`shadow-pill\`) on a \`basalt-surface-sunken-strong\` track, so it is visible without colour.
`),
  Badge: doc("Badge", `
A small label, such as a deployment state.

**You provide** the words as \`children\`, and optionally \`status\` (\`success\`, \`warning\`, \`danger\`) to add a dot. \`variant="plain"\` drops the frame: dot and word only, for statuses that repeat down a table column.

- Do write the status as a word; the dot never carries it alone.
- Don't fill a badge with colour.
`),
  Card: doc("Card", `
A raised surface grouping one thing: a sandbox, a metric, a setting.

**You provide** \`CardHeader\` (with \`CardTitle\` and \`CardDescription\`), \`CardContent\`, and optionally \`CardFooter\` for actions, right-aligned.

Cards are \`basalt-surface-raised\` with the rim (\`basalt-border-rim\`) and radius \`basalt-radius-lg\`. No shadow, no gradient, no coloured edge.
`),
  Table: doc("Table", `
A data table in a rounded, bordered frame that scrolls sideways when it must.

**You provide** \`TableContainer\` (set \`density\`: \`compact\` 32px rows for logs, \`default\` 40px, \`comfortable\` 44px), \`Table\` with a \`<caption>\`, \`TableHeader\` and \`TableBody\` of \`TableRow\`s, \`TableHead\`s and \`TableCell\`s. Cells take \`numeric\` (right-aligned, tabular figures) and \`mono\` (identifiers and hashes). Rows take \`selected\`.

A selected row is the selected wash as a band, with no bar: its checked box (a checkbox column, labelled with \`aria-label\`, and a mixed header box) carries the state, and the app says the count in words in a polite live region. Headers are \`small\`-weight labels on \`basalt-surface-sunken-strong\`.

- Do show statuses as \`<Badge variant="plain">\`.
- Don't put the same icon on every row.
`),
  Tooltip: doc("Tooltip", `
A short hint on hover or focus that supplements a control's name; it never replaces a label.

**You provide** \`content\`, and the control as the only child. Wrap the app once in \`TooltipProvider\`. Tooltips sit on \`basalt-surface-top\` in \`label\` text.
`),
  Kbd: doc("Kbd", `
A key or shortcut, such as ⌘K: one chip per key, a fill with no border, in Geist Mono, with ⌘ ⌥ ⌃ drawn as Phosphor icons.

**You provide** the keys as text. Inside a menu item, use the item's \`shortcut\` prop instead. Show real shortcuts only, one per row.
`),
  Checkbox: doc("Checkbox", `
An on/off choice that takes effect when a form is submitted, or one of several independent options.

**You provide** the label as \`children\` (clickable with the box), and \`checked\`/\`onCheckedChange\` or \`defaultChecked\`. \`indeterminate\` shows a dash for a parent of mixed children.

The box is bounded by \`basalt-border-input\` (3:1); checked fills with \`basalt-action-primary\`.

- Use \`Switch\` instead for a setting that takes effect immediately.
`),
  Switch: doc("Switch", `
A setting that takes effect immediately, on or off.

**You provide** the label as \`children\`: name the setting ("Auto-deploy"), not the action. Control it with \`checked\`/\`onCheckedChange\` or \`defaultChecked\`.

Off is a \`basalt-text-tertiary\` thumb; on is a full \`basalt-action-primary\` track with the thumb moved across: shape and position, not colour alone.
`),
  RadioGroup: doc("RadioGroup", `
One choice among a few options, all visible at once.

**You provide** \`aria-label\` (or a visible heading via \`aria-labelledby\`), \`value\`/\`onValueChange\` or \`defaultValue\`, and a \`Radio\` per option with its \`value\` and label. Arrow keys move the choice.

- Use \`Select\` for more than five or so options; \`SegmentedControl\` when the choice filters a view.
`),
  Select: doc("Select", `
One choice from a list too long for radios. The list opens below the trigger, like a menu.

**You provide** \`options\` (\`{ value, label, disabled? }\`), \`value\`/\`onValueChange\` or \`defaultValue\`, and a \`placeholder\`. Put it inside a \`Field\` for its label, or give it \`aria-label\`.

The trigger looks like an \`Input\`; the list is a menu, with a check on the selected option.
`),
  Toast: doc("Toast", `
A short message about something that just happened, bottom-right, announced to screen readers.

**You provide** \`ToastProvider\` once near the app's root, then \`useToast().show({ title, description?, status?, action?, timeout? })\`. \`status: "warning" | "danger"\` adds a dot (never for success: the title says it); \`action\` adds one button, such as Undo.

Toasts sit on \`basalt-surface-top\`, stack, expand on hover or focus, and pause while hovered. Dismiss appears when the stack is expanded.

- Do say what happened in the title: "Sandbox deleted".
- Don't use a toast for errors that need a decision; use a \`Dialog\` or an inline message.
`),
  CommandMenu: doc("CommandMenu", `
A searchable list of every action, usually opened with ⌘K. Type to filter, arrows to move, Enter to run, Esc to close.

**You provide** \`open\` and \`onOpenChange\` (bind the shortcut in your app), and \`groups\` of commands: \`{ id, label, icon?, shortcut?, keywords?, danger?, onSelect }\`. \`hints\` adds a footer naming the keys; it's off by default. \`keywords\` find a command by other words ("remove" finds "Delete sandbox").
`),
  Textarea: doc("Textarea", `
Multi-line text: a task, a note, a description.

**You provide** it inside a \`Field\` for its label, and \`rows\` (default 4). It resizes vertically and shares \`Input\`'s boundary, focus and invalid states.
`),
  Popover: doc("Popover", `
Rich content anchored to a trigger: details, a short form, a confirmation that doesn't need a dialog. Esc or an outside click closes it, and focus returns to the trigger.

**You provide** \`PopoverTrigger\` (usually \`render={<Button>…</Button>}\`), and \`PopoverContent\` with a \`PopoverTitle\` (it names the popover) and \`PopoverDescription\`.

- Use \`Tooltip\` for a one-line hint, \`Menu\` for a list of actions, \`Dialog\` for a decision that blocks the page.
`),
  Callout: doc("Callout", `
An inline message that stays until the situation changes: a warning or error that needs a decision, or information the reader shouldn't miss.

**You provide** \`title\` (what's wrong), \`children\` (what to do), optional \`actions\`, and \`status\`: \`info\`, \`success\`, \`warning\` or \`danger\`. Set \`live\` only when it appears in response to something: \`"polite"\`, or \`"assertive"\` for an error that blocks the task.

The surface stays neutral; status is the icon's shape and colour, and the words. No coloured fill, no coloured edge.
`),
  Progress: doc("Progress", `
Progress of a task with a known end, such as a build. Pass \`value={null}\` while the end isn't known yet.

**You provide** \`label\` (required: it names the bar), \`value\` (0–100), and \`showValue\`. The track's boundary meets 3:1, so the bar's extent reads without colour.
`),
  Spinner: doc("Spinner", `
Work in progress with no measurable end, for short waits.

**You provide** \`size\` (16, 20 or 24) and \`label\`, announced to screen readers. Omit the label when visible text beside it already says what's loading. Under reduced motion it fades instead of turning.
`),
  Skeleton: doc("Skeleton", `
A placeholder for content that's loading, at its final size so nothing jumps when it arrives.

**You provide** \`width\`, \`height\` and \`shape\` (\`text\`, \`block\` or \`circle\`). It's hidden from screen readers: announce loading once, elsewhere, with a \`Spinner\` or \`Progress\`.
`),
  CodeBlock: doc("CodeBlock", `
Code, commands or logs in Geist Mono on a sunken surface. Long lines scroll sideways rather than wrap, and the block can be scrolled from the keyboard.

**You provide** \`code\` (text), optional \`language\`, \`title\` (a file name or "terminal"), and \`copyable\` (on by default). Copying announces "Copied" and preserves the exact source.

Shiki's editor grammars highlight shell, CSS, HTML, JavaScript, JSON, JSX, Python, SQL, Swift, TSX, TypeScript and YAML. Common aliases like \`sh\`, \`js\`, \`ts\`, \`py\` and \`yml\` work. The language is explicit; the title is only a label. Omit it, or use \`text\`, for plain logs. Unknown languages and logs over 100,000 UTF-16 code units stay plain.

Syntax uses its own AA-tested tokens, follows light and dark immediately, and works offline. Each language loads the first time it renders (plain text until then); call preloadCodeLanguages before server rendering for highlighted HTML. It never interprets source text as HTML.
`),
  Accordion: doc("Accordion", `
Sections that expand one at a time or several at once, for secondary detail.

**You provide** \`Accordion\` (\`defaultValue\` or \`value\` as an array of open items; \`multiple\` to allow several) and \`AccordionItem\`s with a \`value\` and \`title\`.

- Don't hide a page's main content in an accordion.
`),
  Icon: doc("Icon", `
A Phosphor icon at Basalt's weights: Bold at 16px, Regular at 20px and up, Fill when \`selected\`.

**You provide** \`icon\` (a component from \`@phosphor-icons/react\`), \`size\` (16, 20 or 24) and, only for an icon that means something on its own, \`label\`. Icons take the text colour.
`),
};

const preview = (group, height, body, extra = "") => `<!-- @dsCard group="${group}" height=${height} -->
<!doctype html>
<html>
<head><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:var(--basalt-surface-page);color:var(--basalt-text-primary);font-family:var(--basalt-font-family-sans)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.col{display:flex;flex-direction:column;gap:12px}${extra}
</style></head>
<body>
<div id="root"></div>
<script>
var B = window.Basalt, h = React.createElement;
${body.trim()}
</script>
</body>
</html>
`;

const mount = (expr) => `ReactDOM.createRoot(document.getElementById('root')).render(${expr});`;

export const PREVIEWS = {
  ...COMPLETION_PREVIEWS,
  Button: preview("Actions", 132, mount(`h('div', { className: 'col' },
  h('div', { className: 'row' },
    h(B.Button, { variant: 'primary', icon: B.PlayIcon }, 'Deploy'),
    h(B.Button, null, 'Cancel'),
    h(B.Button, { variant: 'ghost' }, 'Preview'),
    h(B.Button, { variant: 'danger', icon: B.TrashIcon }, 'Delete'),
    h(B.IconButton, { icon: B.GearIcon, label: 'Settings', variant: 'secondary' })),
  h('div', { className: 'row' },
    ['xs', 'sm', 'md', 'lg', 'xl'].map(function (s) { return h(B.Button, { key: s, size: s }, 'Cancel'); }),
    h(B.Button, { variant: 'primary', disabled: true }, 'Deploy')))`)),
  Field: preview("Forms", 168, mount(`h('div', { className: 'row', style: { alignItems: 'flex-start' } },
  h('div', { style: { flex: 1, minWidth: 200 } }, h(B.Field, { label: 'Sandbox name', description: 'Lowercase, 3 to 32 characters.' }, h(B.Input, { defaultValue: 'agent-runner-01' }))),
  h('div', { style: { flex: 1, minWidth: 200 } }, h(B.Field, { label: 'Route', invalid: true, error: 'Enter a host, for example api.anthropic.com.' }, h(B.Input, { defaultValue: 'https://' }))))`)),
  Menu: preview("Overlays", 280, mount(`h(B.Menu, { defaultOpen: true, modal: false },
  h(B.MenuTrigger, { render: h(B.Button, { iconEnd: B.CaretDownIcon }, 'Actions') }),
  h(B.MenuContent, null,
    h(B.MenuGroup, null,
      h(B.MenuGroupLabel, null, 'Sandbox'),
      h(B.MenuItem, { icon: B.PlusIcon, shortcut: 'N' }, 'New sandbox'),
      h(B.MenuItem, { icon: B.CopyIcon, shortcut: '⌘D' }, 'Duplicate'),
      h(B.MenuItem, { icon: B.PencilSimpleIcon, shortcut: 'R' }, 'Rename')),
    h(B.MenuSeparator),
    h(B.MenuItem, { icon: B.TrashIcon, danger: true }, 'Delete')))`)),
  Dialog: preview("Overlays", 300, mount(`h(B.Dialog, { defaultOpen: true, modal: false },
  h(B.DialogTrigger, { render: h(B.Button, { variant: 'danger' }, 'Delete sandbox') }),
  h(B.DialogContent, null,
    h(B.DialogTitle, null, 'Delete blacksand-api?'),
    h(B.DialogDescription, null, "Its runs and records stay. The sandbox and its routes are removed, and this can't be undone."),
    h(B.DialogActions, null,
      h(B.DialogClose, { render: h(B.Button, null, 'Cancel') }),
      h(B.DialogClose, { render: h(B.Button, { variant: 'danger' }, 'Delete sandbox') }))))`)),
  Tabs: preview("Navigation", 120, mount(`h(B.Tabs, { defaultValue: 'overview' },
  h(B.TabsList, { 'aria-label': 'Sandbox' }, h(B.Tab, { value: 'overview' }, 'Overview'), h(B.Tab, { value: 'runs' }, 'Runs'), h(B.Tab, { value: 'settings' }, 'Settings')),
  h(B.TabsPanel, { value: 'overview', style: { paddingTop: 12, fontSize: 13, color: 'var(--basalt-text-secondary)' } }, 'Three sandboxes on a single k3s node.'),
  h(B.TabsPanel, { value: 'runs', style: { paddingTop: 12, fontSize: 13, color: 'var(--basalt-text-secondary)' } }, '142 runs this week.'),
  h(B.TabsPanel, { value: 'settings', style: { paddingTop: 12, fontSize: 13, color: 'var(--basalt-text-secondary)' } }, 'Routes, keys and limits.'))`)),
  SegmentedControl: preview("Navigation", 72, mount(`h(B.SegmentedControl, { 'aria-label': 'Time range', defaultValue: '24h' }, h(B.Segment, { value: '1h' }, '1h'), h(B.Segment, { value: '24h' }, '24h'), h(B.Segment, { value: '7d' }, '7d'), h(B.Segment, { value: '30d' }, '30d'))`)),
  Badge: preview("Display", 72, mount(`h('div', { className: 'row' },
  h(B.Badge, { status: 'success' }, 'Ready'), h(B.Badge, { status: 'warning' }, 'Building'), h(B.Badge, { status: 'danger' }, 'Error'), h(B.Badge, null, 'alpha'),
  h('span', { style: { width: 16 } }),
  h(B.Badge, { variant: 'plain', status: 'success' }, 'Ready'), h(B.Badge, { variant: 'plain', status: 'danger' }, 'Error'))`)),
  Card: preview("Display", 196, mount(`h(B.Card, { style: { maxWidth: 420 } },
  h(B.CardHeader, null, h(B.CardTitle, null, 'blacksand-api'), h(B.CardDescription, null, 'k3s · single node · 3 sandboxes')),
  h(B.CardContent, null, h('div', { style: { fontSize: 24, lineHeight: '30px', fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' } }, '$0.0042 ', h('span', { style: { fontSize: 12, fontWeight: 400, letterSpacing: 0, color: 'var(--basalt-text-secondary)' } }, 'per 1k tokens'))),
  h(B.CardFooter, null, h(B.Button, { size: 'sm', variant: 'ghost' }, 'View runs'), h(B.Button, { size: 'sm', variant: 'primary' }, 'Open')))`)),
  Table: preview("Display", 220, `var RUNS = [['run-0142', 'success', 'Ready', 'claude', '4m 12s', 'a81f3c2'], ['run-0141', 'warning', 'Building', 'codex', '2m 50s', '9c04e1d'], ['run-0140', 'danger', 'Error', 'claude', '11m 03s', '5be7a90']];
${mount(`h(B.TableContainer, null, h(B.Table, null,
  h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, 'Recent runs'),
  h(B.TableHeader, null, h(B.TableRow, null, h(B.TableHead, null, 'Run'), h(B.TableHead, null, 'Status'), h(B.TableHead, null, 'Agent'), h(B.TableHead, { numeric: true }, 'Duration'), h(B.TableHead, null, 'Commit'))),
  h(B.TableBody, null, RUNS.map(function (r, i) {
    return h(B.TableRow, { key: r[0], selected: i === 0 },
      h(B.TableCell, { style: { fontWeight: 500 } }, r[0]),
      h(B.TableCell, null, h(B.Badge, { variant: 'plain', status: r[1] }, r[2])),
      h(B.TableCell, null, r[3]), h(B.TableCell, { numeric: true }, r[4]), h(B.TableCell, { mono: true }, r[5]));
  }))))`)}`),
  Tooltip: preview("Overlays", 96, mount(`h(B.TooltipProvider, null, h('div', { className: 'row', style: { paddingTop: 36 } },
  h(B.Tooltip, { content: 'Settings', defaultOpen: true }, h(B.IconButton, { icon: B.GearIcon, label: 'Settings', variant: 'secondary' })),
  h(B.Tooltip, { content: 'Search runs' }, h(B.IconButton, { icon: B.MagnifyingGlassIcon, label: 'Search' }))))`)),
  Kbd: preview("Display", 56, mount(`h('div', { className: 'row' }, h(B.Kbd, null, '⌘K'), h(B.Kbd, null, '⌘D'), h(B.Kbd, null, 'Esc'), h(B.Kbd, null, '↵'))`)),
  Checkbox: preview("Forms", 132, mount(`h('div', { className: 'col', style: { gap: 4 } },
  h(B.Checkbox, { defaultChecked: true }, 'Keep run records'),
  h(B.Checkbox, null, 'Allow outbound DNS'),
  h(B.Checkbox, { indeterminate: true }, 'All routes'),
  h(B.Checkbox, { disabled: true }, 'Signed commits only'))`)),
  Switch: preview("Forms", 84, mount(`h('div', { className: 'col', style: { gap: 4 } }, h(B.Switch, { defaultChecked: true }, 'Auto-deploy'), h(B.Switch, null, 'Verbose logs'))`)),
  RadioGroup: preview("Forms", 108, mount(`h(B.RadioGroup, { 'aria-label': 'Substrate', defaultValue: 'k3s' }, h(B.Radio, { value: 'k3s' }, 'Kubernetes (k3s)'), h(B.Radio, { value: 'vm' }, 'Virtual machine'), h(B.Radio, { value: 'gvisor' }, 'gVisor'))`)),
  Select: preview("Forms", 280, mount(`h('div', { style: { width: 260 } }, h(B.Field, { label: 'Region' }, h(B.Select, { defaultOpen: true, modal: false, defaultValue: 'iad', options: [
  { value: 'iad', label: 'Washington, D.C. (iad1)' }, { value: 'sfo', label: 'San Francisco (sfo1)' }, { value: 'fra', label: 'Frankfurt (fra1)' }, { value: 'hnd', label: 'Tokyo (hnd1)', disabled: true }] })))`)),
  Toast: preview("Overlays", 150, `function Demo() {
  var toast = B.useToast();
  React.useEffect(function () { toast.show({ title: 'Sandbox deleted', description: 'blacksand-api and its routes were removed.', action: { label: 'Undo', onClick: function () {} }, timeout: 0 }); }, []);
  return h(B.Button, { onClick: function () { toast.show({ title: 'Route refused', description: 'api.example.com is not allowed for this run.', status: 'warning', timeout: 0 }); } }, 'Show toast');
}
${mount(`h(B.ToastProvider, null, h(Demo))`)}`, "\n.basalt-toast-viewport{position:absolute}"),
  CommandMenu: preview("Overlays", 360, `function Demo() {
  var s = React.useState(true), open = s[0], setOpen = s[1];
  var run = function () {};
  return h(React.Fragment, null,
    h(B.Button, { onClick: function () { setOpen(true); } }, 'Commands'),
    h(B.CommandMenu, { open: open, onOpenChange: setOpen, groups: [
      { label: 'Sandboxes', commands: [
        { id: 'new', label: 'New sandbox', icon: B.PlusIcon, shortcut: 'N', onSelect: run },
        { id: 'dup', label: 'Duplicate sandbox', icon: B.CopyIcon, shortcut: '⌘D', onSelect: run },
        { id: 'del', label: 'Delete sandbox', icon: B.TrashIcon, keywords: ['remove'], danger: true, onSelect: run }] },
      { label: 'Runs', commands: [
        { id: 'deploy', label: 'Deploy', icon: B.PlayIcon, onSelect: run },
        { id: 'logs', label: 'Open logs', icon: B.TerminalIcon, onSelect: run }] }] }));
}
${mount(`h(Demo)`)}`, "\n.basalt-dialog.basalt-command{top:16px}\n.basalt-command-list{max-height:none}"),
  Textarea: preview("Forms", 168, mount(`h('div', { style: { maxWidth: 480 } }, h(B.Field, { label: 'Task', description: 'What the agent should do. Markdown is fine.' }, h(B.Textarea, { defaultValue: 'Fix the dimmed ride rows that never reset, and open a PR.' })))`)),
  Popover: preview("Overlays", 180, mount(`h(B.Popover, { defaultOpen: true, modal: false },
  h(B.PopoverTrigger, { render: h(B.Button, null, 'Route details') }),
  h(B.PopoverContent, null, h(B.PopoverTitle, null, 'anthropic'), h(B.PopoverDescription, null, 'https://api.anthropic.com, key anthropic-key, 60 requests a minute.')))`)),
  Callout: preview("Status", 260, mount(`h('div', { className: 'col' },
  h(B.Callout, { status: 'warning', title: "The tools image isn't pinned", actions: h(B.Button, { size: 'sm' }, 'Pin to digest') }, 'Runs use whatever agent-tools:latest points to. Pin it to a digest so every run uses the same tools.'),
  h(B.Callout, { status: 'danger', title: 'Route refused: api.example.com' }, "This run isn't allowed to reach that host."),
  h(B.Callout, { title: 'Records are kept for 30 days' }))`)),
  Progress: preview("Status", 84, mount(`h('div', { className: 'row', style: { gap: 24, alignItems: 'flex-start' } },
  h('div', { style: { flex: 1 } }, h(B.Progress, { label: 'Building image', value: 42 })),
  h('div', { style: { flex: 1 } }, h(B.Progress, { label: 'Waiting for a node', value: null })))`)),
  Spinner: preview("Status", 56, mount(`h('div', { className: 'row', style: { gap: 16, fontSize: 13 } }, h(B.Spinner, { label: 'Loading' }), h(B.Spinner, { size: 20 }), h('span', { style: { display: 'inline-flex', gap: 8, alignItems: 'center' } }, h(B.Spinner), 'Starting sandbox'))`)),
  Skeleton: preview("Status", 140, mount(`h('div', { className: 'col', style: { gap: 8, maxWidth: 360 } }, h(B.Skeleton, { width: '40%' }), h(B.Skeleton, { width: '90%' }), h(B.Skeleton, { shape: 'block', height: 48 }))`)),
  CodeBlock: preview("Display", 132, mount(`h(B.CodeBlock, { title: 'terminal', language: 'bash', code: './blacksand k8s run --repo ~/code/project --prompt-file task.md \\\\\\n  --agent claude --out runs/first-task' })`)),
  Accordion: preview("Display", 190, mount(`h(B.Accordion, { defaultValue: ['routes'] },
  h(B.AccordionItem, { value: 'routes', title: 'Routes' }, 'Each run reaches only the hosts you list, through the proxy.'),
  h(B.AccordionItem, { value: 'keys', title: 'Keys' }, 'Keys stay outside the sandbox; the proxy adds them to requests it allows.'),
  h(B.AccordionItem, { value: 'records', title: 'Records' }, 'Every run gets a record, including failed and cancelled ones.'))`)),
  Icon: preview("Display", 88, mount(`h('div', { className: 'col' },
  h('div', { className: 'row', style: { gap: 16, color: 'var(--basalt-text-secondary)' } }, [B.HouseIcon, B.CubeIcon, B.TerminalIcon, B.MagnifyingGlassIcon, B.GearIcon].map(function (I, i) { return h(B.Icon, { key: i, icon: I, size: 16 }); }), h('span', { style: { fontSize: 12 } }, '16 · Bold')),
  h('div', { className: 'row', style: { gap: 16, color: 'var(--basalt-text-secondary)' } }, [B.HouseIcon, B.CubeIcon, B.TerminalIcon, B.MagnifyingGlassIcon, B.GearIcon].map(function (I, i) { return h(B.Icon, { key: i, icon: I, size: 20, selected: i === 0 }); }), h('span', { style: { fontSize: 12 } }, '20 · Regular, first selected (Fill)')))`)),
};

// The cover: Basalt's palette is its neutral ramp; its pattern is a dot grid at one
// spacing step, the precise, technical, 4px-grid row. Blocks and dots sit right of x=480.
export const COVER = `<!-- @dsCard height=288 -->
<!doctype html>
<html>
<head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:var(--basalt-surface-page)}
.cover{position:relative;width:960px;height:288px;overflow:hidden;font-family:var(--basalt-font-family-sans)}
svg{position:absolute;inset:0}
.ink{fill:var(--basalt-text-primary)}
.mid{fill:var(--basalt-neutral-63)}
.deep{fill:var(--basalt-neutral-30)}
.raised{fill:var(--basalt-text-tertiary)}
.dot{fill:var(--basalt-neutral-63)}
.dot-on{fill:var(--basalt-surface-page)}
.tile{rx:var(--basalt-radius-lg)}
.name{position:absolute;left:48px;bottom:56px;width:440px;margin:0;font-weight:600;font-size:120px;line-height:.92;letter-spacing:-0.035em;color:var(--basalt-text-primary)}
.tag{position:absolute;left:52px;bottom:28px;width:440px;margin:0;font-size:14px;line-height:20px;color:var(--basalt-text-secondary)}
</style></head>
<body>
<div class="cover">
<svg width="960" height="288" viewBox="0 0 960 288" aria-hidden="true">
<!-- blocks: text-primary 240x192, neutral-63 112x112, neutral-30 112x80, text-tertiary 208x96, sides in 16px (space-4) steps, radius-lg corners
     arrangement: a staggered stack bleeding off the top and right edges, right of x=480
     pattern: a dot grid at space-4 (16px) pitch; Basalt is precise, technical, mono and on a 4px grid ("a dot or plus grid at one spacing step")
     scales: space-4 (16) pitch and gaps, radius-lg (12) corners, 2px dots -->
<rect class="raised tile" x="512" y="176" width="208" height="96"/>
<rect class="deep tile" x="736" y="192" width="112" height="80"/>
<rect class="ink tile" x="736" y="-16" width="240" height="192"/>
<rect class="mid tile" x="608" y="48" width="112" height="112"/>
<g class="dot">${Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => `<circle cx="${528 + c * 16}" cy="${32 + r * 16}" r="1.5"/>`).join("")).join("")}</g>
<g class="dot-on">${Array.from({ length: 6 }, (_, r) => Array.from({ length: 8 }, (_, c) => `<circle cx="${776 + c * 16}" cy="${32 + r * 16}" r="1.5"/>`).join("")).join("")}</g>
</svg>
<p class="name">Basalt</p>
<p class="tag">One monochrome foundation for every SRA Syndicate product.</p>
</div>
</body>
</html>
`;
