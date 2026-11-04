# @srasyndicate/basalt

Basalt's React components: [Base UI](https://base-ui.com) primitives for behaviour and
accessibility, styled with Basalt tokens, with [Phosphor](https://phosphoricons.com) icons.

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
| `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuGroup`, `MenuGroupLabel`, `MenuSeparator` | Items take `icon`, `shortcut`, `danger`. |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogActions`, `DialogClose` | Focus is trapped; Esc closes; focus returns to the trigger. |
| `Tabs`, `TabsList`, `Tab`, `TabsPanel` | For panels of one view. |
| `SegmentedControl`, `Segment` | One choice that filters the current view; never empty. |
| `Badge` | Neutral pill; `status` adds a dot. The label says the status in words. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | |
| `TableContainer`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `numeric` cells use tabular numerals; `mono` cells for IDs and hashes. |
| `Tooltip`, `TooltipProvider` | Supplements a name; never replaces a label. |
| `Checkbox`, `Switch` | The label is `children`. A switch takes effect immediately; a checkbox on submit. |
| `RadioGroup`, `Radio` | A few options, all visible; arrow keys move the choice. |
| `Select` | `options` of `{ value, label, disabled? }`; labelled by its `Field`. |
| `ToastProvider`, `useToast` | `useToast().show({ title, description?, status?, action?, timeout? })`. |
| `CommandMenu` | ⌘K: `groups` of `{ id, label, icon?, shortcut?, keywords?, onSelect }`; you bind the shortcut. |
| `Textarea` | Multi-line Field control; controlled or uncontrolled, with the field's label, validation and disabled state. |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverTitle`, `PopoverDescription`, `PopoverClose` | Anchored details or a short form; Esc returns focus. |
| `Callout` | Persistent inline information; `status`, `title`, optional `actions`. Set `live` only when it appears in response to something. |
| `Progress` | Required `label`; `value={null}` for an indeterminate task. |
| `Spinner`, `Skeleton` | Calm loading states; honour reduced motion. |
| `CodeBlock` | `code`, optional `language`, `title`, `copyable`. Language-aware syntax; exact-text copying and keyboard scrolling. |
| `Accordion`, `AccordionItem` | Secondary detail; keyboard operated, with coordinated panel and caret motion. |
| `Icon`, `Kbd` | `Icon` picks Phosphor's weight by size: Bold at 16px, Regular at 20px and up, Fill when `selected`. |

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

The tests use the Playwright version pinned in `package.json` and its Chromium.
