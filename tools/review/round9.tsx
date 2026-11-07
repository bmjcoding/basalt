// Round 9: the panel's rulings. The surface levels, the rim, kbd chips, the active-row bar, the command
// menu's input row, the pressed colour, motion, spinners, vertical tabs, the toast drain and Sparkline.
//
// Anything the owner has to decide is built at its default and shown here only as an "Option, not
// shipped": its CSS is walkthrough-local, in the `review-options` layer (declared after `basalt` in
// build.mjs), scoped under a `.wt-*` wrapper. Nothing in the library has a prop for it.

import { CaretDownIcon, CopyIcon, GearIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import * as React from "react";

import {
  Badge,
  Button,
  Callout,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CodeBlock,
  Combobox,
  CommandMenu,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Input,
  Kbd,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  Select,
  Sparkline,
  Spinner,
  Switch,
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
  Tooltip,
  useToast,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, width: "100%", alignItems: "start" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

/** Something the owner can still choose. It is not built; the walkthrough shows it so it can be judged. */
function Option({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wt-option">
      <div className="wt-option-label">
        <strong>Option, not shipped.</strong> {title}
      </div>
      {children}
    </div>
  );
}

/** After the demo is open, move the highlight to the first row, the way the arrow key does. */
function useHighlightFirst(active: boolean, popup: string) {
  React.useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      const item = document.querySelector<HTMLElement>(`${popup} [role=menuitem], ${popup} [role=option]`);
      const target = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : item;
      target?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [active, popup]);
}

// ---- 1. Surface levels and nesting

const LEVELS = [
  { n: 0, name: "surface-0", role: "the page", dark: "#000", light: "#fafafa" },
  { n: 1, name: "surface-1", role: "a panel on the page", dark: "#0a0a0a", light: "#fff" },
  { n: 2, name: "surface-2", role: "a panel in a panel; menus, dialogs", dark: "#111111", light: "#fff" },
  { n: 3, name: "surface-3", role: "the cap; tooltips, toasts", dark: "#171717", light: "#fff" },
] as const;

function LevelStrip() {
  return (
    <div className="wt-levels">
      {LEVELS.map((level) => (
        <div key={level.n} className="wt-level" style={{ background: `var(--basalt-surface-${level.n})` }}>
          <div className="wt-level-name">{level.name}</div>
          <div className="wt-level-role">{level.role}</div>
          <div className="wt-level-hex">
            <span className="wt-dark-only">{level.dark}</span>
            <span className="wt-light-only">{level.light}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LevelsDemo({ state }: { state: string }) {
  const showMenu = state === "dialog-menu";
  useHighlightFirst(showMenu, ".basalt-menu");
  return (
    <div style={col}>
      <LevelStrip />
      <div style={grid}>
        <div style={col}>
          <Caption>Page, then a card, then a code block</Caption>
          <Card style={{ width: "100%" }}>
            <CardHeader>
              <CardTitle>Deploy</CardTitle>
              <CardDescription>The code block is a well one level deeper than its card.</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code="basalt deploy --wait" language="bash" title="terminal" />
            </CardContent>
          </Card>
        </div>
        <div style={col}>
          <Caption>A menu opened from a dialog</Caption>
          <Dialog defaultOpen={showMenu}>
            <DialogTrigger render={<Button>Open a dialog</Button>} />
            <DialogContent>
              <DialogTitle>Sandbox settings</DialogTitle>
              <DialogDescription>The dialog is level 2. A menu from it is level 3, and a code block in it is level 3.</DialogDescription>
              <div style={{ ...row, marginTop: 16 }}>
                <Menu defaultOpen={showMenu} modal={false}>
                  <MenuTrigger render={<Button iconEnd={CaretDownIcon}>Actions</Button>} />
                  <MenuContent>
                    <MenuItem icon={PlusIcon} shortcut="N">New sandbox</MenuItem>
                    <MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem>
                    <MenuItem icon={PencilSimpleIcon}>Rename</MenuItem>
                  </MenuContent>
                </Menu>
              </div>
              <div style={{ marginTop: 56 }}>
                <CodeBlock code="basalt logs --follow" language="bash" />
              </div>
              <DialogActions>
                <DialogClose render={<Button>Close</Button>} />
              </DialogActions>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div style={grid}>
        <div style={col}>
          <Caption>Group with space and a divider first</Caption>
          <Card style={{ width: "100%" }}>
            <CardHeader>
              <CardTitle>blacksand-api</CardTitle>
              <CardDescription>Region, size and routes are one object: no boxes inside it.</CardDescription>
            </CardHeader>
            <CardContent>
              <Text size="sm">3 routes · 2 CPUs · 4 GB</Text>
            </CardContent>
            <CardFooter>
              <Button variant="ghost">Cancel</Button>
              <Button variant="primary">Deploy</Button>
            </CardFooter>
          </Card>
        </div>
        <div style={col}>
          <Caption>The cap: four deep stays at level 3</Caption>
          <Card style={{ width: "100%", padding: 12 }}>
            <Card style={{ padding: 12 }}>
              <Card style={{ padding: 12 }}>
                <Card style={{ padding: 12 }}>
                  <Text size="sm" tone="secondary">The fourth card is level 3 too, so it is only a rim. Past three, use a divider.</Text>
                </Card>
              </Card>
            </Card>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---- 2. The rim

function RimDemo() {
  return (
    <div style={col}>
      <div style={grid}>
        <div style={col}>
          <Caption>A panel has a rim</Caption>
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Text size="sm">One 1px edge in two solid colours. Dark: 8% white on top, 6% on the other sides. Light: 8% black all round.</Text>
            </CardContent>
          </Card>
        </div>
        <div style={col}>
          <Caption>A control has a hairline</Caption>
          <div style={row}>
            <Button>Secondary</Button>
            <Input aria-label="Name" placeholder="Name" style={{ width: 160 }} />
            <Badge>alpha</Badge>
          </div>
          <Text size="sm" tone="secondary">Controls, badges and chips never get a rim.</Text>
        </div>
      </div>
      <Caption>The top edge, magnified 4×</Caption>
      <div className="wt-magnify">
        <div className="wt-magnify-lens">
          <Card style={{ width: 96, height: 28 }} aria-hidden="true" />
        </div>
        <Text size="sm" tone="secondary">Dark: the top is 2 points lighter than the sides. Light: the same on every side, because a lit edge on white would not show.</Text>
      </div>
      <div style={grid}>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>run-0142</TableCell>
                <TableCell><Badge variant="plain" status="success">Ready</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Callout title="A callout is a panel" status="info">It has the rim and no coloured edge.</Callout>
      </div>
    </div>
  );
}

// ---- 3. Kbd chips

function KbdDemo({ state }: { state: string }) {
  return (
    <div style={col}>
      <div style={row}>
        <Caption>Single keys</Caption>
        <Kbd>K</Kbd>
        <Kbd>Esc</Kbd>
        <Kbd>↵</Kbd>
        <Kbd>⇧</Kbd>
        <Kbd>⌫</Kbd>
        <Kbd>⇥</Kbd>
        <Kbd>←</Kbd>
        <Kbd>↓</Kbd>
      </div>
      <div style={row}>
        <Caption>A group, one chip per key, 2px apart</Caption>
        <Kbd>⌘K</Kbd>
        <Kbd>⇧⌘P</Kbd>
        <Kbd>Ctrl+K</Kbd>
      </div>
      <div style={row}>
        <Caption>⌘ ⌥ ⌃ are Phosphor icons at 12px</Caption>
        <Kbd>⌘</Kbd>
        <Kbd>⌥</Kbd>
        <Kbd>⌃</Kbd>
        <Kbd>⌥⌘⌃⇧</Kbd>
      </div>
      <Caption>On every level (secondary text; primary on a hover or selected wash)</Caption>
      <div className="wt-levels">
        {LEVELS.map((level) => (
          <div key={level.n} className="wt-level" style={{ background: `var(--basalt-surface-${level.n})` }}>
            <div className="wt-level-name">{level.name}</div>
            <div style={row}>
              <Kbd>⌘K</Kbd>
              <span className="wt-wash" style={{ background: "var(--basalt-state-selected)" }}><Kbd>⌘K</Kbd></span>
            </div>
          </div>
        ))}
      </div>
      <div style={grid}>
        <div style={col}>
          <Caption>Tooltips</Caption>
          <Tooltip defaultOpen={state === "tooltip"} content="Open commands" shortcut="⌘K">
            <Button>Commands</Button>
          </Tooltip>
        </div>
        <div style={col}>
          <Caption>Menu rows</Caption>
          <Menu defaultOpen={state === "menu"} modal={false}>
            <MenuTrigger render={<Button iconEnd={CaretDownIcon}>Actions</Button>} />
            <MenuContent>
              <MenuItem icon={PlusIcon} shortcut="N">New sandbox</MenuItem>
              <MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem>
              <MenuItem icon={PencilSimpleIcon} shortcut="R">Rename</MenuItem>
              <MenuSeparator />
              <MenuItem icon={TrashIcon} danger shortcut="⌥⌫">Delete</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </div>
  );
}

// ---- 4. The command menu

const COMMANDS = [
  {
    label: "Sandboxes",
    commands: [
      { id: "new", label: "New sandbox", icon: PlusIcon, shortcut: "N", onSelect: () => {} },
      { id: "dup", label: "Duplicate sandbox", icon: CopyIcon, shortcut: "⌘D", onSelect: () => {} },
      { id: "del", label: "Delete sandbox", icon: TrashIcon, keywords: ["remove"], danger: true, onSelect: () => {} },
    ],
  },
  {
    label: "Settings",
    commands: [{ id: "prefs", label: "Preferences", icon: GearIcon, shortcut: "⌘,", onSelect: () => {} }],
  },
];

function CommandDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(state === "open");
  return (
    <div style={row}>
      <Button onClick={() => setOpen(true)}>
        Open commands <Kbd>⌘K</Kbd>
      </Button>
      <Text size="sm" tone="secondary">No animation on open or close, backdrop included.</Text>
      <CommandMenu open={open} onOpenChange={setOpen} groups={COMMANDS} hints />
    </div>
  );
}

// ---- 5. Menu, Select, Combobox

function ActiveRowDemo({ state }: { state: string }) {
  useHighlightFirst(state !== "default", state === "select" ? "[role=listbox]" : state === "combobox" ? "[role=listbox]" : ".basalt-menu");
  return (
    <div style={{ ...grid, minHeight: state === "default" ? undefined : 300 }}>
      <div style={col}>
        <Caption>Menu</Caption>
        <Menu defaultOpen={state === "menu"} modal={false}>
          <MenuTrigger render={<Button iconEnd={CaretDownIcon}>Actions</Button>} />
          <MenuContent>
            <MenuGroup>
              <MenuGroupLabel>Sandbox</MenuGroupLabel>
              <MenuItem icon={PlusIcon} shortcut="N">New sandbox</MenuItem>
              <MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem icon={TrashIcon} danger>Delete</MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div style={col}>
        <Caption>Select</Caption>
        <Select
          aria-label="Region"
          defaultOpen={state === "select"}
          defaultValue="fra"
          options={[
            { value: "fra", label: "Frankfurt" },
            { value: "iad", label: "Washington, DC" },
            { value: "sin", label: "Singapore" },
          ]}
        />
      </div>
      <div style={col}>
        <Caption>Combobox</Caption>
        <Combobox
          aria-label="Agent"
          defaultOpen={state === "combobox"}
          options={[
            { value: "claude", label: "Claude" },
            { value: "codex", label: "Codex" },
            { value: "gpt", label: "GPT" },
          ]}
        />
      </div>
    </div>
  );
}

// ---- 6. Buttons

const optionPressCss = `@layer review-options {
  .wt-press-b .basalt-button, .wt-press-a .basalt-button { transition-property: background-color, color, box-shadow, transform; transition-duration: var(--basalt-duration-fast); transition-timing-function: var(--basalt-ease-out); }
  .wt-press-b .basalt-button:active:not([data-disabled]):not([data-loading]),
  .wt-press-a .basalt-button:not([data-icon-only]):active:not([data-disabled]):not([data-loading]) { transform: scale(0.98); }
  @media (prefers-reduced-motion: reduce) {
    .wt-press-b .basalt-button:active, .wt-press-a .basalt-button:active { transform: none; }
  }
}`;

function ButtonsDemo() {
  return (
    <div style={col}>
      <Caption>Hold each button down: a press is a colour step</Caption>
      <div style={row}>
        <Button variant="primary">Deploy</Button>
        <Button>Cancel</Button>
        <Button variant="ghost">Preview</Button>
        <Button variant="danger">Delete</Button>
        <IconButton icon={CopyIcon} label="Copy" />
      </div>
      <Caption>The pressed primary fill, and the text on it</Caption>
      <div className="wt-press-swatches">
        <div className="wt-press-swatch" style={{ background: "var(--basalt-action-primary)", color: "var(--basalt-action-primary-text)" }}>rest</div>
        <div className="wt-press-swatch" style={{ background: "var(--basalt-action-primary-hover)", color: "var(--basalt-action-primary-text)" }}>hover</div>
        <div className="wt-press-swatch" style={{ background: "var(--basalt-action-primary-press)", color: "var(--basalt-action-primary-text)" }}>pressed</div>
        <Text size="sm" tone="secondary">
          <span className="wt-dark-only">#ededed, #ffffff, #bfbfbf</span>
          <span className="wt-light-only">#171717, #000000, #333333</span>
        </Text>
      </div>
      <Caption>Danger is text and a hairline: 4.77:1 or better on the washes, light #ba1d27</Caption>
      <div style={row}>
        <span className="wt-wash" style={{ background: "var(--basalt-state-hover)" }}><Button variant="danger">Delete</Button></span>
        <span className="wt-wash" style={{ background: "var(--basalt-state-selected)", color: "var(--basalt-status-danger)" }}>Delete sandbox</span>
        <span className="wt-wash" style={{ background: "var(--basalt-state-selected)", color: "var(--basalt-status-danger)", fontWeight: 500 }}>Run failed</span>
      </div>
      <Option title="A .98 press scale. B recommends it on Button and IconButton; A would take it on Button only, and recommends against.">
        <style>{optionPressCss}</style>
        <div style={grid}>
          <div className="wt-press-b" style={col}>
            <Caption>B: Button and IconButton</Caption>
            <div style={row}>
              <Button variant="primary">Deploy</Button>
              <Button>Cancel</Button>
              <IconButton icon={CopyIcon} label="Copy option B" />
            </div>
          </div>
          <div className="wt-press-a" style={col}>
            <Caption>A: Button only</Caption>
            <div style={row}>
              <Button variant="primary">Deploy</Button>
              <Button>Cancel</Button>
              <IconButton icon={CopyIcon} label="Copy option A" />
            </div>
          </div>
        </div>
        <Text size="sm" tone="secondary">100ms ease-out, the colour step always applies, none under reduced motion. Never on rows, cards or command rows.</Text>
      </Option>
    </div>
  );
}

// ---- 7. Motion

const MOTION_STATES = ["menu", "popover", "tooltip"];

function useSlowMotion(on: boolean) {
  React.useEffect(() => {
    if (!on) return;
    let frame = 0;
    const slow = () => {
      for (const animation of document.getAnimations()) if (animation.playbackRate !== 0.1) animation.updatePlaybackRate(0.1);
      frame = requestAnimationFrame(slow);
    };
    slow();
    return () => {
      cancelAnimationFrame(frame);
      for (const animation of document.getAnimations()) animation.updatePlaybackRate(1);
    };
  }, [on]);
}

function MotionDemo({ state }: { state: string }) {
  const [slow, setSlow] = React.useState(false);
  useSlowMotion(slow);
  const [commands, setCommands] = React.useState(false);
  return (
    <div style={col}>
      <label style={row}>
        <Switch checked={slow} onCheckedChange={setSlow} aria-label="Slow motion" />
        <Text size="sm">Slow motion (×0.1), so the .98 growth from the trigger can be seen</Text>
      </label>
      <div style={row}>
        <Menu defaultOpen={MOTION_STATES.includes(state) && state === "menu"} modal={false}>
          <MenuTrigger render={<Button iconEnd={CaretDownIcon}>Menu</Button>} />
          <MenuContent>
            <MenuItem icon={PlusIcon}>New sandbox</MenuItem>
            <MenuItem icon={CopyIcon}>Duplicate</MenuItem>
          </MenuContent>
        </Menu>
        <Popover defaultOpen={state === "popover"}>
          <PopoverTrigger render={<Button>Popover</Button>} />
          <PopoverContent side="bottom" align="start">
            <PopoverTitle>Rename</PopoverTitle>
            <PopoverDescription>A popover enters the same way: opacity and a scale of .98 from the trigger.</PopoverDescription>
          </PopoverContent>
        </Popover>
        <Tooltip defaultOpen={state === "tooltip"} content="Duplicate sandbox" shortcut="⌘D" side="bottom">
          <IconButton icon={CopyIcon} label="Duplicate" />
        </Tooltip>
        <Button onClick={() => setCommands(true)}>Command menu (none)</Button>
        <CommandMenu open={commands} onOpenChange={setCommands} groups={COMMANDS} />
      </div>
      <Text size="sm" tone="secondary">
        Entry: opacity 0 and scale .98 to 1, from the trigger side, no offset, 150ms ease-out. Exit: three quarters of that, ease-in. The command menu appears and goes at once.
      </Text>
    </div>
  );
}

// ---- 8. Spinners

function SpinnersDemo() {
  return (
    <div style={col}>
      <div style={row}>
        <Caption>Ring (default)</Caption>
        <Spinner label="Loading 16" size={16} />
        <Spinner label="Loading 20" size={20} />
        <Spinner label="Loading 24" size={24} />
        <Button loading>Saving</Button>
        <Button variant="primary" loading>Deploying</Button>
      </div>
      <div style={row}>
        <Caption>Braille, a 2 by 4 dot matrix drawn in SVG</Caption>
        <Spinner variant="braille" label="Loading runs 16" size={16} />
        <Spinner variant="braille" label="Loading runs 20" size={20} />
        <Spinner variant="braille" label="Loading runs 24" size={24} />
        <Text size="sm" tone="secondary" mono>Fetching logs</Text>
      </div>
    </div>
  );
}

// ---- 9. Vertical tabs

function TabsDemo() {
  return (
    <div style={col}>
      <Caption>Vertical: the horizontal tabs on their side</Caption>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <Tabs orientation="vertical" defaultValue="account">
          <TabsList aria-label="Settings sections">
            <Tab value="account">Account</Tab>
            <Tab value="billing">Billing</Tab>
            <Tab value="keys">API keys</Tab>
            <Tab value="danger">Danger zone</Tab>
          </TabsList>
          <TabsPanel value="account"><Text>Your name, email and sign-in. The panel moves 8px and fades in with the bar.</Text></TabsPanel>
          <TabsPanel value="billing"><Text>Plans and invoices.</Text></TabsPanel>
          <TabsPanel value="keys"><Text>Keys for this project.</Text></TabsPanel>
          <TabsPanel value="danger"><Text>Deleting a project cannot be undone.</Text></TabsPanel>
        </Tabs>
      </div>
      <Caption>Horizontal, for comparison</Caption>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <Tabs defaultValue="overview">
          <TabsList aria-label="Sandbox sections">
            <Tab value="overview">Overview</Tab>
            <Tab value="runs">Runs</Tab>
            <Tab value="settings">Settings</Tab>
          </TabsList>
          <TabsPanel value="overview"><Text>Overview.</Text></TabsPanel>
          <TabsPanel value="runs"><Text>Runs.</Text></TabsPanel>
          <TabsPanel value="settings"><Text>Settings.</Text></TabsPanel>
        </Tabs>
      </div>
    </div>
  );
}

// ---- 10. The toast drain

function ToastDemo({ state }: { state: string }) {
  const toast = useToast();
  React.useEffect(() => {
    if (state !== "shown") return;
    // long enough that the line is still nearly full when the screenshot is taken
    toast.show({ title: "Sandbox deleted", description: "blacksand-api and its routes were removed.", action: { label: "Undo", onClick: () => {} }, timeout: 60000 });
    toast.show({ title: "Route refused", description: "api.example.com isn't allowed for this run.", status: "warning", timeout: 60000 });
  }, [state, toast]);
  return (
    <div style={col}>
      <div style={row}>
        <Button onClick={() => toast.show({ title: "Route saved", description: "The 1px line on the rim shrinks for the timeout.", timeout: 8000 })}>Show a toast</Button>
        <Button onClick={() => toast.show({ title: "Run failed", description: "run-0143 exited with code 1.", status: "danger", timeout: 8000 })}>Show an error</Button>
      </div>
      <Text size="sm" tone="secondary">The line is drawn on the straight part of the bottom rim, starting where the corner ends. Hover or focus pauses it. Under reduced motion it is not drawn.</Text>
    </div>
  );
}

// ---- 11. Sparkline and glide

function SparklineDemo() {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<number[]>([2, 3, 2, 5, 4, 6]);
  const load = (series: number[]) => {
    setData(series);
    setLoading(false);
  };
  return (
    <div style={col}>
      <div style={grid}>
        <div style={col}>
          <Caption>Built: the number, the axis and the line move together</Caption>
          <Card style={{ width: "100%" }}>
            <CardContent>
              <Sparkline label="Run volume" data={data} loading={loading} empty="No runs yet" />
            </CardContent>
          </Card>
        </div>
        <Option title="A: the headline number snaps; the scale and the axis label ease.">
          <div className="wt-snap">
            <Card style={{ width: "100%" }}>
              <CardContent>
                <Sparkline label="Run volume" data={data} loading={loading} empty="No runs yet" />
              </CardContent>
            </Card>
            <span className="wt-snap-number" aria-hidden="true">{data.at(-1) ?? ""}</span>
          </div>
        </Option>
      </div>
      <div style={row}>
        <Button onClick={() => load([2, 3, 2, 5, 4, 6])}>Show runs</Button>
        <Button onClick={() => load([2, 3, 2, 5, 4, 40])}>A new peak (widens at once)</Button>
        <Button onClick={() => load([2, 3, 2, 5, 4, 3])}>A lower peak (eases in)</Button>
        <Button variant="ghost" onClick={() => { setData([]); setLoading(true); }}>Back to loading</Button>
      </div>
      <Text size="sm" tone="secondary">Time-based: 200ms ease-out, never a per-frame lerp. Reduced motion snaps everything. What is read aloud is the target value.</Text>
    </div>
  );
}

// ---- 12. The open trigger

const optionOpenCss = `@layer review-options {
  .wt-open-b .basalt-menu-trigger[data-popup-open][data-variant="secondary"] { box-shadow: 0 0 0 var(--basalt-size-hairline) var(--basalt-border-hover), 0 0 0 var(--basalt-size-hairline) var(--basalt-surface-page); }
  .wt-open-b .basalt-menu-trigger[data-popup-open][data-variant="ghost"] { background: var(--basalt-state-hover); color: var(--basalt-text-primary); }
  .wt-open-b .basalt-menu-trigger[data-popup-open][data-variant="primary"] { background: var(--basalt-action-primary-hover); }
  .wt-open-a .basalt-menu-trigger[data-popup-open][data-variant="secondary"] { background: var(--basalt-state-selected); box-shadow: 0 0 0 var(--basalt-size-hairline) var(--basalt-border-hover), 0 0 0 var(--basalt-size-hairline) var(--basalt-surface-page); }
  .wt-open-a .basalt-menu-trigger[data-popup-open][data-variant="ghost"] { background: var(--basalt-state-selected); }
  .wt-open-a .basalt-menu-trigger[data-popup-open][data-variant="primary"] { background: var(--basalt-action-primary-press); }
}`;

function useScrollTo(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  React.useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "start" });
  }, [ref, active]);
}

function OpenTriggerDemo({ state }: { state: string }) {
  const hoverRef = React.useRef<HTMLDivElement>(null);
  const pressRef = React.useRef<HTMLDivElement>(null);
  useScrollTo(hoverRef, state === "open-hover");
  useScrollTo(pressRef, state === "open-press");
  // each trigger gets its own cell, tall enough for its menu, so open menus never overlap
  const cells = (open: boolean) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, width: "100%", minHeight: open ? 150 : undefined, alignItems: "start" }}>
      {(["secondary", "ghost", "primary"] as const).map((variant) => (
        <Menu key={variant} defaultOpen={open} modal={false}>
          <MenuTrigger render={<Button variant={variant} iconEnd={CaretDownIcon}>{variant[0]!.toUpperCase() + variant.slice(1)}</Button>} />
          <MenuContent>
            <MenuItem icon={PlusIcon}>New sandbox</MenuItem>
            <MenuItem icon={CopyIcon}>Duplicate</MenuItem>
          </MenuContent>
        </Menu>
      ))}
    </div>
  );
  return (
    <div style={col}>
      <Text size="sm" tone="secondary">
        As built, a trigger whose menu is open looks like any other: there is no open state. The two options below add one. Neither applies to a Select or Combobox, which have no hover look today.
      </Text>
      <style>{optionOpenCss}</style>
      <Caption>Built (nothing)</Caption>
      {cells(false)}
      <Option title="B: the open trigger takes its hover look (secondary border-hover; ghost hover wash and primary text; primary action-primary-hover).">
        <div ref={hoverRef} className="wt-open-b">{cells(state === "open-hover")}</div>
      </Option>
      <Option title="A: the open trigger takes its press look, on button triggers only (secondary selected wash and border-hover; ghost selected wash; primary action-primary-press).">
        <div ref={pressRef} className="wt-open-a">{cells(state === "open-press")}</div>
      </Option>
    </div>
  );
}

export const ROUND_9: Round = {
  id: "9",
  title: "Surfaces, and the panel's rulings",
  reviewed: true,
  summary:
    "The design panel reviewed this round in three rounds, each reviewer on their own first and then converged; the owner has not approved it yet. It builds what the panel agreed, and shows each point they left to the owner as an option, labelled and not shipped. Press and the other motion rulings are here too.",
  steps: [
    {
      id: "levels",
      name: "Surface levels",
      intro: "Depth is four levels. A panel is one above what it sits in, a popup is its opener plus one, a modal resets to 2, and 3 is the cap. The level is private: no prop sets it.",
      decisions: [
        "Dark steps up (#000, #0a0a0a, #111111, #171717); light levels 1 to 3 are one white, and nesting shows by the rim, never by a darker fill.",
        "Wells follow the rule in dark: a code block in a card is #111111, in a dialog #171717. Light wells stay #f5f5f5.",
        "The nesting guard: group with space or a divider first; a panel is for a distinct object; at most one deeper inside any panel; three is the cap, then a divider; bands are not boxes.",
        "Role tokens alias the levels, so no existing pixel moved.",
      ],
      tryIt: ["Open the dialog, then its Actions menu: the menu is a level above the dialog.", "Compare the code block on the page, in the card and in the dialog."],
      states: ["dialog-menu"],
      demo: ({ state }) => <LevelsDemo state={state} />,
    },
    {
      id: "rim",
      name: "The rim",
      intro: "A panel's edge is one real 1px border in two solid colours. Dark is lit 2 points on top; light is uniform.",
      decisions: [
        "Dark: 6% white on the sides and bottom, 8% on top. Light: 8% black all round. No gradient along or across an edge, no glow or sheen, no blur, no outer frame.",
        "On every panel (Card, TableContainer, CodeBlock, Callout, the preview card, Popover, Menu, Select, Combobox, Dialog, CommandMenu, Sheet's inner edge, Toast, Tooltip). Never on controls, chips, badges or pills.",
        "Overlay and modal shadows lose their 1px ring layers: the rim is the edge. The divider drops to 6% white in dark, never brighter than the rim.",
        "It is a real border, so forced colours keep it.",
      ],
      tryIt: ["Switch theme and compare the top edge of the card.", "Look at the magnified corner."],
      demo: () => <RimDemo />,
    },
    {
      id: "kbd",
      name: "Kbd chips",
      intro: "A key is a fill chip with no border, one chip per key. ⌘ ⌥ ⌃ are Phosphor icons because Geist has no glyph for them.",
      decisions: [
        "20px tall, 4px padding, radius 4, Geist Mono 12/16, 2px between keys. Secondary text; primary on a hover or selected wash.",
        "Only real shortcuts, at most one per row, never on the primary fill. Shown at the row end in Menu and CommandMenu, in the CommandMenu footer and in tooltips.",
        "The chip is aria-hidden; the item carries aria-keyshortcuts (\"Meta+K\") and a spoken form (\"Command K\") as its description.",
      ],
      tryIt: ["Open the menu and move over a row: its chips go to primary text.", "Hover or focus Commands for the tooltip."],
      states: ["menu", "tooltip"],
      demo: ({ state }) => <KbdDemo state={state} />,
    },
    {
      id: "command",
      name: "Command menu",
      intro: "A raised input row, inset rows, chips at the row end, and the active-row bar. It has no animation.",
      decisions: [
        "The input row is a full-bleed band one level above the panel (#171717 in dark, white in light), 48px, 16px text, a divider below, no rim or radius of its own.",
        "Rows are Menu rows: 6px in from each side, radius 6, no sideways scroll.",
        "It is keyboard-summoned many times a day, so it neither opens nor closes with motion, its backdrop included. cmdk stays (owner-approved) and loads on demand.",
      ],
      tryIt: ["Open it, press ↓, and type \"remove\".", "Note that nothing animates in or out."],
      states: ["open"],
      demo: ({ state }) => <CommandDemo state={state} />,
    },
    {
      id: "active-row",
      name: "Menu, Select, Combobox",
      intro: "The active row is the selected wash plus a 2px by 16px bar at its start, the same in all four lists.",
      decisions: [
        "The wash alone is about 1.2:1 and a colour change alone fails WCAG 1.4.1, so the bar is the cue that does not rest on colour; it also says where focus is (2.4.7). The earlier 1.4.11 citation was wrong and is fixed.",
        "Square ended, like every other 2px bar here; primary text colour, 11.95:1 or better on the wash in dark, 13.48:1 in light. Forced colours: the row is Highlight and the bar HighlightText.",
      ],
      tryIt: ["Open each list and use the arrow keys.", "Turn on forced colours."],
      states: ["menu", "select", "combobox"],
      demo: ({ state }) => <ActiveRowDemo state={state} />,
    },
    {
      id: "buttons",
      name: "Buttons",
      intro: "A press is a colour step. Primary goes to a pressed fill; the other variants go to the selected wash. Danger is light #ba1d27 on the washes.",
      decisions: [
        "action-primary-press is the action colour 85% toward the page: about #bfbfbf in dark and #333333 in light. Its text is 11.4:1 or better.",
        "No scale on press: PR #12's .98, .94 and .99 and the basalt-press utility are gone. The native apps already press by colour.",
        "Light danger moved from oklch(.55) to oklch(.51), about #ba1d27, so red text holds 4.77:1 on the hover and selected washes. Dark is unchanged.",
        "The .98 scale is the owner's call. B recommends it on Button and IconButton; A recommends against, and would take it on Button only. The option is below.",
      ],
      tryIt: ["Hold each button down.", "Compare the two options below with the built buttons above."],
      demo: () => <ButtonsDemo />,
    },
    {
      id: "motion",
      name: "Motion",
      intro: "Main's scale and four curves. A popup grows from the trigger at .98; exits are three quarters of the entry; the command menu has no motion.",
      decisions: [
        "0 / 100 / 150 / 200 / 300ms; ease-out for entries and moves that answer input, ease-in for exits, ease-in-out only for a rest-to-rest travel and loops. The extra durations, curves and the caret blink are deleted.",
        "Popup entry: opacity and scale .98 from --transform-origin, no translate, 150ms ease-out. It grows away from the trigger on every side, which a fixed offset cannot do.",
        "Reduced motion: no transform, size or position animation; fades at 100ms. The toast stack sits at its final offsets, Progress width jumps, NumberTicker is plain text, the drain is not drawn.",
      ],
      tryIt: ["Turn on slow motion and open each popup.", "Open the command menu: it simply appears."],
      states: ["menu", "popover", "tooltip"],
      demo: ({ state }) => <MotionDemo state={state} />,
    },
    {
      id: "spinners",
      name: "Spinners",
      intro: "The ring is the default, in buttons too. Braille is for mono and CLI lines, drawn as Basalt's own SVG dot matrix.",
      decisions: [
        "Ring 640ms. Braille: ten frames (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏), 530ms, stepped; it holds under reduced motion.",
        "The dots and grid variants are dropped: three indeterminate loaders with no separate jobs would be picked at random.",
      ],
      tryIt: ["Compare the ring and braille at three sizes.", "Turn on reduced motion: the ring fades, braille holds."],
      demo: () => <SpinnersDemo />,
    },
    {
      id: "tabs",
      name: "Vertical tabs",
      intro: "The horizontal tabs turned on their side: a column, a divider facing the panel, and the 2px bar on that divider.",
      decisions: [
        "A column with 4px gaps, the panel 16px away; a divider line at the list's inline end; the 2px bar on that line spanning the active tab and moving at 200ms ease-out; rounded corners on the tabs' inline-start, square at the bar.",
        "Arrow keys move between tabs. The panel moves 8px and fades in with the bar, without remounting; under reduced motion it is a 100ms crossfade and the bar does not move. The bar is Highlight in forced colours.",
      ],
      tryIt: ["Use ↑ and ↓ then Enter.", "Switch tabs with the mouse and watch the bar and panel move together."],
      demo: () => <TabsDemo />,
    },
    {
      id: "drain",
      name: "Toast drain",
      intro: "A toast's timeout is a 1px line on its bottom rim.",
      decisions: [
        "Drawn on the straight part of the bottom rim, from where the corner ends. text-tertiary. The toast is not clipped.",
        "Paused on hover, focus and a blurred window, in step with the timers; not drawn under reduced motion.",
      ],
      tryIt: ["Show a toast and hover it: the line pauses."],
      states: ["shown"],
      demo: ({ state }) => <ToastDemo state={state} />,
    },
    {
      id: "sparkline",
      name: "Sparkline and glide",
      intro: "Renamed from Chart: a monochrome line and its latest value, not a charting component. The line, the scale and the labels ease together over 200ms.",
      decisions: [
        "Time-based at 200ms ease-out, never 8% per frame; intermediate figures are rounded to the display precision; reduced motion snaps; the accessible value is the target.",
        "Built: the headline number, the axis label and the scale ease together (the owner's earlier \"number, axis and badge move together\"). Reviewer A would have the number snap, shown below.",
        "A new peak widens the scale at once so it is never clipped. The loading line breathes on the 1200ms fade: the one loop kept outside spinners.",
      ],
      tryIt: ["Show runs, then a lower peak and a new peak.", "Compare the two cards while the value changes."],
      demo: () => <SparklineDemo />,
    },
    {
      id: "open-trigger",
      name: "The open trigger",
      intro: "Whether a trigger whose popup is open should look different. As built it does not; this is optional and new.",
      decisions: [
        "Not built. Base UI marks an open trigger (data-popup-open), so either look is one rule away if the owner wants it.",
        "B: the trigger's hover look, because it is the last thing seen before the click and adds no new look. A: the press look, on button triggers only, because Base UI also calls an open trigger pressed. Neither applies to Select or Combobox.",
      ],
      tryIt: ["Open a menu from each button, in each block.", "Compare how long a held look reads: the press fill held for seconds can look selected."],
      states: ["open-hover", "open-press"],
      demo: ({ state }) => <OpenTriggerDemo state={state} />,
    },
  ],
};
