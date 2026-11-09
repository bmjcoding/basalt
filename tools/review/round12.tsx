// Round 12: the menus redesign, as the council converged it (decisions item 48) and the owner approved it (item 49), compared
// with the reference drawing in .review/council/menus-final/. Every popup row is a plate and a lift; a popup's level is its
// opener plus one with a floor of 1; a modal resets to 1; the vertical bar is gone from rows, tables and vertical tabs.
//
// Frozen states: a state that ends in "-lit" hovers the second row of the first popup (the plate and the lift, which a pointer
// holds and a screenshot cannot); "forced" does that in Windows forced-colours mode (build.mjs emulates it).

import { CopyIcon, GearIcon, PencilSimpleIcon, PlusIcon, TerminalIcon, TrashIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  CommandMenu,
  Combobox,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Segment,
  SegmentedControl,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsPanel,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", width: "100%" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, width: "100%", alignItems: "start" };
const cell: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", minHeight: 250 };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

const lit = (state: string) => state.endsWith("-lit") || state === "forced";
const opened = (state: string) => state === "open" || lit(state);

const REGIONS = [
  { value: "fra", label: "Frankfurt" },
  { value: "iad", label: "Washington, D.C." },
  { value: "sin", label: "Singapore" },
];

const ZONES = [
  { value: "eu-1", label: "eu-central-1" },
  { value: "us-1", label: "us-east-1" },
  { value: "ap-1", label: "ap-southeast-1" },
];

function RowMenu({ open, name = "Actions", children }: { open: boolean; name?: string; children?: React.ReactNode }) {
  return (
    <Menu defaultOpen={open} modal={false}>
      <MenuTrigger render={<Button size="sm" variant="secondary">{name}</Button>} />
      <MenuContent>
        {children ?? (
          <>
            <MenuItem icon={PencilSimpleIcon} shortcut="R">Rename</MenuItem>
            <MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem>
            <MenuItem icon={TerminalIcon}>Open logs</MenuItem>
            <MenuSeparator />
            <MenuItem icon={TrashIcon} danger>Delete</MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}

// ---- 1. Menu, Select and Combobox

function MenusDemo({ state }: { state: string }) {
  const open = opened(state);
  return (
    <div style={col}>
      <Caption>
        Menu, Select and Combobox rows: a 36px plate in a 40px hit area, 4px between plates drawn inside the rows, panel radius 12 over row radius 8. Rest rows are secondary, the lit row lifts to primary. Hover or use the arrows to see it
      </Caption>
      <div style={grid}>
        <div style={cell}>
          <Caption>Menu (from the page: level 1)</Caption>
          <Menu defaultOpen={open} modal={false}>
            <MenuTrigger render={<Button size="sm" variant="secondary">Actions</Button>} />
            <MenuContent>
              <MenuGroup>
                <MenuGroupLabel>Sandbox</MenuGroupLabel>
                <MenuItem icon={PencilSimpleIcon} shortcut="R">Rename</MenuItem>
                <MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem>
                <MenuItem icon={TerminalIcon}>Open logs</MenuItem>
              </MenuGroup>
              <MenuSeparator />
              <MenuItem icon={TrashIcon} danger>Delete</MenuItem>
            </MenuContent>
          </Menu>
        </div>
        <div style={cell}>
          <Caption>Select (the chosen value is a check in primary ink)</Caption>
          <Select aria-label="Region" defaultOpen={open} defaultValue="iad" options={REGIONS} />
        </div>
        <div style={cell}>
          <Caption>Combobox</Caption>
          <Combobox aria-label="Zone" defaultOpen={open} defaultValue="us-1" options={ZONES} />
        </div>
      </div>
    </div>
  );
}

// ---- 2. Depth

function DepthDemo({ state }: { state: string }) {
  const open = opened(state);
  return (
    <div style={col}>
      <Caption>A popup is its opener plus one, with a floor of 1 and a cap of 3. Page menu: #0a0a0a. From a card: #111111. From a card in a card: #171717 (the cap). In light, levels 1 to 3 are one white and the rim does the work</Caption>
      <div style={grid}>
        <div style={cell}>
          <Caption>From the page: level 1</Caption>
          <RowMenu open={open} name="Page menu" />
        </div>
        <Card style={{ minHeight: 250 }}>
          <CardHeader><CardTitle>From a card: level 2</CardTitle></CardHeader>
          <CardContent><RowMenu open={open} name="Card menu" /></CardContent>
        </Card>
        <Card style={{ minHeight: 250 }}>
          <CardHeader><CardTitle>Card in a card</CardTitle></CardHeader>
          <CardContent>
            <Card style={{ padding: 12, minHeight: 170 }}>
              <Text size="sm" tone="secondary">Level 3: the cap</Text>
              <div style={{ marginTop: 8 }}><RowMenu open={open} name="Nested menu" /></div>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- 3. The command menu

function CommandDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(opened(state));
  const none = () => {};
  return (
    <div style={col}>
      <Caption>Level 1, with a level-2 input band (#111111). Rows are 40px plates in 44px hit areas; the first is selected, and its glyph and label lift to primary</Caption>
      <Button onClick={() => setOpen(true)}>Open commands</Button>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        hints
        groups={[
          {
            label: "Sandboxes",
            commands: [
              { id: "new", label: "New sandbox", icon: PlusIcon, shortcut: "N", onSelect: none },
              { id: "dup", label: "Duplicate sandbox", icon: CopyIcon, shortcut: "⌘D", onSelect: none },
              { id: "del", label: "Delete sandbox", icon: TrashIcon, keywords: ["remove"], danger: true, onSelect: none },
            ],
          },
          { label: "Runs", commands: [{ id: "logs", label: "Open logs", icon: TerminalIcon, onSelect: none }] },
        ]}
      />
    </div>
  );
}

// ---- 4. Dialog at level 1

function ModalsDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(opened(state));
  return (
    <div style={col}>
      <Caption>A dialog resets to level 1 (#0a0a0a); its inner card is level 2, and a menu opened inside it is level 2 too</Caption>
      <Button onClick={() => setOpen(true)}>Open a dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Sandbox settings</DialogTitle>
          <DialogDescription>The card below is level 2. The menu opens at level 2 as well.</DialogDescription>
          <Card style={{ padding: 12, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text size="sm">blacksand-api</Text>
              <RowMenu open={false} name="Row menu" />
            </div>
          </Card>
          <DialogActions>
            <DialogClose render={<Button>Close</Button>} />
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- 5. Selectable table

const RUNS = [
  { id: "run-0142", status: "Ready", agent: "claude", time: "4m 12s" },
  { id: "run-0141", status: "Building", agent: "codex", time: "2m 50s" },
  { id: "run-0140", status: "Error", agent: "claude", time: "11m 03s" },
  { id: "run-0139", status: "Ready", agent: "codex", time: "6m 41s" },
];

function SelectableTable() {
  const [picked, setPicked] = React.useState<string[]>(["run-0141", "run-0140"]);
  const all = picked.length === RUNS.length;
  const some = picked.length > 0 && !all;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <div style={col}>
      <Caption>
        A selected row is the wash as a band: no bar. The checked box carries the state (a checkbox column, with a mixed header box) and the count is said in words in a polite live region
      </Caption>
      <Text size="sm" tone="secondary" role="status" aria-live="polite">{picked.length ? `${picked.length} of ${RUNS.length} selected` : "None selected"}</Text>
      <TableContainer>
        <Table>
          <caption className="basalt-visually-hidden">Runs</caption>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: 40, paddingInline: "8px 0" }}>
                <Checkbox aria-label="Select all runs" checked={all} indeterminate={some} onCheckedChange={(on) => setPicked(on ? RUNS.map((r) => r.id) : [])} />
              </TableHead>
              <TableHead>Run</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead numeric>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RUNS.map((r) => (
              <TableRow key={r.id} selected={picked.includes(r.id)}>
                <TableCell style={{ width: 40, paddingInline: "8px 0" }}>
                  <Checkbox aria-label={`Select ${r.id}`} checked={picked.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
                </TableCell>
                <TableCell mono>{r.id}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.agent}</TableCell>
                <TableCell numeric>{r.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ---- 6. Tabs and segmented

function TabsDemo() {
  return (
    <div style={col}>
      <Caption>Vertical tabs: a 36px radius-8 pill in a track (padding 4, radius 12), no divider and no sliding indicator. In dark the raised pill takes the selected wash over surface-top</Caption>
      <Tabs orientation="vertical" defaultValue="account" style={{ width: "100%" }}>
        <TabsList aria-label="Settings">
          <Tab value="account">Account</Tab>
          <Tab value="billing">Billing</Tab>
          <Tab value="keys">API keys</Tab>
        </TabsList>
        <TabsPanel value="account"><Text size="sm" tone="secondary">Profile, email and sign-in.</Text></TabsPanel>
        <TabsPanel value="billing"><Text size="sm" tone="secondary">Plan, invoices and usage.</Text></TabsPanel>
        <TabsPanel value="keys"><Text size="sm" tone="secondary">Create and revoke keys.</Text></TabsPanel>
      </Tabs>
      <Caption>Horizontal tabs keep their underline: it is horizontal, not the banned vertical line</Caption>
      <Tabs defaultValue="overview" style={{ width: "100%" }}>
        <TabsList aria-label="Sandbox">
          <Tab value="overview">Overview</Tab>
          <Tab value="runs">Runs</Tab>
          <Tab value="settings"><GearIcon size={16} aria-hidden /> Settings</Tab>
        </TabsList>
        <TabsPanel value="overview"><Text size="sm" tone="secondary" style={{ paddingTop: 12 }}>Three sandboxes on a single k3s node.</Text></TabsPanel>
        <TabsPanel value="runs"><Text size="sm" tone="secondary" style={{ paddingTop: 12 }}>142 runs this week.</Text></TabsPanel>
        <TabsPanel value="settings"><Text size="sm" tone="secondary" style={{ paddingTop: 12 }}>Routes, keys and limits.</Text></TabsPanel>
      </Tabs>
      <Caption>Segmented control: the horizontal size is unchanged; the selected pill has the dark wash</Caption>
      <SegmentedControl aria-label="Time range" defaultValue="7d">
        <Segment value="24h">24h</Segment>
        <Segment value="7d">7d</Segment>
        <Segment value="30d">30d</Segment>
      </SegmentedControl>
    </div>
  );
}

export const ROUND_12: Round = {
  id: "12",
  title: "Menus, surfaces and the bar",
  reviewed: false,
  summary:
    "The converged menus redesign, built as the council decided it (decisions 48) and the owner approved it (49): the plate and lift on every popup row, the depth floor and the modal reset, selected table rows without a bar, vertical tabs as pills, and the forced-colours fix. Compare each step with the reference drawing in .review/council/menus-final/. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "menus",
      name: "Menu, Select, Combobox",
      intro: "Every popup row is a plate and a lift. The plate is the selected wash painted as one solid fill per level; the lift steps the label and glyph from secondary to primary. No bar, no outline, no weight change.",
      decisions: [
        "Rows: a 36px plate in a 40px hit area (compact 32 and 36; at least 44px on touch). The plate is inset 2px above and below, so neighbouring hit areas touch and the 4px gap is drawn inside the rows: a pointer crossing it never leaves a row.",
        "Panel: radius 12, padding 4 inline and 2 block, rows radius 8, type 14/20 (13 in compact). Group labels are tertiary 12/16 at 500. A chosen value is a check in primary ink, with no extra weight. Danger keeps its colour on the plate.",
        "The plate in dark is the next level plus the selected wash (#262626 on level 1, #2c2c2c on level 2), and the wash alone at the cap; in light it is the 7% wash. One background-color, never a layered image.",
        "No new token and no new primitive: the plate is set in the level context beside the surface fill. size-menu-row is 36 now, and size-menu-row-touch is 44.",
        "Forced colours (an engineering fix): the lit row opts out of colour adjustment and names Highlight and HighlightText for every part, so the label no longer renders as a black box. A pixel test samples it in Menu, Select, Combobox and CommandMenu.",
      ],
      tryIt: ["Open each popup and hover, then use the arrows.", "Move the pointer slowly down the gap between two rows: the plate never blinks off.", "Compare with the reference's menus section."],
      states: ["open", "open-lit", "forced"],
      demo: ({ state }) => <MenusDemo state={state} />,
    },
    {
      id: "depth",
      name: "Depth: the floor and the ladder",
      intro: "A popup is its opener plus one, capped at 3, with a floor of 1. A menu from the page is near black; from a card it is today's grey.",
      decisions: [
        "Decided 4-0 on #0a0a0a for the page menu, and 3-1 on opener plus one (Opus: a popup takes its opener's level). The floor is 1 in both themes: light's levels 1 to 3 are one white.",
        "The owner looked at a table-row menu at #111111 (level 2) and at #0a0a0a (level 1) and chose level 2.",
        "Tooltip and Toast stay at 3 this round.",
      ],
      tryIt: ["Open the three menus in dark: #0a0a0a, #111111, #171717.", "In light they are one white, and the rim carries the edge."],
      states: ["open", "open-lit"],
      demo: ({ state }) => <DepthDemo state={state} />,
    },
    {
      id: "command",
      name: "Command menu",
      intro: "A modal at level 1 with a level-2 input band. Its rows are Menu rows with a taller plate: 40px in a 44px hit area.",
      decisions: [
        "The band's fill follows its level (2: #111111), replacing the hard-coded surface-3.",
        "Rest rows are secondary; they were primary. The plate stays lit when the pointer leaves a row, as cmdk does.",
        "The footer and the keyboard hints are as shipped.",
      ],
      tryIt: ["Open it, type, then use the arrows.", "Compare the band with the reference."],
      states: ["open", "forced"],
      demo: ({ state }) => <CommandDemo state={state} />,
    },
    {
      id: "modals",
      name: "Dialog at level 1",
      intro: "Dialog, AlertDialog, Sheet and the command menu reset to level 1; their inner panels start at 2.",
      decisions: [
        "The scrim is unchanged (80% black in dark, 40% in light). The z-index modal depth is a separate context and is unchanged.",
        "A menu opened inside a dialog is level 2 (#111111).",
      ],
      tryIt: ["Open the dialog and then its row menu."],
      states: ["open"],
      demo: ({ state }) => <ModalsDemo state={state} />,
    },
    {
      id: "table",
      name: "Selected table rows",
      intro: "A selected row is the wash as a band. The checked box carries the state, and the count is said in words.",
      decisions: [
        "The selected-row bar (the inset box-shadow) and its forced-colours border-inline-start substitute are removed.",
        "The checkbox column is a documented pattern, not a new component: a Checkbox per row labelled by aria-label, a header box that is mixed while some are selected, and a live-region count. A helper was not added: the column is the app's own markup, and a helper would be a new component, which is a design decision.",
        "In forced colours the row has no fill and no edge; the checked box is Highlight.",
      ],
      tryIt: ["Tick and untick rows; the header box goes mixed and the count changes."],
      demo: () => <SelectableTable />,
    },
    {
      id: "tabs",
      name: "Tabs and segmented",
      intro: "Vertical tabs become pills in a track. Horizontal tabs keep their underline. In dark the segmented pill takes the selected wash.",
      decisions: [
        "Vertical tabs lose the divider and the sliding indicator: a 36px radius-8 pill in a track (padding 4, radius 12).",
        "The segmented control's horizontal size is unchanged; the pill takes the selected wash over surface-top in dark (#2c2c2c on #111111) and stays white in light.",
      ],
      tryIt: ["Use the arrows in the vertical list.", "Switch the theme."],
      demo: () => <TabsDemo />,
    },
  ],
};
