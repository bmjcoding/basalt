// Every component on one page, for the browser tests and for review screenshots.
// ?theme=dark|light pins the theme; ?open=menu|dialog opens an overlay on load.

import { ArrowsClockwiseIcon, CaretDownIcon, CopyIcon, DotsThreeIcon, GearIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlayIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import * as React from "react";
import { createRoot } from "react-dom/client";

import {
  Checkbox,
  CommandMenu,
  Radio,
  RadioGroup,
  Select,
  Switch,
  ToastProvider,
  useToast,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Field,
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
  Segment,
  SegmentedControl,
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
  TooltipProvider,
} from "../src/index";

const params = new URLSearchParams(location.search);
const theme = params.get("theme");
if (theme) document.documentElement.dataset.theme = theme;
const open = params.get("open");

const RUNS = [
  { id: "run-0142", agent: "claude", time: "4m 12s", commit: "a81f3c2", status: "success" as const, label: "Ready" },
  { id: "run-0141", agent: "codex", time: "2m 50s", commit: "9c04e1d", status: "warning" as const, label: "Building" },
  { id: "run-0140", agent: "claude", time: "11m 03s", commit: "5be7a90", status: "danger" as const, label: "Error" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="h">{title}</h2>
      {children}
    </section>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast.show({ title: "Sandbox deleted", description: "blacksand-api and its routes were removed.", action: { label: "Undo", onClick: () => {} }, timeout: 0 })
      }
    >
      Show toast
    </Button>
  );
}

function CommandDemo() {
  const [cmdOpen, setCmdOpen] = React.useState(open === "command");
  const [ran, setRan] = React.useState("");
  const run = (label: string) => () => setRan(label);
  return (
    <>
      <Button onClick={() => setCmdOpen(true)} iconEnd={undefined}>
        Commands <Kbd>⌘K</Kbd>
      </Button>
      <span data-testid="ran" style={{ fontSize: 13, color: "var(--basalt-text-secondary)" }}>{ran}</span>
      <CommandMenu
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        groups={[
          { label: "Sandboxes", commands: [
            { id: "new", label: "New sandbox", icon: PlusIcon, shortcut: "N", onSelect: run("New sandbox") },
            { id: "dup", label: "Duplicate sandbox", icon: CopyIcon, shortcut: "⌘D", onSelect: run("Duplicate sandbox") },
            { id: "del", label: "Delete sandbox", icon: TrashIcon, keywords: ["remove"], danger: true, onSelect: run("Delete sandbox") },
          ] },
          { label: "Runs", commands: [
            { id: "rerun", label: "Re-run last task", icon: ArrowsClockwiseIcon, onSelect: run("Re-run last task") },
            { id: "deploy", label: "Deploy", icon: PlayIcon, onSelect: run("Deploy") },
          ] },
        ]}
      />
    </>
  );
}

function App() {
  const [range, setRange] = React.useState("24h");
  return (
    <TooltipProvider>
     <ToastProvider>
      <main className="theme" data-testid="page">
        <h1 style={{ margin: 0, font: "var(--basalt-font-weight-semibold) var(--basalt-text-2xl-size)/var(--basalt-text-2xl-line-height) var(--basalt-font-family-sans)", letterSpacing: "var(--basalt-text-2xl-tracking)" }}>
          Basalt components
        </h1>

        <Section title="Buttons">
          <div className="row">
            <Button variant="primary" icon={PlayIcon}>Deploy</Button>
            <Button>Cancel</Button>
            <Button variant="ghost">Preview</Button>
            <Button variant="danger" icon={TrashIcon}>Delete</Button>
            <Button disabled>Disabled</Button>
            <Tooltip content="Settings">
              <IconButton icon={GearIcon} label="Settings" variant="secondary" />
            </Tooltip>
          </div>
          <div className="row">
            {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
              <Button key={s} size={s} icon={PlusIcon}>
                New sandbox
              </Button>
            ))}
          </div>
          <div className="row">
            {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
              <Button key={s} size={s}>
                Cancel
              </Button>
            ))}
            <Button variant="primary" disabled>
              Deploy
            </Button>
            <Button variant="danger" disabled>
              Delete
            </Button>
          </div>
        </Section>

        <Section title="Fields">
          <div className="row" style={{ alignItems: "flex-start" }}>
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
          </div>
          <Field label="Search">
            <Input placeholder="Search runs" />
          </Field>
        </Section>

        <Section title="Choices">
          <div className="row" style={{ alignItems: "flex-start", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Checkbox defaultChecked>Keep run records</Checkbox>
              <Checkbox>Allow outbound DNS</Checkbox>
              <Checkbox indeterminate>All routes</Checkbox>
              <Checkbox disabled>Signed commits only</Checkbox>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Switch defaultChecked>Auto-deploy</Switch>
              <Switch>Verbose logs</Switch>
            </div>
            <RadioGroup aria-label="Substrate" defaultValue="k3s">
              <Radio value="k3s">Kubernetes (k3s)</Radio>
              <Radio value="vm">Virtual machine</Radio>
              <Radio value="gvisor">gVisor</Radio>
            </RadioGroup>
            <div style={{ width: 220 }}>
              <Field label="Region">
                <Select
                  defaultOpen={open === "select"}
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
          </div>
        </Section>

        <Section title="Feedback">
          <div className="row">
            <ToastDemo />
            <CommandDemo />
          </div>
        </Section>

        <Section title="Navigation">
          <Tabs defaultValue="overview">
            <TabsList aria-label="Sandbox">
              <Tab value="overview">Overview</Tab>
              <Tab value="runs">Runs</Tab>
              <Tab value="settings">Settings</Tab>
            </TabsList>
            <TabsPanel value="overview" style={{ paddingTop: 12, color: "var(--basalt-text-secondary)", fontSize: 13 }}>
              Three sandboxes on a single k3s node.
            </TabsPanel>
            <TabsPanel value="runs" style={{ paddingTop: 12, color: "var(--basalt-text-secondary)", fontSize: 13 }}>
              142 runs this week.
            </TabsPanel>
            <TabsPanel value="settings" style={{ paddingTop: 12, color: "var(--basalt-text-secondary)", fontSize: 13 }}>
              Routes, keys and limits.
            </TabsPanel>
          </Tabs>
          <div className="row">
            <SegmentedControl aria-label="Time range" value={range} onValueChange={setRange} data-testid="segmented">
              <Segment value="1h">1h</Segment>
              <Segment value="24h">24h</Segment>
              <Segment value="7d">7d</Segment>
            </SegmentedControl>
            {RUNS.map((r) => (
              <Badge key={r.id} status={r.status}>
                {r.label}
              </Badge>
            ))}
            <Badge>alpha</Badge>
            <Kbd>⌘K</Kbd>
          </div>
        </Section>

        <Section title="Surfaces">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <Card style={{ flex: 1, minWidth: 240 }}>
              <CardHeader>
                <CardTitle>blacksand-api</CardTitle>
                <CardDescription>k3s · single node · 3 sandboxes</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ fontSize: 24, lineHeight: "30px", fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                  $0.0042 <span style={{ fontSize: 12, fontWeight: 400, letterSpacing: 0, color: "var(--basalt-text-secondary)" }}>per 1k tokens</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="ghost">View runs</Button>
                <Button size="sm" variant="primary">Open</Button>
              </CardFooter>
            </Card>

            <Menu defaultOpen={open === "menu"}>
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

            <Dialog defaultOpen={open === "dialog"}>
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
          </div>

          <TableContainer>
            <Table>
              <caption className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                Recent runs
              </caption>
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
                      <Badge variant="plain" status={r.status}>
                        {r.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.agent}</TableCell>
                    <TableCell numeric>{r.time}</TableCell>
                    <TableCell mono>{r.commit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <div className="row">
            <IconButton icon={MagnifyingGlassIcon} label="Search" />
            <IconButton icon={DotsThreeIcon} label="More actions" />
          </div>
        </Section>
      </main>
     </ToastProvider>
    </TooltipProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
