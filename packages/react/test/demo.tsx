// Every component on one page, for the browser tests and for review screenshots.
// ?theme=dark|light pins the theme; ?open=menu|dialog opens an overlay on load.

import { ArrowsClockwiseIcon, CaretDownIcon, CopyIcon, DotsThreeIcon, GearIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlayIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { CompletionFixtures } from "../examples/completion";

import {
  Accordion,
  AccordionItem,
  Callout,
  CodeBlock,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  NumberTicker,
  Progress,
  Skeleton,
  Spinner,
  Textarea,
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

function MotionFixture() {
  const [value, setValue] = React.useState(1284);
  const [clicks, setClicks] = React.useState(0);
  return (
    <Section title="Motion">
      <div className="row">
        <Spinner variant="dots" label="Loading marks" />
        <Spinner variant="grid" label="Loading grid" />
        <Spinner variant="braille" label="Loading runs" />
      </div>
      <div className="row">
        <NumberTicker value={value} />
        <Button onClick={() => setValue((n) => n + 1)}>Add a run</Button>
      </div>
      <Button variant="primary" loading onClick={() => setClicks((n) => n + 1)}>Saving</Button>
      <span data-testid="saving-clicks">{clicks}</span>
    </Section>
  );
}

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

// A toast shown from an effect that depends on useToast(): must show once, not loop.
function ToastOnLoad() {
  const toast = useToast();
  React.useEffect(() => {
    if (open === "toast") toast.show({ title: "Shown on load", timeout: 0 });
  }, [toast]);
  return null;
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

function CodeFixture() {
  const [language, setLanguage] = React.useState("typescript");
  const [code, setCode] = React.useState('// Route\nconst route: string = "api.example.com";\nconst limit = 42;\n');
  return (
    <Section title="Code fixtures">
      <Field label="Code language"><Input value={language} onChange={(e) => setLanguage(e.target.value)} /></Field>
      <Field label="Code source"><Textarea value={code} onChange={(e) => setCode(e.target.value)} /></Field>
      <CodeBlock title="Example" code={code} language={language} />
    </Section>
  );
}

function TextareaFixture() {
  const [value, setValue] = React.useState("Original task");
  return (
    <Section title="Textarea fixtures">
      <Field label="Controlled task" name="task" description="Describe the task." invalid={value.length < 3} error="Use at least 3 characters.">
        <Textarea id="controlled-task" value={value} onChange={(e) => setValue(e.target.value)} required />
      </Field>
      <Button onClick={() => setValue("")}>Clear task</Button>
      <output aria-label="Task value">{value}</output>
      <Field label="Disabled task" disabled><Textarea defaultValue="Unavailable" /></Field>
      <Field label="Read only task"><Textarea readOnly defaultValue="Fixed" /></Field>
    </Section>
  );
}

function DensityFixture() {
  return (
    <Section title="Density fixtures">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <div className="row" key={size} data-testid={`density-${size}`}>
          <Button size={size}>{size}</Button>
          <div style={{ width: 180 }}><Field label={`Input ${size}`}><Input controlSize={size} /></Field></div>
          <div style={{ width: 180 }}><Field label={`Select ${size}`}><Select controlSize={size} options={[{ value: "one", label: "One" }]} defaultValue="one" /></Field></div>
        </div>
      ))}
    </Section>
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

        {params.get("fixture") === "code" ? <CodeFixture /> : null}
        {params.get("fixture") === "textarea" ? <TextareaFixture /> : null}
        {params.get("fixture") === "density" ? <DensityFixture /> : null}
        {params.get("fixture") === "complete" ? <CompletionFixtures /> : null}

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
            <ToastOnLoad />
            <CommandDemo />
          </div>
        </Section>

        <Section title="Status and content">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <Field label="Task" description="What the agent should do. Markdown is fine.">
                <Textarea defaultValue="Fix the dimmed ride rows that never reset, and open a PR." />
              </Field>
            </div>
            <Popover defaultOpen={open === "popover"}>
              <PopoverTrigger render={<Button>Route details</Button>} />
              <PopoverContent>
                <PopoverTitle>anthropic</PopoverTitle>
                <PopoverDescription>https://api.anthropic.com, key anthropic-key, 60 requests a minute.</PopoverDescription>
              </PopoverContent>
            </Popover>
          </div>
          <Callout status="warning" title="The tools image isn't pinned" actions={<Button size="sm">Pin to digest</Button>}>
            Runs use whatever <code>agent-tools:latest</code> points to. Pin it to a digest so every run uses the same tools.
          </Callout>
          <Callout status="danger" title="Route refused: api.example.com">This run isn't allowed to reach that host. Add it to the run's routes to allow it.</Callout>
          <Callout title="Records are kept for 30 days" />
          <div className="row" style={{ gap: 24 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Progress label="Building image" value={42} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Progress label="Waiting for a node" value={null} />
            </div>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <Spinner label="Starting sandbox" /> Starting sandbox
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
            <Skeleton width="40%" />
            <Skeleton width="90%" />
            <Skeleton shape="block" height={48} />
          </div>
          <CodeBlock title="terminal" language="bash" code={"./blacksand k8s run --repo ~/code/project --prompt-file task.md \\\n  --agent claude --out runs/first-task"} />
          <Accordion defaultValue={["routes"]}>
            <AccordionItem value="routes" title="Routes">Each run reaches only the hosts you list, through the proxy.</AccordionItem>
            <AccordionItem value="keys" title="Keys">Keys stay outside the sandbox; the proxy adds them to requests it allows.</AccordionItem>
            <AccordionItem value="records" title="Records">Every run gets a record, including failed and cancelled ones.</AccordionItem>
          </Accordion>
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
        <MotionFixture />
      </main>
     </ToastProvider>
    </TooltipProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
