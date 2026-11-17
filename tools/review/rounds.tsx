// The review rounds: what each round built, what review changed, and a live demo of each
// component. tools/review/build.mjs turns one round into a downloadable walkthrough and a set
// of screenshots. Add a round here at the end of each review.

import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CopyIcon,
  CubeIcon,
  GearIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  TerminalIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import * as React from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  CommandMenu,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Field,
  Icon,
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
  Radio,
  RadioGroup,
  Segment,
  SegmentedControl,
  Select,
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
  Tooltip,
  useToast,
} from "../../packages/react/src/index";
import { ROUND_3 } from "./round3";
import { ROUND_4 } from "./round4";
import { ROUND_5 } from "./round5";
import { ROUND_6 } from "./round6";
import { ROUND_7 } from "./round7";
import { ROUND_8 } from "./round8";
import { ROUND_9 } from "./round9";
import { ROUND_10 } from "./round10";
import { ROUND_11 } from "./round11";
import { ROUND_12 } from "./round12";
import { ROUND_13 } from "./round13";
import { ROUND_14 } from "./round14";
import { ROUND_15 } from "./round15";
import { ROUND_16 } from "./round16";
import { ROUND_17 } from "./round17";
import { ROUND_18 } from "./round18";
import { ROUND_19 } from "./round19";
import { ROUND_20 } from "./round20";
import { ROUND_21 } from "./round21";
import { ROUND_22 } from "./round22";
import { ROUND_23 } from "./round23";
import { ROUND_24 } from "./round24";
import { ROUND_25 } from "./round25";
import { ROUND_26 } from "./round26";
import { ROUND_27 } from "./round27";
import { ROUND_28 } from "./round28";
import { ROUND_29 } from "./round29";
import { ROUND_30 } from "./round30";
import { ROUND_31 } from "./round31";
import { ROUND_32 } from "./round32";
import { ROUND_33 } from "./round33";
import { ROUND_34 } from "./round34";
import { ROUND_35 } from "./round35";
import { ROUND_36 } from "./round36";
import { ROUND_37 } from "./round37";
import { ROUND_39 } from "./round39";

export interface Step {
  id: string;
  name: string;
  /** One or two sentences: what it is and when to use it. */
  intro: string;
  /** What review decided, and why. */
  decisions: string[];
  /** Things to try in the live demo. */
  tryIt: string[];
  /** Extra states to screenshot besides the default, e.g. "open". "name@1024" is shot at that one width. */
  states?: string[];
  /** The widths to shoot every state at. Default 960 and 390. */
  widths?: number[];
  /** 1 for 1x, 2 for 2x. Default 2x only. */
  scales?: number[];
  /** The viewport height. Default 400, or 640 for an open state. */
  height?: number;
  /** Shot edge to edge, with none of the page's own padding, so a page specimen is the width the shot is named for (a layout round's row is then the real row). */
  bleed?: boolean;
  demo: (props: { state: string }) => React.ReactNode;
}

export interface Round {
  id: string;
  title: string;
  summary: string;
  pr?: string;
  /** A PR link alone does not imply that the design has been reviewed. */
  reviewed?: boolean;
  steps: Step[];
}

const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const muted: React.CSSProperties = { fontSize: 13, color: "var(--basalt-text-secondary)" };

const RUNS = [
  { id: "run-0142", status: "success" as const, label: "Ready", agent: "claude", time: "4m 12s", commit: "a81f3c2" },
  { id: "run-0141", status: "warning" as const, label: "Building", agent: "codex", time: "2m 50s", commit: "9c04e1d" },
  { id: "run-0140", status: "danger" as const, label: "Error", agent: "claude", time: "11m 03s", commit: "5be7a90" },
];

function ToastDemo({ state }: { state: string }) {
  const toast = useToast();
  React.useEffect(() => {
    if (state === "shown") {
      toast.show({ title: "Sandbox deleted", description: "blacksand-api and its routes were removed.", action: { label: "Undo", onClick: () => {} }, timeout: 0 });
      toast.show({ title: "Route refused", description: "api.example.com isn't allowed for this run.", status: "warning", timeout: 0 });
    }
  }, [state, toast]);
  return (
    <div style={row}>
      <Button onClick={() => toast.show({ title: "Sandbox deleted", description: "blacksand-api and its routes were removed.", action: { label: "Undo", onClick: () => {} } })}>Show a toast</Button>
      <Button onClick={() => toast.show({ title: "Route refused", description: "api.example.com isn't allowed for this run.", status: "warning" })}>Show a warning</Button>
      <Button variant="ghost" onClick={() => toast.show({ title: "Run failed", description: "run-0143 exited with code 1.", status: "danger" })}>Show an error</Button>
    </div>
  );
}

function CommandDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(state === "open");
  const [ran, setRan] = React.useState("Nothing run yet.");
  const run = (label: string) => () => setRan(`Ran: ${label}`);
  return (
    <div style={row}>
      <Button onClick={() => setOpen(true)}>
        Open commands <Kbd>⌘K</Kbd>
      </Button>
      <span style={muted}>{ran}</span>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        groups={[
          {
            label: "Sandboxes",
            commands: [
              { id: "new", label: "New sandbox", icon: PlusIcon, shortcut: "N", onSelect: run("New sandbox") },
              { id: "dup", label: "Duplicate sandbox", icon: CopyIcon, shortcut: "⌘D", onSelect: run("Duplicate sandbox") },
              { id: "del", label: "Delete sandbox", icon: TrashIcon, keywords: ["remove"], danger: true, onSelect: run("Delete sandbox") },
            ],
          },
          {
            label: "Runs",
            commands: [
              { id: "rerun", label: "Re-run last task", icon: ArrowsClockwiseIcon, onSelect: run("Re-run last task") },
              { id: "logs", label: "Open logs", icon: TerminalIcon, onSelect: run("Open logs") },
            ],
          },
        ]}
      />
    </div>
  );
}

function SegmentedDemo() {
  const [range, setRange] = React.useState("24h");
  return (
    <div style={col}>
      <SegmentedControl aria-label="Time range" value={range} onValueChange={setRange}>
        <Segment value="1h">1h</Segment>
        <Segment value="24h">24h</Segment>
        <Segment value="7d">7d</Segment>
        <Segment value="30d">30d</Segment>
      </SegmentedControl>
      <span style={muted}>Showing the last {range}.</span>
    </div>
  );
}

const ROUND_1: Round = {
  id: "1",
  title: "Components, set 1",
  pr: "https://github.com/bmjcoding/basalt/pull/1",
  summary:
    "The first fourteen components on Base UI, styled entirely from tokens. Two designers reviewed them; their changes are in. Every demo here is the real component.",
  steps: [
    {
      id: "button",
      name: "Button",
      intro: "Runs an action. Primary for the one main action in a view, secondary for the rest, ghost for quiet actions, danger for destructive ones.",
      decisions: [
        "Hover brightens: the hairline steps up on secondary, a wash appears on ghost. A press darkens and scales slightly: .98 on a button, .94 on an icon button. Reduced motion keeps the colour and drops the scale.",
        "Danger is red text on a red hairline. There is no filled red button: Basalt is monochrome, and a destructive action stays quieter than the primary beside it.",
        "Disabled keeps its variant's shape, so it reads as the same control, unavailable, not as a different button.",
        "Five heights, 24 to 40px; 32px is the app default.",
      ],
      tryIt: ["Hover each variant.", "Press Tab to move focus: a 2px outline in the focus colour, 2px off the button.", "Hold the mouse down on Cancel: the fill darkens and the button scales to .98."],
      demo: () => (
        <div style={col}>
          <div style={row}>
            <Button variant="primary" icon={PlayIcon}>Deploy</Button>
            <Button>Cancel</Button>
            <Button variant="ghost">Preview</Button>
            <Button variant="danger" icon={TrashIcon}>Delete</Button>
            <IconButton icon={GearIcon} label="Settings" variant="secondary" />
          </div>
          <div style={row}>
            {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
              <Button key={s} size={s}>Cancel</Button>
            ))}
          </div>
          <div style={row}>
            <Button variant="primary" disabled>Deploy</Button>
            <Button disabled>Cancel</Button>
            <Button variant="danger" disabled>Delete</Button>
          </div>
        </div>
      ),
    },
    {
      id: "field",
      name: "Field and Input",
      intro: "A labelled form field: label, control, description and error, wired together for screen readers.",
      decisions: [
        "Input borders are 38% white or 45% black: 3.3:1 or better on every surface, where Vercel's measure 1.35:1. WCAG 1.4.11 asks for 3:1.",
        "Every field has a visible label; placeholder text is only an example.",
        "Errors say how to fix it, in the danger colour at 4.68:1 or better.",
      ],
      tryIt: ["Click a label: focus moves to its input.", "Tab into the inputs to see the focus outline."],
      demo: () => (
        <div style={{ ...row, alignItems: "flex-start", maxWidth: 640 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Field label="Sandbox name" description="Lowercase, 3 to 32 characters.">
              <Input defaultValue="agent-runner-01" />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Field label="Route" invalid error="Enter a host, for example api.anthropic.com.">
              <Input defaultValue="https://" />
            </Field>
          </div>
          <div style={{ flexBasis: "100%" }}>
            <Field label="Search">
              <Input placeholder="Search runs" />
            </Field>
          </div>
        </div>
      ),
    },
    {
      id: "menu",
      name: "Menu",
      intro: "A menu of actions on a trigger. Opens by click or keyboard; closes on Esc or an outside click, and focus returns to the trigger.",
      decisions: [
        "6px padding, 32px rows, 12px outer radius with 6px items: the nested radius is the outer minus the padding.",
        "Shortcuts sit in tertiary and step up to secondary on the highlighted row, where tertiary would fall below 4.5:1.",
        "Destructive items come last, after a separator, in the danger colour.",
      ],
      tryIt: ["Focus Actions and press Enter.", "Use the arrow keys, then Esc: focus returns to Actions."],
      states: ["open"],
      demo: ({ state }) => (
        <div style={{ minHeight: state === "open" ? 260 : undefined }}>
          <Menu defaultOpen={state === "open"} modal={false}>
            <MenuTrigger render={<Button iconEnd={CaretDownIcon}>Actions</Button>} />
            <MenuContent>
              <MenuGroup>
                <MenuGroupLabel>Sandbox</MenuGroupLabel>
                <MenuItem icon={PlusIcon} shortcut="N">New sandbox</MenuItem>
                <MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem>
                <MenuItem icon={PencilSimpleIcon} shortcut="R">Rename</MenuItem>
              </MenuGroup>
              <MenuSeparator />
              <MenuItem icon={TrashIcon} danger>Delete</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      ),
    },
    {
      id: "dialog",
      name: "Dialog",
      intro: "A modal decision. Focus moves in, stays in, and returns to the trigger when it closes. Esc closes it.",
      decisions: [
        "A destructive confirmation's action is the danger variant, never primary: the white primary button made Delete the loudest thing on screen.",
        "It opens with focus on Cancel, the safe choice.",
        "The title names the thing and the description the consequence.",
      ],
      tryIt: ["Open it, then press Tab repeatedly: focus never leaves the dialog.", "Press Esc: focus returns to the trigger."],
      states: ["open"],
      demo: ({ state }) => (
        <Dialog defaultOpen={state === "open"}>
          <DialogTrigger render={<Button variant="danger">Delete sandbox</Button>} />
          <DialogContent>
            <DialogTitle>Delete blacksand-api?</DialogTitle>
            <DialogDescription>Its runs and records stay. The sandbox and its routes are removed, and this can't be undone.</DialogDescription>
            <DialogActions>
              <DialogClose render={<Button>Cancel</Button>} />
              <DialogClose render={<Button variant="danger">Delete sandbox</Button>} />
            </DialogActions>
          </DialogContent>
        </Dialog>
      ),
    },
    {
      id: "tabs",
      name: "Tabs",
      intro: "Switch between panels of one view.",
      decisions: ["The active tab is marked by a 2px bar that slides between tabs, not by colour alone."],
      tryIt: ["Focus a tab and use the arrow keys."],
      demo: () => (
        <Tabs defaultValue="overview">
          <TabsList aria-label="Sandbox">
            <Tab value="overview">Overview</Tab>
            <Tab value="runs">Runs</Tab>
            <Tab value="settings">Settings</Tab>
          </TabsList>
          <TabsPanel value="overview" style={{ ...muted, paddingTop: 12 }}>Three sandboxes on a single k3s node.</TabsPanel>
          <TabsPanel value="runs" style={{ ...muted, paddingTop: 12 }}>142 runs this week.</TabsPanel>
          <TabsPanel value="settings" style={{ ...muted, paddingTop: 12 }}>Routes, keys and limits.</TabsPanel>
        </Tabs>
      ),
    },
    {
      id: "segmented",
      name: "Segmented control",
      intro: "One choice among a few options that filter the current view, like a time range.",
      decisions: [
        "The selected segment is a raised pill with a hairline. A grey wash alone measured 1.2:1 and failed WCAG 1.4.11.",
        "Exactly one segment is always selected: Base UI alone would let you deselect the last one, so Basalt prevents it.",
      ],
      tryIt: ["Click the selected segment again: it stays selected.", "Pick another range."],
      demo: () => <SegmentedDemo />,
    },
    {
      id: "badge",
      name: "Badge and Kbd",
      intro: "A small label, such as a deployment state, and a key or shortcut.",
      decisions: [
        "Neutral pill with a 4px radius; colour lives only in the dot, and the word always says the status.",
        "In tables a status is a plain dot and word: a pill on every row was the most generic part of the set.",
      ],
      tryIt: ["Compare the outline badges with the plain ones."],
      demo: () => (
        <div style={col}>
          <div style={row}>
            <Badge status="success">Ready</Badge>
            <Badge status="warning">Building</Badge>
            <Badge status="danger">Error</Badge>
            <Badge>alpha</Badge>
          </div>
          <div style={row}>
            <Badge variant="plain" status="success">Ready</Badge>
            <Badge variant="plain" status="warning">Building</Badge>
            <Badge variant="plain" status="danger">Error</Badge>
          </div>
          <div style={row}>
            <Kbd>⌘K</Kbd>
            <Kbd>⌘D</Kbd>
            <Kbd>Esc</Kbd>
          </div>
        </div>
      ),
    },
    {
      id: "card",
      name: "Card",
      intro: "A raised surface grouping one thing: a sandbox, a metric, a setting.",
      decisions: ["A hairline only: no shadow, no top highlight, no coloured edge. Footer actions sit right."],
      tryIt: ["Switch themes: in light mode the white card lifts off the #fafafa page without a shadow."],
      demo: () => (
        <Card style={{ maxWidth: 420 }}>
          <CardHeader>
            <CardTitle>blacksand-api</CardTitle>
            <CardDescription>k3s · single node · 3 sandboxes</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: 24, lineHeight: "30px", fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              $0.0042 <span style={{ ...muted, fontSize: 12, fontWeight: 400, letterSpacing: 0 }}>per 1k tokens</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="ghost">View runs</Button>
            <Button size="sm" variant="primary">Open</Button>
          </CardFooter>
        </Card>
      ),
    },
    {
      id: "table",
      name: "Table",
      intro: "A data table in a rounded frame that scrolls sideways when it must.",
      decisions: [
        "40px rows by default, 32px for logs (compact), 44px on touch.",
        "A selected row gets a 2px bar on its leading edge as well as the wash, so it's not shown by colour alone.",
        "No icon repeated on every row: it said nothing that differed between rows.",
        "Numbers use tabular figures; hashes are mono.",
      ],
      tryIt: ["Hover the rows.", "Find the selected row's bar."],
      demo: () => (
        <TableContainer>
          <Table>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Recent runs</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead numeric>Duration</TableHead>
                <TableHead>Commit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RUNS.map((r, i) => (
                <TableRow key={r.id} selected={i === 0}>
                  <TableCell style={{ fontWeight: 500 }}>{r.id}</TableCell>
                  <TableCell>
                    <Badge variant="plain" status={r.status}>{r.label}</Badge>
                  </TableCell>
                  <TableCell>{r.agent}</TableCell>
                  <TableCell numeric>{r.time}</TableCell>
                  <TableCell mono>{r.commit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ),
    },
    {
      id: "tooltip",
      name: "Tooltip",
      intro: "A short hint on hover or focus that supplements a control's name; it never replaces a label.",
      decisions: ["Icon-only buttons always carry a label; the tooltip repeats it for sighted users."],
      tryIt: ["Hover or Tab to the icon buttons."],
      states: ["open"],
      demo: ({ state }) => (
        <div style={{ ...row, paddingTop: 36 }}>
          <Tooltip content="Settings" defaultOpen={state === "open"}>
            <IconButton icon={GearIcon} label="Settings" variant="secondary" />
          </Tooltip>
          <Tooltip content="Search runs">
            <IconButton icon={MagnifyingGlassIcon} label="Search" />
          </Tooltip>
        </div>
      ),
    },
    {
      id: "icon",
      name: "Icon",
      intro: "Phosphor icons at Basalt's weights, in the text colour.",
      decisions: [
        "Bold at 16px, so the line matches Vercel's and Linear's 16px icons; Phosphor Regular at 16px read thin and soft.",
        "Regular at 20px and up; Fill for a selected state.",
      ],
      tryIt: ["Compare the 16px row with the 20px row."],
      demo: () => (
        <div style={{ ...col, color: "var(--basalt-text-secondary)" }}>
          <div style={{ ...row, gap: 16 }}>
            {[HouseIcon, CubeIcon, TerminalIcon, MagnifyingGlassIcon, GearIcon].map((I, i) => (
              <Icon key={i} icon={I} size={16} />
            ))}
            <span style={{ fontSize: 12 }}>16 · Bold</span>
          </div>
          <div style={{ ...row, gap: 16 }}>
            {[HouseIcon, CubeIcon, TerminalIcon, MagnifyingGlassIcon, GearIcon].map((I, i) => (
              <Icon key={i} icon={I} size={20} selected={i === 0} />
            ))}
            <span style={{ fontSize: 12 }}>20 · Regular, first selected (Fill)</span>
          </div>
        </div>
      ),
    },
  ],
};

const ROUND_2: Round = {
  id: "2",
  title: "Components, set 2",
  pr: "https://github.com/bmjcoding/basalt/pull/3",
  summary: "Choices, Select, Toast and the command menu. Both designers' changes are in. Every demo here is the real component.",
  steps: [
    {
      id: "checkbox",
      name: "Checkbox",
      intro: "An on/off choice that takes effect when a form is submitted, or one of several independent options.",
      decisions: [
        "Checked fills with the primary action colour: the inverse neutral, not a hue, so the system stays monochrome.",
        "The empty box is bounded by the input border, 3:1 or better.",
        "Indeterminate shows a dash, for a parent of mixed children.",
      ],
      tryIt: ["Click a label: it toggles the box.", "Tab to a box and press Space."],
      demo: () => (
        <div style={{ ...col, gap: 4 }}>
          <Checkbox defaultChecked>Keep run records</Checkbox>
          <Checkbox>Allow outbound DNS</Checkbox>
          <Checkbox indeterminate>All routes</Checkbox>
          <Checkbox disabled>Signed commits only</Checkbox>
        </div>
      ),
    },
    {
      id: "switch",
      name: "Switch",
      intro: "A setting that takes effect immediately. The label names the setting, not the action.",
      decisions: [
        "Off is quiet: a tertiary thumb. In light mode a secondary thumb looked almost as heavy as on.",
        "On is a full primary track and the thumb moves across: shape and position, not colour alone.",
      ],
      tryIt: ["Toggle each switch, with the mouse and with Space."],
      demo: () => (
        <div style={{ ...col, gap: 4 }}>
          <Switch defaultChecked>Auto-deploy</Switch>
          <Switch>Verbose logs</Switch>
          <Switch disabled>Remote builds</Switch>
        </div>
      ),
    },
    {
      id: "radio",
      name: "Radio group",
      intro: "One choice among a few options, all visible. For more than five or so, use Select.",
      decisions: ["Checked fills like the checkbox, with a 6px dot."],
      tryIt: ["Tab into the group and use the arrow keys."],
      demo: () => (
        <RadioGroup aria-label="Substrate" defaultValue="k3s">
          <Radio value="k3s">Kubernetes (k3s)</Radio>
          <Radio value="vm">Virtual machine</Radio>
          <Radio value="gvisor">gVisor</Radio>
        </RadioGroup>
      ),
    },
    {
      id: "select",
      name: "Select",
      intro: "One choice from a list too long for radios.",
      decisions: [
        "The trigger looks like an input; the list opens below it, like a menu, with a check on the selection.",
        "Its Field labels it, so a screen reader announces \"Region\".",
        "Disabled options stay visible in the disabled colour.",
      ],
      tryIt: ["Focus it and press Enter, then use the arrows and Enter to pick.", "Note that Tokyo can't be chosen."],
      states: ["open"],
      demo: ({ state }) => (
        <div style={{ width: 280, minHeight: state === "open" ? 230 : undefined }}>
          <Field label="Region">
            <Select
              defaultOpen={state === "open"}
              modal={false}
              defaultValue="iad"
              options={[
                { value: "iad", label: "Washington, D.C. (iad1)" },
                { value: "sfo", label: "San Francisco (sfo1)" },
                { value: "fra", label: "Frankfurt (fra1)" },
                { value: "hnd", label: "Tokyo (hnd1)", disabled: true },
              ]}
            />
          </Field>
        </div>
      ),
    },
    {
      id: "toast",
      name: "Toast",
      intro: "A short message about something that just happened, bottom-right, announced to screen readers.",
      decisions: [
        "Toasts sat on the top surface in this round, so they separated from an open menu beneath them. They are level 1 now (round 18).",
        "A dot only for warnings and errors: a green dot on \"Sandbox deleted\" signalled the wrong thing.",
        "One action at most, such as Undo. Dismiss appears when the stack expands on hover or focus.",
      ],
      tryIt: ["Show a few toasts: they stack.", "Hover the stack to expand it, then dismiss one."],
      states: ["shown"],
      demo: ({ state }) => <ToastDemo state={state} />,
    },
    {
      id: "command",
      name: "Command menu",
      intro: "A searchable list of every action, opened with ⌘K in an app. Type to filter, arrows to move, Enter to run, Esc to close.",
      decisions: [
        "Keywords find commands by other words: \"remove\" finds Delete sandbox.",
        "Destructive commands are red, as in Menu.",
        "The key-hint footer is optional and off by default: ↵ and Esc are universal.",
        "The search text is 16px, which also stops iOS from zooming on focus.",
      ],
      tryIt: ["Open it and type \"remove\", then Enter.", "Type nonsense to see the empty state; Esc closes."],
      states: ["open"],
      demo: ({ state }) => <CommandDemo state={state} />,
    },
  ],
};

export const ROUNDS: Round[] = [ROUND_1, ROUND_2, ROUND_3, ROUND_4, ROUND_5, ROUND_6, ROUND_7, ROUND_8, ROUND_9, ROUND_10, ROUND_11, ROUND_12, ROUND_13, ROUND_14, ROUND_15, ROUND_16, ROUND_17, ROUND_18, ROUND_19, ROUND_20, ROUND_22];

// Rounds 21 and 23 are registered apart from the list above, so merging them with rounds 20 and 22 (built on other branches) keeps all of them.
ROUNDS.push(ROUND_21);
ROUNDS.push(ROUND_23);
ROUNDS.push(ROUND_24);
ROUNDS.push(ROUND_25);
ROUNDS.push(ROUND_26);
ROUNDS.push(ROUND_27);
ROUNDS.push(ROUND_28);
ROUNDS.push(ROUND_29);
ROUNDS.push(ROUND_30);
ROUNDS.push(ROUND_31);
ROUNDS.push(ROUND_32);
ROUNDS.push(ROUND_33);
ROUNDS.push(ROUND_34);
ROUNDS.push(ROUND_35);
ROUNDS.push(ROUND_36);
ROUNDS.push(ROUND_37);
ROUNDS.push(ROUND_39);
