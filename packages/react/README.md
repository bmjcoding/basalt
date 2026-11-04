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
| `Icon`, `Kbd` | `Icon` picks Phosphor's weight by size: Bold at 16px, Regular at 20px and up, Fill when `selected`. |

## Test

```sh
npm test
```

Typechecks, builds, then runs the browser tests on a page with every component
(`test/demo.tsx`), in both themes:

- axe-core finds no WCAG 2.2 A or AA violations, at rest and with the menu and dialog open;
- menus, dialogs, tabs and the segmented control work from the keyboard, and Esc returns
  focus to where it came from;
- focus shows as a 2px outline in the focus colour;
- the page doesn't scroll sideways at phone width.

The tests use the Playwright version pinned in `package.json` and its Chromium.
